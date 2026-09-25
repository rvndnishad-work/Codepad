-- Take home: saved question sets and cancelled invites.

-- AlterTable
ALTER TABLE "InterviewSession" ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "takeHomeTemplateId" TEXT;

-- CreateTable
CREATE TABLE "TakeHomeTemplate" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "itemsJson" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TakeHomeTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TakeHomeTemplate_workspaceId_idx" ON "TakeHomeTemplate"("workspaceId");

-- CreateIndex
CREATE INDEX "InterviewSession_takeHomeTemplateId_idx" ON "InterviewSession"("takeHomeTemplateId");

-- AddForeignKey
ALTER TABLE "InterviewSession" ADD CONSTRAINT "InterviewSession_takeHomeTemplateId_fkey" FOREIGN KEY ("takeHomeTemplateId") REFERENCES "TakeHomeTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TakeHomeTemplate" ADD CONSTRAINT "TakeHomeTemplate_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
