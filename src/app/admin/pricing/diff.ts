/**
 * Readable diff between two stored pricing settings (the JSON in the
 * pricing_settings SiteSetting, as kept on PricingChange rows). Pure.
 */

export type DiffLine = { path: string; label: string; from: string; to: string };

type Json = unknown;

const isRecord = (v: Json): v is Record<string, Json> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Flatten nested JSON into "a.b.c" -> leaf. Arrays are kept whole. */
export function flatten(v: Json, prefix = "", out: Record<string, Json> = {}): Record<string, Json> {
  if (isRecord(v)) {
    for (const [k, child] of Object.entries(v)) flatten(child, prefix ? `${prefix}.${k}` : k, out);
  } else if (prefix) {
    out[prefix] = v;
  }
  return out;
}

const WORDS: Record<string, string> = {
  prices: "",
  growth: "Growth seat",
  starter: "Starter seat",
  videoAddon: "Video add-on",
  packs: "Pack",
  plans: "Plan",
  packBadges: "Pack badge",
  monthlyCents: "monthly",
  annualMonthlyCents: "yearly, per month",
  annualCents: "yearly",
  priceCents: "price",
  credits: "credits",
  name: "name",
  audience: "who it is for",
  includes: "included list",
  recommended: "recommended",
};

/** "prices.growth.monthlyCents" -> "Growth seat, monthly". */
export function pathLabel(path: string): string {
  const parts = path.split(".");
  const words = parts.map((p) => (p in WORDS ? WORDS[p] : p)).filter(Boolean);
  if (!words.length) return path;
  const [head, ...rest] = words;
  return rest.length ? `${head} ${rest[0]}${rest.length > 1 ? `, ${rest.slice(1).join(", ")}` : ""}` : head;
}

/** Show one leaf: cents as dollars, lists by length, missing as "default". */
export function showValue(path: string, v: Json): string {
  if (v === undefined) return "default";
  if (v === null) return "none";
  if (typeof v === "number" && /Cents$/.test(path)) return `$${(v / 100).toLocaleString("en-US", { minimumFractionDigits: v % 100 ? 2 : 0 })}`;
  if (typeof v === "number") return v.toLocaleString("en-US");
  if (typeof v === "boolean") return v ? "yes" : "no";
  if (Array.isArray(v)) return `${v.length} line${v.length === 1 ? "" : "s"}`;
  const s = String(v);
  return s.length > 60 ? `“${s.slice(0, 57)}…”` : `“${s}”`;
}

/** Every leaf that differs, sorted with prices first. */
export function pricingDiff(before: Json, after: Json): DiffLine[] {
  const a = flatten(before);
  const b = flatten(after);
  const paths = [...new Set([...Object.keys(a), ...Object.keys(b)])];
  const lines: DiffLine[] = [];
  for (const path of paths) {
    if (JSON.stringify(a[path]) === JSON.stringify(b[path])) continue;
    lines.push({ path, label: pathLabel(path), from: showValue(path, a[path]), to: showValue(path, b[path]) });
  }
  const rank = (p: string) => (p.startsWith("prices.") || p.startsWith("starter.") ? 0 : 1);
  return lines.sort((x, y) => rank(x.path) - rank(y.path) || x.path.localeCompare(y.path));
}
