"""Banco de imagens para os sites gerados.

Site sem foto parece rascunho — e era o principal motivo de os sites
parecerem todos iguais: quem nao tinha foto do cliente recebia um
gradiente. Aqui o site nasce com fotos profissionais do ramo.

Duas fontes, na ordem:

- **Pexels**, quando ha PEXELS_API_KEY (gratuita, cadastro na hora):
  alta resolucao e busca boa. Licenca livre para uso comercial.
- **Openverse/StockSnap**, sem chave nenhuma: fotos profissionais em
  CC0 (uso comercial, sem exigir credito), mas no maximo 960 px de
  largura — bom para galeria, aceitavel para capa com sobreposicao.

Fica de fora o resto do Openverse de proposito: a maior parte e foto
documental da Wikimedia (rua de Hong Kong para "padaria"), que nao vende.
"""
import re
import time
import unicodedata
from typing import Any, Dict, List, Tuple

import httpx

from app.config import settings

# Buscas em ingles rendem muito mais nos dois bancos. Cada nicho tem
# termos testados: "advogado" puro trazia pintura do seculo XVII.
TERMOS_POR_NICHO: List[Tuple[Tuple[str, ...], List[str]]] = [
    (("padaria", "panificadora", "confeitaria"), ["bakery", "bread", "pastry", "croissant"]),
    (("cafeteria", "cafe"), ["coffee shop", "coffee", "latte art", "cafe interior"]),
    (("restaurante", "bistro", "lanchonete"), ["restaurant", "restaurant food", "chef cooking", "dinner table"]),
    (("pizzaria",), ["pizza", "pizza oven", "italian food"]),
    (("hamburgueria", "burger"), ["burger", "fries", "restaurant food"]),
    (("dentista", "odonto", "odontolog", "ortodont"), ["dentist", "dental clinic", "smile"]),
    (("clinica", "medic", "consultorio", "saude"), ["clinic doctor", "doctor", "medical", "healthcare"]),
    (("fisioterap",), ["physiotherapy", "massage therapy", "rehabilitation"]),
    (("nutricion",), ["healthy food", "nutrition", "salad"]),
    (("psicolog", "terapia"), ["therapy office", "calm interior", "conversation"]),
    (("estetica", "harmoniza"), ["spa", "skin care", "beauty treatment"]),
    (("salao", "cabeleireir", "beleza"), ["beauty salon", "hair salon", "hairdresser"]),
    (("barbearia", "barber"), ["barber", "barbershop", "beard"]),
    (("manicure", "unha"), ["manicure", "nails", "beauty salon"]),
    (("academia", "crossfit", "fitness", "pilates", "studio de treino"), ["gym", "fitness", "workout", "training"]),
    (("advoca", "advogad", "juridic"), ["business meeting", "office desk", "contract signing", "handshake"]),
    (("contab", "contador"), ["accounting", "office desk", "business finance", "laptop work"]),
    (("imobili", "corretor"), ["house", "real estate", "modern home", "living room"]),
    (("arquitet", "decora", "interiores"), ["interior design", "architecture", "modern living room"]),
    (("mecanic", "oficina", "auto center", "funilaria"), ["car mechanic", "car repair", "garage", "car engine"]),
    (("pet", "veterinar", "banho e tosa"), ["dog", "cat", "puppy", "pet"]),
    (("escola", "curso", "educa"), ["classroom", "students", "study"]),
    (("farmacia", "drogaria"), ["pharmacy", "medicine", "healthcare"]),
    (("mercado", "supermercado", "hortifruti"), ["grocery", "vegetables", "market"]),
    (("floricultura", "flores"), ["flowers", "florist", "bouquet"]),
    (("fotograf",), ["photographer", "camera", "photo studio"]),
    (("marketing", "agencia", "publicidade"), ["creative team", "office", "laptop work"]),
    (("construt", "reforma", "engenharia"), ["construction", "architecture", "renovation"]),
    (("hotel", "pousada"), ["hotel room", "hotel", "travel"]),
    (("moda", "roupa", "boutique", "vestuario"), ["clothing store", "fashion", "boutique"]),
    (("tinta",), ["paint", "painting wall", "paint store"]),
    (("material de construc", "materiais de construc", "ferragem"), ["hardware store", "tools", "construction"]),
    (("otica", "oculos"), ["eyeglasses", "optician", "glasses"]),
    (("joalheria", "joias", "relojoaria"), ["jewelry", "watch", "rings"]),
    (("papelaria", "grafica"), ["stationery", "printing", "notebook"]),
    (("autoescola",), ["driving", "car", "road"]),
    (("lavanderia",), ["laundry", "washing machine", "clean clothes"]),
    (("buffet", "evento", "festa"), ["event", "party", "catering"]),
    (("sorveteria", "acai"), ["ice cream", "dessert", "smoothie bowl"]),
    (("doceria", "brigadeiro", "bolo"), ["cake", "dessert", "pastry"]),
    (("acougue",), ["butcher", "meat", "steak"]),
    (("tatuag", "tattoo"), ["tattoo", "tattoo artist"]),
    # --- saude e medicina
    (("pediatr",), ["pediatrician", "child doctor", "baby checkup"]),
    (("ginecolog", "obstet", "mastolog", "maternidade"), ["gynecologist", "pregnancy", "maternity", "doctor consultation"]),
    (("cardio",), ["cardiologist", "heart doctor", "stethoscope"]),
    (("dermato",), ["dermatologist", "skin care", "skin treatment"]),
    (("ortoped", "traumato"), ["orthopedic doctor", "physiotherapy", "knee exam"]),
    (("oftalmo", "oculista"), ["eye exam", "ophthalmologist", "eye doctor"]),
    (("otorrino",), ["ear nose throat doctor", "doctor consultation", "medical exam"]),
    (("urolog", "proctolog", "gastro", "endocrin", "reumat", "pneumolog", "neurolog", "oncolog", "geriatr", "nutrolog", "anestesi", "clinico"), ["doctor consultation", "medical clinic", "healthcare", "stethoscope"]),
    (("psiquiatr", "psicanal", "terapeut", "neuropsic", "psicopedag", "hipnoter", "constelac", "reiki", "naturopat"), ["therapy office", "counseling", "calm interior", "mindfulness"]),
    (("fonoaudi", "terapeuta ocupacional", "fisioterap", "quiropr", "osteopat", "acupunt", "massoterap", "podolog"), ["physiotherapy", "massage therapy", "rehabilitation", "acupuncture"]),
    (("cirurgi", "plastic", "harmonizacao", "criolipolise", "emagrecimento", "fertilidade", "sono"), ["medical clinic", "aesthetic clinic", "doctor consultation", "healthcare"]),
    (("hospital", "pronto atend", "vacina", "hemodial", "oncologia", "diagnostico", "radiolog", "laborator", "analises clinicas"), ["hospital", "medical laboratory", "healthcare", "doctor"]),
    (("home care", "cuidador", "casa de repouso", "geriatri"), ["elderly care", "caregiver", "senior care", "nursing home"]),
    (("ortopedic", "auditiv", "protese"), ["hearing aid", "orthopedic", "medical equipment"]),
    (("implantod", "endodont", "periodont", "bucomaxilo", "clareamento dental", "protetico", "lentes de contato dental", "odontopediatr"), ["dentist", "dental clinic", "smile", "dental implant"]),
    (("medicina do trabalho", "clinica de dor"), ["occupational health", "doctor consultation", "healthcare"]),
    # --- beleza
    (("sobrancelha", "cilios", "micropigment", "maquiador", "maquiagem", "extensao capilar", "tricolog", "escovaria", "alongamento de unha", "studio de unha", "studios de unha", "noivas"), ["makeup artist", "eyebrow", "beauty salon", "nails"]),
    (("depilacao", "esteticista", "bronzeamento", "day spa", "spa", "massagem", "criolip", "corporal"), ["spa", "skin care", "massage", "beauty treatment"]),
    (("perfumaria", "cosmetic"), ["perfume", "cosmetics", "makeup", "beauty products"]),
    (("piercing",), ["piercing", "tattoo studio", "jewelry"]),
    # --- esportes
    (("musculacao", "treino", "funcional", "spinning", "ginastica", "personal"), ["gym", "weight training", "workout", "fitness"]),
    (("yoga",), ["yoga", "meditation", "stretching"]),
    (("natacao", "hidroginastica"), ["swimming pool", "swimming", "pool lane"]),
    (("jiu", "boxe", "muay", "judo", "karate", "capoeira", "artes marciais", "luta"), ["martial arts", "boxing", "dojo", "training"]),
    (("danca", "ballet", "circo"), ["dance studio", "ballet", "dancers"]),
    (("tenis", "beach tennis", "padel", "quadra", "society", "futebol", "arena", "escolinha"), ["tennis court", "soccer field", "sports court", "sports"]),
    (("bicicleta", "ciclis"), ["bicycle shop", "cycling", "bike"]),
    (("surf", "skate", "pesca", "camping", "escalada", "artigos esportivos", "suplemento"), ["surfing", "skateboard", "fishing", "outdoor sports"]),
    (("corrida", "assessoria esportiva"), ["running", "marathon", "runner"]),
    # --- alimentacao
    (("hamburguer", "lanchonete", "hot dog", "espetaria", "salgader", "pastelaria", "tapioca", "creperia", "food truck", "dark kitchen"), ["burger", "street food", "fast food", "food truck"]),
    (("churrasc", "carnes", "casa de carne"), ["barbecue", "steak", "grill", "meat"]),
    (("japones", "sushi"), ["sushi", "japanese food", "sushi bar"]),
    (("italian", "cantina", "marmit", "self service", "por quilo", "comida", "rotisser", "restaurant"), ["restaurant food", "lunch plate", "home cooked meal", "restaurant"]),
    (("bar ", "boteco", "pub", "choperia", "cervejaria", "adega", "vinho", "vinicola", "distribuidora de bebida", "bebida", "chopp"), ["bar", "craft beer", "wine", "pub"]),
    (("sorvet", "acai", "gelato", "sucos", "fabrica de gelo"), ["ice cream", "smoothie bowl", "juice bar", "dessert"]),
    (("doceria", "doceira", "chocolate", "casa de bolo", "bolos", "cafe da manha", "cesta", "padaria artesanal", "panificadora", "confeit"), ["cake", "chocolate", "pastry", "dessert"]),
    (("cafe", "cafeteria", "casa de cha"), ["coffee shop", "latte art", "coffee", "tea"]),
    (("hortifruti", "quitanda", "emporio", "mercearia", "peixaria", "acougue"), ["vegetables market", "grocery", "fresh produce", "butcher"]),
    (("fabrica de alimento", "atacadista de alimento", "distribuidora de alimento", "cozinha industrial", "buffet industrial"), ["food factory", "kitchen", "food production", "warehouse"]),
    # --- varejo
    (("brinquedo", "bebe", "enxoval", "infantil"), ["toy store", "baby clothes", "kids", "children"]),
    (("papelaria", "livraria", "sebo", "material escolar", "material de escritorio", "armarinho", "aviamento", "tecidos", "tecido"), ["stationery", "bookstore", "books", "fabric store"]),
    (("presente", "festa", "fantasia", "souvenir", "artigos religiosos", "artesanato", "antiquario", "brecho", "molduras", "galeria de arte", "decoracao", "utilidades"), ["gift shop", "party supplies", "antique store", "handmade crafts"]),
    (("celular", "informatica", "eletronico", "eletrodomestic", "games", "som e imagem", "instrumentos musicais", "importad"), ["electronics store", "smartphone", "computer store", "video games"]),
    (("movel", "moveis", "colchao", "colchoes", "cortina", "tapete", "lustre", "cama, mesa"), ["furniture store", "mattress", "living room", "home decor"]),
    (("sapato", "calcado", "bolsa", "acessorio", "semijoia", "joalheria", "relojoaria", "otica", "oculos"), ["shoe store", "handbag", "jewelry", "eyeglasses"]),
    (("supermercado", "minimercado", "atacarejo", "conveniencia", "mercado", "banca de jornal", "loterica", "casa loterica", "distribuidora", "atacadista", "representante", "outlet", "showroom", "ecommerce", "e commerce", "loja virtual"), ["supermarket", "grocery store", "warehouse", "online shopping"]),
    (("natural", "produtos naturais"), ["health food store", "herbal", "organic products"]),
    (("tabacaria", "cutelaria", "nautic"), ["tobacco shop", "knife", "boat store"]),
    # --- imoveis e construcao
    (("incorporadora", "construtora", "loteadora", "loteamento", "lancamento", "condominio", "coworking", "escritorio virtual", "sala comercial", "galpao", "imoveis", "imovel", "avaliador de imove", "vistoria", "home stag"), ["apartment building", "real estate", "modern home", "office building"]),
    (("engenheiro", "engenharia", "topografia", "projeto estrutural", "projetos estruturais", "laudo", "mestre de obra", "empreiteira", "pedreiro", "obra"), ["construction site", "engineer", "blueprint", "construction"]),
    (("gesso", "drywall", "forro", "divisoria", "pintor", "pintura", "papel de parede", "impermeabiliz", "telhado", "cobertura", "esquadria", "aluminio", "vidro", "vidraceiro", "vidracaria", "box para banheiro", "marmoraria", "granito", "revestimento", "piso", "azulejo", "ceramica"), ["painting wall", "tiles", "interior renovation", "construction worker"]),
    (("marcenaria", "movel planejado", "moveis planejados", "serralheria", "marceneiro", "restauracao de movel", "tapeceiro"), ["carpentry", "woodworking", "custom furniture", "workshop"]),
    (("energia solar", "painel", "solar", "ar condicionado", "ar-condicionado", "instalacao"), ["solar panels", "air conditioner", "electrician", "installation"]),
    (("eletric", "hidraulic", "encanador", "desentup", "iluminacao", "material eletrico", "instalacoes eletricas", "instalacoes hidraulicas"), ["electrician", "plumber", "tools", "lighting"]),
    (("concreteira", "terraplanagem", "poco artesiano", "cacamba", "locacao de equipamento", "container", "casa pre-fabricada", "casas pre", "steel frame", "pre-moldado", "pre moldado", "estrutura metalica", "bloco"), ["construction machinery", "excavator", "concrete", "steel structure"]),
    (("madeireira", "ferragem", "deposito de construcao", "material de construcao", "lojas de tintas", "tintas"), ["lumber yard", "hardware store", "building materials", "tools"]),
    (("piscina", "churrasqueira", "lareira", "elevador", "portao", "toldo", "paisagis", "jardim"), ["swimming pool", "garden landscaping", "patio", "outdoor living"]),
    (("arquitet", "design de interiores", "designer de interiores", "decorador", "interiores", "reforma"), ["interior design", "architecture", "modern living room", "renovation"]),
    # --- servicos
    (("diarista", "limpeza", "zeladoria", "lavagem de estofado", "higieniza", "limpeza de caixa"), ["cleaning service", "house cleaning", "cleaning supplies", "housekeeping"]),
    (("lavanderia", "tinturaria", "costureira", "atelie de costura", "sapateiro"), ["laundry", "sewing", "tailor", "dry cleaning"]),
    (("dedetiz", "controle de praga", "jardinagem", "poda", "manutencao de piscina"), ["pest control", "gardening", "lawn care", "garden tools"]),
    (("chaveiro", "chave"), ["locksmith", "keys", "door lock"]),
    (("assistencia tecnica", "conserto", "reparo", "tecnico", "antena", "instalacao de tv", "afiacao"), ["repair technician", "electronics repair", "tools", "workshop"]),
    (("funeraria", "cemiterio", "cremacao"), ["flowers", "memorial", "candle"]),
    (("distribuidora de gas", "distribuidora de agua", "agua mineral", "gas"), ["water bottle", "delivery truck", "gas cylinder"]),
    (("portaria", "terceirizacao", "babas", "baba", "empresas de portaria"), ["office reception", "security guard", "nanny", "facility"]),
    (("copiadora", "grafica rapida", "impressao", "brinde", "serigrafia", "estamparia", "bordado", "adesivo", "cartoes de visita", "letreiro", "comunicacao visual", "outdoor", "midia exterior"), ["printing press", "screen printing", "signage", "graphic design"]),
    (("despachante", "cartorio", "registro de marca", "abertura de empresa", "licenciamento", "certificacao"), ["documents", "notary", "office desk", "paperwork"]),
    # --- automotivo
    (("pneu", "borracharia", "alinhamento", "balanceamento", "suspensao", "freio"), ["tire shop", "car tires", "wheel alignment", "garage"]),
    (("lava jato", "lavajato", "lava-jato", "estetica automotiva", "martelinho", "funilaria", "lanternagem", "pintura automotiva", "vitrificacao"), ["car wash", "car detailing", "auto body", "car polish"]),
    (("autopeca", "auto peca", "pecas para caminhao", "peca de moto", "pecas de moto", "bateria", "escapamento", "retifica", "cambio", "ar-condicionado automotivo", "injecao", "auto eletric"), ["auto parts", "car engine", "mechanic tools", "garage"]),
    (("concessionaria", "revenda", "carros usados", "veiculos novos", "locadora de veiculo", "locacao de moto", "blindagem", "customizacao", "proteção veicular", "protecao veicular", "rastreamento", "seguro auto"), ["car dealership", "used cars", "car", "automobile"]),
    (("moto", "motocicleta", "bicicletaria"), ["motorcycle", "motorbike shop", "motorcycle repair"]),
    (("estacionamento", "guincho", "reboque", "vistoria veicular", "despachante de veiculo", "taxi", "troca de oleo", "oleo", "insulfilm", "som automotivo", "vidros automotivos", "adesivo automotivo", "capas e tapetes"), ["parking lot", "tow truck", "car service", "car interior"]),
    # --- juridico, contabil, financas
    (("advogad", "advocacia", "juridic", "mediacao", "arbitragem", "assessoria juridica", "perito", "pericia", "direito"), ["business meeting", "office desk", "contract signing", "law books"]),
    (("contab", "contad", "bpo", "tribut", "fiscal", "auditoria"), ["accounting", "calculator", "tax documents", "laptop work"]),
    (("crediario", "loja de credito", "lojas de credito"), ["credit card payment", "shopping store", "financial advisor", "money"]),
    (("seguro", "seguradora", "previdencia", "consorcio", "financeira", "credito", "correspondente bancario", "cooperativa de credito", "fintech", "investimento", "planejador financeiro", "cambio", "patrimonio", "cobranca", "factoring", "penhor", "ouro", "meios de pagamento", "maquininha"), ["financial advisor", "insurance", "money", "bank"]),
    # --- marketing, consultoria, tecnologia
    (("marketing", "trafego", "publicidade", "seo", "social media", "branding", "influenciador", "criador de conteudo", "copywriter", "assessoria de imprensa", "relacoes publicas", "pesquisa de mercado", "design grafico", "designer", "embalagem"), ["creative team", "marketing meeting", "laptop work", "brainstorming"]),
    (("produtora de video", "videomaker", "cinema", "podcast", "estudio de gravacao", "gravadora", "produtora musical", "radio", "jornal", "editora"), ["video production", "recording studio", "microphone", "camera"]),
    (("consultoria", "coach", "mentor", "treinamento corporativo", "palestrante", "rh", "recrutamento", "agencia de emprego", "trabalho temporario", "call center", "telemarketing", "franquia", "tradutor", "traducao", "interprete", "escritorio compartilhado"), ["business meeting", "consulting", "office team", "presentation"]),
    (("software", "desenvolvedor", "ti ", "startup", "saas", "erp", "aplicativo", "sites", "criacao de sites", "agencia de desenvolvimento", "hospedagem de site", "data center", "nuvem", "inteligencia artificial", "chatbot", "iot", "automacao", "sistema"), ["software developer", "coding", "laptop code", "data center"]),
    (("provedor", "internet", "telecom", "cabeamento", "rede", "redes", "telefonia", "rastreador", "impressora"), ["network cables", "server room", "fiber optic", "telecom"]),
    (("seguranca", "vigilancia", "alarme", "camera", "cftv", "cerca eletrica", "controle de acesso", "monitoramento", "portaria remota", "escolta", "brigadista", "extintor", "incendio", "bombeiro", "cofre", "fechadura", "interfone", "detetive"), ["security camera", "security guard", "alarm system", "surveillance"]),
    # --- educacao
    (("escola", "colegio", "creche", "bercario", "montessori", "bilingue", "infantil", "educacao"), ["classroom", "kids learning", "school", "children playing"]),
    (("idioma", "ingles", "espanhol", "language", "intercambio"), ["language class", "english lesson", "students", "learning"]),
    (("curso", "preparatorio", "pre-vestibular", "pre vestibular", "concurso", "tecnico", "profissionalizante", "online", "reforco", "professor", "faculdade", "universidade", "pos-graduacao", "pos graduacao", "xadrez", "robotica", "oratoria"), ["students studying", "classroom", "online course", "university"]),
    (("musica", "violao", "canto", "teatro", "desenho", "artes", "culinaria", "fotografia", "modelo", "design"), ["music lesson", "guitar", "art class", "theater"]),
    (("autoescola", "pilotagem", "aviacao", "nautica", "direcao defensiva", "condutores", "cfc"), ["driving lesson", "pilot training", "driving school", "road"]),
    # --- pets
    (("veterin", "pet shop", "petshop", "banho e tosa", "tosa", "hotel para pet", "creche para pet", "adestrad", "canil", "gatil", "pet sitter", "passeador", "cremacao de pet", "racao", "aquario", "aquarismo", "agropet", "exotico", "taxi dog", "plano de saude pet", "laboratorio veterin"), ["dog grooming", "veterinarian", "puppy", "pet shop"]),
    # --- eventos, turismo
    (("buffet", "salao de festa", "espaco para evento", "casa de recepcao", "cerimonial", "assessoria de evento", "decoracao de festa", "aluguel de brinquedo", "aluguel de mesa", "aluguel de trajes", "ateliê de noiva", "atelie de noiva", "lembrancinha", "convite", "bolo decorado", "doces para festa", "recreacao", "animacao", "formatura", "evento corporativo", "fogos", "louca", "tenda", "garcom"), ["party decoration", "event venue", "wedding", "catering"]),
    (("dj", "banda", "sonorizacao", "iluminacao", "palco", "cabine fotografica", "bartender", "chopp", "churrasqueiro", "casa de show", "casa noturna", "balada", "clube", "karaoke", "boliche", "teatro", "parque", "paintball", "escape room", "locadora de game", "pesqueiro", "hipica", "marina", "aluguel de som"), ["concert", "dj", "night club", "live music"]),
    (("fotograf", "estudio fotografico", "casamento", "newborn", "filmagem"), ["photographer", "camera", "photo studio", "wedding photography"]),
    (("hotel", "hoteis", "pousada", "hostel", "resort", "chale", "flat", "apart-hotel", "apart hotel", "motel", "camping", "hospedagem", "casa de temporada", "airbnb", "fazenda hotel", "hotel fazenda", "spa resort", "temporada"), ["hotel room", "resort", "cabin", "vacation rental"]),
    (("agencia de viagem", "operadora de turismo", "turismo", "guia", "transfer", "receptivo", "passeio", "buggy", "mergulho", "rafting", "ecoturismo", "aventura", "parque tematico", "visto", "passaporte", "motorhome"), ["travel agency", "tourism", "adventure", "beach"]),
    # --- transporte, industria, agro
    (("transportadora", "frete", "mudanca", "carreto", "motoboy", "entregador", "logistica", "armazem", "centro de distribuicao", "fulfillment", "courier", "correios", "guarda-movel", "guarda movel", "self storage", "cargas", "caminhao", "empilhadeira", "van", "fretamento", "onibus", "transporte"), ["delivery truck", "logistics warehouse", "moving boxes", "cargo"]),
    (("industria", "fabrica", "metalurgica", "usinagem", "caldeiraria", "fundicao", "plastico", "embalagem", "textil", "confeccao", "faccao", "malharia", "frigorific", "laticinio", "cervejaria artesanal", "cachacaria", "quimica", "farmaceutica", "borracha", "cimento", "maquina", "automacao industrial", "manutencao industrial", "tratamento de agua", "reciclagem", "residuos", "ferro-velho", "ferro velho", "sucata", "epi", "uniforme", "tornearia", "ferramentaria"), ["factory", "industrial machinery", "metal workshop", "production line"]),
    (("agropecuaria", "fazenda", "sitio", "produtor rural", "cooperativa agricola", "insumo", "maquina agricola", "trator", "semente", "fertilizante", "defensivo", "pecuarista", "granja", "avicultura", "suinocultura", "piscicultura", "apicultura", "horta", "viveiro", "cafeicultor", "armazem de grao", "irrigacao", "drone agricola", "agronomo", "agronomica", "leilao rural", "loja agro", "leite", "hortalica", "fruta", "mel", "haras", "silvicultura", "reflorestamento", "postos de combustivel rural", "rural"), ["farm field", "tractor", "agriculture", "cattle"]),
    # --- arte e comunidade
    (("estudio", "ateli", "artista", "artesao", "ilustrador", "escultor", "ceramica artistica", "vitral", "cenografia", "arte"), ["art studio", "painting", "handmade", "sculpture"]),
    (("tatuador", "unissex", "produtos para cabelo", "salao unissex", "cabelo"), ["hair salon", "hairdresser", "tattoo artist", "beauty salon"]),
    (("patinacao", "pista de patina", "assessoria esportiva"), ["ice skating", "roller skating", "running", "sports training"]),
    (("pizza", "pizzas delivery", "salgado congelado", "casa de cha"), ["pizza", "pizza delivery", "frozen food", "tea house"]),
    (("ferramenta", "embalagens", "loja de embalagem", "enxoval", "loja virtual", "lojas virtuais"), ["tools store", "packaging", "baby clothes", "online shopping"]),
    (("galpao", "armazem", "centro de distribuicao", "locacao de caminho", "locacao de caminhoes", "importacao", "exportacao", "agenciamento"), ["warehouse", "logistics", "cargo truck", "shipping containers"]),
    (("assessoria empresarial", "escritorio compartilhado", "escritorio virtual", "sala comercial", "certificacoes iso", "representacoes comerciais", "traducoes juramentadas"), ["coworking space", "business meeting", "office desk", "contract signing"]),
    (("lan house", "jornal", "escritor", "musico", "vitral", "lojas maconicas", "fundacao", "associacao"), ["gaming room", "newspaper", "writer desk", "musician"]),
    (("gesseiro", "demolicao", "olaria", "calha", "rufo", "lavagem de carro", "centro automotivo", "locadora de veiculo", "enxovais"), ["construction worker", "demolition", "brick factory", "car wash"]),
    (("correspondente bancario", "planejador financeiro", "produtora de video", "criador de conteudo"), ["financial advisor", "bank", "video production", "content creator"]),
    (("hospital", "casas de repouso", "casa de repouso"), ["hospital", "healthcare", "nursing home", "medical team"]),
    (("bar", "bares"), ["bar", "pub", "cocktail", "craft beer"]),
    (("casa de recepcao", "casa de show", "casa noturna", "garcom", "copeiro", "motel"), ["event venue", "concert", "night club", "waiter"]),
    (("fundicao", "confeccao", "faccao", "ferro velho", "ferros velhos"), ["foundry", "garment factory", "sewing machine", "scrap metal"]),
    (("produtor rural", "armazem de grao", "drone agricola", "leilao rural", "loja agro", "selaria"), ["farm", "grain silo", "agricultural drone", "horse saddle"]),
    (("canil", "canis", "gatil", "gatis"), ["dog kennel", "cat", "puppies", "pet"]),
    (("notebook", "assistencia de notebook"), ["laptop repair", "electronics repair", "computer technician"]),
    (("ensino religioso", "centro espirita", "associacao de moradores", "associacao esportiva", "associacao comercial", "camara de comercio"), ["community", "church", "volunteers", "people together"]),
    (("igreja", "templo", "centro espirita", "ong", "associacao", "sindicato", "cooperativa", "clube de servico", "caridade", "fundacao", "instituto", "loja maconica", "escoteiro", "camara de comercio", "sociedade", "entidade"), ["community", "church", "volunteers", "people together"]),
]
TERMOS_GENERICOS = ["small business", "shop", "store front", "team work"]

