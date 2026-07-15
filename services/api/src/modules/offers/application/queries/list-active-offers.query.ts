import { Inject, Injectable } from '@nestjs/common';

import type { OfferEntity } from '../../domain/entities/offer';
import { OFFER_REPOSITORY, type OfferRepository } from '../../domain/repositories/offer.repository';

@Injectable()
export class ListActiveOffersQuery {
  constructor(@Inject(OFFER_REPOSITORY) private readonly offers: OfferRepository) {}

  execute(asOf: Date = new Date()): Promise<OfferEntity[]> {
    return this.offers.listActiveAsOf(asOf);
  }
}
