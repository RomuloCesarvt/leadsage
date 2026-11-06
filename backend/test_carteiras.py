from app import credit_system as cs
from app.espaco import do_modo


def test_cada_modo_tem_a_sua_carteira_e_so_a_agencia_nasce_com_teste():
    assert do_modo("u1", "agencia") == "u1" and do_modo("u1", "empresa") == "u1~empresa"
    assert cs.saldo_inicial("u1") == cs.SALDO_INICIAL == 10
    assert cs.saldo_inicial("u1~empresa") == 0


def test_admin_tem_saldo_ilimitado_nos_dois_modos(monkeypatch):
    import asyncio
    monkeypatch.setattr(cs.settings, "ILIMITADOS_EXTRAS", "rohcesar401@gmail.com")
    for carteira in ("u1", "u1~empresa"):
        assert asyncio.run(cs.get_user_balance(carteira, "rohcesar401@gmail.com"))["credits"] == cs.UNLIMITED
