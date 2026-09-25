"use server";

/**
 * Server actions behind the Candidates and Batches pages. Each one returns a
 * result object instead of throwing, because production builds replace thrown
 * messages with a generic digest and the recruiter would never see "Kiran Das
 * already uses that email".
 */
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  addCandidateNote,
  CandidateError,
  createBatch,
  createCandidate,
  deleteBatch,
  deleteCandidateNote,
  normalizeEmail,
  resolveCandidateActor,
  runBulkAction,
  updateBatch,
  updateCandidate,
  assertRefs,
  type BatchInput,
  type BulkAction,
  type CandidateInput,
  type CandidatePatch,
  type OnDuplicate,
} from "@/lib/crm/candidates-server";
import { IMPORT_MAX, type ImportRow } from "@/lib/crm/import";
import { writeWorkspaceAuditEntry, WORKSPACE_AUDIT_ACTIONS } from "@/lib/workspace-audit";

type ActionError = {
  ok: false;
  error: string;
  existing?: { id: string; name: string };
  /** Candidates whose pass needs confirming as a manual override. */
  needsOverride?: string[];
};

export type ActionResult<T = object> = ({ ok: true } & T) | ActionError;

function fail(err: unknown): ActionError {
  if (err instanceof CandidateError) {
    const existing = err.extra?.existing as { id: string; name: string } | undefined;
    const needsOverride = err.extra?.needsOverride as string[] | undefined;
    return {
      ok: false,
      error: err.message,
      ...(existing ? { existing: { id: existing.id, name: existing.name } } : {}),
      ...(needsOverride ? { needsOverride } : {}),
    };
  }
  console.error("[candidates action]", err);
  return { ok: false, error: "Something went wrong. Try again." };
}

function refresh(slug: string, candidateId?: string, batchId?: string | null) {
  revalidatePath(`/w/${slug}/candidates`);
  revalidatePath(`/w/${slug}/batches`);
  if (candidateId) revalidatePath(`/w/${slug}/candidates/${candidateId}`);
  if (batchId) revalidatePath(`/w/${slug}/batches/${batchId}`);
  revalidatePath(`/w/${slug}`);
}

export async function createCandidateAction(
  slug: string,
  input: CandidateInput,
  onDuplicate: OnDuplicate = "error",
): Promise<ActionResult<{ candidateId: string; outcome: string }>> {
  try {
    const actor = await resolveCandidateActor(slug, "candidate:write");
    const r = await createCandidate(actor, input, onDuplicate);
    refresh(slug, r.candidateId, input.batchId);
    return { ok: true, candidateId: r.candidateId, outcome: r.status };
  } catch (err) {
    return fail(err);
  }
}

