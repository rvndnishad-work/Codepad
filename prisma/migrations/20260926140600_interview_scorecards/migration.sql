-- Structured scorecards per interviewer, and a pass mark per live interview
ALTER TABLE "InterviewSession" ADD COLUMN "scorecardPassMark" DOUBLE PRECISION;
ALTER TABLE "InterviewSession" ADD COLUMN "scorecardNudgedAt" TIMESTAMP(3);

CREATE TABLE "InterviewScorecard" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "reviewerKey" TEXT NOT NULL,
    "userId" TEXT,
    "guestId" TEXT,
    "reviewerName" TEXT NOT NULL,
    "criteriaJson" TEXT NOT NULL,
    "ratingsJson" TEXT NOT NULL DEFAULT '{}',
    "notes" TEXT,
    "recommendation" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewScorecard_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InterviewScorecard_sessionId_reviewerKey_key" ON "InterviewScorecard"("sessionId", "reviewerKey");
CREATE INDEX "InterviewScorecard_sessionId_status_idx" ON "InterviewScorecard"("sessionId", "status");

ALTER TABLE "InterviewScorecard" ADD CONSTRAINT "InterviewScorecard_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "InterviewSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "InterviewScorecardEdit" (
    "id" TEXT NOT NULL,
    "scorecardId" TEXT NOT NULL,
    "actorKey" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "beforeJson" TEXT NOT NULL,
    "afterJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterviewScorecardEdit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InterviewScorecardEdit_scorecardId_createdAt_idx" ON "InterviewScorecardEdit"("scorecardId", "createdAt");

ALTER TABLE "InterviewScorecardEdit" ADD CONSTRAINT "InterviewScorecardEdit_scorecardId_fkey" FOREIGN KEY ("scorecardId") REFERENCES "InterviewScorecard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
