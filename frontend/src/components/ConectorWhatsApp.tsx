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
import { AlertTriangle, CheckCircle2, Download, Loader2, ShieldCheck, Smartphone, Unplug, Wifi, WifiOff } from 'lucide-react';
import { api } from '../services/api';
import { WhatsAppIcon } from './BrandIcons';
import { sondar } from '../lib/sondagem';
import type { RoboConfig, SaudeDoNumero } from '../types';

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

type EstadoRemoto = Awaited<ReturnType<typeof api.whatsEstado>>;

/** O que o Conector contou ao servidor: QR code, código de pareamento, online. Vale em qualquer aparelho, inclusive o celular. */
function useEstadoRemoto(ativo: boolean): EstadoRemoto | null {
  const [estado, setEstado] = useState<EstadoRemoto | null>(null);
  useEffect(() => {
    if (!ativo) { setEstado(null); return; }
    let vivo = true;
    const ler = async () => { try { const e = await api.whatsEstado(); if (vivo) setEstado(e); } catch { /* sem plano ou sem rede */ } };
    void ler();
    const parar = sondar(ler, 4000);
    return () => { vivo = false; parar(); };
  }, [ativo]);
  return estado;
}

const COR_NIVEL = {
  boa: { faixa: 'bg-emerald-500', texto: 'text-emerald-700', fundo: 'bg-emerald-50 border-emerald-200' },
  atencao: { faixa: 'bg-amber-500', texto: 'text-amber-700', fundo: 'bg-amber-50 border-amber-200' },
  risco: { faixa: 'bg-red-500', texto: 'text-red-700', fundo: 'bg-red-50 border-red-200' },
} as const;

/** Dispositivo conectado + termômetro de risco de banimento do número. */
/** Manda uma mensagem do número conectado para ele mesmo e mostra se o WhatsApp confirmou: a prova de que o envio chega de verdade. */
const TesteDeEnvio: React.FC = () => {
  const [estado, setEstado] = useState<'parado' | 'enviando' | 'ok' | 'erro'>('parado');
  const [texto, setTexto] = useState('');
  const testar = async () => {
    setEstado('enviando'); setTexto('Enviando…');
    try {
      const { id } = await api.whatsTeste();
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const s = await api.whatsTesteStatus(id);
        if (s.status === 'enviado') { setEstado('ok'); setTexto(`O WhatsApp confirmou o envio. Abra o WhatsApp do celular${s.numero ? ` (número ${s.numero})` : ''}: a mensagem de teste está na conversa com você mesmo. Se ela NÃO estiver lá, o número está com problema.`); return; }
        if (s.status === 'falhou') { setEstado('erro'); setTexto(`Não foi enviada: ${s.erro || 'o WhatsApp não confirmou'}.`); return; }
      }
      setEstado('erro'); setTexto('O serviço da nuvem não respondeu em 90 segundos. Tente de novo em instantes.');
    } catch (e: any) { setEstado('erro'); setTexto(e?.message || 'Não foi possível testar agora.'); }
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm space-y-2">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div><p className="font-bold text-slate-800">Teste de envio</p><p className="text-xs text-slate-500">Manda uma mensagem do número conectado para ele mesmo e confere se chegou.</p></div>
        <button onClick={testar} disabled={estado === 'enviando'} className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-60">
          {estado === 'enviando' ? 'Testando…' : 'Enviar mensagem de teste'}
        </button>
      </div>
      {texto && <p className={`text-xs ${estado === 'ok' ? 'text-emerald-700' : estado === 'erro' ? 'text-red-600' : 'text-slate-500'}`}>{texto}</p>}
    </div>
  );
};

