/**
 * Content ownership + one-time entitlement grants. The space-aware access
 * decision lives in ./access.ts.
 */
import { prisma } from "@/lib/prisma";
import type { OwnableContentType } from "@/lib/permissions/permissions";

/** The owning user id for a piece of content (or null if it doesn't exist). */
export async function getContentOwnerId(
  contentType: OwnableContentType,
  contentId: string,
): Promise<string | null> {
  switch (contentType) {
    case "CHALLENGE": {
      const c = await prisma.challenge.findUnique({
        where: { id: contentId },
        select: { authorId: true },
      });
      return c?.authorId ?? null;
    }
    case "BLOG_POST": {
      const b = await prisma.blogPost.findUnique({
        where: { id: contentId },
        select: { userId: true },
      });
      return b?.userId ?? null;
    }
    case "SNIPPET": {
      const s = await prisma.snippet.findUnique({
        where: { id: contentId },
        select: { userId: true },
      });
      return s?.userId ?? null;
    }
    case "TUTORIAL": {
      const t = await prisma.tutorial.findUnique({
        where: { id: contentId },
        select: { authorId: true },
      });
      return t?.authorId ?? null;
    }
    case "INTERVIEW_QA": {
      const q = await prisma.interviewQA.findUnique({
        where: { id: contentId },
        select: { authorId: true },
      });
      return q?.authorId ?? null;
    }
  }
}

/**
 * Grant (or refresh) a one-time entitlement. Idempotent on (user, content): a
 * webhook redelivery just updates the existing row rather than duplicating.
 */
export async function grantEntitlement(params: {
  userId: string;
  contentType: OwnableContentType;
  contentId: string;
  source: "PURCHASE" | "GRANT";
  spaceContentId?: string | null;
  expiresAt?: Date | null;
}): Promise<void> {
  const { userId, contentType, contentId, source, spaceContentId, expiresAt } = params;
  await prisma.entitlement.upsert({
    where: { userId_contentType_contentId: { userId, contentType, contentId } },
    update: { source, spaceContentId: spaceContentId ?? null, expiresAt: expiresAt ?? null },
    create: {
      userId,
      contentType,
      contentId,
      source,
      spaceContentId: spaceContentId ?? null,
      expiresAt: expiresAt ?? null,
    },
  });
}
