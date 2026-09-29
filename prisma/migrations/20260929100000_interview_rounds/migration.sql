-- Interview plans and rounds (phase 1): templates per workspace, one copy
-- of the rounds per candidate, and links from interviews, take-homes and AI
-- interviews to their round. Existing rows are untouched; see
-- scripts/backfill-candidate-rounds.ts to rebuild rounds from history.

-- AlterTable
ALTER TABLE "AIInterviewSession" ADD COLUMN     "candidateRoundId" TEXT;

-- AlterTable
ALTER TABLE "Candidate" ADD COLUMN     "planId" TEXT;

-- AlterTable
ALTER TABLE "CandidateBatch" ADD COLUMN     "planId" TEXT;

-- AlterTable
ALTER TABLE "InterviewSession" ADD COLUMN     "candidateRoundId" TEXT;

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "hiringType" TEXT NOT NULL DEFAULT 'technical';

-- CreateTable
CREATE TABLE "InterviewPlan" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roleType" TEXT NOT NULL DEFAULT 'technical',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "continuesInAts" BOOLEAN NOT NULL DEFAULT false,
    "autoSendFirst" BOOLEAN NOT NULL DEFAULT false,
    "templateKey" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewPlanRound" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "format" TEXT,
    "durationMin" INTEGER,
    "passMark" DOUBLE PRECISION,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "settingsJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewPlanRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateRound" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "planRoundId" TEXT,
    "order" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "format" TEXT,
    "durationMin" INTEGER,
    "passMark" DOUBLE PRECISION,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "skipped" BOOLEAN NOT NULL DEFAULT false,
    "nextStep" TEXT,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateRound_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InterviewPlan_workspaceId_roleType_idx" ON "InterviewPlan"("workspaceId", "roleType");

-- CreateIndex
CREATE INDEX "InterviewPlanRound_planId_order_idx" ON "InterviewPlanRound"("planId", "order");

-- CreateIndex
CREATE INDEX "CandidateRound_candidateId_order_idx" ON "CandidateRound"("candidateId", "order");

-- CreateIndex
CREATE INDEX "CandidateRound_planRoundId_idx" ON "CandidateRound"("planRoundId");

-- CreateIndex
CREATE INDEX "AIInterviewSession_candidateRoundId_idx" ON "AIInterviewSession"("candidateRoundId");

-- CreateIndex
CREATE INDEX "InterviewSession_candidateRoundId_idx" ON "InterviewSession"("candidateRoundId");

-- AddForeignKey
ALTER TABLE "InterviewSession" ADD CONSTRAINT "InterviewSession_candidateRoundId_fkey" FOREIGN KEY ("candidateRoundId") REFERENCES "CandidateRound"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_planId_fkey" FOREIGN KEY ("planId") REFERENCES "InterviewPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateBatch" ADD CONSTRAINT "CandidateBatch_planId_fkey" FOREIGN KEY ("planId") REFERENCES "InterviewPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewPlan" ADD CONSTRAINT "InterviewPlan_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewPlanRound" ADD CONSTRAINT "InterviewPlanRound_planId_fkey" FOREIGN KEY ("planId") REFERENCES "InterviewPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateRound" ADD CONSTRAINT "CandidateRound_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateRound" ADD CONSTRAINT "CandidateRound_planRoundId_fkey" FOREIGN KEY ("planRoundId") REFERENCES "InterviewPlanRound"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIInterviewSession" ADD CONSTRAINT "AIInterviewSession_candidateRoundId_fkey" FOREIGN KEY ("candidateRoundId") REFERENCES "CandidateRound"("id") ON DELETE SET NULL ON UPDATE CASCADE;
