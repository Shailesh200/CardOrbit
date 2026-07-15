import { Inject, Injectable } from '@nestjs/common';

import type { CreditCardEntity } from '../../domain/entities/card-catalog';
import {
  CREDIT_CARD_REPOSITORY,
  type CreditCardRepository,
} from '../../domain/repositories/card-catalog.repository';

@Injectable()
export class ListCreditCardsQuery {
  constructor(@Inject(CREDIT_CARD_REPOSITORY) private readonly cards: CreditCardRepository) {}

  execute(): Promise<CreditCardEntity[]> {
    return this.cards.listActive();
  }
}
