"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { highlight } from "@/lib/code-peek";
import { CATEGORY_ORDER, CATEGORY_META, hljsLang } from "./types";
import type { Mark, ReviewCategory, RevealFinding } from "./types";

/**
 * highlight.js emits multi-line <span>s (a string/comment can span lines). To
 * render one clickable row per source line we highlight the whole block once,
 * then split on "\n" and re-balance the open-tag stack per line so each row is
 * valid standalone HTML.
 */
function highlightLines(code: string, lang: string): string[] {
  const html = highlight(code, lang);
  const rows: string[] = [];
  const open: string[] = [];
  const tagRe = /<span\b[^>]*>|<\/span>/g;
  for (const line of html.split("\n")) {
    const prefix = open.join("");
    let m: RegExpExecArray | null;
    tagRe.lastIndex = 0;
    while ((m = tagRe.exec(line))) {
      if (m[0] === "</span>") open.pop();
      else open.push(m[0]);
    }
    rows.push(prefix + line + "</span>".repeat(open.length));
  }
  return rows;
}

interface Props {
  code: string;
  language: string;
  marks: Mark[];
  /** Toggle/replace a mark on a line. null category clears the line. */
  onMark: (line: number, category: ReviewCategory | null) => void;
  /** After reveal: findings so we can paint hit/partial/missed gutters. */
  reveal?: RevealFinding[] | null;
  /** Lines flagged that matched nothing (false positives), painted after reveal. */
  falsePositiveLines?: number[];
  disabled?: boolean;
}

export default function CodeViewer({
  code,
  language,
  marks,
  onMark,
  reveal = null,
  falsePositiveLines = [],
  disabled = false,
}: Props) {
  const lines = useMemo(() => highlightLines(code, hljsLang(language)), [code, language]);
  const markByLine = useMemo(() => {
    const m = new Map<number, ReviewCategory>();
    for (const mk of marks) m.set(mk.line, mk.category);
    return m;
  }, [marks]);

  // Which line's category picker is open (null = none).
  const [openLine, setOpenLine] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close the picker on outside click / Escape.
  useEffect(() => {
    if (openLine === null) return;
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenLine(null);
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenLine(null);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [openLine]);

  // After reveal, map each line to the finding that anchors nearest it.
  const revealByLine = useMemo(() => {
    const m = new Map<number, RevealFinding>();
    if (reveal) {
      for (const f of reveal) {
        for (let n = f.lineStart; n <= f.lineEnd; n++) m.set(n, f);
      }
    }
    return m;
  }, [reveal]);
  const fpSet = useMemo(() => new Set(falsePositiveLines), [falsePositiveLines]);
  const revealed = reveal !== null;

  return (
    <div
      ref={containerRef}
      className="iq-hl relative rounded-2xl border border-border bg-slate-50 dark:bg-[#0a0b10] overflow-hidden font-mono text-[12.5px] leading-relaxed"
    >
      <div className="overflow-auto max-h-[70vh]">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((html, i) => {
              const lineNo = i + 1;
              const marked = markByLine.get(lineNo);
              const finding = revealByLine.get(lineNo);
              const isFp = revealed && fpSet.has(lineNo);

              // Gutter tint after reveal.
              let rowTint = "";
              if (revealed && finding) {
                rowTint =
                  finding.status === "hit"
                    ? "bg-emerald-500/10"
                    : finding.status === "partial"
                      ? "bg-amber-500/10"
                      : "bg-rose-500/10"; // missed
              } else if (isFp) {
                rowTint = "bg-slate-500/10";
              } else if (marked) {
                rowTint = "bg-indigo-500/10";
              }

              return (
                <tr
                  key={lineNo}
                  className={`group/line align-top transition-colors ${rowTint} ${
                    !revealed && !disabled ? "hover:bg-indigo-500/[0.06] cursor-pointer" : ""
                  }`}
                  onClick={() => {
                    if (revealed || disabled) return;
                    setOpenLine((cur) => (cur === lineNo ? null : lineNo));
                  }}
                >
                  {/* line number */}
                  <td className="select-none text-right pr-3 pl-4 py-0.5 text-muted/50 tabular-nums w-[1%] whitespace-nowrap border-r border-border/50">
                    {lineNo}
                  </td>

                  {/* marker gutter */}
                  <td className="select-none px-2 py-0.5 w-[1%] whitespace-nowrap text-center">
                    {revealed && finding ? (
                      <span title={finding.status}>
                        {finding.status === "hit" ? "✅" : finding.status === "partial" ? "🟡" : "❌"}
                      </span>
                    ) : revealed && isFp ? (
                      <span title="False positive — nothing wrong here">➖</span>
                    ) : marked ? (
                      <span title={CATEGORY_META[marked].label}>{CATEGORY_META[marked].emoji}</span>
                    ) : (
                      <span className="opacity-0 group-hover/line:opacity-40">＋</span>
                    )}
                  </td>

                  {/* code */}
                  <td className="pr-4 py-0.5 relative">
                    <code dangerouslySetInnerHTML={{ __html: html || "&nbsp;" }} />

                    {/* category picker */}
                    {openLine === lineNo && !revealed && (
                      <div
                        className="absolute z-20 left-0 top-full mt-1 flex flex-wrap gap-1.5 p-2 rounded-xl border border-border bg-surface shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {CATEGORY_ORDER.map((cat) => {
                          const meta = CATEGORY_META[cat];
                          const active = marked === cat;
                          return (
                            <button
                              key={cat}
                              onClick={() => {
                                onMark(lineNo, active ? null : cat);
                                setOpenLine(null);
                              }}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition ${
                                active ? meta.className : "border-border bg-bg text-muted hover:text-fg hover:border-border-strong"
                              }`}
                            >
                              <span>{meta.emoji}</span>
                              {meta.label}
                            </button>
                          );
                        })}
                        {marked && (
                          <button
                            onClick={() => {
                              onMark(lineNo, null);
                              setOpenLine(null);
                            }}
                            className="inline-flex items-center px-2.5 py-1 rounded-lg border border-border bg-bg text-[11px] font-bold text-rose-500 hover:bg-rose-500/10 transition"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
