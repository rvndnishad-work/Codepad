import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CandidateError, resolveCandidateActor } from "@/lib/crm/candidates-server";
import { loadCandidatePerms, loadRoster, loadRosterLookups } from "@/lib/crm/roster-server";
import { summarizeBatch } from "@/lib/crm/batches";
import BatchClient from "./BatchClient";

type Props = { params: Promise<{ slug: string; batchId: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug, batchId } = await params;
  const b = await prisma.candidateBatch.findFirst({ where: { id: batchId, workspace: { slug } }, select: { name: true } });
  return { title: b ? `${b.name} — Batch` : "Batch not found", robots: { index: false, follow: false } };
}

export default async function BatchPage({ params }: Props) {
  const { slug, batchId } = await params;
  const actor = await resolveCandidateActor(slug).catch((err) => {
    if (err instanceof CandidateError && err.status === 401) redirect(`/login?next=/w/${slug}/batches/${batchId}`);
    if (err instanceof CandidateError && err.status === 404) notFound();
    redirect("/dashboard");
  });
  const batch = await prisma.candidateBatch.findFirst({
    where: { id: batchId, workspaceId: actor.workspaceId },
    include: { owner: { select: { name: true, email: true } } },
  });
  if (!batch) notFound();

  const [rows, lookups, perms] = await Promise.all([
    loadRoster(actor.workspaceId, actor.workspaceSlug, { batchId }),
    loadRosterLookups(actor.workspaceId),
    loadCandidatePerms(actor.member, actor.isManager),
  ]);
  // Latest note per candidate, for the compare panel.
  const notes = rows.length
    ? await prisma.candidateNote.findMany({
        where: { candidateId: { in: rows.map((r) => r.id) } },
        orderBy: { createdAt: "desc" },
        distinct: ["candidateId"],
        select: { candidateId: true, body: true },
      })
    : [];

  const summary = summarizeBatch(
    {
      id: batch.id,
      name: batch.name,
      roleTitle: batch.roleTitle,
      status: batch.status,
      ownerId: batch.ownerId,
      ownerName: batch.owner?.name || batch.owner?.email || null,
      deadline: batch.deadline?.toISOString() ?? null,
      targetHires: batch.targetHires,
      createdAt: batch.createdAt.toISOString(),
    },
    rows,
  );

  return (
    <BatchClient
      slug={slug}
      meId={actor.actorUserId}
      batch={summary}
      rows={rows}
      latestNotes={Object.fromEntries(notes.map((n) => [n.candidateId, n.body]))}
      batches={lookups.batches}
      members={lookups.members}
      perms={perms}
    />
  );
}
