import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdminAccess } from "@/lib/permissions/staff";
import { PILOT_DEFAULTS } from "@/lib/billing/catalog";
import { PILOT_CREDIT_KIND, isPilot, pilotDaysLeft } from "@/lib/billing/pilot";
import { HIRING_TYPES, MONTHLY_VOLUMES, STAGE_LABELS, TEAM_SIZES, optionLabel, slugFromCompany, suggestedPlan, type DemoStage } from "@/lib/demo-requests/model";
import { DefRow, Pill, Section, StatTile } from "../../interviews/_components/list";
import { utcDay, utcStamp } from "../../interviews/_components/params";
import { STAGE_TONE } from "../stage-tone";
import { RequestControls, CreatePilotForm, PilotControls } from "./RequestForms";

export const metadata = { title: "Demo request — Admin" };

export default async function DemoRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminAccess("platform:admin");
  const { id } = await params;
  const req = await prisma.demoRequest.findUnique({
    where: { id },
    include: { events: { orderBy: { createdAt: "desc" }, take: 100 } },
  });
  if (!req) notFound();
  const now = new Date();

  const ws = req.workspaceId
    ? await prisma.workspace.findUnique({
        where: { id: req.workspaceId },
        select: {
          id: true,
          name: true,
          slug: true,
          planName: true,
          stripeSubscriptionId: true,
          prepaidThrough: true,
          prepaidSeats: true,
          prepaidCadence: true,
          _count: { select: { members: true, invites: { where: { acceptedAt: null } } } },
        },
      })
    : null;
  const [balance, pilotGranted, used] = ws
    ? await Promise.all([
        prisma.aIInterviewCreditLedger.aggregate({ where: { workspaceId: ws.id }, _sum: { amount: true } }),
        prisma.aIInterviewCreditLedger.aggregate({ where: { workspaceId: ws.id, kind: PILOT_CREDIT_KIND }, _sum: { amount: true } }),
        prisma.aIInterviewCreditLedger.aggregate({ where: { workspaceId: ws.id, kind: "CONSUMPTION" }, _sum: { amount: true } }),
      ])
    : [null, null, null];
  const stage = req.stage as DemoStage;
  const plan = suggestedPlan(req);
  const pilot = ws ? isPilot(ws) : false;
  const daysLeft = ws ? pilotDaysLeft(ws, now) : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/demo-requests" className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
          <ArrowLeft className="h-4 w-4" /> Back to demo requests
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">{req.company}</h1>
          <Pill tone={STAGE_TONE[stage] ?? "off"}>{STAGE_LABELS[stage] ?? req.stage}</Pill>
          {req.enterpriseLead ? <Pill tone="info">Enterprise lead</Pill> : null}
        </div>
        <p className="mt-1 text-sm text-muted">
          {req.name}
          {req.jobTitle ? `, ${req.jobTitle}` : ""}. Received {utcStamp(req.createdAt)}
          {req.ownerEmail ? `, owned by ${req.ownerEmail}` : ", not taken yet"}.
          {req.demoAt ? ` Demo booked for ${utcStamp(req.demoAt)}.` : ""}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="flex flex-col gap-6">
          <Section title="Request">
            <dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-6 gap-y-2 rounded-xl border border-border bg-surface p-4 text-sm">
              <DefRow label="Email">
                <a className="underline" href={`mailto:${req.email}?subject=${encodeURIComponent("Your demo request")}`}>
                  {req.email}
                </a>
              </DefRow>
              <DefRow label="Team size">{optionLabel(TEAM_SIZES, req.teamSize)}</DefRow>
              <DefRow label="Screenings a month">{optionLabel(MONTHLY_VOLUMES, req.monthlyVolume)}</DefRow>
              <DefRow label="Hires for">{optionLabel(HIRING_TYPES, req.hiringType)}</DefRow>
              <DefRow label="Came from">{req.source === "direct" ? "/demo" : `/${req.source}`}</DefRow>
              <DefRow label="Suggested plan">
                <strong className="font-semibold">{plan}</strong>
              </DefRow>
              {req.message ? (
                <DefRow label="Message">
                  <span className="whitespace-pre-wrap">{req.message}</span>
                </DefRow>
              ) : null}
            </dl>
          </Section>

          <Section title="Follow-up">
            <RequestControls
              id={req.id}
              stage={stage}
              ownedByMe={Boolean(req.ownerUserId && req.ownerUserId === session?.user?.id)}
              owner={req.ownerEmail}
              demoAt={req.demoAt ? req.demoAt.toISOString().slice(0, 16) : ""}
              notes={req.notes ?? ""}
            />
          </Section>

          <Section title="History">
            <ol className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface text-sm">
              {req.events.map((e) => (
                <li key={e.id} className="grid grid-cols-[10.5rem_minmax(0,1fr)] gap-3 px-4 py-2.5">
                  <span className="text-xs text-muted tabular-nums">{utcStamp(e.createdAt)}</span>
                  <span className="text-fg">
                    {e.text}
                    {e.actorEmail ? <span className="text-muted"> · {e.actorEmail}</span> : null}
                  </span>
                </li>
              ))}
            </ol>
          </Section>
        </div>

        <div className="flex flex-col gap-6">
          {ws ? (
            <Section
              title={pilot ? "Pilot workspace" : "Workspace"}
              description={
                pilot
                  ? "Growth features until the end date. When it ends the workspace moves to Free and unused pilot credits expire."
                  : "This workspace is on a paid plan now, so the pilot controls are gone."
              }
            >
              <div className="grid grid-cols-2 gap-3">
                <StatTile
                  label="Ends"
                  value={ws.prepaidThrough ? utcDay(ws.prepaidThrough) : "None"}
                  sub={pilot ? (daysLeft ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left` : "Ended, on Free") : `Plan: ${ws.planName}`}
                />
                <StatTile label="Credits left" value={balance?._sum.amount ?? 0} sub={`${pilotGranted?._sum.amount ?? 0} pilot credits given, ${-(used?._sum.amount ?? 0)} used`} />
                <StatTile label="Seats" value={`${ws._count.members + ws._count.invites} of ${ws.prepaidSeats ?? "?"}`} sub={`${ws._count.members} members, ${ws._count.invites} pending invites`} />
                <StatTile
                  label="Workspace"
                  value={
                    <Link href={`/admin/workspaces/${ws.id}`} className="text-base underline">
                      {ws.name}
                    </Link>
                  }
                  sub={`/w/${ws.slug}`}
                />
              </div>
              {pilot ? <PilotControls id={req.id} active={Boolean(daysLeft)} lengths={[...PILOT_DEFAULTS.lengthsDays]} /> : null}
            </Section>
          ) : (
            <Section
              title="Create pilot workspace"
              description="Makes a workspace with Growth features for a set time and makes the contact its owner. Nothing is charged. When the pilot ends, the workspace moves to Free until they pick a plan."
            >
              <CreatePilotForm
                id={req.id}
                contactName={req.name.split(/\s+/)[0] || req.name}
                defaults={{
                  workspaceName: req.company,
                  slug: slugFromCompany(req.company),
                  ownerEmail: req.email,
                  days: PILOT_DEFAULTS.lengthDays,
                  seats: PILOT_DEFAULTS.seats,
                  credits: PILOT_DEFAULTS.credits,
                }}
                lengths={[...PILOT_DEFAULTS.lengthsDays]}
                maxSeats={PILOT_DEFAULTS.maxSeats}
                maxCredits={PILOT_DEFAULTS.maxCredits}
                nowIso={now.toISOString()}
              />
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}
