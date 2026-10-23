"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminAccess } from "@/lib/permissions/staff";
import { logAdminAction } from "@/lib/admin/audit";
import { sanitizePricingCopy, type PricingCopy } from "@/lib/billing/pricing-copy";
import { sanitizePriceOverrides, type PriceOverrides } from "@/lib/billing/prices";
import { sanitizeCatalogOverrides, type CatalogOverrides } from "@/lib/billing/catalog";
import {
  getPricingSettingsVersioned,
  PRICING_SETTINGS_KEY,
  pricingVersionOf,
  sanitizeStarterOverride,
  serializePricingSettings,
  type StarterOverride,
  type StoredPricingSettings,
} from "@/lib/billing/pricing-copy-store";
import { pricingDiff } from "./diff";

export type SavePricingResult =
  | { ok: true; copy: PricingCopy; prices: PriceOverrides; starter: StarterOverride; version: string }
  | { ok: false; error: string };

async function actor() {
  const session = await requireAdminAccess();
  return { id: session?.user?.id ?? null, email: session?.user?.email ?? null };
}

function revalidatePricing() {
  revalidatePath("/pricing");
  revalidatePath("/hire");
  revalidatePath("/admin/pricing");
  revalidatePath("/docs/mcp");
}

const asJson = (value: string | null): Prisma.InputJsonValue => (value ? (JSON.parse(value) as Prisma.InputJsonValue) : {});

const STALE = "Pricing was changed by someone else since you opened this page. Reload to see their change, then make yours again.";

/**
 * Write the pricing row and a PricingChange in one transaction, holding an
 * advisory lock so two saves cannot interleave. `expectedVersion` must match
 * the row as it is now (see pricingVersionOf), so nothing is overwritten
 * unseen.
 */
