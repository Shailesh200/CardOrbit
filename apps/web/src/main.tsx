import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';

import { App } from './app/App';
import { ErrorBoundary } from './components/feedback/ErrorBoundary';
import { initPostHog } from './lib/posthog';

import './styles.css';

initPostHog();

function deferNonCriticalInit() {
  const run = () => {
    void import('./lib/sentry').then(({ initWebSentry }) => initWebSentry());
  };
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(run, { timeout: 5000 });
  } else {
    window.addEventListener('load', () => setTimeout(run, 1500), { once: true });
  }
}

deferNonCriticalInit();

const root = document.getElementById('root');
if (!root) {
  throw new Error('Root element #root not found');
}

const app = (
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);

if (root.dataset.prerendered === 'true' || root.hasChildNodes()) {
  hydrateRoot(root, app);
} else {
  createRoot(root).render(app);
}
