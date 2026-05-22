"use client";

/**
 * CollaborativePlayground
 * ─────────────────────────────────────────────────────────────────────
 * Sandpack-backed playground with multi-file Yjs collaboration.
 *
 * Architecture
 * ------------
 *  • One Y.Doc per interview-snippet room (roomId = `${interviewId}:${snippetId}`)
 *  • Inside the doc:
 *      yFiles : Y.Map<string, Y.Text>  — path → file contents
 *      yMeta  : Y.Map<string, boolean> — { seeded: true } guard flag
 *  • Sandpack renders preview + console; we render a custom CodeMirror
 *    editor wired via y-codemirror.next for free cursor presence.
 *
 * Seeding (CRDT-safe)
 * ------------------
 *  Mirrors the proven pattern from CollaborativeEditor:
 *    1. wait for "synced"
 *    2. if yMeta.seeded is set OR any file already has content OR we see
 *       remote peers in awareness → bail (someone seeded)
 *    3. else: transactional insert of starter files + flip yMeta.seeded
 *  Bonus: only the interviewer (owner) ever attempts to seed, which
 *  eliminates the simultaneous-double-seed race on a brand-new room.
 */

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useTheme } from "next-themes";
import * as Y from "yjs";
import { WebrtcProvider } from "y-webrtc";
import { yCollab } from "y-codemirror.next";
import { EditorState } from "@codemirror/state";
import {
  EditorView,
  keymap,
  lineNumbers,
  drawSelection,
  highlightActiveLine,
  highlightActiveLineGutter,
} from "@codemirror/view";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import { javascript } from "@codemirror/lang-javascript";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { oneDark } from "@codemirror/theme-one-dark";
import {
  indentOnInput,
  bracketMatching,
  syntaxHighlighting,
  defaultHighlightStyle,
  foldGutter,
} from "@codemirror/language";
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
import {
  SandpackProvider,
  SandpackPreview,
  SandpackConsole,
  useSandpack,
} from "@codesandbox/sandpack-react";
import type { SandpackFiles } from "@codesandbox/sandpack-react";
import { Users, Wifi, WifiOff, Play, Terminal, PanelBottom, Folder, MessageSquare, Send, X, GripHorizontal } from "lucide-react";
import FileExplorer from "./FileExplorer";
import { getSignalingUrls } from "@/lib/signaling";
import { useResizable } from "@/hooks/useResizable";
import { useResizableHeight } from "@/hooks/useResizableHeight";

type Props = {
  roomId: string;
  template: string;
  initialFiles: SandpackFiles;
  username: string;
  isInterviewer: boolean;
};

function pickLanguage(path: string) {
  const lower = path.toLowerCase();
  if (lower.endsWith(".css")) return css();
  if (lower.endsWith(".html") || lower.endsWith(".htm")) return html();
  if (lower.endsWith(".ts") || lower.endsWith(".tsx"))
    return javascript({ typescript: true, jsx: true });
  return javascript({ jsx: true });
}

