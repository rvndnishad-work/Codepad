-- Interview wizard: format, panel, question plan and interviewer guide.
ALTER TABLE "InterviewSession" ADD COLUMN "format" TEXT;
ALTER TABLE "InterviewSession" ADD COLUMN "panelJson" TEXT;
ALTER TABLE "InterviewSession" ADD COLUMN "questionPlan" TEXT NOT NULL DEFAULT 'set';
ALTER TABLE "InterviewSession" ADD COLUMN "questionsOwnerId" TEXT;
ALTER TABLE "InterviewSession" ADD COLUMN "questionsNote" TEXT;
ALTER TABLE "InterviewSession" ADD COLUMN "guideTemplateId" TEXT;
ALTER TABLE "InterviewSession" ADD COLUMN "interviewerBrief" TEXT;
ALTER TABLE "InterviewSession" ADD COLUMN "createdById" TEXT;
ALTER TABLE "InterviewSession" ADD COLUMN "setupGroupId" TEXT;
CREATE INDEX "InterviewSession_questionsOwnerId_idx" ON "InterviewSession"("questionsOwnerId");
CREATE INDEX "InterviewSession_setupGroupId_idx" ON "InterviewSession"("setupGroupId");
