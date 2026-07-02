/**
 * Next.js Phase — Batch 2 (Routing). See nextjs-augments-gold-1.ts for conventions.
 */
import type { NextAugment } from "./nextjs-augments.types";

const augments: NextAugment[] = [
  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the difference between layout.js and template.js in Next.js?",
    answer: `**TL;DR.** A <code>layout</code> **persists** across navigations and keeps state/DOM. A <code>template</code> **re-mounts a new instance** on every navigation, **resetting** state and re-running effects — useful for enter/exit animations, per-navigation logging, or resetting a form between routes.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='layout persists across navigation, template re-mounts'>
  <rect class='d-box-accent' x='20' y='30' width='200' height='100' rx='10'/>
  <text class='d-text' x='120' y='54' text-anchor='middle'>layout</text>
  <text class='d-sub' x='120' y='78' text-anchor='middle'>stays mounted</text>
  <text class='d-sub' x='120' y='98' text-anchor='middle'>state preserved</text>
  <rect class='d-box-muted' x='240' y='30' width='200' height='100' rx='10'/>
  <text class='d-text' x='340' y='54' text-anchor='middle'>template</text>
  <text class='d-sub' x='340' y='78' text-anchor='middle'>new instance / nav</text>
  <text class='d-sub' x='340' y='98' text-anchor='middle'>state reset, effects re-run</text>
</svg>

**How it works.** Both wrap their segment's children, but they differ in **lifecycle**. A layout is created once and **reused** as you navigate within its subtree, so its DOM, component state, and scroll persist — great for nav bars you don't want to flicker. A template instead creates a **fresh instance** for each child route, so any state inside resets and <code>useEffect</code>s re-fire on every navigation. You reach for <code>template</code> when you specifically **want** that reset: page-transition animations (which need a new element to animate in), per-page analytics that should fire each visit, or features relying on <code>useEffect</code> running per navigation. If you don't need that, prefer a layout (cheaper, smoother).

### layout vs template
| | layout | template |
| --- | --- | --- |
| Instance | reused | new per nav |
| State | preserved | reset |
| Effects | not re-run on nav | re-run each nav |
| Use for | persistent shell | animations / per-nav logic |

> **Interview tip:** One line: **layout persists, template re-mounts.** Give the canonical template use case — enter/exit **animations** or per-navigation effects that need a fresh mount.`,
    examples: [
      {
        label: "A template that resets per navigation",
        tech: "tsx",
        runnable: false,
        code: `// app/template.tsx — re-created on every navigation
'use client';
import { useEffect } from 'react';
export default function Template({ children }) {
  useEffect(() => { trackPageView(); }, []);   // fires on EVERY navigation
  return <div className="fade-in">{children}</div>;
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are dynamic routes and catch-all segments in Next.js?",
    answer: `**TL;DR.** A <code>[id]</code> folder creates a **dynamic segment** whose value arrives via <code>params</code>; <code>[...slug]</code> is a **catch-all** matching multiple segments; <code>[[...slug]]</code> is an **optional catch-all** that also matches the base path. They let **one route file** handle many URLs.

<svg class='iq-diagram' viewBox='0 0 460 160' role='img' aria-label='Dynamic, catch-all and optional catch-all segment patterns'>
  <rect class='d-box-accent' x='20' y='30' width='200' height='30' rx='6'/><text class='d-sub' x='120' y='50' text-anchor='middle'>[id] → /posts/42</text>
  <rect class='d-box' x='20' y='66' width='200' height='30' rx='6'/><text class='d-sub' x='120' y='86' text-anchor='middle'>[...slug] → /a/b/c</text>
  <rect class='d-box-muted' x='20' y='102' width='200' height='30' rx='6'/><text class='d-sub' x='120' y='122' text-anchor='middle'>[[...slug]] → / and /a/b</text>
  <path class='d-edge-accent' d='M222 81 H280' marker-end='url(#nb1)'/>
  <rect class='d-box' x='282' y='60' width='158' height='44' rx='8'/><text class='d-text' x='361' y='86' text-anchor='middle'>params prop</text>
  <defs><marker id='nb1' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** Bracketed folder names create dynamic segments. <code>[id]</code> matches exactly one segment (<code>/posts/42</code> → <code>params.id = '42'</code>). <code>[...slug]</code> matches **one or more** segments and gives you an **array** (<code>/docs/a/b</code> → <code>params.slug = ['a','b']</code>) — handy for docs/file trees. <code>[[...slug]]</code> is the same but **optional**, so it also matches the parent path with no segments. In the App Router, <code>params</code> is passed to <code>page</code>/<code>layout</code>/<code>route</code> (in recent versions it's a Promise you <code>await</code>). Pair with <code>generateStaticParams</code> to pre-render known values at build, and <code>dynamicParams</code> to control on-demand generation for the rest.

### Segment patterns
| Pattern | Matches | params |
| --- | --- | --- |
| <code>[id]</code> | one segment | string |
| <code>[...slug]</code> | 1+ segments | string[] |
| <code>[[...slug]]</code> | 0+ segments | string[]? |

> **Interview tip:** Distinguish single (<code>[id]</code>) vs catch-all (<code>[...slug]</code>, array) vs **optional** catch-all (also matches base). Mention pairing with <code>generateStaticParams</code> for SSG.`,
    examples: [
      {
        label: "Reading params in a dynamic route",
        tech: "tsx",
        runnable: false,
        code: `// app/blog/[slug]/page.tsx
export default async function Post({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;        // e.g. '/blog/hello' → 'hello'
  const post = await getPost(slug);
  return <article>{post.title}</article>;
}

// app/docs/[...path]/page.tsx → params.path is string[] (['a','b'])`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are route groups in Next.js and how do you use them?",
    answer: `**TL;DR.** A folder named in **parentheses**, like <code>(marketing)</code>, **groups routes** for organization or to apply a shared layout **without adding a URL segment**. It also lets you have **multiple root layouts** or separate sections that don't change the path.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Route group folder organizes routes without changing the URL'>
  <rect class='d-box-muted' x='20' y='25' width='220' height='110' rx='10'/>
  <text class='d-sub' x='34' y='46'>app/(marketing)/</text>
  <text class='d-sub' x='50' y='66'>layout.tsx</text>
  <text class='d-sub' x='50' y='86'>about/page.tsx</text>
  <text class='d-sub' x='50' y='106'>pricing/page.tsx</text>
  <path class='d-edge-accent' d='M242 80 H300' marker-end='url(#nb2)'/>
  <rect class='d-box-accent' x='302' y='55' width='138' height='50' rx='8'/><text class='d-text' x='371' y='78' text-anchor='middle'>/about, /pricing</text><text class='d-sub' x='371' y='96' text-anchor='middle'>no '(marketing)' in URL</text>
  <defs><marker id='nb2' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** Normally every folder becomes a URL segment, but a **parenthesized** folder is **ignored in the path** — it exists only to organize files and to scope a <code>layout</code>. This is powerful for two reasons: you can give a set of routes a **shared layout** (e.g. a marketing layout vs an app layout) without nesting them under a URL prefix, and you can create **multiple root layouts** by putting different <code>(group)/layout.tsx</code> files at the top level (each group's pages get a fully separate <code>&lt;html&gt;</code>/<code>&lt;body&gt;</code> shell). Routes across different groups must not resolve to the **same URL** (that's a conflict). Use groups to separate concerns (auth vs dashboard vs marketing) cleanly.

### Route group uses
| Use | Benefit |
| --- | --- |
| organize files | clarity, no URL change |
| scoped layout | different shells per section |
| multiple root layouts | separate html/body trees |
| split concerns | auth / app / marketing |

> **Interview tip:** Key fact: parentheses mean the folder **does not appear in the URL** — it's purely for organization and **layout scoping** (including multiple root layouts).`,
    examples: [
      {
        label: "Two sections, two layouts, clean URLs",
        tech: "bash",
        runnable: false,
        code: `app/
  (marketing)/
    layout.tsx        # marketing shell
    page.tsx          # → /
    pricing/page.tsx  # → /pricing
  (app)/
    layout.tsx        # authenticated app shell
    dashboard/page.tsx # → /dashboard
# Neither (marketing) nor (app) appears in the URL.`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are parallel routes (@slot) in Next.js and when would you use them?",
    answer: `**TL;DR.** **Parallel routes** use <code>@folder</code> "slots" to render **multiple pages in the same layout at once** (e.g. a feed and a sidebar), each with **independent** loading/error states and navigation. They're ideal for **dashboards, modals, and split views**.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Layout renders two parallel slots simultaneously'>
  <rect class='d-box-muted' x='30' y='25' width='400' height='110' rx='10'/>
  <text class='d-sub' x='45' y='44'>layout receives both slots as props</text>
  <rect class='d-box-accent' x='55' y='54' width='170' height='66' rx='8'/><text class='d-text' x='140' y='84' text-anchor='middle'>@team</text><text class='d-sub' x='140' y='102' text-anchor='middle'>own loading/error</text>
  <rect class='d-box-accent' x='240' y='54' width='170' height='66' rx='8'/><text class='d-text' x='325' y='84' text-anchor='middle'>@analytics</text><text class='d-sub' x='325' y='102' text-anchor='middle'>independent nav</text>
</svg>

**How it works.** A slot folder is prefixed with <code>@</code> (e.g. <code>@team</code>, <code>@analytics</code>); it does **not** add a URL segment but is passed to the parent <code>layout</code> as a **named prop** alongside <code>children</code>. The layout renders all slots **simultaneously**, and each slot can have its own <code>loading.js</code>/<code>error.js</code> and even navigate independently. A <code>default.js</code> provides fallback content for a slot when the URL doesn't match it (e.g. on hard reload). Combined with **intercepting routes**, parallel routes power **modal** patterns (show a modal in a slot while keeping the background page). Use them for dashboards with independently-loading panels or any UI that needs two route trees on screen at once.

### Parallel route pieces
| Piece | Role |
| --- | --- |
| <code>@slot</code> folder | named slot, no URL segment |
| layout prop | each slot passed in |
| <code>default.js</code> | fallback when unmatched |
| + intercepting | modal patterns |

> **Interview tip:** Describe slots as **independently-rendered/loaded regions** passed to the layout as named props, and the two flagship uses: **dashboards** and **modals** (with intercepting routes). Mention <code>default.js</code> for unmatched states.`,
    examples: [
      {
        label: "Layout consuming two slots",
        tech: "tsx",
        runnable: false,
        code: `// app/dashboard/layout.tsx
export default function Layout({
  children, team, analytics,            // @team and @analytics slots
}: { children: React.ReactNode; team: React.ReactNode; analytics: React.ReactNode }) {
  return <><section>{team}</section><section>{analytics}</section>{children}</>;
}
// Folders: app/dashboard/@team/page.tsx, app/dashboard/@analytics/page.tsx`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are intercepting routes in Next.js and what are they used for?",
    answer: `**TL;DR.** **Intercepting routes** (the <code>(.)</code>, <code>(..)</code>, <code>(...)</code> conventions) let you load a route **within the current page's context** instead of a full navigation — classically to show a photo/detail in a **modal** while keeping the URL **shareable**, falling back to the **full page** on reload.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Clicking a link opens content in a modal; reload shows the full page'>
  <rect class='d-box-accent' x='20' y='52' width='130' height='46' rx='8'/><text class='d-text' x='85' y='73' text-anchor='middle'>click link</text><text class='d-sub' x='85' y='90' text-anchor='middle'>(soft nav)</text>
  <path class='d-edge-accent' d='M152 75 H210' marker-end='url(#nb3)'/>
  <rect class='d-box' x='212' y='52' width='110' height='46' rx='8'/><text class='d-text' x='267' y='73' text-anchor='middle'>modal</text><text class='d-sub' x='267' y='90' text-anchor='middle'>URL updates</text>
  <path class='d-edge-dashed' d='M324 75 H382' marker-end='url(#nb3)'/>
  <rect class='d-box-muted' x='384' y='52' width='66' height='46' rx='8'/><text class='d-sub' x='417' y='79' text-anchor='middle'>reload → full page</text>
  <defs><marker id='nb3' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** Intercepting conventions tell the router: when navigating to this route **from within the app** (a soft navigation), render it in the **current** layout (e.g. a modal slot) instead of replacing the page. The prefixes describe **which level** to intercept relative to the current segment: <code>(.)</code> same level, <code>(..)</code> one up, <code>(...)</code> from the root. The magic is that the **URL still changes** to the real route, so the link is **shareable/bookmarkable** — and on a **hard reload or direct visit**, the interception doesn't apply, so the user gets the **full standalone page**. Combined with **parallel routes** (a <code>@modal</code> slot + <code>default.js</code>), this is the canonical Next.js pattern for image lightboxes, "view post" modals, and quick-look overlays without losing deep-linkability.

### Intercept prefixes
| Prefix | Intercepts |
| --- | --- |
| <code>(.)</code> | same segment level |
| <code>(..)</code> | one level up |
| <code>(...)</code> | from the root |
| reload/direct | shows full page |

> **Interview tip:** The selling point: a **modal on soft-nav, full page on reload**, with a **shareable URL** throughout. Note it pairs with a **parallel <code>@modal</code> slot** + <code>default.js</code>.`,
    examples: [
      {
        label: "Photo modal via interception + slot",
        tech: "bash",
        runnable: false,
        code: `app/
  feed/page.tsx                      # list of photos
  photo/[id]/page.tsx                # full standalone page (reload/direct)
  @modal/
    (.)photo/[id]/page.tsx           # intercepts soft-nav → render as modal
    default.tsx                      # renders nothing when no modal
# Clicking a photo opens the modal (URL = /photo/123); reload shows the full page.`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is loading.js in Next.js and how does Suspense streaming work?",
    answer: `**TL;DR.** Adding <code>loading.js</code> wraps the segment in a **Suspense boundary**, so Next.js **streams an instant fallback** while the Server Component fetches data, then **streams in** the real content when it's ready — improving perceived performance with no manual Suspense wiring.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Shell streams first, then content replaces the loading fallback'>
  <rect class='d-box-accent' x='20' y='52' width='120' height='46' rx='8'/><text class='d-text' x='80' y='73' text-anchor='middle'>shell + loading</text><text class='d-sub' x='80' y='90' text-anchor='middle'>sent instantly</text>
  <path class='d-edge-accent' d='M142 75 H210' marker-end='url(#nb4)'/>
  <text class='d-sub' x='176' y='66' text-anchor='middle'>data resolves</text>
  <rect class='d-box' x='212' y='52' width='130' height='46' rx='8'/><text class='d-text' x='277' y='73' text-anchor='middle'>content streamed</text><text class='d-sub' x='277' y='90' text-anchor='middle'>replaces fallback</text>
  <defs><marker id='nb4' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** When a segment has a <code>loading.tsx</code>, Next.js automatically wraps that segment's <code>page</code> in <code>&lt;Suspense fallback={&lt;Loading/&gt;}&gt;</code>. During SSR it **streams** the surrounding layout and the loading fallback to the browser **immediately**, so the user sees structure right away; when the page's async data resolves on the server, Next streams the finished HTML and React swaps it in place of the fallback. This means slow data **doesn't block** the whole route — the shell and any fast parts appear first. For finer control you can place your own <code>&lt;Suspense&gt;</code> boundaries around individual slow components so each streams independently. It improves **TTFB** and perceived speed without spinners you manage by hand.

### Streaming benefits
| Aspect | Benefit |
| --- | --- |
| <code>loading.js</code> | auto Suspense boundary |
| shell first | instant structure |
| stream content | slow data non-blocking |
| manual <code>&lt;Suspense&gt;</code> | per-component streaming |

> **Interview tip:** Connect <code>loading.js</code> → an automatic **Suspense boundary** → **streaming SSR**: the shell/fallback streams instantly and content streams in when ready, so slow data doesn't block first paint.`,
    examples: [
      {
        label: "Instant loading UI",
        tech: "tsx",
        runnable: false,
        code: `// app/dashboard/loading.tsx — streamed instantly
export default function Loading() {
  return <div className="skeleton">Loading dashboard…</div>;
}

// app/dashboard/page.tsx — slow data; user sees Loading first
export default async function Page() {
  const data = await getSlowReport();    // streams in when ready
  return <Report data={data} />;
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is error.js in Next.js and how does error handling work in the App Router?",
    answer: `**TL;DR.** <code>error.js</code> defines a **Client Component error boundary** for its segment, catching render/data errors and showing fallback UI with a <code>reset()</code> to retry. <code>global-error.js</code> catches root-layout errors. **Expected** errors you handle in code; <code>error.js</code> is for **unexpected** ones.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Error in a segment bubbles to its error boundary with reset'>
  <rect class='d-box-muted' x='20' y='52' width='120' height='46' rx='8'/><text class='d-sub' x='80' y='73' text-anchor='middle'>page throws</text><text class='d-sub' x='80' y='90' text-anchor='middle'>during render</text>
  <path class='d-edge-accent' d='M142 75 H200' marker-end='url(#nb5)'/>
  <rect class='d-box-accent' x='202' y='52' width='130' height='46' rx='8'/><text class='d-text' x='267' y='73' text-anchor='middle'>error.tsx</text><text class='d-sub' x='267' y='90' text-anchor='middle'>fallback + reset()</text>
  <path class='d-edge-dashed' d='M267 52 V34 H80 V50' marker-end='url(#nb5)'/>
  <text class='d-sub' x='170' y='28' text-anchor='middle'>reset() retries the segment</text>
  <defs><marker id='nb5' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** An <code>error.tsx</code> must be a **Client Component** (<code>'use client'</code>); Next.js wraps the segment in a React **error boundary** that catches errors thrown while rendering the page or its children (including in Server Components). It receives the <code>error</code> object and a <code>reset()</code> function to attempt re-rendering the segment. Because it's per-segment, an error in one part of the UI doesn't blow away the whole app — the surrounding **layout stays mounted**. The root layout sits **above** the nearest <code>error.tsx</code>, so to catch errors there you use <code>global-error.tsx</code> (which must render its own <code>&lt;html&gt;</code>/<code>&lt;body&gt;</code>). Distinguish **expected** errors (validation, not-found) — handle those with normal control flow / <code>notFound()</code> — from **unexpected** runtime errors, which <code>error.tsx</code> catches.

### Error handling
| File | Catches |
| --- | --- |
| <code>error.tsx</code> | unexpected errors in segment |
| <code>global-error.tsx</code> | root layout errors |
| <code>notFound()</code> | expected 404 |
| in-code try/catch | expected/operational |

> **Interview tip:** Note <code>error.tsx</code> is a **Client Component error boundary** with <code>reset()</code>, that the **layout survives** the error, and that **root-level** errors need <code>global-error.tsx</code>. Separate expected vs unexpected errors.`,
    examples: [
      {
        label: "A segment error boundary",
        tech: "tsx",
        runnable: false,
        code: `// app/dashboard/error.tsx
'use client';                          // error boundaries are Client Components
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div>
      <p>Something went wrong: {error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is not-found.js in Next.js and how do you trigger a 404?",
    answer: `**TL;DR.** <code>not-found.tsx</code> renders the **404 UI** for a segment, and calling the **<code>notFound()</code>** function from a Server Component (e.g. when a record is missing) renders the nearest not-found boundary and returns a **404 status**.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='notFound() call renders the not-found boundary with a 404 status'>
  <rect class='d-box-accent' x='20' y='52' width='150' height='46' rx='8'/><text class='d-text' x='95' y='73' text-anchor='middle'>notFound()</text><text class='d-sub' x='95' y='90' text-anchor='middle'>record missing</text>
  <path class='d-edge-accent' d='M172 75 H230' marker-end='url(#nb6)'/>
  <rect class='d-box' x='232' y='52' width='130' height='46' rx='8'/><text class='d-text' x='297' y='73' text-anchor='middle'>not-found.tsx</text><text class='d-sub' x='297' y='90' text-anchor='middle'>404 UI + status</text>
  <defs><marker id='nb6' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** Two pieces work together. The convention file <code>not-found.tsx</code> defines the UI shown for missing routes/resources within its segment (the root one handles unmatched URLs). The imperative helper <code>notFound()</code> (from <code>next/navigation</code>) **throws** a special error that the framework catches: it stops rendering the current component, renders the **nearest** <code>not-found.tsx</code>, and sets the HTTP status to **404** (important for SEO/crawlers). You call it after a failed lookup — e.g. a blog post id that doesn't exist — instead of rendering a broken page. This gives you correct status codes and a consistent 404 experience, scoped per segment so different sections can show tailored not-found UI.

### 404 handling
| Piece | Role |
| --- | --- |
| <code>not-found.tsx</code> | the 404 UI |
| <code>notFound()</code> | trigger it + 404 status |
| root <code>not-found</code> | unmatched URLs |
| per-segment | tailored 404s |

> **Interview tip:** Stress that <code>notFound()</code> sets a real **404 status** (SEO-correct), unlike just rendering a "not found" message, and that it renders the **nearest** <code>not-found.tsx</code>.`,
    examples: [
      {
        label: "404 on a missing record",
        tech: "tsx",
        runnable: false,
        code: `// app/blog/[slug]/page.tsx
import { notFound } from 'next/navigation';

export default async function Post({ params }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();               // → renders not-found.tsx, sends 404
  return <article>{post.title}</article>;
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How does client-side navigation work in Next.js (next/link and useRouter)?",
    answer: `**TL;DR.** <code>next/link</code> renders an anchor that does **client-side navigation** and **prefetches** the target route's code/data when it enters the viewport. <code>useRouter()</code>'s <code>push</code>/<code>replace</code> navigate **programmatically**. Both avoid full page reloads while keeping shared **layouts mounted**.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Link prefetches then soft-navigates, keeping layouts mounted'>
  <rect class='d-box-accent' x='20' y='52' width='120' height='46' rx='8'/><text class='d-text' x='80' y='73' text-anchor='middle'>&lt;Link&gt;</text><text class='d-sub' x='80' y='90' text-anchor='middle'>prefetch on view</text>
  <path class='d-edge-accent' d='M142 75 H210' marker-end='url(#nb7)'/>
  <text class='d-sub' x='176' y='66' text-anchor='middle'>click</text>
  <rect class='d-box' x='212' y='52' width='130' height='46' rx='8'/><text class='d-text' x='277' y='73' text-anchor='middle'>soft navigation</text><text class='d-sub' x='277' y='90' text-anchor='middle'>no full reload</text>
  <path class='d-edge-accent' d='M344 75 H402' marker-end='url(#nb7)'/>
  <rect class='d-box-muted' x='404' y='52' width='46' height='46' rx='8'/><text class='d-sub' x='427' y='79' text-anchor='middle'>layout kept</text>
  <defs><marker id='nb7' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** <code>&lt;Link href&gt;</code> renders a real <code>&lt;a&gt;</code> (good for accessibility/SEO) but intercepts clicks to do a **soft navigation**: it fetches only the changed route segments' RSC payload, swaps the page, and **keeps shared layouts mounted** (no white flash, scroll/state preserved where applicable). It **prefetches** the destination when the link scrolls into view (in production), so navigation feels instant; the result lands in the client **Router Cache**. For imperative navigation (after a form submit, on an event) use <code>useRouter()</code> from <code>next/navigation</code> — <code>router.push</code> (adds history), <code>router.replace</code> (no history entry), <code>router.back()</code>, and <code>router.refresh()</code> (re-fetch the current route's server data). Read URL state with <code>usePathname</code>/<code>useSearchParams</code>.

### Navigation tools
| Tool | Use |
| --- | --- |
| <code>&lt;Link&gt;</code> | declarative nav + prefetch |
| <code>router.push/replace</code> | programmatic nav |
| <code>router.refresh()</code> | re-fetch server data |
| <code>usePathname/useSearchParams</code> | read URL state |

> **Interview tip:** Emphasize **soft navigation** (only changed segments fetched, layouts persist) and **automatic prefetch**. Mention <code>router.refresh()</code> to re-pull server data after a mutation.`,
    examples: [
      {
        label: "Link + programmatic navigation",
        tech: "tsx",
        runnable: false,
        code: `import Link from 'next/link';
// declarative — prefetches /dashboard, soft-navigates on click
<Link href="/dashboard">Dashboard</Link>;

'use client';
import { useRouter } from 'next/navigation';
function SaveButton() {
  const router = useRouter();
  return <button onClick={async () => { await save(); router.push('/done'); }}>Save</button>;
}`,
      },
    ],
  },
];

export default augments;
