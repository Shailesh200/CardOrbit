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

import { placeholderFor } from '../lib/placeholders';
import { AssetUrlField } from '../components/AssetUrlField';
import { LoadErrorState } from '../components/feedback/LoadErrorState';
import { TableSkeleton } from '../components/feedback/PageSkeleton';
import { notify, safeMessage } from '../lib/notify';
import {
  archiveBank,
  archiveCreditCardAsset,
  archiveMerchant,
  createBank,
  createCreditCardAsset,
  createMerchantAsset,
  listAdminAssets,
  updateBank,
  updateCreditCard,
  updateMerchant,
  type AdminAssetRow,
  type AssetTab,
  type PaginatedAdminAssetsResponse,
} from '../lib/api';

const tabs: { id: AssetTab; label: string }[] = [
  { id: 'banks', label: 'Banks' },
  { id: 'merchants', label: 'Merchants' },
  { id: 'credit-cards', label: 'Cards' },
];

const PAGE_SIZE = 10;

function AssetPreview({ row }: { row: AdminAssetRow }) {
  const placeholderType =
    row.entityType === 'credit-card'
      ? 'creditCard'
      : row.entityType === 'merchant'
        ? 'merchant'
        : 'bank';
  const url =
    (row.entityType === 'credit-card' ? row.imageUrl : row.logoUrl) ??
    placeholderFor(placeholderType);

  return (
    <img
      src={url}
      alt=""
      className="size-9 rounded-md border bg-white object-contain p-0.5"
      onError={(event) => {
        event.currentTarget.src = placeholderFor(placeholderType);
      }}
    />
  );
}

