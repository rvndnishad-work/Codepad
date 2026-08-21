import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { resolveSessionRounds, type SessionRound } from "@/lib/ai-interview/rounds";
import { resolveRoundsContent } from "@/lib/ai-interview/round-content";
import { normalizeEngagementLevel } from "@/lib/ai-interview/credits";
import {
  callGemini,
  extractText,
  geminiApiKey,
  type GeminiContent,
} from "@/lib/ai-interview/gemini";
import { getAgentConfig } from "@/lib/agents/config";
import { DEFAULT_AGENTS } from "@/lib/agents/defaults";
import { renderPrompt } from "@/lib/agents/types";

/**
 * Proactive "Observer" endpoint — the background half of the live-presence
 * feature. The candidate workspace pings this on a debounced loop while the
 * person codes; the AI silently decides whether to interject with ONE short
 * nudge. Most calls return `{ comment: null }` and nothing is shown.
 *
 * Authorized by the invite token (same trust model as `message`). It NEVER
 * charges credits (the engagement level's cost is charged once on the first
 * message) and NEVER counts against the user-message budget. Two throttles
 * keep cost bounded: a per-session cooldown (level-dependent) and a hard cap on
 * total proactive comments per session.
 */

type Message = { role: "user" | "assistant"; text: string };

const LEVEL_CONFIG: Record<"OBSERVER" | "COACH", { cooldownMs: number; maxProactive: number }> = {
  // Sparing — a glance every ~2.5 min, capped low.
  OBSERVER: { cooldownMs: 150_000, maxProactive: 12 },
  // Actively present — up to ~once a minute, higher cap.
  COACH: { cooldownMs: 75_000, maxProactive: 25 },
};

const FILES_CLIP = 10_000;

function truncateFilesForPrompt(files: Record<string, string>): string {
  const json = JSON.stringify(files ?? {});
  if (json.length <= FILES_CLIP) return json;
  return json.slice(0, FILES_CLIP) + '..."<truncated>"}';
}

/** Plain-text one-shot Gemini call (no tools). Returns "" on any failure. */
async function callGeminiText(params: {
  apiKey: string;
  systemInstruction: string;
  userText: string;
  model?: string | null;
  temperature?: number;
  maxOutputTokens?: number;
}): Promise<string> {
  try {
    // Shared client: timeout + retry + correct thinking-model config. The
    // visible reply is just one short sentence, so thinking stays off.
    const contents: GeminiContent[] = [
      { role: "user", parts: [{ text: params.userText }] },
    ];
    const result = await callGemini({
      apiKey: params.apiKey,
      contents,
      systemInstruction: params.systemInstruction,
      maxOutputTokens: params.maxOutputTokens ?? 512,
      temperature: params.temperature ?? 0.5,
      model: params.model,
    });
    return extractText(result.parts).trim();
  } catch {
    return "";
  }
}

