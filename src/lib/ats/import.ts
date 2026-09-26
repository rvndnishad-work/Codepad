/**
 * Brings one candidate in from an ATS: finds or creates the Candidate (by
 * email, never a duplicate), puts them in a batch named after the job,
 * records the request, and sends the mapped screening unless the job waits
 * for a recruiter. Server only.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeWorkspaceAuditEntry, WORKSPACE_AUDIT_ACTIONS } from "@/lib/workspace-audit";
import { logSyncEvent } from "./sync-log";
import { screeningNoun, sendRequestScreening } from "./dispatch";

export type ImportPerson = {
  name: string;
  email: string;
  phone?: string | null;
  /** The candidate's id in the ATS. */
  externalId?: string | null;
  profileUrl?: string | null;
};

export type ImportMapping = {
  id: string;
  jobName: string;
  screeningKind: string;
  screeningId: string | null;
  sendMode: string;
};

export type ImportInput = {
  workspaceId: string;
  provider: string;
  mapping: ImportMapping;
  person: ImportPerson;
  applicationId?: string | null;
  callbackUrl?: string | null;
};

export type ImportOutcome = {
  requestId: string;
  candidateId: string;
  /** imported (new person) | linked (existing person) | repeat (same request again) */
  kind: "imported" | "linked" | "repeat";
  waiting: boolean;
  sent: boolean;
  error?: string;
};

const PROVIDER_NAMES: Record<string, string> = { greenhouse: "Greenhouse", lever: "Lever", ashby: "Ashby" };
export const providerName = (p: string) => PROVIDER_NAMES[p.toLowerCase()] ?? p;

async function findOrCreateBatch(workspaceId: string, jobName: string): Promise<string> {
  const name = jobName.trim().slice(0, 120) || "Imported";
  const existing = await prisma.candidateBatch.findUnique({ where: { workspaceId_name: { workspaceId, name } }, select: { id: true } });
  if (existing) return existing.id;
  try {
    const row = await prisma.candidateBatch.create({ data: { workspaceId, name, roleTitle: name }, select: { id: true } });
    return row.id;
  } catch (err) {
    // Two imports for the same job at once: the other one created it.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const row = await prisma.candidateBatch.findUnique({ where: { workspaceId_name: { workspaceId, name } }, select: { id: true } });
      if (row) return row.id;
    }
    throw err;
  }
}

async function findOrCreateCandidate(
  input: ImportInput,
  batchId: string,
): Promise<{ id: string; name: string; created: boolean }> {
  const email = input.person.email.trim().toLowerCase();
  const atsRef = input.person.externalId ? `${input.provider}:${input.person.externalId}` : null;
  const existing = await prisma.candidate.findUnique({
    where: { workspaceId_email: { workspaceId: input.workspaceId, email } },
    select: { id: true, name: true, atsRef: true, atsProfileUrl: true, batchId: true, phone: true },
  });
  if (existing) {
    // Link, never overwrite: only fill what is missing.
    const patch: Prisma.CandidateUpdateInput = {};
    if (!existing.atsRef && atsRef) patch.atsRef = atsRef;
    if (!existing.atsProfileUrl && input.person.profileUrl) patch.atsProfileUrl = input.person.profileUrl;
    if (!existing.batchId) patch.batch = { connect: { id: batchId } };
    if (!existing.phone && input.person.phone) patch.phone = input.person.phone;
    if (Object.keys(patch).length) await prisma.candidate.update({ where: { id: existing.id }, data: patch });
    return { id: existing.id, name: existing.name, created: false };
  }
  try {
    const row = await prisma.candidate.create({
      data: {
        workspaceId: input.workspaceId,
        name: input.person.name.trim().slice(0, 200) || email.split("@")[0],
        email,
        phone: input.person.phone ?? null,
        source: input.provider,
        atsRef,
        atsProfileUrl: input.person.profileUrl ?? null,
        batchId,
        status: "active",
        stage: "NEW",
        stageChangedAt: new Date(),
      },
      select: { id: true, name: true },
    });
    void writeWorkspaceAuditEntry({
      workspaceId: input.workspaceId,
      actorEmail: null,
      action: WORKSPACE_AUDIT_ACTIONS.CANDIDATE_CREATED,
      targetType: "candidate",
      targetId: row.id,
      meta: { source: input.provider, via: "ats", job: input.mapping.jobName },
    });
    return { ...row, created: true };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const row = await prisma.candidate.findUnique({
        where: { workspaceId_email: { workspaceId: input.workspaceId, email } },
        select: { id: true, name: true },
      });
      if (row) return { ...row, created: false };
    }
    throw err;
  }
}

async function findRepeat(input: ImportInput) {
  if (!input.applicationId) return null;
  return prisma.atsTestRequest.findFirst({
    where: {
      workspaceId: input.workspaceId,
      provider: input.provider,
      externalApplicationId: input.applicationId,
      mappingId: input.mapping.id,
    },
    select: { id: true, candidateId: true, status: true },
  });
}

