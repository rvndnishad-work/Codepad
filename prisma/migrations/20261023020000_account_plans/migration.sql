-- New plans (Basic, Growth, Teams) live on the billing account: the plan,
-- its period and paid-until date, the last payment applied, and the monthly
-- plan credits. Every column is empty or zero, so nothing changes until an
-- account buys one of the new plans.

-- AlterTable
ALTER TABLE "BillingAccount" ADD COLUMN "planKey" TEXT,
ADD COLUMN "planCadence" TEXT,
ADD COLUMN "paidThrough" TIMESTAMP(3),
ADD COLUMN "lastPaymentId" TEXT,
ADD COLUMN "reminderAt" TIMESTAMP(3),
ADD COLUMN "planCreditsLeft" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "planCreditsLastGrant" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "planCreditsGrantedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "BillingAccount_planKey_paidThrough_idx" ON "BillingAccount"("planKey", "paidThrough");
