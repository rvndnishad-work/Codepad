/**
 * Mint IP-34's deferred-item tickets BEFORE coding (per audit policy).
 * Write FOLLOWS_FROM + BLOCKS edges so the lineage is queryable.
 */
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const TARGET = "P1 Release Target: Jun 2026.";

const tickets = [
  {
    title:
      "Auto-stage-transition Candidate on workflow events (submit → TAKE_HOME, schedule → ONSITE, verdict=success → OFFER)",
    priority: "MEDIUM",
    category: "Recruiter",
    body:
      "IP-34 ships the CRM Kanban with manual stage transitions and auto-create on dispatch. This follow-up adds AUTOMATIC stage moves driven by real workflow events: candidate submits a take-home → stage = TAKE_HOME (if not already past it), interview scheduled with type=live → stage = ONSITE, verdict='success' on a session → stage = OFFER. Recruiters can still manually override. Without this, the recruiter has to hand-curate every transition — which means in practice the Kanban grows stale and people don't trust it.",
    acceptance: [
      "Hook fires from take-home SUBMITTED transition → Candidate.stage advances if currently before TAKE_HOME",
      "Hook fires from interview scheduled (type=live) → stage advances to ONSITE if currently before",
      "Hook fires from interview verdict='success' → stage advances to OFFER",
      "Transitions are monotonic forward (don't auto-regress a candidate)",
      "Manual override (via stage dropdown) always wins; auto-transitions log to workspace audit",
    ],
    ownerNotes:
      "Critical follow-up — without this, the Kanban requires manual upkeep that recruiters won't do consistently. " +
      TARGET,
    followsFrom: "IP-34",
  },
  {
    title:
      "Notify candidate on stage change (e.g. 'You advanced to Onsite')",
    priority: "LOW",
    category: "Candidate",
    body:
      "Once IP-34 + IP-69 are wired, candidates have a real notion of 'I moved from Take-home to Onsite'. Fire a Notification (via IP-40 createNotification, type CANDIDATE_STAGE_ADVANCED) to the candidate when their stage advances. Only fires forward-moving transitions (no 'You moved to Rejected' — that's its own UX). Bell + email-when-ready.",
    acceptance: [
      "New NOTIFICATION_TYPES.CANDIDATE_STAGE_ADVANCED",
      "Fires only on forward transitions, not on REJECT/WITHDRAW",
      "Body: 'You advanced to {stage} for {workspace.name}'",
      "Per-type preference (IP-47) honored",
    ],
    ownerNotes:
      "Lights up the candidate experience side of the CRM. Depends on IP-69 for auto-transitions. " +
      TARGET,
    followsFrom: "IP-34",
    blockedBy: "IP-69",
  },
  {
    title:
      "Auto-create Candidate row when scheduling a live InterviewSession (depends on IP-56 candidateEmail)",
    priority: "MEDIUM",
    category: "Recruiter",
    body:
      "IP-34 MVP auto-creates Candidate rows when a take-home is dispatched and when an AI interview is created — both already capture candidateEmail. Interview sessions DON'T capture candidateEmail today (IP-56 tracks adding it). Once IP-56 lands, wire the same upsert pattern into /api/interview create so scheduling a live session also seeds the CRM. Without this, sessions remain orphan from the CRM Kanban.",
    acceptance: [
      "Wait for IP-56 to add InterviewSession.candidateEmail",
      "/api/interview create upserts Candidate by (workspaceId, candidateEmail)",
      "Returned Candidate.id stored on InterviewSession.candidateId",
      "Verified end-to-end: schedule live session → candidate appears in CRM at stage SCREENED",
    ],
    ownerNotes: "Blocked by IP-56. " + TARGET,
    followsFrom: "IP-34",
    blockedBy: "IP-56",
  },
];

(async () => {
  const prisma = new PrismaClient();
  try {
    const created = [];
    for (const t of tickets) {
      const { row } = await prisma.$transaction(async (tx) => {
        const last = await tx.adminTodo.findFirst({
          where: { ticketSeq: { not: null } },
          orderBy: { ticketSeq: "desc" },
          select: { ticketSeq: true },
        });
        const nextSeq = (last?.ticketSeq ?? 0) + 1;
        const row = await tx.adminTodo.create({
          data: {
            title: t.title,
            body: t.body,
            priority: t.priority,
            category: t.category,
            status: "BACKLOG",
            addedByEmail: "claude-code (IP-34 deferral mint per audit policy)",
            ticketSeq: nextSeq,
            ticketKey: `IP-${nextSeq}`,
            acceptanceCriteria: JSON.stringify(
              t.acceptance.map((text) => ({ text, done: false })),
            ),
            ownerNotes: t.ownerNotes,
          },
        });
        return { row };
      });
      created.push(row);

      const parent = await prisma.adminTodo.findUnique({
        where: { ticketKey: t.followsFrom },
        select: { id: true },
      });
      if (parent) {
        await prisma.adminTodoDependency.create({
          data: { fromId: row.id, toId: parent.id, type: "FOLLOWS_FROM" },
        });
      }
      if (t.blockedBy) {
        const blocker = await prisma.adminTodo.findUnique({
          where: { ticketKey: t.blockedBy },
          select: { id: true },
        });
        if (blocker) {
          await prisma.adminTodoDependency.create({
            data: { fromId: blocker.id, toId: row.id, type: "BLOCKS" },
          });
        }
      }
    }
    console.log(JSON.stringify(
      created.map((r) => ({ key: r.ticketKey, pri: r.priority, title: r.title.slice(0, 90) })),
      null, 2,
    ));
  } finally {
    await prisma.$disconnect();
  }
})();
