"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Layers, Plus, Upload } from "lucide-react";
import { deadlineText, type BatchSummary } from "@/lib/crm/batches";
import type { RosterBatch, RosterMember } from "@/lib/crm/roster";
import { STAGE_SWATCH } from "@/lib/workspace/display";
import { isPipelineStage, STAGE_LABELS } from "@/lib/crm/stages";
import { plural } from "@/lib/workspace/display";
import { AddCandidatesDialog } from "../candidates/_components/AddCandidatesDialog";
import { BatchDialog } from "../candidates/_components/BatchDialog";
import { CandidatesHeader } from "../candidates/_components/CandidatesHeader";
import type { Perms } from "../candidates/_components/CandidatesView";
import { Avatar, Btn, useToasts } from "../candidates/_components/ui";

export default function BatchesClient({
  slug,
  meId,
  batches,
  totalCandidates,
  unbatched,
  members,
  allBatches,
  perms,
}: {
  slug: string;
  meId: string;
  batches: BatchSummary[];
  totalCandidates: number;
  unbatched: number;
  members: RosterMember[];
  allBatches: RosterBatch[];
  perms: Perms;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [filter, setFilter] = useState<"OPEN" | "CLOSED" | "ALL">("OPEN");
  const [creating, setCreating] = useState(sp.get("new") === "1");
  const [importing, setImporting] = useState(false);
  const [toasts, toast] = useToasts();
  const open = batches.filter((b) => b.status === "OPEN").length;
  const shown = batches.filter((b) => filter === "ALL" || b.status === filter);

  return (
    <div className="flex flex-col gap-5">
      <CandidatesHeader
        slug={slug}
        active="batches"
        counts={{ all: totalCandidates, batches: batches.length }}
        summary={
          batches.length
            ? `Batches group candidates for one role or hiring drive. ${unbatched ? `${plural(unbatched, "candidate")} ${unbatched === 1 ? "is" : "are"} not in a batch yet.` : ""}`
            : "Batches group candidates for one role or hiring drive."
        }
        actions={
          perms.canWrite && (
            <>
              <Btn size="md" icon={Upload} onClick={() => setImporting(true)}>
                Import
              </Btn>
              <Btn size="md" variant="primary" icon={Plus} onClick={() => setCreating(true)}>
                New batch
              </Btn>
            </>
          )
        }
      />

      {batches.length > 0 && (
        <div role="group" aria-label="Filter batches" className="flex gap-2">
          {(
            [
              ["OPEN", "Open", open],
              ["CLOSED", "Closed", batches.length - open],
              ["ALL", "All", batches.length],
            ] as const
          ).map(([id, text, n]) => (
            <button
              key={id}
              type="button"
              aria-pressed={filter === id}
              onClick={() => setFilter(id)}
              className={`h-8 px-3 rounded-full border text-[13px] font-medium transition ${
                filter === id ? "border-secondary/60 bg-secondary/15 text-secondary-soft" : "border-border text-muted hover:text-fg"
              }`}
            >
              {text} <span className="tabular-nums">{n}</span>
            </button>
          ))}
        </div>
      )}

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {shown.map((b) => {
          const target = b.targetHires ?? 0;
          return (
            <Link
              key={b.id}
              href={`/w/${slug}/batches/${b.id}`}
              className="group rounded-xl border border-border bg-surface p-5 flex flex-col gap-4 hover:border-border-strong hover:-translate-y-0.5 transition motion-reduce:hover:translate-y-0"
            >
              <div className="flex justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-base font-semibold text-fg truncate">{b.name}</div>
                  <div className="text-[13px] text-muted mt-0.5 truncate">{b.roleTitle || "No role set"}</div>
                </div>
                <span
                  className={`shrink-0 inline-flex items-center h-6 px-2 rounded-md text-xs font-medium ${
                    b.status === "OPEN" ? "bg-success/15 text-success" : "bg-panel text-muted"
                  }`}
                >
                  {b.status === "OPEN" ? "Open" : "Closed"}
                </span>
              </div>
              <div className="flex h-2 rounded-full overflow-hidden gap-0.5 bg-panel" aria-label={b.stages.map((s) => `${s.count} ${isPipelineStage(s.stage) ? STAGE_LABELS[s.stage] : s.stage}`).join(", ") || "No candidates"} role="img">
                {b.stages.map((s) => (
                  <div key={s.stage} className={isPipelineStage(s.stage) ? STAGE_SWATCH[s.stage] : "bg-subtle"} style={{ flex: `${s.count} 1 0` }} />
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div className="text-xs text-subtle">Candidates</div>
                  <div className="text-xl font-semibold text-fg mt-0.5 tabular-nums">{b.total}</div>
                </div>
                <div>
                  <div className="text-xs text-subtle">Hired</div>
                  <div className="text-xl font-semibold text-fg mt-0.5 tabular-nums">
                    {b.hired}
                    {target > 0 && <span className="text-[13px] font-normal text-subtle"> of {target}</span>}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-subtle">Deadline</div>
                  <div className="text-[13px] font-medium text-fg mt-1.5">{deadlineText(b.deadline, b.status).split(",")[0]}</div>
                </div>
              </div>
              <div className="flex items-center justify-between pt-3.5 border-t border-border">
                <div className="flex items-center gap-2 min-w-0">
                  {b.ownerName ? (
                    <>
                      <Avatar name={b.ownerName} size={24} />
                      <span className="text-[13px] text-muted truncate">{b.ownerName}</span>
                    </>
                  ) : (
                    <span className="text-[13px] text-subtle">No owner</span>
                  )}
                </div>
                {b.attention > 0 && <span className="text-[13px] text-warning shrink-0">{b.attention} to act on</span>}
              </div>
            </Link>
          );
        })}
      </div>

      {shown.length === 0 && batches.length > 0 && <p className="text-[13px] text-subtle">No {filter === "OPEN" ? "open" : "closed"} batches.</p>}

      {perms.canWrite && (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex items-center justify-center gap-2.5 h-16 rounded-xl border border-dashed border-border-strong text-sm text-muted hover:text-fg hover:bg-panel/40 transition"
        >
          <Layers className="w-4 h-4 text-subtle" aria-hidden />
          New batch: name it, pick a role and owner, then add candidates or import a CSV
        </button>
      )}

      {creating && (
        <BatchDialog
          slug={slug}
          members={members}
          meId={meId}
          onClose={() => setCreating(false)}
          onDone={(msg, id) => {
            setCreating(false);
            toast(msg);
            if (id) router.push(`/w/${slug}/batches/${id}`);
          }}
        />
      )}
      {importing && (
        <AddCandidatesDialog
          slug={slug}
          batches={allBatches}
          members={members}
          initialMode="csv"
          onClose={() => setImporting(false)}
          onDone={(msg) => {
            setImporting(false);
            toast(msg);
          }}
        />
      )}
      {toasts}
    </div>
  );
}
