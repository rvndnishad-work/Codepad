-- Interviewers invited by email, without a workspace account
CREATE TABLE "InterviewGuest" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterviewGuest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InterviewGuest_token_key" ON "InterviewGuest"("token");

CREATE UNIQUE INDEX "InterviewGuest_sessionId_email_key" ON "InterviewGuest"("sessionId", "email");

ALTER TABLE "InterviewGuest" ADD CONSTRAINT "InterviewGuest_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "InterviewSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
