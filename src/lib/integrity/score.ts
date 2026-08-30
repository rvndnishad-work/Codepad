/**
 * Unified IntegrityScore for hiring forensics.
 * Merges browser CandidateIntegrityReport (blur/paste) + OS ProctorAgentReport (overlay scan).
 * Used in admin forensics (SessionForensicsModal) and eventually candidate replay.
 */

export type IntegrityInput = {
  browser?: { suspicionScore?: number | null; blurCount?: number | null; pasteCount?: number | null } | null;
  proctor?: { suspicionScore?: number | null; peakSuspicion?: number | null; reportCount?: number | null } | null;
};

export type IntegrityScore = {
  score: number; // 0..100, 0=clean
  level: "clean" | "low" | "medium" | "high";
  reasons: string[];
};

export function computeIntegrityScore(input: IntegrityInput): IntegrityScore {
  const browser = input.browser?.suspicionScore ?? 0;
  const proctor = input.proctor?.suspicionScore ?? input.proctor?.peakSuspicion ?? 0;
  const blur = input.browser?.blurCount ?? 0;
  const paste = input.browser?.pasteCount ?? 0;
  const reports = input.proctor?.reportCount ?? 0;

  // Weighted max with additive nudges for blur/paste/reports
  let score = Math.max(browser, proctor);
  if (blur > 3) score = Math.min(100, score + Math.min(20, (blur - 3) * 3));
  if (paste > 1) score = Math.min(100, score + Math.min(15, paste * 5));
  if (reports > 10 && proctor > 50) score = Math.min(100, score + 5);

  const reasons: string[] = [];
  if (browser > 30) reasons.push(`Browser suspicion ${browser}`);
  if (proctor > 30) reasons.push(`Proctor suspicion ${proctor}`);
  if (blur > 3) reasons.push(`${blur} blurs`);
  if (paste > 1) reasons.push(`${paste} pastes`);
  if (reports > 0 && proctor > 30) reasons.push(`${reports} proctor reports`);

  let level: IntegrityScore["level"] = "clean";
  if (score >= 70) level = "high";
  else if (score >= 40) level = "medium";
  else if (score >= 15) level = "low";

  return { score: Math.round(score), level, reasons };
}

export const LEVEL_STYLES: Record<IntegrityScore["level"], { label: string; cls: string }> = {
  clean: { label: "Clean", cls: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" },
  low: { label: "Low", cls: "text-amber-600 bg-amber-500/10 border-amber-500/20" },
  medium: { label: "Medium", cls: "text-orange-600 bg-orange-500/10 border-orange-500/20" },
  high: { label: "High", cls: "text-rose-600 bg-rose-500/10 border-rose-500/20" },
};