function PaginationBar({
  page,
  totalPages,
  total,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <p className="text-muted-foreground">
        Page {page} of {totalPages} · {total} total
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

function CreateForm({
  tab,
  data,
  onCreated,
}: {
  tab: AssetTab;
  data: PaginatedAdminAssetsResponse | null;
  onCreated: () => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [country, setCountry] = useState('IN');
  const [logoUrl, setLogoUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [active, setActive] = useState(true);
  const [bankId, setBankId] = useState('');
  const [networkId, setNetworkId] = useState('');
  const [annualFeeInr, setAnnualFeeInr] = useState('');
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      if (tab === 'banks') {
        await createBank({ name, slug, country, logoUrl: logoUrl.trim() || null });
      } else if (tab === 'merchants') {
        await createMerchantAsset({
          name,
          slug,
          logoUrl: logoUrl.trim() || null,
          active,
        });
      } else {
        await createCreditCardAsset({
          name,
          slug,
          bankId,
          networkId,
          imageUrl: imageUrl.trim() || null,
          annualFeeInr: annualFeeInr.trim() || null,
          active,
        });
      }

      notify.success('Created');
      setName('');
      setSlug('');
      setLogoUrl('');
      setImageUrl('');
      setAnnualFeeInr('');
      await onCreated();
    } catch (error) {
      notify.fromError(error, 'Could not create. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const assetTab = tab;
  const banks = data?.options.banks ?? [];
  const networks = data?.options.networks ?? [];

  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
      <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
      <Input placeholder="Slug" value={slug} onChange={(e) => setSlug(e.target.value)} required />

      {tab === 'banks' ? (
        <>
          <Input
            placeholder="Country (ISO-2)"
            value={country}
            onChange={(e) => setCountry(e.target.value.toUpperCase())}
            maxLength={2}
          />
          <div className="md:col-span-2">
            <AssetUrlField
              value={logoUrl}
              onChange={setLogoUrl}
              entityType={assetTab}
              slugHint={slug}
              label="Bank logo"
            />
          </div>
        </>
      ) : null}

      {tab === 'merchants' ? (
        <>
          <div className="md:col-span-2">
            <AssetUrlField
              value={logoUrl}
              onChange={setLogoUrl}
              entityType={assetTab}
              slugHint={slug}
              label="Merchant logo"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Active
          </label>
        </>
      ) : null}

      {tab === 'credit-cards' ? (
        <>
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
              entityType={assetTab}
              slugHint={slug}
              label="Card image"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Active
          </label>
        </>
      ) : null}

      <Button type="submit" disabled={saving} className="md:col-span-2 w-fit">
        {saving ? 'Creating…' : 'Create'}
      </Button>
    </form>
  );
}

function EditRowForm({
  row,
  data,
  onSaved,
  onCancel,
}: {
  row: AdminAssetRow;
  data: PaginatedAdminAssetsResponse;
  onSaved: () => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(row.name);
  const [slug, setSlug] = useState(row.slug);
  const [country, setCountry] = useState(row.country ?? 'IN');
  const [logoUrl, setLogoUrl] = useState(row.logoUrl ?? '');
  const [imageUrl, setImageUrl] = useState(row.imageUrl ?? '');
  const [active, setActive] = useState(row.active);
  const [bankId, setBankId] = useState(row.bankId ?? '');
  const [networkId, setNetworkId] = useState(row.networkId ?? '');
  const [annualFeeInr, setAnnualFeeInr] = useState(row.annualFeeInr ?? '');
  const [saving, setSaving] = useState(false);

  const entityFolder: AssetTab =
    row.entityType === 'bank'
      ? 'banks'
      : row.entityType === 'merchant'
        ? 'merchants'
        : 'credit-cards';

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      if (row.entityType === 'bank') {
        await updateBank(row.id, {
          name,
          slug,
          country,
          logoUrl: logoUrl.trim() || null,
        });
      } else if (row.entityType === 'merchant') {
        await updateMerchant(row.id, {
          name,
          slug,
          logoUrl: logoUrl.trim() || null,
          active,
        });
      } else {
        await updateCreditCard(row.id, {
          name,
          slug,
          bankId,
          networkId,
          imageUrl: imageUrl.trim() || null,
          annualFeeInr: annualFeeInr.trim() || null,
          active,
        });
      }

      notify.success(`Updated ${name}`);
      await onSaved();
    } catch (error) {
      notify.fromError(error, 'Update failed. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="grid gap-3 py-2" onSubmit={onSubmit}>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" required />
        <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="Slug" required />

        {row.entityType === 'bank' ? (
          <>
            <Input
              value={country}
              onChange={(e) => setCountry(e.target.value.toUpperCase())}
              placeholder="Country"
              maxLength={2}
            />
            <div className="md:col-span-2 lg:col-span-3">
              <AssetUrlField
                value={logoUrl}
                onChange={setLogoUrl}
                entityType={entityFolder}
                slugHint={slug}
                label="Bank logo"
              />
            </div>
          </>
        ) : null}

        {row.entityType === 'merchant' ? (
          <>
            <div className="md:col-span-2 lg:col-span-3">
              <AssetUrlField
                value={logoUrl}
                onChange={setLogoUrl}
                entityType={entityFolder}
                slugHint={slug}
                label="Merchant logo"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
              Active
            </label>
          </>
        ) : null}

        {row.entityType === 'credit-card' ? (
          <>
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={bankId}
              onChange={(e) => setBankId(e.target.value)}
              required
            >
              {data.options.banks.map((bank) => (
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
              {data.options.networks.map((network) => (
                <option key={network.id} value={network.id}>
                  {network.name}
                </option>
              ))}
            </select>
            <Input
              value={annualFeeInr}
              onChange={(e) => setAnnualFeeInr(e.target.value)}
              placeholder="Annual fee (INR)"
            />
            <div className="md:col-span-2 lg:col-span-3">
              <AssetUrlField
                value={imageUrl}
                onChange={setImageUrl}
                entityType={entityFolder}
                slugHint={slug}
                label="Card image"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
              Active
            </label>
          </>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function CatalogRow({
  row,
  data,
  onChanged,
}: {
  row: AdminAssetRow;
  data: PaginatedAdminAssetsResponse;
  onChanged: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const assetUrl = row.entityType === 'credit-card' ? row.imageUrl : row.logoUrl;

  async function onArchive() {
    const label = row.entityType === 'credit-card' ? 'card' : row.entityType;
    if (!window.confirm(`Archive ${row.name}? This soft-deletes the ${label}.`)) return;

    try {
      if (row.entityType === 'bank') {
        await archiveBank(row.id);
      } else if (row.entityType === 'merchant') {
        await archiveMerchant(row.id);
      } else {
        await archiveCreditCardAsset(row.id);
      }
      notify.success(`Archived ${row.name}`);
      await onChanged();
    } catch (error) {
      notify.fromError(error, 'Archive failed. Please try again.');
    }
  }

  if (editing) {
    return (
      <tr className="border-t bg-muted/20">
        <td colSpan={5} className="px-3">
          <EditRowForm
            row={row}
            data={data}
            onSaved={async () => {
              setEditing(false);
              await onChanged();
            }}
            onCancel={() => setEditing(false)}
          />
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t align-top">
      <td className="px-3 py-3">
        <AssetPreview row={row} />
      </td>
      <td className="px-3 py-3">
        <p className="font-medium">{row.name}</p>
        {!row.active ? (
          <span className="text-xs text-amber-600 dark:text-amber-400">Inactive</span>
        ) : null}
      </td>
      <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{row.slug}</td>
      <td className="max-w-xs truncate px-3 py-3 font-mono text-xs text-muted-foreground">
        {assetUrl ?? '—'}
      </td>
      <td className="px-3 py-3">
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>
            Edit
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => void onArchive()}>
            Archive
          </Button>
        </div>
      </td>
    </tr>
  );
}

export function AssetsPage({ embedded = false }: { embedded?: boolean }) {
  const [data, setData] = useState<PaginatedAdminAssetsResponse | null>(null);
  const [tab, setTab] = useState<AssetTab>('banks');
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(
    async (nextPage = page, nextTab = tab, nextQuery = query) => {
      setLoading(true);
      setLoadError(null);
      try {
        const next = await listAdminAssets({
          tab: nextTab,
          page: nextPage,
          limit: PAGE_SIZE,
          q: nextQuery,
        });
        setData(next);
      } catch (error) {
        setLoadError(
          safeMessage(
            error instanceof Error ? error.message : '',
            'Failed to load assets. Check your connection and try again.',
          ),
        );
      } finally {
        setLoading(false);
      }
    },
    [page, tab, query],
  );

  useEffect(() => {
    void refresh(page, tab, query);
  }, [refresh, page, tab, query]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(searchInput);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const tabLabel = tabs.find((item) => item.id === tab)?.label ?? 'Items';

  return (
    <div className={embedded ? 'flex flex-col gap-6' : 'flex flex-col gap-6 animate-admin-enter'}>
      {!embedded ? (
        <div>
          <h1 className="admin-hero__title">Assets & catalog</h1>
          <p className="admin-hero__desc">
            Create, edit, and archive banks, merchants, and cards. Upload images or paste a CDN URL
            for each asset.
          </p>
        </div>
      ) : null}

      {data ? (
        <div className="admin-stat-grid">
          <Card className="admin-panel admin-stat">
            <CardHeader className="pb-2">
              <CardDescription>Banks</CardDescription>
              <CardTitle className="font-display text-2xl">{data.summary.totalBanks}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="admin-panel admin-stat">
            <CardHeader className="pb-2">
              <CardDescription>Merchants</CardDescription>
              <CardTitle className="font-display text-2xl">{data.summary.totalMerchants}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="admin-panel admin-stat">
            <CardHeader className="pb-2">
              <CardDescription>Cards</CardDescription>
              <CardTitle className="font-display text-2xl">
                {data.summary.totalCreditCards}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="admin-panel admin-stat">
            <CardHeader className="pb-2">
              <CardDescription>Missing asset URL</CardDescription>
              <CardTitle className="font-display text-2xl">{data.summary.missingAssets}</CardTitle>
            </CardHeader>
          </Card>
        </div>
      ) : null}

      <Card className="admin-panel">
        <CardHeader>
          <CardTitle className="font-display text-xl">Create {tabLabel.slice(0, -1)}</CardTitle>
          <CardDescription>Upload an image or paste an external CDN URL.</CardDescription>
        </CardHeader>
        <CardContent>
          <CreateForm
            tab={tab}
            data={data}
            onCreated={async () => {
              setPage(1);
              await refresh(1, tab, query);
            }}
          />
        </CardContent>
      </Card>

      <Card className="admin-panel">
        <CardHeader>
          <CardTitle className="font-display text-xl">{tabLabel}</CardTitle>
          <CardDescription>
            Paginated catalog view — edit, upload assets, or archive entries.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="admin-tabs__list">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                className={tab === item.id ? 'is-active' : undefined}
                onClick={() => {
                  setTab(item.id);
                  setPage(1);
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          <Input
            placeholder="Search by name or slug…"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />

          {data ? (
            <PaginationBar
              page={data.page}
              totalPages={data.totalPages}
              total={data.total}
              onPageChange={setPage}
            />
          ) : null}

          {loading ? (
            <TableSkeleton rows={4} />
          ) : loadError ? (
            <LoadErrorState
              title="Could not load assets"
              description={loadError}
              onRetry={() => void refresh(page, tab, query)}
            />
          ) : !data || data.items.length === 0 ? (
            <p className="admin-empty">No matching rows.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Preview</th>
                    <th>Name</th>
                    <th>Slug</th>
                    <th>Asset URL</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((row) => (
                    <CatalogRow
                      key={row.id}
                      row={row}
                      data={data}
                      onChanged={() => refresh(page, tab, query)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data && data.items.length > 0 ? (
            <PaginationBar
              page={data.page}
              totalPages={data.totalPages}
              total={data.total}
              onPageChange={setPage}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
