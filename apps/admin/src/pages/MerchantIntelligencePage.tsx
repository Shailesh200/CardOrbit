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

import {
  addMerchantAlias,
  createMccMapping,
  deleteMerchantAlias,
  getAdminMerchantDetail,
  getMerchantCoverage,
  listMerchantCategories,
  listMerchants,
  type AdminMerchantDetail,
  type MerchantCategoryOption,
  type MerchantCoverage,
} from '../lib/api';

function pct(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function MerchantIntelligencePage() {
  const [coverage, setCoverage] = useState<MerchantCoverage | null>(null);
  const [merchants, setMerchants] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [categories, setCategories] = useState<MerchantCategoryOption[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState<AdminMerchantDetail | null>(null);
  const [aliasInput, setAliasInput] = useState('');
  const [mccCode, setMccCode] = useState('');
  const [mccCategoryId, setMccCategoryId] = useState('');
  const [loading, setLoading] = useState(true);

  async function refreshCoverage() {
    const next = await getMerchantCoverage();
    setCoverage(next);
  }

  async function loadDetail(id: string) {
    if (!id) {
      setDetail(null);
      return;
    }
    const next = await getAdminMerchantDetail(id);
    setDetail(next);
  }

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const [coverageData, merchantRows, categoryRows] = await Promise.all([
          getMerchantCoverage(),
          listMerchants(),
          listMerchantCategories(),
        ]);
        setCoverage(coverageData);
        setMerchants(
          merchantRows.map((row) => ({
            id: String(row.id),
            name: String(row.name),
            slug: String(row.slug),
          })),
        );
        setCategories(categoryRows);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'Failed to load merchant intelligence',
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    void loadDetail(selectedId).catch((error: Error) => toast.error(error.message));
  }, [selectedId]);

  async function onAddAlias(event: FormEvent) {
    event.preventDefault();
    if (!detail || !aliasInput.trim()) return;
    try {
      await addMerchantAlias(detail.id, aliasInput.trim());
      toast.success('Alias added');
      setAliasInput('');
      await loadDetail(detail.id);
      await refreshCoverage();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add alias');
    }
  }

  async function onRemoveAlias(aliasId: string) {
    if (!detail) return;
    try {
      await deleteMerchantAlias(aliasId);
      toast.success('Alias removed');
      await loadDetail(detail.id);
      await refreshCoverage();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove alias');
    }
  }

  async function onAddMcc(event: FormEvent) {
    event.preventDefault();
    if (!detail || !mccCode.trim() || !mccCategoryId) return;
    try {
      await createMccMapping({
        mccCode: mccCode.trim(),
        categoryId: mccCategoryId,
        merchantId: detail.id,
      });
      toast.success('MCC mapping added');
      setMccCode('');
      await loadDetail(detail.id);
      await refreshCoverage();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add MCC mapping');
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading merchant intelligence…</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Merchant intelligence</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Catalog coverage metrics and mapping quality tools (M-025).
        </p>
      </div>

      {coverage ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active merchants</CardDescription>
              <CardTitle className="text-2xl">{coverage.totalActive.toLocaleString()}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Category coverage</CardDescription>
              <CardTitle className="text-2xl">
                {pct(coverage.mappingQuality.categoryCoveragePct)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Alias coverage</CardDescription>
              <CardTitle className="text-2xl">
                {pct(coverage.mappingQuality.aliasCoveragePct)}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-xs text-muted-foreground">
              Avg {coverage.avgAliasesPerMerchant} aliases / merchant
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Global MCC mappings</CardDescription>
              <CardTitle className="text-2xl">{coverage.globalMccMappings}</CardTitle>
            </CardHeader>
          </Card>
        </div>
      ) : null}

      {coverage ? (
        <Card>
          <CardHeader>
            <CardTitle>Category breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 sm:grid-cols-2">
              {coverage.categoryBreakdown.map((row) => (
                <li
                  key={row.categoryCode}
                  className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2 text-sm"
                >
                  <span>{row.categoryName}</span>
                  <span className="font-medium tabular-nums">{row.merchantCount}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Mapping quality triage</CardTitle>
            <CardDescription>Merchants missing category or aliases</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {coverage?.lowQualitySample.length ? (
              coverage.lowQualitySample.map((merchant) => (
                <button
                  key={merchant.id}
                  type="button"
                  className="flex w-full items-center justify-between rounded-md border border-border/60 px-3 py-2 text-left text-sm hover:bg-muted/40"
                  onClick={() => setSelectedId(merchant.id)}
                >
                  <span>
                    {merchant.name} <span className="text-muted-foreground">({merchant.slug})</span>
                  </span>
                  <span className="text-xs text-amber-700">{merchant.issues.join(', ')}</span>
                </button>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No low-quality merchants in sample.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Manage mappings</CardTitle>
            <CardDescription>
              Aliases (MERCHANT-004) and per-merchant MCC (MERCHANT-005)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Merchant</span>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2"
                value={selectedId}
                onChange={(event) => setSelectedId(event.target.value)}
              >
                <option value="">Select merchant…</option>
                {merchants.map((merchant) => (
                  <option key={merchant.id} value={merchant.id}>
                    {merchant.name} ({merchant.slug})
                  </option>
                ))}
              </select>
            </label>

            {detail ? (
              <div className="space-y-4 rounded-md border border-border/60 p-4">
                <div className="space-y-1 text-sm">
                  <p className="font-medium">{detail.name}</p>
                  {detail.brandName && detail.brandName !== detail.name ? (
                    <p className="text-muted-foreground">Brand: {detail.brandName}</p>
                  ) : null}
                  {detail.parentBrand ? (
                    <p className="text-muted-foreground">Parent: {detail.parentBrand}</p>
                  ) : null}
                  {detail.category ? (
                    <p className="text-muted-foreground">Category: {detail.category.name}</p>
                  ) : null}
                  {detail.tags.length > 0 ? (
                    <p className="text-muted-foreground">Tags: {detail.tags.join(', ')}</p>
                  ) : null}
                  {detail.mappingIssues.length > 0 ? (
                    <p className="text-xs text-amber-700">
                      Issues: {detail.mappingIssues.join(', ')}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Aliases</p>
                  <ul className="space-y-1">
                    {detail.aliases.map((alias) => (
                      <li
                        key={alias.id}
                        className="flex items-center justify-between rounded bg-muted/40 px-2 py-1 text-sm"
                      >
                        <span>{alias.alias}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => void onRemoveAlias(alias.id)}
                        >
                          Remove
                        </Button>
                      </li>
                    ))}
                  </ul>
                  <form className="flex gap-2" onSubmit={onAddAlias}>
                    <Input
                      value={aliasInput}
                      onChange={(event) => setAliasInput(event.target.value)}
                      placeholder="Add search alias"
                    />
                    <Button type="submit" size="sm">
                      Add
                    </Button>
                  </form>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">MCC overrides</p>
                  <ul className="space-y-1 text-sm">
                    {detail.mccMappings.map((mapping) => (
                      <li key={mapping.id} className="rounded bg-muted/40 px-2 py-1">
                        {mapping.mccCode}
                        {mapping.description ? ` — ${mapping.description}` : ''}
                      </li>
                    ))}
                  </ul>
                  <form className="grid gap-2 sm:grid-cols-3" onSubmit={onAddMcc}>
                    <Input
                      value={mccCode}
                      onChange={(event) => setMccCode(event.target.value)}
                      placeholder="MCC code"
                      maxLength={4}
                    />
                    <select
                      className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={mccCategoryId}
                      onChange={(event) => setMccCategoryId(event.target.value)}
                    >
                      <option value="">Category…</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    <Button type="submit" size="sm">
                      Add MCC
                    </Button>
                  </form>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Select a merchant to manage mappings.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
