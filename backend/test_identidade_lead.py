from app import identidade_lead as il

SITE = """<html><head><meta property="og:site_name" content="Sorriso Pleno"><meta property="og:image" content="/img/fachada.jpg">
<meta property="og:description" content="Clínica odontológica em Salvador"><meta name="theme-color" content="#0a7d5a">
<link rel="apple-touch-icon" sizes="180x180" href="/logo-180.png"></head><body>
<img src="/img/sala.jpg" width="900"><img src="/pixel.gif" width="1"><img src="/icon-x.png"></body></html>"""

IG = """<meta property="og:title" content="Sorriso Pleno (@sorrisopleno) • Instagram photos and videos">
<meta property="og:image" content="https://scontent.cdninstagram.com/perfil.jpg">
<meta property="og:description" content="2,345 Followers, 120 Following, 310 Posts - Sorriso Pleno (@sorrisopleno) on Instagram: &quot;Cuidamos do seu sorriso&quot;">"""


def test_site_traz_logo_cor_e_fotos():
    r = il.ler_site(SITE, "https://sorrisopleno.com.br/")
    assert r["logo"] == "https://sorrisopleno.com.br/logo-180.png"
    assert r["cor"] == "#0a7d5a"
    assert "https://sorrisopleno.com.br/img/fachada.jpg" in r["imagens"]
    assert not any("pixel" in u or "icon-" in u for u in r["imagens"])


def test_cor_sem_matiz_nao_e_de_marca():
    assert il._cor_valida("#ffffff") == "" and il._cor_valida("#111") == ""
    assert il._cor_valida("#0af") == "#00aaff"


def test_instagram_perfil_publico():
    r = il.ler_instagram(IG, "https://www.instagram.com/sorrisopleno/")
    assert r["instagram_usuario"] == "sorrisopleno"
    assert r["seguidores"] == 2345 and r["publicacoes"] == 310
    assert r["instagram_bio"] == "Cuidamos do seu sorriso"
    assert r["foto_perfil"].startswith("https://")


def test_numero_abreviado():
    assert il._numero("12.5K") == 12500
    assert il._numero("1,2M") == 1_200_000
