import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { AppContext } from './context/AppContext';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { NovaBuscaScreen } from './components/screens/NovaBuscaScreen';
import { ResultadosBusca } from './components/ResultadosBusca';
import { SplitViewWorkspace } from './components/SplitViewWorkspace';
import { HistoryScreen } from './components/screens/HistoryScreen';
import { ConversasScreen } from './components/screens/ConversasScreen';
import { FilaScreen } from './components/screens/FilaScreen';
import { PipelineScreen } from './components/screens/PipelineScreen';
import { DashboardScreen } from './components/screens/DashboardScreen';
import { RoboScreen } from './components/screens/RoboScreen';
import { SettingsScreen } from './components/screens/SettingsScreen';
import { HelpScreen } from './components/screens/HelpScreen';
import { SubscriptionScreen } from './components/screens/SubscriptionScreen';
import { VisitasScreen } from './components/screens/VisitasScreen';
import { NotificationsScreen } from './components/screens/NotificationsScreen';
import { TutorialsScreen } from './components/screens/TutorialsScreen';
import { LeadProfilePanel } from './components/LeadProfilePanel';
import { Sidebar } from './components/Sidebar';

const TELAS: Record<string, React.FC> = {
  hero: NovaBuscaScreen, results: ResultadosBusca, workspace: SplitViewWorkspace, history: HistoryScreen, conversas: ConversasScreen, fila: FilaScreen,
  pipeline: PipelineScreen, dashboard: DashboardScreen, robo: RoboScreen, settings: SettingsScreen, help: HelpScreen, subscription: SubscriptionScreen,
  visitas: VisitasScreen, notifications: NotificationsScreen, tutorials: TutorialsScreen,
};
const params = new URLSearchParams(location.search);
const tela = params.get('tela') || 'dashboard';
const modo = params.get('modo') || 'agencia';
const agora = new Date().toISOString();
const q = (id: string, rotulo: string, tom: string) => ({ id, rotulo, tom, dica: '' });
const leads: any[] = [
  { id: '1', name: 'Cuesta Saúde', company: 'Cuesta Saúde - Clínica Médica', role: 'Pediatra', niche: 'Pediatras', city: 'Botucatu', location: 'Botucatu, SP', email: 'contato@cuesta.com.br', phone: '+5514991884926', whatsapp: true, avatar: '', socials: {}, quality_score: 92, opportunityScore: 99, rating: 4.9, rating_count: 120, salvo: true, pipeline_stage: 'Respondeu', pipeline_por: 'robô', pipeline_motivo: 'Respondeu e perguntou o valor', pipeline_em: agora, qualificacao: q('precisa_voce', 'Precisa de você', 'vermelho'), missingDigitalAssets: ['website'], outreach_status: 'Respondido' },
  { id: '2', name: 'Padaria Doce Vida', company: 'Padaria Doce Vida', role: 'Padaria', niche: 'Padarias', city: 'Botucatu', location: 'Botucatu, SP', email: '', phone: '+5514998003784', whatsapp: true, avatar: '', socials: {}, quality_score: 70, opportunityScore: 55, rating: 4.6, rating_count: 80, salvo: true, pipeline_stage: 'Contato Enviado', qualificacao: q('esfriando', 'Esfriando', 'laranja'), outreach_status: 'Enviado' },
  { id: '3', name: 'Oficina do Zé', company: 'Oficina do Zé Mecânica e Funilaria Ltda', role: 'Oficina', niche: 'Oficinas', city: 'Itu', location: 'Itu, SP', email: 'ze@oficina.com', phone: '', whatsapp: false, avatar: '', socials: {}, quality_score: 40, opportunityScore: 38, salvo: true, pipeline_stage: 'Novo Lead', qualificacao: q('novo', 'Sem abordagem', 'neutro'), outreach_status: 'Pendente' },
  { id: '4', name: 'Studio Bella', company: 'Studio Bella Beleza', role: 'Salão', niche: 'Salões de beleza', city: 'Bauru', location: 'Bauru, SP', email: 'a@b.com', phone: '+5514990000000', whatsapp: true, avatar: '', socials: {}, quality_score: 60, opportunityScore: 61, salvo: false, outreach_status: 'Pendente' },
];
const base: any = {
  user: { uid: 'u1', id: 'u1', name: 'Rômulo César', email: 'rohcesar401@gmail.com', plan: 'Escala', credits: 120, modo, modos: ['agencia', 'empresa'], plan_id: 'm_escala' },
  firebaseUser: {}, authLoading: false, sessaoPerdida: null, saidasDaRegua: [], leads, history: [
    { id: 'h1', niche: 'Fisioterapeutas', location: 'Itu, SP, Brazil', timestamp: agora, total_leads: 41, leads: [] },
    { id: 'h2', niche: 'Fisioterapeutas', location: 'Campinas, SP, Brazil', timestamp: agora, total_leads: 38, leads: [] },
  ],
  suggestedNiches: [], currentNiche: '', currentLocation: '', isLoading: false, viewState: tela, selectedProfileLead: params.get('perfil') ? leads[0] : null,
  selectedLeadForMessage: null, leadsParaContato: [], siteEmEdicao: null,
};
const valor: any = new Proxy(base, { get: (t, k) => (k in t ? t[k as string] : (typeof k === 'string' && /^(set|abrir|fechar|toggle|salvar|remover|alternar|limpar|update|definir|atualizar|perform|refresh|reset|logout|login)/i.test(k) ? () => {} : undefined)) });
const Tela = TELAS[tela] || DashboardScreen;
const Casca = () => {
  const [aberto, setAberto] = React.useState(params.get('menu') === '1');
  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900 flex font-sans antialiased">
      <Sidebar isOpen={aberto} toggleSidebar={() => setAberto(!aberto)} />
      <div className={`flex-1 flex flex-col min-w-0 ${aberto ? 'md:ml-64' : 'ml-0'}`}>
        <Header toggleSidebar={() => setAberto(!aberto)} />
        <main className="flex-1 w-full max-w-7xl mx-auto flex flex-col p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:p-6"><Tela /></main>
      </div>
      <BottomNav abrirMenu={() => setAberto(true)} />
      <LeadProfilePanel />
    </div>
  );
};
createRoot(document.getElementById('root')!).render(<AppContext.Provider value={valor}><Casca /></AppContext.Provider>);
