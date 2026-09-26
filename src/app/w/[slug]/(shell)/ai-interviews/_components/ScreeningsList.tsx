"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, Copy, Layers, Search } from "lucide-react";
import type { ScreeningRow } from "@/lib/ai-interview/console-server";
import { ENGAGEMENT_LABELS, normalizeEngagementLevel } from "@/lib/ai-interview/engagement";
import { plural } from "@/lib/workspace/display";
import { Btn, fmtDate, inputCls } from "../../candidates/_components/ui";

export default function ScreeningsList({ slug, rows, canCreate }: { slug: string; rows: ScreeningRow[]; canCreate: boolean }) {
  const base = `/w/${slug}/ai-interviews`;
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? rows.filter((r) => r.title.toLowerCase().includes(t) || r.rounds.some((x) => x.toLowerCase().includes(t))) : rows;
  }, [rows, q]);

  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border-strong bg-surface/50 px-6 py-14 text-center flex flex-col items-center gap-2">
        <Layers className="w-6 h-6 text-subtle" aria-hidden />
        <p className="text-[15px] font-medium text-fg">No screenings yet</p>
        <p className="text-[13px] text-muted max-w-sm">A screening sends the same rounds to a group of candidates so you can compare them side by side.</p>
        {canCreate && (
          <Btn variant="primary" href={`${base}/new`} className="mt-3">
            New screening
          </Btn>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="relative w-full sm:w-72">
        <span className="sr-only">Search screenings</span>
        <Search aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-subtle" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by role or stack" className={`${inputCls} pl-8`} />
      </label>
      <ul className="flex flex-col gap-3">
        {shown.map((r) => {
          const pct = r.invited ? Math.round((r.finished / r.invited) * 100) : 0;
          const startedPct = r.invited ? Math.round((r.started / r.invited) * 100) : 0;
          return (
            <li key={r.id} className="group relative rounded-xl border border-border bg-surface hover:border-border-strong transition-colors">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4">
                <Link href={`${base}/screenings/${r.id}`} className="flex-1 min-w-[220px] flex flex-col gap-1 after:absolute after:inset-0 after:rounded-xl">
                  <span className="text-[15px] font-semibold text-fg">{r.title}</span>
                  <span className="text-xs text-subtle">
                    Sent {fmtDate(r.createdAt, true)}
                    {r.createdBy ? ` by ${r.createdBy}` : ""}, interviewer {ENGAGEMENT_LABELS[normalizeEngagementLevel(r.engagementLevel)].label.toLowerCase()}
                  </span>
                  <span className="flex flex-wrap gap-1.5 mt-1">
                    {r.rounds.map((x, i) => (
                      <span key={i} className="h-6 px-2 rounded-md bg-panel text-xs text-muted inline-flex items-center">
                        {x}
                      </span>
                    ))}
                  </span>
                </Link>
                <div className="w-full sm:w-56 flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted">
                      {r.finished} of {plural(r.invited, "person", "people")} finished
                    </span>
                    <span className="text-subtle tabular-nums">{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-panel relative overflow-hidden" aria-hidden>
                    <span className="absolute inset-y-0 left-0 bg-warning/50 rounded-full" style={{ width: `${startedPct}%` }} />
                    <span className="absolute inset-y-0 left-0 bg-success rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-subtle">
                    {r.started - r.finished > 0 ? `${r.started - r.finished} in progress` : ""}
                    {r.started - r.finished > 0 && r.expired ? ", " : ""}
                    {r.expired ? `${r.expired} expired` : ""}
                  </span>
                </div>
                <div className="flex items-center gap-6">
                  <Stat label="To review" value={r.toReview} accent={r.toReview > 0} />
                  <Stat label="Avg score" value={r.avgScore ?? "–"} />
                </div>
                <div className="flex items-center gap-2 relative z-10">
                  {canCreate && (
                    <Btn variant="quiet" icon={Copy} href={`${base}/new?from=${r.id}`}>
                      Duplicate
                    </Btn>
                  )}
                  <ChevronRight className="w-4 h-4 text-subtle group-hover:text-fg transition-colors" aria-hidden />
                </div>
              </div>
            </li>
          );
        })}
        {!shown.length && <li className="text-[13px] text-muted px-1">No screenings match.</li>}
      </ul>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className="flex flex-col items-end">
      <span className={`text-lg font-semibold tabular-nums ${accent ? "text-secondary-soft" : "text-fg"}`}>{value}</span>
      <span className="text-xs text-subtle">{label}</span>
    </div>
  );
}
