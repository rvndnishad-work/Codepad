-- Billing accounts: who pays, and the AI credit pool shared by an account's
-- workspaces. Every existing workspace gets its own account, so no balance
-- changes. Two triggers keep it that way for new rows: a new workspace gets a
-- new account unless one is given, and a new ledger row takes its
-- workspace's account.

-- CreateTable
CREATE TABLE "BillingAccount" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingAccount_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN "billingAccountId" TEXT;
ALTER TABLE "AIInterviewCreditLedger" ADD COLUMN "billingAccountId" TEXT;

-- Backfill: one account per workspace, owned by its first owner.
INSERT INTO "BillingAccount" ("id", "name", "ownerUserId", "createdAt", "updatedAt")
SELECT
  'ba_' || w."id",
  w."name",
  (SELECT m."userId" FROM "WorkspaceMember" m WHERE m."workspaceId" = w."id" AND m."role" = 'OWNER' ORDER BY m."id" LIMIT 1),
  w."createdAt",
  CURRENT_TIMESTAMP
FROM "Workspace" w;

UPDATE "Workspace" SET "billingAccountId" = 'ba_' || "id";

UPDATE "AIInterviewCreditLedger" l
SET "billingAccountId" = w."billingAccountId"
FROM "Workspace" w
WHERE w."id" = l."workspaceId";

-- CreateIndex
CREATE INDEX "BillingAccount_ownerUserId_idx" ON "BillingAccount"("ownerUserId");
CREATE INDEX "Workspace_billingAccountId_idx" ON "Workspace"("billingAccountId");
CREATE INDEX "AIInterviewCreditLedger_billingAccountId_idx" ON "AIInterviewCreditLedger"("billingAccountId");

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_billingAccountId_fkey" FOREIGN KEY ("billingAccountId") REFERENCES "BillingAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AIInterviewCreditLedger" ADD CONSTRAINT "AIInterviewCreditLedger_billingAccountId_fkey" FOREIGN KEY ("billingAccountId") REFERENCES "BillingAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- A new workspace without an account gets its own.
CREATE OR REPLACE FUNCTION "workspace_default_billing_account"() RETURNS trigger AS $$
BEGIN
  IF NEW."billingAccountId" IS NULL THEN
    NEW."billingAccountId" := 'ba_' || NEW."id";
    INSERT INTO "BillingAccount" ("id", "name", "createdAt", "updatedAt")
    VALUES (NEW."billingAccountId", NEW."name", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("id") DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Workspace_default_billing_account"
BEFORE INSERT ON "Workspace"
FOR EACH ROW EXECUTE FUNCTION "workspace_default_billing_account"();

-- A new credit row counts toward its workspace's account.
CREATE OR REPLACE FUNCTION "credit_ledger_billing_account"() RETURNS trigger AS $$
BEGIN
  IF NEW."billingAccountId" IS NULL THEN
    SELECT w."billingAccountId" INTO NEW."billingAccountId" FROM "Workspace" w WHERE w."id" = NEW."workspaceId";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "AIInterviewCreditLedger_billing_account"
BEFORE INSERT ON "AIInterviewCreditLedger"
FOR EACH ROW EXECUTE FUNCTION "credit_ledger_billing_account"();
