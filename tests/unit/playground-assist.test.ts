import { describe, expect, it } from "vitest";
import {
  ASSIST_SCOPE_REFUSAL,
  PLAYGROUND_ASSIST_DAILY_LIMIT,
  PLAYGROUND_ASSIST_MAX_CODE_CHARS,
  PLAYGROUND_ASSIST_MAX_HISTORY_MESSAGES,
  PLAYGROUND_ASSIST_MAX_MESSAGE_CHARS,
  buildMessages,
  buildSystemPrompt,
  sanitizeAssistSettings,
  truncate,
  validateAssistMessage,
} from "@/lib/playground-assist";

describe("playground-assist contract", () => {
  it("caps the daily budget at 5", () => {
    expect(PLAYGROUND_ASSIST_DAILY_LIMIT).toBe(5);
  });

  it("validates message shape", () => {
    expect(validateAssistMessage("  explain this  ")).toEqual({
      ok: true,
      message: "explain this",
    });
    expect(validateAssistMessage("   ").ok).toBe(false);
    expect(validateAssistMessage("").ok).toBe(false);
    expect(validateAssistMessage(undefined).ok).toBe(false);
    expect(
      validateAssistMessage("x".repeat(PLAYGROUND_ASSIST_MAX_MESSAGE_CHARS + 1)).ok,
    ).toBe(false);
  });

  it("scopes the system prompt to the playground code", () => {
    const prompt = buildSystemPrompt("My Loop Question");
    expect(prompt).toContain("My Loop Question");
    expect(prompt).toMatch(/only.*code/i);
    expect(prompt).toContain(ASSIST_SCOPE_REFUSAL);
  });

  it("falls back to a default label", () => {
    expect(buildSystemPrompt("   ")).toContain("Untitled playground");
  });

  it("truncates long code context", () => {
    const msgs = buildMessages({
      history: [],
      message: "why?",
      fileName: "/App.js",
      code: "x".repeat(PLAYGROUND_ASSIST_MAX_CODE_CHARS + 100),
      contextLabel: "t",
    });
    const userTurn = msgs[msgs.length - 1];
    expect(userTurn.role).toBe("user");
    expect(String(userTurn.content)).toContain("[truncated]");
    expect(String(userTurn.content).length).toBeLessThan(
      PLAYGROUND_ASSIST_MAX_CODE_CHARS + 1000,
    );
  });

  it("replays only recent history", () => {
    const history = Array.from({ length: 10 }, (_, i) => ({
      role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
      text: `turn ${i}`,
    }));
    const msgs = buildMessages({
      history,
      message: "again?",
      fileName: "/App.js",
      code: "code",
      contextLabel: "t",
    });
    // system + capped history + current turn
    expect(msgs).toHaveLength(1 + PLAYGROUND_ASSIST_MAX_HISTORY_MESSAGES + 1);
    expect(msgs[0].role).toBe("system");
  });

  it("truncate is a no-op under the cap", () => {
    expect(truncate("short", 100)).toBe("short");
  });

  it("sanitizes admin assist settings", () => {
    expect(sanitizeAssistSettings({ enabled: true, dailyLimit: 10 })).toEqual({
      enabled: true,
      dailyLimit: 10,
    });
    // Missing/invalid falls back to current defaults (enabled).
    expect(sanitizeAssistSettings(undefined)).toEqual({
      enabled: true,
      dailyLimit: PLAYGROUND_ASSIST_DAILY_LIMIT,
    });
    expect(sanitizeAssistSettings({ enabled: false, dailyLimit: 3 })).toEqual({
      enabled: false,
      dailyLimit: 3,
    });
    // Clamped so a typo can't lock everyone out or open the wallet.
    expect(sanitizeAssistSettings({ enabled: true, dailyLimit: 0 }).dailyLimit).toBe(1);
    expect(
      sanitizeAssistSettings({ enabled: true, dailyLimit: 10000 }).dailyLimit,
    ).toBe(100);
    expect(
      sanitizeAssistSettings({ enabled: true, dailyLimit: "lots" }).dailyLimit,
    ).toBe(PLAYGROUND_ASSIST_DAILY_LIMIT);
  });
});
