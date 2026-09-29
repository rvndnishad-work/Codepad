-- Settings > General and Screening defaults.
-- Interviews keep their own scorecard rules, copied from the workspace
-- defaults when scheduled. Existing interviews keep today's behaviour:
-- scorecards stay hidden until you submit yours, and no automatic reminder.

-- AlterTable
ALTER TABLE "InterviewSession" ADD COLUMN     "scorecardAutoRemindedAt" TIMESTAMP(3),
ADD COLUMN     "scorecardFirst" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "scorecardReminderHours" INTEGER;

-- CreateTable
CREATE TABLE "WorkspaceLogo" (
    "workspaceId" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "bytes" BYTEA NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceLogo_pkey" PRIMARY KEY ("workspaceId")
);

-- CreateIndex
CREATE INDEX "InterviewSession_scorecardReminderHours_scorecardAutoRemind_idx" ON "InterviewSession"("scorecardReminderHours", "scorecardAutoRemindedAt");

-- AddForeignKey
ALTER TABLE "WorkspaceLogo" ADD CONSTRAINT "WorkspaceLogo_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
