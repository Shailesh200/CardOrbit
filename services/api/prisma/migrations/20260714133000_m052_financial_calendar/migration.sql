-- M-052: Custom calendar reminders for financial calendar
CREATE TABLE "public"."calendar_reminders" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "event_date" TIMESTAMP(3) NOT NULL,
    "reminder_offset_days" INTEGER NOT NULL DEFAULT 0,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_reminders_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "calendar_reminders_user_id_event_date_idx"
  ON "public"."calendar_reminders"("user_id", "event_date");

ALTER TABLE "public"."calendar_reminders"
  ADD CONSTRAINT "calendar_reminders_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
