import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn() }));

import { validateArgs } from "./validate";
import { maskEmail, emailOut } from "./mask";
import { checkProposal, CREDIT_GRANT_MAX } from "./guards";
import { parseResponse, runToolLoop, callModel, MAX_TOOL_ROUNDS, NOT_CONFIGURED } from "./model";
import { TOOLS, runTool } from "./tools";
import { splitFollowUps } from "./prompt";
import { historyContents, titleFrom } from "./conversations";
import { applyEdits } from "./execute";
import type { Proposal } from "./types";

const ctx = { actor: { id: "u1", email: "a@b.c" } };

describe("tool declarations", () => {
  it("has unique snake_case names and required keys that exist", () => {
    const names = TOOLS.map((t) => t.decl.name);
    expect(new Set(names).size).toBe(names.length);
    for (const t of TOOLS) {
      expect(t.decl.name).toMatch(/^[a-z_]+$/);
      expect(t.decl.parameters.type).toBe("object");
      for (const r of t.decl.parameters.required ?? []) expect(t.decl.parameters.properties).toHaveProperty(r);
      expect(t.kind === "propose").toBe(t.decl.name.startsWith("propose_"));
    }
  });

  it("covers the read and proposal tools in the brief", () => {
    const names = new Set(TOOLS.map((t) => t.decl.name));
    for (const n of [
      "find_workspace", "get_workspace", "get_credit_ledger", "list_workspaces_needing_attention", "find_user", "get_user",
      "get_audit_log", "list_failed_jobs", "get_moderation_queue", "get_switches", "get_maintenance", "get_platform_stats",
      "list_trials_ending", "search_content", "propose_grant_credits", "propose_extend_trial", "propose_set_switch",
      "propose_schedule_maintenance", "propose_email_workspace_owner", "propose_moderate_blog", "propose_create_todo",
    ]) expect(names.has(n)).toBe(true);
  });
});

describe("validateArgs", () => {
  const schema = {
    type: "object" as const,
    properties: {
      q: { type: "string" as const, maxLength: 5 },
      n: { type: "integer" as const, minimum: 1, maximum: 10 },
      on: { type: "boolean" as const },
      kind: { type: "string" as const, enum: ["a", "b"] },
      at: { type: "string" as const, format: "date-time" as const },
    },
    required: ["q"],
  };

  it("drops unknown keys, trims, coerces numbers and booleans", () => {
    expect(validateArgs(schema, { q: " hi ", n: "3", on: "true", extra: 1 })).toEqual({ ok: true, args: { q: "hi", n: 3, on: true } });
  });

  it("rejects missing required, bad enum, out of range, fractions and bad dates", () => {
    expect(validateArgs(schema, {})).toEqual({ ok: false, error: "q is required" });
    expect(validateArgs(schema, { q: "" }).ok).toBe(false);
    expect(validateArgs(schema, { q: "x", kind: "c" }).ok).toBe(false);
    expect(validateArgs(schema, { q: "x", n: 11 }).ok).toBe(false);
    expect(validateArgs(schema, { q: "x", n: 2.5 }).ok).toBe(false);
    expect(validateArgs(schema, { q: "toolong" }).ok).toBe(false);
    expect(validateArgs(schema, { q: "x", at: "not a date" }).ok).toBe(false);
    expect(validateArgs(schema, null)).toEqual({ ok: false, error: "q is required" });
  });

  it("runTool returns validation errors to the model instead of throwing", async () => {
    const res = await runTool("propose_grant_credits", { workspaceId: "w1", amount: 5000, note: "x" }, ctx);
    expect(res.ok).toBe(false);
    expect(res.data).toEqual({ error: `amount must be at most ${CREDIT_GRANT_MAX}` });
    const unknown = await runTool("drop_tables", {}, ctx);
    expect(unknown.ok).toBe(false);
  });
});

