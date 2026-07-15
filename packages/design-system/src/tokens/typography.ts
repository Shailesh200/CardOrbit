export const typographyTokens = {
  fontSans: 'var(--font-sans)',
  fontMono: 'var(--font-mono)',
  fontSizeXs: 'var(--font-size-xs)',
  fontSizeSm: 'var(--font-size-sm)',
  fontSizeBase: 'var(--font-size-base)',
  fontSizeLg: 'var(--font-size-lg)',
  fontSizeXl: 'var(--font-size-xl)',
  fontSize2xl: 'var(--font-size-2xl)',
  fontSize3xl: 'var(--font-size-3xl)',
  lineHeightTight: 'var(--line-height-tight)',
  lineHeightNormal: 'var(--line-height-normal)',
  lineHeightRelaxed: 'var(--line-height-relaxed)',
  fontWeightNormal: 'var(--font-weight-normal)',
  fontWeightMedium: 'var(--font-weight-medium)',
  fontWeightSemibold: 'var(--font-weight-semibold)',
  fontWeightBold: 'var(--font-weight-bold)',
} as const;

export type TypographyToken = keyof typeof typographyTokens;
