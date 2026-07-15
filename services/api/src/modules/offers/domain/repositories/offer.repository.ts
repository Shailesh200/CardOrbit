import type {
  AssignCardInput,
  AssignMerchantInput,
  CreateOfferInput,
  OfferCardAssignmentEntity,
  OfferEntity,
  OfferMerchantEntity,
  UpdateOfferInput,
} from '../entities/offer';

export const OFFER_REPOSITORY = Symbol('OFFER_REPOSITORY');

export interface OfferRepository {
  create(input: CreateOfferInput): Promise<OfferEntity>;
  assignCard(input: AssignCardInput): Promise<OfferCardAssignmentEntity>;
  assignMerchant(input: AssignMerchantInput): Promise<OfferMerchantEntity>;
  findById(
    id: string,
    options?: { includeHistorical?: boolean; includeDeleted?: boolean },
  ): Promise<OfferEntity | null>;
  findByCode(
    code: string,
    options?: { includeHistorical?: boolean; includeDeleted?: boolean },
  ): Promise<OfferEntity | null>;
  listActiveAsOf(asOf: Date): Promise<OfferEntity[]>;
  update(id: string, input: UpdateOfferInput): Promise<OfferEntity>;
  expireOffer(id: string): Promise<OfferEntity>;
  markHistorical(id: string): Promise<OfferEntity>;
}
