/**
 * Next.js ULTRA — batch 08: next/script, code splitting and next/dynamic, CSS, public vs imported assets, bundle size, environment
 * variables, serverExternalPackages, Turbopack vs Webpack.
 * Generated from markdown sources by a build script; Verified blocks are real output from a Next.js 16.3.4 lab (next build / next
 * start / next dev, with and without --webpack, and real browser sessions for script order, lazy chunks and env hydration).
 */
import type { NextAugment } from "./nextjs-augments.types";

const augments: NextAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is next/script and what are its strategy options in Next.js?",
    seoDescription: "next/script loads third-party scripts with a strategy: beforeInteractive, afterInteractive, lazyOnload or worker. Real run order from a 16.3.4 lab.",
    description: `**Question presented to candidate:**
"We need Google Tag Manager, a chat widget and a consent script on the site. How do you add third-party scripts in Next.js without hurting performance, and which strategy would each get?"

**What a strong answer should cover:**
- The \`Script\` component from next/script loads external or inline scripts once per document, deduplicated, with a loading \`strategy\`.
- \`beforeInteractive\`: before any Next.js code and before hydration; only allowed in the root layout; for scripts that must run first (consent, bot checks).
- \`afterInteractive\` (default): after some hydration; for analytics and tag managers.
- \`lazyOnload\`: during browser idle time after all resources load; for chat widgets and social embeds.
- \`worker\` (experimental) moves a script into a web worker with Partytown; \`onLoad\`, \`onReady\` and \`onError\` callbacks need a Client Component.

**Clarifying questions expected:**
- "Does this script need to run before the page becomes interactive?" — only then beforeInteractive.
- "Is it needed on every page or just some?" — place the Script in the layout or page accordingly.

**Code / implementation expected:** Yes — one script per strategy.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic React and App Router familiarity.
**Difficulty:** Medium

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.3.4 docs shipped with the package and, in the **Verified** section, against real output from a build or a running server.

## 1. Why This Even Matters — A Story First

Think of guests arriving at a party. The security guard (a consent or bot-check script) must be at the door before anyone comes in. The DJ (analytics) can start once the first guests are inside. The photographer (a chat widget) can arrive when the party is already going. next/script lets you schedule each of them instead of letting everyone crowd through the door at once.

## 2. The Core Idea

📌 **Interview term: next/script** — the Next.js Script component that loads a script with a chosen strategy and loads it only once per document.

📌 **Interview term: Loading strategy** — when a script is fetched and run relative to hydration and page load: beforeInteractive, afterInteractive, lazyOnload or worker.

📌 **Interview term: Partytown** — a library that runs third-party scripts in a web worker, used by the experimental worker strategy.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 336" role="img" aria-label="When each strategy ran in the lab (DOMContentLoaded 48 ms, load 77 ms). beforeInteractive, afterInteractive, lazyOnload, worker">
  <defs>
    <marker id="nx01hnza-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">When each strategy ran in the lab (DOMContentLoaded 48 ms, load 77 ms)</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.45s" fill="freeze"/>
    <rect class="d-box-accent" x="24" y="46" width="612" height="44" rx="10"/>
    <circle class="d-box-accent" cx="46" cy="68" r="12"/>
    <text class="d-text d-accent" x="46" y="73" text-anchor="middle">1</text>
    <text class="d-text d-accent" x="70" y="73">beforeInteractive</text>
    <text class="d-sub" x="262" y="72">ran at 49 ms, readyState interactive, root layout only</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.45s" fill="freeze"/>
    <rect class="d-box" x="24" y="102" width="612" height="44" rx="10"/>
    <circle class="d-box-accent" cx="46" cy="124" r="12"/>
    <text class="d-text d-accent" x="46" y="129" text-anchor="middle">2</text>
    <text class="d-text" x="70" y="129">afterInteractive</text>
    <text class="d-sub" x="262" y="128">ran at 82 ms, after hydration started (default)</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.45s" fill="freeze"/>
    <rect class="d-box" x="24" y="158" width="612" height="44" rx="10"/>
    <circle class="d-box-accent" cx="46" cy="180" r="12"/>
    <text class="d-text d-accent" x="46" y="185" text-anchor="middle">3</text>
    <text class="d-text" x="70" y="185">lazyOnload</text>
    <text class="d-sub" x="262" y="184">ran at 1052 ms, during browser idle time</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.45s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="214" width="612" height="44" rx="10"/>
    <circle class="d-box-accent" cx="46" cy="236" r="12"/>
    <text class="d-text d-accent" x="46" y="241" text-anchor="middle">4</text>
    <text class="d-text" x="70" y="241">worker</text>
    <text class="d-sub" x="262" y="240">experimental: runs in a web worker via Partytown</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.7s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="274" width="612" height="44" rx="10"/>
    <text class="d-sub" x="330" y="301" text-anchor="middle">preload links were added for the first two; lazyOnload is not preloaded at all</text>
  </g>
</svg>

The strategy is a statement about priority. Everything that does not need to run early should not compete with your own JavaScript for the main thread.

## 3. Choosing a strategy

| Script | Strategy | Why |
| :--- | :--- | :--- |
| Cookie consent, bot protection | \`beforeInteractive\` (root layout) | Must run before anything else |
| Google Tag Manager, analytics | \`afterInteractive\` | Needed early, but not before the page works |
| Chat widget, social embeds | \`lazyOnload\` | Can wait until the page has loaded |
| Heavy third-party code | \`worker\` (experimental) | Off the main thread |

## 4. Callbacks and inline scripts

\`onLoad\` runs after the script loads, \`onReady\` after load and on every remount, \`onError\` on failure; they are functions, so the Script must be in a Client Component. Inline scripts need an \`id\` so Next.js can track them. Scripts run once per document: client-side navigation does not run them again. For your own heavy code, prefer code splitting: [next/dynamic](/interview-question/how-does-code-splitting-and-next-dynamic-work-in-next-js).

## 5. Verified — Run Order in a Real Browser (Next.js 16.3.4, next start)

Each script records its name, the time and \`document.readyState\` when it runs:

\`\`\`
root layout: <Script src="/s-before.js" strategy="beforeInteractive" />
page:        <Script src="/s-after.js" strategy="afterInteractive" />  and  <Script src="/s-lazy.js" strategy="lazyOnload" />
each script pushes its name, the time and document.readyState when it runs

server HTML:
  <head>: <link rel="preload" href="/s-after.js" as="script"/><link rel="preload" href="/s-before.js" as="script"/>
  body:   <script>(self.__next_s=self.__next_s||[]).push(["/s-before.js",{}])</script>   (queued for Next.js to inject early)
  s-lazy.js: no preload link, only a description in the RSC payload

real browser, next start (domContentLoaded at 48 ms, load at 77 ms):
  before@49ms   readyState=interactive
  after@82ms    readyState=complete
  lazy@1052ms   readyState=complete
\`\`\`

## 6. Common Pitfalls

- **beforeInteractive outside the root layout.** It is only allowed there; elsewhere Next.js warns and it will not behave as intended.
- **Everything as beforeInteractive.** It delays interactivity for all users; very few scripts need it.
- **Callbacks in a Server Component.** \`onLoad\` is a function prop, so the Script must be in a Client Component.
- **Expecting scripts to re-run on navigation.** They run once per document; use \`onReady\` for per-mount setup.
- **Plain script tags for third parties.** You lose deduplication and scheduling; use next/script.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">next/script loads third-party scripts once per document with a strategy that controls when they run.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">beforeInteractive runs before hydration and only in the root layout; afterInteractive (the default) runs early after hydration; lazyOnload waits for idle time.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;">In the lab they ran at 49 ms, 82 ms and 1052 ms, with preload links for the first two only.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;">worker (experimental) moves scripts into a web worker via Partytown.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">Callbacks like onLoad need a Client Component, and scripts do not re-run on client navigation.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is afterInteractive the default?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Most third-party scripts, like analytics, should load early but must not block your page from becoming interactive.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you add Google Analytics?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Either with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@next/third-parties</code> (GoogleAnalytics, GoogleTagManager components), or a Script with afterInteractive plus an inline config script with an id.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you run code when a script has loaded?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onLoad</code> (once) or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onReady</code> (after load and on every mount) in a Client Component.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does lazyOnload affect LCP?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is designed not to: it waits until the page load event and browser idle time, so it does not compete with the main content.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Script** | next/script component for third-party scripts |
| **beforeInteractive** | Runs before hydration, root layout only |
| **afterInteractive** | Default, runs early after hydration |
| **lazyOnload** | Runs during idle time after load |

---
**Conclusion:** next/script turns third-party scripts from a performance risk into a scheduling decision. The lab showed the three main strategies running in the expected order, from before hydration to idle time, with preloading only where it helps. Use beforeInteractive rarely, afterInteractive for analytics, and lazyOnload for everything that can wait.`,
    examples: [
      {
        label: "One script per strategy",
        tech: "tsx",
        runnable: false,
        code: `// app/layout.tsx
import Script from "next/script";
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Script src="https://consent.example.com/cmp.js" strategy="beforeInteractive" />
        <Script src="https://www.googletagmanager.com/gtm.js?id=GTM-XXXX" strategy="afterInteractive" />
      </body>
    </html>
  );
}

// components/Chat.tsx
"use client";
import Script from "next/script";
export function Chat() {
  return <Script src="https://chat.example.com/widget.js" strategy="lazyOnload" onLoad={() => console.log("chat ready")} />;
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How does code splitting and next/dynamic work in Next.js?",
    seoDescription: "Next.js splits code per route automatically; next/dynamic loads a component chunk only when it renders. In the lab the chunk was requested only on click.",
    description: `**Question presented to candidate:**
"Our dashboard page includes a heavy chart editor that most users never open. How does Next.js split code, and how would you keep the editor out of the initial bundle?"

**What a strong answer should cover:**
- Next.js splits JavaScript per route automatically, and Server Components add no client JavaScript at all.
- \`next/dynamic\` (built on \`React.lazy\` and Suspense) loads a Client Component in its own chunk when it is first rendered.
- Options: \`loading\` for a placeholder, \`ssr: false\` to skip server rendering for browser-only components.
- \`ssr: false\` is only allowed in Client Components; in a Server Component the build fails.
- You can also \`await import()\` a library inside an event handler to load it on demand.

**Clarifying questions expected:**
- "Is the component needed for the first view?" — if not, lazy load it.
- "Does it use browser-only APIs?" — then \`ssr: false\`.

**Code / implementation expected:** Yes — a toggle that lazy loads a heavy component.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic React and App Router familiarity.
**Difficulty:** Medium

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.3.4 docs shipped with the package and, in the **Verified** section, against real output from a build or a running server.

## 1. Why This Even Matters — A Story First

A travel agent does not hand you every brochure in the shop when you walk in. They give you the ones for your trip and fetch the scuba diving brochure only if you ask. Next.js already splits brochures by destination (routes); next/dynamic lets you keep individual heavy brochures in the back room until someone asks.

## 2. The Core Idea

📌 **Interview term: Code splitting** — dividing JavaScript into chunks that load separately, so a page downloads only the code it needs.

📌 **Interview term: next/dynamic** — a Next.js helper around React.lazy and Suspense that loads a component chunk when it first renders.

📌 **Interview term: ssr: false** — a next/dynamic option that skips server rendering of the component; allowed only in Client Components.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 250" role="img" aria-label="The heavy component in the lab. page load, click, chunk">
  <defs>
    <marker id="nx02x78d-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">The heavy component in the lab</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box" x="24" y="48" width="174.66666666666666" height="118" rx="10"/>
    <circle class="d-box-accent" cx="40" cy="48" r="12"/>
    <text class="d-text d-accent" x="40" y="53" text-anchor="middle">1</text>
    <text class="d-text" x="111.33333333333333" y="82" text-anchor="middle">page load</text>
    <text class="d-sub" x="111.33333333333333" y="108" text-anchor="middle">9 scripts, none with Heavy</text>
    <text class="d-sub" x="111.33333333333333" y="130" text-anchor="middle">server HTML without it</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 201.66666666666666 107 L 239.66666666666666 107" marker-end="url(#nx02x78d-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 201.66666666666666 107 L 239.66666666666666 107"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.5s" fill="freeze"/>
    <rect class="d-box" x="242.66666666666666" y="48" width="174.66666666666666" height="118" rx="10"/>
    <circle class="d-box-accent" cx="258.66666666666663" cy="48" r="12"/>
    <text class="d-text d-accent" x="258.66666666666663" y="53" text-anchor="middle">2</text>
    <text class="d-text" x="330" y="82" text-anchor="middle">click</text>
    <text class="d-sub" x="330" y="108" text-anchor="middle">loading placeholder</text>
    <text class="d-sub" x="330" y="130" text-anchor="middle">shown after 150 ms</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 420.3333333333333 107 L 458.3333333333333 107" marker-end="url(#nx02x78d-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 420.3333333333333 107 L 458.3333333333333 107"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.7s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="461.3333333333333" y="48" width="174.66666666666666" height="118" rx="10"/>
    <circle class="d-box-accent" cx="477.3333333333333" cy="48" r="12"/>
    <text class="d-text d-accent" x="477.3333333333333" y="53" text-anchor="middle">3</text>
    <text class="d-text d-accent" x="548.6666666666666" y="82" text-anchor="middle">chunk</text>
    <text class="d-sub" x="548.6666666666666" y="108" text-anchor="middle">one new script requested</text>
    <text class="d-sub" x="548.6666666666666" y="130" text-anchor="middle">Heavy renders</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="2.1s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="188" width="612" height="44" rx="10"/>
    <text class="d-sub" x="330" y="215" text-anchor="middle">the same ssr false call in a Server Component failed the build with a clear error</text>
  </g>
</svg>

The initial bundle only grows with what the first view needs. Everything behind an interaction can wait for that interaction.

## 3. Techniques

| Technique | Use |
| :--- | :--- |
| Keep components as Server Components | They ship no client JavaScript |
| \`dynamic(() => import("./Editor"))\` | A Client Component loaded when first rendered |
| \`dynamic(..., { ssr: false })\` in a Client Component | Browser-only components (maps, editors using window) |
| \`dynamic(..., { loading: () => <Spinner /> })\` | Placeholder while the chunk loads |
| \`const lib = await import("heavy-lib")\` in a handler | Load a library only when an action happens |

## 4. Measuring

Next.js 16 no longer prints size and First Load JS in \`next build\`; use the Turbopack bundle analyzer (\`next experimental-analyze\`), Lighthouse, or the network panel to see what loads. See [bundle size](/interview-question/how-do-you-analyze-and-reduce-bundle-size-in-next-js).

## 5. Verified — When the Chunk Loads (Next.js 16.3.4, real browser)

\`\`\`
/dyn-import: a client component loads Heavy with dynamic(() => import("./Heavy"), { ssr: false, loading })
real browser, next start:
  scripts loaded with the page: 9, of which contain Heavy code: 0   (server HTML contains it: no)
  before click:          "show heavy"
  150 ms after click:    "loading heavy..."
  after load:            "heavy loaded, 3000 rows"
  requested on click:    /_next/static/chunks/03jxx_uaa9w_x.js  (356 bytes, the only new script)

the same dynamic(..., { ssr: false }) call placed in a Server Component page, next build:
  Error: \`ssr: false\` is not allowed with \`next/dynamic\` in Server Components. Please move it into a Client Component.
\`\`\`

The lab component builds its data at runtime, so its chunk is tiny; the point is that it was requested only when rendered, not how large it is.

## 6. Common Pitfalls

- **ssr: false in a Server Component.** The build fails; wrap the dynamic call in a Client Component.
- **Lazy loading the main content.** It delays what users came for and hurts LCP; lazy load only secondary UI.
- **Making everything a Client Component.** It adds JavaScript that Server Components would not.
- **Dynamic import inside render with a new function each time.** Define \`dynamic(...)\` at module level, not inside the component.
- **No loading state.** Users see nothing while the chunk downloads; add \`loading\`.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Next.js splits code per route automatically, and Server Components ship no client JavaScript.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">next/dynamic loads a Client Component in its own chunk when it first renders, with an optional loading placeholder.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;">In the lab the heavy component was in none of the 9 initial scripts and its chunk was requested only on click.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ssr: false</code> skips server rendering for browser-only code, but only in Client Components: the build rejected it in a Server Component.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">Next.js 16 removed bundle size metrics from next build; use the analyzer or Lighthouse to measure.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between next/dynamic and React.lazy?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">next/dynamic wraps React.lazy and Suspense and adds the loading option and ssr: false; in the App Router they behave the same for Client Components.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does dynamic() split a Server Component?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Server Components are not sent to the client anyway; dynamic mainly matters for Client Components. Their client chunks are still split when imported by a dynamic Server Component.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When should you use ssr: false?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For components that cannot render on the server, such as those using window during render, or when server rendering them is pointless (a map widget).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you preload a lazy component?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Call the import early (for example on hover) so the chunk is already cached when the component renders.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Code splitting** | Loading JavaScript in separate chunks |
| **next/dynamic** | Lazy loads a component chunk |
| **ssr: false** | Skip server rendering, Client Components only |
| **Chunk** | One JavaScript file of the bundle |

---
**Conclusion:** Next.js splits by route on its own, and next/dynamic lets you split further inside a page. The lab showed the heavy component staying out of the initial scripts and loading only when clicked, and the build refusing ssr: false in a Server Component. Keep first-view code small and load the rest on demand.`,
    examples: [
      {
        label: "Lazy loading a browser-only editor from a Client Component",
        tech: "tsx",
        runnable: false,
        code: `// components/EditorToggle.tsx
"use client";
import { useState } from "react";
import dynamic from "next/dynamic";

const ChartEditor = dynamic(() => import("./ChartEditor"), {
  ssr: false,                                 // uses window; skip server rendering
  loading: () => <p>Loading editor...</p>,
});

export function EditorToggle() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(true)}>Edit chart</button>
      {open && <ChartEditor />}
    </div>
  );
}

// loading a library only in a handler
async function exportCsv(rows: string[][]) {
  const { unparse } = await import("papaparse");
  return unparse(rows);
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How does Next.js handle CSS (CSS Modules, global, Tailwind, CSS-in-JS)?",
    seoDescription: "CSS Modules scope class names, global CSS applies app-wide, Tailwind builds via PostCSS, CSS-in-JS needs Client Components. Output from Next 16.3.4.",
    description: `**Question presented to candidate:**
"What styling options does the App Router support, how are they bundled, and what are the trade-offs for Server Components?"

**What a strong answer should cover:**
- CSS Modules (\`*.module.css\`) generate unique class names per file, so styles do not leak.
- Global CSS can be imported from layouts, pages and components in the App Router; it applies to the whole app.
- Tailwind CSS works through PostCSS and generates utility classes at build time, with no runtime cost.
- Runtime CSS-in-JS libraries (styled-components, Emotion) need a style registry and Client Components; they do not work inside Server Components.
- CSS is extracted into static CSS files with long-lived cache headers and loaded with the route.

**Clarifying questions expected:**
- "Does the team use a component library with CSS-in-JS?" — it constrains Server Components.
- "Is there a design system already?" — Tailwind or CSS Modules fit Server Components best.

**Code / implementation expected:** Yes — a CSS Module and a global stylesheet.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic React and App Router familiarity.
**Difficulty:** Medium

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.3.4 docs shipped with the package and, in the **Verified** section, against real output from a build or a running server.

## 1. Why This Even Matters — A Story First

Styles are like paint in a shared house. Global CSS is paint for the hallway everyone uses. CSS Modules are paint with your room number printed on each tin, so you cannot accidentally paint the neighbour room. Tailwind is a box of pre-mixed colours you apply by name. Runtime CSS-in-JS mixes the paint on the spot in each room, which needs someone standing there (the browser), so it does not fit rooms that are built in the factory (Server Components).

## 2. The Core Idea

📌 **Interview term: CSS Modules** — CSS files named *.module.css whose class names are rewritten to unique names, scoping them to the importing component.

📌 **Interview term: Global CSS** — stylesheets whose rules apply everywhere; imported from any layout, page or component in the App Router.

📌 **Interview term: CSS-in-JS** — libraries that generate styles from JavaScript at runtime; they need a style registry and Client Components in the App Router.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 268" role="img" aria-label="Styling options and Server Components. build-time CSS, runtime CSS-in-JS">
  <defs>
    <marker id="nx03dh54-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Styling options and Server Components</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="24" y="48" width="280" height="136" rx="10"/>
    <text class="d-text d-accent" x="164" y="78" text-anchor="middle">build-time CSS</text>
    <text class="d-sub" x="164" y="106" text-anchor="middle">CSS Modules, global CSS, Tailwind</text>
    <text class="d-sub" x="164" y="128" text-anchor="middle">extracted to static CSS files</text>
    <text class="d-sub" x="164" y="150" text-anchor="middle">works in Server Components</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 307 116 L 353 116" marker-end="url(#nx03dh54-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 307 116 L 353 116"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-muted" x="356" y="48" width="280" height="136" rx="10"/>
    <text class="d-text" x="496" y="78" text-anchor="middle">runtime CSS-in-JS</text>
    <text class="d-sub" x="496" y="106" text-anchor="middle">styled-components, Emotion</text>
    <text class="d-sub" x="496" y="128" text-anchor="middle">needs a style registry</text>
    <text class="d-sub" x="496" y="150" text-anchor="middle">Client Components only</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="206" width="612" height="44" rx="10"/>
    <text class="d-sub" x="330" y="233" text-anchor="middle">lab: the module class became page-module__01pZFW__title in an immutable, cached CSS file</text>
  </g>
</svg>

The deciding factor is not syntax but when styles are generated. Build-time styles fit Server Components; runtime styles need a browser component.

## 3. Options

| Approach | Scope | Works in Server Components | Notes |
| :--- | :--- | :--- | :--- |
| CSS Modules | Per file | Yes | Class names hashed per module |
| Global CSS | App-wide | Yes | Import from any layout, page or component |
| Tailwind CSS | Utility classes | Yes | PostCSS plugin, no runtime |
| Sass | Like CSS Modules or global | Yes | Install \`sass\` |
| styled-jsx, styled-components, Emotion | Component | No, Client Components | Need a registry for SSR |

## 4. Ordering and bundling

CSS is bundled per route and loaded with it, with cache headers for a year because file names are content-hashed. Import order decides precedence when two rules conflict, so import global resets early (in the root layout). For assets used from CSS, see [public folder vs imported assets](/interview-question/what-is-the-difference-between-the-public-folder-and-imported-assets-in-next-js).

## 5. Verified — What the Build Produced (Next.js 16.3.4, next start)

A page importing a CSS Module and a global stylesheet:

\`\`\`
GET /css-demo (imports page.module.css and demo-global.css)
stylesheet links: /_next/static/chunks/2vdo6a-meq67b.css
h1 class (from CSS Modules): page-module__01pZFW__title
/_next/static/chunks/2vdo6a-meq67b.css: cache-control public, max-age=31536000, immutable
  .page-module__01pZFW__title{color:#639} .demo-global-marker{outline:1px solid teal}
\`\`\`

Both files were combined into one hashed stylesheet for the route, the module class was renamed, and \`rebeccapurple\` was minified to \`#639\`.

## 6. Common Pitfalls

- **Runtime CSS-in-JS in Server Components.** It fails or renders unstyled; keep those components client-side or move to build-time CSS.
- **Global styles for component-specific rules.** They leak across pages; use CSS Modules.
- **Relying on import order across routes.** Conflicting global rules can apply differently per route; keep globals minimal and imported from the root layout.
- **Dynamic class names built from strings in Tailwind.** Tailwind generates only the classes it can see in source; \`"text-" + color\` is not found.
- **Forgetting the style registry.** Without it, CSS-in-JS styles are missing from the server HTML and flash in later.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">CSS Modules scope class names per file; global CSS applies everywhere and can be imported from any layout, page or component.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">Tailwind generates utilities at build time through PostCSS, so it fits Server Components.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;">Runtime CSS-in-JS needs a style registry and Client Components.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;">All build-time CSS is extracted into hashed files: in the lab one stylesheet with a year-long immutable cache.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">Keep globals minimal and in the root layout, and prefer build-time CSS for Server Components.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why do CSS-in-JS libraries not work in Server Components?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">They create styles at runtime with React context or hooks, which Server Components do not support; the registry collects them during server rendering of Client Components.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you use a CSS variable from next/font?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">variable</code> in the font loader, add its class to html, and use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">var(--font-name)</code> in CSS Modules or the Tailwind config.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you use Sass?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, install <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sass</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.module.scss</code> files work like CSS Modules and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.scss</code> like global CSS.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How are CSS files cached?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">They get content-hashed names and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">public, max-age=31536000, immutable</code> in production, as the lab showed, so a change produces a new file name.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **CSS Modules** | Scoped class names per file |
| **Global CSS** | App-wide styles |
| **Tailwind CSS** | Build-time utility classes |
| **Style registry** | Collects CSS-in-JS styles during SSR |

---
**Conclusion:** Next.js supports every common styling approach, but the App Router favours build-time CSS: CSS Modules, global CSS and Tailwind work in Server Components and ship as cached static files. Runtime CSS-in-JS still works, inside Client Components with a registry. The lab output showed the renamed module class and a single immutable stylesheet for the route.`,
    examples: [
      {
        label: "A CSS Module and a global stylesheet",
        tech: "tsx",
        runnable: false,
        code: `// app/globals.css
:root { --brand: #3b5bdb; }
body { margin: 0; font-family: system-ui, sans-serif; }

// app/layout.tsx
import "./globals.css";
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}

// app/pricing/pricing.module.css
.card { border: 1px solid #ddd; border-radius: 8px; padding: 16px; }
.price { color: var(--brand); font-size: 2rem; }

// app/pricing/page.tsx  (Server Component)
import styles from "./pricing.module.css";
export default function Pricing() {
  return <div className={styles.card}><p className={styles.price}>$19</p></div>;
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the difference between the /public folder and imported assets in Next.js?",
    seoDescription: "Files in public/ are served as-is at a fixed URL; imported assets get hashed names and year-long immutable caching. Headers compared on Next.js 16.3.4.",
    description: `**Question presented to candidate:**
"Where should images, fonts and other static files live in a Next.js app: the public folder, or imported from code? What difference does it make?"

**What a strong answer should cover:**
- Files in \`public/\` are served from the site root at a fixed URL (\`public/logo.png\` becomes \`/logo.png\`), exactly as they are.
- Because the URL never changes, they cannot be cached forever: Next.js serves them with \`max-age=0\` so updates are picked up.
- Imported assets (\`import logo from "./logo.png"\`) are copied to \`/_next/static/media/\` with a content hash and served with a one-year immutable cache.
- Imported images also give next/image their width, height and a blur placeholder automatically.
- Use public/ for files that need a stable URL: robots.txt, favicons, verification files, assets referenced by third parties.

**Clarifying questions expected:**
- "Does anything outside the app need a stable URL for this file?" — then public/.
- "Is it an image used in components?" — import it for hashing and dimensions.

**Code / implementation expected:** Yes — the same image both ways.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic React and App Router familiarity.
**Difficulty:** Easy

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.3.4 docs shipped with the package and, in the **Verified** section, against real output from a build or a running server.

## 1. Why This Even Matters — A Story First

The public folder is the shop window: items are displayed at a fixed spot and anyone can point at them, but you must check them often because they might change. Imported assets are items with a batch number stamped on them: a new version gets a new number, so a customer who has batch 12 knows it will never change and can keep it forever.

## 2. The Core Idea

📌 **Interview term: public folder** — a directory whose files are served from the site root at fixed URLs, unchanged by the build.

📌 **Interview term: Content hash** — a short hash of a file contents added to its name, so any change produces a new URL.

📌 **Interview term: Immutable caching** — a cache-control directive telling browsers and CDNs a file will never change at that URL.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 268" role="img" aria-label="The same PNG, two ways (lab headers). public/photo.png, import photo from">
  <defs>
    <marker id="nx04dkrv-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">The same PNG, two ways (lab headers)</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="48" width="280" height="136" rx="10"/>
    <text class="d-text" x="164" y="78" text-anchor="middle">public/photo.png</text>
    <text class="d-sub" x="164" y="106" text-anchor="middle">served at /photo.png</text>
    <text class="d-sub" x="164" y="128" text-anchor="middle">cache-control: max-age=0</text>
    <text class="d-sub" x="164" y="150" text-anchor="middle">stable URL, revalidated</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 307 116 L 353 116" marker-end="url(#nx04dkrv-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 307 116 L 353 116"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="356" y="48" width="280" height="136" rx="10"/>
    <text class="d-text d-accent" x="496" y="78" text-anchor="middle">import photo from</text>
    <text class="d-sub" x="496" y="106" text-anchor="middle">/_next/static/media/photo.hash</text>
    <text class="d-sub" x="496" y="128" text-anchor="middle">max-age=31536000, immutable</text>
    <text class="d-sub" x="496" y="150" text-anchor="middle">new URL on every change</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="206" width="612" height="44" rx="10"/>
    <text class="d-sub" x="330" y="233" text-anchor="middle">imported images also give next/image their dimensions and a blur placeholder</text>
  </g>
</svg>

The trade-off is between a URL that never changes and content that never changes. Each is cached accordingly.

## 3. When to use which

| File | Location | Why |
| :--- | :--- | :--- |
| favicon.ico, robots.txt, site verification files | \`public/\` or app file conventions | Must live at a known URL |
| Images used in components | Import | Hashing, dimensions, blur placeholder |
| Fonts | \`next/font\` | Self-hosting, preload, fallback metrics |
| Files linked from emails or other sites | \`public/\` | Their URL must not change |
| Large downloadable files | \`public/\` or object storage | Stable links, no bundling |

## 4. Caveats

Files added to public/ after the build are not served by \`next start\` (only files present at build time are known). Do not put secrets there: everything is public. For images from public/, next/image needs explicit width and height. More on images in [next/image](/interview-question/how-does-next-image-optimize-images-in-next-js).

## 5. Verified — Cache Headers (Next.js 16.3.4, next start)

\`\`\`
the same PNG served two ways: from public/ and as a static import (import photo from '@/public/photo.png')
/photo.png                                   -> 200 cache-control: public, max-age=0
/_next/static/media/photo.06_8n7eodspwc.png  -> 200 cache-control: public, max-age=31536000, immutable
GET /late-added.txt (created in public/ after next build, while next start was running) -> 404
\`\`\`

## 6. Common Pitfalls

- **Overwriting a public file and expecting instant updates everywhere.** CDNs may cache it; version the name or use imports.
- **Importing files that must keep a stable URL.** Hashed names change with every edit; links from outside break.
- **Adding files to public/ at runtime.** Only files present at build time are served.
- **Secrets in public/.** Everything there is downloadable.
- **Missing dimensions for public images.** next/image cannot infer them; pass width and height.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">public/ files are served as-is at fixed root URLs; imported assets get content-hashed URLs under <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/_next/static/media</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">Because a public URL can change content, it was served with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max-age=0</code>; the imported copy had <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max-age=31536000, immutable</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;">Imported images also give next/image their width, height and blur placeholder.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;">Use public/ for files that need a stable URL: favicons, robots, verification files, externally linked files.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">Only files present at build time are served, and nothing in public/ is private.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you reference a public file from CSS?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, with an absolute path like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">url("/bg.png")</code>; a relative import from CSS is bundled and hashed instead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is a public file served with max-age=0?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Its URL does not change when the file does, so browsers must revalidate to see updates.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do favicons work in the App Router?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Place <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">favicon.ico</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">icon.png</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">apple-icon.png</code> in the app directory; Next.js adds the head tags. public/favicon.ico also works.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where should user uploads go?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Object storage (S3, R2, Blob), not public/, because the app folder is read-only in most deployments and only build-time files are served.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **public folder** | Files served at fixed root URLs |
| **Imported asset** | File bundled with a hashed URL |
| **Content hash** | Name suffix that changes with content |
| **Immutable cache** | Cached forever at that URL |

---
**Conclusion:** The public folder trades caching for a stable URL; imported assets trade a stable URL for perfect caching. The lab showed the same image served with max-age=0 from public/ and a year-long immutable cache when imported. Import everything your components use, and keep public/ for files that the outside world links to.`,
    examples: [
      {
        label: "The same image from public and as an import",
        tech: "tsx",
        runnable: false,
        code: `import Image from "next/image";
import logo from "./logo.png"; // hashed URL, dimensions and blur placeholder known at build time

export function Header() {
  return (
    <header>
      <Image src={logo} alt="Company" placeholder="blur" />
      {/* public/partner-badge.png: stable URL, dimensions must be given */}
      <Image src="/partner-badge.png" alt="Partner" width={120} height={40} />
    </header>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you analyze and reduce bundle size in Next.js?",
    seoDescription: "Next 16 dropped bundle sizes from next build output; use the analyzer or Lighthouse. All of lodash added 68.6 KB, one function only 2.9 KB.",
    description: `**Question presented to candidate:**
"Lighthouse flags too much JavaScript on our product pages. How do you find out what is in the bundle, and what are your main levers to reduce it in a Next.js app?"

**What a strong answer should cover:**
- Next.js 16 removed the size and First Load JS columns from \`next build\`; measure with the Turbopack bundle analyzer (\`next experimental-analyze\`, 16.1+), \`@next/bundle-analyzer\` for Webpack builds, and Lighthouse.
- Biggest lever: keep code in Server Components, which ship no client JavaScript, and push 'use client' down to small leaves.
- Import only what you use: per-function imports or \`optimizePackageImports\` for large libraries.
- Lazy load heavy client code with next/dynamic or \`import()\` in handlers.
- Move third-party scripts to next/script with a late strategy, and keep server-only packages out of client imports.

**Clarifying questions expected:**
- "Which route and which user flow?" — measure the page that matters, not the whole app.
- "Is the cost in our code or in dependencies?" — the analyzer answers that.

**Code / implementation expected:** Yes — an import change and the analyzer command.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic React and App Router familiarity.
**Difficulty:** Medium

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.3.4 docs shipped with the package and, in the **Verified** section, against real output from a build or a running server.

## 1. Why This Even Matters — A Story First

Reducing a bundle is like packing for a trip with a strict luggage limit. First you weigh the suitcase and look inside (the analyzer). Then you leave behind what you only use at home (server-only code), take a small travel bottle instead of the full bottle (import one function), and ship the heavy ski gear separately, only if you go skiing (lazy loading).

## 2. The Core Idea

📌 **Interview term: Bundle analyzer** — a tool that shows which modules make up each JavaScript bundle and how large they are.

📌 **Interview term: Tree shaking** — removing unused exports from the bundle during the build; it only works when code is imported in a way the bundler can analyze.

📌 **Interview term: optimizePackageImports** — a next.config option that rewrites imports from large barrel-file packages so only the used modules are bundled.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 280" role="img" aria-label="Script bytes for three lab pages (uncompressed, from the build folder). baseline, lodash/debounce, import _ from lodash">
  <defs>
    <marker id="nx05m5u1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Script bytes for three lab pages (uncompressed, from the build folder)</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.45s" fill="freeze"/>
    <rect class="d-box" x="24" y="46" width="612" height="44" rx="10"/>
    <circle class="d-box-accent" cx="46" cy="68" r="12"/>
    <text class="d-text d-accent" x="46" y="73" text-anchor="middle">1</text>
    <text class="d-text" x="70" y="73">baseline</text>
    <text class="d-sub" x="262" y="72">no client component: 558.9 KB (framework and runtime)</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.45s" fill="freeze"/>
    <rect class="d-box-accent" x="24" y="102" width="612" height="44" rx="10"/>
    <circle class="d-box-accent" cx="46" cy="124" r="12"/>
    <text class="d-text d-accent" x="46" y="129" text-anchor="middle">2</text>
    <text class="d-text d-accent" x="70" y="129">lodash/debounce</text>
    <text class="d-sub" x="262" y="128">one function: 561.8 KB, only 2.9 KB more</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.45s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="158" width="612" height="44" rx="10"/>
    <circle class="d-box-accent" cx="46" cy="180" r="12"/>
    <text class="d-text d-accent" x="46" y="185" text-anchor="middle">3</text>
    <text class="d-text" x="70" y="185">import _ from lodash</text>
    <text class="d-sub" x="262" y="184">whole library: 627.5 KB, 68.6 KB more</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="218" width="612" height="44" rx="10"/>
    <text class="d-sub" x="330" y="245" text-anchor="middle">Next 16 no longer prints these sizes in next build; measure with the analyzer or Lighthouse</text>
  </g>
</svg>

The framework cost is fixed; what you control is what you add on top. One import statement was the difference between 2.9 KB and 68.6 KB here.

## 3. The levers, in order of impact

| Lever | How |
| :--- | :--- |
| Server Components by default | Keep data display and static UI on the server; ship JS only for interactivity |
| Small client boundaries | Put 'use client' on leaves, pass server content as children |
| Precise imports | \`lodash/debounce\` or \`lodash-es\`; \`optimizePackageImports\` for icon and utility libraries |
| Lazy loading | next/dynamic for heavy widgets, \`await import()\` in handlers |
| Third-party scripts | next/script with lazyOnload; drop unused tags |
| Replace heavy dependencies | Native APIs (Intl, fetch, structuredClone) instead of large utility libraries |

## 4. Measuring in Next.js 16

Run \`npx next experimental-analyze\` to inspect Turbopack server and client modules with import tracing; with \`--webpack\` builds use \`@next/bundle-analyzer\`. The docs recommend Lighthouse or real-user metrics for route performance, because the old build numbers were inaccurate with Server Components. Related: [code splitting](/interview-question/how-does-code-splitting-and-next-dynamic-work-in-next-js).

## 5. Verified — One Import, Two Costs (Next.js 16.3.4)

\`\`\`
JavaScript files referenced by each page's HTML (sizes from the build output folder)
  /bundle/full: client component with  import _ from 'lodash'
  /bundle/one : client component with  import debounce from 'lodash/debounce'
  /css-demo   : no client component (baseline)
/bundle/full   9 script files,  627.5 KB uncompressed
/bundle/one    9 script files,  561.8 KB uncompressed
/css-demo      8 script files,  558.9 KB uncompressed
\`\`\`

The build output itself has no size column in Next.js 16; the upgrade notes say the numbers were removed because they were inaccurate in server-driven architectures.

## 6. Common Pitfalls

- **Trusting old First Load JS numbers.** Next.js 16 removed them as inaccurate; measure with the analyzer and Lighthouse.
- **Barrel imports.** \`import { Icon } from "huge-icons"\` can pull in far more than one icon; use per-module imports or optimizePackageImports.
- **'use client' high in the tree.** Everything imported below it ships to the browser.
- **Date and utility libraries for small tasks.** Intl and native methods often replace them.
- **Lazy loading above-the-fold content.** It reduces the bundle but delays LCP.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Measure first: Next.js 16 removed bundle sizes from next build, so use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next experimental-analyze</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@next/bundle-analyzer</code> or Lighthouse.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">Keep work in Server Components and put 'use client' on small leaves, since only client code ships.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;">Import precisely: in the lab, all of lodash added 68.6 KB and one function 2.9 KB.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;">Lazy load heavy client widgets with next/dynamic, and schedule third-party scripts with next/script.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">Re-measure after each change on the route users actually load.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did Next.js 16 remove the size column?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The upgrade notes say the numbers were inaccurate with Server Components and that Turbopack and Webpack disagreed about client component accounting; Lighthouse and real-user data are recommended.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does optimizePackageImports do?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It rewrites imports from listed packages so only the modules you use are loaded, which helps with barrel files; some popular libraries are optimized automatically.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does a Server Component importing lodash add to the client bundle?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Only modules in the client module graph are shipped; the same import in a Server Component stays on the server.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you keep a large server-only package out of the client by mistake?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Import it only from server modules and add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">import "server-only"</code> there, so a client import fails the build.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Bundle analyzer** | Shows modules and sizes per bundle |
| **Tree shaking** | Removing unused exports |
| **optimizePackageImports** | Precise imports for barrel packages |
| **Barrel file** | A module re-exporting many others |

---
**Conclusion:** Reducing bundle size in Next.js starts with measuring, which in version 16 means the analyzer and Lighthouse rather than build output. The biggest levers are architectural (Server Components, small client boundaries) and then precise imports and lazy loading. The lab put numbers on one of them: the same debounce cost 2.9 KB or 68.6 KB depending on one import line.`,
    examples: [
      {
        label: "Precise imports, package optimization and the analyzer",
        tech: "tsx",
        runnable: false,
        code: `// Before: pulls in the whole library
import _ from "lodash";
const onSearch = _.debounce(search, 300);

// After: one module
import debounce from "lodash/debounce";
const onSearch2 = debounce(search, 300);

// next.config.ts: precise imports for barrel-heavy packages
const nextConfig = { experimental: { optimizePackageImports: ["@acme/icons"] } };
export default nextConfig;

// Terminal (Next.js 16.1+, Turbopack):
//   npx next experimental-analyze`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do environment variables work in Next.js (the NEXT_PUBLIC_ prefix)?",
    seoDescription: "NEXT_PUBLIC_ variables are inlined into client code at build time; others stay on the server. Static pages froze server values at build in the lab.",
    description: `**Question presented to candidate:**
"How do environment variables work in Next.js? Which ones reach the browser, when are their values fixed, and how do you avoid leaking a secret?"

**What a strong answer should cover:**
- Variables load from \`process.env\` and \`.env*\` files; the first match wins in this order: \`process.env\`, \`.env.$(NODE_ENV).local\`, \`.env.local\`, \`.env.$(NODE_ENV)\`, \`.env\`.
- Only variables prefixed \`NEXT_PUBLIC_\` are available in client code, and they are inlined into the JavaScript at build time.
- Server-only variables are read at runtime in dynamically rendered code, but a static page captures their values when it is prerendered at build.
- A server variable read inside a Client Component is not in the browser (undefined), but its server-rendered HTML can contain it.
- Keep secrets in server-only modules; for per-environment public values without rebuilding, read them on the server and pass them down.

**Clarifying questions expected:**
- "Is the same build promoted across environments?" — then NEXT_PUBLIC_ values are frozen at the first build.
- "Is this value secret?" — then it must never be prefixed or used in a Client Component.

**Code / implementation expected:** Yes — a server secret, a public value, and passing a runtime value to the client.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic React and App Router familiarity.
**Difficulty:** Easy

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.3.4 docs shipped with the package and, in the **Verified** section, against real output from a build or a running server.

## 1. Why This Even Matters — A Story First

Environment variables are notes you give the builder. A note marked PUBLIC is painted onto the walls of the house during construction: everyone who visits sees it, and repainting needs a rebuild. Unmarked notes stay in the site office (the server), where staff can read today's version. But if a room is decorated during construction (a static page) using a note from the office, the note of construction day is painted into it too.

## 2. The Core Idea

📌 **Interview term: NEXT_PUBLIC_** — the prefix that makes an environment variable available in client code by inlining its value at build time.

📌 **Interview term: Build-time inlining** — replacing process.env.NAME in the bundle with the literal value during next build.

📌 **Interview term: Runtime environment variable** — a server-only variable read when the code runs, so it can differ between deployments of the same build.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 336" role="img" aria-label="Where each value came from in the lab (build vs start values differed). public, client, server, dynamic, server, static, server, in client">
  <defs>
    <marker id="nx06nshi-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Where each value came from in the lab (build vs start values differed)</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.45s" fill="freeze"/>
    <rect class="d-box" x="24" y="46" width="612" height="44" rx="10"/>
    <circle class="d-box-accent" cx="46" cy="68" r="12"/>
    <text class="d-text d-accent" x="46" y="73" text-anchor="middle">1</text>
    <text class="d-text" x="70" y="73">public, client</text>
    <text class="d-sub" x="262" y="72">NEXT_PUBLIC_ in client code: build-time value, inlined</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.45s" fill="freeze"/>
    <rect class="d-box-accent" x="24" y="102" width="612" height="44" rx="10"/>
    <circle class="d-box-accent" cx="46" cy="124" r="12"/>
    <text class="d-text d-accent" x="46" y="129" text-anchor="middle">2</text>
    <text class="d-text d-accent" x="70" y="129">server, dynamic</text>
    <text class="d-sub" x="262" y="128">server variable in a dynamic page: run-time value</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.45s" fill="freeze"/>
    <rect class="d-box" x="24" y="158" width="612" height="44" rx="10"/>
    <circle class="d-box-accent" cx="46" cy="180" r="12"/>
    <text class="d-text d-accent" x="46" y="185" text-anchor="middle">3</text>
    <text class="d-text" x="70" y="185">server, static</text>
    <text class="d-sub" x="262" y="184">server variable in a static page: frozen at build</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.45s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="214" width="612" height="44" rx="10"/>
    <circle class="d-box-accent" cx="46" cy="236" r="12"/>
    <text class="d-text d-accent" x="46" y="241" text-anchor="middle">4</text>
    <text class="d-text" x="70" y="241">server, in client</text>
    <text class="d-sub" x="262" y="240">undefined in the browser, but present in the SSR HTML</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.7s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="274" width="612" height="44" rx="10"/>
    <text class="d-sub" x="330" y="301" text-anchor="middle">the last row also caused a hydration mismatch (React error 418) in the browser</text>
  </g>
</svg>

The rule to remember is about time, not only about prefixes: public values and static pages are fixed when you build, dynamic server code reads the environment it runs in.

## 3. The rules

| Variable | Client code | Server code, dynamic | Server code, static |
| :--- | :--- | :--- | :--- |
| \`NEXT_PUBLIC_X\` | Build-time value, inlined | Build-time value (inlined too) | Build-time value |
| \`SECRET_X\` | undefined | Runtime value | Value at build time |

## 4. Patterns

Put secrets in modules that start with \`import "server-only"\`. When a public value must differ per environment without rebuilding (for example the same Docker image in staging and production), read an unprefixed variable in a dynamic Server Component and pass it as a prop or through context. For tools outside Next.js (an ORM config, a test runner), load \`.env\` files with \`@next/env\`. See [deployment](/interview-question/how-do-you-deploy-a-next-js-app-vercel-vs-self-hosted).

## 5. Verified — Build-Time and Run-Time Values (Next.js 16.3.4)

\`\`\`
next build ran with NEXT_PUBLIC_FLAG=build-time SERVER_SECRET=build-secret
next start ran with NEXT_PUBLIC_FLAG=run-time   SERVER_SECRET=run-secret

/env-static (static page, rendered at build; includes a client component):
  server: public=build-time secret=build-secret client: public=build-time secret=build-secret
/env-dyn (dynamic page, rendered per request):
  server: public=build-time secret=run-secret

client chunks containing the string "build-time": 1
client chunks containing "build-secret" or "run-secret": 0

the client component (reads process.env.NEXT_PUBLIC_FLAG and process.env.SERVER_SECRET), in a real browser:
  server HTML for it:      client: public=build-time secret=build-secret     <- the server-only value is in the page source
  after hydration:         client: public=build-time secret=undefined
  browser console:         Uncaught Error: Minified React error #418 (hydration mismatch)
\`\`\`

Three findings: the public value stayed at its build-time value even on the dynamic page; the static page froze the server secret at build; and reading the server secret in a Client Component put it into the server-rendered HTML and then caused a hydration error, because the browser saw \`undefined\`.

## 6. Common Pitfalls

- **Reading a server secret in a Client Component.** The SSR HTML can contain it, and the browser sees undefined: a leak and a hydration mismatch, as the lab showed.
- **Expecting NEXT_PUBLIC_ values to change at runtime.** They are inlined when you build; promoting one build to another environment keeps the old value.
- **Reading runtime config in static pages.** They are prerendered at build and keep those values; make the route dynamic or pass values from a dynamic parent.
- **Prefixing secrets to make an error go away.** NEXT_PUBLIC_ exposes them to every visitor.
- **Committing .env.local.** Keep secrets out of git; commit only examples.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Next.js loads variables from process.env and .env files, first match wins.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">Only NEXT_PUBLIC_ variables reach client code, inlined at build time; in the lab the runtime value never appeared.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;">Server variables are read at runtime in dynamic code, but static pages freeze the build-time value.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;">A server variable read in a Client Component was undefined in the browser but present in the SSR HTML, and caused a hydration error.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">Keep secrets in server-only modules and pass per-environment public values from a dynamic Server Component.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you have different public API URLs for staging and production with one build?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Do not use NEXT_PUBLIC_ for it. Read an unprefixed variable in a dynamic Server Component (or a Route Handler) and pass it to the client.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why was NEXT_PUBLIC_FLAG still build-time even on the server?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Next.js inlines NEXT_PUBLIC_ references at build time in all bundles, so the literal value replaced the expression.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which .env file wins?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">process.env first, then .env.$(NODE_ENV).local, .env.local, .env.$(NODE_ENV), .env; .env.local is not read in the test environment.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you read env vars dynamically, like process.env[name]?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For NEXT_PUBLIC_ values no, because inlining needs the literal name; on the server dynamic access works at runtime.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **NEXT_PUBLIC_** | Prefix for client-visible variables |
| **Inlining** | Replacing references with literal values at build |
| **Runtime variable** | Read when the code runs |
| **@next/env** | Loads .env files outside Next.js |

---
**Conclusion:** Environment variables in Next.js are a question of both visibility and time: NEXT_PUBLIC_ values are inlined into the build, server values are read at runtime only in dynamic code, and static pages freeze whatever they read at build. The lab showed each case, plus the dangerous one: a secret read in a Client Component leaked into HTML and broke hydration.`,
    examples: [
      {
        label: "Server secrets, public values and a runtime value passed down",
        tech: "tsx",
        runnable: false,
        code: `// .env.local
//   STRIPE_SECRET_KEY=sk_live_...
//   NEXT_PUBLIC_SITE_NAME=Lab Shop
//   PUBLIC_API_URL=https://api.staging.example.com   (not prefixed on purpose)

// lib/stripe.ts
import "server-only";
export const stripeKey = process.env.STRIPE_SECRET_KEY!; // server only

// app/layout.tsx (dynamic Server Component passes a runtime value)
import { connection } from "next/server";
import { ConfigProvider } from "./ConfigProvider"; // a Client Component context
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await connection();                                   // read env at request time
  return (
    <html lang="en">
      <body>
        <ConfigProvider apiUrl={process.env.PUBLIC_API_URL!}>{children}</ConfigProvider>
      </body>
    </html>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Server Components and external packages — what does `serverComponentsExternalPackages` do?",
    seoDescription: "serverExternalPackages (formerly serverComponentsExternalPackages) keeps a package out of the server bundle, loaded from node_modules. Proven on 16.3.4.",
    description: `**Question presented to candidate:**
"A package with native binaries breaks when Next.js bundles it for Server Components. What does serverComponentsExternalPackages do, what is it called now, and when do you need it?"

**What a strong answer should cover:**
- By default Next.js bundles the dependencies of Server Components and Route Handlers into the server output.
- Some packages break when bundled: native addons, packages that read their own files at runtime, or packages with dynamic requires.
- \`serverExternalPackages\` (renamed from \`experimental.serverComponentsExternalPackages\` in Next.js 15) tells Next.js to leave those packages unbundled and \`require\` them from node_modules at runtime.
- Next.js already keeps a built-in list of such packages external (for example Prisma and sharp), so most apps never need to configure it.
- The old experimental key is flagged as invalid, but Next.js still maps it to the new option and prints a warning.

**Clarifying questions expected:**
- "What is the exact build or runtime error?" — module-not-found for a binary or a missing file points to bundling.
- "Is the package already on the built-in list?" — then the problem is elsewhere.

**Code / implementation expected:** Yes — the config option and what changes in the build output.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic React and App Router familiarity.
**Difficulty:** Medium

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.3.4 docs shipped with the package and, in the **Verified** section, against real output from a build or a running server.

## 1. Why This Even Matters — A Story First

Bundling is like packing all the tools for a job into one toolbox. Most tools fit, but some are bolted to the workshop wall (native binaries) or need the rest of the workshop to work (files they read at runtime). serverExternalPackages is the note that says: do not try to pack this one, the worker will use it from the workshop wall when needed.

## 2. The Core Idea

📌 **Interview term: serverExternalPackages** — a next.config option listing packages that Next.js should not bundle for server code, loading them from node_modules at runtime instead.

📌 **Interview term: Bundling** — combining modules and their dependencies into output files during the build.

📌 **Interview term: Native addon** — a Node package that includes compiled binary code, which bundlers cannot inline.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 268" role="img" aria-label="Where the package code ends up (lab build). default build, serverExternalPackages">
  <defs>
    <marker id="nx0722l0-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Where the package code ends up (lab build)</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="48" width="280" height="136" rx="10"/>
    <text class="d-text" x="164" y="78" text-anchor="middle">default build</text>
    <text class="d-sub" x="164" y="106" text-anchor="middle">package inlined into</text>
    <text class="d-sub" x="164" y="128" text-anchor="middle">a server chunk file</text>
    <text class="d-sub" x="164" y="150" text-anchor="middle">works for plain JavaScript</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 307 116 L 353 116" marker-end="url(#nx0722l0-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 307 116 L 353 116"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="356" y="48" width="280" height="136" rx="10"/>
    <text class="d-text d-accent" x="496" y="78" text-anchor="middle">serverExternalPackages</text>
    <text class="d-sub" x="496" y="106" text-anchor="middle">0 server files contain it</text>
    <text class="d-sub" x="496" y="128" text-anchor="middle">traced from node_modules</text>
    <text class="d-sub" x="496" y="150" text-anchor="middle">required at runtime</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="206" width="612" height="44" rx="10"/>
    <text class="d-sub" x="330" y="233" text-anchor="middle">the old experimental name still worked but printed an invalid-key warning with the new name</text>
  </g>
</svg>

Externalizing does not change what the code does, only where it is loaded from. That is exactly what native and file-reading packages need.

## 3. When you need it

| Symptom | Likely cause |
| :--- | :--- |
| "Module not found" for a .node binary | Native addon bundled |
| ENOENT for a file inside the package | The package reads its own files by relative path |
| Package works in plain Node but not in Next.js | Dynamic \`require\` the bundler cannot follow |
| Huge server chunks from one dependency | It could be loaded from node_modules instead |

## 4. Configuration

\`\`\`ts
// next.config.ts
const nextConfig = { serverExternalPackages: ["@acme/native-pdf"] };
\`\`\`

Next.js keeps many packages external by default (the docs list includes Prisma, sharp, bcrypt and others). The option applies to Server Components, Route Handlers and Server Actions; Client Components are bundled for the browser regardless. In standalone output, externalized packages are copied through output file tracing, which the lab trace file showed. See [standalone output](/interview-question/what-is-the-output-standalone-build-in-next-js-and-when-do-you-use-it).

## 5. Verified — Bundled vs External (Next.js 16.3.4)

\`\`\`
app/ext/page.tsx imports { marker } from "lab-marker-pkg" (a package whose code contains LAB_EXTERNAL_PACKAGE_MARKER_77)

default next build:
  the package code is bundled into  .next/server/chunks/ssr/[root-of-the-server]__1x6wqjq._.js
with  serverExternalPackages: ["lab-marker-pkg"]:
  server output files containing the package code: 0
  the route trace (page.js.nft.json) lists ../node_modules/lab-marker-pkg/index.js instead: it is loaded from node_modules at runtime
  GET /ext still renders LAB_EXTERNAL_PACKAGE_MARKER_77
with the old  experimental: { serverComponentsExternalPackages: [...] }:
  ⚠ Unrecognized key(s) in object: 'serverComponentsExternalPackages' at "experimental"
  ⚠ \`experimental.serverComponentsExternalPackages\` has been moved to \`serverExternalPackages\`. Please update your next.config.ts file accordingly.
\`\`\`

## 6. Common Pitfalls

- **Using the old experimental key.** It is reported as invalid; move it to \`serverExternalPackages\`.
- **Externalizing to fix unrelated errors.** If the package works as plain JavaScript, bundling is usually fine; read the actual error first.
- **Forgetting deployment.** Externalized packages must exist in node_modules on the server; standalone output traces them, custom Docker images must include them.
- **Expecting it to affect Client Components.** Browser bundles cannot load from node_modules.
- **Adding packages already on the default list.** It is harmless but unnecessary.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">By default Next.js bundles the dependencies of server code into the build output.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">Native addons, packages that read their own files, and dynamic requires can break when bundled.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">serverExternalPackages</code> (formerly experimental.serverComponentsExternalPackages) leaves them unbundled and requires them from node_modules at runtime.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;">In the lab the package code moved from a server chunk to the route trace: 0 build files contained it and the page still worked.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">The old key still worked with an invalid-key warning; many popular packages are already external by default.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why rename it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It was stabilized in Next.js 15 and applies to all server code, not just Server Components, so the new name <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">serverExternalPackages</code> describes it better.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you know a package is on the default list?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The serverExternalPackages docs link the list; packages like Prisma and sharp are there, which is why they usually work without configuration.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does externalizing make cold starts slower?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It can, slightly, because modules are loaded from node_modules instead of a prebuilt chunk; for most packages the difference is small.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the related option for Pages Router or client bundles?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">transpilePackages</code> does the opposite for code that must be compiled (for example untranspiled monorepo packages); it is not about server externals.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **serverExternalPackages** | Packages loaded from node_modules at runtime |
| **Bundling** | Combining modules into build output |
| **Native addon** | Package with compiled binaries |
| **Output file tracing** | Recording which files a route needs at runtime |

---
**Conclusion:** serverExternalPackages, the stable name for serverComponentsExternalPackages, keeps specific packages out of the server bundle so they load from node_modules at runtime. The lab showed the package moving from a server chunk to the route trace while the page kept working, and the old key being mapped with a warning. Reach for it when a native or file-reading package breaks under bundling.`,
    examples: [
      {
        label: "Externalizing a native package",
        tech: "tsx",
        runnable: false,
        code: `// next.config.ts
import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  serverExternalPackages: ["@acme/native-pdf"],
};
export default nextConfig;

// app/api/invoice/[id]/route.ts  (server code using the package)
import { renderPdf } from "@acme/native-pdf"; // required from node_modules at runtime
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const pdf = await renderPdf({ invoiceId: id });
  return new Response(pdf, { headers: { "content-type": "application/pdf" } });
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is Turbopack in Next.js and how does it compare to Webpack?",
    seoDescription: "Turbopack is the default bundler in Next 16 for dev and build; in the lab it compiled 2.3 to 3.3 times faster than --webpack, which is the opt-out.",
    description: `**Question presented to candidate:**
"What is Turbopack, is it production ready, and what should a team with a custom Webpack configuration check before relying on it?"

**What a strong answer should cover:**
- Turbopack is an incremental bundler written in Rust, built into Next.js; since Next.js 16 it is the default for both \`next dev\` and \`next build\`.
- Its speed comes from incremental computation and caching at the function level, so changes recompute only what depends on them.
- Webpack is still available with \`--webpack\`.
- A custom \`webpack()\` function in next.config is not used by Turbopack: common needs have built-in support or \`turbopack.rules\` for Webpack loaders; Webpack plugins are not supported.
- Configure it under the \`turbopack\` key (for example \`rules\`, \`resolveAlias\`, \`root\`); file-system caching speeds up restarts.

**Clarifying questions expected:**
- "Does next.config have a webpack function or plugins?" — those need a migration or \`--webpack\`.
- "Which loaders are used?" — many work through turbopack.rules.

**Code / implementation expected:** Yes — moving a loader to turbopack.rules, and the opt-out flag.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic React and App Router familiarity.
**Difficulty:** Medium

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.3.4 docs shipped with the package and, in the **Verified** section, against real output from a build or a running server.

## 1. Why This Even Matters — A Story First

Webpack is a printing press that reprints the whole page when you fix one typo, and has decades of add-ons. Turbopack is a press that remembers every letter it has set and only resets the ones that changed, but it does not accept every old add-on. Next.js 16 made the new press standard and keeps the old one in the back room for anyone who still needs its attachments.

## 2. The Core Idea

📌 **Interview term: Turbopack** — the Rust-based incremental bundler built into Next.js; the default for next dev and next build since version 16.

📌 **Interview term: Incremental computation** — reusing cached results of previous work and recomputing only what a change affects.

📌 **Interview term: turbopack.rules** — the next.config setting that applies supported Webpack loaders to matching files under Turbopack.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 268" role="img" aria-label="The same app, both bundlers (lab, this machine). Turbopack (default), webpack (--webpack)">
  <defs>
    <marker id="nx08c51p-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">The same app, both bundlers (lab, this machine)</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="24" y="48" width="280" height="136" rx="10"/>
    <text class="d-text d-accent" x="164" y="78" text-anchor="middle">Turbopack (default)</text>
    <text class="d-sub" x="164" y="106" text-anchor="middle">build: compiled in 6.3 to 6.7 s</text>
    <text class="d-sub" x="164" y="128" text-anchor="middle">dev first request: 3.7 s</text>
    <text class="d-sub" x="164" y="150" text-anchor="middle">webpack() config ignored</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 307 116 L 353 116" marker-end="url(#nx08c51p-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 307 116 L 353 116"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-muted" x="356" y="48" width="280" height="136" rx="10"/>
    <text class="d-text" x="496" y="78" text-anchor="middle">webpack (--webpack)</text>
    <text class="d-sub" x="496" y="106" text-anchor="middle">build: compiled in 14.4 to 22.0 s</text>
    <text class="d-sub" x="496" y="128" text-anchor="middle">dev first request: 6.7 s</text>
    <text class="d-sub" x="496" y="150" text-anchor="middle">runs webpack() config</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="206" width="612" height="44" rx="10"/>
    <text class="d-sub" x="330" y="233" text-anchor="middle">a throwing webpack function did not stop the Turbopack build, but failed next build --webpack</text>
  </g>
</svg>

The speed difference is real, but the migration risk is in configuration: Turbopack silently skips a custom webpack function, so check what it was doing.

## 3. Comparison

| | Turbopack | Webpack |
| :--- | :--- | :--- |
| Default in Next.js 16 | Yes, dev and build | No, opt in with \`--webpack\` |
| Language | Rust | JavaScript |
| Speed model | Incremental, function-level caching | Rebuilds affected chunks |
| Custom \`webpack()\` config | Not used | Used |
| Loaders | Built-in CSS, TS, JSX; many Webpack loaders via \`turbopack.rules\` | Any loader |
| Plugins | Not supported | Any Webpack plugin |

## 4. Migrating a custom Webpack config

List what the \`webpack()\` function does. Aliases move to \`turbopack.resolveAlias\`; loaders like SVGR move to \`turbopack.rules\`; built-in features (CSS, Sass, TypeScript) need nothing. Anything relying on Webpack plugins or loader APIs Turbopack does not support needs \`--webpack\` for now. The Next.js 16 upgrade is covered in [what breaks when upgrading to Next.js 16](/interview-question/what-breaks-when-you-upgrade-to-next-js-16-and-how-do-you-migrate).

## 5. Verified — Timings and Config Behaviour (Next.js 16.3.4)

\`\`\`
the same lab app (about 60 routes), Next.js 16.3.4, this machine; wall-clock times, so treat them as ratios, not benchmarks

next build (Turbopack is the default; the header prints "Next.js 16.3.4 (Turbopack)")
  run 1: Turbopack 13.97 s total, compiled in 6.7 s   |   next build --webpack 46.40 s total, compiled in 22.0 s
  run 2: Turbopack 12.82 s total, compiled in 6.3 s   |   next build --webpack 32.04 s total, compiled in 14.4 s

next dev (fresh cache each time)
  Turbopack: Ready in 1082 ms, first request /css-demo 3712 ms, first request /dyn-import 634 ms
  Webpack:   Ready in  780 ms, first request /css-demo 6684 ms, first request /dyn-import 2072 ms

next.config.ts with a custom  webpack: () => { throw new Error("CUSTOM WEBPACK FUNCTION RAN") }
  next build            -> exit 0, the error never appears, no warning printed (the function is not called)
  next build --webpack  -> exit 1, "CUSTOM WEBPACK FUNCTION RAN"
\`\`\`

The absolute numbers depend on the machine and the app; the ratios and the silent skipping of the webpack function are the useful parts.

## 6. Common Pitfalls

- **Assuming the webpack function still runs.** Under Turbopack it is not called and no warning was printed in the lab; move its logic to turbopack options or build with \`--webpack\`.
- **Webpack plugins.** They are not supported by Turbopack; find built-in equivalents or keep Webpack.
- **Old flags.** \`next dev --turbo\` or \`--turbopack\` are no longer needed; Turbopack is the default.
- **Loader features Turbopack does not implement.** Loaders using \`emitFile\` or \`loadModule\` do not work; test each loader.
- **Comparing cold builds only.** Much of the benefit is incremental: later compiles and file-system caching.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Turbopack is the Rust-based incremental bundler built into Next.js, default for dev and build since 16.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">In the lab it compiled the production build 2.3 to 3.3 times faster than <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">--webpack</code>, and dev first requests were faster too.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;">Webpack remains available with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">--webpack</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;">A custom webpack() function is silently ignored under Turbopack: a throwing one did not affect the build at all.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">Migrate loaders to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">turbopack.rules</code>, aliases to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">resolveAlias</code>, and keep Webpack only for unsupported plugins.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is Turbopack production ready?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In Next.js 16 it is the default for production builds, which is the strongest signal; the lab build used it without any flag.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens to next.config webpack customizations?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Turbopack does not call the function. The lab proved it by making the function throw: the Turbopack build passed, the Webpack build failed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you use SVGR with Turbopack?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Add a rule under <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">turbopack.rules</code> for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">*.svg</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@svgr/webpack</code> as the loader and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">*.js</code> as the result type.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why was dev startup slightly faster with Webpack in the lab?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Ready time measures server start, which was small for both; the first page compile, where the real work happens, was about twice as fast with Turbopack.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Turbopack** | Default Rust bundler in Next 16 |
| **--webpack** | Flag to build or run dev with Webpack |
| **turbopack.rules** | Loader configuration for Turbopack |
| **Incremental build** | Recomputing only what changed |

---
**Conclusion:** Turbopack is now simply how Next.js builds: default for dev and production, and clearly faster in the lab. The migration risk is not speed but configuration, because a custom webpack function is silently skipped. Audit what that function did, move loaders and aliases to the turbopack options, and keep --webpack only for plugins Turbopack cannot replace.`,
    examples: [
      {
        label: "Moving an SVG loader from webpack() to turbopack.rules",
        tech: "tsx",
        runnable: false,
        code: `// next.config.ts (before: only runs with --webpack)
const before = {
  webpack(config: any) {
    config.module.rules.push({ test: /\\.svg$/, use: ["@svgr/webpack"] });
    return config;
  },
};

// next.config.ts (after: works with Turbopack, the Next.js 16 default)
import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.svg": { loaders: ["@svgr/webpack"], as: "*.js" },
    },
  },
};
export default nextConfig;

// still need Webpack for an unsupported plugin?
//   next build --webpack`,
      },
    ],
  },
];

export default augments;
