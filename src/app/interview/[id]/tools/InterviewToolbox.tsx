"use client";

/**
 * Room toolbox for live interviews. The interviewer switches tools on from
 * the dock and presents one on the shared stage; the candidate follows.
 * Tools: whiteboard, code pad, shared notes, question card, ranking board
 * and a shared timer. Content is shared through useToolsRoom.
 */
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTheme } from "next-themes";
import {
  Check,
  Code2,
  Eye,
  ListOrdered,
  Loader2,
  MessageSquareText,
  Minimize2,
  NotebookPen,
  Pause,
  PenTool,
  Play,
  Radio,
  RotateCcw,
  Send,
  SlidersHorizontal,
  Timer as TimerIcon,
  Trash2,
  X,
} from "lucide-react";
import { ASK_EVENT, CODE_LANGS, TOOLS, TOOL_BY_ID, defaultTools, timerRemaining, type CodeLang, type ToolId, type ToolsState } from "@/lib/interview/tools";
import { useToolsRoom, type ToolsRoom } from "./useToolsRoom";
import SharedEditor from "./SharedEditor";
import { TOOL_ICON } from "./icons";
import RankingBoard from "./RankingBoard";

const Whiteboard = dynamic(() => import("./Whiteboard"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center text-[13px] text-muted gap-2">
      <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> Loading the whiteboard
    </div>
  ),
});


const spring = { type: "spring" as const, stiffness: 520, damping: 36, mass: 0.7 };

