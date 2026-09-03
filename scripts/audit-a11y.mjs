/**
 * Accessibility audit for small type — size and contrast.
 *
 * Two defects this catches, both of which shipped unnoticed because they only
 * appear in one theme or at one viewport width:
 *
 *   SIZE     Every `text-[Npx]` in the app is rem-ified by postcss-pxtorem and
 *            rides the fluid `--base-font-size` clamp. The clamp bottoms out at
 *            16.5px for any viewport ≤ ~1167px, so a `text-[8px]` class renders
 *            at 8.25px on a normal laptop. We audit at the floor width, which is
 *            the strictest case, as well as at a typical desktop width.
 *
 *   CONTRAST Saturated 500-level Tailwind colours are legible on a near-black
 *            ground and collapse on a light one. Auditing only in dark theme
 *            reports zero problems on pages that have dozens in light.
 *
 * Both axes therefore have to be swept per theme AND per width, which is what
 * this script does. Text is only checked below CHECK_BELOW_PX; larger type has a
 * lower WCAG bar (3:1) and is not what has been going wrong here.
 *
 * Usage:  npm run audit:a11y                  (needs `npm run dev` running)
 *         npm run audit:a11y -- --json        machine-readable
 *         npm run audit:a11y -- /pricing /blog   audit specific routes only
 *
 * Auth-gated routes (/prep, /w) redirect to /login when signed out; the report
 * marks that with a `→/login` arrow rather than pretending it audited the page.
 * To cover them, save a signed-in session once and point the script at it:
 *
 *   npx playwright open --save-storage=.auth.json http://localhost:3000/login
 *   AUDIT_STORAGE_STATE=.auth.json npm run audit:a11y
 */

import { chromium } from "@playwright/test";

const BASE = process.env.AUDIT_BASE_URL ?? "http://localhost:3000";
/** Playwright storageState JSON with a signed-in session; see header. */
const STORAGE_STATE = process.env.AUDIT_STORAGE_STATE || undefined;

/** Every route reachable from the navbar, plus the two marketing pages. */
const ROUTES = [
  "/",
  "/hire",
  "/interview-questions",
  "/pricing",
  "/creators",
  "/blog",
  "/candidate/challenges",
  "/candidate/playgrounds",
  "/candidate/ai-code-review",
  "/candidate/prompt-practice",
  "/login",
  // Gated — audited only with AUDIT_STORAGE_STATE set, otherwise reported as a
  // redirect so the gap in coverage is visible rather than silent.
  "/prep",
  "/w",
];

const THEMES = ["dark", "light"];

/**
 * 820 is below the root clamp's ~1167px knee, so type renders at the 16.5px
 * floor — the smallest it ever gets. 1440 is a typical desktop.
 */
const WIDTHS = [820, 1440];

/** Below this, WCAG AA wants 4.5:1. Above it the bar drops, so don't flag it. */
const CHECK_BELOW_PX = 12;
const MIN_CONTRAST = 4.5;
/** Anything under this is hard to read regardless of contrast. */
const MIN_FONT_PX = 11;

/** Runs in the page. Walks text nodes and measures what actually rendered. */
function probe({ checkBelowPx, minContrast, minFontPx }) {
  const lum = (c) => {
    const [r, g, b] = c.map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const parse = (s) => {
    const m = s.match(/[\d.]+/g);
    return m ? m.slice(0, 3).map(Number) : null;
  };
  // Walk up for the first background that actually paints. A translucent layer
  // is skipped rather than composited — good enough to catch real failures
  // without reimplementing the compositor.
  const bgOf = (el) => {
    let e = el;
    while (e && e !== document.documentElement) {
      const c = getComputedStyle(e).backgroundColor;
      const p = parse(c);
      if (p) {
        const a = c.match(/[\d.]+/g);
        if (!a[3] || parseFloat(a[3]) > 0.5) return p;
      }
      e = e.parentElement;
    }
    const rootBg = parse(getComputedStyle(document.documentElement).backgroundColor);
    return rootBg ?? [255, 255, 255];
  };
  const contrast = (a, b) => {
    const x = lum(a);
    const y = lum(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  };

  const tooSmall = new Map();
  const lowContrast = new Map();
  let smallest = Infinity;

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    const text = (node.textContent || "").trim();
    if (text.length < 2) continue;
    const el = node.parentElement;
    if (!el) continue;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") continue;
    const rect = el.getBoundingClientRect();
    if (!rect.width && !rect.height) continue;

    const px = parseFloat(cs.fontSize);
    if (px < smallest) smallest = px;

    if (px < minFontPx) {
      const key = px.toFixed(2);
      if (!tooSmall.has(key)) tooSmall.set(key, { px: +px.toFixed(2), count: 0, samples: [] });
      const e = tooSmall.get(key);
      e.count++;
      if (e.samples.length < 3) e.samples.push(text.slice(0, 40));
    }

    if (px < checkBelowPx) {
      const fg = parse(cs.color);
      if (!fg) continue;
      const ratio = contrast(fg, bgOf(el));
      if (ratio < minContrast) {
        const key = `${cs.color}|${px.toFixed(1)}`;
        if (!lowContrast.has(key)) {
          lowContrast.set(key, {
            ratio: +ratio.toFixed(2),
            color: cs.color,
            px: +px.toFixed(2),
            count: 0,
            samples: [],
          });
        }
        const e = lowContrast.get(key);
        e.count++;
        if (e.samples.length < 3) e.samples.push(text.slice(0, 40));
      }
    }
  }

  // Horizontal overflow — bumping font sizes can burst fixed-width containers,
  // so this guards the size fixes. Scrollers and truncation are intentional.
  let overflow = 0;
  document.querySelectorAll("*").forEach((el) => {
    const cs = getComputedStyle(el);
    if (cs.display === "none") return;
    if (/auto|scroll/.test(cs.overflowX)) return;
    const cls = typeof el.className === "string" ? el.className : "";
    if (/truncate|marquee/.test(cls)) return;
    if (el.clientWidth > 0 && el.scrollWidth - el.clientWidth > 2) overflow++;
  });

  const d = document.documentElement;
  return {
    path: location.pathname,
    theme: d.classList.contains("dark") ? "dark" : "light",
    rootFontPx: +parseFloat(getComputedStyle(d).fontSize).toFixed(2),
    smallestPx: Number.isFinite(smallest) ? +smallest.toFixed(2) : null,
    tooSmall: [...tooSmall.values()].sort((a, b) => a.px - b.px),
    tooSmallNodes: [...tooSmall.values()].reduce((s, e) => s + e.count, 0),
    lowContrast: [...lowContrast.values()].sort((a, b) => a.ratio - b.ratio),
    lowContrastNodes: [...lowContrast.values()].reduce((s, e) => s + e.count, 0),
    pageHScroll: d.scrollWidth - d.clientWidth,
    overflowElements: overflow,
  };
}

/** Scroll the page so lazy/reveal-on-scroll sections mount before measuring. */
async function settle(page) {
  await page.waitForTimeout(1200);
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 700) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(600);
}

