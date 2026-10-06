"""Cobertura do banco de imagens sobre o catalogo de nichos da busca.

Medido: 755 dos 1.053 nichos (72%) caiam em fotos genericas — um site de
cardiologista saia com foto de loja. Este teste trava a cobertura e a
precisao dos casos que ja deram errado.

`nichos_catalogo.json` e exportado de frontend/src/lib/nichos.ts
(npx tsx scripts/exportar-nichos.ts) para o teste enxergar o mesmo catalogo
que a tela mostra.
"""
import json
import os

import pytest

from app.banco_imagens import TERMOS_GENERICOS, termos_para

AQUI = os.path.dirname(os.path.abspath(__file__))
CATALOGO = json.load(open(os.path.join(AQUI, "nichos_catalogo.json"), encoding="utf-8"))


def generico(nicho: str) -> bool:
    return termos_para(nicho)[-len(TERMOS_GENERICOS):] == TERMOS_GENERICOS


def test_catalogo_tem_mais_de_mil_nichos():
    assert len(CATALOGO) >= 1000


def test_todo_nicho_do_catalogo_tem_foto_do_ramo():
    sem = [n for n in CATALOGO if generico(n)]
    assert sem == [], f"{len(sem)} nichos caem em foto generica: {sem[:20]}"


@pytest.mark.parametrize("nicho,esperado", [
    ("Padarias", "bakery"), ("Dentistas", "dentist"), ("Clínicas odontológicas", "dentist"), ("Cardiologistas", "cardiologist"),
    ("Pediatras", "pediatrician"), ("Hospitais", "hospital"), ("Bares", "bar"), ("Advogados", "business meeting"),
    ("Contadores", "accounting"), ("Barbearias", "barber"), ("Clínicas de estética", "spa"), ("Academias", "gym"),
    ("Oficinas mecânicas", "car mechanic"), ("Hotéis", "hotel room"), ("Pousadas", "hotel room"), ("Agropecuárias", "farm field"),
    ("Pizzarias", "pizza"), ("Pet shops", "dog grooming"), ("Eletricistas", "electrician"), ("Marcenarias", "carpentry"),
])
def test_ramo_certo_recebe_a_foto_certa(nicho, esperado):
    assert esperado in termos_para(nicho), termos_para(nicho)


def test_palavra_no_meio_nao_casa():
    # "pet" nao pode casar com "carpete"; "spa" nao pode casar com "espaco"
    assert "dog grooming" not in termos_para("Carpete e tapetes")
    assert "spa" not in termos_para("Espaço de convivência")


def test_ramo_desconhecido_cai_no_generico_com_o_proprio_texto():
    t = termos_para("Zzqx Wkplm")
    assert t[-len(TERMOS_GENERICOS):] == TERMOS_GENERICOS and "zzqx wkplm" in t[0]
    assert termos_para("")[-len(TERMOS_GENERICOS):] == TERMOS_GENERICOS
