import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ArrowLeft, Monitor, Smartphone, Save, Code, Download, Upload,
  Plus, Trash2, Check, AlertCircle, Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { SITE_TEMPLATES, sugerirTemplate } from '../templates/sites/layouts';
import type { SiteData, SiteTemplate } from '../templates/sites/base';
import { prepararImagem, formatarBytes, TETO_SITE_BYTES } from '../lib/imagem';

/**
 * Construtor visual de sites.
 *
 * Antes o layout era só uma palavra no prompt da IA e a miniatura, um
 * quadrado cinza. Aqui os templates são layouts de verdade: a galeria
 * mostra a estrutura de cada um, o editor altera os dados e a prévia
 * atualiza a cada tecla, sem chamar a IA e sem gastar crédito.
 */

// Cada foto e reduzida no navegador antes de virar data URI; estes sao
// os tetos DEPOIS da compressao.
const TETO_LOGO = 120 * 1024;
const TETO_FOTO = 260 * 1024;

const dadosIniciais = (lead: any): SiteData => ({
  empresa: lead?.company || lead?.name || 'Minha Empresa',
  categoria: lead?.role || lead?.niche || '',
  slogan: '',
  sobre: '',
  servicos: [
    { titulo: '', descricao: '' },
    { titulo: '', descricao: '' },
    { titulo: '', descricao: '' },
  ],
  galeria: [],
  depoimentos: [{ texto: '', autor: '' }],
  telefone: lead?.phone ? `+${lead.phone}` : '',
  whatsapp: lead?.whatsapp && lead?.phone ? lead.phone : '',
  email: lead?.email || '',
  endereco: lead?.address || lead?.location || '',
  horario: lead?.opening_hours || '',
  instagram: lead?.socials?.instagram || '',
  corPrimaria: '#2563eb',
  corDestaque: '#f59e0b',
});

const PALETAS = [
  { nome: 'Azul', primaria: '#2563eb', destaque: '#f59e0b' },
  { nome: 'Verde', primaria: '#059669', destaque: '#f97316' },
  { nome: 'Vinho', primaria: '#9f1239', destaque: '#facc15' },
  { nome: 'Grafite', primaria: '#1f2937', destaque: '#38bdf8' },
  { nome: 'Roxo', primaria: '#7c3aed', destaque: '#22d3ee' },
  { nome: 'Terra', primaria: '#92400e', destaque: '#65a30d' },
];

