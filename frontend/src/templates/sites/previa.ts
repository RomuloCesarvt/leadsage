/**
 * A prévia do site de um lead: o site DELE, com os dados dele.
 *
 * É o mesmo caminho para todo mundo: o disparo (no navegador) e o robô (no servidor, quando o lead aceita ver a prévia)
 * montam o site daqui. Nome, ramo, cidade, nota do Google, telefone, endereço, horário e Instagram vêm do lead; o
 * conteúdo do ramo (promessa, serviços, diferenciais, passos e perguntas) vem do banco do ramo; as fotos vêm do banco
 * de imagens (ou as do próprio cliente). O layout é escolhido pelo ramo e varia de uma empresa para outra.
 *
 * Nada aqui inventa fato: sem número de clientes, prêmio, preço ou garantia (o banco do ramo só traz o que vale
 * para qualquer negócio daquele tipo).
 */
import type { SiteData, SiteTemplate } from './base';
import { resumirSemana } from './profissional';
import { semearConteudo } from './semear';
import { SITE_TEMPLATES, sugerirTemplate } from './layouts';

/** Os dados iniciais de um site: os do lead quando há, já com o conteúdo do ramo. */
export const dadosDoLead = (lead: any): SiteData => {
  const base: SiteData = {
    empresa: lead?.company || lead?.name || 'Minha Empresa',
    // o ramo da busca ("Dentistas") casa melhor com o banco do que o cargo do contato
    categoria: lead?.niche || lead?.role || '',
    cidade: lead?.city || '',
    slogan: '',
    sobre: '',
    servicos: [
      { titulo: '', descricao: '' },
      { titulo: '', descricao: '' },
      { titulo: '', descricao: '' },
    ],
    galeria: [],
    depoimentos: [{ texto: '', autor: '' }],
    telefone: lead?.phone ? `+${String(lead.phone).replace(/^\+/, '')}` : '',
    whatsapp: lead?.whatsapp && lead?.phone ? String(lead.phone) : '',
    email: lead?.email || '',
    endereco: lead?.address || lead?.location || '',
    // a semana inteira resumida ("Seg a Sex 08:00–18:00 · Sáb ..."), não só os 3 primeiros dias
    horario: lead?.opening_hours_week?.length ? resumirSemana(lead.opening_hours_week) : lead?.opening_hours || '',
    instagram: lead?.socials?.instagram || lead?.instagram || '',
    corPrimaria: '#2563eb',
    corDestaque: '#f59e0b',
    // a nota do Google vira o selo de prova social no site
    nota: lead?.rating ?? null,
    avaliacoes: lead?.rating_count ?? null,
  };
  // com um negócio de verdade, o repertório do ramo já vem escrito (e editável)
  return lead ? semearConteudo(base, { cores: true }) : base;
};

const semAcento = (t: string) => (t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Para cada ramo, os layouts que combinam (os novos "Cinema" e os clássicos). A empresa escolhe um, sempre o mesmo. */
const POR_RAMO: [string[], string[]][] = [
  [['padaria', 'panific', 'confeit', 'doceria', 'cafe', 'restaurante', 'pizz', 'lanch', 'hamburg', 'bistro', 'sorvet', 'acai', 'gastronom', 'bar '], ['editorial', 'noir', 'aurora']],
  [['odonto', 'dentist', 'clinic', 'medic', 'saude', 'fisio', 'nutri', 'psicolog', 'laborat', 'farmac', 'veterin'], ['noir', 'fintech', 'premio', 'clinica']],
  [['estetica', 'harmoniz', 'spa', 'massagem', 'depila', 'sobrancelha', 'maquiag'], ['noir', 'fragrancia', 'fintech']],
  [['barbear', 'salao', 'cabelei', 'beleza', 'manicure', 'unha', 'tatuag', 'tattoo'], ['portfolio', 'neon', 'noir']],
  [['advoga', 'advoca', 'juridic', 'contab', 'contador', 'seguro', 'consult'], ['premio', 'fintech', 'arquitetura']],
  [['imobili', 'corretor', 'arquitet', 'engenhar', 'decoracao', 'interior', 'paisag', 'construtora'], ['arquitetura', 'premio', 'b2b']],
  [['mecan', 'oficina', 'auto', 'funilar', 'eletric', 'encanad', 'pintor', 'serralher', 'vidrac', 'material', 'constru', 'reforma', 'industri', 'logist', 'transport'], ['b2b', 'agro', 'neon']],
  [['academia', 'fitness', 'crossfit', 'pilates', 'danca', 'natacao', 'evento', 'festa', 'buffet', 'game', 'noturna'], ['neon', 'campus', 'portfolio']],
  [['escola', 'curso', 'idioma', 'infantil', 'coaching', 'tecnolog', 'software', 'coworking'], ['campus', 'fintech', 'b2b']],
  [['pet', 'agro', 'rural', 'jardin', 'floricult', 'planta'], ['agro', 'editorial', 'fragrancia']],
  [['joalher', 'perfum', 'boutique', 'moda', 'brinqued', 'presente'], ['fragrancia', 'noir', 'editorial']],
];

const indiceEstavel = (texto: string, n: number): number => {
  let h = 0;
  for (let i = 0; i < texto.length; i++) h = (h * 31 + texto.charCodeAt(i)) >>> 0;
  return h % Math.max(1, n);
};

/** O layout desta empresa: do ramo, variando de uma empresa para outra (duas padarias não saem gêmeas). */
export const escolherTemplate = (nicho: string, empresa: string): SiteTemplate => {
  const alvo = semAcento(nicho);
  for (const [palavras, ids] of POR_RAMO) {
    if (palavras.some(p => alvo.includes(p))) {
      const validos = ids.map(id => SITE_TEMPLATES.find(t => t.id === id)).filter(Boolean) as SiteTemplate[];
      if (validos.length) return validos[indiceEstavel(empresa, validos.length)];
    }
  }
  const padrao = ['noir', 'fintech', 'premio', 'editorial'].map(id => SITE_TEMPLATES.find(t => t.id === id)).filter(Boolean) as SiteTemplate[];
  return padrao.length ? padrao[indiceEstavel(empresa, padrao.length)] : sugerirTemplate(nicho);
};

const urlHttps = (u: unknown): string => (/^https:\/\/[^\s"'<>()\\]+$/.test(String(u || '')) ? String(u) : '');

/**
 * O site do lead, pronto para publicar.
 * `fotos`: endereços https do banco de imagens do ramo; só entram onde o lead ainda não tem foto.
 */
export const montarPrevia = (lead: any, fotos: string[] = []) => {
  const dados = dadosDoLead(lead);
  const urls = [...new Set((fotos || []).map(urlHttps).filter(Boolean))];
  if (urls.length) {
    dados.capa = dados.capa || urls[0];
    dados.fotoSobre = dados.fotoSobre || urls[1] || urls[0];
    if (!(dados.galeria || []).length) dados.galeria = urls.slice(2, 6);
  }
  const ramo = lead?.niche || lead?.role || '';
  const template = escolherTemplate(ramo, dados.empresa);
  const html = template.render({ ...dados, selo: true });
  return { company: dados.empresa, html, template: template.nome, lead_id: String(lead?.id || ''), builder_data: JSON.stringify(dados) };
};
