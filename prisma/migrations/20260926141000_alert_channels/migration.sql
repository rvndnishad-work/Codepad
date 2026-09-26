-- Slack and Microsoft Teams alert channels
CREATE TABLE "AlertChannel" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'webhook',
    "target" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "token" TEXT,
    "teamName" TEXT,
    "events" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "includeScore" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastSentAt" TIMESTAMP(3),
    "lastError" TEXT,
    "lastErrorAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlertChannel_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AlertChannel_workspaceId_idx" ON "AlertChannel"("workspaceId");

ALTER TABLE "AlertChannel" ADD CONSTRAINT "AlertChannel_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
