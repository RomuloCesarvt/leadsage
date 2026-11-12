import React from 'react';
import { AlertTriangle, BarChart3, ChevronDown, ChevronUp, Info, Lightbulb, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import type { AnaliseDoPipeline as Analise, LeadItem } from '../types';

/** As cores das tags de qualificação (o servidor manda o tom). */
export const COR_DA_TAG: Record<string, string> = {
  neutro: 'bg-slate-100 text-slate-600 border-slate-200',
  azul: 'bg-blue-50 text-blue-700 border-blue-200',
  verde: 'bg-emerald-600 text-white border-emerald-700',
  esmeralda: 'bg-emerald-50 text-emerald-700 border-emerald-300',
  ambar: 'bg-amber-50 text-amber-800 border-amber-300',
  roxo: 'bg-purple-50 text-purple-700 border-purple-200',
  vermelho: 'bg-rose-50 text-rose-700 border-rose-300',
  laranja: 'bg-orange-50 text-orange-700 border-orange-300',
  ceu: 'bg-sky-50 text-sky-700 border-sky-200',
};

const ORDEM = ['precisa_voce', 'quente', 'preco', 'reuniao', 'objecao', 'respondeu', 'aguardando', 'esfriando', 'novo', 'fechado', 'perdido'];

/** Faixa com quantos leads há em cada tag; clicar filtra o quadro. */
export const FaixaDeTags: React.FC<{ leads: LeadItem[]; filtro: string; aoFiltrar: (id: string) => void }> = ({ leads, filtro, aoFiltrar }) => {
  const cont = new Map<string, { rotulo: string; tom: string; dica: string; total: number }>();
  for (const l of leads) {
    const q = l.qualificacao;
    if (!q) continue;
    const atual = cont.get(q.id);
    cont.set(q.id, { rotulo: q.rotulo, tom: q.tom, dica: q.dica, total: (atual?.total || 0) + 1 });
  }
  if (!cont.size) return null;
  const ids = Array.from(cont.keys()).sort((a, b) => ORDEM.indexOf(a) - ORDEM.indexOf(b));
  return (
    <div className="flex md:flex-wrap items-center gap-2 md:gap-1.5 mb-3 overflow-x-auto md:overflow-visible -mx-4 px-4 md:mx-0 md:px-0 pb-1 snap-x scroll-pl-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" data-testid="faixa-de-tags">
      {ids.map(id => {
        const t = cont.get(id)!;
        const ativo = filtro === id;
        return (
          <button key={id} type="button" title={t.dica} onClick={() => aoFiltrar(ativo ? '' : id)}
            className={`shrink-0 snap-start whitespace-nowrap min-h-9 md:min-h-0 text-[13px] md:text-[11px] font-bold px-3 md:px-2.5 py-1 rounded-lg border transition-all ${COR_DA_TAG[t.tom] || COR_DA_TAG.neutro} ${ativo ? 'ring-2 ring-offset-1 ring-slate-400' : 'opacity-90 hover:opacity-100'}`}>
            {t.rotulo} · {t.total}
          </button>
        );
      })}
      {filtro && <button type="button" onClick={() => aoFiltrar('')} className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 underline ml-1">limpar filtro</button>}
    </div>
  );
};

const Barra: React.FC<{ titulo: string; linhas: Analise['horario']; minimo: number }> = ({ titulo, linhas, minimo }) => {
  if (!linhas.length) return null;
  return (
    <div className="min-w-[220px] flex-1">
      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">{titulo}</p>
      <ul className="space-y-1.5">
        {linhas.map(l => (
          <li key={l.nome} className="text-xs text-slate-700">
            <div className="flex justify-between gap-2"><span className="truncate">{l.nome}</span><span className="font-bold tabular-nums">{l.taxa}% <span className="font-normal text-slate-400">({l.responderam}/{l.enviadas})</span></span></div>
            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className={`h-full rounded-full ${l.enviadas >= minimo ? 'bg-emerald-500' : 'bg-slate-300'}`} style={{ width: `${Math.max(l.taxa, 2)}%` }} /></div>
          </li>
        ))}
      </ul>
    </div>
  );
};

/** O que está funcionando e o que ajustar: taxa de resposta por horário, dia, forma de falar de valor e arte, mais as dicas. */
export const AnaliseDoPipeline: React.FC<{ iniciarFechado?: boolean }> = ({ iniciarFechado = false }) => {
  const [aberto, setAberto] = React.useState(!iniciarFechado);
  const [dados, setDados] = React.useState<Analise | null>(null);
  const [erro, setErro] = React.useState(false);
  React.useEffect(() => {
    let vivo = true;
    api.pipelineAnalise().then(d => { if (vivo) setDados(d); }).catch(() => { if (vivo) setErro(true); });
    return () => { vivo = false; };
  }, []);
  if (erro) return null;
  const alertas = (dados?.dicas || []).filter(d => d.tipo === 'alerta');
  const outras = (dados?.dicas || []).filter(d => d.tipo !== 'alerta');
  return (
    <section className="mb-3 md:mb-4 bg-white border border-slate-200 rounded-2xl md:sticky md:left-0 md:max-w-5xl" data-testid="analise-do-pipeline">
      <button type="button" onClick={() => setAberto(v => !v)} className="w-full min-h-12 flex items-center justify-between gap-3 px-4 py-3 text-left">
        <span className="flex items-center gap-2 text-[15px] md:text-sm font-bold text-slate-800 leading-tight"><BarChart3 className="w-5 h-5 md:w-4 md:h-4 text-emerald-600 shrink-0" /> O que está funcionando</span>
        <span className="flex items-center gap-3 text-xs text-slate-500 shrink-0">
          {dados && typeof dados.taxa_resposta === 'number' && <span><b className="text-slate-800">{dados.taxa_resposta}%</b> <span className="hidden sm:inline">responderam ({dados.responderam} de {dados.abordados})</span></span>}
          {aberto ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>
      {aberto && (
        <div className="px-4 pb-4 space-y-4">
          {!dados && <p className="text-xs text-slate-500 flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Lendo as conversas...</p>}
          {dados && (
            <>
              {(alertas.length > 0 || outras.length > 0) && (
                <ul className="space-y-2">
                  {[...alertas, ...outras].map((d, i) => (
                    <li key={i} className={`flex gap-2.5 text-[13px] rounded-xl border p-3 ${d.tipo === 'alerta' ? 'bg-amber-50 border-amber-200 text-amber-900' : d.tipo === 'info' ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-emerald-50 border-emerald-200 text-emerald-900'}`}>
                      {d.tipo === 'alerta' ? <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> : d.tipo === 'info' ? <Info className="w-4 h-4 shrink-0 mt-0.5" /> : <Lightbulb className="w-4 h-4 shrink-0 mt-0.5" />}
                      <span><b>{d.titulo}.</b> {d.texto}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap gap-6">
                <Barra titulo="Responde mais em qual horário" linhas={dados.horario} minimo={dados.minimo_para_concluir} />
                <Barra titulo="Dia útil ou fim de semana" linhas={dados.dia} minimo={dados.minimo_para_concluir} />
                <Barra titulo="Quando falar de valor" linhas={dados.valor} minimo={dados.minimo_para_concluir} />
                <Barra titulo="Com ou sem arte" linhas={dados.arte} minimo={dados.minimo_para_concluir} />
              </div>
              <p className="text-[11px] text-slate-400">Barras cinzas têm poucos envios (menos de {dados.minimo_para_concluir}): ainda não valem como conclusão. Horário de Brasília.</p>
            </>
          )}
        </div>
      )}
    </section>
  );
};