export async function updateCandidateAction(
  slug: string,
  id: string,
  patch: CandidatePatch,
): Promise<ActionResult> {
  try {
    const actor = await resolveCandidateActor(slug, "candidate:write");
    await updateCandidate(actor, id, patch);
    refresh(slug, id);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function bulkCandidatesAction(
  slug: string,
  ids: string[],
  op: BulkAction,
): Promise<ActionResult<{ changed: number }>> {
  try {
    const actor = await resolveCandidateActor(slug);
    const r = await runBulkAction(actor, ids, op);
    refresh(slug, ids.length === 1 ? ids[0] : undefined, op.action === "batch" ? op.batchId : undefined);
    return { ok: true, changed: r.changed };
  } catch (err) {
    return fail(err);
  }
}

export async function addNoteAction(
  slug: string,
  candidateId: string,
  body: string,
): Promise<ActionResult<{ note: { id: string; body: string; createdAt: string } }>> {
  try {
    const actor = await resolveCandidateActor(slug, "candidate:write");
    const note = await addCandidateNote(actor, candidateId, body);
    refresh(slug, candidateId);
    return { ok: true, note: { ...note, createdAt: note.createdAt.toISOString() } };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteNoteAction(slug: string, noteId: string, candidateId: string): Promise<ActionResult> {
  try {
    const actor = await resolveCandidateActor(slug, "candidate:write");
    await deleteCandidateNote(actor, noteId);
    refresh(slug, candidateId);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function createBatchAction(slug: string, input: BatchInput): Promise<ActionResult<{ batchId: string }>> {
  try {
    const actor = await resolveCandidateActor(slug, "candidate:write");
    const b = await createBatch(actor, input);
    refresh(slug, undefined, b.id);
    return { ok: true, batchId: b.id };
  } catch (err) {
    return fail(err);
  }
}

export async function updateBatchAction(
  slug: string,
  batchId: string,
  input: Partial<BatchInput>,
): Promise<ActionResult> {
  try {
    const actor = await resolveCandidateActor(slug, "candidate:write");
    await updateBatch(actor, batchId, input);
    refresh(slug, undefined, batchId);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteBatchAction(slug: string, batchId: string): Promise<ActionResult<{ detached: number }>> {
  try {
    const actor = await resolveCandidateActor(slug, "candidate:delete");
    const r = await deleteBatch(actor, batchId);
    refresh(slug, undefined, batchId);
    return { ok: true, detached: r.detached };
  } catch (err) {
    return fail(err);
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 * Import (one flow for one person, a pasted list or a CSV)
 * ────────────────────────────────────────────────────────────────────────── */

export type ImportRowCheck = {
  row: number;
  state: "new" | "duplicate" | "invalid";
  reason?: string;
  existingName?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function checkRows(rows: ImportRow[], existing: Map<string, string>): ImportRowCheck[] {
  const seen = new Set<string>();
  return rows.map((r, i) => {
    const row = i + 1;
    if (!r.name?.trim()) return { row, state: "invalid", reason: "Missing a name" };
    const email = normalizeEmail(r.email);
    if (!email) return { row, state: "invalid", reason: "Missing an email" };
    if (!EMAIL_RE.test(email)) return { row, state: "invalid", reason: "Email looks wrong" };
    if (seen.has(email)) return { row, state: "invalid", reason: "Listed twice in this file" };
    seen.add(email);
    const name = existing.get(email);
    if (name) return { row, state: "duplicate", existingName: name };
    return { row, state: "new" };
  });
}

async function existingByEmail(workspaceId: string, rows: ImportRow[]) {
  const emails = rows.map((r) => normalizeEmail(r.email)).filter((e): e is string => !!e);
  const found = emails.length
    ? await prisma.candidate.findMany({
        where: { workspaceId, email: { in: emails } },
        select: { email: true, name: true },
      })
    : [];
  return new Map(found.map((f) => [f.email!, f.name]));
}

export async function previewImportAction(
  slug: string,
  rows: ImportRow[],
): Promise<ActionResult<{ checks: ImportRowCheck[] }>> {
  try {
    const actor = await resolveCandidateActor(slug, "candidate:write");
    if (rows.length > IMPORT_MAX) throw new CandidateError(400, `Import up to ${IMPORT_MAX} people at a time.`);
    const existing = await existingByEmail(actor.workspaceId, rows);
    return { ok: true, checks: checkRows(rows, existing) };
  } catch (err) {
    return fail(err);
  }
}

export type ImportOptions = {
  batchId?: string | null;
  ownerId?: string | null;
  stage?: string | null;
  tags?: string[];
  updateExisting: boolean;
  via: "one" | "paste" | "csv";
};

export async function importCandidatesAction(
  slug: string,
  rows: ImportRow[],
  opts: ImportOptions,
): Promise<ActionResult<{ created: number; updated: number; skipped: number; invalid: number }>> {
  try {
    const actor = await resolveCandidateActor(slug, "candidate:write");
    if (!rows.length) throw new CandidateError(400, "There is nobody to import.");
    if (rows.length > IMPORT_MAX) throw new CandidateError(400, `Import up to ${IMPORT_MAX} people at a time.`);
    if (opts.stage && opts.stage !== "NEW" && opts.stage !== "SCREENING") {
      throw new CandidateError(400, "New candidates start at New or Screening.");
    }
    await assertRefs(actor, opts.batchId, opts.ownerId);

    const existing = await existingByEmail(actor.workspaceId, rows);
    const checks = checkRows(rows, existing);
    let created = 0;
    let updated = 0;
    let skipped = 0;
    let invalid = 0;
    for (let i = 0; i < rows.length; i++) {
      const check = checks[i];
      if (check.state === "invalid") {
        invalid++;
        continue;
      }
      if (check.state === "duplicate" && !opts.updateExisting) {
        skipped++;
        continue;
      }
      const r = rows[i];
      const rowStage = r.stage?.trim().toUpperCase().replace(/[\s-]+/g, "_");
      const out = await createCandidate(
        actor,
        {
          name: r.name!,
          email: r.email,
          phone: r.phone,
          source: r.source || (opts.via === "csv" ? "csv-import" : opts.via === "paste" ? "bulk-import" : "manual"),
          notes: r.notes,
          tags: [...(r.tags ?? []), ...(opts.tags ?? [])],
          // A CSV can place people in New or Screening. Passed and Not passed are
          // decisions made here, so those rows start at the default instead.
          stage: rowStage === "NEW" || rowStage === "SCREENING" ? rowStage : opts.stage,
          batchId: opts.batchId,
          ownerId: opts.ownerId,
        },
        "update",
        { audit: opts.via === "one", refsChecked: true },
      );
      if (out.status === "created") created++;
      else if (out.status === "updated") updated++;
      else skipped++;
    }
    if (opts.via !== "one") {
      void writeWorkspaceAuditEntry({
        workspaceId: actor.workspaceId,
        actorUserId: actor.actorUserId,
        actorEmail: actor.actorEmail,
        action: WORKSPACE_AUDIT_ACTIONS.CANDIDATES_IMPORTED,
        targetType: opts.batchId ? "candidateBatch" : "workspace",
        targetId: opts.batchId ?? actor.workspaceId,
        meta: { created, updated, skipped, invalid, via: opts.via },
      });
    }
    refresh(slug, undefined, opts.batchId);
    return { ok: true, created, updated, skipped, invalid };
  } catch (err) {
    return fail(err);
  }
}

export type QuickViewData = {
  notes: { id: string; body: string; createdAt: string; authorName: string | null }[];
  noteCount: number;
};

/** The latest notes for the quick-view drawer. */
export async function quickViewAction(slug: string, candidateId: string): Promise<ActionResult<{ data: QuickViewData }>> {
  try {
    const actor = await resolveCandidateActor(slug);
    const exists = await prisma.candidate.findFirst({
      where: { id: candidateId, workspaceId: actor.workspaceId },
      select: { id: true },
    });
    if (!exists) throw new CandidateError(404, "Candidate not found.");
    const [notes, noteCount] = await Promise.all([
      prisma.candidateNote.findMany({
        where: { candidateId },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { id: true, body: true, createdAt: true, author: { select: { name: true, email: true } } },
      }),
      prisma.candidateNote.count({ where: { candidateId } }),
    ]);
    return {
      ok: true,
      data: {
        notes: notes.map((n) => ({
          id: n.id,
          body: n.body,
          createdAt: n.createdAt.toISOString(),
          authorName: n.author?.name || n.author?.email || null,
        })),
        noteCount,
      },
    };
  } catch (err) {
    return fail(err);
  }
}
