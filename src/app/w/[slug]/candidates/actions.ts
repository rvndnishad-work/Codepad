"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import crypto from "crypto";
import {
  isPipelineStage,
  type PipelineStage,
  REJECT_REASONS,
  type RejectReason,
} from "@/lib/crm/stages";
import {
  writeWorkspaceAuditEntry,
  WORKSPACE_AUDIT_ACTIONS,
} from "@/lib/workspace-audit";
import { upsertCandidateForWorkflow } from "@/lib/crm/auto-create";
import { advanceCandidateStage } from "@/lib/crm/advance";
import { canMember, type Permission } from "@/lib/permissions";

/**
 * Authorize as a member of the workspace + return the workspace id.
 * Mirrors the pattern used in /w/[slug]/ats/actions.ts.
 *
 * Pass `permission` to additionally enforce a workspace permission via the
 * shared engine (IP-73) — a VIEWER should not be able to move stages or delete
 * candidates just because they can read the board.
 */
async function assertWorkspaceMember(slug: string, permission?: Permission) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) throw new Error("Not authenticated");
  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: {
      id: true,
      members: { select: { userId: true, role: true, permissions: true } },
    },
  });
  if (!workspace) throw new Error("Workspace not found");
  const member = workspace.members.find((m) => m.userId === session.user.id);
  if (!member) throw new Error("Not a member of this workspace");
  if (permission && !(await canMember(member, permission))) {
    throw new Error("You don't have permission to perform this action.");
  }
  return {
    workspaceId: workspace.id,
    role: member.role,
    member,
    // Actor context for audit writes (IP-37). Email snapshot lets rows stay
    // readable even after the actor account is deleted.
    actorUserId: session.user.id,
    actorEmail: session.user.email ?? null,
  };
}

export type UpdateStageInput = {
  candidateId: string;
  toStage: PipelineStage;
  /** Required when toStage === "REJECTED". */
  rejectReason?: RejectReason;
  rejectReasonNote?: string;
};

export async function updateCandidateStageAction(
  slug: string,
  input: UpdateStageInput,
) {
  const { workspaceId, actorUserId, actorEmail } = await assertWorkspaceMember(
    slug,
    "candidate:manage_pipeline",
  );
  if (!isPipelineStage(input.toStage)) {
    throw new Error(`Unknown stage: ${input.toStage}`);
  }

  // Snapshot the previous stage for the audit row so the trail reads
  // "moved Ava Patel from SCREENED → ONSITE" rather than only the new stage.
  const previous = await prisma.candidate.findUnique({
    where: { id: input.candidateId },
    select: { stage: true, name: true, workspaceId: true },
  });
  if (!previous || previous.workspaceId !== workspaceId) {
    throw new Error("Candidate not found in this workspace.");
  }

  // Reject-reason gate — server-side enforced so even a direct action call
  // can't bypass the UI requirement.
  if (input.toStage === "REJECTED" && !input.rejectReason) {
    throw new Error(
      "A reject reason is required when moving a candidate to Rejected.",
    );
  }
  if (input.rejectReason && !REJECT_REASONS.includes(input.rejectReason)) {
    throw new Error(`Unknown reject reason: ${input.rejectReason}`);
  }

  // Atomic update scoped by workspaceId so a guessed candidate id from a
  // different workspace can't be mutated.
  const updated = await prisma.candidate.updateMany({
    where: { id: input.candidateId, workspaceId },
    data: {
      stage: input.toStage,
      rejectReason: input.toStage === "REJECTED" ? input.rejectReason : null,
      rejectReasonNote:
        input.toStage === "REJECTED"
          ? input.rejectReasonNote?.trim() || null
          : null,
      stageChangedAt: new Date(),
      // Keep legacy `status` synced with terminal stages in BOTH directions:
      // entering HIRED/REJECTED sets the disposition, and leaving a terminal
      // stage resets it to "active" so roster filters (status-keyed) agree
      // with the board (stage-keyed) instead of showing a stale red pill.
      ...(input.toStage === "HIRED" ? { status: "hired" } : {}),
      ...(input.toStage === "REJECTED" ? { status: "rejected" } : {}),
      ...(input.toStage !== "HIRED" &&
      input.toStage !== "REJECTED" &&
      (previous.stage === "HIRED" || previous.stage === "REJECTED")
        ? { status: "active" }
        : {}),
    },
  });

  if (updated.count === 0) {
    throw new Error("Candidate not found in this workspace.");
  }

  // IP-37: workspace audit row. Fire-and-forget — failure here logs but
  // never rolls back the stage transition the user just committed to.
  void writeWorkspaceAuditEntry({
    workspaceId,
    actorUserId,
    actorEmail,
    action: WORKSPACE_AUDIT_ACTIONS.PIPELINE_STAGE_CHANGED,
    targetType: "candidate",
    targetId: input.candidateId,
    meta: {
      candidateName: previous.name,
      fromStage: previous.stage,
      toStage: input.toStage,
      ...(input.toStage === "REJECTED"
        ? { rejectReason: input.rejectReason, hasNote: !!input.rejectReasonNote?.trim() }
        : {}),
    },
  });

  revalidatePath(`/w/${slug}/candidates`);
  revalidatePath(`/w/${slug}`);
  return { ok: true };
}

