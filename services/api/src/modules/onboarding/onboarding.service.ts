import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { OnboardingStep, Prisma } from '@prisma/client';
import { AnalyticsEvent, initAnalytics, trackEvent } from '@cardwise/analytics';
import { FeatureFlag } from '@cardwise/feature-flags';
import {
  OnboardingAnswersSchema,
  parseOnboardingAnswers,
  type OnboardingAnswers,
} from '@cardwise/validation';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';
import {
  buildPersonalizationFromOnboarding,
  isOnboardingFinished,
  nextStep,
  parseAnswersFromUser,
  previousStep,
  toOnboardingStateDto,
  type OnboardingStateDto,
} from './onboarding.mapper';

export type PatchOnboardingInput = {
  action: 'complete_step' | 'skip_step' | 'back';
  answers?: unknown;
};

@Injectable()
export class OnboardingService {
  private analyticsReady = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly featureFlags: FeatureFlagsService,
  ) {}

  private ensureAnalytics(): void {
    if (this.analyticsReady) return;
    initAnalytics({
      useMemory: process.env.NODE_ENV !== 'production' || !process.env.POSTHOG_API_KEY,
    });
    this.analyticsReady = true;
  }

  private async ensureFlags(userId: string): Promise<boolean> {
    return this.featureFlags.isEnabled(FeatureFlag.ONBOARDING_V1, userId);
  }

  async getState(userId: string): Promise<OnboardingStateDto> {
    const flagEnabled = await this.ensureFlags(userId);
    let user = await this.requireActiveUser(userId);

    if (flagEnabled && user.onboardingStatus === 'NOT_STARTED') {
      this.ensureAnalytics();
      user = await this.prisma.user.update({
        where: { id: userId },
        data: {
          onboardingStatus: 'IN_PROGRESS',
          onboardingStep: 'WELCOME',
        },
      });
      trackEvent(AnalyticsEvent.ONBOARDING_STARTED, { source: 'api' }, { distinctId: userId });
    }

    return toOnboardingStateDto(user, flagEnabled);
  }

  async patch(userId: string, input: PatchOnboardingInput): Promise<OnboardingStateDto> {
    const flagEnabled = await this.ensureFlags(userId);
    if (!flagEnabled) {
      const user = await this.requireActiveUser(userId);
      return toOnboardingStateDto(user, false);
    }

    const user = await this.requireActiveUser(userId);
    if (isOnboardingFinished(user.onboardingStatus)) {
      throw new BadRequestException('Onboarding is already finished');
    }

    this.ensureAnalytics();
    const currentAnswers = parseAnswersFromUser(user);
    let mergedAnswers = currentAnswers;
    if (input.answers !== undefined) {
      const parsed = OnboardingAnswersSchema.safeParse(input.answers);
      if (!parsed.success) {
        throw new BadRequestException(parsed.error.flatten());
      }
      mergedAnswers = { ...currentAnswers, ...parsed.data };
    }

    if (input.action === 'back') {
      const step = previousStep(user.onboardingStep);
      const updated = await this.prisma.user.update({
        where: { id: userId },
        data: {
          onboardingStatus: 'IN_PROGRESS',
          onboardingStep: step,
          onboardingAnswers: mergedAnswers as Prisma.InputJsonValue,
        },
      });
      return toOnboardingStateDto(updated, true);
    }

    if (input.action === 'skip_step') {
      const fromStep = user.onboardingStep;
      const step = nextStep(fromStep);
      const updated = await this.prisma.user.update({
        where: { id: userId },
        data: {
          onboardingStatus: 'IN_PROGRESS',
          onboardingStep: step,
          onboardingAnswers: mergedAnswers as Prisma.InputJsonValue,
        },
      });
      trackEvent(
        AnalyticsEvent.ONBOARDING_SKIPPED,
        { step: fromStep, source: 'api' },
        { distinctId: userId },
      );
      if (step === 'DONE') {
        return this.complete(userId, 'skip_step');
      }
      return toOnboardingStateDto(updated, true);
    }

    if (input.action === 'complete_step') {
      const fromStep = user.onboardingStep;
      const step = nextStep(fromStep);
      const updated = await this.prisma.user.update({
        where: { id: userId },
        data: {
          onboardingStatus: 'IN_PROGRESS',
          onboardingStep: step,
          onboardingAnswers: mergedAnswers as Prisma.InputJsonValue,
        },
      });
      trackEvent(
        AnalyticsEvent.ONBOARDING_STEP_COMPLETED,
        { step: fromStep, source: 'api' },
        { distinctId: userId },
      );
      if (step === 'DONE') {
        return this.complete(userId, 'complete_step');
      }
      return toOnboardingStateDto(updated, true);
    }

    throw new BadRequestException('Unknown onboarding action');
  }

  async complete(userId: string, source = 'api'): Promise<OnboardingStateDto> {
    const flagEnabled = await this.ensureFlags(userId);
    const user = await this.requireActiveUser(userId);

    if (!flagEnabled) {
      return toOnboardingStateDto(user, false);
    }

    if (user.onboardingStatus === 'COMPLETED') {
      return toOnboardingStateDto(user, true);
    }

    this.ensureAnalytics();
    const answers = parseAnswersFromUser(user);
    const personalization = buildPersonalizationFromOnboarding(answers);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        onboardingStatus: 'COMPLETED',
        onboardingStep: 'DONE',
        onboardingCompletedAt: new Date(),
        personalizationProfile: personalization as Prisma.InputJsonValue,
      },
    });

    trackEvent(AnalyticsEvent.ONBOARDING_COMPLETED, { source }, { distinctId: userId });

    return toOnboardingStateDto(updated, true);
  }

  async skipAll(userId: string): Promise<OnboardingStateDto> {
    const flagEnabled = await this.ensureFlags(userId);
    const user = await this.requireActiveUser(userId);

    if (!flagEnabled) {
      return toOnboardingStateDto(user, false);
    }

    if (isOnboardingFinished(user.onboardingStatus)) {
      return toOnboardingStateDto(user, true);
    }

    this.ensureAnalytics();
    const answers = parseAnswersFromUser(user);
    const personalization = buildPersonalizationFromOnboarding(answers);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        onboardingStatus: 'SKIPPED',
        onboardingStep: 'DONE',
        onboardingCompletedAt: new Date(),
        personalizationProfile: personalization as Prisma.InputJsonValue,
      },
    });

    trackEvent(
      AnalyticsEvent.ONBOARDING_SKIPPED,
      { step: 'ALL', source: 'api' },
      { distinctId: userId },
    );

    return toOnboardingStateDto(updated, true);
  }

  /** Merge patch answers without requiring a step action (used by tests/helpers). */
  mergeAnswers(current: OnboardingAnswers, patch: unknown): OnboardingAnswers {
    const parsed = parseOnboardingAnswers(patch);
    return { ...current, ...parsed };
  }

  private async requireActiveUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.accountStatus !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }
    return user;
  }
}

export type { OnboardingStep };
