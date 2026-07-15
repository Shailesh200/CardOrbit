import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '@cardwise/ui';

import { PageBackLink } from '@layout/PageBackLink';
import { toast } from '../../lib/app-toast';
import { Star, Trash2, ExternalLink } from 'lucide-react';

import { getCardBenefitsDashboard, type CardBenefitsDashboard } from './card-benefits-api';
import { CardBenefitsDashboardView, CardBenefitsHero } from './CardBenefitsDashboard';
import { removePortfolioCard, updatePortfolioCard } from './portfolio-api';

export function CardDetailPage() {
  const { userCardId = '' } = useParams();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<CardBenefitsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!userCardId) return;
    getCardBenefitsDashboard(userCardId)
      .then((data) => {
        setDashboard(data);
        document.title = `CardOrbit · ${data.overview.nickname ?? data.overview.cardName}`;
      })
      .catch((error: Error) => toast.error(error.message))
      .finally(() => setLoading(false));
  }, [userCardId]);

  async function toggleFavorite() {
    if (!dashboard) return;
    setBusy(true);
    try {
      const updated = await updatePortfolioCard(dashboard.overview.userCardId, {
        isFavorite: !dashboard.overview.isFavorite,
      });
      setDashboard((current) =>
        current
          ? {
              ...current,
              overview: { ...current.overview, isFavorite: updated.isFavorite },
            }
          : current,
      );
      toast.success(updated.isFavorite ? 'Marked as favorite' : 'Removed from favorites');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive() {
    if (!dashboard) return;
    setBusy(true);
    const next = dashboard.overview.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const updated = await updatePortfolioCard(dashboard.overview.userCardId, { status: next });
      setDashboard((current) =>
        current
          ? {
              ...current,
              overview: { ...current.overview, status: updated.status },
            }
          : current,
      );
      toast.success(next === 'ACTIVE' ? 'Card activated' : 'Card deactivated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  }

  async function onRemove() {
    if (!dashboard) return;
    if (!window.confirm(`Remove ${dashboard.overview.cardName} from your portfolio?`)) return;
    setBusy(true);
    try {
      await removePortfolioCard(dashboard.overview.userCardId);
      toast.success('Card removed');
      navigate('/account/cards');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Remove failed');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading card benefits…</p>;
  }

  if (!dashboard) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Card not found.</p>
        <PageBackLink to="/account/cards" label="Back to portfolio" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageBackLink to="/account/cards" label="Back to portfolio" />

      <CardBenefitsHero dashboard={dashboard} />

      {dashboard.overview.sourceUrl ? (
        <p className="text-sm">
          <a
            href={dashboard.overview.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-primary underline-offset-2 hover:underline"
          >
            View on issuer website
            <ExternalLink className="size-3.5" aria-hidden />
          </a>
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={toggleFavorite}>
          <Star
            className={`size-4 ${dashboard.overview.isFavorite ? 'fill-current text-primary' : ''}`}
          />
          {dashboard.overview.isFavorite ? 'Unfavorite' : 'Favorite'}
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={toggleActive}>
          {dashboard.overview.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
        </Button>
        <Button type="button" variant="destructive" size="sm" disabled={busy} onClick={onRemove}>
          <Trash2 className="size-4" />
          Remove
        </Button>
      </div>

      <CardBenefitsDashboardView dashboard={dashboard} />
    </div>
  );
}
