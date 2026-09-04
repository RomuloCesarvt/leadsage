"""Testes do envio pela WhatsApp Cloud API.

O canal `whatsapp` (link) e o `whatsapp_api` (envio real) coexistem de
proposito: o primeiro nao custa nada e nao tem risco; o segundo envia de
verdade, mas so pode ser usado dentro das regras da Meta.

Os erros da Meta vem em ingles e por codigo numerico. Traduzi-los importa
porque quase todos significam "a janela de 24h fechou" ou "a politica foi
violada" — e o usuario precisa saber qual dos dois e, ja que o segundo
leva o numero ao banimento.

Fixtures (`client`, `as_user`) vem de conftest.py.

Rodar:  cd backend && python -m pytest test_whatsapp.py -v
"""
import asyncio
import json

import httpx
import pytest

import app.dispatcher as dispatcher
from app.dispatcher import DispatchError, OutreachDispatcher
from app.models import DispatchRequest

CONFIG = {"wa_token": "TOKEN-FALSO", "wa_phone_id": "123456", "wa_template": "boas_vindas"}


def pedido(**extra):
    base = dict(
        lead_id="L1", lead_name="Padaria X", channel="whatsapp_api",
        lead_phone="5571999182820", body="Olá! Vi sua padaria no Google.",
    )
    base.update(extra)
    return DispatchRequest(**base)


def meta_falsa(monkeypatch, status=200, corpo=None, capturar=None):
    """Substitui a chamada à Graph API por uma resposta controlada."""
    corpo = corpo if corpo is not None else {"messages": [{"id": "wamid.ABC123"}]}

    class ClienteFalso:
        def __init__(self, *a, **kw): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *a): return False
        async def post(self, url, headers=None, json=None):
            if capturar is not None:
                capturar.update({"url": url, "headers": headers, "payload": json})
            return httpx.Response(status, content=json_bytes(corpo))

    def json_bytes(d):
        return bytes(__import__("json").dumps(d), "utf-8")

    monkeypatch.setattr(dispatcher.httpx, "AsyncClient", ClienteFalso)


def enviar(req, config=CONFIG):
    return asyncio.run(OutreachDispatcher.dispatch_message(req, 100, config))


# ------------------------------------------------------------ envio real

def test_envio_de_texto_monta_o_payload_certo(monkeypatch):
    capturado = {}
    meta_falsa(monkeypatch, capturar=capturado)

    resp = enviar(pedido())

    assert resp.delivered is True
    assert resp.credits_consumed == 2
    assert "5571999182820" in resp.status

    assert "/123456/messages" in capturado["url"]
    assert capturado["headers"]["Authorization"] == "Bearer TOKEN-FALSO"
    assert capturado["payload"]["messaging_product"] == "whatsapp"
    assert capturado["payload"]["type"] == "text"
    assert capturado["payload"]["text"]["body"].startswith("Olá!")


def test_envio_de_template_usa_o_nome_e_idioma(monkeypatch):
    capturado = {}
    meta_falsa(monkeypatch, capturar=capturado)

    enviar(pedido(use_template=True), {**CONFIG, "wa_language": "pt_BR"})

    assert capturado["payload"]["type"] == "template"
    assert capturado["payload"]["template"]["name"] == "boas_vindas"
    assert capturado["payload"]["template"]["language"]["code"] == "pt_BR"


# ------------------------------------------------------- erros traduzidos

@pytest.mark.parametrize("codigo,trecho", [
    (131047, "24 horas"),
    (190, "token"),
    (132001, "Template não encontrado"),
    (131026, "não conseguiu entregar"),
    (80007, "Limite de envio"),
])
def test_erro_da_meta_vira_mensagem_em_portugues(monkeypatch, codigo, trecho):
    meta_falsa(monkeypatch, status=400, corpo={"error": {"code": codigo, "message": "in english"}})
    with pytest.raises(DispatchError, match=trecho):
        enviar(pedido())


def test_codigo_desconhecido_mostra_a_mensagem_da_meta(monkeypatch):
    meta_falsa(monkeypatch, status=400, corpo={"error": {"code": 999999, "message": "algo novo"}})
    with pytest.raises(DispatchError, match="algo novo"):
        enviar(pedido())


def test_falha_nao_cobra_credito(monkeypatch):
    """O ponto central: erro da Meta nao pode virar 200 nem debitar."""
    meta_falsa(monkeypatch, status=400, corpo={"error": {"code": 131047}})
    with pytest.raises(DispatchError):
        enviar(pedido())


# ------------------------------------------------------------ validações

def test_sem_credencial_orienta_o_usuario():
    with pytest.raises(DispatchError, match="Integrações"):
        enviar(pedido(), {})


