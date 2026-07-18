/**
 * PWA service worker registration + "new version available" prompt.
 * `registerType: 'prompt'` in vite.config.ts means updates never auto-activate —
 * we surface a persistent toast with a Reload action instead (M-PWA).
 */
import { notify } from './app-toast';

let initialized = false;

/** Registers the service worker once. Safe to call from multiple renders/effects. */
export function initPwaUpdate(): void {
  if (initialized) return;
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  initialized = true;

  void import('virtual:pwa-register')
    .then(({ registerSW }) => {
      const updateServiceWorker = registerSW({
        immediate: true,
        onNeedRefresh() {
          notify.action('A new version of CardOrbit is available.', 'Reload', () => {
            void updateServiceWorker(true);
          });
        },
        onRegisteredSW(_swUrl, registration) {
          if (!registration) return;
          const CHECK_INTERVAL_MS = 60 * 60 * 1000;
          setInterval(() => {
            void registration.update();
          }, CHECK_INTERVAL_MS);
        },
      });
    })
    .catch(() => {
      // Best-effort — PWA support is progressive, never block the app on it.
    });
}
