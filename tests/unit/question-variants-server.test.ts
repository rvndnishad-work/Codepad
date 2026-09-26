import { beforeEach, describe, expect, it, vi } from "vitest";

const callGemini = vi.fn();
const executeBatch = vi.fn();
const runUnitJs = vi.fn();
let apiKey: string | null = "k";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/ai-interview/gemini", () => ({
  callGemini: (...a: unknown[]) => callGemini(...a),
  extractText: (parts: { text: string }[]) => parts.map((p) => p.text).join(""),
  geminiApiKey: () => apiKey,
}));
vi.mock("@/lib/judge/run", () => ({ executeBatch: (...a: unknown[]) => executeBatch(...a) }));
vi.mock("@/lib/judge/unit-js", () => ({ runUnitJs: (...a: unknown[]) => runUnitJs(...a) }));

import { checkDraft, generateDraft, variantsConfigured, VariantError, type VariantOrigin } from "@/lib/library/variants-server";
import { PistonUnavailableError } from "@/lib/piston";

const reply = (o: unknown) => ({ parts: [{ text: "```json\n" + JSON.stringify(o) + "\n```" }], finishReason: "STOP" });

const bank: VariantOrigin = { kind: "bank", id: "q1", slug: "debounce", title: "Debounce a search input", answer: "Use a timer", technology: "javascript", difficulty: "medium" };

const harness: VariantOrigin = {
  kind: "challenge",
  id: "c1",
  slug: "sum",
  title: "Sum",
  description: "Add them up",
  difficulty: "easy",
  category: null,
  tags: null,
  estimatedMinutes: 15,
  step: {
    judgingMode: "harness",
    template: "vanilla",
    starterFiles: {},
    testFiles: {},
    functionName: "sumAll",
    signatureJson: "{}",
    languagesJson: '["python","javascript"]',
    starterCodeJson: null,
    contract: { functionName: "sumAll", params: [{ name: "xs", type: "int[]" }], returnType: "int" },
    languages: ["python", "javascript"],
    references: { python: "def sumAll(xs): return sum(xs)" },
    harnessTests: [{ argsJson: "[[1,2]]" }],
    estimatedMinutes: 15,
  },
};

const tests = [
  { name: "a", args: [[1, 2]], expected: 3 },
  { name: "b", args: [[]], expected: 0 },
  { name: "c", args: [[5]], expected: 5 },
  { name: "d", args: [[-1, 1]], expected: 0 },
];

beforeEach(() => {
  apiKey = "k";
  callGemini.mockReset();
  executeBatch.mockReset();
  runUnitJs.mockReset();
});

describe("variantsConfigured", () => {
  it("follows the AI key", () => {
    expect(variantsConfigured()).toBe(true);
    apiKey = null;
    expect(variantsConfigured()).toBe(false);
  });
});

describe("generateDraft", () => {
  it("turns a model reply into a bank draft", async () => {
    callGemini.mockResolvedValue(reply({ title: "Stock lookup", question: "How would you delay a lookup?", answer: "A timer." }));
    const d = await generateDraft(bank);
    expect(d).toMatchObject({ kind: "bank", prompt: "How would you delay a lookup?" });
    expect(callGemini.mock.calls[0][0].contents[0].parts[0].text).toContain("Debounce a search input");
  });

  it("retries once on a bad reply, then gives up with a plain message", async () => {
    callGemini.mockResolvedValue({ parts: [{ text: "sorry" }], finishReason: "STOP" });
    await expect(generateDraft(bank)).rejects.toThrow(VariantError);
    expect(callGemini).toHaveBeenCalledTimes(2);
  });

  it("writes the harness reference in the language that has one", async () => {
    callGemini.mockResolvedValue(reply({ title: "Totals", description: "Add prices", reference: "def sumAll(xs): return sum(xs)", tests }));
    const d = await generateDraft(harness);
    expect(d).toMatchObject({ mode: "harness", language: "python" });
  });

  it("says so when there is no AI key", async () => {
    apiKey = null;
    await expect(generateDraft(bank)).rejects.toThrow(/not set up/);
  });
});

describe("checkDraft", () => {
  const draft = { kind: "challenge" as const, mode: "harness" as const, title: "T", prompt: "D", language: "python", reference: "r", tests };

  it("passes when the reference matches every expected value", async () => {
    executeBatch.mockResolvedValue({ outputs: tests.map((t) => ({ raw: String(t.expected), value: t.expected })), logs: [] });
    const r = await checkDraft(harness, draft);
    expect(r.check).toEqual({ status: "passed", passed: 4, total: 4 });
    expect(r.expectedRaw).toEqual(["3", "0", "5", "0"]);
  });

  it("fails when the reference disagrees with a case", async () => {
    executeBatch.mockResolvedValue({ outputs: tests.map((t, i) => (i === 1 ? { raw: "7", value: 7 } : { raw: String(t.expected), value: t.expected })), logs: [] });
    const r = await checkDraft(harness, draft);
    expect(r.check).toMatchObject({ status: "failed", passed: 3, total: 4 });
    if (r.check.status === "failed") expect(r.check.detail).toContain("b: expected 0");
  });

  it("fails on a compile error", async () => {
    executeBatch.mockResolvedValue({ outputs: [], compileError: true, logs: [] });
    expect((await checkDraft(harness, draft)).check).toMatchObject({ status: "failed", passed: 0 });
  });

  it("reports an unreachable code runner plainly", async () => {
    executeBatch.mockRejectedValue(new PistonUnavailableError("down"));
    await expect(checkDraft(harness, draft)).rejects.toThrow(/code runner is not reachable/);
  });

  it("runs unit tests against the solution files", async () => {
    runUnitJs.mockResolvedValue({ results: [{ name: "x", status: "pass" }], passed: 1, total: 1, score: 100 });
    const unit = { kind: "challenge" as const, mode: "unit-js" as const, title: "T", prompt: "D", starterFiles: { "/a.ts": "" }, testFiles: { "/a.test.ts": "t" }, solutionFiles: { "/a.ts": "s" } };
    const r = await checkDraft(harness, unit);
    expect(r.check).toEqual({ status: "passed", passed: 1, total: 1 });
    expect(runUnitJs.mock.calls[0][0]).toMatchObject({ sourceFiles: { "/a.ts": "s" }, language: "typescript" });
  });

  it("has nothing to run for bank questions", async () => {
    expect((await checkDraft(bank, { kind: "bank", title: "T", prompt: "Q", answer: "A" })).check).toEqual({ status: "none" });
  });
});
