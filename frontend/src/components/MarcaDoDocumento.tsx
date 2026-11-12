import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image as ImageIcon, Check, AlertCircle, Save, Upload, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { prepararImagem, recortarMargens } from '../lib/imagem';
import { acharTheme } from '../templates/docs/themes';
import type { MarcaDocumento } from '../templates/docs/base';

/**
 * Identidade visual que sai nas propostas e nos contratos: logo, nome, cores e contato.
 * Mora no perfil (vale para todos os documentos) e é editada num lugar só: este componente aparece em
 * Configurações → Marca e na tela de Propostas/Contratos. A prévia é o documento de verdade, não um desenho.
 */

export const PALETAS_DA_MARCA = [
  { nome: 'Azul', primaria: '#2563eb', destaque: '#f59e0b' },
  { nome: 'Grafite', primaria: '#1f2937', destaque: '#38bdf8' },
  { nome: 'Verde', primaria: '#047857', destaque: '#f97316' },
  { nome: 'Vinho', primaria: '#9f1239', destaque: '#facc15' },
  { nome: 'Roxo', primaria: '#6d28d9', destaque: '#22d3ee' },
  { nome: 'Preto e ouro', primaria: '#111827', destaque: '#d4a017' },
];

const TEXTO_PROPOSTA = `PROPOSTA COMERCIAL

Cliente: Padaria Exemplo
Validade: 15 dias

1. O QUE VAMOS ENTREGAR
• Site profissional com a sua marca
• Presença no Google e redes sociais
• Atendimento rápido no WhatsApp

2. INVESTIMENTO
Valor: R$ 1.800,00`;

const TEXTO_CONTRATO = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS

CLÁUSULA 1ª - DO OBJETO
O presente contrato tem por objeto a prestação de serviços descritos na proposta aceita pelo cliente.

