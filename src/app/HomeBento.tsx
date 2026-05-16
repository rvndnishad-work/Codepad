"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Zap, ShieldCheck, Share2, Code2, ArrowUpRight, Monitor, Laptop, Globe, Cpu, Play, RotateCcw, Loader2 } from "lucide-react";
import { TemplateLogo, templateIcon } from "@/lib/icons";
import RevealOnScroll, { RevealItem } from "@/components/scroll/RevealOnScroll";
import { SpotlightGroup, SpotlightCard } from "@/components/scroll/SpotlightGroup";
import {
  TemplateCardShell,
  CardTitleRow,
  CardSubtitle,
} from "@/components/TemplateCardShell";

type Token = { text: string; className?: string; italic?: boolean };
type CodeLine = { tokens: Token[] };

const CODE_LINES: CodeLine[] = [
  { tokens: [{ text: "// Interviewpad IntelliSense active", className: "text-muted/50", italic: true }] },
  { tokens: [] },
  { tokens: [
    { text: "function", className: "text-purple-400" },
    { text: " " },
    { text: "sum", className: "text-accent" },
    { text: "(a, b) {" },
  ]},
  { tokens: [
    { text: "  " },
    { text: "return", className: "text-purple-400" },
    { text: " a + b;" },
  ]},
  { tokens: [{ text: "}" }] },
  { tokens: [] },
  { tokens: [
    { text: "console", className: "text-blue-400" },
    { text: "." },
    { text: "log", className: "text-accent" },
    { text: "(" },
    { text: "sum", className: "text-accent" },
    { text: "(" },
    { text: "1", className: "text-orange-400" },
    { text: ", " },
    { text: "2", className: "text-orange-400" },
    { text: "));" },
  ]},
];

type Phase = "typing" | "ready" | "running" | "done";