describe("maskEmail", () => {
  it("masks the local part and the host", () => {
    expect(maskEmail("jane.doe@example.com")).toBe("ja***@ex***.com");
    expect(maskEmail("a@b.io")).toBe("a***@b***.io");
    expect(maskEmail("noatsign")).toBe("***");
    expect(maskEmail(null)).toBeNull();
  });
  it("reveals only when asked", () => {
    expect(emailOut("jane@example.com", true)).toBe("jane@example.com");
    expect(emailOut("jane@example.com", false)).toBe("ja***@ex***.com");
  });
});

describe("proposal guards", () => {
  const grant = (amount: unknown, note: unknown = "Covers the batch") => checkProposal("grant_credits", { workspaceId: "w1", amount, note });

  it("keeps credit grants between 1 and 1000", () => {
    expect(grant(0).ok).toBe(false);
    expect(grant(-5).ok).toBe(false);
    expect(grant(1001).ok).toBe(false);
    expect(grant(2.5).ok).toBe(false);
    expect(grant("abc").ok).toBe(false);
    expect(grant(1)).toMatchObject({ ok: true, args: { amount: 1, emailOwner: false } });
    expect(grant(1000).ok).toBe(true);
    expect(grant("20")).toMatchObject({ ok: true, args: { amount: 20 } });
  });

  it("requires a note on grants, trial extensions and switch changes", () => {
    expect(grant(20, "")).toEqual({ ok: false, error: "A ledger note is required" });
    expect(grant(20, "   ").ok).toBe(false);
    expect(checkProposal("extend_trial", { workspaceId: "w1", days: 7 }).ok).toBe(false);
    expect(checkProposal("extend_trial", { workspaceId: "w1", days: 7, note: "call" }).ok).toBe(true);
    expect(checkProposal("extend_trial", { workspaceId: "w1", days: 61, note: "call" }).ok).toBe(false);
    expect(checkProposal("set_switch", { key: "ai-screening", state: "off" }).ok).toBe(false);
    expect(checkProposal("set_switch", { key: "ai-screening", state: "off", note: "incident" }).ok).toBe(true);
  });

  it("checks switch keys, states and resume time", () => {
    const now = new Date("2026-10-02T10:00:00Z");
    expect(checkProposal("set_switch", { key: "nope", state: "off", note: "x" }, now).ok).toBe(false);
    expect(checkProposal("set_switch", { key: "ai-screening", state: "paused", note: "x" }, now).ok).toBe(false);
    expect(checkProposal("set_switch", { key: "ai-screening", state: "off", note: "x", resumeAt: "2026-10-01T00:00:00Z" }, now).ok).toBe(false);
    expect(checkProposal("set_switch", { key: "ai-screening", state: "on", note: "x", resumeAt: "2026-10-03T00:00:00Z" }, now).ok).toBe(false);
    expect(checkProposal("set_switch", { key: "ai-screening", state: "read_only", note: "x", resumeAt: "2026-10-03T00:00:00Z" }, now).ok).toBe(true);
  });

  it("checks maintenance windows", () => {
    const now = new Date("2026-10-02T10:00:00Z");
    const base = { area: "site", startsAt: "2026-10-03T06:00:00Z", minutes: 60, message: "Back soon" };
    expect(checkProposal("schedule_maintenance", base, now).ok).toBe(true);
    expect(checkProposal("schedule_maintenance", { ...base, area: "moon" }, now).ok).toBe(false);
    expect(checkProposal("schedule_maintenance", { ...base, startsAt: "2026-10-01T06:00:00Z" }, now).ok).toBe(false);
    expect(checkProposal("schedule_maintenance", { ...base, minutes: 2 }, now).ok).toBe(false);
    expect(checkProposal("schedule_maintenance", { ...base, message: "" }, now).ok).toBe(false);
  });

  it("requires a reason unless a blog is approved", () => {
    expect(checkProposal("moderate_blog", { postId: "p", action: "approve" }).ok).toBe(true);
    expect(checkProposal("moderate_blog", { postId: "p", action: "reject" }).ok).toBe(false);
    expect(checkProposal("moderate_blog", { postId: "p", action: "reject", reason: "spam" }).ok).toBe(true);
    expect(checkProposal("moderate_blog", { postId: "p", action: "delete", reason: "x" }).ok).toBe(false);
    expect(checkProposal("unknown_kind", {}).ok).toBe(false);
  });

  it("applies only editable fields from the card", () => {
    const p: Proposal = {
      kind: "grant_credits",
      args: { workspaceId: "w1", amount: 20, note: "a", emailOwner: false },
      summary: "",
      facts: [],
      fields: [
        { key: "amount", label: "Credits", input: "number" },
        { key: "note", label: "Note", input: "textarea" },
      ],
      approveLabel: "",
      status: "pending",
    };
    const merged = applyEdits(p, { amount: 30, workspaceId: "w2", note: "b" });
    expect(merged).toEqual({ workspaceId: "w1", amount: 30, note: "b", emailOwner: false });
    expect(checkProposal("grant_credits", applyEdits(p, { amount: 5000 })).ok).toBe(false);
  });
});

