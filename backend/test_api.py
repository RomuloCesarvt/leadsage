"""Testes das rotas que guardam dados por usuario.

Cobrem os defeitos que faziam a interface mentir: o botao Salvar que nao
salvava, o perfil numa variavel global compartilhada entre todos os
usuarios, o site gerado que sumia ao trocar de tela e o botao de excluir
busca que era decorativo.

Cada bloco checa tambem o isolamento entre contas: um usuario nao pode
ler nem apagar o que e de outro.

Fixtures (`client`, `as_user`) vem de conftest.py.

Rodar:  cd backend && python -m pytest test_api.py -v
"""
import asyncio
import os

import pytest

from app.profile_store import conceder_plano

HTML = "<!DOCTYPE html><html><body><h1>Padaria Teste</h1></body></html>"



def base_profile(**overrides):
    payload = {
        "id": "alice", "name": "Alice", "email": "alice@x.com",
        "company_name": "Alice Corp", "niche_focus": "Odonto",
        "product_description": "Sites", "credits": 0, "plan": "Pro", "avatar": "",
        "services": ["Sites"], "niches": ["Dentistas"], "regions": "Salvador, BA",
        "preferred_channel": "Instagram", "monthly_goal": "11 a 20", "language": "pt",
    }
    payload.update(overrides)
    return payload


# --------------------------------------------------------------- perfil

def test_perfil_persiste(client):
    """O botao Salvar da tela de Configuracoes nao gravava nada."""
    assert client.put("/api/profile", json=base_profile()).status_code == 200
    saved = client.get("/api/profile").json()
    assert saved["company_name"] == "Alice Corp"
    assert saved["niches"] == ["Dentistas"]
    assert saved["regions"] == "Salvador, BA"


def test_perfil_nao_vaza_entre_usuarios(client, as_user):
    """CURRENT_USER era uma global de modulo: um perfil para todo mundo."""
    client.put("/api/profile", json=base_profile())

    as_user("bob")
    assert client.get("/api/profile").json()["company_name"] != "Alice Corp"
    client.put("/api/profile", json=base_profile(id="bob", company_name="Bob LTDA"))

    as_user("alice")
    assert client.get("/api/profile").json()["company_name"] == "Alice Corp"


def test_creditos_nao_sao_alteraveis_pelo_request(client):
    assert client.put("/api/profile", json=base_profile(credits=999999)).json()["credits"] != 999999


# ---------------------------------------------------------------- sites

def dar_cota(uid="alice", sites=10):
    """Concede a cota pelo caminho do sistema, como a compra faz."""
    asyncio.get_event_loop().run_until_complete(conceder_plano(uid, "Teste", sites))


def test_site_publicado_aparece_na_listagem(client, com_plano):
    com_plano()
    """O HTML so existia no useState: ao sair da tela, sumia."""
    dar_cota()
    assert client.get("/api/sites").json() == []

    site_id = client.post(
        "/api/sites", json={"company": "Padaria Teste", "html": HTML, "template": "Moderno"}
    ).json()["id"]

    listagem = client.get("/api/sites").json()
    assert len(listagem) == 1
    assert listagem[0]["company"] == "Padaria Teste"
    # a listagem nao deve carregar a pagina inteira de cada site
    assert not listagem[0].get("html")
    assert client.get(f"/api/sites/{site_id}").json()["html"] == HTML


def test_site_vazio_e_rejeitado(client, com_plano):
    com_plano()
    dar_cota()
    assert client.post("/api/sites", json={"company": "X", "html": "   "}).status_code == 400


def test_sites_sao_isolados_por_usuario(client, as_user, com_plano):
    com_plano()
    dar_cota("alice")
    dar_cota("bob")
    site_id = client.post("/api/sites", json={"company": "Padaria", "html": HTML}).json()["id"]

    as_user("bob")
    assert client.get("/api/sites").json() == []
    assert client.get(f"/api/sites/{site_id}").status_code == 404
    assert client.delete(f"/api/sites/{site_id}").status_code == 404

    as_user("alice")
    assert len(client.get("/api/sites").json()) == 1
    assert client.delete(f"/api/sites/{site_id}").status_code == 200
    assert client.get("/api/sites").json() == []



def test_editar_site_nao_gasta_outra_vaga_da_cota(client, com_plano):
    """Publicar de novo criava um duplicado e cobrava mais uma vaga."""
    com_plano()
    dar_cota(sites=2)

    site = client.post(
        "/api/sites",
        json={"company": "Padaria", "html": HTML, "template": "Vitrine",
              "builder_data": '{"empresa":"Padaria"}'},
    ).json()

    novo_html = HTML.replace("</body>", "<p>editado</p></body>")
    atualizado = client.post(
        "/api/sites",
        json={"site_id": site["id"], "company": "Padaria Nova", "html": novo_html,
              "template": "Vitrine", "builder_data": '{"empresa":"Padaria Nova"}'},
    )
    assert atualizado.status_code == 200
    assert atualizado.json()["id"] == site["id"]

    listagem = client.get("/api/sites").json()
    assert len(listagem) == 1, "editar nao pode criar um segundo site"

    guardado = client.get(f"/api/sites/{site['id']}").json()
    assert guardado["html"] == novo_html
    assert guardado["company"] == "Padaria Nova"
    assert guardado["builder_data"] == '{"empresa":"Padaria Nova"}'
    assert guardado["updated_at"]

    # a vaga nao foi consumida de novo
    assert client.get("/api/sites/quota").json()["usados"] == 1


