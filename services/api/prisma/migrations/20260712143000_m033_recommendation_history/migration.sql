-- M-033: Recommendation history and user feedback

CREATE TYPE "public"."RecommendationFeedbackType" AS ENUM (
  'USEFUL',
  'NOT_USEFUL',
  'WRONG_RECOMMENDATION',
  'MISSING_CARD',
  'INCORRECT_REWARD'
);

CREATE TYPE "public"."RecommendationSource" AS ENUM ('WEB', 'EXTENSION', 'DASHBOARD');

CREATE TABLE "public"."recommendation_history" (
  "id" UUID NOT NULL,
  "user_id" TEXT NOT NULL,
  "amount_inr" DECIMAL(12, 2) NOT NULL,
  "merchant_id" UUID,
  "merchant_slug" TEXT,
  "merchant_name" TEXT,
  "category_slug" TEXT,
  "recommended_user_card_id" TEXT,
  "recommended_credit_card_id" UUID,
  "recommended_card_name" TEXT,
  "expected_reward_inr" DECIMAL(12, 2),
  "effective_rate_percent" DECIMAL(6, 3),
  "confidence_score" DECIMAL(5, 4),
  "ranking_version" TEXT NOT NULL,
  "explanation_source" TEXT NOT NULL,
  "explanation" TEXT,
  "alternatives" JSONB NOT NULL DEFAULT '[]',
  "cards_evaluated" INTEGER NOT NULL,
  "source" "public"."RecommendationSource" NOT NULL DEFAULT 'WEB',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "recommendation_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."recommendation_feedback" (
  "id" TEXT NOT NULL,
  "recommendation_id" UUID NOT NULL,
  "user_id" TEXT NOT NULL,
  "type" "public"."RecommendationFeedbackType" NOT NULL,
  "comment" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "recommendation_feedback_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "recommendation_feedback_recommendation_id_key"
  ON "public"."recommendation_feedback"("recommendation_id");

CREATE INDEX "recommendation_history_user_id_created_at_idx"
  ON "public"."recommendation_history"("user_id", "created_at" DESC);

CREATE INDEX "recommendation_feedback_user_id_created_at_idx"
  ON "public"."recommendation_feedback"("user_id", "created_at" DESC);

ALTER TABLE "public"."recommendation_history"
  ADD CONSTRAINT "recommendation_history_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."recommendation_feedback"
  ADD CONSTRAINT "recommendation_feedback_recommendation_id_fkey"
  FOREIGN KEY ("recommendation_id") REFERENCES "public"."recommendation_history"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."recommendation_feedback"
  ADD CONSTRAINT "recommendation_feedback_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
