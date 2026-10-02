/**
 * Gemini client for the admin assistant: REST generateContent with real
 * function calling.
 *
 * - Reads every part of a response: text parts are joined, every functionCall
 *   part is collected (Gemini can ask for several calls at once), and the
 *   model's content goes back into the history unchanged so thought
 *   signatures survive the round trip.
 * - Runs at most MAX_TOOL_ROUNDS rounds of tool calls, then asks once more
 *   with tools disabled so the admin always gets an answer.
 * - Failures are thrown as AssistantError. There is no canned fallback: a bad
 *   key, a 400 or a timeout reaches the admin as an error.
 */
import type { ToolDeclaration } from "./types";

export const MAX_TOOL_ROUNDS = 8;
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const TIMEOUT_MS = 60_000;

export function assistantModel(): string {
  return process.env.ADMIN_ASSISTANT_MODEL?.trim() || "gemini-2.5-flash";
}

export function assistantApiKey(): string | null {
  return process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim() || null;
}

export class AssistantError extends Error {
  constructor(message: string, public readonly status = 502) {
    super(message);
    this.name = "AssistantError";
  }
}

export const NOT_CONFIGURED = "Assistant is not configured: set GEMINI_API_KEY";

export type FunctionCall = { name: string; args: Record<string, unknown>; id?: string };

export type Part = {
  text?: string;
  thought?: boolean;
  functionCall?: { name: string; args?: Record<string, unknown>; id?: string };
  functionResponse?: { name: string; id?: string; response: Record<string, unknown> };
  [k: string]: unknown;
};

export type Content = { role: "user" | "model"; parts: Part[] };

export type ParsedResponse = {
  text: string;
  calls: FunctionCall[];
  /** The model turn, unchanged, to append to the history. */
  content: Content | null;
  finishReason: string | null;
};

/** Pull every text and functionCall part out of a generateContent response. */
export function parseResponse(body: unknown): ParsedResponse {
  const b = (body ?? {}) as {
    candidates?: { content?: { role?: string; parts?: Part[] }; finishReason?: string }[];
    promptFeedback?: { blockReason?: string };
  };
  const cand = b.candidates?.[0];
  if (!cand) {
    const reason = b.promptFeedback?.blockReason;
    return { text: "", calls: [], content: null, finishReason: reason ? `BLOCKED_${reason}` : null };
  }
  const parts = Array.isArray(cand.content?.parts) ? cand.content!.parts! : [];
  const texts: string[] = [];
  const calls: FunctionCall[] = [];
  for (const p of parts) {
    if (!p || typeof p !== "object") continue;
    if (typeof p.text === "string" && !p.thought) texts.push(p.text);
    if (p.functionCall && typeof p.functionCall.name === "string") {
      const args = p.functionCall.args && typeof p.functionCall.args === "object" ? p.functionCall.args : {};
      calls.push({ name: p.functionCall.name, args, ...(p.functionCall.id ? { id: p.functionCall.id } : {}) });
    }
  }
  return {
    text: texts.join("").trim(),
    calls,
    content: parts.length ? { role: "model", parts } : null,
    finishReason: cand.finishReason ?? null,
  };
}

function errorMessage(status: number, body: unknown): string {
  const msg = (body as { error?: { message?: string } })?.error?.message;
  if (status === 400 || status === 403) return `The model rejected the request (${status}): ${msg ?? "bad request"}`;
  if (status === 429) return "The model is rate limited. Try again in a minute.";
  return `The model failed (${status})${msg ? `: ${msg}` : ""}`;
}

export type CallOptions = {
  system: string;
  contents: Content[];
  tools: ToolDeclaration[];
  /** "NONE" turns function calling off for the closing answer. */
  mode?: "AUTO" | "NONE";
  fetchImpl?: typeof fetch;
};

export async function callModel(opts: CallOptions): Promise<ParsedResponse> {
  const key = assistantApiKey();
  if (!key) throw new AssistantError(NOT_CONFIGURED, 503);
  const doFetch = opts.fetchImpl ?? fetch;
  const body = {
    systemInstruction: { parts: [{ text: opts.system }] },
    contents: opts.contents,
    ...(opts.tools.length
      ? {
          tools: [{ functionDeclarations: opts.tools }],
          toolConfig: { functionCallingConfig: { mode: opts.mode ?? "AUTO" } },
        }
      : {}),
    generationConfig: { temperature: 0.2, maxOutputTokens: 4096 },
  };

  let lastErr: AssistantError | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    let res: Response;
    try {
      res = await doFetch(`${ENDPOINT}/${encodeURIComponent(assistantModel())}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (err) {
      const timedOut = (err as Error)?.name === "TimeoutError" || (err as Error)?.name === "AbortError";
      throw new AssistantError(timedOut ? "The model did not answer within 60 seconds." : `Could not reach the model: ${(err as Error)?.message ?? err}`, 504);
    }
    const json = await res.json().catch(() => null);
    if (res.ok) return parseResponse(json);
    lastErr = new AssistantError(errorMessage(res.status, json), res.status === 429 ? 429 : 502);
    // One retry for transient failures only.
    if (!(res.status === 429 || res.status >= 500) || attempt === 1) break;
    await new Promise((r) => setTimeout(r, 800));
  }
  throw lastErr ?? new AssistantError("The model failed.");
}

export type ExecutedCall = { call: FunctionCall; response: Record<string, unknown> };

export type LoopResult = { text: string; rounds: number };

/**
 * Run the conversation until the model answers in text. `execute` runs one
 * tool call and returns what goes back to the model; calls in one round run
 * in parallel.
 */
export async function runToolLoop(opts: {
  system: string;
  contents: Content[];
  tools: ToolDeclaration[];
  execute: (call: FunctionCall) => Promise<Record<string, unknown>>;
  fetchImpl?: typeof fetch;
  maxRounds?: number;
}): Promise<LoopResult> {
  const max = opts.maxRounds ?? MAX_TOOL_ROUNDS;
  const contents = [...opts.contents];
  const earlier: string[] = [];
  for (let round = 0; round <= max; round++) {
    const closing = round === max;
    const res = await callModel({
      system: opts.system,
      contents,
      tools: opts.tools,
      mode: closing ? "NONE" : "AUTO",
      fetchImpl: opts.fetchImpl,
    });
    if (res.content) contents.push(res.content);
    if (res.calls.length === 0 || closing) {
      const text = res.text || earlier.join("\n\n");
      if (!text) {
        throw new AssistantError(
          `The model returned no answer${res.finishReason ? ` (finish reason ${res.finishReason})` : ""}.`,
        );
      }
      return { text, rounds: round };
    }
    if (res.text) earlier.push(res.text);
    const responses = await Promise.all(res.calls.map((c) => opts.execute(c)));
    contents.push({
      role: "user",
      parts: res.calls.map((c, i) => ({
        functionResponse: { name: c.name, ...(c.id ? { id: c.id } : {}), response: responses[i] },
      })),
    });
  }
  throw new AssistantError("The assistant stopped without an answer.");
}
