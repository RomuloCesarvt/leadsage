/**
 * Catálogo de nichos da busca.
 *
 * A busca roda no Google Maps, então o nicho é um texto de pesquisa: o que
 * está aqui são atalhos para os negócios locais mais comuns, agrupados por
 * categoria, no plural que o Maps entende ("Padarias", não "Padaria").
 * O seletor também aceita texto livre — nenhum ramo fica de fora por não
 * estar na lista.
 */

export interface CategoriaDeNichos {
  categoria: string;
  /** nome do ícone no seletor (mapa explícito lá, para não puxar a biblioteca inteira) */
  icone: string;
  nichos: string[];
}

export const CATEGORIAS: CategoriaDeNichos[] = [
  {
    categoria: 'Saúde e Medicina', icone: 'HeartPulse',
    nichos: [
      'Clínicas médicas', 'Médicos', 'Clínicos gerais', 'Pediatras', 'Ginecologistas', 'Obstetras', 'Cardiologistas',
      'Dermatologistas', 'Ortopedistas', 'Oftalmologistas', 'Otorrinolaringologistas', 'Urologistas', 'Endocrinologistas',
      'Neurologistas', 'Psiquiatras', 'Gastroenterologistas', 'Reumatologistas', 'Pneumologistas', 'Oncologistas',
      'Geriatras', 'Nutrólogos', 'Cirurgiões plásticos', 'Anestesiologistas', 'Mastologistas', 'Proctologistas',
      'Clínicas de cirurgia plástica', 'Clínicas de fertilidade', 'Clínicas do sono', 'Clínicas de emagrecimento',
      'Clínicas de reabilitação', 'Clínicas de recuperação', 'Clínicas geriátricas', 'Casas de repouso', 'Home care',
      'Cuidadores de idosos', 'Hospitais', 'Maternidades', 'Pronto atendimento', 'Clínicas de vacinação',
      'Laboratórios de análises clínicas', 'Clínicas de diagnóstico por imagem', 'Clínicas de radiologia',
      'Clínicas de hemodiálise', 'Clínicas de oncologia', 'Clínicas de ortopedia', 'Clínicas de oftalmologia',
      'Farmácias', 'Farmácias de manipulação', 'Drogarias', 'Lojas de produtos ortopédicos', 'Lojas de aparelhos auditivos',
      'Óticas', 'Medicina do trabalho', 'Clínicas populares', 'Clínicas de medicina estética', 'Clínicas de dor',
      'Clínicas de nutrição', 'Clínicas de endocrinologia',
    ],
  },
  {
    categoria: 'Odontologia', icone: 'HeartPulse',
    nichos: [
      'Clínicas odontológicas', 'Dentistas', 'Ortodontistas', 'Implantodontistas', 'Endodontistas', 'Periodontistas',
      'Odontopediatras', 'Cirurgiões bucomaxilofaciais', 'Clínicas de harmonização orofacial', 'Clareamento dental',
      'Protéticos dentários', 'Laboratórios de prótese dentária', 'Radiologia odontológica', 'Lojas de materiais odontológicos',
      'Dentistas 24 horas', 'Clínicas de lentes de contato dental',
    ],
  },
  {
    categoria: 'Saúde Mental e Terapias', icone: 'HeartPulse',
    nichos: [
      'Psicólogos', 'Psicanalistas', 'Terapeutas', 'Terapeutas de casal', 'Neuropsicólogos', 'Psicopedagogos',
      'Fonoaudiólogos', 'Terapeutas ocupacionais', 'Fisioterapeutas', 'Clínicas de fisioterapia', 'Fisioterapia pélvica',
      'Quiropraxia', 'Osteopatas', 'Acupuntura', 'Massoterapeutas', 'Terapias holísticas', 'Reiki', 'Constelação familiar',
      'Hipnoterapeutas', 'Clínicas de psicologia', 'Clínicas de neurodesenvolvimento', 'Clínicas de autismo',
      'Nutricionistas', 'Nutricionistas esportivos', 'Podólogos', 'Naturopatas',
    ],
  },
  {
    categoria: 'Beleza e Estética', icone: 'Sparkles',
    nichos: [
      'Salões de beleza', 'Cabeleireiros', 'Barbearias', 'Barbearias premium', 'Manicures', 'Studios de unhas',
      'Designers de sobrancelha', 'Studios de cílios', 'Micropigmentação', 'Maquiadores', 'Clínicas de estética',
      'Esteticistas', 'Depilação a laser', 'Depilação com cera', 'Spas', 'Day spa', 'Estúdios de bronzeamento',
      'Extensão capilar', 'Tricologia', 'Salões de noivas', 'Lojas de cosméticos', 'Perfumarias', 'Distribuidoras de cosméticos',
      'Lojas de produtos para cabelo', 'Estúdios de tatuagem', 'Tatuadores', 'Estúdios de piercing', 'Clínicas de podologia',
      'Alongamento de unhas', 'Escovarias', 'Studios de beleza', 'Centros de estética corporal', 'Clínicas de criolipólise',
      'Massagem relaxante', 'Salões unissex', 'Lojas de maquiagem',
    ],
  },
  {
    categoria: 'Esportes e Fitness', icone: 'Dumbbell',
    nichos: [
      'Academias', 'Academias de musculação', 'Crossfit', 'Estúdios de pilates', 'Estúdios de yoga', 'Personal trainers',
      'Estúdios de treino funcional', 'Estúdios de treino personalizado', 'Escolas de natação', 'Escolas de artes marciais',
      'Academias de jiu-jitsu', 'Academias de boxe', 'Academias de muay thai', 'Academias de judô', 'Academias de karatê',
      'Capoeira', 'Escolas de dança', 'Escolas de ballet', 'Escolas de tênis', 'Quadras de beach tennis', 'Quadras de padel',
      'Quadras de futebol society', 'Aluguel de quadras', 'Escolinhas de futebol', 'Assessorias esportivas',
      'Assessorias de corrida', 'Clubes esportivos', 'Clubes de tênis', 'Lojas de artigos esportivos', 'Lojas de suplementos',
      'Lojas de bicicletas', 'Bicicletarias', 'Surf shops', 'Skate shops', 'Lojas de pesca', 'Lojas de camping',
      'Escalada', 'Hidroginástica', 'Estúdios de ginástica', 'Estúdios de spinning', 'Academias de ginástica artística',
      'Academias ao ar livre', 'Arenas esportivas', 'Pistas de patinação',
    ],
  },
  {
    categoria: 'Alimentação e Bebidas', icone: 'Utensils',
    nichos: [
      'Restaurantes', 'Pizzarias', 'Hamburguerias', 'Lanchonetes', 'Padarias', 'Panificadoras', 'Confeitarias', 'Doceiras',
      'Cafeterias', 'Sorveterias', 'Açaiterias', 'Churrascarias', 'Restaurantes japoneses', 'Sushi', 'Restaurantes italianos',
      'Cantinas', 'Marmitarias', 'Restaurantes self-service', 'Restaurantes por quilo', 'Bares', 'Botecos', 'Pubs',
      'Cervejarias', 'Choperias', 'Adegas', 'Distribuidoras de bebidas', 'Lojas de vinhos', 'Empórios', 'Mercearias',
      'Hortifrutis', 'Açougues', 'Casas de carnes', 'Peixarias', 'Quitandas', 'Salgaderias', 'Pastelarias', 'Tapiocarias',
      'Creperias', 'Docerias', 'Lojas de chocolate', 'Casas de chá', 'Food trucks', 'Dark kitchens', 'Restaurantes veganos',
      'Rotisserias', 'Padarias artesanais', 'Cozinhas industriais', 'Restaurantes árabes', 'Restaurantes mexicanos',
      'Restaurantes chineses', 'Restaurantes de comida caseira', 'Restaurantes de frutos do mar', 'Pizzas delivery',
      'Casas de sucos', 'Lojas de salgados congelados', 'Fábricas de gelo', 'Distribuidoras de alimentos',
      'Atacadistas de alimentos', 'Cafés especiais', 'Casas de bolos', 'Cestas de café da manhã', 'Hot dogs', 'Espetarias',
      'Restaurantes de comida mineira', 'Restaurantes de comida nordestina', 'Churrasco delivery', 'Marmitex',
    ],
  },
  {
    categoria: 'Comércio e Varejo', icone: 'ShoppingBag',
    nichos: [
      'Lojas de roupas', 'Boutiques', 'Moda feminina', 'Moda masculina', 'Moda infantil', 'Moda plus size', 'Moda praia',
      'Moda íntima', 'Moda fitness', 'Moda evangélica', 'Lojas de calçados', 'Lojas de bolsas e acessórios', 'Joalherias',
      'Semijoias', 'Relojoarias', 'Lojas de brinquedos', 'Papelarias', 'Livrarias', 'Sebos', 'Lojas de presentes',
      'Lojas de artigos de festa', 'Floriculturas', 'Lojas de cama, mesa e banho', 'Lojas de móveis', 'Lojas de colchões',
      'Lojas de eletrodomésticos', 'Lojas de eletrônicos', 'Lojas de celulares', 'Lojas de informática', 'Lojas de games',
      'Lojas de instrumentos musicais', 'Lojas de produtos naturais', 'Lojas de utilidades domésticas', 'Lojas de decoração',
      'Antiquários', 'Brechós', 'Lojas de artesanato', 'Lojas de artigos religiosos', 'Tabacarias', 'Lojas de uniformes',
      'Lojas de fantasias', 'Lojas de material escolar', 'Lojas de material de escritório', 'Armarinhos', 'Lojas de tecidos',
      'Lojas de ferramentas', 'Supermercados', 'Minimercados', 'Atacarejos', 'Lojas de conveniência', 'Distribuidoras',
      'Atacadistas', 'Importadoras', 'Representantes comerciais', 'E-commerces', 'Lojas virtuais', 'Showrooms', 'Outlets',
      'Galerias de arte', 'Lojas de molduras', 'Lojas de produtos importados', 'Lojas de artigos para bebês', 'Enxovais',
      'Lojas de embalagens', 'Lojas de esquadrias', 'Lojas de aquários', 'Lojas de tintas', 'Lojas de lustres',
      'Lojas de pisos e revestimentos', 'Lojas de eletrônicos usados', 'Lojas de motos', 'Lojas de cutelaria',
      'Casas lotéricas', 'Bancas de jornal', 'Lojas de souvenirs', 'Lojas de artigos náuticos', 'Lojas de som e imagem',
      'Lojas de vidros e espelhos', 'Lojas de cortinas', 'Lojas de tapetes', 'Lojas de utilidades importadas',
    ],
  },
  {
    categoria: 'Imóveis e Condomínios', icone: 'Building',
    nichos: [
      'Imobiliárias', 'Corretores de imóveis', 'Incorporadoras', 'Construtoras', 'Loteadoras', 'Administradoras de condomínio',
      'Administradoras de imóveis', 'Avaliadores de imóveis', 'Despachantes imobiliários', 'Locação de temporada',
      'Condomínios', 'Condomínios fechados', 'Coworking', 'Escritórios virtuais', 'Salas comerciais', 'Galpões para locação',
      'Imobiliárias de aluguel', 'Imóveis rurais', 'Imóveis de luxo', 'Lançamentos imobiliários', 'Consultores imobiliários',
      'Vistoria de imóveis', 'Home stagers',
    ],
  },
  {
    categoria: 'Construção, Reforma e Arquitetura', icone: 'Hammer',
    nichos: [
      'Arquitetos', 'Escritórios de arquitetura', 'Engenheiros civis', 'Engenheiros eletricistas', 'Designers de interiores',
      'Decoradores', 'Paisagistas', 'Empreiteiras', 'Pedreiros', 'Pintores', 'Gesseiros', 'Marcenarias', 'Móveis planejados',
      'Serralherias', 'Vidraçarias', 'Marmorarias', 'Materiais de construção', 'Madeireiras', 'Lojas de pisos e revestimentos',
      'Lojas de iluminação', 'Lojas de material elétrico', 'Lojas de material hidráulico', 'Ferragens', 'Depósitos de construção',
      'Concreteiras', 'Terraplanagem', 'Poços artesianos', 'Impermeabilização', 'Telhados e coberturas', 'Esquadrias de alumínio',
      'Portões automáticos', 'Toldos e coberturas', 'Pisos e carpetes', 'Papel de parede', 'Cortinas e persianas',
      'Forros e divisórias', 'Energia solar', 'Instaladores de painéis solares', 'Construção de piscinas', 'Churrasqueiras',
      'Lareiras', 'Elevadores', 'Instalação de ar-condicionado', 'Topografia', 'Reformas residenciais', 'Reformas comerciais',
      'Demolições', 'Caçambas', 'Locação de equipamentos de construção', 'Containers', 'Casas pré-fabricadas', 'Steel frame',
      'Drywall', 'Pré-moldados', 'Estruturas metálicas', 'Vidros temperados', 'Box para banheiro', 'Granitos', 'Revestimentos',
      'Lojas de tintas', 'Lojas de azulejos', 'Cerâmicas', 'Olarias', 'Fábricas de blocos', 'Instalações elétricas',
      'Instalações hidráulicas', 'Projetos elétricos', 'Projetos estruturais', 'Laudos e vistorias técnicas', 'Mestres de obras',
    ],
  },
  {
    categoria: 'Serviços Residenciais e Gerais', icone: 'Wrench',
    nichos: [
      'Eletricistas', 'Encanadores', 'Desentupidoras', 'Chaveiros', 'Diaristas', 'Empresas de limpeza', 'Limpeza pós-obra',
      'Lavanderias', 'Tinturarias', 'Costureiras', 'Ateliês de costura', 'Sapateiros', 'Conserto de eletrodomésticos',
      'Assistência técnica', 'Assistência de celular', 'Assistência de notebooks', 'Técnicos de ar-condicionado', 'Dedetizadoras',
      'Controle de pragas', 'Jardinagem', 'Podas de árvores', 'Manutenção de piscinas', 'Montadores de móveis', 'Tapeceiros',
      'Reforma de sofás', 'Lavagem de estofados', 'Limpeza de caixa d’água', 'Higienização de ar-condicionado', 'Instalação de TV',
      'Instaladores de antenas', 'Conserto de geladeiras', 'Conserto de máquinas de lavar', 'Calhas e rufos', 'Zeladoria',
      'Empresas de portaria', 'Empresas de terceirização', 'Agências de babás', 'Distribuidoras de gás', 'Distribuidoras de água mineral',
      'Funerárias', 'Cemitérios', 'Cremação', 'Mudanças residenciais', 'Marceneiros', 'Lavagem de carros a domicílio', 'Despachantes',
      'Cartórios', 'Gráficas rápidas', 'Copiadoras', 'Chaveiros 24 horas', 'Vidraceiros', 'Eletricistas 24 horas',
      'Reparos domésticos', 'Técnicos em fogões', 'Afiação de facas', 'Restauração de móveis', 'Dedetização de condomínios',
    ],
  },
  {
    categoria: 'Automotivo', icone: 'Car',
    nichos: [
      'Oficinas mecânicas', 'Auto centers', 'Autopeças', 'Funilarias e pintura', 'Lava-jatos', 'Estética automotiva',
      'Borracharias', 'Lojas de pneus', 'Alinhamento e balanceamento', 'Auto elétricas', 'Som automotivo', 'Insulfilm',
      'Vidros automotivos', 'Concessionárias', 'Revendas de carros usados', 'Locadoras de veículos', 'Estacionamentos',
      'Guinchos', 'Despachantes de veículos', 'Vistorias veiculares', 'Oficinas de motos', 'Concessionárias de motos',
      'Lojas de acessórios para motos', 'Retíficas de motores', 'Câmbio automático', 'Suspensão e freios', 'Ar-condicionado automotivo',
      'Lanternagem', 'Martelinho de ouro', 'Blindagem automotiva', 'Escapamentos', 'Peças para caminhão', 'Oficinas de caminhões',
      'Lojas de baterias', 'Troca de óleo', 'Rastreamento veicular', 'Proteção veicular', 'Funilarias de motos',
      'Lojas de peças de motos', 'Customização de veículos', 'Adesivos automotivos', 'Lojas de capas e tapetes',
      'Autoelétricos de caminhão', 'Centros automotivos', 'Concessionárias de caminhões', 'Venda de veículos novos',
      'Locação de motos', 'Cooperativas de táxi',
    ],
  },
  {
    categoria: 'Jurídico e Contábil', icone: 'Scale',
    nichos: [
      'Advogados', 'Escritórios de advocacia', 'Advogados trabalhistas', 'Advogados previdenciários', 'Advogados criminalistas',
      'Advogados de família', 'Advogados tributaristas', 'Advogados empresariais', 'Advogados imobiliários', 'Advogados cíveis',
      'Advogados de direito do consumidor', 'Advogados de direito médico', 'Advogados de trânsito', 'Advogados de inventário',
      'Contabilidades', 'Contadores', 'Escritórios de contabilidade', 'Contabilidade para MEI', 'BPO financeiro',
      'Consultoria tributária', 'Assessoria jurídica', 'Mediação e arbitragem', 'Peritos', 'Registro de marcas e patentes',
      'Abertura de empresas', 'Despachantes empresariais', 'Auditoria', 'Consultoria fiscal', 'Perícia contábil',
    ],
  },
  {
    categoria: 'Finanças e Seguros', icone: 'Landmark',
    nichos: [
      'Corretores de seguros', 'Seguradoras', 'Corretoras de planos de saúde', 'Corretores de consórcio', 'Consórcios',
      'Financeiras', 'Correspondentes bancários', 'Cooperativas de crédito', 'Fintechs', 'Assessorias de investimentos',
      'Planejadores financeiros', 'Casas de câmbio', 'Empresas de cobrança', 'Factoring', 'Crédito consignado',
      'Seguros de vida', 'Seguros residenciais', 'Seguros empresariais', 'Corretoras de seguros auto', 'Previdência privada',
      'Gestão de patrimônio', 'Casas de penhor', 'Compra de ouro', 'Meios de pagamento', 'Maquininhas de cartão',
    ],
  },
  {
    categoria: 'Marketing, Design e Comunicação', icone: 'Megaphone',
    nichos: [
      'Agências de marketing', 'Marketing digital', 'Gestores de tráfego', 'Agências de publicidade', 'Agências de SEO',
      'Social media', 'Produtoras de vídeo', 'Fotógrafos', 'Estúdios fotográficos', 'Videomakers', 'Designers gráficos',
      'Gráficas', 'Comunicação visual', 'Letreiros e fachadas', 'Brindes personalizados', 'Serigrafia', 'Estamparia',
      'Bordados', 'Assessoria de imprensa', 'Relações públicas', 'Pesquisa de mercado', 'Agências de influenciadores',
      'Criadores de conteúdo', 'Copywriters', 'Estúdios de podcast', 'Agências de branding', 'Designers de embalagens',
      'Impressão digital', 'Impressão em larga escala', 'Adesivos', 'Cartões de visita', 'Outdoors', 'Mídia exterior',
      'Marketing para clínicas', 'Marketing para restaurantes', 'Marketing imobiliário', 'Consultoria de vendas',
    ],
  },
  {
    categoria: 'Consultoria, RH e Negócios', icone: 'Briefcase',
    nichos: [
      'Consultorias', 'Consultoria empresarial', 'Consultoria financeira', 'Consultoria de gestão', 'Consultoria de RH',
      'Recrutamento e seleção', 'Coaches', 'Mentores', 'Agências de emprego', 'Empresas de trabalho temporário',
      'Treinamento corporativo', 'Palestrantes', 'Call centers', 'Telemarketing', 'Tradutores', 'Traduções juramentadas',
      'Intérpretes', 'Franquias', 'Consultoria de franquias', 'Assessoria empresarial', 'Escritórios compartilhados',
      'Empresas de segurança do trabalho', 'Engenharia de segurança', 'Consultoria ambiental', 'Licenciamento ambiental',
      'Certificações ISO', 'Consultoria de qualidade', 'Consultoria de logística', 'Consultoria agrícola',
      'Importação e exportação', 'Agenciamento de cargas', 'Despachantes aduaneiros', 'Representações comerciais',
    ],
  },
  {
    categoria: 'Tecnologia', icone: 'Code',
    nichos: [
      'Desenvolvedores de software', 'Software houses', 'Empresas de TI', 'Agências de desenvolvimento web', 'Suporte técnico em TI',
      'Segurança da informação', 'Provedores de internet', 'Telecomunicações', 'Hospedagem de sites', 'Startups', 'Empresas de SaaS',
      'Sistemas ERP', 'Automação comercial', 'Sistemas para clínicas', 'Empresas de IoT', 'Empresas de automação residencial',
      'Fabricantes de eletrônicos', 'Lan houses', 'Data centers', 'Consultoria em nuvem', 'Desenvolvimento de aplicativos',
      'Criação de sites', 'Lojas de informática', 'Assistência técnica de computadores', 'Assistência técnica de celulares',
      'Empresas de câmeras de segurança', 'Cabeamento estruturado', 'Redes e infraestrutura', 'Inteligência artificial',
      'Marketing de automação', 'Empresas de chatbots', 'Telefonia IP', 'Rastreadores GPS', 'Impressoras (locação)',
    ],
  },
  {
    categoria: 'Segurança', icone: 'Shield',
    nichos: [
      'Empresas de segurança', 'Empresas de vigilância', 'Segurança eletrônica', 'Câmeras de segurança', 'Alarmes',
      'Portaria remota', 'Cercas elétricas', 'Controle de acesso', 'Monitoramento 24 horas', 'Segurança patrimonial',
      'Escolta armada', 'Brigadistas', 'Extintores', 'Prevenção de incêndio', 'Bombeiros civis', 'Blindagem',
      'Cofres', 'Fechaduras eletrônicas', 'Interfones', 'Detetives particulares',
    ],
  },
  {
    categoria: 'Educação e Cursos', icone: 'GraduationCap',
    nichos: [
      'Escolas particulares', 'Colégios', 'Escolas infantis', 'Creches', 'Berçários', 'Escolas montessorianas', 'Escolas bilíngues',
      'Cursos de idiomas', 'Escolas de inglês', 'Escolas de espanhol', 'Cursos preparatórios', 'Pré-vestibular', 'Cursos para concursos',
      'Cursos técnicos', 'Cursos profissionalizantes', 'Cursos de informática', 'Cursos de programação', 'Escolas de música',
      'Aulas de violão', 'Escolas de canto', 'Escolas de teatro', 'Escolas de artes', 'Escolas de desenho', 'Escolas de culinária',
      'Escolas de moda', 'Escolas de beleza', 'Cursos de barbeiro', 'Cursos de manicure', 'Cursos de maquiagem', 'Cursos de estética',
      'Cursos de enfermagem', 'Autoescolas', 'Escolas de pilotagem', 'Escolas de aviação', 'Escolas náuticas', 'Faculdades',
      'Universidades', 'Pós-graduação', 'Cursos online', 'Reforço escolar', 'Professores particulares', 'Escolas de xadrez',
      'Robótica educacional', 'Cursos de oratória', 'Cursos de gestão', 'Educação especial', 'Escolas de idiomas para crianças',
      'Cursos de tatuagem', 'Cursos de cabeleireiro', 'Cursos de gastronomia', 'Cursos de informática infantil',
      'Cursos de direção defensiva', 'Escolas de circo', 'Escolas de modelo', 'Escolas de fotografia', 'Escolas de design',
      'Escolas de educação financeira', 'Escolas de negócios', 'Ensino religioso',
    ],
  },
  {
    categoria: 'Pets e Animais', icone: 'Dog',
    nichos: [
      'Pet shops', 'Clínicas veterinárias', 'Veterinários', 'Hospitais veterinários', 'Banho e tosa', 'Hotéis para pets',
      'Creches para pets', 'Adestradores', 'Casas de ração', 'Canis', 'Gatis', 'Pet sitters', 'Passeadores de cães',
      'Laboratórios veterinários', 'Cremação de pets', 'Fábricas de ração', 'Lojas de aquarismo', 'Veterinários de animais exóticos',
      'Veterinários de grandes animais', 'Táxi dog', 'Fisioterapia veterinária', 'Dermatologia veterinária', 'Planos de saúde pet',
      'Haras', 'Selarias',
    ],
  },
  {
    categoria: 'Eventos e Festas', icone: 'PartyPopper',
    nichos: [
      'Buffets', 'Buffets infantis', 'Salões de festas', 'Espaços para eventos', 'Casas de recepção', 'Cerimonialistas',
      'Assessoria de eventos', 'Decoração de festas', 'Aluguel de brinquedos', 'Aluguel de mesas e cadeiras', 'Aluguel de trajes',
      'Ateliês de noivas', 'Fotógrafos de casamento', 'Videomakers de casamento', 'DJs', 'Bandas', 'Sonorização e iluminação',
      'Palcos e estruturas', 'Cabines fotográficas', 'Doces para festa', 'Bolos decorados', 'Lembrancinhas', 'Convites',
      'Floriculturas para eventos', 'Bartenders', 'Chopp delivery', 'Churrasqueiros', 'Recreação infantil', 'Animação de festas',
      'Casas de shows', 'Casas noturnas', 'Baladas', 'Clubes', 'Bares com música ao vivo', 'Karaokês', 'Boliches', 'Cinemas',
      'Teatros', 'Parques de diversões', 'Parques aquáticos', 'Paintball', 'Escape rooms', 'Locadoras de games', 'Pesqueiros',
      'Hípicas', 'Marinas', 'Aluguel de som', 'Aluguel de tendas', 'Garçons e copeiros', 'Bolos personalizados',
      'Festas de formatura', 'Eventos corporativos', 'Fogos de artifício', 'Locação de louças', 'Trajes para formatura',
    ],
  },
  {
    categoria: 'Turismo e Hospedagem', icone: 'Plane',
    nichos: [
      'Hotéis', 'Pousadas', 'Hostels', 'Resorts', 'Chalés', 'Flats', 'Apart-hotéis', 'Motéis', 'Campings', 'Agências de viagens',
      'Operadoras de turismo', 'Guias de turismo', 'Transfer', 'Turismo rural', 'Fazendas hotel', 'Passeios de barco',
      'Passeios de buggy', 'Mergulho', 'Rafting', 'Parques temáticos', 'Receptivos turísticos', 'Casas de temporada',
      'Administração de Airbnb', 'Spa resorts', 'Ecoturismo', 'Turismo de aventura', 'Turismo religioso', 'Intercâmbio',
      'Vistos e passaportes', 'Locação de motorhomes', 'Pousadas pet friendly', 'Hotéis fazenda',
    ],
  },
  {
    categoria: 'Transporte e Logística', icone: 'Truck',
    nichos: [
      'Transportadoras', 'Fretes', 'Mudanças', 'Carretos', 'Motoboys', 'Entregadores', 'Logística', 'Armazéns',
      'Centros de distribuição', 'Fulfillment', 'Agências dos Correios', 'Transporte escolar', 'Transporte executivo', 'Táxis',
      'Fretamento de vans', 'Ônibus de turismo', 'Cooperativas de transporte', 'Transporte de cargas pesadas',
      'Transporte de combustíveis', 'Locação de caminhões', 'Locação de empilhadeiras', 'Transporte de passageiros',
      'Transporte de animais', 'Transporte de mudanças interestaduais', 'Courier', 'Transporte refrigerado',
      'Transporte de veículos', 'Cargas aéreas', 'Transporte marítimo', 'Embalagens para mudança', 'Guarda-móveis', 'Self storage',
    ],
  },
  {
    categoria: 'Indústria e Produção', icone: 'Factory',
    nichos: [
      'Indústrias', 'Fábricas', 'Metalúrgicas', 'Usinagem', 'Caldeiraria', 'Fundições', 'Indústrias de plástico', 'Fábricas de embalagens',
      'Gráficas industriais', 'Indústrias têxteis', 'Confecções', 'Facções de costura', 'Malharias', 'Fábricas de calçados', 'Fábricas de móveis',
      'Indústrias alimentícias', 'Laticínios', 'Frigoríficos', 'Cervejarias artesanais', 'Cachaçarias', 'Vinícolas', 'Indústrias químicas',
      'Fabricantes de cosméticos', 'Indústrias farmacêuticas', 'Fábricas de borracha', 'Fábricas de vidro', 'Fábricas de cimento',
      'Máquinas e equipamentos', 'Manutenção industrial', 'Automação industrial', 'Elétrica industrial', 'Tratamento de água',
      'Reciclagem', 'Coleta de resíduos', 'Ferros-velhos', 'Sucatas', 'Distribuidores industriais', 'Equipamentos de proteção (EPI)',
      'Uniformes industriais', 'Fábricas de cerâmica', 'Fábricas de tintas', 'Fábricas de colchões', 'Fábricas de brinquedos',
      'Fábricas de bijuterias', 'Fábricas de velas', 'Fábricas de sabão', 'Fábricas de doces', 'Fábricas de massas', 'Fábricas de embutidos',
      'Fábricas de sorvete', 'Fábricas de pães', 'Fábricas de cadeiras', 'Serralherias industriais', 'Tornearia', 'Ferramentarias',
    ],
  },
  {
    categoria: 'Agro e Rural', icone: 'Tractor',
    nichos: [
      'Agropecuárias', 'Fazendas', 'Sítios', 'Produtores rurais', 'Cooperativas agrícolas', 'Insumos agrícolas', 'Máquinas agrícolas',
      'Revendas de tratores', 'Sementes', 'Fertilizantes', 'Defensivos agrícolas', 'Pecuaristas', 'Granjas', 'Avicultura', 'Suinocultura',
      'Piscicultura', 'Apicultura', 'Hortas', 'Viveiros de mudas', 'Cafeicultores', 'Armazéns de grãos', 'Irrigação', 'Drones agrícolas',
      'Consultoria agronômica', 'Engenheiros agrônomos', 'Leilões rurais', 'Lojas agro', 'Produtores de leite', 'Produtores de hortaliças',
      'Produtores de frutas', 'Produtores de mel', 'Haras e criação', 'Silvicultura', 'Madeira de reflorestamento', 'Cooperativas de leite',
      'Assistência a máquinas agrícolas', 'Postos de combustível rural', 'Medicina veterinária rural',
    ],
  },
  {
    categoria: 'Arte, Mídia e Criativo', icone: 'Palette',
    nichos: [
      'Estúdios de gravação', 'Gravadoras', 'Produtoras musicais', 'Músicos', 'Galerias de arte', 'Artistas plásticos', 'Ateliês',
      'Artesãos', 'Ilustradores', 'Editoras', 'Rádios', 'Jornais', 'Influenciadores', 'Agências de talentos', 'Agências de modelos',
      'Estúdios de dança', 'Estúdios de tatuagem', 'Fotógrafos de moda', 'Fotógrafos de produtos', 'Fotógrafos de família',
      'Fotógrafos de newborn', 'Estúdios de design', 'Produtoras de cinema', 'Produtoras de eventos', 'Escritores', 'Cenografia',
      'Marcenaria artística', 'Restauração de obras de arte', 'Vitrais', 'Escultores', 'Cerâmica artística', 'Lojas de materiais de arte',
    ],
  },
  {
    categoria: 'Religião, ONGs e Comunidade', icone: 'Church',
    nichos: [
      'Igrejas', 'Igrejas evangélicas', 'Igrejas católicas', 'Templos', 'Centros espíritas', 'ONGs', 'Associações', 'Sindicatos',
      'Cooperativas', 'Clubes de serviço', 'Instituições de caridade', 'Associações de moradores', 'Entidades de classe',
      'Fundações', 'Institutos', 'Lojas maçônicas', 'Escoteiros', 'Associações esportivas', 'Associações comerciais',
      'Câmaras de comércio', 'Sociedades beneficentes',
    ],
  },
];

