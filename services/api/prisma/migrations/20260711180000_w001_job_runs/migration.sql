-- W-001: Generic background job runs

CREATE TYPE "admin"."JobRunStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

CREATE TABLE "admin"."job_runs" (
    "id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "status" "admin"."JobRunStatus" NOT NULL DEFAULT 'QUEUED',
    "payload" JSONB NOT NULL,
    "progress" JSONB,
    "result" JSONB,
    "error_code" TEXT,
    "error_message" TEXT,
    "bull_job_id" TEXT,
    "triggered_by" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "job_runs_type_created_at_idx" ON "admin"."job_runs"("type", "created_at" DESC);
CREATE INDEX "job_runs_status_idx" ON "admin"."job_runs"("status");
