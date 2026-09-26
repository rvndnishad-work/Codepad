import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canMember } from "@/lib/permissions";
import { loadGuides, loadMembers, loadRoundOptions } from "@/lib/interview/wizard-server";
import { formatOf, isInterviewerFor, roundKey, type WizardRound } from "@/lib/interview/wizard";
import PickQuestions from "../../_wizard/PickQuestions";

export const metadata = { title: "Interview questions", robots: { index: false, follow: false } };

type Props = { params: Promise<{ slug: string; id: string }> };

function ids(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export default async function InterviewQuestionsPage({ params }: Props) {
  const { slug, id } = await params;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) redirect(`/login?next=${encodeURIComponent(`/w/${slug}/interviews/${id}/questions`)}`);
  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: { id: true, members: { where: { userId: session.user.id }, select: { userId: true, role: true, permissions: true } } },
  });
  if (!workspace) notFound();
  const member = workspace.members[0];
  if (!member) redirect("/dashboard");

  const s = await prisma.interviewSession.findFirst({
    where: { id, workspaceId: workspace.id, type: "live" },
    select: {
      id: true,
      title: true,
      candidateName: true,
      status: true,
      scheduledAt: true,
      totalSec: true,
      format: true,
      userId: true,
      panelJson: true,
      questionPlan: true,
      questionsOwnerId: true,
      questionsNote: true,
      guideTemplateId: true,
      challengeIds: true,
      playgroundIds: true,
      promptScenarioIds: true,
      setupGroupId: true,
      createdById: true,
      user: { select: { name: true, email: true } },
    },
  });
  if (!s) notFound();

  const canEdit = (await canMember(member, "interview:conduct")) || s.questionsOwnerId === session.user.id || isInterviewerFor(s, session.user.id);
  const [roundOptions, guides, members, siblings] = await Promise.all([
    loadRoundOptions(workspace.id, session.user.id),
    loadGuides(workspace.id),
    loadMembers(workspace.id),
    s.setupGroupId
      ? prisma.interviewSession.count({ where: { setupGroupId: s.setupGroupId, status: "scheduled", id: { not: s.id } } })
      : Promise.resolve(0),
  ]);

  // Rounds already on the session, in their stored order. Playgrounds were
  // copied into the host's editors, so show them by their saved title.
  const byKey = new Map(roundOptions.map((o) => [roundKey(o), o]));
  const snippetRows = ids(s.playgroundIds).length
    ? await prisma.snippet.findMany({ where: { id: { in: ids(s.playgroundIds) } }, select: { id: true, title: true } })
    : [];
  const current: WizardRound[] = [
    ...ids(s.challengeIds).map((cid) => ({ kind: "challenge" as const, id: cid })),
    ...ids(s.playgroundIds).map((pid) => ({ kind: "playground" as const, id: pid })),
    ...ids(s.promptScenarioIds).map((pid) => ({ kind: "prompt" as const, id: pid })),
  ].flatMap((r) => {
    const o = byKey.get(roundKey(r));
    if (o) return [{ key: roundKey(r), kind: r.kind, id: r.id, title: o.title, minutes: o.minutes }];
    const snip = r.kind === "playground" ? snippetRows.find((x) => x.id === r.id) : null;
    return snip ? [{ key: roundKey(r), kind: r.kind, id: r.id, title: snip.title, minutes: 20 }] : [];
  });

  const nameOf = (uid: string | null) => (uid ? (members.find((m) => m.userId === uid)?.name ?? null) : null);
  const format = formatOf(s.format) ?? formatOf("coding")!;

  return (
    <PickQuestions
      slug={slug}
      sessionId={s.id}
      meId={session.user.id}
      canEdit={canEdit && s.status === "scheduled"}
      locked={s.status !== "scheduled"}
      formatId={format.id}
      summary={{
        title: s.title,
        candidate: s.candidateName,
        host: s.user.name ?? s.user.email ?? "Unknown",
        when: s.scheduledAt ? s.scheduledAt.toISOString() : null,
        minutes: Math.round(s.totalSec / 60),
        requestedBy: nameOf(s.createdById) ?? (s.questionsOwnerId ? s.user.name : null),
        note: s.questionsNote,
        owner: nameOf(s.questionsOwnerId),
      }}
      initial={{ plan: s.questionPlan === "open" ? "open" : "set", rounds: current, guideId: s.guideTemplateId }}
      siblings={siblings}
      roundOptions={roundOptions}
      guides={guides}
      members={members}
    />
  );
}
