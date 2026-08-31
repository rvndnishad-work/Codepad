/**
 * Shared Together AI / GLM client for AI Interview endpoints.
 *
 * Replaces the Gemini REST client (gemini.ts) with an OpenAI-compatible
 * Together endpoint for zai-org/GLM-5.3-Flash.
 *
 * Why this exists: mirrors the guarantees of gemini.ts — timeout, single
 * retry on transient 429/5xx, and a single place to fix upstream bugs —
 * but speaks Together's Chat Completions API.
 *
 * Env:
 *   GLM_API_KEY               — required (primary). Falls back to TOGETHER_API_KEY for compat.
 *   AI_INTERVIEW_TOGETHER_MODEL — model id, defaults to "zai-org/GLM-5.3-Flash"
 *
 * Usage (non-streaming, used by interview routes):
 *   const { text, toolCalls } = await callTogether({ apiKey, messages, systemInstruction, tools })
 *
 * Streaming helper also provided for playground-style routes.
 */

import { AI_INTERVIEW_TOGETHER_MODEL } from "@/lib/ai-interview/scaffolds";

// Re-export model constant for callers that imported from gemini.ts
export { AI_INTERVIEW_TOGETHER_MODEL } from "@/lib/ai-interview/scaffolds";

/** Thrown when Together/GLM is unreachable, rate-limited, or 5xx — caller should degrade to mock. */
export class TogetherUnavailableError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = "TogetherUnavailableError";
  }
}

/** Alias kept so old catch blocks (`instanceof GeminiUnavailableError`) still work if caller imports from this file. */
export const GeminiUnavailableError = TogetherUnavailableError;

const REQUEST_TIMEOUT_MS = 30_000;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503]);
const RETRY_DELAY_MS = 800;

const TOGETHER_BASE_URL = process.env.TOGETHER_BASE_URL || "https://api.together.xyz/v1";

/** Resolve server-side Together/GLM API key. Primary = GLM_API_KEY per user request. */
export function togetherApiKey(): string | null {
  return process.env.GLM_API_KEY || process.env.TOGETHER_API_KEY || null;
}

/** Alias for drop-in migration: old callers use `geminiApiKey()`. */
export function geminiApiKey(): string | null {
  return togetherApiKey();
}

/** Also export `glmApiKey` for explicit naming. */
export function glmApiKey(): string | null {
  return togetherApiKey();
}

// ---------------------------------------------------------------------------
// Types — kept close to Gemini's so callers need minimal changes, but also
// expose OpenAI-native shapes.
// ---------------------------------------------------------------------------

export type TogetherMessageRole = "system" | "user" | "assistant" | "tool";

export type TogetherMessage = {
  role: TogetherMessageRole;
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
  name?: string;
};

export type TogetherTool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

// Keep GeminiPart/Content types for callers that still build Gemini-style payloads;
// we translate them internally to Together messages.
export type GeminiPart =
  | { text: string }
  | { functionCall: { name: string; args?: unknown } }
  | { functionResponse: { name: string; response: { content?: string; error?: string } } };

export type GeminiContent = { role: "user" | "model"; parts: GeminiPart[] };

export function extractText(parts: GeminiPart[]): string {
  return parts
    .map((p) => ("text" in p ? p.text : ""))
    .filter(Boolean)
    .join("");
}

// ---------------------------------------------------------------------------
// Internal translators: Gemini-ish -> Together OpenAI-ish
// ---------------------------------------------------------------------------

/**
 * Convert Gemini `systemInstruction` + `contents` (role model/user) into
 * OpenAI `messages[]` for Together.
 */
function toTogetherMessages(
  systemInstruction: string,
  contents: GeminiContent[]
): TogetherMessage[] {
  const out: TogetherMessage[] = [];
  if (systemInstruction?.trim()) {
    out.push({ role: "system", content: systemInstruction.trim() });
  }
  for (const c of contents) {
    const role: TogetherMessageRole = c.role === "model" ? "assistant" : "user";
    // Separate text parts and functionCall/functionResponse parts.
    const textParts = c.parts.filter((p): p is { text: string } => "text" in p);
    const fnCallParts = c.parts.filter(
      (p): p is { functionCall: { name: string; args?: unknown } } => "functionCall" in p
    );
    const fnRespParts = c.parts.filter(
      (p): p is { functionResponse: { name: string; response: { content?: string; error?: string } } } =>
        "functionResponse" in p
    );

    // Text portion
    const text = textParts.map((p) => p.text).join("");
    if (fnCallParts.length > 0) {
      // Assistant tool-call turn
      out.push({
        role: "assistant",
        content: text || null,
        tool_calls: fnCallParts.map((fn, idx) => ({
          id: `call_${fn.functionCall.name}_${Date.now()}_${idx}`,
          type: "function" as const,
          function: {
            name: fn.functionCall.name,
            arguments: JSON.stringify(fn.functionCall.args ?? {}),
          },
        })),
      });
    } else if (fnRespParts.length > 0) {
      // Tool response turns — one message per tool response (OpenAI expects each tool result as a separate `tool` message)
      // But our Gemini shape bundles them as one `user` content with multiple functionResponse parts.
      // Emit each as its own `tool` message; keep original call id linkage via name.
      for (const fn of fnRespParts) {
        const payload = fn.functionResponse.response.error
          ? JSON.stringify({ error: fn.functionResponse.response.error })
          : fn.functionResponse.response.content ?? "";
        out.push({
          role: "tool",
          content: payload,
          tool_call_id: fn.functionResponse.name, // Together/OpenAI will correlate by id; we use name fallback + fixup below if needed
          // `name` not used in OpenAI tool role but keep for debug
        });
      }
      // Also push text if any residual
      if (text.trim()) {
        out.push({ role: "user", content: text });
      }
    } else {
      out.push({ role: role, content: text });
    }
  }
  return out;
}

