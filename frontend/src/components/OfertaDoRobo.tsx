/**
 * O serviço que o robô vende, em campos.
 *
 * O dono escolhe o serviço e preenche o que o robô pode prometer: preço,
 * prazo, o que inclui, esboço, pagamento. O robô só diz o que estiver aqui;
 * o preço cadastrado é o único valor que ele pode citar.
 */
import React from 'react';
import { Globe, MapPin, Share2, Megaphone, Sparkles, Info } from 'lucide-react';
import type { OfertaRobo } from '../types';

type Servico = OfertaRobo['servico'];

const SERVICOS: { id: Servico; nome: string; icone: React.FC<{ className?: string }>; nomePadrao: string; inclui: string }[] = [
  { id: 'site', nome: 'Site', icone: Globe, nomePadrao: 'Site profissional',
    inclui: 'Site responsivo com a sua marca, serviços, fotos, avaliações do Google, mapa e botão de WhatsApp, publicado no ar.' },
  { id: 'gmn', nome: 'Google Meu Negócio', icone: MapPin, nomePadrao: 'Otimização do Google Meu Negócio',
    inclui: 'Perfil do Google completo: categorias, descrição, horários, fotos, serviços, posts e resposta às avaliações.' },
  { id: 'social', nome: 'Redes sociais', icone: Share2, nomePadrao: 'Gestão de redes sociais',
    inclui: 'Calendário de posts, criativos, legendas, publicação e relatório mensal.' },
  { id: 'trafego', nome: 'Anúncios', icone: Megaphone, nomePadrao: 'Gestão de anúncios',
    inclui: 'Criação e gestão de campanhas, públicos, criativos e relatório de resultados.' },
  { id: 'outro', nome: 'Outro', icone: Sparkles, nomePadrao: '', inclui: '' },
];

const VAZIA: OfertaRobo = {
  servico: 'site', nome: '', preco: '', prazo_dias: '', inclui: '', nao_inclui: '', esboco: 'gratis',
  esboco_prazo: '', esboco_preco: '', pagamento: '', revisoes: '', garantia: '', diferenciais: '',
};

const campo = 'w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500';
const rotulo = 'block text-xs font-bold text-slate-600 mb-1.5';

const brl = (v: string | number) => {
  const n = Number(String(v).replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, ''));
  return n > 0 ? `R$ ${n.toLocaleString('pt-BR')}` : '';
};

