/**
 * Banco de conteúdo em português por ramo.
 *
 * Um site profissional não começa em branco: quem faz isso todo dia sabe
 * qual promessa abre uma página de dentista, que perguntas um cliente de
 * oficina faz antes de ligar, e o que uma padaria mostra primeiro. Aqui
 * está esse repertório, por ramo.
 *
 * Regras que o conteúdo respeita (e o teste confere):
 * - nada de fato inventado: sem número de clientes, anos de mercado,
 *   prêmio, certificação, garantia ou preço. O que for assim o dono
 *   preenche; o banco só traz o que vale para qualquer negócio do ramo;
 * - títulos falam do resultado para o cliente, não do negócio ("agende sua
 *   consulta sem fila"), com verbo e no máximo ~9 palavras;
 * - respostas de FAQ remetem ao contato ("confirme pelo WhatsApp") quando
 *   dependem de política do negócio, em vez de prometer;
 * - {empresa} e {cidade} são trocados pelo nome e pela cidade do negócio.
 */
import type { Servico } from './base';

export interface ItemTexto { titulo: string; texto: string }
export interface Pergunta { pergunta: string; resposta: string }

export interface ConteudoNicho {
  id: string;
  nome: string;
  /** trechos (sem acento, minúsculos) que identificam o ramo no texto do nicho */
  chaves: string[];
  /** especialidade: vence a palavra genérica de lugar ("consultório", "clínica"), mesmo sendo mais curta */
  prioritario?: boolean;
  /** tipo do schema.org para os dados estruturados do Google */
  schema: string;
  /** layout que mais combina, entre os ids de sites/layouts */
  layout: string;
  /** cor principal e de destaque sugeridas (contraste verificado no motor) */
  paleta: { primaria: string; destaque: string };
  /** chamada principal e secundária dos botões */
  cta: { principal: string; secundario: string };
  /** pequena etiqueta acima do título (ex.: "Atendimento com hora marcada") */
  etiqueta: string;
  titulos: string[];
  subtitulo: string;
  sobre: string;
  servicos: Servico[];
  diferenciais: ItemTexto[];
  passos: ItemTexto[];
  faq: Pergunta[];
  /** termos de foto, em português primeiro: o banco de imagens tenta na ordem */
  imagens: string[];
}

const P = (pergunta: string, resposta: string): Pergunta => ({ pergunta, resposta });
const I = (titulo: string, texto: string): ItemTexto => ({ titulo, texto });
const S = (titulo: string, descricao: string): Servico => ({ titulo, descricao });

