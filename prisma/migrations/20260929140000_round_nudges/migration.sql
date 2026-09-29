-- Interview rounds phase 7: remember which nudge a round last sent
-- ("next_step" or "next_round") so each one goes out once.
ALTER TABLE "CandidateRound" ADD COLUMN "nudgedFor" TEXT;
ALTER TABLE "CandidateRound" ADD COLUMN "nudgedAt" TIMESTAMP(3);
