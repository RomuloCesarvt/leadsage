from app import raio_x

SITE = {"pixel_meta": False, "credito_agencia": ""}


def bd(posts, seguidores=5000, **kw):
    from datetime import datetime, timedelta, timezone
    agora = datetime(2026, 11, 12, tzinfo=timezone.utc)
    media = [{"timestamp": (agora - timedelta(days=d)).strftime("%Y-%m-%dT%H:%M:%S+0000"), "like_count": likes, "comments_count": 2, "media_type": t}
             for d, likes, t in posts]
    base = {"username": "padoka", "name": "Padoka", "biography": "Pães", "followers_count": seguidores, "follows_count": 100, "media_count": 300, "website": "", "media": {"data": media}}
    base.update(kw)
    return raio_x.atividade_instagram(base, agora)


def test_metricas_novas_do_instagram():
    i = bd([(2, 100, "IMAGE"), (9, 50, "VIDEO"), (20, 80, "CAROUSEL_ALBUM"), (200, 10, "IMAGE")])
    assert i["posts_90_dias"] == 3 and i["dias_desde_ultimo_post"] == 2 and i["ultimo_post_em"] == "2026-11-10"
    assert i["taxa_engajamento"] is not None and i["reels_pct"] == 25 and i["formatos"]["video"] == 1
    assert i["link"].endswith("/padoka") and i["bio"] == "Pães"


def test_precisa_de_social_media_quando_parado():
    i = bd([(120, 20, "IMAGE"), (150, 30, "IMAGE")])
    r = raio_x.leitura_social(i, SITE, "own")
    assert r["status"] == "precisa" and "Precisa" in r["rotulo"] and any("parado" in m for m in r["motivos"])
    assert any("bio não tem link" in o.lower() for o in r["oportunidades"])


def test_ja_tem_alguem_cuidando_com_ritmo_e_anuncio():
    posts = [(d, 120, "VIDEO" if d % 2 else "IMAGE") for d in range(1, 85, 6)]    # ~14 posts em 90 dias
    r = raio_x.leitura_social(bd(posts), {"pixel_meta": True, "credito_agencia": ""}, "own")
    assert r["status"] == "agencia" and r["anuncios"] is True


def test_irregular_no_meio_termo():
    posts = [(d, 90, "IMAGE") for d in (3, 14, 25, 33, 50, 61, 80)]
    assert raio_x.leitura_social(bd(posts), SITE, "own")["status"] == "irregular"


def test_sem_instagram_nao_chuta():
    r = raio_x.leitura_social({"disponivel": False, "usuario": "padoka", "link": "https://instagram.com/padoka", "motivo": "conecte seu Instagram em Robô → Canais para ver seguidores"}, SITE, "own")
    assert r["status"] == "sem_dados" and r["link"].endswith("padoka") and "conecte" in r["resumo"].lower()


def test_cache_antigo_ganha_a_leitura_sem_refazer():
    antigo = {"instagram": {"disponivel": False, "motivo": "nenhum Instagram encontrado"}, "site": {"tipo": "none"}}
    assert raio_x.completar(antigo)["social"]["status"] == "sem_dados"
    pronto = {"social": {"status": "ativo"}}
    assert raio_x.completar(pronto)["social"]["status"] == "ativo"
