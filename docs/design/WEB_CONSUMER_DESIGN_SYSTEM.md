# CardOrbit Web Consumer Design System

**Status:** Active (CardOrbit rebrand)  
**Authority:** Canonical reference for all `apps/web` UI work  
**Supersedes:** CardWise teal/mint M-014b lock; ad-hoc styling; legacy `LogoMark`

---

## Purpose

This document locks the **consumer web** visual language for **CardOrbit** — an AI-powered financial operating system. Every new page, feature, and milestone touching `apps/web` must extend this system — not invent parallel themes.

Internal package names, APIs, folders, and env vars remain `@cardwise/*` / CardWise technical identifiers. User-facing brand is **CardOrbit**.

---

## Visual identity

| Token | Value |
|-------|--------|
| Display / body font | **Geist** (`--font-display`, `--font-sans`) with Inter fallback |
| Primary accent | Electric Blue `#4F8CFF` (`--primary`, `--consumer-teal` alias) |
| Secondary accent | Orbit Purple `#7C5CFF` |
| Canvas | Deep Space `#050816` |
| Secondary / sidebar | `#0B1023` |
| Surface / elevated | `#111827` / `#161D33` |
| Border | `rgba(255,255,255,0.08)` |
| Text | Primary `#F9FAFB`, secondary `#94A3B8` |

**Brand lockup:** `HeroLogo` everywhere — nav, footer, hero, auth rail, favicon (`HeroLogoMark` orbital mark).

**Tagline:** Your AI-powered financial orbit.

---

## Layout & surfaces

| Pattern | Use | Key classes / components |
|---------|-----|---------------------------|
| **App shell** | All authenticated + marketing routes | `AppShell`, `.site-header`, `.consumer-footer` |
| **Floating glass** | Nav, panels, account | `.consumer-surface`, `.consumer-surface--glass` |
| **Dark ambient** | Landing hero, auth rail, CTA bands | `HeroAmbientBackground`, `.consumer-dark-panel`, `AuthRail` |
| **Orbital atmosphere** | Global body mesh + star field | `styles.css` `body::before` / `body::after`; `.orbit-bg` |
| **Auth split** | Login, signup, password flows | `AuthShell` + `AuthRail` + `AuthPanel` |
| **Scroll** | Route changes | `ScrollToTop` in `App.tsx` |

### Surface rules

- **Entire product:** Deep Space dark-first — no mint light chrome.
- **Cards:** 12–20px radius, thin borders, soft shadow, subtle hover elevation.
- **Primary CTAs:** Blue → purple gradient with soft glow (`.home-btn-primary`, shell default buttons).
- **Forms:** Large rounded inputs, blue focus ring via `consumer-theme.css`.

---

## Components (reuse, do not duplicate)

| Component | Path alias | Notes |
|-----------|------------|-------|
| `HeroLogo` | `@brand/HeroLogo` | `tone: 'light' \| 'dark'`, `size: 'sm' \| 'md' \| 'lg'` |
| `HeroLogoMark` | `@brand/HeroLogoMark` | Abstract orbit + node (no rockets/planets) |
| `AnimatedCardStack` | `@brand/AnimatedCardStack` | `variant="showcase"` = landing; default = auth |
| `RecommendationPreview` | `@marketing/RecommendationPreview` | Live demo on landing |
| `RevealOnScroll` | `@motion/RevealOnScroll` | Soft fade / scale entrances |
| `ConsumerDarkPanel` | `@/components/surface/ConsumerDarkPanel` | Ambient inset panels |
| `EmptyState` | `@/components/feedback/EmptyState` | Dashed glass empty panels |

### Hyperlinks

Use `consumerLink` helpers from `@lib/consumer-link.ts`.

---

## Motion

- Slow fade, soft scale, floating ambient drift.
- Avoid bouncy / playful springs for brand moments.
- Respect `prefers-reduced-motion`.

---

## Path aliases (`apps/web`)

| Alias | Resolves to |
|-------|-------------|
| `@/` | `src/` |
| `@brand/` | `components/brand/` |
| `@motion/` | `components/motion/` |
| `@marketing/` | `components/marketing/` |
| `@layout/` | `components/layout/` |
| `@features/` | `features/` |
| `@lib/` | `lib/` |

---

## SEO baseline

| Item | Location / rule |
|------|-----------------|
| `lang="en-IN"` | `index.html` |
| `<title>` | `CardOrbit · …` — update per route |
| Meta description | CardOrbit financial OS messaging |
| Favicon | `/favicon.svg` (orbital mark) |
| Theme color | `#050816` |

---

## Milestone verification (web changes)

```bash
bun run verify:web
```

Lighthouse: Accessibility/Best Practices/SEO ≥90 enforced; Performance target ≥85 (advisory until M-085).

Do not introduce alternate color systems or fonts without updating this document.
