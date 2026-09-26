import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loadMyScorecard, scorecardReviewer } from "@/lib/interview/scorecard-server";
import ScorecardForm from "./ScorecardForm";

export const metadata = { title: "Your scorecard", robots: { index: false, follow: false } };

type Props = { params: Promise<{ slug: string; id: string }> };

/** The signed-in interviewer's own scorecard. Host and panel only; others go to the report. */
export default async function ScorecardPage({ params }: Props) {
  const { slug, id } = await params;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) redirect(`/login?next=${encodeURIComponent(`/w/${slug}/interviews/${id}/scorecard`)}`);

  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: { id: true, members: { where: { userId: session.user.id }, select: { id: true } } },
  });
  if (!workspace) notFound();
  if (!workspace.members[0]) redirect("/dashboard");

  const s = await prisma.interviewSession.findFirst({ where: { id, workspaceId: workspace.id, type: { not: "take-home" } }, select: { id: true } });
  if (!s) notFound();

  const reviewer = await scorecardReviewer(s.id, { userId: session.user.id });
  if (!reviewer) redirect(`/w/${slug}/interviews/${s.id}/report`);
  const data = await loadMyScorecard(s.id, reviewer);
  if (!data) notFound();

  return <ScorecardForm initial={data} backHref={`/w/${slug}/interviews`} reportHref={`/w/${slug}/interviews/${s.id}/report`} />;
}
