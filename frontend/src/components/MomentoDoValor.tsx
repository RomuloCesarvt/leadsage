/**
 * Em que momento o robô fala de valor. É a primeira coisa do comportamento: a escolha vira instrução para a IA, que monta
 * a abordagem e as respostas de acordo. Dois momentos marcados = teste A/B (os leads são divididos entre eles) e o painel compara.
 * As garantias ("sem mensalidade", "sem pegadinha"...) só são ditas se o dono marcar que são verdadeiras.
 */
import React, { useEffect, useState } from 'react';
import { Check, Scale, ShieldCheck, FlaskConical } from 'lucide-react';
import { api, type PainelDoMomento } from '../services/api';
import type { ValorDoRobo } from '../types';

const MOMENTOS: { id: string; titulo: string; texto: string }[] = [
  { id: 'apos_gostei', titulo: 'Depois da prévia ("gostei")', texto: 'O valor só aparece depois que o lead viu o site e reagiu bem. É o jeito mais seguro.' },
  { id: 'primeira_com_valor', titulo: 'Na primeira mensagem, com o valor', texto: 'Abre com a dor do valor, apresenta a proposta justa e já cita o valor. Convida a ver o exemplo do site dele.' },
  { id: 'primeira_sem_numero', titulo: 'Na primeira mensagem, sem o número', texto: 'Mesma abertura (valor justo, sem pegadinha), mas só diz que o preço é fixo e cabe no bolso. O número vem depois.' },
  { id: 'apos_resposta', titulo: 'Depois que o lead responder', texto: 'A primeira mensagem é leve e curiosa; o assunto do valor entra na primeira resposta.' },
  { id: 'so_se_perguntar', titulo: 'Só se o lead perguntar', texto: 'O robô não puxa o assunto e responde com clareza quando perguntarem.' },
];

const GARANTIAS: { id: string; rotulo: string; detalhe?: string }[] = [
  { id: 'valor_fixo', rotulo: 'Valor fixo, sem taxa escondida' },
  { id: 'sem_mensalidade', rotulo: 'Sem mensalidade' },
  { id: 'paga_se_gostar', rotulo: 'O cliente só paga se gostar do resultado' },
  { id: 'hospedagem', rotulo: 'Hospedagem inclusa', detalhe: 'Por quanto tempo? Ex.: 1 ano' },
  { id: 'dominio', rotulo: 'Domínio incluso', detalhe: 'Ex.: .com.br no primeiro ano' },
  { id: 'alteracoes', rotulo: 'Alterações incluídas', detalhe: 'Quantas / até quando? Ex.: 2 rodadas em 30 dias' },
];

const PADRAO: ValorDoRobo = { momentos: ['apos_gostei'], garantias: {}, detalhes: {} };
const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : '—');

