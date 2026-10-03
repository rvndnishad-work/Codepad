/**
 * GLM client for the admin assistant: Together's OpenAI-compatible Chat
 * Completions API with real function calling. Uses the same GLM key and model
 * as the AI interviewer (see lib/ai-interview/together.ts).
 *
 * - Reads the whole reply: the text and every tool call (GLM can ask for
 *   several at once). Reasoning is dropped, never shown as the answer.
 * - Runs at most MAX_TOOL_ROUNDS rounds of tool calls, then asks once more
 *   with tool calls turned off so the admin always gets an answer.
 * - Failures are thrown as AssistantError. There is no canned fallback: a bad
 *   key, a 400 or a timeout reaches the admin as an error.
 */
import type { ToolDeclaration } from "./types";

export const MAX_TOOL_ROUNDS = 8;
const DEFAULT_MODEL = "zai-org/GLM-5.3-Flash";
const TIMEOUT_MS = 60_000;

function baseUrl(): string {
  return (process.env.TOGETHER_BASE_URL?.trim() || "https://api.together.xyz/v1").replace(/\/+$/, "");
}

export function assistantModel(): string {
  return (
    process.env.ADMIN_ASSISTANT_MODEL?.trim() ||
    process.env.AI_INTERVIEW_TOGETHER_MODEL?.trim() ||
    DEFAULT_MODEL
  );
}

export function assistantApiKey(): string | null {
  return process.env.GLM_API_KEY?.trim() || process.env.TOGETHER_API_KEY?.trim() || null;
}

export class AssistantError extends Error {
  constructor(message: string, public readonly status = 502) {
    super(message);
    this.name = "AssistantError";
  }
}

export const NOT_CONFIGURED = "Assistant is not configured: set GLM_API_KEY";

export type FunctionCall = { name: string; args: Record<string, unknown>; id?: string };

/** Stored conversation turns, as conversations.ts builds them. */
export type Part = { text?: string };
export type Content = { role: "user" | "model"; parts: Part[] };

export type ChatMessage =
  | { role: "system" | "user"; content: string }
  | {
      role: "assistant";
      content: string | null;
      tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
    }
  | { role: "tool"; tool_call_id: string; content: string };

export type ParsedResponse = {
  text: string;
  calls: FunctionCall[];
  /** The assistant turn, to append to the history before the tool results. */
  message: Extract<ChatMessage, { role: "assistant" }> | null;
  finishReason: string | null;
};

/** Some GLM builds inline their reasoning as <think>...</think>; it is not the answer. */
function stripThinking(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/^[\s\S]*?<\/think>/i, "").trim();
}

/** Pull the text and every tool call out of a chat completion. */
export function parseResponse(body: unknown): ParsedResponse {
  const b = (body ?? {}) as {
    choices?: {
      message?: {
        content?: string | null;
        tool_calls?: { id?: string; function?: { name?: string; arguments?: string } }[];
      };
      finish_reason?: string | null;
    }[];
  };
  const choice = b.choices?.[0];
  if (!choice?.message) return { text: "", calls: [], message: null, finishReason: choice?.finish_reason ?? null };
  const text = typeof choice.message.content === "string" ? stripThinking(choice.message.content) : "";
  const calls: FunctionCall[] = [];
  const toolCalls: NonNullable<Extract<ChatMessage, { role: "assistant" }>["tool_calls"]> = [];
  (choice.message.tool_calls ?? []).forEach((tc, i) => {
    const name = tc?.function?.name;
    if (typeof name !== "string" || !name) return;
    let args: Record<string, unknown> = {};
    try {
      const parsed = tc.function?.arguments ? JSON.parse(tc.function.arguments) : {};
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) args = parsed;
    } catch {
      // Malformed arguments reach the tool as {} and fail its validation, which the model sees.
    }
    const id = tc.id || `call_${i}_${name}`;
    calls.push({ name, args, id });
    toolCalls.push({ id, type: "function", function: { name, arguments: JSON.stringify(args) } });
  });
  return {
    text,
    calls,
    message: text || toolCalls.length ? { role: "assistant", content: text || null, ...(toolCalls.length ? { tool_calls: toolCalls } : {}) } : null,
    finishReason: choice.finish_reason ?? null,
  };
}

function errorMessage(status: number, body: unknown): string {
  const e = (body as { error?: { message?: string } | string })?.error;
  const msg = typeof e === "string" ? e : e?.message;
  if (status === 401) return "The model rejected the API key (401). Check GLM_API_KEY.";
  if (status === 400 || status === 403) return `The model rejected the request (${status}): ${msg ?? "bad request"}`;
  if (status === 429) return "The model is rate limited. Try again in a minute.";
  return `The model failed (${status})${msg ? `: ${msg}` : ""}`;
}

/** Stored turns to chat messages: "model" turns become "assistant". */
export function toMessages(system: string, contents: Content[]): ChatMessage[] {
  const out: ChatMessage[] = [{ role: "system", content: system }];
  for (const c of contents) {
    const text = c.parts.map((p) => p.text ?? "").join("");
    if (c.role === "model") out.push({ role: "assistant", content: text });
    else out.push({ role: "user", content: text });
  }
  return out;
}

export type CallOptions = {
  messages: ChatMessage[];
  tools: ToolDeclaration[];
  /** "none" turns tool calls off for the closing answer. */
  toolChoice?: "auto" | "none";
  fetchImpl?: typeof fetch;
};

export async function callModel(opts: CallOptions): Promise<ParsedResponse> {
  const key = assistantApiKey();
  if (!key) throw new AssistantError(NOT_CONFIGURED, 503);
  const doFetch = opts.fetchImpl ?? fetch;
  const body = {
    model: assistantModel(),
    messages: opts.messages,
    ...(opts.tools.length
      ? {
          tools: opts.tools.map((t) => ({ type: "function", function: t })),
          tool_choice: opts.toolChoice ?? "auto",
        }
      : {}),
    temperature: 0.2,
    max_tokens: 4096,
  };

  let lastErr: AssistantError | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    let res: Response;
    try {
      res = await doFetch(`${baseUrl()}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
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
  const messages = toMessages(opts.system, opts.contents);
  const earlier: string[] = [];
  for (let round = 0; round <= max; round++) {
    const closing = round === max;
    const res = await callModel({
      messages,
      tools: opts.tools,
      toolChoice: closing ? "none" : "auto",
      fetchImpl: opts.fetchImpl,
    });
    if (res.calls.length === 0 || closing) {
      const text = res.text || earlier.join("\n\n");
      if (!text) {
        throw new AssistantError(
          `The model returned no answer${res.finishReason ? ` (finish reason ${res.finishReason})` : ""}.`,
        );
      }
      return { text, rounds: round };
    }
    if (res.message) messages.push(res.message);
    if (res.text) earlier.push(res.text);
    const responses = await Promise.all(res.calls.map((c) => opts.execute(c)));
    res.calls.forEach((c, i) => {
      messages.push({ role: "tool", tool_call_id: c.id!, content: JSON.stringify(responses[i]) });
    });
  }
  throw new AssistantError("The assistant stopped without an answer.");
}
