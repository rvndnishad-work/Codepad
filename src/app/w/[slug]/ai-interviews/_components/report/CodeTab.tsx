"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, FileMinus2, FilePlus2, FileDiff, FileCode2, UnfoldVertical } from "lucide-react";
import "highlight.js/styles/github-dark.css";
import type { ReportRound } from "@/lib/ai-interview/console-server";
import { buildFileView, markRanges, toSplitRows, type DiffLine, type DiffRow } from "@/lib/ai-interview/line-diff";
import { highlight } from "@/lib/code-peek";
import { plural } from "@/lib/workspace/display";
import { Seg, shortPath } from "./ide";

/**
 * Starter code against the candidate's code, laid out like GitHub's
 * "Files changed" view: a file tree, one card per changed file with a
 * diffstat, hunks with three lines of context, and word-level highlights.
 */

// GitHub dark diff colours.
const C = {
  addLine: "bg-[rgba(46,160,67,0.15)]",
  addNum: "bg-[rgba(63,185,80,0.3)] text-fg",
  addWord: "bg-[rgba(46,160,67,0.45)] rounded-sm",
  delLine: "bg-[rgba(248,81,73,0.1)]",
  delNum: "bg-[rgba(248,81,73,0.25)] text-fg",
  delWord: "bg-[rgba(248,81,73,0.45)] rounded-sm",
  hunk: "bg-[rgba(56,139,253,0.1)] text-muted",
  hunkNum: "bg-[rgba(56,139,253,0.15)]",
  empty: "bg-[rgba(110,118,129,0.1)]",
};

type Mode = "split" | "unified";

type FileEntry = {
  path: string;
  status: "added" | "modified" | "deleted" | "unchanged";
  rows: DiffRow[];
  added: number;
  removed: number;
  oldHtml: string[];
  newHtml: string[];
};

export default function CodeTab({ round, noun = "round" }: { round: ReportRound | undefined; noun?: "round" | "question" }) {
  const [mode, setMode] = useState<Mode>("split");
  const wide = useWide();
  const view: Mode = wide ? mode : "unified";

  const { changed, untouched } = useMemo(() => buildEntries(round), [round]);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [viewed, setViewed] = useState<Set<string>>(() => new Set());

  if (!round) return null;
  if (!round.diffs) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-muted">
        {Object.keys(round.files).length && round.status !== "PENDING"
          ? `The starter code for this ${noun} was not recorded, so changes cannot be shown.${noun === "round" ? " The Run the code tab shows the final code." : ""}`
          : `Nothing was submitted for this ${noun} yet.`}
      </div>
    );
  }

  const added = changed.reduce((n, f) => n + f.added, 0);
  const removed = changed.reduce((n, f) => n + f.removed, 0);
  const toggle = (set: Set<string>, path: string) => {
    const next = new Set(set);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    return next;
  };
  const jump = (path: string) => {
    setCollapsed((s) => (s.has(path) ? toggle(s, path) : s));
    requestAnimationFrame(() => document.getElementById(anchor(path))?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  return (
    <div className="flex flex-col gap-3">
      {changed.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-8 flex flex-col items-center gap-1 text-center">
          <p className="text-sm font-medium text-fg">No code changes in this {noun}</p>
          <p className="text-[13px] text-muted">
            The candidate did not edit, add or delete any file{untouched ? `. All ${plural(untouched, "starter file")} are as they were given` : ""}.
          </p>
        </div>
      ) : (
        <>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="text-[13px] text-muted">
          <span className="text-fg font-medium">{plural(changed.length, "file")} changed</span>
          <span className="ml-2 font-mono text-success">+{added}</span>
          <span className="ml-1.5 font-mono text-danger">-{removed}</span>
          {round.linesWritten != null && (
            <span className="ml-3 text-subtle">
              {plural(round.linesWritten, "line")} written by the candidate, and only those are scored
            </span>
          )}
        </p>
        <span className="flex-1" />
        <span className="text-xs text-subtle">
          {viewed.size} of {changed.length} viewed
        </span>
        <span className="hidden md:inline-flex">
          <Seg
            label="Diff layout"
            value={mode}
            onChange={setMode}
            items={[
              { id: "split", label: "Split" },
              { id: "unified", label: "Unified" },
            ]}
          />
        </span>
      </div>

      <div className="flex gap-4 items-start">
        {/* Only files the candidate touched; untouched starter files are never listed. */}
        <nav aria-label="Files" className="hidden lg:flex flex-col w-56 shrink-0 sticky top-4 rounded-xl border border-border bg-surface py-2 max-h-[70vh] overflow-y-auto">
          {changed.map((f) => (
            <TreeItem key={f.path} f={f} done={viewed.has(f.path)} onClick={() => jump(f.path)} />
          ))}
        </nav>

        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {changed.map((f) => (
            <FileCard
              key={f.path}
              f={f}
              mode={view}
              open={!collapsed.has(f.path)}
              onToggle={() => setCollapsed((s) => toggle(s, f.path))}
              viewed={viewed.has(f.path)}
              onViewed={() => {
                const was = viewed.has(f.path);
                setViewed((s) => toggle(s, f.path));
                setCollapsed((s) => (was ? (s.has(f.path) ? toggle(s, f.path) : s) : s.has(f.path) ? s : toggle(s, f.path)));
              }}
            />
          ))}
        </div>
      </div>
        </>
      )}
    </div>
  );
}

