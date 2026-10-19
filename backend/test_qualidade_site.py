"""A avaliacao de uma previa antes de ela ser publicada ou enviada: site de molde, de outro ramo ou sem dados reais nao sai."""
import asyncio

import pytest

from app import previa_site, qualidade_site, sites_store

CONTATO = '<a href="https://wa.me/5514999990000">Falar no WhatsApp</a>'


def pagina(corpo: str, contato: bool = True) -> str:
    return f"<html><head><style>.x{{color:red}}</style></head><body><h1>Negócio</h1>{(corpo + ' ') * 25}{CONTATO if contato else ''}</body></html>"


PADARIA = pagina("Pães quentes, bolos e salgados feitos todo dia. Venha conhecer a nossa vitrine e fazer a sua encomenda.")
LEAD_PADARIA = {"id": "ChIJabc", "company": "Padaria Estrela", "niche": "Padaria", "address": "Rua A, 10", "rating": 4.7}


def _rodar(coro):
    return asyncio.get_event_loop_policy().new_event_loop().run_until_complete(coro)


def test_site_bom_passa_sem_bloqueio():
    bloqueios, _ = qualidade_site.avaliar(PADARIA, LEAD_PADARIA)
    assert bloqueios == []


def test_lead_so_com_nome_do_whatsapp_nao_vira_site_generico():
    """O caso real: 'Padaria E Confeitaria Que Que seja doce', criado so com o nome que a pessoa usa no WhatsApp."""
    lead = {"id": "in_whatsapp_5514998387268", "name": "Padaria E Confeitaria Que Que seja doce", "niche": "Padaria e confeitaria",
            "phone": "5514998387268"}
    bloqueios, _ = qualidade_site.avaliar(PADARIA, lead)
    assert any("WhatsApp" in b and "genérico" in b for b in bloqueios)
    # com texto proprio da IA o mesmo lead ja pode ter site
    assert qualidade_site.avaliar(PADARIA, lead, {"sobre": "x"})[0] == []


def test_assunto_de_outro_ramo_bloqueia():
    dentista = pagina("Clareamento dental, implantes dentários e um sorriso novo para você. Agende com o nosso dentista.")
    bloqueios, _ = qualidade_site.avaliar(dentista, LEAD_PADARIA)
    assert any("outro ramo" in b for b in bloqueios)
    # e o inverso: padaria num site de dentista
    lead_dentista = {"id": "x", "company": "Clínica Sorriso", "niche": "Dentista", "address": "Rua B"}
    assert any("outro ramo" in b for b in qualidade_site.avaliar(PADARIA, lead_dentista)[0])
    assert qualidade_site.avaliar(dentista, lead_dentista)[0] == []


def test_ramo_desconhecido_nao_gera_falso_alarme():
    lead = {"id": "x", "company": "Loja Alfa", "niche": "Papelaria", "address": "Rua C"}
    assert qualidade_site.avaliar(PADARIA, lead)[0] == []


@pytest.mark.parametrize("molde", ["Olá [Seu Nome], tudo bem?", "Lorem ipsum dolor sit amet", "Bem-vindo undefined", "Fale com {{empresa}}", "[LINK_DA_PREVIA]"])
def test_texto_de_molde_bloqueia(molde):
    assert any("molde" in b for b in qualidade_site.avaliar(pagina(molde), LEAD_PADARIA)[0])


def test_pagina_vazia_ou_sem_contato_bloqueia():
    assert any("pouco conteúdo" in b for b in qualidade_site.avaliar("<html><body>novo</body></html>", LEAD_PADARIA)[0])
    assert any("WhatsApp nem telefone" in b for b in qualidade_site.avaliar(pagina("Pães e bolos.", contato=False), LEAD_PADARIA)[0])


def test_nome_invalido_bloqueia():
    assert any("nome" in b for b in qualidade_site.avaliar(PADARIA, {"id": "x", "company": "", "name": "", "address": "a"})[0])


def test_script_e_estilo_nao_contam_como_texto():
    html = "<html><body><script>var undefined_ = 'null'; if (x == null) {}</script><style>/* lorem ipsum */</style>" + PADARIA + "</body></html>"
    assert qualidade_site.avaliar(html, LEAD_PADARIA)[0] == []


# ------------------------------------------------------------------------------------------ na criacao da previa pelo robo

