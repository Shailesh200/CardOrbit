-- AlterEnum
ALTER TYPE "public"."TransactionSource" ADD VALUE IF NOT EXISTS 'GMAIL_SYNC';

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "public"."MailSyncMailboxStatus" AS ENUM ('ACTIVE', 'NEEDS_REAUTH', 'DISCONNECTED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "public"."mail_sync_mailboxes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "google_sub" TEXT NOT NULL,
    "encrypted_refresh_token" TEXT NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "status" "public"."MailSyncMailboxStatus" NOT NULL DEFAULT 'ACTIVE',
    "last_sync_at" TIMESTAMP(3),
    "last_sync_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mail_sync_mailboxes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "mail_sync_mailboxes_google_sub_key" ON "public"."mail_sync_mailboxes"("google_sub");

CREATE UNIQUE INDEX IF NOT EXISTS "mail_sync_mailboxes_user_id_email_key" ON "public"."mail_sync_mailboxes"("user_id", "email");

CREATE INDEX IF NOT EXISTS "mail_sync_mailboxes_user_id_status_idx" ON "public"."mail_sync_mailboxes"("user_id", "status");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "public"."mail_sync_mailboxes"
    ADD CONSTRAINT "mail_sync_mailboxes_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
