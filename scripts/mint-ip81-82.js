/**
 * Mint IP-81 + IP-82 — Tailwind custom-token alpha support.
 *
 * Discovered 2026-05-29 while fixing the notification toggles: this project's
 * custom color tokens (fg, bg, surface, panel, elevated, muted, border, accent,
 * …) are defined such that Tailwind's `/<alpha>` modifier does NOT apply —
 * `bg-fg/15`, `bg-muted/30`, even `bg-surface/60` all compute to fully
 * transparent. Only standard palette colors (emerald/amber/…) honor alpha.
 *
 *   - IP-81: fix the token definitions so `/<alpha>` works.
 *   - IP-82: regression sweep, because IP-81 will retroactively make every
 *            currently-transparent `/alpha` usage opaque.
 *
 * Lineage: IP-82 FOLLOWS_FROM IP-81 (the sweep follows the config change).
 */
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const TARGET = "P1 Release Target: Jun 2026.";

const tickets = [
  {
    key: "IP-81",
    title:
      "Make custom Tailwind color tokens alpha-capable (rgb(var(--token) / <alpha-value>))",
    priority: "MEDIUM",
    category: "UI",
    body:
      "Surfaced 2026-05-29 debugging the notification preference toggles: the off-track (bg-fg/15) and the muted email-on track (bg-muted/30) rendered fully transparent. Verified in-browser that custom tokens drop their `/<alpha>` modifier entirely — getComputedStyle returns rgba(0,0,0,0) — while standard palette colors (bg-emerald-500/40, bg-amber-500/40) honor alpha correctly.\n\n" +
      "Root cause: the custom color tokens are defined in a form Tailwind can't inject an alpha channel into (e.g. a literal hex or a bare `var(--x)`), so `bg-fg/15`, `text-muted/70`, `bg-surface/60`, `bg-panel/40`, `border-*/40`, etc. silently produce transparent instead of the intended translucent color.\n\n" +
      "Fix: define the tokens so Tailwind can compose alpha — i.e. CSS vars hold raw channels and the theme maps colors as `rgb(var(--token) / <alpha-value>)` (or the hsl equivalent). Touch the Tailwind theme config (tailwind.config.*) and the CSS-var declarations (globals.css). Keep the resolved opaque colors identical to today so nothing regresses at full opacity.\n\n" +
      "WARNING: this is coupled with IP-82. Flipping the tokens will make hundreds of existing `/<alpha>` usages — which currently collapse to transparent — suddenly render with real opacity. Do not ship IP-81 without the IP-82 regression sweep.",
    acceptance: [
      "Custom color tokens (fg, bg, surface, panel, elevated, muted, border, accent, and any others) support the Tailwind `/<alpha>` modifier",
      "Verified in-browser: bg-fg/15, bg-muted/30, bg-surface/60 produce non-transparent rgba with the expected alpha (not rgba(0,0,0,0))",
      "Full-opacity (no-alpha) usages render the exact same color as before — no visual change at 100%",
      "Both light and dark themes still resolve correctly (tokens are CSS-var driven)",
      "No build/lint errors; a short comment documents the channel format requirement for future tokens",
    ],
    ownerNotes:
      "Latent footgun: any future `/<alpha>` on a custom token silently fails today. Discovered via the toggle fix (NotificationPreferencesClient ToggleCell), which worked around it by using bg-elevated (solid) + emerald palette alpha. " +
      TARGET,
  },
  {
    key: "IP-82",
    title:
      "Regression sweep: fix `/<alpha>`-on-custom-token usages that render transparent today",
    priority: "MEDIUM",
    category: "UI",
    body:
      "Coupled follow-up to IP-81. Once custom tokens become alpha-capable, every existing `(bg|text|border|ring|from|to)-(fg|bg|surface|panel|elevated|muted|border|accent|…)/<N>` usage — currently transparent — will suddenly render with real opacity. Some layouts may have unknowingly relied on the transparent collapse (e.g. the workspace row <ul> uses bg-surface/60, which is transparent today and just shows the page bg behind it).\n\n" +
      "Work: grep the repo for the pattern, inventory the usages, visually QA the high-traffic surfaces (workspace dashboard rows, notification preferences, cards, modals, admin), and fix any that look wrong under real opacity. Decide per-case: keep the intended translucency, or pin to a solid token where transparency was the (accidental) desired look.",
    acceptance: [
      "Inventory of all `/<alpha>` usages on custom tokens (grep + list)",
      "Visual QA of key surfaces after IP-81 lands: workspace dashboard, /profile/notifications, cards, modals, admin console — light + dark",
      "Each regressed usage resolved (intended translucency kept, or pinned to a solid token)",
      "No remaining surfaces that look wrong vs. the pre-IP-81 baseline",
    ],
    ownerNotes:
      "Must be done with/right after IP-81 — they are a coupled pair. Representative known case: bg-surface/60 on the workspace row list. " +
      TARGET,
  },
];

const edges = [{ from: "IP-82", to: "IP-81", type: "FOLLOWS_FROM" }];

(async () => {
  const prisma = new PrismaClient();
  try {
    const created = {}; // logical key -> real ticketKey
    await prisma.$transaction(async (tx) => {
      let last = await tx.adminTodo.findFirst({
        where: { ticketSeq: { not: null } },
        orderBy: { ticketSeq: "desc" },
        select: { ticketSeq: true },
      });
      let seq = last?.ticketSeq ?? 0;
      for (const t of tickets) {
        seq += 1;
        const row = await tx.adminTodo.create({
          data: {
            title: t.title,
            body: t.body,
            priority: t.priority,
            category: t.category,
            status: "BACKLOG",
            addedByEmail: "claude-code (tailwind alpha-token bug found 2026-05-29)",
            ticketSeq: seq,
            ticketKey: `IP-${seq}`,
            acceptanceCriteria: JSON.stringify(
              t.acceptance.map((text) => ({ text, done: false })),
            ),
            ownerNotes: t.ownerNotes,
          },
        });
        created[t.key] = row.ticketKey;
        console.log(`Minted ${row.ticketKey}: ${row.title}`);
      }
    });

    for (const e of edges) {
      const fromKey = created[e.from] ?? e.from;
      const toKey = created[e.to] ?? e.to;
      const from = await prisma.adminTodo.findUnique({ where: { ticketKey: fromKey }, select: { id: true } });
      const to = await prisma.adminTodo.findUnique({ where: { ticketKey: toKey }, select: { id: true } });
      if (from && to) {
        await prisma.adminTodoDependency.create({ data: { fromId: from.id, toId: to.id, type: e.type } });
        console.log(`  ${fromKey} --${e.type}--> ${toKey}`);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
})();
