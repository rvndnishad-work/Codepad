/**
 * Next.js Phase — Batch 6 (Route Handlers, Middleware, runtimes, SEO).
 * See nextjs-augments-gold-1.ts for conventions.
 */
import type { NextAugment } from "./nextjs-augments.types";

const augments: NextAugment[] = [
  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are Route Handlers in Next.js and how do they differ from Pages API routes?",
    answer: `**TL;DR.** **Route Handlers** (<code>route.ts</code> in the App Router) define HTTP endpoints with **named verb exports** (<code>GET</code>, <code>POST</code>…) using the **Web <code>Request</code>/<code>Response</code>** APIs. Unlike Pages API routes (Node <code>req</code>/<code>res</code> objects), they're **Web-standard**, run on **Node or Edge**, and live in the <code>app/</code> tree.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Pages API req/res versus App Router Web Request/Response handlers'>
  <rect class='d-box-muted' x='20' y='30' width='200' height='100' rx='10'/><text class='d-text' x='120' y='54' text-anchor='middle'>Pages API route</text><text class='d-sub' x='120' y='78' text-anchor='middle'>(req, res) Node objects</text><text class='d-sub' x='120' y='98' text-anchor='middle'>res.status().json()</text><text class='d-sub' x='120' y='118' text-anchor='middle'>pages/api/*</text>
  <rect class='d-box-accent' x='240' y='30' width='200' height='100' rx='10'/><text class='d-text' x='340' y='54' text-anchor='middle'>Route Handler</text><text class='d-sub' x='340' y='78' text-anchor='middle'>GET/POST(request)</text><text class='d-sub' x='340' y='98' text-anchor='middle'>return Response</text><text class='d-sub' x='340' y='118' text-anchor='middle'>app/**/route.ts</text>
</svg>

**How it works.** In the App Router you create an API endpoint by adding a <code>route.ts</code> to a folder (no <code>page.tsx</code> in the same folder) and **exporting functions named after HTTP methods** — <code>GET</code>, <code>POST</code>, <code>PUT</code>, <code>DELETE</code>, etc. Each receives a standard Web **<code>Request</code>** and returns a Web **<code>Response</code>** (or <code>NextResponse</code>), the same primitives used in browsers/edge runtimes — so the code is portable and future-proof, versus the Pages Router's Node-specific <code>(req, res)</code> API. Route Handlers can run on the **Node.js or Edge** runtime (via <code>runtime</code> config), support **streaming**, and participate in caching (with Next 15, <code>GET</code> handlers are uncached by default). Use them for webhooks, public/mobile APIs, OAuth callbacks, and any HTTP contract; for your own UI mutations prefer Server Actions.

### Route Handler vs Pages API
| | Pages API | Route Handler |
| --- | --- | --- |
| Signature | <code>(req, res)</code> Node | <code>METHOD(request)</code> Web |
| Return | <code>res.json()</code> | <code>Response</code> |
| Location | <code>pages/api</code> | <code>app/**/route.ts</code> |
| Runtime | Node | Node or Edge |

> **Interview tip:** Emphasize **Web-standard <code>Request</code>/<code>Response</code>** and **method-named exports**, portability to Edge, and that <code>route.ts</code> replaces <code>pages/api</code> in the App Router.`,
    examples: [
      {
        label: "GET + POST handler",
        tech: "tsx",
        runnable: false,
        code: `// app/api/todos/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(await db.todo.findMany());
}
export async function POST(request: Request) {
  const body = await request.json();
  const todo = await db.todo.create({ data: body });
  return NextResponse.json(todo, { status: 201 });
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you read request data and return responses in a Next.js Route Handler?",
    answer: `**TL;DR.** A handler receives a standard <code>Request</code>: use <code>await request.json()</code>/<code>formData()</code>, <code>request.nextUrl.searchParams</code>, <code>cookies()</code>, and <code>headers()</code>. Return a <code>Response</code> or <code>NextResponse</code> (e.g. <code>NextResponse.json(data, { status })</code>). Dynamic **params** come from the **second argument**.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Handler reads body/query/params and returns a Response'>
  <rect class='d-box' x='20' y='40' width='130' height='28' rx='6'/><text class='d-sub' x='85' y='59' text-anchor='middle'>request.json()</text>
  <rect class='d-box' x='20' y='74' width='130' height='28' rx='6'/><text class='d-sub' x='85' y='93' text-anchor='middle'>searchParams</text>
  <rect class='d-box' x='20' y='108' width='130' height='28' rx='6'/><text class='d-sub' x='85' y='127' text-anchor='middle'>params (2nd arg)</text>
  <path class='d-edge-accent' d='M152 88 H210' marker-end='url(#nf1)'/>
  <rect class='d-box-accent' x='212' y='66' width='150' height='44' rx='8'/><text class='d-text' x='287' y='92' text-anchor='middle'>NextResponse.json</text>
  <defs><marker id='nf1' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** Because handlers use Web standards, you parse the incoming **<code>Request</code>** with its methods: <code>await request.json()</code> for JSON bodies, <code>await request.formData()</code> for form posts, and read the query string via <code>request.nextUrl.searchParams</code> (or <code>new URL(request.url).searchParams</code>). For cookies/headers use the <code>next/headers</code> helpers <code>cookies()</code>/<code>headers()</code> (async in Next 15). **Dynamic route params** (from <code>[id]</code> folders) arrive in the handler's **second argument** as <code>{ params }</code>. You respond by returning a **<code>Response</code>** or the enhanced **<code>NextResponse</code>**: <code>NextResponse.json(data, { status: 201, headers })</code>, redirects with <code>NextResponse.redirect()</code>, or a streamed <code>Response</code> body. Set caching via segment config or headers. Always validate the parsed input (zod) before use.

### Read / write toolkit
| Need | API |
| --- | --- |
| JSON body | <code>await request.json()</code> |
| query string | <code>request.nextUrl.searchParams</code> |
| route params | 2nd arg <code>{ params }</code> |
| respond | <code>NextResponse.json(data, { status })</code> |

> **Interview tip:** Know the Web-standard reads (<code>request.json()</code>/<code>formData()</code>, <code>searchParams</code>) and that **dynamic params come from the second argument** — a common thing people forget vs Pages' <code>req.query</code>.`,
    examples: [
      {
        label: "Dynamic param + query + JSON response",
        tech: "tsx",
        runnable: false,
        code: `// app/api/users/[id]/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request,
  { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;                           // dynamic segment
  const q = request.nextUrl.searchParams.get('fields');  // query string
  const user = await db.user.find(id);
  if (!user) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(user);
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is Middleware in Next.js and what can it do?",
    answer: `**TL;DR.** <code>middleware.ts</code> runs on **every matching request before rendering**, on the **Edge runtime**. Use it for **auth gating, redirects/rewrites, A/B testing, geolocation, setting headers/cookies** — but keep it **lightweight** (no DB, no heavy work) since it runs on the hot path.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Middleware intercepts requests before they reach routes'>
  <rect class='d-box-accent' x='20' y='52' width='110' height='46' rx='8'/><text class='d-text' x='75' y='78' text-anchor='middle'>request</text>
  <path class='d-edge-accent' d='M132 75 H180' marker-end='url(#nf2)'/>
  <rect class='d-box' x='182' y='45' width='120' height='60' rx='8'/><text class='d-text' x='242' y='70' text-anchor='middle'>middleware</text><text class='d-sub' x='242' y='88' text-anchor='middle'>redirect/rewrite/headers</text>
  <path class='d-edge-accent' d='M304 75 H352' marker-end='url(#nf2)'/>
  <rect class='d-box-muted' x='354' y='52' width='96' height='46' rx='8'/><text class='d-sub' x='402' y='79' text-anchor='middle'>route / page</text>
  <defs><marker id='nf2' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** Middleware is a single <code>middleware.ts</code> at the project root exporting a function that receives the request and returns a <code>NextResponse</code>. It runs **before** the cache/render for requests matching its <code>config.matcher</code>, on the **Edge** (globally distributed, fast, but a **limited API** — no Node modules, no DB drivers). Typical jobs: check a session cookie and <code>NextResponse.redirect</code> unauthenticated users to <code>/login</code>; **rewrite** URLs (proxying/localization) without changing the address bar; set request/response **headers** or cookies (security headers, feature flags); route **A/B** variants; and read **geolocation** to localize. Keep it **fast and minimal** — it's on every request's critical path — so do heavy authorization/data work in the route/Server Component, using middleware only for cheap gating and edge decisions. Use <code>matcher</code> to scope it (skip static assets).

### Middleware uses
| Use | Example |
| --- | --- |
| auth gating | redirect if no session cookie |
| rewrites | localization/proxy |
| headers/cookies | security headers, flags |
| geo/A-B | variant routing |

> **Interview tip:** Stress it runs **before rendering, on the Edge, with a limited API** — so keep it lightweight (no DB). Great for **auth redirects and rewrites**; scope it with <code>matcher</code>.`,
    examples: [
      {
        label: "Auth gate with a matcher",
        tech: "tsx",
        runnable: false,
        code: `// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const token = req.cookies.get('session')?.value;
  if (!token) return NextResponse.redirect(new URL('/login', req.url));
  return NextResponse.next();
}
export const config = { matcher: ['/dashboard/:path*', '/settings/:path*'] };`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What runtimes does Next.js support (Node.js vs Edge runtime)?",
    answer: `**TL;DR.** The **Node.js runtime** supports all Node APIs and is the **default** for rendering/handlers. The **Edge runtime** is a lightweight, **globally-distributed** V8 environment with **low cold starts** and a **limited API subset** (no native Node modules) — ideal for **Middleware** and latency-sensitive handlers.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Node runtime full APIs versus Edge runtime lightweight global'>
  <rect class='d-box-accent' x='20' y='30' width='200' height='100' rx='10'/><text class='d-text' x='120' y='54' text-anchor='middle'>Node.js runtime</text><text class='d-sub' x='120' y='78' text-anchor='middle'>full Node APIs</text><text class='d-sub' x='120' y='98' text-anchor='middle'>DB drivers, fs</text><text class='d-sub' x='120' y='118' text-anchor='middle'>default</text>
  <rect class='d-box-muted' x='240' y='30' width='200' height='100' rx='10'/><text class='d-text' x='340' y='54' text-anchor='middle'>Edge runtime</text><text class='d-sub' x='340' y='78' text-anchor='middle'>Web APIs only</text><text class='d-sub' x='340' y='98' text-anchor='middle'>fast cold start, global</text><text class='d-sub' x='340' y='118' text-anchor='middle'>Middleware default</text>
</svg>

**How it works.** **Node.js runtime** gives you the complete Node standard library and ecosystem (native modules, <code>fs</code>, most DB drivers, larger memory) — the right default for full-featured server rendering and handlers, at the cost of slower cold starts on serverless. **Edge runtime** runs on a V8-based, Web-standard environment deployed **close to users** worldwide, with very **fast cold starts** and low latency, but a **restricted API** (only Web APIs — no <code>fs</code>, no native Node modules, limited/streaming-friendly patterns, smaller limits). You choose per route/handler with <code>export const runtime = 'edge' | 'nodejs'</code>; **Middleware always runs on the Edge**. Pick Edge for cheap, global, latency-sensitive logic (geo, auth checks, simple transforms) and Node for anything needing full Node APIs or heavy libraries. Verify your dependencies are Edge-compatible before switching.

### Node vs Edge
| | Node.js | Edge |
| --- | --- | --- |
| APIs | full Node | Web-standard subset |
| Cold start | slower | very fast |
| Location | region | global |
| Use for | full rendering/handlers | middleware/geo/low-latency |

> **Interview tip:** Contrast **full Node APIs (default)** vs **fast, global, limited Edge**. Middleware is **always Edge**; switch handlers with <code>export const runtime</code> — but check dependency compatibility.`,
    examples: [
      {
        label: "Opt a handler into the Edge runtime",
        tech: "tsx",
        runnable: false,
        code: `// app/api/geo/route.ts
export const runtime = 'edge';        // globally distributed, fast cold start

export function GET(request: Request) {
  const country = request.headers.get('x-vercel-ip-country') ?? 'US';
  return Response.json({ country });
}
// Note: no 'fs', no native Node modules here — Web APIs only.`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How does the Metadata API work in Next.js (static and generateMetadata)?",
    answer: `**TL;DR.** Export a **static <code>metadata</code> object** or an **async <code>generateMetadata()</code>** from a layout/page; Next.js renders the matching <code>&lt;title&gt;</code>, <code>meta</code>, **Open Graph**, and canonical tags. <code>generateMetadata</code> can **fetch data** (deduped with the page) to build dynamic, per-route SEO.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Metadata export renders head tags for the route'>
  <rect class='d-box-accent' x='20' y='45' width='170' height='60' rx='8'/><text class='d-text' x='105' y='70' text-anchor='middle'>metadata /</text><text class='d-sub' x='105' y='88' text-anchor='middle'>generateMetadata()</text>
  <path class='d-edge-accent' d='M192 75 H250' marker-end='url(#nf3)'/>
  <rect class='d-box' x='252' y='40' width='190' height='70' rx='8'/><text class='d-text' x='347' y='66' text-anchor='middle'>&lt;head&gt; tags</text><text class='d-sub' x='347' y='84' text-anchor='middle'>title, meta, OG, canonical</text>
  <defs><marker id='nf3' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** The App Router manages the document head for you — you never write <code>&lt;head&gt;</code> manually. For **static** metadata, export a <code>metadata</code> object (title, description, <code>openGraph</code>, <code>twitter</code>, <code>alternates.canonical</code>, robots) from a <code>layout</code>/<code>page</code>. For **dynamic** metadata (title from a fetched post), export an async <code>generateMetadata({ params })</code> that returns the object — its <code>fetch</code> calls are **deduped** with the page's (request memoization), so no double fetching. Metadata from nested layouts/pages is **merged** (children override parents), and you can define <code>title.template</code> for suffixing. There's also **file-based** metadata: <code>favicon.ico</code>, <code>opengraph-image</code>, <code>sitemap.ts</code>, <code>robots.ts</code>. This gives clean, per-route SEO with correct server-rendered tags crawlers see immediately.

### Metadata options
| Form | Use |
| --- | --- |
| static <code>metadata</code> | fixed head tags |
| <code>generateMetadata()</code> | dynamic per-route (fetch) |
| <code>title.template</code> | consistent suffix |
| file-based | og-image/sitemap/robots |

> **Interview tip:** Two facts: <code>generateMetadata</code>'s fetches are **deduped** with the page (no extra request), and metadata **merges** across nested layouts. Mention file-based metadata (og-image/sitemap).`,
    examples: [
      {
        label: "Static + dynamic metadata",
        tech: "tsx",
        runnable: false,
        code: `// static (layout.tsx)
export const metadata = {
  title: { default: 'My Site', template: '%s | My Site' },
  description: 'Welcome',
};

// dynamic (blog/[slug]/page.tsx) — fetch deduped with the page
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = await getPost(slug);
  return { title: post.title, openGraph: { images: [post.cover] } };
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you implement dynamic Open Graph images in Next.js (ImageResponse)?",
    answer: `**TL;DR.** An <code>opengraph-image.tsx</code> file (or the <code>ImageResponse</code> API from <code>next/og</code>) **renders JSX/CSS to a PNG** on demand, so you generate **per-page social share images** with dynamic content (title, author) — no design tool or external service.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='JSX rendered to a PNG at the edge for social cards'>
  <rect class='d-box-accent' x='20' y='52' width='140' height='46' rx='8'/><text class='d-text' x='90' y='73' text-anchor='middle'>JSX + data</text><text class='d-sub' x='90' y='90' text-anchor='middle'>title, author</text>
  <path class='d-edge-accent' d='M162 75 H220' marker-end='url(#nf4)'/>
  <rect class='d-box' x='222' y='52' width='130' height='46' rx='8'/><text class='d-text' x='287' y='73' text-anchor='middle'>ImageResponse</text><text class='d-sub' x='287' y='90' text-anchor='middle'>renders → PNG</text>
  <path class='d-edge-accent' d='M354 75 H402' marker-end='url(#nf4)'/>
  <rect class='d-box-muted' x='404' y='52' width='46' height='46' rx='8'/><text class='d-sub' x='427' y='79' text-anchor='middle'>OG img</text>
  <defs><marker id='nf4' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** Social platforms show a preview card from the <code>og:image</code> meta tag. Instead of hand-designing one per page, Next.js lets you **generate** it: add an <code>opengraph-image.tsx</code> (or <code>twitter-image.tsx</code>) to a route that default-exports a function returning an <code>ImageResponse</code> — you write **JSX with a CSS subset**, pull in dynamic data (the post's title, cover, stats), and Next renders it to a **PNG** at request time (on the Edge via Satori/resvg under the hood). The framework wires the correct <code>og:image</code> URL and size into the metadata automatically. You can size it, use custom fonts, and cache it. This produces rich, branded, **per-page** share images (great for CTR on social) with just code. For fully static needs you can also point <code>metadata.openGraph.images</code> at a static file.

### Dynamic OG image pieces
| Piece | Role |
| --- | --- |
| <code>opengraph-image.tsx</code> | route-level generated image |
| <code>ImageResponse</code> (next/og) | JSX/CSS → PNG |
| dynamic data | per-page title/cover |
| auto-wired meta | correct <code>og:image</code> tag |

> **Interview tip:** Say you render **JSX→PNG with <code>ImageResponse</code>** (Satori) at the edge for **per-page** social cards, and that the <code>opengraph-image</code> convention auto-wires the meta tag. Note the CSS subset + custom fonts.`,
    examples: [
      {
        label: "Generated OG image for a post",
        tech: "tsx",
        runnable: false,
        code: `// app/blog/[slug]/opengraph-image.tsx
import { ImageResponse } from 'next/og';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OG({ params }) {
  const post = await getPost((await params).slug);
  return new ImageResponse(
    <div style={{ display: 'flex', fontSize: 64, padding: 60 }}>{post.title}</div>,
    size,
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do sitemap.ts and robots.ts work in Next.js?",
    answer: `**TL;DR.** <code>app/sitemap.ts</code> exports a function returning your URLs (with <code>lastModified</code>, priority) and Next.js serves <code>/sitemap.xml</code>; <code>app/robots.ts</code> returns rules and serves <code>/robots.txt</code>. Both can be **dynamic** (fetch routes from a DB) and are generated at build or on request.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='sitemap.ts and robots.ts generate xml and txt endpoints'>
  <rect class='d-box-accent' x='20' y='40' width='170' height='34' rx='8'/><text class='d-sub' x='105' y='62' text-anchor='middle'>app/sitemap.ts</text>
  <path class='d-edge-accent' d='M192 57 H250' marker-end='url(#nf5)'/>
  <rect class='d-box' x='252' y='40' width='180' height='34' rx='8'/><text class='d-sub' x='342' y='62' text-anchor='middle'>/sitemap.xml</text>
  <rect class='d-box-accent' x='20' y='90' width='170' height='34' rx='8'/><text class='d-sub' x='105' y='112' text-anchor='middle'>app/robots.ts</text>
  <path class='d-edge-accent' d='M192 107 H250' marker-end='url(#nf5)'/>
  <rect class='d-box' x='252' y='90' width='180' height='34' rx='8'/><text class='d-sub' x='342' y='112' text-anchor='middle'>/robots.txt</text>
  <defs><marker id='nf5' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** These are **file-based metadata** conventions. <code>sitemap.ts</code> default-exports a function returning an array of <code>{ url, lastModified, changeFrequency, priority }</code> entries; Next.js turns it into a valid <code>/sitemap.xml</code> so crawlers discover and prioritize your pages. Because it's code, you can **generate it dynamically** — fetch all blog slugs/product ids from your DB/CMS and map them to entries (with pagination/sitemap-index for very large sites). <code>robots.ts</code> default-exports rules (<code>{ rules: { userAgent, allow, disallow }, sitemap }</code>) served as <code>/robots.txt</code>, controlling crawler access and pointing to the sitemap. Both integrate with the Metadata system, respect your <code>metadataBase</code> for absolute URLs, and can be static or revalidated. Together with the Metadata API and SSR, they round out Next.js's strong SEO story.

### File-based SEO endpoints
| File | Serves | Purpose |
| --- | --- | --- |
| <code>sitemap.ts</code> | <code>/sitemap.xml</code> | list/prioritize URLs |
| <code>robots.ts</code> | <code>/robots.txt</code> | crawler rules + sitemap ref |
| dynamic | DB-driven entries | large/changing sites |

> **Interview tip:** Note both are **code** so you can generate entries from your data source, and mention <code>metadataBase</code> for absolute URLs plus sitemap **index/pagination** for large sites.`,
    examples: [
      {
        label: "Dynamic sitemap + robots",
        tech: "tsx",
        runnable: false,
        code: `// app/sitemap.ts
import type { MetadataRoute } from 'next';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getAllPosts();
  return posts.map((p) => ({ url: \`https://site.com/blog/\${p.slug}\`, lastModified: p.updatedAt }));
}

// app/robots.ts
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', allow: '/', disallow: '/admin' },
           sitemap: 'https://site.com/sitemap.xml' };
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How does Next.js handle SEO compared to a client-rendered SPA?",
    answer: `**TL;DR.** Because Next.js renders **HTML on the server** (SSR/SSG), crawlers get **fully-formed content and metadata on first request** — unlike a client-rendered SPA where bots may see an **empty shell** until JS runs. Plus the **Metadata API, sitemaps, and fast loads** boost rankings.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='SPA sends empty shell to crawler; Next.js sends full HTML'>
  <rect class='d-box-muted' x='20' y='30' width='200' height='100' rx='10'/><text class='d-text' x='120' y='54' text-anchor='middle'>SPA (CSR)</text><text class='d-sub' x='120' y='78' text-anchor='middle'>empty &lt;div id=root&gt;</text><text class='d-sub' x='120' y='98' text-anchor='middle'>content after JS</text><text class='d-sub' x='120' y='118' text-anchor='middle'>weaker/slower for bots</text>
  <rect class='d-box-accent' x='240' y='30' width='200' height='100' rx='10'/><text class='d-text' x='340' y='54' text-anchor='middle'>Next.js (SSR/SSG)</text><text class='d-sub' x='340' y='78' text-anchor='middle'>full HTML + meta</text><text class='d-sub' x='340' y='98' text-anchor='middle'>crawlable immediately</text><text class='d-sub' x='340' y='118' text-anchor='middle'>fast, indexable</text>
</svg>

**How it works.** Search engines index the HTML they receive. A pure client-rendered SPA ships a near-empty HTML shell and builds the page in the browser; while Google can execute JS, it's **slower, best-effort, and unreliable** for other crawlers/social scrapers — and metadata set client-side often isn't seen. Next.js **renders on the server**, so the first response already contains the real content, correct <code>&lt;title&gt;</code>/meta/OG tags (via the **Metadata API**), and structured data — everything a crawler needs immediately, per URL. It also improves the **Core Web Vitals** (fast FCP/LCP via streaming, image/font optimization) that factor into ranking, and provides **sitemap/robots** conventions and canonical URLs. Net: real routes, real HTML, real metadata — the SEO baseline SPAs struggle to match without extra SSR/prerendering infrastructure.

### SEO: SPA vs Next.js
| Factor | SPA (CSR) | Next.js |
| --- | --- | --- |
| First HTML | empty shell | full content |
| Metadata | client-set, risky | server-rendered |
| Crawlability | JS-dependent | immediate |
| Web Vitals | often worse | optimized |

> **Interview tip:** The core point: **server-rendered HTML + metadata that crawlers see on first request**, vs a SPA's empty shell. Add Web Vitals, sitemap/robots, and canonical support as reinforcing wins.`,
    examples: [
      {
        label: "What a crawler receives",
        tech: "bash",
        runnable: false,
        code: `# SPA (CSR): first response is basically empty
<body><div id="root"></div><script src="/bundle.js"></script></body>

# Next.js (SSR/SSG): first response has real content + metadata
<head><title>My Post | Site</title><meta property="og:title" ...></head>
<body><article><h1>My Post</h1><p>Full text here…</p></article></body>`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is JSON-LD structured data and how do you add it in Next.js?",
    answer: `**TL;DR.** **JSON-LD** is schema.org **structured data** that helps search engines understand your content (articles, products, FAQs) and show **rich results**. In Next.js you render a <code>&lt;script type="application/ld+json"&gt;</code> with the JSON in a **Server Component**, often built from the same data as the page.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='JSON-LD script describes the page for rich search results'>
  <rect class='d-box-accent' x='20' y='45' width='170' height='60' rx='8'/><text class='d-text' x='105' y='70' text-anchor='middle'>page data</text><text class='d-sub' x='105' y='88' text-anchor='middle'>article/product</text>
  <path class='d-edge-accent' d='M192 75 H250' marker-end='url(#nf6)'/>
  <rect class='d-box' x='252' y='40' width='190' height='70' rx='8'/><text class='d-text' x='347' y='66' text-anchor='middle'>ld+json script</text><text class='d-sub' x='347' y='84' text-anchor='middle'>schema.org → rich results</text>
  <defs><marker id='nf6' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** Rich results (star ratings, FAQ accordions, recipe cards, breadcrumbs) come from machine-readable **structured data** following schema.org vocabularies. **JSON-LD** is Google's recommended format: a JSON blob describing the entity (<code>@context</code>, <code>@type</code>, properties). In Next.js you build the object from the page's data (so it stays in sync) and render it in a <code>&lt;script type="application/ld+json"&gt;</code> using <code>dangerouslySetInnerHTML</code> — do this in a **Server Component** so it's in the initial HTML crawlers read. Because it's just markup, place it in the relevant page/layout. Validate with Google's **Rich Results Test**, keep it **accurate** to visible content (mismatches can incur penalties), and sanitize any user-generated fields to avoid injection. It complements the Metadata API (which handles title/OG) by describing the **semantic entity**.

### JSON-LD in Next.js
| Aspect | Detail |
| --- | --- |
| Format | schema.org JSON-LD |
| Where | <code>&lt;script type="application/ld+json"&gt;</code> |
| Render in | Server Component (initial HTML) |
| Validate | Rich Results Test |

> **Interview tip:** Render it in a **Server Component** so it's in the initial HTML, build it from the **same data** as the page, and **validate** with the Rich Results Test. Note it complements (not replaces) the Metadata API.`,
    examples: [
      {
        label: "Article JSON-LD in a Server Component",
        tech: "tsx",
        runnable: false,
        code: `export default async function Post({ params }) {
  const post = await getPost((await params).slug);
  const ld = {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: post.title, datePublished: post.date, author: { '@type': 'Person', name: post.author },
  };
  return (
    <>
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <article>{post.title}</article>
    </>
  );
}`,
      },
    ],
  },
];

export default augments;
