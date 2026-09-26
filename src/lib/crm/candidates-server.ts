/**
 * Every write to the candidate roster goes through here: the REST routes,
 * the server actions behind the Candidates pages, and the importer. That
 * gives one place for the rules the old code applied unevenly:
 *
 *   - Adding someone whose email is already in the workspace never silently
 *     overwrites them. The caller picks "error" (default), "skip" or "update".
 *   - Every create, edit, move, archive and erase writes an audit row.
 *   - Remove means archive (status "archived", reversible). Erase is permanent,
 *     is limited to owners and admins, and scrubs the person's name from the
 *     assessment records that outlive them.
 *
 * Server-only.
 */
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canMember, type Permission } from "@/lib/permissions";
import { MANAGER_ROLES } from "@/lib/permissions/role-groups";
import {
  isPipelineStage,
  normalizeStage,
  REJECT_REASONS,
  type PipelineStage,
  type RejectReason,
} from "@/lib/crm/stages";
import {
  writeWorkspaceAuditEntry,
  WORKSPACE_AUDIT_ACTIONS,
} from "@/lib/workspace-audit";
import { passCheck } from "@/lib/crm/results";
import { emitWorkspaceEvent } from "@/lib/events";
import { loadCandidateResults } from "@/lib/crm/results-server";

/** The legacy `status` column mirrors the decision. Flags such as
 *  future_hire survive while the candidate is still being screened. */
function statusForStage(stage: PipelineStage, current?: string): string {
  if (stage === "PASSED") return "passed";
  if (stage === "REJECTED") return "rejected";
  return current === "passed" || current === "hired" || current === "rejected" || !current ? "active" : current;
}

export class CandidateError extends Error {
  constructor(
    public status: number,
    message: string,
    public extra?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export type CandidateActor = {
  workspaceId: string;
  workspaceSlug: string;
  actorUserId: string;
  actorEmail: string | null;
  role: string;
  isManager: boolean;
  member: { userId: string; role: string; permissions: unknown };
};

/** Resolve the signed-in member of `slug`, optionally requiring a permission. */
export async function resolveCandidateActor(slug: string, permission?: Permission): Promise<CandidateActor> {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) throw new CandidateError(401, "Sign in to continue.");
  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: { id: true, slug: true, members: { select: { userId: true, role: true, permissions: true } } },
  });
  if (!workspace) throw new CandidateError(404, "Workspace not found.");
  const member = workspace.members.find((m) => m.userId === session.user!.id);
  if (!member) throw new CandidateError(403, "You are not a member of this workspace.");
  if (permission && !(await canMember(member, permission))) {
    throw new CandidateError(403, "You do not have permission to do that.");
  }
  return {
    workspaceId: workspace.id,
    workspaceSlug: workspace.slug,
    actorUserId: session.user.id,
    actorEmail: session.user.email ?? null,
    role: member.role,
    isManager: (MANAGER_ROLES as readonly string[]).includes(member.role),
    member,
  };
}

function audit(
  actor: CandidateActor,
  action: string,
  targetType: string,
  targetId: string | null,
  meta: Record<string, unknown>,
) {
  return writeWorkspaceAuditEntry({
    workspaceId: actor.workspaceId,
    actorUserId: actor.actorUserId,
    actorEmail: actor.actorEmail,
    action,
    targetType,
    targetId,
    meta,
  });
}

/* ──────────────────────────────────────────────────────────────────────────
 * Tags
 * ────────────────────────────────────────────────────────────────────────── */

export function parseTags(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.filter((t): t is string => typeof t === "string") : [];
  } catch {
    return [];
  }
}

