-- Take-home pass mark and automatic reminder schedule, per session.
-- Existing take-homes keep today's behaviour: the default pass mark (60) and a
-- last-call reminder 24 hours before the deadline.
ALTER TABLE "InterviewSession" ADD COLUMN "takeHomePassMark" INTEGER;
ALTER TABLE "InterviewSession" ADD COLUMN "reminderStartAfterHours" INTEGER;
ALTER TABLE "InterviewSession" ADD COLUMN "reminderBeforeDeadlineHours" INTEGER DEFAULT 24;
ALTER TABLE "InterviewSession" ADD COLUMN "remindersOff" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "InterviewSession" ADD COLUMN "startReminderSentAt" TIMESTAMP(3);
