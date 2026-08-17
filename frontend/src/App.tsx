import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ChatPrompt } from './components/ChatPrompt';
import { SplitViewWorkspace } from './components/SplitViewWorkspace';
import { MessageEditorModal } from './components/MessageEditorModal';
import { CreditModal } from './components/CreditModal';
import { ProfileModal } from './components/ProfileModal';
import { IntegrationsModal } from './components/IntegrationsModal';
import { ExportModal } from './components/ExportModal';
import { DemoSiteModal } from './components/DemoSiteModal';

import { LeadProfilePanel } from './components/LeadProfilePanel';
import { TasksScreen } from './components/screens/TasksScreen';
import { HistoryScreen } from './components/screens/HistoryScreen';
import { EmailsScreen } from './components/screens/EmailsScreen';
import { ListsScreen } from './components/screens/ListsScreen';
import { LoginScreen } from './components/screens/LoginScreen';
import { PipelineScreen } from './components/screens/PipelineScreen';
import { ProposalsScreen } from './components/screens/ProposalsScreen';

const MainApp: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  const { viewState, setViewState, user, authLoading } = useApp() as any;

  if (authLoading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="text-slate-500 font-medium">Carregando...</div></div>;
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans antialiased selection:bg-blue-100 selection:text-blue-900">
      
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
        <main className="flex-1 w-full max-w-7xl mx-auto flex flex-col p-6 transition-all duration-300">
          {viewState === 'hero' && <ChatPrompt onSearchStart={() => setViewState('workspace')} />}
          {viewState === 'workspace' && <SplitViewWorkspace />}
          {viewState === 'tasks' && <TasksScreen />}
          {viewState === 'history' && <HistoryScreen />}
          {viewState === 'emails' && <EmailsScreen />}
          {viewState === 'lists' && <ListsScreen />}
          {viewState === 'pipeline' && <PipelineScreen />}
          {viewState === 'proposals' && <ProposalsScreen />}
        </main>

      </div>

      {/* Global Modals */}
      <LeadProfilePanel />
      <MessageEditorModal />
      <CreditModal />
      <ProfileModal />
      <IntegrationsModal />
      <ExportModal />
      <DemoSiteModal />
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
