import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CandidateError, resolveCandidateActor } from "@/lib/crm/candidates-server";
import { loadCandidatePerms, loadRoster, loadRosterLookups } from "@/lib/crm/roster-server";
import { describeAudit, resultActivity, type ActivityItem } from "@/lib/crm/activity";
import CandidateProfileClient from "./CandidateProfileClient";

type Props = { params: Promise<{ slug: string; id: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug, id } = await params;
  // Scoped to the workspace so a guessed id cannot leak a name from elsewhere.
  const candidate = await prisma.candidate.findFirst({
    where: { id, workspace: { slug } },
    select: { name: true },
  });
  return { title: candidate ? `${candidate.name} — Candidate` : "Candidate not found", robots: { index: false, follow: false } };
}

export default async function CandidateProfilePage({ params }: Props) {
  const { slug, id } = await params;
  const actor = await resolveCandidateActor(slug).catch((err) => {
    if (err instanceof CandidateError && err.status === 401) redirect(`/login?next=/w/${slug}/candidates/${id}`);
    if (err instanceof CandidateError && err.status === 404) notFound();
    redirect("/dashboard");
  });

  const [rows, lookups, perms, notes, audit, candidate] = await Promise.all([
    loadRoster(actor.workspaceId, actor.workspaceSlug, { ids: [id] }),
    loadRosterLookups(actor.workspaceId),
    loadCandidatePerms(actor.member, actor.isManager),
    prisma.candidateNote.findMany({
      where: { candidateId: id, candidate: { workspaceId: actor.workspaceId } },
      orderBy: { createdAt: "desc" },
      select: { id: true, body: true, createdAt: true, authorId: true, author: { select: { name: true, email: true } } },
    }),
    prisma.workspaceAuditLog.findMany({
      where: { workspaceId: actor.workspaceId, targetType: "candidate", targetId: id },
      orderBy: { createdAt: "asc" },
      take: 300,
      select: { id: true, action: true, meta: true, createdAt: true, actorEmail: true, actorUserId: true },
    }),
    prisma.candidate.findFirst({ where: { id, workspaceId: actor.workspaceId }, select: { rejectReasonNote: true, createdAt: true } }),
  ]);
  const row = rows[0];
  if (!row || !candidate) notFound();

  const memberName = (uid: string | null) => lookups.members.find((m) => m.id === uid)?.name ?? null;
  // Who made the current decision: the newest move into it. Older rows use
  // the pre-screening names (Offer and Hired became Passed).
  const decisionStages = row?.stage === "PASSED" ? ["PASSED", "OFFER", "HIRED"] : row?.stage === "REJECTED" ? ["REJECTED"] : [];
  const decisionRow = [...audit].reverse().find((a) => {
    if (a.action !== "PIPELINE_STAGE_CHANGED") return false;
    try {
      return decisionStages.includes(JSON.parse(a.meta ?? "{}").toStage);
    } catch {
      return false;
    }
  });
  const decidedBy = decisionRow ? (memberName(decisionRow.actorUserId) ?? decisionRow.actorEmail) : null;
  const batchName = (bid: string | null) => lookups.batches.find((b) => b.id === bid)?.name ?? null;
  // Notes come from their own table so older notes (added before notes were
  // audited) show too; the NOTE_ADDED audit rows would only duplicate them.
  const noteItems: ActivityItem[] = notes.map((n) => ({
    id: `note_${n.id}`,
    kind: "note",
    title: `Note from ${n.author?.name ?? n.author?.email ?? "a teammate"}`,
    detail: n.body.length > 140 ? `${n.body.slice(0, 140).trimEnd()}…` : n.body,
    at: n.createdAt.toISOString(),
    href: null,
  }));
  // Candidates added before the revamp have no CANDIDATE_CREATED row.
  const createdItem: ActivityItem[] = audit.some((a) => a.action === "CANDIDATE_CREATED")
    ? []
    : [{ id: "created", kind: "created", title: "Added to the workspace", detail: null, at: candidate.createdAt.toISOString(), href: null }];
  const activity: ActivityItem[] = [
    ...noteItems,
    ...createdItem,
    ...audit
      .filter((a) => a.action !== "CANDIDATE_NOTE_ADDED")
      .map((a) =>
        describeAudit(
          {
            id: a.id,
            action: a.action,
            meta: a.meta,
            createdAt: a.createdAt.toISOString(),
            actorName: memberName(a.actorUserId) ?? a.actorEmail,
          },
          { batch: batchName, member: memberName },
        ),
      )
      .filter((x): x is ActivityItem => !!x),
    ...resultActivity(row.results),
  ].sort((a, b) => +new Date(b.at) - +new Date(a.at));

  return (
    <CandidateProfileClient
      slug={slug}
      meId={actor.actorUserId}
      row={row}
      rejectNote={candidate.rejectReasonNote}
      decidedBy={decidedBy}
      notes={notes.map((n) => ({
        id: n.id,
        body: n.body,
        createdAt: n.createdAt.toISOString(),
        authorId: n.authorId,
        authorName: n.author?.name || n.author?.email || null,
      }))}
      activity={activity}
      batches={lookups.batches}
      members={lookups.members}
      perms={perms}
    />
  );
}
