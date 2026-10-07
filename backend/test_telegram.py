"""Telegram: conectar o bot, receber mensagem e responder pelo robô.

O que estes testes travam:

- o webhook só aceita chamada com o segredo que nós definimos;
- só conversa privada vira mensagem (grupo, outro bot e edição ficam fora);
- o token do bot e o segredo nunca voltam para a tela;
- o robô responde a quem escreveu e a resposta sai pelo Telegram.

Nada aqui chama o Telegram nem a IA.
"""
import json

import pytest

from app import meta_canais, robo_service, telegram_canal
from test_robo import Envio, com_robo, ia, rodar  # noqa: F401

TOKEN = "123456789:AAEhBP0av28iJxFZq0mHfMqkSzBnRa3xYzA"


def update(texto="Oi, vim pelo link", uid=1001, chat=None, de=None, **extra):
    return {
        "update_id": uid,
        "message": {
            "message_id": 7, "date": 1_760_000_000, "text": texto,
            "chat": chat or {"id": 555, "type": "private"},
            "from": de or {"id": 555, "is_bot": False, "first_name": "Ana", "last_name": "Souza"},
            **extra,
        },
    }


# ------------------------------------------------------------------ leitura

def test_le_texto_e_nome():
    [m] = telegram_canal.ler_update(update())
    assert (m.canal, m.contato, m.nome, m.texto, m.meta_id) == ("telegram", "555", "Ana Souza", "Oi, vim pelo link", "tg1001")


def test_start_vira_cumprimento():
    assert telegram_canal.ler_update(update("/start"))[0].texto == "Oi"
    assert telegram_canal.ler_update(update("/start campanha1"))[0].texto == "Oi"


@pytest.mark.parametrize("chave,rotulo", [("photo", "[imagem]"), ("voice", "[áudio]"), ("document", "[documento]"), ("sticker", "[figurinha]")])
def test_midia_vira_rotulo(chave, rotulo):
    u = update("")
    u["message"].pop("text")
    u["message"][chave] = [{"file_id": "x"}]
    assert telegram_canal.ler_update(u)[0].texto == rotulo


def test_legenda_da_foto_e_o_texto():
    u = update("")
    u["message"].pop("text")
    u["message"].update({"photo": [{"file_id": "x"}], "caption": "Esse é o meu logo"})
    assert telegram_canal.ler_update(u)[0].texto == "Esse é o meu logo"


def test_grupo_outro_bot_e_edicao_ficam_de_fora():
    assert telegram_canal.ler_update(update(chat={"id": -100, "type": "supergroup"})) == []
    assert telegram_canal.ler_update(update(de={"id": 9, "is_bot": True, "first_name": "Bot"})) == []
    assert telegram_canal.ler_update({"update_id": 5, "edited_message": update()["message"]}) == []
    assert telegram_canal.ler_update({"update_id": 6}) == []
    assert telegram_canal.ler_update({"message": update()["message"]}) == []  # sem update_id


def test_segredo_falha_fechado():
    assert telegram_canal.segredo_confere({"tg_secret": "abc"}, "abc")
    assert not telegram_canal.segredo_confere({"tg_secret": "abc"}, "abd")
    assert not telegram_canal.segredo_confere({"tg_secret": "abc"}, "")
    assert not telegram_canal.segredo_confere({}, "")
    assert not telegram_canal.segredo_confere({"tg_secret": ""}, "")


def test_token_valido():
    assert telegram_canal.token_valido(TOKEN)
    for ruim in ("", "abc", "123:curto", "sem-dois-pontos" * 4, TOKEN + " lixo"):
        assert not telegram_canal.token_valido(ruim)


# ------------------------------------------------------------------- envio

def test_envio_pelo_telegram(rodar, monkeypatch):
    chamadas = []

    async def falso(token, metodo, payload=None):
        chamadas.append((token, metodo, payload))
        return {"message_id": 42}

    monkeypatch.setattr(telegram_canal, "_chamar", falso)
    mid = rodar(meta_canais.enviar, "telegram", "555", "Olá, Ana!", {"tg_token": TOKEN})
    assert mid == "42"
    assert chamadas == [(TOKEN, "sendMessage", {"chat_id": "555", "text": "Olá, Ana!"})]


def test_envio_sem_bot_conectado(rodar):
    with pytest.raises(meta_canais.EnvioFalhou, match="não conectado"):
        rodar(meta_canais.enviar, "telegram", "555", "oi", {})


