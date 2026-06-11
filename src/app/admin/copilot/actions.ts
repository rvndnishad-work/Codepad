"use server";

import { auth } from "@/lib/auth";
import { staffCan } from "@/lib/permissions/staff";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ensureSystemAdminWorkspace } from "@/lib/admin-system-workspace";

async function assertAdmin(): Promise<string> {
  const session = await auth().catch(() => null);
  if (!(await staffCan(session, "platform:admin"))) {
    throw new Error("Unauthorized: Platform administrator rights required.");
  }
  return session?.user?.email || "admin@interviewpad.in";
}

// 1. Ban a suspicious spam/abusive user
export async function banUserAction(userId: string, alertId: string) {
  const adminEmail = await assertAdmin();
  const systemWorkspaceId = await ensureSystemAdminWorkspace();

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found.");

  await prisma.$transaction(async (tx) => {
    // Ban the user
    await tx.user.update({
      where: { id: userId },
      data: { banned: true }
    });

    // Resolve the alert
    await tx.gemmaAlert.update({
      where: { id: alertId },
      data: {
        status: "RESOLVED",
        resolvedAt: new Date()
      }
    });

    // Write to MCP audit logs as a system-level administrative action
    await tx.mcpAuditLog.create({
      data: {
        workspaceId: systemWorkspaceId,
        kind: "HITL_ACTION",
        name: "ban_suspicious_user",
        argsJson: JSON.stringify({ userId, userName: user.name, userEmail: user.email, approvedBy: adminEmail }),
        resultSummary: `Successfully banned user ${user.email} based on Gemma RAG anomaly trigger.`,
        durationMs: 0
      }
    });
  });

  revalidatePath("/admin/copilot");
  revalidatePath("/admin/users");
  return { success: true };
}

// 2. Archive stalled active interview session (>6 hours in-progress)
export async function archiveSessionAction(sessionId: string, alertId: string) {
  const adminEmail = await assertAdmin();
  const systemWorkspaceId = await ensureSystemAdminWorkspace();

  const session = await prisma.interviewSession.findUnique({ where: { id: sessionId } });
  if (!session) throw new Error("Interview session not found.");

  await prisma.$transaction(async (tx) => {
    // Set status to abandoned
    await tx.interviewSession.update({
      where: { id: sessionId },
      data: { status: "abandoned", finishedAt: new Date() }
    });

    // Resolve the alert
    await tx.gemmaAlert.update({
      where: { id: alertId },
      data: {
        status: "RESOLVED",
        resolvedAt: new Date()
      }
    });

    await tx.mcpAuditLog.create({
      data: {
        workspaceId: session.workspaceId || systemWorkspaceId,
        kind: "HITL_ACTION",
        name: "archive_stalled_session",
        argsJson: JSON.stringify({ sessionId, title: session.title, candidateName: session.candidateName, approvedBy: adminEmail }),
        resultSummary: `Archived stalled session ${sessionId} (marked abandoned).`,
        durationMs: 0
      }
    });
  });

  revalidatePath("/admin/copilot");
  revalidatePath("/admin/interviews");
  revalidatePath("/admin/inbox");
  return { success: true };
}

// 3. Approve blog post submission from moderation queue
export async function approveBlogPostAction(postId: string, alertId: string) {
  const adminEmail = await assertAdmin();
  const systemWorkspaceId = await ensureSystemAdminWorkspace();

  const post = await prisma.blogPost.findUnique({ where: { id: postId } });
  if (!post) throw new Error("Blog post not found.");

  await prisma.$transaction(async (tx) => {
    // Approve blog post
    await tx.blogPost.update({
      where: { id: postId },
      data: { status: "PUBLISHED", published: true }
    });

    // Resolve the alert
    await tx.gemmaAlert.update({
      where: { id: alertId },
      data: {
        status: "RESOLVED",
        resolvedAt: new Date()
      }
    });

    await tx.mcpAuditLog.create({
      data: {
        workspaceId: systemWorkspaceId,
        kind: "HITL_ACTION",
        name: "approve_blog_post",
        argsJson: JSON.stringify({ postId, title: post.title, approvedBy: adminEmail }),
        resultSummary: `Approved and published blog post "${post.title}".`,
        durationMs: 0
      }
    });
  });

  revalidatePath("/admin/copilot");
  revalidatePath("/admin/blogs");
  revalidatePath("/admin/inbox");
  return { success: true };
}

