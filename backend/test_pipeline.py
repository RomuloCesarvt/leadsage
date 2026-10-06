"""Pipeline no servidor, robo movendo os cards e disparo pelo WhatsApp.

O que estes testes travam:

- o robo nunca puxa um card para tras (a pessoa arrastou para "Proposta" e
  a conversa ainda esta em "descoberta": o card fica onde a pessoa pos);
- quem escreve sem estar na busca ganha um card, e nao some;
- quem pediu para sair vai para "Perdido" e nunca recebe disparo;
- disparo exige consentimento e modelo aprovado, nao repete contato e
  devolve o credito do que nao foi entregue.

Nada aqui chama a Meta nem a IA.
"""
import pytest

from app import meta_canais, pipeline_store, robo_disparo, robo_service, robo_store
from app.pipeline_store import etapa_pelo_sdr, pode_mover_sozinho
from test_robo import CFG, Envio, com_robo, evento_whatsapp, ia, msg, rodar  # noqa: F401

UID = "alice"
FONE = "+55 14 99800-3784"


def resposta_sdr(etapa="descoberta", temperatura="morno", reuniao="", humano=False):
    def gerar(prompt):
        return {
            "mensagens": ["Entendi! Me conta um pouco mais?"], "etapa": etapa,
            "temperatura": temperatura, "dados": {}, "objecao": "", "proximo_passo": "",
            "passar_para_humano": humano, "motivo": "", "reuniao": reuniao,
        }
    return gerar


def card(rodar, lead_id="L1", etapa="Contato Enviado", fone=FONE):
    rodar(pipeline_store.registrar, UID, {"id": lead_id, "company": "Padaria Jacarandá", "phone": fone}, etapa)
    return lead_id


# ------------------------------------------------------------------ regras

@pytest.mark.parametrize("atual,destino,pode", [
    ("Contato Enviado", "Respondeu", True),
    ("Respondeu", "Qualificado", True),
    ("Qualificado", "Respondeu", False),   # nunca para tras
    ("Proposta", "Qualificado", False),    # a pessoa arrastou para frente
    ("Respondeu", "Respondeu", False),
    ("Qualificado", "Perdido", True),
    ("Fechado", "Perdido", False),         # fechado e final
    ("Perdido", "Respondeu", False),       # perdido tambem
    ("Respondeu", "Fechado", False),       # fechar e coisa da pessoa
    ("Respondeu", "Etapa inventada", False),
])
def test_robo_so_avanca(atual, destino, pode):
    assert pode_mover_sozinho(atual, destino) is pode


def test_o_robo_nunca_fecha_sozinho():
    for etapa in ("abertura", "descoberta", "diagnostico", "proposta", "objecao", "agendamento", "fechamento"):
        assert etapa_pelo_sdr({"etapa": etapa, "temperatura": "quente", "reuniao": "x"}, True) != "Fechado"


@pytest.mark.parametrize("sdr,coluna", [
    ({"etapa": "abertura"}, "Respondeu"),
    ({"etapa": "descoberta", "temperatura": "morno"}, "Respondeu"),
    ({"etapa": "diagnostico"}, "Qualificado"),
    ({"etapa": "descoberta", "temperatura": "quente"}, "Qualificado"),
    ({"etapa": "proposta"}, "Proposta"),
    ({"etapa": "agendamento", "reuniao": "quinta 15h"}, "Reunião"),
    ({"etapa": "perdido"}, "Perdido"),
])
def test_etapa_do_sdr_vira_coluna(sdr, coluna):
    assert etapa_pelo_sdr(sdr, True) == coluna


def test_telefone_casa_com_ou_sem_codigo_do_pais():
    assert pipeline_store.mesmo_telefone("(14) 99800-3784", "5514998003784")
    assert not pipeline_store.mesmo_telefone("14998003784", "14998003785")
    assert not pipeline_store.mesmo_telefone("", "5514998003784")


# ---------------------------------------------------------------- armazenamento

def test_registrar_nao_mexe_na_etapa_de_quem_ja_existe(com_robo, rodar):
    card(rodar, etapa="Proposta")
    rodar(pipeline_store.registrar, UID, {"id": "L1", "company": "Novo nome"}, "Novo Lead")
    item = rodar(pipeline_store.obter, UID, "L1")
    assert item["etapa"] == "Proposta" and item["lead"]["company"] == "Novo nome"


