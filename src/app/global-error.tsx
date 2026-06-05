"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          color: "#e0e0e0",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          padding: 24,
        }}
      >
        <div
          style={{
            maxWidth: 440,
            width: "100%",
            border: "1px solid #1f1f1f",
            borderRadius: 24,
            padding: 32,
            background: "#111",
            textAlign: "center",
          }}
        >
          <h1
            style={{
              fontSize: 22,
              fontWeight: 900,
              letterSpacing: "-0.01em",
              margin: "0 0 8px",
            }}
          >
            Application crashed
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "#8b949e",
              lineHeight: 1.6,
              margin: "0 0 20px",
            }}
          >
            A critical error prevented the app from loading. Reloading usually
            fixes this.
          </p>
          {error.digest && (
            <p
              style={{
                fontSize: 11,
                fontFamily: "monospace",
                color: "#555",
                margin: "0 0 20px",
                wordBreak: "break-all",
              }}
            >
              ref: {error.digest}
            </p>
          )}
          <button
            // global-error replaces the whole document; Next's reset() rarely
            // recovers a failed root render (the server component isn't
            // re-fetched). A hard reload is what "Reload app" implies and is
            // the only reliable recovery here.
            onClick={() => window.location.reload()}
            style={{
              padding: "10px 20px",
              borderRadius: 12,
              border: "none",
              background: "#FFE600",
              color: "#0a0a0a",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Reload app
          </button>
        </div>
      </body>
    </html>
  );
}
