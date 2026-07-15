-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "cards";

-- CreateEnum
CREATE TYPE "cards"."CardFeeType" AS ENUM ('JOINING', 'ANNUAL', 'OTHER');

-- CreateEnum
CREATE TYPE "cards"."CardTier" AS ENUM ('ENTRY', 'STANDARD', 'PREMIUM', 'SUPER_PREMIUM', 'ULTRA_PREMIUM');

-- CreateTable
CREATE TABLE "cards"."card_networks" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "card_networks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cards"."banks" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'IN',
    "logo_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "banks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cards"."reward_programs" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "issuer_bank_id" UUID,
    "point_value_inr" DECIMAL(12,4),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "reward_programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cards"."spend_categories" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "spend_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cards"."benefit_types" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "benefit_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cards"."credit_cards" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "bank_id" UUID NOT NULL,
    "network_id" UUID NOT NULL,
    "reward_program_id" UUID,
    "tier" "cards"."CardTier" NOT NULL DEFAULT 'STANDARD',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "annual_fee_inr" DECIMAL(12,2),
    "joining_fee_inr" DECIMAL(12,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "effective_from" TIMESTAMP(3),
    "effective_to" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "credit_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cards"."card_fees" (
    "id" UUID NOT NULL,
    "credit_card_id" UUID NOT NULL,
    "fee_type" "cards"."CardFeeType" NOT NULL,
    "amount_inr" DECIMAL(12,2) NOT NULL,
    "waiver_conditions" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "effective_from" TIMESTAMP(3),
    "effective_to" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "card_fees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cards"."card_benefits" (
    "id" UUID NOT NULL,
    "credit_card_id" UUID NOT NULL,
    "benefit_type_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "effective_from" TIMESTAMP(3),
    "effective_to" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "card_benefits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cards"."card_eligibility" (
    "id" UUID NOT NULL,
    "credit_card_id" UUID NOT NULL,
    "criteria" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "effective_from" TIMESTAMP(3),
    "effective_to" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "card_eligibility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cards"."card_category_exclusions" (
    "id" UUID NOT NULL,
    "credit_card_id" UUID NOT NULL,
    "spend_category_id" UUID NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "effective_from" TIMESTAMP(3),
    "effective_to" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "card_category_exclusions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "card_networks_code_key" ON "cards"."card_networks"("code");
CREATE UNIQUE INDEX "card_networks_slug_key" ON "cards"."card_networks"("slug");
CREATE UNIQUE INDEX "banks_slug_key" ON "cards"."banks"("slug");
CREATE UNIQUE INDEX "reward_programs_slug_key" ON "cards"."reward_programs"("slug");
CREATE INDEX "reward_programs_issuer_bank_id_idx" ON "cards"."reward_programs"("issuer_bank_id");
CREATE UNIQUE INDEX "spend_categories_code_key" ON "cards"."spend_categories"("code");
CREATE UNIQUE INDEX "spend_categories_slug_key" ON "cards"."spend_categories"("slug");
CREATE UNIQUE INDEX "benefit_types_code_key" ON "cards"."benefit_types"("code");
CREATE UNIQUE INDEX "benefit_types_slug_key" ON "cards"."benefit_types"("slug");
CREATE UNIQUE INDEX "credit_cards_slug_key" ON "cards"."credit_cards"("slug");
CREATE INDEX "credit_cards_bank_id_idx" ON "cards"."credit_cards"("bank_id");
CREATE INDEX "credit_cards_network_id_idx" ON "cards"."credit_cards"("network_id");
CREATE INDEX "credit_cards_active_idx" ON "cards"."credit_cards"("active");
CREATE INDEX "credit_cards_deleted_at_idx" ON "cards"."credit_cards"("deleted_at");
CREATE INDEX "card_fees_credit_card_id_idx" ON "cards"."card_fees"("credit_card_id");
CREATE INDEX "card_fees_deleted_at_idx" ON "cards"."card_fees"("deleted_at");
CREATE INDEX "card_benefits_credit_card_id_idx" ON "cards"."card_benefits"("credit_card_id");
CREATE INDEX "card_benefits_benefit_type_id_idx" ON "cards"."card_benefits"("benefit_type_id");
CREATE INDEX "card_benefits_deleted_at_idx" ON "cards"."card_benefits"("deleted_at");
CREATE INDEX "card_eligibility_credit_card_id_idx" ON "cards"."card_eligibility"("credit_card_id");
CREATE INDEX "card_eligibility_deleted_at_idx" ON "cards"."card_eligibility"("deleted_at");
CREATE INDEX "card_category_exclusions_credit_card_id_idx" ON "cards"."card_category_exclusions"("credit_card_id");
CREATE INDEX "card_category_exclusions_spend_category_id_idx" ON "cards"."card_category_exclusions"("spend_category_id");
CREATE INDEX "card_category_exclusions_deleted_at_idx" ON "cards"."card_category_exclusions"("deleted_at");
CREATE UNIQUE INDEX "card_category_exclusions_credit_card_id_spend_category_id_key" ON "cards"."card_category_exclusions"("credit_card_id", "spend_category_id");

-- AddForeignKey
ALTER TABLE "cards"."reward_programs" ADD CONSTRAINT "reward_programs_issuer_bank_id_fkey" FOREIGN KEY ("issuer_bank_id") REFERENCES "cards"."banks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cards"."credit_cards" ADD CONSTRAINT "credit_cards_bank_id_fkey" FOREIGN KEY ("bank_id") REFERENCES "cards"."banks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cards"."credit_cards" ADD CONSTRAINT "credit_cards_network_id_fkey" FOREIGN KEY ("network_id") REFERENCES "cards"."card_networks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cards"."credit_cards" ADD CONSTRAINT "credit_cards_reward_program_id_fkey" FOREIGN KEY ("reward_program_id") REFERENCES "cards"."reward_programs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cards"."card_fees" ADD CONSTRAINT "card_fees_credit_card_id_fkey" FOREIGN KEY ("credit_card_id") REFERENCES "cards"."credit_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cards"."card_benefits" ADD CONSTRAINT "card_benefits_credit_card_id_fkey" FOREIGN KEY ("credit_card_id") REFERENCES "cards"."credit_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cards"."card_benefits" ADD CONSTRAINT "card_benefits_benefit_type_id_fkey" FOREIGN KEY ("benefit_type_id") REFERENCES "cards"."benefit_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cards"."card_eligibility" ADD CONSTRAINT "card_eligibility_credit_card_id_fkey" FOREIGN KEY ("credit_card_id") REFERENCES "cards"."credit_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cards"."card_category_exclusions" ADD CONSTRAINT "card_category_exclusions_credit_card_id_fkey" FOREIGN KEY ("credit_card_id") REFERENCES "cards"."credit_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cards"."card_category_exclusions" ADD CONSTRAINT "card_category_exclusions_spend_category_id_fkey" FOREIGN KEY ("spend_category_id") REFERENCES "cards"."spend_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
