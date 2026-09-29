import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CandidateError, resolveCandidateActor } from "@/lib/crm/candidates-server";
import { loadCandidatePerms, loadRoster, loadRosterLookups } from "@/lib/crm/roster-server";
import { summarizeBatch } from "@/lib/crm/batches";
import BatchesClient from "./BatchesClient";

type Props = { params: Promise<{ slug: string }> };

export const metadata = { title: "Batches — Interviewpad", robots: { index: false, follow: false } };

export default async function BatchesPage({ params }: Props) {
  const { slug } = await params;
  const actor = await resolveCandidateActor(slug).catch((err) => {
    if (err instanceof CandidateError && err.status === 401) redirect(`/login?next=/w/${slug}/batches`);
    if (err instanceof CandidateError && err.status === 404) notFound();
    redirect("/dashboard");
  });
  const [batches, rows, lookups, perms] = await Promise.all([
    prisma.candidateBatch.findMany({
      where: { workspaceId: actor.workspaceId },
      orderBy: [{ status: "desc" }, { deadline: "asc" }, { createdAt: "desc" }],
      include: { owner: { select: { name: true, email: true } } },
    }),
    loadRoster(actor.workspaceId, actor.workspaceSlug),
    loadRosterLookups(actor.workspaceId),
    loadCandidatePerms(actor.member, actor.isManager),
  ]);
  const summaries = batches.map((b) =>
    summarizeBatch(
      {
        id: b.id,
        name: b.name,
        roleTitle: b.roleTitle,
        status: b.status,
        ownerId: b.ownerId,
        ownerName: b.owner?.name || b.owner?.email || null,
        deadline: b.deadline?.toISOString() ?? null,
        targetHires: b.targetHires,
        createdAt: b.createdAt.toISOString(),
      },
      rows,
    ),
  );
  return (
    <BatchesClient
      slug={slug}
      meId={actor.actorUserId}
      batches={summaries}
      totalCandidates={rows.filter((r) => r.status !== "archived").length}
      unbatched={rows.filter((r) => r.status !== "archived" && !r.batchId).length}
      members={lookups.members}
      allBatches={lookups.batches}
      perms={perms}
    />
  );
}
