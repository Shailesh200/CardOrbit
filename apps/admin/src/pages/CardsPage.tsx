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

import { AssetUrlField } from '../components/AssetUrlField';
import {
  archiveCreditCardAsset,
  createCreditCardAsset,
  listAdminAssets,
  updateCreditCard,
  type AdminAssetRow,
  type PaginatedAdminAssetsResponse,
} from '../lib/api';

const PAGE_SIZE = 10;

export function CardsPage() {
  const [data, setData] = useState<PaginatedAdminAssetsResponse | null>(null);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [bankId, setBankId] = useState('');
  const [networkId, setNetworkId] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [annualFeeInr, setAnnualFeeInr] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editBankId, setEditBankId] = useState('');
  const [editNetworkId, setEditNetworkId] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editAnnualFeeInr, setEditAnnualFeeInr] = useState('');

  async function refresh(nextPage = page, nextQuery = query) {
    setLoading(true);
    try {
      const next = await listAdminAssets({
        tab: 'credit-cards',
        page: nextPage,
        limit: PAGE_SIZE,
        q: nextQuery,
      });
      setData(next);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load cards');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh(page, query);
  }, [page, query]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(searchInput);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    try {
      await createCreditCardAsset({
        name,
        slug,
        bankId,
        networkId,
        imageUrl: imageUrl.trim() || null,
        annualFeeInr: annualFeeInr.trim() || null,
      });
      toast.success('Card created');
      setName('');
      setSlug('');
      setImageUrl('');
      setAnnualFeeInr('');
      setPage(1);
      await refresh(1, query);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Create failed');
    }
  }

  function startEdit(row: AdminAssetRow) {
    setEditingId(row.id);
    setEditName(row.name);
    setEditSlug(row.slug);
    setEditBankId(row.bankId ?? '');
    setEditNetworkId(row.networkId ?? '');
    setEditImageUrl(row.imageUrl ?? '');
    setEditAnnualFeeInr(row.annualFeeInr ?? '');
  }

  async function onSaveEdit(event: FormEvent) {
    event.preventDefault();
    if (!editingId) return;
    try {
      await updateCreditCard(editingId, {
        name: editName,
        slug: editSlug,
        bankId: editBankId,
        networkId: editNetworkId,
        imageUrl: editImageUrl.trim() || null,
        annualFeeInr: editAnnualFeeInr.trim() || null,
      });
      toast.success('Card updated');
      setEditingId(null);
      await refresh(page, query);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Update failed');
    }
  }

  async function onArchive(id: string, label: string) {
    if (!window.confirm(`Archive ${label}?`)) return;
    try {
      await archiveCreditCardAsset(id);
      toast.success('Card archived');
      await refresh(page, query);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Archive failed');
    }
  }

  const banks = data?.options.banks ?? [];
  const networks = data?.options.networks ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Credit cards</h1>
        <p className="text-sm text-muted-foreground">
          Create, edit, upload card art, and archive cards ({PAGE_SIZE} per page).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create card</CardTitle>
          <CardDescription>Select bank and network from the catalog.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={onCreate}>
            <Input
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              placeholder="Slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
            />
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={bankId}
              onChange={(e) => setBankId(e.target.value)}
              required
            >
              <option value="">Select bank…</option>
              {banks.map((bank) => (
                <option key={bank.id} value={bank.id}>
                  {bank.name}
                </option>
              ))}
            </select>
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={networkId}
              onChange={(e) => setNetworkId(e.target.value)}
              required
            >
              <option value="">Select network…</option>
              {networks.map((network) => (
                <option key={network.id} value={network.id}>
                  {network.name}
                </option>
              ))}
            </select>
            <Input
              placeholder="Annual fee (INR)"
              value={annualFeeInr}
              onChange={(e) => setAnnualFeeInr(e.target.value)}
            />
            <div className="md:col-span-2">
              <AssetUrlField
                value={imageUrl}
                onChange={setImageUrl}
                entityType="credit-cards"
                slugHint={slug}
                label="Card image"
              />
            </div>
            <Button type="submit">Create</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Credit cards</CardTitle>
          <CardDescription>
            {data ? `${data.total} total · page ${data.page} of ${data.totalPages}` : null}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Search by name or slug…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
          {!loading && data?.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No cards.</p>
          ) : null}
          {data?.items.map((row) =>
            editingId === row.id ? (
              <form
                key={row.id}
                className="grid gap-2 border-b border-border py-3 md:grid-cols-2"
                onSubmit={onSaveEdit}
              >
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} required />
                <Input value={editSlug} onChange={(e) => setEditSlug(e.target.value)} required />
                <select
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={editBankId}
                  onChange={(e) => setEditBankId(e.target.value)}
                  required
                >
                  {banks.map((bank) => (
                    <option key={bank.id} value={bank.id}>
                      {bank.name}
                    </option>
                  ))}
                </select>
                <select
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={editNetworkId}
                  onChange={(e) => setEditNetworkId(e.target.value)}
                  required
                >
                  {networks.map((network) => (
                    <option key={network.id} value={network.id}>
                      {network.name}
                    </option>
                  ))}
                </select>
                <Input
                  value={editAnnualFeeInr}
                  onChange={(e) => setEditAnnualFeeInr(e.target.value)}
                  placeholder="Annual fee"
                />
                <div className="md:col-span-2">
                  <AssetUrlField
                    value={editImageUrl}
                    onChange={setEditImageUrl}
                    entityType="credit-cards"
                    slugHint={editSlug}
                    label="Card image"
                  />
                </div>
                <div className="flex gap-2 md:col-span-2">
                  <Button type="submit" size="sm">
                    Save
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingId(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <div
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3 last:border-0"
              >
                <div>
                  <p className="font-medium">{row.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.slug} · fee {row.annualFeeInr ?? '—'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => startEdit(row)}>
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void onArchive(row.id, row.name)}
                  >
                    Archive
                  </Button>
                </div>
              </div>
            ),
          )}
          {data && data.totalPages > 1 ? (
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((value) => value - 1)}
              >
                Previous
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={page >= data.totalPages}
                onClick={() => setPage((value) => value + 1)}
              >
                Next
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
