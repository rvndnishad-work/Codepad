import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CandidateError, resolveCandidateActor } from "@/lib/crm/candidates-server";
import { loadCandidatePerms, loadRoster, loadRosterLookups } from "@/lib/crm/roster-server";
import CandidatesPageClient from "./CandidatesPageClient";

type Props = { params: Promise<{ slug: string }> };

export const metadata = { title: "Candidates — Interviewpad", robots: { index: false, follow: false } };

export default async function CandidatesPage({ params }: Props) {
  const { slug } = await params;
  const actor = await resolveCandidateActor(slug).catch((err) => {
    if (err instanceof CandidateError && err.status === 401) redirect(`/login?next=/w/${slug}/candidates`);
    if (err instanceof CandidateError && err.status === 404) notFound();
    redirect("/dashboard");
  });

  const [rows, lookups, perms, workspace] = await Promise.all([
    loadRoster(actor.workspaceId, actor.workspaceSlug),
    loadRosterLookups(actor.workspaceId),
    loadCandidatePerms(actor.member, actor.isManager),
    prisma.workspace.findUnique({ where: { id: actor.workspaceId }, select: { name: true } }),
  ]);

  return (
    <CandidatesPageClient
      slug={slug}
      workspaceName={workspace?.name ?? "this workspace"}
      meId={actor.actorUserId}
      rows={rows}
      batches={lookups.batches}
      members={lookups.members}
      perms={perms}
    />
  );
}
