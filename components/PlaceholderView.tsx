import React from 'react';
import { Construction } from 'lucide-react';
import { GlassCard } from './ui/GlassCard';

interface PlaceholderViewProps {
  title: string;
}

export const PlaceholderView: React.FC<PlaceholderViewProps> = ({ title }) => {
  return (
    <div className="flex flex-col h-full overflow-hidden p-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">{title}</h1>
      </header>
      
      <div className="flex-1 flex items-center justify-center">
        <GlassCard className="max-w-md w-full p-10 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6 animate-pulse-slow">
            <Construction className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">En Construcción</h2>
          <p className="text-gray-400 mb-6">
            Estamos trabajando duro para traerte el módulo de <span className="text-primary font-semibold">{title}</span>. 
            Pronto estará disponible con todas sus funcionalidades premium.
          </p>
          <button className="px-6 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-sm font-medium">
            Notificarme cuando esté listo
          </button>
        </GlassCard>
      </div>
    </div>
  );
};