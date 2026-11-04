"""Modos da conta (agência/empresa): quais a conta pode usar. Rodar: cd backend && python -m pytest -q test_modos.py"""
from app import profile_store as p


def test_acesso_total_tem_os_dois():
    assert p.modos_permitidos([], "", True) == ["agencia", "empresa"]


def test_conta_antiga_sem_modo_e_agencia():
    assert p.modos_permitidos([], "", False) == ["agencia"]


def test_conta_com_modo_escolhido_so_tem_ele():
    assert p.modos_permitidos([], "empresa", False) == ["empresa"]
    assert p.modos_permitidos(["empresa"], "empresa", False) == ["empresa"]


def test_comprou_os_dois():
    assert p.modos_permitidos(["agencia", "empresa"], "agencia", False) == ["agencia", "empresa"]


def test_valor_estranho_e_ignorado():
    assert p.modos_permitidos(["admin", "x"], "", False) == ["agencia"]


def test_salvar_perfil_sem_modo_nao_apaga_o_modo():
    assert "modo" not in p._clean({"name": "A", "modo": ""})
    assert p._clean({"modo": "empresa"}) == {"modo": "empresa"}
    assert "modos" not in p._clean({"modos": ["agencia", "empresa"]})         # o usuário não concede modos a si mesmo
    assert p._clean({"modos": ["empresa"]}, sistema=True) == {"modos": ["empresa"]}
