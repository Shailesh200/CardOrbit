-- M-036: Reward expiry intelligence — notification type + dedupe key
ALTER TYPE "public"."NotificationType" ADD VALUE 'REWARD_EXPIRY';

ALTER TABLE "public"."notifications" ADD COLUMN "dedupe_key" TEXT;

CREATE UNIQUE INDEX "notifications_user_id_dedupe_key_key"
  ON "public"."notifications"("user_id", "dedupe_key")
  WHERE "dedupe_key" IS NOT NULL;
