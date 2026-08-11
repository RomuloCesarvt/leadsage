import React, { useState } from 'react';
import { Plus, CornerDownLeft, ArrowDown } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const ChatPrompt: React.FC<{ onSearchStart?: () => void }> = ({ onSearchStart }) => {
  const { performLeadSearch, isLoading } = useApp();
  const [promptText, setPromptText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptText.trim()) return;

    let niche = 'Farmacêuticos';
    let location = 'Botucatu, SP';
    const txt = promptText.toLowerCase();

    if (txt.includes('farmac') || txt.includes('droga')) niche = 'Farmacêuticos';
    else if (txt.includes('medic') || txt.includes('dermat') || txt.includes('saúde')) niche = 'Médicos';
    else if (txt.includes('dent') || txt.includes('odon')) niche = 'Dentistas';
    else if (txt.includes('corret') || txt.includes('imov')) niche = 'Corretores de Imóveis';
    else if (txt.includes('advog')) niche = 'Advogados';

    if (txt.includes('botucatu')) location = 'Botucatu, SP';
    else if (txt.includes('são paulo') || txt.includes('sp')) location = 'São Paulo, SP';
    else if (txt.includes('rio')) location = 'Rio de Janeiro, RJ';

    performLeadSearch(niche, location, 10);
    if (onSearchStart) onSearchStart();
  };

  const handleChipClick = (niche: string, promptContent: string) => {
    setPromptText(promptContent);
    performLeadSearch(niche, 'Botucatu, SP', 10);
    if (onSearchStart) onSearchStart();
  };

  return (
    <div className="w-full max-w-3xl mx-auto py-12 px-4 flex flex-col items-center justify-center min-h-[75vh]">
      {/* Title */}
      <h1 className="text-3xl md:text-4xl font-serif text-white text-center font-normal tracking-tight mb-8">
        Seu People Search AI Agent
      </h1>

      {/* Large Input Text Box */}
      <form onSubmit={handleSubmit} className="w-full mb-6">
        <div className="lessie-input-box rounded-2xl p-4 flex flex-col justify-between min-h-[140px] shadow-2xl relative">
          <textarea
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            placeholder="Descreva o tipo de pessoa ou empresa que você quer encontrar"
            rows={3}
            className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none resize-none"
          />

          {/* Bottom Action Row inside Textarea */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-900/60">
            <button
              type="button"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              title="Anexar arquivo ou contexto"
            >
              <Plus className="w-4 h-4" />
            </button>

            <button
              type="submit"
              disabled={isLoading || !promptText.trim()}
              className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 font-semibold text-xs flex items-center gap-1.5 transition-colors border border-zinc-700"
            >
              <span>Encontrar</span>
              <CornerDownLeft className="w-3.5 h-3.5 text-zinc-400" />
            </button>
          </div>
        </div>
      </form>

      {/* Prompt Suggestion Chips */}
      <div className="w-full space-y-2 mb-10">
        {/* Chip 1 */}
        <button
          onClick={() => handleChipClick('Farmacêuticos', 'Donos de farmácias e farmacêuticos em Botucatu buscando renovar ou automatizar contato, com LinkedIn e e-mail')}
          className="w-full p-2.5 rounded-xl border border-zinc-800/80 bg-zinc-950 hover:bg-zinc-900/80 text-left text-xs transition-colors flex items-center gap-2 group"
        >
          <span className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 font-medium text-[11px] shrink-0">
            Encontrar clientes
          </span>
          <span className="text-zinc-300 font-medium truncate">
            Donos de pequenos negócios nos EUA buscando criar ou renovar o site, com LinkedIn ou e-mail
          </span>
        </button>

        {/* Chip 2 */}
        <button
          onClick={() => handleChipClick('Médicos', 'Médicos dermatologistas e cirurgiões em Botucatu e região de SP')}
          className="w-full p-2.5 rounded-xl border border-zinc-800/80 bg-zinc-950 hover:bg-zinc-900/80 text-left text-xs transition-colors flex items-center gap-2 group"
        >
          <span className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 font-medium text-[11px] shrink-0">
            Encontrar empresas
          </span>
          <span className="text-zinc-300 font-medium truncate">
            Startups de IA nos EUA em Série A/B com demanda de computação GPU e contratação em infraestrutura...
          </span>
        </button>

        {/* Chip 3 */}
        <button
          onClick={() => handleChipClick('Dentistas', 'Dentistas e especialistas em odontologia com Instagram e telefone ativo')}
          className="w-full p-2.5 rounded-xl border border-zinc-800/80 bg-zinc-950 hover:bg-zinc-900/80 text-left text-xs transition-colors flex items-center gap-2 group"
        >
          <span className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 font-medium text-[11px] shrink-0">
            Encontrar influenciadores
          </span>
          <span className="text-zinc-300 font-medium truncate">
            Influenciadores de maquiagem no TikTok com 50K seguidores recém-abertos a parcerias com...
          </span>
        </button>

        {/* Chip 4 */}
        <button
          onClick={() => handleChipClick('Advogados', 'Advogados corporativos e especialistas em direito médico')}
          className="w-full p-2.5 rounded-xl border border-zinc-800/80 bg-zinc-950 hover:bg-zinc-900/80 text-left text-xs transition-colors flex items-center gap-2 group"
        >
          <span className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 font-medium text-[11px] shrink-0">
            Encontrar candidatos
          </span>
          <span className="text-zinc-300 font-medium truncate">
            Pesquisadores de IA que publicaram sobre raciocínio de LLM na NeurIPS ou ICML no último ano
          </span>
        </button>
      </div>

      {/* Bottom Scroll Pill */}
      <button className="px-4 py-1.5 rounded-full border border-zinc-800 bg-zinc-950 text-zinc-400 text-xs flex items-center gap-1.5 hover:text-zinc-200 transition-colors">
        <span>Role para baixo para ver exemplos</span>
        <ArrowDown className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
