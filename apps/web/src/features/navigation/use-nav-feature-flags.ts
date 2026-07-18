import { FeatureFlag, useFeatureFlag } from '@cardwise/feature-flags/browser';

/** Feature-gated primary nav destinations — hides sidebar/bottom-nav entries when off. */
export function useNavFeatureFlags() {
  const travel = useFeatureFlag(FeatureFlag.TRAVEL_BOOKING_ENABLED);
  const premium = useFeatureFlag(FeatureFlag.PREMIUM_FEATURES_ENABLED);
  const calendar = useFeatureFlag(FeatureFlag.FINANCIAL_CALENDAR);
  const reports = useFeatureFlag(FeatureFlag.USER_REPORTS);

  return { travel, premium, calendar, reports };
}