/* ──────────────────────────────────────────────────────────────────────────
 * CSV import (IP-34)
 * ──────────────────────────────────────────────────────────────────────────
 * Parses a small CSV (≤ MAX_ROWS) into Candidate rows, deduped by email per
 * workspace. Returns per-row results so the dialog can show "imported /
 * skipped (duplicate) / errored" buckets.
 */

const MAX_ROWS = 500;
const MAX_CSV_BYTES = 256 * 1024; // 256 KB

/**
 * Header → column index map. Accept casing-flexible variants of the common
 * fields. Unmatched columns are ignored.
 */
function indexColumns(header: string[]): Record<string, number | undefined> {
  const norm = (s: string) => s.toLowerCase().trim().replace(/[\s_-]+/g, "");
  const map: Record<string, number> = {};
  header.forEach((h, i) => {
    map[norm(h)] = i;
  });
  return {
    name: map["name"] ?? map["fullname"] ?? map["candidatename"],
    email: map["email"] ?? map["emailaddress"],
    phone: map["phone"] ?? map["phonenumber"],
    source: map["source"] ?? map["origin"],
    stage: map["stage"] ?? map["pipelinestage"],
    tags: map["tags"],
    notes: map["notes"] ?? map["comments"],
  };
}

export type CsvImportResult = {
  imported: number;
  skipped: number;
  errored: number;
  details: Array<{
    row: number;
    status: "imported" | "skipped" | "errored";
    reason?: string;
    candidateId?: string;
  }>;
};

