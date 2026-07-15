import { describe, expect, it } from 'vitest';

/**
 * WCAG 2.2 AA requires 4.5:1 contrast for normal text.
 */
const LIGHT_THEME_PAIRS: Array<{ name: string; foreground: string; background: string }> = [
  {
    name: 'primary button',
    foreground: 'oklch(0.99 0.01 170)',
    background: 'oklch(0.38 0.11 170)',
  },
  {
    name: 'body text',
    foreground: 'oklch(0.17 0.03 250)',
    background: 'oklch(0.988 0.006 160)',
  },
  {
    name: 'destructive',
    foreground: 'oklch(0.99 0.01 25)',
    background: 'oklch(0.5 0.19 25)',
  },
];

function parseOklch(value: string): [number, number, number] {
  const match = value.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)/);
  if (!match) {
    throw new Error(`Invalid oklch value: ${value}`);
  }
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function oklchToRgb(l: number, c: number, h: number): [number, number, number] {
  const hueRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hueRad);
  const b = c * Math.sin(hueRad);

  const lPrime = l + 0.3963377774 * a + 0.2158037573 * b;
  const mPrime = l - 0.1055613458 * a - 0.0638541728 * b;
  const sPrime = l - 0.0894841775 * a - 1.291485548 * b;

  const l3 = lPrime ** 3;
  const m3 = mPrime ** 3;
  const s3 = sPrime ** 3;

  const r = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193765 * s3;
  const bOut = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3;

  const clamp = (channel: number) => Math.min(1, Math.max(0, channel)) * 255;
  return [clamp(r), clamp(g), clamp(bOut)];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const transform = (channel: number) => {
    const normalized = channel / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  const [rs, gs, bs] = [transform(r), transform(g), transform(b)];
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(foreground: string, background: string): number {
  const fg = relativeLuminance(oklchToRgb(...parseOklch(foreground)));
  const bg = relativeLuminance(oklchToRgb(...parseOklch(background)));
  const lighter = Math.max(fg, bg);
  const darker = Math.min(fg, bg);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('@cardwise/design-system contrast', () => {
  it('meets WCAG 2.2 AA (4.5:1) for core light-theme pairs', () => {
    for (const pair of LIGHT_THEME_PAIRS) {
      const ratio = contrastRatio(pair.foreground, pair.background);
      expect(ratio, `${pair.name} contrast ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
