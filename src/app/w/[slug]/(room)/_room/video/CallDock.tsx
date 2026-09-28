"use client";

/**
 * The call panel over the stage while the interview runs. It floats in a
 * corner (drag it, or use the corner button, to move it), shrinks to a pill
 * that still shows who is talking, and on screens below md becomes a strip
 * across the top. Leaving only takes this person off the call.
 */
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useIsSpeaking, useIsMuted } from "@livekit/components-react";
import { Track, type Participant } from "livekit-client";
import { Maximize2, Minus, MoveDiagonal } from "lucide-react";
import { Avatar } from "../parts";
import { useCall } from "./VideoCall";
import { CallControls, CallState, MediaNote, Tile, nameOf, useCallPeople } from "./CallParts";

type Corner = "tl" | "tr" | "bl" | "br";
const CORNERS: Corner[] = ["br", "bl", "tl", "tr"];
const CORNER_CLS: Record<Corner, string> = {
  tl: "md:left-5 md:top-5",
  tr: "md:right-5 md:top-5",
  bl: "md:left-5 md:bottom-5",
  br: "md:right-5 md:bottom-5",
};
const DOCK_KEY = "interview-video-dock:v1";

function loadDock(): { corner: Corner; small: boolean } {
  try {
    const v = JSON.parse(window.localStorage.getItem(DOCK_KEY) ?? "{}") as { corner?: string; small?: boolean };
    return { corner: CORNERS.includes(v.corner as Corner) ? (v.corner as Corner) : "br", small: v.small === true };
  } catch {
    return { corner: "br", small: false };
  }
}

function saveDock(v: { corner: Corner; small: boolean }) {
  try {
    window.localStorage.setItem(DOCK_KEY, JSON.stringify(v));
  } catch {}
}

function mmss(sec: number): string {
  const m = Math.floor(sec / 60);
  return `${m}:${String(sec % 60).padStart(2, "0")}`;
}

export function CallDock({ myRole, others }: { myRole: "interviewer" | "candidate"; others: string }) {
  const call = useCall();
  const [dock, setDock] = useState<{ corner: Corner; small: boolean }>({ corner: "br", small: false });
  useEffect(() => setDock(loadDock()), []);
  const update = (v: Partial<{ corner: Corner; small: boolean }>) =>
    setDock((d) => {
      const next = { ...d, ...v };
      saveDock(next);
      return next;
    });

  // Drag the header to any corner; it snaps to the nearest one on release.
  const box = useRef<HTMLElement>(null);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const onDown = (e: ReactPointerEvent) => {
    if ((e.target as HTMLElement).closest("button") || window.matchMedia("(max-width: 767px)").matches) return;
    start.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: ReactPointerEvent) => {
    if (!start.current) return;
    setDrag({ x: e.clientX - start.current.x, y: e.clientY - start.current.y });
  };
  const onUp = () => {
    if (!start.current) return;
    start.current = null;
    const el = box.current;
    const stage = el?.offsetParent as HTMLElement | null;
    if (el && stage) {
      const r = el.getBoundingClientRect();
      const s = stage.getBoundingClientRect();
      const cx = r.left + r.width / 2 - s.left;
      const cy = r.top + r.height / 2 - s.top;
      update({ corner: `${cy < s.height / 2 ? "t" : "b"}${cx < s.width / 2 ? "l" : "r"}` as Corner });
    }
    setDrag(null);
  };

  if (!call || call.status === "off" || call.status === "ended") return null;
  const place = `absolute z-30 max-md:left-2 max-md:right-2 max-md:top-2 ${CORNER_CLS[dock.corner]}`;
  const shell = "rounded-2xl bg-surface border border-border-strong shadow-2xl shadow-black/40";
  const style = drag ? { transform: `translate(${drag.x}px, ${drag.y}px)` } : undefined;
  const nextCorner = () => update({ corner: CORNERS[(CORNERS.indexOf(dock.corner) + 1) % CORNERS.length] });

  if (call.status !== "connected" || !call.room) {
    return (
      <section aria-label="Video call" className={`${place} md:w-[328px] ${shell} p-3.5`}>
        <CallState compact />
      </section>
    );
  }

  if (dock.small) {
    return (
      <section
        ref={box}
        aria-label="Video call, shrunk"
        style={style}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        className={`${place} md:w-auto rounded-full bg-surface border border-border-strong shadow-2xl shadow-black/40 p-1.5 flex items-center gap-2.5 touch-none`}
      >
        <Pill myRole={myRole} others={others} />
        <div className="flex items-center gap-1.5">
          <CallControls size="sm" share={false} leave={false} />
          <button
            type="button"
            onClick={() => update({ small: false })}
            aria-label="Show the call"
            title="Show the call"
            className="w-9 h-9 rounded-full bg-elevated text-fg hover:bg-border-strong/60 inline-flex items-center justify-center"
          >
            <Maximize2 className="w-4 h-4" aria-hidden />
          </button>
        </div>
      </section>
    );
  }

  return (
    <section ref={box} aria-label="Video call" style={style} className={`${place} md:w-[328px] ${shell} overflow-hidden`}>
      <div
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        className="h-[38px] flex items-center gap-2 pl-3 pr-1.5 text-[12.5px] text-muted md:cursor-grab md:active:cursor-grabbing touch-none select-none"
      >
        <span className="w-[7px] h-[7px] rounded-full bg-success" aria-hidden />
        <CallClock />
        <span className="ml-auto" />
        <button
          type="button"
          onClick={nextCorner}
          aria-label="Move the call to the next corner"
          title="Move to another corner"
          className="hidden md:inline-flex w-7 h-7 rounded-lg text-muted hover:text-fg hover:bg-panel items-center justify-center"
        >
          <MoveDiagonal className="w-3.5 h-3.5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => update({ small: true })}
          aria-label="Shrink the call"
          title="Shrink"
          className="w-7 h-7 rounded-lg text-muted hover:text-fg hover:bg-panel inline-flex items-center justify-center"
        >
          <Minus className="w-3.5 h-3.5" aria-hidden />
        </button>
      </div>
      <Faces myRole={myRole} others={others} />
      <div className="flex justify-center gap-2 px-2 pt-2.5 pb-3">
        <CallControls size="md" />
      </div>
      <MediaNote className="px-3 pb-3 -mt-1" />
    </section>
  );
}

