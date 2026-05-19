"use client";

/**
 * CollaborativeEditor
 * ─────────────────────────────────────────────────────────────
 * A fully self-contained, real-time collaborative code editor.
 *
 * How it works:
 *   • Creates a Yjs document (CRDT) that holds the shared text
 *   • Connects peers via y-webrtc (P2P, uses public signaling server)
 *   • Binds the Yjs text to CodeMirror via y-codemirror.next
 *   • Remote cursors are shown using Yjs Awareness
 *
 * Props:
 *   roomId      — unique string that identifies the shared session
 *                 (e.g. the interview session ID). All browsers
 *                 with the same roomId see the same document.
 *   language    — "javascript" | "typescript" | "python" | "css" | "html"
 *   defaultValue — initial code (only used when room is brand new)
 *   readOnly    — disables editing (for pure observers)
 *   username    — display name shown on remote cursors
 *   userColor   — hex colour for this user's cursor / badge
 *   onChange    — fires whenever local content changes
 *   className   — extra CSS classes for the wrapper div
 */

import { useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { WebrtcProvider } from "y-webrtc";
import { yCollab } from "y-codemirror.next";
import { EditorState, Compartment } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, drawSelection, highlightActiveLine, highlightActiveLineGutter } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { javascript } from "@codemirror/lang-javascript";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { oneDark } from "@codemirror/theme-one-dark";
import { indentOnInput, bracketMatching, syntaxHighlighting, defaultHighlightStyle, foldGutter } from "@codemirror/language";
import { closeBrackets, closeBracketsKeymap, autocompletion, completionKeymap } from "@codemirror/autocomplete";
import { Users, Wifi, WifiOff } from "lucide-react";

type Language = "javascript" | "typescript" | "python" | "css" | "html";

interface CollaborativeEditorProps {
  roomId: string;
  language?: Language;
  defaultValue?: string;
  readOnly?: boolean;
  username?: string;
  userColor?: string;
  onChange?: (value: string) => void;
  className?: string;
  height?: string;
}

/** Maps language string → CodeMirror extension */
function getLanguageExtension(lang: Language) {
  switch (lang) {
    case "typescript":
      return javascript({ typescript: true });
    case "javascript":
      return javascript();
    case "css":
      return css();
    case "html":
      return html();
    // Python doesn't have a first-party CM6 package installed yet; fall back
    default:
      return javascript({ typescript: true });
  }
}