// 4. Send "needs changes" feedback for blog post
export async function rejectBlogPostAction(postId: string, alertId: string, notes: string) {
  const adminEmail = await assertAdmin();
  const systemWorkspaceId = await ensureSystemAdminWorkspace();

  const post = await prisma.blogPost.findUnique({ where: { id: postId } });
  if (!post) throw new Error("Blog post not found.");

  const feedback = notes?.trim() || "Formatting guidelines violation. Please review affiliate link rules.";

  await prisma.$transaction(async (tx) => {
    // Set status to NEEDS_CHANGES
    await tx.blogPost.update({
      where: { id: postId },
      data: { status: "NEEDS_CHANGES", adminNotes: feedback }
    });

    // Resolve the alert
    await tx.gemmaAlert.update({
      where: { id: alertId },
      data: {
        status: "RESOLVED",
        resolvedAt: new Date()
      }
    });

    await tx.mcpAuditLog.create({
      data: {
        workspaceId: systemWorkspaceId,
        kind: "HITL_ACTION",
        name: "reject_blog_post",
        argsJson: JSON.stringify({ postId, title: post.title, feedback, approvedBy: adminEmail }),
        resultSummary: `Marked blog post "${post.title}" as Needs Changes. Feedback sent to author.`,
        durationMs: 0
      }
    });
  });

  revalidatePath("/admin/copilot");
  revalidatePath("/admin/blogs");
  revalidatePath("/admin/inbox");
  return { success: true };
}

// 5. Dismiss/Mute alert without action
export async function dismissAlertAction(alertId: string) {
  await assertAdmin();

  await prisma.gemmaAlert.update({
    where: { id: alertId },
    data: { 
      status: "DISMISSED", 
      resolvedAt: new Date() 
    }
  });

  revalidatePath("/admin/copilot");
  return { success: true };
}

/* ───────────────────────────────────────────────────────────────────────
 * Expanded admin-page coverage. Each action follows the same shape:
 *   1. assertAdmin() to gate the call
 *   2. ensureSystemAdminWorkspace() so the audit log row has a valid FK
 *   3. transactional update + alert resolution + McpAuditLog entry
 *   4. revalidatePath for the surfaces that need to re-render
 * That way every operation Gemma proposes has an immutable forensic trail
 * (admin email + tool name + args + result), regardless of which surface it
 * was fired from.
 * ─────────────────────────────────────────────────────────────────────── */

// 6. Lift a ban — useful when a Gemma alert was a false positive.
export async function unbanUserAction(userId: string, alertId: string) {
  const adminEmail = await assertAdmin();
  const systemWorkspaceId = await ensureSystemAdminWorkspace();

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found.");

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { banned: false } });
    await tx.gemmaAlert.update({
      where: { id: alertId },
      data: { status: "RESOLVED", resolvedAt: new Date() },
    });
    await tx.mcpAuditLog.create({
      data: {
        workspaceId: systemWorkspaceId,
        kind: "HITL_ACTION",
        name: "unban_user",
        argsJson: JSON.stringify({ userId, userEmail: user.email, approvedBy: adminEmail }),
        resultSummary: `Lifted ban on ${user.email}.`,
        durationMs: 0,
      },
    });
  });

  revalidatePath("/admin/copilot");
  revalidatePath("/admin/users");
  return { success: true };
}

// 7. Promote a blog post to "featured" status.
export async function featureBlogPostAction(postId: string, alertId: string) {
  const adminEmail = await assertAdmin();
  const systemWorkspaceId = await ensureSystemAdminWorkspace();

  const post = await prisma.blogPost.findUnique({ where: { id: postId } });
  if (!post) throw new Error("Blog post not found.");

  await prisma.$transaction(async (tx) => {
    await tx.blogPost.update({ where: { id: postId }, data: { featured: true } });
    await tx.gemmaAlert.update({
      where: { id: alertId },
      data: { status: "RESOLVED", resolvedAt: new Date() },
    });
    await tx.mcpAuditLog.create({
      data: {
        workspaceId: systemWorkspaceId,
        kind: "HITL_ACTION",
        name: "feature_blog_post",
        argsJson: JSON.stringify({ postId, title: post.title, approvedBy: adminEmail }),
        resultSummary: `Featured blog post "${post.title}".`,
        durationMs: 0,
      },
    });
  });

  revalidatePath("/admin/copilot");
  revalidatePath("/admin/blogs");
  return { success: true };
}

// 8. Remove a blog post from the featured rail.
export async function unfeatureBlogPostAction(postId: string, alertId: string) {
  const adminEmail = await assertAdmin();
  const systemWorkspaceId = await ensureSystemAdminWorkspace();

  const post = await prisma.blogPost.findUnique({ where: { id: postId } });
  if (!post) throw new Error("Blog post not found.");

  await prisma.$transaction(async (tx) => {
    await tx.blogPost.update({ where: { id: postId }, data: { featured: false } });
    await tx.gemmaAlert.update({
      where: { id: alertId },
      data: { status: "RESOLVED", resolvedAt: new Date() },
    });
    await tx.mcpAuditLog.create({
      data: {
        workspaceId: systemWorkspaceId,
        kind: "HITL_ACTION",
        name: "unfeature_blog_post",
        argsJson: JSON.stringify({ postId, title: post.title, approvedBy: adminEmail }),
        resultSummary: `Removed featured flag from "${post.title}".`,
        durationMs: 0,
      },
    });
  });

  revalidatePath("/admin/copilot");
  revalidatePath("/admin/blogs");
  return { success: true };
}

