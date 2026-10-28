"""O aviso do WhatsApp na nuvem diz a verdade: serviço suspenso pelo Render (cota mensal) é diferente de "demorou para responder"."""
import asyncio

import httpx
import pytest

from app import nuvem_saude
from test_robo import com_robo  # noqa: F401

PAGINA = "<html><title>Service Suspended</title><body>This service has been suspended by its owner.</body></html>"


@pytest.fixture(autouse=True)
def limpo():
    nuvem_saude._GUARDADO.update(em=0.0, suspenso=0.0)
    yield
    nuvem_saude._GUARDADO.update(em=0.0, suspenso=0.0)


def test_pagina_de_servico_suspenso_e_reconhecida():
    assert nuvem_saude.parece_suspenso(503, PAGINA)
    assert not nuvem_saude.parece_suspenso(503, "Bad gateway")             # 503 comum: o serviço está acordando ou caiu
    assert not nuvem_saude.parece_suspenso(200, PAGINA)
    assert not nuvem_saude.parece_suspenso(503, "")


def _cliente_falso(monkeypatch, status=None, corpo="", erro=None):
    chamadas = []

    class C:
        def __init__(self, *a, **k): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *a): return False
        async def get(self, url):
            chamadas.append(url)
            if erro:
                raise erro
            return httpx.Response(status, text=corpo)

    monkeypatch.setattr(nuvem_saude.httpx, "AsyncClient", C)
    return chamadas


def test_suspenso_e_guardado_por_um_minuto(monkeypatch):
    chamadas = _cliente_falso(monkeypatch, 503, PAGINA)
    assert asyncio.get_event_loop_policy().new_event_loop().run_until_complete(nuvem_saude.suspenso()) is True
    assert asyncio.get_event_loop_policy().new_event_loop().run_until_complete(nuvem_saude.suspenso()) is True
    assert len(chamadas) == 1


def test_servico_de_pe_nao_e_suspenso(monkeypatch):
    _cliente_falso(monkeypatch, 200, "ok")
    assert asyncio.get_event_loop_policy().new_event_loop().run_until_complete(nuvem_saude.suspenso()) is False


def test_falha_de_rede_nunca_vira_suspenso(monkeypatch):
    _cliente_falso(monkeypatch, erro=httpx.ConnectTimeout("lento"))
    assert asyncio.get_event_loop_policy().new_event_loop().run_until_complete(nuvem_saude.suspenso()) is False


def test_config_avisa_a_tela_quando_a_nuvem_esta_suspensa(client, com_robo, monkeypatch):
    from app import robo_store

    visao_base = robo_store.visao_publica
    monkeypatch.setattr(robo_store, "visao_publica", lambda c, u: {**visao_base(c, u), "nuvem": True, "conector_online": False})

    async def suspenso():
        return True
    monkeypatch.setattr(nuvem_saude, "suspenso", suspenso)
    assert client.get("/api/robo/config").json()["nuvem_suspensa"] is True

    async def de_pe():
        return False
    monkeypatch.setattr(nuvem_saude, "suspenso", de_pe)
    assert client.get("/api/robo/config").json()["nuvem_suspensa"] is False
    # conectado e respondendo: nem confere o serviço
    monkeypatch.setattr(robo_store, "visao_publica", lambda c, u: {**visao_base(c, u), "nuvem": True, "conector_online": True})
    assert "nuvem_suspensa" not in client.get("/api/robo/config").json()
