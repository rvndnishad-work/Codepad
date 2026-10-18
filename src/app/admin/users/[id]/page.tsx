import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdminAccess, staffCan } from "@/lib/permissions/staff";
import { accountState } from "@/lib/auth-gate";
import { actionLabel } from "@/lib/admin/audit";
import StatusPill, { SmallPill } from "../_components/StatusPill";
import { fmtAgo, fmtDay, fmtDayTime } from "../_lib/format";
import { hardDeleteBlockerFor } from "../_lib/ops";
import { screeningsSentBy } from "../_lib/load";
import UserActionsBar from "./UserActionsBar";
import { SCREENED_USER_TYPE } from "@/lib/users/user-type";
import ProfileForm from "./ProfileForm";

type Props = { params: Promise<{ id: string }> };

const ROLE_LABEL: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  RECRUITER: "Recruiter",
  INTERVIEWER: "Interviewer",
  VIEWER: "Viewer",
};

function Card({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-surface">
      <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border">
        <h2 className="text-sm font-medium text-fg">{title}</h2>
        {aside}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className="text-fg text-right min-w-0 break-words">{children}</dd>
    </div>
  );
}

function auditDetail(before: unknown, after: unknown): string | null {
  const b = (before ?? {}) as Record<string, unknown>;
  const a = (after ?? {}) as Record<string, unknown>;
  const keys = [...new Set([...Object.keys(b), ...Object.keys(a)])].filter(
    (k) => JSON.stringify(b[k]) !== JSON.stringify(a[k]),
  );
  if (!keys.length) return null;
  const show = (v: unknown) => (v == null || v === "" ? "none" : typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v) ? fmtDayTime(v) : String(v));
  return keys
    .slice(0, 4)
    .map((k) => `${k}: ${show(b[k])} → ${show(a[k])}`)
    .join("; ");
}

