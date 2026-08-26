import { callGemini, extractText, geminiApiKey, GeminiUnavailableError, type GeminiContent } from "@/lib/ai-interview/gemini";
import { getAgentConfig } from "./config";
import { renderPrompt, type PromptVars, type ResolvedAgent } from "./types";

export { renderPrompt } from "./types";
export type { ResolvedAgent, PromptVars } from "./types";

/**
 * Agent runtime v1 — config-driven completion.
 *
 * Loads the effective AgentConfig for a role, renders {{vars}} into its
 * system prompt, and runs one turn through the shared Gemini client with the
 * config's model/temperature/token settings. Tool-using agents (admin
 * helper) keep their bespoke loops for now; this covers the text-completion
 * surfaces (interviewer, coach) which is where configurability matters most.
 *
 * Failure semantics honor `config.fallback`:
 *   - "mock"  → caller supplies `mockText` and we return it with degraded=true
 *   - "error" → the GeminiUnavailableError propagates to the caller
 */
export async function runAgentTurn(params: {
  role: Parameters<typeof getAgentConfig>[0];
  workspaceId?: string | null;
  vars: PromptVars;
  contents: GeminiContent[];
  /** Required when the agent's fallback mode is "mock". */
  mockText?: string;
  /** Extra system instruction appended after the rendered prompt. */
  suffix?: string;
}): Promise<
  | { ok: true; text: string; agent: ResolvedAgent; degraded: false }
  | { ok: true; text: string; agent: ResolvedAgent; degraded: true; reason: string }
  | { ok: false; error: unknown; agent: ResolvedAgent }
> {
  const agent = await getAgentConfig(params.role, params.workspaceId);

  if (!agent.enabled || !agent.systemPrompt.trim()) {
    // Unconfigured/disabled agents are a caller bug — surface it loudly in dev,
    // gracefully in prod by treating it as an upstream failure.
    const err = new Error(`Agent ${params.role} has no usable system prompt`);
    if (agent.fallback === "mock" && params.mockText) {
      return { ok: true, text: params.mockText, agent, degraded: true, reason: "not_configured" };
    }
    return { ok: false, error: err, agent };
  }

  const apiKey = geminiApiKey();
  if (!apiKey) {
    if (agent.fallback === "mock" && params.mockText) {
      return { ok: true, text: params.mockText, agent, degraded: true, reason: "not_configured" };
    }
    return { ok: false, error: new Error("No Gemini API key configured"), agent };
  }

  const systemInstruction = params.suffix
    ? `${renderPrompt(agent.systemPrompt, params.vars)}\n\n${params.suffix}`
    : renderPrompt(agent.systemPrompt, params.vars);

  try {
    const result = await callGemini({
      apiKey,
      contents: params.contents,
      systemInstruction,
      maxOutputTokens: agent.maxOutputTokens,
      temperature: agent.temperature,
    });
    const text = extractText(result.parts);
    if (!text.trim()) {
      throw new GeminiUnavailableError("Empty response from Gemini");
    }
    return { ok: true, text, agent, degraded: false };
  } catch (err) {
    if (agent.fallback === "mock" && params.mockText) {
      return {
        ok: true,
        text: params.mockText,
        agent,
        degraded: true,
        reason: err instanceof GeminiUnavailableError ? "upstream_unavailable" : "upstream_error",
      };
    }
    return { ok: false, error: err, agent };
  }
}
