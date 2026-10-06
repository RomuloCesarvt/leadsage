"""O que um SDR bom sabe do ramo antes de falar com o dono.

Vender site para uma advogada e para um dono de pizzaria são conversas
diferentes: muda como o cliente decide, o que o dono teme, o horário em que
ele atende e as palavras que usa. Este guia entrega isso ao modelo por ramo.

Dois cuidados:
- é conhecimento GERAL do ramo, para fazer boas perguntas e escolher o
  ângulo. Nunca é afirmação sobre aquele negócio: fato do negócio só vem do
  dossiê ou do que a pessoa disse;
- ramo fora da lista cai num método de raciocínio, em vez de num texto
  genérico.
"""
import re
import unicodedata
from typing import Dict, List, Optional


def _normal(t: str) -> str:
    t = unicodedata.normalize("NFD", (t or "").lower())
    return re.sub(r"[^a-z0-9 ]+", " ", "".join(c for c in t if unicodedata.category(c) != "Mn"))


# chaves: trechos (sem acento) que identificam o ramo no campo "niche" do lead
GUIA: List[Dict[str, object]] = [
    {
        "nome": "Restaurante, pizzaria, lanchonete, bar",
        "chaves": ("restaurante", "pizzaria", "lanchonete", "hamburgueria", "bar ", "churrascaria", "cantina", "marmitaria", "japones", "sushi"),
        "cliente": "Decide pelo que vê: fotos do prato, cardápio, avaliação e distância. Procura 'onde comer perto' no Google e no mapa, e muita gente decide pelo cardápio antes de ligar.",
        "dores": "Cardápio só em PDF ou foto torta; pedir pelo WhatsApp manual e lento; taxa dos aplicativos de delivery; cliente que não sabe se está aberto.",
        "evitar": "Almoço (11h-14h) e jantar (18h-22h); fim de semana é o pico. Melhor: meio da tarde, entre 14h30 e 17h, de terça a quinta.",
        "objecoes": "'O iFood já resolve' (mostre pedido direto sem comissão); 'não tenho tempo' (o trabalho é seu).",
    },
    {
        "nome": "Padaria, confeitaria, doceria, cafeteria",
        "chaves": ("padaria", "panificadora", "confeitaria", "doceria", "cafeteria", "bolo", "confeiteir", "cafe "),
        "cliente": "Compra por hábito e proximidade, mas encomenda (bolos, festas, cestas) vem de busca e indicação. Foto e prova social vendem.",
        "dores": "Encomenda por mensagem sem organização; sem catálogo para festas; horário e endereço desatualizados no Google.",
        "evitar": "Manhã cedo (pico do pão) e fim de tarde. Melhor: 14h às 16h.",
        "objecoes": "'Meu movimento é de balcão' (o site capta a encomenda e o evento, que dá mais margem).",
    },
    {
        "nome": "Clínica médica e consultório",
        "chaves": ("clinica medica", "clinica geral", "clinica popular", "clinica de saude", "medic", "consultorio", "dermato", "pediatr", "ortoped", "cardio", "oftalmo", "ginecolog", "fisioterap", "nutri"),
        "cliente": "Decide por confiança: formação, avaliações, aparência profissional e facilidade de agendar. Pesquisa o médico antes de ligar. Regras do CFM limitam promessa e propaganda.",
        "dores": "Agenda com buracos; paciente que não acha o telefone; presença que não passa autoridade; site antigo; avaliações sem resposta.",
        "evitar": "Horário de consulta (manhã e tarde úteis). Melhor: fim do expediente ou intervalo de almoço; secretária costuma filtrar, peça o responsável.",
        "objecoes": "'Só vivo de indicação' (indicado também pesquisa antes de ligar); 'a ética médica proíbe' (site informativo e institucional é permitido, sem promessa de resultado).",
    },
    {
        "nome": "Dentista e odontologia",
        "chaves": ("odonto", "dentista", "ortodont", "implante"),
        "cliente": "Medo e preço pesam; decide por confiança, antes e depois, avaliações e parcelamento. Busca 'dentista perto de mim' e urgência ('dor de dente').",
        "dores": "Concorrência por preço de rede popular; agenda ociosa em dias fracos; pouca prova de resultado (respeitando o CRO).",
        "evitar": "Horário de atendimento; melhor no intervalo de almoço ou fim de tarde.",
        "objecoes": "'Já tenho Instagram' (quem tem urgência busca no Google); 'o CRO proíbe antes e depois' (regras existem, mas há muito o que mostrar: equipe, estrutura, avaliações).",
    },
    {
        "nome": "Psicologia e terapia",
        "chaves": ("psicolog", "terapeut", "psicanal", "psiquiatr"),
        "cliente": "Decisão delicada e lenta: busca acolhimento, abordagem e se o profissional 'combina'. Muita gente pesquisa de madrugada e prefere agendar sem ligar.",
        "dores": "Tom de comunicação (nada de vendedor), agendamento por mensagem, pouca visibilidade fora de indicação.",
        "evitar": "Horário de sessões (agenda fechada por hora). Melhor: intervalos ou fim de tarde; mensagem curta e sem pressão.",
        "objecoes": "'Não posso fazer propaganda' (conteúdo informativo e institucional é permitido).",
    },
    {
        "nome": "Estética, salão, barbearia, manicure",
        "chaves": ("estetic", "salao", "barbearia", "barbeiro", "manicure", "cabeleir", "beleza", "sobrancelha", "depila", "spa", "massag"),
        "cliente": "Compra pelo visual: fotos de trabalhos, antes e depois, preço e quem atende. Muita marcação por Instagram e WhatsApp; recorrência é o negócio.",
        "dores": "Agenda no caderno ou no WhatsApp; falta de lista de serviços e preços; clientes que somem; concorrente com vitrine melhor.",
        "evitar": "Sábado e fim de tarde (pico). Melhor: terça a quinta de manhã; segunda costuma ser dia fraco e livre.",
        "objecoes": "'Meu movimento vem do Instagram' (site e Google pegam quem busca na hora e quem não segue você).",
    },
    {
        "nome": "Academia, pilates, crossfit, personal",
        "chaves": ("academia", "pilates", "crossfit", "personal", "fitness", "muscula", "yoga", "danca", "natacao", "treino"),
        "cliente": "Decide por localização, preço, estrutura e experiência de teste. Gosta de aula experimental e de ver o espaço antes.",
        "dores": "Rotatividade de alunos; janeiro cheio e meio do ano vazio; sem captura de aula experimental; planos pouco claros.",
        "evitar": "Horários de pico de treino (6h-9h, 17h-20h). Melhor: 10h às 11h30 ou 14h às 16h.",
        "objecoes": "'Aluno vem por indicação' (e quem busca 'academia perto' e não acha você?).",
    },
    {
        "nome": "Advocacia",
        "chaves": ("advoca", "advogad", "juridic", "escritorio de advocacia", "direito"),
        "cliente": "Decide por confiança e autoridade; pesquisa o advogado antes de contratar; muita demanda urgente vem do Google ('advogado trabalhista em ...'). OAB limita captação e promessa.",
        "dores": "Site que não passa credibilidade, sem áreas de atuação claras; dependência de indicação; agendamento de consulta desorganizado.",
        "evitar": "Manhã de audiências e fechamento de prazos. Melhor: fim de tarde; seja formal, objetivo e respeitoso.",
        "objecoes": "'A OAB não permite propaganda' (marketing jurídico informativo e institucional é permitido; nada de captação, promessa ou preço); 'só trabalho por indicação'.",
    },
    {
        "nome": "Contabilidade",
        "chaves": ("contab", "contad", "contabil", "fiscal"),
        "cliente": "Dono de empresa troca de contador por preço, atendimento e dor com prazo/imposto; busca 'contador para MEI/abrir empresa' no Google.",
        "dores": "Captação depende de indicação; site genérico; pouco conteúdo mostrando especialidade (MEI, Simples, comércio, saúde).",
        "evitar": "Dias 10 a 20 e fim de mês (fechamento e guias). Melhor: começo do mês, manhã.",
        "objecoes": "'Já tenho clientes demais' (então foco em clientes melhores, de maior ticket).",
    },
    {
        "nome": "Imobiliária e corretor",
        "chaves": ("imobiliaria", "corretor", "imoveis", "imovel", "incorporadora", "loteamento"),
        "cliente": "Busca por bairro, preço e fotos, em portais e Google. Confiança do corretor decide a visita.",
        "dores": "Dependência de portais caros; leads frios; site lento ou sem os imóveis atualizados; sem captação própria.",
        "evitar": "Fim de semana (visitas). Melhor: terça a quinta, fim de manhã.",
        "objecoes": "'Já pago o portal' (o site próprio capta contato sem comissão e constrói marca).",
    },
    {
        "nome": "Oficina mecânica, auto center, funilaria, lava-jato",
        "chaves": ("oficina", "mecanic", "auto center", "autocenter", "funilaria", "lava jato", "lavajato", "borracharia", "pneus", "auto pecas", "autopecas", "estetica automotiva"),
        "cliente": "Confiança é tudo: medo de ser enganado. Busca 'mecânico perto de mim' na hora do problema; avaliações e transparência de preço decidem.",
        "dores": "Pouca confiança de cliente novo; orçamento por telefone sem registro; ninguém acha o horário; avaliações sem resposta.",
        "evitar": "Manhã e início da tarde (carros na oficina). Melhor: fim do dia, depois das 17h, ou sábado após o meio-dia.",
        "objecoes": "'Meu cliente vem por boca a boca' (e o cliente novo, que busca na hora da pane?).",
    },
    {
        "nome": "Escola, cursos, idiomas, autoescola",
        "chaves": ("escola", "curso", "idioma", "ingles", "autoescola", "cfc", "colegio", "creche", "faculdade", "treinamento", "reforco"),
        "cliente": "Pais e alunos comparam preço, resultado, estrutura e horário; matrícula é sazonal (janeiro e julho). Decisão familiar e demorada.",
        "dores": "Captação concentrada em época de matrícula; falta de site com turmas, valores e depoimentos; contato fica no telefone.",
        "evitar": "Início e fim das aulas e época de matrícula. Melhor: meio da manhã ou da tarde fora de período de matrícula.",
        "objecoes": "'Matrícula é só por indicação' (e pais novos na cidade?).",
    },
    {
        "nome": "Pet shop e veterinária",
        "chaves": ("pet", "veterin", "banho e tosa", "agropet", "racao"),
        "cliente": "Dono de pet decide por confiança e cuidado; busca por urgência e por serviço (banho, tosa, vacina). Muito WhatsApp e Instagram.",
        "dores": "Agendamento de banho manual; urgência sem canal claro; pouca recorrência organizada (vacina, plano mensal).",
        "evitar": "Manhã de banho e tosa. Melhor: 14h às 16h.",
        "objecoes": "'O Instagram já mostra meus pets' (o Google traz quem ainda não conhece).",
    },
    {
        "nome": "Loja de roupas, calçados, acessórios",
        "chaves": ("roupa", "moda", "boutique", "vestuario", "calcado", "sapato", "acessorio", "lingerie", "jeans", "bolsa"),
        "cliente": "Compra pelo visual e pela novidade; descobre no Instagram e confere no Google antes de ir à loja.",
        "dores": "Vender só no balcão e no direct; catálogo desatualizado; sem vitrine online com preço; concorrência de marketplace.",
        "evitar": "Sábado e véspera de datas (Dia das Mães, Natal). Melhor: terça a quinta à tarde.",
        "objecoes": "'Vendo mais no Instagram' (o catálogo no site com WhatsApp encurta a compra).",
    },
    {
        "nome": "Ótica, farmácia, drogaria",
        "chaves": ("otica", "optica", "farmac", "drogaria", "manipulacao"),
        "cliente": "Ótica: decisão por confiança, marca e preço do pacote; farmácia: conveniência, preço e entrega. Pesquisa 'aberto agora' e telefone.",
        "dores": "Horário e entrega mal divulgados; concorrência de rede; sem catálogo/serviços (exame, manipulação) visíveis.",
        "evitar": "Horário comercial de pico. Melhor: meio da tarde.",
        "objecoes": "'Rede grande tem mais verba' (negócio local ganha em proximidade e atendimento, que o Google mostra).",
    },
    {
        "nome": "Construção, reforma, marcenaria, arquitetura, engenharia",
        "chaves": ("construc", "reforma", "marcenaria", "arquitet", "engenhar", "pintura", "gesso", "moveis planejados", "serralheria", "vidracaria", "pedreiro", "empreiteira", "paisagismo", "piscina"),
        "cliente": "Compra cara e arriscada: decide por portfólio, prazos cumpridos e indicação. Pede orçamento a vários. Foto de obra concluída vende.",
        "dores": "Portfólio espalhado em redes; orçamento sem registro; cliente que some depois do orçamento; pouca autoridade para ticket alto.",
        "evitar": "Horário de obra (7h às 17h). Melhor: depois das 17h ou sábado pela manhã.",
        "objecoes": "'Trabalho por indicação' (quem recebe a indicação vai ao Google conferir antes de ligar).",
    },
    {
        "nome": "Eventos, buffet, fotografia, decoração",
        "chaves": ("evento", "buffet", "fotograf", "decoracao", "cerimonial", "festa", "casamento", "filmagem", "som e luz", "espaco de eventos"),
        "cliente": "Decisão emocional e planejada com antecedência; quer ver trabalhos reais, avaliações e preço de pacote. Pesquisa muito e compara.",
        "dores": "Portfólio pouco organizado; orçamento caso a caso sem pacote visível; datas perdidas por demora na resposta.",
        "evitar": "Fim de semana (eventos). Melhor: segunda a quarta.",
        "objecoes": "'Fecho por indicação e Instagram' (um portfólio organizado acelera a decisão de quem recebeu a indicação).",
    },
    {
        "nome": "Turismo, hotel, pousada, hospedagem",
        "chaves": ("hotel", "pousada", "hospedagem", "turismo", "agencia de viagens", "hostel", "chale", "resort"),
        "cliente": "Compara fotos, avaliações, localização e preço; reserva direta é mais rentável que plataforma, mas depende de confiança no site.",
        "dores": "Comissão alta das plataformas; site sem reserva direta; fotos pouco atraentes; baixa temporada vazia.",
        "evitar": "Check-in/out e alta temporada. Melhor: meio da semana, fora de feriado.",
        "objecoes": "'O Booking me traz hóspede' (e a comissão? reserva direta fica com você).",
    },
    {
        "nome": "Serviços residenciais: eletricista, encanador, dedetização, limpeza, ar-condicionado, chaveiro",
        "chaves": ("eletricist", "encanador", "dedetiz", "limpeza", "ar condicionado", "ar-condicionado", "chaveiro", "desentup", "diarista", "manutencao", "jardinagem", "impermeabiliza", "mudanca", "frete"),
        "cliente": "Procura na hora da emergência, no Google e no celular: quem aparece primeiro, atende rápido e tem boa nota, ganha. Decide em minutos.",
        "dores": "Depender de indicação e boca a boca; cliente que não sabe se atende na região; sem botão de ligar/WhatsApp fácil.",
        "evitar": "Horário de serviço (dia todo). Melhor: noite, depois das 18h30, ou fim do dia; seja muito direto.",
        "objecoes": "'Tenho serviço demais' (então foco em serviços de maior valor e região certa).",
    },
    {
        "nome": "Tecnologia, informática, assistência técnica",
        "chaves": ("informatica", "assistencia tecnica", "celular", "computador", "notebook", "tecnologia", "software", "ti ", "redes e", "cftv", "seguranca eletronica"),
        "cliente": "Procura por urgência ('conserto de celular perto'); decide por preço, prazo e garantia. B2B decide por confiança e contrato.",
        "dores": "Sem vitrine do que conserta e de quanto custa; garantia pouco visível; muito orçamento por mensagem.",
        "evitar": "Horário de balcão. Melhor: fim da tarde.",
        "objecoes": "'Tenho muito cliente' (o site filtra orçamento e traz o serviço de maior ticket).",
    },
    {
        "nome": "Agro, agropecuária, veterinária rural",
        "chaves": ("agro", "fazenda", "rural", "insumo", "sementes", "implement", "cooperativa", "pecuaria"),
        "cliente": "Relacionamento e confiança local; decide por preço, crédito e prazo. Muito WhatsApp, pouco site; mas nova geração pesquisa online.",
        "dores": "Catálogo e cotação por mensagem; pouca presença para quem não conhece a loja; sem divulgação de safra e promoções.",
        "evitar": "Início da manhã (campo). Melhor: horário de almoço ou fim de tarde.",
        "objecoes": "'Aqui todo mundo me conhece' (ótimo, o site transforma conhecido em recompra e atrai quem é de fora).",
    },
]

