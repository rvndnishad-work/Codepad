-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "passwordHash" TEXT,
    "bio" TEXT,
    "hireMeUrl" TEXT,
    "portfolioPublic" BOOLEAN NOT NULL DEFAULT false,
    "banned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userType" TEXT,
    "totpSecret" TEXT,
    "totpEnabledAt" TIMESTAMP(3),
    "totpBackupCodes" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BroadcastNotification" (
    "id" TEXT NOT NULL,
    "composedById" TEXT NOT NULL,
    "audienceType" TEXT NOT NULL,
    "audienceTarget" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "href" TEXT,
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BroadcastNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "broadcastId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "href" TEXT,
    "payload" TEXT,
    "readAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityAuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "meta" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "workspaceId" TEXT,
    "sessionId" TEXT,
    "providerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "errorReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastEventAt" TIMESTAMP(3),

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailSuppression" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "note" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailSuppression_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceAuditLog" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorEmail" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "meta" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Follow" (
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("followerId","followingId")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Snippet" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Untitled',
    "template" TEXT NOT NULL,
    "files" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'private',
    "tags" TEXT,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Snippet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Challenge" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL DEFAULT 'easy',
    "template" TEXT NOT NULL,
    "starterFiles" TEXT NOT NULL,
    "testFiles" TEXT NOT NULL,
    "tags" TEXT,
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 15,
    "category" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "premium" BOOLEAN NOT NULL DEFAULT false,
    "authorId" TEXT,
    "workspaceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeStep" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "title" TEXT,
    "description" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "starterFiles" TEXT NOT NULL,
    "testFiles" TEXT NOT NULL,
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 15,
    "hint" TEXT,
    "videoUrl" TEXT,
    "testCasesJson" TEXT NOT NULL DEFAULT '[]',
    "judgingMode" TEXT NOT NULL DEFAULT 'unit-js',
    "functionName" TEXT,
    "signatureJson" TEXT,
    "languagesJson" TEXT,
    "starterCodeJson" TEXT,
    "referenceSolutionsJson" TEXT,
    "harnessTestsJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChallengeStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeEnrollment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastVisitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ChallengeEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeInvitation" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "userId" TEXT,
    "token" TEXT NOT NULL,
    "invitedById" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChallengeInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "stepId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "files" TEXT,
    "testResults" TEXT,
    "durationSec" INTEGER,
    "sessionId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "score" INTEGER,
    "aiSuspicionScore" DOUBLE PRECISION,

    CONSTRAINT "ChallengeAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Interview Session',
    "candidateName" TEXT,
    "type" TEXT NOT NULL DEFAULT 'mock',
    "verdict" TEXT,
    "notes" TEXT,
    "creatorRole" TEXT NOT NULL DEFAULT 'candidate',
    "startRequestedAt" TIMESTAMP(3),
    "sourceType" TEXT NOT NULL DEFAULT 'challenge',
    "challengeIds" TEXT NOT NULL,
    "activeChallengeId" TEXT,
    "playgroundIds" TEXT NOT NULL DEFAULT '[]',
    "promptScenarioIds" TEXT NOT NULL DEFAULT '[]',
    "activePlaygroundId" TEXT,
    "scenario" TEXT,
    "totalSec" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "shareToken" TEXT NOT NULL,
    "shortCode" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "workspaceId" TEXT,
    "candidateId" TEXT,
    "aiSuspicionScore" DOUBLE PRECISION,
    "candidateAccessToken" TEXT,
    "deadlineAt" TIMESTAMP(3),
    "reminderSentAt" TIMESTAMP(3),
    "questionTimeLimitsJson" TEXT,
    "stackJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterviewSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogPost" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "content" TEXT NOT NULL,
    "coverImage" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "adminNotes" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogReaction" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'clap',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlogReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogComment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parentId" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogBookmark" (
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlogBookmark_pkey" PRIMARY KEY ("postId","userId")
);

