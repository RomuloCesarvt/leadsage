"""O WhatsApp visto do celular: o espelho curto que o Conector alimenta so quando alguem olha.

Trava:
- sem ninguem olhando, o Conector nao e mandado enviar nada (poupa banco e privacidade);
- o celular abrindo uma conversa faz o Conector mandar as mensagens dela;
- responder pelo celular vira tarefa para o Conector, com o id da conversa (contato novo / @lid);
- espelho velho nao e servido como se fosse novo;
- o estado da conexao (QR, codigo) chega ao celular; o pedido de pareamento chega ao Conector.
"""
from datetime import datetime, timedelta, timezone

import pytest

from app import conector_whatsapp as cw
from app import espelho_whatsapp as esp
from app import robo_store
from test_robo import com_robo, rodar  # noqa: F401

CHAT = "5511964623668@c.us"
LID = "128625865191513@lid"


def cabecalho(chave):
    return {"x-conector-key": chave}


@pytest.fixture
def chave(client, com_robo):
    return client.post("/api/robo/conector/gerar").json()["chave"]


def test_sem_ninguem_olhando_o_conector_nao_manda_nada(client, chave):
    t = client.get("/api/conector/tarefas", headers=cabecalho(chave)).json()
    assert t["remoto"] is False and t["abrir"] == [] and t["proxima_em"] == 45
    p = client.post("/api/conector/ping", headers=cabecalho(chave), json={"numero": "5514999990000", "status": "ready"}).json()
    assert p["remoto"] is False


def test_celular_olhando_acelera_o_conector_e_pede_a_conversa_aberta(client, chave):
    client.get("/api/robo/whats/chats")                       # abriu a tela
    client.get(f"/api/robo/whats/chats/{CHAT}/mensagens")     # abriu uma conversa
    t = client.get("/api/conector/tarefas", headers=cabecalho(chave)).json()
    assert t["remoto"] is True and t["abrir"] == [CHAT] and t["proxima_em"] == 3


def test_o_espelho_que_o_conector_manda_chega_ao_celular(client, chave):
    lista = [{"id": CHAT, "nome": "Gabriel", "grupo": False, "telefone": "5511964623668", "naoLidas": 1, "quando": 1760000000,
              "ultima": {"texto": "boa tarde", "minha": False}}]
    msgs = [{"id": "m1", "texto": "boa tarde", "minha": False, "quando": 1760000000, "tipo": "text", "midia": False, "status": 0}]
    r = client.post("/api/conector/espelho", headers=cabecalho(chave), json={"chats": lista})
    assert r.status_code == 200
    client.post("/api/conector/espelho", headers=cabecalho(chave), json={"chat_id": CHAT, "mensagens": msgs})

    chats = client.get("/api/robo/whats/chats").json()
    assert chats["conectado"] and [c["nome"] for c in chats["chats"]] == ["Gabriel"] and chats["idade_s"] < 5
    m = client.get(f"/api/robo/whats/chats/{CHAT}/mensagens").json()
    assert m["mensagens"][0]["texto"] == "boa tarde"
    # conversa que ninguem mandou ainda: vazia, nao erro
    assert client.get(f"/api/robo/whats/chats/{LID}/mensagens").json()["mensagens"] == []


def test_espelho_velho_nao_e_servido(client, chave, rodar):
    rodar(esp.salvar_chats, "alice", [{"id": CHAT, "nome": "Gabriel"}])
    assert len(client.get("/api/robo/whats/chats").json()["chats"]) == 1
    velho = (datetime.now(timezone.utc) - timedelta(seconds=esp.TTL_ESPELHO_S + 60)).isoformat()
    rodar(esp._gravar, "alice", "chats", {"chats": [{"id": CHAT, "nome": "Gabriel"}], "em": velho})
    assert client.get("/api/robo/whats/chats").json()["chats"] == []


