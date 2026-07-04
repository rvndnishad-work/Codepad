"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Circle,
  Clock,
  Flame,
  Map as MapIcon,
  Pause,
  Play,
  Plus,
  Sparkles,
  Target,
} from "lucide-react";
import TechSvg from "@/components/TechSvg";
import { techLabel, difficultyClasses } from "@/lib/interview-questions/shared";
import { previousDateString } from "@/lib/prep-journey/shared";
import type { JourneyOverview, JourneyItemView } from "@/lib/prep-journey/query";

const fadeIn = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

function itemHref(item: JourneyItemView): string {
  if (item.itemType === "challenge") return `/challenges/${item.refSlug}`;
  // Prompt Arena is a single-page app (scenarios are picked in-page), so the
  // practice stage links to the Arena rather than a per-scenario route.
  if (item.itemType === "scenario") return `/interview/prompt-practice?scenario=${item.refSlug}`;
  return `/interview-question/${item.refSlug}`;
}

function itemTypeLabel(item: JourneyItemView): string {
  if (item.itemType === "challenge") return "Challenge";
  if (item.itemType === "scenario") return "Prompt Arena";
  return techLabel(item.technology ?? "");
}

export default function PrepTrackerClient({ overview }: { overview: JourneyOverview }) {
  const router = useRouter();
  // Optimistic completion overrides keyed by item id; server truth arrives on
  // router.refresh() and matches, so stale entries are harmless.
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statusBusy, setStatusBusy] = useState(false);

  const isDone = (item: JourneyItemView) => overrides[item.id] ?? item.completed;

  const effectiveItems = useMemo(
    () => overview.items.map((i) => ({ ...i, completed: isDone(i) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [overview.items, overrides],
  );
  const completedCount = effectiveItems.filter((i) => i.completed).length;
  const pct = overview.totalItems > 0 ? Math.round((completedCount / overview.totalItems) * 100) : 0;

  const todayItems = effectiveItems.filter((i) => i.day === overview.currentDay);
  const todayDone = todayItems.filter((i) => i.completed).length;

  const upcoming = useMemo(() => {
    const days: { day: number; items: JourneyItemView[] }[] = [];
    for (let d = overview.currentDay + 1; d <= Math.min(overview.currentDay + 3, overview.totalDays); d++) {
      const items = effectiveItems.filter((i) => i.day === d);
      if (items.length > 0) days.push({ day: d, items });
    }
    return days;
  }, [effectiveItems, overview.currentDay, overview.totalDays]);

  const techProgress = useMemo(() => {
    const map = new Map<string, { total: number; completed: number }>();
    for (const i of effectiveItems) {
      const tech = i.technology ?? "general";
      const e = map.get(tech) ?? { total: 0, completed: 0 };
      e.total += 1;
      if (i.completed) e.completed += 1;
      map.set(tech, e);
    }
    return [...map.entries()]
      .map(([technology, v]) => ({ technology, ...v }))
      .sort((a, b) => b.total - a.total);
  }, [effectiveItems]);

  async function toggleItem(item: JourneyItemView) {
    if (busyId) return;
    const next = !isDone(item);
    setBusyId(item.id);
    setOverrides((o) => ({ ...o, [item.id]: next }));
    try {
      const res = await fetch(`/api/prep-journeys/items/${item.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: next }),
      });
      if (!res.ok) {
        setOverrides((o) => ({ ...o, [item.id]: !next }));
      } else {
        router.refresh();
      }
    } catch {
      setOverrides((o) => ({ ...o, [item.id]: !next }));
    } finally {
      setBusyId(null);
    }
  }

  async function setJourneyStatus(status: "active" | "paused") {
    if (statusBusy) return;
    setStatusBusy(true);
    try {
      const res = await fetch(`/api/prep-journeys/${overview.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) router.refresh();
    } finally {
      setStatusBusy(false);
    }
  }

  const targetDateLabel = overview.targetDate
    ? new Date(overview.targetDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : null;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <Link
          href="/dashboard"
          className="group inline-flex items-center gap-2 text-xs font-bold text-muted hover:text-fg transition-colors duration-200"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1.5 transition-transform duration-200" />
          Dashboard
        </Link>
        <div className="flex items-center gap-2">
          {overview.status === "active" && (
            <button
              onClick={() => setJourneyStatus("paused")}
              disabled={statusBusy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-muted hover:text-fg border border-border hover:border-accent/40 bg-surface/60 transition"
            >
              <Pause className="w-3.5 h-3.5" /> Pause
            </button>
          )}
          {overview.status === "paused" && (
            <button
              onClick={() => setJourneyStatus("active")}
              disabled={statusBusy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 transition"
            >
              <Play className="w-3.5 h-3.5" /> Resume
            </button>
          )}
          <Link
            href="/prep/new"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-muted hover:text-fg border border-border hover:border-accent/40 bg-surface/60 transition"
          >
            <Plus className="w-3.5 h-3.5" /> New journey
          </Link>
        </div>
      </div>

      {/* Title block */}
      <motion.div initial="hidden" animate="visible" variants={fadeIn} className="mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-surface border border-border text-muted mb-3">
          <MapIcon className="w-3.5 h-3.5 text-accent" />
          Prep Journey
        </div>
        <div className="flex items-center flex-wrap gap-3">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">{overview.title}</h1>
          {overview.status === "paused" && (
            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400">
              Paused
            </span>
          )}
          {overview.status === "completed" && (
            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              Completed
            </span>
          )}
        </div>
        <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-2 text-xs font-semibold text-muted">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5" /> Day {overview.currentDay} of {overview.totalDays}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> {overview.dailyMinutes} min/day
          </span>
          {targetDateLabel && (
            <span className="inline-flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" /> Interview {targetDateLabel}
            </span>
          )}
        </div>
      </motion.div>

      {/* Completed celebration */}
      {overview.status === "completed" && (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          className="mb-8 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-6 flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-emerald-500" />
            <div>
              <div className="font-black tracking-tight">Journey complete — every item done. 🎉</div>
              <p className="text-xs text-muted mt-0.5">Keep the momentum with a fresh plan or a harder stack.</p>
            </div>
          </div>
          <Link
            href="/prep/new"
            className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-bg text-xs font-black uppercase tracking-wider hover:bg-accent-soft transition"
          >
            Start a new journey <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT: today + upcoming + per-tech */}
        <div className="lg:col-span-8 space-y-6">
          {/* Today's session */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="rounded-2xl border border-border bg-surface/70 dark:bg-surface/20 backdrop-blur-sm shadow-sm overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
              <div>
                <h2 className="text-sm font-black uppercase tracking-[0.15em]">
                  Today&apos;s session — Day {overview.currentDay}
                </h2>
                <p className="text-xs text-muted mt-0.5 font-semibold">
                  {todayDone}/{todayItems.length} done · ~
                  {todayItems.reduce((s, i) => s + i.estMinutes, 0)} min planned
                </p>
              </div>
              {/* Mini day-progress dots */}
              <div className="flex items-center gap-1">
                {todayItems.map((i) => (
                  <span
                    key={i.id}
                    className={`w-1.5 h-1.5 rounded-full ${i.completed ? "bg-emerald-500" : "bg-border"}`}
                  />
                ))}
              </div>
            </div>

            <div className="p-3">
              {todayItems.map((item) => (
                <div
                  key={item.id}
                  className={`group flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${
                    item.completed ? "opacity-60" : "hover:bg-elevated/60"
                  }`}
                >
                  <button
                    onClick={() => toggleItem(item)}
                    disabled={busyId === item.id}
                    aria-label={item.completed ? "Mark incomplete" : "Mark complete"}
                    className="shrink-0 text-muted hover:text-emerald-500 transition-colors"
                  >
                    {item.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>
                  <div className="shrink-0 grid place-items-center w-9 h-9 rounded-lg border border-border bg-bg/40">
                    <TechSvg tech={item.technology ?? ""} className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={itemHref(item)}
                      className={`text-sm font-bold leading-snug hover:text-accent transition-colors ${
                        item.completed ? "line-through decoration-muted/50" : ""
                      }`}
                    >
                      {item.title}
                    </Link>
                    <div className="flex items-center gap-2 mt-1 text-[10px] font-bold text-muted">
                      <span className="uppercase tracking-wider">{itemTypeLabel(item)}</span>
                      <span>·</span>
                      <span>~{item.estMinutes} min</span>
                    </div>
                  </div>
                  {item.difficulty && (
                    <span
                      className={`shrink-0 text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${difficultyClasses(item.difficulty)}`}
                    >
                      {item.difficulty}
                    </span>
                  )}
                  <Link
                    href={itemHref(item)}
                    className="shrink-0 opacity-0 group-hover:opacity-100 text-muted hover:text-accent transition-all"
                    aria-label="Open"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ))}
              {todayItems.length === 0 && (
                <p className="px-3 py-6 text-sm text-muted text-center">Nothing scheduled — you&apos;re all caught up.</p>
              )}
            </div>
          </motion.div>

          {/* Upcoming days */}
          {upcoming.length > 0 && (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="rounded-2xl border border-border bg-surface/70 dark:bg-surface/20 backdrop-blur-sm shadow-sm p-6"
            >
              <h2 className="text-xs font-black uppercase tracking-[0.15em] text-muted mb-4">Up next</h2>
              <div className="space-y-4">
                {upcoming.map(({ day, items }) => (
                  <div key={day} className="flex gap-4">
                    <div className="shrink-0 w-12 text-center">
                      <div className="text-[9px] font-black uppercase tracking-wider text-muted/60">Day</div>
                      <div className="text-lg font-black text-fg/80">{day}</div>
                    </div>
                    <div className="min-w-0 flex-1 space-y-1 pt-0.5">
                      {items.map((i) => (
                        <div key={i.id} className="flex items-center gap-2 text-xs text-muted font-semibold truncate">
                          <TechSvg tech={i.technology ?? ""} className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{i.title}</span>
                          <span className="shrink-0 text-muted/50">· {i.estMinutes}m</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Per-tech progress */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="rounded-2xl border border-border bg-surface/70 dark:bg-surface/20 backdrop-blur-sm shadow-sm p-6"
          >
            <h2 className="text-xs font-black uppercase tracking-[0.15em] text-muted mb-4">Stack coverage</h2>
            <div className="space-y-3.5">
              {techProgress.map((t) => {
                const p = t.total > 0 ? Math.round((t.completed / t.total) * 100) : 0;
                return (
                  <div key={t.technology} className="flex items-center gap-3">
                    <TechSvg tech={t.technology} className="w-5 h-5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between text-xs font-bold mb-1">
                        <span>{techLabel(t.technology)}</span>
                        <span className="text-muted">
                          {t.completed}/{t.total}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-bg border border-border overflow-hidden">
                        <div
                          className="h-full rounded-full bg-accent transition-all duration-500"
                          style={{ width: `${p}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* RIGHT: ring + streak + heatmap + plan */}
        <aside className="lg:col-span-4 space-y-5 lg:sticky lg:top-6">
          {/* Progress ring */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="rounded-2xl border border-border bg-surface/70 dark:bg-surface/20 backdrop-blur-sm shadow-sm p-6 flex flex-col items-center"
          >
            <ProgressRing pct={pct} />
            <div className="text-xs font-bold text-muted mt-3">
              {completedCount} of {overview.totalItems} items complete
            </div>
            <div className="grid grid-cols-2 gap-3 w-full mt-5">
              <div className="rounded-xl border border-border bg-bg/40 p-3 text-center">
                <div className="flex items-center justify-center gap-1 text-lg font-black">
                  <Flame className={`w-4 h-4 ${overview.streak > 0 ? "text-orange-500" : "text-muted/40"}`} />
                  {overview.streak}
                </div>
                <div className="text-[9px] font-black uppercase tracking-wider text-muted mt-0.5">Day streak</div>
              </div>
              <div className="rounded-xl border border-border bg-bg/40 p-3 text-center">
                <div className="text-lg font-black">
                  {overview.minutesToday}
                  <span className="text-xs text-muted font-bold">/{overview.dailyMinutes}m</span>
                </div>
                <div className="text-[9px] font-black uppercase tracking-wider text-muted mt-0.5">Today</div>
              </div>
            </div>
          </motion.div>

          {/* Activity heatmap */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="rounded-2xl border border-border bg-surface/70 dark:bg-surface/20 backdrop-blur-sm shadow-sm p-5"
          >
            <h3 className="text-xs font-black uppercase tracking-wider text-muted mb-3">Last 12 weeks</h3>
            <Heatmap activity={overview.activity} today={overview.today} />
          </motion.div>

          {/* Plan details */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="rounded-2xl border border-border bg-surface/70 dark:bg-surface/20 backdrop-blur-sm shadow-sm p-5 space-y-3"
          >
            <h3 className="text-xs font-black uppercase tracking-wider text-muted">Plan</h3>
            <div className="flex flex-wrap gap-1.5">
              {overview.techStack.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border border-border bg-bg/40 text-[10px] font-bold"
                >
                  <TechSvg tech={t} className="w-3.5 h-3.5" />
                  {techLabel(t)}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-muted leading-relaxed font-semibold pt-1 border-t border-border">
              <Check className="w-3 h-3 inline mr-1 text-emerald-500" />
              Items auto-complete when you mark questions solved or pass a challenge — anywhere on the site.
            </p>
          </motion.div>
        </aside>
      </div>
    </div>
  );
}

function ProgressRing({ pct }: { pct: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative w-32 h-32">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="10" className="stroke-border" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          className="stroke-accent transition-all duration-700"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="text-2xl font-black">{pct}%</div>
        </div>
      </div>
    </div>
  );
}

function Heatmap({
  activity,
  today,
}: {
  activity: { date: string; minutes: number }[];
  today: string;
}) {
  const byDate = new Map(activity.map((a) => [a.date, a.minutes]));
  // 12 weeks ending today, oldest first.
  const days: string[] = [];
  let cursor = today;
  for (let i = 0; i < 84; i++) {
    days.unshift(cursor);
    cursor = previousDateString(cursor);
  }
  const weeks: string[][] = [];
  for (let w = 0; w < 12; w++) weeks.push(days.slice(w * 7, w * 7 + 7));

  const cellStyle = (date: string): React.CSSProperties => {
    const m = byDate.get(date) ?? 0;
    if (m <= 0) return {};
    const alpha = m >= 30 ? 0.9 : m >= 15 ? 0.55 : 0.3;
    return { background: `rgba(var(--accent-rgb), ${alpha})` };
  };

  return (
    <div className="flex gap-1">
      {weeks.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-1">
          {week.map((date) => (
            <div
              key={date}
              title={`${date}: ${byDate.get(date) ?? 0} min`}
              className={`w-3 h-3 rounded-[3px] border ${date === today ? "border-accent" : "border-border/60"} bg-bg/60`}
              style={cellStyle(date)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
