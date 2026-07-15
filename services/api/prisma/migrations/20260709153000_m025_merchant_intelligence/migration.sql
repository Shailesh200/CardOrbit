-- M-025: Merchant intelligence profile fields
ALTER TABLE merchants.merchants
  ADD COLUMN website TEXT,
  ADD COLUMN brand_name TEXT,
  ADD COLUMN parent_brand TEXT,
  ADD COLUMN popularity_score INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN tags JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX merchants_popularity_score_idx ON merchants.merchants (popularity_score DESC);
