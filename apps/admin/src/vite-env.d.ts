/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  /** Prefills admin login email (defaults to admin@cardorbit.in in production builds). */
  readonly VITE_ADMIN_LOGIN_EMAIL?: string;
  /** Prefills admin login password in production builds — set only in Vercel, never commit. */
  readonly VITE_ADMIN_LOGIN_PASSWORD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
