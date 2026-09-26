-- Workspace interview room: relay channels, live presence, round on stage
ALTER TABLE "InterviewSession" ADD COLUMN "roomRound" TEXT;
ALTER TABLE "InterviewSession" ADD COLUMN "meetingUrl" TEXT;

ALTER TABLE "InterviewToolUpdate" ADD COLUMN "channel" TEXT NOT NULL DEFAULT 'tools';
DROP INDEX "InterviewToolUpdate_sessionId_id_idx";
CREATE INDEX "InterviewToolUpdate_sessionId_channel_id_idx" ON "InterviewToolUpdate"("sessionId", "channel", "id");

CREATE TABLE "InterviewPresence" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'tools',
    "clientId" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "place" TEXT NOT NULL DEFAULT 'room',
    "awareness" BYTEA,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterviewPresence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InterviewPresence_sessionId_channel_clientId_key" ON "InterviewPresence"("sessionId", "channel", "clientId");
CREATE INDEX "InterviewPresence_sessionId_channel_lastSeenAt_idx" ON "InterviewPresence"("sessionId", "channel", "lastSeenAt");

ALTER TABLE "InterviewPresence" ADD CONSTRAINT "InterviewPresence_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "InterviewSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
