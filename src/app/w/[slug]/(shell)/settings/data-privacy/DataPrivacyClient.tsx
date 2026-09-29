"use client";

/**
 * Settings > Data and privacy. Main column: retention rules (saved with the
 * sticky save bar), candidate data requests, export everything, and delete
 * the workspace (owners only). Side column: who processes the data, and a
 * pointer to where candidates see the privacy notice.
 */
import { useCallback, useEffect, useMemo, useState, useTransition, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, ExternalLink, Search } from "lucide-react";
import { Btn, useToasts } from "../../candidates/_components/ui";
import { ConfirmDialog } from "../../candidates/_components/dialogs";
import { PrivacyCard } from "./PrivacyCard";
import { SaveBar, SettingsCard, TextInput, Toggle, inputCls, type SettingsForm } from "../_components/form";
import {
  COUNT_LABELS,
  DPA_REQUEST_URL,
  EXPORT_LINK_DAYS,
  RETENTION_COPY,
  RETENTION_LIMITS,
  SUBPROCESSORS,
  daysUntil,
  describeCounts,
  formatBytes,
  parseRetentionPatch,
  periodLabel,
  type CandidateDataCounts,
  type DataRequestKind,
} from "@/lib/workspace/data-privacy";
import { DELETION_GRACE_DAYS, RETENTION_NOTICE_DAYS, type RetentionKind, type RetentionUnit } from "@/lib/workspace/settings";
import {
  cancelDataRequestAction,
  downloadCandidateCopyAction,
  eraseCandidateDataAction,
  findCandidateDataAction,
  logDataRequestAction,
  requestExportAction,
  saveRetentionRulesAction,
  scheduleDeletionAction,
  sendCandidateCopyAction,
} from "./actions";

export type RuleRow = {
  kind: RetentionKind;
  enabled: boolean;
  amount: number;
  unit: RetentionUnit;
  /** Items the saved rule covers today; null when it could not be counted. */
  coversNow: number | null;
  /** Announced erase date, when admins were already emailed. */
  nextEraseAt: string | null;
  lastRunAt: string | null;
  lastErasedCount: number | null;
};

export type RequestRow = {
  id: string;
  email: string;
  kind: DataRequestKind;
  status: "OPEN" | "DONE" | "CANCELLED";
  dueAt: string;
  dueLabel: string;
  createdLabel: string;
  completedLabel: string | null;
  itemCount: number | null;
  by: string | null;
};

export type ExportRow = {
  id: string;
  status: string;
  createdLabel: string;
  expiresLabel: string | null;
  sizeBytes: number | null;
  by: string | null;
  downloadUrl: string;
};

type Props = {
  slug: string;
  workspaceName: string;
  canEdit: boolean;
  owner: boolean;
  now: string;
  rules: RuleRow[];
  requests: RequestRow[];
  exports: ExportRow[];
};

export default function DataPrivacyClient(props: Props) {
  const retention = useRetentionForm({ slug: props.slug, rules: props.rules, canEdit: props.canEdit });
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-5 xl:gap-6 items-start">
      <div className="flex flex-col gap-5 min-w-0">
        <RetentionCard rules={props.rules} canEdit={props.canEdit} retention={retention} />
        <RequestsCard slug={props.slug} requests={props.requests} canEdit={props.canEdit} now={props.now} />
        <ExportCard slug={props.slug} exports={props.exports} canEdit={props.canEdit} />
        <DeleteCard slug={props.slug} workspaceName={props.workspaceName} owner={props.owner} />
      </div>
      <aside aria-label="Where data goes" className="flex flex-col gap-5 min-w-0 xl:sticky xl:top-6">
        <SubprocessorsCard />
        <CandidatesSeeCard slug={props.slug} />
      </aside>
      <SaveBar form={retention.form} />
    </div>
  );
}

/* ── Retention rules ────────────────────────────────────────────────────── */

type RuleValues = Record<RetentionKind, { enabled: boolean; amount: string }>;

