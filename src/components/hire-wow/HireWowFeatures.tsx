"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Brain, Cpu, Users, Workflow, FileText, ShieldCheck,
  RotateCcw, Eye, Shield, ChevronRight, Check, X, Clipboard,
  AlertTriangle, Zap, Clock, BarChart3, CreditCard, TrendingUp, Activity,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import WowReveal from "@/components/wow/WowReveal";

/* ─── Shared helpers (behavior identical to the classic demos) ─── */
function useAutoLoop(run: () => void, isDone: boolean, delay = 3500) {
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    if (isDone) {
      const t = setTimeout(run, delay);
      timers.current.push(t);
      return () => clearTimeout(t);
    }
  }, [isDone, run, delay]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
}

function ReplayBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute right-4 top-4 z-10 flex items-center gap-1.5 rounded-full border border-[var(--wow-card-border)] bg-[var(--wow-chip)] px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--wow-faint)] backdrop-blur transition hover:border-[#8b93ff] hover:text-[var(--wow-fg)]"
    >
      Replay
      <RotateCcw className="h-3 w-3" />
    </button>
  );
}

function DemoShell({ icon: Icon, label, action, children }: { icon: React.ComponentType<{ className?: string }>; label: string; action: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="relative flex h-full w-full flex-col gap-4 overflow-hidden rounded-3xl border border-[var(--wow-card-border)] bg-[var(--wow-card)] p-5 backdrop-blur-sm md:p-6">
      {action}
      <div className="flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-[#8b93ff]/25 to-[#ff2fb3]/20 text-[#8b93ff]">
          <Icon className="h-4 w-4" />
        </span>
        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--wow-faint)]">{label}</span>
        <span className="ml-auto flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-emerald-500">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> live
        </span>
      </div>
      {children}
    </div>
  );
}

type SectionShellProps = {
  index: number;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  title: string;
  titleAccent: string;
  desc: string;
  bullets: string[];
  children: React.ReactNode;
};