VALIDADE = 6 * 3600
_cache: Dict[str, Tuple[float, List[Dict[str, Any]]]] = {}


def _sem_acento(t: str) -> str:
    return unicodedata.normalize("NFKD", t or "").encode("ascii", "ignore").decode().lower()


def _singular(texto: str) -> str:
    """Singular aproximado, palavra a palavra. So serve para casar radicais."""
    def um(p: str) -> str:
        if len(p) <= 3:
            return p
        for fim, troca in (("oes", "ao"), ("aes", "ao"), ("ais", "al"), ("eis", "el"), ("ois", "ol"), ("ens", "em"), ("ns", "m")):
            if p.endswith(fim):
                return p[: -len(fim)] + troca
        if p.endswith(("res", "zes", "ses")) and len(p) > 4:
            return p[:-2]
        return p[:-1] if p.endswith("s") else p
    return " ".join(um(p) for p in texto.split())


def termos_para(nicho: str) -> List[str]:
    """Termos de busca em ingles para o ramo.

    Casa por INICIO DE PALAVRA ("pet" nao pode casar com "carpete") e a chave
    mais longa vence ("clinica odontologica" -> dentista, nao clinica medica).
    Empate: a primeira da lista.
    """
    base = re.sub(r"[^a-z0-9]+", " ", _sem_acento(nicho)).strip()
    # o catalogo e quase todo plural ("Hospitais", "Bares", "Galpoes"): casa pelas duas formas
    n = f" {base} {_singular(base)} "
    melhor: List[str] = []
    pontos = 0
    for chaves, termos in TERMOS_POR_NICHO:
        for c in chaves:
            chave = re.sub(r"[^a-z0-9]+", " ", c).strip()
            if not chave:
                continue
            # "bar " (com espaco) pede fim de palavra; as demais aceitam radical ("dentist" em "dentistas")
            padrao = f" {chave} " if c.endswith(" ") else f" {chave}"
            if padrao in n and len(chave) > pontos:
                melhor, pontos = termos, len(chave)
    if melhor:
        return melhor
    # nicho desconhecido: tenta o proprio texto, depois o generico
    limpo = re.sub(r"[^a-z ]", " ", n).strip()
    return ([limpo] if limpo else []) + TERMOS_GENERICOS