export default function InterviewToolbox({
  sessionId,
  roomKey,
  token,
  interviewer,
  meName,
  format,
  guideQuestions = [],
}: {
  sessionId: string;
  roomKey: string | null;
  token: string | null;
  interviewer: boolean;
  meName: string;
  format: string | null;
  guideQuestions?: string[];
}) {
  const me = useMemo(() => ({ name: meName, interviewer }), [meName, interviewer]);
  const room = useToolsRoom({ sessionId, token, roomKey, me });
  const { state, act, live } = room;
  const isInterviewer = (room.role ?? (interviewer ? "interviewer" : "candidate")) === "interviewer";
  const readOnly = !live;
  const [view, setView] = useState<ToolId | null>(null);
  const [picker, setPicker] = useState(false);
  const [timerOpen, setTimerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reduce = useReducedMotion();
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme !== "light";

  // Follow what the interviewer presents.
  const lastPresented = useRef<ToolId | null | undefined>(undefined);
  useEffect(() => {
    if (!state) return;
    if (lastPresented.current !== state.presented) {
      const first = lastPresented.current === undefined;
      lastPresented.current = state.presented;
      if (!first || state.presented) setView(state.presented);
    }
    if (view && !state.enabled.includes(view)) setView(null);
  }, [state, view]);

  const run = useCallback(
    async (a: Parameters<ToolsRoom["act"]>[0]) => {
      const err = await act(a);
      if (err) {
        setError(err);
        setTimeout(() => setError(null), 3500);
      }
    },
    [act],
  );

  // "Show to candidate" from the interviewer guide.
  useEffect(() => {
    if (!isInterviewer) return;
    const on = (e: Event) => {
      const text = (e as CustomEvent<string>).detail;
      if (typeof text === "string" && text.trim()) void run({ type: "question", text });
    };
    window.addEventListener(ASK_EVENT, on);
    return () => window.removeEventListener(ASK_EVENT, on);
  }, [isInterviewer, run]);

  // Esc minimises the stage, unless a menu on top of it takes the key first
  // or the whiteboard is using it to drop a tool.
  useEffect(() => {
    if (!view || picker || timerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented && !(e.target as HTMLElement)?.closest?.(".excalidraw, [role=dialog]")) setView(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [view, picker, timerOpen]);

  if (!state) return null;
  const stageTools = state.enabled.filter((t) => TOOL_BY_ID[t].stage);
  const hasTimer = state.enabled.includes("timer") && !!state.timer;
  if (!isInterviewer && stageTools.length === 0 && !hasTimer) return null;

  const openTool = (t: ToolId) => {
    if (isInterviewer && !readOnly) {
      if (state.presented !== t) return void run({ type: "present", tool: t });
    }
    setView((v) => (v === t ? null : t));
  };

  const toggleTool = (t: ToolId, on: boolean) => {
    if (!on) return void run({ type: "enable", tool: t, on: false });
    if (t === "timer") return void run(state.timer ? { type: "enable", tool: "timer", on: true } : { type: "timer", op: "set", seconds: 10 * 60 });
    void run({ type: "present", tool: t });
  };

  return (
    <>
      <AnimatePresence>
        {view && (
          <motion.div
            key="dim"
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[109] bg-bg/70 backdrop-blur-[2px]"
            onClick={() => setView(null)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {view && (
          <motion.section
            key="stage"
            role="region"
            aria-label={`${TOOL_BY_ID[view].label}, shared with ${isInterviewer ? "the candidate" : "your interviewer"}`}
            initial={reduce ? false : { opacity: 0, y: 24, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: 24, scale: 0.985 }}
            transition={spring}
            className="fixed z-[110] inset-x-2 top-2 bottom-[76px] md:inset-x-6 md:top-5 md:bottom-[88px] rounded-2xl border border-border-strong bg-surface shadow-2xl shadow-black/40 flex flex-col overflow-hidden"
          >
            <StageHeader
              tool={view}
              state={state}
              isInterviewer={isInterviewer}
              readOnly={readOnly}
              room={room}
              onMinimise={() => setView(null)}
              onStop={() => void run({ type: "present", tool: null })}
            />
            <div className="flex-1 min-h-0 relative">
              {view === "whiteboard" && <Whiteboard doc={room.doc} awareness={room.awareness} dark={dark} readOnly={readOnly} />}
              {view === "code" && <CodePad room={room} dark={dark} readOnly={readOnly} />}
              {view === "notes" && (
                <SharedEditor
                  key={`notes-${dark}`}
                  text={room.doc.getText("notes")}
                  awareness={room.awareness}
                  language="markdown"
                  prose
                  dark={dark}
                  readOnly={readOnly}
                  label="Shared notes"
                  placeholder={isInterviewer ? "A shared page. Write a prompt here, or let the candidate draft an answer, a plan or an email." : "Write here. Your interviewer sees it as you type."}
                />
              )}
              {view === "question" && <QuestionCard state={state} isInterviewer={isInterviewer} readOnly={readOnly} guideQuestions={guideQuestions} run={run} />}
              {view === "ranking" && <RankingBoard doc={room.doc} interviewer={isInterviewer} readOnly={readOnly} />}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <div className="fixed z-[111] bottom-3 md:bottom-4 left-1/2 -translate-x-1/2 max-w-[calc(100vw-24px)]">
        <AnimatePresence>
          {picker && isInterviewer && (
            <ToolPicker state={state} format={format} readOnly={readOnly} onToggle={toggleTool} onClose={() => setPicker(false)} />
          )}
        </AnimatePresence>
        <AnimatePresence>
          {timerOpen && hasTimer && isInterviewer && !readOnly && <TimerPanel state={state} offset={room.offset} run={run} onClose={() => setTimerOpen(false)} />}
        </AnimatePresence>
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              role="alert"
              className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-danger/15 text-danger ring-1 ring-danger/30 px-3 py-1.5 text-[12px]"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
        <nav
          aria-label="Room tools"
          className="flex items-center gap-1 p-1.5 rounded-2xl border border-border-strong bg-elevated/95 backdrop-blur shadow-xl shadow-black/30 overflow-x-auto"
        >
          {isInterviewer && (
            <>
              <button
                type="button"
                onClick={() => {
                  setTimerOpen(false);
                  setPicker((p) => !p);
                }}
                aria-expanded={picker}
                aria-haspopup="dialog"
                className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-[13px] font-medium whitespace-nowrap transition-colors ${picker ? "bg-secondary text-bg" : "text-fg hover:bg-panel"}`}
              >
                <SlidersHorizontal className="w-4 h-4" aria-hidden />
                Tools
              </button>
              {(stageTools.length > 0 || hasTimer) && <span className="w-px h-6 bg-border-strong mx-1" aria-hidden />}
            </>
          )}
          {stageTools.map((t) => {
            const Icon = TOOL_ICON[t];
            const open = view === t;
            const shared = state.presented === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => openTool(t)}
                aria-pressed={open}
                title={isInterviewer ? (shared ? (open ? "Minimise for you" : "Open") : "Show to the candidate") : TOOL_BY_ID[t].label}
                className={`relative inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-[13px] font-medium whitespace-nowrap transition-colors ${open ? "text-fg" : "text-muted hover:text-fg hover:bg-panel/70"}`}
              >
                {open && <motion.span layoutId="tool-dock-active" transition={spring} className="absolute inset-0 rounded-xl bg-panel ring-1 ring-inset ring-border-strong" />}
                <span className="relative inline-flex items-center gap-1.5">
                  <Icon className="w-4 h-4" aria-hidden />
                  <span className="hidden sm:inline">{TOOL_BY_ID[t].label}</span>
                  {shared && (
                    <span className="relative flex w-2 h-2" aria-label="Shared">
                      <span className="absolute inset-0 rounded-full bg-success/60 animate-ping" />
                      <span className="relative w-2 h-2 rounded-full bg-success" />
                    </span>
                  )}
                </span>
              </button>
            );
          })}
          {hasTimer && <TimerPill state={state} offset={room.offset} isInterviewer={isInterviewer} readOnly={readOnly} open={timerOpen} onToggle={() => setTimerOpen((o) => !o)} />}
          {isInterviewer && stageTools.length === 0 && !hasTimer && <span className="px-2 text-[12px] text-subtle whitespace-nowrap">No tools on</span>}
        </nav>
      </div>
    </>
  );
}

function StageHeader({
  tool,
  state,
  isInterviewer,
  readOnly,
  room,
  onMinimise,
  onStop,
}: {
  tool: ToolId;
  state: ToolsState;
  isInterviewer: boolean;
  readOnly: boolean;
  room: ToolsRoom;
  onMinimise: () => void;
  onStop: () => void;
}) {
  const Icon = TOOL_ICON[tool];
  const shared = state.presented === tool;
  return (
    <header className="flex items-center gap-3 h-12 px-3 md:px-4 border-b border-border shrink-0">
      <span className="w-7 h-7 rounded-lg bg-secondary/15 text-secondary-soft flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4" aria-hidden />
      </span>
      <h2 className="text-[14px] font-semibold text-fg truncate">{TOOL_BY_ID[tool].label}</h2>
      {readOnly ? (
        <span className="text-xs text-subtle">Interview ended, read only</span>
      ) : shared ? (
        <span className="hidden sm:inline-flex items-center gap-1.5 h-6 px-2 rounded-md bg-success/10 text-success ring-1 ring-inset ring-success/25 text-xs font-medium">
          <Radio className="w-3 h-3" aria-hidden />
          {isInterviewer ? "Candidate sees this" : "Shared by your interviewer"}
        </span>
      ) : (
        <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-subtle">
          <Eye className="w-3 h-3" aria-hidden /> Shared, open on your screen only
        </span>
      )}
      {!room.synced && <Loader2 className="w-3.5 h-3.5 text-subtle animate-spin" aria-label="Connecting" />}
      <div className="ml-auto flex items-center gap-1.5">
        {tool === "code" && <CodeLangPicker room={room} disabled={readOnly} />}
        {isInterviewer && shared && !readOnly && (
          <button type="button" onClick={onStop} className="h-8 px-2.5 rounded-lg text-[12px] font-medium text-muted hover:text-fg hover:bg-panel whitespace-nowrap">
            Stop sharing
          </button>
        )}
        <button type="button" onClick={onMinimise} aria-label="Minimise" title="Minimise (Esc)" className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-fg hover:bg-panel">
          <Minimize2 className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}

function useCodeLang(room: ToolsRoom): [CodeLang, (l: CodeLang) => void] {
  const meta = useMemo(() => room.doc.getMap<string>("meta"), [room.doc]);
  const read = () => {
    const v = meta.get("codeLang");
    return (CODE_LANGS as readonly string[]).includes(v ?? "") ? (v as CodeLang) : "javascript";
  };
  const [lang, setLang] = useState<CodeLang>(read);
  useEffect(() => {
    const on = () => setLang(read());
    meta.observe(on);
    return () => meta.unobserve(on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta]);
  return [lang, (l) => meta.set("codeLang", l)];
}

const LANG_LABEL: Record<CodeLang, string> = { javascript: "JavaScript", typescript: "TypeScript", python: "Python", sql: "SQL", html: "HTML", css: "CSS", text: "Plain text" };

function CodeLangPicker({ room, disabled }: { room: ToolsRoom; disabled: boolean }) {
  const [lang, setLang] = useCodeLang(room);
  return (
    <select
      value={lang}
      disabled={disabled}
      onChange={(e) => setLang(e.target.value as CodeLang)}
      aria-label="Language"
      className="h-8 rounded-lg border border-border bg-bg px-2 text-[12px] text-fg focus:outline-none focus:border-secondary/60"
    >
      {CODE_LANGS.map((l) => (
        <option key={l} value={l}>
          {LANG_LABEL[l]}
        </option>
      ))}
    </select>
  );
}

function CodePad({ room, dark, readOnly }: { room: ToolsRoom; dark: boolean; readOnly: boolean }) {
  const [lang] = useCodeLang(room);
  return (
    <SharedEditor
      key={`code-${lang}-${dark}`}
      text={room.doc.getText("code")}
      awareness={room.awareness}
      language={lang}
      dark={dark}
      readOnly={readOnly}
      label="Shared code pad"
      placeholder="A shared scratch editor. Nothing runs here; use it for a snippet, a query or pseudo code."
    />
  );
}

function QuestionCard({
  state,
  isInterviewer,
  readOnly,
  guideQuestions,
  run,
}: {
  state: ToolsState;
  isInterviewer: boolean;
  readOnly: boolean;
  guideQuestions: string[];
  run: (a: Parameters<ToolsRoom["act"]>[0]) => Promise<void>;
}) {
  const reduce = useReducedMotion();
  const [draft, setDraft] = useState("");
  const q = state.question;
  const card = (
    <AnimatePresence mode="wait">
      {q ? (
        <motion.blockquote
          key={q.at}
          initial={reduce ? false : { opacity: 0, y: 14, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={reduce ? undefined : { opacity: 0, y: -10 }}
          transition={{ duration: 0.35, ease: [0.2, 0.7, 0.2, 1] }}
          className={`${isInterviewer ? "text-[18px]" : "text-[22px] md:text-[28px]"} leading-snug font-medium text-fg whitespace-pre-wrap tracking-tight`}
        >
          {q.text}
        </motion.blockquote>
      ) : (
        <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[15px] text-muted">
          {isInterviewer ? "Nothing on the card yet. Type a question below or pick one from your guide." : "Your interviewer will put a question here."}
        </motion.p>
      )}
    </AnimatePresence>
  );

  if (!isInterviewer) {
    return (
      <div className="h-full overflow-y-auto flex items-center justify-center p-6 md:p-12" style={{ backgroundImage: "radial-gradient(600px 260px at 50% 0%, rgb(var(--c-accent-2) / 0.12), transparent 70%)" }}>
        <div className="max-w-[820px] w-full">{card}</div>
      </div>
    );
  }

  const send = (text: string) => {
    if (!text.trim()) return;
    void run({ type: "question", text });
    setDraft("");
  };
  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] min-h-0">
      <div className="min-h-0 overflow-y-auto p-5 md:p-8 flex flex-col gap-5">
        <div className="rounded-2xl border border-border bg-bg/60 p-5 md:p-7 min-h-[160px]" style={{ backgroundImage: "radial-gradient(500px 200px at 0% 0%, rgb(var(--c-accent-2) / 0.10), transparent 70%)" }}>
          <p className="text-xs font-medium text-subtle mb-3">On the card now</p>
          {card}
          {q && !readOnly && (
            <button type="button" onClick={() => void run({ type: "question", text: null })} className="mt-4 inline-flex items-center gap-1.5 text-[12px] text-muted hover:text-fg">
              <Trash2 className="w-3.5 h-3.5" aria-hidden /> Clear the card
            </button>
          )}
        </div>
        {!readOnly && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(draft);
            }}
            className="flex flex-col gap-2"
          >
            <label htmlFor="qc-draft" className="text-xs font-medium text-subtle">
              Write a question or a scenario
            </label>
            <textarea
              id="qc-draft"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(draft);
              }}
              rows={3}
              placeholder="Tell me about a time you disagreed with your manager. What did you do?"
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-[14px] text-fg placeholder:text-subtle focus:outline-none focus:border-secondary/60 focus:ring-2 focus:ring-secondary/20 resize-y"
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-subtle">Ctrl or Cmd + Enter to show</span>
              <button type="submit" disabled={!draft.trim()} className="h-9 px-3.5 rounded-lg bg-secondary text-bg text-[13px] font-medium inline-flex items-center gap-1.5 disabled:opacity-40">
                <Send className="w-3.5 h-3.5" aria-hidden /> Show to candidate
              </button>
            </div>
          </form>
        )}
      </div>
      <aside className="min-h-0 overflow-y-auto border-t lg:border-t-0 lg:border-l border-border p-4 flex flex-col gap-2">
        <p className="text-xs font-medium text-subtle">From your guide</p>
        {guideQuestions.length === 0 ? (
          <p className="text-[13px] text-muted">This interview has no question guide. Write your own on the left.</p>
        ) : (
          guideQuestions.map((g, i) => {
            const onCard = q?.text === g.trim();
            return (
              <div key={i} className={`rounded-lg border px-3 py-2.5 flex items-start gap-2 ${onCard ? "border-secondary/50 bg-secondary/[0.06]" : "border-border bg-bg"}`}>
                <span className="flex-1 text-[13px] text-fg leading-relaxed">{g}</span>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => send(g)}
                    disabled={onCard}
                    className="shrink-0 h-7 px-2 rounded-md text-[12px] font-medium text-secondary-soft hover:bg-secondary/10 disabled:text-subtle inline-flex items-center gap-1"
                  >
                    {onCard ? <Check className="w-3.5 h-3.5" aria-hidden /> : <Send className="w-3.5 h-3.5" aria-hidden />}
                    {onCard ? "Showing" : "Show"}
                  </button>
                )}
              </div>
            );
          })
        )}
        <p className="text-xs text-subtle mt-1">Only the question goes on the card. Reference answers stay with you.</p>
      </aside>
    </div>
  );
}

function fmtClock(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const mm = String(m).padStart(h ? 2 : 1, "0");
  return `${h ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}

function useTimerLeft(state: ToolsState, offset: number) {
  const t = state.timer!;
  const [now, setNow] = useState(() => Date.now());
  const running = t.endsAt != null;
  useEffect(() => {
    if (!running) return;
    const i = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(i);
  }, [running]);
  return { t, running, left: timerRemaining(t, now + offset) };
}

function TimerPill({ state, offset, isInterviewer, readOnly, open, onToggle }: { state: ToolsState; offset: number; isInterviewer: boolean; readOnly: boolean; open: boolean; onToggle: () => void }) {
  const { t, running, left } = useTimerLeft(state, offset);
  const tone = left === 0 ? "text-danger" : left <= 60 ? "text-warning" : "text-fg";
  const pct = t.durationSec ? left / t.durationSec : 0;

  const body = (
    <span className="relative inline-flex items-center gap-1.5">
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden className="-rotate-90">
        <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2" />
        <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray={`${pct * 37.7} 37.7`} strokeLinecap="round" />
      </svg>
      <span className={`tabular-nums font-semibold ${left === 0 && running ? "animate-pulse" : ""}`}>{fmtClock(left)}</span>
      {!running && left > 0 && <span className="text-xs text-subtle font-normal">paused</span>}
    </span>
  );

  if (!isInterviewer || readOnly) {
    return (
      <span className={`inline-flex items-center h-9 px-3 rounded-xl text-[13px] ${tone}`} aria-label={`Timer ${fmtClock(left)}${running ? "" : ", paused"}`}>
        {body}
      </span>
    );
  }
  return (
    <button type="button" onClick={onToggle} aria-expanded={open} aria-label={`Timer ${fmtClock(left)}. Change timer`} className={`inline-flex items-center h-9 px-3 rounded-xl text-[13px] hover:bg-panel/70 ${tone}`}>
      {body}
    </button>
  );
}

function TimerPanel({ state, offset, run, onClose }: { state: ToolsState; offset: number; run: (a: Parameters<ToolsRoom["act"]>[0]) => Promise<void>; onClose: () => void }) {
  const { t, running, left } = useTimerLeft(state, offset);
  const [custom, setCustom] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (ref.current && !ref.current.contains(el) && !el.closest?.('nav[aria-label="Room tools"]')) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.97 }}
      transition={spring}
      className="absolute bottom-full mb-3 right-0 w-[260px] rounded-xl border border-border-strong bg-surface shadow-2xl shadow-black/40 p-3 flex flex-col gap-3"
      role="dialog"
      aria-label="Timer"
    >
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => void run({ type: "timer", op: running ? "pause" : "start" })} className="flex-1 h-9 rounded-lg bg-secondary text-bg text-[13px] font-medium inline-flex items-center justify-center gap-1.5">
          {running ? <Pause className="w-4 h-4" aria-hidden /> : <Play className="w-4 h-4" aria-hidden />}
          {running ? "Pause" : left < t.durationSec && left > 0 ? "Resume" : "Start"}
        </button>
        <button type="button" onClick={() => void run({ type: "timer", op: "reset" })} aria-label="Reset" className="w-9 h-9 rounded-lg border border-border text-muted hover:text-fg flex items-center justify-center">
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            onClose();
            void run({ type: "enable", tool: "timer", on: false });
          }}
          aria-label="Remove timer"
          className="w-9 h-9 rounded-lg border border-border text-muted hover:text-danger flex items-center justify-center"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div>
        <p className="text-xs text-subtle mb-1.5">Set to</p>
        <div className="grid grid-cols-4 gap-1.5">
          {[5, 10, 15, 30].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => void run({ type: "timer", op: "set", seconds: m * 60 })}
              className={`h-8 rounded-lg text-[12px] font-medium ring-1 ring-inset ${t.durationSec === m * 60 ? "bg-secondary/15 text-secondary-soft ring-secondary/40" : "ring-border text-muted hover:text-fg"}`}
            >
              {m} min
            </button>
          ))}
        </div>
        <form
          className="flex gap-1.5 mt-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            const n = Math.round(Number(custom));
            if (n > 0 && n <= 180) {
              void run({ type: "timer", op: "set", seconds: n * 60 });
              setCustom("");
            }
          }}
        >
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
            inputMode="numeric"
            placeholder="Other, in minutes"
            aria-label="Minutes"
            className="flex-1 min-w-0 h-8 rounded-lg border border-border bg-bg px-2 text-[12px] text-fg placeholder:text-subtle focus:outline-none focus:border-secondary/60"
          />
          <button type="submit" disabled={!custom} className="h-8 px-2.5 rounded-lg border border-border text-[12px] text-fg disabled:opacity-40">
            Set
          </button>
        </form>
      </div>
      <p className="text-xs text-subtle">The candidate sees the same countdown.</p>
    </motion.div>
  );
}

function ToolPicker({
  state,
  format,
  readOnly,
  onToggle,
  onClose,
}: {
  state: ToolsState;
  format: string | null;
  readOnly: boolean;
  onToggle: (t: ToolId, on: boolean) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const suggested = defaultTools(format);
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (ref.current && !ref.current.contains(el) && !el.closest?.('nav[aria-label="Room tools"]')) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <motion.div
      ref={ref}
      role="dialog"
      aria-label="Room tools"
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.97 }}
      transition={spring}
      className="absolute bottom-full mb-3 left-0 w-[min(400px,calc(100vw-24px))] max-h-[70vh] overflow-y-auto rounded-2xl border border-border-strong bg-surface shadow-2xl shadow-black/40"
    >
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-[15px] font-semibold text-fg">Room tools</h2>
        <p className="text-[13px] text-muted mt-0.5">Switch a tool on and it opens for the candidate straight away. Switch it off to take it away.</p>
      </div>
      <ul className="px-2 pb-2 flex flex-col">
        {TOOLS.map((t, i) => {
          const Icon = TOOL_ICON[t.id];
          const on = state.enabled.includes(t.id) && (t.id !== "timer" || !!state.timer);
          return (
            <motion.li key={t.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 * i }}>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                disabled={readOnly}
                onClick={() => onToggle(t.id, !on)}
                className="w-full text-left flex items-start gap-3 rounded-xl px-2.5 py-2.5 hover:bg-panel/60 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/60"
              >
                <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${on ? "bg-secondary/15 text-secondary-soft" : "bg-panel text-muted"}`}>
                  <Icon className="w-[18px] h-[18px]" aria-hidden />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="text-[14px] font-medium text-fg">{t.label}</span>
                    {suggested.includes(t.id) && <span className="text-[11px] text-subtle">Suggested</span>}
                  </span>
                  <span className="block text-[12.5px] text-muted leading-snug mt-0.5">{t.blurb}</span>
                  <span className="flex flex-wrap gap-1 mt-1.5">
                    {t.goodFor.map((g) => (
                      <span key={g} className="h-5 px-1.5 rounded text-[11px] bg-panel text-subtle ring-1 ring-inset ring-border inline-flex items-center">
                        {g}
                      </span>
                    ))}
                  </span>
                </span>
                <span className={`relative mt-1 inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${on ? "bg-secondary" : "bg-border-strong"}`} aria-hidden>
                  <motion.span layout transition={spring} className={`absolute top-0.5 h-4 w-4 rounded-full bg-bg shadow ${on ? "right-0.5" : "left-0.5"}`} />
                </span>
              </button>
            </motion.li>
          );
        })}
      </ul>
    </motion.div>
  );
}
