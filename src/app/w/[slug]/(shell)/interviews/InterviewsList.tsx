"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Ban,
  CalendarCheck2,
  CalendarClock,
  CalendarPlus,
  ChevronDown,
  CalendarX2,
  CircleCheck,
  CircleX,
  ClipboardPen,
  Copy,
  EyeOff,
  FileText,
  Hourglass,
  Inbox,
  ListChecks,
  LogOut,
  Plus,
  Radio,
  Scale,
  Search,
  ShieldAlert,
  ThumbsDown,
  ThumbsUp,
  CircleHelp,
  Video,
} from "lucide-react";
import { humanize } from "@/lib/workspace/display";
import type { QuestionState } from "@/lib/interview/wizard";
import type { OutcomeGroup, OutcomeKey } from "@/lib/interview/list-outcome";
import { segmentOf, type RoundState, type Segment, type WaitingOn } from "@/lib/interview/rounds";
import type { NextRoundDue } from "@/lib/interview/rounds-server";
import { RoundTile } from "../candidates/_components/PlanEditor";
import { RoundStrip } from "../candidates/_components/RoundStrip";
import { Avatar, Btn, fmtDate, inputCls, useToasts } from "../candidates/_components/ui";

type Tone = "success" | "warning" | "danger" | "neutral";

export type InterviewRow = {
  id: string;
  title: string;
  candidateName: string | null;
  candidateId: string | null;
  type: string;
  state: "scheduled" | "live" | "completed" | "cancelled";
  /** Where this interview stands. Never the candidate's decision. */
  outcome: OutcomeKey;
  /** The filter it files under: finished interviews go by the candidate's decision. */
  group: OutcomeGroup;
  /** The candidate's own decision, as a small line under a finished interview. */
  candidateLine: { text: string; tone: "success" | "danger" | "muted" } | null;
  /** Where Decide goes: the round report's "What next?" or the candidate profile. */
  decideHref: string | null;
  /** Which round of the candidate's plan this is, when it is linked to one. */
  round: { number: number | null; total: number; name: string; strip: { seg: Segment; name: string; here: boolean }[] } | null;
  /** The interviewer's take from the End interview dialog. Never a pass on its own. */
  take: { label: string; tone: Tone } | null;
  scoring: {
    expected: number;
    submitted: number;
    /** Names of expected interviewers with no submitted scorecard. */
    missing: string[];
    /** The viewer is on the panel and has not submitted. */
    youOwe: boolean;
    /** Scored with the older end-of-room rubric. */
    rubric: boolean;
    /** Scores are hidden until the viewer submits their own card. */
    blind: boolean;
    score: { value: number; of: number; bar: number } | null;
    recs: { yes: number; unsure: number; no: number };
  };
  shortCode: string | null;
  /** Interviewer side (host and panel) or the report; null when neither applies. */
  href: string | null;
  candidateLink: string;
  minutes: number;
  /** Null while a scheduled interview has no time yet. */
  when: string | null;
  scheduledAt: string | null;
  interviewer: string | null;
  panel: string[];
  format: string | null;
  questions: QuestionState;
  questionsOwner: string | null;
  mineToPick: boolean;
};

/** One candidate's whole plan, for Group by candidate. */
export type PersonRounds = {
  planName: string | null;
  waitingOn: WaitingOn;
  rounds: { id: string; number: number | null; name: string; kind: string; format: string | null; state: RoundState; label: string; at: string | null; score: string | null; href: string | null }[];
};

type View = "all" | OutcomeGroup | "questions" | "due";

const VIEWS: { id: View; label: string; hideEmpty?: boolean }[] = [
  { id: "all", label: "All" },
  { id: "upcoming", label: "Coming up" },
  { id: "live", label: "Live now", hideEmpty: true },
  { id: "decision", label: "Needs decision" },
  { id: "due", label: "Next round due", hideEmpty: true },
  { id: "passed", label: "Passed" },
  { id: "not_passed", label: "Not passed" },
  { id: "questions", label: "Needs questions", hideEmpty: true },
  { id: "cancelled", label: "Cancelled", hideEmpty: true },
];

/** Older links used the interview state as the view. */
const LEGACY_VIEW: Record<string, View> = {
  scheduled: "upcoming",
  completed: "all",
};

type Look = {
  label: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  /** Icon tile: tinted ground, ring and icon colour. */
  tile: string;
  /** Pill text and ground. */
  pill: string;
  pulse?: boolean;
};

