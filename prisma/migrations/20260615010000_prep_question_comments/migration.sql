-- CreateTable
CREATE TABLE "PrepQuestionComment" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrepQuestionComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PrepQuestionComment_questionId_idx" ON "PrepQuestionComment"("questionId");

-- CreateIndex
CREATE INDEX "PrepQuestionComment_userId_idx" ON "PrepQuestionComment"("userId");

-- AddForeignKey
ALTER TABLE "PrepQuestionComment" ADD CONSTRAINT "PrepQuestionComment_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "PrepQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrepQuestionComment" ADD CONSTRAINT "PrepQuestionComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
