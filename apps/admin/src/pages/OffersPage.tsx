import { FormEvent, useEffect, useState } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  toast,
} from '@cardwise/ui';

import { createOffer, listOffers } from '../lib/api';

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

  async function refresh() {
    setLoading(true);
    try {
      const data = await listOffers();
      setRows(data as OfferRow[]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load offers');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    try {
      await createOffer({
        code,
        slug,
        title,
        type: 'MERCHANT',
        validFrom: new Date().toISOString(),
        status: 'ACTIVE',
      });
      toast.success('Offer created');
      setCode('');
      setSlug('');
      setTitle('');
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Create failed');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Offers</h1>
        <p className="text-sm text-muted-foreground">Create and review catalog offers.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create offer</CardTitle>
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
            <Button type="submit">Create</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active offers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
          {!loading && rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active offers.</p>
          ) : null}
          {rows.map((row) => (
            <div key={row.id} className="border-b border-border py-3 last:border-0">
              <p className="font-medium">{row.title}</p>
              <p className="text-xs text-muted-foreground">
                {row.code} · {row.type} · {row.status}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
