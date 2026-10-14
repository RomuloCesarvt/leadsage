"""WhatsApp na nuvem: o usuario liga e desliga, o servico da nuvem le a lista de quem deve estar ligado."""
import pytest

from app import robo_store
from app.config import settings
from test_robo import com_robo, rodar  # noqa: F401

SEGREDO = "segredo-da-nuvem-1234567890"


@pytest.fixture
def nuvem(client, com_robo, monkeypatch):
    monkeypatch.setattr(settings, "WORKER_SECRET", SEGREDO)
    from app import main
    main._SESSOES_NUVEM.clear()
    return client


def sessoes(client, segredo=SEGREDO):
    return client.get("/api/worker/sessoes", headers={"x-worker-secret": segredo})


def test_sem_segredo_configurado_a_nuvem_nao_liga(client, com_robo, monkeypatch):
    monkeypatch.setattr(settings, "WORKER_SECRET", "")
    assert client.post("/api/robo/nuvem/ligar").status_code == 409
    assert sessoes(client, "qualquer").status_code == 401


def test_ligar_entra_na_lista_do_servico_com_a_chave_do_usuario(nuvem):
    r = nuvem.post("/api/robo/nuvem/ligar")
    assert r.status_code == 200 and r.json()["nuvem"] is True and r.json()["conector_criado"] is True
    assert "nuvem_chave" not in r.json()                     # a tela nunca ve a chave
    [s] = sessoes(nuvem).json()["sessoes"]
    assert s["uid"] == "alice" and s["chave"].startswith("lsc_")
    # a chave serve nas rotas do Conector, como a de um computador
    assert nuvem.post("/api/conector/ping", headers={"x-conector-key": s["chave"]}, json={"fase": "qr", "status": "qr", "qr": "data:image/png;base64,AAAA"}).status_code == 200
    assert nuvem.get("/api/robo/whats/estado").json()["fase"] == "qr"


def test_ligar_duas_vezes_mantem_a_mesma_chave(nuvem):
    nuvem.post("/api/robo/nuvem/ligar")
    a = sessoes(nuvem).json()["sessoes"][0]["chave"]
    nuvem.post("/api/robo/nuvem/ligar")
    assert sessoes(nuvem).json()["sessoes"][0]["chave"] == a


def test_desligar_tira_da_lista_e_revoga_a_chave(nuvem):
    nuvem.post("/api/robo/nuvem/ligar")
    chave = sessoes(nuvem).json()["sessoes"][0]["chave"]
    r = nuvem.post("/api/robo/nuvem/desligar")
    assert r.json()["nuvem"] is False and r.json()["conector_criado"] is False
    from app import main
    main._SESSOES_NUVEM.clear()
    assert sessoes(nuvem).json()["sessoes"] == []
    assert nuvem.get("/api/conector/tarefas", headers={"x-conector-key": chave}).status_code == 401


def test_so_o_servico_le_a_lista(nuvem):
    nuvem.post("/api/robo/nuvem/ligar")
    assert sessoes(nuvem, "errado").status_code == 401
    assert nuvem.get("/api/worker/sessoes").status_code == 401


def test_gerar_chave_do_computador_tira_a_nuvem(nuvem):
    nuvem.post("/api/robo/nuvem/ligar")
    r = nuvem.post("/api/robo/conector/gerar")
    assert r.json()["nuvem"] is False
    from app import main
    main._SESSOES_NUVEM.clear()
    assert sessoes(nuvem).json()["sessoes"] == []


def test_sessao_guardada_vai_e_volta_e_some_ao_apagar(nuvem):
    h = {"x-worker-secret": SEGREDO}
    assert nuvem.get("/api/worker/auth/alice", headers=h).json() == {"blob": ""}
    assert nuvem.put("/api/worker/auth/alice", headers=h, json={"blob": "Y2lmcmFkbw=="}).status_code == 200
    assert nuvem.get("/api/worker/auth/alice", headers=h).json() == {"blob": "Y2lmcmFkbw=="}
    assert nuvem.delete("/api/worker/auth/alice", headers=h).status_code == 200
    assert nuvem.get("/api/worker/auth/alice", headers=h).json() == {"blob": ""}


def test_sessao_guardada_exige_o_segredo_e_uid_valido(nuvem):
    assert nuvem.get("/api/worker/auth/alice").status_code == 401
    assert nuvem.put("/api/worker/auth/alice", headers={"x-worker-secret": "errado"}, json={"blob": "x"}).status_code == 401
    assert nuvem.get("/api/worker/auth/a%20b", headers={"x-worker-secret": SEGREDO}).status_code in (400, 404)


