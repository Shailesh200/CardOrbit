import { Injectable } from '@nestjs/common';
import { generateSmartInsights, isAiConfigured } from '@cardwise/ai';
import { FeatureFlag } from '@cardwise/feature-flags';
import {
  displayCategoryLabel,
  displayMerchantName,
  type DashboardInsight,
  type SmartInsightsContext,
} from '@cardwise/validation';

import { AiService } from '../ai/ai.service';

const REWARD_TYPE_LABEL: Record<string, string> = {
  cashback: 'cashback',
  airline_miles: 'airline miles',
  hotel_points: 'hotel points',
  reward_points: 'reward points',
  any: 'rewards',
};

export type TemplateInsightInput = {
  userId: string;
  preferredRewardType: string;
  preferredCategorySlugs: string[];
  categories?: string[];
  boostFavoriteCards: boolean;
  recommendationScenario: {
    merchantSlug: string;
    merchantName?: string;
    categorySlug: string;
    amount: number;
  };
  cardCount: number;
  favoriteCount: number;
};

@Injectable()
export class DashboardInsightsService {
  constructor(private readonly ai: AiService) {}

  buildTemplateInsights(input: TemplateInsightInput): DashboardInsight[] {
    const insights: DashboardInsight[] = [];

    if (input.preferredRewardType !== 'any') {
      insights.push({
        id: 'reward-type',
        source: 'template',
        title: 'Reward preference active',
        body: `We prioritize ${REWARD_TYPE_LABEL[input.preferredRewardType] ?? input.preferredRewardType} when ranking cards for you.`,
        actionLabel: 'Edit preferences',
        actionPath: '/account/settings',
      });
    }

    const topCategorySlug = input.preferredCategorySlugs[0] ?? input.categories?.[0] ?? null;
    if (topCategorySlug) {
      const scenario = input.recommendationScenario;
      const categoryLabel = displayCategoryLabel(topCategorySlug);
      const merchantLabel = displayMerchantName({
        name: scenario.merchantName,
        slug: scenario.merchantSlug,
        fallback: 'this merchant',
      });
      insights.push({
        id: 'top-category',
        source: 'template',
        title: `Optimized for ${categoryLabel}`,
        body: `Your quick recommendation uses a typical ${categoryLabel.toLowerCase()} spend at ${merchantLabel}.`,
        actionLabel: 'Compare at merchant',
        actionPath: `/account/merchants/${scenario.merchantSlug}`,
      });
    }

    if (input.cardCount === 0) {
      insights.push({
        id: 'add-cards',
        source: 'template',
        title: 'Start your portfolio',
        body: 'Add cards from the catalog to unlock personalized best-card picks.',
        actionLabel: 'Add a card',
        actionPath: '/account/cards/add',
      });
    } else if (input.boostFavoriteCards && input.favoriteCount === 0) {
      insights.push({
        id: 'pin-favorites',
        source: 'template',
        title: 'Pin your go-to cards',
        body: 'Mark favorites in your portfolio to boost them in recommendation rankings.',
        actionLabel: 'View portfolio',
        actionPath: '/account/cards',
      });
    }

    return insights.slice(0, 3);
  }

  async resolveInsights(input: TemplateInsightInput): Promise<DashboardInsight[]> {
    const template = this.buildTemplateInsights(input);

    if (template.length === 0) {
      return template;
    }

    if (!(await this.ai.isFeatureEnabled(FeatureFlag.AI_INSIGHTS_ENABLED, input.userId))) {
      return template;
    }

    if (!isAiConfigured()) {
      return template;
    }

    const scenario = input.recommendationScenario;
    const context: SmartInsightsContext = {
      preferredRewardType: input.preferredRewardType,
      preferredRewardLabel:
        REWARD_TYPE_LABEL[input.preferredRewardType] ?? input.preferredRewardType,
      preferredCategorySlugs: input.preferredCategorySlugs,
      preferredCategoryLabels: input.preferredCategorySlugs.map(displayCategoryLabel),
      spendBand: null,
      boostFavoriteCards: input.boostFavoriteCards,
      portfolioCount: input.cardCount,
      favoriteCount: input.favoriteCount,
      recommendationScenario: {
        merchantSlug: scenario.merchantSlug,
        merchantName: displayMerchantName({
          name: scenario.merchantName,
          slug: scenario.merchantSlug,
        }),
        categorySlug: scenario.categorySlug,
        categoryLabel: displayCategoryLabel(scenario.categorySlug),
        amount: scenario.amount,
      },
    };

    try {
      const result = await generateSmartInsights(context);
      const aiInsights = result.data.insights.map((row) => ({
        ...row,
        source: 'ai' as const,
      }));
      return aiInsights.length > 0 ? aiInsights.slice(0, 3) : template;
    } catch {
      return template;
    }
  }
}
