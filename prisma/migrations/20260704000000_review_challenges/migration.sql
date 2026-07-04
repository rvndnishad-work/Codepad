-- CreateTable
CREATE TABLE "ReviewChallenge" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL DEFAULT 'intermediate',
    "code" TEXT NOT NULL,
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 10,
    "timeLimitSec" INTEGER NOT NULL DEFAULT 120,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewFinding" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "lineStart" INTEGER NOT NULL,
    "lineEnd" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 10,

    CONSTRAINT "ReviewFinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewAttempt" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "userId" TEXT,
    "marks" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "foundCount" INTEGER NOT NULL,
    "partialCount" INTEGER NOT NULL,
    "totalFindings" INTEGER NOT NULL,
    "falsePositives" INTEGER NOT NULL,
    "durationSec" INTEGER,
    "mode" TEXT NOT NULL DEFAULT 'standard',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReviewChallenge_slug_key" ON "ReviewChallenge"("slug");

-- CreateIndex
CREATE INDEX "ReviewChallenge_published_sortOrder_idx" ON "ReviewChallenge"("published", "sortOrder");

-- CreateIndex
CREATE INDEX "ReviewChallenge_language_difficulty_idx" ON "ReviewChallenge"("language", "difficulty");

-- CreateIndex
CREATE INDEX "ReviewFinding_challengeId_idx" ON "ReviewFinding"("challengeId");

-- CreateIndex
CREATE INDEX "ReviewAttempt_challengeId_idx" ON "ReviewAttempt"("challengeId");

-- CreateIndex
CREATE INDEX "ReviewAttempt_userId_idx" ON "ReviewAttempt"("userId");

-- CreateIndex
CREATE INDEX "ReviewAttempt_mode_score_idx" ON "ReviewAttempt"("mode", "score");

-- AddForeignKey
ALTER TABLE "ReviewFinding" ADD CONSTRAINT "ReviewFinding_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "ReviewChallenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewAttempt" ADD CONSTRAINT "ReviewAttempt_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "ReviewChallenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
