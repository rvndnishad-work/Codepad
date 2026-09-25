"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight, ClipboardPaste, Copy, Download, Mail, Search, UserPlus, XCircle } from "lucide-react";
import type { CreditSummary, PoolCandidate, ScreeningDetail } from "@/lib/ai-interview/console-server";
import { creditCheck, parsePastedPeople, statusLabel } from "@/lib/ai-interview/console";
import { ENGAGEMENT_LABELS, normalizeEngagementLevel } from "@/lib/ai-interview/engagement";
import { plural } from "@/lib/workspace/display";
import { Avatar, Btn, Dialog, StageChip, fmtDate, inputCls, stageLabel, useToasts } from "../../candidates/_components/ui";
import { ConfirmDialog } from "../../candidates/_components/dialogs";
import { StatusChip, ToneChip, ToneDot, ToneScore, selectCls } from "./kit";
import { addToScreeningAction, cancelInvitesAction, remindAction } from "../actions";

type Sort = "score" | "name" | "status";

export default function ScreeningCompare({
  slug,
  s,
  credits,
  pool,
  canManage,
}: {
  slug: string;
  s: ScreeningDetail;
  credits: CreditSummary;
  pool: PoolCandidate[];
  canManage: boolean;
}) {
  const router = useRouter();
  const base = `/w/${slug}/ai-interviews`;
  const [pending, start] = useTransition();
  const [toasts, toast] = useToasts();
  const [sort, setSort] = useState<Sort>("score");
  const [selected, setSelected] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [cancelling, setCancelling] = useState<string[] | null>(null);

  const people = useMemo(() => {
    const rank: Record<string, number> = { COMPLETED: 0, ACTIVE: 1, PENDING: 2, EXPIRED: 3 };
    const list = [...s.people];
    if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "status") list.sort((a, b) => (rank[a.status] ?? 9) - (rank[b.status] ?? 9) || a.name.localeCompare(b.name));
    else list.sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || (rank[a.status] ?? 9) - (rank[b.status] ?? 9));
    return list;
  }, [s.people, sort]);

  const waiting = s.people.filter((p) => p.status === "PENDING");
  const finished = s.people.filter((p) => p.status === "COMPLETED");
  const toReview = finished.filter((p) => p.awaitsDecision).length;
  const passed = s.people.filter((p) => p.stage === "PASSED").length;
  const selectable = waiting.map((p) => p.id);

  function run<T extends { ok: boolean; error?: string }>(p: Promise<T>, done: (r: T) => string) {
    start(async () => {
      const r = await p;
      if (!r.ok) return toast(r.error ?? "Something went wrong.", "error");
      toast(done(r));
      setSelected([]);
      router.refresh();
    });
  }

  function exportCsv() {
    const head = ["Name", "Email", "Status", "Decision", "AI score", "AI suggestion", ...s.rounds.map((r, i) => `Round ${i + 1} (${r.label})`), "Integrity", "Finished"];
    const lines = people.map((p) => [
      p.name,
      p.email,
      statusLabel(p.status),
      p.stage === "PASSED" || p.stage === "REJECTED" ? stageLabel(p.stage) : "",
      p.score ?? "",
      p.suggestion?.label ?? "",
      ...p.roundScores.map((x) => x ?? ""),
      p.integrity?.label ?? "",
      p.finishedAt ? p.finishedAt.slice(0, 10) : "",
    ]);
    const csv = [head, ...lines].map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${s.title.replace(/[^\w-]+/g, "-").toLowerCase()}-screening.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalMinutes = s.rounds.reduce((n, r) => n + r.minutes, 0);

  return (
    <div className="flex flex-col gap-5">
      <Link href={`${base}/screenings`} className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-fg w-fit">
        <ArrowLeft className="w-3.5 h-3.5" aria-hidden /> Screenings
      </Link>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">{s.title}</h1>
          <p className="text-[13px] text-muted mt-1.5">
            Sent {fmtDate(s.createdAt, true)}, {s.rounds.length ? `${plural(s.rounds.length, "round")} (${totalMinutes} min)` : "rounds set per person"}, interviewer{" "}
            {ENGAGEMENT_LABELS[normalizeEngagementLevel(s.engagementLevel)].label.toLowerCase()}
            {s.expiresAfterDays ? `, invites close after ${plural(s.expiresAfterDays, "day")}` : ""}
            {s.reminderAfterDays ? `, reminder after ${plural(s.reminderAfterDays, "day")}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn icon={Download} onClick={exportCsv}>
            Export CSV
          </Btn>
          {canManage && (
            <>
              <Btn icon={Copy} href={`${base}/new?from=${s.id}`}>
                Duplicate
              </Btn>
              {waiting.length > 0 && (
                <Btn icon={Mail} disabled={pending} onClick={() => run(remindAction(slug, waiting.map((p) => p.id)), (r) => (r.ok ? `${plural(r.sent, "reminder")} sent` : ""))}>
                  Remind {waiting.length}
                </Btn>
              )}
              <Btn variant="primary" icon={UserPlus} onClick={() => setAdding(true)}>
                Add people
              </Btn>
            </>
          )}
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Invited" value={s.people.length} />
        <Kpi label="Finished" value={finished.length} />
        <Kpi label="To review" value={toReview} accent={toReview > 0} />
        <Kpi label="Passed" value={passed} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {s.rounds.map((r, i) => (
            <span key={i} className="h-7 px-2.5 rounded-md bg-panel text-xs text-muted inline-flex items-center gap-1.5">
              <span className="text-fg font-medium">R{i + 1}</span> {r.title}
            </span>
          ))}
        </div>
        <label className="flex items-center gap-2 text-[13px] text-muted">
          Sort
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className={`${selectCls} w-auto h-8`}>
            <option value="score">AI score</option>
            <option value="status">Status</option>
            <option value="name">Name</option>
          </select>
        </label>
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-secondary/30 bg-secondary/[0.06] px-4 py-2.5">
          <span className="text-[13px] text-fg font-medium mr-auto">{plural(selected.length, "invite")} selected</span>
          <Btn icon={Mail} disabled={pending} onClick={() => run(remindAction(slug, selected), (r) => (r.ok ? `${plural(r.sent, "reminder")} sent` : ""))}>
            Send reminder
          </Btn>
          <Btn variant="danger" icon={XCircle} disabled={pending} onClick={() => setCancelling(selected)}>
            Cancel invites
          </Btn>
        </div>
      )}

      <div className="rounded-xl border border-border bg-surface overflow-x-auto">
        <table className="w-full min-w-[760px] text-left">
          <thead>
            <tr className="h-10 border-b border-border text-xs text-subtle">
              <th className="w-10 pl-4 font-normal">
                {canManage && selectable.length > 0 && (
                  <input
                    type="checkbox"
                    aria-label="Select everyone who has not started"
                    checked={selectable.every((id) => selected.includes(id))}
                    onChange={() => setSelected(selectable.every((id) => selected.includes(id)) ? [] : selectable)}
                    className="w-4 h-4 accent-secondary"
                  />
                )}
              </th>
              <th className="font-normal px-3">Candidate</th>
              <th className="font-normal px-3">Result</th>
              <th className="font-normal px-3">AI score</th>
              {s.rounds.map((r, i) => (
                <th key={i} className="font-normal px-3 text-right" title={r.title}>
                  R{i + 1}
                </th>
              ))}
              <th className="font-normal px-3">Integrity</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {people.map((p) => {
              const decided = p.stage === "PASSED" || p.stage === "REJECTED";
              return (
                <tr key={p.id} className="group relative border-b border-border last:border-b-0 hover:bg-panel/60">
                  <td className="pl-4 w-10">
                    {canManage && p.status === "PENDING" && (
                      <input
                        type="checkbox"
                        aria-label={`Select ${p.name}`}
                        checked={selected.includes(p.id)}
                        onChange={() => setSelected((a) => (a.includes(p.id) ? a.filter((x) => x !== p.id) : [...a, p.id]))}
                        className="w-4 h-4 accent-secondary relative z-10"
                      />
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <Link href={`${base}/${p.id}`} className="flex items-center gap-3 min-w-0 after:absolute after:inset-0">
                      <Avatar name={p.name} size={30} />
                      <span className="flex flex-col min-w-0">
                        <span className="text-sm font-medium text-fg truncate">{p.name}</span>
                        <span className="text-xs text-subtle truncate">{p.email}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-3">
                    {decided ? (
                      <StageChip stage={p.stage!} />
                    ) : p.suggestion ? (
                      <ToneChip tone={p.suggestion.tone}>{p.suggestion.label}</ToneChip>
                    ) : p.inviteEmailStatus === "FAILED" && p.status === "PENDING" ? (
                      <ToneChip tone="danger">Email failed</ToneChip>
                    ) : (
                      <StatusChip status={p.status} />
                    )}
                  </td>
                  <td className="px-3">{p.score != null ? <ToneScore value={p.score} tone={p.suggestion?.tone ?? "neutral"} width={56} /> : <span className="text-[13px] text-subtle">–</span>}</td>
                  {p.roundScores.map((x, i) => (
                    <td key={i} className="px-3 text-right text-[13px] tabular-nums text-muted">
                      {x ?? "–"}
                    </td>
                  ))}
                  <td className="px-3">{p.integrity ? <ToneDot tone={p.integrity.tone} label={p.integrity.label} /> : <span className="text-[13px] text-subtle">–</span>}</td>
                  <td className="pr-4">
                    <ChevronRight className="w-4 h-4 text-subtle group-hover:text-fg" aria-hidden />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {adding && (
        <AddPeopleDialog
          slug={slug}
          s={s}
          pool={pool}
          credits={credits}
          onClose={() => setAdding(false)}
          onDone={(msg, tone) => {
            setAdding(false);
            toast(msg, tone);
            router.refresh();
          }}
        />
      )}
      {cancelling && (
        <ConfirmDialog
          title={`Cancel ${plural(cancelling.length, "invite")}?`}
          body="Their links stop working straight away and the credits they held are freed. You can reopen an invite later."
          confirmLabel="Cancel invites"
          danger
          busy={pending}
          onCancel={() => setCancelling(null)}
          onConfirm={() => {
            const ids = cancelling;
            setCancelling(null);
            run(cancelInvitesAction(slug, ids), (r) => (r.ok ? `${plural(r.cancelled, "invite")} cancelled` : ""));
          }}
        />
      )}
      {toasts}
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3">
      <div className={`text-2xl font-semibold tabular-nums ${accent ? "text-secondary-soft" : "text-fg"}`}>{value}</div>
      <div className="text-xs text-subtle mt-0.5">{label}</div>
    </div>
  );
}

function AddPeopleDialog({
  slug,
  s,
  pool,
  credits,
  onClose,
  onDone,
}: {
  slug: string;
  s: ScreeningDetail;
  pool: PoolCandidate[];
  credits: CreditSummary;
  onClose: () => void;
  onDone: (msg: string, tone: "ok" | "error") => void;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const [paste, setPaste] = useState("");
  const [q, setQ] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const inScreening = new Set(s.people.flatMap((p) => [p.candidateId, p.email.toLowerCase()]).filter(Boolean) as string[]);
  const available = pool.filter((c) => !inScreening.has(c.id) && !inScreening.has(c.email.toLowerCase()));
  const shown = (q.trim() ? available.filter((c) => `${c.name} ${c.email}`.toLowerCase().includes(q.trim().toLowerCase())) : available).slice(0, 8);
  const pasted = parsePastedPeople(paste).filter((p) => !inScreening.has(p.email));
  const count = picked.length + pasted.length;
  const check = creditCheck(credits.balance, credits.held, count, s.engagementLevel);

  return (
    <Dialog
      title={`Add people to ${s.title}`}
      onClose={onClose}
      width={560}
      footer={
        <>
          <span className="mr-auto text-xs text-subtle">
            {count ? `${plural(check.needed, "credit")} needed, ${check.available} free` : "Same rounds and settings as everyone else"}
          </span>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn
            variant="primary"
            disabled={!count || !check.ok || pending}
            onClick={() =>
              start(async () => {
                const r = await addToScreeningAction(slug, s.id, { candidateIds: picked, newPeople: pasted });
                if (!r.ok) return setError(r.error);
                onDone(r.failed ? `${plural(r.invited, "invite")} created, ${r.failed} emails failed` : `${plural(r.sent, "invite")} sent`, r.failed ? "error" : "ok");
              })
            }
          >
            {pending ? "Sending" : count ? `Send ${plural(count, "invite")}` : "Send invites"}
          </Btn>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <label className="relative">
          <span className="sr-only">Search candidates</span>
          <Search aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-subtle" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search Candidates" className={`${inputCls} pl-8`} />
        </label>
        <ul className="flex flex-col max-h-60 overflow-y-auto rounded-xl border border-border divide-y divide-border">
          {shown.map((c) => (
            <li key={c.id}>
              <label className="flex items-center gap-3 px-3.5 py-2.5 cursor-pointer hover:bg-panel/60">
                <input
                  type="checkbox"
                  checked={picked.includes(c.id)}
                  onChange={() => setPicked((a) => (a.includes(c.id) ? a.filter((x) => x !== c.id) : [...a, c.id]))}
                  className="w-4 h-4 accent-secondary"
                />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm text-fg truncate">{c.name}</span>
                  <span className="block text-xs text-subtle truncate">{c.email}</span>
                </span>
              </label>
            </li>
          ))}
          {!shown.length && <li className="px-3.5 py-3 text-[13px] text-subtle">Nobody else to add from Candidates.</li>}
        </ul>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-subtle flex items-center gap-1.5">
            <ClipboardPaste className="w-3.5 h-3.5" aria-hidden /> Or paste emails of new people
          </span>
          <textarea rows={3} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="ava@mail.com, Mateo Silva <mateo@mail.com>" className={`${inputCls} h-auto py-2`} />
        </label>
        {error && <p className="text-[13px] text-danger">{error}</p>}
      </div>
    </Dialog>
  );
}
