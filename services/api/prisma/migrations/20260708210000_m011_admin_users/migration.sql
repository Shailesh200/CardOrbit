-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "admin";

-- CreateEnum
CREATE TYPE "admin"."AdminRole" AS ENUM ('ADMIN');

-- CreateTable
CREATE TABLE "admin"."admin_users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "admin"."AdminRole" NOT NULL DEFAULT 'ADMIN',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin"."admin_users"("email");
CREATE INDEX "admin_users_active_idx" ON "admin"."admin_users"("active");
CREATE INDEX "admin_users_deleted_at_idx" ON "admin"."admin_users"("deleted_at");
