"""Testes do disparo de mensagens.

O dispatcher antigo devolvia sucesso para tudo: Instagram, LinkedIn e
webhook retornavam "(Simulado)" sem enviar nada, e uma falha de SMTP
virava a string "Erro no Envio: ..." dentro de um 200 — que a interface
comemorava com confete, cobrando 2 creditos.

Aqui a regra e uma so: `delivered` precisa refletir a realidade, e nada
e cobrado quando nada foi entregue.

Fixtures (`client`, `as_user`, `free_port`) vem de conftest.py.

Rodar:  cd backend && python -m pytest test_dispatch.py -v
"""
import asyncio
import base64
import socket
import threading

import pytest

from app.dispatcher import DispatchError, OutreachDispatcher
from app.models import DispatchRequest

BASE = {
    "lead_id": "L1",
    "lead_name": "Padaria X",
    "body": "Olá, vi sua padaria no Google.",
    "subject": "Oportunidade",
}



# ------------------------------------------------- canais sem API de envio

def test_whatsapp_gera_link_e_nao_cobra(client):
    resp = client.post(
        "/api/dispatch", json={**BASE, "channel": "whatsapp", "lead_phone": "5571999417483"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["action_url"].startswith("https://wa.me/5571999417483?text=")
    assert data["credits_consumed"] == 0
    assert data["requires_manual_send"] is True
    # o ponto central: um link gerado nao e uma mensagem entregue
    assert data["delivered"] is False


def test_instagram_abre_a_conversa_sem_cobrar(client):
    """Antes abria o PERFIL, e o usuário ainda tinha que achar o botão de
    mensagem. Agora vai direto para a DM via ig.me/m/<usuário>."""
    resp = client.post(
        "/api/dispatch",
        json={**BASE, "channel": "instagram_direct", "lead_instagram": "https://instagram.com/padariax"},
    )
    assert resp.json()["action_url"] == "https://ig.me/m/padariax"
    assert resp.json()["credits_consumed"] == 0


@pytest.mark.parametrize("payload", [
    {"channel": "instagram_direct"},
    {"channel": "whatsapp"},
    {"channel": "linkedin_msg"},
])
def test_canal_manual_sem_destino_falha(client, payload):
    assert client.post("/api/dispatch", json={**BASE, **payload}).status_code == 422


# ----------------------------------------------------------------- e-mail

def test_sem_smtp_configurado_falha_em_vez_de_simular(client):
    resp = client.post(
        "/api/dispatch", json={**BASE, "channel": "email", "lead_email": "contato@exemplo.com"}
    )
    assert resp.status_code == 422
    assert "Integra" in resp.json()["detail"]


@pytest.mark.parametrize("email", ["", "nao-eh-email"])
def test_email_invalido_e_recusado(client, email):
    resp = client.post("/api/dispatch", json={**BASE, "channel": "email", "lead_email": email})
    assert resp.status_code == 422


def test_canal_desconhecido(client):
    assert client.post("/api/dispatch", json={**BASE, "channel": "telepatia"}).status_code == 422


# ----------------------------------------------------------- integracoes

def test_integracoes_persistem_sem_devolver_a_senha(client):
    client.put("/api/integrations", json={
        "smtp_host": "smtp.gmail.com", "smtp_port": 587, "smtp_user": "eu@gmail.com",
        "smtp_password": "segredo123", "webhook_url": "https://hooks.exemplo.com/abc",
    })
    cfg = client.get("/api/integrations").json()
    assert cfg["smtp_user"] == "eu@gmail.com"
    assert cfg["webhook_url"] == "https://hooks.exemplo.com/abc"
    # a senha nunca volta em texto claro
    assert "smtp_password" not in cfg
    assert cfg["has_password"] is True

    # campo em branco mantem a senha atual, nao apaga
    client.put("/api/integrations", json={"smtp_host": "smtp.outro.com", "smtp_password": ""})
    assert client.get("/api/integrations").json()["has_password"] is True


def test_integracoes_sao_isoladas_por_usuario(client, as_user):
    client.put("/api/integrations", json={"smtp_user": "alice@x.com", "smtp_password": "s"})
    as_user("bob")
    assert client.get("/api/integrations").json()["smtp_user"] == ""


# --------------------------------------------------- envio SMTP de verdade

def _fake_smtp_server(port: int, auth_ok: bool, capturado: dict):
    """Servidor SMTP minimo, para provar que o e-mail sai de fato."""
    srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    srv.bind(("127.0.0.1", port))
    srv.listen(1)

    def run():
        conn, _ = srv.accept()
        stream = conn.makefile("rwb")
        conn.sendall(b"220 localhost SMTP\r\n")
        corpo, em_dados = [], False
        while True:
            line = stream.readline()
            if not line:
                break
            texto = line.decode("utf-8", "replace").strip()
            if em_dados:
                if texto == ".":
                    em_dados = False
                    capturado["corpo"] = "\n".join(corpo)
                    conn.sendall(b"250 OK\r\n")
                else:
                    corpo.append(texto)
                continue
            comando = texto.upper()
            if comando.startswith(("EHLO", "HELO")):
                conn.sendall(b"250-localhost\r\n250 AUTH PLAIN LOGIN\r\n")
            elif comando.startswith("AUTH"):
                conn.sendall(b"235 OK\r\n" if auth_ok else b"535 recusado\r\n")
            elif comando.startswith("RCPT TO"):
                capturado["para"] = texto
                conn.sendall(b"250 OK\r\n")
            elif comando.startswith("DATA"):
                em_dados = True
                conn.sendall(b"354 envie\r\n")
            elif comando.startswith("QUIT"):
                conn.sendall(b"221 tchau\r\n")
                break
            else:
                conn.sendall(b"250 OK\r\n")
        conn.close()
        srv.close()

    threading.Thread(target=run, daemon=True).start()


def _req():
    return DispatchRequest(
        lead_id="L1", lead_name="Padaria X", lead_email="dono@padariax.com.br",
        channel="email", subject="Oportunidade", body="Olá! Vi sua padaria no Google.",
    )


def test_email_e_realmente_entregue_e_so_entao_cobra(free_port):
    capturado = {}
    _fake_smtp_server(free_port, auth_ok=True, capturado=capturado)
    config = {
        "smtp_host": "127.0.0.1", "smtp_port": free_port,
        "smtp_user": "eu@x.com", "smtp_password": "s", "from_email": "eu@x.com",
    }
    resp = asyncio.run(OutreachDispatcher.dispatch_message(_req(), 100, config))

    assert resp.delivered is True
    assert resp.credits_consumed == 2
    assert "dono@padariax.com.br" in capturado["para"]
    assert "Subject: Oportunidade" in capturado["corpo"]
    # Corpo com acento viaja em base64 (Content-Transfer-Encoding do e-mail)
    corpo_codificado = capturado["corpo"].split("\n\n", 1)[1]
    assert "Vi sua padaria no Google" in base64.b64decode(corpo_codificado).decode("utf-8")


def test_credencial_recusada_levanta_erro_sem_cobrar(free_port):
    _fake_smtp_server(free_port, auth_ok=False, capturado={})
    config = {
        "smtp_host": "127.0.0.1", "smtp_port": free_port,
        "smtp_user": "eu@x.com", "smtp_password": "errada", "from_email": "eu@x.com",
    }
    with pytest.raises(DispatchError, match="Senha de App"):
        asyncio.run(OutreachDispatcher.dispatch_message(_req(), 100, config))
