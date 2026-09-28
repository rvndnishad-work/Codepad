"use client";

/**
 * Recording in the room: a red "Recording" label everyone sees while the
 * call is recorded, and for interviewers a Record / Stop control next to the
 * call controls.
 *
 * Record is always there for interviewers on a built-in call. When the
 * interview was not set up to be recorded, Record asks the candidate first:
 * they get a prompt in the room, and the server starts the recording when
 * they agree. When recording cannot work (not set up, no credits), the
 * button stays visible and says why when pressed.
 *
 * Whether the call is recorded comes from LiveKit (Room.isRecording and
 * RecordingStatusChanged) and from the recording API, polled while the call
 * runs. Either one saying yes shows the label, so nobody is recorded without
 * seeing it.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Circle, Loader2, Square, X } from "lucide-react";
import { RoomEvent } from "livekit-client";
import { REFUSAL_SHORT, candidateFirstName, consentAskText, declinedLabel, type RecordControl, type RoomRecording } from "@/lib/recording/live";
import { useCall } from "./VideoCall";

/** Interviewers, normally. */
const POLL_MS = 15_000;
/** Interviewers waiting on the candidate's answer. */
const POLL_WAITING_MS = 3_000;
/** Candidates, so a request to record reaches them within seconds. */
const POLL_CANDIDATE_MS = 3_000;
const spring = { type: "spring" as const, stiffness: 520, damping: 38, mass: 0.7 };

const base = (sessionId: string) => `/api/interview/${encodeURIComponent(sessionId)}/recording`;

async function read(r: Response): Promise<RoomRecording> {
  const j = (await r.json().catch(() => ({}))) as RoomRecording & { error?: unknown };
  if (!r.ok) throw new Error(typeof j.error === "string" ? j.error : "That did not work. Try again.");
  return j;
}

async function call(sessionId: string, method: "GET" | "POST" | "DELETE"): Promise<RoomRecording> {
  return read(await fetch(base(sessionId), { method, cache: "no-store" }));
}

async function consent(sessionId: string, action: "ask" | "allow" | "decline"): Promise<RoomRecording> {
  return read(
    await fetch(`${base(sessionId)}/consent`, {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    }),
  );
}

/** LiveKit says the room is being recorded. */
function useLiveKitRecording(): boolean {
  const room = useCall()?.room ?? null;
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!room) {
      setOn(false);
      return;
    }
    setOn(room.isRecording);
    const onChange = (v: boolean) => setOn(v);
    room.on(RoomEvent.RecordingStatusChanged, onChange);
    return () => {
      room.off(RoomEvent.RecordingStatusChanged, onChange);
    };
  }, [room]);
  return on;
}

