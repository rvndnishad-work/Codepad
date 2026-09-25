-- Theory rounds: spoken question-by-question rounds built from a questionnaire.
ALTER TABLE "AIScreeningRoundSpec" ADD COLUMN "theoryJson" TEXT;
ALTER TABLE "AIInterviewRound" ADD COLUMN "theoryJson" TEXT;
ALTER TABLE "AIInterviewRound" ADD COLUMN "answersJson" TEXT;
