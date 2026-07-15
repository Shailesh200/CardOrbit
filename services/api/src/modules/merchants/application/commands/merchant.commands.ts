import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import type {
  CreateMerchantAliasInput,
  CreateMerchantInput,
  CreateMccMappingInput,
  MerchantAliasEntity,
  MerchantEntity,
  MccMappingEntity,
  UpdateMerchantInput,
} from '../../domain/entities/merchant-catalog';
import {
  MCC_MAPPING_REPOSITORY,
  MERCHANT_ALIAS_REPOSITORY,
  MERCHANT_REPOSITORY,
  type MccMappingRepository,
  type MerchantAliasRepository,
  type MerchantRepository,
} from '../../domain/repositories/merchant-catalog.repository';

@Injectable()
export class CreateMerchantCommand {
  constructor(@Inject(MERCHANT_REPOSITORY) private readonly merchants: MerchantRepository) {}

  execute(input: CreateMerchantInput): Promise<MerchantEntity> {
    return this.merchants.create(input);
  }
}

@Injectable()
export class UpdateMerchantCommand {
  constructor(@Inject(MERCHANT_REPOSITORY) private readonly merchants: MerchantRepository) {}

  async execute(id: string, input: UpdateMerchantInput): Promise<MerchantEntity> {
    const existing = await this.merchants.findById(id);
    if (!existing) {
      throw new NotFoundException(`Merchant ${id} not found`);
    }
    return this.merchants.update(id, input);
  }
}

@Injectable()
export class CreateMerchantAliasCommand {
  constructor(
    @Inject(MERCHANT_ALIAS_REPOSITORY) private readonly aliases: MerchantAliasRepository,
  ) {}

  execute(input: CreateMerchantAliasInput): Promise<MerchantAliasEntity> {
    return this.aliases.create(input);
  }
}

@Injectable()
export class DeleteMerchantAliasCommand {
  constructor(
    @Inject(MERCHANT_ALIAS_REPOSITORY) private readonly aliases: MerchantAliasRepository,
  ) {}

  async execute(id: string): Promise<{ id: string; deleted: true }> {
    await this.aliases.softDelete(id);
    return { id, deleted: true };
  }
}

@Injectable()
export class CreateMccMappingCommand {
  constructor(@Inject(MCC_MAPPING_REPOSITORY) private readonly mcc: MccMappingRepository) {}

  execute(input: CreateMccMappingInput): Promise<MccMappingEntity> {
    return this.mcc.create(input);
  }
}
