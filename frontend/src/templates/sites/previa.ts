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
import { direcaoDeArte, ramoEfetivo } from './direcao-de-arte';
import { limparNomeDaMarca } from './marca';
import { SITE_TEMPLATES, sugerirTemplate } from './layouts';
import { acabamento } from './acabamento';
import { aplicarCopia, individualizar, variarCor } from './variedade';

/**
 * Nota e avaliações do Google só entram no site quando são mérito de verdade: nota alta E volume que a sustente.
 * 5,0 com 3 avaliações, ou 4,2 com 200, não vendem nada (e ainda podem queimar o negócio): nesses casos o selo some.
 */
export const NOTA_MINIMA = 4.5;
export const AVALIACOES_MINIMAS = 30;
export const notaComMerito = (nota: unknown, avaliacoes: unknown): { nota: number; avaliacoes: number } | null => {
  const n = Number(nota); const a = Number(avaliacoes);
  return n >= NOTA_MINIMA && a >= AVALIACOES_MINIMAS ? { nota: n, avaliacoes: a } : null;
};

const urlHttps = (u: unknown): string => (/^https:\/\/[^\s"'<>()\\]+$/.test(String(u || '')) ? String(u) : '');

const corDaMarca = (c: unknown): string => (/^#[0-9a-f]{6}$/i.test(String(c || '')) ? String(c).toLowerCase() : '');

/** Os dados iniciais de um site: os do lead quando há, já com o conteúdo do ramo. */
export const dadosDoLead = (lead: any): SiteData => {
  const base: SiteData = {
    // a marca no topo do site é o nome, sem a cidade da busca nem o "| descrição" que o Google Meu Negócio cola no título
    empresa: limparNomeDaMarca(lead?.company || lead?.name || '', lead?.city || '').marca || 'Minha Empresa',
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
    instagram: lead?.socials?.instagram || lead?.identidade?.instagram || lead?.instagram || '',
    // a logo do próprio negócio (do site ou a foto do perfil do Instagram), quando a busca de identidade achou
    logo: urlHttps(lead?.identidade?.logo) || undefined,
    corPrimaria: '#2563eb',
    corDestaque: '#f59e0b',
    // a nota do Google vira o selo de prova social no site
    ...(() => { const m = notaComMerito(lead?.rating, lead?.rating_count); return { nota: m ? m.nota : null, avaliacoes: m ? m.avaliacoes : null }; })(),
  };
  // com um negócio de verdade, o repertório do ramo já vem escrito (e editável)
  return lead ? semearConteudo(base, { cores: true }) : base;
};

/**
 * Versão do motor de sites. Precisa ser IGUAL a MOTOR_VERSAO em backend/app/previa_site.py (um teste confere): o servidor só refaz
 * uma prévia quando a versão gravada nela é outra. Sem esta marca, todo site criado pelo Disparo era refeito de novo pelo servidor
 * ao preparar a mensagem (o dobro de tempo e de chamadas de IA).
 */
export const MOTOR_VERSAO = '2026-11-04-acabamento-de-design';

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


/**
 * O site do lead, pronto para publicar.
 * `fotos`: endereços https do banco de imagens do ramo; só entram onde o lead ainda não tem foto.
 */
/** O que um site já existente sabia do negócio e o lead que chega agora pode não trazer (contato, horário, nota, fotos). */
const CAMPOS_DO_SITE_ANTERIOR = ['telefone', 'whatsapp', 'email', 'endereco', 'horario', 'instagram', 'nota', 'avaliacoes', 'logo', 'capa', 'fotoSobre'] as const;

export const montarPrevia = (lead: any, fotos: string[] = [], preferido = '', anterior: Partial<SiteData> | null = null) => {
  // o ramo que o motor entende: o da busca, o do nome da empresa ou o que a IA reconheceu (ex.: "Gastroenterologistas" é saúde, não oficina)
  const ramoBruto = lead?.niche || lead?.role || '';
  const efetivo = ramoEfetivo(ramoBruto, lead?.company || lead?.name || '', lead?.copia_ia?.segmento);
  let dados = dadosDoLead(efetivo !== ramoBruto ? { ...lead, niche: efetivo, role: efetivo } : lead);
  dados.categoria = String(lead?.copia_ia?.categoria || lead?.copia_ia?.especialidade || '').trim().slice(0, 60) || ramoBruto || dados.categoria;
  // o texto da IA para ESTE negócio (quando o servidor trouxe) vale mais que o do banco do ramo; sem ele, o que o Google diz do lugar
  const copia = lead?.copia_ia && typeof lead.copia_ia === 'object' && Object.keys(lead.copia_ia).length ? lead.copia_ia : null;
  dados = copia ? aplicarCopia(dados, copia, lead?.city || '') : dados;
  dados = individualizar(dados, lead, !!copia);
  // a cor do segmento, com um desvio próprio de cada empresa: duas padarias não repetem o mesmo tom
  const corMarca = corDaMarca(lead?.identidade?.cor);
  if (corMarca) {
    // o negócio já tem cor: o site usa a dele (o destaque continua o do segmento, para combinar)
    dados.corPrimaria = corMarca;
  } else {
    dados.corPrimaria = variarCor(dados.corPrimaria, `${dados.empresa}|p`);
  }
  dados.corDestaque = variarCor(dados.corDestaque, `${dados.empresa}|d`, 0.6);
  if (anterior && typeof anterior === 'object') {
    const d = dados as unknown as Record<string, unknown>;
    for (const k of CAMPOS_DO_SITE_ANTERIOR) {
      const novo = d[k]; const velho = (anterior as Record<string, unknown>)[k];
      if ((novo === undefined || novo === null || novo === '') && velho !== undefined && velho !== null && velho !== '') d[k] = velho;
    }
    if (!(dados.galeria || []).length && Array.isArray(anterior.galeria)) dados.galeria = anterior.galeria.filter(x => typeof x === 'string').slice(0, 4);
    if (!dados.depoimentos?.some(x => x.texto?.trim()) && Array.isArray(anterior.depoimentos)) dados.depoimentos = anterior.depoimentos;
  }
  // o site anterior pode ter guardado uma nota fraca: a regra do mérito vale também para ele
  const meritoFinal = notaComMerito(dados.nota, dados.avaliacoes);
  dados.nota = meritoFinal ? meritoFinal.nota : null;
  dados.avaliacoes = meritoFinal ? meritoFinal.avaliacoes : null;
  // fotos do próprio negócio (as do site dele) vêm antes das do banco de imagens; o banco completa
  const proprias = (Array.isArray(lead?.identidade?.imagens) ? lead.identidade.imagens : []).map(urlHttps).filter(Boolean).slice(0, 3);
  const urls = [...new Set([...proprias, ...(fotos || []).map(urlHttps).filter(Boolean)])];
  if (urls.length) {
    dados.capa = dados.capa || urls[0];
    dados.fotoSobre = dados.fotoSobre || urls[1] || urls[0];
    if (!(dados.galeria || []).length) dados.galeria = urls.slice(2, 6);
  }
  const ramo = efetivo;
  // ao atualizar um site que já existe, mantém o modelo dele, desde que ainda combine com o ramo
  const atual = preferido ? SITE_TEMPLATES.find(t => t.nome === preferido || t.id === preferido) : undefined;
  const template = atual && direcaoDeArte(ramo, dados.empresa).modelos.includes(atual.id) ? atual : escolherTemplate(ramo, dados.empresa);
  const html = acabamento(template.render({ ...dados, selo: true }));
  return { company: dados.empresa, html, template: template.nome, lead_id: String(lead?.id || ''), builder_data: JSON.stringify({ ...dados, motor: MOTOR_VERSAO }) };
};