function SectionShell({ index, icon: Icon, title, titleAccent, desc, bullets, children }: SectionShellProps) {
  const isEven = index % 2 === 1;
  const demoWrapRef = useRef<HTMLDivElement>(null);
  const [demoInView, setDemoInView] = useState(false);
  useEffect(() => {
    const el = demoWrapRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => setDemoInView(entry.isIntersecting), {
      threshold: 0.1,
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <WowReveal>
      <div className="group relative overflow-hidden rounded-[2rem] border border-[var(--wow-card-border)] bg-[var(--wow-card)] p-6 backdrop-blur-sm transition-all duration-500 hover:border-[#8b93ff]/50 hover:shadow-[0_24px_80px_-24px_rgba(139,147,255,0.45)] md:p-10">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#8b93ff]/10 opacity-60 blur-[80px] transition-opacity duration-500 group-hover:opacity-100" />
        <div className={`relative z-10 flex flex-col ${isEven ? "md:flex-row-reverse" : "md:flex-row"} items-center gap-8 md:gap-12`}>
          <div className="min-w-0 flex-1 space-y-5">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#8b93ff] to-[#ff2fb3] text-white shadow-[0_8px_24px_-8px_rgba(139,147,255,0.7)]">
                <Icon className="h-5 w-5" />
              </span>
              <span className="rounded-full bg-[#8b93ff]/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#8b93ff]">
                Feature {index + 1}
              </span>
            </div>
            <h3 className="wow-font-display text-3xl leading-[0.95] tracking-tight md:text-4xl">
              {title} <span className="wow-gradient-boss">{titleAccent}</span>
            </h3>
            <p className="max-w-md text-sm leading-relaxed text-[var(--wow-muted)] md:text-base">{desc}</p>
            <ul className="space-y-2.5">
              {bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-[var(--wow-muted)]">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#8b93ff]/10">
                    <ChevronRight className="h-3 w-3 text-[#8b93ff]" />
                  </span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
          <div ref={demoWrapRef} className="flex h-[440px] w-full min-w-0 flex-1">
            {demoInView ? (
              children
            ) : (
              <div className="h-full w-full animate-pulse rounded-3xl border border-[var(--wow-card-border)] bg-[var(--wow-stage)]" aria-hidden />
            )}
          </div>
        </div>
      </div>
    </WowReveal>
  );
}

/* ═══════════════════════════════════════════════════════════════
   1. AI PROCTORING & ANTI-CHEAT
   ═══════════════════════════════════════════════════════════════ */
const PROCTOR_EVENTS = [
  { text: "Session started", severity: "green", icon: Check },
  { text: "Tab blur detected → flagged", severity: "amber", icon: AlertTriangle },
  { text: "Clipboard paste captured + logged", severity: "amber", icon: Clipboard },
  { text: "Focus restored", severity: "green", icon: Eye },
  { text: "Browser DevTools detected", severity: "red", icon: AlertTriangle },
  { text: "Keystroke anomaly: burst typing", severity: "amber", icon: Zap },
];

const TRUST_SCORES = [100, 100, 82, 61, 61, 43, 31];

function ProctoringDemo() {
  const [visibleCount, setVisibleCount] = useState(0);
  const [done, setDone] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };

  const start = useCallback(() => {
    clear();
    setVisibleCount(0);
    setDone(false);
    PROCTOR_EVENTS.forEach((_, i) => {
      const t = setTimeout(() => {
        setVisibleCount(i + 1);
        if (i === PROCTOR_EVENTS.length - 1) {
          const t2 = setTimeout(() => setDone(true), 800);
          timers.current.push(t2);
        }
      }, 700 * (i + 1));
      timers.current.push(t);
    });
  }, []);

  useEffect(() => { start(); return clear; }, [start]);
  useAutoLoop(start, done);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visibleCount]);

  const trust = TRUST_SCORES[visibleCount] ?? 100;
  const sevStyle = {
    green: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    amber: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    red: "bg-red-500/15 text-red-600 dark:text-red-400",
  };
  const trustBar = trust > 70 ? "bg-gradient-to-r from-emerald-400 to-emerald-500" : trust > 40 ? "bg-gradient-to-r from-amber-400 to-amber-500" : "bg-gradient-to-r from-red-400 to-red-500";
  const trustText = trust > 70 ? "text-emerald-600 dark:text-emerald-400" : trust > 40 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400";

  return (
    <DemoShell icon={Shield} label="Live Proctor Feed" action={<ReplayBtn onClick={start} />}>
      <div className="flex items-center gap-3 rounded-2xl border border-[var(--wow-card-border)] bg-[var(--wow-stage)] p-3">
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--wow-faint)]">Trust</span>
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--wow-card-border)]">
          <motion.div
            className={`h-full rounded-full ${trustBar}`}
            animate={{ width: `${trust}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
        <motion.span
          className={`text-lg font-black tabular-nums ${trustText}`}
          key={trust}
          initial={{ scale: 1.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          {trust}%
        </motion.span>
      </div>
      <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
        <AnimatePresence>
          {PROCTOR_EVENTS.slice(0, visibleCount).map((ev, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 rounded-xl border border-[var(--wow-card-border)] bg-[var(--wow-stage)] p-2 text-xs"
            >
              <Clock className="h-3 w-3 shrink-0 text-[var(--wow-faint)]" />
              <span className="font-mono text-[11px] tabular-nums text-[var(--wow-faint)]">00:{String((i + 1) * 4).padStart(2, "0")}</span>
              <span className="flex-1 font-medium text-[var(--wow-fg)]">{ev.text}</span>
              <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold uppercase ${sevStyle[ev.severity as keyof typeof sevStyle]}`}>
                {ev.severity}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </DemoShell>
  );
}

/* ═══════════════════════════════════════════════════════════════
   2. MCP CONSOLE
   ═══════════════════════════════════════════════════════════════ */
const MCP_STEPS = [
  { label: "request", lines: ['{"jsonrpc":"2.0","method":"tools/list"}'] },
  { label: "response", lines: ['{"tools":["grade_code",', ' "analyze_complexity",', ' "check_plagiarism"]}'] },
  { label: "request", lines: ['{"method":"tools/call",', ' "params":{"name":"grade_code",', '  "args":{"lang":"python"}}}'] },
  { label: "result", lines: ['{"score":92,"complexity":"O(n)",', ' "style":"excellent",', ' "suggestion":"Add docstrings"}'] },
];

