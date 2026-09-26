"use client";

/** Small pieces shared by the lobby and the room. Site tokens only. */
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { ArrowUpRight, Loader2, Video, Wifi, WifiOff } from "lucide-react";
import { LogoDynamicMark } from "@/components/LogoDynamic";
import { meetingProvider } from "@/lib/interview/meeting";
import type { RelaySnapshot } from "@/lib/interview/relay-provider";
import { Avatar } from "../../(shell)/candidates/_components/ui";

export { Avatar };

/** The hiring accent glow used by the workspace hero bands. */
export const GLOW: CSSProperties = {
  backgroundImage:
    "radial-gradient(560px 240px at 0% 0%, rgb(var(--c-accent-2) / 0.22), transparent 70%), radial-gradient(480px 240px at 100% 120%, rgb(var(--c-accent-2) / 0.12), transparent 70%)",
};

/** Dot grid that fades in from one side, laid over a glow band. */
export function DotGrid({ from = "right" }: { from?: "left" | "right" }) {
  const mask = `linear-gradient(to ${from === "right" ? "left" : "right"}, black, transparent 60%)`;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-60"
      style={{ backgroundImage: "radial-gradient(rgb(var(--c-border-strong) / 0.55) 1px, transparent 1px)", backgroundSize: "18px 18px", maskImage: mask, WebkitMaskImage: mask }}
    />
  );
}

/** Product mark plus the company, as in the workspace app bar. */
export function Brand({ workspace, href, trail }: { workspace: { name: string }; href?: string; trail?: string }) {
  const mark = (
    <span className="flex items-center gap-2 shrink-0">
      <LogoDynamicMark className="w-7 h-7" />
      <span className="hidden sm:inline text-[15px] font-semibold tracking-[-0.02em]">
        interview<span className="text-secondary-soft">pad</span>
      </span>
    </span>
  );
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      {href ? (
        <Link href={href} className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/60">
          {mark}
        </Link>
      ) : (
        mark
      )}
      <span className="text-border-strong text-lg font-light" aria-hidden>
        /
      </span>
      <span className="w-6 h-6 rounded-md bg-elevated border border-border-strong flex items-center justify-center text-xs font-semibold shrink-0" aria-hidden>
        {workspace.name.trim().charAt(0).toUpperCase() || "W"}
      </span>
      <span className="text-sm font-medium truncate">{workspace.name}</span>
      {trail && (
        <>
          <span className="hidden md:inline text-border-strong text-lg font-light" aria-hidden>
            /
          </span>
          <span className="hidden md:inline text-sm text-muted truncate">{trail}</span>
        </>
      )}
    </div>
  );
}

/** "08:12" under an hour, "1 h 05 min" above, for countdowns. */
export function countdown(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s >= 3600) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${h} h ${String(m).padStart(2, "0")} min`;
  }
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export type Person = { key: string; name: string; role: "interviewer" | "candidate"; place: "lobby" | "room"; me: boolean };

/** Everyone with the room or lobby open, one entry per person (not per tab). */
export function useRoster(snap: RelaySnapshot, me: { name: string; role: "interviewer" | "candidate" }, place: "lobby" | "room"): Person[] {
  return useMemo(() => {
    const out = new Map<string, Person>();
    const add = (p: Omit<Person, "key">) => {
      const key = `${p.role}:${p.name.toLowerCase()}`;
      const prev = out.get(key);
      if (!prev) out.set(key, { ...p, key });
      else if (p.place === "room" || p.me) out.set(key, { ...prev, place: p.place === "room" ? "room" : prev.place, me: prev.me || p.me });
    };
    add({ name: snap.myName ?? me.name, role: snap.role ?? me.role, place, me: true });
    for (const p of snap.peers) add({ name: p.name, role: p.role, place: p.place, me: false });
    return [...out.values()].sort((a, b) => (a.role === b.role ? 0 : a.role === "interviewer" ? -1 : 1));
  }, [snap.peers, snap.myName, snap.role, me.name, me.role, place]);
}

export function ConnectionPill({ snap, compact = false }: { snap: RelaySnapshot; compact?: boolean }) {
  const c = snap.connection;
  const tone =
    c === "live"
      ? "text-success bg-success/10 ring-success/25"
      : c === "connecting"
        ? "text-muted bg-panel ring-border"
        : c === "denied" || c === "offline"
          ? "text-danger bg-danger/10 ring-danger/25"
          : "text-warning bg-warning/10 ring-warning/25";
  const label =
    c === "live"
      ? snap.rttMs != null
        ? `Connected · ${snap.rttMs} ms`
        : "Connected"
      : c === "connecting"
        ? "Connecting"
        : c === "reconnecting"
          ? "Reconnecting"
          : c === "offline"
            ? "Offline"
            : "No access";
  const title =
    c === "live"
      ? snap.unsaved
        ? "Saving your latest changes"
        : "Everything you type is saved and shared"
      : c === "reconnecting" || c === "offline"
        ? "Your work is kept on this device and sent the moment the connection is back"
        : c === "denied"
          ? "This link no longer opens the room"
          : "Connecting to the room";
  return (
    <span role="status" title={title} className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md ring-1 ring-inset text-xs font-medium whitespace-nowrap ${tone}`}>
      {c === "connecting" || c === "reconnecting" ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
      ) : c === "live" ? (
        <Wifi className="w-3.5 h-3.5" aria-hidden />
      ) : (
        <WifiOff className="w-3.5 h-3.5" aria-hidden />
      )}
      {!compact && <span>{label}</span>}
      {compact && <span className="sr-only">{label}</span>}
    </span>
  );
}

