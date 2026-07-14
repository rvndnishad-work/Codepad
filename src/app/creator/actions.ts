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
import { notifySpaceContentPublished } from "@/lib/notifications/triggers";
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
  description: z.string().max(200).optional(),
  benefits: z.array(z.string().min(1).max(120)).max(10).optional(),
});

export async function createTierAction(
  spaceId: string,
  input: {
    name: string;
    rank: number;
    priceCents: number;
    description?: string;
    benefits?: string[];
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
    data: {
      spaceId: space.id,
      name: data.name.trim(),
      rank: data.rank,
      priceCents: data.priceCents,
      description: data.description?.trim() || null,
      benefits: data.benefits?.map((b) => b.trim()).filter(Boolean) ?? [],
    },
  });
  revalidatePath("/creator");
  revalidatePath(`/creator/${space.handle}`);
}

const tierUpdateSchema = z.object({
  name: z.string().min(2).max(60).optional(),
  description: z.string().max(200).nullish(),
  benefits: z.array(z.string().min(1).max(120)).max(10).optional(),
  priceCents: z.number().int().min(50).max(1_000_000).optional(),
});

/**
 * Edit a tier's pitch (name/description/benefits) anytime. Price can only
 * change while no Stripe price exists — once subscribers can be on the old
 * price, repricing needs a proper migration, not a silent swap.
 */