export function useRecording(sessionId: string, active: boolean, interviewer = true) {
  const lk = useLiveKitRecording();
  const [state, setState] = useState<RoomRecording | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const s = await call(sessionId, "GET");
      if (alive.current) setState(s);
    } catch {
      // Keep what we had; the next poll tries again.
    }
  }, [sessionId]);

  const waiting = state?.control === "waiting";
  const every = !interviewer ? POLL_CANDIDATE_MS : waiting ? POLL_WAITING_MS : POLL_MS;
  useEffect(() => {
    alive.current = true;
    if (!active) return;
    void refresh();
    const t = setInterval(() => void refresh(), every);
    return () => {
      alive.current = false;
      clearInterval(t);
    };
  }, [active, refresh, every]);

  // LiveKit changed its mind: ask the server too, so both agree sooner.
  useEffect(() => {
    if (active) void refresh();
  }, [lk, active, refresh]);

  const run = useCallback(
    async (fn: () => Promise<RoomRecording>) => {
      setBusy(true);
      setError(null);
      try {
        setState(await fn());
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "That did not work. Try again.");
        void refresh();
        return false;
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  return {
    recording: lk || !!state?.recording,
    canStart: state?.canStart ?? false,
    control: state?.control ?? null,
    candidateName: state?.candidateName ?? null,
    ask: state?.ask ?? null,
    reason: state?.reason ?? null,
    short: state?.code ? REFUSAL_SHORT[state.code] : null,
    loaded: !!state,
    busy,
    error,
    clearError: () => setError(null),
    start: () => run(() => call(sessionId, "POST")),
    stop: () => run(() => call(sessionId, "DELETE")),
    askCandidate: () => run(() => consent(sessionId, "ask")),
    answer: (allow: boolean) => run(() => consent(sessionId, allow ? "allow" : "decline")),
  };
}

/** The red label. Everyone sees it while the call is recorded. */
export function RecordingPill() {
  return (
    <span
      role="status"
      title="This call is being recorded"
      className="h-8 px-2.5 rounded-lg bg-danger/10 ring-1 ring-inset ring-danger/40 text-danger text-[13px] font-medium inline-flex items-center gap-1.5 whitespace-nowrap"
    >
      <span className="relative flex w-2 h-2" aria-hidden>
        <span className="absolute inset-0 rounded-full bg-danger/60 animate-ping motion-reduce:animate-none" />
        <span className="relative w-2 h-2 rounded-full bg-danger" />
      </span>
      Recording
    </span>
  );
}

const BTN =
  "h-10 sm:h-8 min-w-10 px-2.5 rounded-lg ring-1 ring-inset ring-border text-[13px] font-medium inline-flex items-center justify-center gap-1.5 hover:bg-panel whitespace-nowrap";
/** On phones the panels sit under the top bar across the screen; from sm up they hang off the button. */
const PANEL = "fixed left-4 right-4 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-10 sm:w-[300px] z-50 rounded-xl border border-border-strong bg-surface p-4 shadow-2xl shadow-black/50";

/**
 * The top bar piece: the label for everyone; for interviewers, Record (with
 * a confirm, and asking the candidate when needed) or Stop recording; for
 * the candidate, the prompt when they are asked to agree.
 */
export function RecordingControl({ sessionId, active, interviewer }: { sessionId: string; active: boolean; interviewer: boolean; recordVideo?: boolean }) {
  const rec = useRecording(sessionId, active, interviewer);
  if (!interviewer) {
    return (
      <>
        {rec.recording && <RecordingPill />}
        {active && rec.ask && !rec.recording && <ConsentPrompt by={rec.ask.by} busy={rec.busy} error={rec.error} onAnswer={rec.answer} />}
      </>
    );
  }
  if (!active) return rec.recording ? <RecordingPill /> : null;
  return <HostControl rec={rec} />;
}

type Rec = ReturnType<typeof useRecording>;

function HostControl({ rec }: { rec: Rec }) {
  const reduce = useReducedMotion();
  const [panel, setPanel] = useState<"confirm" | "why" | null>(null);
  const control: RecordControl | null = rec.control ?? (rec.recording ? "recording" : null);
  const first = candidateFirstName(rec.candidateName);

  // The answer came in while the host was waiting: tell them.
  const prev = useRef(control);
  useEffect(() => {
    if (prev.current === "waiting" && control === "declined") setPanel("why");
    prev.current = control;
  }, [control]);

  useEffect(() => {
    if (!panel) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPanel(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panel]);

  const why =
    control === "declined"
      ? `${declinedLabel(rec.candidateName)}. They are not asked again in this interview.`
      : control === "waiting"
        ? `${first} has been asked to agree to the recording. It starts as soon as they say yes.`
        : rec.reason;
  const asking = control === "ask";
  const pop = reduce ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } } : { initial: { opacity: 0, y: -6, scale: 0.98 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: -6, scale: 0.98 } };

  return (
    <div className="relative flex items-center gap-2">
      {rec.recording && <RecordingPill />}
      {control === "recording" ? (
        <button type="button" onClick={() => void rec.stop()} disabled={rec.busy} aria-label="Stop recording" className={`${BTN} disabled:opacity-60`}>
          {rec.busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden /> : <Square className="w-3 h-3 fill-current text-danger" aria-hidden />}
          <span className="hidden sm:inline">Stop recording</span>
        </button>
      ) : control === "start" || control === "ask" ? (
        <button type="button" onClick={() => setPanel(panel === "confirm" ? null : "confirm")} disabled={rec.busy} aria-label="Record the call" aria-expanded={panel === "confirm"} className={`${BTN} disabled:opacity-60`}>
          {rec.busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden /> : <Circle className="w-3 h-3 fill-current text-danger" aria-hidden />}
          <span className="hidden sm:inline">Record</span>
        </button>
      ) : control === "waiting" ? (
        <button type="button" onClick={() => setPanel(panel === "why" ? null : "why")} aria-label={`Waiting for ${first} to agree`} aria-expanded={panel === "why"} className={`${BTN} text-muted`}>
          <Loader2 className="w-3.5 h-3.5 animate-spin motion-reduce:animate-none" aria-hidden />
          <span className="hidden sm:inline">Waiting for {first}</span>
        </button>
      ) : (
        // Blocked, declined, or still loading: visible, looks off, says why when pressed.
        <span className="inline-flex items-center gap-2">
          <button
            type="button"
            aria-disabled
            disabled={!rec.loaded}
            onClick={() => why && setPanel(panel === "why" ? null : "why")}
            aria-label={control === "declined" ? declinedLabel(rec.candidateName) : "Record the call, not available"}
            aria-expanded={panel === "why"}
            aria-describedby={why ? "record-why" : undefined}
            className={`${BTN} opacity-50 hover:opacity-70`}
          >
            <Circle className="w-3 h-3 fill-current text-danger" aria-hidden />
            <span className="hidden sm:inline">Record</span>
          </button>
          {rec.loaded && control === "blocked" && rec.short && <span className="hidden xl:inline text-[12px] text-muted whitespace-nowrap">{rec.short}</span>}
          {rec.loaded && control === "declined" && <span className="hidden xl:inline text-[12px] text-muted whitespace-nowrap">Not agreed</span>}
          {why && (
            <span id="record-why" className="sr-only">
              {why}
            </span>
          )}
        </span>
      )}

      <AnimatePresence>
        {panel === "confirm" && (control === "start" || control === "ask") && (
          <motion.div key="confirm" role="dialog" aria-labelledby="record-title" {...pop} transition={spring} className={PANEL}>
            <div className="flex items-start gap-2">
              <h2 id="record-title" className="text-[14px] font-semibold flex-1">
                {asking ? `Ask ${first} to record this call?` : "Start recording the call?"}
              </h2>
              <button type="button" onClick={() => setPanel(null)} aria-label="Close" className="w-8 h-8 -mt-1 -mr-1 rounded-lg flex items-center justify-center text-muted hover:text-fg hover:bg-panel">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="mt-1.5 text-[12.5px] text-muted leading-relaxed">
              {asking
                ? `This interview was not set up to be recorded, so ${first} is asked first and can say no. Recording starts as soon as they agree. `
                : ""}
              Everyone on the call sees a Recording label. The recording is on the report after the call and is deleted after 7 days. Each recorded hour uses 1 AI credit.
            </p>
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={() => setPanel(null)} className="h-10 sm:h-8 px-3 rounded-lg border border-border text-[13px] font-medium hover:bg-panel">
                Cancel
              </button>
              <button
                type="button"
                disabled={rec.busy}
                onClick={async () => {
                  if (await (asking ? rec.askCandidate() : rec.start())) setPanel(null);
                }}
                className="h-10 sm:h-8 px-3 rounded-lg bg-danger text-bg text-[13px] font-semibold inline-flex items-center gap-1.5 hover:brightness-110 disabled:opacity-60"
              >
                {rec.busy && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />}
                {asking ? `Ask ${first}` : "Start recording"}
              </button>
            </div>
            {rec.error && (
              <p role="alert" className="mt-2 text-[12.5px] text-danger">
                {rec.error}
              </p>
            )}
          </motion.div>
        )}
        {panel === "why" && why && (
          <motion.div key="why" role="dialog" aria-label="About recording" {...pop} transition={spring} className={PANEL}>
            <div className="flex items-start gap-2">
              <p className="flex-1 text-[13px] text-fg leading-relaxed">{why}</p>
              <button type="button" onClick={() => setPanel(null)} aria-label="Close" className="w-8 h-8 -mt-1 -mr-1 rounded-lg flex items-center justify-center text-muted hover:text-fg hover:bg-panel shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {panel !== "confirm" && rec.error && (
        <p role="alert" className={`${PANEL} !p-3 text-danger text-[12.5px]`}>
          {rec.error}
          <button type="button" onClick={rec.clearError} className="ml-2 underline underline-offset-2">
            Dismiss
          </button>
        </p>
      )}
    </div>
  );
}

