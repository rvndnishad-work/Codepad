"use server";

import { auth } from "@/lib/auth";
import { staffCan } from "@/lib/permissions/staff";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logAdminAction, type AdminActor } from "@/lib/admin/audit";

// These actions curate the public content catalogue (featured flags, pins), so
// they require content:curate — held by CONTENT_MANAGER and PLATFORM_ADMIN.
async function assertAdmin(): Promise<AdminActor> {
  const session = await auth().catch(() => null);
  if (!(await staffCan(session, "content:curate"))) {
    throw new Error("Unauthorized: content curation privilege required.");
  }
  return { id: session?.user?.id ?? null, email: session?.user?.email ?? null };
}

function revalidateAll(paths: string[]) {
  for (const p of paths) revalidatePath(p);
}

/**
 * Toggle the featured/staff-picked flag of a blog post.
 */
export async function toggleBlogPostFeatured(id: string) {
  const actor = await assertAdmin();
  const post = await prisma.blogPost.findUnique({
    where: { id },
    select: { featured: true, title: true, slug: true },
  });
  if (!post) throw new Error("Blog post not found.");

  const updated = await prisma.blogPost.update({
    where: { id },
    data: { featured: !post.featured },
  });

  await logAdminAction({
    actor,
    action: "content.blog",
    targetType: "blog_post",
    targetId: id,
    targetLabel: post.title,
    before: { featured: post.featured },
    after: { featured: updated.featured },
  });
  revalidateAll(["/admin", "/admin/blogs", "/blog", `/blog/${post.slug}`, "/"]);
  return updated;
}

/**
 * Toggle the featured flag of a coding challenge.
 */
export async function toggleChallengeFeatured(id: string) {
  const actor = await assertAdmin();
  const challenge = await prisma.challenge.findUnique({
    where: { id },
    select: { featured: true, title: true },
  });
  if (!challenge) throw new Error("Challenge not found.");

  const updated = await prisma.challenge.update({
    where: { id },
    data: { featured: !challenge.featured },
  });

  await logAdminAction({
    actor,
    action: "content.challenge",
    targetType: "challenge",
    targetId: id,
    targetLabel: challenge.title,
    before: { featured: challenge.featured },
    after: { featured: updated.featured },
  });
  revalidateAll(["/admin", "/admin/challenges", "/challenges", "/candidate/challenges", "/"]);
  return updated;
}

/**
 * Toggle the pinned status of a user's shared snippet.
 */
export async function toggleSnippetPinned(id: string) {
  const actor = await assertAdmin();
  const snippet = await prisma.snippet.findUnique({
    where: { id },
    select: { pinned: true, title: true },
  });
  if (!snippet) throw new Error("Snippet not found.");

  const updated = await prisma.snippet.update({
    where: { id },
    data: { pinned: !snippet.pinned },
  });

  await logAdminAction({
    actor,
    action: "content.snippet",
    targetType: "snippet",
    targetId: id,
    targetLabel: snippet.title,
    before: { pinned: snippet.pinned },
    after: { pinned: updated.pinned },
  });
  revalidateAll(["/admin", "/admin/snippets", "/explore"]);
  return updated;
}