/** Files the candidate edited, added or deleted, plus how many starter files they left alone. */
function buildEntries(round: ReportRound | undefined): { changed: FileEntry[]; untouched: number } {
  if (!round?.diffs) return { changed: [], untouched: 0 };
  const changed: FileEntry[] = [];
  for (const d of round.diffs) {
    if (!(d.added.length || d.removed.length || d.isNew || d.isDeleted)) continue;
    const before = d.isNew ? undefined : round.starter[d.path];
    const after = d.isDeleted ? undefined : round.files[d.path];
    const v = buildFileView(before, after);
    // Only trailing whitespace changed: nothing worth showing.
    if (!v.added && !v.removed && !d.isNew && !d.isDeleted) continue;
    const lang = hljsForPath(d.path);
    changed.push({
      path: d.path,
      status: d.isNew ? "added" : d.isDeleted ? "deleted" : "modified",
      ...v,
      oldHtml: highlightLines(before ?? "", lang),
      newHtml: highlightLines(after ?? "", lang),
    });
  }
  changed.sort((a, b) => a.path.localeCompare(b.path));
  const touched = new Set(changed.map((f) => f.path));
  const untouched = Object.keys(round.starter).filter((p) => !touched.has(p) && !/(^|\/)package(-lock)?\.json$/.test(p)).length;
  return { changed, untouched };
}

function anchor(path: string) {
  return `diff-${path.replace(/[^\w-]/g, "_")}`;
}

function hljsForPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  if (["ts", "tsx", "mts"].includes(ext)) return "typescript";
  if (["js", "jsx", "mjs", "cjs", "json"].includes(ext)) return "javascript";
  if (ext === "css" || ext === "scss") return "css";
  if (["html", "vue", "svelte", "xml", "svg"].includes(ext)) return "xml";
  if (ext === "py") return "python";
  if (ext === "go") return "go";
  if (ext === "java") return "java";
  if (["c", "cc", "cpp", "h", "hpp"].includes(ext)) return "cpp";
  if (ext === "rs") return "rust";
  if (ext === "sql") return "sql";
  return "plaintext";
}

