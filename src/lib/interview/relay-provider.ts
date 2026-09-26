"use client";

/**
 * Browser side of the live room relay: keeps a Yjs document and its
 * awareness (names, cursors) in step with everyone else in the room over
 * plain HTTPS long polling. Nothing here needs a peer-to-peer link or a
 * signalling server, so it connects wherever the site itself loads.
 *
 * Edits are batched and posted; failed posts are kept and retried, so a
 * dropped connection loses nothing. Incoming edits, presence and room
 * status arrive on one long-poll loop that backs off while offline and
 * resumes the moment the browser is back online.
 */
import * as Y from "yjs";
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate, removeAwarenessStates } from "y-protocols/awareness";
import { backoffMs, type RelayConnection, type RelayPeer, type RelayRoom } from "./relay";

export const RELAY_ORIGIN = Symbol("relay");

export function toB64(u: Uint8Array): string {
  let s = "";
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(s);
}
export function fromB64(b: string): Uint8Array {
  const s = atob(b);
  const u = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
  return u;
}

type Wire = {
  role: "interviewer" | "candidate";
  me: { name: string };
  live: boolean;
  state: unknown;
  room: RelayRoom;
  peers: (RelayPeer & { awareness: string | null })[];
  updates: string[];
  cursor: number;
  more: boolean;
  fp?: string | null;
  now: number;
};

export type RelaySnapshot = {
  connection: RelayConnection;
  synced: boolean;
  role: Wire["role"] | null;
  myName: string | null;
  live: boolean;
  /** Everyone else with this room open, oldest first. */
  peers: RelayPeer[];
  room: RelayRoom | null;
  /** Tool switchboard, as the server sent it. */
  state: unknown;
  /** Server time minus local time, ms. */
  offset: number;
  /** Last measured round trip, ms. */
  rttMs: number | null;
  /** Local edits not yet stored on the server. */
  unsaved: number;
};

export type RelayOptions = {
  sessionId: string;
  channel?: string;
  doc?: Y.Doc;
  /** Extra query for the older links (`token=`, `guest=`). */
  query?: string;
  place?: "lobby" | "room";
  /** Only read and show presence; never post edits (the lobby). */
  readOnly?: boolean;
};

const LONG_POLL_MS = 8000;

