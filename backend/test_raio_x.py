"""Raio-X do lead: o veredito de quem cuida, e o que ele nao pode errar.

Os casos vem de negocios reais testados em Botucatu (2026-10-03):

- padaria com 1.411 avaliacoes, sem site e perfil incompleto -> ninguem
  cuidando (a primeira versao dizia "o dono cuida sozinho");
- rede de academias com pixels so dentro do Tag Manager -> agencia (sem
  ler o container, parecia "sem sinais");
- hospital com Analytics e rodape atualizado -> indefinido (Analytics
  sozinho nao prova quem cuida; a primeira versao chutava "dono").

Nada aqui chama o Google, a Meta ou o site do lead.
"""
from datetime import datetime, timedelta, timezone

import pytest

from app import raio_x
from app.lead_intel import analisar_site, credito_de_agencia

ANO = 2026


def gmn(avaliacoes=0, faltando=()):
    itens = [{"item": n, "ok": n not in faltando} for n in
             ("Site próprio", "Telefone", "Horário de funcionamento", "Descrição do negócio")]
    itens.append({"item": "Fotos", "ok": None})
    return {"avaliacoes": avaliacoes, "itens": itens, "completude": 50}


SEM_INSTA = {"disponivel": False}


# --------------------------------------------------------------- veredito

def test_padaria_sem_site_e_ninguem_cuidando():
    q = raio_x.quem_cuida({}, "none", gmn(1411, ["Descrição do negócio"]), SEM_INSTA, ANO)
    assert q["veredito"] == "ninguem"
    assert any("1411 avaliações" in e for e in q["evidencias"])
    assert q["lacunas"]


def test_pixels_de_anuncio_sao_agencia():
    site = {"pixel_meta": True, "tag_google_ads": True}
    q = raio_x.quem_cuida(site, "own", gmn(147), SEM_INSTA, ANO)
    assert q["veredito"] == "agencia" and q["confianca"] == "alta"


def test_credito_no_rodape_sozinho_basta():
    q = raio_x.quem_cuida({"credito_agencia": "Pixel Agência"}, "own", gmn(), SEM_INSTA, ANO)
    assert q["veredito"] == "agencia"
    assert "Pixel Agência" in q["evidencias"][0]


def test_analytics_sozinho_nao_decide():
    """Analytics esta em site de agencia e em site do sobrinho."""
    site = {"google_analytics": True, "ano_rodape": ANO}
    q = raio_x.quem_cuida(site, "own", gmn(48, ["Descrição do negócio"]), SEM_INSTA, ANO)
    assert q["veredito"] == "indefinido" and q["confianca"] == "baixa"


def test_pixel_sozinho_nao_e_agencia():
    q = raio_x.quem_cuida({"pixel_meta": True}, "own", gmn(), SEM_INSTA, ANO)
    assert q["veredito"] in ("indefinido", "dono")


def test_rodape_antigo_e_abandono():
    q = raio_x.quem_cuida({"ano_rodape": 2019}, "own", gmn(), SEM_INSTA, ANO)
    assert q["veredito"] == "abandonado"


def test_instagram_parado_e_abandono():
    insta = {"disponivel": True, "dias_desde_ultimo_post": 140, "posts_90_dias": 0}
    q = raio_x.quem_cuida({}, "social", gmn(), insta, ANO)
    assert q["veredito"] == "abandonado"
    assert any("140 dias" in e for e in q["evidencias"])


def test_instagram_com_calendario_e_profissional():
    insta = {"disponivel": True, "dias_desde_ultimo_post": 2, "posts_90_dias": 30}
    q = raio_x.quem_cuida({"google_analytics": True}, "own", gmn(), insta, ANO)
    assert q["veredito"] == "agencia"


def test_instagram_ativo_sem_ritmo_e_o_dono():
    insta = {"disponivel": True, "dias_desde_ultimo_post": 10, "posts_90_dias": 5}
    q = raio_x.quem_cuida({}, "social", gmn(), insta, ANO)
    assert q["veredito"] == "dono"


def test_wix_e_o_dono():
    q = raio_x.quem_cuida({"plataforma": "Wix"}, "own", gmn(), SEM_INSTA, ANO)
    assert q["veredito"] == "dono"


def test_sem_nada_nao_inventa():
    q = raio_x.quem_cuida({}, "own", gmn(), SEM_INSTA, ANO)
    assert q["veredito"] == "indefinido" and q["confianca"] == "baixa"


# ------------------------------------------------------------- GMN

