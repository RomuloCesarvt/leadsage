/**
 * Os tutoriais do LeadSage, escritos conforme o app é hoje: telas, botões e limites reais.
 * Cada tutorial tem passos numerados, dicas e, quando faz sentido, a tela onde se faz aquilo (botão "Abrir").
 * Se uma tela ou um limite mudar, o teste (tutoriais.test.ts) confere as telas citadas; os números abaixo vêm do código.
 */
export type TelaId =
  | 'dashboard' | 'hero' | 'results' | 'workspace' | 'pipeline' | 'history' | 'ai-outreach' | 'conversas' | 'fila' | 'robo'
  | 'proposals' | 'contracts' | 'calculator' | 'create-site' | 'my-sites' | 'notifications' | 'settings' | 'subscription';

export interface Tutorial {
  id: string;
  titulo: string;
  tempo: string;
  resumo: string;
  passos: string[];
  dicas?: string[];
  atencao?: string;
  tela?: TelaId;
  telaRotulo?: string;
}
export interface CategoriaDeTutorial { id: string; titulo: string; descricao: string; tutoriais: Tutorial[] }

export const TELAS_VALIDAS: TelaId[] = [
  'dashboard', 'hero', 'results', 'workspace', 'pipeline', 'history', 'ai-outreach', 'conversas', 'fila', 'robo',
  'proposals', 'contracts', 'calculator', 'create-site', 'my-sites', 'notifications', 'settings', 'subscription',
];

