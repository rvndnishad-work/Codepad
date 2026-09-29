import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimitDistributed } from "@/lib/rate-limit";
import {
  callTogether,
  extractText,
  togetherApiKey,
  TogetherUnavailableError,
} from "@/lib/ai-interview/together";
import {
  PLAYGROUND_ASSIST_DAILY_LIMIT,
  PLAYGROUND_ASSIST_MAX_CODE_CHARS,
  PLAYGROUND_ASSIST_MAX_HISTORY_MESSAGES,
  PLAYGROUND_ASSIST_MAX_MESSAGE_CHARS,
  PLAYGROUND_ASSIST_MAX_OUTPUT_TOKENS,
  PLAYGROUND_ASSIST_WINDOW_MS,
  truncate,
  buildMessages,
  validateAssistMessage,
  type AssistHistoryItem,
} from "@/lib/playground-assist";
import {
  getPlaygroundAssistSettings,
  type PlaygroundAssistSettings,
} from "@/lib/settings";

/**
 * POST /api/playground/assist
 *
 * Playground AI Assist (GLM-5.3-Flash via the shared Together client).
 * Body: { message, history?, fileName?, code?, contextLabel? }
 *
 * Policy (quota + kill switch live in Admin → Site Settings → AI Assist):
 * - Login required (401 otherwise) — anonymous traffic must never touch the
 *   project's model quota.
 * - Admin-configurable free messages / 24h per user (429 otherwise). No extra
 *   DB needed: the distributed limiter is Redis-backed in prod, in-memory
 *   locally.
 * - Scoped to the editor: the model only ever sees the active file (+ short
 *   history) and a system prompt that refuses off-topic questions.
 */
export const runtime = "nodejs";

const FALLBACK_ASSIST_SETTINGS: PlaygroundAssistSettings = {
  enabled: true,
  dailyLimit: PLAYGROUND_ASSIST_DAILY_LIMIT,
};

async function assistSettings(): Promise<PlaygroundAssistSettings> {
  try {
    return await getPlaygroundAssistSettings();
  } catch {
    // Fail open with defaults if the settings read blows up — same posture
    // as the other get*Settings helpers.
    return FALLBACK_ASSIST_SETTINGS;
  }
}

/**
 * GET /api/playground/assist
 *
 * Public config probe for the sidebar: { enabled, dailyLimit }. No auth, no
 * quota consumed — lets the UI show the real limit and the disabled state
 * without spending a message.
 */
export async function GET() {
  const cfg = await assistSettings();
  return json({ enabled: cfg.enabled, dailyLimit: cfg.dailyLimit }, 200);
}

function json(data: unknown, status: number, extraHeaders?: Record<string, string>) {
  return NextResponse.json(data, {
    status,
    headers: { "cache-control": "no-store", ...extraHeaders },
  });
}

function sanitizeHistory(value: unknown): AssistHistoryItem[] {
  if (!Array.isArray(value)) return [];
  const out: AssistHistoryItem[] = [];
  for (const item of value) {
    if (out.length >= PLAYGROUND_ASSIST_MAX_HISTORY_MESSAGES) break;
    if (
      typeof item === "object" &&
      item !== null &&
      ((item as { role?: unknown }).role === "user" ||
        (item as { role?: unknown }).role === "assistant") &&
      typeof (item as { text?: unknown }).text === "string"
    ) {
      const text = (item as { text: string }).text.trim();
      if (text) out.push({ role: (item as { role: "user" | "assistant" }).role, text: truncate(text, PLAYGROUND_ASSIST_MAX_MESSAGE_CHARS) });
    }
  }
  return out;
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  if (!userId) {
    return json({ error: "Sign in to use AI Assist." }, 401);
  }

  const cfg = await assistSettings();
  if (!cfg.enabled) {
    return json(
      { error: "AI Assist is currently disabled. Check back later." },
      403,
    );
  }

  const rl = await rateLimitDistributed(
    `playground-assist:${userId}`,
    cfg.dailyLimit,
    PLAYGROUND_ASSIST_WINDOW_MS,
  );
  if (!rl.ok) {
    return json(
      {
        error: `Daily limit reached (${cfg.dailyLimit} messages/day). Try again tomorrow.`,
        remaining: 0,
        limit: cfg.dailyLimit,
      },
      429,
      { "retry-after": String(Math.max(1, Math.ceil(rl.resetMs / 1000))) },
    );
  }

  const apiKey = togetherApiKey();
  if (!apiKey) {
    return json({ error: "AI Assist is not configured on this server." }, 503);
  }

  const body = await req.json().catch(() => null);
  const checked = validateAssistMessage(body?.message);
  if (!checked.ok) {
    return json({ error: checked.error }, 400);
  }
  const fileName = typeof body?.fileName === "string" ? body.fileName.slice(0, 200) : "";
  const code = typeof body?.code === "string" ? body.code.slice(0, PLAYGROUND_ASSIST_MAX_CODE_CHARS * 4) : "";
  const contextLabel = typeof body?.contextLabel === "string" ? body.contextLabel.slice(0, 200) : "";
  const history = sanitizeHistory(body?.history);

  const messages = buildMessages({
    history,
    message: checked.message,
    fileName,
    code,
    contextLabel,
  });

  try {
    const { parts } = await callTogether({
      apiKey,
      messages,
      maxOutputTokens: PLAYGROUND_ASSIST_MAX_OUTPUT_TOKENS,
      temperature: 0.3,
    });
    const reply = extractText(parts).trim();
    if (!reply) {
      return json({ error: "The model returned an empty response. Try again." }, 502);
    }
    return json({ reply, remaining: rl.remaining, limit: cfg.dailyLimit }, 200);
  } catch (err) {
    if (err instanceof TogetherUnavailableError) {
      return json(
        { error: "AI Assist is temporarily unavailable. Try again in a moment." },
        502,
      );
    }
    throw err;
  }
}
