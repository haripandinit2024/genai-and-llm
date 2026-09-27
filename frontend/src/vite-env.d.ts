/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional absolute backend URL; defaults to the Vite proxy on /api. */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