const toValues = (rules: RuleRow[]): RuleValues =>
  Object.fromEntries(rules.map((r) => [r.kind, { enabled: r.enabled, amount: String(r.amount) }])) as RuleValues;

/** Edit state for the rules, shaped like a settings form so the shared SaveBar can drive it. */
function useRetentionForm({ slug, rules, canEdit }: { slug: string; rules: RuleRow[]; canEdit: boolean }) {
  const router = useRouter();
  const [saved, setSaved] = useState<RuleValues>(() => toValues(rules));
  const [values, setValues] = useState<RuleValues>(saved);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [saving, start] = useTransition();
  const [toastNode, toast] = useToasts();

  const dirty = useMemo(
    () => rules.map((r) => r.kind).filter((k) => values[k].enabled !== saved[k].enabled || values[k].amount.trim() !== saved[k].amount),
    [rules, values, saved],
  );

  const setRule = (kind: RetentionKind, patch: Partial<RuleValues[RetentionKind]>) => {
    setValues((v) => ({ ...v, [kind]: { ...v[kind], ...patch } }));
    setErrors((e) => {
      if (!(kind in e)) return e;
      const next = { ...e };
      delete next[kind];
      return next;
    });
  };

  const discard = useCallback(() => {
    setValues(saved);
    setErrors({});
  }, [saved]);

  const save = useCallback(() => {
    if (!canEdit || !dirty.length) return;
    const patch = dirty.map((kind) => {
      const unit = rules.find((r) => r.kind === kind)!.unit;
      return { kind, enabled: values[kind].enabled, amount: Number(values[kind].amount.trim()), unit };
    });
    // Check here first so mistakes show without a round trip.
    const local: Partial<Record<string, string>> = {};
    for (const p of patch) {
      const r = parseRetentionPatch(p);
      if (!r.ok) local[p.kind] = r.error;
    }
    if (Object.keys(local).length) {
      setErrors(local);
      toast("Check the highlighted rules.", "error");
      return;
    }
    start(async () => {
      const res = await saveRetentionRulesAction(slug, patch).catch(() => null);
      if (!res) {
        toast("Could not save. Try again.", "error");
        return;
      }
      if (!res.ok) {
        setErrors(res.ruleErrors);
        toast(res.error, "error");
        return;
      }
      const next = { ...values };
      for (const k of dirty) next[k] = { ...next[k], amount: next[k].amount.trim() };
      setSaved(next);
      setValues(next);
      toast("Saved");
      router.refresh();
    });
  }, [canEdit, dirty, rules, values, slug, toast, router]);

  useEffect(() => {
    if (!dirty.length) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty.length]);

  const form: SettingsForm<RuleValues> = {
    values,
    set: (field, value) => setValues((v) => ({ ...v, [field]: value })),
    dirty,
    errors: errors as SettingsForm<RuleValues>["errors"],
    saving,
    save,
    discard,
    disabled: !canEdit || saving,
    toastNode,
  };
  return { form, values, errors, setRule };
}

