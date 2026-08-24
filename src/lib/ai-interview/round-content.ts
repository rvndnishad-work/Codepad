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
import { resolveSessionRounds, type SessionRound, type Paradigm } from "./rounds";

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

export const DEFAULT_STARTER: Record<string, string> = {
  "/index.js": "// Start coding here\n",
};

/** True when a starter map is just the generic fallback sentinel (not a real template). */
export function isDefaultStarter(starter: Record<string, string> | null | undefined): boolean {
  if (!starter || Object.keys(starter).length !== 1) return false;
  return starter["/index.js"] === "// Start coding here\n";
}

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
    let starterFiles: Record<string, string> | null = null;

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
        const parsed = parseFiles(c.starterFiles);
        if (parsed) starterFiles = parsed;
      }
    } else if (round.sourceKind === "playground") {
      const def = round.sourceId ? templates.find((t) => t.id === round.sourceId) : undefined;
      if (def) {
        title = def.title;
        description = def.subtitle ?? "";
        starterFiles = flattenCatalogFiles(def.files as Record<string, unknown>);
      }
    }

    // Only fall back to generic sentinel when we truly have no round context
    // (legacy rows with no sourceKind/sourceId). For scaffold/playground
    // lookups that failed, we keep starterFiles=null so callers can detect
    // an unknown baseline instead of crediting phantom NEW FILEs.
    const resolvedStarter = starterFiles ?? (round.sourceKind ? null : DEFAULT_STARTER);
    const effectiveStarter = resolvedStarter ?? DEFAULT_STARTER;

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
      starterFiles: effectiveStarter,
      files: saved ?? effectiveStarter,
      status: round.status,
    });
  }

  return out;
}

/**
 * Resolve the STARTER files for every round of a session — the authoritative
 * baseline for candidate-vs-starter diffs. Snapshot-first: uses the immutable
 * starterFilesJson captured at invite time, falling back to live template
 * re-resolution only for pre-snapshot sessions.
 */
export async function getStarterFilesByRoundId(
  session: { id: string; templateId: string | null; filesJson?: string | null; starterFilesJson?: string | null } & { rounds?: unknown[] },
  workspaceId: string
): Promise<Map<string, Record<string, string>>> {
  const sessionRounds = resolveSessionRounds(session as Parameters<typeof resolveSessionRounds>[0]);
  // Snapshot-first: if any round/session carries starterFilesJson, use it directly
  const rawRoundsById = new Map<string, Record<string, unknown>>(
    ((session as unknown as { rounds?: Array<Record<string, unknown>> }).rounds ?? []).map((r) => [String(r.id), r])
  );
  const snapshotMap = new Map<string, Record<string, string>>();
  let needLiveResolve = false;
  for (const sr of sessionRounds) {
    const raw = rawRoundsById.get(sr.id) as unknown as { starterFilesJson?: string | null } | undefined;
    const snapRaw = raw?.starterFilesJson ?? (sr.legacy ? (session as unknown as { starterFilesJson?: string | null }).starterFilesJson : null);
    const parsed = parseFiles(snapRaw ?? null);
    if (parsed) snapshotMap.set(sr.id, parsed);
    else needLiveResolve = true;
  }
  if (!needLiveResolve) return snapshotMap;

  // Live fallback for rounds still missing a snapshot (pre-migration data)
  // If live resolution yields the generic sentinel (DEFAULT_STARTER), treat as
  // unknown baseline instead of crediting phantom NEW FILEs. The diff UI and
  // grader will then show "no verifiable diff" / clamp to 5, rather than
  // 4 files changed +44 lines for a zero-effort submission.
  const contents = await resolveRoundsContent(sessionRounds, workspaceId);
  const map = new Map<string, Record<string, string>>();
  for (const c of contents) {
    if (snapshotMap.has(c.roundId)) {
      map.set(c.roundId, snapshotMap.get(c.roundId)!);
      continue;
    }
    if (isDefaultStarter(c.starterFiles)) {
      // Unknown baseline — do not populate, caller will handle as missing
      continue;
    }
    map.set(c.roundId, c.starterFiles);
  }
  return map;
}

/**
 * Best-effort inference for historical sessions without a snapshot: pick the
 * template whose starter most closely matches the submitted files (minimal
 * diff). Used to heal phantom diffs where fallback sentinel would otherwise
 * show every file as NEW FILE.
 */
export async function inferStarterForSubmission(
  submitted: Record<string, string>,
  workspaceId: string
): Promise<Record<string, string> | null> {
  const { AI_INTERVIEW_TEMPLATES } = await import("./scaffolds");
  const { templates: catalog } = await import("@/lib/templates");
  // Load workspace custom templates
  let customRows: { starterFiles: string }[] = [];
  try {
    customRows = await prisma.aIInterviewTemplate.findMany({
      where: { workspaceId },
      select: { starterFiles: true },
    });
  } catch {
    customRows = [];
  }

  const candidates: Record<string, string>[] = [];
  // Builtins
  for (const t of AI_INTERVIEW_TEMPLATES) if (t.starterFiles) candidates.push(t.starterFiles);
  // Customs
  for (const r of customRows) {
    try {
      const p = JSON.parse(r.starterFiles);
      if (p && typeof p === "object" && !Array.isArray(p) && Object.keys(p).length > 0) {
        candidates.push(p as Record<string, string>);
      }
    } catch {}
  }
  // Playground catalog
  for (const def of catalog) {
    if (!def.files) continue;
    const out: Record<string, string> = {};
    for (const [pp, val] of Object.entries(def.files as Record<string, unknown>)) {
      if (typeof val === "string") out[pp] = val;
      else if (val && typeof val === "object" && "code" in val) out[pp] = String((val as { code: unknown }).code ?? "");
    }
    if (Object.keys(out).length > 0) candidates.push(out);
  }
  // Also consider generic default as last resort
  candidates.push(DEFAULT_STARTER);

  if (candidates.length === 0) return null;
  // Use diff cost to rank — lazy import to avoid cycle
  const { diffStats, diffFiles } = await import("./diff");
  let best: Record<string, string> | null = null;
  let bestCost = Infinity;
  for (const cand of candidates) {
    try {
      const d = diffFiles(cand, submitted);
      const s = diffStats(d);
      const cost = s.addedLines + s.removedLines;
      if (cost < bestCost) {
        bestCost = cost;
        best = cand;
      }
      if (cost === 0) break;
    } catch {}
  }
  return best;
}
