-- Candidates now stop at a screening decision (the ATS owns everything after).
-- Map the old pipeline onto New, Screening, Passed and Not passed (REJECTED).
UPDATE "Candidate" SET "stage" = CASE "stage"
  WHEN 'APPLIED' THEN 'NEW'
  WHEN 'SCREENED' THEN 'SCREENING'
  WHEN 'TAKE_HOME' THEN 'SCREENING'
  WHEN 'ONSITE' THEN 'SCREENING'
  WHEN 'OFFER' THEN 'PASSED'
  WHEN 'HIRED' THEN 'PASSED'
  ELSE "stage"
END
WHERE "stage" IN ('APPLIED', 'SCREENED', 'TAKE_HOME', 'ONSITE', 'OFFER', 'HIRED');

UPDATE "Candidate" SET "status" = 'passed' WHERE "status" = 'hired';

ALTER TABLE "Candidate" ALTER COLUMN "stage" SET DEFAULT 'NEW';
