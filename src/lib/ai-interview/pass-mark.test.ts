import { describe, expect, it } from "vitest";
import { fullyRightNeeded, getScreeningVerdict, passMarkOf, SCREENING_PASS_THRESHOLD, verdictBands } from "./verdict";
import { suggestion } from "./console";
import { describeScore } from "@/lib/crm/results";

describe("pass mark", () => {
  it("defaults to 60 and clamps to the allowed range", () => {
    expect(passMarkOf(null)).toBe(SCREENING_PASS_THRESHOLD);
    expect(passMarkOf(undefined)).toBe(60);
    expect(passMarkOf(Number.NaN)).toBe(60);
    expect(passMarkOf(10)).toBe(30);
    expect(passMarkOf(120)).toBe(95);
    expect(passMarkOf(72.4)).toBe(72);
  });

  it("keeps the old bands at the default bar", () => {
    expect(verdictBands()).toEqual({ bar: 60, strong: 80, borderline: 40 });
    expect(getScreeningVerdict(79)?.tier).toBe("GOOD_FIT");
    expect(getScreeningVerdict(59)?.tier).toBe("BORDERLINE");
    expect(getScreeningVerdict(39)?.tier).toBe("NOT_A_FIT");
  });

  it("moves the bands with a screening's own bar", () => {
    expect(verdictBands(70)).toEqual({ bar: 70, strong: 80, borderline: 50 });
    expect(getScreeningVerdict(65, 70)?.passed).toBe(false);
    expect(getScreeningVerdict(65, 50)?.passed).toBe(true);
    // A bar above 80 lifts "strong" with it, so nothing below the bar reads as strong.
    expect(verdictBands(90)).toEqual({ bar: 90, strong: 90, borderline: 70 });
    expect(getScreeningVerdict(85, 90)?.tier).toBe("BORDERLINE");
  });

  it("labels suggestions and candidate results against the same bar", () => {
    expect(suggestion(65, null, 70)).toMatchObject({ label: "Borderline", aboveBar: false, detail: expect.stringContaining("bar of 70") });
    expect(suggestion(65, null, 50)).toMatchObject({ label: "Good match", aboveBar: true });
    expect(describeScore("ai_screening", 65, null, null, 70).passed).toBe(false);
    expect(describeScore("ai_screening", 65).passed).toBe(true);
  });

  it("explains a bar in fully right answers out of 10", () => {
    expect(fullyRightNeeded(60, 10)).toBe(6);
    expect(fullyRightNeeded(65, 10)).toBe(7);
    expect(fullyRightNeeded(80, 10)).toBe(8);
  });
});
