-- M-028 catalog ingestion: source URLs + admin review staging

ALTER TABLE "cards"."banks" ADD COLUMN "source_url" TEXT;
ALTER TABLE "cards"."credit_cards" ADD COLUMN "source_url" TEXT;
ALTER TABLE "cards"."card_benefits" ADD COLUMN "source_url" TEXT;
ALTER TABLE "merchants"."merchants" ADD COLUMN "source_url" TEXT;
ALTER TABLE "rewards"."reward_rule_versions" ADD COLUMN "source_url" TEXT;

CREATE TYPE "admin"."CatalogImportEntityType" AS ENUM ('CARD_BUNDLE', 'MERCHANT_UPSERT', 'MERCHANT_REMOVE');
CREATE TYPE "admin"."CatalogImportReviewStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'PUBLISHED');

CREATE TABLE "admin"."catalog_import_batches" (
    "id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "catalog_import_batches_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "admin"."catalog_import_items" (
    "id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "entity_type" "admin"."CatalogImportEntityType" NOT NULL,
    "entity_key" TEXT NOT NULL,
    "source_url" TEXT,
    "payload" JSONB NOT NULL,
    "summary" TEXT,
    "review_status" "admin"."CatalogImportReviewStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "reviewed_by_admin_id" UUID,
    "reviewed_at" TIMESTAMP(3),
    "review_notes" TEXT,
    "published_at" TIMESTAMP(3),
    "published_entity_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_import_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "catalog_import_batches_created_at_idx" ON "admin"."catalog_import_batches"("created_at" DESC);
CREATE INDEX "catalog_import_items_review_status_idx" ON "admin"."catalog_import_items"("review_status");
CREATE INDEX "catalog_import_items_entity_type_idx" ON "admin"."catalog_import_items"("entity_type");
CREATE INDEX "catalog_import_items_entity_key_idx" ON "admin"."catalog_import_items"("entity_key");
CREATE UNIQUE INDEX "catalog_import_items_batch_id_entity_type_entity_key_key" ON "admin"."catalog_import_items"("batch_id", "entity_type", "entity_key");

ALTER TABLE "admin"."catalog_import_items" ADD CONSTRAINT "catalog_import_items_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "admin"."catalog_import_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "admin"."catalog_import_items" ADD CONSTRAINT "catalog_import_items_reviewed_by_admin_id_fkey" FOREIGN KEY ("reviewed_by_admin_id") REFERENCES "admin"."admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
