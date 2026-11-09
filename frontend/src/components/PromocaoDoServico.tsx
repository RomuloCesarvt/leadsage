/**
 * Modo empresa: a promoção do SERVIÇO que a empresa vende (por exemplo, limpeza de ar-condicionado). Não há site, prévia nem hospedagem aqui.
 * O sistema monta sozinho o card com o nome do serviço, o valor e o que está incluso; o robô manda quando o cliente aceita ouvir a condição,
 * ou já na primeira mensagem, se o dono marcar. Três artes para escolher.
 */
import React, { useEffect, useState } from 'react';
import { Flame, ImageIcon, Info, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import type { PromocaoRobo } from '../types';

const campo = 'w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500';
const rotulo = 'block text-xs font-bold text-slate-600 mb-1.5';

const PADRAO: PromocaoRobo = {
  ativa: false, preco: '', inclui: 'Higienização completa\nVisita técnica sem custo\nGarantia no serviço\nAtendimento no horário combinado',
  validade: '', chamada: '', formato: 'card', card_na_abordagem: false, arte: 1, servico: '',
};

const brl = (v: string | number) => {
  const n = Number(String(v).replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, ''));
  return n > 0 ? `R$ ${n.toLocaleString('pt-BR')}` : '';
};

export const PromocaoDoServico: React.FC<{ promocao?: Partial<PromocaoRobo>; servicoPadrao: string; onPromocao: (p: PromocaoRobo) => void }> = ({ promocao, servicoPadrao, onPromocao }) => {
  const p: PromocaoRobo = { ...PADRAO, ...(promocao || {}), ativa: promocao?.ativa ?? false };
  const set = <K extends keyof PromocaoRobo>(k: K, v: PromocaoRobo[K]) => onPromocao({ ...p, [k]: v });
  const nome = (p.servico || servicoPadrao || 'Seu serviço').trim();
  const itens = p.inclui.split('\n').map(i => i.trim()).filter(Boolean);
  const precoCard = String(p.preco || '').replace(/[^\d.,]/g, '');

  const [artes, setArtes] = useState<string[]>([]);
  const [montando, setMontando] = useState(false);
  useEffect(() => {
    if (!p.ativa || !precoCard) { setArtes([]); return; }
    let vivo = true;
    const urls: string[] = [];
    setMontando(true);
    const espera = setTimeout(async () => {
      try {
        for (let a = 1; a <= 3; a++) {
          const u = await api.cardDaPromocao('servico', precoCard, 'Sua Empresa', a, { titulo: nome, itens: itens.slice(0, 4).map(i => i.slice(0, 46)).join('|') });
          urls.push(u);
          if (vivo) setArtes([...urls]); else URL.revokeObjectURL(u);
        }
      } catch { if (vivo) setArtes([]); } finally { if (vivo) setMontando(false); }
    }, 600);
    return () => { vivo = false; clearTimeout(espera); urls.forEach(u => URL.revokeObjectURL(u)); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.ativa, precoCard, nome, p.inclui]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm" data-testid="promocao-do-servico">
      <h2 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2"><Flame className="w-5 h-5 text-orange-500" /> Promoção do serviço</h2>
      <p className="text-sm text-slate-500 mb-4">Cadastre a condição especial do serviço que você vende. O sistema monta o card sozinho, com o nome do serviço, o valor e o que está incluso.</p>

      <label className="flex items-center gap-2 cursor-pointer mb-4">
        <input type="checkbox" checked={p.ativa} onChange={e => set('ativa', e.target.checked)} className="w-5 h-5 accent-blue-600" />
        <span className="text-sm font-bold text-slate-700">Promoção ligada</span>
      </label>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <label className={rotulo}>Serviço em promoção</label>
          <input value={p.servico || ''} onChange={e => set('servico', e.target.value)} maxLength={60} placeholder={servicoPadrao || 'Ex.: Limpeza de ar-condicionado'} className={campo} />
        </div>
        <div>
          <label className={rotulo}>Valor da promoção (R$)</label>
          <input inputMode="decimal" value={p.preco} onChange={e => set('preco', e.target.value)} placeholder="Ex.: 120" className={campo} />
        </div>
        <div className="md:col-span-3">
          <label className={rotulo}>O que está incluso (um item por linha; os 4 primeiros vão no card)</label>
          <textarea rows={4} value={p.inclui} onChange={e => set('inclui', e.target.value)} className={`${campo} resize-none`} />
        </div>
        <div className="md:col-span-1">
          <label className={rotulo}>Validade (opcional)</label>
          <input value={p.validade} onChange={e => set('validade', e.target.value)} placeholder="Ex.: até 30/11" className={campo} />
        </div>
        <div className="md:col-span-2">
          <label className={rotulo}>Frase final (opcional)</label>
          <input value={p.chamada} onChange={e => set('chamada', e.target.value)} placeholder="Vazio = “Posso agendar uma visita para você?”" className={campo} />
        </div>
      </div>

      {p.ativa && (
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5 mb-3"><ImageIcon className="w-4 h-4 text-blue-600" /> As artes do card (escolha uma)</span>
          <label className="flex items-start gap-2.5 cursor-pointer mb-3">
            <input type="checkbox" checked={!!p.card_na_abordagem} onChange={e => set('card_na_abordagem', e.target.checked)} className="mt-0.5 w-4 h-4 accent-blue-600" />
            <span className="text-sm text-slate-700"><b>Enviar o card já na primeira mensagem (abordagem do WhatsApp)</b> <span className="text-slate-500">— o cliente já recebe a condição; depois o robô não repete.</span></span>
          </label>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
            {artes.map((u, i) => {
              const n = (i + 1) as 1 | 2 | 3;
              const ativa = (p.arte ?? 1) === n;
              return (
                <button key={n} type="button" onClick={() => set('arte', n)} aria-pressed={ativa}
                  className={`relative rounded-xl overflow-hidden border-2 transition-colors ${ativa ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-200 hover:border-slate-300'}`}>
                  <img src={u} alt={`Arte ${n}`} className="w-full block" />
                  <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-md text-[11px] font-bold ${ativa ? 'bg-blue-600 text-white' : 'bg-white/90 text-slate-700'}`}>{ativa ? '✓ ' : ''}Arte {n}</span>
                </button>
              );
            })}
            {!artes.length && (
              <div className="w-full aspect-[4/5] rounded-xl bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-500 gap-2 col-span-full">
                {montando ? <><Loader2 className="w-4 h-4 animate-spin" /> Montando as artes…</> : 'Informe o valor para ver as artes'}
              </div>
            )}
            {montando && artes.length > 0 && <div className="flex items-center justify-center text-xs text-slate-500 gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Montando…</div>}
          </div>
        </div>
      )}

      <div className="mt-5 p-3.5 rounded-xl bg-orange-50/70 border border-orange-100 text-[13px] text-orange-950 leading-relaxed flex gap-2.5">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          <b>Quando o cliente aceitar ouvir a condição, o robô manda (junto com o card):</b>
          <div className="mt-1.5 whitespace-pre-line">
            🔥 Condição especial! {nome} por apenas {brl(p.preco) || 'R$ …'}.{itens.length ? '\nJá está incluso:\n' + itens.map(i => `✅ ${i}`).join('\n') : ''}
            {p.validade ? `\nCondição válida ${p.validade}.` : ''}
            {'\n' + (p.chamada || 'Posso agendar uma visita para você? 🙂')}
          </div>
          {(!p.ativa || !brl(p.preco)) && <div className="mt-1.5 text-amber-700">Com a promoção desligada ou sem valor, o robô não anuncia nada.</div>}
          <div className="mt-1.5 text-orange-900/80">O robô só cita o que está aqui: sem “só hoje”, brinde ou prazo inventado.</div>
        </div>
      </div>
    </div>
  );
};
