"""Previa feita por versao antiga do motor e refeita no mesmo link; site editado pelo dono nunca e sobrescrito."""
import asyncio
import json

from app import previa_site, sites_store

LEAD = {"id": "l1", "company": "Psicóloga Isabelly", "niche": "Psicólogos", "city": "Botucatu"}


def _rodar(coro):
    return asyncio.get_event_loop_policy().new_event_loop().run_until_complete(coro)


def _preparar(monkeypatch, site):
    gravados = []

    async def listar(uid):
        return [site]

    async def renderizar(lead, fotos, modelo=""):
        gravados.append(("modelo", modelo))
        return {"html": "<html>novo</html>", "template": "Natural", "company": "Psicóloga Isabelly", "builder_data": json.dumps({"empresa": "x"})}

    async def fotos(nicho, quantidade=8):
        return []

    async def atualizar(uid, site_id, company, html, template="", builder_data="", marcar_edicao=True):
        gravados.append(("update", site_id, html, template, builder_data, marcar_edicao))
        return {}

    monkeypatch.setattr(sites_store, "list_sites", listar)
    monkeypatch.setattr(sites_store, "update_site", atualizar)
    monkeypatch.setattr(previa_site, "renderizar", renderizar)
    monkeypatch.setattr(previa_site, "fotos_do_ramo", fotos)
    return gravados


def test_site_antigo_sem_edicao_e_refeito_no_mesmo_link_e_carimbado(monkeypatch):
    site = {"id": "s1", "lead_id": "l1", "slug": "psico", "template": "Fintech Flutuante", "company": "X", "builder_data": "{}", "updated_at": ""}
    gravados = _preparar(monkeypatch, site)
    assert _rodar(previa_site.atualizar_se_antigo("u", "e@x.com", LEAD)) is True
    assert ("modelo", "Fintech Flutuante") in gravados  # o motor decide se o modelo ainda combina com o ramo
    update = [g for g in gravados if g[0] == "update"][0]
    assert update[1] == "s1" and update[2] == "<html>novo</html>"
    assert json.loads(update[4])["motor"] == previa_site.MOTOR_VERSAO
    assert update[5] is False  # refazer nao conta como edicao do dono


def test_site_editado_pelo_dono_nao_e_tocado(monkeypatch):
    site = {"id": "s1", "lead_id": "l1", "slug": "psico", "template": "Natural", "builder_data": "{}", "updated_at": "2026-10-01T10:00:00"}
    gravados = _preparar(monkeypatch, site)
    assert _rodar(previa_site.atualizar_se_antigo("u", "e@x.com", LEAD)) is False
    assert gravados == []


def test_site_ja_na_versao_atual_nao_e_refeito(monkeypatch):
    site = {"id": "s1", "lead_id": "l1", "slug": "psico", "template": "Natural", "updated_at": "",
            "builder_data": json.dumps({"motor": previa_site.MOTOR_VERSAO})}
    gravados = _preparar(monkeypatch, site)
    assert _rodar(previa_site.atualizar_se_antigo("u", "e@x.com", LEAD)) is False
    assert gravados == []


def test_falha_ao_renderizar_nao_derruba_o_envio(monkeypatch):
    site = {"id": "s1", "lead_id": "l1", "slug": "psico", "template": "Natural", "builder_data": "{}", "updated_at": ""}
    _preparar(monkeypatch, site)

    async def quebra(lead, fotos, modelo=""):
        raise RuntimeError("motor fora do ar")

    monkeypatch.setattr(previa_site, "renderizar", quebra)
    assert _rodar(previa_site.atualizar_se_antigo("u", "e@x.com", LEAD)) is False
