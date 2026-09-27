import { prisma } from "@/lib/prisma";
import { listScreeningOptions } from "@/lib/ats/screenings";
import { cleanScreeningKind, cleanSendMode } from "@/lib/ats/settings";
import type { MappingRow, ScreeningChoice } from "./MappingEditor";

/** Job mapping rows with their open request counts, plus the screenings to pick from. */
export async function loadMappingData(workspaceId: string, provider: string): Promise<{ rows: MappingRow[]; screenings: ScreeningChoice[] }> {
  const [mappings, open, screenings] = await Promise.all([
    prisma.atsJobMapping.findMany({ where: { workspaceId, provider }, orderBy: { createdAt: "asc" } }),
    prisma.atsTestRequest.groupBy({
      by: ["mappingId"],
      where: { workspaceId, provider, reportedAt: null },
      _count: { _all: true },
    }),
    listScreeningOptions(workspaceId),
  ]);
  return {
    rows: mappings.map((m) => ({
      id: m.id,
      jobName: m.jobName,
      jobDetail: m.jobDetail ?? "",
      screeningKind: cleanScreeningKind(m.screeningKind),
      screeningId: m.screeningId,
      sendMode: cleanSendMode(m.sendMode),
      openCandidates: open.find((o) => o.mappingId === m.id)?._count._all ?? 0,
    })),
    screenings,
  };
}
