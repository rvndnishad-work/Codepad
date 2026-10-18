import { createNotification, NOTIFICATION_TYPES } from "@/lib/notifications";

export const BLOG_STATUSES = ["DRAFT", "PENDING", "PUBLISHED", "REJECTED", "NEEDS_CHANGES"] as const;
export type BlogStatus = (typeof BLOG_STATUSES)[number];

/** Statuses that need a reason for the author. */
export const NEEDS_REASON = new Set<string>(["REJECTED", "NEEDS_CHANGES"]);

/**
 * Tell the author why their post was rejected or sent back. There is no
 * generic email template for this yet, so it is an in-app notification
 * (which honours the author's notification preferences).
 */
export async function notifyBlogAuthor(post: { userId: string; title: string; slug: string }, status: string, reason: string) {
  if (!NEEDS_REASON.has(status)) return;
  await createNotification({
    userId: post.userId,
    type: NOTIFICATION_TYPES.CONTENT_STATUS,
    title: status === "REJECTED" ? `"${post.title}" was not published` : `"${post.title}" needs changes`,
    body: reason,
    href: "/dashboard/blogs",
    payload: { slug: post.slug, status },
  }).catch((err) => console.error("[admin-blogs] notify failed", err));
}
