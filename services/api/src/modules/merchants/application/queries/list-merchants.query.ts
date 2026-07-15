import { Inject, Injectable } from '@nestjs/common';

import type { MerchantEntity } from '../../domain/entities/merchant-catalog';
import {
  MERCHANT_REPOSITORY,
  type MerchantRepository,
} from '../../domain/repositories/merchant-catalog.repository';

@Injectable()
export class ListMerchantsQuery {
  constructor(@Inject(MERCHANT_REPOSITORY) private readonly merchants: MerchantRepository) {}

  execute(): Promise<MerchantEntity[]> {
    return this.merchants.listActive();
  }
}
