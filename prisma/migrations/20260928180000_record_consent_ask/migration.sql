-- In-room recording consent requests.
ALTER TABLE "InterviewSession" ADD COLUMN "recordAskedAt" TIMESTAMP(3),
ADD COLUMN "recordAskedById" TEXT,
ADD COLUMN "recordAskedByName" TEXT,
ADD COLUMN "recordAskPrevConsentAt" TIMESTAMP(3),
ADD COLUMN "recordDeclinedAt" TIMESTAMP(3);
