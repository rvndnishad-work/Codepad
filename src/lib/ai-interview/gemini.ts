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
export { AI_INTERVIEW_GEMINI_MODEL, AI_INTERVIEW_TOGETHER_MODEL, AI_INTERVIEW_GLM_MODEL } from "@/lib/ai-interview/scaffolds";

import { AI_INTERVIEW_TOGETHER_MODEL, AI_INTERVIEW_GEMINI_MODEL } from "@/lib/ai-interview/scaffolds";

/**
 * One content entry in Gemini's `contents` array. Loose because parts can be
 * `{text}` OR `{functionCall}` OR `{functionResponse}` across a tool-use loop.
 * Kept for backward compat — Together client translates this to OpenAI messages.
 */
export type GeminiPart =
  | { text: string }
  | { functionCall: { name: string; args?: unknown } }
  | { functionResponse: { name: string; response: { content?: string; error?: string } } };

export type GeminiContent = { role: "user" | "model"; parts: GeminiPart[] };

/**
 * Raised when LLM is unreachable, rate-limited, or server-side broken —
 * i.e. situations where falling back to the offline mock agent is honest.
 * Keep name GeminiUnavailableError for backward compat; alias TogetherUnavailableError too.
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
export const TogetherUnavailableError = GeminiUnavailableError;

const REQUEST_TIMEOUT_MS = 30_000;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503]);
const RETRY_DELAY_MS = 800;

/** Resolve GLM/Together key first per user env names, then fall back to Gemini. */
export function togetherApiKey(): string | null {
  return process.env.GLM_API_KEY || process.env.TOGETHER_API_KEY || null;
}
export function glmApiKey(): string | null {
  return togetherApiKey();
}
/** For interview flows: prefer GLM/Together, fallback to Gemini for local dev. */
export function geminiApiKey(): string | null {
  return togetherApiKey() || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || null;
}

/** True if the effective interview model is a Together/GLM model. */
function isTogetherModel(model: string | null | undefined): boolean {
  const m = (model || AI_INTERVIEW_TOGETHER_MODEL || "").toLowerCase();
  return m.includes("zai-org") || m.includes("glm") || m.startsWith("together");
}

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

// ---------------------------------------------------------------------------
// Helpers: translate Gemini-ish to Together OpenAI-ish
// ---------------------------------------------------------------------------
type TogetherMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }>;
  tool_call_id?: string;
};
type TogetherTool = {
  type: "function";
  function: { name: string; description?: string; parameters?: Record<string, unknown> };
};

function toTogetherMessages(systemInstruction: string, contents: GeminiContent[]): TogetherMessage[] {
  const out: TogetherMessage[] = [];
  if (systemInstruction?.trim()) out.push({ role: "system", content: systemInstruction.trim() });
  for (const c of contents) {
    const textParts = c.parts.filter((p): p is { text: string } => "text" in p);
    const fnCallParts = c.parts.filter((p): p is { functionCall: { name: string; args?: unknown } } => "functionCall" in p);
    const fnRespParts = c.parts.filter(
      (p): p is { functionResponse: { name: string; response: { content?: string; error?: string } } } => "functionResponse" in p
    );
    const text = textParts.map((p) => p.text).join("");
    if (fnCallParts.length > 0) {
      out.push({
        role: "assistant",
        content: text || null,
        tool_calls: fnCallParts.map((fn, idx) => ({
          id: `call_${fn.functionCall.name}_${Date.now()}_${idx}`,
          type: "function" as const,
          function: { name: fn.functionCall.name, arguments: JSON.stringify(fn.functionCall.args ?? {}) },
        })),
      });
    } else if (fnRespParts.length > 0) {
      for (const fn of fnRespParts) {
        const payload = fn.functionResponse.response.error
          ? JSON.stringify({ error: fn.functionResponse.response.error })
          : (fn.functionResponse.response.content ?? "");
        out.push({ role: "tool", content: payload, tool_call_id: `call_${fn.functionResponse.name}_0` });
      }
      if (text.trim()) out.push({ role: "user", content: text });
    } else {
      out.push({ role: c.role === "model" ? "assistant" : "user", content: text });
    }
  }
  return out;
}

function toTogetherTools(geminiTools?: Array<Record<string, unknown>>): TogetherTool[] | undefined {
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
      const maybe = wrapper as unknown as TogetherTool;
      if (maybe?.type === "function" && maybe.function?.name) out.push(maybe);
    }
  }
  return out.length > 0 ? out : undefined;
}

function openAIResponseToGeminiParts(message: {
  content?: string | null;
  tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }>;
}): GeminiPart[] {
  const parts: GeminiPart[] = [];
  if (message.content && message.content.trim()) parts.push({ text: message.content });
  if (message.tool_calls?.length) {
    for (const tc of message.tool_calls) {
      let args: unknown = {};
      try { args = tc.function.arguments ? JSON.parse(tc.function.arguments) : {}; } catch { args = {}; }
      parts.push({ functionCall: { name: tc.function.name, args } });
    }
  }
  return parts;
}

