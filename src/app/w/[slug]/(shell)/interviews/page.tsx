import { prisma } from "@/lib/prisma";
import { loadTakeHomeAccess } from "../take-homes/_lib";
import { formatOf, isInterviewerFor, parsePanel, questionState } from "@/lib/interview/wizard";
import { candidateRoomPath } from "@/lib/interview/room-server";
import InterviewsList, { type InterviewRow } from "./InterviewsList";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ view?: string; q?: string }> };

export const metadata = { title: "Interviews", robots: { index: false, follow: false } };

export default async function InterviewsPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const { workspace, userId } = await loadTakeHomeAccess(slug, `/w/${slug}/interviews`);
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
      format: true,
      panelJson: true,
      createdById: true,
      questionPlan: true,
      questionsOwnerId: true,
      guideTemplateId: true,
      guideJson: true,
      challengeIds: true,
      playgroundIds: true,
      promptScenarioIds: true,
      userId: true,
      user: { select: { name: true, email: true } },
      guests: { select: { email: true }, orderBy: { createdAt: "asc" } },
    },
  });
  const count = (raw: string) => {
    try {
      const v = JSON.parse(raw);
      return Array.isArray(v) ? v.length : 0;
    } catch {
      return 0;
    }
  };
  const peopleIds = [...new Set(sessions.flatMap((s) => [...parsePanel(s.panelJson), ...(s.questionsOwnerId ? [s.questionsOwnerId] : [])]))];
  const people = peopleIds.length ? await prisma.user.findMany({ where: { id: { in: peopleIds } }, select: { id: true, name: true, email: true } }) : [];
  const nameOf = new Map(people.map((u) => [u.id, u.name ?? u.email ?? "Teammate"]));

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
      // Only the host and panel open the interviewer side. The share token
      // gives the candidate side, so it is only ever copied, never opened here.
      // Interviewers open the workspace lobby; any member can read a report.
      href: done ? `/interview/${s.id}/report` : isInterviewerFor(s, userId) || s.createdById === userId ? `/w/${slug}/interviews/${s.id}/lobby` : null,
      // Private, expiring link for the candidate (copied, never opened here).
      candidateLink: s.type === "live" ? candidateRoomPath(s, slug) : `/interview/${s.id}?token=${s.shareToken}`,
      minutes: Math.round(s.totalSec / 60),
      when: (s.finishedAt ?? s.startedAt ?? s.scheduledAt)?.toISOString() ?? (s.format ? null : s.createdAt.toISOString()),
      interviewer: s.user.name ?? s.user.email,
      // Emailed interviewers (no account) show by their address.
      panel: [...parsePanel(s.panelJson).map((id) => nameOf.get(id) ?? "Teammate"), ...s.guests.map((g) => g.email)],
      format: formatOf(s.format)?.label ?? null,
      questions: done
        ? "ready"
        : questionState({
            questionPlan: s.questionPlan,
            roundCount: count(s.challengeIds) + count(s.playgroundIds) + count(s.promptScenarioIds),
            guideTemplateId: s.guideTemplateId ?? (s.guideJson ? "bank" : null),
          }),
      questionsOwner: s.questionsOwnerId ? (nameOf.get(s.questionsOwnerId) ?? "A teammate") : null,
      mineToPick: s.questionsOwnerId === userId,
    };
  });

  return <InterviewsList slug={slug} rows={rows} view={sp.view ?? "all"} q={(sp.q ?? "").trim()} />;
}
