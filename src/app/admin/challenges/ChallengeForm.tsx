"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import InvitationManager from "@/components/InvitationManager";
import MonacoFileEditor from "@/components/MonacoFileEditor";
import ChallengePreview from "./ChallengePreview";
import { TEMPLATES, type ChallengeTemplate } from "./challenge-templates";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  LayoutTemplate,
  Lock,
  Plus,
  Save,
  Trash2,
  X,
  Eye,
  EyeOff,
  Award,
  Sparkles,
} from "lucide-react";

// Types + pure helpers live in `./challenge-form-types` so server components
// can import them without crossing the "use client" boundary. We need the
// `blankStep` value at runtime in this file (addStep below calls it), so
// import it directly rather than relying on the re-export alone.
import {
  blankStep,
  HARNESS_LANGUAGES,
  type ChallengeFormInput,
  type ChallengeFormSurface,
  type ChallengeStepInput,
  type JudgingMode,
} from "./challenge-form-types";
import { allTypes } from "@/lib/judge/types";
export {
  blankStep,
  type ChallengeFormInput,
  type ChallengeFormSurface,
  type ChallengeStepInput,
} from "./challenge-form-types";

/**
 * Sandpack template ids the author can select for a given step. Renamed
 * from the original `TEMPLATES` so it doesn't collide with the imported
 * `TEMPLATES` (the scaffold gallery from challenge-templates.ts).
 */
export const SANDPACK_TEMPLATES = [
  { value: "test-ts", label: "test-ts (Jest + TypeScript)" },
  { value: "test-js", label: "test-js (Jest + JavaScript)" },
  { value: "react", label: "react" },
  { value: "vanilla", label: "vanilla" },
  { value: "vanilla-ts", label: "vanilla-ts" },
  { value: "node", label: "node" },
];

const DIFFICULTIES: ChallengeFormInput["difficulty"][] = [
  "easy",
  "medium",
  "hard",
];

// ─── Component ─────────────────────────────────────────────────────────────

