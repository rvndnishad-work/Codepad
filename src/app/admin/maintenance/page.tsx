import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminAccess } from "@/lib/permissions/staff";
import {
  AREAS,
  areaDef,
  areaDepth,
  isRuleActive,
  LEGACY_RULE_ID,
  ruleState,
  type RuleLike,
} from "@/lib/admin/maintenance-rules";
import { getMaintenanceConfig } from "@/lib/maintenance";
import { actionLabel } from "@/lib/admin/audit";
import SchedulePanel, { type SchedulePanelProps } from "./SchedulePanel";
import EndRuleButton from "./EndRuleButton";
import { fmtDuration, fmtUtc, fmtWindow, OpsHeader, OpsTabs, Pill, PrevNext, timeAgo } from "./_parts";

export const metadata = {
  title: "Maintenance — Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

type SP = { tab?: string; area?: string; edit?: string; custom?: string; page?: string; apage?: string };

const HINTS: Record<string, string> = {
  site: "Admins, sign-in, webhooks and crons always bypass",
  "public-api": "Returns 503 with Retry-After",
};

export default async function MaintenancePage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdminAccess("platform:admin");
  const sp = await searchParams;
  const tab = sp.tab === "history" ? "history" : "pages";

  return (
    <div className="space-y-6">
      <OpsHeader
        title="Maintenance"
        description="Take a page, an area or the whole site down with a message and a time. Scheduled jobs, webhooks and admins keep working."
        action={
          <Link
            href="/admin/maintenance?area=site"
            className="h-9 px-3.5 inline-flex items-center rounded-lg bg-secondary text-bg text-sm font-medium hover:brightness-110"
          >
            Schedule maintenance
          </Link>
        }
      />
      <OpsTabs active={tab} />
      {tab === "history" ? <HistoryTab sp={sp} /> : <PagesTab sp={sp} />}
    </div>
  );
}

/* ------------------------------------------------------------------------ */

