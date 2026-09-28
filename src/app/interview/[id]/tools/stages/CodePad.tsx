"use client";

/**
 * Code editor: the interviewer picks a stack from the playable playgrounds,
 * then both sides type in a shared Monaco editor with the stack's output
 * beside it (a Run button and program output for server languages, the live
 * preview and console for browser stacks). The editor and bundler load only
 * once a stack is picked.
 */
import dynamic from "next/dynamic";
import { useState } from "react";
import { Loader2, Repeat2, Code2 } from "lucide-react";
import { templatesById } from "@/lib/templates";
import { TemplateLogo, templateIcon } from "@/lib/icons";
import { CODE_STACK_GROUPS, codeOutputFor, type CodeOutput } from "@/lib/interview/code-stacks";
import SharedEditor from "../SharedEditor";
import type { ToolProps } from "../types";

const CodeWorkspace = dynamic(() => import("./CodeWorkspace"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center gap-2 text-[13px] text-muted">
      <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> Loading the editor
    </div>
  ),
});

const OUTPUT_LABEL: Record<CodeOutput, string> = { run: "Run and output", console: "Console", both: "Preview and console" };

function StackLogo({ id, size }: { id: string; size: number }) {
  const color = templateIcon[id]?.color ?? templatesById[id]?.accent;
  return (
    <span className="relative shrink-0 flex items-center justify-center rounded-xl" style={{ width: size, height: size, color }} aria-hidden>
      <span className="absolute inset-0 rounded-xl opacity-[0.16]" style={{ background: color }} />
      <TemplateLogo id={id} size={Math.round(size * 0.55)} className="relative" />
    </span>
  );
}

/** Header: which stack is on, and a way back to the cards for the interviewer. */
export function CodeStackHeader({ state, isInterviewer, readOnly, run }: ToolProps) {
  const t = state.codeStack ? templatesById[state.codeStack] : null;
  if (!t) return null;
  return (
    <div className="flex items-center gap-2">
      <span className="hidden sm:inline-flex items-center gap-2 h-8 pl-1 pr-2.5 rounded-lg bg-panel ring-1 ring-inset ring-border text-[12.5px] font-medium">
        <StackLogo id={t.id} size={24} />
        {t.title}
      </span>
      {isInterviewer && !readOnly && (
        <button
          type="button"
          onClick={() => void run({ type: "code", stack: null })}
          title="Pick another stack. The code written so far is kept."
          className="h-8 px-2.5 rounded-lg text-[12.5px] font-medium inline-flex items-center gap-1.5 text-fg hover:bg-panel"
        >
          <Repeat2 className="w-3.5 h-3.5" aria-hidden />
          <span>
            Change<span className="hidden md:inline"> stack</span>
          </span>
        </button>
      )}
    </div>
  );
}

function StackPicker({ onPick, busy }: { onPick: (id: string) => void; busy: string | null }) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <h3 className="text-[18px] font-semibold tracking-tight">Pick a stack</h3>
        <p className="mt-1 text-[13.5px] text-muted">The candidate gets the same editor with starter code. You can switch later; the code written in each stack is kept.</p>
        {CODE_STACK_GROUPS.map((g) => (
          <section key={g.key} aria-label={g.label} className="mt-6">
            <h4 className="text-[12.5px] font-medium text-muted">{g.label}</h4>
            <ul className="mt-2 grid gap-2 grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
              {g.ids.map((id) => {
                const t = templatesById[id];
                if (!t) return null;
                const out = codeOutputFor(id);
                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => onPick(id)}
                      disabled={!!busy}
                      className="group w-full h-full text-left rounded-xl border border-border bg-surface p-3 flex items-center gap-3 transition hover:border-accent-4/50 hover:bg-accent-4/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-4/60 disabled:opacity-60"
                    >
                      <StackLogo id={id} size={40} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] font-semibold truncate">{t.title}</span>
                        <span className="mt-0.5 flex items-center gap-1.5 text-[12px] text-subtle">
                          <span className={`w-1.5 h-1.5 rounded-full ${out === "run" ? "bg-secondary" : "bg-success"}`} aria-hidden />
                          {OUTPUT_LABEL[out]}
                        </span>
                      </span>
                      {busy === id && <Loader2 className="w-4 h-4 animate-spin text-muted" aria-hidden />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

export default function CodePad(props: ToolProps) {
  const { room, state, isInterviewer, readOnly, dark, run } = props;
  const [busy, setBusy] = useState<string | null>(null);
  const stack = state.codeStack && templatesById[state.codeStack] ? state.codeStack : null;

  if (stack) return <CodeWorkspace key={stack} {...props} stack={stack} />;

  // Interviews from before stacks had one plain text pad; show it once ended.
  const legacy = room.doc.getText("code");
  if (readOnly) {
    return legacy.length ? (
      <SharedEditor text={legacy} awareness={null} language="text" dark={dark} readOnly label="Code pad" placeholder="" />
    ) : (
      <Empty title="No code was written" body="No stack was picked in this interview." />
    );
  }
  if (isInterviewer) {
    return (
      <StackPicker
        busy={busy}
        onPick={async (id) => {
          setBusy(id);
          await run({ type: "code", stack: id });
          setBusy(null);
        }}
      />
    );
  }
  return <Empty title="Your interviewer is picking a language" body="The editor opens here with starter code in a moment." pulse />;
}

function Empty({ title, body, pulse }: { title: string; body: string; pulse?: boolean }) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 px-6 text-center">
      <span className={`w-12 h-12 rounded-2xl bg-accent-4/15 text-accent-4 flex items-center justify-center ${pulse ? "animate-pulse" : ""}`}>
        <Code2 className="w-6 h-6" aria-hidden />
      </span>
      <p className="text-[16px] font-semibold">{title}</p>
      <p className="text-[13.5px] text-muted max-w-sm">{body}</p>
    </div>
  );
}