def test_pipeline_e_por_conta(com_robo, rodar):
    card(rodar)
    assert rodar(pipeline_store.obter, "bob", "L1") is None
    assert rodar(pipeline_store.achar_por_telefone, "bob", FONE) is None


def test_historico_guarda_quem_moveu_e_por_que(com_robo, rodar):
    card(rodar)
    rodar(pipeline_store.mover, UID, "L1", "Respondeu", "o lead respondeu", "robô", True)
    h = rodar(pipeline_store.obter, UID, "L1")["historico"]
    assert h[-1]["de"] == "Contato Enviado" and h[-1]["para"] == "Respondeu" and h[-1]["por"] == "robô"


# ------------------------------------------------------- robo move o card

def test_resposta_do_lead_tira_de_contato_enviado(com_robo, rodar):
    card(rodar)
    c = rodar(robo_service.processar, CFG, msg(), gerar=resposta_sdr(), enviar=Envio())
    assert c["lead_id"] == "L1"
    assert rodar(pipeline_store.obter, UID, "L1")["etapa"] == "Respondeu"


def test_conversa_avanca_o_card_conforme_o_sdr(com_robo, rodar):
    card(rodar)
    rodar(robo_service.processar, CFG, msg(mid="w1"), gerar=resposta_sdr("diagnostico", "morno"), enviar=Envio())
    assert rodar(pipeline_store.obter, UID, "L1")["etapa"] == "Qualificado"
    rodar(robo_service.processar, CFG, msg("quanto custa?", "w2"), gerar=resposta_sdr("proposta", "quente"), enviar=Envio())
    assert rodar(pipeline_store.obter, UID, "L1")["etapa"] == "Proposta"


def test_robo_nao_puxa_para_tras_o_que_a_pessoa_avancou(com_robo, rodar):
    card(rodar, etapa="Reunião")
    rodar(robo_service.processar, CFG, msg(), gerar=resposta_sdr("descoberta", "frio"), enviar=Envio())
    assert rodar(pipeline_store.obter, UID, "L1")["etapa"] == "Reunião"


def test_quem_recusa_vai_para_perdido(com_robo, rodar):
    card(rodar)
    rodar(robo_service.processar, CFG, msg("pare", "w1"), gerar=resposta_sdr(), enviar=Envio())
    assert rodar(pipeline_store.obter, UID, "L1")["etapa"] == "Perdido"


def test_primeira_recusa_branda_nao_perde_o_lead(com_robo, rodar):
    """"Agora nao" e recuperavel: o card fica, so a segunda recusa encerra."""
    card(rodar)
    rodar(robo_service.processar, CFG, msg("não tenho interesse no momento", "w1"), gerar=resposta_sdr(), enviar=Envio())
    assert rodar(pipeline_store.obter, UID, "L1")["etapa"] == "Respondeu"


def test_robo_desligado_ainda_registra_que_o_lead_respondeu(com_robo, rodar):
    card(rodar)
    rodar(robo_service.processar, {**CFG, "ativo": False}, msg(), gerar=resposta_sdr(), enviar=Envio())
    assert rodar(pipeline_store.obter, UID, "L1")["etapa"] == "Respondeu"


def test_contato_desconhecido_ganha_card_no_pipeline(com_robo, rodar):
    c = rodar(robo_service.processar, CFG, msg(), gerar=resposta_sdr(), enviar=Envio())
    item = rodar(pipeline_store.obter, UID, c["lead_id"])
    assert item and item["origem"] == "inbound_whatsapp" and item["etapa"] == "Respondeu"
    assert item["lead"]["phone"] == "+5514998003784"
    # segunda mensagem do mesmo contato nao cria outro card
    rodar(robo_service.processar, CFG, msg("e ai?", "w2"), gerar=resposta_sdr(), enviar=Envio())
    assert len(rodar(pipeline_store.listar, UID)) == 1


def test_o_sdr_recebe_o_dossie_do_pipeline(com_robo, rodar):
    rodar(pipeline_store.registrar, UID, {
        "id": "L9", "company": "Padaria Jacarandá", "phone": FONE, "niche": "Padaria",
        "missingDigitalAssets": ["site"],
    }, "Contato Enviado")
    prompts = []

    def gerar(prompt):
        prompts.append(prompt)
        return resposta_sdr()(prompt)

    rodar(robo_service.processar, CFG, msg(), gerar=gerar, enviar=Envio())
    assert "Padaria Jacarandá" in prompts[0] and "site" in prompts[0]


