import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import {
  parseRewardPersonalizationProfile,
  type UserAiContext,
  type UserPortfolioCardContext,
} from '@cardwise/validation';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class ContextEngineService {
  constructor(private readonly prisma: PrismaService) {}

  private async requireActiveUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.accountStatus !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }
    return user;
  }

  async buildUserContext(userId: string): Promise<UserAiContext> {
    const user = await this.requireActiveUser(userId);
    const personalization = parseRewardPersonalizationProfile(user.personalizationProfile);

    const portfolio = await this.prisma.userCard.findMany({
      where: { userId, status: { not: 'REMOVED' } },
      include: {
        creditCard: {
          include: {
            bank: true,
            benefits: {
              where: { deletedAt: null },
              orderBy: { title: 'asc' },
              take: 5,
            },
          },
        },
      },
      orderBy: [{ isFavorite: 'desc' }, { addedAt: 'desc' }],
      take: 20,
    });

    const portfolioCards: UserPortfolioCardContext[] = portfolio.map((row) => ({
      slug: row.creditCard.slug,
      name: row.creditCard.name,
      bankSlug: row.creditCard.bank.slug,
      tier: row.creditCard.tier,
      isFavorite: row.isFavorite,
      benefitHighlights: row.creditCard.benefits.map((benefit) => benefit.title).slice(0, 5),
    }));

    return {
      preferredRewardType: personalization.preferredRewardType,
      preferredCategorySlugs: personalization.preferredCategorySlugs,
      boostFavoriteCards: personalization.boostFavoriteCards,
      portfolioCount: portfolio.length,
      favoriteCount: portfolio.filter((row) => row.isFavorite).length,
      portfolioCards,
    };
  }
}
