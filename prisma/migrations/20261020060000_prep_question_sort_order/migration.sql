-- Curated position of a question inside its technology + difficulty group.
-- Null means "not ordered yet": those rows keep sorting by views after the
-- ordered ones, so publishing works exactly as before until an admin orders
-- a topic.
ALTER TABLE "PrepQuestion" ADD COLUMN "sortOrder" INTEGER;

CREATE INDEX "PrepQuestion_technology_difficulty_sortOrder_idx"
  ON "PrepQuestion"("technology", "difficulty", "sortOrder");
