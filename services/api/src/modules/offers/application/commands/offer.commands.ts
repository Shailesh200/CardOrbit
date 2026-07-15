import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import type {
  AssignCardInput,
  AssignMerchantInput,
  CreateOfferInput,
  OfferCardAssignmentEntity,
  OfferEntity,
  OfferMerchantEntity,
  UpdateOfferInput,
} from '../../domain/entities/offer';
import { OFFER_REPOSITORY, type OfferRepository } from '../../domain/repositories/offer.repository';

@Injectable()
export class CreateOfferCommand {
  constructor(@Inject(OFFER_REPOSITORY) private readonly offers: OfferRepository) {}

  execute(input: CreateOfferInput): Promise<OfferEntity> {
    return this.offers.create(input);
  }
}

@Injectable()
export class UpdateOfferCommand {
  constructor(@Inject(OFFER_REPOSITORY) private readonly offers: OfferRepository) {}

  async execute(id: string, input: UpdateOfferInput): Promise<OfferEntity> {
    const existing = await this.offers.findById(id, { includeHistorical: true });
    if (!existing) {
      throw new NotFoundException(`Offer ${id} not found`);
    }
    return this.offers.update(id, input);
  }
}

@Injectable()
export class AssignOfferCardCommand {
  constructor(@Inject(OFFER_REPOSITORY) private readonly offers: OfferRepository) {}

  execute(input: AssignCardInput): Promise<OfferCardAssignmentEntity> {
    return this.offers.assignCard(input);
  }
}

@Injectable()
export class AssignOfferMerchantCommand {
  constructor(@Inject(OFFER_REPOSITORY) private readonly offers: OfferRepository) {}

  execute(input: AssignMerchantInput): Promise<OfferMerchantEntity> {
    return this.offers.assignMerchant(input);
  }
}
