/**
 * When a workspace room interview ends, the code written in each coding
 * round is saved as that challenge's attempt, so the report shows it like
 * any other submission. Rounds already graded with Submit keep their graded
 * attempt. Server only.
 */
import * as Y from "yjs";
import { prisma } from "@/lib/prisma";
import { ROUND_META, parseRound } from "./room";

export async function snapshotRoomRounds(sessionId: string): Promise<number> {
  const s = await prisma.interviewSession.findUnique({ where: { id: sessionId }, select: { userId: true, challengeIds: true, startedAt: true } });
  if (!s) return 0;
  const rows = await prisma.interviewToolUpdate.findMany({ where: { sessionId, channel: "tools" }, orderBy: { id: "asc" }, select: { update: true } });
  if (!rows.length) return 0;
  const doc = new Y.Doc();
  for (const r of rows) Y.applyUpdate(doc, new Uint8Array(r.update));
  const meta = doc.getMap<string>(ROUND_META);

  // round key -> { path -> code }
  const byRound = new Map<string, Record<string, string>>();
  for (const name of doc.share.keys()) {
    const m = /^round:(c:[^:]+:\d+):(.+)$/.exec(name);
    if (!m) continue;
    const text = doc.getText(name).toString();
    if (!text.trim()) continue;
    const files = byRound.get(m[1]) ?? {};
    files[m[2]] = text;
    byRound.set(m[1], files);
  }
  let saved = 0;
  const allowed = new Set<string>(JSON.parse(s.challengeIds || "[]"));
  for (const [key, all] of byRound) {
    const r = parseRound(key);
    if (!r || !allowed.has(r.id)) continue;
    const exists = await prisma.challengeAttempt.findFirst({ where: { sessionId, challengeId: r.id }, select: { id: true } });
    if (exists) continue;
    const step = await prisma.challengeStep.findFirst({ where: { challengeId: r.id }, orderBy: { position: "asc" }, skip: r.step, select: { id: true } });
    // Harness rounds keep one text per language; save the one in use.
    const lang = meta.get(`${key}:lang`);
    const files: Record<string, string> = {};
    for (const [path, code] of Object.entries(all)) {
      if (path.startsWith("lang:")) {
        if (path === `lang:${lang}`) files[`solution.${lang}`] = code;
      } else files[path] = code;
    }
    if (!Object.keys(files).length) continue;
    await prisma.challengeAttempt.create({
      data: {
        userId: s.userId,
        challengeId: r.id,
        stepId: step?.id ?? null,
        status: "in_progress",
        files: JSON.stringify(files),
        sessionId,
        durationSec: s.startedAt ? Math.round((Date.now() - s.startedAt.getTime()) / 1000) : null,
        finishedAt: new Date(),
      },
    });
    saved++;
  }
  doc.destroy();
  return saved;
}
