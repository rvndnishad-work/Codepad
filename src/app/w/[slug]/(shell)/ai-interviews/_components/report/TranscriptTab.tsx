"use client";

import { useMemo, useState } from "react";
import { Bot, Search } from "lucide-react";
import type { ReportData } from "@/lib/ai-interview/console-server";
import { plural } from "@/lib/workspace/display";
import { Avatar, inputCls } from "../../../candidates/_components/ui";

/**
 * The whole conversation with the AI interviewer. Newer messages carry the
 * round they were sent in, which shows as a divider when the round changes;
 * older ones read as one continuous thread.
 */
export default function TranscriptTab({ r }: { r: ReportData }) {
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return r.chat.map((m, i) => ({ ...m, i })).filter((m) => !t || m.text.toLowerCase().includes(t));
  }, [r.chat, q]);
  const firstName = r.candidate.name.split(/\s+/)[0] || r.candidate.name;
  const fromCandidate = r.chat.filter((m) => m.role === "user").length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-muted">
          {plural(r.chat.length, "message")}, {fromCandidate} from {firstName}
        </p>
        <label className="relative w-full sm:w-60">
          <span className="sr-only">Search the transcript</span>
          <Search aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-subtle" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the transcript" className={`${inputCls} pl-8`} />
        </label>
      </div>
      <div className="rounded-xl border border-border bg-surface p-4 sm:p-6 flex flex-col gap-5">
        {r.chat.length === 0 ? (
          <p className="text-sm text-muted text-center py-8">
            {r.status === "PENDING" || r.status === "EXPIRED" ? `${firstName} has not started, so there is no conversation yet.` : "No messages were exchanged."}
          </p>
        ) : shown.length === 0 ? (
          <p className="text-sm text-muted text-center py-8">No messages match that search.</p>
        ) : (
          shown.map((m, idx) => {
            const ai = m.role === "assistant";
            const prev = shown[idx - 1];
            const roundIdx = m.roundId ? r.rounds.findIndex((x) => x.id === m.roundId) : -1;
            const divider = r.rounds.length > 1 && roundIdx >= 0 && (!prev || prev.roundId !== m.roundId);
            return (
              <div key={m.i} className="flex flex-col gap-5">
                {divider && (
                  <div className="flex items-center gap-3 text-xs text-subtle" role="separator">
                    <span className="h-px flex-1 bg-border" />
                    Round {roundIdx + 1}: {r.rounds[roundIdx].title}
                    <span className="h-px flex-1 bg-border" />
                  </div>
                )}
              <div className={`flex gap-3 items-start ${ai ? "" : "flex-row-reverse"}`}>
                {ai ? (
                  <span className="w-8 h-8 rounded-full bg-secondary/15 text-secondary-soft inline-flex items-center justify-center shrink-0" aria-hidden>
                    <Bot className="w-4 h-4" />
                  </span>
                ) : (
                  <Avatar name={r.candidate.name} />
                )}
                <div className={`max-w-[85%] sm:max-w-[560px] flex flex-col gap-1 ${ai ? "items-start" : "items-end"}`}>
                  <span className="text-xs text-subtle">{ai ? "AI interviewer" : firstName}</span>
                  <div
                    className={`px-3.5 py-3 rounded-xl text-sm leading-relaxed text-fg whitespace-pre-wrap break-words border ${
                      ai ? "bg-panel border-border" : "bg-secondary/10 border-secondary/30"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
