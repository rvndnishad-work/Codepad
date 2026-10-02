"use server";

/**
 * Approvals for the alerts the hourly scan raises (GemmaAlert). Each action:
 *   1. checks platform:admin,
 *   2. makes the change and resolves the alert in one transaction,
 *   3. writes the platform audit log (via "admin", note "From alert"),
 *   4. revalidates the pages that show the change.
 * The alerts are listed on /admin/assistant (Alerts).
 */
import { auth } from "@/lib/auth";
import { staffCan } from "@/lib/permissions/staff";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { logAdminAction, type AdminActor } from "@/lib/admin/audit";

type Tx = Prisma.TransactionClient;

async function assertAdmin(): Promise<AdminActor> {
  const session = await auth().catch(() => null);
  if (!(await staffCan(session, "platform:admin"))) {
    throw new Error("Unauthorized: Platform administrator rights required.");
  }
  return { id: session?.user?.id ?? null, email: session?.user?.email ?? null };
}

async function resolveAlert(tx: Tx, alertId: string) {
  await tx.gemmaAlert.update({ where: { id: alertId }, data: { status: "RESOLVED", resolvedAt: new Date() } });
}

function audit(
  tx: Tx,
  actor: AdminActor,
  alertId: string,
  entry: { action: string; targetType: string; targetId: string; targetLabel?: string | null; before?: unknown; after?: unknown },
) {
  return logAdminAction({ actor, via: "admin", note: `From alert ${alertId}`, ...entry }, tx);
}

function refresh(...paths: string[]) {
  for (const p of ["/admin/assistant", ...paths]) revalidatePath(p);
}

// 1. Suspend a user flagged by the scan.
export async function banUserAction(userId: string, alertId: string) {
  const actor = await assertAdmin();
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, banned: true } });
  if (!user) throw new Error("User not found.");
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { banned: true, bannedAt: new Date(), bannedById: actor.id ?? null, bannedReason: "Flagged by the alert scan" },
    });
    await resolveAlert(tx, alertId);
    await audit(tx, actor, alertId, { action: "user.suspend", targetType: "user", targetId: userId, targetLabel: user.email, before: { banned: user.banned }, after: { banned: true } });
  });
  refresh("/admin/users");
  return { success: true };
}

// 2. Archive a stalled interview session (>6 hours in progress).
export async function archiveSessionAction(sessionId: string, alertId: string) {
  const actor = await assertAdmin();
  const session = await prisma.interviewSession.findUnique({ where: { id: sessionId }, select: { title: true, status: true } });
  if (!session) throw new Error("Interview session not found.");
  await prisma.$transaction(async (tx) => {
    await tx.interviewSession.update({ where: { id: sessionId }, data: { status: "abandoned", finishedAt: new Date() } });
    await resolveAlert(tx, alertId);
    await audit(tx, actor, alertId, { action: "interview.archive", targetType: "interview", targetId: sessionId, targetLabel: session.title, before: { status: session.status }, after: { status: "abandoned" } });
  });
  refresh("/admin/interviews", "/admin/inbox");
  return { success: true };
}

async function setBlogStatus(postId: string, alertId: string, status: string, adminNotes?: string) {
  const actor = await assertAdmin();
  const post = await prisma.blogPost.findUnique({ where: { id: postId }, select: { title: true, status: true, publishedAt: true } });
  if (!post) throw new Error("Blog post not found.");
  await prisma.$transaction(async (tx) => {
    await tx.blogPost.update({
      where: { id: postId },
      data: {
        status,
        published: status === "PUBLISHED",
        ...(adminNotes !== undefined ? { adminNotes } : {}),
        ...(status === "PUBLISHED" && !post.publishedAt ? { publishedAt: new Date() } : {}),
      },
    });
    await resolveAlert(tx, alertId);
    await audit(tx, actor, alertId, { action: "content.blog", targetType: "blog", targetId: postId, targetLabel: post.title, before: { status: post.status }, after: { status } });
  });
  refresh("/admin/blogs", "/admin/inbox");
  return { success: true };
}