async def _pexels(termo: str, quantidade: int) -> List[Dict[str, Any]]:
    async with httpx.AsyncClient(timeout=15.0) as c:
        r = await c.get(
            "https://api.pexels.com/v1/search",
            params={"query": termo, "per_page": quantidade, "orientation": "landscape"},
            headers={"Authorization": settings.PEXELS_API_KEY},
        )
    if r.status_code != 200:
        return []
    saida = []
    for f in r.json().get("photos") or []:
        src = f.get("src") or {}
        saida.append({
            "url": src.get("large2x") or src.get("original", ""),
            "miniatura": src.get("medium", ""),
            "largura": f.get("width"), "altura": f.get("height"),
            "autor": f.get("photographer", ""), "fonte": "Pexels",
            "pagina": f.get("url", ""),
        })
    return saida


async def _openverse(termo: str, quantidade: int) -> List[Dict[str, Any]]:
    async with httpx.AsyncClient(timeout=15.0) as c:
        r = await c.get(
            "https://api.openverse.org/v1/images/",
            params={"q": termo, "license_type": "commercial", "source": "stocksnap",
                    "page_size": quantidade, "aspect_ratio": "wide"},
            headers={"User-Agent": "LeadSage/1.0 (sites para pequenos negocios)"},
        )
    if r.status_code != 200:
        return []
    saida = []
    for f in r.json().get("results") or []:
        url = f.get("url", "")
        if not url.startswith("https://"):
            continue
        saida.append({
            "url": url, "miniatura": url,
            "largura": f.get("width"), "altura": f.get("height"),
            "autor": f.get("creator", ""), "fonte": "StockSnap",
            "pagina": f.get("foreign_landing_url", ""),
        })
    return saida