def _preparar(monkeypatch, html, copia=None):
    criados = []

    async def renderizar(lead, fotos, modelo="", anterior=None):
        return {"html": html, "template": "Natural", "company": lead.get("company") or lead.get("name"), "builder_data": "{}"}

    async def fotos(nicho, quantidade=8):
        return []

    async def copia_do_lead(lead):
        return copia or {}

    async def criar_site(uid, company, html_, template, lead_id, builder_data):
        criados.append(lead_id)
        return {"id": "s1", "slug": "padaria-1"}

    async def listar(uid):
        return []

    monkeypatch.setattr(previa_site, "renderizar", renderizar)
    monkeypatch.setattr(previa_site, "fotos_do_ramo", fotos)
    monkeypatch.setattr(previa_site, "copia_do_lead", copia_do_lead)
    monkeypatch.setattr(sites_store, "create_site", criar_site)
    monkeypatch.setattr(sites_store, "list_sites", listar)
    monkeypatch.setattr(previa_site, "acesso_total", lambda email: True)
    return criados


def test_robo_nao_publica_site_reprovado_e_diz_porque(monkeypatch):
    criados = _preparar(monkeypatch, "<html><body>vazio</body></html>")
    url, falha = _rodar(previa_site.criar("u", "e@x.com", LEAD_PADARIA))
    assert url == "" and "não passou na avaliação" in falha and criados == []


def test_robo_nao_publica_site_de_lead_so_com_nome_do_whatsapp(monkeypatch):
    criados = _preparar(monkeypatch, PADARIA)
    url, falha = _rodar(previa_site.criar("u", "e@x.com", {"id": "in_whatsapp_55149", "name": "Que Que", "niche": "Padaria"}))
    assert url == "" and criados == []


def test_robo_publica_site_aprovado(monkeypatch):
    criados = _preparar(monkeypatch, PADARIA)
    url, falha = _rodar(previa_site.criar("u", "e@x.com", LEAD_PADARIA))
    assert url.endswith("/s/padaria-1") and falha == "" and criados == ["ChIJabc"]


def test_lead_sem_texto_da_ia_tenta_de_novo_e_passa(monkeypatch):
    """O primeiro texto da IA falhou (limite): a segunda tentativa traz o texto e o lead so com WhatsApp ja pode ter site."""
    criados = _preparar(monkeypatch, PADARIA)
    respostas = [{}, {"sobre": "texto proprio"}]

    async def copia_do_lead(lead):
        return respostas.pop(0) if respostas else {}

    monkeypatch.setattr(previa_site, "copia_do_lead", copia_do_lead)
    url, _ = _rodar(previa_site.criar("u", "e@x.com", {"id": "in_whatsapp_55149", "name": "Padaria Doce", "niche": "Padaria"}))
    assert url and criados == ["in_whatsapp_55149"]


def test_atualizacao_reprovada_deixa_o_site_que_ja_esta_no_ar(monkeypatch):
    gravados = []
    site = {"id": "s1", "lead_id": "l1", "slug": "p", "template": "Natural", "builder_data": "{}", "updated_at": ""}

    async def listar(uid):
        return [site]

    async def renderizar(lead, fotos, modelo="", anterior=None):
        return {"html": "<html>vazio</html>", "template": "Natural", "company": "X", "builder_data": "{}"}

    async def atualizar(*a, **k):
        gravados.append(a)

    async def fotos(n, quantidade=8):
        return []

    async def copia(lead):
        return {}

    monkeypatch.setattr(sites_store, "list_sites", listar)
    monkeypatch.setattr(sites_store, "update_site", atualizar)
    monkeypatch.setattr(previa_site, "renderizar", renderizar)
    monkeypatch.setattr(previa_site, "fotos_do_ramo", fotos)
    monkeypatch.setattr(previa_site, "copia_do_lead", copia)
    assert _rodar(previa_site.atualizar_se_antigo("u", "e@x.com", {"id": "l1", "company": "Psicóloga", "niche": "Psicólogos"})) is False
    assert gravados == []


# ------------------------------------------------------------------------------------------ no salvar do navegador (Disparo)

def test_endpoint_recusa_previa_reprovada_e_aceita_a_boa(client, com_plano):
    com_plano("agencia")
    ruim = client.post("/api/sites", json={
        "company": "Que Que", "html": PADARIA, "template": "Natural", "lead_id": "in_whatsapp_55149",
        "avaliacao": {"lead": {"id": "in_whatsapp_55149", "name": "Que Que", "niche": "Padaria"}, "copia_ia": False},
    })
    assert ruim.status_code == 422 and "não passou na avaliação" in ruim.json()["detail"]
    assert client.get("/api/sites").json() == []

    boa = client.post("/api/sites", json={
        "company": "Padaria Estrela", "html": PADARIA, "template": "Natural", "lead_id": "ChIJabc",
        "avaliacao": {"lead": LEAD_PADARIA, "copia_ia": True},
    })
    assert boa.status_code == 200
    # quem salva sem avaliacao (o construtor manual) segue como antes
    assert client.post("/api/sites", json={"company": "Meu site", "html": "<html><body>x</body></html>"}).status_code == 200
