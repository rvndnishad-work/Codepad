"use client";

/**
 * Room toolbox for live interviews. The interviewer switches tools on from
 * the dock and presents one on the shared stage; the candidate follows.
 * Each tool's UI comes from registry.tsx; this file only knows the dock,
 * the stage and the Tools menu. Content is shared through useToolsRoom.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTheme } from "next-themes";
import { Eye, Loader2, Minimize2, Radio, SlidersHorizontal } from "lucide-react";
import { ASK_EVENT, TOOLS, TOOL_BY_ID, defaultTools, type ToolId, type ToolsState } from "@/lib/interview/tools";
import { useToolsRoom } from "./useToolsRoom";
import { TOOL_ICON } from "./icons";
import { TOOL_PLUGINS } from "./registry";
import { TimerPanel, TimerPill } from "./Timer";
import type { ToolProps } from "./types";

const spring = { type: "spring" as const, stiffness: 520, damping: 36, mass: 0.7 };

export default function InterviewToolbox({
  sessionId,
  roomKey,
  token,
  guest = null,
  interviewer,
  meName,
  format,
  guideQuestions = [],
}: {
  sessionId: string;
  roomKey: string | null;
  token: string | null;
  /** Emailed interviewer key, for interviewers without an account. */
  guest?: string | null;
  interviewer: boolean;
  meName: string;
  format: string | null;
  guideQuestions?: string[];
}) {
  const me = useMemo(() => ({ name: meName, interviewer }), [meName, interviewer]);
  const room = useToolsRoom({ sessionId, token, guest, roomKey, me });
  const state = room?.state ?? null;
  const live = room?.live ?? true;
  const act = room?.act;
  const isInterviewer = (room?.role ?? (interviewer ? "interviewer" : "candidate")) === "interviewer";
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
    async (a: Parameters<ToolProps["run"]>[0]) => {
      const err = act ? await act(a) : "Still connecting. Try again.";
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

  if (!room || !state) return null;
  const stageTools = state.enabled.filter((t) => TOOL_BY_ID[t].stage && TOOL_PLUGINS[t].Stage);
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
    const switchOn = TOOL_PLUGINS[t].switchOn;
    void run(switchOn ? switchOn(state) : { type: "present", tool: t });
  };
  const toolProps: ToolProps = { room, state, isInterviewer, readOnly, dark, guideQuestions, run };
  const Stage = view ? TOOL_PLUGINS[view].Stage : undefined;

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
              props={toolProps}
              onMinimise={() => setView(null)}
              onStop={() => void run({ type: "present", tool: null })}
            />
            <div className="flex-1 min-h-0 relative">{Stage && <Stage {...toolProps} />}</div>
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

function StageHeader({ tool, props, onMinimise, onStop }: { tool: ToolId; props: ToolProps; onMinimise: () => void; onStop: () => void }) {
  const { state, isInterviewer, readOnly, room } = props;
  const Icon = TOOL_ICON[tool];
  const Actions = TOOL_PLUGINS[tool].HeaderActions;
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
        {Actions && <Actions {...props} />}
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
