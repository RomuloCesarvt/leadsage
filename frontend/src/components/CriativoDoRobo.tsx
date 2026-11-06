/**
 * O criativo do dono: um flyer, card ou PDF de promoção. O robô manda junto com o aviso da promoção (ou com o orçamento, no modo empresa),
 * a abordagem do WhatsApp pode levá-lo na primeira mensagem, e na conversa há um botão para enviar na hora.
 * Imagens grandes são reduzidas aqui antes de subir (o WhatsApp comprime de qualquer jeito); PDF vai como está, até 3 MB.
 */
import React, { useEffect, useRef, useState } from 'react';
import { FileText, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { api, type CriativoInfo } from '../services/api';

const MAX_PDF = 3_000_000;

const lerComoDataUrl = (arquivo: Blob): Promise<string> =>
  new Promise((ok, falha) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = () => falha(new Error('Não consegui ler o arquivo.')); r.readAsDataURL(arquivo); });

/** Reduz a imagem para no máximo 1600 px no lado maior e a regrava em JPEG/PNG leve, para caber no limite e subir rápido. */
const prepararImagem = async (arquivo: File): Promise<{ dados: string; mime: string }> => {
  const original = await lerComoDataUrl(arquivo);
  const img = await new Promise<HTMLImageElement>((ok, falha) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => falha(new Error('Imagem inválida.')); i.src = original; });
  const escala = Math.min(1, 1600 / Math.max(img.width, img.height));
  if (escala === 1 && arquivo.size <= 1_500_000) return { dados: original, mime: arquivo.type };
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * escala); c.height = Math.round(img.height * escala);
  const ctx = c.getContext('2d');
  if (!ctx) return { dados: original, mime: arquivo.type };
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return { dados: c.toDataURL('image/jpeg', 0.86), mime: 'image/jpeg' };
};

export const CriativoDoRobo: React.FC<{ empresa?: boolean; contexto?: 'disparo' | 'robo' }> = ({ empresa, contexto = 'disparo' }) => {
  const [c, setC] = useState<CriativoInfo | null>(null);
  const [legenda, setLegenda] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const entrada = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let vivo = true;
    api.criativoVer().then(r => { if (vivo) { setC(r); setLegenda(r.legenda || ''); } }).catch(() => { if (vivo) setC({ existe: false }); });
    return () => { vivo = false; };
  }, []);

  const subir = async (arquivo?: File | null) => {
    if (!arquivo) return;
    setErro(''); setOcupado(true);
    try {
      const ehPdf = arquivo.type === 'application/pdf';
      if (!ehPdf && !arquivo.type.startsWith('image/')) throw new Error('Use uma imagem (JPG, PNG, WEBP) ou um PDF.');
      if (ehPdf && arquivo.size > MAX_PDF) throw new Error('O PDF passa de 3 MB. Comprima e tente de novo.');
      const { dados, mime } = ehPdf ? { dados: await lerComoDataUrl(arquivo), mime: 'application/pdf' } : await prepararImagem(arquivo);
      const salvo = await api.criativoSalvar({ nome: arquivo.name, mime, dados, legenda, usos: c?.usos ?? { abordagem: contexto === 'disparo', promocao: true } });
      setC(salvo);
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível salvar o criativo.');
    } finally {
      setOcupado(false);
      if (entrada.current) entrada.current.value = '';
    }
  };

  const opcao = async (p: { legenda?: string; usos?: Record<string, boolean> }) => {
    try { setC(await api.criativoOpcoes(p)); } catch (e: any) { setErro(e?.message || 'Não foi possível salvar.'); }
  };

  const remover = async () => {
    if (!window.confirm('Remover o criativo? O robô deixa de enviá-lo.')) return;
    setOcupado(true);
    try { setC(await api.criativoRemover()); setLegenda(''); } catch (e: any) { setErro(e?.message || 'Não foi possível remover.'); } finally { setOcupado(false); }
  };

  const existe = !!c?.existe;
  const ehPdf = c?.mime === 'application/pdf';

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-1"><ImagePlus className="w-5 h-5 text-blue-600" /> Criativo do disparo</h2>
      <p className="text-sm text-slate-500 mb-4">
        Coloque aqui o flyer, card ou PDF{empresa ? ' da sua promoção' : ''}. O sistema envia sozinho junto com cada mensagem de WhatsApp do disparo (a mensagem vira a legenda), sem você fazer mais nada. O robô também o manda junto com {empresa ? 'o orçamento' : 'o aviso da promoção'}.
      </p>

      {!existe ? (
        <button type="button" onClick={() => entrada.current?.click()} disabled={ocupado}
          className="w-full border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/40 rounded-2xl py-8 flex flex-col items-center gap-2 text-slate-500 transition-colors disabled:opacity-60">
          {ocupado ? <Loader2 className="w-6 h-6 animate-spin" /> : <ImagePlus className="w-6 h-6" />}
          <span className="text-sm font-bold">{ocupado ? 'Enviando…' : 'Escolher imagem ou PDF'}</span>
          <span className="text-xs">JPG, PNG, WEBP ou PDF, até 3 MB</span>
        </button>
      ) : (
        <div className="flex gap-4 items-start">
          <div className="w-28 h-28 shrink-0 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center">
            {ehPdf ? <FileText className="w-10 h-10 text-slate-400" /> : <img src={c?.url} alt="Criativo" className="w-full h-full object-cover" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-800 truncate">{c?.nome}</p>
            <p className="text-xs text-slate-500 mb-3">{Math.round((c?.bytes || 0) / 1024)} KB</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => entrada.current?.click()} disabled={ocupado} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-60">Trocar</button>
              <button type="button" onClick={remover} disabled={ocupado} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 hover:bg-red-100 text-red-600 flex items-center gap-1 disabled:opacity-60"><Trash2 className="w-3.5 h-3.5" /> Remover</button>
            </div>
          </div>
        </div>
      )}
      <input ref={entrada} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={e => subir(e.target.files?.[0])} />

      {existe && (
        <div className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Legenda (o texto que vai junto, quando você envia na conversa)</label>
            <textarea value={legenda} onChange={e => setLegenda(e.target.value)} onBlur={() => legenda !== (c?.legenda || '') && opcao({ legenda })} rows={2} maxLength={600}
              placeholder="Ex.: Limpeza de ar-condicionado por R$ 120 até sexta! Chama aqui para agendar."
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500" />
          </div>
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input type="checkbox" checked={!!c?.usos?.promocao} onChange={e => opcao({ usos: { promocao: e.target.checked } })} className="mt-0.5 w-4 h-4 accent-blue-600" />
            <span className="text-sm text-slate-700"><b>O robô envia junto com {empresa ? 'o orçamento' : 'o aviso da promoção'}</b> <span className="text-slate-500">(uma vez por conversa, quando o lead responde)</span></span>
          </label>
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input type="checkbox" checked={!!c?.usos?.abordagem} onChange={e => opcao({ usos: { abordagem: e.target.checked } })} className="mt-0.5 w-4 h-4 accent-blue-600" />
            <span className="text-sm text-slate-700"><b>Enviar junto com cada mensagem do disparo no WhatsApp</b> <span className="text-slate-500">(sai pelo Conector, no ritmo de sempre)</span></span>
          </label>
        </div>
      )}
      {erro && <p className="mt-3 text-sm text-red-600">{erro}</p>}
    </div>
  );
};
