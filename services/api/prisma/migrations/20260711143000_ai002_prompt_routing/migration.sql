-- AI-002: per-task model override on prompt versions

ALTER TABLE "admin"."ai_prompt_versions" ADD COLUMN "model_override" TEXT;
