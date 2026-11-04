"""Quem fala nas mensagens: o nome, o cargo e a empresa de QUEM USA o sistema (nunca o nome do sistema)."""
import pytest

from app import abordagem_mestra, identidade
from app.ai_sdr import montar_prompt
from app.ai_generator import limpar_marcadores

CFG = {"meu_nome": "Rômulo", "meu_cargo": "consultor estratégico", "minha_empresa": "Seometria Marketing Digital", "ativo": True}
LEAD = {"id": "L1", "company": "Clínica Dra. Angela", "niche": "Clínica"}
HIST = [{"de": "robo", "texto": "Oi!"}, {"de": "contato", "texto": "Quem é?"}]


def test_apresentacao_completa():
    i = identidade.da_conta(CFG, {"name": "Fulano", "company_name": "Outra"})
    assert i["apresentacao"] == "Rômulo, consultor estratégico da Seometria Marketing Digital" and i["configurada"]
    assert i["nome"] == "Rômulo" and i["empresa"] == "Seometria Marketing Digital"


@pytest.mark.parametrize("cfg,esperado", [
    ({"meu_nome": "Ana", "minha_empresa": "Studio R"}, "Ana da Studio R"),
    ({"meu_nome": "Ana", "meu_cargo": "designer"}, "Ana, designer"),
    ({"meu_nome": "Ana", "minha_empresa": "do Studio R"}, "Ana do Studio R"),
    ({"minha_empresa": "Studio R"}, "a equipe da Studio R"),
])
def test_combinacoes(cfg, esperado):
    assert identidade.da_conta(cfg, {})["apresentacao"] == esperado


def test_sem_configurar_vale_o_perfil_e_nao_conta_como_configurada():
    i = identidade.da_conta({}, {"name": "Fulano", "company_name": "Padaria Alfa"})
    assert i["empresa"] == "Padaria Alfa" and i["nome"] == "Fulano" and i["configurada"] is False


def test_aceita_o_objeto_do_perfil():
    class P:
        name = "Beto"
        company_name = "Oficina Beta"
    assert identidade.da_conta({}, P())["empresa"] == "Oficina Beta"


def test_o_robo_se_apresenta_com_a_identidade_da_pessoa():
    p = montar_prompt(HIST, "whatsapp", {"company_name": "LeadSage", "name": "Dono"}, CFG, LEAD)
    assert "Você é Rômulo, consultor estratégico da Seometria Marketing Digital" in p
    assert "Você é assistente virtual, SDR de LeadSage" not in p
    assert "O QUE SEOMETRIA MARKETING DIGITAL VENDE" in p


def test_sem_identidade_o_robo_continua_como_antes():
    p = montar_prompt(HIST, "whatsapp", {"company_name": "Padaria Alfa"}, {"ativo": True, "nome_assistente": "Ana"}, LEAD)
    assert "Você é Ana, da equipe de Padaria Alfa" in p


def test_a_abordagem_do_disparo_usa_o_nome_e_a_empresa_da_pessoa():
    e = abordagem_mestra.estrutura("Seometria", canal="whatsapp", lead_id="x", apresentacao="Rômulo, consultor estratégico da Seometria Marketing Digital")
    ap = "Rômulo, consultor estratégico da Seometria Marketing Digital"
    assert any(f.format(x=ap) in e for f in abordagem_mestra.INTROS_COM_NOME)      # o jeito de se apresentar varia, o nome e a empresa não
    assert "LeadSage" not in e
    # sem apresentacao, o nome da empresa do perfil
    sem = abordagem_mestra.estrutura("Seometria", canal="whatsapp", lead_id="x")
    assert any(f.format(x="Seometria") in sem for f in abordagem_mestra.INTROS_DA_EMPRESA)


def test_marcador_do_nome_vira_o_nome_da_pessoa():
    texto, _ = limpar_marcadores("Abraço, [Seu Nome]", "Rômulo")
    assert texto == "Abraço, Rômulo"