// 9. Hard-delete a comment (cascades to replies via the schema relation).
export async function deleteCommentAction(commentId: string, alertId: string) {
  const adminEmail = await assertAdmin();
  const systemWorkspaceId = await ensureSystemAdminWorkspace();

  const comment = await prisma.blogComment.findUnique({
    where: { id: commentId },
    include: { user: { select: { email: true } } },
  });
  if (!comment) throw new Error("Comment not found.");

  await prisma.$transaction(async (tx) => {
    await tx.blogComment.delete({ where: { id: commentId } });
    await tx.gemmaAlert.update({
      where: { id: alertId },
      data: { status: "RESOLVED", resolvedAt: new Date() },
    });
    await tx.mcpAuditLog.create({
      data: {
        workspaceId: systemWorkspaceId,
        kind: "HITL_ACTION",
        name: "delete_comment",
        argsJson: JSON.stringify({
          commentId,
          authorEmail: comment.user?.email,
          excerpt: comment.content.slice(0, 200),
          approvedBy: adminEmail,
        }),
        resultSummary: `Deleted comment ${commentId} (cascades to replies).`,
        durationMs: 0,
      },
    });
  });

  revalidatePath("/admin/copilot");
  revalidatePath("/admin/comments");
  return { success: true };
}

// 10. Publish a draft challenge.
export async function publishChallengeAction(challengeId: string, alertId: string) {
  const adminEmail = await assertAdmin();
  const systemWorkspaceId = await ensureSystemAdminWorkspace();

  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
  if (!challenge) throw new Error("Challenge not found.");

  await prisma.$transaction(async (tx) => {
    await tx.challenge.update({ where: { id: challengeId }, data: { published: true } });
    await tx.gemmaAlert.update({
      where: { id: alertId },
      data: { status: "RESOLVED", resolvedAt: new Date() },
    });
    await tx.mcpAuditLog.create({
      data: {
        workspaceId: systemWorkspaceId,
        kind: "HITL_ACTION",
        name: "publish_challenge",
        argsJson: JSON.stringify({ challengeId, title: challenge.title, approvedBy: adminEmail }),
        resultSummary: `Published challenge "${challenge.title}".`,
        durationMs: 0,
      },
    });
  });

  revalidatePath("/admin/copilot");
  revalidatePath("/admin/challenges");
  return { success: true };
}

// 11. Take a challenge offline (back to draft).
export async function unpublishChallengeAction(challengeId: string, alertId: string) {
  const adminEmail = await assertAdmin();
  const systemWorkspaceId = await ensureSystemAdminWorkspace();

  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
  if (!challenge) throw new Error("Challenge not found.");

  await prisma.$transaction(async (tx) => {
    await tx.challenge.update({ where: { id: challengeId }, data: { published: false } });
    await tx.gemmaAlert.update({
      where: { id: alertId },
      data: { status: "RESOLVED", resolvedAt: new Date() },
    });
    await tx.mcpAuditLog.create({
      data: {
        workspaceId: systemWorkspaceId,
        kind: "HITL_ACTION",
        name: "unpublish_challenge",
        argsJson: JSON.stringify({ challengeId, title: challenge.title, approvedBy: adminEmail }),
        resultSummary: `Unpublished challenge "${challenge.title}".`,
        durationMs: 0,
      },
    });
  });

  revalidatePath("/admin/copilot");
  revalidatePath("/admin/challenges");
  return { success: true };
}

