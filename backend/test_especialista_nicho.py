"""O especialista do nicho: uma ficha por ramo, escrita pela IA uma vez, guardada e usada no site, na abordagem e na conversa."""
import asyncio

import pytest

from app import especialista_nicho as en
from app import nicho_guia

FICHA_GASTRO = {
    "especialidade": "Gastroenterologia", "segmento": "saude", "o_que_faz": "Cuida do sistema digestivo.", "publico": "paciente",
    "servicos_tipicos": ["Endoscopia", "Colonoscopia", "Refluxo e azia", "Intestino irritável", "Doenças do fígado", "Check-up digestivo"],
    "como_o_cliente_decide": "Confiança, convênio e facilidade de agendar.", "dores": ["Agenda vazia"], "objecoes": ["Já tenho Instagram"],
    "o_que_o_site_precisa": ["Convênios aceitos", "Exames realizados"], "acao_principal": "Agendar consulta",
    "titulos_de_secao": {"servicos": "Exames e tratamentos", "chamada_final": "Vamos agendar a sua consulta?"},
    "tom": "sereno e técnico", "etica": "CFM: sem promessa de cura.", "nunca_dizer": ["sorriso", "barato"],
}


@pytest.fixture(autouse=True)
def _limpa():
    en._MEMORIA.clear()
    en._FALHOU.clear()
    yield
    en._MEMORIA.clear()
    en._FALHOU.clear()


def _rodar(c):
    return asyncio.new_event_loop().run_until_complete(c)


def test_chave_junta_singular_e_plural_e_tira_acento():
    assert en.chave("Gastroenterologistas") == en.chave("gastroenterologista") == "gastroenterologista"
    assert en.chave("Clínicas de Vacinação") == "clinica-de-vacinacao"


def test_ficha_incompleta_ou_de_segmento_inventado_e_corrigida_ou_recusada():
    assert en.limpar({"especialidade": "X", "servicos_tipicos": ["a"]}, "x") is None           # poucos servicos: nao serve
    f = en.limpar({**FICHA_GASTRO, "segmento": "banana"}, "Gastro")
    assert f["segmento"] == "generico" and f["servicos_tipicos"][0] == "Endoscopia"


def test_ficha_e_escrita_uma_vez_guardada_e_reaproveitada(client, monkeypatch):
    chamadas = []

    async def gerar(nicho):
        chamadas.append(nicho)
        return en.limpar(FICHA_GASTRO, nicho)

    monkeypatch.setattr(en, "_gerar", gerar)
    f = _rodar(en.garantir("Gastroenterologistas"))
    assert f["especialidade"] == "Gastroenterologia" and chamadas == ["Gastroenterologistas"]
    en._MEMORIA.clear()                                              # outro processo (outra funcao da Vercel): le do banco
    assert _rodar(en.garantir("gastroenterologista"))["servicos_tipicos"][1] == "Colonoscopia"
    assert chamadas == ["Gastroenterologistas"]                      # nao chamou a IA de novo


def test_ia_fora_nao_quebra_e_nao_tenta_de_novo_na_hora(client, monkeypatch):
    chamadas = []

    async def quebra(nicho):
        chamadas.append(1)
        raise RuntimeError("429")

    monkeypatch.setattr(en, "_gerar", quebra)
    assert _rodar(en.garantir("Serralherias")) is None
    assert _rodar(en.garantir("Serralherias")) is None and len(chamadas) == 1


def test_guia_do_robo_traz_a_ficha_do_ramo_exato():
    en._MEMORIA[en.chave("Gastroenterologistas")] = en.limpar(FICHA_GASTRO, "Gastroenterologistas")
    b = nicho_guia.bloco("Gastroenterologistas")
    assert "Gastroenterologia" in b and "Colonoscopia" in b and "NUNCA use neste ramo: sorriso" in b and "CFM" in b
    assert "não está no guia" not in b


def test_texto_do_site_usa_a_ficha_e_proibe_texto_de_outro_ramo(client, monkeypatch):
    from app import ai_site

    async def ficha(nicho):
        return en.limpar(FICHA_GASTRO, nicho)

    visto = {}

    def falso(client, prompt, obrigatorias=None, tentativas=2, prazo=None, rapido=False, max_tokens=None):
        visto["prompt"] = prompt
        return {"slogan": "Seu intestino em boas mãos", "sobre": "x", "servicos": [{"titulo": "Endoscopia", "descricao": "y"}]}

    monkeypatch.setattr(en, "garantir", ficha)
    monkeypatch.setattr(ai_site, "gerar_json", falso)
    monkeypatch.setattr(ai_site, "build_client", lambda *a, **k: object())
    r = _rodar(ai_site.gerar_conteudo_de_site({"company": "Consultório Dra. Angela", "niche": "Gastroenterologistas"}, "k"))
    assert "ESPECIALISTA NESTE RAMO: Gastroenterologia" in visto["prompt"] and "erro grave" in visto["prompt"]
    assert r["segmento"] == "saude" and r["rotulos"]["servicos"] == "Exames e tratamentos" and r["especialidade"] == "Gastroenterologia"
