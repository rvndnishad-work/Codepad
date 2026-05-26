/**
 * Batch-seed the email-service ticket cluster. Each entry maps 1:1 to an
 * AdminTodo row with auto-allocated IP-N keys. Re-running is idempotent —
 * tickets are matched by title and skipped if already present.
 */
const { PrismaClient } = require("@prisma/client");

const TICKETS = [
  {
    title: "Email service foundation — Resend + React Email + deliverability",
    body: [
      "src/lib/email.ts is currently a thin adapter that hits the Resend HTTP API directly with hand-built HTML strings. It works for the two existing sends (AI screening invite, recruiter notify on submit) but doesn't scale to the dozens of scenarios coming. Replace it with a real production-grade email service.",
      "",
      "Pieces:",
      "1. React Email for templates — components compile to inline-CSS HTML that renders consistently across clients (Gmail, Outlook, Apple Mail, etc.). Pairs natively with Resend's SDK.",
      "2. Set up DKIM, SPF, DMARC on the sending domain — without this, mail goes to spam at Gmail/Outlook regardless of how good the content is.",
      "3. Centralized sender registry: every send goes through `sendEmail({ template, to, props })` so we never write raw HTML again.",
      "4. Migrate the two existing senders (invite-email.ts, submit-notify.ts) to the new shape so nothing regresses.",
    ].join("\n"),
    priority: "HIGH",
    category: "Email",
    acceptanceCriteria: [
      { text: "@react-email/components installed; src/emails/ directory with at least one BaseLayout component (logo, footer, unsubscribe stub)", done: false },
      { text: "src/lib/email.ts replaced by an Email service with a single sendEmail({ template, to, props }) entry point", done: false },
      { text: "DKIM + SPF DNS records configured for the sending domain; DMARC policy set to at minimum p=none with rua reporting", done: false },
      { text: "Existing invite-email.ts and submit-notify.ts migrated to use the new templates; no visual regression in the rendered mail", done: false },
      { text: "Resend's Idempotency-Key support wired so retries don't duplicate sends", done: false },
      { text: "Type-safe template registry — adding a new template forces TypeScript to know about its required props", done: false },
    ],
    ownerNotes: [
      "Resend's docs are great. Their @react-email/render package is what compiles JSX → HTML; use it server-side from inside sendEmail() rather than at template-author time.",
      "",
      "Deliverability is the part most engineers skip. Without DKIM signing, Gmail will quietly route every send to spam and your testing will all look fine. Set this up FIRST, then anything that goes out from interviewpad.in actually reaches inboxes.",
      "",
      "Don't migrate ALL future scenarios in this ticket — just the two existing sends + the foundation. The other tickets in this cluster each pick up their own scenarios using the new infra.",
      "",
      "Sender identity: use a sub-domain like mail.interviewpad.in for transactional. Keeps your main domain reputation insulated from any deliverability issues with this surface.",
    ].join("\n"),
  },
  {
    title: "EmailLog model + Resend webhook handler + suppression list",
    body: [
      "Right now we send an email and forget it. No audit trail, no bounce handling, no suppression — which means if a candidate's address bounces we'll keep sending and Resend will eventually throttle our whole account.",
      "",
      "Track every send. Wire Resend's webhook to update status. Maintain a suppression list so hard bounces and explicit complaints never receive another send from us.",
    ].join("\n"),
    priority: "HIGH",
    category: "Email",
    acceptanceCriteria: [
      { text: "EmailLog Prisma model: id, template, recipientEmail, workspaceId?, sessionId?, providerId (Resend id), status (queued/delivered/bounced/complained/opened/clicked), errorReason?, createdAt, lastEventAt", done: false },
      { text: "sendEmail() writes the EmailLog row before/after dispatch (queued → delivered/failed)", done: false },
      { text: "EmailSuppression model: address + reason (hard_bounce/complaint/unsubscribe) + addedAt", done: false },
      { text: "sendEmail() short-circuits with a logged 'suppressed' status if recipient is on the suppression list", done: false },
      { text: "POST /api/webhooks/resend handles delivered, bounced, complained, opened, clicked events; verifies HMAC signature", done: false },
      { text: "Admin page /admin/emails shows last 100 sends + per-status counts + suppression list", done: false },
    ],
    ownerNotes: [
      "Hard bounce = address doesn't exist. Soft bounce = mailbox full / quota / temporary. Hard bounces go straight to suppression. Soft bounces auto-clear after a retry window.",
      "",
      "Opens and clicks are useful metrics but optional — Resend tracks them automatically if you enable pixel/redirect, and our compliance story is easier if we DON'T track these by default and let workspaces opt in later.",
      "",
      "Don't tie EmailLog to a specific workspace as required FK — auth emails (welcome, reset) aren't workspace-scoped. Workspace is nullable.",
    ].join("\n"),
  },
  {
    title: "Admin email template catalog with preview + send-to-self test",
    body: [
      "Every template registered in the system shows up at /admin/emails/templates with a preview + a 'send test to me' button. Lets ops verify what an email looks like before it goes to real candidates and gives a self-serve QA path.",
    ].join("\n"),
    priority: "MEDIUM",
    category: "Email",
    acceptanceCriteria: [
      { text: "Each template self-registers with name, subject template, audience tag (candidate/recruiter/admin), and sample props", done: false },
      { text: "/admin/emails/templates lists all templates with audience + 'preview' + 'send test' buttons", done: false },
      { text: "Preview renders the template inline (iframe) using the sample props", done: false },
      { text: "'Send test' fires a real send to the admin's own email with [TEST] subject prefix", done: false },
      { text: "Editing props in the preview pane re-renders live (devx win for content tweaks)", done: false },
    ],
    ownerNotes: [
      "Sample props matter — make them realistic. Don't show 'lorem ipsum' in candidate name fields, use something obviously fake like 'Test Candidate' or 'Alex Example'.",
      "",
      "Could be its own little sub-app inside /admin if we end up adding template editing. For now: read-only preview, no UI for template authoring (we author in code).",
    ].join("\n"),
  },
  {
    title: "Take-home email lifecycle — invite, reminder, submitted, recruiter notify",
    body: [
      "Take-homes already exist in the platform but the only email touchpoint is the AI screening side. Wire the full take-home lifecycle:",
      "",
      "1. Recruiter assigns take-home → candidate gets invite email (link, deadline, what's being assessed)",
      "2. Deadline approaching → 24h reminder if candidate hasn't started yet",
      "3. Candidate submits → confirmation email to candidate + notification to workspace recruiters",
      "",
      "Mirror the AI screening pattern (sendInviteEmail, sendRecruiterNotifyEmail) — same code shape, different templates and triggers.",
    ].join("\n"),
    priority: "HIGH",
    category: "Email",
    acceptanceCriteria: [
      { text: "Templates: TakeHomeInviteEmail, TakeHomeReminderEmail, TakeHomeSubmittedCandidate, TakeHomeSubmittedRecruiter", done: false },
      { text: "TakeHome invite email fires from the existing assign-take-home action", done: false },
      { text: "Reminder job — scheduled cron or queue — sends 24h before takeHome.expiresAt when status is still PENDING/STARTED", done: false },
      { text: "Submit endpoint fires both confirmation + recruiter notify", done: false },
      { text: "Recruiter notify recipients = workspace OWNER/ADMIN/INTERVIEWER members (same pattern as submit-notify.ts)", done: false },
      { text: "Per-workspace setting: 'send take-home submit notifications' default ON; per-member override default ON", done: false },
    ],
    ownerNotes: [
      "Reminder job: easiest path is a Vercel Cron route at /api/cron/take-home-reminders running every hour. It queries take-homes whose expiresAt is between 23 and 24 hours out and status is PENDING|STARTED. Idempotency: write a flag on TakeHomeAssignment (reminderSentAt) so re-runs don't double-fire.",
      "",
      "Time zones matter for the candidate-facing 'expires at' text. Use the candidate's locale if known; otherwise embed both UTC and a 'in your timezone' note so they can read it correctly.",
    ].join("\n"),
  },
  {
    title: "Interview emails — invite with .ics, reschedule, reminder, replay-ready",
    body: [
      "Live interviews (InterviewSession scheduled type) need their own email arc. Distinct from take-home and AI screening because there's a real-time appointment involved.",
      "",
      "Four templates:",
      "1. Invite — when the recruiter schedules, candidate gets time, link, instructions + a .ics calendar attachment so they can one-click add to Google/Outlook/iCal",
      "2. Reschedule — when the recruiter moves the slot",
      "3. Reminder — 1h before scheduled start, both candidate and assigned interviewer",
      "4. Replay-ready — once the post-interview replay is processed and uploaded, the recruiter gets a link",
    ].join("\n"),
    priority: "MEDIUM",
    category: "Email",
    acceptanceCriteria: [
      { text: "Templates: InterviewInviteEmail (with .ics attachment), InterviewRescheduleEmail, InterviewReminderEmail, InterviewReplayReadyEmail", done: false },
      { text: ".ics calendar file generated server-side with UID, DTSTART, DTEND, ORGANIZER, ATTENDEE, REMINDER", done: false },
      { text: "Reschedule email is a calendar update (METHOD:REQUEST with bumped SEQUENCE) so most clients update the existing event in place rather than spawning a duplicate", done: false },
      { text: "Reminder cron runs every 5 minutes, sends to interviews starting in 55-60 minutes that haven't received a reminder yet", done: false },
      { text: "Replay-ready fires from the existing replay-processing pipeline", done: false },
    ],
    ownerNotes: [
      ".ics is fiddly. The 'ical-generator' npm package is fine — don't hand-roll. Pay special attention to UID stability across invite/reschedule: same UID, bumped SEQUENCE, that's the magic combo that makes Gmail/Outlook update the existing event instead of creating a second one.",
      "",
      "Timezones in .ics: always use TZID with a VTIMEZONE block, never naive local times. ical-generator handles this if you pass a Luxon DateTime; native Date is risky.",
      "",
      "Reminder spacing: 5-minute cron windows mean the candidate gets the reminder anywhere from 55 to 60 minutes before. That's fine — tighter than that and you're paying for cron more than you're improving UX.",
    ].join("\n"),
  },
  {
    title: "Recruiter notifications — replay digest, high-suspicion alert, weekly summary",
    body: [
      "Recruiters need passive awareness of pipeline activity without having to log in. Three flavors:",
      "",
      "1. Replay-ready batch — when N replays accumulate (or daily, whichever first), one email summarizing all replays ready for review",
      "2. High-suspicion alert — when an AI screening completes with aiSuspicionScore >= 60, push a separate alert email beyond the standard 'screening completed' notification. Cheating is the kind of thing recruiters NEED to know about immediately, not bury in a digest.",
      "3. Weekly digest — every Monday 9am workspace local time, roll-up of: new candidates this week, completed screenings, top scorers, integrity flags, take-homes submitted",
    ].join("\n"),
    priority: "MEDIUM",
    category: "Email",
    acceptanceCriteria: [
      { text: "Templates: ReplayDigestEmail, HighSuspicionAlertEmail, WeeklyDigestEmail", done: false },
      { text: "Per-recipient subscription preferences: ReplayDigest (instant/daily/off), Suspicion (on/off), Weekly (on/off)", done: false },
      { text: "Settings UI under /w/[slug]?section=notifications for each workspace member to manage their own", done: false },
      { text: "High-suspicion alert fires from existing submit-notify path when score >= 60 (configurable threshold per workspace, default 60)", done: false },
      { text: "Weekly digest cron runs Monday 9am — uses workspace timezone (new field, default UTC) so APAC workspaces get it at their Monday morning, not ours", done: false },
      { text: "All three emails contain unsubscribe link that opens the notification settings", done: false },
    ],
    ownerNotes: [
      "Per-member subscription preferences add a new model: WorkspaceMemberEmailPref { memberId, kind, mode }. Default ON for everything; member can opt out individually.",
      "",
      "Weekly digest content design tip: lead with the actionable bits (3 candidates worth reviewing) not the vanity metrics (47 page views). Recruiters skim — bury the noise.",
      "",
      "Suspicion threshold should be a workspace setting because some industries (security, fintech) want lower thresholds and others (early-stage marketing roles) want higher.",
    ].join("\n"),
  },
  {
    title: "Outcome + workspace + auth emails (offer/reject/followup, member invite, password reset)",
    body: [
      "The remaining everyday email scenarios — they don't fit cleanly into the candidate-lifecycle or recruiter-notification buckets so cluster them here.",
      "",
      "Three sub-clusters:",
      "1. Outcome emails — offer, reject, generic-followup. Recruiter triggers from candidate detail page; pre-filled by the existing draft_outreach MCP prompt logic but editable before send.",
      "2. Workspace operations — member invitation, member-removed notification, plan-changed.",
      "3. Auth — welcome on signup, email verification, password reset, magic link.",
    ].join("\n"),
    priority: "MEDIUM",
    category: "Email",
    acceptanceCriteria: [
      { text: "Outcome templates: OfferEmail, RejectionEmail, FollowupEmail — all with editable subject + body before send", done: false },
      { text: "Send-outcome action callable from candidate detail page; writes EmailLog + audit entry on Candidate", done: false },
      { text: "Workspace templates: MemberInviteEmail, MemberRemovedEmail, PlanChangedEmail", done: false },
      { text: "Auth templates: WelcomeEmail, EmailVerificationEmail, PasswordResetEmail, MagicLinkEmail", done: false },
      { text: "All transactional templates use the same BaseLayout from the email foundation ticket — consistent header/footer/branding", done: false },
      { text: "Per-workspace branding: workspace can upload a logo + accent color used in the BaseLayout for that workspace's emails", done: false },
    ],
    ownerNotes: [
      "Outcome emails: the draft_outreach MCP prompt already produces good copy. The send-outcome action should pre-fill the editor with the LLM draft but require the recruiter to hit Send — never auto-send something the LLM wrote.",
      "",
      "Auth emails: NextAuth has its own email-provider mechanism for magic links. Don't duplicate — wire the existing NextAuth callbacks to use sendEmail() under the hood so we get the EmailLog and suppression for free.",
      "",
      "Per-workspace branding: store logoUrl + brandColor on Workspace. Skip a full theme system; just those two fields cover 95% of the value with 5% of the complexity.",
    ].join("\n"),
  },
  {
    title: "Mass-email campaign tool with CAN-SPAM compliance + unsubscribe",
    body: [
      "Bulk email is different from transactional. CAN-SPAM (US) and GDPR (EU) both require explicit unsubscribe affordances + sender identification + clear opt-out tracking. Build this once, properly, and every future marketing/onboarding/announcement email rides on it.",
      "",
      "Scope:",
      "1. Audience builder — filter signed-up users + candidates by attributes (plan, last activity, role, country, etc.)",
      "2. Composer — subject + body with workspace-context variables, preview with sample recipients",
      "3. Schedule + send — rate-limited batched sending respecting Resend tier limits (~10/sec)",
      "4. Unsubscribe — one-click link in every email writes to EmailSuppression with reason=unsubscribe",
      "5. Compliance — every campaign email includes physical mailing address, unsubscribe link, sender identification",
    ].join("\n"),
    priority: "MEDIUM",
    category: "Email",
    acceptanceCriteria: [
      { text: "EmailCampaign model: id, name, audienceQuery (JSON), templateId, status (draft/scheduled/sending/sent), scheduledAt?, sentCount, openedCount, clickedCount, unsubscribeCount", done: false },
      { text: "/admin/emails/campaigns: list + new-campaign wizard (audience → template → schedule → review → send)", done: false },
      { text: "Audience builder supports: user role, workspace plan, last login, signup cohort, country, has-completed-screening", done: false },
      { text: "Sender uses batched dispatch with rate limit + retry; surface progress in the admin UI", done: false },
      { text: "Every campaign email includes a one-click unsubscribe URL signed with a per-recipient token (no login required to unsub)", done: false },
      { text: "Physical address + sender identification baked into BaseLayout footer (CAN-SPAM compliance)", done: false },
      { text: "Test mode: send to a hand-picked recipient list (3-10 addresses) before triggering the full audience", done: false },
    ],
    ownerNotes: [
      "Unsubscribe tokens: HMAC of (recipientEmail, campaignId) signed with a server secret. Verified on the /unsubscribe route. Token is in the URL — no auth needed to unsub, which is the whole point.",
      "",
      "Rate limits: Resend's basic tier is something like 100/day, paid is much higher. The campaign sender should respect the dynamic limit from Resend's API headers — they'll send back 429 and a retry-after. Don't hardcode.",
      "",
      "Audience size sanity: warn at 1000+ recipients and require a second confirmation. A misfired campaign is the kind of thing you only do once before learning to add the safety net.",
      "",
      "If you ever support per-workspace campaigns (recruiter sends to their candidates), be EXTRA careful — they don't have CAN-SPAM compliance built into their content authoring, so the platform has to enforce the unsubscribe + sender-id machinery on their behalf.",
    ].join("\n"),
  },
];

