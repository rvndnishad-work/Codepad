"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { userCan } from "@/lib/permissions/access";
import { OWNABLE_CONTENT_TYPES, type OwnableContentType } from "@/lib/permissions/permissions";
import { getContentOwnerId } from "@/lib/marketplace/entitlements";
import { coverImageSchema } from "@/lib/blog-schema";
import { normalizeLayout, SECTION_KEYS } from "@/lib/creator/layout";
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

/** Resolve the caller's space by spaceId and userId, verifying ownership. */
async function requireMySpace(spaceId: string, userId: string) {
  const space = await prisma.creatorSpace.findFirst({
    where: { id: spaceId, ownerId: userId },
  });
  if (!space) throw new Error("Space not found or unauthorized.");
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
  // Check globally if handle is taken
  const existingHandle = await prisma.creatorSpace.findUnique({ where: { handle } });
  if (existingHandle) {
    throw new Error(`Handle "${handle}" is taken.`);
  }
  const space = await prisma.creatorSpace.create({
    data: {
      ownerId: userId,
      handle,
      name: data.name.trim(),
      tagline: data.tagline?.trim() || null,
      description: data.description?.trim() || null,
    },
  });
  revalidatePath("/creator");
  return space;
}

export async function updateSpaceAction(
  spaceId: string,
  input: {
    name?: string;
    tagline?: string;
    description?: string;
    published?: boolean;
  }
) {
  const userId = await requireCreator();
  const space = await requireMySpace(spaceId, userId);
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
  revalidatePath(`/creator/${space.handle}`);
}

// ── Public-page layout (hero images + section order/visibility) ───────────────
const layoutSchema = z.object({
  avatarUrl: coverImageSchema.optional(),
  coverUrl: coverImageSchema.optional(),
  heroStyle: z.enum(["banner", "minimal"]).optional(),
  alignment: z.enum(["left", "center", "right"]).optional(),
  theme: z.enum(["slate", "glassmorphism", "neon", "minimalist"]).optional(),
  sections: z
    .array(z.object({ key: z.enum(SECTION_KEYS), visible: z.boolean(), cols: z.number().int().min(1).max(12) }))
    .max(SECTION_KEYS.length)
    .optional(),
});

export async function updateSpaceLayoutAction(
  spaceId: string,
  input: {
    avatarUrl?: string;
    coverUrl?: string;
    heroStyle?: "banner" | "minimal";
    alignment?: "left" | "center" | "right";
    theme?: "slate" | "glassmorphism" | "neon" | "minimalist";
    sections?: { key: (typeof SECTION_KEYS)[number]; visible: boolean; cols: number }[];
  }
) {
  const userId = await requireCreator();
  const space = await requireMySpace(spaceId, userId);
  const data = layoutSchema.parse(input);

  const currentLayout = normalizeLayout(space.layout);

  const layout = normalizeLayout({
    heroStyle: data.heroStyle !== undefined ? data.heroStyle : currentLayout.heroStyle,
    alignment: data.alignment !== undefined ? data.alignment : currentLayout.alignment,
    theme: data.theme !== undefined ? data.theme : currentLayout.theme,
    sections: data.sections !== undefined ? data.sections : currentLayout.sections,
  });

  await prisma.creatorSpace.update({
    where: { id: space.id },
    data: {
      ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl || null } : {}),
      ...(data.coverUrl !== undefined ? { coverUrl: data.coverUrl || null } : {}),
      layout,
    },
  });
  revalidatePath("/creator");
  revalidatePath(`/creator/${space.handle}`);
  revalidatePath(`/c/${space.handle}`);
}

// ── Tiers ────────────────────────────────────────────────────────────────────
const tierSchema = z.object({
  name: z.string().min(2).max(60),
  rank: z.number().int().min(1).max(100),
  priceCents: z.number().int().min(50).max(1_000_000),
});

export async function createTierAction(
  spaceId: string,
  input: {
    name: string;
    rank: number;
    priceCents: number;
  }
) {
  const userId = await requireCreator();
  const space = await requireMySpace(spaceId, userId);
  const data = tierSchema.parse(input);
  const clash = await prisma.spaceTier.findUnique({
    where: { spaceId_rank: { spaceId: space.id, rank: data.rank } },
  });
  if (clash) throw new Error(`A tier already uses rank ${data.rank}.`);
  await prisma.spaceTier.create({
    data: { spaceId: space.id, name: data.name.trim(), rank: data.rank, priceCents: data.priceCents },
  });
  revalidatePath("/creator");
  revalidatePath(`/creator/${space.handle}`);
}

export async function setTierPublishedAction(spaceId: string, tierId: string, published: boolean) {
  const userId = await requireCreator();
  const space = await requireMySpace(spaceId, userId);
  const tier = await prisma.spaceTier.findUnique({ where: { id: tierId }, select: { spaceId: true } });
  if (!tier || tier.spaceId !== space.id) throw new Error("Tier not found.");
  await prisma.spaceTier.update({ where: { id: tierId }, data: { published } });
  revalidatePath("/creator");
  revalidatePath(`/creator/${space.handle}`);
}

export async function deleteTierAction(spaceId: string, tierId: string) {
  const userId = await requireCreator();
  const space = await requireMySpace(spaceId, userId);
  const tier = await prisma.spaceTier.findUnique({ where: { id: tierId }, select: { spaceId: true } });
  if (!tier || tier.spaceId !== space.id) throw new Error("Tier not found.");
  await prisma.spaceTier.delete({ where: { id: tierId } });
  revalidatePath("/creator");
  revalidatePath(`/creator/${space.handle}`);
}

