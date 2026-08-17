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

const MainApp: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  const { viewState, setViewState, user, authLoading } = useApp() as any;

  if (authLoading) {
    return <div className="min-h-screen bg-[#000000] flex items-center justify-center"><div className="text-white">Carregando...</div></div>;
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-[#000000] text-zinc-100 flex flex-col font-sans antialiased selection:bg-zinc-800">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 z-30 bg-black/80 backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Lessie Sidebar */}
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

      {/* Main Container */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'md:ml-64' : 'ml-0'}`}>
        {/* Header */}
        <Header toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

        {/* View Switcher */}
        {viewState === 'hero' && <ChatPrompt onSearchStart={() => setViewState('workspace')} />}
        {viewState === 'workspace' && <SplitViewWorkspace />}
        {viewState === 'tasks' && <TasksScreen />}
        {viewState === 'history' && <HistoryScreen />}
        {viewState === 'emails' && <EmailsScreen />}
        {viewState === 'lists' && <ListsScreen />}
        {viewState === 'pipeline' && <PipelineScreen />}
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
