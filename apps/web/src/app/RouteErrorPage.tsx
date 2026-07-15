import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router';

import { ErrorFallback } from '../components/feedback/ErrorFallback';

/** React Router error boundary — lazy route failures and render errors in account shell. */
export function RouteErrorPage() {
  const error = useRouteError();
  const navigate = useNavigate();

  let title = 'This page could not load';
  let message = 'Something went wrong while loading this page.';

  if (isRouteErrorResponse(error)) {
    title = error.status === 404 ? 'Page not found' : `Error ${error.status}`;
    message = error.statusText || message;
  } else if (error instanceof Error) {
    message = error.message || message;
  }

  return <ErrorFallback title={title} message={message} onRetry={() => navigate(0)} showHome />;
}
