import type {
  BankEntity,
  CardNetworkEntity,
  CreateBankInput,
  CreateCardNetworkInput,
  CreateCreditCardInput,
  CreditCardEntity,
  UpdateCreditCardInput,
} from '../entities/card-catalog';

export const BANK_REPOSITORY = Symbol('BANK_REPOSITORY');
export const CARD_NETWORK_REPOSITORY = Symbol('CARD_NETWORK_REPOSITORY');
export const CREDIT_CARD_REPOSITORY = Symbol('CREDIT_CARD_REPOSITORY');

export interface BankRepository {
  create(input: CreateBankInput): Promise<BankEntity>;
  findBySlug(slug: string, options?: { includeDeleted?: boolean }): Promise<BankEntity | null>;
  listActive(): Promise<BankEntity[]>;
  softDelete(id: string): Promise<void>;
}

export interface CardNetworkRepository {
  create(input: CreateCardNetworkInput): Promise<CardNetworkEntity>;
  findByCode(code: string): Promise<CardNetworkEntity | null>;
  listActive(): Promise<CardNetworkEntity[]>;
}

export interface CreditCardRepository {
  create(input: CreateCreditCardInput): Promise<CreditCardEntity>;
  findById(id: string, options?: { includeDeleted?: boolean }): Promise<CreditCardEntity | null>;
  findBySlug(
    slug: string,
    options?: { includeDeleted?: boolean },
  ): Promise<CreditCardEntity | null>;
  listActive(): Promise<CreditCardEntity[]>;
  update(id: string, input: UpdateCreditCardInput): Promise<CreditCardEntity>;
  softDelete(id: string): Promise<void>;
}
