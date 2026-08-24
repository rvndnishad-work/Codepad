import { prisma } from "@/lib/prisma";
import { analyzeTelemetry, type TelemetryEvent } from "@/lib/proctoring/ai-detection";
import { AI_INTERVIEW_GEMINI_MODEL } from "@/lib/ai-interview/scaffolds";
import { sendRecruiterNotifyEmail } from "@/lib/ai-interview/submit-notify";
import { resolveSessionRounds, type SessionRound } from "@/lib/ai-interview/rounds";
import { STAFF_ROLES } from "@/lib/permissions/role-groups";
import { advanceCandidateStage } from "@/lib/crm/advance";
import { getStarterFilesByRoundId } from "@/lib/ai-interview/round-content";
import {
  describeChanges,
  diffFiles,
  renderDiffForPrompt,
  type FileDiff,
} from "@/lib/ai-interview/diff";

/**
 * Canonical AI screening grading pipeline.
 *
 * Extracted verbatim from /api/ai-interview/submit so TWO entry points share
 * one implementation:
 *   1. Candidate submits (the submit route) — passes candidate-provided files.
 *   2. Abandonment cron (cron/ai-screening-expiry) — grades last-saved round
 *      files when a candidate exits mid-interview and never returns.
 *
 * Idempotent by construction: a session with finishedAt set is never re-graded,
 * no matter which path reaches it first.
 */

type GraderResult = {
  score: number;
  codeQuality: number;
  problemSolving: number;
  communication: number;
  aiSummary: string;
};

// ---------------------------------------------------------------------------
// New scoring invariants (fixes phantom 35% for zero-effort submissions).
// ---------------------------------------------------------------------------

/** Zero code ownership → cap score hard. These survive even Gemini hallucination. */
const ZERO_EFFORT_MAX_SCORE = 8;
const LOW_EFFORT_MAX_SCORE = 18;
const MIN_MEANINGFUL_ADDED_LINES = 3;

/** A line counts as authored signal only if it carries a code token. */
function isMeaningfulLine(line: string): boolean {
  const t = line.trim();
  if (t.length < 3) return false;
  // ignore pure punctuation / braces / xml tags alone
  if (/^[\{\}\[\]\(\)<>;:,]+$/.test(t)) return false;
  // must contain an alphanumeric token
  return /[A-Za-z0-9]/.test(t);
}

function meaningfulAddedLines(diffs: FileDiff[]): number {
  let n = 0;
  for (const d of diffs) for (const l of d.added) if (isMeaningfulLine(l)) n++;
  return n;
}

function clampScoreForEffort(score: number, meaningfulLines: number): number {
  if (meaningfulLines === 0) return Math.min(score, ZERO_EFFORT_MAX_SCORE);
  if (meaningfulLines < MIN_MEANINGFUL_ADDED_LINES) return Math.min(score, LOW_EFFORT_MAX_SCORE);
  return score;
}

function clampRatingsForEffort(
  r: GraderResult,
  meaningfulLines: number
): GraderResult {
  if (meaningfulLines === 0) {
    return {
      ...r,
      score: clampScoreForEffort(r.score, meaningfulLines),
      codeQuality: Math.min(r.codeQuality, 1),
      problemSolving: Math.min(r.problemSolving, 1),
      communication: Math.min(r.communication, 2),
    };
  }
  if (meaningfulLines < MIN_MEANINGFUL_ADDED_LINES) {
    return {
      ...r,
      score: clampScoreForEffort(r.score, meaningfulLines),
      codeQuality: Math.min(r.codeQuality, 2),
      problemSolving: Math.min(r.problemSolving, 2),
    };
  }
  return { ...r, score: clampScoreForEffort(r.score, meaningfulLines) };
}

