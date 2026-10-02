import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { siteOrigin } from "@/lib/site-url";
import { requireAdminAccess } from "@/lib/permissions/staff";
import { actionLabel } from "@/lib/admin/audit";
import { fmtScore, parseCriteria, parseRatings, scorecardAverage } from "@/lib/interview/scorecard";
import { DefRow, Empty, Pill, Section, Table, tdCls, thCls } from "../_components/list";
import { utcStamp } from "../_components/params";
import { interviewStatus, interviewTypeLabel, recordingStatus } from "../_components/status";
import ConfirmAction from "../_components/ConfirmAction";
import CopyField from "./CopyField";
import { deleteInterviewAction, rotateShareTokenAction, setInterviewStatusAction } from "../actions";

export const metadata = { title: "Interview — Admin", robots: { index: false, follow: false } };

function ids(raw: string | null | undefined): string[] {
  try {
    const v = JSON.parse(raw ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function duration(sec: number | null | undefined): string {
  if (sec == null) return "";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h ? `${h} h ${m} min` : m ? `${m} min` : `${sec} s`;
}

function bytes(n: bigint | null): string {
  if (n == null) return "";
  const v = Number(n);
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)} GB`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)} MB`;
  return `${Math.round(v / 1e3)} KB`;
}

const RECOMMENDATION: Record<string, { label: string; tone: "ok" | "warn" | "bad" }> = {
  yes: { label: "Hire", tone: "ok" },
  unsure: { label: "Unsure", tone: "warn" },
  no: { label: "No hire", tone: "bad" },
};

export default async function AdminInterviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminAccess();
  const { id } = await params;

  // Secrets (proctorSecret, proctorToken, candidateAccessToken, guest tokens)
  // are never selected. shareToken is shown because admins hand out the
  // interviewer view link from here.
  const s = await prisma.interviewSession.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      type: true,
      status: true,
      format: true,
      candidateName: true,
      totalSec: true,
      shareToken: true,
      shortCode: true,
      scheduledAt: true,
      startedAt: true,
      finishedAt: true,
      deadlineAt: true,
      cancelledAt: true,
      createdAt: true,
      challengeIds: true,
      playgroundIds: true,
      promptScenarioIds: true,
      meetingUrl: true,
      builtinVideo: true,
      recordVideo: true,
      candidateConsentAt: true,
      aiSuspicionScore: true,
      panelJson: true,
      scorecardPassMark: true,
      user: { select: { id: true, name: true, email: true } },
      candidate: { select: { id: true, name: true, email: true, stage: true } },
      workspace: { select: { id: true, name: true, slug: true, planName: true } },
      recordings: {
        orderBy: { startedAt: "desc" },
        select: { id: true, status: true, sizeBytes: true, seconds: true, startedAt: true, endedAt: true, expiresAt: true, deletedAt: true, creditsCharged: true, error: true },
      },
      scorecards: {
        orderBy: { createdAt: "asc" },
        select: { id: true, reviewerName: true, status: true, recommendation: true, criteriaJson: true, ratingsJson: true, submittedAt: true, _count: { select: { edits: true } } },
      },
      guests: { orderBy: { createdAt: "asc" }, select: { id: true, email: true, sentAt: true, createdAt: true } },
    },
  });
  if (!s) notFound();

  const challengeIds = ids(s.challengeIds);
  const panelIds = ids(s.panelJson);
  const [challenges, attempts, panel, audit] = await Promise.all([
    challengeIds.length
      ? prisma.challenge.findMany({ where: { id: { in: challengeIds } }, select: { id: true, title: true, difficulty: true } })
      : Promise.resolve([]),
    prisma.challengeAttempt.groupBy({ by: ["challengeId", "status"], where: { sessionId: id }, _count: { _all: true } }),
    panelIds.length ? prisma.user.findMany({ where: { id: { in: panelIds } }, select: { id: true, name: true, email: true } }) : Promise.resolve([]),
    prisma.adminAuditLog.findMany({
      where: { targetType: "interview", targetId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, action: true, actorEmail: true, note: true, createdAt: true },
    }),
  ]);
  const byChallenge = new Map(challenges.map((c) => [c.id, c]));
  const attemptText = (cid: string) =>
    attempts
      .filter((a) => a.challengeId === cid)
      .map((a) => `${a._count._all} ${a.status.replace(/_/g, " ")}`)
      .join(", ");

  const st = interviewStatus(s.status);
  const shareUrl = `${siteOrigin()}/interview/${s.id}?token=${s.shareToken}`;
  const candidate = s.candidate?.name || s.candidateName;
  const submitted = s.scorecards.filter((c) => c.status === "submitted");
  const averages = submitted
    .map((c) => scorecardAverage(parseRatings(c.ratingsJson, parseCriteria(c.criteriaJson))))
    .filter((x): x is number => x != null);
  const panelAvg = averages.length ? averages.reduce((a, b) => a + b, 0) / averages.length : null;

  return (
    <div className="flex flex-col gap-8">
      <Link href="/admin/interviews" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft className="h-3.5 w-3.5" /> All interviews
      </Link>

      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone={st.tone}>{st.label}</Pill>
          <span className="text-sm text-muted">{interviewTypeLabel(s.type, Boolean(s.workspace))}</span>
          <span className="font-mono text-xs text-subtle">{s.id}</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">{s.title}</h1>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-surface p-5">
          <h2 className="mb-3 text-sm font-semibold text-fg">Who</h2>
          <dl className="grid grid-cols-[120px_1fr] gap-x-3 gap-y-2 text-sm">
            <DefRow label="Workspace">
              {s.workspace ? (
                <Link href={`/admin/workspaces/${s.workspace.id}`} className="hover:underline underline-offset-2">
                  {s.workspace.name} <span className="text-muted">({s.workspace.planName.toLowerCase()})</span>
                </Link>
              ) : (
                <span className="text-muted">None, practice session</span>
              )}
            </DefRow>
            <DefRow label="Candidate">
              {candidate ? (
                <>
                  {candidate}
                  {s.candidate?.email && <span className="text-muted"> · {s.candidate.email}</span>}
                  {s.candidate?.stage && <span className="text-muted"> · {s.candidate.stage.toLowerCase()}</span>}
                </>
              ) : (
                <span className="text-muted">None</span>
              )}
            </DefRow>
            <DefRow label="Host">
              <Link href={`/admin/users?q=${encodeURIComponent(s.user.email ?? s.user.id)}`} className="hover:underline underline-offset-2">
                {s.user.name ?? s.user.email}
              </Link>
              {s.user.name && <span className="text-muted"> · {s.user.email}</span>}
            </DefRow>
            {panel.length > 0 && <DefRow label="Panel">{panel.map((p) => p.name ?? p.email).join(", ")}</DefRow>}
            <DefRow label="Guests">
              {s.guests.length === 0 ? (
                <span className="text-muted">None</span>
              ) : (
                <ul className="flex flex-col gap-0.5">
                  {s.guests.map((g) => (
                    <li key={g.id}>
                      {g.email} <span className="text-muted">· {g.sentAt ? `emailed ${utcStamp(g.sentAt)}` : "not emailed"}</span>
                    </li>
                  ))}
                </ul>
              )}
            </DefRow>
          </dl>
        </section>

        <section className="rounded-xl border border-border bg-surface p-5">
          <h2 className="mb-3 text-sm font-semibold text-fg">When (UTC)</h2>
          <dl className="grid grid-cols-[120px_1fr] gap-x-3 gap-y-2 text-sm">
            <DefRow label="Created">{utcStamp(s.createdAt)}</DefRow>
            {s.scheduledAt && <DefRow label="Scheduled">{utcStamp(s.scheduledAt)}</DefRow>}
            {s.deadlineAt && <DefRow label="Deadline">{utcStamp(s.deadlineAt)}</DefRow>}
            <DefRow label="Started">{s.startedAt ? utcStamp(s.startedAt) : <span className="text-muted">Not started</span>}</DefRow>
            {s.finishedAt && <DefRow label="Finished">{utcStamp(s.finishedAt)}</DefRow>}
            {s.cancelledAt && <DefRow label="Cancelled">{utcStamp(s.cancelledAt)}</DefRow>}
            <DefRow label="Length">{duration(s.totalSec)}</DefRow>
            <DefRow label="Video">
              {s.builtinVideo ? "Built-in call" : s.meetingUrl ? "Meeting link" : "None"}
              {s.recordVideo && " · recorded"}
              {s.candidateConsentAt && <span className="text-muted"> · consent {utcStamp(s.candidateConsentAt)}</span>}
            </DefRow>
            {s.aiSuspicionScore != null && <DefRow label="Integrity">{Math.round(s.aiSuspicionScore * 100)}% suspicion</DefRow>}
          </dl>
        </section>
      </div>

      <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold text-fg">Interviewer view link</h2>
        <CopyField value={shareUrl} />
        <div className="flex flex-wrap items-start gap-2">
          <ConfirmAction
            label="New share link"
            title="Make a new interviewer link?"
            body="The current link stops working at once, including for anyone in the room with it."
            noteLabel="Why"
            confirmLabel="Make new link"
            run={rotateShareTokenAction.bind(null, s.id)}
          />
          {s.status !== "completed" && (
            <ConfirmAction
              label="Mark completed"
              title="Mark this interview completed?"
              body="Use this for a session that ended but was never closed. The room stays readable."
              noteLabel="Why"
              confirmLabel="Mark completed"
              run={setInterviewStatusAction.bind(null, s.id, "completed")}
            />
          )}
          {s.status !== "abandoned" && s.status !== "completed" && (
            <ConfirmAction
              label="Mark abandoned"
              title="Mark this interview abandoned?"
              noteLabel="Why"
              confirmLabel="Mark abandoned"
              run={setInterviewStatusAction.bind(null, s.id, "abandoned")}
            />
          )}
          <ConfirmAction
            label="Delete"
            tone="danger"
            title="Delete this interview?"
            body={`This removes the session, ${s.scorecards.length} scorecard${s.scorecards.length === 1 ? "" : "s"} and ${s.recordings.length} recording${s.recordings.length === 1 ? "" : "s"} (video files too). Attempts keep their data. This cannot be undone.`}
            noteLabel="Why"
            confirmLabel="Delete for good"
            run={deleteInterviewAction.bind(null, s.id)}
          />
        </div>
      </section>

      <Section
        title="Scorecards"
        description={
          s.scorecards.length
            ? `${submitted.length} of ${s.scorecards.length} submitted${panelAvg != null ? `, panel average ${fmtScore(panelAvg)} of 4` : ""}.`
            : undefined
        }
      >
        {s.scorecards.length === 0 ? (
          <Empty title="No scorecards" />
        ) : (
          <Table
            minWidth={640}
            head={
              <>
                <th className={thCls}>Interviewer</th>
                <th className={thCls}>Status</th>
                <th className={thCls}>Recommendation</th>
                <th className={`${thCls} text-right`}>Average</th>
                <th className={thCls}>Submitted</th>
              </>
            }
          >
            {s.scorecards.map((c) => {
              const avg = scorecardAverage(parseRatings(c.ratingsJson, parseCriteria(c.criteriaJson)));
              const rec = c.recommendation ? RECOMMENDATION[c.recommendation] : null;
              return (
                <tr key={c.id}>
                  <td className={tdCls}>{c.reviewerName}</td>
                  <td className={tdCls}>
                    <Pill tone={c.status === "submitted" ? "ok" : "off"}>{c.status === "submitted" ? "Submitted" : "Draft"}</Pill>
                    {c._count.edits > 0 && <span className="ml-2 text-xs text-muted">amended {c._count.edits}×</span>}
                  </td>
                  <td className={tdCls}>{rec ? <Pill tone={rec.tone}>{rec.label}</Pill> : <span className="text-subtle">None</span>}</td>
                  <td className={`${tdCls} text-right tabular-nums`}>{avg != null ? fmtScore(avg) : ""}</td>
                  <td className={`${tdCls} text-muted`}>{c.submittedAt ? utcStamp(c.submittedAt) : ""}</td>
                </tr>
              );
            })}
          </Table>
        )}
      </Section>

      <Section title="Recordings">
        {s.recordings.length === 0 ? (
          <Empty title="No recordings" />
        ) : (
          <Table
            minWidth={720}
            head={
              <>
                <th className={thCls}>Started</th>
                <th className={thCls}>Status</th>
                <th className={`${thCls} text-right`}>Length</th>
                <th className={`${thCls} text-right`}>Size</th>
                <th className={`${thCls} text-right`}>Credits</th>
                <th className={thCls}>Expires</th>
              </>
            }
          >
            {s.recordings.map((r) => {
              const rs = recordingStatus(r.status);
              return (
                <tr key={r.id}>
                  <td className={`${tdCls} whitespace-nowrap`}>{utcStamp(r.startedAt)}</td>
                  <td className={tdCls}>
                    <Pill tone={rs.tone} title={r.error ?? undefined}>{rs.label}</Pill>
                    {r.error && <div className="mt-1 text-xs text-danger">{r.error}</div>}
                  </td>
                  <td className={`${tdCls} text-right tabular-nums`}>{duration(r.seconds)}</td>
                  <td className={`${tdCls} text-right tabular-nums`}>{bytes(r.sizeBytes)}</td>
                  <td className={`${tdCls} text-right tabular-nums`}>{r.creditsCharged}</td>
                  <td className={`${tdCls} whitespace-nowrap text-muted`}>{r.deletedAt ? `deleted ${utcStamp(r.deletedAt)}` : utcStamp(r.expiresAt)}</td>
                </tr>
              );
            })}
          </Table>
        )}
      </Section>

      {challengeIds.length > 0 && (
        <Section title={`Challenges (${challengeIds.length})`}>
          <Table
            minWidth={560}
            head={
              <>
                <th className={thCls}>#</th>
                <th className={thCls}>Challenge</th>
                <th className={thCls}>Attempts</th>
              </>
            }
          >
            {challengeIds.map((cid, i) => {
              const c = byChallenge.get(cid);
              return (
                <tr key={cid}>
                  <td className={`${tdCls} tabular-nums text-muted`}>{i + 1}</td>
                  <td className={tdCls}>
                    {c ? (
                      <Link href={`/admin/challenges/${c.id}/edit`} className="hover:underline underline-offset-2">
                        {c.title}
                      </Link>
                    ) : (
                      <span className="text-muted">Deleted challenge</span>
                    )}
                    {c?.difficulty && <span className="ml-2 text-xs text-muted">{c.difficulty}</span>}
                  </td>
                  <td className={`${tdCls} text-muted`}>{attemptText(cid) || "None"}</td>
                </tr>
              );
            })}
          </Table>
        </Section>
      )}

      <Section title="Admin history" description="Changes made to this interview from the admin console.">
        {audit.length === 0 ? (
          <Empty title="No admin changes" />
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
            {audit.map((a) => (
              <li key={a.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-2.5 text-sm">
                <span className="text-fg">{actionLabel(a.action)}</span>
                <span className="text-muted">{a.actorEmail ?? "system"}</span>
                <span className="text-xs text-subtle">{utcStamp(a.createdAt)}</span>
                {a.note && <span className="w-full text-muted">“{a.note}”</span>}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
