"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Cpu, 
  Database, 
  FolderTree, 
  GitBranch, 
  Globe, 
  KeyRound, 
  Laptop, 
  Layers, 
  Lock, 
  Network, 
  Play, 
  RefreshCw, 
  ShieldCheck, 
  Terminal, 
  Users 
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import RevealOnScroll, { RevealItem } from "@/components/scroll/RevealOnScroll";

type Stage = "vfs" | "yjs" | "sandbox" | "telemetry";

interface StageInfo {
  id: Stage;
  number: string;
  title: string;
  tag: string;
  desc: string;
  metrics: string[];
}

const STAGES: StageInfo[] = [
  {
    id: "vfs",
    number: "01",
    tag: "Isolation",
    title: "Virtual Workspace (VFS)",
    desc: "Every sandbox starts in a virtualized in-memory file system. Your directories, configurations, and files are managed client-side without physical disk read/write delays.",
    metrics: ["In-Memory VFS", "Zero disk-write lag", "Monaco direct mapping"]
  },
  {
    id: "yjs",
    number: "02",
    tag: "Synchronization",
    title: "Real-Time Yjs Protocol",
    desc: "Code updates are serialized into conflict-free replicated data types (CRDTs). Delta changes broadcast instantly peer-to-peer via WebRTC room signaling.",
    metrics: ["Peer delta sync", "< 15ms broadcast latency", "CRDT conflict-free"]
  },
  {
    id: "sandbox",
    number: "03",
    tag: "Sandboxing",
    title: "Strict Browser Sandbox",
    desc: "Compilation executes inside an origin-separated iframe. Configured with strict sandboxing attributes and CSP to block unauthorized cookies, cookies access, and network requests.",
    metrics: ["Blank origin isolation", "Blocked parent context access", "Strict Content Security Policy"]
  },
  {
    id: "telemetry",
    number: "04",
    tag: "Telemetry",
    title: "Space-Time Telemetry",
    desc: "The browser thread profiles performance during compilation, calculating execution time in microseconds and polling heap metrics to measure memory foot-print.",
    metrics: ["V8 Heap heap-size polling", "performance.now() micro-timers", "Estimated footprint diagnostics"]
  }
];

