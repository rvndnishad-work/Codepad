/**
 * Shared types for the admin assistant: tool declarations (Gemini function
 * declarations), tool call records shown as trace chips, and proposals shown
 * as approval cards.
 */

/** JSON schema subset Gemini accepts for function parameters. */
export type ParamSchema =
  | { type: "string"; description?: string; enum?: string[]; maxLength?: number; format?: "date-time" }
  | { type: "integer" | "number"; description?: string; minimum?: number; maximum?: number }
  | { type: "boolean"; description?: string };

export type ObjectSchema = {
  type: "object";
  properties: Record<string, ParamSchema>;
  required?: string[];
};

export type ToolDeclaration = {
  name: string;
  description: string;
  parameters: ObjectSchema;
};

export type ToolContext = {
  actor: { id: string | null; email: string | null };
};

/** What an executor returns. `data` goes back to the model; `summary` is the chip. */
export type ToolResult = {
  data: unknown;
  summary: string;
  /** Admin page that shows the thing looked at, for the chip link. */
  href?: string;
  /** Set by proposal tools: the card to show. */
  proposal?: Proposal;
};

export type ToolDef = {
  decl: ToolDeclaration;
  kind: "read" | "propose";
  run: (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>;
};

/** Stored on AssistantMessage.toolCalls (an array of these). */
export type ToolCallRecord = {
  name: string;
  args: Record<string, unknown>;
  summary: string;
  ok: boolean;
  href?: string;
};

export type ProposalKind =
  | "grant_credits"
  | "extend_trial"
  | "set_switch"
  | "schedule_maintenance"
  | "email_workspace_owner"
  | "moderate_blog"
  | "create_todo";

export type ProposalStatus = "pending" | "running" | "approved" | "dismissed";

/** One editable field on the card. */
export type ProposalField = {
  key: string;
  label: string;
  /** How the card edits it. */
  input: "text" | "textarea" | "number" | "boolean" | "select" | "datetime";
  options?: string[];
  /** Fields that only describe (balance after, workspace) are not editable. */
  readOnly?: boolean;
};

/** Stored on AssistantMessage.proposal. */
export type Proposal = {
  kind: ProposalKind;
  /** The arguments the approval runs with. Edited in place before approving. */
  args: Record<string, unknown>;
  /** Card title, e.g. "Grant 20 AI credits to Northwind". */
  summary: string;
  /** Read-only facts for the card ("Balance after": "37 credits"). */
  facts: { label: string; value: string }[];
  fields: ProposalField[];
  /** Approve button label. */
  approveLabel: string;
  status: ProposalStatus;
  result?: string;
  error?: string;
  decidedAt?: string;
  decidedBy?: string | null;
};
