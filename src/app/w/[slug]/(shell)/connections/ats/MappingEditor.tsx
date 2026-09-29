"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { saveJobMappingsAction, type MappingInput } from "../actions";
import { btn, btnPrimary, input } from "../ui";

export type MappingRow = {
  id?: string;
  jobName: string;
  jobDetail: string;
  screeningKind: "ai" | "takehome" | "none";
  screeningId: string | null;
  sendMode: "auto" | "review";
  openCandidates: number;
};

export type ScreeningChoice = { kind: "ai" | "takehome"; id: string; label: string };

type Props = {
  slug: string;
  providerName: string;
  triggerStage: string;
  rows: MappingRow[];
  screenings: ScreeningChoice[];
  canManage: boolean;
  /** Called after a successful save (the wizard moves on). */
  onSaved?: () => void;
  saveLabel?: string;
  /** Extra buttons on the left of the footer (the wizard's Back). */
  footerStart?: React.ReactNode;
};

const valueOf = (r: Pick<MappingRow, "screeningKind" | "screeningId">) => (r.screeningKind === "none" || !r.screeningId ? "none" : `${r.screeningKind}:${r.screeningId}`);

export default function MappingEditor({ slug, providerName, triggerStage, rows: initial, screenings, canManage, onSaved, saveLabel = "Save mapping", footerStart }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState<MappingRow[]>(initial.length ? initial : []);
  const [busy, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const stage = triggerStage || "the stage you picked";

  const update = (i: number, patch: Partial<MappingRow>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const add = () =>
    setRows((rs) => [...rs, { jobName: "", jobDetail: "", screeningKind: "none", screeningId: null, sendMode: "auto", openCandidates: 0 }]);
  const remove = (i: number) => setRows((rs) => rs.filter((_, j) => j !== i));

  function save() {
    setError(null);
    start(async () => {
      const payload: MappingInput[] = rows.map((r) => ({
        id: r.id,
        jobName: r.jobName,
        jobDetail: r.jobDetail,
        screeningKind: r.screeningKind,
        screeningId: r.screeningId,
        sendMode: r.sendMode,
      }));
      const res = await saveJobMappingsAction(slug, payload);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setRows((rs) => rs.map((r) => ({ ...r, jobName: r.jobName.trim(), id: res.ids[r.jobName.trim().toLowerCase()] ?? r.id })));
      toast.success("Job mapping saved");
      router.refresh();
      onSaved?.();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-border bg-surface overflow-x-auto">
        <table className="w-full border-collapse min-w-[720px]">
          <thead>
            <tr className="bg-panel text-left text-[13px] font-semibold text-muted">
              <th className="px-3.5 py-2.5">{providerName} job</th>
              <th className="px-3.5 py-2.5 w-[120px]">Open candidates</th>
              <th className="px-3.5 py-2.5 w-[300px]">Screening to send</th>
              <th className="px-3.5 py-2.5 w-[170px]">Send</th>
              {canManage && <th className="px-2 py-2.5 w-[44px]"><span className="sr-only">Remove</span></th>}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={canManage ? 5 : 4} className="px-3.5 py-6 text-sm text-muted text-center border-t border-border">
                  No jobs yet. Add each {providerName} job you want to screen, with its name exactly as it reads there.
                </td>
              </tr>
            )}
            {rows.map((r, i) => {
              const none = r.screeningKind === "none";
              return (
                <tr key={r.id ?? `new-${i}`} className="border-t border-border align-middle">
                  <td className="px-3.5 py-3">
                    {canManage ? (
                      <div className="flex flex-col gap-1.5">
                        <label className="sr-only" htmlFor={`job-${i}`}>Job name</label>
                        <input id={`job-${i}`} className={input} value={r.jobName} placeholder="Senior Frontend Engineer" onChange={(e) => update(i, { jobName: e.target.value })} />
                        <label className="sr-only" htmlFor={`detail-${i}`}>Location or requisition</label>
                        <input id={`detail-${i}`} className={`${input} h-8 text-[13px]`} value={r.jobDetail} placeholder="Location or req number (optional)" onChange={(e) => update(i, { jobDetail: e.target.value })} />
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        <span className="font-medium text-fg text-sm">{r.jobName}</span>
                        {r.jobDetail && <span className="text-[13px] text-muted">{r.jobDetail}</span>}
                      </div>
                    )}
                  </td>
                  <td className="px-3.5 py-3 text-sm tabular-nums text-fg">{r.openCandidates}</td>
                  <td className="px-3.5 py-3">
                    <label className="sr-only" htmlFor={`scr-${i}`}>Screening for {r.jobName || "this job"}</label>
                    <select
                      id={`scr-${i}`}
                      className={input}
                      disabled={!canManage}
                      value={valueOf(r)}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "none") update(i, { screeningKind: "none", screeningId: null });
                        else {
                          const [kind, id] = v.split(":");
                          update(i, { screeningKind: kind as "ai" | "takehome", screeningId: id });
                        }
                      }}
                    >
                      <option value="none">Do nothing</option>
                      {screenings.map((s) => (
                        <option key={`${s.kind}:${s.id}`} value={`${s.kind}:${s.id}`}>
                          {s.label}
                        </option>
                      ))}
                      {!none && !screenings.some((s) => valueOf({ screeningKind: s.kind, screeningId: s.id }) === valueOf(r)) && (
                        <option value={valueOf(r)}>A screening that no longer exists</option>
                      )}
                    </select>
                  </td>
                  <td className="px-3.5 py-3">
                    {none ? (
                      <span className="text-[13px] text-muted">Not imported</span>
                    ) : canManage ? (
                      <>
                        <label className="sr-only" htmlFor={`mode-${i}`}>When to send for {r.jobName || "this job"}</label>
                        <select id={`mode-${i}`} className={input} value={r.sendMode} onChange={(e) => update(i, { sendMode: e.target.value === "review" ? "review" : "auto" })}>
                          <option value="auto">Automatically</option>
                          <option value="review">After I review</option>
                        </select>
                      </>
                    ) : (
                      <span className={`text-[13px] font-medium ${r.sendMode === "auto" ? "text-success" : "text-warning"}`}>
                        {r.sendMode === "auto" ? "Automatically" : "After I review"}
                      </span>
                    )}
                  </td>
                  {canManage && (
                    <td className="px-2 py-3">
                      <button type="button" onClick={() => remove(i)} className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-subtle hover:text-danger hover:bg-panel" aria-label={`Remove ${r.jobName || "this row"}`}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {canManage && (
        <div>
          <button type="button" className={btn} onClick={add}>
            <Plus className="w-4 h-4" aria-hidden /> Add a job
          </button>
        </div>
      )}

      <div className="rounded-xl border border-border bg-surface px-4 py-3.5 text-sm text-fg">
        If a candidate with the same email already exists, we link them instead of creating a duplicate.
      </div>

      {!screenings.length && (
        <p className="text-[13px] text-muted">
          You have no AI screenings or saved take home templates yet. Create one first, then come back to map it. Jobs sent from {providerName} at {stage} are
          ignored until they are mapped.
        </p>
      )}

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      {canManage && (
        <div className="flex flex-wrap justify-between items-center gap-2 border-t border-border pt-4">
          <div>{footerStart}</div>
          <button type="button" className={btnPrimary} onClick={save} disabled={busy}>
            {busy ? "Saving" : saveLabel}
          </button>
        </div>
      )}
    </div>
  );
}
