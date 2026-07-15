-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "merchants";

-- CreateEnum
CREATE TYPE "merchants"."MerchantOfferRefStatus" AS ENUM ('ACTIVE', 'HISTORICAL');

-- CreateTable
CREATE TABLE "merchants"."merchant_categories" (
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

    CONSTRAINT "merchant_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchants"."merchants" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "primary_category_id" UUID,
    "payment_methods" JSONB NOT NULL DEFAULT '["CARD"]',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "merchants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchants"."merchant_aliases" (
    "id" UUID NOT NULL,
    "merchant_id" UUID NOT NULL,
    "alias" TEXT NOT NULL,
    "normalized_alias" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "merchant_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchants"."mcc_mappings" (
    "id" UUID NOT NULL,
    "mcc_code" TEXT NOT NULL,
    "category_id" UUID NOT NULL,
    "merchant_id" UUID,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "mcc_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchants"."merchant_offer_refs" (
    "id" UUID NOT NULL,
    "merchant_id" UUID NOT NULL,
    "external_key" TEXT NOT NULL,
    "status" "merchants"."MerchantOfferRefStatus" NOT NULL DEFAULT 'ACTIVE',
    "valid_from" TIMESTAMP(3),
    "valid_to" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "merchant_offer_refs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "merchant_categories_code_key" ON "merchants"."merchant_categories"("code");
CREATE UNIQUE INDEX "merchant_categories_slug_key" ON "merchants"."merchant_categories"("slug");
CREATE UNIQUE INDEX "merchants_slug_key" ON "merchants"."merchants"("slug");
CREATE INDEX "merchants_primary_category_id_idx" ON "merchants"."merchants"("primary_category_id");
CREATE INDEX "merchants_active_idx" ON "merchants"."merchants"("active");
CREATE INDEX "merchants_deleted_at_idx" ON "merchants"."merchants"("deleted_at");
CREATE INDEX "merchant_aliases_normalized_alias_idx" ON "merchants"."merchant_aliases"("normalized_alias");
CREATE INDEX "merchant_aliases_merchant_id_idx" ON "merchants"."merchant_aliases"("merchant_id");
CREATE INDEX "merchant_aliases_deleted_at_idx" ON "merchants"."merchant_aliases"("deleted_at");
CREATE UNIQUE INDEX "merchant_aliases_merchant_id_normalized_alias_key" ON "merchants"."merchant_aliases"("merchant_id", "normalized_alias");
CREATE INDEX "mcc_mappings_mcc_code_idx" ON "merchants"."mcc_mappings"("mcc_code");
CREATE INDEX "mcc_mappings_category_id_idx" ON "merchants"."mcc_mappings"("category_id");
CREATE INDEX "mcc_mappings_merchant_id_idx" ON "merchants"."mcc_mappings"("merchant_id");
CREATE INDEX "mcc_mappings_deleted_at_idx" ON "merchants"."mcc_mappings"("deleted_at");
-- Partial uniques: Postgres UNIQUE (col, NULL) does not enforce one global row per MCC
CREATE UNIQUE INDEX "mcc_mappings_global_mcc_code_key" ON "merchants"."mcc_mappings"("mcc_code")
  WHERE "merchant_id" IS NULL;
CREATE UNIQUE INDEX "mcc_mappings_merchant_mcc_code_key" ON "merchants"."mcc_mappings"("mcc_code", "merchant_id")
  WHERE "merchant_id" IS NOT NULL;
CREATE INDEX "merchant_offer_refs_merchant_id_idx" ON "merchants"."merchant_offer_refs"("merchant_id");
CREATE INDEX "merchant_offer_refs_status_idx" ON "merchants"."merchant_offer_refs"("status");
CREATE INDEX "merchant_offer_refs_deleted_at_idx" ON "merchants"."merchant_offer_refs"("deleted_at");
CREATE UNIQUE INDEX "merchant_offer_refs_merchant_id_external_key_key" ON "merchants"."merchant_offer_refs"("merchant_id", "external_key");

-- Full-text search on merchant names (simple config for Indian brand names)
CREATE INDEX "merchants_name_fts_idx" ON "merchants"."merchants"
  USING GIN (to_tsvector('simple', coalesce("name", '') || ' ' || coalesce("slug", '')));

-- AddForeignKey
ALTER TABLE "merchants"."merchants" ADD CONSTRAINT "merchants_primary_category_id_fkey" FOREIGN KEY ("primary_category_id") REFERENCES "merchants"."merchant_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "merchants"."merchant_aliases" ADD CONSTRAINT "merchant_aliases_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"."merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "merchants"."mcc_mappings" ADD CONSTRAINT "mcc_mappings_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "merchants"."merchant_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "merchants"."mcc_mappings" ADD CONSTRAINT "mcc_mappings_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"."merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "merchants"."merchant_offer_refs" ADD CONSTRAINT "merchant_offer_refs_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"."merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
