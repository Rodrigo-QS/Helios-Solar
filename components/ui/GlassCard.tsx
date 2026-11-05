import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', noPadding = false }) => {
  return (
    <div 
      className={`
        bg-[rgba(21,46,29,0.6)] 
        backdrop-blur-xl 
        border border-primary/10 
        rounded-xl 
        shadow-lg 
        overflow-hidden
        transition-all duration-300
        hover:border-primary/20
        ${noPadding ? '' : 'p-6'}
        ${className}
      `}
    >
      {children}
    </div>
  );
};