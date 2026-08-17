import React from 'react';
import { Save, User, Shield, Target } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const SettingsScreen: React.FC = () => {
  const { user } = useApp() as any;

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar max-w-5xl mx-auto w-full">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">Configurações</h1>
        <p className="text-slate-500 text-sm mt-1">Gerencie suas preferências de prospecção e perfil da conta.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col - Navigation (Optional/Static in UI) */}
        <div className="col-span-1 space-y-2 hidden lg:block">
          <button className="w-full text-left px-4 py-3 bg-blue-50 text-blue-600 font-bold rounded-xl text-sm transition-colors">
            Preferências de Prospecção
          </button>
          <button className="w-full text-left px-4 py-3 hover:bg-slate-50 text-slate-600 font-medium rounded-xl text-sm transition-colors flex items-center gap-2">
            <User className="w-4 h-4" /> Perfil da Conta
          </button>
          <button className="w-full text-left px-4 py-3 hover:bg-slate-50 text-slate-600 font-medium rounded-xl text-sm transition-colors flex items-center gap-2">
            <Shield className="w-4 h-4" /> Segurança
          </button>
        </div>

        {/* Right Col - Forms */}
        <div className="col-span-1 lg:col-span-2 space-y-8">
          
          {/* Prospecção Form */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" /> Preferências de Prospecção
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-3">O que você vende?</label>
                <div className="flex flex-wrap gap-2">
                  {['Criação de Sites', 'Tráfego Pago', 'Social Media', 'Design', 'Consultoria'].map((item, i) => (
                    <button key={item} className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${i === 0 ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-3">Nichos que mais prospecta</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {['Clínicas', 'Imobiliárias', 'Advogados', 'Restaurantes'].map((item) => (
                    <div key={item} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-medium flex items-center gap-2">
                      {item} <span className="text-slate-400 hover:text-slate-600 cursor-pointer">&times;</span>
                    </div>
                  ))}
                </div>
                <input type="text" placeholder="Adicionar nicho..." className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-3">Cidades de atuação (opcional)</label>
                <input type="text" placeholder="Ex: São Paulo, SP" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
              <button className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2">
                <Save className="w-4 h-4" /> Salvar preferências
              </button>
            </div>
          </div>

          {/* Perfil Form */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" /> Dados da Conta
            </h2>

            <div className="flex items-center gap-6 mb-8">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                <img src={user?.avatar} alt="Avatar" className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg">{user?.name}</h3>
                <p className="text-slate-500">{user?.email}</p>
                <button className="mt-2 text-sm font-bold text-blue-600 hover:underline">Alterar foto</button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nome Completo</label>
                <input type="text" defaultValue={user?.name} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">E-mail</label>
                <input type="email" defaultValue={user?.email} readOnly className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed" />
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
