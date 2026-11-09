/**
 * A forma de abordar: o dono escolhe entre o jeito consultivo (descobre, mostra a prévia, convida) e o comercial e atrativo,
 * que depois da prévia anuncia a promoção cadastrada aqui. O aviso sai pronto, com o preço e os itens que estiverem nesta tela:
 * o robô não inventa preço, brinde nem prazo.
 */
import React, { useEffect, useState } from 'react';
import { Compass, Flame, Check, Info, ImageIcon, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import type { PromocaoRobo } from '../types';

type Estilo = 'consultiva' | 'comercial';

const PROMOCAO_PADRAO: PromocaoRobo = {
  ativa: true,
  preco: '347',
  inclui: 'Hospedagem por 1 ano inclusa\nSem custo de domínio (o site fica em um endereço .vercel.app)\nManutenção do site inclusa',
  validade: '',
  chamada: '',
  formato: 'ambos',
};

const RAMOS_DO_CARD: [string, string, string][] = [
  ['dentista', 'Dentistas', 'Sorriso Claro'], ['estetica', 'Clínicas de estética', 'Aura Estética'], ['advocacia', 'Advogados', 'Silva e Prado'],
  ['oficina', 'Oficinas mecânicas', 'Auto Center Rocha'], ['pet', 'Pet shops', 'Amigo Fiel'], ['barbearia', 'Barbearias', 'Navalha de Ouro'],
  ['academia', 'Academias', 'Força Total'], ['restaurante', 'Restaurantes', 'Sabor da Casa'], ['terapeuta', 'Terapeutas e psicólogos', 'Espaço Serena'],
  ['arquitetura', 'Arquitetos e engenheiros', 'Studio Prado'], ['padrao', 'Outros ramos', 'Sua Empresa'],
];

const FORMATOS: { id: 'previa' | 'card' | 'ambos'; titulo: string; texto: string }[] = [
  { id: 'ambos', titulo: 'Prévia + card', texto: 'Manda a prévia do site e, quando o lead gostar, a promoção com o card.' },
  { id: 'card', titulo: 'Só o card', texto: 'Sem prévia: o robô oferece a condição e manda a promoção com o card.' },
  { id: 'previa', titulo: 'Só a prévia', texto: 'Como era: prévia do site e, quando gostar, a promoção em texto.' },
];

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
  const p: PromocaoRobo = { ...PROMOCAO_PADRAO, ...(promocao || {}), ativa: promocao?.ativa ?? false, formato: promocao?.formato ?? 'previa', card_na_abordagem: promocao?.card_na_abordagem ?? false, arte: promocao?.arte ?? 1 };
  const set = <K extends keyof PromocaoRobo>(k: K, v: PromocaoRobo[K]) => onPromocao({ ...p, [k]: v });

  const escolher = (e: Estilo) => {
    onEstilo(e);
    // ao escolher o comercial pela primeira vez, já vem a promoção pronta para conferir e ligar
    if (e === 'comercial' && !promocao?.preco) onPromocao({ ...PROMOCAO_PADRAO, ativa: true });
  };

  const itens = p.inclui.split('\n').map(i => i.trim()).filter(Boolean);

  const formato = p.formato ?? 'previa';
  const comCard = formato === 'card' || formato === 'ambos';
  const [ramoCard, setRamoCard] = useState('barbearia');
  const [artes, setArtes] = useState<string[]>([]);       // as miniaturas dos estilos de arte do ramo escolhido
  const [montandoCard, setMontandoCard] = useState(false);
  const precoCard = String(p.preco || '').replace(/[^\d.,]/g, '');
  useEffect(() => {
    if (estilo !== 'comercial' || !comCard || !precoCard) { setArtes([]); return; }
    let vivo = true;
    const urls: string[] = [];
    setMontandoCard(true);
    const espera = setTimeout(async () => {
      try {
        const empresa = RAMOS_DO_CARD.find(r => r[0] === ramoCard)?.[2] || 'Sua Empresa';
        const { quantidade } = await api.artesDoCard(ramoCard);
        for (let a = 1; a <= quantidade; a++) {
          const u = await api.cardDaPromocao(ramoCard, precoCard, empresa, a);
          urls.push(u);
          if (vivo) setArtes([...urls]); else URL.revokeObjectURL(u);
        }
      } catch { if (vivo) setArtes([]); } finally { if (vivo) setMontandoCard(false); }
    }, 500);
    return () => { vivo = false; clearTimeout(espera); urls.forEach(u => URL.revokeObjectURL(u)); };
  }, [estilo, comCard, precoCard, ramoCard]);

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
              <input inputMode="decimal" value={p.preco} onChange={e => set('preco', e.target.value)} placeholder="Ex.: 347" className={campo} />
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
              <input value={p.chamada} onChange={e => set('chamada', e.target.value)} placeholder="Vazio = “Que tal uma conversa rápida para eu te mostrar como ele pode ficar ainda melhor?”" className={campo} />
            </div>
          </div>

          <div>
            <label className={rotulo}>O que acompanha a promoção</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2" role="radiogroup" aria-label="Formato da promoção">
              {FORMATOS.map(f => (
                <button key={f.id} type="button" role="radio" aria-checked={formato === f.id} onClick={() => set('formato', f.id)}
                  className={`text-left p-3 rounded-xl border-2 transition-colors ${formato === f.id ? 'border-blue-500 bg-blue-50/60' : 'border-slate-200 hover:border-slate-300'}`}>
                  <span className="block text-sm font-bold text-slate-800">{f.titulo}</span>
                  <span className="block text-xs text-slate-500 mt-0.5 leading-snug">{f.texto}</span>
                </button>
              ))}
            </div>
          </div>

          {comCard && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5"><ImageIcon className="w-4 h-4 text-blue-600" /> As artes do card (escolha uma)</span>
                <select value={ramoCard} onChange={e => setRamoCard(e.target.value)} className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg" aria-label="Ramo do exemplo">
                  {RAMOS_DO_CARD.map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
                </select>
              </div>
              <label className="flex items-start gap-2.5 cursor-pointer mb-3">
                <input type="checkbox" checked={!!p.card_na_abordagem} onChange={e => set('card_na_abordagem', e.target.checked)} className="mt-0.5 w-4 h-4 accent-blue-600" />
                <span className="text-sm text-slate-700"><b>Enviar o card já na primeira mensagem (abordagem do WhatsApp)</b> <span className="text-slate-500">— o lead já recebe a promoção com o valor; depois o robô não repete.</span></span>
              </label>
              <p className="text-xs text-slate-500 mb-3 leading-relaxed">O sistema monta sozinho um card para cada lead, com o ramo dele, o nome da empresa dele e o valor acima. Não precisa subir arquivo.</p>
              <div className={`grid gap-3 ${artes.length > 1 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 max-w-[320px] mx-auto'}`}>
                {artes.map((u, i) => {
                  const n = (i + 1) as 1 | 2 | 3 | 4 | 5;
                  const ativa = (p.arte ?? 1) === n;
                  return (
                    <button key={n} type="button" onClick={() => set('arte', n)} aria-pressed={ativa}
                      className={`relative rounded-xl overflow-hidden border-2 transition-colors ${ativa ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-200 hover:border-slate-300'}`}>
                      <img src={u} alt={`Arte ${n}`} className="w-full block" />
                      {artes.length > 1 && <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-md text-[11px] font-bold ${ativa ? 'bg-blue-600 text-white' : 'bg-white/90 text-slate-700'}`}>{ativa ? '✓ ' : ''}Arte {n}</span>}
                    </button>
                  );
                })}
                {!artes.length && (
                  <div className="w-full aspect-[4/5] rounded-xl bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-500 gap-2 col-span-full">
                    {montandoCard ? <><Loader2 className="w-4 h-4 animate-spin" /> Montando as artes…</> : 'Informe o valor para ver as artes'}
                  </div>
                )}
                {montandoCard && artes.length > 0 && <div className="flex items-center justify-center text-xs text-slate-500 gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Montando…</div>}
              </div>
            </div>
          )}

          <div className="p-3.5 rounded-xl bg-orange-50/70 border border-orange-100 text-[13px] text-orange-950 leading-relaxed flex gap-2.5">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <b>{formato === 'card' ? 'Quando o lead quiser conhecer a condição, o robô manda (junto com o card):' : 'Depois que o lead gostar da prévia, o robô manda' + (comCard ? ' (junto com o card):' : ':')}</b>
              <div className="mt-1.5 whitespace-pre-line">
                🔥 Promoção imperdível! O site sai por apenas {brl(p.preco) || 'R$ …'}.{itens.length ? '\nJá está incluso:\n' + itens.map(i => `✅ ${i}`).join('\n') : ''}
                {p.validade ? `\nCondição válida ${p.validade}.` : ''}
                {'\nLembrando que o que você viu é uma prévia, uma primeira ideia com fotos e textos de exemplo. No site de verdade entram as suas fotos e informações, e o layout, as cores e as seções podem mudar.'}
                {'\n' + (p.chamada || 'Que tal uma conversa rápida para eu te mostrar como ele pode ficar ainda melhor?')}
              </div>
              {(!p.ativa || !brl(p.preco)) && <div className="mt-1.5 text-amber-700">Com a promoção desligada ou sem valor, o robô não anuncia nada.</div>}
              <div className="mt-1.5 text-orange-900/80">O robô só cita o que está aqui: sem “só hoje”, brinde ou prazo inventado. Quando o lead disser “quero fechar”, o robô leva para uma conversa e repete este valor (a forma do fechamento você escolhe em “O que o robô vende”).</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
