import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canMember } from "@/lib/permissions";
import { loadWizardData } from "@/lib/interview/wizard-server";
import InterviewWizard from "../_wizard/InterviewWizard";
import { toWizardRound } from "@/lib/interview/wizard";
import { loadWorkspaceSettings } from "@/lib/workspace/settings-server";
import { SETTINGS_DEFAULTS } from "@/lib/workspace/settings";
import { videoAddonAvailable, videoCallsOn } from "@/lib/video/addon";
import { videoOffer } from "@/lib/video/room-video";
import { recordingConfigured } from "@/lib/recording/live-server";
import { getEffectivePricing } from "@/lib/billing/pricing-copy-store";
import { formatUsd } from "@/lib/billing/plans";

export const metadata = { title: "New interview", robots: { index: false, follow: false } };

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ candidateId?: string; candidates?: string; challenges?: string; guide?: string; format?: string; rounds?: string }>;
};

const list = (v: string | undefined) => (v ?? "").split(",").map((s) => s.trim()).filter(Boolean);

export default async function NewInterviewPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) redirect(`/login?next=${encodeURIComponent(`/w/${slug}/interviews/new`)}`);
  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: { id: true, planName: true, trialEndsAt: true, stripeSubscriptionId: true, videoEnabled: true, members: { where: { userId: session.user.id }, select: { userId: true, role: true, permissions: true } } },
  });
  if (!workspace) notFound();
  const member = workspace.members[0];
  if (!member) redirect("/dashboard");
  if (!(await canMember(member, "interview:conduct"))) redirect(`/w/${slug}/interviews`);

  const [data, settings, canBill] = await Promise.all([loadWizardData(workspace.id, session.user.id), loadWorkspaceSettings(workspace.id), canMember(member, "billing:manage")]);
  // Built-in video add-on: the Call choice, or the one-line offer for people who manage billing.
  const videoOn = videoCallsOn(workspace);
  const offer = videoOffer({ interviewer: true, canManageBilling: canBill, addonOn: videoOn, planAllows: videoAddonAvailable(workspace), planName: workspace.planName });
  const offerPrice = offer.canOffer ? formatUsd((await getEffectivePricing()).videoAddon.monthlyCents) : "";
  // Links from the Question library and candidate pages start part-way in.
  const challengeIds = list(sp.challenges);
  const rounds = challengeIds.flatMap((id) => {
    const o = data.rounds.find((r) => r.kind === "challenge" && r.id === id);
    return o ? [toWizardRound(o)] : [];
  });
  const members = data.members.some((m) => m.userId === session.user.id)
    ? data.members
    : [...data.members, { userId: session.user.id, name: session.user.name ?? session.user.email ?? "You", email: session.user.email ?? "", role: member.role, image: null }];

  return (
    <InterviewWizard
      slug={slug}
      meId={session.user.id}
      people={data.people}
      members={members}
      roundOptions={data.rounds}
      guides={data.guides}
      bankCategories={data.bankCategories}
      video={{ on: videoOn, canOffer: offer.canOffer, offerUpgrade: offer.offerUpgrade, billingHref: `/w/${slug}/billing`, offerPrice, recordingReady: videoOn && recordingConfigured() }}
      defaultMinutes={settings?.interviewDefaultMinutes ?? SETTINGS_DEFAULTS.interviewDefaultMinutes}
      prefill={{
        candidateIds: [...list(sp.candidates), ...list(sp.candidateId)].slice(0, 20),
        rounds: rounds.slice(0, 10),
        guideId: data.guides.some((g) => g.id === sp.guide) ? sp.guide! : null,
        format: sp.format ?? null,
        // "candidateId:roundId" pairs from Next round due and a round report; the server checks each round on scheduling.
        roundIds: Object.fromEntries(
          list(sp.rounds)
            .map((pair) => pair.split(":"))
            .filter((p) => p.length === 2 && p[0] && p[1] && p[1].length <= 40)
            .slice(0, 20),
        ),
      }}
    />
  );
}
