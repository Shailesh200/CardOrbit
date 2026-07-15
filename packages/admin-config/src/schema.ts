import { z } from 'zod';

export const SduiFieldSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('text'),
    name: z.string(),
    label: z.string(),
    placeholder: z.string().optional(),
    required: z.boolean().optional(),
  }),
  z.object({
    kind: z.literal('number'),
    name: z.string(),
    label: z.string(),
    min: z.number().optional(),
    max: z.number().optional(),
    required: z.boolean().optional(),
  }),
  z.object({
    kind: z.literal('boolean'),
    name: z.string(),
    label: z.string(),
    description: z.string().optional(),
  }),
  z.object({
    kind: z.literal('select'),
    name: z.string(),
    label: z.string(),
    optionsSource: z.string(),
    required: z.boolean().optional(),
  }),
  z.object({
    kind: z.literal('textarea'),
    name: z.string(),
    label: z.string(),
    rows: z.number().optional(),
  }),
]);

export type SduiField = z.infer<typeof SduiFieldSchema>;

export const SduiBlockSchema: z.ZodType<SduiBlock> = z.lazy(() =>
  z.discriminatedUnion('type', [
    z.object({
      type: z.literal('hero'),
      title: z.string(),
      description: z.string().optional(),
    }),
    z.object({
      type: z.literal('stats'),
      dataSource: z.string(),
    }),
    z.object({
      type: z.literal('job-launcher'),
      fields: z.array(SduiFieldSchema),
      submitLabel: z.string().optional(),
    }),
    z.object({
      type: z.literal('job-status'),
    }),
    z.object({
      type: z.literal('data-table'),
      dataSource: z.string(),
      title: z.string().optional(),
      description: z.string().optional(),
      columns: z.array(
        z.object({
          key: z.string(),
          label: z.string(),
          format: z.enum(['text', 'badge', 'date', 'currency', 'percent']).optional(),
        }),
      ),
      actions: z
        .array(z.object({ id: z.string(), label: z.string(), variant: z.string().optional() }))
        .optional(),
      pagination: z.boolean().optional(),
    }),
    z.object({
      type: z.literal('sync-history'),
      dataSource: z.string(),
      columns: z.array(
        z.object({
          key: z.string(),
          label: z.string(),
          format: z.enum(['text', 'badge', 'date', 'currency', 'percent']).optional(),
        }),
      ),
    }),
    z.object({
      type: z.literal('form'),
      dataSource: z.string().optional(),
      fields: z.array(SduiFieldSchema),
      submitAction: z.string(),
      submitLabel: z.string().optional(),
      description: z.string().optional(),
    }),
    z.object({
      type: z.literal('tabs'),
      tabs: z.array(
        z.object({
          id: z.string(),
          label: z.string(),
          blocks: z.array(SduiBlockSchema),
        }),
      ),
    }),
    z.object({
      type: z.literal('insight-grid'),
      dataSource: z.string(),
    }),
    z.object({
      type: z.literal('rule-templates'),
      dataSource: z.string(),
    }),
    z.object({
      type: z.literal('import-queue'),
      dataSource: z.string(),
    }),
    z.object({
      type: z.literal('asset-manager'),
      dataSource: z.string(),
    }),
  ]),
);

export type SduiBlock =
  | { type: 'hero'; title: string; description?: string }
  | { type: 'stats'; dataSource: string }
  | { type: 'job-launcher'; fields: SduiField[]; submitLabel?: string }
  | { type: 'job-status' }
  | {
      type: 'data-table';
      dataSource: string;
      title?: string;
      description?: string;
      columns: Array<{ key: string; label: string; format?: string }>;
      actions?: Array<{ id: string; label: string; variant?: string }>;
      pagination?: boolean;
    }
  | {
      type: 'sync-history';
      dataSource: string;
      columns: Array<{ key: string; label: string; format?: string }>;
    }
  | { type: 'form'; dataSource?: string; fields: SduiField[]; submitAction: string; submitLabel?: string; description?: string }
  | { type: 'tabs'; tabs: Array<{ id: string; label: string; blocks: SduiBlock[] }> }
  | { type: 'insight-grid'; dataSource: string }
  | { type: 'rule-templates'; dataSource: string }
  | { type: 'import-queue'; dataSource: string }
  | { type: 'asset-manager'; dataSource: string };

export type AdminPage = {
  id: string;
  path: string;
  title: string;
  description?: string;
  icon: string;
  blocks: SduiBlock[];
};

export type AdminNavItem = {
  id: string;
  label: string;
  path: string;
  icon: string;
  section: string;
};

export type RuleTemplate = {
  id: string;
  entityType: 'card' | 'merchant' | 'offer' | 'program';
  name: string;
  description: string;
  category: string;
  requiredForDecision?: boolean;
  payloadTemplate: Record<string, unknown>;
  userFacingLabel?: string;
};

export type AdminPortalConfig = {
  version: string;
  brand: { name: string; tagline: string };
  nav: AdminNavItem[];
  pages: AdminPage[];
  optionSources: Record<string, Array<{ value: string; label: string }>>;
  ruleTemplates: RuleTemplate[];
};
