"use client";

import { useState } from "react";
import { resultClasses } from "@/lib/interview-questions/shared";
import { bulkSetExperienceStatus, deleteExperience, setExperienceStatus } from "../actions";
import ConfirmButton from "../../content/_components/ConfirmButton";
import Pill, { type PillTone } from "../../content/_components/Pill";

export type ExperienceRow = {
  id: string;
  companyName: string | null;
  role: string | null;
  experienceLevel: string | null;
  location: string | null;
  year: number | null;
  result: string | null;
  process: string | null;
  rounds: string | null;
  tips: string | null;
  status: string;
  createdAt: string;
};

const STATUS: Record<string, { tone: PillTone; label: string }> = {
  pending: { tone: "warn", label: "To review" },
  published: { tone: "ok", label: "Published" },
  rejected: { tone: "bad", label: "Rejected" },
};

export default function ExperienceList({ rows, emptyText }: { rows: ExperienceRow[]; emptyText: string }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const ids = [...selected];
  const allOn = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggle = (id: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  const afterBulk = <T,>(p: Promise<T>) => p.then((r) => (setSelected(new Set()), r));

  if (rows.length === 0) {
    return <p className="rounded-xl border border-border bg-surface py-12 text-center text-sm text-muted">{emptyText}</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-4 py-2.5">
        <label className="inline-flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={allOn}
            onChange={(e) => setSelected(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())}
            className="accent-accent"
          />
          {selected.size > 0 ? `${selected.size} selected` : "Select all on this page"}
        </label>
        {selected.size > 0 && (
          <div className="flex flex-wrap items-start gap-2 ml-auto">
            <ConfirmButton
              action={() => afterBulk(bulkSetExperienceStatus(ids, "published"))}
              label={`Publish ${selected.size}`}
            />
            <ConfirmButton
              action={(note) => afterBulk(bulkSetExperienceStatus(ids, "rejected", note))}
              label={`Reject ${selected.size}`}
              confirmLabel="Reject"
              prompt="Authors get this reason in a notification."
              requireNote
              tone="danger"
            />
          </div>
        )}
      </div>

      {rows.map((exp) => {
        const s = STATUS[exp.status] ?? { tone: "off" as const, label: exp.status };
        return (
          <div key={exp.id} className="rounded-xl border border-border bg-surface p-4 space-y-3">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={selected.has(exp.id)}
                onChange={(e) => toggle(exp.id, e.target.checked)}
                className="mt-1 accent-accent"
                aria-label="Select experience"
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-fg">
                  {exp.companyName ? `${exp.companyName} · ` : ""}
                  {exp.role || "Candidate experience"}
                </div>
                <div className="text-xs text-muted mt-0.5">
                  {[exp.experienceLevel, exp.location, exp.year, new Date(exp.createdAt).toLocaleDateString()].filter(Boolean).join(" · ")}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {exp.result && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-md border ${resultClasses(exp.result)}`}>{exp.result}</span>
                )}
                <Pill tone={s.tone}>{s.label}</Pill>
              </div>
            </div>

            <div className="space-y-1.5 pl-7 text-sm text-fg/90 leading-relaxed">
              {exp.process && <p><span className="text-muted">Process: </span>{exp.process}</p>}
              {exp.rounds && <p><span className="text-muted">Rounds: </span>{exp.rounds}</p>}
              {exp.tips && <p><span className="text-muted">Tips: </span>{exp.tips}</p>}
            </div>

            <div className="flex flex-wrap items-start gap-2 pl-7">
              {exp.status !== "published" && (
                <ConfirmButton action={() => setExperienceStatus(exp.id, "published")} label="Publish" />
              )}
              {exp.status !== "rejected" && (
                <ConfirmButton
                  action={(note) => setExperienceStatus(exp.id, "rejected", note)}
                  label="Reject"
                  prompt="The author gets this reason in a notification."
                  requireNote
                  tone="danger"
                />
              )}
              {exp.status !== "pending" && (
                <ConfirmButton action={() => setExperienceStatus(exp.id, "pending")} label="Back to review" />
              )}
              <div className="flex-1" />
              <ConfirmButton
                action={() => deleteExperience(exp.id)}
                label="Delete"
                confirmLabel="Delete for good"
                prompt="Delete this experience permanently?"
                tone="danger"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
