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
    chaves: ['padaria', 'panificadora', 'confeitaria', 'doceria', 'cafeteria', 'bolo', 'confeiteir', 'doceir', 'cafe '],
    schema: 'Bakery', layout: 'aurora', paleta: { primaria: '#8a4b1f', destaque: '#e9a23b' },
    cta: { principal: 'Fazer meu pedido', secundario: 'Ver como chegar' },
    etiqueta: 'Feito todos os dias',
    titulos: ['Pão quente e doces feitos com carinho', 'O sabor que {cidade} procura, todo dia', 'Do forno para a sua mesa'],
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
    chaves: ['restaurante', 'pizzaria', 'lanchonete', 'hamburgueria', 'bar ', 'churrascaria', 'cantina', 'marmitaria', 'japones', 'sushi', 'boteco', 'pub', 'choperia', 'espetaria', 'self service', 'por quilo', 'rotisseria'],
    schema: 'Restaurant', layout: 'aurora', paleta: { primaria: '#9b2c1a', destaque: '#f0a82b' },
    cta: { principal: 'Pedir pelo WhatsApp', secundario: 'Ver o cardápio' },
    etiqueta: 'Peça sem complicação',
    titulos: ['Comida boa, do jeito que você gosta', 'O prato que resolve o seu dia', 'Venha comer bem em {cidade}'],
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
    chaves: ['clinica medica', 'clinica geral', 'clinica popular', 'clinica de saude', 'medic', 'consultorio', 'dermato', 'pediatr', 'ortoped', 'cardio', 'oftalmo', 'ginecolog', 'urolog', 'endocrin', 'neurolog', 'psiquiatr', 'otorrino', 'geriatr', 'laboratorio', 'diagnostico'],
    schema: 'MedicalClinic', layout: 'clinica', paleta: { primaria: '#0f7c8a', destaque: '#2f9e6f' },
    cta: { principal: 'Agendar consulta', secundario: 'Como chegar' },
    etiqueta: 'Atendimento com hora marcada',
    titulos: ['Cuidar da sua saúde começa aqui', 'Atenção de verdade, com hora marcada', 'Sua consulta sem complicação em {cidade}'],
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
    id: 'odonto', nome: 'Dentista e odontologia',
    chaves: ['odonto', 'dentista', 'ortodont', 'implante dent', 'endodont', 'periodont'],
    schema: 'Dentist', layout: 'clinica', paleta: { primaria: '#1e6fd9', destaque: '#18b8a4' },
    cta: { principal: 'Agendar avaliação', secundario: 'Como chegar' },
    etiqueta: 'Sorrisos cuidados com atenção',
    titulos: ['Cuide do seu sorriso sem medo', 'Um sorriso saudável começa com uma boa avaliação', 'Odontologia com atenção em {cidade}'],
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
    id: 'psicologia', nome: 'Psicologia e terapias',
    chaves: ['psicolog', 'terapeut', 'psicanal', 'neuropsic', 'psicopedag', 'fonoaudi', 'terapia'],
    schema: 'MedicalBusiness', layout: 'clinica', paleta: { primaria: '#5b7fa6', destaque: '#c58b6b' },
    cta: { principal: 'Marcar uma conversa', secundario: 'Saiba mais' },
    etiqueta: 'Atendimento com sigilo e acolhimento',
    titulos: ['Um espaço seguro para cuidar de você', 'Conversar pode ser o primeiro passo', 'Acolhimento e escuta em {cidade}'],
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
    id: 'estetica', nome: 'Estética, salão e barbearia',
    chaves: ['estetic', 'salao', 'barbearia', 'barbeiro', 'manicure', 'cabeleir', 'beleza', 'sobrancelha', 'depila', 'spa', 'massag', 'cilios', 'unhas', 'maquiador', 'micropigment', 'podolog'],
    schema: 'BeautySalon', layout: 'estudio', paleta: { primaria: '#8a3f5d', destaque: '#d9a35b' },
    cta: { principal: 'Agendar horário', secundario: 'Ver serviços' },
    etiqueta: 'Horário marcado, sem espera',
    titulos: ['Realce o que você tem de melhor', 'Beleza e cuidado, no seu horário', 'Seu momento de cuidado em {cidade}'],
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
    chaves: ['academia', 'pilates', 'crossfit', 'personal', 'fitness', 'muscula', 'yoga', 'danca', 'natacao', 'treino', 'jiu', 'boxe', 'muay', 'karate', 'judo', 'capoeira', 'funcional'],
    schema: 'HealthClub', layout: 'vibrante', paleta: { primaria: '#e0451f', destaque: '#1d2b53' },
    cta: { principal: 'Quero uma aula experimental', secundario: 'Ver modalidades' },
    etiqueta: 'Comece hoje',
    titulos: ['Treine com orientação e resultado', 'O primeiro passo é o mais importante', 'Sua melhor versão começa em {cidade}'],
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
    chaves: ['advoca', 'advogad', 'juridic', 'direito'],
    schema: 'LegalService', layout: 'escritorio', paleta: { primaria: '#1b2a4a', destaque: '#b08d57' },
    cta: { principal: 'Falar com um advogado', secundario: 'Áreas de atuação' },
    etiqueta: 'Atendimento sigiloso',
    titulos: ['Orientação jurídica clara, com respeito ao seu caso', 'Seus direitos explicados sem complicação', 'Advocacia atenta em {cidade}'],
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
    chaves: ['contab', 'contad', 'fiscal', 'bpo', 'abertura de empresa'],
    schema: 'AccountingService', layout: 'escritorio', paleta: { primaria: '#0f4c5c', destaque: '#e08e45' },
    cta: { principal: 'Pedir um orçamento', secundario: 'Nossos serviços' },
    etiqueta: 'Contabilidade sem dor de cabeça',
    titulos: ['Contabilidade que cuida do seu negócio', 'Menos burocracia, mais tempo para vender', 'Seu contador de confiança em {cidade}'],
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
    chaves: ['imobiliaria', 'corretor', 'imoveis', 'imovel', 'incorporadora', 'loteamento', 'construtora'],
    schema: 'RealEstateAgent', layout: 'escritorio', paleta: { primaria: '#13405b', destaque: '#d6a03c' },
    cta: { principal: 'Falar com um corretor', secundario: 'Ver imóveis' },
    etiqueta: 'Atendimento personalizado',
    titulos: ['Encontre o imóvel certo em {cidade}', 'Comprar, vender ou alugar com segurança', 'Seu próximo endereço começa aqui'],
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
    chaves: ['oficina', 'mecanic', 'auto center', 'autocenter', 'funilaria', 'lava jato', 'lavajato', 'borracharia', 'pneus', 'auto pecas', 'autopecas', 'estetica automotiva', 'auto eletric', 'martelinho', 'retifica', 'alinhamento', 'insulfilm', 'som automotivo'],
    schema: 'AutoRepair', layout: 'oficina', paleta: { primaria: '#c2410c', destaque: '#facc15' },
    cta: { principal: 'Pedir orçamento', secundario: 'Como chegar' },
    etiqueta: 'Orçamento sem compromisso',
    titulos: ['Seu carro em boas mãos, sem susto na conta', 'Conserto honesto, orçamento claro', 'A oficina de confiança em {cidade}'],
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
    id: 'pet', nome: 'Pet shop e veterinária',
    chaves: ['pet', 'veterin', 'banho e tosa', 'agropet', 'racao', 'adestr'],
    schema: 'PetStore', layout: 'vibrante', paleta: { primaria: '#2a7de1', destaque: '#f5a524' },
    cta: { principal: 'Agendar banho ou consulta', secundario: 'Ver serviços' },
    etiqueta: 'Cuidado de quem ama pets',
    titulos: ['Quem ama pet cuida com a gente', 'Banho, saúde e carinho para o seu melhor amigo', 'O cantinho do seu pet em {cidade}'],
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
    chaves: ['roupa', 'moda', 'boutique', 'vestuario', 'calcado', 'sapato', 'acessorio', 'lingerie', 'jeans', 'bolsa', 'brecho', 'semijoia', 'joalheria', 'otica'],
    schema: 'ClothingStore', layout: 'estudio', paleta: { primaria: '#1f1f1f', destaque: '#c9a227' },
    cta: { principal: 'Ver novidades no WhatsApp', secundario: 'Como chegar' },
    etiqueta: 'Novidades toda semana',
    titulos: ['Estilo que combina com você', 'Peças escolhidas com cuidado', 'A sua loja de moda em {cidade}'],
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
    chaves: ['construc', 'reforma', 'marcenaria', 'arquitet', 'engenhar', 'pintura', 'gesso', 'moveis planejados', 'serralheria', 'vidracaria', 'pedreiro', 'empreiteira', 'paisagismo', 'piscina', 'material de construcao', 'marmoraria', 'energia solar', 'decoracao', 'interiores'],
    schema: 'HomeAndConstructionBusiness', layout: 'oficina', paleta: { primaria: '#374151', destaque: '#f59e0b' },
    cta: { principal: 'Pedir orçamento', secundario: 'Ver serviços' },
    etiqueta: 'Projeto e obra com acompanhamento',
    titulos: ['Sua obra entregue com capricho e transparência', 'Do projeto à última pincelada', 'Reformas e projetos em {cidade}'],
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
    chaves: ['eletricist', 'encanador', 'dedetiz', 'limpeza', 'ar condicionado', 'chaveiro', 'desentup', 'diarista', 'jardinagem', 'impermeabiliza', 'mudanca', 'frete', 'lavanderia', 'costureir', 'assistencia tecnica', 'manutencao'],
    schema: 'HomeAndConstructionBusiness', layout: 'oficina', paleta: { primaria: '#1d4ed8', destaque: '#f97316' },
    cta: { principal: 'Chamar agora', secundario: 'Ver serviços' },
    etiqueta: 'Atendimento rápido',
    titulos: ['Problema em casa? Resolvemos rápido', 'Serviço bem feito, com hora combinada', 'Atendimento ágil em {cidade}'],
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
    chaves: ['escola', 'curso', 'idioma', 'ingles', 'autoescola', 'cfc', 'colegio', 'creche', 'faculdade', 'treinamento', 'reforco', 'musica', 'violao', 'berçario', 'bercario', 'pre vestibular'],
    schema: 'EducationalOrganization', layout: 'vibrante', paleta: { primaria: '#6d28d9', destaque: '#f59e0b' },
    cta: { principal: 'Quero saber mais', secundario: 'Conhecer a escola' },
    etiqueta: 'Matrículas abertas? Confirme pelo WhatsApp',
    titulos: ['Aprender aqui faz diferença', 'Educação com acompanhamento próximo', 'O lugar certo para aprender em {cidade}'],
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
    chaves: ['evento', 'buffet', 'fotograf', 'cerimonial', 'festa', 'casamento', 'filmagem', 'som e luz', 'espaco de eventos', 'decoracao de festa', 'dj ', 'salao de festas'],
    schema: 'EventVenue', layout: 'estudio', paleta: { primaria: '#7a2e5c', destaque: '#d4a24c' },
    cta: { principal: 'Pedir orçamento', secundario: 'Ver trabalhos' },
    etiqueta: 'Seu evento, do seu jeito',
    titulos: ['Seu grande dia merece cuidado em cada detalhe', 'Eventos que ficam na memória', 'Festas e celebrações em {cidade}'],
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
    chaves: ['hotel', 'hoteis', 'pousada', 'hospedagem', 'turismo', 'agencia de viagens', 'hostel', 'chale', 'resort', 'camping', 'apart hotel', 'flat'],
    schema: 'LodgingBusiness', layout: 'aurora', paleta: { primaria: '#0b6e6e', destaque: '#e7a33e' },
    cta: { principal: 'Reservar pelo WhatsApp', secundario: 'Ver acomodações' },
    etiqueta: 'Reserve direto, sem intermediário',
    titulos: ['Descanse do jeito que você merece', 'Sua estadia começa com um bom acolhimento', 'Hospedagem confortável em {cidade}'],
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
    chaves: ['agro', 'fazenda', 'rural', 'insumo', 'sementes', 'implement', 'cooperativa', 'pecuaria', 'trator', 'fertiliz', 'defensivo', 'granja', 'viveiro'],
    schema: 'LocalBusiness', layout: 'oficina', paleta: { primaria: '#2f6b3a', destaque: '#d97706' },
    cta: { principal: 'Pedir cotação', secundario: 'Como chegar' },
    etiqueta: 'Atendimento de quem entende do campo',
    titulos: ['Tudo para o campo, com atendimento de confiança', 'Cotação rápida, entrega combinada', 'Seu parceiro do campo em {cidade}'],
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
    chaves: ['loja', 'mercado', 'supermercado', 'papelaria', 'livraria', 'floricultura', 'presente', 'utilidades', 'eletro', 'moveis', 'colchoes', 'informatica', 'celular', 'material', 'distribuidora', 'atacado', 'farmac', 'drogaria'],
    schema: 'Store', layout: 'estudio', paleta: { primaria: '#0f5132', destaque: '#f2a900' },
    cta: { principal: 'Falar no WhatsApp', secundario: 'Como chegar' },
    etiqueta: 'Atendimento na loja e pelo WhatsApp',
    titulos: ['Tudo o que você precisa, com atendimento de verdade', 'Boas escolhas, bom preço e atenção', 'Sua loja de confiança em {cidade}'],
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
    chaves: ['software', 'desenvolv', 'ti ', 'tecnologia', 'marketing', 'agencia', 'publicidade', 'design', 'grafica', 'consultoria', 'coach', 'treinamento corporativo', 'seguranca eletronica', 'cftv', 'provedor', 'informatica', 'rh', 'recrutamento'],
    schema: 'ProfessionalService', layout: 'escritorio', paleta: { primaria: '#2d3a8c', destaque: '#00b8a9' },
    cta: { principal: 'Pedir uma proposta', secundario: 'Ver serviços' },
    etiqueta: 'Resultado combinado antes de começar',
    titulos: ['Soluções que resolvem o problema de verdade', 'Do briefing à entrega, com acompanhamento', 'Parceiro de negócios em {cidade}'],
    subtitulo: 'Conte o seu desafio e receba uma proposta clara, com escopo, prazo e valor.',
    sobre: 'Bons projetos nascem de entender o problema. Ouvimos, propomos e acompanhamos a entrega com transparência.',
    servicos: [S('Diagnóstico', 'Entendemos o seu cenário antes de propor.'), S('Planejamento', 'Escopo, etapas e prazos combinados.'), S('Execução', 'Entrega acompanhada, com comunicação clara.'),
      S('Suporte', 'Apoio depois da entrega.'), S('Treinamento', 'Para sua equipe usar bem a solução.'), S('Melhoria contínua', 'Ajustes com base nos resultados.')],
    diferenciais: [I('Proposta clara', 'Escopo, prazo e valor por escrito.'), I('Comunicação direta', 'Atualizações no canal que você preferir.'), I('Foco no resultado', 'Decisões ligadas ao seu objetivo.'), I('Transparência', 'Você acompanha cada etapa.')],
    passos: [I('Conversa inicial', 'Entendemos o seu desafio.'), I('Proposta', 'Escopo, prazo e investimento.'), I('Entrega', 'Execução acompanhada e ajustes.')],
    faq: [P('Como funciona a contratação?', 'Conversamos, enviamos a proposta e, aprovada, iniciamos o projeto.'), P('Quanto tempo leva?', 'Depende do escopo. O prazo vem na proposta.'), P('Há suporte após a entrega?', 'Combinamos as condições na proposta.'), P('Como é a comunicação durante o projeto?', 'No canal que você preferir, com retornos regulares.'), P('Posso começar por algo menor?', 'Pode. Conversamos sobre um primeiro passo.')],
    imagens: ['escritório equipe', 'trabalho notebook', 'office team', 'laptop workspace'],
  },
];