/** Pick a deterministic-ish colour from a string (for when no color is passed) */
function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 55%)`;
}

interface Peer {
  id: number;
  name: string;
  color: string;
}

export default function CollaborativeEditor({
  roomId,
  language = "typescript",
  defaultValue = "",
  readOnly = false,
  username = "Anonymous",
  userColor,
  onChange,
  className = "",
  height = "100%",
}: CollaborativeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  const [connected, setConnected] = useState(false);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [peerCount, setPeerCount] = useState(0);

  const color = userColor ?? stringToColor(username);

  useEffect(() => {
    if (!editorRef.current) return;

    // ── 1. Yjs document ──────────────────────────────────────────
    const ydoc = new Y.Doc();
    const ytext = ydoc.getText("codemirror");

    // ── 2. WebRTC provider ───────────────────────────────────────
    const roomName = `interviewpad-collab-${roomId}`;
    const provider = new WebrtcProvider(roomName, ydoc, {
      signaling: [
        "ws://localhost:4444",              // local dev signaling (run: npx y-webrtc-signaling --port 4444)
        "wss://signaling.yjs.dev",          // public fallback
        "wss://y-webrtc-signaling-eu.herokuapp.com",
      ],
    });

    // Set local user awareness (shows up as cursor label for others)
    provider.awareness.setLocalStateField("user", {
      name: username,
      color,
      colorLight: color + "33",
    });

    // ── Seeding guard ────────────────────────────────────────────
    // A Y.Map key acts as a CRDT-safe "this room has been initialised" flag.
    // Only the peer that is ALONE in the room (no other awareness states) gets
    // to insert the default value. When a second peer joins, ytext already has
    // content from peer-1, so the check `ytext.length === 0` is false and no
    // duplicate insert occurs. The Y.Map flag also persists in the shared doc,
    // so a page refresh doesn't re-seed either.
    const yMeta = ydoc.getMap<boolean>("meta");

    function maybeSeed() {
      // Guard: only the designated "creator" peer passes a non-empty defaultValue.
      // Candidate/guest tabs pass defaultValue=undefined and never reach this.
      if (!defaultValue || defaultValue.trim() === "") return;
      if (ytext.length > 0) return;           // room already has content
      if (yMeta.get("seeded")) return;        // another peer already seeded (flag syncs via CRDT)
      // Only seed if we're the sole peer — i.e. no remote awareness states exist yet.
      // By the time this runs (after the delay below), WebRTC has had time to
      // discover and register any peers that were already in the room.
      const remoteIds = [...provider.awareness.getStates().keys()].filter(
        (id) => id !== ydoc.clientID
      );
      if (remoteIds.length > 0) return;       // another peer exists — they already have content

      ydoc.transact(() => {
        // Double-check inside the transaction (atomic)
        if (ytext.length === 0 && !yMeta.get("seeded")) {
          ytext.insert(0, defaultValue);
          yMeta.set("seeded", true);
        }
      });
    }

    // Track connection state — y-webrtc fires { synced: boolean }
    provider.on("synced", ({ synced }: { synced: boolean }) => {
      setConnected(synced);
      if (synced) maybeSeed();
    });

    // Track peer awareness (other users' cursors)
    function updatePeers() {
      const states = provider.awareness.getStates();
      const list: Peer[] = [];
      states.forEach((state, clientId) => {
        if (clientId !== ydoc.clientID && state.user) {
          list.push({
            id: clientId,
            name: state.user.name ?? "Unknown",
            color: state.user.color ?? "#888",
          });
        }
      });
      setPeers(list);
      setPeerCount(list.length);
    }
    provider.awareness.on("change", updatePeers);

    // ── 3. CodeMirror setup ──────────────────────────────────────
    const readOnlyCompartment = new Compartment();

    const state = EditorState.create({
      doc: ytext.toString(),
      extensions: [
        // Core key bindings
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...historyKeymap,
          ...completionKeymap,
          indentWithTab,
        ]),

        // History (undo/redo)
        history(),

        // Visual aids
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        drawSelection(),
        foldGutter(),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),

        // Autocompletion
        autocompletion(),

        // Syntax
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        getLanguageExtension(language),

        // Theme
        oneDark,

        // Read-only toggle
        readOnlyCompartment.of(EditorState.readOnly.of(readOnly)),

        // ── Yjs collaborative binding ───────────────────────────
        yCollab(ytext, provider.awareness),

        // Fire onChange on every local edit
        EditorView.updateListener.of((update) => {
          if (update.docChanged && onChange) {
            onChange(update.state.doc.toString());
          }
        }),

        // Base theme overrides (transparent background so parent controls it)
        EditorView.theme({
          "&": { height: "100%", background: "transparent" },
          ".cm-scroller": {
            fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
            fontSize: "13px",
            lineHeight: "1.6",
          },
          ".cm-gutters": { background: "transparent", borderRight: "1px solid rgba(255,255,255,0.07)" },
          ".cm-activeLineGutter": { background: "rgba(255,255,255,0.04)" },
        }),
      ],
    });

    const view = new EditorView({ state, parent: editorRef.current });
    viewRef.current = view;

    // Delayed seed: wait 600 ms before attempting to insert defaultValue.
    // This gives y-webrtc time to connect to the signaling server and populate
    // the awareness map with any existing peers. If another peer is already in
    // the room, `remoteIds.length > 0` inside maybeSeed() will block the insert.
    // If we're genuinely alone after 600 ms, we seed as the room creator.
    const seedTimer = window.setTimeout(maybeSeed, 600);

    // Detect when WebRTC peers connect
    provider.on("peers", () => setConnected(provider.connected));

    return () => {
      window.clearTimeout(seedTimer);
      view.destroy();
      provider.awareness.off("change", updatePeers);
      provider.destroy();
      ydoc.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, username, color]);

  return (
    <div className={`flex flex-col ${className}`} style={{ height }}>
      {/* Status bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#1a1b26] border-b border-white/10 shrink-0 select-none">
        <div className="flex items-center gap-2">
          {connected ? (
            <Wifi className="w-3 h-3 text-emerald-400" />
          ) : (
            <WifiOff className="w-3 h-3 text-rose-400 animate-pulse" />
          )}
          <span className="text-[10px] font-mono text-white/50">
            {connected ? "Synced" : "Connecting…"}
          </span>
          <span className="text-white/20 text-[10px]">·</span>
          <span className="text-[10px] font-mono text-white/50">{language}</span>
        </div>

        {/* Online peers */}
        <div className="flex items-center gap-1.5">
          {peers.map((p) => (
            <div
              key={p.id}
              title={p.name}
              className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black text-white/90 ring-1 ring-white/20"
              style={{ background: p.color }}
            >
              {p.name.charAt(0).toUpperCase()}
            </div>
          ))}
          {/* Local user bubble */}
          <div
            title={`${username} (you)`}
            className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black text-white/90 ring-2 ring-white/40"
            style={{ background: color }}
          >
            {username.charAt(0).toUpperCase()}
          </div>

          {peers.length > 0 && (
            <div className="flex items-center gap-1 ml-1">
              <Users className="w-3 h-3 text-white/40" />
              <span className="text-[10px] text-white/40 font-mono">{peerCount + 1}</span>
            </div>
          )}
        </div>
      </div>

      {/* Editor surface */}
      <div
        ref={editorRef}
        className="flex-1 min-h-0 overflow-auto bg-[#1a1b26]"
      />
    </div>
  );
}
