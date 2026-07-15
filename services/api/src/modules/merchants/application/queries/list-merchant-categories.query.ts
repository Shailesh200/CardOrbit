import { Inject, Injectable } from '@nestjs/common';

import type { MerchantCategoryEntity } from '../../domain/entities/merchant-catalog';
import {
  MERCHANT_CATEGORY_REPOSITORY,
  type MerchantCategoryRepository,
} from '../../domain/repositories/merchant-catalog.repository';

@Injectable()
export class ListMerchantCategoriesQuery {
  constructor(
    @Inject(MERCHANT_CATEGORY_REPOSITORY)
    private readonly categories: MerchantCategoryRepository,
  ) {}

  execute(): Promise<MerchantCategoryEntity[]> {
    return this.categories.listActive();
  }
}
