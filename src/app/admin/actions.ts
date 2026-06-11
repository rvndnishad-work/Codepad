"use server";

import { auth } from "@/lib/auth";
import { staffCan } from "@/lib/permissions/staff";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// These actions curate the public content catalogue (featured flags, pins), so
// they require content:curate — held by CONTENT_MANAGER and PLATFORM_ADMIN.
async function assertAdmin() {
  const session = await auth().catch(() => null);
  if (!(await staffCan(session, "content:curate"))) {
    throw new Error("Unauthorized: content curation privilege required.");
  }
}

/**
 * Toggle the featured/staff-picked flag of a blog post.
 */
export async function toggleBlogPostFeatured(id: string) {
  await assertAdmin();
  const post = await prisma.blogPost.findUnique({ where: { id } });
  if (!post) throw new Error("Blog post not found.");

  const updated = await prisma.blogPost.update({
    where: { id },
    data: { featured: !post.featured }
  });

  revalidatePath("/admin");
  return updated;
}

/**
 * Toggle the featured flag of a coding challenge.
 */
export async function toggleChallengeFeatured(id: string) {
  await assertAdmin();
  const challenge = await prisma.challenge.findUnique({ where: { id } });
  if (!challenge) throw new Error("Challenge not found.");

  const updated = await prisma.challenge.update({
    where: { id },
    data: { featured: !challenge.featured }
  });

  revalidatePath("/admin");
  return updated;
}

/**
 * Toggle the pinned status of a user's shared snippet.
 */
export async function toggleSnippetPinned(id: string) {
  await assertAdmin();
  const snippet = await prisma.snippet.findUnique({ where: { id } });
  if (!snippet) throw new Error("Snippet not found.");

  const updated = await prisma.snippet.update({
    where: { id },
    data: { pinned: !snippet.pinned }
  });

  revalidatePath("/admin");
  return updated;
}
