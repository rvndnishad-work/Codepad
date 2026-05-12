"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Save, Trash2, ArrowLeft } from "lucide-react";

export type ChallengeFormInput = {
  id?: string;
  slug: string;
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  template: string;
  starterFilesJson: string;
  testFilesJson: string;
  tagsCsv: string;
  estimatedMinutes: number;
  category: string;
  published: boolean;
};

export const TEMPLATES = [
  { value: "test-ts", label: "test-ts (Jest + TypeScript)" },
  { value: "test-js", label: "test-js (Jest + JavaScript)" },
  { value: "react", label: "react" },
  { value: "vanilla", label: "vanilla" },
  { value: "vanilla-ts", label: "vanilla-ts" },
  { value: "node", label: "node" },
];

const DIFFICULTIES: ChallengeFormInput["difficulty"][] = ["easy", "medium", "hard"];

export default function ChallengeForm({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial: ChallengeFormInput;
}) {
  const router = useRouter();
  const [form, setForm] = useState<ChallengeFormInput>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function update<K extends keyof ChallengeFormInput>(key: K, value: ChallengeFormInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validateJson(label: string, raw: string): Record<string, string> | null {
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        toast.error(`${label} must be a JSON object of { "/path": "code" }`);
        return null;
      }
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v !== "string") {
          toast.error(`${label}: value for ${k} must be a string`);
          return null;
        }
      }
      return parsed as Record<string, string>;
    } catch (err) {
      toast.error(`${label} is not valid JSON`, {
        description: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.slug.trim() || !form.title.trim()) {
      toast.error("Title and slug are required");
      return;
    }
    const starterFiles = validateJson("Starter files", form.starterFilesJson);
    if (!starterFiles) return;
    const testFiles = validateJson("Test files", form.testFilesJson);
    if (!testFiles) return;

    const tags = form.tagsCsv
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const payload = {
      slug: form.slug.trim(),
      title: form.title.trim(),
      description: form.description,
      difficulty: form.difficulty,
      template: form.template,
      starterFiles,
      testFiles,
      tags,
      estimatedMinutes: Number(form.estimatedMinutes) || 15,
      category: form.category.trim() || null,
      published: form.published,
    };

    setSubmitting(true);
    try {
      const url =
        mode === "create"
          ? "/api/admin/challenges"
          : `/api/admin/challenges/${form.id}`;
      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
      });
      if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
      toast.success(mode === "create" ? "Challenge created" : "Saved");
      router.push("/admin/challenges");
      router.refresh();
    } catch (err) {
      toast.error("Save failed", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!form.id) return;
    if (!confirm(`Delete "${form.title}"? This also removes all attempts.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/challenges/${form.id}`, {
        method: "DELETE",
        cache: "no-store",
      });
      if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
      toast.success("Challenge deleted");
      router.push("/admin/challenges");
      router.refresh();
    } catch (err) {
      toast.error("Delete failed", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/challenges"
          className="w-9 h-9 rounded-xl bg-surface border border-border flex items-center justify-center text-muted hover:text-fg transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h2 className="text-2xl font-black tracking-tight">
          {mode === "create" ? "New Challenge" : "Edit Challenge"}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Title" required>
          <input
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            className="form-input"
            placeholder="FizzBuzz"
            required
          />
        </Field>
        <Field label="Slug" required hint="Used in the URL: /challenges/{slug}">
          <input
            value={form.slug}
            onChange={(e) => update("slug", e.target.value)}
            className="form-input font-mono"
            placeholder="fizzbuzz"
            pattern="[a-z0-9-]+"
            required
          />
        </Field>

        <Field label="Difficulty">
          <select
            value={form.difficulty}
            onChange={(e) => update("difficulty", e.target.value as ChallengeFormInput["difficulty"])}
            className="form-input"
          >
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Sandpack template">
          <select
            value={form.template}
            onChange={(e) => update("template", e.target.value)}
            className="form-input"
          >
            {TEMPLATES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Category" hint="e.g. Algorithms, Frontend">
          <input
            value={form.category}
            onChange={(e) => update("category", e.target.value)}
            className="form-input"
            placeholder="Algorithms"
          />
        </Field>
        <Field label="Estimated minutes">
          <input
            type="number"
            min={1}
            max={300}
            value={form.estimatedMinutes}
            onChange={(e) => update("estimatedMinutes", Number(e.target.value))}
            className="form-input"
          />
        </Field>

        <Field label="Tags" hint="Comma-separated" className="md:col-span-2">
          <input
            value={form.tagsCsv}
            onChange={(e) => update("tagsCsv", e.target.value)}
            className="form-input"
            placeholder="arrays, loops, warm-up"
          />
        </Field>
      </div>

      <Field label="Description (Markdown)" required>
        <textarea
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          rows={10}
          className="form-input font-mono text-xs"
          placeholder="## Problem&#10;&#10;Write a function that..."
          required
        />
      </Field>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Field
          label="Starter files (JSON)"
          required
          hint='{ "/index.ts": "export function fn() {}" }'
        >
          <textarea
            value={form.starterFilesJson}
            onChange={(e) => update("starterFilesJson", e.target.value)}
            rows={12}
            className="form-input font-mono text-xs"
            spellCheck={false}
            required
          />
        </Field>
        <Field
          label="Test files (JSON, hidden from user)"
          required
          hint='{ "/index.test.ts": "..." }'
        >
          <textarea
            value={form.testFilesJson}
            onChange={(e) => update("testFilesJson", e.target.value)}
            rows={12}
            className="form-input font-mono text-xs"
            spellCheck={false}
            required
          />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.published}
          onChange={(e) => update("published", e.target.checked)}
          className="w-4 h-4 accent-accent"
        />
        <span className="font-bold text-fg">Published</span>
        <span className="text-xs text-muted">Drafts are hidden from the public list.</span>
      </label>

      <div className="flex items-center justify-between pt-6 border-t border-border">
        {mode === "edit" ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting || submitting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/15 text-rose-500 text-xs font-bold transition disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {deleting ? "Deleting…" : "Delete"}
          </button>
        ) : (
          <div />
        )}
        <button
          type="submit"
          disabled={submitting || deleting}
          className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-accent text-bg text-xs font-bold hover:bg-accent-soft transition disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          {submitting ? "Saving…" : mode === "create" ? "Create" : "Save"}
        </button>
      </div>

      <style jsx>{`
        :global(.form-input) {
          width: 100%;
          background: var(--surface, rgb(var(--surface-rgb, 24 24 27)));
          border: 1px solid var(--border, rgb(var(--border-rgb, 39 39 42)));
          border-radius: 0.75rem;
          padding: 0.625rem 0.875rem;
          font-size: 0.875rem;
          color: var(--fg, rgb(var(--fg-rgb, 250 250 250)));
          outline: none;
          transition: border-color 0.15s;
        }
        :global(.form-input:focus) {
          border-color: rgb(var(--accent-rgb, 250 204 21));
        }
      `}</style>
    </form>
  );
}

function Field({
  label,
  children,
  hint,
  required,
  className,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block mb-1.5">
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted">
          {label}
          {required && <span className="text-rose-500 ml-0.5">*</span>}
        </span>
      </label>
      {children}
      {hint && <p className="text-[11px] text-muted/60 mt-1 font-mono">{hint}</p>}
    </div>
  );
}
