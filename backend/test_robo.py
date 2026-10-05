"""Robo de atendimento: o que pode e o que nunca pode acontecer.

Os riscos que estes testes travam:

- mensagem forjada: sem a assinatura do app da Meta, nada e processado;
- quem pediu para sair continua recebendo — o caminho mais curto para
  denuncia e banimento do numero do usuario;
- dois robos conversando para sempre, gastando credito a cada volta;
- o robo responder por cima do dono depois que ele assumiu a conversa;
- segredo da Meta voltando para a tela.

Nada aqui chama a Meta nem a IA: envio e geracao sao substituidos.
"""
import asyncio
import hashlib
import hmac
import json

import pytest

from app import meta_canais, robo_service, robo_store
from app.ai_robo import (
    MAX_RESPOSTAS_SEGUIDAS, RESPOSTA_SAIDA, decidir, e_so_midia, pediu_para_sair,
)

SEGREDO = "segredo-do-app-da-meta"


def assinar(corpo: bytes, segredo: str = SEGREDO) -> str:
    return "sha256=" + hmac.new(segredo.encode(), corpo, hashlib.sha256).hexdigest()


def evento_whatsapp(texto="Oi, vi sua mensagem", de="5514998003784", mid="wamid.1", tipo="text"):
    msg = {"from": de, "id": mid, "timestamp": "1760000000", "type": tipo}
    if tipo == "text":
        msg["text"] = {"body": texto}
    return {
        "object": "whatsapp_business_account",
        "entry": [{"changes": [{"value": {
            "metadata": {"phone_number_id": "PHONE1"},
            "contacts": [{"wa_id": de, "profile": {"name": "Padaria Jacarandá"}}],
            "messages": [msg],
        }}]}],
    }


def evento_pagina(objeto="page", texto="Olá", de="PSID9", mid="m_1", eco=False):
    return {"object": objeto, "entry": [{"messaging": [{
        "sender": {"id": de}, "recipient": {"id": "PAGE1"}, "timestamp": 1760000000000,
        "message": {"mid": mid, "text": texto, **({"is_echo": True} if eco else {})},
    }]}]}


CFG = {
    "uid": "alice", "email": "alice@example.com", "ativo": True,
    "app_secret": SEGREDO, "wa_token": "t", "wa_phone_id": "PHONE1",
    "page_id": "PAGE1", "page_token": "pt", "ig_id": "IG1", "objetivo": "agendar",
}


class Envio:
    """Substitui a Meta: guarda o que seria enviado."""
    def __init__(self, falhar: str = ""):
        self.enviados = []
        self.falhar = falhar

    async def __call__(self, canal, contato, texto, cfg):
        if self.falhar:
            raise meta_canais.EnvioFalhou(self.falhar)
        self.enviados.append((canal, contato, texto))
        return f"out.{len(self.enviados)}"


def ia(resposta="Que bom! Posso te ligar amanhã às 10h?", humano=False, motivo=""):
    chamadas = []

    def gerar(prompt):
        chamadas.append(prompt)
        return {"resposta": resposta, "passar_para_humano": humano, "motivo": motivo}

    gerar.chamadas = chamadas
    return gerar


@pytest.fixture
def rodar(client):
    """Executa no event loop do proprio app.

    O engine do SQLAlchemy fica preso ao loop que o TestClient abriu;
    run_until_complete num loop novo estoura assim que toca no banco.
    """
    import functools

    def _rodar(fn, *args, **kwargs):
        return client.portal.call(functools.partial(fn, *args, **kwargs))
    return _rodar


# ------------------------------------------------------------ assinatura

def test_assinatura_valida_passa():
    corpo = b'{"a":1}'
    assert meta_canais.assinatura_confere(corpo, assinar(corpo), SEGREDO)


@pytest.mark.parametrize("cabecalho", ["", "sha256=errada", "md5=abc", assinar(b"outro corpo")])
def test_assinatura_invalida_e_recusada(cabecalho):
    assert not meta_canais.assinatura_confere(b'{"a":1}', cabecalho, SEGREDO)


def test_sem_segredo_configurado_recusa_tudo():
    """Falhar fechado: sem segredo nao ha como saber quem mandou."""
    corpo = b"{}"
    assert not meta_canais.assinatura_confere(corpo, assinar(corpo, ""), "")


