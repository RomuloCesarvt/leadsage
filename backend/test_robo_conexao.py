"""Conexao com um clique pelo app do LeadSage.

O que estes testes travam:

- o `state` do login: assinado e com validade. Sem isso, um atacante
  completaria o login com a pagina DELE no navegador da vitima, e o robo
  da vitima passaria a responder pela pagina do atacante;
- tokens de pagina nunca chegam a tela;
- com um webhook so para todos os clientes, cada mensagem vai para o
  dono da pagina/numero que a recebeu — e de mais ninguem;
- desconectar para de rotear de verdade.

Nada aqui chama a Meta: as chamadas a Graph API sao substituidas.
"""
import hashlib
import hmac
import json
import time
from urllib.parse import parse_qs, urlparse

import pytest

from app import meta_canais, meta_oauth, robo_conexao, robo_service
from app.config import settings

SEGREDO_APP = "segredo-do-app-do-leadsage"


@pytest.fixture
def app_meta(monkeypatch):
    monkeypatch.setattr(settings, "META_APP_ID", "1234567890")
    monkeypatch.setattr(settings, "META_APP_SECRET", SEGREDO_APP)
    monkeypatch.setattr(settings, "META_VERIFY_TOKEN", "verifica-leadsage")
    monkeypatch.setattr(settings, "META_WA_CONFIG_ID", "cfg-wa")


@pytest.fixture
def graph_falso(monkeypatch):
    """Substitui a Meta e registra o que foi pedido."""
    chamadas = []

    async def trocar(code, com_redirect=True):
        chamadas.append(("trocar", code))
        return "token-usuario-longo"

    async def assinar(page_id, token):
        chamadas.append(("assinar", page_id))

    async def desassinar(page_id, token):
        chamadas.append(("desassinar", page_id))

    monkeypatch.setattr(meta_oauth, "trocar_codigo", trocar)
    monkeypatch.setattr(meta_oauth, "assinar_pagina", assinar)
    monkeypatch.setattr(meta_oauth, "desassinar_pagina", desassinar)
    return chamadas


def paginas_falsas(monkeypatch, paginas):
    async def listar(token):
        return paginas
    monkeypatch.setattr(meta_oauth, "listar_paginas", listar)


PAG_A = {"id": "PAGA", "nome": "Studio R", "token": "TOKEN-PAG-A-SECRETO", "ig_id": "IGA", "ig_usuario": "studior"}
PAG_B = {"id": "PAGB", "nome": "Outra Página", "token": "TOKEN-PAG-B-SECRETO", "ig_id": "", "ig_usuario": ""}


def assinar(corpo: bytes, segredo: str = SEGREDO_APP) -> str:
    return "sha256=" + hmac.new(segredo.encode(), corpo, hashlib.sha256).hexdigest()


def evento_pagina(page_id, de="PSID1", mid="m1", texto="Oi!"):
    return {"page_id": page_id, "messaging": [{
        "sender": {"id": de}, "recipient": {"id": page_id}, "timestamp": 1760000000000,
        "message": {"mid": mid, "text": texto},
    }]}


def corpo_paginas(*entradas):
    return {"object": "page", "entry": [{"id": e["page_id"], "messaging": e["messaging"]} for e in entradas]}


# ------------------------------------------------------------------ state

def test_state_volta_com_o_uid(app_meta):
    assert meta_oauth.ler_state(meta_oauth.criar_state("alice")) == "alice"


def test_state_adulterado_e_recusado(app_meta):
    """Trocar o uid dentro do state nao pode funcionar."""
    import base64
    state = meta_oauth.criar_state("alice")
    b64, assinatura = state.rsplit(".", 1)
    dados = json.loads(base64.urlsafe_b64decode(b64 + "=" * (-len(b64) % 4)))
    dados["u"] = "bob"
    falso = base64.urlsafe_b64encode(json.dumps(dados).encode()).decode().rstrip("=")
    with pytest.raises(meta_oauth.MetaRecusou):
        meta_oauth.ler_state(f"{falso}.{assinatura}")


@pytest.mark.parametrize("state", ["", "lixo", "a.b", "sem-ponto"])
def test_state_invalido(app_meta, state):
    with pytest.raises(meta_oauth.MetaRecusou):
        meta_oauth.ler_state(state)


def test_state_expira(app_meta):
    antigo = meta_oauth.criar_state("alice", agora=time.time() - 3600)
    with pytest.raises(meta_oauth.MetaRecusou, match="expirou"):
        meta_oauth.ler_state(antigo)


