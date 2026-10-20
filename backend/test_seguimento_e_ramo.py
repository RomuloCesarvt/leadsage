"""Seguimento automatico (2 e 5 dias uteis depois), horario por ramo e prioridade por reputacao."""
import random
from datetime import datetime, timedelta, timezone

import pytest

from app import conector_whatsapp as cw
from app import fila_envio, robo_store
from test_robo import com_robo, rodar  # noqa: F401

_JANELA_DO_RAMO_REAL = cw.janela_do_ramo   # capturada antes do fixture global trocar por uma neutra


def _janela_geral(agora):
    h = agora.astimezone(cw.FUSO_BRASIL)
    return h.weekday() != 6 and cw.JANELA_HORAS[0] <= h.hour < cw.JANELA_HORAS[1]


@pytest.fixture(autouse=True)
def _regras_de_verdade(monkeypatch):
    monkeypatch.setattr(cw, "janela_aberta", _janela_geral)
    monkeypatch.setattr(cw, "janela_do_ramo", _JANELA_DO_RAMO_REAL)
    monkeypatch.setattr(cw, "_sortear", random.randint)
    monkeypatch.setattr(cw, "INTERVALO_PRIORIDADE_S", 60)


def brasilia(ano, mes, dia, h, m=0):
    return datetime(ano, mes, dia, h, m, tzinfo=cw.FUSO_BRASIL).astimezone(timezone.utc)


# ---------------------------------------------------------------- horario por ramo e reputacao
def test_cada_ramo_tem_o_seu_melhor_horario():
    quarta_10h = brasilia(2026, 10, 14, 10, 0)
    quarta_15h = brasilia(2026, 10, 14, 15, 0)
    quarta_12h = brasilia(2026, 10, 14, 12, 30)
    assert cw.janela_do_ramo("Dentistas", quarta_10h) and cw.janela_do_ramo("Psicólogos", quarta_15h)
    assert not cw.janela_do_ramo("Dentistas", quarta_12h)                                            # hora de almoco
    assert not cw.janela_do_ramo("Pizzarias", quarta_10h) and cw.janela_do_ramo("Pizzarias", quarta_15h)
    assert not cw.janela_do_ramo("Barbearias", brasilia(2026, 10, 12, 10, 0))                        # segunda: barbearia fecha
    assert cw.janela_do_ramo("Barbearias", brasilia(2026, 10, 13, 10, 0))
    assert cw.janela_do_ramo("Papelaria", brasilia(2026, 10, 17, 10, 0))                             # sem regra propria: janela geral


def _pendente(id_, ramo, fone, nota, avaliacoes):
    return {"id": id_, "lead_id": id_, "canal": "whatsapp", "status": "pendente", "texto": "oi", "criado": "2026-10-14T09:00:00",
            "ramo": ramo, "contato": {"phone": fone}, "nota": nota, "avaliacoes": avaliacoes}


def test_horario_do_ramo_so_ordena_a_fila_e_ninguem_fica_esperando(client, com_robo, rodar):
    client.post("/api/robo/conector/gerar")
    canal = rodar(robo_store.canal_do_usuario, "alice")
    for item in (_pendente("pizza", "Pizzarias", "14998003784", 4.9, 300), _pendente("dent1", "Dentistas", "14998003785", 4.2, 40),
                 _pendente("dent2", "Dentistas", "14998003786", 4.9, 120), _pendente("dent3", "Dentistas", "14998003787", 5.0, 3)):
        rodar(fila_envio._gravar, "alice", item)
    canal["cw_primeiro"] = "2026-09-01T00:00:00+00:00"
    de_manha = rodar(cw.tarefas, canal, brasilia(2026, 10, 14, 10, 0))             # quarta 10h: dentista esta no horario, pizzaria nao
    assert [t["id"] for t in de_manha["tarefas"]] == ["fila:dent2"]                  # no horario primeiro; depois reputacao (4,9 com 120 avaliacoes; 5,0 com 3 nao conta)
    # 12h40: ninguem esta no melhor horario, e mesmo assim a fila anda (so a ordem muda): sai quem tem a melhor reputacao
    fora = rodar(cw.tarefas, dict(canal, cw_ultimo_frio=None, cw_proximo_frio_em=None, cw_frio_n=0), brasilia(2026, 10, 14, 12, 40))
    assert [t["id"] for t in fora["tarefas"]] == ["fila:pizza"] and not fora["motivo_sem_frio"]