export const BANCO: ConteudoNicho[] = [
  {
    id: 'padaria', nome: 'Padaria e confeitaria',
    chaves: ['padaria', 'panificadora', 'confeitaria', 'doceria', 'cafeteria', 'bolo', 'confeiteir', 'doceir', 'cafe ', 'sorvet', 'acai', 'chocolate', 'casa de cha', 'casa de suco', 'bolos'],
    schema: 'Bakery', layout: 'forno', paleta: { primaria: '#8a4b1f', destaque: '#e9a23b' },
    cta: { principal: 'Fazer meu pedido', secundario: 'Ver como chegar' },
    etiqueta: 'Feito todos os dias',
    titulos: ['Pão quente e doces feitos com carinho', 'O sabor que você procura, todo dia', 'Do forno para a sua mesa'],
    subtitulo: 'Pães, bolos e salgados frescos, para o café da manhã, o lanche ou aquela encomenda especial.',
    sobre: 'Uma padaria de bairro faz diferença no dia: o cheiro de pão saindo do forno, o atendimento que lembra o seu nome e o produto fresquinho. Venha conhecer.',
    servicos: [S('Pães frescos', 'Variedades assadas ao longo do dia, para sair sempre quentinho.'), S('Bolos e tortas', 'Para o café da tarde, o aniversário ou qualquer ocasião que merece doce.'),
      S('Salgados', 'Assados e fritos na hora, ótimos para o lanche ou para a festa.'), S('Encomendas', 'Bolos decorados, cestas e kits para festas, combinados com antecedência.'),
      S('Café e lanches', 'Um cantinho para o café, o pão na chapa e o bate-papo.'), S('Frios e mercearia', 'Itens do dia a dia para completar a sua compra.')],
    diferenciais: [I('Produção própria', 'Receitas feitas aqui, com ingredientes escolhidos com cuidado.'), I('Sempre fresco', 'Fornadas ao longo do dia para você levar o melhor.'), I('Encomenda sob medida', 'Conte o que precisa e a gente combina o tamanho, o sabor e a data.'), I('Perto de você', 'Fácil de chegar e de pedir pelo WhatsApp.')],
    passos: [I('Escolha', 'Veja o que temos hoje ou diga o que você precisa.'), I('Combine', 'Para encomendas, fale com a gente pelo WhatsApp e acerte data e sabor.'), I('Retire ou receba', 'Passe aqui para buscar, ou combine a entrega.')],
    faq: [P('Vocês aceitam encomendas?', 'Sim. Fale com a gente pelo WhatsApp com a data e o que precisa, e combinamos os detalhes.'), P('Com quanta antecedência devo encomendar?', 'Depende do produto. Para bolos e festas, quanto antes melhor; confirme o prazo pelo WhatsApp.'),
      P('Fazem entrega?', 'Confirme pelo WhatsApp se a entrega está disponível para o seu endereço.'), P('Qual o horário de funcionamento?', 'Está logo abaixo, na seção de contato, e também no Google.'), P('Atendem pedidos para empresas e eventos?', 'Atendemos. Chame no WhatsApp contando a quantidade e a data.')],
    imagens: ['padaria pães', 'bolo confeitaria', 'bakery bread', 'pastry cake'],
  },
  {
    id: 'restaurante', nome: 'Restaurante, pizzaria e lanchonete',
    chaves: ['restaurante', 'pizzaria', 'lanchonete', 'hamburgueria', 'bar ', 'churrascaria', 'cantina', 'marmitaria', 'japones', 'sushi', 'boteco', 'pub ', 'pubs ', 'choperia', 'espetaria', 'self service', 'por quilo', 'rotisseria', 'salgader', 'pastelaria', 'tapioca', 'creperia', 'food truck', 'dark kitchen', 'hot dog', 'churrasc', 'casa de carne', 'marmit', 'pizza', 'cervejaria', 'chopp', 'bar com musica', 'gastronomia'],
    schema: 'Restaurant', layout: 'mesa', paleta: { primaria: '#9b2c1a', destaque: '#f0a82b' },
    cta: { principal: 'Pedir pelo WhatsApp', secundario: 'Ver o cardápio' },
    etiqueta: 'Peça sem complicação',
    titulos: ['Comida boa, do jeito que você gosta', 'O prato que resolve o seu dia', 'Comer bem nunca foi tão fácil'],
    subtitulo: 'Veja o cardápio, escolha o que quer e peça pelo WhatsApp, para comer aqui ou receber em casa.',
    sobre: 'Boa comida é feita com tempero, capricho e atendimento que faz você querer voltar. Aqui o prato chega bonito, no ponto e sem demora.',
    servicos: [S('Pratos do dia', 'Opções que mudam ao longo da semana, sempre feitas na hora.'), S('Cardápio completo', 'Do clássico ao especial, com opções para todos os gostos.'),
      S('Para comer aqui', 'Ambiente pensado para a sua refeição ser tranquila.'), S('Para levar', 'Peça pelo WhatsApp e retire sem esperar.'),
      S('Entrega', 'Consulte a região atendida e o prazo pelo WhatsApp.'), S('Eventos e grupos', 'Mesas grandes e pedidos para confraternizações, combinados com antecedência.')],
    diferenciais: [I('Feito na hora', 'Pratos preparados quando você pede, para chegar quentes.'), I('Peça em segundos', 'Mande a mensagem pelo WhatsApp e a gente cuida do resto.'), I('Para todos os gostos', 'Opções para a família, o casal, o grupo e o almoço rápido.'), I('Atendimento próximo', 'Gente de verdade responde o seu pedido.')],
    passos: [I('Escolha', 'Veja o cardápio e decida o que vai ser.'), I('Peça', 'Mande a mensagem pelo WhatsApp com o seu pedido.'), I('Aproveite', 'Coma aqui, retire ou receba em casa.')],
    faq: [P('Como faço um pedido?', 'Pelo botão de WhatsApp desta página. Basta dizer o que quer e se é para comer aqui, retirar ou entregar.'), P('Vocês entregam?', 'Confirme pelo WhatsApp se a entrega chega ao seu endereço e qual o prazo.'), P('Dá para reservar mesa?', 'Chame no WhatsApp com o dia, o horário e o número de pessoas.'), P('Quais as formas de pagamento?', 'Pergunte pelo WhatsApp: as formas aceitas estão sempre atualizadas por lá.'), P('Têm opções para quem tem restrição alimentar?', 'Conte a sua necessidade pelo WhatsApp para indicarmos a melhor opção.')],
    imagens: ['restaurante comida', 'prato refeição', 'restaurant food', 'pizza'],
  },
  {
    id: 'saude-medica', nome: 'Clínica médica e consultório',
    chaves: ['clinica medica', 'clinica geral', 'clinica popular', 'clinica de saude', 'medic', 'consultorio', 'dermato', 'pediatr', 'ortoped', 'cardio', 'oftalmo', 'ginecolog', 'urolog', 'endocrin', 'neurolog', 'psiquiatr', 'otorrino', 'geriatr', 'laboratorio', 'diagnostico', 'gastro', 'reumat', 'pneumo', 'oncolog', 'proctolog', 'hematolog', 'nefrolog', 'angiolog', 'alergist', 'imunolog', 'infectolog', 'mastolog', 'obstetr', 'anestesi', 'cirurg', 'hospital', 'radiolog', 'nutrolog', 'casa de repouso', 'home care', 'cuidador', 'maternidade', 'centro medico', 'pronto atend', 'ambulatorio', 'check up', 'doutor', 'doutora', 'dr ', 'dra ', 'posto de saude'],
    schema: 'MedicalClinic', layout: 'clinica', paleta: { primaria: '#0f7c8a', destaque: '#2f9e6f' },
    cta: { principal: 'Agendar consulta', secundario: 'Como chegar' },
    etiqueta: 'Atendimento com hora marcada',
    titulos: ['Cuidar da sua saúde começa aqui', 'Atenção de verdade, com hora marcada', 'Sua consulta, sem fila e sem complicação'],
    subtitulo: 'Atendimento atencioso, explicação clara em cada etapa e agendamento fácil pelo WhatsApp.',
    sobre: 'Cuidar de pessoas começa por ouvir. Aqui a consulta tem tempo, a explicação é clara e o atendimento acolhe desde a recepção.',
    servicos: [S('Consultas', 'Avaliação completa, com tempo para ouvir você e tirar as dúvidas.'), S('Exames', 'Orientação sobre os exames necessários e acompanhamento dos resultados.'),
      S('Check-up', 'Acompanhamento preventivo para cuidar da saúde antes do problema.'), S('Acompanhamento', 'Retornos e seguimento do tratamento, com orientação a cada etapa.'),
      S('Atendimento para a família', 'Cuidado para diferentes idades, conforme a especialidade.'), S('Orientação e prevenção', 'Informação clara para você decidir com segurança.')],
    diferenciais: [I('Escuta atenta', 'Você é ouvido antes de qualquer conduta.'), I('Explicação clara', 'Cada etapa explicada sem termos difíceis.'), I('Agendamento fácil', 'Marque pelo WhatsApp, sem ficar preso ao telefone.'), I('Ambiente acolhedor', 'Um espaço pensado para o seu conforto.')],
    passos: [I('Agende', 'Chame pelo WhatsApp e escolha o melhor dia e horário.'), I('Seja atendido', 'Venha no horário marcado e conte o que está sentindo.'), I('Acompanhe', 'Receba a orientação e combine os próximos passos.')],
    faq: [P('Como agendo uma consulta?', 'Pelo botão de WhatsApp desta página: escolha o dia e o horário que preferir.'), P('Vocês atendem por convênio?', 'Confirme pelo WhatsApp quais convênios são aceitos e as condições.'), P('Preciso levar algum documento?', 'Leve um documento com foto e, se tiver, exames e receitas anteriores.'), P('Posso remarcar ou cancelar?', 'Pode. Avise com antecedência pelo WhatsApp para liberar o horário a outra pessoa.'), P('Qual o endereço e o horário de atendimento?', 'Estão na seção de contato logo abaixo, com o caminho no mapa.')],
    imagens: ['clínica médica consultório', 'médico atendimento', 'medical clinic doctor', 'health care'],
  },
  {
    id: 'nutricao', nome: 'Nutrição e nutricionistas', prioritario: true,
    chaves: ['nutricion', 'nutricao', 'nutri', 'dietista', 'reeducacao alimentar'],
    schema: 'MedicalBusiness', layout: 'natural', paleta: { primaria: '#2f6b3f', destaque: '#c9741f' },
    cta: { principal: 'Agendar consulta', secundario: 'Como funciona' },
    etiqueta: 'Alimentação com orientação profissional',
    titulos: ['Comer bem pode ser simples e prazeroso', 'Tenha um plano alimentar pensado para a sua rotina', 'Cuide da sua alimentação com orientação de verdade'],
    subtitulo: 'Atendimento individual, orientação clara e agendamento fácil pelo WhatsApp.',
    sobre: 'Alimentação não é igual para todo mundo. Aqui a consulta olha a sua rotina, os seus objetivos e a sua saúde para montar um caminho possível de seguir.',
    servicos: [S('Consulta nutricional', 'Avaliação da rotina, dos hábitos e dos objetivos, com tempo para ouvir você.'), S('Plano alimentar', 'Orientação individual, adaptada à sua rotina e às suas preferências.'),
      S('Reeducação alimentar', 'Mudança de hábitos com acompanhamento, sem soluções milagrosas.'), S('Acompanhamento e retornos', 'Ajustes ao longo do caminho, conforme a sua evolução.'),
      S('Alimentação no dia a dia', 'Dicas práticas de compras, preparo e organização das refeições.'), S('Dúvidas e mitos', 'Orientação clara para separar informação confiável de modismo.')],
    diferenciais: [I('Plano individual', 'Nada de modelo pronto: o plano parte da sua realidade.'), I('Escuta atenta', 'Sua rotina, seus gostos e seus limites entram na conversa.'), I('Explicação clara', 'Você entende o porquê de cada orientação.'), I('Agendamento fácil', 'Marque pelo WhatsApp, sem complicação.')],
    passos: [I('Agende', 'Chame pelo WhatsApp e escolha o melhor dia e horário.'), I('Conte sua rotina', 'Na consulta, conversamos sobre hábitos, objetivos e saúde.'), I('Siga o plano', 'Receba a orientação e combine os retornos para ajustar.')],
    faq: [P('Como agendo uma consulta?', 'Pelo botão de WhatsApp desta página: escolha o dia e o horário que preferir.'), P('Preciso levar exames?', 'Se tiver exames recentes, leve ou envie antes da consulta. Se não tiver, confirme pelo WhatsApp como proceder.'), P('A consulta é presencial ou online?', 'Confirme pelo WhatsApp as opções de atendimento disponíveis.'), P('Vocês atendem por convênio?', 'Confirme pelo WhatsApp quais convênios são aceitos e as condições.'), P('Qual o endereço e o horário de atendimento?', 'Estão na seção de contato logo abaixo, com o caminho no mapa.')],
    imagens: ['nutrição alimentação saudável', 'frutas legumes', 'healthy food', 'nutritionist'],
  },
  {
    id: 'fisioterapia', nome: 'Fisioterapia e reabilitação', prioritario: true,
    chaves: ['fisioterap', 'reabilit', 'quiropr', 'osteopat'],
    schema: 'MedicalBusiness', layout: 'natural', paleta: { primaria: '#1d6b7a', destaque: '#c9672a' },
    cta: { principal: 'Agendar avaliação', secundario: 'Como chegar' },
    etiqueta: 'Avaliação individual antes de tratar',
    titulos: ['Volte a se mover com mais conforto', 'Cuide da dor e recupere o seu movimento', 'Tratamento acompanhado, no seu ritmo'],
    subtitulo: 'Avaliação individual, tratamento explicado em cada etapa e agendamento fácil pelo WhatsApp.',
    sobre: 'Cada corpo responde de um jeito. Aqui o tratamento começa por uma avaliação e é ajustado ao longo do caminho.',
    servicos: [S('Avaliação fisioterapêutica', 'Entendemos onde dói, o que limita o seu dia e o que você quer voltar a fazer.'), S('Tratamento da dor', 'Técnicas indicadas para o seu caso, explicadas antes de começar.'),
      S('Reabilitação', 'Recuperação após lesão, cirurgia ou período sem movimento.'), S('Exercícios terapêuticos', 'Movimentos orientados para fortalecer e dar mais estabilidade.'),
      S('Orientação de postura e rotina', 'Ajustes simples no dia a dia para aliviar e prevenir.'), S('Acompanhamento', 'Reavaliações para ajustar o tratamento conforme a sua evolução.')],
    diferenciais: [I('Avaliação primeiro', 'O tratamento parte do seu caso, não de um protocolo pronto.'), I('Explicação clara', 'Você entende o que será feito e por quê.'), I('Atenção ao seu ritmo', 'O plano respeita o seu limite e a sua rotina.'), I('Agendamento fácil', 'Marque pelo WhatsApp, sem ficar preso ao telefone.')],
    passos: [I('Agende a avaliação', 'Chame pelo WhatsApp e escolha o horário.'), I('Receba o plano', 'Explicamos o que foi encontrado e como será o tratamento.'), I('Acompanhe a evolução', 'Sessões e reavaliações para ajustar o caminho.')],
    faq: [P('Preciso de pedido médico?', 'Confirme pelo WhatsApp se o seu caso exige pedido ou indicação médica.'), P('Quantas sessões vou precisar?', 'Depende da avaliação: o plano e a frequência são definidos individualmente.'), P('Vocês atendem por convênio?', 'Confirme pelo WhatsApp quais convênios são aceitos e as condições.'), P('Como agendo a avaliação?', 'Pelo botão de WhatsApp desta página: escolha o dia e o horário que preferir.'), P('Qual o endereço e o horário de atendimento?', 'Estão na seção de contato logo abaixo, com o caminho no mapa.')],
    imagens: ['fisioterapia tratamento', 'alongamento reabilitação', 'physical therapy', 'physiotherapy'],
  },
  {
    id: 'odonto', nome: 'Dentista e odontologia', prioritario: true,
    chaves: ['odonto', 'dentista', 'ortodont', 'implante dent', 'implantod', 'endodont', 'periodont', 'clareamento dent', 'protetic', 'bucomaxilo', 'odontopediatr'],
    schema: 'Dentist', layout: 'sorriso', paleta: { primaria: '#1e6fd9', destaque: '#18b8a4' },
    cta: { principal: 'Agendar avaliação', secundario: 'Como chegar' },
    etiqueta: 'Sorrisos cuidados com atenção',
    titulos: ['Cuide do seu sorriso sem medo', 'Um sorriso saudável começa com uma boa avaliação', 'Odontologia que devolve a vontade de sorrir'],
    subtitulo: 'Tratamentos explicados com calma, agendamento rápido pelo WhatsApp e um atendimento que respeita o seu tempo.',
    sobre: 'Ir ao dentista pode ser tranquilo. Aqui você entende cada etapa do tratamento, tira as dúvidas e decide com segurança.',
    servicos: [S('Avaliação e limpeza', 'Prevenção e cuidado de rotina para manter a saúde bucal em dia.'), S('Restaurações', 'Tratamento de cáries com atenção ao conforto.'),
      S('Clareamento', 'Opções para um sorriso mais claro, indicadas após avaliação.'), S('Ortodontia', 'Avaliação e acompanhamento do alinhamento dos dentes.'),
      S('Implantes e próteses', 'Soluções para repor dentes, com planejamento individual.'), S('Urgência odontológica', 'Em caso de dor, chame pelo WhatsApp para orientação.')],
    diferenciais: [I('Sem pressa', 'Tempo para explicar e tirar as dúvidas antes do tratamento.'), I('Plano claro', 'Você sabe o que será feito, em quais etapas.'), I('Atendimento humano', 'Cuidado com o conforto de quem tem receio.'), I('Agendamento simples', 'Escolha o horário pelo WhatsApp.')],
    passos: [I('Agende a avaliação', 'Chame pelo WhatsApp e escolha o horário.'), I('Receba o plano', 'Explicamos o que precisa ser feito e as opções.'), I('Inicie o tratamento', 'Com calma, no seu ritmo e com acompanhamento.')],
    faq: [P('A primeira consulta dói?', 'A avaliação é tranquila. Se tiver receio, conte na hora: o atendimento é adaptado ao seu conforto.'), P('Vocês atendem convênio?', 'Confirme pelo WhatsApp os convênios aceitos e as condições.'), P('Posso parcelar o tratamento?', 'Consulte as formas de pagamento disponíveis pelo WhatsApp.'), P('Atendem urgência?', 'Em caso de dor, chame pelo WhatsApp para orientação sobre o melhor horário.'), P('Atendem crianças?', 'Confirme pelo WhatsApp a faixa etária atendida.')],
    imagens: ['dentista sorriso', 'consultório odontológico', 'dentist smile', 'dental clinic'],
  },
  {
    id: 'psicologia', nome: 'Psicologia e terapias', prioritario: true,
    chaves: ['psicolog', 'terapeut', 'psicanal', 'neuropsic', 'psicopedag', 'fonoaudi', 'terapia', 'acupunt', 'massoterap', 'reiki', 'hipnoter', 'naturopat', 'constelac'],
    schema: 'MedicalBusiness', layout: 'natural', paleta: { primaria: '#5b7fa6', destaque: '#c58b6b' },
    cta: { principal: 'Marcar uma conversa', secundario: 'Saiba mais' },
    etiqueta: 'Atendimento com sigilo e acolhimento',
    titulos: ['Um espaço seguro para cuidar de você', 'Conversar pode ser o primeiro passo', 'Você merece ser ouvido, sem pressa e sem julgamento'],
    subtitulo: 'Atendimento com sigilo, respeito ao seu tempo e agendamento discreto pelo WhatsApp.',
    sobre: 'Procurar ajuda é um ato de cuidado. Aqui você encontra escuta, respeito e um ambiente seguro para falar do que importa.',
    servicos: [S('Atendimento individual', 'Sessões para você, no seu ritmo, com acolhimento e sigilo.'), S('Atendimento online', 'Sessões por vídeo, para quem prefere conforto ou mora longe.'),
      S('Orientação de pais', 'Apoio para famílias que buscam entender e acompanhar os filhos.'), S('Acompanhamento contínuo', 'Processo com regularidade e metas combinadas.')],
    diferenciais: [I('Sigilo', 'O que é dito na sessão fica na sessão.'), I('Sem julgamentos', 'Escuta respeitosa, no seu tempo.'), I('Flexibilidade', 'Presencial ou online, conforme a sua rotina.'), I('Primeiro contato leve', 'Uma conversa inicial para entender se faz sentido.')],
    passos: [I('Entre em contato', 'Mande uma mensagem, sem compromisso.'), I('Converse', 'Uma primeira conversa para entender sua necessidade.'), I('Comece no seu ritmo', 'Combinamos dia, horário e formato.')],
    faq: [P('Como funciona a primeira sessão?', 'É uma conversa para nos conhecermos e entender o que você busca. Sem pressa e sem julgamento.'), P('As sessões são sigilosas?', 'Sim. O sigilo é parte essencial do trabalho.'), P('Atendem online?', 'Confirme pelo WhatsApp a disponibilidade de sessões por vídeo.'), P('Qual a duração e a frequência?', 'Combinamos na primeira conversa, conforme a sua necessidade.'), P('Como agendar?', 'Pelo botão de WhatsApp: escolhemos o melhor horário para você.')],
    imagens: ['psicologia acolhimento', 'consultório terapia', 'therapy counseling', 'calm room'],
  },
  {
    id: 'estetica', nome: 'Estética, salão e barbearia', prioritario: true,
    chaves: ['estetic', 'salao de beleza', 'salao de noiva', 'tatuador', 'salao unissex', 'salao feminino', 'salao masculino', 'barbearia', 'barbeiro', 'manicure', 'cabeleir', 'beleza', 'sobrancelha', 'depila', 'spa', 'massag', 'cilios', 'unhas', 'maquiador', 'micropigment', 'podolog', 'tatuag', 'piercing', 'bronzeamento', 'extensao capilar', 'tricolog', 'escovaria'],
    schema: 'BeautySalon', layout: 'ritual', paleta: { primaria: '#8a3f5d', destaque: '#d9a35b' },
    cta: { principal: 'Agendar horário', secundario: 'Ver serviços' },
    etiqueta: 'Horário marcado, sem espera',
    titulos: ['Realce o que você tem de melhor', 'Beleza e cuidado, no seu horário', 'Seu momento de cuidado, só seu'],
    subtitulo: 'Serviços feitos com atenção ao detalhe e agendamento fácil pelo WhatsApp.',
    sobre: 'Sair daqui se sentindo bem é o que importa. Cuidamos de cada detalhe, do atendimento ao resultado.',
    servicos: [S('Cabelo', 'Corte, coloração e tratamentos para cada tipo de fio.'), S('Unhas', 'Manicure e pedicure com cuidado e higiene.'), S('Sobrancelhas e cílios', 'Design e cuidado que valorizam o olhar.'),
      S('Estética facial e corporal', 'Procedimentos indicados após avaliação.'), S('Barba e acabamento', 'Para quem gosta de estar sempre em dia.'), S('Pacotes e noivas', 'Combine uma experiência completa para o seu dia especial.')],
    diferenciais: [I('Hora marcada', 'Você é atendida no horário combinado.'), I('Higiene e cuidado', 'Materiais preparados com atenção.'), I('Atenção ao detalhe', 'O resultado é pensado para você.'), I('Atendimento próximo', 'A gente lembra do que você gosta.')],
    passos: [I('Escolha o serviço', 'Veja as opções abaixo ou tire dúvidas pelo WhatsApp.'), I('Agende', 'Combine o melhor dia e horário.'), I('Aproveite', 'Venha relaxar e sair se sentindo bem.')],
    faq: [P('Como agendo?', 'Pelo WhatsApp: informe o serviço e o melhor dia e horário.'), P('Preciso confirmar o horário?', 'Confirmamos pelo WhatsApp um pouco antes do atendimento.'), P('Vocês atendem noivas e eventos?', 'Chame no WhatsApp para combinar data e serviços.'), P('Quais as formas de pagamento?', 'Consulte pelo WhatsApp as formas aceitas.'), P('Posso remarcar?', 'Pode. Avise com antecedência pelo WhatsApp.')],
    imagens: ['salão de beleza', 'barbearia', 'beauty salon', 'barber shop'],
  },
  {
    id: 'academia', nome: 'Academia e treino',
    chaves: ['academia', 'pilates', 'crossfit', 'personal', 'fitness', 'muscula', 'yoga', 'danca', 'natacao', 'treino', 'jiu', 'boxe', 'muay', 'karate', 'judo', 'capoeira', 'funcional', 'ginastica', 'spinning', 'hidroginastica', 'assessoria esportiva', 'assessoria de corrida', 'quadra', 'escolinha', 'beach tennis', 'padel', 'society', 'clube de tenis', 'clube de teni', 'arena esportiva', 'patinacao', 'escalada', 'clube esportivo'],
    schema: 'HealthClub', layout: 'impacto', paleta: { primaria: '#e0451f', destaque: '#facc15' },
    cta: { principal: 'Quero uma aula experimental', secundario: 'Ver modalidades' },
    etiqueta: 'Comece hoje',
    titulos: ['Treine com orientação e resultado', 'O primeiro passo é o mais importante', 'Sua melhor versão começa hoje'],
    subtitulo: 'Treino com acompanhamento, ambiente motivador e horários que cabem na sua rotina.',
    sobre: 'Treinar é mais fácil com orientação e um ambiente que motiva. Aqui você é acompanhado e evolui no seu ritmo.',
    servicos: [S('Musculação', 'Treino orientado, com acompanhamento dos professores.'), S('Aulas coletivas', 'Variedade de modalidades para treinar em grupo.'), S('Treino personalizado', 'Plano pensado para o seu objetivo e a sua rotina.'),
      S('Avaliação física', 'Ponto de partida para acompanhar a sua evolução.'), S('Planos flexíveis', 'Consulte as opções pelo WhatsApp.'), S('Aula experimental', 'Conheça o espaço e as aulas antes de decidir.')],
    diferenciais: [I('Orientação de verdade', 'Equipe que acompanha o seu treino.'), I('Ambiente motivador', 'Espaço pensado para você querer voltar.'), I('Horários variados', 'Opções para manhã, tarde e noite.'), I('Comece sem compromisso', 'Conheça com uma aula experimental.')],
    passos: [I('Conheça', 'Peça sua aula experimental pelo WhatsApp.'), I('Escolha seu plano', 'Veja a modalidade e o horário ideais.'), I('Treine', 'Comece com acompanhamento desde o primeiro dia.')],
    faq: [P('Posso fazer uma aula experimental?', 'Consulte pelo WhatsApp a disponibilidade e os horários.'), P('Preciso ter experiência?', 'Não. Atendemos iniciantes e quem já treina, com orientação.'), P('Quais os planos e valores?', 'Chame no WhatsApp para receber as opções atualizadas.'), P('Vocês têm avaliação física?', 'Confirme pelo WhatsApp a disponibilidade e como funciona.'), P('Quais os horários?', 'Estão na seção de contato e podem ser confirmados pelo WhatsApp.')],
    imagens: ['academia treino', 'musculação', 'gym workout', 'fitness class'],
  },
  {
    id: 'advocacia', nome: 'Advocacia',
    chaves: ['advoca', 'advogad', 'juridic', 'direito', 'mediacao', 'arbitragem', 'perito', 'pericia'],
    schema: 'LegalService', layout: 'classico', paleta: { primaria: '#1b2a4a', destaque: '#b08d57' },
    cta: { principal: 'Falar com um advogado', secundario: 'Áreas de atuação' },
    etiqueta: 'Atendimento sigiloso',
    titulos: ['Orientação jurídica clara, com respeito ao seu caso', 'Seus direitos explicados sem complicação', 'Advocacia atenta ao que importa no seu caso'],
    subtitulo: 'Atendimento individual, linguagem simples e um primeiro contato para entender o seu caso.',
    sobre: 'Cada caso tem a sua história. Aqui o atendimento é próximo, a explicação é clara e a atuação segue a ética da profissão.',
    servicos: [S('Direito de família', 'Orientação em divórcio, guarda, pensão e partilha.'), S('Direito do trabalho', 'Análise de direitos e acompanhamento de demandas trabalhistas.'), S('Direito previdenciário', 'Orientação sobre benefícios e aposentadoria.'),
      S('Direito civil e do consumidor', 'Contratos, cobranças e problemas com produtos e serviços.'), S('Direito imobiliário', 'Compra, venda, locação e regularização de imóveis.'), S('Consultoria preventiva', 'Análise de documentos e contratos antes do problema.')],
    diferenciais: [I('Sigilo profissional', 'Seu caso é tratado com total discrição.'), I('Linguagem simples', 'Você entende o que está acontecendo.'), I('Atendimento próximo', 'Contato direto para tirar dúvidas.'), I('Análise individual', 'Cada caso recebe estratégia própria.')],
    passos: [I('Entre em contato', 'Conte o seu caso pelo WhatsApp.'), I('Análise inicial', 'Avaliamos a situação e explicamos as possibilidades.'), I('Acompanhamento', 'Você é informado a cada etapa do processo.')],
    faq: [P('Como funciona o primeiro contato?', 'Você conta o seu caso pelo WhatsApp e combinamos uma conversa para avaliar a situação.'), P('Atendem online?', 'Confirme pelo WhatsApp as opções de atendimento remoto.'), P('Quais documentos devo reunir?', 'Depende do caso. Informamos a lista no primeiro contato.'), P('O atendimento é sigiloso?', 'Sim. O sigilo profissional é um dever da advocacia.'), P('Quanto tempo leva?', 'Varia conforme o caso e o andamento da Justiça. Explicamos na análise inicial.')],
    imagens: ['advocacia escritório', 'balança justiça', 'law office', 'lawyer meeting'],
  },
  {
    id: 'contabilidade', nome: 'Contabilidade',
    chaves: ['contab', 'contad', 'fiscal', 'bpo', 'abertura de empresa', 'auditoria', 'tribut', 'consultoria tributaria', 'consultoria fiscal'],
    schema: 'AccountingService', layout: 'classico', paleta: { primaria: '#0f4c5c', destaque: '#e08e45' },
    cta: { principal: 'Pedir um orçamento', secundario: 'Nossos serviços' },
    etiqueta: 'Contabilidade sem dor de cabeça',
    titulos: ['Contabilidade que cuida do seu negócio', 'Menos burocracia, mais tempo para vender', 'O contador que o seu negócio merece'],
    subtitulo: 'Abertura de empresa, impostos e obrigações em dia, com atendimento que explica em linguagem simples.',
    sobre: 'Quem empreende precisa de tranquilidade com os números. Cuidamos da parte fiscal para você cuidar do negócio.',
    servicos: [S('Abertura de empresa', 'Orientação e registro, do tipo de empresa ao CNPJ.'), S('Contabilidade mensal', 'Escrituração, impostos e obrigações em dia.'), S('MEI e pequenas empresas', 'Acompanhamento adequado ao porte do seu negócio.'),
      S('Folha de pagamento', 'Rotinas de funcionários e encargos.'), S('Planejamento tributário', 'Análise para escolher o melhor enquadramento.'), S('Regularização', 'Ajuda para colocar pendências em ordem.')],
    diferenciais: [I('Prazos em dia', 'Obrigações acompanhadas para evitar multas.'), I('Linguagem simples', 'Você entende o que paga e por quê.'), I('Atendimento direto', 'Dúvidas resolvidas pelo WhatsApp.'), I('Visão do seu negócio', 'Orientação além da guia de imposto.')],
    passos: [I('Conversa inicial', 'Entendemos o seu negócio e o que você precisa.'), I('Proposta', 'Você recebe as condições, sem surpresa.'), I('Contabilidade em dia', 'Cuidamos das rotinas e avisamos o que importa.')],
    faq: [P('Atendem MEI?', 'Confirme pelo WhatsApp as condições para o seu caso.'), P('Como funciona a abertura de empresa?', 'Entendemos a sua atividade, indicamos o enquadramento e cuidamos do registro.'), P('Posso trocar de contador?', 'Pode. Cuidamos da transição para não haver pendências.'), P('Como recebo meus documentos e guias?', 'Combinamos o melhor formato na contratação.'), P('Como peço um orçamento?', 'Pelo WhatsApp, contando o tipo e o porte do seu negócio.')],
    imagens: ['contabilidade escritório', 'calculadora documentos', 'accounting office', 'business papers'],
  },
  {
    id: 'imobiliaria', nome: 'Imobiliária e corretor',
    chaves: ['imobiliaria', 'corretor', 'imoveis', 'imovel', 'incorporadora', 'loteamento', 'loteadora', 'construtora', 'condominio', 'galpao', 'lancamento imobiliario', 'home stag', 'consultor imobiliario', 'sala comercial', 'laudo', 'vistoria tecnica'],
    schema: 'RealEstateAgent', layout: 'escritorio', paleta: { primaria: '#13405b', destaque: '#d6a03c' },
    cta: { principal: 'Falar com um corretor', secundario: 'Ver imóveis' },
    etiqueta: 'Atendimento personalizado',
    titulos: ['O imóvel certo, sem dor de cabeça', 'Comprar, vender ou alugar com segurança', 'Seu próximo endereço começa aqui'],
    subtitulo: 'Atendimento próximo, orientação em cada etapa e agilidade para você decidir com segurança.',
    sobre: 'Negociar um imóvel é uma decisão importante. Aqui você tem acompanhamento do início à entrega das chaves.',
    servicos: [S('Venda de imóveis', 'Avaliação, divulgação e acompanhamento da negociação.'), S('Compra', 'Busca orientada pelo seu perfil e orçamento.'), S('Locação', 'Intermediação segura entre proprietário e inquilino.'),
      S('Avaliação', 'Estimativa de valor com base no mercado da região.'), S('Documentação', 'Orientação sobre a papelada de cada etapa.'), S('Administração de imóveis', 'Cuidado com o imóvel enquanto você cuida da vida.')],
    diferenciais: [I('Acompanhamento completo', 'Do primeiro contato à entrega das chaves.'), I('Conhecimento da região', 'Orientação sobre bairros e valores.'), I('Transparência', 'Você sabe cada passo e custo da negociação.'), I('Agilidade', 'Respostas rápidas pelo WhatsApp.')],
    passos: [I('Conte o que procura', 'Perfil, região e orçamento.'), I('Veja as opções', 'Apresentamos imóveis que combinam com você.'), I('Feche com segurança', 'Cuidamos da negociação e da documentação.')],
    faq: [P('Como avalio o meu imóvel para vender?', 'Chame pelo WhatsApp para combinar uma avaliação.'), P('Vocês ajudam com financiamento?', 'Orientamos o caminho. Confirme as condições no primeiro contato.'), P('Quais documentos preciso para alugar ou vender?', 'Depende do caso. Enviamos a lista no atendimento.'), P('Atendem em quais regiões?', 'Consulte pelo WhatsApp as regiões atendidas.'), P('Posso marcar uma visita?', 'Pode. Combine o melhor dia e horário pelo WhatsApp.')],
    imagens: ['imóvel casa', 'apartamento moderno', 'real estate house', 'modern home'],
  },
  {
    id: 'oficina', nome: 'Oficina mecânica e auto center',
    chaves: ['oficina', 'mecanic', 'auto center', 'autocenter', 'funilaria', 'lava jato', 'lavajato', 'borracharia', 'pneus', 'auto pecas', 'autopecas', 'estetica automotiva', 'auto eletric', 'martelinho', 'retifica', 'alinhamento', 'insulfilm', 'som automotivo', 'autoeletric', 'cambio automatico', 'escapamento', 'suspensao', 'freio', 'lanternagem', 'vidro automotivo', 'troca de oleo', 'pecas para caminhao', 'lavagem de carro', 'centro automotivo', 'vistoria veicular', 'adesivo automotivo', 'pintura automotiva', 'bicicletaria', 'estacionamento', 'guincho', 'reboque'],
    schema: 'AutoRepair', layout: 'oficina', paleta: { primaria: '#c2410c', destaque: '#facc15' },
    cta: { principal: 'Pedir orçamento', secundario: 'Como chegar' },
    etiqueta: 'Orçamento sem compromisso',
    titulos: ['Seu carro em boas mãos, sem susto na conta', 'Conserto honesto, orçamento claro', 'A oficina em que você confia de olhos fechados'],
    subtitulo: 'Diagnóstico explicado, orçamento antes do serviço e acompanhamento pelo WhatsApp.',
    sobre: 'Confiança é tudo em uma oficina. Aqui você sabe o que o carro tem, o que será feito e quanto vai custar antes de começar.',
    servicos: [S('Mecânica geral', 'Revisão, freios, suspensão e motor, com diagnóstico claro.'), S('Troca de óleo e filtros', 'Manutenção preventiva para evitar problemas.'), S('Elétrica e injeção', 'Diagnóstico de falhas e reparo.'),
      S('Freios e suspensão', 'Segurança em primeiro lugar.'), S('Alinhamento e balanceamento', 'Mais conforto e durabilidade dos pneus.'), S('Ar-condicionado', 'Manutenção e higienização.')],
    diferenciais: [I('Orçamento antes', 'Você aprova antes de qualquer serviço.'), I('Explicação clara', 'Mostramos o que foi encontrado.'), I('Acompanhe pelo WhatsApp', 'Atualizações do serviço sem ligar.'), I('Peças com procedência', 'Informamos as opções disponíveis.')],
    passos: [I('Conte o problema', 'Por WhatsApp ou aqui na oficina.'), I('Receba o orçamento', 'Com o que será feito e o valor.'), I('Retire o carro', 'Pronto, testado e explicado.')],
    faq: [P('Vocês fazem orçamento?', 'Sim. Chame no WhatsApp ou traga o veículo para avaliação.'), P('Quanto tempo leva o serviço?', 'Depende do reparo. Informamos o prazo junto com o orçamento.'), P('Dão garantia do serviço?', 'Pergunte pelo WhatsApp: informamos as condições de cada serviço.'), P('Aceitam cartão?', 'Consulte as formas de pagamento pelo WhatsApp.'), P('Posso acompanhar o conserto?', 'Pode. Combinamos a melhor forma de você acompanhar.')],
    imagens: ['oficina mecânica', 'mecânico carro', 'car repair', 'auto mechanic'],
  },
  {
    id: 'pet', nome: 'Pet shop e veterinária', prioritario: true,
    chaves: ['pet', 'veterin', 'banho e tosa', 'agropet', 'racao', 'adestr', 'canil', 'gatil', 'gati', 'cani', 'aquario', 'passeador', 'taxi dog', 'hotel para pet', 'creche para pet', 'pet sitter'],
    schema: 'PetStore', layout: 'patinhas', paleta: { primaria: '#2a7de1', destaque: '#f5a524' },
    cta: { principal: 'Agendar banho ou consulta', secundario: 'Ver serviços' },
    etiqueta: 'Cuidado de quem ama pets',
    titulos: ['Quem ama pet cuida com a gente', 'Banho, saúde e carinho para o seu melhor amigo', 'O cantinho preferido do seu pet'],
    subtitulo: 'Banho e tosa, consultas e tudo para o seu pet, com agendamento fácil pelo WhatsApp.',
    sobre: 'Pet é da família. Cuidamos dele com paciência, higiene e atenção, para você deixar com tranquilidade.',
    servicos: [S('Banho e tosa', 'Com carinho e cuidado com o bem-estar do animal.'), S('Consultas veterinárias', 'Avaliação e acompanhamento da saúde do seu pet.'), S('Vacinas', 'Orientação sobre o calendário de vacinação.'),
      S('Ração e acessórios', 'Produtos para a rotina do seu pet.'), S('Hospedagem e creche', 'Confirme a disponibilidade pelo WhatsApp.'), S('Leva e traz', 'Consulte a região atendida.')],
    diferenciais: [I('Atenção ao bem-estar', 'Cada pet é tratado com paciência.'), I('Higiene', 'Cuidado com o ambiente e os materiais.'), I('Agendamento fácil', 'Marque pelo WhatsApp.'), I('Orientação ao tutor', 'Dicas para o dia a dia do seu pet.')],
    passos: [I('Agende', 'Escolha o serviço e o horário pelo WhatsApp.'), I('Deixe com a gente', 'Cuidamos do seu pet com atenção.'), I('Busque feliz', 'Avisamos quando estiver pronto.')],
    faq: [P('Como agendo o banho?', 'Pelo WhatsApp: informe o porte e a raça do pet e o melhor horário.'), P('Atendem gatos?', 'Confirme pelo WhatsApp os serviços disponíveis para cada espécie.'), P('Têm veterinário?', 'Consulte a disponibilidade de consultas pelo WhatsApp.'), P('Fazem leva e traz?', 'Consulte a região atendida pelo WhatsApp.'), P('Preciso levar a carteirinha de vacina?', 'Para alguns serviços, sim. Confirme pelo WhatsApp.')],
    imagens: ['pet shop cachorro', 'banho e tosa', 'dog grooming', 'puppy'],
  },
  {
    id: 'loja-moda', nome: 'Loja de roupas e acessórios',
    chaves: ['roupa', 'moda', 'boutique', 'vestuario', 'calcado', 'sapato', 'acessorio', 'lingerie', 'jeans', 'bolsa', 'brecho', 'enxoval', 'semijoia', 'joalheria', 'otica'],
    schema: 'ClothingStore', layout: 'estudio', paleta: { primaria: '#1f1f1f', destaque: '#c9a227' },
    cta: { principal: 'Ver novidades no WhatsApp', secundario: 'Como chegar' },
    etiqueta: 'Novidades toda semana',
    titulos: ['Estilo que combina com você', 'Peças escolhidas com cuidado', 'Moda que combina com a sua história'],
    subtitulo: 'Veja as novidades, tire dúvidas de tamanho e peça pelo WhatsApp, para retirar ou receber.',
    sobre: 'Vestir bem é se sentir bem. Selecionamos peças com qualidade e atendemos com atenção, sem pressa.',
    servicos: [S('Coleção atual', 'Peças da estação, selecionadas para o seu estilo.'), S('Atendimento personalizado', 'Ajudamos a combinar peças e encontrar o tamanho certo.'), S('Acessórios', 'Detalhes que completam o look.'),
      S('Presentes', 'Sugestões e embrulho para presentear.'), S('Compra pelo WhatsApp', 'Receba fotos e detalhes das peças sem sair de casa.'), S('Trocas', 'Consulte a política pelo WhatsApp.')],
    diferenciais: [I('Seleção curada', 'Peças escolhidas com cuidado.'), I('Atendimento próximo', 'Ajuda real para escolher.'), I('Compre pelo WhatsApp', 'Praticidade para quem não pode passar na loja.'), I('Novidades constantes', 'Siga para ver o que chegou.')],
    passos: [I('Escolha', 'Veja as novidades ou peça sugestões.'), I('Combine', 'Tamanho, cor e forma de pagamento pelo WhatsApp.'), I('Receba ou retire', 'Passe na loja ou combine a entrega.')],
    faq: [P('Como compro pelo WhatsApp?', 'Mande uma mensagem com a peça que quer ver. Enviamos fotos, tamanhos e valores.'), P('Têm provador?', 'Sim, na loja. Se preferir, separamos peças para você experimentar.'), P('Fazem trocas?', 'Consulte a política pelo WhatsApp.'), P('Entregam?', 'Confirme a região e o prazo pelo WhatsApp.'), P('Aceitam cartão?', 'Consulte as formas de pagamento aceitas.')],
    imagens: ['loja de roupas', 'moda feminina', 'fashion store', 'clothing'],
  },
  {
    id: 'construcao', nome: 'Construção, reforma e arquitetura',
    chaves: ['construc', 'reforma', 'marcenaria', 'arquitet', 'engenhar', 'pintura', 'gesso', 'moveis planejados', 'serralheria', 'vidracaria', 'pedreiro', 'empreiteira', 'paisagismo', 'piscina', 'material de construcao', 'marmoraria', 'energia solar', 'decoracao', 'interiores', 'pintor', 'telhado', 'cobertura', 'esquadria', 'toldo', 'piso', 'papel de parede', 'forro', 'drywall', 'vidro temperado', 'box para banheiro', 'granito', 'revestimento', 'ceramica', 'vidraceir', 'gesseiro', 'demolicao', 'olaria', 'calha', 'concreteira', 'terraplanagem', 'poco artesiano', 'cacamba', 'container', 'casa pre', 'steel frame', 'pre moldado', 'estrutura metalica', 'topografia', 'projeto estrutural', 'mestre de obra', 'paisagista', 'portao', 'churrasqueira', 'lareira', 'elevador', 'marceneir', 'tapeceir', 'decorador', 'madeireira', 'ferragem', 'instalacao eletrica', 'instalacao hidraulica', 'projeto eletrico', 'instalador de painel', 'engenheiro', 'mestres de obra'],
    schema: 'HomeAndConstructionBusiness', layout: 'planta', paleta: { primaria: '#374151', destaque: '#f59e0b' },
    cta: { principal: 'Pedir orçamento', secundario: 'Ver serviços' },
    etiqueta: 'Projeto e obra com acompanhamento',
    titulos: ['Sua obra entregue com capricho e transparência', 'Do projeto à última pincelada', 'Reformas e projetos feitos para durar'],
    subtitulo: 'Orçamento claro, cronograma combinado e acompanhamento do início ao fim.',
    sobre: 'Obra boa tem planejamento, comunicação e acabamento cuidadoso. Você sabe o que será feito e acompanha cada etapa.',
    servicos: [S('Reformas', 'Do pequeno reparo à reforma completa.'), S('Projetos', 'Planejamento para aproveitar melhor cada espaço.'), S('Acabamento', 'Pintura, revestimentos e detalhes que fazem diferença.'),
      S('Instalações', 'Elétrica e hidráulica com segurança.'), S('Marcenaria sob medida', 'Soluções feitas para o seu espaço.'), S('Acompanhamento de obra', 'Visitas e relatórios para você acompanhar.')],
    diferenciais: [I('Orçamento detalhado', 'Você sabe o que está incluído.'), I('Cronograma combinado', 'Etapas e prazos definidos antes de começar.'), I('Comunicação direta', 'Atualizações pelo WhatsApp.'), I('Cuidado com a limpeza', 'Obra organizada do começo ao fim.')],
    passos: [I('Visita e conversa', 'Entendemos o que você quer e conhecemos o local.'), I('Orçamento', 'Proposta clara, com escopo e prazo.'), I('Execução', 'Obra acompanhada até a entrega.')],
    faq: [P('Vocês fazem visita técnica?', 'Combine pelo WhatsApp o melhor dia para visitarmos o local.'), P('Como é feito o orçamento?', 'Após a visita, enviamos uma proposta com escopo, prazo e valor.'), P('Quanto tempo leva uma reforma?', 'Depende do tamanho. O prazo é combinado no orçamento.'), P('Vocês cuidam da compra dos materiais?', 'Combinamos as opções na proposta: por conta do cliente ou intermediada.'), P('Podem ver exemplos de trabalhos anteriores?', 'Pode. Peça pelo WhatsApp que enviamos o que for adequado.')],
    imagens: ['obra reforma', 'construção civil', 'home renovation', 'architecture'],
  },
  {
    id: 'servicos-residenciais', nome: 'Serviços residenciais',
    chaves: ['eletricist', 'encanador', 'dedetiz', 'limpeza', 'ar condicionado', 'chaveiro', 'desentup', 'diarista', 'jardinagem', 'impermeabiliza', 'mudanca', 'frete', 'lavanderia', 'costureir', 'assistencia tecnica', 'manutencao', 'conserto', 'reparo', 'instalacao de tv', 'instalador de antena', 'tecnico em', 'afiacao', 'lavagem de estofado', 'zeladoria', 'poda', 'controle de praga', 'dedetizacao de condominio', 'dedetizadora de condominio', 'sapateir', 'tinturaria', 'atelie de costura', 'assistencia de notebook'],
    schema: 'HomeAndConstructionBusiness', layout: 'oficina', paleta: { primaria: '#1d4ed8', destaque: '#f97316' },
    cta: { principal: 'Chamar agora', secundario: 'Ver serviços' },
    etiqueta: 'Atendimento rápido',
    titulos: ['Problema em casa? Resolvemos rápido', 'Serviço bem feito, com hora combinada', 'Chamou, resolveu: atendimento ágil'],
    subtitulo: 'Chame pelo WhatsApp, combine o horário e receba o atendimento com orçamento antes do serviço.',
    sobre: 'Quando surge um problema, você precisa de alguém que responda e resolva. Aqui o atendimento é direto e o combinado é cumprido.',
    servicos: [S('Atendimento rápido', 'Chame e combine o melhor horário.'), S('Orçamento antes do serviço', 'Você sabe o valor antes de aprovar.'), S('Serviço residencial', 'Soluções para a sua casa.'),
      S('Serviço comercial', 'Atendimento para empresas, lojas e condomínios.'), S('Manutenção preventiva', 'Evite problemas maiores.'), S('Emergências', 'Consulte a disponibilidade pelo WhatsApp.')],
    diferenciais: [I('Resposta rápida', 'Atendimento direto pelo WhatsApp.'), I('Orçamento claro', 'Valor combinado antes de começar.'), I('Pontualidade', 'Horário combinado, horário cumprido.'), I('Serviço limpo e organizado', 'Cuidado com a sua casa.')],
    passos: [I('Chame', 'Conte o problema pelo WhatsApp.'), I('Combine', 'Orçamento e horário do atendimento.'), I('Resolvido', 'Serviço feito e explicado.')],
    faq: [P('Atendem em emergência?', 'Chame pelo WhatsApp para saber a disponibilidade no momento.'), P('Quanto custa?', 'Depende do serviço. Enviamos o orçamento antes de começar.'), P('Qual a região atendida?', 'Consulte pelo WhatsApp se atendemos o seu endereço.'), P('Dão garantia?', 'Pergunte pelo WhatsApp as condições do serviço.'), P('Como pago?', 'Combinamos as formas de pagamento no orçamento.')],
    imagens: ['serviços residenciais', 'manutenção casa', 'home repair', 'plumber electrician'],
  },
  {
    id: 'educacao', nome: 'Escola, cursos e idiomas',
    chaves: ['escola', 'curso', 'idioma', 'ingles', 'autoescola', 'cfc', 'colegio', 'creche', 'faculdade', 'treinamento', 'reforco', 'musica', 'violao', 'berçario', 'bercario', 'pre vestibular', 'escola de fotografia', 'curso de fotografia', 'universidade', 'pos graduacao', 'professor particular', 'robotica', 'educacao especial', 'intercambio', 'curso de barbeiro'],
    schema: 'EducationalOrganization', layout: 'vibrante', paleta: { primaria: '#6d28d9', destaque: '#f59e0b' },
    cta: { principal: 'Quero saber mais', secundario: 'Conhecer a escola' },
    etiqueta: 'Matrículas abertas? Confirme pelo WhatsApp',
    titulos: ['Aprender aqui faz diferença', 'Educação com acompanhamento próximo', 'O lugar certo para aprender de verdade'],
    subtitulo: 'Turmas acompanhadas de perto, professores atenciosos e informações fáceis pelo WhatsApp.',
    sobre: 'Aprender é mais fácil com acompanhamento e um ambiente acolhedor. Conheça o nosso jeito de ensinar.',
    servicos: [S('Turmas e horários', 'Opções que cabem na rotina de cada aluno.'), S('Acompanhamento individual', 'Atenção ao ritmo e às dificuldades de cada um.'), S('Material didático', 'Conteúdo organizado para o aprendizado.'),
      S('Avaliação inicial', 'Para indicar o melhor ponto de partida.'), S('Aula experimental', 'Consulte a disponibilidade pelo WhatsApp.'), S('Atendimento aos responsáveis', 'Comunicação clara com a família.')],
    diferenciais: [I('Turmas acompanhadas', 'Atenção ao desenvolvimento de cada aluno.'), I('Professores atenciosos', 'Ensino com paciência e clareza.'), I('Comunicação com a família', 'Retorno claro sobre o aprendizado.'), I('Informações fáceis', 'Tire dúvidas pelo WhatsApp.')],
    passos: [I('Conheça', 'Fale com a gente e tire as dúvidas.'), I('Escolha a turma', 'Veja o horário e o nível ideais.'), I('Comece', 'Matrícula simples e acompanhamento desde o início.')],
    faq: [P('Como faço a matrícula?', 'Chame pelo WhatsApp: informamos a documentação e os próximos passos.'), P('Posso conhecer antes de decidir?', 'Consulte a disponibilidade de visita ou aula experimental.'), P('Quais os valores?', 'Chame pelo WhatsApp para receber as condições atualizadas.'), P('Quais os horários das turmas?', 'Confirme pelo WhatsApp as turmas disponíveis.'), P('Atendem todas as idades?', 'Informe a idade pelo WhatsApp para indicarmos a turma ideal.')],
    imagens: ['escola sala de aula', 'estudantes', 'classroom students', 'learning'],
  },
  {
    id: 'eventos', nome: 'Eventos, buffet e fotografia',
    chaves: ['evento', 'buffet', 'fotograf', 'cerimonial', 'festa', 'casamento', 'filmagem', 'som e luz', 'espaco de eventos', 'decoracao de festa', 'dj ', 'djs ', 'salao de festa', 'banda', 'sonorizacao', 'palco', 'casa de show', 'cabine fotografica', 'bartender', 'garcom', 'recreacao', 'animacao', 'formatura', 'aluguel de brinquedo', 'aluguel de mesa', 'lembrancinha', 'fogos', 'casa noturna', 'balada', 'karaoke', 'boliche', 'parque de diversao', 'parque aquatico', 'paintball', 'escape room', 'locadora de game', 'lan house', 'aluguel de som', 'churrasqueiro', 'casa de recepcao', 'aluguel de traje', 'atelie de noiva', 'convite', 'aluguel de tenda', 'locacao de louca', 'teatro', 'musico', 'cantor'],
    schema: 'EventVenue', layout: 'estudio', paleta: { primaria: '#7a2e5c', destaque: '#d4a24c' },
    cta: { principal: 'Pedir orçamento', secundario: 'Ver trabalhos' },
    etiqueta: 'Seu evento, do seu jeito',
    titulos: ['Seu grande dia merece cuidado em cada detalhe', 'Eventos que ficam na memória', 'Festas e celebrações que ninguém esquece'],
    subtitulo: 'Conte a data e o tipo de evento, e receba um orçamento pensado para você.',
    sobre: 'Cada celebração é única. Planejamos junto com você, cuidamos dos detalhes e entregamos tranquilidade.',
    servicos: [S('Casamentos', 'Planejamento e execução com atenção ao que importa para o casal.'), S('Aniversários e festas', 'Do infantil ao adulto, no seu estilo.'), S('Eventos corporativos', 'Confraternizações e encontros de empresa.'),
      S('Decoração', 'Ambientação para cada tipo de evento.'), S('Cobertura fotográfica', 'Registro dos momentos importantes.'), S('Pacotes personalizados', 'Montamos a proposta conforme o seu orçamento.')],
    diferenciais: [I('Atenção a cada detalhe', 'Planejamento antes do grande dia.'), I('Proposta personalizada', 'Orçamento conforme a sua necessidade.'), I('Comunicação clara', 'Tudo combinado por escrito.'), I('Equipe presente', 'Acompanhamento no dia do evento.')],
    passos: [I('Conte sobre o evento', 'Data, local e número de convidados.'), I('Receba a proposta', 'Com o que está incluso e o valor.'), I('Aproveite', 'Cuidamos do resto no grande dia.')],
    faq: [P('Com quanta antecedência devo contratar?', 'Quanto antes melhor, para garantir a data. Consulte a disponibilidade pelo WhatsApp.'), P('Como funciona o orçamento?', 'Você informa data, local e convidados e enviamos a proposta.'), P('Posso ver trabalhos anteriores?', 'Pode. Peça pelo WhatsApp que enviamos exemplos.'), P('Atendem em outras cidades?', 'Consulte pelo WhatsApp a região e possíveis custos de deslocamento.'), P('Como reservo a data?', 'Combinamos as condições no contrato.')],
    imagens: ['festa evento', 'casamento decoração', 'wedding party', 'event decoration'],
  },
  {
    id: 'turismo', nome: 'Hotel, pousada e turismo',
    chaves: ['hotel', 'hoteis', 'pousada', 'hospedagem', 'turismo', 'agencia de viagem', 'operadora de turismo', 'hotel fazenda', 'fazenda hotel', 'hostel', 'chale', 'resort', 'camping', 'apart hotel', 'flat', 'pesqueiro', 'hipica', 'marina', 'passeio', 'buggy', 'mergulho', 'rafting', 'ecoturismo', 'parque tematico', 'receptivo', 'transfer', 'passaporte', 'locacao de temporada', 'casa de temporada', 'motel', 'airbnb'],
    schema: 'LodgingBusiness', layout: 'aurora', paleta: { primaria: '#0b6e6e', destaque: '#e7a33e' },
    cta: { principal: 'Reservar pelo WhatsApp', secundario: 'Ver acomodações' },
    etiqueta: 'Reserve direto, sem intermediário',
    titulos: ['Descanse do jeito que você merece', 'Sua estadia começa com um bom acolhimento', 'Hospedagem para descansar de verdade'],
    subtitulo: 'Veja as acomodações, tire dúvidas e reserve direto pelo WhatsApp.',
    sobre: 'Hospedar bem é receber com carinho. Cuidamos do conforto, da limpeza e do atendimento para a sua estadia ser tranquila.',
    servicos: [S('Acomodações', 'Quartos e opções para casal, família e grupos.'), S('Café da manhã', 'Confirme o que está incluso pelo WhatsApp.'), S('Área de lazer', 'Espaços para descansar e se divertir.'),
      S('Passeios e dicas', 'Indicações do que fazer na região.'), S('Reserva direta', 'Fale com a gente e combine datas e condições.'), S('Eventos e grupos', 'Consulte condições para grupos.')],
    diferenciais: [I('Reserva direta', 'Conversa direta, sem intermediário.'), I('Acolhimento', 'Atendimento atencioso do início ao fim.'), I('Conforto', 'Ambientes pensados para o descanso.'), I('Localização', 'Confira o endereço e o mapa abaixo.')],
    passos: [I('Escolha as datas', 'Informe o período e o número de pessoas.'), I('Confirme a reserva', 'Combinamos valores e condições.'), I('Aproveite', 'Chegue e descanse, o resto é com a gente.')],
    faq: [P('Como faço a reserva?', 'Pelo WhatsApp, informando as datas e o número de hóspedes.'), P('O café da manhã está incluso?', 'Confirme pelo WhatsApp o que cada tarifa inclui.'), P('Aceitam pets?', 'Consulte a política pelo WhatsApp.'), P('Qual o horário de entrada e saída?', 'Informamos na confirmação da reserva.'), P('Há estacionamento?', 'Confirme pelo WhatsApp a disponibilidade.')],
    imagens: ['pousada hotel quarto', 'hospedagem', 'hotel room', 'resort pool'],
  },
  {
    id: 'agro', nome: 'Agro e rural',
    chaves: ['agro', 'fazenda', 'rural', 'insumo', 'sementes', 'implement', 'cooperativa agricola', 'cooperativa rural', 'cooperativa de leite', 'haras', 'sitio', 'pecuaria', 'pecuarista', 'avicultura', 'suinocultura', 'piscicultura', 'apicultura', 'cafeicultor', 'trator', 'fertiliz', 'defensivo', 'granja', 'viveiro', 'maquina agricola', 'horta', 'armazem de grao', 'irrigacao', 'drone agricola', 'produtor de leite', 'produtor de hortalica', 'produtor de fruta', 'produtor de mel', 'engenheiro agronomo', 'silvicultura', 'reflorestamento', 'selaria'],
    schema: 'LocalBusiness', layout: 'oficina', paleta: { primaria: '#2f6b3a', destaque: '#d97706' },
    cta: { principal: 'Pedir cotação', secundario: 'Como chegar' },
    etiqueta: 'Atendimento de quem entende do campo',
    titulos: ['Tudo para o campo, com atendimento de confiança', 'Cotação rápida, entrega combinada', 'O parceiro certo para o seu campo'],
    subtitulo: 'Insumos, produtos e orientação para o seu dia a dia, com cotação pelo WhatsApp.',
    sobre: 'No campo, tempo e confiança valem muito. Atendemos com agilidade e conhecimento do que o produtor precisa.',
    servicos: [S('Insumos e produtos', 'Itens para a lavoura e a criação.'), S('Rações e suplementos', 'Opções para diferentes animais.'), S('Ferramentas e equipamentos', 'Para o trabalho no dia a dia.'),
      S('Cotação pelo WhatsApp', 'Peça o preço sem sair da propriedade.'), S('Entrega', 'Consulte a região atendida.'), S('Orientação', 'Ajuda para escolher o produto certo.')],
    diferenciais: [I('Cotação rápida', 'Resposta pelo WhatsApp.'), I('Conhecimento do campo', 'Atendimento de quem entende.'), I('Variedade', 'Produtos para diferentes necessidades.'), I('Entrega combinada', 'Consulte prazos e regiões.')],
    passos: [I('Peça a cotação', 'Diga o produto e a quantidade.'), I('Combine', 'Valores, prazo e forma de pagamento.'), I('Receba ou retire', 'Entrega ou retirada na loja.')],
    faq: [P('Como peço uma cotação?', 'Pelo WhatsApp, informando o produto e a quantidade.'), P('Entregam na propriedade?', 'Consulte a região atendida pelo WhatsApp.'), P('Quais as formas de pagamento?', 'Combinamos no atendimento.'), P('Trabalham com prazo para pagamento?', 'Consulte as condições pelo WhatsApp.'), P('Posso retirar na loja?', 'Pode. Veja o horário e o endereço abaixo.')],
    imagens: ['campo agropecuária', 'fazenda lavoura', 'farm field', 'tractor'],
  },
  {
    id: 'varejo', nome: 'Comércio e varejo em geral',
    chaves: ['loja', 'mercado', 'supermercado', 'papelaria', 'livraria', 'floricultura', 'presente', 'utilidades', 'eletro', 'moveis', 'colchoes', 'informatica', 'celular', 'material', 'distribuidora', 'atacado', 'farmac', 'drogaria', 'acougue', 'hortifruti', 'emporio', 'mercearia', 'peixaria', 'quitanda', 'minimercado', 'atacarejo', 'atacadista', 'conveniencia', 'banca de jornal', 'loterica', 'sebo', 'armarinho', 'tabacaria', 'importadora', 'adega', 'cortina', 'relojoaria', 'perfumaria', 'cosmetic', 'outlet', 'showroom', 'ecommerce', 'e commerce', 'representante comercial', 'loja de decoracao', 'loja de camping', 'instrumento musical', 'surf shop', 'skate shop', 'antiquario', 'galeria de arte'],
    schema: 'Store', layout: 'estudio', paleta: { primaria: '#0f5132', destaque: '#f2a900' },
    cta: { principal: 'Falar no WhatsApp', secundario: 'Como chegar' },
    etiqueta: 'Atendimento na loja e pelo WhatsApp',
    titulos: ['Tudo o que você precisa, com atendimento de verdade', 'Boas escolhas, bom preço e atenção', 'A loja em que você volta sempre'],
    subtitulo: 'Veja o que temos, tire dúvidas e peça pelo WhatsApp, para retirar na loja ou combinar a entrega.',
    sobre: 'Comércio de bairro é feito de confiança. Aqui você encontra o que precisa e é atendido por quem conhece o produto.',
    servicos: [S('Produtos selecionados', 'Variedade pensada para o dia a dia.'), S('Atendimento no balcão', 'Ajuda para escolher o produto certo.'), S('Compra pelo WhatsApp', 'Peça sem sair de casa.'),
      S('Encomendas', 'Não achou? A gente busca para você.'), S('Entrega', 'Consulte a região atendida.'), S('Condições de pagamento', 'Consulte as opções.')],
    diferenciais: [I('Atendimento próximo', 'Gente que conhece o que vende.'), I('Praticidade', 'Peça pelo WhatsApp.'), I('Variedade', 'Opções para diferentes necessidades.'), I('Localização fácil', 'Veja o endereço e o horário abaixo.')],
    passos: [I('Escolha', 'Veja o que precisa ou pergunte pelo WhatsApp.'), I('Combine', 'Valor, pagamento e retirada ou entrega.'), I('Receba', 'Retire na loja ou receba em casa.')],
    faq: [P('Como compro pelo WhatsApp?', 'Mande uma mensagem com o que procura e enviamos opções e valores.'), P('Têm entrega?', 'Consulte a região atendida pelo WhatsApp.'), P('Quais as formas de pagamento?', 'Consulte as opções pelo WhatsApp.'), P('Posso trocar o produto?', 'Consulte a política de troca no atendimento.'), P('Qual o horário de funcionamento?', 'Está na seção de contato, logo abaixo.')],
    imagens: ['loja comércio', 'varejo atendimento', 'retail store', 'shop'],
  },
  {
    id: 'tecnologia-marketing', nome: 'Tecnologia, marketing e serviços profissionais',
    chaves: ['software', 'desenvolv', 'ti ', 'tecnologia', 'marketing', 'agencia', 'publicidade', 'design', 'grafica', 'hospedagem de site', 'consultoria', 'coach', 'treinamento corporativo', 'provedor', 'informatica', 'rh', 'recrutamento', 'seguranca da informacao', 'startup', 'saas', 'erp', 'automacao comercial', 'automacao residencial', 'iot', 'data center', 'criacao de site', 'inteligencia artificial', 'chatbot', 'telecom', 'cabeamento', 'redes e infra', 'telefonia', 'rastreador', 'impressora', 'trafego', 'social media', 'assessoria de imprensa', 'relacoes publicas', 'criador de conteudo', 'copywriter', 'influenciador', 'mentor', 'trabalho temporario', 'palestrante', 'call center', 'telemarketing', 'tradutor', 'traducao', 'interprete', 'franquia', 'escritorio compartilhado', 'escritorio virtual', 'coworking', 'assessoria empresarial', 'certificacoes iso', 'representacoes comerciais', 'produtora de video', 'produtora musical', 'produtora de cinema', 'videomaker', 'podcast', 'estudio de gravacao', 'gravadora', 'editora', 'radio ', 'jornal', 'cinema', 'estudio de design', 'copiadora', 'comunicacao visual', 'letreiro', 'serigrafia', 'estamparia', 'bordado', 'impressao', 'adesivo', 'cartao de visita', 'outdoor', 'midia exterior', 'despachante', 'cartorio', 'registro de marca', 'licenciamento'],
    schema: 'ProfessionalService', layout: 'bento', paleta: { primaria: '#2d3a8c', destaque: '#00b8a9' },
    cta: { principal: 'Pedir uma proposta', secundario: 'Ver serviços' },
    etiqueta: 'Resultado combinado antes de começar',
    titulos: ['Soluções que resolvem o problema de verdade', 'Do briefing à entrega, com acompanhamento', 'O parceiro que o seu negócio precisa'],
    subtitulo: 'Conte o seu desafio e receba uma proposta clara, com escopo, prazo e valor.',
    sobre: 'Bons projetos nascem de entender o problema. Ouvimos, propomos e acompanhamos a entrega com transparência.',
    servicos: [S('Diagnóstico', 'Entendemos o seu cenário antes de propor.'), S('Planejamento', 'Escopo, etapas e prazos combinados.'), S('Execução', 'Entrega acompanhada, com comunicação clara.'),
      S('Suporte', 'Apoio depois da entrega.'), S('Treinamento', 'Para sua equipe usar bem a solução.'), S('Melhoria contínua', 'Ajustes com base nos resultados.')],
    diferenciais: [I('Proposta clara', 'Escopo, prazo e valor por escrito.'), I('Comunicação direta', 'Atualizações no canal que você preferir.'), I('Foco no resultado', 'Decisões ligadas ao seu objetivo.'), I('Transparência', 'Você acompanha cada etapa.')],
    passos: [I('Conversa inicial', 'Entendemos o seu desafio.'), I('Proposta', 'Escopo, prazo e investimento.'), I('Entrega', 'Execução acompanhada e ajustes.')],
    faq: [P('Como funciona a contratação?', 'Conversamos, enviamos a proposta e, aprovada, iniciamos o projeto.'), P('Quanto tempo leva?', 'Depende do escopo. O prazo vem na proposta.'), P('Há suporte após a entrega?', 'Combinamos as condições na proposta.'), P('Como é a comunicação durante o projeto?', 'No canal que você preferir, com retornos regulares.'), P('Posso começar por algo menor?', 'Pode. Conversamos sobre um primeiro passo.')],
    imagens: ['escritório equipe', 'trabalho notebook', 'office team', 'laptop workspace'],
  },
  {
    id: 'concessionaria', nome: 'Concessionária e revenda de veículos',
    chaves: ['concessionaria', 'revenda', 'carros usados', 'veiculos novos', 'veiculo novo', 'seminovo', 'multimarcas', 'automoveis', 'automovel', 'revendedora', 'motos novas', 'veiculos', 'blindagem', 'rastreamento veicular', 'protecao veicular', 'locacao de moto', 'locacao de motorhome'],
    schema: 'AutoDealer', layout: 'showroom', paleta: { primaria: '#b4121b', destaque: '#cbd5e1' },
    cta: { principal: 'Falar com um vendedor', secundario: 'Ver como chegar' },
    etiqueta: 'Atendimento direto pelo WhatsApp',
    titulos: ['Seu próximo carro começa aqui', 'O veículo certo está esperando por você', 'Compre com atendimento de verdade'],
    subtitulo: 'Veículos novos e seminovos, avaliação do seu usado e atendimento direto pelo WhatsApp.',
    sobre: 'Comprar um veículo é uma decisão grande e merece uma conversa clara. Aqui você tira dúvidas, conhece as opções e negocia com transparência.',
    servicos: [S('Veículos novos', 'Consulte as opções disponíveis e as condições do momento.'), S('Seminovos', 'Veículos selecionados, com informações claras sobre cada um.'), S('Avaliação do seu usado', 'Peça a avaliação do seu veículo para usar na negociação.'),
      S('Financiamento', 'Simulação com as condições do momento, sujeita à análise de crédito.'), S('Test drive', 'Consulte a disponibilidade e agende pelo WhatsApp.'), S('Pós-venda', 'Consulte os serviços de acompanhamento disponíveis.')],
    diferenciais: [I('Atendimento direto', 'Fale com um vendedor pelo WhatsApp, sem formulário.'), I('Avaliação transparente', 'Seu usado avaliado, com explicação de como o valor foi pensado.'), I('Documentação orientada', 'Orientação sobre a papelada de cada etapa.'), I('Test drive agendado', 'Combine dia e horário para conhecer o veículo.')],
    passos: [I('Escolha', 'Diga o que procura e veja as opções disponíveis.'), I('Simule', 'Avaliação do usado e financiamento, sujeitos à análise.'), I('Leve', 'Documentação orientada e entrega combinada.')],
    faq: [P('Como sei quais veículos estão disponíveis?', 'O estoque muda com frequência. Chame no WhatsApp e informamos o que há no momento.'), P('Vocês avaliam o meu usado?', 'Consulte pelo WhatsApp: informe modelo, ano e quilometragem para iniciarmos a avaliação.'),
      P('Posso financiar o veículo?', 'Consulte as condições pelo WhatsApp. O financiamento depende de análise de crédito.'), P('Quais documentos preciso para comprar?', 'Depende da forma de pagamento. Orientamos a lista completa no atendimento.'), P('Posso fazer test drive?', 'Consulte a disponibilidade pelo WhatsApp e agende o horário.')],
    imagens: ['concessionária carros', 'car dealership', 'used cars', 'car showroom'],
  },
  {
    id: 'credito', nome: 'Crediário, financeira e crédito',
    chaves: ['crediario', 'credito', 'financeira', 'emprestimo', 'consignado', 'consorcio', 'financiamento', 'microcredito', 'cooperativa de credito', 'fintech', 'correspondente bancario', 'cobranca', 'renegociacao', 'factoring', 'penhor', 'compra de ouro', 'meios de pagamento', 'maquininha', 'casa de cambio'],
    schema: 'FinancialService', layout: 'credito', paleta: { primaria: '#0a6b52', destaque: '#f2b705' },
    cta: { principal: 'Simular pelo WhatsApp', secundario: 'Como funciona' },
    etiqueta: 'Atendimento direto pelo WhatsApp',
    titulos: ['Crédito com condições explicadas antes de contratar', 'Entenda cada etapa e simule pelo WhatsApp', 'Crédito claro, do começo ao fim'],
    subtitulo: 'Tire dúvidas, veja os documentos necessários e faça a sua simulação pelo WhatsApp. Crédito sujeito à análise e aprovação.',
    sobre: 'Contratar crédito exige clareza. Aqui você entende as condições, os prazos e os documentos antes de decidir.',
    servicos: [S('Crediário', 'Consulte as condições para compras a prazo.'), S('Crédito pessoal', 'Consulte as modalidades e condições disponíveis.'), S('Crédito consignado', 'Para quem atende aos requisitos da modalidade; consulte.'),
      S('Financiamento', 'Condições conforme o bem financiado e a análise de crédito.'), S('Simulação', 'Veja como ficaria a parcela antes de decidir.'), S('Renegociação', 'Consulte as possibilidades para organizar pendências.')],
    diferenciais: [I('Condições explicadas', 'Valor, prazo e parcelas apresentados com clareza.'), I('Simulação antes de contratar', 'Você vê como fica antes de decidir.'), I('Atendimento direto', 'Tire dúvidas pelo WhatsApp com quem atende.'), I('Contrato por escrito', 'Tudo o que foi combinado fica registrado no contrato.')],
    passos: [I('Simule', 'Informe o que precisa pelo WhatsApp e veja as condições.'), I('Envie os documentos', 'Orientamos a lista conforme a modalidade.'), I('Receba a resposta', 'A análise define a aprovação e você é avisado do resultado.')],
    faq: [P('Como funciona a análise de crédito?', 'Avaliamos as informações e os documentos enviados. A aprovação depende da análise.'), P('Quais documentos preciso?', 'Em geral, documento com foto, CPF e comprovantes. Confirmamos a lista pelo WhatsApp.'),
      P('Como saber os juros e as parcelas?', 'Dependem da modalidade e da análise. Informamos tudo por escrito antes da contratação.'), P('Posso pagar antes do prazo?', 'Consulte as condições de antecipação da modalidade escolhida.'), P('A aprovação é automática?', 'Não. Toda concessão passa por análise e aprovação.')],
    imagens: ['financeira crédito', 'dinheiro finanças', 'financial advisor', 'credit loan'],
  },
  {
    id: 'industria', nome: 'Indústria, fábrica e produção',
    chaves: ['industria', 'fabrica', 'fabricante', 'metalurgica', 'usinagem', 'caldeiraria', 'fundicao', 'textil', 'confeccao', 'faccao', 'malharia', 'frigorific', 'laticinio', 'cachacaria', 'quimica', 'borracha', 'cimento', 'maquinas e equipamento', 'automacao industrial', 'eletrica industrial', 'tratamento de agua', 'reciclagem', 'residuo', 'sucata', 'ferro velho', 'distribuidor industrial', 'epi ', 'uniforme industrial', 'tornearia', 'ferramentaria', 'cozinha industrial', 'grafica industrial', 'atacadista de alimento'],
    schema: 'LocalBusiness', layout: 'oficina', paleta: { primaria: '#1f3a5f', destaque: '#e07b00' },
    cta: { principal: 'Pedir orçamento', secundario: 'Conhecer a produção' },
    etiqueta: 'Produção com prazo e qualidade combinados',
    titulos: ['Produção com prazo combinado e qualidade conferida', 'Do pedido à entrega, tudo acertado antes', 'Fabricação sob medida para a sua necessidade'],
    subtitulo: 'Envie a sua demanda, receba o orçamento com prazo e condições e acompanhe tudo pelo WhatsApp.',
    sobre: 'Na produção, o que vale é cumprir o combinado. Aqui você informa o que precisa, recebe o orçamento com prazo e especificações e acompanha o pedido até a entrega.',
    servicos: [S('Produção sob encomenda', 'Fabricação conforme as especificações do seu pedido.'), S('Produção em série', 'Lotes com padrão de qualidade e prazo definidos antes de começar.'),
      S('Orçamento técnico', 'Valor, prazo e especificações apresentados por escrito.'), S('Controle de qualidade', 'Conferência do produto antes da entrega.'),
      S('Entrega e logística', 'Combinamos prazo e forma de entrega junto com o pedido.'), S('Atendimento a empresas', 'Contato direto para pedidos recorrentes e condições comerciais.')],
    diferenciais: [I('Prazo combinado', 'A data de entrega vai no orçamento, antes de fechar.'), I('Padrão de qualidade', 'O produto é conferido antes de sair.'), I('Orçamento claro', 'Especificação, quantidade e valor por escrito.'), I('Contato direto', 'Acompanhe o pedido pelo WhatsApp.')],
    passos: [I('Envie a demanda', 'Conte o que precisa, com medidas, quantidade e prazo desejado.'), I('Receba o orçamento', 'Com especificações, valor e prazo de entrega.'), I('Acompanhe', 'Produção e entrega com atualização pelo WhatsApp.')],
    faq: [P('Como peço um orçamento?', 'Pelo botão de WhatsApp desta página: informe o que precisa, a quantidade e o prazo desejado.'), P('Há pedido mínimo?', 'Depende do produto. Confirme pelo WhatsApp as quantidades e condições.'), P('Qual o prazo de entrega?', 'Varia conforme o pedido e é informado no orçamento, antes de fechar.'), P('Entregam em outras cidades?', 'Confirme pelo WhatsApp a região de entrega e o frete.'), P('Qual o endereço e o horário?', 'Estão na seção de contato logo abaixo, com o caminho no mapa.')],
    imagens: ['indústria produção', 'fábrica máquinas', 'factory production', 'industrial machinery'],
  },
  {
    id: 'logistica', nome: 'Transporte e logística',
    chaves: ['transportadora', 'transporte', 'carreto', 'motoboy', 'entregador', 'logistica', 'armazem', 'centro de distribuicao', 'fulfillment', 'courier', 'correios', 'agenciamento de carga', 'self storage', 'guarda movel', 'fretamento', 'importacao', 'exportacao', 'locacao de caminho', 'locacao de empilhadeira', 'carga', 'taxi', 'cooperativa de taxi'],
    schema: 'LocalBusiness', layout: 'oficina', paleta: { primaria: '#16456b', destaque: '#f28c00' },
    cta: { principal: 'Pedir cotação', secundario: 'Como funciona' },
    etiqueta: 'Cotação rápida pelo WhatsApp',
    titulos: ['Transporte com prazo combinado e acompanhamento', 'Sua carga ou entrega, do começo ao fim', 'Logística simples: peça a cotação e acompanhe'],
    subtitulo: 'Informe origem, destino e o que será transportado e receba a cotação pelo WhatsApp.',
    sobre: 'Transportar bem é cumprir o prazo e manter você informado. Aqui você pede a cotação, combina os detalhes antes e acompanha a entrega.',
    servicos: [S('Transporte de cargas', 'Coleta e entrega conforme o tipo e o volume da carga.'), S('Entregas locais e regionais', 'Rotas combinadas com janela de entrega.'),
      S('Armazenagem', 'Guarda e organização, conforme a necessidade e o prazo.'), S('Fretes e mudanças', 'Orçamento conforme a distância, o volume e o acesso.'),
      S('Atendimento a empresas', 'Contrato e rotina de entregas para operações recorrentes.'), S('Acompanhamento da entrega', 'Informações sobre o andamento pelo WhatsApp.')],
    diferenciais: [I('Cotação antes de contratar', 'Valor e prazo informados antes de fechar.'), I('Prazo combinado', 'A janela de coleta e entrega vai por escrito.'), I('Acompanhamento', 'Você sabe em que etapa está a sua entrega.'), I('Contato direto', 'Fale pelo WhatsApp, sem fila de atendimento.')],
    passos: [I('Peça a cotação', 'Informe origem, destino, tipo e volume.'), I('Aprove e agende', 'Combine data, horário e condições.'), I('Acompanhe', 'Receba o andamento até a entrega.')],
    faq: [P('Como peço uma cotação?', 'Pelo botão de WhatsApp desta página: informe origem, destino e o que será transportado.'), P('Qual o prazo de entrega?', 'Depende da rota e do tipo de carga e é informado na cotação.'), P('Atendem a minha região?', 'Confirme pelo WhatsApp as cidades e rotas atendidas.'), P('Como pago?', 'As formas de pagamento são combinadas antes do serviço.'), P('Qual o horário de atendimento?', 'Está na seção de contato, logo abaixo.')],
    imagens: ['transporte logística', 'caminhão entrega', 'delivery truck', 'logistics warehouse'],
  },
  {
    id: 'seguranca', nome: 'Segurança e proteção',
    chaves: ['seguranca', 'vigilancia', 'alarme', 'camera', 'cftv', 'cerca eletrica', 'controle de acesso', 'monitoramento', 'portaria', 'escolta', 'brigadista', 'extintor', 'incendio', 'bombeiro', 'cofre', 'interfone', 'detetive', 'terceirizacao', 'fechadura'],
    schema: 'ProfessionalService', layout: 'impacto', paleta: { primaria: '#14324f', destaque: '#d9480f' },
    cta: { principal: 'Pedir avaliação', secundario: 'Como funciona' },
    etiqueta: 'Proteção com projeto sob medida',
    titulos: ['Proteção pensada para o seu espaço', 'Segurança com projeto, instalação e suporte', 'Mais tranquilidade para o seu dia a dia'],
    subtitulo: 'Peça uma avaliação, conheça as opções e receba a proposta pelo WhatsApp.',
    sobre: 'Cada espaço tem um risco diferente. Aqui a avaliação vem primeiro, e a solução é combinada de acordo com a sua necessidade.',
    servicos: [S('Avaliação do local', 'Visita para entender o espaço e indicar o que faz sentido.'), S('Projeto sob medida', 'Solução conforme o tamanho e o uso do ambiente.'),
      S('Instalação', 'Equipamentos instalados com orientação de uso.'), S('Monitoramento e suporte', 'Acompanhamento e assistência quando precisar.'),
      S('Manutenção', 'Revisão e ajustes para manter tudo funcionando.'), S('Atendimento a empresas e condomínios', 'Proposta conforme a rotina e o porte do local.')],
    diferenciais: [I('Avaliação antes da proposta', 'A solução parte do que o seu espaço precisa.'), I('Orientação clara', 'Você entende como cada item funciona.'), I('Suporte', 'Assistência para dúvidas e manutenção.'), I('Contato direto', 'Peça a avaliação pelo WhatsApp.')],
    passos: [I('Peça a avaliação', 'Conte onde e o que precisa proteger.'), I('Receba a proposta', 'Com a solução indicada, o valor e o prazo.'), I('Instale e use', 'Instalação feita e orientação de uso.')],
    faq: [P('Como peço uma avaliação?', 'Pelo botão de WhatsApp desta página: informe o tipo de local e o que quer proteger.'), P('A avaliação tem custo?', 'Confirme pelo WhatsApp as condições da avaliação.'), P('Quanto tempo leva a instalação?', 'Depende do projeto e é informado na proposta.'), P('Há suporte depois da instalação?', 'Confirme pelo WhatsApp as condições de suporte e manutenção.'), P('Qual o horário de atendimento?', 'Está na seção de contato, logo abaixo.')],
    imagens: ['segurança câmeras', 'alarme monitoramento', 'security camera', 'surveillance'],
  },
  {
    id: 'comunidade', nome: 'Igrejas, associações e entidades',
    chaves: ['igreja', 'templo', 'centro espirita', 'ong', 'sindicato', 'clube de servico', 'caridade', 'entidade', 'escoteiro', 'associacao', 'camara de comercio', 'fundacao', 'ensino religioso', 'sociedade beneficente'],
    schema: 'Organization', layout: 'classico', paleta: { primaria: '#2c4a6e', destaque: '#c78a1b' },
    cta: { principal: 'Falar com a gente', secundario: 'Como participar' },
    etiqueta: 'Todos são bem-vindos',
    titulos: ['Uma comunidade de braços abertos', 'Venha conhecer e participar', 'Juntos, fazemos mais'],
    subtitulo: 'Conheça as atividades, os horários e como participar. Fale com a gente pelo WhatsApp.',
    sobre: 'Somos uma comunidade que se encontra para cuidar das pessoas e fazer o bem. Aqui você vê as atividades, os horários e como participar.',
    servicos: [S('Encontros e atividades', 'Programação regular aberta a quem quiser conhecer.'), S('Ações sociais', 'Iniciativas de apoio a quem precisa.'),
      S('Voluntariado', 'Venha ajudar nas atividades e nos projetos.'), S('Eventos', 'Datas e programação divulgadas aqui e pelo WhatsApp.'),
      S('Acolhimento', 'Atendimento a quem chega pela primeira vez.'), S('Contribuições', 'Informe-se pelo WhatsApp sobre as formas de apoiar.')],
    diferenciais: [I('Acolhimento', 'Quem chega pela primeira vez é bem recebido.'), I('Transparência', 'Atividades e informações claras, sem rodeios.'), I('Participação', 'Há espaço para quem quer ajudar.'), I('Contato direto', 'Tire dúvidas pelo WhatsApp.')],
    passos: [I('Conheça', 'Veja as atividades e os horários.'), I('Participe', 'Venha a um encontro ou fale com a gente.'), I('Fique por perto', 'Receba as novidades pelo WhatsApp.')],
    faq: [P('Preciso confirmar presença?', 'Em geral não. Para eventos específicos, confirme pelo WhatsApp.'), P('Como posso ajudar?', 'Fale com a gente pelo WhatsApp e conte como gostaria de participar.'), P('Onde fica e quais os horários?', 'Estão na seção de contato logo abaixo, com o caminho no mapa.'), P('Como recebo as novidades?', 'Pelo WhatsApp. Chame e peça para ser avisado.'), P('Posso levar a família?', 'Sim, todos são bem-vindos. Confirme pelo WhatsApp se houver atividade específica.')],
    imagens: ['comunidade pessoas', 'voluntários', 'community', 'people together'],
  },
  {
    id: 'seguros', nome: 'Seguros, investimentos e planejamento financeiro',
    chaves: ['seguro', 'seguradora', 'corretor de seguro', 'corretora de seguro', 'previdencia', 'investimento', 'planejador financeiro', 'gestao de patrimonio', 'consultor financeiro'],
    schema: 'InsuranceAgency', layout: 'escritorio', paleta: { primaria: '#12446b', destaque: '#c9951a' },
    cta: { principal: 'Pedir cotação', secundario: 'Como funciona' },
    etiqueta: 'Atendimento direto pelo WhatsApp',
    titulos: ['Proteção e planejamento explicados com clareza', 'Compare, entenda e escolha com segurança', 'Cuide do que importa com uma orientação de confiança'],
    subtitulo: 'Peça a cotação, tire as dúvidas e entenda as condições antes de contratar.',
    sobre: 'Seguro e planejamento financeiro precisam ser entendidos antes de contratados. Aqui você recebe a explicação clara e compara as opções, sem pressa.',
    servicos: [S('Cotação de seguros', 'Compare coberturas e condições antes de decidir.'), S('Seguro de vida', 'Proteção para você e para a sua família, conforme a necessidade.'),
      S('Seguro residencial e empresarial', 'Coberturas para o imóvel e para o negócio.'), S('Seguro de veículos', 'Opções de cobertura conforme o veículo e o perfil.'),
      S('Planejamento financeiro', 'Organização de objetivos, reservas e investimentos.'), S('Orientação sobre sinistros', 'Apoio para entender os passos quando precisar acionar.')],
    diferenciais: [I('Explicação clara', 'Coberturas, limites e carências em linguagem simples.'), I('Comparação de opções', 'Você vê alternativas antes de decidir.'), I('Atendimento próximo', 'Tire dúvidas pelo WhatsApp com quem conhece o seu caso.'), I('Apoio no uso', 'Orientação quando for preciso acionar o seguro.')],
    passos: [I('Conte o que precisa', 'Informe o que deseja proteger ou planejar.'), I('Compare', 'Receba as opções com coberturas e valores.'), I('Contrate com segurança', 'Com tudo explicado antes de assinar.')],
    faq: [P('Como peço uma cotação?', 'Pelo botão de WhatsApp desta página: informe o que quer proteger e os dados básicos.'), P('A cotação tem custo?', 'Confirme pelo WhatsApp as condições da cotação.'), P('Quais documentos preciso?', 'Depende do tipo de seguro. Orientamos a lista pelo WhatsApp.'), P('Como aciono o seguro?', 'Orientamos os passos conforme a apólice e a seguradora.'), P('Qual o horário de atendimento?', 'Está na seção de contato, logo abaixo.')],
    imagens: ['seguros proteção', 'consultoria financeira', 'financial advisor', 'insurance'],
  },
];

