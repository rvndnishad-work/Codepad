import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loadRoom } from "@/lib/interview/room-server";
import { movedPagePath, movedWorkspaceSlug } from "@/lib/workspace/slug-redirect";
import { ensureTotpEnrolledOrRedirect } from "@/lib/totp-gate";
import { normalizeWorkspaceSettings, signInExpired, twoFactorRequired } from "@/lib/workspace/settings";
import { signedOutPath } from "@/lib/workspace/security";

/** Loads the room for this request, or says why it cannot be opened. */
export async function roomForRequest(slug: string, id: string) {
  const [session, hdrs] = await Promise.all([auth().catch(() => null), headers()]);
  const user = session?.user?.id ? { id: session.user.id, name: session.user.name, email: session.user.email } : null;
  const res = await loadRoom(slug, id, { user, cookieHeader: hdrs.get("cookie") });
  if (!res.ok && res.reason === "missing") {
    // Links sent before the workspace changed its web address.
    const moved = await movedWorkspaceSlug(slug);
    if (moved) redirect(await movedPagePath(slug, moved, `/w/${slug}/interviews/${id}/lobby`));
    notFound();
  }

  // Same rules as the workspace itself (see (shell)/layout.tsx): a sign-in
  // the workspace no longer accepts signs in again, and two-factor is needed
  // by owners and admins of a paid workspace, or by everyone once Settings >
  // Security turns that on.
  if (res.ok && res.data.viewer.via === "member" && user) {
    const m = await prisma.workspaceMember.findFirst({
      where: { userId: user.id, workspace: { slug } },
      select: {
        role: true,
        workspace: {
          select: { planName: true, require2faForAll: true, require2faFrom: true, sessionsRevokedAt: true, sessionMaxAgeDays: true },
        },
      },
    });
    if (m) {
      const settings = normalizeWorkspaceSettings(m.workspace);
      const signedInAt = typeof session?.signedInAt === "number" ? new Date(session.signedInAt) : null;
      if (signInExpired(settings, signedInAt)) redirect(signedOutPath(slug));
      await ensureTotpEnrolledOrRedirect(user.id, twoFactorRequired(settings, m, m.workspace.planName));
    }
  }
  return { res, signedIn: !!user };
}
