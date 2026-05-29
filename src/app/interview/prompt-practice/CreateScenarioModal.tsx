"use client";

import { useState } from "react";
import { X, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { Scenario } from "./types";

interface Props {
  onClose: () => void;
  onCreated: (s: Scenario) => void;
}

/**
 * Modal for authoring a new platform-wide prompt scenario. Posts to the
 * existing /api/prompt-challenges POST endpoint. Kept as a separate file so
 * the main client component doesn't carry ~200 lines of form state.
 */
export default function CreateScenarioModal({ onClose, onCreated }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("code-generation");
  const [difficulty, setDifficulty] = useState("intermediate");
  const [estMinutes, setEstMinutes] = useState(10);
  const [description, setDescription] = useState("");
  const [objective, setObjective] = useState("");
  const [keywords, setKeywords] = useState("");
  const [format, setFormat] = useState("");
  const [constraints, setConstraints] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !objective.trim()) {
      toast.error("Title, description, and objective are required.");
      return;
    }
    setSubmitting(true);
    try {
      const expectedTraits = {
        keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean),
        format: format.trim() || "Clean code structure with clear sectioning",
        constraints: constraints.split("\n").map((c) => c.trim()).filter(Boolean),
      };
      const res = await fetch("/api/prompt-challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          category,
          difficulty,
          estimatedMinutes: Number(estMinutes) || 10,
          description: description.trim(),
          objective: objective.trim(),
          expectedTraits,
          workspaceId: null,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);

      toast.success("Scenario created");
      if (data?.scenario) {
        onCreated({
          id: data.scenario.id,
          slug: data.scenario.slug,
          title: data.scenario.title,
          description: data.scenario.description,
          objective: data.scenario.objective,
          difficulty: data.scenario.difficulty,
          category: data.scenario.category,
          estimatedMinutes: data.scenario.estimatedMinutes,
        });
      }
      onClose();
    } catch (err) {
      toast.error("Failed to create scenario", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-surface border border-border rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <header className="px-5 py-4 border-b border-border flex items-center justify-between bg-panel/30">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <div>
              <h2 className="text-sm font-semibold text-fg">New scenario</h2>
              <p className="text-[11px] text-muted">Author a prompt challenge for the platform library.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-panel text-muted hover:text-fg">
            <X className="w-4 h-4" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          <Field label="Title" required>
            <input
              type="text"
              required
              placeholder="e.g. REST API spec generator"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-border bg-bg text-xs text-fg focus:outline-none focus:border-indigo-500"
            />
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Category">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border bg-bg text-xs text-fg focus:outline-none focus:border-indigo-500"
              >
                <option value="code-generation">Code generation</option>
                <option value="debugging">Debugging</option>
                <option value="api-design">API design</option>
                <option value="data-analysis">Data analysis</option>
                <option value="system-design">System design</option>
                <option value="documentation">Documentation</option>
              </select>
            </Field>
            <Field label="Difficulty">
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border bg-bg text-xs text-fg focus:outline-none focus:border-indigo-500"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </Field>
            <Field label="Est. minutes">
              <input
                type="number"
                min={1}
                max={120}
                value={estMinutes}
                onChange={(e) => setEstMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-md border border-border bg-bg text-xs text-fg focus:outline-none focus:border-indigo-500 tabular-nums"
              />
            </Field>
          </div>

          <Field label="Background / context" required>
            <textarea
              required
              rows={3}
              placeholder="The technical situation, buggy component, etc. Markdown OK."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-border bg-bg text-xs text-fg focus:outline-none focus:border-indigo-500 resize-none"
            />
          </Field>

          <Field label="Practice objective" required>
            <textarea
              required
              rows={3}
              placeholder="What the AI should accomplish. Include expected outputs."
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-border bg-bg text-xs text-fg focus:outline-none focus:border-indigo-500 resize-none"
            />
          </Field>

          <div className="border-t border-border pt-4 space-y-3">
            <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted">
              Grading hints <span className="font-normal normal-case">(optional)</span>
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Expected format">
                <input
                  type="text"
                  placeholder="e.g. OpenAPI 3.0 YAML"
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-border bg-bg text-xs text-fg focus:outline-none focus:border-indigo-500"
                />
              </Field>
              <Field label="Keywords (comma-sep)">
                <input
                  type="text"
                  placeholder="e.g. Grid, Flexbox, media queries"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-border bg-bg text-xs text-fg focus:outline-none focus:border-indigo-500"
                />
              </Field>
            </div>
            <Field label="Constraints (one per line)">
              <textarea
                rows={2}
                placeholder={"Must not use absolute positioning\nMust use TypeScript interfaces"}
                value={constraints}
                onChange={(e) => setConstraints(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border bg-bg text-xs text-fg focus:outline-none focus:border-indigo-500 resize-none"
              />
            </Field>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-md border border-border bg-bg text-xs font-semibold text-muted hover:text-fg hover:bg-panel transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors disabled:opacity-50"
            >
              {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {submitting ? "Creating…" : "Create scenario"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-semibold uppercase tracking-wide text-muted">
        {label}{required ? " *" : ""}
      </label>
      {children}
    </div>
  );
}
