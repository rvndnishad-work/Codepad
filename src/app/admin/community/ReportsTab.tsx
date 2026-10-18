import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import Pagination from "../Pagination";
import Pill, { type PillTone } from "../content/_components/Pill";
import ConfirmButton from "../content/_components/ConfirmButton";
import { CAN_HIDE, TARGET_LABEL, TARGET_TYPES, isTargetType, loadTargets, previewFor } from "./_lib/targets";
import { reopenReport, resolveReport } from "./actions";
import { REPORT_REASONS } from "@/app/api/reports/reasons";
import type { CommunitySearch } from "./page";

const PAGE_SIZE = 20;
const STATUSES: { id: string; label: string; tone: PillTone }[] = [
  { id: "open", label: "Open", tone: "warn" },
  { id: "hidden", label: "Hidden", tone: "off" },
  { id: "deleted", label: "Deleted", tone: "bad" },
  { id: "dismissed", label: "Dismissed", tone: "off" },
];

export default async function ReportsTab({ sp }: { sp: CommunitySearch }) {
  const status = STATUSES.some((s) => s.id === sp.status) ? sp.status! : "open";
  const type = isTargetType(sp.type) ? sp.type : "";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const where: Prisma.ContentReportWhereInput = { status, ...(type ? { targetType: type } : {}) };

  const [total, reports, byStatus] = await Promise.all([
    prisma.contentReport.count({ where }),
    prisma.contentReport.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.contentReport.groupBy({ by: ["status"], where: type ? { targetType: type } : {}, _count: { _all: true } }),
  ]);

  const reporterIds = [...new Set(reports.map((r) => r.reporterId).filter((x): x is string => !!x))];
  const resolverIds = [...new Set(reports.map((r) => r.resolvedById).filter((x): x is string => !!x))];
  const [previews, people, perTarget] = await Promise.all([
    loadTargets(reports),
    reporterIds.length || resolverIds.length
      ? prisma.user.findMany({ where: { id: { in: [...reporterIds, ...resolverIds] } }, select: { id: true, name: true, email: true } })
      : [],
    reports.length
      ? prisma.contentReport.groupBy({
          by: ["targetType", "targetId"],
          where: { status: "open", OR: reports.map((r) => ({ targetType: r.targetType, targetId: r.targetId })) },
          _count: { _all: true },
        })
      : [],
  ]);
  const person = new Map(people.map((p) => [p.id, p.name ?? p.email ?? "Unknown"]));
  const openOnTarget = new Map(perTarget.map((g) => [`${g.targetType}:${g.targetId}`, g._count._all]));
  const countOf = (s: string) => byStatus.find((b) => b.status === s)?._count._all ?? 0;
  const reasonLabel = (r: string) => REPORT_REASONS.find((x) => x.id === r)?.label ?? r;

  const href = (patch: Partial<CommunitySearch>) => {
    const p = new URLSearchParams();
    const next = { status, type, ...patch };
    if (next.status && next.status !== "open") p.set("status", next.status);
    if (next.type) p.set("type", next.type);
    const qs = p.toString();
    return `/admin/community${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-0.5">
          {STATUSES.map((s) => (
            <Link
              key={s.id}
              href={href({ status: s.id })}
              className={`h-7 inline-flex items-center gap-1.5 px-2.5 rounded-md text-xs font-medium ${
                status === s.id ? "bg-panel text-fg" : "text-muted hover:text-fg"
              }`}
            >
              {s.label}
              <span className="tabular-nums text-subtle">{countOf(s.id)}</span>
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1 text-xs">
          <Link href={href({ type: "" })} className={`h-7 inline-flex items-center px-2 rounded-md ${!type ? "bg-panel text-fg" : "text-muted hover:text-fg"}`}>
            Everything
          </Link>
          {TARGET_TYPES.map((t) => (
            <Link key={t} href={href({ type: t })} className={`h-7 inline-flex items-center px-2 rounded-md ${type === t ? "bg-panel text-fg" : "text-muted hover:text-fg"}`}>
              {TARGET_LABEL[t]}s
            </Link>
          ))}
        </div>
      </div>

      {reports.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface py-12 text-center text-sm text-muted">
          {status === "open" ? "No open reports. Members can report comments, posts and public snippets." : `No ${status} reports.`}
        </p>
      ) : (
        <div className="rounded-xl border border-border bg-surface divide-y divide-border">
          {reports.map((r) => {
            const t = isTargetType(r.targetType) ? r.targetType : null;
            const p = previewFor(previews, r.targetType, r.targetId);
            const others = (openOnTarget.get(`${r.targetType}:${r.targetId}`) ?? 0) - (r.status === "open" ? 1 : 0);
            return (
              <div key={r.id} className="p-4 flex flex-col lg:flex-row gap-4">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill tone="off">{t ? TARGET_LABEL[t] : r.targetType}</Pill>
                    <Pill tone="warn">{reasonLabel(r.reason)}</Pill>
                    {others > 0 && <Pill tone="bad">{others} more open report{others === 1 ? "" : "s"} on this</Pill>}
                    {!p.exists && <Pill tone="off">Already removed</Pill>}
                    {p.exists && p.hidden && <Pill tone="off">Not public</Pill>}
                  </div>
                  <div className="text-sm font-medium text-fg">
                    {p.href ? (
                      <Link href={p.href} target="_blank" className="hover:underline">
                        {p.title}
                      </Link>
                    ) : (
                      p.title
                    )}
                  </div>
                  {p.text && <blockquote className="border-l-2 border-border pl-3 text-sm text-fg/90 whitespace-pre-wrap break-words">{p.text}</blockquote>}
                  {r.detail && <p className="text-sm text-muted">Reporter wrote: {r.detail}</p>}
                  <p className="text-xs text-muted">
                    Reported by {r.reporterId ? person.get(r.reporterId) ?? "a member" : "a member"} on {r.createdAt.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    {p.authorId && (
                      <>
                        {" · "}Author{" "}
                        <Link href={`/admin/users/${p.authorId}`} className="text-fg hover:underline">
                          {p.authorName ?? "open profile"}
                        </Link>
                      </>
                    )}
                    {r.resolvedAt && (
                      <>
                        {" · "}
                        {r.status} by {r.resolvedById ? person.get(r.resolvedById) ?? "staff" : "staff"} on {r.resolvedAt.toLocaleDateString("en-GB")}
                      </>
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap lg:flex-col items-start lg:items-end gap-1.5 shrink-0">
                  {r.status === "open" ? (
                    <>
                      {t && CAN_HIDE[t] && p.exists && !p.hidden && (
                        <ConfirmButton
                          action={resolveReport.bind(null, r.id, "hide")}
                          label="Hide"
                          prompt="Take it off the site. It can be put back later."
                          requireNote
                        />
                      )}
                      {p.exists && (
                        <ConfirmButton
                          action={resolveReport.bind(null, r.id, "delete")}
                          label="Delete"
                          confirmLabel="Delete for good"
                          prompt={`Delete this ${t ? TARGET_LABEL[t].toLowerCase() : "item"}? This cannot be undone.`}
                          requireNote
                          tone="danger"
                        />
                      )}
                      <ConfirmButton action={resolveReport.bind(null, r.id, "dismiss")} label="Dismiss" />
                      {p.authorId && (
                        <Link
                          href={`/admin/users/${p.authorId}`}
                          className="inline-flex items-center h-7 px-2.5 rounded-md border border-border text-xs font-medium text-fg hover:bg-panel"
                        >
                          Suspend author
                        </Link>
                      )}
                    </>
                  ) : (
                    r.status === "dismissed" && <ConfirmButton action={reopenReport.bind(null, r.id)} label="Reopen" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-xl border border-border overflow-hidden empty:hidden">
        <Pagination
          currentPage={page}
          totalPages={Math.ceil(total / PAGE_SIZE)}
          totalItems={total}
          itemsPerPage={PAGE_SIZE}
          baseUrl="/admin/community"
          currentParams={{ status: status !== "open" ? status : undefined, type: type || undefined }}
        />
      </div>
    </div>
  );
}
