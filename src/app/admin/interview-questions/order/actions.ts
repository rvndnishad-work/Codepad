"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logAdminAction } from "@/lib/admin/audit";
import { TECHNOLOGIES, techLabel } from "@/lib/interview-questions/shared";
import { DIFFICULTY_ORDER, type DifficultyKey } from "@/lib/interview-questions/topic-catalog";
import { suggestTopicOrder } from "@/lib/interview-questions/ai-order";
import { requireStaff } from "../../content/_lib/guard";
import { fail, ok, type ActionResult } from "../../content/_lib/result";

export type OrderBands = Record<DifficultyKey, string[]>;

const isTech = (slug: string) => TECHNOLOGIES.some((t) => t.slug === slug);
const isBand = (d: string): d is DifficultyKey => (DIFFICULTY_ORDER as readonly string[]).includes(d);

/**
 * Persist the order of one technology track: each band's slugs get
 * sortOrder 1..n, and every other row of that technology and band is reset to
 * null so a question moved between bands never keeps a stale position.
 */
export async function saveTopicOrder(tech: string, bands: OrderBands): Promise<ActionResult> {
  const { actor } = await requireStaff("content:curate");
  if (!isTech(tech)) return fail("Unknown technology.");

  const slugs = new Set<string>();
  for (const d of DIFFICULTY_ORDER) {
    if (!Array.isArray(bands[d])) return fail("Malformed order.");
    for (const s of bands[d]) {
      if (typeof s !== "string" || slugs.has(s)) return fail("Malformed order.");
      slugs.add(s);
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.prepQuestion.updateMany({ where: { technology: tech }, data: { sortOrder: null } });
    for (const d of DIFFICULTY_ORDER) {
      await Promise.all(
        bands[d].map((slug, i) =>
          tx.prepQuestion.updateMany({ where: { slug, technology: tech }, data: { sortOrder: i + 1 } }),
        ),
      );
    }
  });

  await logAdminAction({
    actor,
    action: "content.question.reorder",
    targetType: "question",
    targetId: tech,
    targetLabel: techLabel(tech),
    after: { easy: bands.easy.length, medium: bands.medium.length, hard: bands.hard.length },
  });
  revalidatePath("/admin/interview-questions/order");
  revalidatePath("/interview-questions");
  revalidatePath(`/interview-questions/${tech}`);
  return ok("Order saved.");
}

/** A teaching order for one band, from the app's LLM. The admin reviews it before saving. */
export async function suggestBandOrder(
  tech: string,
  difficulty: string,
  questions: { slug: string; title: string }[],
): Promise<{ ok: true; slugs: string[] } | { ok: false; error: string }> {
  await requireStaff("content:curate");
  if (!isTech(tech) || !isBand(difficulty)) return { ok: false, error: "Unknown topic." };
  if (questions.length > 400) return { ok: false, error: "Too many questions for one suggestion." };
  const slugs = await suggestTopicOrder({ topic: techLabel(tech), difficulty, questions });
  if (!slugs) return { ok: false, error: "No AI key is configured, or the model did not answer. Order by hand instead." };
  return { ok: true, slugs };
}
