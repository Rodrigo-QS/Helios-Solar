import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // Rama demo: el modo demo (datos precalculados, sin backend) solo puede
    // existir en `--mode demo` y nunca apuntando a una API real.
    const env = loadEnv(mode, process.cwd());
    if (env.VITE_DEMO_MODE === 'true' && mode !== 'demo') {
      throw new Error(`VITE_DEMO_MODE=true solo se permite con --mode demo (modo actual: ${mode}).`);
    }
    if (mode === 'demo' && env.VITE_API_URL) {
      throw new Error('El build demo no debe definir VITE_API_URL: no llama a ningún backend.');
    }

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