/** Genérico: serve a qualquer negócio local que não esteja no banco. */
export const GENERICO: ConteudoNicho = {
  id: 'generico', nome: 'Negócio local', chaves: [], schema: 'LocalBusiness', layout: 'clinica',
  paleta: { primaria: '#1f4fd8', destaque: '#f59e0b' },
  cta: { principal: 'Falar no WhatsApp', secundario: 'Como chegar' },
  etiqueta: 'Atendimento direto pelo WhatsApp',
  titulos: ['Atendimento de confiança em {cidade}', 'Fale com a gente e resolva sem complicação', 'Qualidade e atenção no que fazemos'],
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

/**
 * O conteúdo do ramo. Casa por início de palavra, como o guia do SDR: "spa"
 * não pode casar com "espaço". Empate: a chave mais longa vence.
 */
export function achar(nicho?: string): ConteudoNicho {
  const alvo = ` ${normalizar(nicho || '')} `;
  if (!alvo.trim()) return GENERICO;
  let melhor: ConteudoNicho | null = null;
  let pontos = 0;
  for (const c of BANCO) {
    for (const k of c.chaves) {
      const chave = normalizar(k);
      if (!chave) continue;
      const padrao = k.endsWith(' ') ? ` ${chave} ` : ` ${chave}`;
      if (alvo.includes(padrao) && chave.length > pontos) { melhor = c; pontos = chave.length; }
    }
  }
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
  padaria: 'Cada fornada é pensada para você levar sabor e voltar sempre. Do pão de todo dia à encomenda especial, é só chegar ou chamar no WhatsApp.',
  restaurante: 'Tempero, ponto certo e atendimento atencioso fazem parte de cada prato. Peça pelo WhatsApp ou venha comer com a gente.',
  'saude-medica': 'Aqui você tem tempo para contar o que sente e entender cada orientação. O agendamento é simples e o atendimento, acolhedor.',
  odonto: 'Explicamos cada etapa do tratamento e respeitamos o seu tempo e o seu receio. Agende uma avaliação e tire todas as dúvidas.',
  psicologia: 'O ritmo é o seu, e o sigilo é parte essencial do trabalho. Se fizer sentido, mande uma mensagem e conversamos sem compromisso.',
  estetica: 'Do primeiro atendimento ao resultado, cada detalhe importa. Escolha o serviço, marque o horário e venha relaxar.',
  academia: 'Treinar com orientação ajuda a manter a constância e a evoluir com segurança. Peça uma aula experimental e conheça o espaço.',
  advocacia: 'Explicamos as possibilidades com clareza e acompanhamos cada etapa do caso. O primeiro contato serve para entender a sua situação.',
  contabilidade: 'Cuidamos de impostos e obrigações para você ter tempo de cuidar do negócio. Peça um orçamento e conte a rotina da sua empresa.',
  imobiliaria: 'Acompanhamos você da busca à entrega das chaves, com orientação sobre documentação e negociação. Fale com um corretor.',
  oficina: 'Antes de qualquer serviço você recebe o diagnóstico e o orçamento, e acompanha tudo pelo WhatsApp. Traga o seu carro para uma avaliação.',
  pet: 'Respeitamos o tempo e o jeito de cada animal, com higiene e atenção. Agende pelo WhatsApp e deixe o seu pet em boas mãos.',
  'loja-moda': 'Selecionamos peças pensando em conforto, qualidade e estilo. Venha conhecer a loja ou peça sugestões pelo WhatsApp.',
  construcao: 'Orçamento claro, cronograma combinado e comunicação direta durante a obra. Agende uma visita para conversarmos sobre o seu projeto.',
  'servicos-residenciais': 'Você explica o problema, recebe o orçamento e combina o horário. O serviço é feito com cuidado e explicado ao final.',
  educacao: 'Acompanhamos o desenvolvimento de cada aluno e mantemos a família informada. Fale com a gente para conhecer as turmas.',
  eventos: 'Planejamos junto com você, cuidamos dos detalhes e acompanhamos o grande dia. Conte a data e o tipo de evento para receber uma proposta.',
  turismo: 'Cuidamos do conforto, da limpeza e do atendimento para a sua estadia ser tranquila. Reserve direto e tire as dúvidas pelo WhatsApp.',
  agro: 'Atendemos com agilidade, conhecimento dos produtos e cotação rápida pelo WhatsApp. Peça a sua e combine retirada ou entrega.',
  varejo: 'Trabalhamos com produtos selecionados e atendimento próximo. Venha conhecer ou peça pelo WhatsApp.',
  'tecnologia-marketing': 'Começamos entendendo o seu desafio e combinamos escopo, prazo e investimento antes de iniciar. Peça uma proposta.',
  generico: 'Atendemos com clareza e combinamos tudo antes de começar. Fale com a gente pelo WhatsApp e conte o que você precisa.',
};
