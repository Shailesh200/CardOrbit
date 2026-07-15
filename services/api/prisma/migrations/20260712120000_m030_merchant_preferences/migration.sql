-- M-030 Saved searches & favorite merchants

CREATE TABLE "public"."favorite_merchants" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "merchant_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorite_merchants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."saved_searches" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "query" TEXT NOT NULL DEFAULT '',
    "category_slug" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_searches_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "favorite_merchants_user_id_merchant_id_key"
    ON "public"."favorite_merchants"("user_id", "merchant_id");

CREATE INDEX "favorite_merchants_user_id_created_at_idx"
    ON "public"."favorite_merchants"("user_id", "created_at" DESC);

CREATE UNIQUE INDEX "saved_searches_user_id_name_key"
    ON "public"."saved_searches"("user_id", "name");

CREATE INDEX "saved_searches_user_id_updated_at_idx"
    ON "public"."saved_searches"("user_id", "updated_at" DESC);

ALTER TABLE "public"."favorite_merchants"
    ADD CONSTRAINT "favorite_merchants_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."favorite_merchants"
    ADD CONSTRAINT "favorite_merchants_merchant_id_fkey"
    FOREIGN KEY ("merchant_id") REFERENCES "merchants"."merchants"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."saved_searches"
    ADD CONSTRAINT "saved_searches_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
