import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminAccess } from "@/lib/permissions/staff";
import { pilotDaysLeft } from "@/lib/billing/pilot";
import { DEMO_STAGES, MONTHLY_VOLUMES, OPEN_STAGES, STAGE_LABELS, TEAM_SIZES, optionLabel, type DemoStage } from "@/lib/demo-requests/model";
import { Empty, PageHeader, Pager, Pill, Segments, StatTile, Table, inputCls, buttonCls, tdCls, thCls } from "../interviews/_components/list";
import { STAGE_TONE } from "./stage-tone";
import { hrefWith, one, pageWindow, pick, utcStamp, type SearchParams } from "../interviews/_components/params";

export const metadata = { title: "Demo requests — Admin" };

const PAGE = 25;
const DAY_MS = 86_400_000;

function ago(d: Date, now: Date): string {
  const h = Math.floor((now.getTime() - d.getTime()) / 3_600_000);
  if (h < 1) return "Just now";
  if (h < 24) return `${h} h ago`;
  const days = Math.floor(h / 24);
  return days === 1 ? "Yesterday" : `${days} days ago`;
}

/**
 * People who asked for a demo. Admins reply, book the call and create a
 * pilot workspace from the request (see [id]).
 */
export default async function DemoRequestsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminAccess("platform:admin");
  const sp = await searchParams;
  const stage = pick(one(sp.stage), [...DEMO_STAGES, "all"] as const);
  const q = one(sp.q).trim().slice(0, 100);
  const page = Number.parseInt(one(sp.page), 10) || 1;
  const now = new Date();

  const where: Prisma.DemoRequestWhereInput = {
    ...(stage === "all" ? {} : stage ? { stage } : { stage: { in: OPEN_STAGES } }),
    ...(q
      ? {
          OR: [
            { company: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const since90 = new Date(now.getTime() - 90 * DAY_MS);
  const [byStage, total, staleNew, nextDemo, pilots90, converted90] = await Promise.all([
    prisma.demoRequest.groupBy({ by: ["stage"], _count: { _all: true } }),
    prisma.demoRequest.count({ where }),
    prisma.demoRequest.count({ where: { stage: "NEW", createdAt: { lt: new Date(now.getTime() - DAY_MS) } } }),
    prisma.demoRequest.findFirst({ where: { stage: "DEMO_BOOKED", demoAt: { gte: now } }, orderBy: { demoAt: "asc" }, select: { demoAt: true } }),
    prisma.demoRequest.count({ where: { workspaceId: { not: null }, createdAt: { gte: since90 } } }),
    prisma.demoRequest.count({ where: { stage: "CONVERTED", createdAt: { gte: since90 } } }),
  ]);
  const count = (s: DemoStage) => byStage.find((r) => r.stage === s)?._count._all ?? 0;
  const openCount = OPEN_STAGES.reduce((n, s) => n + count(s), 0);

  const win = pageWindow(page, total, PAGE);
  const rows = total
    ? await prisma.demoRequest.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: win.skip,
        take: win.take,
        select: {
          id: true,
          name: true,
          email: true,
          company: true,
          jobTitle: true,
          teamSize: true,
          monthlyVolume: true,
          hiringType: true,
          stage: true,
          enterpriseLead: true,
          ownerEmail: true,
          demoAt: true,
          createdAt: true,
          workspaceId: true,
        },
      })
    : [];
  const wsIds = rows.map((r) => r.workspaceId).filter((v): v is string => Boolean(v));
  const workspaces = wsIds.length
    ? await prisma.workspace.findMany({
        where: { id: { in: wsIds } },
        select: { id: true, slug: true, planName: true, stripeSubscriptionId: true, prepaidThrough: true, prepaidCadence: true },
      })
    : [];
  const wsById = new Map(workspaces.map((w) => [w.id, w]));
  const pilotsRunning = await prisma.workspace.count({ where: { prepaidCadence: "pilot", planName: "GROWTH", prepaidThrough: { gt: now } } });
  const pilotsEndingSoon = await prisma.workspace.count({
    where: { prepaidCadence: "pilot", planName: "GROWTH", prepaidThrough: { gt: now, lt: new Date(now.getTime() + 7 * DAY_MS) } },
  });

  const current = { stage: stage || undefined, q: q || undefined, page: String(win.page) };
  const base = "/admin/demo-requests";
  const segments = [
    { label: "Open", href: hrefWith(base, current, { stage: null }), on: !stage, count: openCount },
    ...DEMO_STAGES.map((s) => ({ label: STAGE_LABELS[s], href: hrefWith(base, current, { stage: s }), on: stage === s, count: count(s) })),
    { label: "All", href: hrefWith(base, current, { stage: "all" }), on: stage === "all" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Demo requests"
        description="People who asked for a demo from /pricing, /hire or /demo. Take the request, book the call, then create a pilot workspace from it."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="New" value={count("NEW")} sub={staleNew ? `${staleNew} waiting over a day` : "None waiting over a day"} />
        <StatTile label="Demo booked" value={count("DEMO_BOOKED")} sub={nextDemo?.demoAt ? `Next: ${utcStamp(nextDemo.demoAt)}` : "Nothing booked ahead"} />
        <StatTile label="Pilots running" value={pilotsRunning} sub={pilotsEndingSoon ? `${pilotsEndingSoon} end this week` : "None end this week"} />
        <StatTile
          label="Converted, 90 days"
          value={pilots90 ? `${Math.round((converted90 / pilots90) * 100)}%` : "None yet"}
          sub={`${converted90} of ${pilots90} pilots`}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segments label="Stage" items={segments} />
        <form method="get" action={base} className="flex items-center gap-2">
          {stage ? <input type="hidden" name="stage" value={stage} /> : null}
          <label className="sr-only" htmlFor="demo-q">
            Search requests
          </label>
          <input id="demo-q" type="search" name="q" defaultValue={q} placeholder="Name, company or email" className={`${inputCls} w-64`} />
          <button type="submit" className={buttonCls}>
            Search
          </button>
        </form>
      </div>

      {rows.length === 0 ? (
        <Empty title={q ? "No requests match that search." : "No requests here yet."}>
          New requests from the Book a demo form show up here, and the sales inbox gets an email for each.
        </Empty>
      ) : (
        <Table
          minWidth={980}
          head={
            <>
              <th className={thCls}>Company</th>
              <th className={thCls}>Contact</th>
              <th className={thCls}>Team, volume</th>
              <th className={thCls}>Stage</th>
              <th className={thCls}>Owner</th>
              <th className={thCls}>Received</th>
              <th className={thCls}>
                <span className="sr-only">Open</span>
              </th>
            </>
          }
        >
          {rows.map((r) => {
            const ws = r.workspaceId ? wsById.get(r.workspaceId) : undefined;
            const days = ws ? pilotDaysLeft(ws, now) : null;
            const waitingH = r.stage === "NEW" ? Math.floor((now.getTime() - r.createdAt.getTime()) / 3_600_000) : 0;
            return (
              <tr key={r.id}>
                <td className={tdCls}>
                  <Link href={`${base}/${r.id}`} className="font-medium text-fg hover:underline">
                    {r.company}
                  </Link>
                  {r.enterpriseLead ? (
                    <div className="mt-1">
                      <Pill tone="info">Enterprise lead</Pill>
                    </div>
                  ) : null}
                </td>
                <td className={tdCls}>
                  <div className="text-fg">{r.name}</div>
                  <div className="text-xs text-muted">{r.email}</div>
                </td>
                <td className={tdCls}>
                  <div className="text-fg">{optionLabel(TEAM_SIZES, r.teamSize)}</div>
                  <div className="text-xs text-muted">{optionLabel(MONTHLY_VOLUMES, r.monthlyVolume)} a month</div>
                </td>
                <td className={tdCls}>
                  <Pill tone={STAGE_TONE[r.stage as DemoStage] ?? "off"}>{STAGE_LABELS[r.stage as DemoStage] ?? r.stage}</Pill>
                  {r.stage === "DEMO_BOOKED" && r.demoAt ? <div className="mt-1 text-xs text-muted">{utcStamp(r.demoAt)}</div> : null}
                  {r.stage === "PILOT" && ws ? (
                    <div className="mt-1 text-xs text-muted">{days ? `Ends in ${days} day${days === 1 ? "" : "s"}` : "Pilot ended"}</div>
                  ) : null}
                  {waitingH >= 24 ? <div className="mt-1 text-xs text-warning">Waiting {waitingH} h</div> : null}
                </td>
                <td className={tdCls}>{r.ownerEmail ?? <span className="text-muted">Unassigned</span>}</td>
                <td className={`${tdCls} whitespace-nowrap text-muted`} title={utcStamp(r.createdAt)}>
                  {ago(r.createdAt, now)}
                </td>
                <td className={tdCls}>
                  <Link href={`${base}/${r.id}`} className="text-sm font-medium text-fg underline">
                    {r.stage === "DEMO_BOOKED" && !r.workspaceId ? "Create pilot" : r.stage === "PILOT" ? "Extend or end" : "Open"}
                  </Link>
                </td>
              </tr>
            );
          })}
        </Table>
      )}
      <Pager win={win} href={(p) => hrefWith(base, current, { page: p })} noun="requests" />

      <p className="text-xs text-muted">
        Requests from teams over 25 people or 500 screenings a month are tagged Enterprise lead. Every change is kept in the request history and the
        audit log.
      </p>
    </div>
  );
}
