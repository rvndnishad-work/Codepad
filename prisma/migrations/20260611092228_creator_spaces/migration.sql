/*
  Warnings:

  - You are about to drop the column `productId` on the `CreatorEarning` table. All the data in the column will be lost.
  - You are about to drop the column `productId` on the `Entitlement` table. All the data in the column will be lost.
  - You are about to drop the `CreatorSubscription` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Product` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "CreatorEarning" DROP COLUMN "productId",
ADD COLUMN     "sourceId" TEXT,
ADD COLUMN     "sourceKind" TEXT;

-- AlterTable
ALTER TABLE "Entitlement" DROP COLUMN "productId",
ADD COLUMN     "spaceContentId" TEXT;

-- DropTable
DROP TABLE "CreatorSubscription";

-- DropTable
DROP TABLE "Product";

-- CreateTable
CREATE TABLE "CreatorSpace" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT,
    "description" TEXT,
    "avatarUrl" TEXT,
    "coverUrl" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorSpace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpaceTier" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "platformFeeBps" INTEGER NOT NULL DEFAULT 2000,
    "stripeProductId" TEXT,
    "stripePriceId" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpaceTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpaceMembership" (
    "id" TEXT NOT NULL,
    "subscriberId" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "tierRank" INTEGER NOT NULL,
    "stripeSubscriptionId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpaceMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tutorial" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "coverImage" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tutorial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TutorialSection" (
    "id" TEXT NOT NULL,
    "tutorialId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "snippetId" TEXT,
    "challengeId" TEXT,

    CONSTRAINT "TutorialSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewQA" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "category" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewQA_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewQuestion" (
    "id" TEXT NOT NULL,
    "qaId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "difficulty" TEXT,

    CONSTRAINT "InterviewQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpaceContent" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "accessTierRank" INTEGER,
    "purchasePriceCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "platformFeeBps" INTEGER NOT NULL DEFAULT 2000,
    "stripeProductId" TEXT,
    "stripePriceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpaceContent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreatorSpace_ownerId_key" ON "CreatorSpace"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorSpace_handle_key" ON "CreatorSpace"("handle");

-- CreateIndex
CREATE INDEX "SpaceTier_spaceId_idx" ON "SpaceTier"("spaceId");

-- CreateIndex
CREATE UNIQUE INDEX "SpaceTier_spaceId_rank_key" ON "SpaceTier"("spaceId", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "SpaceMembership_stripeSubscriptionId_key" ON "SpaceMembership"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "SpaceMembership_spaceId_idx" ON "SpaceMembership"("spaceId");

-- CreateIndex
CREATE INDEX "SpaceMembership_subscriberId_status_idx" ON "SpaceMembership"("subscriberId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SpaceMembership_subscriberId_spaceId_key" ON "SpaceMembership"("subscriberId", "spaceId");

-- CreateIndex
CREATE INDEX "Tutorial_spaceId_idx" ON "Tutorial"("spaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Tutorial_spaceId_slug_key" ON "Tutorial"("spaceId", "slug");

-- CreateIndex
CREATE INDEX "TutorialSection_tutorialId_idx" ON "TutorialSection"("tutorialId");

-- CreateIndex
CREATE INDEX "InterviewQA_spaceId_idx" ON "InterviewQA"("spaceId");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewQA_spaceId_slug_key" ON "InterviewQA"("spaceId", "slug");

-- CreateIndex
CREATE INDEX "InterviewQuestion_qaId_idx" ON "InterviewQuestion"("qaId");

-- CreateIndex
CREATE INDEX "SpaceContent_spaceId_idx" ON "SpaceContent"("spaceId");

-- CreateIndex
CREATE UNIQUE INDEX "SpaceContent_contentType_contentId_key" ON "SpaceContent"("contentType", "contentId");

-- AddForeignKey
ALTER TABLE "TutorialSection" ADD CONSTRAINT "TutorialSection_tutorialId_fkey" FOREIGN KEY ("tutorialId") REFERENCES "Tutorial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewQuestion" ADD CONSTRAINT "InterviewQuestion_qaId_fkey" FOREIGN KEY ("qaId") REFERENCES "InterviewQA"("id") ON DELETE CASCADE ON UPDATE CASCADE;