def test_colocou_na_fila_a_primeira_sai_na_hora_e_as_outras_uma_a_uma_com_intervalo(client, com_robo, rodar, monkeypatch):
    monkeypatch.setattr(cw, "_sortear", lambda a, b: a)                              # intervalo minimo, para o teste ser exato
    client.post("/api/robo/conector/gerar")
    canal = rodar(robo_store.canal_do_usuario, "alice")
    for i in range(3):
        rodar(fila_envio._gravar, "alice", _pendente(f"c{i}", "Clínicas", f"1499800378{i}", 4.5, 50))
    canal["cw_primeiro"] = "2026-09-01T00:00:00+00:00"
    t0 = brasilia(2026, 10, 20, 11, 41)                                              # fora das 9h-11h30 das clinicas: nao importa
    canal["cw_visto"] = t0.isoformat()
    primeira = rodar(cw.tarefas, canal, t0)
    assert len(primeira["tarefas"]) == 1 and primeira["tarefas"][0]["tipo"] == "abordagem"
    # 30 s depois: ainda no intervalo (1min15); com o estado do canal atualizado pelo servico
    espera = rodar(cw.tarefas, canal, t0 + timedelta(seconds=30))
    assert espera["tarefas"] == [] and "intervalo" in espera["motivo_sem_frio"]
    estado = rodar(cw.estado_da_fila, {**canal, "uid": "alice"}, t0 + timedelta(seconds=30))
    assert "Aguardando o melhor horário" not in estado["motivo"]
    segunda = rodar(cw.tarefas, canal, t0 + timedelta(seconds=cw.INTERVALO_MIN_S + 1))
    assert len(segunda["tarefas"]) == 1 and segunda["tarefas"][0]["id"] != primeira["tarefas"][0]["id"]


# ---------------------------------------------------------------- seguimento automatico
def test_dias_uteis_pulam_o_fim_de_semana():
    sexta = datetime(2026, 10, 16, 12, 0, tzinfo=timezone.utc)
    assert fila_envio.dias_uteis_depois(sexta, 2).date().isoformat() == "2026-10-20"   # terca
    assert fila_envio.dias_uteis_depois(sexta, 5).date().isoformat() == "2026-10-23"   # sexta seguinte


def _enviado(extra=None):
    base = {"id": "f_L1", "lead_id": "L1", "nome": "Clínica Aurora", "canal": "whatsapp", "texto": "oi", "status": "enviado",
            "contato": {"phone": "5514998003784"}, "ramo": "Dentistas", "seguimentos": [
                {"quando": "2 dias", "texto": "Oi, Ana! Passando só para saber se você viu a prévia."},
                {"quando": "5 dias", "texto": "Ana, deixei a prévia pronta caso queira dar uma olhada."}]}
    base.update(extra or {})
    return base


def test_abordagem_enviada_agenda_dois_seguimentos():
    item = _enviado()
    fila_envio.agendar_seguimentos(item, datetime(2026, 10, 14, 12, 0, tzinfo=timezone.utc))
    assert [a["ate"][:10] for a in item["agenda_seguimentos"]] == ["2026-10-16", "2026-10-21"]
    assert all(a["estado"] == "agendado" for a in item["agenda_seguimentos"])
    seg = _enviado({"tipo": "seguimento"})
    fila_envio.agendar_seguimentos(seg)
    assert "agenda_seguimentos" not in seg                       # seguimento de seguimento nao existe
    mail = _enviado({"canal": "email"})
    fila_envio.agendar_seguimentos(mail)
    assert "agenda_seguimentos" not in mail                      # so WhatsApp


