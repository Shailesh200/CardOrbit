import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@cardwise/ui';

import { getConsentPreferences, saveConsentPreferences } from './consent-storage';
import { consumerLinkOnDark } from '../../lib/consumer-link';

export function ConsentBanner() {
  const [visible, setVisible] = useState(() => getConsentPreferences() === null);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="consumer-consent fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[oklch(0.11_0.028_258/0.94)] p-4 shadow-[0_-12px_40px_oklch(0.06_0.02_258/0.45)] backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-white/70">
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
              setVisible(false);
            }}
          >
            Necessary only
          </Button>
          <Button
            onClick={() => {
              saveConsentPreferences(true);
              setVisible(false);
            }}
          >
            Accept all
          </Button>
        </div>
      </div>
    </div>
  );
}
