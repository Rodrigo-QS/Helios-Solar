/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL del backend FastAPI, p. ej. https://helios-api.onrender.com */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
