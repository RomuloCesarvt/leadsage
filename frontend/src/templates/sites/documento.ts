/**
 * O documento HTML completo de um layout premium.
 *
 * Cada layout entrega só o miolo (cabeçalho, seções, rodapé) e o próprio
 * CSS. Aqui entra o que é comum e não pode depender do layout: SEO e dados
 * estruturados, acessibilidade, tipografia fluida, seções extras, barra de
 * ação do celular e o <main>.
 */
import type { SiteData } from './base';
import { type ParFontes, FONTES, ICONES, cssRaiz, linkFontes, linkTel, linkZap } from './premium-base';
import { barraAcaoMovel, cabecaSEO, cssProfissional, envolverMain, luminancia } from './profissional';
import { cssExtras, secoesExtras } from './secoes-extras';

export type OpcoesDocumento = {
  /** layout de fundo escuro: as seções extras acompanham */
  escuro?: boolean;
};

/** Onde as seções extras entram: antes do bloco de contato; sem ele, antes do rodapé. */
const pontoDeInsercao = (corpo: string): number => {
  const contato = corpo.indexOf('id="contato"');
  if (contato >= 0) {
    const inicio = corpo.lastIndexOf('<section', contato);
    if (inicio >= 0) return inicio;
  }
  const rodape = corpo.lastIndexOf('<footer');
  return rodape >= 0 ? rodape : corpo.length;
};

/** Posição logo após o fim da seção de serviços (menu, áreas, cartões), ou -1. */
const depoisDosServicos = (corpo: string): number => {
  const m = /<section[^>]*(?:id="(?:servicos|menu|areas)"|class="[^"]*\b(?:servicos|cartoes|menu|areas)\b[^"]*")/.exec(corpo);
  if (!m) return -1;
  const fim = corpo.indexOf('</section>', m.index);
  return fim < 0 ? -1 : fim + '</section>'.length;
};

/**
 * O layout tem fundo escuro? Lê o `background` do `body` no CSS dele: assim as
 * seções extras acompanham o tema sem cada layout precisar avisar.
 */
const fundoEscuro = (css: string): boolean => {
  const m = /body\{[^}]*?background:\s*(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3})\b/.exec(css);
  return !!m && luminancia(m[1]) < 0.12;
};

export const documentoPremium = (
  d: SiteData, padrao: ParFontes, css: string, corpo: string, opcoes: OpcoesDocumento = {},
): string => {
  // a fonte escolhida pelo usuário vence o par do layout
  const f = (d.fonte && FONTES[d.fonte]) || padrao;

  const { cedo, resto } = secoesExtras(d, corpo);
  const extras = cedo + resto;
  let miolo = corpo;
  if (resto) {
    const i = pontoDeInsercao(corpo);
    miolo = `${corpo.slice(0, i)}${resto}\n${corpo.slice(i)}`;
  }
  if (cedo) {
    // depois da secao de servicos; sem ela, junto das demais, antes do contato
    const i = depoisDosServicos(miolo);
    miolo = i >= 0 ? `${miolo.slice(0, i)}${cedo}\n${miolo.slice(i)}` : `${miolo.slice(0, pontoDeInsercao(miolo))}${cedo}\n${miolo.slice(pontoDeInsercao(miolo))}`;
  }
  const { html, temMain } = envolverMain(miolo);
  const barra = barraAcaoMovel(linkTel(d), linkZap(d), ICONES.tel, ICONES.zap);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
${cabecaSEO(d, d.schema || 'LocalBusiness')}
${linkFontes(f)}
<style>${cssRaiz(d, f)}${cssProfissional()}${extras ? cssExtras(opcoes.escuro ?? fundoEscuro(css)) : ''}${css}</style>
</head>
<body>
${temMain ? '<a class="pular" href="#conteudo">Pular para o conteúdo</a>' : ''}
${html}
${barra}
</body>
</html>`;
};
