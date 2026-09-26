"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  ScrollText,
  Download,
  Filter,
  Calendar,
  User as UserIcon,
  Tag as TagIcon,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { exportWorkspaceAuditCsvAction } from "./actions";

type AuditRow = {
  id: string;
  action: string;
  actorEmail: string | null;
  actorUserId: string | null;
  targetType: string | null;
  targetId: string | null;
  meta: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
};

type Props = {
  slug: string;
  workspaceName: string;
  members: Array<{ id: string; email: string; name: string | null }>;
  distinctActions: string[];
  rows: AuditRow[];
  activeFilter: {
    actor: string | null;
    action: string | null;
    start: string | null;
    end: string | null;
  };
  nextCursor: string | null;
  currentCursor: string | null;
};

/**
 * Per-action visual hints. Adding a new action? Either map it here or it
 * falls back to a neutral slate tone — both render correctly, the map just
 * adds at-a-glance categorisation.
 */
const ACTION_META: Record<string, { label: string; tone: string }> = {
  PIPELINE_STAGE_CHANGED: {
    label: "Screening stage changed",
    tone: "border-secondary/30 bg-secondary/[0.06] text-secondary",
  },
  BULK_TAKE_HOME_DISPATCHED: {
    label: "Bulk take-home dispatched",
    tone: "border-warning/30 bg-warning/[0.06] text-warning",
  },
  CANDIDATE_CSV_IMPORTED: {
    label: "Candidate CSV imported",
    tone: "border-secondary/30 bg-secondary/[0.06] text-secondary",
  },
  CANDIDATE_CREATED: {
    label: "Candidate added",
    tone: "border-success/30 bg-success/[0.06] text-success",
  },
  CANDIDATE_UPDATED: {
    label: "Candidate details edited",
    tone: "border-border bg-panel text-muted",
  },
  CANDIDATE_ARCHIVED: {
    label: "Candidate archived",
    tone: "border-border bg-panel text-muted",
  },
  CANDIDATE_RESTORED: {
    label: "Candidate restored",
    tone: "border-border bg-panel text-muted",
  },
  CANDIDATE_ERASED: {
    label: "Candidate erased",
    tone: "border-danger/30 bg-danger/[0.05] text-danger",
  },
  CANDIDATE_BATCH_CHANGED: {
    label: "Candidate batch changed",
    tone: "border-secondary/30 bg-secondary/[0.06] text-secondary",
  },
  CANDIDATE_OWNER_CHANGED: {
    label: "Candidate owner changed",
    tone: "border-secondary/30 bg-secondary/[0.06] text-secondary",
  },
  CANDIDATE_TAGS_CHANGED: {
    label: "Candidate tags changed",
    tone: "border-border bg-panel text-muted",
  },
  CANDIDATE_NOTE_ADDED: {
    label: "Candidate note added",
    tone: "border-border bg-panel text-muted",
  },
  CANDIDATE_NOTE_DELETED: {
    label: "Candidate note deleted",
    tone: "border-border bg-panel text-muted",
  },
  CANDIDATES_IMPORTED: {
    label: "Candidates imported",
    tone: "border-secondary/30 bg-secondary/[0.06] text-secondary",
  },
  BATCH_CREATED: {
    label: "Batch created",
    tone: "border-success/30 bg-success/[0.06] text-success",
  },
  BATCH_UPDATED: {
    label: "Batch updated",
    tone: "border-border bg-panel text-muted",
  },
  BATCH_DELETED: {
    label: "Batch deleted",
    tone: "border-danger/30 bg-danger/[0.05] text-danger",
  },
  AI_SCREENING_CREATED: {
    label: "AI screening sent",
    tone: "border-success/30 bg-success/[0.06] text-success",
  },
  AI_SCREENING_CANDIDATES_ADDED: {
    label: "People added to an AI screening",
    tone: "border-secondary/30 bg-secondary/[0.06] text-secondary",
  },
  AI_SCREENING_INVITE_RESENT: {
    label: "AI screening invite resent",
    tone: "border-border bg-panel text-muted",
  },
  AI_SCREENING_REMINDED: {
    label: "AI screening reminder sent",
    tone: "border-border bg-panel text-muted",
  },
  AI_SCREENING_CANCELLED: {
    label: "AI screening invite cancelled",
    tone: "border-warning/30 bg-warning/[0.06] text-warning",
  },
  AI_SCREENING_DELETED: {
    label: "AI screening deleted",
    tone: "border-danger/30 bg-danger/[0.05] text-danger",
  },
  AI_SCREENING_PASS_MARK_CHANGED: {
    label: "AI screening pass mark changed",
    tone: "border-secondary/30 bg-secondary/[0.06] text-secondary",
  },
  AI_QUESTION_SET_SAVED: {
    label: "AI question saved",
    tone: "border-border bg-panel text-muted",
  },
  AI_QUESTION_SET_DELETED: {
    label: "AI question deleted",
    tone: "border-danger/30 bg-danger/[0.05] text-danger",
  },
  TAKE_HOME_REMINDED: {
    label: "Take-home reminder sent",
    tone: "border-border bg-panel text-muted",
  },
  TAKE_HOME_EXTENDED: {
    label: "Take-home deadline extended",
    tone: "border-secondary/30 bg-secondary/[0.06] text-secondary",
  },
  TAKE_HOME_CANCELLED: {
    label: "Take-home cancelled",
    tone: "border-warning/30 bg-warning/[0.06] text-warning",
  },
  TAKE_HOME_INVITE_RESENT: {
    label: "Take-home invite resent",
    tone: "border-border bg-panel text-muted",
  },
  TAKE_HOME_TEMPLATE_SAVED: {
    label: "Take-home template saved",
    tone: "border-border bg-panel text-muted",
  },
  TAKE_HOME_TEMPLATE_DELETED: {
    label: "Take-home template deleted",
    tone: "border-danger/30 bg-danger/[0.05] text-danger",
  },
  INTERVIEW_DELETED: {
    label: "Interview deleted",
    tone: "border-danger/30 bg-danger/[0.05] text-danger",
  },
  INTERVIEW_SCORECARD_SUBMITTED: {
    label: "Interview scorecard submitted",
    tone: "border-border bg-panel text-muted",
  },
  INTERVIEW_SCORECARD_AMENDED: {
    label: "Submitted scorecard amended",
    tone: "border-warning/30 bg-warning/[0.06] text-warning",
  },
  INTERVIEW_SCORECARDS_NUDGED: {
    label: "Scorecard reminder sent",
    tone: "border-border bg-panel text-muted",
  },
  INTERVIEW_PASS_MARK_CHANGED: {
    label: "Interview pass mark changed",
    tone: "border-secondary/30 bg-secondary/[0.06] text-secondary",
  },
  ATS_INTEGRATION_CONNECTED: {
    label: "ATS connected / updated",
    tone: "border-success/30 bg-success/[0.06] text-success",
  },
  ATS_INTEGRATION_DISCONNECTED: {
    label: "ATS disconnected",
    tone: "border-danger/30 bg-danger/[0.05] text-danger",
  },
  ATS_INTEGRATION_TEST_SENT: {
    label: "ATS test event sent",
    tone: "border-border bg-panel text-muted",
  },
};

