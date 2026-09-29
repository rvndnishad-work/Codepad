-- CreateTable
CREATE TABLE "AIInterviewAudio" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "question" INTEGER NOT NULL,
    "followUp" INTEGER NOT NULL DEFAULT 0,
    "seq" INTEGER NOT NULL DEFAULT 0,
    "mime" TEXT NOT NULL,
    "bytes" BYTEA NOT NULL,
    "seconds" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIInterviewAudio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AIInterviewAudio_roundId_question_idx" ON "AIInterviewAudio"("roundId", "question");

-- CreateIndex
CREATE INDEX "AIInterviewAudio_sessionId_idx" ON "AIInterviewAudio"("sessionId");

-- AddForeignKey
ALTER TABLE "AIInterviewAudio" ADD CONSTRAINT "AIInterviewAudio_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AIInterviewSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
