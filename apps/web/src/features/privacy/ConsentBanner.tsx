import { useState } from 'react';
import { Link } from 'react-router';
import { Button, Dialog, DialogContent, DialogTitle } from '@cardwise/ui';
import posthog from 'posthog-js';

import { getConsentPreferences, saveConsentPreferences } from './consent-storage';
import { consumerLinkOnDark } from '../../lib/consumer-link';

export function ConsentBanner() {
  const [visible, setVisible] = useState(() => getConsentPreferences() === null);

  if (!visible) return null;

  return (
    <Dialog open={visible}>
      <DialogContent
        showCloseButton={false}
        aria-describedby="consent-banner-copy"
        // Consent requires an explicit choice — block Escape/outside-click dismissal.
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        className="consumer-consent top-auto left-0 z-[60] max-w-none translate-x-0 translate-y-0 gap-0 rounded-none rounded-t-2xl border-t border-white/10 border-x-0 border-b-0 bg-[oklch(0.11_0.028_258/0.94)] p-4 shadow-[0_-12px_40px_oklch(0.06_0.02_258/0.45)] backdrop-blur-xl sm:max-w-none"
      >
        <DialogTitle className="sr-only">Cookie consent</DialogTitle>
        <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p id="consent-banner-copy" className="text-sm text-white/70">
            We use necessary cookies to run CardOrbit and optional analytics cookies to improve the
            product. See our{' '}
            <Link className={consumerLinkOnDark} to="/cookies">
              Cookie Policy
            </Link>
            .
          </p>
          <div className="flex shrink-0 gap-2">
            <Button
              variant="outline"
              onClick={() => {
                saveConsentPreferences(false);
                posthog.opt_out_capturing();
                setVisible(false);
              }}
            >
              Necessary only
            </Button>
            <Button
              onClick={() => {
                saveConsentPreferences(true);
                posthog.opt_in_capturing();
                setVisible(false);
              }}
            >
              Accept all
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
