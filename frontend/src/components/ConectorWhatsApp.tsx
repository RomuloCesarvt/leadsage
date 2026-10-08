/**
 * WhatsApp pelo computador do usuário (Conector + OpenWA).
 *
 * Conexão NÃO oficial: o WhatsApp pode restringir o número. A tela diz isso
 * antes de gerar a chave e só libera o botão depois do "li e entendi". A chave
 * aparece uma única vez; depois só o prefixo e o estado (online/offline).
 */
import React, { useState } from 'react';
import { AlertTriangle, Check, Copy, Download, Loader2, Unplug, Wifi, WifiOff } from 'lucide-react';
import { api } from '../services/api';
import { WhatsAppIcon } from './BrandIcons';
import type { RoboConfig } from '../types';

const ARQUIVOS = [
  { nome: 'leadsage-conector.mjs', rotulo: 'Conector' },
  { nome: 'exemplo.env', rotulo: 'Configuração' },
  { nome: 'iniciar.bat', rotulo: 'Iniciar (Windows)' },
  { nome: 'LEIA-ME.md', rotulo: 'Passo a passo' },
];

export const ConectorWhatsApp: React.FC<{ cfg: RoboConfig; aoMudar: (c: RoboConfig) => void }> = ({ cfg, aoMudar }) => {
  const [entendi, setEntendi] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [chave, setChave] = useState('');
  const [copiado, setCopiado] = useState(false);
  const [erro, setErro] = useState('');

  const gerar = async () => {
    if (cfg.conector_criado && !window.confirm('Gerar uma chave nova derruba o Conector que está rodando agora. Continuar?')) return;
    setOcupado(true);
    setErro('');
    try {
      const { chave: nova, ...resto } = await api.conectorGerar();
      setChave(nova);
      aoMudar(resto as RoboConfig);
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível gerar a chave.');
    } finally {
      setOcupado(false);
    }
  };

  const revogar = async () => {
    if (!window.confirm('Desligar o WhatsApp pelo computador? O Conector deixa de funcionar na hora.')) return;
    setErro('');
    try {
      aoMudar(await api.conectorRevogar());
      setChave('');
      setEntendi(false);
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível desligar.');
    }
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(chave);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch { /* o navegador bloqueou a área de transferência */ }
  };

  return (
    <div className="p-4 rounded-xl border border-slate-200 space-y-3">
      <div className="flex flex-wrap items-center gap-4">
        <WhatsAppIcon className="w-7 h-7 text-emerald-500" />
        <div className="flex-1 min-w-[180px]">
          <p className="font-bold text-slate-800 text-sm flex items-center gap-2">
            WhatsApp pelo computador
            <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">não oficial</span>
          </p>
          <p className="text-xs text-slate-500">
            {cfg.conector_criado
              ? cfg.conector_online
                ? <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold"><Wifi className="w-3.5 h-3.5" /> Conectado{cfg.conector_numero ? ` · ${cfg.conector_numero}` : ''}</span>
                : <span className="inline-flex items-center gap-1 text-slate-500"><WifiOff className="w-3.5 h-3.5" /> Desconectado. Abra o Conector no computador.</span>
              : 'Sem pagar API: o seu computador envia e recebe pelo seu próprio WhatsApp, e o robô do LeadSage conversa.'}
          </p>
        </div>
        {cfg.conector_criado && (
          <button onClick={revogar} className="px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 flex items-center gap-1.5">
            <Unplug className="w-3.5 h-3.5" /> Desligar
          </button>
        )}
      </div>

      {!cfg.conector_criado && (
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed flex gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Isso usa o <b>WhatsApp Web</b>, e não a API oficial da Meta. O WhatsApp pode <b>restringir ou banir o número</b>.
              Use um número secundário e não aumente o ritmo: no começo o robô envia poucas abordagens por dia,
              com intervalo entre elas, e a cada mensagem avisa que a pessoa pode responder SAIR.
            </span>
          </div>
          <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
            <input type="checkbox" checked={entendi} onChange={e => setEntendi(e.target.checked)} className="mt-0.5 accent-emerald-600" />
            <span>Li o aviso e entendo o risco para o número que eu conectar.</span>
          </label>
          <button onClick={gerar} disabled={!entendi || ocupado}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-sm font-bold flex items-center gap-2">
            {ocupado ? <Loader2 className="w-4 h-4 animate-spin" /> : <WhatsAppIcon className="w-4 h-4" />}
            Gerar chave do Conector
          </button>
        </div>
      )}

      {chave && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
          <p className="text-xs font-bold text-emerald-900">Sua chave (aparece só agora, guarde-a):</p>
          <div className="flex gap-2">
            <code className="flex-1 min-w-0 px-3 py-2 bg-white border border-emerald-200 rounded-lg text-xs text-slate-800 break-all select-all">{chave}</code>
            <button onClick={copiar} className="px-3 py-2 rounded-lg bg-white border border-emerald-200 text-xs font-bold text-emerald-800 hover:bg-emerald-100 flex items-center gap-1.5">
              {copiado ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copiado ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        </div>
      )}

      {cfg.conector_criado && (
        <div className="space-y-2">
          {!chave && <p className="text-[11px] text-slate-500">Chave {cfg.conector_prefixo}… (a chave completa só aparece ao gerar). Perdeu? Gere outra.</p>}
          <ol className="text-xs text-slate-600 list-decimal pl-5 space-y-0.5">
            <li>Instale o <b>Docker Desktop</b> e o <b>Node.js 18+</b> no computador.</li>
            <li>Baixe os arquivos abaixo numa pasta e siga o <b>Passo a passo</b>.</li>
            <li>Coloque a chave acima no arquivo <b>.env</b>, abra o Conector e escaneie o QR code com o celular.</li>
          </ol>
          <div className="flex flex-wrap gap-2">
            {ARQUIVOS.map(a => (
              <a key={a.nome} href={`/conector/${a.nome}`} download
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5" /> {a.rotulo}
              </a>
            ))}
          </div>
          <p className="text-[11px] text-slate-500">
            Hoje: <b>{cfg.conector_frio_hoje}</b> de <b>{cfg.conector_frio_limite}</b> abordagens frias permitidas. O limite sobe a cada dia de uso.
            O computador precisa ficar ligado com o Conector aberto para o robô responder.
          </p>
        </div>
      )}

      {erro && <p className="text-xs text-red-600">{erro}</p>}
    </div>
  );
};