export const CATEGORIAS: CategoriaDeTutorial[] = [
  {
    id: 'comece',
    titulo: 'Comece por aqui',
    descricao: 'O caminho completo, da busca ao fechamento.',
    tutoriais: [
      {
        id: 'caminho-completo', titulo: 'O caminho completo do LeadSage em 8 passos', tempo: '5 min', tela: 'hero', telaRotulo: 'Fazer uma busca',
        resumo: 'Do primeiro lead à venda: o que fazer em cada tela e o que o robô faz sozinho.',
        passos: [
          'Nova Busca: escolha estado, cidade e nicho e o LeadSage encontra negócios reais no Google Maps, já com telefone, Instagram, site e avaliações.',
          'Resultados: marque os negócios que interessam e clique em "Adicionar a Meus Leads". O que você não adicionar não entra na sua lista.',
          'Robô → Canais: conecte o WhatsApp (pela nuvem, com o QR code, ou pelo computador com o Conector). Instagram, Messenger e Telegram são opcionais.',
          'Robô → Comportamento: diga quem fala nas mensagens (seu nome e empresa), o que você vende, preço, prazo e como quer abordar. Ligue o robô.',
          'Meus Leads → Enviar para contato → Fila de envio: o robô escreve uma mensagem diferente para cada lead (e cria a prévia do site dele). Você revisa e envia.',
          'O WhatsApp envia sozinho, no ritmo seguro do número. Depois, a Régua de seguimentos manda o 1º seguimento (2 dias úteis) e o contato final (5 dias úteis).',
          'Conversas: quando o lead responde, o robô conduz. Pediu a prévia, ele manda o link na hora. Se você responder pelo celular, o robô pausa sozinho.',
          'Pipeline e Dashboard: os cards andam sozinhos conforme a conversa, e o Dashboard mostra quais segmentos, cidades e estados mais respondem.',
        ],
        dicas: ['Comece com poucos leads (10 a 15) para ver o jeito do robô antes de escalar.', 'Use o simulador (Robô → Testar) antes de ligar o robô de verdade.'],
      },
    ],
  },
  {
    id: 'leads',
    titulo: 'Buscar e escolher leads',
    descricao: 'Encontrar negócios, entender o score e montar a sua lista.',
    tutoriais: [
      {
        id: 'nova-busca', titulo: 'Fazer uma busca de leads', tempo: '3 min', tela: 'hero', telaRotulo: 'Abrir Nova Busca',
        resumo: 'Como preencher a busca e quanto ela custa.',
        passos: [
          'Abra "Nova Busca" no menu (no celular: aba "Buscar", na barra de baixo).',
          'Escolha País, Estado e Cidade. O Bairro é opcional e afina a busca.',
          'No Nicho, digite ou escolha da lista (por exemplo Padarias, Dentistas, Arquitetura). A lista tem categorias e busca por texto.',
          'Escolha a quantidade: 10, 20, 30, 40 ou 60 leads. Cada lead custa 1 crédito, e você só paga pelos leads realmente encontrados.',
          'Clique em "Buscar Oportunidades". Os resultados chegam já com telefone, WhatsApp, Instagram, site, nota e avaliações do Google.',
        ],
        dicas: ['Repetir o mesmo nicho em outras cidades ou estados ajuda a descobrir onde seu serviço responde melhor (veja o Dashboard).', 'Todas as buscas ficam no Histórico.'],
      },
      {
        id: 'resultados-e-leads', titulo: 'Escolher leads: Resultados e Meus Leads', tempo: '3 min', tela: 'results', telaRotulo: 'Abrir Resultados',
        resumo: 'A diferença entre o que a busca achou e a lista com a qual você trabalha.',
        passos: [
          '"Resultados" mostra tudo que a última busca encontrou. Use os filtros (nicho, cidade, "Sem site", "Com WhatsApp", "Alta oportunidade"...) para chegar nos melhores.',
          'Marque os negócios e clique em "Adicionar a Meus Leads". Só quem entra em Meus Leads recebe contato do robô.',
          'Em "Meus Leads" você favorita (estrela), exclui e abre "Detalhes" para ver o diagnóstico do negócio.',
          'Para abordar, marque os leads e clique em "Enviar para contato": eles vão para a Fila de envio.',
          'Dá para exportar a lista em CSV ou Excel (botões no alto de Meus Leads).',
        ],
        atencao: 'Quem já recebeu a abordagem não volta para a lista de envio: o robô conduz a conversa e os seguimentos sozinho.',
      },
      {
        id: 'score-e-detalhes', titulo: 'Entender o score e o perfil do lead', tempo: '3 min', tela: 'workspace', telaRotulo: 'Abrir Meus Leads',
        resumo: 'O que significa Baixa, Média e Alta oportunidade e o que há dentro de "Detalhes".',
        passos: [
          'O score vai de 0 a 99: abaixo de 40 é Baixa, de 40 a 69 é Média e a partir de 70 é Alta oportunidade.',
          'Ele sobe quando falta algo que você vende (sem site, sem Instagram, perfil do Google incompleto) e quando o negócio é contatável (telefone, WhatsApp, e-mail).',
          'Clique em "Detalhes" para abrir o perfil: dados do Google, sinais do site e do Instagram, o diagnóstico em linguagem simples e ganchos para a conversa.',
          'O Raio-X do lead mostra o que o Google, o site e o Instagram dizem do negócio e quem parece cuidar da presença online.',
        ],
        dicas: ['Alta oportunidade não é garantia de venda: use o score para decidir a ordem, não para descartar.'],
      },
    ],
  },
  {
    id: 'previa',
    titulo: 'Prévia do site',
    descricao: 'O site do próprio lead como isca de vendas.',
    tutoriais: [
      {
        id: 'como-a-previa-nasce', titulo: 'Como a prévia do site é montada', tempo: '3 min', tela: 'my-sites', telaRotulo: 'Ver Meus Sites',
        resumo: 'O que entra na prévia e por que ela é só "uma primeira ideia".',
        passos: [
          'Na hora de abordar, o robô cria o site do lead com dados reais: nome, ramo, cidade, telefone, endereço, horário e serviços do ramo.',
          'Se o lead tem site ou Instagram, o LeadSage busca a logo, a cor da marca e fotos do próprio negócio. As fotos do banco de imagens do ramo completam o que faltar.',
          'A nota e as avaliações do Google só aparecem quando são mérito: nota de 4,5 ou mais e pelo menos 30 avaliações.',
          'O modelo (layout) é escolhido pelo ramo e varia de uma empresa para outra: duas padarias não saem iguais.',
          'O link da prévia vai na conversa. O robô sempre diz que é uma prévia: no site de verdade entram as fotos e informações do cliente e o layout pode mudar.',
          'Quando o lead abre a prévia, aparece um aviso no sino (Avisos).',
        ],
        dicas: ['Prévias antigas que ninguém editou são atualizadas pelo motor novo, no mesmo link.', 'Site que você editou à mão nunca é sobrescrito.'],
      },
      {
        id: 'criar-site', titulo: 'Criar e editar um site (Criar Site e Meus Sites)', tempo: '5 min', tela: 'create-site', telaRotulo: 'Abrir Criar Site',
        resumo: 'Para fazer o site de um cliente de verdade ou refinar uma prévia.',
        passos: [
          'Abra "Criar Site". No alto, em "Começar a partir de um lead", busque pelo nome e escolha o lead: cada modelo aparece já com o nome, as cores, os serviços, o endereço e as fotos do ramo dele. Ou deixe "Criar do zero".',
          'Escolha o modelo (layout) que combina com o negócio e edite textos, cores, fotos, logo e serviços.',
          'Salve. O site aparece em "Meus Sites".',
          'Em Meus Sites você vê o site, copia o link para mandar ao cliente, baixa o .html ou exclui.',
        ],
        dicas: ['Há modelos pensados por ramo (clínicas, restaurantes, advocacia, pets, imóveis, oficinas e outros).'],
      },
    ],
  },
  {
    id: 'envio',
    titulo: 'Abordagem e Fila de envio',
    descricao: 'Escrever, revisar e enviar, e a régua que continua sozinha.',
    tutoriais: [
      {
        id: 'ia-de-abordagem', titulo: 'Gerar uma mensagem avulsa (IA de Abordagem)', tempo: '2 min', tela: 'ai-outreach', telaRotulo: 'Abrir IA de Abordagem',
        resumo: 'Para criar e copiar uma mensagem de um lead só.',
        passos: [
          'Abra "IA de Abordagem" e escolha o lead na caixa de busca (digite parte do nome, da empresa ou da cidade).',
          'Escolha o tom: Consultivo, Amigável, Direto, Autoridade ou Promocional.',
          'Se quiser, escreva instruções extras (por exemplo "mencionar que sou de Botucatu").',
          'Clique em Gerar, leia, ajuste e copie para usar onde quiser.',
        ],
        dicas: ['Para vários leads de uma vez, use a Fila de envio: ela escreve uma mensagem diferente para cada um.'],
      },
      {
        id: 'fila-de-envio', titulo: 'Gerar, revisar e enviar pela Fila de envio', tempo: '5 min', tela: 'fila', telaRotulo: 'Abrir a Fila de envio',
        resumo: 'O fluxo de abordagem em lote, com revisão antes de sair.',
        passos: [
          '1. Escolher leads: marque até 15 por rodada. Só aparecem leads de Meus Leads que ainda não receberam mensagem e que têm WhatsApp, e-mail, Instagram ou LinkedIn.',
          'Deixe marcada a opção de criar a prévia do site de cada lead: assim a mensagem pode dizer "montei uma prévia" com verdade.',
          'Clique em "Gerar mensagens para revisar". O robô escreve uma mensagem diferente para cada lead, no canal certo para ele.',
          '2. Revisar e enviar: leia cada mensagem, edite o que quiser, desmarque as que não devem sair e clique em "Enviar marcadas".',
          'WhatsApp: a mensagem entra na fila do WhatsApp conectado e sai sozinha, com intervalo, de segunda a sábado das 8h às 19h. E-mail: sai direto, com limite de 40 por dia.',
          'Acompanhe pelas abas: "Para revisar", "Na fila de envio" e "Com problema". Em "Com problema" aparece o motivo e o botão "Tentar de novo".',
        ],
        dicas: ['Quem já tem conversa ou chat de WhatsApp com você sai da lista sozinho: ninguém recebe duas abordagens.', 'Se a tela atualizar no meio de uma geração, ela pede para esperar terminar; a seleção fica guardada.'],
        atencao: 'O WhatsApp precisa estar conectado (Robô → Canais) para as mensagens saírem.',
      },
      {
        id: 'regua', titulo: 'A régua de seguimentos (2 e 5 dias úteis)', tempo: '2 min', tela: 'fila', telaRotulo: 'Ver a régua',
        resumo: 'O que o robô faz sozinho depois da abordagem e como acompanhar.',
        passos: [
          'Quando a abordagem de WhatsApp é enviada, o robô agenda dois seguimentos que foram escritos junto com ela.',
          'O 1º seguimento sai 2 dias úteis depois. O contato final sai 5 dias úteis depois: cordial, sem pressão, deixando a porta aberta.',
          'Eles saem sozinhos, no ritmo seguro do número. Você não precisa enviar nada.',
          'Quem responde, ou pede para sair, tem a régua cancelada: aí o robô conduz a conversa. Se você mesmo responder pelo celular, o robô também pausa.',
          'Na Fila de envio, o cartão "Régua de seguimentos" mostra cada lead: abordagem enviada, 1º seguimento, contato final, quando sai o próximo e quem já respondeu.',
          'Depois do contato final, o lead espera mais 3 dias por uma resposta tardia. Sem resposta, sai de Meus Leads.',
        ],
        atencao: 'A régua só roda com o WhatsApp conectado.',
      },
    ],
  },
  {
    id: 'canais',
    titulo: 'Conectar os canais',
    descricao: 'WhatsApp, Instagram, Messenger e Telegram.',
    tutoriais: [
      {
        id: 'whatsapp', titulo: 'Conectar o WhatsApp', tempo: '4 min', tela: 'robo', telaRotulo: 'Abrir Robô → Canais',
        resumo: 'Duas formas: pela nuvem (sempre ligado) ou pelo computador (Conector).',
        passos: [
          'Abra "Robô de Atendimento" → aba "Canais".',
          'Pela nuvem: leia o aviso de risco, marque que entendeu e clique em "Conectar pela nuvem". O QR code aparece na própria tela.',
          'No celular: WhatsApp → Aparelhos conectados → Conectar um aparelho → escaneie o QR code. Pelo número de telefone também dá, sem segundo aparelho.',
          'Pelo computador: clique em "Gerar chave do Conector", baixe o arquivo e abra. Ele mostra o QR code e precisa ficar aberto com o computador ligado.',
          'Quando conectar, a tela mostra o número e o estado. A partir daí o robô envia, recebe e responde por esse número.',
        ],
        dicas: ['Prefira um número secundário, não o seu principal.', 'O número começa com poucas abordagens por dia e ganha volume a cada dia: não force.'],
        atencao: 'Isso usa o WhatsApp Web, não a API oficial da Meta. O número pode ser restringido se houver muito volume ou reclamações.',
      },
      {
        id: 'instagram', titulo: 'Conectar o Instagram e o Messenger', tempo: '4 min', tela: 'robo', telaRotulo: 'Abrir Robô → Canais',
        resumo: 'O robô lê e responde as mensagens diretas pela API oficial da Meta.',
        passos: [
          'No Instagram, mude a conta para profissional (Configurações → Tipo de conta).',
          'Ligue o Instagram a uma página do Facebook e ative "Permitir acesso às mensagens" (Configurações → Mensagens → Ferramentas conectadas).',
          'Em Robô → Canais, clique em "Conectar Instagram", entre com o Facebook e marque a página e o Instagram.',
          'O Messenger vem junto, pela mesma página.',
        ],
        atencao: 'Regra do Instagram e do Messenger: o robô responde a quem escreveu primeiro (até 24 horas depois). A primeira mensagem para um lead que nunca falou com você segue pelo link que abre a conversa pronta.',
      },
      {
        id: 'telegram', titulo: 'Conectar um bot do Telegram', tempo: '2 min', tela: 'robo', telaRotulo: 'Abrir Robô → Canais',
        resumo: 'O robô atende no bot da sua empresa.',
        passos: [
          'No Telegram, abra o @BotFather e mande /newbot.',
          'Escolha o nome e o usuário do bot: ele devolve um token.',
          'Cole o token em Robô → Canais → Telegram e clique em "Conectar bot".',
          'Coloque o link do bot (t.me/seubot) no site, no e-mail e no cartão. Quem aperta Iniciar já conversa com o robô.',
        ],
        dicas: ['O Telegram só deixa o bot falar com quem falou com ele primeiro.'],
      },
    ],
  },
  {
    id: 'robo',
    titulo: 'Robô de atendimento',
    descricao: 'Configurar, testar e entender o que ele faz sozinho.',
    tutoriais: [
      {
        id: 'configurar-robo', titulo: 'Configurar o robô (Comportamento)', tempo: '6 min', tela: 'robo', telaRotulo: 'Abrir Robô → Comportamento',
        resumo: 'Tudo o que o robô pode dizer vem daqui: o que não estiver cadastrado, ele não promete.',
        passos: [
          'Ligue o robô no alto da tela (chave "Ligado").',
          '"Quem fala nas mensagens": seu nome, cargo e empresa. É assim que ele se apresenta, como uma pessoa da equipe.',
          '"Forma de abordar": Consultiva (descobre, mostra a prévia, convida) ou Comercial e atrativa (anuncia a promoção depois da prévia).',
          '"Serviço que o robô vende": escolha o serviço e preencha preço, prazo, o que inclui, esboço grátis ou não e forma de pagamento. O robô só cita o preço que está aqui.',
          '"Como ele conversa": objetivo da conversa, link para agendar, desconto máximo e condição especial do momento.',
          'Em "Regras e respostas prontas", escreva perguntas frequentes e suas regras (por exemplo "reunião só de terça a quinta").',
          'Clique em Salvar.',
        ],
        dicas: ['Sem preço cadastrado, o robô não fala valor: diz que depende do escopo e chama você.', 'Desconto 0% significa que ele nunca dá desconto.'],
      },
      {
        id: 'abordagem-comercial', titulo: 'Abordagem comercial com promoção', tempo: '3 min', tela: 'robo', telaRotulo: 'Abrir Robô → Comportamento',
        resumo: 'Para anunciar uma oferta logo depois da prévia e levar o lead para uma conversa.',
        passos: [
          'Em "Forma de abordar", escolha "Comercial e atrativa".',
          'Ligue a promoção e preencha o valor promocional e o que está incluso (um item por linha). A validade é opcional.',
          'Depois do link da prévia, o robô manda sozinho o aviso da promoção, com o preço e os itens que você cadastrou, e explica que a prévia é uma primeira ideia.',
          'Quando o lead diz "quero fechar", o robô confirma, repete a condição e convida para uma conversa rápida para mostrar como melhorar o site. Você assume para acertar pagamento e contrato.',
          'Se preferir que ele mande o checklist de fechamento (Pix, sinal e material), mude em "Serviço que o robô vende → Quando o lead diz quero fechar".',
        ],
        dicas: ['O robô nunca inventa "só hoje", brinde ou prazo: a validade só aparece se você preencher.', 'O endereço do site é .vercel.app (sem custo de domínio): diga isso com clareza na promoção.'],
      },
      {
        id: 'testar-robo', titulo: 'Testar o robô antes de ligar', tempo: '2 min', tela: 'robo', telaRotulo: 'Abrir Robô → Testar',
        resumo: 'Converse com ele como se fosse o lead, sem mandar nada a ninguém.',
        passos: [
          'Abra a aba "Testar" do Robô.',
          'Escreva como um lead escreveria: "quanto custa?", "pode mandar", "vou pensar", "quero fechar", "pare de mandar mensagem".',
          'Veja a resposta, a etapa em que ele colocou a conversa e quando ele chamaria você.',
        ],
        dicas: ['Cada resposta do simulador consome 1 crédito, como uma resposta real. Nada é enviado.'],
      },
      {
        id: 'o-que-o-robo-faz', titulo: 'O que o robô faz sozinho e quando chama você', tempo: '4 min', tela: 'conversas', telaRotulo: 'Abrir Conversas',
        resumo: 'As regras fixas que protegem o seu número e o seu cliente.',
        passos: [
          'Lead pediu ou aceitou a prévia ("pode", "manda"): o link sai na hora. Se o site ainda não existe, o sistema cria e manda.',
          'Perguntou preço: o robô só fala o valor cadastrado e junto do que está incluso. Reclamou de preço: ele dá o gancho e chama você.',
          'Quer fechar: o robô leva para uma conversa e passa para você.',
          'Pediu para não receber mais mensagens ou recusou duas vezes: o robô agradece, encerra e nunca mais escreve.',
          'Perguntou se é robô, IA ou pessoa: ele não afirma ser humano nem máquina, diz que é da equipe e chama você para continuar.',
          'O robô nunca se apresenta como assistente virtual, robô ou IA em nenhuma mensagem.',
          'Se você responder pelo celular ou pela tela de Conversas, o robô pausa nessa conversa e só volta quando você o ligar de novo nela.',
          'Se a IA ficar indisponível, o robô avisa na conversa ("responda você") em vez de ficar calado.',
        ],
      },
    ],
  },
  {
    id: 'conversas',
    titulo: 'Conversas, Pipeline e Avisos',
    descricao: 'Acompanhar e assumir quando for preciso.',
    tutoriais: [
      {
        id: 'conversas', titulo: 'Usar a tela de Conversas', tempo: '3 min', tela: 'conversas', telaRotulo: 'Abrir Conversas',
        resumo: 'O chat inteiro, como no WhatsApp, com o controle do robô.',
        passos: [
          'Abra "Conversas". A aba "WhatsApp" mostra seu WhatsApp aqui dentro; "Todos os canais" junta WhatsApp, Instagram, Messenger, Telegram e e-mail.',
          'Ao abrir uma conversa você vê tudo: o que o robô enviou (marcado "robô"), o que você escreveu e o que o lead respondeu, sem repetir mensagens.',
          'O botão no topo mostra "Robô respondendo" ou "Robô pausado". Clique para ligar ou pausar nessa conversa.',
          'Para responder você mesmo, escreva na caixa de baixo: o robô pausa nessa conversa.',
          '"Enviar a prévia do site agora" cria (se precisar) e manda a prévia do lead com um clique.',
          'Depois de responder, ligue o robô de novo na conversa para ele voltar a atender.',
        ],
        dicas: ['A conversa aberta atualiza sozinha a cada poucos segundos.', 'Se o robô passou a conversa para você, o motivo aparece no topo.'],
      },
      {
        id: 'pipeline', titulo: 'Acompanhar o Pipeline de Vendas', tempo: '3 min', tela: 'pipeline', telaRotulo: 'Abrir o Pipeline',
        resumo: 'As etapas, quem move os cards e como assumir um lead.',
        passos: [
          'As etapas são: Novo Lead, Contato Enviado, Respondeu, Qualificado, Reunião, Proposta e Fechado. "Perdido" fica à parte.',
          'O robô move os cards sozinho conforme a conversa e mostra o motivo; ele nunca volta uma etapa que você avançou.',
          'Arraste um card para outra etapa (no celular, use o seletor "Mover para" dentro do card).',
          'Em cada card, o botão do agente define quem atende: Robô padrão, Robô consultivo, Robô direto ou "Eu atendo" (o robô não responde esse lead).',
          '"Fechado" nunca vem do robô: só você marca, quando a venda acontece.',
        ],
      },
      {
        id: 'avisos', titulo: 'Entender os Avisos (o sino)', tempo: '1 min', tela: 'notifications', telaRotulo: 'Abrir Avisos',
        resumo: 'O que o sistema avisa e por que vale olhar.',
        passos: [
          'O sino do topo mostra quantos avisos novos há.',
          'Em "Avisos" aparecem: lead que abriu a prévia, lead que voltou a vê-la, resposta nova e lead que pediu uma pessoa.',
          'Clique no aviso: o da prévia leva a Meus Leads; os de resposta e de pedido de uma pessoa levam a Conversas.',
        ],
        dicas: ['Quem abriu a prévia é o sinal de interesse mais forte: vale uma mensagem sua nessa hora.'],
      },
    ],
  },
  {
    id: 'resultados',
    titulo: 'Acompanhar resultados',
    descricao: 'Dashboard, créditos e plano.',
    tutoriais: [
      {
        id: 'dashboard', titulo: 'Ler o Dashboard e o "Onde mais respondem"', tempo: '3 min', tela: 'dashboard', telaRotulo: 'Abrir o Dashboard',
        resumo: 'Descobrir qual segmento, cidade e estado respondem mais.',
        passos: [
          'No alto do Dashboard, os cartões mostram leads encontrados, oportunidades altas e pipeline ativo.',
          'Em "Onde mais respondem" você escolhe ver por Segmento, Cidade ou Estado.',
          'Escolha um segmento no filtro para comparar o mesmo ramo entre cidades e estados.',
          'Três destaques mostram quem responde mais (precisa de 3 ou mais abordados), quem tem mais interesse e quem mais pede o link da prévia.',
          'A tabela mostra abordados, responderam, interesse, pediram link e fechados.',
        ],
        dicas: ['Leads antigos aparecem como "Sem estado" até a próxima sincronização de Meus Leads.', 'Use isso para repetir o que funciona: o mesmo nicho na cidade ou no estado que mais responde.'],
      },
      {
        id: 'creditos', titulo: 'Créditos e plano', tempo: '2 min', tela: 'subscription', telaRotulo: 'Ver Assinatura',
        resumo: 'Onde os créditos são gastos e como recarregar.',
        passos: [
          'O saldo aparece no topo da tela, no computador (ícone de raio), e no Dashboard, em "Seu uso" (também no celular).',
          'Uma busca gasta 1 crédito por lead encontrado. Cada resposta do robô (e do simulador) gasta 1 crédito.',
          'Em "Assinatura" você vê o plano, o uso e as opções de recarga.',
          'Se faltar crédito, o robô avisa na conversa ("sem créditos para o robô responder") e chama você.',
        ],
      },
    ],
  },
  {
    id: 'vendas',
    titulo: 'Propostas, contratos e preço',
    descricao: 'Fechar a venda com documentos prontos.',
    tutoriais: [
      {
        id: 'propostas-contratos', titulo: 'Propostas e contratos', tempo: '3 min', tela: 'proposals', telaRotulo: 'Abrir Propostas',
        resumo: 'Documentos prontos, personalizados com os dados do lead.',
        passos: [
          'Abra "Propostas" ou "Contratos" e escolha um modelo.',
          'Em "Para qual lead", busque e escolha o lead (ou "Sem lead vinculado" para um cliente que já é seu).',
          'Preencha o briefing e gere o documento. Com um lead vinculado, a IA usa o diagnóstico dele.',
          'Revise, ajuste e envie ao cliente.',
        ],
      },
      {
        id: 'precificador', titulo: 'Calcular o preço (Precificador)', tempo: '2 min', tela: 'calculator', telaRotulo: 'Abrir o Precificador',
        resumo: 'Um valor sugerido por complexidade, urgência e porte do cliente.',
        passos: [
          'Abra o "Precificador".',
          'Informe o serviço, a complexidade (Baixa, Média ou Alta) e a urgência (Normal ou Urgente, com +30%).',
          'Veja o valor sugerido e use como base para a proposta.',
        ],
      },
    ],
  },
  {
    id: 'celular',
    titulo: 'No celular',
    descricao: 'Usar o LeadSage com o polegar.',
    tutoriais: [
      {
        id: 'celular', titulo: 'Usar o LeadSage no celular', tempo: '2 min',
        resumo: 'A barra de baixo, os cartões e como instalar na tela inicial.',
        passos: [
          'A barra de baixo leva ao que mais se usa: Início, Buscar, Leads, Conversas e Menu. O Menu abre o resto das telas.',
          'Meus Leads vira uma lista de cartões, com botões grandes para Detalhes, favoritar e excluir.',
          'No Pipeline, role de lado para ver as etapas e use "Mover para" dentro do card.',
          'Para instalar como app: no navegador do celular, use "Adicionar à tela inicial".',
        ],
      },
    ],
  },
];

export const totalDeTutoriais = (): number => CATEGORIAS.reduce((n, c) => n + c.tutoriais.length, 0);

/** Busca por palavra no título, no resumo e nos passos (sem acento, sem diferenciar maiúsculas). */
export const buscarTutoriais = (texto: string): CategoriaDeTutorial[] => {
  const norm = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const q = norm(texto.trim());
  if (!q) return CATEGORIAS;
  return CATEGORIAS
    .map(c => ({ ...c, tutoriais: c.tutoriais.filter(t => norm([t.titulo, t.resumo, ...t.passos, ...(t.dicas || []), t.atencao || ''].join(' ')).includes(q)) }))
    .filter(c => c.tutoriais.length > 0);
};
