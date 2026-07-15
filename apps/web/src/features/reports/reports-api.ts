import { authFetch } from '@cardwise/auth';

const API_BASE = import.meta.env.VITE_API_URL || '';

export type UserReportType =
  | 'hub'
  | 'monthly_spending'
  | 'category_analysis'
  | 'merchant_analysis'
  | 'cashback_summary'
  | 'reward_summary'
  | 'fee_analysis'
  | 'issuer_comparison';

export type UserReportPeriod = '30d' | '90d' | 'month' | 'quarter' | 'year';

export type ReportKpi = {
  id: string;
  label: string;
  value: string;
  hint: string | null;
};

export type ReportBreakdownRow = {
  id: string;
  label: string;
  sublabel: string | null;
  valueInr: number;
  sharePercent: number;
  count: number | null;
};

export type ReportComparison = {
  label: string;
  currentInr: number;
  previousInr: number;
  changePercent: number | null;
  direction: 'up' | 'down' | 'flat';
};

export type ReportInsight = {
  id: string;
  title: string;
  body: string;
  actionLabel: string | null;
  actionPath: string | null;
};

export type ReportSection = {
  type: UserReportType;
  title: string;
  description: string;
  periodLabel: string;
  kpis: ReportKpi[];
  breakdown: ReportBreakdownRow[];
  comparison: ReportComparison | null;
  insights: ReportInsight[];
};

export type UserReportsHub = {
  generatedAt: string;
  periodLabel: string;
  availableReports: Array<{ type: UserReportType; title: string; description: string }>;
  kpis: ReportKpi[];
  comparison: ReportComparison | null;
  sections: ReportSection[];
  insights: ReportInsight[];
};

export type UserReportExportResponse = {
  type: UserReportType;
  format: 'csv';
  filename: string;
  contentType: string;
  content: string;
  generatedAt: string;
};

export function formatReportInr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

function queryParams(period: UserReportPeriod, userCardId?: string) {
  const params = new URLSearchParams({ period });
  if (userCardId) params.set('userCardId', userCardId);
  return params;
}

export function getReportsHub(period: UserReportPeriod = '90d', userCardId?: string) {
  return authFetch<UserReportsHub>(
    `/api/v1/reports?${queryParams(period, userCardId).toString()}`,
    {},
    API_BASE,
  );
}

export function getReport(
  type: Exclude<UserReportType, 'hub'>,
  period: UserReportPeriod = '90d',
  userCardId?: string,
) {
  return authFetch<ReportSection>(
    `/api/v1/reports/${encodeURIComponent(type)}?${queryParams(period, userCardId).toString()}`,
    {},
    API_BASE,
  );
}

export function exportReportCsv(
  type: Exclude<UserReportType, 'hub'>,
  period: UserReportPeriod = '90d',
  userCardId?: string,
) {
  return authFetch<UserReportExportResponse>(
    `/api/v1/reports/${encodeURIComponent(type)}/export?${queryParams(period, userCardId).toString()}`,
    {},
    API_BASE,
  );
}

export function downloadCsv(exportPayload: UserReportExportResponse) {
  const blob = new Blob([exportPayload.content], { type: exportPayload.contentType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = exportPayload.filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
