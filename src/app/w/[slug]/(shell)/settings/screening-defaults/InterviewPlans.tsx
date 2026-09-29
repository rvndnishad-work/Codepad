"use client";

/**
 * Settings > Screening defaults > Interview plans. Every plan in the
 * workspace, the default plan for each kind of role, and a place to make
 * or edit plans outside a batch. Defaults save at once (owners and admins);
 * plans save from their own editor (anyone who can edit candidates).
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { SettingRow, SettingsCard, Select } from "../_components/form";
import { Btn, useToasts } from "../../candidates/_components/ui";
import { PlanEditor, RoundTile, TemplatePicker, draftFromTemplate, type Draft } from "../../candidates/_components/PlanEditor";
import { setDefaultPlanAction } from "../../candidates/plan-actions";
import type { PlanView } from "@/lib/interview/plans-server";
import { ROLE_TYPE_LABELS, roleTypesFor, type HiringType, type RoleType } from "@/lib/interview/rounds";

export default function InterviewPlans({
  slug,
  plans,
  hiringType,
  canEdit,
  canWrite,
}: {
  slug: string;
  plans: PlanView[];
  hiringType: HiringType;
  /** Owners and admins: may change the defaults. */
  canEdit: boolean;
  /** May make and edit plans (candidate:write). */
  canWrite: boolean;
}) {
  const router = useRouter();
  const [toasts, toast] = useToasts();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState<string | null>(null);
  const [creating, setCreating] = useState<"pick" | { draft: Draft; templateKey: string | null } | null>(null);
  const roles = roleTypesFor(hiringType);
  const shown = plans.filter((p) => roles.includes(p.roleType));
  const hidden = plans.length - shown.length;

  function setDefault(role: RoleType, planId: string) {
    startTransition(async () => {
      const res = await setDefaultPlanAction(slug, role, planId || null);
      if (!res.ok) return toast(res.error, "error");
      toast(planId ? "Default plan saved." : "Default plan cleared.");
      router.refresh();
    });
  }

  return (
    <SettingsCard
      id="plans"
      title="Interview plans"
      description={
        hiringType === "both"
          ? "The rounds candidates go through. Each batch picks a plan on its Rounds tab; the defaults are offered first when a batch has none."
          : "The rounds candidates go through. Each batch can pick a plan on its Rounds tab. Candidates whose batch has no plan follow the default."
      }
      aside={
        canWrite && !creating ? (
          <Btn icon={Plus} onClick={() => setCreating("pick")}>
            New plan
          </Btn>
        ) : undefined
      }
    >
      {roles.map((role) => {
        const options = shown.filter((p) => p.roleType === role);
        const current = options.find((p) => p.isDefault)?.id ?? "";
        return (
          <SettingRow
            key={role}
            label={roles.length > 1 ? `Default for ${ROLE_TYPE_LABELS[role].toLowerCase()} roles` : "Default plan"}
            help={options.length ? undefined : "Make a plan first, here or on a batch."}
            badge={canEdit ? undefined : "Owners and admins"}
          >
            <Select
              label={`Default plan for ${ROLE_TYPE_LABELS[role].toLowerCase()} roles`}
              value={current}
              disabled={!canEdit || pending || !options.length}
              onChange={(v) => setDefault(role, v)}
              options={[{ value: "", label: "No default" }, ...options.map((p) => ({ value: p.id, label: p.name }))]}
            />
          </SettingRow>
        );
      })}

      {creating && (
        <div className="px-5 py-4">
          {creating === "pick" ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium text-fg">Start from a template</div>
                <Btn variant="quiet" onClick={() => setCreating(null)}>
                  Cancel
                </Btn>
              </div>
              <TemplatePicker hiringType={hiringType} onPick={(t, role, early) => setCreating({ draft: draftFromTemplate(t, role, t ? t.name : "New plan", early), templateKey: t?.key ?? null })} />
            </div>
          ) : (
            <PlanEditor
              slug={slug}
              plan={null}
              initial={creating.draft}
              templateKey={creating.templateKey}
              hiringType={hiringType}
              canEdit={canWrite}
              onCancel={() => setCreating(null)}
              onSaved={(p) => {
                setCreating(null);
                setOpen(p.id);
                toast("Plan created.");
                router.refresh();
              }}
            />
          )}
        </div>
      )}

      {shown.length === 0 && !creating ? (
        <p className="px-5 py-4 text-sm text-muted">No plans yet. Make one here, or from a batch on its Rounds tab.</p>
      ) : (
        shown.map((p) => (
          <div key={p.id} className="px-5 py-3.5">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="min-w-0 flex-1 basis-[240px]">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium text-fg truncate">{p.name}</span>
                  {p.isDefault && <span className="inline-flex items-center h-5 px-1.5 rounded text-[11px] font-medium bg-panel text-muted border border-border">Default</span>}
                  {roles.length > 1 && <span className="text-xs text-subtle">{ROLE_TYPE_LABELS[p.roleType]}</span>}
                </div>
                <div className="text-xs text-muted mt-0.5 truncate">
                  {[
                    p.rounds.map((r) => r.name).join(", ") || "No rounds",
                    p.batches.length ? `${p.batches.length === 1 ? p.batches[0].name : `${p.batches.length} batches`}` : "No batch",
                    `${p.candidateCount} ${p.candidateCount === 1 ? "candidate" : "candidates"}`,
                  ].join(" · ")}
                </div>
              </div>
              <div className="flex items-center gap-1" aria-hidden>
                {p.rounds.map((r) => (
                  <RoundTile key={r.id} kind={r.kind} format={r.format} size={22} />
                ))}
              </div>
              <Btn onClick={() => setOpen(open === p.id ? null : p.id)} aria-expanded={open === p.id}>
                {open === p.id ? "Close" : canWrite ? "Edit" : "View"}
              </Btn>
            </div>
            {open === p.id && (
              <div className="mt-3">
                <PlanEditor
                  key={`${p.id}-${p.updatedAt}`}
                  slug={slug}
                  plan={p}
                  hiringType={hiringType}
                  canEdit={canWrite}
                  onSaved={() => {
                    toast("Plan saved.");
                    router.refresh();
                  }}
                />
              </div>
            )}
          </div>
        ))
      )}
      {hidden > 0 && (
        <p className="px-5 py-3 text-xs text-subtle">
          {hidden} {hidden === 1 ? "plan is" : "plans are"} for {hiringType === "technical" ? "non-technical" : "technical"} roles and hidden, since this workspace hires for{" "}
          {hiringType === "technical" ? "technical" : "non-technical"} roles. Change it in Settings, General.
        </p>
      )}
      {toasts}
    </SettingsCard>
  );
}
