/**
 * Next.js Phase — Batch 4 (Rendering decisions & caching). See nextjs-augments-gold-1.ts.
 */
import type { NextAugment } from "./nextjs-augments.types";

const augments: NextAugment[] = [
  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How does Next.js decide between static and dynamic rendering at build time?",
    answer: `**TL;DR.** At build, Next.js **analyzes each route**: if it uses no dynamic functions and only cached data, it's **prerendered statically**; if it uses <code>cookies()</code>/<code>headers()</code>/<code>searchParams</code> or **uncached** fetches, it's marked **dynamic**. Segment config (<code>dynamic</code>) can force either mode.

<svg class='iq-diagram' viewBox='0 0 460 160' role='img' aria-label='Build-time analysis routes each page to static or dynamic'>
  <rect class='d-box-accent' x='160' y='20' width='140' height='36' rx='8'/><text class='d-text' x='230' y='43' text-anchor='middle'>build analysis</text>
  <path class='d-edge-accent' d='M200 56 L120 100' marker-end='url(#nd1)'/>
  <path class='d-edge-accent' d='M260 56 L340 100' marker-end='url(#nd1)'/>
  <rect class='d-box-muted' x='30' y='102' width='180' height='46' rx='8'/><text class='d-sub' x='120' y='122' text-anchor='middle'>no dynamic API + cached</text><text class='d-sub' x='120' y='138' text-anchor='middle'>→ STATIC</text>
  <rect class='d-box-muted' x='250' y='102' width='180' height='46' rx='8'/><text class='d-sub' x='340' y='122' text-anchor='middle'>dynamic API / no-store</text><text class='d-sub' x='340' y='138' text-anchor='middle'>→ DYNAMIC</text>
  <defs><marker id='nd1' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** During <code>next build</code>, Next.js attempts to **prerender** every route. It traces what each route uses: if it only reads **cached** data (default <code>fetch</code> caching or cached DB reads) and never touches request-time APIs, the route is fully **static** — its HTML/RSC payload is generated once and served from cache/CDN (shown as ○/● in the build output). If the trace hits a **dynamic function** (<code>cookies</code>, <code>headers</code>, <code>draftMode</code>, <code>searchParams</code>) or an **uncached** fetch, the route can't be prerendered and is marked **dynamic** (ƒ), rendered per request. You override the inference with <code>export const dynamic = 'force-static' | 'force-dynamic'</code>, or set <code>revalidate</code> for ISR (a static page that regenerates). The build log's legend tells you exactly which routes are static, dynamic, or ISR — a quick way to catch a page that accidentally went dynamic.

### Build-time verdict
| Route uses | Verdict |
| --- | --- |
| only cached data | Static (○/●) |
| <code>revalidate</code> set | ISR (regenerated) |
| dynamic fn / no-store | Dynamic (ƒ) |
| <code>force-*</code> config | overrides |

> **Interview tip:** Point to the **build output legend** (static ○ / SSG ● / dynamic ƒ) as how you verify. The rule: **static unless a dynamic function or uncached fetch is traced** — or you force it.`,
    examples: [
      {
        label: "Reading the build output",
        tech: "bash",
        runnable: false,
        code: `$ next build
Route (app)                     Size
○ /                             (Static)   prerendered as static HTML
● /blog/[slug]                  (SSG)      prerendered via generateStaticParams
ƒ /dashboard                    (Dynamic)  server-rendered on demand
# ○ Static  ● SSG  ƒ Dynamic — check this to catch accidental dynamic routes`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are the caching layers in Next.js (Request Memoization, Data Cache, Full Route Cache, Router Cache)?",
    answer: `**TL;DR.** Four overlapping caches: **Request Memoization** dedupes identical fetches within one render; the **Data Cache** persists fetch results across requests/deploys; the **Full Route Cache** stores rendered static routes; the **Router Cache** holds visited routes **client-side** for instant back/forward. Each has its own invalidation.

<svg class='iq-diagram' viewBox='0 0 460 160' role='img' aria-label='Four caching layers from per-render to client-side'>
  <rect class='d-box-accent' x='15' y='45' width='105' height='80' rx='10'/><text class='d-text' x='67' y='68' text-anchor='middle'>Request</text><text class='d-sub' x='67' y='86' text-anchor='middle'>memoization</text><text class='d-sub' x='67' y='106' text-anchor='middle'>per render</text>
  <rect class='d-box' x='128' y='45' width='105' height='80' rx='10'/><text class='d-text' x='180' y='68' text-anchor='middle'>Data Cache</text><text class='d-sub' x='180' y='86' text-anchor='middle'>fetch results</text><text class='d-sub' x='180' y='106' text-anchor='middle'>persistent</text>
  <rect class='d-box' x='241' y='45' width='105' height='80' rx='10'/><text class='d-text' x='293' y='68' text-anchor='middle'>Full Route</text><text class='d-sub' x='293' y='86' text-anchor='middle'>rendered HTML</text><text class='d-sub' x='293' y='106' text-anchor='middle'>server</text>
  <rect class='d-box-muted' x='354' y='45' width='92' height='80' rx='10'/><text class='d-text' x='400' y='68' text-anchor='middle'>Router</text><text class='d-sub' x='400' y='86' text-anchor='middle'>client cache</text><text class='d-sub' x='400' y='106' text-anchor='middle'>navigation</text>
</svg>

**How it works.** They operate at different scopes. **Request Memoization** lives for a **single server render**: identical <code>fetch()</code> calls are deduped so components can each fetch what they need without one network call each. The **Data Cache** is **persistent** (across requests and deployments): it stores <code>fetch</code> results and is controlled by <code>cache</code>/<code>revalidate</code> options and invalidated by <code>revalidateTag</code>/<code>revalidatePath</code>. The **Full Route Cache** stores the **rendered** HTML + RSC payload of static routes at build, so they're served without re-rendering (invalidated by revalidation or a new deploy). The **Router Cache** is **client-side**: it caches visited/prefetched route segments for the session, giving instant back/forward — refreshed by <code>router.refresh()</code> or revalidation. Note: Next.js 15 relaxed several defaults (fetch/GET handlers no longer cached by default; Router Cache no longer reuses page segments by default).

### The four caches
| Cache | Scope | Invalidated by |
| --- | --- | --- |
| Request Memoization | one render | ends with render |
| Data Cache | persistent, server | <code>revalidate</code>/tag/path |
| Full Route Cache | server, static routes | revalidate / deploy |
| Router Cache | client, session | <code>router.refresh()</code>/revalidate |

> **Interview tip:** Order them by scope — **per-render → persistent data → rendered routes → client navigation** — and note **Next 15** made fetch/GET/Router caching **opt-in** rather than default.`,
    examples: [
      {
        label: "Which cache each control touches",
        tech: "tsx",
        runnable: false,
        code: `// Request memoization: same URL fetched twice in one render → 1 call
await fetch('/api/user'); await fetch('/api/user');

// Data Cache: persist + revalidate
await fetch('/api/posts', { next: { revalidate: 60, tags: ['posts'] } });

// Invalidate Data + Full Route cache:
revalidateTag('posts');
// Refresh the client Router Cache:
router.refresh();`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How does fetch caching work in the Next.js App Router (force-cache, no-store, revalidate)?",
    answer: `**TL;DR.** <code>fetch</code> options control the **Data Cache**: <code>{ cache: 'force-cache' }</code> caches indefinitely, <code>{ cache: 'no-store' }</code> never caches (makes the route dynamic), and <code>{ next: { revalidate: N } }</code> caches but **revalidates after N seconds** (ISR). <code>next: { tags }</code> enables **on-demand** invalidation.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='fetch options map to cache behaviors'>
  <rect class='d-box-accent' x='15' y='45' width='140' height='70' rx='10'/><text class='d-text' x='85' y='69' text-anchor='middle'>force-cache</text><text class='d-sub' x='85' y='90' text-anchor='middle'>cache forever</text>
  <rect class='d-box' x='160' y='45' width='140' height='70' rx='10'/><text class='d-text' x='230' y='69' text-anchor='middle'>revalidate: N</text><text class='d-sub' x='230' y='90' text-anchor='middle'>ISR every Ns</text>
  <rect class='d-box-muted' x='305' y='45' width='140' height='70' rx='10'/><text class='d-text' x='375' y='69' text-anchor='middle'>no-store</text><text class='d-sub' x='375' y='90' text-anchor='middle'>always fresh</text>
</svg>

**How it works.** Next.js extends the Web <code>fetch</code> with caching semantics tied to the **Data Cache**. <code>force-cache</code> stores the result and reuses it across requests/deploys until invalidated — great for stable data. <code>no-store</code> bypasses the cache entirely and, because the data can change per request, **opts the route into dynamic rendering**. <code>next: { revalidate: N }</code> is **time-based ISR**: the cached value is served and refreshed in the background after N seconds. Add <code>next: { tags: ['x'] }</code> to label cached data so a <code>revalidateTag('x')</code> (from a Server Action/webhook) purges it **on demand**. Importantly, **Next.js 15 changed the default**: <code>fetch</code> is **no longer cached by default** (was <code>force-cache</code>), so you now opt **into** caching explicitly. Non-<code>fetch</code> data (ORM calls) uses <code>unstable_cache</code>/<code>cache</code> for similar control.

### fetch cache options
| Option | Behavior |
| --- | --- |
| <code>cache: 'force-cache'</code> | cache indefinitely |
| <code>next: { revalidate: N }</code> | time-based ISR |
| <code>next: { tags }</code> | on-demand invalidation |
| <code>cache: 'no-store'</code> | never cache → dynamic |

> **Interview tip:** Map each option to a behavior, flag the **Next 15 default change** (fetch no longer cached by default), and that <code>no-store</code> **forces the route dynamic**. Mention <code>tags</code> + <code>revalidateTag</code> for on-demand purges.`,
    examples: [
      {
        label: "Three caching intents",
        tech: "tsx",
        runnable: false,
        code: `// stable reference data — cache forever
await fetch('https://api/countries', { cache: 'force-cache' });

// blog list — refresh at most every 10 min (ISR), taggable
await fetch('https://api/posts', { next: { revalidate: 600, tags: ['posts'] } });

// per-request/personalized — never cache (route becomes dynamic)
await fetch('https://api/me', { cache: 'no-store' });`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is ISR (Incremental Static Regeneration) in Next.js and how do you implement it?",
    answer: `**TL;DR.** **ISR** serves a **static** page and **regenerates it in the background** after a <code>revalidate</code> interval (or on demand), so content stays fresh **without rebuilding** the whole site. In the App Router you set <code>export const revalidate = N</code> or fetch with <code>next: { revalidate: N }</code>.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Stale-while-revalidate: serve cached, regenerate in background'>
  <rect class='d-box-accent' x='20' y='52' width='120' height='46' rx='8'/><text class='d-text' x='80' y='73' text-anchor='middle'>request</text><text class='d-sub' x='80' y='90' text-anchor='middle'>serve cached</text>
  <path class='d-edge-accent' d='M142 75 H200' marker-end='url(#nd2)'/>
  <text class='d-sub' x='171' y='66' text-anchor='middle'>if stale</text>
  <rect class='d-box' x='202' y='52' width='140' height='46' rx='8'/><text class='d-text' x='272' y='73' text-anchor='middle'>regenerate bg</text><text class='d-sub' x='272' y='90' text-anchor='middle'>next request fresh</text>
  <defs><marker id='nd2' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** ISR gives you static performance with periodic freshness via a **stale-while-revalidate** model. A page is prerendered (at build or first request); after the <code>revalidate</code> window elapses, the **next** request still gets the **cached** page instantly, and Next.js **regenerates** it in the background so subsequent visitors get the updated version — no full rebuild or deploy. You enable it per route with <code>export const revalidate = 60</code> (seconds) or per data source with <code>fetch(url, { next: { revalidate: 60 } })</code>; combine with <code>generateStaticParams</code> to pre-render known dynamic pages. For event-driven freshness (a CMS publish), use **on-demand** ISR via <code>revalidatePath</code>/<code>revalidateTag</code>. ISR is ideal for content that changes occasionally — blogs, product pages, docs — where full SSR would be wasteful and pure SSG too stale.

### ISR knobs
| Mechanism | Effect |
| --- | --- |
| <code>export const revalidate = N</code> | segment-level interval |
| <code>fetch(..., { next: { revalidate }})</code> | per-fetch interval |
| <code>revalidatePath/Tag</code> | on-demand regeneration |
| model | stale-while-revalidate |

> **Interview tip:** Define ISR as **static + background regeneration (stale-while-revalidate)** — fresh without a rebuild. Mention both **time-based** (<code>revalidate</code>) and **on-demand** (<code>revalidateTag</code>) triggers.`,
    examples: [
      {
        label: "Time-based ISR on a route",
        tech: "tsx",
        runnable: false,
        code: `// app/blog/[slug]/page.tsx
export const revalidate = 3600;    // regenerate at most once per hour

export async function generateStaticParams() {
  return (await getSlugs()).map((slug) => ({ slug }));
}
export default async function Post({ params }) {
  const { slug } = await params;
  return <Article post={await getPost(slug)} />;   // static + refreshed hourly
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is on-demand revalidation in Next.js (revalidatePath / revalidateTag)?",
    answer: `**TL;DR.** <code>revalidatePath(path)</code> and <code>revalidateTag(tag)</code> **invalidate cached routes/data immediately** — typically called from a **Server Action or webhook** after content changes — so the next request **regenerates fresh** content instead of waiting for a time-based interval.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='A content change triggers revalidateTag which purges cached data'>
  <rect class='d-box-accent' x='20' y='52' width='130' height='46' rx='8'/><text class='d-text' x='85' y='73' text-anchor='middle'>CMS publish</text><text class='d-sub' x='85' y='90' text-anchor='middle'>webhook / action</text>
  <path class='d-edge-accent' d='M152 75 H210' marker-end='url(#nd3)'/>
  <rect class='d-box' x='212' y='52' width='140' height='46' rx='8'/><text class='d-text' x='282' y='73' text-anchor='middle'>revalidateTag()</text><text class='d-sub' x='282' y='90' text-anchor='middle'>purge cache</text>
  <path class='d-edge-accent' d='M354 75 H402' marker-end='url(#nd3)'/>
  <rect class='d-box-muted' x='404' y='52' width='46' height='46' rx='8'/><text class='d-sub' x='427' y='79' text-anchor='middle'>fresh</text>
  <defs><marker id='nd3' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** Time-based ISR is fine when staleness is acceptable, but often you want content to update **the moment it changes** (a post is published, an order ships). On-demand revalidation does exactly that: tag your cached data with <code>next: { tags: ['posts'] }</code>, then call <code>revalidateTag('posts')</code> to purge **every** cache entry with that tag; or call <code>revalidatePath('/blog')</code> to invalidate a specific route's cache. Both mark the data/route stale so the **next** request regenerates it (they don't rebuild synchronously). You trigger them from a **Server Action** (right after a mutation) or a **Route Handler webhook** (from your CMS). Tags are more flexible than paths because one change can invalidate many pages that share the tag. This is the freshness mechanism behind "publish and it's live" without a deploy.

### On-demand revalidation
| API | Invalidates |
| --- | --- |
| <code>revalidateTag(tag)</code> | all data with that tag |
| <code>revalidatePath(path)</code> | a specific route |
| triggered from | Server Action / webhook |
| effect | next request regenerates |

> **Interview tip:** Contrast with time-based ISR: on-demand is **event-driven, immediate**. Emphasize **tags** let one mutation invalidate many pages, and it's called from **Server Actions/webhooks**.`,
    examples: [
      {
        label: "Tag data, then revalidate after a mutation",
        tech: "tsx",
        runnable: false,
        code: `// read with a tag
await fetch('https://api/posts', { next: { tags: ['posts'] } });

// Server Action after creating a post:
'use server';
import { revalidateTag } from 'next/cache';
export async function createPost(data) {
  await db.post.create(data);
  revalidateTag('posts');          // every page using 'posts' regenerates
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the Data Cache in Next.js and how do you opt out of it?",
    answer: `**TL;DR.** The **Data Cache** stores <code>fetch</code> (and cached function) results on the **server across requests and deployments** to avoid refetching. Opt out per fetch with <code>cache: 'no-store'</code>, per segment with <code>export const dynamic = 'force-dynamic'</code> or <code>revalidate = 0</code> — so data is always fresh.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Data Cache persists fetch results across requests unless opted out'>
  <rect class='d-box-accent' x='20' y='52' width='130' height='46' rx='8'/><text class='d-text' x='85' y='73' text-anchor='middle'>fetch()</text><text class='d-sub' x='85' y='90' text-anchor='middle'>result stored</text>
  <path class='d-edge-accent' d='M152 75 H210' marker-end='url(#nd4)'/>
  <rect class='d-box' x='212' y='45' width='140' height='60' rx='8'/><text class='d-text' x='282' y='70' text-anchor='middle'>Data Cache</text><text class='d-sub' x='282' y='88' text-anchor='middle'>persists across requests/deploys</text>
  <path class='d-edge-dashed' d='M282 105 V128 H85 V100' marker-end='url(#nd4)'/>
  <text class='d-sub' x='180' y='143' text-anchor='middle'>no-store / revalidate:0 opts out</text>
  <defs><marker id='nd4' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** The Data Cache is a **persistent server-side store** for fetched data, keyed by the request URL/options. Unlike Request Memoization (which only lasts one render), it survives **across requests and even deployments**, so repeated needs for the same data don't re-hit the origin — a big performance and cost win. You control lifetime with <code>revalidate</code> (time-based) and <code>tags</code> (on-demand). To **opt out** — for personalized or always-fresh data — use <code>cache: 'no-store'</code> on the fetch, or set the whole segment dynamic via <code>export const dynamic = 'force-dynamic'</code> / <code>revalidate = 0</code>. For non-<code>fetch</code> sources (ORM/DB), wrap them in <code>unstable_cache</code> (or React's <code>cache</code>) to participate. Note **Next.js 15**: <code>fetch</code> is **no longer cached by default**, so you now opt **in** with <code>force-cache</code>/<code>revalidate</code>; opting out is the default for uncached fetches.

### Data Cache control
| Want | Do |
| --- | --- |
| persist data | <code>revalidate</code> / <code>force-cache</code> |
| on-demand purge | tags + <code>revalidateTag</code> |
| never cache (one fetch) | <code>cache: 'no-store'</code> |
| never cache (segment) | <code>dynamic='force-dynamic'</code> |

> **Interview tip:** Define it as the **persistent, cross-request/deploy** fetch cache (vs per-render memoization). Opt out with <code>no-store</code>/<code>force-dynamic</code>; remember Next 15 made caching **opt-in**.`,
    examples: [
      {
        label: "Cache DB reads; bypass for user data",
        tech: "tsx",
        runnable: false,
        code: `import { unstable_cache } from 'next/cache';

// cache a non-fetch (DB) read in the Data Cache
const getProducts = unstable_cache(async () => db.product.findMany(),
  ['products'], { revalidate: 3600, tags: ['products'] });

// opt out for per-user data
const me = await fetch('/api/me', { cache: 'no-store' });`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the Full Route Cache in Next.js?",
    answer: `**TL;DR.** The **Full Route Cache** stores the **rendered HTML and RSC payload** of **statically-rendered** routes at build time, so they're served **instantly without re-rendering**. It's invalidated by **revalidation** or a **new deploy**; **dynamic** routes skip it.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Static routes rendered once and stored, served without re-render'>
  <rect class='d-box-accent' x='20' y='52' width='130' height='46' rx='8'/><text class='d-text' x='85' y='73' text-anchor='middle'>build render</text><text class='d-sub' x='85' y='90' text-anchor='middle'>HTML + RSC</text>
  <path class='d-edge-accent' d='M152 75 H210' marker-end='url(#nd5)'/>
  <rect class='d-box' x='212' y='45' width='140' height='60' rx='8'/><text class='d-text' x='282' y='70' text-anchor='middle'>Full Route Cache</text><text class='d-sub' x='282' y='88' text-anchor='middle'>server-side, static routes</text>
  <path class='d-edge-accent' d='M354 75 H402' marker-end='url(#nd5)'/>
  <rect class='d-box-muted' x='404' y='52' width='46' height='46' rx='8'/><text class='d-sub' x='427' y='79' text-anchor='middle'>instant</text>
  <defs><marker id='nd5' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** While the **Data Cache** caches the *data* a route fetches, the **Full Route Cache** caches the *rendered result* — the HTML and the React Server Component payload — of routes Next.js can render **statically**. On a request to such a route, Next serves the cached output directly (often from the edge), skipping rendering entirely for maximum speed. It's populated at build (and on ISR regeneration) and **invalidated** when the underlying data revalidates (time-based or <code>revalidateTag</code>/<code>revalidatePath</code>) or when you **deploy** a new build. **Dynamic** routes (those using request-time APIs or <code>no-store</code>) are **not** stored here — they render per request. Understanding this explains why a static route is blazing fast and why revalidating data also refreshes the served HTML: both the Data Cache **and** the Full Route Cache entries are rebuilt.

### Full Route Cache
| Aspect | Detail |
| --- | --- |
| Stores | rendered HTML + RSC payload |
| For | static routes only |
| Populated | build / ISR regeneration |
| Invalidated | revalidate / new deploy |

> **Interview tip:** Distinguish it from the Data Cache: Full Route Cache = **rendered output**, Data Cache = **fetched data**. Only **static** routes use it; revalidation/deploy invalidates it.`,
    examples: [
      {
        label: "What lands in the Full Route Cache",
        tech: "tsx",
        runnable: false,
        code: `// STATIC → rendered output stored in the Full Route Cache
export default async function Page() {
  const posts = await fetch('/api/posts', { next: { revalidate: 3600 } }).then(r => r.json());
  return <List posts={posts} />;
}

// DYNAMIC → NOT in Full Route Cache (rendered per request)
export const dynamic = 'force-dynamic';`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the Router Cache in Next.js and what are its implications?",
    answer: `**TL;DR.** The **Router Cache** (client-side) stores the **RSC payload of visited/prefetched routes** for the session, giving **instant back/forward** navigation. Its staleness can show **outdated data** after a mutation, so you call <code>router.refresh()</code> or revalidate to update it.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Client caches visited route segments for instant navigation'>
  <rect class='d-box-accent' x='20' y='45' width='150' height='60' rx='8'/><text class='d-text' x='95' y='70' text-anchor='middle'>Router Cache</text><text class='d-sub' x='95' y='88' text-anchor='middle'>client, in-memory</text>
  <path class='d-edge-accent' d='M172 65 H230' marker-end='url(#nd6)'/>
  <rect class='d-box' x='232' y='30' width='100' height='34' rx='6'/><text class='d-sub' x='282' y='51' text-anchor='middle'>/a (cached)</text>
  <rect class='d-box' x='232' y='72' width='100' height='34' rx='6'/><text class='d-sub' x='282' y='93' text-anchor='middle'>/b (cached)</text>
  <path class='d-edge-dashed' d='M340 65 H398' marker-end='url(#nd6)'/>
  <rect class='d-box-muted' x='400' y='45' width='50' height='40' rx='6'/><text class='d-sub' x='425' y='70' text-anchor='middle'>instant</text>
  <defs><marker id='nd6' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** As you navigate (or when <code>&lt;Link&gt;</code> **prefetches**), Next.js stores each route's **RSC payload** in an **in-memory client cache** for the session. Revisiting a cached route (including back/forward) renders **instantly** from cache with no server round-trip, and layouts are reused. The **implication** is staleness: after you mutate data (via a Server Action or API), a cached route may still show **old** content until its cache entry expires or is refreshed. Fixes: call <code>router.refresh()</code> to re-fetch the current route's server data, or use <code>revalidatePath</code>/<code>revalidateTag</code> (which also clears matching Router Cache entries). Note **Next.js 15** changed the default so page segments are **no longer reused** by default (staleTime 0), reducing stale-data surprises; you can tune <code>staleTimes</code> in config. A hard reload clears the Router Cache entirely.

### Router Cache implications
| Aspect | Detail |
| --- | --- |
| Location | client, in-memory (session) |
| Benefit | instant back/forward |
| Risk | stale data after mutation |
| Refresh | <code>router.refresh()</code> / revalidate |

> **Interview tip:** It's the **client-side** cache enabling instant nav; the gotcha is **stale UI after mutations** → <code>router.refresh()</code> or revalidate. Mention **Next 15** reduced default reuse (<code>staleTimes</code>).`,
    examples: [
      {
        label: "Refresh the Router Cache after a mutation",
        tech: "tsx",
        runnable: false,
        code: `'use client';
import { useRouter } from 'next/navigation';

function DeleteButton({ id }) {
  const router = useRouter();
  return <button onClick={async () => {
    await fetch('/api/items/' + id, { method: 'DELETE' });
    router.refresh();          // re-fetch current route's server data (clears stale UI)
  }}>Delete</button>;
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you fetch data in Next.js Client Components (SWR, React Query, use)?",
    answer: `**TL;DR.** In Client Components you fetch with libraries like **SWR** or **React Query** (caching, revalidation, mutations) or stream a Server Component promise into the **<code>use()</code>** hook. Prefer fetching in **Server Components** when possible; use client fetching for **highly interactive/real-time** data.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Client fetching options: SWR/React Query cache or use() a streamed promise'>
  <rect class='d-box-accent' x='20' y='40' width='200' height='90' rx='10'/><text class='d-text' x='120' y='64' text-anchor='middle'>SWR / React Query</text><text class='d-sub' x='120' y='88' text-anchor='middle'>cache, revalidate,</text><text class='d-sub' x='120' y='108' text-anchor='middle'>mutations, polling</text>
  <rect class='d-box-muted' x='240' y='40' width='200' height='90' rx='10'/><text class='d-text' x='340' y='64' text-anchor='middle'>use(promise)</text><text class='d-sub' x='340' y='88' text-anchor='middle'>server passes a promise</text><text class='d-sub' x='340' y='108' text-anchor='middle'>Suspense unwraps it</text>
</svg>

**How it works.** Server Components should handle most fetching (secure, zero-JS, cacheable), but some data is inherently **client-driven**: live updates, infinite scroll, data that changes with client state, or optimistic mutations. For those, **SWR** and **React Query (TanStack Query)** give you client-side caching, background revalidation, deduping, retries, polling, and mutation helpers — you call a hook with a key + fetcher and get <code>{ data, error, isLoading }</code>. Alternatively, the React **<code>use()</code>** hook lets a Server Component **start** a fetch and pass the **unresolved promise** as a prop to a Client Component, which unwraps it under Suspense — combining server-initiated fetching with a client boundary. Whatever you use, don't fetch secrets client-side, and lean on Server Components first to keep bundles small and data secure.

### Client fetching options
| Tool | Best for |
| --- | --- |
| SWR | simple caching + revalidation |
| React Query | complex caching, mutations |
| <code>use(promise)</code> | server-started, client-unwrapped |
| Server Components | default — prefer when possible |

> **Interview tip:** Say **prefer Server Components; reach for SWR/React Query for interactive/live client data**, and mention <code>use()</code> for streaming a server promise into a client boundary. Never fetch secrets client-side.`,
    examples: [
      {
        label: "SWR for live client data",
        tech: "tsx",
        runnable: false,
        code: `'use client';
import useSWR from 'swr';
const fetcher = (url: string) => fetch(url).then(r => r.json());

export function LivePrice({ id }: { id: string }) {
  const { data, error, isLoading } = useSWR('/api/price/' + id, fetcher,
    { refreshInterval: 5000 });          // poll every 5s, cached + deduped
  if (isLoading) return <Spinner />;
  return <span>{data.price}</span>;
}`,
      },
    ],
  },
];

export default augments;
