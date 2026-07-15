import { Inject, Injectable } from '@nestjs/common';

import type { MerchantAliasEntity } from '../../domain/entities/merchant-catalog';
import {
  MERCHANT_ALIAS_REPOSITORY,
  type MerchantAliasRepository,
} from '../../domain/repositories/merchant-catalog.repository';

@Injectable()
export class FindMerchantByAliasQuery {
  constructor(
    @Inject(MERCHANT_ALIAS_REPOSITORY)
    private readonly aliases: MerchantAliasRepository,
  ) {}

  execute(alias: string): Promise<MerchantAliasEntity | null> {
    return this.aliases.findByAlias(alias);
  }
}