/** Highlight a whole file once, then split per line with balanced spans. */
function highlightLines(code: string, lang: string): string[] {
  const html = highlight(code.replace(/\r\n/g, "\n"), lang);
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

function useWide() {
  const [wide, setWide] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const on = () => setWide(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return wide;
}

function StatusIcon({ status }: { status: FileEntry["status"] }) {
  if (status === "added") return <FilePlus2 className="w-3.5 h-3.5 shrink-0 text-success" aria-label="Added" />;
  if (status === "deleted") return <FileMinus2 className="w-3.5 h-3.5 shrink-0 text-danger" aria-label="Deleted" />;
  if (status === "modified") return <FileDiff className="w-3.5 h-3.5 shrink-0 text-warning" aria-label="Modified" />;
  return <FileCode2 className="w-3.5 h-3.5 shrink-0 text-subtle" aria-hidden />;
}

function TreeItem({ f, done, onClick }: { f: FileEntry; done?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 mx-1.5 px-2 h-8 rounded-md text-left text-[13px] font-mono transition hover:bg-panel ${done ? "text-subtle" : "text-muted hover:text-fg"}`}
    >
      <StatusIcon status={f.status} />
      <span className={`flex-1 truncate ${done ? "line-through" : ""}`}>{shortPath(f.path)}</span>
      {f.status !== "unchanged" && (
        <span className="font-sans text-[11px]">
          <span className="text-success">+{f.added}</span> <span className="text-danger">-{f.removed}</span>
        </span>
      )}
    </button>
  );
}

/** GitHub's five-square diffstat. */
function DiffStat({ added, removed }: { added: number; removed: number }) {
  const total = added + removed;
  const blocks = Math.min(5, total);
  const green = total ? Math.round((added / total) * blocks) : 0;
  const red = blocks - green;
  return (
    <span className="inline-flex gap-[2px]" aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={`w-2 h-2 rounded-[2px] ${i < green ? "bg-success" : i < green + red ? "bg-danger" : "bg-border-strong"}`} />
      ))}
    </span>
  );
}

function FileCard({
  f,
  mode,
  open,
  onToggle,
  viewed,
  onViewed,
}: {
  f: FileEntry;
  mode: Mode;
  open: boolean;
  onToggle: () => void;
  viewed?: boolean;
  onViewed?: () => void;
}) {
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());
  const rows = useMemo(() => {
    // Expanding a hunk swaps its header for the lines it was hiding.
    const out: DiffRow[] = [];
    f.rows.forEach((r, i) => {
      if (r.type === "hunk" && expanded.has(i)) out.push(...r.hidden.map((line): DiffRow => ({ type: "line", line })));
      else out.push(r);
    });
    return out;
  }, [f.rows, expanded]);
  const expand = (hunkRow: DiffRow) => {
    const i = f.rows.indexOf(hunkRow);
    if (i >= 0) setExpanded((s) => new Set(s).add(i));
  };

  return (
    <section id={anchor(f.path)} className="rounded-xl border border-border bg-bg overflow-hidden scroll-mt-4">
      <header className={`flex flex-wrap items-center gap-x-3 gap-y-1 px-3 min-h-11 py-1.5 bg-surface ${open ? "border-b border-border" : ""}`}>
        <button type="button" onClick={onToggle} aria-expanded={open} aria-label={open ? "Collapse file" : "Expand file"} className="w-6 h-6 inline-flex items-center justify-center rounded text-muted hover:text-fg hover:bg-panel">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        {f.status !== "unchanged" && (
          <span className="inline-flex items-center gap-2 text-xs font-mono">
            <span className="text-success">+{f.added}</span>
            <span className="text-danger">-{f.removed}</span>
            <DiffStat added={f.added} removed={f.removed} />
          </span>
        )}
        <span className="font-mono text-[13px] text-fg truncate min-w-0">{shortPath(f.path)}</span>
        {f.status === "added" && <span className="text-[11px] px-1.5 rounded-full border border-success/40 text-success">New file</span>}
        {f.status === "deleted" && <span className="text-[11px] px-1.5 rounded-full border border-danger/40 text-danger">Deleted</span>}
        <span className="flex-1" />
        {onViewed && (
          <label className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border text-xs cursor-pointer select-none ${viewed ? "border-secondary/40 bg-secondary/10 text-fg" : "border-border-strong text-muted hover:text-fg"}`}>
            <input type="checkbox" checked={!!viewed} onChange={onViewed} className="accent-secondary w-3.5 h-3.5" />
            Viewed
          </label>
        )}
      </header>
      {open && (
        <div className="overflow-x-auto">
          {f.status === "deleted" && f.rows.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted">This file was empty.</p>
          ) : mode === "split" ? (
            <SplitTable f={f} rows={rows} onExpand={expand} />
          ) : (
            <UnifiedTable f={f} rows={rows} onExpand={expand} />
          )}
        </div>
      )}
    </section>
  );
}

/** Show code as typed: no "=>" arrows or "@@" glyphs from the mono font. */
const NO_LIGATURES = { fontVariantLigatures: "none", fontFeatureSettings: '"liga" 0, "calt" 0' } as const;
const TABLE = "w-full border-collapse table-fixed font-mono text-[12px] leading-5";
const NUM = "px-1.5 sm:px-2 text-right align-top text-subtle select-none tabular-nums";
const CODE = "relative pl-6 pr-3 align-top whitespace-pre-wrap [overflow-wrap:anywhere] text-fg";

function lineHtml(f: FileEntry, l: DiffLine): string {
  if (l.kind === "del") return markRanges(f.oldHtml[l.oldNo - 1] ?? "", l.words, C.delWord);
  if (l.kind === "add") return markRanges(f.newHtml[l.newNo - 1] ?? "", l.words, C.addWord);
  return f.newHtml[l.newNo - 1] ?? "";
}

