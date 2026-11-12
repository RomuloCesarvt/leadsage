/**
 * Os planos mensais e o que cada um entrega. Uma fonte só: a tela de Assinatura e os testes leem daqui.
 * Valores definidos pelo dono em 04/11/2026 (Essencial, Profissional, robô de atendimento e Escala); o modo extra é sugestão a confirmar.
 * Quem diz se a cobrança está ativa é o servidor (GET /api/assinatura/config): sem o token do Mercado Pago o botão fica em "em breve".
 */
import type { ModoDaConta } from '../lib/modoDaConta';


export interface PlanoMensal {
  id: 'essencial' | 'profissional' | 'escala';
  nome: string;
  preco: number;
  leads: number;
  /** sites (prévias e publicação) por mês; só no modo agência */
  sites: number;
  /** conversas do robô por mês; 0 = o robô é um complemento pago à parte */
  conversas: number;
  robo: 'complemento' | 'incluso';
  destaque?: boolean;
  chamada: string;
}

export const ROBO_COMPLEMENTO = 100;

/** Mensagens por dia com o agente de chat. Tem de bater com LIMITES_DIARIOS em backend/app/agente_ia.py. O agente faz parte do pacote com o Robô de IA. */
export const AGENTE_DIARIO: Record<PlanoMensal['id'], { semRobo: number; comRobo: number }> = {
  essencial: { semRobo: 15, comRobo: 60 },
  profissional: { semRobo: 40, comRobo: 150 },
  escala: { semRobo: 400, comRobo: 400 },
};
export const MODO_EXTRA = 97;

export const PLANOS_MENSAIS: PlanoMensal[] = [
  { id: 'essencial', nome: 'Essencial', preco: 120, leads: 150, sites: 10, conversas: 150, robo: 'complemento', chamada: 'Para começar a prospectar com método.' },
  { id: 'profissional', nome: 'Profissional', preco: 250, leads: 1000, sites: 50, conversas: 1000, robo: 'complemento', destaque: true, chamada: 'Para prospectar todo dia, com volume.' },
  { id: 'escala', nome: 'Escala', preco: 497, leads: 3000, sites: 200, conversas: 3000, robo: 'incluso', chamada: 'Volume alto, com o robô de atendimento incluso.' },
];

const n = (v: number) => v.toLocaleString('pt-BR');

/** O que o plano entrega SEM o robô de atendimento (ele é um bloco à parte), na linguagem do modo da conta (a agência vê sites; a empresa vê visitas e orçamento). */
export const entregasDoPlano = (p: PlanoMensal, modo: ModoDaConta): string[] => {
  const comuns = [
    `${n(p.leads)} leads por mês, buscados por segmento e cidade`,
    'Raio-X de cada lead (avaliações, presença online, oportunidades)',
    'IA que escreve a abordagem de cada lead no WhatsApp',
    'Funil de vendas e caixa de entrada com toda a conversa',
    'Seguimento automático de quem não respondeu (2 e 5 dias úteis)',
    'Painel com os segmentos e cidades que mais respondem',
    ...(p.robo === 'incluso' ? [] : [`Agente de IA no chat: ${n(AGENTE_DIARIO[p.id].semRobo)} mensagens por dia`]),
  ];
  const agencia = [
    `${n(p.sites)} prévias de site por mês para mostrar ao cliente`,
    ...(p.id !== 'essencial' ? ['Exportar leads, marca própria e modelos premium de site'] : []),
    ...(p.id === 'escala' ? ['Propostas, contratos e precificador', 'Suporte prioritário'] : []),
  ];
  const empresa = [
    'Orçamento automático no WhatsApp, calculado pela sua tabela de preços',
    'Agenda de visitas e lembrete de retorno de manutenção',
    ...(p.id !== 'essencial' ? ['Exportar leads'] : []),
    ...(p.id === 'escala' ? ['Propostas e contratos', 'Suporte prioritário'] : []),
  ];
  return [...comuns, ...(modo === 'empresa' ? empresa : agencia)];
};

/** O que o robô de atendimento com IA faz: o mesmo para todos os planos. */
export const entregasDoRobo = (p: PlanoMensal): string[] => [
  `Agente de IA no chat: peça "busque dentistas em Campinas" e ele busca, escreve as mensagens e deixa na fila para você revisar (${n(AGENTE_DIARIO[p.id].comRobo)} mensagens por dia)`,
  'Responde as mensagens dos leads no WhatsApp, na hora, e conduz a conversa',
  'Entende áudios e conversas longas',
  'Só promete o que você cadastrou (preço, prazo, garantia)',
  'Chama você quando o cliente quer fechar, agendar ou pede algo fora do combinado',
  'Pausa sozinho quando você assume a conversa',
  `Até ${n(p.conversas)} conversas por mês`,
];

/** O id do plano no servidor (payments.py): o Essencial e o Profissional têm uma variante com o robô; a Escala já o traz. */
export const idNoServidor = (p: PlanoMensal, comRobo: boolean): string => `m_${p.id}${comRobo && p.robo === 'complemento' ? '_robo' : ''}`;

export const precoComRobo = (p: PlanoMensal): number => p.preco + (p.robo === 'incluso' ? 0 : ROBO_COMPLEMENTO);

/** O que o LeadSage tem de diferente, por modo. Só o que o sistema faz de verdade hoje. */
export const diferenciais = (modo: ModoDaConta): { titulo: string; texto: string }[] => {
  const comuns = [
    { titulo: 'Tudo num lugar só', texto: 'Achar o lead, abordar, conversar e acompanhar sem trocar de ferramenta.' },
    { titulo: 'Cada mensagem é única', texto: 'A IA escreve com os dados reais do negócio (avaliações, ramo, cidade), nunca um texto genérico de disparo.' },
    { titulo: 'O robô só promete o que você cadastrou', texto: 'Preço, prazo e garantia saem do seu cadastro. Ele não inventa valor nem desconto.' },
    { titulo: 'Você assume e o robô para', texto: 'Respondeu uma conversa pelo WhatsApp? O robô pausa sozinho e só volta quando você mandar.' },
    { titulo: 'Seguimento sem esforço', texto: 'Quem não respondeu recebe lembretes automáticos nos dias seguintes (2 e 5 dias úteis).' },
    { titulo: 'IA que não para', texto: 'Vários motores de IA com troca automática: se um fica congestionado, outro assume.' },
    { titulo: 'Pensado para o celular', texto: 'Funciona no celular, onde você realmente responde seus clientes.' },
  ];
  const agencia = [
    { titulo: 'Prévia de site com a cara do lead', texto: 'Logo, cores e fotos do próprio negócio, para mostrar antes de vender.' },
    { titulo: 'Raio-X de cada lead', texto: 'Presença online, avaliações e oportunidades, para chegar com um argumento de verdade.' },
  ];
  const empresa = [
    { titulo: 'Orçamento sem erro de conta', texto: 'O robô entende o pedido e o total sai da sua tabela de preços, calculado pelo sistema.' },
    { titulo: 'Agenda e retorno de manutenção', texto: 'Visitas marcadas e lembrete para oferecer a próxima limpeza no tempo certo.' },
    { titulo: 'Abordagem sem papo de agência', texto: 'A conversa é sobre o seu serviço (instalação, limpeza, manutenção), sem site nem prévia.' },
  ];
  return [...(modo === 'empresa' ? empresa : agencia), ...comuns];
};
