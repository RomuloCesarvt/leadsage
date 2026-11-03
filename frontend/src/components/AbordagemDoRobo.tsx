/**
 * A forma de abordar: o dono escolhe entre o jeito consultivo (descobre, mostra a prévia, convida) e o comercial e atrativo,
 * que depois da prévia anuncia a promoção cadastrada aqui. O aviso sai pronto, com o preço e os itens que estiverem nesta tela:
 * o robô não inventa preço, brinde nem prazo.
 */
import React from 'react';
import { Compass, Flame, Check, Info } from 'lucide-react';
import type { PromocaoRobo } from '../types';

type Estilo = 'consultiva' | 'comercial';

const PROMOCAO_PADRAO: PromocaoRobo = {
  ativa: true,
  preco: '600',
  inclui: 'Hospedagem por 1 ano inclusa\nSem custo de domínio (o site fica em um endereço .vercel.app)\nManutenção do site inclusa',
  validade: '',
  chamada: '',
};

const campo = 'w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500';
const rotulo = 'block text-xs font-bold text-slate-600 mb-1.5';

const brl = (v: string | number) => {
  const n = Number(String(v).replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, ''));
  return n > 0 ? `R$ ${n.toLocaleString('pt-BR')}` : '';
};

export const AbordagemDoRobo: React.FC<{
  estilo?: Estilo;
  promocao?: Partial<PromocaoRobo>;
  onEstilo: (e: Estilo) => void;
  onPromocao: (p: PromocaoRobo) => void;
}> = ({ estilo = 'consultiva', promocao, onEstilo, onPromocao }) => {
  const p: PromocaoRobo = { ...PROMOCAO_PADRAO, ...(promocao || {}), ativa: promocao?.ativa ?? false };
  const set = <K extends keyof PromocaoRobo>(k: K, v: PromocaoRobo[K]) => onPromocao({ ...p, [k]: v });

  const escolher = (e: Estilo) => {
    onEstilo(e);
    // ao escolher o comercial pela primeira vez, já vem a promoção pronta para conferir e ligar
    if (e === 'comercial' && !promocao?.preco) onPromocao({ ...PROMOCAO_PADRAO, ativa: true });
  };

  const itens = p.inclui.split('\n').map(i => i.trim()).filter(Boolean);

  const Opcao: React.FC<{ id: Estilo; titulo: string; texto: string; Icone: React.FC<{ className?: string }> }> = ({ id, titulo, texto, Icone }) => (
    <button type="button" onClick={() => escolher(id)} aria-pressed={estilo === id}
      className={`text-left p-4 rounded-xl border-2 transition-colors flex gap-3 ${estilo === id ? 'border-blue-500 bg-blue-50/60' : 'border-slate-200 hover:border-slate-300'}`}>
      <Icone className={`w-5 h-5 mt-0.5 shrink-0 ${estilo === id ? 'text-blue-600' : 'text-slate-400'}`} />
      <span className="flex-1">
        <span className="block text-sm font-bold text-slate-800">{titulo}</span>
        <span className="block text-xs text-slate-500 mt-0.5 leading-relaxed">{texto}</span>
      </span>
      {estilo === id && <Check className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />}
    </button>
  );

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm" data-testid="abordagem-do-robo">
      <h2 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2"><Flame className="w-5 h-5 text-orange-500" /> Forma de abordar</h2>
      <p className="text-sm text-slate-500 mb-4">Escolha o tom das conversas. Vale para o robô e para o aviso que sai depois da prévia.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Opcao id="consultiva" Icone={Compass} titulo="Consultiva"
          texto="Entende o negócio, mostra a prévia e convida para uma conversa. Mais calma, sem anunciar preço de cara." />
        <Opcao id="comercial" Icone={Flame} titulo="Comercial e atrativa"
          texto="Depois que a prévia é enviada, anuncia a promoção com preço e o que está incluso, e conduz para o fechamento." />
      </div>

      {estilo === 'comercial' && (
        <div className="mt-5 pt-5 border-t border-slate-100 space-y-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={p.ativa} onChange={e => set('ativa', e.target.checked)} className="w-5 h-5 accent-blue-600" />
            <span className="text-sm font-bold text-slate-700">Promoção ligada</span>
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={rotulo}>Valor promocional (R$)</label>
              <input inputMode="decimal" value={p.preco} onChange={e => set('preco', e.target.value)} placeholder="Ex.: 600" className={campo} />
            </div>
            <div className="md:col-span-2">
              <label className={rotulo}>Validade (opcional)</label>
              <input value={p.validade} onChange={e => set('validade', e.target.value)} placeholder="Ex.: até 30/11. Vazio = o robô não cita prazo" className={campo} />
            </div>
            <div className="md:col-span-3">
              <label className={rotulo}>O que está incluso (um item por linha)</label>
              <textarea rows={4} value={p.inclui} onChange={e => set('inclui', e.target.value)} className={`${campo} resize-none`} />
            </div>
            <div className="md:col-span-3">
              <label className={rotulo}>Frase final do convite (opcional)</label>
              <input value={p.chamada} onChange={e => set('chamada', e.target.value)} placeholder="Vazio = “Gostou da prévia? … é só me dizer quero fechar”" className={campo} />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-orange-50/70 border border-orange-100 text-[13px] text-orange-950 leading-relaxed flex gap-2.5">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <b>Logo depois do link da prévia, o robô manda:</b>
              <div className="mt-1.5 whitespace-pre-line">
                🔥 Promoção imperdível! O site sai por apenas {brl(p.preco) || 'R$ …'}.{itens.length ? '\nJá está incluso:\n' + itens.map(i => `✅ ${i}`).join('\n') : ''}
                {p.validade ? `\nCondição válida ${p.validade}.` : ''}
              </div>
              {(!p.ativa || !brl(p.preco)) && <div className="mt-1.5 text-amber-700">Com a promoção desligada ou sem valor, o robô não anuncia nada.</div>}
              <div className="mt-1.5 text-orange-900/80">O robô só cita o que está aqui: sem “só hoje”, brinde ou prazo inventado. Quando o lead disser “quero fechar”, o checklist usa este valor.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