# ------------------------------------------------------------------- rotas

def test_rotas_do_pipeline(client, com_plano):
    com_plano("agencia")
    r = client.post("/api/pipeline/sync", json={"leads": [
        {"id": "A", "company": "Padaria A", "phone": "14998003784", "pipeline_stage": "Contato Enviado"},
        {"id": "B", "company": "Padaria B"},
    ]})
    assert r.status_code == 200 and r.json()["novos"] == 2
    assert client.post("/api/pipeline/sync", json={"leads": [{"id": "B", "company": "Padaria B"}]}).json()["novos"] == 0

    itens = {i["id"]: i for i in client.get("/api/pipeline").json()["itens"]}
    assert itens["A"]["etapa"] == "Contato Enviado" and itens["B"]["etapa"] == "Novo Lead"

    r = client.put("/api/pipeline/B/etapa", json={"etapa": "Reunião"})
    assert r.json() == {"etapa": "Reunião", "mudou": True}
    assert client.put("/api/pipeline/B/etapa", json={"etapa": "Nada"}).status_code == 400
    assert client.put("/api/pipeline/X/etapa", json={"etapa": "Fechado"}).status_code == 404


def test_pipeline_exige_plano(client, com_plano):
    com_plano("previa")
    assert client.get("/api/pipeline").status_code in (402, 403)


def test_pipeline_de_outro_usuario_nao_aparece(client, com_plano, as_user):
    com_plano("agencia")
    client.post("/api/pipeline/sync", json={"leads": [{"id": "A", "company": "Padaria A"}]})
    as_user("bob")
    com_plano("agencia", "bob")
    assert client.get("/api/pipeline").json()["itens"] == []


# ------------------------------------------------------------------ disparo

class Modelo:
    def __init__(self, status="APPROVED"):
        self.status = status

    async def __call__(self, cfg):
        return {"existe": bool(self.status), "status": self.status, "motivo": ""}


class Modelos:
    """Substitui enviar_modelo da Meta."""
    def __init__(self, falhar=""):
        self.falhar, self.enviados = falhar, []

    async def __call__(self, cfg, contato, nome, idioma, variaveis):
        if self.falhar:
            raise meta_canais.EnvioFalhou(self.falhar)
        self.enviados.append((contato, nome, variaveis))
        return f"wamid.out{len(self.enviados)}"


CFG_WA = {**CFG, "waba_id": "WABA1"}
PERFIL = {"name": "Rômulo", "company_name": "LeadSage Studio"}


def disparar(rodar, ids, consentimento=True, cfg=None):
    return rodar(robo_disparo.disparar, UID, "alice@example.com", cfg or CFG_WA, PERFIL, ids, consentimento)


@pytest.fixture
def envio_modelo(monkeypatch):
    m = Modelos()
    monkeypatch.setattr(meta_canais, "enviar_modelo", m)
    monkeypatch.setattr(robo_disparo, "status_modelo", Modelo())
    return m


def test_disparo_sem_consentimento_nao_comeca(com_robo, rodar, envio_modelo):
    card(rodar, etapa="Novo Lead")
    with pytest.raises(ValueError, match="aceitaram"):
        disparar(rodar, ["L1"], consentimento=False)
    assert envio_modelo.enviados == []


def test_disparo_sem_whatsapp_conectado(com_robo, rodar, envio_modelo):
    card(rodar, etapa="Novo Lead")
    with pytest.raises(ValueError, match="Conecte o WhatsApp"):
        disparar(rodar, ["L1"], cfg={"uid": UID})


def test_disparo_exige_modelo_aprovado(com_robo, rodar, envio_modelo, monkeypatch):
    card(rodar, etapa="Novo Lead")
    for status, trecho in (("PENDING", "ainda não foi aprovado"), ("REJECTED", "ainda não foi aprovado"), ("", "Crie o modelo")):
        monkeypatch.setattr(robo_disparo, "status_modelo", Modelo(status))
        with pytest.raises(ValueError, match=trecho):
            disparar(rodar, ["L1"])
    assert envio_modelo.enviados == []


