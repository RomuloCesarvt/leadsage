"""Ritmo de abordagem fria: intervalos de minutos e irregulares, pausa a cada lote, horario comercial e pausa por falhas.

Numero que dispara em ritmo de maquina e bloqueado. Estas regras imitam uma pessoa."""
import random
from datetime import datetime, timedelta, timezone

import pytest

from app import conector_whatsapp as cw
from app import fila_envio, robo_store
from test_robo import com_robo, rodar  # noqa: F401


def _janela_real(agora):
    h = agora.astimezone(cw.FUSO_BRASIL)
    return h.weekday() != 6 and cw.JANELA_HORAS[0] <= h.hour < cw.JANELA_HORAS[1]


@pytest.fixture(autouse=True)
def _funcoes_reais(monkeypatch):
    """Desfaz o fixture global: aqui a janela e o sorteio sao os de verdade."""
    monkeypatch.setattr(cw, "janela_aberta", _janela_real)
    monkeypatch.setattr(cw, "_sortear", random.randint)
    monkeypatch.setattr(cw, "INTERVALO_PRIORIDADE_S", 60)


def brasilia(ano, mes, dia, h, m=0):
    return datetime(ano, mes, dia, h, m, tzinfo=cw.FUSO_BRASIL).astimezone(timezone.utc)


# 2026-10-14 e uma quarta-feira; 2026-10-18 e domingo
def test_so_de_segunda_a_sabado_das_8h_as_19h_de_brasilia():
    assert cw.janela_aberta(brasilia(2026, 10, 14, 8, 0))
    assert cw.janela_aberta(brasilia(2026, 10, 14, 18, 59))
    assert not cw.janela_aberta(brasilia(2026, 10, 14, 7, 59))
    assert not cw.janela_aberta(brasilia(2026, 10, 14, 19, 0))
    assert not cw.janela_aberta(brasilia(2026, 10, 18, 11, 0))   # domingo
    assert cw.janela_aberta(brasilia(2026, 10, 17, 10, 0))       # sabado
    pode, motivo, _ = cw.politica_frio({}, brasilia(2026, 10, 14, 22, 0))
    assert not pode and "8h às 19h" in motivo


def test_intervalo_entre_abordagens_e_de_3_a_7_minutos_e_varia():
    agora = brasilia(2026, 10, 14, 10, 0)
    esperas = set()
    for _ in range(60):
        canal = {}
        cw.agendar_proxima_fria(canal, agora, 1)
        esperas.add(int((datetime.fromisoformat(canal["cw_proximo_frio_em"]) - agora).total_seconds()))
    assert min(esperas) >= cw.INTERVALO_MIN_S == 180 and max(esperas) <= cw.INTERVALO_MAX_S == 420
    assert len(esperas) > 10, "o intervalo precisa variar, nao ser sempre o mesmo"


def test_a_cada_5_abordagens_uma_pausa_longa_de_15_a_25_minutos_a_mais():
    agora = brasilia(2026, 10, 14, 10, 0)
    for n in (5, 10, 15):
        canal = {}
        cw.agendar_proxima_fria(canal, agora, n)
        espera = (datetime.fromisoformat(canal["cw_proximo_frio_em"]) - agora).total_seconds()
        assert 180 + 900 <= espera <= 420 + 1500
    canal = {}
    cw.agendar_proxima_fria(canal, agora, 4)
    assert (datetime.fromisoformat(canal["cw_proximo_frio_em"]) - agora).total_seconds() <= 420


def test_politica_respeita_o_horario_sorteado():
    agora = brasilia(2026, 10, 14, 10, 0)
    canal = {"cw_proximo_frio_em": (agora + timedelta(seconds=200)).isoformat(), "cw_ultimo_frio": (agora - timedelta(seconds=100)).isoformat()}
    pode, motivo, espera = cw.politica_frio(canal, agora)
    assert not pode and espera == 200 and "intervalo" in motivo
    assert cw.politica_frio(canal, agora + timedelta(seconds=201))[0] is True


def test_enviar_agora_dispensa_o_intervalo_mas_espera_pelo_menos_1_minuto_da_ultima():
    agora = brasilia(2026, 10, 14, 10, 0)
    canal = {"cw_proximo_frio_em": (agora + timedelta(seconds=300)).isoformat(), "cw_ultimo_frio": (agora - timedelta(seconds=20)).isoformat()}
    pode, _, espera = cw.politica_frio(canal, agora, prioritario=True)
    assert not pode and espera == 40
    assert cw.politica_frio(canal, agora + timedelta(seconds=41), prioritario=True)[0] is True


