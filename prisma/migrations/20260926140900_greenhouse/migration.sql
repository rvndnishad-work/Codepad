-- Connections catalog and the Greenhouse round trip: job mappings, test requests, sync log, candidate ATS reference
-- AlterTable
ALTER TABLE "Candidate" ADD COLUMN     "atsProfileUrl" TEXT,
ADD COLUMN     "atsRef" TEXT;

-- AlterTable
ALTER TABLE "AtsIntegration" ADD COLUMN     "connectedById" TEXT,
ADD COLUMN     "partnerKeyHash" TEXT;

-- CreateTable
CREATE TABLE "AtsJobMapping" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "jobName" TEXT NOT NULL,
    "jobDetail" TEXT,
    "screeningKind" TEXT NOT NULL DEFAULT 'none',
    "screeningId" TEXT,
    "sendMode" TEXT NOT NULL DEFAULT 'auto',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AtsJobMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AtsTestRequest" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "mappingId" TEXT,
    "candidateId" TEXT NOT NULL,
    "externalCandidateId" TEXT,
    "externalApplicationId" TEXT,
    "jobName" TEXT,
    "callbackUrl" TEXT,
    "screeningKind" TEXT NOT NULL,
    "screeningId" TEXT,
    "sessionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "sentAt" TIMESTAMP(3),
    "reportedAt" TIMESTAMP(3),
    "reportedDecision" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AtsTestRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AtsSyncEvent" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "detail" TEXT,
    "httpStatus" INTEGER,
    "candidateId" TEXT,
    "requestId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AtsSyncEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AtsJobMapping_workspaceId_idx" ON "AtsJobMapping"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "AtsJobMapping_workspaceId_provider_jobName_key" ON "AtsJobMapping"("workspaceId", "provider", "jobName");

-- CreateIndex
CREATE INDEX "AtsTestRequest_workspaceId_createdAt_idx" ON "AtsTestRequest"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "AtsTestRequest_candidateId_idx" ON "AtsTestRequest"("candidateId");

-- CreateIndex
CREATE INDEX "AtsTestRequest_sessionId_idx" ON "AtsTestRequest"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "AtsTestRequest_workspaceId_provider_externalApplicationId_m_key" ON "AtsTestRequest"("workspaceId", "provider", "externalApplicationId", "mappingId");

-- CreateIndex
CREATE INDEX "AtsSyncEvent_workspaceId_createdAt_idx" ON "AtsSyncEvent"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "AtsSyncEvent_candidateId_createdAt_idx" ON "AtsSyncEvent"("candidateId", "createdAt");

-- CreateIndex
CREATE INDEX "AtsSyncEvent_requestId_idx" ON "AtsSyncEvent"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "AtsIntegration_partnerKeyHash_key" ON "AtsIntegration"("partnerKeyHash");

-- AddForeignKey
ALTER TABLE "AtsJobMapping" ADD CONSTRAINT "AtsJobMapping_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtsTestRequest" ADD CONSTRAINT "AtsTestRequest_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtsTestRequest" ADD CONSTRAINT "AtsTestRequest_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtsTestRequest" ADD CONSTRAINT "AtsTestRequest_mappingId_fkey" FOREIGN KEY ("mappingId") REFERENCES "AtsJobMapping"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtsSyncEvent" ADD CONSTRAINT "AtsSyncEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

