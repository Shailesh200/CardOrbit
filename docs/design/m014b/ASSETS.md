# M-014b Phase 2 — Illustration & Motion Assets

Phase 1 shipped enhanced SVG fallbacks. Phase 2 adds **drop-in PNG/WebP slots** and **Lottie motion** without code changes.

## Drop-in illustrations (no rebuild)

Place optimized WebP or PNG files in `apps/web/public/illustrations/`:

| Filename | Used on | Recommended size |
|----------|---------|------------------|
| `card-stack.webp` | Onboarding welcome | ~640×480 |
| `empty-wallet.webp` | Onboarding cards defer | ~480×400 |
| `auth-hero.webp` | Auth left rail (login, signup, forgot, reset, verify) | ~640×480 |

The `Illustration` component probes each path at runtime. If the file exists, it renders the image; otherwise the enhanced SVG fallback is shown.

### Sourcing tips

- **Style:** Premium 3D or soft clay, teal/emerald palette to match tokens
- **Background:** Transparent or soft gradient (mesh bg is applied by the page)
- **Export:** WebP @2x, compress with Squoosh or similar (~80–120 KB each)

Update paths in `apps/web/src/components/illustrations/manifest.ts` only if you use different filenames.

## Lottie animations

Bundled under `apps/web/src/assets/lottie/`:

| File | Component | Surface |
|------|-----------|---------|
| `success-complete.json` | `SuccessLottie` | Onboarding complete, email verified |

To swap: replace the JSON file (keep the same name) or point `SuccessLottie` at a new import.

License: success animation from [LottieFiles](https://lottiefiles.com) free tier — verify license before production if replacing.

## Logo

Use `HeroLogo` / `HeroLogoMark` (`apps/web/src/components/brand/`). Favicon: `apps/web/public/favicon.svg`.

**Locked design system:** `docs/design/WEB_CONSUMER_DESIGN_SYSTEM.md`

## Visual QA checklist

Compare against approved hi-fi mockups (when stored under `docs/design/m014b/`):

- [ ] Home hero + recommendation card
- [ ] Auth rail gradient + illustration
- [ ] Onboarding welcome → complete (Lottie plays once)
- [ ] Cards defer empty wallet
- [ ] Account profile + settings
- [ ] Mobile breakpoints (375px, 390px)

Mark M-014b **Verified** after side-by-side review, `bun run verify:milestone`, and `bun run verify:web` (Lighthouse + SEO).
