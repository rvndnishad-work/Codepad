"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  Bot,
  CalendarDays,
  CircleArrowRight,
  CircleCheck,
  FileCode2,
  Layers,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  Send,
  Star,
  Tag,
  Trash2,
  UserRound,
  X,
  Zap,
} from "lucide-react";
import {
  INTERVIEW_PASS_RATING,
  RESULT_KIND_LABELS,
  RESULT_WEIGHTS,
  rubricToScore,
  screeningChecklist,
  TAKE_HOME_PASS,
  type CandidateResult,
  type ResultKind,
} from "@/lib/crm/results";
import { SCREENING_PASS_THRESHOLD } from "@/lib/ai-interview/verdict";
import type { ActivityItem } from "@/lib/crm/activity";
import { passOverrides, type RosterBatch, type RosterMember, type RosterRow } from "@/lib/crm/roster";
import { PIPELINE_STAGES, STAGE_LABELS, type RejectReason } from "@/lib/crm/stages";
import { plural, relativeTime, sourceLabel } from "@/lib/workspace/display";
import {
  addNoteAction,
  bulkCandidatesAction,
  deleteNoteAction,
  updateCandidateAction,
} from "../manage-actions";
import { ConfirmDialog, PassOverrideDialog, RejectDialog } from "../_components/dialogs";
import { ChecklistRow } from "../_components/Checklist";
import type { Perms } from "../_components/CandidatesView";
import { Avatar, Btn, Field, fmtDate, inputCls, Menu, MenuItem, MenuLabel, StageChip, StageDot, stageLabel, useToasts } from "../_components/ui";

type Note = { id: string; body: string; createdAt: string; authorId: string | null; authorName: string | null };

const ICON: Record<ActivityItem["kind"], typeof Mail> = {
  move: CircleArrowRight,
  note: MessageSquare,
  edit: Pencil,
  batch: Layers,
  result: FileCode2,
  sent: Send,
  archive: Archive,
  created: Plus,
};

