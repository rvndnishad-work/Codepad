import { describe, expect, it } from "vitest";
import { growthToolsEnabled } from "@/lib/billing/trial";

const now = new Date("2026-09-26T12:00:00Z");
const tomorrow = new Date("2026-09-27T12:00:00Z");
const yesterday = new Date("2026-09-25T12:00:00Z");

describe("growthToolsEnabled", () => {
  it("is on for paid Growth and Enterprise plans", () => {
    expect(growthToolsEnabled({ planName: "GROWTH" }, now)).toBe(true);
    expect(growthToolsEnabled({ planName: "ENTERPRISE" }, now)).toBe(true);
  });

  it("is on during an unexpired trial, matching the unlocked sidebar", () => {
    expect(growthToolsEnabled({ planName: "FREE", trialEndsAt: tomorrow }, now)).toBe(true);
  });

  it("is off on Free once the trial has ended", () => {
    expect(growthToolsEnabled({ planName: "FREE", trialEndsAt: yesterday }, now)).toBe(false);
    expect(growthToolsEnabled({ planName: "FREE" }, now)).toBe(false);
  });
});