export function cleanTags(tags: string[] | null | undefined): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags ?? []) {
    const t = raw.trim().toLowerCase().slice(0, 40);
    if (t && !seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  return out;
}

const tagsJson = (tags: string[]) => (tags.length ? JSON.stringify(tags) : null);

/* ──────────────────────────────────────────────────────────────────────────
 * Create
 * ────────────────────────────────────────────────────────────────────────── */

export type CandidateInput = {
  name: string;
  email?: string | null;
  phone?: string | null;
  source?: string | null;
  notes?: string | null;
  tags?: string[] | null;
  stage?: string | null;
  batchId?: string | null;
  ownerId?: string | null;
};

export type OnDuplicate = "error" | "skip" | "update";

export type CreateOutcome =
  | { status: "created"; candidateId: string }
  | { status: "updated"; candidateId: string }
  | { status: "skipped"; candidateId: string; reason: string };

export function normalizeEmail(email: string | null | undefined): string | null {
  const e = email?.toLowerCase().trim();
  return e ? e : null;
}

/** Throws unless `batchId` and `ownerId` belong to this workspace. */
export async function assertRefs(actor: CandidateActor, batchId?: string | null, ownerId?: string | null) {
  if (batchId) {
    const b = await prisma.candidateBatch.findFirst({ where: { id: batchId, workspaceId: actor.workspaceId }, select: { id: true } });
    if (!b) throw new CandidateError(400, "That batch is not in this workspace.");
  }
  if (ownerId) {
    const m = await prisma.workspaceMember.findFirst({ where: { workspaceId: actor.workspaceId, userId: ownerId }, select: { id: true } });
    if (!m) throw new CandidateError(400, "The owner must be a member of this workspace.");
  }
}

export async function createCandidate(
  actor: CandidateActor,
  input: CandidateInput,
  onDuplicate: OnDuplicate = "error",
  opts: { audit?: boolean; refsChecked?: boolean } = {},
): Promise<CreateOutcome> {
  const name = input.name.trim();
  if (!name) throw new CandidateError(400, "A name is required.");
  const email = normalizeEmail(input.email);
  const tags = cleanTags(input.tags);
  // Old stage names (APPLIED, ONSITE, HIRED...) still arrive from CSVs and API callers.
  const stage: PipelineStage = normalizeStage(input.stage);
  // Decisions are made here, on screening results, by a person. Imports and
  // API callers (and the ATS sync to come) only bring people in.
  if (stage === "REJECTED") throw new CandidateError(400, "New candidates cannot start as Not passed.");
  if (stage === "PASSED") throw new CandidateError(400, "New candidates cannot start as Passed. Pass them after screening.");
  if (!opts.refsChecked) await assertRefs(actor, input.batchId, input.ownerId);

  if (email) {
    const existing = await prisma.candidate.findUnique({
      where: { workspaceId_email: { workspaceId: actor.workspaceId, email } },
      select: { id: true, name: true, email: true, stage: true, status: true, tags: true },
    });
    if (existing) {
      if (onDuplicate === "error") {
        throw new CandidateError(409, `${existing.name} already uses ${email}.`, { existing });
      }
      if (onDuplicate === "skip") {
        return { status: "skipped", candidateId: existing.id, reason: "Already in the workspace" };
      }
      // "update": fill in what was given, merge tags, never touch the stage.
      const merged = cleanTags([...parseTags(existing.tags), ...tags]);
      await prisma.candidate.update({
        where: { id: existing.id },
        data: {
          name,
          ...(input.phone ? { phone: input.phone.trim() } : {}),
          ...(input.source ? { source: input.source.trim() } : {}),
          ...(tags.length ? { tags: tagsJson(merged) } : {}),
          ...(input.batchId !== undefined && input.batchId !== null ? { batchId: input.batchId } : {}),
          ...(input.ownerId ? { ownerId: input.ownerId } : {}),
          ...(existing.status === "archived" ? { status: "active" } : {}),
        },
      });
      if (input.notes?.trim()) {
        await prisma.candidateNote.create({
          data: { candidateId: existing.id, authorId: actor.actorUserId, body: input.notes.trim() },
        });
      }
      if (opts.audit !== false) {
        void audit(actor, WORKSPACE_AUDIT_ACTIONS.CANDIDATE_UPDATED, "candidate", existing.id, {
          candidateName: name,
          fields: ["name", ...(input.phone ? ["phone"] : []), ...(tags.length ? ["tags"] : []), ...(input.batchId ? ["batch"] : [])],
          via: "add",
        });
      }
      return { status: "updated", candidateId: existing.id };
    }
  }

  const created = await prisma.candidate.create({
    data: {
      workspaceId: actor.workspaceId,
      name,
      email,
      phone: input.phone?.trim() || null,
      source: input.source?.trim() || "manual",
      tags: tagsJson(tags),
      status: statusForStage(stage),
      stage,
      stageChangedAt: new Date(),
      batchId: input.batchId || null,
      ownerId: input.ownerId || null,
    },
    select: { id: true },
  });
  if (input.notes?.trim()) {
    await prisma.candidateNote.create({
      data: { candidateId: created.id, authorId: actor.actorUserId, body: input.notes.trim() },
    });
  }
  if (opts.audit !== false) {
    void audit(actor, WORKSPACE_AUDIT_ACTIONS.CANDIDATE_CREATED, "candidate", created.id, {
      candidateName: name,
      stage,
      batchId: input.batchId || null,
    });
  }
  return { status: "created", candidateId: created.id };
}

/* ──────────────────────────────────────────────────────────────────────────
 * Edit
 * ────────────────────────────────────────────────────────────────────────── */

export type CandidatePatch = {
  name?: string;
  email?: string | null;
  phone?: string | null;
  source?: string | null;
  notes?: string | null;
  tags?: string[] | null;
  /** Disposition flag. "passed" and "rejected" also move the stage; "hired"
   *  is the old name for "passed" and is still accepted. */
  status?: "active" | "future_hire" | "do_not_hire" | "passed" | "hired" | "rejected" | "archived";
  rejectReason?: RejectReason;
  rejectReasonNote?: string | null;
  batchId?: string | null;
  ownerId?: string | null;
  /** Confirms a pass that its results do not back (see `assertPassBacked`). */
  override?: boolean;
};

/**
 * Passing is a person's call, and when a candidate's best result on any
 * assessment is below the bar (or nothing is scored) it is a manual override
 * of the results. Without `override` such a pass is refused, so no caller can
 * pass a failing candidate by accident. Returns the override reason per id,
 * for the audit trail.
 */
async function assertPassBacked(
  actor: CandidateActor,
  rows: { id: string; name: string }[],
  override: boolean | undefined,
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!rows.length) return out;
  const results = await loadCandidateResults(actor.workspaceId, actor.workspaceSlug, rows.map((r) => r.id));
  for (const r of rows) {
    const check = passCheck(results.get(r.id) ?? []);
    if (check.override) out.set(r.id, check.reason ?? "Below the bar");
  }
  if (out.size && !override) {
    const first = rows.find((r) => out.has(r.id))!;
    throw new CandidateError(
      409,
      out.size === 1
        ? `${first.name}: ${out.get(first.id)}. Confirm the pass as a manual override.`
        : `${out.size} candidates have results below the bar or none scored. Confirm the pass as a manual override.`,
      { needsOverride: [...out.keys()] },
    );
  }
  return out;
}

