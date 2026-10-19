/**
 * Direção de arte por segmento: cor, tipografia e modelo que fazem sentido para o ramo do negócio.
 *
 * Comida pede cores quentes (apetite); clínica pede azul e verde claros (limpeza, confiança); advocacia pede
 * azul-marinho com dourado (seriedade); barbearia pede preto com cobre. Cada segmento tem várias paletas e a
 * empresa cai sempre na mesma, então duas pizzarias não saem gêmeas, mas as duas parecem pizzaria.
 *
 * O mesmo módulo escolhe o modelo (claro ou escuro) e o par de fontes, para o site inteiro contar uma história só.
 */

export type Paleta = { nome: string; primaria: string; destaque: string };

export type Segmento = {
  id: string;
  nome: string;
  /** palavras do ramo (sem acento, minúsculas) */
  palavras: string[];
  /** por que estas cores: aparece na tela e ajuda o vendedor a explicar a escolha */
  humor: string;
  paletas: Paleta[];
  /** modelos (ids de layouts.ts) que combinam com o segmento */
  modelos: string[];
  /** par de fontes principal (chave de FONTES em premium-base) */
  fonte: string;
  /** par com serifa, para os modelos feitos em itálico serifado */
  fonteSerifa: string;
  /** par sem serifa, para os modelos de título pesado */
  fonteSans: string;
};

