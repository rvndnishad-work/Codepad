"use client";

import { useMemo } from "react";
import { ExternalLink } from "lucide-react";
import type { ReportRound } from "@/lib/ai-interview/console-server";
import { playgroundTarget } from "@/lib/ai-interview/report-extras";
import { playgroundFilesHref } from "@/lib/playground-handoff";

/**
 * Opens the candidate's final code for a round in the playground, in a new
 * tab. The files ride in the URL hash, so they never reach a server log; the
 * playground is a scratch copy, and nothing there changes the screening.
 */
export default function OpenInPlayground({ round, className = "" }: { round: ReportRound; className?: string }) {
  const href = useMemo(() => {
    const t = playgroundTarget(round);
    return t ? playgroundFilesHref(t.files, t.templateId) : null;
  }, [round]);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title="Opens a scratch copy of the final code in a new tab"
      className={`inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-medium whitespace-nowrap border border-border bg-surface text-fg hover:bg-panel hover:border-border-strong transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/60 ${className}`}
    >
      <ExternalLink className="w-3.5 h-3.5 text-muted" strokeWidth={1.75} aria-hidden />
      Open in Playground
    </a>
  );
}
