/**
 * Turns audit rows and assessment results into the candidate's activity
 * timeline. Client-safe.
 */
import { REJECT_REASON_LABELS, STAGE_LABELS, isPipelineStage, type RejectReason } from "@/lib/crm/stages";
import { RESULT_KIND_LABELS, type CandidateResult } from "@/lib/crm/results";

export type ActivityKind = "move" | "note" | "edit" | "batch" | "result" | "sent" | "archive" | "created";

export type ActivityItem = {
  id: string;
  kind: ActivityKind;
  title: string;
  detail: string | null;
  at: string;
  href: string | null;
};

// Rows written before screening-only Candidates keep their old stage names.
const LEGACY_LABELS: Record<string, string> = {
  APPLIED: "Applied",
  SCREENED: "Screened",
  TAKE_HOME: "Take-home",
  ONSITE: "Onsite",
  OFFER: "Offer",
  HIRED: "Hired",
};
const stage = (s: unknown) =>
  typeof s === "string" ? (isPipelineStage(s) ? STAGE_LABELS[s] : (LEGACY_LABELS[s] ?? s)) : "?";
const FIELD: Record<string, string> = { name: "name", email: "email", phone: "phone", source: "source", notes: "notes", tags: "tags" };

export function describeAudit(
  row: { id: string; action: string; meta: string | null; actorName: string | null; createdAt: string },
  lookups: { batch: (id: string | null) => string | null; member: (id: string | null) => string | null },
): ActivityItem | null {
  let m: Record<string, unknown> = {};
  try {
    const p = row.meta ? JSON.parse(row.meta) : null;
    if (p && typeof p === "object") m = p;
  } catch {
    /* unreadable meta */
  }
  const who = row.actorName;
  const auto = typeof m.source === "string" && m.source.startsWith("auto:");
  const base = { id: row.id, at: row.createdAt, href: null };
  switch (row.action) {
    case "PIPELINE_STAGE_CHANGED": {
      const reason = typeof m.rejectReason === "string" ? REJECT_REASON_LABELS[m.rejectReason as RejectReason] ?? m.rejectReason : null;
      return {
        ...base,
        kind: "move",
        title:
          m.toStage === "REJECTED"
            ? `Marked as not passed at ${stage(m.fromStage)}`
            : m.toStage === "PASSED"
              ? typeof m.manualOverride === "string"
                ? "Passed as a manual override"
                : "Passed screening"
              : `Moved from ${stage(m.fromStage)} to ${stage(m.toStage)}`,
        detail:
          [
            auto ? "Automatically, from an assessment event" : who ? `By ${who}` : null,
            reason,
            typeof m.manualOverride === "string" ? m.manualOverride : null,
          ]
            .filter(Boolean)
            .join(" · ") || null,
      };
    }
    case "CANDIDATE_CREATED":
      return { ...base, kind: "created", title: "Added to the workspace", detail: who ? `By ${who}` : null };
    case "CANDIDATE_UPDATED": {
      const fields = Array.isArray(m.fields) ? (m.fields as string[]).map((f) => FIELD[f] ?? f) : [];
      const status = typeof m.toStatus === "string" ? m.toStatus.replace(/_/g, " ") : null;
      return {
        ...base,
        kind: "edit",
        title: status ? `Marked as ${status}` : `Edited ${fields.join(", ") || "details"}`,
        detail: who ? `By ${who}` : null,
      };
    }
    case "CANDIDATE_BATCH_CHANGED": {
      const to = lookups.batch((m.toBatchId as string) ?? null);
      return { ...base, kind: "batch", title: to ? `Added to ${to}` : "Removed from their batch", detail: who ? `By ${who}` : null };
    }
    case "CANDIDATE_OWNER_CHANGED": {
      const to = lookups.member((m.toOwnerId as string) ?? null);
      return { ...base, kind: "edit", title: to ? `Owner set to ${to}` : "Owner removed", detail: who ? `By ${who}` : null };
    }
    case "CANDIDATE_TAGS_CHANGED": {
      const add = Array.isArray(m.added) ? (m.added as string[]) : [];
      const rem = Array.isArray(m.removed) ? (m.removed as string[]) : [];
      const parts = [add.length && `added ${add.join(", ")}`, rem.length && `removed ${rem.join(", ")}`].filter(Boolean);
      return { ...base, kind: "edit", title: `Tags ${parts.join("; ") || "changed"}`, detail: who ? `By ${who}` : null };
    }
    case "CANDIDATE_NOTE_ADDED":
      return { ...base, kind: "note", title: "Added a note", detail: who };
    case "CANDIDATE_ARCHIVED":
      return { ...base, kind: "archive", title: "Archived", detail: who ? `By ${who}` : null };
    case "CANDIDATE_RESTORED":
      return { ...base, kind: "archive", title: "Restored from the archive", detail: who ? `By ${who}` : null };
    case "INTERVIEW_VERDICT_RECORDED":
      return {
        ...base,
        kind: "result",
        title: `Interview verdict: ${String(m.verdict ?? "").replace(/_/g, " ").toLowerCase()}`,
        detail: typeof m.sessionTitle === "string" ? m.sessionTitle : null,
      };
    default:
      return null;
  }
}

/** Timeline entries for each assessment: sent, and finished or scored. */
export function resultActivity(results: CandidateResult[]): ActivityItem[] {
  const out: ActivityItem[] = [];
  for (const r of results) {
    const label = RESULT_KIND_LABELS[r.kind];
    out.push({
      id: `${r.id}:sent`,
      kind: "sent",
      title: r.kind === "interview" ? `${label} booked: ${r.title}` : `${label} sent: ${r.title}`,
      detail: r.deadlineAt ? `Due ${new Date(r.deadlineAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : null,
      at: r.sentAt,
      href: r.href,
    });
    if (r.finishedAt && (r.state === "submitted" || r.state === "scored")) {
      const bits = [
        r.minutesTaken != null && r.minutesAllowed ? `${r.minutesTaken} of ${r.minutesAllowed} minutes` : r.minutesTaken != null ? `${r.minutesTaken} minutes` : null,
        r.score != null ? (r.kind === "interview" && r.rating != null ? `${r.rating.toFixed(1)} of 5` : `score ${r.score}`) : "not scored yet",
        r.verdict && r.kind !== "interview" ? r.verdict : null,
      ].filter(Boolean);
      out.push({
        id: `${r.id}:done`,
        kind: "result",
        title: r.kind === "interview" ? `${label} finished: ${r.title}` : `Finished the ${label.toLowerCase()} ${r.title}`,
        detail: bits.join(" · "),
        at: r.finishedAt,
        href: r.href,
      });
    }
  }
  return out;
}
