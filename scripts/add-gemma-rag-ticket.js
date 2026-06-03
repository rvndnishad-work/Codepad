const { PrismaClient } = require("@prisma/client");

const TICKET = {
  title: "Implement Gemma RAG Platform Monitor & Admin Operations Copilot",
  body: [
    "To help administrators manage the platform more efficiently, integrate Google's Gemma model (free/lightweight for developer version) with RAG database query capabilities to monitor the platform as a whole.",
    "",
    "The copilot will monitor candidate proctoring alerts, content moderation queues, and stalled interview sessions, notify the admin to take action, auto-create AdminTodos, or perform operations on the admin's behalf (Human-in-the-Loop) upon explicit approval.",
    "",
    "Note: During live candidate screenings/interviews, we will utilize advanced Gemini Pro-powered agents (credit-based). However, the developer version and internal admin tools will utilize the lightweight Gemma model for real-time app telemetry monitoring."
  ].join("\n"),
  priority: "HIGH",
  category: "AI",
  acceptanceCriteria: [
    { text: "Extend database schema with a GemmaAlert model to store system health and anomaly detections", done: false },
    { text: "Create an interactive, premium Gemma Command Center UI at /admin/copilot with dark-mode glassmorphic aesthetics", done: false },
    { text: "Implement secure read-only Database RAG capability, enabling Gemma to run safe Prisma queries to answer questions about platform stats, cohort behavior, and audit logs", done: false },
    { text: "Establish a strict Human-in-the-Loop (HITL) protocol where Gemma proposes actions (e.g. BAN_USER, ARCHIVE_SESSION, APPROVE_BLOG) but requires active admin approval via signed Server Actions", done: false },
    { text: "Set up a background telemetry scanner (cron/worker) that runs hourly to scan for stalled sessions (>6 hours), proctoring integrity anomalies, and pending blog reviews", done: false },
    { text: "Build a developer-version toggle allowing local/free Gemma execution while keeping production live interviews credit-based with Gemini Pro", done: false }
  ],
  ownerNotes: [
    "Database Safety: Do not let the model generate dynamic writes. Leverage the read-only schema views or use strict Prisma query wrappers. Ensure no PII is leaked.",
    "",
    "Audit Trail: Every recommended action proposed by Gemma, and every single execution approved by the admin, must be logged in the McpAuditLog for forensics.",
    "",
    "UI placement: Add a dedicated navigation link for 'Gemma Copilot' under the 'System' section in the AdminSidebar, styled with lucide Sparkles or Brain icons."
  ].join("\n"),
};

(async () => {
  const p = new PrismaClient();
  try {
    const result = await p.$transaction(async (tx) => {
      const last = await tx.adminTodo.findFirst({
        where: { ticketSeq: { not: null } },
        orderBy: { ticketSeq: "desc" },
        select: { ticketSeq: true },
      });
      const seq = (last?.ticketSeq ?? 0) + 1;
      const key = `IP-${seq}`;
      const row = await tx.adminTodo.create({
        data: {
          title: TICKET.title,
          body: TICKET.body,
          priority: TICKET.priority,
          category: TICKET.category,
          ticketSeq: seq,
          ticketKey: key,
          acceptanceCriteria: JSON.stringify(TICKET.acceptanceCriteria),
          ownerNotes: TICKET.ownerNotes,
        },
      });
      return { key, id: row.id };
    });
    console.log(`Successfully created ${result.key} — ${TICKET.title}`);
  } finally {
    await p.$disconnect();
  }
})();