export default function HomeInfographic() {
  const [activeStage, setActiveStage] = useState<Stage>("vfs");
  const reducedMotion = useReducedMotion();

  return (
    <section className="mx-auto max-w-6xl px-4 py-24 relative overflow-hidden">
      {/* Background visual styling */}
      <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[100px] -ml-64 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[120px] -mr-64 pointer-events-none" />

      <div className="relative z-10">
        {/* Title */}
        <RevealOnScroll className="mb-16 text-center" stagger={0.1}>
          <RevealItem>
            <div className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-accent mb-3 bg-accent/10 px-3 py-1.5 rounded-full">
              <Cpu className="w-3.5 h-3.5" />
              Runtime Architecture
            </div>
          </RevealItem>
          <RevealItem>
            <h2 className="text-3xl md:text-5xl font-black text-fg tracking-tight leading-[1.05] max-w-3xl mx-auto">
              How it works: <span className="text-transparent bg-clip-text bg-gradient-to-br from-accent to-accent-soft">zero cloud cost.</span>
            </h2>
          </RevealItem>
          <RevealItem>
            <p className="text-muted text-base md:text-lg leading-relaxed mt-4 max-w-2xl mx-auto">
              Interviewpad builds, executes, synchronizes, and profiles code entirely inside the browser thread. Zero server setup. Perfect privacy. Infinite scale.
            </p>
          </RevealItem>
        </RevealOnScroll>

        {/* Infographic Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Column: Interactive Tab Control Panels */}
          <div className="lg:col-span-5 flex flex-col justify-center gap-3">
            {STAGES.map((stage) => {
              const isActive = activeStage === stage.id;
              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => setActiveStage(stage.id)}
                  className={`text-left rounded-2xl border p-5 transition-all relative overflow-hidden flex gap-4 ${
                    isActive 
                      ? "bg-surface border-accent/30 shadow-[0_4px_20px_-5px_rgba(var(--accent-rgb),0.12)]" 
                      : "bg-bg/40 border-border hover:border-border-strong hover:bg-surface/30"
                  }`}
                >
                  {/* Accent Highlight Indicator */}
                  {isActive && (
                    <motion.div 
                      layoutId="active-accent-bar"
                      className="absolute left-0 top-0 bottom-0 w-1 bg-accent"
                      transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}

                  {/* Stage number */}
                  <div className={`font-mono text-xs font-black select-none ${isActive ? "text-accent" : "text-muted/50"}`}>
                    {stage.number}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                        isActive ? "bg-accent/10 text-accent border border-accent/20" : "bg-muted/10 text-muted/80"
                      }`}>
                        {stage.tag}
                      </span>
                      <h3 className={`font-black text-sm transition-colors ${isActive ? "text-fg" : "text-fg/70"}`}>
                        {stage.title}
                      </h3>
                    </div>
                    {isActive && (
                      <motion.div
                        initial={reducedMotion ? { opacity: 1 } : { opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="pt-2 text-xs text-muted leading-relaxed"
                      >
                        <p>{stage.desc}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-3 pt-3 border-t border-border">
                          {stage.metrics.map((m, i) => (
                            <span key={i} className="inline-flex items-center gap-1 text-[10px] text-muted/80 font-mono">
                              <span className="w-1 h-1 bg-accent rounded-full" />
                              {m}
                            </span>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Column: Visual HUD Simulator Panel */}
          <div className="lg:col-span-7 rounded-3xl border border-border bg-slate-950 p-6 flex flex-col justify-between shadow-2xl relative overflow-hidden min-h-[380px] text-slate-200">
            {/* Background grid overlays for HUD Cockpit */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent pointer-events-none" />

            {/* Simulated Chrome Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4 relative z-10">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500/30" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/30" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/30" />
                </div>
                <span className="text-[10px] uppercase font-mono text-slate-500 tracking-wider">
                  runtime_debugger.sh
                </span>
              </div>
              <div className="text-[10px] font-mono bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-accent flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                LIVE VIEW
              </div>
            </div>

            {/* Centered Dynamic Animation Display */}
            <div className="flex-1 flex items-center justify-center relative z-10">
              <AnimatePresence mode="wait">
                {activeStage === "vfs" && <VFSSimulator key="vfs" />}
                {activeStage === "yjs" && <YjsSimulator key="yjs" />}
                {activeStage === "sandbox" && <SandboxSimulator key="sandbox" />}
                {activeStage === "telemetry" && <TelemetrySimulator key="telemetry" />}
              </AnimatePresence>
            </div>

            {/* Simulator Footer Status bar */}
            <div className="mt-4 pt-3 border-t border-slate-900 flex justify-between text-[9px] font-mono text-slate-500 relative z-10">
              <span>SANDBOXING_LEVEL: MAXIMUM</span>
              <span>COMPILER: V8_SANDPACK_ENGINE v2.20</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Stage 1: VFS Simulator Animation
   ──────────────────────────────────────────────────────────────── */
function VFSSimulator() {
  const [selectedFile, setSelectedFile] = useState<string>("index.js");
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setPulse(p => !p), 2000);
    return () => clearInterval(t);
  }, []);

  const files = [
    { name: "index.js", size: "1.2 KB", type: "code", icon: Terminal },
    { name: "package.json", size: "384 B", type: "config", icon: Database },
    { name: "App.tsx", size: "2.4 KB", type: "code", icon: FolderTree },
    { name: "theme.css", size: "852 B", type: "style", icon: Layers }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="w-full grid grid-cols-1 sm:grid-cols-5 gap-4"
    >
      {/* File Explorer Sidebar Column */}
      <div className="sm:col-span-2 border border-slate-800 bg-slate-950/60 rounded-xl p-3 flex flex-col gap-1.5">
        <div className="text-[9px] font-bold uppercase text-slate-500 tracking-wider mb-1 flex items-center gap-1.5">
          <FolderTree className="w-3 h-3" /> Workspace VFS
        </div>
        {files.map(f => {
          const isSelected = selectedFile === f.name;
          const Icon = f.icon;
          return (
            <button
              key={f.name}
              type="button"
              onClick={() => setSelectedFile(f.name)}
              className={`flex items-center gap-2 p-2 rounded text-left transition-all ${
                isSelected ? "bg-slate-900 border border-slate-800" : "hover:bg-slate-900/40 text-slate-400"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-accent" : "text-slate-500"}`} />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-mono font-bold truncate">{f.name}</div>
                <div className="text-[8px] font-mono text-slate-600 tabular-nums">{f.size}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Editor preview frame */}
      <div className="sm:col-span-3 border border-slate-800 bg-slate-950/40 rounded-xl p-3 flex flex-col justify-between font-mono text-[10px] min-h-[160px]">
        <div>
          <div className="flex items-center justify-between border-b border-slate-900 pb-2 mb-2">
            <span className="text-[8px] uppercase tracking-wider text-slate-500">vfs_buffer: {selectedFile}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          </div>
          {selectedFile === "index.js" && (
            <div className="space-y-1 text-slate-400">
              <div><span className="text-purple-400">import</span> {"{ sum }"} <span className="text-emerald-400">from</span> <span className="text-amber-400">"./App"</span>;</div>
              <div><span className="text-slate-600">// VFS auto-caches files instantly</span></div>
              <div><span className="text-blue-400">console</span>.<span className="text-accent">log</span>(sum(<span className="text-orange-400">1</span>, <span className="text-orange-400">2</span>));</div>
            </div>
          )}
          {selectedFile === "package.json" && (
            <div className="space-y-1 text-slate-400">
              <div>{"{"}</div>
              <div className="pl-3"><span className="text-emerald-400">&quot;name&quot;</span>: <span className="text-amber-400">&quot;codepad-sandbox&quot;</span>,</div>
              <div className="pl-3"><span className="text-emerald-400">&quot;dependencies&quot;</span>: {"{"}</div>
              <div className="pl-6"><span className="text-emerald-400">&quot;react&quot;</span>: <span className="text-amber-400">&quot;^19.0.0&quot;</span></div>
              <div className="pl-3">{"}"}</div>
              <div>{"}"}</div>
            </div>
          )}
          {selectedFile === "App.tsx" && (
            <div className="space-y-1 text-slate-400">
              <div><span className="text-purple-400">export function</span> <span className="text-accent">sum</span>(a, b) {"{"}</div>
              <div className="pl-3"><span className="text-purple-400">return</span> a + b;</div>
              <div>{"}"}</div>
            </div>
          )}
          {selectedFile === "theme.css" && (
            <div className="space-y-1 text-slate-400">
              <div><span className="text-accent">:root</span> {"{"}</div>
              <div className="pl-3"><span className="text-blue-400">--accent-color</span>: <span className="text-amber-400">#FFE600</span>;</div>
              <div className="pl-3"><span className="text-blue-400">--bg-level-1</span>: <span className="text-amber-400">#0a0b10</span>;</div>
              <div>{"}"}</div>
            </div>
          )}
        </div>

        {/* Glow indicator */}
        <div className="mt-2 pt-2 border-t border-slate-900 flex justify-between items-center text-[8px] text-slate-500">
          <span>STATE: MEMORY_CACHED</span>
          <div className="flex items-center gap-1">
            <span className={`w-1 h-1 rounded-full bg-accent ${pulse ? "scale-150 animate-ping" : ""}`} />
            <span>VFS INSTANT READ</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Stage 2: Yjs Collaborative Sync Simulator
   ──────────────────────────────────────────────────────────────── */
function YjsSimulator() {
  const [cursorPos, setCursorPos] = useState({ x: 120, y: 35 });
  const [leadCursorPos, setLeadCursorPos] = useState({ x: 40, y: 70 });
  const [lines, setLines] = useState<string[]>([
    "const room = new Y.Doc();",
    "const code = room.getText('editor');",
    "// Peer connection successfully active",
    "code.insert(0, 'hello world');"
  ]);

  // Animate mock collaborator cursor typing paths
  useEffect(() => {
    let frame = 0;
    const interval = setInterval(() => {
      frame++;
      // Float cursors around realistically
      setCursorPos({
        x: 100 + Math.sin(frame * 0.15) * 45,
        y: 42 + Math.cos(frame * 0.1) * 8
      });
      setLeadCursorPos({
        x: 60 + Math.cos(frame * 0.08) * 35,
        y: 84 + Math.sin(frame * 0.12) * 6
      });
    }, 120);

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="w-full flex flex-col gap-4 font-mono"
    >
      <div className="border border-slate-800 bg-slate-950/60 rounded-xl p-4 relative min-h-[170px] overflow-hidden">
        {/* Network nodes background drawing */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.08]">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <line x1="10%" y1="10%" x2="50%" y2="80%" stroke="#FFF" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="50%" y1="80%" x2="90%" y2="20%" stroke="#FFF" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="10%" y1="10%" x2="90%" y2="20%" stroke="#FFF" strokeWidth="1" />
            <circle cx="10%" cy="10%" r="5" fill="#FFF" />
            <circle cx="50%" cy="80%" r="5" fill="#FFF" />
            <circle cx="90%" cy="20%" r="5" fill="#FFF" />
          </svg>
        </div>

        {/* Code mock with moving real-time synchronized cursors */}
        <div className="space-y-1.5 text-xs text-slate-400 relative z-10">
          {lines.map((l, i) => (
            <div key={i} className="relative select-none leading-5">
              <span className="text-slate-600 text-[9px] inline-block w-4 shrink-0">{i + 1}</span>{" "}
              {l}
            </div>
          ))}
        </div>

        {/* Collaborative Cursor 1: You */}
        <motion.div 
          className="absolute pointer-events-none z-20 flex flex-col items-start gap-1"
          style={{ left: cursorPos.x, top: cursorPos.y }}
          transition={{ type: "spring", stiffness: 120, damping: 14 }}
        >
          {/* Neon typing pointer */}
          <div className="w-0.5 h-4 bg-accent relative">
            <div className="absolute top-0 left-0 w-2 h-2 bg-accent rounded-full -translate-x-[3px] -translate-y-[2px]" />
          </div>
          <span className="bg-accent text-bg text-[7px] font-black px-1 py-0.2 rounded font-sans leading-none uppercase select-none shadow">
            Candidate (You)
          </span>
        </motion.div>

        {/* Collaborative Cursor 2: Lead Dev */}
        <motion.div 
          className="absolute pointer-events-none z-20 flex flex-col items-start gap-1"
          style={{ left: leadCursorPos.x, top: leadCursorPos.y }}
          transition={{ type: "spring", stiffness: 100, damping: 12 }}
        >
          {/* Blue collaborator cursor */}
          <div className="w-0.5 h-4 bg-blue-500 relative">
            <div className="absolute top-0 left-0 w-2 h-2 bg-blue-500 rounded-full -translate-x-[3px] -translate-y-[2px]" />
          </div>
          <span className="bg-blue-500 text-white text-[7px] font-black px-1 py-0.2 rounded font-sans leading-none uppercase select-none shadow">
            Interviewer
          </span>
        </motion.div>
      </div>

      <div className="flex justify-between items-center text-[9px] text-slate-500 border border-slate-900 bg-slate-950/20 px-3 py-2 rounded-lg">
        <span className="flex items-center gap-1">
          <Users className="w-3 h-3 text-accent" />
          <span>PEERS CONNECTED: 2</span>
        </span>
        <span className="flex items-center gap-1.5">
          <Network className="w-3 h-3 text-emerald-500" />
          <span>Yjs Delta Broadcast: ONLINE</span>
        </span>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Stage 3: Sandbox / CSP / Isolation Simulator
   ──────────────────────────────────────────────────────────────── */
function SandboxSimulator() {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="w-full flex flex-col items-center justify-center min-h-[170px] relative font-mono text-[10px]"
    >
      {/* Visual illustration of sandbox secure barrier */}
      <div className="w-full flex items-center justify-between gap-2 max-w-sm">
        
        {/* Left Side: Host Monaco scope */}
        <div className="border border-slate-800 bg-slate-900/60 p-3 rounded-xl flex flex-col items-center gap-1 shrink-0 w-24">
          <Laptop className="w-5 h-5 text-slate-500" />
          <span className="font-bold text-[9px]">HOST SITE</span>
          <span className="text-[7px] text-slate-600 text-center">interviewpad.in</span>
        </div>

        {/* Center line with moving particles representing CSP blocks & isolation */}
        <div className="flex-1 h-0.5 bg-slate-800 relative flex items-center justify-center">
          <div className="absolute w-2 h-2 bg-accent rounded-full animate-ping" />
          <svg className="absolute w-full h-8 overflow-visible" xmlns="http://www.w3.org/2000/svg">
            <motion.circle 
              r="3" 
              fill="#FFE600" 
              initial={{ cx: "5%" }} 
              animate={{ cx: "95%" }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }} 
            />
            <motion.circle 
              r="3" 
              fill="#FFE600" 
              initial={{ cx: "5%" }} 
              animate={{ cx: "95%" }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "linear", delay: 0.5 }} 
            />
            <motion.circle 
              r="3" 
              fill="#FFE600" 
              initial={{ cx: "5%" }} 
              animate={{ cx: "95%" }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "linear", delay: 1 }} 
            />
          </svg>
        </div>

        {/* Right Side: Strictly Sandboxed compilation iframe */}
        <div className="border border-accent/40 bg-accent/5 p-3 rounded-xl flex flex-col items-center gap-1 shrink-0 w-28 relative">
          <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-accent rounded-full flex items-center justify-center shadow">
            <Lock className="w-2.5 h-2.5 text-bg" />
          </div>
          <ShieldCheck className="w-6 h-6 text-accent animate-pulse" />
          <span className="font-bold text-[9px] text-accent">SANDBOX VM</span>
          <span className="text-[7px] text-accent/80 text-center">null_origin iframe</span>
        </div>

      </div>

      {/* Strict Attributes List details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-6 w-full max-w-sm">
        <div className="border border-slate-900 bg-slate-950/60 p-2.5 rounded-lg flex items-start gap-2">
          <KeyRound className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-[9px] uppercase tracking-wider text-slate-300">Sandbox Isolation</div>
            <p className="text-[8px] text-slate-500 leading-tight">sandbox=&quot;allow-scripts&quot; denies cookie and local-storage reads.</p>
          </div>
        </div>
        <div className="border border-slate-900 bg-slate-950/60 p-2.5 rounded-lg flex items-start gap-2">
          <Globe className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-[9px] uppercase tracking-wider text-slate-300">Network Restriction</div>
            <p className="text-[8px] text-slate-500 leading-tight">Content Security Policy (CSP) isolates sockets & outgoing network fetch.</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Stage 4: Performance space-time execution telemetry
   ──────────────────────────────────────────────────────────────── */
function TelemetrySimulator() {
  const [execTime, setExecTime] = useState(0.04);
  const [memoryUsage, setMemoryUsage] = useState(18.2);
  const pointsRef = useRef<number[]>([18.2, 18.22, 18.21, 18.25, 18.23, 18.28, 18.32, 18.3, 18.35, 18.42, 18.4, 18.45]);
  const [points, setPoints] = useState<number[]>([...pointsRef.current]);

  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate real-time ticking performance.now() execution timers
      setExecTime(Number((0.02 + Math.random() * 0.05).toFixed(3)));

      // Oscillate memory footprint slightly representing microsecond memory tracking
      const last = pointsRef.current[pointsRef.current.length - 1];
      const diff = (Math.random() - 0.48) * 0.12;
      const nextVal = Math.min(22.0, Math.max(17.5, Number((last + diff).toFixed(2))));
      
      pointsRef.current.push(nextVal);
      if (pointsRef.current.length > 15) {
        pointsRef.current.shift();
      }
      setPoints([...pointsRef.current]);
      setMemoryUsage(nextVal);
    }, 800);

    return () => clearInterval(interval);
  }, []);

  // Compute SVG line path from points array
  const path = points.map((p, idx) => {
    const x = (idx / (points.length - 1)) * 100;
    // Map p (17.5 to 22.0) to y-axis percent (90 to 10)
    const y = 90 - ((p - 17.5) / (22.0 - 17.5)) * 80;
    return `${x}%,${y}%`;
  }).join(" ");

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="w-full grid grid-cols-1 sm:grid-cols-12 gap-4 font-mono text-[10px]"
    >
      {/* Clock stats tickers column */}
      <div className="sm:col-span-5 flex flex-col gap-3 justify-center">
        {/* Timing HUD */}
        <div className="border border-slate-800 bg-slate-950/60 p-3.5 rounded-xl">
          <div className="text-[8px] uppercase tracking-wider text-slate-500 mb-1 flex items-center justify-between">
            <span>Timing Telemetry</span>
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          </div>
          <div className="text-2xl font-black text-accent tabular-nums flex items-baseline gap-1 leading-none py-1">
            {execTime} <span className="text-xs font-medium text-slate-400">ms</span>
          </div>
          <p className="text-[7.5px] text-slate-500 leading-tight mt-1">CPU execution speed compiled inside strictly isolated V8 engine thread.</p>
        </div>

        {/* Memory HUD */}
        <div className="border border-slate-800 bg-slate-950/60 p-3.5 rounded-xl">
          <div className="text-[8px] uppercase tracking-wider text-slate-500 mb-1 flex items-center justify-between">
            <span>Memory Telemetry</span>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-blue-400 tabular-nums flex items-baseline gap-1 leading-none py-1">
            {memoryUsage} <span className="text-xs font-medium text-slate-400">MB</span>
          </div>
          <p className="text-[7.5px] text-slate-500 leading-tight mt-1">V8 engine heap utilization estimated via browser precision memory channels.</p>
        </div>
      </div>

      {/* Live Oscilloscope Memory footprint graph column */}
      <div className="sm:col-span-7 border border-slate-800 bg-slate-950/40 rounded-xl p-3 flex flex-col min-h-[170px] justify-between">
        <div className="text-[8px] uppercase tracking-wider text-slate-500 border-b border-slate-900 pb-2 mb-2 flex justify-between items-center">
          <span>HEAP_OSCILLOSCOPE_STREAM</span>
          <span className="text-[7.5px] text-slate-600 font-bold">GRID: 0.5 MB</span>
        </div>

        {/* SVG Graph Frame */}
        <div className="flex-1 bg-slate-950 border border-slate-900 rounded-lg relative overflow-hidden p-2 flex items-stretch">
          {/* Oscilloscope Grid drawing overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:16px_16px]" />
          
          <div className="w-full h-full relative z-10 flex items-stretch">
            {/* Draw active line */}
            <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
              {/* Glowing shadow under memory line */}
              <motion.polyline
                fill="none"
                stroke="rgba(96, 165, 250, 0.4)"
                strokeWidth="4"
                points={path}
                className="blur-[2px]"
              />
              {/* Foreground crisp memory line */}
              <motion.polyline
                fill="none"
                stroke="#60a5fa"
                strokeWidth="1.5"
                points={path}
              />
            </svg>
          </div>
        </div>

        <div className="mt-2 pt-2 border-t border-slate-900 flex justify-between text-[8px] text-slate-600">
          <span>TIME RANGE: LAST 12 SEC</span>
          <span>HEAP METRICS: NOMINAL</span>
        </div>
      </div>
    </motion.div>
  );
}
