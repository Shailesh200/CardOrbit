import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@cardwise/ui';
import { BarChart3, Download, FileSpreadsheet, Receipt } from 'lucide-react';

import { EmptyState } from '../../components/feedback/EmptyState';
import { PageBackLink } from '@layout/PageBackLink';
import { notify, toast } from '@lib/app-toast';
import {
  downloadCsv,
  exportReportCsv,
  formatReportInr,
  getReport,
  getReportsHub,
  type ReportSection,
  type UserReportPeriod,
  type UserReportType,
  type UserReportsHub,
} from './reports-api';

const PERIODS: Array<{ id: UserReportPeriod; label: string }> = [
  { id: '30d', label: '30 days' },
  { id: '90d', label: '90 days' },
  { id: 'month', label: 'Month' },
  { id: 'quarter', label: 'Quarter' },
  { id: 'year', label: 'Year' },
];

function isZeroishKpi(value: string): boolean {
  const normalized = value.replace(/[,\s]/g, '').toLowerCase();
  return (
    normalized === '0' ||
    normalized === '₹0' ||
    normalized === '0%' ||
    normalized === '—' ||
    normalized === '-' ||
    normalized === 'n/a'
  );
}

function hubHasReportableData(hub: UserReportsHub): boolean {
  const kpiSignal = hub.kpis.some((kpi) => !isZeroishKpi(kpi.value));
  const sectionSignal = hub.sections.some(
    (section) =>
      section.breakdown.some((row) => row.valueInr > 0) ||
      section.kpis.some((kpi) => !isZeroishKpi(kpi.value)),
  );
  return kpiSignal || sectionSignal;
}

function KpiGrid({ kpis }: { kpis: UserReportsHub['kpis'] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <div key={kpi.id} className="rounded-2xl border border-border/60 bg-background/60 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{kpi.label}</p>
          <p className="mt-1 font-display text-2xl font-semibold">{kpi.value}</p>
          {kpi.hint ? <p className="mt-1 text-xs text-muted-foreground">{kpi.hint}</p> : null}
        </div>
      ))}
    </div>
  );
}

