import { describe, expect, it } from "vitest";
import {
  cleanBankDraft,
  cleanClientDraft,
  cleanHarnessDraft,
  cleanUnitDraft,
  extractJsonObject,
  parseContract,
  pickReferenceLanguage,
  variantSlug,
  VariantShapeError,
} from "@/lib/library/variants";
import type { Contract } from "@/lib/judge/types";

const contract: Contract = { functionName: "sumAll", params: [{ name: "xs", type: "int[]" }], returnType: "int" };
const cases = (n: number) => Array.from({ length: n }, (_, i) => ({ name: `c${i}`, args: [[i, 1]], expected: i + 1 }));

describe("extractJsonObject", () => {
  it("reads JSON wrapped in a code fence and chatter", () => {
    expect(extractJsonObject('Sure!\n```json\n{"a": 1}\n```')).toEqual({ a: 1 });
  });
  it("rejects replies without JSON", () => {
    expect(() => extractJsonObject("no json here")).toThrow(VariantShapeError);
    expect(() => extractJsonObject("{not json}")).toThrow(VariantShapeError);
  });
});

describe("cleanBankDraft", () => {
  it("keeps question, answer and a title", () => {
    const d = cleanBankDraft({ title: "Stock lookup", question: " How would you debounce a lookup? ", answer: "Use a timer." });
    expect(d).toEqual({ kind: "bank", title: "Stock lookup", prompt: "How would you debounce a lookup?", answer: "Use a timer." });
  });
  it("falls back to the question for the title", () => {
    expect(cleanBankDraft({ question: "Q?", answer: "A" }).title).toBe("Q?");
  });
  it("rejects a missing answer or an overlong question", () => {
    expect(() => cleanBankDraft({ question: "Q?" })).toThrow(/reference answer/);
    expect(() => cleanBankDraft({ question: "x".repeat(601), answer: "A" })).toThrow(/too long/);
  });
});

describe("cleanHarnessDraft", () => {
  it("accepts a well formed draft", () => {
    const d = cleanHarnessDraft({ title: "T", description: "D", reference: "function sumAll(xs){}", tests: cases(5) }, contract, "javascript");
    expect(d.kind).toBe("challenge");
    if (d.mode !== "harness") throw new Error("mode");
    expect(d.tests).toHaveLength(5);
    expect(d.language).toBe("javascript");
  });
  it("needs the right number of arguments", () => {
    const tests = cases(5);
    tests[2] = { name: "bad", args: [[1], 2] as never, expected: 1 };
    expect(() => cleanHarnessDraft({ title: "T", description: "D", reference: "r", tests }, contract, "javascript")).toThrow(/Test 3/);
  });
  it("needs enough cases", () => {
    expect(() => cleanHarnessDraft({ title: "T", description: "D", reference: "r", tests: cases(2) }, contract, "javascript")).toThrow(/at least/);
  });
  it("caps the number of cases", () => {
    const d = cleanHarnessDraft({ title: "T", description: "D", reference: "r", tests: cases(40) }, contract, "javascript");
    if (d.mode !== "harness") throw new Error("mode");
    expect(d.tests.length).toBe(16);
  });
});

describe("cleanUnitDraft", () => {
  const original = { starterFiles: { "/index.ts": "export function f() {}" }, testFiles: { "/index.test.ts": "test()" } };
  it("keeps the original file paths", () => {
    const d = cleanUnitDraft(
      { title: "T", description: "D", starterFiles: { "index.ts": "s" }, testFiles: { "/index.test.ts": "t" }, solutionFiles: { "/index.ts": "sol" } },
      original,
    );
    if (d.mode !== "unit-js") throw new Error("mode");
    expect(Object.keys(d.starterFiles)).toEqual(["/index.ts"]);
  });
  it("rejects a draft that drops a file or climbs out of the project", () => {
    expect(() => cleanUnitDraft({ title: "T", description: "D", starterFiles: { "/other.ts": "s" }, testFiles: { "/index.test.ts": "t" }, solutionFiles: { "/index.ts": "x" } }, original)).toThrow(/keep the file/);
    expect(() => cleanUnitDraft({ title: "T", description: "D", starterFiles: { "/../x.ts": "s" }, testFiles: {}, solutionFiles: {} }, original)).toThrow(/Bad file path/);
  });
});

describe("cleanClientDraft", () => {
  it("rechecks an edited bank draft", () => {
    expect(cleanClientDraft({ kind: "bank", title: "T", prompt: "Q?", answer: "A" }, { kind: "bank" })).toMatchObject({ prompt: "Q?", answer: "A" });
  });
  it("refuses a draft for a different mode or language", () => {
    const harness = { mode: "harness", title: "T", prompt: "D", language: "python", reference: "r", tests: cases(5) };
    expect(() => cleanClientDraft(harness, { kind: "challenge", mode: "unit-js" })).toThrow(/does not match/);
    expect(() => cleanClientDraft(harness, { kind: "challenge", mode: "harness", contract, language: "javascript" })).toThrow(/does not match/);
    expect(cleanClientDraft(harness, { kind: "challenge", mode: "harness", contract, language: "python" })).toMatchObject({ mode: "harness" });
  });
});

describe("parseContract", () => {
  it("parses a valid signature", () => {
    expect(parseContract("sumAll", JSON.stringify({ params: [{ name: "xs", type: "int[]" }], returnType: "int" }))).toEqual(contract);
  });
  it("rejects bad types and missing parts", () => {
    expect(parseContract("f", JSON.stringify({ params: [{ name: "x", type: "tree" }], returnType: "int" }))).toBeNull();
    expect(parseContract(null, "{}")).toBeNull();
    expect(parseContract("f", "not json")).toBeNull();
  });
});

describe("pickReferenceLanguage", () => {
  const all = () => true;
  it("prefers a friendly language that already has a reference", () => {
    expect(pickReferenceLanguage(["go", "python", "java"], { go: "x", python: "y" }, all)).toBe("python");
  });
  it("uses any language with a reference before one without", () => {
    expect(pickReferenceLanguage(["go", "python"], { go: "x" }, all)).toBe("go");
  });
  it("falls back to an enabled language", () => {
    expect(pickReferenceLanguage(["go", "python"], {}, all)).toBe("python");
    expect(pickReferenceLanguage(["cobol"], {}, () => false)).toBeNull();
  });
});

describe("variantSlug", () => {
  it("appends a short random suffix", () => {
    expect(variantSlug("debounce-search", () => 0)).toBe("debounce-search-v-aaaaaa");
    expect(variantSlug("x".repeat(80)).length).toBeLessThanOrEqual(69);
  });
});
