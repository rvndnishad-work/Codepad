/**
 * Core types for the configurable agents system.
 *
 * An "agent" = a named AI persona (system prompt + model settings + tool
 * allowlist + guardrails) stored in the AgentConfig table. Platform defaults
 * live in code (defaults.ts) so behavior is identical until someone configures
 * otherwise; workspace rows override per role.
 */

export const AGENT_ROLES = ["INTERVIEWER", "COACH", "ADMIN_HELPER", "CUSTOM"] as const;
export type AgentRole = (typeof AGENT_ROLES)[number];

export function isAgentRole(v: string): v is AgentRole {
  return (AGENT_ROLES as readonly string[]).includes(v);
}

export type AgentFallbackMode = "mock" | "error";

/** Role-dependent guardrails; unknown keys are ignored by the runtime. */
export type AgentGuardrails = {
  /** Max model↔tool iterations per turn (tool-using agents). */
  maxTurns?: number;
  /** Min ms between proactive fires (coach-style agents). */
  cooldownMs?: number;
  /** Hard cap on proactive interjections per session. */
  proactiveCap?: number;
};

/** Fully-resolved agent configuration ready for the runtime. */
export type ResolvedAgent = {
  role: AgentRole;
  name: string;
  systemPrompt: string;
  model: string | null;
  temperature: number;
  maxOutputTokens: number;
  tools: string[];
  guardrails: AgentGuardrails;
  fallback: AgentFallbackMode;
  enabled: boolean;
  /** Where this config came from — useful for admin UIs and debugging. */
  source: "workspace" | "platform" | "code-default";
};

/** Context variables rendered into {{placeholders}} in the system prompt. */
export type PromptVars = Record<string, string>;

/**
 * Render {{variable}} placeholders. Unknown variables render as empty
 * strings (never leak the literal {{token}} to the model). `$` in values is
 * escaped so user content can't inject replacement patterns.
 */
export function renderPrompt(template: string, vars: PromptVars): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const value = vars[key];
    return value === undefined ? "" : value.replace(/\$/g, "$$$$");
  });
}
