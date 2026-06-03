/**
 * Static reference catalog for the Interviewpad MCP server.
 *
 * Source of truth for the public /docs/mcp page. Each entry mirrors what
 * `buildMcpServer()` actually registers — keep them in sync when adding a new
 * tool/resource/prompt. We don't introspect the server at runtime because the
 * docs page is unauthenticated; spinning up a fake McpServer just to list
 * capabilities would be overkill.
 */

export type CatalogScope = "read" | "write";

export type ToolCatalogEntry = {
  name: string;
  title: string;
  description: string;
  scope: CatalogScope;
  args?: { name: string; type: string; required: boolean; description: string }[];
  example?: string;
};

export type ResourceCatalogEntry = {
  name: string;
  uri: string;
  description: string;
  mimeType: string;
};

export type PromptCatalogEntry = {
  name: string;
  title: string;
  description: string;
  args: { name: string; required: boolean; description: string }[];
};

export const MCP_TOOLS: ToolCatalogEntry[] = [
  {
    name: "get_workspace",
    title: "Get current workspace",
    scope: "read",
    description:
      "Returns the workspace this API key is scoped to: name, slug, plan, member/candidate/screening counts, and the key's label + scopes.",
    example: 'get_workspace()',
  },
  {
    name: "list_candidates",
    title: "List candidates",
    scope: "read",
    description:
      "List candidates in this workspace. Filter by pipeline status or free-text search. Defaults to the 25 most recently updated.",
    args: [
      { name: "status", type: "active|hired|rejected|archived", required: false, description: "Pipeline status filter." },
      { name: "search", type: "string", required: false, description: "Match against name or email." },
      { name: "limit", type: "number (1–100)", required: false, description: "Max rows. Default 25." },
    ],
    example: 'list_candidates({ status: "active", limit: 10 })',
  },
  {
    name: "list_screenings",
    title: "List AI screenings",
    scope: "read",
    description:
      "List AI screenings. Filter by status or ISO date threshold. Returns the 25 most recent by default. Use get_screening_result for the full scorecard.",
    args: [
      { name: "status", type: "PENDING|ACTIVE|COMPLETED", required: false, description: "Status filter." },
      { name: "since", type: "ISO datetime", required: false, description: "Created at or after." },
      { name: "limit", type: "number (1–100)", required: false, description: "Max rows. Default 25." },
    ],
    example: 'list_screenings({ status: "COMPLETED", since: "2026-05-01" })',
  },
  {
    name: "get_screening_result",
    title: "Get screening result",
    scope: "read",
    description:
      "Full scorecard for one screening: composite score, per-rubric ratings, AI summary, integrity suspicion, transcript turn count, timestamps.",
    args: [
      {
        name: "invite_token_or_id",
        type: "string",
        required: true,
        description: "Screening's inviteToken (preferred) or internal id.",
      },
    ],
    example: 'get_screening_result({ invite_token_or_id: "ait_..." })',
  },
  {
    name: "get_credit_balance",
    title: "Get AI credit balance",
    scope: "read",
    description:
      "Current AI screening credit balance plus the 10 most recent ledger entries (purchases, grants, consumption, refunds).",
    example: 'get_credit_balance()',
  },
  {
    name: "create_ai_screening",
    title: "Create an AI screening",
    scope: "write",
    description:
      "Generate an AI screening invite. Returns the invite URL. Invite creation is free — 1 credit is charged when the candidate sends their first message. Optionally emails the candidate.",
    args: [
      { name: "candidate_email", type: "email", required: true, description: "Candidate's email." },
      { name: "candidate_name", type: "string", required: true, description: "Candidate's full name." },
      { name: "position_title", type: "string", required: true, description: "Role title." },
      { name: "template_id", type: "string", required: true, description: "Builtin or workspace-custom template id." },
      { name: "send_email", type: "boolean", required: false, description: "Email the invite. Default true." },
    ],
    example:
      'create_ai_screening({ candidate_email: "alice@example.com", candidate_name: "Alice", position_title: "Senior FE", template_id: "react-todo-pagination" })',
  },
  {
    name: "update_candidate_status",
    title: "Update candidate status",
    scope: "write",
    description:
      "Move a candidate through the pipeline. Optionally append a timestamped note explaining the move.",
    args: [
      { name: "candidate_id", type: "string", required: true, description: "Candidate's internal id." },
      { name: "status", type: "active|hired|rejected|archived", required: true, description: "New status." },
      { name: "note", type: "string", required: false, description: "Optional note appended to candidate notes." },
    ],
    example: 'update_candidate_status({ candidate_id: "cmp...", status: "hired" })',
  },
  {
    name: "add_candidate_note",
    title: "Add candidate note",
    scope: "write",
    description:
      "Append a free-text note to a candidate's running notes. Note is timestamped and labeled with the API key so its origin is auditable.",
    args: [
      { name: "candidate_id", type: "string", required: true, description: "Candidate's internal id." },
      { name: "body", type: "string (max 4000)", required: true, description: "Note body." },
    ],
    example:
      'add_candidate_note({ candidate_id: "cmp...", body: "Strong React fundamentals, follow up next week." })',
  },
  {
    name: "refund_screening",
    title: "Refund a screening credit",
    scope: "write",
    description:
      "Refund the 1 credit charged when a screening started. Idempotent — a second refund attempt errors. Cannot refund a screening that was never started.",
    args: [
      { name: "invite_token_or_id", type: "string", required: true, description: "Screening token or id." },
      { name: "reason", type: "string (3–500)", required: true, description: "Why — recorded in the credit ledger." },
    ],
    example:
      'refund_screening({ invite_token_or_id: "ait_...", reason: "Candidate had wifi issues" })',
  },
];

