import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withCronRun } from "@/lib/admin/cron-run";
import { logAdminAction } from "@/lib/admin/audit";
import { clearSwitchCache, switchDef } from "@/lib/admin/switches";

/**
 * Admin housekeeping, every 10 minutes (vercel.json):
 *   1. Feature switches whose "turn back on at" has passed go back to "on".
 *   2. Blog posts, challenges and interview questions whose scheduled publish
 *      time has passed are published.
 * Each change writes an audit row with via "system". Auth: CRON_SECRET.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BATCH = 100;
const SYSTEM_NOTE = "Scheduled time reached";

async function resumeSwitches(now: Date): Promise<number> {
  const due = await prisma.featureSwitch.findMany({
    where: { resumeAt: { lte: now } },
    take: BATCH,
  });
  let resumed = 0;
  for (const sw of due) {
    // Guard on resumeAt so a concurrent edit by a person wins.
    const res = await prisma.featureSwitch.updateMany({
      where: { key: sw.key, resumeAt: sw.resumeAt },
      data: { state: "on", resumeAt: null, updatedById: null, updatedNote: "Turned back on at the scheduled time" },
    });
    if (res.count === 0 || sw.state === "on") continue;
    resumed++;
    await logAdminAction({
      actor: null,
      via: "system",
      action: "switch.set",
      targetType: "switch",
      targetId: sw.key,
      targetLabel: switchDef(sw.key)?.label ?? sw.key,
      before: { state: sw.state, resumeAt: sw.resumeAt },
      after: { state: "on", resumeAt: null },
      note: SYSTEM_NOTE,
    });
  }
  if (due.length > 0) clearSwitchCache();
  return resumed;
}

async function publishBlogs(now: Date): Promise<number> {
  const due = await prisma.blogPost.findMany({
    where: { scheduledAt: { lte: now } },
    select: { id: true, title: true, status: true, published: true, publishedAt: true, scheduledAt: true },
    take: BATCH,
  });
  let n = 0;
  for (const b of due) {
    const res = await prisma.blogPost.updateMany({
      where: { id: b.id, scheduledAt: b.scheduledAt },
      data: { published: true, status: "PUBLISHED", publishedAt: b.publishedAt ?? now, scheduledAt: null },
    });
    if (res.count === 0) continue;
    n++;
    await logAdminAction({
      actor: null,
      via: "system",
      action: "content.blog",
      targetType: "blog",
      targetId: b.id,
      targetLabel: b.title,
      before: { status: b.status, published: b.published, scheduledAt: b.scheduledAt },
      after: { status: "PUBLISHED", published: true, scheduledAt: null },
      note: `Published. ${SYSTEM_NOTE}`,
    });
  }
  return n;
}

async function publishChallenges(now: Date): Promise<number> {
  const due = await prisma.challenge.findMany({
    where: { scheduledAt: { lte: now }, archivedAt: null },
    select: { id: true, title: true, published: true, publishedAt: true, scheduledAt: true },
    take: BATCH,
  });
  let n = 0;
  for (const c of due) {
    const res = await prisma.challenge.updateMany({
      where: { id: c.id, scheduledAt: c.scheduledAt },
      data: { published: true, publishedAt: c.publishedAt ?? now, scheduledAt: null },
    });
    if (res.count === 0) continue;
    n++;
    await logAdminAction({
      actor: null,
      via: "system",
      action: "content.challenge",
      targetType: "challenge",
      targetId: c.id,
      targetLabel: c.title,
      before: { published: c.published, scheduledAt: c.scheduledAt },
      after: { published: true, scheduledAt: null },
      note: `Published. ${SYSTEM_NOTE}`,
    });
  }
  return n;
}

async function publishQuestions(now: Date): Promise<number> {
  const due = await prisma.prepQuestion.findMany({
    where: { scheduledAt: { lte: now } },
    select: { id: true, title: true, status: true, publishedAt: true, scheduledAt: true },
    take: BATCH,
  });
  let n = 0;
  for (const q of due) {
    const res = await prisma.prepQuestion.updateMany({
      where: { id: q.id, scheduledAt: q.scheduledAt },
      data: { status: "published", publishedAt: q.publishedAt ?? now, scheduledAt: null },
    });
    if (res.count === 0) continue;
    n++;
    await logAdminAction({
      actor: null,
      via: "system",
      action: "content.question",
      targetType: "question",
      targetId: q.id,
      targetLabel: q.title,
      before: { status: q.status, scheduledAt: q.scheduledAt },
      after: { status: "published", scheduledAt: null },
      note: `Published. ${SYSTEM_NOTE}`,
    });
  }
  return n;
}

async function run() {
  const now = new Date();
  const switchesResumed = await resumeSwitches(now);
  const [blogs, challenges, questions] = await Promise.all([
    publishBlogs(now),
    publishChallenges(now),
    publishQuestions(now),
  ]);
  return NextResponse.json({ ok: true, switchesResumed, published: { blogs, challenges, questions } });
}

export const GET = withCronRun("admin-housekeeping", run);
export const POST = GET;
