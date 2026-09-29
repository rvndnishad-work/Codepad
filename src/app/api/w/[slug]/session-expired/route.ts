import { NextResponse } from "next/server";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeWorkspaceSettings, signInExpired } from "@/lib/workspace/settings";
import { signInAgainPath } from "@/lib/workspace/security";

type Params = { params: Promise<{ slug: string }> };

/**
 * The workspace gate sends a sign-in here when Settings > Security says it is
 * no longer good (older than the workspace's sign-in length, or from before
 * "Sign out everyone"). Layouts cannot clear cookies, so the sign-out happens
 * in this route, then the person lands on the sign-in page.
 *
 * It only signs out when the workspace rule really applies, so a link to this
 * route cannot be used to sign someone out for no reason.
 */
export async function GET(req: Request, { params }: Params) {
  const { slug } = await params;
  const back = new URL(`/w/${encodeURIComponent(slug)}`, req.url);
  const again = new URL(signInAgainPath(slug), req.url);

  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.redirect(again);

  const ws = await prisma.workspace.findUnique({
    where: { slug },
    select: {
      sessionsRevokedAt: true,
      sessionMaxAgeDays: true,
      members: { where: { userId: session.user.id }, select: { id: true } },
    },
  });
  if (!ws || !ws.members.length) return NextResponse.redirect(back);

  const settings = normalizeWorkspaceSettings(ws);
  const signedInAt = typeof session.signedInAt === "number" ? new Date(session.signedInAt) : null;
  if (!signInExpired(settings, signedInAt)) return NextResponse.redirect(back);

  // Clears the session cookie. With redirect: false it returns instead of throwing.
  await signOut({ redirect: false });
  return NextResponse.redirect(again);
}
