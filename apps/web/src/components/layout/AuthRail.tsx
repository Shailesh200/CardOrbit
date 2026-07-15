import { memo } from 'react';

import { AnimatedCardStack } from '@brand/AnimatedCardStack';
import { HeroLogo } from '@brand/HeroLogo';

/** Persistent auth marketing rail — mounted once for all auth routes. */
export const AuthRail = memo(function AuthRail() {
  return (
    <div className="auth-rail relative hidden flex-col overflow-hidden p-8 lg:flex lg:p-10">
      <div className="consumer-dark-panel__ambient" aria-hidden />
      <div className="consumer-dark-panel__grain" aria-hidden />
      <HeroLogo size="md" tone="dark" className="relative z-[1] shrink-0" />
      <div className="relative z-[1] flex flex-1 items-center py-4">
        <AnimatedCardStack className="w-full scale-[0.92]" />
      </div>
      <div className="auth-rail-content relative z-[1] space-y-2">
        <h1 className="font-display max-w-sm text-[1.85rem] font-semibold leading-tight tracking-tight text-white">
          Optimize every <span className="consumer-dark-accent not-italic">payment</span>
        </h1>
        <p className="max-w-sm text-sm leading-relaxed">
          Your AI-powered financial orbit — cards, rewards, offers, and travel in alignment.
        </p>
      </div>
    </div>
  );
});
