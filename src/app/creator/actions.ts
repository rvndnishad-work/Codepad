"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { userCan } from "@/lib/permissions/access";
import { OWNABLE_CONTENT_TYPES, type OwnableContentType } from "@/lib/permissions/permissions";
import { getContentOwnerId } from "@/lib/marketplace/entitlements";
import {
  getOrCreateConnectAccount,
  createOnboardingLink,
  createTierCheckout,
  createContentCheckout,
} from "@/lib/marketplace/connect";

// ── auth helpers ─────────────────────────────────────────────────────────────
async function requireCreator() {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  if (!userId || !(await userCan(userId, "content:author"))) {
    throw new Error("Unauthorized: a creator (content:author) is required.");
  }
  return userId;
}

/** Resolve the caller's space, creating an empty draft on first use is NOT done
 *  here — the space is created explicitly via createSpaceAction. */
async function requireMySpace(userId: string) {
  const space = await prisma.creatorSpace.findUnique({ where: { ownerId: userId } });
  if (!space) throw new Error("Create your space first.");
  return space;
}

async function origin() {
  const h = await headers();
  return (
    h.get("origin") ??
    (h.get("host") ? `https://${h.get("host")}` : "http://localhost:3000")
  );
}

// ── Stripe onboarding ────────────────────────────────────────────────────────
export async function startOnboardingAction(): Promise<string> {
  const userId = await requireCreator();
  const { stripeAccountId } = await getOrCreateConnectAccount(userId);
  return createOnboardingLink(stripeAccountId, await origin());
}

// ── Space ────────────────────────────────────────────────────────────────────
const handleRe = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;
const spaceSchema = z.object({
  handle: z.string().min(3).max(40),
  name: z.string().min(2).max(80),
  tagline: z.string().max(140).optional(),
  description: z.string().max(5000).optional(),
});

export async function createSpaceAction(input: {
  handle: string;
  name: string;
  tagline?: string;
  description?: string;
}) {
  const userId = await requireCreator();
  const data = spaceSchema.parse(input);
  const handle = data.handle.toLowerCase().trim();
  if (!handleRe.test(handle)) {
    throw new Error("Handle must be 3–40 chars: lowercase letters, numbers, hyphens.");
  }
  if (await prisma.creatorSpace.findUnique({ where: { ownerId: userId } })) {
    throw new Error("You already have a space.");
  }
  if (await prisma.creatorSpace.findUnique({ where: { handle } })) {
    throw new Error(`Handle "${handle}" is taken.`);
  }
  await prisma.creatorSpace.create({
    data: {
      ownerId: userId,
      handle,
      name: data.name.trim(),
      tagline: data.tagline?.trim() || null,
      description: data.description?.trim() || null,
    },
  });
  revalidatePath("/creator");
}

export async function updateSpaceAction(input: {
  name?: string;
  tagline?: string;
  description?: string;
  published?: boolean;
}) {
  const userId = await requireCreator();
  const space = await requireMySpace(userId);
  await prisma.creatorSpace.update({
    where: { id: space.id },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.tagline !== undefined ? { tagline: input.tagline.trim() || null } : {}),
      ...(input.description !== undefined
        ? { description: input.description.trim() || null }
        : {}),
      ...(input.published !== undefined ? { published: input.published } : {}),
    },
  });
  revalidatePath("/creator");
}

// ── Tiers ────────────────────────────────────────────────────────────────────
const tierSchema = z.object({
  name: z.string().min(2).max(60),
  rank: z.number().int().min(1).max(100),
  priceCents: z.number().int().min(50).max(1_000_000),
});

export async function createTierAction(input: {
  name: string;
  rank: number;
  priceCents: number;
}) {
  const userId = await requireCreator();
  const space = await requireMySpace(userId);
  const data = tierSchema.parse(input);
  const clash = await prisma.spaceTier.findUnique({
    where: { spaceId_rank: { spaceId: space.id, rank: data.rank } },
  });
  if (clash) throw new Error(`A tier already uses rank ${data.rank}.`);
  await prisma.spaceTier.create({
    data: { spaceId: space.id, name: data.name.trim(), rank: data.rank, priceCents: data.priceCents },
  });
  revalidatePath("/creator");
}

export async function setTierPublishedAction(tierId: string, published: boolean) {
  const userId = await requireCreator();
  const space = await requireMySpace(userId);
  const tier = await prisma.spaceTier.findUnique({ where: { id: tierId }, select: { spaceId: true } });
  if (!tier || tier.spaceId !== space.id) throw new Error("Tier not found.");
  await prisma.spaceTier.update({ where: { id: tierId }, data: { published } });
  revalidatePath("/creator");
}

export async function deleteTierAction(tierId: string) {
  const userId = await requireCreator();
  const space = await requireMySpace(userId);
  const tier = await prisma.spaceTier.findUnique({ where: { id: tierId }, select: { spaceId: true } });
  if (!tier || tier.spaceId !== space.id) throw new Error("Tier not found.");
  await prisma.spaceTier.delete({ where: { id: tierId } });
  revalidatePath("/creator");
}

// ── Content access policy (SpaceContent) ─────────────────────────────────────
const policySchema = z.object({
  contentType: z.enum(OWNABLE_CONTENT_TYPES),
  contentId: z.string().min(1),
  accessTierRank: z.number().int().min(0).max(100).nullable(),
  purchasePriceCents: z.number().int().min(50).max(1_000_000).nullable(),
});

