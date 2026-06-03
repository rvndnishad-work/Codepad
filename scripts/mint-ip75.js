/**
 * Mint IP-75 — Workspace sidebar consolidation. User flagged that the sidebar
 * has grown to 8 entries with significant conceptual overlap. This ticket
 * captures the refactor with concrete ACs.
 *
 * Lineage: FOLLOWS_FROM IP-34 + IP-35 (the recently-shipped Pipeline and
 * Leaderboard, which made the bloat visible).
 */
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const TARGET = "P1 Release Target: Jun 2026.";

const ticket = {
  title:
    "Workspace sidebar consolidation — collapse 8 entries into 4 with sub-tabs (Candidates, Assessments, Library)",
  priority: "MEDIUM",
  category: "UI",
  body:
    "User audit on 2026-05-29 flagged that the workspace sidebar has grown to 8 entries with significant conceptual overlap. After shipping IP-34 (Pipeline Kanban) and IP-35 (Leaderboard) the bloat became visible — both are views of Candidates, not new top-level destinations.\n\n" +
    "Current state (8 entries):\n" +
    "  Overview · Challenges · Interviews · Take-homes · Candidates · Replays · Pipeline · Leaderboard\n\n" +
    "Three overlap groups:\n" +
    "  1. Candidates / Pipeline / Leaderboard → three views of the same Candidate model (flat list, Kanban-by-stage, ranked-by-score)\n" +
    "  2. Interviews / Take-homes / Replays → three states of assessment work (live sessions, async submissions, post-session playback)\n" +
    "  3. Challenges → orthogonal question bank (LIBRARY), doesn't belong in the same group as candidate workflow\n\n" +
    "Proposed restructure (4 entries):\n" +
    "  • Overview — unchanged dashboard\n" +
    "  • Candidates — List | Pipeline | Leaderboard tabs (default to List for backwards compat)\n" +
    "  • Assessments — Interviews | Take-homes | Replays tabs (default to Interviews)\n" +
    "  • Library — Challenges (and future templates)\n\n" +
    "Tab routing: query param (?view=pipeline) instead of new routes so deep-links survive and breadcrumbs stay short. Keep direct routes (/w/[slug]/candidates and /w/[slug]/leaderboard) as 301-style redirects to the new tabbed URLs so external links don't break.\n\n" +
    "Migration safety: counts/badges per tab should stay accurate; sticky tab selection per user (localStorage) is a nice-to-have but not blocking.",
  acceptance: [
    "Sidebar shows exactly 4 workspace entries: Overview, Candidates, Assessments, Library",
    "Candidates entry → tabbed UI with List (current ?section=candidates), Pipeline (current /candidates), Leaderboard (current /leaderboard)",
    "Assessments entry → tabbed UI with Interviews, Take-homes, Replays",
    "Library entry → Challenges (placeholder for future templates / prompt scenarios)",
    "Per-tab count badges remain accurate (interview count, take-home count, etc.)",
    "Existing direct routes (/w/[slug]/candidates, /w/[slug]/leaderboard) redirect to the new tabbed URLs so external links don't 404",
    "Active-tab styling consistent with current sidebar active state",
    "Mobile sidebar collapse works with the new structure (test at 360px width)",
    "Verified end-to-end: every previously-reachable view still reachable; no functionality regression",
  ],
  ownerNotes:
    "Triggered by user audit on 2026-05-29 after shipping IP-34 + IP-35. The bloat wasn't visible before because there were only 5 candidate-related entries; adding Pipeline and Leaderboard pushed it to a noticeable level. " +
    TARGET,
};

const edges = [
  // The bloat became visible because of these two recent ships.
  { from: "IP-75", to: "IP-34", type: "FOLLOWS_FROM" },
  { from: "IP-75", to: "IP-35", type: "FOLLOWS_FROM" },
];

(async () => {
  const prisma = new PrismaClient();
  try {
    const { row } = await prisma.$transaction(async (tx) => {
      const last = await tx.adminTodo.findFirst({
        where: { ticketSeq: { not: null } },
        orderBy: { ticketSeq: "desc" },
        select: { ticketSeq: true },
      });
      const nextSeq = (last?.ticketSeq ?? 0) + 1;
      const row = await tx.adminTodo.create({
        data: {
          title: ticket.title,
          body: ticket.body,
          priority: ticket.priority,
          category: ticket.category,
          status: "BACKLOG",
          addedByEmail: "claude-code (sidebar audit per user request 2026-05-29)",
          ticketSeq: nextSeq,
          ticketKey: `IP-${nextSeq}`,
          acceptanceCriteria: JSON.stringify(
            ticket.acceptance.map((text) => ({ text, done: false })),
          ),
          ownerNotes: ticket.ownerNotes,
        },
      });
      return { row };
    });
    console.log(`Minted ${row.ticketKey}: ${row.title}`);

    // Write the FOLLOWS_FROM edges.
    for (const e of edges) {
      const fromKey = e.from === "IP-75" ? row.ticketKey : e.from;
      const fromTodo = await prisma.adminTodo.findUnique({
        where: { ticketKey: fromKey },
        select: { id: true },
      });
      const toTodo = await prisma.adminTodo.findUnique({
        where: { ticketKey: e.to },
        select: { id: true },
      });
      if (fromTodo && toTodo) {
        await prisma.adminTodoDependency.create({
          data: { fromId: fromTodo.id, toId: toTodo.id, type: e.type },
        });
        console.log(`  ${fromKey} --${e.type}--> ${e.to}`);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
})();