function RetentionCard({ rules, canEdit, retention }: { rules: RuleRow[]; canEdit: boolean; retention: ReturnType<typeof useRetentionForm> }) {
  const { values, errors, setRule } = retention;
  return (
    <SettingsCard
      id="retention"
      title="How long we keep candidate data"
      description={`Rules are off until you turn them on. Owners and admins get an email ${RETENTION_NOTICE_DAYS} days before anything is erased, and every erase is written to the audit log.`}
    >
      {rules.map((r) => {
        const v = values[r.kind];
        const copy = RETENTION_COPY[r.kind];
        const { min, max } = RETENTION_LIMITS[r.unit];
        const inputId = `retention-${r.kind}`;
        const error = errors[r.kind];
        return (
          <div key={r.kind} className="px-5 py-3.5">
            <div className="grid grid-cols-[auto_minmax(0,1fr)] md:grid-cols-[auto_minmax(0,1fr)_auto_128px] items-center gap-x-4 gap-y-2">
              <Toggle checked={v.enabled} onChange={(on) => setRule(r.kind, { enabled: on })} label={copy.title} disabled={!canEdit} />
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-sm font-medium text-fg">{copy.title}</span>
                <span className="text-[13px] text-muted">{shortHelp(copy.help)}</span>
              </div>
              <label htmlFor={inputId} className="col-start-2 md:col-start-auto flex items-center gap-2 text-[13px] text-muted">
                <span>After</span>
                <input
                  id={inputId}
                  type="number"
                  inputMode="numeric"
                  min={min}
                  max={max}
                  step={1}
                  value={v.amount}
                  disabled={!canEdit}
                  aria-invalid={!!error}
                  aria-label={`${copy.title}, after how many ${r.unit === "DAYS" ? "days" : "months"}`}
                  onChange={(e) => setRule(r.kind, { amount: e.target.value })}
                  className={`${inputCls} !w-20 tabular-nums disabled:opacity-50`}
                />
                <span>{r.unit === "DAYS" ? "days" : "months"}</span>
              </label>
              <div className="col-start-2 md:col-start-auto min-w-0 md:text-right">
                <RuleStatus rule={r} enabled={v.enabled} amountChanged={v.amount.trim() !== String(r.amount)} />
              </div>
            </div>
            {error && (
              <p role="alert" className="mt-2 pl-14 text-[13px] text-danger">
                {error}
              </p>
            )}
          </div>
        );
      })}
      <p className="px-5 py-3 rounded-b-xl bg-secondary/10 text-[13px] text-secondary-soft">
        Candidates marked passed are never erased by a rule, however long ago they were active. Interview and screening recordings are always deleted 7 days after they are made.
      </p>
    </SettingsCard>
  );
}

/** The band under the rules says passed candidates are never erased, so each rule need not repeat it. */
const shortHelp = (help: string) => help.replace(/\s*Passed candidates are never erased\.\s*/, " ").trim();

/** The short count at the right of a rule, with the last erase under it. */
function RuleStatus({ rule, enabled, amountChanged }: { rule: RuleRow; enabled: boolean; amountChanged: boolean }) {
  const noun = (n: number) => RETENTION_COPY[rule.kind].noun[n === 1 ? 0 : 1];
  let main: string;
  let title: string | undefined;
  if (!enabled) main = "Off";
  else if (rule.enabled && rule.nextEraseAt) {
    main = `Next erase ${rule.nextEraseAt}`;
    title = `Admins were emailed. Next erase on ${rule.nextEraseAt}.`;
  } else if (amountChanged) main = "Counted after saving";
  else if (rule.coversNow === null) main = "On";
  else {
    main = rule.coversNow === 0 ? "Nothing to erase today" : `${rule.coversNow} ${noun(rule.coversNow)} today`;
    title = `After ${periodLabel(rule.amount, rule.unit)}, this covers ${rule.coversNow} ${noun(rule.coversNow)} today.`;
  }
  const last = rule.lastRunAt && rule.lastErasedCount ? `Last: ${rule.lastErasedCount} on ${rule.lastRunAt}` : null;
  return (
    <span className="flex flex-col gap-0.5" title={title}>
      <span className={`text-[13px] tabular-nums ${enabled ? "text-fg" : "text-subtle"}`}>{main}</span>
      {last && <span className="text-xs text-subtle">{last}</span>}
    </span>
  );
}

/* ── Candidate data requests ────────────────────────────────────────────── */

type Found = { email: string; counts: CandidateDataCounts; total: number };

