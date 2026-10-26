import { describe, expect, it } from "vitest";
import { groupRounds, levelDifficulties, pickKey, roleById, sanitizeAiSettings, sessionTitle, suggestedPeerLength } from "@/lib/mock-interview/roles";

describe("mock interview roles", () => {
  it("groups neighbouring spoken picks into one round and keeps coding picks separate", () => {
    const rounds = groupRounds([{ kind: "question" }, { kind: "design" }, { kind: "coding" }, { kind: "question" }, { kind: "coding" }]);
    expect(rounds.map((r) => (r.kind === "talk" ? `talk:${r.picks.length}` : "coding"))).toEqual(["talk:2", "coding", "talk:1", "coding"]);
  });

  it("falls back to the first role for an unknown id", () => {
    expect(roleById("nope").id).toBe("frontend");
    expect(roleById("backend").label).toBe("Backend engineer");
  });

  it("leans suggestions by level", () => {
    expect(levelDifficulties("junior")).toEqual(["easy", "medium"]);
    expect(levelDifficulties("senior")[0]).toBe("hard");
  });

  it("cleans AI settings from the client", () => {
    expect(sanitizeAiSettings({ answerMode: "typing", followUps: 7, secondsPerQuestion: 999 })).toEqual({ answerMode: "typing", followUps: 1, secondsPerQuestion: 180 });
    expect(sanitizeAiSettings(null)).toEqual({ answerMode: "voice", followUps: 1, secondsPerQuestion: 180 });
  });

  it("rounds the peer room up to an offered length", () => {
    expect(suggestedPeerLength([{ minutes: 20 }])).toBe(30);
    expect(suggestedPeerLength([{ minutes: 50 }])).toBe(60);
    expect(suggestedPeerLength([{ minutes: 200 }])).toBe(90);
  });

  it("keys question and coding picks apart and names sessions", () => {
    expect(pickKey({ kind: "design", id: "a" })).toBe(pickKey({ kind: "question", id: "a" }));
    expect(pickKey({ kind: "coding", id: "a" })).not.toBe(pickKey({ kind: "question", id: "a" }));
    expect(sessionTitle("ai", roleById("dsa"), "senior")).toBe("Senior algorithms round mock with AI");
  });
});
