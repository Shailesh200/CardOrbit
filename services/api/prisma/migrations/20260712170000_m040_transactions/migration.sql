-- M-040: Transaction tracking and CSV import

CREATE TYPE "public"."TransactionStatus" AS ENUM ('POSTED', 'PENDING', 'FAILED', 'REFUND');
CREATE TYPE "public"."TransactionSource" AS ENUM ('MANUAL', 'CSV_IMPORT');

CREATE TABLE "public"."transactions" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "user_card_id" TEXT NOT NULL,
  "amount_inr" DECIMAL(12, 2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "merchant_name" TEXT NOT NULL,
  "merchant_id" UUID,
  "merchant_slug" TEXT,
  "category_slug" TEXT NOT NULL,
  "status" "public"."TransactionStatus" NOT NULL DEFAULT 'POSTED',
  "source" "public"."TransactionSource" NOT NULL DEFAULT 'MANUAL',
  "external_ref" TEXT,
  "notes" TEXT,
  "tags" JSONB NOT NULL DEFAULT '[]',
  "transacted_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "transactions_user_id_external_ref_key"
  ON "public"."transactions"("user_id", "external_ref");

CREATE INDEX "transactions_user_id_transacted_at_idx"
  ON "public"."transactions"("user_id", "transacted_at" DESC);

CREATE INDEX "transactions_user_id_user_card_id_idx"
  ON "public"."transactions"("user_id", "user_card_id");

CREATE INDEX "transactions_user_id_category_slug_idx"
  ON "public"."transactions"("user_id", "category_slug");

CREATE INDEX "transactions_user_id_status_idx"
  ON "public"."transactions"("user_id", "status");

ALTER TABLE "public"."transactions"
  ADD CONSTRAINT "transactions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."transactions"
  ADD CONSTRAINT "transactions_user_card_id_fkey"
  FOREIGN KEY ("user_card_id") REFERENCES "cards"."user_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
