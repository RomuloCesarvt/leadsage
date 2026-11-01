from app import meta_oauth
from app.config import settings


def test_instagram_so_liga_com_app_da_meta(monkeypatch):
    monkeypatch.setattr(settings, "META_APP_ID", "")
    monkeypatch.setattr(settings, "META_APP_SECRET", "")
    monkeypatch.setattr(settings, "META_VERIFY_TOKEN", "")
    assert meta_oauth.disponivel()["instagram"] is False
    assert len(meta_oauth.faltando_configurar()) == 3
    monkeypatch.setattr(settings, "META_APP_ID", "1")
    monkeypatch.setattr(settings, "META_APP_SECRET", "s")
    monkeypatch.setattr(settings, "META_VERIFY_TOKEN", "v")
    assert meta_oauth.disponivel()["instagram"] is True
    assert meta_oauth.faltando_configurar() == []