/** The candidate is asked, in the room, whether the call may be recorded. */
function ConsentPrompt({ by, busy, error, onAnswer }: { by: string | null; busy: boolean; error: string | null; onAnswer: (allow: boolean) => Promise<boolean> }) {
  const reduce = useReducedMotion();
  const [answered, setAnswered] = useState<boolean | null>(null);
  if (answered !== null && !error) return null;
  const answer = async (allow: boolean) => {
    setAnswered(allow);
    if (!(await onAnswer(allow))) setAnswered(null);
  };
  // Portalled: the top bar can contain fixed children (backdrop blur), which
  // would pin this to the bar instead of the screen.
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50 p-4">
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="record-ask-title"
        aria-describedby="record-ask-text"
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        className="w-full max-w-[400px] rounded-2xl border border-border-strong bg-surface p-5 shadow-2xl shadow-black/50"
      >
        <div className="flex items-center gap-2">
          <Circle className="w-3.5 h-3.5 fill-current text-danger shrink-0" aria-hidden />
          <h2 id="record-ask-title" className="text-[16px] font-semibold text-fg">
            Record this call?
          </h2>
        </div>
        <p id="record-ask-text" className="mt-2 text-[14px] text-muted leading-relaxed">
          {consentAskText(by)} Everyone sees a Recording label while it runs. You can say no; the interview goes on either way.
        </p>
        <div className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button type="button" disabled={busy} onClick={() => void answer(false)} className="h-11 sm:h-10 px-4 rounded-lg border border-border text-[14px] font-medium text-fg hover:bg-panel disabled:opacity-60">
            Don&apos;t record
          </button>
          <button type="button" disabled={busy} onClick={() => void answer(true)} className="h-11 sm:h-10 px-4 rounded-lg bg-secondary text-bg text-[14px] font-semibold inline-flex items-center justify-center gap-1.5 hover:brightness-110 disabled:opacity-60">
            {busy && answered === true && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
            Allow recording
          </button>
        </div>
        {error && (
          <p role="alert" className="mt-2 text-[13px] text-danger">
            {error}
          </p>
        )}
      </motion.div>
    </div>,
    document.body,
  );
}