/** Genérico: serve a qualquer negócio local que não esteja no banco. */
export const GENERICO: ConteudoNicho = {
  id: 'generico', nome: 'Negócio local', chaves: [], schema: 'LocalBusiness', layout: 'clinica',
  paleta: { primaria: '#1f4fd8', destaque: '#f59e0b' },
  cta: { principal: 'Falar no WhatsApp', secundario: 'Como chegar' },
  etiqueta: 'Atendimento direto pelo WhatsApp',
  titulos: ['Atendimento de confiança, do jeito que deveria ser', 'Fale com a gente e resolva sem complicação', 'Qualidade e atenção no que fazemos'],
  subtitulo: 'Conheça o que fazemos, tire suas dúvidas e fale direto com a gente pelo WhatsApp.',
  sobre: 'Trabalhamos para entregar um bom atendimento, com clareza e atenção ao que você precisa.',
  servicos: [S('Atendimento personalizado', 'Entendemos o que você precisa antes de propor.'), S('Orçamento claro', 'Você sabe o que está incluído e o valor.'), S('Atendimento pelo WhatsApp', 'Respostas rápidas, sem burocracia.'),
    S('Acompanhamento', 'Do primeiro contato ao pós-atendimento.'), S('Condições combinadas', 'Prazo e forma de pagamento acertados antes.'), S('Suporte', 'Estamos por perto se precisar.')],
  diferenciais: [I('Atenção ao cliente', 'Você é ouvido e entendido.'), I('Clareza', 'Tudo combinado antes de começar.'), I('Agilidade', 'Contato direto pelo WhatsApp.'), I('Localização fácil', 'Veja o endereço e o horário abaixo.')],
  passos: [I('Fale com a gente', 'Conte o que você precisa.'), I('Receba a proposta', 'Com o que está incluído e o valor.'), I('Resolva', 'Atendimento feito e acompanhado.')],
  faq: [P('Como entro em contato?', 'Pelo botão de WhatsApp desta página ou pelo telefone.'), P('Qual o horário de atendimento?', 'Está na seção de contato, logo abaixo.'), P('Fazem orçamento?', 'Sim. Chame no WhatsApp contando o que precisa.'), P('Quais as formas de pagamento?', 'Consulte as opções pelo WhatsApp.'), P('Onde vocês ficam?', 'O endereço e o mapa estão na seção de contato.')],
  imagens: ['atendimento cliente', 'pequeno negócio', 'small business', 'customer service'],
};

