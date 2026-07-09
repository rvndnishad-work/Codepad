import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clientKey, rateLimitDistributed } from "@/lib/rate-limit";
import { resolveCandidateFromToken } from "@/lib/take-home/candidate";
import { judge, type JudgeCase } from "@/lib/judge/run";
import { recordPrepCompletion } from "@/lib/prep-journey/complete";
import { hasHarness } from "@/lib/judge/harness";
import { runUnitJs } from "@/lib/judge/unit-js";
import { PistonUnavailableError } from "@/lib/piston";
import type { Contract } from "@/lib/judge/types";

// Server-authoritative grading. The client sends its code (harness: a single
// function in a chosen language; unit-js: its editable source files); we run
// the tests on Piston, compute the score, persist the attempt, and return
// results with hidden cases redacted. The client never reports pass/fail.

const MAX_CODE_BYTES = 64 * 1024;
const MAX_CASES = 100;

const gradeSchema = z.object({
  stepId: z.string(),
  // Harness mode:
  language: z.string().optional(),
  code: z.string().optional(),
  // unit-js mode: the candidate's editable source files { "/path": "code" }.
  files: z.record(z.string(), z.string()).optional(),
  durationSec: z.number().int().min(0).max(60 * 60 * 24).optional(),
  sessionId: z.string().optional().nullable(),
  token: z.string().optional().nullable(),
  /** "Run" (try sample cases) — judge but don't persist an attempt. */
  dryRun: z.boolean().optional(),
});

/** Normalized grading outcome shared by the harness + unit-js paths. */
type Graded = {
  passed: number;
  total: number;
  score: number;
  compileError: boolean;
  stderr?: string;
  /** Redacted, client-facing per-test results. */
  clientResults: Array<{ name: string; isHidden: boolean; status: string; got?: string; expected?: string; error?: string }>;
  /** Persisted testResults.tests shape (legacy-compatible). */
  testTests: Array<{ path: string; name: string; status: string; error: string | null }>;
  /** What to store in ChallengeAttempt.files. */
  filesForRecord: Record<string, string>;
};

