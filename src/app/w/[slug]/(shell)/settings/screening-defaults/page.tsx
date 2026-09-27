import { prisma } from "@/lib/prisma";
import { getSettingsPageContext } from "@/lib/workspace/settings-server";
import ScreeningDefaults from "./ScreeningDefaults";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const ws = await prisma.workspace.findUnique({ where: { slug }, select: { name: true } });
  return { title: ws ? `Screening defaults settings · ${ws.name} — Interviewpad` : "Workspace not found", robots: { index: false } };
}

/** Settings > Screening defaults: what new take-homes, AI screenings and interviews start with. */
export default async function ScreeningDefaultsSettingsPage({ params }: Props) {
  const { slug } = await params;
  const { settings: s, canEdit } = await getSettingsPageContext(slug);
  return (
    <ScreeningDefaults
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
