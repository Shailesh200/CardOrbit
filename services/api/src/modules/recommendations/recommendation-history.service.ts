import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { initAnalytics, trackRecommendationFeedbackSubmitted } from '@cardwise/analytics';
import {
  type BestCardRecommendationInput,
  type ListRecommendationHistoryQuery,
  type RecommendationHistoryDetail,
  type RecommendationHistorySummary,
  type SubmitRecommendationFeedbackInput,
} from '@cardwise/validation';
import type { Prisma, RecommendationSource } from '@prisma/client';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import type { BestCardRecommendationResult } from './recommendations.service';

type HistoryRow = Prisma.RecommendationHistoryGetPayload<{
  include: { feedback: true };
}>;

@Injectable()
export class RecommendationHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  private async requireActiveUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.accountStatus !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }
    return user;
  }

  private mapSummary(row: HistoryRow): RecommendationHistorySummary {
    return {
      id: row.id,
      amountInr: Number(row.amountInr),
      merchantSlug: row.merchantSlug,
      merchantName: row.merchantName,
      recommendedCardName: row.recommendedCardName,
      expectedRewardInr: row.expectedRewardInr != null ? Number(row.expectedRewardInr) : null,
      rankingVersion:
        row.rankingVersion === 'v3' ? 'v3' : row.rankingVersion === 'v2' ? 'v2' : 'v1',
      source: row.source,
      createdAt: row.createdAt.toISOString(),
      feedback: row.feedback
        ? {
            type: row.feedback.type,
            updatedAt: row.feedback.updatedAt.toISOString(),
          }
        : null,
    };
  }

  private mapDetail(row: HistoryRow): RecommendationHistoryDetail {
    const alternatives = Array.isArray(row.alternatives) ? row.alternatives : [];
    const parsedAlternatives = alternatives
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null;
        const value = entry as Record<string, unknown>;
        if (
          typeof value.userCardId !== 'string' ||
          typeof value.creditCardId !== 'string' ||
          typeof value.cardName !== 'string'
        ) {
          return null;
        }
        return {
          userCardId: value.userCardId,
          creditCardId: value.creditCardId,
          cardName: value.cardName,
          cardSlug: String(value.cardSlug ?? ''),
          bankName: String(value.bankName ?? ''),
          rank: Number(value.rank ?? 0),
          expectedRewardInr: Number(value.expectedRewardInr ?? 0),
          effectiveRatePercent: Number(value.effectiveRatePercent ?? 0),
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry != null);

    return {
      ...this.mapSummary(row),
      categorySlug: row.categorySlug,
      effectiveRatePercent:
        row.effectiveRatePercent != null ? Number(row.effectiveRatePercent) : null,
      confidenceScore: row.confidenceScore != null ? Number(row.confidenceScore) : null,
      explanationSource: row.explanationSource === 'ai' ? 'ai' : 'template',
      explanation: row.explanation,
      alternatives: parsedAlternatives,
      cardsEvaluated: row.cardsEvaluated,
      feedback: row.feedback
        ? {
            type: row.feedback.type,
            comment: row.feedback.comment,
            createdAt: row.feedback.createdAt.toISOString(),
            updatedAt: row.feedback.updatedAt.toISOString(),
          }
        : null,
    };
  }

  private resolveSource(input: BestCardRecommendationInput): RecommendationSource {
    const source = (input as BestCardRecommendationInput & { source?: string }).source;
    if (source === 'extension') return 'EXTENSION';
    if (source === 'dashboard') return 'DASHBOARD';
    return 'WEB';
  }

  async persistRecommendation(
    userId: string,
    input: BestCardRecommendationInput,
    result: BestCardRecommendationResult,
  ): Promise<void> {
    await this.requireActiveUser(userId);

    const recommended = result.recommendedCard;
    const alternatives = [result.recommendedCard, ...result.alternatives]
      .filter((row): row is NonNullable<typeof row> => row != null)
      .map((row) => ({
        userCardId: row.userCardId,
        creditCardId: row.creditCardId,
        cardName: row.cardName,
        cardSlug: row.cardSlug,
        bankName: row.bankName,
        rank: row.rank,
        expectedRewardInr: row.expectedRewardInr,
        effectiveRatePercent: row.effectiveRatePercent,
      }));

    const merchantSlug = result.merchant?.slug ?? input.merchantSlug ?? null;
    let merchantName = result.merchant?.name ?? null;
    if (!merchantName && merchantSlug) {
      const catalogMerchant = await this.prisma.merchant.findFirst({
        where: { slug: merchantSlug, deletedAt: null },
        select: { name: true },
      });
      merchantName = catalogMerchant?.name ?? null;
    }

    await this.prisma.recommendationHistory.create({
      data: {
        id: result.recommendationId,
        userId,
        amountInr: result.amount,
        merchantId: result.merchant?.id ?? null,
        merchantSlug,
        merchantName,
        categorySlug: input.categorySlug ?? null,
        recommendedUserCardId: recommended?.userCardId ?? null,
        recommendedCreditCardId: recommended?.creditCardId ?? null,
        recommendedCardName: recommended?.cardName ?? null,
        expectedRewardInr: recommended?.expectedRewardInr ?? null,
        effectiveRatePercent: recommended?.effectiveRatePercent ?? null,
        confidenceScore: recommended?.confidenceScore ?? null,
        rankingVersion: result.rankingVersion,
        explanationSource: result.explanationSource,
        explanation: result.explanation,
        alternatives,
        cardsEvaluated: result.cardsEvaluated,
        source: this.resolveSource(input),
      },
    });
  }

  async listHistory(
    userId: string,
    query: ListRecommendationHistoryQuery,
  ): Promise<{ items: RecommendationHistorySummary[]; total: number }> {
    await this.requireActiveUser(userId);

    const [rows, total] = await Promise.all([
      this.prisma.recommendationHistory.findMany({
        where: { userId },
        include: { feedback: true },
        orderBy: { createdAt: 'desc' },
        take: query.limit,
      }),
      this.prisma.recommendationHistory.count({ where: { userId } }),
    ]);

    const missingNameSlugs = [
      ...new Set(
        rows
          .filter((row) => !row.merchantName?.trim() && row.merchantSlug)
          .map((row) => row.merchantSlug as string),
      ),
    ];
    const catalogNames =
      missingNameSlugs.length > 0
        ? await this.prisma.merchant.findMany({
            where: { slug: { in: missingNameSlugs }, deletedAt: null },
            select: { slug: true, name: true },
          })
        : [];
    const nameBySlug = new Map(catalogNames.map((row) => [row.slug, row.name]));

    return {
      items: rows.map((row) => {
        const summary = this.mapSummary(row);
        if (!summary.merchantName && row.merchantSlug) {
          summary.merchantName = nameBySlug.get(row.merchantSlug) ?? null;
        }
        return summary;
      }),
      total,
    };
  }

  async getHistoryDetail(
    userId: string,
    recommendationId: string,
  ): Promise<RecommendationHistoryDetail> {
    await this.requireActiveUser(userId);

    const row = await this.prisma.recommendationHistory.findFirst({
      where: { id: recommendationId, userId },
      include: { feedback: true },
    });

    if (!row) throw new NotFoundException('Recommendation not found');
    return this.mapDetail(row);
  }

  async submitFeedback(
    userId: string,
    recommendationId: string,
    input: SubmitRecommendationFeedbackInput,
  ) {
    await this.requireActiveUser(userId);

    const history = await this.prisma.recommendationHistory.findFirst({
      where: { id: recommendationId, userId },
    });
    if (!history) throw new NotFoundException('Recommendation not found');

    const feedback = await this.prisma.recommendationFeedback.upsert({
      where: { recommendationId },
      create: {
        recommendationId,
        userId,
        type: input.type,
        comment: input.comment ?? null,
      },
      update: {
        type: input.type,
        comment: input.comment ?? null,
      },
    });

    initAnalytics({
      useMemory: process.env.NODE_ENV !== 'production' || !process.env.POSTHOG_API_KEY,
    });

    trackRecommendationFeedbackSubmitted(
      {
        recommendationId,
        feedbackType: input.type,
        merchantSlug: history.merchantSlug ?? undefined,
        source: history.source,
      },
      { distinctId: userId },
    );

    return {
      recommendationId,
      feedback: {
        type: feedback.type,
        comment: feedback.comment,
        createdAt: feedback.createdAt.toISOString(),
        updatedAt: feedback.updatedAt.toISOString(),
      },
    };
  }
}
