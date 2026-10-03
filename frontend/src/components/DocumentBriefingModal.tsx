import React, { useState } from 'react';
import { X, Sparkles, Loader2, AlertCircle, Wand2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import type { DocumentAIResponse } from '../types';

/**
 * O briefing que vira proposta ou contrato.
 *
 * Os modelos de texto continuam existindo para quem só quer preencher
 * colchetes. Este é o outro caminho: o documento nasce do lead. Como a
 * busca já sabe que a padaria tem 213 avaliações e nenhum site, e que o
 * site da clínica não abre no celular, esse material entra no
 * diagnóstico — e é o que faz o documento não parecer modelo baixado da
 * internet.
 *
 * O que o usuário não informar aqui NÃO é inventado pela IA: vira
 * [CAMPO] no texto, e o editor transforma cada um em campo de
 * formulário. Número errado em proposta é pior do que lacuna.
 */

type Props = {
  kind: 'proposta' | 'contrato';
  onFechar: () => void;
  onPronto: (doc: DocumentAIResponse) => void;
};

export const DocumentBriefingModal: React.FC<Props> = ({ kind, onFechar, onPronto }) => {
  const { leads, user } = useApp() as any;

  const [leadId, setLeadId] = useState('');
  const [servico, setServico] = useState(user?.product_description || '');
  const [escopo, setEscopo] = useState('');
  const [valor, setValor] = useState('');
  const [condicoes, setCondicoes] = useState('');
  const [prazo, setPrazo] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState('');

  const lead = (leads || []).find((l: any) => l.id === leadId);

  const gerar = async () => {
    if (!servico.trim()) {
      setErro('Diga qual serviço está sendo contratado — é o eixo do documento inteiro.');
      return;
    }
    setGerando(true);
    setErro('');
    try {
      const doc = await api.generateDocument({
        kind, lead_id: leadId, servico, escopo, valor, condicoes, prazo, observacoes,
      });
      onPronto(doc);
    } catch (err: any) {
      setErro(err?.message || 'Não foi possível redigir o documento agora.');
    } finally {
      setGerando(false);
    }
  };

  const campo = (
    rotulo: string,
    valorAtual: string,
    aoMudar: (v: string) => void,
    dica = '',
    area = false,
  ) => (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-slate-600">{rotulo}</label>
      {area ? (
        <textarea
          rows={3}
          value={valorAtual}
          onChange={e => aoMudar(e.target.value)}
          placeholder={dica}
          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500"
        />
      ) : (
        <input
          value={valorAtual}
          onChange={e => aoMudar(e.target.value)}
          placeholder={dica}
          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500"
        />
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh]">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Wand2 className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">
                {kind === 'proposta' ? 'Nova proposta com IA' : 'Novo contrato com IA'}
              </h3>
              <p className="text-xs text-slate-500">
                {kind === 'proposta'
                  ? 'O diagnóstico sai dos dados reais do lead — nota, avaliações, estado do site.'
                  : 'Cláusulas adaptadas ao serviço, com LGPD, propriedade intelectual e rescisão.'}
              </p>
            </div>
          </div>
          <button onClick={onFechar} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {erro && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {erro}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600">Para qual lead</label>
            <select
              value={leadId}
              onChange={e => setLeadId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:border-blue-500"
            >
              <option value="">Sem lead vinculado (cliente que já é meu)</option>
              {(leads || []).map((l: any) => (
                <option key={l.id} value={l.id}>
                  {l.company || l.name} — {l.city}
                </option>
              ))}
            </select>
            {lead?.diagnosis && (
              <p className="text-[11px] text-slate-500 leading-snug bg-slate-50 border border-slate-200 rounded-lg p-2">
                <strong className="text-slate-700">Entra no diagnóstico:</strong> {lead.diagnosis}
              </p>
            )}
          </div>

          {campo('Serviço contratado', servico, setServico, 'Ex.: Site institucional de uma página com cardápio e encomendas pelo WhatsApp')}
          {campo('Escopo, se quiser detalhar', escopo, setEscopo, 'O que está incluso, quantas páginas, o que você entrega', true)}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {campo('Valor', valor, setValor, 'R$ 2.400')}
            {campo('Prazo', prazo, setPrazo, '15 dias úteis')}
          </div>
          {campo('Forma de pagamento', condicoes, setCondicoes, '50% na aprovação e 50% na entrega')}
          {campo('Observações', observacoes, setObservacoes, 'Algo que o cliente pediu, uma restrição, um detalhe do negócio', true)}

          <p className="text-[11px] text-slate-400 leading-snug">
            O que você deixar em branco vira um campo entre colchetes no documento, para
            preencher depois no editor. A IA não inventa valor, prazo nem CNPJ.
          </p>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            onClick={onFechar}
            className="px-4 py-2 rounded-xl text-sm font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100"
          >
            Cancelar
          </button>
          <button
            onClick={gerar}
            disabled={gerando}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-bold flex items-center gap-2"
          >
            {gerando
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Redigindo...</>
              : <><Sparkles className="w-4 h-4" /> Redigir {kind === 'proposta' ? 'proposta' : 'contrato'}</>}
          </button>
        </div>
      </div>
    </div>
  );
};