const SEGMENTOS: Segmento[] = [
  {
    id: 'pet', nome: 'Pet e veterinária', palavras: ['pet shop', 'petshop', 'pets', 'veterin', 'animal', 'banho e tosa', 'canil'],
    humor: 'Cores alegres e amigáveis, como um bicho feliz: azul de confiança com laranja de brincadeira.',
    paletas: [
      { nome: 'Azul brincalhão', primaria: '#2a7de1', destaque: '#f5a524' },
      { nome: 'Verde pata', primaria: '#15803d', destaque: '#fb923c' },
      { nome: 'Turquesa feliz', primaria: '#0e7490', destaque: '#fbbf24' },
    ],
    modelos: ['patinhas', 'vibrante', 'natural', 'aurora', 'agro'], fonte: 'amigavel', fonteSerifa: 'artesanal', fonteSans: 'amigavel',
  },
  {
    id: 'doces', nome: 'Padaria, doces e café', palavras: ['padaria', 'panific', 'confeit', 'doceria', 'doce', 'cafe', 'cafeteria', 'bolo', 'chocolate', 'sorvet', 'acai', 'gelato'],
    humor: 'Tons de caramelo, chocolate e morango: remetem a forno quente, açúcar e vontade de entrar.',
    paletas: [
      { nome: 'Caramelo', primaria: '#8a4b1f', destaque: '#e9a23b' },
      { nome: 'Chocolate', primaria: '#5a3a2a', destaque: '#f0b27a' },
      { nome: 'Morango', primaria: '#be185d', destaque: '#fbbf77' },
      { nome: 'Baunilha', primaria: '#a16207', destaque: '#f59e0b' },
    ],
    modelos: ['forno', 'aurora', 'editorial', 'natural', 'vibrante', 'fragrancia'], fonte: 'artesanal', fonteSerifa: 'artesanal', fonteSans: 'amigavel',
  },
  {
    id: 'comida', nome: 'Restaurante, pizza e lanche', palavras: ['restaurante', 'pizz', 'lanch', 'hamburg', 'bistro', 'churrasc', 'marmit', 'sushi', 'japones', 'comida', 'gastronom', 'bar ', 'boteco', 'petisc', 'rotisser'],
    humor: 'Vermelho, laranja e amarelo abrem o apetite e passam calor de cozinha; o fundo escuro dá clima de mesa.',
    paletas: [
      { nome: 'Tomate', primaria: '#c62828', destaque: '#ffb300' },
      { nome: 'Brasa', primaria: '#b3341b', destaque: '#ff8f1f' },
      { nome: 'Pimenta', primaria: '#9b1c1c', destaque: '#f2b134' },
      { nome: 'Mostarda', primaria: '#b45309', destaque: '#fbbf24' },
    ],
    modelos: ['mesa', 'editorial', 'aurora', 'vibrante', 'noir'], fonte: 'artesanal', fonteSerifa: 'editorial', fonteSans: 'forte',
  },
  {
    id: 'barbearia', nome: 'Barbearia e tatuagem', palavras: ['barbear', 'tatuag', 'tattoo', 'piercing'],
    humor: 'Preto com cobre ou dourado: estilo, tradição e atitude, sem frescura.',
    paletas: [
      { nome: 'Cobre', primaria: '#262626', destaque: '#c8873a' },
      { nome: 'Navalha', primaria: '#2b0f0f', destaque: '#e11d48' },
      { nome: 'Ouro velho', primaria: '#232323', destaque: '#d4af37' },
    ],
    modelos: ['estudio', 'portfolio', 'noir', 'neon', 'impacto'], fonte: 'forte', fonteSerifa: 'editorial', fonteSans: 'forte',
  },
  {
    id: 'estetica', nome: 'Estética, beleza e bem-estar', palavras: ['estetica', 'harmoniz', 'spa', 'massagem', 'depila', 'sobrancelha', 'maquiag', 'salao', 'cabelei', 'beleza', 'manicure', 'unha', 'cilios', 'podolog', 'bem-estar', 'bem estar'],
    humor: 'Rosé, ameixa e nude: delicadeza, cuidado e sofisticação, com um toque dourado de luxo.',
    paletas: [
      { nome: 'Rosé', primaria: '#9d4e6b', destaque: '#e0b084' },
      { nome: 'Ameixa', primaria: '#6b2d5c', destaque: '#e9b872' },
      { nome: 'Nude', primaria: '#a1695a', destaque: '#d9b99b' },
      { nome: 'Sálvia', primaria: '#5f7a6a', destaque: '#e6c79c' },
    ],
    modelos: ['ritual', 'fragrancia', 'natural', 'noir', 'editorial', 'aurora'], fonte: 'luxo', fonteSerifa: 'luxo', fonteSans: 'moderna',
  },
  {
    id: 'odonto', nome: 'Odontologia', palavras: ['odonto', 'dentist', 'ortodont', 'implante', 'sorriso'],
    humor: 'Azul limpo com verde-água: higiene, confiança e sorriso novo.',
    paletas: [
      { nome: 'Azul clínico', primaria: '#1e6fd9', destaque: '#18b8a4' },
      { nome: 'Petróleo', primaria: '#0f7c8a', destaque: '#2f9e6f' },
      { nome: 'Céu', primaria: '#2563eb', destaque: '#06b6d4' },
    ],
    modelos: ['sorriso', 'clinica', 'noir', 'natural', 'escritorio'], fonte: 'moderna', fonteSerifa: 'sobria', fonteSans: 'moderna',
  },
  {
    id: 'mente', nome: 'Psicologia e terapias', palavras: ['psicolog', 'psiquiat', 'psicanal', 'terapia', 'terapeut', 'neuropsic', 'constelac', 'saude mental', 'mindful', 'logoped', 'fonoaud'],
    humor: 'Tons suaves de sálvia, azul-sereno e terracota: acolhimento, calma e espaço para respirar. Nada de painel ou tecnologia: aqui o que vende é confiança e cuidado.',
    paletas: [
      { nome: 'Sálvia', primaria: '#4f7a6a', destaque: '#d9a96b' },
      { nome: 'Azul sereno', primaria: '#3f6f94', destaque: '#e0b084' },
      { nome: 'Lavanda', primaria: '#6b5b95', destaque: '#e6c79c' },
      { nome: 'Terracota suave', primaria: '#a1695a', destaque: '#8fb8a8' },
    ],
    modelos: ['natural', 'escritorio', 'clinica', 'classico', 'aurora', 'editorial'], fonte: 'elegante', fonteSerifa: 'elegante', fonteSans: 'moderna',
  },
  {
    id: 'saude', nome: 'Saúde e clínicas', palavras: ['clinic', 'medic', 'saude', 'fisio', 'nutri', 'laborat', 'farmac', 'oftalm', 'ortoped', 'pediatr', 'quiropr', 'dermat', 'cardio', 'exame', 'hospital', 'gastro', 'ginecolog', 'urolog', 'endocrin', 'neurolog', 'otorrino', 'reumat', 'pneumo', 'oncolog', 'proctolog', 'hematolog', 'nefrolog', 'angiolog', 'alergist', 'imunolog', 'infectolog', 'mastolog', 'geriatr', 'obstetr', 'anestesi', 'cirurg', 'doutor', 'doutora', 'dr ', 'dra ', 'posto de saude', 'ambulatorio', 'vacina', 'reabilit', 'ultrassom', 'diagnost', 'olhos', 'consultorio', 'centro medico', 'pronto atend', 'pronto socorro', 'check up', 'checkup', 'clinico'],
    humor: 'Azul, verde-água e branco: limpeza, calma e confiança, as cores que a pessoa espera de quem cuida da saúde.',
    paletas: [
      { nome: 'Petróleo', primaria: '#0f7c8a', destaque: '#2f9e6f' },
      { nome: 'Azul clínico', primaria: '#1e6fd9', destaque: '#18b8a4' },
      { nome: 'Menta', primaria: '#0f766e', destaque: '#84cc16' },
      { nome: 'Céu', primaria: '#2563eb', destaque: '#06b6d4' },
    ],
    modelos: ['clinica', 'sorriso', 'natural', 'noir', 'escritorio', 'aurora'], fonte: 'moderna', fonteSerifa: 'sobria', fonteSans: 'moderna',
  },
  {
    id: 'juridico', nome: 'Advocacia, contabilidade e consultoria', palavras: ['advoga', 'advoca', 'juridic', 'contab', 'contador', 'seguro', 'consult', 'despachante', 'cartorio', 'notari'],
    humor: 'Azul-marinho, verde-garrafa e dourado: seriedade, tradição e confiança para quem cuida de assunto delicado.',
    paletas: [
      { nome: 'Marinho e ouro', primaria: '#1b2a4a', destaque: '#b08d57' },
      { nome: 'Verde-garrafa', primaria: '#14452f', destaque: '#c9a24a' },
      { nome: 'Grafite', primaria: '#2c3340', destaque: '#c0a062' },
      { nome: 'Bordô', primaria: '#5b1a2b', destaque: '#c8a35f' },
    ],
    modelos: ['classico', 'escritorio', 'premio', 'noir', 'editorial'], fonte: 'sobria', fonteSerifa: 'sobria', fonteSans: 'moderna',
  },
  {
    id: 'imoveis', nome: 'Imobiliária e corretagem', palavras: ['imobili', 'corretor', 'incorpor', 'locacao', 'condominio'],
    humor: 'Azul profundo, grafite e dourado: solidez, patrimônio e negócio fechado com segurança.',
    paletas: [
      { nome: 'Azul profundo', primaria: '#13405b', destaque: '#d6a03c' },
      { nome: 'Grafite e areia', primaria: '#3b3a36', destaque: '#c8a97e' },
      { nome: 'Musgo', primaria: '#3f4d3a', destaque: '#d2b48c' },
    ],
    modelos: ['arquitetura', 'escritorio', 'classico', 'fintech'], fonte: 'editorial', fonteSerifa: 'editorial', fonteSans: 'moderna',
  },
  {
    id: 'arquitetura', nome: 'Arquitetura, interiores e obras', palavras: ['arquitet', 'decoracao', 'interior', 'paisag', 'construtora', 'marcenar', 'movel', 'moveis', 'planejad', 'engenhar'],
    humor: 'Grafite, areia e verde-musgo: materiais de verdade, calma e bom gosto.',
    paletas: [
      { nome: 'Grafite e areia', primaria: '#3b3a36', destaque: '#c8a97e' },
      { nome: 'Azul profundo', primaria: '#13405b', destaque: '#d6a03c' },
      { nome: 'Musgo', primaria: '#3f4d3a', destaque: '#d2b48c' },
    ],
    modelos: ['arquitetura', 'planta', 'noir', 'escritorio'], fonte: 'editorial', fonteSerifa: 'editorial', fonteSans: 'moderna',
  },
  {
    id: 'oficina', nome: 'Mecânica, obras e indústria', palavras: ['mecan', 'oficina', 'auto pecas', 'autopecas', 'funilar', 'eletric', 'encanad', 'pintor', 'serralher', 'vidrac', 'material de constru', 'constru', 'reforma', 'industri', 'logistic', 'transport', 'guincho', 'borrachar', 'ar condicionado', 'refrigera'],
    humor: 'Laranja e amarelo com grafite: força, segurança e a cor de quem trabalha de capacete.',
    paletas: [
      { nome: 'Laranja obra', primaria: '#c2410c', destaque: '#facc15' },
      { nome: 'Azul aço', primaria: '#1d4ed8', destaque: '#f97316' },
      { nome: 'Vermelho motor', primaria: '#b91c1c', destaque: '#fbbf24' },
      { nome: 'Grafite e amarelo', primaria: '#27272a', destaque: '#facc15' },
    ],
    modelos: ['oficina', 'b2b', 'impacto', 'vibrante', 'showroom'], fonte: 'forte', fonteSerifa: 'editorial', fonteSans: 'forte',
  },
  {
    id: 'fitness', nome: 'Academia, esporte e dança', palavras: ['academia', 'fitness', 'crossfit', 'pilates', 'danca', 'natacao', 'esporte', 'muscula', 'luta', 'jiu', 'yoga', 'treino'],
    humor: 'Vermelho, lima e neon: energia, movimento e vontade de levantar do sofá.',
    paletas: [
      { nome: 'Energia', primaria: '#e0451f', destaque: '#facc15' },
      { nome: 'Lima', primaria: '#0f172a', destaque: '#a3e635' },
      { nome: 'Neon', primaria: '#6d28d9', destaque: '#22d3ee' },
      { nome: 'Fogo', primaria: '#ea580c', destaque: '#fde047' },
    ],
    modelos: ['impacto', 'neon', 'vibrante', 'estudio', 'noir'], fonte: 'forte', fonteSerifa: 'editorial', fonteSans: 'forte',
  },
  {
    id: 'educacao', nome: 'Escola, cursos e idiomas', palavras: ['escola', 'curso', 'idioma', 'infantil', 'creche', 'coaching', 'faculdade', 'reforco', 'musica', 'ingles', 'colegio'],
    humor: 'Roxo, azul vivo e amarelo: curiosidade, alegria e cabeça aberta para aprender.',
    paletas: [
      { nome: 'Roxo curioso', primaria: '#6d28d9', destaque: '#f59e0b' },
      { nome: 'Azul vivo', primaria: '#2563eb', destaque: '#facc15' },
      { nome: 'Verde aprender', primaria: '#059669', destaque: '#f97316' },
      { nome: 'Coral', primaria: '#e11d48', destaque: '#38bdf8' },
    ],
    modelos: ['vibrante', 'campus'], fonte: 'amigavel', fonteSerifa: 'artesanal', fonteSans: 'amigavel',
  },
  {
    id: 'moda', nome: 'Joalheria, moda e presentes', palavras: ['joalher', 'perfum', 'boutique', 'moda', 'roupa', 'brinqued', 'presente', 'calcado', 'bolsa', 'oculos', 'relojo', 'loja de'],
    humor: 'Preto, champagne e vinho: exclusividade, brilho discreto e produto no centro.',
    paletas: [
      { nome: 'Champagne', primaria: '#1f1f1f', destaque: '#c9a227' },
      { nome: 'Vinho e ouro', primaria: '#4a1020', destaque: '#d8b36a' },
      { nome: 'Esmeralda', primaria: '#0b3d2e', destaque: '#d4b062' },
      { nome: 'Rosa antigo', primaria: '#6b3a4a', destaque: '#e7c9a9' },
    ],
    modelos: ['fragrancia', 'estudio', 'noir', 'editorial'], fonte: 'luxo', fonteSerifa: 'luxo', fonteSans: 'moderna',
  },
  {
    id: 'natureza', nome: 'Agro, jardim e produtos naturais', palavras: ['agro', 'rural', 'jardin', 'floricult', 'planta', 'organic', 'natural', 'horta', 'fazenda', 'viveiro', 'flores', 'floraria'],
    humor: 'Verdes de folha e terra: natureza, frescor e coisa que vem do campo.',
    paletas: [
      { nome: 'Folha', primaria: '#2f6b3a', destaque: '#d97706' },
      { nome: 'Oliva', primaria: '#55612a', destaque: '#e3b04b' },
      { nome: 'Mata', primaria: '#166534', destaque: '#a3e635' },
    ],
    modelos: ['agro', 'natural', 'fragrancia'], fonte: 'artesanal', fonteSerifa: 'artesanal', fonteSans: 'moderna',
  },
  {
    id: 'tecnologia', nome: 'Tecnologia, software e marketing', palavras: ['tecnolog', 'software', 'sistema', 'aplicativo', 'marketing', 'agencia', 'startup', 'informatica', 'ti ', 'desenvolvimento', 'design', 'coworking', 'telecom', 'internet'],
    humor: 'Índigo, ciano e violeta: precisão, futuro e inovação.',
    paletas: [
      { nome: 'Índigo', primaria: '#4338ca', destaque: '#22d3ee' },
      { nome: 'Elétrico', primaria: '#2d3a8c', destaque: '#00b8a9' },
      { nome: 'Violeta', primaria: '#7c3aed', destaque: '#f472b6' },
    ],
    modelos: ['fintech', 'b2b', 'bento', 'campus'], fonte: 'tecnologica', fonteSerifa: 'editorial', fonteSans: 'tecnologica',
  },
  {
    id: 'turismo', nome: 'Hotel, pousada e turismo', palavras: ['hote', 'pousada', 'turismo', 'viagem', 'hostel', 'resort', 'camping', 'chale', 'hospedagem', 'passeio'],
    humor: 'Azul-mar, turquesa e areia: descanso, horizonte e o clima de férias.',
    paletas: [
      { nome: 'Mar', primaria: '#0b6e6e', destaque: '#e7a33e' },
      { nome: 'Profundo', primaria: '#0c4a6e', destaque: '#fcd34d' },
      { nome: 'Ilha', primaria: '#0e7490', destaque: '#fb923c' },
    ],
    modelos: ['editorial', 'natural', 'noir'], fonte: 'elegante', fonteSerifa: 'elegante', fonteSans: 'moderna',
  },
  {
    id: 'eventos', nome: 'Eventos, festas e fotografia', palavras: ['evento', 'festa', 'buffet', 'fotograf', 'cerimonial', 'casamento', 'decoracao de festa', 'dj', 'noturna', 'balada', 'espaco de eventos', 'game'],
    humor: 'Magenta, roxo e dourado: celebração, brilho e noite especial.',
    paletas: [
      { nome: 'Magenta', primaria: '#7a2e5c', destaque: '#d4a24c' },
      { nome: 'Roxo festa', primaria: '#581c87', destaque: '#f0abfc' },
      { nome: 'Vinho', primaria: '#7f1d1d', destaque: '#fcd34d' },
    ],
    modelos: ['estudio', 'neon', 'portfolio', 'editorial'], fonte: 'editorial', fonteSerifa: 'editorial', fonteSans: 'forte',
  },
  {
    id: 'veiculos', nome: 'Veículos e concessionárias', palavras: ['concession', 'veiculo', 'carro', 'moto', 'seminovo', 'automov', 'locadora', 'estetica automotiva', 'lava jato'],
    humor: 'Vermelho, prata e preto: velocidade, brilho de lataria e confiança de showroom.',
    paletas: [
      { nome: 'Vermelho esportivo', primaria: '#b4121b', destaque: '#cbd5e1' },
      { nome: 'Azul noite', primaria: '#0f1f3d', destaque: '#94a3b8' },
      { nome: 'Preto e âmbar', primaria: '#18181b', destaque: '#f59e0b' },
    ],
    modelos: ['showroom', 'impacto', 'noir'], fonte: 'forte', fonteSerifa: 'editorial', fonteSans: 'forte',
  },
  {
    id: 'financeiro', nome: 'Finanças e crédito', palavras: ['credito', 'financ', 'emprestimo', 'investiment', 'cambio', 'consorcio', 'cooperativa', 'banco', 'cobranca'],
    humor: 'Verde-esmeralda e azul: dinheiro, crescimento e segurança.',
    paletas: [
      { nome: 'Esmeralda', primaria: '#0a6b52', destaque: '#f2b705' },
      { nome: 'Azul banco', primaria: '#0b3b8c', destaque: '#38bdf8' },
    ],
    modelos: ['credito', 'fintech', 'premio'], fonte: 'moderna', fonteSerifa: 'sobria', fonteSans: 'moderna',
  },
  {
    id: 'limpeza', nome: 'Limpeza e serviços domésticos', palavras: ['limpeza', 'lavanderia', 'dedetiz', 'higieniz', 'diarista', 'conservadora', 'piscina', 'chaveiro', 'mudanca'],
    humor: 'Azul-água e verde-limpo: frescor, higiene e casa em ordem.',
    paletas: [
      { nome: 'Azul fresco', primaria: '#0284c7', destaque: '#34d399' },
      { nome: 'Verde limpo', primaria: '#0f766e', destaque: '#fde047' },
    ],
    modelos: ['bento', 'oficina', 'vibrante'], fonte: 'amigavel', fonteSerifa: 'sobria', fonteSans: 'moderna',
  },
  {
    id: 'mercado', nome: 'Mercado, açougue e hortifruti', palavras: ['mercado', 'mercearia', 'hortifruti', 'acougue', 'supermerc', 'emporio', 'quitanda', 'adega', 'distribuidora', 'atacado', 'conveniencia'],
    humor: 'Verde-feira e vermelho-promoção: fartura, frescor e preço bom.',
    paletas: [
      { nome: 'Feira', primaria: '#0f5132', destaque: '#f2a900' },
      { nome: 'Promoção', primaria: '#b91c1c', destaque: '#facc15' },
    ],
    modelos: ['agro', 'vibrante', 'forno'], fonte: 'amigavel', fonteSerifa: 'artesanal', fonteSans: 'forte',
  },
];

