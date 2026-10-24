"""Excluir um lead (Meus Leads e Pipeline) e o lead que sai sozinho quando a régua de abordagens termina sem resposta.

- excluir cancela o que ainda ia sair para ele: mensagens na fila, rascunhos e seguimentos agendados;
- depois da abordagem e de TODOS os seguimentos enviados, 3 dias sem resposta, o lead sai (fica um registro escondido, para nunca contatar de novo);
- quem respondeu, quem a pessoa moveu para frente e quem ainda tem seguimento agendado ficam;
- se o lead encerrado responder depois, volta sozinho.
"""
from datetime import datetime, timedelta, timezone

from app import fila_envio, pipeline_store, robo_service, robo_store
from test_robo import CFG, Envio, com_robo, ia, msg, rodar  # noqa: F401

FONE = "5514998003784"
AGORA = datetime(2026, 10, 24, 12, 0, tzinfo=timezone.utc)


def _iso(dias_atras: float) -> str:
    return (AGORA - timedelta(days=dias_atras)).isoformat()


def montar(rodar, lead_id="L1", etapa="Contato Enviado", estados=("na_fila", "na_fila"), ultimo_enviado_ha=4.0, ultimo_status="enviado", fone=FONE):
    """Um lead com a abordagem enviada e a régua de 2 seguimentos."""
    rodar(pipeline_store.registrar, "alice", {"id": lead_id, "company": "Studio Alfa", "phone": "+" + fone}, etapa, "salvo")
    agenda = [{"n": n, "ate": _iso(10 - 3 * n), "texto": f"seguimento {n}", "estado": e} for n, e in enumerate(estados, start=1)]
    base = {"lead_id": lead_id, "nome": "Studio Alfa", "canal": "whatsapp", "contato": {"phone": fone}, "texto": "oi"}
    rodar(fila_envio._gravar, "alice", {**base, "id": f"f_{lead_id}", "status": "enviado", "enviado_em": _iso(12), "agenda_seguimentos": agenda, "criado": _iso(12)})
    for n, e in enumerate(estados, start=1):
        if e == "na_fila":
            ultimo = n == len(estados)
            rodar(fila_envio._gravar, "alice", {**base, "id": f"f_{lead_id}_s{n}", "tipo": "seguimento", "seguimento_de": f"f_{lead_id}",
                                                 "status": ultimo_status if ultimo else "enviado",
                                                 "enviado_em": _iso(ultimo_enviado_ha if ultimo else 8), "criado": _iso(9)})


def fechados(rodar):
    return rodar(fila_envio.encerrar_reguas_concluidas, "alice", AGORA)


# ---------------------------------------------------------------- a régua termina sem resposta: o lead sai
def test_regua_concluida_sem_resposta_depois_da_carencia_tira_o_lead(com_robo, rodar):
    montar(rodar)
    assert fechados(rodar) == ["L1"]
    item = rodar(pipeline_store.obter, "alice", "L1")
    assert item["encerrado"]["motivo"].startswith("régua de abordagens concluída sem resposta") and item["encerrado"]["em"]
    assert fechados(rodar) == []                                                          # idempotente: não encerra duas vezes


def test_dentro_da_carencia_o_lead_ainda_fica(com_robo, rodar):
    montar(rodar, ultimo_enviado_ha=1.0)            # o último seguimento saiu ontem: ainda pode responder
    assert fechados(rodar) == []
    assert not rodar(pipeline_store.obter, "alice", "L1").get("encerrado")


def test_ainda_ha_seguimento_agendado_ou_o_ultimo_nao_saiu(com_robo, rodar):
    montar(rodar, "A", estados=("na_fila", "agendado"))
    montar(rodar, "B", ultimo_status="pendente")
    montar(rodar, "C", ultimo_status="falhou")
    assert fechados(rodar) == []


