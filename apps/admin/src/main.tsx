import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';

import { App } from './app/App';
import { CrashFallback } from './components/feedback/CrashFallback';
import { initAdminSentry } from './lib/sentry';

import './styles.css';

initAdminSentry();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  void navigator.serviceWorker.register('/sw.js');
}

const root = document.getElementById('root');
if (!root) {
  throw new Error('Root element #root not found');
}

createRoot(root).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={({ resetError }) => <CrashFallback resetError={resetError} />}>
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>,
);