type StoredCase = {
  id: string;
  name: string;
  argsJson: string;
  expectedJson: string;
  isHidden: boolean;
  weight: number;
  compare?: "exact" | "float" | "unordered";
};

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const t0 = Date.now();
  const { slug } = await params;
  const body = await req.json().catch(() => null);
  const parsed = gradeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { stepId, language, code, files, durationSec, sessionId, token, dryRun } = parsed.data;

  // ── Resolve candidate (session user, else take-home token) ──
  const session = await auth().catch(() => null);
  let candidateUserId = session?.user?.id;
  let assignmentTokenMatched = false;
  if (!candidateUserId && token) {
    const candidate = await resolveCandidateFromToken(token);
    if (candidate) {
      candidateUserId = candidate.userId;
      assignmentTokenMatched = candidate.kind === "assignment";
    }
  }
  if (!candidateUserId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rl = await rateLimitDistributed(`grade:${clientKey(req, candidateUserId)}`, 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many submissions. Please wait a moment." }, { status: 429 });
  }

  // ── Load the step + challenge ──
  const challenge = await prisma.challenge.findUnique({
    where: { slug },
    select: { id: true, published: true },
  });
  if (!challenge || !challenge.published) {
    return NextResponse.json({ error: "challenge not found" }, { status: 404 });
  }
  const step = await prisma.challengeStep.findUnique({
    where: { id: stepId },
    select: {
      challengeId: true,
      judgingMode: true,
      functionName: true,
      signatureJson: true,
      languagesJson: true,
      harnessTestsJson: true,
      testFiles: true,
    },
  });
  if (!step || step.challengeId !== challenge.id) {
    return NextResponse.json({ error: "step not found" }, { status: 404 });
  }

  // ── Grade per judging mode → normalized `graded` ──
  let graded: Graded;
  try {
    if (step.judgingMode === "harness") {
      if (!language || !code) {
        return NextResponse.json({ error: "Missing language or code." }, { status: 400 });
      }
      if (Buffer.byteLength(code, "utf8") > MAX_CODE_BYTES) {
        return NextResponse.json({ error: "Code exceeds maximum size." }, { status: 413 });
      }
      if (!hasHarness(language)) {
        return NextResponse.json({ error: `Language ${language} is not supported.` }, { status: 400 });
      }
      if (!step.functionName || !step.signatureJson) {
        return NextResponse.json({ error: "This challenge is missing its function contract." }, { status: 400 });
      }
      const enabledLanguages: string[] = step.languagesJson ? JSON.parse(step.languagesJson) : [];
      if (enabledLanguages.length && !enabledLanguages.includes(language.toLowerCase())) {
        return NextResponse.json({ error: `${language} is not enabled for this challenge.` }, { status: 400 });
      }

      const sig = JSON.parse(step.signatureJson) as { params: { name: string; type: string }[]; returnType: string };
      const contract: Contract = {
        functionName: step.functionName,
        params: sig.params as Contract["params"],
        returnType: sig.returnType as Contract["returnType"],
      };
      let stored: StoredCase[];
      try {
        stored = JSON.parse(step.harnessTestsJson) as StoredCase[];
      } catch {
        return NextResponse.json({ error: "Challenge test cases are malformed." }, { status: 500 });
      }
      if (stored.length === 0) {
        return NextResponse.json({ error: "This challenge has no test cases yet." }, { status: 400 });
      }
      if (stored.length > MAX_CASES) stored = stored.slice(0, MAX_CASES);

      const cases: JudgeCase[] = stored.map((c) => ({
        id: c.id,
        name: c.name,
        args: JSON.parse(c.argsJson),
        expected: c.expectedJson ? JSON.parse(c.expectedJson) : null,
        isHidden: Boolean(c.isHidden),
        weight: Number(c.weight) || 1,
        compare: c.compare ?? "exact",
      }));

      const result = await judge({ language, code, contract, cases });
      graded = {
        passed: result.passed,
        total: result.total,
        score: result.score,
        compileError: result.compileError ?? false,
        stderr: result.stderr,
        clientResults: result.results.map((r) =>
          r.isHidden
            ? { name: r.name, isHidden: true, status: r.status }
            : { name: r.name, isHidden: false, status: r.status, got: r.got, expected: r.expected, error: r.error }
        ),
        testTests: result.results.map((r) => ({ path: "", name: r.name, status: r.status === "pass" ? "pass" : "fail", error: r.error ?? null })),
        filesForRecord: { [`solution.${language}`]: code },
      };
    } else if (step.judgingMode === "unit-js") {
      if (!files || Object.keys(files).length === 0) {
        return NextResponse.json({ error: "Missing submission files." }, { status: 400 });
      }
      if (Object.keys(files).length > 25) {
        return NextResponse.json({ error: "Too many files." }, { status: 413 });
      }
      const totalBytes = Object.values(files).reduce((n, c) => n + Buffer.byteLength(c, "utf8"), 0);
      if (totalBytes > MAX_CODE_BYTES) {
        return NextResponse.json({ error: "Submission exceeds maximum size." }, { status: 413 });
      }
      const testFiles = JSON.parse(step.testFiles || "{}") as Record<string, string>;
      // TS if any source/test file looks like TypeScript, else plain JS.
      const isTs = [...Object.keys(files), ...Object.keys(testFiles)].some((p) => p.endsWith(".ts") || p.endsWith(".tsx"));
      const result = await runUnitJs({ sourceFiles: files, testFiles, language: isTs ? "typescript" : "javascript" });
      graded = {
        passed: result.passed,
        total: result.total,
        score: result.score,
        compileError: result.compileError ?? false,
        stderr: result.stderr,
        clientResults: result.results.map((r) => ({ name: r.name, isHidden: false, status: r.status, error: r.error })),
        testTests: result.results.map((r) => ({ path: "", name: r.name, status: r.status, error: r.error ?? null })),
        filesForRecord: files,
      };
    } else {
      return NextResponse.json({ error: "This challenge type is not auto-graded." }, { status: 400 });
    }
  } catch (err) {
    if (err instanceof PistonUnavailableError) {
      return NextResponse.json(
        { error: "Code execution is temporarily unavailable. Please try again shortly." },
        { status: 503 }
      );
    }
    console.error("Grade error:", err);
    return NextResponse.json({ error: "Failed to grade submission." }, { status: 500 });
  }

  const status = graded.compileError
    ? "failed"
    : graded.total > 0 && graded.passed === graded.total
      ? "passed"
      : "failed";

  // Observability: one structured line per grade run (no candidate code).
  console.info(
    `[grade] slug=${slug} mode=${step.judgingMode} lang=${language ?? "-"} ` +
      `dryRun=${Boolean(dryRun)} ${graded.passed}/${graded.total} score=${graded.score} ` +
      `compileErr=${graded.compileError} ms=${Date.now() - t0}`
  );

  // ── Dry run ("Run sample tests"): judge only, never persist ──
  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      status,
      score: graded.score,
      passed: graded.passed,
      total: graded.total,
      compileError: graded.compileError,
      stderr: graded.compileError ? graded.stderr : undefined,
      results: graded.clientResults,
    });
  }

  const testResults = { passed: graded.passed, total: graded.total, tests: graded.testTests };

  const attempt = await prisma.challengeAttempt.create({
    data: {
      userId: candidateUserId,
      challengeId: challenge.id,
      stepId,
      status,
      files: JSON.stringify(graded.filesForRecord),
      testResults: JSON.stringify(testResults),
      durationSec: durationSec ?? null,
      sessionId: sessionId ?? null,
      score: graded.score,
      finishedAt: new Date(),
    },
    select: { id: true, status: true },
  });

  // A passing submit credits the user's active prep journey (fire-and-forget:
  // grading must never fail because of tracker bookkeeping).
  if (status === "passed") {
    void recordPrepCompletion(candidateUserId, slug, "challenge").catch((e) =>
      console.error("[prep-journey] completion credit failed:", e),
    );
  }

  // Take-home status update + recruiter notify (fire-and-forget, mirrors submit route).
  if (token && assignmentTokenMatched) {
    void (async () => {
      try {
        const updated = await prisma.takeHomeAssignment.update({
          where: { token },
          data: { status: "SUBMITTED", submittedAt: new Date() },
          select: { id: true, workspaceId: true, candidateId: true },
        });
        // IP-69: forward-advance the candidate to TAKE_HOME on submission.
        if (updated.workspaceId && updated.candidateId) {
          const { advanceCandidateStage } = await import("@/lib/crm/advance");
          void advanceCandidateStage({
            workspaceId: updated.workspaceId,
            candidateId: updated.candidateId,
            toStage: "TAKE_HOME",
            source: "auto:take-home-submitted",
          });
        }
        const { sendTakeHomeSubmissionEmails } = await import("@/lib/take-home/emails");
        await sendTakeHomeSubmissionEmails({ takeHomeId: updated.id, score: graded.score });
      } catch (e) {
        console.error("[grade] take-home post-submit failed:", e);
      }
    })();
  }

  // IP-88: session-backed take-home completion. When this attempt closes the
  // last remaining challenge of a take-home session, complete the session and
  // fire submission comms right away — the candidate shouldn't have to revisit
  // the lobby for the recruiter to hear about it. The lobby's own check stays
  // as an idempotent fallback (it does bookkeeping only, no comms).
  if (sessionId && !dryRun) {
    void (async () => {
      try {
        const th = await prisma.interviewSession.findFirst({
          where: { id: sessionId, type: "take-home", status: { not: "completed" } },
          select: {
            id: true,
            workspaceId: true,
            candidateId: true,
            candidateName: true,
            title: true,
            challengeIds: true,
            workspace: { select: { slug: true } },
          },
        });
        if (!th) return;

        let ids: string[] = [];
        try {
          const v = JSON.parse(th.challengeIds ?? "[]");
          ids = Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
        } catch {
          ids = [];
        }
        if (ids.length === 0) return;

        const attempts = await prisma.challengeAttempt.findMany({
          where: { sessionId, status: { in: ["passed", "failed"] } },
          select: { challengeId: true, score: true },
        });
        const done = new Set(attempts.map((a) => a.challengeId));
        if (!ids.every((id) => done.has(id))) return;

        // Guarded update — count 0 means the lobby fallback (or a concurrent
        // grade) already completed it, so skip the comms to avoid duplicates.
        const res = await prisma.interviewSession.updateMany({
          where: { id: sessionId, status: { not: "completed" } },
          data: { status: "completed", finishedAt: new Date() },
        });
        if (res.count === 0) return;

        const avgScore = attempts.length
          ? Math.round(attempts.reduce((s, a) => s + (a.score ?? 0), 0) / attempts.length)
          : null;

        if (th.workspaceId) {
          if (th.candidateId) {
            const { advanceCandidateStage } = await import("@/lib/crm/advance");
            void advanceCandidateStage({
              workspaceId: th.workspaceId,
              candidateId: th.candidateId,
              toStage: "TAKE_HOME",
              source: "auto:take-home-session-completed",
            });
          }
          const { sendTakeHomeSessionSubmissionEmails } = await import("@/lib/take-home/emails");
          await sendTakeHomeSessionSubmissionEmails({ sessionId, score: avgScore });
          if (th.workspace?.slug) {
            const { notifyTakeHomeSubmitted } = await import("@/lib/notifications/triggers");
            void notifyTakeHomeSubmitted({
              workspaceId: th.workspaceId,
              workspaceSlug: th.workspace.slug,
              candidateName: th.candidateName ?? "A candidate",
              challengeTitle: th.title || "Take-home assessment",
              takeHomeId: sessionId,
              candidateId: th.candidateId,
            });
          }
        }
      } catch (e) {
        console.error("[grade] take-home session completion hook failed:", e);
      }
    })();
  }

  return NextResponse.json({
    attemptId: attempt.id,
    status,
    score: graded.score,
    passed: graded.passed,
    total: graded.total,
    compileError: graded.compileError,
    stderr: graded.compileError ? graded.stderr : undefined,
    results: graded.clientResults,
  });
}