export default async function AdminUserDetailPage({ params }: Props) {
  const { id } = await params;
  // The old candidates list lived at /admin/users/candidates.
  if (id === "candidates") redirect("/admin/users");

  const session = await requireAdminAccess("user:manage");
  const isPlatformAdmin = await staffCan(session, "platform:admin");
  const actor = { id: session?.user?.id, email: session?.user?.email, isPlatformAdmin };

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      bio: true,
      hireMeUrl: true,
      portfolioPublic: true,
      userType: true,
      companyName: true,
      jobTitle: true,
      createdAt: true,
      emailVerified: true,
      lastSignInAt: true,
      banned: true,
      bannedReason: true,
      bannedUntil: true,
      bannedAt: true,
      bannedById: true,
      deletedAt: true,
      sessionsRevokedAt: true,
      totpEnabledAt: true,
      passwordHash: true,
      accounts: { select: { provider: true }, take: 10 },
      roles: { select: { role: { select: { key: true, label: true } } } },
      _count: {
        select: {
          snippets: true,
          attempts: true,
          blogs: true,
          blogComments: true,
          prepQuestionComments: true,
          interviewSessions: true,
          followers: true,
        },
      },
    },
  });
  if (!user) notFound();

  const [history, signIns, memberships, attempts, bannedBy, screenings, purgeBlocker] = await Promise.all([
    prisma.adminAuditLog.findMany({
      where: { targetType: "user", targetId: id },
      orderBy: { createdAt: "desc" },
      take: 25,
      select: { id: true, action: true, actorEmail: true, via: true, before: true, after: true, note: true, createdAt: true },
    }),
    prisma.activityEvent.findMany({
      where: { kind: "sign_in", userId: id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, label: true, createdAt: true },
    }),
    prisma.workspaceMember.findMany({
      where: { userId: id },
      take: 25,
      select: {
        role: true,
        lastActiveAt: true,
        workspace: { select: { id: true, name: true, planName: true, trialEndsAt: true } },
      },
    }),
    prisma.challengeAttempt.findMany({
      where: { userId: id },
      orderBy: { startedAt: "desc" },
      take: 6,
      select: { id: true, status: true, score: true, startedAt: true, challenge: { select: { title: true } } },
    }),
    user.bannedById
      ? prisma.user.findUnique({ where: { id: user.bannedById }, select: { name: true, email: true } })
      : Promise.resolve(null),
    screeningsSentBy([id]),
    isPlatformAdmin ? hardDeleteBlockerFor(actor, id) : Promise.resolve(null),
  ]);

  const now = Date.now();
  const state = accountState(user);
  const side = user.userType === "recruiter" ? "recruiters" : user.userType === SCREENED_USER_TYPE ? "candidates" : "developers";
  const backHref = side === "recruiters" ? "/admin/users/recruiters" : side === "candidates" ? "/admin/users/candidates" : "/admin/users";
  const providers = [...new Set(user.accounts.map((a) => a.provider))];
  if (user.passwordHash) providers.unshift("password");

  const target = {
    id: user.id,
    label: user.name || user.email || user.id,
    email: user.email,
    state,
    banned: user.banned,
    emailVerified: user.emailVerified != null,
    twoFactor: user.totpEnabledAt != null,
  };

  return (
    <div className="space-y-5 max-w-6xl">
      <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft className="w-4 h-4" /> {side === "recruiters" ? "Recruiter accounts" : side === "candidates" ? "Candidate accounts" : "Developer accounts"}
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt="" className="w-12 h-12 rounded-full border border-border object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-full border border-border bg-panel flex items-center justify-center text-sm text-muted">
              {(user.name || user.email || "?").slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-semibold tracking-tight text-fg truncate">{user.name || "No name"}</h1>
              <StatusPill state={state} until={user.bannedUntil?.toISOString() ?? null} />
              {user.roles.map((r) => (
                <SmallPill key={r.role.key} tone="off">{r.role.label}</SmallPill>
              ))}
            </div>
            <p className="text-sm text-muted truncate">
              {user.email ?? "No email"} · {user.userType ?? "no type"} · joined {fmtDay(user.createdAt)}
            </p>
          </div>
        </div>
        <Link href={`/u/${user.id}`} target="_blank" className="h-9 px-3.5 rounded-lg border border-border bg-surface text-sm text-fg hover:bg-panel inline-flex items-center gap-1.5 self-start">
          Public profile <ExternalLink className="w-4 h-4" />
        </Link>
      </div>

      <Card title="Actions">
        <UserActionsBar target={target} canHardDelete={isPlatformAdmin} hardDeleteBlocker={purgeBlocker} />
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <Card title="Status">
          <dl className="divide-y divide-border">
            <Fact label="Account">
              <StatusPill state={state} until={user.bannedUntil?.toISOString() ?? null} />
            </Fact>
            {user.banned && (
              <>
                <Fact label="Suspension reason">{user.bannedReason ?? "None given"}</Fact>
                <Fact label="Suspended">
                  {user.bannedAt ? fmtDayTime(user.bannedAt) : "Unknown"}
                  {bannedBy ? ` by ${bannedBy.name || bannedBy.email}` : ""}
                </Fact>
                <Fact label="Until">{user.bannedUntil ? fmtDayTime(user.bannedUntil) : "No end date"}</Fact>
              </>
            )}
            {user.deletedAt && <Fact label="Deleted">{fmtDayTime(user.deletedAt)}</Fact>}
            <Fact label="Email">{user.emailVerified ? `Verified ${fmtDay(user.emailVerified)}` : "Not verified"}</Fact>
            <Fact label="Two-factor">{user.totpEnabledAt ? `On since ${fmtDay(user.totpEnabledAt)}` : "Off"}</Fact>
            <Fact label="Sign-in methods">{providers.length ? providers.join(", ") : "None"}</Fact>
            <Fact label="Last sign-in">{user.lastSignInAt ? `${fmtAgo(user.lastSignInAt, now)} (${fmtDayTime(user.lastSignInAt)})` : "Never recorded"}</Fact>
            <Fact label="Sessions revoked">{user.sessionsRevokedAt ? fmtDayTime(user.sessionsRevokedAt) : "Never"}</Fact>
            <Fact label="User id"><code className="font-mono text-xs">{user.id}</code></Fact>
          </dl>
        </Card>

        <Card title="Profile">
          <ProfileForm
            user={{
              id: user.id,
              name: user.name,
              email: user.email,
              bio: user.bio,
              hireMeUrl: user.hireMeUrl,
              portfolioPublic: user.portfolioPublic,
            }}
          />
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Content">
          <dl className="divide-y divide-border">
            <Fact label="Challenge attempts">{user._count.attempts}</Fact>
            <Fact label="Snippets">{user._count.snippets}</Fact>
            <Fact label="Blogs">{user._count.blogs}</Fact>
            <Fact label="Blog comments">{user._count.blogComments}</Fact>
            <Fact label="Question comments">{user._count.prepQuestionComments}</Fact>
            <Fact label="Followers">{user._count.followers}</Fact>
            <Fact label="Interviews hosted">{user._count.interviewSessions}</Fact>
            <Fact label="AI screenings sent">{screenings.get(id) ?? 0}</Fact>
          </dl>
        </Card>

        <Card title="Workspaces">
          {memberships.length === 0 ? (
            <p className="text-sm text-muted">Not a member of any workspace.</p>
          ) : (
            <ul className="divide-y divide-border">
              {memberships.map((m) => (
                <li key={m.workspace.id} className="py-2 text-sm flex items-baseline justify-between gap-3">
                  <Link href={`/admin/workspaces/${m.workspace.id}`} className="text-fg hover:underline truncate">
                    {m.workspace.name}
                  </Link>
                  <span className="text-muted whitespace-nowrap">
                    {ROLE_LABEL[m.role] ?? m.role} · {m.workspace.trialEndsAt && m.workspace.trialEndsAt.getTime() > now && m.workspace.planName === "FREE" ? "Trial" : m.workspace.planName.charAt(0) + m.workspace.planName.slice(1).toLowerCase()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Sign-ins">
          {signIns.length === 0 ? (
            <p className="text-sm text-muted">No sign-ins recorded yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {signIns.map((s) => (
                <li key={s.id} className="py-2 text-sm flex items-baseline justify-between gap-3">
                  <span className="text-fg">{s.label ?? "Unknown"}</span>
                  <span className="text-muted whitespace-nowrap" title={fmtDayTime(s.createdAt)}>{fmtAgo(s.createdAt, now)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <Card title="Recent attempts" aside={user._count.attempts > 0 ? <Link href={`/admin/attempts?q=${encodeURIComponent(user.email ?? user.id)}`} className="text-xs text-muted hover:text-fg">All attempts</Link> : undefined}>
          {attempts.length === 0 ? (
            <p className="text-sm text-muted">No attempts.</p>
          ) : (
            <ul className="divide-y divide-border">
              {attempts.map((a) => (
                <li key={a.id} className="py-2 text-sm flex items-baseline justify-between gap-3">
                  <Link href={`/admin/attempts/${a.id}`} className="text-fg hover:underline truncate">{a.challenge.title}</Link>
                  <span className="text-muted whitespace-nowrap">
                    {a.status.replace(/_/g, " ")}
                    {a.score != null ? ` · ${a.score}` : ""} · {fmtDay(a.startedAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="History">
          {history.length === 0 ? (
            <p className="text-sm text-muted">No admin actions on this account yet.</p>
          ) : (
            <ol className="divide-y divide-border">
              {history.map((h) => {
                const detail = auditDetail(h.before, h.after);
                return (
                  <li key={h.id} className="py-2.5 text-sm">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-fg font-medium">{actionLabel(h.action)}</span>
                      <span className="text-muted whitespace-nowrap text-xs">{fmtDayTime(h.createdAt)}</span>
                    </div>
                    <p className="text-muted text-xs mt-0.5">
                      {h.via === "system" ? "System" : h.actorEmail ?? "Unknown admin"}
                      {h.note ? ` · ${h.note}` : ""}
                    </p>
                    {detail && <p className="text-subtle text-xs mt-0.5 break-words">{detail}</p>}
                  </li>
                );
              })}
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
}
