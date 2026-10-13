// Gera o HTML de cada modelo da família Cinema com dados de exemplo, para conferir no navegador.
// Uso: npx tsx qa/render-sites.ts [id ...]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { SITE_TEMPLATES } from '../src/templates/sites/layouts';
import type { SiteData } from '../src/templates/sites/base';

const foto = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1400&q=70`;
const dados: SiteData = {
  empresa: 'Clínica Aura Estética', categoria: 'Estética e bem-estar', cidade: 'Botucatu',
  slogan: 'Realce a sua beleza natural, com cuidado e segurança',
  sobre: 'A Aura nasceu para cuidar de pessoas. Unimos técnica, tecnologia e um atendimento próximo para que cada tratamento respeite o seu tempo e a sua história.',
  servicos: [
    { titulo: 'Harmonização facial', descricao: 'Equilíbrio dos traços com naturalidade e segurança.' },
    { titulo: 'Limpeza de pele', descricao: 'Protocolos personalizados para cada tipo de pele.' },
    { titulo: 'Depilação a laser', descricao: 'Tecnologia moderna, confortável e eficiente.' },
    { titulo: 'Massagem relaxante', descricao: 'Um momento só seu, para desacelerar.' },
  ],
  telefone: '+55 14 99999-1234', whatsapp: '5514999991234', email: 'contato@auraestetica.com.br',
  endereco: 'Rua Amando de Barros, 480 — Centro', horario: 'Seg a Sex 9h às 19h · Sáb 9h às 14h',
  instagram: '@auraestetica', corPrimaria: '#7c3aed', corDestaque: '#f59e0b', nota: 4.9, avaliacoes: 312,
  capa: foto('photo-1570172619644-dfd03ed5d881'), fotoSobre: foto('photo-1616394584738-fc6e612e71b9'),
  galeria: [foto('photo-1512290923902-8a9f81dc236c'), foto('photo-1540555700478-4be289fbecef'), foto('photo-1519823551278-64ac92734fb1'), foto('photo-1596178065887-1198b6148b2b')],
  depoimentos: [{ texto: 'Atendimento incrível, saí de lá me sentindo outra pessoa.', autor: 'Marina S.' }, { texto: 'Equipe atenciosa e resultado natural. Recomendo muito!', autor: 'Paula R.' }],
  diferenciais: [{ titulo: 'Atendimento humano', texto: 'Você é recebido por quem de fato cuida de você.' }, { titulo: 'Tecnologia atual', texto: 'Equipamentos modernos e protocolos validados.' }, { titulo: 'Resultado natural', texto: 'Realçamos o que já é seu, sem exageros.' }],
  passos: [{ titulo: 'Avaliação', texto: 'Conversamos sobre o que você deseja.' }, { titulo: 'Plano', texto: 'Montamos o tratamento ideal.' }, { titulo: 'Cuidado', texto: 'Você é atendido com calma e segurança.' }],
  faq: [{ pergunta: 'Preciso agendar?', resposta: 'Sim, pelo WhatsApp.' }, { pergunta: 'Aceitam cartão?', resposta: 'Sim, em todas as bandeiras.' }],
  selo: true,
};
const alvo = process.argv.slice(2);
const pasta = join(import.meta.dirname, 'saida', 'sites');
mkdirSync(pasta, { recursive: true });
for (const t of SITE_TEMPLATES.filter(x => !alvo.length || alvo.includes(x.id))) {
  writeFileSync(join(pasta, `${t.id}.html`), t.render(dados), 'utf8');
  console.log('ok', t.id);
}
