import type {
  CreateMccMappingInput,
  CreateMerchantAliasInput,
  CreateMerchantCategoryInput,
  CreateMerchantInput,
  MccMappingEntity,
  MerchantAliasEntity,
  MerchantCategoryEntity,
  MerchantEntity,
  UpdateMerchantInput,
} from '../entities/merchant-catalog';

export const MERCHANT_CATEGORY_REPOSITORY = Symbol('MERCHANT_CATEGORY_REPOSITORY');
export const MERCHANT_REPOSITORY = Symbol('MERCHANT_REPOSITORY');
export const MERCHANT_ALIAS_REPOSITORY = Symbol('MERCHANT_ALIAS_REPOSITORY');
export const MCC_MAPPING_REPOSITORY = Symbol('MCC_MAPPING_REPOSITORY');

export interface MerchantCategoryRepository {
  create(input: CreateMerchantCategoryInput): Promise<MerchantCategoryEntity>;
  listActive(): Promise<MerchantCategoryEntity[]>;
}

export interface MerchantRepository {
  create(input: CreateMerchantInput): Promise<MerchantEntity>;
  findById(id: string, options?: { includeDeleted?: boolean }): Promise<MerchantEntity | null>;
  findBySlug(slug: string, options?: { includeDeleted?: boolean }): Promise<MerchantEntity | null>;
  listActive(): Promise<MerchantEntity[]>;
  update(id: string, input: UpdateMerchantInput): Promise<MerchantEntity>;
  softDelete(id: string): Promise<void>;
  searchByName(query: string): Promise<MerchantEntity[]>;
}

export interface MerchantAliasRepository {
  create(input: CreateMerchantAliasInput): Promise<MerchantAliasEntity>;
  findByAlias(alias: string): Promise<MerchantAliasEntity | null>;
  softDelete(id: string): Promise<void>;
}

export interface MccMappingRepository {
  create(input: CreateMccMappingInput): Promise<MccMappingEntity>;
  findByMccCode(
    mccCode: string,
    options?: { merchantId?: string | null },
  ): Promise<MccMappingEntity | null>;
}
