"use client";

import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  Bot,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardList,
  Clock,
  FileCode2,
  Inbox,
  Plus,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Upload,
  Users,
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

export function Card({ title, subtitle, right, children, className = "" }: {
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-border bg-surface min-w-0 flex flex-col ${className}`}>
      {title && (
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-fg">{title}</h2>
            {subtitle && <p className="text-[13px] text-subtle mt-0.5">{subtitle}</p>}
          </div>
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

type Tone = "secondary" | "warning" | "success" | "danger";
const TONE: Record<Tone, { chip: string; text: string; stroke: string; fill: string }> = {
  secondary: { chip: "bg-secondary/15 text-secondary-soft", text: "text-secondary-soft", stroke: "var(--c-accent-2)", fill: "var(--c-accent-2)" },
  warning: { chip: "bg-warning/15 text-warning", text: "text-warning", stroke: "var(--c-warning)", fill: "var(--c-warning)" },
  success: { chip: "bg-success/15 text-success", text: "text-success", stroke: "var(--c-success)", fill: "var(--c-success)" },
  danger: { chip: "bg-danger/15 text-danger", text: "text-danger", stroke: "var(--c-danger)", fill: "var(--c-danger)" },
};

const GROW = "transition-[width,height,stroke-dashoffset,opacity] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none";

/** Tiny trend line for a KPI card: eight weekly counts, oldest first. */
function Sparkline({ values, tone, ready }: { values: number[]; tone: Tone; ready: boolean }) {
  const w = 96;
  const h = 32;
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - 3 - (v / max) * (h - 6)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const id = `spark-${useId().replace(/:/g, "")}`;
  const c = TONE[tone].stroke;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden className="hidden sm:block overflow-visible shrink-0">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={`rgb(${c})`} stopOpacity="0.28" />
          <stop offset="100%" stopColor={`rgb(${c})`} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${w},${h} L0,${h} Z`} fill={`url(#${id})`} className={GROW} style={{ opacity: ready ? 1 : 0 }} />
      <path
        d={line}
        fill="none"
        stroke={`rgb(${c})`}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray="1"
        className={GROW}
        style={{ strokeDashoffset: ready ? 0 : 1 }}
      />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.5" fill={`rgb(${c})`} />
    </svg>
  );
}

