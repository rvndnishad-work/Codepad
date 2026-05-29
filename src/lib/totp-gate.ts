/**
 * IP-42 AC #6 — forced 2FA enrollment gate.
 *
 * Admins and paid-plan workspace admins manage sensitive surfaces (MCP keys,
 * ATS webhooks, billing, candidate data). Once an org needs a second factor we
 * must *force* these populations to enroll before they can reach those surfaces.
 *
 * The gate lives in the `/admin` and `/w/[slug]` server layouts rather than in
 * edge middleware: those are the only surfaces these populations act on, the
 * check needs Prisma (server-only), and it sidesteps NextAuth-v5 edge/JWE
 * fragility. See `src/app/admin/layout.tsx` and `src/app/w/[slug]/layout.tsx`.
 *
 * AC #7 (OAuth 2FA path) is tracked separately as IP-54.
 */
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

/** Workspace plans that require their owners/admins to carry a second factor. */
export const PAID_PLANS = ["GROWTH", "ENTERPRISE"] as const;

/** Member roles that count as a workspace administrator for the 2FA gate. */
export const WORKSPACE_ADMIN_ROLES = ["OWNER", "ADMIN"] as const;

/**
 * If `required` is true and the user has not enrolled in TOTP, redirect them to
 * the enrollment page. A no-op when `required` is false or the user is already
 * enrolled, so it's cheap to call unconditionally from a layout.
 *
 * `redirect()` throws, so this never returns when it redirects.
 */
export async function ensureTotpEnrolledOrRedirect(
  userId: string,
  required: boolean,
): Promise<void> {
  if (!required) return;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { totpEnabledAt: true },
  });
  if (!user?.totpEnabledAt) {
    redirect("/profile/security?enroll=required");
  }
}
