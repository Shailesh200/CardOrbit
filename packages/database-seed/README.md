# Database Seed

Version-controlled JSON seed files and Zod-validated loaders for the intelligence data layer (M-010).

Seed files hold **reference catalogs only** — unique banks and merchants. Credit cards, reward rules, and offers are curated via the admin CMS; re-running `db:seed` soft-deletes catalog rows that are no longer in the JSON files.

## Files

| File | Contents |
|------|----------|
| `data/banks.json` | Networks + banks |
| `data/cards.json` | Reward programs, spend categories, credit cards |
| `data/merchants.json` | Merchant categories + merchants (+ aliases) |
| `data/reward-rules.json` | Versioned reward rules |
| `data/offers.json` | Offers + card/merchant assignments |

## Commands

```bash
# Regenerate JSON (then commit)
bun run --filter @cardwise/database-seed generate

# Apply to local Postgres
bun run db:seed
```