function Kpi({ icon: Icon, tone, label, value, sub, trend, href, ready }: {
  icon: typeof Plus;
  tone: Tone;
  label: string;
  value: number;
  sub: ReactNode;
  trend: number[];
  href?: string;
  ready: boolean;
}) {
  const body = (
    <>
      <div className="flex items-center gap-2.5">
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${TONE[tone].chip}`} aria-hidden>
          <Icon className="w-4 h-4" />
        </span>
        <span className="text-[13px] font-medium text-muted leading-tight">{label}</span>
      </div>
      <div className="flex items-end justify-between gap-3 mt-4">
        <div className="text-[32px] leading-none font-semibold tracking-[-0.03em] tabular-nums text-fg">{value}</div>
        <Sparkline values={trend} tone={tone} ready={ready} />
      </div>
      <div className="text-[13px] text-subtle mt-3">{sub}</div>
    </>
  );
  const cls = "block rounded-xl border border-border bg-surface p-4 sm:p-5 min-w-0";
  return href ? (
    <Link href={href} className={`${cls} hover:border-border-strong transition-colors`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

function SummaryChip({ tone, count, label }: { tone: Tone; count: number; label: string }) {
  const quiet = count === 0;
  return (
    <span
      className={`inline-flex items-center gap-2 h-8 px-3 rounded-full border text-[13px] ${
        quiet ? "border-border text-subtle" : "border-border-strong bg-bg/40 text-fg"
      }`}
    >
      <span className={`w-2 h-2 rounded-full ${quiet ? "bg-elevated" : tone === "warning" ? "bg-warning" : tone === "danger" ? "bg-danger" : "bg-secondary"}`} aria-hidden />
      <span className="font-semibold tabular-nums">{count}</span> {label}
    </span>
  );
}

const AVATAR_TONES = ["bg-secondary/15 text-secondary-soft", "bg-success/15 text-success", "bg-warning/15 text-warning", "bg-elevated text-fg"];

function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = ((parts[0]?.[0] ?? "?") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return (
    <span
      className={`shrink-0 rounded-full flex items-center justify-center font-semibold ${AVATAR_TONES[h % AVATAR_TONES.length]}`}
      style={{ width: size, height: size, fontSize: size <= 28 ? 12 : 13 }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

const ATTENTION_ICON = { "take-home": FileCode2, screening: Bot, clock: Clock, interview: Video } as const;
const KIND: Record<AttentionItem["kind"], { tone: Tone; label: string; filter: string }> = {
  review: { tone: "warning", label: "Needs review", filter: "Reviews" },
  expiring: { tone: "danger", label: "Expiring", filter: "Expiring" },
  interview: { tone: "secondary", label: "Today", filter: "Interviews" },
};

function AttentionCard({ items, now, className }: { items: AttentionItem[]; now: Date | null; className?: string }) {
  const [filter, setFilter] = useState<AttentionItem["kind"] | "all">("all");
  const kinds = (Object.keys(KIND) as AttentionItem["kind"][]).filter((k) => items.some((i) => i.kind === k));
  const shown = items.filter((i) => filter === "all" || i.kind === filter);
  return (
    <Card
      title="Needs your attention"
      subtitle={items.length ? `${plural(items.length, "item")}, oldest first` : "Nothing waiting"}
      className={className}
      right={
        kinds.length > 1 ? (
          <div className="hidden sm:flex items-center gap-1 p-0.5 rounded-lg bg-panel" role="group" aria-label="Filter">
            {(["all", ...kinds] as const).map((k) => {
              const on = filter === k;
              const n = k === "all" ? items.length : items.filter((i) => i.kind === k).length;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setFilter(k)}
                  aria-pressed={on}
                  className={`h-7 px-2.5 rounded-md text-[13px] transition-colors ${on ? "bg-elevated text-fg" : "text-muted hover:text-fg"}`}
                >
                  {k === "all" ? "All" : KIND[k].filter} <span className="text-subtle tabular-nums">{n}</span>
                </button>
              );
            })}
          </div>
        ) : undefined
      }
    >
      {shown.length === 0 ? (
        <div className="px-5 py-10 flex flex-col items-center text-center gap-2">
          <span className="w-10 h-10 rounded-full bg-success/15 text-success flex items-center justify-center" aria-hidden>
            <Check className="w-5 h-5" strokeWidth={2.25} />
          </span>
          <p className="text-sm font-medium text-fg">You are all caught up</p>
          <p className="text-[13px] text-muted">New submissions and expiring links will show here.</p>
        </div>
      ) : (
        <ul>
          {shown.slice(0, 6).map((item) => {
            const Icon = ATTENTION_ICON[item.icon];
            const kind = KIND[item.kind];
            return (
              <li
                key={item.id}
                className="grid grid-cols-[32px_minmax(0,1fr)_auto] md:grid-cols-[32px_minmax(0,1fr)_128px_84px_auto] items-center gap-3 md:gap-4 px-5 py-3 border-t border-border first:border-t-0 hover:bg-panel/50 transition-colors"
              >
                <Avatar name={item.name} />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-fg truncate">{item.name}</div>
                  <div className="flex items-center gap-1.5 text-[13px] text-muted mt-0.5 min-w-0">
                    <Icon className="w-3.5 h-3.5 shrink-0 text-subtle" aria-hidden />
                    <span className="truncate">{item.detail}</span>
                  </div>
                </div>
                <span className={`hidden md:inline-flex justify-self-start items-center h-6 px-2 rounded-md text-xs font-medium whitespace-nowrap ${TONE[kind.tone].chip}`}>
                  {kind.label}
                </span>
                <span className="hidden md:inline text-[13px] text-subtle whitespace-nowrap">{now ? relativeTime(item.at, now) : ""}</span>
                <Link
                  href={item.href}
                  className="justify-self-end h-8 inline-flex items-center gap-1 px-3 rounded-lg border border-border text-[13px] font-medium text-fg hover:bg-panel hover:border-border-strong transition-colors whitespace-nowrap"
                >
                  {item.action}
                  <ChevronRight className="w-3.5 h-3.5 text-subtle" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {shown.length > 6 && (
        <div className="px-5 py-3 border-t border-border text-[13px] text-subtle">Showing 6 of {shown.length}</div>
      )}
    </Card>
  );
}

function UpcomingCard({ items, slug, className }: { items: { id: string; at: string | null; name: string; detail: string; href: string }[]; slug: string; className?: string }) {
  return (
    <Card
      title="Upcoming interviews"
      subtitle={items.length ? `Next ${plural(items.length, "session")}` : undefined}
      className={className}
    >
      {items.length === 0 ? (
        <div className="px-5 py-8 flex flex-col items-center text-center gap-3">
          <span className="w-10 h-10 rounded-full bg-secondary/15 text-secondary-soft flex items-center justify-center" aria-hidden>
            <CalendarDays className="w-5 h-5" />
          </span>
          <p className="text-sm text-muted">No live interviews scheduled.</p>
          <ButtonLink href={`/interview/new?workspaceSlug=${slug}`} icon={Video}>
            Schedule one
          </ButtonLink>
        </div>
      ) : (
        <ul className="p-2">
          {items.map((u) => {
            const d = u.at ? new Date(u.at) : null;
            return (
              <li key={u.id}>
                <Link href={u.href} className="flex items-center gap-3.5 px-3 py-2.5 rounded-lg hover:bg-panel transition-colors">
                  <span
                    className={`w-11 h-12 shrink-0 rounded-lg border flex flex-col items-center justify-center leading-none ${
                      d ? "border-secondary/30 bg-secondary/10" : "border-dashed border-border-strong"
                    }`}
                  >
                    {d ? (
                      <>
                        <span className="text-xs font-medium text-secondary-soft">{d.toLocaleDateString("en-GB", { month: "short" })}</span>
                        <span className="text-[17px] font-semibold text-fg mt-1 tabular-nums">{d.getDate()}</span>
                      </>
                    ) : (
                      <CalendarDays className="w-4 h-4 text-subtle" aria-hidden />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-fg truncate">{u.name}</div>
                    <div className="text-[13px] text-muted truncate mt-0.5">{u.detail}</div>
                    <div className="text-xs text-subtle mt-0.5 tabular-nums">
                      {d ? d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "No time set"}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function FunnelRows({ rows, slug, ready }: { rows: ReturnType<typeof stageFunnel>["rows"]; slug: string; ready: boolean }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <ul className="px-2 py-2">
      {rows.map((r) => (
        <li key={r.stage}>
          <Link
            href={`/w/${slug}/candidates?stage=${r.stage}`}
            className="grid grid-cols-[96px_minmax(0,1fr)_36px_72px] items-center gap-3 px-3 py-2 rounded-lg hover:bg-panel transition-colors"
          >
            <span className="flex items-center gap-2 text-[13px] text-muted truncate">
              <span className={`w-2 h-2 rounded-sm shrink-0 ${STAGE_SWATCH[r.stage]}`} aria-hidden />
              {STAGE_LABELS[r.stage]}
            </span>
            <span className="h-6 rounded-md bg-panel overflow-hidden" aria-hidden>
              <span
                className={`block h-full rounded-md ${STAGE_SWATCH[r.stage]} ${GROW}`}
                style={{ width: ready ? `${r.count === 0 ? 0 : Math.max(3, (r.count / max) * 100)}%` : "0%" }}
              />
            </span>
            <span className="text-sm font-semibold text-fg tabular-nums text-right">{r.count}</span>
            <span className="text-xs text-subtle text-right whitespace-nowrap">
              {r.conversion === null ? (r.stage === ACTIVE_STAGES[0] ? "Entry" : "No one yet") : `${r.conversion}% reached`}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Delta({ series }: { series: number[] }) {
  const cur = series[series.length - 1] ?? 0;
  const prev = series[series.length - 2] ?? 0;
  if (cur === prev) return <span className="text-[13px] text-subtle">Flat vs last week</span>;
  const up = cur > prev;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 h-6 px-2 rounded-md text-xs font-medium ${up ? "bg-success/15 text-success" : "bg-danger/15 text-danger"}`}>
      <Icon className="w-3.5 h-3.5" aria-hidden />
      {up ? "+" : ""}
      {cur - prev} vs last week
    </span>
  );
}

