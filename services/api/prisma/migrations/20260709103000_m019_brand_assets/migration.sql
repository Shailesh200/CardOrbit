-- Brand asset URL fields (files live in object storage; DB stores references only).

ALTER TABLE merchants.merchants
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

ALTER TABLE cards.credit_cards
  ADD COLUMN IF NOT EXISTS image_url TEXT;