describe("parseResponse", () => {
  it("reads every part: text and several function calls", () => {
    const parsed = parseResponse({
      candidates: [
        {
          finishReason: "STOP",
          content: {
            role: "model",
            parts: [
              { text: "Let me check. " },
              { thought: true, text: "internal" },
              { functionCall: { name: "find_workspace", args: { query: "Northwind" } }, thoughtSignature: "sig" },
              { text: "And the jobs." },
              { functionCall: { name: "list_failed_jobs", id: "c2" } },
            ],
          },
        },
      ],
    });
    expect(parsed.text).toBe("Let me check. And the jobs.");
    expect(parsed.calls).toEqual([
      { name: "find_workspace", args: { query: "Northwind" } },
      { name: "list_failed_jobs", args: {}, id: "c2" },
    ]);
    expect(parsed.content?.parts).toHaveLength(5);
    expect((parsed.content?.parts[2] as { thoughtSignature?: string }).thoughtSignature).toBe("sig");
  });

  it("handles blocked and empty responses", () => {
    expect(parseResponse({ promptFeedback: { blockReason: "SAFETY" } })).toMatchObject({ text: "", calls: [], finishReason: "BLOCKED_SAFETY" });
    expect(parseResponse(null)).toMatchObject({ text: "", calls: [] });
  });
});

