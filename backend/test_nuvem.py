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
