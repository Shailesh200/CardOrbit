export type BankEntity = {
  id: string;
  name: string;
  slug: string;
  country: string;
  logoUrl: string | null;
  version: number;
  deletedAt: Date | null;
};

export type CardNetworkEntity = {
  id: string;
  code: string;
  name: string;
  slug: string;
  version: number;
  deletedAt: Date | null;
};

export type CreditCardEntity = {
  id: string;
  name: string;
  slug: string;
  bankId: string;
  networkId: string;
  rewardProgramId: string | null;
  tier: string;
  active: boolean;
  annualFeeInr: string | null;
  joiningFeeInr: string | null;
  version: number;
  deletedAt: Date | null;
  effectiveFrom: Date | null;
  effectiveTo: Date | null;
};

export type CreateBankInput = {
  name: string;
  slug: string;
  country?: string;
  logoUrl?: string | null;
};

export type CreateCardNetworkInput = {
  code: string;
  name: string;
  slug: string;
};

export type CreateCreditCardInput = {
  name: string;
  slug: string;
  bankId: string;
  networkId: string;
  rewardProgramId?: string | null;
  tier?: string;
  active?: boolean;
  annualFeeInr?: string | null;
  joiningFeeInr?: string | null;
  effectiveFrom?: Date | null;
  effectiveTo?: Date | null;
};

export type UpdateCreditCardInput = {
  name?: string;
  slug?: string;
  bankId?: string;
  networkId?: string;
  rewardProgramId?: string | null;
  tier?: string;
  active?: boolean;
  annualFeeInr?: string | null;
  joiningFeeInr?: string | null;
  effectiveFrom?: Date | null;
  effectiveTo?: Date | null;
};
