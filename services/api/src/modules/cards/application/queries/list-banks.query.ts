import { Inject, Injectable } from '@nestjs/common';

import type { BankEntity } from '../../domain/entities/card-catalog';
import {
  BANK_REPOSITORY,
  type BankRepository,
} from '../../domain/repositories/card-catalog.repository';

@Injectable()
export class ListBanksQuery {
  constructor(@Inject(BANK_REPOSITORY) private readonly banks: BankRepository) {}

  execute(): Promise<BankEntity[]> {
    return this.banks.listActive();
  }
}
