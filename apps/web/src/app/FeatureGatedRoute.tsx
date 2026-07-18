import type { ReactNode } from 'react';
import { useFeatureFlag, type FeatureFlagKey } from '@cardwise/feature-flags/browser';

import { EmptyState } from '../components/feedback/EmptyState';

type FeatureGatedRouteProps = {
  flag: FeatureFlagKey;
  title: string;
  description: string;
  children: ReactNode;
};

/** Hides a route behind a feature flag, showing a branded EmptyState instead (M-PWA). */
export function FeatureGatedRoute({ flag, title, description, children }: FeatureGatedRouteProps) {
  const enabled = useFeatureFlag(flag);

  if (!enabled) {
    return (
      <div className="consumer-page py-10">
        <EmptyState title={title} description={description} />
      </div>
    );
  }

  return <>{children}</>;
}
