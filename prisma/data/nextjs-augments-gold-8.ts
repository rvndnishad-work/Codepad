/**
 * Next.js Phase — Batch 8 (Data fetching, config, deploy, migration, advanced).
 * Final batch. See nextjs-augments-gold-1.ts for conventions.
 */
import type { NextAugment } from "./nextjs-augments.types";

const augments: NextAugment[] = [
  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you fetch data in Next.js Server Components?",
    answer: `**TL;DR.** Server Components can be **async** and <code>await</code> data **directly** — call <code>fetch()</code> (which integrates with Next.js caching) or query your **database/ORM** straight in the component. No <code>getServerSideProps</code> needed, and the data **never ships** to the client.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Async Server Component awaits data directly and renders'>
  <rect class='d-box-accent' x='20' y='45' width='170' height='60' rx='8'/><text class='d-text' x='105' y='70' text-anchor='middle'>async component</text><text class='d-sub' x='105' y='88' text-anchor='middle'>await fetch/db</text>
  <path class='d-edge-accent' d='M192 75 H250' marker-end='url(#nh1)'/>
  <rect class='d-box' x='252' y='40' width='190' height='70' rx='8'/><text class='d-text' x='347' y='66' text-anchor='middle'>rendered HTML</text><text class='d-sub' x='347' y='84' text-anchor='middle'>data stays server-side</text>
  <defs><marker id='nh1' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** In the App Router, a Server Component (the default) can be an <code>async function</code>, so you simply <code>await</code> your data where you render it — colocated, no special data-fetching export. Two paths: <code>fetch()</code>, which Next.js augments with **caching** (<code>cache</code>/<code>revalidate</code>/<code>tags</code>) and **request memoization** (dedup within a render); or **direct DB/ORM** access (Prisma, Drizzle), which is safe because the code runs only on the server — wrap those in React <code>cache()</code> to dedupe. Because it renders on the server, the raw data and query code **stay server-side** (smaller bundles, no leaked secrets). Fetch **in parallel** with <code>Promise.all</code> to avoid waterfalls, and use <code>&lt;Suspense&gt;</code>/<code>loading.js</code> so slow data streams without blocking. Reach for **client** fetching (SWR) only for interactive/live data.

### Server-side fetching
| Approach | Notes |
| --- | --- |
| <code>await fetch()</code> | cached + memoized |
| direct DB/ORM | server-only, wrap in <code>cache()</code> |
| <code>Promise.all</code> | avoid waterfalls |
| <code>&lt;Suspense&gt;</code> | stream slow data |

> **Interview tip:** Emphasize **async components fetching inline** (no <code>getServerSideProps</code>), that data/secrets **stay server-side**, and to parallelize with <code>Promise.all</code> to avoid waterfalls.`,
    examples: [
      {
        label: "Parallel fetches in a Server Component",
        tech: "tsx",
        runnable: false,
        code: `// app/dashboard/page.tsx — Server Component
export default async function Dashboard() {
  // parallel, not sequential → no waterfall
  const [user, orders] = await Promise.all([
    fetch('https://api/user', { next: { revalidate: 60 } }).then(r => r.json()),
    db.order.findMany(),            // direct DB access, server-only
  ]);
  return <><Profile user={user} /><Orders orders={orders} /></>;
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the difference between build-time and runtime environment variables in Next.js?",
    answer: `**TL;DR.** <code>NEXT_PUBLIC_</code> vars are **inlined at build time**, so changing them requires a **rebuild**. Server-only vars read from <code>process.env</code> at **runtime** can change per environment **without rebuilding** (for dynamically-rendered code). This matters for **Docker images promoted across environments**.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Build-time inlined public vars versus runtime server vars'>
  <rect class='d-box-muted' x='20' y='30' width='200' height='100' rx='10'/><text class='d-text' x='120' y='54' text-anchor='middle'>build-time</text><text class='d-sub' x='120' y='78' text-anchor='middle'>NEXT_PUBLIC_* inlined</text><text class='d-sub' x='120' y='98' text-anchor='middle'>baked into bundle</text><text class='d-sub' x='120' y='118' text-anchor='middle'>change → rebuild</text>
  <rect class='d-box-accent' x='240' y='30' width='200' height='100' rx='10'/><text class='d-text' x='340' y='54' text-anchor='middle'>runtime</text><text class='d-sub' x='340' y='78' text-anchor='middle'>server process.env</text><text class='d-sub' x='340' y='98' text-anchor='middle'>read per request</text><text class='d-sub' x='340' y='118' text-anchor='middle'>change → no rebuild</text>
</svg>

**How it works.** Client code can't read the server's environment, so Next.js **replaces** <code>process.env.NEXT_PUBLIC_X</code> with the literal value during the **build** — those values are **frozen into the JS bundle**. Consequence: to change a public var you must **rebuild** (and thus you can't build one Docker image and promote it to staging/prod with different public values). **Server-only** vars are different: **dynamically-rendered** server code reads <code>process.env</code> at **runtime**, so the same build reads whatever the environment provides at start — enabling **build once, run anywhere**. Caveats: values used during **static generation** are captured at build regardless; and to make a public value truly runtime-configurable you either rebuild per environment, pass it via a server component/prop, or use a runtime-config pattern. Design-wise: keep environment-specific/secret config **server-side** and runtime-read; reserve <code>NEXT_PUBLIC_</code> for stable public values.

### Build-time vs runtime
| | Build-time | Runtime |
| --- | --- | --- |
| Vars | <code>NEXT_PUBLIC_*</code> | server-only |
| Read | inlined at build | per request |
| Change needs | rebuild | restart only |
| Docker promote | ❌ per-env build | ✅ one image |

> **Interview tip:** The practical point: **public vars are baked in at build (rebuild to change)**, server vars are **runtime** (promote one image across envs). Static generation also captures values at build.`,
    examples: [
      {
        label: "Runtime server var vs build-time public var",
        tech: "tsx",
        runnable: false,
        code: `// Runtime (server, dynamic route) — same build, different envs:
export const dynamic = 'force-dynamic';
export default async function Page() {
  const region = process.env.REGION;        // read at runtime
  return <p>{region}</p>;
}

// Build-time (client) — inlined; rebuild to change:
// <span>{process.env.NEXT_PUBLIC_VERSION}</span>`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the difference between getServerSideProps/getStaticProps and App Router data fetching?",
    answer: `**TL;DR.** In the **Pages Router**, <code>getStaticProps</code> (build-time) and <code>getServerSideProps</code> (per-request) fetch data and **pass props** to a page. The **App Router** replaces both with **async Server Components** that fetch **directly**, using <code>fetch</code> caching/<code>revalidate</code> to choose static vs dynamic per call — more **granular and colocated**.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Pages data functions versus App Router inline fetching'>
  <rect class='d-box-muted' x='20' y='30' width='200' height='100' rx='10'/><text class='d-text' x='120' y='54' text-anchor='middle'>Pages Router</text><text class='d-sub' x='120' y='78' text-anchor='middle'>getStaticProps (build)</text><text class='d-sub' x='120' y='98' text-anchor='middle'>getServerSideProps (req)</text><text class='d-sub' x='120' y='118' text-anchor='middle'>→ props to page</text>
  <rect class='d-box-accent' x='240' y='30' width='200' height='100' rx='10'/><text class='d-text' x='340' y='54' text-anchor='middle'>App Router</text><text class='d-sub' x='340' y='78' text-anchor='middle'>async Server Component</text><text class='d-sub' x='340' y='98' text-anchor='middle'>fetch + revalidate</text><text class='d-sub' x='340' y='118' text-anchor='middle'>per-fetch static/dynamic</text>
</svg>

**How it works.** The Pages Router bound data fetching to the **page level** via two exported functions: <code>getStaticProps</code> ran at **build** (SSG, optionally with <code>revalidate</code> for ISR and <code>getStaticPaths</code> for dynamic routes), and <code>getServerSideProps</code> ran on **every request** (SSR) — both returned <code>props</code> for the page component. The App Router **removes** these: any Server Component can fetch inline, and **caching semantics on the fetch itself** decide the mode — cached/<code>revalidate</code> = static/ISR, <code>no-store</code> = dynamic. So instead of one page-level choice, you get **per-data-source** control, **colocated** fetching in nested components, automatic **deduping**, and **streaming** via Suspense. The mapping: <code>getStaticProps</code> → cached fetch (+ <code>generateStaticParams</code> for <code>getStaticPaths</code>); <code>getServerSideProps</code> → <code>fetch(..., { cache: 'no-store' })</code> or a dynamic function.

### Mapping old → new
| Pages Router | App Router |
| --- | --- |
| <code>getStaticProps</code> | cached fetch / <code>revalidate</code> |
| <code>getStaticPaths</code> | <code>generateStaticParams</code> |
| <code>getServerSideProps</code> | <code>fetch(no-store)</code> / dynamic fn |
| page-level props | colocated inline fetch |

> **Interview tip:** Frame it as **page-level data functions → per-fetch caching in async Server Components**. Give the mappings (getStaticProps→cached fetch, getServerSideProps→no-store, getStaticPaths→generateStaticParams).`,
    examples: [
      {
        label: "SSR page, both routers",
        tech: "tsx",
        runnable: false,
        code: `// Pages Router
export async function getServerSideProps() {
  return { props: { data: await getData() } };
}
export default function Page({ data }) { /* ... */ }

// App Router — inline, dynamic via no-store
export default async function Page() {
  const data = await fetch('https://api/data', { cache: 'no-store' }).then(r => r.json());
  return /* ... */;
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is next.config.js in Next.js and what are common configurations?",
    answer: `**TL;DR.** <code>next.config.js</code> (or <code>.ts</code>/<code>.mjs</code>) configures the build and runtime: <code>redirects()</code>, <code>rewrites()</code>, <code>headers()</code>, <code>images</code> (remote patterns/loaders), <code>output</code> mode, experimental flags, <code>env</code>, <code>transpilePackages</code>, and webpack/turbopack tweaks. It's evaluated at **build/start**, not per request.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='next.config.js central configuration areas'>
  <rect class='d-box-accent' x='160' y='55' width='140' height='40' rx='8'/><text class='d-text' x='230' y='79' text-anchor='middle'>next.config</text>
  <path class='d-edge-accent' d='M200 55 L110 32' marker-end='url(#nh2)'/>
  <path class='d-edge-accent' d='M260 55 L350 32' marker-end='url(#nh2)'/>
  <path class='d-edge-accent' d='M200 95 L110 118' marker-end='url(#nh2)'/>
  <path class='d-edge-accent' d='M260 95 L350 118' marker-end='url(#nh2)'/>
  <rect class='d-box-muted' x='20' y='16' width='95' height='26' rx='6'/><text class='d-sub' x='67' y='34' text-anchor='middle'>redirects</text>
  <rect class='d-box-muted' x='345' y='16' width='105' height='26' rx='6'/><text class='d-sub' x='397' y='34' text-anchor='middle'>images</text>
  <rect class='d-box-muted' x='20' y='108' width='95' height='26' rx='6'/><text class='d-sub' x='67' y='126' text-anchor='middle'>headers</text>
  <rect class='d-box-muted' x='345' y='108' width='105' height='26' rx='6'/><text class='d-sub' x='397' y='126' text-anchor='middle'>output</text>
  <defs><marker id='nh2' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** It's a config object (or function) Next.js reads when you **build or start** — not on each request — so values here are static configuration, not dynamic logic. Common sections: async <code>redirects()</code>/<code>rewrites()</code> (URL mapping/proxying), <code>headers()</code> (security/cache headers per path), <code>images</code> (<code>remotePatterns</code> to allow external hosts, custom loaders, formats), <code>output</code> (<code>'standalone'</code> for slim Docker, <code>'export'</code> for static export), <code>experimental</code> (opt into features like PPR, <code>staleTimes</code>, <code>optimizePackageImports</code>), <code>transpilePackages</code> (compile specific node_modules), <code>basePath</code>/<code>assetPrefix</code>, and <code>webpack</code>/Turbopack customization. Use the <code>NextConfig</code> type for autocomplete. Because it runs in Node at build time, you can compute config, but keep it deterministic. Wrap it with plugins (e.g. bundle-analyzer, next-intl) as needed.

### Common config
| Key | Purpose |
| --- | --- |
| <code>redirects/rewrites/headers</code> | URL + header rules |
| <code>images</code> | remote hosts, loaders, formats |
| <code>output</code> | <code>standalone</code> / <code>export</code> |
| <code>experimental</code> / <code>transpilePackages</code> | flags / compile deps |

> **Interview tip:** Note it's evaluated at **build/start (not per request)**, and name the high-value keys: **redirects/rewrites/headers, images.remotePatterns, output:'standalone', experimental flags**.`,
    examples: [
      {
        label: "A typical next.config",
        tech: "tsx",
        runnable: false,
        code: `// next.config.ts
import type { NextConfig } from 'next';
const config: NextConfig = {
  output: 'standalone',
  images: { remotePatterns: [{ protocol: 'https', hostname: 'cdn.example.com' }] },
  async redirects() { return [{ source: '/old', destination: '/new', permanent: true }]; },
  async headers() { return [{ source: '/(.*)', headers: [{ key: 'X-Frame-Options', value: 'DENY' }] }]; },
  experimental: { optimizePackageImports: ['lodash'] },
};
export default config;`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you handle redirects and rewrites in Next.js?",
    answer: `**TL;DR.** Define **static** <code>redirects()</code>/<code>rewrites()</code> in <code>next.config.js</code> (a **redirect** changes the URL; a **rewrite** proxies internally while keeping the URL). For **dynamic/conditional** cases use **middleware** (<code>NextResponse.redirect/rewrite</code>) or call <code>redirect()</code> inside Server Components/Actions.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Redirect changes URL; rewrite keeps URL but serves other content'>
  <rect class='d-box-muted' x='20' y='30' width='200' height='100' rx='10'/><text class='d-text' x='120' y='54' text-anchor='middle'>redirect</text><text class='d-sub' x='120' y='78' text-anchor='middle'>/old → /new</text><text class='d-sub' x='120' y='98' text-anchor='middle'>URL changes (301/308)</text><text class='d-sub' x='120' y='118' text-anchor='middle'>browser navigates</text>
  <rect class='d-box-accent' x='240' y='30' width='200' height='100' rx='10'/><text class='d-text' x='340' y='54' text-anchor='middle'>rewrite</text><text class='d-sub' x='340' y='78' text-anchor='middle'>/a serves /internal</text><text class='d-sub' x='340' y='98' text-anchor='middle'>URL stays /a</text><text class='d-sub' x='340' y='118' text-anchor='middle'>proxy / mask</text>
</svg>

**How it works.** A **redirect** tells the browser to go to a **new URL** (with a 3xx status — permanent 308 or temporary 307), so the address bar changes; use it for moved pages, enforcing canonical URLs, or auth gating. A **rewrite** maps an incoming path to a **different destination internally** while the **URL stays the same** — useful for proxying an API, masking a backend, incremental migration, or serving localized content. For **static** rules known at build, put them in <code>next.config.js</code>'s async <code>redirects()</code>/<code>rewrites()</code> (support path params, wildcards, and header/cookie/query conditions via <code>has</code>). For **dynamic** decisions (based on auth, geo, A/B, feature flags) use **middleware** with <code>NextResponse.redirect()</code>/<code>rewrite()</code> at the edge, or — within rendering — call <code>redirect()</code>/<code>permanentRedirect()</code> from <code>next/navigation</code> in a Server Component or Server Action. Order and specificity matter in config.

### Where to redirect/rewrite
| Case | Mechanism |
| --- | --- |
| static, known rules | <code>next.config</code> redirects/rewrites |
| conditional (auth/geo/AB) | middleware |
| after a mutation / in render | <code>redirect()</code> (next/navigation) |
| redirect vs rewrite | URL changes vs stays |

> **Interview tip:** Nail the distinction — **redirect changes the URL (3xx), rewrite keeps it (proxy)** — and match the mechanism to need: **config** (static), **middleware** (conditional/edge), <code>redirect()</code> (in render/actions).`,
    examples: [
      {
        label: "Config rules + conditional middleware",
        tech: "tsx",
        runnable: false,
        code: `// next.config.js — static
async redirects() { return [{ source: '/blog/:slug', destination: '/posts/:slug', permanent: true }]; }
async rewrites() { return [{ source: '/api/:p*', destination: 'https://backend/:p*' }]; }  // proxy

// middleware.ts — conditional
import { NextResponse } from 'next/server';
export function middleware(req) {
  if (req.geo?.country === 'FR') return NextResponse.rewrite(new URL('/fr', req.url));
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you internationalize (i18n) a Next.js App Router app?",
    answer: `**TL;DR.** The App Router has **no built-in i18n routing** (unlike Pages), so you use a <code>[lang]</code> dynamic segment plus **middleware** to detect/redirect by locale, and a library (**next-intl**, next-i18next) to load translations. <code>generateStaticParams</code> pre-renders each locale; **metadata** is localized per route.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Middleware detects locale, [lang] segment scopes translated routes'>
  <rect class='d-box-accent' x='20' y='52' width='120' height='46' rx='8'/><text class='d-text' x='80' y='73' text-anchor='middle'>middleware</text><text class='d-sub' x='80' y='90' text-anchor='middle'>detect locale</text>
  <path class='d-edge-accent' d='M142 75 H200' marker-end='url(#nh3)'/>
  <rect class='d-box' x='202' y='52' width='120' height='46' rx='8'/><text class='d-text' x='262' y='73' text-anchor='middle'>/[lang]/…</text><text class='d-sub' x='262' y='90' text-anchor='middle'>/en, /fr</text>
  <path class='d-edge-accent' d='M324 75 H382' marker-end='url(#nh3)'/>
  <rect class='d-box-muted' x='384' y='52' width='66' height='46' rx='8'/><text class='d-sub' x='417' y='79' text-anchor='middle'>t('key')</text>
  <defs><marker id='nh3' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** The Pages Router had native <code>i18n</code> locale routing in config; the **App Router does not**, so you implement it. The common pattern: a top-level dynamic segment <code>app/[lang]/...</code> so every route is locale-scoped (<code>/en/about</code>, <code>/fr/about</code>), plus **middleware** that reads the <code>Accept-Language</code> header (and/or a cookie) to **detect** the preferred locale and **redirect** <code>/</code> to <code>/en</code>. Translations come from a library — **next-intl** is the popular App-Router-native choice — which provides message loading, a <code>t()</code> function, and formatting (dates/numbers/plurals via ICU) usable in Server Components. You <code>generateStaticParams</code> to statically render all locales, localize **metadata** via <code>generateMetadata</code>, set the <code>&lt;html lang&gt;</code>, and add <code>hreflang</code> alternates for SEO. Keep translation catalogs per locale and lazy-load them.

### i18n building blocks
| Piece | Role |
| --- | --- |
| <code>[lang]</code> segment | locale-scoped routes |
| middleware | detect + redirect locale |
| next-intl (etc.) | messages + formatting |
| <code>generateStaticParams</code>/metadata | prerender + localized SEO |

> **Interview tip:** The key fact: **App Router has no built-in i18n routing** — you build it with a <code>[lang]</code> segment + middleware + a library (next-intl). Mention localized **metadata** and <code>hreflang</code> for SEO.`,
    examples: [
      {
        label: "Locale segment + static params",
        tech: "tsx",
        runnable: false,
        code: `// app/[lang]/layout.tsx
export function generateStaticParams() {
  return [{ lang: 'en' }, { lang: 'fr' }, { lang: 'de' }];   // prerender each locale
}
export default async function Layout({ children, params }) {
  const { lang } = await params;
  return <html lang={lang}>{children}</html>;
}
// middleware redirects '/' → '/en' based on Accept-Language.`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you migrate from the Pages Router to the App Router in Next.js?",
    answer: `**TL;DR.** <code>app/</code> and <code>pages/</code> **coexist**, so migrate **incrementally**: move routes into <code>app/</code> one at a time, convert data functions to **async Server Components**, replace <code>_app</code>/<code>_document</code> with a **root layout**, swap <code>getServerSideProps</code>/<code>getStaticProps</code> for <code>fetch</code>/segment config, and update <code>next/router</code> → <code>next/navigation</code>.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Pages and App routers coexist during incremental migration'>
  <rect class='d-box-muted' x='20' y='45' width='170' height='60' rx='8'/><text class='d-text' x='105' y='70' text-anchor='middle'>pages/ (legacy)</text><text class='d-sub' x='105' y='88' text-anchor='middle'>still works</text>
  <path class='d-edge-dashed' d='M192 75 H250' marker-end='url(#nh4)'/>
  <text class='d-sub' x='221' y='66' text-anchor='middle'>route by route</text>
  <rect class='d-box-accent' x='252' y='45' width='190' height='60' rx='8'/><text class='d-text' x='347' y='70' text-anchor='middle'>app/ (new)</text><text class='d-sub' x='347' y='88' text-anchor='middle'>Server Components</text>
  <defs><marker id='nh4' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** Because both routers run in the same app (a route in <code>app/</code> takes precedence over the same path in <code>pages/</code>), you don't need a big-bang rewrite. Steps: (1) add <code>app/layout.tsx</code> as the **root layout** (replaces <code>_app</code>/<code>_document</code>: html/body, global CSS, providers). (2) Move pages **one at a time** into <code>app/.../page.tsx</code>. (3) Convert data: <code>getStaticProps</code> → **cached fetch**/<code>revalidate</code>, <code>getStaticPaths</code> → <code>generateStaticParams</code>, <code>getServerSideProps</code> → inline fetch with <code>no-store</code> or a dynamic function. (4) Mark interactive components <code>'use client'</code> and keep the rest as Server Components. (5) Replace <code>useRouter</code> from <code>next/router</code> with <code>next/navigation</code> (<code>useRouter</code>/<code>usePathname</code>/<code>useSearchParams</code>), and <code>&lt;Head&gt;</code> with the **Metadata API**. (6) Migrate <code>pages/api</code> to **Route Handlers**. Test each route, then delete the old one. Providers/global state that need the client get a <code>'use client'</code> wrapper in the root layout.

### Migration mapping
| Pages | App Router |
| --- | --- |
| <code>_app</code>/<code>_document</code> | root <code>layout.tsx</code> |
| <code>getStaticProps</code>/<code>Paths</code> | fetch cache / <code>generateStaticParams</code> |
| <code>getServerSideProps</code> | inline fetch (<code>no-store</code>) |
| <code>next/router</code>, <code>&lt;Head&gt;</code> | <code>next/navigation</code>, Metadata API |

> **Interview tip:** Stress **incremental (coexistence)** migration and give the concrete mappings (data functions, router import, Head→Metadata, api→Route Handlers). That practicality signals real migration experience.`,
    examples: [
      {
        label: "Router import change",
        tech: "tsx",
        runnable: false,
        code: `// Pages Router
import { useRouter } from 'next/router';
const { query, push } = useRouter();

// App Router (Client Component)
'use client';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
const router = useRouter();
const params = useSearchParams();   // replaces router.query`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you deploy a Next.js app (Vercel vs self-hosted)?",
    answer: `**TL;DR.** **Vercel** offers zero-config hosting with built-in CDN, ISR, and edge functions. **Self-hosting** runs <code>next start</code> on a Node server or a **Docker** container (often <code>output: 'standalone'</code>); you then provide your own CDN, image optimizer, and revalidation infra. **Static export** works for purely static sites.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Deployment targets: Vercel, Node/Docker self-host, static export'>
  <rect class='d-box-accent' x='15' y='40' width='140' height='80' rx='10'/><text class='d-text' x='85' y='64' text-anchor='middle'>Vercel</text><text class='d-sub' x='85' y='86' text-anchor='middle'>zero-config</text><text class='d-sub' x='85' y='104' text-anchor='middle'>CDN/ISR/edge</text>
  <rect class='d-box' x='163' y='40' width='140' height='80' rx='10'/><text class='d-text' x='233' y='64' text-anchor='middle'>self-host</text><text class='d-sub' x='233' y='86' text-anchor='middle'>next start / Docker</text><text class='d-sub' x='233' y='104' text-anchor='middle'>bring your infra</text>
  <rect class='d-box-muted' x='311' y='40' width='134' height='80' rx='10'/><text class='d-text' x='378' y='64' text-anchor='middle'>static export</text><text class='d-sub' x='378' y='86' text-anchor='middle'>output: 'export'</text><text class='d-sub' x='378' y='104' text-anchor='middle'>no server</text>
</svg>

**How it works.** Next.js is made by Vercel, so **Vercel** deployment is turnkey: push to git and it builds, serves static/ISR pages from a global **CDN**, runs SSR/Route Handlers as serverless/edge functions, and wires up **image optimization** and **on-demand revalidation** automatically. **Self-hosting** is fully supported: run a **Node server** with <code>next build && next start</code>, or containerize with **Docker** — typically using <code>output: 'standalone'</code> for a slim image. When self-hosting you own the pieces Vercel provides: a **CDN/reverse proxy** in front, an **image optimizer** (built-in works but is CPU-heavy; or a custom loader/CDN), a shared **cache** for ISR across instances, and process management/scaling (Kubernetes/PM2). For sites with **no server needs** (all static, no ISR/SSR/API), <code>output: 'export'</code> produces plain HTML you host on any static host/CDN — but you lose SSR, ISR, image optimization, and Route Handlers. Choose based on features needed vs. ops control/cost.

### Deployment options
| Target | Trade-off |
| --- | --- |
| Vercel | zero-config, managed, CDN/ISR |
| Node/Docker self-host | full control, you run infra |
| <code>output: 'standalone'</code> | slim container image |
| <code>output: 'export'</code> | static only, no SSR/ISR/API |

> **Interview tip:** Contrast **managed (Vercel, batteries included)** vs **self-host (you provide CDN/image/ISR cache/scaling)**, note <code>standalone</code> for Docker, and that **static export drops SSR/ISR/image/Route Handlers**.`,
    examples: [
      {
        label: "Self-host build + start",
        tech: "bash",
        runnable: false,
        code: `# Node server
next build && next start -p 3000

# Docker (slim): next.config → output: 'standalone'
# then copy .next/standalone + .next/static + public into the image and:
node server.js

# Fully static (no SSR/ISR/API): output: 'export' → serve the 'out/' dir on any CDN`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the output: 'standalone' build in Next.js and when do you use it?",
    answer: `**TL;DR.** <code>output: 'standalone'</code> produces a **minimal folder** with the server and **only the <code>node_modules</code> it needs**, so Docker images are **small** and don't require installing all dependencies. Use it for **self-hosted/containerized** deployments to cut image size and cold starts.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Standalone output traces only required files into a slim server bundle'>
  <rect class='d-box-muted' x='20' y='45' width='170' height='60' rx='8'/><text class='d-text' x='105' y='70' text-anchor='middle'>full app + deps</text><text class='d-sub' x='105' y='88' text-anchor='middle'>large</text>
  <path class='d-edge-accent' d='M192 75 H250' marker-end='url(#nh5)'/>
  <text class='d-sub' x='221' y='66' text-anchor='middle'>trace</text>
  <rect class='d-box-accent' x='252' y='45' width='190' height='60' rx='8'/><text class='d-text' x='347' y='70' text-anchor='middle'>standalone/</text><text class='d-sub' x='347' y='88' text-anchor='middle'>server + only needed deps</text>
  <defs><marker id='nh5' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** By default a self-hosted Next.js app needs its whole <code>node_modules</code> at runtime, bloating Docker images. With <code>output: 'standalone'</code>, the build **traces** exactly which files and dependencies the server actually uses (via <code>@vercel/nft</code>) and emits a self-contained <code>.next/standalone</code> directory containing a minimal <code>server.js</code> and just those files. You build a Docker image by copying <code>.next/standalone</code>, plus <code>.next/static</code> and <code>public/</code> (which standalone doesn't include), then run <code>node server.js</code> — no <code>npm install</code> in the runtime image. The result is a **much smaller image** and faster startup, ideal for Kubernetes/containers and multi-stage Dockerfiles. Caveats: you must copy <code>static</code>/<code>public</code> yourself, and you still provide a **CDN** and (if using it) the **image optimizer** and shared **ISR cache**. It doesn't apply to Vercel (which handles packaging) or static export.

### standalone facts
| Aspect | Detail |
| --- | --- |
| Produces | minimal server + traced deps |
| Benefit | small image, fast start |
| Also copy | <code>.next/static</code>, <code>public/</code> |
| For | self-hosted containers |

> **Interview tip:** Explain it **traces only needed deps** into <code>.next/standalone</code> for tiny Docker images (no runtime <code>npm install</code>) — remembering you must **also copy <code>static</code>/<code>public</code>**. It's a self-hosting optimization.`,
    examples: [
      {
        label: "Standalone in a Dockerfile",
        tech: "bash",
        runnable: false,
        code: `# next.config.js → { output: 'standalone' }
# runtime stage:
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static   # must copy separately
COPY --from=build /app/public ./public
CMD ["node", "server.js"]      # no node_modules install needed`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you handle authentication in Next.js?",
    answer: `**TL;DR.** Authenticate (credentials/OAuth via **NextAuth/Auth.js** or your own), store a session in an **HttpOnly cookie** or JWT, gate routes in **middleware** for fast redirects, and **verify the session in Server Components/Server Actions** before data access. **Never** rely on client-only checks.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Middleware gates routes; server verifies session before data access'>
  <rect class='d-box-accent' x='20' y='52' width='120' height='46' rx='8'/><text class='d-text' x='80' y='73' text-anchor='middle'>middleware</text><text class='d-sub' x='80' y='90' text-anchor='middle'>gate/redirect</text>
  <path class='d-edge-accent' d='M142 75 H200' marker-end='url(#nh6)'/>
  <rect class='d-box' x='202' y='52' width='150' height='46' rx='8'/><text class='d-text' x='277' y='73' text-anchor='middle'>server verify</text><text class='d-sub' x='277' y='90' text-anchor='middle'>session in RSC/action</text>
  <path class='d-edge-accent' d='M354 75 H402' marker-end='url(#nh6)'/>
  <rect class='d-box-muted' x='404' y='52' width='46' height='46' rx='8'/><text class='d-sub' x='427' y='79' text-anchor='middle'>data</text>
  <defs><marker id='nh6' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** Auth has two parts: **authentication** (who) and **authorization** (what they can do). Establish identity via a provider — **Auth.js (NextAuth)** handles OAuth/credentials/email and session management with adapters; **Clerk/Lucia** are alternatives; or roll your own with password hashing + sessions. Persist the session as an **HttpOnly, Secure, SameSite** cookie (opaque id + server store) or a signed JWT. Then enforce it in layers: **middleware** for cheap **route gating**/redirects at the edge (e.g. block <code>/dashboard</code> without a session cookie) — but treat middleware as a coarse guard, not the security boundary; the **real check** happens **server-side** in Server Components, Route Handlers, and Server Actions, where you read/verify the session and **authorize** the specific action/resource before touching data. Because Server Components render on the server, you can safely gate rendering and never expose protected data to unauthorized users. Add CSRF protection for cookie flows and re-verify in every Server Action (they're public endpoints).

### Auth layers
| Layer | Role |
| --- | --- |
| provider (Auth.js) | authenticate + session |
| HttpOnly cookie/JWT | persist session |
| middleware | coarse route gating |
| Server Component/Action | verify + authorize (real check) |

> **Interview tip:** The senior point: **middleware is a fast gate, not the security boundary** — always **verify the session server-side** in RSC/Server Actions before data access, and authorize per resource. Mention Auth.js + HttpOnly cookies.`,
    examples: [
      {
        label: "Server-side session check in a page",
        tech: "tsx",
        runnable: false,
        code: `import { auth } from '@/lib/auth';       // Auth.js
import { redirect } from 'next/navigation';

export default async function Dashboard() {
  const session = await auth();               // verify on the server
  if (!session) redirect('/login');           // real gate (not just middleware)
  const data = await getUserData(session.user.id);
  return <Panel data={data} />;
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is Turbopack in Next.js and how does it compare to Webpack?",
    answer: `**TL;DR.** **Turbopack** is Next.js's **Rust-based bundler** designed to replace Webpack, offering **much faster cold starts** and **incremental updates (HMR)** via fine-grained caching. It's the **default for <code>next dev</code>** in recent versions; Webpack remains the fallback while Turbopack's production builds mature.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Turbopack Rust bundler faster than JS-based Webpack'>
  <rect class='d-box-muted' x='20' y='40' width='200' height='80' rx='10'/><text class='d-text' x='120' y='64' text-anchor='middle'>Webpack (JS)</text><text class='d-sub' x='120' y='86' text-anchor='middle'>mature, slower</text><text class='d-sub' x='120' y='104' text-anchor='middle'>large plugin ecosystem</text>
  <rect class='d-box-accent' x='240' y='40' width='200' height='80' rx='10'/><text class='d-text' x='340' y='64' text-anchor='middle'>Turbopack (Rust)</text><text class='d-sub' x='340' y='86' text-anchor='middle'>fast, incremental</text><text class='d-sub' x='340' y='104' text-anchor='middle'>default dev bundler</text>
</svg>

**How it works.** Bundlers turn your source + dependencies into optimized browser assets. Webpack (JavaScript) is powerful and battle-tested but can be **slow** on large apps, especially cold dev startup and HMR. **Turbopack** is written in **Rust** and built around an **incremental computation engine** with aggressive **caching** — it only recomputes what changed, so dev server startup and hot-reload are dramatically faster on big codebases (Next reports large improvements). It's enabled with <code>next dev --turbopack</code> (now the default in recent releases). Its architecture also supports lazy bundling (compile only the routes you visit). The trade-offs: the plugin/loader **ecosystem** is smaller than Webpack's, some custom Webpack configs aren't supported, and **production** Turbopack builds have been stabilizing (Webpack is still the fallback for full parity). For most apps you get faster local DX with Turbopack and can fall back to Webpack if a specific plugin isn't supported.

### Turbopack vs Webpack
| | Webpack | Turbopack |
| --- | --- | --- |
| Language | JavaScript | Rust |
| Speed | slower cold/HMR | much faster, incremental |
| Ecosystem | huge | growing |
| Status | fallback | default dev |

> **Interview tip:** Say it's the **Rust, incremental** successor to Webpack — big **dev startup/HMR** wins — default for <code>next dev</code>, with a **smaller plugin ecosystem** and maturing production builds.`,
    examples: [
      {
        label: "Run dev with Turbopack",
        tech: "bash",
        runnable: false,
        code: `next dev --turbopack     # faster cold start + HMR (default in recent Next)
# Fall back to Webpack if a custom loader/plugin isn't yet supported:
next dev`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you handle instrumentation and observability in Next.js (instrumentation.ts)?",
    answer: `**TL;DR.** <code>instrumentation.ts</code> exports a <code>register()</code> function that runs **once when the server starts** — the place to initialize **OpenTelemetry**, error monitoring (Sentry), or other tracing. Next.js also supports <code>onRequestError</code> and OpenTelemetry integration for **distributed tracing** across rendering and handlers.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='register() runs at startup to wire tracing and monitoring'>
  <rect class='d-box-accent' x='20' y='52' width='150' height='46' rx='8'/><text class='d-text' x='95' y='73' text-anchor='middle'>register()</text><text class='d-sub' x='95' y='90' text-anchor='middle'>at server start</text>
  <path class='d-edge-accent' d='M172 75 H230' marker-end='url(#nh7)'/>
  <rect class='d-box' x='232' y='45' width='120' height='60' rx='8'/><text class='d-text' x='292' y='70' text-anchor='middle'>OTel / Sentry</text><text class='d-sub' x='292' y='88' text-anchor='middle'>init once</text>
  <path class='d-edge-accent' d='M354 75 H402' marker-end='url(#nh7)'/>
  <rect class='d-box-muted' x='404' y='52' width='46' height='46' rx='8'/><text class='d-sub' x='427' y='79' text-anchor='middle'>traces</text>
  <defs><marker id='nh7' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** Observability needs code to run **before** the app handles traffic. Next.js provides <code>instrumentation.ts</code> at the project root exporting an async <code>register()</code> that the framework calls **once on server startup** — you initialize your **OpenTelemetry** SDK there (or Sentry, tracing, metrics exporters), so subsequent server rendering, Route Handlers, and fetches are instrumented. Next.js has **built-in OpenTelemetry** support: it emits spans for request handling and rendering, which propagate a trace context, so you can follow a request across your services in Jaeger/Datadog/etc. There's also an <code>onRequestError</code> hook (in the same file) to capture server errors with request context for your monitoring tool. Because <code>register()</code> may run in both Node and Edge runtimes, guard runtime-specific setup (check <code>process.env.NEXT_RUNTIME</code>). Combine with **structured logging** and metrics for full observability. This is how you wire tracing/error-tracking cleanly rather than hacking it into a layout.

### instrumentation.ts
| Piece | Role |
| --- | --- |
| <code>register()</code> | runs once at startup |
| init here | OTel/Sentry SDKs |
| built-in OTel | request/render spans |
| <code>onRequestError</code> | capture server errors |

> **Interview tip:** Point to <code>register()</code> as the **startup hook** for OTel/Sentry, that Next has **built-in OpenTelemetry** spans, and to guard by <code>NEXT_RUNTIME</code> since it runs on Node and Edge. Mention <code>onRequestError</code>.`,
    examples: [
      {
        label: "Initialize tracing at startup",
        tech: "tsx",
        runnable: false,
        code: `// instrumentation.ts (project root)
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { NodeSDK } = await import('@opentelemetry/sdk-node');
    new NodeSDK({ /* exporter, instrumentations */ }).start();
  }
}
// Optional: capture server errors with context
export async function onRequestError(err, request, context) {
  reportToSentry(err, { request, context });
}`,
      },
    ],
  },
];

export default augments;
