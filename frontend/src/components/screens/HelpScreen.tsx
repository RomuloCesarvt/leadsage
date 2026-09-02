import React, { useState } from 'react';
import { HelpCircle, ChevronDown, MessageCircle, Mail, Search } from 'lucide-react';

const FAQ_ITEMS = [
  {
    q: 'Como funciona o sistema de créditos?',
    a: 'Cada busca de leads consome créditos proporcionais à quantidade de leads solicitados. Por exemplo, se você busca 10 leads, consome 10 créditos. Disparos de mensagem consomem 2 créditos cada. Você pode ver seu saldo no Dashboard ou no menu de Créditos.'
  },
  {
    q: 'Os leads encontrados são reais?',
    a: 'Sim! Todos os leads são extraídos diretamente do Google Maps (Google Places API) com dados verificados: nome da empresa, endereço, telefone, website e avaliações. Além disso, nosso sistema enriquece automaticamente com Instagram, LinkedIn e Facebook quando disponíveis.'
  },
  {
    q: 'Posso buscar leads em qualquer país?',
    a: 'Sim, o LeadSage funciona com dados do Google Maps globalmente. Você pode selecionar país, estado/região e cidade. Para países sem lista de cidades mapeada, basta digitar o nome da cidade manualmente.'
  },
  {
    q: 'Como a IA gera as mensagens de abordagem?',
    a: 'Utilizamos o Google Gemini para analisar o perfil completo do lead (nicho, localização, deficiências digitais) e criar mensagens hiper-personalizadas. Você pode escolher o tom (Consultivo, Amigável, Direto, Autoridade, Promocional) e adicionar instruções extras.'
  },
  {
    q: 'O que é o Score de Oportunidade?',
    a: 'É uma pontuação de 0 a 99 que indica o potencial de conversão de um lead. Leads sem website ou presença digital recebem pontuação mais alta (mais oportunidade para você). Leads com boa avaliação no Google Maps também recebem bônus.'
  },
  {
    q: 'Posso exportar os leads?',
    a: 'Sim! Na tela "Meus Leads", você pode exportar para CSV ou Excel com todos os dados: nome, empresa, telefone, e-mail, redes sociais, score e status do pipeline.'
  },
  {
    q: 'Como funciona o Construtor de Sites?',
    a: 'Você pode gerar um site institucional completo com IA de duas formas: a partir de um lead salvo (dados preenchidos automaticamente) ou do zero (preenchendo manualmente). O site gerado pode ser usado como "isca" na prospecção.'
  },
  {
    q: 'Meus dados estão seguros?',
    a: 'Sim. Utilizamos Firebase para autenticação segura e todas as comunicações são criptografadas via HTTPS. Seus dados de leads ficam armazenados com segurança e não são compartilhados com terceiros.'
  },
  {
    q: 'Como cancelo minha assinatura?',
    a: 'Os planos do LeadSage são vitalícios, ou seja, pagamento único sem mensalidade. Após a compra, o acesso é seu para sempre. Créditos adicionais podem ser adquiridos separadamente.'
  },
  {
    q: 'Posso usar em equipe?',
    a: 'No momento, cada conta é individual. Estamos desenvolvendo funcionalidades de equipe para um próximo lançamento. Fique atento às atualizações!'
  },
];

export const HelpScreen: React.FC = () => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFAQ = searchQuery 
    ? FAQ_ITEMS.filter(item => 
        item.q.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.a.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : FAQ_ITEMS;

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar max-w-4xl mx-auto w-full pb-12">
      
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <HelpCircle className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-800">Central de Ajuda</h1>
        <p className="text-slate-500 mt-2">Encontre respostas para suas dúvidas sobre o LeadSage.</p>
      </div>

      {/* Search */}
      <div className="relative mb-8">
        <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Buscar nas perguntas frequentes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
        />
      </div>

      {/* FAQ */}
      <div className="space-y-3 mb-12">
        {filteredFAQ.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
            <HelpCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Nenhuma pergunta encontrada para "{searchQuery}"</p>
          </div>
        )}
        {filteredFAQ.map((item, i) => {
          const isExpanded = expandedIndex === i;
          return (
            <div key={i} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <button
                onClick={() => setExpandedIndex(isExpanded ? null : i)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
              >
                <span className="font-bold text-slate-700 text-sm pr-4">{item.q}</span>
                <ChevronDown className={`w-5 h-5 text-slate-400 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </button>
              {isExpanded && (
                <div className="px-6 pb-5 pt-0">
                  <p className="text-sm text-slate-600 leading-relaxed">{item.a}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Contact Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
        <h3 className="font-bold text-slate-800 text-lg mb-6 text-center">Ainda precisa de ajuda?</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a 
            href="https://wa.me/5514999999999" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-4 p-5 rounded-xl border border-slate-200 hover:border-green-300 hover:bg-green-50/50 transition-all"
          >
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center shrink-0">
              <MessageCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h4 className="font-bold text-slate-700 text-sm">WhatsApp</h4>
              <p className="text-xs text-slate-500">Atendimento de Seg-Sex, 9h-18h</p>
            </div>
          </a>
          <a 
            href="mailto:suporte@leadsage.ai"
            className="flex items-center gap-4 p-5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all"
          >
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
              <Mail className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h4 className="font-bold text-slate-700 text-sm">E-mail</h4>
              <p className="text-xs text-slate-500">suporte@leadsage.ai</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
};