def test_url_de_login_pede_o_necessario(app_meta):
    q = parse_qs(urlparse(meta_oauth.url_de_login("alice")).query)
    escopos = q["scope"][0].split(",")
    assert {"pages_messaging", "instagram_manage_messages"} <= set(escopos)
    assert q["redirect_uri"][0].endswith("/api/robo/meta/retorno")
    assert meta_oauth.ler_state(q["state"][0]) == "alice"


def test_sem_app_configurado_nada_aparece(monkeypatch):
    monkeypatch.setattr(settings, "META_APP_ID", "")
    monkeypatch.setattr(settings, "META_APP_SECRET", "")
    assert meta_oauth.disponivel() == {"facebook": False, "whatsapp": False}


# ------------------------------------------------------------- roteamento

def test_divide_um_webhook_com_dois_clientes():
    corpo = corpo_paginas(evento_pagina("PAGA"), evento_pagina("PAGB", mid="m2"))
    pedacos = robo_conexao.dividir_por_ativo(corpo)
    assert [(t, i) for t, i, _ in pedacos] == [("pagina", "PAGA"), ("pagina", "PAGB")]
    # cada pedaco so carrega a propria entrada
    assert all(len(p["entry"]) == 1 for _, _, p in pedacos)


def test_divide_whatsapp_pelo_numero():
    corpo = {"object": "whatsapp_business_account", "entry": [{"changes": [
        {"value": {"metadata": {"phone_number_id": "N1"}, "messages": []}},
        {"value": {"metadata": {"phone_number_id": "N2"}, "messages": []}},
    ]}]}
    assert [i for _, i, _ in robo_conexao.dividir_por_ativo(corpo)] == ["N1", "N2"]


def test_instagram_vira_tipo_instagram():
    corpo = {"object": "instagram", "entry": [{"id": "IGA", "messaging": []}]}
    assert robo_conexao.dividir_por_ativo(corpo)[0][:2] == ("instagram", "IGA")


# ------------------------------------------------------------ fluxo de login

@pytest.fixture
def pronto(client, com_plano, app_meta, graph_falso):
    com_plano("agencia")
    return graph_falso


def retorno(client, uid="alice", code="CODE"):
    state = meta_oauth.criar_state(uid)
    return client.get("/api/robo/meta/retorno", params={"code": code, "state": state},
                      follow_redirects=False)


def test_uma_pagina_conecta_direto(client, pronto, monkeypatch):
    paginas_falsas(monkeypatch, [PAG_A])
    r = retorno(client)
    assert r.status_code in (302, 307)
    assert r.headers["location"].endswith("tela=robo&meta=ok")
    assert ("assinar", "PAGA") in pronto

    cfg = client.get("/api/robo/config").json()
    assert cfg["meta_pronto"] and cfg["page_nome"] == "Studio R" and cfg["ig_usuario"] == "studior"
    assert cfg["modo"] == "app"


def test_varias_paginas_pedem_escolha_sem_mostrar_token(client, pronto, monkeypatch):
    paginas_falsas(monkeypatch, [PAG_A, PAG_B])
    r = retorno(client)
    assert r.headers["location"].endswith("meta=escolher")

    cfg = client.get("/api/robo/config").json()
    assert [p["nome"] for p in cfg["paginas_pendentes"]] == ["Studio R", "Outra Página"]
    assert "SECRETO" not in json.dumps(cfg)
    assert not cfg["meta_pronto"]

    cfg = client.post("/api/robo/meta/pagina", json={"page_id": "PAGB"}).json()
    assert cfg["page_id"] == "PAGB" and cfg["paginas_pendentes"] == []
    assert "SECRETO" not in json.dumps(cfg)


def test_pagina_fora_da_lista_e_recusada(client, pronto, monkeypatch):
    paginas_falsas(monkeypatch, [PAG_A, PAG_B])
    retorno(client)
    assert client.post("/api/robo/meta/pagina", json={"page_id": "INVENTADA"}).status_code == 404


def test_cancelar_no_facebook_volta_com_aviso(client, pronto):
    r = client.get("/api/robo/meta/retorno", params={
        "error": "access_denied", "error_description": "Usuário cancelou"}, follow_redirects=False)
    from urllib.parse import unquote
    destino = unquote(r.headers["location"])
    assert "meta=erro" in destino and "cancelou" in destino.lower()


def test_state_forjado_no_retorno(client, pronto, monkeypatch):
    paginas_falsas(monkeypatch, [PAG_A])
    r = client.get("/api/robo/meta/retorno", params={"code": "C", "state": "forjado.123"},
                   follow_redirects=False)
    assert "meta=erro" in r.headers["location"]
    assert ("trocar", "C") not in pronto, "nao pode nem trocar o code com state invalido"


def test_conectar_sem_app_configurado(client, com_plano, monkeypatch):
    com_plano("agencia")
    monkeypatch.setattr(settings, "META_APP_ID", "")
    assert client.get("/api/robo/meta/conectar").status_code == 503


