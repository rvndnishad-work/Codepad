-- AI screening invites: expiry, reminders and email delivery status.
ALTER TABLE "AIInterviewSession" ADD COLUMN "expiresAt" TIMESTAMP(3);
ALTER TABLE "AIInterviewSession" ADD COLUMN "inviteSentAt" TIMESTAMP(3);
ALTER TABLE "AIInterviewSession" ADD COLUMN "inviteEmailStatus" TEXT;
ALTER TABLE "AIInterviewSession" ADD COLUMN "inviteEmailError" TEXT;
ALTER TABLE "AIInterviewSession" ADD COLUMN "reminderSentAt" TIMESTAMP(3);

ALTER TABLE "AIScreeningBatch" ADD COLUMN "expiresAfterDays" INTEGER;
ALTER TABLE "AIScreeningBatch" ADD COLUMN "reminderAfterDays" INTEGER;

-- The expiry sweep looks up unstarted invites by expiry time.
CREATE INDEX "AIInterviewSession_status_expiresAt_idx" ON "AIInterviewSession"("status", "expiresAt");
