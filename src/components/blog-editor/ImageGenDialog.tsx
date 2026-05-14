"use client";

import { useEffect, useRef, useState } from "react";
import {
  X,
  Sparkles,
  Wand2,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Check,
  Image as ImageIcon,
} from "lucide-react";

type AspectRatio = "16:9" | "1:1" | "4:3" | "3:4" | "9:16";

interface ImageGenDialogProps {
  open: boolean;
  onClose: () => void;
  /** Initial prompt — useful when "Regenerate" is invoked from outside. */
  initialPrompt?: string;
  /** Called when the user accepts the generated image. */
  onAccept: (dataUrl: string) => void;
}

const ASPECT_OPTIONS: { value: AspectRatio; label: string; hint: string }[] = [
  { value: "16:9", label: "16:9", hint: "Wide cover" },
  { value: "4:3", label: "4:3", hint: "Classic" },
  { value: "1:1", label: "1:1", hint: "Square" },
  { value: "3:4", label: "3:4", hint: "Portrait" },
  { value: "9:16", label: "9:16", hint: "Story" },
];

const PRESET_PROMPTS = [
  "Abstract waveform of glowing teal and amber lines on deep navy, minimalist editorial cover",
  "Isometric illustration of a developer's desk with a glowing terminal at night",
  "Cinematic photo of a single yellow neon sign on a wet street, blue hour",
  "Soft pastel gradient mesh with a subtle 3D grid floor, modern tech aesthetic",
];