# ------------------------------------------------------- leitura de eventos

def test_le_texto_do_whatsapp_com_nome():
    [r] = meta_canais.ler_eventos(evento_whatsapp(), CFG)
    assert (r.canal, r.contato, r.texto, r.nome) == (
        "whatsapp", "5514998003784", "Oi, vi sua mensagem", "Padaria Jacarandá")


def test_midia_vira_rotulo():
    [r] = meta_canais.ler_eventos(evento_whatsapp(tipo="audio"), CFG)
    assert r.texto == "[áudio]"


def test_ignora_numero_de_outro_usuario():
    """O mesmo app pode ter varios numeros; so o conectado conta."""
    cfg = {**CFG, "wa_phone_id": "OUTRO"}
    assert meta_canais.ler_eventos(evento_whatsapp(), cfg) == []


def test_ignora_confirmacao_de_leitura():
    corpo = {"object": "whatsapp_business_account", "entry": [{"changes": [{"value": {
        "metadata": {"phone_number_id": "PHONE1"}, "statuses": [{"status": "read"}]}}]}]}
    assert meta_canais.ler_eventos(corpo, CFG) == []


@pytest.mark.parametrize("objeto,canal", [("page", "messenger"), ("instagram", "instagram")])
def test_le_messenger_e_instagram(objeto, canal):
    [r] = meta_canais.ler_eventos(evento_pagina(objeto), CFG)
    assert (r.canal, r.contato, r.texto) == (canal, "PSID9", "Olá")


def test_eco_da_propria_pagina_e_ignorado():
    """Responder ao eco faria o robo conversar consigo mesmo."""
    assert meta_canais.ler_eventos(evento_pagina(eco=True), CFG) == []
    assert meta_canais.ler_eventos(evento_pagina(de="PAGE1"), CFG) == []


# ----------------------------------------------------------- pedido de saida

@pytest.mark.parametrize("texto", [
    "Pare", "pare por favor", "ok obrigado pode parar", "STOP",
    "para de mandar mensagem", "me tira dessa lista",
    "Para", "Sair", "descadastrar",
])
def test_reconhece_pedido_de_saida(texto):
    assert pediu_para_sair(texto)


@pytest.mark.parametrize("texto", [
    "quanto vai sair?",                      # pergunta de preco
    "quando chega?",                         # pergunta de prazo
    "não quero perder essa oportunidade",
    "para quando seria?",
    "sim, tenho interesse",
    "qual o valor?",
])
def test_nao_confunde_pergunta_com_saida(texto):
    assert not pediu_para_sair(texto)


# --------------------------------------------------------------- decisao

def conversa(*textos):
    msgs = []
    for i, t in enumerate(textos):
        msgs.append({"de": "contato" if i % 2 == 0 else "robo", "texto": t})
    return msgs


def test_saida_nao_chama_a_ia():
    gerar = ia()
    d = decidir(conversa("pare"), "whatsapp", {}, CFG, None, gerar)
    assert d.optout and d.resposta == RESPOSTA_SAIDA and not d.usou_ia
    assert gerar.chamadas == []


def test_midia_vai_para_o_humano():
    gerar = ia()
    d = decidir(conversa("[áudio]"), "whatsapp", {}, CFG, None, gerar)
    assert d.passar_para_humano and not d.resposta and gerar.chamadas == []
    assert e_so_midia("[imagem]") and not e_so_midia("vi a [imagem] ontem")


def test_limite_de_respostas_seguidas():
    """Do outro lado pode haver outro robo: sem limite, gastariam credito
    um com o outro para sempre."""
    msgs = []
    for i in range(MAX_RESPOSTAS_SEGUIDAS):
        msgs += [{"de": "contato", "texto": f"msg {i}"}, {"de": "robo", "texto": "ok"}]
    msgs.append({"de": "contato", "texto": "e agora?"})
    gerar = ia()
    d = decidir(msgs, "whatsapp", {}, CFG, None, gerar)
    assert d.passar_para_humano and gerar.chamadas == []


