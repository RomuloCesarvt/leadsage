from app import ai_client, ai_providers


def _limpa(monkeypatch):
    for k in list(__import__("os").environ):
        if k.endswith("_API_KEY") or "_API_KEY_" in k or k.endswith("_MODEL"):
            monkeypatch.delenv(k, raising=False)


def test_varias_contas_do_mesmo_provedor_viram_alvos_separados(monkeypatch):
    _limpa(monkeypatch)
    monkeypatch.setenv("GROQ_API_KEY", "a")
    monkeypatch.setenv("GROQ_API_KEY_2", "b")
    monkeypatch.setenv("XAI_API_KEY", "c")
    ativos = ai_providers.ativos()
    assert [p["nome"] for p in ativos] == ["groq", "groq2", "xai"]
    assert [p["tipo"] for p in ativos] == ["groq", "groq", "xai"]
    assert ai_providers._chave(ativos[1]) == "b"            # a segunda conta usa a segunda chave


def test_modelo_forcado_vale_para_todas_as_contas_do_provedor(monkeypatch):
    _limpa(monkeypatch)
    monkeypatch.setenv("GROQ_API_KEY_2", "b")
    monkeypatch.setenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    monkeypatch.setattr(ai_providers, "modelos_do_provedor", lambda p, c=None: ["llama-3.3-70b-versatile"])
    p = ai_providers.ativos()[0]
    assert p["nome"] == "groq2" and ai_providers.modelos_alvo(p) == ["llama-3.3-70b-versatile"]


def test_sem_chave_nenhum_provedor(monkeypatch):
    _limpa(monkeypatch)
    assert ai_providers.ativos() == []


def test_outra_conta_do_gemini_entra_como_alvos_proprios(monkeypatch):
    _limpa(monkeypatch)
    monkeypatch.setenv("GEMINI_API_KEY_2", "k2")
    monkeypatch.setattr(ai_client, "build_client", lambda chave, *a, **k: ("cliente", chave))
    chaves = [a.chave for a in ai_client._alvos(("cliente", "k1"), "oi", None, False)]
    gem1 = [c for c in chaves if c.startswith("gemini:")]
    gem2 = [c for c in chaves if c.startswith("gemini2:")]
    assert gem1 and len(gem2) == len(gem1)
