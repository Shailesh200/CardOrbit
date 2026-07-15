-- CreateEnum
CREATE TYPE "cards"."UserCardStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'REMOVED');

-- CreateTable
CREATE TABLE "cards"."user_cards" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "credit_card_id" UUID NOT NULL,
    "nickname" TEXT,
    "is_favorite" BOOLEAN NOT NULL DEFAULT false,
    "status" "cards"."UserCardStatus" NOT NULL DEFAULT 'ACTIVE',
    "statement_day" INTEGER,
    "due_day" INTEGER,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_cards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_cards_user_id_status_idx" ON "cards"."user_cards"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "user_cards_user_id_credit_card_id_key" ON "cards"."user_cards"("user_id", "credit_card_id");

-- AddForeignKey
ALTER TABLE "cards"."user_cards" ADD CONSTRAINT "user_cards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cards"."user_cards" ADD CONSTRAINT "user_cards_credit_card_id_fkey" FOREIGN KEY ("credit_card_id") REFERENCES "cards"."credit_cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
