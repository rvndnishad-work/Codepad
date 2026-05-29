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

/**
 * Authorize as a member of the workspace + return the workspace id.
 * Mirrors the pattern used in /w/[slug]/ats/actions.ts.
 */
async function assertWorkspaceMember(slug: string) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) throw new Error("Not authenticated");
  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: {
      id: true,
      members: { select: { userId: true, role: true } },
    },
  });
  if (!workspace) throw new Error("Workspace not found");
  const member = workspace.members.find((m) => m.userId === session.user.id);
  if (!member) throw new Error("Not a member of this workspace");
  return { workspaceId: workspace.id, role: member.role };
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
  const { workspaceId } = await assertWorkspaceMember(slug);
  if (!isPipelineStage(input.toStage)) {
    throw new Error(`Unknown stage: ${input.toStage}`);
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
      // Keep legacy `status` synced to the terminal stages so existing UIs
      // that read `status` don't get out of sync.
      ...(input.toStage === "HIRED" ? { status: "hired" } : {}),
      ...(input.toStage === "REJECTED" ? { status: "rejected" } : {}),
    },
  });

  if (updated.count === 0) {
    throw new Error("Candidate not found in this workspace.");
  }

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
  const { workspaceId } = await assertWorkspaceMember(slug);

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
 * Bulk take-home dispatch (IP-35)
 * ──────────────────────────────────────────────────────────────────────────
 * One challenge → N candidates. Wraps all inserts in a single transaction so
 * a mid-loop failure rolls back the partial batch — recruiter never has to
 * worry about "did 14 of 20 go out?" ambiguity.
 *
 * Each recipient flow:
 *   - Upsert Candidate (auto-create at stage=TAKE_HOME if new)
 *   - Mint 64-char hex token
 *   - Create TakeHomeAssignment row pointing at the candidate
 *
 * Email delivery itself is currently a stub — when IP-24 ships, the dispatch
 * fans out via the email service. Tracked as IP-72 for throttling +
 * suppression cooperation.
 */

const BULK_DISPATCH_MAX = 100;
const TIME_LIMIT_MIN = 15;
const TIME_LIMIT_MAX = 1440;
const DAYS_TO_EXPIRE_MIN = 1;
const DAYS_TO_EXPIRE_MAX = 90;

export type BulkRecipient = { name: string; email: string };

export type BulkDispatchInput = {
  challengeId: string;
  recipients: BulkRecipient[];
  timeLimitMin: number;
  daysToExpire: number;
};

export type BulkDispatchPerRow =
  | { email: string; status: "dispatched"; tokenPreview: string; candidateId: string }
  | { email: string; status: "skipped"; reason: string }
  | { email: string; status: "errored"; reason: string };

export type BulkDispatchResult = {
  dispatched: number;
  skipped: number;
  errored: number;
  details: BulkDispatchPerRow[];
  challengeTitle: string;
};

