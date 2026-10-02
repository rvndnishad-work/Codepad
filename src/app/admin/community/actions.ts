"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/admin/audit";
import type { Permission } from "@/lib/permissions/permissions";
import { requireStaff } from "../content/_lib/guard";
import { fail, ok, type ActionResult } from "../content/_lib/result";
import { CAN_HIDE, TARGET_LABEL, deleteTarget, hideTarget, isTargetType, loadTargets, previewFor, type TargetType } from "./_lib/targets";

/** Comments need comment moderation; posts, snippets and experiences need content curation. */
const permFor = (t: TargetType): Permission =>
  t === "blog_comment" || t === "question_comment" ? "comment:moderate" : "content:curate";

function revalidateAll() {
  revalidatePath("/admin/community");
  revalidatePath("/admin/snippets");
  revalidatePath("/admin/blogs");
}

/**
 * Act on a report. The action applies to the reported item and closes every
 * open report on that same item, so a post reported ten times is handled once.
 */
export async function resolveReport(reportId: string, action: "hide" | "delete" | "dismiss", note: string): Promise<ActionResult> {
  const report = await prisma.contentReport.findUnique({ where: { id: reportId } });
  if (!report) return fail("Report not found.");
  if (!isTargetType(report.targetType)) return fail("Unknown report type.");
  const type = report.targetType;
  const { userId, actor } = await requireStaff(permFor(type));
  if (action !== "dismiss" && !note.trim()) return fail("Add a note for the audit log.");

  const preview = previewFor(await loadTargets([report]), type, report.targetId);
  if (action === "hide") {
    if (!CAN_HIDE[type]) return fail(`${TARGET_LABEL[type]}s cannot be hidden, only deleted.`);
    if (!preview.exists) return fail("It has already been removed.");
    await hideTarget(type, report.targetId);
  } else if (action === "delete") {
    await deleteTarget(type, report.targetId);
  }

  const status = action === "hide" ? "hidden" : action === "delete" ? "deleted" : "dismissed";
  const closed = await prisma.contentReport.updateMany({
    where: {
      OR: [{ id: reportId }, { targetType: type, targetId: report.targetId, status: "open" }],
    },
    data: { status, resolvedById: userId, resolvedAt: new Date() },
  });

  await logAdminAction({
    actor,
    action: `content.report.${action}`,
    targetType: type,
    targetId: report.targetId,
    targetLabel: preview.title,
    before: { reportId, reason: report.reason, author: preview.authorId, text: preview.text },
    after: { status, reportsClosed: closed.count },
    note: note.trim() || null,
  });
  revalidateAll();
  return ok();
}

/** Re-open a closed report (for example a dismiss by mistake). Does not undo a delete. */
export async function reopenReport(reportId: string): Promise<ActionResult> {
  const report = await prisma.contentReport.findUnique({ where: { id: reportId }, select: { targetType: true, targetId: true, status: true } });
  if (!report || !isTargetType(report.targetType)) return fail("Report not found.");
  const { actor } = await requireStaff(permFor(report.targetType));
  await prisma.contentReport.update({ where: { id: reportId }, data: { status: "open", resolvedById: null, resolvedAt: null } });
  await logAdminAction({
    actor,
    action: "content.report.reopen",
    targetType: report.targetType,
    targetId: report.targetId,
    before: { status: report.status },
    after: { status: "open" },
  });
  revalidateAll();
  return ok();
}

type CommentRef = { type: "blog_comment" | "question_comment"; id: string };
const isCommentRef = (r: unknown): r is CommentRef =>
  typeof r === "object" &&
  r !== null &&
  ((r as CommentRef).type === "blog_comment" || (r as CommentRef).type === "question_comment") &&
  typeof (r as CommentRef).id === "string";

/**
 * Delete comments. Neither comment table has a hidden flag, so removal is a
 * delete; blog replies go with their parent (cascade). Open reports on the
 * deleted comments are closed as "deleted".
 */
export async function deleteComments(refs: CommentRef[], note: string): Promise<ActionResult> {
  const { userId, actor } = await requireStaff("comment:moderate");
  const clean = (Array.isArray(refs) ? refs : []).filter(isCommentRef).slice(0, 200);
  if (clean.length === 0) return fail("Nothing selected.");

  const previews = await loadTargets(clean.map((r) => ({ targetType: r.type, targetId: r.id })));
  const blogIds = clean.filter((r) => r.type === "blog_comment").map((r) => r.id);
  const questionIds = clean.filter((r) => r.type === "question_comment").map((r) => r.id);
  const [b, q] = await prisma.$transaction([
    prisma.blogComment.deleteMany({ where: { id: { in: blogIds } } }),
    prisma.prepQuestionComment.deleteMany({ where: { id: { in: questionIds } } }),
    prisma.contentReport.updateMany({
      where: {
        status: "open",
        OR: [
          { targetType: "blog_comment", targetId: { in: blogIds } },
          { targetType: "question_comment", targetId: { in: questionIds } },
        ],
      },
      data: { status: "deleted", resolvedById: userId, resolvedAt: new Date() },
    }),
  ]);

  await Promise.all(
    clean.map((r) => {
      const p = previewFor(previews, r.type, r.id);
      return logAdminAction({
        actor,
        action: "content.comment.delete",
        targetType: r.type,
        targetId: r.id,
        targetLabel: p.title,
        before: { author: p.authorId, text: p.text },
        note: note.trim() || null,
      });
    }),
  );
  revalidateAll();
  return ok(`${b.count + q.count} deleted`);
}
