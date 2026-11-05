import React, { useState } from 'react';
import { Github } from 'lucide-react';
import { REPO_URL } from '../services/demo/demo';

/**
 * Píldora flotante del modo demo: avisa que los datos son simulados y enlaza
 * al código fuente. Se puede minimizar para no tapar la UI. Dentro de un
 * iframe (portafolio) no se muestra.
 */
export const DemoBar: React.FC = () => {
  const [open, setOpen] = useState(true);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 z-[9999] rounded-full bg-black/80 border border-primary/30 px-3 py-1.5 text-xs font-semibold text-primary shadow-lg backdrop-blur hover:bg-black"
        aria-label="Mostrar barra del demo"
      >
        Demo
      </button>
    );
  }

  return (
    <div
      role="region"
      aria-label="Modo demo"
      className="fixed bottom-4 left-1/2 z-[9999] flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 rounded-full bg-black/80 border border-primary/30 py-1.5 pl-3 pr-1.5 text-xs text-white shadow-xl backdrop-blur"
    >
      <span className="h-2 w-2 shrink-0 rounded-full bg-primary animate-pulse" aria-hidden="true" />
      <span className="hidden whitespace-nowrap font-medium text-white/80 sm:inline">
        Demo · sin backend · predicciones precalculadas del modelo real
      </span>
      <span className="whitespace-nowrap font-medium text-white/80 sm:hidden">Demo</span>
      <a
        href={REPO_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-primary px-2.5 py-1 font-semibold text-background hover:bg-primary-light"
      >
        <Github className="h-3.5 w-3.5" aria-hidden="true" />
        Código
      </a>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="ml-0.5 rounded-full px-2 py-1 text-white/60 hover:bg-white/15 hover:text-white"
        aria-label="Ocultar barra del demo"
      >
        ×
      </button>
    </div>
  );
};
