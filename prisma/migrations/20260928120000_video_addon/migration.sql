-- Built-in video add-on (LiveKit): workspace switch and Stripe item, per-interview choice
ALTER TABLE "Workspace" ADD COLUMN "videoEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Workspace" ADD COLUMN "videoEnabledAt" TIMESTAMP(3);
ALTER TABLE "Workspace" ADD COLUMN "videoAddonItemId" TEXT;

ALTER TABLE "InterviewSession" ADD COLUMN "builtinVideo" BOOLEAN NOT NULL DEFAULT true;
