"use client";

/**
 * Pieces of the call UI: a person's tile, the control buttons, the device
 * menu and the top bar chip. Everything here runs inside a connected call
 * (the LiveKit hooks need the room), except CallChip, which checks first.
 * Styled with the site tokens, not the LiveKit stylesheet.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Track, type Participant } from "livekit-client";
import {
  VideoTrack,
  isTrackReference,
  useIsMuted,
  useIsSpeaking,
  useLocalParticipant,
  useMediaDeviceSelect,
  useRemoteParticipants,
  useSpeakingParticipants,
  useTracks,
} from "@livekit/components-react";
import { Loader2, Mic, MicOff, MonitorUp, PhoneOff, RotateCcw, Settings2, Video, VideoOff, X } from "lucide-react";
import { Avatar } from "../parts";
import { useCall } from "./VideoCall";
import { savePrefs } from "./prefs";

export function roleOf(p: Participant): "interviewer" | "candidate" | null {
  try {
    const r = (JSON.parse(p.metadata || "{}") as { role?: string }).role;
    return r === "interviewer" || r === "candidate" ? r : null;
  } catch {
    return null;
  }
}

export function nameOf(p: Participant): string {
  return p.name?.trim() || (roleOf(p) === "candidate" ? "Candidate" : "Interviewer");
}

/**
 * Everyone on the call, and the other person to show large: whoever spoke
 * last, else someone from the other side of the table.
 */
export function useCallPeople(myRole: "interviewer" | "candidate") {
  const { localParticipant } = useLocalParticipant();
  const remotes = useRemoteParticipants();
  const speakers = useSpeakingParticipants();
  const [lastSpeaker, setLastSpeaker] = useState<string | null>(null);
  const talking = speakers.find((p) => !p.isLocal)?.identity ?? null;
  useEffect(() => {
    if (talking) setLastSpeaker(talking);
  }, [talking]);
  const main = useMemo(() => remotes.find((p) => p.identity === lastSpeaker) ?? remotes.find((p) => roleOf(p) !== myRole) ?? remotes[0] ?? null, [remotes, lastSpeaker, myRole]);
  return { local: localParticipant, main, remotes, count: remotes.length + 1 };
}

/**
 * One person: their camera (or shared screen), else their initials. A ring
 * while they speak, a crossed mic while muted.
 */
export function Tile({
  participant,
  label,
  avatar = 72,
  preferScreen = false,
  rounded = "rounded-xl",
  className = "",
  showName = true,
}: {
  participant: Participant;
  label?: string;
  avatar?: number;
  preferScreen?: boolean;
  rounded?: string;
  className?: string;
  showName?: boolean;
}) {
  const refs = useTracks([Track.Source.Camera, Track.Source.ScreenShare], { onlySubscribed: false });
  const mine = refs.filter((r) => r.participant.identity === participant.identity);
  const cam = mine.find((r) => r.source === Track.Source.Camera) ?? { participant, source: Track.Source.Camera };
  const screen = mine.find((r) => r.source === Track.Source.ScreenShare) ?? { participant, source: Track.Source.ScreenShare };
  const micMuted = useIsMuted({ participant, source: Track.Source.Microphone });
  const camMuted = useIsMuted(cam);
  const screenMuted = useIsMuted(screen);
  const speaking = useIsSpeaking(participant);
  const showScreen = preferScreen && isTrackReference(screen) && !screenMuted;
  const ref = showScreen ? screen : isTrackReference(cam) && !camMuted ? cam : null;
  const name = label ?? nameOf(participant);
  return (
    <div
      className={`relative overflow-hidden bg-panel flex items-center justify-center ${rounded} ${speaking ? "ring-2 ring-inset ring-success" : ""} ${className}`}
      aria-label={`${name}${micMuted ? ", muted" : ""}${speaking ? ", speaking" : ""}`}
    >
      {ref && isTrackReference(ref) ? (
        <VideoTrack
          trackRef={ref}
          className={`absolute inset-0 w-full h-full ${showScreen ? "object-contain bg-bg" : "object-cover"} ${participant.isLocal && !showScreen ? "[transform:scaleX(-1)]" : ""}`}
        />
      ) : (
        <Avatar name={name} size={avatar} />
      )}
      {showName && (
        <span className="absolute left-2 bottom-2 max-w-[calc(100%-1rem)] h-6 px-2 rounded-md bg-bg/75 text-[12px] text-fg inline-flex items-center gap-1.5 truncate">
          {micMuted && <MicOff className="w-3.5 h-3.5 text-danger shrink-0" aria-label="Muted" />}
          <span className="truncate">{name}</span>
        </span>
      )}
      {!showName && micMuted && (
        <span className="absolute right-1.5 bottom-1.5 w-5 h-5 rounded-full bg-bg/80 flex items-center justify-center">
          <MicOff className="w-3 h-3 text-danger" aria-label="Muted" />
        </span>
      )}
    </div>
  );
}

