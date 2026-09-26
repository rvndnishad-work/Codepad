import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loadMyScorecard, scorecardReviewer } from "@/lib/interview/scorecard-server";
import ScorecardForm from "@/app/w/[slug]/(shell)/interviews/[id]/scorecard/ScorecardForm";

export const metadata = { title: "Your scorecard", robots: { index: false, follow: false } };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ guest?: string }> };

/**
 * Scorecard for interviewers who are not workspace members: the `?guest=`
 * link from their email, or the room pass cookie from the room. Members are
 * sent to the scorecard inside their workspace.
 */
export default async function GuestScorecardPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { guest } = await searchParams;
  const session = await auth().catch(() => null);
  const s = await prisma.interviewSession.findUnique({ where: { id }, select: { id: true, workspaceId: true, workspace: { select: { slug: true } } } });
  if (!s || !s.workspaceId) notFound();

  if (session?.user?.id && s.workspace) {
    const member = await prisma.workspaceMember.findFirst({ where: { workspaceId: s.workspaceId, userId: session.user.id }, select: { id: true } });
    if (member) redirect(`/w/${s.workspace.slug}/interviews/${s.id}/scorecard`);
  }

  const hdrs = await headers();
  const token = typeof guest === "string" ? guest.slice(0, 64) : null;
  const reviewer = await scorecardReviewer(s.id, { userId: session?.user?.id ?? null, cookieHeader: hdrs.get("cookie"), guestToken: token });
  if (!reviewer) notFound();
  const data = await loadMyScorecard(s.id, reviewer);
  if (!data) notFound();

  const q = token ? `?guest=${encodeURIComponent(token)}` : "";
  return (
    <div className="min-h-screen bg-bg text-fg">
      <div className="max-w-[1120px] mx-auto w-full px-4 py-6 md:px-8 md:py-8">
        <ScorecardForm initial={data} apiQuery={q} backHref={null} reportHref={`/interview/${s.id}/report${q}`} />
      </div>
    </div>
  );
}
