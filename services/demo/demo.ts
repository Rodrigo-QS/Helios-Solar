/**
 * Modo DEMO (rama `demo`, build `npm run build:demo` → dist-demo/).
 *
 * Build estático para el portafolio: no hay backend, y services/api.ts responde
 * con services/demo/demoApi.ts (predicciones precalculadas del modelo real +
 * datos simulados). Solo se activa con `--mode demo` y VITE_DEMO_MODE=true;
 * vite.config.ts aborta el build si se intenta en otro modo.
 */
export const DEMO = import.meta.env.MODE === 'demo' && import.meta.env.VITE_DEMO_MODE === 'true';

/** Repositorio con el código fuente, enlazado desde la barra del demo. */
export const REPO_URL = 'https://github.com/Rodrigo-QS/Helios-Solar';

/**
 * ¿El demo corre dentro de un <iframe> (portafolio)? Ahí la página contenedora
 * ya explica que es un demo, así que la barra flotante se oculta.
 */
export function isEmbedded(): boolean {
  try { return window.self !== window.top; } catch { return true; }
}
