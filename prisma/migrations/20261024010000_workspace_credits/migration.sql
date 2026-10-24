-- Each workspace keeps its own AI credit balance again. Credits not given to
-- any workspace sit on the billing account as "unassigned".

ALTER TABLE "Workspace" ADD COLUMN "planCreditShare" INTEGER;

CREATE TABLE "AccountCreditEntry" (
    "id" TEXT NOT NULL,
    "billingAccountId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "workspaceId" TEXT,
    "workspaceName" TEXT,
    "userId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AccountCreditEntry_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AccountCreditEntry_billingAccountId_createdAt_idx" ON "AccountCreditEntry"("billingAccountId", "createdAt");
ALTER TABLE "AccountCreditEntry" ADD CONSTRAINT "AccountCreditEntry_billingAccountId_fkey"
    FOREIGN KEY ("billingAccountId") REFERENCES "BillingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Accounts with several workspaces shared one pool until now. The whole pool
-- goes to the oldest workspace, so nothing is lost; owners can then move
-- credits. Each other workspace gets a row that brings it to zero.
WITH ws AS (
    SELECT w."id", w."billingAccountId", w."name",
           ROW_NUMBER() OVER (PARTITION BY w."billingAccountId" ORDER BY w."createdAt", w."id") AS rn,
           COUNT(*) OVER (PARTITION BY w."billingAccountId") AS n
    FROM "Workspace" w
    WHERE w."billingAccountId" IS NOT NULL
),
sums AS (
    SELECT ws."id", ws."billingAccountId", ws.rn, ws.n, COALESCE(SUM(l."amount"), 0) AS bal
    FROM ws LEFT JOIN "AIInterviewCreditLedger" l ON l."workspaceId" = ws."id"
    WHERE ws.n > 1
    GROUP BY ws."id", ws."billingAccountId", ws.rn, ws.n
),
anchor AS (
    SELECT s."billingAccountId", s."id" AS anchor_id FROM sums s WHERE s.rn = 1
),
others AS (
    SELECT s.* FROM sums s WHERE s.rn > 1 AND s.bal <> 0
)
INSERT INTO "AIInterviewCreditLedger" ("id", "workspaceId", "kind", "amount", "note", "createdAt", "billingAccountId")
SELECT 'split_out_' || o."id", o."id", 'TRANSFER_OUT', -o.bal,
       'Credits are now kept per workspace: this balance moved to your oldest workspace', NOW(), o."billingAccountId"
FROM others o
UNION ALL
SELECT 'split_in_' || o."id", a.anchor_id, 'TRANSFER_IN', o.bal,
       'Credits are now kept per workspace: balance moved in from another workspace', NOW(), o."billingAccountId"
FROM others o JOIN anchor a ON a."billingAccountId" = o."billingAccountId";

-- Plan credits that can expire: the account's count moves to its oldest
-- workspace, with the other workspaces' (balances there are now zero).
WITH ws AS (
    SELECT w."id", w."billingAccountId", w."includedCreditsLeft", w."includedCreditsLastGrant",
           ROW_NUMBER() OVER (PARTITION BY w."billingAccountId" ORDER BY w."createdAt", w."id") AS rn
    FROM "Workspace" w
    WHERE w."billingAccountId" IS NOT NULL
),
moved AS (
    SELECT ws."billingAccountId",
           SUM(CASE WHEN ws.rn > 1 THEN ws."includedCreditsLeft" ELSE 0 END) AS left_others,
           SUM(CASE WHEN ws.rn > 1 THEN ws."includedCreditsLastGrant" ELSE 0 END) AS grant_others
    FROM ws GROUP BY ws."billingAccountId"
)
UPDATE "Workspace" w
SET "includedCreditsLeft" = GREATEST(0, LEAST(
        w."includedCreditsLeft" + m.left_others + b."planCreditsLeft",
        (SELECT COALESCE(SUM(l."amount"), 0) FROM "AIInterviewCreditLedger" l WHERE l."workspaceId" = w."id"))),
    "includedCreditsLastGrant" = w."includedCreditsLastGrant" + m.grant_others + b."planCreditsLastGrant"
FROM ws, moved m, "BillingAccount" b
WHERE ws."id" = w."id" AND ws.rn = 1
  AND m."billingAccountId" = ws."billingAccountId" AND b."id" = ws."billingAccountId"
  AND (m.left_others > 0 OR b."planCreditsLeft" > 0 OR m.grant_others > 0 OR b."planCreditsLastGrant" > 0);

UPDATE "Workspace" w SET "includedCreditsLeft" = 0, "includedCreditsLastGrant" = 0
FROM (
    SELECT "id", ROW_NUMBER() OVER (PARTITION BY "billingAccountId" ORDER BY "createdAt", "id") AS rn
    FROM "Workspace" WHERE "billingAccountId" IS NOT NULL
) r
WHERE r."id" = w."id" AND r.rn > 1 AND (w."includedCreditsLeft" <> 0 OR w."includedCreditsLastGrant" <> 0);

UPDATE "BillingAccount" SET "planCreditsLeft" = 0, "planCreditsLastGrant" = 0
WHERE "planCreditsLeft" <> 0 OR "planCreditsLastGrant" <> 0;
