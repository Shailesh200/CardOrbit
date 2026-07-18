import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { CalendarDays, FileText, Receipt } from 'lucide-react';

import { PageBackLink } from '@layout/PageBackLink';
import { notify, toast } from '@lib/app-toast';
import { listPortfolio, type PortfolioCardSummary } from '../portfolio/portfolio-api';
import {
  BILL_STATUS_LABELS,
  createStatement,
  formatDate,
  formatInr,
  getBillingCalendar,
  listBills,
  listStatements,
  recordBillPayment,
  toDatetimeLocalValue,
  type BillSummary,
  type StatementSummary,
} from './billing-api';

type Tab = 'bills' | 'statements' | 'calendar';

function statusClass(status: BillSummary['status']): string {
  if (status === 'OVERDUE') return 'text-destructive';
  if (status === 'UPCOMING') return 'text-muted-foreground';
  if (status === 'PAID') return 'text-emerald-600';
  return 'text-primary';
}

export function BillingPage() {
  const now = useMemo(() => new Date(), []);
  const [tab, setTab] = useState<Tab>('bills');
  const [cards, setCards] = useState<PortfolioCardSummary[]>([]);
  const [bills, setBills] = useState<BillSummary[]>([]);
  const [statements, setStatements] = useState<StatementSummary[]>([]);
  const [calendarMonth, setCalendarMonth] = useState({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  });
  const [calendarDays, setCalendarDays] = useState<
    Awaited<ReturnType<typeof getBillingCalendar>>['days'] | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [showAddStatement, setShowAddStatement] = useState(false);
  const [paymentBillId, setPaymentBillId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [statementDraft, setStatementDraft] = useState({
    userCardId: '',
    totalAmountInr: '',
    minimumDueInr: '',
    statementDate: toDatetimeLocalValue(now),
    dueDate: toDatetimeLocalValue(new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000)),
    periodStart: toDatetimeLocalValue(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
    periodEnd: toDatetimeLocalValue(now),
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [portfolio, billResponse, statementResponse] = await Promise.all([
        listPortfolio(),
        listBills(false),
        listStatements({ year: now.getFullYear() }),
      ]);
      setCards(portfolio);
      setBills(billResponse.items);
      setStatements(statementResponse.items);
      if (!statementDraft.userCardId && portfolio[0]) {
        setStatementDraft((current) => ({ ...current, userCardId: portfolio[0]!.id }));
      }
    } catch (error) {
      notify.fromError(error, 'Billing data unavailable');
    } finally {
      setLoading(false);
    }
  }, [now]);

  const loadCalendar = useCallback(async () => {
    try {
      const response = await getBillingCalendar(calendarMonth.year, calendarMonth.month);
      setCalendarDays(response.days);
    } catch (error) {
      notify.fromError(error, 'Calendar unavailable');
      setCalendarDays(null);
    }
  }, [calendarMonth.month, calendarMonth.year]);

  useEffect(() => {
    document.title = 'CardOrbit · Billing';
    void load();
  }, [load]);

  useEffect(() => {
    if (tab === 'calendar') void loadCalendar();
  }, [tab, loadCalendar]);

  async function onCreateStatement() {
    const totalAmountInr = Number.parseFloat(statementDraft.totalAmountInr.replace(/,/g, ''));
    const minimumDueInr = Number.parseFloat(statementDraft.minimumDueInr.replace(/,/g, ''));
    if (
      !statementDraft.userCardId ||
      !Number.isFinite(totalAmountInr) ||
      !Number.isFinite(minimumDueInr)
    ) {
      toast.error('Fill in card, total due, and minimum due');
      return;
    }

    setSaving(true);
    try {
      await createStatement({
        userCardId: statementDraft.userCardId,
        periodStart: new Date(statementDraft.periodStart).toISOString(),
        periodEnd: new Date(statementDraft.periodEnd).toISOString(),
        statementDate: new Date(statementDraft.statementDate).toISOString(),
        dueDate: new Date(statementDraft.dueDate).toISOString(),
        totalAmountInr,
        minimumDueInr,
      });
      toast.success('Statement saved');
      setShowAddStatement(false);
      await load();
      setTab('statements');
    } catch (error) {
      notify.fromError(error, 'Could not save statement');
    } finally {
      setSaving(false);
    }
  }

  async function onRecordPayment() {
    if (!paymentBillId) return;
    const amountInr = Number.parseFloat(paymentAmount.replace(/,/g, ''));
    if (!Number.isFinite(amountInr) || amountInr <= 0) {
      toast.error('Enter a valid payment amount');
      return;
    }

    setSaving(true);
    try {
      await recordBillPayment(paymentBillId, {
        amountInr,
        paidAt: new Date().toISOString(),
      });
      toast.success('Payment recorded');
      setPaymentBillId(null);
      setPaymentAmount('');
      await load();
    } catch (error) {
      notify.fromError(error, 'Could not record payment');
    } finally {
      setSaving(false);
    }
  }

  const overdueCount = bills.filter((bill) => bill.status === 'OVERDUE').length;

  return (
    <div className="space-y-8">
      <PageBackLink to="/account" label="Account" />

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-primary/10 p-2 text-primary" aria-hidden>
            <CalendarDays className="size-5" />
          </span>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              Billing
            </p>
            <h1 className="consumer-page-heading font-display text-2xl font-semibold tracking-tight">
              Statements & bills
            </h1>
            <p className="text-sm text-muted-foreground">
              Track statement totals, due dates, and payments across your portfolio cards.
            </p>
          </div>
        </div>
        <Button type="button" size="sm" onClick={() => setShowAddStatement((open) => !open)}>
          <FileText className="size-4" />
          Add statement
        </Button>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-2xl border border-border/60 bg-background/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Open bills
          </p>
          <p className="mt-1 font-semibold">{bills.length}</p>
        </article>
        <article className="rounded-2xl border border-border/60 bg-background/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Overdue
          </p>
          <p className={`mt-1 font-semibold ${overdueCount > 0 ? 'text-destructive' : ''}`}>
            {overdueCount}
          </p>
        </article>
        <article className="rounded-2xl border border-border/60 bg-background/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Statements saved
          </p>
          <p className="mt-1 font-semibold">{statements.length}</p>
        </article>
      </section>

      {showAddStatement ? (
        <section className="space-y-4 rounded-2xl border border-border/60 bg-background/50 p-5">
          <h2 className="font-semibold">Add statement</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="stmt-card">Card</Label>
              <Select
                value={statementDraft.userCardId || undefined}
                onValueChange={(value) =>
                  setStatementDraft((current) => ({ ...current, userCardId: value }))
                }
              >
                <SelectTrigger id="stmt-card" className="w-full">
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
              <Label htmlFor="stmt-total">Total due (INR)</Label>
              <Input
                id="stmt-total"
                value={statementDraft.totalAmountInr}
                onChange={(event) =>
                  setStatementDraft((current) => ({
                    ...current,
                    totalAmountInr: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stmt-min">Minimum due (INR)</Label>
              <Input
                id="stmt-min"
                value={statementDraft.minimumDueInr}
                onChange={(event) =>
                  setStatementDraft((current) => ({
                    ...current,
                    minimumDueInr: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stmt-due">Due date</Label>
              <Input
                id="stmt-due"
                type="datetime-local"
                value={statementDraft.dueDate}
                onChange={(event) =>
                  setStatementDraft((current) => ({ ...current, dueDate: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stmt-start">Period start</Label>
              <Input
                id="stmt-start"
                type="datetime-local"
                value={statementDraft.periodStart}
                onChange={(event) =>
                  setStatementDraft((current) => ({ ...current, periodStart: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stmt-end">Period end</Label>
              <Input
                id="stmt-end"
                type="datetime-local"
                value={statementDraft.periodEnd}
                onChange={(event) =>
                  setStatementDraft((current) => ({ ...current, periodEnd: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="stmt-date">Statement date</Label>
              <Input
                id="stmt-date"
                type="datetime-local"
                value={statementDraft.statementDate}
                onChange={(event) =>
                  setStatementDraft((current) => ({
                    ...current,
                    statementDate: event.target.value,
                  }))
                }
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" onClick={() => void onCreateStatement()} disabled={saving}>
              {saving ? 'Saving…' : 'Save statement'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowAddStatement(false)}>
              Cancel
            </Button>
          </div>
        </section>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {(['bills', 'statements', 'calendar'] as const).map((value) => (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={tab === value ? 'default' : 'outline'}
            onClick={() => setTab(value)}
          >
            {value === 'bills' ? 'Bills' : value === 'statements' ? 'Statements' : 'Calendar'}
          </Button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading billing data…</p>
      ) : tab === 'bills' ? (
        bills.length === 0 ? (
          <div className="rounded-2xl border border-border/60 bg-background/50 p-6">
            <p className="text-sm text-muted-foreground">
              Set statement and due days on your cards, or add a statement manually to start
              tracking bills.
            </p>
            <Link
              to="/account/cards"
              className="mt-3 inline-flex text-sm font-medium text-primary hover:underline"
            >
              Open portfolio →
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-border/60 rounded-2xl border border-border/60 bg-background/50">
            {bills.map((bill) => (
              <li key={bill.id} className="flex flex-wrap items-start justify-between gap-3 p-5">
                <div className="space-y-1">
                  <p className="font-medium">{bill.cardName}</p>
                  <p className="text-sm text-muted-foreground">
                    Due {formatDate(bill.dueDate)}
                    {bill.daysUntilDue >= 0
                      ? ` · ${bill.daysUntilDue} day${bill.daysUntilDue === 1 ? '' : 's'} left`
                      : ` · ${Math.abs(bill.daysUntilDue)} day${Math.abs(bill.daysUntilDue) === 1 ? '' : 's'} overdue`}
                  </p>
                  <p className={`text-xs font-medium ${statusClass(bill.status)}`}>
                    {BILL_STATUS_LABELS[bill.status]}
                    {bill.estimatedSpendInr != null
                      ? ` · est. spend ${formatInr(bill.estimatedSpendInr)}`
                      : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold">
                    {bill.totalDueInr != null ? formatInr(bill.totalDueInr) : '—'}
                  </p>
                  {bill.minimumDueInr != null ? (
                    <p className="text-xs text-muted-foreground">
                      Min {formatInr(bill.minimumDueInr)}
                    </p>
                  ) : null}
                  {bill.kind === 'statement' && bill.status !== 'PAID' ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      onClick={() => {
                        setPaymentBillId(bill.id);
                        setPaymentAmount(bill.totalDueInr != null ? String(bill.totalDueInr) : '');
                      }}
                    >
                      Record payment
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )
      ) : tab === 'statements' ? (
        statements.length === 0 ? (
          <div className="rounded-2xl border border-border/60 bg-background/50 p-6">
            <div className="flex items-start gap-3">
              <Receipt className="mt-0.5 size-5 text-muted-foreground" aria-hidden />
              <div className="space-y-2">
                <p className="font-medium">No statements yet</p>
                <p className="text-sm text-muted-foreground">
                  Enter totals from your issuer statement to compare against imported transactions.
                </p>
                <Link
                  to="/account/transactions"
                  className="inline-flex text-sm font-medium text-primary hover:underline"
                >
                  View transactions →
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-border/60 rounded-2xl border border-border/60 bg-background/50">
            {statements.map((statement) => (
              <li
                key={statement.id}
                className="flex flex-wrap items-start justify-between gap-3 p-5"
              >
                <div className="space-y-1">
                  <p className="font-medium">{statement.cardName}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(statement.periodStart)} – {formatDate(statement.periodEnd)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {statement.transactionCount} transactions · spend{' '}
                    {formatInr(statement.spendInPeriodInr)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold">{formatInr(statement.totalAmountInr)}</p>
                  <p className="text-xs text-muted-foreground">
                    Due {formatDate(statement.dueDate)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )
      ) : (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                setCalendarMonth((current) => {
                  let month = current.month - 1;
                  let year = current.year;
                  if (month < 1) {
                    month = 12;
                    year -= 1;
                  }
                  return { year, month };
                })
              }
            >
              Previous
            </Button>
            <p className="font-medium">
              {new Date(calendarMonth.year, calendarMonth.month - 1, 1).toLocaleDateString(
                'en-IN',
                {
                  month: 'long',
                  year: 'numeric',
                },
              )}
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                setCalendarMonth((current) => {
                  let month = current.month + 1;
                  let year = current.year;
                  if (month > 12) {
                    month = 1;
                    year += 1;
                  }
                  return { year, month };
                })
              }
            >
              Next
            </Button>
          </div>
          {!calendarDays ? (
            <p className="text-sm text-muted-foreground">Loading calendar…</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {calendarDays
                .filter((day) => day.dueBills.length > 0 || day.statementDates.length > 0)
                .map((day) => (
                  <article
                    key={day.date}
                    className="rounded-xl border border-border/60 bg-background/50 p-4 text-sm"
                  >
                    <p className="font-medium">{formatDate(`${day.date}T12:00:00.000Z`)}</p>
                    {day.dueBills.map((bill) => (
                      <p key={bill.billId} className="mt-2 text-muted-foreground">
                        Due: {bill.cardName}
                        {bill.amountInr != null ? ` · ${formatInr(bill.amountInr)}` : ''}
                      </p>
                    ))}
                    {day.statementDates.map((entry) => (
                      <p key={entry.userCardId} className="mt-2 text-primary">
                        Statement: {entry.cardName}
                      </p>
                    ))}
                  </article>
                ))}
            </div>
          )}
        </section>
      )}

      {paymentBillId ? (
        <section className="fixed inset-x-4 bottom-4 z-20 mx-auto max-w-lg rounded-2xl border border-border/60 bg-background p-5 shadow-lg sm:inset-x-auto sm:right-6">
          <h2 className="font-semibold">Record payment</h2>
          <div className="mt-3 space-y-2">
            <Label htmlFor="payment-amount">Amount (INR)</Label>
            <Input
              id="payment-amount"
              value={paymentAmount}
              onChange={(event) => setPaymentAmount(event.target.value)}
            />
          </div>
          <div className="mt-4 flex gap-2">
            <Button type="button" onClick={() => void onRecordPayment()} disabled={saving}>
              {saving ? 'Saving…' : 'Save payment'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPaymentBillId(null);
                setPaymentAmount('');
              }}
            >
              Cancel
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
