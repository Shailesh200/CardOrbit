import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import type { ConsumerPrincipal } from '../../auth/auth.types';
import { CurrentUser } from '../../auth/current-user.decorator';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { MerchantsService } from '../merchants.service';

@ApiTags('merchants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('merchants')
export class MerchantsController {
  constructor(private readonly merchants: MerchantsService) {}

  @Get('search')
  @ApiOkResponse({ description: 'Search merchant catalog with pagination' })
  search(
    @CurrentUser() user: ConsumerPrincipal,
    @Query('q') q?: string,
    @Query('categorySlug') categorySlug?: string,
    @Query('offset') offset?: string,
    @Query('limit') limit?: string,
  ) {
    return this.merchants.searchMerchants(user.id, {
      q,
      categorySlug,
      offset: offset ? Number(offset) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('popular')
  @ApiOkResponse({ description: 'Popular merchants for quick picks' })
  popular(@CurrentUser() user: ConsumerPrincipal) {
    return this.merchants.listPopular(user.id);
  }

  @Get('categories')
  @ApiOkResponse({ description: 'Merchant category taxonomy' })
  categories(@CurrentUser() user: ConsumerPrincipal) {
    return this.merchants.listCategories(user.id);
  }

  @Get(':slug')
  @ApiOkResponse({ description: 'Merchant detail by slug' })
  detail(@CurrentUser() user: ConsumerPrincipal, @Param('slug') slug: string) {
    return this.merchants.getMerchantBySlug(user.id, slug);
  }
}