async function main() {
  const args = process.argv.slice(2);
  const asJson = args.includes("--json");
  const routeArgs = args.filter((a) => a.startsWith("/"));
  const routes = routeArgs.length ? routeArgs : ROUTES;

  const browser = await chromium.launch();
  const results = [];

  try {
    for (const theme of THEMES) {
      const context = await browser.newContext(
        STORAGE_STATE ? { storageState: STORAGE_STATE } : {}
      );
      // next-themes reads this before first paint, so the page renders in the
      // right theme rather than flipping after load.
      await context.addInitScript((t) => {
        try {
          window.localStorage.setItem("theme", t);
        } catch {}
      }, theme);

      const page = await context.newPage();
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 900 });
        for (const route of routes) {
          const url = `${BASE}${route}`;
          try {
            await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
          } catch (err) {
            results.push({ route, theme, width, error: `navigation failed: ${err.message}` });
            continue;
          }
          await settle(page);
          const r = await page.evaluate(probe, {
            checkBelowPx: CHECK_BELOW_PX,
            minContrast: MIN_CONTRAST,
            minFontPx: MIN_FONT_PX,
          });
          // A route that redirected (auth gate) is reported, not silently
          // audited as if it were the page we asked for.
          results.push({ route, width, ...r, redirected: r.path !== route ? r.path : null });
        }
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }

  if (asJson) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    report(results);
  }

  const failed = results.some(
    (r) => r.error || r.tooSmallNodes > 0 || r.lowContrastNodes > 0
  );
  process.exitCode = failed ? 1 : 0;
}

function report(results) {
  const pad = (s, n) => String(s).padEnd(n);
  console.log(
    `\nA11y audit — text below ${MIN_FONT_PX}px, and contrast below ${MIN_CONTRAST}:1 for text under ${CHECK_BELOW_PX}px\n`
  );
  console.log(
    pad("ROUTE", 32) + pad("THEME", 7) + pad("W", 6) + pad("MIN px", 8) + pad("<11px", 7) + pad("<4.5:1", 8) + "OVF"
  );
  console.log("-".repeat(76));

  for (const r of results) {
    if (r.error) {
      console.log(pad(r.route, 32) + pad(r.theme, 7) + pad(r.width, 6) + r.error);
      continue;
    }
    const flag = (n) => (n > 0 ? `${n} !` : "0");
    console.log(
      pad(r.route + (r.redirected ? ` →${r.redirected}` : ""), 32) +
        pad(r.theme, 7) +
        pad(r.width, 6) +
        pad(r.smallestPx ?? "-", 8) +
        pad(flag(r.tooSmallNodes), 7) +
        pad(flag(r.lowContrastNodes), 8) +
        (r.overflowElements || 0)
    );
  }

  const worst = results
    .flatMap((r) => (r.lowContrast ?? []).map((c) => ({ ...c, route: r.route, theme: r.theme })))
    .sort((a, b) => a.ratio - b.ratio)
    .slice(0, 12);

  if (worst.length) {
    console.log("\nWorst contrast:\n");
    for (const w of worst) {
      console.log(
        `  ${pad(w.ratio + ":1", 9)}${pad(w.px + "px", 9)}${pad(w.color, 22)}${pad(w.theme, 7)}${pad(w.route, 26)}${w.samples[0] ?? ""}`
      );
    }
  }

  const smalls = results
    .flatMap((r) => (r.tooSmall ?? []).map((c) => ({ ...c, route: r.route, theme: r.theme, width: r.width })))
    .sort((a, b) => a.px - b.px)
    .slice(0, 12);

  if (smalls.length) {
    console.log("\nSmallest type:\n");
    for (const s of smalls) {
      console.log(
        `  ${pad(s.px + "px", 9)}${pad("x" + s.count, 6)}${pad(s.theme, 7)}${pad(s.width, 6)}${pad(s.route, 26)}${s.samples[0] ?? ""}`
      );
    }
  }
  console.log("");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
