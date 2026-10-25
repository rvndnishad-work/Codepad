import { describe, expect, it } from "vitest";
import { checkMove, checkSplit, movePlanCredits, splitPlanCredits } from "./credit-split";

describe("splitPlanCredits", () => {
  it("gives the oldest workspace everything while no split is set", () => {
    const s = splitPlanCredits(150, [
      { id: "old", share: null },
      { id: "new", share: null },
    ]);
    expect([...s.perWorkspace]).toEqual([["old", 150]]);
    expect(s.unassigned).toBe(0);
  });

  it("follows the split and leaves the rest unassigned", () => {
    const s = splitPlanCredits(150, [
      { id: "hiring", share: 100 },
      { id: "sales", share: 30 },
      { id: "ops", share: 0 },
    ]);
    expect(s.perWorkspace.get("hiring")).toBe(100);
    expect(s.perWorkspace.get("sales")).toBe(30);
    expect(s.perWorkspace.has("ops")).toBe(false);
    expect(s.unassigned).toBe(20);
  });

  it("never gives out more than the month's credits (after a downgrade)", () => {
    const s = splitPlanCredits(50, [
      { id: "a", share: 100 },
      { id: "b", share: 50 },
    ]);
    expect(s.perWorkspace.get("a")).toBe(50);
    expect(s.perWorkspace.has("b")).toBe(false);
    expect(s.unassigned).toBe(0);
  });

  it("keeps everything unassigned when the account has no workspace left", () => {
    expect(splitPlanCredits(400, []).unassigned).toBe(400);
  });
});

describe("checkSplit", () => {
  it("accepts a split within the plan and treats blanks as 0", () => {
    const r = checkSplit({ a: "100", b: "" }, ["a", "b"], 150);
    expect(r.ok && [...r.shares]).toEqual([["a", 100], ["b", 0]]);
  });
  it("refuses more than the plan's credits, and fractions", () => {
    expect(checkSplit({ a: 100, b: 60 }, ["a", "b"], 150)).toEqual({ ok: false, error: "That adds up to 160, but your plan has 150 credits a month." });
    expect(checkSplit({ a: 1.5 }, ["a"], 150).ok).toBe(false);
    expect(checkSplit({ a: -1 }, ["a"], 150).ok).toBe(false);
  });
});

describe("movePlanCredits", () => {
  it("moves plan credits first, older before this month's, keeping their expiry", () => {
    // 80 plan credits left: 30 from last month (expire next step), 50 from this month.
    const m = movePlanCredits({ left: 80, lastGrant: 50 }, 40);
    expect(m.from).toEqual({ left: 40, lastGrant: 40 });
    expect(m.add).toEqual({ left: 40, lastGrant: 10 });
  });

  it("moves bought credits once the plan credits run out", () => {
    const m = movePlanCredits({ left: 10, lastGrant: 10 }, 25);
    expect(m.from).toEqual({ left: 0, lastGrant: 0 });
    expect(m.add).toEqual({ left: 10, lastGrant: 10 });
  });

  it("copes with a last grant larger than what is left", () => {
    const m = movePlanCredits({ left: 5, lastGrant: 50 }, 5);
    expect(m.from).toEqual({ left: 0, lastGrant: 0 });
    expect(m.add).toEqual({ left: 5, lastGrant: 5 });
  });
});

describe("checkMove", () => {
  it("refuses moving to the same place, bad amounts, and more than is free", () => {
    expect(checkMove("a", "a", 5, 10).ok).toBe(false);
    expect(checkMove("a", "b", 0, 10).ok).toBe(false);
    expect(checkMove("a", "b", "2.5", 10).ok).toBe(false);
    expect(checkMove("a", "b", 11, 10)).toEqual({ ok: false, error: "Only 10 credits are free to move from there." });
    expect(checkMove("a", "b", "10", 10)).toEqual({ ok: true, amount: 10 });
  });
});
