-- CreateEnum
CREATE TYPE "public"."OnboardingStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "public"."OnboardingStep" AS ENUM ('WELCOME', 'SPENDING', 'CATEGORIES', 'CARDS', 'DONE');

-- AlterTable
ALTER TABLE "public"."users"
ADD COLUMN "onboarding_status" "public"."OnboardingStatus" NOT NULL DEFAULT 'NOT_STARTED',
ADD COLUMN "onboarding_step" "public"."OnboardingStep" NOT NULL DEFAULT 'WELCOME',
ADD COLUMN "onboarding_answers" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN "onboarding_completed_at" TIMESTAMP(3),
ADD COLUMN "personalization_profile" JSONB NOT NULL DEFAULT '{}';
