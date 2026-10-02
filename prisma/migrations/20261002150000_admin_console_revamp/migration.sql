-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bannedAt" TIMESTAMP(3),
ADD COLUMN     "bannedById" TEXT,
ADD COLUMN     "bannedReason" TEXT,
ADD COLUMN     "bannedUntil" TIMESTAMP(3),
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "lastSignInAt" TIMESTAMP(3),
ADD COLUMN     "sessionsRevokedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Challenge" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "scheduledAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "BlogPost" ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "scheduledAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "lockedAt" TIMESTAMP(3),
ADD COLUMN     "lockedById" TEXT,
ADD COLUMN     "lockedReason" TEXT,
ADD COLUMN     "stripeCurrentPeriodEnd" TIMESTAMP(3),
ADD COLUMN     "stripeInterval" TEXT,
ADD COLUMN     "stripeMrrCents" INTEGER,
ADD COLUMN     "stripePastDueSince" TIMESTAMP(3),
ADD COLUMN     "stripeSeatQuantity" INTEGER,
ADD COLUMN     "stripeStatus" TEXT,
ADD COLUMN     "stripeSyncedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PrepQuestion" ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "scheduledAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorEmail" TEXT,
    "via" TEXT NOT NULL DEFAULT 'admin',
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "targetLabel" TEXT,
    "before" JSONB,
    "after" JSONB,
    "note" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureSwitch" (
    "key" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'on',
    "message" TEXT,
    "resumeAt" TIMESTAMP(3),
    "updatedById" TEXT,
    "updatedNote" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeatureSwitch_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "MaintenanceRule" (
    "id" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "paths" TEXT[],
    "message" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "bannerHours" INTEGER NOT NULL DEFAULT 24,
    "bypassRoles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "endedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityEvent" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "userId" TEXT,
    "label" TEXT,
    "durationMs" INTEGER,
    "ok" BOOLEAN NOT NULL DEFAULT true,
    "targetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminDailyStat" (
    "id" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "metric" TEXT NOT NULL,
    "dim" TEXT NOT NULL DEFAULT '',
    "value" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "AdminDailyStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CronRun" (
    "id" TEXT NOT NULL,
    "job" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "ok" BOOLEAN,
    "error" TEXT,
    "summary" TEXT,

    CONSTRAINT "CronRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingChange" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorEmail" TEXT,
    "before" JSONB NOT NULL,
    "after" JSONB NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PricingChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentReport" (
    "id" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "reporterId" TEXT,
    "reason" TEXT NOT NULL,
    "detail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorPayout" (
    "id" TEXT NOT NULL,
    "creatorUserId" TEXT NOT NULL,
    "stripeAccountId" TEXT NOT NULL,
    "stripeId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "status" TEXT NOT NULL,
    "failureMessage" TEXT,
    "arrivalDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorPayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssistantConversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'New conversation',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssistantConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssistantMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "toolCalls" JSONB,
    "proposal" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssistantMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_targetType_targetId_createdAt_idx" ON "AdminAuditLog"("targetType", "targetId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_actorId_createdAt_idx" ON "AdminAuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_action_createdAt_idx" ON "AdminAuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "MaintenanceRule_area_idx" ON "MaintenanceRule"("area");

-- CreateIndex
CREATE INDEX "MaintenanceRule_startsAt_endsAt_idx" ON "MaintenanceRule"("startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "ActivityEvent_kind_createdAt_idx" ON "ActivityEvent"("kind", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityEvent_userId_createdAt_idx" ON "ActivityEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminDailyStat_metric_day_idx" ON "AdminDailyStat"("metric", "day");

-- CreateIndex
CREATE UNIQUE INDEX "AdminDailyStat_day_metric_dim_key" ON "AdminDailyStat"("day", "metric", "dim");

-- CreateIndex
CREATE INDEX "CronRun_job_startedAt_idx" ON "CronRun"("job", "startedAt");

-- CreateIndex
CREATE INDEX "PricingChange_createdAt_idx" ON "PricingChange"("createdAt");

-- CreateIndex
CREATE INDEX "ContentReport_status_createdAt_idx" ON "ContentReport"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ContentReport_targetType_targetId_idx" ON "ContentReport"("targetType", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorPayout_stripeId_key" ON "CreatorPayout"("stripeId");

-- CreateIndex
CREATE INDEX "CreatorPayout_creatorUserId_createdAt_idx" ON "CreatorPayout"("creatorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "CreatorPayout_status_idx" ON "CreatorPayout"("status");

-- CreateIndex
CREATE INDEX "AssistantConversation_userId_updatedAt_idx" ON "AssistantConversation"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "AssistantMessage_conversationId_createdAt_idx" ON "AssistantMessage"("conversationId", "createdAt");

-- AddForeignKey
ALTER TABLE "AssistantMessage" ADD CONSTRAINT "AssistantMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AssistantConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