function saveFile(filename: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function RequestsCard({ slug, requests, canEdit, now }: { slug: string; requests: RequestRow[]; canEdit: boolean; now: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [found, setFound] = useState<Found | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const [confirmErase, setConfirmErase] = useState(false);
  const [toastNode, toast] = useToasts();
  const [finding, setFinding] = useState(false);

  const open = requests.filter((r) => r.status === "OPEN");
  const openFor = (kind: DataRequestKind) => (found ? open.find((r) => r.email === found.email && r.kind === kind) : undefined);

  const find = (value: string) =>
    start(async () => {
      setError(null);
      const res = await findCandidateDataAction(slug, value).catch(() => null);
      if (!res) return setError("Could not search. Try again.");
      if (!res.ok) {
        setFound(null);
        return setError(res.error);
      }
      setFound({ email: res.email, counts: res.counts, total: res.total });
    });

  const startNew = () => {
    setFinding(true);
    requestAnimationFrame(() => document.getElementById("request-email")?.focus());
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    find(email);
  };

  const run = (fn: () => Promise<{ ok: true } | { ok: false; error: string } | null>, okText: string, after?: () => void) =>
    start(async () => {
      const res = await fn().catch(() => null);
      if (!res) return toast("Something went wrong. Try again.", "error");
      if (!res.ok) return toast(res.error, "error");
      toast(okText);
      after?.();
      router.refresh();
    });

  const download = () =>
    start(async () => {
      if (!found) return;
      const res = await downloadCandidateCopyAction(slug, found.email).catch(() => null);
      if (!res || !res.ok) return toast(res && !res.ok ? res.error : "Could not build the copy. Try again.", "error");
      saveFile(res.filename, res.json, "application/json");
    });

  return (
    <>
      <PrivacyCard
        id="requests"
        title="Candidate requests"
        description="When a candidate asks for a copy of their data or for it to be erased. Requests are due within 30 days."
        aside={
          canEdit ? (
            <Btn variant="primary" onClick={startNew} disabled={busy}>
              New request
            </Btn>
          ) : undefined
        }
      >
        {(finding || found || error) && canEdit && (
          <div className="flex flex-col gap-3 px-5 py-4 bg-panel/40">
            <form onSubmit={onSubmit} className="flex flex-col gap-1.5">
              <label htmlFor="request-email" className="text-sm font-medium text-fg">
                Find a candidate&apos;s data
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <TextInput
                  id="request-email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!canEdit}
                  autoComplete="off"
                  className="flex-1 min-w-[220px]"
                />
                <button
                  type="submit"
                  disabled={!canEdit || busy || !email.trim()}
                  className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-border bg-surface text-[13px] font-medium text-fg hover:bg-panel disabled:opacity-50"
                >
                  <Search className="w-3.5 h-3.5 text-muted" aria-hidden />
                  Find
                </button>
              </div>
              <p className="text-[13px] text-muted">Searches candidates, notes, take homes, AI screenings with voice recordings, interviews, scorecards and emails.</p>
              {error && (
                <p role="alert" className="text-[13px] text-danger">
                  {error}
                </p>
              )}
            </form>
            {found && (
              <div className="w-full rounded-lg border border-border bg-surface px-4 py-3 flex flex-col gap-3" aria-live="polite">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium text-fg">{found.total ? `Found for ${found.email}` : `Nothing found for ${found.email}`}</p>
                  {found.total > 0 && (
                    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted">
                      {(Object.keys(COUNT_LABELS) as (keyof CandidateDataCounts)[])
                        .filter((k) => found.counts[k] > 0)
                        .map((k) => (
                          <li key={k}>
                            <span className="text-fg tabular-nums">{found.counts[k]}</span> {COUNT_LABELS[k][found.counts[k] === 1 ? 0 : 1]}
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
                {found.total > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Btn
                      variant="primary"
                      disabled={busy || !canEdit}
                      onClick={() => run(() => sendCandidateCopyAction(slug, found.email), `Sent a copy to ${found.email}`)}
                    >
                      Send them a copy
                    </Btn>
                    <Btn icon={Download} disabled={busy || !canEdit} onClick={download}>
                      Download copy
                    </Btn>
                    <Btn variant="danger" disabled={busy || !canEdit} onClick={() => setConfirmErase(true)}>
                      Erase everything
                    </Btn>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
                  <span>Handling it later?</span>
                  {(["COPY", "ERASE"] as const).map((kind) =>
                    openFor(kind) ? (
                      <span key={kind} className="text-subtle">
                        {kind === "COPY" ? "Copy" : "Erase"} request open, due {openFor(kind)!.dueLabel}.
                      </span>
                    ) : (
                      <Btn
                        key={kind}
                        variant="quiet"
                        disabled={busy || !canEdit}
                        onClick={() => run(() => logDataRequestAction(slug, found.email, kind), "Request logged")}
                      >
                        {kind === "COPY" ? "Log a copy request" : "Log an erase request"}
                      </Btn>
                    ),
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {requests.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[13px]">
              <thead className="bg-panel/60">
                <tr className="text-xs text-muted">
                  <th scope="col" className="font-medium px-5 py-2">
                    Candidate
                  </th>
                  <th scope="col" className="font-medium px-3 py-2 w-[110px]">
                    Asked for
                  </th>
                  <th scope="col" className="font-medium px-3 py-2 w-[150px]">
                    Due
                  </th>
                  <th scope="col" className="font-medium px-3 py-2 w-[110px]">
                    Status
                  </th>
                  <th scope="col" className="px-5 py-2 w-[150px]">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border border-t border-border">
                {requests.map((r) => (
                  <RequestTableRow
                    key={r.id}
                    r={r}
                    now={now}
                    busy={busy || !canEdit}
                    onOpen={() => {
                      setFinding(true);
                      setEmail(r.email);
                      find(r.email);
                    }}
                    onCancel={() => run(() => cancelDataRequestAction(slug, r.id), "Request cancelled")}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-5 py-4 text-[13px] text-muted">
            {canEdit
              ? "No requests in the last 90 days. Use New request when a candidate asks for a copy of their data or to be erased."
              : "Only owners and admins can see requests."}
          </p>
        )}

        {confirmErase && found && (
          <ConfirmDialog
            title="Erase everything for this email?"
            danger
            busy={busy}
            requireText={found.email}
            confirmLabel="Erase for good"
            onCancel={() => setConfirmErase(false)}
            onConfirm={() =>
              run(
                () => eraseCandidateDataAction(slug, found.email, found.email),
                `Erased the data of ${found.email}`,
                () => {
                  setConfirmErase(false);
                  setFound(null);
                  setEmail("");
                },
              )
            }
            body={
              <>
                This erases {describeCounts(found.counts)} for {found.email}. Scores stay in reports without their name or email. They get an email to confirm
                it is done. This cannot be undone.
              </>
            }
          />
        )}
      </PrivacyCard>
      {toastNode}
    </>
  );
}

const chip = "inline-flex items-center rounded-full px-2 leading-5 text-xs font-medium whitespace-nowrap";

/** One logged request: open ones show when they are due, handled ones when they were done. */
function RequestTableRow({ r, now, busy, onOpen, onCancel }: { r: RequestRow; now: string; busy: boolean; onOpen: () => void; onCancel: () => void }) {
  const isOpen = r.status === "OPEN";
  const days = daysUntil(new Date(r.dueAt), new Date(now));
  const records = r.itemCount !== null ? `${r.itemCount} ${r.itemCount === 1 ? "record" : "records"}` : null;
  const sub = isOpen
    ? `Logged ${r.createdLabel}${r.by ? ` by ${r.by}` : ""}`
    : [r.status === "CANCELLED" ? "Request cancelled" : records, r.by ? `by ${r.by}` : null].filter(Boolean).join(" ");

  let due: { text: string; tone: string };
  let status: { text: string; cls: string };
  if (isOpen) {
    due =
      days < 0
        ? { text: `Overdue since ${r.dueLabel}`, tone: "text-danger" }
        : days === 0
          ? { text: "Due today", tone: "text-warning" }
          : { text: `In ${days} ${days === 1 ? "day" : "days"}`, tone: days <= 7 ? "text-warning" : "text-fg" };
    status = days < 0 ? { text: "Overdue", cls: "bg-danger/15 text-danger" } : { text: "Waiting", cls: "bg-warning/15 text-warning" };
  } else {
    due = { text: r.completedLabel ? `${r.status === "CANCELLED" ? "Cancelled" : "Done"} ${r.completedLabel}` : "Handled", tone: "text-muted" };
    status =
      r.status === "CANCELLED"
        ? { text: "Cancelled", cls: "bg-panel border border-border text-muted" }
        : { text: r.kind === "ERASE" ? "Erased" : "Sent", cls: "bg-success/15 text-success" };
  }

  return (
    <tr>
      <td className="px-5 py-2.5">
        <span className="block text-fg truncate max-w-[320px]">{r.email}</span>
        {sub && <span className="block text-xs text-subtle">{sub}</span>}
      </td>
      <td className="px-3 py-2.5 text-fg">{r.kind === "COPY" ? "Copy" : "Erase"}</td>
      <td className="px-3 py-2.5">
        <span className={`block ${due.tone}`}>{due.text}</span>
        {isOpen && days > 0 && <span className="block text-xs text-subtle">{r.dueLabel}</span>}
      </td>
      <td className="px-3 py-2.5">
        <span className={`${chip} ${status.cls}`}>{status.text}</span>
      </td>
      <td className="px-5 py-2.5">
        {isOpen && (
          <div className="flex items-center justify-end gap-1">
            <Btn disabled={busy} onClick={onOpen}>
              Open
            </Btn>
            <Btn variant="quiet" disabled={busy} onClick={onCancel}>
              Cancel
            </Btn>
          </div>
        )}
      </td>
    </tr>
  );
}

/* ── Export everything ──────────────────────────────────────────────────── */

const EXPORT_STATUS: Record<string, { label: string; tone: string }> = {
  PENDING: { label: "Preparing", tone: "text-muted" },
  RUNNING: { label: "Preparing", tone: "text-muted" },
  READY: { label: "Ready", tone: "text-success" },
  FAILED: { label: "Failed", tone: "text-danger" },
  EXPIRED: { label: "Link expired", tone: "text-subtle" },
};

function ExportCard({ slug, exports, canEdit }: { slug: string; exports: ExportRow[]; canEdit: boolean }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [toastNode, toast] = useToasts();
  const preparing = exports.some((e) => e.status === "PENDING" || e.status === "RUNNING");

  // Check back while an export is being prepared.
  useEffect(() => {
    if (!preparing) return;
    const t = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(t);
  }, [preparing, router]);

  const request = () =>
    start(async () => {
      const res = await requestExportAction(slug).catch(() => null);
      if (!res || !res.ok) return toast(res && !res.ok ? res.error : "Could not start the export. Try again.", "error");
      toast("Export started. We will email you a link.");
      router.refresh();
    });

  return (
    <>
      <PrivacyCard
        id="export"
        title="Export everything"
        description="A zip of CSV and JSON files with every candidate, note, take home, AI screening, interview, scorecard, member, audit entry and email. Voice recordings are not included."
        aside={
          <Btn variant="primary" icon={Download} disabled={!canEdit || busy || preparing} onClick={request}>
            {preparing ? "Preparing" : "Export everything"}
          </Btn>
        }
      >
        {exports.length ? (
          <ul className="flex flex-col divide-y divide-border">
            {exports.map((e) => {
              const st = EXPORT_STATUS[e.status] ?? { label: e.status, tone: "text-muted" };
              return (
                <li key={e.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3">
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-[13px] text-fg">Started {e.createdLabel}</span>
                    <span className="text-xs text-subtle">
                      {[
                        e.by ? `By ${e.by}` : null,
                        formatBytes(e.sizeBytes) || null,
                        e.status === "READY" && e.expiresLabel ? `Link works until ${e.expiresLabel}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </div>
                  <span className={`text-xs font-medium ${st.tone}`}>{st.label}</span>
                  {e.status === "READY" && (
                    <a
                      href={e.downloadUrl}
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border bg-surface text-[13px] font-medium text-fg hover:bg-panel"
                    >
                      <Download className="w-3.5 h-3.5 text-muted" aria-hidden />
                      Download
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-5 py-4 text-[13px] text-muted">
            {canEdit
              ? `No exports yet. The download link is emailed to you and works for ${EXPORT_LINK_DAYS} days.`
              : "Only owners and admins can export the workspace."}
          </p>
        )}
      </PrivacyCard>
      {toastNode}
    </>
  );
}

/* ── Subprocessors ──────────────────────────────────────────────────────── */

/** A compact card for the side column. */
function AsideCard({ id, title, description, children }: { id?: string; title: string; description: string; children: ReactNode }) {
  return (
    <section id={id} className="rounded-xl border border-border bg-surface shadow-sm shadow-black/5 px-[18px] py-4 flex flex-col gap-2.5">
      <div className="flex flex-col gap-1">
        <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-fg">{title}</h2>
        <p className="text-[13px] text-muted">{description}</p>
      </div>
      {children}
    </section>
  );
}

function SubprocessorsCard() {
  return (
    <AsideCard
      id="subprocessors"
      title="Services that process candidate data"
      description="Services Interviewpad uses to run this workspace. Each one only gets what it needs for its job."
    >
      <ul className="flex flex-col divide-y divide-border">
        {SUBPROCESSORS.map((s) => (
          <li key={s.name} className="flex flex-col gap-0.5 py-2.5 first:pt-1">
            <div className="flex items-baseline justify-between gap-3">
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[13px] font-medium text-fg hover:underline">
                {s.name}
                <ExternalLink className="w-3 h-3 text-subtle" aria-hidden />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
              <span className="text-xs text-subtle text-right">{s.location}</span>
            </div>
            <span className="text-[13px] text-muted">{s.purpose}</span>
          </li>
        ))}
      </ul>
      <a href={DPA_REQUEST_URL} className="self-start text-[13px] font-medium text-secondary-soft hover:underline">
        Ask for our data processing agreement
      </a>
    </AsideCard>
  );
}

function CandidatesSeeCard({ slug }: { slug: string }) {
  return (
    <AsideCard title="Where candidates see this" description="Your privacy notice, consent box and help contact are set in Candidate experience.">
      <Link href={`/w/${slug}/settings/candidate-experience`} className="self-start text-[13px] font-medium text-secondary-soft hover:underline">
        Open Candidate experience
      </Link>
    </AsideCard>
  );
}

/* ── Delete the workspace ───────────────────────────────────────────────── */

function DeleteCard({ slug, workspaceName, owner }: { slug: string; workspaceName: string; owner: boolean }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [busy, start] = useTransition();
  const [toastNode, toast] = useToasts();

  const schedule = (typed: string) =>
    start(async () => {
      const res = await scheduleDeletionAction(slug, typed).catch(() => null);
      if (!res || !res.ok) return toast(res && !res.ok ? res.error : "Could not schedule the deletion. Try again.", "error");
      setConfirm(false);
      router.refresh();
    });

  return (
    <>
      <PrivacyCard
        id="delete"
        title="Delete workspace"
        description={`Everyone loses access straight away. For ${DELETION_GRACE_DAYS} days an owner can undo it; after that, candidates, screenings, interviews and settings are erased for good and the subscription is cancelled. Export everything first if you want to keep a copy.`}
        aside={
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-panel border border-border text-xs font-medium text-muted px-2 leading-5">Owners only</span>
            <Btn variant="danger" disabled={!owner || busy} onClick={() => setConfirm(true)}>
              Delete workspace
            </Btn>
          </div>
        }
      >
        {!owner && <p className="px-5 py-3 text-[13px] text-muted">Only owners can delete the workspace.</p>}
        {confirm && (
          <ConfirmDialog
            title={`Delete ${workspaceName}?`}
            danger
            busy={busy}
            requireText={workspaceName}
            confirmLabel="Delete workspace"
            onCancel={() => setConfirm(false)}
            onConfirm={() => schedule(workspaceName)}
            body={
              <>
                Nobody on your team can use the workspace from now on, and its API keys stop working. Owners can undo this for {DELETION_GRACE_DAYS} days. After
                that it is erased for good. Owners and admins get an email about it.
              </>
            }
          />
        )}
      </PrivacyCard>
      {toastNode}
    </>
  );
}