// Call Gemini API to perform programmatic grading — DIFF-AWARE.
async function callGeminiGrader(
  apiKey: string,
  positionTitle: string,
  chatLog: string,
  diffBlock: string,
  changeSummary: string
): Promise<GraderResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${AI_INTERVIEW_GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const prompt = `You are the Interviewpad AI Grading Agent.
Evaluate a candidate who took an automated AI technical coding interview for "${positionTitle}".

IMPORTANT — grade the CANDIDATE'S OWN WORK, not the starter template. Below you
receive ONLY the changes they made relative to the scaffold they started from
(added/removed lines per file). Unchanged template code earns no credit.

Change summary: ${changeSummary || "no changes detected"}

Candidate's changes (unified diff):
${diffBlock || "(empty — the candidate did not modify any files)"}

For reference, their final conversation log:
${chatLog}

Score using this weighted rubric (0-100 composite):
1. CODE CHANGES (50%): quality, correctness and completeness of what they
   actually wrote in the diff. Deleting working starter code is a regression —
   penalize it. Adding files/features earns proportionally.
2. TASK COMPLETION (25%): how many of a typical task's core requirements their
   changes cover. A minimal-but-working slice beats large non-functional edits.
3. COMMUNICATION (25%): engagement with the interviewer, clarity of their
   explanations, honesty about what they did vs claimed.
If the candidate made NO code changes, score must be below 10 regardless of
conversation quality.

Output your response strictly as a JSON object containing precisely:
{
  "score": number (0-100 weighted composite),
  "codeQuality": number (1-5 rating),
  "problemSolving": number (1-5 rating),
  "communication": number (1-5 rating),
  "aiSummary": string (bulleted recap of strengths and flaws)
}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      },
    }),
  });

  if (!res.ok) throw new Error(`Gemini HTTP error ${res.status}`);
  const data = await res.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error("Empty grader result");

  return JSON.parse(rawText.trim()) as GraderResult;
}

/**
 * Per-template signal definitions used by the static fallback grader.
 * Each rule contributes to score/codeQuality/problemSolving when its regex
 * hits in the candidate's submitted code. Keep these short — this is a dev
 * fallback, not the primary grader (Gemini handles real grading).
 */
type GraderRule = {
  /** Human-readable signal name shown in the summary. */
  label: string;
  /** Regex tested against concatenated file content. */
  pattern: RegExp;
  /** Score increment on hit (0-100 scale). */
  score: number;
  /** Rubric column boosts on hit. */
  codeQuality?: number;
  problemSolving?: number;
};

const TEMPLATE_GRADER_RULES: Record<string, GraderRule[]> = {
  "react-todo-pagination": [
    { label: "uses React state hooks", pattern: /useState/, score: 15, codeQuality: 1 },
    { label: "establishes todo items + mutations", pattern: /todo|Todo/, score: 20, problemSolving: 1 },
    { label: "implements pagination slicing", pattern: /slice|pagination|itemsPerPage/, score: 20, problemSolving: 2 },
    { label: "handles prev/next disabled boundaries", pattern: /disabled[\s\S]{0,60}(prev|next|currentPage|onClick)/, score: 15, codeQuality: 1 },
  ],
  "interactive-carousel": [
    { label: "uses React state hooks", pattern: /useState/, score: 10, codeQuality: 1 },
    { label: "drives autoplay with setInterval inside useEffect", pattern: /useEffect[\s\S]{0,200}setInterval/, score: 25, problemSolving: 2 },
    { label: "clears interval to avoid leaks", pattern: /clearInterval/, score: 15, codeQuality: 1 },
    { label: "pauses on hover (onMouseEnter/Leave)", pattern: /onMouseEnter[\s\S]{0,200}onMouseLeave/, score: 20, problemSolving: 1 },
  ],
  "valid-parentheses-stack": [
    { label: "uses an explicit stack structure", pattern: /push|pop|stack/, score: 30, problemSolving: 2 },
    { label: "maps closing brackets to openers", pattern: /[{[][\s\S]{0,30}[)\]}]|pairs|map/, score: 20, problemSolving: 1 },
    { label: "checks empty-stack at end", pattern: /length\s*===\s*0|isEmpty|!stack\.length/, score: 20, codeQuality: 1 },
  ],
  "dynamic-fibonacci": [
    { label: "uses a memoization cache", pattern: /memo|cache|dp/, score: 35, problemSolving: 2 },
    { label: "checks memo before recurring", pattern: /in memo|memo\[|cache\[/, score: 25, codeQuality: 1 },
    { label: "linear-time recursive structure", pattern: /fibonacci\s*\(\s*n\s*-\s*1[^)]*\)\s*\+\s*fibonacci\s*\(\s*n\s*-\s*2/, score: 15, codeQuality: 1 },
  ],
};

/**
 * Generic fallback for custom workspace templates (and any unknown id).
 * Just checks that the candidate did *something* — code length and React
 * hook usage — without making assumptions about the problem.
 */
const GENERIC_RULES: GraderRule[] = [
  { label: "wrote a non-trivial amount of code", pattern: /.{200}/s, score: 25, problemSolving: 1 },
  { label: "uses React hooks", pattern: /\buse[A-Z]\w+/, score: 20, codeQuality: 1 },
  { label: "exports a component or function", pattern: /export\s+(default\s+)?(function|const)/, score: 15, codeQuality: 1 },
];

function rulesForTemplate(templateId: string): GraderRule[] {
  return TEMPLATE_GRADER_RULES[templateId] ?? GENERIC_RULES;
}

// Rules-based static grader fallback for local developers without keys.
// DIFF-AWARE: rules test the candidate's ADDED lines, never the starter
// template — untouched scaffold code earns nothing.
function runRulesBasedGrader(
  files: Record<string, string>,
  chatHistory: { role: "user" | "assistant"; text: string }[],
  templateId: string,
  diffCtx?: { diffs: FileDiff[]; addedCode: string; changedLines: number; meaningfulLines: number }
): GraderResult {
  // Deterministic zero/near-zero effort guard — no credit for untouched scaffold.
  // This also covers the phantom-diff case where the starter was missing at
  // grade time and diffCtx was absent: we treat unknown baseline conservatively.
  if (!diffCtx) {
    return {
      score: 5,
      codeQuality: 1,
      problemSolving: 1,
      communication: 1,
      aiSummary:
        "- [Flaw] No verifiable code changes detected (starter baseline missing or submission empty) — graded conservatively.",
    };
  }
  if (diffCtx.meaningfulLines === 0) {
    return {
      score: 5,
      codeQuality: 1,
      problemSolving: 1,
      communication: chatHistory.filter((c) => c.role === "user").length >= 4 ? 2 : 1,
      aiSummary:
        "- [Flaw] The candidate did not author any meaningful code — no starter files were modified.",
    };
  }
  if (diffCtx.meaningfulLines < MIN_MEANINGFUL_ADDED_LINES) {
    // Near-zero effort: show what they touched but cap strictly downstream.
  }

  let score = 10; // baseline for showing up and changing something
  let codeQuality = 2;
  let problemSolving = 1;
  let communication = 3;
  const strengths: string[] = [];
  const flaws: string[] = [];

  // Signals are tested against what the candidate WROTE, not the scaffold.
  const fileContents = diffCtx.addedCode;
  const rules = rulesForTemplate(templateId);

  for (const rule of rules) {
    if (rule.pattern.test(fileContents)) {
      score += rule.score;
      codeQuality += rule.codeQuality ?? 0;
      problemSolving += rule.problemSolving ?? 0;
      strengths.push(`Code ${rule.label}.`);
    } else {
      flaws.push(`Missing signal: code does not ${rule.label}.`);
    }
  }

  // Communication signal is template-agnostic — based on chat engagement.
  const candidateChats = chatHistory.filter((c) => c.role === "user");
  if (candidateChats.length > 8) {
    communication = 5;
    strengths.push("Highly communicative throughout the session.");
  } else if (candidateChats.length >= 4) {
    communication = 4;
    strengths.push("Engaged moderately with the AI interviewer.");
  } else {
    communication = 2;
    flaws.push("Minimal communication with the AI interviewer.");
  }

  const bullets = [
    ...strengths.map((s) => `+ [Strength] ${s}`),
    ...flaws.map((f) => `- [Flaw] ${f}`),
  ];

  const raw: GraderResult = {
    score: Math.min(100, score),
    codeQuality: Math.min(5, codeQuality),
    problemSolving: Math.min(5, problemSolving),
    communication: Math.min(5, communication),
    aiSummary: bullets.join("\n"),
  };
  return clampRatingsForEffort(raw, diffCtx.meaningfulLines);
}

/** Grade one round's (or a legacy whole-session) submission, with the static
 *  rules-based grader as the no-key / failure fallback. Diff-aware on both
 *  paths. */
async function gradeSubmission(
  apiKey: string | undefined,
  label: string,
  chatLog: string,
  chatHistory: { role: "user" | "assistant"; text: string }[],
  files: Record<string, string>,
  templateId: string,
  workspaceId: string,
  starterFiles?: Record<string, string>
): Promise<GraderResult> {
  // Diff the submission against the round's starter template so graders see
  // only candidate-authored changes.
  let diffs: FileDiff[] = [];
  let hasStarter = false;
  if (starterFiles && Object.keys(starterFiles).length > 0) {
    hasStarter = true;
    try {
      diffs = diffFiles(starterFiles, files);
    } catch {
      diffs = [];
    }
  }
  const changeSummary = hasStarter ? describeChanges(diffs) : "no baseline available";
  const addedCode = diffs.map((d) => d.added.join("\n")).join("\n");
  const changedLines = diffs.reduce((s, d) => s + d.added.length + d.removed.length, 0);
  const meaningfulLines = hasStarter ? meaningfulAddedLines(diffs) : 0;

  // Hard zero-effort fast-path: skip Gemini entirely — deterministic, cheap, fair.
  // This also neutralizes any phantom diff (unknown starter handled below).
  if (hasStarter && meaningfulLines === 0) {
    return runRulesBasedGrader(files, chatHistory, templateId, {
      diffs, addedCode, changedLines, meaningfulLines,
    });
  }
  if (!hasStarter) {
    // Unknown baseline — never credit scaffold-looking code. Log and grade conservatively.
    console.warn(`[grade] no starter baseline for ${label} (templateId=${templateId}) — clamping score`);
    // Still try Gemini with empty diff but clamped downstream; otherwise static guard returns 5.
    if (apiKey) {
      try {
        const raw = await callGeminiGrader(apiKey, label, chatLog, "(empty — no verifiable diff; baseline unavailable)", changeSummary);
        return clampRatingsForEffort(raw, 0);
      } catch (err) {
        console.error("Gemini grading failed, falling back to static:", err);
      }
    }
    return runRulesBasedGrader(files, chatHistory, templateId, undefined);
  }

  if (apiKey) {
    try {
      const diffBlock = renderDiffForPrompt(diffs);
      const raw = await callGeminiGrader(apiKey, label, chatLog, diffBlock, changeSummary);
      return clampRatingsForEffort(raw, meaningfulLines);
    } catch (err) {
      console.error("Gemini grading failed, falling back to static:", err);
    }
  }
  return runRulesBasedGrader(files, chatHistory, templateId,
    { diffs, addedCode, changedLines, meaningfulLines }
  );
}

function parseFilesMap(json: string | null | undefined): Record<string, string> {
  if (!json) return {};
  try {
    const p = JSON.parse(json);
    return p && typeof p === "object" && !Array.isArray(p) ? (p as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export type GradeOutcome =
  | { ok: true; status: "graded"; sessionId: string; score: number; abandoned: boolean }
  | { ok: false; reason: "not_found" | "already_graded" };

/**
 * Grade and finish an AI screening session.
 *
 * @param submittedFiles      Candidate-provided file map (submit path). When
 *                            absent, each round is graded on its last-saved
 *                            filesJson (abandonment/cron path).
 * @param roundFilesOverride  Per-round candidate-provided files.
 * @param telemetry           Proctoring events (submit path only).
 * @param origin              Public origin for recruiter notify emails.
 */
export async function gradeSessionById(params: {
  sessionId: string;
  submittedFiles?: Record<string, string>;
  roundFilesOverride?: Record<string, Record<string, string>>;
  telemetry?: TelemetryEvent[];
  origin?: string;
}): Promise<GradeOutcome> {
  const session = await prisma.aIInterviewSession.findUnique({
    where: { id: params.sessionId },
    include: { rounds: true },
  });
  if (!session) return { ok: false, reason: "not_found" };

  // Idempotency guard — once graded, never regrade. Protects against the
  // candidate submitting while the abandonment cron holds the same session.
  if (session.finishedAt) return { ok: false, reason: "already_graded" };

  let chatHistory: { role: "user" | "assistant"; text: string }[] = [];
  try {
    chatHistory = JSON.parse(session.chatHistory);
  } catch {
    chatHistory = [];
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const sessionRounds = resolveSessionRounds(session);
  const legacy = sessionRounds.length === 1 && sessionRounds[0].legacy;

  // Authoritative starter baseline — SNAPSHOT FIRST.
  // 1. Per-round starterFilesJson captured at invite (immutable, no drift).
  // 2. Legacy session starterFilesJson.
  // 3. Live resolver fallback (pre-snapshot sessions).
  let startersByRound = new Map<string, Record<string, string>>();
  const roundById = new Map<string, (typeof session.rounds)[number]>((session.rounds ?? []).map((rr) => [rr.id, rr]));
  for (const r of sessionRounds) {
    // Try snapshot stored on the round row
    const rawRound = roundById.get(r.id) as unknown as { starterFilesJson?: string | null } | undefined;
    const snap = parseFilesMap((rawRound as unknown as { starterFilesJson?: string | null })?.starterFilesJson ?? null);
    if (snap && Object.keys(snap).length > 0) {
      startersByRound.set(r.id, snap);
      continue;
    }
    // Legacy: session-level snapshot
    if (r.legacy) {
      const sessSnap = parseFilesMap((session as unknown as { starterFilesJson?: string | null }).starterFilesJson ?? null);
      if (sessSnap && Object.keys(sessSnap).length > 0) {
        startersByRound.set(r.id, sessSnap);
        continue;
      }
    }
  }
  // Fallback for any rounds still missing a baseline (pre-snapshot data)
  const missing = sessionRounds.filter((r) => !startersByRound.has(r.id));
  if (missing.length > 0) {
    try {
      const resolved = await getStarterFilesByRoundId(session, session.workspaceId);
      for (const r of missing) {
        const v = resolved.get(r.id);
        if (v && Object.keys(v).length > 0) startersByRound.set(r.id, v);
      }
    } catch {
      // leave missing as unknown starter — gradeSubmission will clamp conservatively
    }
  }

  // Files each round is graded on: prefer the submitted map, else the round's
  // last-saved files (saved on every chat turn — so an abandoned session still
  // carries its latest code snapshot).
  const filesForRound = (r: SessionRound): Record<string, string> =>
    legacy ? params.submittedFiles ?? parseFilesMap(session.filesJson)
      : params.roundFilesOverride?.[r.id] ?? parseFilesMap(r.filesJson);

  const graded = await Promise.all(
    sessionRounds.map(async (r) => {
      const label =
        sessionRounds.length > 1
          ? `${session.positionTitle} — Round ${r.order + 1}`
          : session.positionTitle;
      // Starter for this round (works for every round source kind).
      const starterFiles = startersByRound.get(r.id);
      const result = await gradeSubmission(
        apiKey,
        label,
        session.chatHistory,
        chatHistory,
        filesForRound(r),
        r.templateId ?? session.templateId,
        session.workspaceId,
        starterFiles && Object.keys(starterFiles).length > 0 ? starterFiles : undefined
      );
      return { round: r, files: filesForRound(r), result };
    })
  );

  const aggregateScore = Math.round(
    graded.reduce((s, g) => s + g.result.score, 0) / graded.length
  );
  const avg = (sel: (g: GraderResult) => number) =>
    Math.round((graded.reduce((s, g) => s + sel(g.result), 0) / graded.length) * 10) / 10;
  const ratingsPayload = {
    CodeQuality: avg((g) => g.codeQuality),
    ProblemSolving: avg((g) => g.problemSolving),
    Communication: avg((g) => g.communication),
  };
  const aiSummary =
    graded.length > 1
      ? graded
          .map((g) => `Round ${g.round.order + 1} (${g.result.score}/100):\n${g.result.aiSummary}`)
          .join("\n\n")
      : graded[0].result.aiSummary;

  const mergedFiles: Record<string, string> = {};
  for (const g of graded) Object.assign(mergedFiles, g.files);

  // Integrity signal from candidate-side telemetry over ALL submitted code.
  let aiSuspicionScore: number | null = null;
  if (Array.isArray(params.telemetry) && params.telemetry.length > 0) {
    const totalCodeLen = Object.values(mergedFiles).reduce(
      (acc, src) => acc + (typeof src === "string" ? src.length : 0),
      0
    );
    aiSuspicionScore = analyzeTelemetry(params.telemetry, totalCodeLen).aiSuspicionScore;
  }

  // Persist the per-round grades (real rounds) + the session composite in one
  // transaction. Setting finishedAt locks the session against re-grade.
  const finishedAt = new Date();
  const [updated] = await prisma.$transaction([
    prisma.aIInterviewSession.update({
      where: { id: session.id },
      data: {
        filesJson: JSON.stringify(mergedFiles),
        status: "COMPLETED",
        score: aggregateScore,
        ratings: JSON.stringify(ratingsPayload),
        aiSummary,
        aiSuspicionScore,
        finishedAt,
      },
    }),
    ...(legacy
      ? []
      : graded.map((g) =>
          prisma.aIInterviewRound.update({
            where: { id: g.round.id },
            data: {
              filesJson: JSON.stringify(g.files),
              status: "COMPLETED",
              score: g.result.score,
              ratings: JSON.stringify({
                CodeQuality: g.result.codeQuality,
                ProblemSolving: g.result.problemSolving,
                Communication: g.result.communication,
              }),
              finishedAt,
            },
          })
        )),
  ]);

  // IP-69: a completed screening forward-advances the candidate to SCREENED
  // (no-op for practice runs, unlinked candidates, or anyone already ahead).
  if (!session.practice) {
    void advanceCandidateStage({
      workspaceId: session.workspaceId,
      ...(session.candidateId
        ? { candidateId: session.candidateId }
        : { email: session.candidateEmail }),
      toStage: "SCREENED",
      source: "auto:ai-screening-completed",
    });
  }

  void notifyWorkspaceRecruiters({
    workspaceId: session.workspaceId,
    sessionId: session.id,
    candidateName: session.candidateName,
    positionTitle: session.positionTitle,
    score: aggregateScore,
    aiSuspicionScore,
    origin: params.origin ?? process.env.NEXTAUTH_URL ?? "",
  }).catch((err) => console.warn("[ai-grade] recruiter notify failed:", err));

  return {
    ok: true,
    status: "graded",
    sessionId: session.id,
    score: aggregateScore,
    abandoned: !params.submittedFiles && !params.roundFilesOverride,
  };
}

/**
 * Fan out recruiter notification emails. Looks up all workspace members with
 * write privileges (OWNER/ADMIN/INTERVIEWER) and sends each one a graded
 * scorecard link. Skips members without an email. Logs per-recipient failures
 * but never throws.
 */
async function notifyWorkspaceRecruiters(params: {
  workspaceId: string;
  sessionId: string;
  candidateName: string;
  positionTitle: string;
  score: number;
  aiSuspicionScore: number | null;
  origin: string;
}) {
  if (!params.origin) return;
  const workspace = await prisma.workspace.findUnique({
    where: { id: params.workspaceId },
    select: {
      name: true,
      slug: true,
      members: {
        where: { role: { in: [...STAFF_ROLES] } },
        select: { user: { select: { email: true, name: true } } },
      },
    },
  });
  if (!workspace) return;

  const consoleUrl = `${params.origin}/w/${workspace.slug}/ai-interviews`;

  const sends = workspace.members
    .filter((m) => !!m.user.email)
    .map(async (m) => {
      const res = await sendRecruiterNotifyEmail({
        recruiterEmail: m.user.email!,
        recruiterName: m.user.name || "there",
        candidateName: params.candidateName,
        positionTitle: params.positionTitle,
        workspaceName: workspace.name,
        score: params.score,
        aiSuspicionScore: params.aiSuspicionScore,
        consoleUrl,
        workspaceId: params.workspaceId,
      });
      if (!res.sent) {
        console.warn(`[ai-grade] ${m.user.email}: ${res.reason}`);
      }
    });

  await Promise.allSettled(sends);
}
