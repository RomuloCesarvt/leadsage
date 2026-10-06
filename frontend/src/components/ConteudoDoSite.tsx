/**
 * Conteúdo do ramo no construtor: o que o site diz além dos serviços.
 *
 * Diferenciais, "como funciona" e perguntas frequentes vêm do banco do ramo
 * já em português e podem ser editados, apagados ou escritos do zero. Cada
 * seção pode ser desligada: um site enxuto também é um site profissional.
 */
import React, { useState } from 'react';
import { ChevronDown, Plus, Trash2, Wand2 } from 'lucide-react';
import type { SiteData } from '../templates/sites/base';
import { achar } from '../templates/sites/conteudo-nichos';
import { semearConteudo } from '../templates/sites/semear';

type Props = { dados: SiteData; setDados: React.Dispatch<React.SetStateAction<SiteData>> };

const SECOES: { id: 'diferenciais' | 'passos' | 'faq' | 'ctaFinal'; nome: string; dica: string }[] = [
  { id: 'diferenciais', nome: 'Por que escolher', dica: 'até 6 diferenciais' },
  { id: 'passos', nome: 'Como funciona', dica: 'passo a passo' },
  { id: 'faq', nome: 'Perguntas frequentes', dica: 'tira dúvidas antes do contato' },
  { id: 'ctaFinal', nome: 'Chamada final', dica: 'convite para falar no WhatsApp' },
];

const entrada = 'w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

export const ConteudoDoSite: React.FC<Props> = ({ dados, setDados }) => {
  const [aberto, setAberto] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const ramo = achar(dados.categoria);

  const atualizar = (parcial: Partial<SiteData>) => setDados(d => ({ ...d, ...parcial }));
  const alternar = (id: (typeof SECOES)[number]['id'], ligado: boolean) =>
    setDados(d => ({ ...d, secoes: { ...(d.secoes || {}), [id]: ligado } }));

  const lista = <K extends 'diferenciais' | 'passos'>(chave: K, rotulo: string, max: number, modelo: string) => (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-bold text-slate-600">{rotulo}</label>
        {(dados[chave] || []).length < max && (
          <button type="button" onClick={() => atualizar({ [chave]: [...(dados[chave] || []), { titulo: '', texto: '' }] } as any)}
            className="text-xs font-bold text-blue-600 flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Adicionar</button>
        )}
      </div>
      <div className="space-y-2">
        {(dados[chave] || []).map((x, i) => (
          <div key={i} className="p-2.5 rounded-xl border border-slate-200 space-y-1.5 relative">
            <button type="button" title="Remover" onClick={() => atualizar({ [chave]: (dados[chave] || []).filter((_, k) => k !== i) } as any)}
              className="absolute top-2 right-2 p-1 text-slate-300 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
            <input value={x.titulo} placeholder={`${modelo} ${i + 1}`} className={`${entrada} font-semibold pr-8`}
              onChange={e => atualizar({ [chave]: (dados[chave] || []).map((y, k) => (k === i ? { ...y, titulo: e.target.value } : y)) } as any)} />
            <input value={x.texto} placeholder="Uma frase curta" className={`${entrada} text-xs`}
              onChange={e => atualizar({ [chave]: (dados[chave] || []).map((y, k) => (k === i ? { ...y, texto: e.target.value } : y)) } as any)} />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="rounded-2xl border border-slate-200">
      <button type="button" onClick={() => setAberto(a => !a)} aria-expanded={aberto}
        className="w-full flex items-center justify-between px-4 py-3 text-left">
        <span>
          <span className="block text-xs font-bold text-slate-700">Conteúdo da página</span>
          <span className="block text-[11px] text-slate-400">Diferenciais, passo a passo, perguntas e botões</span>
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${aberto ? 'rotate-180' : ''}`} />
      </button>

      {aberto && (
        <div className="px-4 pb-4 space-y-5 border-t border-slate-100 pt-4">
          <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100">
            <p className="text-[12px] text-blue-900 leading-snug mb-2">
              {ramo.id === 'generico'
                ? 'Escreva o ramo em "Categoria" (ex.: Dentistas) para receber sugestões prontas.'
                : <>Sugestões para <b>{ramo.nome}</b>: título, serviços, diferenciais, passos e perguntas em português.</>}
            </p>
            {!confirmando ? (
              <button type="button" onClick={() => setConfirmando(true)}
                className="text-xs font-bold text-blue-700 flex items-center gap-1.5"><Wand2 className="w-3.5 h-3.5" /> Usar sugestões do ramo</button>
            ) : (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-600">Isso substitui os textos atuais.</span>
                <button type="button" className="font-bold text-red-600"
                  onClick={() => { setDados(d => semearConteudo(d, { sobrescrever: true })); setConfirmando(false); }}>Substituir</button>
                <button type="button" className="font-bold text-slate-500" onClick={() => setConfirmando(false)}>Cancelar</button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2">Seções da página</label>
            <div className="space-y-1.5">
              {SECOES.map(s => (
                <label key={s.id} className="flex items-center justify-between gap-3 text-sm text-slate-700 cursor-pointer">
                  <span>{s.nome} <span className="text-[11px] text-slate-400">· {s.dica}</span></span>
                  <input type="checkbox" className="w-4 h-4 accent-blue-600 shrink-0"
                    checked={dados.secoes?.[s.id] !== false} onChange={e => alternar(s.id, e.target.checked)} />
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Cidade</label>
              <input value={dados.cidade || ''} onChange={e => atualizar({ cidade: e.target.value })} placeholder="Botucatu" className={entrada} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Texto do botão</label>
              <input value={dados.ctaPrincipal || ''} onChange={e => atualizar({ ctaPrincipal: e.target.value })}
                placeholder={ramo.cta.principal} maxLength={30} className={entrada} />
            </div>
          </div>

          {lista('diferenciais', 'Por que escolher', 6, 'Diferencial')}
          {lista('passos', 'Como funciona', 4, 'Passo')}

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-600">Perguntas frequentes</label>
              {(dados.faq || []).length < 8 && (
                <button type="button" onClick={() => atualizar({ faq: [...(dados.faq || []), { pergunta: '', resposta: '' }] })}
                  className="text-xs font-bold text-blue-600 flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Adicionar</button>
              )}
            </div>
            <div className="space-y-2">
              {(dados.faq || []).map((p, i) => (
                <div key={i} className="p-2.5 rounded-xl border border-slate-200 space-y-1.5 relative">
                  <button type="button" title="Remover" onClick={() => atualizar({ faq: (dados.faq || []).filter((_, k) => k !== i) })}
                    className="absolute top-2 right-2 p-1 text-slate-300 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                  <input value={p.pergunta} placeholder={`Pergunta ${i + 1}`} className={`${entrada} font-semibold pr-8`}
                    onChange={e => atualizar({ faq: (dados.faq || []).map((q, k) => (k === i ? { ...q, pergunta: e.target.value } : q)) })} />
                  <textarea rows={2} value={p.resposta} placeholder="Resposta" className={`${entrada} text-xs resize-none`}
                    onChange={e => atualizar({ faq: (dados.faq || []).map((q, k) => (k === i ? { ...q, resposta: e.target.value } : q)) })} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
