"use server";

import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function assertAdmin() {
  const session = await auth().catch(() => null);
  if (!isAdmin(session)) {
    throw new Error("Unauthorized: Admin privilege required.");
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
