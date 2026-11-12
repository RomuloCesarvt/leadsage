import asyncio

from app import robo_cota, robo_service, robo_store

ARM = {}


def _prep(monkeypatch, creditos=0):
    ARM.clear()
    async def get(k): return ARM.get(k)
    async def put(k, uid, tipo, d): ARM[k] = dict(d)
    monkeypatch.setattr(robo_store, "_sql_get", get)
    monkeypatch.setattr(robo_store, "_sql_put", put)
    gastos = []
    async def deduz(uid, n, email=None):
        gastos.append(n)
        return creditos - n if creditos >= n else None
    monkeypatch.setattr(robo_service, "check_and_deduct_credits", deduz)
    return gastos


def test_plano_com_robo_paga_pela_cota_do_mes_e_nao_gasta_credito(monkeypatch):
    gastos = _prep(monkeypatch, creditos=0)                 # carteira zerada, como a da conta de teste
    assert asyncio.run(robo_service._cobrar_resposta("u~empresa", "a@b.com", "m_escala")) is True
    assert gastos == [] and asyncio.run(robo_cota.usadas("u~empresa")) == 1


def test_sem_plano_com_cota_cobra_credito_como_antes(monkeypatch):
    gastos = _prep(monkeypatch, creditos=5)
    assert asyncio.run(robo_service._cobrar_resposta("u", "a@b.com", "start")) == 4
    assert gastos == [1]
    gastos.clear()
    _prep(monkeypatch, creditos=0)
    assert asyncio.run(robo_service._cobrar_resposta("u", "a@b.com", "start")) is None


def test_cota_do_mes_acaba_e_cai_para_credito(monkeypatch):
    gastos = _prep(monkeypatch, creditos=3)
    ARM[f"robo_uso:u:{robo_cota.mes()}"] = {"usadas": 150}
    assert asyncio.run(robo_service._cobrar_resposta("u", "a@b.com", "m_essencial_robo")) == 2
    assert gastos == [1]


def test_cota_zera_no_mes_seguinte(monkeypatch):
    _prep(monkeypatch)
    ARM["robo_uso:u:2020-01"] = {"usadas": 9999}
    assert asyncio.run(robo_cota.tentar_cota("u", "m_escala")) is True