async function findOwned(actor: CandidateActor, id: string) {
  const c = await prisma.candidate.findFirst({ where: { id, workspaceId: actor.workspaceId } });
  if (!c) throw new CandidateError(404, "Candidate not found.");
  return c;
}

export async function updateCandidate(actor: CandidateActor, id: string, patch: CandidatePatch) {
  const current = await findOwned(actor, id);
  const data: Record<string, unknown> = {};
  const fields: string[] = [];

  if (patch.name !== undefined) {
    const n = patch.name.trim();
    if (!n) throw new CandidateError(400, "A name is required.");
    if (n !== current.name) {
      data.name = n;
      fields.push("name");
    }
  }
  if (patch.email !== undefined) {
    const e = normalizeEmail(patch.email);
    if (e !== current.email) {
      if (e) {
        const clash = await prisma.candidate.findUnique({
          where: { workspaceId_email: { workspaceId: actor.workspaceId, email: e } },
          select: { id: true, name: true },
        });
        if (clash && clash.id !== id) {
          throw new CandidateError(409, `${clash.name} already uses ${e}.`, { existing: clash });
        }
      }
      data.email = e;
      fields.push("email");
    }
  }
  for (const key of ["phone", "source", "notes"] as const) {
    if (patch[key] !== undefined) {
      const v = patch[key]?.trim() || null;
      if (v !== current[key]) {
        data[key] = v;
        fields.push(key);
      }
    }
  }
  if (patch.tags !== undefined) {
    const next = tagsJson(cleanTags(patch.tags));
    if (next !== current.tags) {
      data.tags = next;
      fields.push("tags");
    }
  }
  if (patch.batchId !== undefined || patch.ownerId !== undefined) {
    await assertRefs(actor, patch.batchId, patch.ownerId);
    if (patch.batchId !== undefined && (patch.batchId || null) !== current.batchId) {
      data.batchId = patch.batchId || null;
      fields.push("batch");
    }
    if (patch.ownerId !== undefined && (patch.ownerId || null) !== current.ownerId) {
      data.ownerId = patch.ownerId || null;
      fields.push("owner");
    }
  }

  let stageMove: { from: string; to: string } | null = null;
  let overrideReason: string | null = null;
  const nextStatus = patch.status === "hired" ? "passed" : patch.status;
  if (nextStatus && nextStatus !== current.status) {
    data.status = nextStatus;
    fields.push("status");
    const prev = current.stage;
    if (nextStatus === "passed" && prev !== "PASSED") {
      overrideReason = (await assertPassBacked(actor, [current], patch.override)).get(id) ?? null;
      data.stage = "PASSED";
      data.stageChangedAt = new Date();
      data.rejectReason = null;
      data.rejectReasonNote = null;
      stageMove = { from: prev, to: "PASSED" };
    } else if (nextStatus === "rejected" && prev !== "REJECTED") {
      // The reason is required, exactly as on the board. The old route
      // recorded every status-dropdown rejection as OTHER.
      if (!patch.rejectReason || !REJECT_REASONS.includes(patch.rejectReason)) {
        throw new CandidateError(400, "Pick a reason for not passing this candidate.");
      }
      data.stage = "REJECTED";
      data.rejectReason = patch.rejectReason;
      data.rejectReasonNote = patch.rejectReasonNote?.trim() || null;
      data.stageChangedAt = new Date();
      stageMove = { from: prev, to: "REJECTED" };
    } else if (nextStatus === "active" && (prev === "PASSED" || prev === "REJECTED")) {
      // Reopening a decision puts them back into screening.
      data.stage = "SCREENING";
      data.rejectReason = null;
      data.rejectReasonNote = null;
      data.stageChangedAt = new Date();
      stageMove = { from: prev, to: "SCREENING" };
    }
  }

  if (!fields.length) return current;
  const updated = await prisma.candidate.update({ where: { id }, data });

  const detailFields = fields.filter((f) => !["status", "batch", "owner"].includes(f));
  if (detailFields.length) {
    void audit(actor, WORKSPACE_AUDIT_ACTIONS.CANDIDATE_UPDATED, "candidate", id, {
      candidateName: updated.name,
      fields: detailFields,
    });
  }
  if (fields.includes("batch")) {
    void audit(actor, WORKSPACE_AUDIT_ACTIONS.CANDIDATE_BATCH_CHANGED, "candidate", id, {
      candidateName: updated.name,
      fromBatchId: current.batchId,
      toBatchId: updated.batchId,
    });
  }
  if (fields.includes("owner")) {
    void audit(actor, WORKSPACE_AUDIT_ACTIONS.CANDIDATE_OWNER_CHANGED, "candidate", id, {
      candidateName: updated.name,
      fromOwnerId: current.ownerId,
      toOwnerId: updated.ownerId,
    });
  }
  if (fields.includes("status")) {
    void audit(
      actor,
      patch.status === "archived"
        ? WORKSPACE_AUDIT_ACTIONS.CANDIDATE_ARCHIVED
        : current.status === "archived"
          ? WORKSPACE_AUDIT_ACTIONS.CANDIDATE_RESTORED
          : WORKSPACE_AUDIT_ACTIONS.CANDIDATE_UPDATED,
      "candidate",
      id,
      { candidateName: updated.name, fromStatus: current.status, toStatus: patch.status },
    );
  }
  if (stageMove) {
    void audit(actor, WORKSPACE_AUDIT_ACTIONS.PIPELINE_STAGE_CHANGED, "candidate", id, {
      candidateName: updated.name,
      fromStage: stageMove.from,
      toStage: stageMove.to,
      ...(stageMove.to === "REJECTED" ? { rejectReason: patch.rejectReason } : {}),
      ...(overrideReason ? { manualOverride: overrideReason } : {}),
    });
    if (stageMove.to === "PASSED" || stageMove.to === "REJECTED") {
      void emitDecision(actor, { id, name: updated.name, email: updated.email }, stageMove.from, stageMove.to, {
        rejectReason: stageMove.to === "REJECTED" ? patch.rejectReason : null,
        manualOverride: overrideReason,
      });
    }
  }
  return updated;
}

