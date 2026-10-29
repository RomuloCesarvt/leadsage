"""O app compilado servido pelo próprio servidor (hospedagem de serviço único).

Trava: a API nunca é engolida pela tela, rota desconhecida cai no index.html, ninguém lê arquivo fora da pasta do app,
e sem a pasta compilada (dev, testes, Vercel) nada muda.
"""
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app import spa


@pytest.fixture
def pasta(tmp_path):
    (tmp_path / "assets").mkdir()
    (tmp_path / "index.html").write_text("<html>app</html>", encoding="utf-8")
    (tmp_path / "lp.html").write_text("<html>lp</html>", encoding="utf-8")
    (tmp_path / "termos.html").write_text("<html>termos</html>", encoding="utf-8")
    (tmp_path / "sw.js").write_text("//sw", encoding="utf-8")
    (tmp_path / "assets" / "app-abc123.js").write_text("console.log(1)", encoding="utf-8")
    (tmp_path.parent / "segredo.txt").write_text("fora da pasta", encoding="utf-8")
    return tmp_path


def servidor(pasta):
    app = FastAPI()

    @app.get("/api/status")
    def status():
        return {"ok": True}

    @app.get("/s/{slug}")
    def site(slug: str):
        return {"slug": slug}

    assert spa.montar(app, str(pasta))
    return TestClient(app)


def test_a_api_e_o_site_publicado_continuam_com_a_api(pasta):
    c = servidor(pasta)
    assert c.get("/api/status").json() == {"ok": True}
    assert c.get("/s/padaria-x").json() == {"slug": "padaria-x"}


def test_rota_da_api_ou_do_site_que_nao_existe_e_404_de_verdade(pasta):
    c = servidor(pasta)
    assert c.get("/api/nao-existe").status_code == 404 and c.get("/api/nao-existe").headers["content-type"].startswith("application/json")
    assert c.get("/s/").status_code in (404, 307, 200) and "app" not in c.get("/api/x").text


def test_raiz_e_rota_da_tela_devolvem_o_app_sem_cache(pasta):
    c = servidor(pasta)
    for rota in ("/", "/painel", "/robo/configuracao"):
        r = c.get(rota)
        assert r.status_code == 200 and "app" in r.text and r.headers["cache-control"] == "no-cache"


def test_paginas_fixas_da_vercel(pasta):
    c = servidor(pasta)
    assert "lp" in c.get("/lp").text and "lp" in c.get("/inicio/").text and "termos" in c.get("/termos").text


def test_arquivos_com_hash_ficam_em_cache_e_o_service_worker_nao(pasta):
    c = servidor(pasta)
    assert "immutable" in c.get("/assets/app-abc123.js").headers["cache-control"]
    assert c.get("/sw.js").headers["cache-control"] == "no-cache"


@pytest.mark.parametrize("rota", ["/../segredo.txt", "/..%2fsegredo.txt", "/assets/../../segredo.txt", "/%2e%2e/segredo.txt"])
def test_nao_le_arquivo_fora_da_pasta(pasta, rota):
    r = servidor(pasta).get(rota)
    assert "fora da pasta" not in r.text


def test_sem_pasta_compilada_nada_muda(tmp_path):
    app = FastAPI()
    assert spa.montar(app, str(tmp_path)) is False and spa.montar(app, "") is False
    assert TestClient(app).get("/qualquer").status_code == 404
