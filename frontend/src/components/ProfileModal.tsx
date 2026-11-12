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
import { X, User, Building2, Mail, Briefcase, Check, Sparkles, AlertCircle, CreditCard, Coins, Layers } from 'lucide-react';
import { modoDaConta } from '../lib/modoDaConta';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { signOut } from 'firebase/auth';
import { esquecerSessao } from '../lib/sessao';
import { auth } from '../lib/firebase';

const rotulo = 'block text-sm font-bold text-slate-700 mb-1.5 flex items-center gap-1.5';
const campo =
  'w-full min-h-12 md:min-h-0 px-4 py-2.5 text-base md:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 ' +
  'placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors';

export const ProfileModal: React.FC = () => {
  const { isProfileModalOpen, setIsProfileModalOpen, user, setUser, setViewState } = useApp() as any;

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
      className="fixed inset-0 z-[70] bg-slate-900/40 backdrop-blur-sm flex items-end md:items-center justify-center md:p-4"
      onClick={fechar}
    >
      <div
        className="bg-white border border-slate-200 rounded-t-3xl md:rounded-2xl w-full md:max-w-lg overflow-hidden shadow-2xl h-[94dvh] md:h-auto md:max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-4 md:px-6 py-3 md:py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
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
            className="w-11 h-11 md:w-auto md:h-auto md:p-1.5 flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 active:bg-slate-100 transition-colors"
          >
            <X className="w-6 h-6 md:w-5 md:h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-4 md:p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 min-h-0">
          {/* a conta: modo, plano e créditos moram aqui, no perfil, e não no meio do painel de leads */}
          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4" data-testid="sua-conta">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Sua conta</p>
            <dl className="grid grid-cols-1 min-[420px]:grid-cols-3 gap-3">
              <div className="flex min-[420px]:block items-center gap-3">
                <dt className="text-[13px] text-slate-500 flex items-center gap-1.5 min-w-[7rem] min-[420px]:min-w-0"><Layers className="w-4 h-4 text-blue-600" /> Modo</dt>
                <dd className="text-[15px] font-bold text-slate-900 min-[420px]:mt-1">{modoDaConta(user) === 'empresa' ? 'Empresa' : 'Agência'}</dd>
              </div>
              <div className="flex min-[420px]:block items-center gap-3">
                <dt className="text-[13px] text-slate-500 flex items-center gap-1.5 min-w-[7rem] min-[420px]:min-w-0"><CreditCard className="w-4 h-4 text-blue-600" /> Plano</dt>
                <dd className="text-[15px] font-bold text-slate-900 min-[420px]:mt-1 break-words">{user?.plan || 'Prévia'}</dd>
              </div>
              <div className="flex min-[420px]:block items-center gap-3">
                <dt className="text-[13px] text-slate-500 flex items-center gap-1.5 min-w-[7rem] min-[420px]:min-w-0"><Coins className="w-4 h-4 text-blue-600" /> Créditos</dt>
                <dd className="text-[15px] font-bold text-slate-900 min-[420px]:mt-1">{user?.semDados ? '—' : (user?.credits ?? 0)}</dd>
              </div>
            </dl>
            {user?.licenca_ate && <p className="text-[13px] text-slate-500 mt-3">Licença válida até <b className="text-slate-700">{new Date(user.licenca_ate).toLocaleDateString('pt-BR')}</b></p>}
            {!user?.oculta_assinatura && (
              <button type="button" onClick={() => { fechar(); setViewState('subscription'); }}
                className="mt-3 w-full min-h-12 md:min-h-0 md:py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-800 text-white text-[15px] md:text-sm font-bold">
                Ver planos e assinatura
              </button>
            )}
          </section>

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

        <div className="px-4 md:px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:py-4 border-t border-slate-100 flex flex-col-reverse md:flex-row md:items-center md:justify-between gap-2 md:gap-3 shrink-0">
          <button
            type="button"
            onClick={async () => {
              esquecerSessao();   // saída de propósito: o app não estranha a falta de login no próximo F5
              await signOut(auth);
              fechar();
            }}
            className="min-h-11 md:min-h-0 px-3 py-2 text-[15px] md:text-sm font-semibold text-red-600 hover:bg-red-50 active:bg-red-50 rounded-xl transition-colors"
          >
            Sair da conta
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={fechar}
              className="min-h-12 md:min-h-0 px-4 py-2.5 text-[15px] md:text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 md:flex-none min-h-12 md:min-h-0 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-bold text-[15px] md:text-sm flex items-center justify-center gap-2 shadow-sm transition-colors"
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
