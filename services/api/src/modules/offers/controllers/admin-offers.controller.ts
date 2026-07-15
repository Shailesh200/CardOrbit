import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { AdminAuditService } from '../../admin-auth/admin-audit.service';
import type { AdminPrincipal } from '../../admin-auth/admin-auth.types';
import { AdminJwtGuard } from '../../admin-auth/admin-jwt.guard';
import {
  AssignOfferCardCommand,
  AssignOfferMerchantCommand,
  CreateOfferCommand,
  UpdateOfferCommand,
} from '../application/commands/offer.commands';
import { ListActiveOffersQuery } from '../application/queries/list-active-offers.query';

type RequestWithAdmin = { adminUser?: AdminPrincipal };

class CreateOfferDto {
  code!: string;
  slug!: string;
  title!: string;
  description?: string | null;
  type!: 'MERCHANT' | 'BANK' | 'CARD';
  issuerBankId?: string | null;
  cashbackPercent?: string | null;
  capInr?: string | null;
  termsSummary?: string | null;
  terms?: unknown;
  validFrom!: string;
  validUntil?: string | null;
  status?: 'ACTIVE' | 'SCHEDULED' | 'EXPIRED' | 'HISTORICAL';
}

class UpdateOfferDto {
  code?: string;
  slug?: string;
  title?: string;
  description?: string | null;
  type?: 'MERCHANT' | 'BANK' | 'CARD';
  issuerBankId?: string | null;
  cashbackPercent?: string | null;
  capInr?: string | null;
  termsSummary?: string | null;
  terms?: unknown;
  validFrom?: string;
  validUntil?: string | null;
  status?: 'ACTIVE' | 'SCHEDULED' | 'EXPIRED' | 'HISTORICAL';
}

class AssignCardDto {
  creditCardId!: string;
}

class AssignMerchantDto {
  merchantId!: string;
}

@ApiTags('admin-offers')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin')
export class AdminOffersController {
  constructor(
    private readonly listActiveOffers: ListActiveOffersQuery,
    private readonly createOffer: CreateOfferCommand,
    private readonly updateOffer: UpdateOfferCommand,
    private readonly assignCard: AssignOfferCardCommand,
    private readonly assignMerchant: AssignOfferMerchantCommand,
    private readonly audit: AdminAuditService,
  ) {}

  @Get('offers')
  @ApiOkResponse({ description: 'Active offers as of now' })
  offers() {
    return this.listActiveOffers.execute();
  }

  @Post('offers')
  @ApiOkResponse({ description: 'Create offer' })
  async create(@Body() body: CreateOfferDto, @Req() request: RequestWithAdmin) {
    const offer = await this.createOffer.execute({
      code: body.code,
      slug: body.slug,
      title: body.title,
      description: body.description,
      type: body.type,
      issuerBankId: body.issuerBankId,
      cashbackPercent: body.cashbackPercent,
      capInr: body.capInr,
      termsSummary: body.termsSummary,
      terms: body.terms,
      validFrom: new Date(body.validFrom),
      validUntil: body.validUntil ? new Date(body.validUntil) : null,
      status: body.status,
    });
    await this.audit.record(request.adminUser!, 'offer.create', 'offer', offer.id, {
      code: offer.code,
    });
    return offer;
  }

  @Patch('offers/:id')
  @ApiOkResponse({ description: 'Update offer' })
  async update(
    @Param('id') id: string,
    @Body() body: UpdateOfferDto,
    @Req() request: RequestWithAdmin,
  ) {
    const offer = await this.updateOffer.execute(id, {
      code: body.code,
      slug: body.slug,
      title: body.title,
      description: body.description,
      type: body.type,
      issuerBankId: body.issuerBankId,
      cashbackPercent: body.cashbackPercent,
      capInr: body.capInr,
      termsSummary: body.termsSummary,
      terms: body.terms,
      validFrom: body.validFrom ? new Date(body.validFrom) : undefined,
      validUntil:
        body.validUntil !== undefined
          ? body.validUntil
            ? new Date(body.validUntil)
            : null
          : undefined,
      status: body.status,
    });
    await this.audit.record(request.adminUser!, 'offer.update', 'offer', offer.id, body);
    return offer;
  }

  @Post('offers/:id/cards')
  @ApiOkResponse({ description: 'Assign card to offer' })
  async assignOfferCard(
    @Param('id') offerId: string,
    @Body() body: AssignCardDto,
    @Req() request: RequestWithAdmin,
  ) {
    const assignment = await this.assignCard.execute({
      offerId,
      creditCardId: body.creditCardId,
    });
    await this.audit.record(
      request.adminUser!,
      'offer.assign_card',
      'offer_card_assignment',
      assignment.id,
      { offerId, creditCardId: body.creditCardId },
    );
    return assignment;
  }

  @Post('offers/:id/merchants')
  @ApiOkResponse({ description: 'Assign merchant to offer' })
  async assignOfferMerchant(
    @Param('id') offerId: string,
    @Body() body: AssignMerchantDto,
    @Req() request: RequestWithAdmin,
  ) {
    const link = await this.assignMerchant.execute({
      offerId,
      merchantId: body.merchantId,
    });
    await this.audit.record(
      request.adminUser!,
      'offer.assign_merchant',
      'offer_merchant',
      link.id,
      { offerId, merchantId: body.merchantId },
    );
    return link;
  }
}
