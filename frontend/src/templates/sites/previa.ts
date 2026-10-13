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
import { direcaoDeArte } from './direcao-de-arte';
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

const indiceEstavel = (texto: string, n: number): number => {
  let h = 0;
  for (let i = 0; i < texto.length; i++) h = (h * 31 + texto.charCodeAt(i)) >>> 0;
  return h % Math.max(1, n);
};

/** O layout desta empresa: do ramo, variando de uma empresa para outra (duas padarias não saem gêmeas). */
export const escolherTemplate = (nicho: string, empresa: string): SiteTemplate => {
  const { modelos } = direcaoDeArte(nicho, empresa);
  const validos = modelos.map(id => SITE_TEMPLATES.find(t => t.id === id)).filter(Boolean) as SiteTemplate[];
  return validos.length ? validos[indiceEstavel(empresa, validos.length)] : sugerirTemplate(nicho);
};

const urlHttps = (u: unknown): string => (/^https:\/\/[^\s"'<>()\\]+$/.test(String(u || '')) ? String(u) : '');

/**
 * O site do lead, pronto para publicar.
 * `fotos`: endereços https do banco de imagens do ramo; só entram onde o lead ainda não tem foto.
 */
export const montarPrevia = (lead: any, fotos: string[] = [], preferido = '') => {
  const dados = dadosDoLead(lead);
  const urls = [...new Set((fotos || []).map(urlHttps).filter(Boolean))];
  if (urls.length) {
    dados.capa = dados.capa || urls[0];
    dados.fotoSobre = dados.fotoSobre || urls[1] || urls[0];
    if (!(dados.galeria || []).length) dados.galeria = urls.slice(2, 6);
  }
  const ramo = lead?.niche || lead?.role || '';
  // ao atualizar um site que já existe, mantém o modelo dele, desde que ainda combine com o ramo
  const atual = preferido ? SITE_TEMPLATES.find(t => t.nome === preferido || t.id === preferido) : undefined;
  const template = atual && direcaoDeArte(ramo, dados.empresa).modelos.includes(atual.id) ? atual : escolherTemplate(ramo, dados.empresa);
  const html = template.render({ ...dados, selo: true });
  return { company: dados.empresa, html, template: template.nome, lead_id: String(lead?.id || ''), builder_data: JSON.stringify(dados) };
};
