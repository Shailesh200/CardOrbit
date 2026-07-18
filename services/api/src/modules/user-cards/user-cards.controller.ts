import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import type { ConsumerPrincipal } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserCardsService } from './user-cards.service';

class AddUserCardDto {
  creditCardId!: string;
  nickname?: string;
}

class PatchUserCardDto {
  nickname?: string | null;
  isFavorite?: boolean;
  status?: 'ACTIVE' | 'INACTIVE';
  statementDay?: number | null;
  dueDay?: number | null;
}

@ApiTags('user-cards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('user-cards')
export class UserCardsController {
  constructor(private readonly portfolio: UserCardsService) {}

  @Get()
  @ApiOkResponse({ description: 'User portfolio cards' })
  list(@CurrentUser() user: ConsumerPrincipal) {
    return this.portfolio.listPortfolio(user.id);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Portfolio card detail with benefits' })
  get(@CurrentUser() user: ConsumerPrincipal, @Param('id') id: string) {
    return this.portfolio.getPortfolioCard(user.id, id);
  }

  @Post()
  @ApiOkResponse({ description: 'Add catalog card to portfolio' })
  add(@CurrentUser() user: ConsumerPrincipal, @Body() body: AddUserCardDto) {
    return this.portfolio.addCard(user.id, body);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Update portfolio card metadata' })
  patch(
    @CurrentUser() user: ConsumerPrincipal,
    @Param('id') id: string,
    @Body() body: PatchUserCardDto,
  ) {
    return this.portfolio.patchCard(user.id, id, body);
  }

  @Delete(':id')
  @ApiOkResponse({ description: 'Remove card from portfolio' })
  remove(@CurrentUser() user: ConsumerPrincipal, @Param('id') id: string) {
    return this.portfolio.removeCard(user.id, id);
  }
}

@ApiTags('cards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cards')
export class CardsCatalogController {
  constructor(private readonly portfolio: UserCardsService) {}

  @Get('catalog')
  @ApiOkResponse({ description: 'Browse active credit card catalog' })
  catalog(
    @CurrentUser() user: ConsumerPrincipal,
    @Query('q') q?: string,
    @Query('bankSlug') bankSlug?: string,
    @Query('networkCode') networkCode?: string,
    @Query('maxAnnualFeeInr') maxAnnualFeeInr?: string,
    @Query('category') category?: string,
    @Query('offset') offset?: string,
    @Query('limit') limit?: string,
  ) {
    return this.portfolio.listCatalog(user.id, {
      q,
      bankSlug,
      networkCode,
      maxAnnualFeeInr: maxAnnualFeeInr ? Number(maxAnnualFeeInr) : undefined,
      category,
      offset: offset ? Number(offset) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }
}
