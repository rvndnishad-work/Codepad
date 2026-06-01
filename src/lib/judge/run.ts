/**
 * The function-harness judge. Assembles candidate code + generated driver,
 * runs it ONCE on Piston with the whole batch of cases passed on stdin (a JSON
 * array of argument-tuples), then compares each printed line to the expected
 * value. stdin is used rather than a file because compiled runtimes (e.g. TS)
 * run from a different cwd than where extra files are placed.
 *
 * Server-authoritative: callers pass the full (incl. hidden) cases and decide
 * what to expose to the client. The judge never trusts client-side results.
 */
import { runOnPiston } from "@/lib/piston";
import { Semaphore } from "@/lib/concurrency";
import { assembleProgram } from "./harness";
import {
  buildInputFile,
  splitDriverOutput,
  compareValues,
  type Contract,
  type CompareMode,
} from "./types";

export type JudgeCase = {
  id: string;
  name: string;
  /** Decoded argument values, in declared param order. */
  args: unknown[];
  /** Decoded expected return value. */
  expected: unknown;
  isHidden: boolean;
  weight: number;
  compare?: CompareMode;
  floatTol?: number;
};

export type JudgeCaseResult = {
  id: string;
  name: string;
  isHidden: boolean;
  status: "pass" | "fail" | "error";
  /** Omitted for hidden cases (redacted before reaching the client). */
  got?: string;
  expected?: string;
  error?: string;
};

export type JudgeResult = {
  results: JudgeCaseResult[];
  passed: number;
  total: number;
  /** Weighted score 0..100. */
  score: number;
  compileError?: boolean;
  stderr?: string;
};

const judgeSem = new Semaphore(Number(process.env.JUDGE_MAX_CONCURRENT ?? 4));

/** One case's produced value, parsed from the driver's output line. */
export type CaseOutput = {
  /** Raw output line (canonical JSON) or null if the case produced nothing. */
  raw: string | null;
  /** Parsed value when the line was valid JSON and not an error marker. */
  value?: unknown;
  /** Set when the case threw, crashed, or produced unparseable output. */
  error?: string;
};

export type BatchOutcome = {
  outputs: CaseOutput[];
  compileError?: boolean;
  stderr?: string;
  signal?: string | null;
};

/**
 * Run candidate code over a batch of argument-tuples and return the raw + parsed
 * output per case WITHOUT comparing to any expected value. Used both by judge()
 * (which then compares) and by the admin Validate flow (which uses a reference
 * solution's outputs AS the expected values).
 */
export async function executeBatch(
  language: string,
  code: string,
  contract: Contract,
  argsList: unknown[][]
): Promise<BatchOutcome> {
  const program = assembleProgram(language, code, contract);
  const batchInput = buildInputFile(argsList);

  // Defensive cap on the (author-controlled) batch payload.
  const MAX_BATCH_BYTES = 1024 * 1024;
  if (Buffer.byteLength(batchInput, "utf8") > MAX_BATCH_BYTES) {
    return { outputs: argsList.map(() => ({ raw: null, error: "Test batch too large." })), stderr: "Test batch exceeds size limit." };
  }

  const run = await judgeSem.run(() => runOnPiston(language, program, batchInput));

  if (run.compileError) {
    return { outputs: argsList.map(() => ({ raw: null })), compileError: true, stderr: run.stderr };
  }

  const lines = splitDriverOutput(run.stdout);
  const outputs: CaseOutput[] = argsList.map((_, i) => {
    const line = lines[i] ?? null;
    if (line == null) {
      return {
        raw: null,
        error: run.signal
          ? "Program hit the time or memory limit (or crashed) before this case."
          : "No output produced for this case.",
      };
    }
    try {
      const parsed = JSON.parse(line);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && "__judge_error__" in parsed) {
        return { raw: line, error: String((parsed as { __judge_error__: unknown }).__judge_error__) };
      }
      return { raw: line, value: parsed };
    } catch {
      return { raw: line, error: `Unparseable output: ${line.slice(0, 200)}` };
    }
  });
  return { outputs, stderr: run.stderr, signal: run.signal };
}

export async function judge(opts: {
  language: string;
  code: string;
  contract: Contract;
  cases: JudgeCase[];
}): Promise<JudgeResult> {
  const { language, code, contract, cases } = opts;

  const batch = await executeBatch(language, code, contract, cases.map((c) => c.args));

  if (batch.compileError) {
    return {
      results: cases.map((c) => ({
        id: c.id,
        name: c.name,
        isHidden: c.isHidden,
        status: "error" as const,
        error: "Compilation failed",
      })),
      passed: 0,
      total: cases.length,
      score: 0,
      compileError: true,
      stderr: batch.stderr,
    };
  }

  const results: JudgeCaseResult[] = [];
  let passed = 0;
  let gotWeight = 0;
  let totalWeight = 0;

  cases.forEach((c, i) => {
    const weight = Number(c.weight) || 0;
    totalWeight += weight;
    const out = batch.outputs[i];

    let status: "pass" | "fail" | "error" = "fail";
    let error: string | undefined = out?.error;

    if (out?.error) {
      status = "error";
    } else if (out && "value" in out) {
      status = compareValues(c.expected, out.value, contract.returnType, c.compare ?? "exact", c.floatTol)
        ? "pass"
        : "fail";
    }

    if (status === "pass") {
      passed++;
      gotWeight += weight;
    }

    results.push({
      id: c.id,
      name: c.name,
      isHidden: c.isHidden,
      status,
      got: c.isHidden ? undefined : out?.value !== undefined ? JSON.stringify(out.value) : out?.raw ?? undefined,
      expected: c.isHidden ? undefined : JSON.stringify(c.expected),
      error,
    });
  });

  const score =
    totalWeight > 0
      ? Math.round((gotWeight / totalWeight) * 100)
      : cases.length > 0
        ? Math.round((passed / cases.length) * 100)
        : 0;

  return { results, passed, total: cases.length, score, stderr: batch.stderr };
}
