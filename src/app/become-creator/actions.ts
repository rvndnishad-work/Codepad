"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { userCan } from "@/lib/permissions/access";
import { CREATOR_FOLLOWER_MINIMUM } from "./constants";

const schema = z.object({
  platform: z.enum(["youtube", "linkedin"]),
  profileUrl: z.string().url().max(500),
  followerCount: z.number().int().min(0).max(1_000_000_000),
  note: z.string().max(1000).optional(),
});

/**
 * Submit (or resubmit) a creator application. Self-reported follower count is
 * gated client- and server-side at the minimum; a reviewer verifies the link
 * before approving. Idempotent per user — resubmitting flips the row back to
 * PENDING. Emits a GemmaAlert so the application surfaces in the admin copilot.
 */
export async function submitCreatorApplicationAction(input: {
  platform: "youtube" | "linkedin";
  profileUrl: string;
  followerCount: number;
  note?: string;
}) {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  if (!userId) throw new Error("Sign in to apply.");

  if (await userCan(userId, "content:author")) {
    throw new Error("You already have creator access.");
  }

  const data = schema.parse(input);
  if (data.followerCount < CREATOR_FOLLOWER_MINIMUM) {
    throw new Error(
      `You need at least ${CREATOR_FOLLOWER_MINIMUM.toLocaleString()} followers/subscribers to apply.`,
    );
  }

  const application = await prisma.creatorApplication.upsert({
    where: { userId },
    update: {
      platform: data.platform,
      profileUrl: data.profileUrl,
      followerCount: data.followerCount,
      note: data.note?.trim() || null,
      status: "PENDING",
      reviewerId: null,
      reviewNote: null,
      reviewedAt: null,
    },
    create: {
      userId,
      platform: data.platform,
      profileUrl: data.profileUrl,
      followerCount: data.followerCount,
      note: data.note?.trim() || null,
    },
  });

  // Gemma assist: surface the application in the admin copilot queue. Best-effort.
  try {
    await prisma.gemmaAlert.create({
      data: {
        type: "MODERATION",
        title: `Creator application — ${session.user?.name || session.user?.email || userId}`,
        body: `Requests creator access via ${data.platform} (${data.followerCount.toLocaleString()} followers): ${data.profileUrl}`,
        severity: "LOW",
        targetId: application.id,
      },
    });
  } catch (err) {
    console.error("[creator-app] gemma alert failed:", err);
  }

  revalidatePath("/become-creator");
}
