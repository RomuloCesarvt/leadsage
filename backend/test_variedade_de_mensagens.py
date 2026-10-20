"""Mensagens iguais em todos os números são caminho curto para o spam: cada lead recebe a sua apresentação, pergunta final e jeito de
abrir; a palavra "link" não aparece no primeiro toque; texto para cliente não sai de modelo pequeno."""
import asyncio

import pytest

from app import abordagem_mestra as am
from app import ai_client, ai_providers, fila_envio


def test_dez_mensagens_seguidas_nao_repetem_a_pergunta_final():
    pedidos = [am.sorteio_da_mensagem("mesmo-lead", "criada", n)["pergunta"] for n in range(len(am.PEDIDOS_CRIADA))]
    assert len(set(pedidos)) == len(am.PEDIDOS_CRIADA)
    ofertas = [am.sorteio_da_mensagem("x", "oferecer", n)["pergunta"] for n in range(len(am.PEDIDOS_OFERECER))]
    assert len(set(ofertas)) == len(am.PEDIDOS_OFERECER)


def test_apresentacao_e_o_que_faz_variam_de_um_lote_para_o_outro():
    comuns = [am.quem_sou("Seometria", "", "lead", n) for n in range(30)]
    assert len(set(comuns)) >= 12
    com_nome = {am.quem_sou("", "Rômulo, consultor estratégico da Seometria Marketing Digital", "lead", n).split(" e ")[0] for n in range(10)}
    assert len(com_nome) >= 4                                   # Eu sou / Aqui é / Me chamo / Sou / Meu nome é
    assert all("Rômulo, consultor estratégico da Seometria Marketing Digital" in x for x in com_nome)


def test_a_estrutura_do_whatsapp_muda_entre_leads_seguidos():
    textos = [am.estrutura("Seometria", canal="whatsapp", lead_id="L", variacao=n, previa="criada") for n in range(10)]
    perguntas = {t.split("neste jeito:")[1].split('"')[1] for t in textos}
    assert len(perguntas) == 10
    assert len({t.split("ESTILO DESTA MENSAGEM")[1].split("\n")[0] for t in textos}) >= 8


def test_nenhuma_pergunta_sugerida_usa_a_palavra_link():
    for p in am.PEDIDOS_CRIADA + am.PEDIDOS_OFERECER:
        assert "link" not in p.lower()
    for n in range(12):
        s = am.sorteio_da_mensagem("L", "criada", n)
        assert "link" not in s["pergunta"].replace('NUNCA use a palavra "link"', "").lower()


def test_prévia_a_oferecer_nunca_e_chamada_de_o_que_montei():
    termos = {am.sorteio_da_mensagem("L", "oferecer", n)["termo"] for n in range(30)}
    assert "o que montei" not in termos
    assert "o que montei" in {am.sorteio_da_mensagem("L", "criada", n)["termo"] for n in range(30)}


def test_o_validador_aceita_varias_formas_e_barra_a_palavra_link():
    for pedido in am.PEDIDOS_CRIADA:
        msg = f"Boa tarde, Ana! Aqui é o Rô. Vi sua nota 4,8 no Google e montei uma prévia do site de vocês. Ajudo negócios locais. {pedido[0].upper() + pedido[1:]}"
        assert am.revisar_roteiro(msg, False, "criada") == [], (pedido, am.revisar_roteiro(msg, False, "criada"))
    for pedido in am.PEDIDOS_OFERECER:
        msg = f"Boa tarde, Ana! Não encontrei o site de vocês e queria confirmar se existe. {pedido[0].upper() + pedido[1:]}"
        assert am.revisar_roteiro(msg, True, "oferecer") == [], (pedido, am.revisar_roteiro(msg, True, "oferecer"))
    spam = "Boa tarde! Montei uma prévia do site de vocês, sem compromisso. Posso te enviar o link por aqui?"
    assert any('"link"' in p for p in am.revisar_roteiro(spam, False, "criada"))


# ------------------------------------------------------------------------------------------ o fecho igual no lote

def test_fechamento_e_igual_quando_a_pergunta_final_e_igual():
    a = "Oi, Ana! Vi sua nota 4,8. Posso te enviar a prévia pra você avaliar, sem compromisso?"
    b = "Bom dia, Beto! Sua padaria me chamou atenção. Posso te enviar a prévia pra você avaliar, sem compromisso?"
    c = "Boa tarde, Cris! Gostei das fotos do perfil. Quer dar uma olhada no esboço?"
    assert fila_envio._fechamento(a) == fila_envio._fechamento(b) != fila_envio._fechamento(c)