const normalizar = (t: string): string =>
  t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

/** Singular aproximado, palavra a palavra. Só serve para casar radicais (mesma regra do banco de imagens do backend). */
const singular = (texto: string): string => texto.split(' ').map(p => {
  if (p.length <= 3) return p;
  for (const [fim, troca] of [['oes', 'ao'], ['aes', 'ao'], ['ais', 'al'], ['eis', 'el'], ['ois', 'ol'], ['ens', 'em'], ['ns', 'm']]) {
    if (p.endsWith(fim)) return p.slice(0, -fim.length) + troca;
  }
  if (/(res|zes|ses)$/.test(p) && p.length > 4) return p.slice(0, -2);
  return p.endsWith('s') ? p.slice(0, -1) : p;
}).join(' ');

/**
 * O conteúdo do ramo. Casa por início de palavra, como o guia do SDR: "spa"
 * não pode casar com "espaço". Empate: a chave mais longa vence.
 */
export function achar(nicho?: string): ConteudoNicho {
  const base = normalizar(nicho || '');
  if (!base) return GENERICO;
  // "Escola de dança", "Curso de barbeiro", "Faculdade de direito": quem ensina é escola, seja qual for a matéria
  if (/^(escolas?|cursos?|faculdades?|universidades?|aulas?) /.test(base)) return BANCO.find(c => c.id === 'educacao') || GENERICO;
  // o catálogo é quase todo plural ("Agências de viagens", "Hospitais"): casa pelas duas formas, como o banco de imagens
  const alvo = ` ${base} ${singular(base)} `;
  let melhor: ConteudoNicho | null = null;
  let pontos = 0;
  for (const c of BANCO) {
    for (const k of c.chaves) {
      const chave = normalizar(k);
      if (!chave) continue;
      const padrao = k.endsWith(' ') ? ` ${chave} ` : ` ${chave}`;
      const valor = chave.length + (c.prioritario ? 100 : 0);
      if (alvo.includes(padrao) && valor > pontos) { melhor = c; pontos = valor; }
    }
  }
  // "Clínicas" sem dizer de quê: texto de clínica é melhor que o genérico (clínica odontológica, de estética etc. já casaram acima)
  if (!melhor && / clinic/.test(alvo)) return BANCO.find(c => c.id === 'saude-medica') || GENERICO;
  return melhor || GENERICO;
}

