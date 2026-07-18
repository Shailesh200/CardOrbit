/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_SENTRY_RELEASE?: string;
  readonly VITE_VERCEL_GIT_COMMIT_SHA?: string;
  /** Prefills admin login email (defaults to admin@cardorbit.in in production builds). */
  readonly VITE_ADMIN_LOGIN_EMAIL?: string;
  /** Prefills admin login password in production builds — set only in Vercel, never commit. */
  readonly VITE_ADMIN_LOGIN_PASSWORD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
