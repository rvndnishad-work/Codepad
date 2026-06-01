"use client";

import { useState, useRef } from "react";
import { Play, RotateCcw, Copy, Sparkles, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import PromptEditor from "./PromptEditor";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { useDraft } from "./useDraft";
import { useEffect } from "react";

/**
 * Playground mode: free-form prompt editor with live Gemini execution.
 *
 * Unlike Practice mode (graded against a scenario), Playground runs the prompt
 * against the model and streams the response back. Session-local version
 * history is kept in memory — switching tabs or reloading drops it on purpose
 * so the playground stays disposable, not a save-everything notebook.
 */

interface RunRecord {
  id: string;
  prompt: string;
  systemPrompt: string;
  response: string;
  tokensIn: number;
  tokensOut: number | null;
  durationMs: number;
  model: string;
  error: string | null;
  ranAt: number;
}

const DEFAULT_PROMPT = `<!-- 
  Context: Provide background information here.
  Objective: What exactly do you want the model to do?
  Format: Specify the desired output format (e.g. JSON, markdown).
  Constraints: Any rules the model must follow.
-->

`;

const MODELS = [
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
];

export default function PlaygroundMode() {
  const [model, setModel] = useState(MODELS[0].value);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [history, setHistory] = useState<RunRecord[]>([]);
  const startedAtRef = useRef<number>(0);

  // Persist the in-progress prompt + system prompt so a refresh in
  // Playground mode doesn't drop them. Session history stays in memory
  // on purpose — playground runs are meant to feel disposable.
  useDraft("prompt-lab:playground:prompt", prompt, setPrompt);
  useDraft("prompt-lab:playground:system", systemPrompt, setSystemPrompt);

  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("prompt-lab:playground:prompt")) {
      setPrompt(DEFAULT_PROMPT);
    }
  }, []);

  const charCount = prompt.length;
  const tokenEstimate = Math.ceil(charCount / 4);

  async function handleRun() {
    if (!prompt.trim()) {
      toast.error("Prompt is empty.");
      return;
    }
    setRunning(true);
    setError(null);
    setResponse("");
    setShowDrawer(true);
    startedAtRef.current = Date.now();

    try {
      const res = await fetch("/api/prompt-playground/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ model, systemPrompt, prompt }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody?.error || `HTTP ${res.status}`);
      }

      // Stream the model's text body line by line into the response pane.
      // The endpoint returns plain text (not SSE) — simpler to consume.
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          acc += chunk;
          setResponse(acc);
        }
      }

      const durationMs = Date.now() - startedAtRef.current;
      const record: RunRecord = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        prompt,
        systemPrompt,
        response: acc,
        tokensIn: tokenEstimate,
        tokensOut: Math.ceil(acc.length / 4),
        durationMs,
        model,
        error: null,
        ranAt: Date.now(),
      };
      setHistory((h) => [record, ...h].slice(0, 20));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      const record: RunRecord = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        prompt,
        systemPrompt,
        response: "",
        tokensIn: tokenEstimate,
        tokensOut: null,
        durationMs: Date.now() - startedAtRef.current,
        model,
        error: message,
        ranAt: Date.now(),
      };
      setHistory((h) => [record, ...h].slice(0, 20));
    } finally {
      setRunning(false);
    }
  }

  function loadRecord(r: RunRecord) {
    setPrompt(r.prompt);
    setSystemPrompt(r.systemPrompt);
    setResponse(r.response);
    setError(r.error);
    setModel(r.model);
  }

  const hasOutput = running || response || error;

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-stretch h-[calc(100vh-12rem)] min-h-[800px]">
      {/* LEFT — settings & history */}
      <div className="w-full lg:w-[30%] space-y-6 flex flex-col overflow-y-auto pr-2 pb-6">
        {/* Model + system prompt */}
        <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm shrink-0">
          <div className="space-y-5">
            <div className="flex flex-col gap-3">
              <label className="text-xs font-bold uppercase tracking-widest text-muted">
                Model
              </label>
              <div className="flex flex-col gap-2">
                {MODELS.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setModel(m.value)}
                    className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold transition-all ${
                      model === m.value
                        ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/20"
                        : "bg-panel border border-border text-muted hover:text-fg hover:bg-panel/80"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted flex items-center justify-between">
                <span>System prompt</span>
                <span className="text-[10px] bg-panel px-2 py-0.5 rounded-full normal-case">Optional</span>
              </label>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={5}
                placeholder="e.g. You are a senior backend engineer. Answer concisely."
                className="w-full p-4 rounded-2xl bg-bg border border-border text-sm text-fg placeholder:text-muted/50 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 resize-none font-mono leading-relaxed transition-all"
              />
            </div>
          </div>
        </div>

        {/* Session history */}
        {history.length > 0 ? (
          <div className="rounded-3xl border border-border bg-surface p-6 space-y-4 shrink-0">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted">
                Session history
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted bg-panel px-2 py-0.5 rounded-full">{history.length} runs</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {history.map((r, idx) => (
                <button
                  key={r.id}
                  onClick={() => loadRecord(r)}
                  className="w-full px-4 py-3 rounded-2xl border border-border bg-bg hover:bg-panel transition-all text-left flex items-center justify-between gap-4 group hover:border-border-strong"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-fg truncate group-hover:text-indigo-400 transition-colors">
                      <span className="text-muted mr-2">v{history.length - idx}</span>
                      {r.prompt.split("\n")[0].slice(0, 60) || "(empty)"}
                    </div>
                    <div className="text-xs text-muted/80 mt-1 font-mono tabular-nums flex items-center gap-2">
                      <span>{r.tokensIn} <span className="text-muted/40">→</span> {r.tokensOut ?? "—"} tok</span>
                      <span className="text-muted/40">&bull;</span>
                      <span>{Math.round(r.durationMs / 100) / 10}s</span>
                      <span className="text-muted/40">&bull;</span>
                      <span className="text-[10px] bg-surface px-1.5 rounded truncate">{r.model}</span>
                    </div>
                  </div>
                  {r.error ? <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" /> : <RotateCcw className="w-4 h-4 text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* RIGHT — Prompt (Takes full width of its pane) */}
      <div className="w-full lg:w-[70%] flex flex-col gap-6 h-full pb-6">
        <div className="flex-1 flex flex-col rounded-3xl border border-border bg-surface p-1 focus-within:ring-2 focus-within:ring-indigo-500/50 focus-within:border-indigo-500/50 transition-all duration-300 shadow-sm hover:shadow-md">
          <div className="flex-1 rounded-[1.4rem] bg-bg flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-panel/30">
              <label className="text-xs font-bold uppercase tracking-widest text-muted">Prompt</label>
              <div className="flex items-center gap-3 text-[11px] font-mono font-medium text-muted/80 bg-surface px-3 py-1 rounded-full border border-border">
                <span>{charCount} chars</span>
                <span className="w-1 h-1 rounded-full bg-border" />
                <span className="text-fg/80">~{tokenEstimate} tokens</span>
              </div>
            </div>
            
            <div className="flex-1 p-6 relative flex flex-col min-h-0">
              <PromptEditor
                value={prompt}
                onChange={setPrompt}
                disabled={running}
                minRows={20}
                placeholder="Write your prompt here. Hit Run to execute against the selected model."
              />
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-panel/30">
              <button
                type="button"
                onClick={() => { setPrompt(DEFAULT_PROMPT); setResponse(""); setError(null); setShowDrawer(false); }}
                disabled={running}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-surface hover:bg-panel text-xs font-semibold text-muted hover:text-fg transition-colors disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
              
              {hasOutput && !showDrawer && (
                <button
                  type="button"
                  onClick={() => setShowDrawer(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-xs font-semibold text-indigo-400 transition-colors"
                >
                  View Output
                </button>
              )}

              <button
                type="button"
                onClick={handleRun}
                disabled={running || charCount === 0}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-indigo-500/25 active:scale-95 group"
              >
                {running ? <Sparkles className="w-4 h-4 animate-pulse" /> : <Play className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />}
                {running ? "Running…" : "Run Prompt"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* DRAWER OVERLAY */}
      <div 
        className={`fixed inset-0 bg-bg/80 backdrop-blur-sm z-40 transition-opacity duration-300 ${showDrawer ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={() => setShowDrawer(false)}
      />

      {/* DRAWER PANEL */}
      <div 
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-4xl bg-surface border-l border-border shadow-2xl flex flex-col transform transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${showDrawer ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-panel/30">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted flex items-center gap-2">
            <Sparkles className={`w-4 h-4 ${running ? 'text-indigo-400 animate-pulse' : 'text-muted/50'}`} />
            Response
          </h3>
          <div className="flex items-center gap-3">
            {response ? (
              <button
                type="button"
                onClick={() => { navigator.clipboard.writeText(response); toast.success("Copied to clipboard"); }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-bg border border-border text-[11px] font-bold uppercase tracking-wider text-muted hover:text-fg hover:bg-panel transition-all shadow-sm active:scale-95"
              >
                <Copy className="w-3 h-3" />
                Copy
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setShowDrawer(false)}
              className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-bg border border-border text-muted hover:text-fg hover:bg-panel transition-colors"
            >
              &times;
            </button>
          </div>
        </div>

        <div className="flex-1 p-6 relative flex flex-col overflow-y-auto bg-bg m-4 rounded-2xl border border-border shadow-inner">
          {error ? (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-5 text-sm text-rose-400 mb-4 animate-in fade-in">
              <div className="flex items-center gap-2 font-bold mb-2">
                <AlertTriangle className="w-4 h-4" /> Execution Error
              </div>
              <div className="font-mono text-xs leading-relaxed opacity-90">{error}</div>
            </div>
          ) : null}

          {running && !response ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="relative w-16 h-16 mb-4">
                <div className="absolute inset-0 rounded-3xl border-4 border-indigo-500/20" />
                <div className="absolute inset-0 rounded-3xl border-4 border-indigo-500 border-t-transparent animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
                </div>
              </div>
              <p className="text-sm font-bold text-fg animate-pulse">Waiting for first token...</p>
              <p className="text-xs text-muted mt-2">Connecting to {model}</p>
            </div>
          ) : null}

          {response ? (
            <div className="font-sans text-sm leading-[1.7] text-fg/90 whitespace-pre-wrap overflow-visible pb-12">
              <MarkdownRenderer content={response} forceRunnable={true} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}