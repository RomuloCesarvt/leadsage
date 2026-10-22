"""A prévia é uma prévia: o robô nunca diz que preparou "um site profissional" nem que o site está pronto."""
from app import abordagem_mestra as am
from app import ai_sdr, previa_honesta

LEAD_COM_PREVIA = {"site_publicado": "https://exemplo.vercel.app", "niche": "Nutricionistas"}

DESONESTAS = [
    "Preparei um site profissional para a sua clínica, olha só: https://exemplo.vercel.app",
    "Montei o seu site! Segue: https://exemplo.vercel.app",
    "Criei um site profissional pra vocês, dá uma olhada",
    "Aqui está o seu site: https://exemplo.vercel.app",
    "O seu site já está pronto, é só abrir",
    "Fiz um site novo para o consultório e queria te mostrar",
    "Deixei o site finalizado, me conta o que achou",
    "Segue o site profissional que preparamos para você",
]
HONESTAS = [
    "Montei uma prévia de como o site de vocês poderia ficar: https://exemplo.vercel.app",
    "Aqui está o esboço: https://exemplo.vercel.app. É uma primeira ideia, as fotos e textos são de exemplo.",
    "Preparei um modelo do seu site, sem compromisso. Quer dar uma olhada?",
    "Criei uma ideia de como o seu site poderia ficar, com fotos de exemplo.",
    "Um site profissional ajuda quem pesquisa no Google a chamar você no WhatsApp.",
    "O site de verdade é feito depois, com as suas fotos e informações.",
    "Montei uma prévia do site de vocês, sem compromisso. Posso te mostrar?",
]


def test_reconhece_quem_chama_a_previa_de_site_pronto():
    for t in DESONESTAS:
        assert previa_honesta.trecho_de_site_pronto(t), t


def test_nao_barra_quem_fala_de_previa_esboco_ou_do_servico_em_geral():
    for t in HONESTAS:
        assert previa_honesta.trecho_de_site_pronto(t) is None, t


def test_validador_do_robo_recusa_site_profissional_com_a_previa_ja_criada():
    erros = ai_sdr.problemas_da_resposta(["Preparei um site profissional para vocês: https://exemplo.vercel.app"], {}, [], LEAD_COM_PREVIA)
    assert any("prévia" in e and "site pronto ou profissional" in e for e in erros)
    ok = ai_sdr.problemas_da_resposta(["Aqui está a prévia: https://exemplo.vercel.app É só uma primeira ideia. O que achou?"], {}, [], LEAD_COM_PREVIA)
    assert not any("site pronto ou profissional" in e for e in ok)


def test_validador_vale_tambem_quando_o_sistema_cria_a_previa_agora():
    erros = ai_sdr.problemas_da_resposta(["Perfeito! Seu site já está pronto: [LINK_DA_PREVIA]"], {}, [], {"niche": "Nutricionistas"}, True)
    assert any("site pronto ou profissional" in e for e in erros)


def test_prompt_do_robo_explica_o_que_e_a_previa():
    p = ai_sdr.montar_prompt([{"de": "contato", "texto": "pode mandar"}], "whatsapp", {}, {}, LEAD_COM_PREVIA)
    assert "O QUE É A PRÉVIA" in p and "NÃO é o site final" in p and "fotos são de banco de imagens" in p
    assert 'PROIBIDO dizer que preparou/montou/criou "um site profissional"' in p
    assert "uma primeira ideia do site, não o site final" in ai_sdr.montar_prompt([], "whatsapp", {}, {"objetivo": "site"}, LEAD_COM_PREVIA)


def test_primeira_abordagem_nao_pode_dizer_que_preparou_um_site():
    ruim = "Boa tarde! Montei um site profissional para vocês, sem compromisso. Posso te mostrar?"
    assert any("site pronto ou profissional" in p for p in am.revisar_roteiro(ruim, True, "criada"))
    bom = "Boa tarde! Não encontrei o site de vocês e queria confirmar. Montei uma prévia de como poderia ficar, sem compromisso. Posso te mostrar?"
    assert not any("site pronto ou profissional" in p for p in am.revisar_roteiro(bom, True, "criada"))


def test_roteiro_da_primeira_mensagem_pede_previa_e_nao_site_pronto():
    texto = am.estrutura("Rômulo", sem_site=True, previa="criada", canal="whatsapp", lead_id="L1")
    assert "PRÉVIA" in texto and "não o site final" in texto and "um site profissional" in texto  # a proibição está no roteiro
