"use client";

import { useMemo, useState } from "react";
import { DiffEditor } from "@monaco-editor/react";
import type { ReportRound } from "@/lib/ai-interview/console-server";
import { languageFor } from "@/lib/monaco-langs";
import { plural } from "@/lib/workspace/display";
import { EDITOR_THEME, FileSelect, FileTab, FilesPane, IdeFrame, READ_ONLY_OPTIONS, ReadOnlyTag, Seg, beforeMount } from "./ide";

/**
 * Starter code beside the candidate's code, per file, in Monaco's diff view.
 * Changed files come first; untouched starter files stay one click away.
 */
export default function CodeTab({ round }: { round: ReportRound | undefined }) {
  const [mode, setMode] = useState<"split" | "inline">("split");

  const { changed, unchanged, stat } = useMemo(() => {
    const diffs = round?.diffs ?? [];
    const byPath = new Map(diffs.map((d) => [d.path, d]));
    const changed = diffs.filter((d) => d.added.length || d.removed.length || d.isNew || d.isDeleted).map((d) => d.path);
    const all = [...new Set([...Object.keys(round?.starter ?? {}), ...Object.keys(round?.files ?? {})])].sort();
    const unchanged = all.filter((p) => !changed.includes(p));
    const stat = (p: string) => {
      const d = byPath.get(p);
      if (!d) return null;
      if (d.isNew) return { text: "new", cls: "text-success" };
      if (d.isDeleted) return { text: "deleted", cls: "text-danger" };
      return { text: `+${d.added.length} -${d.removed.length}`, cls: "text-success" };
    };
    return { changed, unchanged, stat };
  }, [round]);

  const [active, setActive] = useState<string>(() => changed[0] ?? unchanged.find((p) => !/package\.json$|index\.html$/.test(p)) ?? unchanged[0] ?? "");

  if (!round) return null;
  if (!round.diffs) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-muted">
        {Object.keys(round.files).length && round.status !== "PENDING"
          ? "The starter code for this round was not recorded, so changes cannot be shown. The Run the code tab shows the final code."
          : "Nothing was submitted for this round yet."}
      </div>
    );
  }

  const s = stat(active);
  const stats = round.stats;
  return (
    <IdeFrame
      toolbar={
        <>
          <FileSelect files={[...changed, ...unchanged]} active={active} onPick={setActive} />
          <span className="hidden sm:inline-flex">{active && <FileTab path={active} />}</span>
          {s && <span className={`text-xs ${s.cls}`}>{s.text}</span>}
          <span className="flex-1" />
          <span className="hidden md:inline-flex">
            <Seg
              label="Diff layout"
              value={mode}
              onChange={setMode}
              items={[
                { id: "split", label: "Side by side" },
                { id: "inline", label: "Inline" },
              ]}
            />
          </span>
          <ReadOnlyTag />
        </>
      }
      status={
        <>
          <span>{round.label}</span>
          {stats && (
            <span>
              {plural(stats.filesChanged, "file")} changed, {plural(round.linesWritten ?? 0, "line")} written
            </span>
          )}
          <span className="flex-1" />
          <span>Only lines the candidate wrote are scored</span>
        </>
      }
    >
      <FilesPane
        active={active}
        onPick={setActive}
        groups={[
          {
            label: "Changed",
            files: changed.map((p) => {
              const x = stat(p);
              return { path: p, badge: x && <span className={`font-sans text-xs ${x.cls}`}>{x.text}</span> };
            }),
          },
          { label: "Starter, unchanged", files: unchanged.map((p) => ({ path: p })) },
        ]}
      />
      <div className="flex-1 min-w-0 flex flex-col bg-bg">
        <div className="hidden md:flex h-7 border-b border-border text-xs text-subtle shrink-0">
          {mode === "split" ? (
            <>
              <span className="w-1/2 px-3.5 leading-7 border-r border-border">Starter code</span>
              <span className="w-1/2 px-3.5 leading-7">Candidate code</span>
            </>
          ) : (
            <span className="px-3.5 leading-7">Starter code with the candidate changes</span>
          )}
        </div>
        <div className="flex-1 min-h-0">
          <DiffEditor
            key={active}
            original={round.starter[active] ?? ""}
            modified={round.files[active] ?? ""}
            language={languageFor(active)}
            theme={EDITOR_THEME}
            beforeMount={beforeMount}
            options={{ ...READ_ONLY_OPTIONS, renderSideBySide: mode === "split", originalEditable: false, enableSplitViewResizing: false }}
            loading={<div className="h-full bg-bg" />}
          />
        </div>
      </div>
    </IdeFrame>
  );
}
