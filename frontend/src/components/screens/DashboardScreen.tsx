import React from 'react';
import { Search, Users, Star, BarChart3, Globe, Phone, Clock, CreditCard, ChevronRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const DashboardScreen: React.FC = () => {
  const { setViewState, leads } = useApp() as any;

  const MetricCard = ({ title, value, subtext, icon: Icon, colorClass }: any) => (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-500">{title}</p>
          <p className="text-2xl font-black text-slate-800 mt-1">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colorClass}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-xs font-medium text-slate-400 mt-3">{subtext}</p>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Visão Geral</h1>
          <p className="text-slate-500 text-sm mt-1">Acompanhe suas oportunidades e prospecções.</p>
        </div>
        <button 
          onClick={() => setViewState('hero')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition-colors w-fit"
        >
          <Search className="w-4 h-4" />
          Nova Busca
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard title="Leads Encontrados" value={leads.length || '0'} subtext="este mês" icon={Users} colorClass="bg-blue-50 text-blue-600" />
        <MetricCard title="Oportunidades Altas" value="0" subtext="Score acima de 80" icon={Star} colorClass="bg-amber-50 text-amber-600" />
        <MetricCard title="Pipeline Ativo" value="0" subtext="Leads em acompanhamento" icon={BarChart3} colorClass="bg-emerald-50 text-emerald-600" />
        <MetricCard title="Score Médio" value="0" subtext="Qualidade da base" icon={Star} colorClass="bg-purple-50 text-purple-600" />
        
        <MetricCard title="Sem Website" value="0" subtext="Oportunidade de site" icon={Globe} colorClass="bg-rose-50 text-rose-600" />
        <MetricCard title="Com WhatsApp" value={leads.length || '0'} subtext="Oportunidade de contato" icon={Phone} colorClass="bg-indigo-50 text-indigo-600" />
        <MetricCard title="Follow-ups" value="0" subtext="Acompanhamentos pendentes" icon={Clock} colorClass="bg-orange-50 text-orange-600" />
      </div>

      {/* Bottom Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Usage Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm col-span-1 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5 text-slate-400" />
            <h3 className="font-bold text-slate-800">Seu Uso</h3>
          </div>
          
          <div className="space-y-4 flex-1">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-semibold text-slate-600">Leads</span>
                <span className="font-bold text-slate-800">0 restantes</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 w-full"></div>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-1">Limite do plano: 5</p>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-semibold text-slate-600">Sites Gerados</span>
                <span className="font-bold text-slate-800">1 restante</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 w-0"></div>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-1">Limite do plano: 1</p>
            </div>
          </div>

          <button className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg text-sm font-bold transition-colors mt-4">
            Ver Detalhes
          </button>
        </div>

        {/* Funnel Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm col-span-1 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800">Funil de Vendas</h3>
            <button onClick={() => setViewState('pipeline')} className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
              Ver Kanban <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-3">
            {/* Fake Funnel Rows */}
            {[
              { label: 'Novo Lead', count: leads.length, color: 'bg-blue-500', width: '100%' },
              { label: 'Contato Enviado', count: 0, color: 'bg-indigo-500', width: '0%' },
              { label: 'Reunião Agendada', count: 0, color: 'bg-purple-500', width: '0%' },
              { label: 'Proposta Enviada', count: 0, color: 'bg-fuchsia-500', width: '0%' },
              { label: 'Fechado', count: 0, color: 'bg-emerald-500', width: '0%' }
            ].map((stage, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-32 text-xs font-bold text-slate-600 uppercase tracking-wider">{stage.label}</div>
                <div className="flex-1 h-6 bg-slate-50 rounded-md overflow-hidden relative border border-slate-100">
                  <div className={`h-full ${stage.color} opacity-20`} style={{ width: stage.width }}></div>
                  <div className="absolute inset-0 flex items-center px-3 text-xs font-bold text-slate-700">
                    {stage.count} ({stage.width})
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>
    </div>
  );
};
