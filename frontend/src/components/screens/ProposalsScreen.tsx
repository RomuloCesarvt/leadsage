import React, { useState } from 'react';
import { FileText, Eye, Download, X, Copy, Check } from 'lucide-react';

const PROPOSALS = [
  {
    title: 'Minimalista',
    desc: 'Design limpo e direto. Ideal para freelancers e consultores.',
    content: `PROPOSTA COMERCIAL

Para: [NOME DO CLIENTE]
De: [SEU NOME / EMPRESA]
Data: [DATA]

---

OBJETIVO
Apresentar nossa solução para [PROBLEMA] que irá [BENEFÍCIO PRINCIPAL].

ESCOPO DO PROJETO
• [Entregável 1]
• [Entregável 2]
• [Entregável 3]

INVESTIMENTO
Valor total: R$ [VALOR]
Forma de pagamento: [CONDIÇÕES]

PRAZO
Início: [DATA]
Entrega: [DATA]

PRÓXIMOS PASSOS
1. Aprovação desta proposta
2. Assinatura do contrato
3. Início do projeto

---
[SEU NOME]
[TELEFONE] | [EMAIL]`
  },
  {
    title: 'Premium',
    desc: 'Estrutura completa com ROI e casos de sucesso.',
    content: `PROPOSTA COMERCIAL PREMIUM

━━━━━━━━━━━━━━━━━━━━━━━━━━
Cliente: [NOME DO CLIENTE]
Consultor: [SEU NOME]
Data: [DATA]
Validade: 15 dias
━━━━━━━━━━━━━━━━━━━━━━━━━━

1. DIAGNÓSTICO
Após análise do seu negócio, identificamos que:
• [Problema 1 identificado]
• [Problema 2 identificado]
• [Oportunidade detectada]

2. SOLUÇÃO PROPOSTA
Nossa abordagem para resolver esses desafios:

Fase 1 - [Nome da Fase] (Semana 1-2)
• [Atividade 1]
• [Atividade 2]

Fase 2 - [Nome da Fase] (Semana 3-4)
• [Atividade 3]
• [Atividade 4]

3. RESULTADOS ESPERADOS
• [Métrica 1]: Aumento de X%
• [Métrica 2]: Redução de Y%
• ROI estimado: [VALOR]

4. INVESTIMENTO
┌─────────────────────────┬──────────┐
│ Item                    │ Valor    │
├─────────────────────────┼──────────┤
│ [Serviço 1]             │ R$ X.XXX │
│ [Serviço 2]             │ R$ X.XXX │
│ [Serviço 3]             │ R$ X.XXX │
├─────────────────────────┼──────────┤
│ TOTAL                   │ R$ X.XXX │
└─────────────────────────┴──────────┘

Condições: 50% na aprovação + 50% na entrega
Desconto para pagamento à vista: 10%

5. GARANTIAS
• Suporte por 30 dias após entrega
• Até 2 rodadas de revisão inclusas
• Satisfação garantida

━━━━━━━━━━━━━━━━━━━━━━━━━━
[SEU NOME] | [TELEFONE] | [EMAIL]`
  },
  {
    title: 'Corporativo',
    desc: 'Formato empresarial com SLA e termos técnicos.',
    content: `PROPOSTA TÉCNICA E COMERCIAL

Ref: PROP-[ANO]-[NÚMERO]
Data: [DATA]
Validade: 30 dias corridos

CONTRATANTE: [RAZÃO SOCIAL]
CNPJ: [CNPJ]
CONTRATADA: [SUA EMPRESA]

1. OBJETO
Prestação de serviços de [DESCRIÇÃO GERAL] conforme especificações técnicas abaixo.

2. ESPECIFICAÇÕES TÉCNICAS
2.1. [Módulo/Serviço 1]
   - Descrição: [Detalhes]
   - Prazo: [X dias úteis]
   
2.2. [Módulo/Serviço 2]
   - Descrição: [Detalhes]
   - Prazo: [X dias úteis]

3. CRONOGRAMA
| Etapa | Descrição | Prazo |
|-------|-----------|-------|
| 1     | Kickoff   | D+0   |
| 2     | Entrega 1 | D+15  |
| 3     | Entrega 2 | D+30  |
| 4     | Homologação | D+35 |

4. INVESTIMENTO
Valor total: R$ [VALOR] ([VALOR POR EXTENSO])

5. CONDIÇÕES DE PAGAMENTO
• 40% na assinatura do contrato
• 30% na entrega parcial
• 30% na homologação final

6. SLA (ACORDO DE NÍVEL DE SERVIÇO)
• Tempo de resposta: até 4 horas úteis
• Uptime garantido: 99.5%
• Suporte técnico: Seg-Sex, 9h-18h

7. CONFIDENCIALIDADE
As partes se comprometem a manter sigilo sobre informações trocadas.

___________________________
[SEU NOME]
[CARGO] - [SUA EMPRESA]`
  },
  {
    title: 'Criativo',
    desc: 'Visual moderno para agências e criativos.',
    content: `✦ PROPOSTA CRIATIVA ✦

Hey [NOME]! 👋

Ficamos empolgados com o seu projeto e preparamos algo especial.

━━ O QUE VAMOS FAZER ━━

🎯 [Entregável 1]
   Vamos criar [descrição] que vai [benefício]

🎨 [Entregável 2]
   Design [descrição] para [objetivo]

🚀 [Entregável 3]
   [Descrição] com foco em [resultado]

━━ TIMELINE ━━

📅 Semana 1: Discovery + Briefing
📅 Semana 2: Conceituação + 1ª versão
📅 Semana 3: Refinamento + Aprovação
📅 Semana 4: Entrega final + Implementação

━━ INVESTIMENTO ━━

💰 R$ [VALOR]
   → Pix/Transferência: 10% OFF
   → Parcelamento: até 3x sem juros

━━ O QUE ESTÁ INCLUSO ━━

✅ Até 3 revisões
✅ Arquivos editáveis
✅ Suporte por 15 dias
✅ Reunião de alinhamento semanal

━━ BORA? ━━

Se curtiu, é só responder este documento!
Estamos prontos para começar assim que der o GO. 🔥

[SEU NOME]
📱 [WHATSAPP]
📧 [EMAIL]`
  }
];

