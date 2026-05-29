"use client";

import { useState, useRef } from "react";
import { Play, RotateCcw, Copy, Sparkles, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import PromptEditor from "./PromptEditor";
import { useDraft } from "./useDraft";

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

const MODELS = [
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
];

export default function PlaygroundMode() {
  const [model, setModel] = useState(MODELS[0].value);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<RunRecord[]>([]);
  const startedAtRef = useRef<number>(0);

  // Persist the in-progress prompt + system prompt so a refresh in
  // Playground mode doesn't drop them. Session history stays in memory
  // on purpose — playground runs are meant to feel disposable.
  useDraft("prompt-lab:playground:prompt", prompt, setPrompt);
  useDraft("prompt-lab:playground:system", systemPrompt, setSystemPrompt);

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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      {/* LEFT — input controls */}
      <div className="space-y-4">
        {/* Model + system prompt */}
        <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-muted shrink-0 w-16">
              Model
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="flex-1 px-3 py-1.5 rounded-md bg-bg border border-border text-xs text-fg focus:outline-none focus:border-indigo-500"
            >
              {MODELS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-muted">
              System prompt <span className="text-muted/60 normal-case">(optional)</span>
            </label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={3}
              placeholder="e.g. You are a senior backend engineer. Answer concisely."
              className="w-full p-3 rounded-md bg-bg border border-border text-xs text-fg placeholder:text-muted/50 focus:outline-none focus:border-indigo-500 resize-none font-mono leading-relaxed"
            />
          </div>
        </div>

        {/* User prompt */}
        <div className="rounded-2xl border border-border bg-surface p-5 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-muted">Prompt</label>
            <span className="text-[11px] font-mono tabular-nums text-muted">
              {charCount} chars · ~{tokenEstimate} tokens
            </span>
          </div>
          <PromptEditor
            value={prompt}
            onChange={setPrompt}
            disabled={running}
            minRows={12}
            placeholder="Write your prompt here. Hit Run to execute against the selected model."
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => { setPrompt(""); setResponse(""); setError(null); }}
              disabled={running}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-bg hover:bg-panel text-[11px] font-semibold text-muted hover:text-fg transition-colors disabled:opacity-50"
            >
              <RotateCcw className="w-3 h-3" />
              Clear
            </button>
            <button
              type="button"
              onClick={handleRun}
              disabled={running || charCount === 0}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-[11px] font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {running ? <Sparkles className="w-3.5 h-3.5 animate-pulse" /> : <Play className="w-3.5 h-3.5" />}
              {running ? "Running…" : "Run"}
            </button>
          </div>
        </div>

        {/* Session history */}
        {history.length > 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Session history
              </h3>
              <span className="text-[11px] text-muted/60">{history.length} runs · not saved</span>
            </div>
            <div className="space-y-1.5">
              {history.map((r, idx) => (
                <button
                  key={r.id}
                  onClick={() => loadRecord(r)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-bg hover:bg-panel transition-colors text-left flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-fg truncate">
                      v{history.length - idx} · {r.prompt.split("\n")[0].slice(0, 60) || "(empty)"}
                    </div>
                    <div className="text-[11px] text-muted/70 mt-0.5 font-mono tabular-nums">
                      {r.tokensIn} → {r.tokensOut ?? "—"} tokens · {Math.round(r.durationMs / 100) / 10}s · {r.model}
                    </div>
                  </div>
                  {r.error ? <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" /> : null}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* RIGHT — response */}
      <div className="rounded-2xl border border-border bg-surface p-5 space-y-3 lg:sticky lg:top-6">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted">Response</h3>
          {response ? (
            <button
              type="button"
              onClick={() => { navigator.clipboard.writeText(response); toast.success("Copied"); }}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted hover:text-fg transition-colors"
            >
              <Copy className="w-3 h-3" />
              Copy
            </button>
          ) : null}
        </div>

        {error ? (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400">
            <div className="flex items-center gap-1.5 font-semibold mb-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Error
            </div>
            <div className="font-mono text-[11px] leading-relaxed">{error}</div>
          </div>
        ) : null}

        {!response && !error && !running ? (
          <div className="rounded-lg border border-dashed border-border bg-panel/20 p-8 text-center">
            <p className="text-xs text-muted">Write a prompt on the left and hit Run to see the model's response here.</p>
          </div>
        ) : null}

        {running && !response ? (
          <div className="rounded-lg border border-border bg-panel/20 p-4 text-xs text-muted flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 animate-pulse text-indigo-400" />
            Waiting for first token…
          </div>
        ) : null}

        {response ? (
          <pre className="font-mono text-[12px] leading-relaxed text-fg whitespace-pre-wrap bg-bg border border-border rounded-lg p-4 max-h-[640px] overflow-y-auto">
            {response}
          </pre>
        ) : null}
      </div>
    </div>
  );
}
