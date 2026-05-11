"use client";

import { useSandpack, type SandpackFiles } from "@codesandbox/sandpack-react";
import { useEffect, useRef } from "react";
import { X, AlertTriangle, FileCode } from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────────────── */

export type ErrorFrame = {
  lineNumber: number;
  text: string;
  isError: boolean;
};

export type ErrorData = {
  title: string | null;
  message: string;
  path: string | null;
  line: number | null;
  column: number | null;
  codeFrame: ErrorFrame[] | null;
};

/* ─────────────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────────────── */

function makeKey(d: ErrorData | null): string {
  if (!d) return "";
  return `${d.path ?? ""}:${d.line ?? ""}:${d.column ?? ""}:${d.title ?? ""}:${d.message}`;
}

function buildCodeFrame(
  files: SandpackFiles,
  path: string | null,
  line: number | null,
  contextBefore = 2,
  contextAfter = 2
): ErrorFrame[] | null {
  if (!path || !line || line < 1) return null;
  const normalized = path.startsWith("/") ? path : "/" + path;
  const file = files[normalized] ?? files[path];
  if (!file) return null;
  const content =
    typeof file === "string" ? file : (file as { code: string }).code;
  const lines = content.split("\n");
  const errorIdx = line - 1;
  if (errorIdx >= lines.length) return null;
  const start = Math.max(0, errorIdx - contextBefore);
  const end = Math.min(lines.length, errorIdx + contextAfter + 1);
  return lines.slice(start, end).map((text, i) => ({
    lineNumber: start + i + 1,
    text,
    isError: start + i + 1 === line,
  }));
}

/**
 * Strip Sandpack internal stack trace lines and URLs from error messages.
 * Users don't need to see `at $csb$eval (https://2-19-8-sandpack...)`.
 */
function cleanErrorMessage(raw: string): string {
  let msg = raw.trim();

  // Remove everything after "at $csb$eval" or "at https://"
  const atIdx = msg.indexOf("\n    at ");
  if (atIdx > 0) {
    msg = msg.substring(0, atIdx).trim();
  }

  // Remove sandpack internal URLs
  msg = msg.replace(/https?:\/\/[\w.-]*sandpack[\w./-]*:\d+:\d+/g, "");
  
  // Remove "()" left over from URL removal
  msg = msg.replace(/\s*\(\s*\)/g, "");

  // Clean up any double-quoted wrapper
  if (msg.startsWith('"') && msg.endsWith('"')) {
    msg = msg.slice(1, -1);
  }

  return msg.trim();
}

/**
 * Sandpack's `error.message` often starts with a prefix like
 * `"TypeError: Cannot..."` or `"/App.js: SyntaxError ..."`.
 * Tease those apart so the title can be styled separately.
 */
function parseSandpackError(
  raw: { message: string; line?: number; column?: number; path?: string },
  files: SandpackFiles
): ErrorData {
  let message = cleanErrorMessage(raw.message);
  let title: string | null = null;

  // Pattern 1: "TypeError: actual message"  /  "ReferenceError: foo"
  const mClass = message.match(/^([A-Z][A-Za-z]+Error)\s*:\s*([\s\S]+)$/);
  if (mClass) {
    title = mClass[1];
    message = mClass[2].trim();
  } else {
    // Pattern 2: "<error class without colon> <rest>" e.g. "DependencyNotFoundError ..."
    const mPlain = message.match(/^([A-Z][A-Za-z]+Error)\b\s*([\s\S]*)$/);
    if (mPlain) {
      title = mPlain[1];
      message = mPlain[2].replace(/^[:.\\-\s]+/, "").trim() || raw.message;
    }
  }

  // Further clean the message
  message = cleanErrorMessage(message);

  return {
    title,
    message,
    path: raw.path ?? null,
    line: raw.line ?? null,
    column: raw.column ?? null,
    codeFrame: buildCodeFrame(files, raw.path ?? null, raw.line ?? null),
  };
}