-- CreateTable
CREATE TABLE "SiteSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "TakeHomeAssignment" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "candidateName" TEXT NOT NULL,
    "candidateEmail" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "timeLimitMin" INTEGER NOT NULL DEFAULT 60,
    "startedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "reminderSentAt" TIMESTAMP(3),
    "attemptId" TEXT,
    "workspaceId" TEXT,
    "candidateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TakeHomeAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "planName" TEXT NOT NULL DEFAULT 'FREE',
    "allowExternalMcp" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Candidate" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "source" TEXT,
    "notes" TEXT,
    "tags" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "stage" TEXT NOT NULL DEFAULT 'APPLIED',
    "rejectReason" TEXT,
    "rejectReasonNote" TEXT,
    "stageChangedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceMember" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'INTERVIEWER',

    CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionEventLog" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "eventsData" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionEventLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateIntegrityReport" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "suspicionScore" INTEGER NOT NULL DEFAULT 0,
    "totalBlurSec" INTEGER NOT NULL DEFAULT 0,
    "blurCount" INTEGER NOT NULL DEFAULT 0,
    "pasteCount" INTEGER NOT NULL DEFAULT 0,
    "pasteDetails" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidateIntegrityReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewRubric" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "ratings" TEXT NOT NULL,
    "notes" TEXT,
    "interviewerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterviewRubric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AtsIntegration" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "webhookSecret" TEXT,
    "settings" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AtsIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIInterviewSession" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "candidateId" TEXT,
    "batchId" TEXT,
    "inviteToken" TEXT NOT NULL,
    "candidateName" TEXT NOT NULL,
    "candidateEmail" TEXT NOT NULL,
    "positionTitle" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "practice" BOOLEAN NOT NULL DEFAULT false,
    "chatHistory" TEXT NOT NULL,
    "filesJson" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "score" INTEGER,
    "ratings" TEXT,
    "aiSummary" TEXT,
    "aiSuspicionScore" DOUBLE PRECISION,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "outboundCallCount" INTEGER NOT NULL DEFAULT 0,
    "outboundResponseBytes" INTEGER NOT NULL DEFAULT 0,
    "outboundElapsedMs" INTEGER NOT NULL DEFAULT 0,
    "outboundToolsListCache" TEXT,
    "engagementLevel" TEXT NOT NULL DEFAULT 'REACTIVE',
    "proactiveCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIInterviewSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIScreeningBatch" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "positionTitle" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "engagementLevel" TEXT NOT NULL DEFAULT 'REACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIScreeningBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIScreeningRoundSpec" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "paradigm" TEXT NOT NULL,
    "language" TEXT,
    "frameworkLabel" TEXT,
    "sourceKind" TEXT NOT NULL,
    "sourceId" TEXT,
    "templateId" TEXT,
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 30,

    CONSTRAINT "AIScreeningRoundSpec_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIInterviewRound" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "paradigm" TEXT NOT NULL,
    "language" TEXT,
    "frameworkLabel" TEXT,
    "sourceKind" TEXT NOT NULL,
    "sourceId" TEXT,
    "templateId" TEXT,
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 30,
    "filesJson" TEXT NOT NULL DEFAULT '{}',
    "chatHistory" TEXT,
    "score" INTEGER,
    "ratings" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIInterviewRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIInterviewTemplate" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "starterFiles" TEXT NOT NULL,
    "testsCode" TEXT NOT NULL,
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 30,
    "kind" TEXT,
    "language" TEXT,
    "frameworkLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIInterviewTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIInterviewCreditLedger" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "sessionId" TEXT,
    "stripeChargeId" TEXT,
    "adminUserId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIInterviewCreditLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "McpApiKey" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPreview" TEXT NOT NULL,
    "scopes" TEXT NOT NULL DEFAULT '["read"]',
    "createdByUserId" TEXT,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "McpApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "McpAuditLog" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "apiKeyId" TEXT,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "argsJson" TEXT,
    "resultSummary" TEXT,
    "errorCode" TEXT,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "outboundUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "McpAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptScenario" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "expectedTraits" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL DEFAULT 'intermediate',
    "category" TEXT NOT NULL DEFAULT 'code-generation',
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 10,
    "workspaceId" TEXT,
    "rubricWeights" TEXT NOT NULL DEFAULT '{"clarity":20,"specificity":20,"efficiency":15,"context":15,"constraints":15,"edgeCases":15}',
    "published" BOOLEAN NOT NULL DEFAULT true,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromptScenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptAttempt" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "promptText" TEXT NOT NULL,
    "charCount" INTEGER NOT NULL,
    "tokenEstimate" INTEGER NOT NULL,
    "score" INTEGER,
    "rubricScores" TEXT,
    "feedback" TEXT,
    "graderType" TEXT,
    "sessionId" TEXT,
    "userId" TEXT,
    "durationSec" INTEGER,
    "shared" BOOLEAN NOT NULL DEFAULT false,
    "shareTitle" TEXT,
    "shareNote" TEXT,
    "shareUpvotes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromptAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptExemplar" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "promptText" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "rubricScores" TEXT,
    "source" TEXT NOT NULL DEFAULT 'admin',
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromptExemplar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptUpvote" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromptUpvote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalMcpServer" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "authToken" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "lastTestedAt" TIMESTAMP(3),
    "lastTestStatus" TEXT,
    "lastTestSummary" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalMcpServer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateExternalMcp" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "externalMcpServerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemplateExternalMcp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminTodo" (
    "id" TEXT NOT NULL,
    "ticketKey" TEXT,
    "ticketSeq" INTEGER,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "acceptanceCriteria" TEXT,
    "ownerNotes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'BACKLOG',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "category" TEXT,
    "addedByEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AdminTodo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminTodoDependency" (
    "id" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminTodoDependency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GemmaAlert" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'UNRESOLVED',
    "proposedAction" TEXT,
    "targetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "GemmaAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "BroadcastNotification_composedById_createdAt_idx" ON "BroadcastNotification"("composedById", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_dismissedAt_createdAt_idx" ON "Notification"("userId", "dismissedAt", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "NotificationPreference_userId_idx" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_type_key" ON "NotificationPreference"("userId", "type");

-- CreateIndex
CREATE INDEX "SecurityAuditLog_userId_createdAt_idx" ON "SecurityAuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityAuditLog_event_createdAt_idx" ON "SecurityAuditLog"("event", "createdAt");

-- CreateIndex
CREATE INDEX "EmailLog_recipientEmail_createdAt_idx" ON "EmailLog"("recipientEmail", "createdAt");

-- CreateIndex
CREATE INDEX "EmailLog_providerId_idx" ON "EmailLog"("providerId");

-- CreateIndex
CREATE INDEX "EmailLog_status_createdAt_idx" ON "EmailLog"("status", "createdAt");

-- CreateIndex
CREATE INDEX "EmailLog_workspaceId_createdAt_idx" ON "EmailLog"("workspaceId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailSuppression_address_key" ON "EmailSuppression"("address");

-- CreateIndex
CREATE INDEX "EmailSuppression_reason_addedAt_idx" ON "EmailSuppression"("reason", "addedAt");

-- CreateIndex
CREATE INDEX "WorkspaceAuditLog_workspaceId_createdAt_idx" ON "WorkspaceAuditLog"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "WorkspaceAuditLog_workspaceId_action_createdAt_idx" ON "WorkspaceAuditLog"("workspaceId", "action", "createdAt");

-- CreateIndex
CREATE INDEX "WorkspaceAuditLog_workspaceId_actorUserId_createdAt_idx" ON "WorkspaceAuditLog"("workspaceId", "actorUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Snippet_slug_key" ON "Snippet"("slug");

-- CreateIndex
CREATE INDEX "Snippet_userId_idx" ON "Snippet"("userId");

-- CreateIndex
CREATE INDEX "Snippet_visibility_updatedAt_idx" ON "Snippet"("visibility", "updatedAt");

-- CreateIndex
CREATE INDEX "Snippet_viewCount_idx" ON "Snippet"("viewCount");

-- CreateIndex
CREATE UNIQUE INDEX "Challenge_slug_key" ON "Challenge"("slug");

-- CreateIndex
CREATE INDEX "Challenge_published_featured_difficulty_idx" ON "Challenge"("published", "featured", "difficulty");

-- CreateIndex
CREATE INDEX "Challenge_authorId_idx" ON "Challenge"("authorId");

-- CreateIndex
CREATE INDEX "ChallengeStep_challengeId_position_idx" ON "ChallengeStep"("challengeId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeStep_challengeId_position_key" ON "ChallengeStep"("challengeId", "position");

-- CreateIndex
CREATE INDEX "ChallengeEnrollment_userId_status_idx" ON "ChallengeEnrollment"("userId", "status");

-- CreateIndex
CREATE INDEX "ChallengeEnrollment_challengeId_idx" ON "ChallengeEnrollment"("challengeId");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeEnrollment_userId_challengeId_key" ON "ChallengeEnrollment"("userId", "challengeId");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeInvitation_token_key" ON "ChallengeInvitation"("token");

-- CreateIndex
CREATE INDEX "ChallengeInvitation_email_idx" ON "ChallengeInvitation"("email");

-- CreateIndex
CREATE INDEX "ChallengeInvitation_userId_idx" ON "ChallengeInvitation"("userId");

-- CreateIndex
CREATE INDEX "ChallengeInvitation_challengeId_status_idx" ON "ChallengeInvitation"("challengeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeInvitation_challengeId_email_key" ON "ChallengeInvitation"("challengeId", "email");

-- CreateIndex
CREATE INDEX "ChallengeAttempt_userId_status_idx" ON "ChallengeAttempt"("userId", "status");

-- CreateIndex
CREATE INDEX "ChallengeAttempt_challengeId_idx" ON "ChallengeAttempt"("challengeId");

-- CreateIndex
CREATE INDEX "ChallengeAttempt_sessionId_idx" ON "ChallengeAttempt"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewSession_shareToken_key" ON "InterviewSession"("shareToken");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewSession_shortCode_key" ON "InterviewSession"("shortCode");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewSession_candidateAccessToken_key" ON "InterviewSession"("candidateAccessToken");

-- CreateIndex
CREATE INDEX "InterviewSession_userId_status_idx" ON "InterviewSession"("userId", "status");

-- CreateIndex
CREATE INDEX "InterviewSession_candidateId_idx" ON "InterviewSession"("candidateId");

-- CreateIndex
CREATE INDEX "InterviewSession_workspaceId_idx" ON "InterviewSession"("workspaceId");

-- CreateIndex
CREATE INDEX "InterviewSession_workspaceId_type_idx" ON "InterviewSession"("workspaceId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "BlogPost_slug_key" ON "BlogPost"("slug");

-- CreateIndex
CREATE INDEX "BlogPost_userId_idx" ON "BlogPost"("userId");

-- CreateIndex
CREATE INDEX "BlogPost_published_createdAt_idx" ON "BlogPost"("published", "createdAt");

-- CreateIndex
CREATE INDEX "BlogPost_featured_createdAt_idx" ON "BlogPost"("featured", "createdAt");

-- CreateIndex
CREATE INDEX "BlogReaction_postId_idx" ON "BlogReaction"("postId");

-- CreateIndex
CREATE INDEX "BlogReaction_userId_idx" ON "BlogReaction"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BlogReaction_postId_userId_type_key" ON "BlogReaction"("postId", "userId", "type");

-- CreateIndex
CREATE INDEX "BlogComment_postId_createdAt_idx" ON "BlogComment"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "BlogComment_userId_idx" ON "BlogComment"("userId");

-- CreateIndex
CREATE INDEX "BlogBookmark_userId_createdAt_idx" ON "BlogBookmark"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TakeHomeAssignment_token_key" ON "TakeHomeAssignment"("token");

-- CreateIndex
CREATE UNIQUE INDEX "TakeHomeAssignment_attemptId_key" ON "TakeHomeAssignment"("attemptId");

-- CreateIndex
CREATE INDEX "TakeHomeAssignment_token_idx" ON "TakeHomeAssignment"("token");

-- CreateIndex
CREATE INDEX "TakeHomeAssignment_candidateEmail_idx" ON "TakeHomeAssignment"("candidateEmail");

-- CreateIndex
CREATE INDEX "TakeHomeAssignment_candidateId_idx" ON "TakeHomeAssignment"("candidateId");

-- CreateIndex
CREATE INDEX "TakeHomeAssignment_workspaceId_idx" ON "TakeHomeAssignment"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_stripeCustomerId_key" ON "Workspace"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_stripeSubscriptionId_key" ON "Workspace"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "Candidate_workspaceId_status_idx" ON "Candidate"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "Candidate_workspaceId_name_idx" ON "Candidate"("workspaceId", "name");

-- CreateIndex
CREATE INDEX "Candidate_workspaceId_stage_idx" ON "Candidate"("workspaceId", "stage");

-- CreateIndex
CREATE UNIQUE INDEX "Candidate_workspaceId_email_key" ON "Candidate"("workspaceId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceMember_workspaceId_userId_key" ON "WorkspaceMember"("workspaceId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "SessionEventLog_attemptId_key" ON "SessionEventLog"("attemptId");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateIntegrityReport_attemptId_key" ON "CandidateIntegrityReport"("attemptId");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewRubric_sessionId_key" ON "InterviewRubric"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "AtsIntegration_workspaceId_key" ON "AtsIntegration"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "AIInterviewSession_inviteToken_key" ON "AIInterviewSession"("inviteToken");

-- CreateIndex
CREATE INDEX "AIInterviewSession_workspaceId_status_idx" ON "AIInterviewSession"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "AIInterviewSession_workspaceId_createdAt_idx" ON "AIInterviewSession"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "AIInterviewSession_candidateId_idx" ON "AIInterviewSession"("candidateId");

-- CreateIndex
CREATE INDEX "AIInterviewSession_batchId_idx" ON "AIInterviewSession"("batchId");

-- CreateIndex
CREATE INDEX "AIScreeningBatch_workspaceId_createdAt_idx" ON "AIScreeningBatch"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "AIScreeningBatch_workspaceId_status_idx" ON "AIScreeningBatch"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "AIScreeningRoundSpec_batchId_order_idx" ON "AIScreeningRoundSpec"("batchId", "order");

-- CreateIndex
CREATE INDEX "AIInterviewRound_sessionId_order_idx" ON "AIInterviewRound"("sessionId", "order");

-- CreateIndex
CREATE INDEX "AIInterviewTemplate_workspaceId_idx" ON "AIInterviewTemplate"("workspaceId");

-- CreateIndex
CREATE INDEX "AIInterviewCreditLedger_workspaceId_createdAt_idx" ON "AIInterviewCreditLedger"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "AIInterviewCreditLedger_sessionId_idx" ON "AIInterviewCreditLedger"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "McpApiKey_keyHash_key" ON "McpApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "McpApiKey_workspaceId_revokedAt_idx" ON "McpApiKey"("workspaceId", "revokedAt");

-- CreateIndex
CREATE INDEX "McpAuditLog_workspaceId_createdAt_idx" ON "McpAuditLog"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "McpAuditLog_apiKeyId_createdAt_idx" ON "McpAuditLog"("apiKeyId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PromptScenario_slug_key" ON "PromptScenario"("slug");

-- CreateIndex
CREATE INDEX "PromptScenario_workspaceId_published_idx" ON "PromptScenario"("workspaceId", "published");

-- CreateIndex
CREATE INDEX "PromptScenario_difficulty_category_idx" ON "PromptScenario"("difficulty", "category");

-- CreateIndex
CREATE INDEX "PromptScenario_authorId_idx" ON "PromptScenario"("authorId");

-- CreateIndex
CREATE INDEX "PromptAttempt_scenarioId_idx" ON "PromptAttempt"("scenarioId");

-- CreateIndex
CREATE INDEX "PromptAttempt_sessionId_idx" ON "PromptAttempt"("sessionId");

-- CreateIndex
CREATE INDEX "PromptAttempt_userId_idx" ON "PromptAttempt"("userId");

-- CreateIndex
CREATE INDEX "PromptAttempt_scenarioId_shared_shareUpvotes_idx" ON "PromptAttempt"("scenarioId", "shared", "shareUpvotes");

-- CreateIndex
CREATE INDEX "PromptExemplar_scenarioId_idx" ON "PromptExemplar"("scenarioId");

-- CreateIndex
CREATE INDEX "PromptUpvote_attemptId_idx" ON "PromptUpvote"("attemptId");

-- CreateIndex
CREATE UNIQUE INDEX "PromptUpvote_attemptId_userId_key" ON "PromptUpvote"("attemptId", "userId");

-- CreateIndex
CREATE INDEX "ExternalMcpServer_workspaceId_idx" ON "ExternalMcpServer"("workspaceId");

-- CreateIndex
CREATE INDEX "TemplateExternalMcp_templateId_idx" ON "TemplateExternalMcp"("templateId");

-- CreateIndex
CREATE INDEX "TemplateExternalMcp_externalMcpServerId_idx" ON "TemplateExternalMcp"("externalMcpServerId");

-- CreateIndex
CREATE UNIQUE INDEX "TemplateExternalMcp_templateId_externalMcpServerId_key" ON "TemplateExternalMcp"("templateId", "externalMcpServerId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminTodo_ticketKey_key" ON "AdminTodo"("ticketKey");

-- CreateIndex
CREATE UNIQUE INDEX "AdminTodo_ticketSeq_key" ON "AdminTodo"("ticketSeq");

-- CreateIndex
CREATE INDEX "AdminTodo_status_priority_idx" ON "AdminTodo"("status", "priority");

-- CreateIndex
CREATE INDEX "AdminTodoDependency_toId_type_idx" ON "AdminTodoDependency"("toId", "type");

-- CreateIndex
CREATE INDEX "AdminTodoDependency_fromId_type_idx" ON "AdminTodoDependency"("fromId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "AdminTodoDependency_fromId_toId_type_key" ON "AdminTodoDependency"("fromId", "toId", "type");

-- CreateIndex
CREATE INDEX "GemmaAlert_status_severity_idx" ON "GemmaAlert"("status", "severity");

-- CreateIndex
CREATE INDEX "GemmaAlert_type_status_idx" ON "GemmaAlert"("type", "status");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_broadcastId_fkey" FOREIGN KEY ("broadcastId") REFERENCES "BroadcastNotification"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityAuditLog" ADD CONSTRAINT "SecurityAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceAuditLog" ADD CONSTRAINT "WorkspaceAuditLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Snippet" ADD CONSTRAINT "Snippet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeStep" ADD CONSTRAINT "ChallengeStep_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeEnrollment" ADD CONSTRAINT "ChallengeEnrollment_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeEnrollment" ADD CONSTRAINT "ChallengeEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeInvitation" ADD CONSTRAINT "ChallengeInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeInvitation" ADD CONSTRAINT "ChallengeInvitation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeInvitation" ADD CONSTRAINT "ChallengeInvitation_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeAttempt" ADD CONSTRAINT "ChallengeAttempt_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "ChallengeStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeAttempt" ADD CONSTRAINT "ChallengeAttempt_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeAttempt" ADD CONSTRAINT "ChallengeAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewSession" ADD CONSTRAINT "InterviewSession_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewSession" ADD CONSTRAINT "InterviewSession_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewSession" ADD CONSTRAINT "InterviewSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogReaction" ADD CONSTRAINT "BlogReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogReaction" ADD CONSTRAINT "BlogReaction_postId_fkey" FOREIGN KEY ("postId") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogComment" ADD CONSTRAINT "BlogComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "BlogComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogComment" ADD CONSTRAINT "BlogComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogComment" ADD CONSTRAINT "BlogComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogBookmark" ADD CONSTRAINT "BlogBookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogBookmark" ADD CONSTRAINT "BlogBookmark_postId_fkey" FOREIGN KEY ("postId") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TakeHomeAssignment" ADD CONSTRAINT "TakeHomeAssignment_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TakeHomeAssignment" ADD CONSTRAINT "TakeHomeAssignment_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TakeHomeAssignment" ADD CONSTRAINT "TakeHomeAssignment_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "ChallengeAttempt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TakeHomeAssignment" ADD CONSTRAINT "TakeHomeAssignment_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionEventLog" ADD CONSTRAINT "SessionEventLog_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "ChallengeAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateIntegrityReport" ADD CONSTRAINT "CandidateIntegrityReport_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "ChallengeAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewRubric" ADD CONSTRAINT "InterviewRubric_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "InterviewSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtsIntegration" ADD CONSTRAINT "AtsIntegration_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIInterviewSession" ADD CONSTRAINT "AIInterviewSession_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIInterviewSession" ADD CONSTRAINT "AIInterviewSession_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIInterviewSession" ADD CONSTRAINT "AIInterviewSession_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "AIScreeningBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIScreeningBatch" ADD CONSTRAINT "AIScreeningBatch_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIScreeningRoundSpec" ADD CONSTRAINT "AIScreeningRoundSpec_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "AIScreeningBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIInterviewRound" ADD CONSTRAINT "AIInterviewRound_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AIInterviewSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIInterviewTemplate" ADD CONSTRAINT "AIInterviewTemplate_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIInterviewCreditLedger" ADD CONSTRAINT "AIInterviewCreditLedger_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AIInterviewSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIInterviewCreditLedger" ADD CONSTRAINT "AIInterviewCreditLedger_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "McpApiKey" ADD CONSTRAINT "McpApiKey_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "McpAuditLog" ADD CONSTRAINT "McpAuditLog_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "McpApiKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "McpAuditLog" ADD CONSTRAINT "McpAuditLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptScenario" ADD CONSTRAINT "PromptScenario_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptAttempt" ADD CONSTRAINT "PromptAttempt_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "PromptScenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptExemplar" ADD CONSTRAINT "PromptExemplar_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "PromptScenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptUpvote" ADD CONSTRAINT "PromptUpvote_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "PromptAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalMcpServer" ADD CONSTRAINT "ExternalMcpServer_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateExternalMcp" ADD CONSTRAINT "TemplateExternalMcp_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "AIInterviewTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateExternalMcp" ADD CONSTRAINT "TemplateExternalMcp_externalMcpServerId_fkey" FOREIGN KEY ("externalMcpServerId") REFERENCES "ExternalMcpServer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminTodoDependency" ADD CONSTRAINT "AdminTodoDependency_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "AdminTodo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminTodoDependency" ADD CONSTRAINT "AdminTodoDependency_toId_fkey" FOREIGN KEY ("toId") REFERENCES "AdminTodo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