/** candidate.decided webhook event. Recruiter decisions only; never throws. */
function emitDecision(
  actor: CandidateActor,
  candidate: { id: string; name: string; email: string | null },
  fromStage: string,
  toStage: "PASSED" | "REJECTED",
  extra: { rejectReason?: string | null; manualOverride?: string | null },
) {
  return emitWorkspaceEvent(actor.workspaceId, "candidate.decided", {
    candidate,
    decision: toStage === "PASSED" ? "passed" : "not_passed",
    previousStage: fromStage,
    rejectReason: extra.rejectReason ?? null,
    manualOverride: extra.manualOverride ?? null,
    decidedBy: { email: actor.actorEmail },
    reportPath: `candidates/${candidate.id}`,
  });
}

/* ──────────────────────────────────────────────────────────────────────────
 * Bulk operations (the list's bulk bar, the board, the batch pages)
 * ────────────────────────────────────────────────────────────────────────── */

export const BULK_MAX = 500;

async function scopedCandidates(actor: CandidateActor, ids: string[]) {
  const unique = [...new Set(ids)];
  if (!unique.length) throw new CandidateError(400, "Select at least one candidate.");
  if (unique.length > BULK_MAX) throw new CandidateError(400, `Select at most ${BULK_MAX} candidates at a time.`);
  return prisma.candidate.findMany({
    where: { id: { in: unique }, workspaceId: actor.workspaceId },
    select: { id: true, name: true, email: true, stage: true, status: true, tags: true, batchId: true, ownerId: true },
  });
}

