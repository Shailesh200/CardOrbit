# @cardwise/design-system

CardWise design tokens, themes, and global CSS for the platform.

## Usage

Import global styles in any app or package:

```css
@import '@cardwise/design-system/globals.css';
```

Import programmatic tokens:

```ts
import { colorTokens, spacingTokens } from '@cardwise/design-system';
```

## Token categories

| Category | Source |
|----------|--------|
| Color | `src/themes/light.css`, `src/themes/dark.css` |
| Typography | CSS variables + `src/tokens/typography.ts` |
| Spacing | CSS variables + `src/tokens/spacing.ts` |
| Radius | CSS variables + `src/tokens/radius.ts` |

## Themes

- **Light** — default (`:root`)
- **Dark** — stub (`.dark` class); full polish in M-024

## Contrast

Core light-theme pairs are validated in `src/contrast.test.ts` for WCAG 2.2 AA (4.5:1).

## Scripts

```bash
bun run build      # Compile token exports to dist/
bun run typecheck
bun run test       # Contrast verification
```