async def buscar(nicho: str = "", termo: str = "", quantidade: int = 18) -> Dict[str, Any]:
    """Fotos para o nicho (ou para um termo digitado). Nunca levanta erro:
    sem foto, o site cai no fundo desenhado em CSS, como antes."""
    termos = [termo] if termo else termos_para(nicho)
    chave = f"{settings.PEXELS_API_KEY[:4]}|{'|'.join(termos)}|{quantidade}"
    guardado = _cache.get(chave)
    if guardado and time.time() - guardado[0] < VALIDADE:
        return {"imagens": guardado[1], "fonte": guardado[1][0]["fonte"] if guardado[1] else ""}

    fotos: List[Dict[str, Any]] = []
    vistos = set()
    por_termo = max(4, quantidade // max(1, len(termos)) + 2)
    for t in termos:
        try:
            lote = await (_pexels(t, por_termo) if settings.PEXELS_API_KEY else _openverse(t, por_termo))
        except Exception:
            lote = []
        for f in lote:
            if f["url"] and f["url"] not in vistos:
                vistos.add(f["url"])
                fotos.append(f)
        if len(fotos) >= quantidade:
            break

    fotos = fotos[:quantidade]
    _cache[chave] = (time.time(), fotos)
    return {"imagens": fotos, "fonte": fotos[0]["fonte"] if fotos else ""}
