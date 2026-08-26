import type { GeminiFunctionDeclaration } from "@/lib/mcp/outbound-tools";

/**
 * Builtin tool registry — the seam between agents and their capabilities.
 *
 * v1 scope: the admin-helper tool DECLARATIONS live here (moved out of the
 * copilot route) so agent configs can reference tools by id. Execution still
 * dispatches inside the copilot route's loop; migrating the executors into
 * `executeBuiltinTool` is the planned v2 so any agent can call any tool
 * through one audited path.
 */

/** Canonical HITL action catalog — single source for route + UI + registry. */
export const PROPOSABLE_ACTION_TYPES = [
  "BAN_USER",
  "UNBAN_USER",
  "ARCHIVE_SESSION",
  "BULK_ARCHIVE_SESSIONS",
  "MODERATE_BLOG",
  "FEATURE_BLOG",
  "UNFEATURE_BLOG",
  "DELETE_COMMENT",
  "PUBLISH_CHALLENGE",
  "UNPUBLISH_CHALLENGE",
  "UPDATE_TODO_STATUS",
  "CREATE_TODO",
] as const;
export type ProposableActionType = (typeof PROPOSABLE_ACTION_TYPES)[number];

export type BuiltinToolId =
  | "run_read_only_query"
  | "get_platform_stats"
  | "summarize_user"
  | "list_recent_signups"
  | "create_admin_todo"
  | "propose_action";

/** Gemini function declarations for the builtin admin-helper tools. */
export const ADMIN_HELPER_TOOLS: GeminiFunctionDeclaration[] = [
  {
    name: "run_read_only_query",
    description:
      "Execute a read-only SQL SELECT/WITH query on the SQLite database. Auto-capped at 100 rows. Use only when no scoped tool fits.",
    parameters: {
      type: "OBJECT",
      properties: {
        sql: {
          type: "STRING",
          description:
            "SQLite-compliant SELECT (or CTE) query. Example: 'SELECT COUNT(*) FROM User WHERE banned = 1'",
        },
      },
      required: ["sql"],
    },
  },
  {
    name: "get_platform_stats",
    description:
      "Atomic snapshot of platform health: total/banned users, blog statuses, session statuses, todo backlog. No PII. Cheaper than running multiple COUNT queries.",
    parameters: { type: "OBJECT", properties: {} },
  },
  {
    name: "summarize_user",
    description:
      "Fast bounded profile of a single user: name, ban status, signup, attempt count, comment count, blog count. Use before proposing BAN_USER or UNBAN_USER to gather context.",
    parameters: {
      type: "OBJECT",
      properties: {
        userId: { type: "STRING", description: "The User.id to summarize." },
      },
      required: ["userId"],
    },
  },
  {
    name: "list_recent_signups",
    description:
      "Users created in the last N hours (1..168). Returns name + truncated id + signup time. Up to 200 rows.",
    parameters: {
      type: "OBJECT",
      properties: {
        hours: { type: "NUMBER", description: "How far back to look. Defaults to 24." },
      },
    },
  },
  {
    name: "create_admin_todo",
    description:
      "Create a new prioritized AdminTodo ticket. Use only when the admin explicitly asks to file/track work.",
    parameters: {
      type: "OBJECT",
      properties: {
        title: { type: "STRING", description: "Concise title. Example: 'Redesign blocks page in admin'" },
        body: { type: "STRING", description: "Detailed description, requirements, next steps." },
        priority: { type: "STRING", enum: ["LOW", "MEDIUM", "HIGH"], description: "Default 'MEDIUM'." },
        category: { type: "STRING", description: "Category tag (UI, AI, MCP, etc.). Default 'General'." },
      },
      required: ["title"],
    },
  },
  {
    name: "propose_action",
    description:
      "File a Human-in-the-Loop intervention proposal. Creates a GemmaAlert with a proposedAction payload — the admin sees a one-click approval card in the Intervention Control Center. Use this whenever you spot something that needs a write but the admin hasn't directly asked for it.",
    parameters: {
      type: "OBJECT",
      properties: {
        actionType: {
          type: "STRING",
          enum: [...PROPOSABLE_ACTION_TYPES],
          description: "Which HITL action to propose.",
        },
        targetId: {
          type: "STRING",
          description:
            "Primary entity id (userId / postId / commentId / challengeId / sessionId / todoId). For BULK_ARCHIVE_SESSIONS pass 'bulk'.",
        },
        title: { type: "STRING", description: "Short title shown on the proposal card." },
        body: { type: "STRING", description: "Why you're proposing this — context the admin needs to decide." },
        severity: {
          type: "STRING",
          enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
          description: "Defaults to MEDIUM.",
        },
        type: {
          type: "STRING",
          enum: ["INTEGRITY", "MODERATION", "SYSTEM_STALL", "SECURITY", "BACKLOG", "SPAM", "GROWTH"],
          description: "Alert classification — drives icon color & filtering. Defaults to MODERATION.",
        },
        meta: {
          type: "OBJECT",
          description:
            "Action-specific extras. For UPDATE_TODO_STATUS include { newStatus: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'BACKLOG' }.",
        },
      },
      required: ["actionType", "targetId", "title", "body"],
    },
  },
];

/** Look up declarations for an agent's tool allowlist. */
export function resolveToolDeclarations(toolIds: string[]): GeminiFunctionDeclaration[] {
  if (toolIds.length === 0) return [];
  const byId = new Map(ADMIN_HELPER_TOOLS.map((t) => [t.name, t]));
  return toolIds.map((id) => byId.get(id)).filter((t): t is GeminiFunctionDeclaration => !!t);
}