function CodeDemoCard() {
  const totalChars = useMemo(
    () =>
      CODE_LINES.reduce((sum, line, idx) => {
        const lineLen = line.tokens.reduce((s, t) => s + t.text.length, 0);
        return sum + lineLen + (idx < CODE_LINES.length - 1 ? 1 : 0);
      }, 0),
    []
  );

  const [typedChars, setTypedChars] = useState(0);
  const [phase, setPhase] = useState<Phase>("typing");
  const [outputs, setOutputs] = useState<string[]>([]);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const reset = () => {
    clearTimers();
    setTypedChars(0);
    setOutputs([]);
    setPhase("typing");
  };

  const runCode = () => {
    clearTimers();
    setPhase("running");
    setOutputs([]);
    const steps = [
      { text: "› evaluating sum(1, 2)", delay: 280 },
      { text: "3", delay: 720 },
    ];
    steps.forEach((step, i) => {
      const t = setTimeout(() => {
        setOutputs((prev) => [...prev, step.text]);
        if (i === steps.length - 1) {
          const t2 = setTimeout(() => setPhase("done"), 500);
          timersRef.current.push(t2);
        }
      }, step.delay);
      timersRef.current.push(t);
    });
  };

  // Typing driver + auto-loop
  useEffect(() => {
    if (phase === "typing") {
      if (typedChars >= totalChars) {
        const t = setTimeout(() => setPhase("ready"), 350);
        timersRef.current.push(t);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => setTypedChars((c) => c + 1), 32 + Math.random() * 28);
      timersRef.current.push(t);
      return () => clearTimeout(t);
    }
    if (phase === "ready") {
      const t = setTimeout(() => runCode(), 850);
      timersRef.current.push(t);
      return () => clearTimeout(t);
    }
    if (phase === "done") {
      const t = setTimeout(() => reset(), 3200);
      timersRef.current.push(t);
      return () => clearTimeout(t);
    }
  }, [typedChars, totalChars, phase]);

  useEffect(() => () => clearTimers(), []);

  // Compute the visible slice of each line for the current typedChars
  let remaining = typedChars;
  let lastVisibleLine = -1;
  const rendered = CODE_LINES.map((line, i) => {
    const lineLen = line.tokens.reduce((s, t) => s + t.text.length, 0);
    if (remaining <= 0 && i > 0) {
      return { tokens: [] as Token[], complete: false, hasContent: false };
    }
    if (remaining >= lineLen) {
      remaining -= lineLen;
      if (i < CODE_LINES.length - 1 && remaining > 0) remaining -= 1;
      lastVisibleLine = i;
      return { tokens: line.tokens, complete: true, hasContent: line.tokens.length > 0 };
    }
    // partial line
    const partial: Token[] = [];
    let r = remaining;
    for (const t of line.tokens) {
      if (r >= t.text.length) {
        partial.push(t);
        r -= t.text.length;
      } else {
        if (r > 0) partial.push({ ...t, text: t.text.slice(0, r) });
        r = 0;
        break;
      }
    }
    remaining = 0;
    lastVisibleLine = i;
    return { tokens: partial, complete: false, hasContent: partial.length > 0 };
  });

  const isTyping = phase === "typing";
  const isRunning = phase === "running";
  const isDone = phase === "done";
  const canRun = phase === "ready" || phase === "done";

  const statusDot = isRunning
    ? "bg-amber-400 animate-pulse"
    : isDone
    ? "bg-green-400"
    : isTyping
    ? "bg-muted/40"
    : "bg-muted/60";

  return (
    <div className="md:col-span-8 rounded-3xl border border-border bg-surface p-1 overflow-hidden group shadow-2xl hover:border-border-strong transition-colors">
      <div className="bg-panel rounded-[22px] h-full overflow-hidden flex flex-col">
        {/* Browser chrome with Run button */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border/30 bg-surface/50">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/20" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/20" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/20" />
          </div>
          <div className="flex-1 flex justify-center min-w-0">
            <div className="px-3 py-1 rounded-md bg-bg/40 text-[10px] font-mono text-muted flex items-center gap-2 truncate">
              <Globe className="w-3 h-3 shrink-0" />
              <span className="truncate">interviewpad.in/play/sum-function</span>
            </div>
          </div>
          <button
            type="button"
            onClick={isDone ? reset : runCode}
            disabled={!canRun}
            className="flex items-center gap-1.5 text-bg bg-accent font-bold text-[11px] uppercase tracking-wider px-2.5 py-1.5 rounded-md hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shrink-0"
            aria-label={isDone ? "Replay demo" : "Run code"}
          >
            {isRunning ? (
              <>
                Running <Loader2 className="w-3 h-3 animate-spin" />
              </>
            ) : isDone ? (
              <>
                Replay <RotateCcw className="w-3 h-3" />
              </>
            ) : (
              <>
                Run <Play className="w-3 h-3 fill-current" />
              </>
            )}
          </button>
        </div>

        {/* Two-column body: code | console */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-[1.4fr_1fr]">
          {/* Code column */}
          <div className="px-5 py-5 font-mono text-sm md:border-r border-border/30">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted font-bold">
                index.js
              </span>
            </div>
            <div className="space-y-1">
              {CODE_LINES.map((_, i) => {
                const line = rendered[i];
                const isCursorLine = isTyping && i === lastVisibleLine;
                return (
                  <div key={i} className="min-h-[1.5em] leading-[1.5em] whitespace-pre">
                    {line.tokens.map((tok, ti) => (
                      <span
                        key={ti}
                        className={`${tok.className ?? "text-fg"} ${tok.italic ? "italic" : ""}`}
                      >
                        {tok.text}
                      </span>
                    ))}
                    {isCursorLine && (
                      <span
                        aria-hidden
                        className="inline-block w-[7px] h-[1em] align-[-2px] ml-0.5 bg-accent animate-pulse"
                      />
                    )}
                    {!line.hasContent && !isCursorLine && <span>&nbsp;</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Console column */}
          <div className="px-5 py-5 font-mono text-xs bg-bg/30 border-t md:border-t-0 border-border/30">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted font-bold">
                Console
              </span>
              <span className="ml-auto text-[10px] text-muted/60">
                {isTyping ? "idle" : isRunning ? "running" : isDone ? "complete" : "ready"}
              </span>
            </div>
            {outputs.length === 0 ? (
              <div className="text-muted/50 italic">
                {isTyping ? "Waiting for code…" : isRunning ? "Running…" : "Press Run to execute."}
              </div>
            ) : (
              <div className="space-y-1">
                {outputs.map((line, i) => {
                  const isResult = i === outputs.length - 1 && isDone;
                  return (
                    <div
                      key={i}
                      className={isResult ? "text-accent font-black text-base" : "text-muted"}
                    >
                      {line}
                    </div>
                  );
                })}
                {isDone && (
                  <div className="pt-2 mt-2 border-t border-border/30 text-[10px] text-muted/70 uppercase tracking-wider">
                    Returned in 0.04 ms
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const FEATURES = [
  {
    icon: Zap,
    title: "Instant Spin-up",
    body: "Zero install, zero config. From idea to running code in under 2 seconds.",
    color: "#FFE600"
  },
  {
    icon: ShieldCheck,
    title: "Secure Sandbox",
    body: "Fully isolated execution environment. Your code runs locally in your browser.",
    color: "#9DFF00"
  },
  {
    icon: Share2,
    title: "Pro Sharing",
    body: "Public links, forking, and embedding. Build a portfolio of tiny ideas.",
    color: "#FFB800"
  }
];

const QUICK_STARTS = [
  { id: "react", label: "React", desc: "Hooks, JSX, Fast Refresh" },
  { id: "typescript", label: "TypeScript", desc: "Strict Types, TS Config" },
  { id: "javascript", label: "JavaScript", desc: "Modern ES Modules" },
  { id: "vue", label: "Vue 3", desc: "SFC, Composition API" },
];

export default function HomeBento() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        
        {/* Main Feature: Live Preview Lookalike */}
        <CodeDemoCard />

        {/* Side Bento: Stats/Highlight */}
        <RevealOnScroll className="md:col-span-4 grid grid-cols-1 gap-4" stagger={0.12}>
          <RevealItem>
            <div className="rounded-3xl border border-accent/20 bg-accent/5 p-6 flex flex-col justify-between group overflow-hidden relative h-full">
              <div className="absolute -right-4 -bottom-4 opacity-[0.05] transition-transform group-hover:scale-110">
                <Cpu className="w-32 h-32 text-accent" />
              </div>
              <h3 className="text-accent font-black uppercase tracking-widest text-xs mb-2">Engine</h3>
              <p className="text-fg text-xl md:text-2xl font-black leading-tight relative z-10">
                Powered by the <br />
                <span className="text-accent">Sandpack v2</span> <br />
                Runtime.
              </p>
            </div>
          </RevealItem>
          <RevealItem>
            <div className="rounded-3xl border border-border bg-panel p-6 flex flex-col justify-between group hover:border-border-strong transition-colors h-full">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center">
                  <Monitor className="w-5 h-5 text-muted" />
                </div>
                <div className="text-[10px] font-bold text-muted bg-surface px-2 py-0.5 rounded-full uppercase">Stable</div>
              </div>
              <div>
                <div className="text-2xl font-black text-fg italic">PRO</div>
                <div className="text-xs text-muted">Desktop Optimized Editor</div>
              </div>
            </div>
          </RevealItem>
        </RevealOnScroll>

        {/* Feature Matrix — wrapped in SpotlightGroup so the accent glow
            tracks the cursor across all three cards as one light source. */}
        <SpotlightGroup className="md:col-span-12">
          <RevealOnScroll
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
            stagger={0.08}
          >
            {FEATURES.map((f, i) => (
              <RevealItem key={i}>
                <SpotlightCard className="rounded-3xl h-full">
                  <div className="rounded-3xl border border-border bg-panel p-6 hover:bg-elevated hover:border-border-strong transition-colors group h-full">
                    <div className="w-12 h-12 rounded-2xl bg-panel border border-border flex items-center justify-center mb-6 group-hover:scale-110 transition-transform" style={{ borderColor: `${f.color}33` }}>
                      <f.icon className="w-6 h-6" style={{ color: f.color }} />
                    </div>
                    <h4 className="text-fg font-black text-xl mb-2">{f.title}</h4>
                    <p className="text-muted text-sm md:text-base leading-relaxed">{f.body}</p>
                  </div>
                </SpotlightCard>
              </RevealItem>
            ))}
          </RevealOnScroll>
        </SpotlightGroup>

        {/* Quick Starts Title */}
        <RevealOnScroll className="md:col-span-12 mt-12 mb-6">
          <h2 className="text-2xl md:text-3xl font-black text-fg tracking-tight flex items-center gap-3">
            <div className="w-1.5 h-8 bg-accent rounded-full" />
            Popular Starters
          </h2>
        </RevealOnScroll>

        {/* Quick Start Grid */}
        <RevealOnScroll
          className="md:col-span-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          stagger={0.06}
        >
          {QUICK_STARTS.map((q) => (
            <RevealItem key={q.id}>
              <TemplateCardShell
                href={`/play?template=${q.id}`}
                templateId={q.id}
              >
                <CardTitleRow>{q.label}</CardTitleRow>
                <CardSubtitle>{q.desc}</CardSubtitle>
              </TemplateCardShell>
            </RevealItem>
          ))}
        </RevealOnScroll>

      </div>
    </section>
  );
}