export async function importCandidatesCsvAction(
  slug: string,
  csv: string,
): Promise<CsvImportResult> {
  const { workspaceId, actorUserId, actorEmail } = await assertWorkspaceMember(
    slug,
    "candidate:write",
  );

  if (csv.length > MAX_CSV_BYTES) {
    throw new Error(
      `CSV too large (${Math.round(csv.length / 1024)} KB). Limit is ${MAX_CSV_BYTES / 1024} KB.`,
    );
  }

  // Tiny CSV parser — covers quoted fields with embedded commas/newlines,
  // double-quote escapes. Avoid pulling a library for ~30 lines.
  const rows = parseCsv(csv);
  if (rows.length === 0) {
    throw new Error("CSV appears empty.");
  }
  if (rows.length > MAX_ROWS + 1) {
    throw new Error(`Too many rows (${rows.length - 1}). Limit is ${MAX_ROWS}.`);
  }

  const [header, ...data] = rows;
  const cols = indexColumns(header);
  if (cols.email === undefined) {
    throw new Error("CSV must include an `email` column.");
  }
  if (cols.name === undefined) {
    throw new Error("CSV must include a `name` column.");
  }

  const result: CsvImportResult = {
    imported: 0,
    skipped: 0,
    errored: 0,
    details: [],
  };

  // Look up existing emails in one query so per-row dedup is fast.
  const incomingEmails = data
    .map((r) => (cols.email !== undefined ? r[cols.email]?.toLowerCase().trim() : ""))
    .filter((e) => !!e);
  const existing = await prisma.candidate.findMany({
    where: { workspaceId, email: { in: incomingEmails } },
    select: { email: true },
  });
  const existingEmails = new Set(existing.map((e) => e.email?.toLowerCase()));

  // Insert in a single transaction so a mid-loop failure rolls back the
  // partial batch.
  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowIndex = i + 2; // 1-based + header line
      try {
        const name = cols.name !== undefined ? row[cols.name]?.trim() : "";
        const email = cols.email !== undefined ? row[cols.email]?.toLowerCase().trim() : "";
        if (!name || !email) {
          result.errored++;
          result.details.push({ row: rowIndex, status: "errored", reason: "Missing name or email" });
          continue;
        }
        if (existingEmails.has(email)) {
          result.skipped++;
          result.details.push({ row: rowIndex, status: "skipped", reason: "Duplicate email" });
          continue;
        }
        // Track within-batch dedup too (two rows with the same email in the
        // CSV itself).
        existingEmails.add(email);

        const phone =
          cols.phone !== undefined && row[cols.phone] ? row[cols.phone].trim() : null;
        const source =
          cols.source !== undefined && row[cols.source]
            ? row[cols.source].trim()
            : "csv-import";
        const tagsRaw = cols.tags !== undefined ? row[cols.tags]?.trim() : "";
        const tags = tagsRaw
          ? JSON.stringify(
              tagsRaw
                .split(/[,;|]/)
                .map((t) => t.trim())
                .filter((t) => t.length > 0),
            )
          : null;
        const notes =
          cols.notes !== undefined && row[cols.notes] ? row[cols.notes].trim() : null;

        const stageRaw =
          cols.stage !== undefined && row[cols.stage] ? row[cols.stage].trim().toUpperCase() : "";
        const stage = isPipelineStage(stageRaw) ? stageRaw : "APPLIED";

        const created = await tx.candidate.create({
          data: {
            workspaceId,
            name,
            email,
            phone,
            source,
            notes,
            tags,
            status: "active",
            stage,
            stageChangedAt: new Date(),
          },
          select: { id: true },
        });
        result.imported++;
        result.details.push({ row: rowIndex, status: "imported", candidateId: created.id });
      } catch (err) {
        result.errored++;
        result.details.push({
          row: rowIndex,
          status: "errored",
          reason: (err as Error).message?.slice(0, 200) ?? "unknown",
        });
      }
    }
  });

  // IP-37: workspace audit row for the import batch.
  if (result.imported > 0 || result.skipped > 0 || result.errored > 0) {
    void writeWorkspaceAuditEntry({
      workspaceId,
      actorUserId,
      actorEmail,
      action: WORKSPACE_AUDIT_ACTIONS.CANDIDATE_CSV_IMPORTED,
      targetType: "workspace",
      targetId: workspaceId,
      meta: {
        imported: result.imported,
        skipped: result.skipped,
        errored: result.errored,
      },
    });
  }

  revalidatePath(`/w/${slug}/candidates`);
  revalidatePath(`/w/${slug}`);
  return result;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Minimal CSV parser
 * ────────────────────────────────────────────────────────────────────────── */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(field);
        field = "";
      } else if (ch === "\n" || ch === "\r") {
        // Treat \r\n as a single line break — skip the \n if it follows \r.
        if (ch === "\r" && text[i + 1] === "\n") i++;
        row.push(field);
        field = "";
        // Skip empty trailing lines.
        if (row.length > 1 || row[0] !== "") rows.push(row);
        row = [];
      } else {
        field += ch;
      }
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    if (row.length > 1 || row[0] !== "") rows.push(row);
  }
  return rows;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Take-home dispatch — shared types + limits
 * ──────────────────────────────────────────────────────────────────────────
 * The legacy single-challenge dispatch (IP-35, `bulkDispatchTakeHomesAction`)
 * was retired in the IP-88 convergence: ALL take-home creation now flows
 * through `bulkCreateTakeHomeSessions` below (quick form and pipeline bulk
 * dialog send 1-question sessions). The recipient/result types stay because
 * the session path and its dialogs share them.
 */

const BULK_DISPATCH_MAX = 100;
const TIME_LIMIT_MIN = 15;
const TIME_LIMIT_MAX = 1440;
const DAYS_TO_EXPIRE_MIN = 1;
const DAYS_TO_EXPIRE_MAX = 90;

