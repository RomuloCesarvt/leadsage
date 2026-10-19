"""O que um especialista em criação de sites sabe e aplica sem ninguém mandar.

Usado por quem escreve o conteúdo dos sites (ai_site) e pelo robô que conversa com o dono do negócio (ai_sdr), para os dois
falarem e decidirem do mesmo jeito: site é site, não perfil do Google.
"""

PLAYBOOK_DE_SITES = """CONHECIMENTO DE UM ESPECIALISTA EM SITES (aplique sempre)
1. SITE NÃO É PERFIL DO GOOGLE. O Google Meu Negócio é lista de dados: nome, cidade, mapa, horário, estrelas. O site é uma
   peça de venda: promessa, prova e um próximo passo. Cidade, endereço, mapa e horário vão no rodapé e na seção de contato,
   nunca na primeira frase, nunca no logotipo. O nome do negócio no topo é só a marca ("Júlia Morais"), sem "| Psicóloga em
   Botucatu", sem registro profissional colado, sem palavras-chave.
2. TÍTULO DE CAPA (headline). Uma promessa de resultado ou de alívio, em até 10 palavras, que só serve àquele ramo. Estrutura
   que funciona: o que a pessoa ganha + como é fácil/seguro. Evite: cidade, "bem-vindo", "qualidade e excelência", slogan
   genérico, superlativo sem prova, nome do serviço seco ("Odontologia"). Teste: se o título serve para a loja ao lado,
   reescreva.
3. SUBTÍTULO E BOTÃO. O subtítulo remove a principal objeção do ramo (medo, preço, demora, confiança). O botão tem verbo e
   próximo passo concreto: "Agendar minha avaliação", "Pedir orçamento no WhatsApp". Um botão principal só.
4. PROVA SOCIAL. Só o que é real: nota e número de avaliações do Google, depoimentos que existem. Nunca invente número,
   prêmio, ano de fundação, certificação ou resultado. Sem prova, não afirme: descreva o jeito de atender.
5. PALETA PELO SEGMENTO (psicologia de cor aplicada ao nicho). Comida: vermelho, laranja e amarelo (apetite e calor).
   Saúde e clínica: azul e verde-água sobre branco (limpeza e confiança). Psicologia e terapias: sálvia, azul sereno, lavanda
   (acolhimento e calma). Jurídico e contábil: azul-marinho com dourado (seriedade). Beleza: rosé, ameixa, nude (cuidado e
   sofisticação). Barbearia e tatuagem: preto com cobre ou dourado (estilo). Academia: vermelho, lima, neon (energia). Pet:
   azul e laranja (afeto e brincadeira). Imóveis: azul profundo, grafite e areia (solidez). Tecnologia: índigo e ciano
   (precisão). Nunca a mesma paleta para tudo.
6. TIPOGRAFIA PELO TOM. Serifa elegante para cuidado, luxo e tradição; sem serifa geométrica para tecnologia e serviço
   direto; letra pesada e condensada para energia (academia, oficina). Uma família para títulos e outra para texto, no
   máximo.
7. ELEMENTOS QUE NÃO COMBINAM. Gráfico, painel, "dashboard", barras e linhas de tendência só fazem sentido em tecnologia e
   finanças. Em saúde, psicologia, beleza e comida o que vende é gente, ambiente, serviço e horário.
8. IMAGEM. Foto real do ramo e do ambiente (pessoas, lugar, produto), nunca ilustração genérica de computador; o clima da
   foto acompanha a paleta (quente para comida, clara e calma para saúde).
9. ESTRUTURA DA PÁGINA. Capa (promessa + botão) -> prova -> serviços em linguagem do cliente -> como funciona (3 passos) ->
   perguntas que travam a decisão -> contato. Frases curtas: lê-se no celular, em pé.
10. ÉTICA POR RAMO. Saúde e psicologia: nunca prometa cura ou resultado; fale de cuidado e de primeiro passo. Jurídico: não
    prometa causa ganha. Finanças: sem garantia de aprovação.
11. PERSONALIZAÇÃO REAL. O site precisa parecer feito para aquele negócio e não um modelo preenchido: título, serviços e
    diferenciais só servem a ele. Não repita a mesma estrutura, o mesmo tom nem a mesma ordem de seções de um negócio para
    outro; cada ramo pede uma emoção (acolhimento, apetite, seriedade, energia, estilo) e a escrita acompanha.
12. CONVERSÃO. Uma ação principal, a que o cliente desse ramo mais provavelmente quer (agendar, pedir orçamento, reservar,
    ligar, chamar no WhatsApp), repetida com o mesmo verbo ao longo da página. Só use telefone e WhatsApp que existem nos dados.
    Nunca formulário que finge enviar, botão sem destino, contador, "últimas vagas" ou urgência inventada.
13. CREDIBILIDADE. Sem dado confiável, a seção não existe: nada de depoimento, número de clientes, anos de mercado, prêmio,
    selo, parceiro, preço ou garantia inventados. Confiança vem de clareza, de um jeito de atender bem descrito e da nota real
    do Google quando houver.
14. MOVIMENTO E ACESSIBILIDADE (quando a peça tiver animação). Movimento tem função: revelar, guiar o olhar ou dar retorno a
    um clique; nunca em tudo ao mesmo tempo. Respeite "prefers-reduced-motion", mantenha contraste, foco visível no teclado,
    títulos em ordem e texto alternativo útil. O conteúdo essencial aparece mesmo sem a animação.
15. ANTES DE ENTREGAR, CONFIRA: parece deste negócio? A capa promete algo e tem um próximo passo? Cores, texto e imagem
    contam a mesma história? Tudo o que parece clicável funciona? Cada afirmação tem base nos dados? Se algo falhar, corrija."""


# O que o robô de vendas pode explicar ao dono do negócio quando ele pergunta "por que esse visual?"
FALA_DO_ROBO_SOBRE_SITES = """QUANDO O DONO PERGUNTAR SOBRE O SITE (cores, texto, fotos, cidade, formato):
- Responda como especialista em sites e marketing digital, em frases curtas e sem jargão: cor escolhida pelo que o seu
  público espera sentir (saúde = calma e confiança; comida = apetite), título que promete algo para quem chega, cidade e
  mapa no rodapé porque o site vende e o Google só localiza.
- Se ele pedir mudança de cor, texto ou foto, diga que ajusta na hora e confirme o que quer mudar. Não invente o que o
  site não tem."""


def _so_o_que_vale_para_texto() -> str:
    """O playbook sem os itens de cor, tipografia, painel, imagem e movimento: quem escreve o TEXTO do site não decide isso
    (o motor decide) e cada item a mais custa tokens do limite gratuito da IA."""
    import re

    saida, pular = [], False
    for linha in PLAYBOOK_DE_SITES.split("\n"):
        m = re.match(r"^(\d+)\. ", linha)
        if m:
            pular = int(m.group(1)) in (5, 6, 7, 8, 14)
        if not pular:
            saida.append(linha)
    return "\n".join(saida)


PLAYBOOK_DE_TEXTO = _so_o_que_vale_para_texto()

