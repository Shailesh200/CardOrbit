import { Injectable } from '@nestjs/common';
import { generateRankingSignals, isAiConfigured } from '@cardwise/ai';
import { FeatureFlag } from '@cardwise/feature-flags';
import {
  applyRankingSignals,
  type AppliedRankingSignals,
  type RankingSignalsContext,
  type RecommendationPreferenceOverrides,
} from '@cardwise/validation';

import { AiService } from '../ai/ai.service';

@Injectable()
export class RankingSignalsService {
  constructor(private readonly ai: AiService) {}

  async enrichPreferences(input: {
    userId: string;
    basePreferences: RecommendationPreferenceOverrides;
    portfolioBankSlugs: string[];
    favoriteCount: number;
    portfolioCount: number;
    profile: {
      preferredRewardType: string;
      preferredBankSlugs: string[];
      preferredCategorySlugs: string[];
      boostFavoriteCards: boolean;
    };
    request: {
      merchantSlug?: string;
      categorySlug: string;
      amountInr: number;
    };
  }): Promise<AppliedRankingSignals> {
    const fallback = { preferences: input.basePreferences, aiPreferenceWeight: 0 };

    if (!(await this.ai.isFeatureEnabled(FeatureFlag.AI_RANKING_SIGNALS_ENABLED, input.userId))) {
      return fallback;
    }

    if (!isAiConfigured()) {
      return fallback;
    }

    const context: RankingSignalsContext = {
      preferredRewardType: input.profile.preferredRewardType,
      preferredBankSlugs: input.profile.preferredBankSlugs,
      preferredCategorySlugs: input.profile.preferredCategorySlugs,
      boostFavoriteCards: input.profile.boostFavoriteCards,
      portfolioBankSlugs: input.portfolioBankSlugs,
      favoriteCount: input.favoriteCount,
      portfolioCount: input.portfolioCount,
      request: input.request,
    };

    try {
      const result = await generateRankingSignals(context);
      return applyRankingSignals(input.basePreferences, result.data, input.portfolioBankSlugs);
    } catch {
      return fallback;
    }
  }
}
