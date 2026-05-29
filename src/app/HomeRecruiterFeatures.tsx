"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Brain, Cpu, Users, Workflow, FileText, ShieldCheck,
  RotateCcw, Eye, Shield, ChevronRight, Check, X,
  AlertTriangle, Zap, Clock, BarChart3, CreditCard, TrendingUp, Activity,
} from "lucide-react";
import RevealOnScroll from "@/components/scroll/RevealOnScroll";
import { motion, AnimatePresence } from "framer-motion";

/* ─── Shared helpers ─── */
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
      className="absolute top-3 right-3 z-10 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted hover:text-fg bg-surface/80 backdrop-blur border border-border hover:border-border-strong px-2.5 py-1.5 rounded-lg transition-all group/replay"
    >
      Replay
      <RotateCcw className="w-3 h-3 group-hover/replay:rotate-[-360deg] transition-transform duration-500" />
    </button>
  );
}

type SectionShellProps = {
  index: number;
  icon: React.ElementType;
  accent: string;
  title: string;
  titleAccent: string;
  desc: string;
  bullets: string[];
  children: React.ReactNode;
};

function SectionShell({ index, icon: Icon, accent, title, titleAccent, desc, bullets, children }: SectionShellProps) {
  const isEven = index % 2 === 1;
  return (
    <RevealOnScroll>
      <div className="group bg-panel border border-border/80 hover:border-border-strong rounded-3xl p-6 md:p-10 relative overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-500/[0.02]">
        {/* Soft background ambient glow */}
        <div 
          className="absolute -right-32 -top-32 w-96 h-96 rounded-full opacity-[0.01] group-hover:opacity-[0.03] blur-[100px] pointer-events-none transition-all duration-700"
          style={{ background: accent }}
        />
        <div className={`flex flex-col ${isEven ? "md:flex-row-reverse" : "md:flex-row"} gap-8 md:gap-12 items-center relative z-10`}>
          {/* Text side */}
          <div className="flex-1 min-w-0 space-y-5">
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 transition-transform duration-500 group-hover:scale-110"
                style={{ borderColor: `${accent}40`, background: `${accent}12` }}
              >
                <Icon className="w-5 h-5" style={{ color: accent }} />
              </div>
              <div
                className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full"
                style={{ color: accent, background: `${accent}15` }}
              >
                Feature {index + 1}
              </div>
            </div>
            <h3 className="text-2xl md:text-3xl font-black text-fg tracking-tight leading-tight">
              {title} <span style={{ color: accent }}>{titleAccent}</span>
            </h3>
            <p className="text-muted text-sm md:text-base leading-relaxed max-w-md">{desc}</p>
            <ul className="space-y-2.5">
              {bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-muted">
                  <ChevronRight className="w-4 h-4 shrink-0 mt-0.5" style={{ color: accent }} />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
          {/* Demo side */}
          <div className="flex-1 min-w-0 w-full">{children}</div>
        </div>
      </div>
    </RevealOnScroll>
  );
}

/* ═══════════════════════════════════════════════════════════════
   1. AI PROCTORING & ANTI-CHEAT
   ═══════════════════════════════════════════════════════════════ */
const PROCTOR_EVENTS = [
  { text: "Session started", severity: "green", icon: Check },
  { text: "Tab blur detected → flagged", severity: "amber", icon: AlertTriangle },
  { text: "Clipboard paste blocked", severity: "red", icon: X },
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

  // Auto-scroll to bottom of events feed
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visibleCount]);

  const trust = TRUST_SCORES[visibleCount] ?? 100;
  const sevColor = { green: "bg-emerald-500/20 text-emerald-400", amber: "bg-amber-500/20 text-amber-400", red: "bg-red-500/20 text-red-400" };
  const trustColor = trust > 70 ? "text-emerald-400" : trust > 40 ? "text-amber-400" : "text-red-400";

  return (
    <div className="relative bg-surface/50 rounded-2xl border border-border/50 p-6 min-h-[340px] flex flex-col gap-4">
      <ReplayBtn onClick={start} />
      <div>
        <div className="flex items-center gap-2 mb-3.5">
          <Shield className="w-4 h-4 text-red-400" />
          <span className="text-[10px] font-black uppercase tracking-widest text-muted">Live Proctor Feed</span>
        </div>
        {/* Trust Score */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-bg/40 border border-border">
          <span className="text-[10px] font-bold text-muted uppercase">Trust Score</span>
          <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${trust > 70 ? "bg-emerald-500" : trust > 40 ? "bg-amber-500" : "bg-red-500"}`}
              animate={{ width: `${trust}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
          <motion.span
            className={`text-lg font-black tabular-nums ${trustColor}`}
            key={trust}
            initial={{ scale: 1.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            {trust}%
          </motion.span>
        </div>
      </div>
      {/* Events Scroll Area */}
      <div 
        ref={scrollRef} 
        className="space-y-2 h-[160px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-border scroll-smooth"
      >
        <AnimatePresence>
          {PROCTOR_EVENTS.slice(0, visibleCount).map((ev, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 text-xs p-2 rounded-lg bg-bg/30 border border-border/40 hover:bg-bg/50 transition-colors"
            >
              <Clock className="w-3 h-3 text-muted/50 shrink-0" />
              <span className="text-muted/50 tabular-nums text-[10px] font-mono">00:{String((i + 1) * 4).padStart(2, "0")}</span>
              <span className="text-fg flex-1 font-medium">{ev.text}</span>
              <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${sevColor[ev.severity as keyof typeof sevColor]}`}>
                {ev.severity}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
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
    // Block done, move to next step
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

  // Auto-scroll to bottom of MCP console
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [step, charIdx]);

  const labelColor: Record<string, string> = {
    request: "text-amber-400",
    response: "text-emerald-400",
    result: "text-indigo-400",
  };

  return (
    <div className="relative bg-surface/50 rounded-2xl border border-border/50 p-6 min-h-[340px] flex flex-col gap-4">
      <ReplayBtn onClick={start} />
      <div>
        <div className="flex items-center gap-2 mb-3.5">
          <Cpu className="w-4 h-4 text-yellow-400" />
          <span className="text-[10px] font-black uppercase tracking-widest text-muted">MCP Console</span>
        </div>
      </div>
      {/* Scrollable console view port */}
      <div 
        ref={scrollRef} 
        className="font-mono text-[11px] space-y-3 h-[220px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-border scroll-smooth"
      >
        {MCP_STEPS.slice(0, step + 1).map((blk, i) => {
          const isCurrent = i === step;
          const shownText = isCurrent ? fullText.slice(0, charIdx) : blk.lines.join("\n");
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg bg-bg/40 border border-border/40 p-3 overflow-hidden"
            >
              <div className={`text-[9px] font-black uppercase tracking-widest mb-1.5 ${labelColor[blk.label] ?? "text-muted"}`}>
                ← {blk.label}
              </div>
              <pre className="text-fg/80 whitespace-pre-wrap break-all leading-relaxed">
                {shownText}
                {isCurrent && charIdx < fullText.length && (
                  <span className="inline-block w-[6px] h-[1em] align-[-2px] bg-yellow-400 animate-pulse ml-px" />
                )}
              </pre>
            </motion.div>
          );
        })}
      </div>
    </div>
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
    <div className="relative bg-surface/50 rounded-2xl border border-border/50 p-5 min-h-[320px]">
      <ReplayBtn onClick={start} />
      {/* Participant avatars */}
      <div className="flex items-center gap-2 mb-4">
        {PARTICIPANTS.map((p, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black text-white border-2"
              style={{ background: `${p.color}30`, borderColor: p.color }}
            >
              {p.initials}
            </div>
            <span className="text-[10px] font-bold text-muted hidden sm:inline">{p.name}</span>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          </div>
        ))}
        <div className="ml-auto text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
          <Activity className="w-3 h-3" /> WebRTC
        </div>
      </div>
      {/* Editor mock */}
      <div className="font-mono text-[11px] bg-bg/40 border border-border/40 rounded-xl p-3 space-y-0.5 mb-3">
        {EDITOR_LINES.map((line, li) => {
          const activeCursors = PARTICIPANTS.filter((p, pi) => tick > pi && p.cursorLines[Math.min(tick - 1, 2)] === li + 1);
          return (
            <div key={li} className="flex items-center gap-2 min-h-[1.4em] relative">
              <span className="text-muted/30 text-[9px] w-4 text-right tabular-nums select-none">{li + 1}</span>
              <span className="text-fg/70 whitespace-pre">{line || "\u00A0"}</span>
              {activeCursors.map((c, ci) => (
                <motion.div
                  key={ci}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute right-2 flex items-center gap-1"
                >
                  <div className="w-[2px] h-4 animate-pulse rounded-full" style={{ background: c.color }} />
                  <span className="text-[8px] font-bold px-1 rounded" style={{ color: c.color, background: `${c.color}20` }}>
                    {c.name}
                  </span>
                </motion.div>
              ))}
            </div>
          );
        })}
      </div>
      {/* Typing indicator + chat */}
      <div className="flex items-center gap-3">
        {tick >= 1 && tick < 3 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1.5 text-[10px] text-muted">
            <span className="font-bold" style={{ color: PARTICIPANTS[0].color }}>Alice</span>
            <span>is typing</span>
            <span className="flex gap-0.5">
              {[0, 1, 2].map(d => (
                <motion.span
                  key={d}
                  className="w-1 h-1 rounded-full bg-muted"
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
              className="flex items-center gap-2 bg-bg/40 border border-border/40 rounded-lg px-3 py-1.5 text-[10px]"
            >
              <span className="font-black" style={{ color: PARTICIPANTS[1].color }}>Bob:</span>
              <span className="text-fg/70">Should we use a min-heap here?</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
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

  // Auto-scroll to bottom of test cases feed
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [ran]);

  const passed = TESTS.slice(0, ran).filter(t => t.pass).length;
  const pct = ran > 0 ? (ran / TESTS.length) * 100 : 0;

  return (
    <div className="relative bg-surface/50 rounded-2xl border border-border/50 p-6 min-h-[340px] flex flex-col gap-4">
      <ReplayBtn onClick={start} />
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <Workflow className="w-4 h-4 text-purple-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-muted">Test Runner</span>
          </div>
          <div className="text-sm font-black tabular-nums">
            <span className="text-emerald-400">{passed}</span>
            <span className="text-muted">/{ran > 0 ? TESTS.length : "-"}</span>
            <span className="text-muted text-[10px] ml-1">passed</span>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-2 bg-border rounded-full overflow-hidden mb-2">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500"
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        </div>
      </div>
      {/* Test list Scroll Area */}
      <div 
        ref={scrollRef}
        className="space-y-1.5 h-[160px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-border scroll-smooth"
      >
        <AnimatePresence>
          {TESTS.slice(0, ran).map((test, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 text-xs p-2 rounded-lg bg-bg/30 border border-border/40 hover:bg-bg/50 transition-colors"
            >
              {test.pass ? (
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <X className="w-3.5 h-3.5 text-red-400 shrink-0" />
              )}
              <span className={`flex-1 font-medium ${test.pass ? "text-fg/80" : "text-red-400"}`}>{test.name}</span>
              <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${test.pass ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                {test.pass ? "PASS" : "FAIL"}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
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
    // Animate bars over 2 seconds
    const t = setTimeout(() => setProgress(1), 200);
    timers.current.push(t);
    // Counter animation
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
    <div className="relative bg-surface/50 rounded-2xl border border-border/50 p-6 min-h-[340px] flex flex-col gap-4">
      <ReplayBtn onClick={start} />
      <div className="flex items-center gap-2 mb-1">
        <BarChart3 className="w-4 h-4 text-cyan-400" />
        <span className="text-[10px] font-black uppercase tracking-widest text-muted">Evaluation Rubric</span>
      </div>
      {/* Overall score with elegant Pass indicator */}
      <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-bg/40 border border-border/50 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-cyan-500/[0.03] to-transparent pointer-events-none" />
        <div>
          <div className="text-3xl font-black tabular-nums text-cyan-400 leading-none">
            {scoreNum}<span className="text-sm text-muted font-normal ml-0.5">/100</span>
          </div>
          <div className="text-[9px] font-black text-muted uppercase tracking-widest mt-1.5">Overall Score</div>
        </div>
        <div className="text-right">
          <div className="text-emerald-400 text-xs font-black tracking-wide bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20 inline-block uppercase">
            Strong Pass
          </div>
          <div className="text-[9px] font-bold text-muted/60 uppercase tracking-widest mt-1">TOP 3% OF CANDIDATES</div>
        </div>
      </div>
      {/* Dimension bars */}
      <div className="space-y-2.5">
        {DIMENSIONS.map((dim, i) => (
          <div key={i}>
            <div className="flex justify-between text-[10px] font-bold mb-1">
              <span className="text-muted">{dim.label}</span>
              <span className="text-fg tabular-nums">{progress ? dim.value : 0}%</span>
            </div>
            <div className="h-2 bg-border/50 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full shadow-[0_0_8px_rgba(6,182,212,0.15)]"
                style={{ background: dim.color }}
                initial={{ width: "0%" }}
                animate={{ width: progress ? `${dim.value}%` : "0%" }}
                transition={{ duration: 1.2, delay: i * 0.12, ease: "easeOut" }}
              />
            </div>
          </div>
        ))}
      </div>
      {/* Export button */}
      <motion.div
        className="mt-1.5 flex justify-center"
        animate={done ? { scale: [1, 1.03, 1] } : {}}
        transition={{ repeat: Infinity, duration: 2 }}
      >
        <button
          type="button"
          className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/15 border border-cyan-500/20 hover:border-cyan-500/40 px-5 py-2.5 rounded-lg transition-all duration-300 shadow-sm cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5" />
          Export PDF Dossier
        </button>
      </motion.div>
    </div>
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
    // Credit gauge counter
    let c = 0;
    const step = () => {
      c += 10;
      if (c >= 750) { setCreditAnim(750); } else { setCreditAnim(c); frameRef.current = requestAnimationFrame(step); }
    };
    frameRef.current = requestAnimationFrame(step);
    // Usage items
    USAGE_ITEMS.forEach((_, i) => {
      const t = setTimeout(() => setVisibleItems(i + 1), 1200 + i * 700);
      timers.current.push(t);
    });
    // Spend counter
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
    <div className="relative bg-surface/50 rounded-2xl border border-border/50 p-6 min-h-[340px] flex flex-col gap-4 justify-between">
      <ReplayBtn onClick={start} />
      <div className="flex items-center gap-2 mb-1">
        <CreditCard className="w-4 h-4 text-lime-400" />
        <span className="text-[10px] font-black uppercase tracking-widest text-muted">Enterprise Billing</span>
      </div>
      <div className="flex flex-col sm:flex-row items-center gap-6 flex-1 justify-center">
        {/* Circular gauge */}
        <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" className="text-border/40" strokeWidth="8" />
            <motion.circle
              cx="60" cy="60" r="54" fill="none" stroke="#9DFF00" strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              animate={{ strokeDashoffset }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-black tabular-nums text-fg">{creditAnim}</span>
            <span className="text-[9px] font-bold text-muted">/1000 credits</span>
          </div>
        </div>
        {/* Usage + spend */}
        <div className="flex-1 min-w-0 w-full space-y-2.5">
          <AnimatePresence>
            {USAGE_ITEMS.slice(0, visibleItems).map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-xs p-2.5 rounded-lg bg-bg/30 border border-border/40 hover:bg-bg/50 transition-colors"
              >
                <item.icon className="w-3.5 h-3.5 text-lime-400 shrink-0" />
                <span className="flex-1 text-fg/80 font-medium">{item.name}</span>
                <span className="text-[10px] font-black text-lime-400 tabular-nums">{item.credits} cr</span>
              </motion.div>
            ))}
          </AnimatePresence>
          <div className="flex items-center justify-between p-3 rounded-xl bg-bg/40 border border-border/60 mt-1">
            <span className="text-[10px] font-bold text-muted uppercase">Monthly Spend</span>
            <span className="text-lg font-black tabular-nums text-fg">
              ${spend.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN EXPORT
   ═══════════════════════════════════════════════════════════════ */
const SECTIONS: Omit<SectionShellProps, "children">[] = [
  {
    index: 0,
    icon: Brain,
    accent: "#FF3D00",
    title: "AI Proctoring &",
    titleAccent: "Anti-Cheat",
    desc: "Real-time behavioral analysis catches suspicious activity the moment it happens — tab switching, clipboard hijacking, and keystroke anomalies.",
    bullets: [
      "Live trust-score gauge updated per violation event",
      "Severity-tagged timeline with instant visual flagging",
      "Automatic session reconstruction for post-review",
    ],
  },
  {
    index: 1,
    icon: Cpu,
    accent: "#FFE600",
    title: "Model Context",
    titleAccent: "Protocol (MCP)",
    desc: "Connect private LLMs and custom grading pipelines via the open JSON-RPC standard. Discover, invoke, and chain evaluation tools natively.",
    bullets: [
      "Auto-discovery of available grading tools at runtime",
      "Structured JSON responses with complexity and style analysis",
      "Plug in any MCP-compatible model or evaluation server",
    ],
  },
  {
    index: 2,
    icon: Users,
    accent: "#60A5FA",
    title: "Multiplayer",
    titleAccent: "Live Coding Panels",
    desc: "Host collaborative coding sessions with real-time cursor tracking, integrated chat, and zero-latency WebRTC synchronization.",
    bullets: [
      "Multi-cursor editing with participant-colored indicators",
      "Live typing awareness and in-editor chat",
      "Peer-to-peer WebRTC for sub-50ms latency",
    ],
  },
  {
    index: 3,
    icon: Workflow,
    accent: "#E040FB",
    title: "Automated Grading",
    titleAccent: "Runtimes",
    desc: "Execute structured test-case matrices automatically on submission. Support for JUnit, Jest, PyTest and custom runners.",
    bullets: [
      "Visual pass/fail timeline with progress tracking",
      "Performance and memory usage constraint checks",
      "Security-focused test cases including injection guards",
    ],
  },
  {
    index: 4,
    icon: FileText,
    accent: "#00E5FF",
    title: "Structured Rubrics &",
    titleAccent: "Dossiers",
    desc: "Standardize evaluations across five key dimensions with animated scoring breakdowns and one-click PDF export.",
    bullets: [
      "Multi-dimensional scoring: quality, architecture, performance",
      "Animated radar breakdown with per-dimension percentages",
      "Professional PDF dossier generation in one click",
    ],
  },
  {
    index: 5,
    icon: ShieldCheck,
    accent: "#9DFF00",
    title: "Credit-Based",
    titleAccent: "Enterprise Economy",
    desc: "Scalable per-screening billing with real-time credit tracking. Control seat bounds, allocate workspace limits, and manage spending.",
    bullets: [
      "Live credit gauge with usage-per-assessment breakdown",
      "Itemized recent usage history with cost tracking",
      "Monthly spend analytics with trend visualization",
    ],
  },
];

const DEMOS = [ProctoringDemo, McpDemo, MultiplayerDemo, GradingDemo, RubricsDemo, CreditsDemo];

export default function HomeRecruiterFeatures() {
  return (
    <div className="md:col-span-12 pt-16 md:pt-24 mt-16 md:mt-24 border-t border-border/30 space-y-12 md:space-y-16">
      {/* Section heading */}
      <RevealOnScroll className="text-center mb-8">
        <h2 className="text-3xl md:text-4xl font-black text-fg tracking-tight mb-3">
          Enterprise Screening <span className="text-indigo-400">Arsenal</span>
        </h2>
        <p className="text-muted text-base md:text-lg max-w-2xl mx-auto">
          Every tool you need to run world-class technical hiring, built into one platform.
        </p>
      </RevealOnScroll>

      {/* 6 feature sections */}
      {SECTIONS.map((section, i) => {
        const Demo = DEMOS[i];
        return (
          <SectionShell key={i} {...section}>
            <Demo />
          </SectionShell>
        );
      })}
    </div>
  );
}
