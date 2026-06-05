-- Recruiter profile fields. These were previously applied to local dev via
-- `prisma db push` but never captured as a migration, so production (which runs
-- `prisma migrate deploy`) was missing them. This migration backfills them.
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "companySize" TEXT,
ADD COLUMN     "jobTitle" TEXT;
