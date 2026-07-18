import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';

import { App } from '../app/App';
import { ErrorBoundary } from '../components/feedback/ErrorBoundary';

/** SSR render a single route for static HTML prerender. */
export function renderRoute(location: string): string {
  return renderToString(
    <StrictMode>
      <ErrorBoundary>
        <App ssrLocation={location} />
      </ErrorBoundary>
    </StrictMode>,
  );
}

/** @deprecated Use renderRoute('/') */
export function renderHome(): string {
  return renderRoute('/');
}
