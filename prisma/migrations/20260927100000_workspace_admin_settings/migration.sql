-- Workspace administration: Settings (general, candidate experience, screening
-- defaults, security, data and privacy), billing alerts, consent stamps.
-- Every new column has a default or is nullable, so existing workspaces keep
-- today's behaviour.

-- AlterTable
ALTER TABLE "InterviewSession" ADD COLUMN     "candidateConsentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "aiDefaultMinutes" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "allowedEmailDomains" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "apiKeyMaxLifetimeDays" INTEGER,
ADD COLUMN     "brandColor" TEXT,
ADD COLUMN     "consentRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dateFormat" TEXT NOT NULL DEFAULT 'DMY',
ADD COLUMN     "defaultAiPassMark" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "defaultInterviewPassMark" DOUBLE PRECISION NOT NULL DEFAULT 3,
ADD COLUMN     "defaultTakeHomePassMark" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "deletionRequestedById" TEXT,
ADD COLUMN     "deletionScheduledAt" TIMESTAMP(3),
ADD COLUMN     "helpEmail" TEXT,
ADD COLUMN     "interviewDefaultMinutes" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "interviewerLanguage" TEXT NOT NULL DEFAULT 'en',
ADD COLUMN     "inviteExpiryDays" INTEGER NOT NULL DEFAULT 7,
ADD COLUMN     "joinRole" TEXT NOT NULL DEFAULT 'INTERVIEWER',
ADD COLUMN     "joinWithoutInvite" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "keepVoiceAnswers" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "lowCreditAlertedAt" TIMESTAMP(3),
ADD COLUMN     "lowCreditThreshold" INTEGER,
ADD COLUMN     "privacyNoticeUrl" TEXT,
ADD COLUMN     "remindBeforeDeadline" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "remindNotStarted" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "replyToConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "replyToEmail" TEXT,
ADD COLUMN     "replyToToken" TEXT,
ADD COLUMN     "require2faForAll" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "require2faFrom" TIMESTAMP(3),
ADD COLUMN     "require2faRemindedAt" TIMESTAMP(3),
ADD COLUMN     "scorecardFirst" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "scorecardReminderHours" INTEGER,
ADD COLUMN     "senderName" TEXT,
ADD COLUMN     "sessionMaxAgeDays" INTEGER,
ADD COLUMN     "sessionsRevokedAt" TIMESTAMP(3),
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'UTC',
ADD COLUMN     "trialEndedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "AIInterviewSession" ADD COLUMN     "consentAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "WorkspaceSlugRedirect" (
    "id" TEXT NOT NULL,
    "oldSlug" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceSlugRedirect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateEmailTemplate" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateEmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetentionRule" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "amount" INTEGER NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'MONTHS',
    "lastRunAt" TIMESTAMP(3),
    "lastErasedCount" INTEGER,
    "nextNoticeAt" TIMESTAMP(3),
    "noticeSentAt" TIMESTAMP(3),
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RetentionRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataRequest" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "dueAt" TIMESTAMP(3) NOT NULL,
    "requestedById" TEXT,
    "completedAt" TIMESTAMP(3),
    "completedById" TEXT,
    "itemCount" INTEGER,
    "summary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceExport" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "fileKey" TEXT,
    "url" TEXT,
    "sizeBytes" INTEGER,
    "error" TEXT,
    "requestedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readyAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "WorkspaceExport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceSlugRedirect_oldSlug_key" ON "WorkspaceSlugRedirect"("oldSlug");

-- CreateIndex
CREATE INDEX "WorkspaceSlugRedirect_workspaceId_idx" ON "WorkspaceSlugRedirect"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateEmailTemplate_workspaceId_key_key" ON "CandidateEmailTemplate"("workspaceId", "key");

-- CreateIndex
CREATE INDEX "RetentionRule_enabled_idx" ON "RetentionRule"("enabled");

-- CreateIndex
CREATE UNIQUE INDEX "RetentionRule_workspaceId_kind_key" ON "RetentionRule"("workspaceId", "kind");

-- CreateIndex
CREATE INDEX "DataRequest_workspaceId_status_idx" ON "DataRequest"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "DataRequest_workspaceId_email_idx" ON "DataRequest"("workspaceId", "email");

-- CreateIndex
CREATE INDEX "WorkspaceExport_workspaceId_createdAt_idx" ON "WorkspaceExport"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "WorkspaceExport_status_idx" ON "WorkspaceExport"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_replyToToken_key" ON "Workspace"("replyToToken");

-- AddForeignKey
ALTER TABLE "WorkspaceSlugRedirect" ADD CONSTRAINT "WorkspaceSlugRedirect_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateEmailTemplate" ADD CONSTRAINT "CandidateEmailTemplate_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetentionRule" ADD CONSTRAINT "RetentionRule_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataRequest" ADD CONSTRAINT "DataRequest_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceExport" ADD CONSTRAINT "WorkspaceExport_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

