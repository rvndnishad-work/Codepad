import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import AtsIntegrationClient from "./AtsIntegrationClient";
import { getAtsIntegrationView } from "./actions";
import { workspacePlanAllowsAiScreening } from "@/lib/ai-interview/credits";
import { canMember } from "@/lib/permissions";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return { title: `ATS — ${slug} — Interviewpad` };
}

export default async function AtsIntegrationPage({ params }: Props) {
  const { slug } = await params;

  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    redirect(`/login?next=${encodeURIComponent(`/w/${slug}/ats`)}`);
  }

  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      planName: true,
      members: { select: { userId: true, role: true, permissions: true } },
    },
  });
  if (!workspace) notFound();

  const member = workspace.members.find((m) => m.userId === session.user.id);
  if (!member) redirect("/dashboard");

  const isAdmin = await canMember(member, "integration:manage");
  const planAllowed = workspacePlanAllowsAiScreening(workspace.planName);
  const view = await getAtsIntegrationView(slug);

  return (
    <AtsIntegrationClient
      slug={slug}
      workspaceName={workspace.name}
      planName={workspace.planName}
      planAllowed={planAllowed}
      isAdmin={isAdmin}
      initialView={view}
    />
  );
}