export async function moveCandidatesStage(
  actor: CandidateActor,
  ids: string[],
  toStage: string,
  reason?: { rejectReason?: RejectReason; rejectReasonNote?: string | null; override?: boolean },
): Promise<{ moved: number }> {
  if (!isPipelineStage(toStage)) throw new CandidateError(400, `Unknown stage: ${toStage}`);
  if (toStage === "REJECTED") {
    if (!reason?.rejectReason || !REJECT_REASONS.includes(reason.rejectReason)) {
      throw new CandidateError(400, "A reject reason is required when moving a candidate to Rejected.");
    }
  }
  const rows = await scopedCandidates(actor, ids);
  const moving = rows.filter((r) => r.stage !== toStage);
  const overrides = toStage === "PASSED" ? await assertPassBacked(actor, moving, reason?.override) : new Map<string, string>();
  const now = new Date();
  for (const c of moving) {
    await prisma.candidate.update({
      where: { id: c.id },
      data: {
        stage: toStage,
        stageChangedAt: now,
        rejectReason: toStage === "REJECTED" ? reason!.rejectReason : null,
        rejectReasonNote: toStage === "REJECTED" ? reason?.rejectReasonNote?.trim() || null : null,
        // Keep the legacy status in step with the decision, both ways.
        ...(c.status === "archived" ? {} : { status: statusForStage(toStage, c.status) }),
      },
    });
    void audit(actor, WORKSPACE_AUDIT_ACTIONS.PIPELINE_STAGE_CHANGED, "candidate", c.id, {
      candidateName: c.name,
      fromStage: c.stage,
      toStage,
      ...(toStage === "REJECTED"
        ? { rejectReason: reason?.rejectReason, hasNote: !!reason?.rejectReasonNote?.trim() }
        : {}),
      ...(overrides.has(c.id) ? { manualOverride: overrides.get(c.id) } : {}),
      ...(moving.length > 1 ? { bulk: moving.length } : {}),
    });
    if (toStage === "PASSED" || toStage === "REJECTED") {
      void emitDecision(actor, { id: c.id, name: c.name, email: c.email }, c.stage, toStage, {
        rejectReason: toStage === "REJECTED" ? reason?.rejectReason : null,
        manualOverride: overrides.get(c.id) ?? null,
      });
    }
  }
  return { moved: moving.length };
}

export async function setCandidatesBatch(actor: CandidateActor, ids: string[], batchId: string | null) {
  await assertRefs(actor, batchId, null);
  const rows = await scopedCandidates(actor, ids);
  const changing = rows.filter((r) => r.batchId !== batchId);
  if (!changing.length) return { changed: 0 };
  await prisma.candidate.updateMany({ where: { id: { in: changing.map((c) => c.id) } }, data: { batchId } });
  for (const c of changing) {
    void audit(actor, WORKSPACE_AUDIT_ACTIONS.CANDIDATE_BATCH_CHANGED, "candidate", c.id, {
      candidateName: c.name,
      fromBatchId: c.batchId,
      toBatchId: batchId,
    });
  }
  return { changed: changing.length };
}

