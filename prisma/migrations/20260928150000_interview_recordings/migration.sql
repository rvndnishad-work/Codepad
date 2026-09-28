-- Recording for live interviews and R2 storage for AI interview audio.

-- AlterTable
ALTER TABLE "InterviewSession" ADD COLUMN "recordVideo" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "AIInterviewAudio" ALTER COLUMN "bytes" DROP NOT NULL,
ADD COLUMN "storageKey" TEXT,
ADD COLUMN "expiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "AIInterviewAudio_expiresAt_idx" ON "AIInterviewAudio"("expiresAt");

-- CreateTable
CREATE TABLE "InterviewRecording" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "interviewSessionId" TEXT NOT NULL,
    "egressId" TEXT,
    "storageKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'recording',
    "mime" TEXT NOT NULL DEFAULT 'video/mp4',
    "sizeBytes" BIGINT,
    "seconds" INTEGER,
    "startedById" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "creditsCharged" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,

    CONSTRAINT "InterviewRecording_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InterviewRecording_egressId_key" ON "InterviewRecording"("egressId");

-- CreateIndex
CREATE INDEX "InterviewRecording_interviewSessionId_idx" ON "InterviewRecording"("interviewSessionId");

-- CreateIndex
CREATE INDEX "InterviewRecording_workspaceId_startedAt_idx" ON "InterviewRecording"("workspaceId", "startedAt");

-- CreateIndex
CREATE INDEX "InterviewRecording_status_expiresAt_idx" ON "InterviewRecording"("status", "expiresAt");

-- AddForeignKey
ALTER TABLE "InterviewRecording" ADD CONSTRAINT "InterviewRecording_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewRecording" ADD CONSTRAINT "InterviewRecording_interviewSessionId_fkey" FOREIGN KEY ("interviewSessionId") REFERENCES "InterviewSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
