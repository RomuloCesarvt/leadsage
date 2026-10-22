"""Varredura de todos os ramos: o conteúdo do site e as fotos contam a mesma história, e os erros já achados não voltam."""
import shutil
import sys
from pathlib import Path

import pytest

from app.banco_imagens import perfil_para

sys.path.insert(0, str(Path(__file__).parent / "scripts"))

# ramo -> o que as fotos NÃO podem ser / o que TÊM que ser (casos que já deram errado de verdade)
FOTOS_CERTAS = {
    "Cirurgiões plásticos": ("doctor|clinic", "factory"),
    "Estúdios de yoga": ("yoga", "art studio"),
    "Estúdios de dança": ("dance|ballet", "art studio"),
    "Estúdios de tatuagem": ("tattoo", "art studio"),
    "Cooperativas de táxi": ("car|taxi|parking|tow", "church|community"),
    "Cooperativas de transporte": ("truck|logistics", "church|community"),
    "Cooperativas de leite": ("farm|tractor|cattle", "church|community"),
    "Relações públicas": ("creative|marketing|laptop", "pub|beer"),
    "Engenheiros agrônomos": ("farm|tractor|agricultur", "construction"),
    "Advogados previdenciários": ("business|office|contract", "financial advisor|insurance"),
    "Dedetização de condomínios": ("pest", "apartment"),
    "Lojas maçônicas": ("community|church|people", "gaming"),
    "Cursos técnicos": ("student|classroom|course", "repair"),
    "Escolas de fotografia": ("photograph", "music lesson|guitar"),
    "Cursos de gastronomia": ("cook|chef|culinary", "doctor|stethoscope"),
    "Artistas plásticos": ("art|paint|handmade", "doctor|clinic"),
    "Clínicas de podologia": ("massage|therapy|wellness", "doctor consultation|stethoscope"),
    "Casas de câmbio": ("money|bank|financial", "auto parts|engine"),
    "Fábricas de gelo": ("factory|production", "ice cream"),
    "Despachantes de veículos": ("document|notary|paperwork", "tow truck"),
}


@pytest.mark.parametrize("ramo", sorted(FOTOS_CERTAS))
def test_fotos_do_ramo_combinam_com_o_ramo(ramo):
    import re
    deve, nao_deve = FOTOS_CERTAS[ramo]
    junto = " ".join(perfil_para(ramo)["termos"]).lower()
    assert re.search(deve, junto), f"{ramo}: fotos {junto!r} não têm {deve!r}"
    assert not re.search(nao_deve, junto), f"{ramo}: fotos {junto!r} têm {nao_deve!r}"


@pytest.mark.skipif(not shutil.which("npx"), reason="precisa do node para ler o conteúdo dos ramos do frontend")
def test_nenhum_ramo_do_catalogo_tem_foto_fora_do_assunto():
    import auditar_ramos
    linhas = auditar_ramos.auditar()
    erros = [f"{l['ramo']} [{l['conteudo']}] fotos: {', '.join(l['termos'])}" for l in linhas
             if {"foto_fora_do_assunto", "foto_medica_em_ramo_nao_medico"} & set(l["achados"])]
    assert not erros, "ramos com foto fora do assunto:\n" + "\n".join(erros)
    # o genérico é a exceção, não a regra: antes da varredura quase metade do catálogo caía nele
    genericos = [l for l in linhas if l["conteudo"] == "generico"]
    assert len(genericos) <= 0.06 * len(linhas), f"{len(genericos)} ramos sem conteúdo próprio"
