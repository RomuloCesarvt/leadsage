/** Atalhos do painel para o pipeline: o painel guarda o filtro de tag e a tela do pipeline o lê ao abrir (e o apaga, para valer uma vez só). */
const CHAVE = 'leadsage_pipeline_filtro_tag';

export const pedirFiltroDoPipeline = (tag: string): void => {
  try { if (tag) sessionStorage.setItem(CHAVE, tag); else sessionStorage.removeItem(CHAVE); } catch { /* sem armazenamento */ }
};

export const lerFiltroDoPipeline = (): string => {
  try {
    const v = sessionStorage.getItem(CHAVE) || '';
    sessionStorage.removeItem(CHAVE);
    return v;
  } catch { return ''; }
};

/** O painel abre Meus Leads já filtrado (por ramo ou cidade): a tela lê o termo ao abrir e o apaga. */
const CHAVE_BUSCA = 'leadsage_leads_busca';

export const pedirBuscaDeLeads = (termo: string): void => {
  try { if (termo) sessionStorage.setItem(CHAVE_BUSCA, termo); else sessionStorage.removeItem(CHAVE_BUSCA); } catch { /* sem armazenamento */ }
};

export const lerBuscaDeLeads = (): string => {
  try {
    const v = sessionStorage.getItem(CHAVE_BUSCA) || '';
    sessionStorage.removeItem(CHAVE_BUSCA);
    return v;
  } catch { return ''; }
};