CLÁUSULA 2ª - DO PRAZO
O prazo de execução é de 30 dias corridos a partir da assinatura.`;

const corValida = (c: string) => /^#[0-9a-fA-F]{6}$/.test(c);

export const MarcaDoDocumento: React.FC<{ aoSalvar?: () => void }> = ({ aoSalvar }) => {
  const { user, setUser } = useApp() as any;
  const [empresa, setEmpresa] = useState('');
  const [logo, setLogo] = useState('');
  const [primaria, setPrimaria] = useState('#2563eb');
  const [destaque, setDestaque] = useState('#f59e0b');
  const [contato, setContato] = useState('');
  const [tipo, setTipo] = useState<'proposta' | 'contrato'>('proposta');
  const [estado, setEstado] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [erro, setErro] = useState('');
  const moldura = useRef<HTMLDivElement>(null);
  const [escala, setEscala] = useState(0.4);

  useEffect(() => {
    if (!user) return;
    setEmpresa(user.company_name || user.name || '');
    setLogo(user.brand_logo || '');
    setPrimaria(user.brand_primary || '#2563eb');
    setDestaque(user.brand_accent || '#f59e0b');
    setContato(user.brand_contact || user.email || '');
  }, [user?.id, user?.brand_logo, user?.brand_primary, user?.brand_accent, user?.brand_contact, user?.company_name]); // eslint-disable-line

  useEffect(() => {
    const el = moldura.current;
    if (!el) return;
    const medir = () => setEscala(Math.max(0.2, el.clientWidth / 794));
    medir();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const marca: MarcaDocumento = useMemo(() => ({
    empresa: empresa || 'Sua Empresa', logo: logo || undefined,
    corPrimaria: corValida(primaria) ? primaria : '#2563eb', corDestaque: corValida(destaque) ? destaque : '#f59e0b',
    contato, tipo,
  }), [empresa, logo, primaria, destaque, contato, tipo]);

  const html = useMemo(
    () => acharTheme(tipo === 'contrato' ? 'juridico' : 'executivo').render(tipo === 'contrato' ? TEXTO_CONTRATO : TEXTO_PROPOSTA, marca, tipo === 'contrato' ? 'Contrato' : 'Proposta'),
    [marca, tipo],
  );

  const mudou = () => setEstado('idle');

  const enviarLogo = async (arquivo?: File) => {
    if (!arquivo) return;
    setErro('');
    try { setLogo(await prepararImagem(await recortarMargens(arquivo), { larguraMaxima: 600, tetoBytes: 200 * 1024 })); mudou(); }
    catch (e: any) { setErro(e?.message || 'Não foi possível usar esta imagem.'); setEstado('error'); }
  };

  const salvar = async () => {
    if (!corValida(primaria) || !corValida(destaque)) { setErro('Use cores no formato #RRGGBB.'); setEstado('error'); return; }
    setEstado('saving'); setErro('');
    try {
      const salvo = await api.updateProfile({
        ...user, company_name: empresa, brand_logo: logo, brand_primary: primaria, brand_accent: destaque, brand_contact: contato,
      });
      setUser(salvo);
      setEstado('saved');
      aoSalvar?.();
    } catch (e: any) { setErro(e?.message || 'Não foi possível salvar.'); setEstado('error'); }
  };

  const rotulo = 'block text-[13px] font-bold text-slate-700 mb-1.5';
  const campo = 'w-full min-h-12 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base md:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white';

  return (
    <div data-testid="marca-do-documento" className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="space-y-5 min-w-0">
        <div>
          <span className={rotulo}>Logo</span>
          <div className="flex items-center gap-3">
            <div className="w-20 h-20 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
              {logo ? <img src={logo} alt="Sua logo" className="w-full h-full object-contain p-2" /> : <ImageIcon className="w-7 h-7 text-slate-300" />}
            </div>
            <div className="min-w-0">
              <label className="inline-flex items-center gap-2 min-h-11 px-4 bg-slate-100 active:bg-slate-200 rounded-xl text-sm font-bold text-slate-700 cursor-pointer">
                <Upload className="w-4 h-4" /> {logo ? 'Trocar logo' : 'Enviar logo'}
                <input type="file" accept="image/*" className="hidden" onChange={e => { enviarLogo(e.target.files?.[0]); e.target.value = ''; }} />
              </label>
              {logo && <button type="button" onClick={() => { setLogo(''); mudou(); }} className="ml-2 min-h-11 px-2 text-sm font-semibold text-slate-500"><X className="w-4 h-4 inline" /> Tirar</button>}
              <p className="text-xs text-slate-500 mt-1.5">PNG ou JPG, de preferência com fundo transparente. Sem logo, usamos as iniciais.</p>
            </div>
          </div>
        </div>

        <div>
          <label className={rotulo} htmlFor="marca-nome">Nome que aparece nos documentos</label>
          <input id="marca-nome" className={campo} value={empresa} onChange={e => { setEmpresa(e.target.value); mudou(); }} placeholder="Ex.: Studio Aurora" />
        </div>

        <div>
          <span className={rotulo}>Cores</span>
          <div className="flex flex-wrap gap-2 mb-3">
            {PALETAS_DA_MARCA.map(p => (
              <button key={p.nome} type="button" title={p.nome} aria-label={`Paleta ${p.nome}`}
                onClick={() => { setPrimaria(p.primaria); setDestaque(p.destaque); mudou(); }}
                className={`w-11 h-11 rounded-xl border-2 overflow-hidden flex ${primaria === p.primaria ? 'border-slate-900' : 'border-transparent ring-1 ring-slate-200'}`}>
                <span className="flex-1" style={{ background: p.primaria }} /><span className="w-1/3" style={{ background: p.destaque }} />
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {([['Principal', primaria, setPrimaria], ['Destaque', destaque, setDestaque]] as const).map(([nome, valor, set]) => (
              <label key={nome} className="block text-xs font-semibold text-slate-500">
                {nome}
                <span className="mt-1 flex items-center gap-2">
                  <input type="color" value={corValida(valor) ? valor : '#000000'} onChange={e => { set(e.target.value); mudou(); }} aria-label={`Cor ${nome.toLowerCase()}`} className="w-12 h-12 rounded-xl border border-slate-200 bg-white shrink-0" />
                  <input value={valor} onChange={e => { set(e.target.value); mudou(); }} className={`${campo} font-mono !px-3`} maxLength={7} />
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className={rotulo} htmlFor="marca-contato">Contato no rodapé</label>
          <textarea id="marca-contato" rows={2} className={`${campo} resize-none`} value={contato} onChange={e => { setContato(e.target.value); mudou(); }} placeholder={'seu@email.com.br\n(00) 90000-0000'} />
          <p className="text-xs text-slate-500 mt-1">Uma informação por linha: e-mail, telefone, site.</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button type="button" onClick={salvar} disabled={estado === 'saving'} className="min-h-12 px-6 rounded-xl bg-blue-600 active:bg-blue-700 disabled:bg-blue-400 text-white font-bold text-sm flex items-center gap-2">
            {estado === 'saving' ? 'Salvando...' : <><Save className="w-4 h-4" /> Salvar marca</>}
          </button>
          {estado === 'saved' && <span className="text-sm font-semibold text-emerald-600 flex items-center gap-1.5"><Check className="w-4 h-4" /> Marca salva</span>}
          {estado === 'error' && <span className="text-sm font-semibold text-red-600 flex items-center gap-1.5"><AlertCircle className="w-4 h-4 shrink-0" /> {erro}</span>}
        </div>
      </div>

      <div className="min-w-0">
        <div className="flex items-center justify-between mb-2">
          <span className={rotulo + ' !mb-0'}>Como vai sair</span>
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5">
            {(['proposta', 'contrato'] as const).map(t => (
              <button key={t} type="button" onClick={() => setTipo(t)} aria-pressed={tipo === t}
                className={`min-h-9 px-3 rounded-md text-xs font-bold ${tipo === t ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>{t === 'proposta' ? 'Proposta' : 'Contrato'}</button>
            ))}
          </div>
        </div>
        <div ref={moldura} className="rounded-xl border border-slate-200 bg-slate-100 overflow-hidden relative" style={{ height: 1123 * escala }}>
          <iframe title="Prévia do documento com a sua marca" srcDoc={html} sandbox="" tabIndex={-1}
            style={{ width: 794, height: 1123, border: 0, background: '#fff', transform: `scale(${escala})`, transformOrigin: '0 0', pointerEvents: 'none' }} />
        </div>
      </div>
    </div>
  );
};
