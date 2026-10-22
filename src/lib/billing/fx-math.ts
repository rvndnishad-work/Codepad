/** Pure currency helpers, safe for client components. */

/** A USD to INR rate outside this range is treated as a broken feed. */
export const RATE_BOUNDS = { min: 50, max: 200 } as const;

/** US cents to paise at `rate`, rounded up to a whole rupee. */
export function usdCentsToInrPaise(cents: number, rate: number): number {
  // Work in hundredths to avoid float noise like 29 * 84.5 = 2450.4999...
  const rupees = Math.ceil(Math.round(cents * rate) / 100);
  return rupees * 100;
}

export function formatInr(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}
