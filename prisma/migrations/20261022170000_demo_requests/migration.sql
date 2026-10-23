-- Demo requests from /demo and their history. Pilot workspaces reuse the
-- prepaid columns on Workspace (prepaidCadence = 'pilot'), so no change there.
CREATE TABLE "DemoRequest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "jobTitle" TEXT,
    "teamSize" TEXT NOT NULL,
    "monthlyVolume" TEXT NOT NULL,
    "hiringType" TEXT NOT NULL,
    "message" TEXT,
    "source" TEXT NOT NULL DEFAULT 'direct',
    "stage" TEXT NOT NULL DEFAULT 'NEW',
    "enterpriseLead" BOOLEAN NOT NULL DEFAULT false,
    "ownerUserId" TEXT,
    "ownerEmail" TEXT,
    "demoAt" TIMESTAMP(3),
    "notes" TEXT,
    "workspaceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemoRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DemoRequestEvent" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorEmail" TEXT,
    "kind" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DemoRequestEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DemoRequest_stage_createdAt_idx" ON "DemoRequest"("stage", "createdAt");
CREATE INDEX "DemoRequest_email_idx" ON "DemoRequest"("email");
CREATE INDEX "DemoRequestEvent_requestId_createdAt_idx" ON "DemoRequestEvent"("requestId", "createdAt");

ALTER TABLE "DemoRequestEvent" ADD CONSTRAINT "DemoRequestEvent_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "DemoRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
