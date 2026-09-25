/**
 * Next.js ULTRA — batch 07: Metadata API, dynamic OG images, sitemap.ts/robots.ts, SEO vs SPA, JSON-LD, next/image, next/font,
 * next/font + next/image for Core Web Vitals.
 * Generated from markdown sources by a build script; Verified blocks are real output from a Next.js 16.3.4 lab (next build /
 * next start, head tags, streaming metadata per user agent, the OG PNG, image optimizer bytes, generated font CSS, jsdom parsing).
 */
import type { NextAugment } from "./nextjs-augments.types";

const augments: NextAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How does the Metadata API work in Next.js (static and generateMetadata)?",
    seoDescription: "Export metadata or generateMetadata from a layout or page and Next.js writes title, description, Open Graph and canonical tags. Checked on 16.3.4.",
    description: `**Question presented to candidate:**
"How do you set the page title, description and social tags in the App Router, including values that depend on data from a database?"

**What a strong answer should cover:**
- Export a \`metadata\` object for static values, or an async \`generateMetadata\` function for values that depend on params or data.
- Metadata is merged from the root layout down to the page; a title \`template\` in a layout wraps child titles.
- \`metadataBase\` turns relative URLs (canonical, Open Graph images) into absolute ones; without it social image URLs fall back to localhost.
- A fetch used in both \`generateMetadata\` and the page is memoized, so it runs once.
- Since Next.js 15.2, metadata from a slow \`generateMetadata\` streams after the page for browsers, but blocks for HTML-limited bots so they still see it in the head.

**Clarifying questions expected:**
- "Does the title depend on data?" — then generateMetadata, reusing the same data function as the page.
- "Where will links be shared?" — Open Graph and Twitter tags matter for social previews.

**Code / implementation expected:** Yes — a layout with a template and a page with generateMetadata.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic React and App Router familiarity.
**Difficulty:** Medium

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.3.4 docs shipped with the package and, in the **Verified** section, against real output from a build or a running server.

## 1. Why This Even Matters — A Story First

Metadata is the label on a jar. The shelf (layout) prints a standard label format, "something | Lab Shop"; each jar (page) fills in its own name. For jars whose name you only know after opening them (data from a database), the label is written after a quick look inside, and the same look is reused when the jar is served, so nobody opens it twice.

## 2. The Core Idea

📌 **Interview term: metadata export** — a static Metadata object exported from a layout or page; Next.js turns it into tags in the head.

📌 **Interview term: generateMetadata** — an async function exported from a layout or page that returns Metadata, used when values depend on params or data.

📌 **Interview term: metadataBase** — a URL set in metadata that makes relative metadata URLs absolute, which social previews require.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 250" role="img" aria-label="How a page title is assembled. root or section layout, page, head">
  <defs>
    <marker id="nx011teq-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">How a page title is assembled</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="24" y="48" width="174.66666666666666" height="118" rx="10"/>
    <circle class="d-box-accent" cx="40" cy="48" r="12"/>
    <text class="d-text d-accent" x="40" y="53" text-anchor="middle">1</text>
    <text class="d-text d-accent" x="111.33333333333333" y="82" text-anchor="middle">root or section layout</text>
    <text class="d-sub" x="111.33333333333333" y="108" text-anchor="middle">metadataBase, defaults</text>
    <text class="d-sub" x="111.33333333333333" y="130" text-anchor="middle">title template %s + name</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 201.66666666666666 107 L 239.66666666666666 107" marker-end="url(#nx011teq-arrow)"/>
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
    <text class="d-text" x="330" y="82" text-anchor="middle">page</text>
    <text class="d-sub" x="330" y="108" text-anchor="middle">metadata export or</text>
    <text class="d-sub" x="330" y="130" text-anchor="middle">generateMetadata()</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 420.3333333333333 107 L 458.3333333333333 107" marker-end="url(#nx011teq-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 420.3333333333333 107 L 458.3333333333333 107"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.7s" dur="0.5s" fill="freeze"/>
    <rect class="d-box" x="461.3333333333333" y="48" width="174.66666666666666" height="118" rx="10"/>
    <circle class="d-box-accent" cx="477.3333333333333" cy="48" r="12"/>
    <text class="d-text d-accent" x="477.3333333333333" y="53" text-anchor="middle">3</text>
    <text class="d-text" x="548.6666666666666" y="82" text-anchor="middle">head</text>
    <text class="d-sub" x="548.6666666666666" y="108" text-anchor="middle">merged, absolute URLs</text>
    <text class="d-sub" x="548.6666666666666" y="130" text-anchor="middle">title, og, canonical</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="2.1s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="188" width="612" height="44" rx="10"/>
    <text class="d-sub" x="330" y="215" text-anchor="middle">lab: layout template + page title gave Product shoe | Lab Shop, and one shared fetch ran once</text>
  </g>
</svg>

Layouts provide the defaults and the shape, pages provide the specifics, and Next.js merges them. You rarely write a tag by hand.

## 3. Common fields

| Field | Produces |
| :--- | :--- |
| \`title\` or \`title: { template, default }\` | The title tag; templates wrap child page titles |
| \`description\` | meta description, reused for Open Graph and Twitter when not set there |
| \`alternates.canonical\` | link rel canonical (absolute with metadataBase) |
| \`openGraph\` | og:title, og:description, og:image, og:type, og:site_name |
| \`twitter\` | twitter:card and related tags (defaults are derived from openGraph) |
| \`robots\` | meta robots, such as noindex for private pages |

## 4. Streaming metadata

When \`generateMetadata\` is slow on a dynamic page, Next.js sends the page first and appends the metadata to the body when it resolves; browsers and JavaScript-running crawlers like Googlebot handle that. For HTML-limited bots (Twitterbot, Slackbot, Bingbot, facebookexternalhit and others in the \`htmlLimitedBots\` list) it still blocks and puts the tags in the head. For social image files see [dynamic Open Graph images](/interview-question/how-do-you-implement-dynamic-open-graph-images-in-next-js-imageresponse).

## 5. Verified — Tags in the Real Head (Next.js 16.3.4, next start)

The \`meta\` layout sets \`metadataBase: https://shop.example.com\`, a title template and \`openGraph.siteName\`. \`/meta\` exports a static title; \`/meta/shoe\` uses generateMetadata with a fetch that the page also makes:

\`\`\`
metadata layout sets metadataBase, a title template '%s | Lab Shop' and openGraph.siteName
/meta:
  <title>Home</title>
  <meta name="description" content="Default description from the meta layout"/>
  <meta property="og:title" content="Home"/>
  <meta property="og:description" content="Default description from the meta layout"/>
  <meta property="og:site_name" content="Lab Shop"/>
  <meta property="og:type" content="website"/>
  <meta name="twitter:card" content="summary"/>
  <meta name="twitter:title" content="Home"/>
  <meta name="twitter:description" content="Default description from the meta layout"/>
/meta/shoe:
  <title>Product shoe | Lab Shop</title>
  <meta name="description" content="Fetched in generateMetadata, hit 2"/>
  <link rel="canonical" href="https://shop.example.com/meta/shoe"/>
  <meta property="og:title" content="OG shoe"/>
  <meta property="og:description" content="Fetched in generateMetadata, hit 2"/>
  <meta name="twitter:card" content="summary"/>
  <meta name="twitter:title" content="OG shoe"/>
  <meta name="twitter:description" content="Fetched in generateMetadata, hit 2"/>
\`\`\`

The test API was called once for \`meta-product/shoe\` during the build, although both \`generateMetadata\` and the page fetched it. Streaming metadata, with \`generateMetadata\` taking 1200 ms:

\`\`\`
GET /meta-slow (dynamic page; generateMetadata waits 1200 ms before returning the title)
Chrome user agent  : body content at    50 ms, title at  1236 ms, title inside <head>: false
Googlebot user agent: body content at    16 ms, title at  1214 ms, title inside <head>: false
Twitterbot          : body content at  1216 ms, title at  1216 ms, title inside <head>: true
facebookexternalhit : body content at  1209 ms, title at  1209 ms, title inside <head>: true
\`\`\`

## 6. Common Pitfalls

- **Missing metadataBase.** Relative Open Graph URLs fall back to \`http://localhost:3000\`; the build warns, and social previews break in production.
- **Fetching twice.** Use the same fetch or a \`React.cache\` function in generateMetadata and the page; do not build a separate query.
- **Title template in the same segment.** A template applies to children, not to the layout own page; set the page title explicitly.
- **Expecting every crawler to wait.** Browsers and Googlebot get streamed metadata; only the listed HTML-limited bots get it in the head.
- **Mixing metadata with manual head tags.** Next.js manages the head; add tags through the Metadata API so they merge correctly.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Export a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">metadata</code> object for static values or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">generateMetadata</code> for data-dependent ones, from layouts and pages.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">Values merge from the root layout down; a layout title template wraps child titles, as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Product shoe | Lab Shop</code> in the lab.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;">Set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">metadataBase</code> so canonical and social URLs are absolute; without it the build warned and used localhost:3000.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;">A fetch shared by generateMetadata and the page is memoized: the lab API saw one call.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">Slow metadata streams after the body for browsers and Googlebot, but blocks for HTML-limited bots like Twitterbot.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can generateMetadata access searchParams?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, pages receive both params and searchParams (as Promises). Reading searchParams makes the page dynamic, like in the page itself.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you mark a page noindex?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">robots: { index: false }</code> from metadata or generateMetadata; Next.js writes the meta robots tag.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did Googlebot get the title outside the head?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Googlebot runs JavaScript, so Next.js streams metadata for it like for browsers; the docs note that it reads the full DOM. HTML-limited bots got the title inside the head.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where do you set viewport and theme color?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In a separate <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">viewport</code> export or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">generateViewport</code>; they are no longer part of the metadata object.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **metadata** | Static Metadata export |
| **generateMetadata** | Async metadata from params and data |
| **metadataBase** | Base URL for absolute metadata URLs |
| **htmlLimitedBots** | Crawlers that receive blocking metadata |

---
**Conclusion:** The Metadata API turns plain objects into head tags: layouts supply defaults and templates, pages supply specifics, and shared fetches run once. The lab showed the merged tags, the localhost fallback when metadataBase is missing, and how slow metadata streams for browsers but still lands in the head for bots that do not run JavaScript.`,
    examples: [
      {
        label: "A layout template and a data-driven page title",
        tech: "tsx",
        runnable: false,
        code: `// app/shop/layout.tsx
import type { Metadata } from "next";
export const metadata: Metadata = {
  metadataBase: new URL("https://shop.example.com"),
  title: { template: "%s | Lab Shop", default: "Lab Shop" },
  openGraph: { siteName: "Lab Shop", type: "website" },
};

// app/shop/[slug]/page.tsx
import type { Metadata } from "next";
import { getProduct } from "@/lib/products"; // fetch or React.cache-wrapped query

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  return {
    title: product.name,                                // -> "Trail Shoe | Lab Shop"
    description: product.summary,
    alternates: { canonical: \`/shop/\${slug}\` },
    openGraph: { images: [product.imageUrl] },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const product = await getProduct((await params).slug); // same call, memoized
  return <h1>{product.name}</h1>;
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you implement dynamic Open Graph images in Next.js (ImageResponse)?",
    seoDescription: "Put opengraph-image.tsx next to a page and return an ImageResponse; Next.js serves a PNG and adds og:image tags. A 1200x630 card measured on Next 16.3.4.",
    description: `**Question presented to candidate:**
"Marketing wants every blog post to have a generated social preview image with the post title. How would you build that in Next.js?"

**What a strong answer should cover:**
- Add an \`opengraph-image.tsx\` (or \`twitter-image.tsx\`) file in the route segment; its default export returns an \`ImageResponse\` from next/og.
- \`ImageResponse\` renders JSX with a subset of CSS (flexbox) to a PNG using Satori; export \`size\`, \`contentType\` and \`alt\`.
- Next.js serves the image at a route and adds \`og:image\`, width, height, type and alt tags to that page automatically.
- It can read params and fetch data, so each post gets its own image; static ones are generated at build time.
- Set \`metadataBase\`, otherwise the og:image URL points at localhost.

**Clarifying questions expected:**
- "Does every page need its own image or one per section?" — the file applies to its segment and below.
- "Which fonts and brand assets are needed?" — they must be loaded explicitly into ImageResponse.

**Code / implementation expected:** Yes — an opengraph-image file for a dynamic route.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic React and App Router familiarity.
**Difficulty:** Hard

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.3.4 docs shipped with the package and, in the **Verified** section, against real output from a build or a running server.

## 1. Why This Even Matters — A Story First

A social preview image is the poster outside a cinema for each film. Instead of a designer painting a poster for every film, you write one poster template and the cinema prints it with each film title as needed. opengraph-image.tsx is that template, and ImageResponse is the printer.

## 2. The Core Idea

📌 **Interview term: ImageResponse** — a next/og class that renders JSX and a subset of CSS to an image response, using Satori under the hood.

📌 **Interview term: opengraph-image** — a file convention in a route segment whose default export produces the Open Graph image for that route and adds the og:image tags.

📌 **Interview term: Satori** — the library that converts JSX with flexbox styles into SVG, which ImageResponse then turns into PNG.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 250" role="img" aria-label="One file becomes an image route and tags. opengraph-image.tsx, image route, page head">
  <defs>
    <marker id="nx02fsr3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">One file becomes an image route and tags</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="24" y="48" width="174.66666666666666" height="118" rx="10"/>
    <circle class="d-box-accent" cx="40" cy="48" r="12"/>
    <text class="d-text d-accent" x="40" y="53" text-anchor="middle">1</text>
    <text class="d-text d-accent" x="111.33333333333333" y="82" text-anchor="middle">opengraph-image.tsx</text>
    <text class="d-sub" x="111.33333333333333" y="108" text-anchor="middle">default export returns</text>
    <text class="d-sub" x="111.33333333333333" y="130" text-anchor="middle">new ImageResponse(jsx)</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 201.66666666666666 107 L 239.66666666666666 107" marker-end="url(#nx02fsr3-arrow)"/>
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
    <text class="d-text" x="330" y="82" text-anchor="middle">image route</text>
    <text class="d-sub" x="330" y="108" text-anchor="middle">PNG image endpoint</text>
    <text class="d-sub" x="330" y="130" text-anchor="middle">1200x630 in the lab</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 420.3333333333333 107 L 458.3333333333333 107" marker-end="url(#nx02fsr3-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 420.3333333333333 107 L 458.3333333333333 107"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.7s" dur="0.5s" fill="freeze"/>
    <rect class="d-box" x="461.3333333333333" y="48" width="174.66666666666666" height="118" rx="10"/>
    <circle class="d-box-accent" cx="477.3333333333333" cy="48" r="12"/>
    <text class="d-text d-accent" x="477.3333333333333" y="53" text-anchor="middle">3</text>
    <text class="d-text" x="548.6666666666666" y="82" text-anchor="middle">page head</text>
    <text class="d-sub" x="548.6666666666666" y="108" text-anchor="middle">og:image, width, height</text>
    <text class="d-sub" x="548.6666666666666" y="130" text-anchor="middle">type and alt added</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="2.1s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="188" width="612" height="44" rx="10"/>
    <text class="d-sub" x="330" y="215" text-anchor="middle">set metadataBase: without it the og:image URL in the lab pointed at http://localhost:3000</text>
  </g>
</svg>

The file convention does two jobs at once: it creates the image endpoint and wires it into the metadata of the page next to it.

## 3. The pieces

| Export | Purpose |
| :--- | :--- |
| \`default\` | Function returning \`new ImageResponse(jsx, options)\`, may be async and receive params |
| \`size\` | \`{ width: 1200, height: 630 }\` for Open Graph |
| \`contentType\` | \`"image/png"\` |
| \`alt\` | Alt text, written to \`og:image:alt\` |
| \`generateImageMetadata\` | Several images for one route |

## 4. Constraints

Only flexbox layout and a subset of CSS are supported; fonts must be loaded (for example from a file with \`readFile\` or fetched) and passed in the \`fonts\` option. Keep images small and avoid heavy data fetching, because crawlers request them on share. For titles and descriptions, see [the Metadata API](/interview-question/how-does-the-metadata-api-work-in-next-js-static-and-generatemetadata).

## 5. Verified — The Generated Image and Tags (Next.js 16.3.4, next start)

\`app/og-demo/opengraph-image.tsx\` exports \`size\` (1200x630), \`contentType\` and \`alt\`, and returns an \`ImageResponse\`. The build listed \`○ /og-demo/opengraph-image\`, and the page head received:

\`\`\`
tags added to /og-demo automatically by app/og-demo/opengraph-image.tsx:
  <meta property="og:image" content="http://localhost:3000/og-demo/opengraph-image?ac944f978c522d33"/>
  <meta property="og:image:type" content="image/png"/>
  <meta property="og:image:width" content="1200"/>
  <meta property="og:image:height" content="630"/>
  <meta property="og:image:alt" content="Lab OG card"/>
GET /og-demo/opengraph-image?ac944f978c522d33 -> 200 image/png, 24718 bytes, PNG 1200x630
cache-control: public, max-age=0, must-revalidate

next build printed (the og-demo route is outside the layout that sets metadataBase):
⚠ metadataBase property in metadata export is not set for resolving social open graph or twitter images, using "http://localhost:3000". See https://nextjs.org/docs/app/api-reference/functions/generate-metadata#metadatabase
\`\`\`

The PNG header confirms 1200x630. The og:image URL uses \`localhost:3000\` because this route is outside the layout that sets \`metadataBase\`, and the build said so.

## 6. Common Pitfalls

- **No metadataBase.** The og:image URL is not reachable from the internet, so previews show nothing.
- **Unsupported CSS.** Grid and many properties are not supported by Satori; use flexbox and explicit sizes.
- **Forgetting fonts.** Without a loaded font the default one is used; load brand fonts from a file and pass them in.
- **Heavy work per image.** Crawlers request images at share time; cache data and keep rendering light.
- **Wrong size.** Use 1200x630 for Open Graph so previews are not cropped.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">opengraph-image.tsx</code> in the route segment and return a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new ImageResponse(jsx, size)</code> from its default export.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">Export <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">contentType</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">alt</code>; Next.js serves the PNG and adds og:image, width, height, type and alt tags.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;">It can await params and fetch data, so each post gets its own image; the lab route returned a 1200x630 PNG.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;">Satori supports flexbox and a CSS subset, and fonts must be loaded explicitly.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">Set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">metadataBase</code>, otherwise the og:image URL points at localhost, as the lab build warned.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is this different from putting an image URL in metadata?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A static URL works for a fixed image. The file convention generates the image per route and adds the tags automatically.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you generate images for Twitter separately?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">twitter-image.tsx</code>; without it, Twitter tags fall back to the Open Graph ones.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is the image generated?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For static routes at build time; for dynamic routes (or routes with dynamic params) on request, and then cached like other routes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test the preview?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Request the image URL directly to check the PNG, then check the page head for og:image; platform debuggers fetch the absolute URL, which is why metadataBase matters.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **ImageResponse** | JSX to PNG renderer from next/og |
| **opengraph-image** | File convention for per-route social images |
| **Satori** | JSX and flexbox to SVG engine |
| **metadataBase** | Base URL for absolute og:image links |

---
**Conclusion:** Dynamic Open Graph images in Next.js are a file convention: opengraph-image.tsx returns an ImageResponse, and Next.js both serves the PNG and adds the tags. The lab produced a 1200x630 image and showed the one thing most teams miss: without metadataBase the tag points at localhost.`,
    examples: [
      {
        label: "A per-post Open Graph image",
        tech: "tsx",
        runnable: false,
        code: `// app/blog/[slug]/opengraph-image.tsx
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getPost } from "@/lib/posts";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Blog post preview";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  const inter = await readFile(join(process.cwd(), "assets/Inter-Bold.ttf"));
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "#0b0b0f", color: "white" }}>
        <div style={{ fontSize: 64, fontFamily: "Inter" }}>{post.title}</div>
        <div style={{ fontSize: 28, opacity: 0.7 }}>shop.example.com/blog</div>
      </div>
    ),
    { ...size, fonts: [{ name: "Inter", data: inter, weight: 700 }] },
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do sitemap.ts and robots.ts work in Next.js?",
    seoDescription: "app/sitemap.ts and app/robots.ts return plain objects that Next.js serves as /sitemap.xml and /robots.txt. The exact files from a Next.js 16.3.4 lab.",
    description: `**Question presented to candidate:**
"How do you add a sitemap and a robots.txt to an App Router project, including URLs that come from the database?"

**What a strong answer should cover:**
- \`app/sitemap.ts\` default-exports a function returning an array of \`{ url, lastModified, changeFrequency, priority }\`; Next.js serves it as \`/sitemap.xml\`.
- \`app/robots.ts\` returns \`{ rules, sitemap }\` and is served as \`/robots.txt\`.
- Both can be async and fetch data, so the sitemap can list every product or post.
- Static files (\`public/robots.txt\` or \`app/sitemap.xml\`) also work when nothing is dynamic.
- Large sites split the sitemap with \`generateSitemaps\`, because one sitemap file is limited to 50,000 URLs.

**Clarifying questions expected:**
- "How many URLs are there?" — decides whether to split sitemaps.
- "Which paths must stay out of search?" — they go in robots disallow rules and noindex metadata.

**Code / implementation expected:** Yes — both files, with URLs from data.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic React and App Router familiarity.
**Difficulty:** Easy

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.3.4 docs shipped with the package and, in the **Verified** section, against real output from a build or a running server.

## 1. Why This Even Matters — A Story First

A sitemap is the floor plan a museum gives to guide book writers: here is every room. robots.txt is the sign at the staff door: visitors welcome, but not through here. Next.js lets you write both as small functions, so the floor plan updates itself when a new room opens.

## 2. The Core Idea

📌 **Interview term: sitemap.ts** — a metadata route file whose default export returns the list of URLs; Next.js serves it as /sitemap.xml.

📌 **Interview term: robots.ts** — a metadata route file returning crawler rules; Next.js serves it as /robots.txt.

📌 **Interview term: generateSitemaps** — a function exported from sitemap.ts that splits a large sitemap into several files by id.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 268" role="img" aria-label="Two small files, two standard outputs. app/sitemap.ts, app/robots.ts">
  <defs>
    <marker id="nx03ttw2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Two small files, two standard outputs</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="24" y="48" width="280" height="136" rx="10"/>
    <text class="d-text d-accent" x="164" y="78" text-anchor="middle">app/sitemap.ts</text>
    <text class="d-sub" x="164" y="106" text-anchor="middle">returns url, lastModified, priority</text>
    <text class="d-sub" x="164" y="128" text-anchor="middle">served as /sitemap.xml</text>
    <text class="d-sub" x="164" y="150" text-anchor="middle">can fetch every product</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 307 116 L 353 116" marker-end="url(#nx03ttw2-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 307 116 L 353 116"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.5s" fill="freeze"/>
    <rect class="d-box" x="356" y="48" width="280" height="136" rx="10"/>
    <text class="d-text" x="496" y="78" text-anchor="middle">app/robots.ts</text>
    <text class="d-sub" x="496" y="106" text-anchor="middle">returns rules and sitemap URL</text>
    <text class="d-sub" x="496" y="128" text-anchor="middle">served as /robots.txt</text>
    <text class="d-sub" x="496" y="150" text-anchor="middle">text/plain</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="206" width="612" height="44" rx="10"/>
    <text class="d-sub" x="330" y="233" text-anchor="middle">both are cached like static routes unless they read request data</text>
  </g>
</svg>

These are ordinary route handlers in disguise: typed objects in, standard formats out.

## 3. Field reference

| sitemap entry field | XML output |
| :--- | :--- |
| \`url\` (absolute) | loc |
| \`lastModified\` | lastmod (ISO date) |
| \`changeFrequency\` | changefreq |
| \`priority\` | priority |
| \`alternates.languages\` | xhtml:link hreflang entries |

## 4. Keep them consistent

Anything disallowed in robots.txt should not appear in the sitemap, and pages you do not want indexed should also carry \`robots: { index: false }\` metadata, because robots.txt blocks crawling, not indexing of links found elsewhere. For page-level tags see [the Metadata API](/interview-question/how-does-the-metadata-api-work-in-next-js-static-and-generatemetadata).

## 5. Verified — The Generated Files (Next.js 16.3.4, next start)

The build listed \`○ /robots.txt\` and \`○ /sitemap.xml\`. Requests:

\`\`\`
GET /sitemap.xml:
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url>
<loc>https://shop.example.com/</loc>
<lastmod>2026-09-01T00:00:00.000Z</lastmod>
<changefreq>weekly</changefreq>
<priority>1</priority>
</url>
<url>
<loc>https://shop.example.com/meta/shoe</loc>
<lastmod>2026-09-10T00:00:00.000Z</lastmod>
<priority>0.8</priority>
</url>
</urlset>

GET /robots.txt (text/plain):
User-Agent: *
Allow: /
Disallow: /admin
Disallow: /api/

Sitemap: https://shop.example.com/sitemap.xml
\`\`\`

## 6. Common Pitfalls

- **Relative URLs in the sitemap.** Sitemap URLs must be absolute; use your production domain.
- **Blocking a page in robots.txt to hide it.** Crawling is blocked but the URL can still be indexed from links; use noindex metadata.
- **One giant sitemap.** Over 50,000 URLs needs splitting with \`generateSitemaps\`.
- **Stale lastModified values.** Use the real update date from your data, not the build time, or crawlers learn to ignore it.
- **Listing private or redirecting URLs.** Only list canonical, indexable pages.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">app/sitemap.ts</code> returns an array of entries and is served as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/sitemap.xml</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">app/robots.ts</code> returns rules and is served as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/robots.txt</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">Both may be async and read data, so the sitemap can list every product.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;">In the lab both were static routes, and the output matched the returned objects exactly.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;">Use absolute URLs, real lastModified dates, and split large sitemaps with generateSitemaps.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">robots.txt controls crawling, not indexing; use noindex metadata for pages that must not appear.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you list 200,000 products?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Export <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">generateSitemaps</code> returning ids, and have the sitemap function return a slice per id; Next.js serves <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/sitemap/0.xml</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/sitemap/1.xml</code> and so on.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can the sitemap be regenerated without a deploy?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, it is cached like a route; use a revalidate time or revalidatePath on it after content changes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you add hreflang alternates?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">alternates.languages</code> to each entry; Next.js writes the xhtml:link elements.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Should robots.txt block /api?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is common, as in the lab, since API routes are not pages; it does not secure them.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **sitemap.ts** | Generates /sitemap.xml |
| **robots.ts** | Generates /robots.txt |
| **generateSitemaps** | Splits large sitemaps |
| **noindex** | Keeps a crawled page out of search results |

---
**Conclusion:** sitemap.ts and robots.ts turn two SEO files into small typed functions: return objects, and Next.js serves standard XML and text. The lab output matched the objects field for field. Keep the two consistent, use absolute URLs and real dates, and remember that robots.txt stops crawling, not indexing.`,
    examples: [
      {
        label: "A data-driven sitemap and a robots file",
        tech: "tsx",
        runnable: false,
        code: `// app/sitemap.ts
import type { MetadataRoute } from "next";
import { getAllProducts } from "@/lib/products";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getAllProducts();
  return [
    { url: "https://shop.example.com/", lastModified: new Date(), priority: 1 },
    ...products.map((p) => ({
      url: \`https://shop.example.com/products/\${p.slug}\`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
    })),
  ];
}

// app/robots.ts
import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] }],
    sitemap: "https://shop.example.com/sitemap.xml",
  };
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How does Next.js handle SEO compared to a client-rendered SPA?",
    seoDescription: "Next.js sends content and meta tags in the first HTML, while a client-rendered SPA sends a shell that fills in later. Both compared on Next 16.3.4.",
    description: `**Question presented to candidate:**
"Why is Next.js considered better for SEO than a React single-page app, and what can still go wrong for SEO in a Next.js app?"

**What a strong answer should cover:**
- A client-rendered SPA sends an almost empty HTML shell; content and titles appear only after JavaScript runs and data loads.
- Next.js renders on the server (static, ISR, dynamic or PPR), so the first HTML already contains content, title, description and social tags.
- Crawlers that do not run JavaScript, and social preview bots, see the full page; Google also indexes faster when it does not need to render.
- Built-in helpers: Metadata API, opengraph-image, sitemap.ts, robots.ts, and structured data via JSON-LD.
- It can still go wrong: client-only data fetching, missing metadataBase, content behind client components that fetch after load, and slow server responses.

**Clarifying questions expected:**
- "Which pages need to rank?" — they must render their content on the server.
- "Are social previews important?" — then metadata must be in the head for HTML-limited bots.

**Code / implementation expected:** Optional — the difference in the first HTML.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic React and App Router familiarity.
**Difficulty:** Medium

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.3.4 docs shipped with the package and, in the **Verified** section, against real output from a build or a running server.

## 1. Why This Even Matters — A Story First

A client-rendered SPA is a shop whose window is empty until a staff member arrives to set it up. A passer-by (a crawler) who does not wait sees nothing. A Next.js page is a shop whose window was dressed before opening: anyone passing, patient or not, sees the products.

## 2. The Core Idea

📌 **Interview term: Client-side rendering** — sending a minimal HTML shell and building the page in the browser with JavaScript.

📌 **Interview term: Server rendering** — producing the page HTML on the server (at build or request time) so it arrives with content.

📌 **Interview term: HTML-limited bot** — a crawler that reads HTML but does not execute JavaScript, such as many social preview bots.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 268" role="img" aria-label="What a crawler receives in the first response. client-rendered page, server-rendered page">
  <defs>
    <marker id="nx04y4ul-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">What a crawler receives in the first response</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="48" width="280" height="136" rx="10"/>
    <text class="d-text" x="164" y="78" text-anchor="middle">client-rendered page</text>
    <text class="d-sub" x="164" y="106" text-anchor="middle">an empty shell or spinner</text>
    <text class="d-sub" x="164" y="128" text-anchor="middle">title set later by JS</text>
    <text class="d-sub" x="164" y="150" text-anchor="middle">lab SWR page: loading x3</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 307 116 L 353 116" marker-end="url(#nx04y4ul-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 307 116 L 353 116"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="356" y="48" width="280" height="136" rx="10"/>
    <text class="d-text d-accent" x="496" y="78" text-anchor="middle">server-rendered page</text>
    <text class="d-sub" x="496" y="106" text-anchor="middle">content in the HTML</text>
    <text class="d-sub" x="496" y="128" text-anchor="middle">title and og tags in head</text>
    <text class="d-sub" x="496" y="150" text-anchor="middle">lab meta pages: tags present</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="206" width="612" height="44" rx="10"/>
    <text class="d-sub" x="330" y="233" text-anchor="middle">the lab SWR page sent loading placeholders; the server pages sent full tags and content</text>
  </g>
</svg>

SEO is mostly about the first response. Everything the crawler needs should already be in it, not fetched afterwards.

## 3. What changes for SEO

| Concern | Client-rendered SPA | Next.js App Router |
| :--- | :--- | :--- |
| Content in first HTML | No | Yes, for Server Components and SSR'd Client Components |
| Title and meta tags | Set by JavaScript | In the head (Metadata API) |
| Social previews | Often broken | og:image and tags from the server |
| Sitemap, robots | Manual files | \`sitemap.ts\`, \`robots.ts\` |
| Performance (Core Web Vitals) | Slower first paint | Faster, with image and font optimisation |

## 4. Where Next.js apps still lose SEO

Data fetched only in Client Components (for example with SWR) is not in the HTML. Pages that are dynamic and slow hurt time to first byte. Missing canonical tags create duplicates. Missing metadataBase breaks social images. Check with the page source, not the element inspector. Related: [the Metadata API](/interview-question/how-does-the-metadata-api-work-in-next-js-static-and-generatemetadata) and [JSON-LD](/interview-question/what-is-json-ld-structured-data-and-how-do-you-add-it-in-next-js).

## 5. Verified — First HTML Responses Compared (Next.js 16.3.4, next start)

A page that fetches its data on the client with SWR:

\`\`\`
/swr: a static page with three client components, each calling useSWR("/api/time", fetcher)
server HTML (what arrives before JavaScript): SWR-one loading|SWR-two loading|SWR-three loading|
browser, after hydration:     SWR-one 2026-09-23T06:00:55.890Z | SWR-two 2026-09-23T06:00:55.890Z | SWR-three 2026-09-23T06:00:55.890Z
requests to /api/time after load: 1   (three hooks, one shared key, one request)
after a window focus event:       2   (SWR revalidates on focus)
\`\`\`

A server-rendered page with the Metadata API:

\`\`\`
metadata layout sets metadataBase, a title template '%s | Lab Shop' and openGraph.siteName
/meta:
  <title>Home</title>
  <meta name="description" content="Default description from the meta layout"/>
  <meta property="og:title" content="Home"/>
  <meta property="og:description" content="Default description from the meta layout"/>
  <meta property="og:site_name" content="Lab Shop"/>
  <meta property="og:type" content="website"/>
  <meta name="twitter:card" content="summary"/>
  <meta name="twitter:title" content="Home"/>
  <meta name="twitter:description" content="Default description from the meta layout"/>
/meta/shoe:
  <title>Product shoe | Lab Shop</title>
  <meta name="description" content="Fetched in generateMetadata, hit 2"/>
  <link rel="canonical" href="https://shop.example.com/meta/shoe"/>
  <meta property="og:title" content="OG shoe"/>
  <meta property="og:description" content="Fetched in generateMetadata, hit 2"/>
  <meta name="twitter:card" content="summary"/>
  <meta name="twitter:title" content="OG shoe"/>
  <meta name="twitter:description" content="Fetched in generateMetadata, hit 2"/>
\`\`\`

And for bots that do not run JavaScript, metadata is placed in the head even when it is slow:

\`\`\`
GET /meta-slow (dynamic page; generateMetadata waits 1200 ms before returning the title)
Chrome user agent  : body content at    50 ms, title at  1236 ms, title inside <head>: false
Googlebot user agent: body content at    16 ms, title at  1214 ms, title inside <head>: false
Twitterbot          : body content at  1216 ms, title at  1216 ms, title inside <head>: true
facebookexternalhit : body content at  1209 ms, title at  1209 ms, title inside <head>: true
\`\`\`

## 6. Common Pitfalls

- **Client-only data for indexable content.** The server HTML shows placeholders, as the lab SWR page did.
- **Checking SEO in the element inspector.** It shows the DOM after JavaScript; view the page source or fetch the HTML.
- **Missing canonical URLs.** Filter and sort parameters create duplicate pages; set \`alternates.canonical\`.
- **Slow dynamic pages.** Long server times hurt crawl budget and Core Web Vitals; stream or cache.
- **Blocking resources in robots.txt.** Disallowing \`/_next/\` stops crawlers from rendering the page.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">A client-rendered SPA sends a shell; content and tags appear only after JavaScript and data load.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">Next.js renders on the server, so the first HTML has the content, title, description and social tags.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;">In the lab the SWR page sent only loading placeholders, while server pages had full tags in the head.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;">Next.js adds the SEO building blocks: Metadata API, OG images, sitemap.ts, robots.ts, fast images and fonts.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">SEO still breaks with client-only data, missing canonical or metadataBase, and slow dynamic pages.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does Google not run JavaScript anyway?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It does, but in a second rendering pass that can be delayed, and many other crawlers and social bots do not run it at all.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Are Client Components bad for SEO?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. They are server-rendered to HTML too. Only data they fetch after mounting is missing from the HTML.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you check what a crawler sees?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Fetch the URL without JavaScript (curl or view source), and check the head for title, description, canonical and og tags.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does streaming hurt SEO?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Streamed content is part of the same HTML response, so crawlers receive it. Metadata streaming is limited to browsers and JavaScript-running crawlers.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Client-side rendering** | Page built in the browser |
| **Server rendering** | HTML with content from the server |
| **HTML-limited bot** | Crawler that does not run JavaScript |
| **Canonical URL** | The preferred URL for duplicate pages |

---
**Conclusion:** Next.js helps SEO because the first response already contains the page: content, title, description and social tags. The lab compared a client-fetched page (placeholders only) with server-rendered pages (full tags), and showed bots that do not run JavaScript getting metadata in the head. The remaining risks are content fetched only on the client, missing canonical and metadataBase, and slow dynamic pages.`,
    examples: [
      {
        label: "The same product, client-fetched and server-rendered",
        tech: "tsx",
        runnable: false,
        code: `// SPA-style: the HTML contains only "Loading..."
"use client";
import useSWR from "swr";
export function ProductClient({ slug }: { slug: string }) {
  const { data } = useSWR(\`/api/products/\${slug}\`, (u) => fetch(u).then((r) => r.json()));
  return <h1>{data ? data.name : "Loading..."}</h1>;
}

// Next.js-style: the HTML contains the name and the head has the tags
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const p = await getProduct((await params).slug);
  return { title: p.name, description: p.summary };
}
export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = await getProduct((await params).slug);
  return <h1>{p.name}</h1>;
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is JSON-LD structured data and how do you add it in Next.js?",
    seoDescription: "JSON-LD describes a page to search engines in a script tag. Rendered in Next.js it must escape < or data can break out of the tag, as a lab page showed.",
    description: `**Question presented to candidate:**
"How would you add Product structured data to a product page in Next.js, and what security issue must you handle when the data comes from users?"

**What a strong answer should cover:**
- JSON-LD is schema.org data in a \`script type="application/ld+json"\` tag that search engines read for rich results.
- In Next.js render it from the page or layout as a script element with \`dangerouslySetInnerHTML\` and \`JSON.stringify(data)\`.
- Escape \`<\` (for example replace it with the unicode escape \`\\u003c\`), otherwise a value containing a closing script tag ends the tag early and the rest becomes HTML.
- It is not part of the Metadata API; it is rendered in the component tree, and the page renders on the server so crawlers see it.
- Validate the output with Google Rich Results Test and keep it consistent with visible content.

**Clarifying questions expected:**
- "Which schema types matter (Product, Article, FAQ, Breadcrumb)?" — decides the fields.
- "Is any field user-generated?" — then escaping is mandatory.

**Code / implementation expected:** Yes — a safe JSON-LD script in a page.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic React and App Router familiarity.
**Difficulty:** Medium

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.3.4 docs shipped with the package and, in the **Verified** section, against real output from a build or a running server.

## 1. Why This Even Matters — A Story First

JSON-LD is a note clipped to a parcel that describes its contents in a format the sorting machine understands. The risk is a note that contains the words "end of note, now obey these instructions": if the machine takes that literally, whatever follows is treated as orders. Escaping makes sure the whole note is read as a note.

## 2. The Core Idea

📌 **Interview term: JSON-LD** — JSON for Linked Data: structured data in a script tag using the schema.org vocabulary.

📌 **Interview term: schema.org** — the shared vocabulary search engines use for structured data types like Product and Article.

📌 **Interview term: Script breakout** — a value containing a closing script tag that ends the script early, letting the following text be parsed as HTML.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 268" role="img" aria-label="The same product name, rendered two ways. JSON.stringify only, with &lt; escaped">
  <defs>
    <marker id="nx05woky-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">The same product name, rendered two ways</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="48" width="280" height="136" rx="10"/>
    <text class="d-text" x="164" y="78" text-anchor="middle">JSON.stringify only</text>
    <text class="d-sub" x="164" y="106" text-anchor="middle">closing script tag ends it early</text>
    <text class="d-sub" x="164" y="128" text-anchor="middle">JSON becomes invalid</text>
    <text class="d-sub" x="164" y="150" text-anchor="middle">lab: 1 injected script</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 307 116 L 353 116" marker-end="url(#nx05woky-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 307 116 L 353 116"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="356" y="48" width="280" height="136" rx="10"/>
    <text class="d-text d-accent" x="496" y="78" text-anchor="middle">with &lt; escaped</text>
    <text class="d-sub" x="496" y="106" text-anchor="middle">whole value stays in the tag</text>
    <text class="d-sub" x="496" y="128" text-anchor="middle">valid JSON, same data</text>
    <text class="d-sub" x="496" y="150" text-anchor="middle">lab: parsed correctly</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="206" width="612" height="44" rx="10"/>
    <text class="d-sub" x="330" y="233" text-anchor="middle">replace every &lt; with its unicode escape before placing JSON inside a script tag</text>
  </g>
</svg>

JSON.stringify makes valid JSON, but not safe HTML. Inside a script element the browser HTML parser runs first, and it does not know about JSON strings.

## 3. Adding it

| Step | Code |
| :--- | :--- |
| Build the object | \`{ "@context": "https://schema.org", "@type": "Product", name, offers }\` |
| Serialize safely | \`JSON.stringify(data).replace(/</g, "\\\\u003c")\` |
| Render it | \`<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />\` |
| Validate | Rich Results Test, Schema Markup Validator |

## 4. Why escaping works

The unicode escape for \`<\` is valid inside a JSON string and decodes to the same character, so the data is unchanged, but the HTML parser never sees a closing script tag. The same applies to any JSON you put into HTML. For the page-level head tags, see [the Metadata API](/interview-question/how-does-the-metadata-api-work-in-next-js-static-and-generatemetadata).

## 5. Verified — Parsed by an HTML Parser (Next.js 16.3.4, next start)

A lab page rendered the same product twice, once with plain \`JSON.stringify\` and once with \`<\` escaped. The name contains a closing script tag followed by a script. The served HTML was parsed with jsdom:

\`\`\`
the product name contains </script><script>window.__pwned=1</script>
script#naive (JSON.stringify only): INVALID JSON (Unterminated string in JSON at position )
script#safe  (with < replaced by \\u003c): valid JSON, name = "Evil </script><script>window.__pwned=1</script> shoe"
extra executable <script> elements created by the naive version: 1  -> content: window.__pwned=1
total ld+json scripts the parser found: 2
\`\`\`

The naive version produced invalid JSON and an extra executable script element containing the injected code. The escaped version kept the exact original name.

## 6. Common Pitfalls

- **Plain JSON.stringify for user data.** A product name or review can break out of the tag, which is an XSS hole.
- **Putting JSON-LD in the Metadata API.** There is no field for it; render the script in the page or layout.
- **Data that disagrees with the page.** Prices or ratings in JSON-LD that are not visible can be treated as spam.
- **Rendering it only on the client.** Crawlers should find it in the server HTML; keep it in a Server Component.
- **Forgetting required fields.** Rich results need specific fields (for Product: name and offers or review); check the validator.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">JSON-LD is schema.org data in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">script type="application/ld+json"</code> that search engines read for rich results.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">In Next.js render it in a page or layout with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dangerouslySetInnerHTML</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">JSON.stringify</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;">Escape <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;</code> as the unicode escape: in the lab the unescaped version broke out of the tag and injected a script.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;">The escaped version stayed valid JSON with the exact original data.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">Keep it server-rendered, consistent with visible content, and checked in the Rich Results Test.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not use a React child instead of dangerouslySetInnerHTML?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">React would escape the JSON as HTML text (for example quotes as entities), which search engines may not parse; the script needs raw JSON.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is escaping <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&gt;</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&amp;</code> needed too?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The critical one is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;</code>, which starts the closing tag; some libraries also escape <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&gt;</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&amp;</code> for safety in other contexts.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where should site-wide JSON-LD like Organization go?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In the root layout, rendered once; page-specific types like Product go in the page.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can one page have several JSON-LD blocks?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, one script per type, or one script with an array or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@graph</code>.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **JSON-LD** | Structured data in a script tag |
| **schema.org** | Vocabulary for structured data types |
| **Rich results** | Search listings enhanced by structured data |
| **Script breakout** | Data that closes the script tag early |

---
**Conclusion:** JSON-LD in Next.js is a script element rendered by a Server Component, which makes it part of the first HTML crawlers see. The only subtle part is safety: plain JSON.stringify is valid JSON but not safe HTML, and the lab showed a product name breaking out of the tag. Escaping < keeps the data identical and the page safe.`,
    examples: [
      {
        label: "A product page with safe JSON-LD",
        tech: "tsx",
        runnable: false,
        code: `// app/products/[slug]/page.tsx
function jsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\\\u003c");
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const product = await getProduct((await params).slug);
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.imageUrl,
    offers: { "@type": "Offer", price: product.price, priceCurrency: "EUR", availability: "https://schema.org/InStock" },
  };
  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(data) }} />
      <h1>{product.name}</h1>
    </main>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How does next/image optimize images in Next.js?",
    seoDescription: "next/image serves resized WebP or AVIF with srcset, lazy loading and reserved space. A 3.4 MB PNG became 9.8 KB WebP at 640 px on Next 16.3.4.",
    description: `**Question presented to candidate:**
"Explain what the Next.js Image component does for you compared with a plain img tag, and how you would make a hero image load fast."

**What a strong answer should cover:**
- It resizes and converts images on demand through \`/_next/image\`, choosing WebP or AVIF from the browser Accept header, and caches the results.
- It generates \`srcset\` and uses \`sizes\` so the browser downloads only the width it needs.
- It lazy-loads by default and reserves space with width and height (or the imported file size), preventing layout shift.
- For the LCP image use \`preload\` (Next.js 16 deprecates \`priority\`), \`loading="eager"\` or \`fetchPriority="high"\`.
- Remote images must be allowed in \`images.remotePatterns\`; qualities are limited to \`images.qualities\` (only 75 by default in 16).

**Clarifying questions expected:**
- "Which image is the largest thing above the fold?" — that one gets preload.
- "How wide is the image on each screen size?" — that determines \`sizes\`.

**Code / implementation expected:** Yes — a lazy responsive image and a preloaded hero.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic React and App Router familiarity.
**Difficulty:** Medium

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.3.4 docs shipped with the package and, in the **Verified** section, against real output from a build or a running server.

## 1. Why This Even Matters — A Story First

Sending a 3 MB photo to a phone that shows it 400 pixels wide is like shipping a whole wardrobe when the customer asked for one shirt. next/image is a tailor at the warehouse: it cuts each image to the size and format the device asks for, keeps a copy of each cut, and only sends images that are actually about to be seen.

## 2. The Core Idea

📌 **Interview term: srcset** — an img attribute listing versions of an image at different widths so the browser can pick the smallest suitable one.

📌 **Interview term: sizes** — an img attribute describing how wide the image will be displayed at each viewport size, used together with srcset.

📌 **Interview term: Image optimizer** — the /_next/image endpoint that resizes, re-encodes and caches images on request.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 250" role="img" aria-label="One PNG, many right-sized copies. source, srcset + sizes, /_next/image">
  <defs>
    <marker id="nx06qsxx-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">One PNG, many right-sized copies</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="48" width="174.66666666666666" height="118" rx="10"/>
    <circle class="d-box-accent" cx="40" cy="48" r="12"/>
    <text class="d-text d-accent" x="40" y="53" text-anchor="middle">1</text>
    <text class="d-text" x="111.33333333333333" y="82" text-anchor="middle">source</text>
    <text class="d-sub" x="111.33333333333333" y="108" text-anchor="middle">photo.png 1600x1000</text>
    <text class="d-sub" x="111.33333333333333" y="130" text-anchor="middle">3,398,296 bytes</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 201.66666666666666 107 L 239.66666666666666 107" marker-end="url(#nx06qsxx-arrow)"/>
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
    <text class="d-text" x="330" y="82" text-anchor="middle">srcset + sizes</text>
    <text class="d-sub" x="330" y="108" text-anchor="middle">browser picks a width</text>
    <text class="d-sub" x="330" y="130" text-anchor="middle">e.g. 640 px on mobile</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 420.3333333333333 107 L 458.3333333333333 107" marker-end="url(#nx06qsxx-arrow)"/>
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
    <text class="d-text d-accent" x="548.6666666666666" y="82" text-anchor="middle">/_next/image</text>
    <text class="d-sub" x="548.6666666666666" y="108" text-anchor="middle">WebP at 640 px, q 75</text>
    <text class="d-sub" x="548.6666666666666" y="130" text-anchor="middle">9,784 bytes</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="2.1s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="188" width="612" height="44" rx="10"/>
    <text class="d-sub" x="330" y="215" text-anchor="middle">lazy by default; reserve space with width and height; preload only the hero image</text>
  </g>
</svg>

The savings come from three places at once: fewer pixels, a better format, and not loading images that never scroll into view.

## 3. What the component sets

| Behaviour | How |
| :--- | :--- |
| Right width | \`srcset\` with widths from \`deviceSizes\` and \`imageSizes\`, chosen by \`sizes\` |
| Right format | WebP or AVIF by the Accept header; the original format for clients that accept neither |
| No layout shift | \`width\` and \`height\`, or intrinsic size from a static import |
| Lazy loading | \`loading="lazy"\` by default |
| Blur placeholder | \`placeholder="blur"\` with a static import (blurDataURL generated) |
| Hero loading | \`preload\` adds a preload link; or \`loading="eager"\` / \`fetchPriority="high"\` |

## 4. Configuration that matters

\`images.remotePatterns\` allows external hosts (\`domains\` is deprecated). \`images.qualities\` lists allowed quality values; in Next.js 16 only 75 is allowed unless you configure more, and other values are rejected by the optimizer. The Next.js 16 changes are covered in [next/image defaults in Next.js 16](/interview-question/what-changed-for-next-image-defaults-in-next-js-16).

## 5. Verified — HTML and Bytes (Next.js 16.3.4, next start)

A 1600x1000 PNG in \`public/\`, rendered once lazily with \`sizes\`, and once as a static import with \`preload\` and \`placeholder="blur"\`:

\`\`\`
<img> tags in the HTML:
  lazy photo
    loading="lazy"
    fetchPriority=(absent)
    decoding="async"
    sizes="(max-width: 768px) 100vw, 50vw"
    srcSet="/_next/image?url=%2Fphoto.png&amp;w=384&amp;q=75 384w, /_next/image?url=%2Fphoto.png&amp;w..."
    style="color:transparent"
  hero photo
    loading=(absent)
    fetchPriority=(absent)
    decoding="async"
    sizes=(absent)
    srcSet="/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fphoto.06_8n7eodspwc.png&amp;w=1920&amp;q=75 1..."
    style="color:transparent;background-size:cover;background-position:50% 50%;background-repeat:no-r..."
preload links in <head>: <link rel="preload" as="image" imageSrcSet="/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fphoto.06_8n7eodspwc.png&amp;w=1920&amp;q=...

original /photo.png: 3398296 bytes (1600x1000 PNG)
/_next/image w=640  q=75 Accept: image/avif,image/webp,*/*  -> 200 image/webp     9784 bytes
/_next/image w=640  q=75 Accept: image/webp,*/*             -> 200 image/webp     9784 bytes
/_next/image w=640  q=75 Accept: */*                        -> 200 image/png     94440 bytes
/_next/image w=1920 q=75 Accept: image/webp,*/*             -> 200 image/webp    35146 bytes
/_next/image w=640  q=90 Accept: image/webp,*/*             -> 400 null             44 bytes  "q" parameter (quality) of 90 is not allowed
\`\`\`

The optimizer negotiated the format from the Accept header (WebP here; PNG for a client that accepts neither), shrank a 3.4 MB source to under 10 KB at 640 px, and rejected quality 90 because only 75 is allowed by default.

## 6. Common Pitfalls

- **Preloading every image.** Only the LCP image should preload; the rest should stay lazy.
- **Missing sizes on responsive images.** Without it the browser assumes full viewport width and downloads larger files.
- **Using a quality that is not configured.** In 16 anything other than 75 needs \`images.qualities\`, or the request fails with 400.
- **Remote images without remotePatterns.** They are refused; list the exact host and path pattern.
- **Using priority in new code.** It is deprecated in Next.js 16 in favour of preload.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">next/image resizes and re-encodes on demand via <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/_next/image</code>, picking WebP or AVIF from the Accept header, and caches the result.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">It writes srcset and uses sizes so the browser downloads the width it needs: the lab 3.4 MB PNG became 9.8 KB at 640 px.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;">Images lazy-load by default and reserve space with width and height, which prevents layout shift.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;">For the LCP image use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">preload</code> (priority is deprecated in 16), <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">loading="eager"</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fetchPriority="high"</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">Configure remotePatterns and qualities: quality 90 was rejected with 400 because only 75 is allowed by default.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is AVIF not always returned?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Formats are tried in the order configured in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">images.formats</code>; the default is WebP only. Add AVIF there if you want smaller files at a higher encoding cost.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does a static import add?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Width and height are known at build time, a blur placeholder is generated, and the file gets a content hash.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How are optimized images cached?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The optimizer stores results on disk and sets cache headers; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">minimumCacheTTL</code> controls the minimum lifetime.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When should you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">unoptimized</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For images already optimized elsewhere (a CDN that resizes) or tiny SVG icons, where the optimizer adds nothing.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **srcset** | Candidate image widths for the browser |
| **sizes** | Displayed width per viewport |
| **LCP** | Largest Contentful Paint, often the hero image |
| **remotePatterns** | Allowed external image sources |

---
**Conclusion:** next/image does the image work most teams forget: right size through srcset and sizes, right format through Accept negotiation, lazy loading and reserved space. The lab measured a 3.4 MB PNG turning into a 9.8 KB WebP at 640 px, and showed the Next.js 16 defaults: preload instead of priority, and only quality 75 unless configured.`,
    examples: [
      {
        label: "A responsive lazy image and a preloaded hero",
        tech: "tsx",
        runnable: false,
        code: `// next.config.ts
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "cdn.example.com", pathname: "/products/**" }],
    formats: ["image/avif", "image/webp"],
  },
};
export default nextConfig;

// app/page.tsx
import Image from "next/image";
import hero from "@/public/hero.jpg";

export default function Home() {
  return (
    <>
      <Image src={hero} alt="Summer collection" preload placeholder="blur" sizes="100vw" />
      <Image
        src="https://cdn.example.com/products/shoe.jpg"
        alt="Trail shoe"
        width={800}
        height={600}
        sizes="(max-width: 768px) 100vw, 33vw"
      />
    </>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How does next/font work and why does it improve performance?",
    seoDescription: "next/font self-hosts fonts at build time, preloads them and adds a size-adjusted fallback to stop layout shift. Generated CSS from Next.js 16.3.4.",
    description: `**Question presented to candidate:**
"Why would you use next/font instead of a Google Fonts link tag, and what exactly does it generate?"

**What a strong answer should cover:**
- next/font downloads Google fonts at build time (or uses local files) and serves them from your own domain: no request to Google at runtime.
- It generates \`@font-face\` rules and a class or CSS variable to apply the font.
- It creates a fallback font face using a local system font with \`size-adjust\` and ascent/descent overrides so the fallback takes the same space, reducing layout shift.
- It preloads the font file for the pages that use it.
- Subsetting (for Google fonts) and \`display\` control file size and rendering behaviour.

**Clarifying questions expected:**
- "Is the font from Google or a licensed local file?" — \`next/font/google\` or \`next/font/local\`.
- "Which weights and subsets are really used?" — fewer means smaller files.

**Code / implementation expected:** Yes — a local font with a CSS variable.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic React and App Router familiarity.
**Difficulty:** Medium

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.3.4 docs shipped with the package and, in the **Verified** section, against real output from a build or a running server.

## 1. Why This Even Matters — A Story First

Using a font from a third-party server is like borrowing the neighbour ladder every time you need it: you knock, you wait, and your work pauses. next/font buys your own ladder of exactly the right height and keeps it in the shed. And while you walk to the shed, it gives you a stepstool of the same height, so nothing on the wall moves when you switch.

## 2. The Core Idea

📌 **Interview term: next/font** — the Next.js font module (next/font/google and next/font/local) that self-hosts fonts and generates optimized CSS at build time.

📌 **Interview term: size-adjust** — a CSS @font-face descriptor that scales a fallback font so its text takes the same space as the web font.

📌 **Interview term: Layout shift** — content moving on the page as late resources load; measured as CLS in Core Web Vitals.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 250" role="img" aria-label="What next/font generates at build time. font file, @font-face, fallback face">
  <defs>
    <marker id="nx0783vc-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">What next/font generates at build time</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="24" y="48" width="174.66666666666666" height="118" rx="10"/>
    <circle class="d-box-accent" cx="40" cy="48" r="12"/>
    <text class="d-text d-accent" x="40" y="53" text-anchor="middle">1</text>
    <text class="d-text d-accent" x="111.33333333333333" y="82" text-anchor="middle">font file</text>
    <text class="d-sub" x="111.33333333333333" y="108" text-anchor="middle">self-hosted in _next</text>
    <text class="d-sub" x="111.33333333333333" y="130" text-anchor="middle">preloaded in head</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 201.66666666666666 107 L 239.66666666666666 107" marker-end="url(#nx0783vc-arrow)"/>
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
    <text class="d-text" x="330" y="82" text-anchor="middle">@font-face</text>
    <text class="d-sub" x="330" y="108" text-anchor="middle">font-display swap</text>
    <text class="d-sub" x="330" y="130" text-anchor="middle">from your own domain</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 420.3333333333333 107 L 458.3333333333333 107" marker-end="url(#nx0783vc-arrow)"/>
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
    <text class="d-text d-accent" x="548.6666666666666" y="82" text-anchor="middle">fallback face</text>
    <text class="d-sub" x="548.6666666666666" y="108" text-anchor="middle">local Arial, 99.35%</text>
    <text class="d-sub" x="548.6666666666666" y="130" text-anchor="middle">same space as the font</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="2.1s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="188" width="612" height="44" rx="10"/>
    <text class="d-sub" x="330" y="215" text-anchor="middle">lab: 0 requests to font hosts in the HTML; the class sets font-family: georgia, georgia Fallback</text>
  </g>
</svg>

The fallback face is the clever part: text first renders in a system font scaled to match, so when the real font arrives, nothing reflows.

## 3. What you get

| Feature | Effect |
| :--- | :--- |
| Self-hosting | No DNS, connection or request to a third party at runtime |
| Preload | The font request starts with the HTML, not after CSS parsing |
| Adjusted fallback | Near-zero layout shift when the font swaps in |
| Subsetting (Google) | Only the glyph ranges you need, smaller files |
| Scoped class or variable | Apply with \`className\` or \`var(--font-x)\` in CSS or Tailwind |

## 4. Usage

Call the loader at module scope (not inside a component), pick weights and subsets, and apply the class to \`html\` or a wrapper. With Tailwind, expose it as a CSS variable. For combining fonts and images for Core Web Vitals see [next/font and next/image together](/interview-question/next-font-and-next-image-how-do-they-combine-for-core-web-vitals).

## 5. Verified — The Generated CSS (Next.js 16.3.4, next start)

\`next/font/local\` with a Georgia TTF and \`display: 'swap'\`, applied to a page:

\`\`\`
next/font/local with fonts/georgia.ttf, display: 'swap'
preload link in <head>: <link rel="preload" href="/_next/static/media/georgia-s.p.2mck0j1lepp3x.ttf" as="font" crossorigin="" type="font/ttf"/>
generated @font-face rules:
  @font-face{font-family:georgia;src:url(../media/georgia-s.p.2mck0j1lepp3x.ttf)format("truetype");font-display:swap}
  @font-face{font-family:georgia Fallback;src:local(Arial);ascent-override:92.3%;descent-override:22.07%;line-gap-override:0.0%;size-adjust:99.35%}
class on <main>: georgia_794c096b-module__ktHdfq__className
its rule: .georgia_794c096b-module__ktHdfq__className{font-family:georgia,georgia Fallback}
requests to fonts.googleapis.com or other font hosts in the HTML: 0
\`\`\`

The fallback face uses local Arial with ascent, descent and size-adjust values calculated from the real font metrics. The lab used a local font, so no download at build time was involved; for \`next/font/google\` the docs describe the same output with the files fetched at build.

## 6. Common Pitfalls

- **Calling the loader inside a component.** It must run at module scope so it is processed at build time.
- **Loading many weights and styles.** Each adds a file; use a variable font or only the weights you use.
- **Keeping the Google Fonts link too.** It re-adds the third-party request and double loads the font.
- **Forgetting subsets for Google fonts.** Without them preload cannot pick the right file.
- **Overriding font-family elsewhere.** Hard-coded font stacks bypass the generated fallback.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">next/font self-hosts fonts: Google fonts are downloaded at build time, local fonts are copied, and both are served from your domain.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">It generates @font-face rules and a class or CSS variable, and preloads the file.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;">It adds a fallback face from a system font with size-adjust and metric overrides: in the lab, Arial at 99.35%.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;">That fallback keeps text the same size when the real font swaps in, which reduces layout shift.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">The lab HTML had zero requests to external font hosts; call loaders at module scope and load only the weights you use.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does display swap mean here?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Text renders immediately in the fallback and swaps to the web font when it loads; with the adjusted fallback the swap causes little or no shift.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you use it with Tailwind?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">variable: "--font-sans"</code> in the loader, add the variable class to html, and reference <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">var(--font-sans)</code> in the Tailwind theme.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does next/font work offline or without internet at build?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Local fonts do. Google fonts need network access during the build to download the files.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is there a preload link only on some pages?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Preload is added for the routes whose code uses the font, so unrelated pages do not download it.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **next/font** | Build-time self-hosted fonts |
| **size-adjust** | Scales a fallback font to match |
| **Fallback font face** | System font styled to occupy the same space |
| **CLS** | Cumulative Layout Shift |

---
**Conclusion:** next/font removes the runtime dependency on font hosts and the layout shift that usually comes with web fonts. The lab showed the generated CSS: a self-hosted, preloaded font and an Arial fallback scaled to Georgia metrics, applied through one class. Use loaders at module scope and keep weights to what the design uses.`,
    examples: [
      {
        label: "A local font and a Google font as CSS variables",
        tech: "tsx",
        runnable: false,
        code: `// app/fonts.ts
import localFont from "next/font/local";
import { Inter } from "next/font/google";

export const brand = localFont({
  src: [{ path: "./fonts/Brand-Regular.woff2", weight: "400" }, { path: "./fonts/Brand-Bold.woff2", weight: "700" }],
  display: "swap",
  variable: "--font-brand",
});

export const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });

// app/layout.tsx
import { brand, inter } from "./fonts";
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={\`\${brand.variable} \${inter.variable}\`}>
      <body style={{ fontFamily: "var(--font-inter)" }}>{children}</body>
    </html>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "next/font and next/image — how do they combine for Core Web Vitals?",
    seoDescription: "next/image helps LCP and CLS with right-sized, reserved images; next/font helps CLS with adjusted fallbacks. What each produced in a Next.js 16.3.4 lab.",
    description: `**Question presented to candidate:**
"Our Lighthouse report shows a slow LCP and some layout shift on the landing page. How would next/image and next/font help, and which settings would you change?"

**What a strong answer should cover:**
- LCP (Largest Contentful Paint) is usually the hero image or heading: preload the hero image and serve it at the right size and format.
- CLS (Cumulative Layout Shift) comes from images without reserved space and fonts that swap to a different size.
- next/image reserves space from width and height, lazy-loads below-the-fold images and serves WebP or AVIF at the right width.
- next/font self-hosts and preloads fonts and adds a size-adjusted fallback so the swap does not shift text.
- In Next.js 16 use \`preload\` (or \`fetchPriority="high"\`) instead of the deprecated \`priority\` for the LCP image.

**Clarifying questions expected:**
- "What is the LCP element on this page?" — the fix differs for an image or a text block.
- "Where does the shift happen?" — images, fonts, or late-inserted content like banners.

**Code / implementation expected:** Yes — a landing page hero using both.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic React and App Router familiarity.
**Difficulty:** Easy

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.3.4 docs shipped with the package and, in the **Verified** section, against real output from a build or a running server.

## 1. Why This Even Matters — A Story First

A page loading is like a stage being set before a show. The biggest prop (the LCP element) should be carried in first, and it should be the right size for the stage. The actors (the text) should already stand where they will stay, even before their costumes (the web font) arrive. next/image handles the props; next/font makes sure the costume change does not move anyone.

## 2. The Core Idea

📌 **Interview term: LCP** — Largest Contentful Paint: the time until the largest visible element renders; often a hero image or heading.

📌 **Interview term: CLS** — Cumulative Layout Shift: a score of how much visible content moves unexpectedly while loading.

📌 **Interview term: fetchPriority** — an img attribute that tells the browser to load an image before other resources of the same type.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 268" role="img" aria-label="Which tool fixes which metric. next/image, next/font">
  <defs>
    <marker id="nx08xxz9-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Which tool fixes which metric</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="24" y="48" width="280" height="136" rx="10"/>
    <text class="d-text d-accent" x="164" y="78" text-anchor="middle">next/image</text>
    <text class="d-sub" x="164" y="106" text-anchor="middle">LCP: preload and right-sized WebP</text>
    <text class="d-sub" x="164" y="128" text-anchor="middle">CLS: width and height reserve space</text>
    <text class="d-sub" x="164" y="150" text-anchor="middle">lazy below the fold</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 307 116 L 353 116" marker-end="url(#nx08xxz9-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 307 116 L 353 116"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="356" y="48" width="280" height="136" rx="10"/>
    <text class="d-text d-accent" x="496" y="78" text-anchor="middle">next/font</text>
    <text class="d-sub" x="496" y="106" text-anchor="middle">CLS: size-adjusted fallback face</text>
    <text class="d-sub" x="496" y="128" text-anchor="middle">LCP of text: preloaded, self-hosted</text>
    <text class="d-sub" x="496" y="150" text-anchor="middle">no third-party requests</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="206" width="612" height="44" rx="10"/>
    <text class="d-sub" x="330" y="233" text-anchor="middle">lab: 3.4 MB PNG to 9.8 KB WebP at 640 px; Arial fallback scaled to 99.35% for Georgia</text>
  </g>
</svg>

Most landing pages need both: the hero image drives LCP, and the font swap is a common hidden source of layout shift.

## 3. A checklist

| Symptom | Fix |
| :--- | :--- |
| Hero image loads late | \`preload\` on the hero Image (or \`fetchPriority="high"\`), correct \`sizes\` |
| Huge image bytes | Let next/image resize; set \`sizes\` so mobile gets small widths |
| Image makes content jump | Always give width and height, or use a static import, or \`fill\` in a sized parent |
| Text jumps when the font loads | next/font with its generated fallback, \`display: "swap"\` |
| Font request starts late | next/font preload (automatic), self-hosted |
| Below-the-fold images slow the page | Keep them lazy (the default) |

## 4. Measure, then fix

Use Lighthouse or the web-vitals report in the field (\`useReportWebVitals\`) to find the LCP element and shifts, change one thing, and measure again. Details: [next/image](/interview-question/how-does-next-image-optimize-images-in-next-js) and [next/font](/interview-question/how-does-next-font-work-and-why-does-it-improve-performance).

## 5. Verified — What Each Tool Produced (Next.js 16.3.4, next start)

next/image, with a lazy responsive image and a preloaded hero:

\`\`\`
<img> tags in the HTML:
  lazy photo
    loading="lazy"
    fetchPriority=(absent)
    decoding="async"
    sizes="(max-width: 768px) 100vw, 50vw"
    srcSet="/_next/image?url=%2Fphoto.png&amp;w=384&amp;q=75 384w, /_next/image?url=%2Fphoto.png&amp;w..."
    style="color:transparent"
  hero photo
    loading=(absent)
    fetchPriority=(absent)
    decoding="async"
    sizes=(absent)
    srcSet="/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fphoto.06_8n7eodspwc.png&amp;w=1920&amp;q=75 1..."
    style="color:transparent;background-size:cover;background-position:50% 50%;background-repeat:no-r..."
preload links in <head>: <link rel="preload" as="image" imageSrcSet="/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fphoto.06_8n7eodspwc.png&amp;w=1920&amp;q=...

original /photo.png: 3398296 bytes (1600x1000 PNG)
/_next/image w=640  q=75 Accept: image/avif,image/webp,*/*  -> 200 image/webp     9784 bytes
/_next/image w=640  q=75 Accept: image/webp,*/*             -> 200 image/webp     9784 bytes
/_next/image w=640  q=75 Accept: */*                        -> 200 image/png     94440 bytes
/_next/image w=1920 q=75 Accept: image/webp,*/*             -> 200 image/webp    35146 bytes
/_next/image w=640  q=90 Accept: image/webp,*/*             -> 400 null             44 bytes  "q" parameter (quality) of 90 is not allowed
\`\`\`

next/font with a local font:

\`\`\`
next/font/local with fonts/georgia.ttf, display: 'swap'
preload link in <head>: <link rel="preload" href="/_next/static/media/georgia-s.p.2mck0j1lepp3x.ttf" as="font" crossorigin="" type="font/ttf"/>
generated @font-face rules:
  @font-face{font-family:georgia;src:url(../media/georgia-s.p.2mck0j1lepp3x.ttf)format("truetype");font-display:swap}
  @font-face{font-family:georgia Fallback;src:local(Arial);ascent-override:92.3%;descent-override:22.07%;line-gap-override:0.0%;size-adjust:99.35%}
class on <main>: georgia_794c096b-module__ktHdfq__className
its rule: .georgia_794c096b-module__ktHdfq__className{font-family:georgia,georgia Fallback}
requests to fonts.googleapis.com or other font hosts in the HTML: 0
\`\`\`

These show the mechanisms (preload link, srcset, reserved dimensions, adjusted fallback); actual LCP and CLS values depend on the page and network and were not measured here.

## 6. Common Pitfalls

- **Preloading many images.** Several preloads compete; preload only the LCP image.
- **Lazy-loading the hero.** The default lazy loading delays LCP; the hero needs preload or eager loading.
- **Images without dimensions.** \`fill\` needs a sized parent, otherwise space is not reserved.
- **Third-party font links alongside next/font.** They reintroduce the request and the shift.
- **Chasing lab scores only.** Field data from real users is what Core Web Vitals use.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">LCP is usually the hero image or heading; CLS comes from unsized images and font swaps.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">next/image fixes the image side: right size and format, reserved space, lazy loading, and preload for the hero.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;">next/font fixes the font side: self-hosted, preloaded files and a size-adjusted fallback so the swap does not shift text.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;">In Next.js 16 use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">preload</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fetchPriority="high"</code> for the LCP image; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">priority</code> is deprecated.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">Measure with Lighthouse and field data, fix the LCP element first, then shifts.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the LCP element is text, not an image?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Then font loading matters most: next/font preloads the file and the fallback renders text immediately in the right size.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Should the hero image use placeholder="blur"?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It helps perceived speed, but LCP counts the real image; keep preload so the real image arrives quickly.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you collect Core Web Vitals from real users?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useReportWebVitals</code> from next/web-vitals in a Client Component, sending the values to your analytics.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can CSS background images use next/image?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Use an Image with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fill</code> in a positioned container, so it gets the same optimisation and sizing.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **LCP** | Largest Contentful Paint |
| **CLS** | Cumulative Layout Shift |
| **fetchPriority** | Browser hint to load an image early |
| **preload** | Next 16 Image prop that adds a preload link |

---
**Conclusion:** next/image and next/font attack the two usual Core Web Vitals problems from both sides: images that are too big, too late or unsized, and fonts that arrive late and shift text. The lab showed the mechanisms each produces; measuring the real LCP and CLS of your page tells you which one to fix first.`,
    examples: [
      {
        label: "A landing hero with both tools",
        tech: "tsx",
        runnable: false,
        code: `// app/page.tsx
import Image from "next/image";
import { Inter } from "next/font/google";
import hero from "@/public/hero.jpg";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export default function Landing() {
  return (
    <main className={inter.className}>
      <h1>Summer collection</h1>
      <Image src={hero} alt="Models in the summer collection" preload sizes="100vw" placeholder="blur" />
      <Image src="/grid-1.jpg" alt="Shirt" width={600} height={800} sizes="(max-width: 768px) 50vw, 25vw" />
    </main>
  );
}`,
      },
    ],
  },
];

export default augments;
