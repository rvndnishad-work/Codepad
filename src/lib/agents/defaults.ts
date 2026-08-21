import type { AgentGuardrails, AgentRole, AgentFallbackMode } from "./types";

/**
 * Platform-default agent definitions — the single source of truth for what
 * every role does when no DB row exists. The prompts here are extracted
 * verbatim from the routes that previously hardcoded them, so flipping routes
 * to read configs is a zero-behavior-change refactor.
 *
 * To customize an agent per workspace (or platform-wide), create an
 * AgentConfig row for the role; it wins over these defaults.
 */

export type DefaultAgent = {
  name: string;
  systemPrompt: string;
  model: string | null;
  temperature: number;
  maxOutputTokens: number;
  tools: string[];
  guardrails: AgentGuardrails;
  fallback: AgentFallbackMode;
};

/**
 * INTERVIEWER — conducts live AI screening interviews.
 * Consumed by src/app/api/ai-interview/message/route.ts.
 */
const INTERVIEWER: DefaultAgent = {
  name: "AI Interviewer",
  model: null,
  temperature: 0.7,
  maxOutputTokens: 1024,
  tools: [],
  guardrails: {},
  fallback: "mock",
  systemPrompt: `You are the Interviewpad AI Technical Interviewer conducting a live coding interview for the position of "{{positionTitle}}".

Task: {{taskTitle}}
{{taskBrief}}{{stackLine}}{{roundLine}}

Guidelines:
1. Be encouraging but professional and rigorous.
2. Guide them using hints, but never write full solutions directly.
3. If they describe code, check if their active files ({{filesJson}}) match their claims.
4. Keep answers concise (around 100-150 words) and relevant to the task's stack.`,
};

/**
 * COACH — silently observes during screenings and interjects short nudges;
 * also powers the candidate-facing "Ask your coach" chat on practice surfaces.
 * Consumed by src/app/api/ai-interview/observe/route.ts and /api/coach/chat.
 */
const COACH: DefaultAgent = {
  name: "Prep Coach",
  model: null,
  temperature: 0.6,
  maxOutputTokens: 512,
  tools: [],
  guardrails: {},
  fallback: "mock",
  // Observe-mode template. The candidate-chat surface renders its own variant
  // of this persona via {{modeBlock}} so one config drives both surfaces.
  systemPrompt: `You are the Interviewpad Prep Coach — a patient senior engineer helping a candidate grow.{{modeBlock}}
{{contextBlock}}

Rules:
1. Give hints and ask guiding questions — never hand over full solutions or literal code drops.
2. Encourage first, correct second. Be concrete about WHY something is wrong.
3. Keep replies short (under 120 words unless asked for depth).
4. If the candidate is stuck in the wrong direction, say so early.`,
};

/**
 * ADMIN_HELPER — platform operations copilot for staff admins.
 * Consumed by src/app/api/admin/copilot/route.ts. The giant grounded system
 * instruction lives in the route today (it embeds the tool catalog + HITL
 * policy); an AgentConfig row with a custom systemPrompt overrides it.
 */
const ADMIN_HELPER: DefaultAgent = {
  name: "Admin Copilot",
  model: null,
  temperature: 0.7,
  maxOutputTokens: 2048,
  tools: [
    "run_read_only_query",
    "get_platform_stats",
    "summarize_user",
    "list_recent_signups",
    "create_admin_todo",
    "propose_action",
  ],
  guardrails: { maxTurns: 8 },
  fallback: "mock",
  // Empty = caller keeps its built-in grounded instruction until an admin
  // writes a custom prompt. Avoids duplicating a 45-line schema dump here.
  systemPrompt: "",
};

export const DEFAULT_AGENTS: Record<Exclude<AgentRole, "CUSTOM">, DefaultAgent> = {
  INTERVIEWER,
  COACH,
  ADMIN_HELPER,
};
