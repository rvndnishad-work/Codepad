-- CreateTable GiftEntitlement
CREATE TABLE "GiftEntitlement" (
    "id" TEXT NOT NULL,
    "giverId" TEXT,
    "recipientEmail" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "spaceContentId" TEXT,
    "code" TEXT NOT NULL,
    "claimedById" TEXT,
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GiftEntitlement_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "GiftEntitlement_code_key" ON "GiftEntitlement"("code");
CREATE INDEX "GiftEntitlement_recipientEmail_idx" ON "GiftEntitlement"("recipientEmail");
CREATE INDEX "GiftEntitlement_code_idx" ON "GiftEntitlement"("code");
CREATE INDEX "GiftEntitlement_contentId_idx" ON "GiftEntitlement"("contentId");

-- AlterTable Entitlement add giftId
ALTER TABLE "Entitlement" ADD COLUMN "giftId" TEXT;
CREATE INDEX "Entitlement_giftId_idx" ON "Entitlement"("giftId");
ALTER TABLE "Entitlement" ADD CONSTRAINT "Entitlement_giftId_fkey" FOREIGN KEY ("giftId") REFERENCES "GiftEntitlement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable TeamLicense
CREATE TABLE "TeamLicense" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "tierRank" INTEGER NOT NULL,
    "seats" INTEGER NOT NULL,
    "stripeCheckoutId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeamLicense_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TeamLicense_stripeCheckoutId_key" ON "TeamLicense"("stripeCheckoutId");
CREATE INDEX "TeamLicense_buyerId_idx" ON "TeamLicense"("buyerId");
CREATE INDEX "TeamLicense_spaceId_idx" ON "TeamLicense"("spaceId");
ALTER TABLE "TeamLicense" ADD CONSTRAINT "TeamLicense_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "CreatorSpace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamLicense" ADD CONSTRAINT "TeamLicense_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable SpaceContent add meteredFree
ALTER TABLE "SpaceContent" ADD COLUMN "meteredFree" INTEGER DEFAULT 0;