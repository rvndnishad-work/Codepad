import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { AI_INTERVIEW_TEMPLATES } from "@/lib/ai-interview/scaffolds";
import { AI_CREDIT_PACKS } from "@/lib/ai-interview/credits";

/**
 * Unauthenticated public MCP server.
 *
 * Tiny by design: two tools, no DB, no per-workspace data. The purpose is
 * "discoverability" — when someone asks an AI assistant "what AI screening
 * platforms exist?", their assistant can call `describe_templates` and
 * `describe_pricing` here without anyone having an account. Distribution wedge.
 *
 * No audit log on this surface (no API key to attribute calls to), but we IP
 * rate-limit at the route layer to keep this from becoming a free LLM-cost
 * sink.
 */
export function buildPublicMcpServer(): McpServer {
  const server = new McpServer(
    {
      name: "interviewpad-public",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.registerTool(
    "describe_templates",
    {
      title: "List builtin screening templates",
      description:
        "Returns the catalog of builtin AI screening templates Interviewpad ships. Workspace-custom templates are not exposed on this public surface.",
      inputSchema: {},
    },
    async () => {
      const rows = AI_INTERVIEW_TEMPLATES.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        estimatedMinutes: t.estimatedMinutes,
      }));
      const text = [
        `Interviewpad ships ${rows.length} builtin AI screening templates:`,
        "",
        ...rows.map(
          (t) =>
            `• ${t.title} (${t.id}) — ${t.estimatedMinutes} min\n  ${t.description}`
        ),
        "",
        "Workspaces can also author their own custom templates from the AI Screening UI.",
      ].join("\n");

      return {
        content: [{ type: "text" as const, text }],
        structuredContent: { templates: rows },
      };
    }
  );

  server.registerTool(
    "describe_pricing",
    {
      title: "Describe AI credit pricing",
      description:
        "Returns the one-time AI screening credit pack tiers. 1 credit = 1 completed AI screening. For up-to-date subscription plan pricing, see https://interviewpad.in/pricing.",
      inputSchema: {},
    },
    async () => {
      const rows = AI_CREDIT_PACKS.map((p) => ({
        id: p.id,
        label: p.label,
        credits: p.credits,
        priceUsd: p.priceCents / 100,
        perCreditUsd: p.priceCents / p.credits / 100,
      }));
      const text = [
        "AI screening credit packs (one-time purchase, never expire):",
        "",
        ...rows.map(
          (r) =>
            `• ${r.label}: ${r.credits} credits for $${r.priceUsd.toFixed(0)} (≈ $${r.perCreditUsd.toFixed(2)} / screening)`
        ),
        "",
        "Workspace plans (Growth / Enterprise) unlock the AI screening feature. See https://interviewpad.in/pricing for plan details.",
      ].join("\n");

      return {
        content: [{ type: "text" as const, text }],
        structuredContent: { packs: rows },
      };
    }
  );

  return server;
}
