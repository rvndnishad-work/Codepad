"use client";

/**
 * The Questionnaires tab: search, role-area filter and sort over the team's
 * questionnaires, cards with a peek at the questions, and a side panel to
 * read one in full (reference answers included) without opening the editor.
 */
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bot, BookOpen, ChevronDown, Clock, Copy, Eye, ListChecks, Lock, MoreHorizontal, Pencil, PenLine, Search, Trash2, X } from "lucide-react";
import { TopicLogo } from "@/app/interview-questions/_components/TopicLogo";
import { techLabel } from "@/lib/interview-questions/shared";
import type { Questionnaire } from "@/lib/library/library-server";
import { filterQuestionnaires, questionnaireStats, roleAreas, type ListSort } from "@/lib/library/questionnaire-view";
import { plural } from "@/lib/workspace/display";
import { Btn, Menu, MenuItem, fmtDate, inputCls } from "../candidates/_components/ui";
import { ConfirmDialog } from "../candidates/_components/dialogs";
import { DifficultyChip } from "./PublicBrowser";
import { deleteQuestionnaireAction, duplicateQuestionnaireAction } from "./actions";
import type { ToastFn } from "./LibraryClient";

const selectCls = `${inputCls.replace("w-full", "")} w-auto`;

export default function Questionnaires({
  slug,
  items,
  canManage,
  aiScreening,
  bankTotal,
  onEdit,
  onNew,
  onBrowse,
  toast,
}: {
  slug: string;
  items: Questionnaire[];
  canManage: boolean;
  aiScreening: boolean;
  bankTotal: number;
  onEdit: (q: Questionnaire) => void;
  onNew: () => void;
  onBrowse: () => void;
  toast: ToastFn;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [area, setArea] = useState<string | null>(null);
  const [sort, setSort] = useState<ListSort>("updated");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Questionnaire | null>(null);
  const [busy, start] = useTransition();

  const areas = useMemo(() => roleAreas(items), [items]);
  const shown = useMemo(() => filterQuestionnaires(items, { q, area, sort }), [items, q, area, sort]);
  const totals = useMemo(() => {
    const all = items.flatMap((x) => x.items);
    const s = questionnaireStats(all);
    return { questions: s.count, coverage: s.coverage };
  }, [items]);
  const preview = previewId ? items.find((x) => x.id === previewId) ?? null : null;

  function duplicate(x: Questionnaire) {
    start(async () => {
      const r = await duplicateQuestionnaireAction(slug, x.id);
      if (!r.ok) return toast(r.error, "error");
      toast(`Copied as ${r.title}`);
      router.refresh();
    });
  }

  if (!items.length) {
    return <EmptyState canManage={canManage} bankTotal={bankTotal} onNew={onNew} onBrowse={onBrowse} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-4 h-4 text-subtle absolute left-2.5 top-1/2 -translate-y-1/2" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search names and questions" aria-label="Search questionnaires" className={`${inputCls} pl-8 pr-8`} />
            {q && (
              <button type="button" onClick={() => setQ("")} aria-label="Clear search" className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md flex items-center justify-center text-subtle hover:text-fg">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <span className="flex-1" />
          <p className="hidden md:block text-[13px] text-subtle" aria-live="polite">
            {plural(totals.questions, "question")}, {totals.coverage}% with reference answers
          </p>
          <select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as ListSort)} className={selectCls}>
            <option value="updated">Recently updated</option>
            <option value="used">Most used</option>
            <option value="name">Name</option>
          </select>
        </div>
        {areas.length > 1 && (
          <div role="radiogroup" aria-label="Role area" className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-0.5">
            <Chip on={area === null} onClick={() => setArea(null)} label="All" count={items.length} />
            {areas.map((a) => (
              <Chip key={a.area} on={area === a.area} onClick={() => setArea(area === a.area ? null : a.area)} label={a.area} count={a.count} />
            ))}
          </div>
        )}
      </div>

      {shown.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-strong bg-surface px-6 py-12 text-center flex flex-col items-center gap-2">
          <p className="text-sm font-medium text-fg">Nothing matches {q ? `"${q}"` : "this filter"}</p>
          <Btn
            variant="quiet"
            onClick={() => {
              setQ("");
              setArea(null);
            }}
          >
            Clear filters
          </Btn>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {shown.map((x, i) => (
            <Card
              key={x.id}
              slug={slug}
              item={x}
              index={i}
              canManage={canManage}
              aiScreening={aiScreening}
              busy={busy}
              onPreview={() => setPreviewId(x.id)}
              onEdit={() => onEdit(x)}
              onDuplicate={() => duplicate(x)}
              onDelete={() => setDeleting(x)}
            />
          ))}
        </ul>
      )}

      {preview && (
        <PreviewPanel
          slug={slug}
          item={preview}
          canManage={canManage}
          aiScreening={aiScreening}
          busy={busy}
          onClose={() => setPreviewId(null)}
          onEdit={() => onEdit(preview)}
          onDuplicate={() => duplicate(preview)}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title={`Delete ${deleting.title}?`}
          body={
            deleting.uses
              ? `It was used in ${plural(deleting.uses, "screening")}. Those reports keep their transcripts, but new screenings can no longer use it.`
              : "This cannot be undone."
          }
          confirmLabel="Delete questionnaire"
          danger
          busy={busy}
          onCancel={() => setDeleting(null)}
          onConfirm={() =>
            start(async () => {
              const r = await deleteQuestionnaireAction(slug, deleting.id);
              if (!r.ok) return toast(r.error, "error");
              toast("Questionnaire deleted");
              if (previewId === deleting.id) setPreviewId(null);
              setDeleting(null);
              router.refresh();
            })
          }
        />
      )}
    </div>
  );
}

