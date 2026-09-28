"use client";

/**
 * The call while the interview runs. On desktops it floats over the stage in
 * a corner (drag it, or use the corner button, to move it) and shrinks to a
 * pill that still shows who is talking. On phones and touch tablets it is a
 * strip under the stage instead, with small tiles and the call buttons in
 * one row, so it never covers the stage or its tool bars; it folds to a
 * single line. Leaving only takes this person off the call, except for a
 * candidate, whose hang-up asks to leave the interview (`onHangUp`).
 */
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useIsSpeaking, useIsMuted } from "@livekit/components-react";
import { Track, type Participant } from "livekit-client";
import { ChevronDown, ChevronUp, Maximize2, Minus, MoveDiagonal } from "lucide-react";
import { COMPACT_CALL, RoleAvatar, useMedia } from "../parts";
import { useCall } from "./VideoCall";
import { CallControls, CallState, MediaNote, Tile, nameOf, roleOf, useCallPeople } from "./CallParts";

type Corner = "tl" | "tr" | "bl" | "br";
const CORNERS: Corner[] = ["br", "bl", "tl", "tr"];
const CORNER_CLS: Record<Corner, string> = {
  tl: "left-5 top-5",
  tr: "right-5 top-5",
  bl: "left-5 bottom-20",
  br: "right-5 bottom-20",
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

/**
 * `column`: desktops with room to spare get the call in a column beside the
 * stage (`side`, both people stacked) or at the top of the interviewer
 * panel (`panel`, the other person large, you small), so it never covers
 * the stage. Without it the call floats (narrow desktops) or is a strip
 * (phones and touch tablets).
 */
export function CallDock({
  myRole,
  others,
  onHangUp,
  column,
}: {
  myRole: "interviewer" | "candidate";
  others: string;
  onHangUp?: () => void;
  column?: "side" | "panel";
}) {
  const call = useCall();
  const compact = useMedia(COMPACT_CALL);
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
    if ((e.target as HTMLElement).closest("button")) return;
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
  if (column) return <Column kind={column} myRole={myRole} others={others} onHangUp={onHangUp} small={dock.small} onSmall={(small) => update({ small })} />;
  if (compact) return <Strip myRole={myRole} others={others} onHangUp={onHangUp} small={dock.small} onSmall={(small) => update({ small })} />;
  const place = `absolute z-30 ${CORNER_CLS[dock.corner]}`;
  const shell = "rounded-2xl bg-surface border border-border-strong shadow-2xl shadow-black/40";
  const style = drag ? { transform: `translate(${drag.x}px, ${drag.y}px)` } : undefined;
  const nextCorner = () => update({ corner: CORNERS[(CORNERS.indexOf(dock.corner) + 1) % CORNERS.length] });

  if (call.status !== "connected" || !call.room) {
    return (
      <section aria-label="Video call" className={`${place} w-[328px] ${shell} p-3.5`}>
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
        className={`${place} w-auto rounded-full bg-surface border border-border-strong shadow-2xl shadow-black/40 p-1.5 flex items-center gap-2.5 touch-none`}
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
    <section ref={box} aria-label="Video call" style={style} className={`${place} w-[328px] ${shell} overflow-hidden`}>
      <div
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        className="h-[38px] flex items-center gap-2 pl-3 pr-1.5 text-[12.5px] text-muted cursor-grab active:cursor-grabbing touch-none select-none"
      >
        <span className="w-[7px] h-[7px] rounded-full bg-success" aria-hidden />
        <CallClock />
        <span className="ml-auto" />
        <button
          type="button"
          onClick={nextCorner}
          aria-label="Move the call to the next corner"
          title="Move to another corner"
          className="inline-flex w-7 h-7 rounded-lg text-muted hover:text-fg hover:bg-panel items-center justify-center"
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
        <CallControls size="md" onLeave={onHangUp} />
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

/** The other person large, yourself small in the corner. */
function Faces({ myRole, others, height = "h-[180px]" }: { myRole: "interviewer" | "candidate"; others: string; height?: string }) {
  const { local, main } = useCallPeople(myRole);
  return (
    <div className="relative mx-2">
      {main ? (
        <Tile participant={main} preferScreen avatar={64} className={height} />
      ) : (
        <div className={`${height} rounded-xl bg-panel flex flex-col items-center justify-center gap-2 text-center px-4`}>
          <span className="w-14 h-14 rounded-full border-2 border-dashed border-border-strong" aria-hidden />
          <span className="text-[12.5px] text-muted">Waiting for {others} to join the call</span>
        </div>
      )}
      <Tile participant={local} label="You" avatar={28} showName={false} rounded="rounded-lg" className="!absolute right-2 bottom-2 w-24 h-[60px] border border-border-strong" />
    </div>
  );
}

/** The call in a column beside the stage, or on top of the interviewer panel. */
function Column({
  kind,
  myRole,
  others,
  onHangUp,
  small,
  onSmall,
}: {
  kind: "side" | "panel";
  myRole: "interviewer" | "candidate";
  others: string;
  onHangUp?: () => void;
  small: boolean;
  onSmall: (small: boolean) => void;
}) {
  const call = useCall()!;
  const shell = `shrink-0 bg-surface ${kind === "panel" ? "border-b border-border" : ""}`;
  if (call.status !== "connected" || !call.room) {
    return (
      <section aria-label="Video call" className={`${shell} p-3.5`}>
        <CallState compact />
      </section>
    );
  }
  return (
    <section aria-label={small ? "Video call, folded" : "Video call"} className={shell}>
      <div className="h-11 flex items-center gap-2 pl-3.5 pr-2 text-[12.5px] text-muted">
        <span className="w-[7px] h-[7px] rounded-full bg-success" aria-hidden />
        <CallClock />
        <span className="ml-auto" />
        {small && <CallControls size="sm" share={false} onLeave={onHangUp} />}
        <button
          type="button"
          onClick={() => onSmall(!small)}
          aria-label={small ? "Show the video" : "Hide the video"}
          title={small ? "Show the video" : "Hide the video"}
          className="w-8 h-8 rounded-lg text-muted hover:text-fg hover:bg-panel inline-flex items-center justify-center shrink-0"
        >
          {small ? <ChevronDown className="w-4 h-4" aria-hidden /> : <ChevronUp className="w-4 h-4" aria-hidden />}
        </button>
      </div>
      {!small && (
        <>
          {kind === "side" ? <Stacked myRole={myRole} others={others} /> : <Faces myRole={myRole} others={others} height="h-[172px]" />}
          <div className="flex justify-center gap-2 px-2 pt-3 pb-3.5">
            <CallControls size="md" onLeave={onHangUp} />
          </div>
          <MediaNote className="px-3.5 pb-3.5 -mt-1" />
        </>
      )}
    </section>
  );
}

/** Beside the stage: the other person, then you, both full width. */
function Stacked({ myRole, others }: { myRole: "interviewer" | "candidate"; others: string }) {
  const { local, main } = useCallPeople(myRole);
  return (
    <div className="px-2.5 grid gap-2">
      {main ? (
        <Tile participant={main} preferScreen avatar={56} className="aspect-video" />
      ) : (
        <div className="aspect-video rounded-xl bg-panel flex flex-col items-center justify-center gap-2 text-center px-4">
          <span className="w-12 h-12 rounded-full border-2 border-dashed border-border-strong" aria-hidden />
          <span className="text-[12.5px] text-muted">Waiting for {others} to join the call</span>
        </div>
      )}
      <Tile participant={local} label="You" avatar={44} className="aspect-video" />
    </div>
  );
}

/**
 * Phones and touch tablets: a strip in the page flow under the stage (it
 * takes its own room, so the stage and its tool bars stay uncovered). Small
 * tiles and mic, camera and hang-up in one row; folds to one line.
 */
function Strip({
  myRole,
  others,
  onHangUp,
  small,
  onSmall,
}: {
  myRole: "interviewer" | "candidate";
  others: string;
  onHangUp?: () => void;
  small: boolean;
  onSmall: (small: boolean) => void;
}) {
  const call = useCall()!;
  const shell = "shrink-0 border-t border-border bg-surface px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]";
  if (call.status !== "connected" || !call.room) {
    return (
      <section aria-label="Video call" className={`${shell} px-3`}>
        <div className="min-h-10 flex items-center">
          <div className="flex-1 min-w-0">
            <CallState compact />
          </div>
        </div>
      </section>
    );
  }
  const fold = (
    <button
      type="button"
      onClick={() => onSmall(!small)}
      aria-label={small ? "Show the video" : "Hide the video"}
      title={small ? "Show the video" : "Hide the video"}
      className="w-10 h-10 rounded-full text-muted hover:text-fg hover:bg-panel inline-flex items-center justify-center shrink-0"
    >
      {small ? <ChevronUp className="w-4 h-4" aria-hidden /> : <ChevronDown className="w-4 h-4" aria-hidden />}
    </button>
  );
  if (small) {
    return (
      <section aria-label="Video call, folded" className={shell}>
        <div className="flex items-center gap-1.5">
          <div className="flex-1 min-w-0 pl-1">
            <Pill myRole={myRole} others={others} />
          </div>
          <CallControls size="sm" share={false} onLeave={onHangUp} />
          {fold}
        </div>
        <MediaNote className="px-1 pt-2" />
      </section>
    );
  }
  return (
    <section aria-label="Video call" className={shell}>
      <div className="flex items-center gap-1.5 sm:gap-2">
        <StripFaces myRole={myRole} others={others} />
        <div className="ml-auto flex items-center gap-1.5">
          <CallControls size="sm" share={false} onLeave={onHangUp} />
          {fold}
        </div>
      </div>
      <MediaNote className="px-1 pt-2" />
    </section>
  );
}

function StripFaces({ myRole, others }: { myRole: "interviewer" | "candidate"; others: string }) {
  const { local, main } = useCallPeople(myRole);
  // A phone tile is too small for a name label over the initials.
  const narrow = useMedia("(max-width: 639px)");
  return (
    <div className="flex-1 min-w-0 flex items-center gap-1.5 sm:gap-2">
      {main ? (
        <Tile participant={main} preferScreen avatar={36} showName={!narrow} rounded="rounded-lg" className="flex-1 min-w-0 sm:flex-none sm:w-[152px] h-[76px] sm:h-[88px]" />
      ) : (
        <div className="flex-1 min-w-0 sm:flex-none sm:w-[152px] h-[76px] sm:h-[88px] rounded-lg bg-panel flex items-center justify-center px-2 text-center">
          <span className="text-[12px] text-muted leading-snug line-clamp-3">Waiting for {others}</span>
        </div>
      )}
      <Tile participant={local} label="You" avatar={28} showName={false} rounded="rounded-lg" className="shrink-0 w-[60px] sm:w-[88px] h-[76px] sm:h-[88px] border border-border-strong" />
    </div>
  );
}

/** Shrunk: who is on the other side and whether they are talking. */
function Pill({ myRole, others }: { myRole: "interviewer" | "candidate"; others: string }) {
  const { main } = useCallPeople(myRole);
  if (!main) {
    return <span className="block pl-2 pr-1 text-[13px] text-muted truncate">Waiting for {others}</span>;
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
        <RoleAvatar name={name} role={roleOf(p)} size={36} />
      </span>
      <span className="leading-tight min-w-0 pr-1">
        <span className="block text-[13px] font-semibold truncate max-w-[140px]">{name}</span>
        <span className={`block text-[12px] ${speaking ? "text-success" : "text-muted"}`}>{speaking ? "Speaking" : muted ? "Muted" : "On the call"}</span>
      </span>
    </span>
  );
}
