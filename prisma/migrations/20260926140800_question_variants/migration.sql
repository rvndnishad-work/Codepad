-- Workspace-private rewrites of public questions (question library variants)
CREATE TABLE "QuestionVariant" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "originKind" TEXT NOT NULL,
    "originQuestionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "answer" TEXT,
    "challengeId" TEXT,
    "checkStatus" TEXT NOT NULL DEFAULT 'none',
    "testsPassed" INTEGER,
    "testsTotal" INTEGER,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionVariant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "QuestionVariant_challengeId_key" ON "QuestionVariant"("challengeId");
CREATE INDEX "QuestionVariant_workspaceId_originKind_originQuestionId_idx" ON "QuestionVariant"("workspaceId", "originKind", "originQuestionId");

ALTER TABLE "QuestionVariant" ADD CONSTRAINT "QuestionVariant_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
