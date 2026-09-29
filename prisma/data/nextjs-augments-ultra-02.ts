/**
 * Next.js "ultra" rewrite — batch 02 (routing: layouts, dynamic segments,
 * groups, parallel + intercepting routes, loading/error/not-found, nav).
 *
 * Same conventions as nextjs-augments-ultra-01.ts: §6 Question Body rubric in
 * `description` (plain markdown), one-line `seoDescription`, full Answer Body
 * (story → core → animated thought-process SVG → tables → pitfalls → §7
 * interview card → glossary → conclusion), double-quoted SVG attrs, zero
 * apostrophes inside svg blocks, SMIL reveals in speak-order + motion dots with
 * synced opacity fades (seamless indefinite loops), `runnable: false`
 * static snippets (`tech: "tsx"` / `"bash"`).
 *
 * Titles are VERBATIM from nextjs-augments-gold-2.ts — `npm run augment:next`
 * matches by exact title, so any rename orphans the DB row.
 *
 * Version-checked against installed Next.js 16.3.4: async `params` awaiting
 * is REQUIRED (sync access removed), `useSearchParams` needs a Suspense
 * boundary for static prerender, `transitionTypes` on <Link> is the 16.2
 * View-Transition hook.
 */
import type { NextAugment } from "./nextjs-augments.types";