def test_mensagem_do_dono_zera_o_limite():
    msgs = []
    for i in range(MAX_RESPOSTAS_SEGUIDAS):
        msgs += [{"de": "contato", "texto": f"msg {i}"}, {"de": "robo", "texto": "ok"}]
    msgs += [{"de": "voce", "texto": "oi, aqui é o Rômulo"}, {"de": "contato", "texto": "oi!"}]
    d = decidir(msgs, "whatsapp", {}, CFG, None, ia())
    assert d.usou_ia and d.resposta


def test_prompt_proibe_inventar_preco_e_admite_ser_robo():
    gerar = ia()
    decidir(conversa("quanto custa?"), "whatsapp",
            {"company_name": "Studio R"}, CFG, None, gerar)
    prompt = gerar.chamadas[0]
    assert "NUNCA invente preço" in prompt
    assert "assistente virtual" in prompt
    assert "quanto custa?" in prompt


def test_prompt_usa_o_lead():
    gerar = ia()
    lead = {"company": "Padaria Jacarandá", "missingDigitalAssets": ["site"],
            "site_publicado": "https://leadsageofc.vercel.app/s/padaria-x"}
    decidir(conversa("oi"), "whatsapp", {}, CFG, lead, gerar)
    assert "Padaria Jacarandá" in gerar.chamadas[0]
    assert "/s/padaria-x" in gerar.chamadas[0]


def test_ia_sem_resposta_chama_o_humano():
    d = decidir(conversa("oi"), "whatsapp", {}, CFG, None, ia(resposta=""))
    assert d.passar_para_humano and not d.resposta


# --------------------------------------------------------------- processar

@pytest.fixture
def com_robo(client, com_plano):
    """`client` sobe o app, que cria as tabelas — inclusive a do robo."""
    com_plano("agencia")


def msg(texto="Oi, vi sua mensagem", mid="wamid.1"):
    return meta_canais.ler_eventos(evento_whatsapp(texto, mid=mid), CFG)[0]


def test_responde_e_grava_a_conversa(com_robo, rodar):
    envio = Envio()
    c = rodar(robo_service.processar, CFG, msg(), gerar=ia(), enviar=envio)
    assert [m["de"] for m in c["mensagens"]] == ["contato", "robo"]
    assert envio.enviados == [("whatsapp", "5514998003784", "Que bom! Posso te ligar amanhã às 10h?")]
    assert c["nome"] == "Padaria Jacarandá"


def test_reenvio_da_meta_nao_responde_duas_vezes(com_robo, rodar):
    envio = Envio()
    rodar(robo_service.processar, CFG, msg(), gerar=ia(), enviar=envio)
    rodar(robo_service.processar, CFG, msg(), gerar=ia(), enviar=envio)
    assert len(envio.enviados) == 1


def test_quem_saiu_nunca_mais_recebe(com_robo, rodar):
    envio = Envio()
    c = rodar(robo_service.processar, CFG, msg("pare", "w1"), gerar=ia(), enviar=envio)
    assert c["optout"] and envio.enviados[-1][2] == RESPOSTA_SAIDA

    gerar = ia()
    rodar(robo_service.processar, CFG, msg("oi de novo", "w2"), gerar=gerar, enviar=envio)
    assert len(envio.enviados) == 1 and gerar.chamadas == []


def test_robo_desligado_so_registra(com_robo, rodar):
    envio = Envio()
    c = rodar(robo_service.processar, {**CFG, "ativo": False}, msg(), gerar=ia(), enviar=envio)
    assert envio.enviados == [] and len(c["mensagens"]) == 1


def test_plano_sem_robo_nao_responde(client, com_plano, rodar):
    com_plano("start")
    envio = Envio()
    c = rodar(robo_service.processar, CFG, msg(), gerar=ia(), enviar=envio)
    assert envio.enviados == []
    assert c["precisa_humano"] and "plano" in c["motivo"]


def test_falha_de_envio_fica_visivel(com_robo, rodar):
    c = rodar(robo_service.processar, 
        CFG, msg(), gerar=ia(), enviar=Envio(falhar="token expirou"))
    assert c["precisa_humano"] and "token expirou" in c["motivo"]