def test_erro_do_telegram_vira_frase_em_portugues(rodar, monkeypatch):
    async def falso(token, metodo, payload=None):
        raise telegram_canal.TelegramRecusou("Forbidden: bot was blocked by the user")

    monkeypatch.setattr(telegram_canal, "_chamar", falso)
    with pytest.raises(meta_canais.EnvioFalhou, match="bloqueou o bot"):
        rodar(meta_canais.enviar, "telegram", "555", "oi", {"tg_token": TOKEN})


# -------------------------------------------------------------- o robô responde

def test_robo_responde_no_telegram(com_robo, rodar):
    cfg = {"uid": "alice", "gancho": "g", "ativo": True, "tg_token": TOKEN, "tg_secret": "s", "objetivo": "agendar"}
    envio = Envio()
    [m] = telegram_canal.ler_update(update())
    c = rodar(robo_service.processar, cfg, m, gerar=ia(), enviar=envio)
    assert c["canal"] == "telegram"
    assert [x["de"] for x in c["mensagens"]] == ["contato", "robo"]
    assert envio.enviados[0][:2] == ("telegram", "555")


# --------------------------------------------------------------------- rotas

@pytest.fixture
def bot(monkeypatch):
    chamadas = []

    async def falso(token, metodo, payload=None):
        chamadas.append((metodo, payload))
        if metodo == "getMe":
            return {"id": 123456789, "is_bot": True, "username": "leadsage_demo_bot"}
        return {}

    monkeypatch.setattr(telegram_canal, "_chamar", falso)
    return chamadas


def test_conectar_cadastra_o_webhook_sem_vazar_segredos(client, com_robo, bot):
    r = client.post("/api/robo/telegram/conectar", json={"token": TOKEN})
    assert r.status_code == 200, r.text
    cfg = r.json()
    assert cfg["telegram_pronto"] and cfg["tg_username"] == "leadsage_demo_bot"
    texto = json.dumps(cfg)
    assert TOKEN not in texto and "tg_secret" not in texto and "tg_token" not in texto

    [(_, webhook)] = [c for c in bot if c[0] == "setWebhook"]
    assert webhook["url"].endswith("/api/robo/telegram/" + webhook["url"].rsplit("/", 1)[1])
    assert webhook["secret_token"] and webhook["allowed_updates"] == ["message"]


def test_token_invalido_e_recusado_sem_chamar_o_telegram(client, com_robo, bot):
    r = client.post("/api/robo/telegram/conectar", json={"token": "isso-nao-e-um-token-do-telegram"})
    assert r.status_code == 400 and bot == []


def test_plano_sem_robo_nao_conecta(client, com_plano, bot):
    com_plano("start")
    assert client.post("/api/robo/telegram/conectar", json={"token": TOKEN}).status_code == 402


def test_webhook_exige_o_segredo(client, com_robo, bot, monkeypatch):
    recebidas = []

    async def captura(canal, msg, **kw):
        recebidas.append(msg)
        return {}

    monkeypatch.setattr(robo_service, "processar", captura)
    client.post("/api/robo/telegram/conectar", json={"token": TOKEN})
    [(_, wh)] = [c for c in bot if c[0] == "setWebhook"]
    url = "/api/robo/telegram/" + wh["url"].rsplit("/", 1)[1]

    assert client.post(url, json=update()).status_code == 401
    assert client.post(url, json=update(), headers={"x-telegram-bot-api-secret-token": "errado"}).status_code == 401
    assert recebidas == []

    ok = client.post(url, json=update(), headers={"x-telegram-bot-api-secret-token": wh["secret_token"]})
    assert ok.status_code == 200 and len(recebidas) == 1 and recebidas[0].canal == "telegram"

    # grupo: autenticado, mas não vira mensagem
    client.post(url, json=update(chat={"id": -1, "type": "group"}), headers={"x-telegram-bot-api-secret-token": wh["secret_token"]})
    assert len(recebidas) == 1


def test_webhook_de_gancho_desconhecido(client, com_robo):
    assert client.post("/api/robo/telegram/nao-existe", json=update(),
                       headers={"x-telegram-bot-api-secret-token": "x"}).status_code == 401


def test_desconectar_remove_o_webhook_e_apaga_o_token(client, com_robo, bot):
    client.post("/api/robo/telegram/conectar", json={"token": TOKEN})
    r = client.post("/api/robo/telegram/desconectar")
    assert r.status_code == 200 and not r.json()["telegram_pronto"] and r.json()["tg_username"] == ""
    assert any(c[0] == "deleteWebhook" for c in bot)
    # depois de desconectar, o webhook antigo deixa de valer
    assert client.get("/api/robo/config").json()["telegram_pronto"] is False
