import { describe, expect, it } from "vitest";
import { conversationFallback, substantiveTurns, transcriptForRound, clampConversation } from "@/lib/ai-interview/conversation";

const chat = [
  { role: "assistant" as const, text: "Hi", roundId: "r1" },
  { role: "user" as const, text: "I led a team of five on a renewal push", roundId: "r1" },
  { role: "assistant" as const, text: "Next", roundId: "r2" },
  { role: "user" as const, text: "ok", roundId: "r2" },
];

describe("conversation rounds", () => {
  it("splits a shared chat by round", () => {
    expect(transcriptForRound(chat, "r2", false).map((m) => m.text)).toEqual(["Next", "ok"]);
  });
  it("uses the whole untagged log only for a single-round session", () => {
    const old = chat.map(({ role, text }) => ({ role, text }));
    expect(transcriptForRound(old, "r1", true)).toHaveLength(4);
    expect(transcriptForRound(old, "r1", false)).toHaveLength(0);
  });
  it("counts only answers of five words or more", () => {
    expect(substantiveTurns(chat)).toBe(1);
  });
  it("caps a barely answered round below 10", () => {
    expect(clampConversation({ score: 80, codeQuality: 4, problemSolving: 4, communication: 4, aiSummary: "" }, 1).score).toBe(9);
  });
  it("keeps the no-model fallback low and honest", () => {
    const g = conversationFallback(chat);
    expect(g.score).toBeLessThanOrEqual(9);
    expect(g.aiSummary).toMatch(/Not scored by the AI/);
  });
});
