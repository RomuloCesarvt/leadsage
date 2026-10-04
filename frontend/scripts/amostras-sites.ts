/**
 * Gera uma pagina de amostra de cada layout premium, com dados e fotos
 * reais, para conferir o resultado no navegador — o codigo do layout
 * sozinho nao mostra se ficou bom.
 *
 *   npx tsx scripts/amostras-sites.ts <pasta>   (a pasta precisa ter fotos.json)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { LAYOUTS_PREMIUM } from '../src/templates/sites/premium';
import type { SiteData } from '../src/templates/sites/base';

const dir = process.argv[2];
const fotos: Record<string, string[]> = JSON.parse(readFileSync(`${dir}/fotos.json`, 'utf-8'));

const casos: [string, string, Partial<SiteData>][] = [
  ['aurora', 'Padaria', { empresa: 'Padaria Antiga Jacarandá', categoria: 'Padaria artesanal', slogan: 'Pão quente, fermentação natural e café coado na hora',
    sobre: 'Desde 1998 no coração de Botucatu, com receitas de família e fornadas que começam antes do sol nascer.',
    servicos: [{ titulo: 'Pão de fermentação natural', descricao: 'Massa de 48 horas, casca crocante e miolo úmido.' },
      { titulo: 'Bolos por encomenda', descricao: 'Aniversários e festas, com recheios da casa.' },
      { titulo: 'Café da manhã', descricao: 'Mesa completa das 6h às 10h, todos os dias.' },
      { titulo: 'Salgados assados', descricao: 'Esfihas, empadas e folhados saídos do forno.' }],
    corPrimaria: '#7c2d12', corDestaque: '#f59e0b' }],
  ['clinica', 'Clínica Odontológica', { empresa: 'Sorriso Vivo Odontologia', categoria: 'Odontologia', slogan: 'Seu sorriso cuidado por quem entende de gente',
    sobre: 'Clínica completa com implantes, ortodontia e estética, e atendimento que começa ouvindo você.',
    servicos: [{ titulo: 'Implantes', descricao: 'Planejamento digital e acompanhamento até o resultado.' },
      { titulo: 'Ortodontia', descricao: 'Aparelhos fixos e alinhadores invisíveis.' },
      { titulo: 'Clareamento', descricao: 'Em consultório ou caseiro, com segurança.' }],
    corPrimaria: '#0e7490', corDestaque: '#22d3ee' }],
  ['oficina', 'Oficina Mecânica', { empresa: 'Auto Center Botucatu', categoria: 'Mecânica geral', slogan: '',
    sobre: 'Diagnóstico honesto, peças de qualidade e prazo cumprido. Há 15 anos cuidando do carro da cidade.',
    servicos: [{ titulo: 'Revisão completa', descricao: 'Check-up de 40 itens com laudo.' }, { titulo: 'Freios', descricao: 'Pastilhas, discos e fluido.' },
      { titulo: 'Suspensão', descricao: 'Amortecedores, molas e alinhamento.' }, { titulo: 'Injeção eletrônica', descricao: 'Scanner e limpeza de bicos.' },
      { titulo: 'Ar-condicionado', descricao: 'Higienização e recarga.' }, { titulo: 'Troca de óleo', descricao: 'Na hora, sem agendamento.' }],
    corPrimaria: '#1d4ed8', corDestaque: '#facc15' }],
  ['estudio', 'Barbearia', { empresa: 'Navalha Clube', categoria: 'Barbearia', slogan: 'Corte, barba e uma boa conversa',
    sobre: 'Barbearia clássica com toalha quente, navalha e cerveja gelada enquanto você espera.',
    servicos: [{ titulo: 'Corte clássico', descricao: 'Tesoura e máquina, acabamento na navalha.' }, { titulo: 'Barba completa', descricao: 'Toalha quente e óleos.' },
      { titulo: 'Combo corte + barba', descricao: 'O serviço completo da casa.' }],
    corPrimaria: '#1c1917', corDestaque: '#c9a227' }],
  ['escritorio', 'Advogados', { empresa: 'Moura & Leite Advocacia', categoria: 'Advocacia empresarial', slogan: 'Segurança jurídica para o seu negócio crescer',
    sobre: 'Escritório dedicado a pequenas e médias empresas, com atendimento próximo e linguagem sem juridiquês.',
    servicos: [{ titulo: 'Contratos', descricao: 'Elaboração e revisão de contratos comerciais.' }, { titulo: 'Trabalhista', descricao: 'Prevenção e defesa da empresa.' },
      { titulo: 'Tributário', descricao: 'Planejamento e recuperação de impostos.' }],
    corPrimaria: '#1e3a5f', corDestaque: '#b8860b' }],
  ['vibrante', 'Academia', { empresa: 'Pulse Fit', categoria: 'Academia', slogan: 'treino que dá vontade de voltar',
    sobre: 'Musculação, funcional e aulas coletivas com professor do seu lado o tempo todo.',
    servicos: [{ titulo: 'Musculação', descricao: 'Aparelhos novos e acompanhamento.' }, { titulo: 'Funcional', descricao: 'Turmas pequenas, treino intenso.' },
      { titulo: 'Aulas coletivas', descricao: 'Spinning, dança e lutas.' }],
    corPrimaria: '#7c3aed', corDestaque: '#f97316' }],
];

for (const [id, nicho, extra] of casos) {
  const f = fotos[nicho] || [];
  const d = {
    empresa: '', categoria: '', slogan: '', sobre: '', servicos: [],
    telefone: '+55 14 99800-3784', whatsapp: '5514998003784', email: 'contato@exemplo.com.br',
    endereco: 'R. Amando de Barros, 1200 — Centro, Botucatu', horario: 'Seg a Sáb, 7h às 20h', instagram: '@exemplo',
    corPrimaria: '#2563eb', corDestaque: '#f59e0b',
    capa: f[0], fotoSobre: f[1], galeria: f.slice(2, 8), nota: 4.8, avaliacoes: 213,
    depoimentos: [{ texto: 'Atendimento impecável, virei cliente fiel.', autor: 'Marina S.' },
      { texto: 'Melhor da cidade, sem exagero. Recomendo de olhos fechados.', autor: 'Carlos R.' },
      { texto: 'Preço justo e muito capricho em tudo.', autor: 'Ana P.' }],
    ...extra,
  } as SiteData;
  writeFileSync(`${dir}/${id}.html`, LAYOUTS_PREMIUM.find(x => x.id === id)!.render(d), 'utf-8');
}
console.log('amostras geradas em', dir);