function Chip({ on, onClick, label, count }: { on: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onClick}
      className={`h-8 px-3 shrink-0 rounded-full border text-[13px] inline-flex items-center gap-1.5 whitespace-nowrap transition ${
        on ? "border-secondary/50 bg-secondary/15 text-fg" : "border-border bg-surface text-muted hover:text-fg hover:border-border-strong"
      }`}
    >
      {label}
      <span className={`text-xs tabular-nums ${on ? "text-secondary-soft" : "text-subtle"}`}>{count}</span>
    </button>
  );
}

/** Coverage of reference answers as a thin bar. */
export function CoverageBar({ answered, count, className = "" }: { answered: number; count: number; className?: string }) {
  const pct = count ? Math.round((answered / count) * 100) : 0;
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <span className="relative h-1.5 flex-1 rounded-full bg-panel overflow-hidden" aria-hidden>
        <span
          className={`absolute inset-y-0 left-0 rounded-full origin-left animate-rule-in motion-reduce:animate-none ${pct === 100 ? "bg-success" : pct ? "bg-secondary" : "bg-subtle"}`}
          style={{ width: `${Math.max(pct, count ? 3 : 0)}%` }}
        />
      </span>
      <span className="text-xs text-muted tabular-nums whitespace-nowrap">
        {answered} of {count} answered
      </span>
    </span>
  );
}

function TechStack({ techs, size = 16 }: { techs: string[]; size?: number }) {
  if (!techs.length) return null;
  return (
    <span className="flex items-center -space-x-1">
      {techs.slice(0, 3).map((t) => (
        <span key={t} title={techLabel(t)} className="w-7 h-7 rounded-lg bg-panel ring-2 ring-surface flex items-center justify-center">
          <TopicLogo slug={t} size={size} />
        </span>
      ))}
      {techs.length > 3 && <span className="w-7 h-7 rounded-lg bg-panel ring-2 ring-surface flex items-center justify-center text-[11px] text-muted">+{techs.length - 3}</span>}
    </span>
  );
}