def test_quem_respondeu_fica_e_quem_foi_movido_para_frente_tambem(com_robo, rodar):
    montar(rodar, "R")                                                                    # respondeu
    conversa = {"id": robo_store.id_da_conversa("whatsapp", FONE), "canal": "whatsapp", "contato": FONE, "robo_ativo": True, "optout": False,
                "mensagens": [{"de": "robo", "texto": "oi"}, {"de": "contato", "texto": "oi, tudo bem?"}]}
    rodar(robo_store.salvar_conversa, "alice", conversa)
    assert fechados(rodar) == []
    montar(rodar, "Q", etapa="Qualificado", fone="5514998003799")                         # a pessoa já o levou adiante (outro telefone, sem conversa)
    assert fechados(rodar) == []
    montar(rodar, "N", fone="5514998003788")                                              # igual ao primeiro, mas ninguém respondeu: este sai
    assert fechados(rodar) == ["N"]


def test_seguimento_cancelado_porque_respondeu_nao_conta_como_regua_concluida(com_robo, rodar):
    montar(rodar, estados=("na_fila", "cancelado"))
    assert fechados(rodar) == []


def test_abordagem_sem_seguimentos_nao_encerra_nada(com_robo, rodar):
    rodar(pipeline_store.registrar, "alice", {"id": "S", "company": "Sem Régua", "phone": "+" + FONE}, "Contato Enviado", "salvo")
    rodar(fila_envio._gravar, "alice", {"id": "f_S", "lead_id": "S", "canal": "whatsapp", "status": "enviado", "enviado_em": _iso(30), "contato": {"phone": FONE}, "criado": _iso(30)})
    assert fechados(rodar) == []


# ---------------------------------------------------------------- o que o navegador vê e o retorno do lead
def test_pipeline_devolve_o_encerramento_para_a_tela_esconder_o_lead(client, com_robo, rodar):
    montar(rodar)
    fechados(rodar)
    itens = client.get("/api/pipeline").json()["itens"]
    assert [i for i in itens if i["id"] == "L1"][0]["encerrado"]["em"]


def test_lead_encerrado_que_responde_volta(com_robo, rodar):
    montar(rodar)
    fechados(rodar)
    assert rodar(pipeline_store.obter, "alice", "L1")["encerrado"]
    rodar(robo_service.processar, CFG, msg("Oi, vi sua mensagem", mid="wamid.regua"), gerar=ia(), enviar=Envio())
    item = rodar(pipeline_store.obter, "alice", "L1")
    assert "encerrado" not in item and item["etapa"] != "Novo Lead"


# ---------------------------------------------------------------- excluir à mão
def test_excluir_o_lead_cancela_fila_rascunho_e_seguimentos_agendados(client, com_robo, rodar):
    montar(rodar, estados=("agendado", "agendado"))
    base = {"lead_id": "L1", "nome": "Studio Alfa", "canal": "whatsapp", "contato": {"phone": FONE}, "texto": "oi", "criado": _iso(1)}
    rodar(fila_envio._gravar, "alice", {**base, "id": "f_L1_r1", "status": "pendente"})
    rodar(fila_envio._gravar, "alice", {**base, "id": "f_L1_r2", "status": "rascunho"})
    rodar(fila_envio._gravar, "alice", {**base, "id": "f_L1_r3", "status": "enviado"})                  # o que já saiu fica como histórico
    rodar(fila_envio._gravar, "alice", {**base, "id": "f_L2", "lead_id": "L2", "status": "pendente"})   # outro lead não é tocado
    r = client.delete("/api/pipeline/L1")
    assert r.status_code == 200 and r.json()["mensagens_canceladas"] == 3
    por_id = {i["id"]: i for i in rodar(fila_envio.listar, "alice")}
    assert por_id["f_L1_r1"]["status"] == "pulado" and por_id["f_L1_r2"]["status"] == "pulado" and "excluído" in por_id["f_L1_r1"]["motivo"]
    assert por_id["f_L1_r3"]["status"] == "enviado" and por_id["f_L2"]["status"] == "pendente"
    assert [a["estado"] for a in por_id["f_L1"]["agenda_seguimentos"]] == ["cancelado", "cancelado"]
    assert rodar(pipeline_store.obter, "alice", "L1") is None
    # o seguimento cancelado nunca vira mensagem
    assert rodar(fila_envio.promover_seguimentos, "alice", AGORA + timedelta(days=30)) == 0


def test_excluir_lead_inexistente_nao_quebra(client, com_robo):
    r = client.delete("/api/pipeline/nao-existe")
    assert r.status_code == 200 and r.json()["mensagens_canceladas"] == 0