function McpDemo() {
  const [step, setStep] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [done, setDone] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };

  const start = useCallback(() => {
    clear();
    setStep(0);
    setCharIdx(0);
    setDone(false);
  }, []);

  useEffect(() => { start(); return clear; }, [start]);

  const currentBlock = MCP_STEPS[step];
  const fullText = currentBlock ? currentBlock.lines.join("\n") : "";

  useEffect(() => {
    if (done) return;
    if (!currentBlock) { setDone(true); return; }
    if (charIdx < fullText.length) {
      const t = setTimeout(() => setCharIdx(c => c + 1), 18);
      timers.current.push(t);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      if (step < MCP_STEPS.length - 1) {
        setStep(s => s + 1);
        setCharIdx(0);
      } else {
        setDone(true);
      }
    }, 600);
    timers.current.push(t);
    return () => clearTimeout(t);
  }, [charIdx, step, done, fullText.length, currentBlock]);

  useAutoLoop(start, done);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [step, charIdx]);

  const labelColor: Record<string, string> = {
    request: "text-amber-500",
    response: "text-emerald-500",
    result: "text-[#8b93ff]",
  };

  return (
    <DemoShell icon={Cpu} label="MCP Console" action={<ReplayBtn onClick={start} />}>
      <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1 font-mono text-[11px]">
        {MCP_STEPS.slice(0, step + 1).map((blk, i) => {
          const isCurrent = i === step;
          const shownText = isCurrent ? fullText.slice(0, charIdx) : blk.lines.join("\n");
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="overflow-hidden rounded-2xl border border-[var(--wow-card-border)] bg-black/40 p-3 dark:bg-black/50"
            >
              <div className={`mb-1.5 text-[11px] font-bold uppercase tracking-widest ${labelColor[blk.label] ?? "text-[var(--wow-faint)]"}`}>
                ← {blk.label}
              </div>
              <pre className="whitespace-pre-wrap break-all leading-relaxed text-white/85">
                {shownText}
                {isCurrent && charIdx < fullText.length && (
                  <span className="ml-px inline-block h-[1em] w-[6px] animate-pulse bg-[#ffe600] align-[-2px]" />
                )}
              </pre>
            </motion.div>
          );
        })}
      </div>
    </DemoShell>
  );
}

/* ═══════════════════════════════════════════════════════════════
   3. MULTIPLAYER LIVE CODING
   ═══════════════════════════════════════════════════════════════ */
const PARTICIPANTS = [
  { name: "Alice", initials: "AL", color: "#818CF8", cursorLines: [3, 5, 7] },
  { name: "Bob", initials: "BO", color: "#34D399", cursorLines: [1, 4, 6] },
  { name: "Charlie", initials: "CH", color: "#FBBF24", cursorLines: [2, 8, 3] },
];

const EDITOR_LINES = [
  "function mergeSort(arr) {",
  "  if (arr.length <= 1) return arr;",
  "  const mid = Math.floor(arr.length / 2);",
  "  const left = mergeSort(arr.slice(0, mid));",
  "  const right = mergeSort(arr.slice(mid));",
  "  return merge(left, right);",
  "}",
  "",
  "function merge(a, b) {",
];