type CtlSize = "sm" | "md" | "lg";
const CTL: Record<CtlSize, string> = { sm: "w-9 h-9 rounded-full", md: "w-11 h-11 rounded-xl", lg: "w-12 h-12 rounded-full" };

function Ctl({
  size,
  on = true,
  danger = false,
  label,
  onClick,
  children,
  pressed,
}: {
  size: CtlSize;
  on?: boolean;
  danger?: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  pressed?: boolean;
}) {
  const tone = danger || !on ? "bg-danger/15 text-danger hover:bg-danger/25" : "bg-elevated text-fg hover:bg-border-strong/60";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className={`${CTL[size]} inline-flex items-center justify-center shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/60 ${tone}`}
    >
      {children}
    </button>
  );
}

/** Mute, camera, share screen, and optionally leave and device settings. */
export function CallControls({ size = "md", leave = true, share = true, settings = false }: { size?: CtlSize; leave?: boolean; share?: boolean; settings?: boolean }) {
  const call = useCall()!;
  const { isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled } = useLocalParticipant();
  const icon = size === "sm" ? "w-4 h-4" : "w-[18px] h-[18px]";
  return (
    <>
      <Ctl size={size} on={isMicrophoneEnabled} label={isMicrophoneEnabled ? "Mute" : "Unmute"} pressed={!isMicrophoneEnabled} onClick={() => void call.toggleMic()}>
        {isMicrophoneEnabled ? <Mic className={icon} aria-hidden /> : <MicOff className={icon} aria-hidden />}
      </Ctl>
      <Ctl size={size} on={isCameraEnabled} label={isCameraEnabled ? "Turn camera off" : "Turn camera on"} pressed={!isCameraEnabled} onClick={() => void call.toggleCamera()}>
        {isCameraEnabled ? <Video className={icon} aria-hidden /> : <VideoOff className={icon} aria-hidden />}
      </Ctl>
      {share && (
        <Ctl size={size} label={isScreenShareEnabled ? "Stop sharing your screen" : "Share screen"} pressed={isScreenShareEnabled} onClick={() => void call.toggleScreen()}>
          <MonitorUp className={`${icon} ${isScreenShareEnabled ? "text-success" : ""}`} aria-hidden />
        </Ctl>
      )}
      {settings && <DeviceMenu size={size} />}
      {leave && (
        <Ctl size={size} danger label="Leave the call" onClick={call.leave}>
          <PhoneOff className={icon} aria-hidden />
        </Ctl>
      )}
    </>
  );
}

/** Camera and mic pickers, remembered for next time. */
function DeviceMenu({ size }: { size: CtlSize }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div ref={box} className="relative">
      <Ctl size={size} label="Camera and mic settings" pressed={open} onClick={() => setOpen((o) => !o)}>
        <Settings2 className={size === "sm" ? "w-4 h-4" : "w-[18px] h-[18px]"} aria-hidden />
      </Ctl>
      {open && (
        <div
          role="dialog"
          aria-label="Camera and mic settings"
          className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-72 rounded-2xl border border-border-strong bg-surface p-4 shadow-2xl shadow-black/40 flex flex-col gap-3 z-20"
        >
          <DeviceSelect kind="videoinput" label="Camera" />
          <DeviceSelect kind="audioinput" label="Microphone" />
        </div>
      )}
    </div>
  );
}

