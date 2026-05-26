import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getWorkspaceCredits, refundCredit } from "@/lib/ai-interview/credits";
import { resolveTemplate } from "@/lib/ai-interview/template-resolver";
import { sendInviteEmail } from "@/lib/ai-interview/invite-email";
import { withAudit, writeAuditEntry } from "./audit";
import { hasScope } from "./auth";
import type { AuthedKey } from "./auth";

/**
 * Thin error type for tool-level rejections so the SDK turns them into
 * `isError: true` MCP responses with the message body, instead of crashing
 * the whole JSON-RPC request.
 */
class ToolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ToolError";
  }
}

/** Sentinel thrown when a write tool is called with a read-only key. */
function requireWriteScope(auth: AuthedKey): void {
  if (!hasScope(auth, "write")) {
    throw new ToolError(
      "This API key has read-only scope. Write tools require a key minted with the 'write' scope."
    );
  }
}

/**
 * Production MCP server factory.
 *
 * Each key is scoped to exactly one workspace, so the server is built per
 * authenticated request with that workspace's id baked into every query.
 * This avoids the more complex "multi-tenant tool that accepts a workspace
 * argument" pattern — simpler reasoning about data leakage, and the LLM
 * doesn't have to know about workspace ids at all.
 *
 * Phase 1 surface: 5 read tools + 4 resources. All read-only — write tools
 * arrive in Phase 2 and will gate on `hasScope(auth, "write")`.
 */
