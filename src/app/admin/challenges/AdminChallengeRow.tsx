"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Edit3, ExternalLink } from "lucide-react";
import { BulkRowCheckbox } from "./ChallengesBulkTable";
import Pill from "../content/_components/Pill";

export type AdminChallengeRowData = {
  id: string;
  slug: string;
  title: string;
  difficulty: string;
  category: string | null;
  published: boolean;
  premium: boolean;
  featured: boolean;
  attempts: number;
  takeHomes: number;
  archivedAt: string | null;
  scheduledAt: string | null;
  updatedAt: string;
};

const DIFFICULTY_TONE = { easy: "ok", medium: "warn", hard: "bad" } as const;

export default function AdminChallengeRow({ challenge: c }: { challenge: AdminChallengeRowData }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<"archive" | "delete" | null>(null);
  const hasHistory = c.attempts > 0 || c.takeHomes > 0;

  async function call(init: RequestInit, done: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/challenges/${c.id}`, { ...init, cache: "no-store" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      toast.success(done);
      setConfirm(null);
      router.refresh();
    } catch (err) {
      toast.error("Update failed", { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  }
  const patch = (body: object, done: string) =>
    call({ method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }, done);

  const status = c.archivedAt ? (
    <Pill tone="off">Archived</Pill>
  ) : c.published ? (
    <Pill tone="ok">Published</Pill>
  ) : c.scheduledAt ? (
    <Pill tone="info" title={new Date(c.scheduledAt).toLocaleString()}>
      Scheduled {new Date(c.scheduledAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
    </Pill>
  ) : (
    <Pill tone="off">Draft</Pill>
  );

  return (
    <tr className="hover:bg-panel/60 align-middle">
      <td className="pl-4 pr-2 py-3 w-8">
        <BulkRowCheckbox id={c.id} />
      </td>
      <td className="px-3 py-3 min-w-[220px]">
        <Link href={`/admin/challenges/${c.id}/edit`} className="font-medium text-fg hover:underline">
          {c.title}
        </Link>
        <div className="text-xs text-muted font-mono">{c.slug}</div>
      </td>
      <td className="px-3 py-3">
        <Pill tone={DIFFICULTY_TONE[c.difficulty as keyof typeof DIFFICULTY_TONE] ?? "off"}>{c.difficulty}</Pill>
      </td>
      <td className="px-3 py-3 text-muted hidden lg:table-cell">{c.category ?? "—"}</td>
      <td className="px-3 py-3 text-right tabular-nums">{c.attempts.toLocaleString()}</td>
      <td className="px-3 py-3">
        <button
          type="button"
          onClick={() => patch({ premium: !c.premium }, c.premium ? "Marked free" : "Marked premium")}
          disabled={busy}
          title="Click to switch"
          className="disabled:opacity-50"
        >
          <Pill tone={c.premium ? "warn" : "off"}>{c.premium ? "Premium" : "Free"}</Pill>
        </button>
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-1.5">
          {status}
          {c.featured && <Pill tone="info">Featured</Pill>}
        </div>
      </td>
      <td className="px-3 py-3 pr-4">
        <div className="flex items-center justify-end gap-1.5 flex-wrap">
          {confirm ? (
            <>
              <span className="text-xs text-muted max-w-[220px]">
                {confirm === "archive"
                  ? "Hide it everywhere and keep its attempts?"
                  : "Delete for good? It has no attempts."}
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  confirm === "archive"
                    ? patch({ archived: true }, "Archived")
                    : call({ method: "DELETE" }, "Deleted")
                }
                className="h-7 px-2.5 rounded-md border border-danger/30 text-danger text-xs font-medium hover:bg-danger/[0.08] disabled:opacity-50"
              >
                {confirm === "archive" ? "Archive" : "Delete"}
              </button>
              <button type="button" onClick={() => setConfirm(null)} className="h-7 px-2 text-xs text-muted hover:text-fg">
                Cancel
              </button>
            </>
          ) : (
            <>
              {c.archivedAt ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => patch({ archived: false }, "Restored as a draft")}
                  className="h-7 px-2.5 rounded-md border border-border text-xs font-medium hover:bg-panel disabled:opacity-50"
                >
                  Restore
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => patch({ published: !c.published }, c.published ? "Unpublished" : "Published")}
                  className="h-7 px-2.5 rounded-md border border-border text-xs font-medium hover:bg-panel disabled:opacity-50"
                >
                  {c.published ? "Unpublish" : "Publish"}
                </button>
              )}
              {!c.archivedAt && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirm("archive")}
                  className="h-7 px-2.5 rounded-md border border-border text-xs font-medium hover:bg-panel disabled:opacity-50"
                >
                  Archive
                </button>
              )}
              {!hasHistory && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirm("delete")}
                  className="h-7 px-2.5 rounded-md border border-danger/30 text-danger text-xs font-medium hover:bg-danger/[0.08] disabled:opacity-50"
                >
                  Delete
                </button>
              )}
              <Link
                href={`/challenges/${c.slug}`}
                target="_blank"
                className="p-1.5 rounded-md text-muted hover:text-fg hover:bg-panel"
                title="View public page"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
              <Link
                href={`/admin/challenges/${c.id}/edit`}
                className="p-1.5 rounded-md text-muted hover:text-fg hover:bg-panel"
                title="Edit"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </Link>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}
