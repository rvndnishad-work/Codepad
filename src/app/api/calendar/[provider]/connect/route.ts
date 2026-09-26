import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { appOrigin } from "@/lib/interview/links";
import { authorizeUrl, isCalendarProvider, providerConfig } from "@/lib/calendar/providers";
import { signState } from "@/lib/calendar/state";

/**
 * Starts connecting the signed-in member's own Google or Microsoft calendar
 * to a workspace: `/api/calendar/google/connect?slug=acme`. Optional `next`
 * is a path inside that workspace to return to afterwards.
 */
export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const url = new URL(req.url);
  const slug = (url.searchParams.get("slug") ?? "").slice(0, 80);
  const origin = await appOrigin();
  const back = (q: string) => NextResponse.redirect(`${origin}/w/${encodeURIComponent(slug)}/calendar?${q}`);

  if (!isCalendarProvider(provider)) return NextResponse.json({ error: "unknown provider" }, { status: 404 });
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.redirect(`${origin}/login?next=${encodeURIComponent(`/api/calendar/${provider}/connect?slug=${slug}`)}`);
  }
  const workspace = slug
    ? await prisma.workspace.findUnique({ where: { slug }, select: { id: true, members: { where: { userId: session.user.id }, select: { userId: true } } } })
    : null;
  if (!workspace || workspace.members.length === 0) return NextResponse.json({ error: "not found" }, { status: 404 });

  const cfg = providerConfig(provider);
  if (!cfg) return back("error=not_configured");

  const next = url.searchParams.get("next");
  const returnTo = next && next.startsWith(`/w/${slug}/`) && !next.includes("//") ? next.slice(0, 300) : null;
  const state = signState({ userId: session.user.id, workspaceId: workspace.id, slug, provider, returnTo });
  return NextResponse.redirect(authorizeUrl(provider, cfg, `${origin}/api/calendar/${provider}/callback`, state, session.user.email));
}
