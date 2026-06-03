"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  buildOtpauthUri,
  decryptTotpSecret,
  encryptTotpSecret,
  generateTotpSecret,
  mintBackupCodes,
  verifyTotpCode,
} from "@/lib/totp";

/**
 * Per-user 2FA actions (IP-42). All security-mutating calls write a
 * SecurityAuditLog row so we can prove "X enabled 2FA at Y" later — the
 * compliance ask we kept hitting in enterprise procurement reviews.
 *
 * Flow:
 *   1. startTotpEnrollmentAction()  → mints secret, encrypts, persists as
 *      pending (totpEnabledAt = null), returns secret + otpauth URI.
 *   2. verifyTotpEnrollmentAction(code) → verifies the code against the
 *      pending secret. On success: marks totpEnabledAt = now(), mints backup
 *      codes, and returns the plaintext backup codes ONCE for the user to
 *      save.
 *   3. disableTotpAction(code)      → verifies a current 6-digit code, then
 *      wipes secret/timestamps/backup codes.
 *   4. regenerateBackupCodesAction(code) → re-mints codes after verifying.
 *
 * We require a fresh TOTP code to disable / regenerate, not just session
 * auth, so a stolen browser session can't strip 2FA off the account.
 */

async function requireSession() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) throw new Error("Not authenticated");
  return { userId: session.user.id, email: session.user.email ?? null };
}

async function recordEvent(
  userId: string,
  event: string,
  meta?: Record<string, unknown>,
) {
  try {
    const hdrs = await headers();
    await prisma.securityAuditLog.create({
      data: {
        userId,
        event,
        ip:
          hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          hdrs.get("x-real-ip") ??
          null,
        userAgent: hdrs.get("user-agent") ?? null,
        meta: meta ? JSON.stringify(meta) : null,
      },
    });
  } catch (err) {
    // Audit write failures should never block the user-facing action — log
    // for ops and move on. (When a SecurityAuditLog rollup ships in IP-37,
    // this is the only path that needs to harden.)
    console.error("[security] audit write failed:", err);
  }
}

export type TotpStatus = {
  enrolled: boolean;
  pendingEnrollment: boolean;
  unusedBackupCodes: number;
};

export async function getTotpStatusAction(): Promise<TotpStatus> {
  const { userId } = await requireSession();
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { totpSecret: true, totpEnabledAt: true, totpBackupCodes: true },
  });
  let unused = 0;
  if (u?.totpBackupCodes) {
    try {
      const parsed = JSON.parse(u.totpBackupCodes);
      if (Array.isArray(parsed)) {
        unused = parsed.filter((c) => c && c.usedAt === null).length;
      }
    } catch {
      unused = 0;
    }
  }
  return {
    enrolled: !!u?.totpEnabledAt,
    pendingEnrollment: !!u?.totpSecret && !u?.totpEnabledAt,
    unusedBackupCodes: unused,
  };
}

export type StartEnrollmentResult = {
  /** Plaintext secret (also embedded in the URI) so the user can type-enter
   *  it into an authenticator app that doesn't scan QRs. */
  secret: string;
  otpauthUri: string;
  /** What account label the QR encodes — for displaying back to the user. */
  accountLabel: string;
};

export async function startTotpEnrollmentAction(): Promise<StartEnrollmentResult> {
  const { userId, email } = await requireSession();

  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { totpEnabledAt: true, email: true },
  });
  if (existing?.totpEnabledAt) {
    throw new Error("2FA is already enabled. Disable it first to re-enroll.");
  }

  const secret = generateTotpSecret();
  const label = email ?? existing?.email ?? `user-${userId.slice(0, 8)}`;
  const otpauthUri = buildOtpauthUri(secret, label);

  // Store as pending — totpEnabledAt stays null until verify completes.
  await prisma.user.update({
    where: { id: userId },
    data: {
      totpSecret: encryptTotpSecret(secret),
      totpEnabledAt: null,
      // Clear any orphan backup codes from a previous failed enrollment.
      totpBackupCodes: null,
    },
  });

  await recordEvent(userId, "TOTP_ENROLL_START");

  return { secret, otpauthUri, accountLabel: label };
}