export const SiteBuilder: React.FC = () => {
  const { leads, setViewState, siteEmEdicao, setSiteEmEdicao } = useApp() as any;

  const [lead, setLead] = useState<any>(null);
  // Id do site sendo reeditado. Enquanto ficava nulo, cada Publicar
  // criava um site novo e queimava mais uma vaga da cota.
  const [siteId, setSiteId] = useState('');
  const [template, setTemplate] = useState<SiteTemplate | null>(null);
  const [dados, setDados] = useState<SiteData>(dadosIniciais(null));
  const [dispositivo, setDispositivo] = useState<'desktop' | 'mobile'>('desktop');
  const [verCodigo, setVerCodigo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [gerandoTextos, setGerandoTextos] = useState(false);
  const inputLogo = useRef<HTMLInputElement>(null);

  // Sem marca propria no plano, o site sai assinado pelo LeadSage.
  // Comeca ligado: se a consulta do plano falhar, o padrao seguro e
  // assinar, nunca entregar um site sem selo por engano.
  const [selo, setSelo] = useState(true);
  useEffect(() => {
    let vivo = true;
    api.meuPlano()
      .then(p => { if (vivo) setSelo(!(p.recursos || []).includes('marca_propria')); })
      .catch(() => {});
    return () => { vivo = false; };
  }, []);

  // Reabre um site publicado com os campos que o geraram.
  useEffect(() => {
    if (!siteEmEdicao) return;
    try {
      const salvos = JSON.parse(siteEmEdicao.builder_data || '{}');
      if (salvos && salvos.empresa) setDados({ ...dadosIniciais(null), ...salvos });
    } catch {
      // builder_data corrompido nao pode impedir a edicao do resto
    }
    const achado = SITE_TEMPLATES.find(t => t.nome === siteEmEdicao.template);
    setTemplate(achado || SITE_TEMPLATES[0]);
    setSiteId(siteEmEdicao.id);
    setSiteEmEdicao(null);
  }, [siteEmEdicao, setSiteEmEdicao]);

  const html = useMemo(
    () => (template ? template.render({ ...dados, selo }) : ''),
    [template, dados, selo]
  );

  // O site publicado precisa caber no armazenamento; as fotos embutidas
  // sao o que pesa.
  const pesoDoSite = new Blob([html]).size;
  const pesado = pesoDoSite > TETO_SITE_BYTES;

  const alterar = (campo: keyof SiteData, valor: any) =>
    setDados(d => ({ ...d, [campo]: valor }));

  const alterarServico = (i: number, campo: 'titulo' | 'descricao', valor: string) =>
    setDados(d => ({
      ...d,
      servicos: d.servicos.map((s, idx) => (idx === i ? { ...s, [campo]: valor } : s)),
    }));

  const escolherLead = (id: string) => {
    const encontrado = (leads || []).find((l: any) => l.id === id) || null;
    setLead(encontrado);
    setDados(dadosIniciais(encontrado));
    if (encontrado) setTemplate(sugerirTemplate(encontrado.niche || encontrado.role || ''));
  };

  /**
   * Foto de celular tem 3 a 6 MB. Como as imagens viajam embutidas no
   * HTML, cada uma e reduzida e recomprimida no navegador antes de
   * entrar.
   */
  const enviarImagem = async (
    arquivo: File,
    destino: 'logo' | 'capa' | 'fotoSobre' | 'galeria',
    indice = 0
  ) => {
    setErro('');
    try {
      const dataUri = await prepararImagem(arquivo, {
        larguraMaxima: destino === 'logo' ? 600 : 1600,
        tetoBytes: destino === 'logo' ? TETO_LOGO : TETO_FOTO,
      });
      if (destino === 'galeria') {
        setDados(d => {
          const lista = [...(d.galeria || [])];
          lista[indice] = dataUri;
          return { ...d, galeria: lista };
        });
      } else {
        alterar(destino, dataUri);
      }
    } catch (err: any) {
      setErro(err?.message || 'Não foi possível usar esta imagem.');
    }
  };

  /** A IA escreve só os textos; o layout continua sendo o template. */
  const gerarTextos = async () => {
    if (!template) return;
    setGerandoTextos(true);
    setErro('');
    try {
      const resposta = await api.generatePitch({
        lead: {
          ...(lead || {}),
          id: lead?.id || 'novo',
          name: dados.empresa,
          company: dados.empresa,
          role: dados.categoria,
          niche: dados.categoria,
          city: dados.endereco,
          socials: lead?.socials || {},
        } as any,
        tone: 'Direto',
        custom_instructions:
          'Responda APENAS um JSON com as chaves "slogan" (frase curta de no maximo 12 palavras), ' +
          '"sobre" (um paragrafo de 2 frases sobre a empresa) e "servicos" ' +
          '(lista de 3 objetos com "titulo" e "descricao" de uma frase). ' +
          'Escreva em portugues do Brasil, sem inventar dados de contato.',
        sender_name: dados.empresa,
        user_product: dados.categoria,
      });

      const bruto = `${resposta.subject}\n${resposta.body}`;
      const json = bruto.match(/\{[\s\S]*\}/);
      if (!json) throw new Error('A IA não devolveu textos utilizáveis.');
      const conteudo = JSON.parse(json[0]);

      setDados(d => ({
        ...d,
        slogan: conteudo.slogan || d.slogan,
        sobre: conteudo.sobre || d.sobre,
        servicos: Array.isArray(conteudo.servicos) && conteudo.servicos.length
          ? conteudo.servicos.slice(0, 6).map((s: any) => ({
              titulo: String(s.titulo || ''),
              descricao: String(s.descricao || ''),
            }))
          : d.servicos,
      }));
    } catch (err: any) {
      setErro(err?.message || 'Não foi possível gerar os textos.');
    } finally {
      setGerandoTextos(false);
    }
  };

  const publicar = async () => {
    if (!template) return;
    setSalvando(true);
    setErro('');
    try {
      if (pesado) {
        throw new Error(
          `O site está com ${formatarBytes(pesoDoSite)} e o limite é ${formatarBytes(TETO_SITE_BYTES)}. ` +
            'Remova uma foto da galeria e tente de novo.'
        );
      }
      await api.publishSite({
        company: dados.empresa,
        html,
        template: template.nome,
        lead_id: lead?.id || '',
        site_id: siteId,
        builder_data: JSON.stringify(dados),
      });
      setViewState('my-sites');
    } catch (err: any) {
      // A mensagem do backend já explica a cota; repassar é melhor do
      // que trocar por um texto genérico.
      setErro(err?.message || 'Não foi possível publicar.');
    } finally {
      setSalvando(false);
    }
  };

  const baixar = () => {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${dados.empresa.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  /* ---------------------------------------------------- galeria */

  if (!template) {
    return (
      <div className="flex-1 flex flex-col">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Criar site</h1>
          <p className="text-slate-500 text-sm mt-1">
            Escolha um layout. Você edita os textos, as cores e a logo — a prévia acompanha em tempo real.
          </p>
        </div>

        {(leads || []).length > 0 && (
          <div className="mb-6 bg-white border border-slate-200 rounded-2xl p-5">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
              Começar a partir de um lead <span className="normal-case font-medium text-slate-400">(opcional)</span>
            </label>
            <select
              onChange={e => escolherLead(e.target.value)}
              defaultValue=""
              className="w-full md:w-96 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Criar do zero...</option>
              {(leads || []).map((l: any) => (
                <option key={l.id} value={l.id}>{l.company || l.name}</option>
              ))}
            </select>
            <p className="text-xs text-slate-400 mt-2">
              Nome, telefone, endereço e horário do lead entram preenchidos, e sugerimos o layout do nicho.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {SITE_TEMPLATES.map(t => (
            <button
              key={t.id}
              onClick={() => setTemplate(t)}
              className="group text-left bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-blue-400 hover:shadow-lg transition-all"
            >
              <div
                className="bg-slate-100 border-b border-slate-200"
                dangerouslySetInnerHTML={{
                  __html: t.miniatura({ corPrimaria: dados.corPrimaria, corDestaque: dados.corDestaque }),
                }}
              />
              <div className="p-4">
                <h3 className="font-bold text-slate-800 mb-1">{t.nome}</h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-3">{t.descricao}</p>
                <div className="flex flex-wrap gap-1">
                  {t.nichos.slice(0, 3).map(n => (
                    <span key={n} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-semibold">
                      {n}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------- editor */

  const campo = (
    rotulo: string,
    valor: string,
    aoMudar: (v: string) => void,
    multilinha = false,
    dica = ''
  ) => (
    <div>
      <label className="block text-xs font-bold text-slate-600 mb-1.5">{rotulo}</label>
      {multilinha ? (
        <textarea
          value={valor}
          onChange={e => aoMudar(e.target.value)}
          rows={3}
          placeholder={dica}
          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      ) : (
        <input
          value={valor}
          onChange={e => aoMudar(e.target.value)}
          placeholder={dica}
          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      )}
    </div>
  );

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-140px)]">

      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <button
          onClick={() => setTemplate(null)}
          className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="w-4 h-4" /> Trocar layout ({template.nome})
        </button>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 rounded-xl p-1">
            <button
              onClick={() => setDispositivo('desktop')}
              title="Computador"
              className={`p-2 rounded-lg transition-colors ${dispositivo === 'desktop' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDispositivo('mobile')}
              title="Celular"
              className={`p-2 rounded-lg transition-colors ${dispositivo === 'mobile' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>
          <button onClick={() => setVerCodigo(true)} className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold flex items-center gap-1.5">
            <Code className="w-4 h-4" /> Código
          </button>
          <button onClick={baixar} className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold flex items-center gap-1.5">
            <Download className="w-4 h-4" /> Baixar
          </button>
          <button
            onClick={publicar}
            disabled={salvando}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-bold flex items-center gap-2"
          >
            {salvando ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            {siteId ? 'Salvar alterações' : 'Publicar'}
          </button>
        </div>
      </div>

      {erro && (
        <div className="mb-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {erro}
        </div>
      )}

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-hidden">

        <div className="bg-white border border-slate-200 rounded-2xl overflow-y-auto p-5 space-y-5">
          <button
            onClick={gerarTextos}
            disabled={gerandoTextos}
            className="w-full py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 disabled:opacity-60 text-indigo-700 text-sm font-bold flex items-center justify-center gap-2 border border-indigo-200"
          >
            {gerandoTextos
              ? <><span className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /> Escrevendo...</>
              : <><Sparkles className="w-4 h-4" /> Escrever textos com IA</>}
          </button>
          <p className="text-[11px] text-slate-400 -mt-3">
            A IA preenche slogan, descrição e serviços. O layout continua sendo o template.
          </p>

          <div className="space-y-3">
            {campo('Nome da empresa', dados.empresa, v => alterar('empresa', v))}
            {campo('Categoria', dados.categoria, v => alterar('categoria', v), false, 'Padaria, Clínica...')}
            {campo('Slogan', dados.slogan, v => alterar('slogan', v), false, 'A frase do topo')}
            {campo('Sobre', dados.sobre, v => alterar('sobre', v), true, 'Dois períodos sobre o negócio')}
          </div>

          {/* Imagens: sem foto o site fica com cara de rascunho — era o
              principal motivo de os nossos parecerem todos iguais. */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Logo</label>
              <div className="flex items-center gap-3">
                {dados.logo && (
                  <img src={dados.logo} alt="" className="h-10 w-auto object-contain border border-slate-200 rounded-lg p-1" />
                )}
                <button
                  onClick={() => inputLogo.current?.click()}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" /> {dados.logo ? 'Trocar' : 'Enviar logo'}
                </button>
                {dados.logo && (
                  <button onClick={() => alterar('logo', undefined)} className="p-2 text-slate-400 hover:text-red-600" title="Remover logo">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <input
                  ref={inputLogo}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="hidden"
                  onChange={e => e.target.files?.[0] && enviarImagem(e.target.files[0], 'logo')}
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">Sem logo, usamos as iniciais da empresa.</p>
            </div>

            {([
              { chave: 'capa' as const, rotulo: 'Foto de capa', dica: 'A imagem grande do topo. É o que mais muda a cara do site.' },
              { chave: 'fotoSobre' as const, rotulo: 'Foto do "Sobre"', dica: 'A equipe, a fachada, o ambiente.' },
            ]).map(({ chave, rotulo, dica }) => (
              <div key={chave}>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{rotulo}</label>
                <div className="flex items-center gap-3">
                  {dados[chave] && (
                    <img src={dados[chave]} alt="" className="h-12 w-20 object-cover rounded-lg border border-slate-200" />
                  )}
                  <label className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                    <Upload className="w-3.5 h-3.5" /> {dados[chave] ? 'Trocar' : 'Enviar foto'}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={e => e.target.files?.[0] && enviarImagem(e.target.files[0], chave)}
                    />
                  </label>
                  {dados[chave] && (
                    <button onClick={() => alterar(chave, undefined)} className="p-2 text-slate-400 hover:text-red-600" title="Remover">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">{dica}</p>
              </div>
            ))}

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Galeria (até 4)</label>
              <div className="grid grid-cols-4 gap-2">
                {[0, 1, 2, 3].map(i => {
                  const foto = (dados.galeria || [])[i];
                  return (
                    <label
                      key={i}
                      className="relative aspect-square rounded-xl border border-dashed border-slate-300 hover:border-blue-400 bg-slate-50 flex items-center justify-center cursor-pointer overflow-hidden"
                    >
                      {foto ? (
                        <>
                          <img src={foto} alt="" className="absolute inset-0 w-full h-full object-cover" />
                          <button
                            onClick={e => {
                              e.preventDefault();
                              setDados(d => ({ ...d, galeria: (d.galeria || []).filter((_, k) => k !== i) }));
                            }}
                            className="absolute top-1 right-1 p-1 rounded-md bg-white/90 text-slate-500 hover:text-red-600"
                            title="Remover"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </>
                      ) : (
                        <Plus className="w-4 h-4 text-slate-400" />
                      )}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={e => e.target.files?.[0] && enviarImagem(e.target.files[0], 'galeria', i)}
                      />
                    </label>
                  );
                })}
              </div>
              <p className={`text-[11px] mt-1.5 ${pesado ? 'text-red-600 font-semibold' : 'text-slate-400'}`}>
                Peso do site: {formatarBytes(pesoDoSite)}
                {pesado ? ' — acima do limite, remova uma foto' : ` de ${formatarBytes(TETO_SITE_BYTES)}`}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Depoimento de cliente</label>
              {(dados.depoimentos || []).map((dep, i) => (
                <div key={i} className="space-y-2 mb-2">
                  <textarea
                    value={dep.texto}
                    onChange={e => setDados(d => ({
                      ...d,
                      depoimentos: (d.depoimentos || []).map((x, k) => k === i ? { ...x, texto: e.target.value } : x),
                    }))}
                    rows={2}
                    placeholder="O que o cliente disse"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    value={dep.autor}
                    onChange={e => setDados(d => ({
                      ...d,
                      depoimentos: (d.depoimentos || []).map((x, k) => k === i ? { ...x, autor: e.target.value } : x),
                    }))}
                    placeholder="Nome do cliente"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
              {(dados.depoimentos || []).length < 3 && (
                <button
                  onClick={() => setDados(d => ({ ...d, depoimentos: [...(d.depoimentos || []), { texto: '', autor: '' }] }))}
                  className="text-xs font-bold text-blue-600 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar depoimento
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2">Cores</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {PALETAS.map(p => (
                <button
                  key={p.nome}
                  onClick={() => setDados(d => ({ ...d, corPrimaria: p.primaria, corDestaque: p.destaque }))}
                  title={p.nome}
                  className={`w-8 h-8 rounded-lg border-2 overflow-hidden flex ${
                    dados.corPrimaria === p.primaria ? 'border-slate-800' : 'border-transparent'
                  }`}
                >
                  <span className="flex-1" style={{ background: p.primaria }} />
                  <span className="w-1/3" style={{ background: p.destaque }} />
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <label className="flex-1 text-xs text-slate-500">
                Principal
                <input type="color" value={dados.corPrimaria} onChange={e => alterar('corPrimaria', e.target.value)}
                  className="w-full h-9 rounded-lg border border-slate-200 cursor-pointer" />
              </label>
              <label className="flex-1 text-xs text-slate-500">
                Destaque
                <input type="color" value={dados.corDestaque} onChange={e => alterar('corDestaque', e.target.value)}
                  className="w-full h-9 rounded-lg border border-slate-200 cursor-pointer" />
              </label>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-600">Serviços</label>
              <button
                onClick={() => setDados(d => ({ ...d, servicos: [...d.servicos, { titulo: '', descricao: '' }] }))}
                className="text-xs font-bold text-blue-600 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar
              </button>
            </div>
            <div className="space-y-3">
              {dados.servicos.map((s, i) => (
                <div key={i} className="p-3 rounded-xl border border-slate-200 space-y-2 relative">
                  <button
                    onClick={() => setDados(d => ({ ...d, servicos: d.servicos.filter((_, idx) => idx !== i) }))}
                    className="absolute top-2 right-2 p-1 text-slate-300 hover:text-red-600"
                    title="Remover"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <input
                    value={s.titulo}
                    onChange={e => alterarServico(i, 'titulo', e.target.value)}
                    placeholder={`Serviço ${i + 1}`}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    value={s.descricao}
                    onChange={e => alterarServico(i, 'descricao', e.target.value)}
                    placeholder="Descrição curta"
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {campo('Telefone', dados.telefone, v => alterar('telefone', v))}
            {campo('WhatsApp', dados.whatsapp, v => alterar('whatsapp', v), false, 'Só números, com DDD')}
            {campo('E-mail', dados.email, v => alterar('email', v))}
            {campo('Endereço', dados.endereco, v => alterar('endereco', v))}
            {campo('Horário', dados.horario, v => alterar('horario', v), false, 'Seg a Sex, 9h às 18h')}
            {campo('Instagram', dados.instagram, v => alterar('instagram', v), false, '@perfil')}
          </div>
        </div>

        <div className="lg:col-span-2 bg-slate-100 border border-slate-200 rounded-2xl overflow-hidden flex items-center justify-center p-4">
          <iframe
            title="Prévia do site"
            srcDoc={html}
            sandbox="allow-same-origin"
            className={`bg-white shadow-lg transition-all ${
              dispositivo === 'mobile'
                ? 'w-[390px] h-full rounded-[28px] border-[10px] border-slate-800'
                : 'w-full h-full rounded-lg border border-slate-300'
            }`}
          />
        </div>
      </div>

      {verCodigo && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setVerCodigo(false)}>
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">Código do site</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => navigator.clipboard.writeText(html)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Copiar
                </button>
                <button onClick={() => setVerCodigo(false)} className="px-3 py-1.5 text-slate-500 font-bold text-sm">Fechar</button>
              </div>
            </div>
            <pre className="flex-1 overflow-auto p-6 text-xs font-mono text-slate-700 bg-slate-50 whitespace-pre-wrap break-all">{html}</pre>
          </div>
        </div>
      )}
    </div>
  );
};