def test_template_pedido_sem_template_configurado():
    with pytest.raises(DispatchError, match="template"):
        enviar(pedido(use_template=True), {"wa_token": "T", "wa_phone_id": "1"})


@pytest.mark.parametrize("telefone,trecho", [("", "não tem telefone"), ("11999", "incompleto")])
def test_telefone_invalido(telefone, trecho):
    with pytest.raises(DispatchError, match=trecho):
        enviar(pedido(lead_phone=telefone))


# ------------------------------------------ o modo link segue disponível

def test_canal_link_continua_gratuito_e_sem_envio(client, com_plano):
    com_plano()
    resp = client.post("/api/dispatch", json={
        "lead_id": "L1", "lead_name": "X", "body": "oi",
        "channel": "whatsapp", "lead_phone": "5571999182820",
    })
    dados = resp.json()
    assert dados["credits_consumed"] == 0
    assert dados["delivered"] is False
    assert dados["action_url"].startswith("https://wa.me/")


# ----------------------------------------------------------- integrações

def test_token_da_meta_nunca_volta_ao_cliente(client):
    client.put("/api/integrations", json={
        "wa_token": "SEGREDO-DA-META", "wa_phone_id": "999", "wa_template": "boas_vindas",
    })
    cfg = client.get("/api/integrations").json()

    assert "wa_token" not in cfg
    assert cfg["has_wa_token"] is True
    assert cfg["wa_phone_id"] == "999"
    assert cfg["wa_template"] == "boas_vindas"

    # campo em branco preserva o token, como na senha do SMTP
    client.put("/api/integrations", json={"wa_phone_id": "888", "wa_token": ""})
    assert client.get("/api/integrations").json()["has_wa_token"] is True


def test_credenciais_da_meta_sao_isoladas_por_usuario(client, as_user):
    client.put("/api/integrations", json={"wa_token": "T", "wa_phone_id": "111"})
    as_user("bob")
    assert client.get("/api/integrations").json()["wa_phone_id"] == ""


def test_teste_de_credencial_exige_configuracao(client):
    assert client.post("/api/integrations/test-whatsapp").status_code == 400


# ------------------------------------ abrir direto na conversa (IG/LinkedIn)

from app.dispatcher import handle_instagram, link_instagram_dm, link_linkedin_dm


@pytest.mark.parametrize("entrada,esperado", [
    ("https://instagram.com/padariafavorita", "padariafavorita"),
    ("https://www.instagram.com/padaria.favorita/", "padaria.favorita"),
    ("http://www.instagram.com/paodavilaoficial", "paodavilaoficial"),
    ("@padariafavorita", "padariafavorita"),
    ("padariafavorita", "padariafavorita"),
    ("https://instagram.com/p/ABC123", ""),      # post, nao perfil
    ("https://instagram.com/reel/XYZ", ""),      # reel, nao perfil
    ("", ""),
])
def test_extrai_o_usuario_do_instagram(entrada, esperado):
    assert handle_instagram(entrada) == esperado


def test_instagram_abre_a_conversa_e_nao_o_perfil():
    """ig.me/m/<usuario> cai na DM; instagram.com/<usuario> cai no perfil."""
    url = link_instagram_dm("https://instagram.com/padariafavorita")
    assert url == "https://ig.me/m/padariafavorita"
    assert "/m/" in url


def test_instagram_sem_perfil_utilizavel_falha(client, com_plano):
    com_plano()
    resp = client.post("/api/dispatch", json={
        "lead_id": "L1", "lead_name": "X", "body": "oi",
        "channel": "instagram_direct", "lead_instagram": "https://instagram.com/p/ABC",
    })
    assert resp.status_code == 422


def test_linkedin_de_pessoa_abre_a_janela_de_mensagem():
    url, aviso = link_linkedin_dm("https://www.linkedin.com/in/romulo-leite")
    assert url == "https://www.linkedin.com/messaging/compose/?recipient=romulo-leite"
    assert aviso == ""


def test_linkedin_de_empresa_avisa_que_nao_recebe_dm():
    """Pagina de empresa nao aceita mensagem direta — dizer isso e melhor
    do que abrir uma tela onde nao da para escrever."""
    url, aviso = link_linkedin_dm("https://www.linkedin.com/company/padaria-favorita")
    assert "company" in url
    assert "não recebe mensagem direta" in aviso


def test_status_do_instagram_menciona_a_colagem(client, com_plano):
    com_plano()
    resp = client.post("/api/dispatch", json={
        "lead_id": "L1", "lead_name": "X", "body": "oi",
        "channel": "instagram_direct", "lead_instagram": "https://instagram.com/padariafavorita",
    })
    dados = resp.json()
    assert dados["action_url"] == "https://ig.me/m/padariafavorita"
    assert "Ctrl+V" in dados["status"]
    assert dados["credits_consumed"] == 0
