import React from 'react';
import {
  LayoutDashboard,
  LineChart,
  Calculator,
  Zap,
  Bell,
  Sun,
  HelpCircle,
  GitCompareArrows,
  Compass,
  SlidersHorizontal,
  Brain,
} from 'lucide-react';
import { ViewState } from '../types';

interface SidebarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView }) => {
  
  const NavItem = ({ view, icon: Icon, label, badge }: { view: ViewState, icon: any, label: string, badge?: string }) => (
    <button 
      onClick={() => onChangeView(view)}
      className={`w-full flex items-center px-3 py-3 rounded-lg transition-all group relative ${
        currentView === view 
          ? 'bg-primary/10 text-primary shadow-[0_0_15px_rgba(19,236,91,0.1)]' 
          : 'text-gray-400 hover:bg-white/5 hover:text-white'
      }`}
    >
      <Icon className={`w-5 h-5 mr-3 ${currentView === view ? 'text-primary' : 'group-hover:text-primary transition-colors'}`} />
      <span className="font-medium">{label}</span>
      {currentView === view && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full shadow-[0_0_10px_#13ec5b]"></div>
      )}
      {badge && (
         <span className="absolute right-3 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg animate-pulse">{badge}</span>
      )}
    </button>
  );

  return (
    <aside className="w-64 bg-background-card border-r border-primary/10 flex-col hidden md:flex z-20 h-screen">
      {/* Logo */}
      <div className="h-20 flex items-center px-6 border-b border-primary/10 cursor-pointer" onClick={() => onChangeView('dashboard')}>
        <Sun className="text-primary w-8 h-8 mr-3 animate-spin-slow" />
        <span className="font-bold text-xl tracking-tight text-white">
          Helios<span className="text-primary">Dash</span>
        </span>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8">
        {/* Main Menu */}
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 px-2">
            Menú Principal
          </div>
          <nav className="space-y-2">
            <NavItem view="dashboard" icon={LayoutDashboard} label="Resumen" />
            <NavItem view="analysis" icon={LineChart} label="Análisis" />
            <NavItem view="simulator" icon={Calculator} label="Simulador ROI" />
          </nav>
        </div>

        {/* AI Tools */}
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 px-2 flex items-center gap-1.5">
            <Brain className="w-3 h-3" /> Herramientas IA
          </div>
          <nav className="space-y-2">
            <NavItem view="calculator" icon={HelpCircle} label="¿Me Conviene?" />
            <NavItem view="comparator" icon={GitCompareArrows} label="Comparador" />
            <NavItem view="recommender" icon={Compass} label="Recomendador" />
            <NavItem view="whatif" icon={SlidersHorizontal} label="¿Qué Pasaría Si?" />
          </nav>
        </div>

        {/* System Menu */}
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 px-2">
            Sistema
          </div>
          <nav className="space-y-2">
            <NavItem view="devices" icon={Zap} label="Dispositivos" />
            <NavItem view="alerts" icon={Bell} label="Alertas" badge="2" />
          </nav>
        </div>
      </div>

      {/* User Profile */}
      <div className="p-4 border-t border-primary/10 bg-black/20">
        <div className="flex items-center gap-3 mb-4 cursor-pointer hover:bg-white/5 p-2 rounded-lg transition-colors">
          <div className="relative">
            <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-primary to-blue-500 flex items-center justify-center text-background font-bold">
              AC
            </div>
            <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-primary border-2 border-background"></div>
          </div>
          <div>
            <p className="text-sm font-medium text-white">Alex Chen</p>
            <p className="text-xs text-gray-400">Plan Pro</p>
          </div>
        </div>
        
        <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-gray-400">Capacidad del Sistema</span>
            <span className="text-xs font-bold text-primary">12 kW</span>
          </div>
          <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
            <div className="bg-primary h-full rounded-full w-[85%] shadow-[0_0_10px_rgba(19,236,91,0.5)]"></div>
          </div>
        </div>
      </div>
    </aside>
  );
};