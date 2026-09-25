"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus, Upload } from "lucide-react";
import type { RosterBatch, RosterMember, RosterRow } from "@/lib/crm/roster";
import { plural } from "@/lib/workspace/display";
import { AddCandidatesDialog } from "./_components/AddCandidatesDialog";
import { CandidatesHeader } from "./_components/CandidatesHeader";
import { CandidatesView, type Perms } from "./_components/CandidatesView";
import { Btn, useToasts } from "./_components/ui";

export default function CandidatesPageClient({
  slug,
  workspaceName,
  meId,
  rows,
  batches,
  members,
  perms,
}: {
  slug: string;
  workspaceName: string;
  meId: string;
  rows: RosterRow[];
  batches: RosterBatch[];
  members: RosterMember[];
  perms: Perms;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [adding, setAdding] = useState<null | "one" | "csv">(sp.get("add") === "1" ? "one" : sp.get("import") === "1" ? "csv" : null);
  const [toasts, toast] = useToasts();
  const view = sp.get("view") === "board" ? "board" : "list";

  const active = rows.filter((r) => r.status !== "archived");
  const openBatches = batches.filter((b) => b.status === "OPEN").length;
  const attention = active.filter((r) => r.attention).length;

  function setView(v: "list" | "board") {
    const p = new URLSearchParams(sp.toString());
    if (v === "board") p.set("view", "board");
    else p.delete("view");
    const qs = p.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  return (
    <div className="flex flex-col gap-5">
      <CandidatesHeader
        slug={slug}
        active="all"
        counts={{ all: active.length, batches: batches.length }}
        summary={
          active.length === 0
            ? `Nobody in ${workspaceName} yet.`
            : `Everyone in ${workspaceName}${openBatches ? ` across ${plural(openBatches, "open batch", "open batches")}` : ""}.${
                attention ? ` ${attention} ${attention === 1 ? "needs" : "need"} your attention.` : ""
              }`
        }
        actions={
          perms.canWrite && (
            <>
              <Btn size="md" icon={Upload} onClick={() => setAdding("csv")}>
                Import
              </Btn>
              <Btn size="md" variant="primary" icon={Plus} onClick={() => setAdding("one")}>
                Add candidates
              </Btn>
            </>
          )
        }
      />
      <CandidatesView
        slug={slug}
        meId={meId}
        rows={rows}
        batches={batches}
        members={members}
        perms={perms}
        view={view}
        onViewChange={setView}
      />
      {adding && (
        <AddCandidatesDialog
          slug={slug}
          batches={batches}
          members={members}
          initialMode={adding}
          onClose={() => setAdding(null)}
          onDone={(msg) => {
            setAdding(null);
            toast(msg);
          }}
        />
      )}
      {toasts}
    </div>
  );
}
