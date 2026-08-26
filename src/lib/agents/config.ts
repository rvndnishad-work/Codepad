import { prisma } from "@/lib/prisma";
import { DEFAULT_AGENTS, type DefaultAgent } from "./defaults";
import {
  type AgentFallbackMode,
  type AgentGuardrails,
  type AgentRole,
  type ResolvedAgent,
} from "./types";

/**
 * Agent config resolution: workspace row → platform row → code default.
 *
 * Never throws for "not configured" — an unconfigured agent resolves to the
 * code default so routes behave exactly as they did before this system
 * existed. DB errors are swallowed into the code default too (config store
 * being down must not take down live interviews).
 */

function parseJsonSafe<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

/** Row (or code default) → runtime-ready resolved agent. */
function toResolved(
  role: AgentRole,
  data: DefaultAgent,
  source: ResolvedAgent["source"]
): ResolvedAgent {
  return {
    role,
    name: data.name,
    systemPrompt: data.systemPrompt,
    model: data.model,
    temperature: data.temperature,
    maxOutputTokens: data.maxOutputTokens,
    tools: data.tools,
    guardrails: data.guardrails,
    fallback: data.fallback,
    enabled: true, // code defaults are always enabled
    source,
  };
}

/**
 * Resolve the effective agent config for a role.
 *
 * @param role          one of AGENT_ROLES
 * @param workspaceId   optional tenant scope — a workspace row beats the
 *                      platform row beats the code default
 */
export async function getAgentConfig(
  role: AgentRole,
  workspaceId?: string | null
): Promise<ResolvedAgent> {
  const fallbackDefault = DEFAULT_AGENTS[role as Exclude<AgentRole, "CUSTOM">];
  const codeDefault: ResolvedAgent = fallbackDefault
    ? toResolved(role, fallbackDefault, "code-default")
    : {
        role,
        name: role,
        systemPrompt: "",
        model: null,
        temperature: 0.7,
        maxOutputTokens: 1024,
        tools: [],
        guardrails: {},
        fallback: "error",
        enabled: false,
        source: "code-default",
      };

  try {
    // Workspace override first, then platform default. Two cheap indexed
    // queries; the table is tiny and these are cached by Prisma's identity map
    // within a request.
    if (workspaceId) {
      const wsRow = await prisma.agentConfig.findFirst({
        where: { workspaceId, role, enabled: true },
      });
      if (wsRow) return rowToResolved(role, wsRow, "workspace");
    }
    const platformRow = await prisma.agentConfig.findFirst({
      where: { workspaceId: null, role, enabled: true },
    });
    if (platformRow) return rowToResolved(role, platformRow, "platform");
  } catch (e) {
    console.error(`[agents] config lookup failed for ${role}, using code default:`, e);
  }

  return codeDefault;
}

type AgentConfigRow = {
  name: string;
  systemPrompt: string;
  model: string | null;
  temperature: number;
  maxOutputTokens: number;
  toolsJson: string;
  guardrailsJson: string;
  fallback: string;
  enabled: boolean;
};

function rowToResolved(role: AgentRole, row: AgentConfigRow, source: ResolvedAgent["source"]): ResolvedAgent {
  const guardrails = parseJsonSafe<AgentGuardrails>(row.guardrailsJson, {});
  const fallback: AgentFallbackMode = row.fallback === "error" ? "error" : "mock";
  return {
    role,
    name: row.name,
    systemPrompt: row.systemPrompt,
    model: row.model,
    temperature: row.temperature,
    maxOutputTokens: row.maxOutputTokens,
    tools: parseJsonSafe<string[]>(row.toolsJson, []),
    guardrails,
    fallback,
    enabled: row.enabled,
    source,
  };
}
