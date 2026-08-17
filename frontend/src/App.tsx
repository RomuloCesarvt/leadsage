import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
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

const MainApp: React.FC = () => {
  const { viewState, setViewState, user, authLoading } = useApp() as any;

  if (authLoading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="text-slate-500 font-medium">Carregando...</div></div>;
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* Top Header & Navigation */}
      <Header />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto flex flex-col px-4 md:px-6 py-6 transition-all duration-300">
        
        {/* View Switcher */}
        {viewState === 'hero' && <ChatPrompt onSearchStart={() => setViewState('workspace')} />}
        {viewState === 'workspace' && <SplitViewWorkspace />}
        {viewState === 'tasks' && <TasksScreen />}
        {viewState === 'history' && <HistoryScreen />}
        {viewState === 'emails' && <EmailsScreen />}
        {viewState === 'lists' && <ListsScreen />}
        {viewState === 'pipeline' && <PipelineScreen />}
      </main>

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