def test_responder_pelo_celular_vira_tarefa_com_o_id_da_conversa(client, chave):
    r = client.post(f"/api/robo/whats/chats/{LID}/enviar", json={"texto": "Posso te ligar?", "telefone": "5511964623668"})
    assert r.status_code == 200
    t = client.get("/api/conector/tarefas", headers=cabecalho(chave)).json()
    [tarefa] = t["tarefas"]
    assert tarefa["texto"] == "Posso te ligar?" and tarefa["chat_id"] == LID and tarefa["contato"] == "5511964623668"


def test_responder_exige_conector_e_conversa_valida(client, com_robo):
    assert client.post(f"/api/robo/whats/chats/{CHAT}/enviar", json={"texto": "oi"}).status_code == 409   # sem conector
    client.post("/api/robo/conector/gerar")
    assert client.post("/api/robo/whats/chats/lixo/enviar", json={"texto": "oi"}).status_code == 400
    assert client.get("/api/robo/whats/chats/..%2Fx/mensagens").status_code in (400, 404)


def test_chats_invalidos_do_conector_nao_entram(client, chave):
    client.post("/api/conector/espelho", headers=cabecalho(chave), json={"chats": [{"id": "lixo"}, {"id": CHAT, "nome": "ok"}]})
    assert [c["nome"] for c in client.get("/api/robo/whats/chats").json()["chats"]] == ["ok"]
    assert client.post("/api/conector/espelho", json={"chats": []}).status_code == 401


def test_so_o_dono_ve_o_proprio_espelho(client, chave, rodar):
    from conftest import CURRENT_UID
    rodar(esp.salvar_chats, "alice", [{"id": CHAT, "nome": "da Alice"}])
    CURRENT_UID["value"] = "bob"
    r = client.get("/api/robo/whats/chats")
    assert r.status_code == 402 or r.json()["chats"] == []   # sem plano do robo ou sem nada: nunca o da Alice


def test_estado_da_conexao_chega_ao_celular(client, chave):
    assert client.get("/api/robo/whats/estado").json()["conectado"] is True
    client.post("/api/conector/ping", headers=cabecalho(chave), json={"fase": "qr", "qr": "data:image/png;base64,AAAA", "status": "qr"})
    e = client.get("/api/robo/whats/estado").json()
    assert e["fase"] == "qr" and e["qr"].startswith("data:image/png")
    client.post("/api/conector/ping", headers=cabecalho(chave), json={"fase": "pronto", "numero": "5514999990000", "status": "ready"})
    e = client.get("/api/robo/whats/estado").json()
    assert e["fase"] == "pronto" and e["qr"] == "" and e["numero"] == "5514999990000"


def test_pareamento_por_numero_do_telefone(client, chave):
    assert client.post("/api/robo/conector/parear", json={"numero": "123"}).status_code == 422
    r = client.post("/api/robo/conector/parear", json={"numero": "(14) 99901-9705"})
    assert r.status_code == 200 and r.json()["numero"] == "5514999019705"
    p = client.post("/api/conector/ping", headers=cabecalho(chave), json={"fase": "qr", "status": "qr"}).json()
    assert p["parear"] == "5514999019705"
    # o codigo que o WhatsApp devolveu aparece na tela
    client.post("/api/conector/ping", headers=cabecalho(chave), json={"fase": "codigo", "codigo": "ABCD-1234", "status": "codigo"})
    assert client.get("/api/robo/whats/estado").json()["codigo"] == "ABCD-1234"


def test_pareamento_pede_o_conector_antes(client, com_robo):
    assert client.post("/api/robo/conector/parear", json={"numero": "14999019705"}).status_code == 409


def test_olhando_grava_pouco(rodar, monkeypatch):
    """O celular repete o aviso a cada poucos segundos; o banco nao pode receber uma escrita por vez."""
    gravacoes = []
    original = esp._gravar

    async def conta(uid, nome, dados):
        gravacoes.append(nome)
        await original(uid, nome, dados)

    monkeypatch.setattr(esp, "_gravar", conta)
    for _ in range(6):
        rodar(esp.marcar_olhando, "alice", CHAT)
    assert gravacoes.count("controle") == 1