function BreakdownList({ rows }: { rows: ReportSection['breakdown'] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No breakdown data for this period.</p>;
  }
  const max = rows[0]?.sharePercent ?? 0;
  return (
    <ul className="space-y-3">
      {rows.slice(0, 8).map((row) => (
        <li key={row.id} className="space-y-1">
          <div className="flex items-center justify-between gap-3 text-sm">
            <div>
              <p className="font-medium">{row.label}</p>
              {row.sublabel ? (
                <p className="text-xs text-muted-foreground">{row.sublabel}</p>
              ) : null}
            </div>
            <div className="text-right">
              <p className="font-semibold">{formatReportInr(row.valueInr)}</p>
              <p className="text-xs text-muted-foreground">{row.sharePercent.toFixed(1)}%</p>
            </div>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${max > 0 ? Math.max(6, (row.sharePercent / max) * 100) : 0}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function SectionCard({ section }: { section: ReportSection }) {
  return (
    <section className="space-y-4 rounded-2xl border border-border/60 bg-background/60 p-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          {section.periodLabel}
        </p>
        <h2 className="font-display text-xl font-semibold">{section.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
      </div>
      <KpiGrid kpis={section.kpis} />
      {section.comparison ? (
        <p className="text-sm text-muted-foreground">
          {section.comparison.label}:{' '}
          <span className="font-medium text-foreground">
            {section.comparison.changePercent == null
              ? '—'
              : `${section.comparison.changePercent > 0 ? '+' : ''}${section.comparison.changePercent.toFixed(1)}%`}
          </span>{' '}
          ({formatReportInr(section.comparison.previousInr)} →{' '}
          {formatReportInr(section.comparison.currentInr)})
        </p>
      ) : null}
      <BreakdownList rows={section.breakdown} />
      {section.insights.length > 0 ? (
        <ul className="space-y-2">
          {section.insights.map((insight) => (
            <li key={insight.id} className="rounded-xl border border-border/50 p-3">
              <p className="font-medium">{insight.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{insight.body}</p>
              {insight.actionLabel && insight.actionPath ? (
                <Link
                  to={insight.actionPath}
                  className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
                >
                  {insight.actionLabel} →
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

export function ReportsPage() {
  const [period, setPeriod] = useState<UserReportPeriod>('90d');
  const [hub, setHub] = useState<UserReportsHub | null>(null);
  const [activeType, setActiveType] = useState<Exclude<UserReportType, 'hub'> | 'overview'>(
    'overview',
  );
  const [detail, setDetail] = useState<ReportSection | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const hasData = useMemo(() => (hub ? hubHasReportableData(hub) : false), [hub]);

  const loadHub = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getReportsHub(period);
      setHub(data);
      setDetail(null);
      setActiveType('overview');
    } catch (error) {
      notify.fromError(error, 'Reports unavailable');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    document.title = 'CardOrbit · Reports';
    void loadHub();
  }, [loadHub]);

  async function openReport(type: Exclude<UserReportType, 'hub'>) {
    setLoading(true);
    setActiveType(type);
    try {
      const section = await getReport(type, period);
      setDetail(section);
    } catch (error) {
      notify.fromError(error, 'Could not load report');
    } finally {
      setLoading(false);
    }
  }

  async function onExportAll() {
    if (!hub || !hasData) return;
    setExporting(true);
    try {
      const types = hub.availableReports
        .map((report) => report.type)
        .filter((type): type is Exclude<UserReportType, 'hub'> => type !== 'hub');
      const chunks: string[] = [];
      for (const type of types) {
        const payload = await exportReportCsv(type, period);
        chunks.push(`# ${payload.filename}\n${payload.content.trim()}`);
      }
      downloadCsv({
        type: 'hub',
        format: 'csv',
        filename: `cardwise-reports-${period}.csv`,
        contentType: 'text/csv;charset=utf-8',
        content: chunks.join('\n\n'),
        generatedAt: new Date().toISOString(),
      });
      toast.success('Full report downloaded');
    } catch (error) {
      notify.fromError(error, 'Export failed');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageBackLink to="/account" label="Home" />
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Reports</p>
          <h1 className="consumer-page-heading font-display text-[1.75rem] font-semibold tracking-tight">
            Reports & analytics
          </h1>
          <p className="text-sm text-muted-foreground">
            Spending, cashback, rewards, and fee reports with period comparison.
          </p>
        </div>
        {hub && hasData ? (
          <Button
            size="sm"
            className="btn-premium"
            disabled={exporting}
            onClick={() => void onExportAll()}
          >
            <Download className="size-4" />
            {exporting ? 'Preparing…' : 'Download full report'}
          </Button>
        ) : null}
      </header>

      <div className="flex flex-wrap gap-2">
        {PERIODS.map((item) => (
          <Button
            key={item.id}
            size="sm"
            variant={period === item.id ? 'default' : 'outline'}
            onClick={() => setPeriod(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {loading && !hub ? <p className="text-sm text-muted-foreground">Loading reports…</p> : null}

      {hub && !hasData ? (
        <EmptyState
          icon={Receipt}
          title="Get started with reports"
          description="Add cards and import or log transactions to unlock spending, cashback, and reward analytics."
          action={
            <Button asChild size="sm" className="btn-premium">
              <Link to="/account/transactions">Add transactions</Link>
            </Button>
          }
          secondaryAction={
            <Button asChild size="sm" variant="outline">
              <Link to="/account/cards/add">Add a card</Link>
            </Button>
          }
        />
      ) : null}

      {hub && hasData ? (
        <>
          <KpiGrid kpis={hub.kpis} />

          {hub.comparison ? (
            <p className="text-sm text-muted-foreground">
              {hub.comparison.label}:{' '}
              <span className="font-medium text-foreground">
                {hub.comparison.changePercent == null
                  ? '—'
                  : `${hub.comparison.changePercent > 0 ? '+' : ''}${hub.comparison.changePercent.toFixed(1)}%`}
              </span>
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={activeType === 'overview' ? 'default' : 'outline'}
              onClick={() => {
                setActiveType('overview');
                setDetail(null);
              }}
            >
              <BarChart3 className="size-4" />
              Overview
            </Button>
            {hub.availableReports
              .filter((report) => report.type !== 'hub')
              .map((report) => (
                <Button
                  key={report.type}
                  size="sm"
                  variant={activeType === report.type ? 'default' : 'outline'}
                  onClick={() => void openReport(report.type as Exclude<UserReportType, 'hub'>)}
                >
                  <FileSpreadsheet className="size-4" />
                  {report.title}
                </Button>
              ))}
          </div>

          {activeType === 'overview' ? (
            <div className="space-y-6">
              {hub.insights.length > 0 ? (
                <section className="space-y-3">
                  <h2 className="font-display text-lg font-semibold">Insights</h2>
                  <ul className="grid gap-3 md:grid-cols-2">
                    {hub.insights.map((insight) => (
                      <li
                        key={insight.id}
                        className="rounded-2xl border border-border/60 bg-background/60 p-4"
                      >
                        <p className="font-semibold">{insight.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{insight.body}</p>
                        {insight.actionLabel && insight.actionPath ? (
                          <Link
                            to={insight.actionPath}
                            className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
                          >
                            {insight.actionLabel} →
                          </Link>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <div className="space-y-6">
                {hub.sections.map((section) => (
                  <SectionCard key={section.type} section={section} />
                ))}
              </div>
            </div>
          ) : null}

          {detail && activeType !== 'overview' ? <SectionCard section={detail} /> : null}
        </>
      ) : null}
    </div>
  );
}