export async function setCandidatesOwner(actor: CandidateActor, ids: string[], ownerId: string | null) {
  await assertRefs(actor, null, ownerId);
  const rows = await scopedCandidates(actor, ids);
  const changing = rows.filter((r) => r.ownerId !== ownerId);
  if (!changing.length) return { changed: 0 };
  await prisma.candidate.updateMany({ where: { id: { in: changing.map((c) => c.id) } }, data: { ownerId } });
  for (const c of changing) {
    void audit(actor, WORKSPACE_AUDIT_ACTIONS.CANDIDATE_OWNER_CHANGED, "candidate", c.id, {
      candidateName: c.name,
      fromOwnerId: c.ownerId,
      toOwnerId: ownerId,
    });
  }
  return { changed: changing.length };
}

export async function tagCandidates(actor: CandidateActor, ids: string[], add: string[], remove: string[] = []) {
  const addTags = cleanTags(add);
  const removeTags = new Set(cleanTags(remove));
  if (!addTags.length && !removeTags.size) throw new CandidateError(400, "Enter at least one tag.");
  const rows = await scopedCandidates(actor, ids);
  let changed = 0;
  for (const c of rows) {
    const before = parseTags(c.tags);
    const after = cleanTags([...before.filter((t) => !removeTags.has(t)), ...addTags]);
    const next = tagsJson(after);
    if (next === c.tags) continue;
    await prisma.candidate.update({ where: { id: c.id }, data: { tags: next } });
    changed++;
    void audit(actor, WORKSPACE_AUDIT_ACTIONS.CANDIDATE_TAGS_CHANGED, "candidate", c.id, {
      candidateName: c.name,
      added: addTags.filter((t) => !before.includes(t)),
      removed: before.filter((t) => removeTags.has(t)),
    });
  }
  return { changed };
}

export async function archiveCandidates(actor: CandidateActor, ids: string[], archived: boolean) {
  const rows = await scopedCandidates(actor, ids);
  const changing = rows.filter((r) => (archived ? r.status !== "archived" : r.status === "archived"));
  for (const c of changing) {
    // Restoring puts the disposition back in step with the stage.
    const status = archived ? "archived" : statusForStage(normalizeStage(c.stage));
    await prisma.candidate.update({ where: { id: c.id }, data: { status } });
    void audit(
      actor,
      archived ? WORKSPACE_AUDIT_ACTIONS.CANDIDATE_ARCHIVED : WORKSPACE_AUDIT_ACTIONS.CANDIDATE_RESTORED,
      "candidate",
      c.id,
      { candidateName: c.name, fromStatus: c.status, toStatus: status },
    );
  }
  return { changed: changing.length };
}

/** The placeholder written over an erased person's name on their assessments. */
export const ERASED_NAME = "Erased candidate";

/**
 * Permanently remove candidates. Owners and admins only. Their take-home,
 * interview and screening records stay (scores feed workspace reporting) but
 * lose the name, email and any recorded answers, which the old hard delete left behind.
 */
export async function eraseCandidates(actor: CandidateActor, ids: string[]) {
  if (!actor.isManager) throw new CandidateError(403, "Only workspace owners and admins can erase candidates.");
  const rows = await scopedCandidates(actor, ids);
  if (!rows.length) return { erased: 0 };
  const cids = rows.map((r) => r.id);
  await prisma.$transaction([
    prisma.takeHomeAssignment.updateMany({
      where: { candidateId: { in: cids } },
      data: { candidateName: ERASED_NAME, candidateEmail: "erased@invalid" },
    }),
    prisma.interviewSession.updateMany({ where: { candidateId: { in: cids } }, data: { candidateName: ERASED_NAME } }),
    prisma.aIInterviewSession.updateMany({
      where: { candidateId: { in: cids } },
      data: { candidateName: ERASED_NAME, candidateEmail: "erased@invalid" },
    }),
    // A voice recording identifies the person, so it goes with the name.
    prisma.aIInterviewAudio.deleteMany({ where: { session: { candidateId: { in: cids } } } }),
    prisma.candidate.deleteMany({ where: { id: { in: cids }, workspaceId: actor.workspaceId } }),
  ]);
  // No names in the audit row: the point of erasing is that they are gone.
  void audit(actor, WORKSPACE_AUDIT_ACTIONS.CANDIDATE_ERASED, "workspace", actor.workspaceId, {
    count: cids.length,
  });
  return { erased: cids.length };
}