const LOOK: Record<OutcomeKey, Look> = {
  live: {
    label: "Live now",
    icon: Radio,
    tile: "bg-accent-3/15 text-accent-3 ring-accent-3/30",
    pill: "bg-accent-3/10 text-accent-3",
    pulse: true,
  },
  questions: {
    label: "Needs questions",
    icon: ListChecks,
    tile: "bg-warning/15 text-warning ring-warning/30",
    pill: "bg-warning/10 text-warning",
  },
  unscheduled: {
    label: "No time set",
    icon: CalendarPlus,
    tile: "bg-panel text-muted ring-border-strong",
    pill: "bg-panel text-muted",
  },
  missed: {
    label: "Did not start",
    icon: CalendarX2,
    tile: "bg-danger/10 text-danger ring-danger/30",
    pill: "bg-danger/10 text-danger",
  },
  upcoming: {
    label: "Scheduled",
    icon: CalendarClock,
    tile: "bg-secondary/15 text-secondary-soft ring-secondary/30",
    pill: "bg-secondary/10 text-secondary-soft",
  },
  scorecards: {
    label: "Waiting for scorecards",
    icon: Hourglass,
    tile: "bg-accent-4/15 text-accent-4 ring-accent-4/30",
    pill: "bg-accent-4/10 text-accent-4",
  },
  above_bar: {
    label: "Above bar",
    icon: CircleCheck,
    tile: "bg-success/15 text-success ring-success/30",
    pill: "bg-success/10 text-success",
  },
  below_bar: {
    label: "Below bar",
    icon: CircleX,
    tile: "bg-danger/10 text-danger ring-danger/30",
    pill: "bg-danger/10 text-danger",
  },
  did_not_finish: {
    label: "Did not finish",
    icon: LogOut,
    tile: "bg-warning/15 text-warning ring-warning/30",
    pill: "bg-warning/10 text-warning",
  },
  held: {
    label: "Held, not scored",
    icon: ClipboardPen,
    tile: "bg-panel text-muted ring-border-strong",
    pill: "bg-panel text-muted",
  },
  cancelled: {
    label: "Cancelled",
    icon: Ban,
    tile: "bg-panel text-subtle ring-border",
    pill: "bg-panel text-subtle",
  },
};

/** Looks for the summary tiles, which count groups rather than outcomes. */
const GROUP_LOOK: Record<"decision" | "passed" | "not_passed", Look> = {
  decision: { label: "Needs a decision", icon: Scale, tile: "bg-warning/15 text-warning ring-warning/35", pill: "bg-warning/10 text-warning" },
  passed: { label: "Passed", icon: CircleCheck, tile: "bg-success/15 text-success ring-success/30", pill: "bg-success/10 text-success" },
  not_passed: { label: "Not passed", icon: CircleX, tile: "bg-danger/10 text-danger ring-danger/30", pill: "bg-danger/10 text-danger" },
};

const TAKE_ICON: Record<string, ComponentType<{ className?: string }>> = {
  Recommend: ThumbsUp,
  "Do not recommend": ThumbsDown,
  "Did not finish": LogOut,
  "Integrity concern": ShieldAlert,
};

const TONE_TEXT: Record<Tone, string> = {
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  neutral: "text-muted",
};

/** Needs attention first, then what is coming up soonest, then decided and cancelled. */
function rank(r: InterviewRow): number {
  if (r.outcome === "live") return 0;
  if (r.outcome === "missed" || r.outcome === "questions") return 1;
  if (r.outcome === "upcoming" || r.outcome === "unscheduled") return 3;
  if (r.outcome === "cancelled") return 5;
  if (r.group === "passed" || r.group === "not_passed" || r.group === "moved_on") return 4;
  return r.outcome === "scorecards" ? 2 : 1;
}

