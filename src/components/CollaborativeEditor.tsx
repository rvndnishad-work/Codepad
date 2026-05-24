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

import { useEffect, useRef, useState, useMemo } from "react";
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
import {
  closeBrackets,
  closeBracketsKeymap,
  autocompletion,
  completionKeymap,
  completeAnyWord,
  type CompletionContext,
  type CompletionResult,
  type Completion,
} from "@codemirror/autocomplete";
import { Users, Wifi, WifiOff } from "lucide-react";
import { getSignalingUrls } from "@/lib/signaling";

type Language = "javascript" | "typescript" | "python" | "css" | "html";

interface CollaborativeEditorProps {
  roomId: string;
  language?: Language;
  defaultValue?: string;
  readOnly?: boolean;
  username?: string;
  userColor?: string;
  isInterviewer?: boolean;
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

const jsKeywords = [
  "const", "let", "var", "function", "return", "if", "else", "for", "while", "do",
  "switch", "case", "break", "continue", "class", "export", "import", "default",
  "new", "this", "typeof", "instanceof", "try", "catch", "finally", "throw",
  "async", "await", "yield", "null", "undefined", "true", "false"
].map(w => ({ label: w, type: "keyword" }));

const jsGlobals = [
  { label: "console", type: "constant", detail: "Console output" },
  { label: "window", type: "constant", detail: "Global window object" },
  { label: "document", type: "constant", detail: "DOM document object" },
  { label: "Math", type: "constant", detail: "Math library" },
  { label: "JSON", type: "constant", detail: "JSON parser/serializer" },
  { label: "Promise", type: "constant", detail: "Async Promise constructor" },
  { label: "Array", type: "class", detail: "Array constructor" },
  { label: "Object", type: "class", detail: "Object constructor" },
  { label: "String", type: "class", detail: "String constructor" },
  { label: "Number", type: "class", detail: "Number constructor" },
  { label: "Boolean", type: "class", detail: "Boolean constructor" },
  { label: "Date", type: "class", detail: "Date constructor" },
  { label: "RegExp", type: "class", detail: "RegExp constructor" },
  { label: "Error", type: "class", detail: "Error constructor" },
  { label: "setTimeout", type: "function", detail: "(fn, ms)" },
  { label: "setInterval", type: "function", detail: "(fn, ms)" },
  { label: "clearTimeout", type: "function", detail: "(id)" },
  { label: "clearInterval", type: "function", detail: "(id)" },
  { label: "fetch", type: "function", detail: "(url, options)" },
  { label: "parseInt", type: "function", detail: "(str, radix)" },
  { label: "parseFloat", type: "function", detail: "(str)" },
  { label: "isNaN", type: "function", detail: "(val)" }
];

const consoleMethods = [
  "log", "warn", "error", "info", "clear", "table", "dir", "time", "timeEnd", "group", "groupEnd"
].map(m => ({ label: m, type: "method", detail: "console method" }));

const documentMethods = [
  "getElementById", "querySelector", "querySelectorAll", "createElement", "createTextNode",
  "body", "head", "title", "addEventListener", "removeEventListener", "cookie"
].map(m => ({ label: m, type: "method", detail: "document property/method" }));

const windowMethods = [
  "addEventListener", "removeEventListener", "setTimeout", "setInterval", "clearTimeout",
  "clearInterval", "alert", "confirm", "prompt", "location", "history",
  "localStorage", "sessionStorage", "fetch", "innerWidth", "innerHeight"
].map(m => ({ label: m, type: "method", detail: "window property/method" }));

const mathMethods = [
  "abs", "ceil", "floor", "round", "max", "min", "pow", "sqrt", "random", "sin", "cos", "tan", "PI", "E"
].map(m => ({ label: m, type: "method", detail: "Math constant/function" }));

const jsonMethods = [
  "stringify", "parse"
].map(m => ({ label: m, type: "method", detail: "JSON method" }));

const promiseMethods = [
  "resolve", "reject", "all", "race", "allSettled", "any"
].map(m => ({ label: m, type: "method", detail: "Promise method" }));

const objectMethods = [
  "keys", "values", "entries", "assign", "create", "defineProperty", "freeze", "seal"
].map(m => ({ label: m, type: "method", detail: "Object method" }));

const arrayPrototypeMethods = [
  "map", "filter", "reduce", "forEach", "find", "findIndex", "includes", "indexOf",
  "slice", "splice", "push", "pop", "shift", "unshift", "join", "some", "every",
  "sort", "reverse", "concat", "flat", "flatMap"
].map(m => ({ label: m, type: "method", detail: "Array method" }));

const stringPrototypeMethods = [
  "split", "replace", "replaceAll", "substring", "slice", "toLowerCase", "toUpperCase",
  "trim", "charAt", "charCodeAt", "startsWith", "endsWith", "match", "search"
].map(m => ({ label: m, type: "method", detail: "String method" }));

function jsCompletionSource(context: CompletionContext): CompletionResult | null {
  const line = context.state.doc.lineAt(context.pos);
  const textBefore = line.text.slice(0, context.pos - line.from);

  // 1. Dot-member completion (e.g. console.l)
  const memberMatch = /([a-zA-Z_$][a-zA-Z0-9_$]*)\.([a-zA-Z0-9_$]*)$/.exec(textBefore);
  if (memberMatch) {
    const [, objName, typed] = memberMatch;
    let list: any[] = [];
    if (objName === "console") list = consoleMethods;
    else if (objName === "document") list = documentMethods;
    else if (objName === "window") list = windowMethods;
    else if (objName === "Math") list = mathMethods;
    else if (objName === "JSON") list = jsonMethods;
    else if (objName === "Promise") list = promiseMethods;
    else if (objName === "Object") list = objectMethods;

    if (list.length === 0) {
      list = [...arrayPrototypeMethods, ...stringPrototypeMethods];
    }

    const from = context.pos - typed.length;
    return {
      from,
      options: list,
      validFor: /^[a-zA-Z0-9_$]*$/
    };
  }

  // 2. Word completion (keywords + globals + buffer words)
  const wordMatch = context.matchBefore(/[a-zA-Z_$][a-zA-Z0-9_$]*$/);
  if (wordMatch) {
    const allOptions = [...jsKeywords, ...jsGlobals, ...arrayPrototypeMethods, ...stringPrototypeMethods];
    
    // Add local buffer word suggestions
    const bufferCompletions = completeAnyWord(context);
    const bufferOptions = (bufferCompletions && "options" in bufferCompletions) ? bufferCompletions.options : [];
    
    const merged: Completion[] = [...allOptions];
    const seen = new Set(merged.map(o => o.label));
    for (const opt of bufferOptions) {
      if (!seen.has(opt.label)) {
        merged.push(opt);
        seen.add(opt.label);
      }
    }

    return {
      from: wordMatch.from,
      options: merged,
      validFor: /^[a-zA-Z0-9_$]*$/
    };
  }

  return null;
}

export default function CollaborativeEditor({
  roomId,
  language = "typescript",
  defaultValue = "",
  readOnly = false,
  username = "Anonymous",
  userColor,
  isInterviewer,
  onChange,
  className = "",
  height = "100%",
}: CollaborativeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const providerRef = useRef<WebrtcProvider | null>(null);

  const readOnlyCompartmentRef = useRef(new Compartment());
  const languageCompartmentRef = useRef(new Compartment());

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const [connected, setConnected] = useState(false);
  const [fontSize, setFontSize] = useState(13);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [peerCount, setPeerCount] = useState(0);

  const color = userColor ?? (
    isInterviewer === undefined
      ? stringToColor(username)
      : (isInterviewer ? "#8b5cf6" : "#10b981")
  );

  // Dynamic user awareness (name, color, role)
  useEffect(() => {
    const provider = providerRef.current;
    if (!provider) return;

    const roleLabel = isInterviewer === undefined
      ? ""
      : (isInterviewer ? " (Interviewer)" : " (Candidate)");

    const finalName = username.endsWith(" (Interviewer)") || username.endsWith(" (Candidate)") || username.endsWith(" (interviewer)") || username.endsWith(" (candidate)")
      ? username
      : username + roleLabel;

    provider.awareness.setLocalStateField("user", {
      name: finalName,
      color,
      colorLight: color + "33",
    });
  }, [username, color, isInterviewer]);

  // Dynamic readOnly config transaction
  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: readOnlyCompartmentRef.current.reconfigure(EditorState.readOnly.of(readOnly))
      });
    }
  }, [readOnly]);

  // Dynamic language config transaction
  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: languageCompartmentRef.current.reconfigure(getLanguageExtension(language))
      });
    }
  }, [language]);

  useEffect(() => {
    if (!editorRef.current) return;

    // ── 1. Yjs document ──────────────────────────────────────────
    const ydoc = new Y.Doc();
    const ytext = ydoc.getText("codemirror");

    // ── 2. WebRTC provider ───────────────────────────────────────
    const roomName = `interviewpad-collab-${roomId}`;
    const provider = new WebrtcProvider(roomName, ydoc, {
      signaling: getSignalingUrls(),
    });
    providerRef.current = provider;

    // Set initial local user awareness (shows up as cursor label for others)
    const roleLabel = isInterviewer === undefined
      ? ""
      : (isInterviewer ? " (Interviewer)" : " (Candidate)");

    const finalName = username.endsWith(" (Interviewer)") || username.endsWith(" (Candidate)") || username.endsWith(" (interviewer)") || username.endsWith(" (candidate)")
      ? username
      : username + roleLabel;

    provider.awareness.setLocalStateField("user", {
      name: finalName,
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
    const readOnlyCompartment = readOnlyCompartmentRef.current;
    const languageCompartment = languageCompartmentRef.current;

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

        // Font scaling keybindings (Ctrl/Cmd + Plus/Minus/Equal)
        keymap.of([
          {
            key: "Mod-=",
            run: () => {
              setFontSize((prev) => Math.min(prev + 1, 30));
              return true;
            },
          },
          {
            key: "Mod-+",
            run: () => {
              setFontSize((prev) => Math.min(prev + 1, 30));
              return true;
            },
          },
          {
            key: "Mod--",
            run: () => {
              setFontSize((prev) => Math.max(prev - 1, 9));
              return true;
            },
          },
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
        autocompletion({ override: [jsCompletionSource] }),

        // Syntax
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        languageCompartment.of(getLanguageExtension(language)),

        // Theme
        oneDark,

        // Read-only toggle
        readOnlyCompartment.of(EditorState.readOnly.of(readOnly)),

        // ── Yjs collaborative binding ───────────────────────────
        yCollab(ytext, provider.awareness),

        // Fire onChange on every local edit
        EditorView.updateListener.of((update) => {
          if (update.docChanged && onChangeRef.current) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),

        // Base theme overrides (transparent background so parent controls it)
        EditorView.theme({
          "&": { height: "100%", background: "transparent" },
          ".cm-scroller": {
            fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
            fontSize: "var(--editor-font-size, 13px)",
            lineHeight: "1.6",
          },
          ".cm-gutters": { background: "transparent", borderRight: "1px solid rgba(255,255,255,0.07)" },
          ".cm-activeLineGutter": { background: "rgba(255,255,255,0.04)" },

          // Futuristic Collaborative Selections and Glowing Caret Pins
          // Futuristic Collaborative Selections and Glowing Caret Pins
          ".cm-ySelection": {
            borderRadius: "2px",
          },
          ".cm-ySelectionCaret, .cm-ySelection-caret": {
            position: "relative",
            borderLeft: "2px solid currentColor !important",
            borderRight: "none",
            marginLeft: "-1px",
            marginRight: "-1px",
            height: "1.25em",
            alignSelf: "center",
          },
          // Glowing pin dot at the top of the caret
          ".cm-ySelectionCaret::after, .cm-ySelection-caret::after": {
            content: '""',
            position: "absolute",
            top: "0",
            left: "-2.5px",
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            backgroundColor: "currentColor",
            boxShadow: "0 0 10px currentColor",
          },
          // High-End HUD Hover Info Tooltip
          ".cm-ySelectionInfo, .cm-ySelection-info": {
            position: "absolute",
            top: "-1.8em",
            left: "0",
            color: "#ffffff !important",
            fontFamily: '"Outfit", "Inter", sans-serif',
            fontSize: "9px !important",
            fontWeight: "900 !important",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            padding: "2px 6px !important",
            borderRadius: "3px !important",
            boxShadow: "0 3px 10px rgba(0, 0, 0, 0.4)",
            whiteSpace: "nowrap",
            opacity: "1 !important",
            pointerEvents: "none",
            zIndex: "100",
          },
          ".cm-ySelectionInfo::after, .cm-ySelection-info::after": {
            content: '""',
            position: "absolute",
            bottom: "-3px",
            left: "6px",
            width: "6px",
            height: "6px",
            backgroundColor: "inherit",
            transform: "rotate(45deg)",
            boxShadow: "2px 2px 2px rgba(0, 0, 0, 0.2)",
            zIndex: -1,
          },
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
      providerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

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
        <PresenceAvatarGroup
          username={username}
          isInterviewer={isInterviewer}
          selfColor={color}
          peers={peers}
        />
      </div>

      {/* Editor surface */}
      <div
        ref={editorRef}
        className="flex-1 min-h-0 overflow-auto bg-[#1a1b26]"
        style={{ "--editor-font-size": `${fontSize}px` } as React.CSSProperties}
      />
    </div>
  );
}

function PresenceAvatarGroup({
  username,
  isInterviewer,
  selfColor,
  peers,
}: {
  username: string;
  isInterviewer?: boolean;
  selfColor: string;
  peers: Peer[];
}) {
  const allUsers = useMemo(() => {
    const isSelfInterviewer = isInterviewer ?? (username.includes("(Interviewer)") || username.includes("interviewer"));
    const selfRole = isInterviewer === undefined ? (isSelfInterviewer ? "Interviewer" : "Candidate") : (isInterviewer ? "Interviewer" : "Candidate");
    const selfDisplayName = username
      .replace(" (Interviewer)", "")
      .replace(" (Candidate)", "")
      .replace(" (interviewer)", "")
      .replace(" (candidate)", "");

    return [
      {
        id: "self",
        name: selfDisplayName,
        role: selfRole,
        color: selfColor,
        isSelf: true,
      },
      ...peers.map((p) => {
        const isPeerInterviewer = p.name.includes("(Interviewer)") || p.name.includes("interviewer");
        const displayName = p.name
          .replace(" (Interviewer)", "")
          .replace(" (Candidate)", "")
          .replace(" (interviewer)", "")
          .replace(" (candidate)", "");
        return {
          id: String(p.id),
          name: displayName,
          role: isPeerInterviewer ? "Interviewer" : "Candidate",
          color: p.color,
          isSelf: false,
        };
      }),
    ];
  }, [username, isInterviewer, selfColor, peers]);

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-1.5 overflow-hidden py-1">
        {allUsers.map((user) => {
          const initials = user.name.charAt(0).toUpperCase();
          const shadowStyle = {
            boxShadow: `0 0 8px ${user.color}22, inset 0 0 3px ${user.color}44`,
            borderColor: user.color,
          };

          return (
            <div
              key={user.id}
              style={shadowStyle}
              className="relative group w-7 h-7 rounded-full border border-white/10 bg-[#1e1e2e] text-fg font-sans font-bold text-[10px] flex items-center justify-center cursor-pointer select-none transition-all duration-200 hover:-translate-y-0.5 hover:z-20 hover:scale-105 active:scale-95"
            >
              {/* Initials text */}
              <span className="tracking-wide text-[9px]" style={{ color: user.color }}>
                {initials}
              </span>

              {/* Online status indicator dot on the avatar */}
              <span
                className="absolute bottom-0 right-0 w-2 h-2 rounded-full border border-[#1e1e2e] animate-pulse"
                style={{ backgroundColor: user.color }}
              />

              {/* Rich Glassmorphic Tooltip */}
              <div className="absolute top-8 left-1/2 -translate-x-1/2 scale-95 opacity-0 group-hover:scale-100 group-hover:opacity-100 pointer-events-none transition-all duration-150 z-50">
                <div className="bg-[#181c26]/95 backdrop-blur-md border border-white/10 shadow-xl rounded-xl px-2.5 py-1.5 text-center whitespace-nowrap min-w-[100px]">
                  <p className="text-[10px] font-bold text-fg leading-tight">
                    {user.name} {user.isSelf && <span className="text-white/45 text-[8px] font-normal">(You)</span>}
                  </p>
                  <p className="text-[8px] tracking-wider uppercase font-black mt-0.5" style={{ color: user.color }}>
                    {user.role}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-1 pl-1 border-l border-white/10">
        {peers.length === 0 ? (
          <span className="text-[9px] uppercase tracking-widest font-extrabold text-white/30 animate-pulse">
            waiting for peer
          </span>
        ) : (
          <span className="text-[9px] uppercase tracking-widest font-extrabold text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            Live
          </span>
        )}
      </div>
    </div>
  );
}