export const OfertaDoRobo: React.FC<{ valor?: Partial<OfertaRobo>; onChange: (o: OfertaRobo) => void }> = ({ valor, onChange }) => {
  const o: OfertaRobo = { ...VAZIA, ...(valor || {}) };
  const set = <K extends keyof OfertaRobo>(k: K, v: OfertaRobo[K]) => onChange({ ...o, [k]: v });

  const escolher = (id: Servico) => {
    const s = SERVICOS.find(x => x.id === id)!;
    // trocar de servico troca o texto-base, sem apagar preco, prazo nem pagamento
    onChange({
      ...o, servico: id, nome: s.nomePadrao, inclui: s.inclui,
      esboco: id === 'site' ? (o.esboco || 'gratis') : o.esboco,
    });
  };

  const preco = brl(o.preco);
  const resumo = [
    `${o.nome || 'O serviço'}${preco ? ` por ${preco}` : ''}${Number(o.prazo_dias) ? `, entrega em ${o.prazo_dias} dias` : ''}.`,
    o.esboco === 'gratis' ? `Esboço grátis${o.esboco_prazo ? ` ${o.esboco_prazo}` : ''}, sem compromisso.` : '',
    o.esboco === 'pago' ? `Esboço pago${brl(o.esboco_preco) ? ` (${brl(o.esboco_preco)})` : ''}.` : '',
    o.pagamento ? `Pagamento: ${o.pagamento}.` : '',
  ].filter(Boolean).join(' ');

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <h2 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-blue-600" /> Serviço que o robô vende
      </h2>
      <p className="text-sm text-slate-500 mb-5">
        Escolha o que ele oferece agora e o que pode prometer. O que não estiver aqui, o robô não diz.
      </p>

      <div className="flex flex-wrap gap-2 mb-5">
        {SERVICOS.map(s => {
          const Icone = s.icone;
          return (
            <button key={s.id} type="button" onClick={() => escolher(s.id)}
              className={`px-3.5 py-2 rounded-xl border text-sm font-bold flex items-center gap-2 transition-colors ${
                o.servico === s.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'
              }`}>
              <Icone className="w-4 h-4" /> {s.nome}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-3">
          <label className={rotulo}>Nome do serviço, como o robô fala</label>
          <input value={o.nome} onChange={e => set('nome', e.target.value)} placeholder="Ex.: Site profissional" className={campo} />
        </div>
        <div>
          <label className={rotulo}>Preço (R$)</label>
          <input inputMode="decimal" value={o.preco} onChange={e => set('preco', e.target.value)} placeholder="Ex.: 1500" className={campo} />
        </div>
        <div>
          <label className={rotulo}>Prazo de entrega (dias)</label>
          <input inputMode="numeric" value={o.prazo_dias} onChange={e => set('prazo_dias', e.target.value)} placeholder="Ex.: 7" className={campo} />
        </div>
        <div>
          <label className={rotulo}>Esboço antes de fechar</label>
          <select value={o.esboco} onChange={e => set('esboco', e.target.value as OfertaRobo['esboco'])} className={campo}>
            <option value="gratis">Grátis e sem compromisso</option>
            <option value="pago">Pago</option>
            <option value="nao">Não faço esboço</option>
          </select>
        </div>

        {o.esboco === 'gratis' && (
          <div className="md:col-span-3">
            <label className={rotulo}>Em quanto tempo entrega o esboço</label>
            <input value={o.esboco_prazo} onChange={e => set('esboco_prazo', e.target.value)} placeholder="Ex.: em até 48 horas" className={campo} />
          </div>
        )}
        {o.esboco === 'pago' && (
          <div className="md:col-span-3">
            <label className={rotulo}>Preço do esboço (R$)</label>
            <input inputMode="decimal" value={o.esboco_preco} onChange={e => set('esboco_preco', e.target.value)} className={campo} />
          </div>
        )}

        <div className="md:col-span-3">
          <label className={rotulo}>O que está incluso</label>
          <textarea rows={3} value={o.inclui} onChange={e => set('inclui', e.target.value)} className={`${campo} resize-none`} />
        </div>
        <div className="md:col-span-3">
          <label className={rotulo}>O que NÃO está incluso (o robô avisa se perguntarem)</label>
          <textarea rows={2} value={o.nao_inclui} onChange={e => set('nao_inclui', e.target.value)}
            placeholder="Ex.: domínio e hospedagem ficam por conta do cliente" className={`${campo} resize-none`} />
        </div>
        <div className="md:col-span-3">
          <label className={rotulo}>Forma de pagamento</label>
          <input value={o.pagamento} onChange={e => set('pagamento', e.target.value)}
            placeholder="Ex.: 50% na aprovação do esboço e 50% na entrega; cartão em até 6x" className={campo} />
        </div>
        <div>
          <label className={rotulo}>Ajustes inclusos</label>
          <input value={o.revisoes} onChange={e => set('revisoes', e.target.value)} placeholder="Ex.: 2 rodadas" className={campo} />
        </div>
        <div className="md:col-span-2">
          <label className={rotulo}>Garantia (opcional)</label>
          <input value={o.garantia} onChange={e => set('garantia', e.target.value)} className={campo} />
        </div>
        <div className="md:col-span-3">
          <label className={rotulo}>Diferenciais reais (opcional)</label>
          <input value={o.diferenciais} onChange={e => set('diferenciais', e.target.value)}
            placeholder="Só o que é verdade: o robô não inventa outros" className={campo} />
        </div>
      </div>

      <div className="mt-5 p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 text-[13px] text-blue-900 leading-relaxed flex gap-2.5">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          <b>O robô vai dizer:</b> {resumo}
          {!preco && <div className="mt-1 text-amber-700">Sem preço cadastrado ele não cita valor: diz que depende do escopo e leva para a conversa.</div>}
          {!Number(o.prazo_dias) && <div className="text-amber-700">Sem prazo cadastrado ele não promete data.</div>}
        </div>
      </div>
    </div>
  );
};
