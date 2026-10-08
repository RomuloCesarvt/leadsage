/**
 * WhatsApp pelo computador do usuário (Conector).
 *
 * Conexão NÃO oficial: o WhatsApp pode restringir o número. A tela diz isso
 * antes de gerar a chave e só libera o botão depois do "li e entendi".
 *
 * O caminho do usuário é um arquivo só: o .bat já leva a chave dentro, instala o
 * que falta, baixa o Conector e abre a página do QR code. A chave aparece uma
 * única vez; depois só o prefixo e o estado (online/offline).
 */
import React, { useEffect, useState } from 'react';
import { AlertTriangle, Download, Loader2, Unplug, Wifi, WifiOff } from 'lucide-react';
import { api } from '../services/api';
import { WhatsAppIcon } from './BrandIcons';
import { sondar } from '../lib/sondagem';
import type { RoboConfig } from '../types';

/** O arquivo que o usuário baixa: leva a chave, instala o que falta e abre o Conector. */
export function arquivoDoConector(chave: string, site: string): string {
  const linhas = [
    '@echo off',
    'chcp 65001 >nul',
    'title LeadSage - WhatsApp pelo computador',
    'setlocal',
    `set "SITE=${site}"`,
    'set "PASTA=%LOCALAPPDATA%\\LeadSageConector"',
    'if not exist "%PASTA%" mkdir "%PASTA%"',
    'cd /d "%PASTA%"',
    `> config.json echo {"chave":"${chave}","site":"${site}"}`,
    'set "TEM_NODE="',
    'where node >nul 2>nul && set "TEM_NODE=1"',
    'if not defined TEM_NODE if exist "%ProgramFiles%\\nodejs\\node.exe" set "PATH=%ProgramFiles%\\nodejs;%PATH%" & set "TEM_NODE=1"',
    'if not defined TEM_NODE (',
    '  echo Instalando o Node.js, so na primeira vez...',
    '  winget install -e --id OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements',
    '  if exist "%ProgramFiles%\\nodejs\\node.exe" set "PATH=%ProgramFiles%\\nodejs;%PATH%" & set "TEM_NODE=1"',
    ')',
    'if not defined TEM_NODE (',
    '  echo Nao consegui instalar o Node.js sozinho. Vou abrir a pagina de download; instale e abra este arquivo de novo.',
    '  start https://nodejs.org/pt',
    '  pause',
    '  exit /b 1',
    ')',
    'echo Baixando o Conector...',
    `powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; foreach($f in 'package.json','leadsage-conector.mjs'){ Invoke-WebRequest -UseBasicParsing ('%SITE%/conector/'+$f) -OutFile $f }"`,
    'if errorlevel 1 (',
    '  echo Nao consegui baixar o Conector. Confira a internet e tente de novo.',
    '  pause',
    '  exit /b 1',
    ')',
    'if not exist node_modules\\whatsapp-web.js (',
    '  echo Instalando os componentes, so na primeira vez. Pode levar 1 minuto...',
    '  set "PUPPETEER_SKIP_DOWNLOAD=true"',
    '  call npm install --omit=dev --no-audit --no-fund',
    '  if errorlevel 1 (',
    '    echo A instalacao falhou. Tente de novo.',
    '    pause',
    '    exit /b 1',
    '  )',
    ')',
    'echo Abrindo o Conector. Uma pagina com o QR code vai abrir. Deixe esta janela aberta.',
    'node leadsage-conector.mjs',
    'pause',
  ];
  return linhas.join('\r\n') + '\r\n';
}

function baixar(nome: string, conteudo: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: 'application/octet-stream' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const PAGINA_LOCAL = 'http://127.0.0.1:2790';

type EstadoLocal = { fase: string; qr: string; mensagem: string; numero: string };

/** O que o Conector do computador está mostrando (QR code, conectado...), lido da página local dele. */
function useConectorLocal(ativo: boolean): EstadoLocal | null {
  const [estado, setEstado] = useState<EstadoLocal | null>(null);
  useEffect(() => {
    if (!ativo) { setEstado(null); return; }
    let vivo = true;
    const ler = async () => {
      try {
        const r = await fetch(`${PAGINA_LOCAL}/estado`, { cache: 'no-store' });
        if (vivo && r.ok) setEstado(await r.json());
      } catch {
        if (vivo) setEstado(null); // Conector fechado, ou o navegador bloqueou o acesso local
      }
    };
    void ler();
    const parar = sondar(ler, 2500);
    return () => { vivo = false; parar(); };
  }, [ativo]);
  return estado;
}

export const ConectorWhatsApp: React.FC<{ cfg: RoboConfig; aoMudar: (c: RoboConfig) => void }> = ({ cfg, aoMudar }) => {
  const [entendi, setEntendi] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [chave, setChave] = useState('');
  const [erro, setErro] = useState('');
  const local = useConectorLocal(cfg.conector_criado && !cfg.conector_online);

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

      {cfg.conector_criado && (
        <div className="space-y-3">
          <ol className="text-sm text-slate-700 list-decimal pl-5 space-y-1">
            <li>Baixe o arquivo e <b>dê dois cliques</b> nele (no computador onde o WhatsApp vai ficar).</li>
            <li>O <b>QR code aparece aqui mesmo</b>, nesta tela. No celular: WhatsApp → <b>Aparelhos conectados</b> → <b>Conectar um aparelho</b>.</li>
            <li>Pronto. Esta tela passa a mostrar <b>Conectado</b>. Deixe a janela preta aberta.</li>
          </ol>
          {local?.fase === 'qr' && local.qr && (
            <div className="p-4 rounded-xl bg-white border border-emerald-200 flex flex-col items-center gap-2 text-center">
              <img src={local.qr} alt="QR code do WhatsApp" className="w-56 h-56" />
              <p className="text-xs text-slate-600">No celular: WhatsApp → <b>Aparelhos conectados</b> → <b>Conectar um aparelho</b> e aponte para o código.</p>
            </div>
          )}
          {local && local.fase !== 'qr' && local.fase !== 'pronto' && (
            <p className="text-xs text-slate-600 flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> {local.mensagem}</p>
          )}
          {chave ? (
            <button onClick={() => baixar('Conectar-WhatsApp.bat', arquivoDoConector(chave, window.location.origin))}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center gap-2">
              <Download className="w-4 h-4" /> Baixar Conectar-WhatsApp.bat
            </button>
          ) : (
            <p className="text-xs text-slate-500">
              O arquivo leva a sua chave ({cfg.conector_prefixo}…), que só aparece ao gerar. Para baixar de novo, gere outra chave.
            </p>
          )}
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Na primeira vez ele instala o que falta (cerca de 1 minuto) e usa o Edge ou o Chrome que você já tem. Se o Windows avisar
            “protegeu o computador”, clique em <b>Mais informações → Executar assim mesmo</b>. Só para Windows por enquanto.
            Se o QR não aparecer aqui (alguns navegadores bloqueiam), <a className="text-blue-600 hover:underline" href={PAGINA_LOCAL} target="_blank" rel="noreferrer">abra a página do Conector</a>.
          </p>
          <p className="text-[11px] text-slate-500">
            Hoje: <b>{cfg.conector_frio_hoje}</b> de <b>{cfg.conector_frio_limite}</b> abordagens frias permitidas (o limite sobe a cada dia).
            O computador precisa ficar ligado com o Conector aberto para o robô responder.
          </p>
        </div>
      )}

      {erro && <p className="text-xs text-red-600">{erro}</p>}
    </div>
  );
};
