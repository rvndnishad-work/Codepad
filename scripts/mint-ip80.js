/**
 * Mint IP-80 — Self-serve password reset flow. Surfaced 2026-05-29 when the
 * owner's credentials failed and recovery required a manual DB write because no
 * self-serve reset path exists. Forced 2FA (IP-42 AC#6 / IP-53) raises lockout
 * exposure, so account recovery matters more now.
 *
 * Lineage:
 *   - IP-24 BLOCKS IP-80   (email service foundation needed to send the link)
 *   - IP-80 RELATES_TO IP-30 (auth-email batch already carries the reset template)
 *   - IP-80 RELATES_TO IP-42 (reset must not bypass an enrolled second factor)
 */
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const TARGET = "P1 Release Target: Jun 2026.";

const ticket = {
  title:
    "Self-serve password reset flow — forgot-password → emailed single-use token → set new password",
  priority: "HIGH",
  category: "Harden",
  body:
    "There is no self-serve account recovery today. Surfaced 2026-05-29 when the owner's login failed and the password had to be reset directly in the database. With forced 2FA now landing for admins / paid-workspace admins (IP-42 AC#6, IP-53), the lockout surface grows, so a real recovery path is needed.\n\n" +
    "Scope — credentials (email+password) account recovery:\n" +
    "  • 'Forgot password?' link on /login → /forgot-password (email input)\n" +
    "  • Single-use, time-limited reset token (e.g. 1h); stored as a SHA-256 hash, never plaintext (reuse the hashing pattern in src/lib/totp.ts)\n" +
    "  • Emailed reset link via the email service (IP-24) using the password-reset template (IP-30)\n" +
    "  • /reset-password?token= validates (unexpired + unused), lets the user set a new password (>=8), updates passwordHash, marks token used and invalidates other outstanding tokens for that user\n\n" +
    "2FA interaction (important): completing a password reset MUST NOT disable or bypass an enrolled second factor. After reset, a TOTP-enrolled user still needs their authenticator (or a backup code) at next login. Document the 'lost password AND lost 2FA device' path (backup codes, else support/admin reset).\n\n" +
    "Anti-abuse: neutral response regardless of whether the email exists (no account enumeration); rate-limit requests per email + per IP; write SecurityAuditLog rows (PASSWORD_RESET_REQUESTED, PASSWORD_RESET_COMPLETED) reusing the existing securityAuditLog model + logSecurityEvent helper.\n\n" +
    "Out of scope / future: passwordless (magic-link or email-OTP) login as an alternative sign-in method. Related but a distinct feature — spin a sibling ticket if pursued. OAuth-only accounts have no password to reset (orthogonal to this flow).",
  acceptance: [
    "/login has a 'Forgot password?' link to /forgot-password",
    "/forgot-password accepts an email and returns a neutral success message whether or not the account exists (no enumeration)",
    "Reset token is single-use, expires (<=1h), and is stored hashed (SHA-256) — never persisted or logged in plaintext",
    "Reset email is sent via the email service with a tokenized link (depends on IP-24 + IP-30 template)",
    "/reset-password?token= rejects expired/used/unknown tokens and lets a valid token set a new password (>=8 chars), updating passwordHash",
    "Completing a reset marks the token used and invalidates the user's other outstanding reset tokens",
    "A reset does NOT clear or bypass TOTP — a 2FA-enrolled user still needs their second factor at next login",
    "Requests are rate-limited per email and per IP; PASSWORD_RESET_REQUESTED + PASSWORD_RESET_COMPLETED written to SecurityAuditLog and visible at /profile/security",
    "Schema: PasswordResetToken (userId, tokenHash, expiresAt, usedAt) with index on tokenHash",
    "Verified end-to-end: request → receive link → set new password → sign in with it; expired/replayed tokens rejected",
  ],
  ownerNotes:
    "Triggered 2026-05-29 by an owner credential failure that required a manual DB reset (no self-serve path existed). Blocked on IP-24 (email service) to deliver the link; pairs with IP-30 (reset email template). Heightened by forced-2FA lockout risk (IP-42 AC#6 / IP-53). Passwordless/magic-link login is a related but separate feature — deferred; create a sibling ticket if it's pursued. " +
    TARGET,
};

const edges = [
  { from: "IP-24", to: "IP-80", type: "BLOCKS" },
  { from: "IP-80", to: "IP-30", type: "RELATES_TO" },
  { from: "IP-80", to: "IP-42", type: "RELATES_TO" },
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
          addedByEmail: "claude-code (password-reset gap flagged by owner 2026-05-29)",
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

    for (const e of edges) {
      const fromKey = e.from === "IP-80" ? row.ticketKey : e.from;
      const toKey = e.to === "IP-80" ? row.ticketKey : e.to;
      const fromTodo = await prisma.adminTodo.findUnique({
        where: { ticketKey: fromKey },
        select: { id: true },
      });
      const toTodo = await prisma.adminTodo.findUnique({
        where: { ticketKey: toKey },
        select: { id: true },
      });
      if (fromTodo && toTodo) {
        await prisma.adminTodoDependency.create({
          data: { fromId: fromTodo.id, toId: toTodo.id, type: e.type },
        });
        console.log(`  ${fromKey} --${e.type}--> ${toKey}`);
      } else {
        console.log(`  (skipped edge ${fromKey} --${e.type}--> ${toKey}: missing endpoint)`);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
})();