export class RelayProvider {
  readonly doc: Y.Doc;
  readonly awareness: Awareness;
  private readonly opts: Required<Omit<RelayOptions, "doc">>;
  private snap: RelaySnapshot = { connection: "connecting", synced: false, role: null, myName: null, live: true, peers: [], room: null, state: null, offset: 0, rttMs: null, unsaved: 0 };
  private listeners = new Set<(s: RelaySnapshot) => void>();
  private cursor = 0;
  /** The server's view of the room at our last answer; lets it reply at once when that moved on. */
  private fp: string | null = null;
  private stopped = false;
  private failures = 0;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private poll: AbortController | null = null;
  private queue: Uint8Array[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private flushing = false;
  private awarenessTimer: ReturnType<typeof setTimeout> | null = null;
  private ownsDoc: boolean;

  constructor(o: RelayOptions) {
    this.ownsDoc = !o.doc;
    this.doc = o.doc ?? new Y.Doc();
    this.awareness = new Awareness(this.doc);
    this.opts = { sessionId: o.sessionId, channel: o.channel ?? "tools", query: o.query ?? "", place: o.place ?? "room", readOnly: !!o.readOnly };
    this.doc.on("update", this.onDocUpdate);
    this.awareness.on("update", this.onAwarenessUpdate);
    if (typeof window !== "undefined") {
      window.addEventListener("online", this.wake);
      window.addEventListener("pagehide", this.onPageHide);
      document.addEventListener("visibilitychange", this.wake);
    }
    void this.tick();
  }

  get snapshot(): RelaySnapshot {
    return this.snap;
  }

  subscribe(fn: (s: RelaySnapshot) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private set(p: Partial<RelaySnapshot>) {
    this.snap = { ...this.snap, ...p };
    for (const fn of this.listeners) fn(this.snap);
  }

  url(extra: Record<string, string | number> = {}): string {
    const q = new URLSearchParams({ channel: this.opts.channel });
    for (const [k, v] of Object.entries(extra)) q.set(k, String(v));
    const tail = this.opts.query ? `&${this.opts.query}` : "";
    return `/api/interview/${encodeURIComponent(this.opts.sessionId)}/tools?${q.toString()}${tail}`;
  }

  /** Moves this tab between the lobby and the room (shown to the others). */
  setPlace(place: "lobby" | "room") {
    if (this.opts.place === place) return;
    this.opts.place = place;
    this.restart();
  }

  /** Polls now instead of waiting for the current long poll (after a change of our own). */
  refresh() {
    this.restart();
  }

  /** One quick round trip, for the lobby's connection check. */
  async ping(): Promise<number | null> {
    const t = performance.now();
    try {
      const r = await fetch(this.url({ since: this.cursor }), { cache: "no-store" });
      if (!r.ok) return null;
      await r.json();
      const ms = Math.round(performance.now() - t);
      this.set({ rttMs: ms });
      return ms;
    } catch {
      return null;
    }
  }

  /** Posts pending edits now. Resolves true when nothing is left unsaved. */
  async flush(): Promise<boolean> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    await this.send();
    return this.queue.length === 0;
  }

  private wake = () => {
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
    this.restart();
  };

  /** Restarts the poll loop now: back online, back to the tab, or a new place. */
  private restart() {
    if (this.stopped) return;
    const inFlight = this.poll;
    this.poll = null;
    inFlight?.abort();
    if (this.pollTimer) clearTimeout(this.pollTimer);
    this.pollTimer = null;
    void this.tick();
    if (this.queue.length) void this.send();
  }

  private onDocUpdate = (u: Uint8Array, origin: unknown) => {
    if (origin === RELAY_ORIGIN || this.opts.readOnly) return;
    this.queue.push(u);
    this.set({ unsaved: this.queue.length });
    if (!this.flushTimer) this.flushTimer = setTimeout(() => void this.send(), 120);
  };

  private async send() {
    this.flushTimer = null;
    if (this.flushing || !this.queue.length || this.stopped) return;
    this.flushing = true;
    const batch = this.queue;
    this.queue = [];
    const update = Y.mergeUpdates(batch);
    const t = performance.now();
    try {
      const r = await fetch(this.url(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ update: toB64(update) }),
        keepalive: update.length < 60000,
      });
      if (r.status === 409) {
        // The interview ended: edits are no longer stored. Drop them.
      } else if (!r.ok) {
        throw new Error(String(r.status));
      } else {
        this.set({ rttMs: Math.round(performance.now() - t) });
      }
    } catch {
      this.queue.unshift(update);
      if (!this.flushTimer) this.flushTimer = setTimeout(() => void this.send(), backoffMs(Math.min(this.failures + 1, 5)));
    } finally {
      this.flushing = false;
      this.set({ unsaved: this.queue.length });
      if (this.queue.length && !this.flushTimer) this.flushTimer = setTimeout(() => void this.send(), 120);
    }
  }

  private onAwarenessUpdate = ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }, origin: unknown) => {
    if (origin === RELAY_ORIGIN || this.opts.readOnly) return;
    const id = this.doc.clientID;
    if (![...added, ...updated, ...removed].includes(id)) return;
    if (this.awarenessTimer) return;
    this.awarenessTimer = setTimeout(() => void this.sendAwareness(), 200);
  };

  private async sendAwareness() {
    this.awarenessTimer = null;
    if (this.stopped || !this.awareness.getLocalState()) return;
    const bytes = encodeAwarenessUpdate(this.awareness, [this.doc.clientID]);
    try {
      const r = await fetch(this.url(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ awareness: toB64(bytes), client: this.doc.clientID, place: this.opts.place }),
      });
      if (!r.ok && r.status >= 500) throw new Error(String(r.status));
    } catch {
      if (!this.awarenessTimer) this.awarenessTimer = setTimeout(() => void this.sendAwareness(), 2000);
    }
  }

  private async tick() {
    this.pollTimer = null;
    if (this.stopped) return;
    const ctrl = new AbortController();
    this.poll = ctrl;
    const wait = this.snap.synced ? LONG_POLL_MS : 0;
    const t = performance.now();
    let again = 0;
    try {
      // Give up on a request that hangs well past the long-poll window.
      const guard = setTimeout(() => ctrl.abort(), wait + 12000);
      const r = await fetch(this.url({ since: this.cursor, client: this.doc.clientID, place: this.opts.place, wait, ...(this.fp ? { fp: this.fp } : {}) }), { cache: "no-store", signal: ctrl.signal });
      clearTimeout(guard);
      if (r.status === 401 || r.status === 403 || r.status === 404) {
        this.set({ connection: "denied" });
        return;
      }
      if (!r.ok) throw new Error(String(r.status));
      const j = (await r.json()) as Wire;
      if (this.stopped) return;
      this.apply(j);
      this.failures = 0;
      this.set({
        connection: "live",
        synced: true,
        role: j.role,
        myName: j.me?.name ?? null,
        live: j.live,
        room: j.room,
        state: j.state,
        offset: j.now - Date.now(),
        peers: j.peers.filter((p) => p.clientId !== this.doc.clientID).map(({ awareness: _a, ...p }) => p),
        ...(wait === 0 ? { rttMs: Math.round(performance.now() - t) } : {}),
      });
      again = 0;
    } catch {
      if (this.stopped || this.poll !== ctrl) return;
      this.failures++;
      this.set({ connection: this.failures >= 3 || (typeof navigator !== "undefined" && navigator.onLine === false) ? "offline" : "reconnecting" });
      again = backoffMs(this.failures);
    }
    if (this.stopped || this.poll !== ctrl) return;
    this.poll = null;
    this.pollTimer = setTimeout(() => void this.tick(), again);
  }

  private apply(j: Wire) {
    if (j.updates.length) {
      Y.transact(
        this.doc,
        () => {
          for (const b of j.updates) Y.applyUpdate(this.doc, fromB64(b), RELAY_ORIGIN);
        },
        RELAY_ORIGIN,
      );
    }
    this.cursor = j.cursor;
    this.fp = j.fp ?? null;
    const present = new Set<number>();
    for (const p of j.peers) {
      if (p.clientId === this.doc.clientID) continue;
      present.add(p.clientId);
      if (p.awareness) {
        try {
          applyAwarenessUpdate(this.awareness, fromB64(p.awareness), RELAY_ORIGIN);
        } catch {}
      }
    }
    const gone = [...this.awareness.getStates().keys()].filter((id) => id !== this.doc.clientID && !present.has(id));
    if (gone.length) removeAwarenessStates(this.awareness, gone, RELAY_ORIGIN);
  }

  private onPageHide = () => {
    // Tell the others straight away rather than after the presence timeout.
    try {
      navigator.sendBeacon?.(this.url(), JSON.stringify({ leave: true, client: this.doc.clientID }));
    } catch {}
  };

  destroy() {
    if (this.stopped) return;
    void this.flush();
    this.onPageHide();
    this.stopped = true;
    this.poll?.abort();
    if (this.pollTimer) clearTimeout(this.pollTimer);
    if (this.awarenessTimer) clearTimeout(this.awarenessTimer);
    this.doc.off("update", this.onDocUpdate);
    this.awareness.off("update", this.onAwarenessUpdate);
    this.awareness.destroy();
    if (typeof window !== "undefined") {
      window.removeEventListener("online", this.wake);
      window.removeEventListener("pagehide", this.onPageHide);
      document.removeEventListener("visibilitychange", this.wake);
    }
    if (this.ownsDoc) this.doc.destroy();
    this.listeners.clear();
  }
}