function Card({
  slug,
  item,
  index,
  canManage,
  aiScreening,
  busy,
  onPreview,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  slug: string;
  item: Questionnaire;
  index: number;
  canManage: boolean;
  aiScreening: boolean;
  busy: boolean;
  onPreview: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const s = questionnaireStats(item.items);
  const peek = item.items.slice(0, 3);
  return (
    <li
      className="group relative focus-within:z-20 min-w-0 flex flex-col rounded-xl border border-border bg-surface hover:border-border-strong hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20 transition duration-200 animate-slide-up motion-reduce:animate-none motion-reduce:hover:translate-y-0"
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms`, animationFillMode: "backwards" }}
    >
      <div className="flex items-start gap-3 px-5 pt-5">
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-semibold text-fg truncate">
            <button type="button" onClick={onPreview} className="text-left hover:text-secondary-soft focus-visible:outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-secondary/60">
              {item.title}
            </button>
          </h3>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-[13px] text-subtle">
            {item.roleArea && <span className="inline-flex items-center h-5 px-1.5 rounded-md bg-panel text-muted text-xs">{item.roleArea}</span>}
            <span>{plural(s.count, "question")}</span>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3" aria-hidden /> {item.minutes} min
            </span>
          </p>
        </div>
        <TechStack techs={s.techs} />
      </div>

      <p className="px-5 mt-3 text-[13px] text-muted line-clamp-2 min-h-[2.5em]">{item.brief}</p>

      <ol className="mx-5 mt-3 flex flex-col gap-1.5 rounded-lg bg-bg/50 border border-border px-3 py-2.5">
        {peek.map((it, n) => (
          <li key={n} className="flex items-baseline gap-2 text-[13px] min-w-0">
            <span className="text-xs text-subtle tabular-nums w-3.5 shrink-0">{n + 1}</span>
            <span className="truncate text-fg/90">{it.q}</span>
          </li>
        ))}
        {item.items.length > peek.length && <li className="text-xs text-subtle pl-5">and {plural(item.items.length - peek.length, "more question")}</li>}
      </ol>

      <CoverageBar answered={s.answered} count={s.count} className="px-5 mt-3.5" />

      <div className="relative z-10 flex items-center gap-2 px-5 py-3 mt-4 border-t border-border">
        <span className="text-xs text-subtle flex-1 min-w-0 truncate">
          {item.uses ? <span className="text-muted">Used in {plural(item.uses, "screening")}</span> : "Not used yet"} · updated {fmtDate(item.updatedAt)}
        </span>
        {canManage && (
          <Btn variant="quiet" icon={Pencil} onClick={onEdit} className="hidden sm:inline-flex">
            Edit
          </Btn>
        )}
        {aiScreening && canManage && (
          <Btn icon={Bot} href={`/w/${slug}/ai-interviews/new?add=${item.id}`}>
            Use
          </Btn>
        )}
        <Menu
          align="right"
          width={200}
          label={`Actions for ${item.title}`}
          trigger={(p) => (
            <button type="button" {...p} aria-label={`More actions for ${item.title}`} className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-muted hover:text-fg hover:bg-panel">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          )}
        >
          {(close) => (
            <>
              <MenuItem onClick={() => (close(), onPreview())}>
                <Eye className="w-3.5 h-3.5 text-muted" /> Preview
              </MenuItem>
              {canManage && (
                <>
                  <MenuItem onClick={() => (close(), onEdit())}>
                    <Pencil className="w-3.5 h-3.5 text-muted" /> Edit
                  </MenuItem>
                  <MenuItem disabled={busy} onClick={() => (close(), onDuplicate())}>
                    <Copy className="w-3.5 h-3.5 text-muted" /> Duplicate
                  </MenuItem>
                  <div className="h-px bg-border my-1 mx-1" />
                  <MenuItem danger onClick={() => (close(), onDelete())}>
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </MenuItem>
                </>
              )}
            </>
          )}
        </Menu>
      </div>
    </li>
  );
}

/** Read-only side panel: the brief as the candidate sees it, then every question with its answer. */
function PreviewPanel({
  slug,
  item,
  canManage,
  aiScreening,
  busy,
  onClose,
  onEdit,
  onDuplicate,
}: {
  slug: string;
  item: Questionnaire;
  canManage: boolean;
  aiScreening: boolean;
  busy: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
}) {
  const s = questionnaireStats(item.items);
  const [open, setOpen] = useState<Set<number>>(() => new Set());
  const panel = useRef<HTMLElement>(null);
  const allOpen = s.answered > 0 && open.size >= item.items.filter((i) => i.a).length;

  useEffect(() => {
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector("[role=dialog][aria-modal=true], [role=menu]")) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-bg/50 animate-[fadeIn_160ms_ease-out] motion-reduce:animate-none" onClick={onClose} aria-hidden />
      <aside
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-label={item.title}
        className="fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[560px] bg-surface border-l border-border-strong shadow-2xl shadow-black/40 flex flex-col outline-none animate-[drawerIn_200ms_cubic-bezier(0.22,1,0.36,1)] motion-reduce:animate-none"
      >
        <header className="flex items-start gap-3 px-6 pt-5 pb-4 border-b border-border">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-fg">{item.title}</h2>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-[13px] text-subtle">
              {item.roleArea && <span className="inline-flex items-center h-5 px-1.5 rounded-md bg-panel text-muted text-xs">{item.roleArea}</span>}
              <span>{plural(s.count, "question")}</span>
              <span aria-hidden>·</span>
              <span>{item.minutes} min</span>
              <span aria-hidden>·</span>
              <span>{item.uses ? `used in ${plural(item.uses, "screening")}` : "not used yet"}</span>
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-fg hover:bg-panel">
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
          <section className="rounded-xl border border-border bg-bg/50 p-4">
            <p className="text-xs font-medium text-subtle mb-1.5">What the candidate reads first</p>
            <p className="text-sm text-fg leading-relaxed">{item.brief}</p>
          </section>

          <section className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-fg flex-1">Questions, in the order they are asked</h3>
              {s.answered > 0 && (
                <button
                  type="button"
                  onClick={() => setOpen(allOpen ? new Set() : new Set(item.items.map((_, n) => n)))}
                  className="text-xs text-secondary-soft hover:underline"
                >
                  {allOpen ? "Hide answers" : "Show all answers"}
                </button>
              )}
            </div>
            <CoverageBar answered={s.answered} count={s.count} />
            <ol className="flex flex-col gap-2 mt-1">
              {item.items.map((it, n) => {
                const isOpen = open.has(n);
                return (
                  <li key={n} className="rounded-xl border border-border bg-surface">
                    <div className="flex gap-3 px-3.5 py-3">
                      <span className="w-6 h-6 rounded-md bg-panel text-xs font-semibold text-fg inline-flex items-center justify-center shrink-0 tabular-nums">{n + 1}</span>
                      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                        <p className="text-sm text-fg leading-relaxed">{it.q}</p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-subtle">
                          {it.src ? (
                            <span className="inline-flex items-center gap-1.5">
                              {it.tech && <TopicLogo slug={it.tech} size={12} />}
                              {it.tech ? techLabel(it.tech) : "Question bank"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              <PenLine className="w-3 h-3" aria-hidden /> Written by your team
                            </span>
                          )}
                          <DifficultyChip value={it.difficulty} />
                          {it.a ? (
                            <button
                              type="button"
                              aria-expanded={isOpen}
                              onClick={() =>
                                setOpen((o) => {
                                  const next = new Set(o);
                                  if (next.has(n)) next.delete(n);
                                  else next.add(n);
                                  return next;
                                })
                              }
                              className="inline-flex items-center gap-1 text-secondary-soft hover:underline"
                            >
                              Reference answer
                              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden />
                            </button>
                          ) : (
                            <span className="text-warning">No reference answer</span>
                          )}
                        </div>
                        {isOpen && it.a && <p className="mt-1 rounded-lg bg-bg/60 border border-border px-3 py-2.5 text-[13px] text-muted leading-relaxed whitespace-pre-wrap">{it.a}</p>}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
            <p className="flex items-center gap-1.5 text-xs text-subtle mt-1">
              <Lock className="w-3 h-3" aria-hidden /> Only your team and the grader see reference answers. The AI interviewer asks the questions without them.
            </p>
          </section>
        </div>

        <footer className="flex flex-wrap items-center gap-2 px-6 py-4 border-t border-border">
          {canManage && (
            <Btn size="md" icon={Pencil} onClick={onEdit}>
              Edit
            </Btn>
          )}
          {canManage && (
            <Btn size="md" variant="quiet" icon={Copy} disabled={busy} onClick={onDuplicate}>
              Duplicate
            </Btn>
          )}
          <span className="flex-1" />
          {aiScreening && canManage && (
            <Btn size="md" variant="primary" icon={Bot} href={`/w/${slug}/ai-interviews/new?add=${item.id}`}>
              Use in AI screening
            </Btn>
          )}
        </footer>
      </aside>
    </>
  );
}

function EmptyState({ canManage, bankTotal, onNew, onBrowse }: { canManage: boolean; bankTotal: number; onNew: () => void; onBrowse: () => void }) {
  const Option = ({ icon: Icon, title, body, onClick }: { icon: typeof ListChecks; title: string; body: string; onClick: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      className="group flex-1 min-w-[240px] text-left rounded-xl border border-border bg-surface p-5 flex flex-col gap-2 hover:border-secondary/50 hover:bg-secondary/[0.04] transition"
    >
      <span className="w-10 h-10 rounded-xl bg-secondary/10 ring-1 ring-inset ring-secondary/25 flex items-center justify-center text-secondary-soft group-hover:scale-105 transition-transform">
        <Icon className="w-5 h-5" aria-hidden />
      </span>
      <span className="text-[15px] font-semibold text-fg mt-1">{title}</span>
      <span className="text-[13px] text-muted">{body}</span>
    </button>
  );
  return (
    <div className="rounded-2xl border border-dashed border-border-strong p-8 flex flex-col items-center text-center gap-5">
      <div className="flex flex-col gap-1 max-w-lg">
        <p className="text-lg font-semibold text-fg">No questionnaires yet</p>
        <p className="text-sm text-muted">
          A questionnaire is a short list of spoken questions with optional reference answers. The AI interviewer asks them in AI screening, and your team can use them as an
          interview guide.
        </p>
      </div>
      {canManage && (
        <div className="flex flex-wrap gap-3 w-full max-w-2xl">
          <Option icon={PenLine} title="Write your own" body="Start from a blank questionnaire, or paste a list of questions you already use." onClick={onNew} />
          {bankTotal > 0 && (
            <Option icon={BookOpen} title="Start from the question bank" body={`Pick from ${bankTotal.toLocaleString("en")} checked questions. Their answers come along.`} onClick={onBrowse} />
          )}
        </div>
      )}
    </div>
  );
}