function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 55%)`;
}

function codeFromFile(f: SandpackFiles[string]): string {
  if (typeof f === "string") return f;
  return (f as { code?: string }).code ?? "";
}

const nbpTheme = {
  colors: {
    surface1: "#050505",
    surface2: "#0A0A0A",
    surface3: "#111111",
    clickable: "#8b949e",
    base: "#e0e0e0",
    disabled: "#4d4d4d",
    hover: "#FFE600",
    accent: "#FFE600",
    error: "#ff4d4d",
    errorSurface: "#1a0000",
  },
  syntax: {
    plain: "#e0e0e0",
    comment: { color: "#6b7280", fontStyle: "italic" as const },
    keyword: "#D2A8FF",
    tag: "#D2A8FF",
    punctuation: "#e0e0e0",
    definition: "#FFE600",
    property: "#FFE600",
    static: "#FF9B71",
    string: "#A5D6FF",
  },
  font: {
    body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    mono: '"JetBrains Mono", monospace',
    size: "14px",
    lineHeight: "1.6",
  },
};

const nbpLightTheme = {
  colors: {
    surface1: "#ffffff",
    surface2: "#f8fafc",
    surface3: "#f1f5f9",
    clickable: "#64748b",
    base: "#1f2937",
    disabled: "#94a3b8",
    hover: "#f87171",
    accent: "#f87171",
    error: "#ef4444",
    errorSurface: "#fef2f2",
  },
  syntax: {
    plain: "#1f2937",
    comment: { color: "#94a3b8", fontStyle: "italic" as const },
    keyword: "#be185d",
    tag: "#be185d",
    punctuation: "#64748b",
    definition: "#0369a1",
    property: "#92400e",
    static: "#c2410c",
    string: "#15803d",
  },
  font: {
    body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    mono: '"JetBrains Mono", monospace',
    size: "14px",
    lineHeight: "1.6",
  },
};

type RemotePeer = { id: number; name: string; color: string };

type ChatMessage = {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
  isInterviewer: boolean;
};

export default function CollaborativePlayground({
  roomId,
  template,
  initialFiles,
  username,
  isInterviewer,
}: Props) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";

  const sandpackTheme = useMemo(() => {
    return isDark ? nbpTheme : nbpLightTheme;
  }, [isDark]);

  const yDoc = useMemo(() => {
    return new Y.Doc();
  }, [roomId]);
  const [provider, setProvider] = useState<WebrtcProvider | null>(null);
  const [connected, setConnected] = useState(false);
  const [peers, setPeers] = useState<RemotePeer[]>([]);

  const initialActive = useMemo(() => {
    const entries = Object.entries(initialFiles);
    
    // 1. Explicitly marked active file
    const explicit = entries.find(([, v]) =>
      typeof v === "object" && v !== null && "active" in v
        ? (v as { active?: boolean }).active
        : false
    );
    if (explicit) return explicit[0];

    // 2. Look for App/app/index js/ts/jsx/tsx files (including src/ prefix)
    const priorityNames = [
      "/App.js", "/app.js", "/src/App.js", "/src/app.js",
      "/App.tsx", "/app.tsx", "/src/App.tsx", "/src/app.tsx",
      "/App.jsx", "/app.jsx", "/src/App.jsx", "/src/app.jsx",
      "/index.js", "/src/index.js", "/index.tsx", "/src/index.tsx"
    ];
    for (const name of priorityNames) {
      if (initialFiles[name]) return name;
      const found = entries.find(([k]) => k.toLowerCase() === name.toLowerCase() || k.toLowerCase() === name.slice(1).toLowerCase());
      if (found) return found[0];
    }

    // 3. Fallback to any js/ts/jsx/tsx files
    const codeFile = entries.find(([k]) => /\.(js|ts|jsx|tsx)$/i.test(k));
    if (codeFile) return codeFile[0];

    // 4. Fallback to html files
    const htmlFile = entries.find(([k]) => /\.html$/i.test(k));
    if (htmlFile) return htmlFile[0];

    // 5. Fallback to first file or default index.js
    return entries[0]?.[0] ?? "/index.js";
  }, [initialFiles]);

  // Dynamic user presence updates
  useEffect(() => {
    if (!provider) return;
    const color = isInterviewer ? "#8b5cf6" : "#10b981";
    const roleLabel = isInterviewer ? " (Interviewer)" : " (Candidate)";
    provider.awareness.setLocalStateField("user", {
      name: username + roleLabel,
      color,
      colorLight: color + "33",
    });
  }, [provider, username, isInterviewer]);

  // Seed-once: only the interviewer is allowed to seed, eliminating the
  // double-seed race. Candidates wait for the seed to propagate.
  useEffect(() => {
    const color = isInterviewer ? "#8b5cf6" : "#10b981"; // Sleek Purple for Interviewer, Vibrant Emerald for Candidate
    const roleLabel = isInterviewer ? " (Interviewer)" : " (Candidate)";
    const wp = new WebrtcProvider(`interviewpad-pg-${roomId}`, yDoc, {
      signaling: getSignalingUrls(),
    });
    wp.awareness.setLocalStateField("user", {
      name: username + roleLabel,
      color,
      colorLight: color + "33",
    });

    const yFiles = yDoc.getMap<Y.Text>("files");
    const yMeta = yDoc.getMap<boolean>("meta");

    function maybeSeed() {
      // CRDT-safe seed: any peer can seed, but only the peer alone in the
      // room (no remote awareness states) actually does. When a second
      // peer joins, ytext already has content from peer-1, so the length
      // checks bail and no duplicate insert occurs. The yMeta flag also
      // syncs via CRDT so a refresh doesn't re-seed.
      if (yMeta.get("seeded")) return;
      let hasContent = false;
      yFiles.forEach((t) => {
        if (t.length > 0) hasContent = true;
      });
      if (hasContent) return;
      // Skip if there's already another peer in the room — they have
      // either seeded or will seed; we wait for the sync.
      const remoteIds = [...wp.awareness.getStates().keys()].filter(
        (id) => id !== yDoc.clientID
      );
      if (remoteIds.length > 0) return;

      yDoc.transact(() => {
        if (yMeta.get("seeded")) return;
        for (const [path, file] of Object.entries(initialFiles)) {
          let yText = yFiles.get(path);
          if (!yText) {
            yText = new Y.Text();
            yFiles.set(path, yText);
          }
          if (yText.length === 0) {
            yText.insert(0, codeFromFile(file));
          }
        }
        yMeta.set("seeded", true);
      });
    }

    // Seed on first sync + as a safety net on a short delay (in case
    // synced doesn't fire for a solo peer right away).
    wp.on("synced", ({ synced }: { synced: boolean }) => {
      setConnected(synced);
      if (synced) maybeSeed();
    });
    const seedTimer = setTimeout(maybeSeed, 800);

    const onAware = () => {
      const out: RemotePeer[] = [];
      wp.awareness.getStates().forEach((state, clientId) => {
        if (clientId === yDoc.clientID) return;
        const u = (state as { user?: { name?: string; color?: string } }).user;
        if (!u) return;
        out.push({
          id: clientId,
          name: u.name ?? "Peer",
          color: u.color ?? "#888",
        });
      });
      setPeers(out);
    };
    wp.awareness.on("change", onAware);
    onAware();

    setProvider(wp);

    return () => {
      clearTimeout(seedTimer);
      wp.awareness.off("change", onAware);
      wp.destroy();
      setProvider(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, yDoc]);

  return (
    <SandpackProvider
      template={template as any}
      files={initialFiles}
      theme={sandpackTheme}
      options={{ activeFile: initialActive }}
    >
      <Bridge
        provider={provider}
        yDoc={yDoc}
        peers={peers}
        connected={connected}
        username={username}
        isInterviewer={isInterviewer}
        initialFiles={initialFiles}
      />
    </SandpackProvider>
  );
}


function Bridge({
  provider,
  yDoc,
  peers,
  connected,
  username,
  isInterviewer,
  initialFiles,
}: {
  provider: WebrtcProvider | null;
  yDoc: Y.Doc;
  peers: RemotePeer[];
  connected: boolean;
  username: string;
  isInterviewer: boolean;
  initialFiles: SandpackFiles;
}) {
  const { sandpack } = useSandpack();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  const activePath = sandpack.activeFile;
  const peerCount = peers.length;
  const selfColor = isInterviewer ? "#8b5cf6" : "#10b981";

  const [explorerCollapsed, setExplorerCollapsed] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [rightView, setRightView] = useState<"preview" | "both" | "console">("both");

  const { width: explorerW, onPointerDown: onExplorerDrag } = useResizable(200, 120, 400);
  const { width: editorW, onPointerDown: onEditorDrag, setWidth: setEditorW } = useResizable(500, 200, 2000);
  const { height: consoleH, onPointerDown: onConsoleDrag, setHeight: setConsoleH } = useResizableHeight(200, 80, 1200);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const explorerWidth = explorerCollapsed ? 40 : explorerW;
      const remainingW = window.innerWidth - explorerWidth;
      setEditorW(Math.max(200, Math.floor(remainingW * 0.5)));

      const totalH = window.innerHeight - 64; // 64px header
      setConsoleH(Math.max(80, Math.floor(totalH * 0.4)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [bubbleOffset, setBubbleOffset] = useState({ x: 0, y: 0 });
  const bubbleDragRef = useRef({ startX: 0, startY: 0, offsetX: 0, offsetY: 0, moved: false });
  const [windowOffset, setWindowOffset] = useState({ x: 0, y: 0 });
  const windowDragRef = useRef({ startX: 0, startY: 0, offsetX: 0, offsetY: 0 });

  const onBubblePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    const dragInfo = bubbleDragRef.current;
    dragInfo.startX = e.clientX;
    dragInfo.startY = e.clientY;
    dragInfo.offsetX = bubbleOffset.x;
    dragInfo.offsetY = bubbleOffset.y;
    dragInfo.moved = false;

    // Capture starting offsets to sync window positioning relatively
    const startWinX = windowOffset.x;
    const startWinY = windowOffset.y;

    const onPointerMove = (ev: PointerEvent) => {
      const dx = ev.clientX - dragInfo.startX;
      const dy = ev.clientY - dragInfo.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        dragInfo.moved = true;
      }

      let newBubbleX = dragInfo.offsetX + dx;
      let newBubbleY = dragInfo.offsetY + dy;

      if (chatOpen) {
        // Offset of window relative to bubble at start of drag
        const rx = startWinX - dragInfo.offsetX;
        const ry = startWinY - dragInfo.offsetY;

        // Combined limits to keep BOTH completely inside the viewport
        const minBux = Math.max(
          -(window.innerWidth - 80),
          (window.innerWidth > 364 ? -(window.innerWidth - 364) : 0) - rx
        );
        const maxBux = Math.min(24, 24 - rx);
        newBubbleX = Math.max(minBux, Math.min(maxBux, newBubbleX));

        const minBuy = Math.max(
          -(window.innerHeight - 80),
          (window.innerHeight > 556 ? -(window.innerHeight - 556) : 0) - ry
        );
        const maxBuy = Math.min(24, 96 - ry);
        newBubbleY = Math.max(minBuy, Math.min(maxBuy, newBubbleY));

        setBubbleOffset({ x: newBubbleX, y: newBubbleY });
        setWindowOffset({ x: newBubbleX + rx, y: newBubbleY + ry });
      } else {
        // Clamp bubble only
        const minBux = -(window.innerWidth - 80);
        const maxBux = 24;
        newBubbleX = Math.max(minBux, Math.min(maxBux, newBubbleX));

        const minBuy = -(window.innerHeight - 80);
        const maxBuy = 24;
        newBubbleY = Math.max(minBuy, Math.min(maxBuy, newBubbleY));

        setBubbleOffset({ x: newBubbleX, y: newBubbleY });
      }
    };

    const onPointerUp = () => {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
      if (!dragInfo.moved) {
        setChatOpen(prev => {
          const next = !prev;
          if (next) {
            setWindowOffset({ x: bubbleOffset.x, y: bubbleOffset.y });
          }
          return next;
        });
      }
    };

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
  };

  const onWindowPointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest(".drag-handle")) return;
    if (target.closest("button")) return;

    e.preventDefault();
    const dragInfo = windowDragRef.current;
    dragInfo.startX = e.clientX;
    dragInfo.startY = e.clientY;
    dragInfo.offsetX = windowOffset.x;
    dragInfo.offsetY = windowOffset.y;

    const onPointerMove = (ev: PointerEvent) => {
      const dx = ev.clientX - dragInfo.startX;
      const dy = ev.clientY - dragInfo.startY;

      const minWinX = window.innerWidth > 364 ? -(window.innerWidth - 364) : 0;
      const maxWinX = 24;
      const clampedX = Math.max(minWinX, Math.min(maxWinX, dragInfo.offsetX + dx));

      const minWinY = window.innerHeight > 556 ? -(window.innerHeight - 556) : 0;
      const maxWinY = 96;
      const clampedY = Math.max(minWinY, Math.min(maxWinY, dragInfo.offsetY + dy));

      setWindowOffset({ x: clampedX, y: clampedY });
    };

    const onPointerUp = () => {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
    };

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
  };

  // Self-healing boundary clamping effect on mount, window resizing, and toggle
  useEffect(() => {
    const clampCoordinates = () => {
      setBubbleOffset(prev => {
        const minX = -(window.innerWidth - 80);
        const maxX = 24;
        const minY = -(window.innerHeight - 80);
        const maxY = 24;
        return {
          x: Math.max(minX, Math.min(maxX, prev.x)),
          y: Math.max(minY, Math.min(maxY, prev.y))
        };
      });

      setWindowOffset(prev => {
        const minX = window.innerWidth > 364 ? -(window.innerWidth - 364) : 0;
        const maxX = 24;
        const minY = window.innerHeight > 556 ? -(window.innerHeight - 556) : 0;
        const maxY = 96;
        return {
          x: Math.max(minX, Math.min(maxX, prev.x)),
          y: Math.max(minY, Math.min(maxY, prev.y))
        };
      });
    };

    clampCoordinates();
    window.addEventListener("resize", clampCoordinates);
    return () => window.removeEventListener("resize", clampCoordinates);
  }, [chatOpen]);

  // Synchronize chat messages with Y.Array
  useEffect(() => {
    const yChat = yDoc.getArray<ChatMessage>("chat");
    setMessages(yChat.toArray());

    const observer = () => {
      setMessages(yChat.toArray());
    };
    yChat.observe(observer);
    return () => {
      yChat.unobserve(observer);
    };
  }, [yDoc]);

  // Track unread messages & play notification sound
  const lastLenRef = useRef(messages.length);
  useEffect(() => {
    if (messages.length > lastLenRef.current) {
      // Check if the last message is from a remote peer
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && lastMsg.sender !== username) {
        // Synthesize a beautiful notification chime sound using Web Audio API
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          
          oscillator.type = "sine";
          oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // Pleasant A5 chime pitch
          oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.15); // Glide to A4
          
          gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
          gainNode.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.02); // 20ms attack
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3); // Smooth 300ms decay
          
          oscillator.start(audioCtx.currentTime);
          oscillator.stop(audioCtx.currentTime + 0.35);
        } catch (err) {
          console.warn("AudioContext chime failed or blocked:", err);
        }
      }

      if (!chatOpen) {
        setUnreadCount(prev => prev + (messages.length - lastLenRef.current));
      }
    }

    if (chatOpen) {
      setUnreadCount(0);
    }
    lastLenRef.current = messages.length;
  }, [messages, chatOpen, username]);

  // When yText for a file changes (from any source), push to Sandpack so
  // preview re-runs. Subscribe at the doc level; we don't need per-file
  // listeners since the active-file editor already pushes its own edits.
  useEffect(() => {
    const yFiles = yDoc.getMap<Y.Text>("files");
    const observer = (events: Y.YEvent<Y.AbstractType<unknown>>[]) => {
      for (const ev of events) {
        // ev.target is the Y.Text whose contents changed
        const target = ev.target;
        if (!(target instanceof Y.Text)) continue;
        // Find the path for this Y.Text
        let foundPath: string | null = null;
        yFiles.forEach((t, p) => {
          if (t === target) foundPath = p;
        });
        if (!foundPath) continue;
        const newCode = target.toString();
        const current = sandpack.files[foundPath]?.code;
        if (current !== newCode) {
          sandpack.updateFile(foundPath, newCode);
        }
      }
    };
    yFiles.observeDeep(observer);
    return () => yFiles.unobserveDeep(observer);
  }, [yDoc, sandpack]);

  const dynamicStyles = useMemo(() => {
    return `
      .ide-divider {
        background: var(--border);
        transition: background 0.2s ease;
        flex-shrink: 0;
        position: relative;
        z-index: 10;
      }
      .ide-divider:hover {
        background: var(--accent);
        opacity: 0.4;
      }
      .ide-divider-h {
        background: var(--border);
        transition: background 0.2s ease;
        flex-shrink: 0;
        position: relative;
        z-index: 10;
      }
      .ide-divider-h:hover {
        background: var(--accent);
        opacity: 0.4;
      }
      @keyframes float-pulse {
        0%, 100% {
          box-shadow: 0 0 0 0px rgba(var(--accent-rgb), 0.4), 0 10px 25px -5px rgba(0, 0, 0, 0.3);
        }
        50% {
          box-shadow: 0 0 0 8px rgba(var(--accent-rgb), 0), 0 10px 25px -5px rgba(0, 0, 0, 0.3);
        }
      }
      .fab-glow {
        animation: float-pulse 2s infinite;
      }
    `;
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: dynamicStyles }} />
      <div className="flex w-full h-[calc(100vh-64px)] bg-bg overflow-hidden relative">
        {/* ── Left Sidebar: File Explorer ── */}
        {!explorerCollapsed ? (
          <>
            <div style={{ width: explorerW, minWidth: 0 }} className="h-full shrink-0 flex flex-col ide-panel border-r border-border bg-surface/30">
              <div className="flex-1 min-h-0 overflow-y-auto">
                <FileExplorer readOnly onCollapse={() => setExplorerCollapsed(true)} />
              </div>
            </div>
            <div className="ide-divider h-full w-px cursor-col-resize" onPointerDown={onExplorerDrag}>
              <div className="absolute inset-y-0 -left-1.5 -right-1.5" />
            </div>
          </>
        ) : (
          <div className="h-full shrink-0 w-10 flex flex-col items-center py-4 bg-surface border-r border-border select-none gap-4">
            <button onClick={() => setExplorerCollapsed(false)} className="p-2 rounded-xl bg-bg hover:bg-elevated text-muted transition animate-fade-in" title="Expand Files">
              <PanelBottom className="w-4 h-4 rotate-90" />
            </button>
          </div>
        )}

        {/* ── Editor pane ── */}
        <div style={{ width: editorW, minWidth: 0 }} className="h-full shrink-0 flex flex-col ide-panel border-r border-border bg-bg">
          {/* File tab — single active file, no close (multiplayer pinned) */}
          <div className="h-9 shrink-0 flex items-stretch border-b border-border bg-surface">
            <div className="flex items-center gap-2 px-3 border-r border-border bg-bg text-[11px] font-mono text-fg">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              <span className="truncate">{activePath.replace(/^\//, "")}</span>
            </div>
            <div className="flex-1 min-w-0" />
            {/* Split view toggle for preview/console */}
            <div className="flex items-center mr-2">
              <div className="flex items-center gap-1 bg-surface border border-border rounded px-1 py-0.5 select-none shrink-0">
                <button
                  onClick={() => setRightView("preview")}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all duration-150 ${
                    rightView === "preview"
                      ? "bg-accent text-bg shadow-sm"
                      : "text-muted hover:text-fg hover:bg-elevated"
                  }`}
                  title="Preview Only"
                >
                  Preview
                </button>
                <button
                  onClick={() => setRightView("both")}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all duration-150 ${
                    rightView === "both"
                      ? "bg-accent text-bg shadow-sm"
                      : "text-muted hover:text-fg hover:bg-elevated"
                  }`}
                  title="Split View"
                >
                  Split
                </button>
                <button
                  onClick={() => setRightView("console")}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all duration-150 ${
                    rightView === "console"
                      ? "bg-accent text-bg shadow-sm"
                      : "text-muted hover:text-fg hover:bg-elevated"
                  }`}
                  title="Console Only"
                >
                  Console
                </button>
              </div>
            </div>
            {/* Presence & Network status */}
            <div className="px-3 flex items-center gap-1.5 shrink-0 border-l border-border">
              <div
                className="p-1 rounded hover:bg-surface/50 transition-colors cursor-help flex items-center justify-center"
                title={
                  peerCount > 0
                    ? `${peerCount} peer${peerCount === 1 ? "" : "s"} connected`
                    : connected
                      ? "Solo mode (connected)"
                      : "Connecting to peers..."
                }
              >
                {connected ? (
                  <Wifi className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <WifiOff className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                )}
              </div>
              <div className="w-px h-4 bg-border mx-1" />
              <PresenceDot
                label={username + (isInterviewer ? " (you · interviewer)" : " (you · candidate)")}
                color={selfColor}
                self
              />
              {peers.map((p) => (
                <PresenceDot key={p.id} label={p.name} color={p.color} />
              ))}
              {peers.length === 0 ? (
                <span className="text-[9px] uppercase tracking-widest font-bold text-muted/50 ml-1">
                  waiting for peer
                </span>
              ) : (
                <span className="text-[9px] uppercase tracking-widest font-bold text-emerald-500 ml-1 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  Live
                </span>
              )}
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            <CollabCodeMirror
              key={activePath}
              yDoc={yDoc}
              provider={provider}
              path={activePath}
              initialCode={initialFiles[activePath] ? codeFromFile(initialFiles[activePath]) : ""}
              onLocalEdit={(code) => {
                if (sandpack.files[activePath]?.code !== code) {
                  sandpack.updateFile(activePath, code);
                }
              }}
              isDark={isDark}
            />
          </div>
        </div>
        <div className="ide-divider h-full w-px cursor-col-resize" onPointerDown={onEditorDrag}>
          <div className="absolute inset-y-0 -left-2 -right-2" />
        </div>

        {/* ── Preview + console (vertical split, resizable) ── */}
        <div className="flex-1 min-w-0 h-full flex flex-col relative ide-panel bg-bg">
          {rightView !== "console" && (
            <div className="flex-1 min-h-0 flex flex-col bg-bg">
              <div className="h-9 shrink-0 px-3 flex items-center gap-1.5 border-b border-border bg-surface text-[10px] font-bold uppercase tracking-[0.15em] text-muted">
                <Play className="w-3 h-3 text-accent" />
                Preview
              </div>
              <div className="flex-1 min-h-0 bg-bg">
                <SandpackPreview
                  style={{ height: "100%" }}
                  showOpenInCodeSandbox={false}
                  showRefreshButton
                />
              </div>
            </div>
          )}
          
          {rightView === "both" && (
            /* Horizontal Drag Handle */
            <div className="ide-divider-h w-full h-px cursor-row-resize" onPointerDown={onConsoleDrag}>
              <div className="absolute inset-x-0 -top-1.5 -bottom-1.5" />
            </div>
          )}

          {rightView !== "preview" && (
            <div
              style={rightView === "both" ? { height: consoleH } : { flex: 1 }}
              className="shrink-0 min-h-0 flex flex-col bg-bg"
            >
              <div className="h-9 shrink-0 px-3 flex items-center gap-1.5 border-y border-border bg-surface text-[10px] font-bold uppercase tracking-[0.15em] text-muted">
                <Terminal className="w-3 h-3 text-accent" />
                Console
              </div>
              <div className="flex-1 min-h-0 bg-bg">
                <SandpackConsole style={{ height: "100%" }} />
              </div>
            </div>
          )}
        </div>

        {/* ── Floating Draggable Chat Bubble (FAB) ── */}
        <div
          onPointerDown={onBubblePointerDown}
          style={{
            transform: `translate3d(${bubbleOffset.x}px, ${bubbleOffset.y}px, 0)`,
            touchAction: "none"
          }}
          className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-accent text-bg shadow-xl hover:scale-105 active:scale-95 cursor-grab active:cursor-grabbing select-none fab-glow border border-border transition-transform duration-100"
          title="Toggle chat room"
        >
          <MessageSquare className="w-6 h-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-black shadow-md animate-bounce">
              {unreadCount}
            </span>
          )}
        </div>

        {/* ── Floating Draggable Chat Window ── */}
        {chatOpen && (
          <div
            onPointerDown={onWindowPointerDown}
            style={{
              transform: `translate3d(${windowOffset.x}px, ${windowOffset.y}px, 0)`,
              touchAction: "none"
            }}
            className="fixed bottom-24 right-6 w-[340px] h-[460px] z-50 flex flex-col bg-surface border border-border shadow-2xl rounded-2xl overflow-hidden font-sans select-none animate-fade-in"
          >
            {/* Window Drag Header */}
            <div className="drag-handle h-11 shrink-0 px-3 border-b border-border bg-panel flex items-center justify-between cursor-grab active:cursor-grabbing select-none">
              <div className="flex items-center gap-2">
                <GripHorizontal className="w-4 h-4 text-muted/60" />
                <span className="text-[11px] font-mono font-bold uppercase tracking-[0.1em] text-fg/80">
                  Live Chat
                </span>
                {peers.length > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setChatOpen(false);
                }}
                className="p-1 rounded-lg hover:bg-surface/80 text-muted hover:text-fg transition-colors"
                title="Close Chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chat Body */}
            <div className="flex-1 min-h-0 flex flex-col select-text">
              <CollabChat
                messages={messages}
                username={username}
                isInterviewer={isInterviewer}
                yDoc={yDoc}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function PresenceDot({
  label,
  color,
  self = false,
}: {
  label: string;
  color: string;
  self?: boolean;
}) {
  return (
    <span
      title={label}
      className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold text-white shadow-sm ${
        self ? "ring-2 ring-bg" : ""
      }`}
      style={{ backgroundColor: color }}
    >
      {label.charAt(0).toUpperCase()}
    </span>
  );
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

/**
 * CodeMirror bound to yFiles.get(path). Remounts on path change via parent key.
 * Theme/keymap mirror the existing CollaborativeEditor so it looks identical.
 */
function CollabCodeMirror({
  yDoc,
  provider,
  path,
  onLocalEdit,
  isDark,
  initialCode = "",
}: {
  yDoc: Y.Doc;
  provider: WebrtcProvider | null;
  path: string;
  onLocalEdit: (code: string) => void;
  isDark: boolean;
  initialCode?: string;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [fontSize, setFontSize] = useState(13);

  const onLocalEditRef = useRef(onLocalEdit);
  useEffect(() => {
    onLocalEditRef.current = onLocalEdit;
  }, [onLocalEdit]);

  const yFiles = useMemo(() => yDoc.getMap<Y.Text>("files"), [yDoc]);
  const [yText, setYText] = useState<Y.Text | null>(() => yFiles.get(path) || null);

  // 1. Observe changes to the files map and resolve/update yText instance.
  // This handles the transition from loading/connecting state to when the files
  // actually sync or get seeded by a peer.
  useEffect(() => {
    const updateYText = () => {
      const current = yFiles.get(path);
      if (current !== yText) {
        setYText(current || null);
      }
    };

    // Run immediately
    updateYText();

    yFiles.observe(updateYText);
    return () => {
      yFiles.unobserve(updateYText);
    };
  }, [yFiles, path, yText]);

  // 2. Initialize CodeMirror only when we have a resolved yText instance.
  useEffect(() => {
    if (!hostRef.current || !provider || !yText) return;

    const themeExt = isDark ? [oneDark] : [];

    const state = EditorState.create({
      doc: yText.toString(),
      extensions: [
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
        history(),
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        drawSelection(),
        foldGutter(),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        autocompletion({ override: [jsCompletionSource] }),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        pickLanguage(path),
        ...themeExt,
        yCollab(yText, provider.awareness),
        EditorView.updateListener.of((u) => {
          if (u.docChanged && onLocalEditRef.current) onLocalEditRef.current(u.state.doc.toString());
        }),
        // Theme overrides — copied from CollaborativeEditor so it looks
        // identical to the rest of the multiplayer interview surface.
        EditorView.theme({
          "&": { height: "100%", background: "transparent" },
          ".cm-scroller": {
            fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
            fontSize: "var(--editor-font-size, 13px)",
            lineHeight: "1.6",
          },
          ".cm-gutters": {
            background: "transparent",
            borderRight: isDark
              ? "1px solid rgba(255,255,255,0.07)"
              : "1px solid rgba(0,0,0,0.08)",
          },
          ".cm-activeLineGutter": {
            background: isDark
              ? "rgba(255,255,255,0.04)"
              : "rgba(0,0,0,0.03)",
          },
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
            zIndex: 100,
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

    const view = new EditorView({ state, parent: hostRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, yText, isDark]);

  if (!yText) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-bg font-sans text-muted text-xs select-none gap-3">
        <div className="relative w-8 h-8 flex items-center justify-center">
          <div className="absolute inset-0 border-2 border-accent/20 rounded-full" />
          <div className="absolute inset-0 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
        <span className="animate-pulse tracking-wide font-mono text-[10px] uppercase text-muted/60">
          Syncing code environment...
        </span>
      </div>
    );
  }

  return <div ref={hostRef} className="h-full w-full" style={{ "--editor-font-size": `${fontSize}px` } as React.CSSProperties} />;
}

/**
 * Sync'd real-time chat component integrated beautifully in the sidebar tree.
 */
function CollabChat({
  messages,
  username,
  isInterviewer,
  yDoc,
}: {
  messages: ChatMessage[];
  username: string;
  isInterviewer: boolean;
  yDoc: Y.Doc;
}) {
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    const yChat = yDoc.getArray<ChatMessage>("chat");
    const newMessage: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      sender: username,
      text: text.trim(),
      timestamp: Date.now(),
      isInterviewer,
    };

    yDoc.transact(() => {
      yChat.push([newMessage]);
    });
    setText("");
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-surface">
      {/* Scrollable messages container */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <MessageSquare className="w-8 h-8 text-muted/30 mb-2 animate-bounce" />
            <p className="text-[11px] text-muted leading-relaxed">
              No messages yet.<br />Start chatting with the peer!
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const isSelf = m.sender === username;
            let borderClass = "border border-border";
            let bgClass = "bg-panel";
            let alignClass = "justify-start";
            let style: React.CSSProperties = {};
            
            if (isSelf) {
              bgClass = "bg-accent-glow";
              alignClass = "justify-end";
              style = { borderColor: "rgba(var(--accent-rgb), 0.2)" };
            } else if (m.isInterviewer) {
              borderClass = "border border-border border-l-2 border-l-accent";
            }

            return (
              <div key={m.id} className={`flex ${alignClass}`}>
                <div
                  style={style}
                  className={`max-w-[85%] rounded-lg px-2.5 py-1.5 text-xs shadow-sm flex flex-col gap-0.5 ${bgClass} ${borderClass}`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className={`font-mono text-[9px] ${isSelf ? "text-accent" : "text-muted"}`}>
                      {m.sender} {m.isInterviewer ? "(Interviewer)" : "(Candidate)"}
                    </span>
                    <span className="text-[8px] text-muted/50">
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-fg whitespace-pre-wrap break-words leading-relaxed select-text">
                    {m.text}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input panel */}
      <form onSubmit={handleSend} className="p-2 border-t border-border bg-surface flex items-center gap-1.5 shrink-0">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 min-w-0 bg-bg border border-border rounded px-2.5 py-1.5 text-xs outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          title="Send message"
          className="p-1.5 rounded bg-accent hover:bg-accent-soft text-bg disabled:opacity-40 transition flex items-center justify-center shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
