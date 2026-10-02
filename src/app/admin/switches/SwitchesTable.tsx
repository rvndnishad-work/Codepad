"use client";

import { Fragment, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setFeatureSwitchAction } from "./actions";

type State = "on" | "read_only" | "off";

export type SwitchRow = {
  key: string;
  label: string;
  side: "hiring" | "developer" | "shared";
  appliesTo: string;
  description: string;
  alsoAffects: string[];
  defaultMessage: string;
  state: State;
  message: string | null;
  resumeAt: string | null;
  changedBy: string | null;
  changedAt: string | null;
  note: string | null;
  /** Current load, shown in the confirm panel. */
  load: string | null;
};

const SIDES: { key: SwitchRow["side"]; label: string }[] = [
  { key: "hiring", label: "Hiring side" },
  { key: "developer", label: "Developer side" },
  { key: "shared", label: "Shared" },
];

const STATE_LABEL: Record<State, string> = { on: "On", read_only: "Read only", off: "Off" };
const SELECTED: Record<State, string> = {
  on: "bg-success/15 text-success",
  read_only: "bg-warning/15 text-warning",
  off: "bg-panel text-fg font-semibold",
};

function ago(iso: string): string {
  const d = new Date(iso);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function utc(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}, ${d.toISOString().slice(11, 16)} UTC`;
}

/** Three-state segmented control. */
function Segment({ value, onPick, label }: { value: State; onPick: (s: State) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={`${label} state`} className="inline-flex h-8 rounded-lg border border-border overflow-hidden">
      {(["on", "read_only", "off"] as State[]).map((s, i) => {
        const on = s === value;
        return (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => !on && onPick(s)}
            className={`min-w-[56px] px-2.5 text-xs font-medium ${i ? "border-l border-border" : ""} ${
              on ? SELECTED[s] : "bg-surface text-muted hover:text-fg hover:bg-panel"
            }`}
          >
            {STATE_LABEL[s]}
          </button>
        );
      })}
    </div>
  );
}

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const field = "w-full rounded-lg border border-border bg-bg px-3 text-sm text-fg placeholder:text-subtle focus:outline-none focus:border-secondary";

function ConfirmPanel({ row, to, onClose }: { row: SwitchRow; to: State; onClose: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState(row.message || row.defaultMessage);
  const [resume, setResume] = useState<"hand" | "at">(row.resumeAt ? "at" : "hand");
  const [resumeLocal, setResumeLocal] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setResumeLocal(toLocalInput(row.resumeAt ? new Date(row.resumeAt) : new Date(Date.now() + 3_600_000)));
  }, [row.resumeAt]);

  const verb = to === "on" ? "Turn on" : to === "off" ? "Turn off" : "Make read only";
  const title = to === "read_only" ? `Make ${row.label} read only` : `Turn ${row.label} ${to}`;
  const resumeIso = to !== "on" && resume === "at" && resumeLocal ? new Date(resumeLocal).toISOString() : null;

  function confirm() {
    setError(null);
    start(async () => {
      const res = await setFeatureSwitchAction({ key: row.key, state: to, message, resumeAt: resumeIso, note });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      toast.success(`${row.label} is ${STATE_LABEL[to].toLowerCase()}. Every server picks it up within 10 seconds.`);
      onClose();
      router.refresh();
    });
  }

  return (
    <aside aria-label="Confirm change" className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-4">
      <div>
        <h2 className="text-[15px] font-semibold">{title}</h2>
        <div className="text-sm text-muted">Takes effect within 10 seconds on every server.</div>
      </div>

      <dl className="rounded-lg border border-border bg-panel p-3 text-sm space-y-1.5">
        <div className="flex justify-between gap-3">
          <dt className="text-muted">What it stops</dt>
          <dd className="text-right">{row.description}</dd>
        </div>
        {row.load && (
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Right now</dt>
            <dd className="text-right">{row.load}</dd>
          </div>
        )}
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Also affected</dt>
          <dd className="text-right">{row.alsoAffects.length ? row.alsoAffects.join(", ") : "Nothing else"}</dd>
        </div>
        {to === "read_only" && (
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Read only</dt>
            <dd className="text-right">Pages open and running work finishes; nothing new starts.</dd>
          </div>
        )}
      </dl>

      {to !== "on" && (
        <>
          <div>
            <label htmlFor="f-msg" className="block text-sm font-medium mb-1.5">Message shown in its place</label>
            <textarea id="f-msg" rows={3} maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)} className={`${field} py-2`} />
          </div>
          <div>
            <label htmlFor="f-until" className="block text-sm font-medium mb-1.5">Turn back on</label>
            <select id="f-until" value={resume} onChange={(e) => setResume(e.target.value as "hand" | "at")} className={`${field} h-10`}>
              <option value="hand">When I do it by hand</option>
              <option value="at">Automatically at a time</option>
            </select>
            {resume === "at" && (
              <>
                <input
                  type="datetime-local"
                  aria-label="Turn back on at"
                  value={resumeLocal}
                  onChange={(e) => setResumeLocal(e.target.value)}
                  className={`${field} h-10 mt-2`}
                />
                {resumeIso && <div className="text-xs text-muted mt-1">That is {utc(resumeIso)}.</div>}
              </>
            )}
          </div>
        </>
      )}

      <div>
        <label htmlFor="f-note" className="block text-sm font-medium mb-1.5">Note for the audit log</label>
        <textarea
          id="f-note"
          rows={2}
          maxLength={500}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Why, in a few words"
          className={`${field} py-2`}
        />
      </div>

      {error && <div className="text-sm text-danger" role="alert">{error}</div>}

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onClose} className="h-9 px-3.5 rounded-lg border border-border text-sm text-fg hover:bg-panel">
          Cancel
        </button>
        <button
          type="button"
          onClick={confirm}
          disabled={pending || !note.trim()}
          className="h-9 px-3.5 rounded-lg bg-secondary text-bg text-sm font-medium hover:brightness-110 disabled:opacity-60"
        >
          {pending ? "Saving" : verb}
        </button>
      </div>
    </aside>
  );
}

export default function SwitchesTable({ rows, initialKey }: { rows: SwitchRow[]; initialKey: string | null }) {
  const [pick, setPick] = useState<{ key: string; to: State } | null>(() => {
    const r = initialKey ? rows.find((x) => x.key === initialKey) : null;
    return r ? { key: r.key, to: r.state === "on" ? "off" : "on" } : null;
  });
  const picked = pick ? rows.find((r) => r.key === pick.key) : null;

  return (
    <div className="grid gap-4 items-start lg:grid-cols-[minmax(0,1fr)_380px]">
      <section className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold text-muted border-b border-border">
                <th className="px-4 py-2.5">Function</th>
                <th className="px-4 py-2.5">Key</th>
                <th className="px-4 py-2.5">Applies to</th>
                <th className="px-4 py-2.5">State</th>
                <th className="px-4 py-2.5">Last change</th>
              </tr>
            </thead>
            <tbody>
              {SIDES.map((side) => (
                <Fragment key={side.key}>
                  <tr>
                    <td colSpan={5} className="bg-panel px-4 py-2 text-xs font-semibold text-muted">{side.label}</td>
                  </tr>
                  {rows
                    .filter((r) => r.side === side.key)
                    .map((r) => (
                      <tr key={r.key} className={`border-t border-border align-middle ${pick?.key === r.key ? "bg-panel/60" : ""}`}>
                        <td className="px-4 py-2.5">
                          <div>{r.label}</div>
                          {r.state !== "on" && r.resumeAt && <div className="text-xs text-muted">Back on {utc(r.resumeAt)}</div>}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-muted">{r.key}</td>
                        <td className="px-4 py-2.5 text-muted">{r.appliesTo}</td>
                        <td className="px-4 py-2.5">
                          <Segment value={r.state} label={r.label} onPick={(to) => setPick({ key: r.key, to })} />
                        </td>
                        <td className="px-4 py-2.5 text-muted">
                          {r.changedAt ? (
                            <>
                              {r.changedBy ?? "Someone"}, {ago(r.changedAt)}
                              {r.note ? <>: &ldquo;{r.note}&rdquo;</> : null}
                            </>
                          ) : (
                            "Never"
                          )}
                        </td>
                      </tr>
                    ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {picked && pick ? (
        <ConfirmPanel key={`${pick.key}-${pick.to}`} row={picked} to={pick.to} onClose={() => setPick(null)} />
      ) : (
        <aside className="rounded-xl border border-border bg-surface p-5 text-sm text-muted space-y-2">
          <h2 className="text-[15px] font-semibold text-fg">Three states</h2>
          <p><span className="text-fg font-medium">On</span> is normal.</p>
          <p><span className="text-fg font-medium">Read only</span> keeps pages open and lets running work finish, but nothing new starts or saves.</p>
          <p><span className="text-fg font-medium">Off</span> shows your message where the function would be.</p>
          <p>Every change asks for a note and lands in the history.</p>
        </aside>
      )}
    </div>
  );
}
