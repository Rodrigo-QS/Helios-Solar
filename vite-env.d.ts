/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL del backend FastAPI, p. ej. https://helios-api.onrender.com */
  readonly VITE_API_URL?: string;
  /** Solo en la rama demo, con `--mode demo` (ver .env.demo). */
  readonly VITE_DEMO_MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
