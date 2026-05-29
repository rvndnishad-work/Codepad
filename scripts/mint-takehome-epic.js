/**
 * Mint the multi-question take-home epic + 3 phase tickets (2026-05-29).
 * Approved design: take-home = async tokenized InterviewSession; builder curates
 * questions + selects candidates independently; replaces the single-challenge
 * flow. Per-question timer; all three source types.
 */
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const tickets = [
  {
    key: "EPIC",
    title: "EPIC: Multi-question take-home builder (async, session-backed)",
    priority: "HIGH",
    category: "Recruiter",
    body:
      "Replace the single-challenge take-home with a builder that curates a set of questions (DSA + prompt + playground) and assigns to selected candidates independently — backed by async, tokenized InterviewSessions. Per-question timer; DSA auto-graded, prompt AI-graded, playground manually reviewed. Ships in 3 phases (P1 builder+runner, P2 surfaces, P3 migrate/retire). See plan: multi-question take-home builder.",
    acceptance: [
      "Recruiter curates multi-source question set + selects candidates independently",
      "Each candidate gets an async tokenized session with a per-question timer + deadline",
      "Replaces the single-challenge take-home flow (legacy migrated/retired in P3)",
    ],
  },
  {
    key: "P1",
    title: "Take-home builder Phase 1 — schema + builder UI + async candidate runner",
    priority: "HIGH",
    category: "Recruiter",
    body:
      "InterviewSession gains take-home mode (type='take-home', candidateAccessToken, deadlineAt, reminderSentAt, questionTimeLimitsJson). New /w/[slug]/take-homes/new builder (reuse arena curation + bulk recipient picker + 'Select all'). New server action bulkCreateTakeHomeSessions → N sessions + batch invite emails. New async runner /take-home/s/[token]: lobby + per-question checklist, per-question timer, deadline gating, auto/AI grading, playground manual. Legacy flow untouched in P1.",
    acceptance: [
      "InterviewSession schema extended for take-home mode",
      "Builder: curate DSA/prompt/playground with per-question limits + select candidates (incl. Select-all) + deadline",
      "bulkCreateTakeHomeSessions creates one session per candidate + sends batch invite emails",
      "Async runner walks questions one-by-one, per-question timer + auto-submit, deadline-gated",
      "DSA auto-graded + prompt AI-graded on submit; playground left for manual review",
      "Verified end-to-end: build → 3 sessions + emails → candidate completes → recruiter reviews",
    ],
  },
  {
    key: "P2",
    title: "Take-home builder Phase 2 — make it the primary workspace path",
    priority: "MEDIUM",
    category: "Recruiter",
    body:
      "Assessments take-homes tab lists type='take-home' sessions; single-invite form + 'Send to many' route to the builder; reminder cron queries sessions; recruiter review uses the session view.",
    acceptance: [
      "Assessments take-homes tab lists take-home sessions",
      "All take-home creation entry points route to the builder",
      "Reminder cron operates on take-home sessions",
    ],
  },
  {
    key: "P3",
    title: "Take-home builder Phase 3 — migrate legacy + retire TakeHomeAssignment",
    priority: "MEDIUM",
    category: "Recruiter",
    body:
      "Migrate existing TakeHomeAssignment rows to single-question take-home sessions; redirect legacy /take-home/[token] to the session runner; leaderboard reads sessions; remove the single-challenge form/runner and the TakeHomeAssignment model once unreferenced.",
    acceptance: [
      "Existing TakeHomeAssignment data migrated to sessions",
      "Legacy /take-home/[token] redirects to the session runner",
      "Single-challenge form/runner + TakeHomeAssignment model removed",
    ],
  },
];

(async () => {
  const p = new PrismaClient();
  try {
    const keyToId = {};
    for (const t of tickets) {
      const last = await p.adminTodo.findFirst({
        where: { ticketSeq: { not: null } },
        orderBy: { ticketSeq: "desc" },
        select: { ticketSeq: true },
      });
      const seq = (last?.ticketSeq ?? 0) + 1;
      const row = await p.adminTodo.create({
        data: {
          title: t.title,
          body: t.body,
          priority: t.priority,
          category: t.category,
          status: "BACKLOG",
          addedByEmail: "claude-code (take-home epic 2026-05-29)",
          ticketSeq: seq,
          ticketKey: `IP-${seq}`,
          acceptanceCriteria: JSON.stringify(t.acceptance.map((text) => ({ text, done: false }))),
          ownerNotes: "Part of the multi-question take-home epic. See plan.",
        },
      });
      keyToId[t.key] = { id: row.id, ticketKey: row.ticketKey };
      console.log(`Minted ${row.ticketKey}: ${t.title}`);
    }
    // Phases FOLLOW_FROM the epic.
    for (const child of ["P1", "P2", "P3"]) {
      await p.adminTodoDependency.create({
        data: { fromId: keyToId[child].id, toId: keyToId.EPIC.id, type: "FOLLOWS_FROM" },
      });
    }
    // Linear ordering: P1 BLOCKS P2 BLOCKS P3.
    await p.adminTodoDependency.create({ data: { fromId: keyToId.P1.id, toId: keyToId.P2.id, type: "BLOCKS" } });
    await p.adminTodoDependency.create({ data: { fromId: keyToId.P2.id, toId: keyToId.P3.id, type: "BLOCKS" } });
    console.log("Edges: P1/P2/P3 FOLLOWS_FROM EPIC; P1 BLOCKS P2 BLOCKS P3");
    console.log("P1 ticket key:", keyToId.P1.ticketKey);
  } finally {
    await p.$disconnect();
  }
})();
