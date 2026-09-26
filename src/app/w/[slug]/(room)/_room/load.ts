import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loadRoom } from "@/lib/interview/room-server";
import { ensureTotpEnrolledOrRedirect, PAID_PLANS, WORKSPACE_ADMIN_ROLES } from "@/lib/totp-gate";

/** Loads the room for this request, or says why it cannot be opened. */
export async function roomForRequest(slug: string, id: string) {
  const [session, hdrs] = await Promise.all([auth().catch(() => null), headers()]);
  const user = session?.user?.id ? { id: session.user.id, name: session.user.name, email: session.user.email } : null;
  const res = await loadRoom(slug, id, { user, cookieHeader: hdrs.get("cookie") });
  if (!res.ok && res.reason === "missing") notFound();

  // Same second-factor rule as the workspace itself: owners and admins of a
  // paid workspace must have 2FA before they see candidate data.
  if (res.ok && res.data.viewer.via === "member" && user) {
    const m = await prisma.workspaceMember.findFirst({
      where: { userId: user.id, workspace: { slug } },
      select: { role: true, workspace: { select: { planName: true } } },
    });
    if (m) {
      const must = (WORKSPACE_ADMIN_ROLES as readonly string[]).includes(m.role) && (PAID_PLANS as readonly string[]).includes(m.workspace.planName);
      await ensureTotpEnrolledOrRedirect(user.id, must);
    }
  }
  return { res, signedIn: !!user };
}