export const MomentoDoValor: React.FC<{ valor?: ValorDoRobo; onChange: (v: ValorDoRobo) => void }> = ({ valor, onChange }) => {
  const v: ValorDoRobo = { ...PADRAO, ...(valor || {}), momentos: valor?.momentos?.length ? valor.momentos : PADRAO.momentos };
  const [painel, setPainel] = useState<PainelDoMomento[] | null>(null);

  useEffect(() => { api.painelDoValor().then(r => setPainel(r.momentos)).catch(() => setPainel([])); }, []);

  const alternar = (id: string) => {
    const marcados = v.momentos.includes(id) ? v.momentos.filter(m => m !== id) : [...v.momentos, id].slice(-2);   // no máximo dois: o terceiro tira o mais antigo
    onChange({ ...v, momentos: marcados.length ? marcados : [id] });
  };
  const ab = v.momentos.length === 2;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm" data-testid="momento-do-valor">
      <h2 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2"><Scale className="w-5 h-5 text-blue-600" /> Quando falar de valor?</h2>
      <p className="text-sm text-slate-500 mb-4">
        A IA monta a abordagem e as respostas de acordo com o momento que você marcar. Marque <b>dois</b> para comparar: os leads são divididos entre eles e o painel mostra qual funciona melhor.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3" role="group" aria-label="Momento de falar de valor">
        {MOMENTOS.map(m => {
          const ativo = v.momentos.includes(m.id);
          const letra = ab && ativo ? (v.momentos.indexOf(m.id) === 0 ? 'A' : 'B') : '';
          return (
            <button key={m.id} type="button" aria-pressed={ativo} onClick={() => alternar(m.id)}
              className={`text-left p-4 rounded-xl border-2 transition-colors flex gap-3 ${ativo ? 'border-blue-500 bg-blue-50/60' : 'border-slate-200 hover:border-slate-300'}`}>
              <span className={`w-5 h-5 mt-0.5 shrink-0 rounded-md border-2 flex items-center justify-center ${ativo ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'}`}>
                {ativo && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
              </span>
              <span className="flex-1">
                <span className="block text-sm font-bold text-slate-800">{m.titulo}{letra && <span className="ml-2 px-1.5 py-0.5 rounded bg-blue-600 text-white text-[10px] align-middle">Grupo {letra}</span>}</span>
                <span className="block text-xs text-slate-500 mt-0.5 leading-relaxed">{m.texto}</span>
              </span>
            </button>
          );
        })}
      </div>
      {ab && (
        <p className="mt-3 text-xs text-blue-800 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 flex gap-2"><FlaskConical className="w-4 h-4 shrink-0" /> Teste A/B ligado: cada lead novo cai em um dos dois grupos (meio a meio) e fica sempre no mesmo grupo.</p>
      )}

      <div className="mt-6 pt-5 border-t border-slate-100">
        <h3 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-600" /> Garantias que são verdadeiras no seu serviço</h3>
        <p className="text-xs text-slate-500 mb-3">O robô só promete o que estiver marcado aqui. Marque apenas o que você realmente cumpre.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
          {GARANTIAS.map(g => (
            <div key={g.id}>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={!!v.garantias[g.id]} onChange={e => onChange({ ...v, garantias: { ...v.garantias, [g.id]: e.target.checked } })} className="w-4 h-4 accent-emerald-600" />
                <span className="text-sm text-slate-700">{g.rotulo}</span>
              </label>
              {g.detalhe && v.garantias[g.id] && (
                <input value={v.detalhes[g.id] || ''} maxLength={80} placeholder={g.detalhe}
                  onChange={e => onChange({ ...v, detalhes: { ...v.detalhes, [g.id]: e.target.value } })}
                  className="mt-1.5 w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500" />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 pt-5 border-t border-slate-100">
        <h3 className="text-sm font-bold text-slate-800 mb-1">Qual funciona melhor?</h3>
        {!painel?.length ? (
          <p className="text-xs text-slate-500">Ainda sem dados. Quando você enviar abordagens pelo WhatsApp, a comparação aparece aqui.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-left text-slate-500"><th className="py-1.5 pr-3 font-semibold">Momento</th><th className="px-2 font-semibold">Enviados</th><th className="px-2 font-semibold">Responderam</th><th className="px-2 font-semibold">“Gostei”</th><th className="px-2 font-semibold">Pediram para parar</th><th className="px-2 font-semibold">Pediram para fechar</th></tr></thead>
              <tbody>
                {painel.map(l => (
                  <tr key={l.momento} className="border-t border-slate-100 text-slate-700">
                    <td className="py-2 pr-3 font-semibold">{l.nome}</td>
                    <td className="px-2">{l.enviados}</td>
                    <td className="px-2">{l.responderam} <span className="text-slate-400">({pct(l.responderam, l.enviados)})</span></td>
                    <td className="px-2">{l.gostaram} <span className="text-slate-400">({pct(l.gostaram, l.enviados)})</span></td>
                    <td className="px-2">{l.pararam} <span className="text-slate-400">({pct(l.pararam, l.enviados)})</span></td>
                    <td className="px-2">{l.pediram_fechar} <span className="text-slate-400">({pct(l.pediram_fechar, l.enviados)})</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-[11px] text-slate-500">Com poucos leads por grupo (menos de uns 30) a diferença pode ser sorte. Compare quando houver mais envios.</p>
          </div>
        )}
      </div>
    </div>
  );
};