function CallClock() {
  const [sec, setSec] = useState(0);
  useEffect(() => {
    const t0 = Date.now();
    const t = setInterval(() => setSec(Math.floor((Date.now() - t0) / 1000)), 1000);
    return () => clearInterval(t);
  }, []);
  return <span className="tabular-nums">Call · {mmss(sec)}</span>;
}

/** The other person large, yourself small in the corner. On phones, side by side in a strip. */
function Faces({ myRole, others }: { myRole: "interviewer" | "candidate"; others: string }) {
  const { local, main } = useCallPeople(myRole);
  return (
    <div className="relative mx-2 max-md:flex max-md:gap-2">
      {main ? (
        <Tile participant={main} preferScreen avatar={64} className="h-[180px] max-md:h-24 max-md:flex-1" />
      ) : (
        <div className="h-[180px] max-md:h-24 max-md:flex-1 rounded-xl bg-panel flex flex-col items-center justify-center gap-2 text-center px-4">
          <span className="w-14 h-14 max-md:w-10 max-md:h-10 rounded-full border-2 border-dashed border-border-strong" aria-hidden />
          <span className="text-[12.5px] text-muted">Waiting for {others} to join the call</span>
        </div>
      )}
      <Tile
        participant={local}
        label="You"
        avatar={28}
        showName={false}
        rounded="rounded-lg"
        className="md:absolute md:right-2 md:bottom-2 w-24 h-[60px] max-md:h-24 max-md:w-24 border border-border-strong"
      />
    </div>
  );
}

/** Shrunk: who is on the other side and whether they are talking. */
function Pill({ myRole, others }: { myRole: "interviewer" | "candidate"; others: string }) {
  const { main } = useCallPeople(myRole);
  if (!main) {
    return <span className="pl-2 pr-1 text-[13px] text-muted whitespace-nowrap">Waiting for {others}</span>;
  }
  return <PillPerson p={main} />;
}

function PillPerson({ p }: { p: Participant }) {
  const speaking = useIsSpeaking(p);
  const muted = useIsMuted({ participant: p, source: Track.Source.Microphone });
  const name = nameOf(p);
  return (
    <span className="flex items-center gap-2.5 min-w-0">
      <span className={`rounded-full ${speaking ? "ring-2 ring-success ring-offset-1 ring-offset-surface" : ""}`}>
        <Avatar name={name} size={36} />
      </span>
      <span className="leading-tight min-w-0 pr-1">
        <span className="block text-[13px] font-semibold truncate max-w-[140px]">{name}</span>
        <span className={`block text-[12px] ${speaking ? "text-success" : "text-muted"}`}>{speaking ? "Speaking" : muted ? "Muted" : "On the call"}</span>
      </span>
    </span>
  );
}
