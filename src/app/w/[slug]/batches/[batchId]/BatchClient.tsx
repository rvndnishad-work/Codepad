"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CircleArrowRight, Download, Pencil, Plus, Send, Star, X } from "lucide-react";
import { deadlineText, type BatchSummary } from "@/lib/crm/batches";
import { RESULT_WEIGHTS, type ResultKind } from "@/lib/crm/results";
import type { RosterBatch, RosterMember, RosterRow } from "@/lib/crm/roster";
import { PIPELINE_STAGES, STAGE_LABELS } from "@/lib/crm/stages";
import { plural } from "@/lib/workspace/display";
import { bulkCandidatesAction } from "../../candidates/manage-actions";
import { AddCandidatesDialog } from "../../candidates/_components/AddCandidatesDialog";
import { BatchDialog } from "../../candidates/_components/BatchDialog";
import { CandidatesView, type Perms } from "../../candidates/_components/CandidatesView";
import { RejectDialog } from "../../candidates/_components/dialogs";
import { Avatar, Btn, Menu, MenuItem, StageDot, stageLabel, useToasts } from "../../candidates/_components/ui";

type Tab = "candidates" | "board" | "results";
const SHORTLIST = "shortlist";

export default function BatchClient({
  slug,
  meId,
  batch,
  rows,
  latestNotes,
  batches,
  members,
  perms,
}: {
  slug: string;
  meId: string;
  batch: BatchSummary;
  rows: RosterRow[];
  latestNotes: Record<string, string>;
  batches: RosterBatch[];
  members: RosterMember[];
  perms: Perms;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const tab: Tab = sp.get("tab") === "board" ? "board" : sp.get("tab") === "results" ? "results" : "candidates";
  const [settings, setSettings] = useState(false);
  const [adding, setAdding] = useState(false);
  const [toasts, toast] = useToasts();
  const active = rows.filter((r) => r.status !== "archived");
  const withEmail = active.filter((r) => r.email && r.stage !== "PASSED" && r.stage !== "REJECTED");

  function setTab(t: Tab) {
    const p = new URLSearchParams(sp.toString());
    if (t === "candidates") p.delete("tab");
    else p.set("tab", t);
    p.delete("view");
    const qs = p.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  const target = batch.targetHires ?? 0;
  const tiles: [string, string, string][] = [
    ["Candidates", String(batch.total), batch.addedThisWeek ? `${batch.addedThisWeek} added this week` : "None added this week"],
    ["Passed", target ? `${batch.passed} of ${target}` : String(batch.passed), batch.deadline ? `Target by ${deadlineText(batch.deadline, "OPEN").split(",")[0]}` : "No target date"],
    ["Waiting on you", String(batch.attention), batch.attention ? "Reviews, feedback or stuck candidates" : "Nothing waiting"],
    ["Deadline", batch.deadline ? deadlineText(batch.deadline, batch.status).split(", ")[0] : "None", batch.deadline ? (deadlineText(batch.deadline, batch.status).split(", ")[1] ?? "") : "Set one in batch settings"],
  ];

  return (
    <div className="flex flex-col gap-5">
      <Link href={`/w/${slug}/batches`} className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-fg w-fit">
        <ArrowLeft className="w-3.5 h-3.5" aria-hidden />
        Batches
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-[26px] font-semibold tracking-tight text-fg truncate">{batch.name}</h1>
            <span className={`inline-flex items-center h-6 px-2 rounded-md text-xs font-medium ${batch.status === "OPEN" ? "bg-success/15 text-success" : "bg-panel text-muted"}`}>
              {batch.status === "OPEN" ? "Open" : "Closed"}
            </span>
          </div>
          <p className="text-sm text-muted mt-1.5">
            {[batch.roleTitle, batch.ownerName && `Owner ${batch.ownerName}`, batch.deadline && `Deadline ${deadlineText(batch.deadline, batch.status).split(",")[0]}`]
              .filter(Boolean)
              .join(" · ") || "No role or owner set yet"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {perms.canWrite && (
            <Btn size="md" icon={Pencil} onClick={() => setSettings(true)}>
              Batch settings
            </Btn>
          )}
          {withEmail.length > 0 && (
            <Btn size="md" icon={Send} href={`/w/${slug}/take-homes/new?candidates=${withEmail.slice(0, 100).map((r) => r.id).join(",")}`}>
              Send take-home
            </Btn>
          )}
          {perms.canWrite && (
            <Btn size="md" variant="primary" icon={Plus} onClick={() => setAdding(true)}>
              Add candidates
            </Btn>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map(([l, v, s]) => (
          <div key={l} className="rounded-xl border border-border bg-surface px-4 py-3.5">
            <div className="text-[13px] text-muted">{l}</div>
            <div className={`text-[22px] font-semibold mt-1 tabular-nums ${l === "Waiting on you" && batch.attention ? "text-warning" : "text-fg"}`}>{v}</div>
            <div className="text-xs text-subtle mt-0.5 truncate">{s}</div>
          </div>
        ))}
      </div>

      <div role="tablist" aria-label="Batch views" className="flex gap-6 border-b border-border">
        {(
          [
            ["candidates", "Candidates"],
            ["board", "Board"],
            ["results", "Results"],
          ] as const
        ).map(([id, text]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`h-10 border-b-2 text-sm font-medium transition-colors ${tab === id ? "border-secondary text-fg" : "border-transparent text-muted hover:text-fg"}`}
          >
            {text}
          </button>
        ))}
      </div>

      {tab === "results" ? (
        <Results slug={slug} rows={active} latestNotes={latestNotes} canPipeline={perms.canPipeline} canWrite={perms.canWrite} batchName={batch.name} />
      ) : (
        <CandidatesView
          key={tab}
          slug={slug}
          meId={meId}
          rows={rows}
          batches={batches}
          members={members}
          perms={perms}
          scopeBatchId={batch.id}
          view={tab === "board" ? "board" : "list"}
          showViewToggle={false}
        />
      )}

      {settings && (
        <BatchDialog
          slug={slug}
          members={members}
          meId={meId}
          canDelete={perms.canDelete}
          initial={{
            id: batch.id,
            name: batch.name,
            roleTitle: batch.roleTitle ?? "",
            ownerId: batch.ownerId ?? "",
            deadline: batch.deadline ? batch.deadline.slice(0, 10) : "",
            targetHires: batch.targetHires != null ? String(batch.targetHires) : "",
            status: batch.status === "CLOSED" ? "CLOSED" : "OPEN",
          }}
          onClose={() => setSettings(false)}
          onDone={(msg) => {
            setSettings(false);
            toast(msg);
          }}
        />
      )}
      {adding && (
        <AddCandidatesDialog
          slug={slug}
          batches={batches}
          members={members}
          defaultBatchId={batch.id}
          onClose={() => setAdding(false)}
          onDone={(msg) => {
            setAdding(false);
            toast(msg);
          }}
        />
      )}
      {toasts}
    </div>
  );
}

type SortCol = "combined" | ResultKind | "minutes";

function Results({
  slug,
  rows,
  latestNotes,
  canPipeline,
  canWrite,
  batchName,
}: {
  slug: string;
  rows: RosterRow[];
  latestNotes: Record<string, string>;
  canPipeline: boolean;
  canWrite: boolean;
  batchName: string;
}) {
  const router = useRouter();
  const [sort, setSort] = useState<SortCol>("combined");
  const [picked, setPicked] = useState<string[]>([]);
  const [onlyShortlist, setOnlyShortlist] = useState(false);
  const [rejecting, setRejecting] = useState<string[] | null>(null);
  const [busy, start] = useTransition();
  const [toasts, toast] = useToasts();

  const value = (r: RosterRow, c: SortCol) => (c === "combined" ? r.combined : c === "minutes" ? r.takeHomeMinutes : r.byKind[c]);
  const ranked = useMemo(() => {
    const scored = [...rows].sort((a, b) => {
      const va = value(a, sort);
      const vb = value(b, sort);
      if (va == null && vb == null) return a.name.localeCompare(b.name);
      if (va == null) return 1;
      if (vb == null) return -1;
      return sort === "minutes" ? va - vb : vb - va;
    });
    return onlyShortlist ? scored.filter((r) => r.tags.includes(SHORTLIST)) : scored;
  }, [rows, sort, onlyShortlist]);
  const shortlisted = rows.filter((r) => r.tags.includes(SHORTLIST)).length;
  const compared = picked.map((id) => rows.find((r) => r.id === id)).filter((r): r is RosterRow => !!r);

  function run(ids: string[], op: Parameters<typeof bulkCandidatesAction>[2], done: string) {
    start(async () => {
      const r = await bulkCandidatesAction(slug, ids, op);
      if (!r.ok) toast(r.error, "error");
      else {
        toast(done);
        router.refresh();
      }
    });
  }

  function exportCsv() {
    const esc = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [
      ["rank", "name", "email", "stage", "combined", "ai_screening", "take_home", "interview_rating", "take_home_minutes", "shortlisted"].join(","),
      ...ranked.map((r, i) =>
        [i + 1, r.name, r.email, stageLabel(r.stage), r.combined, r.byKind.ai_screening, r.byKind.take_home, r.interviewRating, r.takeHomeMinutes, r.tags.includes(SHORTLIST) ? "yes" : ""]
          .map(esc)
          .join(","),
      ),
    ];
    const url = URL.createObjectURL(new Blob([lines.join("\n") + "\n"], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${batchName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-results.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const best = (kind: SortCol) => {
    const vals = compared.map((r) => value(r, kind)).filter((v): v is number => v != null);
    if (vals.length < 2) return null;
    return kind === "minutes" ? Math.min(...vals) : Math.max(...vals);
  };

  const G = "grid grid-cols-[32px_36px_minmax(0,1.4fr)_repeat(5,minmax(76px,1fr))_96px] gap-3.5 items-center";
  const head = (c: SortCol, text: string) => (
    <button type="button" onClick={() => setSort(c)} aria-pressed={sort === c} className={`text-left ${sort === c ? "text-fg" : "hover:text-fg"}`}>
      {text}
      {sort === c ? (c === "minutes" ? " ↑" : " ↓") : ""}
    </button>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-[13px] text-muted flex-1 min-w-[260px]">
          Ranked by combined score: AI screening {RESULT_WEIGHTS.ai_screening * 100}%, take-home {RESULT_WEIGHTS.take_home * 100}%, interview{" "}
          {RESULT_WEIGHTS.interview * 100}%. Missing results are left out of the weighting. Tick 2 to 4 people to compare them.
        </p>
        <button
          type="button"
          aria-pressed={onlyShortlist}
          onClick={() => setOnlyShortlist((v) => !v)}
          className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-[13px] font-medium ${
            onlyShortlist ? "border-warning/50 bg-warning/15 text-warning" : "border-border text-muted hover:text-fg"
          }`}
        >
          <Star className="w-3.5 h-3.5" aria-hidden />
          Shortlist {shortlisted}
        </button>
        <Btn icon={Download} onClick={exportCsv}>
          Export CSV
        </Btn>
      </div>

      <div className="rounded-xl border border-border bg-surface overflow-x-auto">
        <div className="min-w-[860px]">
          <div className={`${G} px-4 py-2.5 text-xs font-medium text-subtle border-b border-border`}>
            <span>
              <span className="sr-only">Compare</span>
            </span>
            <span>Rank</span>
            <span>Candidate</span>
            {head("combined", "Combined")}
            {head("ai_screening", "AI screening")}
            {head("take_home", "Take-home")}
            {head("interview", "Interview")}
            {head("minutes", "Time taken")}
            <span>Shortlist</span>
          </div>
          {ranked.length === 0 && <p className="px-4 py-10 text-center text-[13px] text-subtle">{onlyShortlist ? "Nobody is on the shortlist yet." : "No candidates in this batch yet."}</p>}
          {ranked.map((r, i) => {
            const on = picked.includes(r.id);
            const listed = r.tags.includes(SHORTLIST);
            const cell = (v: number | null | string) =>
              v == null || v === "" ? <span className="text-subtle">None</span> : <span className="tabular-nums text-fg">{v}</span>;
            return (
              <div key={r.id} className={`${G} px-4 py-3 border-b border-border last:border-b-0 text-sm ${on ? "bg-secondary/[0.07]" : "hover:bg-panel/50"}`}>
                <input
                  type="checkbox"
                  checked={on}
                  disabled={!on && picked.length >= 4}
                  onChange={() => setPicked((p) => (on ? p.filter((x) => x !== r.id) : [...p, r.id]))}
                  aria-label={`Compare ${r.name}`}
                  className="w-4 h-4 accent-secondary"
                />
                <span
                  className={`w-[26px] h-[26px] rounded-full flex items-center justify-center text-xs font-semibold ${
                    i < 3 && value(r, sort) != null ? "bg-secondary/20 text-secondary-soft" : "bg-panel text-muted"
                  }`}
                >
                  {i + 1}
                </span>
                <Link href={`/w/${slug}/candidates/${r.id}`} className="flex items-center gap-2.5 min-w-0 hover:underline underline-offset-2">
                  <Avatar name={r.name} size={28} />
                  <span className="font-medium text-fg truncate">{r.name}</span>
                  <StageDot stage={r.stage} className="shrink-0" />
                </Link>
                <span className="font-semibold">{r.combined == null ? <span className="font-normal text-subtle">Incomplete</span> : r.combined}</span>
                {cell(r.byKind.ai_screening)}
                {cell(r.byKind.take_home)}
                {cell(r.interviewRating != null ? r.interviewRating.toFixed(1) : null)}
                {cell(r.takeHomeMinutes != null ? `${r.takeHomeMinutes} min` : null)}
                <button
                  type="button"
                  aria-pressed={listed}
                  disabled={!canWrite || busy}
                  onClick={() => run([r.id], { action: "tag", ...(listed ? { remove: [SHORTLIST] } : { add: [SHORTLIST] }) }, listed ? `Removed ${r.name} from the shortlist` : `Shortlisted ${r.name}`)}
                  className={`justify-self-start inline-flex items-center gap-1 h-7 px-2.5 rounded-lg border text-xs font-medium ${
                    listed ? "border-warning/40 bg-warning/15 text-warning" : "border-border text-muted hover:text-fg"
                  }`}
                >
                  <Star className="w-3 h-3" aria-hidden />
                  {listed ? "Listed" : "List"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {compared.length >= 2 && (
        <section aria-label="Compare" className="rounded-xl border border-secondary/40 bg-surface p-4 flex flex-col gap-3.5 animate-[menuIn_160ms_ease-out] motion-reduce:animate-none">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[15px] font-semibold text-fg">Comparing {plural(compared.length, "candidate")}</h2>
            <div className="flex gap-2">
              {canPipeline && (
                <Menu
                  align="right"
                  label="Move compared candidates"
                  trigger={(p) => (
                    <Btn icon={CircleArrowRight} disabled={busy} {...p}>
                      Move {compared.length === 2 ? "both" : "all"}
                    </Btn>
                  )}
                >
                  {(close) =>
                    PIPELINE_STAGES.map((s) => (
                      <MenuItem
                        key={s}
                        danger={s === "REJECTED"}
                        onClick={() => {
                          close();
                          if (s === "REJECTED") setRejecting(picked);
                          else run(picked, { action: "stage", stage: s }, `Moved ${plural(picked.length, "candidate")} to ${STAGE_LABELS[s]}`);
                        }}
                      >
                        <StageDot stage={s} />
                        {STAGE_LABELS[s]}
                      </MenuItem>
                    ))
                  }
                </Menu>
              )}
              <Btn icon={X} onClick={() => setPicked([])}>
                Close
              </Btn>
            </div>
          </div>
          <div className="grid gap-3.5" style={{ gridTemplateColumns: `repeat(${Math.max(compared.length, 2)}, minmax(0, 1fr))` }}>
            {compared.map((r) => {
              const lines: [string, string, SortCol][] = [
                ["Combined", r.combined != null ? String(r.combined) : "Incomplete", "combined"],
                ["AI screening", r.byKind.ai_screening != null ? String(r.byKind.ai_screening) : r.results.some((x) => x.kind === "ai_screening") ? "Pending" : "Not sent", "ai_screening"],
                ["Take-home", r.byKind.take_home != null ? String(r.byKind.take_home) : r.results.some((x) => x.kind === "take_home") ? "Pending" : "Not sent", "take_home"],
                ["Time taken", r.takeHomeMinutes != null ? `${r.takeHomeMinutes} min` : "None", "minutes"],
                ["Interview", r.interviewRating != null ? `${r.interviewRating.toFixed(1)} of 5` : "Not yet", "interview"],
              ];
              return (
                <div key={r.id} className="rounded-xl border border-border bg-bg p-4 flex flex-col gap-3 min-w-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar name={r.name} size={32} />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-fg truncate">{r.name}</div>
                      <div className="text-xs text-subtle">
                        {stageLabel(r.stage)} · {plural(r.daysInStage, "day")}
                      </div>
                    </div>
                  </div>
                  {lines.map(([l, v, k]) => {
                    const b = best(k);
                    const raw = value(r, k);
                    const isBest = b != null && raw === b;
                    return (
                      <div key={l} className="flex justify-between gap-2 text-[13px]">
                        <span className="text-muted">{l}</span>
                        <span className={`font-semibold ${isBest ? "text-success" : "text-fg"}`}>{v}</span>
                      </div>
                    );
                  })}
                  <p className="text-[13px] leading-relaxed text-muted border-t border-border pt-2.5 line-clamp-3">{latestNotes[r.id] ?? "No notes yet."}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}
      {compared.length === 1 && <p className="text-[13px] text-subtle">Tick at least one more person to compare.</p>}

      {rejecting && (
        <RejectDialog
          names={rows.filter((r) => rejecting.includes(r.id)).map((r) => r.name)}
          busy={busy}
          onCancel={() => setRejecting(null)}
          onConfirm={(reason, note) => {
            const ids = rejecting;
            setRejecting(null);
            run(ids, { action: "stage", stage: "REJECTED", rejectReason: reason, rejectReasonNote: note }, `Marked ${plural(ids.length, "candidate")} as not passed`);
          }}
        />
      )}
      {toasts}
    </div>
  );
}
