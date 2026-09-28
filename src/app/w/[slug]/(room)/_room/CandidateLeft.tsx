"use client";

/**
 * Interviewer side of "the candidate left": a notice under the top bar when
 * the candidate hangs up or presses Leave, and a short "back" note when
 * they rejoin. See src/lib/interview/room-leave.ts.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CircleStop, LogIn, PhoneOff, X } from "lucide-react";
import type * as Y from "yjs";
import { LEFT_KEY, LEFT_MAP, parseLeftNote, type LeftNote } from "@/lib/interview/room-leave";
import { BTN_DANGER } from "./parts";

const spring = { type: "spring" as const, stiffness: 520, damping: 38, mass: 0.7 };

function useLeftNote(doc: Y.Doc | null): LeftNote | null {
  const map = useMemo(() => doc?.getMap<string>(LEFT_MAP) ?? null, [doc]);
  const [note, setNote] = useState<LeftNote | null>(null);
  useEffect(() => {
    if (!map) return;
    const read = () => setNote(parseLeftNote(map.get(LEFT_KEY)));
    read();
    map.observe(read);
    return () => map.unobserve(read);
  }, [map]);
  return note;
}

export function CandidateLeftNotice({ doc, synced, name, onEnd }: { doc: Y.Doc | null; synced: boolean; name: string; onEnd: (() => void) | null }) {
  const note = useLeftNote(synced ? doc : null);
  const [dismissed, setDismissed] = useState<number | null>(null);
  const [back, setBack] = useState(false);
  const last = useRef<LeftNote | null>(null);

  // A note that goes away means the candidate came back.
  useEffect(() => {
    if (last.current && !note) {
      setBack(true);
      const t = setTimeout(() => setBack(false), 6000);
      last.current = null;
      return () => clearTimeout(t);
    }
    if (note) {
      setBack(false);
      last.current = note;
    }
  }, [note]);

  const who = name.trim() || "The candidate";
  const time = note ? new Date(note.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
  const show = note && dismissed !== note.at;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[68px] z-40 flex justify-center px-3">
      <AnimatePresence>
        {show ? (
          <motion.div
            key={`left-${note.at}`}
            role="alert"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={spring}
            className="pointer-events-auto w-full max-w-lg rounded-2xl border border-danger/40 bg-surface shadow-2xl shadow-black/50 p-3.5 pr-2.5 flex items-start gap-3"
          >
            <span className="w-10 h-10 rounded-xl bg-danger-solid text-white flex items-center justify-center shrink-0">
              <PhoneOff className="w-5 h-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14.5px] font-semibold">{who} left the interview</p>
              <p className="mt-0.5 text-[13px] text-muted leading-relaxed">
                {note.via === "hangup" ? "They hung up the call" : "They pressed Leave"} at {time}. They can rejoin with the same link while the interview is running.
              </p>
              {onEnd && (
                <button type="button" onClick={onEnd} className={`mt-2.5 h-8 px-3 rounded-lg ${BTN_DANGER} text-[12.5px] font-semibold inline-flex items-center gap-1.5`}>
                  <CircleStop className="w-3.5 h-3.5" aria-hidden /> End interview
                </button>
              )}
            </div>
            <button type="button" onClick={() => setDismissed(note.at)} aria-label="Dismiss" className="w-8 h-8 rounded-lg text-muted hover:text-fg hover:bg-panel flex items-center justify-center shrink-0">
              <X className="w-4 h-4" aria-hidden />
            </button>
          </motion.div>
        ) : back ? (
          <motion.div
            key="back"
            role="status"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={spring}
            className="pointer-events-auto rounded-full border border-success/40 bg-surface shadow-xl shadow-black/40 h-10 pl-2 pr-4 inline-flex items-center gap-2 text-[13.5px] font-medium"
          >
            <span className="w-7 h-7 rounded-full bg-success/15 text-success flex items-center justify-center">
              <LogIn className="w-4 h-4" aria-hidden />
            </span>
            {who} is back
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
