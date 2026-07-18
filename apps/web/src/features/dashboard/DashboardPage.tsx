import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@cardwise/ui';
import { GitCompareArrows, Plus } from 'lucide-react';

import { DashboardHomeSkeleton } from '../../components/feedback/PageSkeletons';
import { useAuthSWR } from '../../hooks/useAuthSWR';
import { AiNativeStrip } from '../ai/components/AiNativeStrip';
import { NovaPlannerSearch } from '../nova/NovaPlannerSearch';

import { getRecentMerchants } from '../merchants/recent-searches';
import { notify } from '../../lib/app-toast';
import { getDashboardSnapshot, type DashboardWidgetId } from './dashboard-api';

import { DashboardRecommendationWidget } from './components/DashboardRecommendationWidget';
import { ExpiringRewardsWidget } from './components/ExpiringRewardsWidget';
import { FavoriteCardsWidget } from './components/FavoriteCardsWidget';
import { MilestonesPreviewWidget } from './components/MilestonesPreviewWidget';
import { MorningSummaryWidget } from './components/MorningSummaryWidget';
import { OffersPreviewWidget } from './components/OffersPreviewWidget';
import { PersonalizationInsightsWidget } from './components/PersonalizationInsightsWidget';
import { PortfolioSummarySection } from './components/PortfolioSummarySection';
import { RecentActivityWidget } from './components/RecentActivityWidget';
import { RecentMerchantsSection } from './components/RecentMerchantsSection';
import { RecommendedActionsWidget } from './components/RecommendedActionsWidget';
import { RewardWalletSummaryWidget } from './components/RewardWalletSummaryWidget';
import { UpcomingTravelWidget } from './components/UpcomingTravelWidget';

const HERO_WIDGETS = new Set<DashboardWidgetId>(['recommendation', 'savings']);

export function DashboardPage() {
  const [recentMerchants] = useState(() => getRecentMerchants());
  const {
    data: snapshot,
    isLoading,
    error,
  } = useAuthSWR('dashboard-snapshot', getDashboardSnapshot, { dedupingInterval: 60_000 });
  const loading = isLoading && !snapshot;

  useEffect(() => {
    document.title = 'CardOrbit · Home';
  }, []);

  useEffect(() => {
    if (error && !snapshot) {
      notify.fromError(error, 'Homepage unavailable');
    }
  }, [error, snapshot]);

  function renderWidget(id: DashboardWidgetId) {
    if (!snapshot) return null;

    switch (id) {
      case 'morning-summary':
        return snapshot.morningSummary ? (
          <MorningSummaryWidget summary={snapshot.morningSummary} />
        ) : null;
      case 'recommended-actions':
        return <RecommendedActionsWidget actions={snapshot.recommendedActions} />;
      case 'expiring-rewards':
        return <ExpiringRewardsWidget items={snapshot.expiringRewards} />;
      case 'insights':
        return <PersonalizationInsightsWidget insights={snapshot.insights} />;
      case 'recommendation':
        return (
          <div className="dashboard-reco-panel rounded-2xl border border-border/60 bg-background/60 p-5 sm:p-6">
            <DashboardRecommendationWidget scenario={snapshot.recommendationScenario} />
          </div>
        );
      case 'savings':
        return <RewardWalletSummaryWidget preview={snapshot.rewardWalletPreview} />;
      case 'milestones':
        return <MilestonesPreviewWidget milestones={snapshot.milestonesPreview} />;
      case 'upcoming-travel':
        return snapshot.travelPreview ? (
          <UpcomingTravelWidget travel={snapshot.travelPreview} />
        ) : null;
      case 'favorite-cards':
        return <FavoriteCardsWidget cards={snapshot.favoriteCards} />;
      case 'portfolio':
        return (
          <PortfolioSummarySection
            cards={snapshot.portfolioPreview}
            loading={loading && !snapshot}
          />
        );
      case 'offers':
        return <OffersPreviewWidget offers={snapshot.offers} />;
      case 'merchants':
        return (
          <RecentMerchantsSection
            favorites={snapshot.favoriteMerchants}
            recent={recentMerchants}
            popular={snapshot.trendingMerchants}
            loading={loading && !snapshot}
          />
        );
      case 'recent-activity':
        return <RecentActivityWidget items={snapshot.recentActivity} />;
      default:
        return null;
    }
  }

  const heroWidgets = snapshot?.widgets.filter((id) => HERO_WIDGETS.has(id)) ?? [];
  const bodyWidgets = snapshot?.widgets.filter((id) => !HERO_WIDGETS.has(id)) ?? [];

  const subtitle = snapshot?.personalizedHomepage
    ? (snapshot.morningSummary?.supportingLine ??
      `Personalized for ${snapshot.personalization.preferredRewardLabel}`)
    : snapshot
      ? `AI-personalized for ${snapshot.personalization.preferredRewardLabel} · ${snapshot.portfolioCount} card${snapshot.portfolioCount === 1 ? '' : 's'} in portfolio`
      : 'Optimizing rewards, Nova planning, and guidance in one command center.';

  return (
    <div className="dashboard-page orbit-bg space-y-8">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          {snapshot?.personalizedHomepage ? 'Command center' : 'Dashboard'}
        </p>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h1 className="consumer-page-heading font-display text-[1.75rem] font-semibold tracking-tight">
              {snapshot?.morningSummary?.greeting ??
                `Welcome back, ${snapshot?.greetingName ?? 'there'}`}
            </h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link to="/account/cards/compare">
                <GitCompareArrows className="size-4" />
                Compare cards
              </Link>
            </Button>
            <Button asChild size="sm" className="btn-premium">
              <Link to="/account/cards/add">
                <Plus className="size-4" />
                Add card
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <NovaPlannerSearch />

      <AiNativeStrip />

      {loading && !snapshot ? <DashboardHomeSkeleton /> : null}

      {snapshot ? (
        <>
          <div className="space-y-8">
            {bodyWidgets
              .filter((id) => id === 'morning-summary' || id === 'recommended-actions')
              .map((id) => (
                <div key={id}>{renderWidget(id)}</div>
              ))}
          </div>

          {heroWidgets.length > 0 ? (
            <div className="dashboard-grid grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)]">
              {heroWidgets.includes('recommendation') ? renderWidget('recommendation') : null}
              {heroWidgets.includes('savings') ? renderWidget('savings') : null}
            </div>
          ) : null}

          <div className="space-y-8">
            {bodyWidgets
              .filter((id) => id !== 'morning-summary' && id !== 'recommended-actions')
              .map((id) => (
                <div key={id}>{renderWidget(id)}</div>
              ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
