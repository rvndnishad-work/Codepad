/**
 * Server-side runner for legacy JS/TS "unit" challenges (judgingMode "unit-js").
 *
 * Existing challenges ship hidden Jest-style test files (`import { solve } from
 * "./index"` + describe/test/expect). Historically these ran in the browser via
 * Sandpack and the client reported pass/fail — which the server trusted. This
 * module instead bundles the candidate's source + the hidden tests into a single
 * program with a minimal Jest-compatible shim and runs it on Piston, so grading
 * is server-authoritative. No content rewrite is required.
 *
 * Scope: the common Jest subset our authored challenges use — describe/test/it,
 * expect with toBe/toEqual/toStrictEqual/toContain/toThrow/toBeCloseTo/
 * truthiness/null/instanceof/comparisons, `.not`, `.resolves`/`.rejects`, and
 * `expect.any`. Multi-line `import {…}` statements are not stripped (authored
 * tests use single-line imports).
 */
import { runOnPiston } from "@/lib/piston";
import { Semaphore } from "@/lib/concurrency";
import { buildUnitProgram, RESULTS_MARK } from "./unit-build";

export type UnitTestResult = { name: string; status: "pass" | "fail"; error?: string };
export type UnitRunResult = {
  results: UnitTestResult[];
  passed: number;
  total: number;
  score: number;
  compileError?: boolean;
  stderr?: string;
};

const unitSem = new Semaphore(Number(process.env.JUDGE_MAX_CONCURRENT ?? 4));

/**
 * Run a unit-js challenge server-side. `language` picks the Piston runtime:
 * TypeScript files compile + run; plain JS runs directly. We default to
 * typescript so TS annotations in authored content are handled.
 */
export async function runUnitJs(opts: {
  sourceFiles: Record<string, string>;
  testFiles: Record<string, string>;
  language?: "typescript" | "javascript";
}): Promise<UnitRunResult> {
  const program = buildUnitProgram(opts.sourceFiles, opts.testFiles);
  const lang = opts.language ?? "typescript";

  const run = await unitSem.run(() => runOnPiston(lang, program, ""));

  if (run.compileError) {
    return { results: [], passed: 0, total: 0, score: 0, compileError: true, stderr: run.stderr };
  }

  const line = (run.stdout || "")
    .split(/\r?\n/)
    .reverse()
    .find((l) => l.startsWith(RESULTS_MARK));
  if (!line) {
    return { results: [], passed: 0, total: 0, score: 0, stderr: run.stderr || "No test results produced." };
  }

  let parsed: UnitTestResult[] = [];
  try {
    parsed = JSON.parse(line.slice(RESULTS_MARK.length)) as UnitTestResult[];
  } catch {
    return { results: [], passed: 0, total: 0, score: 0, stderr: "Could not parse test results." };
  }

  const passed = parsed.filter((r) => r.status === "pass").length;
  const total = parsed.length;
  const score = total > 0 ? Math.round((passed / total) * 100) : 0;
  return { results: parsed, passed, total, score };
}
