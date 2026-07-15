-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "rewards";

-- CreateEnum
CREATE TYPE "rewards"."RewardRuleVersionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "rewards"."reward_rules" (
    "id" UUID NOT NULL,
    "rule_key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "credit_card_id" UUID NOT NULL,
    "reward_program_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "reward_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rewards"."reward_rule_versions" (
    "id" UUID NOT NULL,
    "rule_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "status" "rewards"."RewardRuleVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "spend_category_id" UUID,
    "merchant_id" UUID,
    "payload" JSONB NOT NULL,
    "valid_from" TIMESTAMP(3),
    "valid_until" TIMESTAMP(3),
    "activated_at" TIMESTAMP(3),
    "deactivated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "reward_rule_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reward_rules_rule_key_key" ON "rewards"."reward_rules"("rule_key");
CREATE INDEX "reward_rules_credit_card_id_idx" ON "rewards"."reward_rules"("credit_card_id");
CREATE INDEX "reward_rules_reward_program_id_idx" ON "rewards"."reward_rules"("reward_program_id");
CREATE INDEX "reward_rules_deleted_at_idx" ON "rewards"."reward_rules"("deleted_at");
CREATE UNIQUE INDEX "reward_rule_versions_rule_id_version_number_key" ON "rewards"."reward_rule_versions"("rule_id", "version_number");
CREATE INDEX "reward_rule_versions_rule_id_idx" ON "rewards"."reward_rule_versions"("rule_id");
CREATE INDEX "reward_rule_versions_status_idx" ON "rewards"."reward_rule_versions"("status");
CREATE INDEX "reward_rule_versions_spend_category_id_idx" ON "rewards"."reward_rule_versions"("spend_category_id");
CREATE INDEX "reward_rule_versions_merchant_id_idx" ON "rewards"."reward_rule_versions"("merchant_id");
CREATE INDEX "reward_rule_versions_deleted_at_idx" ON "rewards"."reward_rule_versions"("deleted_at");

-- At most one ACTIVE version per rule
CREATE UNIQUE INDEX "reward_rule_versions_one_active_per_rule" ON "rewards"."reward_rule_versions"("rule_id")
  WHERE "status" = 'ACTIVE' AND "deleted_at" IS NULL;

-- AddForeignKey
ALTER TABLE "rewards"."reward_rules" ADD CONSTRAINT "reward_rules_credit_card_id_fkey" FOREIGN KEY ("credit_card_id") REFERENCES "cards"."credit_cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rewards"."reward_rules" ADD CONSTRAINT "reward_rules_reward_program_id_fkey" FOREIGN KEY ("reward_program_id") REFERENCES "cards"."reward_programs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "rewards"."reward_rule_versions" ADD CONSTRAINT "reward_rule_versions_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "rewards"."reward_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rewards"."reward_rule_versions" ADD CONSTRAINT "reward_rule_versions_spend_category_id_fkey" FOREIGN KEY ("spend_category_id") REFERENCES "cards"."spend_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "rewards"."reward_rule_versions" ADD CONSTRAINT "reward_rule_versions_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"."merchants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