const GENERICO: Segmento = {
  id: 'generico', nome: 'Negócio local', palavras: [],
  humor: 'Cores sóbrias e confiáveis, que combinam com qualquer ramo.',
  paletas: [
    { nome: 'Azul profundo', primaria: '#1f4fd8', destaque: '#f59e0b' },
    { nome: 'Teal', primaria: '#0f766e', destaque: '#f59e0b' },
    { nome: 'Grafite', primaria: '#334155', destaque: '#38bdf8' },
    { nome: 'Vinho', primaria: '#9f1239', destaque: '#fbbf24' },
  ],
  modelos: ['noir', 'premio', 'escritorio', 'natural'], fonte: 'moderna', fonteSerifa: 'editorial', fonteSans: 'moderna',
};

/**
 * Modelos com cara de painel, tecnologia ou prancha técnica. Só entram em segmentos onde isso faz sentido:
 * ninguém espera um "dashboard" no site de uma psicóloga ou de uma padaria.
 */
export const MODELOS_DE_PAINEL: Record<string, string[]> = {
  bento: ['tecnologia', 'limpeza'],
  fintech: ['tecnologia', 'financeiro', 'imoveis'],
  b2b: ['tecnologia', 'oficina'],
  campus: ['tecnologia', 'educacao'],
  planta: ['arquitetura'],
};