export default function CandidateProfileClient({
  slug,
  meId,
  row,
  rejectNote,
  decidedBy,
  notes,
  activity,
  batches,
  members,
  perms,
}: {
  slug: string;
  meId: string;
  row: RosterRow;
  rejectNote: string | null;
  /** Who made the current Passed or Not passed decision, when known. */
  decidedBy: string | null;
  notes: Note[];
  activity: ActivityItem[];
  batches: RosterBatch[];
  members: RosterMember[];
  perms: Perms;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"overview" | "activity" | "notes">("overview");
  const [busy, start] = useTransition();
  const [toasts, toast] = useToasts();
  const [rejecting, setRejecting] = useState(false);
  const [confirmPass, setConfirmPass] = useState(false);
  const [confirm, setConfirm] = useState<null | "archive" | "erase">(null);
  const [editing, setEditing] = useState(false);
  const [addingTag, setAddingTag] = useState(false);
  const [tagText, setTagText] = useState("");

  const batch = batches.find((b) => b.id === row.batchId) ?? null;
  const owner = members.find((m) => m.id === row.ownerId) ?? null;
  const archived = row.status === "archived";
  const checklist = useMemo(() => screeningChecklist(row.results), [row.results]);
  const isClosed = row.stage === "PASSED" || row.stage === "REJECTED";
  const sortedResults = [...row.results].sort((a, b) => +new Date(b.finishedAt ?? b.sentAt) - +new Date(a.finishedAt ?? a.sentAt));

  // Passing over results below the bar is a manual override; confirm it.
  const passOverride = useMemo(() => passOverrides([row]), [row]);

  function act(p: Promise<{ ok: boolean; error?: string; needsOverride?: string[] }>, done: string, after?: () => void) {
    start(async () => {
      const r = await p;
      if (!r.ok) {
        // Results changed since the page loaded: confirm the override first.
        if (r.needsOverride?.length) {
          setConfirmPass(true);
          return;
        }
        toast(r.error ?? "Something went wrong.", "error");
        return;
      }
      toast(done);
      after?.();
      router.refresh();
    });
  }

  const move = (stage: string, override?: boolean) => {
    if (stage === "REJECTED") return setRejecting(true);
    if (stage === "PASSED" && passOverride.length && !override) return setConfirmPass(true);
    act(
      bulkCandidatesAction(slug, [row.id], { action: "stage", stage, ...(override ? { override } : {}) }),
      stage === "PASSED" ? (override ? "Passed as a manual override" : "Passed") : `Moved to ${stageLabel(stage)}`,
    );
  };

  const flag = (status: "future_hire" | "do_not_hire" | "active") =>
    act(
      updateCandidateAction(slug, row.id, { status }),
      status === "active" ? "Flag cleared" : status === "future_hire" ? "Marked as a future hire" : "Marked as do not hire",
    );

  function saveTags(tags: string[]) {
    act(updateCandidateAction(slug, row.id, { tags }), "Tags saved", () => {
      setTagText("");
      setAddingTag(false);
    });
  }

  const scheduleHref = `/w/${slug}/interviews/new?candidateId=${row.id}`;
  const takeHomeHref = `/w/${slug}/take-homes/new?candidates=${row.id}`;
  const aiInterviewHref = `/w/${slug}/ai-interviews/new?candidates=${row.id}`;

  return (
    <div className="flex flex-col gap-5">
      <Link href={`/w/${slug}/candidates`} className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-fg w-fit">
        <ArrowLeft className="w-3.5 h-3.5" aria-hidden />
        All candidates
      </Link>

      {archived && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-panel/60 px-4 py-3 text-[13px] text-muted">
          <Archive className="w-4 h-4" aria-hidden />
          Archived. This person is hidden from lists and the board.
          {perms.canDelete && (
            <Btn className="ml-auto" onClick={() => act(bulkCandidatesAction(slug, [row.id], { action: "restore" }), "Restored")}>
              Restore
            </Btn>
          )}
        </div>
      )}
      {row.status === "do_not_hire" && (
        <div className="flex items-center gap-3 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-[13px] text-danger">
          <Zap className="w-4 h-4" aria-hidden />
          Flagged as do not hire. Check with the team before moving them forward.
        </div>
      )}
      {row.status === "future_hire" && (
        <div className="flex items-center gap-3 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-[13px] text-warning">
          <Star className="w-4 h-4" aria-hidden />
          Marked as a future hire. Worth a call when a matching role opens.
        </div>
      )}

      {/* Header, on a band tinted by the stage: indigo while screening, then the decision colour. */}
      <div
        className="relative overflow-hidden rounded-2xl border border-border bg-surface px-5 py-5 md:px-6 flex flex-col lg:flex-row lg:items-start justify-between gap-5 animate-slide-up motion-reduce:animate-none"
        style={{
          backgroundImage: `radial-gradient(520px 220px at 0% 0%, rgb(var(${
            row.stage === "PASSED" ? (row.manualPass ? "--c-warning" : "--c-success") : row.stage === "REJECTED" ? "--c-danger" : "--c-accent-2"
          }) / 0.18), transparent 70%)`,
        }}
      >
        <div className="flex gap-4 items-start min-w-0">
          <span className="rounded-full ring-2 ring-offset-2 ring-offset-surface ring-secondary/40 shrink-0">
            <Avatar name={row.name} size={64} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[26px] font-semibold tracking-tight text-fg">{row.name}</h1>
              <StageChip stage={row.stage} />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2 text-[13px] text-muted">
              {row.email && (
                <a href={`mailto:${row.email}`} className="inline-flex items-center gap-1.5 hover:text-fg">
                  <Mail className="w-3.5 h-3.5 text-subtle" aria-hidden />
                  {row.email}
                </a>
              )}
              {row.phone && (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-subtle" aria-hidden />
                  {row.phone}
                </span>
              )}
              {batch && (
                <Link href={`/w/${slug}/batches/${batch.id}`} className="inline-flex items-center gap-1.5 hover:text-fg">
                  <Layers className="w-3.5 h-3.5 text-subtle" aria-hidden />
                  {batch.name}
                </Link>
              )}
              <span className="inline-flex items-center gap-1.5">
                <UserRound className="w-3.5 h-3.5 text-subtle" aria-hidden />
                {owner ? `Owner: ${owner.name}` : "No owner"}
              </span>
              <span>Source: {sourceLabel(row.source)}</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-3">
              {row.tags.map((t) => (
                <span key={t} className="group inline-flex items-center gap-1 h-6 pl-2 pr-1 rounded-md border border-border text-xs text-muted">
                  {t}
                  {perms.canWrite && (
                    <button
                      type="button"
                      aria-label={`Remove tag ${t}`}
                      onClick={() => saveTags(row.tags.filter((x) => x !== t))}
                      className="w-4 h-4 rounded flex items-center justify-center text-subtle hover:text-fg"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </span>
              ))}
              {perms.canWrite &&
                (addingTag ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const add = tagText.split(/[,;]/).map((t) => t.trim()).filter(Boolean);
                      if (add.length) saveTags([...row.tags, ...add]);
                    }}
                    className="flex items-center gap-1"
                  >
                    <input
                      autoFocus
                      value={tagText}
                      onChange={(e) => setTagText(e.target.value)}
                      onBlur={() => !tagText && setAddingTag(false)}
                      placeholder="New tag"
                      aria-label="New tag"
                      className={`${inputCls} h-6 w-32 px-2 text-xs`}
                    />
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAddingTag(true)}
                    className="inline-flex items-center gap-1 h-6 px-2 rounded-md border border-dashed border-border-strong text-xs text-subtle hover:text-fg"
                  >
                    <Tag className="w-3 h-3" aria-hidden />
                    Add tag
                  </button>
                ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          {!isClosed && !archived && (
            <>
              <Menu
                align="right"
                width={220}
                label="Send an assessment"
                trigger={(p) => (
                  <Btn size="md" icon={Send} {...p}>
                    Send
                  </Btn>
                )}
              >
                {() => (
                  <>
                    <MenuItem href={aiInterviewHref}>
                      <Bot className="w-3.5 h-3.5 text-subtle" />
                      AI screening
                    </MenuItem>
                    <MenuItem href={takeHomeHref}>
                      <FileCode2 className="w-3.5 h-3.5 text-subtle" />
                      Take-home
                    </MenuItem>
                    <MenuItem href={scheduleHref}>
                      <CalendarDays className="w-3.5 h-3.5 text-subtle" />
                      Schedule interview
                    </MenuItem>
                  </>
                )}
              </Menu>
              {perms.canPipeline && (
                <Btn size="md" variant="danger" onClick={() => setRejecting(true)} disabled={busy}>
                  Not passed
                </Btn>
              )}
              {perms.canPipeline && (
                <Btn size="md" variant={passOverride.length ? "ghost" : "primary"} icon={CircleCheck} onClick={() => move("PASSED")} disabled={busy}>
                  Pass
                </Btn>
              )}
            </>
          )}
          <Menu
            align="right"
            width={240}
            label="More actions"
            trigger={(p) => (
              <button type="button" {...p} aria-label="More actions" className="w-9 h-9 rounded-lg border border-border bg-surface text-muted hover:text-fg hover:bg-panel flex items-center justify-center">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            )}
          >
            {(close) => (
              <>
                {perms.canWrite && (
                  <MenuItem onClick={() => (setEditing(true), setTab("overview"), close())}>
                    <Pencil className="w-3.5 h-3.5 text-subtle" />
                    Edit details
                  </MenuItem>
                )}
                {perms.canPipeline && (
                  <>
                    <MenuLabel>{isClosed ? "Change decision" : "Move to stage"}</MenuLabel>
                    {PIPELINE_STAGES.filter((s) => s !== row.stage).map((s) => (
                      <MenuItem key={s} danger={s === "REJECTED"} onClick={() => (move(s), close())}>
                        <StageDot stage={s} />
                        {STAGE_LABELS[s]}
                      </MenuItem>
                    ))}
                  </>
                )}
                {perms.canWrite && (
                  <>
                    <MenuLabel>Flag</MenuLabel>
                    {row.status !== "future_hire" && (
                      <MenuItem onClick={() => (flag("future_hire"), close())}>
                        <Star className="w-3.5 h-3.5 text-subtle" />
                        Future hire
                      </MenuItem>
                    )}
                    {row.status !== "do_not_hire" && (
                      <MenuItem onClick={() => (flag("do_not_hire"), close())}>
                        <Zap className="w-3.5 h-3.5 text-subtle" />
                        Do not hire
                      </MenuItem>
                    )}
                    {(row.status === "future_hire" || row.status === "do_not_hire") && (
                      <MenuItem onClick={() => (flag("active"), close())}>Clear flag</MenuItem>
                    )}
                  </>
                )}
                {perms.canDelete && (
                  <div className="border-t border-border mt-1 pt-1">
                    <MenuItem onClick={() => (archived ? act(bulkCandidatesAction(slug, [row.id], { action: "restore" }), "Restored") : setConfirm("archive"), close())}>
                      <Archive className="w-3.5 h-3.5 text-subtle" />
                      {archived ? "Restore" : "Archive"}
                    </MenuItem>
                    {perms.isManager && (
                      <MenuItem danger onClick={() => (setConfirm("erase"), close())}>
                        <Trash2 className="w-3.5 h-3.5" />
                        Erase permanently
                      </MenuItem>
                    )}
                  </div>
                )}
              </>
            )}
          </Menu>
        </div>
      </div>

      <section className="rounded-xl border border-border bg-surface px-5 py-4">
        <ChecklistRow items={checklist} decision={{ stage: row.stage, at: row.stageChangedAt, reason: row.rejectReason, by: decidedBy }} />
        {row.stage === "REJECTED" && rejectNote && <p className="mt-3 text-[13px] text-muted">&ldquo;{rejectNote}&rdquo;</p>}
      </section>

      <div role="tablist" aria-label="Candidate sections" className="flex gap-6 border-b border-border">
        {(
          [
            ["overview", "Overview"],
            ["activity", "Activity"],
            ["notes", `Notes ${notes.length}`],
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

      {tab === "overview" && (
        <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-6 items-start">
          <div className="flex flex-col gap-5 min-w-0">
            {!isClosed && !archived && (
              <div
                className={`rounded-xl border px-4 py-3.5 flex flex-wrap items-center gap-3.5 ${
                  row.next.tone === "danger" ? "border-danger/30 bg-danger/10" : row.next.tone === "warning" ? "border-warning/30 bg-warning/10" : "border-border bg-surface"
                }`}
              >
                <Zap className={`w-[18px] h-[18px] ${row.next.tone === "danger" ? "text-danger" : row.next.tone === "warning" ? "text-warning" : "text-secondary-soft"}`} aria-hidden />
                <div className="flex-1 min-w-[200px]">
                  <div className="text-sm font-semibold text-fg">Next step: {row.next.label.charAt(0).toLowerCase() + row.next.label.slice(1)}</div>
                  <div className="text-[13px] text-muted mt-0.5">
                    {row.next.detail ? `${row.next.detail}. ` : ""}
                    {row.daysInStage >= 7 ? `In ${stageLabel(row.stage)} for ${plural(row.daysInStage, "day")}.` : ""}
                  </div>
                </div>
                {row.next.href ? (
                  <Btn variant="primary" href={row.next.href}>
                    Open
                  </Btn>
                ) : row.next.label === "Send an assessment" ? (
                  <Btn variant="primary" href={takeHomeHref}>
                    Send take-home
                  </Btn>
                ) : row.next.label === "Make a decision" && perms.canPipeline ? (
                  <>
                    <Btn variant="danger" onClick={() => setRejecting(true)} disabled={busy}>
                      Not passed
                    </Btn>
                    <Btn variant={passOverride.length ? "ghost" : "primary"} icon={CircleCheck} onClick={() => move("PASSED")} disabled={busy}>
                      Pass
                    </Btn>
                  </>
                ) : null}
              </div>
            )}

            <ResultsGrid results={sortedResults} combined={row.combined} />

            <section className="rounded-xl border border-border bg-surface">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h2 className="text-[15px] font-semibold text-fg">Recent activity</h2>
                {activity.length > 5 && (
                  <button type="button" onClick={() => setTab("activity")} className="text-[13px] font-medium text-secondary-soft hover:underline">
                    View all {activity.length}
                  </button>
                )}
              </div>
              <Timeline items={activity.slice(0, 5)} />
            </section>
          </div>

          <div className="flex flex-col gap-5">
            <NotesCard slug={slug} candidateId={row.id} notes={notes.slice(0, 3)} canWrite={perms.canWrite} meId={meId} isManager={perms.isManager} compact onAll={() => setTab("notes")} total={notes.length} />
            <DetailsCard
              slug={slug}
              row={row}
              batches={batches}
              members={members}
              editing={editing}
              setEditing={setEditing}
              canWrite={perms.canWrite}
              onSaved={() => toast("Details saved")}
            />
          </div>
        </div>
      )}

      {tab === "activity" && (
        <section className="rounded-xl border border-border bg-surface">
          <Timeline items={activity} />
        </section>
      )}

      {tab === "notes" && (
        <div className="max-w-2xl">
          <NotesCard slug={slug} candidateId={row.id} notes={notes} canWrite={perms.canWrite} meId={meId} isManager={perms.isManager} total={notes.length} />
        </div>
      )}

      {rejecting && (
        <RejectDialog
          names={[row.name]}
          busy={busy}
          onCancel={() => setRejecting(false)}
          onConfirm={(reason: RejectReason, note) => {
            setRejecting(false);
            act(
              bulkCandidatesAction(slug, [row.id], { action: "stage", stage: "REJECTED", rejectReason: reason, rejectReasonNote: note }),
              "Marked as not passed",
            );
          }}
        />
      )}
      {confirmPass && (
        <PassOverrideDialog
          people={passOverrides([{ ...row, stage: "SCREENING" }])}
          total={1}
          busy={busy}
          onCancel={() => setConfirmPass(false)}
          onConfirm={() => {
            setConfirmPass(false);
            move("PASSED", true);
          }}
        />
      )}
      {confirm === "archive" && (
        <ConfirmDialog
          title={`Archive ${row.name}?`}
          body="They leave the list and the board but keep their history, notes and results. You can restore them at any time."
          confirmLabel="Archive"
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            setConfirm(null);
            act(bulkCandidatesAction(slug, [row.id], { action: "archive" }), "Archived");
          }}
        />
      )}
      {confirm === "erase" && (
        <ConfirmDialog
          title={`Erase ${row.name} for good?`}
          body="This removes them and their notes permanently and replaces their name on past assessments with Erased candidate. This cannot be undone."
          confirmLabel="Erase"
          danger
          requireText="erase"
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            setConfirm(null);
            start(async () => {
              const r = await bulkCandidatesAction(slug, [row.id], { action: "erase" });
              if (!r.ok) toast(r.error, "error");
              else router.push(`/w/${slug}/candidates`);
            });
          }}
        />
      )}
      {toasts}
    </div>
  );
}

