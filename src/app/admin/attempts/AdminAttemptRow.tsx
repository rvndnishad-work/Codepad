"use client";

import Link from "next/link";
import ConfirmButton from "../content/_components/ConfirmButton";
import Pill, { type PillTone } from "../content/_components/Pill";
import { deleteAttempt } from "./actions";

export type AttemptRowData = {
  id: string;
  status: string;
  durationSec: number | null;
  testPassed: number | null;
  testTotal: number | null;
  startedAt: string;
  sessionId: string | null;
  suspicion: number | null;
  flagged: boolean;
  hasReplay: boolean;
  user: { id: string; name: string | null; email: string | null };
  challenge: { id: string; slug: string; title: string; difficulty: string };
  step: { title: string | null; position: number } | null;
  workspace: { name: string; slug: string } | null;
};

const STATUS: Record<string, { tone: PillTone; label: string }> = {
  passed: { tone: "ok", label: "Passed" },
  failed: { tone: "bad", label: "Failed" },
  in_progress: { tone: "warn", label: "Live" },
  abandoned: { tone: "off", label: "Abandoned" },
};

function formatDuration(sec: number | null): string {
  if (sec == null) return "—";
  if (sec < 60) return `${sec}s`;
  const mins = Math.floor(sec / 60);
  if (mins < 60) return `${mins}m ${sec % 60}s`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export default function AdminAttemptRow({ attempt: a }: { attempt: AttemptRowData }) {
  const s = STATUS[a.status] ?? { tone: "off" as const, label: a.status };
  const tests = a.testTotal ? `${a.testPassed ?? 0}/${a.testTotal}` : "—";

  return (
    <tr className="align-top hover:bg-panel/60">
      <td className="px-4 py-3 min-w-[180px]">
        <Link href={`/admin/users/${a.user.id}`} className="text-fg hover:underline">
          {a.user.name ?? "No name"}
        </Link>
        <div className="text-xs text-muted">{a.user.email}</div>
      </td>
      <td className="px-3 py-3 min-w-[220px]">
        <Link href={`/admin/attempts?challenge=${a.challenge.id}`} className="text-fg hover:underline" title="Only this challenge">
          {a.challenge.title}
        </Link>
        <div className="text-xs text-muted">
          {a.challenge.difficulty}
          {a.step && ` · step ${a.step.position + 1}${a.step.title ? `: ${a.step.title}` : ""}`}
        </div>
        {a.workspace ? (
          <div className="mt-1">
            <Pill tone="info">Workspace: {a.workspace.name}</Pill>
          </div>
        ) : a.sessionId ? (
          <div className="mt-1">
            <Pill tone="info">Interview</Pill>
          </div>
        ) : null}
      </td>
      <td className="px-3 py-3">
        <Pill tone={s.tone}>{s.label}</Pill>
      </td>
      <td className="px-3 py-3 text-right tabular-nums">{tests}</td>
      <td className="px-3 py-3 text-right tabular-nums">
        {a.suspicion === null ? (
          <span className="text-subtle">—</span>
        ) : (
          <Pill tone={a.flagged ? "bad" : a.suspicion >= 30 ? "warn" : "off"}>{Math.round(a.suspicion)}</Pill>
        )}
      </td>
      <td className="px-3 py-3 whitespace-nowrap">
        <div className="tabular-nums">{formatDuration(a.durationSec)}</div>
        <div className="text-xs text-muted">
          {new Date(a.startedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
        </div>
      </td>
      <td className="px-3 py-3 pr-4">
        <div className="flex items-start justify-end gap-1.5 flex-wrap">
          <Link href={`/admin/attempts/${a.id}`} className="inline-flex items-center h-7 px-2.5 rounded-md border border-border text-xs font-medium text-fg hover:bg-panel">
            View
          </Link>
          {a.hasReplay && (
            <Link href={`/admin/attempts/${a.id}/replay`} className="inline-flex items-center h-7 px-2.5 rounded-md border border-border text-xs font-medium text-fg hover:bg-panel">
              Replay
            </Link>
          )}
          <ConfirmButton
            action={deleteAttempt.bind(null, a.id)}
            label="Delete"
            confirmLabel="Delete for good"
            prompt="Delete the submitted code, test results and replay?"
            requireNote
            tone="danger"
          />
        </div>
      </td>
    </tr>
  );
}
