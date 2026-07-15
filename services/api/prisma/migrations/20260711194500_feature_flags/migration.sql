-- Feature flag definitions for API-managed rollout
CREATE TABLE "public"."feature_flag_definitions" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "rollout_percentage" INTEGER NOT NULL DEFAULT 0,
    "updated_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flag_definitions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "feature_flag_definitions_key_key" ON "public"."feature_flag_definitions"("key");
