export type MerchantCategoryEntity = {
  id: string;
  code: string;
  name: string;
  slug: string;
  description: string | null;
  version: number;
  deletedAt: Date | null;
};

export type MerchantEntity = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryCategoryId: string | null;
  paymentMethods: unknown;
  active: boolean;
  version: number;
  deletedAt: Date | null;
};

export type MerchantAliasEntity = {
  id: string;
  merchantId: string;
  alias: string;
  normalizedAlias: string;
  version: number;
  deletedAt: Date | null;
};

export type MccMappingEntity = {
  id: string;
  mccCode: string;
  categoryId: string;
  merchantId: string | null;
  description: string | null;
  version: number;
  deletedAt: Date | null;
};

export type CreateMerchantCategoryInput = {
  code: string;
  name: string;
  slug: string;
  description?: string | null;
};

export type CreateMerchantInput = {
  name: string;
  slug: string;
  logoUrl?: string | null;
  primaryCategoryId?: string | null;
  paymentMethods?: unknown;
  active?: boolean;
};

export type UpdateMerchantInput = {
  name?: string;
  slug?: string;
  logoUrl?: string | null;
  primaryCategoryId?: string | null;
  paymentMethods?: unknown;
  active?: boolean;
};

export type CreateMerchantAliasInput = {
  merchantId: string;
  alias: string;
  normalizedAlias?: string;
};

export type CreateMccMappingInput = {
  mccCode: string;
  categoryId: string;
  merchantId?: string | null;
  description?: string | null;
};