export type BulkRecipient = { name: string; email: string };

export type BulkDispatchPerRow =
  | { email: string; status: "dispatched"; tokenPreview: string; candidateId: string }
  | { email: string; status: "skipped"; reason: string }
  | { email: string; status: "errored"; reason: string };

export type BulkDispatchResult = {
  dispatched: number;
  skipped: number;
  errored: number;
  /** How many invite emails Resend accepted (IP-72). May be < dispatched if
   *  some recipients are on the suppression list or the transport failed. */
  emailed: number;
  details: BulkDispatchPerRow[];
  challengeTitle: string;
};

/* ──────────────────────────────────────────────────────────────────────────
 * Multi-question take-home sessions (IP-88)
 * ──────────────────────────────────────────────────────────────────────────
 * The take-home builder curates a SET of questions (DSA + prompt + playground)
 * and assigns to N selected candidates. Each candidate gets one async,
 * tokenized InterviewSession (type="take-home") sharing the curated set, with a
 * per-question timer map + a start deadline. Candidate upsert/dedup flows
 * through upsertCandidateForWorkflow, and invites email via the IP-72 batch
 * path. This is the ONLY take-home creation path (IP-88 convergence).
 */
const DEFAULT_QUESTION_MIN = 30;

export type TakeHomeCuration = {
  challengeIds: string[];
  playgroundIds: string[];
  promptScenarioIds: string[];
  /** sourceId -> minutes (per-question timer). Missing → DEFAULT_QUESTION_MIN. */
  perQuestionMinutes: Record<string, number>;
};

export type CreateTakeHomeSessionsInput = {
  title: string;
  curation: TakeHomeCuration;
  recipients: BulkRecipient[];
  daysToExpire: number;
  scenario?: string | null;
};

export type CreateTakeHomeSessionsResult = {
  created: number;
  emailed: number;
  skipped: number;
  errored: number;
  details: BulkDispatchPerRow[];
};