async function writeSettings(next: string | null, expectedVersion: string, who: { id: string | null; email: string | null }, note: string) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${PRICING_SETTINGS_KEY}))`;
    const row = await tx.siteSetting.findUnique({ where: { key: PRICING_SETTINGS_KEY } });
    const current = row?.value ?? null;
    if (pricingVersionOf(current) !== expectedVersion) return { stale: true as const };
    if ((current ?? null) === next) return { unchanged: true as const };
    if (next === null) await tx.siteSetting.deleteMany({ where: { key: PRICING_SETTINGS_KEY } });
    else await tx.siteSetting.upsert({ where: { key: PRICING_SETTINGS_KEY }, update: { value: next }, create: { key: PRICING_SETTINGS_KEY, value: next } });
    await tx.pricingChange.create({
      data: { actorId: who.id, actorEmail: who.email, before: asJson(current), after: asJson(next), note },
    });
    return { before: current, version: pricingVersionOf(next) };
  });
}

/**
 * Save the pricing page wording and price overrides (including the Starter
 * seat). Wording is sanitized; prices are validated and any price outside
 * its bounds rejects the whole save. A note is required; every save writes a
 * PricingChange row (before, after, who, note) and an audit entry. New prices
 * apply to new checkouts; existing subscription items keep their price.
 */
export async function savePricingCopy(input: unknown, note: string, version: string): Promise<SavePricingResult> {
  const who = await actor();
  const n = (note ?? "").trim().slice(0, 500);
  if (!n) return { ok: false, error: "Add a note saying what changed and why." };
  const raw = typeof input === "object" && input !== null ? (input as { prices?: unknown; starter?: unknown }) : {};
  const copy = sanitizePricingCopy(input);
  const { prices, errors } = sanitizePriceOverrides(raw.prices);
  const { starter, errors: starterErrors } = sanitizeStarterOverride(raw.starter);
  if (errors.length || starterErrors.length) return { ok: false, error: [...errors, ...starterErrors].join(" ") };

  // The plan catalogue is edited in its own form; keep what is stored. A save
  // made against an older version is refused as stale below, so this read
  // cannot carry an outdated catalogue over a newer one.
  const stored = await getPricingSettingsVersioned();
  const settings: StoredPricingSettings = { copy, prices, starter, catalog: stored.catalog };
  const next = serializePricingSettings(settings);
  const res = await writeSettings(next, version, who, n);
  if ("stale" in res) return { ok: false, error: STALE };
  if ("unchanged" in res) return { ok: false, error: "Nothing changed." };

  const diff = pricingDiff(asJson(res.before), asJson(next));
  await logAdminAction({
    actor: who,
    action: "pricing.update",
    targetType: "pricing",
    targetId: PRICING_SETTINGS_KEY,
    targetLabel: "Pricing",
    before: asJson(res.before),
    after: { settings: asJson(next), changes: diff.map((d) => `${d.label}: ${d.from} -> ${d.to}`) },
    note: n,
  });
  revalidatePricing();
  return { ok: true, copy, prices, starter, version: res.version };
}

export type SaveCatalogResult = { ok: true; catalog: CatalogOverrides; version: string } | { ok: false; error: string };

/**
 * Save price, credit and pack overrides for the new plan catalogue (Basic,
 * Growth, Teams and the top-up packs). Leaves the wording and the current
 * prices as stored. Any value outside its bounds rejects the whole save; a
 * broken price ladder is only a warning, shown in the form. Same note,
 * version check, history row and audit entry as the other pricing saves.
 */
export async function saveCatalogPrices(input: unknown, note: string, version: string): Promise<SaveCatalogResult> {
  const who = await actor();
  const n = (note ?? "").trim().slice(0, 500);
  if (!n) return { ok: false, error: "Add a note saying what changed and why." };
  const { catalog, errors } = sanitizeCatalogOverrides(input);
  if (errors.length) return { ok: false, error: errors.join(" ") };

  const stored = await getPricingSettingsVersioned();
  if (stored.version !== version) return { ok: false, error: STALE };
  const next = serializePricingSettings({ copy: stored.copy, prices: stored.prices, starter: stored.starter, catalog });
  const res = await writeSettings(next, version, who, n);
  if ("stale" in res) return { ok: false, error: STALE };
  if ("unchanged" in res) return { ok: false, error: "Nothing changed." };

  const diff = pricingDiff(asJson(res.before), asJson(next));
  await logAdminAction({
    actor: who,
    action: "pricing.catalog.update",
    targetType: "pricing",
    targetId: PRICING_SETTINGS_KEY,
    targetLabel: "Plan catalogue",
    before: asJson(res.before),
    after: { settings: asJson(next), changes: diff.map((d) => `${d.label}: ${d.from} -> ${d.to}`) },
    note: n,
  });
  revalidatePath("/admin/pricing");
  return { ok: true, catalog, version: res.version };
}

/**
 * Drop every override (wording, prices, Starter) so everything comes from
 * code. Needs `confirm: true` and the version the admin was looking at, plus
 * a note; never runs on a stray call.
 */
export async function resetPricingCopy(input: { confirm: boolean; version: string; note: string }): Promise<{ ok: true; version: string } | { ok: false; error: string }> {
  const who = await actor();
  if (input?.confirm !== true) return { ok: false, error: "Reset needs an explicit confirmation." };
  const n = (input.note ?? "").trim().slice(0, 500);
  if (!n) return { ok: false, error: "Add a note saying why you are resetting." };
  const res = await writeSettings(null, String(input.version ?? ""), who, n);
  if ("stale" in res) return { ok: false, error: STALE };
  if ("unchanged" in res) return { ok: false, error: "Everything already uses the defaults." };
  await logAdminAction({
    actor: who,
    action: "pricing.reset",
    targetType: "pricing",
    targetId: PRICING_SETTINGS_KEY,
    targetLabel: "Pricing",
    before: asJson(res.before),
    after: {},
    note: n,
  });
  revalidatePricing();
  return { ok: true, version: res.version };
}

/** Turns buying the new plans (Basic, Growth, Teams) on Billing on or off. */
export async function setNewPlansAction(on: boolean): Promise<{ ok: true; on: boolean } | { ok: false; error: string }> {
  const who = await actor();
  const { newPlansEnabled, setNewPlansEnabled, NEW_PLANS_SETTING } = await import("@/lib/billing/account-plan-server");
  const before = await newPlansEnabled();
  await setNewPlansEnabled(on);
  await logAdminAction({
    actor: who,
    action: on ? "pricing.new_plans.on" : "pricing.new_plans.off",
    targetType: "pricing",
    targetId: NEW_PLANS_SETTING,
    targetLabel: "New plans checkout",
    before: { on: before },
    after: { on },
  });
  revalidatePricing();
  return { ok: true, on };
}