/** Did the model decline to interject? Treat empty / NONE / quotes-only as "no". */
function isSilent(text: string): boolean {
  const t = text.replace(/^["'`\s]+|["'`\s]+$/g, "").trim();
  if (!t) return true;
  return /^none\b/i.test(t) || t.toUpperCase() === "NONE";
}

export async function POST(req: NextRequest) {
  let body: {
    inviteToken?: string;
    roundId?: string;
    files?: Record<string, string>;
    lastRun?: { stdout?: string; stderr?: string };
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const inviteToken = (body.inviteToken ?? "").trim();
  if (!inviteToken) {
    return NextResponse.json({ error: "Missing inviteToken" }, { status: 400 });
  }

  const session = await prisma.aIInterviewSession.findUnique({
    where: { inviteToken },
    include: { rounds: true },
  });
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (session.finishedAt) {
    return NextResponse.json({ error: "Interview already submitted." }, { status: 410 });
  }

  const level = normalizeEngagementLevel(session.engagementLevel);
  // Reactive screenings never interject. Also skip until the session has
  // actually started (credit charged on the greeting) — no free proactive work.
  if (level === "REACTIVE" || !session.startedAt) {
    return NextResponse.json({ comment: null });
  }
  const cfg = LEVEL_CONFIG[level];

  // Respect the whole-session deadline — once time's up, stay quiet.
  const sessionRounds = resolveSessionRounds(session);
  const totalMinutes = sessionRounds.reduce((s, r) => s + (r.estimatedMinutes || 0), 0) || 30;
  const deadline = new Date(new Date(session.startedAt).getTime() + totalMinutes * 60_000 + 30_000);
  if (Date.now() > deadline.getTime()) {
    return NextResponse.json({ comment: null });
  }

  // Hard cap on total interjections this session.
  if (session.proactiveCount >= cfg.maxProactive) {
    return NextResponse.json({ comment: null });
  }

  // Per-session cooldown. A throttled hit isn't an error — just stay silent.
  const rl = rateLimit(`ai-observe:${session.id}`, 1, cfg.cooldownMs);
  if (!rl.ok) {
    return NextResponse.json({ comment: null });
  }

  const apiKey = geminiApiKey();
  if (!apiKey) {
    // No model → no proactive mock noise.
    return NextResponse.json({ comment: null });
  }

  // Resolve the active round so the nudge is scoped to the right task/stack.
  const activeRound: SessionRound =
    sessionRounds.find((r) => r.id === body.roundId) ?? sessionRounds[0];
  const roundContent = (
    await resolveRoundsContent([activeRound], session.workspaceId).catch(() => [])
  )[0];
  const kind = roundContent?.kind ?? "frontend";
  const lang = roundContent?.language;
  const fw = roundContent?.frameworkLabel;
  const stackLine =
    kind === "backend"
      ? `Backend task in ${lang ?? "the chosen language"}${fw ? ` (${fw})` : ""}.`
      : kind === "dsa"
        ? `DSA/algorithms task in ${lang ?? "the chosen language"}.`
        : `Frontend task${fw ? ` using ${fw}` : ""}.`;

  let history: Message[] = [];
  try {
    history = JSON.parse(session.chatHistory) as Message[];
  } catch {
    history = [];
  }
  const recent = history
    .slice(-4)
    .map((m) => `${m.role === "assistant" ? "You" : "Candidate"}: ${m.text}`)
    .join("\n");

  // Configurable coach persona (workspace → platform → code default).
  const agent = await getAgentConfig("COACH", session.workspaceId);
  const systemInstruction = renderPrompt(
    agent.systemPrompt || DEFAULT_AGENTS.COACH.systemPrompt,
    {
      modeBlock: "",
      positionTitle: session.positionTitle,
      taskTitle: roundContent?.title ?? session.positionTitle,
      stackLine,
      contextBlock: recent ? `\nRecent conversation:\n${recent}` : "",
    }
  );

  const runOut =
    body.lastRun && (body.lastRun.stdout || body.lastRun.stderr)
      ? `\n\nLatest run:\nSTDOUT:\n${(body.lastRun.stdout ?? "").slice(0, 1200) || "(empty)"}\nSTDERR:\n${(body.lastRun.stderr ?? "").slice(0, 1200) || "(none)"}`
      : "";
  const userText = `Candidate's current files:\n${truncateFilesForPrompt(body.files ?? {})}${runOut}\n\nShould you interject right now? One short sentence, or NONE.`;

  const raw = await callGeminiText({
    apiKey,
    systemInstruction,
    userText,
    model: agent.model,
    temperature: agent.temperature,
    maxOutputTokens: agent.maxOutputTokens,
  });
  if (isSilent(raw)) {
    return NextResponse.json({ comment: null });
  }
  const comment = raw.replace(/^["'`\s]+|["'`\s]+$/g, "").trim();

  // Persist the interjection + bump the cap counter in one transaction, reading
  // the freshest chat history so two near-simultaneous observes don't clobber.
  const updatedHistory = await prisma.$transaction(async (tx) => {
    const fresh = await tx.aIInterviewSession.findUnique({
      where: { id: session.id },
      select: { chatHistory: true, proactiveCount: true, finishedAt: true },
    });
    if (!fresh || fresh.finishedAt) return null;
    if (fresh.proactiveCount >= cfg.maxProactive) return null;
    let hist: Message[] = [];
    try {
      hist = JSON.parse(fresh.chatHistory) as Message[];
    } catch {
      hist = [];
    }
    hist.push({ role: "assistant", text: comment });
    await tx.aIInterviewSession.update({
      where: { id: session.id },
      data: { chatHistory: JSON.stringify(hist), proactiveCount: { increment: 1 } },
    });
    return hist;
  });

  if (!updatedHistory) {
    return NextResponse.json({ comment: null });
  }
  return NextResponse.json({ comment, chatHistory: updatedHistory });
}
