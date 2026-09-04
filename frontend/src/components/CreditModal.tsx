import React, { useState, useEffect } from 'react';
import { 
  X, 
  Coins, 
  CreditCard, 
  QrCode, 
  ShieldCheck, 
  Zap, 
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import type { CreditPackage } from '../types';

export const CreditModal: React.FC = () => {
  const { isCreditModalOpen, setIsCreditModalOpen, user } = useApp();
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<string>('pro');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card'>('pix');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [erro, setErro] = useState('');
  const [provider, setProvider] = useState<string | null>(null);

  // O catálogo vem do servidor: preço que viaja pelo request é preço que
  // o cliente escolhe.
  useEffect(() => {
    if (!isCreditModalOpen) return;
    setErro('');
    api.listarPacotes().then(({ packages: lista, provider: prov }) => {
      setPackages(lista);
      setProvider(prov);
      const destaque = lista.find(p => p.destaque);
      if (destaque) setSelectedPackage(destaque.id);
    });
  }, [isCreditModalOpen]);

  if (!isCreditModalOpen) return null;

  const handleTopUp = async () => {
    setIsProcessing(true);
    setErro('');
    try {
      const { checkout_url } = await api.iniciarCompra(selectedPackage);
      // O crédito NÃO entra aqui. O pedido nasce pendente e só é
      // liberado pelo webhook, depois do provedor confirmar.
      if (checkout_url) {
        window.location.href = checkout_url;
      } else {
        setErro('Pagamento ainda não está ativo. Nenhuma cobrança foi feita.');
      }
    } catch (err: any) {
      setErro(err?.message || 'Não foi possível iniciar a compra.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <Coins className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Gestão & Recarga de Créditos
              </h3>
              <p className="text-xs text-slate-400">
                Saldo Atual: <strong className="text-amber-400 font-extrabold">{user?.credits ?? 0} CR</strong>
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsCreditModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">Escolha o Pacote de Créditos</label>
            <div className="grid grid-cols-3 gap-3">
              {packages.map((pkg) => (
                <button
                  key={pkg.id}
                  onClick={() => setSelectedPackage(pkg.id)}
                  className={`p-4 rounded-xl border flex flex-col items-center text-center transition-all relative ${
                    selectedPackage === pkg.id
                      ? 'bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/30'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {pkg.destaque && (
                    <span className="absolute -top-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-indigo-600 text-white text-[9px] font-extrabold tracking-wider uppercase">
                      Mais Vendido
                    </span>
                  )}
                  <span className="text-lg font-extrabold text-amber-400 mt-1">{pkg.credits} CR</span>
                  <span className="text-sm font-bold text-slate-100">{pkg.preco}</span>
                  <span className="text-[10px] text-slate-400 mt-1">{pkg.descricao}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">Forma de Pagamento</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('pix')}
                className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                  paymentMethod === 'pix'
                    ? 'bg-emerald-950/30 border-emerald-500 text-emerald-400'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <QrCode className="w-4 h-4 text-emerald-400" /> Pix (Aprovação Instantânea)
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                  paymentMethod === 'card'
                    ? 'bg-indigo-950/30 border-indigo-500 text-indigo-400'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <CreditCard className="w-4 h-4 text-indigo-400" /> Cartão de Crédito
              </button>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>Sem fidelidade ou mensalidade compulsória. Os créditos nunca expiram.</span>
          </div>
        </div>

        {/* Estado do pagamento */}
          {(erro || !provider) && (
            <div className="w-full mb-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-semibold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
              <span>
                {erro || 'A cobrança ainda não está ativa. Nenhum crédito é liberado sem pagamento confirmado.'}
              </span>
            </div>
          )}
          <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <button
            onClick={() => setIsCreditModalOpen(false)}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
          >
            Cancelar
          </button>
          <button
            onClick={handleTopUp}
            disabled={isProcessing || !provider}
            title={provider ? '' : 'Pagamento ainda não configurado'}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Abrindo pagamento...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                <span>Comprar {packages.find(p => p.id === selectedPackage)?.credits ?? ''} créditos</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
