import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { parseOfferMatchQuery } from '@cardwise/validation';

import type { ConsumerPrincipal } from '../../auth/auth.types';
import { CurrentUser } from '../../auth/current-user.decorator';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { OfferMatchingService } from '../offer-matching.service';

@ApiTags('offers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('offers')
export class OffersController {
  constructor(private readonly matching: OfferMatchingService) {}

  @Get()
  @ApiOkResponse({
    description: 'List offers matched to the user portfolio and optional merchant context',
  })
  list(
    @CurrentUser() user: ConsumerPrincipal,
    @Query('merchantSlug') merchantSlug?: string,
    @Query('amountInr') amountInr?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.matching.matchOffers(
      user.id,
      parseOfferMatchQuery({
        merchantSlug,
        amountInr,
        limit,
        status,
      }),
    );
  }

  @Get('matches')
  @ApiOkResponse({ description: 'Match offers for a merchant spend scenario' })
  matches(
    @CurrentUser() user: ConsumerPrincipal,
    @Query('merchantSlug') merchantSlug: string,
    @Query('amountInr') amountInr?: string,
    @Query('limit') limit?: string,
  ) {
    return this.matching.matchOffers(
      user.id,
      parseOfferMatchQuery({
        merchantSlug,
        amountInr,
        limit,
        status: 'active',
      }),
    );
  }

  @Get(':slug')
  @ApiOkResponse({ description: 'Offer detail with portfolio eligibility' })
  async detail(
    @CurrentUser() user: ConsumerPrincipal,
    @Param('slug') slug: string,
    @Query('amountInr') amountInr?: string,
  ) {
    const offer = await this.matching.getOfferBySlug(
      user.id,
      slug,
      amountInr ? Number(amountInr) : undefined,
    );
    if (!offer) {
      return { found: false as const, slug };
    }
    return { found: true as const, offer };
  }
}
