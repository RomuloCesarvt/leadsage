import asyncio
import base64

import pytest

from app import criativo, conector_whatsapp, meta_canais

PNG = base64.b64encode(b"\x89PNG\r\n\x1a\n" + b"0" * 100).decode()


def test_midia_e_validacao():
    c = {"token": "abc", "mime": "image/png", "nome": "promo.png"}
    assert criativo.midia(c)["url"].endswith("/api/criativo/abc") and criativo.midia(None) is None
    assert criativo.publico(None) == {"existe": False}
    with pytest.raises(ValueError):
        asyncio.run(criativo.salvar("u1", "x.gif", "image/gif", PNG))


def test_meta_manda_imagem_com_legenda(monkeypatch):
    visto = {}

    class R:
        status_code, content = 200, b"{}"
        def json(self): return {"messages": [{"id": "wamid.1"}]}

    class C:
        async def __aenter__(self): return self
        async def __aexit__(self, *a): pass
        async def post(self, url, json=None, headers=None):
            visto.update(json); return R()

    monkeypatch.setattr(meta_canais.httpx, "AsyncClient", lambda **k: C())
    midia = {"url": "https://x/api/criativo/abc", "mime": "image/png", "nome": "p.png"}
    asyncio.run(meta_canais.enviar("whatsapp", "5511999999999", "Promoção!", {"wa_token": "t", "wa_phone_id": "1"}, midia=midia))
    assert visto["type"] == "image" and visto["image"]["link"] == midia["url"] and visto["image"]["caption"] == "Promoção!" and "text" not in visto


def test_guarda_e_serve_pelo_codigo(monkeypatch):
    mem = {}

    async def get(k): return mem.get(k)
    async def put(k, uid, tipo, d): mem[k] = d

    monkeypatch.setattr(criativo.robo_store, "_sql_get", get)
    monkeypatch.setattr(criativo.robo_store, "_sql_put", put)

    async def fluxo():
        c = await criativo.salvar("u1~empresa", "promo.png", "image/png", "data:image/png;base64," + PNG, "Olha!", {"abordagem": True})
        assert (await criativo.arquivo_por_token(c["token"]))[1] == "image/png"
        assert (await criativo.para_abordagem("u1~empresa"))["mime"] == "image/png"
        assert await criativo.para_promocao("u1") is None          # cada espaço tem o seu
        await criativo.atualizar_opcoes("u1~empresa", None, {"promocao": False})
        assert await criativo.para_promocao("u1~empresa") is None
        c2 = await criativo.salvar("u1~empresa", "novo.png", "image/png", PNG)
        assert await criativo.arquivo_por_token(c["token"]) is None  # o link antigo morre
        await criativo.remover("u1~empresa")
        assert await criativo.arquivo_por_token(c2["token"]) is None

    asyncio.run(fluxo())