const SaudeDoNumeroPainel: React.FC<{ numero: string; ativo: boolean }> = ({ numero, ativo }) => {
  const [s, setS] = useState<SaudeDoNumero | null>(null);
  const [aberto, setAberto] = useState(false);
  useEffect(() => {
    if (!ativo) return;
    let vivo = true;
    const ler = async () => { try { const r = await api.conectorSaude(); if (vivo) setS(r); } catch { /* sem plano ou sem rede */ } };
    void ler();
    const parar = sondar(ler, 60000);
    return () => { vivo = false; parar(); };
  }, [ativo]);
  const cor = COR_NIVEL[s?.nivel || 'boa'];
  return (
    <div className="space-y-2">
      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 flex items-center gap-2">
        <CheckCircle2 className="w-5 h-5 shrink-0" />
        <span><b>Dispositivo conectado</b>{numero ? ` · ${numero}` : ''}. O robô está atendendo.</span>
      </div>
      {s?.disponivel && (
        <div className={`p-3 rounded-xl border ${cor.fundo}`}>
          <button onClick={() => setAberto(!aberto)} className="w-full flex items-center gap-2 text-left">
            <ShieldCheck className={`w-5 h-5 shrink-0 ${cor.texto}`} />
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-slate-800">Saúde do número: <span className={cor.texto}>{s.rotulo}</span> <span className="text-slate-400 font-semibold">({s.pontos}/100)</span></span>
              <span className="block h-1.5 mt-1.5 rounded-full bg-white/70 overflow-hidden"><span className={`block h-full ${cor.faixa}`} style={{ width: `${s.pontos}%` }} /></span>
            </span>
            <span className="text-[11px] font-bold text-slate-500 shrink-0">{aberto ? 'Fechar' : 'Detalhes'}</span>
          </button>
          {aberto && (
            <div className="mt-3 space-y-3">
              <ul className="space-y-1">
                {(s.sinais || []).map((x, i) => (
                  <li key={i} className={`text-xs flex gap-1.5 ${x.tipo === 'risco' ? 'text-red-700' : x.tipo === 'aviso' ? 'text-amber-800' : 'text-slate-600'}`}>
                    <span aria-hidden>{x.tipo === 'ok' ? '✓' : '!'}</span><span>{x.texto}</span>
                  </li>
                ))}
              </ul>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">Como não tomar banimento</p>
                <ul className="list-disc pl-4 space-y-0.5 text-xs text-slate-600">{(s.dicas || []).map((d, i) => <li key={i}>{d}</li>)}</ul>
              </div>
              <p className="text-[11px] text-slate-400">É um termômetro feito pelo LeadSage com os sinais que mais derrubam números. O WhatsApp não publica uma nota oficial.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const noCelular = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

export const ConectorWhatsApp: React.FC<{ cfg: RoboConfig; aoMudar: (c: RoboConfig) => void; modo?: 'nuvem' | 'pc' }> = ({ cfg, aoMudar, modo = 'pc' }) => {
  const [entendi, setEntendi] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [chave, setChave] = useState('');
  const [erro, setErro] = useState('');
  // dois cartões, um por jeito de conectar; só um número fica ligado por vez, e o cartão ativo é o que está em uso
  const nuvem = modo === 'nuvem';
  const ativo = nuvem ? Boolean(cfg.nuvem) : Boolean(cfg.conector_criado && !cfg.nuvem);
  const outroAtivo = nuvem ? Boolean(cfg.conector_criado && !cfg.nuvem) : Boolean(cfg.nuvem);
  const local = useConectorLocal(ativo && !nuvem && !cfg.conector_online);
  const remoto = useEstadoRemoto(ativo);
  const [numeroParear, setNumeroParear] = useState('');
  const [pedindo, setPedindo] = useState(false);
  const [pedido, setPedido] = useState(false);
  const [demorou, setDemorou] = useState(false);
  const celular = noCelular();
  // na nuvem, o número fica conectado mesmo que a tela perca o contato por um momento: vale o que o serviço guardou
  const conectado = nuvem ? remoto?.fase === 'pronto' : cfg.conector_online && (!remoto?.fase || remoto.fase === 'pronto');
  const nuvemSemResposta = nuvem && conectado && !cfg.conector_online;
  // o QR/código que aparece aqui vem do computador (local) ou, no celular, do servidor
  const qr = local?.fase === 'qr' && local.qr ? local.qr : remoto?.fase === 'qr' && remoto.qr ? remoto.qr : '';
  const codigo = remoto?.fase === 'codigo' ? remoto.codigo || '' : '';

  // sem código depois de um tempo: o Conector do computador não está respondendo
  useEffect(() => {
    if (!pedido || codigo) { setDemorou(false); return; }
    const t = setTimeout(() => setDemorou(true), 100000);
    return () => clearTimeout(t);
  }, [pedido, codigo]);

  const parear = async () => {
    setPedindo(true);
    setErro('');
    try { await api.conectorParear(numeroParear); setPedido(true); setDemorou(false); }
    catch (e: any) { setErro(e?.message || 'Não foi possível pedir o código.'); }
    finally { setPedindo(false); }
  };

  const gerar = async () => {
    if (cfg.nuvem && !window.confirm('Usar o computador desliga o WhatsApp da nuvem (um número por vez). Continuar?')) return;
    if (!cfg.nuvem && cfg.conector_criado && !window.confirm('Gerar uma chave nova derruba o Conector que está rodando agora. Continuar?')) return;
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

  const ligarNuvem = async () => {
    if (cfg.conector_criado && !cfg.nuvem && !window.confirm('Usar a nuvem desliga o Conector do computador (um número por vez), e o número precisa ser conectado de novo. Continuar?')) return;
    setOcupado(true);
    setErro('');
    try { aoMudar(await api.nuvemLigar()); }
    catch (e: any) { setErro(e?.message || 'Não foi possível ligar a nuvem.'); }
    finally { setOcupado(false); }
  };

  const revogar = async () => {
    const aviso = nuvem
      ? 'Desconectar o WhatsApp? O número sai da nuvem e o robô para de responder. Você poderá conectar de novo quando quiser.'
      : 'Desligar o WhatsApp pelo computador? O Conector deixa de funcionar na hora.';
    if (!window.confirm(aviso)) return;
    setErro('');
    try {
      aoMudar(nuvem ? await api.nuvemDesligar() : await api.conectorRevogar());
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
            WhatsApp {nuvem ? 'na nuvem' : 'pelo computador'}
            {ativo && <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">em uso</span>}
            <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{nuvem ? 'sem computador' : 'precisa do PC ligado'}</span>
          </p>
          <p className="text-xs text-slate-500">
            {ativo
              ? conectado
                ? <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold"><Wifi className="w-3.5 h-3.5" /> Conectado{cfg.conector_numero ? ` · ${cfg.conector_numero}` : ''}</span>
                : <span className="inline-flex items-center gap-1 text-slate-500"><WifiOff className="w-3.5 h-3.5" /> {nuvem ? 'Aguardando a conexão do número.' : 'Desconectado. Abra o Conector no computador.'}</span>
              : nuvem
                ? 'Fica conectado na sua conta, em um servidor, sem nenhum aparelho ligado. Funciona no celular e no computador.'
                : 'O seu computador envia e recebe pelo seu próprio WhatsApp, e o robô do LeadSage conversa. O computador precisa ficar ligado.'}
          </p>
          {nuvem && ativo && !conectado && (
            <p className="text-[11px] text-slate-400 mt-0.5">
              {remoto
                ? `Servidor da nuvem avisou ${remoto.visto_s == null ? 'nunca' : `há ${remoto.visto_s}s`} · etapa: ${remoto.fase || 'sem informação'}${remoto.estado_s != null ? ` (gravada há ${remoto.estado_s}s)` : ''}. O QR code aparece abaixo assim que o servidor gerar.`
                : 'Lendo o estado da conexão…'}
            </p>
          )}
        </div>
        {ativo && (
          <button onClick={revogar} className="px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 flex items-center gap-1.5">
            <Unplug className="w-3.5 h-3.5" /> Desligar
          </button>
        )}
      </div>

      {!ativo && (
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed flex gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Isso usa o <b>WhatsApp Web</b>, e não a API oficial da Meta. O WhatsApp pode <b>restringir ou banir o número</b>.
              Use um número secundário e não aumente o ritmo: no começo o robô envia poucas abordagens por dia,
              de 1 a 2 minutos entre elas (com uma pausa maior de vez em quando), de segunda a sábado, das 8h às 19h. Quem pedir para parar nunca mais recebe mensagem.
            </span>
          </div>
          <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
            <input type="checkbox" checked={entendi} onChange={e => setEntendi(e.target.checked)} className="mt-0.5 accent-emerald-600" />
            <span>Li o aviso e entendo o risco para o número que eu conectar.</span>
          </label>
          {nuvem && (
            <div className="space-y-1">
              <button onClick={ligarNuvem} disabled={!entendi || ocupado}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-sm font-bold flex items-center gap-2">
                {ocupado ? <Loader2 className="w-4 h-4 animate-spin" /> : <WhatsAppIcon className="w-4 h-4" />}
                {outroAtivo ? 'Usar a nuvem' : 'Conectar pela nuvem'}
              </button>
              <p className="text-[11px] text-slate-500">O número fica conectado até você desconectar.{outroAtivo ? ' Desliga o Conector do computador (um número por vez).' : ''}</p>
            </div>
          )}
          {!nuvem && (
            <button onClick={gerar} disabled={!entendi || ocupado}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-sm font-bold flex items-center gap-2">
              {ocupado ? <Loader2 className="w-4 h-4 animate-spin" /> : <WhatsAppIcon className="w-4 h-4" />}
              {outroAtivo ? 'Usar o computador' : 'Gerar chave do Conector'}
            </button>
          )}
        </div>
      )}

      {ativo && (
        <div className="space-y-3">
          {nuvemSemResposta && (
            <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">
              O serviço da nuvem está sem responder à tela há alguns minutos. O número continua conectado e volta a atualizar sozinho. Nada precisa ser feito.
            </p>
          )}
          {conectado && <TesteDeEnvio />}
          {conectado && (
            <p className="text-xs text-slate-500 leading-relaxed">
              <b>Dica que aumenta as respostas:</b> no WhatsApp do celular, coloque uma foto (seu rosto ou o logotipo), o nome da empresa e uma descrição curta no perfil.
              Número sem foto e sem nome parece golpe, e as pessoas não respondem nem salvam o contato.
            </p>
          )}
          {conectado && <SaudeDoNumeroPainel numero={remoto?.numero || cfg.conector_numero || ''} ativo={ativo} />}
          {nuvem ? (
            <ol className="text-sm text-slate-700 list-decimal pl-5 space-y-1">
              <li>Escaneie o <b>QR code</b> que aparece aqui: no celular, WhatsApp → <b>Aparelhos conectados</b> → <b>Conectar um aparelho</b>.</li>
              <li>Só tem este celular? Use <b>conectar pelo número</b> abaixo: o WhatsApp mostra um código e você digita nele.</li>
              <li>Pronto: o número fica conectado na sua conta. Pode fechar o LeadSage e desligar o computador. Só desconecta se você clicar em <b>Desligar</b>.</li>
            </ol>
          ) : (
          <ol className="text-sm text-slate-700 list-decimal pl-5 space-y-1">
            <li>{celular ? <>No <b>computador</b> onde o WhatsApp vai ficar ligado, abra o LeadSage e baixe o arquivo de conexão.</> : <>Baixe o arquivo e <b>dê dois cliques</b> nele (no computador onde o WhatsApp vai ficar).</>}</li>
            <li>O <b>QR code aparece aqui mesmo</b>, nesta tela. No celular: WhatsApp → <b>Aparelhos conectados</b> → <b>Conectar um aparelho</b>. Só tem este celular? Use a opção <b>conectar pelo número</b> abaixo.</li>
            <li>Pronto. Esta tela passa a mostrar <b>Conectado</b>. Deixe a janela preta aberta.</li>
          </ol>
          )}
          {qr && (
            <div className="p-4 rounded-xl bg-white border border-emerald-200 flex flex-col items-center gap-2 text-center">
              <img src={qr} alt="QR code do WhatsApp" className="w-56 h-56" />
              <p className="text-xs text-slate-600">No celular: WhatsApp → <b>Aparelhos conectados</b> → <b>Conectar um aparelho</b> e aponte para o código.</p>
            </div>
          )}
          {local && local.fase !== 'qr' && local.fase !== 'pronto' && (
            <p className="text-xs text-slate-600 flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> {local.mensagem}</p>
          )}
          {codigo && (
            <div className="p-4 rounded-xl bg-white border border-emerald-200 text-center space-y-1">
              <p className="text-xs text-slate-600">Digite este código no WhatsApp deste celular:</p>
              <p className="text-3xl font-mono font-black tracking-widest text-emerald-700 select-all">{codigo}</p>
              <p className="text-[11px] text-slate-500">WhatsApp → <b>Aparelhos conectados</b> → <b>Conectar um aparelho</b> → <b>Conectar com número de telefone</b>.</p>
            </div>
          )}
          {!conectado && !remoto?.codigo && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5"><Smartphone className="w-3.5 h-3.5" /> Conectar pelo número (sem escanear)</p>
              <p className="text-[11px] text-slate-500">Para quem só tem o celular na mão: o WhatsApp devolve um código de 8 caracteres e você digita nele.{nuvem ? '' : ' O Conector continua rodando no computador.'}</p>
              <div className="flex gap-2">
                <input value={numeroParear} onChange={e => setNumeroParear(e.target.value)} inputMode="tel" placeholder="(14) 99999-9999" aria-label="Número do WhatsApp"
                  className="flex-1 min-w-0 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500" />
                <button onClick={parear} disabled={pedindo || numeroParear.replace(/\D/g, '').length < 10}
                  className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 disabled:opacity-40 text-white text-xs font-bold">
                  {pedindo ? '…' : 'Pedir código'}
                </button>
              </div>
              {pedido && demorou && !codigo && (
                <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">
                  {nuvem
                    ? 'O código não veio. Confira o número (com DDD) e se ele tem WhatsApp, e peça de novo. Se continuar, o serviço da nuvem pode estar fora do ar.'
                    : 'O código não veio. Quem responde ao pedido é o Conector no computador: confira se o computador está ligado (e não em repouso), se a janela do Conector está aberta e se o número tem WhatsApp. Depois peça de novo.'}
                </p>
              )}
              {pedido && !demorou && <p className="text-[11px] text-emerald-700">Pedido enviado. O código aparece aqui em instantes (com o Conector aberto no computador, pode levar até 1 minuto).</p>}
            </div>
          )}
          {nuvem ? null : celular ? (
            <p className="text-xs text-slate-500">O arquivo do Conector é para Windows: baixe-o no computador. Depois, daqui do celular você vê as conversas, responde, dispara e o robô atende.</p>
          ) : chave ? (
            <button onClick={() => baixar('Conectar-WhatsApp.bat', arquivoDoConector(chave, window.location.origin))}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center gap-2">
              <Download className="w-4 h-4" /> Baixar Conectar-WhatsApp.bat
            </button>
          ) : (
            <p className="text-xs text-slate-500">
              O arquivo leva a sua chave ({cfg.conector_prefixo}…), que só aparece ao gerar. Para baixar de novo, gere outra chave.
            </p>
          )}
          {!nuvem && <p className="text-[11px] text-slate-500 leading-relaxed">
            Na primeira vez ele instala o que falta (cerca de 1 minuto) e usa o Edge ou o Chrome que você já tem. Se o Windows avisar
            “protegeu o computador”, clique em <b>Mais informações → Executar assim mesmo</b>. Só para Windows por enquanto.
            Se o QR não aparecer aqui (alguns navegadores bloqueiam), <a className="text-blue-600 hover:underline" href={PAGINA_LOCAL} target="_blank" rel="noreferrer">abra a página do Conector</a>.
          </p>}
          <p className="text-[11px] text-slate-500">
            Hoje: <b>{cfg.conector_frio_hoje}</b> de <b>{cfg.conector_frio_limite}</b> abordagens frias permitidas (o limite sobe a cada dia).
            {nuvem ? 'O robô responde 24 horas, sem computador ligado.' : 'O computador precisa ficar ligado com o Conector aberto para o robô responder.'}
          </p>
        </div>
      )}

      {erro && <p className="text-xs text-red-600">{erro}</p>}
    </div>
  );
};
