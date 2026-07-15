import { FormEvent, useEffect, useState } from 'react';
import { Button, Input, Label } from '@cardwise/ui';
import { ExternalLink, Loader2, LogOut, Sparkles } from 'lucide-react';

import {
  DEFAULT_RECOMMENDATION_AMOUNT,
  ExtensionMessage,
  type ExtensionLoginResponse,
  type PopupRecommendationResponse,
} from '../lib/messages';

import { RecommendationPanel } from './RecommendationPanel';
import { trackExtensionOpened } from '../lib/extension-analytics';

const WEB_APP_URL = import.meta.env.VITE_WEB_URL || 'http://localhost:5173';

function sendMessage<T>(message: unknown): Promise<T> {
  return chrome.runtime.sendMessage(message);
}

export function PopupApp() {
  const [state, setState] = useState<PopupRecommendationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginPending, setLoginPending] = useState(false);

  async function loadRecommendation() {
    setLoading(true);
    try {
      const response = await sendMessage<PopupRecommendationResponse>({
        type: ExtensionMessage.GET_POPUP_STATE,
        amount: DEFAULT_RECOMMENDATION_AMOUNT,
      });
      setState(response);
    } catch (error) {
      setState({
        status: 'error',
        tab: { tabId: null, url: null, merchantSlug: null, merchantHostname: null },
        message: error instanceof Error ? error.message : 'Could not load recommendation',
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRecommendation().then(() => {
      trackExtensionOpened({ surface: 'popup' });
    });
  }, []);

  async function onLogin(event: FormEvent) {
    event.preventDefault();
    setLoginPending(true);
    setLoginError(null);
    try {
      const result = await sendMessage<ExtensionLoginResponse>({
        type: ExtensionMessage.LOGIN,
        email: email.trim(),
        password,
      });
      if (!result.ok) {
        setLoginError(result.message);
        return;
      }
      setPassword('');
      await loadRecommendation();
    } finally {
      setLoginPending(false);
    }
  }

  async function onLogout() {
    await sendMessage({ type: ExtensionMessage.LOGOUT });
    setState({ status: 'unauthenticated' });
  }

  const showLogout =
    state?.status === 'ready' || state?.status === 'error' || state?.status === 'no-merchant';

  return (
    <div className="extension-shell min-h-full space-y-3 p-3">
      <header className="flex items-start justify-between gap-2 px-1">
        <div className="space-y-0.5">
          <p className="font-display text-lg font-semibold tracking-tight">CardOrbit</p>
          <p className="text-xs text-muted-foreground">Best card for this site</p>
        </div>
        {showLogout ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => void onLogout()}
            aria-label="Sign out"
          >
            <LogOut className="size-4" />
          </Button>
        ) : null}
      </header>

      {loading ? (
        <div className="flex items-center gap-2 px-1 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Checking this page…
        </div>
      ) : null}

      {!loading && state?.status === 'disabled' ? (
        <p className="px-1 text-sm text-muted-foreground">{state.message}</p>
      ) : null}

      {!loading && state?.status === 'unauthenticated' ? (
        <div className="consumer-surface consumer-surface-accent consumer-surface--glass p-4">
          <form className="space-y-3" onSubmit={onLogin}>
            <div className="space-y-1">
              <h2 className="font-display text-base font-semibold tracking-tight">Sign in</h2>
              <p className="text-sm text-muted-foreground">
                Compare your portfolio with the CardOrbit catalog for this merchant.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="extension-email">Email</Label>
              <Input
                id="extension-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="extension-password">Password</Label>
              <Input
                id="extension-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            {loginError ? <p className="text-sm text-destructive">{loginError}</p> : null}
            <Button type="submit" className="btn-premium w-full" disabled={loginPending}>
              {loginPending ? 'Signing in…' : 'Sign in'}
            </Button>
            <a
              className="consumer-link consumer-link--sm extension-link-row mx-auto"
              href={`${WEB_APP_URL}/signup`}
              target="_blank"
              rel="noreferrer"
            >
              Create account
              <ExternalLink className="size-3" aria-hidden />
            </a>
          </form>
        </div>
      ) : null}

      {!loading && state?.status === 'no-merchant' ? (
        <div className="consumer-surface rounded-2xl border border-dashed border-primary/20 bg-primary/5 p-4">
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <div className="space-y-2">
              <p>This site is not in the CardOrbit merchant directory yet.</p>
              {state.tab.merchantHostname ? (
                <p className="text-xs">Host: {state.tab.merchantHostname}</p>
              ) : null}
              <Button asChild size="sm" variant="outline">
                <a href={`${WEB_APP_URL}/account/merchants`} target="_blank" rel="noreferrer">
                  Browse merchants
                </a>
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {!loading && state?.status === 'error' ? (
        <div className="consumer-surface space-y-3 p-4 text-sm">
          <p className="text-destructive">{state.message}</p>
          <Button size="sm" variant="outline" onClick={() => void loadRecommendation()}>
            Retry
          </Button>
        </div>
      ) : null}

      {!loading && state?.status === 'ready' ? (
        <RecommendationPanel state={state} webAppUrl={WEB_APP_URL} />
      ) : null}
    </div>
  );
}
