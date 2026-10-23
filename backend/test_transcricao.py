"""O robô entende áudio: transcrição grátis (Groq Whisper, Gemini de reserva) e o texto falado chegando ao robô marcado com 🎤.

Nada aqui chama a internet: os motores são simulados.
"""
import pytest

from app import ai_robo, ai_sdr, transcricao
from test_robo import com_robo  # noqa: F401


class Resposta:
    def __init__(self, status=200, json_=None, texto=""):
        self.status_code, self._json, self.text = status, json_ or {}, texto

    def json(self):
        return self._json


class ClienteFalso:
    """Substitui o httpx.Client: guarda o que foi enviado e responde com a fila de respostas."""
    def __init__(self, *respostas):
        self.respostas, self.enviados = list(respostas), []

    def post(self, url, headers=None, files=None, data=None):
        self.enviados.append({"url": url, "headers": headers, "files": files, "data": data})
        return self.respostas.pop(0)


@pytest.fixture(autouse=True)
def chave_do_groq(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "gsk_teste")


def test_mime_limpo_tira_o_parametro_e_o_que_nao_e_audio():
    assert transcricao.mime_limpo("audio/ogg; codecs=opus") == "audio/ogg"
    assert transcricao.mime_limpo("AUDIO/MPEG") == "audio/mpeg"
    assert transcricao.mime_limpo("application/json") == "audio/ogg"
    assert transcricao.mime_limpo("") == "audio/ogg"


@pytest.mark.parametrize("bruto", ["Legendas pela comunidade Amara.org", "Obrigado por assistir!", "Inscreva-se no canal", "  ", ""])
def test_legenda_inventada_no_silencio_nao_vira_fala_do_cliente(bruto):
    assert transcricao.limpar(bruto) == ""


def test_fala_real_passa_e_fala_longa_com_a_palavra_obrigado_tambem():
    assert transcricao.limpar("  Oi, pode mandar sim,\n obrigado!  ") == "Oi, pode mandar sim, obrigado!"
    longa = "Obrigado por assistir, brincadeira, eu queria saber se vocês fazem site para clínica e quanto custa mais ou menos o valor inicial."
    assert transcricao.limpar(longa) == longa


def test_groq_recebe_o_ogg_do_whatsapp_em_portugues():
    c = ClienteFalso(Resposta(200, {"text": " Oi, tudo bem? Pode mandar o link. "}))
    r = transcricao.transcrever(b"OggS...", "audio/ogg; codecs=opus", cliente=c)
    assert r == {"texto": "Oi, tudo bem? Pode mandar o link.", "motor": "groq"}
    e = c.enviados[0]
    assert e["url"].endswith("/audio/transcriptions") and e["headers"]["Authorization"] == "Bearer gsk_teste"
    assert e["files"]["file"][0] == "audio.ogg" and e["files"]["file"][2] == "audio/ogg"
    assert e["data"]["model"] == "whisper-large-v3-turbo" and e["data"]["language"] == "pt" and e["data"]["temperature"] == "0"


def test_groq_no_limite_no_modelo_rapido_tenta_o_outro_modelo():
    c = ClienteFalso(Resposta(429, texto="rate limit"), Resposta(200, {"text": "ok, pode mandar"}))
    assert transcricao.transcrever(b"x", cliente=c)["texto"] == "ok, pode mandar"
    assert [e["data"]["model"] for e in c.enviados] == ["whisper-large-v3-turbo", "whisper-large-v3"]


def test_groq_fora_do_ar_o_gemini_assume(monkeypatch):
    monkeypatch.setattr(transcricao, "_gemini", lambda audio, mime: "texto do gemini")
    c = ClienteFalso(Resposta(503, texto="over capacity"), Resposta(503, texto="over capacity"))
    assert transcricao.transcrever(b"x", cliente=c) == {"texto": "texto do gemini", "motor": "gemini"}


def test_sem_chave_do_groq_vai_direto_para_o_gemini(monkeypatch):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    monkeypatch.setattr(transcricao, "_gemini", lambda audio, mime: "vindo do gemini")
    c = ClienteFalso()
    assert transcricao.transcrever(b"x", cliente=c)["motor"] == "gemini" and c.enviados == []


def test_chave_recusada_nao_insiste_no_segundo_modelo(monkeypatch):
    monkeypatch.setattr(transcricao, "_gemini", lambda audio, mime: "")
    c = ClienteFalso(Resposta(401, texto="invalid key"))
    assert transcricao.transcrever(b"x", cliente=c)["motor"] == "gemini" and len(c.enviados) == 1