def test_seguimento_vencido_entra_na_fila_so_se_a_pessoa_nao_respondeu(client, com_robo, rodar):
    client.post("/api/robo/conector/gerar")
    item = _enviado()
    fila_envio.agendar_seguimentos(item, datetime(2026, 10, 1, 12, 0, tzinfo=timezone.utc))
    rodar(fila_envio._gravar, "alice", item)
    assert rodar(fila_envio.promover_seguimentos, "alice", datetime(2026, 10, 2, 12, 0, tzinfo=timezone.utc)) == 0   # antes do prazo
    assert rodar(fila_envio.promover_seguimentos, "alice", datetime(2026, 10, 5, 12, 0, tzinfo=timezone.utc)) == 1
    seg = rodar(fila_envio.obter, "alice", "f_L1_s1")
    assert seg["status"] == "pendente" and seg["tipo"] == "seguimento" and "viu a prévia" in seg["texto"] and seg["seguimento_de"] == "f_L1"
    assert rodar(fila_envio.promover_seguimentos, "alice", datetime(2026, 10, 5, 13, 0, tzinfo=timezone.utc)) == 0   # o 2o espera o prazo dele
    assert rodar(fila_envio.promover_seguimentos, "alice", datetime(2026, 10, 9, 12, 0, tzinfo=timezone.utc)) == 1
    assert rodar(fila_envio.obter, "alice", "f_L1_s2")["texto"].startswith("Ana, deixei")


def test_quem_respondeu_nao_recebe_seguimento(client, com_robo, rodar):
    client.post("/api/robo/conector/gerar")
    cid = robo_store.id_da_conversa("whatsapp", "5514998003784")
    rodar(robo_store.salvar_conversa, "alice", {"id": cid, "canal": "whatsapp", "contato": "5514998003784", "atualizado": "2026-10-02T10:00:00",
                                                 "mensagens": [{"de": "robo", "texto": "oi"}, {"de": "contato", "texto": "pode mandar"}]})
    item = _enviado()
    fila_envio.agendar_seguimentos(item, datetime(2026, 10, 1, 12, 0, tzinfo=timezone.utc))
    rodar(fila_envio._gravar, "alice", item)
    assert rodar(fila_envio.promover_seguimentos, "alice", datetime(2026, 10, 20, 12, 0, tzinfo=timezone.utc)) == 0
    assert rodar(fila_envio.obter, "alice", "f_L1_s1") is None
    assert all(a["estado"] == "cancelado" for a in rodar(fila_envio.obter, "alice", "f_L1")["agenda_seguimentos"])


def test_quem_pediu_para_sair_nao_recebe_seguimento(client, com_robo, rodar):
    client.post("/api/robo/conector/gerar")
    cid = robo_store.id_da_conversa("whatsapp", "5514998003784")
    rodar(robo_store.salvar_conversa, "alice", {"id": cid, "canal": "whatsapp", "contato": "5514998003784", "optout": True,
                                                 "mensagens": [{"de": "robo", "texto": "oi"}], "atualizado": "2026-10-02T10:00:00"})
    item = _enviado()
    fila_envio.agendar_seguimentos(item, datetime(2026, 10, 1, 12, 0, tzinfo=timezone.utc))
    rodar(fila_envio._gravar, "alice", item)
    assert rodar(fila_envio.promover_seguimentos, "alice", datetime(2026, 10, 20, 12, 0, tzinfo=timezone.utc)) == 0


def test_marcar_enviado_agenda_os_seguimentos(client, com_robo, rodar):
    from app import pipeline_store
    client.post("/api/robo/conector/gerar")
    rodar(pipeline_store.registrar, "alice", {"id": "L1", "company": "Clínica Aurora", "phone": "14998003784"})
    rodar(fila_envio._gravar, "alice", _enviado({"status": "pendente"}))
    rodar(fila_envio.marcar_enviado, "alice", "f_L1")
    assert len(rodar(fila_envio.obter, "alice", "f_L1")["agenda_seguimentos"]) == 2