// 12. Move an AdminTodo to a new status (covers the BACKLOG → TODO promotion
// proposals from the scanner, and any chat-driven status changes).
const VALID_TODO_STATUSES = new Set(["BACKLOG", "TODO", "IN_PROGRESS", "DONE"]);
export async function setTodoStatusAction(
  todoId: string,
  newStatus: string,
  alertId: string
) {
  const adminEmail = await assertAdmin();
  const systemWorkspaceId = await ensureSystemAdminWorkspace();

  if (!VALID_TODO_STATUSES.has(newStatus)) {
    throw new Error(`Invalid todo status: ${newStatus}`);
  }
  const todo = await prisma.adminTodo.findUnique({ where: { id: todoId } });
  if (!todo) throw new Error("Todo not found.");

  await prisma.$transaction(async (tx) => {
    await tx.adminTodo.update({
      where: { id: todoId },
      data: {
        status: newStatus,
        completedAt: newStatus === "DONE" ? new Date() : null,
      },
    });
    await tx.gemmaAlert.update({
      where: { id: alertId },
      data: { status: "RESOLVED", resolvedAt: new Date() },
    });
    await tx.mcpAuditLog.create({
      data: {
        workspaceId: systemWorkspaceId,
        kind: "HITL_ACTION",
        name: "set_todo_status",
        argsJson: JSON.stringify({
          todoId,
          ticketKey: todo.ticketKey,
          from: todo.status,
          to: newStatus,
          approvedBy: adminEmail,
        }),
        resultSummary: `Moved ${todo.ticketKey ?? todoId} from ${todo.status} to ${newStatus}.`,
        durationMs: 0,
      },
    });
  });

  revalidatePath("/admin/copilot");
  revalidatePath("/admin/todos");
  return { success: true };
}

// 13. Bulk-archive every stalled session (>6 hours in_progress) in one click.
// Useful when the scanner detects a wave of abandoned sessions — clicking
// each individual ARCHIVE_SESSION proposal is slow.
export async function bulkArchiveStalledSessionsAction(alertId: string) {
  const adminEmail = await assertAdmin();
  const systemWorkspaceId = await ensureSystemAdminWorkspace();

  const staleCutoff = new Date(Date.now() - 6 * 60 * 60 * 1000);
  const stale = await prisma.interviewSession.findMany({
    where: { status: "in_progress", startedAt: { lt: staleCutoff } },
    select: { id: true, title: true, workspaceId: true },
  });
  if (stale.length === 0) {
    // Resolve the alert anyway so it stops nagging.
    await prisma.gemmaAlert.update({
      where: { id: alertId },
      data: { status: "RESOLVED", resolvedAt: new Date() },
    });
    return { success: true, archived: 0 };
  }

  await prisma.$transaction(async (tx) => {
    await tx.interviewSession.updateMany({
      where: { id: { in: stale.map((s) => s.id) } },
      data: { status: "abandoned", finishedAt: new Date() },
    });
    // Also resolve any standalone SYSTEM_STALL alerts that were keyed to these
    // session ids — keeps the UI clean.
    await tx.gemmaAlert.updateMany({
      where: {
        type: "SYSTEM_STALL",
        status: "UNRESOLVED",
        targetId: { in: stale.map((s) => s.id) },
      },
      data: { status: "RESOLVED", resolvedAt: new Date() },
    });
    await tx.gemmaAlert.update({
      where: { id: alertId },
      data: { status: "RESOLVED", resolvedAt: new Date() },
    });
    await tx.mcpAuditLog.create({
      data: {
        workspaceId: systemWorkspaceId,
        kind: "HITL_ACTION",
        name: "bulk_archive_stalled_sessions",
        argsJson: JSON.stringify({
          archivedCount: stale.length,
          ids: stale.map((s) => s.id),
          approvedBy: adminEmail,
        }),
        resultSummary: `Bulk-archived ${stale.length} stalled session(s).`,
        durationMs: 0,
      },
    });
  });

  revalidatePath("/admin/copilot");
  revalidatePath("/admin/interviews");
  return { success: true, archived: stale.length };
}

// 14. Spawn a new AdminTodo from a Gemma alert proposal
export async function createTodoFromAlertAction(
  title: string,
  body: string,
  priority: "LOW" | "MEDIUM" | "HIGH",
  category: string,
  alertId: string
) {
  const adminEmail = await assertAdmin();

  await prisma.$transaction(async (tx) => {
    // Generate next ticket Seq & Key
    const last = await tx.adminTodo.findFirst({
      where: { ticketSeq: { not: null } },
      orderBy: { ticketSeq: "desc" },
      select: { ticketSeq: true }
    });
    
    const seq = (last?.ticketSeq ?? 0) + 1;
    const ticketKey = `IP-${seq}`;

    // Create AdminTodo
    await tx.adminTodo.create({
      data: {
        title: title.trim(),
        body: body.trim(),
        priority,
        category: category?.trim() || "AI Alert",
        addedByEmail: adminEmail,
        ticketSeq: seq,
        ticketKey,
        acceptanceCriteria: JSON.stringify([
          { text: "Investigate telemetry report details attached to alert.", done: false },
          { text: "Implement root fix and verify metrics stability.", done: false }
        ])
      }
    });

    // Resolve the Alert
    await tx.gemmaAlert.update({
      where: { id: alertId },
      data: { 
        status: "RESOLVED", 
        resolvedAt: new Date() 
      }
    });
  });

  revalidatePath("/admin/copilot");
  revalidatePath("/admin/todos");
  return { success: true };
}
