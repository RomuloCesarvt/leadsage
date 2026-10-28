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


# ---------------------------------------------------------------- a tela fala direto com QUEM atende o número
def test_concessao_guarda_o_endereco_de_quem_atende_e_o_perde_ao_vencer_ou_devolver(client, rodar):
    assert rodar(worker_lease.tomar, UID, "render-1", 120, 1000.0, "https://leadsage-nuvem.onrender.com/")["ok"] is True
    assert rodar(worker_lease.endereco_de_quem_atende, UID, 1010.0) == "https://leadsage-nuvem.onrender.com"     # sem a barra final
    # outro serviço tenta e é recusado: o endereço continua o de quem tem
    rodar(worker_lease.tomar, UID, "hf-1", 120, 1020.0, "https://usuario-reserva.hf.space")
    assert rodar(worker_lease.endereco_de_quem_atende, UID, 1030.0) == "https://leadsage-nuvem.onrender.com"
    # o dono some: vencida a concessão, ninguém atende e o endereço some junto
    assert rodar(worker_lease.endereco_de_quem_atende, UID, 1200.0) == ""
    # o reserva assume e passa a ser o endereço
    assert rodar(worker_lease.tomar, UID, "hf-1", 120, 1201.0, "https://usuario-reserva.hf.space")["ok"] is True
    assert rodar(worker_lease.endereco_de_quem_atende, UID, 1202.0) == "https://usuario-reserva.hf.space"
    # devolvida na saída normal: sem endereço
    assert rodar(worker_lease.liberar, UID, "hf-1", 1203.0) is True
    assert rodar(worker_lease.endereco_de_quem_atende, UID, 1204.0) == ""


def test_endereco_invalido_nao_e_guardado(client, rodar):
    for ruim in ("http://inseguro.example.com", "javascript:alert(1)", "https://tem espaco.com", "", "   "):
        assert worker_lease.endereco_valido(ruim) == ""
    assert worker_lease.endereco_valido("https://ok.example.com//") == "https://ok.example.com"
    rodar(worker_lease.tomar, UID, "x-servico", 120, 2000.0, "http://inseguro.example.com")
    assert rodar(worker_lease.endereco_de_quem_atende, UID, 2001.0) == ""


def test_acesso_do_navegador_usa_o_endereco_de_quem_atende(client, com_plano, monkeypatch, rodar):
    from app import robo_store
    com_plano("agencia")

    async def canal(uid):
        return {"nuvem_chave": "x"}

    monkeypatch.setattr(robo_store, "canal_do_usuario", canal)
    monkeypatch.setattr(settings, "WORKER_SECRET", SEGREDO)
    monkeypatch.setattr(settings, "NUVEM_URL", "https://leadsage-nuvem.onrender.com")
    assert client.get("/api/robo/whats/acesso").json()["url"] == "https://leadsage-nuvem.onrender.com"        # ninguém com a concessão: o padrão
    rodar(worker_lease.tomar, "alice", "hf-1", 300, 0.0, "https://usuario-reserva.hf.space")
    assert client.get("/api/robo/whats/acesso").json()["url"] == "https://usuario-reserva.hf.space"            # o reserva atende: a tela vai nele


def test_aviso_de_suspensao_nao_aparece_se_outro_servico_atende(client, com_plano, monkeypatch, rodar):
    from app import nuvem_saude, robo_store
    com_plano("agencia")
    visao = robo_store.visao_publica
    monkeypatch.setattr(robo_store, "visao_publica", lambda c, u: {**visao(c, u), "nuvem": True, "conector_online": False})
    chamadas = []

    async def suspenso():
        chamadas.append(1)
        return True

    monkeypatch.setattr(nuvem_saude, "suspenso", suspenso)
    assert client.get("/api/robo/config").json()["nuvem_suspensa"] is True and chamadas                         # ninguém atende: confere o principal
    chamadas.clear()
    rodar(worker_lease.tomar, "alice", "hf-1", 300, 0.0, "https://usuario-reserva.hf.space")
    assert client.get("/api/robo/config").json()["nuvem_suspensa"] is False and not chamadas                     # o reserva atende: nuvem funcionando
