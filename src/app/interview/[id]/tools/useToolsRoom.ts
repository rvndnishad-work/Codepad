"use client";

/**
 * One shared Yjs document per interview for the room tools, plus the
 * interviewer-owned switchboard (which tools are on, which is presented).
 *
 * Two transports feed the same doc: the server relay (always on, stores
 * everything so a late joiner or a refresh gets the full picture) and
 * WebRTC between the two browsers for low latency when it can connect.
 * Each client posts only the edits it made itself.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { Room, WebrtcProvider } from "y-webrtc";
import type { Awareness } from "y-protocols/awareness";
import { getSignalingUrls } from "@/lib/signaling";
import { applyToolsAction, type ToolsAction, type ToolsState } from "@/lib/interview/tools";

export const RELAY = Symbol("tools-relay");

function toB64(u: Uint8Array): string {
  let s = "";
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(s);
}
function fromB64(b: string): Uint8Array {
  const s = atob(b);
  const u = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
  return u;
}

export type ToolsRoom = {
  doc: Y.Doc;
  awareness: Awareness | null;
  state: ToolsState | null;
  role: "interviewer" | "candidate" | null;
  live: boolean;
  synced: boolean;
  /** Server time minus local time, in ms. */
  offset: number;
  act: (a: ToolsAction) => Promise<string | null>;
};

/** Cursor colours come from the site tokens. */
function tokenColor(name: string): string {
  if (typeof document === "undefined") return "gray";
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v ? `rgb(${v})` : "gray";
}
const COLORS = ["--c-accent-2-soft", "--c-accent-4", "--c-accent-3", "--c-success"];

export function useToolsRoom({
  sessionId,
  token,
  roomKey,
  me,
}: {
  sessionId: string;
  /** Share token when this viewer came in by link. */
  token: string | null;
  /** Encrypts the peer-to-peer channel; both sides know the share token. */
  roomKey: string | null;
  me: { name: string; interviewer: boolean };
}): ToolsRoom {
  const [doc] = useState(() => new Y.Doc());
  const [state, setState] = useState<ToolsState | null>(null);
  const [role, setRole] = useState<ToolsRoom["role"]>(null);
  const [live, setLive] = useState(true);
  const [synced, setSynced] = useState(false);
  const [offset, setOffset] = useState(0);
  const [awareness, setAwareness] = useState<Awareness | null>(null);
  const peers = useRef(0);
  const cursor = useRef(0);
  const stateJson = useRef("");
  const pending = useRef(0);
  const base = `/api/interview/${encodeURIComponent(sessionId)}/tools`;
  const qs = token ? `token=${encodeURIComponent(token)}` : "";
  const url = (extra = "") => `${base}?${[extra, qs].filter(Boolean).join("&")}`;

  const adopt = useCallback((s: ToolsState) => {
    const j = JSON.stringify(s);
    if (j === stateJson.current) return;
    stateJson.current = j;
    setState(s);
  }, []);

  // Outgoing: batch this client's own edits and post them.
  useEffect(() => {
    let queue: Uint8Array[] = [];
    let timer: ReturnType<typeof setTimeout> | null = null;
    const flush = async () => {
      timer = null;
      if (!queue.length) return;
      const update = Y.mergeUpdates(queue);
      queue = [];
      try {
        const r = await fetch(url(), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ update: toB64(update) }), keepalive: update.length < 60000 });
        if (r.status >= 500 || r.status === 429) throw new Error("retry");
      } catch {
        queue.unshift(update);
        if (!timer) timer = setTimeout(flush, 2000);
      }
    };
    const onUpdate = (u: Uint8Array, origin: unknown) => {
      if (origin === RELAY || origin instanceof Room) return;
      queue.push(u);
      if (!timer) timer = setTimeout(flush, 150);
    };
    doc.on("update", onUpdate);
    return () => {
      doc.off("update", onUpdate);
      if (timer) clearTimeout(timer);
      void flush();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, sessionId, token]);

  // Incoming: poll the relay. Faster when no direct peer link is up.
  useEffect(() => {
    let stop = false;
    let t: ReturnType<typeof setTimeout> | null = null;
    const tick = async () => {
      let again = false;
      try {
        const r = await fetch(url(`since=${cursor.current}`), { cache: "no-store" });
        if (r.status === 403 || r.status === 404) {
          stop = true;
          return;
        }
        if (r.ok) {
          const j = (await r.json()) as { role: ToolsRoom["role"]; live: boolean; state: ToolsState; updates: string[]; cursor: number; more: boolean; now: number };
          if (stop) return;
          setOffset(j.now - Date.now());
          setRole(j.role);
          setLive(j.live);
          // Keep an optimistic local change until the server has caught up.
          if (pending.current === 0) adopt(j.state);
          for (const b of j.updates) Y.applyUpdate(doc, fromB64(b), RELAY);
          cursor.current = j.cursor;
          setSynced(true);
          again = j.more;
        }
      } catch {}
      if (stop) return;
      const hidden = typeof document !== "undefined" && document.hidden;
      t = setTimeout(tick, again ? 0 : hidden ? 5000 : peers.current > 0 ? 2500 : 900);
    };
    void tick();
    return () => {
      stop = true;
      if (t) clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, sessionId, token]);

  // Direct link between the two browsers, when signalling is reachable.
  useEffect(() => {
    if (!roomKey) return;
    let p: WebrtcProvider | null = null;
    try {
      p = new WebrtcProvider(`interviewpad-tools-${sessionId}`, doc, { signaling: getSignalingUrls(), password: roomKey });
    } catch {
      return;
    }
    const onPeers = (e: { webrtcPeers: string[] }) => {
      peers.current = e.webrtcPeers.length;
    };
    p.on("peers", onPeers);
    p.awareness.setLocalStateField("user", {
      name: me.name || (me.interviewer ? "Interviewer" : "Candidate"),
      color: tokenColor(COLORS[(me.interviewer ? 0 : 1) + (doc.clientID % 2) * 2]),
    });
    setAwareness(p.awareness);
    return () => {
      p?.off("peers", onPeers);
      p?.destroy();
      peers.current = 0;
      setAwareness(null);
    };
  }, [doc, sessionId, roomKey, me.name, me.interviewer]);

  useEffect(() => () => doc.destroy(), [doc]);

  const act = useCallback(
    async (a: ToolsAction): Promise<string | null> => {
      const cur = stateJson.current ? (JSON.parse(stateJson.current) as ToolsState) : null;
      const opt = cur ? applyToolsAction(cur, a, Date.now() + offset) : null;
      if (opt) adopt(opt);
      pending.current++;
      let server: ToolsState | null = null;
      let error: string | null = null;
      try {
        const r = await fetch(url(), { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(a) });
        const j = await r.json().catch(() => ({}));
        if (r.ok) server = j.state ?? null;
        else error = typeof j.error === "string" ? j.error : "Could not change the tools.";
      } catch {
        error = "You look offline. Try again.";
      }
      pending.current--;
      if (error && cur) adopt(cur);
      else if (server && pending.current === 0) adopt(server);
      return error;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [offset, adopt, sessionId, token],
  );

  return { doc, awareness, state, role, live, synced, offset, act };
}
