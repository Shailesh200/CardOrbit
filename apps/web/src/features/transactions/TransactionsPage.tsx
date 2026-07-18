import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@cardwise/ui';
import { ArrowDownToLine, CreditCard, Plus, Receipt } from 'lucide-react';

import { PageBackLink } from '@layout/PageBackLink';
import { notify, toast } from '@lib/app-toast';
import { useAuthSWR } from '../../hooks/useAuthSWR';
import {
  enqueueMailSync,
  listMailboxes,
  waitForMailSyncJobs,
  type MailSyncJobStatus,
  type MailSyncMailbox,
} from '../account/mail-sync-api';
import { listPortfolio, type PortfolioCardSummary } from '../portfolio/portfolio-api';
import {
  CSV_IMPORT_TEMPLATE,
  createTransaction,
  formatInr,
  importTransactionsCsv,
  listTransactions,
  TRANSACTION_STATUS_LABELS,
  type TransactionSummary,
} from './transactions-api';

const CATEGORY_OPTIONS = [
  'dining',
  'travel',
  'groceries',
  'fuel',
  'online',
  'shopping',
  'entertainment',
  'utilities',
  'other',
] as const;

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function summarizeMailSync(statuses: MailSyncJobStatus[]): string {
  const imported = statuses.reduce(
    (sum, row) => sum + (row.transactionsCreated ?? row.result?.transactionsCreated ?? 0),
    0,
  );
  const failed = statuses.filter((row) => row.status === 'FAILED' || row.status === 'CANCELLED');
  if (failed.length === statuses.length) {
    return failed[0]?.errorMessage ?? failed[0]?.message ?? 'Gmail sync failed';
  }
  if (imported > 0) {
    return `Imported ${imported} transaction${imported === 1 ? '' : 's'} from Gmail`;
  }
  return statuses.map((row) => row.result?.note).find(Boolean) ?? 'Gmail sync finished';
}

type TransactionsBundle = {
  cards: PortfolioCardSummary[];
  items: TransactionSummary[];
  total: number;
  volumeInr: number;
  mailboxes: MailSyncMailbox[];
};

