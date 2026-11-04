/**
 * O serviço que o robô vende, em campos.
 *
 * O dono escolhe o serviço e preenche o que o robô pode prometer: preço,
 * prazo, o que inclui, esboço, pagamento. O robô só diz o que estiver aqui;
 * o preço cadastrado é o único valor que ele pode citar.
 */
import React from 'react';
import { Globe, MapPin, Share2, Megaphone, Sparkles, Info, Wind } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ehEmpresa } from '../lib/modoDaConta';
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
  { id: 'ar', nome: 'Ar-condicionado', icone: Wind, nomePadrao: 'Instalação, limpeza e manutenção de ar-condicionado',
    inclui: 'Instalação, higienização, manutenção preventiva e corretiva de aparelhos de ar-condicionado, com técnico qualificado.' },
  { id: 'outro', nome: 'Outro', icone: Sparkles, nomePadrao: '', inclui: '' },
];

const VAZIA: OfertaRobo = {
  servico: 'site', nome: '', preco: '', prazo_dias: '', inclui: '', nao_inclui: '', esboco: 'gratis',
  esboco_prazo: '', esboco_preco: '', pagamento: '', revisoes: '', garantia: '', diferenciais: '',
  pix_chave: '', pix_titular: '', pix_banco: '', sinal_percentual: '', itens_do_cliente: '', dados_do_contrato: '',
  tabela_precos: '', regiao: '', visita: 'gratis', visita_preco: '', agenda: '',
};

const campo = 'w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500';
const rotulo = 'block text-xs font-bold text-slate-600 mb-1.5';

const brl = (v: string | number) => {
  const n = Number(String(v).replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, ''));
  return n > 0 ? `R$ ${n.toLocaleString('pt-BR')}` : '';
};

