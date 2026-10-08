/**
 * Conectar Facebook, Instagram e WhatsApp com um clique.
 *
 * Facebook e Instagram vão pelo login do Facebook: a página escolhida
 * traz junto o Instagram profissional ligado a ela. O WhatsApp vai pelo
 * cadastro guiado da própria Meta (Embedded Signup), que abre numa
 * janela da Meta, cria ou escolhe a conta e o número, e devolve os ids.
 *
 * Nenhum token passa por aqui: a tela recebe só nomes e ids, e o servidor
 * guarda o resto.
 */
import React, { useEffect, useState } from 'react';
import { Check, Loader2, Unplug, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';
import { WhatsAppIcon, InstagramIcon, FacebookIcon, TelegramIcon } from './BrandIcons';
import { ConectorWhatsApp } from './ConectorWhatsApp';
import type { RoboConfig } from '../types';

type Disponivel = { facebook: boolean; whatsapp: boolean; app_id: string; wa_config_id: string };

declare global {
  interface Window { FB?: any; fbAsyncInit?: () => void }
}

/** Carrega o SDK do Facebook uma vez só, sob demanda. */
let sdk: Promise<any> | null = null;
const carregarSdk = (appId: string): Promise<any> => {
  if (sdk) return sdk;
  sdk = new Promise((resolve, reject) => {
    window.fbAsyncInit = () => {
      window.FB.init({ appId, version: 'v21.0', xfbml: false, cookie: false });
      resolve(window.FB);
    };
    const s = document.createElement('script');
    s.src = 'https://connect.facebook.net/pt_BR/sdk.js';
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.onerror = () => { sdk = null; reject(new Error('Não foi possível carregar o Facebook. Um bloqueador de anúncios pode estar impedindo.')); };
    document.body.appendChild(s);
  });
  return sdk;
};

/**
 * Abre o cadastro guiado do WhatsApp e espera os ids e o code.
 *
 * Os ids (conta e número) chegam por mensagem da janela da Meta; o code,
 * pelo retorno do login. Os dois precisam chegar para concluir.
 */
const cadastrarWhatsApp = async (appId: string, configId: string) => {
  const FB = await carregarSdk(appId);
  return await new Promise<{ code: string; waba_id: string; phone_number_id: string }>((resolve, reject) => {
    let ids: { waba_id: string; phone_number_id: string } | null = null;
    let code = '';
    const talvezTermine = () => {
      if (ids && code) { window.removeEventListener('message', ouvir); resolve({ code, ...ids }); }
    };
    const ouvir = (ev: MessageEvent) => {
      if (!/facebook\.com$/.test(new URL(ev.origin).hostname)) return;
      try {
        const dados = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data;
        if (dados?.type !== 'WA_EMBEDDED_SIGNUP') return;
        if (dados.event === 'FINISH' || dados.event === 'FINISH_ONLY_WABA') {
          ids = { waba_id: dados.data?.waba_id || '', phone_number_id: dados.data?.phone_number_id || '' };
          if (!ids.phone_number_id) {
            window.removeEventListener('message', ouvir);
            reject(new Error('A conta foi criada, mas nenhum número foi escolhido. Conecte de novo e selecione o número.'));
            return;
          }
          talvezTermine();
        } else if (dados.event === 'CANCEL') {
          window.removeEventListener('message', ouvir);
          reject(new Error('Cadastro do WhatsApp cancelado.'));
        }
      } catch { /* mensagem de outra coisa da janela */ }
    };
    window.addEventListener('message', ouvir);

    FB.login((resposta: any) => {
      code = resposta?.authResponse?.code || '';
      if (!code) {
        window.removeEventListener('message', ouvir);
        reject(new Error('O login com a Meta não foi concluído.'));
        return;
      }
      talvezTermine();
    }, {
      config_id: configId,
      response_type: 'code',
      override_default_response_type: true,
      extras: { setup: {}, featureType: '', sessionInfoVersion: '3' },
    });
  });
};

export const ConexaoMeta: React.FC<{ cfg: RoboConfig; aoMudar: (c: RoboConfig) => void }> = ({ cfg, aoMudar }) => {
  const [disp, setDisp] = useState<Disponivel | null>(null);
  const [ocupado, setOcupado] = useState<'' | 'facebook' | 'whatsapp' | 'pagina' | 'telegram'>('');
  const [tokenTg, setTokenTg] = useState('');
  const [erro, setErro] = useState('');

  useEffect(() => {
    api.metaDisponivel().then(setDisp).catch(() => setDisp({ facebook: false, whatsapp: false, app_id: '', wa_config_id: '' }));
  }, []);

  const conectarFacebook = async () => {
    setOcupado('facebook');
    setErro('');
    try {
      const { url } = await api.metaConectar();
      // Sai do app para o Facebook; o retorno volta em ?tela=robo&meta=...
      window.location.href = url;
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível iniciar a conexão.');
      setOcupado('');
    }
  };

  const escolher = async (id: string) => {
    setOcupado('pagina');
    setErro('');
    try { aoMudar(await api.metaEscolherPagina(id)); }
    catch (e: any) { setErro(e?.message || 'Não foi possível conectar esta página.'); }
    finally { setOcupado(''); }
  };

  const conectarWhatsApp = async () => {
    if (!disp) return;
    setOcupado('whatsapp');
    setErro('');
    try {
      const r = await cadastrarWhatsApp(disp.app_id, disp.wa_config_id);
      aoMudar(await api.metaWhatsApp(r.code, r.waba_id, r.phone_number_id));
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível conectar o WhatsApp.');
    } finally {
      setOcupado('');
    }
  };

  const conectarTelegram = async () => {
    setOcupado('telegram');
    setErro('');
    try {
      aoMudar(await api.telegramConectar(tokenTg.trim()));
      setTokenTg('');
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível conectar o bot.');
    } finally {
      setOcupado('');
    }
  };

  const desconectarTelegram = async () => {
    if (!window.confirm('Desconectar o bot do Telegram? O robô para de responder por ele.')) return;
    setErro('');
    try { aoMudar(await api.telegramDesconectar()); }
    catch (e: any) { setErro(e?.message || 'Não foi possível desconectar.'); }
  };

  const desconectar = async (alvo: 'facebook' | 'whatsapp') => {
    if (!window.confirm(alvo === 'facebook'
      ? 'Desconectar a página e o Instagram? O robô para de responder por eles.'
      : 'Desconectar o WhatsApp? O robô para de responder por ele.')) return;
    setErro('');
    try { aoMudar(await api.metaDesconectar(alvo)); }
    catch (e: any) { setErro(e?.message || 'Não foi possível desconectar.'); }
  };

  if (!disp) return null;

  const fbConectado = cfg.meta_pronto && cfg.modo === 'app';
  const waConectado = cfg.whatsapp_pronto && cfg.modo === 'app';

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <h2 className="text-lg font-bold text-slate-800 mb-1">Conectar canais</h2>
      <p className="text-sm text-slate-500 mb-5">Entre com a conta da sua empresa. Não precisa criar nada na Meta.</p>

      {!disp.facebook && (
        <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-100 text-sm text-amber-800 flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          A conexão com um clique ainda não foi ativada no sistema. Enquanto isso, use o modo avançado abaixo.
        </div>
      )}

      <div className="space-y-3">
        {/* Facebook + Instagram */}
        <div className="p-4 rounded-xl border border-slate-200 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5"><FacebookIcon className="w-7 h-7" /><InstagramIcon className="w-7 h-7" /></div>
          <div className="flex-1 min-w-[160px]">
            <p className="font-bold text-slate-800 text-sm">Messenger e Instagram</p>
            <p className="text-xs text-slate-500">
              {fbConectado
                ? <>Conectado: <b>{cfg.page_nome}</b>{cfg.ig_usuario ? <> · @{cfg.ig_usuario}</> : <> · sem Instagram ligado à página</>}</>
                : 'A página do Facebook e o Instagram profissional ligado a ela'}
            </p>
          </div>
          {fbConectado ? (
            <button onClick={() => desconectar('facebook')} className="px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 flex items-center gap-1.5">
              <Unplug className="w-3.5 h-3.5" /> Desconectar
            </button>
          ) : (
            <button onClick={conectarFacebook} disabled={!disp.facebook || !!ocupado}
              className="px-4 py-2.5 rounded-xl bg-[#1877F2] hover:bg-[#166FE5] disabled:opacity-40 text-white text-sm font-bold flex items-center gap-2">
              {ocupado === 'facebook' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FacebookIcon className="w-4 h-4" />}
              Conectar com Facebook
            </button>
          )}
        </div>

        {cfg.paginas_pendentes?.length > 0 && (
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50">
            <p className="text-sm font-bold text-slate-800 mb-2">Qual página o robô deve atender?</p>
            <div className="space-y-2">
              {cfg.paginas_pendentes.map(p => (
                <button key={p.id} onClick={() => escolher(p.id)} disabled={!!ocupado}
                  className="w-full text-left px-3 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-blue-400 text-sm flex items-center justify-between disabled:opacity-50">
                  <span><b>{p.nome}</b>{p.ig_usuario && <span className="text-slate-500"> · @{p.ig_usuario}</span>}</span>
                  {ocupado === 'pagina' ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> : <Check className="w-4 h-4 text-slate-300" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* WhatsApp */}
        <div className="p-4 rounded-xl border border-slate-200 flex flex-wrap items-center gap-4">
          <WhatsAppIcon className="w-7 h-7" />
          <div className="flex-1 min-w-[160px]">
            <p className="font-bold text-slate-800 text-sm">WhatsApp</p>
            <p className="text-xs text-slate-500">
              {waConectado ? <>Conectado · número {cfg.wa_phone_id}</> : 'Número de WhatsApp Business da sua empresa'}
            </p>
          </div>
          {waConectado ? (
            <button onClick={() => desconectar('whatsapp')} className="px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 flex items-center gap-1.5">
              <Unplug className="w-3.5 h-3.5" /> Desconectar
            </button>
          ) : (
            <button onClick={conectarWhatsApp} disabled={!disp.whatsapp || !!ocupado}
              className="px-4 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#1EBE5A] disabled:opacity-40 text-white text-sm font-bold flex items-center gap-2">
              {ocupado === 'whatsapp' ? <Loader2 className="w-4 h-4 animate-spin" /> : <WhatsAppIcon className="w-4 h-4" />}
              Conectar WhatsApp
            </button>
          )}
        </div>

        {/* Telegram */}
        <div className="p-4 rounded-xl border border-slate-200 space-y-3">
          <div className="flex flex-wrap items-center gap-4">
            <TelegramIcon className="w-7 h-7 text-[#26A5E4]" />
            <div className="flex-1 min-w-[160px]">
              <p className="font-bold text-slate-800 text-sm">Telegram</p>
              <p className="text-xs text-slate-500">
                {cfg.telegram_pronto
                  ? <>Conectado: <b>@{cfg.tg_username}</b> · <a className="text-blue-600 hover:underline" href={`https://t.me/${cfg.tg_username}`} target="_blank" rel="noreferrer">t.me/{cfg.tg_username}</a></>
                  : 'O robô atende no bot da sua empresa. Quem aperta Iniciar já conversa com ele.'}
              </p>
            </div>
            {cfg.telegram_pronto && (
              <button onClick={desconectarTelegram} className="px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 flex items-center gap-1.5">
                <Unplug className="w-3.5 h-3.5" /> Desconectar
              </button>
            )}
          </div>
          {!cfg.telegram_pronto && (
            <div className="space-y-2">
              <ol className="text-xs text-slate-600 list-decimal pl-5 space-y-0.5">
                <li>No Telegram, abra o <b>@BotFather</b> e mande <b>/newbot</b>.</li>
                <li>Escolha o nome e o usuário do bot. Ele devolve um token.</li>
                <li>Cole o token abaixo.</li>
              </ol>
              <div className="flex flex-wrap gap-2">
                <input
                  type="password" autoComplete="off" value={tokenTg} onChange={e => setTokenTg(e.target.value)}
                  placeholder="123456789:AAE…"
                  className="flex-1 min-w-[200px] px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
                <button onClick={conectarTelegram} disabled={!tokenTg.trim() || !!ocupado}
                  className="px-4 py-2.5 rounded-xl bg-[#26A5E4] hover:bg-[#1E96D1] disabled:opacity-40 text-white text-sm font-bold flex items-center gap-2">
                  {ocupado === 'telegram' ? <Loader2 className="w-4 h-4 animate-spin" /> : <TelegramIcon className="w-4 h-4" />}
                  Conectar bot
                </button>
              </div>
              <p className="text-[11px] text-slate-500">O Telegram só deixa o bot falar com quem falou com ele primeiro. Coloque o link do bot no site, no e-mail e no cartão.</p>
            </div>
          )}
        </div>

        <ConectorWhatsApp cfg={cfg} aoMudar={aoMudar} />
      </div>

      {erro && <p className="text-sm text-red-600 mt-3">{erro}</p>}
      <p className="text-xs text-slate-400 mt-4">
        Se o número já estiver no aplicativo WhatsApp Business do celular, o próprio cadastro da Meta
        diz se ele pode continuar lá ao mesmo tempo. Na dúvida, use um número dedicado ao atendimento.
      </p>
    </div>
  );
};
