-- AlterTable
ALTER TABLE "InterviewSession" ADD COLUMN     "proctorSecret" TEXT,
ADD COLUMN     "proctorToken" TEXT;

-- CreateTable
CREATE TABLE "ProctorAgentReport" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "lastSeq" INTEGER NOT NULL DEFAULT 0,
    "suspicionScore" INTEGER NOT NULL DEFAULT 0,
    "peakSuspicion" INTEGER NOT NULL DEFAULT 0,
    "scannedWindows" INTEGER NOT NULL DEFAULT 0,
    "signalsData" TEXT NOT NULL DEFAULT '[]',
    "reportCount" INTEGER NOT NULL DEFAULT 0,
    "agentVersion" TEXT,
    "agentConnected" BOOLEAN NOT NULL DEFAULT true,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProctorAgentReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProctorAgentReport_sessionId_key" ON "ProctorAgentReport"("sessionId");

-- CreateIndex
CREATE INDEX "ProctorAgentReport_sessionId_idx" ON "ProctorAgentReport"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewSession_proctorToken_key" ON "InterviewSession"("proctorToken");

-- AddForeignKey
ALTER TABLE "ProctorAgentReport" ADD CONSTRAINT "ProctorAgentReport_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "InterviewSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
