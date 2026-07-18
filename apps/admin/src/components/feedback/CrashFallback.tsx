import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@cardwise/ui';

/** Sentry.ErrorBoundary fallback — replaces a blank/white crash screen with branded copy. */
export function CrashFallback({ resetError }: { resetError: () => void }) {
  return (
    <div className="admin-login">
      <div className="admin-login__glow" aria-hidden />
      <Card className="admin-login__card glass-panel animate-admin-enter">
        <CardHeader className="admin-login__header">
          <span className="admin-sidebar__mark" aria-hidden>
            C
          </span>
          <CardTitle className="font-display text-2xl tracking-tight">
            Something went wrong
          </CardTitle>
          <CardDescription className="text-base">
            The admin console hit an unexpected error. It has been reported — try reloading the
            page.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button
            type="button"
            className="btn-premium w-full"
            onClick={() => {
              resetError();
              window.location.reload();
            }}
          >
            Reload admin
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