function DeviceSelect({ kind, label }: { kind: "videoinput" | "audioinput"; label: string }) {
  const { devices, activeDeviceId, setActiveMediaDevice } = useMediaDeviceSelect({ kind });
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] text-muted">{label}</span>
      <select
        value={activeDeviceId}
        onChange={(e) => {
          const id = e.target.value;
          void setActiveMediaDevice(id).catch(() => {});
          savePrefs(kind === "videoinput" ? { camId: id } : { micId: id });
        }}
        className="h-10 rounded-lg border border-border bg-bg text-fg text-[13.5px] px-3"
      >
        {devices.length === 0 && <option value="">Default</option>}
        {devices.map((d, i) => (
          <option key={d.deviceId || i} value={d.deviceId}>
            {d.label || `${label} ${i + 1}`}
          </option>
        ))}
      </select>
    </label>
  );
}

/** A camera, mic or screen share problem, with a way to dismiss it. */
export function MediaNote({ className = "" }: { className?: string }) {
  const call = useCall();
  if (!call?.mediaError) return null;
  return (
    <p role="alert" className={`flex items-start gap-2 text-[12.5px] text-danger leading-snug ${className}`}>
      <span className="flex-1">{call.mediaError}</span>
      <button type="button" onClick={call.clearMediaError} aria-label="Dismiss" className="w-5 h-5 rounded text-muted hover:text-fg flex items-center justify-center shrink-0">
        <X className="w-3.5 h-3.5" aria-hidden />
      </button>
    </p>
  );
}

/** Joining, left, or could not join: the same small message wherever the call shows. */
export function CallState({ compact = false }: { compact?: boolean }) {
  const call = useCall();
  if (!call) return null;
  if (call.status === "connecting") {
    return (
      <p className="flex items-center gap-2 text-[13px] text-muted">
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> Joining the call
      </p>
    );
  }
  if (call.status === "left" || call.status === "error") {
    return (
      <div className={`flex ${compact ? "items-center gap-3" : "flex-col items-center gap-3 text-center"}`}>
        <p className={`text-[13px] ${call.status === "error" ? "text-danger" : "text-muted"} ${compact ? "flex-1" : "max-w-sm"}`}>{call.error ?? "You left the call. The interview carries on."}</p>
        <button type="button" onClick={call.rejoin} className="h-9 px-3.5 rounded-lg bg-secondary text-bg text-[13px] font-semibold inline-flex items-center gap-1.5 hover:brightness-110 shrink-0">
          <RotateCcw className="w-3.5 h-3.5" aria-hidden /> Rejoin
        </button>
      </div>
    );
  }
  if (call.status === "ended") return <p className="text-[13px] text-muted">The call has ended.</p>;
  return null;
}

/** "On call · 2" in the top bar, or a Rejoin button after leaving. */
export function CallChip() {
  const call = useCall();
  if (!call || call.status === "off" || call.status === "ended") return null;
  if (call.status === "connected" && call.room) return <OnCallChip />;
  if (call.status === "connecting") {
    return (
      <span className="h-8 px-2.5 rounded-lg ring-1 ring-inset ring-border text-muted text-[13px] inline-flex items-center gap-1.5 whitespace-nowrap">
        <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
        <span className="hidden sm:inline">Joining call</span>
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={call.rejoin}
      className="h-8 px-2.5 rounded-lg ring-1 ring-inset ring-border text-[13px] font-medium inline-flex items-center gap-1.5 hover:bg-panel whitespace-nowrap"
    >
      <Video className="w-3.5 h-3.5 text-muted" aria-hidden /> Rejoin call
    </button>
  );
}

function OnCallChip() {
  const remotes = useRemoteParticipants();
  const n = remotes.length + 1;
  return (
    <span
      role="status"
      title={`${n} ${n === 1 ? "person" : "people"} on the call`}
      className="h-8 px-2.5 rounded-lg ring-1 ring-inset ring-success/35 text-success text-[13px] font-medium inline-flex items-center gap-1.5 whitespace-nowrap"
    >
      <Video className="w-3.5 h-3.5" aria-hidden />
      <span className="hidden sm:inline">On call ·</span>
      <span className="sm:hidden sr-only">On call</span> {n}
    </span>
  );
}
