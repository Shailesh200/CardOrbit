-- AlterTable
ALTER TABLE "public"."users"
ADD COLUMN "country" TEXT NOT NULL DEFAULT 'IN',
ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'INR',
ADD COLUMN "avatar_url" TEXT,
ADD COLUMN "notification_preferences" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN "privacy_preferences" JSONB NOT NULL DEFAULT '{}';
