import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { hash as bcryptHash } from 'bcryptjs';

import {
  clearMemoryEvents,
  getMemoryEvents,
  initAnalytics,
  shutdownAnalytics,
} from '@cardwise/analytics';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { createPermissiveFeatureFlagsService } from '../../feature-flags/__tests__/feature-flags.test-helper';
import { OnboardingService } from '../onboarding.service';

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)('onboarding (M-014)', () => {
  const prisma = new PrismaService();
  const onboarding = new OnboardingService(prisma, createPermissiveFeatureFlagsService());

  beforeAll(async () => {
    await prisma.$connect();
    initAnalytics({ useMemory: true });
  });

  afterAll(async () => {
    await shutdownAnalytics();
    await prisma.$disconnect();
  });

  async function createUser(email: string) {
    return prisma.user.create({
      data: {
        email,
        passwordHash: await bcryptHash('Str0ng!Passw0rd', 10),
        emailVerifiedAt: new Date(),
        fullName: 'Onboard User',
        role: 'USER',
      },
    });
  }

  it('starts on first GET and persists progress across PATCH → GET', async () => {
    clearMemoryEvents();
    const user = await createUser(`m014-progress-${Date.now()}@cardwise.test`);

    const started = await onboarding.getState(user.id);
    expect(started.status).toBe('IN_PROGRESS');
    expect(started.step).toBe('WELCOME');
    expect(getMemoryEvents().some((e) => e.event === 'ONBOARDING_STARTED')).toBe(true);

    await onboarding.patch(user.id, { action: 'complete_step' });
    const afterWelcome = await onboarding.getState(user.id);
    expect(afterWelcome.step).toBe('SPENDING');

    await onboarding.patch(user.id, {
      action: 'complete_step',
      answers: { spendBand: '10K_50K' },
    });
    const afterSpending = await onboarding.getState(user.id);
    expect(afterSpending.step).toBe('CATEGORIES');
    expect(afterSpending.answers.spendBand).toBe('10K_50K');
  });

  it('skip step and skip-all work', async () => {
    clearMemoryEvents();
    const user = await createUser(`m014-skip-${Date.now()}@cardwise.test`);
    await onboarding.getState(user.id);

    const skippedStep = await onboarding.patch(user.id, { action: 'skip_step' });
    expect(skippedStep.step).toBe('SPENDING');

    const skippedAll = await onboarding.skipAll(user.id);
    expect(skippedAll.status).toBe('SKIPPED');
    expect(skippedAll.isComplete).toBe(true);
    expect(getMemoryEvents().some((e) => e.event === 'ONBOARDING_SKIPPED')).toBe(true);

    const again = await onboarding.getState(user.id);
    expect(again.status).toBe('SKIPPED');
  });

  it('complete initializes personalization stub and emits analytics', async () => {
    clearMemoryEvents();
    const user = await createUser(`m014-complete-${Date.now()}@cardwise.test`);
    await onboarding.getState(user.id);
    await onboarding.patch(user.id, {
      action: 'complete_step',
      answers: { spendBand: 'UNDER_10K', categories: ['dining', 'travel'] },
    });
    // still on spending after welcome; set answers and jump via complete endpoint
    await onboarding.patch(user.id, {
      action: 'complete_step',
      answers: { spendBand: 'UNDER_10K', categories: ['dining', 'travel'] },
    });
    await onboarding.patch(user.id, {
      action: 'complete_step',
      answers: { categories: ['dining', 'travel'] },
    });
    await onboarding.patch(user.id, { action: 'complete_step' });

    const done = await onboarding.getState(user.id);
    expect(done.status).toBe('COMPLETED');
    expect(done.step).toBe('DONE');
    expect(getMemoryEvents().some((e) => e.event === 'ONBOARDING_COMPLETED')).toBe(true);

    const row = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    const profile = row.personalizationProfile as Record<string, unknown>;
    expect(profile.version).toBe(2);
    expect(profile.spendBand).toBe('UNDER_10K');
    expect(profile.preferredCategorySlugs).toEqual(['dining', 'travel']);
  });

  it('POST complete from mid-flow finishes onboarding', async () => {
    clearMemoryEvents();
    const user = await createUser(`m014-early-complete-${Date.now()}@cardwise.test`);
    await onboarding.getState(user.id);
    const done = await onboarding.complete(user.id);
    expect(done.status).toBe('COMPLETED');
    expect(done.isComplete).toBe(true);
  });
});
