"""O modo da conta pela API: trocar de modo não pode apagar o perfil, e só vale entre os modos que a conta tem."""


def test_conta_nova_escolhe_empresa_e_nao_perde_o_perfil(client):
    r = client.put("/api/profile", json={"name": "Carlos", "company_name": "Frio Total", "services": ["Sites"]})
    assert r.status_code == 200
    r = client.put("/api/profile", json={"modo": "empresa"})                 # só o modo, como o seletor manda
    assert r.status_code == 200, r.text
    j = client.get("/api/profile").json()
    assert j["modo"] == "empresa" and j["modos"] == ["empresa"]
    assert j["name"] == "Carlos" and j["company_name"] == "Frio Total"       # o perfil continua inteiro
    assert j["services"] == ["Sites"] and j["preferred_channel"] == "WhatsApp"


def test_conta_sem_o_outro_modo_nao_consegue_troca_lo(client):
    client.put("/api/profile", json={"modo": "agencia"})
    client.put("/api/profile", json={"modo": "empresa"})                     # não comprou: ignorado
    j = client.get("/api/profile").json()
    assert j["modo"] == "agencia" and j["modos"] == ["agencia"]


def test_acesso_total_troca_livremente(client, monkeypatch):
    from app.config import settings
    monkeypatch.setattr(type(settings), "ilimitados_emails", property(lambda self: {"alice@example.com"}))
    client.put("/api/profile", json={"modo": "empresa"})
    j = client.get("/api/profile").json()
    assert j["modo"] == "empresa" and j["modos"] == ["agencia", "empresa"]
    client.put("/api/profile", json={"modo": "agencia"})
    assert client.get("/api/profile").json()["modo"] == "agencia"


def test_usuario_nao_se_concede_modos(client):
    client.put("/api/profile", json={"modo": "agencia", "modos": ["agencia", "empresa"]})
    assert client.get("/api/profile").json()["modos"] == ["agencia"]


def test_modo_pega_mesmo_com_o_firestore_recusando_a_gravacao(client, monkeypatch):
    """Cota do Firestore estourada: a gravação lá falha e a leitura ainda traz o perfil antigo de lá. O modo tem de valer mesmo assim."""
    import app.profile_store as ps

    class DocAntigo:
        exists = True
        def to_dict(self): return {"profile": {"name": "Carlos", "company_name": "Frio Total"}}

    class Doc:
        def get(self): return DocAntigo()
        def set(self, *a, **k): raise RuntimeError("429 quota exceeded")

    class Colecao:
        def document(self, _): return Doc()

    class Fs:
        def collection(self, _): return Colecao()

    monkeypatch.setattr(ps, "firestore_db", Fs())
    from app.config import settings
    monkeypatch.setattr(type(settings), "ilimitados_emails", property(lambda self: {"alice@example.com"}))
    r = client.put("/api/profile", json={"modo": "empresa"})
    assert r.status_code == 200 and r.json()["modo"] == "empresa"
    assert client.get("/api/profile").json()["modo"] == "empresa"
