/**
 * Stage semantics for MCP write tools: keys move candidates between New,
 * Screening and Not passed, and never pass anyone or undo a pass.
 */
import { describe, expect, it } from "vitest";
import { PASS_REFUSAL, UNPASS_REFUSAL, planStageChange } from "@/lib/mcp/stage";

const NOW = new Date("2026-09-26T12:00:00.000Z");
const cand = (stage: string, status = "active") => ({ stage, status });

describe("planStageChange", () => {
  it("refuses every way of passing someone", () => {
    for (const req of [{ stage: "passed" as const }, { status: "passed" as const }, { status: "hired" as const }]) {
      expect(planStageChange(cand("SCREENING"), req, NOW)).toEqual({ ok: false, error: PASS_REFUSAL });
    }
  });

  it("never moves a candidate a recruiter passed", () => {
    for (const req of [{ stage: "not_passed" as const }, { stage: "screening" as const }, { status: "rejected" as const }, { status: "active" as const }]) {
      expect(planStageChange(cand("PASSED", "passed"), req, NOW)).toEqual({ ok: false, error: UNPASS_REFUSAL });
    }
    // Legacy stored stages that mean Passed are protected too.
    expect(planStageChange(cand("HIRED", "hired"), { stage: "new" }, NOW)).toEqual({ ok: false, error: UNPASS_REFUSAL });
  });

  it("marks someone not passed with a reason", () => {
    expect(planStageChange(cand("SCREENING"), { stage: "not_passed", rejectReason: "SKILL_GAP" }, NOW)).toEqual({
      ok: true,
      data: { stage: "REJECTED", rejectReason: "SKILL_GAP", stageChangedAt: NOW, status: "rejected" },
      fromStage: "SCREENING",
      toStage: "REJECTED",
      status: "rejected",
    });
  });

  it("treats the old rejected status the same, with reason Other", () => {
    const plan = planStageChange(cand("NEW"), { status: "rejected" }, NOW);
    expect(plan).toMatchObject({ ok: true, toStage: "REJECTED", data: { stage: "REJECTED", rejectReason: "OTHER", status: "rejected" } });
  });

  it("moves between New and Screening and reopens a Not passed candidate", () => {
    expect(planStageChange(cand("NEW"), { stage: "screening" }, NOW)).toEqual({
      ok: true,
      data: { stage: "SCREENING", stageChangedAt: NOW },
      fromStage: "NEW",
      toStage: "SCREENING",
      status: "active",
    });
    expect(planStageChange(cand("REJECTED", "rejected"), { stage: "new" }, NOW)).toEqual({
      ok: true,
      data: { stage: "NEW", stageChangedAt: NOW, rejectReason: null, rejectReasonNote: null, status: "active" },
      fromStage: "REJECTED",
      toStage: "NEW",
      status: "active",
    });
  });

  it("changes nothing when the candidate is already there", () => {
    expect(planStageChange(cand("SCREENING"), { stage: "screening" }, NOW)).toMatchObject({ ok: true, data: {}, toStage: null });
  });

  it("archives without touching the stage, and keeps archived people archived", () => {
    expect(planStageChange(cand("SCREENING"), { status: "archived" }, NOW)).toMatchObject({ ok: true, data: { status: "archived" }, toStage: null });
    expect(planStageChange(cand("NEW", "archived"), { stage: "screening" }, NOW)).toMatchObject({
      ok: true,
      data: { stage: "SCREENING", stageChangedAt: NOW },
      status: "archived",
    });
    expect(planStageChange(cand("NEW", "archived"), { status: "active" }, NOW)).toMatchObject({ ok: true, data: { status: "active" } });
  });

  it("needs a stage or status", () => {
    expect(planStageChange(cand("NEW"), {}, NOW)).toMatchObject({ ok: false });
  });
});
