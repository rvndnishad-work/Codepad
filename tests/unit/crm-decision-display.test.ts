import { describe, expect, it } from "vitest";
import { describeAudit } from "@/lib/crm/activity";
import { describeScore, type CandidateResult } from "@/lib/crm/results";
import { passOverrides } from "@/lib/crm/roster";

const lookups = { batch: () => null, member: () => null };
const row = (meta: Record<string, unknown>) =>
  describeAudit(
    { id: "a1", action: "PIPELINE_STAGE_CHANGED", meta: JSON.stringify(meta), actorName: "Arvind", createdAt: "2026-09-24T10:00:00Z" },
    lookups,
  );

const ai = (score: number): CandidateResult => ({
  id: "r1",
  candidateId: "c1",
  kind: "ai_screening",
  title: "Lead Frontend Engineer",
  state: "scored",
  score,
  rating: null,
  ...describeScore("ai_screening", score),
  sentAt: "2026-08-20T10:00:00Z",
  startedAt: null,
  finishedAt: "2026-08-21T10:00:00Z",
  deadlineAt: null,
  scheduledAt: null,
  minutesTaken: null,
  minutesAllowed: null,
  href: null,
});

describe("decision in the activity log", () => {
  it("labels a manual override pass with who and why", () => {
    expect(row({ fromStage: "SCREENING", toStage: "PASSED", manualOverride: "AI screening 5, Not a fit" })).toMatchObject({
      title: "Passed as a manual override",
      detail: "By Arvind · AI screening 5, Not a fit",
    });
  });

  it("keeps a clean pass plain", () => {
    expect(row({ fromStage: "SCREENING", toStage: "PASSED" })).toMatchObject({ title: "Passed screening", detail: "By Arvind" });
  });
});

describe("passOverrides", () => {
  it("lists only undecided candidates whose results do not back a pass", () => {
    const rows = [
      { id: "c1", name: "Asha Rao", stage: "SCREENING", results: [ai(5)] },
      { id: "c2", name: "Ben Ito", stage: "SCREENING", results: [ai(88)] },
      { id: "c3", name: "Cleo Park", stage: "PASSED", results: [ai(10)] },
      { id: "c4", name: "Dev Shah", stage: "NEW", results: [] },
    ];
    expect(passOverrides(rows)).toEqual([
      { id: "c1", name: "Asha Rao", reason: "AI screening 5, Not a fit" },
      { id: "c4", name: "Dev Shah", reason: "No scored results yet" },
    ]);
  });
});
