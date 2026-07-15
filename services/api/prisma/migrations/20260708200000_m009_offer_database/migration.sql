-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "offers";

-- CreateEnum
CREATE TYPE "offers"."OfferType" AS ENUM ('MERCHANT', 'BANK', 'CARD');
CREATE TYPE "offers"."OfferStatus" AS ENUM ('ACTIVE', 'SCHEDULED', 'EXPIRED', 'HISTORICAL');

-- CreateTable
CREATE TABLE "offers"."offers" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "offers"."OfferType" NOT NULL,
    "issuer_bank_id" UUID,
    "cashback_percent" DECIMAL(7,4),
    "cap_inr" DECIMAL(12,2),
    "terms_summary" TEXT,
    "terms" JSONB,
    "valid_from" TIMESTAMP(3) NOT NULL,
    "valid_until" TIMESTAMP(3),
    "status" "offers"."OfferStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "offers_valid_window_check" CHECK ("valid_until" IS NULL OR "valid_until" >= "valid_from")
);

-- CreateTable
CREATE TABLE "offers"."offer_card_assignments" (
    "id" UUID NOT NULL,
    "offer_id" UUID NOT NULL,
    "credit_card_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "offer_card_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offers"."offer_merchants" (
    "id" UUID NOT NULL,
    "offer_id" UUID NOT NULL,
    "merchant_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "offer_merchants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "offers_code_key" ON "offers"."offers"("code");
CREATE UNIQUE INDEX "offers_slug_key" ON "offers"."offers"("slug");
CREATE INDEX "offers_issuer_bank_id_idx" ON "offers"."offers"("issuer_bank_id");
CREATE INDEX "offers_type_idx" ON "offers"."offers"("type");
CREATE INDEX "offers_status_idx" ON "offers"."offers"("status");
CREATE INDEX "offers_valid_from_idx" ON "offers"."offers"("valid_from");
CREATE INDEX "offers_valid_until_idx" ON "offers"."offers"("valid_until");
CREATE INDEX "offers_deleted_at_idx" ON "offers"."offers"("deleted_at");
CREATE UNIQUE INDEX "offer_card_assignments_offer_id_credit_card_id_key" ON "offers"."offer_card_assignments"("offer_id", "credit_card_id");
CREATE INDEX "offer_card_assignments_offer_id_idx" ON "offers"."offer_card_assignments"("offer_id");
CREATE INDEX "offer_card_assignments_credit_card_id_idx" ON "offers"."offer_card_assignments"("credit_card_id");
CREATE INDEX "offer_card_assignments_deleted_at_idx" ON "offers"."offer_card_assignments"("deleted_at");
CREATE UNIQUE INDEX "offer_merchants_offer_id_merchant_id_key" ON "offers"."offer_merchants"("offer_id", "merchant_id");
CREATE INDEX "offer_merchants_offer_id_idx" ON "offers"."offer_merchants"("offer_id");
CREATE INDEX "offer_merchants_merchant_id_idx" ON "offers"."offer_merchants"("merchant_id");
CREATE INDEX "offer_merchants_deleted_at_idx" ON "offers"."offer_merchants"("deleted_at");

-- Backlink from M-007 merchant offer refs
ALTER TABLE "merchants"."merchant_offer_refs" ADD COLUMN "offer_id" UUID;
CREATE INDEX "merchant_offer_refs_offer_id_idx" ON "merchants"."merchant_offer_refs"("offer_id");

-- AddForeignKey
ALTER TABLE "offers"."offers" ADD CONSTRAINT "offers_issuer_bank_id_fkey" FOREIGN KEY ("issuer_bank_id") REFERENCES "cards"."banks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "offers"."offer_card_assignments" ADD CONSTRAINT "offer_card_assignments_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"."offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "offers"."offer_card_assignments" ADD CONSTRAINT "offer_card_assignments_credit_card_id_fkey" FOREIGN KEY ("credit_card_id") REFERENCES "cards"."credit_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "offers"."offer_merchants" ADD CONSTRAINT "offer_merchants_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"."offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "offers"."offer_merchants" ADD CONSTRAINT "offer_merchants_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"."merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "merchants"."merchant_offer_refs" ADD CONSTRAINT "merchant_offer_refs_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"."offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
