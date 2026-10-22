"""Gerenciar agente: o dono escolhe, lead a lead, quem atende (o robô com um jeito, ou ele mesmo)."""
import pytest

from app import agentes, pipeline_store, robo_service
from test_robo import CFG, Envio, com_robo, ia, msg, rodar  # noqa: F401  (fixtures e ajudantes do robô)

LEAD = {"id": "lead_9", "company": "Padaria Jacarandá", "name": "Padaria Jacarandá", "niche": "Padarias", "city": "Botucatu", "phone": "5514998003784"}


def test_agentes_conhecidos_e_o_padrao():
    assert set(agentes.AGENTES) == {"robo", "consultivo", "direto", "humano"}
    assert agentes.valido("  DIRETO ") == "direto" and agentes.valido("banana") == "" and agentes.valido(None) == ""
    assert agentes.rotulo(None) == "Robô padrão" and agentes.rotulo("humano") == "Eu atendo"


def test_so_o_humano_tira_o_robo():
    assert agentes.atende_o_robo(None) and agentes.atende_o_robo("consultivo") and agentes.atende_o_robo("direto")
    assert not agentes.atende_o_robo("humano")


def test_o_jeito_de_atender_vira_instrucao_para_a_ia():
    assert "CONSULTIVA" in agentes.instrucao("consultivo") and "DIRETO" in agentes.instrucao("direto")
    assert agentes.instrucao("robo") == agentes.instrucao("humano") == agentes.instrucao("banana") == ""


def test_rota_grava_o_agente_e_a_lista_devolve(client, com_plano):
    com_plano("agencia")
    assert client.put("/api/pipeline/lead_9/etapa", json={"etapa": "Contato Enviado", "lead": LEAD}).status_code == 200
    r = client.put("/api/pipeline/lead_9/agente", json={"agente": "direto"})
    assert r.status_code == 200 and r.json() == {"agente": "direto", "rotulo": "Robô direto"}
    corpo = client.get("/api/pipeline").json()
    assert next(i for i in corpo["itens"] if i["id"] == "lead_9")["agente"] == "direto"
    assert {a["id"] for a in corpo["agentes"]} == set(agentes.AGENTES)


def test_rota_recusa_agente_inventado_e_lead_desconhecido(client, com_plano):
    com_plano("agencia")
    client.put("/api/pipeline/lead_9/etapa", json={"etapa": "Contato Enviado", "lead": LEAD})
    assert client.put("/api/pipeline/lead_9/agente", json={"agente": "banana"}).status_code == 400
    assert client.put("/api/pipeline/nao_existe/agente", json={"agente": "humano"}).status_code == 404


def test_o_agente_de_um_usuario_nao_vaza_para_outro(client, as_user, com_plano):
    com_plano("agencia")
    client.put("/api/pipeline/lead_9/etapa", json={"etapa": "Contato Enviado", "lead": LEAD})
    client.put("/api/pipeline/lead_9/agente", json={"agente": "humano"})
    as_user("bob")
    com_plano("agencia")
    assert client.put("/api/pipeline/lead_9/agente", json={"agente": "direto"}).status_code == 404


def test_lead_com_eu_atendo_nao_recebe_resposta_do_robo(com_robo, rodar):
    rodar(pipeline_store.registrar, "alice", LEAD, "Contato Enviado")
    rodar(pipeline_store.definir_agente, "alice", "lead_9", "humano")
    envio, gerar = Envio(), ia()
    c = rodar(robo_service.processar, CFG, msg("Oi, quanto custa?"), gerar=gerar, enviar=envio)
    assert envio.enviados == [] and gerar.chamadas == []
    assert "Eu atendo" in c["silencio"] and len(c["mensagens"]) == 1


def test_lead_com_jeito_consultivo_leva_a_instrucao_no_prompt(com_robo, rodar):
    rodar(pipeline_store.registrar, "alice", LEAD, "Contato Enviado")
    rodar(pipeline_store.definir_agente, "alice", "lead_9", "consultivo")
    envio, gerar = Envio(), ia()
    rodar(robo_service.processar, CFG, msg("Oi, quanto custa?"), gerar=gerar, enviar=envio)
    assert len(envio.enviados) == 1
    assert "ESCOLHIDO PELO DONO" in gerar.chamadas[0] and "CONSULTIVA" in gerar.chamadas[0]


def test_lead_sem_agente_escolhido_segue_o_robo_padrao(com_robo, rodar):
    rodar(pipeline_store.registrar, "alice", LEAD, "Contato Enviado")
    envio, gerar = Envio(), ia()
    rodar(robo_service.processar, CFG, msg("Oi, quanto custa?"), gerar=gerar, enviar=envio)
    assert len(envio.enviados) == 1 and "ESCOLHIDO PELO DONO" not in gerar.chamadas[0]


def test_trocar_para_o_mesmo_agente_nao_regrava(com_robo, rodar):
    rodar(pipeline_store.registrar, "alice", LEAD, "Contato Enviado")
    a = rodar(pipeline_store.definir_agente, "alice", "lead_9", "direto")
    b = rodar(pipeline_store.definir_agente, "alice", "lead_9", "direto")
    assert a["agente_em"] == b["agente_em"]
    with pytest.raises(ValueError):
        rodar(pipeline_store.definir_agente, "alice", "lead_9", "banana")
