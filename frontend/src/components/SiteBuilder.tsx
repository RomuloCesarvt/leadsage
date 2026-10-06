import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ArrowLeft, Monitor, Smartphone, Save, Code, Download, Upload,
  Plus, Trash2, Check, AlertCircle, Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { SITE_TEMPLATES, sugerirTemplate } from '../templates/sites/layouts';
import type { SiteData, SiteTemplate } from '../templates/sites/base';
import type { SiteIdentity } from '../types';
import { prepararImagem, prepararLogo, formatarBytes, TETO_SITE_BYTES } from '../lib/imagem';
import { BancoImagens, buscarFotos } from './BancoImagens';
import { comEditor, editarCampo, listarTextos, restaurarTexto } from '../templates/sites/textos-editaveis';
import { FONTES } from '../templates/sites/premium-base';
import { LAYOUTS_ANTIGOS } from '../templates/sites/layouts';
import { semearConteudo, layoutDoRamo } from '../templates/sites/semear';
import { resumirSemana } from '../templates/sites/profissional';
import { ConteudoDoSite } from './ConteudoDoSite';
import type { DestinoFoto, FotoBanco } from './BancoImagens';

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

const dadosIniciais = (lead: any): SiteData => {
  const base: SiteData = {
    empresa: lead?.company || lead?.name || 'Minha Empresa',
    // o ramo da busca ("Dentistas") casa melhor com o banco do que o cargo do contato
    categoria: lead?.niche || lead?.role || '',
    cidade: lead?.city || '',
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
    // a semana inteira resumida ("Seg a Sex 08:00–18:00 · Sáb ..."), nao so os 3 primeiros dias
    horario: lead?.opening_hours_week?.length ? resumirSemana(lead.opening_hours_week) : lead?.opening_hours || '',
    instagram: lead?.socials?.instagram || '',
    corPrimaria: '#2563eb',
    corDestaque: '#f59e0b',
    // a nota do Google vira o selo de prova social no site
    nota: lead?.rating ?? null,
    avaliacoes: lead?.rating_count ?? null,
  };
  // com um negocio de verdade, o repertorio do ramo ja vem escrito (e editavel)
  return lead ? semearConteudo(base, { cores: true }) : base;
};

const PALETAS = [
  { nome: 'Azul', primaria: '#2563eb', destaque: '#f59e0b' },
  { nome: 'Verde', primaria: '#059669', destaque: '#f97316' },
  { nome: 'Vinho', primaria: '#9f1239', destaque: '#facc15' },
  { nome: 'Grafite', primaria: '#1f2937', destaque: '#38bdf8' },
  { nome: 'Roxo', primaria: '#7c3aed', destaque: '#22d3ee' },
  { nome: 'Terra', primaria: '#92400e', destaque: '#65a30d' },
];

