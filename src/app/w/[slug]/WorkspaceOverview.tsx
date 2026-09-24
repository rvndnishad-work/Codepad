"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Check,
  ClipboardList,
  Clock,
  FileCode2,
  Plus,
  Sparkles,
  Upload,
  Video,
} from "lucide-react";
import { buildOverview, type AttentionItem, type OverviewInput } from "@/lib/workspace/overview";
import {
  ACTIVE_STAGES,
  STAGE_SWATCH,
  greeting,
  plural,
  relativeTime,
  setupSteps,
  stageFunnel,
  type PlanDisplay,
} from "@/lib/workspace/display";
import { STAGE_LABELS } from "@/lib/crm/stages";

type Props = OverviewInput & {
  firstName: string | null;
  plan: PlanDisplay;
  seatLimit: number | null;
  setup: { assessments: number; members: number; pendingInvites: number };
  onAddCandidate: () => void;
  onBulkImport: () => void;
  onSendTakeHome: () => void;
};

export function Card({ title, right, children, className = "" }: { title?: string; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-border bg-surface min-w-0 ${className}`}>
      {title && (
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border">
          <h2 className="text-[15px] font-semibold text-fg">{title}</h2>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function ButtonLink({ href, onClick, primary, icon: Icon, children }: {
  href?: string;
  onClick?: () => void;
  primary?: boolean;
  icon?: typeof Plus;
  children: ReactNode;
}) {
  const cls = primary
    ? "bg-secondary text-bg hover:brightness-110"
    : "border border-border bg-surface text-fg hover:bg-panel hover:border-border-strong";
  const inner = (
    <>
      {Icon && <Icon className={`w-4 h-4 ${primary ? "" : "text-muted"}`} strokeWidth={primary ? 2.25 : 1.75} aria-hidden />}
      {children}
    </>
  );
  const base = `inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-lg text-sm font-medium whitespace-nowrap transition ${cls}`;
  return href ? (
    <Link href={href} className={base}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={base}>
      {inner}
    </button>
  );
}

const ATTENTION_ICON = { "take-home": FileCode2, screening: Bot, clock: Clock, interview: Video } as const;
const STATUS_DOT: Record<AttentionItem["kind"], { dot: string; label: string }> = {
  review: { dot: "bg-warning", label: "Needs review" },
  expiring: { dot: "bg-danger", label: "Expiring" },
  interview: { dot: "bg-secondary", label: "Today" },
};

function Kpi({ label, value, sub }: { label: string; value: number; sub: ReactNode }) {
  return (
    <div className="bg-surface px-4 py-4 md:px-5 md:py-5">
      <div className="text-[13px] text-muted">{label}</div>
      <div className="text-[28px] md:text-[32px] font-semibold tracking-[-0.02em] tabular-nums mt-1.5 text-fg">{value}</div>
      <div className="text-[13px] text-subtle mt-0.5">{sub}</div>
    </div>
  );
}

function TrialBanner({ plan, slug }: { plan: PlanDisplay; slug: string }) {
  if (!plan.onTrial) return null;
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 rounded-xl border border-border bg-surface text-sm">
      <Sparkles className="w-[18px] h-[18px] text-secondary shrink-0" aria-hidden />
      <p className="flex-1 text-muted">
        <span className="text-fg font-medium">Your trial ends in {plural(plan.trialDaysLeft ?? 0, "day")}.</span>{" "}
        Everything in Growth is on, including AI screening and ATS sync.
      </p>
      <ButtonLink href={`/w/${slug}?section=billing`}>Compare plans</ButtonLink>
    </div>
  );
}

function SetupView(props: Props) {
  const { slug, plan, seatLimit, setup, candidates, aiInterviewSessions, onAddCandidate } = props;
  const steps = setupSteps(
    {
      assessments: setup.assessments,
      candidates: candidates.length,
      aiScreenings: aiInterviewSessions.length,
      members: setup.members,
      pendingInvites: setup.pendingInvites,
    },
    { seatLimit, aiIncluded: plan.growthFeatures },
  );
  const done = steps.filter((s) => s.done).length;
  const next = steps.find((s) => !s.done)?.id;
  const actions: Record<string, { label: string; href?: string; onClick?: () => void }> = {
    assessment: { label: "Create assessment", href: `/w/${slug}/take-homes/new` },
    candidate: { label: "Add candidate", onClick: onAddCandidate },
    ai: plan.growthFeatures
      ? { label: "Try AI screening", href: `/w/${slug}/ai-interviews` }
      : { label: "See plans", href: `/w/${slug}?section=billing` },
    team: { label: "Invite", href: `/w/${slug}?section=members` },
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
      <Card>
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <h2 className="text-[15px] font-semibold">Getting started</h2>
          <span className="text-[13px] text-muted">
            {done} of {steps.length} done
          </span>
        </div>
        <div className="h-1 mx-5 mb-4 rounded-full bg-elevated" aria-hidden>
          <div className="h-1 rounded-full bg-success transition-[width]" style={{ width: `${(done / steps.length) * 100}%` }} />
        </div>
        <ol>
          {steps.map((s, i) => {
            const a = actions[s.id];
            return (
              <li key={s.id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-5 py-4 border-t border-border">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <span
                    className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-[13px] ${
                      s.done ? "bg-success text-bg" : "border border-border-strong text-muted"
                    }`}
                    aria-hidden
                  >
                    {s.done ? <Check className="w-4 h-4" strokeWidth={2.5} /> : i + 1}
                  </span>
                  <div className="min-w-0">
                    <div className={`text-[15px] font-medium ${s.done ? "text-subtle line-through" : "text-fg"}`}>
                      {s.title}
                      {s.done && <span className="sr-only"> (done)</span>}
                    </div>
                    {!s.done && <p className="text-[13px] text-muted mt-0.5">{s.body}</p>}
                  </div>
                </div>
                {!s.done && a && (
                  <div className="pl-11 sm:pl-0">
                    <ButtonLink href={a.href} onClick={a.onClick} primary={s.id === next}>
                      {a.label}
                    </ButtonLink>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </Card>

      <div className="flex flex-col gap-6">
        <Card>
          <div className="p-5 flex flex-col gap-3">
            <h2 className="text-[15px] font-semibold">Already have a list?</h2>
            <p className="text-sm leading-relaxed text-muted">
              Paste names and emails from a spreadsheet or your ATS export. Each person becomes a candidate at the
              Applied stage.
            </p>
            <div>
              <ButtonLink icon={Upload} onClick={props.onBulkImport}>
                Import candidates
              </ButtonLink>
            </div>
          </div>
        </Card>
        <Card>
          <div className="p-5 flex flex-col gap-3">
            <h2 className="text-[15px] font-semibold">How a hiring loop works</h2>
            <p className="text-sm leading-relaxed text-muted">
              Screen with AI, send a take-home, then run the live interview in a shared editor. Every step lands on
              the candidate page.
            </p>
            <Link href="/hire" className="inline-flex items-center gap-1.5 text-sm font-medium text-secondary-soft hover:text-fg transition-colors">
              See the walkthrough <ArrowRight className="w-3.5 h-3.5" aria-hidden />
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function WorkspaceOverview(props: Props) {
  const { slug, firstName, plan, candidates } = props;
  // Greeting uses the viewer's clock, so it is filled in after mount to keep
  // server and client markup identical.
  const [hello, setHello] = useState<string | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const d = new Date();
    setNow(d);
    setHello(greeting(d.getHours()));
  }, []);

  const data = useMemo(() => buildOverview(props, now ?? undefined), [props, now]);
  const funnel = useMemo(() => stageFunnel(candidates.map((c) => c.stage)), [candidates]);
  const isNew = candidates.length === 0;
  const k = data.kpis;
  const maxWeek = Math.max(1, ...data.weekly.map((w) => w.count));

  const summary = isNew
    ? "Five steps to your first hiring loop."
    : data.attention.length > 0
      ? `${plural(data.attention.length, "item")} ${data.attention.length === 1 ? "needs" : "need"} you today.`
      : "Nothing is waiting on you right now.";

  return (
    <div className="flex flex-col gap-6">
      <TrialBanner plan={plan} slug={slug} />

      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-[26px] font-semibold tracking-[-0.02em] text-fg min-h-[1.3em]">
            {isNew ? "Set up your workspace" : hello ? `${hello}${firstName ? `, ${firstName}` : ""}` : "Overview"}
          </h1>
          <p className="mt-1.5 text-[15px] text-muted">{summary}</p>
        </div>
        {!isNew && (
          <div className="flex flex-wrap gap-2">
            <ButtonLink icon={Upload} onClick={props.onBulkImport}>
              Import
            </ButtonLink>
            <ButtonLink icon={ClipboardList} onClick={props.onSendTakeHome}>
              Send take-home
            </ButtonLink>
            <ButtonLink icon={Plus} primary onClick={props.onAddCandidate}>
              Add candidate
            </ButtonLink>
          </div>
        )}
      </div>

      {isNew ? (
        <SetupView {...props} />
      ) : (
        <>
          <Card className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border overflow-hidden">
            <Kpi
              label="Active candidates"
              value={k.active}
              sub={k.addedThisWeek > 0 ? <><span className="text-success">+{k.addedThisWeek}</span> this week</> : "None added this week"}
            />
            <Kpi
              label="Waiting for review"
              value={k.toReview}
              sub={k.reviewOverdue > 0 ? <span className="text-warning">{k.reviewOverdue} older than 48 h</span> : "All recent"}
            />
            <Kpi label="Upcoming interviews" value={k.upcomingInterviews} sub={`${k.interviewsThisWeek} finished this week`} />
            <Kpi label="Offers out" value={k.offers} sub={`${plural(k.hiredThisMonth, "hire")} in 30 days`} />
          </Card>

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
            <div className="flex flex-col gap-6 min-w-0">
              <Card
                title="Needs your attention"
                right={data.attention.length > 6 ? <span className="text-[13px] text-subtle">Showing 6 of {data.attention.length}</span> : undefined}
              >
                {data.attention.length === 0 ? (
                  <p className="px-5 py-8 text-sm text-muted text-center">
                    You are all caught up. New submissions and expiring links will show here.
                  </p>
                ) : (
                  <ul>
                    {data.attention.slice(0, 6).map((item) => {
                      const Icon = ATTENTION_ICON[item.icon];
                      const st = STATUS_DOT[item.kind];
                      return (
                        <li
                          key={item.id}
                          className="grid grid-cols-[32px_minmax(0,1fr)_auto] md:grid-cols-[32px_minmax(0,1fr)_130px_80px_auto] items-center gap-3 md:gap-4 px-5 py-3 border-t border-border first:border-t-0"
                        >
                          <span className="w-8 h-8 rounded-lg bg-panel flex items-center justify-center text-muted" aria-hidden>
                            <Icon className="w-4 h-4" />
                          </span>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-fg truncate">{item.name}</div>
                            <div className="text-[13px] text-muted truncate mt-0.5">{item.detail}</div>
                          </div>
                          <span className="hidden md:inline-flex items-center gap-1.5 text-[13px] text-muted whitespace-nowrap">
                            <span className={`w-[7px] h-[7px] rounded-full ${st.dot}`} aria-hidden />
                            {st.label}
                          </span>
                          <span className="hidden md:inline text-[13px] text-subtle whitespace-nowrap">
                            {now ? relativeTime(item.at, now) : ""}
                          </span>
                          <Link
                            href={item.href}
                            className="justify-self-end h-8 inline-flex items-center px-3 rounded-lg border border-border text-[13px] font-medium text-fg hover:bg-panel hover:border-border-strong transition-colors whitespace-nowrap"
                          >
                            {item.action}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>

              <Card
                title="Pipeline"
                right={
                  <span className="text-[13px] text-subtle">
                    {funnel.active} active · {funnel.rejected} rejected
                  </span>
                }
              >
                <div className="px-5 pt-4 pb-2">
                  <div className="flex gap-[3px] h-2.5 rounded-md overflow-hidden bg-panel" role="img" aria-label={funnel.rows.map((r) => `${STAGE_LABELS[r.stage]} ${r.count}`).join(", ")}>
                    {funnel.rows
                      .filter((r) => r.count > 0)
                      .map((r) => (
                        <div key={r.stage} className={STAGE_SWATCH[r.stage]} style={{ flex: `${r.count} 1 0` }} />
                      ))}
                  </div>
                </div>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-1 px-1.5 pb-2.5">
                  {funnel.rows.map((r) => (
                    <Link
                      key={r.stage}
                      href={`/w/${slug}?section=candidates&stage=${r.stage}`}
                      className="rounded-lg px-3.5 py-3 hover:bg-panel transition-colors"
                    >
                      <div className="flex items-center gap-1.5 text-[13px] text-muted">
                        <span className={`w-[7px] h-[7px] rounded-sm ${STAGE_SWATCH[r.stage]}`} aria-hidden />
                        {STAGE_LABELS[r.stage]}
                      </div>
                      <div className="text-[22px] font-semibold tabular-nums mt-1 text-fg">{r.count}</div>
                      <div className="text-xs text-subtle mt-0.5">
                        {r.conversion === null ? (r.stage === ACTIVE_STAGES[0] ? "Entry stage" : "No one yet") : `${r.conversion}% reached`}
                      </div>
                    </Link>
                  ))}
                </div>
              </Card>
            </div>

            <div className="flex flex-col gap-6 min-w-0">
              <Card title="Upcoming interviews">
                {data.upcoming.length === 0 ? (
                  <div className="px-5 py-6 flex flex-col items-start gap-3">
                    <p className="text-sm text-muted">No live interviews scheduled.</p>
                    <ButtonLink href={`/interview/new?workspaceSlug=${slug}`} icon={Video}>
                      Schedule one
                    </ButtonLink>
                  </div>
                ) : (
                  <ul>
                    {data.upcoming.map((u) => (
                      <li key={u.id} className="border-t border-border first:border-t-0">
                        <Link href={u.href} className="flex gap-3.5 px-5 py-3.5 hover:bg-panel transition-colors">
                          <span className="text-[13px] text-secondary-soft w-[76px] shrink-0 pt-px tabular-nums">
                            {u.at
                              ? new Date(u.at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                              : "No time set"}
                          </span>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-fg truncate">{u.name}</div>
                            <div className="text-[13px] text-muted truncate mt-0.5">{u.detail}</div>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card title="Assessments completed" right={<span className="text-[13px] text-subtle">8 weeks</span>}>
                <div
                  className="h-[150px] flex gap-2.5 items-end px-5 pt-4 pb-3"
                  role="img"
                  aria-label={data.weekly.map((w) => `${w.label}: ${w.count}`).join(", ")}
                >
                  {data.weekly.map((w, i) => (
                    <div key={i} className="flex-1 h-full flex flex-col items-center justify-end gap-1.5" title={`${w.label}: ${w.count}`}>
                      <span className={`text-xs tabular-nums ${i === 7 ? "text-fg" : "text-subtle"}`}>{w.count}</span>
                      <div
                        className={`w-full rounded-t ${i === 7 ? "bg-secondary" : "bg-elevated"}`}
                        style={{ height: `${Math.max(2, (w.count / maxWeek) * 96)}px` }}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between px-5 pb-4 text-xs text-subtle">
                  <span>{data.weekly[0].label}</span>
                  <span>This week</span>
                </div>
              </Card>

              <Card title="Recent activity">
                {data.activity.length === 0 ? (
                  <p className="px-5 py-6 text-sm text-muted">Activity will show here as candidates move through.</p>
                ) : (
                  <ul>
                    {data.activity.map((a) => (
                      <li key={a.id} className="flex justify-between gap-3 px-5 py-3 border-t border-border first:border-t-0 text-[13px] leading-snug">
                        <span className="text-muted min-w-0">
                          <span className="text-fg font-medium">{a.who}</span> {a.what}
                        </span>
                        <span className="text-subtle whitespace-nowrap">{now ? relativeTime(a.at, now) : ""}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
