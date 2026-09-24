/**
 * Creates screening invites: snapshots each round's starter files (so grading
 * never drifts from what the candidate was given), then writes one session per
 * candidate with its rounds. Used by New screening and by "Add people" on an
 * existing screening. Server-only.
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveTemplate } from "./template-resolver";
import { REACT_SANDBOX_BASE } from "./round-content";
import type { RoundSpecInput } from "./rounds";

export function sanitizeRoundSpec(r: RoundSpecInput, idx: number): RoundSpecInput {
  const paradigm = r.paradigm;
  if (!["frontend", "backend", "dsa"].includes(paradigm)) {
    throw new Error(`Round ${idx + 1}: invalid paradigm "${paradigm}".`);
  }
  const sourceKind = r.sourceKind;
  if (!["challenge", "playground", "scaffold"].includes(sourceKind)) {
    throw new Error(`Round ${idx + 1}: invalid source kind "${sourceKind}".`);
  }
  if (sourceKind === "scaffold") {
    if (!r.templateId?.trim()) throw new Error(`Round ${idx + 1} has no question.`);
  } else if (!r.sourceId?.trim()) {
    throw new Error(`Round ${idx + 1} has no question.`);
  }
  const minutes = Number(r.estimatedMinutes ?? 30);
  return {
    paradigm,
    language: r.language?.trim() || undefined,
    frameworkLabel: r.frameworkLabel?.trim() || undefined,
    sourceKind,
    sourceId: r.sourceId?.trim() || undefined,
    templateId: r.templateId?.trim() || undefined,
    estimatedMinutes: Number.isFinite(minutes) ? Math.min(180, Math.max(5, minutes)) : 30,
  };
}

const specKey = (r: RoundSpecInput) => `${r.sourceKind}:${r.sourceId ?? ""}:${r.templateId ?? ""}`;

/** Starter files per distinct round spec, keyed by source. */
export async function snapshotStarters(specs: RoundSpecInput[], workspaceId: string): Promise<Map<string, Record<string, string> | null>> {
  const cache = new Map<string, Record<string, string> | null>();
  const { templates: catalog } = await import("@/lib/templates");
  const chalIds = [...new Set(specs.filter((r) => r.sourceKind === "challenge" && r.sourceId).map((r) => r.sourceId!))];
  const chalRows = chalIds.length
    ? await prisma.challenge.findMany({ where: { id: { in: chalIds } }, select: { id: true, starterFiles: true } })
    : [];
  const chalMap = new Map(chalRows.map((c) => [c.id, c.starterFiles as string]));
  for (const r of specs) {
    const k = specKey(r);
    if (cache.has(k)) continue;
    let files: Record<string, string> | null = null;
    try {
      if (r.sourceKind === "scaffold" && r.templateId) {
        const tpl = await resolveTemplate(r.templateId, workspaceId).catch(() => undefined);
        if (tpl?.starterFiles) files = tpl.starterFiles;
      } else if (r.sourceKind === "challenge" && r.sourceId) {
        const raw = chalMap.get(r.sourceId);
        if (raw) {
          try {
            const p = JSON.parse(raw);
            if (p && typeof p === "object" && !Array.isArray(p)) files = p as Record<string, string>;
          } catch {}
        }
      } else if (r.sourceKind === "playground" && r.sourceId) {
        const def = catalog.find((t) => t.id === r.sourceId);
        if (def?.files) {
          const out: Record<string, string> = {};
          for (const [pp, val] of Object.entries(def.files as Record<string, unknown>)) {
            if (typeof val === "string") out[pp] = val;
            else if (val && typeof val === "object" && "code" in val) out[pp] = String((val as { code: unknown }).code ?? "");
          }
          if (Object.keys(out).length > 0) files = out;
        }
      }
    } catch {}
    // Frontend scaffold/playground rounds render inside Sandpack's react
    // template, so merge its base files; otherwise they show up as phantom new
    // files when the candidate submits without editing.
    if (r.sourceKind !== "challenge" && r.paradigm === "frontend") {
      files = { ...REACT_SANDBOX_BASE, ...(files ?? {}) };
    }
    cache.set(k, files);
  }
  return cache;
}

export type InviteSettings = {
  engagementLevel: string;
  expiresAt: Date | null;
  maxExtensions: number;
  extensionMinutes: number;
};

/** Writes one PENDING session (with rounds) per candidate inside a transaction. */
export async function createSessions(
  tx: Prisma.TransactionClient,
  args: {
    workspaceId: string;
    batchId: string;
    positionTitle: string;
    candidates: { id: string; name: string; email: string }[];
    rounds: RoundSpecInput[];
    starters: Map<string, Record<string, string> | null>;
    settings: InviteSettings;
  },
) {
  const { rounds, starters, settings } = args;
  const created: { id: string; inviteToken: string; candidateName: string; candidateEmail: string; positionTitle: string; expiresAt: Date | null; rounds: { estimatedMinutes: number }[] }[] = [];
  for (const c of args.candidates) {
    // The legacy templateId column is non-null; point it at the first round.
    const legacyTemplateId = rounds[0].templateId ?? rounds[0].sourceId ?? "batch";
    const firstStarter = starters.get(specKey(rounds[0]));
    const session = await tx.aIInterviewSession.create({
      data: {
        workspaceId: args.workspaceId,
        batchId: args.batchId,
        candidateId: c.id,
        candidateName: c.name,
        candidateEmail: c.email.trim().toLowerCase(),
        positionTitle: args.positionTitle,
        templateId: legacyTemplateId,
        engagementLevel: settings.engagementLevel,
        status: "PENDING",
        chatHistory: "[]",
        filesJson: "{}",
        expiresAt: settings.expiresAt,
        maxExtensions: settings.maxExtensions,
        extensionMinutes: settings.extensionMinutes,
        ...(firstStarter ? { starterFilesJson: JSON.stringify(firstStarter) } : {}),
        rounds: {
          create: rounds.map((r, order) => {
            const sf = starters.get(specKey(r));
            return {
              order,
              paradigm: r.paradigm,
              language: r.language,
              frameworkLabel: r.frameworkLabel,
              sourceKind: r.sourceKind,
              sourceId: r.sourceId,
              templateId: r.templateId,
              estimatedMinutes: r.estimatedMinutes ?? 30,
              filesJson: "{}",
              ...(sf ? { starterFilesJson: JSON.stringify(sf) } : {}),
              status: "PENDING",
            };
          }),
        },
      },
      select: {
        id: true,
        inviteToken: true,
        candidateName: true,
        candidateEmail: true,
        positionTitle: true,
        expiresAt: true,
        rounds: { select: { estimatedMinutes: true } },
      },
    });
    created.push(session);
  }
  return created;
}
