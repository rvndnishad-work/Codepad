"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Zap, ShieldCheck, Share2, Code2, Laptop, Globe, Cpu, Play, RotateCcw, Loader2, ArrowRight } from "lucide-react";
import RevealOnScroll, { RevealItem } from "@/components/scroll/RevealOnScroll";
import SectionHeading from "@/components/home/SectionHeading";
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
    { text: "function", className: "text-purple-800 dark:text-purple-400" },
    { text: " " },
    { text: "sum", className: "text-accent" },
    { text: "(a, b) {" },
  ]},
  { tokens: [
    { text: "  " },
    { text: "return", className: "text-purple-800 dark:text-purple-400" },
    { text: " a + b;" },
  ]},
  { tokens: [{ text: "}" }] },
  { tokens: [] },
  { tokens: [
    { text: "console", className: "text-blue-800 dark:text-blue-400" },
    { text: "." },
    { text: "log", className: "text-accent" },
    { text: "(" },
    { text: "sum", className: "text-accent" },
    { text: "(" },
    { text: "1", className: "text-orange-800 dark:text-orange-400" },
    { text: ", " },
    { text: "2", className: "text-orange-800 dark:text-orange-400" },
    { text: "));" },
  ]},
];

type Phase = "typing" | "ready" | "running" | "done";

/**
 * Slice CODE_LINES down to what's visible after `typedChars` characters have
 * been "typed". Pure + module-scoped so the component can memoize it without
 * mutating render-scope variables.
 */