/* ─────────────────────────────────────────────────────────────────────
   Bridge — drives the overlay from `sandpack.error` (the ONLY source).

   Why this is robust:
     • `sandpack.error` is Sandpack's own reactive state for "is the
       bundler currently broken?". It transitions {null → err → null}
       as compiles fail and recover. We mirror it.
     • A 200 ms debounce on the clear path absorbs the brief null gap
       Sandpack emits between two consecutive errored compiles, so we
       don't flicker the overlay off and immediately back on.
     • Dedupe by composite key — identical error strings don't trigger
       React re-renders.
     • A new/changed error cancels any pending clear so the overlay
       stays put.
     • No `listen()` subscription, no race against `done`/`clear-errors`
       messages, no codeChangedRef gymnastics. Just the state value.
───────────────────────────────────────────────────────────────────── */

export function ErrorBridge({
  onError,
}: {
  onError: (data: ErrorData | null) => void;
}) {
  const { sandpack } = useSandpack();
  const lastKeyRef = useRef<string>("");
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the latest files in a ref so code-frame extraction stays fresh
  // without making the main effect re-run on every keystroke.
  const filesRef = useRef<SandpackFiles>(sandpack.files);
  useEffect(() => {
    filesRef.current = sandpack.files;
  }, [sandpack.files]);

  useEffect(() => {
    const err = sandpack.error;

    if (err?.message) {
      // Filter out common browser extension "noise" that isn't from the user's code.
      const msg = err.message.toLowerCase();
      const isNoise = 
        msg.includes("metamask") || 
        msg.includes("extension") || 
        msg.includes("wallet") ||
        msg.includes("window.ethereum");
      
      if (isNoise) {
        // If the current error is noise, we treat it as "no error" for our UI.
        // If we previously had a real error, we clear it.
        if (lastKeyRef.current !== "") {
          lastKeyRef.current = "";
          onError(null);
        }
        return;
      }

      if (clearTimerRef.current) {
        clearTimeout(clearTimerRef.current);
        clearTimerRef.current = null;
      }
      const next = parseSandpackError(err, filesRef.current);
      const key = makeKey(next);
      if (key !== lastKeyRef.current) {
        lastKeyRef.current = key;
        onError(next);
      }
      return;
    }

    // No error in Sandpack state. Debounce a clear.
    if (lastKeyRef.current === "") return;
    if (clearTimerRef.current) return;
    clearTimerRef.current = setTimeout(() => {
      clearTimerRef.current = null;
      const stillClear = !latestErrorRef.current?.message;
      if (stillClear && lastKeyRef.current !== "") {
        lastKeyRef.current = "";
        onError(null);
      }
    }, 200);
  }, [sandpack.error, onError]);

  // Keep latest sandpack.error in a ref so listeners + timers can read fresh state.
  const latestErrorRef = useRef(sandpack.error);
  useEffect(() => {
    latestErrorRef.current = sandpack.error;
  }, [sandpack.error]);

  // Fast-path recovery: when the bundler reports `done` AND `sandpack.error`
  // is null at that moment, both signals agree the bundle is healthy — fire
  // any pending clear immediately. We must NOT clear blindly on `done`, because
  // Sandpack also fires `done` between consecutive errored compiles (which
  // would cause overlay flicker — the original bug we already fixed).
  const { listen } = useSandpack();
  useEffect(() => {
    const unsubscribe = listen((msg: any) => {
      if (msg.type !== "done") return;
      if (latestErrorRef.current?.message) return; // bundler still has an error
      if (lastKeyRef.current === "") return; // nothing to clear
      if (clearTimerRef.current) {
        clearTimeout(clearTimerRef.current);
        clearTimerRef.current = null;
      }
      lastKeyRef.current = "";
      onError(null);
    });
    return () => unsubscribe();
  }, [listen, onError]);

  // Cleanup any pending timer on unmount.
  useEffect(() => {
    return () => {
      if (clearTimerRef.current) {
        clearTimeout(clearTimerRef.current);
        clearTimerRef.current = null;
      }
    };
  }, []);

  return null;
}

/* ─────────────────────────────────────────────────────────────────────
   Overlay CSS
───────────────────────────────────────────────────────────────────── */