def test_lote_com_a_mesma_pergunta_final_pede_outra_mensagem():
    usados = ["Oi, Ana! Vi sua nota 4,8. Posso te enviar a prévia pra você avaliar, sem compromisso?"]
    nova_igual = {"body": "Bom dia, Beto! Sua padaria me chamou atenção. Posso te enviar a prévia pra você avaliar, sem compromisso?"}
    outra = {"body": "Bom dia, Beto! Sua padaria me chamou atenção, principalmente as fotos. Quer dar uma olhada no esboço que montei?"}
    chamadas = []

    async def gerar(lead, canal, evitar=None, variacao=0):
        chamadas.append(evitar)
        return outra

    r = asyncio.get_event_loop_policy().new_event_loop().run_until_complete(
        fila_envio._diferenciar(gerar, {"id": "L2"}, "whatsapp", nova_igual, usados))
    assert r["body"] == outra["body"]
    assert any("pergunta final" in e for e in chamadas[0])


# ------------------------------------------------------------------------------------------ qualidade do modelo

def test_texto_para_cliente_nao_usa_modelo_pequeno(monkeypatch):
    monkeypatch.setattr(ai_providers, "ativos", lambda: [{"nome": "groq"}])
    monkeypatch.setattr(ai_providers, "modelos_alvo", lambda p: ["openai/gpt-oss-120b", "llama-3.3-70b-versatile", "openai/gpt-oss-20b", "llama-3.1-8b-instant"])
    com = [a.chave for a in ai_client._alvos(None, "p", 500, True, qualidade=True)]
    sem = [a.chave for a in ai_client._alvos(None, "p", 500, True)]
    assert "groq:openai/gpt-oss-120b" in com and "groq:llama-3.3-70b-versatile" in com
    assert not any(ai_providers.e_pequeno(k.split(":", 1)[1]) for k in com)
    assert any("8b" in k for k in sem) and any("lite" in k for k in sem)         # sem o filtro, tudo continua disponível


@pytest.mark.parametrize("modelo,pequeno", [
    ("llama-3.1-8b-instant", True), ("openai/gpt-oss-20b", True), ("gemini-3.5-flash-lite", True), ("open-mistral-nemo", True),
    ("openai/gpt-oss-120b", False), ("llama-3.3-70b-versatile", False), ("gemini-3.6-flash", False), ("mistral-small-latest", False),
])
def test_quais_modelos_sao_pequenos(modelo, pequeno):
    assert ai_providers.e_pequeno(modelo) is pequeno


# ------------------------------------------------------------------------------------------ pergunta solta no começo (caso real)
CASO_REAL = ("Boa tarde, Renata! Como anda a agenda em Botucatu?\nSou Rômulo, da Seometria, e ajudo negócios locais a serem encontrados no Google.\n"
             "Vi sua nota 5,0, mas notei que não há site no seu perfil.\nCriei uma versão de teste pra mostrar como isso pode ajudar.\n"
             "Quer ver como ficou? Eu te mando agora, sem compromisso.")


def test_pergunta_solta_no_comeco_e_pega_e_removida():
    assert any("pergunta solta" in p for p in am.revisar_calor(CASO_REAL, "whatsapp"))
    limpo = am.tirar_pergunta_solta(CASO_REAL)
    assert "agenda" not in limpo and limpo.startswith("Boa tarde, Renata!")           # a saudação fica
    assert "Quer ver como ficou?" in limpo and "Sou Rômulo" in limpo                    # o resto da mensagem fica
    assert not any("pergunta solta" in p for p in am.revisar_calor(limpo, "whatsapp"))


@pytest.mark.parametrize("frase", ["Como está o movimento?", "E as vendas?", "Como vai a clínica por aí?", "Tudo certo com a agenda?"])
def test_outras_perguntas_soltas_tambem(frase):
    assert "?" not in am.tirar_pergunta_solta(f"Oi, Ana! {frase} Sou o Rô, da X.")


def test_pergunta_final_e_cumprimento_nao_sao_tocados():
    ok = "Boa tarde, Renata! Tudo bem? Sou Rômulo e montei um esboço pra você. Quer dar uma olhada, sem compromisso?"
    assert am.tirar_pergunta_solta(ok) == ok
    assert not any("pergunta solta" in p for p in am.revisar_calor(ok, "whatsapp"))


def test_nenhum_estilo_de_abertura_pede_pergunta_sobre_o_negocio():
    for e in am.ESTILOS_DE_ABERTURA:
        assert "pergunta curta" not in e and "puxa conversa" not in e
    assert "PROIBIDO abrir com pergunta solta" in am.VOZ_HUMANA