export const OfertaDoRobo: React.FC<{ valor?: Partial<OfertaRobo>; onChange: (o: OfertaRobo) => void }> = ({ valor, onChange }) => {
  const { user } = useApp() as any;
  const empresa = ehEmpresa(user);
  // conta empresa nasce vendendo o serviço local; conta agência não vê a opção de ar-condicionado
  const o: OfertaRobo = { ...VAZIA, ...(empresa && !valor?.servico ? { servico: 'ar', nome: SERVICOS.find(x => x.id === 'ar')!.nomePadrao } : {}), ...(valor || {}) };
  const opcoes = SERVICOS.filter(s => (empresa ? ['ar', 'outro'].includes(s.id) : s.id !== 'ar'));
  const local = o.servico === 'ar';
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
    o.fechamento === 'checklist' && o.pix_chave ? `Ao fechar, manda o Pix${Number(o.sinal_percentual) ? ` (sinal de ${o.sinal_percentual}%)` : ''} e o checklist do que precisa receber.` : '',
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
        {opcoes.map(s => {
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
        {local && (<>
        <div className="md:col-span-3">
          <label className={rotulo}>Tabela de preços (uma linha por serviço; o robô só cita estes valores)</label>
          <textarea rows={5} value={o.tabela_precos || ''} onChange={e => set('tabela_precos', e.target.value)}
            placeholder={'Limpeza de split 9 a 12 mil BTU: R$ 150\nInstalação de split: R$ 450\nCarga de gás: R$ 250'} className={`${campo} resize-none`} />
        </div>
        <div className="md:col-span-2">
          <label className={rotulo}>Região atendida (fora dela o robô diz que não atende)</label>
          <input value={o.regiao || ''} onChange={e => set('regiao', e.target.value)} placeholder="Ex.: Botucatu e cidades vizinhas até 40 km" className={campo} />
        </div>
        <div>
          <label className={rotulo}>Visita para orçamento</label>
          <select value={o.visita || 'gratis'} onChange={e => set('visita', e.target.value as OfertaRobo['visita'])} className={campo}>
            <option value="gratis">Grátis e sem compromisso</option>
            <option value="paga">Paga</option>
            <option value="nao">Não faço visita (orçamento por mensagem)</option>
          </select>
        </div>
        {o.visita === 'paga' && (
          <div>
            <label className={rotulo}>Valor da visita (R$)</label>
            <input inputMode="decimal" value={o.visita_preco ?? ''} onChange={e => set('visita_preco', e.target.value)} className={campo} />
          </div>
        )}
        <div className={o.visita === 'paga' ? 'md:col-span-2' : 'md:col-span-3'}>
          <label className={rotulo}>Dias e horários de atendimento (o robô oferece horários dentro disto)</label>
          <input value={o.agenda || ''} onChange={e => set('agenda', e.target.value)} placeholder="Ex.: segunda a sábado, das 8h às 18h" className={campo} />
        </div>
        </>)}
        {!local && (<div>
          <label className={rotulo}>Esboço antes de fechar</label>
          <select value={o.esboco} onChange={e => set('esboco', e.target.value as OfertaRobo['esboco'])} className={campo}>
            <option value="gratis">Grátis e sem compromisso</option>
            <option value="pago">Pago</option>
            <option value="nao">Não faço esboço</option>
          </select>
        </div>)}

        {!local && o.esboco === 'gratis' && (
          <div className="md:col-span-3">
            <label className={rotulo}>Em quanto tempo entrega o esboço</label>
            <input value={o.esboco_prazo} onChange={e => set('esboco_prazo', e.target.value)} placeholder="Ex.: em até 48 horas" className={campo} />
          </div>
        )}
        {!local && o.esboco === 'pago' && (
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

        {!local && (<>
        <div className="md:col-span-3 mt-2 pt-4 border-t border-slate-100">
          <h3 className="text-sm font-bold text-slate-800">Quando o lead diz “quero fechar”</h3>
          <p className="text-xs text-slate-500 mt-0.5">O robô só usa o que estiver cadastrado; o que faltar, ele avisa você.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            {([
              ['conversa', 'Levar para uma conversa (recomendado)', 'Deixa claro que o que ele viu é uma prévia (entram as fotos dele e o layout pode mudar) e convida para uma conversa rápida, em que você mostra como melhorar e acerta pagamento e contrato.'],
              ['checklist', 'Mandar o checklist de fechamento', 'Manda o resumo, a chave Pix e a lista do que o cliente precisa enviar (comprovante, dados do contrato, logo, fotos...).'],
            ] as const).map(([id, titulo, texto]) => (
              <button key={id} type="button" onClick={() => set('fechamento', id)} aria-pressed={(o.fechamento || 'conversa') === id}
                className={`text-left p-3.5 rounded-xl border-2 transition-colors ${(o.fechamento || 'conversa') === id ? 'border-blue-500 bg-blue-50/60' : 'border-slate-200 hover:border-slate-300'}`}>
                <span className="block text-sm font-bold text-slate-800">{titulo}</span>
                <span className="block text-xs text-slate-500 mt-0.5 leading-relaxed">{texto}</span>
              </button>
            ))}
          </div>
        </div>
        {o.fechamento === 'checklist' && (<>
        <div className="md:col-span-2">
          <label className={rotulo}>Chave Pix</label>
          <input value={o.pix_chave || ''} onChange={e => set('pix_chave', e.target.value)} placeholder="CNPJ, e-mail, telefone ou chave aleatória" className={campo} />
        </div>
        <div>
          <label className={rotulo}>Sinal para começar (%)</label>
          <input inputMode="numeric" value={o.sinal_percentual ?? ''} onChange={e => set('sinal_percentual', e.target.value)} placeholder="Ex.: 50" className={campo} />
        </div>
        <div className="md:col-span-2">
          <label className={rotulo}>Nome do titular do Pix</label>
          <input value={o.pix_titular || ''} onChange={e => set('pix_titular', e.target.value)} placeholder="Como aparece para quem vai pagar" className={campo} />
        </div>
        <div>
          <label className={rotulo}>Banco (opcional)</label>
          <input value={o.pix_banco || ''} onChange={e => set('pix_banco', e.target.value)} className={campo} />
        </div>
        <div className="md:col-span-3">
          <label className={rotulo}>Dados que você precisa para o contrato</label>
          <input value={o.dados_do_contrato || ''} onChange={e => set('dados_do_contrato', e.target.value)}
            placeholder="Ex.: Nome completo ou razão social, CPF/CNPJ, e-mail e endereço" className={campo} />
        </div>
        <div className="md:col-span-3">
          <label className={rotulo}>O que o cliente precisa mandar (um item por linha; vazio = lista padrão do serviço)</label>
          <textarea rows={4} value={o.itens_do_cliente || ''} onChange={e => set('itens_do_cliente', e.target.value)}
            placeholder={'Logo\nFotos do negócio\nTextos dos serviços\nAcesso ao Instagram'} className={`${campo} resize-none`} />
        </div>
        </>)}
        </>)}
        {local && (
          <div className="md:col-span-3 p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-xs text-emerald-900 leading-relaxed">
            Quando o cliente diz “quero contratar”, o robô pede o serviço, a quantidade e o tipo de aparelho, o endereço e o melhor dia e horário, e avisa você para confirmar a visita. Sem site, sem prévia.
          </div>
        )}
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