def test_passar_para_humano_pausa_o_robo(com_robo, rodar):
    envio = Envio()
    c = rodar(robo_service.processar, 
        CFG, msg("quero fechar, qual o desconto?"),
        gerar=ia("Vou chamar o responsável!", humano=True, motivo="quer negociar"),
        enviar=envio)
    assert c["precisa_humano"] and not c["robo_ativo"] and c["motivo"] == "quer negociar"
    # e a proxima mensagem nao chama a IA
    gerar = ia()
    rodar(robo_service.processar, CFG, msg("e aí?", "w9"), gerar=gerar, enviar=envio)
    assert gerar.chamadas == []


def test_dono_assume_e_o_robo_para(com_robo, rodar):
    envio = Envio()
    c = rodar(robo_service.processar, CFG, msg(), gerar=ia(), enviar=envio)
    rodar(robo_store.salvar_canal, "alice", "alice@example.com", CFG)

    c = rodar(robo_service.responder_como_humano, "alice", c["id"], "Oi, aqui é o Rômulo!", enviar=envio)
    assert c["mensagens"][-1]["de"] == "voce" and not c["robo_ativo"]

    gerar = ia()
    rodar(robo_service.processar, CFG, msg("oi Rômulo", "w5"), gerar=gerar, enviar=envio)
    assert gerar.chamadas == []


# ------------------------------------------------------------------ rotas

def configurar(client, **extra):
    corpo = {"app_secret": SEGREDO, "wa_token": "TOKEN-WA-XYZ-123", "wa_phone_id": "PHONE1",
             "ativo": True, "objetivo": "agendar", **extra}
    r = client.put("/api/robo/config", json=corpo)
    assert r.status_code == 200, r.text
    return r.json()


def test_config_nunca_devolve_segredo(client, com_robo):
    cfg = configurar(client)
    texto = json.dumps(cfg)
    assert SEGREDO not in texto
    assert "TOKEN-WA-XYZ-123" not in texto
    assert cfg["tem_app_secret"] and cfg["tem_wa_token"] and cfg["whatsapp_pronto"]
    assert "/api/robo/webhook/" in cfg["webhook_url"]


def test_segredo_vazio_nao_apaga_o_salvo(client, com_robo):
    configurar(client)
    cfg = client.put("/api/robo/config", json={"app_secret": "", "instrucoes": "seja breve"}).json()
    assert cfg["tem_app_secret"] and cfg["instrucoes"] == "seja breve"


def test_plano_sem_robo_nao_configura(client, com_plano):
    com_plano("start")
    assert client.put("/api/robo/config", json={"ativo": True}).status_code == 402


def test_verificacao_da_meta(client, com_robo):
    cfg = configurar(client)
    url = cfg["webhook_url"].split("/api/", 1)[1]
    ok = client.get(f"/api/{url}", params={
        "hub.mode": "subscribe", "hub.verify_token": cfg["verify_token"], "hub.challenge": "123"})
    assert ok.status_code == 200 and ok.text == "123"

    ruim = client.get(f"/api/{url}", params={
        "hub.mode": "subscribe", "hub.verify_token": "errado", "hub.challenge": "123"})
    assert ruim.status_code == 403


def test_webhook_sem_assinatura_e_recusado(client, com_robo):
    cfg = configurar(client)
    url = "/api/" + cfg["webhook_url"].split("/api/", 1)[1]
    corpo = json.dumps(evento_whatsapp()).encode()
    assert client.post(url, content=corpo).status_code == 401
    assert client.post(url, content=corpo,
                       headers={"X-Hub-Signature-256": assinar(corpo, "outro")}).status_code == 401
    assert client.get("/api/robo/conversas").json() == []


def test_webhook_gancho_inexistente(client):
    corpo = b"{}"
    r = client.post("/api/robo/webhook/naoexisteessegancho123",
                    content=corpo, headers={"X-Hub-Signature-256": assinar(corpo)})
    assert r.status_code == 401