export const SiteBuilder: React.FC = () => {
  const { leads, user, setViewState, siteEmEdicao, setSiteEmEdicao } = useApp() as any;

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
  // A identidade que a IA calculou para este negócio, para a tela poder
  // dizer POR QUE o site ficou com essa cara.
  const [identidade, setIdentidade] = useState<SiteIdentity | null>(null);
  // Quando o usuário escolhe um layout na galeria, a sugestão automática
  // para de mexer nele.
  const [escolheuLayout, setEscolheuLayout] = useState(false);
  const inputLogo = useRef<HTMLInputElement>(null);
  // A logo original fica guardada para "manter o fundo" sem pedir o arquivo de novo.
  const arquivoLogo = useRef<File | null>(null);
  const [fundoRemovido, setFundoRemovido] = useState(false);
  const manterFundoDaLogo = async () => {
    if (!arquivoLogo.current) return;
    const r = await prepararLogo(arquivoLogo.current, { tetoBytes: TETO_LOGO, removerFundo: false });
    setFundoRemovido(false);
    alterar('logo', r.dataUri);
  };

  // Banco de imagens. Site sem foto parecia rascunho: agora ele nasce com
  // fotos do ramo, e o usuario troca o que quiser.
  const [bancoFotos, setBancoFotos] = useState<FotoBanco[]>([]);
  const [buscandoFotos, setBuscandoFotos] = useState(false);
  const nichoDoSite = lead?.niche || lead?.role || dados.categoria || '';

  const buscarNoBanco = async (termo = '') => {
    setBuscandoFotos(true);
    try {
      const r = await buscarFotos(nichoDoSite, termo);
      setBancoFotos(r.imagens);
      return r.imagens;
    } finally {
      setBuscandoFotos(false);
    }
  };

  // Ao escolher um layout, preenche so o que estiver vazio — nunca troca
  // uma foto que o usuario enviou ou escolheu.
  useEffect(() => {
    if (!template) return;
    let vivo = true;
    buscarNoBanco().then(lista => {
      if (!vivo || !lista.length) return;
      setDados(d => ({
        ...d,
        capa: d.capa || lista[0]?.url,
        fotoSobre: d.fotoSobre || lista[1]?.url,
        galeria: (d.galeria || []).filter(Boolean).length ? d.galeria : lista.slice(2, 8).map(f => f.url),
      }));
    });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template?.id, nichoDoSite]);

  // Edição direto na prévia. A prévia roda isolada (sandbox só com
  // allow-scripts) e manda o texto editado por mensagem; aqui só se aceita
  // mensagem que venha dela.
  const previa = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    const receber = (ev: MessageEvent) => {
      if (ev.source !== previa.current?.contentWindow) return;
      const m = ev.data;
      if (!m || m.tipo !== 'leadsage-texto' || typeof m.campo !== 'string' || typeof m.valor !== 'string') return;
      if (m.campo.length > 80 || m.valor.length > 2000) return;
      setDados(d => editarCampo(d, m.campo, m.valor));
    };
    window.addEventListener('message', receber);
    return () => window.removeEventListener('message', receber);
  }, []);
  const [verTextos, setVerTextos] = useState(false);

  const usarFotoDoBanco = (url: string, destino: DestinoFoto) => {
    if (destino === 'galeria') {
      setDados(d => {
        const atual = (d.galeria || []).filter(Boolean);
        if (atual.includes(url)) return d;
        return { ...d, galeria: [...atual, url].slice(-6) };
      });
    } else {
      alterar(destino, url);
    }
  };

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

  const textosDaPagina = useMemo(() => (html ? listarTextos(html, dados) : []), [html, dados]);

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
    if (encontrado) {
      const ramo = encontrado.niche || encontrado.role || '';
      // o banco do ramo recomenda o layout; sem ele, a sugestao por palavras-chave
      const doBanco = SITE_TEMPLATES.find(t => t.id === layoutDoRamo(ramo));
      setTemplate(doBanco || sugerirTemplate(ramo));
    }
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
    if (destino === 'logo') {
      // Logo tem regra própria: transparência preservada e fundo liso removido.
      try {
        arquivoLogo.current = arquivo;
        const r = await prepararLogo(arquivo, { tetoBytes: TETO_LOGO });
        setFundoRemovido(r.fundoRemovido);
        alterar('logo', r.dataUri);
      } catch (err: any) {
        setErro(err?.message || 'Não foi possível usar esta logo.');
      }
      return;
    }
    try {
      const dataUri = await prepararImagem(arquivo, {
        larguraMaxima: 1600,
        tetoBytes: TETO_FOTO,
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

  /**
   * O projeto do site: texto E identidade visual.
   *
   * Antes isto era um pedido disfarçado ao endpoint de abordagem — um
   * "responda um JSON" enfiado no prompt de e-mail, com o resultado
   * garimpado por expressão regular no corpo da mensagem. Quando a
   * garimpagem falhava, o usuário lia "A IA não devolveu textos
   * utilizáveis" sem saber por quê.
   *
   * Agora o servidor devolve o conteúdo já estruturado e, junto, a
   * identidade daquele negócio: paleta, tipografia, cantos e o layout
   * que combina com o ramo. É isso que faz dois clientes do mesmo
   * usuário receberem sites diferentes, e não a mesma página azul com o
   * nome trocado.
   */
  const gerarTextos = async () => {
    if (!template) return;
    setGerandoTextos(true);
    setErro('');
    setIdentidade(null);
    try {
      const r = await api.generateSiteCopy({
        lead: lead || undefined,
        empresa: dados.empresa,
        categoria: dados.categoria,
        cidade: lead?.city || dados.endereco,
        servico_do_usuario: user?.product_description || '',
      });

      setDados(d => semearConteudo({
        ...d,
        categoria: r.categoria || d.categoria,
        slogan: r.slogan || d.slogan,
        sobre: r.sobre || d.sobre,
        servicos: r.servicos?.length
          ? r.servicos.slice(0, 6).map(s => ({
              titulo: String(s.titulo || ''),
              descricao: String(s.descricao || ''),
            }))
          : d.servicos,
        corPrimaria: r.identidade?.primaria || d.corPrimaria,
        corDestaque: r.identidade?.destaque || d.corDestaque,
        tipografia: (r.identidade?.tipografia as SiteData['tipografia']) || d.tipografia,
        cantos: (r.identidade?.cantos as SiteData['cantos']) || d.cantos,
      }));

      // O layout sugerido só entra quando o usuário ainda não escolheu
      // um de propósito: trocar o template debaixo da mão de quem já
      // estava editando seria pior do que manter o que ele escolheu.
      if (r.identidade?.layout && !escolheuLayout) {
        const achado = SITE_TEMPLATES.find(t => t.id === r.identidade.layout);
        if (achado) setTemplate(achado);
      }
      setIdentidade(r.identidade || null);
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
          {/* os layouts antigos seguem abrindo sites já salvos, mas não são mais oferecidos para criar */}
          {SITE_TEMPLATES.filter(t => !LAYOUTS_ANTIGOS.has(t.id)).map(t => (
            <button
              key={t.id}
              onClick={() => { setTemplate(t); setEscolheuLayout(true); }}
              className="group text-left bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-blue-400 hover:shadow-lg transition-all flex flex-col justify-start items-stretch"
            >
              <div
                className="bg-slate-100 border-b border-slate-200 aspect-[160/110] overflow-hidden [&>svg]:block [&>svg]:w-full [&>svg]:h-auto"
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
            A IA escreve o conteúdo e monta a identidade deste negócio: paleta,
            tipografia e acabamento. Cada cliente recebe uma combinação diferente.
          </p>

          {identidade && (
            <div className="-mt-2 p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md border border-white shadow-sm" style={{ background: identidade.primaria }} />
                <span className="w-5 h-5 rounded-md border border-white shadow-sm" style={{ background: identidade.destaque }} />
                <span className="text-[11px] font-bold text-indigo-900">
                  {identidade.tipografia_nome} · cantos {String(identidade.cantos_nome || '').toLowerCase()}
                </span>
              </div>
              <p className="text-[11px] text-indigo-800/80 leading-snug">{identidade.motivo}</p>
            </div>
          )}

          <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-[12px] text-blue-900 leading-snug">
            <b>Dica:</b> clique em qualquer texto da prévia para escrever ou apagar. Enter confirma, Esc desfaz.
          </div>

          <div>
            <button type="button" onClick={() => setVerTextos(v => !v)}
              className="w-full flex items-center justify-between text-xs font-bold text-slate-600 py-1">
              <span>Textos da página ({textosDaPagina.length})</span>
              <span className="text-blue-600">{verTextos ? 'Fechar' : 'Ver todos'}</span>
            </button>
            {verTextos && (
              <div className="mt-2 space-y-2 max-h-80 overflow-y-auto custom-scrollbar pr-1">
                {textosDaPagina.map(t => (
                  // a chave inclui o texto: editado pela prévia, a caixa acompanha
                  <div key={t.chave + '|' + t.texto}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {t.doFormulario ? 'do formulário' : t.editado ? 'editado' : 'texto do layout'}
                      </span>
                      {t.editado && (
                        <button type="button" onClick={() => setDados(d => restaurarTexto(d, t.chave))}
                          className="text-[10px] font-bold text-slate-500 hover:text-blue-600">restaurar</button>
                      )}
                    </div>
                    <textarea
                      rows={t.texto.length > 70 ? 3 : 1}
                      defaultValue={t.texto}
                      onBlur={e => e.target.value !== t.texto && setDados(d => editarCampo(d, t.chave, e.target.value))}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 resize-none"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {template && !LAYOUTS_ANTIGOS.has(template.id) && (
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Tipografia</label>
              <div className="grid grid-cols-2 gap-1.5">
                <button type="button" onClick={() => alterar('fonte', undefined)}
                  className={`px-2.5 py-2 rounded-lg border text-left text-[11px] ${!dados.fonte ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                  <b className="block">Do layout</b><span className="opacity-70">a escolhida para {template.nome}</span>
                </button>
                {Object.entries(FONTES).map(([id, f]) => (
                  <button key={id} type="button" onClick={() => alterar('fonte', id)}
                    className={`px-2.5 py-2 rounded-lg border text-left text-[11px] ${dados.fonte === id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                    <b className="block">{f.nome}</b><span className="opacity-70">{f.tom}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

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
                  // fundo xadrez: mostra que a logo está transparente de verdade
                  <img src={dados.logo} alt="" className="h-10 w-auto object-contain border border-slate-200 rounded-lg p-1"
                    style={{ backgroundImage: 'repeating-conic-gradient(#e5e7eb 0 25%, #fff 0 50%)', backgroundSize: '10px 10px' }} />
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
              {dados.logo ? (
                <p className="text-[11px] text-slate-500 mt-1.5">
                  {fundoRemovido ? <>Fundo removido automaticamente. <button type="button" onClick={manterFundoDaLogo} className="font-bold text-blue-600 hover:underline">Manter o fundo original</button></>
                    : 'Logo com fundo transparente preservado.'}
                </p>
              ) : (
                <p className="text-[11px] text-slate-400 mt-1.5">PNG, JPG ou SVG. Fundo liso (branco ou de uma cor) é removido sozinho. Sem logo, usamos as iniciais.</p>
              )}
            </div>

            <BancoImagens
              fotos={bancoFotos}
              carregando={buscandoFotos}
              aoBuscar={termo => buscarNoBanco(termo)}
              aoEscolher={usarFotoDoBanco}
            />

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
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Galeria (até 6)</label>
              <div className="grid grid-cols-6 gap-2">
                {[0, 1, 2, 3, 4, 5].map(i => {
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

          <ConteudoDoSite dados={dados} setDados={setDados} />

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
            ref={previa}
            srcDoc={comEditor(html)}
            // allow-scripts SEM allow-same-origin: o script de edição roda
            // isolado e só conversa por mensagem. Juntar os dois anularia o sandbox.
            sandbox="allow-scripts"
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
