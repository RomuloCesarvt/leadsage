import React, { useState } from 'react';
import { ScrollText, Eye, Download, X, Copy, Check } from 'lucide-react';

const CONTRACTS = [
  {
    title: 'Prestação de Serviço Simples',
    desc: 'Modelo padrão com cláusulas de SLA, rescisão e escopo técnico fechado.',
    content: `CONTRATO DE PRESTAÇÃO DE SERVIÇOS

CONTRATANTE: [NOME/RAZÃO SOCIAL], inscrito(a) no CPF/CNPJ sob nº [NÚMERO], com sede em [ENDEREÇO].

CONTRATADA: [SUA EMPRESA], inscrita no CNPJ sob nº [CNPJ], com sede em [ENDEREÇO].

CLÁUSULA 1ª - OBJETO
A CONTRATADA se compromete a prestar serviços de [DESCRIÇÃO DOS SERVIÇOS], conforme especificações acordadas entre as partes.

CLÁUSULA 2ª - PRAZO
O presente contrato terá vigência de [X] meses, a contar da data de assinatura, podendo ser renovado por igual período mediante acordo entre as partes.

CLÁUSULA 3ª - VALOR E FORMA DE PAGAMENTO
3.1. O valor total dos serviços é de R$ [VALOR] ([VALOR POR EXTENSO]).
3.2. O pagamento será efetuado da seguinte forma: [CONDIÇÕES].
3.3. Em caso de atraso, incidirão juros de 1% ao mês e multa de 2%.

CLÁUSULA 4ª - OBRIGAÇÕES DA CONTRATADA
4.1. Executar os serviços com qualidade e dentro dos prazos acordados.
4.2. Manter sigilo sobre informações confidenciais do CONTRATANTE.
4.3. Comunicar quaisquer impedimentos ou atrasos com antecedência.

CLÁUSULA 5ª - OBRIGAÇÕES DO CONTRATANTE
5.1. Fornecer as informações e materiais necessários para execução dos serviços.
5.2. Efetuar os pagamentos nos prazos acordados.
5.3. Designar um responsável para aprovações e feedback.

CLÁUSULA 6ª - RESCISÃO
6.1. O presente contrato poderá ser rescindido por qualquer das partes mediante aviso prévio de 30 dias.
6.2. Em caso de rescisão antecipada, os serviços já executados serão cobrados proporcionalmente.

CLÁUSULA 7ª - FORO
As partes elegem o foro da Comarca de [CIDADE/UF] para dirimir quaisquer questões.

[CIDADE], [DATA].

________________________          ________________________
CONTRATANTE                       CONTRATADA`
  },
  {
    title: 'Criação de Site Institucional',
    desc: 'Contrato específico para projetos de desenvolvimento web.',
    content: `CONTRATO DE CRIAÇÃO DE SITE INSTITUCIONAL

CONTRATANTE: [NOME/RAZÃO SOCIAL]
CPF/CNPJ: [NÚMERO]
CONTRATADA: [SUA EMPRESA]
CNPJ: [CNPJ]

1. OBJETO
Desenvolvimento de site institucional contendo:
• Página inicial (Home)
• Página Sobre
• Página de Serviços/Produtos
• Página de Contato com formulário
• [PÁGINAS ADICIONAIS]

2. ESPECIFICAÇÕES TÉCNICAS
• Design responsivo (desktop, tablet e mobile)
• Otimização SEO básica
• Integração com Google Analytics
• SSL (certificado de segurança)
• Hospedagem: [DETALHES]
• Domínio: [DETALHES]

3. ETAPAS E CRONOGRAMA
Etapa 1 - Briefing e Wireframe: [X] dias úteis
Etapa 2 - Layout e Design: [X] dias úteis
Etapa 3 - Desenvolvimento: [X] dias úteis
Etapa 4 - Revisões (até 3): [X] dias úteis
Etapa 5 - Publicação: [X] dias úteis
Prazo total estimado: [X] dias úteis

4. INVESTIMENTO
Valor: R$ [VALOR]
Pagamento: [CONDIÇÕES]

5. REVISÕES
5.1. Estão incluídas até 3 (três) rodadas de revisões.
5.2. Revisões adicionais serão cobradas à parte (R$ [VALOR]/hora).

6. PROPRIEDADE INTELECTUAL
6.1. Após quitação total, o CONTRATANTE terá propriedade sobre o conteúdo e design do site.
6.2. A CONTRATADA poderá utilizar o projeto em portfólio.

7. SUPORTE PÓS-ENTREGA
Suporte técnico gratuito por 30 dias após publicação.
Manutenção mensal disponível por R$ [VALOR]/mês.

8. RESCISÃO E CANCELAMENTO
Em caso de cancelamento pelo CONTRATANTE, os valores pagos não serão devolvidos, correspondendo ao trabalho já executado.

[CIDADE], [DATA].

________________________          ________________________
CONTRATANTE                       CONTRATADA`
  },
  {
    title: 'Desenvolvimento de E-commerce',
    desc: 'Contrato para lojas virtuais com integrações de pagamento.',
    content: `CONTRATO DE DESENVOLVIMENTO DE E-COMMERCE

CONTRATANTE: [RAZÃO SOCIAL] - CNPJ: [NÚMERO]
CONTRATADA: [SUA EMPRESA] - CNPJ: [NÚMERO]

1. OBJETO
Desenvolvimento de loja virtual (e-commerce) com as seguintes funcionalidades:
• Catálogo de produtos (até [X] produtos iniciais)
• Carrinho de compras
• Checkout com integração de pagamento
• Painel administrativo
• Gestão de estoque básica
• Sistema de cupons de desconto

2. INTEGRAÇÕES
• Gateway de pagamento: [Mercado Pago / PagSeguro / Stripe]
• Frete: [Correios / Melhor Envio]
• ERP/NFe: [Se aplicável]

3. INVESTIMENTO
Valor de desenvolvimento: R$ [VALOR]
Manutenção mensal (opcional): R$ [VALOR]/mês

4. PRAZO DE ENTREGA
[X] dias úteis a partir da aprovação do briefing.

5. GARANTIAS
• 90 dias de garantia contra bugs
• Suporte técnico por [X] meses
• Backup diário automático

6. LIMITAÇÕES
• Não inclui produção de conteúdo/fotos
• Não inclui gestão de campanhas
• Alterações estruturais após entrega são cobradas à parte

[CIDADE], [DATA].

________________________          ________________________
CONTRATANTE                       CONTRATADA`
  },
  {
    title: 'Gestão de Tráfego Pago',
    desc: 'Contrato mensal para gestão de anúncios (Google/Meta Ads).',
    content: `CONTRATO DE GESTÃO DE TRÁFEGO PAGO

CONTRATANTE: [NOME/RAZÃO SOCIAL]
CONTRATADA: [SUA EMPRESA]

1. OBJETO
Gestão profissional de campanhas de mídia paga nas plataformas:
☐ Google Ads (Pesquisa, Display, YouTube)
☐ Meta Ads (Facebook e Instagram)
☐ TikTok Ads
☐ LinkedIn Ads

2. ESCOPO DOS SERVIÇOS
• Planejamento estratégico de campanhas
• Criação e otimização de anúncios
• Segmentação de público-alvo
• Testes A/B
• Relatórios mensais de performance
• Reunião mensal de alinhamento

3. INVESTIMENTO
Fee de gestão mensal: R$ [VALOR]
Investimento mínimo em mídia (pago pelo CONTRATANTE): R$ [VALOR]/mês

Obs: O fee de gestão NÃO inclui o valor investido em anúncios.

4. VIGÊNCIA
Contrato de [X] meses com renovação automática.
Cancelamento com 30 dias de aviso prévio.

5. RESULTADOS
5.1. A CONTRATADA se compromete a otimizar as campanhas para melhores resultados.
5.2. Não há garantia de resultados específicos, pois dependem de múltiplos fatores.
5.3. KPIs acompanhados: CPC, CTR, ROAS, CPL, Conversões.

6. RESPONSABILIDADES DO CONTRATANTE
• Aprovar criativos e copies
• Fornecer acesso às contas de anúncio
• Pagar o investimento em mídia diretamente às plataformas

[CIDADE], [DATA].

________________________          ________________________
CONTRATANTE                       CONTRATADA`
  },
  {
    title: 'Social Media Mensal',
    desc: 'Contrato para gestão de redes sociais com entregas definidas.',
    content: `CONTRATO DE GESTÃO DE REDES SOCIAIS

CONTRATANTE: [NOME/RAZÃO SOCIAL]
CONTRATADA: [SUA EMPRESA]

1. OBJETO
Gestão profissional das redes sociais do CONTRATANTE:
☐ Instagram
☐ Facebook
☐ LinkedIn
☐ TikTok

2. ENTREGAS MENSAIS
• [X] posts para feed (design + copy)
• [X] stories
• [X] reels/vídeos curtos
• Calendário editorial mensal
• Monitoramento de comentários e DMs (horário comercial)
• Relatório mensal de performance

3. INVESTIMENTO
Valor mensal: R$ [VALOR]
Vigência mínima: [X] meses

4. PROCESSO DE TRABALHO
Semana 1: Planejamento e calendário editorial
Semana 2-3: Produção de conteúdo e aprovações
Semana 4: Publicações e relatórios

5. APROVAÇÕES
• Todo conteúdo será enviado para aprovação com [X] dias de antecedência.
• O CONTRATANTE terá [X] dias úteis para aprovar ou solicitar ajustes.
• Até 2 revisões por peça estão incluídas.

6. NÃO INCLUSO
• Produção fotográfica profissional
• Investimento em mídia paga
• Criação de vídeos com mais de 60 segundos

[CIDADE], [DATA].

________________________          ________________________
CONTRATANTE                       CONTRATADA`
  }
];

