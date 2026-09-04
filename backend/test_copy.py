"""Testes do conhecimento de mercado que alimenta a IA.

O prompt antigo mandava "seja um consultor" e "nao seja generico". Isso
nao ensina nada ao modelo, e o resultado era sempre a mesma carta. Aqui
se verifica que cada nicho leva ao prompt o que um vendedor experiente
sabe daquele mercado.

Rodar:  cd backend && python -m pytest test_copy.py -v
"""
import pytest

from app.copy_knowledge import (
    CLICHES, CONHECIMENTO, bloco_de_mercado, conhecimento_do_nicho,
    lista_de_cliches, regras_do_canal,
)


@pytest.mark.parametrize("nicho,esperado", [
    ("Padarias", "padaria"),
    ("Panificadora", "padaria"),
    ("Clínicas Odontológicas", "odontologia"),
    ("Dentista", "odontologia"),
    ("Clínicas Médicas", "clinica"),
    ("Advogados", "advocacia"),
    ("Mecânicas", "mecanica"),
    ("Pet Shops", "petshop"),
    ("Barbearias", "barbearia"),
    ("Academias", "academia"),
])
def test_reconhece_o_mercado_pelo_nicho(nicho, esperado):
    assert conhecimento_do_nicho(nicho) == CONHECIMENTO[esperado]


def test_usa_o_tipo_do_google_quando_o_nicho_nao_basta():
    """O nicho vem do que o usuario digitou; o `role` vem do Google e as
    vezes e mais preciso."""
    assert conhecimento_do_nicho("Algo Vago", "Padaria") == CONHECIMENTO["padaria"]


def test_mercado_desconhecido_avisa_em_vez_de_inventar():
    """Contexto errado e pior que contexto nenhum: a IA afirmaria como o
    setor funciona sem base."""
    texto = bloco_de_mercado("Chaveiros")
    assert "Não temos conhecimento consolidado" in texto
    assert "evite afirmar" in texto


def test_bloco_traz_as_quatro_dimensoes():
    texto = bloco_de_mercado("Padarias")
    for pedaco in ("chega:", "perde sem presença digital:", "vale um cliente", "decide a escolha:"):
        assert pedaco in texto


def test_todo_mercado_esta_completo():
    for chave, dados in CONHECIMENTO.items():
        for campo in ("canal", "perda", "ticket", "prova"):
            assert dados.get(campo), f"{chave} sem {campo}"
            assert len(dados[campo]) > 25, f"{chave}.{campo} raso demais"


@pytest.mark.parametrize("canal,maximo", [
    ("email", "130"), ("whatsapp", "60"),
    ("instagram_direct", "45"), ("linkedin_msg", "80"),
])
def test_cada_canal_tem_limite_proprio(canal, maximo):
    """WhatsApp no celular nao comporta o mesmo texto de um e-mail."""
    assert maximo in regras_do_canal(canal)["limite"]


def test_canal_desconhecido_cai_no_email():
    assert regras_do_canal("pombo-correio") == regras_do_canal("email")


def test_cliches_entram_no_prompt_como_proibicao():
    lista = lista_de_cliches()
    for frase in ("espero que esteja bem", "alavancar", "sinergia"):
        assert frase in lista
    assert len(CLICHES) >= 10