function AreaChart({ points }: { points: { label: string; count: number }[] }) {
  // Drawn close to its on-screen size so 12px labels stay 12px.
  const W = 440;
  const H = 240;
  const pad = { l: 30, r: 16, t: 16, b: 30 };
  const max = Math.max(4, ...points.map((p) => p.count));
  const step = Math.ceil(max / 4);
  const top = step * 4;
  const x = (i: number) => pad.l + (i / (points.length - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / top) * (H - pad.t - pad.b);
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.count).toFixed(1)}`).join(" ");
  const [hover, setHover] = useState<number | null>(null);
  const c = "var(--c-accent-2)";
  return (
    <div className="px-3 pt-3 pb-2">
      <svg
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={points.map((p) => `${p.label}: ${p.count}`).join(", ")}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="ov-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={`rgb(${c})`} stopOpacity="0.32" />
            <stop offset="100%" stopColor={`rgb(${c})`} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4].map((g) => (
          <g key={g}>
            <line x1={pad.l} x2={W - pad.r} y1={y(g * step)} y2={y(g * step)} stroke="rgb(var(--c-border))" strokeDasharray={g ? "3 4" : undefined} />
            <text x={pad.l - 8} y={y(g * step) + 4} textAnchor="end" fontSize="12" fill="rgb(var(--c-subtle))">
              {g * step}
            </text>
          </g>
        ))}
        <path d={`${line} L${x(points.length - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill="url(#ov-area)" />
        <path d={line} fill="none" stroke={`rgb(${c})`} strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <g key={i}>
            <rect
              x={x(i) - (W - pad.l - pad.r) / (points.length - 1) / 2}
              y={pad.t}
              width={(W - pad.l - pad.r) / (points.length - 1)}
              height={H - pad.t - pad.b}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
            {hover === i && <line x1={x(i)} x2={x(i)} y1={pad.t} y2={y(0)} stroke="rgb(var(--c-border-strong))" />}
            <circle
              cx={x(i)}
              cy={y(p.count)}
              r={hover === i || i === points.length - 1 ? 4.5 : 3}
              fill={i === points.length - 1 || hover === i ? `rgb(${c})` : "rgb(var(--c-surface))"}
              stroke={`rgb(${c})`}
              strokeWidth="2"
              pointerEvents="none"
            />
            {hover === i && (
              <g pointerEvents="none">
                <rect x={Math.min(Math.max(x(i) - 44, pad.l), W - pad.r - 88)} y={Math.max(y(p.count) - 44, 0)} width="88" height="32" rx="6" fill="rgb(var(--c-elevated))" stroke="rgb(var(--c-border-strong))" />
                <text x={Math.min(Math.max(x(i), pad.l + 44), W - pad.r - 44)} y={Math.max(y(p.count) - 23, 21)} textAnchor="middle" fontSize="12" fill="rgb(var(--c-fg))">
                  {p.label}: {p.count}
                </text>
              </g>
            )}
            {(i % 2 === 1 || i === points.length - 1) && (
              <text x={x(i)} y={H - 8} textAnchor={i === points.length - 1 ? "end" : "middle"} fontSize="12" fill={i === points.length - 1 ? "rgb(var(--c-fg))" : "rgb(var(--c-subtle))"}>
                {p.label}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

function ActivityTimeline({ items, now }: { items: { id: string; who: string; what: string; at: string }[]; now: Date | null }) {
  if (items.length === 0) return <p className="px-5 py-8 text-sm text-muted text-center">Activity will show here as candidates move through.</p>;
  return (
    <ol className="px-5 py-3">
      {items.map((a, i) => (
        <li key={a.id} className="relative flex gap-3.5 py-2.5">
          {i < items.length - 1 && <span aria-hidden className="absolute left-[13.5px] top-[38px] bottom-[-10px] w-px bg-border" />}
          <Avatar name={a.who} size={28} />
          <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center justify-between gap-x-3 gap-y-0.5 pt-[3px]">
            <span className="text-[13px] text-muted min-w-0">
              <span className="text-fg font-medium">{a.who}</span> {a.what}
            </span>
            <span className="text-xs text-subtle whitespace-nowrap">{now ? relativeTime(a.at, now) : ""}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}

const SCORE_TONE = ["bg-success", "bg-secondary", "bg-warning", "bg-danger"];

function ScoresCard({ scores, slug, growth, ready, className }: {
  scores: { count: number; average: number | null; buckets: { label: string; count: number }[] };
  slug: string;
  growth: boolean;
  ready: boolean;
  className?: string;
}) {
  const max = Math.max(1, ...scores.buckets.map((b) => b.count));
  return (
    <Card
      title="AI screening scores"
      subtitle={scores.count ? `${plural(scores.count, "finished screening")}` : undefined}
      className={className}
    >
      {scores.count === 0 ? (
        <div className="px-5 py-8 flex flex-col items-center text-center gap-3">
          <span className="w-10 h-10 rounded-full bg-secondary/15 text-secondary-soft flex items-center justify-center" aria-hidden>
            <Bot className="w-5 h-5" />
          </span>
          <p className="text-sm text-muted">Scores show here once candidates finish an AI screening.</p>
          <ButtonLink href={growth ? `/w/${slug}/ai-interviews` : `/w/${slug}?section=billing`}>
            {growth ? "Start a screening" : "See plans"}
          </ButtonLink>
        </div>
      ) : (
        <div className="p-5 flex flex-col gap-5">
          <div className="flex items-baseline gap-2">
            <span className="text-[32px] leading-none font-semibold tracking-[-0.03em] tabular-nums text-fg">{scores.average}</span>
            <span className="text-[13px] text-muted">average score out of 100</span>
          </div>
          <ul className="flex flex-col gap-3">
            {scores.buckets.map((b, i) => (
              <li key={b.label} className="grid grid-cols-[80px_minmax(0,1fr)_24px] items-center gap-3 text-[13px]">
                <span className="text-muted">{b.label}</span>
                <span className="h-2 rounded-full bg-panel overflow-hidden" aria-hidden>
                  <span className={`block h-full rounded-full ${SCORE_TONE[i]} ${GROW}`} style={{ width: ready ? `${(b.count / max) * 100}%` : "0%" }} />
                </span>
                <span className="text-fg font-medium tabular-nums text-right">{b.count}</span>
              </li>
            ))}
          </ul>
          <Link href={`/w/${slug}/ai-interviews`} className="inline-flex items-center gap-1 text-[13px] font-medium text-secondary-soft hover:text-fg transition-colors">
            Open AI screening <ArrowRight className="w-3.5 h-3.5" aria-hidden />
          </Link>
        </div>
      )}
    </Card>
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
  const weeklyTotal = data.weekly.reduce((n, w) => n + w.count, 0);
  const byKind = { review: 0, expiring: 0, interview: 0 };
  for (const a of data.attention) byKind[a.kind] += 1;
  // Bars and lines grow in once mounted; reduced motion skips the transition.
  const ready = now !== null;

  const summary = "Five steps to your first hiring loop.";

  return (
    <div className="flex flex-col gap-6">
      <TrialBanner plan={plan} slug={slug} />

      <section
        className="relative overflow-hidden rounded-2xl border border-border bg-surface px-5 py-6 md:px-8 md:py-7"
        style={{
          backgroundImage:
            "radial-gradient(520px 220px at 0% 0%, rgb(var(--c-accent-2) / 0.24), transparent 70%), radial-gradient(460px 220px at 100% 120%, rgb(var(--c-accent-2) / 0.12), transparent 70%)",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage: "radial-gradient(rgb(var(--c-border-strong) / 0.55) 1px, transparent 1px)",
            backgroundSize: "18px 18px",
            maskImage: "linear-gradient(to left, black, transparent 60%)",
            WebkitMaskImage: "linear-gradient(to left, black, transparent 60%)",
          }}
        />
        <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div>
            <div className="text-[13px] text-muted min-h-[1.4em]">
              {now ? now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }) : ""}
            </div>
            <h1 className="mt-1 text-2xl md:text-[28px] font-semibold tracking-[-0.02em] text-fg min-h-[1.3em]">
              {isNew ? "Set up your workspace" : hello ? `${hello}${firstName ? `, ${firstName}` : ""}` : "Overview"}
            </h1>
            {isNew ? (
              <p className="mt-1.5 text-[15px] text-muted">{summary}</p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                <SummaryChip tone="warning" count={byKind.review} label="to review" />
                <SummaryChip tone="danger" count={byKind.expiring} label={byKind.expiring === 1 ? "link expiring" : "links expiring"} />
                <SummaryChip tone="secondary" count={byKind.interview} label={byKind.interview === 1 ? "interview today" : "interviews today"} />
              </div>
            )}
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
      </section>

      {isNew ? (
        <SetupView {...props} />
      ) : (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
            <Kpi
              icon={Users}
              tone="secondary"
              label="Active candidates"
              value={k.active}
              trend={data.trends.added}
              sub={k.addedThisWeek > 0 ? <><span className="text-success font-medium">+{k.addedThisWeek}</span> added this week</> : "None added this week"}
              href={`/w/${slug}/candidates`}
              ready={ready}
            />
            <Kpi
              icon={Inbox}
              tone="warning"
              label="Waiting for review"
              value={k.toReview}
              trend={data.trends.completed}
              sub={k.reviewOverdue > 0 ? <span className="text-warning">{k.reviewOverdue} older than 48 h</span> : "All submitted recently"}
              ready={ready}
            />
            <Kpi
              icon={Video}
              tone="secondary"
              label="Upcoming interviews"
              value={k.upcomingInterviews}
              trend={data.trends.interviews}
              sub={`${k.interviewsThisWeek} finished this week`}
              ready={ready}
            />
            <Kpi
              icon={Award}
              tone="success"
              label="Offers out"
              value={k.offers}
              trend={data.trends.hired}
              sub={`${plural(k.hiredThisMonth, "hire")} in the last 30 days`}
              href={`/w/${slug}/candidates?stage=OFFER`}
              ready={ready}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <AttentionCard items={data.attention} now={now} className="xl:col-span-8" />
            <UpcomingCard items={data.upcoming} slug={slug} className="xl:col-span-4" />

            <Card
              title="Hiring funnel"
              subtitle="Where every candidate stands today"
              right={
                <Link href={`/w/${slug}/candidates?view=board`} className="text-[13px] text-secondary-soft hover:text-fg transition-colors">
                  Open board
                </Link>
              }
              className="xl:col-span-7"
            >
              <FunnelRows rows={funnel.rows} slug={slug} ready={ready} />
              <div className="flex items-center justify-between px-5 py-3 border-t border-border text-[13px] text-muted">
                <span>
                  <span className="text-fg font-medium tabular-nums">{funnel.active}</span> in the funnel
                </span>
                <Link href={`/w/${slug}/candidates?stage=REJECTED`} className="inline-flex items-center gap-1.5 hover:text-fg transition-colors">
                  <span className="w-2 h-2 rounded-sm bg-danger" aria-hidden />
                  {funnel.rejected} rejected
                </Link>
              </div>
            </Card>

            <Card
              title="Assessments completed"
              subtitle={`${weeklyTotal} in the last 8 weeks`}
              right={<Delta series={data.trends.completed} />}
              className="xl:col-span-5"
            >
              <AreaChart points={data.weekly} />
            </Card>

            <Card title="Recent activity" className="xl:col-span-8">
              <ActivityTimeline items={data.activity} now={now} />
            </Card>

            <ScoresCard scores={data.scores} slug={slug} growth={plan.growthFeatures} ready={ready} className="xl:col-span-4" />
          </div>
        </>
      )}
    </div>
  );
}
