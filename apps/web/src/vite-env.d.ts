/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_SENTRY_DSN: string;
  /** Marketing site origin, e.g. https://cardorbit.in */
  readonly VITE_LANDING_ORIGIN?: string;
  /** Authenticated app origin, e.g. https://app.cardorbit.in */
  readonly VITE_APP_ORIGIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
