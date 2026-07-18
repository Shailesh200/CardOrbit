import { FormEvent, useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from '@cardwise/ui';
import { Tag } from 'lucide-react';

import { EmptyState } from '../components/feedback/EmptyState';
import { LoadErrorState } from '../components/feedback/LoadErrorState';
import { TableSkeleton } from '../components/feedback/PageSkeleton';
import { createOffer, listOffers } from '../lib/api';
import { notify, safeMessage } from '../lib/notify';

type OfferRow = {
  id: string;
  code: string;
  title: string;
  type: string;
  status: string;
};

export function OffersPage() {
  const [rows, setRows] = useState<OfferRow[]>([]);
  const [code, setCode] = useState('');
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await listOffers();
      setRows(data as OfferRow[]);
    } catch (error) {
      setLoadError(
        safeMessage(
          error instanceof Error ? error.message : '',
          'Failed to load offers. Check your connection and try again.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setCreating(true);
    try {
      await createOffer({
        code,
        slug,
        title,
        type: 'MERCHANT',
        validFrom: new Date().toISOString(),
        status: 'ACTIVE',
      });
      notify.success('Offer created');
      setCode('');
      setSlug('');
      setTitle('');
      await refresh();
    } catch (error) {
      notify.fromError(error, 'Could not create the offer. Please try again.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 animate-admin-enter">
      <div>
        <h1 className="admin-hero__title">Offers</h1>
        <p className="admin-hero__desc">Create and review catalog offers.</p>
      </div>

      <Card className="admin-panel">
        <CardHeader>
          <CardTitle className="font-display text-xl">Create offer</CardTitle>
          <CardDescription>
            Card/merchant assignment uses /offers/:id/cards|merchants.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={onCreate}>
            <Input
              placeholder="Code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
            <Input
              placeholder="Slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
            />
            <Input
              className="md:col-span-2"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <Button type="submit" disabled={creating} className="btn-premium w-fit">
              {creating ? 'Creating…' : 'Create'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="admin-panel">
        <CardHeader>
          <CardTitle className="font-display text-xl">Active offers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <TableSkeleton rows={3} />
          ) : loadError ? (
            <LoadErrorState
              title="Could not load offers"
              description={loadError}
              onRetry={() => void refresh()}
            />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={Tag}
              title="No active offers yet"
              description="Create one above — it will appear here once saved."
            />
          ) : (
            rows.map((row) => (
              <div key={row.id} className="border-b border-border py-3 last:border-0">
                <p className="font-medium">{row.title}</p>
                <p className="text-xs text-muted-foreground">
                  {row.code} · {row.type} · {row.status}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
