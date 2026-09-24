"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, ChevronDown, ChevronUp, CircleCheck, FileText, Send, X } from "lucide-react";
import { passCheck, screeningChecklist } from "@/lib/crm/results";
import type { RosterRow } from "@/lib/crm/roster";
import { relativeTime } from "@/lib/workspace/display";
import { addNoteAction, quickViewAction, type QuickViewData } from "../manage-actions";
import { ChecklistList } from "./Checklist";
import { Avatar, Btn, inputCls } from "./ui";

export function QuickView({
  slug,
  row,
  position,
  batchName,
  canPipeline,
  canWrite,
  onClose,
  onStep,
  onMove,
  onReject,
}: {
  slug: string;
  row: RosterRow;
  position: { index: number; total: number };
  batchName: string | null;
  canPipeline: boolean;
  canWrite: boolean;
  onClose: () => void;
  onStep: (delta: 1 | -1) => void;
  onMove: (stage: string) => void;
  onReject: () => void;
}) {
  const [data, setData] = useState<QuickViewData | null>(null);
  const [note, setNote] = useState("");
  const [noting, setNoting] = useState(false);
  const [saving, startSaving] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let live = true;
    setData(null);
    setNoting(false);
    setError(null);
    quickViewAction(slug, row.id).then((r) => {
      if (live && r.ok) setData(r.data);
    });
    return () => {
      live = false;
    };
  }, [slug, row.id, row.stage]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest("input, textarea, select");
      if (e.key === "Escape") onClose();
      else if (!typing && (e.key === "j" || e.key === "ArrowDown")) onStep(1);
      else if (!typing && (e.key === "k" || e.key === "ArrowUp")) onStep(-1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, onStep]);

  useEffect(() => {
    panelRef.current?.focus();
  }, [row.id]);

  const checklist = screeningChecklist(row.results);
  const isClosed = row.stage === "PASSED" || row.stage === "REJECTED";

  function saveNote() {
    startSaving(async () => {
      const r = await addNoteAction(slug, row.id, note);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setNote("");
      setNoting(false);
      const fresh = await quickViewAction(slug, row.id);
      if (fresh.ok) setData(fresh.data);
    });
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-bg/50 animate-[fadeIn_160ms_ease-out] motion-reduce:animate-none" onClick={onClose} aria-hidden />
      <aside
        ref={panelRef}
        tabIndex={-1}
        aria-label={`${row.name} quick view`}
        className="fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[460px] bg-surface border-l border-border-strong shadow-2xl shadow-black/40 flex flex-col outline-none animate-[drawerIn_200ms_cubic-bezier(0.22,1,0.36,1)] motion-reduce:animate-none"
      >
        <div className="flex items-center justify-between gap-2 px-5 py-3 border-b border-border">
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => onStep(-1)} aria-label="Previous candidate" className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-fg hover:bg-panel">
              <ChevronUp className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => onStep(1)} aria-label="Next candidate" className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-fg hover:bg-panel">
              <ChevronDown className="w-4 h-4" />
            </button>
            <span className="text-[13px] text-subtle ml-1 tabular-nums">
              {position.index + 1} of {position.total}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Link href={`/w/${slug}/candidates/${row.id}`} className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-[13px] font-medium text-secondary-soft hover:bg-panel">
              Open profile <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
            <button type="button" onClick={onClose} aria-label="Close quick view" className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-fg hover:bg-panel">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-6">
          <div className="flex gap-3.5 items-center">
            <Avatar name={row.name} size={48} />
            <div className="min-w-0">
              <div className="text-lg font-semibold text-fg truncate">{row.name}</div>
              <div className="text-[13px] text-muted truncate">
                {[row.email, batchName].filter(Boolean).join(" · ") || "No email"}
              </div>
            </div>
          </div>

          {!isClosed && (
            <div
              className={`rounded-xl border p-3.5 flex items-center gap-3 ${
                row.next.tone === "warning" ? "border-warning/30 bg-warning/10" : row.next.tone === "danger" ? "border-danger/30 bg-danger/10" : "border-border bg-panel/60"
              }`}
            >
              <FileText className={`w-[18px] h-[18px] shrink-0 ${row.next.tone === "danger" ? "text-danger" : row.next.tone === "warning" ? "text-warning" : "text-muted"}`} aria-hidden />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-fg">Next: {row.next.label.charAt(0).toLowerCase() + row.next.label.slice(1)}</div>
                {row.next.detail && <div className="text-[13px] text-muted mt-0.5">{row.next.detail}</div>}
              </div>
              {row.next.href && (
                <Btn variant="primary" href={row.next.href}>
                  Open
                </Btn>
              )}
            </div>
          )}

          <section>
            <h3 className="text-xs font-medium text-subtle mb-3">Screening</h3>
            <ChecklistList items={checklist} decision={{ stage: row.stage, at: row.stageChangedAt, reason: row.rejectReason }} />
          </section>

          <section>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-medium text-subtle">Notes{data ? ` · ${data.noteCount}` : ""}</h3>
              {canWrite && !noting && (
                <button type="button" onClick={() => setNoting(true)} className="text-[13px] font-medium text-secondary-soft hover:underline">
                  Add note
                </button>
              )}
            </div>
            {noting && (
              <div className="flex flex-col gap-2 mb-4">
                <textarea
                  autoFocus
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="What did you notice?"
                  className={`${inputCls} h-auto py-2 resize-none`}
                  aria-label="New note"
                />
                {error && <p className="text-xs text-danger">{error}</p>}
                <div className="flex gap-2 justify-end">
                  <Btn onClick={() => setNoting(false)}>Cancel</Btn>
                  <Btn variant="primary" disabled={!note.trim() || saving} onClick={saveNote}>
                    Save note
                  </Btn>
                </div>
              </div>
            )}
            {data?.notes.length ? (
              <ul className="flex flex-col gap-3">
                {data.notes.map((n) => (
                  <li key={n.id} className="flex gap-2.5">
                    <Avatar name={n.authorName ?? "Imported"} size={28} />
                    <div className="text-[13px] leading-relaxed min-w-0">
                      <span className="text-fg font-medium">{n.authorName ?? "Imported note"}</span>
                      <span className="text-subtle"> · {relativeTime(n.createdAt)}</span>
                      <p className="text-muted whitespace-pre-wrap break-words line-clamp-4">{n.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              !noting && <p className="text-[13px] text-subtle">{data ? "No notes yet." : "Loading"}</p>
            )}
          </section>

        </div>

        {(canPipeline || canWrite) && !isClosed && (
          <div className="px-5 py-3.5 border-t border-border flex flex-wrap gap-2">
            {canPipeline && (
              <Btn variant={passCheck(row.results).override ? "ghost" : "primary"} icon={CircleCheck} onClick={() => onMove("PASSED")}>
                Pass
              </Btn>
            )}
            <Btn icon={Send} href={`/w/${slug}/take-homes/new?candidates=${row.id}`}>
              Take-home
            </Btn>
            <Btn
              icon={CalendarDays}
              href={`/interview/new?type=live&workspaceSlug=${slug}&candidateId=${row.id}&candidateName=${encodeURIComponent(row.name)}&candidateEmail=${encodeURIComponent(row.email ?? "")}`}
            >
              Schedule
            </Btn>
            {canPipeline && (
              <Btn variant="danger" className="ml-auto" onClick={onReject}>
                Not passed
              </Btn>
            )}
          </div>
        )}
      </aside>
    </>
  );
}
