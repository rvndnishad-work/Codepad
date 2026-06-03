import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { analyzeTelemetry, type TelemetryEvent } from "@/lib/proctoring/ai-detection";
import { AI_INTERVIEW_GEMINI_MODEL } from "@/lib/ai-interview/scaffolds";
import { sendRecruiterNotifyEmail } from "@/lib/ai-interview/submit-notify";
import { checkFilesSize } from "@/lib/ai-interview/files-size";
import { resolveSessionRounds, type SessionRound } from "@/lib/ai-interview/rounds";

type GraderResult = {
  score: number;
  codeQuality: number;
  problemSolving: number;
  communication: number;
  aiSummary: string;
};

// Call Gemini API to perform programmatic grading
async function callGeminiGrader(
  apiKey: string,
  positionTitle: string,
  chatLog: string,
  codeFiles: string
): Promise<GraderResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${AI_INTERVIEW_GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const prompt = `You are the Interviewpad AI Grading Agent. 
Evaluate a candidate who took an automated AI technical coding interview for "${positionTitle}".

Here is the candidate's final chat conversation log:
${chatLog}

Here are the candidate's final submitted code files:
${codeFiles}

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
// Template-dispatched: rules are pulled from the matching scaffold or, for
// custom workspace templates, a generic baseline.
function runRulesBasedGrader(
  files: Record<string, string>,
  chatHistory: any[],
  templateId: string
): GraderResult {
  let score = 30;
  let codeQuality = 2;
  let problemSolving = 1;
  let communication = 3;
  const strengths: string[] = [];
  const flaws: string[] = [];

  const fileContents = Object.values(files).join("\n");
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
  const candidateChats = chatHistory.filter((c: any) => c.role === "user");
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
 *  rules-based grader as the no-key / failure fallback. */
async function gradeSubmission(
  apiKey: string | undefined,
  label: string,
  chatLog: string,
  chatHistory: any[],
  files: Record<string, string>,
  templateId: string
): Promise<GraderResult> {
  if (apiKey) {
    try {
      return await callGeminiGrader(apiKey, label, chatLog, JSON.stringify(files));
    } catch (err) {
      console.error("Gemini grading failed, falling back to static:", err);
    }
  }
  return runRulesBasedGrader(files, chatHistory, templateId);
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { inviteToken, files, roundFiles, telemetry } = body as {
      inviteToken: string;
      files: Record<string, string>;
      /** Per-round files keyed by round id (multi-round screenings). */
      roundFiles?: Record<string, Record<string, string>>;
      telemetry?: TelemetryEvent[];
    };

    if (!inviteToken || !files) {
      return NextResponse.json({ error: "Missing inviteToken or files" }, { status: 400 });
    }

    // Cap each submitted file map — a screening can't end with a bigger payload
    // than the in-flight chat tolerates.
    for (const map of [files, ...Object.values(roundFiles ?? {})]) {
      const sizeCheck = checkFilesSize(map);
      if (!sizeCheck.ok) {
        return NextResponse.json({ error: sizeCheck.reason }, { status: 413 });
      }
    }

    const session = await prisma.aIInterviewSession.findUnique({
      where: { inviteToken },
      include: { rounds: true },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Idempotency guard — once graded, never regrade. Without this an attacker
    // (or a double-click) could submit fresh files and overwrite the score.
    if (session.finishedAt) {
      return NextResponse.json(
        { error: "This interview has already been submitted." },
        { status: 410 }
      );
    }

    let chatHistory: any[] = [];
    try {
      chatHistory = JSON.parse(session.chatHistory);
    } catch {
      chatHistory = [];
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const sessionRounds = resolveSessionRounds(session);
    const legacy = sessionRounds.length === 1 && sessionRounds[0].legacy;

    // Files each round is graded on: prefer the submitted map, else the round's
    // last-saved files (a legacy session uses the single `files` payload).
    const filesForRound = (r: SessionRound): Record<string, string> =>
      legacy ? files : roundFiles?.[r.id] ?? parseFilesMap(r.filesJson);

    // Grade every round (one grade for a legacy session). The chat is shared, so
    // each round is graded against the full conversation + that round's code.
    const graded = await Promise.all(
      sessionRounds.map(async (r) => {
        const label =
          sessionRounds.length > 1
            ? `${session.positionTitle} — Round ${r.order + 1}`
            : session.positionTitle;
        const result = await gradeSubmission(
          apiKey,
          label,
          session.chatHistory,
          chatHistory,
          filesForRound(r),
          r.templateId ?? session.templateId
        );
        return { round: r, files: filesForRound(r), result };
      })
    );

    // Aggregate per-round grades into the session composite.
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

    // Merge all round files into one snapshot for the session row (back-compat
    // with the current recruiter console; P3 renders per-round).
    const mergedFiles: Record<string, string> = {};
    for (const g of graded) Object.assign(mergedFiles, g.files);

    // Integrity signal from candidate-side telemetry over ALL submitted code.
    let aiSuspicionScore: number | null = null;
    if (Array.isArray(telemetry) && telemetry.length > 0) {
      const totalCodeLen = Object.values(mergedFiles).reduce(
        (acc, src) => acc + (typeof src === "string" ? src.length : 0),
        0
      );
      aiSuspicionScore = analyzeTelemetry(telemetry, totalCodeLen).aiSuspicionScore;
    }

    // Persist the per-round grades (real rounds) + the session composite in one
    // transaction. Setting finishedAt locks the session against re-grade.
    const finishedAt = new Date();
    const [updated] = await prisma.$transaction([
      prisma.aIInterviewSession.update({
        where: { id: session.id },
        data: {
          filesJson: JSON.stringify(legacy ? files : mergedFiles),
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

    // Notify all workspace members who can act on the result. Fire-and-forget:
    // the candidate response must not wait on SMTP/Resend round-trips, and
    // notification failures must never roll back a graded session.
    void notifyWorkspaceRecruiters({
      workspaceId: session.workspaceId,
      sessionId: session.id,
      candidateName: session.candidateName,
      positionTitle: session.positionTitle,
      score: aggregateScore,
      aiSuspicionScore,
      origin: req.headers.get("x-forwarded-host")
        ? `${req.headers.get("x-forwarded-proto") ?? "https"}://${req.headers.get("x-forwarded-host")}`
        : new URL(req.url).origin,
    }).catch((err) => console.warn("[ai-submit-notify] dispatch failed:", err));

    return NextResponse.json({
      success: true,
      session: updated,
    });
  } catch (error) {
    console.error("AI submission grading error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Fan out recruiter notification emails. Looks up all workspace members with
 * write privileges (OWNER/ADMIN/INTERVIEWER) and sends each one a graded
 * scorecard link. Skips members without an email. Logs per-recipient failures
 * but never throws — the caller is the candidate response path.
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
  const workspace = await prisma.workspace.findUnique({
    where: { id: params.workspaceId },
    select: {
      name: true,
      slug: true,
      members: {
        where: { role: { in: ["OWNER", "ADMIN", "INTERVIEWER"] } },
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
        console.warn(`[ai-submit-notify] ${m.user.email}: ${res.reason}`);
      }
    });

  await Promise.allSettled(sends);
}
