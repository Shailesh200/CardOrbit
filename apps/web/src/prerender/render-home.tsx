import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';

import { App } from '../app/App';
import { ErrorBoundary } from '../components/feedback/ErrorBoundary';

/**
 * SSR prerender for `/` — uses renderToString so Suspense fallbacks match client hydration
 * (lazy chunks load after first paint, avoiding hydration mismatch).
 */
export function renderHome(): string {
  return renderToString(
    <StrictMode>
      <ErrorBoundary>
        <App ssrLocation="/" />
      </ErrorBoundary>
    </StrictMode>,
  );
}
