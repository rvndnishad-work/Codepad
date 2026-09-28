"use client";

/**
 * Recording in the room: a red "Recording" label everyone sees while the
 * call is recorded, and for interviewers a Record / Stop control next to the
 * call controls.
 *
 * Whether the call is recorded comes from LiveKit (Room.isRecording and
 * RecordingStatusChanged) and from the recording API, polled while the call
 * runs. Either one saying yes shows the label, so nobody is recorded without
 * seeing it.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Circle, Loader2, Square, X } from "lucide-react";
import { RoomEvent } from "livekit-client";
import { REFUSAL_SHORT, type RoomRecording } from "@/lib/recording/live";
import { useCall } from "./VideoCall";

const POLL_MS = 15_000;
const spring = { type: "spring" as const, stiffness: 520, damping: 38, mass: 0.7 };

async function call(sessionId: string, method: "GET" | "POST" | "DELETE"): Promise<RoomRecording> {
  const r = await fetch(`/api/interview/${encodeURIComponent(sessionId)}/recording`, { method, cache: "no-store" });
  const j = (await r.json().catch(() => ({}))) as RoomRecording & { error?: unknown };
  if (!r.ok) throw new Error(typeof j.error === "string" ? j.error : "That did not work. Try again.");
  return j;
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

export function useRecording(sessionId: string, active: boolean) {
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

  useEffect(() => {
    alive.current = true;
    if (!active) return;
    void refresh();
    const t = setInterval(() => void refresh(), POLL_MS);
    return () => {
      alive.current = false;
      clearInterval(t);
    };
  }, [active, refresh]);

  // LiveKit changed its mind: ask the server too, so both agree sooner.
  useEffect(() => {
    if (active) void refresh();
  }, [lk, active, refresh]);

  const run = useCallback(
    async (method: "POST" | "DELETE") => {
      setBusy(true);
      setError(null);
      try {
        setState(await call(sessionId, method));
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "That did not work. Try again.");
        void refresh();
        return false;
      } finally {
        setBusy(false);
      }
    },
    [sessionId, refresh],
  );

  return {
    recording: lk || !!state?.recording,
    canStart: state?.canStart ?? false,
    reason: state?.reason ?? null,
    short: state?.code ? REFUSAL_SHORT[state.code] : null,
    loaded: !!state,
    busy,
    error,
    clearError: () => setError(null),
    start: () => run("POST"),
    stop: () => run("DELETE"),
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

/**
 * The top bar piece: the label for everyone, and for interviewers in a call
 * set up to be recorded, Record (with a confirm) or Stop recording. When
 * recording cannot start, the button stays off and says why.
 */
export function RecordingControl({ sessionId, active, interviewer, recordVideo }: { sessionId: string; active: boolean; interviewer: boolean; recordVideo: boolean }) {
  const rec = useRecording(sessionId, active);
  const [confirming, setConfirming] = useState(false);
  const control = interviewer && recordVideo && active;

  if (!control) return rec.recording ? <RecordingPill /> : null;

  return (
    <div className="relative flex items-center gap-2">
      {rec.recording && <RecordingPill />}
      {rec.recording ? (
        <button
          type="button"
          onClick={() => void rec.stop()}
          disabled={rec.busy}
          className="h-8 px-2.5 rounded-lg ring-1 ring-inset ring-border text-[13px] font-medium inline-flex items-center gap-1.5 hover:bg-panel disabled:opacity-60 whitespace-nowrap"
        >
          {rec.busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden /> : <Square className="w-3 h-3 fill-current text-danger" aria-hidden />}
          <span className="hidden sm:inline">Stop recording</span>
          <span className="sm:hidden sr-only">Stop recording</span>
        </button>
      ) : (
        // The wrapper carries the tooltip: a disabled button does not show one everywhere.
        <span title={rec.loaded && !rec.canStart && rec.reason ? rec.reason : "Record the call"} className="inline-flex items-center gap-2">
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={rec.busy || !rec.loaded || !rec.canStart}
            aria-describedby={rec.loaded && !rec.canStart && rec.reason ? "record-why" : undefined}
            className="h-8 px-2.5 rounded-lg ring-1 ring-inset ring-border text-[13px] font-medium inline-flex items-center gap-1.5 hover:bg-panel disabled:opacity-50 disabled:hover:bg-transparent whitespace-nowrap"
          >
            {rec.busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden /> : <Circle className="w-3 h-3 fill-current text-danger" aria-hidden />}
            <span className="hidden sm:inline">Record</span>
            <span className="sm:hidden sr-only">Record</span>
          </button>
          {rec.loaded && !rec.canStart && rec.short && <span className="hidden xl:inline text-[12px] text-muted whitespace-nowrap">{rec.short}</span>}
          {rec.loaded && !rec.canStart && rec.reason && (
            <span id="record-why" className="sr-only">
              {rec.reason}
            </span>
          )}
        </span>
      )}

      <AnimatePresence>
        {confirming && (
          <motion.div
            role="dialog"
            aria-labelledby="record-title"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={spring}
            className="absolute right-0 top-10 z-50 w-[300px] rounded-xl border border-border-strong bg-surface p-4 shadow-2xl shadow-black/50"
          >
            <div className="flex items-start gap-2">
              <h2 id="record-title" className="text-[14px] font-semibold flex-1">
                Start recording the call?
              </h2>
              <button type="button" onClick={() => setConfirming(false)} aria-label="Close" className="w-7 h-7 -mt-1 -mr-1 rounded-lg flex items-center justify-center text-muted hover:text-fg hover:bg-panel">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="mt-1.5 text-[12.5px] text-muted leading-relaxed">
              Everyone on the call sees a Recording label. The recording is on the report after the call and is deleted after 7 days. Each recorded hour uses 1 AI credit.
            </p>
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirming(false)} className="h-8 px-3 rounded-lg border border-border text-[13px] font-medium hover:bg-panel">
                Cancel
              </button>
              <button
                type="button"
                disabled={rec.busy}
                onClick={async () => {
                  if (await rec.start()) setConfirming(false);
                }}
                className="h-8 px-3 rounded-lg bg-danger text-bg text-[13px] font-semibold inline-flex items-center gap-1.5 hover:brightness-110 disabled:opacity-60"
              >
                {rec.busy && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />}
                Start recording
              </button>
            </div>
            {rec.error && (
              <p role="alert" className="mt-2 text-[12.5px] text-danger">
                {rec.error}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      {!confirming && rec.error && (
        <p role="alert" className="absolute right-0 top-10 z-50 w-[260px] rounded-lg bg-surface ring-1 ring-danger/40 text-danger px-3 py-2 text-[12.5px] shadow-xl shadow-black/40">
          {rec.error}
          <button type="button" onClick={rec.clearError} className="ml-2 underline underline-offset-2">
            Dismiss
          </button>
        </p>
      )}
    </div>
  );
}