def test_webhook_assinado_responde(client, com_robo, monkeypatch):
    cfg = configurar(client)
    envio = Envio()
    monkeypatch.setattr(meta_canais, "enviar", envio)
    monkeypatch.setattr(robo_service, "_gerador_padrao", lambda: ia())

    url = "/api/" + cfg["webhook_url"].split("/api/", 1)[1]
    corpo = json.dumps(evento_whatsapp()).encode()
    r = client.post(url, content=corpo, headers={"X-Hub-Signature-256": assinar(corpo)})
    assert r.status_code == 200
    assert len(envio.enviados) == 1

    [conversa] = client.get("/api/robo/conversas").json()
    assert conversa["ultima"]["de"] == "robo" and conversa["total"] == 2


def test_nao_religa_robo_para_quem_saiu(client, com_robo, monkeypatch):
    cfg = configurar(client)
    monkeypatch.setattr(meta_canais, "enviar", Envio())
    url = "/api/" + cfg["webhook_url"].split("/api/", 1)[1]
    corpo = json.dumps(evento_whatsapp("pare")).encode()
    client.post(url, content=corpo, headers={"X-Hub-Signature-256": assinar(corpo)})

    [c] = client.get("/api/robo/conversas").json()
    r = client.post(f"/api/robo/conversas/{c['id']}/robo", json={"ativo": True})
    assert r.status_code == 409


def test_conversa_de_outro_usuario(client, com_plano, as_user, monkeypatch):
    com_plano("agencia")
    com_plano("agencia", uid="bob")
    cfg = configurar(client)
    monkeypatch.setattr(meta_canais, "enviar", Envio())
    monkeypatch.setattr(robo_service, "_gerador_padrao", lambda: ia())
    url = "/api/" + cfg["webhook_url"].split("/api/", 1)[1]
    corpo = json.dumps(evento_whatsapp()).encode()
    client.post(url, content=corpo, headers={"X-Hub-Signature-256": assinar(corpo)})
    [c] = client.get("/api/robo/conversas").json()

    as_user("bob")
    assert client.get("/api/robo/conversas").json() == []
    assert client.get(f"/api/robo/conversas/{c['id']}").status_code == 404
    assert client.post(f"/api/robo/conversas/{c['id']}/responder",
                       json={"texto": "oi"}).status_code == 404


# ------------------------------------------------------------------ recusa

from app.ai_robo import RESPOSTA_ENCERRA, recusou


@pytest.mark.parametrize("texto", ["Não tenho interesse no momento", "Não quero, obrigado",
                                   "não preciso", "agora não", "sem interesse"])
def test_recusa_nao_e_pedido_de_saida(texto):
    """"Agora nao" e diferente de "pare de me mandar mensagem"."""
    assert recusou(texto) and not pediu_para_sair(texto)


def test_recusa_longa_e_conversa():
    assert not recusou("não quero perder essa oportunidade, me explica melhor como funciona")


def test_primeira_recusa_ganha_uma_resposta_gentil():
    gerar = ia("Tudo bem! Posso só saber se é o momento ou o serviço?")
    d = decidir(conversa("Não tenho interesse no momento"), "whatsapp", {}, CFG, None, gerar)
    assert not d.optout and d.resposta and d.sdr["recusas"] == 1
    assert "acabou de recusar" in gerar.chamadas[0]


def test_segunda_recusa_encerra_sem_ia():
    gerar = ia()
    d = decidir(conversa("não tenho interesse"), "whatsapp", {}, CFG, None, gerar, sdr={"recusas": 1})
    assert d.optout and d.resposta == RESPOSTA_ENCERRA and gerar.chamadas == []


def test_memoria_da_negociacao_nao_regride():
    """Modelo que devolve campo vazio nao apaga o que ja foi descoberto."""
    gerar = lambda prompt: {"mensagens": ["Certo!"], "etapa": "inventada", "dados": {"dor": ""}}
    anterior = {"etapa": "proposta", "temperatura": "quente", "dados": {"dor": "sem clientes no Google"}}
    d = decidir(conversa("ok"), "whatsapp", {}, CFG, None, gerar, sdr=anterior)
    assert d.sdr["etapa"] == "proposta" and d.sdr["temperatura"] == "quente"
    assert d.sdr["dados"]["dor"] == "sem clientes no Google"


def test_reuniao_combinada_passa_para_o_humano():
    gerar = lambda prompt: {"mensagens": ["Combinado, quinta às 15h!"], "etapa": "agendamento",
                            "reuniao": "quinta 15h"}
    d = decidir(conversa("quinta às 15h"), "whatsapp", {}, CFG, None, gerar)
    assert d.passar_para_humano and "quinta 15h" in d.motivo