def test_conectar_devolve_url_do_facebook(client, pronto):
    url = client.get("/api/robo/meta/conectar").json()["url"]
    assert url.startswith("https://www.facebook.com/") and "state=" in url


# ---------------------------------------------------------- webhook do app

class Envio:
    def __init__(self):
        self.enviados = []

    async def __call__(self, canal, contato, texto, cfg):
        self.enviados.append((canal, contato, texto, cfg.get("page_id")))
        return "out"


def ia_falsa():
    return lambda prompt: {"resposta": "Oi! Posso ajudar?", "passar_para_humano": False}


def ligar_robo(client):
    assert client.put("/api/robo/config", json={"ativo": True}).status_code == 200


def test_webhook_do_app_sem_assinatura(client, pronto):
    corpo = json.dumps(corpo_paginas(evento_pagina("PAGA"))).encode()
    assert client.post("/api/robo/meta/webhook", content=corpo).status_code == 401
    assert client.post("/api/robo/meta/webhook", content=corpo,
                       headers={"X-Hub-Signature-256": assinar(corpo, "outro")}).status_code == 401


def test_cada_mensagem_vai_para_o_dono_da_pagina(client, pronto, as_user, com_plano, monkeypatch):
    envio = Envio()
    monkeypatch.setattr(meta_canais, "enviar", envio)
    monkeypatch.setattr(robo_service, "_gerador_padrao", ia_falsa)

    paginas_falsas(monkeypatch, [PAG_A])
    retorno(client, "alice")
    ligar_robo(client)

    as_user("bob")
    com_plano("agencia", uid="bob")
    paginas_falsas(monkeypatch, [PAG_B])
    retorno(client, "bob")
    ligar_robo(client)

    corpo = json.dumps(corpo_paginas(
        evento_pagina("PAGA", de="CLIENTE_DA_ALICE", mid="a1"),
        evento_pagina("PAGB", de="CLIENTE_DO_BOB", mid="b1"),
    )).encode()
    r = client.post("/api/robo/meta/webhook", content=corpo,
                    headers={"X-Hub-Signature-256": assinar(corpo)})
    assert r.status_code == 200

    # cada resposta sai pela pagina certa, para o contato certo
    assert sorted((e[1], e[3]) for e in envio.enviados) == [
        ("CLIENTE_DA_ALICE", "PAGA"), ("CLIENTE_DO_BOB", "PAGB")]

    [conversa_bob] = client.get("/api/robo/conversas").json()
    assert conversa_bob["contato"] == "CLIENTE_DO_BOB"
    as_user("alice")
    [conversa_alice] = client.get("/api/robo/conversas").json()
    assert conversa_alice["contato"] == "CLIENTE_DA_ALICE"


def test_pagina_desconhecida_e_ignorada(client, pronto, monkeypatch):
    envio = Envio()
    monkeypatch.setattr(meta_canais, "enviar", envio)
    corpo = json.dumps(corpo_paginas(evento_pagina("NINGUEM"))).encode()
    r = client.post("/api/robo/meta/webhook", content=corpo,
                    headers={"X-Hub-Signature-256": assinar(corpo)})
    assert r.status_code == 200 and envio.enviados == []


def test_desconectar_para_de_rotear(client, pronto, monkeypatch):
    envio = Envio()
    monkeypatch.setattr(meta_canais, "enviar", envio)
    monkeypatch.setattr(robo_service, "_gerador_padrao", ia_falsa)
    paginas_falsas(monkeypatch, [PAG_A])
    retorno(client)
    ligar_robo(client)

    cfg = client.post("/api/robo/meta/desconectar", json={"alvo": "facebook"}).json()
    assert not cfg["meta_pronto"] and ("desassinar", "PAGA") in pronto

    corpo = json.dumps(corpo_paginas(evento_pagina("PAGA"))).encode()
    client.post("/api/robo/meta/webhook", content=corpo, headers={"X-Hub-Signature-256": assinar(corpo)})
    assert envio.enviados == []


def test_trocar_de_pagina_solta_a_anterior(client, pronto, monkeypatch):
    paginas_falsas(monkeypatch, [PAG_A])
    retorno(client)
    paginas_falsas(monkeypatch, [PAG_B])
    retorno(client)
    assert ("desassinar", "PAGA") in pronto
    assert client.get("/api/robo/config").json()["page_id"] == "PAGB"


def test_verificacao_do_webhook_do_app(client, app_meta):
    ok = client.get("/api/robo/meta/webhook", params={
        "hub.mode": "subscribe", "hub.verify_token": "verifica-leadsage", "hub.challenge": "42"})
    assert ok.status_code == 200 and ok.text == "42"
    assert client.get("/api/robo/meta/webhook", params={
        "hub.mode": "subscribe", "hub.verify_token": "x", "hub.challenge": "42"}).status_code == 403


