/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly TAURI_DEBUG?: string;
  readonly TAURI_PLATFORM?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
