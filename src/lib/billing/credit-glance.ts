/**
 * AI credits at a glance: how healthy the balance is, how long it lasts at
 * the recent pace, and how much each credit pack saves. Pure, so the
 * Overview, the Billing page and the tests share the same numbers.
 */

export type CreditGlance = {
  balance: number;
  held: number;
  available: number;
  usedThisMonth: number;
  /** Credits used (net of refunds) over the last RUNWAY_WINDOW_DAYS days. */
  usedRecent: number;
};

/** Used for the status colour when the workspace has not set a low-credit email. */
export const DEFAULT_LOW_CREDITS = 10;

/** How far back the pace is measured. */
export const RUNWAY_WINDOW_DAYS = 30;

export type CreditHealth = "empty" | "low" | "ok";

export function creditHealth(available: number, threshold: number | null): CreditHealth {
  if (available <= 0) return "empty";
  if (available < (threshold ?? DEFAULT_LOW_CREDITS)) return "low";
  return "ok";
}

export type CreditRunway = {
  /** Credits used per week over the window, or null when none were used. */
  perWeek: number | null;
  /** Whole weeks left at that pace, or null when there is no pace yet. */
  weeks: number | null;
  /** A short phrase such as "About 6 weeks". */
  label: string;
};

/**
 * How long `available` credits last if the workspace keeps using credits
 * at the pace of the last `days` days.
 */
export function creditRunway(available: number, usedInWindow: number, days = RUNWAY_WINDOW_DAYS): CreditRunway {
  if (usedInWindow <= 0) return { perWeek: null, weeks: null, label: `No credits used in the last ${days} days` };
  const perWeek = usedInWindow / (days / 7);
  if (available <= 0) return { perWeek, weeks: 0, label: "Out of credits" };
  const weeks = available / perWeek;
  let label: string;
  if (weeks < 1) label = "Less than a week";
  else if (weeks < 9) label = `About ${Math.floor(weeks)} ${Math.floor(weeks) === 1 ? "week" : "weeks"}`;
  else if (weeks < 52) label = `About ${Math.floor(weeks / 4.345)} months`;
  else label = "More than a year";
  return { perWeek, weeks: Math.floor(weeks), label };
}

/**
 * Percent saved per credit against the dearest pack, by pack id. The
 * dearest pack (and any pack that saves under 1%) is left out.
 */
export function packSavings(packs: { id: string; credits: number; priceCents: number }[]): Record<string, number> {
  const per = packs.filter((p) => p.credits > 0).map((p) => ({ id: p.id, each: p.priceCents / p.credits }));
  if (per.length === 0) return {};
  const dearest = Math.max(...per.map((p) => p.each));
  const out: Record<string, number> = {};
  for (const p of per) {
    const pct = Math.round((1 - p.each / dearest) * 100);
    if (pct >= 1) out[p.id] = pct;
  }
  return out;
}

/** Screenings a number of credits covers: each screening uses 1 to 3. */
export function screeningsCovered(credits: number): { min: number; max: number } {
  return { min: Math.floor(credits / 3), max: credits };
}
