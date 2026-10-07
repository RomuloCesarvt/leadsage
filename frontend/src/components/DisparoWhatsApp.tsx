/**
 * Disparo da primeira mensagem pelo WhatsApp do próprio cliente.
 *
 * A Meta só deixa iniciar conversa com um modelo aprovado, e só para quem
 * aceitou receber. A tela conduz esse caminho: criar o modelo, esperar a
 * aprovação, escolher o lote e confirmar o consentimento. Quem responde
 * cai na caixa de entrada e o robô conversa como SDR, movendo o pipeline.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Send, CheckCircle2, Clock, XCircle, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import { WhatsAppIcon, InstagramIcon, FacebookIcon, LinkedInIcon } from './BrandIcons';
import { ehSalvo } from '../lib/leadsSalvos';
import type { DisparoResultado, LeadItem, ModeloWhatsApp } from '../types';

const SEM_CONTATO_AINDA = new Set(['', 'Novo Lead', 'Novos', 'Novo']);

export const DisparoWhatsApp: React.FC<{ irConfigurar: () => void }> = ({ irConfigurar }) => {
  const { leads, atualizarPipeline } = useApp() as any;
  const [modelo, setModelo] = useState<ModeloWhatsApp | null>(null);
  const [semWhats, setSemWhats] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [criando, setCriando] = useState(false);
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [consentimento, setConsentimento] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<DisparoResultado | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      setModelo(await api.modeloWhatsApp());
      setSemWhats('');
    } catch (e: any) {
      const m = e?.message || '';
      if (m.includes('Conecte o WhatsApp')) setSemWhats(m);
      else setErro(m || 'Não foi possível consultar o modelo.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  const lote = modelo?.lote || 20;
  const candidatos: LeadItem[] = useMemo(
    () => (leads as LeadItem[]).filter(l => ehSalvo(l) && l.phone && SEM_CONTATO_AINDA.has(l.pipeline_stage || '')),
    [leads],
  );

  const alternar = (id: string) => setMarcados(prev => {
    const novo = new Set(prev);
    if (novo.has(id)) novo.delete(id);
    else if (novo.size < lote) novo.add(id);
    return novo;
  });

  const criar = async () => {
    setCriando(true);
    setErro('');
    try { setModelo(await api.criarModeloWhatsApp()); }
    catch (e: any) { setErro(e?.message || 'Não foi possível criar o modelo.'); }
    finally { setCriando(false); }
  };

  const disparar = async () => {
    setEnviando(true);
    setErro('');
    setResultado(null);
    try {
      // o servidor so conhece os leads que o navegador ja entregou
      await atualizarPipeline();
      const r = await api.roboDisparar([...marcados], consentimento);
      setResultado(r);
      setMarcados(new Set());
      setConsentimento(false);
      await atualizarPipeline();
    } catch (e: any) {
      setErro(e?.message || 'O disparo não foi concluído.');
    } finally {
      setEnviando(false);
    }
  };

  if (carregando && !modelo && !semWhats) {
    return <div className="p-10 text-center text-slate-400 text-sm">Consultando a Meta…</div>;
  }

  if (semWhats) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center max-w-xl mx-auto">
        <WhatsAppIcon className="w-10 h-10 mx-auto mb-3 text-emerald-500" />
        <h2 className="text-lg font-bold text-slate-800 mb-1">Conecte o seu WhatsApp</h2>
        <p className="text-sm text-slate-500 mb-5">
          O disparo sai pelo número do seu WhatsApp Business, não pelo nosso. Conecte em um clique na aba Configurar.
        </p>
        <button onClick={irConfigurar} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm">
          Ir para Configurar
        </button>
      </div>
    );
  }

  const aprovado = modelo?.status === 'APPROVED';

  return (
    <div className="grid lg:grid-cols-[1fr_340px] gap-5 pb-8">
      <div className="space-y-5 min-w-0">
        {/* 1. modelo */}
        <section className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h2 className="font-bold text-slate-800">1. Modelo de mensagem</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                A Meta só deixa abrir conversa com um texto aprovado. Criamos o modelo na sua conta e enviamos para análise.
              </p>
            </div>
            <button onClick={carregar} title="Consultar de novo" className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
              <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <blockquote className="text-sm text-slate-600 bg-slate-50 border border-slate-100 rounded-xl p-3.5 leading-relaxed">
            {modelo?.texto
              ?.replace('{{1}}', 'seu nome')
              .replace('{{2}}', 'sua empresa')
              .replace('{{3}}', 'o nome do negócio do lead')}
          </blockquote>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            {!modelo?.existe && (
              <button onClick={criar} disabled={criando}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-xl text-sm">
                {criando ? 'Enviando para a Meta…' : 'Criar modelo e enviar para aprovação'}
              </button>
            )}
            {modelo?.status === 'PENDING' && (
              <span className="flex items-center gap-1.5 text-sm font-bold text-amber-600">
                <Clock className="w-4 h-4" /> Em análise na Meta (de minutos a algumas horas)
              </span>
            )}
            {aprovado && (
              <span className="flex items-center gap-1.5 text-sm font-bold text-emerald-600">
                <CheckCircle2 className="w-4 h-4" /> Aprovado
              </span>
            )}
            {modelo?.status === 'REJECTED' && (
              <>
                <span className="flex items-center gap-1.5 text-sm font-bold text-red-600">
                  <XCircle className="w-4 h-4" /> Recusado{modelo.motivo ? `: ${modelo.motivo}` : ''}
                </span>
                <button onClick={criar} disabled={criando}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50">
                  Enviar de novo
                </button>
              </>
            )}
          </div>
        </section>

        {/* 2. lote */}
        <section className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <h2 className="font-bold text-slate-800">2. Quem recebe</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Leads com telefone que ainda não foram contatados. Até {lote} por vez: a Meta libera mais conforme o número ganha reputação.
              </p>
            </div>
            {candidatos.length > 0 && (
              <button
                onClick={() => setMarcados(new Set(candidatos.slice(0, lote).map(l => l.id)))}
                className="text-xs font-bold text-blue-600 hover:underline shrink-0"
              >
                Marcar os {Math.min(lote, candidatos.length)} primeiros
              </button>
            )}
          </div>

          {candidatos.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">
              Nenhum lead novo com telefone. Faça uma busca em Leads para trazer contatos.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 max-h-80 overflow-y-auto custom-scrollbar">
              {candidatos.map(l => (
                <li key={l.id}>
                  <label className="flex items-center gap-3 py-2.5 cursor-pointer">
                    <input type="checkbox" checked={marcados.has(l.id)} onChange={() => alternar(l.id)}
                      className="w-4 h-4 accent-blue-600" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-slate-700 truncate">{l.company}</span>
                      <span className="block text-[11px] text-slate-400 truncate">{l.niche} · {l.phone}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 3. confirmar */}
        <section className="bg-white border border-slate-200 rounded-2xl p-5">
          <h2 className="font-bold text-slate-800 mb-3">3. Confirmar e disparar</h2>
          <label className="flex items-start gap-3 text-sm text-slate-600 cursor-pointer mb-4">
            <input type="checkbox" checked={consentimento} onChange={e => setConsentimento(e.target.checked)}
              className="w-4 h-4 accent-blue-600 mt-0.5 shrink-0" />
            <span>
              Confirmo que estas pessoas aceitaram receber contato (ou que tenho base legal para isso).
              Quem responder <b>SAIR</b> nunca mais recebe mensagem minha.
            </span>
          </label>
          <button
            onClick={disparar}
            disabled={!aprovado || marcados.size === 0 || !consentimento || enviando}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-xl text-sm flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            {enviando ? 'Enviando…' : `Disparar para ${marcados.size} ${marcados.size === 1 ? 'lead' : 'leads'}`}
          </button>
          <p className="text-[11px] text-slate-400 mt-2">Cada mensagem entregue custa 1 crédito. O que não for entregue é devolvido.</p>

          {erro && (
            <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700 flex gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> <span>{erro}</span>
            </div>
          )}

          {resultado && (
            <div className="mt-4 space-y-2 text-sm">
              <p className="font-bold text-emerald-700">
                {resultado.enviados.length} {resultado.enviados.length === 1 ? 'mensagem enviada' : 'mensagens enviadas'}.
                {resultado.enviados.length > 0 && ' Os cards foram para "Contato Enviado"; quando responderem, o robô assume a conversa.'}
              </p>
              {[...resultado.ignorados.map(i => ({ ...i, tipo: 'ignorado' })), ...resultado.falhas.map(i => ({ ...i, tipo: 'falha' }))].map(i => (
                <p key={`${i.tipo}${i.id}`} className={i.tipo === 'falha' ? 'text-red-600' : 'text-slate-500'}>
                  {i.nome || i.id}: {i.motivo}
                </p>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* canais */}
      <aside className="space-y-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h3 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600" /> O que cada canal permite
          </h3>
          <ul className="space-y-3 text-[13px] text-slate-600 leading-snug">
            <li className="flex gap-2.5">
              <WhatsAppIcon className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><b>WhatsApp:</b> primeira mensagem por modelo aprovado (esta tela). Depois de a pessoa responder, 24 h de conversa livre com o robô.</span>
            </li>
            <li className="flex gap-2.5">
              <InstagramIcon className="w-4 h-4 text-pink-500 shrink-0 mt-0.5" />
              <span><b>Instagram:</b> o robô responde quem te escreveu (DM, resposta a story). A Meta não permite começar conversa com desconhecido.</span>
            </li>
            <li className="flex gap-2.5">
              <FacebookIcon className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span><b>Messenger:</b> mesma regra do Instagram: responde quem escreveu.</span>
            </li>
            <li className="flex gap-2.5">
              <LinkedInIcon className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
              <span><b>LinkedIn:</b> não tem API de mensagens. Use a Abordagem para gerar o texto e o link do perfil; o envio é seu, o que também protege sua conta.</span>
            </li>
          </ul>
        </div>
        <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-4 text-[12px] text-blue-900 leading-snug">
          <b>Como o pipeline anda:</b> disparou → <i>Contato Enviado</i>. Respondeu → <i>Respondeu</i>. O robô entendeu o cenário → <i>Qualificado</i>.
          Falou de valor → <i>Proposta</i>. Confirmou horário → <i>Reunião</i>. Recusou → <i>Perdido</i>. <i>Fechado</i> é decisão sua.
        </div>
      </aside>
    </div>
  );
};
