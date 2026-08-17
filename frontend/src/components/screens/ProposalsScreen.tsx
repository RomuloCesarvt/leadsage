import React from 'react';


export const ProposalsScreen: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col h-full relative">
      
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">Propostas</h1>
        <p className="text-slate-500 text-sm mt-1">Modelos de propostas comerciais de alta conversão.</p>
      </div>

      <div className="flex-1 relative">
        {/* Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {['Minimalista', 'Premium', 'Corporativo', 'Criativo'].map((title, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center">
              <div className="w-24 h-32 bg-slate-100 rounded-xl mb-4 border border-slate-200 shadow-sm relative overflow-hidden">
                {/* Fake document skeleton */}
                <div className="absolute top-4 left-4 w-12 h-2 bg-slate-200 rounded"></div>
                <div className="absolute top-8 left-4 w-16 h-2 bg-slate-200 rounded"></div>
                <div className="absolute top-14 left-4 right-4 h-1 bg-slate-200 rounded"></div>
                <div className="absolute top-18 left-4 right-4 h-1 bg-slate-200 rounded"></div>
              </div>
              <h3 className="font-bold text-slate-800 mb-4">{title}</h3>
              <div className="flex flex-col w-full gap-2">
                <button className="w-full py-2 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200 transition-colors">Visualizar</button>
                <button className="w-full py-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors">Usar este modelo</button>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