/* ──────────────────────────────────────────────────────────────────────────
 * Notes
 * ────────────────────────────────────────────────────────────────────────── */

export const NOTE_MAX = 5000;

export async function addCandidateNote(actor: CandidateActor, candidateId: string, body: string) {
  const text = body.trim();
  if (!text) throw new CandidateError(400, "Write something first.");
  if (text.length > NOTE_MAX) throw new CandidateError(400, `Notes are limited to ${NOTE_MAX} characters.`);
  const c = await findOwned(actor, candidateId);
  const note = await prisma.candidateNote.create({
    data: { candidateId, authorId: actor.actorUserId, body: text },
    select: { id: true, body: true, createdAt: true },
  });
  await prisma.candidate.update({ where: { id: candidateId }, data: { updatedAt: new Date() } });
  void audit(actor, WORKSPACE_AUDIT_ACTIONS.CANDIDATE_NOTE_ADDED, "candidate", candidateId, {
    candidateName: c.name,
    noteId: note.id,
    length: text.length,
  });
  return note;
}

export async function deleteCandidateNote(actor: CandidateActor, noteId: string) {
  const note = await prisma.candidateNote.findFirst({
    where: { id: noteId, candidate: { workspaceId: actor.workspaceId } },
    select: { id: true, authorId: true, candidateId: true, candidate: { select: { name: true } } },
  });
  if (!note) throw new CandidateError(404, "Note not found.");
  if (note.authorId !== actor.actorUserId && !actor.isManager) {
    throw new CandidateError(403, "Only the author or a workspace admin can delete this note.");
  }
  await prisma.candidateNote.delete({ where: { id: noteId } });
  void audit(actor, WORKSPACE_AUDIT_ACTIONS.CANDIDATE_NOTE_DELETED, "candidate", note.candidateId, {
    candidateName: note.candidate.name,
    noteId,
  });
  return { ok: true };
}

/* ──────────────────────────────────────────────────────────────────────────
 * Batches
 * ────────────────────────────────────────────────────────────────────────── */

export type BatchInput = {
  name: string;
  roleTitle?: string | null;
  ownerId?: string | null;
  deadline?: string | null;
  targetHires?: number | null;
  status?: "OPEN" | "CLOSED";
};

function batchData(input: Partial<BatchInput>) {
  const data: Record<string, unknown> = {};
  if (input.name !== undefined) {
    const n = input.name.trim();
    if (!n) throw new CandidateError(400, "Give the batch a name.");
    if (n.length > 80) throw new CandidateError(400, "Batch names are limited to 80 characters.");
    data.name = n;
  }
  if (input.roleTitle !== undefined) data.roleTitle = input.roleTitle?.trim() || null;
  if (input.ownerId !== undefined) data.ownerId = input.ownerId || null;
  if (input.deadline !== undefined) {
    if (input.deadline) {
      const d = new Date(input.deadline);
      if (Number.isNaN(d.getTime())) throw new CandidateError(400, "That deadline is not a date.");
      data.deadline = d;
    } else data.deadline = null;
  }
  if (input.targetHires !== undefined) {
    const t = input.targetHires == null ? null : Math.floor(Number(input.targetHires));
    if (t != null && (!Number.isFinite(t) || t < 0 || t > 10000)) throw new CandidateError(400, "Target hires must be 0 or more.");
    data.targetHires = t;
  }
  if (input.status !== undefined) {
    if (input.status !== "OPEN" && input.status !== "CLOSED") throw new CandidateError(400, "Unknown batch status.");
    data.status = input.status;
  }
  return data;
}

async function assertBatchNameFree(actor: CandidateActor, name: string, exceptId?: string) {
  const clash = await prisma.candidateBatch.findFirst({
    where: { workspaceId: actor.workspaceId, name: { equals: name.trim(), mode: "insensitive" }, ...(exceptId ? { NOT: { id: exceptId } } : {}) },
    select: { id: true },
  });
  if (clash) throw new CandidateError(409, `A batch called "${name.trim()}" already exists.`);
}

