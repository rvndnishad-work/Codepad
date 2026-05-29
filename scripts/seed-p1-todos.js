const { PrismaClient } = require("@prisma/client");

const RELEASE_TAG = "P1 Release Target: Jun 2026 (per end-user review on 2026-05-28).";

const tickets = [
  {
    title: "Persist ATS webhook config + workspace-level overrides (unblock IP-13)",
    priority: "HIGH",
    category: "Recruiter",
    body:
      "Admin Settings → 'ATS Webhooks' tab currently stores Lever/Greenhouse/Ashby URLs in client useState — saving the form discards them. The /pricing page sells ATS sync as a feature. Need: server-side persistence (extend AppSetting or new AtsIntegration row), per-workspace override at /w/[slug] (and admin override at /admin/workspaces/[id]), optional auth-header secret (encrypt at rest like IP-2), and a 'Send test event' button that posts a sample candidate-result payload and surfaces response status + body.",
    acceptance: [
      "AdminSettings ATS tab persists Lever/Greenhouse/Ashby URLs across reloads",
      "Per-workspace override visible at /w/[slug]/integrations and /admin/workspaces/[id]/billing",
      "Auth-header secret encrypted at rest (reuse pattern from IP-2)",
      "'Send test event' button POSTs sample payload and renders response code + body",
      "Marks IP-13 'ATS sync: ship or remove' as resolved",
    ],
    ownerNotes:
      "Blocks IP-13 (Marketing). Currently atsLever/atsGreenhouse/atsAshby live only in src/app/admin/settings/SettingsForm.tsx useState — never saved server-side. " +
      RELEASE_TAG,
  },
  {
    title: "AI auto-drafted scorecards via Gemini after a session ends",
    priority: "HIGH",
    category: "Recruiter",
    body:
      "When an InterviewSession transitions to 'completed', invoke a Gemini call (reuse the AI screening infra) with the session's code diffs, console output, prompt attempts, and proctor telemetry → produce a draft rubric (per-criterion 1-5 scores) + a one-paragraph summary. Show in the verdict drawer with 'Draft by Gemma' badge. Recruiter edits and clicks 'Accept'. Charge against the existing AI credit ledger.",
    acceptance: [
      "POST /api/interview/:id/draft-scorecard endpoint (recruiter-only)",
      "Reuses credit charging logic from AI Screening (see [[project_ai_screening]] design)",
      "Verdict drawer shows 'Draft by Gemma' toggle before recruiter saves",
      "Counter telemetry: drafts accepted vs edited vs rejected (for prompt tuning)",
      "Empty/insufficient telemetry → graceful 'not enough data' state instead of error",
    ],
    ownerNotes:
      "Big time-to-decision win for recruiters. Pairs with the existing rubric model on InterviewSession. " +
      RELEASE_TAG,
  },
  {
    title: "Workspace candidate CRM v2 — pipeline stages, tags, CSV import, reject reasons",
    priority: "HIGH",
    category: "Recruiter",
    body:
      "/w/[slug]/candidates is flat today. Add a pipeline (Applied → Screened → Take-home → Onsite → Offer → Hired / Rejected), free-form tags, a Rejected-reason enum (Skill gap / Cultural / Comp / Other), and a CSV importer with column mapping. Stage breakdown widget on the workspace dashboard; drag-drop to move candidates between stages.",
    acceptance: [
      "WorkspaceCandidate.stage column (enum) + WorkspaceCandidate.tags string[]",
      "Kanban view at /w/[slug]/candidates with drag-drop between columns",
      "CSV import form with column mapping + dedupe by email",
      "Reject-reason picker required when moving to 'Rejected'",
      "Stage breakdown card on /w/[slug] dashboard",
    ],
    ownerNotes:
      "Largest single recruiter feature gap. CSV import unblocks demo to enterprise prospects who already have a pool elsewhere. " +
      RELEASE_TAG,
  },
  {
    title: "Bulk take-home dispatch + workspace leaderboard tab",
    priority: "MEDIUM",
    category: "Recruiter",
    body:
      "Take-homes are sent one at a time. Add a 'Send to many' modal: pick one challenge, paste/upload N candidate emails (or pick from CRM list), system mints N TakeHomeAssignment rows + N invite emails in a single transaction. New /w/[slug]/leaderboard tab shows score, status (Pending/Active/Submitted/Expired), and time-to-submit per candidate. Sortable + CSV export.",
    acceptance: [
      "'Send to many' modal launched from /w/[slug] header",
      "Single transaction mints N TakeHomeAssignment rows (no partial dispatch)",
      "Email throttling cooperates with IP-24/IP-27 infra (no rate-limit hammering)",
      "/w/[slug]/leaderboard route with sort by score + time-to-submit",
      "CSV export of leaderboard",
    ],
    ownerNotes:
      "Depends on Email epic (IP-24..IP-27) being at least partly shipped — gate it behind a feature flag if email isn't ready. " +
      RELEASE_TAG,
  },
  {
    title: "Calendar integration — Google + Outlook 2-way for scheduled interviews",
    priority: "MEDIUM",
    category: "Recruiter",
    body:
      "Beyond .ics attachments (IP-28), let recruiters connect a Google or Outlook calendar via OAuth so 'Scheduled' InterviewSession rows automatically appear on both interviewer + candidate calendars with reschedule sync. Reuse NextAuth Google/Microsoft providers where the token scope allows; otherwise a workspace-scoped OAuth client.",
    acceptance: [
      "/w/[slug]/integrations tab with 'Connect Google Calendar' + 'Connect Outlook'",
      "InterviewSession.calendarEventId column populated on create",
      "Editing scheduledAt propagates to the linked calendar event",
      "Disconnect button + clear scope explanation in UI",
      "Token refresh handled silently; surface clear error if revoked",
    ],
    ownerNotes:
      "Complements IP-28 (.ics emails). The .ics is one-way; this is two-way booking. " + RELEASE_TAG,
  },
  {
    title: "Workspace-facing audit log UI (reuse admin audit infra from IP-10)",
    priority: "MEDIUM",
    category: "Recruiter",
    body:
      "Admin audit log shipped (IP-10). Workspace owners can't see their own trail today — a hard blocker for any enterprise prospect asking SOC2-style questions. Add /w/[slug]/audit (workspace-admin role only) filtered by workspaceId, with actor/action/date filters, pagination, and CSV export. No new infra — wrap the existing audit query.",
    acceptance: [
      "/w/[slug]/audit route, gated to members with admin role",
      "Filters: actor (member dropdown), action (enum), date range",
      "Pagination matches the admin audit log page",
      "CSV export with same columns",
    ],
    ownerNotes: "Pure UI work over existing IP-10 query layer. " + RELEASE_TAG,
  },
  {
    title: "Mobile-friendly interview/take-home lobby with QR + email-me-the-link fallback",
    priority: "HIGH",
    category: "Candidate",
    body:
      "Landing markets a 'Desktop Optimized Editor' but candidates land on /take-home/[token] or /interview/[id]?token=... from a phone (clicked the email link on mobile). Sandpack/Monaco renders broken. Add a mobile-detection lobby: show QR for desktop hand-off, 'Email me this link' button (uses suppression-aware send from IP-24/25), 'Continue anyway' escape hatch. Token stays valid across the redirect.",
    acceptance: [
      "src/lib/device.ts helper (UA-based, no client-only)",
      "Lobby page renders for narrow viewports on take-home + interview entry routes",
      "QR encodes the same URL; 'Email me' POST sends via Resend",
      "Token survives lobby → desktop transition (no rotate on view)",
      "Lighthouse mobile a11y + perf ≥ 90 on the lobby page",
    ],
    ownerNotes:
      "Cheap UX win. Right now a mobile candidate gets a broken page with no recovery hint. " +
      RELEASE_TAG,
  },
  {
    title: "Public candidate portfolio v2 — badges, stats, embeddable widget",
    priority: "HIGH",
    category: "Candidate",
    body:
      "/u/[id] is sparse. Build: auto-computed badges ('10 challenges passed', 'Top 5% prompt practice', 'Mock interview: success'), a stats grid (challenges by difficulty, average prompt-rubric score, languages used), pinned playgrounds, and an embeddable widget (oEmbed-friendly) for resumes/LinkedIn. Privacy toggle defaults closed — candidate opts in to publishing.",
    acceptance: [
      "Badge computation (server-side, cached) covering challenges + prompts + mocks",
      "/u/[id]/portfolio route with print-to-PDF support",
      "'Copy public link' + 'Embed widget' CTAs on /profile",
      "Privacy toggle (default: portfolio hidden until opt-in)",
      "oEmbed endpoint at /api/oembed for LinkedIn/Notion/Medium",
    ],
    ownerNotes:
      "Doubles as a growth channel — published portfolios are SEO surfaces backlinking to the platform. " +
      RELEASE_TAG,
  },
  {
    title: "In-app notification center (bell icon, unread badge, per-type opt-in)",
    priority: "HIGH",
    category: "Platform",
    body:
      "No unified notifications today. Build a Notification model + bell dropdown in Header with unread badge. Triggers across personas: scheduled-interview-incoming, take-home-expiring-24h, replay-ready, scorecard-requested (recruiter), prompt-attempt-upvoted, AI-credit-running-low. Per-type opt-in/out for in-app vs email (the latter cooperates with Email epic IP-24..IP-31).",
    acceptance: [
      "Notification model (id, userId, type, payload, readAt, createdAt)",
      "Bell dropdown in Header for both personas, unread badge live-updates on poll/SSE",
      "Per-type preferences UI in /profile (candidate) and /admin/settings (recruiter)",
      "Email channel routes through the Email service from IP-24",
      "Mark-all-read + per-row dismiss",
    ],
    ownerNotes:
      "Cross-cutting — pair with Email epic so notifications can fan out to both channels from one trigger. " +
      RELEASE_TAG,
  },
  {
    title: "Adaptive next-best challenge recommender + weekly streak/goal",
    priority: "MEDIUM",
    category: "Candidate",
    body:
      "Candidate dashboard shows challenges flat. Add: nightly job recommends 3 challenges/day per user, scored from passed-difficulty curve, languages used, and weak rubric categories from past attempts. Streak counter (consecutive days with ≥1 attempt) + weekly goal (5 sessions) with progress ring on the candidate hero. Sticky on dashboard for return engagement.",
    acceptance: [
      "GET /api/recommendations?userId=... returning 3 challenge IDs with rationale string",
      "Nightly cron refreshes recommendations + persists last-seen list (no repeats)",
      "DashboardHero renders streak counter + weekly progress ring",
      "Empty cold-start: recommend popular Easy challenges by category",
    ],
    ownerNotes: "Pure retention play — measurable via 7-day return rate. " + RELEASE_TAG,
  },
  {
    title: "TOTP 2FA enrollment + enforcement for admins / recruiters with paid plans",
    priority: "HIGH",
    category: "Harden",
    body:
      "Admins rotate MCP keys, configure ATS webhooks (IP-32), manage billing — none gated by a second factor. Add TOTP enrollment under /profile/security, prompt second factor on login when enabled, force-enroll admins and paid-plan workspace admins on next login. Backup codes printable once at enroll. Reset via support email flow.",
    acceptance: [
      "User.totpSecret column (encrypted at rest, same pattern as IP-2 token)",
      "/profile/security enrollment: QR + verify-6-digit step + backup-code download",
      "Login flow prompts second factor when totpSecret is set",
      "Admin role + GROWTH/ENTERPRISE workspace admins blocked from app shell until enrolled",
      "Audit-log entry on enroll / disable / failed attempt",
    ],
    ownerNotes:
      "Pairs with IP-2 (encryption at rest). Required before any serious enterprise contract review. " +
      RELEASE_TAG,
  },
  {
    title: "WCAG AA accessibility pass on admin + interview + workspace surfaces",
    priority: "MEDIUM",
    category: "A11y",
    body:
      "Multiple admin/interview UIs use text-[9px]/text-[10px] and text-muted/60 (≈ #5a6072 on bg #08090c → fails 4.5:1). Many toggle buttons (proctoring, ATS, arena toggles) use focus:outline-none with no replacement focus ring — keyboard users have no indicator. Run axe-core, lift base font sizes where below 12px on body content, restore visible focus on all interactive elements, ensure ≥4.5:1 text contrast and ≥3:1 UI contrast.",
    acceptance: [
      "axe-core CI step in GitHub Actions on PRs touching src/app",
      "Body copy ≥12px (display labels can stay smaller)",
      "Visible focus ring on every button/toggle/link (no naked focus:outline-none)",
      "Lighthouse accessibility ≥ 90 on /admin, /interview, /w/[slug]",
      "Color contrast spot-check report committed to docs/a11y-audit.md",
    ],
    ownerNotes:
      "Mostly mechanical edits — high impact for enterprise procurement that asks for VPAT/ACR. " +
      RELEASE_TAG,
  },
];

(async () => {
  const prisma = new PrismaClient();
  const created = [];
  try {
    for (const t of tickets) {
      // Mirror createTodoAction's allocation: read max ticketSeq inside a tx and +1.
      const row = await prisma.$transaction(async (tx) => {
        const last = await tx.adminTodo.findFirst({
          where: { ticketSeq: { not: null } },
          orderBy: { ticketSeq: "desc" },
          select: { ticketSeq: true },
        });
        const nextSeq = (last?.ticketSeq ?? 0) + 1;
        const ticketKey = `IP-${nextSeq}`;
        return tx.adminTodo.create({
          data: {
            title: t.title,
            body: t.body,
            priority: t.priority,
            category: t.category,
            status: "BACKLOG",
            addedByEmail: "claude-code (end-user review 2026-05-28)",
            ticketSeq: nextSeq,
            ticketKey,
            acceptanceCriteria: JSON.stringify(
              t.acceptance.map((text) => ({ text, done: false }))
            ),
            ownerNotes: t.ownerNotes,
          },
        });
      });
      created.push({ key: row.ticketKey, title: row.title, priority: row.priority, category: row.category });
    }
    console.log(JSON.stringify({ createdCount: created.length, created }, null, 2));
  } catch (err) {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
