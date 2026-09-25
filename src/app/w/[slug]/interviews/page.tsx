import { prisma } from "@/lib/prisma";
import { loadTakeHomeAccess } from "../take-homes/_lib";
import InterviewsList, { type InterviewRow } from "./InterviewsList";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ view?: string; q?: string }> };

export const metadata = { title: "Interviews — Interviewpad", robots: { index: false, follow: false } };

export default async function InterviewsPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const { workspace } = await loadTakeHomeAccess(slug, `/w/${slug}/interviews`);
  const sessions = await prisma.interviewSession.findMany({
    // Take-homes are InterviewSession rows too; they live under Take home.
    where: { workspaceId: workspace.id, type: { not: "take-home" } },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: {
      id: true,
      title: true,
      candidateName: true,
      candidateId: true,
      type: true,
      status: true,
      verdict: true,
      shortCode: true,
      shareToken: true,
      totalSec: true,
      scheduledAt: true,
      startedAt: true,
      finishedAt: true,
      createdAt: true,
      user: { select: { name: true, email: true } },
    },
  });

  const rows: InterviewRow[] = sessions.map((s) => {
    const done = !!s.finishedAt || s.status === "completed" || s.status === "finished";
    return {
      id: s.id,
      title: s.title,
      candidateName: s.candidateName,
      candidateId: s.candidateId,
      type: s.type,
      state: done ? "completed" : s.startedAt ? "live" : "scheduled",
      verdict: s.verdict,
      shortCode: s.shortCode,
      href: `/interview/${s.shareToken}`,
      minutes: Math.round(s.totalSec / 60),
      when: (s.finishedAt ?? s.startedAt ?? s.scheduledAt ?? s.createdAt).toISOString(),
      interviewer: s.user.name ?? s.user.email,
    };
  });

  return <InterviewsList slug={slug} rows={rows} view={sp.view ?? "all"} q={(sp.q ?? "").trim()} />;
}