/**
 * Translate Gemini `tools: [{ functionDeclarations: [...] }]` into OpenAI `tools[]`.
 * Gemini decl shape: { name, description, parameters: {type, properties, required} }
 */
function toTogetherTools(
  geminiTools?: Array<Record<string, unknown>>
): TogetherTool[] | undefined {
  if (!geminiTools || geminiTools.length === 0) return undefined;
  const out: TogetherTool[] = [];
  for (const wrapper of geminiTools) {
    const decls = (wrapper as { functionDeclarations?: Array<Record<string, unknown>> }).functionDeclarations;
    if (Array.isArray(decls)) {
      for (const d of decls) {
        const name = String((d as { name?: unknown }).name ?? "");
        if (!name) continue;
        out.push({
          type: "function",
          function: {
            name,
            description: (d as { description?: string }).description,
            parameters: (d as { parameters?: Record<string, unknown> }).parameters as Record<string, unknown> | undefined,
          },
        });
      }
    } else {
      // Already OpenAI shape? pass through if it looks like {type:"function",function:{name}}
      const maybe = wrapper as unknown as TogetherTool;
      if (maybe?.type === "function" && maybe.function?.name) out.push(maybe);
    }
  }
  return out.length > 0 ? out : undefined;
}

// Normalize Together/OpenAI tool_calls back into GeminiPart[] so callers' existing
// `parts.filter(p => "functionCall" in p)` logic keeps working.
function openAIResponseToGeminiParts(message: {
  content?: string | null;
  tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }>;
}): GeminiPart[] {
  const parts: GeminiPart[] = [];
  if (message.content && message.content.trim()) {
    parts.push({ text: message.content });
  }
  if (message.tool_calls && message.tool_calls.length > 0) {
    for (const tc of message.tool_calls) {
      let args: unknown = {};
      try {
        args = tc.function.arguments ? JSON.parse(tc.function.arguments) : {};
      } catch {
        args = {};
      }
      parts.push({ functionCall: { name: tc.function.name, args } });
    }
  }
  return parts;
}

// ---------------------------------------------------------------------------
// Core: non-streaming Chat Completions (drop-in for callGemini)
// ---------------------------------------------------------------------------

export async function callTogether(params: {
  apiKey: string;
  messages: TogetherMessage[];
  tools?: TogetherTool[];
  maxOutputTokens?: number;
  temperature?: number;
  model?: string | null;
}): Promise<{ parts: GeminiPart[]; finishReason: string | null; raw: unknown }> {
  const model = params.model || AI_INTERVIEW_TOGETHER_MODEL;
  const url = `${TOGETHER_BASE_URL}/chat/completions`;

  const body: Record<string, unknown> = {
    model,
    messages: params.messages,
    temperature: params.temperature ?? 0.7,
    max_tokens: params.maxOutputTokens ?? 1024,
  };
  if (params.tools && params.tools.length > 0) {
    body.tools = params.tools;
    // Don't force tool_choice; let model decide. Explicit "auto" is the default.
  }

  let lastErr: TogetherUnavailableError | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${params.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      lastErr = new TogetherUnavailableError("Together unreachable or timed out");
      continue;
    }
    if (!res.ok) {
      if (RETRYABLE_STATUS.has(res.status)) {
        lastErr = new TogetherUnavailableError(`Together HTTP error ${res.status}`, res.status);
        continue;
      }
      throw new TogetherUnavailableError(`Together HTTP error ${res.status}`, res.status);
    }
    const data = (await res.json()) as {
      choices?: Array<{
        message?: { content?: string | null; tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }> };
        finish_reason?: string | null;
      }>;
    };
    const choice = data.choices?.[0];
    if (!choice?.message) {
      throw new TogetherUnavailableError(`Empty response from Together (finishReason=${choice?.finish_reason ?? "unknown"})`);
    }
    const parts = openAIResponseToGeminiParts(choice.message);
    if (parts.length === 0) {
      throw new TogetherUnavailableError(`Empty response from Together (finishReason=${choice.finish_reason ?? "unknown"})`);
    }

    // Stash tool_call ids so subsequent `tool` messages can echo the correct id (needed for strict OpenAI correlation).
    // We return parts; the outer tool-loop reconstructs the next `tool` messages with proper ids via `partsToToolMessages`.
    return {
      parts,
      finishReason: choice.finish_reason ?? null,
      raw: data,
    };
  }
  throw lastErr ?? new TogetherUnavailableError("Together call failed");
}

