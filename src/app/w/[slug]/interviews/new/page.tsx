import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canMember } from "@/lib/permissions";
import { loadWizardData } from "@/lib/interview/wizard-server";
import InterviewWizard from "../_wizard/InterviewWizard";
import { toWizardRound } from "@/lib/interview/wizard";

export const metadata = { title: "New interview", robots: { index: false, follow: false } };

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ candidateId?: string; candidates?: string; challenges?: string; guide?: string; format?: string }>;
};

const list = (v: string | undefined) => (v ?? "").split(",").map((s) => s.trim()).filter(Boolean);

export default async function NewInterviewPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) redirect(`/login?next=${encodeURIComponent(`/w/${slug}/interviews/new`)}`);
  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: { id: true, members: { where: { userId: session.user.id }, select: { userId: true, role: true, permissions: true } } },
  });
  if (!workspace) notFound();
  const member = workspace.members[0];
  if (!member) redirect("/dashboard");
  if (!(await canMember(member, "interview:conduct"))) redirect(`/w/${slug}/interviews`);

  const data = await loadWizardData(workspace.id, session.user.id);
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
      prefill={{
        candidateIds: [...list(sp.candidates), ...list(sp.candidateId)].slice(0, 20),
        rounds: rounds.slice(0, 10),
        guideId: data.guides.some((g) => g.id === sp.guide) ? sp.guide! : null,
        format: sp.format ?? null,
      }}
    />
  );
}
