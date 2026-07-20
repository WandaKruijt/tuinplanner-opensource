/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEEPL_API_KEY: string;
  readonly VITE_GARDEN_NAME: string;
  readonly VITE_ADMIN_EMAILS: string;
  readonly VITE_COMMUNITY_EMAIL: string;
  readonly VITE_DEMO_MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