// 3. Publish a blog post from the moderation queue.
export async function approveBlogPostAction(postId: string, alertId: string) {
  return setBlogStatus(postId, alertId, "PUBLISHED");
}

// 4. Send a blog post back for changes with feedback.
export async function rejectBlogPostAction(postId: string, alertId: string, notes: string) {
  const feedback = notes?.trim() || "Formatting guidelines violation. Please review affiliate link rules.";
  return setBlogStatus(postId, alertId, "NEEDS_CHANGES", feedback);
}

// 5. Dismiss an alert without acting.
export async function dismissAlertAction(alertId: string) {
  await assertAdmin();
  await prisma.gemmaAlert.update({ where: { id: alertId }, data: { status: "DISMISSED", resolvedAt: new Date() } });
  refresh();
  return { success: true };
}

// 6. Lift a suspension (false positive).
export async function unbanUserAction(userId: string, alertId: string) {
  const actor = await assertAdmin();
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!user) throw new Error("User not found.");
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { banned: false, bannedAt: null, bannedReason: null, bannedUntil: null, bannedById: null } });
    await resolveAlert(tx, alertId);
    await audit(tx, actor, alertId, { action: "user.unsuspend", targetType: "user", targetId: userId, targetLabel: user.email, after: { banned: false } });
  });
  refresh("/admin/users");
  return { success: true };
}

async function setBlogFeatured(postId: string, alertId: string, featured: boolean) {
  const actor = await assertAdmin();
  const post = await prisma.blogPost.findUnique({ where: { id: postId }, select: { title: true } });
  if (!post) throw new Error("Blog post not found.");
  await prisma.$transaction(async (tx) => {
    await tx.blogPost.update({ where: { id: postId }, data: { featured } });
    await resolveAlert(tx, alertId);
    await audit(tx, actor, alertId, { action: "content.blog", targetType: "blog", targetId: postId, targetLabel: post.title, after: { featured } });
  });
  refresh("/admin/blogs");
  return { success: true };
}

// 7. Feature a blog post.
export async function featureBlogPostAction(postId: string, alertId: string) {
  return setBlogFeatured(postId, alertId, true);
}

// 8. Unfeature a blog post.
export async function unfeatureBlogPostAction(postId: string, alertId: string) {
  return setBlogFeatured(postId, alertId, false);
}

// 9. Delete a comment (replies go with it).
export async function deleteCommentAction(commentId: string, alertId: string) {
  const actor = await assertAdmin();
  const comment = await prisma.blogComment.findUnique({
    where: { id: commentId },
    select: { content: true, user: { select: { email: true } } },
  });
  if (!comment) throw new Error("Comment not found.");
  await prisma.$transaction(async (tx) => {
    await tx.blogComment.delete({ where: { id: commentId } });
    await resolveAlert(tx, alertId);
    await audit(tx, actor, alertId, {
      action: "content.comment.delete", targetType: "blog_comment", targetId: commentId, targetLabel: comment.user?.email ?? null,
      before: { excerpt: comment.content.slice(0, 200) },
    });
  });
  refresh("/admin/comments");
  return { success: true };
}

async function setChallengePublished(challengeId: string, alertId: string, published: boolean) {
  const actor = await assertAdmin();
  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId }, select: { title: true, published: true } });
  if (!challenge) throw new Error("Challenge not found.");
  await prisma.$transaction(async (tx) => {
    await tx.challenge.update({ where: { id: challengeId }, data: { published } });
    await resolveAlert(tx, alertId);
    await audit(tx, actor, alertId, { action: "content.challenge", targetType: "challenge", targetId: challengeId, targetLabel: challenge.title, before: { published: challenge.published }, after: { published } });
  });
  refresh("/admin/challenges");
  return { success: true };
}

// 10. Publish a draft challenge.
export async function publishChallengeAction(challengeId: string, alertId: string) {
  return setChallengePublished(challengeId, alertId, true);
}

