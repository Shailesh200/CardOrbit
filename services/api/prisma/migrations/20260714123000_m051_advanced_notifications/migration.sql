-- M-051: Advanced contextual notification types
ALTER TYPE "public"."NotificationType" ADD VALUE 'MILESTONE_PROGRESS';
ALTER TYPE "public"."NotificationType" ADD VALUE 'BILL_DUE';
ALTER TYPE "public"."NotificationType" ADD VALUE 'OFFER_MATCH';
ALTER TYPE "public"."NotificationType" ADD VALUE 'TRAVEL_TIP';
ALTER TYPE "public"."NotificationType" ADD VALUE 'PURCHASE_TIMING';
