"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Zap, ShieldCheck, Share2, Code2, ArrowUpRight, Monitor, Laptop, Globe, Cpu, Play, RotateCcw, Loader2, Brain, Workflow, FileText, Calendar, Users, Briefcase } from "lucide-react";
import { TemplateLogo, templateIcon } from "@/lib/icons";
import RevealOnScroll, { RevealItem } from "@/components/scroll/RevealOnScroll";
import { SpotlightGroup, SpotlightCard } from "@/components/scroll/SpotlightGroup";
import HomeRecruiterFeatures from "./HomeRecruiterFeatures";
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
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-surface/50">
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
          <div className="px-5 py-5 font-mono text-sm md:border-r border-border">
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
          <div className="px-5 py-5 font-mono text-xs bg-bg/30 border-t md:border-t-0 border-border">
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
                  <div className="pt-2 mt-2 border-t border-border text-[10px] text-muted/70 uppercase tracking-wider">
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
    color: "#FFE600"
  },
  {
    icon: ShieldCheck,
    title: "Secure Isolated Runtimes",
    body: "Run sandboxed code in browser-based workers or isolated multi-language virtual machines (Python, Go, Java, Node).",
    color: "#9DFF00"
  },
  {
    icon: Code2,
    title: "Rich Monaco Editor",
    body: "Write code with IntelliSense auto-completion, multi-cursor support, minimaps, and configurable keymaps (VS Code, Vim, Emacs).",
    color: "#FF3D00"
  },
  {
    icon: Share2,
    title: "Instant Sharing & Embeds",
    body: "Generate secure snippets and share live code play sessions with a single click. Embed interactive play sandboxes anywhere.",
    color: "#E040FB"
  },
  {
    icon: Laptop,
    title: "Modern Frontend Runtimes",
    body: "Build stateful client applications using React, Vue, Svelte, or Next.js. Fast Refresh is active and built in natively.",
    color: "#00E5FF"
  },
  {
    icon: Cpu,
    title: "NPM Package Ecosystem",
    body: "Load any public npm module instantaneously. Install client dependencies or backend libraries to build full-scale prototypes.",
    color: "#FFB800"
  }
];

const RECRUITER_FEATURES = [
  {
    icon: Brain,
    title: "AI Proctoring & Anti-Cheat",
    body: "Detect instant block copy-pastes, tab blurs, and browser switches. Reconstruct candidate sessions via step-by-step keystroke playbacks.",
    color: "#FF3D00"
  },
  {
    icon: Cpu,
    title: "Model Context Protocol (MCP)",
    body: "Connect your private LLM prompt engineering, grading files, and customized evaluations. Execute bespoke developer screening agents natively.",
    color: "#FFE600"
  },
  {
    icon: Users,
    title: "Multiplayer Live Coding Panels",
    body: "Host high-performance whiteboard sessions with audio and video integration, zero-latency WebRTC synchronization, and real-time candidate active logs.",
    color: "#60A5FA"
  },
  {
    icon: Workflow,
    title: "Automated Grading Runtimes",
    body: "Establish structured test case matrices with weighted scoring models (JUnit, Jest, PyTest) that execute automatically upon candidate submission.",
    color: "#E040FB"
  },
  {
    icon: FileText,
    title: "Structured Rubrics & Dossiers",
    body: "Standardize post-interview evaluations across multiple dimensions (Code Quality, Architecture, Security, Speed) and export professional PDF reviews.",
    color: "#00E5FF"
  },
  {
    icon: ShieldCheck,
    title: "Credit-Based Enterprise Economy",
    body: "Scalable per-screening billing model designed for growing organizations. Control seat bounds, allocate workspace limits, and purchase custom credit packages.",
    color: "#9DFF00"
  }
];

const QUICK_STARTS = [
  { id: "react", label: "React", desc: "Hooks, JSX, Fast Refresh" },
  { id: "typescript", label: "TypeScript", desc: "Strict Types, TS Config" },
  { id: "javascript", label: "JavaScript", desc: "Modern ES Modules" },
  { id: "vue", label: "Vue 3", desc: "SFC, Composition API" },
];

