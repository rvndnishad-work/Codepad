import { prisma } from "@/lib/prisma";
import {
  type MaintenanceConfig,
  DEFAULT_MAINTENANCE,
} from "@/lib/settings-constants";

export const MAINTENANCE_KEY = "maintenance_mode";

// The proxy calls this on (potentially) every request, so we memoize the flag
// at module scope with a short TTL. A DB hit at most once per TTL per warm
// instance; toggling from the admin panel takes effect within `TTL_MS`.
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
    // Fail OPEN: a DB hiccup must never take the public site down. Serve the
    // last known value if we have one, otherwise assume "not in maintenance".
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

/**
 * Fully self-contained 503 page. Intentionally has zero dependency on the app
 * render pipeline (inline CSS, no JS, no fonts) — the whole point of
 * maintenance mode is that the app may be down, so this must stand alone.
 */
export function maintenanceHtml(message?: string): string {
  const note = message?.trim()
    ? `<p class="note">${escapeHtml(message.trim())}</p>`
    : "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>We'll be right back — Interviewpad</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  html, body { height: 100%; margin: 0; }
  body {
    background: #0a0c12;
    color: #e5e7eb;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    display: flex; align-items: center; justify-content: center;
    padding: 24px; text-align: center;
  }
  .wrap { max-width: 540px; width: 100%; }
  .glow {
    position: fixed; top: 50%; left: 50%; width: 600px; height: 600px;
    transform: translate(-50%, -50%); border-radius: 50%;
    background: rgba(250, 204, 21, 0.06); filter: blur(120px); z-index: 0;
  }
  .content { position: relative; z-index: 1; }
  .logo {
    font-weight: 800; font-size: 20px; letter-spacing: -0.02em;
    margin-bottom: 40px;
  }
  .logo .pad { color: #facc15; }
  .badge {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 10px; font-weight: 800; letter-spacing: 0.2em; text-transform: uppercase;
    color: #facc15; background: rgba(250, 204, 21, 0.1);
    border: 1px solid rgba(250, 204, 21, 0.2);
    padding: 6px 14px; border-radius: 999px; margin-bottom: 24px;
  }
  h1 { font-size: 34px; line-height: 1.15; font-weight: 800; letter-spacing: -0.02em; margin: 0 0 16px; }
  h1 .accent { color: #facc15; font-style: italic; }
  p { color: #9ca3af; font-size: 15px; line-height: 1.6; margin: 0 auto; max-width: 420px; }
  .note {
    margin-top: 20px; padding: 14px 16px; border-radius: 12px;
    background: rgba(255,255,255,0.03); border: 1px solid #23262f;
    color: #cbd5e1; font-size: 14px;
  }
  a.btn {
    display: inline-block; margin-top: 36px; text-decoration: none;
    background: #e5e7eb; color: #0a0c12; font-weight: 700; font-size: 14px;
    padding: 12px 22px; border-radius: 12px;
  }
  .foot { margin-top: 56px; font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(156,163,175,0.4); font-family: ui-monospace, monospace; }
</style>
</head>
<body>
  <div class="glow"></div>
  <div class="wrap content">
    <div class="logo">interview<span class="pad">pad</span></div>
    <div class="badge">⚙ Scheduled Maintenance</div>
    <h1>We&rsquo;ll be <span class="accent">right back</span>.</h1>
    <p>Interviewpad is briefly offline for maintenance. Thanks for your patience — please check back shortly.</p>
    ${note}
    <a class="btn" href="/">Try again</a>
    <div class="foot">Interviewpad Pro · Est 2026</div>
  </div>
</body>
</html>`;
}
