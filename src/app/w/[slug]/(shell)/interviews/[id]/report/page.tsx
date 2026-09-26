import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canMember } from "@/lib/permissions";
import { loadInterviewReport } from "@/lib/interview/report-server";
import { loadReportScorecards } from "@/lib/interview/scorecard-server";
import InterviewReportView from "./InterviewReportView";

export const metadata = { title: "Interview report", robots: { index: false, follow: false } };

type Props = { params: Promise<{ slug: string; id: string }> };

/** Report for a live interview, for any member of the workspace. */
export default async function InterviewReportPage({ params }: Props) {
  const { slug, id } = await params;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) redirect(`/login?next=${encodeURIComponent(`/w/${slug}/interviews/${id}/report`)}`);

  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: { id: true, members: { where: { userId: session.user.id }, select: { role: true, permissions: true } } },
  });
  if (!workspace) notFound();
  const member = workspace.members[0];
  if (!member) redirect("/dashboard");

  const s = await prisma.interviewSession.findFirst({
    where: { id, workspaceId: workspace.id, type: { not: "take-home" } },
    select: { id: true, userId: true, createdById: true },
  });
  if (!s) notFound();
  const report = await loadInterviewReport(s.id);
  if (!report) notFound();

  const [canManage, canConduct, scorecards] = await Promise.all([
    canMember(member, "interview:manage"),
    canMember(member, "interview:conduct"),
    loadReportScorecards(s.id, { userId: session.user.id }),
  ]);
  const isHost = s.userId === session.user.id;
  return (
    <InterviewReportView
      report={report}
      slug={slug}
      canDelete={isHost || canManage}
      scorecards={scorecards}
      scorecardHref={scorecards?.viewer.state ? `/w/${slug}/interviews/${s.id}/scorecard` : null}
      canEditPassMark={isHost || canManage}
      canNudge={isHost || s.createdById === session.user.id || canConduct}
    />
  );
}
