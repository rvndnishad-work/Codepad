-- AI screening report: stored test results per round, and revocable read-only share links
ALTER TABLE "AIInterviewRound" ADD COLUMN "testResultsJson" TEXT;
ALTER TABLE "AIInterviewRound" ADD COLUMN "testsRunAt" TIMESTAMP(3);

CREATE TABLE "AIReportShareLink" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "lastViewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIReportShareLink_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AIReportShareLink_sessionId_idx" ON "AIReportShareLink"("sessionId");
CREATE INDEX "AIReportShareLink_workspaceId_idx" ON "AIReportShareLink"("workspaceId");

ALTER TABLE "AIReportShareLink" ADD CONSTRAINT "AIReportShareLink_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AIInterviewSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
