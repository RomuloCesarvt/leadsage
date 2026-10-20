"""A secretária pede o link para mostrar à doutora: o link vai na hora, e depois o robô tenta marcar com a responsável.

O erro real: o robô respondeu "quando a Dra. estiver disponível posso enviar a prévia... qual o melhor horário para enviar?",
segurando o link, e a conversa esfriou.
"""
import pytest

from app.ai_robo import decidir, pediu_o_link

ABORDAGEM = "Oi! Aqui é o Rômulo. Vi a clínica da Dra. Angela no Google e montei uma prévia de site. Posso te mandar?"
HIST = [{"de": "robo", "texto": ABORDAGEM},
        {"de": "contato", "texto": "Oi, sou a Marcelly, secretária. Pode mandar o link que eu mostro para a doutora"}]
LEAD = {"id": "L1", "company": "Clínica Dra. Angela", "niche": "Clínica"}

RESPOSTA_ERRADA = {"mensagens": ["Entendi, Marcelly. Quando a Dra. Angela estiver disponível, posso enviar a prévia do site para ela avaliar. Qual seria o melhor horário para enviar?"],
                   "etapa": "abertura", "dados": {"nome": "Marcelly"}}
RESPOSTA_CERTA = {"mensagens": ["Perfeito, Marcelly! Aqui está a prévia: [LINK_DA_PREVIA]",
                                "Obrigado pela ajuda! A Dra. Angela teria um horário para uma conversa rápida de 15 minutos?"],
                  "enviar_previa": True, "etapa": "abertura", "dados": {"nome": "Marcelly", "decisor": "Dra. Angela"}}


@pytest.mark.parametrize("texto", [
    "Pode mandar o link que eu mostro para a doutora",
    "Me manda aí que eu repasso pra ela",
    "envia o link por favor",
    "Pode enviar o site, eu encaminho para o Dr.",
    "manda a prévia que eu vejo",
])
def test_pedidos_de_link_sao_reconhecidos(texto):
    assert pediu_o_link(texto)


@pytest.mark.parametrize("texto", ["não tenho interesse", "quanto custa?", "Boa tarde", "pode ligar amanhã", "meu marido cria sites", "ok", ""])
def test_outras_falas_nao_sao_pedido_de_link(texto):
    assert not pediu_o_link(texto)


def test_modelo_que_segura_o_link_e_corrigido_e_o_link_sai():
    prompts = []
    respostas = [RESPOSTA_ERRADA, RESPOSTA_CERTA]

    def gerar(p):
        prompts.append(p)
        return respostas.pop(0)

    d = decidir(HIST, "whatsapp", {}, {"ativo": True}, LEAD, gerar)
    assert len(prompts) == 2 and "NÃO mandou" in prompts[1] and "Não pergunte horário para ENVIAR" in prompts[1]
    assert d.criar_previa is True and "[LINK_DA_PREVIA]" in d.mensagens[0]
    assert "15 minutos" in d.mensagens[1]
    assert not d.passar_para_humano or "conferência" not in d.motivo


def test_modelo_teimoso_cai_na_mensagem_segura_com_link_e_tentativa_de_agendar():
    d = decidir(HIST, "whatsapp", {}, {"ativo": True}, LEAD, lambda p: RESPOSTA_ERRADA)
    assert d.criar_previa is True
    assert "[LINK_DA_PREVIA]" in d.mensagens[0] and d.mensagens[0].startswith("Perfeito, Marcelly")
    assert "15 minutinhos" in d.mensagens[1] and "horário" in d.mensagens[1]


def test_com_previa_ja_criada_o_link_de_verdade_vai_na_mensagem():
    url = "https://leadsageofc.vercel.app/s/clinica-dra-angela-abc123"
    d = decidir(HIST, "whatsapp", {}, {"ativo": True}, {**LEAD, "site_publicado": url}, lambda p: RESPOSTA_ERRADA)
    assert url in d.mensagens[0] and d.criar_previa is False


def test_modelo_que_ja_mandou_o_link_nao_e_corrigido():
    prompts = []

    def gerar(p):
        prompts.append(p)
        return RESPOSTA_CERTA

    d = decidir(HIST, "whatsapp", {}, {"ativo": True}, LEAD, gerar)
    assert len(prompts) == 1 and d.criar_previa is True


def test_se_o_link_ja_foi_mandado_antes_nao_forca_de_novo():
    hist = [{"de": "robo", "texto": ABORDAGEM}, {"de": "contato", "texto": "pode mandar"},
            {"de": "robo", "texto": "Aqui está: https://leadsageofc.vercel.app/s/clinica-1"},
            {"de": "contato", "texto": "Pode mandar de novo o link? Quero mostrar para a doutora"}]
    prompts = []

    def gerar(p):
        prompts.append(p)
        return {"mensagens": ["Claro! É o mesmo: https://leadsageofc.vercel.app/s/clinica-1"], "etapa": "abertura"}

    decidir(hist, "whatsapp", {}, {"ativo": True}, {**LEAD, "site_publicado": "https://leadsageofc.vercel.app/s/clinica-1"}, gerar)
    assert len(prompts) == 1


def test_o_prompt_ensina_a_tratar_a_secretaria_como_aliada():
    from app.ai_sdr import montar_prompt
    p = montar_prompt(HIST, "whatsapp", {}, {"ativo": True}, LEAD)
    assert "SECRETÁRIA, RECEPÇÃO OU ASSISTENTE" in p and "ALIADA" in p and "nunca pergunte" in p.lower().replace("e nunca", "nunca")
