import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clientKey, rateLimitDistributed } from "@/lib/rate-limit";
import { runUnitJs } from "@/lib/judge/unit-js";
import { PistonUnavailableError } from "@/lib/piston";
import { resolveCandidateFromToken } from "@/lib/take-home/candidate";
import { recordPrepCompletion } from "@/lib/prep-journey/complete";

// Server-authoritative recording of a challenge attempt.
//
// SECURITY: the client used to report its own in-browser test results here and
// the server trusted them for status/score — meaning a candidate could POST a
// fabricated `testResults` and mark a take-home "passed" with score 100. The
// `testResults` body field is still accepted for client back-compat but is
// now IGNORED for grading:
//   - gradingMode "manual"  → recorded as "submitted" for human review.
//   - otherwise ("auto")    → unit-js steps are re-judged on the server via
//     Piston (same engine as /grade); anything that can't be server-judged
//     (frontend steps, missing step, judge outage) is recorded as "submitted"
//     with no score rather than trusting the client.

const MAX_FILES = 25;
const MAX_FILES_BYTES = 500_000;

const submitSchema = z.object({
  files: z.record(z.string(), z.union([z.string(), z.object({ code: z.string() })])),
  // Legacy client-reported results. Accepted so older clients don't 400, but
  // never used for grading.
  testResults: z
    .object({
      passed: z.number().int().min(0),
      total: z.number().int().min(0),
      tests: z
        .array(
          z.object({
            path: z.string(),
            name: z.string(),
            status: z.enum(["pass", "fail", "idle", "running"]),
            error: z.string().nullable().optional(),
          })
        )
        .max(200),
    })
    .optional(),
  durationSec: z.number().int().min(0).max(60 * 60 * 24),
  sessionId: z.string().optional().nullable(),
  stepId: z.string().optional().nullable(),
  token: z.string().optional().nullable(),
  // "manual" → frontend/playground challenge with no automated tests: record
  // the submission for manual review instead of auto-grading (status
  // "submitted", score null). Defaults to "auto".
  gradingMode: z.enum(["auto", "manual"]).optional(),
});

