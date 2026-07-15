-- M-044: Reward redemption records

CREATE TYPE "rewards"."RedemptionOptionType" AS ENUM (
  'STATEMENT_CREDIT',
  'GIFT_CARD',
  'FLIGHTS',
  'HOTELS',
  'MERCHANDISE',
  'CASHBACK',
  'PARTNER_TRANSFER'
);

CREATE TYPE "rewards"."RedemptionRecordStatus" AS ENUM ('COMPLETED', 'PENDING', 'CANCELLED');

CREATE TABLE "rewards"."reward_redemptions" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "user_card_id" TEXT NOT NULL,
  "balance_kind" "rewards"."RewardBalanceKind" NOT NULL,
  "option_type" "rewards"."RedemptionOptionType" NOT NULL,
  "points_redeemed" DECIMAL(14, 2) NOT NULL,
  "estimated_value_inr" DECIMAL(12, 2) NOT NULL,
  "effective_rate_percent" DECIMAL(7, 4) NOT NULL,
  "status" "rewards"."RedemptionRecordStatus" NOT NULL DEFAULT 'COMPLETED',
  "notes" TEXT,
  "redeemed_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "reward_redemptions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "reward_redemptions_user_id_redeemed_at_idx"
  ON "rewards"."reward_redemptions"("user_id", "redeemed_at" DESC);

CREATE INDEX "reward_redemptions_user_id_user_card_id_idx"
  ON "rewards"."reward_redemptions"("user_id", "user_card_id");

ALTER TABLE "rewards"."reward_redemptions"
  ADD CONSTRAINT "reward_redemptions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "rewards"."reward_redemptions"
  ADD CONSTRAINT "reward_redemptions_user_card_id_fkey"
  FOREIGN KEY ("user_card_id") REFERENCES "cards"."user_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