export const ContractsScreen: React.FC = () => {
  const [viewingContract, setViewingContract] = useState<number | null>(null);
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
    a.download = `contrato_${title.toLowerCase().replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col h-full relative">
      
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">Contratos</h1>
        <p className="text-slate-500 text-sm mt-1">Modelos de contratos jurídicos prontos para personalizar e usar.</p>
      </div>

      <div className="flex-1 relative">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {CONTRACTS.map((contract, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-4 text-slate-500">
                <ScrollText className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 mb-2">{contract.title}</h3>
              <p className="text-sm text-slate-500 mb-6">{contract.desc}</p>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setViewingContract(i)}
                  className="flex-1 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors text-slate-600 text-sm font-bold flex items-center justify-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" /> Visualizar
                </button>
                <button 
                  onClick={() => handleDownload(contract.title, contract.content)}
                  className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors text-white text-sm font-bold flex items-center justify-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" /> Baixar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Preview Modal */}
      {viewingContract !== null && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setViewingContract(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="font-bold text-slate-800">{CONTRACTS[viewingContract].title}</h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleCopy(CONTRACTS[viewingContract].content)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-600 flex items-center gap-1.5 transition-colors"
                >
                  {copied ? <><Check className="w-3.5 h-3.5 text-green-600" /> Copiado</> : <><Copy className="w-3.5 h-3.5" /> Copiar</>}
                </button>
                <button onClick={() => setViewingContract(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <pre className="whitespace-pre-wrap text-sm text-slate-700 font-mono leading-relaxed">{CONTRACTS[viewingContract].content}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