(async () => {
  const p = new PrismaClient();
  try {
    let created = 0;
    let skipped = 0;
    for (const t of TICKETS) {
      const existing = await p.adminTodo.findFirst({
        where: { title: t.title },
        select: { id: true, ticketKey: true },
      });
      if (existing) {
        console.log(`  skip — already present as ${existing.ticketKey}: ${t.title.slice(0, 50)}`);
        skipped++;
        continue;
      }
      const result = await p.$transaction(async (tx) => {
        const last = await tx.adminTodo.findFirst({
          where: { ticketSeq: { not: null } },
          orderBy: { ticketSeq: "desc" },
          select: { ticketSeq: true },
        });
        const seq = (last?.ticketSeq ?? 0) + 1;
        const key = `IP-${seq}`;
        await tx.adminTodo.create({
          data: {
            title: t.title,
            body: t.body,
            priority: t.priority,
            category: t.category,
            ticketSeq: seq,
            ticketKey: key,
            acceptanceCriteria: JSON.stringify(t.acceptanceCriteria),
            ownerNotes: t.ownerNotes,
          },
        });
        return key;
      });
      console.log(`  ${result} — ${t.title.slice(0, 60)}`);
      created++;
    }
    console.log(`\nDone. Created ${created}, skipped ${skipped}.`);
  } finally {
    await p.$disconnect();
  }
})();
