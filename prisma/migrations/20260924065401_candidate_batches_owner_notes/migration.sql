-- AlterTable
ALTER TABLE "Candidate" ADD COLUMN     "batchId" TEXT,
ADD COLUMN     "ownerId" TEXT;

-- CreateTable
CREATE TABLE "CandidateBatch" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roleTitle" TEXT,
    "ownerId" TEXT,
    "deadline" TIMESTAMP(3),
    "targetHires" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateNote" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "authorId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidateNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CandidateBatch_workspaceId_status_idx" ON "CandidateBatch"("workspaceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateBatch_workspaceId_name_key" ON "CandidateBatch"("workspaceId", "name");

-- CreateIndex
CREATE INDEX "CandidateNote_candidateId_createdAt_idx" ON "CandidateNote"("candidateId", "createdAt");

-- CreateIndex
CREATE INDEX "Candidate_workspaceId_batchId_idx" ON "Candidate"("workspaceId", "batchId");

-- CreateIndex
CREATE INDEX "Candidate_workspaceId_ownerId_idx" ON "Candidate"("workspaceId", "ownerId");

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "CandidateBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateBatch" ADD CONSTRAINT "CandidateBatch_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateBatch" ADD CONSTRAINT "CandidateBatch_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateNote" ADD CONSTRAINT "CandidateNote_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateNote" ADD CONSTRAINT "CandidateNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Carry each candidate's existing free-text notes over as their first note,
-- so the new authored-notes list starts with what recruiters already wrote.
INSERT INTO "CandidateNote" ("id", "candidateId", "authorId", "body", "createdAt")
SELECT 'mig_' || md5("id" || 'note'), "id", NULL, "notes", "updatedAt"
FROM "Candidate"
WHERE "notes" IS NOT NULL AND btrim("notes") <> '';
