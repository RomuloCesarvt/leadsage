import { useEffect, useRef } from 'react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';

/**
 * "Chamar no WhatsApp" pelo número CONECTADO.
 *
 * Os botões de WhatsApp do app são links wa.me: abrem o WhatsApp do aparelho, que pode ser outro número que não o conectado ao LeadSage.
 * Com o WhatsApp conectado (Conector ou nuvem) e online, o toque abre o editor de mensagem do lead, que envia pelo número conectado
 * (na fila de segurança, com o limite diário). Sem conexão, o link wa.me funciona como sempre.
 * Fica num lugar só, em vez de cada tela decidir: vale para o Pipeline, "Precisa de você", o perfil do lead e a presença digital.
 */

const digitos = (t: string) => (t || '').replace(/\D/g, '');

export const ChamarPeloWhatsConectado: React.FC = () => {
  const { leads, setSelectedLeadForMessage, user } = useApp() as any;
  const online = useRef(false);
  const leadsRef = useRef<any[]>([]);
  leadsRef.current = leads || [];

  useEffect(() => {
    if (!user) { online.current = false; return; }
    let vivo = true;
    const ver = () => api.conectorFila().then(e => { if (vivo) online.current = !!e?.online; }).catch(() => { if (vivo) online.current = false; });
    ver();
    const t = setInterval(ver, 60000);
    return () => { vivo = false; clearInterval(t); };
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const aoClicar = (e: MouseEvent) => {
      if (!online.current) return;
      const a = (e.target as HTMLElement | null)?.closest?.('a[href^="https://wa.me/"]') as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.getAttribute('href') || '';
      if (href.includes('?text=') || a.dataset.semConector) return;           // link com mensagem pronta (lembretes, suporte): segue como está
      const numero = digitos(href.split('wa.me/')[1] || '');
      if (numero.length < 10) return;
      const nacional = numero.length > 11 ? numero.slice(-11) : numero;
      const lead = leadsRef.current.find(l => {
        const d = digitos(l.phone);
        return d && (d === numero || d.endsWith(nacional) || nacional.endsWith(d.slice(-10)));
      }) || { id: `tel_${numero}`, name: `+${numero}`, company: '', phone: numero, whatsapp: true, socials: {} };
      e.preventDefault();
      e.stopPropagation();
      setSelectedLeadForMessage({ ...lead, phone: lead.phone || numero, best_channel: 'whatsapp' });
    };
    document.addEventListener('click', aoClicar, true);
    return () => document.removeEventListener('click', aoClicar, true);
  }, [setSelectedLeadForMessage]);

  return null;
};
