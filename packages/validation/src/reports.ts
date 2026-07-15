import { z } from 'zod';

export const UserReportTypeSchema = z.enum([
  'hub',
  'monthly_spending',
  'category_analysis',
  'merchant_analysis',
  'cashback_summary',
  'reward_summary',
  'fee_analysis',
  'issuer_comparison',
]);

export type UserReportType = z.infer<typeof UserReportTypeSchema>;

export const USER_REPORT_TYPES = UserReportTypeSchema.options;

export const UserReportPeriodSchema = z.enum(['30d', '90d', 'month', 'quarter', 'year']);
export type UserReportPeriod = z.infer<typeof UserReportPeriodSchema>;

export const UserReportsQuerySchema = z.object({
  period: UserReportPeriodSchema.default('90d'),
  userCardId: z.string().trim().min(1).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export type UserReportsQuery = z.infer<typeof UserReportsQuerySchema>;

export const ReportKpiSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
  hint: z.string().nullable(),
});

export type ReportKpi = z.infer<typeof ReportKpiSchema>;

export const ReportBreakdownRowSchema = z.object({
  id: z.string(),
  label: z.string(),
  sublabel: z.string().nullable(),
  valueInr: z.number(),
  sharePercent: z.number().min(0).max(100),
  count: z.number().int().nonnegative().nullable(),
});

export type ReportBreakdownRow = z.infer<typeof ReportBreakdownRowSchema>;

export const ReportComparisonSchema = z.object({
  label: z.string(),
  currentInr: z.number(),
  previousInr: z.number(),
  changePercent: z.number().nullable(),
  direction: z.enum(['up', 'down', 'flat']),
});

export type ReportComparison = z.infer<typeof ReportComparisonSchema>;

export const ReportInsightSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  actionLabel: z.string().nullable(),
  actionPath: z.string().nullable(),
});

export type ReportInsight = z.infer<typeof ReportInsightSchema>;

export const ReportSectionSchema = z.object({
  type: UserReportTypeSchema,
  title: z.string(),
  description: z.string(),
  periodLabel: z.string(),
  kpis: z.array(ReportKpiSchema),
  breakdown: z.array(ReportBreakdownRowSchema),
  comparison: ReportComparisonSchema.nullable(),
  insights: z.array(ReportInsightSchema),
});

export type ReportSection = z.infer<typeof ReportSectionSchema>;

export const UserReportsHubSchema = z.object({
  generatedAt: z.string().datetime(),
  periodLabel: z.string(),
  availableReports: z.array(
    z.object({
      type: UserReportTypeSchema,
      title: z.string(),
      description: z.string(),
    }),
  ),
  kpis: z.array(ReportKpiSchema),
  comparison: ReportComparisonSchema.nullable(),
  sections: z.array(ReportSectionSchema),
  insights: z.array(ReportInsightSchema),
});

export type UserReportsHub = z.infer<typeof UserReportsHubSchema>;

export const UserReportExportFormatSchema = z.enum(['csv']);
export type UserReportExportFormat = z.infer<typeof UserReportExportFormatSchema>;

export const UserReportExportResponseSchema = z.object({
  type: UserReportTypeSchema,
  format: UserReportExportFormatSchema,
  filename: z.string(),
  contentType: z.string(),
  content: z.string(),
  generatedAt: z.string().datetime(),
});

export type UserReportExportResponse = z.infer<typeof UserReportExportResponseSchema>;

export function parseUserReportsQuery(input: unknown): UserReportsQuery {
  return UserReportsQuerySchema.parse(input ?? {});
}

export function parseUserReportType(input: unknown): UserReportType {
  return UserReportTypeSchema.parse(input);
}