function computeRenderedLines(lines: CodeLine[], typedChars: number) {
  let remaining = typedChars;
  let lastVisibleLine = -1;
  const rendered = lines.map((line, i) => {
    const lineLen = line.tokens.reduce((s, t) => s + t.text.length, 0);
    if (remaining <= 0 && i > 0) {
      return { tokens: [] as Token[], complete: false, hasContent: false };
    }
    if (remaining >= lineLen) {
      remaining -= lineLen;
      if (i < lines.length - 1 && remaining > 0) remaining -= 1;
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
  return { rendered, lastVisibleLine };
}

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
  // The demo only burns timers while on screen — an IntersectionObserver
  // gate keeps the typing/running loop from running forever in a hidden tab
  // section (old behavior: loops even offscreen).
  const cardRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.25 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const reset = useCallback(() => {
    clearTimers();
    setTypedChars(0);
    setOutputs([]);
    setPhase("typing");
  }, [clearTimers]);

  const runCode = useCallback(() => {
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
  }, [clearTimers]);

  // Typing driver + auto-loop (gated on viewport visibility)
  useEffect(() => {
    if (!inView) return;
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
  }, [typedChars, totalChars, phase, inView, runCode, reset]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  // Compute the visible slice of each line for the current typedChars.
  // Pure helper outside render scope keeps mutation out of the render pass
  // and lets us memoize so typing only recomputes when progress changes.
  const { rendered, lastVisibleLine } = useMemo(
    () => computeRenderedLines(CODE_LINES, typedChars),
    [typedChars]
  );

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
    <div
      ref={cardRef}
      className="md:col-span-8 border border-border bg-surface p-1 overflow-hidden group hover:border-border-strong transition-colors"
    >
      <div className="bg-panel h-full overflow-hidden flex flex-col">
        {/* Browser chrome with Run button */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-surface/50">
          {/* Window markers, not macOS traffic lights: three states of the
              same square, reading left to right as the run progresses. */}
          <div className="flex items-center gap-1.5" aria-hidden>
            <span className="h-[6px] w-[6px] bg-border-strong" />
            <span className="h-[6px] w-[6px] bg-border-strong" />
            <span className="h-[6px] w-[6px] bg-accent" />
          </div>
          <div className="flex-1 flex justify-center min-w-0">
            <div className="px-3 py-1 rounded-data bg-bg/40 text-[11px] font-mono text-muted flex items-center gap-2 truncate">
              <Globe className="w-3 h-3 shrink-0" />
              <span className="truncate">interviewpad.in/play/sum-function</span>
            </div>
          </div>
          <button
            type="button"
            onClick={isDone ? reset : runCode}
            disabled={!canRun}
            className="flex items-center gap-1.5 text-bg bg-accent font-bold text-[11px] uppercase tracking-wider px-2.5 py-1.5 rounded-data hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0"
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
          <div className="px-5 py-5 font-mono text-sm md:border-r border-border">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] uppercase tracking-[0.18em] text-muted font-bold">
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
          <div className="px-5 py-5 font-mono text-xs bg-bg/30 border-t md:border-t-0 border-border">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-1.5 h-1.5 ${statusDot}`} />
              <span className="text-[11px] uppercase tracking-[0.18em] text-muted font-bold">
                Console
              </span>
              <span className="ml-auto text-[11px] text-muted/60">
                {isTyping ? "idle" : isRunning ? "running" : isDone ? "complete" : "ready"}
              </span>
            </div>
            {outputs.length === 0 ? (
              <div className="text-muted/50 italic">
                {isTyping ? "Waiting for codeâ€¦" : isRunning ? "Runningâ€¦" : "Press Run to execute."}
              </div>
            ) : (
              <div className="space-y-1">
                {outputs.map((line, i) => {
                  const isResult = i === outputs.length - 1 && isDone;
                  return (
                    <div
                      key={i}
                      className={isResult ? "text-accent font-bold text-base" : "text-muted"}
                    >
                      {line}
                    </div>
                  );
                })}
                {isDone && (
                  <div className="pt-2 mt-2 border-t border-border text-[11px] text-muted/70 uppercase tracking-wider">
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
    title: "Instant Developer Sandbox",
    body: "Zero install, zero config. Run modern frontend & backend runtimes, share secure snippets, and build public portfolios.",
  },
  {
    icon: ShieldCheck,
    title: "Secure Isolated Runtimes",
    body: "Run sandboxed code in browser-based workers or isolated multi-language virtual machines (Python, Go, Java, Node).",
  },
  {
    icon: Code2,
    title: "Rich Monaco Editor",
    body: "Write code with IntelliSense auto-completion, multi-cursor support, minimaps, and configurable keymaps (VS Code, Vim, Emacs).",
  },
  {
    icon: Share2,
    title: "Instant Sharing & Embeds",
    body: "Generate secure snippets and share live code play sessions with a single click. Embed interactive play sandboxes anywhere.",
  },
  {
    icon: Laptop,
    title: "Modern Frontend Runtimes",
    body: "Build stateful client applications using React, Vue, Svelte, or Next.js. Fast Refresh is active and built in natively.",
  },
  {
    icon: Cpu,
    title: "NPM Package Ecosystem",
    body: "Load any public npm module instantaneously. Install client dependencies or backend libraries to build full-scale prototypes.",
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
    <section className="border-b border-border py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4">
      <SectionHeading
        index="04"
        eyebrow="Live demo"
        eyebrowIcon={<Play className="w-3.5 h-3.5" />}
        title="The sandbox,"
        highlight="running right here."
        lede="No screenshots, no video loop. The editor below is the real one, typing and executing on this page."
      />
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">

        {/* Main Feature: Live Preview Lookalike */}
        <CodeDemoCard />

        {/* Side column — two readouts stacked on one rule, no tinted panels. */}
        <RevealOnScroll className="ip-frame grid grid-cols-1 gap-px bg-border md:col-span-4">
          <div className="flex flex-col justify-center gap-3 bg-surface p-6">
            <span className="ip-label ip-label-accent">Engine</span>
            <p className="ip-display ip-display-md text-fg">
              Powered by the <span className="text-accent">Sandpack&nbsp;v2</span> runtime.
            </p>
          </div>
          <Link
            href="/playgrounds"
            className="group flex flex-col justify-center gap-2 bg-surface p-6"
          >
            <span className="ip-label ip-label-fg flex items-center gap-2">
              Starters
              <ArrowRight className="ip-arrow h-3.5 w-3.5" />
            </span>
            <span className="ip-nums text-3xl font-bold leading-none text-fg">30+</span>
            <span className="text-[12.5px] leading-relaxed text-muted">
              Open a playground and ship something in seconds.
            </span>
          </Link>
        </RevealOnScroll>

        {/* Capability matrix — one ruled sheet. The cursor-tracking spotlight
            that used to light these panels is gone: structure carries them. */}
        <RevealOnScroll className="ip-frame grid grid-cols-1 gap-px bg-border md:col-span-12 md:grid-cols-3">
          {FEATURES.map((f, i) => (
            <div key={i} className="flex flex-col gap-4 bg-surface p-6">
              <div className="flex items-center gap-3">
                <span className="ip-index">{String(i + 1).padStart(2, "0")}</span>
                <f.icon className="h-4 w-4 text-subtle" />
                <span className="ip-rule-soft min-w-2 flex-1" aria-hidden />
              </div>
              <h4 className="text-[15px] font-semibold tracking-[-0.015em] text-fg">{f.title}</h4>
              <p className="text-[12.5px] leading-relaxed text-muted">{f.body}</p>
            </div>
          ))}
        </RevealOnScroll>

        {/* Quick Starts Title */}
        <RevealOnScroll className="md:col-span-12 mb-5 mt-14">
          <div className="flex items-center gap-3">
            <span className="ip-index">04.1</span>
            <span className="ip-label ip-label-fg">Popular starters</span>
            <span className="ip-rule min-w-4 flex-1" aria-hidden />
          </div>
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
      </div>
    </section>
  );
}