export async function bulkCreateTakeHomeSessions(
  slug: string,
  input: CreateTakeHomeSessionsInput,
): Promise<CreateTakeHomeSessionsResult> {
  const { workspaceId, actorUserId, actorEmail } = await assertWorkspaceMember(
    slug,
    "takehome:create",
  );

  const challengeIds = [...new Set(input.curation.challengeIds ?? [])];
  const playgroundIds = [...new Set(input.curation.playgroundIds ?? [])];
  const promptScenarioIds = [...new Set(input.curation.promptScenarioIds ?? [])];
  const totalQuestions = challengeIds.length + playgroundIds.length + promptScenarioIds.length;

  if (totalQuestions === 0) throw new Error("Add at least one question to the take-home.");
  // Completion is keyed on coding-challenge attempts (the runner can't execute
  // playground/prompt questions yet), so a session without at least one
  // challenge could never reach "completed" — reject it up front.
  if (challengeIds.length === 0) {
    throw new Error(
      "Include at least one coding challenge — playground and prompt questions aren't candidate-runnable yet, so a take-home needs a challenge to be completable.",
    );
  }
  if (input.daysToExpire < DAYS_TO_EXPIRE_MIN || input.daysToExpire > DAYS_TO_EXPIRE_MAX) {
    throw new Error(`Days to expire must be between ${DAYS_TO_EXPIRE_MIN} and ${DAYS_TO_EXPIRE_MAX}.`);
  }
  if (!Array.isArray(input.recipients) || input.recipients.length === 0) {
    throw new Error("Pick at least one candidate.");
  }
  if (input.recipients.length > BULK_DISPATCH_MAX) {
    throw new Error(`Capped at ${BULK_DISPATCH_MAX} candidates per send.`);
  }

  // Validate the auto-gradable sources exist (challenges + prompt scenarios).
  // Playgrounds are open snippets/templates — trusted as-is in Phase 1.
  const [foundChallenges, foundPrompts] = await Promise.all([
    challengeIds.length
      ? prisma.challenge.findMany({ where: { id: { in: challengeIds } }, select: { id: true } })
      : Promise.resolve([]),
    promptScenarioIds.length
      ? prisma.promptScenario.findMany({ where: { id: { in: promptScenarioIds } }, select: { id: true } })
      : Promise.resolve([]),
  ]);
  if (foundChallenges.length !== challengeIds.length) throw new Error("One or more challenges no longer exist.");
  if (foundPrompts.length !== promptScenarioIds.length) throw new Error("One or more prompt challenges no longer exist.");

  // Per-question limits + the whole-session ceiling (sum of per-question budgets).
  const perQuestionMinutes: Record<string, number> = {};
  let totalMinutes = 0;
  for (const id of [...challengeIds, ...playgroundIds, ...promptScenarioIds]) {
    const m = Number(input.curation.perQuestionMinutes?.[id]) || DEFAULT_QUESTION_MIN;
    const clamped = Math.min(Math.max(m, TIME_LIMIT_MIN), TIME_LIMIT_MAX);
    perQuestionMinutes[id] = clamped;
    totalMinutes += clamped;
  }

  const sourceTypeCount = [challengeIds.length, playgroundIds.length, promptScenarioIds.length].filter((n) => n > 0).length;
  const sourceType =
    sourceTypeCount > 1
      ? "combined"
      : challengeIds.length
        ? "challenge"
        : playgroundIds.length
          ? "playground"
          : "prompt";

  // Recipient dedup + validation (same rules as bulk dispatch).
  const seenEmails = new Set<string>();
  const cleaned: BulkRecipient[] = [];
  const details: BulkDispatchPerRow[] = [];
  for (const r of input.recipients) {
    const email = (r.email ?? "").toLowerCase().trim();
    const name = (r.name ?? "").trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      details.push({ email: r.email ?? "(empty)", status: "errored", reason: "Invalid email" });
      continue;
    }
    if (!name) {
      details.push({ email, status: "errored", reason: "Missing name" });
      continue;
    }
    if (seenEmails.has(email)) {
      details.push({ email, status: "skipped", reason: "Duplicate in this batch" });
      continue;
    }
    seenEmails.add(email);
    cleaned.push({ name, email });
  }
  if (cleaned.length === 0) throw new Error("No valid candidates after dedup / validation.");

  const deadlineAt = new Date();
  deadlineAt.setDate(deadlineAt.getDate() + input.daysToExpire);

  const sessionsJson = {
    challengeIds: JSON.stringify(challengeIds),
    playgroundIds: JSON.stringify(playgroundIds),
    promptScenarioIds: JSON.stringify(promptScenarioIds),
    questionTimeLimitsJson: JSON.stringify(perQuestionMinutes),
  };

  const createdRows: { name: string; email: string; token: string; sessionId: string }[] = [];
  // Pre-existing candidates to forward-advance to TAKE_HOME after commit (IP-69).
  const advanceIds: string[] = [];

  await prisma.$transaction(async (tx) => {
    for (const r of cleaned) {
      try {
        const { candidateId, created: isNew } = await upsertCandidateForWorkflow(
          {
            workspaceId,
            name: r.name,
            email: r.email,
            source: "take-home-dispatch",
            initialStage: "TAKE_HOME",
          },
          tx,
        );
        if (!isNew) advanceIds.push(candidateId);

        const token = crypto.randomBytes(32).toString("hex");
        const created = await tx.interviewSession.create({
          data: {
            userId: actorUserId,
            workspaceId,
            candidateId,
            candidateName: r.name,
            title: input.title?.trim() || "Take-home assessment",
            type: "take-home",
            creatorRole: "interviewer",
            status: "scheduled",
            sourceType,
            challengeIds: sessionsJson.challengeIds,
            playgroundIds: sessionsJson.playgroundIds,
            promptScenarioIds: sessionsJson.promptScenarioIds,
            questionTimeLimitsJson: sessionsJson.questionTimeLimitsJson,
            scenario: input.scenario?.trim() || null,
            totalSec: totalMinutes * 60,
            shareToken: crypto.randomBytes(16).toString("hex"),
            candidateAccessToken: token,
            deadlineAt,
          },
          select: { id: true },
        });

        details.push({ email: r.email, status: "dispatched", tokenPreview: token.slice(0, 8) + "…", candidateId });
        createdRows.push({ name: r.name, email: r.email, token, sessionId: created.id });
      } catch (err) {
        details.push({ email: r.email, status: "errored", reason: (err as Error).message?.slice(0, 200) ?? "unknown" });
      }
    }
  });

  // IP-69: forward-advance pre-existing candidates to TAKE_HOME (post-commit).
  for (const candidateId of advanceIds) {
    await advanceCandidateStage({
      workspaceId,
      candidateId,
      toStage: "TAKE_HOME",
      source: "auto:take-home-session-dispatch",
      actorUserId,
      actorEmail,
    });
  }

  const created = details.filter((d) => d.status === "dispatched").length;
  const skipped = details.filter((d) => d.status === "skipped").length;
  const errored = details.filter((d) => d.status === "errored").length;

  // Batch invite emails (IP-72), after the transaction commits.
  let emailed = 0;
  if (createdRows.length > 0) {
    try {
      const ws = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { name: true } });
      const { sendBulkTakeHomeSessionInvites } = await import("@/lib/take-home/emails");
      const res = await sendBulkTakeHomeSessionInvites({
        workspaceId,
        workspaceName: ws?.name ?? "your workspace",
        title: input.title?.trim() || "Take-home assessment",
        questionCount: totalQuestions,
        deadlineAt,
        rows: createdRows,
      });
      emailed = res.sent;
    } catch (err) {
      console.error("[take-home-sessions] invite emails failed:", err);
    }
  }

  void writeWorkspaceAuditEntry({
    workspaceId,
    actorUserId,
    actorEmail,
    action: WORKSPACE_AUDIT_ACTIONS.BULK_TAKE_HOME_DISPATCHED,
    targetType: "take-home-session-batch",
    targetId: null,
    meta: {
      title: input.title,
      questionCount: totalQuestions,
      created,
      emailed,
      skipped,
      errored,
      daysToExpire: input.daysToExpire,
      sampleRecipients: details.filter((d) => d.status === "dispatched").slice(0, 5).map((d) => d.email),
    },
  });

  revalidatePath(`/w/${slug}`);
  revalidatePath(`/w/${slug}/emails`);

  return { created, emailed, skipped, errored, details };
}

