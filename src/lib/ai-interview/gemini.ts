/**
 * Shared Gemini REST client for AI Interview endpoints.
 *
 * Why this exists: every route used to hand-roll its own fetch with the same
 * three bugs — no timeout (a hung upstream hangs the candidate's request),
 * no retry on transient 429/5xx (one blip silently downgraded the whole
 * interview to the canned mock agent), and no thinking-model config (on
 * gemini-2.5-* "thinking" tokens count against maxOutputTokens, so a small
 * cap could return zero visible text and look like an outage).
 *
 * One client, one place to fix them.
 */

/** Model used for all AI Interview calls. Centralized in scaffolds.ts. */
export { AI_INTERVIEW_GEMINI_MODEL } from "@/lib/ai-interview/scaffolds";

import { AI_INTERVIEW_GEMINI_MODEL } from "@/lib/ai-interview/scaffolds";

/**
 * One content entry in Gemini's `contents` array. Loose because parts can be
 * `{text}` OR `{functionCall}` OR `{functionResponse}` across a tool-use loop.
 */
export type GeminiPart =
  | { text: string }
  | { functionCall: { name: string; args?: unknown } }
  | { functionResponse: { name: string; response: { content?: string; error?: string } } };

export type GeminiContent = { role: "user" | "model"; parts: GeminiPart[] };

/**
 * Raised when Gemini is unreachable, rate-limited, or server-side broken —
 * i.e. situations where falling back to the offline mock agent is honest.
 * Callers surface this as a "degraded mode" signal instead of swallowing it.
 */
export class GeminiUnavailableError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = "GeminiUnavailableError";
  }
}

const REQUEST_TIMEOUT_MS = 30_000;
/** One automatic retry for these — they are transient by nature. */
const RETRYABLE_STATUS = new Set([429, 500, 502, 503]);
const RETRY_DELAY_MS = 800;

/** Resolve the server-side API key without leaking which env var won. */
export function geminiApiKey(): string | null {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || null;
}

/**
 * Flash models from Gemini 2.5 onward accept an explicit thinking budget
 * (0 = disabled) — "thinking" tokens count against maxOutputTokens, so for
 * conversational interview turns we disable thinking by default (snappy
 * replies, no empty-response failures) but allow an env override for
 * quality-sensitive deployments. Pro-family models require a minimum budget,
 * so we skip the field entirely there.
 */
function thinkingConfigFor(model: string): { thinkingBudget: number } | null {
  if (!/^gemini-(2\.5|3(?:\.\d+)*)-flash/.test(model)) return null;
  const raw = Number(process.env.AI_INTERVIEW_THINKING_BUDGET);
  const budget = Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : 0;
  return { thinkingBudget: budget };
}

/** Concatenate the text parts of a response (ignoring functionCall parts). */
export function extractText(parts: GeminiPart[]): string {
  return parts
    .map((p) => ("text" in p ? p.text : ""))
    .filter(Boolean)
    .join("");
}

/**
 * Single-shot Gemini call. Returns the raw candidate parts so callers can
 * inspect function-call vs text parts. Throws GeminiUnavailableError on
 * timeout / network / retryable HTTP failure (after one retry).
 */
export async function callGemini(params: {
  apiKey: string;
  contents: GeminiContent[];
  systemInstruction: string;
  /** Function declarations enabling tool use. Omit for plain text generation. */
  tools?: Array<Record<string, unknown>>;
  maxOutputTokens?: number;
  temperature?: number;
  /** Per-agent model override; defaults to AI_INTERVIEW_GEMINI_MODEL. */
  model?: string | null;
}): Promise<{ parts: GeminiPart[]; finishReason: string | null }> {
  const model = params.model || AI_INTERVIEW_GEMINI_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${params.apiKey}`;

  const generationConfig: Record<string, unknown> = {
    maxOutputTokens: params.maxOutputTokens ?? 1024,
    temperature: params.temperature ?? 0.7,
  };
  const thinking = thinkingConfigFor(model);
  if (thinking) generationConfig.thinkingConfig = thinking;

  const body: Record<string, unknown> = {
    contents: params.contents,
    systemInstruction: { parts: [{ text: params.systemInstruction }] },
    generationConfig,
  };
  if (params.tools && params.tools.length > 0) {
    body.tools = [{ functionDeclarations: params.tools }];
  }

  let lastErr: GeminiUnavailableError | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      lastErr = new GeminiUnavailableError("Gemini unreachable or timed out");
      continue;
    }
    if (!res.ok) {
      // Retry only transient statuses; 4xx like 400/403 are permanent —
      // fail fast so the caller can degrade immediately.
      if (RETRYABLE_STATUS.has(res.status)) {
        lastErr = new GeminiUnavailableError(`Gemini HTTP error ${res.status}`, res.status);
        continue;
      }
      throw new GeminiUnavailableError(`Gemini HTTP error ${res.status}`, res.status);
    }
    const data = await res.json();
    const parts = data.candidates?.[0]?.content?.parts;
    if (!Array.isArray(parts) || parts.length === 0) {
      // Thinking budget exhausted or safety-blocked — treat as unavailable so
      // the caller can decide between retrying elsewhere or degrading.
      throw new GeminiUnavailableError(
        `Empty response from Gemini (finishReason=${data.candidates?.[0]?.finishReason ?? "unknown"})`
      );
    }
    return {
      parts: parts as GeminiPart[],
      finishReason: data.candidates?.[0]?.finishReason ?? null,
    };
  }
  throw lastErr ?? new GeminiUnavailableError("Gemini call failed");
}
