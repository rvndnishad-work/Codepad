/**
 * Next.js Phase — Batch 7 (Optimization & assets). See nextjs-augments-gold-1.ts.
 */
import type { NextAugment } from "./nextjs-augments.types";

const augments: NextAugment[] = [
  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How does next/image optimize images in Next.js?",
    answer: `**TL;DR.** <code>next/image</code> serves **correctly-sized, modern-format** (WebP/AVIF) images **on demand**, **lazy-loads** by default, and **reserves space** (width/height) to prevent layout shift. It optimizes via a built-in loader/CDN, cutting bytes and improving **Core Web Vitals**.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Original image optimized to sized, modern-format, lazy-loaded output'>
  <rect class='d-box-muted' x='20' y='52' width='120' height='46' rx='8'/><text class='d-sub' x='80' y='72' text-anchor='middle'>original</text><text class='d-sub' x='80' y='90' text-anchor='middle'>large JPEG</text>
  <path class='d-edge-accent' d='M142 75 H200' marker-end='url(#ng1)'/>
  <rect class='d-box-accent' x='202' y='45' width='150' height='60' rx='8'/><text class='d-text' x='277' y='70' text-anchor='middle'>next/image</text><text class='d-sub' x='277' y='88' text-anchor='middle'>resize + WebP/AVIF</text>
  <path class='d-edge-accent' d='M354 75 H402' marker-end='url(#ng1)'/>
  <rect class='d-box' x='404' y='52' width='46' height='46' rx='8'/><text class='d-sub' x='427' y='79' text-anchor='middle'>lazy</text>
  <defs><marker id='ng1' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** Images are often a page's heaviest asset. <code>&lt;Image&gt;</code> optimizes them automatically: it generates **responsive sizes** (via <code>srcset</code> from <code>sizes</code>) so devices download only what they need, converts to **modern formats** (AVIF/WebP) when supported, and **lazy-loads** off-screen images (with <code>priority</code> to eager-load the LCP image). It requires <code>width</code>/<code>height</code> (or <code>fill</code>) so the browser reserves space, eliminating **Cumulative Layout Shift**, and supports blur **placeholders**. Optimization happens on-demand through a **loader** (Next's built-in optimizer, or a CDN/third-party loader you configure); results are cached. Remote images need their host allowlisted in <code>images.remotePatterns</code>. The payoff is smaller transfers and better LCP/CLS with almost no manual work — the trade-off is the optimizer infra (which Vercel provides, or you self-host/configure).

### next/image wins
| Feature | Benefit |
| --- | --- |
| responsive srcset | right size per device |
| AVIF/WebP | smaller bytes |
| lazy + <code>priority</code> | defer offscreen, eager LCP |
| width/height | no layout shift (CLS) |

> **Interview tip:** Hit **automatic sizing + modern formats + lazy-loading + CLS prevention**. Mention <code>priority</code> for the LCP image and <code>remotePatterns</code> for external hosts.`,
    examples: [
      {
        label: "Responsive, priority LCP image",
        tech: "tsx",
        runnable: false,
        code: `import Image from 'next/image';

<Image
  src="/hero.jpg" alt="Hero"
  width={1200} height={630}      // reserves space → no CLS
  priority                        // eager-load the LCP image
  sizes="(max-width: 768px) 100vw, 1200px"
  placeholder="blur"
/>;
// next.config.js: images: { remotePatterns: [{ hostname: 'cdn.example.com' }] }`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How does next/font work and why does it improve performance?",
    answer: `**TL;DR.** <code>next/font</code> **downloads and self-hosts** fonts (Google or local) **at build time**, removing external requests and using <code>size-adjust</code>/fallback metrics to **eliminate layout shift** (CLS). It also **strips unused glyphs**, improving load performance and **privacy**.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Fonts self-hosted at build, no external request, no layout shift'>
  <rect class='d-box-muted' x='20' y='52' width='140' height='46' rx='8'/><text class='d-sub' x='90' y='72' text-anchor='middle'>Google Fonts</text><text class='d-sub' x='90' y='90' text-anchor='middle'>(build time)</text>
  <path class='d-edge-accent' d='M162 75 H220' marker-end='url(#ng2)'/>
  <rect class='d-box-accent' x='222' y='45' width='150' height='60' rx='8'/><text class='d-text' x='297' y='70' text-anchor='middle'>self-hosted</text><text class='d-sub' x='297' y='88' text-anchor='middle'>subset + size-adjust</text>
  <path class='d-edge-accent' d='M374 75 H420' marker-end='url(#ng2)'/>
  <rect class='d-box' x='422' y='52' width='28' height='46' rx='8'/><text class='d-sub' x='436' y='79' text-anchor='middle'>Aa</text>
  <defs><marker id='ng2' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** Loading webfonts naively causes two problems: an **extra network request** to a third party (latency + a privacy/GDPR concern with Google Fonts) and a **layout shift** when the custom font swaps in for the fallback (FOUT/FOIT hurting CLS). <code>next/font</code> fixes both: at **build time** it fetches the font files and **self-hosts** them from your own domain (no runtime request to Google), automatically **subsets** to the glyphs/weights you use, and computes a **size-adjusted fallback** so the fallback and real font occupy the same space — no shift when it loads. You import the font once, get a <code>className</code> (or CSS variable) to apply, and it's preloaded. This yields faster text rendering, zero font-related CLS, and no third-party dependency. Local fonts work the same via <code>next/font/local</code>.

### next/font benefits
| Benefit | How |
| --- | --- |
| no external request | self-host at build |
| no layout shift | size-adjust fallback |
| smaller | glyph subsetting |
| privacy | no Google runtime call |

> **Interview tip:** The two wins: **self-hosting** (no third-party request/privacy issue) and **zero CLS** via size-adjusted fallbacks. Bonus: automatic **subsetting** and preloading.`,
    examples: [
      {
        label: "Load and apply a Google font",
        tech: "tsx",
        runnable: false,
        code: `// app/layout.tsx
import { Inter } from 'next/font/google';
const inter = Inter({ subsets: ['latin'], display: 'swap' });

export default function RootLayout({ children }) {
  return <html className={inter.className}><body>{children}</body></html>;
}
// Font is self-hosted, subset, and size-adjusted — no external request, no CLS.`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is next/script and what are its strategy options in Next.js?",
    answer: `**TL;DR.** <code>next/script</code> loads third-party scripts with a **strategy**: <code>beforeInteractive</code> (critical, before hydration), <code>afterInteractive</code> (default, after hydration), <code>lazyOnload</code> (browser idle), and <code>worker</code> (off the main thread). It prevents blocking scripts from hurting performance.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Script strategies map to points in the page lifecycle'>
  <rect class='d-box-accent' x='15' y='55' width='105' height='44' rx='8'/><text class='d-sub' x='67' y='75' text-anchor='middle'>beforeInteractive</text><text class='d-sub' x='67' y='91' text-anchor='middle'>pre-hydration</text>
  <rect class='d-box' x='128' y='55' width='105' height='44' rx='8'/><text class='d-sub' x='180' y='75' text-anchor='middle'>afterInteractive</text><text class='d-sub' x='180' y='91' text-anchor='middle'>default</text>
  <rect class='d-box' x='241' y='55' width='105' height='44' rx='8'/><text class='d-sub' x='293' y='75' text-anchor='middle'>lazyOnload</text><text class='d-sub' x='293' y='91' text-anchor='middle'>on idle</text>
  <rect class='d-box-muted' x='354' y='55' width='92' height='44' rx='8'/><text class='d-sub' x='400' y='75' text-anchor='middle'>worker</text><text class='d-sub' x='400' y='91' text-anchor='middle'>off-thread</text>
</svg>

**How it works.** Third-party scripts (analytics, chat, tag managers) can **block rendering** or steal main-thread time, hurting TTI/LCP. <code>&lt;Script&gt;</code> lets you declare **when** each loads so Next.js schedules it optimally and dedupes it. <code>beforeInteractive</code> is for the rare **critical** script that must run before the page is interactive (e.g. a consent/polyfill) — injected in the document early. <code>afterInteractive</code> (the **default**) loads after hydration — right for analytics/tag managers. <code>lazyOnload</code> waits for browser **idle** — good for low-priority widgets (chat, social). <code>worker</code> (experimental, via Partytown) runs the script in a **web worker**, freeing the main thread entirely. You can also hook <code>onLoad</code>/<code>onReady</code>. Choosing the right strategy keeps heavy third-party code from degrading Core Web Vitals.

### Script strategies
| Strategy | Loads |
| --- | --- |
| <code>beforeInteractive</code> | before hydration (critical) |
| <code>afterInteractive</code> | after hydration (default) |
| <code>lazyOnload</code> | on browser idle |
| <code>worker</code> | in a web worker |

> **Interview tip:** Match strategy to priority — **critical→beforeInteractive, analytics→afterInteractive, low-priority→lazyOnload, offload→worker** — and the point is protecting the **main thread / Core Web Vitals** from third-party scripts.`,
    examples: [
      {
        label: "Load analytics after interactive",
        tech: "tsx",
        runnable: false,
        code: `import Script from 'next/script';

// analytics: not critical → after hydration
<Script src="https://analytics.example.com/a.js" strategy="afterInteractive" />;

// chat widget: low priority → when the browser is idle
<Script src="https://chat.example.com/w.js" strategy="lazyOnload" />;`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How does code splitting and next/dynamic work in Next.js?",
    answer: `**TL;DR.** Next.js **automatically code-splits per route**. <code>next/dynamic</code> (or <code>React.lazy</code>) defers loading a **heavy or client-only** component until needed, with an optional loading fallback and <code>ssr: false</code> to skip server rendering — **shrinking the initial bundle**.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Heavy component split into a separate chunk loaded on demand'>
  <rect class='d-box-accent' x='20' y='52' width='140' height='46' rx='8'/><text class='d-text' x='90' y='73' text-anchor='middle'>initial bundle</text><text class='d-sub' x='90' y='90' text-anchor='middle'>small</text>
  <path class='d-edge-dashed' d='M162 75 H220' marker-end='url(#ng3)'/>
  <text class='d-sub' x='191' y='66' text-anchor='middle'>on demand</text>
  <rect class='d-box' x='222' y='52' width='140' height='46' rx='8'/><text class='d-text' x='292' y='73' text-anchor='middle'>heavy chunk</text><text class='d-sub' x='292' y='90' text-anchor='middle'>chart/editor</text>
  <defs><marker id='ng3' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** Next.js splits your app so each **route** only loads its own JS (plus shared chunks), rather than one giant bundle — this is automatic. **<code>next/dynamic</code>** adds **component-level** splitting: wrap an import so the component's code is fetched **lazily** (a separate chunk) only when it renders. Use it for **heavy** dependencies (charts, rich-text editors, maps), **below-the-fold** or **modal** content, and **browser-only** components — pass <code>{ ssr: false }</code> to skip server rendering entirely (for things that touch <code>window</code>) and a <code>loading</code> fallback for the interim. In the App Router, keeping components as **Server Components** already removes their JS from the client; <code>next/dynamic</code> is mainly for deferring **Client Component** weight. The result: faster initial load (smaller/critical JS first) with the rest streamed in as needed.

### Splitting tools
| Tool | Splits |
| --- | --- |
| automatic | per route |
| <code>next/dynamic</code> | per component (lazy) |
| <code>{ ssr: false }</code> | client-only components |
| Server Components | remove client JS entirely |

> **Interview tip:** Distinguish **automatic route splitting** from **manual <code>next/dynamic</code>** for heavy/client-only components (with <code>ssr:false</code> + loading). Note Server Components already cut client JS.`,
    examples: [
      {
        label: "Lazy-load a heavy client-only component",
        tech: "tsx",
        runnable: false,
        code: `import dynamic from 'next/dynamic';

// heavy charting lib — split into its own chunk, client-only, with a fallback
const Chart = dynamic(() => import('./Chart'), {
  ssr: false,
  loading: () => <p>Loading chart…</p>,
});

export default function Dashboard() {
  return <Chart data={data} />;   // Chart JS loads only when this renders
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How does Next.js handle CSS (CSS Modules, global, Tailwind, CSS-in-JS)?",
    answer: `**TL;DR.** Next.js supports **global CSS** (imported in the root layout), **CSS Modules** (scoped per component), **Tailwind**, and **Sass** out of the box. **Runtime CSS-in-JS** libraries need a <code>'use client'</code> boundary/registry since they don't run in Server Components; **zero-runtime** CSS works best with RSC.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='CSS approaches and their compatibility with server components'>
  <rect class='d-box-accent' x='20' y='40' width='130' height='34' rx='6'/><text class='d-sub' x='85' y='62' text-anchor='middle'>CSS Modules ✓RSC</text>
  <rect class='d-box-accent' x='160' y='40' width='130' height='34' rx='6'/><text class='d-sub' x='225' y='62' text-anchor='middle'>Tailwind ✓RSC</text>
  <rect class='d-box' x='300' y='40' width='140' height='34' rx='6'/><text class='d-sub' x='370' y='62' text-anchor='middle'>global CSS (root)</text>
  <rect class='d-box-muted' x='90' y='90' width='280' height='40' rx='8'/><text class='d-sub' x='230' y='115' text-anchor='middle'>runtime CSS-in-JS → needs 'use client' registry</text>
</svg>

**How it works.** Next.js has built-in CSS handling. **Global CSS** must be imported in the **root layout** (applies everywhere). **CSS Modules** (<code>*.module.css</code>) generate locally-scoped class names, avoiding collisions — the safe default for component styles and fully RSC-compatible. **Tailwind** works out of the box (utility classes, purged at build) and pairs great with Server Components. **Sass** is supported by installing <code>sass</code>. The wrinkle is **runtime CSS-in-JS** (styled-components, Emotion): they inject styles at **runtime in the browser**, which **doesn't work in Server Components** — you must mark styled components <code>'use client'</code> and set up an SSR **style registry** to avoid FOUC. Because of this friction, the ecosystem favors **zero-runtime** approaches with RSC: CSS Modules, Tailwind, vanilla-extract, or PandaCSS (styles extracted at build). Choose based on RSC compatibility and team preference.

### CSS options vs RSC
| Approach | RSC-friendly? |
| --- | --- |
| CSS Modules | ✅ |
| Tailwind | ✅ |
| global CSS | ✅ (root import) |
| runtime CSS-in-JS | ⚠️ client + registry |

> **Interview tip:** The key nuance: **runtime CSS-in-JS needs a <code>'use client'</code> registry** (doesn't run in Server Components), so RSC favors **CSS Modules/Tailwind/zero-runtime**. Global CSS goes in the **root layout**.`,
    examples: [
      {
        label: "CSS Modules (scoped) + global import",
        tech: "tsx",
        runnable: false,
        code: `// app/layout.tsx — global styles only here
import './globals.css';

// button.module.css → scoped class names
import styles from './button.module.css';
export function Button() {
  return <button className={styles.primary}>Save</button>;   // works in Server Components
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the difference between the /public folder and imported assets in Next.js?",
    answer: `**TL;DR.** Files in <code>/public</code> are served **as-is** from the root URL (e.g. <code>/logo.png</code>) with **no processing** — good for <code>robots.txt</code>, favicons. **Imported assets** (<code>import img from './a.png'</code>) go through the **build pipeline**, get **hashed filenames** and optimization, and enable <code>next/image</code> features.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='public served raw versus imported assets processed by the build'>
  <rect class='d-box-muted' x='20' y='30' width='200' height='100' rx='10'/><text class='d-text' x='120' y='54' text-anchor='middle'>/public</text><text class='d-sub' x='120' y='78' text-anchor='middle'>served raw at /file</text><text class='d-sub' x='120' y='98' text-anchor='middle'>no hashing/optimization</text><text class='d-sub' x='120' y='118' text-anchor='middle'>robots, favicon</text>
  <rect class='d-box-accent' x='240' y='30' width='200' height='100' rx='10'/><text class='d-text' x='340' y='54' text-anchor='middle'>imported asset</text><text class='d-sub' x='340' y='78' text-anchor='middle'>hashed + optimized</text><text class='d-sub' x='340' y='98' text-anchor='middle'>next/image support</text><text class='d-sub' x='340' y='118' text-anchor='middle'>cache-busted</text>
</svg>

**How it works.** The <code>public/</code> directory is a **static file root**: whatever you put there is served verbatim at the corresponding path (<code>public/logo.png</code> → <code>/logo.png</code>), with no transformation. It's the right place for files that need a **stable, known URL** or that tools expect at root — <code>robots.txt</code>, <code>sitemap</code> fallbacks, favicons, verification files, PWA manifests. **Imported** assets are processed by the bundler: they get **content-hashed filenames** (so browsers cache aggressively and you get automatic **cache-busting** on change), can be **optimized**, and importing an image yields metadata (width/height) that <code>next/image</code> uses for zero-CLS layout. Rule of thumb: **import** images/assets your components render (to get optimization + hashing), and use <code>/public</code> only for files needing a **fixed public URL** or served outside the component tree.

### public vs imported
| | /public | imported |
| --- | --- | --- |
| URL | fixed (<code>/file</code>) | hashed |
| Processing | none | bundled/optimized |
| Cache-busting | manual | automatic |
| Use for | robots/favicon | component images |

> **Interview tip:** <code>/public</code> = **raw, fixed URL, no processing** (robots/favicon); **imports** = **hashed + optimized + <code>next/image</code>-ready** with automatic cache-busting. Prefer imports for component assets.`,
    examples: [
      {
        label: "Both approaches",
        tech: "tsx",
        runnable: false,
        code: `// /public — fixed URL, served raw
<link rel="icon" href="/favicon.ico" />;

// imported — hashed, optimized, gives dimensions to next/image
import hero from './hero.png';
import Image from 'next/image';
<Image src={hero} alt="Hero" placeholder="blur" />;`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you analyze and reduce bundle size in Next.js?",
    answer: `**TL;DR.** Use <code>@next/bundle-analyzer</code> to **visualize** bundles, then shrink them: keep components as **Server Components** (zero client JS), **lazy-load** heavy client code with <code>next/dynamic</code>, avoid large deps/**barrel imports**, and move logic **server-side**. Check the **build output's** per-route JS sizes.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Analyze then reduce: server components, dynamic import, lighter deps'>
  <rect class='d-box-accent' x='20' y='52' width='120' height='46' rx='8'/><text class='d-text' x='80' y='73' text-anchor='middle'>analyze</text><text class='d-sub' x='80' y='90' text-anchor='middle'>bundle-analyzer</text>
  <path class='d-edge-accent' d='M142 75 H200' marker-end='url(#ng4)'/>
  <rect class='d-box' x='202' y='45' width='150' height='60' rx='8'/><text class='d-text' x='277' y='70' text-anchor='middle'>reduce</text><text class='d-sub' x='277' y='88' text-anchor='middle'>RSC + dynamic + lighter deps</text>
  <path class='d-edge-accent' d='M354 75 H402' marker-end='url(#ng4)'/>
  <rect class='d-box-muted' x='404' y='52' width='46' height='46' rx='8'/><text class='d-sub' x='427' y='79' text-anchor='middle'>smaller</text>
  <defs><marker id='ng4' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** First **measure**: wrap your config with <code>@next/bundle-analyzer</code> to get a treemap of what's in each chunk, and read <code>next build</code>'s per-route **First Load JS** sizes to spot heavy routes. Then **reduce**: the biggest lever in the App Router is keeping components as **Server Components** so their code (and dependencies like date/markdown libs) never ships to the client; **isolate** interactivity into small Client leaves. **Lazy-load** heavy client components with <code>next/dynamic</code> (charts, editors). Cut dependency weight — prefer lighter libraries, import **specific** functions (avoid **barrel** <code>index</code> re-exports that pull everything; use <code>optimizePackageImports</code> or deep imports), and drop moment.js-style giants. Move computation/formatting **server-side**. Re-measure after each change. Smaller First Load JS improves TTI/LCP, especially on mobile.

### Reduce bundle size
| Technique | Effect |
| --- | --- |
| Server Components | 0 client JS for them |
| <code>next/dynamic</code> | defer heavy client code |
| lighter deps / deep imports | avoid barrel bloat |
| move logic server-side | less shipped code |

> **Interview tip:** Lead with **measure (bundle-analyzer + build output)**, then the top lever in App Router: **keep code in Server Components**. Mention **barrel-import** bloat and <code>next/dynamic</code> for heavy client components.`,
    examples: [
      {
        label: "Enable the analyzer + avoid barrel imports",
        tech: "tsx",
        runnable: false,
        code: `// next.config.js
const withAnalyzer = require('@next/bundle-analyzer')({ enabled: process.env.ANALYZE === 'true' });
module.exports = withAnalyzer({ /* ... */ });
// run:  ANALYZE=true next build

// ❌ pulls the whole library
import { debounce } from 'lodash';
// ✅ imports only what you need
import debounce from 'lodash/debounce';`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is prefetching in Next.js and how does next/link prefetch routes?",
    answer: `**TL;DR.** <code>next/link</code> **prefetches** the linked route's JS and (for static routes) data when the link is **visible/hovered**, so navigation feels **instant**. Prefetch can be disabled with <code>prefetch={false}</code>; in **dev** it's off. It populates the client **Router Cache** ahead of time.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Link in viewport triggers background prefetch into the router cache'>
  <rect class='d-box-accent' x='20' y='52' width='130' height='46' rx='8'/><text class='d-text' x='85' y='73' text-anchor='middle'>&lt;Link&gt; visible</text><text class='d-sub' x='85' y='90' text-anchor='middle'>in viewport</text>
  <path class='d-edge-dashed' d='M152 75 H210' marker-end='url(#ng5)'/>
  <text class='d-sub' x='181' y='66' text-anchor='middle'>prefetch bg</text>
  <rect class='d-box' x='212' y='52' width='140' height='46' rx='8'/><text class='d-text' x='282' y='73' text-anchor='middle'>Router Cache</text><text class='d-sub' x='282' y='90' text-anchor='middle'>route ready</text>
  <path class='d-edge-accent' d='M354 75 H402' marker-end='url(#ng5)'/>
  <rect class='d-box-muted' x='404' y='52' width='46' height='46' rx='8'/><text class='d-sub' x='427' y='79' text-anchor='middle'>instant</text>
  <defs><marker id='ng5' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** Prefetching loads a route's resources **before** the user clicks so the eventual navigation is near-instant. In **production**, <code>&lt;Link&gt;</code> automatically prefetches when it **enters the viewport** (or on hover): it fetches the route's JS chunks and, for **statically-rendered** routes, the RSC data, storing them in the client **Router Cache**. Dynamic routes prefetch the shared layout/loading state rather than the full dynamic data. You control it with the <code>prefetch</code> prop (<code>false</code> to disable for rarely-clicked or numerous links, saving bandwidth; the default is automatic). Prefetching is **disabled in development** (so don't judge it via <code>next dev</code>). You can also prefetch programmatically with <code>router.prefetch()</code>. It's a big part of why Next feels fast — but be mindful of prefetching **hundreds** of links (bandwidth), where <code>prefetch={false}</code> helps.

### Prefetch behavior
| Aspect | Detail |
| --- | --- |
| Trigger | link in viewport / hover |
| Fetches | route JS + (static) data |
| Stored in | client Router Cache |
| Control | <code>prefetch={false}</code>, dev-off |

> **Interview tip:** Explain it prefetches **on viewport entry in production** into the **Router Cache** for instant nav, is **off in dev**, and that <code>prefetch={false}</code> avoids over-prefetching long link lists.`,
    examples: [
      {
        label: "Default vs disabled prefetch",
        tech: "tsx",
        runnable: false,
        code: `import Link from 'next/link';

// default: prefetched when visible (production) → instant navigation
<Link href="/dashboard">Dashboard</Link>;

// long list / rarely clicked → skip prefetch to save bandwidth
{items.map((i) => <Link key={i.id} href={\`/item/\${i.id}\`} prefetch={false}>{i.name}</Link>)}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do environment variables work in Next.js (the NEXT_PUBLIC_ prefix)?",
    answer: `**TL;DR.** Variables in <code>.env</code> are available on the **server** via <code>process.env</code>. **Only** those prefixed <code>NEXT_PUBLIC_</code> are **inlined into the client bundle** and exposed to the browser — so **never prefix secrets**. Next.js loads <code>.env.local</code>/<code>.env.production</code> etc. by convention.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Only NEXT_PUBLIC vars reach the browser; others stay server-only'>
  <rect class='d-box-muted' x='20' y='30' width='200' height='100' rx='10'/><text class='d-text' x='120' y='54' text-anchor='middle'>server-only</text><text class='d-sub' x='120' y='78' text-anchor='middle'>DATABASE_URL, API_KEY</text><text class='d-sub' x='120' y='98' text-anchor='middle'>process.env (server)</text><text class='d-sub' x='120' y='118' text-anchor='middle'>never sent to browser</text>
  <rect class='d-box-accent' x='240' y='30' width='200' height='100' rx='10'/><text class='d-text' x='340' y='54' text-anchor='middle'>NEXT_PUBLIC_*</text><text class='d-sub' x='340' y='78' text-anchor='middle'>inlined at build</text><text class='d-sub' x='340' y='98' text-anchor='middle'>visible in browser</text><text class='d-sub' x='340' y='118' text-anchor='middle'>NEVER put secrets here</text>
</svg>

**How it works.** Next.js reads <code>.env</code> files by convention (<code>.env</code>, <code>.env.local</code> for local overrides, <code>.env.development</code>/<code>.env.production</code> per NODE_ENV), exposing them via <code>process.env</code> in **server** code (Server Components, Route Handlers, Server Actions, config). Because client code runs in the **browser**, it can't read server env at runtime — so Next.js **inlines** any variable prefixed <code>NEXT_PUBLIC_</code> into the client bundle **at build time**. This means: (1) put only **non-secret**, public config (a public API base URL, analytics id) behind <code>NEXT_PUBLIC_</code> — anything there is **visible to users**; (2) keep secrets **unprefixed** and access them only server-side; (3) since public vars are **build-time inlined**, changing one requires a **rebuild**. Add <code>.env*.local</code> to <code>.gitignore</code> and provide a <code>.env.example</code>.

### Env var exposure
| Var | Where readable |
| --- | --- |
| unprefixed | server only |
| <code>NEXT_PUBLIC_*</code> | server + browser (inlined) |
| secrets | must stay unprefixed |
| public vars | rebuild to change |

> **Interview tip:** The critical rule: **<code>NEXT_PUBLIC_</code> is bundled into the browser** — never put secrets there. Server-only vars stay in <code>process.env</code> server-side; public vars are **build-time inlined**.`,
    examples: [
      {
        label: "Server secret vs public var",
        tech: "tsx",
        runnable: false,
        code: `// .env.local
DATABASE_URL=postgres://...          # server-only (secret)
NEXT_PUBLIC_API_URL=https://api.example.com   # inlined into the browser

// server (Server Component / Route Handler)
const db = connect(process.env.DATABASE_URL);      // ✅ secret stays server-side

// client component
'use client';
fetch(process.env.NEXT_PUBLIC_API_URL + '/ping');  // ✅ public var, visible to users`,
      },
    ],
  },
];

export default augments;