METODO_GERAL = (
    "Este ramo não está no guia. Raciocine antes de falar: (1) como o cliente do negócio decide a compra "
    "(urgência, confiança, preço, indicação, visual)? (2) onde ele procura (Google, Instagram, indicação)? "
    "(3) o que o dono perde sem presença digital? (4) quando ele está ocupado (evite esse horário para a reunião)? "
    "(5) que palavras do ramo ele usa? Use isso para fazer UMA boa pergunta, e confirme com ele em vez de afirmar. "
    "Fato sobre o negócio só vem do dossiê ou do que a pessoa disse."
)


def achar(nicho: Optional[str]) -> Optional[Dict[str, object]]:
    """O guia do ramo, pela melhor correspondencia no texto do nicho."""
    alvo = f" {_normal(nicho or '').strip()} "
    if not alvo.strip():
        return None
    melhor, pontos = None, 0
    for g in GUIA:
        for chave in g["chaves"]:  # type: ignore[union-attr]
            # inicio de palavra: "spa" nao casa com "espaco", "pet" casa com "petshop"
            c = _normal(str(chave)).strip()
            padrao = f" {c} " if str(chave).endswith(" ") else f" {c}"
            if c and padrao in alvo and len(c) > pontos:
                melhor, pontos = g, len(c)
    return melhor


def bloco(nicho: Optional[str]) -> str:
    g = achar(nicho)
    if not g:
        return f"Ramo: {nicho or 'não informado'}.\n{METODO_GERAL}"
    return (
        f"Ramo: {g['nome']}\n"
        f"- Como o cliente dele decide: {g['cliente']}\n"
        f"- Dores comuns do ramo (confirme perguntando, não afirme): {g['dores']}\n"
        f"- Evite marcar reunião: {g['evitar']}\n"
        f"- Objeções típicas: {g['objecoes']}"
    )
