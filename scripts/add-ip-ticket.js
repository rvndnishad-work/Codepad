/**
 * One-off helper to add a single AdminTodo with the next IP-N key. Useful
 * when you want to seed a ticket from a deploy script or from outside the
 * admin UI. Pass the payload inline below and run: `node scripts/add-ip-ticket.js`
 *
 * For the user-facing case (admin types a thought during the day), the
 * /admin/todos quick-add row is the right path — this script is for the
 * rare programmatic seed.
 */
const { PrismaClient } = require("@prisma/client");

const TICKET = {
  title:
    "Standardize modal rendering via shared <Modal> component with portal",
  body: [
    "Every modal in the app currently re-implements its own backdrop, click-outside, Escape handler, and z-index. They render inline inside the page tree, which means each one is exposed to ancestor stacking-context bugs.",
    "",
    "The /admin/todos detail modal hit one such bug today: AdminLayout's <main z-10> wrapped the inline modal, and the sidebar's lg:z-20 sibling painted over the left edge. Symptom was 'modal truncated under sidebar'. Fixed for that one modal by portaling to document.body — but other layouts will eventually hit the same trap and nobody will remember why.",
    "",
    "Goal: one <Modal> primitive everyone shares. Portal-by-default. Centralized keyboard + click-outside + animation. Removes the latent footgun without touching feature code.",
  ].join("\n"),
  priority: "MEDIUM",
  category: "UI",
  acceptanceCriteria: [
    { text: "src/components/Modal.tsx exposes a <Modal open onClose>...</Modal> primitive that portals to document.body", done: false },
    { text: "Built-in: Escape to close, click outside to close, SSR-safe mount guard, focus trap inside modal", done: false },
    { text: "Props: size (sm/md/lg/xl), preventCloseOnOutsideClick?, initialFocusRef?", done: false },
    { text: "Migration: AI Screening invite modal, Buy Credits modal, Custom Templates modal, MCP API key create+reveal modals, External MCP server create+edit modal, Admin grant-credits + session-forensics modals, AdminTodos detail modal", done: false },
    { text: "No visual regression — each migrated modal still looks the same (same border, shadow, sizing tokens)", done: false },
    { text: "Storybook or a /admin/_dev/modals demo page showing all sizes + nesting behavior (optional but useful)", done: false },
  ],
  ownerNotes: [
    "Strategy: keep the primitive narrow — it owns backdrop + portal + key handlers, but the modal *content* (header, body, footer) stays per-feature. Otherwise we'll end up rewriting feature-specific UI just to fit a shared shape.",
    "",
    "Headless UI's Dialog or Radix Dialog would both work as the foundation and skip writing focus-trap logic ourselves. Radix is already lighter-touch; Headless UI is more opinionated. Either is fine, and either lets us swap later. If you don't want a new dep, a hand-rolled portal + useEffect for Esc is ~30 lines.",
    "",
    "Migration order: do AdminTodos first (already portaled, easiest to swap in the new component). Then API keys / External MCP since those have a similar shape. Save the AI Screening modals for last because they're the most complex (Buy Credits has cards, Templates has a form-mode switcher).",
    "",
    "Don't refactor the in-page reveal modal for API key plaintext until you've tested the new <Modal> in dark mode + when the OS has reduced-motion enabled.",
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
    console.log(`Created ${result.key} — ${TICKET.title}`);
  } finally {
    await p.$disconnect();
  }
})();
