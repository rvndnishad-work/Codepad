import { prisma } from "@/lib/prisma";
import {
  type MaintenanceConfig,
  DEFAULT_MAINTENANCE,
} from "@/lib/settings-constants";

/**
 * Legacy site-wide switch, kept so nothing that writes it breaks. The proxy no
 * longer reads it directly: src/lib/admin/maintenance-rules.ts turns an "on"
 * value into an active whole-site rule.
 */
export const MAINTENANCE_KEY = "maintenance_mode";

// Memoized at module scope with a short TTL. A DB hit at most once per TTL per
// warm instance.
const TTL_MS = 10_000;
let cached: { value: MaintenanceConfig; at: number } | null = null;

export async function getMaintenanceConfig(): Promise<MaintenanceConfig> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.value;
  try {
    const row = await prisma.siteSetting.findUnique({
      where: { key: MAINTENANCE_KEY },
    });
    const value: MaintenanceConfig = row
      ? { ...DEFAULT_MAINTENANCE, ...(JSON.parse(row.value) as Partial<MaintenanceConfig>) }
      : DEFAULT_MAINTENANCE;
    cached = { value, at: Date.now() };
    return value;
  } catch {
    // Fail OPEN: a DB hiccup must never take the public site down.
    return cached?.value ?? DEFAULT_MAINTENANCE;
  }
}

/** Reset the module cache after an admin writes the flag (best-effort — the
 *  proxy runs in a separate bundle and will still pick up the change within
 *  the TTL window). */
export function clearMaintenanceCache(): void {
  cached = null;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type MaintenancePageOptions = {
  /** Heading, e.g. "The playground is paused". */
  title?: string;
  /** When the rule ends; shows "Back in about N minutes". */
  endsAt?: Date | null;
  /** Pages to go to instead, shown as buttons. */
  elsewhere?: { label: string; href: string }[];
  now?: Date;
};

function backIn(endsAt: Date | null | undefined, now: Date): string | null {
  if (!endsAt) return null;
  const mins = Math.max(1, Math.ceil((endsAt.getTime() - now.getTime()) / 60_000));
  if (mins < 120) return `Back in about ${mins} minute${mins === 1 ? "" : "s"}`;
  const hours = Math.round(mins / 60);
  return hours < 48 ? `Back in about ${hours} hours` : `Back in about ${Math.round(hours / 24)} days`;
}

/**
 * Fully self-contained 503 page. Intentionally has zero dependency on the app
 * render pipeline (inline CSS, no JS, no web fonts) — the app may be down, so
 * this must stand alone. Follows the visitor's light or dark preference and
 * shows the admin message word for word.
 */
export function maintenanceHtml(message?: string, opts: MaintenancePageOptions = {}): string {
  const now = opts.now ?? new Date();
  const title = opts.title?.trim() || "We will be right back";
  const body =
    message?.trim() || "Interviewpad is briefly offline for maintenance. Please check back shortly.";
  const back = backIn(opts.endsAt, now);
  const links = [...(opts.elsewhere ?? []), { label: "Home", href: "/" }]
    .map((l) => `<a class="btn" href="${escapeHtml(l.href)}">${escapeHtml(l.label)}</a>`)
    .join("");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<meta name="color-scheme" content="light dark" />
<title>${escapeHtml(title)} - Interviewpad</title>
<style>
  :root {
    --bg: #e9eff3; --card: #fbfcfd; --border: #cfdbe3; --fg: #0f1730; --muted: #4a5568;
    --subtle: #5a6577; --tile: #a07c3f; --btn: #fbfcfd;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #0b0e14; --card: #12161f; --border: #262c38; --fg: #e6e9ef; --muted: #a3acba;
      --subtle: #8b94a3; --tile: #8a6a35; --btn: #161b25;
    }
  }
  * { box-sizing: border-box; }
  html, body { height: 100%; margin: 0; }
  body {
    background: var(--bg); color: var(--fg);
    font-family: Geist, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    display: flex; align-items: center; justify-content: center; padding: 24px 16px;
  }
  .card {
    width: 100%; max-width: 520px; background: var(--card); border: 1px solid var(--border);
    border-radius: 14px; padding: 48px 28px; text-align: center;
    display: flex; flex-direction: column; align-items: center; gap: 14px;
  }
  .tile {
    width: 48px; height: 48px; border-radius: 12px; background: var(--tile); color: #fff;
    display: flex; align-items: center; justify-content: center;
  }
  h1 { margin: 0; font-size: 20px; font-weight: 600; line-height: 1.3; }
  p { margin: 0; font-size: 14px; line-height: 1.5; color: var(--muted); max-width: 38ch; white-space: pre-line; }
  .back { font-size: 13px; color: var(--muted); }
  .links { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; margin-top: 4px; }
  .btn {
    display: inline-flex; align-items: center; height: 36px; padding: 0 14px; border-radius: 8px;
    border: 1px solid var(--border); background: var(--btn); color: var(--fg);
    font-size: 13px; font-weight: 500; text-decoration: none;
  }
  .btn:hover { border-color: var(--subtle); }
  .brand { margin-top: 18px; font-size: 12px; color: var(--subtle); }
</style>
</head>
<body>
  <main class="card">
    <div class="tile" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg></div>
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(body)}</p>
    ${back ? `<div class="back">${escapeHtml(back)}</div>` : ""}
    <div class="links">${links}</div>
    <div class="brand">Interviewpad</div>
  </main>
</body>
</html>`;
}
