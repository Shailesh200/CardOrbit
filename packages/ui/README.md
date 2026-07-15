# @cardwise/ui

Shared React UI components for CardWise — shadcn/ui (new-york) on Radix UI + Tailwind CSS 4.

## Installation

Apps add the workspace dependency and import styles once:

```ts
import '@cardwise/ui/styles.css';
import { Button, Card, Input, Dialog, Toaster, toast } from '@cardwise/ui';
```

## Core components (M-003)

| Component | Export |
|-----------|--------|
| Button | `Button`, `buttonVariants` |
| Input | `Input` |
| Card | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`, `CardAction` |
| Dialog | `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, … |
| Toast | `Toaster`, `toast` (via Sonner) |

## Adding components

From `packages/ui`:

```bash
bunx shadcn@latest add <component-name>
```

Update `src/index.ts` exports after adding components.

## Scripts

```bash
bun run build      # Compile to dist/
bun run typecheck
bun run test       # Isolated render tests
```

## Configuration

- `components.json` — shadcn CLI config
- `src/styles.css` — Tailwind + design-system tokens