type StoredTestResults = {
  passed: number;
  total: number;
  tests: Array<{ path: string; name: string; status: string; error: string | null }>;
  /** Set when the server judge couldn't run (e.g. Piston outage). */
  note?: string;
};

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const body = await req.json().catch(() => null);
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { files, durationSec, sessionId, stepId, token, gradingMode } = parsed.data;
  const isManualReview = gradingMode === "manual";

  // Normalize files to a plain { path: code } map and bound the payload.
  const sourceFiles: Record<string, string> = {};
  for (const [path, file] of Object.entries(files)) {
    sourceFiles[path] = typeof file === "string" ? file : file.code;
  }
  if (Object.keys(sourceFiles).length > MAX_FILES) {
    return NextResponse.json({ error: "Too many files." }, { status: 413 });
  }
  const totalBytes = Object.values(sourceFiles).reduce(
    (n, c) => n + Buffer.byteLength(c, "utf8"),
    0
  );
  if (totalBytes > MAX_FILES_BYTES) {
    return NextResponse.json({ error: "Submission exceeds maximum size." }, { status: 413 });
  }

  const session = await auth();
  let candidateUserId = session?.user?.id;
  // Tracks whether `token` matched a legacy single-challenge TakeHomeAssignment
  // (vs an IP-88 session candidateAccessToken). Only the assignment path runs
  // the TakeHomeAssignment status update below.
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

  const rl = await rateLimitDistributed(
    `attempt:${clientKey(req, candidateUserId)}`,
    30,
    60_000
  );
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate limited" },
      { status: 429, headers: { "retry-after": String(Math.ceil(rl.resetMs / 1000)) } }
    );
  }

  const challenge = await prisma.challenge.findUnique({
    where: { slug },
    select: { id: true, published: true },
  });
  if (!challenge || !challenge.published) {
    return NextResponse.json({ error: "challenge not found" }, { status: 404 });
  }

  // ── Server-side grading ──
  // Manual-review submissions skip grading entirely. Auto submissions are
  // re-judged on the server; if that isn't possible the attempt is stored as
  // "submitted" (needs human review) — never graded from client claims.
  let status = "submitted";
  let score: number | null = null;
  let testResults: StoredTestResults = { passed: 0, total: 0, tests: [] };

  if (!isManualReview) {
    const step = stepId
      ? await prisma.challengeStep.findUnique({
          where: { id: stepId },
          select: { challengeId: true, judgingMode: true, testFiles: true },
        })
      : null;
    if (stepId && (!step || step.challengeId !== challenge.id)) {
      return NextResponse.json({ error: "step not found" }, { status: 404 });
    }

    let hiddenTests: Record<string, string> = {};
    try {
      hiddenTests = JSON.parse(step?.testFiles || "{}") as Record<string, string>;
    } catch {
      hiddenTests = {};
    }

    if (step?.judgingMode === "unit-js" && Object.keys(hiddenTests).length > 0) {
      // Never let a submitted file shadow a hidden test file.
      const judged: Record<string, string> = { ...sourceFiles };
      for (const testPath of Object.keys(hiddenTests)) delete judged[testPath];

      const isTs = [...Object.keys(judged), ...Object.keys(hiddenTests)].some(
        (p) => p.endsWith(".ts") || p.endsWith(".tsx")
      );
      try {
        const result = await runUnitJs({
          sourceFiles: judged,
          testFiles: hiddenTests,
          language: isTs ? "typescript" : "javascript",
        });
        status = result.compileError
          ? "failed"
          : result.total > 0 && result.passed === result.total
            ? "passed"
            : "failed";
        score = result.score;
        testResults = {
          passed: result.passed,
          total: result.total,
          tests: result.results.map((r) => ({
            path: "",
            name: r.name,
            status: r.status,
            error: r.error ?? null,
          })),
        };
      } catch (err) {
        if (!(err instanceof PistonUnavailableError)) {
          console.error("[attempt] server judge failed:", err);
        }
        // Deadline auto-submits must never lose the candidate's work: store
        // the snapshot for manual review instead of failing the request.
        testResults.note = "server-judge-unavailable";
      }
    }
    // Non-unit-js steps (frontend/harness) and step-less legacy submissions
    // stay "submitted" — there is nothing the server can auto-grade here.
  }

  // Captured here so the IP-27 submission emails (fired after grading) can
  // look up everything they need by id.
  let submittedTakeHomeId: string | null = null;
  if (token && assignmentTokenMatched) {
    try {
      const updated = await prisma.takeHomeAssignment.update({
        where: { token },
        data: { status: "SUBMITTED", submittedAt: new Date() },
        select: {
          id: true,
          candidateName: true,
          candidateId: true,
          workspaceId: true,
          workspace: { select: { slug: true } },
          challenge: { select: { title: true } },
        },
      });
      submittedTakeHomeId = updated.id;
      // IP-44: notify workspace owners/admins. Fire-and-forget — failure
      // here must not roll back the submission.
      const { notifyTakeHomeSubmitted } = await import("@/lib/notifications/triggers");
      if (updated.workspaceId && updated.workspace?.slug) {
        void notifyTakeHomeSubmitted({
          workspaceId: updated.workspaceId,
          workspaceSlug: updated.workspace.slug,
          candidateName: updated.candidateName,
          challengeTitle: updated.challenge.title,
          takeHomeId: updated.id,
          candidateId: updated.candidateId,
        });
      }
    } catch (e) {
      console.error("Failed to update take-home assignment status on submit:", e);
    }
  }

  // IP-27: take-home submission emails — candidate confirmation + recruiter
  // notify. Fire-and-forget with the score now available. Never block/throw
  // past the submission.
  if (submittedTakeHomeId) {
    const thId = submittedTakeHomeId;
    const submitScore = score;
    void (async () => {
      try {
        const { sendTakeHomeSubmissionEmails } = await import("@/lib/take-home/emails");
        await sendTakeHomeSubmissionEmails({ takeHomeId: thId, score: submitScore });
      } catch (e) {
        console.error("[take-home-submit-emails] failed:", e);
      }
    })();
  }

  const attempt = await prisma.challengeAttempt.create({
    data: {
      userId: candidateUserId,
      challengeId: challenge.id,
      stepId: stepId ?? null,
      status,
      files: JSON.stringify(sourceFiles),
      testResults: JSON.stringify(testResults),
      durationSec,
      sessionId: sessionId ?? null,
      score,
      finishedAt: new Date(),
    },
    select: { id: true, status: true },
  });

  // A passing submit credits the user's active prep journey (fire-and-forget:
  // submission recording must never fail because of tracker bookkeeping).
  if (status === "passed") {
    void recordPrepCompletion(candidateUserId, slug, "challenge").catch((e) =>
      console.error("[prep-journey] completion credit failed:", e),
    );
  }

  return NextResponse.json({
    id: attempt.id,
    status: attempt.status,
    score,
    passed: testResults.passed,
    total: testResults.total,
  });
}
