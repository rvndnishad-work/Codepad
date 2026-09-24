import { describe, expect, it } from "vitest";
import { buildStageSteps, movesFromAudit } from "@/lib/crm/history";

const NOW = new Date("2026-09-24T12:00:00Z").getTime();
const d = (days: number) => new Date(NOW - days * 86400000).toISOString();

describe("buildStageSteps", () => {
  it("dates each stage from the moves and counts days spent", () => {
    const { steps } = buildStageSteps({
      stage: "TAKE_HOME",
      createdAt: d(12),
      stageChangedAt: d(3),
      moves: [
        { from: "APPLIED", to: "SCREENED", at: d(11) },
        { from: "SCREENED", to: "TAKE_HOME", at: d(3) },
      ],
      now: NOW,
    });
    expect(steps.map((s) => [s.stage, s.state, s.days])).toEqual([
      ["APPLIED", "done", 1],
      ["SCREENED", "done", 8],
      ["TAKE_HOME", "now", 3],
      ["ONSITE", "todo", null],
      ["OFFER", "todo", null],
      ["HIRED", "todo", null],
    ]);
  });

  it("marks earlier stages done without a date when history is missing", () => {
    const { steps } = buildStageSteps({ stage: "ONSITE", createdAt: d(10), stageChangedAt: d(2), moves: [], now: NOW });
    expect(steps.slice(0, 4).map((s) => [s.stage, s.state, s.enteredAt === null])).toEqual([
      ["APPLIED", "done", true],
      ["SCREENED", "done", true],
      ["TAKE_HOME", "done", true],
      ["ONSITE", "now", false],
    ]);
  });

  it("stops a rejected candidate at the stage they were rejected from", () => {
    const r = buildStageSteps({
      stage: "REJECTED",
      createdAt: d(9),
      stageChangedAt: d(1),
      moves: [
        { from: "APPLIED", to: "SCREENED", at: d(6) },
        { from: "SCREENED", to: "REJECTED", at: d(1) },
      ],
      now: NOW,
    });
    expect(r.lastActiveStage).toBe("SCREENED");
    expect(r.rejectedAt).toBe(d(1));
    expect(r.steps.filter((s) => s.state !== "todo").map((s) => [s.stage, s.days])).toEqual([
      ["APPLIED", 3],
      ["SCREENED", 5],
    ]);
  });

  it("treats a rejection with no history as rejected from Applied", () => {
    const r = buildStageSteps({ stage: "REJECTED", createdAt: d(5), stageChangedAt: d(1), moves: [], now: NOW });
    expect(r.steps.filter((s) => s.state !== "todo").map((s) => s.stage)).toEqual(["APPLIED"]);
    expect(r.steps[0].days).toBe(4);
  });
});

describe("movesFromAudit", () => {
  it("reads stage moves and skips unreadable rows", () => {
    expect(
      movesFromAudit([
        { meta: JSON.stringify({ fromStage: "APPLIED", toStage: "SCREENED" }), createdAt: d(2) },
        { meta: "{bad", createdAt: d(1) },
        { meta: null, createdAt: d(1) },
      ]),
    ).toEqual([{ from: "APPLIED", to: "SCREENED", at: d(2) }]);
  });
});
