-- M-041: Credit card statements and bill payments

CREATE TYPE "public"."StatementStatus" AS ENUM ('OPEN', 'PAID', 'OVERDUE', 'PARTIAL');
CREATE TYPE "public"."StatementSource" AS ENUM ('MANUAL');
CREATE TYPE "public"."BillPaymentStatus" AS ENUM ('COMPLETED', 'PROCESSING', 'FAILED');

CREATE TABLE "public"."credit_card_statements" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "user_card_id" TEXT NOT NULL,
  "period_start" TIMESTAMP(3) NOT NULL,
  "period_end" TIMESTAMP(3) NOT NULL,
  "statement_date" TIMESTAMP(3) NOT NULL,
  "due_date" TIMESTAMP(3) NOT NULL,
  "total_amount_inr" DECIMAL(12, 2) NOT NULL,
  "minimum_due_inr" DECIMAL(12, 2) NOT NULL,
  "previous_balance_inr" DECIMAL(12, 2),
  "credits_inr" DECIMAL(12, 2),
  "payments_inr" DECIMAL(12, 2),
  "status" "public"."StatementStatus" NOT NULL DEFAULT 'OPEN',
  "source" "public"."StatementSource" NOT NULL DEFAULT 'MANUAL',
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "credit_card_statements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."bill_payments" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "statement_id" TEXT NOT NULL,
  "amount_inr" DECIMAL(12, 2) NOT NULL,
  "paid_at" TIMESTAMP(3) NOT NULL,
  "status" "public"."BillPaymentStatus" NOT NULL DEFAULT 'COMPLETED',
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "bill_payments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "credit_card_statements_user_id_user_card_id_period_start_key"
  ON "public"."credit_card_statements"("user_id", "user_card_id", "period_start");

CREATE INDEX "credit_card_statements_user_id_due_date_idx"
  ON "public"."credit_card_statements"("user_id", "due_date" ASC);

CREATE INDEX "credit_card_statements_user_id_statement_date_idx"
  ON "public"."credit_card_statements"("user_id", "statement_date" DESC);

CREATE INDEX "bill_payments_user_id_paid_at_idx"
  ON "public"."bill_payments"("user_id", "paid_at" DESC);

CREATE INDEX "bill_payments_statement_id_paid_at_idx"
  ON "public"."bill_payments"("statement_id", "paid_at" DESC);

ALTER TABLE "public"."credit_card_statements"
  ADD CONSTRAINT "credit_card_statements_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."credit_card_statements"
  ADD CONSTRAINT "credit_card_statements_user_card_id_fkey"
  FOREIGN KEY ("user_card_id") REFERENCES "cards"."user_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."bill_payments"
  ADD CONSTRAINT "bill_payments_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."bill_payments"
  ADD CONSTRAINT "bill_payments_statement_id_fkey"
  FOREIGN KEY ("statement_id") REFERENCES "public"."credit_card_statements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