const RECRUITER_QUICK_STARTS = [
  { id: "react-architect", label: "React Frontend Campaign", desc: "Hooks, state management, layouts" },
  { id: "system-design", label: "System Architecture Live", desc: "Collaborative mock whiteboards" },
  { id: "python-backend", label: "Python Automation Screening", desc: "Algorithms, parsing, auto-grading" },
  { id: "sql-performance", label: "Database Performance Grader", desc: "SQL schemas, optimization, indexing" },
];

function RecruiterDemoCard() {
  const [phase, setPhase] = useState<"analyzing" | "complete">("analyzing");
  const [logs, setLogs] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([
]);

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const startAnalysis = () => {
    clearTimers();
    setPhase("analyzing");
    setLogs([]);
    setScore(0);

    const logSteps = [
      { text: "› Initializing secure sandbox runtime...", delay: 300 },
      { text: "› Running autograders: 6/6 test cases passed.", delay: 1000 },
      { text: "› Hooking Model Context Protocol (MCP) server...", delay: 1800 },
      { text: "› Evaluating code structure & performance...", delay: 2600 },
      { text: "› Analyzing anti-cheat keystroke telemetry...", delay: 3400 },
      { text: "› Dossier generated. Plagiarism Risk: 2%.", delay: 4200 },
    ];

    logSteps.forEach((step, i) => {
      const t = setTimeout(() => {
        setLogs((prev) => [...prev, step.text]);
        if (i === logSteps.length - 1) {
          const t2 = setTimeout(() => {
            setPhase("complete");
            // Animate score count up
            let s = 0;
            const scoreInterval = setInterval(() => {
              s += 2;
              if (s >= 94) {
                setScore(94);
                clearInterval(scoreInterval);
              } else {
                setScore(s);
              }
            }, 15);
          }, 500);
          timersRef.current.push(t2);
        }
      }, step.delay);
      timersRef.current.push(t);
    });
  };

  useEffect(() => {
    startAnalysis();
    return () => clearTimers();
  }, []);

  // Auto-restart loop
  useEffect(() => {
    if (phase === "complete") {
      const t = setTimeout(() => {
        startAnalysis();
      }, 6000);
      timersRef.current.push(t);
      return () => clearTimeout(t);
    }
  }, [phase]);

  return (
    <div className="md:col-span-8 rounded-3xl border border-indigo-500/25 bg-surface p-1 overflow-hidden group shadow-2xl hover:border-indigo-500/40 transition-colors">
      <div className="bg-panel rounded-[22px] h-full overflow-hidden flex flex-col">
        {/* Browser chrome with Run button */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-surface/50">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500/20" />
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500/20" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20" />
          </div>
          <div className="flex-1 flex justify-center min-w-0">
            <div className="px-3 py-1 rounded-md bg-bg/40 text-[10px] font-mono text-muted flex items-center gap-2 truncate">
              <Globe className="w-3 h-3 shrink-0 text-indigo-400" />
              <span className="truncate">interviewpad.in/recruiter/workspace/arvin-dossier</span>
            </div>
          </div>
          <button
            type="button"
            onClick={startAnalysis}
            className="flex items-center gap-1.5 text-white bg-indigo-600 font-bold text-[11px] uppercase tracking-wider px-2.5 py-1.5 rounded-md hover:brightness-95 transition-all shadow-sm shrink-0"
            aria-label="Restart analysis"
          >
            Restart Grader <RotateCcw className="w-3 h-3" />
          </button>
        </div>

        {/* Two-column body: Candidate dossier | Grader Logs */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-[1.2fr_1fr]">
          {/* Left Dossier Column */}
          <div className="px-5 py-5 border-b md:border-b-0 md:border-r border-border flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-[0.18em] text-indigo-400 font-bold">
                  AI Screening Dossier
                </span>
                <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-bold">Active</span>
              </div>

              {/* Candidate Info Card */}
              <div className="flex items-center gap-3 bg-bg/40 border border-border p-3 rounded-xl">
                <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-extrabold text-sm shadow-inner">
                  AN
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-black text-fg truncate">Arvin Nishad</h4>
                  <p className="text-[10px] text-muted truncate">Senior Frontend Architect</p>
                </div>
              </div>

              {/* Stats / Circular indicator */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-bg/20 border border-border p-3 rounded-xl flex flex-col justify-center items-center text-center">
                  <span className="text-[9px] text-muted font-bold uppercase tracking-wider">AI Score</span>
                  <span className={`text-2xl font-black transition-colors ${phase === 'complete' ? 'text-indigo-400' : 'text-muted'}`}>
                    {score}/100
                  </span>
                </div>
                <div className="bg-bg/20 border border-border p-3 rounded-xl flex flex-col justify-center items-center text-center">
                  <span className="text-[9px] text-muted font-bold uppercase tracking-wider">Plagiarism</span>
                  <span className={`text-2xl font-black transition-colors ${phase === 'complete' ? 'text-emerald-400' : 'text-muted'}`}>
                    {phase === 'complete' ? '2%' : '--'}
                  </span>
                </div>
              </div>

              {/* Mini Skill Bar charts */}
              <div className="space-y-2 pt-2">
                <div>
                  <div className="flex justify-between text-[9px] font-bold text-muted uppercase mb-1">
                    <span>Code Correctness</span>
                    <span className="text-fg tabular-nums">{phase === 'complete' ? '98%' : '0%'}</span>
                  </div>
                  <div className="h-1 bg-border rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 transition-all duration-1000" 
                      style={{ width: phase === 'complete' ? '98%' : '0%' }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[9px] font-bold text-muted uppercase mb-1">
                    <span>Performance (Big O)</span>
                    <span className="text-fg tabular-nums">{phase === 'complete' ? '90%' : '0%'}</span>
                  </div>
                  <div className="h-1 bg-border rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-400 transition-all duration-1000" 
                      style={{ width: phase === 'complete' ? '90%' : '0%' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="text-[9px] text-muted/60 mt-4 pt-2 border-t border-border/40 font-mono">
              MCP Grader Node ID: mcp-gpt-4o-grader-02
            </div>
          </div>

          {/* Right Log Console Column */}
          <div className="px-5 py-5 font-mono text-[10px] bg-bg/30 flex flex-col justify-between min-h-[180px]">
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                <span className="text-[9px] uppercase tracking-[0.18em] text-muted font-bold">
                  Autograder Console
                </span>
              </div>
              
              <div className="space-y-1.5 text-slate-400">
                {logs.map((log, index) => (
                  <div key={index} className="leading-relaxed">
                    {log}
                  </div>
                ))}
                {phase === "analyzing" && (
                  <div className="flex items-center gap-1.5 text-indigo-400 font-bold animate-pulse">
                    <span>› Running grading heuristics...</span>
                    <Loader2 className="w-3 h-3 animate-spin" />
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 mt-4 border-t border-border/40 text-[9px] text-muted/50 flex justify-between">
              <span>PROCTORING: ON</span>
              <span>GRADED BY AI</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomeBento() {
  const [persona, setPersona] = useState<"candidate" | "recruiter" | null>(null);

  useEffect(() => {
    // Initial load
    const saved = localStorage.getItem("ipad.persona");
    if (saved === "candidate" || saved === "recruiter") {
      setPersona(saved as "candidate" | "recruiter");
    }

    // Event listener for changes
    const handlePersonaChange = (e: Event) => {
      setPersona((e as CustomEvent).detail);
    };
    window.addEventListener("ipad-persona-change", handlePersonaChange);
    return () => window.removeEventListener("ipad-persona-change", handlePersonaChange);
  }, []);

  const currentFeatures = persona === "recruiter" ? RECRUITER_FEATURES : FEATURES;
  const currentQuickStarts = persona === "recruiter" ? RECRUITER_QUICK_STARTS : QUICK_STARTS;
  const isRecruiter = persona === "recruiter";

  return (
    <section className="mx-auto max-w-6xl px-4 py-20">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        
        {/* Main Feature: Live Preview Lookalike / Recruiter Mock Workspace */}
        {isRecruiter ? <RecruiterDemoCard /> : <CodeDemoCard />}

        {/* Side Bento: Stats/Highlight */}
        <RevealOnScroll className="md:col-span-4 grid grid-cols-1 gap-4" stagger={0.12}>
          <RevealItem>
            <div className={`rounded-3xl border p-6 flex flex-col justify-between group overflow-hidden relative h-full ${
              isRecruiter ? "border-indigo-500/20 bg-indigo-500/5" : "border-accent/20 bg-accent/5"
            }`}>
              <div className="absolute -right-4 -bottom-4 opacity-[0.05] transition-transform group-hover:scale-110">
                <Cpu className={`w-32 h-32 ${isRecruiter ? "text-indigo-400" : "text-accent"}`} />
              </div>
              <h3 className={`font-black uppercase tracking-widest text-xs mb-2 ${
                isRecruiter ? "text-indigo-400" : "text-accent"
              }`}>
                {isRecruiter ? "Billing & Scale" : "Engine"}
              </h3>
              <p className="text-fg text-xl md:text-2xl font-black leading-tight relative z-10">
                {isRecruiter ? (
                  <>
                    Workspace Plan: <br />
                    <span className="text-indigo-400">Enterprise</span> <br />
                    <span className="text-xs text-muted font-bold block mt-1 uppercase">75/100 Screening Credits Free</span>
                  </>
                ) : (
                  <>
                    Powered by the <br />
                    <span className="text-accent">Sandpack v2</span> <br />
                    Runtime.
                  </>
                )}
              </p>
            </div>
          </RevealItem>
          <RevealItem>
            <div className="rounded-3xl border border-border bg-panel p-6 flex flex-col justify-between group hover:border-border-strong transition-colors h-full">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center">
                  {isRecruiter ? <Briefcase className="w-5 h-5 text-indigo-400" /> : <Monitor className="w-5 h-5 text-muted" />}
                </div>
                <div className="text-[10px] font-bold text-muted bg-surface px-2 py-0.5 rounded-full uppercase">
                  {isRecruiter ? "Active" : "Stable"}
                </div>
              </div>
              <div>
                <div className={`text-2xl font-black text-fg italic ${isRecruiter ? "text-indigo-400" : ""}`}>
                  {isRecruiter ? "ATS SYNC" : "PRO"}
                </div>
                <div className="text-xs text-muted">
                  {isRecruiter ? "Greenhouse, Ashby & Lever" : "Desktop Optimized Editor"}
                </div>
              </div>
            </div>
          </RevealItem>
        </RevealOnScroll>

        {/* Feature Matrix — recruiter gets full animated showcase sections,
            candidates get the spotlight card grid */}
        {isRecruiter ? (
          <HomeRecruiterFeatures />
        ) : (
          <SpotlightGroup className="md:col-span-12">
            <RevealOnScroll
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
              stagger={0.08}
            >
              {currentFeatures.map((f, i) => (
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
        )}

        {/* Quick Starts Title */}
        <RevealOnScroll className="md:col-span-12 mt-12 mb-6">
          <h2 className="text-2xl md:text-3xl font-black text-fg tracking-tight flex items-center gap-3">
            <div className={`w-1.5 h-8 rounded-full ${isRecruiter ? "bg-indigo-500" : "bg-accent"}`} />
            {isRecruiter ? "Assessment Templates" : "Popular Starters"}
          </h2>
        </RevealOnScroll>

        {/* Quick Start Grid */}
        <RevealOnScroll
          className="md:col-span-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          stagger={0.06}
        >
          {currentQuickStarts.map((q) => (
            <RevealItem key={q.id}>
              <TemplateCardShell
                href={isRecruiter ? `/dashboard` : `/play?template=${q.id}`}
                templateId={isRecruiter ? "react" : q.id}
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
