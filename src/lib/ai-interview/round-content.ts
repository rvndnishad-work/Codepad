/**
 * Resolve a screening round's runnable CONTENT by source kind. Pairs with the
 * pure `resolveSessionRounds` structural adapter: that tells you the rounds;
 * this turns each into the title/surface/starter-files the candidate runtime
 * and the AI interviewer actually need.
 *
 * Three sources (the hybrid model):
 *   - scaffold   → AIInterviewTemplate / builtin (carries its own kind+files)
 *   - challenge  → Challenge row (starter files + problem prose)
 *   - playground → static template catalog (framework / language console)
 *
 * Server-only (touches the DB + the template catalog).
 */

import { prisma } from "@/lib/prisma";
import { templates } from "@/lib/templates";
import { resolveTemplate } from "./template-resolver";
import type { SessionRound, Paradigm } from "./rounds";

export type RoundContent = {
  roundId: string;
  order: number;
  title: string;
  description: string;
  kind: "frontend" | "backend" | "dsa";
  language?: string;
  frameworkLabel?: string;
  estimatedMinutes: number;
  /** Pristine starter files for the round's source. */
  starterFiles: Record<string, string>;
  /** Current files: the candidate's saved round state if any, else starter. */
  files: Record<string, string>;
  status: string;
};

const DEFAULT_STARTER: Record<string, string> = {
  "/index.js": "// Start coding here\n",
};

/** Flatten a SandpackFiles map (string | {code}) to a plain path→code map. */
function flattenCatalogFiles(files: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [path, val] of Object.entries(files)) {
    if (typeof val === "string") out[path] = val;
    else if (val && typeof val === "object" && "code" in val) {
      out[path] = String((val as { code: unknown }).code ?? "");
    }
  }
  return out;
}

function parseFiles(json: string | null | undefined): Record<string, string> | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && Object.keys(parsed).length > 0) {
      return parsed as Record<string, string>;
    }
  } catch {
    // fall through
  }
  return null;
}

/** Surface kind for a round, preferring the explicit paradigm, then a hint. */
function kindFor(paradigm: Paradigm | null, fallback: "frontend" | "backend" | "dsa"): "frontend" | "backend" | "dsa" {
  return paradigm ?? fallback;
}

/**
 * Resolve content for every round of a session in one pass. Challenge lookups
 * are batched into a single query; scaffold/playground resolution is local.
 * Saved per-round files override the starter when present.
 */
export async function resolveRoundsContent(
  rounds: SessionRound[],
  workspaceId: string
): Promise<RoundContent[]> {
  // Batch the challenge rows we'll need.
  const challengeIds = rounds
    .filter((r) => r.sourceKind === "challenge" && r.sourceId)
    .map((r) => r.sourceId as string);
  const challengeRows = challengeIds.length
    ? await prisma.challenge.findMany({
        where: { id: { in: [...new Set(challengeIds)] } },
        select: { id: true, title: true, description: true, starterFiles: true, estimatedMinutes: true },
      })
    : [];
  const challengeById = new Map(challengeRows.map((c) => [c.id, c]));

  const out: RoundContent[] = [];
  for (const round of rounds) {
    let title = "Coding Task";
    let description = "";
    let kind: "frontend" | "backend" | "dsa" = kindFor(round.paradigm, "frontend");
    let language = round.language ?? undefined;
    let frameworkLabel = round.frameworkLabel ?? undefined;
    let estimatedMinutes = round.estimatedMinutes;
    let starterFiles: Record<string, string> = DEFAULT_STARTER;

    if (round.sourceKind === "scaffold") {
      const tpl = round.templateId
        ? await resolveTemplate(round.templateId, workspaceId).catch(() => undefined)
        : undefined;
      if (tpl) {
        title = tpl.title;
        description = tpl.description;
        kind = tpl.kind ?? kindFor(round.paradigm, "frontend");
        language = tpl.language ?? language;
        frameworkLabel = tpl.frameworkLabel ?? frameworkLabel;
        estimatedMinutes = tpl.estimatedMinutes;
        starterFiles = tpl.starterFiles;
      }
    } else if (round.sourceKind === "challenge") {
      const c = round.sourceId ? challengeById.get(round.sourceId) : undefined;
      if (c) {
        title = c.title;
        description = c.description;
        estimatedMinutes = round.estimatedMinutes || c.estimatedMinutes;
        starterFiles = parseFiles(c.starterFiles) ?? DEFAULT_STARTER;
      }
    } else if (round.sourceKind === "playground") {
      const def = round.sourceId ? templates.find((t) => t.id === round.sourceId) : undefined;
      if (def) {
        title = def.title;
        description = def.subtitle ?? "";
        starterFiles = flattenCatalogFiles(def.files as Record<string, unknown>);
      }
    }

    const saved = parseFiles(round.filesJson);
    out.push({
      roundId: round.id,
      order: round.order,
      title,
      description,
      kind,
      language,
      frameworkLabel,
      estimatedMinutes,
      starterFiles,
      files: saved ?? starterFiles,
      status: round.status,
    });
  }

  return out;
}
