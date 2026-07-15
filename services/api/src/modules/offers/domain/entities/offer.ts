export type OfferEntity = {
  id: string;
  code: string;
  slug: string;
  title: string;
  description: string | null;
  type: 'MERCHANT' | 'BANK' | 'CARD';
  issuerBankId: string | null;
  cashbackPercent: string | null;
  capInr: string | null;
  termsSummary: string | null;
  terms: unknown;
  validFrom: Date;
  validUntil: Date | null;
  status: 'ACTIVE' | 'SCHEDULED' | 'EXPIRED' | 'HISTORICAL';
  version: number;
  deletedAt: Date | null;
};

export type OfferCardAssignmentEntity = {
  id: string;
  offerId: string;
  creditCardId: string;
  version: number;
  deletedAt: Date | null;
};

export type OfferMerchantEntity = {
  id: string;
  offerId: string;
  merchantId: string;
  version: number;
  deletedAt: Date | null;
};

export type CreateOfferInput = {
  code: string;
  slug: string;
  title: string;
  description?: string | null;
  type: 'MERCHANT' | 'BANK' | 'CARD';
  issuerBankId?: string | null;
  cashbackPercent?: string | null;
  capInr?: string | null;
  termsSummary?: string | null;
  terms?: unknown;
  validFrom: Date;
  validUntil?: Date | null;
  status?: 'ACTIVE' | 'SCHEDULED' | 'EXPIRED' | 'HISTORICAL';
};

export type UpdateOfferInput = {
  code?: string;
  slug?: string;
  title?: string;
  description?: string | null;
  type?: 'MERCHANT' | 'BANK' | 'CARD';
  issuerBankId?: string | null;
  cashbackPercent?: string | null;
  capInr?: string | null;
  termsSummary?: string | null;
  terms?: unknown;
  validFrom?: Date;
  validUntil?: Date | null;
  status?: 'ACTIVE' | 'SCHEDULED' | 'EXPIRED' | 'HISTORICAL';
};

export type AssignCardInput = {
  offerId: string;
  creditCardId: string;
};

export type AssignMerchantInput = {
  offerId: string;
  merchantId: string;
};
