-- Assistant conversation persistence (user-level chat history)

CREATE TABLE "public"."assistant_conversations" (
    "id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assistant_conversations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."assistant_chat_messages" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assistant_chat_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "assistant_conversations_user_id_updated_at_idx"
    ON "public"."assistant_conversations"("user_id", "updated_at" DESC);

CREATE INDEX "assistant_chat_messages_conversation_id_created_at_idx"
    ON "public"."assistant_chat_messages"("conversation_id", "created_at");

ALTER TABLE "public"."assistant_conversations"
    ADD CONSTRAINT "assistant_conversations_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."assistant_chat_messages"
    ADD CONSTRAINT "assistant_chat_messages_conversation_id_fkey"
    FOREIGN KEY ("conversation_id") REFERENCES "public"."assistant_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