const overlayCSS = `
  @keyframes errorSlideIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .error-overlay {
    animation: errorSlideIn 0.25s ease-out forwards;
  }
  .error-card {
    background: var(--surface);
    border: 1px solid rgba(var(--accent-rgb), 0.25);
    border-radius: 12px;
    box-shadow:
      0 8px 32px rgba(0, 0, 0, 0.18),
      inset 0 1px 0 rgba(var(--accent-rgb), 0.04);
    overflow: hidden;
  }
  .error-card-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 18px;
    border-bottom: 1px solid var(--border);
    background: rgba(var(--accent-rgb), 0.06);
  }
  .error-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 10px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
    font-family: 'Inter', system-ui, sans-serif;
    letter-spacing: 0.02em;
    color: var(--accent);
    background: rgba(var(--accent-rgb), 0.12);
    border: 1px solid rgba(var(--accent-rgb), 0.20);
  }
  .error-location {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: var(--subtle);
  }
  .error-location strong {
    color: var(--muted);
    font-weight: 500;
  }
  .error-message-area {
    padding: 16px 18px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    line-height: 1.6;
    color: var(--fg);
    word-break: break-word;
    white-space: pre-wrap;
  }
  .error-message-area .error-type {
    color: var(--accent);
    font-weight: 600;
  }
  .error-dismiss {
    margin-left: auto;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    border: none;
    background: transparent;
    color: var(--subtle);
    cursor: pointer;
    transition: all 0.15s ease;
    flex-shrink: 0;
  }
  .error-dismiss:hover {
    background: rgba(var(--accent-rgb), 0.14);
    color: var(--accent);
  }
  .error-code-frame {
    border-top: 1px solid var(--border);
    background: var(--panel);
    padding: 8px 0;
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    line-height: 1.5;
    overflow-x: auto;
  }
  .error-code-line {
    display: flex;
    padding: 1px 18px;
  }
  .error-code-line.is-error {
    background: rgba(var(--accent-rgb), 0.10);
    border-left: 2px solid var(--accent);
    padding-left: 16px;
  }
  .error-code-line .line-num {
    color: var(--subtle);
    width: 3ch;
    text-align: right;
    padding-right: 16px;
    user-select: none;
    flex-shrink: 0;
    font-variant-numeric: tabular-nums;
    opacity: 0.6;
  }
  .error-code-line.is-error .line-num {
    color: var(--accent);
    opacity: 0.8;
  }
  .error-code-line .line-content {
    color: var(--muted);
    white-space: pre;
    flex: 1;
  }
  .error-code-line.is-error .line-content {
    color: var(--fg);
  }
`;

/* ─────────────────────────────────────────────────────────────────────
   Pure presentational component — renders the error overlay.
   No Sandpack dependency, takes ErrorData as a prop.
───────────────────────────────────────────────────────────────────── */

export function ErrorOverlay({
  error,
  onDismiss,
}: {
  error: ErrorData | null;
  onDismiss?: () => void;
}) {
  if (!error) return null;

  const hasFrame = error.codeFrame && error.codeFrame.length > 0;
  const isCompileError = !!error.path;
  const friendlyType = error.title || (isCompileError ? "Compilation Error" : "Error");

  return (
    <>
      <style>{overlayCSS}</style>
      <div
        className="error-overlay"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 50,
          background: "rgba(var(--bg-rgb), 0.85)",
          backdropFilter: "blur(8px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          overflow: "auto",
        }}
      >
        <div className="error-card" style={{ width: "100%", maxWidth: "640px" }}>
          {/* Header */}
          <div className="error-card-header">
            <div className="error-badge">
              <AlertTriangle style={{ width: 12, height: 12 }} />
              {isCompileError ? "Build Error" : "Runtime Error"}
            </div>

            {/* File location */}
            {(error.path || error.line) && (
              <div className="error-location">
                {error.path && <strong>{error.path.replace(/^\//, "")}</strong>}
                {error.line && <span>{error.path ? ":" : "line "}{error.line}{error.column ? `:${error.column}` : ""}</span>}
              </div>
            )}

            {onDismiss && (
              <button className="error-dismiss" onClick={onDismiss} title="Dismiss">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Error Message */}
          <div className="error-message-area">
            {error.title && <span className="error-type">{error.title}: </span>}
            {error.message}
          </div>

          {/* Code Frame */}
          {hasFrame && (
            <div className="error-code-frame">
              {error.codeFrame!.map((frame, i) => (
                <div key={i} className={`error-code-line ${frame.isError ? "is-error" : ""}`}>
                  <span className="line-num">
                    {frame.isError ? "›" : " "} {frame.lineNumber}
                  </span>
                  <span className="line-content">{frame.text || " "}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