export const preencher = (texto: string, empresa: string, cidade: string): string =>
  texto.replace(/\{empresa\}/g, empresa || 'nós').replace(/\{cidade\}/g, cidade || 'sua região');

/**
 * Segundo trecho do "sobre": os layouts dividem o texto entre a capa (primeira
 * frase) e a seção de história (o resto). Sem um complemento, a seção ficava
 * com uma frase solta de quatro palavras. Nenhuma alegação factual.
 */
export const SOBRE_COMPLEMENTO: Record<string, string> = {
  padaria: 'Do pão de todo dia à encomenda especial, é só chegar ou chamar no WhatsApp.',
  restaurante: 'Peça pelo WhatsApp ou venha comer com a gente.',
  'saude-medica': 'O agendamento é simples e o contato é direto, pelo WhatsApp.',
  nutricao: 'Agende uma consulta e conte a sua rotina para montarmos o caminho juntos.',
  fisioterapia: 'Agende uma avaliação e conte onde dói e o que você quer voltar a fazer.',
  odonto: 'Agende uma avaliação e tire todas as dúvidas antes de começar.',
  psicologia: 'O ritmo é o seu. Se fizer sentido, mande uma mensagem e conversamos sem compromisso.',
  estetica: 'Escolha o serviço, marque o horário e venha relaxar.',
  academia: 'Peça uma aula experimental e conheça o espaço.',
  advocacia: 'O primeiro contato serve para entender a sua situação e explicar as possibilidades.',
  contabilidade: 'Peça um orçamento e conte a rotina da sua empresa.',
  imobiliaria: 'Orientamos sobre documentação e negociação. Fale com um corretor.',
  oficina: 'Acompanhe tudo pelo WhatsApp e traga o seu carro para uma avaliação.',
  pet: 'Agende pelo WhatsApp e deixe o seu pet em boas mãos.',
  'loja-moda': 'Venha conhecer a loja ou peça sugestões pelo WhatsApp.',
  construcao: 'Agende uma visita para conversarmos sobre o seu projeto.',
  'servicos-residenciais': 'Você explica o problema, recebe o orçamento e combina o horário.',
  educacao: 'Fale com a gente para conhecer as turmas e tirar as dúvidas.',
  eventos: 'Conte a data e o tipo de evento para receber uma proposta.',
  turismo: 'Reserve direto e tire as dúvidas pelo WhatsApp.',
  agro: 'Peça a sua cotação pelo WhatsApp e combine retirada ou entrega.',
  varejo: 'Venha conhecer ou peça pelo WhatsApp.',
  concessionaria: 'Peça a avaliação do seu usado e tire as dúvidas pelo WhatsApp.',
  credito: 'Chame no WhatsApp e faça a sua simulação.',
  industria: 'Envie a sua demanda e receba o orçamento com prazo e condições.',
  logistica: 'Peça a cotação pelo WhatsApp e combine coleta e entrega.',
  seguranca: 'Peça uma avaliação do local e receba a proposta pelo WhatsApp.',
  comunidade: 'Venha conhecer ou fale com a gente pelo WhatsApp.',
  seguros: 'Peça a sua cotação e tire as dúvidas pelo WhatsApp antes de decidir.',
  'tecnologia-marketing': 'Combinamos escopo, prazo e investimento antes de iniciar. Peça uma proposta.',
  generico: 'Fale com a gente pelo WhatsApp e conte o que você precisa.',
};
