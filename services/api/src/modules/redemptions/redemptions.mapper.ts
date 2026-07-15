import type {
  RedemptionHistoryItem,
  RedemptionOptionType,
  RedemptionRecordStatus,
  RewardBalanceKind,
} from '@cardwise/validation';
import { REDEMPTION_OPTION_LABELS } from '@cardwise/validation';
import type { RewardRedemption } from '@prisma/client';

type CardContext = {
  nickname: string | null;
  creditCard: {
    name: string;
    bank: { name: string };
  };
};

export function mapRedemptionHistoryItem(
  row: RewardRedemption,
  card: CardContext,
): RedemptionHistoryItem {
  return {
    id: row.id,
    userCardId: row.userCardId,
    cardName: card.nickname ?? card.creditCard.name,
    bankName: card.creditCard.bank.name,
    balanceKind: row.balanceKind as RewardBalanceKind,
    optionType: row.optionType as RedemptionOptionType,
    optionLabel: REDEMPTION_OPTION_LABELS[row.optionType as RedemptionOptionType],
    pointsRedeemed: Number(row.pointsRedeemed),
    estimatedValueInr: Number(row.estimatedValueInr),
    effectiveRatePercent: Number(row.effectiveRatePercent),
    status: row.status as RedemptionRecordStatus,
    notes: row.notes,
    redeemedAt: row.redeemedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}
