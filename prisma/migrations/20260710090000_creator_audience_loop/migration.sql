-- AlterTable
ALTER TABLE "CreatorSpace" ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "socials" JSONB,
ADD COLUMN     "topics" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "InterviewExperience" ADD COLUMN     "bodyJson" JSONB,
ADD COLUMN     "coverImage" TEXT;

-- AlterTable
ALTER TABLE "InterviewQA" ADD COLUMN     "coverImage" TEXT;

-- AlterTable
ALTER TABLE "InterviewQuestion" ADD COLUMN     "answerJson" JSONB;

-- AlterTable
ALTER TABLE "SpaceTier" ADD COLUMN     "benefits" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "TutorialSection" ADD COLUMN     "bodyJson" JSONB;

-- CreateTable
CREATE TABLE "SpaceFollow" (
    "userId" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpaceFollow_pkey" PRIMARY KEY ("userId","spaceId")
);

-- CreateTable
CREATE TABLE "SpaceEvent" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "contentType" TEXT,
    "contentId" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpaceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SpaceFollow_spaceId_idx" ON "SpaceFollow"("spaceId");

-- CreateIndex
CREATE INDEX "SpaceFollow_userId_idx" ON "SpaceFollow"("userId");

-- CreateIndex
CREATE INDEX "SpaceEvent_spaceId_createdAt_idx" ON "SpaceEvent"("spaceId", "createdAt");

