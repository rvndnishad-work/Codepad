-- AlterTable
ALTER TABLE "CreatorSpace" ADD COLUMN     "layout" JSONB;

-- CreateTable
CREATE TABLE "InterviewExperience" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT,
    "role" TEXT,
    "outcome" TEXT,
    "difficulty" TEXT,
    "summary" TEXT,
    "body" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewExperience_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InterviewExperience_spaceId_idx" ON "InterviewExperience"("spaceId");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewExperience_spaceId_slug_key" ON "InterviewExperience"("spaceId", "slug");
