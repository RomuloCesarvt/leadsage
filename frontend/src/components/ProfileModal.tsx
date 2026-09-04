/**
 * Edição rápida do perfil.
 *
 * Ficava em azul-marinho escuro enquanto o resto do app é claro — abria
 * como se fosse de outro produto. Agora usa a mesma paleta das telas.
 *
 * O outro defeito era mais silencioso: o componente fica montado desde o
 * início do app, e o estado era iniciado uma única vez, quando `user`
 * ainda era nulo. Quem entrasse e abrisse o perfil via os campos vazios.
 * O efeito abaixo recarrega os valores toda vez que o modal abre.
 */
import React, { useEffect, useState } from 'react';
import { X, User, Building2, Mail, Briefcase, Check, Sparkles, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

const rotulo = 'block text-sm font-bold text-slate-700 mb-1.5 flex items-center gap-1.5';
const campo =
  'w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 ' +
  'placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors';

export const ProfileModal: React.FC = () => {
  const { isProfileModalOpen, setIsProfileModalOpen, user, setUser } = useApp();

  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [niche, setNiche] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!isProfileModalOpen) return;
    setName(user?.name || '');
    setCompany(user?.company_name || '');
    setEmail(user?.email || '');
    setNiche(user?.niche_focus || '');
    setProductDescription(user?.product_description || '');
    setErro('');
  }, [isProfileModalOpen, user]);

  if (!isProfileModalOpen) return null;

  const fechar = () => setIsProfileModalOpen(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErro('');
    try {
      const updated = await api.updateProfile({
        name,
        company_name: company,
        email,
        niche_focus: niche,
        product_description: productDescription,
      });
      setUser(updated);
      fechar();
    } catch (err: any) {
      // Antes era um alert() que sumia sem dizer o que houve.
      setErro(err?.message || 'Não foi possível salvar. Tente de novo.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={fechar}
    >
      <div
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <img
              src={user?.avatar || ''}
              alt={user?.name || ''}
              className="w-10 h-10 rounded-full object-cover bg-slate-100 border border-slate-200"
            />
            <div>
              <h3 className="text-base font-bold text-slate-800">Seu perfil</h3>
              <p className="text-xs text-slate-500">A IA usa estes dados para assinar as mensagens</p>
            </div>
          </div>
          <button
            onClick={fechar}
            aria-label="Fechar"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
          <div>
            <label className={rotulo}>
              <User className="w-4 h-4 text-blue-600" /> Seu nome completo
            </label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className={campo} />
          </div>

          <div>
            <label className={rotulo}>
              <Building2 className="w-4 h-4 text-blue-600" /> Nome da empresa ou marca
            </label>
            <input type="text" value={company} onChange={e => setCompany(e.target.value)} className={campo} />
          </div>

          <div>
            <label className={rotulo}>
              <Mail className="w-4 h-4 text-blue-600" /> E-mail comercial
            </label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={campo} />
          </div>

          <div>
            <label className={rotulo}>
              <Briefcase className="w-4 h-4 text-blue-600" /> Nicho principal de atuação
            </label>
            <input
              type="text"
              value={niche}
              onChange={e => setNiche(e.target.value)}
              placeholder="Padarias, clínicas, advocacia..."
              className={campo}
            />
          </div>

          <div>
            <label className={rotulo}>
              <Sparkles className="w-4 h-4 text-blue-600" /> Seu produto ou oferta
            </label>
            <textarea
              rows={3}
              value={productDescription}
              onChange={e => setProductDescription(e.target.value)}
              placeholder="O que você vende, que problema resolve e o seu diferencial. A IA escreve as abordagens a partir disto."
              className={`${campo} resize-none custom-scrollbar`}
            />
          </div>

          {erro && (
            <p className="text-sm font-semibold text-red-600 flex items-start gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {erro}
            </p>
          )}
        </form>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={async () => {
              await signOut(auth);
              fechar();
            }}
            className="px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            Sair da conta
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={fechar}
              className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-bold text-sm flex items-center gap-2 shadow-sm transition-colors"
            >
              {isSaving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" /> Salvar perfil
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
