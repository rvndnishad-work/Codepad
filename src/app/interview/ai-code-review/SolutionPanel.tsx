"use client";

import { Fragment, useMemo } from "react";
import Link from "next/link";
import {
  Sparkles,
  Crown,
  Lock,
  Check,
  X,
  Lightbulb,
  ArrowRight,
  Loader2,
} from "lucide-react";

import { highlightLines } from "./CodeViewer";
import { CATEGORY_META, CATEGORY_ORDER, hljsLang, LANGUAGE_LABELS } from "./types";
import type { ReviewCategory, SolutionFinding } from "./types";

/**
 * The premium "Show Solution" experience. Three states:
 *   • loading   — fetching from the gated endpoint
 *   • locked    — signed in but not on a paid plan → upsell
 *   • unlocked  — the full annotated walkthrough
 */
export default function SolutionPanel({
  state,
  code,
  language,
  findingCount,
  onClose,
}: {
  state: SolutionState;
  code: string;
  language: string;
  findingCount: number;
  onClose: () => void;
}) {
  return (
    <div className="rounded-2xl border border-indigo-500/25 bg-surface shadow-lg shadow-indigo-500/5 overflow-hidden">
      {/* Premium header */}
      <div className="relative flex items-center justify-between gap-3 px-5 py-4 border-b border-border bg-gradient-to-r from-indigo-500/10 via-fuchsia-500/[0.06] to-transparent">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center text-white shadow-sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-fg">Solution</h3>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-gradient-to-r from-amber-400 to-amber-500 text-[9px] font-black uppercase tracking-wider text-amber-950">
                <Crown className="w-2.5 h-2.5" /> Pro
              </span>
            </div>
            <p className="text-[11px] text-muted font-medium">Every planted issue, explained</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-border bg-bg hover:bg-panel text-muted hover:text-fg transition-colors"
          aria-label="Close solution"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {state.status === "loading" ? (
        <LoadingState />
      ) : state.status === "locked" ? (
        <LockedState findingCount={findingCount} language={language} />
      ) : state.status === "error" ? (
        <ErrorState message={state.message} />
      ) : (
        <UnlockedState findings={state.findings} code={code} language={language} />
      )}
    </div>
  );
}

// ── State shape ────────────────────────────────────────────────────────────

export type SolutionState =
  | { status: "loading" }
  | { status: "locked" }
  | { status: "error"; message: string }
  | { status: "unlocked"; findings: SolutionFinding[] };

// ── Loading ────────────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14">
      <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
      <span className="text-xs font-semibold text-muted">Unlocking the solution…</span>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="px-5 py-10 text-center">
      <p className="text-sm font-semibold text-rose-500">{message}</p>
    </div>
  );
}

// ── Locked (paywall) ───────────────────────────────────────────────────────

function LockedState({
  findingCount,
  language,
}: {
  findingCount: number;
  language: string;
}) {
  return (
    <div className="px-5 py-6">
      {/* Glowing lock */}
      <div className="flex justify-center mb-4">
        <div className="relative">
          <div className="absolute inset-0 rounded-2xl bg-indigo-500/30 blur-xl" />
          <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-600 flex items-center justify-center text-white shadow-lg">
            <Lock className="w-6 h-6" />
          </div>
        </div>
      </div>

      <h4 className="text-center text-base font-extrabold text-fg">
        Unlock the full solution
      </h4>
      <p className="text-center text-xs text-muted leading-relaxed mt-1.5 max-w-xs mx-auto">
        This {LANGUAGE_LABELS[language] ?? language} snippet hides{" "}
        <span className="font-bold text-fg">{findingCount}</span> planted{" "}
        {findingCount === 1 ? "issue" : "issues"}. See each one explained — with the
        exact fix — instantly, no attempt needed.
      </p>

      {/* Value bullets */}
      <ul className="mt-4 space-y-2 max-w-xs mx-auto">
        {[
          "Line-by-line annotations for every bug",
          "Why each pattern is dangerous in production",
          "The corrected approach, spelled out",
        ].map((b) => (
          <li key={b} className="flex items-start gap-2 text-xs text-fg">
            <span className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
              <Check className="w-2.5 h-2.5" strokeWidth={3} />
            </span>
            <span className="leading-relaxed">{b}</span>
          </li>
        ))}
      </ul>

      <Link
        href="/pricing"
        className="mt-5 w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 text-sm font-bold text-white transition-all shadow-md hover:shadow-indigo-500/30 active:scale-[0.98]"
      >
        <Crown className="w-4 h-4" /> Upgrade to Pro
        <ArrowRight className="w-4 h-4" />
      </Link>
      <p className="text-center text-[10px] text-muted mt-2.5">
        Included with any paid workspace plan.
      </p>
    </div>
  );
}

