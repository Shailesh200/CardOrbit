-- M-035: Reward wallet accounts and per-kind balances

CREATE TYPE "rewards"."RewardBalanceKind" AS ENUM ('POINTS', 'CASHBACK', 'MILES', 'HOTEL_POINTS');

CREATE TABLE "rewards"."reward_accounts" (
    "id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "user_card_id" TEXT NOT NULL,
    "last_synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reward_accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "reward_accounts_user_card_id_key" ON "rewards"."reward_accounts"("user_card_id");
CREATE INDEX "reward_accounts_user_id_idx" ON "rewards"."reward_accounts"("user_id");

ALTER TABLE "rewards"."reward_accounts"
    ADD CONSTRAINT "reward_accounts_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "rewards"."reward_accounts"
    ADD CONSTRAINT "reward_accounts_user_card_id_fkey"
    FOREIGN KEY ("user_card_id") REFERENCES "cards"."user_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "rewards"."reward_balances" (
    "id" UUID NOT NULL,
    "reward_account_id" UUID NOT NULL,
    "kind" "rewards"."RewardBalanceKind" NOT NULL,
    "available_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "pending_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "expired_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "expiring_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "expiring_at" TIMESTAMP(3),
    "estimated_value_inr" DECIMAL(12,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reward_balances_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "reward_balances_available_amount_nonneg" CHECK ("available_amount" >= 0),
    CONSTRAINT "reward_balances_pending_amount_nonneg" CHECK ("pending_amount" >= 0),
    CONSTRAINT "reward_balances_expired_amount_nonneg" CHECK ("expired_amount" >= 0),
    CONSTRAINT "reward_balances_expiring_amount_nonneg" CHECK ("expiring_amount" >= 0)
);

CREATE UNIQUE INDEX "reward_balances_reward_account_id_kind_key"
    ON "rewards"."reward_balances"("reward_account_id", "kind");
CREATE INDEX "reward_balances_expiring_at_idx" ON "rewards"."reward_balances"("expiring_at");

ALTER TABLE "rewards"."reward_balances"
    ADD CONSTRAINT "reward_balances_reward_account_id_fkey"
    FOREIGN KEY ("reward_account_id") REFERENCES "rewards"."reward_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
