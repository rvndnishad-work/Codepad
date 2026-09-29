-- Included AI credits: each paid seat adds credits every month, unused ones roll over one month.
ALTER TABLE "Workspace" ADD COLUMN "includedCreditsLeft" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Workspace" ADD COLUMN "includedCreditsLastGrant" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Workspace" ADD COLUMN "includedCreditsGrantedAt" TIMESTAMP(3);
