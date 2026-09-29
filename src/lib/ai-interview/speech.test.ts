import { describe, expect, it } from "vitest";
import { joinPhrases, transcriptOf } from "./speech";

describe("joinPhrases", () => {
  it("keeps separate phrases from desktop recognition", () => {
    expect(joinPhrases(["I have 18 years of experience", " in automobile", "mostly front office sales"])).toBe(
      "I have 18 years of experience in automobile mostly front office sales",
    );
  });

  it("folds cumulative phrases from mobile recognition", () => {
    expect(
      joinPhrases(["18", "18", "18 years", "18 years of", "18 years of experience", "18 years of experience in automobile"]),
    ).toBe("18 years of experience in automobile");
  });

  it("ignores case and punctuation when comparing, and drops shorter repeats", () => {
    expect(joinPhrases(["We work with", "we work with different verticals.", "We work with"])).toBe("we work with different verticals.");
  });

  it("starts a new phrase when the speech moves on", () => {
    expect(joinPhrases(["customer experience", "customer experience front office", "and then sales", "and then sales stop"])).toBe(
      "customer experience front office and then sales stop",
    );
  });

  it("reads a recognition result list", () => {
    const results = [[{ transcript: "hello" }], [{ transcript: "hello there" }], [{ transcript: " " }]];
    expect(transcriptOf(results)).toBe("hello there");
  });
});