function MultiplayerDemo() {
  const [tick, setTick] = useState(0);
  const [chatVisible, setChatVisible] = useState(false);
  const [done, setDone] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };

  const start = useCallback(() => {
    clear();
    setTick(0);
    setChatVisible(false);
    setDone(false);
    for (let i = 1; i <= 3; i++) {
      const t = setTimeout(() => setTick(i), i * 1200);
      timers.current.push(t);
    }
    const t4 = setTimeout(() => setChatVisible(true), 4200);
    const t5 = setTimeout(() => setDone(true), 5500);
    timers.current.push(t4, t5);
  }, []);

  useEffect(() => { start(); return clear; }, [start]);
  useAutoLoop(start, done);

  return (
    <DemoShell icon={Users} label="Multiplayer Room" action={<ReplayBtn onClick={start} />}>
      <div className="flex items-center gap-2">
        {PARTICIPANTS.map((p, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-full border-2 text-[11px] font-bold text-white"
              style={{ background: `${p.color}30`, borderColor: p.color }}
            >
              {p.initials}
            </div>
            <span className="hidden text-[11px] font-bold text-[var(--wow-faint)] sm:inline">{p.name}</span>
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </div>
        ))}
        <div className="ml-auto flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-500">
          <Activity className="h-3 w-3" /> WebRTC
        </div>
      </div>
      <div className="mb-1 min-h-0 flex-1 space-y-0.5 overflow-hidden rounded-2xl border border-[var(--wow-card-border)] bg-black/40 p-3 font-mono text-[11px] dark:bg-black/50">
        {EDITOR_LINES.map((line, li) => {
          const activeCursors = PARTICIPANTS.filter((p, pi) => tick > pi && p.cursorLines[Math.min(tick - 1, 2)] === li + 1);
          return (
            <div key={li} className="relative flex min-h-[1.4em] items-center gap-2">
              <span className="w-4 select-none text-right tabular-nums text-[11px] text-white/25">{li + 1}</span>
              <span className="whitespace-pre text-white/70">{line || " "}</span>
              {activeCursors.map((c, ci) => (
                <motion.div
                  key={ci}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute right-2 flex items-center gap-1"
                >
                  <div className="h-4 w-[2px] animate-pulse" style={{ background: c.color }} />
                  <span className="rounded px-1 text-[11px] font-bold" style={{ color: c.color, background: `${c.color}20` }}>
                    {c.name}
                  </span>
                </motion.div>
              ))}
            </div>
          );
        })}
      </div>
      <div className="flex min-h-[1.75rem] items-center gap-3">
        {tick >= 1 && tick < 3 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1.5 text-[11px] text-[var(--wow-faint)]">
            <span className="font-bold" style={{ color: PARTICIPANTS[0].color }}>Alice</span>
            <span>is typing</span>
            <span className="flex gap-0.5">
              {[0, 1, 2].map(d => (
                <motion.span
                  key={d}
                  className="h-1 w-1 rounded-full bg-current"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 0.8, delay: d * 0.2 }}
                />
              ))}
            </span>
          </motion.div>
        )}
        <AnimatePresence>
          {chatVisible && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 rounded-full border border-[var(--wow-card-border)] bg-[var(--wow-stage)] px-3 py-1.5 text-[11px]"
            >
              <span className="font-bold" style={{ color: PARTICIPANTS[1].color }}>Bob:</span>
              <span className="text-[var(--wow-muted)]">Should we use a min-heap here?</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DemoShell>
  );
}

/* ═══════════════════════════════════════════════════════════════
   4. AUTOMATED GRADING RUNTIMES
   ═══════════════════════════════════════════════════════════════ */
const TESTS = [
  { name: "Valid input handling", pass: true },
  { name: "Edge case: empty array", pass: true },
  { name: "Null pointer guard", pass: true },
  { name: "Performance < 100ms", pass: true },
  { name: "Memory usage < 50MB", pass: true },
  { name: "Concurrent safety", pass: true },
  { name: "SQL injection guard", pass: true },
  { name: "Type coercion edge", pass: false },
];

