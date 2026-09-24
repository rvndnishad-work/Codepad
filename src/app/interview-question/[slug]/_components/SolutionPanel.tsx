"use client";

import { Check, EyeOff, Lock } from "lucide-react";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { plural } from "@/lib/interview-questions/topic-catalog";

/** The opening of the answer for the blurred preview, without diagrams or raw HTML. */
function previewOf(content: string) {
  return content
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    .replace(/<[^>]+>/g, "")
    .slice(0, 900);
}

const kbd = "rounded-md border border-border bg-panel px-1.5 py-px font-mono text-[11px] font-medium text-subtle";

/**
 * The answer, hidden behind a blurred preview until the reader asks for it
 * (button or E). Once open it reads like documentation straight on the page,
 * and ends with a prompt to mark the question solved.
 */
export default function SolutionPanel({
  content,
  minutes,
  sections,
  open,
  onOpen,
  onClose,
  solved,
  onToggleSolved,
}: {
  content: string;
  minutes: number;
  sections: number;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  solved: boolean;
  onToggleSolved: () => void;
}) {
  if (!open) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-border bg-surface">
        <div aria-hidden className="qa-doc qa-preview max-h-[230px] overflow-hidden px-6 pt-6 md:px-8 md:pt-8">
          <MarkdownRenderer content={previewOf(content)} />
        </div>
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center bg-gradient-to-t from-surface via-surface/95 to-transparent px-6 pb-7 pt-16 text-center">
          <span className="qa-lock grid h-11 w-11 place-items-center rounded-2xl border border-accent/30 bg-accent/10 text-accent">
            <Lock className="h-[18px] w-[18px]" aria-hidden />
          </span>
          <h3 className="mt-3.5 text-[17px] font-semibold text-fg">The solution is hidden so you can try first</h3>
          <p className="mt-1 text-sm text-subtle">
            {minutes} min read{sections > 1 ? ` · ${plural(sections, "section")}` : ""}
          </p>
          <button
            type="button"
            onClick={onOpen}
            aria-expanded={false}
            aria-controls="solution-body"
            className="mt-5 inline-flex h-11 items-center gap-2.5 rounded-full bg-accent px-6 text-sm font-semibold text-accent-ink transition-[transform,box-shadow] hover:-translate-y-px hover:shadow-[0_12px_30px_-12px_rgb(var(--c-accent)/0.6)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            Show solution
            <span className="rounded-md bg-accent-ink/10 px-1.5 py-px font-mono text-[11px]">E</span>
          </button>
        </div>
        {/* Keeps the card tall enough for the overlay on short answers. */}
        <div aria-hidden className="h-[100px]" />
      </div>
    );
  }

  return (
    <div id="solution-body" className="qa-in">
      <div className="mb-6 flex items-center justify-between gap-3 border-b border-border pb-4">
        <p className="text-sm text-subtle">
          {minutes} min read{sections > 1 ? ` · ${plural(sections, "section")}` : ""}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-expanded
          aria-controls="solution-body"
          className="inline-flex h-8 items-center gap-2 rounded-lg px-2.5 text-[13px] font-medium text-subtle transition-colors hover:bg-panel hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none"
        >
          <EyeOff className="h-4 w-4" aria-hidden />
          Hide
          <span className={kbd}>E</span>
        </button>
      </div>

      <div className="qa-doc">
        {/* allowHtml: answers are admin-curated and may embed hand-authored SVG diagrams. */}
        <MarkdownRenderer content={content} allowHtml docs />
      </div>

      <div className="mt-10 flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 sm:flex-row sm:items-center sm:justify-between md:px-6">
        <div>
          <p className="text-[15px] font-semibold text-fg">
            {solved ? "This one is in your solved list." : "Could you explain this in an interview now?"}
          </p>
          <p className="mt-0.5 text-sm text-subtle">
            {solved ? "Nice work. Move on when you are ready." : "Mark it solved to keep track of your progress."}
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleSolved}
          aria-pressed={solved}
          className={`inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none ${
            solved
              ? "border border-success/40 bg-success/15 text-success"
              : "border border-border-strong bg-panel text-fg hover:border-success/50 hover:text-success"
          }`}
        >
          <Check className="h-4 w-4" aria-hidden />
          {solved ? "Solved" : "Mark as solved"}
        </button>
      </div>
    </div>
  );
}