/** Modelos feitos em itálico serifado: pedem fonte com serifa. */
const MODELOS_SERIFADOS = new Set(['noir', 'editorial', 'fragrancia']);
/** Modelos de título pesado e condensado: pedem fonte sem serifa. */
const MODELOS_PESADOS = new Set(['portfolio', 'neon', 'b2b', 'campus', 'impacto']);

const semAcento = (t?: string) => (t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const hash = (texto: string): number => {
  let h = 0;
  for (let i = 0; i < texto.length; i++) h = (h * 31 + texto.charCodeAt(i)) >>> 0;
  return h;
};

const normalizar = (t?: string) => semAcento(t).replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Casa por INÍCIO de palavra: "logist" não pode casar com "gastroenterologistas" (era isso que mandava toda clínica de especialista
 * para o modelo de oficina). Um espaço no fim da palavra do segmento ("bar ") exige a palavra inteira.
 */
const acha = (texto: string, s: Segmento): boolean => {
  const alvo = ` ${normalizar(texto)} `;
  if (alvo.trim() === '') return false;
  return s.palavras.some(p => alvo.includes(` ${normalizar(p)}${p.endsWith(' ') ? ' ' : ''}`));
};

/** O segmento do ramo ("Dentistas", "Pizzaria", "Pet shop"...). Se o ramo não diz, o nome da empresa ("Clínica Santa Clara", "Dra. Ana") diz. */
export const segmentoDoRamo = (ramo?: string, empresa = ''): Segmento => {
  for (const s of SEGMENTOS) if (acha(ramo || '', s)) return s;
  if (empresa) for (const s of SEGMENTOS) if (acha(empresa, s)) return s;
  return GENERICO;
};

/** Um ramo "de dicionário" para cada segmento: quando o segmento vem do nome da empresa ou da IA, o motor trabalha com este texto. */
export const RAMO_DO_SEGMENTO: Record<string, string> = {
  pet: 'Pet shop', doces: 'Padaria e confeitaria', comida: 'Restaurante', barbearia: 'Barbearia', estetica: 'Clínica de estética',
  odonto: 'Clínica odontológica', mente: 'Psicologia', saude: 'Clínica médica', juridico: 'Advocacia', imoveis: 'Imobiliária',
  arquitetura: 'Arquitetura e interiores', oficina: 'Oficina mecânica', fitness: 'Academia', educacao: 'Escola', moda: 'Loja de moda',
  natureza: 'Floricultura', tecnologia: 'Agência de marketing', turismo: 'Hotel e pousada', eventos: 'Espaço de eventos',
  veiculos: 'Concessionária', financeiro: 'Crédito e finanças', limpeza: 'Limpeza e serviços domésticos', mercado: 'Mercado',
};

/**
 * O ramo com que o motor decide cor, modelo e texto. O ramo da busca vale primeiro; sem ele, o nome da empresa; sem ele, o segmento que
 * a IA reconheceu (`segmentoIA`, um dos ids acima). Só se nada disso reconhece, segue o ramo como veio (negócio genérico).
 */
export const ramoEfetivo = (ramo?: string, empresa = '', segmentoIA = ''): string => {
  const bruto = ramo || '';
  if (acha(bruto, GENERICO) || segmentoDoRamo(bruto).id !== 'generico') return bruto;
  const porNome = segmentoDoRamo('', empresa);
  if (porNome.id !== 'generico') return RAMO_DO_SEGMENTO[porNome.id] || bruto;
  const ia = String(segmentoIA || '').trim().toLowerCase();
  return RAMO_DO_SEGMENTO[ia] || bruto;
};

export const todosOsSegmentos = (): Segmento[] => [...SEGMENTOS, GENERICO];

export type Direcao = {
  segmento: Segmento;
  paleta: Paleta;
  modelos: string[];
  fonte: string;
};

/** A direção de arte desta empresa: a paleta e os modelos do segmento, escolhidos de forma estável por empresa. */
export const direcaoDeArte = (ramo?: string, empresa = ''): Direcao => {
  const segmento = segmentoDoRamo(ramo, empresa);
  const paleta = segmento.paletas[hash(`${empresa}|cor`) % segmento.paletas.length];
  return { segmento, paleta, modelos: segmento.modelos, fonte: segmento.fonte };
};

/** O par de fontes que combina com o modelo escolhido dentro do segmento. */
export const fonteDoModelo = (segmentoId: string, modeloId: string): string => {
  const s = todosOsSegmentos().find(x => x.id === segmentoId) || GENERICO;
  if (MODELOS_SERIFADOS.has(modeloId)) return s.fonteSerifa;
  if (MODELOS_PESADOS.has(modeloId)) return s.fonteSans;
  return s.fonte;
};
