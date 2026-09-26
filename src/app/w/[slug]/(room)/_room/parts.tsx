"use client";

/** Small pieces shared by the lobby and the room. Site tokens only. */
import { useEffect, useMemo, useState } from "react";
import { Loader2, Wifi, WifiOff } from "lucide-react";
import type { RelaySnapshot } from "@/lib/interview/relay-provider";
import { Avatar } from "../../(shell)/candidates/_components/ui";

export { Avatar };

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
