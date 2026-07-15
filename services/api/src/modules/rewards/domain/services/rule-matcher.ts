import type { ActiveRewardRuleView } from '../entities/reward-rule';

export type RuleMatchContext = {
  merchantId?: string | null;
  spendCategoryId?: string | null;
  at: Date;
};

function isWithinValidity(
  validFrom: Date | null | undefined,
  validUntil: Date | null | undefined,
  at: Date,
): boolean {
  if (validFrom && at < validFrom) {
    return false;
  }
  if (validUntil && at > validUntil) {
    return false;
  }
  return true;
}

function ruleScopeScore(
  version: ActiveRewardRuleView['activeVersion'],
  context: RuleMatchContext,
): number | null {
  if (!isWithinValidity(version.validFrom, version.validUntil, context.at)) {
    return null;
  }

  if (version.merchantId) {
    return version.merchantId === context.merchantId ? 3 : null;
  }

  if (version.spendCategoryId) {
    return version.spendCategoryId === context.spendCategoryId ? 2 : null;
  }

  return 1;
}

/** Returns active rules applicable to the transaction, highest scope first. */
export function filterApplicableRules(
  rules: ActiveRewardRuleView[],
  context: RuleMatchContext,
): ActiveRewardRuleView[] {
  const scored = rules
    .map((entry) => ({
      entry,
      score: ruleScopeScore(entry.activeVersion, context),
    }))
    .filter((row): row is { entry: ActiveRewardRuleView; score: number } => row.score !== null);

  if (scored.length === 0) {
    return [];
  }

  const maxScore = Math.max(...scored.map((row) => row.score));
  return scored.filter((row) => row.score === maxScore).map((row) => row.entry);
}