export const ProposalsScreen: React.FC = () => {
  const [viewingProposal, setViewingProposal] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (title: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `proposta_${title.toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col h-full relative">
      
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">Propostas</h1>
        <p className="text-slate-500 text-sm mt-1">Modelos de propostas comerciais de alta conversão. Copie, personalize e envie.</p>
      </div>

      <div className="flex-1 relative">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PROPOSALS.map((proposal, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center">
              <div className="w-24 h-32 bg-slate-100 rounded-xl mb-4 border border-slate-200 shadow-sm relative overflow-hidden flex items-center justify-center">
                <FileText className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="font-bold text-slate-800 mb-1">{proposal.title}</h3>
              <p className="text-xs text-slate-500 mb-4">{proposal.desc}</p>
              <div className="flex flex-col w-full gap-2">
                <button 
                  onClick={() => setViewingProposal(i)}
                  className="w-full py-2 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200 transition-colors flex items-center justify-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" /> Visualizar
                </button>
                <button 
                  onClick={() => handleDownload(proposal.title, proposal.content)}
                  className="w-full py-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" /> Baixar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Preview Modal */}
      {viewingProposal !== null && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setViewingProposal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="font-bold text-slate-800">{PROPOSALS[viewingProposal].title}</h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleCopy(PROPOSALS[viewingProposal].content)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-600 flex items-center gap-1.5 transition-colors"
                >
                  {copied ? <><Check className="w-3.5 h-3.5 text-green-600" /> Copiado</> : <><Copy className="w-3.5 h-3.5" /> Copiar</>}
                </button>
                <button onClick={() => setViewingProposal(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <pre className="whitespace-pre-wrap text-sm text-slate-700 font-mono leading-relaxed">{PROPOSALS[viewingProposal].content}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
