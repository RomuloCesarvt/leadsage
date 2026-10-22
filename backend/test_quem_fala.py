"""O robô lê quem escreveu e de quem a pessoa falou: se a recepção avisa que a doutora entrou em licença, a resposta vai para a recepção."""
from app import ai_sdr, quem_fala
from app.ai_robo import decidir

AVISO = "Boa tarde, a Ana Teresa entrou em licença maternidade, não atende mais aqui!"
ABORDAGEM = "Boa tarde! Sou o Rômulo. Vi o Espaço Luminis no Google e montei uma prévia do site da Dra. Ana Teresa, sem compromisso. Posso te mostrar?"
HISTORICO = [{"de": "robo", "texto": ABORDAGEM}, {"de": "contato", "texto": AVISO}]

# a resposta que o robô deu de verdade: falou COM a doutora
ERRADA = "Entendo, Ana Teresa. Desejo uma ótima licença e sucesso futuro. Caso precise de apoio digital depois, estou à disposição."
CERTA = ("Entendi, obrigado pelo aviso! Desejo uma ótima licença à Dra. Ana Teresa. "
         "Enquanto isso, quem responde pela clínica ou pela divulgação? Posso falar com essa pessoa.")


def test_identifica_a_ausente_citada_em_terceira_pessoa():
    assert quem_fala.pessoas_ausentes(AVISO) == ["Ana Teresa"]
    assert quem_fala.pessoas_ausentes("O Dr. Carlos está de férias até dia 20") == ["Carlos"]
    assert quem_fala.pessoas_ausentes("A doutora Maria Clara saiu da clínica") == ["Maria Clara"]


def test_quem_se_apresenta_nao_e_ausente():
    assert quem_fala.pessoas_ausentes("Aqui é a Marcelly, a doutora está de licença") == []
    assert quem_fala.pessoas_ausentes("Oi, a Marcelly falando. A doutora saiu hoje") == []
    # sem ausência na fala, nada a conferir
    assert quem_fala.pessoas_ausentes("Pode mandar que a Ana Teresa vê depois") == []


def test_resposta_que_fala_com_a_ausente_e_recusada():
    assert quem_fala.erro_de_pessoa_errada([ERRADA], HISTORICO)
    assert quem_fala.erro_de_pessoa_errada(["Que pena, Ana Teresa! Boa recuperação para você."], HISTORICO)
    assert quem_fala.erro_de_pessoa_errada(["Imagina, sua licença merece descanso."], HISTORICO)


def test_resposta_para_a_recepcao_em_terceira_pessoa_passa():
    assert quem_fala.erro_de_pessoa_errada([CERTA], HISTORICO) is None
    assert quem_fala.erro_de_pessoa_errada(["Obrigado por avisar! Desejo tudo de bom à Ana Teresa. Quem está cuidando da clínica agora?"], HISTORICO) is None


def test_o_verificador_do_robo_usa_a_regra():
    erros = ai_sdr.problemas_da_resposta([ERRADA], {}, HISTORICO, {"niche": "Clínicas"})
    assert any('"Ana Teresa"' in e and "terceira pessoa" in e.lower() for e in erros)
    assert not any("terceira pessoa" in e.lower() for e in ai_sdr.problemas_da_resposta([CERTA], {}, HISTORICO, {"niche": "Clínicas"}))


def test_decidir_reescreve_quando_o_robo_fala_com_a_doutora_ausente():
    respostas = [{"mensagens": [ERRADA], "entendi": "a doutora está de licença"}, {"mensagens": [CERTA], "entendi": "a recepção avisou que a doutora está de licença"}]
    prompts = []

    def modelo(p):
        prompts.append(p)
        return respostas.pop(0)

    d = decidir(HISTORICO, "whatsapp", {}, {"ativo": True}, {"niche": "Clínicas", "company": "Espaço Luminis"}, modelo)
    assert d.mensagens == [CERTA]
    assert len(prompts) == 2 and "ela está ausente" in prompts[1] and "Ana Teresa" in prompts[1]


def test_se_o_modelo_insistir_no_erro_o_humano_assume():
    d = decidir(HISTORICO, "whatsapp", {}, {"ativo": True}, {"niche": "Clínicas"}, lambda p: {"mensagens": [ERRADA]})
    assert d.passar_para_humano and not d.mensagens


def test_prompt_ensina_a_ler_quem_escreve_e_o_caso_de_licenca():
    p = ai_sdr.montar_prompt(HISTORICO, "whatsapp", {}, {}, {"niche": "Clínicas", "company": "Espaço Luminis"})
    assert "QUEM ESTÁ ESCREVENDO" in p and "TERCEIRA PESSOA" in p and "Nunca fale com a pessoa de quem se fala" in p
    assert "licença" in p and "quem responde pela clínica ou pela divulgação" in p
    assert '"nome" é SÓ o nome de quem está escrevendo' in p and "QUEM escreveu" in p
