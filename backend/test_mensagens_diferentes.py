"""Cada mensagem do lote precisa ser diferente das outras: copia vira pedido de nova versao, sem a mesma abertura."""
import pytest

from app import fila_envio
from test_robo import rodar  # noqa: F401

IGUAL = "Oi, Ana! Sou a Júlia da Sites Já. Achei a clínica no Google, nota 4,9, mas não encontrei o site. Criei uma prévia para apresentar. Posso te enviar o link?"
OUTRA = "Boa tarde! A Clínica Aurora tem 120 avaliações incríveis no Google e ainda não tem site, então montei uma prévia pensando em vocês. Quer ver por aqui?"


def test_semelhanca_mede_trechos_em_comum():
    assert fila_envio.semelhanca(IGUAL, IGUAL) == 1.0
    assert fila_envio.semelhanca(IGUAL, OUTRA) < fila_envio.LIMIAR_DE_SEMELHANCA
    assert fila_envio.semelhanca("", IGUAL) == 0.0


def test_copia_do_lote_pede_nova_versao_sem_a_mesma_abertura(rodar):
    chamadas = []

    async def gerar(lead, canal, evitar=None, variacao=0):
        chamadas.append((evitar, variacao))
        return {"body": OUTRA}

    novo = rodar(fila_envio._diferenciar, gerar, {"id": "L2"}, "whatsapp", {"body": IGUAL + " Obrigada!"}, [IGUAL])
    assert novo["body"] == OUTRA
    assert chamadas and chamadas[0][1] == 1 and chamadas[0][0][0].startswith("Oi, Ana! Sou a Júlia")


def test_mensagem_diferente_nao_gasta_outra_chamada_de_ia(rodar):
    async def gerar(lead, canal, evitar=None, variacao=0):
        raise AssertionError("nao deveria chamar")

    pronto = {"body": OUTRA}
    assert rodar(fila_envio._diferenciar, gerar, {"id": "L2"}, "whatsapp", pronto, [IGUAL]) is pronto


def test_gerador_antigo_sem_evitar_continua_funcionando(rodar):
    async def gerar_antigo(lead, canal):
        return {"body": OUTRA}

    novo = rodar(fila_envio._diferenciar, gerar_antigo, {"id": "L2"}, "whatsapp", {"body": IGUAL}, [IGUAL])
    assert novo["body"] == OUTRA


def test_se_a_nova_versao_nao_melhora_fica_a_primeira(rodar):
    async def gerar(lead, canal, evitar=None, variacao=0):
        return {"body": IGUAL}   # igualzinha: nao melhorou

    primeira = {"body": IGUAL + " Valeu!"}
    assert rodar(fila_envio._diferenciar, gerar, {"id": "L2"}, "whatsapp", primeira, [IGUAL]) is primeira


def test_mesma_abertura_conta_como_copia_mesmo_com_o_resto_diferente(rodar):
    chamadas = []

    async def gerar(lead, canal, evitar=None, variacao=0):
        chamadas.append(evitar)
        return {"body": "Oi, tudo bem? A Padaria Estrela tem nota 4,8 e achei sem site. Montei uma prévia, posso mandar?"}

    a = "Boa tarde! Eu sou da LeadSage, ajudo negócios locais a serem encontrados no Google. Vi a Doce Vida com nota 4,6 e sem site."
    b = "Boa tarde! Eu sou da LeadSage, ajudo negócios locais a vender mais. A Bendita Doceria tem 82 avaliações e nenhum site."
    novo = rodar(fila_envio._diferenciar, gerar, {"id": "L2"}, "whatsapp", {"body": b}, [a])
    assert chamadas and novo["body"].startswith("Oi, tudo bem?")


def test_assinatura_da_abertura_ignora_cumprimento_e_nome():
    a = fila_envio.assinatura_da_abertura("Boa tarde! Eu sou João, ajudo negócios locais a serem encontrados no Google.")
    b = fila_envio.assinatura_da_abertura("Boa tarde, Rafa! Eu sou a Júlia, ajudo negócios locais a serem vistos. Vi seu perfil.")
    c = fila_envio.assinatura_da_abertura("Oi! Vi a Padaria Estrela no Google com nota 4,8 e fiquei curioso.")
    assert a == b and a != c
