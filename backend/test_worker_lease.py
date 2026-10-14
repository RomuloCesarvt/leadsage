"""Concessao do WhatsApp: so um servico da nuvem atende cada numero; se ele some, outro assume."""
import pytest

from app import worker_lease
from app.config import settings
from test_robo import rodar  # noqa: F401

SEGREDO = "segredo-da-nuvem-1234567890"
UID = "u" * 28


def test_so_um_servico_por_usuario_e_o_outro_assume_quando_vence(client, rodar):
    a = rodar(worker_lease.tomar, UID, "render-1", 120, 1000.0)
    assert a["ok"] is True
    b = rodar(worker_lease.tomar, UID, "outro-host", 120, 1010.0)
    assert b["ok"] is False and b["holder"] == "render-1" and b["ate_s"] == 110
    # o dono renova: continua dele
    assert rodar(worker_lease.tomar, UID, "render-1", 120, 1050.0)["ok"] is True
    assert rodar(worker_lease.tomar, UID, "outro-host", 120, 1100.0)["ok"] is False
    # o dono some (nao renova): passado o prazo, o outro assume
    assert rodar(worker_lease.tomar, UID, "outro-host", 120, 1171.0)["ok"] is True
    assert rodar(worker_lease.tomar, UID, "render-1", 120, 1180.0)["ok"] is False


def test_quem_desliga_devolve_e_o_outro_assume_na_hora(client, rodar):
    assert rodar(worker_lease.tomar, UID, "render-1", 120, 1000.0)["ok"] is True
    assert rodar(worker_lease.liberar, UID, "outro-host", 1001.0) is False   # quem nao tem nao devolve
    assert rodar(worker_lease.liberar, UID, "render-1", 1002.0) is True
    assert rodar(worker_lease.tomar, UID, "outro-host", 120, 1003.0)["ok"] is True


def test_rotas_exigem_o_segredo_do_servico(client, monkeypatch):
    monkeypatch.setattr(settings, "WORKER_SECRET", SEGREDO)
    corpo = {"quem": "render-1", "ttl_s": 120}
    assert client.post(f"/api/worker/lease/{UID}", json=corpo).status_code == 401
    ok = client.post(f"/api/worker/lease/{UID}", json=corpo, headers={"x-worker-secret": SEGREDO})
    assert ok.status_code == 200 and ok.json()["ok"] is True
    recusa = client.post(f"/api/worker/lease/{UID}", json={"quem": "outro-host", "ttl_s": 120}, headers={"x-worker-secret": SEGREDO})
    assert recusa.json()["ok"] is False and recusa.json()["holder"] == "render-1"
    assert client.post(f"/api/worker/lease/{UID}/liberar", json=corpo, headers={"x-worker-secret": SEGREDO}).json()["ok"] is True
    assert client.post(f"/api/worker/lease/{UID}", json={"quem": "outro-host", "ttl_s": 120}, headers={"x-worker-secret": SEGREDO}).json()["ok"] is True
