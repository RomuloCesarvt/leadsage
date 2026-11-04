"""Visitas e retornos do modo empresa. Rodar: cd backend && python -m pytest -q test_servico_local.py"""
from app import servico_local as s


def test_mais_meses_respeita_fim_de_mes():
    assert s.mais_meses("2026-08-31", 6) == "2027-02-28"
    assert s.mais_meses("2026-11-04", 6) == "2027-05-04"
    assert s.mais_meses("2026-10-15", 3) == "2027-01-15"


def test_visita_normaliza_e_so_vira_retorno_quando_realizada():
    v = s.normalizar({"cliente": "Ana", "telefone": "(14) 99999-0000", "data": "2026-11-10", "hora": "9:30", "servico": "Limpeza de 2 splits", "status": "lixo"})
    assert v["hora"] == "09:30" and v["telefone"] == "14999990000" and v["status"] == "agendada" and not v["retorno_em"]
    r = s.normalizar({"status": "realizada"}, v)
    assert r["realizada_em"] == "2026-11-10" and r["retorno_em"] == "2027-05-10" and not r["retorno_avisado"]
    assert s.normalizar({"status": "cancelada"}, v)["retorno_em"] == ""


def test_data_invalida_e_descartada():
    assert s.normalizar({"cliente": "x", "data": "31/02/2026"})["data"] == ""


def test_retornos_aparecem_na_antecedencia_e_somem_quando_avisados():
    r = s.normalizar({"status": "realizada"}, s.normalizar({"cliente": "Ana", "data": "2026-11-10"}))
    assert s.retornos_do_dia([r], "2027-05-05") == [r]       # faltam 5 dias
    assert s.retornos_do_dia([r], "2027-04-01") == []        # ainda longe
    assert s.retornos_do_dia([{**r, "retorno_avisado": True}], "2027-05-05") == []
    agendada = s.normalizar({"cliente": "Bia", "data": "2026-11-10"})
    assert s.retornos_do_dia([agendada], "2027-05-05") == []


def test_mensagem_de_retorno_sem_preco_nem_promessa():
    r = s.normalizar({"status": "realizada"}, s.normalizar({"cliente": "Ana Souza", "data": "2026-11-10", "servico": "limpeza de 2 splits"}))
    m = s.mensagem_de_retorno(r, "Frio Total")
    assert m.startswith("Oi, Ana!") and "Frio Total" in m and "10/11/2026" in m and "R$" not in m
