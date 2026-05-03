"use client";

import { useSandpack, type SandpackFiles } from "@codesandbox/sandpack-react";
import { useEffect, useRef } from "react";

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
 * Sandpack's `error.message` often starts with a prefix like
 * `"TypeError: Cannot..."` or `"/App.js: SyntaxError ..."`.
 * Tease those apart so the title can be styled separately.
 */
function parseSandpackError(
  raw: { message: string; line?: number; column?: number; path?: string },
  files: SandpackFiles
): ErrorData {
  let message = raw.message.trim();
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
      message = mPlain[2].replace(/^[:.\-\s]+/, "").trim() || raw.message;
    }
  }

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
  const widthOfBiggestNumber = error.codeFrame
    ? Math.max(...error.codeFrame.map((f) => String(f.lineNumber).length))
    : 0;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 50,
        background:
          "linear-gradient(135deg, rgba(15, 8, 8, 0.98) 0%, rgba(25, 10, 10, 0.95) 100%)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        overflow: "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          marginBottom: "1.25rem",
        }}
      >
        <h2
          style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: "1.25rem",
            fontWeight: 700,
            color: "#ef4444",
            textTransform: "uppercase",
            letterSpacing: "0.15em",
            textShadow: "0 0 20px rgba(239, 68, 68, 0.4)",
            margin: 0,
          }}
        >
          {error.path ? "Build Error" : "Runtime Error"}
        </h2>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            title="Dismiss this error"
            style={{
              background: "transparent",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "6px",
              color: "#fca5a5",
              padding: "0.15rem 0.6rem",
              fontSize: "11px",
              fontFamily: "'Inter', system-ui, sans-serif",
              cursor: "pointer",
              letterSpacing: "0.04em",
            }}
          >
            Dismiss
          </button>
        )}
      </div>

      <div
        style={{
          width: "100%",
          maxWidth: "760px",
          maxHeight: "70vh",
          overflowY: "auto",
          background: "rgba(239, 68, 68, 0.05)",
          border: "1px solid rgba(239, 68, 68, 0.2)",
          borderRadius: "16px",
          boxShadow:
            "0 10px 40px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        {(error.path || error.line) && (
          <div
            style={{
              padding: "0.75rem 1.25rem",
              borderBottom: "1px solid rgba(239, 68, 68, 0.15)",
              fontSize: "12px",
              color: "#fca5a5",
              opacity: 0.85,
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            {error.path && (
              <span style={{ color: "#fecaca" }}>{error.path}</span>
            )}
            {error.line && (
              <span style={{ color: "#fca5a5" }}>
                :{error.line}
                {error.column ? `:${error.column}` : ""}
              </span>
            )}
          </div>
        )}

        <div
          style={{
            padding: "1.25rem 1.5rem",
            fontSize: "14px",
            color: "#fca5a5",
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {error.title && (
            <span style={{ color: "#ef4444", fontWeight: 600 }}>
              {error.title}
            </span>
          )}
          {error.title && error.message ? (
            <span style={{ color: "#fecaca" }}>: {error.message}</span>
          ) : (
            <span style={{ color: "#fecaca" }}>{error.message}</span>
          )}
        </div>

        {hasFrame && (
          <div
            style={{
              padding: "0.75rem 0",
              background: "rgba(0, 0, 0, 0.25)",
              borderTop: "1px solid rgba(239, 68, 68, 0.15)",
              fontSize: "13px",
              lineHeight: 1.55,
              overflowX: "auto",
            }}
          >
            {error.codeFrame!.map((frame, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  padding: "0.05rem 1.25rem",
                  background: frame.isError
                    ? "rgba(239, 68, 68, 0.12)"
                    : "transparent",
                  borderLeft: frame.isError
                    ? "2px solid #ef4444"
                    : "2px solid transparent",
                }}
              >
                <span
                  style={{
                    color: frame.isError
                      ? "#fca5a5"
                      : "rgba(252, 165, 165, 0.4)",
                    width: `${widthOfBiggestNumber + 2}ch`,
                    textAlign: "right",
                    paddingRight: "1rem",
                    userSelect: "none",
                    fontVariantNumeric: "tabular-nums",
                    flexShrink: 0,
                  }}
                >
                  {frame.isError ? "› " : "  "}
                  {frame.lineNumber}
                </span>
                <span
                  style={{
                    color: frame.isError ? "#fecaca" : "#9ca3af",
                    whiteSpace: "pre",
                    flex: 1,
                  }}
                >
                  {frame.text || " "}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