export default function ChallengeForm({
  mode,
  initial,
  surface,
}: {
  mode: "create" | "edit";
  initial: ChallengeFormInput;
  surface: ChallengeFormSurface;
}) {
  const router = useRouter();
  const [form, setForm] = useState<ChallengeFormInput>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Accordion: which step row is currently expanded. -1 = none, 0 = first.
  // We auto-expand the first step on mount and after adding a new step.
  const [expandedStep, setExpandedStep] = useState<number>(0);

  function update<K extends keyof ChallengeFormInput>(
    key: K,
    value: ChallengeFormInput[K]
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function updateStep<K extends keyof ChallengeStepInput>(
    idx: number,
    key: K,
    value: ChallengeStepInput[K]
  ) {
    setForm((f) => ({
      ...f,
      steps: f.steps.map((s, i) => (i === idx ? { ...s, [key]: value } : s)),
    }));
  }

  function addStep() {
    setForm((f) => ({ ...f, steps: [...f.steps, blankStep()] }));
    setExpandedStep(form.steps.length); // open the newly added step
  }

  function removeStep(idx: number) {
    if (form.steps.length === 1) {
      toast.error("A challenge needs at least one question.");
      return;
    }
    if (!confirm(`Remove question ${idx + 1}?`)) return;
    setForm((f) => ({
      ...f,
      steps: f.steps.filter((_, i) => i !== idx),
    }));
    setExpandedStep(0);
  }

  function moveStep(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= form.steps.length) return;
    setForm((f) => {
      const next = [...f.steps];
      [next[idx], next[target]] = [next[target], next[idx]];
      return { ...f, steps: next };
    });
    setExpandedStep(target);
  }

  // The step index currently open in the test-preview modal. null = no
  // preview. We resolve the live starter/test JSON from form.steps[idx]
  // at render time so the modal always reflects the latest edits.
  const [previewStep, setPreviewStep] = useState<number | null>(null);

  // Verify both file maps parse before opening — surface friendlier errors
  // than a Sandpack runtime crash. Returns the live preview payload (or
  // null if the JSON is malformed in either editor).
  function buildPreviewPayload(idx: number) {
    const step = form.steps[idx];
    if (!step) return null;
    const starter = parseFiles("starter", step.starterFilesJson);
    if (!starter) return null;
    const tests = parseFiles("tests", step.testFilesJson);
    if (!tests) return null;
    return {
      starter,
      tests,
      template: step.template || "test-ts",
      label: step.title?.trim() || `Question ${idx + 1}`,
    };
  }

  function openPreview(idx: number) {
    if (buildPreviewPayload(idx) === null) return;
    setPreviewStep(idx);
  }

  // Replace the active step's content with one of the pre-built scaffolds
  // from challenge-templates.ts. Confirms first if the author has already
  // typed real content into the step.
  function applyTemplate(tpl: ChallengeTemplate) {
    const idx = expandedStep >= 0 ? expandedStep : 0;
    const current = form.steps[idx];
    const looksDirty =
      !!current.title.trim() ||
      // Skip the confirm if description is still the default placeholder.
      !!current.description.trim() &&
        !current.description.startsWith("## Problem") &&
        !current.description.startsWith("## What is this");
    if (looksDirty) {
      if (
        !confirm(
          `This will replace question ${idx + 1}'s description, starter files, test files, and template with "${tpl.name}". Continue?`
        )
      ) {
        return;
      }
    }

    setForm((f) => ({
      ...f,
      steps: f.steps.map((s, i) =>
        i === idx
          ? {
              ...s,
              description: tpl.description,
              template: tpl.template,
              starterFilesJson: JSON.stringify(tpl.starterFiles, null, 2),
              testFilesJson: JSON.stringify(tpl.testFiles, null, 2),
            }
          : s
      ),
    }));
    setExpandedStep(idx);
    toast.success(`Applied template: ${tpl.name}`);
  }

  // Parses a step's JSON-shaped string into a flat string→string map, with
  // a friendly toast on failure. Returns null on error (caller bails).
  function parseFiles(label: string, raw: string): Record<string, string> | null {
    if (!raw.trim()) return {};
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        toast.error(`${label} must be an object of { "/path": "code" }`);
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
    if (!form.slug.trim() || !form.title.trim() || !form.description.trim()) {
      toast.error("Title, slug, and description are required");
      return;
    }
    if (form.steps.length === 0) {
      toast.error("Add at least one question");
      return;
    }

    const stepsPayload: {
      title?: string;
      description: string;
      template: string;
      starterFiles: Record<string, string>;
      testFiles: Record<string, string>;
      estimatedMinutes: number;
      hint?: string;
      videoUrl?: string;
      testCases?: any[];
      judgingMode?: string;
      functionName?: string | null;
      signatureJson?: string | null;
      languagesJson?: string | null;
      starterCodeJson?: string | null;
      referenceSolutionsJson?: string | null;
      harnessTestsJson?: string;
    }[] = [];

    for (const [i, step] of form.steps.entries()) {
      if (!step.description.trim()) {
        toast.error(`Question ${i + 1}: description is required`);
        setExpandedStep(i);
        return;
      }

      if (step.judgingMode === "harness") {
        // Harness steps store the contract + generated assets; legacy file maps
        // are sent empty. Block save until Validate has produced expected outputs.
        if (!step.functionName.trim()) {
          toast.error(`Question ${i + 1}: function name is required`);
          setExpandedStep(i);
          return;
        }
        if (step.languages.length === 0) {
          toast.error(`Question ${i + 1}: enable at least one language`);
          setExpandedStep(i);
          return;
        }
        const missingExpected = step.harnessTests.filter((t) => !t.expectedJson);
        if (step.harnessTests.length === 0 || missingExpected.length > 0) {
          toast.error(`Question ${i + 1}: run Validate to generate expected outputs for all test cases`);
          setExpandedStep(i);
          return;
        }
        stepsPayload.push({
          title: step.title.trim() || undefined,
          description: step.description,
          template: "node",
          starterFiles: {},
          testFiles: {},
          estimatedMinutes: Number(step.estimatedMinutes) || 15,
          hint: step.hint.trim() || undefined,
          videoUrl: step.videoUrl.trim() || undefined,
          judgingMode: "harness",
          functionName: step.functionName.trim(),
          signatureJson: JSON.stringify({ params: step.params, returnType: step.returnType }),
          languagesJson: JSON.stringify(step.languages),
          starterCodeJson: JSON.stringify(step.starterCode),
          referenceSolutionsJson: JSON.stringify(step.referenceSolutions),
          harnessTestsJson: JSON.stringify(step.harnessTests),
        });
        continue;
      }

      // Legacy unit-js / frontend steps.
      const starter = parseFiles(`Question ${i + 1}: starter files`, step.starterFilesJson);
      if (!starter) {
        setExpandedStep(i);
        return;
      }
      const tests = parseFiles(`Question ${i + 1}: test files`, step.testFilesJson);
      if (!tests) {
        setExpandedStep(i);
        return;
      }
      stepsPayload.push({
        title: step.title.trim() || undefined,
        description: step.description,
        template: step.template,
        starterFiles: starter,
        testFiles: tests,
        estimatedMinutes: Number(step.estimatedMinutes) || 15,
        hint: step.hint.trim() || undefined,
        videoUrl: step.videoUrl.trim() || undefined,
        testCases: step.testCases || [],
        judgingMode: step.judgingMode,
      });
    }

    const tags = form.tagsCsv
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const payload = {
      slug: form.slug.trim(),
      title: form.title.trim(),
      description: form.description,
      difficulty: form.difficulty,
      tags,
      category: form.category.trim() || null,
      published: form.published,
      visibility: form.visibility,
      steps: stepsPayload,
    };

    setSubmitting(true);
    try {
      const url =
        mode === "create" ? surface.createEndpoint : surface.itemEndpoint;
      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
      });
      if (!res.ok) {
        const errBody = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(errBody?.error ?? `HTTP ${res.status}`);
      }
      toast.success(mode === "create" ? "Challenge created" : "Saved");
      router.push(surface.redirectTo);
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
    if (!confirm(`Delete "${form.title}"? This also removes all attempts.`))
      return;
    setDeleting(true);
    try {
      const res = await fetch(surface.itemEndpoint, {
        method: "DELETE",
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success("Challenge deleted");
      router.push(surface.redirectTo);
      router.refresh();
    } catch (err) {
      toast.error("Delete failed", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setDeleting(false);
    }
  }

  const isMulti = form.steps.length > 1;
  const totalMinutes = useMemo(
    () =>
      form.steps.reduce((s, st) => s + (Number(st.estimatedMinutes) || 0), 0),
    [form.steps]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href={surface.redirectTo}
            className="w-9 h-9 rounded-xl bg-surface border border-border flex items-center justify-center text-muted hover:text-fg transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h2 className="text-2xl font-black tracking-tight">
              {mode === "create" ? "New challenge" : "Edit challenge"}
            </h2>
            {mode === "edit" && (
              <p className="text-xs text-muted mt-0.5 font-mono">
                /challenges/{form.slug}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {mode === "edit" && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting || submitting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/15 text-rose-500 text-xs font-bold transition disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {deleting ? "Deleting…" : "Delete"}
            </button>
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* ── Top-level metadata ─────────────────────────────────── */}
          <SectionCard label="Title & summary">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Title" required>
                <input
                  value={form.title}
                  onChange={(e) => update("title", e.target.value)}
                  className={inputClass}
                  placeholder="Two Sum"
                  required
                />
              </Field>
              <Field
                label="Slug"
                required
                hint={`/challenges/${form.slug || "your-slug"}`}
              >
                <input
                  value={form.slug}
                  onChange={(e) => update("slug", e.target.value)}
                  className={`${inputClass} font-mono`}
                  placeholder="two-sum"
                  pattern="[a-z0-9-]+"
                  required
                />
              </Field>
            </div>
            <Field
              label="Summary (Markdown)"
              required
              hint="Shown on the detail page above the questions."
              className="mt-3"
            >
              <textarea
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                rows={4}
                className={`${inputClass} font-mono text-xs`}
                placeholder="What's this challenge about? Who's it for?"
                required
              />
            </Field>
          </SectionCard>

          {/* ── Steps ──────────────────────────────────────────────── */}
          <SectionCard
            label={`Questions (${form.steps.length})`}
            hint={
              isMulti
                ? `${totalMinutes} min total · multi-question series`
                : "Single question — add more to turn it into a multi-step series."
            }
          >
            <ol className="space-y-3">
              {form.steps.map((step, i) => (
                <li key={i}>
                  <StepRow
                    step={step}
                    index={i}
                    expanded={expandedStep === i}
                    canMoveUp={i > 0}
                    canMoveDown={i < form.steps.length - 1}
                    canRemove={form.steps.length > 1}
                    onToggle={() =>
                      setExpandedStep(expandedStep === i ? -1 : i)
                    }
                    onUpdate={(key, value) => updateStep(i, key, value)}
                    onMoveUp={() => moveStep(i, -1)}
                    onMoveDown={() => moveStep(i, 1)}
                    onRemove={() => removeStep(i)}
                    onPreview={() => openPreview(i)}
                  />
                </li>
              ))}
            </ol>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={addStep}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/30 text-accent text-xs font-bold hover:bg-accent/20 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Add another question
              </button>
              <TemplatePicker onPick={applyTemplate} />
              <span className="text-[10px] text-muted/60 ml-auto">
                Not sure where to start? Pick a template — it fills in the
                description, starter, and test scaffolding.
              </span>
            </div>
          </SectionCard>
        </div>

        {/* ── Sidebar ────────────────────────────────────────────── */}
        <div className="space-y-4">
          <SectionCard label="Difficulty">
            <div className="flex flex-wrap gap-1.5">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => update("difficulty", d)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition border ${
                    form.difficulty === d
                      ? "bg-accent text-bg border-accent"
                      : "bg-surface text-muted border-border hover:text-fg hover:border-border-strong"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </SectionCard>

          <SectionCard label="Tags & category">
            <Field label="Category" hint="e.g. Algorithms, Frontend">
              <input
                value={form.category}
                onChange={(e) => update("category", e.target.value)}
                className={inputClass}
                placeholder="Algorithms"
              />
            </Field>
            <Field label="Tags" hint="Comma-separated" className="mt-3">
              <input
                value={form.tagsCsv}
                onChange={(e) => update("tagsCsv", e.target.value)}
                className={inputClass}
                placeholder="arrays, hashmap"
              />
            </Field>
          </SectionCard>

          {mode === "edit" &&
            form.published &&
            form.visibility === "private" &&
            form.slug && (
              <InvitationManager
                listEndpoint={`/api/challenges/${form.slug}/invites`}
                revokeEndpoint={(id) =>
                  `/api/challenges/${form.slug}/invites/${id}`
                }
                linkBase={`/challenges/${form.slug}`}
              />
            )}

          <SectionCard label="Visibility">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(e) => update("published", e.target.checked)}
                className="w-4 h-4 accent-accent"
              />
              Published
            </label>
            <div className="text-[10px] text-muted/60 mt-1 leading-relaxed">
              Unpublished challenges are visible only to you (and admins).
            </div>
            {form.published && surface.isAdmin && (
              <div className="flex flex-col gap-3 mt-3 pt-3 border-t border-border">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(e) => update("featured", e.target.checked)}
                    className="w-4 h-4 accent-accent"
                  />
                  <span className="text-fg">Featured (Staff pick)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={form.premium}
                    onChange={(e) => update("premium", e.target.checked)}
                    className="w-4 h-4 accent-accent"
                  />
                  <span className="text-fg">Premium (Paid Challenge)</span>
                </label>
              </div>
            )}

            {form.published && (
              <div className="mt-4 pt-4 border-t border-border space-y-2">
                <div className="text-[10px] font-black uppercase tracking-[0.15em] text-muted">
                  Who can see it
                </div>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="visibility"
                    value="public"
                    checked={form.visibility === "public"}
                    onChange={() => update("visibility", "public")}
                    className="mt-0.5 accent-accent"
                  />
                  <div className="text-sm">
                    <div className="font-bold text-fg">Public</div>
                    <div className="text-[11px] text-muted/70">
                      Listed on /challenges. Anyone can view and attempt.
                    </div>
                  </div>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="visibility"
                    value="private"
                    checked={form.visibility === "private"}
                    onChange={() => update("visibility", "private")}
                    className="mt-0.5 accent-accent"
                  />
                  <div className="text-sm">
                    <div className="font-bold text-fg inline-flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Private
                    </div>
                    <div className="text-[11px] text-muted/70">
                      Unlisted. Only people you invite can open the link.
                      Manage invitations after creating the challenge.
                    </div>
                  </div>
                </label>
              </div>
            )}
          </SectionCard>
        </div>
      </div>

      {/* Test-this-step preview modal — rendered at the form root so it
          overlays everything regardless of which step row is expanded.
          Mounted only when `previewStep !== null` so Sandpack's heavy
          iframe isn't booted until requested. */}
      {previewStep !== null &&
        (() => {
          const payload = buildPreviewPayload(previewStep);
          if (!payload) return null;
          return (
            <ChallengePreview
              starterFiles={payload.starter}
              testFiles={payload.tests}
              template={payload.template}
              stepLabel={payload.label}
              onClose={() => setPreviewStep(null)}
            />
          );
        })()}
    </form>
  );
}

// ─── Subcomponents ─────────────────────────────────────────────────────────

const inputClass =
  "w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition";

function SectionCard({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-muted">
          {label}
        </div>
        {hint && (
          <div className="text-[10px] text-muted/60 font-mono">{hint}</div>
        )}
      </div>
      {children}
    </div>
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

function StepRow({
  step,
  index,
  expanded,
  canMoveUp,
  canMoveDown,
  canRemove,
  onToggle,
  onUpdate,
  onMoveUp,
  onMoveDown,
  onRemove,
  onPreview,
}: {
  step: ChallengeStepInput;
  index: number;
  expanded: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  canRemove: boolean;
  onToggle: () => void;
  onUpdate: <K extends keyof ChallengeStepInput>(
    key: K,
    value: ChallengeStepInput[K]
  ) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  /** Opens the Sandpack-powered "Test this step" modal. */
  onPreview: () => void;
  onRemove: () => void;
}) {
  const label = step.title.trim() || `Question ${index + 1}`;
  return (
    <div className="rounded-xl border border-border bg-elevated/30">
      {/* Collapsed header — always visible */}
      <div className="flex items-center gap-2 p-3">
        <div className="w-7 h-7 rounded-md bg-bg/40 border border-border grid place-items-center text-[11px] font-black text-muted shrink-0">
          {index + 1}
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="flex-1 text-left flex items-center gap-2 min-w-0"
        >
          <span className="font-bold text-fg text-sm truncate">{label}</span>
          <span className="text-[10px] text-muted shrink-0 tabular-nums">
            {step.estimatedMinutes}m
          </span>
          <span className="ml-auto text-muted">
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </span>
        </button>
        <div className="flex items-center gap-0.5">
          <IconBtn
            disabled={!canMoveUp}
            onClick={onMoveUp}
            title="Move up"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </IconBtn>
          <IconBtn
            disabled={!canMoveDown}
            onClick={onMoveDown}
            title="Move down"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </IconBtn>
          <IconBtn
            disabled={!canRemove}
            onClick={onRemove}
            title="Remove"
            tone="danger"
          >
            <X className="w-3.5 h-3.5" />
          </IconBtn>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Step title" className="md:col-span-2">
              <input
                value={step.title}
                onChange={(e) => onUpdate("title", e.target.value)}
                placeholder={`Defaults to "Question ${index + 1}"`}
                className={inputClass}
              />
            </Field>
            <Field label="Estimated minutes">
              <input
                type="number"
                min={1}
                max={300}
                value={step.estimatedMinutes}
                onChange={(e) =>
                  onUpdate("estimatedMinutes", Number(e.target.value))
                }
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Description (Markdown)" required>
            <textarea
              value={step.description}
              onChange={(e) => onUpdate("description", e.target.value)}
              rows={5}
              placeholder={"## Problem\n\nWrite a function that..."}
              className={`${inputClass} font-mono text-xs`}
              required
            />
          </Field>

          {/* How this question is graded */}
          <JudgingModeToggle
            value={step.judgingMode}
            onChange={(m) => onUpdate("judgingMode", m)}
          />

          <Field label="Video URL (optional)" hint="YouTube / Vimeo / Loom auto-embed">
            <input
              value={step.videoUrl}
              onChange={(e) => onUpdate("videoUrl", e.target.value)}
              placeholder="https://youtube.com/watch?v=…"
              className={`${inputClass} font-mono text-xs`}
            />
          </Field>

          {step.judgingMode === "harness" ? (
            <HarnessEditor step={step} onUpdate={onUpdate} />
          ) : (
          <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Sandpack template">
              <select
                value={step.template}
                onChange={(e) => onUpdate("template", e.target.value)}
                className={inputClass}
              >
                {SANDPACK_TEMPLATES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Field
              label="Starter files"
              required
              hint="Visible + editable by the participant"
            >
              <MonacoFileEditor
                value={step.starterFilesJson}
                onChange={(v) => onUpdate("starterFilesJson", v)}
                emptyHint="No starter files yet — click + to add one."
              />
            </Field>
            <Field
              label="Test files"
              required
              hint="Hidden from the participant — run server-side"
            >
              <MonacoFileEditor
                value={step.testFilesJson}
                onChange={(v) => onUpdate("testFilesJson", v)}
                hidden
                emptyHint="No test files yet — click + to add one."
              />
            </Field>
          </div>

          {/* Visual Test Case Builder */}
          <div className="rounded-xl border border-border bg-surface/50 p-4 space-y-3 mt-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black uppercase tracking-[0.15em] text-muted inline-flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-accent" />
                  Visual Test Cases (Grading Engine)
                </h4>
                <p className="text-[10px] text-muted/60 mt-0.5 max-w-xl leading-relaxed">
                  Add structured inputs, outputs, and point weights. When candidates submit their code, the platform grades it automatically against these cases.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const currentCases = step.testCases || [];
                  const newCases = [
                    ...currentCases,
                    {
                      id: Math.random().toString(36).substring(7),
                      name: `Test Case #${currentCases.length + 1}`,
                      input: "",
                      expected: "",
                      isHidden: false,
                      weight: 10,
                    },
                  ];
                  onUpdate("testCases", newCases);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-accent text-bg text-[10px] font-black uppercase tracking-wider hover:bg-accent-soft transition"
              >
                <Plus className="w-3 h-3" />
                Add Test Case
              </button>
            </div>

            {(!step.testCases || step.testCases.length === 0) ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center">
                <FlaskConical className="w-6 h-6 text-muted/40 mx-auto mb-2" />
                <div className="text-xs font-bold text-muted/80">No visual test cases defined</div>
                <div className="text-[10px] text-muted/50 mt-1 max-w-sm mx-auto">
                  Click &quot;Add Test Case&quot; to define inputs, expected outputs, and scoring weights for automatic grading.
                </div>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {step.testCases.map((tc, tcIdx) => (
                  <div key={tc.id} className="rounded-lg border border-border bg-elevated/40 p-3 space-y-2.5 hover:border-border-strong transition">
                    <div className="flex items-center justify-between gap-2">
                      <input
                        value={tc.name}
                        onChange={(e) => {
                          const updated = step.testCases.map((c, i) => i === tcIdx ? { ...c, name: e.target.value } : c);
                          onUpdate("testCases", updated);
                        }}
                        className="bg-transparent font-bold text-xs text-fg focus:outline-none border-b border-transparent focus:border-accent/40 w-full max-w-sm py-0.5"
                        placeholder="Test Case Name"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = step.testCases.filter((_, i) => i !== tcIdx);
                          onUpdate("testCases", updated);
                        }}
                        className="text-muted/60 hover:text-rose-500 transition p-1"
                        title="Remove Test Case"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-black uppercase tracking-wider text-muted/70 mb-1">Input / Arguments</label>
                        <textarea
                          value={tc.input}
                          onChange={(e) => {
                            const updated = step.testCases.map((c, i) => i === tcIdx ? { ...c, input: e.target.value } : c);
                            onUpdate("testCases", updated);
                          }}
                          className={`${inputClass} font-mono text-xs`}
                          rows={2}
                          placeholder="e.g. [1, 2], 3"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black uppercase tracking-wider text-muted/70 mb-1">Expected Output</label>
                        <textarea
                          value={tc.expected}
                          onChange={(e) => {
                            const updated = step.testCases.map((c, i) => i === tcIdx ? { ...c, expected: e.target.value } : c);
                            onUpdate("testCases", updated);
                          }}
                          className={`${inputClass} font-mono text-xs`}
                          rows={2}
                          placeholder="e.g. [0, 1]"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 pt-1 text-[11px] text-muted">
                      <label className="flex items-center gap-1.5 cursor-pointer hover:text-fg transition select-none">
                        <input
                          type="checkbox"
                          checked={tc.isHidden}
                          onChange={(e) => {
                            const updated = step.testCases.map((c, i) => i === tcIdx ? { ...c, isHidden: e.target.checked } : c);
                            onUpdate("testCases", updated);
                          }}
                          className="w-3.5 h-3.5 accent-accent"
                        />
                        <span className="inline-flex items-center gap-1">
                          {tc.isHidden ? (
                            <>
                              <EyeOff className="w-3 h-3 text-amber-500" />
                              Hidden from candidate
                            </>
                          ) : (
                            <>
                              <Eye className="w-3 h-3 text-emerald-500" />
                              Publicly visible
                            </>
                          )}
                        </span>
                      </label>
                      <div className="flex items-center gap-1.5 ml-auto">
                        <span className="text-[9px] font-black uppercase tracking-wider">Score Weight:</span>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={tc.weight}
                          onChange={(e) => {
                            const updated = step.testCases.map((c, i) => i === tcIdx ? { ...c, weight: Number(e.target.value) || 0 } : c);
                            onUpdate("testCases", updated);
                          }}
                          className={`${inputClass} w-16 py-0.5 text-center font-mono`}
                        />
                        <span className="text-[10px] font-bold">pts</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 pt-3 border-t border-border">
            <div className="text-[10px] text-muted/70 leading-relaxed max-w-md">
              Spin up a sandbox with this step&apos;s starter + test files.
              Paste your reference solution and confirm every test passes
              before you publish.
            </div>
            <button
              type="button"
              onClick={onPreview}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent/10 border border-accent/30 text-accent text-xs font-bold hover:bg-accent/20 transition shrink-0"
            >
              <FlaskConical className="w-3.5 h-3.5" />
              Test this step
            </button>
          </div>
          </>
          )}

          <Field
            label="Hint (optional, behind a toggle)"
            hint="Participants tap 'Show hint' to reveal it."
          >
            <textarea
              value={step.hint}
              onChange={(e) => onUpdate("hint", e.target.value)}
              rows={3}
              className={`${inputClass} text-xs`}
            />
          </Field>
        </div>
      )}
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  disabled,
  title,
  tone,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title: string;
  tone?: "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`w-6 h-6 rounded grid place-items-center transition disabled:opacity-30 disabled:cursor-not-allowed ${
        tone === "danger"
          ? "text-muted hover:text-rose-500 hover:bg-rose-500/10"
          : "text-muted hover:text-fg hover:bg-surface"
      }`}
    >
      {children}
    </button>
  );
}

// ─── Harness authoring ──────────────────────────────────────────────────────

const JUDGING_MODES: { value: JudgingMode; label: string; blurb: string }[] = [
  { value: "harness", label: "Function judge", blurb: "Candidate implements a function; graded server-side in any enabled language." },
  { value: "unit-js", label: "JS/TS unit tests", blurb: "Hidden Jest tests in the browser sandbox. JS/TS only (legacy)." },
  { value: "frontend", label: "Frontend / manual", blurb: "UI challenge submitted for human review." },
];

const LANG_LABELS: Record<string, string> = {
  python: "Python", javascript: "JavaScript", typescript: "TypeScript",
  go: "Go", java: "Java", cpp: "C++", rust: "Rust",
};

function JudgingModeToggle({ value, onChange }: { value: JudgingMode; onChange: (m: JudgingMode) => void }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted mb-1.5">How it&apos;s graded</div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {JUDGING_MODES.map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => onChange(m.value)}
            className={`text-left rounded-lg border p-2.5 transition ${
              value === m.value ? "border-accent bg-accent/10" : "border-border bg-surface hover:border-border-strong"
            }`}
          >
            <div className="text-xs font-bold text-fg">{m.label}</div>
            <div className="text-[10px] text-muted/70 mt-0.5 leading-snug">{m.blurb}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

type AgreementMap = Record<string, { ok: boolean; compileError?: boolean; stderr?: string; mismatches: { name: string }[] }>;

function HarnessEditor({
  step,
  onUpdate,
}: {
  step: ChallengeStepInput;
  onUpdate: <K extends keyof ChallengeStepInput>(key: K, value: ChallengeStepInput[K]) => void;
}) {
  const [validating, setValidating] = useState(false);
  const [agreement, setAgreement] = useState<AgreementMap | null>(null);
  const TYPES = allTypes();
  const RETURN_TYPES = ["void", ...TYPES];

  const setParam = (i: number, patch: Partial<{ name: string; type: string }>) =>
    onUpdate("params", step.params.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  const addParam = () => onUpdate("params", [...step.params, { name: `arg${step.params.length + 1}`, type: "int" }]);
  const removeParam = (i: number) => onUpdate("params", step.params.filter((_, idx) => idx !== i));
  const toggleLang = (l: string) =>
    onUpdate("languages", step.languages.includes(l) ? step.languages.filter((x) => x !== l) : [...step.languages, l]);
  const setRef = (l: string, code: string) => onUpdate("referenceSolutions", { ...step.referenceSolutions, [l]: code });

  const setTest = (i: number, patch: Partial<ChallengeStepInput["harnessTests"][number]>) => {
    // Editing the arguments invalidates the previously generated expected value.
    const cleared = "argsJson" in patch ? { expectedJson: "" } : {};
    onUpdate("harnessTests", step.harnessTests.map((t, idx) => (idx === i ? { ...t, ...patch, ...cleared } : t)));
  };
  const addTest = () =>
    onUpdate("harnessTests", [
      ...step.harnessTests,
      { id: Math.random().toString(36).slice(2, 9), name: `Case ${step.harnessTests.length + 1}`, argsJson: "", expectedJson: "", isHidden: false, weight: 10, compare: "exact" as const },
    ]);
  const removeTest = (i: number) => onUpdate("harnessTests", step.harnessTests.filter((_, idx) => idx !== i));

  async function validate() {
    if (!step.functionName.trim()) return toast.error("Set a function name first");
    if (step.languages.length === 0) return toast.error("Enable at least one language");
    if (step.harnessTests.length === 0) return toast.error("Add at least one test case");
    setValidating(true);
    try {
      const res = await fetch("/api/admin/challenges/validate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          functionName: step.functionName.trim(),
          signature: { params: step.params, returnType: step.returnType },
          languages: step.languages,
          referenceSolutions: step.referenceSolutions,
          tests: step.harnessTests.map((t) => ({ id: t.id, name: t.name, argsJson: t.argsJson, isHidden: t.isHidden, weight: t.weight, compare: t.compare })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Validation failed", { description: (data.stderr ?? "").slice(0, 300) });
        setAgreement(data.agreement ?? null);
        return;
      }
      const expById = new Map<string, string>((data.expected as { id: string; expectedJson: string }[]).map((e) => [e.id, e.expectedJson]));
      onUpdate("harnessTests", step.harnessTests.map((t) => ({ ...t, expectedJson: expById.get(t.id) ?? t.expectedJson })));
      onUpdate("starterCode", data.stubs);
      setAgreement(data.agreement);
      if (data.ok) toast.success(`Validated via ${data.canonicalLang} — expected outputs generated`);
      else toast.warning("Validated, but languages disagree — check the flagged references");
    } catch (e) {
      toast.error("Validation error", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setValidating(false);
    }
  }

  const allValidated = step.harnessTests.length > 0 && step.harnessTests.every((t) => t.expectedJson);

  return (
    <div className="space-y-4">
      {/* Contract */}
      <div className="rounded-xl border border-border bg-surface/50 p-4 space-y-3">
        <div className="text-[10px] font-black uppercase tracking-[0.15em] text-muted">Function contract</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Function name" required>
            <input value={step.functionName} onChange={(e) => onUpdate("functionName", e.target.value)} className={`${inputClass} font-mono`} placeholder="twoSum" />
          </Field>
          <Field label="Return type">
            <select value={step.returnType} onChange={(e) => onUpdate("returnType", e.target.value)} className={`${inputClass} font-mono`}>
              {RETURN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted mb-1.5">Parameters</div>
          <div className="space-y-2">
            {step.params.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <input value={p.name} onChange={(e) => setParam(i, { name: e.target.value })} className={`${inputClass} font-mono flex-1`} placeholder="nums" />
                <select value={p.type} onChange={(e) => setParam(i, { type: e.target.value })} className={`${inputClass} font-mono w-32`}>
                  {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <IconBtn title="Remove parameter" tone="danger" onClick={() => removeParam(i)} disabled={step.params.length === 1}>
                  <X className="w-3.5 h-3.5" />
                </IconBtn>
              </div>
            ))}
          </div>
          <button type="button" onClick={addParam} className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-accent/10 border border-accent/30 text-accent text-[10px] font-black uppercase tracking-wider hover:bg-accent/20 transition">
            <Plus className="w-3 h-3" /> Add parameter
          </button>
        </div>
      </div>

      {/* Languages */}
      <div className="rounded-xl border border-border bg-surface/50 p-4 space-y-2">
        <div className="text-[10px] font-black uppercase tracking-[0.15em] text-muted">Enabled languages</div>
        <div className="flex flex-wrap gap-1.5">
          {HARNESS_LANGUAGES.map((l) => (
            <button key={l} type="button" onClick={() => toggleLang(l)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                step.languages.includes(l) ? "bg-accent text-bg border-accent" : "bg-surface text-muted border-border hover:text-fg"
              }`}>
              {LANG_LABELS[l] ?? l}
            </button>
          ))}
        </div>
      </div>

      {/* Reference solutions */}
      <div className="rounded-xl border border-border bg-surface/50 p-4 space-y-3">
        <div className="text-[10px] font-black uppercase tracking-[0.15em] text-muted">
          Reference solutions <span className="text-muted/50 font-normal normal-case">— author-only, never shown to candidates</span>
        </div>
        <p className="text-[10px] text-muted/60 leading-relaxed">
          Provide a reference in at least one enabled language. Validate runs it to generate the expected outputs and cross-checks any other references for agreement.
        </p>
        <div className="space-y-2">
          {step.languages.map((l) => (
            <details key={l} className="rounded-lg border border-border bg-elevated/40">
              <summary className="px-3 py-2 text-xs font-bold text-fg cursor-pointer flex items-center gap-2">
                {LANG_LABELS[l] ?? l}
                {(step.referenceSolutions[l] ?? "").trim() && <span className="text-[9px] text-emerald-500 font-black uppercase">provided</span>}
                {agreement?.[l]?.compileError && <span className="text-[9px] text-rose-500 font-black uppercase">compile error</span>}
                {agreement?.[l] && !agreement[l].ok && !agreement[l].compileError && <span className="text-[9px] text-amber-500 font-black uppercase">{agreement[l].mismatches.length} mismatch(es)</span>}
                {agreement?.[l]?.ok && <span className="text-[9px] text-emerald-500 font-black uppercase">agrees</span>}
              </summary>
              <textarea
                value={step.referenceSolutions[l] ?? ""}
                onChange={(e) => setRef(l, e.target.value)}
                rows={8}
                spellCheck={false}
                className={`${inputClass} font-mono text-xs rounded-t-none border-t`}
                placeholder={`Reference ${LANG_LABELS[l] ?? l} solution for ${step.functionName || "fn"}(...)`}
              />
            </details>
          ))}
        </div>
      </div>

      {/* Test cases */}
      <div className="rounded-xl border border-border bg-surface/50 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.15em] text-muted inline-flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-accent" /> Test cases
            </div>
            <p className="text-[10px] text-muted/60 mt-0.5 max-w-xl leading-relaxed">
              Arguments as a JSON array (one per parameter, in order). Expected outputs are generated by Validate — you don&apos;t type them.
            </p>
          </div>
          <button type="button" onClick={addTest} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-accent text-bg text-[10px] font-black uppercase tracking-wider hover:bg-accent-soft transition">
            <Plus className="w-3 h-3" /> Add case
          </button>
        </div>

        {step.harnessTests.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-[10px] text-muted/60">No test cases yet.</div>
        ) : (
          <div className="space-y-2.5">
            {step.harnessTests.map((tc, i) => (
              <div key={tc.id} className="rounded-lg border border-border bg-elevated/40 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input value={tc.name} onChange={(e) => setTest(i, { name: e.target.value })} className="bg-transparent font-bold text-xs text-fg focus:outline-none border-b border-transparent focus:border-accent/40 flex-1 py-0.5" placeholder="Case name" />
                  <button type="button" onClick={() => removeTest(i)} className="text-muted/60 hover:text-rose-500 transition p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-wider text-muted/70 mb-1">Arguments (JSON array)</label>
                    <input value={tc.argsJson} onChange={(e) => setTest(i, { argsJson: e.target.value })} className={`${inputClass} font-mono text-xs`} placeholder="[[2,7,11,15], 9]" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-wider text-muted/70 mb-1">Expected (generated)</label>
                    <input value={tc.expectedJson} readOnly className={`${inputClass} font-mono text-xs ${tc.expectedJson ? "text-emerald-500" : "text-muted/40"}`} placeholder="run Validate →" />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input type="checkbox" checked={tc.isHidden} onChange={(e) => setTest(i, { isHidden: e.target.checked })} className="w-3.5 h-3.5 accent-accent" />
                    <span className="inline-flex items-center gap-1">{tc.isHidden ? <><EyeOff className="w-3 h-3 text-amber-500" /> Hidden</> : <><Eye className="w-3 h-3 text-emerald-500" /> Visible</>}</span>
                  </label>
                  <label className="flex items-center gap-1.5">
                    <span className="text-[9px] font-black uppercase tracking-wider">Match</span>
                    <select value={tc.compare} onChange={(e) => setTest(i, { compare: e.target.value as ChallengeStepInput["harnessTests"][number]["compare"] })} className={`${inputClass} w-28 py-0.5 font-mono`}>
                      <option value="exact">exact</option>
                      <option value="float">float (±1e-6)</option>
                      <option value="unordered">unordered</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-1.5 ml-auto">
                    <span className="text-[9px] font-black uppercase tracking-wider">Weight</span>
                    <input type="number" min={1} max={100} value={tc.weight} onChange={(e) => setTest(i, { weight: Number(e.target.value) || 0 })} className={`${inputClass} w-16 py-0.5 text-center font-mono`} />
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-2 border-t border-border">
          <div className={`text-[10px] font-bold ${allValidated ? "text-emerald-500" : "text-amber-500"}`}>
            {allValidated ? "✓ Expected outputs generated — ready to save" : "Run Validate to generate expected outputs before saving"}
          </div>
          <button type="button" onClick={validate} disabled={validating}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent text-bg text-xs font-bold hover:bg-accent-soft transition disabled:opacity-50">
            <Sparkles className="w-3.5 h-3.5" />
            {validating ? "Validating…" : "Validate"}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Dropdown that lets an author drop a pre-built starter+test scaffold into
 * the active step. Anchored next to "Add another question" so it's
 * discoverable. Click-outside closes via a backdrop.
 */
function TemplatePicker({
  onPick,
}: {
  onPick: (tpl: ChallengeTemplate) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface text-fg/80 hover:text-fg hover:border-border-strong text-xs font-bold transition"
      >
        <LayoutTemplate className="w-3.5 h-3.5" />
        Insert template
        <ChevronDown className="w-3 h-3 opacity-70" />
      </button>

      {open && (
        <>
          {/* Backdrop: clicking anywhere outside closes the dropdown. */}
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute left-0 top-full mt-1 w-[320px] z-40 rounded-xl border border-border bg-panel shadow-2xl p-1 overflow-hidden">
            <div className="px-3 pt-2 pb-1 text-[9px] font-black uppercase tracking-[0.18em] text-muted">
              Scaffolds
            </div>
            <ul className="max-h-[60vh] overflow-y-auto">
              {TEMPLATES.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onPick(t);
                      setOpen(false);
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-elevated transition"
                  >
                    <div className="text-xs font-bold text-fg">{t.name}</div>
                    <div className="text-[10px] text-muted/70 mt-0.5 leading-snug">
                      {t.blurb}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
            <div className="px-3 pt-1 pb-2 border-t border-border text-[9px] text-muted/50 leading-relaxed">
              Replaces the current question&apos;s description, starter,
              tests, and Sandpack template. Title is preserved.
            </div>
          </div>
        </>
      )}
    </div>
  );
}
