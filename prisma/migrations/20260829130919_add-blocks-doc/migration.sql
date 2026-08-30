-- AlterTable
ALTER TABLE "CreatorSpace" ADD COLUMN "blocks" JSONB,
ADD COLUMN "styles" JSONB;

-- CreateTable
CREATE TABLE "SpaceVersion" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "blocks" JSONB NOT NULL,
    "styles" JSONB,
    "actorId" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SpaceVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SpaceVersion_spaceId_publishedAt_idx" ON "SpaceVersion"("spaceId", "publishedAt");

-- AddForeignKey
ALTER TABLE "SpaceVersion" ADD CONSTRAINT "SpaceVersion_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "CreatorSpace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