function normalizeToolIds(messages: TogetherMessage[]) {
  const ids: string[] = [];
  for (const m of messages) if (m.role === "assistant" && m.tool_calls) for (const tc of m.tool_calls) ids.push(tc.id);
  let idx = 0;
  for (const m of messages) if (m.role === "tool" && idx < ids.length) m.tool_call_id = ids[idx++];
}

async function callViaTogether(params: {
  apiKey: string;
  contents: GeminiContent[];
  systemInstruction: string;
  tools?: Array<Record<string, unknown>>;
  maxOutputTokens?: number;
  temperature?: number;
  model?: string | null;
}): Promise<{ parts: GeminiPart[]; finishReason: string | null }> {
  const model = params.model || AI_INTERVIEW_TOGETHER_MODEL;
  const base = process.env.TOGETHER_BASE_URL || "https://api.together.xyz/v1";
  const url = `${base}/chat/completions`;
  const messages = toTogetherMessages(params.systemInstruction, params.contents);
  normalizeToolIds(messages);
  const tools = toTogetherTools(params.tools);
  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: params.temperature ?? 0.7,
    max_tokens: params.maxOutputTokens ?? 1024,
  };
  if (tools) body.tools = tools;

  let lastErr: GeminiUnavailableError | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${params.apiKey}` },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      lastErr = new GeminiUnavailableError("Together unreachable or timed out");
      continue;
    }
    if (!res.ok) {
      if (RETRYABLE_STATUS.has(res.status)) {
        lastErr = new GeminiUnavailableError(`Together HTTP error ${res.status}`, res.status);
        continue;
      }
      throw new GeminiUnavailableError(`Together HTTP error ${res.status}`, res.status);
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string | null; tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }> }; finish_reason?: string | null }>;
    };
    const choice = data.choices?.[0];
    if (!choice?.message) throw new GeminiUnavailableError(`Empty response from Together (finishReason=${choice?.finish_reason ?? "unknown"})`);
    const parts = openAIResponseToGeminiParts(choice.message);
    if (parts.length === 0) throw new GeminiUnavailableError(`Empty response from Together (finishReason=${choice.finish_reason ?? "unknown"})`);
    return { parts, finishReason: choice.finish_reason ?? null };
  }
  throw lastErr ?? new GeminiUnavailableError("Together call failed");
}

async function callViaGemini(params: {
  apiKey: string;
  contents: GeminiContent[];
  systemInstruction: string;
  tools?: Array<Record<string, unknown>>;
  maxOutputTokens?: number;
  temperature?: number;
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
  if (params.tools && params.tools.length > 0) body.tools = [{ functionDeclarations: params.tools }];

  let lastErr: GeminiUnavailableError | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
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
      if (RETRYABLE_STATUS.has(res.status)) {
        lastErr = new GeminiUnavailableError(`Gemini HTTP error ${res.status}`, res.status);
        continue;
      }
      throw new GeminiUnavailableError(`Gemini HTTP error ${res.status}`, res.status);
    }
    const data = await res.json();
    const parts = data.candidates?.[0]?.content?.parts;
    if (!Array.isArray(parts) || parts.length === 0) {
      throw new GeminiUnavailableError(`Empty response from Gemini (finishReason=${data.candidates?.[0]?.finishReason ?? "unknown"})`);
    }
    return { parts: parts as GeminiPart[], finishReason: data.candidates?.[0]?.finishReason ?? null };
  }
  throw lastErr ?? new GeminiUnavailableError("Gemini call failed");
}

/**
 * Single-shot call — auto-routes to Together/GLM when model is zai-org/GLM
 * or when GLM_API_KEY/TOGETHER_API_KEY is the active key; otherwise falls
 * back to Gemini. Keeps the same signature so all interview routes stay intact.
 */
export async function callGemini(params: {
  apiKey: string;
  contents: GeminiContent[];
  systemInstruction: string;
  /** Function declarations enabling tool use. Omit for plain text generation. */
  tools?: Array<Record<string, unknown>>;
  maxOutputTokens?: number;
  temperature?: number;
  /** Per-agent model override; defaults to AI_INTERVIEW_TOGETHER_MODEL (zai-org/GLM-5.3-Flash). */
  model?: string | null;
}): Promise<{ parts: GeminiPart[]; finishReason: string | null }> {
  const model = params.model || AI_INTERVIEW_TOGETHER_MODEL;
  // Route: if model is Together/GLM, always use Together path. If GLM key is configured at all, prefer Together for the default model.
  const hasTogetherKey = !!togetherApiKey();
  if (isTogetherModel(model) || (hasTogetherKey && model === AI_INTERVIEW_TOGETHER_MODEL)) {
    return callViaTogether(params);
  }
  // Explicit Gemini model override (e.g. gemini-2.5-flash) — honor it via Gemini path.
  if (model.toLowerCase().startsWith("gemini") || model.toLowerCase().startsWith("gemma")) {
    return callViaGemini(params);
  }
  // Default fallback: Together if key exists, else Gemini.
  if (hasTogetherKey) return callViaTogether(params);
  return callViaGemini(params);
}
