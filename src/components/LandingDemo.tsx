"use client";

import {
  SandpackProvider,
  SandpackLayout,
  SandpackCodeEditor,
  SandpackPreview,
} from "@codesandbox/sandpack-react";
import { atomDark } from "@codesandbox/sandpack-themes";
import { useEffect, useRef, useState } from "react";

const FILES = {
  "/App.js": `import { useState } from "react";

export default function App() {
  const [count, setCount] = useState(0);
  return (
    <div style={{
      fontFamily: "system-ui, sans-serif",
      padding: 28,
      textAlign: "center",
      color: "#e8ebf2",
    }}>
      <h1 style={{ marginBottom: 4 }}>Edit me 👇</h1>
      <p style={{ color: "#7b8496", margin: 0, marginBottom: 18 }}>
        Try changing this code on the left.
      </p>
      <button
        onClick={() => setCount((c) => c + 1)}
        style={{
          fontSize: 16,
          padding: "10px 20px",
          borderRadius: 10,
          border: "none",
          background: "#7c7fff",
          color: "white",
          cursor: "pointer",
        }}
      >
        Clicked {count} {count === 1 ? "time" : "times"}
      </button>
    </div>
  );
}
`,
  "/styles.css": `body {
  background: #0d1016;
  margin: 0;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
`,
  "/index.js": `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import App from "./App";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
`,
};

export default function LandingDemo() {
  // Lazy-mount: only spin up Sandpack when the section scrolls near the viewport.
  // Keeps initial homepage TTI low; Sandpack bundles ~1MB on activation.
  const ref = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (active) return;
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setActive(true);
            obs.disconnect();
            return;
          }
        }
      },
      { rootMargin: "200px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [active]);

  return (
    <div ref={ref} className="mx-auto max-w-5xl px-4 mt-2 mb-12">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-[10px] font-semibold tracking-[0.14em] text-muted uppercase">
          Try it live
        </span>
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted hidden sm:inline">
          Edit the code — preview updates instantly.
        </span>
      </div>
      <div className="rounded-2xl border border-border bg-panel/40 backdrop-blur overflow-hidden shadow-tile">
        <div className="px-4 py-2.5 border-b border-border bg-surface/60 flex items-center gap-2 text-xs">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400/50" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400/50" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/50" />
          </div>
          <span className="ml-1 text-muted">App.js</span>
          <span className="ml-auto text-[10px] text-muted hidden sm:inline">
            Runs in your browser · zero server execution
          </span>
        </div>
        <div style={{ height: 380 }} className="bg-[#1e1e1e]">
          {active ? (
            <SandpackProvider
              theme={atomDark}
              template="react"
              files={FILES}
              options={{ recompileMode: "delayed", recompileDelay: 400 }}
            >
              <SandpackLayout
                style={{ height: "100%", border: 0, borderRadius: 0 }}
              >
                <SandpackCodeEditor
                  showLineNumbers
                  showTabs={false}
                  wrapContent
                  style={{ height: "100%" }}
                />
                <SandpackPreview
                  showNavigator={false}
                  showOpenInCodeSandbox={false}
                  style={{ height: "100%" }}
                />
              </SandpackLayout>
            </SandpackProvider>
          ) : (
            <div className="h-full grid place-items-center text-xs text-muted">
              Loading sandbox…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