function ResultsGrid({ results, combined }: { results: CandidateResult[]; combined: number | null }) {
  // The checklist above already says what has not been sent.
  if (!results.length) return null;
  return (
    <section className="rounded-xl border border-border bg-surface overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-4 border-b border-border">
        <h2 className="text-[15px] font-semibold text-fg">
          Results <span className="ml-1 text-[13px] font-normal text-subtle tabular-nums">{results.length}</span>
        </h2>
        {combined != null && (
          <span className="inline-flex items-center gap-2 text-[13px] text-muted">
            <span className="inline-flex items-baseline gap-1 h-7 px-2.5 rounded-lg bg-secondary/15 text-secondary-soft">
              Combined <span className="font-semibold tabular-nums text-fg">{combined}</span>
            </span>
            <span className="text-subtle">
              Screening {RESULT_WEIGHTS.ai_screening * 100}%, take-home {RESULT_WEIGHTS.take_home * 100}%, interview {RESULT_WEIGHTS.interview * 100}%
            </span>
          </span>
        )}
      </div>
      <ol className="divide-y divide-border">
        {results.map((r, i) => (
          <ResultRow key={r.id} r={r} index={i} />
        ))}
      </ol>
    </section>
  );
}

const KIND_ICON: Record<ResultKind, typeof Bot> = { take_home: FileCode2, ai_screening: Bot, interview: CalendarDays };
/** Where each kind clears the bar, on the 0 to 100 scale the bar draws. */
const PASS_MARK: Record<ResultKind, number> = {
  ai_screening: SCREENING_PASS_THRESHOLD,
  take_home: TAKE_HOME_PASS,
  interview: rubricToScore(INTERVIEW_PASS_RATING),
};