def test_campos_novos_sao_gravados_e_voltam_na_tela(client, com_plano):
    com_plano("agencia")
    r = client.put("/api/robo/config", json={"meu_nome": "Rômulo", "meu_cargo": "consultor estratégico", "minha_empresa": "Seometria Marketing Digital"})
    assert r.status_code == 200, r.text
    c = client.get("/api/robo/config").json()
    assert (c["meu_nome"], c["meu_cargo"], c["minha_empresa"]) == ("Rômulo", "consultor estratégico", "Seometria Marketing Digital")


def _lead():
    return {"id": "lead1", "name": "Padaria Teste", "avatar": "", "role": "Padaria", "niche": "padaria", "company": "Padaria Teste",
            "location": "Salvador - BA", "city": "Salvador", "email": "", "phone": "5571999990000", "socials": {}, "quality_score": 70,
            "verified": True, "outreach_status": "Pendente", "pipeline_stage": "Novos"}


def test_o_disparo_escreve_com_a_identidade_configurada_mesmo_que_a_tela_mande_leadsage(client, com_plano, monkeypatch):
    from app.models import PitchGenerationResponse
    com_plano("agencia")
    client.put("/api/robo/config", json={"meu_nome": "Rômulo", "meu_cargo": "consultor estratégico", "minha_empresa": "Seometria Marketing Digital"})
    visto = {}

    async def falso(req, api_key=None):
        visto["req"] = req
        return PitchGenerationResponse(subject="", body="oi", **{k: v for k, v in {}.items()})

    monkeypatch.setattr("app.main.AIGenerator.generate_pitch", falso)
    try:
        client.post("/api/generate-pitch", json={"lead": _lead(), "channel": "whatsapp", "sender_name": "LeadSage"})
    except Exception:
        pass
    r = visto["req"]
    assert r.apresentacao == "Rômulo, consultor estratégico da Seometria Marketing Digital"
    assert r.nome_de_quem_escreve == "Rômulo" and r.sender_name == "Seometria Marketing Digital"


def test_sem_identidade_a_tela_que_manda_leadsage_cai_no_perfil(client, com_plano, monkeypatch):
    com_plano("agencia")
    client.put("/api/profile", json={"id": "alice", "name": "Alice", "email": "alice@x.com", "company_name": "Alice Corp", "plan": "Pro"})
    visto = {}

    async def falso(req, api_key=None):
        visto["req"] = req
        raise RuntimeError("so queremos ver o pedido")

    monkeypatch.setattr("app.main.AIGenerator.generate_pitch", falso)
    try:
        client.post("/api/generate-pitch", json={"lead": _lead(), "channel": "whatsapp", "sender_name": "Consultor LeadSage"})
    except Exception:
        pass
    assert visto["req"].sender_name == "Alice Corp" and not visto["req"].apresentacao


# ----------------------------------------------- nunca se diz assistente virtual / robô / IA
def test_resposta_que_se_diz_assistente_virtual_e_recusada():
    from app.ai_sdr import problemas_da_resposta
    ruim = ["Oi Alice, sou o assistente virtual da Seometria Marketing Digital. Posso te enviar a prévia?"]
    assert any("assistente virtual" in e for e in problemas_da_resposta(ruim, {}, [], {}))
    for ok in ["Oi Alice, aqui é o Rômulo da Seometria Marketing Digital. Posso te enviar a prévia?",
               "Vi que vocês atendem empresas de inteligência artificial em Botucatu, parabéns!"]:
        assert not any("assistente" in e or "robô" in e for e in problemas_da_resposta([ok], {}, [], {}))
    for ruim in ["Sou um robô da equipe", "Sou uma IA, mas posso ajudar", "Este é um atendimento automático"]:
        assert any("Nunca se apresente" in e for e in problemas_da_resposta([ruim], {}, [], {}))


def test_prompt_nao_manda_o_robo_se_apresentar_como_assistente_virtual():
    p = montar_prompt(HIST, "whatsapp", {"company_name": "Padaria Alfa"}, {"ativo": True}, LEAD)
    assert "assistente virtual de" not in p.replace('NUNCA se apresente nem se descreva como "assistente virtual"', "")
    assert "Você é da equipe de Padaria Alfa" in p or "da equipe de Padaria Alfa" in p
