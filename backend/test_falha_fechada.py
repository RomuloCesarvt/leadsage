"""Sem banco de creditos, o sistema recusa em vez de liberar.

Isto existia ao contrario: `if db is None: return 9999`, comentado como
"fallback para dev local". Mas e o mesmo codigo que roda na Vercel. Uma
credencial errada num deploy, ou uma instabilidade do Firestore, e todo
visitante passava a buscar leads sem limite — na conta paga do Google
Places, sem nada no painel indicando isso.

Falhar fechado custa uma busca recusada. Falhar aberto custa a fatura.
"""
import pytest

from app.config import settings
from app.credit_system import (
    BancoDeCreditosIndisponivel,
    check_and_deduct_credits,
    get_user_balance,
    add_credits,
    is_admin,
)


@pytest.fixture
def sem_declaracao(monkeypatch):
    """Simula producao: sem Firestore e sem a variavel de escape."""
    monkeypatch.setattr(settings, "CREDITO_SEM_BANCO", False)


@pytest.mark.asyncio
async def test_sem_banco_nao_libera_busca(sem_declaracao):
    with pytest.raises(BancoDeCreditosIndisponivel):
        await check_and_deduct_credits("qualquer", 10, "pessoa@exemplo.com")


@pytest.mark.asyncio
async def test_sem_banco_nao_inventa_saldo(sem_declaracao):
    with pytest.raises(BancoDeCreditosIndisponivel):
        await get_user_balance("qualquer", "pessoa@exemplo.com")


@pytest.mark.asyncio
async def test_sem_banco_nao_concede_recarga(sem_declaracao):
    """Conceder credito sem onde gravar sumiria no reload seguinte."""
    with pytest.raises(BancoDeCreditosIndisponivel):
        await add_credits("qualquer", 500)


@pytest.mark.asyncio
async def test_a_mensagem_nao_expoe_a_infraestrutura(sem_declaracao):
    """O cliente le isto na tela; nao precisa saber o nome do banco."""
    with pytest.raises(BancoDeCreditosIndisponivel) as erro:
        await get_user_balance("qualquer", "pessoa@exemplo.com")
    texto = str(erro.value).lower()
    assert "firestore" not in texto and "firebase" not in texto
    assert "indisponível" in texto


@pytest.mark.asyncio
async def test_admin_passa_mesmo_sem_banco(sem_declaracao, monkeypatch):
    """O dono do sistema nao pode ficar de fora quando o banco cai."""
    monkeypatch.setattr(settings, "ADMIN_EMAILS", "dono@leadsage.com.br")
    assert is_admin("dono@leadsage.com.br")
    assert await check_and_deduct_credits("dono", 10, "dono@leadsage.com.br") == 9999


@pytest.mark.asyncio
async def test_dev_local_continua_funcionando():
    """Com a variavel declarada (o conftest declara), libera como antes."""
    assert settings.CREDITO_SEM_BANCO is True
    assert await check_and_deduct_credits("alice", 10, "alice@example.com") == 9999
    assert (await get_user_balance("alice", "alice@example.com"))["credits"] == 9999


@pytest.mark.asyncio
async def test_a_rota_devolve_503_e_nao_um_saldo(client, monkeypatch):
    """Na tela, 503 com texto claro — nunca um saldo inventado."""
    monkeypatch.setattr(settings, "CREDITO_SEM_BANCO", False)
    resposta = client.get("/api/credits/balance")
    assert resposta.status_code == 503
    assert "indisponível" in resposta.json()["detail"].lower()


def test_a_raiz_mostra_se_o_armazenamento_subiu(client):
    """O Firestore falhava em silencio: so uma linha de log denunciava."""
    corpo = client.get("/").json()
    assert corpo["armazenamento"] in ("firestore", "indisponivel")
    # a rota e publica: nao pode vazar credencial nem nome de projeto
    texto = str(corpo).lower()
    for segredo in ("key", "secret", "token", "credential"):
        assert segredo not in texto
