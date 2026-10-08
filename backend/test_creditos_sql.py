"""Creditos no banco SQL (Supabase) quando o Firestore esta desligado.

O que estes testes travam:

- o primeiro uso nasce com o saldo inicial e cada cobranca baixa e registra historico;
- saldo insuficiente recusa sem tocar no saldo;
- dois pedidos ao mesmo tempo nao gastam o mesmo saldo duas vezes;
- recarga soma; admin por e-mail nao consome.
"""
import asyncio

import pytest

from app import credit_system as cs
from app.config import settings
from test_robo import rodar  # noqa: F401


@pytest.fixture(autouse=True)
def sql_principal(client, monkeypatch):
    monkeypatch.setattr(settings, "FIRESTORE_DESLIGADO", True)
    monkeypatch.setattr(cs, "db", None)


def test_primeiro_uso_nasce_com_saldo_e_cobra(rodar):
    assert rodar(cs.check_and_deduct_credits, "u1", 2) == 48
    saldo = rodar(cs.get_user_balance, "u1")
    assert saldo["credits"] == 48
    assert saldo["history"][0]["amount"] == -2 and saldo["history"][0]["type"] == "debit"


def test_saldo_insuficiente_recusa_sem_mexer(rodar):
    assert rodar(cs.check_and_deduct_credits, "u2", 50) == 0
    assert rodar(cs.check_and_deduct_credits, "u2", 1) is None
    assert rodar(cs.get_user_balance, "u2")["credits"] == 0


def test_recarga_soma_e_registra(rodar):
    assert rodar(cs.add_credits, "u3", 100, "Compra") == 100
    assert rodar(cs.add_credits, "u3", 25, "Compra 2") == 125
    saldo = rodar(cs.get_user_balance, "u3")
    assert saldo["credits"] == 125
    assert {h["description"] for h in saldo["history"]} == {"Compra", "Compra 2"}


def test_dois_pedidos_ao_mesmo_tempo_nao_gastam_o_mesmo_saldo(rodar):
    rodar(cs.add_credits, "u4", 3, "inicio")

    async def corrida():
        return await asyncio.gather(*[cs.check_and_deduct_credits("u4", 1) for _ in range(6)])

    resultados = rodar(corrida)
    assert sum(1 for r in resultados if r is not None) == 3  # so tinha 3
    assert rodar(cs.get_user_balance, "u4")["credits"] == 0


def test_admin_por_email_nao_consome(rodar, monkeypatch):
    monkeypatch.setattr(settings, "ADMIN_EMAILS", "dono@exemplo.com")
    assert rodar(cs.check_and_deduct_credits, "u5", 999, "dono@exemplo.com") == cs.UNLIMITED
    assert rodar(cs.get_user_balance, "u5", "dono@exemplo.com")["is_admin"]
