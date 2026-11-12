import { AdminScreen } from './components/AdminScreen';
import { ehEmpresa, telaVale } from './lib/modoDaConta';
import { VisitasScreen } from './components/screens/VisitasScreen';
import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { NovaBuscaScreen } from './components/screens/NovaBuscaScreen';
import { ResultadosBusca } from './components/ResultadosBusca';
import { SplitViewWorkspace } from './components/SplitViewWorkspace';
import { MessageEditorModal } from './components/MessageEditorModal';
import { ProfileModal } from './components/ProfileModal';
import { IntegrationsModal } from './components/IntegrationsModal';
import { ExportModal } from './components/ExportModal';
import { DemoSiteModal } from './components/DemoSiteModal';

import { LeadProfilePanel } from './components/LeadProfilePanel';
import { HistoryScreen } from './components/screens/HistoryScreen';
import { LoginScreen } from './components/screens/LoginScreen';
import { ConversasScreen } from './components/screens/ConversasScreen';
import { FilaScreen } from './components/screens/FilaScreen';
import { PipelineScreen } from './components/screens/PipelineScreen';
import { ProposalsScreen } from './components/screens/ProposalsScreen';

import { DashboardScreen } from './components/screens/DashboardScreen';
import { AIOutreachScreen } from './components/screens/AIOutreachScreen';
import { RoboScreen } from './components/screens/RoboScreen';
import { ContractsScreen } from './components/screens/ContractsScreen';
import { CalculatorScreen } from './components/screens/CalculatorScreen';
import { SiteBuilder } from './components/SiteBuilder';
import { AvisoDeNovaVersao } from './components/AvisoDeNovaVersao';
import { MySitesScreen } from './components/screens/MySitesScreen';
import { TutorialsScreen } from './components/screens/TutorialsScreen';
import { NotificationsScreen } from './components/screens/NotificationsScreen';
import { SettingsScreen } from './components/screens/SettingsScreen';
import { HelpScreen } from './components/screens/HelpScreen';
import { SubscriptionScreen } from './components/screens/SubscriptionScreen';

const MainApp: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  const { viewState, user, authLoading } = useApp() as any;

  if (authLoading) {
    return <div className="min-h-[100dvh] bg-slate-50 flex items-center justify-center"><div className="text-slate-500 font-medium">Carregando...</div></div>;
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900 flex font-sans antialiased selection:bg-blue-100 selection:text-blue-900">
      
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 z-30 bg-slate-900/20 backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar (Left) */}
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isSidebarOpen ? 'md:ml-64' : 'ml-0'}`}>
        
        {/* Header */}
        <Header toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

        {/* View Switcher */}
        <main key={ehEmpresa(user) ? 'empresa' : 'agencia'} className="flex-1 w-full max-w-7xl mx-auto flex flex-col p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:p-6 transition-all duration-300">
          
          {/* Principal */}
          {viewState === 'dashboard' && <DashboardScreen />}
          {viewState === 'hero' && <NovaBuscaScreen />}
          {viewState === 'results' && <ResultadosBusca />}
          {viewState === 'workspace' && <SplitViewWorkspace />}
          {viewState === 'pipeline' && <PipelineScreen />}
          {viewState === 'history' && <HistoryScreen />}

          {/* Ferramentas de Vendas */}
          {viewState === 'ai-outreach' && <AIOutreachScreen />}
          {viewState === 'conversas' && <ConversasScreen />}
          {viewState === 'fila' && <FilaScreen />}
          {viewState === 'visitas' && ehEmpresa(user) && <VisitasScreen />}
          {viewState === 'robo' && <RoboScreen />}
          {viewState === 'proposals' && <ProposalsScreen />}
          {viewState === 'contracts' && <ContractsScreen />}
          {viewState === 'calculator' && telaVale('calculator', user) && <CalculatorScreen />}

          {/* Construtor */}
          {viewState === 'create-site' && telaVale('create-site', user) && <SiteBuilder />}
          {viewState === 'my-sites' && telaVale('my-sites', user) && <MySitesScreen />}

          {/* Ajuda e Conta */}
          {viewState === 'tutorials' && <TutorialsScreen />}
          {viewState === 'notifications' && <NotificationsScreen />}
          {viewState === 'settings' && <SettingsScreen />}
          {viewState === 'help' && <HelpScreen />}
          {viewState === 'admin' && <AdminScreen />}
          {viewState === 'subscription' && !user?.oculta_assinatura && <SubscriptionScreen />}
          
        </main>

      </div>

      <BottomNav abrirMenu={() => setIsSidebarOpen(true)} />

      {/* Global Modals */}
      <LeadProfilePanel />
      <MessageEditorModal />
      <ProfileModal />
      <IntegrationsModal />
      <ExportModal />
      <DemoSiteModal />
      <AvisoDeNovaVersao />
    </div>
  );
};

export function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}

export default App;
