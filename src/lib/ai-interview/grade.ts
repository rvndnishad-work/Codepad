import { prisma } from "@/lib/prisma";
import { analyzeTelemetry, type TelemetryEvent } from "@/lib/proctoring/ai-detection";
import { AI_INTERVIEW_GEMINI_MODEL } from "@/lib/ai-interview/scaffolds";
import { sendRecruiterNotifyEmail } from "@/lib/ai-interview/submit-notify";
import { resolveSessionRounds, type SessionRound } from "@/lib/ai-interview/rounds";
import { STAFF_ROLES } from "@/lib/permissions/role-groups";
import { advanceCandidateStage } from "@/lib/crm/advance";
import { resolveTemplate } from "@/lib/ai-interview/template-resolver";
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

Output your response strictly as a JSON object containing precisely:
{
  "score": number (0-100 composite score),
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
  diffCtx?: { diffs: FileDiff[]; addedCode: string; changedLines: number }
): GraderResult {
  // Zero-effort guard: submission identical to the starter template.
  if (diffCtx && diffCtx.changedLines === 0) {
    return {
      score: 5,
      codeQuality: 1,
      problemSolving: 1,
      communication: chatHistory.filter((c) => c.role === "user").length >= 4 ? 3 : 1,
      aiSummary:
        "- [Flaw] The candidate did not modify any starter files — no code was written for this task.",
    };
  }

  let score = 10; // baseline for showing up and changing something
  let codeQuality = 2;
  let problemSolving = 1;
  let communication = 3;
  const strengths: string[] = [];
  const flaws: string[] = [];

  // Signals are tested against what the candidate WROTE, not the scaffold.
  const fileContents = diffCtx ? diffCtx.addedCode : Object.values(files).join("\n");
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

  return {
    score: Math.min(100, score),
    codeQuality: Math.min(5, codeQuality),
    problemSolving: Math.min(5, problemSolving),
    communication: Math.min(5, communication),
    aiSummary: bullets.join("\n"),
  };
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
  if (starterFiles) {
    try {
      diffs = diffFiles(starterFiles, files);
    } catch {
      diffs = [];
    }
  }
  const changeSummary = describeChanges(diffs);
  const addedCode = diffs.map((d) => d.added.join("\n")).join("\n");
  const changedLines =
    diffs.reduce((s, d) => s + d.added.length + d.removed.length, 0);

  if (apiKey) {
    try {
      const diffBlock = starterFiles
        ? renderDiffForPrompt(diffs)
        : Object.values(files).join("\n"); // unknown starter — fall back to raw files
      return await callGeminiGrader(apiKey, label, chatLog, diffBlock, changeSummary);
    } catch (err) {
      console.error("Gemini grading failed, falling back to static:", err);
    }
  }
  return runRulesBasedGrader(files, chatHistory, templateId,
    starterFiles ? { diffs, addedCode, changedLines } : undefined
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
      // Resolve the round's starter template so grading is diff-aware —
      // untouched scaffold code must never earn credit.
      let starterFiles: Record<string, string> | undefined;
      try {
        starterFiles = (
          await resolveTemplate(r.templateId ?? session.templateId, session.workspaceId)
        )?.starterFiles;
      } catch {
        starterFiles = undefined; // unknown template — grade raw files
      }
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
