import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './views/Dashboard';
import { Simulator } from './views/Simulator';
import { Analysis } from './views/Analysis';
import { CalculatorView } from './views/Calculator';
import { Comparator } from './views/Comparator';
import { Recommender } from './views/Recommender';
import { WhatIf } from './views/WhatIf';
import { Alerts } from './views/Alerts';
import { Devices } from './views/Devices';
import { PlaceholderView } from './components/PlaceholderView';
import { Notification, NotificationItem } from './components/ui/Notification';
import { ViewState } from './types';
import { Menu } from 'lucide-react';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notification, setNotification] = useState<NotificationItem | null>(null);

  const showNotification = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setNotification({
      id: Date.now().toString(),
      message,
      type
    });
  };

  const renderView = () => {
    switch(currentView) {
      case 'dashboard':
        return <Dashboard onNavigate={setCurrentView} showNotification={showNotification} />;
      case 'simulator':
        return <Simulator onNavigate={setCurrentView} showNotification={showNotification} />;
      case 'analysis':
        return <Analysis onNavigate={setCurrentView} showNotification={showNotification} />;
      case 'calculator':
        return <CalculatorView onNavigate={setCurrentView} showNotification={showNotification} />;
      case 'comparator':
        return <Comparator onNavigate={setCurrentView} showNotification={showNotification} />;
      case 'recommender':
        return <Recommender onNavigate={setCurrentView} showNotification={showNotification} />;
      case 'whatif':
        return <WhatIf onNavigate={setCurrentView} showNotification={showNotification} />;
      case 'alerts':
        return <Alerts onNavigate={setCurrentView} showNotification={showNotification} />;
      case 'history':
        return <PlaceholderView title="Historial de Generación" />;
      case 'devices':
        return <Devices onNavigate={setCurrentView} showNotification={showNotification} />;
      case 'settings':
        return <PlaceholderView title="Ajustes del Sistema" />;
      default:
        return <Dashboard onNavigate={setCurrentView} showNotification={showNotification} />;
    }
  };

  return (
    <div className="flex h-screen bg-background text-white font-sans overflow-hidden relative">
      
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px]"></div>
          <div className="absolute bottom-[10%] right-[5%] w-[30%] h-[30%] rounded-full bg-blue-500/5 blur-[100px]"></div>
      </div>

      {/* Notifications */}
      <Notification notification={notification} onClose={() => setNotification(null)} />

      {/* Sidebar (Desktop) */}
      <div className="hidden md:block relative z-20">
         <Sidebar currentView={currentView} onChangeView={setCurrentView} />
      </div>

      {/* Mobile Header Overlay */}
      <div className="md:hidden fixed top-4 left-4 z-50">
         <button 
           onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
           className="p-2 bg-background-card border border-white/10 rounded-lg text-white shadow-lg"
         >
            <Menu size={24} />
         </button>
      </div>

      {/* Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm md:hidden">
            <div className="absolute left-0 top-0 h-full w-64 bg-background-card border-r border-white/10">
                <Sidebar 
                  currentView={currentView} 
                  onChangeView={(view) => {
                      setCurrentView(view);
                      setIsMobileMenuOpen(false);
                  }} 
                />
            </div>
            <div className="flex-1 h-full" onClick={() => setIsMobileMenuOpen(false)}></div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 relative z-10 h-full bg-background/50">
        {renderView()}
      </main>
    </div>
  );
};

export default App;