export default function ImageGenDialog({
  open,
  onClose,
  initialPrompt,
  onAccept,
}: ImageGenDialogProps) {
  const [prompt, setPrompt] = useState(initialPrompt ?? "");
  const [aspect, setAspect] = useState<AspectRatio>("16:9");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  /** "gemini" | "pollinations" — surfaced as a small badge on the preview. */
  const [provider, setProvider] = useState<string | null>(null);
  /** Surfaced when Gemini failed and the server fell back to Pollinations. */
  const [fallbackNote, setFallbackNote] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset state when the dialog opens or the initialPrompt changes.
  useEffect(() => {
    if (!open) return;
    setPrompt(initialPrompt ?? "");
    setError(null);
    setResult(null);
    setProvider(null);
    setFallbackNote(null);
    setBusy(false);
    const id = setTimeout(() => textareaRef.current?.focus(), 30);
    return () => clearTimeout(id);
  }, [open, initialPrompt]);

  // Close on Escape unless we're mid-request (network can't be cancelled mid-fly).
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  if (!open) return null;

  async function handleGenerate() {
    const trimmed = prompt.trim();
    if (!trimmed) {
      setError("Describe the image you want.");
      return;
    }
    setError(null);
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/blogs/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed, aspectRatio: aspect }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        const fallbackByStatus: Record<number, string> = {
          401: "Please sign in to generate images.",
          429: "You're sending requests too fast. Wait a moment and try again.",
          503: "Image generation isn't configured on this server. Set GEMINI_API_KEY.",
        };
        setError(
          body?.message ?? fallbackByStatus[res.status] ?? "Generation failed. Please try again.",
        );
        return;
      }
      if (!body?.dataUrl) {
        setError("Empty response from the server.");
        return;
      }
      setResult(body.dataUrl);
      setProvider(typeof body.provider === "string" ? body.provider : null);
      setFallbackNote(typeof body.fallbackNote === "string" ? body.fallbackNote : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setBusy(false);
    }
  }

  function handleAccept() {
    if (!result) return;
    onAccept(result);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-12 md:pt-20 p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className="w-full max-w-2xl rounded-3xl border border-border bg-surface shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-panel/30">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent">
              <Wand2 className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-sm font-black text-fg">Generate cover image</h2>
              <p className="text-[11px] text-muted">
                Powered by Gemini 2.5 Flash Image
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={busy}
            className="p-2 rounded-lg text-muted hover:text-fg hover:bg-bg/60 disabled:opacity-40"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Prompt */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted">
                Describe the image
              </label>
              <span className="text-[10px] text-muted/60 tabular-nums">
                {prompt.length}/800
              </span>
            </div>
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value.slice(0, 800));
                if (error) setError(null);
              }}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  void handleGenerate();
                }
              }}
              placeholder="Example: A futuristic cityscape at sunset with flying cars and neon lights"
              rows={3}
              disabled={busy}
              className={`w-full px-3 py-2 rounded-xl border bg-bg text-sm text-fg outline-none placeholder:text-muted/50 resize-none transition-colors ${
                error ? "border-red-500/60" : "border-border focus:border-accent"
              } disabled:opacity-60`}
            />
            <p className="text-[10px] text-muted/60">
              Tip: press <kbd className="px-1 py-0.5 rounded bg-bg border border-border font-mono">⌘ Enter</kbd> to generate.
            </p>
          </div>

          {/* Presets */}
          {!result && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted">
                Or try a preset
              </label>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_PROMPTS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPrompt(p)}
                    disabled={busy}
                    className="text-left px-2.5 py-1 rounded-lg border border-border bg-bg hover:bg-elevated text-[11px] text-muted hover:text-fg transition-colors disabled:opacity-50 max-w-full truncate"
                    title={p}
                  >
                    {p.split(",")[0]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Aspect ratio */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted">
              Aspect ratio
            </label>
            <div className="flex flex-wrap gap-1">
              {ASPECT_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setAspect(o.value)}
                  disabled={busy}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-colors disabled:opacity-50 ${
                    aspect === o.value
                      ? "bg-accent/10 border-accent/40 text-accent"
                      : "bg-bg border-border text-muted hover:text-fg"
                  }`}
                >
                  <ImageIcon className="w-3 h-3" />
                  {o.label}
                  <span className="text-muted/60">{o.hint}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-xl border border-red-500/30 bg-red-500/5 text-[12px] text-red-500">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {/* Preview / Loading */}
          {(busy || result) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-accent" />
                  {busy ? "Generating…" : "Preview"}
                </label>
                {!busy && result && provider && (
                  <span className="text-[9px] font-black uppercase tracking-[0.15em] px-2 py-0.5 rounded-md bg-accent/10 border border-accent/30 text-accent">
                    via {provider}
                  </span>
                )}
              </div>
              <div
                className="w-full rounded-2xl border border-border bg-bg/40 overflow-hidden relative"
                style={{
                  aspectRatio: aspect.replace(":", " / "),
                }}
              >
                {busy && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted">
                    <Loader2 className="w-6 h-6 animate-spin text-accent" />
                    <span className="text-[11px] font-bold uppercase tracking-widest">
                      Painting pixels…
                    </span>
                    <span className="text-[10px] text-muted/60">
                      Usually 5–15 seconds.
                    </span>
                  </div>
                )}
                {!busy && result && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={result}
                    alt="Generated cover"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              {!busy && result && fallbackNote && (
                <p className="text-[10px] text-muted/70 leading-relaxed">
                  <span className="font-bold">Note:</span> {fallbackNote} Falling
                  back to a free provider — image quality may differ. Enable
                  billing on your Google Cloud project to use Gemini.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-panel/30">
          <button
            onClick={onClose}
            disabled={busy}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-muted hover:text-fg hover:bg-bg/60 transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
          {result && !busy && (
            <button
              onClick={handleGenerate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-bg hover:bg-elevated text-fg text-xs font-bold transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Regenerate
            </button>
          )}
          {result && !busy ? (
            <button
              onClick={handleAccept}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-accent text-bg text-xs font-black hover:bg-accent-soft transition-colors shadow-md"
            >
              <Check className="w-3.5 h-3.5" />
              Use this image
            </button>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={busy || !prompt.trim()}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-accent text-bg text-xs font-black hover:bg-accent-soft transition-colors disabled:opacity-50 shadow-md"
            >
              {busy ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Wand2 className="w-3.5 h-3.5" />
                  Generate
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
