-- CreateTable
CREATE TABLE "AgentConfig" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "role" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "model" TEXT,
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "maxOutputTokens" INTEGER NOT NULL DEFAULT 1024,
    "toolsJson" TEXT NOT NULL DEFAULT '[]',
    "guardrailsJson" TEXT NOT NULL DEFAULT '{}',
    "fallback" TEXT NOT NULL DEFAULT 'mock',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentConfig_workspaceId_role_idx" ON "AgentConfig"("workspaceId", "role");

-- AddForeignKey
ALTER TABLE "AgentConfig" ADD CONSTRAINT "AgentConfig_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