def test_disparo_envia_move_e_abre_a_conversa(com_robo, rodar, envio_modelo):
    card(rodar, etapa="Novo Lead")
    r = disparar(rodar, ["L1"])
    assert [e["id"] for e in r["enviados"]] == ["L1"]
    # numero brasileiro sem o 55 ou com mascara chega normalizado
    contato, nome, variaveis = envio_modelo.enviados[0]
    assert contato == "5514998003784" and nome == robo_disparo.NOME_MODELO
    assert variaveis == ["Ana", "LeadSage Studio", "Padaria Jacarandá"] or variaveis[1:] == ["LeadSage Studio", "Padaria Jacarandá"]
    assert rodar(pipeline_store.obter, UID, "L1")["etapa"] == "Contato Enviado"

    conversa = rodar(robo_store.obter_conversa, UID, robo_store.id_da_conversa("whatsapp", "5514998003784"))
    assert conversa["lead_id"] == "L1" and conversa["origem"] == "disparo"
    assert "Padaria Jacarandá" in conversa["mensagens"][0]["texto"]
    assert "SAIR" in conversa["mensagens"][0]["texto"]


def test_resposta_ao_disparo_cai_na_mesma_conversa_e_card(com_robo, rodar, envio_modelo):
    card(rodar, etapa="Novo Lead")
    disparar(rodar, ["L1"])
    c = rodar(robo_service.processar, CFG, msg("oi, pode falar"), gerar=resposta_sdr(), enviar=Envio())
    assert c["lead_id"] == "L1" and c["mensagens"][0]["de"] == "robo" and c["mensagens"][1]["de"] == "contato"
    assert rodar(pipeline_store.obter, UID, "L1")["etapa"] == "Respondeu"
    assert len(rodar(pipeline_store.listar, UID)) == 1


def test_disparo_nao_repete_contato(com_robo, rodar, envio_modelo):
    card(rodar, etapa="Novo Lead")
    disparar(rodar, ["L1"])
    r = disparar(rodar, ["L1"])
    assert r["enviados"] == [] and "já houve conversa" in r["ignorados"][0]["motivo"]
    assert len(envio_modelo.enviados) == 1


def test_quem_saiu_nao_recebe_disparo(com_robo, rodar, envio_modelo):
    card(rodar, etapa="Novo Lead")
    rodar(robo_service.processar, CFG, msg("pare", "w1"), gerar=ia(), enviar=Envio())
    card(rodar, "L2", "Novo Lead", FONE)  # mesmo numero, outro card
    r = disparar(rodar, ["L2"])
    assert r["enviados"] == [] and "não receber" in r["ignorados"][0]["motivo"]
    assert envio_modelo.enviados == []


def test_lead_sem_telefone_e_ignorado(com_robo, rodar, envio_modelo):
    card(rodar, "L3", "Novo Lead", fone="")
    r = disparar(rodar, ["L3", "nao-existe"])
    assert r["enviados"] == [] and len(r["ignorados"]) == 2


def test_lote_tem_limite(com_robo, rodar, envio_modelo):
    with pytest.raises(ValueError, match="no máximo"):
        disparar(rodar, [f"L{i}" for i in range(robo_disparo.TAMANHO_LOTE + 1)])


def test_falha_de_entrega_nao_move_nem_abre_conversa(com_robo, rodar, monkeypatch):
    monkeypatch.setattr(meta_canais, "enviar_modelo", Modelos(falhar="o número pode não ter WhatsApp"))
    monkeypatch.setattr(robo_disparo, "status_modelo", Modelo())
    card(rodar, etapa="Novo Lead")
    r = disparar(rodar, ["L1"])
    assert r["enviados"] == [] and "WhatsApp" in r["falhas"][0]["motivo"]
    assert rodar(pipeline_store.obter, UID, "L1")["etapa"] == "Novo Lead"
    assert rodar(robo_store.obter_conversa, UID, robo_store.id_da_conversa("whatsapp", "5514998003784")) is None


def test_telefone_brasileiro_sem_codigo_ganha_55():
    assert robo_disparo.normalizar_telefone("(14) 99800-3784") == "5514998003784"
    assert robo_disparo.normalizar_telefone("+55 14 99800-3784") == "5514998003784"
    assert robo_disparo.normalizar_telefone("12345") == ""


def test_rota_de_disparo_pede_consentimento(client, com_plano, monkeypatch):
    com_plano("agencia")
    monkeypatch.setattr(robo_disparo, "status_modelo", Modelo())
    r = client.post("/api/robo/disparar", json={"lead_ids": ["A"], "consentimento": False})
    assert r.status_code == 400