export type VerifyEnrollmentResult = {
  /** Plaintext backup codes — shown ONCE on the success screen and never
   *  returned again. */
  backupCodes: string[];
};

export async function verifyTotpEnrollmentAction(
  code: string,
): Promise<VerifyEnrollmentResult> {
  const { userId } = await requireSession();

  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { totpSecret: true, totpEnabledAt: true },
  });
  if (!u?.totpSecret) throw new Error("No pending enrollment. Start setup first.");
  if (u.totpEnabledAt) throw new Error("2FA is already enabled.");

  const plaintext = decryptTotpSecret(u.totpSecret);
  if (!verifyTotpCode(plaintext, code)) {
    await recordEvent(userId, "TOTP_VERIFY_FAILED", { phase: "enroll" });
    throw new Error("That code didn't match. Try the next one — they roll every 30 seconds.");
  }

  const { plaintext: codes, stored } = mintBackupCodes();
  await prisma.user.update({
    where: { id: userId },
    data: {
      totpEnabledAt: new Date(),
      totpBackupCodes: stored,
    },
  });

  await recordEvent(userId, "TOTP_ENROLL_VERIFY");
  // IP-44: self-notification so the user gets a record of the enablement
  // in their bell (useful for spotting unauthorized changes later).
  const { notify2faEnabled } = await import("@/lib/notifications/triggers");
  void notify2faEnabled(userId);

  revalidatePath("/profile/security");
  return { backupCodes: codes };
}

export async function disableTotpAction(code: string): Promise<{ ok: true }> {
  const { userId } = await requireSession();
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { totpSecret: true, totpEnabledAt: true },
  });
  if (!u?.totpEnabledAt || !u.totpSecret) {
    throw new Error("2FA isn't enabled on this account.");
  }
  const plaintext = decryptTotpSecret(u.totpSecret);
  if (!verifyTotpCode(plaintext, code)) {
    await recordEvent(userId, "TOTP_VERIFY_FAILED", { phase: "disable" });
    throw new Error("That code didn't match. 2FA stays enabled.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      totpSecret: null,
      totpEnabledAt: null,
      totpBackupCodes: null,
    },
  });
  await recordEvent(userId, "TOTP_DISABLE");
  // IP-44: self-notification — and importantly, the "if this wasn't you,
  // change your password" body doubles as an incident-response prompt.
  const { notify2faDisabled } = await import("@/lib/notifications/triggers");
  void notify2faDisabled(userId);

  revalidatePath("/profile/security");
  return { ok: true };
}

export async function regenerateBackupCodesAction(
  code: string,
): Promise<{ backupCodes: string[] }> {
  const { userId } = await requireSession();
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { totpSecret: true, totpEnabledAt: true },
  });
  if (!u?.totpEnabledAt || !u.totpSecret) {
    throw new Error("2FA isn't enabled on this account.");
  }
  const plaintext = decryptTotpSecret(u.totpSecret);
  if (!verifyTotpCode(plaintext, code)) {
    await recordEvent(userId, "TOTP_VERIFY_FAILED", { phase: "regen" });
    throw new Error("That code didn't match. Backup codes are unchanged.");
  }

  const { plaintext: codes, stored } = mintBackupCodes();
  await prisma.user.update({
    where: { id: userId },
    data: { totpBackupCodes: stored },
  });
  await recordEvent(userId, "TOTP_BACKUP_REGEN");
  revalidatePath("/profile/security");
  return { backupCodes: codes };
}

export async function cancelPendingEnrollmentAction(): Promise<{ ok: true }> {
  const { userId } = await requireSession();
  // Wipe a pending (unverified) secret so a stale "Set up 2FA" page can't
  // resurrect a partial enrollment from yesterday. No-op if there's nothing
  // pending.
  await prisma.user.updateMany({
    where: { id: userId, totpEnabledAt: null },
    data: { totpSecret: null, totpBackupCodes: null },
  });
  revalidatePath("/profile/security");
  return { ok: true };
}
