/**
 * The screenings a job can be mapped to: AI screenings (batches) and saved
 * take home templates. Server only.
 */
import { prisma } from "@/lib/prisma";
import { SCREENING_KIND_LABELS } from "./settings";

export type ScreeningOption = { kind: "ai" | "takehome"; id: string; label: string };

export async function listScreeningOptions(workspaceId: string): Promise<ScreeningOption[]> {
  const [batches, templates] = await Promise.all([
    prisma.aIScreeningBatch.findMany({
      where: { workspaceId, status: { not: "CLOSED" } },
      orderBy: { createdAt: "desc" },
      select: { id: true, positionTitle: true },
      take: 100,
    }),
    prisma.takeHomeTemplate.findMany({
      where: { workspaceId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true },
      take: 100,
    }),
  ]);
  return [
    ...batches.map((b) => ({ kind: "ai" as const, id: b.id, label: `${SCREENING_KIND_LABELS.ai}: ${b.positionTitle}` })),
    ...templates.map((t) => ({ kind: "takehome" as const, id: t.id, label: `${SCREENING_KIND_LABELS.takehome}: ${t.name}` })),
  ];
}

/** Mapping id -> screening title, for the mappings whose screening still exists. */
export async function screeningTitles(
  workspaceId: string,
  mappings: { id: string; screeningKind: string; screeningId: string | null }[],
): Promise<Map<string, string>> {
  const aiIds = mappings.filter((m) => m.screeningKind === "ai" && m.screeningId).map((m) => m.screeningId!);
  const thIds = mappings.filter((m) => m.screeningKind === "takehome" && m.screeningId).map((m) => m.screeningId!);
  const [batches, templates] = await Promise.all([
    aiIds.length ? prisma.aIScreeningBatch.findMany({ where: { id: { in: aiIds }, workspaceId }, select: { id: true, positionTitle: true } }) : [],
    thIds.length ? prisma.takeHomeTemplate.findMany({ where: { id: { in: thIds }, workspaceId }, select: { id: true, name: true } }) : [],
  ]);
  const out = new Map<string, string>();
  for (const m of mappings) {
    if (m.screeningKind === "ai") {
      const b = batches.find((x) => x.id === m.screeningId);
      if (b) out.set(m.id, `${SCREENING_KIND_LABELS.ai}, ${b.positionTitle}`);
    } else if (m.screeningKind === "takehome") {
      const t = templates.find((x) => x.id === m.screeningId);
      if (t) out.set(m.id, `${SCREENING_KIND_LABELS.takehome}, ${t.name}`);
    }
  }
  return out;
}
