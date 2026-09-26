import { notFound } from "next/navigation";
import { loadAiAccess } from "../_lib";
import { loadReport } from "@/lib/ai-interview/console-server";
import { canMember } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import ReportView from "../_components/report/ReportView";

type Props = {
  params: Promise<{ slug: string; sessionId: string }>;
  searchParams: Promise<{ tab?: string; round?: string }>;
};

export const metadata = { title: "Screening report — Interviewpad", robots: { index: false, follow: false } };

const TABS = ["summary", "theory", "code", "transcript", "run"] as const;
export type ReportTab = (typeof TABS)[number];

export default async function AiScreeningReportPage({ params, searchParams }: Props) {
  const { slug, sessionId } = await params;
  const sp = await searchParams;
  const access = await loadAiAccess(slug, `/w/${slug}/ai-interviews/${sessionId}`);
  if ("gate" in access) return access.gate;

  const report = await loadReport(access.workspace.id, sessionId, access.userId);
  if (!report) notFound();

  const member = await prisma.workspaceMember.findFirst({
    where: { workspaceId: access.workspace.id, userId: access.userId },
    select: { userId: true, role: true, permissions: true },
  });
  const [canDecide, canNote] = member
    ? await Promise.all([canMember(member, "candidate:manage_pipeline"), canMember(member, "candidate:write")])
    : [false, false];

  const tab = (TABS as readonly string[]).includes(sp.tab ?? "") ? (sp.tab as ReportTab) : "summary";
  const round = Math.max(0, Math.min(report.rounds.length - 1, Number(sp.round) || 0));

  return (
    <ReportView
      slug={slug}
      report={report}
      tab={tab}
      round={round}
      canManage={access.canCreate}
      canDecide={canDecide}
      canNote={canNote}
    />
  );
}