function labelFor(action: string): { label: string; tone: string } {
  return (
    ACTION_META[action] ?? {
      label: action.replace(/_/g, " ").toLowerCase(),
      tone: "border-border bg-panel text-muted",
    }
  );
}

export default function WorkspaceAuditClient({
  slug,
  workspaceName,
  members,
  distinctActions,
  rows,
  activeFilter,
  nextCursor,
  currentCursor,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [exporting, startExport] = useTransition();

  // Local form state — pushed to URL on Apply so the page re-renders with
  // server-side filtered data + the filter survives reload / share.
  const [actor, setActor] = useState(activeFilter.actor ?? "");
  const [action, setAction] = useState(activeFilter.action ?? "");
  const [start, setStart] = useState(activeFilter.start ?? "");
  const [end, setEnd] = useState(activeFilter.end ?? "");

  const filterCount =
    (activeFilter.actor ? 1 : 0) +
    (activeFilter.action ? 1 : 0) +
    (activeFilter.start ? 1 : 0) +
    (activeFilter.end ? 1 : 0);

  function apply() {
    const params = new URLSearchParams();
    if (actor) params.set("actor", actor);
    if (action) params.set("action", action);
    if (start) params.set("start", start);
    if (end) params.set("end", end);
    router.push(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`);
  }

  function clearAll() {
    setActor("");
    setAction("");
    setStart("");
    setEnd("");
    router.push(pathname);
  }

  function nextPage() {
    if (!nextCursor) return;
    const params = new URLSearchParams();
    if (actor) params.set("actor", actor);
    if (action) params.set("action", action);
    if (start) params.set("start", start);
    if (end) params.set("end", end);
    params.set("cursor", nextCursor);
    router.push(`${pathname}?${params.toString()}`);
  }

  function firstPage() {
    const params = new URLSearchParams();
    if (actor) params.set("actor", actor);
    if (action) params.set("action", action);
    if (start) params.set("start", start);
    if (end) params.set("end", end);
    router.push(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`);
  }

  function onExport() {
    startExport(async () => {
      try {
        const csv = await exportWorkspaceAuditCsvAction(slug, {
          actorUserId: activeFilter.actor ?? undefined,
          action: activeFilter.action ?? undefined,
          start: activeFilter.start ?? undefined,
          end: activeFilter.end ?? undefined,
        });
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
        const filterTag = filterCount > 0 ? "_filtered" : "";
        a.download = `${slug}_audit${filterTag}_${stamp}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        toast.success("Audit log exported.");
      } catch (err) {
        toast.error((err as Error).message ?? "Export failed.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1 min-w-0">
          <Link
            href={`/w/${slug}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-fg"
          >
            <ArrowLeft className="w-3 h-3" /> {workspaceName}
          </Link>
          <h1 className="text-2xl md:text-[26px] font-semibold tracking-[-0.02em] text-fg">Audit log</h1>
          <p className="text-sm text-muted leading-relaxed max-w-2xl">
            Workspace-mutating actions are recorded here for compliance review.
            Owners and admins can filter, paginate, and export to CSV.
            Coverage today: pipeline transitions, bulk dispatches, CSV imports, ATS integration changes —
            see <code className="font-mono">IP-76</code> for the full roadmap.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onExport}
            disabled={exporting || rows.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-fg border border-border bg-panel/40 hover:bg-panel disabled:opacity-50"
          >
            <Download className="w-3 h-3" />
            {exporting ? "Exporting…" : "Export CSV"}
          </button>
        </div>
      </header>

      {/* Filters */}
      <section className="rounded-xl border border-border bg-surface/60 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-muted" />
          <span className="text-xs font-semibold text-muted/70">
            Filters
          </span>
          {filterCount > 0 && (
            <span className="text-xs text-secondary font-mono ml-1">
              {filterCount} active
            </span>
          )}
          {filterCount > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="text-xs text-muted hover:text-fg ml-auto inline-flex items-center gap-1"
            >
              <X className="w-2.5 h-2.5" />
              Clear
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted/70 flex items-center gap-1">
              <UserIcon className="w-2.5 h-2.5" /> Actor
            </label>
            <select
              value={actor}
              onChange={(e) => setActor(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-md bg-bg border border-border text-xs text-fg focus:outline-none focus:border-fg"
            >
              <option value="">Any member</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.email}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted/70 flex items-center gap-1">
              <TagIcon className="w-2.5 h-2.5" /> Action
            </label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-md bg-bg border border-border text-xs text-fg focus:outline-none focus:border-fg"
            >
              <option value="">Any action</option>
              {distinctActions.map((a) => (
                <option key={a} value={a}>
                  {labelFor(a).label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted/70 flex items-center gap-1">
              <Calendar className="w-2.5 h-2.5" /> Since
            </label>
            <input
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-md bg-bg border border-border text-xs text-fg focus:outline-none focus:border-fg"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted/70 flex items-center gap-1">
              <Calendar className="w-2.5 h-2.5" /> Until
            </label>
            <input
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-md bg-bg border border-border text-xs text-fg focus:outline-none focus:border-fg"
            />
          </div>
        </div>

        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={apply}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-fg text-bg hover:opacity-90"
          >
            Apply
          </button>
        </div>
      </section>

      {/* Rows */}
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-bg/30 p-12 text-center space-y-2">
          <ScrollText className="w-8 h-8 text-muted/40 mx-auto" />
          <div className="text-sm text-muted">
            {filterCount > 0
              ? "No audit entries match this filter."
              : "No audit entries yet — they'll appear as workspace actions happen."}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface/60 overflow-hidden">
          <ul className="divide-y divide-border">
            {rows.map((r) => {
              const meta = labelFor(r.action);
              return (
                <li key={r.id} className="px-4 py-3 hover:bg-panel/20 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold border ${meta.tone}`}
                        >
                          {meta.label}
                        </span>
                        {r.targetType && (
                          <span className="text-xs font-mono text-muted/70">
                            {r.targetType}
                            {r.targetId ? `:${r.targetId.slice(0, 8)}…` : ""}
                          </span>
                        )}
                      </div>
                      <div className="text-[12px] text-fg">
                        {r.actorEmail ? (
                          <span>
                            <span className="text-muted">by</span>{" "}
                            <span className="font-semibold">{r.actorEmail}</span>
                          </span>
                        ) : (
                          <span className="text-muted/60 italic">unknown actor</span>
                        )}
                      </div>
                      {r.meta && Object.keys(r.meta).length > 0 && (
                        <MetaPreview meta={r.meta} />
                      )}
                    </div>
                    <div className="text-xs text-muted/70 font-mono shrink-0 text-right">
                      <div>{new Date(r.createdAt).toLocaleString()}</div>
                      {r.ip && <div className="mt-0.5">{r.ip}</div>}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Pagination */}
      {(rows.length > 0 || currentCursor) && (
        <div className="flex items-center justify-between text-xs text-muted">
          <div>{rows.length} row{rows.length === 1 ? "" : "s"} shown</div>
          <div className="flex items-center gap-2">
            {currentCursor && (
              <button
                type="button"
                onClick={firstPage}
                className="inline-flex items-center gap-1 px-2 py-1 rounded border border-border hover:bg-panel/40 text-fg"
              >
                <ChevronLeft className="w-3 h-3" /> First page
              </button>
            )}
            {nextCursor && (
              <button
                type="button"
                onClick={nextPage}
                className="inline-flex items-center gap-1 px-2 py-1 rounded border border-border hover:bg-panel/40 text-fg"
              >
                Older <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact meta render — shows the first ~4 key/value pairs inline rather than
 * dumping JSON. For audits investigating a specific row, the full JSON is one
 * CSV export away.
 */
function MetaPreview({ meta }: { meta: Record<string, unknown> }) {
  const entries = useMemo(() => Object.entries(meta).slice(0, 4), [meta]);
  if (entries.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 pt-0.5">
      {entries.map(([k, v]) => (
        <span
          key={k}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-bg/60 border border-border text-xs font-mono"
          title={`${k}: ${JSON.stringify(v)}`}
        >
          <span className="text-muted">{k}</span>
          <span className="text-fg truncate max-w-[160px]">{shortValue(v)}</span>
        </span>
      ))}
      {Object.keys(meta).length > 4 && (
        <span className="text-xs text-muted/70 self-center">
          +{Object.keys(meta).length - 4} more
        </span>
      )}
    </div>
  );
}

function shortValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v.length > 30 ? v.slice(0, 30) + "…" : v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return `[${v.length}]`;
  if (typeof v === "object") return "{…}";
  return String(v);
}
