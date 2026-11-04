/**
 * Os planos mensais e o que cada um entrega. Uma fonte só: a tela de Assinatura e os testes leem daqui.
 * Valores definidos pelo dono em 04/11/2026 (Essencial, Profissional, robô de atendimento e Escala); o modo extra é sugestão a confirmar.
 * A cobrança recorrente ainda não está ligada: enquanto `cobranca` for false a tela mostra "em breve" no botão.
 */
import type { ModoDaConta } from '../lib/modoDaConta';

export const COBRANCA_MENSAL_ATIVA = false;

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
export const MODO_EXTRA = 97;

export const PLANOS_MENSAIS: PlanoMensal[] = [
  { id: 'essencial', nome: 'Essencial', preco: 120, leads: 150, sites: 10, conversas: 150, robo: 'complemento', chamada: 'Para começar a prospectar com método.' },
  { id: 'profissional', nome: 'Profissional', preco: 250, leads: 1000, sites: 50, conversas: 1000, robo: 'complemento', destaque: true, chamada: 'Para prospectar todo dia, com volume.' },
  { id: 'escala', nome: 'Escala', preco: 497, leads: 3000, sites: 200, conversas: 3000, robo: 'incluso', chamada: 'Volume alto, com o robô de atendimento incluso.' },
];

const n = (v: number) => v.toLocaleString('pt-BR');

/** O que o plano entrega, na linguagem do modo da conta (a agência vê sites; a empresa vê visitas e orçamento). */
export const entregasDoPlano = (p: PlanoMensal, modo: ModoDaConta): string[] => {
  const comuns = [
    `${n(p.leads)} leads por mês, buscados por segmento e cidade`,
    'Raio-X de cada lead (avaliações, presença online, oportunidades)',
    'IA que escreve a abordagem de cada lead no WhatsApp',
    'Funil de vendas e caixa de entrada com toda a conversa',
    'Seguimento automático de quem não respondeu (2 e 5 dias úteis)',
    'Painel com os segmentos e cidades que mais respondem',
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
  const robo = p.robo === 'incluso'
    ? [`Robô de atendimento com IA incluso (até ${n(p.conversas)} conversas por mês)`]
    : [`Robô de atendimento com IA: complemento de R$ ${ROBO_COMPLEMENTO}/mês (até ${n(p.conversas)} conversas)`];
  return [...comuns, ...(modo === 'empresa' ? empresa : agencia), ...robo];
};

export const precoComRobo = (p: PlanoMensal): number => p.preco + (p.robo === 'incluso' ? 0 : ROBO_COMPLEMENTO);
