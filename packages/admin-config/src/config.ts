import { INDIA_BANK_SOURCES } from '@cardwise/catalog-ingest';
import { catalogAiIngestJob, catalogCrawlJob } from '@cardwise/jobs';

import type { AdminPortalConfig, RuleTemplate } from './schema';

export const RULE_TEMPLATES: RuleTemplate[] = [
  {
    id: 'card-base-rewards',
    entityType: 'card',
    name: 'Base reward rate',
    description: 'Default earn rate on general spend — essential for comparing cards.',
    category: 'rewards',
    requiredForDecision: true,
    userFacingLabel: 'Rewards on everyday spend',
    payloadTemplate: {
      rewardType: 'points',
      baseRate: 1,
      baseRateUnit: 'point_per_100_inr',
      pointValueInr: 0.25,
    },
  },
  {
    id: 'card-category-accelerator',
    entityType: 'card',
    name: 'Category accelerator',
    description: 'Elevated earn on dining, travel, fuel, or other spend categories.',
    category: 'rewards',
    requiredForDecision: true,
    userFacingLabel: 'Bonus rewards by category',
    payloadTemplate: {
      rewardType: 'points',
      categoryRates: [{ categoryCode: 'dining', rate: 5, capPeriod: 'monthly', capInr: 2000 }],
    },
  },
  {
    id: 'card-merchant-offers',
    entityType: 'card',
    name: 'Merchant-specific earn',
    description: 'Partner merchant earn or cashback — key for merchant-aware recommendations.',
    category: 'rewards',
    userFacingLabel: 'Partner merchant rewards',
    payloadTemplate: {
      merchantSlug: '',
      cashbackPercent: 10,
      capPeriod: 'monthly',
      capInr: 1500,
    },
  },
  {
    id: 'card-fees',
    entityType: 'card',
    name: 'Fee structure',
    description: 'Annual, joining, renewal waiver thresholds — users need this for net value.',
    category: 'fees',
    requiredForDecision: true,
    userFacingLabel: 'Fees & waivers',
    payloadTemplate: {
      annualFeeInr: 0,
      joiningFeeInr: 0,
      renewalWaiverSpendInr: null,
      gstApplicable: true,
    },
  },
  {
    id: 'card-lounge',
    entityType: 'card',
    name: 'Lounge access',
    description: 'Domestic/international lounge visits per year.',
    category: 'benefits',
    userFacingLabel: 'Airport lounge access',
    payloadTemplate: {
      domesticVisits: 0,
      internationalVisits: 0,
      guestAllowed: false,
      networks: ['priority-pass'],
    },
  },
  {
    id: 'card-insurance',
    entityType: 'card',
    name: 'Travel & purchase protection',
    description: 'Insurance cover limits crawled from issuer pages.',
    category: 'benefits',
    userFacingLabel: 'Insurance & protection',
    payloadTemplate: {
      airAccidentCoverInr: null,
      purchaseProtectionDays: null,
      lostBaggageCoverInr: null,
    },
  },
  {
    id: 'card-fuel-surcharge',
    entityType: 'card',
    name: 'Fuel surcharge waiver',
    description: 'Fuel spend waiver caps — common decision factor in India.',
    category: 'benefits',
    userFacingLabel: 'Fuel surcharge waiver',
    payloadTemplate: {
      waiverPercent: 1,
      monthlyCapInr: 250,
      minTransactionInr: 400,
    },
  },
  {
    id: 'card-milestone',
    entityType: 'card',
    name: 'Spend milestone',
    description: 'Quarterly/annual spend milestones with bonus rewards.',
    category: 'campaigns',
    userFacingLabel: 'Spend milestones',
    payloadTemplate: {
      period: 'quarterly',
      thresholdInr: 150000,
      bonusPoints: 2500,
      cumulative: true,
    },
  },
  {
    id: 'merchant-category-default',
    entityType: 'merchant',
    name: 'Primary category mapping',
    description: 'Maps merchant to spend category for rule matching.',
    category: 'classification',
    requiredForDecision: true,
    payloadTemplate: { primaryCategoryCode: 'shopping', mccCodes: [] },
  },
  {
    id: 'merchant-payment-methods',
    entityType: 'merchant',
    name: 'Accepted payment methods',
    description: 'UPI, credit card, EMI availability at checkout.',
    category: 'checkout',
    userFacingLabel: 'Payment options',
    payloadTemplate: { creditCard: true, upi: true, emi: false },
  },
  {
    id: 'offer-cashback',
    entityType: 'offer',
    name: 'Cashback offer',
    description: 'Time-bound merchant or category cashback.',
    category: 'offers',
    requiredForDecision: true,
    userFacingLabel: 'Cashback offer',
    payloadTemplate: {
      cashbackPercent: 5,
      capInr: 500,
      minSpendInr: 1000,
      validFrom: null,
      validUntil: null,
    },
  },
  {
    id: 'offer-emi',
    entityType: 'offer',
    name: 'No-cost EMI',
    description: 'EMI tenure and issuer participation.',
    category: 'offers',
    userFacingLabel: 'No-cost EMI',
    payloadTemplate: { tenureMonths: 3, processingFeeInr: 0, participatingBanks: [] },
  },
  {
    id: 'program-point-value',
    entityType: 'program',
    name: 'Point redemption value',
    description: 'INR value per reward point for net benefit calculations.',
    category: 'rewards',
    requiredForDecision: true,
    payloadTemplate: { pointValueInr: 0.25, transferPartners: [] },
  },
];

