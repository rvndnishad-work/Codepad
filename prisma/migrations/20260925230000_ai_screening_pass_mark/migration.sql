-- Per-screening pass mark. Null keeps the default bar of 60.
ALTER TABLE "AIScreeningBatch" ADD COLUMN "passMark" INTEGER;