async function PagesTab({ sp }: { sp: SP }) {
  const now = new Date();
  const [rules, legacy, roles] = await Promise.all([
    prisma.maintenanceRule.findMany({
      where: { endedAt: null, OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
      orderBy: [{ startsAt: "asc" }, { createdAt: "asc" }],
      take: 200,
    }),
    getMaintenanceConfig(),
    prisma.role.findMany({
      where: { scope: "GLOBAL", key: { not: "PLATFORM_ADMIN" } },
      orderBy: { label: "asc" },
      select: { key: true, label: true },
      take: 50,
    }),
  ]);

  const legacyRule: RuleLike | null = legacy.enabled
    ? {
        id: LEGACY_RULE_ID,
        area: "site",
        paths: ["/"],
        message: legacy.message,
        startsAt: null,
        endsAt: null,
        bannerHours: 0,
        bypassRoles: [],
        endedAt: null,
      }
    : null;

  const byArea = new Map<string, RuleLike[]>();
  for (const r of [...(legacyRule ? [legacyRule] : []), ...rules]) {
    const list = byArea.get(r.area) ?? [];
    list.push(r);
    byArea.set(r.area, list);
  }
  // Running first, then the soonest scheduled.
  for (const list of byArea.values()) {
    list.sort((a, b) => Number(isRuleActive(b, now)) - Number(isRuleActive(a, now)));
  }

  // Which panel is open.
  let panel: SchedulePanelProps | null = null;
  if (sp.edit) {
    const r = rules.find((x) => x.id === sp.edit);
    if (r) {
      const def = areaDef(r.area);
      const start = r.startsAt ?? r.createdAt;
      panel = {
        mode: "edit",
        area: r.area,
        areaLabel: def?.label ?? "Custom path",
        coversRooms: !!def?.coversRooms,
        running: isRuleActive(r, now),
        roles,
        initial: {
          ruleId: r.id,
          paths: r.paths,
          startsAt: r.startsAt?.toISOString() ?? null,
          durationMin: r.endsAt ? Math.round((r.endsAt.getTime() - start.getTime()) / 60_000) : null,
          message: r.message,
          bannerHours: r.bannerHours,
          bypassRoles: r.bypassRoles,
        },
      };
    }
  } else if (sp.custom || (sp.area && areaDef(sp.area))) {
    const def = sp.custom ? null : areaDef(sp.area!);
    panel = {
      mode: "new",
      area: def?.key ?? "custom",
      areaLabel: def?.label ?? "Custom path",
      coversRooms: !!def?.coversRooms,
      running: false,
      roles,
      initial: { paths: [], startsAt: null, durationMin: 60, message: "", bannerHours: 24, bypassRoles: [] },
    };
  }

  const customRules = byArea.get("custom") ?? [];

  return (
    <div className="grid gap-4 items-start lg:grid-cols-[minmax(0,1fr)_400px]">
      <section className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-3 flex-wrap">
          <h2 className="text-[15px] font-semibold flex-1">Pages and areas</h2>
          <span className="text-sm text-muted">Areas cover every route under them. A page rule wins over its area.</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] table-fixed text-sm">
            <thead>
              <tr className="bg-panel text-left text-xs font-semibold text-muted">
                <th className="px-4 py-2.5 w-[34%]">Area or page</th>
                <th className="px-4 py-2.5 w-[120px]">State</th>
                <th className="px-4 py-2.5">Message shown</th>
                <th className="px-4 py-2.5 w-[130px]" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {AREAS.map((a) => {
                const list = byArea.get(a.key) ?? [];
                const indent = { paddingLeft: `${16 + Math.min(areaDepth(a.key), 2) * 16}px` };
                if (!list.length) {
                  return (
                    <tr key={a.key} className="hover:bg-panel/60">
                      <td className="px-4 py-3" style={indent}>
                        <div className="font-medium">{a.label}</div>
                        <div className="text-xs text-muted font-mono">{a.display}</div>
                      </td>
                      <td className="px-4 py-3"><Pill tone="ok">Live</Pill></td>
                      <td className="px-4 py-3 text-muted">{HINTS[a.key] ?? ""}</td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/admin/maintenance?area=${a.key}`} className="text-secondary-soft hover:underline">Schedule</Link>
                      </td>
                    </tr>
                  );
                }
                return list.map((r, i) => (
                  <RuleRow key={r.id} rule={r} now={now} label={i === 0 ? a.label : "Another window"} display={i === 0 ? a.display : ""} indent={indent} />
                ));
              })}
              {customRules.map((r) => (
                <RuleRow
                  key={r.id}
                  rule={r}
                  now={now}
                  label="Custom path"
                  display={r.paths.join(", ")}
                  indent={{ paddingLeft: "16px" }}
                />
              ))}
              <tr>
                <td colSpan={4} className="px-4 py-3 text-center">
                  <Link href="/admin/maintenance?custom=1" className="text-secondary-soft hover:underline">Add a custom path</Link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {panel ? (
        <SchedulePanel key={`${panel.mode}-${panel.area}-${panel.initial.ruleId ?? ""}`} {...panel} />
      ) : (
        <aside className="rounded-xl border border-border bg-surface p-5 text-sm text-muted space-y-2">
          <h2 className="text-[15px] font-semibold text-fg">How it works</h2>
          <p>Pick Schedule on a row to take that area down now or at a time. People see your message word for word on a 503 page, and the API answers 503 with Retry-After.</p>
          <p>A banner warns on the affected pages ahead of time. Platform admins always get through; tick other roles in the schedule panel.</p>
          <p>To keep a page up and pause one function, use <Link href="/admin/switches" className="text-secondary-soft hover:underline">Feature switches</Link>.</p>
        </aside>
      )}
    </div>
  );
}

function RuleRow({
  rule,
  now,
  label,
  display,
  indent,
}: {
  rule: RuleLike;
  now: Date;
  label: string;
  display: string;
  indent: React.CSSProperties;
}) {
  const state = ruleState(rule, now);
  const legacy = rule.id === LEGACY_RULE_ID;
  return (
    <tr className="hover:bg-panel/60 align-top">
      <td className="px-4 py-3" style={indent}>
        <div className="font-medium">{label}</div>
        {display && <div className="text-xs text-muted font-mono">{display}</div>}
      </td>
      <td className="px-4 py-3">
        {state === "down" ? <Pill tone="bad">Down now</Pill> : <Pill tone="warn">Scheduled</Pill>}
      </td>
      <td className="px-4 py-3">
        <div className="text-fg whitespace-pre-line">{rule.message || <span className="text-muted">No message</span>}</div>
        <div className="text-xs text-muted mt-1">
          {legacy ? "Turned on with the old site switch" : fmtWindow(rule.startsAt, rule.endsAt, rule.createdAt)}
          {rule.bypassRoles.length ? ` · lets through ${rule.bypassRoles.join(", ")}` : ""}
        </div>
      </td>
      <td className="px-4 py-3 text-right whitespace-nowrap">
        {!legacy && (
          <>
            <Link href={`/admin/maintenance?edit=${rule.id}`} className="text-secondary-soft hover:underline">Edit</Link>
            <span className="text-subtle"> · </span>
          </>
        )}
        <EndRuleButton
          ruleId={rule.id}
          kind={state === "down" ? "bring-back" : "cancel"}
          label={rule.area === "custom" ? rule.paths.join(", ") : areaDef(rule.area)?.label ?? rule.area}
        />
      </td>
    </tr>
  );
}

/* ------------------------------------------------------------------------ */

const PER_PAGE = 20;
const HISTORY_ACTIONS = ["maintenance.create", "maintenance.update", "maintenance.end", "switch.set"];

async function HistoryTab({ sp }: { sp: SP }) {
  const page = Math.max(1, Number(sp.page) || 1);
  const apage = Math.max(1, Number(sp.apage) || 1);
  const now = new Date();

  const [rules, ruleCount, audit, auditCount] = await Promise.all([
    prisma.maintenanceRule.findMany({
      orderBy: { createdAt: "desc" },
      take: PER_PAGE,
      skip: (page - 1) * PER_PAGE,
    }),
    prisma.maintenanceRule.count(),
    prisma.adminAuditLog.findMany({
      where: { action: { in: HISTORY_ACTIONS } },
      orderBy: { createdAt: "desc" },
      take: PER_PAGE,
      skip: (apage - 1) * PER_PAGE,
      select: { id: true, action: true, actorEmail: true, via: true, targetLabel: true, targetId: true, note: true, createdAt: true, after: true },
    }),
    prisma.adminAuditLog.count({ where: { action: { in: HISTORY_ACTIONS } } }),
  ]);

  const creatorIds = [...new Set(rules.map((r) => r.createdById).filter((x): x is string => !!x))];
  const creators = creatorIds.length
    ? await prisma.user.findMany({ where: { id: { in: creatorIds } }, select: { id: true, name: true, email: true } })
    : [];
  const who = new Map(creators.map((u) => [u.id, u.name || u.email || "Unknown"]));

  const href = (p: number, ap: number) => `/admin/maintenance?tab=history&page=${p}&apage=${ap}`;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-[15px] font-semibold">Maintenance windows</h2>
        </div>
        {rules.length === 0 ? (
          <div className="px-4 py-8 text-sm text-muted text-center">No maintenance has been scheduled yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-panel text-left text-xs font-semibold text-muted">
                  <th className="px-4 py-2.5">Area or page</th>
                  <th className="px-4 py-2.5">Window</th>
                  <th className="px-4 py-2.5">In effect</th>
                  <th className="px-4 py-2.5">Message</th>
                  <th className="px-4 py-2.5">By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rules.map((r) => {
                  const start = r.startsAt ?? r.createdAt;
                  const stop = r.endedAt ?? r.endsAt ?? now;
                  const effectiveEnd = stop.getTime() > now.getTime() ? now : stop;
                  const started = start.getTime() <= now.getTime();
                  const ran = started && effectiveEnd.getTime() > start.getTime();
                  const state = ruleState(r, now);
                  return (
                    <tr key={r.id} className="align-top">
                      <td className="px-4 py-3">
                        <div className="font-medium">{r.area === "custom" ? "Custom path" : areaDef(r.area)?.label ?? r.area}</div>
                        {r.area === "custom" && <div className="text-xs text-muted font-mono">{r.paths.join(", ")}</div>}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {fmtWindow(r.startsAt, r.endsAt, r.createdAt)}
                        {r.endedAt && <div className="text-xs">Ended {fmtUtc(r.endedAt)}</div>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {state === "down" ? (
                          <Pill tone="bad">Down now</Pill>
                        ) : state === "scheduled" ? (
                          <Pill tone="warn">Scheduled</Pill>
                        ) : ran ? (
                          fmtDuration(effectiveEnd.getTime() - start.getTime())
                        ) : (
                          <Pill tone="off">Cancelled</Pill>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-[360px]"><div className="line-clamp-2">{r.message}</div></td>
                      <td className="px-4 py-3 text-muted">{r.createdById ? who.get(r.createdById) ?? "Unknown" : "System"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <PrevNext page={page} total={ruleCount} perPage={PER_PAGE} href={(p) => href(p, apage)} />
      </section>

      <section className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-[15px] font-semibold">Changes to maintenance and switches</h2>
        </div>
        {audit.length === 0 ? (
          <div className="px-4 py-8 text-sm text-muted text-center">Nothing has changed yet.</div>
        ) : (
          <ul className="divide-y divide-border">
            {audit.map((a) => {
              const state = a.action === "switch.set" && a.after && typeof a.after === "object" ? (a.after as { state?: string }).state : null;
              return (
                <li key={a.id} className="px-4 py-3 text-sm flex gap-4">
                  <div className="w-28 shrink-0 text-muted" title={a.createdAt.toISOString()}>{timeAgo(a.createdAt)}</div>
                  <div className="min-w-0">
                    <div>
                      <span className="font-medium">{a.actorEmail ?? (a.via === "system" ? "System" : "Unknown")}</span>{" "}
                      <span className="text-muted">{actionLabel(a.action).toLowerCase()}</span>{" "}
                      <span>{a.targetLabel ?? a.targetId}</span>
                      {state && <span className="text-muted"> to {state.replace("_", " ")}</span>}
                    </div>
                    {a.note && <div className="text-muted mt-0.5">&ldquo;{a.note}&rdquo;</div>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <PrevNext page={apage} total={auditCount} perPage={PER_PAGE} href={(p) => href(page, p)} />
      </section>
    </div>
  );
}
