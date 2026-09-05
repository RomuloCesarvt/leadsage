"""O site publicado precisa existir para quem esta fora.

Antes nao existia: o site so era legivel pelo dono, logado, ou baixado
como .html para mandar anexo. Mas a venda inteira depende de o dono da
padaria abrir o link no celular e ver a propria loja no ar. Anexo nao faz
isso.

A rota e aberta de proposito. O que a protege e o apelido: nome legivel
mais um sufixo aleatorio, entao nao da para digitar /s/padaria-central e
ler a proposta visual montada para outra pessoa.
"""
import pytest

from app.sites_store import apelido

HTML = "<!DOCTYPE html><html><body><h1>Padaria Antiga Jacarandá</h1></body></html>"


def publicar(client, com_plano, empresa="Padaria Antiga Jacarandá"):
    com_plano()
    return client.post(
        "/api/sites", json={"company": empresa, "html": HTML, "template": "Vitrine"}
    ).json()


# --------------------------------------------------------------- apelido

def test_apelido_e_legivel_e_sem_acento():
    a = apelido("Padaria Antiga Jacarandá")
    assert a.startswith("padaria-antiga-jacaranda-")
    assert a.replace("-", "").isalnum() and a.islower()


def test_apelido_nao_se_repete():
    """Dois clientes com o mesmo nome nao podem colidir de link."""
    assert apelido("Padaria Central") != apelido("Padaria Central")


def test_apelido_tem_sufixo_que_nao_se_adivinha():
    sufixo = apelido("Padaria Central").rsplit("-", 1)[1]
    assert len(sufixo) == 8


@pytest.mark.parametrize("empresa", ["", "   ", "!!!", "日本語"])
def test_nome_impossivel_ainda_gera_apelido(empresa):
    a = apelido(empresa)
    assert a and not a.startswith("-") and not a.endswith("-")


def test_apelido_nao_fica_gigante():
    a = apelido("A" * 300)
    assert len(a) <= 49


# ------------------------------------------------------------ rota aberta

def test_link_publico_serve_o_site_sem_login(client, com_plano):
    site = publicar(client, com_plano)
    assert site["slug"]

    resposta = client.get(f"/s/{site['slug']}")
    assert resposta.status_code == 200
    assert resposta.text == HTML
    assert "text/html" in resposta.headers["content-type"]


def test_link_publico_fica_fora_do_google(client, com_plano):
    """E amostra de venda, nao o site definitivo do cliente."""
    site = publicar(client, com_plano)
    cabecalho = client.get(f"/s/{site['slug']}").headers
    assert "noindex" in cabecalho.get("x-robots-tag", "")


def test_link_publico_nao_vaza_nada_alem_do_html(client, com_plano):
    """So o HTML: nem dono, nem lead de origem, nem data."""
    site = publicar(client, com_plano)
    corpo = client.get(f"/s/{site['slug']}").text
    for vazamento in ("alice", site["id"], "lead_id", "created_at", "builder_data"):
        assert vazamento not in corpo


def test_apelido_inexistente_da_404(client):
    assert client.get("/s/padaria-que-nao-existe-00000000").status_code == 404


def test_apelido_vazio_nao_derruba(client):
    assert client.get("/s/").status_code in (404, 405)


def test_o_caminho_sob_api_tambem_serve(client, com_plano):
    """A Vercel encaminha /api/*; /s/* precisa de rota propria no
    vercel.json. Manter os dois evita link morto se a rota sumir."""
    site = publicar(client, com_plano)
    assert client.get(f"/api/s/{site['slug']}").status_code == 200


# ------------------------------------------------------- ciclo de vida

def test_editar_mantem_o_mesmo_link(client, com_plano):
    """Trocar o link a cada ajuste quebraria o que ja foi enviado."""
    site = publicar(client, com_plano)
    novo = HTML.replace("</body>", "<p>editado</p></body>")
    atualizado = client.post(
        "/api/sites", json={"site_id": site["id"], "company": "Padaria", "html": novo}
    ).json()

    assert atualizado["slug"] == site["slug"]
    assert client.get(f"/s/{site['slug']}").text == novo


def test_apagar_o_site_mata_o_link(client, com_plano):
    """Link vivo apontando para site apagado e pior que link quebrado."""
    site = publicar(client, com_plano)
    assert client.get(f"/s/{site['slug']}").status_code == 200

    client.delete(f"/api/sites/{site['id']}")
    assert client.get(f"/s/{site['slug']}").status_code == 404


def test_site_antigo_ganha_link_ao_listar(client, com_plano):
    """Quem ja tinha sites nao pode precisar refazer para ter link."""
    site = publicar(client, com_plano)

    # Simula um site de antes desta funcionalidade. Direto no sqlite3, e
    # nao por AsyncSessionLocal: o engine fica preso ao loop que o
    # TestClient ja esta usando, e run_until_complete estoura ali.
    import sqlite3
    from conftest import TEST_DB

    con = sqlite3.connect(TEST_DB)
    try:
        con.execute("UPDATE sites SET slug = NULL WHERE id = ?", (site["id"],))
        con.commit()
    finally:
        con.close()

    listagem = client.get("/api/sites").json()
    assert listagem[0]["slug"], "site antigo continuou sem link"
    assert client.get(f"/s/{listagem[0]['slug']}").status_code == 200
