/**
 * Tests for an AI screening round's final code.
 *
 * Only challenge-sourced rounds ship runnable tests: the challenge's hidden
 * Jest-style test files ("unit-js" judging), which run on the same server
 * runner the challenge grader uses. Scaffold and playground rounds have no
 * test files, so the report shows no runner for them. Server only.
 */
import { prisma } from "@/lib/prisma";
import { runUnitJs } from "@/lib/judge/unit-js";
import { toTestRun, type TestRun } from "./report-extras";

const SOURCE = /\.(m?js|jsx|ts|tsx)$/;

function parseMap(raw: string | null | undefined): Record<string, string> {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw);
    if (!v || typeof v !== "object" || Array.isArray(v)) return {};
    return Object.fromEntries(Object.entries(v).filter(([, c]) => typeof c === "string")) as Record<string, string>;
  } catch {
    return {};
  }
}

/**
 * Hidden test files per challenge id, for challenges graded by unit tests.
 * The first step wins; a challenge without steps falls back to its own
 * legacy testFiles. Challenges graded another way are left out.
 */
export async function loadChallengeTestFiles(challengeIds: string[]): Promise<Map<string, Record<string, string>>> {
  const ids = [...new Set(challengeIds.filter(Boolean))];
  const out = new Map<string, Record<string, string>>();
  if (!ids.length) return out;
  const rows = await prisma.challenge.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      testFiles: true,
      steps: { orderBy: { position: "asc" }, take: 1, select: { judgingMode: true, testFiles: true } },
    },
  });
  for (const c of rows) {
    const step = c.steps[0];
    if (step && step.judgingMode !== "unit-js") continue;
    const tests = parseMap(step?.testFiles);
    const files = Object.keys(tests).length ? tests : parseMap(c.testFiles);
    if (Object.keys(files).length) out.set(c.id, files);
  }
  return out;
}

/** Runs the tests against the candidate's files. Throws when the runner cannot be reached. */
export async function runRoundTests(files: Record<string, string>, testFiles: Record<string, string>): Promise<TestRun> {
  const source = Object.fromEntries(Object.entries(files).filter(([p]) => SOURCE.test(p) && !/\.(test|spec)\./.test(p)));
  const isTs = [...Object.keys(source), ...Object.keys(testFiles)].some((p) => /\.tsx?$/.test(p));
  const res = await runUnitJs({ sourceFiles: source, testFiles, language: isTs ? "typescript" : "javascript" });
  return toTestRun(res, new Date().toISOString()) ?? { passed: 0, total: 0, compileError: false, stderr: null, tests: [], ranAt: new Date().toISOString() };
}
