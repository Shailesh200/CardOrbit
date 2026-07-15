-- AI-008: pgvector extension + search embedding index metadata

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TYPE "admin"."SearchEmbeddingEntityType" AS ENUM ('CARD', 'MERCHANT');

CREATE TABLE "admin"."search_embeddings" (
    "id" UUID NOT NULL,
    "entity_type" "admin"."SearchEmbeddingEntityType" NOT NULL,
    "entity_id" UUID NOT NULL,
    "model" TEXT NOT NULL,
    "content_hash" TEXT NOT NULL,
    "text_content" TEXT NOT NULL,
    "embedding" vector(768) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "search_embeddings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "search_embeddings_entity_type_entity_id_model_key"
    ON "admin"."search_embeddings"("entity_type", "entity_id", "model");

CREATE INDEX "search_embeddings_entity_type_idx"
    ON "admin"."search_embeddings"("entity_type");

CREATE INDEX "search_embeddings_hnsw_idx"
    ON "admin"."search_embeddings"
    USING hnsw ("embedding" vector_cosine_ops);