def test_nenhum_motor_funcionou_levanta_para_o_servidor_responder_503(monkeypatch):
    def quebra(audio, mime):
        raise transcricao.TranscricaoIndisponivel("gemini: limite")
    monkeypatch.setattr(transcricao, "_gemini", quebra)
    c = ClienteFalso(Resposta(503), Resposta(503))
    with pytest.raises(transcricao.TranscricaoIndisponivel) as e:
        transcricao.transcrever(b"x", cliente=c)
    assert "groq" in str(e.value) and "gemini" in str(e.value)
    with pytest.raises(transcricao.TranscricaoIndisponivel):
        transcricao.transcrever(b"", cliente=ClienteFalso())


# ---------------------------------------------------------------- a rota que o serviço da nuvem usa

@pytest.fixture
def chave(client, com_robo):
    return client.post("/api/robo/conector/gerar").json()["chave"]


def test_rota_devolve_o_texto_falado(client, chave, monkeypatch):
    visto = {}

    def falso(audio, mime):
        visto.update(audio=audio, mime=mime)
        return {"texto": "pode mandar o link que eu mostro para a doutora", "motor": "groq"}

    monkeypatch.setattr(transcricao, "transcrever", falso)
    r = client.post("/api/conector/audio", content=b"OggS\x00\x01", headers={"x-conector-key": chave, "content-type": "audio/ogg; codecs=opus"})
    assert r.status_code == 200 and r.json()["texto"].startswith("pode mandar o link") and r.json()["motor"] == "groq"
    assert visto["audio"] == b"OggS\x00\x01" and visto["mime"] == "audio/ogg; codecs=opus"


def test_rota_so_atende_quem_tem_a_chave_do_conector(client, chave):
    assert client.post("/api/conector/audio", content=b"x", headers={"content-type": "audio/ogg"}).status_code in (401, 403, 422)
    assert client.post("/api/conector/audio", content=b"x", headers={"x-conector-key": "lsc_errada", "content-type": "audio/ogg"}).status_code in (401, 403)


def test_rota_recusa_vazio_e_gigante_e_diz_503_quando_ninguem_ouviu(client, chave, monkeypatch):
    h = {"x-conector-key": chave, "content-type": "audio/ogg"}
    assert client.post("/api/conector/audio", content=b"", headers=h).status_code == 422
    assert client.post("/api/conector/audio", content=b"0" * (transcricao.LIMITE_BYTES + 1), headers=h).status_code == 413

    def quebra(audio, mime):
        raise transcricao.TranscricaoIndisponivel("tudo no limite")
    monkeypatch.setattr(transcricao, "transcrever", quebra)
    assert client.post("/api/conector/audio", content=b"x", headers=h).status_code == 503


# ---------------------------------------------------------------- o que o robô faz com o áudio

LEAD = {"id": "L1", "company": "Clínica Dra. Angela", "niche": "Clínica"}


def test_audio_transcrito_chega_ao_robo_como_fala_e_o_prompt_ensina_a_lidar():
    hist = [{"de": "robo", "texto": "Oi! Montei uma prévia do site da clínica. Posso te mandar?"},
            {"de": "contato", "texto": "🎤 pode mandar sim, eu mostro pra doutora"}]
    chamadas = []

    def gerar(p):
        chamadas.append(p)
        return {"mensagens": ["Perfeito! Aqui está a prévia: [LINK_DA_PREVIA]", "Obrigado pela ajuda!"], "enviar_previa": True, "etapa": "abertura"}

    d = ai_robo.decidir(hist, "whatsapp", {}, {"ativo": True}, LEAD, gerar)
    assert not d.passar_para_humano and d.criar_previa is True and chamadas                      # respondeu: nao passou para o dono
    assert "🎤" in chamadas[0] and "ÁUDIOS que o sistema transcreveu" in chamadas[0]


def test_audio_que_nao_deu_para_transcrever_continua_indo_para_o_dono_com_motivo_claro():
    hist = [{"de": "robo", "texto": "Oi!"}, {"de": "contato", "texto": "[áudio]"}]
    d = ai_robo.decidir(hist, "whatsapp", {}, {"ativo": True}, LEAD, lambda p: {"mensagens": ["x"]})
    assert d.passar_para_humano and "não deu para transcrever" in d.motivo and "responda você" in d.motivo
    # outras midias seguem como antes
    d2 = ai_robo.decidir([{"de": "contato", "texto": "[imagem]"}], "whatsapp", {}, {"ativo": True}, LEAD, lambda p: {"mensagens": ["x"]})
    assert d2.passar_para_humano and "[imagem]" in d2.motivo


def test_fala_transcrita_nao_e_confundida_com_robo():
    assert not ai_robo.certeza_de_robo("🎤 oi, tudo bem? queria saber o valor do site")
    assert not ai_robo.e_so_midia("🎤 oi, tudo bem?")
