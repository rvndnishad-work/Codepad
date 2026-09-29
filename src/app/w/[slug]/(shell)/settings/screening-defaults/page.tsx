import { prisma } from "@/lib/prisma";
import { getSettingsPageContext } from "@/lib/workspace/settings-server";
import { canMember } from "@/lib/permissions";
import { listPlans } from "@/lib/interview/plans-server";
import ScreeningDefaults from "./ScreeningDefaults";
import InterviewPlans from "./InterviewPlans";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const ws = await prisma.workspace.findUnique({ where: { slug }, select: { name: true } });
  return { title: ws ? `Screening defaults settings · ${ws.name} — Interviewpad` : "Workspace not found", robots: { index: false } };
}

/** Settings > Screening defaults: what new take-homes, AI screenings and interviews start with. */
export default async function ScreeningDefaultsSettingsPage({ params }: Props) {
  const { slug } = await params;
  const { settings: s, canEdit, workspace, me } = await getSettingsPageContext(slug);
  const [plans, member] = await Promise.all([
    listPlans(workspace.id),
    prisma.workspaceMember.findFirst({ where: { workspaceId: workspace.id, userId: me.userId }, select: { role: true, permissions: true } }),
  ]);
  const canWrite = member ? await canMember(member, "candidate:write") : false;
  return (
    <ScreeningDefaults
      plans={<InterviewPlans slug={slug} plans={plans} hiringType={s.hiringType} canEdit={canEdit} canWrite={canWrite} />}
      slug={slug}
      canEdit={canEdit}
      initial={{
        defaultTakeHomePassMark: s.defaultTakeHomePassMark,
        defaultAiPassMark: s.defaultAiPassMark,
        defaultInterviewPassMark: s.defaultInterviewPassMark,
        inviteExpiryDays: s.inviteExpiryDays,
        remindNotStarted: s.remindNotStarted,
        remindBeforeDeadline: s.remindBeforeDeadline,
        aiDefaultMinutes: s.aiDefaultMinutes,
        keepVoiceAnswers: s.keepVoiceAnswers,
        interviewerLanguage: s.interviewerLanguage,
        interviewDefaultMinutes: s.interviewDefaultMinutes,
        scorecardFirst: s.scorecardFirst,
        scorecardReminderHours: s.scorecardReminderHours,
      }}
    />
  );
}
