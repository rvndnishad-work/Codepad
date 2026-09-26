"use client";

/**
 * One shared Yjs document per interview for the room tools, plus the
 * interviewer-owned switchboard (which tools are on, which is presented).
 *
 * Everything goes through the server relay (RelayProvider): edits, cursors
 * and presence. It stores everything, so a late joiner or a refresh gets
 * the full picture, and it needs no peer-to-peer link, so it connects on
 * any network that can load the site.
 */
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type * as Y from "yjs";
import type { Awareness } from "y-protocols/awareness";
import { RelayProvider, type RelayOptions, type RelaySnapshot } from "@/lib/interview/relay-provider";
import { applyToolsAction, type ToolsAction, type ToolsState } from "@/lib/interview/tools";

export { RELAY_ORIGIN as RELAY } from "@/lib/interview/relay-provider";

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
  /** Connection, presence and room status from the relay. */
  relay: RelaySnapshot;
  provider: RelayProvider;
};

/** Cursor colours come from the site tokens. */
function tokenColor(name: string): string {
  if (typeof document === "undefined") return "gray";
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v ? `rgb(${v})` : "gray";
}
const COLORS = ["--c-accent-2-soft", "--c-accent-4", "--c-accent-3", "--c-success"];

/**
 * One relay connection for the life of the component. Created after mount
 * (never during server rendering) and closed on unmount; null until then.
 */
export function useRelayProvider(o: RelayOptions | null): RelayProvider | null {
  const [p, setP] = useState<RelayProvider | null>(null);
  const key = o ? `${o.sessionId}|${o.channel ?? "tools"}|${o.query ?? ""}|${o.readOnly ? 1 : 0}` : "";
  useEffect(() => {
    if (!o) return;
    const next = new RelayProvider(o);
    setP(next);
    return () => {
      next.destroy();
      setP(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => {
    if (p && o?.place) p.setPlace(o.place);
  }, [p, o?.place]);
  return p;
}

const EMPTY: RelaySnapshot = { connection: "connecting", synced: false, role: null, myName: null, live: true, peers: [], room: null, state: null, offset: 0, rttMs: null, unsaved: 0 };

/** Subscribes a component to a provider's snapshot. */
export function useRelaySnapshot(p: RelayProvider | null): RelaySnapshot {
  return useSyncExternalStore(
    useCallback((fn: () => void) => (p ? p.subscribe(fn) : () => {}), [p]),
    () => p?.snapshot ?? EMPTY,
    () => EMPTY,
  );
}

export function useToolsRoom({
  sessionId,
  token,
  guest = null,
  me,
  place = "room",
}: {
  sessionId: string;
  /** Share token when this viewer came in by an older link. */
  token: string | null;
  /** Emailed interviewer key (`?guest=`), for the older interviewer links. */
  guest?: string | null;
  /** Unused since the relay carries cursors; kept so older callers compile. */
  roomKey?: string | null;
  me: { name: string; interviewer: boolean };
  place?: "lobby" | "room";
}): ToolsRoom | null {
  const query = [token ? `token=${encodeURIComponent(token)}` : "", guest ? `guest=${encodeURIComponent(guest)}` : ""].filter(Boolean).join("&");
  const provider = useRelayProvider({ sessionId, query, place });
  return useToolsRoomOn(provider, me);
}

/** The tools room on a relay connection the caller already holds. */
export function useToolsRoomOn(provider: RelayProvider | null, me: { name: string; interviewer: boolean }): ToolsRoom | null {
  const relay = useRelaySnapshot(provider);

  // Our name and cursor colour, for the other side's cursors.
  useEffect(() => {
    if (!provider) return;
    provider.awareness.setLocalStateField("user", {
      name: relay.myName || me.name || (me.interviewer ? "Interviewer" : "Candidate"),
      color: tokenColor(COLORS[(me.interviewer ? 0 : 1) + (provider.doc.clientID % 2) * 2]),
    });
  }, [provider, relay.myName, me.name, me.interviewer]);

  // Switchboard: the server's copy, unless a local change is on its way.
  const [state, setState] = useState<ToolsState | null>(null);
  const stateJson = useRef("");
  const pending = useRef(0);
  const adopt = useCallback((s: ToolsState) => {
    const j = JSON.stringify(s);
    if (j === stateJson.current) return;
    stateJson.current = j;
    setState(s);
  }, []);
  useEffect(() => {
    if (relay.state && pending.current === 0) adopt(relay.state as ToolsState);
  }, [relay.state, adopt]);

  const act = useCallback(
    async (a: ToolsAction): Promise<string | null> => {
      if (!provider) return "Still connecting. Try again.";
      const cur = stateJson.current ? (JSON.parse(stateJson.current) as ToolsState) : null;
      const opt = cur ? applyToolsAction(cur, a, Date.now() + provider.snapshot.offset) : null;
      if (opt) adopt(opt);
      pending.current++;
      let server: ToolsState | null = null;
      let error: string | null = null;
      try {
        const r = await fetch(provider.url(), { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(a) });
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
    [provider, adopt],
  );

  if (!provider) return null;
  return {
    doc: provider.doc,
    awareness: provider.awareness,
    state,
    role: relay.role,
    live: relay.live,
    synced: relay.synced,
    offset: relay.offset,
    act,
    relay,
    provider,
  };
}