def test_editar_site_de_outro_usuario_da_404(client, as_user, com_plano):
    com_plano()
    com_plano(uid="bob")
    dar_cota("alice")
    dar_cota("bob")
    site_id = client.post("/api/sites", json={"company": "Padaria", "html": HTML}).json()["id"]

    as_user("bob")
    resposta = client.post(
        "/api/sites", json={"site_id": site_id, "company": "Roubado", "html": HTML}
    )
    assert resposta.status_code == 404
    assert client.get("/api/sites").json() == []

    as_user("alice")
    assert client.get(f"/api/sites/{site_id}").json()["company"] == "Padaria"


def test_editar_site_inexistente_nao_cria_registro(client, com_plano):
    com_plano()
    dar_cota()
    assert client.post(
        "/api/sites", json={"site_id": "site_naoexiste", "company": "X", "html": HTML}
    ).status_code == 404
    assert client.get("/api/sites").json() == []


def test_edicao_tambem_recusa_site_vazio(client, com_plano):
    com_plano()
    dar_cota()
    site_id = client.post("/api/sites", json={"company": "P", "html": HTML}).json()["id"]
    assert client.post(
        "/api/sites", json={"site_id": site_id, "company": "P", "html": "  "}
    ).status_code == 400
    assert client.get(f"/api/sites/{site_id}").json()["html"] == HTML



# ------------------------------------------------------------- identidade

def test_usuario_novo_nao_herda_a_identidade_do_dono(client):
    """Os defaults do perfil eram os dados reais do dono do sistema."""
    perfil = client.get("/api/profile").json()

    proibidos = ("Rômulo", "romulo@leadsage.ai", "LeadSage Corp",
                 "Saúde & Farmacêutica", "unsplash")
    texto = " ".join(str(v) for v in perfil.values())
    for proibido in proibidos:
        assert proibido not in texto, f"perfil novo ainda traz {proibido!r}"

    assert perfil["company_name"] == ""
    assert perfil["niche_focus"] == ""
    assert perfil["product_description"] == ""


def test_perfil_novo_e_semeado_pelo_login(client):
    """Nome, e-mail e foto vem do token, nao de um default inventado."""
    perfil = client.get("/api/profile").json()
    assert perfil["email"] == "alice@example.com"


def test_nome_do_plano_vem_da_tabela_de_precos(client, com_plano):
    """Ficava gravado como "Pro Builder", um plano que nao existe."""
    assert client.get("/api/profile").json()["plan"] == "Prévia Gratuita"

    com_plano("start")
    assert client.get("/api/profile").json()["plan"] == "Start Vitalício"


def test_usuario_nao_consegue_gravar_o_nome_do_plano(client):
    """plan e SYSTEM_FIELD: escrever nele daria um plano de mentira."""
    client.put("/api/profile", json={"name": "Ana", "plan": "Agência Vitalício"})
    perfil = client.get("/api/profile").json()
    assert perfil["name"] == "Ana"
    assert perfil["plan"] == "Prévia Gratuita"


def test_o_que_o_usuario_escreve_vence_o_login(client):
    """Semear nao pode sobrescrever o que a pessoa digitou."""
    client.put("/api/profile", json={"name": "Ana Prospecta", "email": "ana@studio.com.br"})
    perfil = client.get("/api/profile").json()
    assert perfil["name"] == "Ana Prospecta"
    assert perfil["email"] == "ana@studio.com.br"


# ------------------------------------------------------------ historico

@pytest.mark.skipif(
    not os.getenv("GOOGLE_MAPS_API_KEY") or os.getenv("LEADSAGE_TESTES_REAIS") != "1",
    reason=(
        "chama a Places API de verdade e consome a cota diaria paga; "
        "rode com LEADSAGE_TESTES_REAIS=1 quando quiser exercitar isso"
    ),
)
def test_historico_pode_ser_excluido_e_e_isolado(client, as_user):
    """O botao de excluir busca nao tinha onClick nem rota."""
    body = {"niche": "Padarias", "location": "Botucatu, SP, Brazil", "limit": 3}
    search_id = client.post("/api/search-leads", json=body).json()["search_id"]
    assert len(client.get("/api/history").json()) == 1

    as_user("bob")
    assert client.get("/api/history").json() == []
    assert client.delete(f"/api/history/{search_id}").status_code == 404

    as_user("alice")
    assert client.delete(f"/api/history/{search_id}").status_code == 200
    assert client.get("/api/history").json() == []
    assert client.delete(f"/api/history/{search_id}").status_code == 404
