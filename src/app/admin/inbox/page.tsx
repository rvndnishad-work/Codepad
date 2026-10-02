import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isStaff } from "@/lib/permissions/staff";
import { loadUserPermissions } from "@/lib/permissions/access";
import { Pill, cardCls, timeAgo } from "../jobs/ui";

export const metadata = {
  title: "Inbox — Interviewpad Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/**
 * Everything waiting on a decision, oldest first. Open to any staff role;
 * each queue shows only when the person's permissions let them act on it.
 */

const TAKE = 25;
const STALE_SESSION_HOURS = 6;

type Item = { id: string; title: string; meta: string; href: string; external?: boolean; tag?: string };

export default async function AdminInboxPage() {
  const session = await auth().catch(() => null);
  if (!(await isStaff(session))) notFound();
  const perms = session?.user?.id ? ((await loadUserPermissions(session.user.id)) as ReadonlySet<string>) : new Set<string>();
  const isAdmin = perms.has("*") || perms.has("platform:admin");
  const can = (p: string) => isAdmin || perms.has(p);

  const moderate = can("content:moderate") || can("content:curate");
  const staleCutoff = new Date(Date.now() - STALE_SESSION_HOURS * 3600_000);
  const none = Promise.resolve(null);

  const [blogs, blogCount, needsChanges, experiences, expCount, challenges, challengeCount, apps, appCount, reports, reportCount, stale, staleCount] =
    await Promise.all([
      moderate
        ? prisma.blogPost.findMany({
            where: { status: "PENDING" },
            orderBy: { createdAt: "asc" },
            take: TAKE,
            select: { id: true, slug: true, title: true, createdAt: true, user: { select: { name: true } } },
          })
        : none,
      moderate ? prisma.blogPost.count({ where: { status: "PENDING" } }) : none,
      moderate ? prisma.blogPost.count({ where: { status: "NEEDS_CHANGES" } }) : none,
      can("content:moderate")
        ? prisma.prepExperience.findMany({
            where: { status: "pending" },
            orderBy: { createdAt: "asc" },
            take: TAKE,
            select: { id: true, companyName: true, role: true, createdAt: true, company: { select: { name: true } } },
          })
        : none,
      can("content:moderate") ? prisma.prepExperience.count({ where: { status: "pending" } }) : none,
      can("content:moderate")
        ? prisma.challenge.findMany({
            where: { published: false, authorId: { not: null }, archivedAt: null },
            orderBy: { updatedAt: "asc" },
            take: TAKE,
            select: { id: true, title: true, difficulty: true, updatedAt: true, author: { select: { name: true } } },
          })
        : none,
      can("content:moderate") ? prisma.challenge.count({ where: { published: false, authorId: { not: null }, archivedAt: null } }) : none,
      can("creator:review")
        ? prisma.creatorApplication.findMany({
            where: { status: "PENDING" },
            orderBy: { createdAt: "asc" },
            take: TAKE,
            select: { id: true, platform: true, followerCount: true, createdAt: true, userId: true },
          })
        : none,
      can("creator:review") ? prisma.creatorApplication.count({ where: { status: "PENDING" } }) : none,
      can("comment:moderate") || can("content:moderate")
        ? prisma.contentReport.findMany({
            where: { status: "open" },
            orderBy: { createdAt: "asc" },
            take: TAKE,
            select: { id: true, targetType: true, targetId: true, reason: true, detail: true, createdAt: true },
          })
        : none,
      can("comment:moderate") || can("content:moderate") ? prisma.contentReport.count({ where: { status: "open" } }) : none,
      isAdmin
        ? prisma.interviewSession.findMany({
            where: { status: "in_progress", startedAt: { lt: staleCutoff } },
            orderBy: { startedAt: "asc" },
            take: TAKE,
            select: { id: true, title: true, startedAt: true, user: { select: { name: true } } },
          })
        : none,
      isAdmin ? prisma.interviewSession.count({ where: { status: "in_progress", startedAt: { lt: staleCutoff } } }) : none,
    ]);

  // Applicant names in one query.
  const applicantIds = apps?.map((a) => a.userId) ?? [];
  const applicants = applicantIds.length
    ? await prisma.user.findMany({ where: { id: { in: applicantIds } }, select: { id: true, name: true, email: true } })
    : [];
  const applicantName = new Map(applicants.map((u) => [u.id, u.name?.trim() || u.email || "Someone"]));

  const sections: { id: string; title: string; total: number; href: string; action: string; note?: string; empty: string; items: Item[] }[] = [];
  if (blogs)
    sections.push({
      id: "blogs",
      title: "Blogs awaiting review",
      total: blogCount ?? 0,
      href: "/admin/blogs?status=PENDING",
      action: "Review all",
      note: needsChanges ? `${needsChanges} more marked "Needs changes" are waiting on their authors.` : undefined,
      empty: "No blogs waiting for review.",
      items: blogs.map((b) => ({
        id: b.id,
        title: b.title,
        meta: `by ${b.user.name ?? "Anonymous"}, submitted ${timeAgo(b.createdAt).toLowerCase()}`,
        href: `/admin/blogs?q=${encodeURIComponent(b.slug)}`,
      })),
    });
  if (experiences)
    sections.push({
      id: "experiences",
      title: "Experiences to moderate",
      total: expCount ?? 0,
      href: "/admin/interview-questions/experiences?status=pending",
      action: "Moderate",
      empty: "No interview experiences waiting.",
      items: experiences.map((e) => ({
        id: e.id,
        title: [e.company?.name ?? e.companyName ?? "Unknown company", e.role].filter(Boolean).join(", "),
        meta: `submitted ${timeAgo(e.createdAt).toLowerCase()}`,
        href: "/admin/interview-questions/experiences?status=pending",
      })),
    });
  if (reports)
    sections.push({
      id: "reports",
      title: "Open content reports",
      total: reportCount ?? 0,
      href: "/admin/community",
      action: "Open community",
      empty: "No open reports.",
      items: reports.map((r) => ({
        id: r.id,
        title: r.reason,
        meta: `${r.targetType.replace(/_/g, " ")}${r.detail ? `: ${r.detail.slice(0, 120)}` : ""}, reported ${timeAgo(r.createdAt).toLowerCase()}`,
        href: "/admin/community",
        tag: r.targetType.replace(/_/g, " "),
      })),
    });
  if (challenges)
    sections.push({
      id: "challenges",
      title: "Community challenges awaiting review",
      total: challengeCount ?? 0,
      href: "/admin/challenges",
      action: "See all",
      empty: "No community challenges waiting.",
      items: challenges.map((c) => ({
        id: c.id,
        title: c.title,
        meta: `by ${c.author?.name ?? "Anonymous"}, updated ${timeAgo(c.updatedAt).toLowerCase()}`,
        href: `/admin/challenges/${c.id}/edit`,
        tag: c.difficulty,
      })),
    });
  if (apps)
    sections.push({
      id: "creators",
      title: "Creator applications",
      total: appCount ?? 0,
      href: "/admin/creators?status=PENDING",
      action: "Review",
      empty: "No applications waiting.",
      items: apps.map((a) => ({
        id: a.id,
        title: applicantName.get(a.userId) ?? "Someone",
        meta: `${a.platform}, ${a.followerCount.toLocaleString()} followers, applied ${timeAgo(a.createdAt).toLowerCase()}`,
        href: "/admin/creators?status=PENDING",
      })),
    });
  if (stale)
    sections.push({
      id: "sessions",
      title: `Interview sessions in progress for over ${STALE_SESSION_HOURS} h`,
      total: staleCount ?? 0,
      href: "/admin/interviews?status=in_progress",
      action: "All sessions",
      empty: "No stalled sessions.",
      items: stale.map((s) => ({
        id: s.id,
        title: s.title,
        meta: `${s.user.name ?? "Anonymous"}, started ${s.startedAt ? timeAgo(s.startedAt).toLowerCase() : "at an unknown time"}`,
        href: `/admin/interviews/${s.id}`,
      })),
    });

  const waiting = sections.reduce((a, s) => a + s.total, 0);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl md:text-[26px] font-semibold tracking-[-0.02em] text-fg">Inbox</h1>
          <p className="text-sm text-muted">Items waiting on a decision, oldest first in each queue.</p>
        </div>
        {sections.length > 0 && (waiting === 0 ? <Pill tone="ok">All clear</Pill> : <Pill tone="warn">{waiting.toLocaleString()} waiting</Pill>)}
      </header>

      {sections.length === 0 && (
        <div className={`${cardCls} px-6 py-12 text-center text-[13px] text-muted`}>
          Your role has no review queues. Ask a platform admin if you expected to see some here.
        </div>
      )}

      {sections.map((s) => (
        <section key={s.id} id={s.id} aria-label={s.title} className={`${cardCls} overflow-hidden scroll-mt-6`}>
          <div className="px-4 py-3 border-b border-border bg-panel flex items-center gap-3">
            <h2 className="text-sm font-semibold text-fg flex-1">
              {s.title} <span className="ml-1 text-muted font-normal tabular-nums">{s.total.toLocaleString()}</span>
            </h2>
            <Link href={s.href} className="inline-flex items-center gap-1 text-[13px] text-secondary-soft hover:underline underline-offset-2">
              {s.action}
              <ArrowRight className="w-3.5 h-3.5" aria-hidden />
            </Link>
          </div>
          {s.items.length === 0 ? (
            <div className="px-4 py-8 flex flex-col items-center gap-2 text-center">
              <CheckCircle2 className="w-5 h-5 text-success" aria-hidden />
              <p className="text-[13px] text-muted">{s.empty}</p>
              {s.note && <p className="text-[13px] text-subtle">{s.note}</p>}
            </div>
          ) : (
            <>
              <ul>
                {s.items.map((it, i) => (
                  <li key={it.id} className={`px-4 py-2.5 flex items-center gap-3 hover:bg-panel/60 ${i === 0 ? "" : "border-t border-border"}`}>
                    <div className="min-w-0 flex-1">
                      <Link href={it.href} className="block text-sm font-medium text-fg truncate hover:underline underline-offset-2">
                        {it.title}
                      </Link>
                      <p className="text-[13px] text-muted truncate">{it.meta}</p>
                    </div>
                    {it.tag && <Pill tone="off">{it.tag}</Pill>}
                  </li>
                ))}
              </ul>
              {(s.note || s.total > s.items.length) && (
                <div className="px-4 py-2.5 border-t border-border text-[13px] text-subtle">
                  {s.total > s.items.length && `Showing the oldest ${s.items.length} of ${s.total.toLocaleString()}. `}
                  {s.note}
                </div>
              )}
            </>
          )}
        </section>
      ))}
    </div>
  );
}