export function TransactionsPage() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [csv, setCsv] = useState(CSV_IMPORT_TEMPLATE);
  const [defaultCardId, setDefaultCardId] = useState('');
  const [importing, setImporting] = useState(false);
  const [syncMailboxId, setSyncMailboxId] = useState<string>('all');
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<string | null>(null);
  const syncAbortRef = useRef<AbortController | null>(null);
  const [addDraft, setAddDraft] = useState({
    userCardId: '',
    merchantName: '',
    amountInr: '',
    categorySlug: 'dining',
    transactedAt: new Date().toISOString().slice(0, 16),
  });
  const [saving, setSaving] = useState(false);

  const listKey = ['transactions', search.trim() || '', categoryFilter || ''] as const;

  const { data, error, isLoading, mutate } = useAuthSWR<TransactionsBundle>(
    listKey,
    async () => {
      const [portfolio, response, mailboxResponse] = await Promise.all([
        listPortfolio(),
        listTransactions({
          search: search.trim() || undefined,
          categorySlug: categoryFilter || undefined,
          pageSize: 50,
        }),
        listMailboxes().catch(() => ({ items: [] as MailSyncMailbox[] })),
      ]);
      return {
        cards: portfolio,
        items: response.items,
        total: response.total,
        volumeInr: response.summary.totalVolumeInr,
        mailboxes: mailboxResponse.items,
      };
    },
    { dedupingInterval: 15_000 },
  );

  const cards = data?.cards ?? [];
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const volumeInr = data?.volumeInr ?? 0;
  const mailboxes = data?.mailboxes ?? [];
  const loading = isLoading && !data;

  useEffect(() => {
    document.title = 'CardOrbit · Transactions';
    return () => {
      syncAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (error && !data) {
      notify.fromError(error, 'Could not load transactions');
    }
  }, [error, data]);

  useEffect(() => {
    if (!defaultCardId && cards[0]) {
      setDefaultCardId(cards[0].id);
      setAddDraft((current) => ({ ...current, userCardId: cards[0]!.id }));
    }
  }, [cards, defaultCardId]);

  async function onImport() {
    setImporting(true);
    try {
      const result = await importTransactionsCsv({
        csv,
        defaultUserCardId: defaultCardId || undefined,
      });
      toast.success(`Imported ${result.imported} transaction${result.imported === 1 ? '' : 's'}`);
      if (result.errors.length > 0) {
        toast.error(
          `${result.errors.length} row${result.errors.length === 1 ? '' : 's'} had errors`,
        );
      }
      setShowImport(false);
      await mutate();
    } catch (error) {
      notify.fromError(error, 'Import failed');
    } finally {
      setImporting(false);
    }
  }

  async function onAdd() {
    const amountInr = Number.parseFloat(addDraft.amountInr.replace(/,/g, ''));
    if (!addDraft.userCardId || !addDraft.merchantName.trim() || !Number.isFinite(amountInr)) {
      toast.error('Fill in card, merchant, and amount');
      return;
    }

    setSaving(true);
    try {
      await createTransaction({
        userCardId: addDraft.userCardId,
        merchantName: addDraft.merchantName.trim(),
        amountInr,
        categorySlug: addDraft.categorySlug,
        transactedAt: new Date(addDraft.transactedAt).toISOString(),
      });
      toast.success('Transaction added');
      setShowAdd(false);
      setAddDraft((current) => ({ ...current, merchantName: '', amountInr: '' }));
      await mutate();
    } catch (error) {
      notify.fromError(error, 'Could not add transaction');
    } finally {
      setSaving(false);
    }
  }

  async function onSyncGmail() {
    syncAbortRef.current?.abort();
    const controller = new AbortController();
    syncAbortRef.current = controller;

    setSyncing(true);
    setSyncProgress('Queuing Gmail sync…');
    try {
      const response = await enqueueMailSync(
        syncMailboxId !== 'all' ? { mailboxId: syncMailboxId } : {},
      );
      const jobIds = response.jobs.map((job) => job.jobId);
      if (jobIds.length === 0) {
        throw new Error('No sync jobs were started');
      }

      setSyncProgress('Sync started — searching Gmail…');
      const statuses = await waitForMailSyncJobs(
        jobIds,
        (status) => {
          setSyncProgress(status.message || 'Syncing…');
        },
        { signal: controller.signal },
      );

      const summary = summarizeMailSync(statuses);
      const allFailed = statuses.every(
        (row) => row.status === 'FAILED' || row.status === 'CANCELLED',
      );
      if (allFailed) {
        toast.error(summary);
      } else {
        toast.success(summary);
      }
      await mutate();
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      notify.fromError(error, 'Sync failed to start');
    } finally {
      setSyncing(false);
      setSyncProgress(null);
    }
  }

  const latestSyncLabel = (() => {
    const withSync = mailboxes
      .filter((m) => m.lastSyncAt)
      .sort((a, b) => (b.lastSyncAt ?? '').localeCompare(a.lastSyncAt ?? ''));
    if (withSync[0]?.lastSyncAt) {
      return `Last Gmail sync ${new Date(withSync[0].lastSyncAt).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })}`;
    }
    if (mailboxes.length > 0) return 'Gmail connected — not synced yet';
    return null;
  })();

  return (
    <div className="space-y-8">
      <PageBackLink to="/account" label="Account" />

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-primary/10 p-2 text-primary" aria-hidden>
            <Receipt className="size-5" />
          </span>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              Transactions
            </p>
            <h1 className="consumer-page-heading font-display text-2xl font-semibold tracking-tight">
              Your spend timeline
            </h1>
            <p className="text-sm text-muted-foreground">
              Sync card spend alerts from Gmail, import CSV statements, or add transactions
              manually.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowImport((open) => !open)}
          >
            <ArrowDownToLine className="size-4" />
            Import CSV
          </Button>
          <Button type="button" size="sm" onClick={() => setShowAdd((open) => !open)}>
            <Plus className="size-4" />
            Add transaction
          </Button>
        </div>
      </header>

      {mailboxes.length > 0 ? (
        <section className="flex flex-wrap items-end gap-3 rounded-2xl border border-border/60 bg-background/50 p-4">
          <div className="min-w-[12rem] flex-1 space-y-1">
            <p className="text-sm font-medium">Gmail transaction sync</p>
            <p className="text-xs text-muted-foreground">
              {syncProgress ?? latestSyncLabel}
              {!syncProgress && mailboxes.some((m) => m.status === 'NEEDS_REAUTH')
                ? ' · One mailbox needs reconnect in Settings'
                : ''}
            </p>
          </div>
          {mailboxes.length > 1 ? (
            <div className="space-y-1">
              <Label htmlFor="sync-mailbox">Mailbox</Label>
              <Select value={syncMailboxId} onValueChange={setSyncMailboxId} disabled={syncing}>
                <SelectTrigger id="sync-mailbox" className="w-[220px]">
                  <SelectValue placeholder="All mailboxes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All mailboxes</SelectItem>
                  {mailboxes.map((mailbox) => (
                    <SelectItem key={mailbox.id} value={mailbox.id}>
                      {mailbox.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={syncing}
            onClick={() => void onSyncGmail()}
          >
            {syncing ? 'Syncing…' : 'Sync now'}
          </Button>
          <Button asChild type="button" variant="ghost" size="sm">
            <Link to="/account/settings">Manage mailboxes</Link>
          </Button>
        </section>
      ) : (
        <section className="rounded-2xl border border-dashed border-border/60 bg-background/40 p-4 text-sm text-muted-foreground">
          Connect Google in{' '}
          <Link to="/account/settings" className="text-primary hover:underline">
            Settings
          </Link>{' '}
          to sync statement emails automatically when you add cards.
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-2xl border border-border/60 bg-background/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Total volume
          </p>
          <p className="mt-1 font-semibold">{formatInr(volumeInr)}</p>
        </article>
        <article className="rounded-2xl border border-border/60 bg-background/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Transactions
          </p>
          <p className="mt-1 font-semibold">{total}</p>
        </article>
        <article className="rounded-2xl border border-border/60 bg-background/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Portfolio cards
          </p>
          <p className="mt-1 font-semibold">{cards.length}</p>
        </article>
      </section>

      {showImport ? (
        <section className="space-y-4 rounded-2xl border border-border/60 bg-background/50 p-5">
          <h2 className="font-semibold">Import CSV</h2>
          <p className="text-sm text-muted-foreground">
            Columns: date, amount, merchant, category, user_card_id, reference. Use your portfolio
            card IDs from the list below.
          </p>
          {cards.length > 0 ? (
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
              {cards.map((card) => (
                <p key={card.id}>
                  <code>{card.id}</code> — {card.nickname ?? card.card.name}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Add a card to your portfolio before importing.{' '}
              <Link to="/account/cards/add" className="text-primary hover:underline">
                Add a card
              </Link>
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="default-card">Default card ID (optional)</Label>
            <Input
              id="default-card"
              value={defaultCardId}
              onChange={(event) => setDefaultCardId(event.target.value)}
              placeholder="user card id"
            />
          </div>
          <textarea
            className="min-h-40 w-full rounded-xl border border-border/60 bg-background px-3 py-2 font-mono text-xs"
            value={csv}
            onChange={(event) => setCsv(event.target.value)}
          />
          <div className="flex gap-2">
            <Button type="button" onClick={() => void onImport()} disabled={importing}>
              {importing ? 'Importing…' : 'Run import'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowImport(false)}>
              Cancel
            </Button>
          </div>
        </section>
      ) : null}

      {showAdd ? (
        <section className="space-y-4 rounded-2xl border border-border/60 bg-background/50 p-5">
          <h2 className="font-semibold">Add transaction</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="add-card">Card</Label>
              <Select
                value={addDraft.userCardId || undefined}
                onValueChange={(value) =>
                  setAddDraft((current) => ({ ...current, userCardId: value }))
                }
              >
                <SelectTrigger id="add-card" className="w-full">
                  <SelectValue placeholder="Select card" />
                </SelectTrigger>
                <SelectContent>
                  {cards.map((card) => (
                    <SelectItem key={card.id} value={card.id}>
                      {card.nickname ?? card.card.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-merchant">Merchant</Label>
              <Input
                id="add-merchant"
                value={addDraft.merchantName}
                onChange={(event) =>
                  setAddDraft((current) => ({ ...current, merchantName: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-amount">Amount (INR)</Label>
              <Input
                id="add-amount"
                inputMode="decimal"
                value={addDraft.amountInr}
                onChange={(event) =>
                  setAddDraft((current) => ({ ...current, amountInr: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-category">Category</Label>
              <Select
                value={addDraft.categorySlug}
                onValueChange={(value) =>
                  setAddDraft((current) => ({ ...current, categorySlug: value }))
                }
              >
                <SelectTrigger id="add-category" className="w-full">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((slug) => (
                    <SelectItem key={slug} value={slug}>
                      {slug}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="add-date">Date & time</Label>
              <Input
                id="add-date"
                type="datetime-local"
                value={addDraft.transactedAt}
                onChange={(event) =>
                  setAddDraft((current) => ({ ...current, transactedAt: event.target.value }))
                }
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" onClick={() => void onAdd()} disabled={saving}>
              {saving ? 'Saving…' : 'Save transaction'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
          </div>
        </section>
      ) : null}

      <section className="flex flex-wrap gap-3">
        <Input
          className="max-w-xs"
          placeholder="Search merchant or notes"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Select
          value={categoryFilter || '__all__'}
          onValueChange={(value) => setCategoryFilter(value === '__all__' ? '' : value)}
        >
          <SelectTrigger className="w-[11rem]" aria-label="Filter by category">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All categories</SelectItem>
            {CATEGORY_OPTIONS.map((slug) => (
              <SelectItem key={slug} value={slug}>
                {slug}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" size="sm" onClick={() => void mutate()}>
          Apply filters
        </Button>
      </section>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading transactions…</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-border/60 bg-background/50 p-6">
          <div className="flex items-start gap-3">
            <CreditCard className="mt-0.5 size-5 text-muted-foreground" aria-hidden />
            <div className="space-y-2">
              <p className="font-medium">No transactions yet</p>
              <p className="text-sm text-muted-foreground">
                Import a CSV export from your bank or add a transaction manually to get started.
              </p>
              <Link
                to="/account/insights/spending"
                className="inline-flex text-sm font-medium text-primary hover:underline"
              >
                View spending insights →
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-border/60 rounded-2xl border border-border/60 bg-background/50">
          {items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-start justify-between gap-3 p-5">
              <div className="space-y-1">
                <p className="font-medium">{item.merchantName}</p>
                <p className="text-sm text-muted-foreground">
                  {item.cardName} · {item.bankName} · {formatWhen(item.transactedAt)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.categoryLabel} · {TRANSACTION_STATUS_LABELS[item.status]}
                  {item.source === 'CSV_IMPORT' ? ' · CSV import' : ''}
                </p>
              </div>
              <p className="text-lg font-semibold">{formatInr(item.amountInr)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
