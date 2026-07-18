import type { AdminPortalConfig } from '@cardwise/admin-config';

const TOKEN_KEY = 'cardwise.admin.accessToken';
const API_BASE = import.meta.env.VITE_API_URL || '';

/** Dispatched on window when a 401 clears an existing session — AdminShell redirects to /login. */
export const ADMIN_SESSION_EXPIRED_EVENT = 'cardwise:admin-session-expired';

function isLoginPath(path: string): boolean {
  return path.includes('/admin/auth/login');
}

export type AdminPrincipal = {
  id: string;
  email: string;
  role: 'ADMIN';
};

export function getAdminToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAdminToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAdminToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export async function adminFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData;
  if (!isFormData && !headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  const token = getAdminToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  } catch {
    throw new Error(
      'Cannot reach the API (http://localhost:3000). Wait until `bun run dev` shows “API listening”, or run the API service separately.',
    );
  }
  if (!response.ok) {
    const text = await response.text();
    let message = text || `Request failed (${response.status})`;
    try {
      const parsed = JSON.parse(text) as { message?: string | string[] };
      if (parsed.message) {
        message = Array.isArray(parsed.message) ? parsed.message.join(', ') : parsed.message;
      }
    } catch {
      // keep raw text
    }

    const sessionExpired = response.status === 401 && Boolean(token) && !isLoginPath(path);
    if (sessionExpired) {
      clearAdminToken();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(ADMIN_SESSION_EXPIRED_EVENT));
      }
      const expiredError = new Error('Your session has expired. Please sign in again.');
      (expiredError as Error & { silentToast?: boolean }).silentToast = true;
      throw expiredError;
    }

    throw new Error(message);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export function login(email: string, password: string) {
  return adminFetch<{ accessToken: string; admin: AdminPrincipal }>('/api/v1/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function me() {
  return adminFetch<AdminPrincipal>('/api/v1/admin/auth/me');
}

export function listCreditCards() {
  return adminFetch<Array<Record<string, unknown>>>('/api/v1/admin/credit-cards');
}

export function createCreditCard(body: Record<string, unknown>) {
  return adminFetch<Record<string, unknown>>('/api/v1/admin/credit-cards', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function archiveCreditCard(id: string) {
  return adminFetch<{ id: string; archived: true }>(`/api/v1/admin/credit-cards/${id}/archive`, {
    method: 'POST',
  });
}

export function listMerchants() {
  return adminFetch<Array<Record<string, unknown>>>('/api/v1/admin/merchants');
}

export function createMerchant(body: Record<string, unknown>) {
  return adminFetch<Record<string, unknown>>('/api/v1/admin/merchants', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export type MerchantCoverage = {
  totalActive: number;
  withCategory: number;
  withAliases: number;
  withWebsite: number;
  withMccOverride: number;
  globalMccMappings: number;
  avgAliasesPerMerchant: number;
  categoryBreakdown: Array<{
    categoryCode: string;
    categoryName: string;
    merchantCount: number;
  }>;
  mappingQuality: {
    categoryCoveragePct: number;
    aliasCoveragePct: number;
    websiteCoveragePct: number;
  };
  lowQualitySample: Array<{
    id: string;
    name: string;
    slug: string;
    aliasCount: number;
    issues: string[];
  }>;
};

export type AdminMerchantDetail = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  website: string | null;
  brandName: string | null;
  parentBrand: string | null;
  popularityScore: number;
  tags: string[];
  active: boolean;
  category: { id: string; code: string; name: string; slug: string } | null;
  aliases: Array<{ id: string; alias: string }>;
  mccMappings: Array<{ id: string; mccCode: string; description: string | null }>;
  mappingIssues: string[];
};

export type MerchantCategoryOption = {
  id: string;
  code: string;
  name: string;
  slug: string;
};

export function getMerchantCoverage() {
  return adminFetch<MerchantCoverage>('/api/v1/admin/merchants/coverage');
}

export function getAdminMerchantDetail(id: string) {
  return adminFetch<AdminMerchantDetail>(`/api/v1/admin/merchants/${id}`);
}

export function listMerchantCategories() {
  return adminFetch<MerchantCategoryOption[]>('/api/v1/admin/merchant-categories');
}

export function addMerchantAlias(merchantId: string, alias: string) {
  return adminFetch<{ id: string; alias: string }>(
    `/api/v1/admin/merchants/${merchantId}/aliases`,
    {
      method: 'POST',
      body: JSON.stringify({ alias }),
    },
  );
}

export function deleteMerchantAlias(aliasId: string) {
  return adminFetch<{ id: string; deleted: true }>(`/api/v1/admin/merchants/aliases/${aliasId}`, {
    method: 'DELETE',
  });
}

export function createMccMapping(body: {
  mccCode: string;
  categoryId: string;
  merchantId?: string | null;
  description?: string | null;
}) {
  return adminFetch<Record<string, unknown>>('/api/v1/admin/mcc-mappings', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function createOffer(body: Record<string, unknown>) {
  return adminFetch<Record<string, unknown>>('/api/v1/admin/offers', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function listRewardRules() {
  return adminFetch<Array<Record<string, unknown>>>('/api/v1/admin/reward-rules');
}

export type RewardPreviewResult = {
  ruleKey: string;
  ruleName: string;
  estimatedValueInr: number;
  estimatedRedemptionValueInr: number;
  rewardPoints: number;
  cashbackInr: number;
  effectiveRatePercent: number;
  milestoneBonusInr: number;
  capped: boolean;
  capAppliedInr?: number;
  periodCapRemainingInr?: number;
  excluded: boolean;
  exclusionReason?: string;
  benefitsApplied: string[];
  explanation: string;
  confidenceScore: number;
  campaignApplied: boolean;
  milestoneCrossed: boolean;
};

export function previewRewardRule(body: {
  amount: number;
  payload: Record<string, unknown>;
  pointValueInr?: number;
  periodSpendInr?: number;
  periodRewardsEarnedInr?: number;
  at?: string;
}) {
  return adminFetch<RewardPreviewResult>('/api/v1/admin/reward-rules/preview', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function listOffers() {
  return adminFetch<Array<Record<string, unknown>>>('/api/v1/admin/offers');
}

export type AdminUserDetail = {
  id: string;
  email: string;
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  country: string;
  currency: string;
  locale: string;
  timezone: string;
  avatarUrl: string | null;
  emailVerifiedAt: string | null;
  createdAt: string;
  onboardingStatus: string;
  onboardingStep: string;
  onboardingCompletedAt: string | null;
  accountStatus: string;
  role: string;
  portfolioCardCount: number;
  activeSessionCount: number;
  updatedAt: string;
};

export function lookupAdminUserByEmail(email: string) {
  const qs = new URLSearchParams({ email: email.trim() });
  return adminFetch<AdminUserDetail>(`/api/v1/admin/users?${qs}`);
}

export function getAdminUserById(id: string) {
  return adminFetch<AdminUserDetail>(`/api/v1/admin/users/${id}`);
}

export function deleteAdminUser(id: string) {
  return adminFetch<{ deleted: true; id: string }>(`/api/v1/admin/users/${id}`, {
    method: 'DELETE',
  });
}

export type AdminAssetRow = {
  id: string;
  entityType: 'bank' | 'merchant' | 'credit-card';
  name: string;
  slug: string;
  logoUrl: string | null;
  imageUrl: string | null;
  active: boolean;
  country?: string;
  bankId?: string;
  networkId?: string;
  annualFeeInr?: string | null;
};

export type AdminNetworkOption = {
  id: string;
  name: string;
  slug: string;
  code: string;
};

export type AdminAssetsSummary = {
  totalBanks: number;
  totalMerchants: number;
  totalCreditCards: number;
  missingAssets: number;
};

export type AdminAssetOptions = {
  banks: Array<{ id: string; name: string; slug: string }>;
  networks: AdminNetworkOption[];
};

export type PaginatedAdminAssetsResponse = {
  tab: 'banks' | 'merchants' | 'credit-cards';
  items: AdminAssetRow[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  summary: AdminAssetsSummary;
  options: AdminAssetOptions;
};

/** @deprecated Use PaginatedAdminAssetsResponse */
export type AdminAssetsResponse = PaginatedAdminAssetsResponse;

export type AssetTab = 'banks' | 'merchants' | 'credit-cards';

export function listAdminAssets(params: {
  tab: AssetTab;
  page?: number;
  limit?: number;
  q?: string;
}) {
  const qs = new URLSearchParams();
  qs.set('tab', params.tab);
  qs.set('page', String(params.page ?? 1));
  qs.set('limit', String(params.limit ?? 10));
  if (params.q?.trim()) qs.set('q', params.q.trim());
  return adminFetch<PaginatedAdminAssetsResponse>(`/api/v1/admin/assets?${qs}`);
}

export function uploadAssetFile(file: File, entityType: AssetTab, slug?: string) {
  const form = new FormData();
  form.append('file', file);
  form.append('entityType', entityType);
  if (slug?.trim()) form.append('slug', slug.trim());
  return adminFetch<{ url: string; path: string }>('/api/v1/admin/assets/upload', {
    method: 'POST',
    body: form,
  });
}

export function createBank(body: Record<string, unknown>) {
  return adminFetch<AdminAssetRow>('/api/v1/admin/assets/banks', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateBank(id: string, body: Record<string, unknown>) {
  return adminFetch<AdminAssetRow>(`/api/v1/admin/assets/banks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function archiveBank(id: string) {
  return adminFetch<{ id: string; archived: true }>(`/api/v1/admin/assets/banks/${id}/archive`, {
    method: 'POST',
  });
}

export function createMerchantAsset(body: Record<string, unknown>) {
  return adminFetch<AdminAssetRow>('/api/v1/admin/assets/merchants', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateMerchant(id: string, body: Record<string, unknown>) {
  return adminFetch<AdminAssetRow>(`/api/v1/admin/assets/merchants/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function archiveMerchant(id: string) {
  return adminFetch<{ id: string; archived: true }>(
    `/api/v1/admin/assets/merchants/${id}/archive`,
    { method: 'POST' },
  );
}

export function createCreditCardAsset(body: Record<string, unknown>) {
  return adminFetch<AdminAssetRow>('/api/v1/admin/assets/credit-cards', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateCreditCard(id: string, body: Record<string, unknown>) {
  return adminFetch<AdminAssetRow>(`/api/v1/admin/assets/credit-cards/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function archiveCreditCardAsset(id: string) {
  return adminFetch<{ id: string; archived: true }>(
    `/api/v1/admin/assets/credit-cards/${id}/archive`,
    { method: 'POST' },
  );
}

/** @deprecated Use updateBank / updateMerchant / updateCreditCard */
export function updateBankAsset(id: string, body: { logoUrl: string | null }) {
  return updateBank(id, body);
}

/** @deprecated Use updateMerchant */
export function updateMerchantAsset(id: string, body: { logoUrl: string | null }) {
  return updateMerchant(id, body);
}

/** @deprecated Use updateCreditCard */
export function updateCreditCardAsset(id: string, body: { imageUrl: string | null }) {
  return updateCreditCard(id, body);
}

export type CatalogImportItem = {
  id: string;
  batchId: string;
  entityType: string;
  entityKey: string;
  sourceUrl: string | null;
  payload: unknown;
  summary: string | null;
  reviewStatus: string;
  reviewedAt: string | null;
  reviewNotes: string | null;
  publishedAt: string | null;
  publishedEntityId: string | null;
  createdAt: string;
};

export function aiIngestBankCatalog(
  bankSlug: string,
  options?: { purgePending?: boolean; limit?: number },
) {
  return enqueueAdminJob('catalog.ai-ingest', {
    bankSlug,
    purgePending: options?.purgePending !== false,
    ...(options?.limit !== undefined ? { limit: options.limit } : {}),
  });
}

export function crawlBankCatalog(bankSlug: string) {
  return enqueueAdminJob('catalog.crawl', { bankSlug });
}

export type AiIngestJobStatus = {
  batchId: string;
  bankSlug: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  totalUrls: number;
  processedUrls: number;
  itemCount: number;
  failedUrls: string[];
  currentUrl: string | null;
  model: string;
  promptVersion: string | null;
  purgedPending: number;
  discoveredUrls: number;
  startedAt: string;
  completedAt: string | null;
  error: string | null;
};

export function getAiIngestJobStatus(batchId: string) {
  return adminFetch<AiIngestJobStatus>(
    `/api/v1/admin/catalog-import/batches/${encodeURIComponent(batchId)}/ai-ingest-status`,
  );
}

export type CatalogImportIngestMeta = {
  method: 'ai' | 'crawl' | 'ai+fallback' | 'fallback';
  model?: string;
  promptVersion?: string;
  latencyMs?: number;
  fallbackBundle?: Record<string, unknown>;
};

export function getCatalogImportItem(id: string) {
  return adminFetch<CatalogImportItem>(`/api/v1/admin/catalog-import/items/${id}`);
}

export function listCatalogImportItems(params?: {
  status?: string;
  entityType?: string;
  limit?: number;
  offset?: number;
}) {
  const search = new URLSearchParams();
  if (params?.status) search.set('status', params.status);
  if (params?.entityType) search.set('entityType', params.entityType);
  if (params?.limit !== undefined) search.set('limit', String(params.limit));
  if (params?.offset !== undefined) search.set('offset', String(params.offset));
  const qs = search.toString();
  return adminFetch<{ items: CatalogImportItem[]; total: number }>(
    `/api/v1/admin/catalog-import/items${qs ? `?${qs}` : ''}`,
  );
}

export function approveCatalogImportItem(id: string, notes?: string) {
  return adminFetch<CatalogImportItem>(`/api/v1/admin/catalog-import/items/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify({ notes }),
  });
}

export function rejectCatalogImportItem(id: string, notes?: string) {
  return adminFetch<CatalogImportItem>(`/api/v1/admin/catalog-import/items/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ notes }),
  });
}

export function publishCatalogImportItem(id: string) {
  return adminFetch<CatalogImportItem>(`/api/v1/admin/catalog-import/items/${id}/publish`, {
    method: 'POST',
  });
}

export function publishCatalogImportBatch(batchId: string) {
  return adminFetch<{ published: number }>(
    `/api/v1/admin/catalog-import/batches/${batchId}/publish-approved`,
    { method: 'POST' },
  );
}

export function getCatalogImportStats() {
  return adminFetch<{
    liveCatalogCards: number;
    importPending: number;
    importApproved: number;
    importPublished: number;
  }>('/api/v1/admin/catalog-import/stats');
}

export function approveAllPendingCatalogItems(entityType?: string) {
  const qs = entityType ? `?entityType=${encodeURIComponent(entityType)}` : '';
  return adminFetch<{ approved: number }>(`/api/v1/admin/catalog-import/approve-all-pending${qs}`, {
    method: 'POST',
  });
}

export function publishAllApprovedCatalogItems(entityType?: string) {
  const qs = entityType ? `?entityType=${encodeURIComponent(entityType)}` : '';
  return adminFetch<{ published: number }>(
    `/api/v1/admin/catalog-import/publish-all-approved${qs}`,
    {
      method: 'POST',
    },
  );
}

export type AiPlatformStatus = {
  configured: boolean;
  provider?: string;
  defaultModel?: string;
  fastModel?: string;
  qualityModel?: string;
  pingModel?: string;
  platformEnabled: boolean;
  flags: Record<string, boolean>;
};

export type AiRunRow = {
  id: string;
  feature: string;
  promptVersion: string | null;
  model: string;
  provider: string;
  tier: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  latencyMs: number;
  status: 'SUCCESS' | 'FAILURE';
  errorCode: string | null;
  errorMessage: string | null;
  metadata: unknown;
  triggeredBy: string | null;
  createdAt: string;
};

export type AiRunSummary = {
  windowDays: number;
  since: string;
  totalRuns: number;
  successCount: number;
  failureCount: number;
  tokens: { input: number; output: number; total: number };
  avgLatencyMs: number;
  byFeature: Array<{ feature: string; runs: number; totalTokens: number }>;
  recentFailures: Array<{
    id: string;
    feature: string;
    model: string;
    errorMessage: string | null;
    createdAt: string;
  }>;
};

export type AiPromptVersionRow = {
  id: string;
  feature: string;
  version: string;
  systemPrompt: string;
  userTemplate: string | null;
  modelTier: string | null;
  modelOverride: string | null;
  isActive: boolean;
  metadata: unknown;
  createdAt: string;
  updatedAt: string;
};

export type AiTaskRoutingRow = {
  feature: string;
  activeVersion: string | null;
  modelTier: string;
  modelOverride: string | null;
  envDefaultModel: string;
  effectiveModel: string;
};

export function getAiPlatformStatus() {
  return adminFetch<AiPlatformStatus>('/api/v1/admin/ai/status');
}

export function getAiTaskRouting() {
  return adminFetch<{ configured: boolean; routes: AiTaskRoutingRow[] }>(
    '/api/v1/admin/ai/routing',
  );
}

export function pingAiPlatform() {
  return adminFetch<{
    ok: boolean;
    model: string;
    latencyMs: number;
    text: string;
    verifiedModel: string;
  }>('/api/v1/admin/ai/ping', { method: 'POST' });
}

export function getAiRunSummary(days = 7) {
  return adminFetch<AiRunSummary>(`/api/v1/admin/ai/runs/summary?days=${days}`);
}

export function listAiRuns(params?: {
  feature?: string;
  status?: 'SUCCESS' | 'FAILURE';
  limit?: number;
  offset?: number;
}) {
  const search = new URLSearchParams();
  if (params?.feature) search.set('feature', params.feature);
  if (params?.status) search.set('status', params.status);
  if (params?.limit !== undefined) search.set('limit', String(params.limit));
  if (params?.offset !== undefined) search.set('offset', String(params.offset));
  const qs = search.toString();
  return adminFetch<{ items: AiRunRow[]; total: number; limit: number; offset: number }>(
    `/api/v1/admin/ai/runs${qs ? `?${qs}` : ''}`,
  );
}

export function getAiRun(id: string) {
  return adminFetch<AiRunRow>(`/api/v1/admin/ai/runs/${id}`);
}

export function listAiPrompts(feature?: string) {
  const qs = feature ? `?feature=${encodeURIComponent(feature)}` : '';
  return adminFetch<AiPromptVersionRow[]>(`/api/v1/admin/ai/prompts${qs}`);
}

export function getAiPrompt(id: string) {
  return adminFetch<AiPromptVersionRow>(`/api/v1/admin/ai/prompts/${id}`);
}

export function createAiPrompt(body: {
  feature: string;
  version: string;
  systemPrompt: string;
  userTemplate?: string;
  modelTier?: 'fast' | 'quality' | 'ping';
  modelOverride?: string;
  activate?: boolean;
}) {
  return adminFetch<AiPromptVersionRow>('/api/v1/admin/ai/prompts', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateAiPrompt(
  id: string,
  body: {
    systemPrompt?: string;
    userTemplate?: string | null;
    modelTier?: 'fast' | 'quality' | 'ping' | null;
    modelOverride?: string | null;
  },
) {
  return adminFetch<AiPromptVersionRow>(`/api/v1/admin/ai/prompts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function activateAiPrompt(id: string) {
  return adminFetch<AiPromptVersionRow>(`/api/v1/admin/ai/prompts/${id}/activate`, {
    method: 'POST',
  });
}

export function fetchAdminConfig() {
  return adminFetch<AdminPortalConfig>('/api/v1/admin/sdui/config');
}

export function enqueueAdminJob(type: string, payload: Record<string, unknown>) {
  return adminFetch<{
    id: string;
    message?: string;
    estimatedMinutes?: { min: number; max: number } | null;
  }>('/api/v1/admin/jobs', { method: 'POST', body: JSON.stringify({ type, payload }) });
}

export function fetchAdminJob(id: string) {
  return adminFetch<{
    id: string;
    type: string;
    status: string;
    payload?: Record<string, unknown> | null;
    progress?: Record<string, unknown> | null;
    result?: Record<string, unknown> | null;
    errorMessage?: string | null;
    estimatedMinutes?: { min: number; max: number } | null;
    message?: string;
  }>(`/api/v1/admin/jobs/${id}`);
}

export function cancelAdminJob(id: string) {
  return adminFetch<{
    id: string;
    type: string;
    status: string;
    errorMessage?: string | null;
  }>(`/api/v1/admin/jobs/cancel/${encodeURIComponent(id)}`, { method: 'POST' });
}

export function listAdminJobs(params?: {
  type?: string;
  limit?: number;
  offset?: number;
  active?: boolean;
}) {
  const search = new URLSearchParams();
  if (params?.type) search.set('type', params.type);
  if (params?.limit !== undefined) search.set('limit', String(params.limit));
  if (params?.offset !== undefined) search.set('offset', String(params.offset));
  if (params?.active) search.set('active', 'true');
  const qs = search.toString();
  return adminFetch<{ items: Array<Record<string, unknown>>; total: number }>(
    `/api/v1/admin/jobs${qs ? `?${qs}` : ''}`,
  );
}

export function listActiveAdminJobs() {
  return listAdminJobs({ active: true, limit: 10 }) as Promise<{
    items: Array<{
      id: string;
      type: string;
      status: string;
      jobLabel?: string;
      targetLabel?: string;
    }>;
    total: number;
  }>;
}

export async function fetchAdminDataSource(source: string, params?: Record<string, unknown>) {
  const limit = params?.limit as number | undefined;
  const offset = params?.offset as number | undefined;

  switch (source) {
    case 'admin.insights.overview':
      return adminFetch('/api/v1/admin/insights/overview');
    case 'admin.catalog.stats':
      return adminFetch('/api/v1/admin/insights/catalog-stats');
    case 'admin.rules.templates':
      return adminFetch('/api/v1/admin/insights/rule-templates');
    case 'admin.jobs.recent': {
      const data = await listAdminJobs({ limit, offset });
      return {
        ...data,
        items: data.items.map((row) => ({
          ...row,
          jobLabel: row.jobLabel ?? row.description ?? row.type,
          targetLabel: row.targetLabel ?? row.bankName ?? '—',
          purgePendingLabel: row.purgePendingLabel ?? '—',
          limitPagesLabel: row.limitPagesLabel ?? '—',
          progressSummary: row.progressSummary ?? '—',
        })),
      };
    }
    case 'admin.users.list':
      return adminFetch(`/api/v1/admin/users?limit=${limit ?? 10}&offset=${offset ?? 0}`);
    case 'admin.credit-cards.list': {
      const cards = await listCreditCards();
      return {
        items: cards.map((row) => ({
          id: row.id,
          name: row.name,
          bankName: (row.bank as { name?: string } | undefined)?.name ?? '—',
          tier: row.tier,
          active: row.active ? 'Active' : 'Archived',
        })),
      };
    }
    case 'admin.reward-rules.list': {
      const rules = await listRewardRules();
      return {
        items: rules.map((row) => {
          const rule = row.rule as {
            ruleKey?: string;
            name?: string;
            creditCard?: { name?: string };
          };
          const version = row.activeVersion as { status?: string } | undefined;
          return {
            id: (row.rule as { id?: string }).id,
            ruleKey: rule.ruleKey,
            name: rule.name,
            cardName: rule.creditCard?.name ?? '—',
            status: version?.status ?? '—',
          };
        }),
      };
    }
    case 'admin.offers.list': {
      const offers = await listOffers();
      return {
        items: offers.map((row) => ({
          id: row.id,
          title: row.title,
          status: row.status,
          validUntil: row.validUntil,
        })),
      };
    }
    default:
      throw new Error(`Unknown data source: ${source}`);
  }
}

export type AdminFeatureFlagDefinition = {
  id: string;
  key: string;
  description?: string | null;
  enabled: boolean;
  rolloutPercentage: number;
  updatedBy?: string | null;
  updatedAt: string;
};

export function fetchAdminFeatureFlags() {
  return adminFetch<AdminFeatureFlagDefinition[]>('/api/v1/admin/features');
}

export function updateAdminFeatureFlag(
  key: string,
  body: { enabled?: boolean; rolloutPercentage?: number; description?: string | null },
) {
  return adminFetch<AdminFeatureFlagDefinition>(
    `/api/v1/admin/features/${encodeURIComponent(key)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(body),
    },
  );
}

export type AdminExperimentDefinition = {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  variants: string[];
  defaultVariant: string;
  enabled: boolean;
  rolloutPercentage: number;
  updatedBy?: string | null;
  updatedAt: string;
};

export function fetchAdminExperiments() {
  return adminFetch<AdminExperimentDefinition[]>('/api/v1/admin/experiments');
}

export function updateAdminExperiment(
  key: string,
  body: {
    enabled?: boolean;
    rolloutPercentage?: number;
    description?: string | null;
    name?: string;
  },
) {
  return adminFetch<AdminExperimentDefinition>(
    `/api/v1/admin/experiments/${encodeURIComponent(key)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(body),
    },
  );
}