const bankOptions = INDIA_BANK_SOURCES.map((b) => ({ value: b.slug, label: b.name }));

const jobTypeOptions = [
  { value: catalogAiIngestJob.type, label: 'AI catalog ingest' },
  { value: catalogCrawlJob.type, label: 'Rule-based crawl' },
];

export const ADMIN_PORTAL_CONFIG: AdminPortalConfig = {
  version: '1.0.0',
  brand: {
    name: 'CardWise Admin',
    tagline: 'Catalog, insights, and operations',
  },
  optionSources: {
    banks: bankOptions,
    jobTypes: jobTypeOptions,
  },
  ruleTemplates: RULE_TEMPLATES,
  nav: [
    { id: 'insights', label: 'Insights', path: '/insights', icon: 'chart-bar', section: 'Overview' },
    { id: 'sync', label: 'Data sync', path: '/sync', icon: 'refresh-cw', section: 'Operations' },
    { id: 'import', label: 'Import Center', path: '/import', icon: 'inbox', section: 'Operations' },
    { id: 'catalog', label: 'Catalog', path: '/catalog', icon: 'layers', section: 'Operations' },
    { id: 'cards', label: 'Credit cards', path: '/cards', icon: 'credit-card', section: 'Catalog' },
    { id: 'rules', label: 'Rules', path: '/rules', icon: 'scale', section: 'Catalog' },
    { id: 'offers', label: 'Offers', path: '/offers', icon: 'tag', section: 'Catalog' },
    { id: 'ai', label: 'AI platform', path: '/ai', icon: 'sparkles', section: 'Platform' },
    { id: 'feature-flags', label: 'Feature flags', path: '/feature-flags', icon: 'layers', section: 'Platform' },
    { id: 'experiments', label: 'Experiments', path: '/experiments', icon: 'layers', section: 'Platform' },
    { id: 'analytics-events', label: 'Analytics events', path: '/analytics-events', icon: 'chart-bar', section: 'Platform' },
    { id: 'users', label: 'Users', path: '/users', icon: 'users', section: 'Platform' },
  ],
  pages: [
    {
      id: 'insights',
      path: '/insights',
      title: 'Insights',
      description: 'Catalog health, merchant IQ, and card coverage at a glance.',
      icon: 'chart-bar',
      blocks: [
        {
          type: 'hero',
          title: 'Insights',
          description: 'Decision intelligence across cards, merchants, and import pipeline.',
        },
        { type: 'insight-grid', dataSource: 'admin.insights.overview' },
      ],
    },
    {
      id: 'sync',
      path: '/sync',
      title: 'Data sync',
      description: 'Queue background jobs — leave and return when sync completes.',
      icon: 'refresh-cw',
      blocks: [
        {
          type: 'hero',
          title: 'Data sync',
          description:
            'Select a job type and source. Sync runs in the background — subscribe for live updates or come back later.',
        },
        {
          type: 'job-launcher',
          submitLabel: 'Start sync',
          fields: [
            { kind: 'select', name: 'type', label: 'Job type', optionsSource: 'jobTypes', required: true },
            { kind: 'select', name: 'bankSlug', label: 'Bank', optionsSource: 'banks', required: true },
            { kind: 'boolean', name: 'purgePending', label: 'Clear pending import queue first', description: 'Recommended before a fresh AI ingest.' },
            { kind: 'number', name: 'limit', label: 'Page limit (optional)', min: 1, max: 100 },
          ],
        },
        { type: 'job-status' },
        {
          type: 'sync-history',
          dataSource: 'admin.jobs.recent',
          columns: [
            { key: 'jobLabel', label: 'Job' },
            { key: 'targetLabel', label: 'Bank / target' },
            { key: 'purgePendingLabel', label: 'Clear pending queue' },
            { key: 'limitPagesLabel', label: 'Limit pages' },
            { key: 'progressSummary', label: 'Progress' },
            { key: 'status', label: 'Status', format: 'badge' },
            { key: 'createdAt', label: 'Started', format: 'date' },
          ],
        },
      ],
    },
    {
      id: 'catalog',
      path: '/catalog',
      title: 'Asset catalog',
      description: 'Manage banks, merchants, cards, and review staged imports.',
      icon: 'layers',
      blocks: [
        {
          type: 'hero',
          title: 'Asset catalog',
          description: 'Unified asset management and import review queue.',
        },
        { type: 'stats', dataSource: 'admin.catalog.stats' },
        {
          type: 'tabs',
          tabs: [
            {
              id: 'import',
              label: 'Import Center',
              blocks: [{ type: 'import-queue', dataSource: 'admin.catalog-import.items' }],
            },
            {
              id: 'assets',
              label: 'Live assets',
              blocks: [{ type: 'asset-manager', dataSource: 'admin.assets.list' }],
            },
          ],
        },
      ],
    },
    {
      id: 'import',
      path: '/import',
      title: 'Import Center',
      description: 'Review staged crawls, grounding scores, approve, and publish to the live catalog.',
      icon: 'inbox',
      blocks: [
        {
          type: 'hero',
          title: 'Import Center',
          description:
            'Grounding scores, source provenance, and publish controls for AI/crawl catalog sync.',
        },
        { type: 'import-queue', dataSource: 'admin.catalog-import.items' },
      ],
    },
    {
      id: 'cards',
      path: '/cards',
      title: 'Credit cards',
      description: 'Create and manage credit card catalog entries.',
      icon: 'credit-card',
      blocks: [
        {
          type: 'hero',
          title: 'Credit cards',
          description: 'Config-driven card editor — all fields from catalog schema.',
        },
        {
          type: 'form',
          submitAction: 'admin.credit-cards.create',
          submitLabel: 'Add card',
          description: 'Create a catalog card manually — synced cards come from the import queue.',
          fields: [
            { kind: 'text', name: 'name', label: 'Card name', required: true },
            { kind: 'text', name: 'slug', label: 'Slug', required: true },
            { kind: 'select', name: 'bankSlug', label: 'Issuing bank', optionsSource: 'banks', required: true },
            { kind: 'number', name: 'annualFeeInr', label: 'Annual fee (INR)', min: 0 },
            { kind: 'number', name: 'joiningFeeInr', label: 'Joining fee (INR)', min: 0 },
          ],
        },
        {
          type: 'data-table',
          title: 'Credit cards',
          description: 'Live catalog entries shown to consumers after publish.',
          dataSource: 'admin.credit-cards.list',
          columns: [
            { key: 'name', label: 'Name' },
            { key: 'bankName', label: 'Bank' },
            { key: 'tier', label: 'Tier', format: 'badge' },
            { key: 'active', label: 'Active', format: 'badge' },
          ],
          actions: [{ id: 'archive', label: 'Archive', variant: 'destructive' }],
        },
      ],
    },
    {
      id: 'rules',
      path: '/rules',
      title: 'Reward rules',
      description: 'Templates and active rules for informed user decisions.',
      icon: 'scale',
      blocks: [
        {
          type: 'hero',
          title: 'Reward rules',
          description: 'Predefined templates cover fees, rewards, milestones, and offers users care about.',
        },
        { type: 'rule-templates', dataSource: 'admin.rules.templates' },
        {
          type: 'data-table',
          title: 'Active reward rules',
          description: 'Rules currently driving recommendations in the consumer app.',
          dataSource: 'admin.reward-rules.list',
          columns: [
            { key: 'ruleKey', label: 'Key' },
            { key: 'name', label: 'Name' },
            { key: 'cardName', label: 'Card' },
            { key: 'status', label: 'Status', format: 'badge' },
          ],
        },
      ],
    },
    {
      id: 'offers',
      path: '/offers',
      title: 'Offers',
      icon: 'tag',
      blocks: [
        {
          type: 'hero',
          title: 'Offers',
          description: 'Time-bound merchant and category offers in the catalog.',
        },
        {
          type: 'data-table',
          title: 'Offers',
          description: 'Browse and review offer catalog entries.',
          dataSource: 'admin.offers.list',
          columns: [
        { key: 'title', label: 'Title' },
        { key: 'status', label: 'Status', format: 'badge' },
          { key: 'validUntil', label: 'Valid until', format: 'date' },
          ],
        },
      ],
    },
    {
      id: 'users',
      path: '/users',
      title: 'Users',
      description: 'Paginated consumer accounts with metadata.',
      icon: 'users',
      blocks: [
        {
          type: 'hero',
          title: 'Consumer users',
          description: 'Browse accounts, review onboarding metadata, and delete in dev.',
        },
        {
          type: 'data-table',
          title: 'Consumer users',
          description: 'Paginated accounts with portfolio metadata.',
          dataSource: 'admin.users.list',
          columns: [
            { key: 'email', label: 'Email' },
            { key: 'displayName', label: 'Name' },
            { key: 'cardCount', label: 'Cards' },
            { key: 'createdAt', label: 'Joined', format: 'date' },
          ],
          actions: [{ id: 'delete', label: 'Delete', variant: 'destructive' }],
          pagination: true,
        },
      ],
    },
  ],
};

export function getPageByPath(path: string) {
  return ADMIN_PORTAL_CONFIG.pages.find((p) => p.path === path) ?? null;
}
