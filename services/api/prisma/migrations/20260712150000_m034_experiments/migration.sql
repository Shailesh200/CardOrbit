-- M-034: Experimentation platform (A/B variant assignment)

CREATE TABLE "public"."experiment_definitions" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "variants" JSONB NOT NULL,
    "default_variant" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "rollout_percentage" INTEGER NOT NULL DEFAULT 0,
    "updated_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "experiment_definitions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "experiment_definitions_key_key" ON "public"."experiment_definitions"("key");
