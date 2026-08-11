import React, { useState } from 'react';
import { 
  X, 
  Coins, 
  CreditCard, 
  QrCode, 
  ShieldCheck, 
  Zap, 
  Loader2 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';

export const CreditModal: React.FC = () => {
  const { isCreditModalOpen, setIsCreditModalOpen, user, setUser } = useApp();
  const [selectedPackage, setSelectedPackage] = useState<number>(250);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card'>('pix');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  if (!isCreditModalOpen) return null;

  const packages = [
    { amount: 100, price: 'R$ 49', bonus: '100 Leads', popular: false },
    { amount: 250, price: 'R$ 99', bonus: '250 Leads + IA Copy', popular: true },
    { amount: 600, price: 'R$ 199', bonus: '600 Leads + Envio Ilimitado', popular: false },
  ];

  const handleTopUp = async () => {
    setIsProcessing(true);
    try {
      const res = await api.topUpCredits(selectedPackage, paymentMethod);
      setUser(prev => prev ? { ...prev, credits: res.new_balance } : prev);

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.5 }
      });

      alert(`Recarga realizada com sucesso! Saldo atual: ${res.new_balance} Créditos.`);
      setIsCreditModalOpen(false);
    } catch (err) {
      alert("Erro ao realizar recarga de créditos.");
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
                  key={pkg.amount}
                  onClick={() => setSelectedPackage(pkg.amount)}
                  className={`p-4 rounded-xl border flex flex-col items-center text-center transition-all relative ${
                    selectedPackage === pkg.amount
                      ? 'bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/30'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {pkg.popular && (
                    <span className="absolute -top-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-indigo-600 text-white text-[9px] font-extrabold tracking-wider uppercase">
                      Mais Vendido
                    </span>
                  )}
                  <span className="text-lg font-extrabold text-amber-400 mt-1">{pkg.amount} CR</span>
                  <span className="text-sm font-bold text-slate-100">{pkg.price}</span>
                  <span className="text-[10px] text-slate-400 mt-1">{pkg.bonus}</span>
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

        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <button
            onClick={() => setIsCreditModalOpen(false)}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
          >
            Cancelar
          </button>
          <button
            onClick={handleTopUp}
            disabled={isProcessing}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Confirmando...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                <span>Confirmar Recarga de {selectedPackage} CR</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
