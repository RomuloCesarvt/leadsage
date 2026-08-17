import React from 'react';
import { Search, Users, ArrowUpRight, BarChart2, Zap, Globe, MessageCircle, Target, ArrowRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const DashboardScreen: React.FC = () => {
  const { setViewState, leads, history } = useApp() as any;

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar text-slate-800">
      
      {/* Header Area */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Visão Geral</h1>
          <p className="text-slate-500 mt-1">Acompanhe suas oportunidades e prospecções.</p>
        </div>
        <button 
          onClick={() => setViewState('hero')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition-colors"
        >
          <Search className="w-4 h-4" />
          Nova Busca
        </button>
      </div>

      {/* Row 1: 3 Big Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        
        {/* Card 1 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between h-48">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold tracking-widest text-slate-400 uppercase">Leads Encontrados</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <div>
            <div className="text-6xl font-bold tracking-tighter mb-1 text-slate-900">{leads.length || '0'}</div>
            <div className="text-sm text-slate-400">{leads.length || '0'} este mês</div>
          </div>
        </div>

        {/* Card 2 (Blue Theme) */}
        <div className="bg-blue-600 rounded-2xl p-6 shadow-sm flex flex-col justify-between h-48">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold tracking-widest text-blue-100 uppercase">Oportunidades Altas</span>
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5 text-white" />
            </div>
          </div>
          <div>
            <div className="text-6xl font-bold tracking-tighter mb-1 text-white">0</div>
            <div className="text-sm text-blue-100">Score acima de 80</div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between h-48">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold tracking-widest text-slate-400 uppercase">Pipeline Ativo</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-col gap-0.5">
              <BarChart2 className="w-5 h-5 text-blue-600 rotate-90" />
            </div>
          </div>
          <div>
            <div className="text-6xl font-bold tracking-tighter mb-1 text-slate-900">0</div>
            <div className="text-sm text-slate-400">Leads em acompanhamento</div>
          </div>
        </div>

      </div>

      {/* Row 2: 4 Small Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-slate-400" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400">Score Médio</span>
            <div className="text-2xl font-bold text-slate-800 leading-none mt-1">0</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
            <Globe className="w-5 h-5 text-slate-400" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400">Sem Website</span>
            <div className="text-2xl font-bold text-slate-800 leading-none mt-1">0</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
            <MessageCircle className="w-5 h-5 text-slate-400" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400">Com WhatsApp</span>
            <div className="text-2xl font-bold text-slate-800 leading-none mt-1">{leads.length || '0'}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
            <Target className="w-5 h-5 text-slate-400" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400">Follow-ups</span>
            <div className="text-2xl font-bold text-slate-800 leading-none mt-1">0</div>
          </div>
        </div>

      </div>

      {/* Row 3: Seu Uso */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-2 block">Seu Uso</span>
          <div className="flex gap-6 text-sm font-bold text-slate-800">
            <span>Leads: <span className="font-medium text-slate-600">0 restantes</span></span>
            <span>Sites: <span className="font-medium text-slate-600">1 restantes</span></span>
          </div>
        </div>
        <button className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm transition-colors w-full md:w-auto">
          Ver detalhes
        </button>
      </div>

      {/* Row 4: Buscas Recentes & Funil de Vendas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Buscas Recentes */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-800 text-lg">Buscas Recentes</h3>
            <button 
              onClick={() => setViewState('history')}
              className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              Ver todas <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            {history && history.length > 0 ? history.slice(0, 3).map((item: any) => (
              <div key={item.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center justify-between hover:border-blue-200 transition-colors cursor-pointer" onClick={() => setViewState('history')}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                    <Search className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">{item.niche}</h4>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-blue-600">{item.resultsFound} leads</div>
                  <div className="text-xs text-slate-400">{new Date(item.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</div>
                </div>
              </div>
            )) : (
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 text-center flex flex-col items-center justify-center h-48">
                <Search className="w-8 h-8 text-slate-300 mb-3" />
                <p className="text-slate-500 font-medium text-sm">Nenhuma busca recente</p>
              </div>
            )}
          </div>
        </div>

        {/* Funil de Vendas */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-800 text-lg">Funil de Vendas</h3>
            <button 
              onClick={() => setViewState('pipeline')}
              className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              Kanban <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
            {/* Fake Funnel Rows */}
            {[
              { label: 'Novo Lead', count: leads.length, color: 'bg-blue-600', dot: 'bg-blue-600', width: '100%', pct: '100%' },
              { label: 'Contato Enviado', count: 0, color: 'bg-indigo-600', dot: 'bg-indigo-600', width: '0%', pct: '0%' },
              { label: 'Reunião Agendada', count: 0, color: 'bg-purple-600', dot: 'bg-purple-600', width: '0%', pct: '0%' },
              { label: 'Proposta Enviada', count: 0, color: 'bg-fuchsia-600', dot: 'bg-fuchsia-600', width: '0%', pct: '0%' },
              { label: 'Fechado', count: 0, color: 'bg-emerald-600', dot: 'bg-emerald-600', width: '0%', pct: '0%' }
            ].map((stage, i) => (
              <div key={i} className="flex items-center gap-4 group">
                <div className="w-40 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <span className={`w-2 h-2 rounded-full ${stage.dot}`}></span>
                  {stage.label}
                </div>
                <div className="flex-1 flex items-center gap-3">
                  <div className="font-bold text-slate-800 w-6">{stage.count}</div>
                  <div className="flex-1 h-8 bg-slate-50 rounded-lg overflow-hidden relative border border-slate-100 group-hover:bg-slate-100 transition-colors">
                    <div className={`h-full ${stage.color} opacity-20`} style={{ width: stage.width }}></div>
                  </div>
                  <div className="w-10 text-right text-xs font-bold text-slate-400">{stage.pct}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