export default function InterviewsList({
  slug,
  rows,
  people = {},
  due = [],
  view: initialView,
  q: initialQ,
}: {
  slug: string;
  rows: InterviewRow[];
  people?: Record<string, PersonRounds>;
  due?: NextRoundDue[];
  view: string;
  q: string;
}) {
  const [view, setView] = useState<View>(() => {
    const v = LEGACY_VIEW[initialView] ?? initialView;
    return VIEWS.some((x) => x.id === v) ? (v as View) : "all";
  });
  const [q, setQ] = useState(initialQ);
  const [grouped, setGrouped] = useState(false);
  const [openPeople, setOpenPeople] = useState<Set<string>>(new Set());
  const [toasts, toast] = useToasts();
  const router = useRouter();
  const [origin, setOrigin] = useState("");
  const [now, setNow] = useState<number | null>(null);
  // Built after mount so the server and client render the same markup.
  useEffect(() => {
    setOrigin(window.location.origin);
    setNow(Date.now());
  }, []);

  const counts = useMemo(() => {
    const c = Object.fromEntries(VIEWS.map((v) => [v.id, 0])) as Record<View, number>;
    c.all = rows.length;
    for (const r of rows) {
      c[r.group]++;
      if (r.questions === "needed") c.questions++;
    }
    c.due = due.length;
    return c;
  }, [rows, due]);
  const waitingCards = rows.filter((r) => r.outcome === "scorecards").length;
  const nextUp = rows.filter((r) => r.outcome === "upcoming" && r.scheduledAt).sort((a, b) => a.scheduledAt!.localeCompare(b.scheduledAt!))[0];

  const mine = rows.filter((r) => r.mineToPick && r.questions === "needed").length;
  const owed = rows.filter((r) => r.state === "completed" && r.scoring.youOwe).length;
  const needle = q.trim().toLowerCase();
  const shown = rows
    .filter(
      (r) =>
        (view === "all" || (view === "questions" ? r.questions === "needed" : r.group === view)) &&
        (!needle || [r.title, r.candidateName ?? "", r.interviewer ?? "", r.shortCode ?? "", ...r.panel].some((v) => v.toLowerCase().includes(needle))),
    )
    .sort((a, b) => {
      const d = rank(a) - rank(b);
      if (d) return d;
      const ta = a.when ?? "";
      const tb = b.when ?? "";
      // Coming up: soonest first. Everything else: most recent first.
      return rank(a) === 3 ? ta.localeCompare(tb) : tb.localeCompare(ta);
    });

  // Group by candidate: a person with a plan becomes one row that folds out; the rest stay as they are.
  type Item = { kind: "row"; r: InterviewRow } | { kind: "person"; id: string; name: string; rows: InterviewRow[]; plan: PersonRounds };
  const items: Item[] = [];
  const seen = new Map<string, Item & { kind: "person" }>();
  for (const r of shown) {
    const plan = grouped && r.candidateId ? people[r.candidateId] : undefined;
    if (!plan || !r.candidateId) {
      items.push({ kind: "row", r });
      continue;
    }
    const g = seen.get(r.candidateId);
    if (g) g.rows.push(r);
    else {
      const item = { kind: "person" as const, id: r.candidateId, name: r.candidateName ?? "Unnamed candidate", rows: [r], plan };
      seen.set(r.candidateId, item);
      items.push(item);
    }
  }
  const dueShown = due.filter((d) => !needle || d.name.toLowerCase().includes(needle) || d.round.name.toLowerCase().includes(needle));

  const tiles: {
    id: View;
    label: string;
    value: number;
    sub: string;
    look: Look;
  }[] = [
    {
      id: "upcoming",
      label: "Coming up",
      value: counts.upcoming,
      sub: nextUp?.scheduledAt ? `Next: ${when(nextUp.scheduledAt, now)}` : "Nothing booked",
      look: LOOK.upcoming,
    },
    {
      id: "decision",
      label: "Needs a decision",
      value: counts.decision,
      sub: waitingCards ? `${waitingCards} waiting for scorecards` : counts.decision ? "Interviews held, candidate not decided" : "All decided",
      look: GROUP_LOOK.decision,
    },
    {
      id: "passed",
      label: "Passed",
      value: counts.passed,
      sub: "Candidate passed by your team",
      look: GROUP_LOOK.passed,
    },
    {
      id: "not_passed",
      label: "Not passed",
      value: counts.not_passed,
      sub: "Candidate not passed",
      look: GROUP_LOOK.not_passed,
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <section
        className="relative overflow-hidden rounded-2xl border border-border bg-surface px-5 py-6 md:px-7 animate-slide-up motion-reduce:animate-none"
        style={{
          backgroundImage: "radial-gradient(520px 220px at 0% 0%, rgb(var(--c-accent-2) / 0.18), transparent 70%)",
        }}
      >
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <span aria-hidden className="hidden sm:flex w-11 h-11 shrink-0 rounded-xl items-center justify-center bg-secondary/15 text-secondary-soft ring-1 ring-inset ring-secondary/25">
              <Video className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h1 className="text-[26px] font-semibold tracking-tight text-fg">Interviews</h1>
              <p className="text-[15px] text-muted mt-1 max-w-[620px]">
                Live interviews your team runs with candidates, and where each one stands: coming up, waiting for scorecards, waiting for your decision, or decided.
              </p>
            </div>
          </div>
          <Btn variant="primary" size="md" icon={Plus} href={`/w/${slug}/interviews/new`}>
            New interview
          </Btn>
        </div>
      </section>

      {rows.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {tiles.map((t) => {
            const on = view === t.id;
            const Icon = t.look.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setView(on ? "all" : t.id)}
                aria-pressed={on}
                className={`group flex items-start gap-3 rounded-xl border bg-surface px-4 py-3.5 text-left transition-colors hover:bg-panel/60 ${on ? "border-secondary/60 ring-1 ring-secondary/30" : "border-border"}`}
              >
                <span aria-hidden className={`flex w-9 h-9 shrink-0 rounded-lg items-center justify-center ring-1 ring-inset ${t.look.tile}`}>
                  <Icon className="w-[18px] h-[18px]" strokeWidth={2} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] text-muted">{t.label}</span>
                  <span className="block text-[22px] leading-7 font-semibold tabular-nums text-fg">{t.value}</span>
                  <span className="block text-xs text-subtle">{t.sub}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {mine > 0 && (
        <Banner icon={ListChecks} tone="warning" onClick={() => setView("questions")}>
          You were asked to pick the questions for {mine === 1 ? "1 interview" : `${mine} interviews`}.
        </Banner>
      )}
      {owed > 0 && (
        <Banner icon={ClipboardPen} tone="accent-4" onClick={() => setView("decision")}>
          Your scorecard is missing for {owed === 1 ? "1 interview" : `${owed} interviews`}. The team decides once every card is in.
        </Banner>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Filter interviews" className="inline-flex p-[3px] rounded-[10px] border border-border-strong bg-surface gap-0.5 max-w-full overflow-x-auto">
          {VIEWS.filter((v) => !v.hideEmpty || counts[v.id] > 0 || v.id === view).map((v) => {
            const on = v.id === view;
            return (
              <button
                key={v.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setView(v.id)}
                className={`inline-flex items-center gap-2 h-8 px-3 rounded-[7px] text-[13px] font-medium whitespace-nowrap transition ${on ? "bg-elevated text-fg" : "text-muted hover:text-fg"}`}
              >
                {v.id === "live" && <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-accent-3 animate-pulse motion-reduce:animate-none" />}
                {v.label}
                <span className={`text-xs tabular-nums ${on ? "text-secondary-soft" : "text-subtle"}`}>{counts[v.id]}</span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
        {view !== "due" && Object.keys(people).length > 0 && (
          <label className="inline-flex items-center gap-2 text-[13px] text-muted whitespace-nowrap cursor-pointer select-none">
            <input type="checkbox" checked={grouped} onChange={(e) => setGrouped(e.target.checked)} className="w-4 h-4 accent-secondary" />
            Group by candidate
          </label>
        )}
        <label className="relative flex-1 md:flex-none md:w-72">
          <span className="sr-only">Search interviews</span>
          <Search aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-subtle" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search candidate, title or interviewer" className={`${inputCls} pl-8`} />
        </label>
        </div>
      </div>

      {view === "due" ? (
        <DueList slug={slug} due={dueShown} />
      ) : shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-strong bg-surface/50 px-6 py-14 text-center flex flex-col items-center gap-2">
          <Inbox className="w-6 h-6 text-subtle" aria-hidden />
          <p className="text-[15px] font-medium text-fg">{rows.length ? "No matches" : "No interviews yet"}</p>
          <p className="text-[13px] text-muted max-w-sm">{rows.length ? "Try another search or filter." : "Set up a coding round, a technical discussion or a conversation with a candidate."}</p>
        </div>
      ) : (
        <ul className="rounded-xl border border-border bg-surface overflow-hidden">
          {items.map((it) =>
            it.kind === "person" ? (
              <PersonGroup
                key={`p:${it.id}`}
                slug={slug}
                id={it.id}
                name={it.name}
                plan={it.plan}
                count={it.rows.length}
                open={openPeople.has(it.id)}
                onToggle={() =>
                  setOpenPeople((prev) => {
                    const next = new Set(prev);
                    if (next.has(it.id)) next.delete(it.id);
                    else next.add(it.id);
                    return next;
                  })
                }
              />
            ) : (
              renderRow(it.r)
            ),
          )}
        </ul>
      )}
      {toasts}
    </div>
  );

  function renderRow(r: InterviewRow) {
            const look = LOOK[r.outcome];
            const Icon = look.icon;
            return (
              <li
                key={r.id}
                // The whole row opens the room or the report; links and buttons inside keep their own target.
                onClick={(e) => {
                  if (!r.href || (e.target as HTMLElement).closest("a,button")) return;
                  router.push(r.href);
                }}
                className={`group grid grid-cols-[40px_minmax(0,1fr)] md:grid-cols-[40px_minmax(0,1fr)_auto] xl:grid-cols-[40px_minmax(0,1fr)_230px_180px_196px] items-center gap-x-4 gap-y-2.5 px-4 md:px-5 py-4 border-t border-border first:border-t-0 hover:bg-panel/60 transition-colors ${r.href ? "cursor-pointer" : ""}`}
              >
                <span aria-hidden className={`relative row-span-2 xl:row-span-1 self-start xl:self-center flex w-10 h-10 rounded-xl items-center justify-center ring-1 ring-inset ${look.tile}`}>
                  <Icon className="w-5 h-5" strokeWidth={2} />
                  {look.pulse && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-accent-3 ring-2 ring-surface animate-pulse motion-reduce:animate-none" />}
                </span>

                {/* Who and what */}
                <span className="min-w-0">
                  <span className="flex items-center gap-2 min-w-0">
                    {r.candidateId ? (
                      <Link href={`/w/${slug}/candidates/${r.candidateId}`} className="text-[15px] font-semibold text-fg truncate hover:underline underline-offset-4">
                        {r.candidateName ?? "Unnamed candidate"}
                      </Link>
                    ) : (
                      <span className="text-[15px] font-semibold text-fg truncate">{r.candidateName ?? "No candidate yet"}</span>
                    )}
                    <span className={`xl:hidden inline-flex items-center gap-1 h-6 px-2 rounded-full text-xs font-medium whitespace-nowrap ${look.pill}`}>{look.label}</span>
                  </span>
                  <span className="block text-sm text-muted truncate mt-0.5">{r.round ? r.round.name : r.title}</span>
                  {r.round && (
                    <span className="flex items-center gap-2 mt-1.5 min-w-0 text-[13px] text-muted">
                      <RoundStrip items={r.round.strip} />
                      <span className="whitespace-nowrap">{r.round.number ? `Round ${r.round.number} of ${r.round.total}` : "Skipped round"}</span>
                    </span>
                  )}
                  <span className="flex items-center gap-2 mt-1.5 min-w-0 text-[13px] text-subtle">
                    <People host={r.interviewer} panel={r.panel} />
                    <span className="truncate">
                      {r.format ?? humanize(r.type)}, {fmtLength(r.minutes)}
                    </span>
                  </span>
                </span>

                {/* Where it stands, then scores: one wrapped line below the name until xl, their own columns from xl. */}
                <span className="col-start-2 min-w-0 flex flex-wrap items-center gap-x-5 gap-y-2 xl:contents">
                  <span className="min-w-0 flex flex-col gap-1">
                    <span className={`hidden xl:inline-flex self-start items-center h-6 px-2 rounded-full text-xs font-medium whitespace-nowrap ${look.pill}`}>{look.label}</span>
                    <span className="text-[13px] text-muted">{detail(r, now)}</span>
                    {r.candidateLine && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-subtle">
                        <span
                          aria-hidden
                          className={`w-1.5 h-1.5 rounded-full ${r.candidateLine.tone === "success" ? "bg-success" : r.candidateLine.tone === "danger" ? "bg-danger" : "bg-border-strong"}`}
                        />
                        {r.candidateLine.text}
                      </span>
                    )}
                  </span>

                  {/* Scores and the interviewer's take */}
                  <span className="min-w-0 flex flex-wrap items-center gap-x-3 gap-y-1.5 empty:hidden xl:empty:flex">
                    <Signals r={r} />
                  </span>
                </span>

                <span className="col-start-2 md:col-start-3 md:row-start-1 md:row-span-2 xl:col-start-auto xl:row-start-auto xl:row-span-1 flex flex-wrap justify-start md:justify-end gap-1.5">
                  <Actions
                    r={r}
                    slug={slug}
                    onCopy={() => {
                      navigator.clipboard?.writeText(`${origin}${r.candidateLink}`);
                      toast(`Candidate link for ${r.candidateName ?? r.title} copied`);
                    }}
                  />
                </span>
              </li>
            );
  }
}

function Banner({ icon: Icon, tone, onClick, children }: { icon: ComponentType<{ className?: string }>; tone: "warning" | "accent-4"; onClick: () => void; children: React.ReactNode }) {
  const cls = tone === "warning" ? "border-warning/35 bg-warning/[0.06] hover:bg-warning/[0.1]" : "border-accent-4/35 bg-accent-4/[0.06] hover:bg-accent-4/[0.1]";
  return (
    <button type="button" onClick={onClick} className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${cls}`}>
      <Icon className={`w-4 h-4 shrink-0 ${tone === "warning" ? "text-warning" : "text-accent-4"}`} aria-hidden />
      <span className="flex-1 text-[14px] text-fg">{children}</span>
      <ArrowRight className="w-4 h-4 text-muted" aria-hidden />
    </button>
  );
}

/** Host plus panel as overlapping initials. */
function People({ host, panel }: { host: string | null; panel: string[] }) {
  const all = [host ?? "Unknown", ...panel];
  const title = `Host: ${host ?? "Unknown"}${panel.length ? `. Panel: ${panel.join(", ")}` : ""}`;
  return (
    <span className="inline-flex items-center shrink-0" title={title}>
      <span className="sr-only">{title}</span>
      {all.slice(0, 3).map((n, i) => (
        <span key={`${n}-${i}`} className={`rounded-full ${i ? "ml-0.5" : ""}`}>
          <Avatar name={n} size={22} />
        </span>
      ))}
      {all.length > 3 && <span className="ml-1 text-xs text-subtle">+{all.length - 3}</span>}
    </span>
  );
}

function Signals({ r }: { r: InterviewRow }) {
  const s = r.scoring;
  const out: React.ReactNode[] = [];
  if (s.blind && s.submitted > 0) {
    out.push(
      <span key="blind" className="inline-flex items-center gap-1.5 text-xs text-subtle" title="Submit your own scorecard to see the others">
        <EyeOff className="w-3.5 h-3.5" aria-hidden />
        Scores hidden until you submit
      </span>,
    );
  } else if (s.score) {
    const above = s.score.value >= s.score.bar;
    out.push(
      <span key="score" className="inline-flex flex-col gap-1 min-w-[108px]" title={`Pass mark ${s.score.bar} of ${s.score.of}. Scores never pass a candidate on their own.`}>
        <span className="flex items-baseline gap-1.5">
          <span className={`text-sm font-semibold tabular-nums ${above ? "text-success" : "text-danger"}`}>{s.score.value.toFixed(1)}</span>
          <span className="text-xs text-subtle">
            of {s.score.of}, {above ? "above" : "below"} {s.score.bar}
          </span>
        </span>
        <span className="relative h-1.5 w-[108px] rounded-full bg-panel">
          <span
            className={`absolute inset-y-0 left-0 rounded-full ${above ? "bg-success" : "bg-danger"}`}
            style={{
              width: `${Math.max(4, Math.min(100, ((s.score.value - 1) / (s.score.of - 1)) * 100))}%`,
            }}
          />
          <span aria-hidden className="absolute -top-0.5 -bottom-0.5 w-0.5 rounded bg-fg/70" style={{ left: `${((s.score.bar - 1) / (s.score.of - 1)) * 100}%` }} />
        </span>
      </span>,
    );
  }
  const { yes, unsure, no } = s.recs;
  if (yes + unsure + no > 0) {
    out.push(
      <span key="recs" className="inline-flex items-center gap-2 text-xs tabular-nums" title="Interviewer recommendations">
        {yes > 0 && (
          <span className="inline-flex items-center gap-1 text-success">
            <ThumbsUp className="w-3.5 h-3.5" aria-hidden />
            {yes}
            <span className="sr-only">pass</span>
          </span>
        )}
        {unsure > 0 && (
          <span className="inline-flex items-center gap-1 text-warning">
            <CircleHelp className="w-3.5 h-3.5" aria-hidden />
            {unsure}
            <span className="sr-only">unsure</span>
          </span>
        )}
        {no > 0 && (
          <span className="inline-flex items-center gap-1 text-danger">
            <ThumbsDown className="w-3.5 h-3.5" aria-hidden />
            {no}
            <span className="sr-only">not passed</span>
          </span>
        )}
      </span>,
    );
  } else if (r.take) {
    const T = TAKE_ICON[r.take.label] ?? ThumbsUp;
    out.push(
      <span key="take" className={`inline-flex items-center gap-1.5 text-xs font-medium ${TONE_TEXT[r.take.tone]}`} title="The interviewer's take. The team decides who passes.">
        <T className="w-3.5 h-3.5" aria-hidden />
        {r.take.label}
      </span>,
    );
  }
  return <>{out}</>;
}

function Actions({ r, slug, onCopy }: { r: InterviewRow; slug: string; onCopy: () => void }) {
  const report = `/w/${slug}/interviews/${r.id}/report`;
  const copy = (
    <button
      type="button"
      onClick={onCopy}
      aria-label={`Copy candidate link for ${r.candidateName ?? r.title}`}
      title="Copy candidate link"
      className="w-8 h-8 rounded-lg border border-border bg-surface flex items-center justify-center text-muted hover:text-fg hover:bg-panel"
    >
      <Copy className="w-3.5 h-3.5" />
    </button>
  );
  switch (r.outcome) {
    case "questions":
      return (
        <Btn variant={r.mineToPick ? "primary" : "ghost"} icon={ListChecks} href={`/w/${slug}/interviews/${r.id}/questions`}>
          Pick questions
        </Btn>
      );
    case "live":
      return r.href ? (
        <Btn variant="primary" icon={Video} href={r.href}>
          Join
        </Btn>
      ) : null;
    case "upcoming":
    case "unscheduled":
    case "missed":
      return (
        <>
          {copy}
          {r.href ? (
            <Btn href={r.href}>
              Open
              <ArrowRight className="w-3.5 h-3.5 text-muted" aria-hidden />
            </Btn>
          ) : (
            <Btn href={`/w/${slug}/interviews/${r.id}/questions`}>Questions</Btn>
          )}
        </>
      );
    case "scorecards":
      return r.scoring.youOwe ? (
        <Btn variant="primary" icon={ClipboardPen} href={`/w/${slug}/interviews/${r.id}/scorecard`}>
          Add scorecard
        </Btn>
      ) : (
        <Btn icon={FileText} href={report}>
          Report
        </Btn>
      );
    case "above_bar":
    case "below_bar":
    case "did_not_finish":
    case "held":
      if (r.group !== "decision") break;
      return (
        <>
          <Btn icon={FileText} href={report}>
            Report
          </Btn>
          {r.decideHref && (
            <Btn variant="primary" icon={Scale} href={r.decideHref}>
              Decide
            </Btn>
          )}
        </>
      );
    default:
      break;
  }
  return (
    <Btn icon={FileText} href={report}>
      Report
    </Btn>
  );
}

/** One line under the outcome saying what it means for this interview. */
function detail(r: InterviewRow, now: number | null): string {
  const s = r.scoring;
  switch (r.outcome) {
    case "live":
      return r.when ? `Started ${clock(r.when)}` : "In the room now";
    case "questions":
      return r.mineToPick ? "You pick the questions" : r.questionsOwner ? `${r.questionsOwner} picks the questions` : "Questions still to pick";
    case "unscheduled":
      return "Pick a time with the candidate";
    case "missed":
      return r.scheduledAt ? `Was due ${when(r.scheduledAt, now)}` : "Nobody joined";
    case "upcoming":
      return r.scheduledAt ? when(r.scheduledAt, now) : "Scheduled";
    case "scorecards":
      return `${s.submitted} of ${s.expected} scorecards in${s.missing.length ? `, waiting on ${names(s.missing)}` : ""}`;
    case "above_bar":
    case "below_bar":
    case "held":
      return r.when ? `Interviewed ${fmtDate(r.when)}` : "Interviewed";
    case "did_not_finish":
      return r.when ? `Left early, ${fmtDate(r.when)}` : "Left early";
    case "cancelled":
      return r.scheduledAt ? `Was set for ${fmtDate(r.scheduledAt)}` : "Called off";
  }
}

function names(list: string[]): string {
  const first = list.map((n) => (n.includes("@") ? n : n.split(" ")[0]));
  return first.length <= 2 ? first.join(" and ") : `${first.slice(0, 2).join(", ")} and ${first.length - 2} more`;
}

function clock(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** "Today, 15:00", "Tomorrow, 11:00", "Thu 2 Oct, 15:00". Plain dates until mounted, so server and client agree. */
function when(iso: string, now: number | null): string {
  if (now == null) return fmtDate(iso);
  const d = new Date(iso);
  const day = (t: number) => {
    const x = new Date(t);
    return new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  };
  const diff = Math.round((day(d.getTime()) - day(now)) / 86_400_000);
  const label =
    diff === 0
      ? "Today"
      : diff === 1
        ? "Tomorrow"
        : diff === -1
          ? "Yesterday"
          : d.toLocaleDateString("en-GB", {
              weekday: "short",
              day: "numeric",
              month: "short",
            });
  return `${label}, ${clock(iso)}`;
}

function fmtLength(min: number): string {
  if (min < 60) return `${min} min`;
  return min % 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min / 60} h`;
}

const STATE_PILL: Partial<Record<RoundState, string>> = {
  above_bar: "bg-success/10 text-success",
  below_bar: "bg-danger/10 text-danger",
  did_not_finish: "bg-warning/10 text-warning",
  awaiting_review: "bg-accent-4/10 text-accent-4",
  scheduled: "bg-secondary/10 text-secondary-soft",
  in_progress: "bg-secondary/10 text-secondary-soft",
  not_started: "ring-1 ring-inset ring-border-strong text-muted",
  stopped: "bg-panel text-subtle",
};

const WAITING_TEXT: Record<Exclude<WaitingOn, null>, string> = {
  schedule: "next round to book",
  candidate: "waiting on the candidate",
  interview: "interview booked",
  review: "awaiting scorecards",
  next_step: "next step to pick",
  decision: "ready for a decision",
};

function dayText(iso: string, withTime: boolean): string {
  return new Date(iso).toLocaleString("en-GB", withTime ? { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" } : { day: "numeric", month: "short" });
}

/** A candidate's rounds as one row that folds out, for Group by candidate. */
function PersonGroup({
  slug,
  id,
  name,
  plan,
  count,
  open,
  onToggle,
}: {
  slug: string;
  id: string;
  name: string;
  plan: PersonRounds;
  count: number;
  open: boolean;
  onToggle: () => void;
}) {
  const done = plan.rounds.filter((r) => r.state === "above_bar" || r.state === "below_bar" || r.state === "did_not_finish").length;
  const booked = plan.rounds.find((r) => r.state === "scheduled" && r.at);
  const focus = plan.rounds.find((r) => r.state !== "above_bar" && r.state !== "below_bar" && r.state !== "did_not_finish" && r.state !== "stopped") ?? plan.rounds[plan.rounds.length - 1];
  const summary = [`${done} done`, booked?.at ? `next ${dayText(booked.at, false)}` : plan.waitingOn ? WAITING_TEXT[plan.waitingOn] : null].filter(Boolean).join(" · ");
  const panelId = `rounds-${id}`;
  return (
    <li className="border-t border-border first:border-t-0">
      <div className="flex items-center gap-4 px-4 md:px-5 py-4">
        <RoundTile kind={focus?.kind ?? "interview"} format={focus?.format} size={40} />
        <div className="min-w-0 flex-1">
          <Link href={`/w/${slug}/candidates/${id}`} className="text-[15px] font-semibold text-fg truncate hover:underline underline-offset-4">
            {name}
          </Link>
          <span className="block text-sm text-muted truncate mt-0.5">{plan.planName ?? "Their rounds"}</span>
          <span className="flex items-center gap-2 mt-1.5 text-[13px] text-muted min-w-0">
            <RoundStrip items={plan.rounds.map((r) => ({ seg: segmentOf(r.state), name: r.name }))} />
            <span className="truncate">{summary}</span>
          </span>
        </div>
        <span className="hidden sm:inline text-xs text-subtle whitespace-nowrap">{count === 1 ? "1 interview" : `${count} interviews`}</span>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={panelId}
          className="h-8 px-2.5 rounded-lg text-[13px] text-muted hover:text-fg hover:bg-panel inline-flex items-center gap-1"
        >
          {open ? "Hide" : "Rounds"}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
        </button>
      </div>
      {open && (
        <ol id={panelId} className="mx-4 md:mx-5 mb-4 flex flex-col gap-2">
          {plan.rounds.map((r) => {
            const when = r.at ? dayText(r.at, r.state === "scheduled") : r.state === "not_started" ? "Not booked" : null;
            const body = (
              <>
                <span className="w-5 text-xs tabular-nums text-subtle text-right shrink-0">{r.number ?? ""}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-fg truncate">{r.name}</span>
                  <span className="block text-xs text-muted">{[when, r.score].filter(Boolean).join(" · ") || " "}</span>
                </span>
                <span className={`inline-flex items-center h-6 px-2 rounded-full text-xs font-medium whitespace-nowrap ${STATE_PILL[r.state] ?? "bg-panel text-muted"}`}>{r.label}</span>
              </>
            );
            return (
              <li key={r.id}>
                {r.href ? (
                  <Link href={r.href} className="flex items-center gap-3 rounded-xl border border-border bg-bg/40 px-3.5 py-2.5 hover:border-border-strong hover:bg-panel/50 transition-colors">
                    {body}
                  </Link>
                ) : (
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-bg/40 px-3.5 py-2.5">{body}</div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </li>
  );
}

/** People moved on whose next live round is not booked yet. */
function DueList({ slug, due }: { slug: string; due: NextRoundDue[] }) {
  const [picked, setPicked] = useState<Set<string>>(new Set());
  // Dates read in the viewer's time zone, so they are filled in after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const href = (list: NextRoundDue[]) => {
    const formats = [...new Set(list.map((d) => d.round.format).filter(Boolean))];
    const ids = list.map((d) => d.candidateId);
    return `/w/${slug}/interviews/new?candidates=${ids.join(",")}&rounds=${list.map((d) => `${d.candidateId}:${d.round.id}`).join(",")}${formats.length === 1 ? `&format=${formats[0]}` : ""}`;
  };
  if (!due.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border-strong bg-surface/50 px-6 py-14 text-center flex flex-col items-center gap-2">
        <CalendarCheck2 className="w-6 h-6 text-subtle" aria-hidden />
        <p className="text-[15px] font-medium text-fg">No rounds waiting to be booked</p>
        <p className="text-[13px] text-muted max-w-sm">When someone moves a candidate on after a round, their next round shows here until it is booked.</p>
      </div>
    );
  }
  const chosen = due.filter((d) => picked.has(d.candidateId));
  return (
    <div className="flex flex-col gap-3">
      <ul className="rounded-xl border border-border bg-surface overflow-hidden">
        {due.map((d) => {
          const on = picked.has(d.candidateId);
          return (
            <li key={d.candidateId} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 md:px-5 py-3.5 border-t border-border first:border-t-0">
              <input
                type="checkbox"
                checked={on}
                aria-label={`Select ${d.name}`}
                onChange={() =>
                  setPicked((prev) => {
                    const next = new Set(prev);
                    if (next.has(d.candidateId)) next.delete(d.candidateId);
                    else next.add(d.candidateId);
                    return next;
                  })
                }
                className="w-4 h-4 accent-secondary shrink-0"
              />
              <RoundTile kind="interview" format={d.round.format} size={32} />
              <div className="min-w-0 flex-1 basis-[220px]">
                <div className="text-sm font-medium text-fg truncate">
                  <Link href={`/w/${slug}/candidates/${d.candidateId}`} className="hover:underline underline-offset-4">
                    {d.name}
                  </Link>{" "}
                  · {d.round.name}
                </div>
                <div className="text-xs text-muted truncate">
                  {[
                    d.round.number ? `Round ${d.round.number} of ${d.total}` : null,
                    d.from ? `${d.from.name} moved on${d.from.by ? ` by ${d.from.by}` : ""}${d.from.at && mounted ? `, ${dayText(d.from.at, false)}` : ""}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              </div>
              <Btn variant="primary" icon={CalendarPlus} href={href([d])}>
                Schedule
              </Btn>
            </li>
          );
        })}
      </ul>
      {chosen.length > 1 ? (
        <div className="flex flex-wrap items-center gap-3">
          <Btn variant="primary" size="md" icon={CalendarPlus} href={href(chosen)}>
            Schedule {chosen.length} together
          </Btn>
          <span className="text-[13px] text-muted">One wizard run, one room each.</span>
        </div>
      ) : (
        due.length > 1 && <p className="text-[13px] text-muted">Select several to book them in one wizard run.</p>
      )}
    </div>
  );
}