function HunkRow({ row, span, numCols, onExpand }: { row: Extract<DiffRow, { type: "hunk" }>; span: number; numCols: number; onExpand: (r: DiffRow) => void }) {
  if (!row.header && !row.hidden.length) return null;
  const canExpand = row.hidden.length > 0;
  return (
    <tr className={C.hunk}>
      <td colSpan={numCols} className={`${C.hunkNum} p-0 align-middle`}>
        {canExpand && (
          <button
            type="button"
            onClick={() => onExpand(row)}
            title={`Show ${plural(row.hidden.length, "hidden line")}`}
            aria-label={`Show ${plural(row.hidden.length, "hidden line")}`}
            className="w-full h-8 inline-flex items-center justify-center text-muted hover:text-fg hover:bg-[rgba(56,139,253,0.3)]"
          >
            <UnfoldVertical className="w-3.5 h-3.5" />
          </button>
        )}
      </td>
      <td colSpan={span - numCols} className="px-3 h-8 text-subtle">
        {row.header ? row.header.replace(/@@/g, "@\u200c@") : `${plural(row.hidden.length, "unchanged line")} below`}
      </td>
    </tr>
  );
}

function UnifiedTable({ f, rows, onExpand }: { f: FileEntry; rows: DiffRow[]; onExpand: (r: DiffRow) => void }) {
  return (
    <table className={TABLE} style={NO_LIGATURES}>
      <colgroup>
        <col className="w-9 sm:w-12" />
        <col className="w-9 sm:w-12" />
        <col />
      </colgroup>
      <tbody>
        {rows.map((r, i) => {
          if (r.type === "hunk") return <HunkRow key={i} row={r} span={3} numCols={2} onExpand={onExpand} />;
          const l = r.line;
          const line = l.kind === "add" ? C.addLine : l.kind === "del" ? C.delLine : "";
          const num = l.kind === "add" ? C.addNum : l.kind === "del" ? C.delNum : "";
          const sign = l.kind === "add" ? "+" : l.kind === "del" ? "-" : " ";
          return (
            <tr key={i} className={line}>
              <td className={`${NUM} ${num}`}>{l.kind !== "add" ? l.oldNo : ""}</td>
              <td className={`${NUM} ${num}`}>{l.kind !== "del" ? l.newNo : ""}</td>
              <td className={CODE}>
                <span aria-hidden className="absolute left-2 select-none text-subtle">
                  {sign}
                </span>
                <span dangerouslySetInnerHTML={{ __html: lineHtml(f, l) || " " }} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function SplitTable({ f, rows, onExpand }: { f: FileEntry; rows: DiffRow[]; onExpand: (r: DiffRow) => void }) {
  const split = useMemo(() => toSplitRows(rows), [rows]);
  const cell = (l: DiffLine | null, side: "left" | "right") => {
    if (!l) {
      return (
        <>
          <td className={`${NUM} ${C.empty}`} />
          <td className={`${C.empty} ${side === "left" ? "border-r border-border" : ""}`} />
        </>
      );
    }
    const changed = l.kind !== "context";
    const line = l.kind === "add" ? C.addLine : l.kind === "del" ? C.delLine : "";
    const num = l.kind === "add" ? C.addNum : l.kind === "del" ? C.delNum : "";
    const no = side === "left" ? (l.kind === "add" ? "" : l.oldNo) : l.kind === "del" ? "" : l.newNo;
    const html = l.kind === "context" && side === "left" ? f.oldHtml[l.oldNo - 1] ?? "" : lineHtml(f, l);
    return (
      <>
        <td className={`${NUM} ${num}`}>{no}</td>
        <td className={`${CODE} ${line} ${side === "left" ? "border-r border-border" : ""}`}>
          {changed && (
            <span aria-hidden className="absolute left-2 select-none text-subtle">
              {l.kind === "add" ? "+" : "-"}
            </span>
          )}
          <span dangerouslySetInnerHTML={{ __html: html || " " }} />
        </td>
      </>
    );
  };
  return (
    <table className={TABLE} style={NO_LIGATURES}>
      <colgroup>
        <col className="w-9 sm:w-12" />
        <col />
        <col className="w-9 sm:w-12" />
        <col />
      </colgroup>
      <tbody>
        {split.map((r, i) =>
          r.type === "hunk" ? (
            <HunkRow key={i} row={rows[r.index] as Extract<DiffRow, { type: "hunk" }>} span={4} numCols={1} onExpand={onExpand} />
          ) : (
            <tr key={i}>
              {cell(r.left, "left")}
              {cell(r.right, "right")}
            </tr>
          ),
        )}
      </tbody>
    </table>
  );
}
