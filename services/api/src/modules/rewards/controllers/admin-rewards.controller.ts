import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { AdminAuditService } from '../../admin-auth/admin-audit.service';
import type { AdminPrincipal } from '../../admin-auth/admin-auth.types';
import { AdminJwtGuard } from '../../admin-auth/admin-jwt.guard';
import { ActivateRewardRuleVersionCommand } from '../application/commands/activate-rule-version.command';
import {
  CreateRewardRuleCommand,
  CreateRewardRuleVersionCommand,
} from '../application/commands/create-reward-rule.command';
import { DeactivateRewardRuleVersionCommand } from '../application/commands/deactivate-rule-version.command';
import { PreviewRewardRuleQuery } from '../application/queries/calculate-reward.query';
import { ListRewardRulesQuery } from '../application/queries/list-reward-rules.query';

type RequestWithAdmin = { adminUser?: AdminPrincipal };

class CreateRewardRuleDto {
  ruleKey!: string;
  name!: string;
  creditCardId!: string;
  rewardProgramId?: string | null;
}

class CreateRewardRuleVersionDto {
  versionNumber!: number;
  spendCategoryId?: string | null;
  merchantId?: string | null;
  payload!: unknown;
  validFrom?: string | null;
  validUntil?: string | null;
  status?: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
}

@ApiTags('admin-rewards')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin')
export class AdminRewardsController {
  constructor(
    private readonly listRewardRules: ListRewardRulesQuery,
    private readonly createRule: CreateRewardRuleCommand,
    private readonly createVersion: CreateRewardRuleVersionCommand,
    private readonly activateVersion: ActivateRewardRuleVersionCommand,
    private readonly deactivateVersion: DeactivateRewardRuleVersionCommand,
    private readonly previewRule: PreviewRewardRuleQuery,
    private readonly audit: AdminAuditService,
  ) {}

  @Get('reward-rules')
  @ApiOkResponse({ description: 'Active reward rules' })
  rewardRules() {
    return this.listRewardRules.execute();
  }

  @Post('reward-rules/preview')
  @ApiOkResponse({ description: 'Preview reward calculation for a rule payload' })
  preview(@Body() body: unknown) {
    return this.previewRule.execute(body);
  }

  @Post('reward-rules')
  @ApiOkResponse({ description: 'Create reward rule' })
  async create(@Body() body: CreateRewardRuleDto, @Req() request: RequestWithAdmin) {
    const rule = await this.createRule.execute(body);
    await this.audit.record(request.adminUser!, 'reward_rule.create', 'reward_rule', rule.id, {
      ruleKey: rule.ruleKey,
    });
    return rule;
  }

  @Post('reward-rules/:ruleId/versions')
  @ApiOkResponse({ description: 'Create reward rule version' })
  async createRuleVersion(
    @Param('ruleId') ruleId: string,
    @Body() body: CreateRewardRuleVersionDto,
    @Req() request: RequestWithAdmin,
  ) {
    const version = await this.createVersion.execute({
      ruleId,
      versionNumber: body.versionNumber,
      spendCategoryId: body.spendCategoryId,
      merchantId: body.merchantId,
      payload: body.payload,
      validFrom: body.validFrom ? new Date(body.validFrom) : null,
      validUntil: body.validUntil ? new Date(body.validUntil) : null,
      status: body.status,
    });
    await this.audit.record(
      request.adminUser!,
      'reward_rule_version.create',
      'reward_rule_version',
      version.id,
      { ruleId, versionNumber: version.versionNumber },
    );
    return version;
  }

  @Post('reward-rules/versions/:versionId/activate')
  @ApiOkResponse({ description: 'Activate reward rule version' })
  async activate(@Param('versionId') versionId: string, @Req() request: RequestWithAdmin) {
    const version = await this.activateVersion.execute(versionId);
    await this.audit.record(
      request.adminUser!,
      'reward_rule_version.activate',
      'reward_rule_version',
      version.id,
    );
    return version;
  }

  @Post('reward-rules/versions/:versionId/deactivate')
  @ApiOkResponse({ description: 'Deactivate reward rule version' })
  async deactivate(@Param('versionId') versionId: string, @Req() request: RequestWithAdmin) {
    const version = await this.deactivateVersion.execute(versionId);
    await this.audit.record(
      request.adminUser!,
      'reward_rule_version.deactivate',
      'reward_rule_version',
      version.id,
    );
    return version;
  }
}
