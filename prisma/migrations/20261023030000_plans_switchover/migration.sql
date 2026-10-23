-- Move to the new plans: per-workspace stamps for the 30-day notice and for
-- ending a Stripe subscription at its period end. Both start empty.

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN "switchoverNoticeAt" TIMESTAMP(3),
ADD COLUMN "switchoverCancelAt" TIMESTAMP(3);