def test_so_quem_clica_em_desligar_entra_na_lista_de_desconectar(nuvem):
    h = {"x-worker-secret": SEGREDO}
    nuvem.post("/api/robo/nuvem/ligar")
    assert nuvem.get("/api/worker/sessoes", headers=h).json()["desligar"] == []   # ligar nao desconecta ninguem
    nuvem.post("/api/robo/nuvem/desligar")
    from app import main
    main._SESSOES_NUVEM.clear()
    j = nuvem.get("/api/worker/sessoes", headers=h).json()
    assert j["sessoes"] == [] and j["desligar"] == ["alice"]
    assert nuvem.post("/api/worker/desligadas/alice", headers=h).status_code == 200   # o servico confirmou
    assert nuvem.get("/api/worker/sessoes", headers=h).json()["desligar"] == []
    assert nuvem.post("/api/worker/desligadas/alice").status_code == 401


def test_perguntar_por_tarefas_tambem_prova_que_o_conector_esta_vivo(nuvem):
    nuvem.post("/api/robo/nuvem/ligar")
    chave = nuvem.get("/api/worker/sessoes", headers={"x-worker-secret": SEGREDO}).json()["sessoes"][0]["chave"]
    assert nuvem.get("/api/robo/whats/estado").json()["online"] is False
    nuvem.get("/api/conector/tarefas", headers={"x-conector-key": chave})
    assert nuvem.get("/api/robo/whats/estado").json()["online"] is True


def test_historico_das_conversas_vai_e_volta_e_some_com_a_sessao(nuvem):
    h = {"x-worker-secret": SEGREDO}
    assert nuvem.get("/api/worker/historico/alice", headers=h).json() == {"blob": ""}
    assert nuvem.put("/api/worker/historico/alice", headers=h, json={"blob": "Y29udmVyc2Fz"}).status_code == 200
    assert nuvem.get("/api/worker/historico/alice", headers=h).json() == {"blob": "Y29udmVyc2Fz"}
    # a sessao e o historico sao guardados separados
    assert nuvem.get("/api/worker/auth/alice", headers=h).json() == {"blob": ""}
    assert nuvem.get("/api/worker/historico/alice").status_code == 401
    # quem desconecta leva as conversas junto
    nuvem.put("/api/worker/auth/alice", headers=h, json={"blob": "c2Vzc2Fv"})
    assert nuvem.delete("/api/worker/auth/alice", headers=h).status_code == 200
    assert nuvem.get("/api/worker/historico/alice", headers=h).json() == {"blob": ""}


def test_token_do_chat_da_nuvem_confere_com_o_worker():
    import hashlib, hmac
    from app.main import token_do_chat_nuvem
    t = token_do_chat_nuvem("u1", "segredo-de-teste-1234567890", agora_s=1000)
    uid, exp, sig = t.split(".")
    assert uid == "u1" and int(exp) == 1000 + 12 * 3600
    esperado = hmac.new(b"segredo-de-teste-1234567890", f"u1.{exp}".encode(), hashlib.sha256).hexdigest()
    assert sig == esperado


def test_firestore_sem_cota_com_postgres_de_reserva_lista_parcial_e_sem_postgres_recusa(nuvem, monkeypatch):
    from app import bancos, main
    monkeypatch.setattr(robo_store, "firestore_falhou_agora", lambda *a, **k: True)
    monkeypatch.setattr(bancos.CONJUNTO, "tem_postgres", lambda: True)
    main._SESSOES_NUVEM.clear()
    r = sessoes(nuvem)
    assert r.status_code == 200 and r.json()["parcial"] is True  # o servico liga quem aparece e nao para ninguem
    assert "lista" not in main._SESSOES_NUVEM                      # lista parcial nao fica em cache
    monkeypatch.setattr(bancos.CONJUNTO, "tem_postgres", lambda: False)
    assert sessoes(nuvem).status_code == 503                       # sem banco durável, o servico nao mexe em ninguem


def test_ligar_nuvem_com_firestore_sem_cota_funciona_se_ha_postgres_de_reserva(nuvem, monkeypatch):
    from app import bancos
    monkeypatch.setattr(robo_store, "firestore_falhou_agora", lambda *a, **k: True)
    monkeypatch.setattr(bancos.CONJUNTO, "tem_postgres", lambda: True)
    assert nuvem.post("/api/robo/nuvem/ligar").status_code == 200
    monkeypatch.setattr(bancos.CONJUNTO, "tem_postgres", lambda: False)
    assert nuvem.post("/api/robo/nuvem/ligar").status_code in (200, 503)