// ── Unlocked (the walkthrough) ─────────────────────────────────────────────

function UnlockedState({
  findings,
  code,
  language,
}: {
  findings: SolutionFinding[];
  code: string;
  language: string;
}) {
  // Highlight the whole snippet once so each card can pull its exact rows,
  // syntax-highlighted identically to the main viewer.
  const rows = useMemo(
    () => highlightLines(code, hljsLang(language)),
    [code, language],
  );

  // Category tally for the summary strip.
  const tally = useMemo(() => {
    const t = new Map<ReviewCategory, number>();
    for (const f of findings) t.set(f.category, (t.get(f.category) ?? 0) + 1);
    return CATEGORY_ORDER.filter((c) => t.has(c)).map((c) => ({
      cat: c,
      n: t.get(c)!,
    }));
  }, [findings]);

  return (
    <div>
      {/* Summary strip */}
      <div className="flex items-center gap-2 flex-wrap px-5 py-3 border-b border-border bg-panel/20">
        <span className="text-xs font-bold text-fg">
          {findings.length} {findings.length === 1 ? "issue" : "issues"} found
        </span>
        <span className="text-muted/40">•</span>
        {tally.map(({ cat, n }) => {
          const meta = CATEGORY_META[cat];
          return (
            <span
              key={cat}
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-bold ${meta.className}`}
              title={meta.label}
            >
              {meta.emoji} {n}
            </span>
          );
        })}
      </div>

      {/* Finding cards */}
      <ol className="divide-y divide-border max-h-[62vh] overflow-auto">
        {findings.map((f, i) => (
          <FindingCard key={f.id} index={i + 1} finding={f} rows={rows} />
        ))}
      </ol>
    </div>
  );
}

function FindingCard({
  index,
  finding,
  rows,
}: {
  index: number;
  finding: SolutionFinding;
  rows: string[];
}) {
  const meta = CATEGORY_META[finding.category];
  const snippet = rows.slice(finding.lineStart - 1, finding.lineEnd);
  const lineLabel =
    finding.lineEnd !== finding.lineStart
      ? `L${finding.lineStart}–${finding.lineEnd}`
      : `L${finding.lineStart}`;

  return (
    <li className="p-4 hover:bg-panel/20 transition-colors">
      <div className="flex items-start gap-3">
        {/* Number badge */}
        <span className="flex-shrink-0 mt-0.5 w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white text-xs font-bold flex items-center justify-center shadow-sm">
          {index}
        </span>

        <div className="min-w-0 flex-1">
          {/* Title + meta row */}
          <h4 className="text-sm font-bold text-fg leading-snug">{finding.title}</h4>
          <div className="flex items-center gap-2 mt-1.5">
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-bold ${meta.className}`}
            >
              {meta.emoji} {meta.label}
            </span>
            <span className="font-mono text-[10px] text-muted/80 bg-panel px-1.5 py-0.5 rounded">
              {lineLabel}
            </span>
          </div>

          {/* The flawed code */}
          <div className="iq-hl mt-2.5 rounded-lg border border-border bg-slate-50 dark:bg-[#0a0b10] overflow-hidden font-mono text-[11.5px] leading-relaxed">
            <table className="w-full border-collapse">
              <tbody>
                {snippet.map((html, k) => (
                  <tr key={k}>
                    <td className="select-none text-right pr-2.5 pl-3 py-0.5 text-muted/40 tabular-nums w-[1%] whitespace-nowrap border-r border-border/40">
                      {finding.lineStart + k}
                    </td>
                    <td className="pl-3 pr-3 py-0.5">
                      <code dangerouslySetInnerHTML={{ __html: html || "&nbsp;" }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Explanation with a "fix" accent */}
          <div className="mt-2.5 flex items-start gap-2">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted leading-relaxed">
              <RichText text={finding.explanation} />
            </p>
          </div>
        </div>
      </div>
    </li>
  );
}

/**
 * Lightweight inline formatter: renders `backtick` spans as styled code so the
 * fix snippets inside explanations pop, without pulling in a full markdown lib.
 */
function RichText({ text }: { text: string }) {
  const parts = useMemo(() => text.split(/(`[^`]+`)/g), [text]);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("`") && p.endsWith("`") && p.length > 1 ? (
          <code
            key={i}
            className="px-1 py-0.5 rounded bg-panel text-[11px] font-mono text-fg border border-border/60"
          >
            {p.slice(1, -1)}
          </code>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}