describe("model client", () => {
  const env = { ...process.env };
  beforeEach(() => {
    process.env.GEMINI_API_KEY = "test-key";
    delete process.env.ADMIN_ASSISTANT_MODEL;
  });
  afterEach(() => {
    process.env = { ...env };
  });

  const reply = (parts: unknown[]) =>
    new Response(JSON.stringify({ candidates: [{ content: { role: "model", parts }, finishReason: "STOP" }] }), { status: 200 });

  it("runs parallel calls, sends functionResponses back, and returns the final text", async () => {
    const bodies: { contents: { role: string; parts: Record<string, unknown>[] }[]; toolConfig?: unknown }[] = [];
    const urls: string[] = [];
    const fetchImpl = vi.fn(async (url: string, init: RequestInit) => {
      urls.push(url);
      bodies.push(JSON.parse(String(init.body)));
      return bodies.length === 1
        ? reply([{ text: "Checking." }, { functionCall: { name: "a", args: { x: 1 } } }, { functionCall: { name: "b", args: {} } }])
        : reply([{ text: "Northwind is past due." }]);
    }) as unknown as typeof fetch;
    const executed: string[] = [];
    const out = await runToolLoop({
      system: "sys",
      contents: [{ role: "user", parts: [{ text: "hi" }] }],
      tools: [],
      fetchImpl,
      execute: async (c) => {
        executed.push(c.name);
        return { result: c.name };
      },
    });
    expect(out).toEqual({ text: "Northwind is past due.", rounds: 1 });
    expect(executed).toEqual(["a", "b"]);
    expect(urls[0]).toContain("/models/gemini-2.5-flash:generateContent");
    const second = bodies[1].contents;
    expect(second).toHaveLength(3);
    expect(second[1].role).toBe("model");
    expect(second[2]).toEqual({
      role: "user",
      parts: [
        { functionResponse: { name: "a", response: { result: "a" } } },
        { functionResponse: { name: "b", response: { result: "b" } } },
      ],
    });
  });

  it("stops after the round limit and asks for a closing answer with tools off", async () => {
    let n = 0;
    const modes: unknown[] = [];
    const fetchImpl = vi.fn(async (_url: string, init: RequestInit) => {
      n++;
      const body = JSON.parse(String(init.body));
      modes.push(body.toolConfig?.functionCallingConfig?.mode);
      return body.toolConfig?.functionCallingConfig?.mode === "NONE"
        ? reply([{ text: "Here is what I found." }])
        : reply([{ functionCall: { name: "loop", args: {} } }]);
    }) as unknown as typeof fetch;
    const out = await runToolLoop({
      system: "s",
      contents: [{ role: "user", parts: [{ text: "hi" }] }],
      tools: [{ name: "loop", description: "d", parameters: { type: "object", properties: {} } }],
      fetchImpl,
      execute: async () => ({ ok: true }),
    });
    expect(out.text).toBe("Here is what I found.");
    expect(n).toBe(MAX_TOOL_ROUNDS + 1);
    expect(modes[MAX_TOOL_ROUNDS]).toBe("NONE");
  });

  it("surfaces API errors instead of a canned answer", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ error: { message: "Function calling is not enabled for this model" } }), { status: 400 }),
    ) as unknown as typeof fetch;
    await expect(callModel({ system: "s", contents: [], tools: [], fetchImpl })).rejects.toThrow(
      "The model rejected the request (400): Function calling is not enabled for this model",
    );
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("retries once on 503 and errors when the answer is empty", async () => {
    let n = 0;
    const fetchImpl = vi.fn(async () => {
      n++;
      return n === 1 ? new Response("{}", { status: 503 }) : reply([]);
    }) as unknown as typeof fetch;
    await expect(
      runToolLoop({ system: "s", contents: [], tools: [], fetchImpl, execute: async () => ({}) }),
    ).rejects.toThrow("The model returned no answer (finish reason STOP).");
    expect(n).toBe(2);
  });

  it("says it is not configured without a key", async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    await expect(callModel({ system: "s", contents: [], tools: [] })).rejects.toThrow(NOT_CONFIGURED);
  });

  it("uses GOOGLE_API_KEY and ADMIN_ASSISTANT_MODEL when set", async () => {
    delete process.env.GEMINI_API_KEY;
    process.env.GOOGLE_API_KEY = "g";
    process.env.ADMIN_ASSISTANT_MODEL = "gemini-2.5-pro";
    const fetchImpl = vi.fn(async (url: string, init: RequestInit) => {
      expect(url).toContain("gemini-2.5-pro:generateContent");
      expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe("g");
      return reply([{ text: "ok" }]);
    }) as unknown as typeof fetch;
    await expect(callModel({ system: "s", contents: [], tools: [], fetchImpl })).resolves.toMatchObject({ text: "ok" });
  });
});

describe("conversation helpers", () => {
  it("titles from the first question", () => {
    expect(titleFrom("  Why did   ai-screening-expiry fail?  ")).toBe("Why did ai-screening-expiry fail?");
    const long = titleFrom("Northwind is past due and almost out of credits. What is going on and what should I do?");
    expect(long.length).toBeLessThanOrEqual(61);
    expect(long.endsWith("…")).toBe(true);
  });

  it("builds alternating history with card status, starting with the user", () => {
    const h = historyContents([
      { role: "assistant", content: "orphan", proposal: null },
      { role: "user", content: "grant 20", proposal: null },
      { role: "assistant", content: "Prepared.", proposal: { summary: "Grant 20 AI credits to Northwind", status: "approved", result: "Granted." } },
      { role: "assistant", content: "", proposal: { summary: "Email the owner", status: "pending" } },
    ]);
    expect(h.map((c) => c.role)).toEqual(["user", "model"]);
    expect(h[1].parts).toHaveLength(2);
    expect(h[1].parts[0].text).toContain("Status: approved. Granted.");
  });

  it("splits Next: follow-ups off the answer", () => {
    expect(splitFollowUps("Done.\nNext: Prepare an email\n- Next: Check Globex")).toEqual({
      body: "Done.",
      followUps: ["Prepare an email", "Check Globex"],
    });
  });
});