export async function updateTierAction(
  spaceId: string,
  tierId: string,
  input: { name?: string; description?: string | null; benefits?: string[]; priceCents?: number },
) {
  const userId = await requireCreator();
  const space = await requireMySpace(spaceId, userId);
  const data = tierUpdateSchema.parse(input);
  const tier = await prisma.spaceTier.findUnique({
    where: { id: tierId },
    select: { spaceId: true, stripePriceId: true },
  });
  if (!tier || tier.spaceId !== space.id) throw new Error("Tier not found.");
  if (data.priceCents !== undefined && tier.stripePriceId) {
    throw new Error("This tier already has live Stripe pricing — create a new tier for a new price.");
  }
  await prisma.spaceTier.update({
    where: { id: tierId },
    data: {
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      ...(data.description !== undefined ? { description: data.description?.trim() || null } : {}),
      ...(data.benefits !== undefined ? { benefits: data.benefits.map((b) => b.trim()).filter(Boolean) } : {}),
      ...(data.priceCents !== undefined ? { priceCents: data.priceCents } : {}),
    },
  });
  revalidatePath("/creator");
  revalidatePath(`/creator/${space.handle}`);
  revalidatePath(`/c/${space.handle}`);
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
// `body` is the legacy markdown column; `bodyJson` is the rich-editor (Tiptap)
// document. New content saves bodyJson with body="", old content keeps body.
const tutorialSchema = z.object({
  id: z.string().optional(),
  spaceId: z.string().optional(),
  title: z.string().min(2).max(160),
  summary: z.string().max(500).optional(),
  coverImage: coverImageSchema.nullish(),
  published: z.boolean().optional(),
  sections: z
    .array(
      z.object({
        title: z.string().max(160).optional(),
        body: z.string().optional(),
        bodyJson: z.unknown().optional(),
      }),
    )
    .max(50),
});

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

export async function saveTutorialAction(input: z.infer<typeof tutorialSchema>) {
  const userId = await requireCreator();
  const data = tutorialSchema.parse(input);

  const sectionRows = data.sections.map((s, i) => ({
    position: i,
    title: s.title?.trim() || null,
    body: s.body ?? "",
    bodyJson: (s.bodyJson ?? undefined) as object | undefined,
  }));

  let targetSpaceId: string;
  let savedId: string;
  let savedSlug: string;
  // Set on the draft→published transition only — never on edits to
  // already-published content — so followers get exactly one notification.
  let publishedNowSlug: string | null = null;

  if (data.id) {
    const existing = await prisma.tutorial.findUnique({
      where: { id: data.id },
      select: { authorId: true, spaceId: true, slug: true, published: true },
    });
    if (!existing || existing.authorId !== userId) throw new Error("Tutorial not found.");
    targetSpaceId = existing.spaceId;
    savedId = data.id;
    savedSlug = existing.slug;
    if (data.published === true && !existing.published) publishedNowSlug = existing.slug;
    await prisma.$transaction([
      prisma.tutorialSection.deleteMany({ where: { tutorialId: data.id } }),
      prisma.tutorial.update({
        where: { id: data.id },
        data: {
          title: data.title.trim(),
          summary: data.summary?.trim() || null,
          ...(data.coverImage !== undefined ? { coverImage: data.coverImage || null } : {}),
          ...(data.published !== undefined ? { published: data.published } : {}),
          sections: { create: sectionRows },
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
    if (data.published === true) publishedNowSlug = slug;
    savedSlug = slug;
    const created = await prisma.tutorial.create({
      data: {
        spaceId: space.id,
        authorId: userId,
        slug,
        title: data.title.trim(),
        summary: data.summary?.trim() || null,
        ...(data.coverImage !== undefined ? { coverImage: data.coverImage || null } : {}),
        ...(data.published !== undefined ? { published: data.published } : {}),
        sections: { create: sectionRows },
      },
    });
    savedId = created.id;
  }

  const space = await prisma.creatorSpace.findUnique({ where: { id: targetSpaceId } });
  revalidatePath("/creator");
  if (space) {
    revalidatePath(`/creator/${space.handle}`);
    revalidatePath(`/c/${space.handle}`);
    if (publishedNowSlug) {
      await notifySpaceContentPublished({
        spaceId: space.id,
        contentKindLabel: "tutorial",
        contentTitle: data.title.trim(),
        href: `/c/${space.handle}/tutorials/${publishedNowSlug}`,
      });
    }
  }
  return { id: savedId, slug: savedSlug, handle: space?.handle ?? null };
}

// ── Interview Q&A authoring (replace-all questions) ──────────────────────────
const qaSchema = z.object({
  id: z.string().optional(),
  spaceId: z.string().optional(),
  title: z.string().min(2).max(160),
  summary: z.string().max(500).optional(),
  category: z.string().max(60).optional(),
  coverImage: coverImageSchema.nullish(),
  published: z.boolean().optional(),
  questions: z
    .array(
      z.object({
        question: z.string().min(1).max(2000),
        answer: z.string().optional(),
        answerJson: z.unknown().optional(),
        difficulty: z.enum(["easy", "medium", "hard"]).optional(),
      }),
    )
    .max(200),
});

export async function saveInterviewQAAction(input: z.infer<typeof qaSchema>) {
  const userId = await requireCreator();
  const data = qaSchema.parse(input);

  let targetSpaceId: string;
  let savedId: string;
  let savedSlug: string;
  let publishedNowSlug: string | null = null;

  const makeQuestions = () =>
    data.questions.map((q, i) => ({
      position: i,
      question: q.question,
      answer: q.answer ?? "",
      answerJson: (q.answerJson ?? undefined) as object | undefined,
      difficulty: q.difficulty ?? null,
    }));

  if (data.id) {
    const existing = await prisma.interviewQA.findUnique({
      where: { id: data.id },
      select: { authorId: true, spaceId: true, slug: true, published: true },
    });
    if (!existing || existing.authorId !== userId) throw new Error("Page not found.");
    targetSpaceId = existing.spaceId;
    savedId = data.id;
    savedSlug = existing.slug;
    if (data.published === true && !existing.published) publishedNowSlug = existing.slug;
    await prisma.$transaction([
      prisma.interviewQuestion.deleteMany({ where: { qaId: data.id } }),
      prisma.interviewQA.update({
        where: { id: data.id },
        data: {
          title: data.title.trim(),
          summary: data.summary?.trim() || null,
          category: data.category?.trim() || null,
          ...(data.coverImage !== undefined ? { coverImage: data.coverImage || null } : {}),
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
    if (data.published === true) publishedNowSlug = slug;
    savedSlug = slug;
    const created = await prisma.interviewQA.create({
      data: {
        spaceId: space.id,
        authorId: userId,
        slug,
        title: data.title.trim(),
        summary: data.summary?.trim() || null,
        category: data.category?.trim() || null,
        ...(data.coverImage !== undefined ? { coverImage: data.coverImage || null } : {}),
        ...(data.published !== undefined ? { published: data.published } : {}),
        questions: { create: makeQuestions() },
      },
    });
    savedId = created.id;
  }

  const space = await prisma.creatorSpace.findUnique({ where: { id: targetSpaceId } });
  revalidatePath("/creator");
  if (space) {
    revalidatePath(`/creator/${space.handle}`);
    revalidatePath(`/c/${space.handle}`);
    if (publishedNowSlug) {
      await notifySpaceContentPublished({
        spaceId: space.id,
        contentKindLabel: "interview Q&A",
        contentTitle: data.title.trim(),
        href: `/c/${space.handle}/interview/${publishedNowSlug}`,
      });
    }
  }
  return { id: savedId, slug: savedSlug, handle: space?.handle ?? null };
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
  body: z.string().max(50_000).optional(),
  bodyJson: z.unknown().optional(),
  coverImage: coverImageSchema.nullish(),
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
    body: data.body ?? "",
    bodyJson: (data.bodyJson ?? undefined) as object | undefined,
    ...(data.coverImage !== undefined ? { coverImage: data.coverImage || null } : {}),
  };

  let targetSpaceId: string;
  let savedId: string;
  let savedSlug: string;
  let publishedNowSlug: string | null = null;

  if (data.id) {
    const existing = await prisma.interviewExperience.findUnique({
      where: { id: data.id },
      select: { authorId: true, spaceId: true, slug: true, published: true },
    });
    if (!existing || existing.authorId !== userId) throw new Error("Experience not found.");
    targetSpaceId = existing.spaceId;
    savedId = data.id;
    savedSlug = existing.slug;
    if (data.published === true && !existing.published) publishedNowSlug = existing.slug;
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
    if (data.published === true) publishedNowSlug = slug;
    savedSlug = slug;
    const created = await prisma.interviewExperience.create({
      data: {
        spaceId: space.id,
        authorId: userId,
        slug,
        ...fields,
        ...(data.published !== undefined ? { published: data.published } : {}),
      },
    });
    savedId = created.id;
  }

  const space = await prisma.creatorSpace.findUnique({ where: { id: targetSpaceId } });
  revalidatePath("/creator");
  if (space) {
    revalidatePath(`/creator/${space.handle}`);
    revalidatePath(`/c/${space.handle}`);
    if (publishedNowSlug) {
      await notifySpaceContentPublished({
        spaceId: space.id,
        contentKindLabel: "interview experience",
        contentTitle: data.title.trim(),
        href: `/c/${space.handle}/experience/${publishedNowSlug}`,
      });
    }
  }
  return { id: savedId, slug: savedSlug, handle: space?.handle ?? null };
}

// ── Quick publish toggle (content library) ───────────────────────────────────
type SpaceNativeType = "TUTORIAL" | "INTERVIEW_QA" | "INTERVIEW_EXPERIENCE";

/** Flip published on space-native content; fires follower notify on the draft→published transition. */
export async function setContentPublishedAction(
  spaceId: string,
  contentType: SpaceNativeType,
  contentId: string,
  published: boolean,
) {
  const userId = await requireCreator();
  const space = await requireMySpace(spaceId, userId);

  let title = "";
  let slug = "";
  let wasPublished = false;
  if (contentType === "TUTORIAL") {
    const row = await prisma.tutorial.findFirst({
      where: { id: contentId, spaceId: space.id, authorId: userId },
      select: { title: true, slug: true, published: true },
    });
    if (!row) throw new Error("Not found.");
    ({ title, slug } = row);
    wasPublished = row.published;
    await prisma.tutorial.update({ where: { id: contentId }, data: { published } });
  } else if (contentType === "INTERVIEW_QA") {
    const row = await prisma.interviewQA.findFirst({
      where: { id: contentId, spaceId: space.id, authorId: userId },
      select: { title: true, slug: true, published: true },
    });
    if (!row) throw new Error("Not found.");
    ({ title, slug } = row);
    wasPublished = row.published;
    await prisma.interviewQA.update({ where: { id: contentId }, data: { published } });
  } else {
    const row = await prisma.interviewExperience.findFirst({
      where: { id: contentId, spaceId: space.id, authorId: userId },
      select: { title: true, slug: true, published: true },
    });
    if (!row) throw new Error("Not found.");
    ({ title, slug } = row);
    wasPublished = row.published;
    await prisma.interviewExperience.update({ where: { id: contentId }, data: { published } });
  }

  revalidatePath(`/creator/${space.handle}`);
  revalidatePath(`/c/${space.handle}`);

  if (published && !wasPublished) {
    const path =
      contentType === "TUTORIAL" ? "tutorials" : contentType === "INTERVIEW_QA" ? "interview" : "experience";
    const label =
      contentType === "TUTORIAL" ? "tutorial" : contentType === "INTERVIEW_QA" ? "interview Q&A" : "interview experience";
    await notifySpaceContentPublished({
      spaceId: space.id,
      contentKindLabel: label,
      contentTitle: title,
      href: `/c/${space.handle}/${path}/${slug}`,
    });
  }
}

// ── Comp memberships (audience page) ─────────────────────────────────────────
/**
 * Grant a free ("comp") membership at a tier rank — for collaborators, early
 * supporters, giveaways. Modeled as a SpaceMembership with a synthetic
 * subscription id so the access engine treats it exactly like a paid member;
 * Stripe webhooks never touch it because the id can't match a real sub.
 */
export async function grantCompMembershipAction(spaceId: string, email: string, tierRank: number) {
  const userId = await requireCreator();
  const space = await requireMySpace(spaceId, userId);

  const tier = await prisma.spaceTier.findUnique({
    where: { spaceId_rank: { spaceId: space.id, rank: tierRank } },
    select: { rank: true, name: true },
  });
  if (!tier) throw new Error("Tier not found.");

  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase().trim() },
    select: { id: true },
  });
  if (!user) throw new Error("No Interviewpad account with that email.");
  if (user.id === userId) throw new Error("You already own this space.");

  await prisma.spaceMembership.upsert({
    where: { subscriberId_spaceId: { subscriberId: user.id, spaceId: space.id } },
    update: { tierRank: tier.rank, status: "active" },
    create: {
      subscriberId: user.id,
      spaceId: space.id,
      tierRank: tier.rank,
      stripeSubscriptionId: `comp_${space.id.slice(0, 8)}_${user.id.slice(0, 8)}_${Date.now().toString(36)}`,
      status: "active",
    },
  });
  revalidatePath(`/creator/${space.handle}/users`);
}

export async function revokeCompMembershipAction(spaceId: string, membershipId: string) {
  const userId = await requireCreator();
  const space = await requireMySpace(spaceId, userId);
  const m = await prisma.spaceMembership.findUnique({
    where: { id: membershipId },
    select: { spaceId: true, stripeSubscriptionId: true },
  });
  if (!m || m.spaceId !== space.id) throw new Error("Not found.");
  if (!m.stripeSubscriptionId.startsWith("comp_")) {
    throw new Error("Only comp memberships can be revoked here — paid subscriptions cancel via Stripe.");
  }
  await prisma.spaceMembership.delete({ where: { id: membershipId } });
  revalidatePath(`/creator/${space.handle}/users`);
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
