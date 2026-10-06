/**
 * Amostras do cenário real: o vendedor informa só nome, ramo, cidade e
 * contato; todo o resto (promessa, serviços, diferenciais, passos, FAQ,
 * paleta e layout) vem do banco de conteúdo do ramo.
 *
 *   npx tsx scripts/amostras-banco.ts <pasta>   (a pasta precisa ter fotos.json)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { SITE_TEMPLATES } from '../src/templates/sites/layouts';
import { semearConteudo, layoutDoRamo } from '../src/templates/sites/semear';
import type { SiteData } from '../src/templates/sites/base';

const dir = process.argv[2];
const fotos: Record<string, string[]> = JSON.parse(readFileSync(`${dir}/fotos.json`, 'utf-8'));
const so = process.argv[3] ? process.argv[3].split(',') : null;

// [arquivo, ramo, empresa, chave de fotos, extras]
const casos: [string, string, string, string, Partial<SiteData>][] = [
  ['b-padaria', 'Padarias', 'Padaria Flor do Lageado', 'Padaria', { nota: 4.4, avaliacoes: 1411, horario: 'segunda-feira: 06:00 – 20:00\nterça-feira: 06:00 – 20:00' }],
  ['b-dentista', 'Dentistas', 'Sorriso Vivo Odontologia', 'Clínica Odontológica', { nota: 4.8, avaliacoes: 233 }],
  ['b-advocacia', 'Advogados', 'Moura & Leite Advocacia', 'Advogados', { nota: 4.9, avaliacoes: 41 }],
  ['b-academia', 'Academias', 'Pulse Fit Academia', 'Academia', { nota: 4.5, avaliacoes: 390 }],
  ['b-oficina', 'Oficinas mecânicas', 'Auto Center Botucatu', 'Oficina Mecânica', { nota: 4.6, avaliacoes: 520 }],
  ['b-bento', 'Agências de marketing', 'Pixel Agência Digital', 'Advogados', { nota: 4.9, avaliacoes: 64 }],
  ['b-natural', 'Psicólogos', 'Espaço Vida Plena', 'Clínica Odontológica', { nota: 5.0, avaliacoes: 38 }],
  ['b-conc', 'Concessionárias', 'Primavera Veículos', 'Concessionária', { nota: 4.6, avaliacoes: 318 }],
  ['b-credito', 'Crediários', 'Crediário Praça Central', 'Financeira', { nota: 4.5, avaliacoes: 87 }],
  ['b-pet', 'Pet shops', 'Pet Shop Amigo Fiel', 'Academia', { nota: 4.9, avaliacoes: 142 }],
  ['b-planta', 'Reformas', 'Moura Reformas e Projetos', 'Oficina Mecânica', { nota: 4.7, avaliacoes: 96 }],
  ['b-mesa', 'Restaurantes', 'Cantina Forno de Ouro', 'Padaria', { nota: 4.6, avaliacoes: 812 }],
  ['b-ritual', 'Clínicas de estética', 'Studio Bella Pele', 'Barbearia', { nota: 4.8, avaliacoes: 187 }],
  ['b-estetica', 'Salões de Beleza', 'Navalha Clube Barbearia', 'Barbearia', { nota: 4.7, avaliacoes: 150 }],
];

for (const [arquivo, ramo, empresa, chave, extra] of casos) {
  if (so && !so.includes(arquivo)) continue;
  const f = fotos[chave] || [];
  const id = layoutDoRamo(ramo);
  const modelo = SITE_TEMPLATES.find(t => t.id === id) || SITE_TEMPLATES[0];
  const dados = semearConteudo({
    empresa, categoria: ramo, cidade: 'Botucatu', slogan: '', sobre: '', servicos: [{ titulo: '', descricao: '' }],
    telefone: '5514998003784', whatsapp: '5514998003784', email: 'contato@exemplo.com.br',
    endereco: 'R. Amando de Barros, 1200 — Centro, Botucatu', horario: 'Seg a Sex 8h às 18h; Sáb 8h às 12h', instagram: '@exemplo',
    corPrimaria: '#2563eb', corDestaque: '#f59e0b',
    capa: f[0], fotoSobre: f[1], galeria: f.slice(2, 6), depoimentos: [{ texto: '', autor: '' }],
    ...extra,
  } as SiteData, { cores: true });
  writeFileSync(`${dir}/${arquivo}.html`, modelo.render(dados), 'utf-8');
  console.log(arquivo, '→', modelo.id);
}