# --------------------------------------------------------------- whatsapp

def test_whatsapp_por_cadastro_guiado(client, pronto, monkeypatch):
    async def concluir(code, waba_id, phone_number_id):
        return {"wa_token": "TOKEN-WA-SECRETO", "wa_phone_id": phone_number_id,
                "waba_id": waba_id, "wa_pin": "123456"}
    monkeypatch.setattr(meta_oauth, "concluir_whatsapp", concluir)

    cfg = client.post("/api/robo/meta/whatsapp", json={
        "code": "C", "waba_id": "WABA1", "phone_number_id": "NUM1"}).json()
    assert cfg["whatsapp_pronto"] and cfg["wa_phone_id"] == "NUM1"
    texto = json.dumps(cfg)
    assert "TOKEN-WA-SECRETO" not in texto and "123456" not in texto

    envio = Envio()
    monkeypatch.setattr(meta_canais, "enviar", envio)
    monkeypatch.setattr(robo_service, "_gerador_padrao", ia_falsa)
    ligar_robo(client)
    corpo = json.dumps({"object": "whatsapp_business_account", "entry": [{"changes": [{"value": {
        "metadata": {"phone_number_id": "NUM1"},
        "messages": [{"from": "5514999990000", "id": "w1", "timestamp": "1", "type": "text",
                      "text": {"body": "oi"}}]}}]}]}).encode()
    client.post("/api/robo/meta/webhook", content=corpo, headers={"X-Hub-Signature-256": assinar(corpo)})
    assert envio.enviados and envio.enviados[0][1] == "5514999990000"


# -------------------------------------------------------- exclusao de dados

def pedido_assinado(dados: dict, segredo: str = SEGREDO_APP) -> str:
    import base64
    corpo = base64.urlsafe_b64encode(json.dumps(dados).encode()).decode().rstrip("=")
    sig = hmac.new(segredo.encode(), corpo.encode(), hashlib.sha256).digest()
    return base64.urlsafe_b64encode(sig).decode().rstrip("=") + "." + corpo


@pytest.fixture
def quem_e(monkeypatch):
    async def quem(token):
        return "FBUSER42"
    monkeypatch.setattr(meta_oauth, "quem_autorizou", quem)


def test_exclusao_apaga_conexao_e_conversas(client, pronto, quem_e, monkeypatch):
    monkeypatch.setattr(meta_canais, "enviar", Envio())
    monkeypatch.setattr(robo_service, "_gerador_padrao", ia_falsa)
    paginas_falsas(monkeypatch, [PAG_A])
    retorno(client)
    ligar_robo(client)
    corpo = json.dumps(corpo_paginas(evento_pagina("PAGA"))).encode()
    client.post("/api/robo/meta/webhook", content=corpo, headers={"X-Hub-Signature-256": assinar(corpo)})
    assert len(client.get("/api/robo/conversas").json()) == 1

    r = client.post("/api/robo/meta/exclusao", data={
        "signed_request": pedido_assinado({"algorithm": "HMAC-SHA256", "user_id": "FBUSER42"})})
    assert r.status_code == 200
    resposta = r.json()
    assert resposta["confirmation_code"] and resposta["url"].endswith(resposta["confirmation_code"])

    assert client.get("/api/robo/conversas").json() == []
    assert not client.get("/api/robo/config").json()["meta_pronto"]
    assert ("desassinar", "PAGA") in pronto

    pagina = client.get("/api/robo/meta/exclusao/" + resposta["confirmation_code"])
    assert "Dados excluídos" in pagina.text


def test_exclusao_forjada_e_recusada(client, pronto, quem_e, monkeypatch):
    paginas_falsas(monkeypatch, [PAG_A])
    retorno(client)
    falso = pedido_assinado({"algorithm": "HMAC-SHA256", "user_id": "FBUSER42"}, segredo="outro")
    assert client.post("/api/robo/meta/exclusao", data={"signed_request": falso}).status_code == 400
    assert client.get("/api/robo/config").json()["meta_pronto"], "pedido forjado nao pode desconectar"


def test_exclusao_de_quem_nao_conhecemos(client, pronto):
    r = client.post("/api/robo/meta/exclusao", data={
        "signed_request": pedido_assinado({"algorithm": "HMAC-SHA256", "user_id": "NINGUEM"})})
    assert r.status_code == 200 and r.json()["confirmation_code"]


def test_status_de_codigo_estranho(client):
    assert "não encontrado" in client.get("/api/robo/meta/exclusao/../../etc").text \
        or client.get("/api/robo/meta/exclusao/xyz").status_code == 200
