/**
 * Mint follow-up tickets for every deferred item across IP-32, IP-38, IP-40,
 * IP-42, IP-44 so nothing is orphaned. Plus IP-45-specific deferrals so they're
 * visible upfront.
 *
 * Each ticket cross-references its parent so the audit trail is clear.
 */
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const TARGET = "P1 Release Target: Jun 2026.";

const tickets = [
  /* ─────────── Backfill from IP-32 (ATS) ─────────── */
  {
    title:
      "Wire outbound ATS push on interview-completed (production trigger for IP-32)",
    priority: "HIGH",
    category: "Recruiter",
    body:
      "IP-32 shipped per-workspace AtsIntegration persistence + Send Test Event. The production trigger that pushes real verdicts to the configured webhook does NOT exist yet — the test event proves wiring works, nothing actually fires on session completion. When InterviewSession.status transitions to 'completed' with a verdict, look up the workspace's AtsIntegration, decrypt apiKey, and POST the verdict payload (same shape as the test event but with real session data). Handle failures with retry + dead-letter logging so a flaky ATS does not block the recruiter UX.",
    acceptance: [
      "Fires from src/app/api/interview/[id]/route.ts when status transitions to 'completed' (mirrors IP-44 trigger gate)",
      "Reuses the test-event payload shape from sendAtsTestEventAction with real candidate/session data",
      "Re-runs SSRF check at send time (validateOutboundUrl), even though it ran at save time",
      "Retry policy: 3 attempts with exponential backoff (1s/4s/16s)",
      "Permanent failure recorded to a dead-letter / audit row (so admins can replay)",
      "Per-workspace opt-out: skip when AtsIntegration row missing or future 'enabled' flag is false",
    ],
    ownerNotes:
      "Closes the lurking IP-32 retrospective gap I flagged in the end-to-end audit. Pairs with IP-45 (admin can also broadcast 'ATS integration disabled' notifications). " +
      TARGET,
  },
  {
    title: "Inbound ATS webhook receiver with HMAC signature verification",
    priority: "MEDIUM",
    category: "Recruiter",
    body:
      "AtsIntegration.webhookSecret column exists but no receiver verifies inbound webhooks from the ATS. Build POST /api/webhooks/ats/[workspaceId] that reads provider-specific signature header (X-Lever-Signature / X-Greenhouse-Signature / etc.), computes HMAC-SHA256, compares against decrypted webhookSecret. Use the inbound event to update WorkspaceCandidate stage (pairs with IP-34 CRM v2).",
    acceptance: [
      "POST /api/webhooks/ats/[workspaceId] route with provider-specific signature headers documented",
      "HMAC-SHA256 comparison uses constant-time compare (crypto.timingSafeEqual)",
      "Replay protection: reject events with a timestamp >5min old",
      "Maps recognized inbound events to internal actions (e.g. candidate stage change → CRM stage update)",
      "Per-provider receiver tested with the same probe pattern as IP-32 Send Test Event",
    ],
    ownerNotes: "IP-32 retrospective gap. " + TARGET,
  },

  /* ─────────── Backfill from IP-38 (Mobile lobby) ─────────── */
  {
    title:
      "Extend mobile lobby to remaining Sandpack routes (/play, /challenges/attempt, /embed, /collab-test)",
    priority: "MEDIUM",
    category: "Candidate",
    body:
      "IP-38 wired the mobile-handoff lobby into /take-home, /interview, /ai-interview entry routes. But Sandpack/Monaco also renders on /play/[id], /challenges/[slug]/attempt, /embed/[id], /collab-test. A mobile user hitting any of those from a shared link or email still gets a broken editor. Add the same shouldRenderMobileLobby() check at the top of each route. Embed in particular needs special handling — the lobby may not be the right UX inside an iframe; consider a 'tap to expand' fallback.",
    acceptance: [
      "src/app/play/[id]/page.tsx renders lobby on mobile",
      "src/app/challenges/[slug]/attempt/page.tsx renders lobby on mobile",
      "src/app/embed/[id]/page.tsx renders a compact mobile fallback (iframe-aware)",
      "src/app/collab-test/page.tsx renders lobby on mobile",
      "All four routes verified via curl + iPhone UA, same coverage matrix as IP-38",
    ],
    ownerNotes:
      "IP-38 retrospective gap. Cheap mechanical work, no new infra. " + TARGET,
  },
  {
    title:
      "Lighthouse mobile a11y + perf ≥90 measurement on the mobile lobby (IP-38 AC #5)",
    priority: "LOW",
    category: "A11y",
    body:
      "IP-38 AC #5 was left unchecked. Run Lighthouse against /take-home/[token]?lobby=force on a mobile profile, fix any issues that drop either score below 90, commit the report to docs/lighthouse-mobile-lobby.md.",
    acceptance: [
      "Lighthouse mobile score: a11y ≥90, perf ≥90",
      "Report committed to docs/lighthouse-mobile-lobby.md",
      "Fixes applied to MobileLobby + MobileLobbyActions if needed",
    ],
    ownerNotes: "Closes IP-38 AC #5. " + TARGET,
  },

  /* ─────────── Backfill from IP-40 (Notification bell) ─────────── */
  {
    title:
      "Fix NotificationBell row markup — dismiss <button> nested in row <button> (hydration warning)",
    priority: "MEDIUM",
    category: "UI",
    body:
      "src/components/NotificationBell.tsx renders the dismiss X button INSIDE the row button. This is invalid HTML and triggers a React hydration warning in dev (visible in the console). Restructure: either make the row a div with role='button' + onClick / onKeyDown, OR position the dismiss button absolutely outside the row button's DOM tree.",
    acceptance: [
      "No hydration warnings in dev console when the dropdown is opened",
      "Keyboard a11y preserved: row reachable via Tab + Enter, dismiss reachable via Tab",
      "Click on row still marks-read and navigates; click on dismiss still soft-deletes",
    ],
    ownerNotes:
      "IP-40 retrospective gap. Pre-existing bug from Phase 2. " + TARGET,
  },

  /* ─────────── Backfill from IP-42 (TOTP) ─────────── */
  {
    title:
      "Force 2FA enrollment for admins and GROWTH/ENTERPRISE workspace admins (app-shell gate)",
    priority: "HIGH",
    category: "Harden",
    body:
      "IP-42 AC #6. Currently a privileged user can decline 2FA forever, defeating the compliance framing. Add a gate that redirects any user who is either platform-admin (isAdmin) or workspace OWNER/ADMIN of a GROWTH/ENTERPRISE workspace to /profile/security if totpEnabledAt is null. Allowlist /profile/security itself + /api/auth/* + /login so the user can complete enrollment.",
    acceptance: [
      "Gate runs in src/app/layout.tsx OR src/middleware.ts (decide based on edge runtime needs)",
      "Allowlist: /profile/security/**, /api/auth/**, /login, /signout, public marketing pages",
      "Friendly banner explains why the user is being asked to enroll",
      "Grace period: configurable env var, default 7 days from role grant",
      "Audit log entry on each forced redirect (TOTP_FORCE_REDIRECT)",
    ],
    ownerNotes: "Closes IP-42 AC #6. " + TARGET,
  },
  {
    title:
      "Apply TOTP gate to OAuth (GitHub/Google/Facebook) sign-in path (IP-42 AC #7)",
    priority: "HIGH",
    category: "Harden",
    body:
      "IP-42 AC #7. OAuth currently bypasses TOTP entirely — a user with 2FA enrolled can sign in via GitHub and never see a second factor. Real security gap. Recommended approach: post-OAuth TOTP step. In the NextAuth signIn callback, when an OAuth login matches a user with totpEnabledAt, mark the JWT with `pending2fa=true` and redirect to /login/2fa. Middleware blocks all routes except /login/2fa, /api/auth/*, and /signout while pending2fa is true.",
    acceptance: [
      "OAuth sign-in for a 2FA-enrolled user lands on /login/2fa instead of the callback destination",
      "/login/2fa accepts TOTP OR backup code (reuse the AuthCard step UI)",
      "Successful verify clears pending2fa from JWT and redirects to the original callbackUrl",
      "Middleware enforces the gate on every route except the allowlist",
      "Failed verify is rate-limited and audit-logged (TOTP_VERIFY_FAILED phase=oauth)",
    ],
    ownerNotes: "Closes IP-42 AC #7. " + TARGET,
  },
  {
    title:
      "Rate-limit TOTP attempts on credentials login (brute-force protection)",
    priority: "HIGH",
    category: "Harden",
    body:
      "Bcrypt slows the password phase, but once an attacker has a valid password they can hammer the 6-digit TOTP space (~1M combinations) at HTTP speed. Add per-email + per-IP rate limit on /api/auth/callback/credentials for TOTP-required attempts: 5 wrong codes per 5 min, then 15-min lockout. Reuse src/lib/rate-limit.ts.",
    acceptance: [
      "Limit: 5 wrong codes per 5 min per (email + IP), then 15-min lockout",
      "Backup codes consumed do NOT count against the limit (they're single-use anyway)",
      "Lockout response returns a generic error (don't reveal lockout state to attacker)",
      "Reset counter on successful verify",
      "Audit log entry (TOTP_LOCKED_OUT) on lockout for ops monitoring",
    ],
    ownerNotes:
      "IP-42 retrospective gap. Not in the original ACs but discovered in the end-to-end audit. " +
      TARGET,
  },

  /* ─────────── Backfill from IP-44 (Notification triggers) ─────────── */
  {
    title:
      "Add candidateEmail to InterviewSession schema + wire INTERVIEW_SCHEDULED notification",
    priority: "MEDIUM",
    category: "Platform",
    body:
      "IP-44 AC #5. Currently InterviewSession stores candidateName but not candidateEmail, so we cannot look up the candidate's User row at schedule time. notifyInterviewScheduled() is written and ready — it just has nothing to trigger on. Add candidateEmail column, plumb it through the create endpoint, then the existing helper fires for free. Pairs naturally with IP-24 (send the candidate an invite email at the same trigger).",
    acceptance: [
      "InterviewSession.candidateEmail String? column added + migration",
      "/api/interview create accepts candidateEmail in the create schema",
      "/interview/new form has a candidateEmail input",
      "notifyInterviewScheduled() fires from /api/interview/route.ts after create",
      "Verified end-to-end: schedule a live session with candidate email → that candidate's bell shows the row",
    ],
    ownerNotes: "Closes IP-44 AC #5. " + TARGET,
  },

  /* ─────────── IP-45-specific deferrals (mint upfront) ─────────── */
  {
    title:
      "Scheduled broadcast notifications — pick a future send-time + cancel-before-send",
    priority: "LOW",
    category: "Platform",
    body:
      "IP-45 MVP ships send-now broadcasts only. This follow-up adds: (a) a scheduledAt field on BroadcastNotification, (b) a cron worker that picks up due broadcasts every minute and fans out, (c) cancel button in the sent log while status='SCHEDULED'. Reuses the same dispatchBroadcastAction internals — the cron just calls it with the resolved audience snapshot.",
    acceptance: [
      "BroadcastNotification.scheduledAt + status (DRAFT/SCHEDULED/SENT/CANCELLED) columns",
      "Compose form gets a 'Send' vs 'Schedule for…' picker",
      "Cron worker at /api/cron/broadcasts (CRON_SECRET-gated) picks up due broadcasts",
      "Cancel button in /admin/notifications/sent while status=SCHEDULED",
      "Idempotency: a cron retry that runs after status flips to SENT is a no-op",
    ],
    ownerNotes: "Deferred from IP-45 MVP for scope. " + TARGET,
  },
  {
    title:
      "Per-recipient delivery status tracking for broadcasts (read/dismissed/clicked-through)",
    priority: "LOW",
    category: "Platform",
    body:
      "IP-45 MVP just stores recipient count on BroadcastNotification. This adds: per-recipient delivery (already implicit via Notification rows), but also aggregate metrics in the admin sent log — read-through rate, dismiss rate, click-through-to-href rate. Click-through requires a tiny redirect handler at /n/[notificationId] that marks-read + 302s to the href.",
    acceptance: [
      "BroadcastNotification gets denormalised readCount, dismissedCount, clickedCount (updated via webhook or aggregation query)",
      "/n/[notificationId] redirect handler that marks-read + bumps clickedCount + 302s",
      "Update existing Notification.href values to route through /n/[id] for click tracking",
      "Admin sent log shows a small bar chart: read%/dismiss%/click%",
    ],
    ownerNotes: "Deferred from IP-45 MVP. " + TARGET,
  },
  {
    title:
      "Advanced broadcast audience filters (by attribute, e.g. 'candidates who completed challenge X')",
    priority: "LOW",
    category: "Platform",
    body:
      "IP-45 MVP audiences are: All / All Candidates / All Recruiters / single Workspace / single User. This adds a query builder for attribute-based filters: by sign-up cohort, by completion status of a specific challenge, by AI credit balance, by 2FA status, etc. Helps marketing/lifecycle notifications without bolting on a separate tool.",
    acceptance: [
      "Filter builder UI: AND/OR groups of (field, op, value)",
      "Safe field allowlist (no raw SQL injection surface)",
      "Preview shows estimated recipient count before send",
      "Saved filter presets per admin",
    ],
    ownerNotes:
      "Deferred from IP-45 MVP — premature without first proving the simpler audiences are used. " +
      TARGET,
  },
];

(async () => {
  const prisma = new PrismaClient();
  const out = [];
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
          addedByEmail:
            "claude-code (deferred-item backfill per user audit policy)",
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
    out.push({
      k: row.ticketKey,
      p: row.priority,
      c: row.category,
      t: row.title.slice(0, 100),
    });
  }
  console.log(JSON.stringify(out, null, 2));
  await prisma.$disconnect();
})();
