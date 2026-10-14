"""Firestore com cota de leitura estourada mas escrita ainda aceita: o que e gravado precisa poder ser lido (QR code, chave da nuvem)."""
import asyncio

import pytest

from app import espelho_whatsapp, robo_store


class _Doc:
    def __init__(self, guardado, chave):
        self.guardado, self.chave = guardado, chave

    def set(self, dados, merge=False):
        atual = self.guardado.get(self.chave, {}) if merge else {}
        self.guardado[self.chave] = {**atual, **dados}

    def update(self, dados):
        pass

    def get(self):
        raise RuntimeError("429 Quota exceeded: leitura bloqueada")

    def collection(self, nome):
        return _Colecao(self.guardado, f"{self.chave}/{nome}")


class _Colecao:
    def __init__(self, guardado, caminho):
        self.guardado, self.caminho = guardado, caminho

    def document(self, nome):
        return _Doc(self.guardado, f"{self.caminho}/{nome}")


class FirestoreSoEscreve:
    """Escreve normalmente; toda leitura levanta o erro de cota."""

    def __init__(self):
        self.guardado = {}

    def collection(self, nome):
        return _Colecao(self.guardado, nome)


@pytest.fixture(autouse=True)
def _sem_marca_de_falha():
    """O erro de leitura marca "Firestore falhou agora" no processo todo; limpa para nao contaminar os outros testes."""
    robo_store._FALHA[0] = 0.0
    robo_store._CANAIS.clear()
    yield
    robo_store._FALHA[0] = 0.0
    robo_store._CANAIS.clear()


def _rodar(coro):
    return asyncio.new_event_loop().run_until_complete(coro)


def test_estado_do_qr_gravado_com_leitura_bloqueada_ainda_e_lido(client, monkeypatch):
    fs = FirestoreSoEscreve()
    monkeypatch.setattr(espelho_whatsapp, "firestore_db", fs)
    monkeypatch.setattr(robo_store, "firestore_db", fs)

    async def fluxo():
        await espelho_whatsapp.salvar_estado("u1", "qr", qr="data:image/png;base64,AAAA", numero="")
        return await espelho_whatsapp.ler_estado("u1")

    estado = _rodar(fluxo())
    assert estado["fase"] == "qr" and estado["qr"].startswith("data:image")
    assert fs.guardado  # a escrita tambem foi para o Firestore


def test_chave_da_nuvem_gravada_com_leitura_bloqueada_e_achada(client, monkeypatch):
    fs = FirestoreSoEscreve()
    monkeypatch.setattr(robo_store, "firestore_db", fs)

    async def fluxo():
        canal = await robo_store.salvar_canal("u1", "u1@x.com", {"ativo": True})
        canal["nuvem_chave"] = "chave-secreta"
        canal = await robo_store.substituir_canal("u1", canal)
        await robo_store.registrar_nuvem("u1", canal["gancho"])
        lista = await robo_store.listar_nuvem()
        achado = await robo_store.canal_por_gancho(canal["gancho"])
        return lista, achado, canal["gancho"]

    lista, achado, gancho = _rodar(fluxo())
    assert lista == {"u1": gancho}
    assert achado and achado["nuvem_chave"] == "chave-secreta"


def test_saida_da_nuvem_marcada_com_leitura_bloqueada_e_lida(client, monkeypatch):
    fs = FirestoreSoEscreve()
    monkeypatch.setattr(robo_store, "firestore_db", fs)

    async def fluxo():
        await robo_store.marcar_nuvem_sair("u1")
        return await robo_store.listar_nuvem_sair()

    assert _rodar(fluxo()) == ["u1"]


def test_fluxo_completo_do_qr_com_firestore_sem_leitura(client, monkeypatch):
    """O caminho inteiro: Conectar pela nuvem -> o servico da nuvem pede a lista -> manda o QR -> a tela mostra o QR."""
    from app import bancos, main
    from app.config import settings
    from test_robo import com_robo  # noqa: F401

    segredo = "segredo-da-nuvem-1234567890"
    fs = FirestoreSoEscreve()
    monkeypatch.setattr(settings, "WORKER_SECRET", segredo)
    for modulo in (robo_store, espelho_whatsapp):
        monkeypatch.setattr(modulo, "firestore_db", fs)
    monkeypatch.setattr(bancos.CONJUNTO, "tem_postgres", lambda: True)
    main._SESSOES_NUVEM.clear()
    main._CACHE_CONECTOR.clear()

    # o plano do robo precisa estar concedido (igual aos outros testes de nuvem)
    from app import payments
    monkeypatch.setattr(main, "exigir_recurso", _sempre_libera)

    r = client.post("/api/robo/nuvem/ligar")
    assert r.status_code == 200, r.text
    lista = client.get("/api/worker/sessoes", headers={"x-worker-secret": segredo})
    assert lista.status_code == 200
    sessoes = lista.json()["sessoes"]
    assert [s["uid"] for s in sessoes] == ["alice"]
    chave = sessoes[0]["chave"]
    ping = client.post("/api/conector/ping", headers={"x-conector-key": chave},
                       json={"fase": "qr", "qr": "data:image/png;base64,AAAA", "status": "qr"})
    assert ping.status_code == 200, ping.text
    estado = client.get("/api/robo/whats/estado").json()
    assert estado["conectado"] is True and estado["fase"] == "qr" and estado["qr"].startswith("data:image/png")


async def _sempre_libera(*a, **k):
    return None