function GradingDemo() {
  const [ran, setRan] = useState(0);
  const [done, setDone] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };

  const start = useCallback(() => {
    clear();
    setRan(0);
    setDone(false);
    TESTS.forEach((_, i) => {
      const t = setTimeout(() => {
        setRan(i + 1);
        if (i === TESTS.length - 1) {
          const t2 = setTimeout(() => setDone(true), 900);
          timers.current.push(t2);
        }
      }, 450 * (i + 1));
      timers.current.push(t);
    });
  }, []);

  useEffect(() => { start(); return clear; }, [start]);
  useAutoLoop(start, done);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [ran]);

  const passed = TESTS.slice(0, ran).filter(t => t.pass).length;
  const pct = ran > 0 ? (ran / TESTS.length) * 100 : 0;

  return (
    <DemoShell icon={Workflow} label="Test Runner" action={<ReplayBtn onClick={start} />}>
      <div className="flex items-center justify-between">
        <div className="text-sm font-black tabular-nums">
          <span className="text-emerald-500">{passed}</span>
          <span className="text-[var(--wow-faint)]">/{ran > 0 ? TESTS.length : "-"}</span>
          <span className="ml-1 text-[11px] font-bold uppercase text-[var(--wow-faint)]">passed</span>
        </div>
        <span className="rounded-full bg-[#8b93ff]/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#8b93ff] tabular-nums">
          {Math.round(pct)}%
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-[var(--wow-card-border)]">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-[#8b93ff] via-[#ff2fb3] to-[#22d3ee]"
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      </div>
      <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-1">
        <AnimatePresence>
          {TESTS.slice(0, ran).map((test, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 rounded-xl border border-[var(--wow-card-border)] bg-[var(--wow-stage)] p-2 text-xs"
            >
              {test.pass ? (
                <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
              ) : (
                <X className="h-3.5 w-3.5 shrink-0 text-red-500" />
              )}
              <span className={`flex-1 font-medium ${test.pass ? "text-[var(--wow-fg)]" : "text-red-500"}`}>{test.name}</span>
              <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold uppercase ${test.pass ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-red-500/15 text-red-500"}`}>
                {test.pass ? "PASS" : "FAIL"}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </DemoShell>
  );
}

/* ═══════════════════════════════════════════════════════════════
   5. STRUCTURED RUBRICS & DOSSIERS
   ═══════════════════════════════════════════════════════════════ */
const DIMENSIONS = [
  { label: "Code Quality", value: 92, color: "#06B6D4" },
  { label: "Architecture", value: 87, color: "#818CF8" },
  { label: "Performance", value: 95, color: "#34D399" },
  { label: "Communication", value: 78, color: "#FBBF24" },
  { label: "Problem Solving", value: 91, color: "#F472B6" },
];

function RubricsDemo() {
  const [progress, setProgress] = useState(0);
  const [scoreNum, setScoreNum] = useState(0);
  const [done, setDone] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const frameRef = useRef<number | null>(null);

  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
  };

  const start = useCallback(() => {
    clear();
    setProgress(0);
    setScoreNum(0);
    setDone(false);
    const t = setTimeout(() => setProgress(1), 200);
    timers.current.push(t);
    const t2 = setTimeout(() => {
      let current = 0;
      const step = () => {
        current += 2;
        if (current >= 88) { setScoreNum(88); setDone(true); return; }
        setScoreNum(current);
        frameRef.current = requestAnimationFrame(step);
      };
      frameRef.current = requestAnimationFrame(step);
    }, 400);
    timers.current.push(t2);
  }, []);

  useEffect(() => { start(); return clear; }, [start]);
  useAutoLoop(start, done);

  return (
    <DemoShell icon={BarChart3} label="Evaluation Rubric" action={<ReplayBtn onClick={start} />}>
      <div className="relative flex items-center justify-between gap-4 overflow-hidden rounded-2xl border border-[var(--wow-card-border)] bg-[var(--wow-stage)] p-3.5">
        <div>
          <div className="text-3xl font-black tabular-nums text-[#22d3ee] leading-none">
            {scoreNum}<span className="ml-0.5 text-sm font-normal text-[var(--wow-faint)]">/100</span>
          </div>
          <div className="mt-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--wow-faint)]">Overall Score</div>
        </div>
        <div className="text-right">
          <div className="inline-block rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
            Strong Pass
          </div>
          <div className="mt-1 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--wow-faint)]">Dossier generated</div>
        </div>
      </div>
      <div className="space-y-2">
        {DIMENSIONS.map((dim, i) => (
          <div key={i}>
            <div className="mb-1 flex justify-between text-[11px] font-bold">
              <span className="text-[var(--wow-muted)]">{dim.label}</span>
              <span className="tabular-nums text-[var(--wow-fg)]">{progress ? dim.value : 0}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--wow-card-border)]">
              <motion.div
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${dim.color}, ${dim.color}cc)` }}
                initial={{ width: "0%" }}
                animate={{ width: progress ? `${dim.value}%` : "0%" }}
                transition={{ duration: 1.2, delay: i * 0.12, ease: "easeOut" }}
              />
            </div>
          </div>
        ))}
      </div>
      <motion.div
        className="flex justify-center"
        animate={done ? { scale: [1, 1.03, 1] } : {}}
        transition={{ repeat: Infinity, duration: 2 }}
      >
        <span className="flex cursor-default items-center gap-2 rounded-full border border-[#22d3ee]/30 bg-[#22d3ee]/10 px-5 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#22d3ee]">
          <FileText className="h-3.5 w-3.5" />
          Export PDF Dossier
        </span>
      </motion.div>
    </DemoShell>
  );
}

/* ═══════════════════════════════════════════════════════════════
   6. CREDIT-BASED ENTERPRISE ECONOMY
   ═══════════════════════════════════════════════════════════════ */
const USAGE_ITEMS = [
  { name: "React Frontend Screen", credits: 3, icon: TrendingUp },
  { name: "System Design Panel", credits: 5, icon: Activity },
  { name: "Python Automation", credits: 2, icon: Zap },
];

function CreditsDemo() {
  const [creditAnim, setCreditAnim] = useState(0);
  const [visibleItems, setVisibleItems] = useState(0);
  const [spend, setSpend] = useState(0);
  const [done, setDone] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const frameRef = useRef<number | null>(null);

  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
  };

  const start = useCallback(() => {
    clear();
    setCreditAnim(0);
    setVisibleItems(0);
    setSpend(0);
    setDone(false);
    let c = 0;
    const step = () => {
      c += 10;
      if (c >= 750) { setCreditAnim(750); } else { setCreditAnim(c); frameRef.current = requestAnimationFrame(step); }
    };
    frameRef.current = requestAnimationFrame(step);
    USAGE_ITEMS.forEach((_, i) => {
      const t = setTimeout(() => setVisibleItems(i + 1), 1200 + i * 700);
      timers.current.push(t);
    });
    const t3 = setTimeout(() => {
      let s = 0;
      const si = setInterval(() => {
        s += 60;
        if (s >= 2340) { setSpend(2340); clearInterval(si); setDone(true); } else { setSpend(s); }
      }, 20);
      timers.current.push(si as unknown as ReturnType<typeof setTimeout>);
    }, 1800);
    timers.current.push(t3);
  }, []);

  useEffect(() => { start(); return clear; }, [start]);
  useAutoLoop(start, done);

  const gaugePercent = (creditAnim / 1000) * 100;
  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference - (gaugePercent / 100) * circumference;

  return (
    <DemoShell icon={CreditCard} label="Enterprise Billing" action={<ReplayBtn onClick={start} />}>
      <div className="flex flex-1 flex-col items-center justify-center gap-6 sm:flex-row">
        <div className="relative flex h-32 w-32 shrink-0 items-center justify-center">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" fill="none" stroke="var(--wow-card-border)" strokeWidth="8" />
            <motion.circle
              cx="60" cy="60" r="54" fill="none" stroke="url(#wow-credit-grad)" strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              animate={{ strokeDashoffset }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
            <defs>
              <linearGradient id="wow-credit-grad" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#8b93ff" />
                <stop offset="0.55" stopColor="#ff2fb3" />
                <stop offset="1" stopColor="#22d3ee" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="wow-font-display text-2xl tabular-nums">{creditAnim}</span>
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--wow-faint)]">/1000 credits</span>
          </div>
          <div aria-hidden className="absolute inset-0 -z-10 rounded-full bg-[#8b93ff]/15 blur-2xl" />
        </div>
        <div className="w-full min-w-0 flex-1 space-y-2.5">
          <AnimatePresence>
            {USAGE_ITEMS.slice(0, visibleItems).map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 rounded-xl border border-[var(--wow-card-border)] bg-[var(--wow-stage)] p-2.5 text-xs"
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#8b93ff]/10 text-[#8b93ff]">
                  <item.icon className="h-3.5 w-3.5" />
                </span>
                <span className="flex-1 font-medium text-[var(--wow-fg)]">{item.name}</span>
                <span className="font-mono text-[11px] font-bold tabular-nums text-[#8b93ff]">{item.credits} cr</span>
              </motion.div>
            ))}
          </AnimatePresence>
          <div className="mt-1 flex items-center justify-between rounded-2xl border border-[var(--wow-card-border)] bg-[var(--wow-stage)] p-3">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--wow-faint)]">Monthly Spend</span>
            <span className="wow-font-display text-xl tabular-nums">
              ${spend.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </DemoShell>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ASSEMBLY — flowing feature river
   ═══════════════════════════════════════════════════════════════ */
const SECTIONS: Omit<SectionShellProps, "children">[] = [
  {
    index: 0,
    icon: Brain,
    title: "Integrity signals &",
    titleAccent: "session replay",
    desc: "Tab switches, clipboard events and keystroke timing are recorded during an attempt — with the candidate told up front — and surfaced as a timeline your team reads. The system flags; a person decides.",
    bullets: [
      "Trust gauge that moves as signals arrive",
      "Severity-tagged timeline, flagged inline",
      "Full session reconstruction for post-review",
    ],
  },
  {
    index: 1,
    icon: Cpu,
    title: "Model Context",
    titleAccent: "Protocol (MCP)",
    desc: "Point the workspace at your own LLMs and grading pipelines over the open JSON-RPC standard, then discover, invoke and chain those tools like any built-in one.",
    bullets: [
      "Auto-discovery of available grading tools at runtime",
      "Structured JSON responses with complexity and style analysis",
      "Plug in any MCP-compatible model or evaluation server",
    ],
  },
  {
    index: 2,
    icon: Users,
    title: "Multiplayer",
    titleAccent: "interview room",
    desc: "Run the session together: live cursor tracking, in-editor chat, and peer-to-peer WebRTC keeping both sides in sync.",
    bullets: [
      "Multi-cursor editing with participant-colored indicators",
      "Live typing awareness and in-editor chat",
      "Peer-to-peer WebRTC for sub-50ms latency",
    ],
  },
  {
    index: 3,
    icon: Workflow,
    title: "Automated grading",
    titleAccent: "runtimes",
    desc: "Test matrices execute on submission, on our infrastructure. JUnit, Jest, PyTest and custom runners.",
    bullets: [
      "Visual pass/fail timeline with progress tracking",
      "Performance and memory usage constraint checks",
      "Security-focused test cases including injection guards",
    ],
  },
  {
    index: 4,
    icon: FileText,
    title: "Structured rubrics &",
    titleAccent: "scorecards",
    desc: "Score every candidate against the same dimensions, so two interviewers reach comparable numbers — then export the whole scorecard as a PDF.",
    bullets: [
      "Scoring across quality, architecture and performance",
      "Per-dimension breakdown, not a single blended number",
      "One-click PDF export of the full scorecard",
    ],
  },
  {
    index: 5,
    icon: ShieldCheck,
    title: "Credit-based",
    titleAccent: "billing",
    desc: "Screenings are billed as credits on top of seats, tracked live. Set seat bounds, cap workspace limits, and watch spend as it happens.",
    bullets: [
      "Live credit gauge with usage-per-assessment breakdown",
      "Itemized recent usage history with cost tracking",
      "Monthly spend analytics with trend visualization",
    ],
  },
];

const DEMOS = [ProctoringDemo, McpDemo, MultiplayerDemo, GradingDemo, RubricsDemo, CreditsDemo];

function FlowPipe() {
  return (
    <div aria-hidden className="wow-flow-pipe mx-auto h-12 w-8">
      <div className="mx-auto h-full w-px bg-[var(--wow-card-border)]" />
    </div>
  );
}

export default function HireWowFeatures() {
  return (
    <div className="space-y-2">
      <WowReveal>
        <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.3em] text-[#8b93ff]"><Brain className="h-3.5 w-3.5" /> 05 · why teams switch</p>
        <h2 className="wow-font-display mt-3 text-5xl md:text-7xl">SIX SURFACES,<br /><span className="wow-gradient-boss">ALL OF THEM LIVE.</span></h2>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[var(--wow-muted)]">
          Proctoring, challenge authoring, the multiplayer room, grading,
          rubrics and credits. Every demo below is running on this page —
          follow the flow.
        </p>
      </WowReveal>

      <div className="pt-6">
        {SECTIONS.map((section, i) => {
          const Demo = DEMOS[i];
          return (
            <div key={i}>
              {i > 0 && <FlowPipe />}
              <SectionShell {...section}>
                <Demo />
              </SectionShell>
            </div>
          );
        })}
      </div>
    </div>
  );
}
