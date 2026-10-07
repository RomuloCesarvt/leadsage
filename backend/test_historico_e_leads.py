"""Limpar o historico de buscas e tirar leads de Meus Leads."""
import pytest

from app import pipeline_store
from app.database import AsyncSessionLocal, DBLead, DBSearchHistory
from test_robo import com_robo, rodar  # noqa: F401


def semear(owner, n=2):
    async def _f():
        async with AsyncSessionLocal() as s:
            for i in range(n):
                sid = f"{owner}-b{i}"
                s.add(DBSearchHistory(id=sid, niche="Padarias", location="Botucatu", total_leads=1,
                                      timestamp="2026-10-07T10:00:00", leads_preview=["x"], owner_uid=owner))
                s.add(DBLead(id=f"{owner}-L{i}", name="Padaria", search_id=sid, owner_uid=owner))
            await s.commit()
    return _f


def test_limpar_historico_apaga_so_o_da_propria_conta(client, com_robo, rodar):
    rodar(semear("alice"))
    rodar(semear("bob"))
    assert len(client.get("/api/history").json()) == 2

    r = client.delete("/api/history")
    assert r.status_code == 200 and r.json()["removidas"] == 2
    assert client.get("/api/history").json() == []

    # o historico do outro usuario continua
    from conftest import CURRENT_UID
    CURRENT_UID["value"] = "bob"
    assert len(client.get("/api/history").json()) == 2


def test_limpar_historico_vazio_nao_quebra(client, com_robo):
    r = client.delete("/api/history")
    assert r.status_code == 200 and r.json()["removidas"] == 0


def test_remover_lead_do_pipeline(client, com_robo, rodar):
    rodar(pipeline_store.registrar, "alice", {"id": "L1", "company": "Padaria A", "phone": "14998003784"})
    rodar(pipeline_store.registrar, "bob", {"id": "L1", "company": "Padaria do Bob", "phone": "14998003785"})
    assert client.delete("/api/pipeline/L1").status_code == 200
    assert rodar(pipeline_store.obter, "alice", "L1") is None
    assert rodar(pipeline_store.obter, "bob", "L1") is not None  # o do outro continua
    assert client.delete("/api/pipeline/L1").status_code == 200  # repetir nao quebra


def test_sincronizar_marca_como_salvo_e_promove_sobra_de_busca(client, com_robo, rodar):
    rodar(pipeline_store.registrar, "alice", {"id": "L9", "company": "Padaria Sobra"}, "", "busca")
    assert rodar(pipeline_store.obter, "alice", "L9")["origem"] == "busca"

    r = client.post("/api/pipeline/sync", json={"leads": [
        {"id": "L9", "company": "Padaria Sobra"}, {"id": "L10", "company": "Padaria Nova"}]})
    assert r.status_code == 200
    assert rodar(pipeline_store.obter, "alice", "L9")["origem"] == "salvo"
    assert rodar(pipeline_store.obter, "alice", "L10")["origem"] == "salvo"
