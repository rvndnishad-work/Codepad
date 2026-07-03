-- CreateTable
CREATE TABLE "PrepJourney" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "techStack" TEXT NOT NULL DEFAULT '[]',
    "dailyMinutes" INTEGER NOT NULL DEFAULT 30,
    "totalDays" INTEGER NOT NULL,
    "targetDate" TIMESTAMP(3),
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrepJourney_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrepJourneyItem" (
    "id" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "day" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "itemType" TEXT NOT NULL,
    "refSlug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "technology" TEXT,
    "difficulty" TEXT,
    "estMinutes" INTEGER NOT NULL DEFAULT 8,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "PrepJourneyItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrepActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "minutes" INTEGER NOT NULL DEFAULT 0,
    "items" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PrepActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PrepJourney_userId_status_idx" ON "PrepJourney"("userId", "status");

-- CreateIndex
CREATE INDEX "PrepJourneyItem_journeyId_day_position_idx" ON "PrepJourneyItem"("journeyId", "day", "position");

-- CreateIndex
CREATE INDEX "PrepJourneyItem_journeyId_refSlug_idx" ON "PrepJourneyItem"("journeyId", "refSlug");

-- CreateIndex
CREATE UNIQUE INDEX "PrepActivity_userId_date_key" ON "PrepActivity"("userId", "date");

-- AddForeignKey
ALTER TABLE "PrepJourney" ADD CONSTRAINT "PrepJourney_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrepJourneyItem" ADD CONSTRAINT "PrepJourneyItem_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "PrepJourney"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrepActivity" ADD CONSTRAINT "PrepActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
