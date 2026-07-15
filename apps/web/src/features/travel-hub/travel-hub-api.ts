import { authFetch } from '@cardwise/auth';

const API_BASE = import.meta.env.VITE_API_URL || '';

export type TravelCardProfile = {
  userCardId: string;
  creditCardId: string;
  cardName: string;
  bankName: string;
  networkName: string;
  tier: string | null;
  loungeSummary: string | null;
  travelSummary: string | null;
  loungeBenefits: Array<{
    id: string;
    title: string;
    description: string | null;
    allowanceLabel: string | null;
    unlimited: boolean;
  }>;
  travelBenefits: Array<{ id: string; title: string; description: string | null }>;
  travelInsurance: Array<{ id: string; title: string; description: string | null }>;
  milesBalances: Array<{
    kind: 'MILES' | 'HOTEL_POINTS';
    availableAmount: number;
    estimatedValueInr: number | null;
    expiringAmount: number;
    expiringAt: string | null;
  }>;
  travelRewardRules: Array<{
    id: string;
    name: string;
    rewardMultiplier: number | null;
    cashbackPercent: number | null;
  }>;
};

export type TravelHubOverview = {
  cardCount: number;
  loungeCardCount: number;
  totalMiles: number;
  totalHotelPoints: number;
  totalMilesValueInr: number;
  travelOfferCount: number;
  bestTravelCardUserCardId: string | null;
  cards: TravelCardProfile[];
  travelOffers: Array<{
    id: string;
    title: string;
    description: string | null;
    cardName: string;
    validUntil: string | null;
  }>;
  spending: {
    totalVolumeInr: number;
    transactionCount: number;
    periodLabel: string;
    topMerchants: Array<{ merchantName: string; volumeInr: number; count: number }>;
  };
};

export function getTravelHubOverview() {
  return authFetch<TravelHubOverview>(`${API_BASE}/api/v1/travel-hub`);
}

export function formatInr(value: number): string {
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}
