import React, { useState } from 'react';
import { X, User, Building2, Mail, Briefcase, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

export const ProfileModal: React.FC = () => {
  const { isProfileModalOpen, setIsProfileModalOpen, user, setUser } = useApp();

  const [name, setName] = useState(user?.name || '');
  const [company, setCompany] = useState(user?.company_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [niche, setNiche] = useState(user?.niche_focus || '');
  const [isSaving, setIsSaving] = useState(false);

  if (!isProfileModalOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updated = await api.updateProfile({
        name,
        company_name: company,
        email,
        niche_focus: niche
      });
      setUser(updated);
      setIsProfileModalOpen(false);
    } catch (err) {
      alert("Erro ao salvar perfil.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <img src={user?.avatar || ''} alt={user?.name || ''} className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-500/40" />
            <div>
              <h3 className="text-base font-bold text-slate-100">Personalização de Perfil</h3>
              <p className="text-xs text-slate-400">Dados utilizados pela IA nas assinaturas de e-mail</p>
            </div>
          </div>
          <button onClick={() => setIsProfileModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-400" /> Seu Nome Completo
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-emerald-400" /> Nome da Empresa ou Marca
            </label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-amber-400" /> E-mail Comercial
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-purple-400" /> Nicho Principal de Atuação
            </label>
            <input
              type="text"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="pt-4 flex items-center justify-between gap-3 border-t border-slate-800 mt-4">
            <button
              type="button"
              onClick={async () => {
                await signOut(auth);
                setIsProfileModalOpen(false);
              }}
              className="px-4 py-2 text-xs font-semibold text-red-400 hover:text-red-300 flex items-center gap-1.5"
            >
              Sair da Conta
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/30"
              >
                <Check className="w-4 h-4" /> Salvar Perfil
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