export async function importAtsCandidate(input: ImportInput): Promise<ImportOutcome> {
  const repeat = await findRepeat(input);
  if (repeat) {
    return { requestId: repeat.id, candidateId: repeat.candidateId, kind: "repeat", waiting: repeat.status === "waiting", sent: repeat.status === "sent" };
  }

  const batchId = await findOrCreateBatch(input.workspaceId, input.mapping.jobName);
  const candidate = await findOrCreateCandidate(input, batchId);

  let requestId: string;
  try {
    const req = await prisma.atsTestRequest.create({
      data: {
        workspaceId: input.workspaceId,
        provider: input.provider,
        mappingId: input.mapping.id,
        candidateId: candidate.id,
        externalCandidateId: input.person.externalId ?? null,
        externalApplicationId: input.applicationId ?? null,
        jobName: input.mapping.jobName,
        callbackUrl: input.callbackUrl ?? null,
        screeningKind: input.mapping.screeningKind,
        screeningId: input.mapping.screeningId,
        status: "waiting",
      },
      select: { id: true },
    });
    requestId = req.id;
  } catch (err) {
    // The ATS re-sent the same request while the first was still running.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const again = await findRepeat(input);
      if (again) return { requestId: again.id, candidateId: again.candidateId, kind: "repeat", waiting: again.status === "waiting", sent: again.status === "sent" };
    }
    throw err;
  }

  const who = candidate.name;
  const job = input.mapping.jobName;
  const noun = screeningNoun(input.mapping.screeningKind);
  const opening = candidate.created ? `${who} added to ${job}` : `${who} already existed, linked to the ${providerName(input.provider)} profile and added to ${job}`;

  if (input.mapping.sendMode === "review") {
    await logSyncEvent({
      workspaceId: input.workspaceId,
      provider: input.provider,
      direction: "in",
      status: "waiting",
      summary: `${opening}. Waiting for you to send the ${noun}.`,
      candidateId: candidate.id,
      requestId,
    });
    return { requestId, candidateId: candidate.id, kind: candidate.created ? "imported" : "linked", waiting: true, sent: false };
  }

  const res = await sendRequestScreening(requestId);
  if (res.ok) {
    const what = res.reused ? `already had this ${noun}` : res.emailed ? `${noun} sent` : `${noun} created, but the invite email did not go out`;
    await logSyncEvent({
      workspaceId: input.workspaceId,
      provider: input.provider,
      direction: "in",
      status: candidate.created ? "imported" : "linked",
      summary: `${opening}, ${what}`,
      candidateId: candidate.id,
      requestId,
    });
  } else {
    await logSyncEvent({
      workspaceId: input.workspaceId,
      provider: input.provider,
      direction: "in",
      status: "failed",
      summary: `${opening}, but the ${noun} was not sent`,
      detail: res.error,
      candidateId: candidate.id,
      requestId,
    });
  }
  return {
    requestId,
    candidateId: candidate.id,
    kind: candidate.created ? "imported" : "linked",
    waiting: false,
    sent: res.ok,
    ...(res.ok ? {} : { error: res.error }),
  };
}

/**
 * What an import would do, without writing anything or sending email. Used
 * by the setup wizard's test step.
 */
export async function previewAtsImport(input: { workspaceId: string; provider: string; mapping: ImportMapping; person: ImportPerson }): Promise<string[]> {
  const email = input.person.email.trim().toLowerCase();
  const [existing, batch] = await Promise.all([
    prisma.candidate.findUnique({ where: { workspaceId_email: { workspaceId: input.workspaceId, email } }, select: { name: true, stage: true } }),
    prisma.candidateBatch.findUnique({ where: { workspaceId_name: { workspaceId: input.workspaceId, name: input.mapping.jobName } }, select: { id: true } }),
  ]);
  const noun = screeningNoun(input.mapping.screeningKind);
  const lines: string[] = [];
  lines.push(
    existing
      ? `${existing.name} already exists with ${email}, so we would link them instead of creating a duplicate.`
      : `We would create ${input.person.name || email} with the source ${providerName(input.provider)}.`,
  );
  lines.push(batch ? `They would join the existing batch ${input.mapping.jobName}.` : `We would create the batch ${input.mapping.jobName} and add them to it.`);
  if (input.mapping.screeningKind === "none" || !input.mapping.screeningId) {
    lines.push("This job is set to Do nothing, so nothing would be sent.");
  } else if (input.mapping.sendMode === "review") {
    lines.push(`The ${noun} would wait for you to send it from the sync log.`);
  } else {
    lines.push(`The ${noun} invite would be emailed straight away.`);
  }
  lines.push(`${providerName(input.provider)} hears back only after a recruiter passes or does not pass them.`);
  return lines;
}