/**
 * Grouped take-home dispatch (IP-89). Each group pairs its own curated question
 * set with its own candidate subset, so one send can assign different questions
 * to different cohorts. Reuses bulkCreateTakeHomeSessions per group. Candidates
 * are deduped ACROSS groups (one group each) — a candidate listed in two groups
 * is kept in the first and skipped in later ones.
 */
export type TakeHomeGroupInput = {
  curation: TakeHomeCuration;
  recipients: BulkRecipient[];
};

export async function createTakeHomeGroups(
  slug: string,
  input: { title: string; daysToExpire: number; scenario?: string | null; groups: TakeHomeGroupInput[] },
): Promise<{ created: number; emailed: number; skipped: number; errored: number; groups: number }> {
  if (!Array.isArray(input.groups) || input.groups.length === 0) {
    throw new Error("Add at least one assignment group.");
  }
  const agg = { created: 0, emailed: 0, skipped: 0, errored: 0 };
  const seenAcross = new Set<string>();
  let dispatchedGroups = 0;

  for (const g of input.groups) {
    const totalQ =
      (g.curation.challengeIds?.length ?? 0) +
      (g.curation.playgroundIds?.length ?? 0) +
      (g.curation.promptScenarioIds?.length ?? 0);
    // Drop candidates already assigned in an earlier group (one group each).
    const recips = (g.recipients ?? []).filter((r) => {
      const k = (r.email ?? "").toLowerCase().trim();
      if (!k || seenAcross.has(k)) return false;
      seenAcross.add(k);
      return true;
    });
    if (totalQ === 0 || recips.length === 0) continue;

    const res = await bulkCreateTakeHomeSessions(slug, {
      title: input.title,
      curation: g.curation,
      recipients: recips,
      daysToExpire: input.daysToExpire,
      scenario: input.scenario ?? null,
    });
    agg.created += res.created;
    agg.emailed += res.emailed;
    agg.skipped += res.skipped;
    agg.errored += res.errored;
    dispatchedGroups++;
  }

  if (dispatchedGroups === 0) {
    throw new Error("Every group needs at least one question and one candidate.");
  }
  return { ...agg, groups: dispatchedGroups };
}


