import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ensureSystemAdminWorkspace } from "@/lib/admin-system-workspace";

/**
 * Default to a free-tier Gemma model so admin/day-to-day usage stays out of
 * the paid-Gemini budget. The full per-request model selector below lets the
 * admin flip to Gemini Flash if Gemma is rate-limited; live candidate
 * interviews continue to run on the credit-based Gemini Pro path in
 * src/lib/ai-interview/scaffolds.ts (untouched).
 *
 * Override via ADMIN_COPILOT_MODEL=gemma-4-27b-it (or any allowlisted name).
 */
const DEFAULT_ADMIN_COPILOT_MODEL =
  process.env.ADMIN_COPILOT_MODEL || "gemma-3-27b-it";

const ALLOWED_MODELS = new Set([
  "gemma-3-27b-it",
  "gemma-3-12b-it",
  "gemma-3-4b-it",
  "gemma-4-27b-it",
  "gemini-2.5-flash",
  "gemini-2.5-pro",
]);

function resolveModel(requested: unknown): string {
  if (typeof requested === "string" && ALLOWED_MODELS.has(requested)) {
    return requested;
  }
  return DEFAULT_ADMIN_COPILOT_MODEL;
}

/**
 * Cap on rows returned to the model per query. The Gemma context window is
 * tiny compared to Gemini's, and the bigger reason: anything we hand to the
 * model can be echoed back to the admin chat — so this also limits accidental
 * PII fan-out from queries like `SELECT * FROM User`.
 */
const MAX_ROW_LIMIT = 100;

/**
 * If Gemma forgot to add a LIMIT clause, append one. We don't try to be too
 * clever — just look for a trailing `LIMIT n` and inject otherwise. Strip the
 * trailing semicolon first if present so we don't end up with `; LIMIT 100`.
 */
function enforceRowLimit(sql: string): string {
  let cleaned = sql.trim().replace(/;+\s*$/, "");
  if (/\blimit\s+\d+\s*(offset\s+\d+\s*)?$/i.test(cleaned)) {
    return cleaned;
  }
  return `${cleaned} LIMIT ${MAX_ROW_LIMIT}`;
}

// Strict read-only SQL validation for ad-hoc SELECT queries
function isSafeReadOnlyQuery(sql: string): boolean {
  const normalized = sql.toLowerCase().trim();

  // Must start with SELECT (or a CTE) — anything else is an outright reject.
  if (!normalized.startsWith("select") && !normalized.startsWith("with ")) {
    return false;
  }

  // Block multi-statement queries up front. SQLite via $queryRawUnsafe will
  // usually reject these already, but better to bounce them at the gate.
  // Allow a single trailing semicolon.
  const withoutTrailing = normalized.replace(/;+\s*$/, "");
  if (withoutTrailing.includes(";")) {
    return false;
  }

  // Mutation/admin verbs. We deliberately omit "transaction"/"commit"/"into"
  // here because they collide with legitimate column names and aliases —
  // the start-with-SELECT + no-semicolons gate is what actually keeps us safe.
  const forbidden = [
    "insert", "update", "delete", "drop", "alter", "create", "replace",
    "truncate", "vacuum", "pragma", "rename", "grant", "revoke",
    "attach", "detach", "load_extension",
  ];

  for (const keyword of forbidden) {
    const regex = new RegExp(`\\b${keyword}\\b`, "i");
    if (regex.test(normalized)) {
      return false;
    }
  }

  return true;
}