def test_tres_falhas_seguidas_pausam_as_abordagens_frias_por_2_horas(client, com_robo, rodar):
    client.post("/api/robo/conector/gerar")
    canal = rodar(robo_store.canal_do_usuario, "alice")
    for i in range(3):
        rodar(fila_envio._gravar, "alice", {"id": f"f{i}", "canal": "whatsapp", "status": "enviando", "contato": {"phone": "14998003784"}, "texto": "oi", "criado": "2026-10-14"})
        assert rodar(cw.registrar_resultado, canal, f"fila:f{i}", False, "o WhatsApp nao confirmou") is True
    assert canal.get("cw_pausa_ate")
    pausa = datetime.fromisoformat(canal["cw_pausa_ate"])
    assert 7000 <= (pausa - datetime.now(timezone.utc)).total_seconds() <= 7300
    pode, motivo, _ = cw.politica_frio(canal, datetime.now(timezone.utc))
    assert not pode and "falhas seguidas" in motivo


def test_envio_confirmado_zera_a_contagem_de_falhas(client, com_robo, rodar):
    client.post("/api/robo/conector/gerar")
    canal = rodar(robo_store.canal_do_usuario, "alice")
    canal["cw_falhas"] = 2
    rodar(fila_envio._gravar, "alice", {"id": "f1", "lead_id": "L1", "canal": "whatsapp", "status": "enviando", "contato": {"phone": "14998003784"}, "texto": "oi", "criado": "2026-10-14"})
    rodar(cw.registrar_resultado, canal, "fila:f1", True, "")
    assert canal["cw_falhas"] == 0 and not canal.get("cw_pausa_ate")


def test_resposta_so_aparece_como_enviada_quando_o_whatsapp_confirma(client, com_robo, rodar):
    client.post("/api/robo/conector/gerar")
    canal = rodar(robo_store.canal_do_usuario, "alice")
    contato = "5514999990000"
    cid = robo_store.id_da_conversa("whatsapp", contato)
    sid = rodar(cw.enfileirar_resposta, {**canal, "uid": "alice"}, contato, "Olá! Aqui está a prévia")
    rodar(robo_store.salvar_conversa, "alice", {"id": cid, "canal": "whatsapp", "contato": contato, "mensagens": [
        {"de": "robo", "texto": "Olá! Aqui está a prévia", "meta_id": sid}], "atualizado": "2026-10-14T10:00:00"})
    # o WhatsApp nao confirmou: a conversa passa a dizer que NAO foi enviada
    rodar(cw.registrar_resultado, canal, sid, False, "o WhatsApp não confirmou o envio")
    m = rodar(robo_store.obter_conversa, "alice", cid)["mensagens"][0]
    assert m["entrega"] == "falhou" and "não confirmou" in m["erro"]
    # confirmou (reenvio): vira enviada
    sid2 = rodar(cw.enfileirar_resposta, {**canal, "uid": "alice"}, contato, "Segunda")
    conversa = rodar(robo_store.obter_conversa, "alice", cid)
    conversa["mensagens"].append({"de": "robo", "texto": "Segunda", "meta_id": sid2})
    rodar(robo_store.salvar_conversa, "alice", conversa)
    rodar(cw.registrar_resultado, canal, sid2, True, "")
    assert rodar(robo_store.obter_conversa, "alice", cid)["mensagens"][1]["entrega"] == "enviada"


def test_teste_de_envio_vai_para_o_proprio_numero_e_mostra_o_resultado(client, com_robo, rodar):
    chave = client.post("/api/robo/conector/gerar").json()["chave"]
    cab = {"x-conector-key": chave}
    assert client.post("/api/robo/whats/teste").status_code == 409                       # ainda sem numero conectado
    client.post("/api/conector/ping", headers=cab, json={"numero": "5514999019705", "status": "ready"})
    sid = client.post("/api/robo/whats/teste").json()["id"]
    t = client.get("/api/conector/tarefas", headers=cab).json()["tarefas"]
    assert t and t[0]["contato"] == "5514999019705" and "Teste do LeadSage" in t[0]["texto"]   # sai para o proprio numero
    assert client.get(f"/api/robo/whats/teste/{sid}").json()["status"] == "enviando"
    client.post(f"/api/conector/tarefas/{sid}/resultado", headers=cab, json={"ok": False, "erro": "o WhatsApp não confirmou o envio"})
    r = client.get(f"/api/robo/whats/teste/{sid}").json()
    assert r["status"] == "falhou" and "não confirmou" in r["erro"]