def test_ficha_do_google():
    place = {
        "displayName": {"text": "Padaria X"}, "rating": 4.4, "userRatingCount": 1411,
        "nationalPhoneNumber": "(14) 3882-0000", "regularOpeningHours": {"x": 1},
        "reviewSummary": {"text": {"text": "Os frequentadores elogiam o pão."}},
        "googleMapsLinks": {"reviewsUri": "https://g/r"},
    }
    f = raio_x.ficha_gmn(place, "none")
    assert f["nota"] == 4.4 and f["avaliacoes"] == 1411
    assert f["resumo_avaliacoes"].startswith("Os frequentadores")
    status = {i["item"]: i["ok"] for i in f["itens"]}
    assert status["Telefone"] and status["Site próprio"] is False
    assert status["Fotos"] is None, "foto que nao vem e desconhecida, nao falta"
    # so os itens conhecidos entram na conta: 2 de 4
    assert f["completude"] == 50


# -------------------------------------------------------------- Instagram

@pytest.mark.parametrize("valor,esperado", [
    ("https://www.instagram.com/padoka/", "padoka"),
    ("@padoka.botucatu", "padoka.botucatu"),
    ("instagram.com/padoka?hl=pt", "padoka"),
    ("https://instagram.com/p/ABC123/", ""),
    ("", ""),
    ("não é um perfil", ""),
])
def test_usuario_do_instagram(valor, esperado):
    assert raio_x.usuario_do_instagram(valor) == esperado


def test_atividade_do_instagram():
    agora = datetime(2026, 10, 4, tzinfo=timezone.utc)
    posts = [{"timestamp": (agora - timedelta(days=d)).strftime("%Y-%m-%dT%H:%M:%S+0000"),
              "like_count": 10, "comments_count": 2} for d in (3, 20, 50, 200)]
    a = raio_x.atividade_instagram(
        {"username": "padoka", "followers_count": 900, "media_count": 120,
         "media": {"data": posts}}, agora)
    assert a["dias_desde_ultimo_post"] == 3
    assert a["posts_90_dias"] == 3
    assert a["engajamento_medio"] == 12


@pytest.mark.asyncio
async def test_sem_instagram_conectado_explica():
    r = await raio_x.consultar_instagram("padoka", {})
    assert not r["disponivel"] and "conecte" in r["motivo"]


# ----------------------------------------------------- sinais do site

def test_credito_so_no_rodape():
    assert credito_de_agencia("<footer>Desenvolvido por <a>Pixel Agência</a></footer>") == "Pixel Agência"
    assert credito_de_agencia("<footer>Criado com Wix</footer>") == ""
    assert credito_de_agencia(
        "<main>Bolo feito por nossa equipe</main><footer>© Padaria</footer>") == ""


def test_pixels_e_tag_manager_no_html():
    html = ('<html><script>fbq("init")</script><script>gtag("config","AW-123456789")</script>'
            '<script src="https://www.googletagmanager.com/gtm.js?id=GTM-ABC1234"></script></html>')
    s = analisar_site(html, "https://x.com.br")
    assert s["pixel_meta"] and s["tag_google_ads"]
    assert s["gtm_ids"] == ["GTM-ABC1234"]


@pytest.mark.asyncio
async def test_pixels_escondidos_no_tag_manager(monkeypatch):
    class Resp:
        text = 'var a="https://connect.facebook.net/en_US/fbevents.js";var b="AW-987654321";'

    class Cliente:
        def __init__(self, *a, **k): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *a): pass
        async def get(self, url, params=None):
            assert url == "https://www.googletagmanager.com/gtm.js", "so o dominio do Google"
            return Resp()

    monkeypatch.setattr(raio_x.httpx, "AsyncClient", Cliente)
    r = await raio_x.pixels_no_tag_manager(["GTM-ABC1234", "javascript:alert(1)"])
    assert r == {"pixel_meta": True, "tag_google_ads": True, "tag_tiktok": False}


# ----------------------------------------------------------------- rota

def test_raio_x_cobra_uma_vez_e_guarda(client, monkeypatch):
    chamadas = []

    async def montar(place_id, website, instagram, canal, lead=None):
        chamadas.append(place_id)
        return {"place_id": place_id, "gmn": {}, "site": {}, "instagram": {},
                "quem_cuida": {"veredito": "ninguem"}, "gerado_em": "x",
                "gerado_em_ts": __import__("time").time()}

    monkeypatch.setattr(raio_x, "montar", montar)
    corpo = {"place_id": "ChIJabcdefghij"}
    r1 = client.post("/api/raio-x", json=corpo).json()
    r2 = client.post("/api/raio-x", json=corpo).json()
    assert r1["do_cache"] is False and r2["do_cache"] is True
    assert chamadas == ["ChIJabcdefghij"]

    client.post("/api/raio-x", json={**corpo, "refazer": True})
    assert len(chamadas) == 2


def test_raio_x_recusa_id_estranho(client):
    assert client.post("/api/raio-x", json={"place_id": "../../etc"}).status_code == 422