// Convert BigInt values returned by SQLite into strings before JSON serialization
function serializeBigInt(obj: any): any {
  return JSON.parse(
    JSON.stringify(obj, (key, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

// Highly operational local fallback rules-based agent for when free-tier Gemini API keys are rate-limited / exhausted (429)
async function callMockAdminAgent(prompt: string): Promise<string> {
  const cleanPrompt = prompt.replace(/^\[Current Context Route: "[^"]*"\]/i, "").trim();
  const norm = cleanPrompt.toLowerCase();
  
  // 1. Create / Add a Todo task fallback
  const hasActionVerb = /\b(create|add|new|make|put|generate|spawn|write|track|setup|set\s+up|file|open|register|save|record|log|post)\b/i.test(norm);
  const hasTaskNoun = /\b(todo|task|to\s+do|to-do|backlog|ticket|item|action\s+item)\b/i.test(norm);
  const isExplicitCreateIntent = (hasActionVerb && hasTaskNoun) || 
                                 norm.startsWith("todo") || 
                                 norm.startsWith("task") || 
                                 norm.startsWith("/todo") || 
                                 norm.startsWith("/task") || 
                                 norm.startsWith("create ");

  if (isExplicitCreateIntent) {
    let title = cleanPrompt;
    let prevTitle = "";
    
    // Stripping loop
    while (title !== prevTitle) {
      prevTitle = title;
      title = title.trim();
      
      // Conversational fillers
      title = title.replace(/^admin\s*[:\-]\s*/i, "");
      title = title.replace(/^hey\s*[,]?\s*/i, "");
      title = title.replace(/^jarvis\s*[,:]?\s*/i, "");
      title = title.replace(/^please\s*[,]?\s*/i, "");
      title = title.replace(/^(?:could|can)\s+you\s+/i, "");
      title = title.replace(/^just\s+/i, "");
      title = title.replace(/^(?:ok|okay)\s*[,]?\s*/i, "");
      
      // Slash commands
      title = title.replace(/^\/(?:todo|task|create)\s+/i, "");

      // Task creation structured prefixes
      const prefixes = [
        /^(?:create|add|make|generate|spawn|setup|open|post)\s+(?:one\s+)?(?:a\s+)?(?:new\s+)?(?:todo|task|to-do|to\s+do|backlog\s+item|ticket|item|action\s+item)(?:\s+(?:todo|task|to-do|to\s+do|backlog\s+item|ticket|item|action\s+item))*\s*(?:to|for|:|:-)?\s*/i,
        /^(?:we\s+need\s+to|we\s+need|need\s+to)\s+(?:create|add|make|generate|spawn|setup|open)\s+(?:a\s+)?(?:new\s+)?(?:todo|task|to-do|to\s+do|backlog\s+item|ticket|item|action\s+item)(?:\s+(?:todo|task|to-do|to\s+do|backlog\s+item|ticket|item|action\s+item))*\s*(?:to|for|:|:-)?\s*/i,
        /^(?:we\s+need\s+a|we\s+need)\s+(?:new\s+)?(?:todo|task|to-do|to\s+do|backlog\s+item|ticket|item|action\s+item)(?:\s+(?:todo|task|to-do|to\s+do|backlog\s+item|ticket|item|action\s+item))*\s*(?:to|for|:|:-)?\s*/i,
        /^(?:todo|task|to-do|to\s+do|backlog|ticket|item)(?:\s+(?:todo|task|to-do|to\s+do|backlog|ticket|item))*\s*(?::|:-)\s*/i,
        /^(?:create|add|make|new|generate|spawn|setup)\s+(?:a\s+)?(?:new\s+)?/i,
        /^(?:we\s+need\s+to|we\s+need|need\s+to)\s+/i
      ];
      
      for (const regex of prefixes) {
        title = title.replace(regex, "");
      }
    }
    
    // Clean up punctuation and spacing
    title = title.replace(/^[^a-zA-Z0-9]+/, "");
    title = title.replace(/\s+/g, " ").trim();
    
    if (title.length > 0) {
      title = title.charAt(0).toUpperCase() + title.slice(1);
    } else {
      title = "Redesign blocks page in admin";
    }

    // Determine category based on context
    let category = "Operations";
    const normTitle = title.toLowerCase();
    if (/\b(design|ui|ux|responsive|glassmorphic|theme|css|color|style|page|view|frontend|component)\b/.test(normTitle)) {
      category = "UI/UX";
    } else if (/\b(db|database|sqlite|prisma|query|table|migration|sql)\b/.test(normTitle)) {
      category = "Database";
    } else if (/\b(auth|login|signup|session|permission|security|token|guard)\b/.test(normTitle)) {
      category = "Security";
    } else if (/\b(ai|copilot|gemma|gemini|rag|agent|model|llm)\b/.test(normTitle)) {
      category = "AI/RAG";
    } else if (/\b(bug|fix|error|broken|crash|fail|anomal)\b/.test(normTitle)) {
      category = "Bug Fix";
    }

    // Determine priority contextually
    let priority = "MEDIUM";
    if (/\b(urgent|critical|high|asap|immediately|now)\b/.test(norm)) {
      priority = "HIGH";
    } else if (/\b(low|minor|optional|backlog)\b/.test(norm)) {
      priority = "LOW";
    }

    try {
      const last = await prisma.adminTodo.findFirst({
        where: { ticketSeq: { not: null } },
        orderBy: { ticketSeq: "desc" },
        select: { ticketSeq: true }
      });
      const seq = (last?.ticketSeq ?? 0) + 1;
      const ticketKey = `IP-${seq}`;

      const newTodo = await prisma.adminTodo.create({
        data: {
          title,
          body: `Automatically created by Jarvis Local Operations RAG Fallback. Originating directive: "${cleanPrompt}"`,
          priority,
          category,
          ticketSeq: seq,
          ticketKey,
          status: "TODO",
          addedByEmail: "jarvis@interviewpad.in",
          acceptanceCriteria: JSON.stringify([
            { text: `Audit and review requirements for "${title}".`, done: false },
            { text: `Implement clean high-performance solution within the codebase.`, done: false },
            { text: `Verify responsiveness, visual accuracy, and compile stability.`, done: false }
          ])
        }
      });

      revalidatePath("/admin/todos");

      return [
        `⚡ **Jarvis Operations Action Dispatched**`,
        `Successfully created operations ticket **${newTodo.ticketKey}** directly inside your SQLite database backlog!`,
        "",
        `• **Title**: *${newTodo.title}*`,
        `• **Key**: \`${newTodo.ticketKey}\``,
        `• **Status**: *${newTodo.status}*`,
        `• **Priority**: \`${newTodo.priority}\``,
        `• **Category**: \`${newTodo.category}\``,
        "",
        "👉 *I have populated dynamic acceptance criteria for this ticket. You can review and prioritize it inside your Admin Todos panel!*"
      ].join("\n");
    } catch (err: any) {
      return `❌ Jarvis Local Error: Failed to write Todo task to SQLite. Details: ${err.message}`;
    }
  }

  // 2. Stalled sessions query fallback
  if (norm.includes("stall")) {
    const staleCutoff = new Date(Date.now() - 6 * 60 * 60 * 1000);
    const sessions = await prisma.interviewSession.findMany({
      where: { status: "in_progress", startedAt: { lt: staleCutoff } }
    });
    if (sessions.length === 0) return "🟢 Jarvis Local Report: No stalled interview sessions detected on the platform.";
    return [
      "⚠️ **Jarvis Local Operations Report: Stalled Interview Sessions**",
      "",
      "The following sessions have been in-progress for over 6 hours with no active submission:",
      ...sessions.map(s => `• **${s.candidateName || "Anonymous"}** | *${s.title}* | Started: ${s.startedAt?.toLocaleString() || "N/A"} | ID: \`${s.id}\``),
      "",
      "👉 *Intervention Recommended: Archive these sessions via the control center to restore credit bounds.*"
    ].join("\n");
  }

  // 3. Proctoring integrity anomalies query fallback
  if (norm.includes("anomal") || norm.includes("suspic") || norm.includes("integrity")) {
    const attempts = await prisma.challengeAttempt.findMany({
      where: { aiSuspicionScore: { gte: 60 } },
      include: { user: true, challenge: true }
    });
    if (attempts.length === 0) return "🟢 Jarvis Local Report: All candidate integrity checks optimal. No suspicious proctoring scores detected.";
    return [
      "🚨 **Jarvis Local Operations Report: Proctoring Anomalies Flagged**",
      "",
      "The following attempts exceeded the 60% suspicion threshold:",
      "",
      "| Candidate | Challenge | Suspicion Score | Date |",
      "| :--- | :--- | :---: | :--- |",
      ...attempts.map(a => `| **${a.user?.name || "Anonymous"}** | ${a.challenge?.title} | \`${a.aiSuspicionScore}%\` | ${a.startedAt.toLocaleDateString()} |`),
      "",
      "👉 *Intervention Recommended: Inspect candidate integrity reports or ban users if plagiarism is confirmed.*"
    ].join("\n");
  }

  // 4. Blog moderation queue query fallback
  if (norm.includes("blog") || norm.includes("moderat") || norm.includes("pending")) {
    const posts = await prisma.blogPost.findMany({
      where: { status: "PENDING" },
      include: { user: true }
    });
    if (posts.length === 0) return "🟢 Jarvis Local Report: Moderation queue clear. No pending blogs awaiting review.";
    return [
      "📝 **Jarvis Local Operations Report: Pending Blog Moderation Queue**",
      "",
      "The following posts are awaiting compliance approval:",
      ...posts.map(p => `• **"${p.title}"** by *${p.user?.name || "Anonymous"}* | Submitted: ${p.createdAt.toLocaleDateString()} | ID: \`${p.id}\``),
      "",
      "👉 *Intervention Recommended: Approve & publish or request changes from the Moderation Inbox.*"
    ].join("\n");
  }

  // 5. Admin Todos backlog query fallback
  if (norm.includes("todo") || norm.includes("backlog") || norm.includes("to do") || norm.includes("task")) {
    const todos = await prisma.adminTodo.findMany({
      where: { status: { not: "DONE" } },
      orderBy: { ticketSeq: "asc" }
    });
    if (todos.length === 0) return "🟢 Jarvis Local Report: Backlog clear. All operations todos are resolved!";
    return [
      "📋 **Jarvis Local Operations Report: Unresolved Backlog Todos**",
      "",
      "Active operations tickets sorted by sequence order:",
      "",
      "| Key | Title | Category | Priority | Status |",
      "| :--- | :--- | :--- | :--- | :--- |",
      ...todos.map(t => `| **${t.ticketKey}** | ${t.title} | ${t.category || "General"} | \`${t.priority}\` | *${t.status}* |`),
      "",
      "👉 *Intervention Recommended: Prioritize these tickets inside the Todos panel.*"
    ].join("\n");
  }

  // 6. Default General Briefing Fallback
  const [totalUsers, bannedUsers, stalledSessions, pendingBlogs, totalTodos] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { banned: true } }),
    prisma.interviewSession.count({
      where: { status: "in_progress", startedAt: { lt: new Date(Date.now() - 6 * 60 * 60 * 1000) } }
    }),
    prisma.blogPost.count({ where: { status: "PENDING" } }),
    prisma.adminTodo.count({ where: { status: { not: "DONE" } } })
  ]);

  return [
    "⚡ **Jarvis Local Operations Officer (RAG Fallback Engine)**",
    "",
    "Direct SQLite telemetry links active. I have successfully audited current platform indicators:",
    `• 👥 **Total Users**: ${totalUsers} registrados (*${bannedUsers} banned*)`,
    `• ⏳ **Stalled Sessions**: \`${stalledSessions}\` stuck &gt; 6 hours`,
    `• 📝 **Pending Moderations**: \`${pendingBlogs}\` blogs in queue`,
    `• 📋 **Active Backlog**: \`${totalTodos}\` unresolved tickets`,
    "",
    "Ask me to query **stalled sessions**, **proctoring anomalies**, **pending blogs**, or **backlog todos** and I will pull real-time database details for you!"
  ].join("\n");
}

/**
 * The set of action types Gemma is allowed to propose via `propose_action`.
 * Mirror this list in GemmaConsole.tsx — the UI maps each type to a one-click
 * approval button, so adding a new type here without a corresponding UI
 * handler will leave admins with a proposal they can't approve.
 */
const PROPOSABLE_ACTION_TYPES = [
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
type ProposableActionType = typeof PROPOSABLE_ACTION_TYPES[number];

const VALID_ALERT_TYPES = new Set([
  "INTEGRITY", "MODERATION", "SYSTEM_STALL", "SECURITY", "BACKLOG", "SPAM", "GROWTH",
]);
const VALID_ALERT_SEVERITIES = new Set(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

// System grounding instructions providing table layouts for SQLite-compliant generation
const SYSTEM_INSTRUCTION = `You are "Gemma Admin Copilot", the internal AI Operations Officer and Database Telemetry Assistant for the Interviewpad developer platform.
You are running in a secure administrative portal. You have direct read-only SQL capabilities, a fast-path stats tool, and the ability to propose human-in-the-loop interventions across every admin surface.

Database Schema reference:
1. User: id (PK), name, email, banned (BOOLEAN), userType ("candidate"|"recruiter"|null), createdAt
2. BlogPost: id (PK), slug, title, status ("DRAFT"|"PENDING"|"PUBLISHED"|"REJECTED"|"NEEDS_CHANGES"), featured (BOOLEAN), viewCount, userId, createdAt
3. BlogComment: id (PK), postId, userId, content, parentId, createdAt
4. Challenge: id (PK), slug, title, difficulty ("easy"|"medium"|"hard"), published (BOOLEAN), featured (BOOLEAN), authorId, createdAt
5. ChallengeAttempt: id (PK), userId, challengeId, status ("in_progress"|"passed"|"failed"|"abandoned"), durationSec, startedAt, finishedAt, score, aiSuspicionScore (FLOAT 0..100)
6. InterviewSession: id (PK), userId, title, candidateName, status ("scheduled"|"in_progress"|"completed"|"abandoned"), totalSec, startedAt, finishedAt, shortCode, createdAt
7. AdminTodo: id (PK), ticketKey ("IP-1"), ticketSeq, title, body, status ("BACKLOG"|"TODO"|"IN_PROGRESS"|"DONE"), priority ("LOW"|"MEDIUM"|"HIGH"), category, addedByEmail, createdAt
8. Candidate: id (PK), workspaceId, name, email, status ("active"|"hired"|"rejected"|"archived"), source, tags, notes, createdAt
9. CandidateIntegrityReport: id (PK), attemptId, suspicionScore, totalBlurSec, blurCount, pasteCount, pasteDetails (JSON), createdAt
10. GemmaAlert: id (PK), type, title, body, severity, status ("UNRESOLVED"|"DISMISSED"|"RESOLVED"), proposedAction (JSON), targetId, createdAt
11. McpAuditLog: id (PK), workspaceId, kind, name, argsJson, resultSummary, durationMs, createdAt

Your tool catalog:
- run_read_only_query(sql): execute an arbitrary SELECT/WITH query. Auto-capped at 100 rows. Use when no scoped tool fits.
- get_platform_stats(): atomic dashboard snapshot — user/blog/session/todo counts. No PII. Prefer this over ad-hoc COUNT(*) queries.
- summarize_user(userId): bounded profile of one user — attempts, blog/comment counts, ban status. Use before proposing BAN_USER / UNBAN_USER.
- list_recent_signups(hours): users created in the last N hours (cap 200). Use for "who joined today?" style asks.
- create_admin_todo(title, body?, priority?, category?): direct write — creates an AdminTodo ticket. Use only when admin explicitly asks to file/track work.
- propose_action(actionType, targetId, title, body, severity, type, meta?): file a HITL proposal in the GemmaAlert table. Admin sees a one-click approval card. Use this whenever you spot work that needs a write but the admin hasn't yet asked you to perform it.

When to use propose_action vs. just answer:
- The admin asks an open question ("any spam comments today?") → run a query, summarize the findings, AND propose deletions for the worst offenders via propose_action.
- The admin asks "should I publish challenge X?" → don't propose. Answer with your recommendation and let them click.
- You spot something the admin should fix without being asked ("this user has 14 spam comments") → propose_action immediately.

Allowed propose_action.actionType values: ${PROPOSABLE_ACTION_TYPES.join(", ")}.
Allowed severity: LOW | MEDIUM | HIGH | CRITICAL.
Allowed type (alert classification): INTEGRITY | MODERATION | SYSTEM_STALL | SECURITY | BACKLOG | SPAM | GROWTH.

For UPDATE_TODO_STATUS, include meta = { newStatus: "TODO" | "IN_PROGRESS" | "DONE" | "BACKLOG" }.
For BULK_ARCHIVE_SESSIONS, targetId can be the literal string "bulk" — the action operates on the live set of stale sessions at approval time.

CRITICAL: When the admin asks you to create a backlog item, call create_admin_todo directly — do not just describe what you'd do.

Formatting:
1. Operational tone — concise, no fluff.
2. Tables and counts in clean markdown.
3. After any propose_action call, say one line confirming "Proposed for your review in the Intervention Control Center."
4. Explain your SQL briefly before executing.
5. Never expose raw email addresses to the admin unless explicitly asked — prefer name + truncated id.`;

// Gemini tools catalog definition
const TOOLS = {
  functionDeclarations: [
    {
      name: "run_read_only_query",
      description: "Execute a read-only SQL SELECT/WITH query on the SQLite database. Auto-capped at 100 rows. Use only when no scoped tool fits.",
      parameters: {
        type: "OBJECT",
        properties: {
          sql: {
            type: "STRING",
            description: "SQLite-compliant SELECT (or CTE) query. Example: 'SELECT COUNT(*) FROM User WHERE banned = 1'"
          }
        },
        required: ["sql"]
      }
    },
    {
      name: "get_platform_stats",
      description: "Atomic snapshot of platform health: total/banned users, blog statuses, session statuses, todo backlog. No PII. Cheaper than running multiple COUNT queries.",
      parameters: { type: "OBJECT", properties: {} }
    },
    {
      name: "summarize_user",
      description: "Fast bounded profile of a single user: name, ban status, signup, attempt count, comment count, blog count. Use before proposing BAN_USER or UNBAN_USER to gather context.",
      parameters: {
        type: "OBJECT",
        properties: {
          userId: { type: "STRING", description: "The User.id to summarize." }
        },
        required: ["userId"]
      }
    },
    {
      name: "list_recent_signups",
      description: "Users created in the last N hours (1..168). Returns name + truncated id + signup time. Up to 200 rows.",
      parameters: {
        type: "OBJECT",
        properties: {
          hours: { type: "NUMBER", description: "How far back to look. Defaults to 24." }
        }
      }
    },
    {
      name: "create_admin_todo",
      description: "Create a new prioritized AdminTodo ticket. Use only when the admin explicitly asks to file/track work.",
      parameters: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING", description: "Concise title. Example: 'Redesign blocks page in admin'" },
          body: { type: "STRING", description: "Detailed description, requirements, next steps." },
          priority: { type: "STRING", enum: ["LOW", "MEDIUM", "HIGH"], description: "Default 'MEDIUM'." },
          category: { type: "STRING", description: "Category tag (UI, AI, MCP, etc.). Default 'General'." }
        },
        required: ["title"]
      }
    },
    {
      name: "propose_action",
      description: "File a Human-in-the-Loop intervention proposal. Creates a GemmaAlert with a proposedAction payload — the admin sees a one-click approval card in the Intervention Control Center. Use this whenever you spot something that needs a write but the admin hasn't directly asked for it.",
      parameters: {
        type: "OBJECT",
        properties: {
          actionType: {
            type: "STRING",
            enum: [...PROPOSABLE_ACTION_TYPES],
            description: "Which HITL action to propose."
          },
          targetId: { type: "STRING", description: "Primary entity id (userId / postId / commentId / challengeId / sessionId / todoId). For BULK_ARCHIVE_SESSIONS pass 'bulk'." },
          title: { type: "STRING", description: "Short title shown on the proposal card." },
          body: { type: "STRING", description: "Why you're proposing this — context the admin needs to decide." },
          severity: { type: "STRING", enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"], description: "Defaults to MEDIUM." },
          type: { type: "STRING", enum: ["INTEGRITY", "MODERATION", "SYSTEM_STALL", "SECURITY", "BACKLOG", "SPAM", "GROWTH"], description: "Alert classification — drives icon color & filtering. Defaults to MODERATION." },
          meta: {
            type: "OBJECT",
            description: "Action-specific extras. For UPDATE_TODO_STATUS include { newStatus: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'BACKLOG' }."
          }
        },
        required: ["actionType", "targetId", "title", "body"]
      }
    }
  ]
};

/**
 * Truncate a cuid-style id so we can surface it without leaking the full
 * value into the chat transcript. The full id stays in the audit trail.
 */
function truncId(id: string): string {
  if (id.length <= 10) return id;
  return `${id.slice(0, 4)}…${id.slice(-4)}`;
}

/**
 * Fire-and-forget audit log writer. Records every Gemma tool invocation
 * (read query, todo creation) so we have full forensic coverage even on
 * read-only RAG calls. Failure to log must never break the user request,
 * so we swallow errors and just console-log them.
 */
async function recordToolAudit(opts: {
  workspaceId: string;
  toolName: string;
  args: unknown;
  resultSummary: string;
  durationMs: number;
  errorCode?: string;
  adminEmail: string;
  model: string;
}) {
  try {
    await prisma.mcpAuditLog.create({
      data: {
        workspaceId: opts.workspaceId,
        kind: "GEMMA_TOOL_CALL",
        name: opts.toolName,
        argsJson: JSON.stringify({ ...((opts.args as object) ?? {}), invokedBy: opts.adminEmail, model: opts.model }),
        resultSummary: opts.resultSummary.slice(0, 500),
        errorCode: opts.errorCode,
        durationMs: opts.durationMs,
      },
    });
  } catch (err) {
    console.error("[Copilot Audit] Failed to write audit row:", err);
  }
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate Admin Session
    const session = await auth().catch(() => null);
    if (!isAdmin(session)) {
      return NextResponse.json({ error: "Unauthorized: Admin privileges required." }, { status: 401 });
    }
    const adminEmail = session?.user?.email || "admin@interviewpad.in";

    const body = await req.json();
    const { prompt, history = [], image, model: requestedModel } = body;
    if (!prompt) {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    const activeModel = resolveModel(requestedModel);

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Gemini/Gemma API key is not configured on the server." }, { status: 500 });
    }

    const systemWorkspaceId = await ensureSystemAdminWorkspace();

    // Build standard contents history
    // Convert history format to Gemini API format
    const contents: any[] = history.map((turn: any) => ({
      role: turn.role === "assistant" ? "model" : "user",
      parts: [{ text: turn.text }]
    }));

    // Add current user prompt (supporting multimodal image part)
    const userParts: any[] = [{ text: prompt }];
    if (image && image.data && image.mimeType) {
      userParts.push({
        inlineData: {
          mimeType: image.mimeType,
          data: image.data
        }
      });
    }

    contents.push({
      role: "user",
      parts: userParts
    });

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${apiKey}`;

    let responseText = "";
    
    try {
      let loopCount = 0;
      // Bumped from 5 — the v2 tool catalog is larger, so chained
      // "stats → query → propose → confirm" round-trips need more headroom.
      const maxLoops = 8;

      // Agent loop to resolve dynamic DB tool calls
      while (loopCount < maxLoops) {
        loopCount++;
        
        const payload = {
          contents,
          systemInstruction: {
            parts: [{ text: SYSTEM_INSTRUCTION }]
          },
          tools: [TOOLS],
          generationConfig: {
            maxOutputTokens: 2000,
            temperature: 0.2
          }
        };

        const res = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const errText = await res.text();
          console.error("Gemini Copilot API error:", errText);
          throw new Error(`Gemini API error: ${res.status}`);
        }

        const data = await res.json();
        const firstCandidate = data.candidates?.[0];
        const part = firstCandidate?.content?.parts?.[0];

        // Check if the model wants to call a function/tool
        if (part?.functionCall) {
          const { name, args } = part.functionCall;
          
          // Tool 1: Raw SELECT DB query execution
          if (name === "run_read_only_query") {
            const rawSql = args.sql;
            let queryResult: any;
            let errorCode: string | undefined;
            let summary = "";
            const startedAt = Date.now();
            let executedSql: string | null = null;

            if (!isSafeReadOnlyQuery(rawSql)) {
              queryResult = { error: "Security Exception: Only single-statement SELECT/WITH queries are permitted." };
              errorCode = "SAFETY_REJECTED";
              summary = "Rejected: non-SELECT or multi-statement.";
            } else {
              executedSql = enforceRowLimit(rawSql);
              try {
                const raw = await prisma.$queryRawUnsafe(executedSql);
                queryResult = serializeBigInt(raw);
                const rowCount = Array.isArray(queryResult) ? queryResult.length : 1;
                summary = `OK — ${rowCount} row(s) returned. SQL: ${executedSql.slice(0, 180)}`;
              } catch (err: any) {
                console.error("SQL Exec failure:", err);
                queryResult = { error: `SQLite syntax/execution error: ${err.message}` };
                errorCode = "SQL_ERROR";
                summary = `Failed: ${err.message}`.slice(0, 200);
              }
            }

            await recordToolAudit({
              workspaceId: systemWorkspaceId,
              toolName: "run_read_only_query",
              args: { sql: rawSql, executedSql, maxRows: MAX_ROW_LIMIT },
              resultSummary: summary,
              durationMs: Date.now() - startedAt,
              errorCode,
              adminEmail,
              model: activeModel,
            });

            contents.push({
              role: "model",
              parts: [{ functionCall: part.functionCall }]
            });

            contents.push({
              role: "user",
              parts: [{
                functionResponse: {
                  name: "run_read_only_query",
                  response: { result: queryResult }
                }
              }]
            });

            continue;
          }

          // Tool 2: Agentic Admin Todo task creation
          if (name === "create_admin_todo") {
            const { title, body: desc, priority = "MEDIUM", category = "General" } = args;
            let todoResult: any;
            let errorCode: string | undefined;
            const startedAt = Date.now();

            try {
              todoResult = await prisma.$transaction(async (tx) => {
                const last = await tx.adminTodo.findFirst({
                  where: { ticketSeq: { not: null } },
                  orderBy: { ticketSeq: "desc" },
                  select: { ticketSeq: true }
                });
                const seq = (last?.ticketSeq ?? 0) + 1;
                const ticketKey = `IP-${seq}`;

                return await tx.adminTodo.create({
                  data: {
                    title: title.trim(),
                    body: desc ? desc.trim() : `Created via agentic Jarvis operations copilot tool call.`,
                    priority,
                    category: category.trim(),
                    addedByEmail: "jarvis@interviewpad.in",
                    ticketSeq: seq,
                    ticketKey,
                    status: "TODO",
                    acceptanceCriteria: JSON.stringify([
                      { text: "Implement core task specifications outlined in description.", done: false },
                      { text: "Verify code compile, visual accuracy, and responsive bounds.", done: false }
                    ])
                  }
                });
              });

              revalidatePath("/admin/todos");
            } catch (err: any) {
              console.error("Prisma todo creation failure:", err);
              todoResult = { error: `Prisma task creation error: ${err.message}` };
              errorCode = "TODO_WRITE_FAILED";
            }

            await recordToolAudit({
              workspaceId: systemWorkspaceId,
              toolName: "create_admin_todo",
              args: { title, priority, category },
              resultSummary: errorCode
                ? `Failed: ${todoResult?.error ?? "unknown"}`
                : `Created todo ${todoResult?.ticketKey ?? "(unknown key)"} — "${title}".`,
              durationMs: Date.now() - startedAt,
              errorCode,
              adminEmail,
              model: activeModel,
            });

            contents.push({
              role: "model",
              parts: [{ functionCall: part.functionCall }]
            });

            contents.push({
              role: "user",
              parts: [{
                functionResponse: {
                  name: "create_admin_todo",
                  response: { result: todoResult }
                }
              }]
            });

            continue;
          }

          // Tool 3: Platform stats snapshot (PII-free)
          if (name === "get_platform_stats") {
            const startedAt = Date.now();
            let result: any;
            let errorCode: string | undefined;
            try {
              const [
                totalUsers, bannedUsers,
                pendingBlogs, publishedBlogs, draftBlogs,
                inProgressSessions, completedSessions,
                publishedChallenges, unpublishedChallenges,
                backlogTodos, todoTodos, inProgressTodos, doneTodos,
                unresolvedAlerts,
              ] = await Promise.all([
                prisma.user.count(),
                prisma.user.count({ where: { banned: true } }),
                prisma.blogPost.count({ where: { status: "PENDING" } }),
                prisma.blogPost.count({ where: { status: "PUBLISHED" } }),
                prisma.blogPost.count({ where: { status: "DRAFT" } }),
                prisma.interviewSession.count({ where: { status: "in_progress" } }),
                prisma.interviewSession.count({ where: { status: "completed" } }),
                prisma.challenge.count({ where: { published: true } }),
                prisma.challenge.count({ where: { published: false } }),
                prisma.adminTodo.count({ where: { status: "BACKLOG" } }),
                prisma.adminTodo.count({ where: { status: "TODO" } }),
                prisma.adminTodo.count({ where: { status: "IN_PROGRESS" } }),
                prisma.adminTodo.count({ where: { status: "DONE" } }),
                prisma.gemmaAlert.count({ where: { status: "UNRESOLVED" } }),
              ]);
              result = {
                users: { total: totalUsers, banned: bannedUsers },
                blogs: { pending: pendingBlogs, published: publishedBlogs, draft: draftBlogs },
                sessions: { in_progress: inProgressSessions, completed: completedSessions },
                challenges: { published: publishedChallenges, unpublished: unpublishedChallenges },
                todos: { backlog: backlogTodos, todo: todoTodos, in_progress: inProgressTodos, done: doneTodos },
                alerts: { unresolved: unresolvedAlerts },
              };
            } catch (err: any) {
              result = { error: err.message };
              errorCode = "STATS_FAILED";
            }

            await recordToolAudit({
              workspaceId: systemWorkspaceId,
              toolName: "get_platform_stats",
              args: {},
              resultSummary: errorCode ? `Failed: ${result.error}` : "OK — platform stats snapshot returned.",
              durationMs: Date.now() - startedAt,
              errorCode,
              adminEmail,
              model: activeModel,
            });

            contents.push({ role: "model", parts: [{ functionCall: part.functionCall }] });
            contents.push({
              role: "user",
              parts: [{ functionResponse: { name: "get_platform_stats", response: { result } } }],
            });
            continue;
          }

          // Tool 4: Summarize a single user (bounded, no email leak unless asked)
          if (name === "summarize_user") {
            const userId = String(args.userId ?? "").trim();
            const startedAt = Date.now();
            let result: any;
            let errorCode: string | undefined;
            try {
              const user = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                  id: true, name: true, banned: true, userType: true,
                  createdAt: true,
                  _count: { select: { attempts: true, blogComments: true, blogs: true } },
                },
              });
              if (!user) {
                result = { error: "User not found." };
                errorCode = "NOT_FOUND";
              } else {
                result = {
                  id: user.id,
                  idShort: truncId(user.id),
                  name: user.name,
                  banned: user.banned,
                  userType: user.userType,
                  joined: user.createdAt.toISOString(),
                  counts: user._count,
                };
              }
            } catch (err: any) {
              result = { error: err.message };
              errorCode = "SUMMARY_FAILED";
            }

            await recordToolAudit({
              workspaceId: systemWorkspaceId,
              toolName: "summarize_user",
              args: { userId },
              resultSummary: errorCode ? `Failed: ${result.error}` : `OK — summarized user ${truncId(userId)}.`,
              durationMs: Date.now() - startedAt,
              errorCode,
              adminEmail,
              model: activeModel,
            });

            contents.push({ role: "model", parts: [{ functionCall: part.functionCall }] });
            contents.push({
              role: "user",
              parts: [{ functionResponse: { name: "summarize_user", response: { result } } }],
            });
            continue;
          }

          // Tool 5: Recent signups
          if (name === "list_recent_signups") {
            const hours = Math.max(1, Math.min(168, Number(args.hours ?? 24)));
            const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
            const startedAt = Date.now();
            let result: any;
            let errorCode: string | undefined;
            try {
              const rows = await prisma.user.findMany({
                where: { createdAt: { gte: cutoff } },
                select: { id: true, name: true, userType: true, banned: true, createdAt: true },
                orderBy: { createdAt: "desc" },
                take: 200,
              });
              result = rows.map((u) => ({
                id: u.id,
                idShort: truncId(u.id),
                name: u.name,
                userType: u.userType,
                banned: u.banned,
                joined: u.createdAt.toISOString(),
              }));
            } catch (err: any) {
              result = { error: err.message };
              errorCode = "SIGNUPS_FAILED";
            }

            await recordToolAudit({
              workspaceId: systemWorkspaceId,
              toolName: "list_recent_signups",
              args: { hours },
              resultSummary: errorCode
                ? `Failed: ${result.error}`
                : `OK — ${Array.isArray(result) ? result.length : 0} signups in last ${hours}h.`,
              durationMs: Date.now() - startedAt,
              errorCode,
              adminEmail,
              model: activeModel,
            });

            contents.push({ role: "model", parts: [{ functionCall: part.functionCall }] });
            contents.push({
              role: "user",
              parts: [{ functionResponse: { name: "list_recent_signups", response: { result } } }],
            });
            continue;
          }

          // Tool 6: Propose a HITL action (creates a GemmaAlert directly)
          if (name === "propose_action") {
            const startedAt = Date.now();
            let result: any;
            let errorCode: string | undefined;
            try {
              const actionType = String(args.actionType ?? "");
              if (!PROPOSABLE_ACTION_TYPES.includes(actionType as ProposableActionType)) {
                throw new Error(`Unsupported actionType: ${actionType}`);
              }
              const alertType = String(args.type ?? "MODERATION");
              if (!VALID_ALERT_TYPES.has(alertType)) {
                throw new Error(`Unsupported alert type: ${alertType}`);
              }
              const severity = String(args.severity ?? "MEDIUM");
              if (!VALID_ALERT_SEVERITIES.has(severity)) {
                throw new Error(`Unsupported severity: ${severity}`);
              }

              const alert = await prisma.gemmaAlert.create({
                data: {
                  type: alertType,
                  title: String(args.title ?? "Proposed action").slice(0, 200),
                  body: String(args.body ?? ""),
                  severity,
                  status: "UNRESOLVED",
                  targetId: String(args.targetId ?? ""),
                  proposedAction: JSON.stringify({
                    actionType,
                    targetId: String(args.targetId ?? ""),
                    meta: args.meta ?? null,
                  }),
                },
              });
              revalidatePath("/admin/copilot");
              result = { id: alert.id, actionType, severity, type: alertType };
            } catch (err: any) {
              result = { error: err.message };
              errorCode = "PROPOSE_FAILED";
            }

            await recordToolAudit({
              workspaceId: systemWorkspaceId,
              toolName: "propose_action",
              args: {
                actionType: args.actionType,
                targetId: args.targetId,
                severity: args.severity,
                type: args.type,
              },
              resultSummary: errorCode
                ? `Failed: ${result.error}`
                : `OK — filed proposal ${result.id} (${result.actionType}).`,
              durationMs: Date.now() - startedAt,
              errorCode,
              adminEmail,
              model: activeModel,
            });

            contents.push({ role: "model", parts: [{ functionCall: part.functionCall }] });
            contents.push({
              role: "user",
              parts: [{ functionResponse: { name: "propose_action", response: { result } } }],
            });
            continue;
          }
        }

        // If no function call, capture the text output and break
        responseText = part?.text || "Empty response received.";
        break;
      }
    } catch (error: any) {
      console.warn(`[Copilot API] ${activeModel} rate limit (429) or outage (503) triggered. Engaging local SQLite RAG fallback planner:`, error);
      responseText = await callMockAdminAgent(prompt);
    }

    return NextResponse.json({ text: responseText, model: activeModel });
  } catch (error: any) {
    console.error("Copilot backend route error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
