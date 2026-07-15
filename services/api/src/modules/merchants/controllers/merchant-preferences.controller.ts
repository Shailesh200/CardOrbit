import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  parseAddFavoriteMerchantInput,
  parseCreateSavedSearchInput,
  parseUpdateSavedSearchInput,
} from '@cardwise/validation';

import type { ConsumerPrincipal } from '../../auth/auth.types';
import { CurrentUser } from '../../auth/current-user.decorator';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { MerchantPreferencesService } from '../merchant-preferences.service';

class CreateSavedSearchDto {
  name!: string;
  query?: string;
  categorySlug?: string | null;
}

class UpdateSavedSearchDto {
  name?: string;
  query?: string;
  categorySlug?: string | null;
}

class AddFavoriteMerchantDto {
  merchantId?: string;
  slug?: string;
}

@ApiTags('merchants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('merchants')
export class MerchantPreferencesController {
  constructor(private readonly preferences: MerchantPreferencesService) {}

  @Get('favorites')
  @ApiOkResponse({ description: 'List favorite merchants for the signed-in user' })
  listFavorites(@CurrentUser() user: ConsumerPrincipal) {
    return this.preferences.listFavoriteMerchants(user.id);
  }

  @Post('favorites')
  @ApiOkResponse({ description: 'Add or idempotently return a favorite merchant' })
  addFavorite(@CurrentUser() user: ConsumerPrincipal, @Body() body: AddFavoriteMerchantDto) {
    return this.preferences.addFavoriteMerchant(user.id, parseAddFavoriteMerchantInput(body));
  }

  @Delete('favorites/:merchantId')
  @HttpCode(204)
  @ApiNoContentResponse({ description: 'Remove a favorite merchant' })
  async removeFavorite(
    @CurrentUser() user: ConsumerPrincipal,
    @Param('merchantId') merchantId: string,
  ) {
    await this.preferences.removeFavoriteMerchant(user.id, merchantId);
  }

  @Get('saved-searches')
  @ApiOkResponse({ description: 'List saved merchant searches' })
  listSavedSearches(@CurrentUser() user: ConsumerPrincipal) {
    return this.preferences.listSavedSearches(user.id);
  }

  @Post('saved-searches')
  @ApiOkResponse({ description: 'Create a saved merchant search' })
  createSavedSearch(@CurrentUser() user: ConsumerPrincipal, @Body() body: CreateSavedSearchDto) {
    return this.preferences.createSavedSearch(user.id, parseCreateSavedSearchInput(body));
  }

  @Patch('saved-searches/:savedSearchId')
  @ApiOkResponse({ description: 'Update a saved merchant search' })
  updateSavedSearch(
    @CurrentUser() user: ConsumerPrincipal,
    @Param('savedSearchId') savedSearchId: string,
    @Body() body: UpdateSavedSearchDto,
  ) {
    return this.preferences.updateSavedSearch(
      user.id,
      savedSearchId,
      parseUpdateSavedSearchInput(body),
    );
  }

  @Delete('saved-searches/:savedSearchId')
  @HttpCode(204)
  @ApiNoContentResponse({ description: 'Delete a saved merchant search' })
  async deleteSavedSearch(
    @CurrentUser() user: ConsumerPrincipal,
    @Param('savedSearchId') savedSearchId: string,
  ) {
    await this.preferences.deleteSavedSearch(user.id, savedSearchId);
  }
}