def test_ate_duas_mensagens():
    gerar = lambda prompt: {"mensagens": ["um", "dois", "tres"]}
    assert decidir(conversa("oi"), "whatsapp", {}, CFG, None, gerar).mensagens == ["um", "dois"]


def test_dossie_entra_no_prompt():
    gerar = ia()
    raio = {"gmn": {"resumo_avaliacoes": "Clientes elogiam o pão de queijo",
                    "itens": [{"item": "Descrição do negócio", "ok": False}]},
            "quem_cuida": {"rotulo": "Ninguém cuidando do digital", "confianca": "média", "evidencias": ["sem site"]}}
    decidir(conversa("oi"), "whatsapp", {}, CFG, {"company": "Padaria X"}, gerar, raio=raio)
    p = gerar.chamadas[0]
    assert "pão de queijo" in p and "Ninguém cuidando" in p and "Descrição do negócio" in p


def test_sem_catalogo_proibe_preco_e_com_catalogo_usa():
    sem, com = ia(), ia()
    decidir(conversa("quanto custa"), "whatsapp", {}, CFG, None, sem)
    decidir(conversa("quanto custa"), "whatsapp", {}, {**CFG, "catalogo": "Site: R$ 2.500", "desconto_maximo": 10}, None, com)
    assert "NUNCA diga valores" in sem.chamadas[0]
    assert "R$ 2.500" in com.chamadas[0] and "10%" in com.chamadas[0]


def test_persuasao_proibe_o_que_engana():
    gerar = ia()
    decidir(conversa("oi"), "whatsapp", {}, CFG, None, gerar)
    p = gerar.chamadas[0]
    assert "escassez inventada" in p and "inventar justificativa" in p


# -------------------------------------------------------------- verificador

from app.ai_sdr import problemas_da_resposta

CAT = {**CFG, "catalogo": "Site + Google: R$ 2.500\nInstagram: R$ 900/mês", "desconto_maximo": 10}


@pytest.mark.parametrize("texto", [
    "O site sai R$ 2.500.", "À vista consigo R$ 2.250.", "A gestão é R$ 900 por mês.",
])
def test_valores_do_catalogo_passam(texto):
    assert problemas_da_resposta([texto], CAT, []) == []


@pytest.mark.parametrize("texto", ["Faço por R$ 1.800.", "Fica R$ 3.000 com tudo."])
def test_valor_inventado_e_barrado(texto):
    assert problemas_da_resposta([texto], CAT, [])


def test_valor_dito_pelo_cliente_pode_ser_repetido():
    msgs = [{"de": "contato", "texto": "faz por 1500?"}]
    assert problemas_da_resposta(["R$ 1.500 não consigo, mas à vista fica R$ 2.250."], CAT, msgs) == []


def test_sem_catalogo_nenhum_valor_passa():
    assert problemas_da_resposta(["Um site custa uns R$ 2.000."], CFG, [])


@pytest.mark.parametrize("texto", [
    "R$ 1.500 fica abaixo do nosso custo de produção.", "Últimas vagas deste mês!", "Só hoje consigo esse valor.",
])
def test_motivo_ou_urgencia_inventados_sao_barrados(texto):
    assert problemas_da_resposta([texto], CAT, [{"de": "contato", "texto": "1500"}])


def test_resposta_errada_e_reescrita():
    respostas = iter([
        {"mensagens": ["R$ 1.500 fica abaixo do nosso custo."]},
        {"mensagens": ["Esse valor não consigo, mas à vista fica R$ 2.250."]},
    ])
    d = decidir(conversa("faz por 1500?"), "whatsapp", {}, CAT, None, lambda p: next(respostas))
    assert d.mensagens == ["Esse valor não consigo, mas à vista fica R$ 2.250."] and not d.passar_para_humano


def test_erro_insistente_vai_para_o_humano():
    d = decidir(conversa("faz por 1500?"), "whatsapp", {}, CAT, None,
                lambda p: {"mensagens": ["Faço por R$ 1.700, última vaga!"]})
    assert d.passar_para_humano and not d.mensagens
