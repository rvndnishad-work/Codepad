"use client";

/**
 * The candidate's own copy of their interview plan: every round in order,
 * where it stands, and skip, bring back or add a round for this person only.
 * A fuller timeline with next steps comes with the Candidates tab work; this
 * is the per-person editing that plans need from day one.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Btn, inputCls, Menu, MenuItem } from "../_components/ui";
import { RoundTile } from "../_components/PlanEditor";
import { addRoundAction, removeRoundAction, setRoundSkippedAction } from "../plan-actions";
import { formatLabel, formatsFor, kindName, roundStateLabel, ROUND_NAME_MAX, type PlanRoundKind, type RoleType, type RoundState } from "@/lib/interview/rounds";

export type ProfileRound = {
  id: string;
  kind: PlanRoundKind;
  name: string;
  format: string | null;
  required: boolean;
  skipped: boolean;
  /** Added for this person, not from the plan. */
  manual: boolean;
  /** Has happened (or has a next step), so it cannot be skipped or removed. */
  held: boolean;
  state: RoundState;
  number: number | null;
};

const TONE: Partial<Record<RoundState, string>> = {
  above_bar: "text-success",
  below_bar: "text-warning",
  did_not_finish: "text-danger",
  awaiting_review: "text-secondary-soft",
};

/** The kind or format under the name, left out when the name already says it. */
function kindText(r: ProfileRound, role: RoleType): string | null {
  const text = r.kind === "interview" ? (r.format ? formatLabel(r.format, role) : null) : kindName(r.kind, role);
  return text && text.toLowerCase() !== r.name.toLowerCase() ? text : null;
}

export default function RoundsCard({
  slug,
  candidateId,
  planName,
  roleType,
  rounds,
  canEdit,
  toast,
}: {
  slug: string;
  candidateId: string;
  planName: string | null;
  roleType: RoleType;
  rounds: ProfileRound[];
  canEdit: boolean;
  toast: (text: string, tone?: "ok" | "error") => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [kind, setKind] = useState<PlanRoundKind>("interview");
  const [format, setFormat] = useState<string>(roleType === "technical" ? "coding" : "discussion");
  const [name, setName] = useState("");
  const total = rounds.filter((r) => !r.skipped).length;

  function run(p: Promise<{ ok: boolean; error?: string }>, done: string, after?: () => void) {
    startTransition(async () => {
      const res = await p;
      if (!res.ok) return toast(res.error ?? "Something went wrong.", "error");
      toast(done);
      after?.();
      router.refresh();
    });
  }

  const suggested = kind === "interview" ? formatLabel(format, roleType) : kindName(kind, roleType);

  return (
    <section className="rounded-xl border border-border bg-surface" aria-labelledby="rounds-title">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-border">
        <div className="min-w-0">
          <h2 id="rounds-title" className="text-[15px] font-semibold text-fg">
            Interview rounds
          </h2>
          <p className="text-xs text-subtle mt-0.5">
            {planName ? `${planName} · ${total} ${total === 1 ? "round" : "rounds"}` : rounds.length ? "Rounds so far, not from a plan" : "No plan yet. Give their batch a plan on its Rounds tab."}
          </p>
        </div>
        {canEdit && !adding && (
          <Btn icon={Plus} onClick={() => setAdding(true)}>
            Add a round
          </Btn>
        )}
      </div>

      {rounds.length > 0 && (
        <ol className="divide-y divide-border">
          {rounds.map((r) => (
            <li key={r.id} className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 px-5 py-3 ${r.skipped ? "opacity-60" : ""}`}>
              <span className="w-5 text-xs tabular-nums text-subtle text-right shrink-0">{r.number ?? ""}</span>
              <RoundTile kind={r.kind} format={r.format} size={28} />
              <div className="min-w-0 flex-1 basis-[180px]">
                <div className={`text-sm font-medium text-fg truncate ${r.skipped ? "line-through decoration-subtle" : ""}`}>{r.name}</div>
                <div className="text-xs text-muted">
                  {[kindText(r, roleType), !r.required && "optional", r.manual && "added for this person"].filter(Boolean).join(" · ") || "\u00a0"}
                </div>
              </div>
              <span className={`text-xs font-medium ${TONE[r.state] ?? "text-muted"}`}>{r.skipped ? "Skipped" : roundStateLabel(r.state, r.kind)}</span>
              {canEdit && !r.held && (
                <Menu
                  align="right"
                  width={200}
                  label={`Options for ${r.name}`}
                  trigger={(props) => (
                    <button {...props} type="button" aria-label={`Options for ${r.name}`} className="h-7 px-2 rounded-md text-xs text-muted hover:text-fg hover:bg-panel">
                      Change
                    </button>
                  )}
                >
                  {(close) => (
                    <>
                      <MenuItem
                        disabled={pending}
                        onClick={() => {
                          close();
                          run(setRoundSkippedAction(slug, r.id, !r.skipped), r.skipped ? `${r.name} is back.` : `${r.name} skipped for this candidate.`);
                        }}
                      >
                        {r.skipped ? "Bring back" : "Skip for this candidate"}
                      </MenuItem>
                      {r.manual && (
                        <MenuItem
                          danger
                          disabled={pending}
                          onClick={() => {
                            close();
                            run(removeRoundAction(slug, r.id), `${r.name} removed.`);
                          }}
                        >
                          Remove round
                        </MenuItem>
                      )}
                    </>
                  )}
                </Menu>
              )}
            </li>
          ))}
        </ol>
      )}

      {adding && (
        <form
          className="flex flex-wrap items-end gap-3 px-5 py-4 border-t border-border"
          onSubmit={(e) => {
            e.preventDefault();
            run(addRoundAction(slug, candidateId, { kind, format: kind === "interview" ? format : null, name: name.trim() || suggested }), "Round added for this candidate.", () => {
              setAdding(false);
              setName("");
            });
          }}
        >
          <label className="flex flex-col gap-1 text-xs text-subtle">
            Kind
            <select value={kind} onChange={(e) => setKind(e.target.value as PlanRoundKind)} className={`${inputCls} !w-auto`}>
              <option value="interview">Live interview</option>
              <option value="ai_interview">AI interview</option>
              <option value="take_home">{kindName("take_home", roleType)}</option>
            </select>
          </label>
          {kind === "interview" && (
            <label className="flex flex-col gap-1 text-xs text-subtle">
              Format
              <select value={format} onChange={(e) => setFormat(e.target.value)} className={`${inputCls} !w-auto`}>
                {formatsFor(roleType).map((f) => (
                  <option key={f} value={f}>
                    {formatLabel(f, roleType)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="flex flex-col gap-1 text-xs text-subtle flex-1 min-w-[180px]">
            Name
            <input value={name} maxLength={ROUND_NAME_MAX} placeholder={suggested} onChange={(e) => setName(e.target.value)} className={inputCls} />
          </label>
          <div className="flex gap-2">
            <Btn variant="quiet" onClick={() => setAdding(false)} disabled={pending}>
              Cancel
            </Btn>
            <Btn variant="primary" type="submit" disabled={pending}>
              Add round
            </Btn>
          </div>
        </form>
      )}
    </section>
  );
}