function resultState(r: CandidateResult): string | null {
  if (r.state === "scored") return null;
  if (r.state === "submitted") return r.kind === "interview" ? "Waiting for feedback" : "Submitted, not scored yet";
  if (r.state === "in_progress") return "In progress";
  if (r.state === "expired") return "Expired";
  if (r.kind === "interview") return r.scheduledAt ? `Booked for ${fmtDate(r.scheduledAt)}` : "Booked";
  return "Sent, not started";
}

function ResultRow({ r, index }: { r: CandidateResult; index: number }) {
  const Icon = KIND_ICON[r.kind];
  const state = resultState(r);
  // Colour follows the verdict: green clears the bar, amber is below it, indigo is still open.
  const tone = r.passed ? "success" : r.passed === false ? "warning" : r.state === "expired" ? "danger" : "secondary";
  const tile = {
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
    danger: "bg-danger/15 text-danger",
    secondary: "bg-secondary/15 text-secondary-soft",
  }[tone];
  const bar = { success: "bg-success", warning: "bg-warning", danger: "bg-danger", secondary: "bg-secondary" }[tone];
  const link = r.kind === "ai_screening" ? "Read transcript" : r.kind === "interview" ? "Open interview" : r.state === "scored" || r.state === "submitted" ? "Open submission" : "Open";
  return (
    <li
      className="group relative grid grid-cols-[40px_minmax(0,1fr)] md:grid-cols-[40px_minmax(0,1fr)_180px_156px] items-center gap-x-4 gap-y-3 px-5 py-4 transition-colors hover:bg-panel/40 animate-slide-up motion-reduce:animate-none"
      style={{ animationDelay: `${Math.min(index, 8) * 50}ms`, animationFillMode: "backwards" }}
    >
      <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${tile}`}>
        <Icon className="w-[18px] h-[18px]" aria-hidden />
      </span>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-subtle">{RESULT_KIND_LABELS[r.kind]}</span>
          {r.verdict && (
            <span
              className={`inline-flex items-center h-5 px-1.5 rounded-md text-xs font-medium ${
                r.passed ? "bg-success/15 text-success" : r.passed === false ? "bg-warning/15 text-warning" : "bg-panel text-muted"
              }`}
            >
              {r.verdict}
            </span>
          )}
        </div>
        <div className="text-[15px] font-semibold text-fg mt-0.5 truncate" title={r.title}>
          {r.title}
        </div>
        <div className="text-xs text-subtle flex flex-wrap gap-x-3 gap-y-1 mt-1">
          <span>Sent {fmtDate(r.sentAt)}</span>
          {r.finishedAt && <span>Finished {fmtDate(r.finishedAt)}</span>}
          {r.minutesTaken != null && (
            <span>
              {r.minutesTaken}
              {r.minutesAllowed ? ` of ${r.minutesAllowed}` : ""} min
            </span>
          )}
          {r.deadlineAt && !r.finishedAt && <span>Due {fmtDate(r.deadlineAt)}</span>}
        </div>
      </div>

      <div className="col-start-2 md:col-start-auto min-w-0">
        {r.score != null ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[26px] leading-none font-semibold tracking-tight text-fg tabular-nums">
                {r.kind === "interview" && r.rating != null ? r.rating.toFixed(1) : r.score}
              </span>
              <span className="text-[13px] text-subtle">{r.kind === "interview" && r.rating != null ? "/ 5" : "/ 100"}</span>
              <span className="ml-auto text-xs text-subtle tabular-nums">
                Bar {r.kind === "interview" && r.rating != null ? INTERVIEW_PASS_RATING : (r.passMark ?? PASS_MARK[r.kind])}
              </span>
            </div>
            <div className="relative h-1.5 rounded-full bg-panel" aria-hidden>
              <div
                className={`h-1.5 rounded-full origin-left animate-rule-in motion-reduce:animate-none ${bar}`}
                style={{ width: `${Math.max(2, Math.min(100, r.score))}%`, animationDelay: `${150 + Math.min(index, 8) * 50}ms` }}
              />
              <span className="absolute -top-1 bottom-[-4px] w-px bg-fg/40" style={{ left: `${r.passMark ?? PASS_MARK[r.kind]}%` }} title="Pass mark" />
            </div>
          </div>
        ) : (
          <div className={`flex items-center gap-2 text-[13px] whitespace-nowrap ${r.state === "expired" ? "text-danger" : r.state === "submitted" ? "text-warning" : "text-muted"}`}>
            <span className={`w-1.5 h-1.5 shrink-0 rounded-full ${r.state === "expired" ? "bg-danger" : r.state === "submitted" ? "bg-warning" : "bg-secondary"} ${r.state === "in_progress" ? "animate-pulse motion-reduce:animate-none" : ""}`} />
            {state}
          </div>
        )}
      </div>

      <div className="col-start-2 md:col-start-auto md:justify-self-end">
        {r.href && (
          <a
            href={r.href}
            className="inline-flex items-center gap-1 h-8 px-3 rounded-lg border border-border text-[13px] font-medium text-fg hover:bg-panel hover:border-border-strong transition-colors whitespace-nowrap"
          >
            {link}
            <ArrowRight className="w-3.5 h-3.5 text-subtle transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden />
          </a>
        )}
      </div>
    </li>
  );
}

function Timeline({ items }: { items: ActivityItem[] }) {
  if (!items.length) return <p className="px-5 py-8 text-[13px] text-subtle text-center">Nothing has happened yet.</p>;
  return (
    <ol className="px-5 py-2">
      {items.map((e) => {
        const Icon = ICON[e.kind];
        const inner = (
          <>
            <span className="w-[30px] h-[30px] shrink-0 rounded-lg bg-panel flex items-center justify-center text-muted">
              <Icon className="w-[15px] h-[15px]" aria-hidden />
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-fg">{e.title}</div>
              {e.detail && <div className="text-[13px] text-subtle mt-0.5">{e.detail}</div>}
            </div>
            <time dateTime={e.at} title={new Date(e.at).toLocaleString("en-GB")} className="text-xs text-subtle whitespace-nowrap">
              {relativeTime(e.at)}
            </time>
          </>
        );
        return (
          <li key={e.id}>
            {e.href ? (
              <a href={e.href} className="flex gap-3.5 py-2.5 hover:bg-panel/40 -mx-2 px-2 rounded-lg">
                {inner}
              </a>
            ) : (
              <div className="flex gap-3.5 py-2.5">{inner}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function NotesCard({
  slug,
  candidateId,
  notes,
  canWrite,
  meId,
  isManager,
  compact,
  total,
  onAll,
}: {
  slug: string;
  candidateId: string;
  notes: Note[];
  canWrite: boolean;
  meId: string;
  isManager: boolean;
  compact?: boolean;
  total: number;
  onAll?: () => void;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  function save() {
    start(async () => {
      const r = await addNoteAction(slug, candidateId, text);
      if (!r.ok) setError(r.error);
      else {
        setText("");
        setError(null);
        router.refresh();
      }
    });
  }
  function remove(id: string) {
    start(async () => {
      const r = await deleteNoteAction(slug, id, candidateId);
      if (!r.ok) setError(r.error);
      else router.refresh();
    });
  }
  return (
    <section className="rounded-xl border border-border bg-surface">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h2 className="text-[15px] font-semibold text-fg">Notes</h2>
        {compact && total > notes.length && onAll && (
          <button type="button" onClick={onAll} className="text-[13px] font-medium text-secondary-soft hover:underline">
            All {total}
          </button>
        )}
      </div>
      <div className="px-5 py-4 flex flex-col gap-4">
        {canWrite && (
          <div className="flex flex-col gap-2">
            <Field label="Add a note for the team">
              <textarea
                rows={3}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="What did you notice?"
                className={`${inputCls} h-auto py-2 resize-none`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && text.trim()) save();
                }}
              />
            </Field>
            {text.trim() && (
              <div className="flex justify-end">
                <Btn variant="primary" onClick={save} disabled={busy}>
                  Save note
                </Btn>
              </div>
            )}
          </div>
        )}
        {error && <p className="text-xs text-danger">{error}</p>}
        {notes.length === 0 && <p className="text-[13px] text-subtle">No notes yet.</p>}
        {notes.map((n) => (
          <div key={n.id} className="group flex gap-2.5">
            <Avatar name={n.authorName ?? "Imported"} size={28} />
            <div className="min-w-0 flex-1">
              <div className="text-[13px] flex items-center gap-1">
                <span className="font-medium text-fg">{n.authorName ?? "Imported note"}</span>
                <span className="text-subtle">· {relativeTime(n.createdAt)}</span>
                {canWrite && (n.authorId === meId || isManager) && (
                  <button
                    type="button"
                    onClick={() => remove(n.id)}
                    aria-label="Delete note"
                    className="ml-auto opacity-0 group-hover:opacity-100 focus:opacity-100 w-6 h-6 rounded flex items-center justify-center text-subtle hover:text-danger"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <p className="mt-1 text-[13px] leading-relaxed text-muted whitespace-pre-wrap break-words">{n.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function DetailsCard({
  slug,
  row,
  batches,
  members,
  editing,
  setEditing,
  canWrite,
  onSaved,
}: {
  slug: string;
  row: RosterRow;
  batches: RosterBatch[];
  members: RosterMember[];
  editing: boolean;
  setEditing: (v: boolean) => void;
  canWrite: boolean;
  onSaved: () => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: row.name,
    email: row.email ?? "",
    phone: row.phone ?? "",
    source: row.source ?? "",
    batchId: row.batchId ?? "",
    ownerId: row.ownerId ?? "",
  });
  const [error, setError] = useState<{ text: string; existing?: { id: string; name: string } } | null>(null);
  const [busy, start] = useTransition();

  function save() {
    start(async () => {
      const r = await updateCandidateAction(slug, row.id, {
        name: form.name,
        email: form.email || null,
        phone: form.phone || null,
        source: form.source || null,
        batchId: form.batchId || null,
        ownerId: form.ownerId || null,
      });
      if (!r.ok) {
        setError({ text: r.error, existing: r.existing });
        return;
      }
      setError(null);
      setEditing(false);
      onSaved();
      router.refresh();
    });
  }

  const batch = batches.find((b) => b.id === row.batchId);
  const owner = members.find((m) => m.id === row.ownerId);
  return (
    <section className="rounded-xl border border-border bg-surface">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h2 className="text-[15px] font-semibold text-fg">Details</h2>
        {canWrite && !editing && (
          <Btn icon={Pencil} onClick={() => setEditing(true)}>
            Edit
          </Btn>
        )}
      </div>
      {editing ? (
        <div className="px-5 py-4 flex flex-col gap-3">
          <Field label="Name">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Email">
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} />
          </Field>
          {error?.existing && (
            <p className="text-[13px] text-warning">
              {error.existing.name} already uses that email.{" "}
              <Link href={`/w/${slug}/candidates/${error.existing.id}`} className="font-medium text-secondary-soft hover:underline">
                Open their profile
              </Link>
            </p>
          )}
          <Field label="Phone">
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Source">
            <input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Batch">
            <select value={form.batchId} onChange={(e) => setForm({ ...form, batchId: e.target.value })} className={inputCls}>
              <option value="">No batch</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                  {b.status === "CLOSED" ? " (closed)" : ""}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Owner">
            <select value={form.ownerId} onChange={(e) => setForm({ ...form, ownerId: e.target.value })} className={inputCls}>
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </Field>
          {error && !error.existing && <p className="text-[13px] text-danger">{error.text}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Btn onClick={() => (setEditing(false), setError(null))}>Cancel</Btn>
            <Btn variant="primary" onClick={save} disabled={busy || !form.name.trim()}>
              Save
            </Btn>
          </div>
        </div>
      ) : (
        <dl className="px-5 py-4 grid grid-cols-[100px_minmax(0,1fr)] gap-x-3 gap-y-2.5 text-[13px]">
          <dt className="text-subtle">Batch</dt>
          <dd className="text-fg truncate">{batch?.name ?? "None"}</dd>
          <dt className="text-subtle">Owner</dt>
          <dd className="text-fg truncate">{owner?.name ?? "Unassigned"}</dd>
          <dt className="text-subtle">Source</dt>
          <dd className="text-fg">{sourceLabel(row.source)}</dd>
          <dt className="text-subtle">Phone</dt>
          <dd className="text-fg">{row.phone ?? "Not set"}</dd>
          <dt className="text-subtle">Added</dt>
          <dd className="text-fg">{fmtDate(row.createdAt, true)}</dd>
          <dt className="text-subtle">Submitted</dt>
          <dd className="text-fg">{plural(row.results.filter((r) => r.state === "submitted" || r.state === "scored").length, "assessment")}</dd>
        </dl>
      )}
    </section>
  );
}
