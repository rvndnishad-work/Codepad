/**
 * Next.js Phase — Batch 3 (RSC & rendering). See nextjs-augments-gold-1.ts.
 */
import type { NextAugment } from "./nextjs-augments.types";

const augments: NextAugment[] = [
  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are React Server Components and why does Next.js use them?",
    answer: `**TL;DR.** **React Server Components (RSC)** render **only on the server**, can directly access databases/secrets, and send **serialized output (not JS)** to the client — cutting bundle size and enabling secure data access. Next.js makes them the **default** to improve performance and developer experience.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Server Components render to a payload; only client islands ship JS'>
  <rect class='d-box-accent' x='20' y='45' width='180' height='70' rx='10'/><text class='d-text' x='110' y='70' text-anchor='middle'>Server Components</text><text class='d-sub' x='110' y='92' text-anchor='middle'>render → RSC payload</text>
  <path class='d-edge-accent' d='M202 80 H262' marker-end='url(#nc1)'/>
  <text class='d-sub' x='232' y='71' text-anchor='middle'>stream</text>
  <rect class='d-box' x='264' y='45' width='176' height='70' rx='10'/><text class='d-text' x='352' y='70' text-anchor='middle'>browser</text><text class='d-sub' x='352' y='92' text-anchor='middle'>only client islands hydrate</text>
  <defs><marker id='nc1' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** A Server Component runs during the server render and produces a **serialized description** of the UI (the "RSC payload") rather than JavaScript — so the component's code and its dependencies (markdown parsers, ORMs, date libs) **never reach the browser**. That shrinks the client bundle dramatically and lets components <code>await</code> data and touch **secrets/DB** safely. Interactive bits are isolated into **Client Components** ("islands") that do ship JS and hydrate. Next.js adopts RSC because it solves long-standing pain: smaller bundles, direct server data access (no API layer for your own UI), automatic code-splitting at the server boundary, and natural **streaming**. The mental model: server renders everything, client only hydrates the interactive leaves.

### Why RSC
| Benefit | Detail |
| --- | --- |
| smaller bundles | component code stays server-side |
| direct data access | DB/secrets in the component |
| security | sensitive code never shipped |
| streaming | progressive rendering |

> **Interview tip:** Emphasize **zero client JS for server components** and **direct secure data access**, with interactivity confined to client **islands**. That's the performance + DX case Next.js bets on.`,
    examples: [
      {
        label: "Server Component using server-only code",
        tech: "tsx",
        runnable: false,
        code: `// app/report/page.tsx — Server Component (default)
import { db } from '@/lib/db';            // ORM never ships to the client
import { marked } from 'marked';          // heavy lib stays server-side

export default async function Report() {
  const row = await db.report.findFirst(); // direct DB access, no API route
  return <div dangerouslySetInnerHTML={{ __html: marked(row.body) }} />;
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do Server and Client Components compose in Next.js?",
    answer: `**TL;DR.** A **Server Component can render a Client Component**, but a **Client Component cannot import a Server Component** directly — instead you **pass Server Components as <code>children</code>/props** into Client Components. Props crossing the boundary must be **serializable**.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Server renders client; server content passed as children into client'>
  <rect class='d-box-accent' x='20' y='30' width='200' height='100' rx='10'/><text class='d-text' x='120' y='54' text-anchor='middle'>✅ Server → Client</text><text class='d-sub' x='120' y='78' text-anchor='middle'>import &amp; render directly</text><text class='d-sub' x='120' y='100' text-anchor='middle'>props serializable</text>
  <rect class='d-box-muted' x='240' y='30' width='200' height='100' rx='10'/><text class='d-text' x='340' y='54' text-anchor='middle'>⚠ Client needs Server</text><text class='d-sub' x='340' y='78' text-anchor='middle'>pass as children/props</text><text class='d-sub' x='340' y='100' text-anchor='middle'>not import</text>
</svg>

**How it works.** Rendering flows **server → client**: a Server Component can import and render a Client Component (it becomes an interactive island). The reverse import is **disallowed** — a Client Component can't <code>import</code> a Server Component, because once you're in the client bundle there's no server to run it. The escape hatch is the **children/slot pattern**: the Server Component renders the server content and passes it as <code>children</code> to a Client Component, which renders <code>{children}</code> without knowing what it is. This keeps server content (and its zero-JS benefit) **inside** a client shell (e.g. a server-rendered list inside a client tab panel). Anything you pass **across** the boundary as props must be **serializable** (no functions, class instances; plain data, JSX as children is fine). Keep <code>'use client'</code> at the leaves to maximize the server portion.

### Composition rules
| Direction | Allowed? |
| --- | --- |
| Server renders Client | ✅ direct import |
| Client imports Server | ❌ |
| Server passed as children | ✅ slot pattern |
| Props across boundary | serializable only |

> **Interview tip:** The classic gotcha: you can't import a Server Component into a Client Component — **pass it as <code>children</code>**. And props crossing the boundary must be **serializable**.`,
    examples: [
      {
        label: "Server content inside a client shell",
        tech: "tsx",
        runnable: false,
        code: `// client shell — doesn't know what children are
'use client';
export function Panel({ children }) {
  const [open, setOpen] = useState(true);
  return open ? <div>{children}</div> : <button onClick={() => setOpen(true)}>show</button>;
}

// server page passes a SERVER component as children (stays zero-JS)
export default async function Page() {
  return <Panel><ServerList items={await getItems()} /></Panel>;
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you pass data from Server Components to Client Components in Next.js?",
    answer: `**TL;DR.** Fetch data in a **Server Component** and pass it as **props** to a Client Component. The props must be **serializable** (plain objects/arrays/strings/numbers; no functions, class instances, or non-plain values), since they cross the server-to-client boundary in the RSC payload.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Server fetches data and passes serializable props to a client component'>
  <rect class='d-box-accent' x='20' y='52' width='150' height='46' rx='8'/><text class='d-text' x='95' y='73' text-anchor='middle'>Server fetch</text><text class='d-sub' x='95' y='90' text-anchor='middle'>db / fetch()</text>
  <path class='d-edge-accent' d='M172 75 H240' marker-end='url(#nc2)'/>
  <text class='d-sub' x='206' y='66' text-anchor='middle'>serializable props</text>
  <rect class='d-box' x='242' y='52' width='150' height='46' rx='8'/><text class='d-text' x='317' y='73' text-anchor='middle'>Client Component</text><text class='d-sub' x='317' y='90' text-anchor='middle'>renders + interacts</text>
  <defs><marker id='nc2' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** Because the Server Component runs first, the natural pattern is **fetch on the server, hand the result down as props**. Those props are embedded in the **RSC payload** sent to the browser, so they must be serializable — plain JSON-like values work; **functions, class instances, Symbols, and (in some cases) Dates** don't transfer cleanly (serialize to ISO strings or primitives). For deeper trees you can also **stream a Promise** into a Client Component and unwrap it with React's <code>use()</code> hook, letting the client show a Suspense fallback until it resolves. Avoid sending **more data than the client needs** (it inflates the payload and may leak fields) — shape/trim it server-side first. For client-initiated, frequently-changing data, fetch in the client with SWR/React Query instead.

### Passing data
| Approach | When |
| --- | --- |
| props (plain data) | most cases |
| stream Promise + <code>use()</code> | defer to client Suspense |
| trim before sending | avoid bloat/leaks |
| client fetch (SWR) | interactive/live data |

> **Interview tip:** Two musts: props must be **serializable** (no functions/class instances) and you should **trim** data to what the client needs (payload size + avoid leaking fields). Mention <code>use()</code> for streaming a promise.`,
    examples: [
      {
        label: "Fetch on server, pass trimmed props",
        tech: "tsx",
        runnable: false,
        code: `// server
export default async function Page() {
  const user = await db.user.find();
  // pass only what the client needs (serializable, no secrets)
  return <Profile name={user.name} avatar={user.avatarUrl} />;
}

// client
'use client';
function Profile({ name, avatar }: { name: string; avatar: string }) {
  const [following, setFollowing] = useState(false);
  return <button onClick={() => setFollowing(!following)}>{name}</button>;
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is streaming SSR with Suspense in Next.js?",
    answer: `**TL;DR.** **Streaming SSR** sends the page **shell immediately** and streams in parts as their data resolves, using **Suspense** boundaries (<code>loading.js</code> or explicit <code>&lt;Suspense&gt;</code>). The user sees content faster and **slow data doesn't block** the whole page.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Shell streams first, then slow sections stream in independently'>
  <rect class='d-box-accent' x='20' y='30' width='420' height='28' rx='6'/><text class='d-text' x='230' y='49' text-anchor='middle'>shell + fast content (sent first)</text>
  <rect class='d-box' x='40' y='66' width='180' height='62' rx='8'/><text class='d-sub' x='130' y='90' text-anchor='middle'>&lt;Suspense&gt; slow A</text><text class='d-sub' x='130' y='110' text-anchor='middle'>streams when ready</text>
  <rect class='d-box' x='240' y='66' width='180' height='62' rx='8'/><text class='d-sub' x='330' y='90' text-anchor='middle'>&lt;Suspense&gt; slow B</text><text class='d-sub' x='330' y='110' text-anchor='middle'>independent</text>
</svg>

**How it works.** Traditional SSR waits for **all** data before sending any HTML (slow TTFB if one query is slow). Streaming SSR uses HTTP chunked responses + React 18's Suspense: Next.js sends the **shell** (layout, fast components, and fallbacks) right away, then **streams** each Suspense boundary's real HTML as its server data resolves, and React patches it in on the client. You get boundaries automatically via <code>loading.js</code> for a whole segment, or place explicit <code>&lt;Suspense fallback&gt;</code> around individual slow components so each streams **independently** (a slow recommendations panel doesn't hold up the article). This improves perceived performance and **Core Web Vitals**, and is the foundation for Partial Prerendering. Caveat: data inside a boundary can't set page-level metadata (resolve those before).

### Streaming SSR
| Aspect | Effect |
| --- | --- |
| shell first | fast first paint / TTFB |
| per-boundary streaming | slow parts isolated |
| <code>loading.js</code> | whole-segment fallback |
| explicit <code>&lt;Suspense&gt;</code> | component-level |

> **Interview tip:** Contrast with **all-or-nothing SSR**: streaming sends the shell immediately and streams Suspense boundaries as data resolves, so one slow query doesn't block the page. It underpins **PPR**.`,
    examples: [
      {
        label: "Independent streaming with Suspense",
        tech: "tsx",
        runnable: false,
        code: `import { Suspense } from 'react';

export default function Page() {
  return (
    <>
      <Header />                                   {/* sent immediately */}
      <Suspense fallback={<Skeleton />}>
        <SlowFeed />                               {/* streams in when ready */}
      </Suspense>
      <Suspense fallback={<Skeleton />}>
        <SlowSidebar />                            {/* streams independently */}
      </Suspense>
    </>
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is Partial Prerendering (PPR) in Next.js?",
    answer: `**TL;DR.** **Partial Prerendering** serves a **static prerendered shell instantly** and **streams in the dynamic parts** (wrapped in Suspense) within the **same response** — combining the speed of static with the freshness of dynamic in a **single route**, no all-or-nothing choice.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Static shell served instantly with dynamic holes streamed in'>
  <rect class='d-box-accent' x='30' y='25' width='400' height='110' rx='10'/>
  <text class='d-sub' x='45' y='44'>static shell (CDN, instant)</text>
  <rect class='d-box-muted' x='60' y='54' width='160' height='66' rx='8'/><text class='d-text' x='140' y='84' text-anchor='middle'>dynamic hole</text><text class='d-sub' x='140' y='102' text-anchor='middle'>streamed (Suspense)</text>
  <rect class='d-box-muted' x='240' y='54' width='160' height='66' rx='8'/><text class='d-text' x='320' y='84' text-anchor='middle'>dynamic hole</text><text class='d-sub' x='320' y='102' text-anchor='middle'>per-user data</text>
</svg>

**How it works.** Before PPR, a route was **either** fully static (fast, cacheable) **or** fully dynamic (fresh, per-request) — one dynamic bit forced the whole page dynamic. PPR breaks that: at build time Next prerenders the **static shell** (everything outside Suspense), and the dynamic parts you wrap in <code>&lt;Suspense&gt;</code> become **holes** that are computed per request and **streamed** into the same HTTP response. So a product page can serve the static layout/description from the edge instantly while streaming the **personalized** price/cart/recommendations. It builds directly on streaming SSR + the static/dynamic model. PPR is an evolving/experimental feature you opt into via config; the mental model is "static shell + streamed dynamic holes, one route."

### PPR vs alternatives
| | Fully static | Fully dynamic | PPR |
| --- | --- | --- | --- |
| First paint | instant | slower | instant shell |
| Freshness | stale | fresh | fresh holes |
| Granularity | whole route | whole route | per-Suspense |

> **Interview tip:** The one-liner: **static shell served instantly + dynamic Suspense "holes" streamed in the same response** — best of static and dynamic per route. Note it's built on streaming SSR and is opt-in/experimental.`,
    examples: [
      {
        label: "Static page with a dynamic, streamed hole",
        tech: "tsx",
        runnable: false,
        code: `// Outside Suspense = prerendered static shell.
// Inside Suspense + dynamic data = streamed per-request hole.
export default function Product() {
  return (
    <>
      <ProductInfo />                       {/* static, from build */}
      <Suspense fallback={<PriceSkeleton />}>
        <LivePrice />                        {/* dynamic: cookies/personalized */}
      </Suspense>
    </>
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the difference between static and dynamic rendering in the Next.js App Router?",
    answer: `**TL;DR.** **Static rendering** produces HTML at **build time** (or on revalidation) and serves it from **cache**; **dynamic rendering** runs **per request**. A route becomes dynamic when it uses **dynamic functions** (<code>cookies</code>, <code>headers</code>, <code>searchParams</code>) or **uncached** data; otherwise Next.js renders it **statically by default**.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Static built once and cached vs dynamic rendered per request'>
  <rect class='d-box-accent' x='20' y='30' width='200' height='100' rx='10'/><text class='d-text' x='120' y='54' text-anchor='middle'>static (default)</text><text class='d-sub' x='120' y='78' text-anchor='middle'>built once, cached/CDN</text><text class='d-sub' x='120' y='100' text-anchor='middle'>fastest</text>
  <rect class='d-box-muted' x='240' y='30' width='200' height='100' rx='10'/><text class='d-text' x='340' y='54' text-anchor='middle'>dynamic</text><text class='d-sub' x='340' y='78' text-anchor='middle'>rendered per request</text><text class='d-sub' x='340' y='100' text-anchor='middle'>fresh / personalized</text>
</svg>

**How it works.** Next.js prefers **static** because it's cacheable and fast (served from a CDN). It renders a route statically unless something forces it dynamic: reading **request-time data** via <code>cookies()</code>, <code>headers()</code>, <code>draftMode()</code>, or the <code>searchParams</code> prop, or fetching with caching disabled (<code>cache: 'no-store'</code>/<code>revalidate: 0</code>). Any of those means the output can differ per request, so Next renders it on demand. You can **force** the mode with the segment config <code>export const dynamic = 'force-dynamic' | 'force-static'</code>. **ISR** sits between them — statically rendered but periodically revalidated. Understanding this is key to performance: keep routes static where possible, isolate dynamic needs (or use PPR) so you don't accidentally make a whole page dynamic.

### Static vs dynamic
| | Static | Dynamic |
| --- | --- | --- |
| Rendered | build/revalidate | per request |
| Served from | cache/CDN | server |
| Triggered by | default | cookies/headers/no-store |
| Speed | fastest | fresh, slower |

> **Interview tip:** Lead with **"static by default; dynamic functions or uncached fetches opt out."** Name the dynamic triggers (cookies/headers/searchParams/no-store) and the <code>dynamic</code> segment config to force either.`,
    examples: [
      {
        label: "A dynamic function forces per-request rendering",
        tech: "tsx",
        runnable: false,
        code: `import { cookies } from 'next/headers';

export default async function Page() {
  const theme = (await cookies()).get('theme')?.value;  // → route is now DYNAMIC
  return <div data-theme={theme}>…</div>;
}

// Without cookies()/headers()/no-store, this route would be STATIC by default.
// Force it explicitly:  export const dynamic = 'force-static';`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What makes a route dynamic in the Next.js App Router?",
    answer: `**TL;DR.** Using **dynamic functions** — <code>cookies()</code>, <code>headers()</code>, <code>draftMode()</code>, or the <code>searchParams</code> prop — or fetching with **no cache** (<code>cache: 'no-store'</code>, <code>revalidate: 0</code>) makes a route **dynamic** (rendered per request). Without those, Next.js **prerenders it statically** by default.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Dynamic triggers flip a route from static to per-request'>
  <rect class='d-box-muted' x='20' y='28' width='150' height='30' rx='6'/><text class='d-sub' x='95' y='48' text-anchor='middle'>cookies()/headers()</text>
  <rect class='d-box-muted' x='20' y='62' width='150' height='30' rx='6'/><text class='d-sub' x='95' y='82' text-anchor='middle'>searchParams</text>
  <rect class='d-box-muted' x='20' y='96' width='150' height='30' rx='6'/><text class='d-sub' x='95' y='116' text-anchor='middle'>fetch no-store</text>
  <path class='d-edge-accent' d='M172 77 H240' marker-end='url(#nc3)'/>
  <rect class='d-box-accent' x='242' y='55' width='160' height='44' rx='8'/><text class='d-text' x='322' y='81' text-anchor='middle'>route → dynamic</text>
  <defs><marker id='nc3' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** Next.js statically analyzes each route. The moment your code reads something that **only exists at request time**, the route can't be prerendered, so it switches to **dynamic rendering**. Those triggers are: the **dynamic functions** <code>cookies()</code>/<code>headers()</code>/<code>draftMode()</code> (request-scoped), accessing the page's <code>searchParams</code> prop (query string varies per request), and **uncached** data fetches (<code>cache: 'no-store'</code> or <code>next: { revalidate: 0 }</code>, or a non-GET Route Handler). You can also force it with <code>export const dynamic = 'force-dynamic'</code> or <code>export const revalidate = 0</code>. Conversely, if you avoid all of these and only use cached data, the route stays **static**. A common surprise: adding a header/cookie read deep in a shared component **silently makes the whole route dynamic** — so isolate request-time reads (or use Suspense/PPR) to keep most of the page static.

### Dynamic triggers
| Trigger | Why |
| --- | --- |
| <code>cookies()/headers()</code> | request-scoped |
| <code>searchParams</code> | query varies |
| <code>cache: 'no-store'</code> | uncached data |
| <code>dynamic='force-dynamic'</code> | explicit |

> **Interview tip:** List the triggers precisely (cookies/headers/draftMode/searchParams/no-store) and the gotcha that a **single deep request-time read** flips the **entire route** dynamic — so isolate it.`,
    examples: [
      {
        label: "Both ways to opt into dynamic",
        tech: "tsx",
        runnable: false,
        code: `// Implicit: reading a dynamic function
import { headers } from 'next/headers';
const ua = (await headers()).get('user-agent');   // → dynamic

// Or uncached data:
await fetch('https://api/now', { cache: 'no-store' });  // → dynamic

// Explicit segment config:
export const dynamic = 'force-dynamic';
export const revalidate = 0;`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is generateStaticParams in Next.js and how does it enable SSG for dynamic routes?",
    answer: `**TL;DR.** <code>generateStaticParams</code> returns the list of **param values** (e.g. all blog slugs) so Next.js **statically pre-renders** those dynamic-route pages at **build time**. Params not in the list can be generated **on demand** and cached, controlled by <code>dynamicParams</code>.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='generateStaticParams lists slugs that are prerendered at build'>
  <rect class='d-box-accent' x='20' y='52' width='170' height='46' rx='8'/><text class='d-text' x='105' y='73' text-anchor='middle'>generateStaticParams</text><text class='d-sub' x='105' y='90' text-anchor='middle'>returns [{slug:'a'},…]</text>
  <path class='d-edge-accent' d='M192 75 H250' marker-end='url(#nc4)'/>
  <rect class='d-box' x='252' y='40' width='190' height='70' rx='8'/><text class='d-text' x='347' y='66' text-anchor='middle'>build time</text><text class='d-sub' x='347' y='84' text-anchor='middle'>/blog/a, /blog/b … prerendered</text>
  <defs><marker id='nc4' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** A dynamic route like <code>app/blog/[slug]/page.tsx</code> matches infinitely many URLs, so to **statically generate** them Next needs to know which ones exist. You export an async <code>generateStaticParams()</code> that returns an array of param objects (often by querying your CMS/DB for all slugs); Next.js renders one static page per entry at build. For params **not** listed, the <code>dynamicParams</code> export controls behavior: <code>true</code> (default) renders them on-demand on first request and caches the result (ISR-like), <code>false</code> returns a 404. This is the App Router replacement for the Pages Router's <code>getStaticPaths</code>. It pairs with <code>revalidate</code> for ISR, and you can also nest it for multi-level dynamic routes. Use it for content with a known, enumerable set of pages (blogs, products, docs) to get static speed + SEO.

### generateStaticParams
| Aspect | Detail |
| --- | --- |
| Returns | array of param objects |
| Effect | prerender those pages at build |
| <code>dynamicParams: true</code> | render unlisted on-demand |
| <code>dynamicParams: false</code> | 404 unlisted |

> **Interview tip:** Call it the App Router's <code>getStaticPaths</code>: it **enumerates dynamic params for SSG**. Mention <code>dynamicParams</code> for handling unlisted slugs and combining with <code>revalidate</code> for ISR.`,
    examples: [
      {
        label: "Prerender all blog slugs at build",
        tech: "tsx",
        runnable: false,
        code: `// app/blog/[slug]/page.tsx
export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((p) => ({ slug: p.slug }));   // one static page each
}
export const dynamicParams = true;   // unlisted slugs render on-demand + cache

export default async function Post({ params }) {
  const { slug } = await params;
  return <Article post={await getPost(slug)} />;
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the route segment config in Next.js (dynamic, revalidate, runtime)?",
    answer: `**TL;DR.** You **export consts** from a <code>layout</code>/<code>page</code>/<code>route</code> to control its behavior: <code>dynamic</code> (<code>'auto'</code>|<code>'force-dynamic'</code>|<code>'force-static'</code>), <code>revalidate</code> (ISR interval), <code>runtime</code> (<code>'nodejs'</code>|<code>'edge'</code>), <code>fetchCache</code>, and <code>dynamicParams</code>. They **override the defaults** for that segment.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Segment config exports control rendering, caching and runtime'>
  <rect class='d-box-accent' x='20' y='40' width='130' height='30' rx='6'/><text class='d-sub' x='85' y='60' text-anchor='middle'>dynamic</text>
  <rect class='d-box-accent' x='165' y='40' width='130' height='30' rx='6'/><text class='d-sub' x='230' y='60' text-anchor='middle'>revalidate</text>
  <rect class='d-box-accent' x='310' y='40' width='130' height='30' rx='6'/><text class='d-sub' x='375' y='60' text-anchor='middle'>runtime</text>
  <path class='d-edge-accent' d='M230 72 V92' marker-end='url(#nc5)'/>
  <rect class='d-box-muted' x='120' y='94' width='220' height='40' rx='8'/><text class='d-text' x='230' y='119' text-anchor='middle'>per-segment behavior overrides</text>
  <defs><marker id='nc5' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** Route Segment Config is a set of **named exports** Next.js reads from a segment's file to tune rendering and caching for that segment (and, for some, its children). The common ones: <code>dynamic</code> forces static or dynamic rendering (or <code>'auto'</code> = infer); <code>revalidate</code> sets an ISR interval in seconds (<code>0</code> = always dynamic, <code>false</code> = cache forever); <code>runtime</code> chooses the **Node.js** or **Edge** runtime; <code>fetchCache</code> overrides default fetch caching; <code>dynamicParams</code> controls unlisted dynamic params; <code>preferredRegion</code> hints deployment region; <code>maxDuration</code> caps execution time. They give **per-route** control without global config — e.g. make one API handler edge-deployed and always-dynamic while the rest stay static. Values must be **statically analyzable** (top-level consts, not computed at runtime).

### Common config exports
| Export | Controls |
| --- | --- |
| <code>dynamic</code> | force static/dynamic |
| <code>revalidate</code> | ISR interval |
| <code>runtime</code> | node vs edge |
| <code>fetchCache</code>/<code>dynamicParams</code> | caching / unlisted params |

> **Interview tip:** Frame them as **per-segment overrides** of Next's defaults. Know the big three (<code>dynamic</code>, <code>revalidate</code>, <code>runtime</code>) and that values must be **static** (analyzable at build).`,
    examples: [
      {
        label: "Segment config exports",
        tech: "tsx",
        runnable: false,
        code: `// app/feed/page.tsx
export const dynamic = 'force-static';   // always prerender
export const revalidate = 3600;          // ISR: refresh hourly
export const runtime = 'edge';           // run on the Edge runtime

export default async function Feed() { /* ... */ }`,
      },
    ],
  },
];

export default augments;