/** Todos os nichos numa lista só, com a categoria de origem. */
export const TODOS: { nome: string; categoria: string }[] = CATEGORIAS.flatMap(c =>
  c.nichos.map(nome => ({ nome, categoria: c.categoria })),
);

/** Minúsculas e sem acento: "Clinica" encontra "Clínicas". */
export const normalizar = (t: string): string =>
  t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

// o mesmo nome em duas categorias (ex.: "Lojas de tintas") aparece uma vez na busca
const INDEXADOS = (() => {
  const vistos = new Set<string>();
  return TODOS.map(n => ({ ...n, chave: normalizar(n.nome) })).filter(n => !vistos.has(n.chave) && !!vistos.add(n.chave));
})();

/**
 * Busca por início de palavra, com os começos de nome primeiro:
 * "dent" acha "Dentistas" antes de "Clínicas odontológicas" (que só casa
 * pela segunda palavra) e antes de nomes que apenas contêm o trecho.
 */
export function buscarNichos(consulta: string, limite = 60): { nome: string; categoria: string }[] {
  const q = normalizar(consulta);
  if (!q) return [];
  const palavras = q.split(' ');
  const pontuados: { n: { nome: string; categoria: string }; p: number }[] = [];
  for (const n of INDEXADOS) {
    const alvo = ` ${n.chave}`;
    if (!palavras.every(p => alvo.includes(` ${p}`))) continue;
    const comeca = n.chave.startsWith(palavras[0]);
    // exato > comeca > palavra no meio; nomes curtos antes dos longos
    const p = (n.chave === q ? 0 : comeca ? 1 : 2) * 1000 + n.chave.length;
    pontuados.push({ n: { nome: n.nome, categoria: n.categoria }, p });
  }
  return pontuados.sort((a, b) => a.p - b.p).slice(0, limite).map(x => x.n);
}
