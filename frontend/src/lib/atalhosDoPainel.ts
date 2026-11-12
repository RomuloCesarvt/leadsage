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