/**
 * Drop-in replacement for `callGemini` — same signature, but hits Together/GLM.
 * Keeping the name lets existing imports keep working; new code should prefer
 * `callTogether` or `callTogetherFromGemini`.
 */
export async function callGemini(params: {
  apiKey: string;
  contents: GeminiContent[];
  systemInstruction: string;
  tools?: Array<Record<string, unknown>>;
  maxOutputTokens?: number;
  temperature?: number;
  model?: string | null;
}): Promise<{ parts: GeminiPart[]; finishReason: string | null }> {
  const messages = toTogetherMessages(params.systemInstruction, params.contents);
  const tools = toTogetherTools(params.tools);

  // Patch tool message ids: OpenAI requires `tool_call_id` to match the assistant's `tool_calls[].id`.
  // Our `toTogetherMessages` above created dummy ids; for the first turn there are no tool messages yet,
  // so no patch needed. For subsequent turns the previous assistant's tool_calls ids must line up.
  // Since we generate deterministic dummy ids per turn, we normalize here by re-assigning sequential ids
  // and ensuring every `tool` message's `tool_call_id` matches the preceding assistant turn's ids.
  // Simpler: if we detect mismatched ids, rewrite them to be consistent before sending.
  normalizeToolIds(messages);

  const out = await callTogether({
    apiKey: params.apiKey,
    messages,
    tools,
    maxOutputTokens: params.maxOutputTokens,
    temperature: params.temperature,
    model: params.model,
  });
  return { parts: out.parts, finishReason: out.finishReason };
}

function normalizeToolIds(messages: TogetherMessage[]) {
  // Collect assistant tool_calls ids in order, then assign them to following tool messages in order.
  const assistantCalls: string[] = [];
  for (const m of messages) if (m.role === "assistant" && m.tool_calls) for (const tc of m.tool_calls) assistantCalls.push(tc.id);
  let toolIdx = 0;
  for (const m of messages) {
    if (m.role === "tool" && toolIdx < assistantCalls.length) {
      m.tool_call_id = assistantCalls[toolIdx++];
    }
  }
}

// ---------------------------------------------------------------------------
// Streaming helper — mirrors your snippet but using env GLM_API_KEY
// ---------------------------------------------------------------------------

export async function* streamTogether(params: {
  apiKey: string;
  messages: TogetherMessage[];
  tools?: TogetherTool[];
  maxOutputTokens?: number;
  temperature?: number;
  model?: string | null;
}): AsyncGenerator<string, void, unknown> {
  const model = params.model || AI_INTERVIEW_TOGETHER_MODEL;
  const url = `${TOGETHER_BASE_URL}/chat/completions`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: params.messages,
      temperature: params.temperature ?? 0.7,
      max_tokens: params.maxOutputTokens ?? 1024,
      tools: params.tools,
      stream: true,
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok || !res.body) throw new TogetherUnavailableError(`Together stream HTTP error ${res.status}`, res.status);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        const json = JSON.parse(data);
        const delta = json.choices?.[0]?.delta?.content as string | undefined;
        if (delta) yield delta;
        const toolDelta = json.choices?.[0]?.delta?.tool_calls;
        if (Array.isArray(toolDelta)) {
          for (const tc of toolDelta) if (tc.function?.arguments) yield tc.function.arguments;
        }
      } catch {
        // skip malformed SSE chunk
      }
    }
  }
}

/**
 * Alternative streaming helper that accepts Gemini-style `contents`+`systemInstruction`
 * (so callers can stream without rewriting to OpenAI messages).
 */
export async function* streamGeminiStyle(params: {
  apiKey: string;
  contents: GeminiContent[];
  systemInstruction: string;
  tools?: Array<Record<string, unknown>>;
  maxOutputTokens?: number;
  temperature?: number;
  model?: string | null;
}): AsyncGenerator<string, void, unknown> {
  const messages = toTogetherMessages(params.systemInstruction, params.contents);
  normalizeToolIds(messages);
  const tools = toTogetherTools(params.tools);
  yield* streamTogether({
    apiKey: params.apiKey,
    messages,
    tools,
    maxOutputTokens: params.maxOutputTokens,
    temperature: params.temperature,
    model: params.model,
  });
}