const augments: NextAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the difference between layout.js and template.js in Next.js?",
    seoDescription:
      "Layout persists across navigations keeping state; template remounts fresh each time for animations and per-navigation effects.",
    description: `**Question presented to candidate:**
"Your dashboard sidebar keeps losing its scroll position every time you switch tabs — but your onboarding flow needs a fresh entrance animation on each step. Which wrapper do you use for each, and why?"

**What a strong answer should cover:**
- Both wrap a segment, but layout is created once and reused; template creates a fresh instance per navigation.
- Layout preserves DOM, state, and scroll; template resets state and refires effects.
- Template use cases: enter/exit animations, per-navigation analytics, resetting forms between routes.
- Default to layout; reach for template only when the reset is the feature.

**Clarifying questions expected:**
- "Should anything survive the navigation — scroll, form input, player state?"
- "Is there an animation or tracking call that must fire on every visit?"

**Code / implementation expected:** Yes — a template with a per-navigation effect is the canonical demo.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic App Router familiarity.
**Difficulty:** Easy to Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Behavior matches the installed Next.js 16.3.4.

## 1. Why This Even Matters — A Story First

A layout is a picture frame bolted to the wall: you swap the photos inside without touching the frame. A template is a fresh sheet of paper every time: same drawing task, but yesterday marks never bleed through. The interview question is always which one the situation wants — persistence or a clean slate.

## 2. The Core Idea

📌 **Interview term: layout** — a segment wrapper created **once and reused** across navigations. DOM, component state, and scroll survive.

📌 **Interview term: template** — a segment wrapper that mounts a **new instance on every navigation**. State resets, effects refire.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 300" role="img" aria-label="Same navigation event, different outcome: layout keeps state, template resets it">
  <defs>
    <marker id="lo-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Same click, different outcome: what survives</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-muted" x="225" y="44" width="210" height="42" rx="10"/>
    <text class="d-text" x="330" y="70" text-anchor="middle">navigation happens</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.4s" dur="0.5s" fill="freeze"/>
    <path class="d-edge" d="M 290 88 L 150 148" marker-end="url(#lo-arrow)"/>
    <path class="d-edge" d="M 370 88 L 510 148" marker-end="url(#lo-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2.2s" repeatCount="indefinite" path="M 290 88 L 150 148"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2.2s" repeatCount="indefinite"/>
    </circle>
    <circle class="d-accent" r="5">
      <animateMotion dur="2.2s" begin="1.1s" repeatCount="indefinite" path="M 370 88 L 510 148"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2.2s" begin="1.1s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.7s" dur="0.5s" fill="freeze"/>
    <rect class="d-box" x="30" y="150" width="280" height="124" rx="10"/>
    <circle class="d-box-accent" cx="48" cy="150" r="12"/>
    <text class="d-text d-accent" x="48" y="155" text-anchor="middle">1</text>
    <text class="d-text" x="178" y="180" text-anchor="middle">layout</text>
    <text class="d-sub" x="170" y="204" text-anchor="middle">stays mounted, state kept</text>
    <text class="d-sub" x="170" y="226" text-anchor="middle">say: persistent shell</text>
    <text class="d-sub" x="170" y="248" text-anchor="middle">think: the default choice</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="350" y="150" width="280" height="124" rx="10"/>
    <circle class="d-box-accent" cx="368" cy="150" r="12"/>
    <text class="d-text d-accent" x="368" y="155" text-anchor="middle">2</text>
    <text class="d-text d-accent" x="498" y="180" text-anchor="middle">template</text>
    <text class="d-sub" x="490" y="204" text-anchor="middle">fresh mount, effects refire</text>
    <text class="d-sub" x="490" y="226" text-anchor="middle">say: page transitions</text>
    <text class="d-sub" x="490" y="248" text-anchor="middle">think: the reset is the feature</text>
  </g>
</svg>

One event, two lifecycles. The left box keeps everything; the right box deliberately forgets.

## 3. Comparison

| | layout | template |
| :--- | :--- | :--- |
| Instance | reused across nav | new per navigation |
| State / DOM | preserved | reset |
| Effects | not refired | refire each visit |
| Use for | nav bars, sidebars, shells | animations, per-nav analytics, form resets |

## 4. Common Pitfalls

- **Using template as a default wrapper.** Every navigation pays a full remount — layout is cheaper and smoother unless the reset is wanted.
- **Putting per-visit analytics in a layout effect.** It fires once, not per page — that tracking belongs in a template.
- **Expecting scroll restoration inside a template.** There is nothing to restore from; the DOM is new.
- **Forgetting template still composes with layout.** They nest — a template inside a persistent layout gives a stable shell with a resetting interior.

## 5. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One line:</strong> <span style="color:#f0e2c8;">"Layout persists across navigations keeping state and DOM; template remounts fresh every time, resetting state and refiring effects."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Assign the use cases:</strong> <span style="color:#f0e2c8;">"Sidebar shell goes in a layout; the onboarding step animation and its per-visit tracking go in a template."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. State the default:</strong> <span style="color:#f0e2c8;">"Layout unless I can name the reset I need — template is opt-in cost."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can they be nested?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes — a template inside a layout gives a stable shell with a resetting interior, which is exactly the dashboard-plus-animated-content shape.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did my page-view tracking fire only once?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The effect lives in a layout, which mounts once. Move per-visit tracking into a template so the effect refires on every navigation.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does template hurt performance?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It remounts the subtree per navigation instead of reusing it — measurably more work than a layout. Fine for a leaf, wasteful as a default wrapper.</span>
</div>

</div>

## 6. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **layout** | Segment wrapper reused across navigations |
| **template** | Segment wrapper remounted on every navigation |
| **Remount** | Destroying and recreating a component instance |

---
**Conclusion:** layout is persistence, template is deliberate forgetting — default to the frame bolted to the wall, and reach for the fresh sheet only when the reset itself is the feature.`,
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

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are dynamic routes and catch-all segments in Next.js?",
    seoDescription:
      "Bracket folders create dynamic segments: [id] one value, [...slug] arrays, [[...slug]] optional; params must be awaited in Next 16.",
    description: `**Question presented to candidate:**
"You need /posts/42 for articles and /docs/a/b/c for a nested docs tree with one route file each. How do you shape the folders, what does params look like, and how do you read it?"

**What a strong answer should cover:**
- [id] matches one segment (string); [...slug] matches 1+ (string[]); [[...slug]] also matches the base path.
- In Next 15/16 params is a Promise — type it and await it; sync access is removed in 16.
- Pair with generateStaticParams for pre-rendering and dynamicParams for on-demand control.

**Clarifying questions expected:**
- "Which Next.js version?" — params awaiting is required in current versions.
- "Known set of paths or unbounded user content?" — decides generateStaticParams vs dynamic.

**Code / implementation expected:** Yes — an awaited-params page is the canonical snippet.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic file-routing familiarity.
**Difficulty:** Easy to Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Params behavior matches the installed Next.js 16.3.4, where awaiting is required.

## 1. Why This Even Matters — A Story First

Without dynamic routes you would hand-write a file per blog post — thousands of identical files. Bracket folders are a stencil: one file declares the shape, the URL fills in the blanks, and your code reads the filled-in values.

## 2. The Core Idea

📌 **Interview term: dynamic segment** — a bracketed folder (<code>[id]</code>) matching exactly one URL segment and exposing it as a string.

📌 **Interview term: catch-all** — <code>[...slug]</code> matching one or more segments as an array; <code>[[...slug]]</code> additionally matching the bare parent path.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 320" role="img" aria-label="Three segment patterns converging on the awaited params rule">
  <defs>
    <marker id="dy-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="340" y="24" text-anchor="middle">One file, many URLs: name the pattern, await the value</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box" x="20" y="46" width="200" height="124" rx="10"/>
    <circle class="d-box-accent" cx="38" cy="46" r="12"/>
    <text class="d-text d-accent" x="38" y="51" text-anchor="middle">1</text>
    <text class="d-text" x="128" y="76" text-anchor="middle">[id]</text>
    <text class="d-sub" x="120" y="100" text-anchor="middle">/posts/42</text>
    <text class="d-sub" x="120" y="122" text-anchor="middle">say: one segment</text>
    <text class="d-sub" x="120" y="144" text-anchor="middle">think: string value</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.5s" fill="freeze"/>
    <rect class="d-box" x="240" y="46" width="200" height="124" rx="10"/>
    <circle class="d-box-accent" cx="258" cy="46" r="12"/>
    <text class="d-text d-accent" x="258" y="51" text-anchor="middle">2</text>
    <text class="d-text" x="348" y="76" text-anchor="middle">[...slug]</text>
    <text class="d-sub" x="340" y="100" text-anchor="middle">/docs/a/b/c</text>
    <text class="d-sub" x="340" y="122" text-anchor="middle">say: one or more</text>
    <text class="d-sub" x="340" y="144" text-anchor="middle">think: string array</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.5s" fill="freeze"/>
    <rect class="d-box" x="460" y="46" width="200" height="124" rx="10"/>
    <circle class="d-box-accent" cx="478" cy="46" r="12"/>
    <text class="d-text d-accent" x="478" y="51" text-anchor="middle">3</text>
    <text class="d-text" x="568" y="76" text-anchor="middle">[[...slug]]</text>
    <text class="d-sub" x="560" y="100" text-anchor="middle">/docs and /docs/a</text>
    <text class="d-sub" x="560" y="122" text-anchor="middle">say: optional, base too</text>
    <text class="d-sub" x="560" y="144" text-anchor="middle">think: docs landing page</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.2s" dur="0.5s" fill="freeze"/>
    <path class="d-edge" d="M 120 172 L 120 198" marker-end="url(#dy-arrow)"/>
    <path class="d-edge" d="M 340 172 L 340 198" marker-end="url(#dy-arrow)"/>
    <path class="d-edge" d="M 560 172 L 560 198" marker-end="url(#dy-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="1.8s" repeatCount="indefinite" path="M 340 172 L 340 198"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="1.8s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.5s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-accent" x="20" y="204" width="640" height="88" rx="10"/>
    <circle class="d-box-accent" cx="38" cy="204" r="12"/>
    <text class="d-text d-accent" x="38" y="209" text-anchor="middle">4</text>
    <text class="d-text d-accent" x="348" y="234" text-anchor="middle">rule: params is a Promise — await it</text>
    <text class="d-sub" x="340" y="258" text-anchor="middle">say: type it as Promise, destructure after await</text>
    <text class="d-sub" x="340" y="280" text-anchor="middle">think: sync access throws in Next 16</text>
  </g>
</svg>

Three patterns, one reading rule. The bottom bar is the detail that dates your knowledge — nail it unprompted.

## 3. Segment patterns

| Pattern | Matches | params |
| :--- | :--- | :--- |
| <code>[id]</code> | exactly one segment | string |
| <code>[...slug]</code> | one or more | string[] |
| <code>[[...slug]]</code> | zero or more | string[], possibly empty |

📌 **Interview term: async params** — since Next 15, <code>params</code> (and <code>searchParams</code>) arrive as Promises; Next 16 removed sync access. Always <code>const { slug } = await params</code>.

## 4. Common Pitfalls

- **Reading params synchronously.** In Next 16 it throws — the single most common upgrade break in dynamic routes.
- **Using [...slug] where [id] fits.** Catch-alls swallow nested paths you may want as separate routes.
- **Forgetting generateStaticParams.** Without it, every dynamic path renders on demand — fine for user content, wasteful for a known catalog.
- **Ignoring dynamicParams.** Set <code>dynamicParams = false</code> to 404 unknown values instead of rendering them on demand.

## 5. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Name the three:</strong> <span style="color:#f0e2c8;">"Single segment is a string, catch-all is an array, optional catch-all also matches the base path — one route file each."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Drop the version detail:</strong> <span style="color:#f0e2c8;">"And params is async now — I type it as a Promise and await it; sync reads throw."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Close with pre-rendering:</strong> <span style="color:#f0e2c8;">"Known paths go through generateStaticParams; dynamicParams controls the long tail."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What exactly breaks if I read params without awaiting?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In Next 16 sync access throws at runtime. The Promise form lets the router stream and parallelize more of the render instead of blocking on route values up front.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When does [[...slug]] beat [...slug]?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the base path itself must render — a docs landing page at /docs plus nested pages under it, all from one file.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you 404 unknown slugs instead of rendering them?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Export dynamicParams = false so only generateStaticParams paths exist, and call notFound() for anything else.</span>
</div>

</div>

## 6. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Dynamic segment** | Bracket folder matching one URL part |
| **Catch-all** | Multi-segment match arriving as an array |
| **Async params** | Route values delivered as an awaited Promise |
| **generateStaticParams** | Declares which paths to pre-render |

---
**Conclusion:** brackets turn one file into many URLs — single, catch-all, optional — and the modern reading rule is non-negotiable: type params as a Promise and await it. State the trio plus the await and you sound current.`,
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

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are route groups in Next.js and how do you use them?",
    seoDescription:
      "Parenthesized folders organize routes and scope layouts without adding URL segments, including multiple root layouts.",
    description: `**Question presented to candidate:**
"Marketing wants its own page shell, the app needs an authenticated shell, but neither /marketing nor /app may appear in the URL. How do you structure that?"

**What a strong answer should cover:**
- Parenthesized folders are invisible in the URL — pure organization and layout scoping.
- Each group can carry its own layout, up to fully separate root layouts with their own html/body.
- Same URL in two groups is a conflict — the router cannot choose.
- Use to split concerns: marketing, app, auth.

**Clarifying questions expected:**
- "Do the sections need different html/body shells or just different nav bars?"
- "Could two groups ever claim the same path?"

**Code / implementation expected:** Optional — a folder tree sketch answers it faster than code.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic file-routing familiarity.
**Difficulty:** Easy

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Behavior matches the installed Next.js 16.3.4.

## 1. Why This Even Matters — A Story First

Office dividers organize a floor plan without changing the street address. Route groups are dividers: they arrange your codebase into marketing, app, and auth zones with their own decor, while every visitor still sees clean addresses with no zone names in them.

## 2. The Core Idea

📌 **Interview term: route group** — a folder wrapped in parentheses, e.g. <code>(marketing)</code>, that is **skipped when resolving URLs** but still scopes files and layouts.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 300" role="img" aria-label="Grouped folders on disk resolve to clean URLs without group names">
  <defs>
    <marker id="rg-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Folders lie about URLs: parentheses vanish, layouts stay</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-muted" x="30" y="50" width="270" height="130" rx="10"/>
    <circle class="d-box-accent" cx="48" cy="50" r="12"/>
    <text class="d-text d-accent" x="48" y="55" text-anchor="middle">1</text>
    <text class="d-text" x="178" y="80" text-anchor="middle">on disk</text>
    <text class="d-sub" x="165" y="104" text-anchor="middle">(marketing)/layout</text>
    <text class="d-sub" x="165" y="126" text-anchor="middle">(marketing)/pricing/page</text>
    <text class="d-sub" x="165" y="148" text-anchor="middle">(app)/dashboard/page</text>
    <text class="d-sub" x="165" y="168" text-anchor="middle">think: dividers, not rooms</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.4s" dur="0.5s" fill="freeze"/>
    <path class="d-edge-accent" d="M 302 115 L 356 115" marker-end="url(#rg-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="1.8s" repeatCount="indefinite" path="M 302 115 L 356 115"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="1.8s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.6s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="360" y="50" width="270" height="130" rx="10"/>
    <circle class="d-box-accent" cx="378" cy="50" r="12"/>
    <text class="d-text d-accent" x="378" y="55" text-anchor="middle">2</text>
    <text class="d-text d-accent" x="503" y="80" text-anchor="middle">in the browser</text>
    <text class="d-sub" x="495" y="104" text-anchor="middle">/pricing, not /(marketing)</text>
    <text class="d-sub" x="495" y="126" text-anchor="middle">/dashboard, not /(app)</text>
    <text class="d-sub" x="495" y="148" text-anchor="middle">say: groups vanish</text>
    <text class="d-sub" x="495" y="168" text-anchor="middle">think: layouts stay scoped</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.1s" dur="0.6s" fill="freeze"/>
    <rect class="d-box" x="30" y="200" width="600" height="72" rx="10"/>
    <circle class="d-box-accent" cx="48" cy="200" r="12"/>
    <text class="d-text d-accent" x="48" y="205" text-anchor="middle">3</text>
    <text class="d-text" x="338" y="230" text-anchor="middle">power move: separate root layouts per group</text>
    <text class="d-sub" x="330" y="254" text-anchor="middle">say: own html and body shells — same URL space, different worlds</text>
  </g>
</svg>

Disk structure on the left, public URLs on the right, and the real payoff at the bottom.

## 3. Uses

| Use | Benefit |
| :--- | :--- |
| Organize files | clarity with zero URL change |
| Scoped layout | different shell per section |
| Multiple root layouts | fully separate html/body trees |
| Split concerns | auth, app, marketing stay apart |

## 4. Common Pitfalls

- **Expecting the group in the URL.** It never appears — linking to /(marketing)/pricing 404s.
- **Claiming the same path from two groups.** That is a routing conflict the framework cannot resolve.
- **One giant root layout with conditionals.** Groups replace <code>if (isMarketing)</code> shell-switching with real structure.
- **Nesting groups pointlessly.** One level of concern-splitting is usually enough; deeper nesting confuses.

## 5. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One line:</strong> <span style="color:#f0e2c8;">"Parentheses group routes for organization and layout scoping without adding a URL segment."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Give the scenario:</strong> <span style="color:#f0e2c8;">"(marketing) and (app) each get their own layout — even their own root html and body — while URLs stay /pricing and /dashboard."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the limit:</strong> <span style="color:#f0e2c8;">"Two groups may never resolve the same URL — that is a hard conflict."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is this different from a normal nested folder?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A normal folder adds a URL segment and usually a shared layout along the path. A group adds the layout scoping with no URL segment at all.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why multiple root layouts instead of one conditional layout?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Separate html and body trees mean separate fonts, metadata, and providers with no runtime branching — marketing and app stop sharing anything they should not share.</span>
</div>

</div>

## 6. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Route group** | Parenthesized folder invisible in URLs |
| **Root layout** | Top-level shell with its own html/body |

---
**Conclusion:** groups are the answer whenever shells must differ but URLs must not — dividers on disk, clean addresses in the browser, and fully separate worlds when you need them.`,
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

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are parallel routes (@slot) in Next.js and when would you use them?",
    seoDescription:
      "At-prefixed slots render multiple route regions simultaneously with independent loading, errors, and navigation.",
    description: `**Question presented to candidate:**
"Your dashboard must show the team panel and the analytics panel side by side, each loading independently — and a slow analytics query may not block the team list. How do you structure that in the App Router?"

**What a strong answer should cover:**
- @slot folders render simultaneously in one layout, passed as named props beside children.
- Each slot owns its loading.js and error.js and navigates independently.
- default.js fills a slot when the URL does not match it.
- Flagship uses: dashboards with independent panels, modals with intercepting routes.

**Clarifying questions expected:**
- "Must the panels load and fail independently, or is one shell-level spinner fine?"
- "Is there a modal-over-page pattern coming later?" — slots plus interception.

**Code / implementation expected:** Yes — a layout consuming named slot props is the canonical shape.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic layout familiarity.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Behavior matches the installed Next.js 16.3.4.

## 1. Why This Even Matters — A Story First

A TV wall shows the news, the match, and the weather at once — one slow channel never freezes the others. Parallel routes are a TV wall for your layout: independent regions, each with its own signal, sharing one frame.

## 2. The Core Idea

📌 **Interview term: parallel route (slot)** — an <code>@folder</code> (e.g. <code>@team</code>) that adds **no URL segment** but renders **simultaneously** with its siblings, arriving in the parent layout as a **named prop**.

📌 **Interview term: default.js** — the fallback a slot renders when the current URL does not match anything inside it.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 320" role="img" aria-label="One layout frame rendering two independent slots plus a fallback rule">
  <defs>
    <marker id="pr-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">One frame, two signals: slots render together</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-muted" x="20" y="46" width="620" height="150" rx="10"/>
    <text class="d-sub" x="40" y="68">layout receives every slot as a named prop</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="45" y="82" width="275" height="96" rx="10"/>
    <circle class="d-box-accent" cx="63" cy="82" r="12"/>
    <text class="d-text d-accent" x="63" y="87" text-anchor="middle">1</text>
    <text class="d-text d-accent" x="190" y="112" text-anchor="middle">@team</text>
    <text class="d-sub" x="182" y="134" text-anchor="middle">own loading + error</text>
    <text class="d-sub" x="182" y="156" text-anchor="middle">say: slow query stays local</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="340" y="82" width="275" height="96" rx="10"/>
    <circle class="d-box-accent" cx="358" cy="82" r="12"/>
    <text class="d-text d-accent" x="358" y="87" text-anchor="middle">2</text>
    <text class="d-text d-accent" x="485" y="112" text-anchor="middle">@analytics</text>
    <text class="d-sub" x="477" y="134" text-anchor="middle">navigates independently</text>
    <text class="d-sub" x="477" y="156" text-anchor="middle">say: panels never block each other</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.6s" fill="freeze"/>
    <rect class="d-box" x="20" y="216" width="620" height="76" rx="10"/>
    <circle class="d-box-accent" cx="38" cy="216" r="12"/>
    <text class="d-text d-accent" x="38" y="221" text-anchor="middle">3</text>
    <text class="d-text" x="338" y="246" text-anchor="middle">default.js fills unmatched slots</text>
    <text class="d-sub" x="330" y="270" text-anchor="middle">say: dashboards today, @modal lightboxes with intercepting routes next</text>
  </g>
</svg>

No arrows between the slots is the point — they share a frame but no fate.

## 3. Slot pieces

| Piece | Role |
| :--- | :--- |
| <code>@slot</code> folder | named region, no URL segment |
| Layout prop | each slot arrives beside children |
| <code>default.js</code> | fallback when the URL misses the slot |
| Plus intercepting routes | the modal pattern |

## 4. Common Pitfalls

- **One loading.js for the whole dashboard.** That reintroduces the blocking you built slots to avoid — give slow slots their own boundary.
- **Forgetting default.js.** Hard reloads on unmatched URLs render nothing in the slot — a blank panel mystery.
- **Importing slot content directly.** Slots arrive as props; importing couples what the router should compose.
- **Using slots for tabs that need URLs.** If each view needs its own address, those are routes, not slots.

## 5. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One line:</strong> <span style="color:#f0e2c8;">"At-slots render multiple regions in one layout simultaneously, each with independent loading, errors, and navigation."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Assign the scenario:</strong> <span style="color:#f0e2c8;">"Team and analytics become @team and @analytics props of the dashboard layout — the slow query can never block the team list."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the two details:</strong> <span style="color:#f0e2c8;">"default.js covers unmatched URLs, and the same machinery plus intercepting routes builds modal lightboxes."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does the layout actually receive a slot?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">As a named prop beside children — @team arrives as the team prop. The layout decides where each region sits on screen.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What renders in a slot on a URL that misses it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Its default.js — without one the slot renders nothing, which is the classic blank-panel-on-reload bug.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Slots or just components?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Components when the regions share data fate and loading. Slots when regions need independent routing, loading, and error boundaries — that independence is the whole purchase.</span>
</div>

</div>

## 6. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Slot** | An @folder rendered as a named layout prop |
| **default.js** | A slot fallback for unmatched URLs |

---
**Conclusion:** parallel routes buy independence — simultaneous regions that load, fail, and navigate on their own schedules inside one frame, and the same machinery powers modal patterns next.`,
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

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are intercepting routes in Next.js and what are they used for?",
    seoDescription:
      "Dot-prefix conventions render a route as a modal on soft navigation but the full page on reload, keeping URLs shareable.",
    description: `**Question presented to candidate:**
"Clicking a photo in the feed should open it in a modal over the feed — but the URL must be shareable, and opening that URL directly must show the full photo page. How do you build that?"

**What a strong answer should cover:**
- (.), (..), (...) conventions intercept soft navigations at a chosen segment level.
- The URL still updates to the real route, so links stay shareable and bookmarkable.
- Hard reload or direct visit skips interception and renders the full page.
- Pairs with a parallel @modal slot plus default.js.

**Clarifying questions expected:**
- "Modal over preserved context, or a plain navigation?" — only the first needs interception.
- "What should a direct link open?" — confirms the full-page fallback requirement.

**Code / implementation expected:** Yes — the folder sketch (feed, photo page, @modal interception, default) is the expected artifact.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes parallel-route familiarity.
**Difficulty:** Medium to Hard

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Behavior matches the installed Next.js 16.3.4.

## 1. Why This Even Matters — A Story First

A museum lets you peek at a painting through a doorway without leaving your tour — but hands you the full gallery ticket if you arrive at that painting entrance directly. Intercepting routes are that doorway: context preserved for insiders, full experience for direct arrivals, same address for everyone.

## 2. The Core Idea

📌 **Interview term: intercepting route** — a route using a dot-prefix convention (<code>(.)</code>, <code>(..)</code>, <code>(...)</code>) that renders **inside the current layout** on soft navigation instead of replacing the page.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 300" role="img" aria-label="Soft navigation opens a modal while reload renders the full page">
  <defs>
    <marker id="ir-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="340" y="24" text-anchor="middle">Same URL, two doors: context for insiders, page for arrivals</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="20" y="60" width="190" height="110" rx="10"/>
    <circle class="d-box-accent" cx="38" cy="60" r="12"/>
    <text class="d-text d-accent" x="38" y="65" text-anchor="middle">1</text>
    <text class="d-text d-accent" x="123" y="90" text-anchor="middle">click link</text>
    <text class="d-sub" x="115" y="112" text-anchor="middle">soft nav in feed</text>
    <text class="d-sub" x="115" y="134" text-anchor="middle">say: context kept</text>
    <text class="d-sub" x="115" y="156" text-anchor="middle">think: who is asking</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.4s" dur="0.5s" fill="freeze"/>
    <path class="d-edge-accent" d="M 212 115 L 248 115" marker-end="url(#ir-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 212 115 L 248 115"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.6s" dur="0.5s" fill="freeze"/>
    <rect class="d-box" x="250" y="60" width="200" height="110" rx="10"/>
    <circle class="d-box-accent" cx="268" cy="60" r="12"/>
    <text class="d-text d-accent" x="268" y="65" text-anchor="middle">2</text>
    <text class="d-text" x="358" y="90" text-anchor="middle">modal, URL updated</text>
    <text class="d-sub" x="350" y="112" text-anchor="middle">@modal slot renders</text>
    <text class="d-sub" x="350" y="134" text-anchor="middle">say: shareable link</text>
    <text class="d-sub" x="350" y="156" text-anchor="middle">think: interception hit</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.5s" fill="freeze"/>
    <path class="d-edge-dashed" d="M 452 115 L 478 115" marker-end="url(#ir-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2.5s" begin="1s" repeatCount="indefinite" path="M 452 115 L 478 115"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2.5s" begin="1s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-muted" x="480" y="60" width="180" height="110" rx="10"/>
    <circle class="d-box-accent" cx="498" cy="60" r="12"/>
    <text class="d-text d-accent" x="498" y="65" text-anchor="middle">3</text>
    <text class="d-text" x="578" y="90" text-anchor="middle">reload</text>
    <text class="d-sub" x="570" y="112" text-anchor="middle">full photo page</text>
    <text class="d-sub" x="570" y="134" text-anchor="middle">say: deep link works</text>
    <text class="d-sub" x="570" y="156" text-anchor="middle">think: interception skipped</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.5s" dur="0.6s" fill="freeze"/>
    <rect class="d-box" x="20" y="196" width="640" height="76" rx="10"/>
    <text class="d-text" x="348" y="226" text-anchor="middle">prefix picks the level: (.) same, (..) up one, (...) from root</text>
    <text class="d-sub" x="340" y="250" text-anchor="middle">say: pair with a @modal slot plus default.js — the modal has somewhere to live</text>
  </g>
</svg>

Follow the dots for the insider path, the dashed line for the direct arrival — both end at the same address.

## 3. Intercept prefixes

| Prefix | Intercepts at |
| :--- | :--- |
| <code>(.)</code> | same segment level |
| <code>(..)</code> | one level up (<code>(..)(..)</code> goes two) |
| <code>(...)</code> | from the app root |
| Reload or direct visit | no interception — full page |

## 4. Common Pitfalls

- **No @modal slot to render into.** Interception without a parallel slot has nowhere to show the modal — pair them always.
- **Missing default.js.** The slot renders nothing when no interception is active — a permanently empty modal region.
- **Wrong prefix level.** Same-level vs one-up is the classic misfire; the modal silently never appears.
- **Closing the modal with back() confusion.** Dismissing should route back, not just hide DOM, or the URL and UI disagree.

## 5. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The pitch:</strong> <span style="color:#f0e2c8;">"Modal on soft navigation, full page on reload, shareable URL throughout — one route, two doors."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The machinery:</strong> <span style="color:#f0e2c8;">"A dot-prefix route intercepted into a parallel @modal slot, with default.js covering the idle state."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The sketch:</strong> <span style="color:#f0e2c8;">feed page, photo page, @modal interception file, default — four lines that prove you have built it.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do (.), (..), and (...) differ?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">They pick the segment level the interception applies at — same level, one up, or from the root. Wrong level is the standard reason a modal never appears.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just useState for the modal?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">State modals have no URL — nothing to share, bookmark, or reload into. Interception keeps the address real while preserving feed context.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens on refresh with the modal open?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The browser requests the URL directly, interception does not apply, and the full standalone page renders. That fallback is the design, not an edge case.</span>
</div>

</div>

## 6. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Intercepting route** | Dot-prefix route rendered in current context |
| **Soft navigation** | Client-side route change preserving layout |
| **@modal slot** | Parallel region hosting intercepted UI |

---
**Conclusion:** interception is deep-linkable modals done properly — context for insiders, full pages for arrivals, one address for everyone, and a slot plus default file doing the structural work.`,
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

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is loading.js in Next.js and how does Suspense streaming work?",
    seoDescription:
      "loading.js auto-wraps a segment in Suspense so shells stream instantly and slow content streams in when ready.",
    description: `**Question presented to candidate:**
"Your dashboard query takes three seconds, but the nav and page frame could show immediately. How do you get the shell on screen fast without managing spinner state by hand?"

**What a strong answer should cover:**
- loading.js auto-creates a Suspense boundary per segment — no manual wiring.
- Shell and fallback stream instantly; finished HTML streams in and swaps the fallback.
- Slow data never blocks sibling or parent content.
- Manual Suspense boundaries give per-component granularity for multiple slow regions.

**Clarifying questions expected:**
- "One slow region or several with different speeds?" — decides file vs manual boundaries.
- "Is first paint or full interactivity the metric?" — streaming optimizes perceived paint.

**Code / implementation expected:** Yes — a loading skeleton plus the slow async page.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic async-component familiarity.
**Difficulty:** Easy to Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Behavior matches the installed Next.js 16.3.4.

## 1. Why This Even Matters — A Story First

A restaurant seats you instantly with bread while the main course cooks — it never locks the door until every dish is ready. Streaming SSR seats your user the same way: structure now, slow courses as they finish.

## 2. The Core Idea

📌 **Interview term: loading.js** — a convention file that auto-wraps its segment in a Suspense boundary with your fallback UI.

📌 **Interview term: streaming SSR** — sending the shell HTML immediately, then streaming finished segments as their data resolves.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 300" role="img" aria-label="Shell streams instantly, slow content swaps in when ready">
  <defs>
    <marker id="ld-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Seat them now: shell first, slow courses later</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="30" y="60" width="260" height="120" rx="10"/>
    <circle class="d-box-accent" cx="48" cy="60" r="12"/>
    <text class="d-text d-accent" x="48" y="65" text-anchor="middle">1</text>
    <text class="d-text d-accent" x="168" y="90" text-anchor="middle">shell + loading</text>
    <text class="d-sub" x="160" y="112" text-anchor="middle">streams instantly</text>
    <text class="d-sub" x="160" y="134" text-anchor="middle">say: skeleton first</text>
    <text class="d-sub" x="160" y="156" text-anchor="middle">think: no hand spinners</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.4s" dur="0.5s" fill="freeze"/>
    <path class="d-edge-accent" d="M 292 120 L 366 120" marker-end="url(#ld-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2.4s" repeatCount="indefinite" path="M 292 120 L 366 120"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2.4s" repeatCount="indefinite"/>
    </circle>
    <text class="d-sub" x="329" y="108" text-anchor="middle">data resolves</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.6s" dur="0.5s" fill="freeze"/>
    <rect class="d-box" x="370" y="60" width="260" height="120" rx="10"/>
    <circle class="d-box-accent" cx="388" cy="60" r="12"/>
    <text class="d-text d-accent" x="388" y="65" text-anchor="middle">2</text>
    <text class="d-text" x="508" y="90" text-anchor="middle">content streamed</text>
    <text class="d-sub" x="500" y="112" text-anchor="middle">swaps fallback in place</text>
    <text class="d-sub" x="500" y="134" text-anchor="middle">say: slow never blocks</text>
    <text class="d-sub" x="500" y="156" text-anchor="middle">think: per-segment Suspense</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.1s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="30" y="200" width="600" height="72" rx="10"/>
    <circle class="d-box-accent" cx="48" cy="200" r="12"/>
    <text class="d-text d-accent" x="48" y="205" text-anchor="middle">3</text>
    <text class="d-text" x="338" y="230" text-anchor="middle">several slow regions: wrap each in Suspense yourself</text>
    <text class="d-sub" x="330" y="254" text-anchor="middle">say: independent streams beat one gate — pair with parallel slots</text>
  </g>
</svg>

The arrow only ever flows forward: instant structure, then content as it finishes.

## 3. Streaming benefits

| Piece | Effect |
| :--- | :--- |
| <code>loading.js</code> | automatic boundary, zero wiring |
| Instant shell | fast first paint, real TTFB win |
| Streamed swap | slow data cannot block siblings |
| Manual Suspense | per-component granularity |

## 4. Common Pitfalls

- **One boundary around everything.** A single top-level Suspense re-gates the whole page — push boundaries down to the slow leaves.
- **Skeletons that lie.** A fallback wildly unlike the final layout causes layout shift when content swaps in.
- **Fetching sequentially inside the segment.** Streaming cannot save a waterfall — parallelize with Promise.all first.
- **loading.js for instant data.** A flashing skeleton around a 50ms fetch is worse than a brief blank — reserve it for genuinely slow segments.

## 5. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The chain:</strong> <span style="color:#f0e2c8;">"loading.js is an automatic Suspense boundary — shell and skeleton stream instantly, finished HTML streams in and swaps the fallback."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The payoff:</strong> <span style="color:#f0e2c8;">"A three-second query stops blocking first paint, with no spinner state managed by hand."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The depth cut:</strong> <span style="color:#f0e2c8;">"Multiple slow regions get their own Suspense each — independent streams, and it composes with parallel slots."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">loading.js versus manual Suspense?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">loading.js covers the whole segment with zero wiring. Manual boundaries split one segment into independently streaming pieces — use both, at different granularities.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does streaming help a slow query itself?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No — it helps everything around it. The query still takes three seconds; the win is the user sees structure meanwhile instead of a blank page.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where does the fallback render — server or client?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The fallback streams from the server as instant HTML, then React swaps in the finished segment client-side when its stream arrives. No client fetching involved.</span>
</div>

</div>

## 6. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **loading.js** | File-based Suspense fallback per segment |
| **Streaming SSR** | HTML sent in chunks as data resolves |

---
**Conclusion:** loading.js turns waiting into choreography — instant shell, independent streams, zero spinner bookkeeping — and the senior touch is knowing when to subdivide the stage further.`,
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

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is error.js in Next.js and how does error handling work in the App Router?",
    seoDescription:
      "error.js is a per-segment Client Component boundary with reset(); global-error.js covers the root; expected errors stay in code.",
    description: `**Question presented to candidate:**
"A widget deep in the dashboard throws during render. How do you keep the rest of the app — nav, sidebar, other panels — alive, show a fallback, and offer a retry?"

**What a strong answer should cover:**
- error.js must be a Client Component; it receives { error, reset } for one segment.
- The surrounding layout stays mounted — blast radius is one segment.
- global-error.js is required for root-layout failures and renders its own html/body.
- Expected failures (validation, missing records) belong in code flow, not boundaries.

**Clarifying questions expected:**
- "Can the user retry, or is this fatal?" — decides reset() vs redirect vs notFound.
- "Which chrome must survive — whole app or just siblings?" — scopes the boundary level.

**Code / implementation expected:** Yes — the { error, reset } component is the expected artifact.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic error-boundary intuition.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Behavior matches the installed Next.js 16.3.4.

## 1. Why This Even Matters — A Story First

A blown fuse should darken one room, not the street. Per-segment error boundaries are fuses: the faulty widget goes dark with its own fallback and a reset switch, while the rest of the house keeps its lights.

## 2. The Core Idea

📌 **Interview term: error.js** — a Client Component file defining an error boundary for its segment, receiving the error and a <code>reset()</code> retry function.

📌 **Interview term: global-error.js** — the boundary above the root layout, required because the root has no parent boundary; it renders its own html and body.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 320" role="img" aria-label="A segment error is caught locally with reset, while the layout survives">
  <defs>
    <marker id="er-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">One blown fuse: catch locally, retry, keep the house lit</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-muted" x="20" y="60" width="200" height="110" rx="10"/>
    <circle class="d-box-accent" cx="38" cy="60" r="12"/>
    <text class="d-text d-accent" x="38" y="65" text-anchor="middle">1</text>
    <text class="d-text" x="128" y="90" text-anchor="middle">page throws</text>
    <text class="d-sub" x="120" y="112" text-anchor="middle">during render</text>
    <text class="d-sub" x="120" y="134" text-anchor="middle">say: unexpected only</text>
    <text class="d-sub" x="120" y="156" text-anchor="middle">think: not validation</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.4s" dur="0.5s" fill="freeze"/>
    <path class="d-edge-accent" d="M 222 115 L 266 115" marker-end="url(#er-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="1.6s" repeatCount="indefinite" path="M 222 115 L 266 115"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="1.6s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.6s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="270" y="60" width="220" height="110" rx="10"/>
    <circle class="d-box-accent" cx="288" cy="60" r="12"/>
    <text class="d-text d-accent" x="288" y="65" text-anchor="middle">2</text>
    <text class="d-text d-accent" x="388" y="90" text-anchor="middle">error.tsx</text>
    <text class="d-sub" x="380" y="112" text-anchor="middle">use client fallback</text>
    <text class="d-sub" x="380" y="134" text-anchor="middle">say: reset retries segment</text>
    <text class="d-sub" x="380" y="156" text-anchor="middle">think: layout survives</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.5s" fill="freeze"/>
    <path class="d-edge-dashed" d="M 380 172 L 380 196 L 120 196 L 120 172" marker-end="url(#er-arrow)"/>
    <text class="d-sub" x="250" y="190" text-anchor="middle">reset() retries the segment</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.6s" fill="freeze"/>
    <rect class="d-box" x="20" y="216" width="620" height="76" rx="10"/>
    <circle class="d-box-accent" cx="38" cy="216" r="12"/>
    <text class="d-text d-accent" x="38" y="221" text-anchor="middle">3</text>
    <text class="d-text" x="338" y="246" text-anchor="middle">root layout failures need global-error.tsx</text>
    <text class="d-sub" x="330" y="270" text-anchor="middle">say: own html and body — expected errors stay in code flow</text>
  </g>
</svg>

Forward for the catch, dashed back for the retry, and the root rule at the bottom.

## 3. Error handling map

| File | Catches |
| :--- | :--- |
| <code>error.tsx</code> | unexpected errors inside its segment |
| <code>global-error.tsx</code> | root layout and above |
| <code>notFound()</code> | expected missing resources |
| In-code try/catch | expected operational failures |

## 4. Common Pitfalls

- **Writing error.js as a Server Component.** Boundaries need client interactivity for reset — the use client directive is mandatory.
- **Routing expected errors into boundaries.** Missing records want notFound(), validation wants inline UI — boundaries are for the unexpected.
- **Assuming the layout unmounts.** It survives by design; losing the whole shell means the boundary sits too high.
- **No global-error file.** A root-layout throw with no global boundary escapes to the default crash page.

## 5. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The shape:</strong> <span style="color:#f0e2c8;">"error.js is a Client Component boundary per segment — fallback UI plus reset, and the layout stays mounted."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The scope rule:</strong> <span style="color:#f0e2c8;">"Unexpected render failures go here; missing records go to notFound and validation stays inline."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The root detail:</strong> <span style="color:#f0e2c8;">"Root-layout failures need global-error with its own html and body."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why must error.js be a Client Component?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Reset is interactive — it re-renders the segment on click. A Server Component never hydrates, so the retry button would be dead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What survives when a segment errors?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Everything above the boundary — parent layouts stay mounted with state intact. Only the failed segment swaps to fallback.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">error.js or not-found for a missing post?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">notFound() — a missing record is expected, SEO-relevant, and deserves a real 404 status, not a crash boundary.</span>
</div>

</div>

## 6. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **error.js** | Per-segment Client Component boundary |
| **reset()** | Retry function re-rendering the segment |
| **global-error.js** | Boundary above the root layout |

---
**Conclusion:** fuse the house per room — unexpected failures get a local fallback with a retry switch, the shell keeps standing, and the root carries its own special fuse.`,
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

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is not-found.js in Next.js and how do you trigger a 404?",
    seoDescription:
      "not-found.tsx renders per-segment 404 UI; calling notFound() stops render and returns a real 404 status.",
    description: `**Question presented to candidate:**
"A user opens /blog/deleted-post. How do you show a proper 404 page — with a real 404 status for crawlers — scoped so the blog section can style it its own way?"

**What a strong answer should cover:**
- not-found.tsx defines the 404 UI per segment; the root one covers unmatched URLs.
- notFound() throws a framework-caught signal: stops render, shows nearest not-found, sends 404.
- Real status matters for SEO — rendering a message with 200 is the classic mistake.
- Each section can own tailored 404 UI via its own file.

**Clarifying questions expected:**
- "Missing resource or broken route?" — decides notFound() call vs root file.
- "Does SEO matter here?" — justifies the real-status requirement.

**Code / implementation expected:** Yes — lookup-then-notFound() is the three-line pattern.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic routing familiarity.
**Difficulty:** Easy

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Behavior matches the installed Next.js 16.3.4.

## 1. Why This Even Matters — A Story First

A shop with no size in stock does not stare silently or hand you the wrong box — it says "not available" clearly at the counter. notFound() is that clear counter moment, with the paperwork (HTTP 404) filed correctly behind it.

## 2. The Core Idea

📌 **Interview term: not-found.tsx** — the convention file rendering 404 UI for its segment.

📌 **Interview term: notFound()** — the helper that aborts rendering and tells the framework to serve the nearest not-found UI with a genuine 404 status.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 280" role="img" aria-label="A missing record triggers notFound and renders the nearest 404 boundary">
  <defs>
    <marker id="nf-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Missing record: stop, show the local 404, file the status</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-muted" x="20" y="60" width="190" height="110" rx="10"/>
    <circle class="d-box-accent" cx="38" cy="60" r="12"/>
    <text class="d-text d-accent" x="38" y="65" text-anchor="middle">1</text>
    <text class="d-text" x="123" y="90" text-anchor="middle">lookup fails</text>
    <text class="d-sub" x="115" y="112" text-anchor="middle">getPost is null</text>
    <text class="d-sub" x="115" y="134" text-anchor="middle">say: expected case</text>
    <text class="d-sub" x="115" y="156" text-anchor="middle">think: not a crash</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.4s" dur="0.5s" fill="freeze"/>
    <path class="d-edge-accent" d="M 212 115 L 258 115" marker-end="url(#nf-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="1.8s" repeatCount="indefinite" path="M 212 115 L 258 115"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="1.8s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.6s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="260" y="60" width="180" height="110" rx="10"/>
    <circle class="d-box-accent" cx="278" cy="60" r="12"/>
    <text class="d-text d-accent" x="278" y="65" text-anchor="middle">2</text>
    <text class="d-text d-accent" x="358" y="90" text-anchor="middle">notFound()</text>
    <text class="d-sub" x="350" y="112" text-anchor="middle">stops the render</text>
    <text class="d-sub" x="350" y="134" text-anchor="middle">say: framework takes over</text>
    <text class="d-sub" x="350" y="156" text-anchor="middle">think: nearest boundary</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.5s" fill="freeze"/>
    <path class="d-edge" d="M 442 115 L 478 115" marker-end="url(#nf-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" begin="0.9s" repeatCount="indefinite" path="M 442 115 L 478 115"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" begin="0.9s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box" x="480" y="60" width="160" height="110" rx="10"/>
    <circle class="d-box-accent" cx="498" cy="60" r="12"/>
    <text class="d-text d-accent" x="498" y="65" text-anchor="middle">3</text>
    <text class="d-text" x="568" y="90" text-anchor="middle">not-found.tsx</text>
    <text class="d-sub" x="560" y="112" text-anchor="middle">real 404 status</text>
    <text class="d-sub" x="560" y="134" text-anchor="middle">say: SEO-correct</text>
    <text class="d-sub" x="560" y="156" text-anchor="middle">think: per-section UI</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.5s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="20" y="196" width="620" height="58" rx="10"/>
    <text class="d-sub" x="330" y="231" text-anchor="middle">a rendered message with status 200 is the classic failure — crawlers index your dead ends</text>
  </g>
</svg>

Three hops and a warning: detect, delegate, deliver — and never fake the status code.

## 3. 404 pieces

| Piece | Role |
| :--- | :--- |
| <code>not-found.tsx</code> | segment-scoped 404 UI |
| <code>notFound()</code> | trigger plus genuine 404 status |
| Root file | unmatched URLs |
| Per-section file | tailored dead-end design |

## 4. Common Pitfalls

- **Rendering "not found" text with a 200.** Crawlers index the dead end; rankings and analytics rot.
- **Throwing a generic error instead.** That routes to error.js with a 500 — wrong semantics and wrong UI.
- **One global 404 for every section.** Docs, blog, and app deserve their own dead-end voice.
- **Calling notFound() after sending content.** It must precede any return of real UI — it aborts the render.

## 5. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The pattern:</strong> <span style="color:#f0e2c8;">"Look up, call notFound() when null — render stops, the nearest not-found.tsx shows, status is a real 404."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The why:</strong> <span style="color:#f0e2c8;">"Genuine status keeps crawlers honest — a 200 with sad text is the failure mode."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The scope:</strong> <span style="color:#f0e2c8;">"Per-segment files let the blog and the app mourn differently."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">notFound() or error.js for a failed fetch?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Missing resource goes to notFound with a 404; a broken backend goes to error.js with a retry. Expected versus unexpected decides.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where does an unmatched URL land?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The root not-found.tsx — no route matched, so the top-level boundary renders with a 404 status.</span>
</div>

</div>

## 6. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **not-found.tsx** | Segment 404 UI file |
| **notFound()** | Helper aborting render with a 404 |

---
**Conclusion:** treat missing as a first-class outcome — detect it, delegate to the nearest boundary, and file the honest status code. Crawlers and users both reward the honesty.`,
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

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How does client-side navigation work in Next.js (next/link and useRouter)?",
    seoDescription:
      "Link prefetches on viewport entry and soft-navigates keeping layouts mounted; useRouter covers push, replace, and refresh.",
    description: `**Question presented to candidate:**
"Moving between dashboard pages feels instant with no white flash, yet the sidebar never remounts — and after saving a form you must jump to /done in code. What machinery makes each happen?"

**What a strong answer should cover:**
- Link renders a real anchor but soft-navigates: only changed segments fetch, layouts persist.
- Prefetch on viewport entry (production) into the Router Cache; prefetch={false} opts out.
- useRouter push/replace/back plus refresh() for re-pulling server data after mutations.
- usePathname/useSearchParams read URL state; searchParams needs a Suspense boundary for static prerender.

**Clarifying questions expected:**
- "Declarative links or post-action redirects?" — decides Link vs router.
- "Must fresh server data load after the action?" — brings in refresh().

**Code / implementation expected:** Yes — a Link plus a post-save router.push pair.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic anchor-tag familiarity.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Behavior matches the installed Next.js 16.3.4.

## 1. Why This Even Matters — A Story First

Teleporting room-to-room beats rebuilding the house every trip. Soft navigation teleports: the new room arrives while the hallway (your layout) never moves. Prefetching is packing the bags before you even decide to go.

## 2. The Core Idea

📌 **Interview term: soft navigation** — a client-side route change fetching only the changed segments RSC payload while shared layouts stay mounted.

📌 **Interview term: prefetching** — loading a linked route code and data when its <code>Link</code> enters the viewport, so the click feels instant.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 330" role="img" aria-label="Prefetch on sight, swap little on click, steer in code">
  <defs>
    <marker id="nv-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="340" y="24" text-anchor="middle">Pack early, teleport later: prefetch, swap, steer</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="20" y="56" width="200" height="120" rx="10"/>
    <circle class="d-box-accent" cx="38" cy="56" r="12"/>
    <text class="d-text d-accent" x="38" y="61" text-anchor="middle">1</text>
    <text class="d-text d-accent" x="128" y="86" text-anchor="middle">Link in view</text>
    <text class="d-sub" x="120" y="108" text-anchor="middle">payload prefetched</text>
    <text class="d-sub" x="120" y="130" text-anchor="middle">say: packed early</text>
    <text class="d-sub" x="120" y="152" text-anchor="middle">think: Router Cache</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.4s" dur="0.5s" fill="freeze"/>
    <path class="d-edge-accent" d="M 222 116 L 266 116" marker-end="url(#nv-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 222 116 L 266 116"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.6s" dur="0.5s" fill="freeze"/>
    <rect class="d-box" x="270" y="56" width="200" height="120" rx="10"/>
    <circle class="d-box-accent" cx="288" cy="56" r="12"/>
    <text class="d-text d-accent" x="288" y="61" text-anchor="middle">2</text>
    <text class="d-text" x="378" y="86" text-anchor="middle">click: soft nav</text>
    <text class="d-sub" x="370" y="108" text-anchor="middle">segments swap only</text>
    <text class="d-sub" x="370" y="130" text-anchor="middle">say: shell never moves</text>
    <text class="d-sub" x="370" y="152" text-anchor="middle">think: no full reload</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.5s" fill="freeze"/>
    <path class="d-edge" d="M 472 116 L 496 116" marker-end="url(#nv-arrow)"/>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.0s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-muted" x="500" y="56" width="160" height="120" rx="10"/>
    <circle class="d-box-accent" cx="518" cy="56" r="12"/>
    <text class="d-text d-accent" x="518" y="61" text-anchor="middle">3</text>
    <text class="d-text" x="588" y="86" text-anchor="middle">layout kept</text>
    <text class="d-sub" x="580" y="108" text-anchor="middle">state survives</text>
    <text class="d-sub" x="580" y="130" text-anchor="middle">say: no white flash</text>
    <text class="d-sub" x="580" y="152" text-anchor="middle">think: teleport works</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.4s" dur="0.6s" fill="freeze"/>
    <rect class="d-box" x="20" y="200" width="640" height="104" rx="10"/>
    <text class="d-text" x="348" y="230" text-anchor="middle">in code: push, replace, refresh — read with pathname hooks</text>
    <text class="d-sub" x="340" y="254" text-anchor="middle">say: refresh re-pulls server data after a mutation</text>
    <text class="d-sub" x="340" y="276" text-anchor="middle">say: searchParams needs Suspense; transitionTypes animates nav in 16.2</text>
  </g>
</svg>

Pack on sight, swap on click, steer in code — three moves, one instant feel.

## 3. Navigation tools

| Tool | Use |
| :--- | :--- |
| <code>&lt;Link&gt;</code> | declarative nav plus prefetch |
| <code>router.push / replace</code> | programmatic moves, with or without history |
| <code>router.refresh()</code> | re-fetch current route server data |
| <code>usePathname / useSearchParams</code> | read URL state in Client Components |

📌 **Interview term: router.refresh()** — re-requests the current route server payload and updates the Router Cache; the standard "show my mutation" call after a Server Action.

## 4. Common Pitfalls

- **useRouter from next/router in app/.** That is the Pages import — App Router code imports from next/navigation.
- **useSearchParams without Suspense.** Static prerender bails out to client rendering for the whole page — wrap the reader in a boundary.
- **Prefetching everything.** Prefetch is viewport-triggered and production-only; prefetch={false} trims it on low-value links.
- **Forgetting scroll behavior.** Navigations scroll to top by default; scroll={false} keeps position for in-place updates.

## 5. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The feel:</strong> <span style="color:#f0e2c8;">"Link prefetches on viewport entry; clicks soft-navigate fetching only changed segments while layouts stay mounted."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The code steering:</strong> <span style="color:#f0e2c8;">"Post-save jumps use router.push; after a mutation router.refresh re-pulls server data."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The gotchas:</strong> <span style="color:#f0e2c8;">"next/navigation imports, Suspense around searchParams, and transitionTypes for animated 16.2 navigation."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What exactly is fetched on a soft navigation?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only the changed segments RSC payload — shared layouts are reused from the Router Cache, which is why there is no flash and state survives.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When does prefetch happen?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the Link scrolls into view, in production builds. Prefetch fills the Router Cache ahead of the click; prefetch={false} opts a link out.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why wrap useSearchParams in Suspense?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Reading search params is a dynamic operation — without a boundary the whole page opts out of static prerendering. Suspense confines the dynamic part.</span>
</div>

</div>

## 6. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Soft navigation** | Segment-only swap with layouts intact |
| **Prefetching** | Viewport-triggered route preloading |
| **router.refresh()** | Re-fetch of current server data |

---
**Conclusion:** instant navigation is prepared navigation — pack on sight, swap only what changed, keep the shell standing, and steer in code with the right imports. That is the whole trick.`,
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