export function PresenceDot({ on, className = "" }: { on: boolean; className?: string }) {
  return (
    <span className={`relative flex w-2.5 h-2.5 ${className}`} aria-hidden>
      {on && <span className="absolute inset-0 rounded-full bg-success/60 animate-ping motion-reduce:animate-none" />}
      <span className={`relative w-2.5 h-2.5 rounded-full ring-2 ring-surface ${on ? "bg-success" : "bg-border-strong"}`} />
    </span>
  );
}

/** Ticks once a second; `offset` is server minus local time. */
export function useNow(offset = 0, every = 1000): number {
  const [now, setNow] = useState(() => Date.now() + offset);
  useEffect(() => {
    setNow(Date.now() + offset);
    const t = setInterval(() => setNow(Date.now() + offset), every);
    return () => clearInterval(t);
  }, [offset, every]);
  return now;
}

export function roleLabel(r: "interviewer" | "candidate"): string {
  return r === "interviewer" ? "Interviewer" : "Candidate";
}

/** "Tue 29 Sep, 10:00" in the viewer's own time zone. */
export function whenLabel(iso: string | null): string {
  if (!iso) return "Time to be confirmed";
  const d = new Date(iso);
  return d.toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function relTime(ms: number): string {
  const abs = Math.abs(ms);
  const m = Math.round(abs / 60000);
  if (m < 1) return "now";
  if (m < 60) return ms > 0 ? `in ${m} min` : `${m} min ago`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  const s = r ? `${h} h ${r} min` : `${h} h`;
  if (h >= 48) {
    const d = Math.round(h / 24);
    return ms > 0 ? `in ${d} days` : `${d} days ago`;
  }
  return ms > 0 ? `in ${s}` : `${s} ago`;
}

/** Opens the team's video call in a new tab. */
export function MeetingButton({ url, size = "lg" }: { url: string; size?: "lg" | "sm" }) {
  const provider = meetingProvider(url);
  const label = provider ? `Join the ${provider} call` : "Join the video call";
  if (size === "sm") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title={`${label} (opens a new tab)`}
        className="h-8 px-3 rounded-lg bg-success/10 ring-1 ring-inset ring-success/30 text-success text-[13px] font-medium inline-flex items-center gap-1.5 hover:bg-success/15 whitespace-nowrap"
      >
        <Video className="w-3.5 h-3.5" aria-hidden />
        <span className="hidden sm:inline">Join call</span>
        <span className="sr-only sm:hidden">{label}</span>
      </a>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group w-full h-11 rounded-xl bg-bg ring-1 ring-inset ring-border-strong text-[14px] font-medium inline-flex items-center justify-center gap-2 hover:ring-success/50 hover:bg-success/5 transition"
    >
      <Video className="w-4 h-4 text-success" aria-hidden />
      {label}
      <ArrowUpRight className="w-3.5 h-3.5 text-subtle transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none" aria-hidden />
    </a>
  );
}