export const MCP_RESOURCES: ResourceCatalogEntry[] = [
  {
    name: "candidates",
    uri: "workspace://current/candidates",
    mimeType: "application/json",
    description: "Full candidate list for this workspace as JSON (most recently updated, capped at 200).",
  },
  {
    name: "screenings",
    uri: "workspace://current/screenings",
    mimeType: "application/json",
    description: "Full AI screening list as JSON (most recent first, capped at 200).",
  },
  {
    name: "transcript",
    uri: "screening://{token}/transcript",
    mimeType: "application/json",
    description: "Candidate ↔ AI chat history for one screening. Substitute {token} with the inviteToken.",
  },
  {
    name: "scorecard",
    uri: "screening://{token}/scorecard",
    mimeType: "application/json",
    description: "Compact graded result for one screening: score, ratings, summary, integrity score, timestamps.",
  },
];

export const MCP_PROMPTS: PromptCatalogEntry[] = [
  {
    name: "compare_candidates",
    title: "Compare candidates",
    description:
      "Chat seed comparing 2+ candidates side-by-side with their scorecards inlined. LLM is told to recommend a ranked shortlist.",
    args: [
      {
        name: "candidate_ids",
        required: true,
        description: "Comma-separated candidate ids (get from list_candidates).",
      },
    ],
  },
  {
    name: "draft_outreach",
    title: "Draft outreach email",
    description:
      "Draft an offer / reject / followup email for a candidate, seeded with their actual scorecard.",
    args: [
      { name: "screening_id", required: true, description: "Screening inviteToken or id." },
      { name: "kind", required: true, description: "offer | reject | followup" },
    ],
  },
];

/**
 * Public discovery surface — the unauthenticated /api/mcp/public endpoint
 * exposes these so AI assistants can answer "what AI screening platforms
 * exist?" by enumerating capabilities. Static config only, no DB.
 */
export const MCP_PUBLIC_TOOLS: ToolCatalogEntry[] = [
  {
    name: "describe_templates",
    title: "Describe screening templates",
    scope: "read",
    description:
      "Returns the catalog of builtin AI screening templates (id, title, description, estimated minutes). Workspace-custom templates are not exposed here.",
    example: "describe_templates()",
  },
  {
    name: "describe_pricing",
    title: "Describe pricing",
    scope: "read",
    description:
      "Returns the credit pack tiers (id, credits, price, ≈ per-screening rate). For up-to-date plan pricing visit https://interviewpad.in/pricing.",
    example: "describe_pricing()",
  },
];
