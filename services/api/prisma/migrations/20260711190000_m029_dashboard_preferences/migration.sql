-- M-029: Personalized dashboard widget preferences
ALTER TABLE "public"."users"
ADD COLUMN IF NOT EXISTS "dashboard_preferences" JSONB NOT NULL DEFAULT '{}';