// 11. Take a challenge offline.
export async function unpublishChallengeAction(challengeId: string, alertId: string) {
  return setChallengePublished(challengeId, alertId, false);
}

// 12. Move an AdminTodo to a new status.
const VALID_TODO_STATUSES = new Set(["BACKLOG", "TODO", "IN_PROGRESS", "DONE"]);
export async function setTodoStatusAction(todoId: string, newStatus: string, alertId: string) {
  const actor = await assertAdmin();
  if (!VALID_TODO_STATUSES.has(newStatus)) throw new Error(`Invalid todo status: ${newStatus}`);
  const todo = await prisma.adminTodo.findUnique({ where: { id: todoId }, select: { status: true, ticketKey: true } });
  if (!todo) throw new Error("Todo not found.");
  await prisma.$transaction(async (tx) => {
    await tx.adminTodo.update({
      where: { id: todoId },
      data: { status: newStatus, completedAt: newStatus === "DONE" ? new Date() : null },
    });
    await resolveAlert(tx, alertId);
    await audit(tx, actor, alertId, { action: "todo.status", targetType: "todo", targetId: todoId, targetLabel: todo.ticketKey, before: { status: todo.status }, after: { status: newStatus } });
  });
  refresh("/admin/todos");
  return { success: true };
}

// 13. Archive every stalled session (>6 hours in progress) at once.
export async function bulkArchiveStalledSessionsAction(alertId: string) {
  const actor = await assertAdmin();
  const staleCutoff = new Date(Date.now() - 6 * 60 * 60 * 1000);
  const stale = await prisma.interviewSession.findMany({
    where: { status: "in_progress", startedAt: { lt: staleCutoff } },
    take: 500,
    select: { id: true },
  });
  const ids = stale.map((s) => s.id);
  await prisma.$transaction(async (tx) => {
    if (ids.length) {
      await tx.interviewSession.updateMany({ where: { id: { in: ids } }, data: { status: "abandoned", finishedAt: new Date() } });
      await tx.gemmaAlert.updateMany({
        where: { type: "SYSTEM_STALL", status: "UNRESOLVED", targetId: { in: ids } },
        data: { status: "RESOLVED", resolvedAt: new Date() },
      });
    }
    await resolveAlert(tx, alertId);
    if (ids.length) {
      await audit(tx, actor, alertId, { action: "interview.archive.bulk", targetType: "interview", targetId: ids[0], targetLabel: `${ids.length} sessions`, after: { archived: ids.length, ids } });
    }
  });
  refresh("/admin/interviews");
  return { success: true, archived: ids.length };
}

// 14. Add an AdminTodo from an alert.
export async function createTodoFromAlertAction(
  title: string,
  body: string,
  priority: "LOW" | "MEDIUM" | "HIGH",
  category: string,
  alertId: string,
) {
  const actor = await assertAdmin();
  await prisma.$transaction(async (tx) => {
    const last = await tx.adminTodo.findFirst({
      where: { ticketSeq: { not: null } },
      orderBy: { ticketSeq: "desc" },
      select: { ticketSeq: true },
    });
    const seq = (last?.ticketSeq ?? 0) + 1;
    const todo = await tx.adminTodo.create({
      data: {
        title: title.trim(),
        body: body.trim(),
        priority,
        category: category?.trim() || "AI Alert",
        addedByEmail: actor.email ?? null,
        ticketSeq: seq,
        ticketKey: `IP-${seq}`,
        acceptanceCriteria: JSON.stringify([
          { text: "Investigate telemetry report details attached to alert.", done: false },
          { text: "Implement root fix and verify metrics stability.", done: false },
        ]),
      },
      select: { id: true, ticketKey: true },
    });
    await resolveAlert(tx, alertId);
    await audit(tx, actor, alertId, { action: "todo.create", targetType: "todo", targetId: todo.id, targetLabel: todo.ticketKey, after: { title } });
  });
  refresh("/admin/todos");
  return { success: true };
}