/** Add content to the space (or update its access policy). Validates ownership. */
export async function setSpaceContentAction(input: {
  contentType: OwnableContentType;
  contentId: string;
  accessTierRank: number | null;
  purchasePriceCents: number | null;
}) {
  const userId = await requireCreator();
  const space = await requireMySpace(userId);
  const data = policySchema.parse(input);

  const ownerId = await getContentOwnerId(data.contentType, data.contentId);
  if (ownerId !== userId) throw new Error("You can only add content you own.");

  await prisma.spaceContent.upsert({
    where: { contentType_contentId: { contentType: data.contentType, contentId: data.contentId } },
    update: {
      spaceId: space.id,
      accessTierRank: data.accessTierRank,
      purchasePriceCents: data.purchasePriceCents,
    },
    create: {
      spaceId: space.id,
      contentType: data.contentType,
      contentId: data.contentId,
      accessTierRank: data.accessTierRank,
      purchasePriceCents: data.purchasePriceCents,
    },
  });
  revalidatePath("/creator");
}

export async function removeSpaceContentAction(spaceContentId: string) {
  const userId = await requireCreator();
  const space = await requireMySpace(userId);
  const sc = await prisma.spaceContent.findUnique({
    where: { id: spaceContentId },
    select: { spaceId: true },
  });
  if (!sc || sc.spaceId !== space.id) throw new Error("Not found.");
  await prisma.spaceContent.delete({ where: { id: spaceContentId } });
  revalidatePath("/creator");
}

// ── Tutorial authoring (replace-all sections) ────────────────────────────────
const tutorialSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(2).max(160),
  summary: z.string().max(500).optional(),
  published: z.boolean().optional(),
  sections: z
    .array(z.object({ title: z.string().max(160).optional(), body: z.string().min(1) }))
    .max(50),
});

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

export async function saveTutorialAction(input: z.infer<typeof tutorialSchema>) {
  const userId = await requireCreator();
  const space = await requireMySpace(userId);
  const data = tutorialSchema.parse(input);

  if (data.id) {
    const existing = await prisma.tutorial.findUnique({
      where: { id: data.id },
      select: { authorId: true, spaceId: true },
    });
    if (!existing || existing.authorId !== userId) throw new Error("Tutorial not found.");
    await prisma.$transaction([
      prisma.tutorialSection.deleteMany({ where: { tutorialId: data.id } }),
      prisma.tutorial.update({
        where: { id: data.id },
        data: {
          title: data.title.trim(),
          summary: data.summary?.trim() || null,
          ...(data.published !== undefined ? { published: data.published } : {}),
          sections: {
            create: data.sections.map((s, i) => ({
              position: i,
              title: s.title?.trim() || null,
              body: s.body,
            })),
          },
        },
      }),
    ]);
    revalidatePath("/creator");
    return;
  }

  // create — unique slug within the space
  let slug = slugify(data.title) || "tutorial";
  if (await prisma.tutorial.findUnique({ where: { spaceId_slug: { spaceId: space.id, slug } } })) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }
  await prisma.tutorial.create({
    data: {
      spaceId: space.id,
      authorId: userId,
      slug,
      title: data.title.trim(),
      summary: data.summary?.trim() || null,
      sections: {
        create: data.sections.map((s, i) => ({
          position: i,
          title: s.title?.trim() || null,
          body: s.body,
        })),
      },
    },
  });
  revalidatePath("/creator");
}

// ── Interview Q&A authoring (replace-all questions) ──────────────────────────
const qaSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(2).max(160),
  summary: z.string().max(500).optional(),
  category: z.string().max(60).optional(),
  published: z.boolean().optional(),
  questions: z
    .array(
      z.object({
        question: z.string().min(1).max(2000),
        answer: z.string().min(1),
        difficulty: z.enum(["easy", "medium", "hard"]).optional(),
      }),
    )
    .max(200),
});

export async function saveInterviewQAAction(input: z.infer<typeof qaSchema>) {
  const userId = await requireCreator();
  const space = await requireMySpace(userId);
  const data = qaSchema.parse(input);

  const makeQuestions = () =>
    data.questions.map((q, i) => ({
      position: i,
      question: q.question,
      answer: q.answer,
      difficulty: q.difficulty ?? null,
    }));

  if (data.id) {
    const existing = await prisma.interviewQA.findUnique({
      where: { id: data.id },
      select: { authorId: true },
    });
    if (!existing || existing.authorId !== userId) throw new Error("Page not found.");
    await prisma.$transaction([
      prisma.interviewQuestion.deleteMany({ where: { qaId: data.id } }),
      prisma.interviewQA.update({
        where: { id: data.id },
        data: {
          title: data.title.trim(),
          summary: data.summary?.trim() || null,
          category: data.category?.trim() || null,
          ...(data.published !== undefined ? { published: data.published } : {}),
          questions: { create: makeQuestions() },
        },
      }),
    ]);
    revalidatePath("/creator");
    return;
  }

  let slug = slugify(data.title) || "interview";
  if (await prisma.interviewQA.findUnique({ where: { spaceId_slug: { spaceId: space.id, slug } } })) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }
  await prisma.interviewQA.create({
    data: {
      spaceId: space.id,
      authorId: userId,
      slug,
      title: data.title.trim(),
      summary: data.summary?.trim() || null,
      category: data.category?.trim() || null,
      questions: { create: makeQuestions() },
    },
  });
  revalidatePath("/creator");
}

// ── Buyer checkout ───────────────────────────────────────────────────────────
export async function subscribeTierAction(tierId: string): Promise<string> {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  if (!userId) throw new Error("Sign in to subscribe.");
  return createTierCheckout({ tierId, buyerId: userId, origin: await origin() });
}

export async function buyContentAction(spaceContentId: string): Promise<string> {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  if (!userId) throw new Error("Sign in to purchase.");
  return createContentCheckout({ spaceContentId, buyerId: userId, origin: await origin() });
}
