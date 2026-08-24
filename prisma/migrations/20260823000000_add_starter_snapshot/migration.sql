-- AlterTable
ALTER TABLE "AIInterviewSession" ADD COLUMN IF NOT EXISTS "starterFilesJson" TEXT;
-- AlterTable
ALTER TABLE "AIInterviewRound" ADD COLUMN IF NOT EXISTS "starterFilesJson" TEXT;
