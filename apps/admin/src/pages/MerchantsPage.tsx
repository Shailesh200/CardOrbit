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
  archiveMerchant,
  createMerchantAsset,
  listAdminAssets,
  updateMerchant,
  type AdminAssetRow,
  type PaginatedAdminAssetsResponse,
} from '../lib/api';

const PAGE_SIZE = 10;

export function MerchantsPage() {
  const [data, setData] = useState<PaginatedAdminAssetsResponse | null>(null);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editLogoUrl, setEditLogoUrl] = useState('');

  async function refresh(nextPage = page, nextQuery = query) {
    setLoading(true);
    try {
      const next = await listAdminAssets({
        tab: 'merchants',
        page: nextPage,
        limit: PAGE_SIZE,
        q: nextQuery,
      });
      setData(next);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load merchants');
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
      await createMerchantAsset({ name, slug, logoUrl: logoUrl.trim() || null });
      toast.success('Merchant created');
      setName('');
      setSlug('');
      setLogoUrl('');
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
    setEditLogoUrl(row.logoUrl ?? '');
  }

  async function onSaveEdit(event: FormEvent) {
    event.preventDefault();
    if (!editingId) return;
    try {
      await updateMerchant(editingId, {
        name: editName,
        slug: editSlug,
        logoUrl: editLogoUrl.trim() || null,
      });
      toast.success('Merchant updated');
      setEditingId(null);
      await refresh(page, query);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Update failed');
    }
  }

  async function onArchive(id: string, label: string) {
    if (!window.confirm(`Archive ${label}?`)) return;
    try {
      await archiveMerchant(id);
      toast.success('Merchant archived');
      await refresh(page, query);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Archive failed');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Merchants</h1>
        <p className="text-sm text-muted-foreground">
          Create, edit, upload logos, and archive merchants ({PAGE_SIZE} per page).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create merchant</CardTitle>
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
            <div className="md:col-span-2">
              <AssetUrlField
                value={logoUrl}
                onChange={setLogoUrl}
                entityType="merchants"
                slugHint={slug}
                label="Merchant logo"
              />
            </div>
            <Button type="submit">Create</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Merchants</CardTitle>
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
            <p className="text-sm text-muted-foreground">No merchants.</p>
          ) : null}
          {data?.items.map((row) =>
            editingId === row.id ? (
              <form
                key={row.id}
                className="grid gap-2 border-b border-border py-3"
                onSubmit={onSaveEdit}
              >
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} required />
                <Input value={editSlug} onChange={(e) => setEditSlug(e.target.value)} required />
                <AssetUrlField
                  value={editLogoUrl}
                  onChange={setEditLogoUrl}
                  entityType="merchants"
                  slugHint={editSlug}
                  label="Merchant logo"
                />
                <div className="flex gap-2">
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
                  <p className="text-xs text-muted-foreground">{row.slug}</p>
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