// ── Content access policy (SpaceContent) ─────────────────────────────────────
const policySchema = z.object({
  contentType: z.enum(OWNABLE_CONTENT_TYPES),
  contentId: z.string().min(1),
  accessTierRank: z.number().int().min(0).max(100).nullable(),
  purchasePriceCents: z.number().int().min(50).max(1_000_000).nullable(),
});

/** Add content to the space (or update its access policy). Validates ownership. */
export async function setSpaceContentAction(
  spaceId: string,
  input: {
    contentType: OwnableContentType;
    contentId: string;
    accessTierRank: number | null;
    purchasePriceCents: number | null;
  }
) {
  const userId = await requireCreator();
  const space = await requireMySpace(spaceId, userId);
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
  revalidatePath(`/creator/${space.handle}`);
}

export async function removeSpaceContentAction(spaceId: string, spaceContentId: string) {
  const userId = await requireCreator();
  const space = await requireMySpace(spaceId, userId);
  const sc = await prisma.spaceContent.findUnique({
    where: { id: spaceContentId },
    select: { spaceId: true },
  });
  if (!sc || sc.spaceId !== space.id) throw new Error("Not found.");
  await prisma.spaceContent.delete({ where: { id: spaceContentId } });
  revalidatePath("/creator");
  revalidatePath(`/creator/${space.handle}`);
}

// ── Tutorial authoring (replace-all sections) ────────────────────────────────
const tutorialSchema = z.object({
  id: z.string().optional(),
  spaceId: z.string().optional(),
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
  const data = tutorialSchema.parse(input);

  let targetSpaceId: string;

  if (data.id) {
    const existing = await prisma.tutorial.findUnique({
      where: { id: data.id },
      select: { authorId: true, spaceId: true },
    });
    if (!existing || existing.authorId !== userId) throw new Error("Tutorial not found.");
    targetSpaceId = existing.spaceId;
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
  } else {
    if (!data.spaceId) throw new Error("spaceId is required to create a tutorial.");
    const space = await requireMySpace(data.spaceId, userId);
    targetSpaceId = space.id;

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
  }

  const space = await prisma.creatorSpace.findUnique({ where: { id: targetSpaceId } });
  revalidatePath("/creator");
  if (space) {
    revalidatePath(`/creator/${space.handle}`);
  }
}

// ── Interview Q&A authoring (replace-all questions) ──────────────────────────
const qaSchema = z.object({
  id: z.string().optional(),
  spaceId: z.string().optional(),
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
  const data = qaSchema.parse(input);

  let targetSpaceId: string;

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
      select: { authorId: true, spaceId: true },
    });
    if (!existing || existing.authorId !== userId) throw new Error("Page not found.");
    targetSpaceId = existing.spaceId;
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
  } else {
    if (!data.spaceId) throw new Error("spaceId is required to create a Q&A page.");
    const space = await requireMySpace(data.spaceId, userId);
    targetSpaceId = space.id;

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
  }

  const space = await prisma.creatorSpace.findUnique({ where: { id: targetSpaceId } });
  revalidatePath("/creator");
  if (space) {
    revalidatePath(`/creator/${space.handle}`);
  }
}

// ── Interview Experience authoring ───────────────────────────────────────────
const experienceSchema = z.object({
  id: z.string().optional(),
  spaceId: z.string().optional(),
  title: z.string().min(2).max(160),
  company: z.string().max(120).optional(),
  role: z.string().max(120).optional(),
  outcome: z.enum(["offer", "rejected", "pending", "withdrew"]).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  summary: z.string().max(500).optional(),
  body: z.string().min(1).max(50_000),
  published: z.boolean().optional(),
});

export async function saveInterviewExperienceAction(input: z.infer<typeof experienceSchema>) {
  const userId = await requireCreator();
  const data = experienceSchema.parse(input);

  const fields = {
    title: data.title.trim(),
    company: data.company?.trim() || null,
    role: data.role?.trim() || null,
    outcome: data.outcome ?? null,
    difficulty: data.difficulty ?? null,
    summary: data.summary?.trim() || null,
    body: data.body,
  };

  let targetSpaceId: string;

  if (data.id) {
    const existing = await prisma.interviewExperience.findUnique({
      where: { id: data.id },
      select: { authorId: true, spaceId: true },
    });
    if (!existing || existing.authorId !== userId) throw new Error("Experience not found.");
    targetSpaceId = existing.spaceId;
    await prisma.interviewExperience.update({
      where: { id: data.id },
      data: {
        ...fields,
        ...(data.published !== undefined ? { published: data.published } : {}),
      },
    });
  } else {
    if (!data.spaceId) throw new Error("spaceId is required to create an experience.");
    const space = await requireMySpace(data.spaceId, userId);
    targetSpaceId = space.id;

    let slug = slugify(data.title) || "experience";
    if (await prisma.interviewExperience.findUnique({ where: { spaceId_slug: { spaceId: space.id, slug } } })) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }
    await prisma.interviewExperience.create({
      data: {
        spaceId: space.id,
        authorId: userId,
        slug,
        ...fields,
        ...(data.published !== undefined ? { published: data.published } : {}),
      },
    });
  }

  const space = await prisma.creatorSpace.findUnique({ where: { id: targetSpaceId } });
  revalidatePath("/creator");
  if (space) {
    revalidatePath(`/creator/${space.handle}`);
    revalidatePath(`/c/${space.handle}`);
  }
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
