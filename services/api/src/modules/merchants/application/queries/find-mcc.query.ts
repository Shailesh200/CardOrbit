import { Inject, Injectable } from '@nestjs/common';

import type { MccMappingEntity } from '../../domain/entities/merchant-catalog';
import {
  MCC_MAPPING_REPOSITORY,
  type MccMappingRepository,
} from '../../domain/repositories/merchant-catalog.repository';

@Injectable()
export class FindMccMappingQuery {
  constructor(
    @Inject(MCC_MAPPING_REPOSITORY)
    private readonly mccMappings: MccMappingRepository,
  ) {}

  execute(
    mccCode: string,
    options?: { merchantId?: string | null },
  ): Promise<MccMappingEntity | null> {
    return this.mccMappings.findByMccCode(mccCode, options);
  }
}
