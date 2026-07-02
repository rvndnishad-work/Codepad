/**
 * Next.js Phase — Batch 1 (Fundamentals). Gold-standard answers:
 * TL;DR + theme-aware <svg class='iq-diagram'> diagram + GFM table + interview
 * tip + a Next.js code example. Picked up by `npm run augment:next`.
 *
 * Conventions: SVGs use the shared .iq-diagram helper classes (d-box, d-box-accent,
 * d-box-muted, d-text, d-sub, d-accent, d-edge[-accent][-dashed], d-arrow),
 * single-quoted attrs, and &lt;/&gt; for angle brackets. Inline code uses <code>
 * tags (rendered via rehype-raw) to avoid backtick escaping. Next.js examples are
 * NOT runnable (no playground) → runnable:false, static highlighted (tech 'tsx'/'bash').
 */
import type { NextAugment } from "./nextjs-augments.types";

const augments: NextAugment[] = [
  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is Next.js and what problems does it solve?",
    answer: `**TL;DR.** Next.js is a **React framework** that adds **server-side rendering, static generation, file-based routing, data fetching, bundling, and image/font optimization** on top of React — so you ship fast, SEO-friendly, full-stack apps without assembling all that infrastructure yourself.

<svg class='iq-diagram' viewBox='0 0 460 170' role='img' aria-label='Next.js wraps React with rendering, routing, data and optimization'>
  <rect class='d-box-muted' x='20' y='20' width='420' height='130' rx='10'/>
  <text class='d-text' x='40' y='44'>Next.js</text>
  <rect class='d-box-accent' x='40' y='56' width='120' height='40' rx='8'/><text class='d-sub' x='100' y='80' text-anchor='middle'>rendering (SSR/SSG/ISR)</text>
  <rect class='d-box-accent' x='170' y='56' width='120' height='40' rx='8'/><text class='d-sub' x='230' y='80' text-anchor='middle'>routing + layouts</text>
  <rect class='d-box-accent' x='300' y='56' width='120' height='40' rx='8'/><text class='d-sub' x='360' y='80' text-anchor='middle'>data + caching</text>
  <rect class='d-box' x='40' y='104' width='380' height='34' rx='8'/><text class='d-text' x='230' y='126' text-anchor='middle'>React (the UI library it builds on)</text>
</svg>

**How it works.** Plain React is a client-side UI library — you'd bolt on a router, an SSR setup, a bundler, data-fetching conventions, and asset optimization yourself. Next.js bundles all of that into one opinionated framework: it renders pages on the **server** (great for SEO and first paint), generates **static** pages at build time, supports **incremental** regeneration, and provides **file-based routing**, **Server Components**, **Server Actions**, and built-in **image/font/script** optimization. The result is fast, production-ready full-stack apps with far less boilerplate.

### What it adds over React
| Concern | React alone | Next.js |
| --- | --- | --- |
| Rendering | client only | SSR/SSG/ISR + RSC |
| Routing | add a library | file-based, built-in |
| Data/caching | DIY | conventions + cache |
| Optimization | manual | image/font/bundle |

> **Interview tip:** Frame it as **"React + the production infrastructure"** — SSR/SSG, routing, data fetching, and optimization out of the box. Mention SEO and performance as the headline wins.`,
    examples: [
      {
        label: "A Server Component page that fetches data",
        tech: "tsx",
        runnable: false,
        code: `// app/page.tsx — runs on the server, SEO-friendly HTML, zero client JS
export default async function Home() {
  const posts = await fetch('https://api/posts').then(r => r.json());
  return (
    <ul>
      {posts.map((p) => <li key={p.id}>{p.title}</li>)}
    </ul>
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the difference between the App Router and the Pages Router?",
    answer: `**TL;DR.** The **Pages Router** (<code>pages/</code>) is the original system: client components plus <code>getServerSideProps</code>/<code>getStaticProps</code>. The **App Router** (<code>app/</code>) is built on **React Server Components**, adding **nested layouts, streaming, Server Actions, and granular caching**. The App Router is the recommended default for new apps.

<svg class='iq-diagram' viewBox='0 0 460 160' role='img' aria-label='Pages Router versus App Router capabilities'>
  <rect class='d-box-muted' x='20' y='25' width='200' height='130' rx='10'/>
  <text class='d-text' x='120' y='49' text-anchor='middle'>Pages Router</text>
  <text class='d-sub' x='120' y='74' text-anchor='middle'>pages/ + getXProps</text>
  <text class='d-sub' x='120' y='94' text-anchor='middle'>client components</text>
  <text class='d-sub' x='120' y='114' text-anchor='middle'>_app / _document</text>
  <text class='d-sub' x='120' y='134' text-anchor='middle'>mature, stable</text>
  <rect class='d-box-accent' x='240' y='25' width='200' height='130' rx='10'/>
  <text class='d-text' x='340' y='49' text-anchor='middle'>App Router</text>
  <text class='d-sub' x='340' y='74' text-anchor='middle'>app/ + Server Components</text>
  <text class='d-sub' x='340' y='94' text-anchor='middle'>nested layouts + streaming</text>
  <text class='d-sub' x='340' y='114' text-anchor='middle'>Server Actions</text>
  <text class='d-sub' x='340' y='134' text-anchor='middle'>recommended default</text>
</svg>

**How it works.** In the **Pages Router**, every component is a Client Component and you fetch data with special exported functions (<code>getStaticProps</code> for build-time, <code>getServerSideProps</code> per request) that pass props to the page. The **App Router** instead defaults to **Server Components** that fetch data inline, composes UI with **nested layouts**, **streams** with Suspense, handles mutations with **Server Actions**, and exposes a multi-layer **caching** model. They can **coexist** in one project, enabling incremental migration. New features land in the App Router first.

### Side by side
| | Pages Router | App Router |
| --- | --- | --- |
| Folder | <code>pages/</code> | <code>app/</code> |
| Components | client | server by default |
| Data | <code>getX Props</code> | async Server Components |
| Layouts | <code>_app</code> | nested <code>layout.js</code> |

> **Interview tip:** Say the App Router is **RSC-based** with nested layouts, streaming, and Server Actions, is the **default for new apps**, and that both can **coexist** for gradual migration.`,
    examples: [
      {
        label: "Same data fetch, both routers",
        tech: "tsx",
        runnable: false,
        code: `// Pages Router — pages/posts.tsx
export async function getServerSideProps() {
  const posts = await getPosts();
  return { props: { posts } };
}
export default function Posts({ posts }) { /* ... */ }

// App Router — app/posts/page.tsx
export default async function Posts() {
  const posts = await getPosts();   // fetch inline in a Server Component
  return /* ... */;
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are the rendering strategies in Next.js (SSR, SSG, ISR, CSR)?",
    answer: `**TL;DR.** **SSG** pre-renders HTML at **build time**; **SSR** renders **per request** on the server; **ISR** serves static pages but **regenerates** them in the background; **CSR** renders in the **browser**. The App Router picks **static or dynamic** per route automatically based on the data/APIs you use.

<svg class='iq-diagram' viewBox='0 0 460 160' role='img' aria-label='Four rendering strategies on a build-time to request-time spectrum'>
  <rect class='d-box-accent' x='12' y='50' width='100' height='60' rx='8'/><text class='d-text' x='62' y='74' text-anchor='middle'>SSG</text><text class='d-sub' x='62' y='92' text-anchor='middle'>build time</text>
  <rect class='d-box' x='120' y='50' width='100' height='60' rx='8'/><text class='d-text' x='170' y='74' text-anchor='middle'>ISR</text><text class='d-sub' x='170' y='92' text-anchor='middle'>static + revalidate</text>
  <rect class='d-box' x='228' y='50' width='100' height='60' rx='8'/><text class='d-text' x='278' y='74' text-anchor='middle'>SSR</text><text class='d-sub' x='278' y='92' text-anchor='middle'>per request</text>
  <rect class='d-box-muted' x='336' y='50' width='110' height='60' rx='8'/><text class='d-text' x='391' y='74' text-anchor='middle'>CSR</text><text class='d-sub' x='391' y='92' text-anchor='middle'>in browser</text>
  <text class='d-sub' x='62' y='134' text-anchor='middle'>fastest/cacheable</text>
  <text class='d-sub' x='391' y='134' text-anchor='middle'>most dynamic</text>
</svg>

**How it works.** **SSG** is ideal for content that's the same for everyone (marketing, docs) — HTML is built once and served from a CDN, so it's the fastest. **ISR** keeps that speed but lets pages update (time-based or on-demand) without a full rebuild. **SSR** runs on each request, needed when output depends on the request (auth, personalization, always-fresh data) — slower but dynamic. **CSR** renders client-side after JS loads (good for highly interactive, behind-auth dashboards where SEO doesn't matter). In the App Router you rarely choose explicitly: using cookies/headers or uncached fetches makes a route SSR, otherwise it's SSG, and <code>revalidate</code> turns on ISR.

### Strategy trade-offs
| Strategy | When | Trade-off |
| --- | --- | --- |
| SSG | static content | fast, but stale until rebuild |
| ISR | semi-static | fresh-ish + fast |
| SSR | per-request/personalized | dynamic, slower |
| CSR | interactive, post-auth | poor SEO, needs JS |

> **Interview tip:** Tie each to a use case (SSG=marketing, ISR=blog, SSR=dashboard/auth, CSR=app shell) and stress that the **App Router auto-selects** static vs dynamic from your data usage.`,
    examples: [
      {
        label: "Choosing the strategy via fetch/segment config",
        tech: "tsx",
        runnable: false,
        code: `// SSG (default): cached at build
const a = await fetch('https://api/x');
// ISR: revalidate every 60s
const b = await fetch('https://api/x', { next: { revalidate: 60 } });
// SSR: never cache → dynamic per request
const c = await fetch('https://api/x', { cache: 'no-store' });
// Force a whole route dynamic:
export const dynamic = 'force-dynamic';`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the difference between Server Components and Client Components in Next.js?",
    answer: `**TL;DR.** **Server Components** render on the **server**, can access the backend directly, and ship **no JavaScript** to the browser — they're the **default** in the App Router. **Client Components** (<code>'use client'</code>) run in the browser and enable **state, effects, and event handlers**. You compose them, pushing interactivity to the leaves.

<svg class='iq-diagram' viewBox='0 0 460 160' role='img' aria-label='Server Components render server-side, Client Components hydrate in browser'>
  <rect class='d-box-accent' x='20' y='30' width='200' height='115' rx='10'/>
  <text class='d-text' x='120' y='54' text-anchor='middle'>Server Component</text>
  <text class='d-sub' x='120' y='78' text-anchor='middle'>runs on server (default)</text>
  <text class='d-sub' x='120' y='98' text-anchor='middle'>DB/secrets access</text>
  <text class='d-sub' x='120' y='118' text-anchor='middle'>0 KB client JS</text>
  <rect class='d-box-muted' x='240' y='30' width='200' height='115' rx='10'/>
  <text class='d-text' x='340' y='54' text-anchor='middle'>Client Component</text>
  <text class='d-sub' x='340' y='78' text-anchor='middle'>'use client'</text>
  <text class='d-sub' x='340' y='98' text-anchor='middle'>state, effects, events</text>
  <text class='d-sub' x='340' y='118' text-anchor='middle'>hydrates in browser</text>
</svg>

**How it works.** Server Components execute during rendering on the server; they can <code>await</code> data, read secrets, and query databases without exposing any of it to the client, and they contribute **no bundle weight**. Anything needing **interactivity** — <code>useState</code>, <code>useEffect</code>, event handlers, browser APIs — must be a Client Component, opted in with <code>'use client'</code>. The best pattern keeps most of the tree as Server Components and isolates interactive bits into small Client Component **leaves** (a button, a form), minimizing the JS shipped. Props passed from server to client must be **serializable**.

### Server vs Client
| | Server Component | Client Component |
| --- | --- | --- |
| Runs | server (default) | browser |
| Hooks/events | ❌ | ✅ |
| Backend/secrets | ✅ direct | ❌ |
| Client JS | none | bundled + hydrated |

> **Interview tip:** Emphasize **server-by-default, opt into client at the leaves**, the **zero-JS** benefit of Server Components, and that secrets/DB access belongs server-side. Props crossing the boundary must be serializable.`,
    examples: [
      {
        label: "Server shell + interactive client leaf",
        tech: "tsx",
        runnable: false,
        code: `// app/page.tsx — Server Component (no 'use client')
import Likes from './likes';
export default async function Page() {
  const post = await getPost();           // server-only data access
  return <article><h1>{post.title}</h1><Likes initial={post.likes} /></article>;
}

// likes.tsx — Client Component (interactivity)
'use client';
import { useState } from 'react';
export default function Likes({ initial }) {
  const [n, setN] = useState(initial);
  return <button onClick={() => setN(n + 1)}>♥ {n}</button>;
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the 'use client' directive and when do you need it?",
    answer: `**TL;DR.** <code>'use client'</code> at the **top of a file** marks it (and every module it imports) as **Client Components**, enabling hooks, state, effects, and browser APIs. You need it whenever a component is **interactive**; keep it at the **leaves** so most of the tree stays server-rendered and ships less JS.

<svg class='iq-diagram' viewBox='0 0 460 160' role='img' aria-label='use client marks the boundary; everything below is client'>
  <rect class='d-box-accent' x='150' y='20' width='160' height='34' rx='8'/><text class='d-text' x='230' y='42' text-anchor='middle'>Server tree (default)</text>
  <path class='d-edge-accent' d='M230 54 V72' marker-end='url(#na1)'/>
  <rect class='d-box-muted' x='120' y='74' width='220' height='30' rx='6'/><text class='d-sub' x='230' y='94' text-anchor='middle'>'use client' boundary</text>
  <path class='d-edge' d='M230 104 V122' marker-end='url(#na1)'/>
  <rect class='d-box' x='150' y='124' width='160' height='30' rx='6'/><text class='d-sub' x='230' y='144' text-anchor='middle'>client subtree (hooks/events)</text>
  <defs><marker id='na1' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** Without the directive, components are **Server Components** and can't use <code>useState</code>/<code>useEffect</code>/event handlers (you'll get an error). Adding <code>'use client'</code> declares a **boundary**: that module and **all modules it imports** become part of the client bundle and hydrate in the browser. Because the directive is **transitive**, placing it high in the tree pulls a lot of code client-side — so put it on the **smallest** interactive components. A Client Component can still **render** Server Components passed to it as <code>children</code>/props, letting you keep server content inside a client shell. Use it for forms, toggles, anything using browser-only APIs (<code>window</code>, <code>localStorage</code>).

### When you need it
| Need | 'use client'? |
| --- | --- |
| <code>useState</code>/<code>useEffect</code> | ✅ |
| <code>onClick</code> / event handlers | ✅ |
| <code>window</code>/<code>localStorage</code> | ✅ |
| just fetch + render | ❌ keep server |

> **Interview tip:** Two key facts: the directive is **transitive** (it covers imported modules), so place it at the **leaves**; and a Client Component can still receive **Server Components as children** to keep content server-rendered.`,
    examples: [
      {
        label: "A minimal client leaf",
        tech: "tsx",
        runnable: false,
        code: `'use client';                 // this file + its imports are client
import { useState } from 'react';

export default function Counter() {
  const [n, setN] = useState(0);            // hooks require 'use client'
  return <button onClick={() => setN(n + 1)}>Count: {n}</button>;
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How does file-based routing work in the Next.js App Router?",
    answer: `**TL;DR.** In the App Router, **folders under <code>app/</code> define URL segments** and a <code>page.js</code> (or <code>.tsx</code>) makes that segment a publicly routable page. **Special files** (<code>layout</code>, <code>loading</code>, <code>error</code>, <code>route</code>) add behavior, and bracket folders like <code>[id]</code> create **dynamic** segments.

<svg class='iq-diagram' viewBox='0 0 460 160' role='img' aria-label='Folder structure maps to URL paths'>
  <rect class='d-box-muted' x='20' y='25' width='200' height='130' rx='10'/>
  <text class='d-sub' x='34' y='48'>app/</text>
  <text class='d-sub' x='50' y='68'>page.tsx → /</text>
  <text class='d-sub' x='50' y='88'>blog/page.tsx → /blog</text>
  <text class='d-sub' x='50' y='108'>blog/[slug]/page.tsx</text>
  <text class='d-sub' x='66' y='126'>→ /blog/:slug</text>
  <path class='d-edge-accent' d='M222 90 H262' marker-end='url(#na2)'/>
  <rect class='d-box-accent' x='264' y='60' width='176' height='60' rx='10'/>
  <text class='d-text' x='352' y='86' text-anchor='middle'>URL routes</text>
  <text class='d-sub' x='352' y='104' text-anchor='middle'>generated from folders</text>
  <defs><marker id='na2' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** The folder path **is** the URL path: <code>app/dashboard/settings/page.tsx</code> serves <code>/dashboard/settings</code>. A folder is only routable once it contains a <code>page</code> (UI) or <code>route</code> (API handler) file — other folders just organize. **Dynamic** segments use brackets: <code>[id]</code> (single), <code>[...slug]</code> (catch-all), <code>[[...slug]]</code> (optional catch-all), with values passed via the <code>params</code> prop. **Route groups** <code>(name)</code> organize without affecting the URL, and **private** folders <code>_name</code> are excluded from routing. Special files compose into the route tree automatically.

### Routing pieces
| File / folder | Role |
| --- | --- |
| <code>page.tsx</code> | routable page UI |
| <code>route.ts</code> | API endpoint |
| <code>[id]</code> | dynamic segment |
| <code>(group)</code> | organize, no URL effect |

> **Interview tip:** Stress **folder = URL segment**, that a route needs a <code>page</code>/<code>route</code> file to be public, and name the dynamic conventions (<code>[id]</code>, <code>[...slug]</code>) plus route groups.`,
    examples: [
      {
        label: "Folder layout → routes",
        tech: "bash",
        runnable: false,
        code: `app/
  page.tsx                 # /
  about/page.tsx           # /about
  blog/
    page.tsx               # /blog
    [slug]/page.tsx        # /blog/:slug   (params.slug)
  (marketing)/
    pricing/page.tsx       # /pricing      (group adds no segment)
  api/users/route.ts       # /api/users    (Route Handler)`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are the special files in the Next.js App Router (page, layout, loading, error)?",
    answer: `**TL;DR.** The App Router recognizes **convention files** per segment: <code>page</code> (route UI), <code>layout</code> (shared shell), <code>loading</code> (Suspense fallback), <code>error</code> (error boundary), <code>not-found</code> (404), <code>route</code> (API handler), and <code>template</code> (re-mounting layout). Next.js wires them into the route tree automatically.

<svg class='iq-diagram' viewBox='0 0 460 170' role='img' aria-label='Special files wrap the page in layout, loading and error boundaries'>
  <rect class='d-box-muted' x='30' y='20' width='400' height='140' rx='10'/>
  <text class='d-sub' x='45' y='40'>layout.tsx (shared shell)</text>
  <rect class='d-box' x='55' y='48' width='350' height='100' rx='8'/>
  <text class='d-sub' x='70' y='68'>error.tsx (boundary)</text>
  <rect class='d-box' x='80' y='76' width='300' height='64' rx='8'/>
  <text class='d-sub' x='95' y='96'>loading.tsx (Suspense fallback)</text>
  <rect class='d-box-accent' x='110' y='104' width='240' height='28' rx='6'/>
  <text class='d-text' x='230' y='123' text-anchor='middle'>page.tsx (the route UI)</text>
</svg>

**How it works.** Each segment can declare these files and Next.js **nests** them: a <code>layout</code> wraps its segment and children (persisting across navigation), <code>template</code> is like a layout but re-mounts per navigation, <code>loading</code> auto-creates a **Suspense** boundary so a fallback streams while the page's data loads, <code>error</code> creates a client **error boundary** with a <code>reset()</code>, and <code>not-found</code> renders 404 UI (triggered by <code>notFound()</code>). <code>route.ts</code> turns a folder into an **API endpoint** instead of a page. This convention removes boilerplate — you just drop in the file and the framework composes the boundaries.

### Convention files
| File | Purpose |
| --- | --- |
| <code>page</code> / <code>route</code> | page UI / API handler |
| <code>layout</code> / <code>template</code> | persistent / re-mounting shell |
| <code>loading</code> | Suspense fallback |
| <code>error</code> / <code>not-found</code> | error boundary / 404 |

> **Interview tip:** Show you know each maps to a **React primitive**: <code>loading</code>→Suspense, <code>error</code>→error boundary, <code>layout</code>→persistent wrapper. They nest by folder automatically.`,
    examples: [
      {
        label: "A segment's convention files",
        tech: "bash",
        runnable: false,
        code: `app/dashboard/
  layout.tsx      # shared shell (sidebar/nav)
  template.tsx    # re-mounts each navigation (optional)
  loading.tsx     # streamed fallback while page data loads
  error.tsx       # 'use client' error boundary with reset()
  not-found.tsx   # 404 UI for this segment
  page.tsx        # the actual /dashboard UI`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is hydration in Next.js and what causes a hydration error?",
    answer: `**TL;DR.** **Hydration** is when React **attaches event handlers and state** to the server-rendered HTML on the client, making the static markup interactive. A **hydration error** occurs when the **client render differs** from the server HTML — e.g. using <code>Date.now()</code>, random values, or browser-only APIs during render — so the two trees don't match.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Server HTML hydrated by client React; mismatch causes an error'>
  <rect class='d-box-accent' x='20' y='52' width='120' height='46' rx='8'/><text class='d-text' x='80' y='73' text-anchor='middle'>server HTML</text><text class='d-sub' x='80' y='90' text-anchor='middle'>static markup</text>
  <path class='d-edge-accent' d='M142 75 H200' marker-end='url(#na3)'/>
  <text class='d-sub' x='171' y='66' text-anchor='middle'>hydrate</text>
  <rect class='d-box' x='202' y='52' width='130' height='46' rx='8'/><text class='d-text' x='267' y='73' text-anchor='middle'>client React</text><text class='d-sub' x='267' y='90' text-anchor='middle'>attaches handlers</text>
  <path class='d-edge-dashed' d='M334 75 H392' marker-end='url(#na3)'/>
  <rect class='d-box-muted' x='394' y='52' width='56' height='46' rx='8'/><text class='d-sub' x='422' y='79' text-anchor='middle'>mismatch ⚠</text>
  <defs><marker id='na3' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** Next.js sends server-rendered HTML so the page is visible immediately; then React **hydrates** it — reusing the existing DOM and wiring up interactivity rather than re-creating it. For this to work, the **first client render must produce the same tree** the server did. Mismatches happen when render output depends on something that differs between server and client: non-deterministic values (<code>Math.random()</code>, <code>Date.now()</code>, locale-dependent formatting), reading <code>window</code>/<code>localStorage</code> during render, or invalid HTML nesting. Fixes: render such values in a <code>useEffect</code> (client-only after mount), gate on a <code>mounted</code> flag, use <code>suppressHydrationWarning</code> for intentionally-differing nodes (like timestamps), or move browser-only logic out of the initial render.

### Common causes & fixes
| Cause | Fix |
| --- | --- |
| <code>Date.now()</code>/random in render | compute in <code>useEffect</code> |
| <code>window</code>/<code>localStorage</code> at render | read after mount |
| locale/timezone formatting | render client-side / fixed locale |
| invalid HTML nesting | fix the markup |

> **Interview tip:** Define hydration as **attaching interactivity to server HTML**, and that errors come from **server/client render divergence**. Cite <code>Date.now()</code>/<code>window</code> at render time and the <code>useEffect</code>/<code>suppressHydrationWarning</code> fixes.`,
    examples: [
      {
        label: "Avoiding a hydration mismatch",
        tech: "tsx",
        runnable: false,
        code: `'use client';
import { useState, useEffect } from 'react';

export default function Clock() {
  const [time, setTime] = useState<string | null>(null);
  // ✅ compute browser-only value AFTER mount, not during render
  useEffect(() => setTime(new Date().toLocaleTimeString()), []);
  return <span suppressHydrationWarning>{time ?? 'loading…'}</span>;
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are layouts and nested layouts in the Next.js App Router?",
    answer: `**TL;DR.** A <code>layout.tsx</code> wraps its segment **and all child segments** with shared UI (nav, sidebar) and **persists across navigation** without re-rendering or losing state. Layouts **nest** by folder hierarchy, so each level adds its own shell around the children below it.

<svg class='iq-diagram' viewBox='0 0 460 160' role='img' aria-label='Root layout wraps a section layout which wraps the page'>
  <rect class='d-box-muted' x='30' y='20' width='400' height='130' rx='10'/>
  <text class='d-sub' x='45' y='40'>root layout (html/body, nav)</text>
  <rect class='d-box' x='60' y='50' width='340' height='90' rx='8'/>
  <text class='d-sub' x='75' y='70'>dashboard layout (sidebar)</text>
  <rect class='d-box-accent' x='90' y='80' width='280' height='50' rx='8'/>
  <text class='d-text' x='230' y='102' text-anchor='middle'>page (changes on navigation)</text>
  <text class='d-sub' x='230' y='120' text-anchor='middle'>layouts above persist</text>
</svg>

**How it works.** A layout is a component that receives <code>children</code> (the active page or nested layout) and renders shared chrome around them. The **root layout** (<code>app/layout.tsx</code>) is required and defines <code>&lt;html&gt;</code>/<code>&lt;body&gt;</code>. As you navigate **within** a layout's subtree, the layout **stays mounted** — its state, scroll position, and any client components persist — while only the changing page swaps in. This nesting mirrors the folder structure, so <code>/dashboard/settings</code> is wrapped by the root layout, then the dashboard layout, then renders the settings page. Layouts are Server Components by default and can fetch their own data. (They don't receive <code>searchParams</code> — use the page for that.)

### Layout facts
| Aspect | Detail |
| --- | --- |
| Wraps | its segment + all children |
| Persistence | stays mounted across nav |
| Root layout | required, defines html/body |
| Nesting | follows folder hierarchy |

> **Interview tip:** The standout point: layouts **persist across navigation** (state/scroll preserved), unlike the page which swaps. Note the **required root layout** and that nesting follows folders.`,
    examples: [
      {
        label: "Root + nested layout",
        tech: "tsx",
        runnable: false,
        code: `// app/layout.tsx (root — required)
export default function RootLayout({ children }) {
  return <html><body><nav>…</nav>{children}</body></html>;
}

// app/dashboard/layout.tsx (nested — adds a sidebar, persists across /dashboard/*)
export default function DashboardLayout({ children }) {
  return <div className="grid"><aside>sidebar</aside><main>{children}</main></div>;
}`,
      },
    ],
  },
];

export default augments;
