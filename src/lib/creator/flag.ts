import { prisma } from "@/lib/prisma";

/**
 * Feature flag for Creator Space v2. Stored in SiteSetting so it can be
 * toggled without a deploy. Values:
 *   "off"  — v2 disabled (legacy layout only)
 *   "10"|"50"|"100" — staged rollout percentage (v2 enabled flag)
 *   "on"   — fully enabled
 *
 * Reads are cached per-request via the shared prisma client; callers should
 * treat a missing row as "off".
 */
const FLAG_KEY = "creator_v2";

export type CreatorV2Flag = "off" | "on" | "10" | "50" | "100";

export async function getCreatorV2Flag(): Promise<CreatorV2Flag> {
  try {
    const row = await prisma.siteSetting.findUnique({ where: { key: FLAG_KEY } });
    const v = row?.value?.trim().toLowerCase();
    if (v === "on" || v === "10" || v === "50" || v === "100") return v as CreatorV2Flag;
    return "off";
  } catch {
    return "off";
  }
}

export async function isCreatorV2Enabled(): Promise<boolean> {
  const flag = await getCreatorV2Flag();
  return flag !== "off";
}

/**
 * Percentage rollout check. Call with a stable bucket (e.g. spaceId hash).
 * "off" → false, "on"/"100" → true, "10"/"50" → bucket-based.
 */
export function isV2EnabledForBucket(flag: CreatorV2Flag, bucket: number): boolean {
  if (flag === "off") return false;
  if (flag === "on" || flag === "100") return true;
  const pct = parseInt(flag, 10);
  if (!Number.isFinite(pct)) return false;
  return (bucket % 100) < pct;
}

export function bucketForString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