export async function createBatch(actor: CandidateActor, input: BatchInput) {
  const data = batchData(input);
  await assertBatchNameFree(actor, input.name);
  await assertRefs(actor, null, input.ownerId);
  const batch = await prisma.candidateBatch.create({
    data: { workspaceId: actor.workspaceId, ownerId: actor.actorUserId, ...data, name: data.name as string },
  });
  void audit(actor, WORKSPACE_AUDIT_ACTIONS.BATCH_CREATED, "candidateBatch", batch.id, { name: batch.name });
  return batch;
}

export async function updateBatch(actor: CandidateActor, batchId: string, input: Partial<BatchInput>) {
  const current = await prisma.candidateBatch.findFirst({ where: { id: batchId, workspaceId: actor.workspaceId } });
  if (!current) throw new CandidateError(404, "Batch not found.");
  const data = batchData(input);
  if (input.name !== undefined) await assertBatchNameFree(actor, input.name, batchId);
  if (input.ownerId) await assertRefs(actor, null, input.ownerId);
  const batch = await prisma.candidateBatch.update({ where: { id: batchId }, data });
  void audit(actor, WORKSPACE_AUDIT_ACTIONS.BATCH_UPDATED, "candidateBatch", batchId, {
    name: batch.name,
    fields: Object.keys(data),
  });
  return batch;
}

/** Deleting a batch keeps its candidates; they just lose the batch. */
export async function deleteBatch(actor: CandidateActor, batchId: string) {
  const current = await prisma.candidateBatch.findFirst({
    where: { id: batchId, workspaceId: actor.workspaceId },
    select: { id: true, name: true, _count: { select: { candidates: true } } },
  });
  if (!current) throw new CandidateError(404, "Batch not found.");
  await prisma.candidateBatch.delete({ where: { id: batchId } });
  void audit(actor, WORKSPACE_AUDIT_ACTIONS.BATCH_DELETED, "candidateBatch", batchId, {
    name: current.name,
    candidates: current._count.candidates,
  });
  return { ok: true, detached: current._count.candidates };
}

/* ──────────────────────────────────────────────────────────────────────────
 * One entry point for every bulk action, shared by the bulk API and the
 * list's bulk bar.
 * ────────────────────────────────────────────────────────────────────────── */

export type BulkAction =
  | {
      action: "stage";
      stage: string;
      rejectReason?: RejectReason;
      rejectReasonNote?: string | null;
      /** Confirms passing candidates whose results do not back it. */
      override?: boolean;
    }
  | { action: "batch"; batchId: string | null }
  | { action: "owner"; ownerId: string | null }
  | { action: "tag"; add?: string[]; remove?: string[] }
  | { action: "archive" }
  | { action: "restore" }
  | { action: "erase" };

const BULK_PERMISSION: Record<BulkAction["action"], Permission> = {
  stage: "candidate:manage_pipeline",
  batch: "candidate:write",
  owner: "candidate:write",
  tag: "candidate:write",
  archive: "candidate:delete",
  restore: "candidate:delete",
  erase: "candidate:delete",
};

export async function runBulkAction(
  actor: CandidateActor,
  ids: string[],
  op: BulkAction,
): Promise<{ changed: number }> {
  if (!(await canMember(actor.member, BULK_PERMISSION[op.action]))) {
    throw new CandidateError(403, "You do not have permission to do that.");
  }
  switch (op.action) {
    case "stage": {
      const r = await moveCandidatesStage(actor, ids, op.stage, op);
      return { changed: r.moved };
    }
    case "batch":
      return setCandidatesBatch(actor, ids, op.batchId);
    case "owner":
      return setCandidatesOwner(actor, ids, op.ownerId);
    case "tag":
      return tagCandidates(actor, ids, op.add ?? [], op.remove ?? []);
    case "archive":
      return archiveCandidates(actor, ids, true);
    case "restore":
      return archiveCandidates(actor, ids, false);
    case "erase": {
      const r = await eraseCandidates(actor, ids);
      return { changed: r.erased };
    }
    default:
      throw new CandidateError(400, "Unknown bulk action.");
  }
}

/** Turn a thrown error into a JSON response body and status for API routes. */
export function candidateErrorResponse(err: unknown): { body: Record<string, unknown>; status: number } {
  if (err instanceof CandidateError) {
    return { body: { error: err.message, ...(err.extra ?? {}) }, status: err.status };
  }
  console.error("[candidates] unexpected error:", err);
  return { body: { error: "Something went wrong. Try again." }, status: 500 };
}
