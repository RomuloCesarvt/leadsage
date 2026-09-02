import React, { useState } from 'react';
import { Search, BookOpen, Zap, Globe, MessageSquare, BarChart3, Settings } from 'lucide-react';

const TUTORIALS = [
  {
    category: 'Primeiros Passos',
    icon: Zap,
    items: [
      { title: 'Como fazer sua primeira busca de leads', duration: '3 min', description: 'Aprenda a configurar país, estado, cidade e nicho para encontrar oportunidades reais no Google Maps.' },
      { title: 'Entendendo o Score de Oportunidade', duration: '2 min', description: 'Saiba como o LeadSage calcula a pontuação de cada lead e o que significa cada faixa (baixa, média, alta).' },
      { title: 'Navegando pela interface', duration: '2 min', description: 'Tour completo por todas as seções do aplicativo: Dashboard, Busca, Pipeline, Ferramentas e Configurações.' },
    ]
  },
  {
    category: 'Prospecção Avançada',
    icon: Search,
    items: [
      { title: 'Filtrando leads por oportunidade', duration: '3 min', description: 'Use os filtros de Score, WhatsApp e Website para encontrar os melhores leads para abordar.' },
      { title: 'Enriquecimento automático de dados', duration: '4 min', description: 'Como o LeadSage busca Instagram, LinkedIn e Facebook automaticamente para cada lead encontrado.' },
      { title: 'Exportando leads para CSV e Excel', duration: '2 min', description: 'Exporte sua base de leads com todos os dados para usar em outras ferramentas.' },
    ]
  },
  {
    category: 'IA e Abordagem',
    icon: MessageSquare,
    items: [
      { title: 'Gerando mensagens com IA', duration: '3 min', description: 'Aprenda a usar a IA de Abordagem para criar mensagens personalizadas por nicho e tom de comunicação.' },
      { title: 'Escolhendo o tom certo', duration: '2 min', description: 'Consultivo, Amigável, Direto, Autoridade ou Promocional? Entenda quando usar cada um.' },
      { title: 'Personalizando instruções da IA', duration: '3 min', description: 'Como usar instruções extras para criar mensagens ainda mais relevantes para seu público.' },
    ]
  },
  {
    category: 'Construtor de Sites',
    icon: Globe,
    items: [
      { title: 'Criando um site a partir de um lead', duration: '4 min', description: 'Selecione um lead salvo e gere um site institucional completo com a IA em segundos.' },
      { title: 'Criando um site do zero', duration: '5 min', description: 'Preencha os dados manualmente e deixe a IA gerar um site profissional para você.' },
      { title: 'Usando o site como isca de vendas', duration: '3 min', description: 'Estratégias para usar sites gerados como demonstração na prospecção de novos clientes.' },
    ]
  },
  {
    category: 'Pipeline e Vendas',
    icon: BarChart3,
    items: [
      { title: 'Organizando leads no Pipeline Kanban', duration: '3 min', description: 'Arraste leads entre etapas (Novo → Contato → Reunião → Proposta → Fechado) para gerenciar seu funil.' },
      { title: 'Usando propostas e contratos', duration: '3 min', description: 'Escolha modelos prontos de propostas e contratos, personalize e envie aos seus leads.' },
      { title: 'Precificando seus serviços', duration: '2 min', description: 'Use o Precificador para calcular valores sugeridos com base em complexidade, urgência e porte do cliente.' },
    ]
  },
  {
    category: 'Configurações',
    icon: Settings,
    items: [
      { title: 'Configurando suas preferências', duration: '2 min', description: 'Defina seu serviço, nichos favoritos, cidades atendidas e canal preferido de comunicação.' },
      { title: 'Gerenciando créditos', duration: '2 min', description: 'Entenda como o sistema de créditos funciona e como recarregar quando necessário.' },
    ]
  },
];

export const TutorialsScreen: React.FC = () => {
  const [expandedCategory, setExpandedCategory] = useState<string>(TUTORIALS[0].category);

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar max-w-5xl mx-auto w-full pb-12">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">Tutoriais</h1>
        <p className="text-slate-500 text-sm mt-1">Aprenda a usar o LeadSage e maximize seus resultados de prospecção.</p>
      </div>

      <div className="space-y-4">
        {TUTORIALS.map((section) => {
          const Icon = section.icon;
          const isExpanded = expandedCategory === section.category;
          return (
            <div key={section.category} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <button
                onClick={() => setExpandedCategory(isExpanded ? '' : section.category)}
                className="w-full px-6 py-5 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-slate-800">{section.category}</h3>
                    <p className="text-xs text-slate-400">{section.items.length} tutoriais</p>
                  </div>
                </div>
                <div className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                  <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
                </div>
              </button>
              
              {isExpanded && (
                <div className="border-t border-slate-100">
                  {section.items.map((item, i) => (
                    <div key={i} className="px-6 py-4 flex items-start gap-4 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-b-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                        <BookOpen className="w-5 h-5 text-slate-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-700 text-sm mb-1">{item.title}</h4>
                        <p className="text-xs text-slate-500 leading-relaxed">{item.description}</p>
                      </div>
                      <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg shrink-0">{item.duration}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