export function buildMcpServer(auth: AuthedKey): McpServer {
  const server = new McpServer(
    {
      name: "interviewpad",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    }
  );

  // ── Tools ────────────────────────────────────────────────────────────────

  server.registerTool(
    "get_workspace",
    {
      title: "Get current workspace",
      description:
        "Returns the workspace this API key is scoped to. Use this first to ground your reasoning — every other tool operates inside this single workspace.",
      inputSchema: {},
    },
    async () =>
      withAudit({ auth, kind: "tool", name: "get_workspace" }, async () => {
        const ws = await prisma.workspace.findUnique({
          where: { id: auth.workspaceId },
          select: {
            name: true,
            slug: true,
            planName: true,
            _count: {
              select: {
                candidates: true,
                aiInterviewSessions: true,
                members: true,
              },
            },
          },
        });
        if (!ws) throw new Error("Workspace not found");

        const text = [
          `Workspace: ${ws.name} (${ws.slug})`,
          `Plan: ${ws.planName}`,
          `Members: ${ws._count.members}`,
          `Candidates: ${ws._count.candidates}`,
          `AI screenings: ${ws._count.aiInterviewSessions}`,
          `API key label: ${auth.label} (scopes: ${auth.scopes.join(", ")})`,
        ].join("\n");

        return {
          result: { content: [{ type: "text" as const, text }] },
          summary: `${ws.name} · plan=${ws.planName}`,
        };
      })
  );

  server.registerTool(
    "list_candidates",
    {
      title: "List candidates",
      description:
        "List candidates in this workspace. Filter by status (active/hired/rejected/archived) or free-text search across name and email. Defaults to the 25 most recently updated.",
      inputSchema: {
        status: z
          .enum(["active", "hired", "rejected", "archived"])
          .optional()
          .describe("Pipeline status filter."),
        search: z.string().optional().describe("Match against name or email."),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Max rows to return (1–100). Defaults to 25."),
      },
    },
    async (args) =>
      withAudit({ auth, kind: "tool", name: "list_candidates", args }, async () => {
        const limit = args.limit ?? 25;
        const where: Record<string, unknown> = { workspaceId: auth.workspaceId };
        if (args.status) where.status = args.status;
        if (args.search) {
          where.OR = [
            { name: { contains: args.search } },
            { email: { contains: args.search } },
          ];
        }
        const rows = await prisma.candidate.findMany({
          where,
          orderBy: { updatedAt: "desc" },
          take: limit,
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
            source: true,
            tags: true,
            updatedAt: true,
            _count: { select: { sessions: true, takeHomes: true } },
          },
        });

        const text =
          rows.length === 0
            ? "No candidates match those filters."
            : rows
                .map((c) =>
                  `• ${c.name} <${c.email ?? "no-email"}> · ${c.status}` +
                  ` · sessions:${c._count.sessions} takehomes:${c._count.takeHomes}` +
                  ` · id:${c.id}`
                )
                .join("\n");

        return {
          result: { content: [{ type: "text" as const, text }] },
          summary: `${rows.length} candidate${rows.length === 1 ? "" : "s"}`,
        };
      })
  );

  server.registerTool(
    "list_screenings",
    {
      title: "List AI screenings",
      description:
        "List AI screenings in this workspace. Filter by status (PENDING/ACTIVE/COMPLETED) and an ISO date threshold. Returns the 25 most recent by default. Use get_screening_result for the full scorecard.",
      inputSchema: {
        status: z
          .enum(["PENDING", "ACTIVE", "COMPLETED"])
          .optional()
          .describe("Session status filter."),
        since: z
          .string()
          .optional()
          .describe("ISO datetime; returns sessions created at or after this."),
        limit: z.number().int().min(1).max(100).optional(),
      },
    },
    async (args) =>
      withAudit({ auth, kind: "tool", name: "list_screenings", args }, async () => {
        const limit = args.limit ?? 25;
        const where: Record<string, unknown> = { workspaceId: auth.workspaceId };
        if (args.status) where.status = args.status;
        if (args.since) {
          const since = new Date(args.since);
          if (Number.isNaN(since.getTime())) {
            throw new Error("`since` must be an ISO datetime string.");
          }
          where.createdAt = { gte: since };
        }
        const rows = await prisma.aIInterviewSession.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: limit,
          select: {
            id: true,
            inviteToken: true,
            candidateName: true,
            candidateEmail: true,
            positionTitle: true,
            templateId: true,
            status: true,
            score: true,
            aiSuspicionScore: true,
            startedAt: true,
            finishedAt: true,
            createdAt: true,
          },
        });

        const text =
          rows.length === 0
            ? "No screenings match those filters."
            : rows
                .map((s) => {
                  const score = s.score !== null ? `${s.score}%` : "—";
                  const susp =
                    s.aiSuspicionScore !== null
                      ? ` · suspicion:${s.aiSuspicionScore}/100`
                      : "";
                  return (
                    `• ${s.candidateName} <${s.candidateEmail}> · ${s.positionTitle}` +
                    ` · ${s.status} · score:${score}${susp}` +
                    ` · token:${s.inviteToken}`
                  );
                })
                .join("\n");

        return {
          result: { content: [{ type: "text" as const, text }] },
          summary: `${rows.length} screening${rows.length === 1 ? "" : "s"}`,
        };
      })
  );

  server.registerTool(
    "get_screening_result",
    {
      title: "Get screening result",
      description:
        "Return the full scorecard for a single screening: composite score, per-rubric ratings, AI summary bullets, integrity score, and the chat transcript. Look up by inviteToken OR session id.",
      inputSchema: {
        invite_token_or_id: z
          .string()
          .describe("The screening's inviteToken (preferred) or internal id."),
      },
    },
    async (args) =>
      withAudit(
        { auth, kind: "tool", name: "get_screening_result", args },
        async () => {
          const key = args.invite_token_or_id;
          const row = await prisma.aIInterviewSession.findFirst({
            where: {
              workspaceId: auth.workspaceId,
              OR: [{ inviteToken: key }, { id: key }],
            },
          });
          if (!row) {
            throw new Error("Screening not found in this workspace.");
          }

          let ratings:
            | { CodeQuality: number; ProblemSolving: number; Communication: number }
            | null = null;
          if (row.ratings) {
            try {
              ratings = JSON.parse(row.ratings);
            } catch {
              /* ignore */
            }
          }

          let chatTurns = 0;
          try {
            const history = JSON.parse(row.chatHistory) as { role: string }[];
            chatTurns = Array.isArray(history) ? history.length : 0;
          } catch {
            /* ignore */
          }

          const text = [
            `Candidate: ${row.candidateName} <${row.candidateEmail}>`,
            `Position: ${row.positionTitle}`,
            `Template: ${row.templateId}`,
            `Status: ${row.status}`,
            `Composite score: ${row.score !== null ? `${row.score}%` : "—"}`,
            ratings
              ? `Rubric: code=${ratings.CodeQuality}/5 · problem-solving=${ratings.ProblemSolving}/5 · comms=${ratings.Communication}/5`
              : "Rubric: (not graded)",
            row.aiSuspicionScore !== null
              ? `Integrity suspicion: ${row.aiSuspicionScore}/100`
              : "Integrity suspicion: (no telemetry)",
            `Chat turns: ${chatTurns}`,
            row.startedAt ? `Started at: ${row.startedAt.toISOString()}` : "Not yet started",
            row.finishedAt ? `Finished at: ${row.finishedAt.toISOString()}` : "Not yet finished",
            "",
            "AI summary:",
            row.aiSummary || "(no summary yet)",
            "",
            `For the full transcript and submitted files, read the resources screening://${row.inviteToken}/transcript and screening://${row.inviteToken}/scorecard.`,
          ].join("\n");

          return {
            result: { content: [{ type: "text" as const, text }] },
            summary: `${row.candidateName} · ${row.status} · score=${row.score ?? "—"}`,
          };
        }
      )
  );

  server.registerTool(
    "get_credit_balance",
    {
      title: "Get AI credit balance",
      description:
        "Return the current AI screening credit balance for this workspace plus a summary of recent ledger activity (purchases, grants, consumption, refunds).",
      inputSchema: {},
    },
    async () =>
      withAudit({ auth, kind: "tool", name: "get_credit_balance" }, async () => {
        const balance = await getWorkspaceCredits(auth.workspaceId);
        const recent = await prisma.aIInterviewCreditLedger.findMany({
          where: { workspaceId: auth.workspaceId },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            kind: true,
            amount: true,
            note: true,
            createdAt: true,
          },
        });

        const text = [
          `Credit balance: ${balance}`,
          "",
          "Recent activity (last 10 entries):",
          ...(recent.length === 0
            ? ["(none yet)"]
            : recent.map(
                (e) =>
                  `${e.createdAt.toISOString()} · ${e.kind} · ${e.amount >= 0 ? "+" : ""}${e.amount}${e.note ? ` · ${e.note}` : ""}`
              )),
        ].join("\n");

        return {
          result: { content: [{ type: "text" as const, text }] },
          summary: `balance=${balance}`,
        };
      })
  );

  // ── Write tools ──────────────────────────────────────────────────────────
  //
  // Phase 2 surface. All require `write` scope; we check inside the handler
  // (not at registration time) so a read-only key still sees the tools in
  // tools/list — the LLM gets a clear "this key can't do that" rather than
  // a confusing missing-tool dead end. Every write tool is scoped to the
  // authenticated workspace and includes its args in the audit log.

  server.registerTool(
    "create_ai_screening",
    {
      title: "Create an AI screening",
      description:
        "Generate an AI screening invite for a candidate. Returns the invite URL the candidate can use to start the assessment. The workspace is charged 1 credit on the candidate's first message — invite creation is free. Optionally emails the candidate the link.",
      inputSchema: {
        candidate_email: z.string().email().describe("Candidate's email address."),
        candidate_name: z.string().min(1).describe("Candidate's full name."),
        position_title: z
          .string()
          .min(1)
          .describe("Role title (e.g. 'Senior React Engineer')."),
        template_id: z
          .string()
          .min(1)
          .describe(
            "Screening template id — either a builtin (react-todo-pagination, interactive-carousel, valid-parentheses-stack, dynamic-fibonacci) or a custom template id from this workspace."
          ),
        send_email: z
          .boolean()
          .optional()
          .describe("Email the candidate the screening link. Defaults to true."),
      },
    },
    async (args) =>
      withAudit(
        { auth, kind: "tool", name: "create_ai_screening", args },
        async () => {
          requireWriteScope(auth);

          // Validate the template id resolves either to a builtin scaffold or
          // a custom template owned by this workspace. Prevents a write-scoped
          // key from creating sessions pointing at another tenant's template.
          const template = await resolveTemplate(args.template_id, auth.workspaceId);
          if (!template) {
            throw new ToolError(
              `Unknown template_id "${args.template_id}". Call list_templates (or check the workspace UI) for valid ids.`
            );
          }

          const session = await prisma.aIInterviewSession.create({
            data: {
              workspaceId: auth.workspaceId,
              candidateName: args.candidate_name.trim(),
              candidateEmail: args.candidate_email.trim().toLowerCase(),
              positionTitle: args.position_title.trim(),
              templateId: args.template_id,
              status: "PENDING",
              chatHistory: "[]",
              filesJson: "{}",
            },
            select: {
              id: true,
              inviteToken: true,
              candidateName: true,
              candidateEmail: true,
              positionTitle: true,
            },
          });

          // Best-effort email (matches the UI behavior). Origin is derived
          // from NEXTAUTH_URL because this code runs inside a tool handler
          // where the original Request isn't in scope.
          const origin = process.env.NEXTAUTH_URL || "http://localhost:3000";
          const inviteUrl = `${origin}/ai-interview/${session.inviteToken}`;
          if (args.send_email !== false) {
            void sendInviteEmail({
              candidateName: session.candidateName,
              candidateEmail: session.candidateEmail,
              positionTitle: session.positionTitle,
              workspaceName: auth.workspaceName,
              inviteUrl,
            }).then((res) => {
              if (!res.sent) {
                console.warn(
                  `[mcp:create_ai_screening] email failed for ${session.candidateEmail}: ${res.reason}`
                );
              }
            });
          }

          const text = [
            `Screening created.`,
            ``,
            `Candidate: ${session.candidateName} <${session.candidateEmail}>`,
            `Position: ${session.positionTitle}`,
            `Template: ${template.title}`,
            ``,
            `Invite URL: ${inviteUrl}`,
            `Invite token: ${session.inviteToken}`,
            ``,
            args.send_email !== false
              ? "Invite email queued."
              : "Email send was skipped (send_email=false).",
            ``,
            `1 credit will be deducted on the candidate's first message.`,
          ].join("\n");

          return {
            result: { content: [{ type: "text" as const, text }] },
            summary: `created screening for ${session.candidateName}`,
          };
        }
      )
  );

  server.registerTool(
    "update_candidate_status",
    {
      title: "Update candidate status",
      description:
        "Move a candidate to a new pipeline status (active/hired/rejected/archived). Optionally append a dated note describing the reason.",
      inputSchema: {
        candidate_id: z.string().min(1).describe("Candidate's internal id."),
        status: z
          .enum(["active", "hired", "rejected", "archived"])
          .describe("New pipeline status."),
        note: z
          .string()
          .optional()
          .describe(
            "Optional note. Appended to the candidate's running notes with a timestamp."
          ),
      },
    },
    async (args) =>
      withAudit(
        { auth, kind: "tool", name: "update_candidate_status", args },
        async () => {
          requireWriteScope(auth);

          // Tenant scoping — candidate must belong to this workspace.
          const existing = await prisma.candidate.findFirst({
            where: { id: args.candidate_id, workspaceId: auth.workspaceId },
            select: { id: true, name: true, status: true, notes: true },
          });
          if (!existing) {
            throw new ToolError("Candidate not found in this workspace.");
          }

          // Append note in a stable format so future tooling can parse it.
          let nextNotes = existing.notes ?? "";
          if (args.note?.trim()) {
            const stamp = new Date().toISOString();
            const line = `[${stamp}] [MCP:${auth.label}] status→${args.status}: ${args.note.trim()}`;
            nextNotes = nextNotes ? `${nextNotes}\n${line}` : line;
          }

          const updated = await prisma.candidate.update({
            where: { id: existing.id },
            data: { status: args.status, notes: nextNotes },
            select: { id: true, name: true, status: true, updatedAt: true },
          });

          const text = [
            `Candidate "${updated.name}" status updated.`,
            ``,
            `Before: ${existing.status}`,
            `After:  ${updated.status}`,
            `Updated at: ${updated.updatedAt.toISOString()}`,
            args.note ? `\nNote appended.` : "",
          ].join("\n");

          return {
            result: { content: [{ type: "text" as const, text }] },
            summary: `${updated.name}: ${existing.status} → ${updated.status}`,
          };
        }
      )
  );

  server.registerTool(
    "add_candidate_note",
    {
      title: "Add a note to a candidate",
      description:
        "Append a free-text note to a candidate's running notes. The note is timestamped and labeled with the API key, so it's clear it came from an MCP client.",
      inputSchema: {
        candidate_id: z.string().min(1).describe("Candidate's internal id."),
        body: z.string().min(1).max(4000).describe("Note body."),
      },
    },
    async (args) =>
      withAudit(
        { auth, kind: "tool", name: "add_candidate_note", args },
        async () => {
          requireWriteScope(auth);

          const existing = await prisma.candidate.findFirst({
            where: { id: args.candidate_id, workspaceId: auth.workspaceId },
            select: { id: true, name: true, notes: true },
          });
          if (!existing) {
            throw new ToolError("Candidate not found in this workspace.");
          }

          const stamp = new Date().toISOString();
          const line = `[${stamp}] [MCP:${auth.label}] ${args.body.trim()}`;
          const nextNotes = existing.notes ? `${existing.notes}\n${line}` : line;

          await prisma.candidate.update({
            where: { id: existing.id },
            data: { notes: nextNotes },
          });

          return {
            result: {
              content: [
                {
                  type: "text" as const,
                  text: `Note added to "${existing.name}" (${args.body.length} chars).`,
                },
              ],
            },
            summary: `note added to ${existing.name}`,
          };
        }
      )
  );

  server.registerTool(
    "refund_screening",
    {
      title: "Refund a consumed credit",
      description:
        "Refund the 1 credit that was charged when this screening started. Use when a screening was technically broken (candidate had issues, AI grader failed, etc.). Idempotent — a second refund attempt errors clearly. Cannot refund a screening that was never charged.",
      inputSchema: {
        invite_token_or_id: z
          .string()
          .min(1)
          .describe("The screening's inviteToken (preferred) or internal id."),
        reason: z
          .string()
          .min(3)
          .max(500)
          .describe("Why this refund is happening — recorded in the credit ledger."),
      },
    },
    async (args) =>
      withAudit(
        { auth, kind: "tool", name: "refund_screening", args },
        async () => {
          requireWriteScope(auth);

          const session = await prisma.aIInterviewSession.findFirst({
            where: {
              workspaceId: auth.workspaceId,
              OR: [
                { inviteToken: args.invite_token_or_id },
                { id: args.invite_token_or_id },
              ],
            },
            select: {
              id: true,
              workspaceId: true,
              candidateName: true,
              startedAt: true,
            },
          });
          if (!session) {
            throw new ToolError("Screening not found in this workspace.");
          }
          if (!session.startedAt) {
            throw new ToolError(
              "Cannot refund — this screening was never charged (candidate did not start)."
            );
          }

          // Idempotency: reuse the same dedupe rule as the admin console.
          const existing = await prisma.aIInterviewCreditLedger.findFirst({
            where: { sessionId: session.id, kind: "REFUND" },
            select: { id: true, createdAt: true },
          });
          if (existing) {
            throw new ToolError(
              `Already refunded on ${existing.createdAt.toISOString()}.`
            );
          }

          await refundCredit({
            workspaceId: session.workspaceId,
            sessionId: session.id,
            adminUserId: "mcp:" + auth.apiKeyId,
            note: `MCP refund via key "${auth.label}": ${args.reason.trim()}`,
          });

          return {
            result: {
              content: [
                {
                  type: "text" as const,
                  text: `Refunded 1 credit for ${session.candidateName}.\n\nReason recorded in ledger.`,
                },
              ],
            },
            summary: `refunded ${session.candidateName}`,
          };
        }
      )
  );

  // ── Resources ────────────────────────────────────────────────────────────
  //
  // Resources are read-only "fetch by URI" surfaces, useful when the LLM
  // wants raw structured data rather than a summarized tool result. We use
  // `workspace://current/...` because each key already pins a workspace —
  // exposing slugs would be redundant and let a curious user probe other
  // workspace names via 404 differentials.

  server.registerResource(
    "candidates",
    "workspace://current/candidates",
    {
      title: "All candidates (JSON)",
      description: "Full candidate list for this workspace as JSON.",
      mimeType: "application/json",
    },
    async (uri) =>
      withAudit(
        { auth, kind: "resource", name: "workspace://current/candidates" },
        async () => {
          const rows = await prisma.candidate.findMany({
            where: { workspaceId: auth.workspaceId },
            orderBy: { updatedAt: "desc" },
            take: 200,
            select: {
              id: true,
              name: true,
              email: true,
              status: true,
              source: true,
              tags: true,
              createdAt: true,
              updatedAt: true,
            },
          });
          return {
            result: {
              contents: [
                {
                  uri: uri.href,
                  mimeType: "application/json",
                  text: JSON.stringify(rows, null, 2),
                },
              ],
            },
            summary: `${rows.length} candidates`,
          };
        }
      )
  );

  server.registerResource(
    "screenings",
    "workspace://current/screenings",
    {
      title: "All AI screenings (JSON)",
      description:
        "Full AI screening list for this workspace as JSON (most recent first, capped at 200).",
      mimeType: "application/json",
    },
    async (uri) =>
      withAudit(
        { auth, kind: "resource", name: "workspace://current/screenings" },
        async () => {
          const rows = await prisma.aIInterviewSession.findMany({
            where: { workspaceId: auth.workspaceId },
            orderBy: { createdAt: "desc" },
            take: 200,
            select: {
              id: true,
              inviteToken: true,
              candidateName: true,
              candidateEmail: true,
              positionTitle: true,
              templateId: true,
              status: true,
              score: true,
              aiSuspicionScore: true,
              startedAt: true,
              finishedAt: true,
              createdAt: true,
            },
          });
          return {
            result: {
              contents: [
                {
                  uri: uri.href,
                  mimeType: "application/json",
                  text: JSON.stringify(rows, null, 2),
                },
              ],
            },
            summary: `${rows.length} screenings`,
          };
        }
      )
  );

  server.registerResource(
    "transcript",
    new ResourceTemplate("screening://{token}/transcript", { list: undefined }),
    {
      title: "Screening chat transcript",
      description:
        "The full candidate ↔ AI chat history for one screening. Substitute {token} with the inviteToken.",
      mimeType: "application/json",
    },
    async (uri, vars) =>
      withAudit(
        { auth, kind: "resource", name: `screening://${vars.token}/transcript` },
        async () => {
          const token = String(vars.token);
          const row = await prisma.aIInterviewSession.findFirst({
            where: { workspaceId: auth.workspaceId, inviteToken: token },
            select: { chatHistory: true, candidateName: true },
          });
          if (!row) throw new Error("Screening not found in this workspace.");
          let parsed: unknown = [];
          try {
            parsed = JSON.parse(row.chatHistory);
          } catch {
            parsed = [];
          }
          return {
            result: {
              contents: [
                {
                  uri: uri.href,
                  mimeType: "application/json",
                  text: JSON.stringify(parsed, null, 2),
                },
              ],
            },
            summary: `transcript for ${row.candidateName}`,
          };
        }
      )
  );

  server.registerResource(
    "scorecard",
    new ResourceTemplate("screening://{token}/scorecard", { list: undefined }),
    {
      title: "Screening scorecard",
      description:
        "Compact JSON snapshot of a screening's graded result: score, per-rubric ratings, AI summary, integrity score, timestamps.",
      mimeType: "application/json",
    },
    async (uri, vars) =>
      withAudit(
        { auth, kind: "resource", name: `screening://${vars.token}/scorecard` },
        async () => {
          const token = String(vars.token);
          const row = await prisma.aIInterviewSession.findFirst({
            where: { workspaceId: auth.workspaceId, inviteToken: token },
          });
          if (!row) throw new Error("Screening not found in this workspace.");

          let ratings: unknown = null;
          try {
            ratings = row.ratings ? JSON.parse(row.ratings) : null;
          } catch {
            ratings = null;
          }

          const scorecard = {
            id: row.id,
            inviteToken: row.inviteToken,
            candidateName: row.candidateName,
            candidateEmail: row.candidateEmail,
            positionTitle: row.positionTitle,
            templateId: row.templateId,
            status: row.status,
            score: row.score,
            ratings,
            aiSummary: row.aiSummary,
            aiSuspicionScore: row.aiSuspicionScore,
            startedAt: row.startedAt,
            finishedAt: row.finishedAt,
            createdAt: row.createdAt,
          };

          return {
            result: {
              contents: [
                {
                  uri: uri.href,
                  mimeType: "application/json",
                  text: JSON.stringify(scorecard, null, 2),
                },
              ],
            },
            summary: `scorecard for ${row.candidateName}`,
          };
        }
      )
  );

  // ── Prompts ──────────────────────────────────────────────────────────────
  //
  // MCP prompts are "pre-canned LLM-side conversation seeds" — the server
  // bakes real data into a starter message that the user can drop into their
  // chat. Args are strings per the MCP spec, so list inputs are passed
  // comma-separated and parsed here.
  //
  // We don't use withAudit() because prompts return GetPromptResult directly
  // (not the `{ result, summary }` shape withAudit expects). The audit row
  // is written manually after the lookups complete.

  server.registerPrompt(
    "compare_candidates",
    {
      title: "Compare candidates",
      description:
        "Returns a chat seed comparing 2+ candidates side-by-side, with each candidate's scorecard inlined so the LLM can reason about fit without further tool calls.",
      argsSchema: {
        candidate_ids: z
          .string()
          .describe(
            "Comma-separated list of candidate ids (e.g. 'cmp1,cmp2,cmp3'). Get ids from list_candidates."
          ),
      },
    },
    async (args) => {
      const startedAt = Date.now();
      const ids = args.candidate_ids
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      if (ids.length < 2) {
        throw new ToolError(
          "compare_candidates needs at least 2 candidate ids, comma-separated."
        );
      }

      const candidates = await prisma.candidate.findMany({
        where: { id: { in: ids }, workspaceId: auth.workspaceId },
        include: {
          sessions: {
            orderBy: { createdAt: "desc" },
            select: {
              title: true,
              status: true,
              verdict: true,
              finishedAt: true,
            },
            take: 3,
          },
          takeHomes: {
            orderBy: { createdAt: "desc" },
            select: {
              status: true,
              attempt: { select: { score: true } },
            },
            take: 3,
          },
        },
      });

      if (candidates.length === 0) {
        throw new ToolError("None of those candidate ids exist in this workspace.");
      }

      const blocks = candidates
        .map((c) => {
          const tags = c.tags ? safeParseTags(c.tags).join(", ") : "(no tags)";
          const sessionLines = c.sessions
            .map(
              (s) =>
                `  • ${s.title ?? "(untitled)"} — ${s.status}${
                  s.verdict ? ` (${s.verdict})` : ""
                }`
            )
            .join("\n");
          const takeHomeLines = c.takeHomes
            .map(
              (t) =>
                `  • take-home ${t.status}${
                  t.attempt?.score != null ? ` · score ${t.attempt.score}` : ""
                }`
            )
            .join("\n");
          return [
            `### ${c.name}${c.email ? ` <${c.email}>` : ""}`,
            `Status: ${c.status} · Source: ${c.source ?? "—"} · Tags: ${tags}`,
            c.notes ? `Notes:\n${truncate(c.notes, 400)}` : "Notes: (none)",
            c.sessions.length > 0
              ? `Interview sessions:\n${sessionLines}`
              : "Interview sessions: (none)",
            c.takeHomes.length > 0
              ? `Take-homes:\n${takeHomeLines}`
              : "Take-homes: (none)",
          ].join("\n");
        })
        .join("\n\n");

      const userText = [
        `Compare the following ${candidates.length} candidates and recommend a ranked shortlist. ` +
          `Highlight notable strengths, gaps, and risks. Be specific — cite the data inlined below.`,
        ``,
        blocks,
      ].join("\n\n");

      void writeAuditEntry({
        auth,
        kind: "tool",
        name: "prompt:compare_candidates",
        args,
        durationMs: Date.now() - startedAt,
        resultSummary: `seeded comparison of ${candidates.length} candidates`,
      }).catch(() => {});

      return {
        messages: [
          {
            role: "user",
            content: { type: "text", text: userText },
          },
        ],
      };
    }
  );

  server.registerPrompt(
    "draft_outreach",
    {
      title: "Draft outreach email",
      description:
        "Seed a draft offer / reject / followup email for a candidate, with their scorecard inlined so the LLM writes from real signals rather than guessing.",
      argsSchema: {
        screening_id: z
          .string()
          .describe("Screening inviteToken or internal id (look up via list_screenings)."),
        kind: z
          .enum(["offer", "reject", "followup"])
          .describe("offer | reject | followup"),
      },
    },
    async (args) => {
      const startedAt = Date.now();

      const session = await prisma.aIInterviewSession.findFirst({
        where: {
          workspaceId: auth.workspaceId,
          OR: [{ inviteToken: args.screening_id }, { id: args.screening_id }],
        },
      });
      if (!session) {
        throw new ToolError("Screening not found in this workspace.");
      }

      let ratings:
        | { CodeQuality?: number; ProblemSolving?: number; Communication?: number }
        | null = null;
      try {
        ratings = session.ratings ? JSON.parse(session.ratings) : null;
      } catch {
        /* ignore */
      }

      const sysByKind: Record<string, string> = {
        offer:
          "You are a senior recruiter drafting an enthusiastic but realistic offer email. Reference 1–2 concrete strengths from the scorecard. Keep it under 200 words.",
        reject:
          "You are a senior recruiter drafting a respectful rejection. Be honest about the gap but constructive. Keep it under 150 words. Do not promise to keep them in mind for future roles unless you actually mean it.",
        followup:
          "You are a senior recruiter drafting a follow-up email asking the candidate about next-step availability. Reference one specific positive from the scorecard. Keep it under 100 words.",
      };

      const userText = [
        `Draft a ${args.kind} email for the candidate below.`,
        ``,
        `Candidate: ${session.candidateName} <${session.candidateEmail}>`,
        `Position: ${session.positionTitle}`,
        `Status: ${session.status}`,
        `Composite score: ${session.score !== null ? `${session.score}%` : "(not graded)"}`,
        ratings
          ? `Rubric: code=${ratings.CodeQuality ?? "?"}/5, problem-solving=${ratings.ProblemSolving ?? "?"}/5, comms=${ratings.Communication ?? "?"}/5`
          : "Rubric: (not graded)",
        session.aiSuspicionScore !== null
          ? `Integrity suspicion: ${session.aiSuspicionScore}/100`
          : "",
        ``,
        `AI summary:`,
        session.aiSummary || "(no summary)",
        ``,
        `Output only the email body — no subject line, no commentary.`,
      ]
        .filter(Boolean)
        .join("\n");

      void writeAuditEntry({
        auth,
        kind: "tool",
        name: "prompt:draft_outreach",
        args,
        durationMs: Date.now() - startedAt,
        resultSummary: `${args.kind} draft for ${session.candidateName}`,
      }).catch(() => {});

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `${sysByKind[args.kind]}\n\n---\n\n${userText}`,
            },
          },
        ],
      };
    }
  );

  return server;
}

/**
 * Tags are stored as JSON strings; tolerate malformed values without
 * crashing a prompt invocation.
 */
function safeParseTags(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((t): t is string => typeof t === "string");
    }
  } catch {
    /* ignore */
  }
  return [];
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max) + "…";
}
