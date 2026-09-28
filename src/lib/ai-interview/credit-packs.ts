/**
 * AI screening credit packs. Pure (no Prisma) so client components, such as
 * the public pricing page, can show the same prices checkout charges.
 */

/**
 * Public-facing credit pack tiers. Prices are USD cents. Keep in sync with any
 * Stripe Product/Price catalog you decide to set up — the checkout flow uses
 * `price_data` so no Stripe-side IDs are required to start.
 */
export const AI_CREDIT_PACKS = [
  {
    id: "starter-10",
    credits: 10,
    priceCents: 2900,
    label: "Starter",
    sublabel: "10 screenings",
  },
  {
    id: "team-50",
    credits: 50,
    priceCents: 12900,
    label: "Team",
    sublabel: "50 screenings",
    badge: "Most popular",
  },
  {
    id: "scale-200",
    credits: 200,
    priceCents: 44900,
    label: "Scale",
    sublabel: "200 screenings",
  },
] as const;

export type AiCreditPack = (typeof AI_CREDIT_PACKS)[number];

export function getAiCreditPack(id: string): AiCreditPack | undefined {
  return AI_CREDIT_PACKS.find((p) => p.id === id);
}
