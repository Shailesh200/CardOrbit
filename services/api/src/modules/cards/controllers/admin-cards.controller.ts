import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { AdminAuditService } from '../../admin-auth/admin-audit.service';
import type { AdminPrincipal } from '../../admin-auth/admin-auth.types';
import { AdminJwtGuard } from '../../admin-auth/admin-jwt.guard';
import {
  ArchiveCreditCardCommand,
  CreateCreditCardCommand,
  UpdateCreditCardCommand,
} from '../application/commands/credit-card.commands';
import { ListBanksQuery } from '../application/queries/list-banks.query';
import { ListCreditCardsQuery } from '../application/queries/list-credit-cards.query';

type RequestWithAdmin = { adminUser?: AdminPrincipal };

class CreateCreditCardDto {
  name!: string;
  slug!: string;
  bankId!: string;
  networkId!: string;
  rewardProgramId?: string | null;
  tier?: string;
  active?: boolean;
  annualFeeInr?: string | null;
  joiningFeeInr?: string | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
}

class UpdateCreditCardDto {
  name?: string;
  slug?: string;
  bankId?: string;
  networkId?: string;
  rewardProgramId?: string | null;
  tier?: string;
  active?: boolean;
  annualFeeInr?: string | null;
  joiningFeeInr?: string | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
}

@ApiTags('admin-cards')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin')
export class AdminCardsController {
  constructor(
    private readonly listBanks: ListBanksQuery,
    private readonly listCreditCards: ListCreditCardsQuery,
    private readonly createCard: CreateCreditCardCommand,
    private readonly updateCard: UpdateCreditCardCommand,
    private readonly archiveCard: ArchiveCreditCardCommand,
    private readonly audit: AdminAuditService,
  ) {}

  @Get('banks')
  @ApiOkResponse({ description: 'Active banks in card catalog' })
  banks() {
    return this.listBanks.execute();
  }

  @Get('credit-cards')
  @ApiOkResponse({ description: 'Active credit cards' })
  creditCards() {
    return this.listCreditCards.execute();
  }

  @Post('credit-cards')
  @ApiOkResponse({ description: 'Create credit card' })
  async create(@Body() body: CreateCreditCardDto, @Req() request: RequestWithAdmin) {
    const card = await this.createCard.execute({
      name: body.name,
      slug: body.slug,
      bankId: body.bankId,
      networkId: body.networkId,
      rewardProgramId: body.rewardProgramId,
      tier: body.tier,
      active: body.active,
      annualFeeInr: body.annualFeeInr,
      joiningFeeInr: body.joiningFeeInr,
      effectiveFrom: body.effectiveFrom ? new Date(body.effectiveFrom) : null,
      effectiveTo: body.effectiveTo ? new Date(body.effectiveTo) : null,
    });
    await this.audit.record(request.adminUser!, 'credit_card.create', 'credit_card', card.id, {
      slug: card.slug,
    });
    return card;
  }

  @Patch('credit-cards/:id')
  @ApiOkResponse({ description: 'Update credit card' })
  async update(
    @Param('id') id: string,
    @Body() body: UpdateCreditCardDto,
    @Req() request: RequestWithAdmin,
  ) {
    const card = await this.updateCard.execute(id, {
      name: body.name,
      slug: body.slug,
      bankId: body.bankId,
      networkId: body.networkId,
      rewardProgramId: body.rewardProgramId,
      tier: body.tier,
      active: body.active,
      annualFeeInr: body.annualFeeInr,
      joiningFeeInr: body.joiningFeeInr,
      effectiveFrom:
        body.effectiveFrom !== undefined
          ? body.effectiveFrom
            ? new Date(body.effectiveFrom)
            : null
          : undefined,
      effectiveTo:
        body.effectiveTo !== undefined
          ? body.effectiveTo
            ? new Date(body.effectiveTo)
            : null
          : undefined,
    });
    await this.audit.record(request.adminUser!, 'credit_card.update', 'credit_card', card.id, body);
    return card;
  }

  @Post('credit-cards/:id/archive')
  @ApiOkResponse({ description: 'Archive (soft-delete) credit card' })
  async archive(@Param('id') id: string, @Req() request: RequestWithAdmin) {
    const result = await this.archiveCard.execute(id);
    await this.audit.record(request.adminUser!, 'credit_card.archive', 'credit_card', id);
    return result;
  }
}
