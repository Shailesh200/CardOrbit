-- AI-001: AI platform foundation — run logging + prompt registry

CREATE TYPE "admin"."AiRunStatus" AS ENUM ('SUCCESS', 'FAILURE');

CREATE TABLE "admin"."ai_runs" (
    "id" UUID NOT NULL,
    "feature" TEXT NOT NULL,
    "prompt_version" TEXT,
    "model" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "tier" TEXT,
    "input_tokens" INTEGER,
    "output_tokens" INTEGER,
    "total_tokens" INTEGER,
    "latency_ms" INTEGER NOT NULL,
    "status" "admin"."AiRunStatus" NOT NULL,
    "error_code" TEXT,
    "error_message" TEXT,
    "metadata" JSONB,
    "triggered_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_runs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "admin"."ai_prompt_versions" (
    "id" UUID NOT NULL,
    "feature" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "system_prompt" TEXT NOT NULL,
    "user_template" TEXT,
    "model_tier" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_prompt_versions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_runs_feature_created_at_idx" ON "admin"."ai_runs"("feature", "created_at" DESC);
CREATE INDEX "ai_runs_status_idx" ON "admin"."ai_runs"("status");
CREATE INDEX "ai_runs_created_at_idx" ON "admin"."ai_runs"("created_at" DESC);

CREATE UNIQUE INDEX "ai_prompt_versions_feature_version_key" ON "admin"."ai_prompt_versions"("feature", "version");
CREATE INDEX "ai_prompt_versions_feature_is_active_idx" ON "admin"."ai_prompt_versions"("feature", "is_active");
