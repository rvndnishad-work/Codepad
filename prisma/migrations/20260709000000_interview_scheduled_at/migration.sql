-- Planned meeting time for interview sessions (IP-90). Distinct from
-- startedAt/finishedAt which record actual run times.
ALTER TABLE "InterviewSession" ADD COLUMN "scheduledAt" TIMESTAMP(3);
