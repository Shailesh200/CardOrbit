/** Maps spend category codes to exclusion tags used in reward rule payloads. */
const CATEGORY_CODE_TAGS: Record<string, string[]> = {
  FUEL: ['fuel'],
  RENT: ['rent'],
  UTILITIES: ['utilities'],
  WALLET: ['wallet'],
};

export function tagsForSpendCategory(
  code: string | null | undefined,
  slug?: string | null,
): string[] {
  const tags = new Set<string>();
  if (code) {
    tags.add(code.toLowerCase());
    for (const tag of CATEGORY_CODE_TAGS[code] ?? []) {
      tags.add(tag);
    }
  }
  if (slug) {
    tags.add(slug.toLowerCase());
  }
  return [...tags];
}

export function mergeExclusionTags(...groups: Array<string[] | undefined>): string[] {
  const tags = new Set<string>();
  for (const group of groups) {
    if (!group) continue;
    for (const tag of group) {
      tags.add(tag.toLowerCase());
    }
  }
  return [...tags];
}

export function isExcluded(
  transactionTags: string[],
  ruleExclusions: string[],
): { excluded: boolean; matchedTag?: string } {
  const normalized = new Set(transactionTags.map((tag) => tag.toLowerCase()));
  for (const exclusion of ruleExclusions) {
    const key = exclusion.toLowerCase();
    if (normalized.has(key)) {
      return { excluded: true, matchedTag: key };
    }
  }
  return { excluded: false };
}