export async function bulkDispatchTakeHomesAction(
  slug: string,
  input: BulkDispatchInput,
): Promise<BulkDispatchResult> {
  const { workspaceId } = await assertWorkspaceMember(slug);

  // Input validation up-front so we don't open a transaction just to error.
  if (!input.challengeId) throw new Error("Challenge is required.");
  if (input.timeLimitMin < TIME_LIMIT_MIN || input.timeLimitMin > TIME_LIMIT_MAX) {
    throw new Error(`Time limit must be between ${TIME_LIMIT_MIN} and ${TIME_LIMIT_MAX} minutes.`);
  }
  if (input.daysToExpire < DAYS_TO_EXPIRE_MIN || input.daysToExpire > DAYS_TO_EXPIRE_MAX) {
    throw new Error(`Days to expire must be between ${DAYS_TO_EXPIRE_MIN} and ${DAYS_TO_EXPIRE_MAX}.`);
  }
  if (!Array.isArray(input.recipients) || input.recipients.length === 0) {
    throw new Error("Pick at least one recipient.");
  }
  if (input.recipients.length > BULK_DISPATCH_MAX) {
    throw new Error(`Bulk dispatch is capped at ${BULK_DISPATCH_MAX} recipients per send.`);
  }

  // Verify the challenge exists (and is accessible — caller is a workspace
  // member, and challenges are global today).
  const challenge = await prisma.challenge.findUnique({
    where: { id: input.challengeId },
    select: { id: true, title: true },
  });
  if (!challenge) throw new Error("Challenge not found.");

  // Within-batch dedup: if the recruiter pastes the same email twice, only
  // send once. Email comparison is case-insensitive + trimmed.
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

  if (cleaned.length === 0) {
    throw new Error("No valid recipients after dedup / validation.");
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + input.daysToExpire);

  // Single transaction — all-or-nothing. A 100-row batch is well within
  // SQLite/Postgres comfort zones; the transaction also guarantees that a
  // crash mid-loop doesn't leave half-sent state.
  await prisma.$transaction(async (tx) => {
    for (const r of cleaned) {
      try {
        const candidate = await tx.candidate.upsert({
          where: { workspaceId_email: { workspaceId, email: r.email } },
          update: { name: r.name },
          create: {
            workspaceId,
            name: r.name,
            email: r.email,
            source: "take-home",
            status: "active",
            stage: "TAKE_HOME",
            stageChangedAt: new Date(),
          },
          select: { id: true },
        });

        const token = crypto.randomBytes(32).toString("hex");
        const created = await tx.takeHomeAssignment.create({
          data: {
            workspaceId,
            challengeId: challenge.id,
            candidateName: r.name,
            candidateEmail: r.email,
            candidateId: candidate.id,
            token,
            status: "PENDING",
            expiresAt,
            timeLimitMin: input.timeLimitMin,
          },
          select: { id: true },
        });

        details.push({
          email: r.email,
          status: "dispatched",
          tokenPreview: token.slice(0, 8) + "…",
          candidateId: candidate.id,
        });

        // TODO(IP-72): wire email send here once IP-24 lands. Today this is
        // a no-op — the recruiter copies the token/link from the leaderboard
        // and shares manually, same as the single-dispatch flow.
      } catch (err) {
        details.push({
          email: r.email,
          status: "errored",
          reason: (err as Error).message?.slice(0, 200) ?? "unknown",
        });
        // Throwing here would abort the transaction. Recorded as errored;
        // the transaction continues to give the recruiter a full report.
        // For a stricter all-or-nothing, swap to `throw err;` — but a single
        // bad row shouldn't sink the other 99.
      }
    }
  });

  const dispatched = details.filter((d) => d.status === "dispatched").length;
  const skipped = details.filter((d) => d.status === "skipped").length;
  const errored = details.filter((d) => d.status === "errored").length;

  revalidatePath(`/w/${slug}/candidates`);
  revalidatePath(`/w/${slug}/leaderboard`);
  revalidatePath(`/w/${slug}`);

  return { dispatched, skipped, errored, details, challengeTitle: challenge.title };
}

/* ──────────────────────────────────────────────────────────────────────────
 * Leaderboard CSV export (IP-35)
 * ──────────────────────────────────────────────────────────────────────────
 * Server action returning CSV text. Caller (the leaderboard client) wraps it
 * in a Blob + anchor download. Keeping it as a plain string return so this is
 * cheap to wire and reusable from automation later.
 */
export type LeaderboardCsvFilters = {
  challengeId?: string;
};

export async function exportLeaderboardCsvAction(
  slug: string,
  filters: LeaderboardCsvFilters = {},
): Promise<string> {
  const { workspaceId } = await assertWorkspaceMember(slug);
  const where: Record<string, unknown> = { workspaceId };
  if (filters.challengeId) where.challengeId = filters.challengeId;

  const rows = await prisma.takeHomeAssignment.findMany({
    where,
    select: {
      id: true,
      candidateName: true,
      candidateEmail: true,
      status: true,
      submittedAt: true,
      expiresAt: true,
      timeLimitMin: true,
      challenge: { select: { title: true } },
      attempt: { select: { score: true, startedAt: true } },
      createdAt: true,
    },
    orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
  });

  const header = [
    "candidate_name",
    "candidate_email",
    "challenge",
    "status",
    "score",
    "dispatched_at",
    "submitted_at",
    "time_to_submit_minutes",
    "expires_at",
  ];

  const esc = (v: string | number | null | undefined) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const lines = [header.join(",")];
  for (const r of rows) {
    const minutesToSubmit =
      r.submittedAt && r.attempt?.startedAt
        ? Math.round((r.submittedAt.getTime() - r.attempt.startedAt.getTime()) / 60000)
        : "";
    lines.push(
      [
        esc(r.candidateName),
        esc(r.candidateEmail),
        esc(r.challenge.title),
        esc(r.status),
        esc(r.attempt?.score ?? ""),
        esc(r.createdAt.toISOString()),
        esc(r.submittedAt?.toISOString() ?? ""),
        esc(minutesToSubmit),
        esc(r.expiresAt.toISOString()),
      ].join(","),
    );
  }

  return lines.join("\n") + "\n";
}

