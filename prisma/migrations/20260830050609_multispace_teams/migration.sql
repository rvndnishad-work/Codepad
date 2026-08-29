-- Drop unique on ownerId if exists (v1 one-space-per-creator)
DROP INDEX IF EXISTS "CreatorSpace_ownerId_key";
CREATE INDEX IF NOT EXISTS "CreatorSpace_ownerId_idx" ON "CreatorSpace"("ownerId");

-- CreateTable SpaceMember
CREATE TABLE IF NOT EXISTS "SpaceMember" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SpaceMember_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "SpaceMember_spaceId_userId_key" ON "SpaceMember"("spaceId", "userId");
CREATE INDEX IF NOT EXISTS "SpaceMember_userId_idx" ON "SpaceMember"("userId");
CREATE INDEX IF NOT EXISTS "SpaceMember_spaceId_idx" ON "SpaceMember"("spaceId");

-- CreateTable SpaceDomain
CREATE TABLE IF NOT EXISTS "SpaceDomain" (
    "id" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "spaceId" TEXT NOT NULL,
    CONSTRAINT "SpaceDomain_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "SpaceDomain_hostname_key" ON "SpaceDomain"("hostname");
CREATE INDEX IF NOT EXISTS "SpaceDomain_spaceId_idx" ON "SpaceDomain"("spaceId");

-- AddForeignKey
ALTER TABLE "SpaceMember" ADD CONSTRAINT "SpaceMember_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "CreatorSpace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SpaceMember" ADD CONSTRAINT "SpaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SpaceDomain" ADD CONSTRAINT "SpaceDomain_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "CreatorSpace"("id") ON DELETE CASCADE ON UPDATE CASCADE;