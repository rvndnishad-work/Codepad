-- Live room toolbox
ALTER TABLE "InterviewSession" ADD COLUMN "toolsJson" TEXT;

CREATE TABLE "InterviewToolUpdate" (
    "id" SERIAL NOT NULL,
    "sessionId" TEXT NOT NULL,
    "update" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterviewToolUpdate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InterviewToolUpdate_sessionId_id_idx" ON "InterviewToolUpdate"("sessionId", "id");

ALTER TABLE "InterviewToolUpdate" ADD CONSTRAINT "InterviewToolUpdate_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "InterviewSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
