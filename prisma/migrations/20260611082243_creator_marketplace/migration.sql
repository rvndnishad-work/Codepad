-- CreateTable
CREATE TABLE "CreatorAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripeAccountId" TEXT,
    "chargesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "payoutsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "onboardedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "platformFeeBps" INTEGER NOT NULL DEFAULT 2000,
    "stripeProductId" TEXT,
    "stripePriceId" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entitlement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "productId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Entitlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorSubscription" (
    "id" TEXT NOT NULL,
    "subscriberId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorEarning" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "productId" TEXT,
    "buyerId" TEXT,
    "grossCents" INTEGER NOT NULL,
    "feeCents" INTEGER NOT NULL,
    "netCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "stripeChargeId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'paid',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreatorEarning_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreatorAccount_userId_key" ON "CreatorAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorAccount_stripeAccountId_key" ON "CreatorAccount"("stripeAccountId");

-- CreateIndex
CREATE INDEX "Product_creatorId_idx" ON "Product"("creatorId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_contentType_contentId_kind_key" ON "Product"("contentType", "contentId", "kind");

-- CreateIndex
CREATE INDEX "Entitlement_userId_idx" ON "Entitlement"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Entitlement_userId_contentType_contentId_key" ON "Entitlement"("userId", "contentType", "contentId");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorSubscription_stripeSubscriptionId_key" ON "CreatorSubscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "CreatorSubscription_creatorId_idx" ON "CreatorSubscription"("creatorId");

-- CreateIndex
CREATE INDEX "CreatorSubscription_subscriberId_status_idx" ON "CreatorSubscription"("subscriberId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorSubscription_subscriberId_creatorId_key" ON "CreatorSubscription"("subscriberId", "creatorId");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorEarning_stripeChargeId_key" ON "CreatorEarning"("stripeChargeId");

-- CreateIndex
CREATE INDEX "CreatorEarning_creatorId_idx" ON "CreatorEarning"("creatorId");
