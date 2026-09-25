/**
 * Next.js ULTRA — batch 09: deployment, standalone output, authentication, getServerSideProps vs App Router, Pages to App migration,
 * next.config, redirects and rewrites, i18n, instrumentation.
 * Generated from markdown sources by a build script; Verified blocks are real output from a Next.js 16.3.4 lab (standalone and static
 * export builds, both routers in one app, proxy-based locale detection, instrumentation hooks, and real browser sessions).
 */
import type { NextAugment } from "./nextjs-augments.types";

const augments: NextAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you deploy a Next.js app (Vercel vs self-hosted)?",
    seoDescription: "Next.js runs on Vercel, as a Node server, in Docker or as a static export with fewer features. What self-hosting needs, with real lab builds.",
    description: `**Question presented to candidate:**
"We are choosing between Vercel and running Next.js on our own Kubernetes cluster. What do we get on each, and what must we set up ourselves when self-hosting?"

**What a strong answer should cover:**
- Deployment options: a managed platform (Vercel or another provider with Next.js support), a Node.js server (\`next start\`), a Docker image (usually with \`output: "standalone"\`), or a static export (\`output: "export"\`).
- Every server feature works self-hosted with \`next start\`: SSR, streaming, ISR, Server Actions, Route Handlers, Proxy and image optimization.
- Self-hosting responsibilities: caching across instances (a shared \`cacheHandler\`), a CDN for static assets, TLS, scaling, logs and metrics.
- Static export produces plain files but drops server features: no Server Actions, dynamic routes without params, request-time rendering, ISR, redirects or rewrites.
- Version skew between deployments (old clients calling new servers) needs \`deploymentId\` or careful rollouts.

**Clarifying questions expected:**
- "Do we need ISR, Server Actions or request-time rendering?" — they rule out static export.
- "How many instances will run?" — more than one needs a shared cache.

**Code / implementation expected:** Yes — a Dockerfile for standalone output.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic React and App Router familiarity.
**Difficulty:** Medium

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.3.4 docs shipped with the package and, in the **Verified** section, against real output from a build or a running server.

## 1. Why This Even Matters — A Story First

Deploying Next.js is like opening a restaurant. A managed platform is a food court: kitchen, cleaning and electricity are included, you bring the recipes. Self-hosting is renting your own premises: every recipe still works, but you arrange the refrigerators (caches), deliveries (CDN) and staff rota (scaling). A static export is a food truck selling pre-packed meals: cheap and anywhere, but it cannot cook to order.

## 2. The Core Idea

📌 **Interview term: next start** — the command that runs a production Next.js server from a build; supports every Next.js feature.

📌 **Interview term: Static export** — output: "export", which writes the app as static files; features needing a server are unavailable.

📌 **Interview term: cacheHandler** — a next.config option that plugs in a custom cache store, needed to share ISR and data caches across instances.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 336" role="img" aria-label="Four ways to run the same Next.js app. managed platform, next start, Docker + standalone, static export">
  <defs>
    <marker id="nx013tbm-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Four ways to run the same Next.js app</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.45s" fill="freeze"/>
    <rect class="d-box-accent" x="24" y="46" width="612" height="44" rx="10"/>
    <circle class="d-box-accent" cx="46" cy="68" r="12"/>
    <text class="d-text d-accent" x="46" y="73" text-anchor="middle">1</text>
    <text class="d-text d-accent" x="70" y="73">managed platform</text>
    <text class="d-sub" x="262" y="72">Vercel or others: caching, CDN and scaling included</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.45s" fill="freeze"/>
    <rect class="d-box" x="24" y="102" width="612" height="44" rx="10"/>
    <circle class="d-box-accent" cx="46" cy="124" r="12"/>
    <text class="d-text d-accent" x="46" y="129" text-anchor="middle">2</text>
    <text class="d-text" x="70" y="129">next start</text>
    <text class="d-sub" x="262" y="128">Node server: every feature, you run and scale it</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.45s" fill="freeze"/>
    <rect class="d-box-accent" x="24" y="158" width="612" height="44" rx="10"/>
    <circle class="d-box-accent" cx="46" cy="180" r="12"/>
    <text class="d-text d-accent" x="46" y="185" text-anchor="middle">3</text>
    <text class="d-text d-accent" x="70" y="185">Docker + standalone</text>
    <text class="d-sub" x="262" y="184">server.js with traced deps: 33 MB vs 396 MB in the lab</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.45s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="214" width="612" height="44" rx="10"/>
    <circle class="d-box-accent" cx="46" cy="236" r="12"/>
    <text class="d-text d-accent" x="46" y="241" text-anchor="middle">4</text>
    <text class="d-text" x="70" y="241">static export</text>
    <text class="d-sub" x="262" y="240">plain files: no actions, ISR, rewrites or request data</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.7s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="274" width="612" height="44" rx="10"/>
    <text class="d-sub" x="330" y="301" text-anchor="middle">lab static export: failed on a GET Route Handler, warned about redirects and rewrites</text>
  </g>
</svg>

The trade is not features for price but responsibility. Self-hosting keeps every feature; it moves caching, CDN and scaling onto your team.

## 3. Feature support

| Feature | Managed platform | next start / Docker | Static export |
| :--- | :--- | :--- | :--- |
| SSR, streaming, PPR | Yes | Yes | No |
| ISR and revalidation | Yes | Yes (shared cacheHandler for many instances) | No |
| Server Actions, Route Handlers | Yes | Yes | Only static GET handlers |
| Proxy (middleware) | Yes | Yes | No |
| Image optimization | Yes | Yes (zero configuration with next start) | No (custom loader) |
| Redirects, rewrites, headers | Yes | Yes | No |

## 4. Self-hosting checklist

Build once and promote the same artefact; set \`deploymentId\` to avoid version skew; put static files (\`/_next/static\`) behind a CDN; configure a shared cache handler when running more than one instance; forward the real host and protocol headers from your proxy (Server Actions compare Origin and Host); collect logs and traces with instrumentation. See [standalone output](/interview-question/what-is-the-output-standalone-build-in-next-js-and-when-do-you-use-it) and [instrumentation](/interview-question/how-do-you-handle-instrumentation-and-observability-in-next-js-instrumentation-t).

## 5. Verified — Standalone and Static Export Builds (Next.js 16.3.4)

Standalone output, run with plain \`node server.js\`:

\`\`\`
next build with output: "standalone" (the lab app: about 70 routes, 58 packages installed)
  .next/standalone contains: server.js, package.json, .next (server output), node_modules
  node_modules in it: 11 packages (@img @next @swc client-only detect-libc next react react-dom semver sharp styled-jsx)
  size: 33 MB for .next/standalone   vs   396 MB for the project node_modules
run with  PORT=4105 node server.js  (no next start, no npm install), content type of each response:
  before copying anything:
    /counter                                  200 text/html
    /_next/static/chunks/0jvhpaew_uadu.js     200 text/html   <- the file is missing; this lab has a catch-all
    /photo.png                                200 text/html   <- fallback rewrite, so it answered with a page
  after copying .next/static -> standalone/.next/static and public/ -> standalone/public:
    /_next/static/chunks/0jvhpaew_uadu.js     200 application/javascript
    /photo.png                                200 image/png
\`\`\`

The same app as a static export:

\`\`\`
next build with output: "export" on the lab app (it has rewrites, redirects, headers, proxy, Route Handlers, Server Actions, ISR):
⚠ Specified "rewrites" will not automatically work with "output: export". See more info here: https://nextjs.org/docs/messages/export-no-custom-routes
⚠ Specified "redirects" will not automatically work with "output: export". See more info here: https://nextjs.org/docs/messages/export-no-custom-routes
⚠ Specified "headers" will not automatically work with "output: export". See more info here: https://nextjs.org/docs/messages/export-no-custom-routes
Error: export const dynamic = "force-static"/export const revalidate not configured on route "/api/time" with "output: export". See more info here: https://nextjs.org/docs/advanced-features/static-html-export
> Build error occurred
Error: Failed to collect page data for /api/time
\`\`\`

## 6. Common Pitfalls

- **Several instances with the default cache.** Each keeps its own ISR and data cache on local disk; users see different versions. Use a shared cacheHandler.
- **Forgetting static files with standalone.** \`.next/static\` and \`public\` must be copied next to server.js, or served by a CDN.
- **Choosing static export for an app with server features.** The build fails or silently drops redirects and rewrites.
- **Rebuilding per environment.** NEXT_PUBLIC_ values are baked in; build once and inject server-side values at runtime.
- **Proxies that change the host.** Server Actions compare Origin and Host; configure forwarded headers or \`serverActions.allowedOrigins\`.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Next.js deploys to a managed platform, to a Node server with next start, to Docker (usually standalone output), or as a static export.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">Every feature works self-hosted; what you take on is caching across instances, CDN, TLS, scaling and observability.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;">Standalone output keeps only traced dependencies: 33 MB instead of 396 MB in the lab, but static and public must be copied.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;">A static export drops server features: the lab build failed on a GET Route Handler and warned about redirects, rewrites and headers.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">Use a shared cacheHandler for multiple instances and deploymentId against version skew.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does image optimization work self-hosted?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. The docs say it works with zero configuration under <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next start</code> (the lab standalone folder even included sharp); put a CDN in front for caching at scale.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is version skew?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A browser running JavaScript from an older deployment calling a newer server, for example a Server Action id that no longer exists. With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">deploymentId</code> set, Next.js compares ids and does a full page reload on a mismatch.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is static export a good choice?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Marketing sites or docs with no per-request data, hosted on a CDN or object storage, where you do not need actions, ISR or redirects.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you run it in Kubernetes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Build a standalone Docker image, run several replicas behind a load balancer, add a shared cacheHandler (for example Redis), serve static assets from a CDN, and use readiness probes.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **next start** | Production Node server for a build |
| **Standalone output** | server.js plus only the traced dependencies |
| **Static export** | Plain files, no server features |
| **Version skew** | Old client code talking to a new server |

---
**Conclusion:** Where you deploy Next.js decides who runs the infrastructure, not which features you get: next start and Docker support everything a managed platform does. The lab showed the two special cases: standalone output shrinking a 396 MB node_modules to a 33 MB runnable folder, and a static export refusing server features. Self-hosting means owning caching, CDN and scaling.`,
    examples: [
      {
        label: "A Dockerfile for standalone output",
        tech: "bash",
        runnable: false,
        code: `# next.config.ts:  const nextConfig = { output: "standalone" };

FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-alpine AS run
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the output: 'standalone' build in Next.js and when do you use it?",
    seoDescription: "output: 'standalone' copies server.js and only traced dependencies into .next/standalone: 33 MB vs 396 MB of node_modules in the lab.",
    description: `**Question presented to candidate:**
"Our Docker images for a Next.js app are over a gigabyte. What does output: 'standalone' do and how does it change the Dockerfile?"

**What a strong answer should cover:**
- \`output: "standalone"\` makes \`next build\` produce \`.next/standalone\` with a minimal \`server.js\` and only the files the server needs.
- It uses output file tracing to copy just the traced dependencies from node_modules, so no \`npm install\` is needed in the runtime image.
- Run it with \`node server.js\`; configure \`PORT\` and \`HOSTNAME\` through environment variables.
- \`.next/static\` and \`public\` are not copied by default: copy them next to server.js or serve them from a CDN.
- Use it for Docker and other self-hosted deployments; managed platforms do not need it.

**Clarifying questions expected:**
- "Are static assets served by a CDN?" — then you may not need to copy them into the image.
- "Do any packages load files at runtime that tracing might miss?" — they may need outputFileTracingIncludes.

**Code / implementation expected:** Yes — the config and the copy steps.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic React and App Router familiarity.
**Difficulty:** Medium

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.3.4 docs shipped with the package and, in the **Verified** section, against real output from a build or a running server.

## 1. Why This Even Matters — A Story First

Packing for a work trip, you do not take your whole wardrobe; you take what the itinerary needs. Standalone output reads the itinerary (the traced imports of your server) and packs only those clothes, plus a suitcase key (server.js). You still have to add your shoes (static files and public) yourself, because they travel in a different bag.

## 2. The Core Idea

📌 **Interview term: Standalone output** — a build mode that writes a self-contained server folder with only the traced dependencies.

📌 **Interview term: Output file tracing** — analysing imports and file reads to record exactly which files each route needs at runtime.

📌 **Interview term: server.js** — the minimal Node entry point generated in .next/standalone that starts the production server.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 250" role="img" aria-label="What standalone gives you, and what it leaves out. next build, .next/standalone, you copy">
  <defs>
    <marker id="nx021ods-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">What standalone gives you, and what it leaves out</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="24" y="48" width="174.66666666666666" height="118" rx="10"/>
    <circle class="d-box-accent" cx="40" cy="48" r="12"/>
    <text class="d-text d-accent" x="40" y="53" text-anchor="middle">1</text>
    <text class="d-text d-accent" x="111.33333333333333" y="82" text-anchor="middle">next build</text>
    <text class="d-sub" x="111.33333333333333" y="108" text-anchor="middle">output standalone</text>
    <text class="d-sub" x="111.33333333333333" y="130" text-anchor="middle">traces every route</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 201.66666666666666 107 L 239.66666666666666 107" marker-end="url(#nx021ods-arrow)"/>
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
    <text class="d-text" x="330" y="82" text-anchor="middle">.next/standalone</text>
    <text class="d-sub" x="330" y="108" text-anchor="middle">server.js + 11 packages</text>
    <text class="d-sub" x="330" y="130" text-anchor="middle">33 MB in the lab</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 420.3333333333333 107 L 458.3333333333333 107" marker-end="url(#nx021ods-arrow)"/>
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
    <text class="d-text" x="548.6666666666666" y="82" text-anchor="middle">you copy</text>
    <text class="d-sub" x="548.6666666666666" y="108" text-anchor="middle">.next/static and public</text>
    <text class="d-sub" x="548.6666666666666" y="130" text-anchor="middle">or serve them from a CDN</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="2.1s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="188" width="612" height="44" rx="10"/>
    <text class="d-sub" x="330" y="215" text-anchor="middle">before copying, the lab server answered a JS chunk and an image with an HTML page</text>
  </g>
</svg>

Standalone is about the server side only. The browser still needs the static files, and they are deliberately left out so a CDN can serve them.

## 3. Before and after

| | Regular build | Standalone |
| :--- | :--- | :--- |
| Runtime needs | Full node_modules + next start | \`.next/standalone\` + node |
| Lab size | 396 MB node_modules | 33 MB folder (11 packages) |
| Start command | \`next start\` | \`node server.js\` |
| Static assets | Served from .next/static | Must be copied or put on a CDN |
| Typical use | VM with the repo | Docker images, serverless containers |

## 4. Tracing edge cases

If a package reads files at runtime that are not imported (templates, fonts, binaries), tracing can miss them; add them with \`outputFileTracingIncludes\`. Monorepos may need \`outputFileTracingRoot\` pointing at the repository root. Deployment in general: [deploying Next.js](/interview-question/how-do-you-deploy-a-next-js-app-vercel-vs-self-hosted).

## 5. Verified — A Standalone Build Run Directly (Next.js 16.3.4)

\`\`\`
next build with output: "standalone" (the lab app: about 70 routes, 58 packages installed)
  .next/standalone contains: server.js, package.json, .next (server output), node_modules
  node_modules in it: 11 packages (@img @next @swc client-only detect-libc next react react-dom semver sharp styled-jsx)
  size: 33 MB for .next/standalone   vs   396 MB for the project node_modules
run with  PORT=4105 node server.js  (no next start, no npm install), content type of each response:
  before copying anything:
    /counter                                  200 text/html
    /_next/static/chunks/0jvhpaew_uadu.js     200 text/html   <- the file is missing; this lab has a catch-all
    /photo.png                                200 text/html   <- fallback rewrite, so it answered with a page
  after copying .next/static -> standalone/.next/static and public/ -> standalone/public:
    /_next/static/chunks/0jvhpaew_uadu.js     200 application/javascript
    /photo.png                                200 image/png
\`\`\`

## 6. Common Pitfalls

- **Forgetting static files.** Pages render but scripts, CSS and images are missing, as the lab showed before copying.
- **Wrong hostname in containers.** Set \`HOSTNAME=0.0.0.0\` so the server listens on all interfaces.
- **Missing runtime files.** Files read dynamically are not traced; add \`outputFileTracingIncludes\`.
- **Running npm install in the runtime image.** Unnecessary and it grows the image back; copy the standalone folder only.
- **Monorepo paths.** Set \`outputFileTracingRoot\` so dependencies outside the app folder are traced.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">output: "standalone"</code> writes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.next/standalone</code> with a minimal server.js and only the dependencies traced from your routes.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">In the lab it was 33 MB with 11 packages, against 396 MB and 58 packages in node_modules.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;">Run it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">node server.js</code>, setting PORT and HOSTNAME through the environment.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;">Copy <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.next/static</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">public</code> next to it or serve them from a CDN; without them the lab server returned HTML instead of the files.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">Use outputFileTracingIncludes and outputFileTracingRoot for files or monorepo paths that tracing misses.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why are static files not included?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">They are usually served by a CDN; keeping them separate lets you upload them there and keep the server image small.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does standalone work with ISR and Server Actions?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, it is the same server as next start. For several instances you still need a shared cacheHandler.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you pass configuration at runtime?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Through environment variables read by server code in dynamic routes; NEXT_PUBLIC_ values are fixed at build time.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which packages ended up in the standalone node_modules?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only what the server loads at runtime: next, react, react-dom, sharp and their helpers, 11 in the lab. Packages bundled into the build output (like lodash from client code) or used only by tooling (jsdom in the lab scripts) were not copied.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Standalone output** | Self-contained server folder |
| **Output file tracing** | Recording which files routes need |
| **outputFileTracingIncludes** | Adds files tracing cannot see |
| **HOSTNAME** | Interface the standalone server listens on |

---
**Conclusion:** output: "standalone" turns a Next.js build into a small, self-contained server folder by copying only what tracing says the routes need. The lab measured the gain (33 MB against 396 MB) and the one manual step that is easy to miss: static files and public must be copied or served elsewhere.`,
    examples: [
      {
        label: "Config, copy steps and start command",
        tech: "bash",
        runnable: false,
        code: `# next.config.ts
#   const nextConfig = { output: "standalone" };

npm run build
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
cd .next/standalone
PORT=3000 HOSTNAME=0.0.0.0 node server.js`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you handle authentication in Next.js?",
    seoDescription: "Authenticate in Proxy for quick redirects but authorize next to the data: a layout-only check let a page render after logout in a Next 16.3.4 lab.",
    description: `**Question presented to candidate:**
"How would you implement authentication and authorization in a Next.js App Router app, and where exactly should the checks live?"

**What a strong answer should cover:**
- Use a session: a signed, encrypted cookie (stateless) or a session id backed by a database; auth libraries (Auth.js, Clerk, Better Auth and others) handle the details.
- Proxy (formerly middleware) is good for optimistic redirects based on the cookie, not for full authorization.
- Verify the session close to the data: a data access layer (DAL) function, wrapped in React \`cache\`, called by pages, Server Actions and Route Handlers.
- Do not rely on layouts: they do not re-render on client navigation, so a layout check can be skipped; pages and layouts also render in parallel.
- Every Server Action and Route Handler must check the session itself, because they are public endpoints.

**Clarifying questions expected:**
- "Stateless cookie or database sessions?" — decides revocation and scaling trade-offs.
- "Is there role-based access?" — authorization checks belong in the data layer.

**Code / implementation expected:** Yes — a DAL with a cached session check, and its use in a page and an action.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic React and App Router familiarity.
**Difficulty:** Hard

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.3.4 docs shipped with the package and, in the **Verified** section, against real output from a build or a running server.

## 1. Why This Even Matters — A Story First

Security at a concert: the ticket check at the gate (Proxy) turns away people without wristbands, fast. But the backstage door has its own guard who checks the name list (the data access layer), because someone can always get into the venue by other means. A layout check is a guard who stands at the hall entrance only when the doors first open; people already inside can walk between rooms without seeing him again.

## 2. The Core Idea

📌 **Interview term: Session** — data proving who the user is across requests, kept in an encrypted cookie or referenced by a cookie id in a database.

📌 **Interview term: Data access layer** — a server module where every data read and write checks the session and permissions before touching the database.

📌 **Interview term: Optimistic check** — a quick check (such as cookie presence in Proxy) used for redirects, not trusted as authorization.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 336" role="img" aria-label="Where each check runs, and what the lab showed. Proxy, layout, page / Server Action, data access layer">
  <defs>
    <marker id="nx03568v-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Where each check runs, and what the lab showed</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.45s" fill="freeze"/>
    <rect class="d-box" x="24" y="46" width="612" height="44" rx="10"/>
    <circle class="d-box-accent" cx="46" cy="68" r="12"/>
    <text class="d-text d-accent" x="46" y="73" text-anchor="middle">1</text>
    <text class="d-text" x="70" y="73">Proxy</text>
    <text class="d-sub" x="262" y="72">cookie present? fast redirect, runs before routes</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.45s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="102" width="612" height="44" rx="10"/>
    <circle class="d-box-accent" cx="46" cy="124" r="12"/>
    <text class="d-text d-accent" x="46" y="129" text-anchor="middle">2</text>
    <text class="d-text" x="70" y="129">layout</text>
    <text class="d-sub" x="262" y="128">skipped on client navigation: page B rendered after logout</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.45s" fill="freeze"/>
    <rect class="d-box" x="24" y="158" width="612" height="44" rx="10"/>
    <circle class="d-box-accent" cx="46" cy="180" r="12"/>
    <text class="d-text d-accent" x="46" y="185" text-anchor="middle">3</text>
    <text class="d-text" x="70" y="185">page / Server Action</text>
    <text class="d-sub" x="262" y="184">runs every time it is requested</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.45s" fill="freeze"/>
    <rect class="d-box-accent" x="24" y="214" width="612" height="44" rx="10"/>
    <circle class="d-box-accent" cx="46" cy="236" r="12"/>
    <text class="d-text d-accent" x="46" y="241" text-anchor="middle">4</text>
    <text class="d-text d-accent" x="70" y="241">data access layer</text>
    <text class="d-sub" x="262" y="240">verify session and role next to the query</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.7s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="274" width="612" height="44" rx="10"/>
    <text class="d-sub" x="330" y="301" text-anchor="middle">even when the layout redirected on a full load, the page code had already run in parallel</text>
  </g>
</svg>

The safest place for an authorization check is the one that cannot be skipped: the function that reads or writes the data.

## 3. Where checks belong

| Layer | Check | Why |
| :--- | :--- | :--- |
| Proxy | Session cookie present, redirect to login | Fast, before rendering; not a data guard |
| Layout | Show or hide navigation | Not reliable for protection: not re-run on client navigation |
| Page | \`await verifySession()\` | Runs for every request of that page |
| Server Action, Route Handler | \`await verifySession()\` + permission | Public endpoints |
| Data access layer | Session + ownership + role | Cannot be bypassed by forgetting a page check |

## 4. Sessions

Stateless sessions (an encrypted JWT in an HttpOnly, Secure, SameSite cookie) are simple and scale well, but revocation is hard. Database sessions store an id in the cookie and look it up, which allows logout everywhere. Either way, set cookies from Server Actions or Route Handlers, and never expose tokens to client code. Related: [Middleware and Proxy](/interview-question/what-is-middleware-in-next-js-and-what-can-it-do) and [Server Action security](/interview-question/what-are-the-security-considerations-for-server-actions-in-next-js).

## 5. Verified — A Layout-Only Guard (Next.js 16.3.4, real browser)

\`\`\`
app/secure/layout.tsx redirects to /about when there is no session cookie; pages a and b render "SECRET PAGE"
real browser, next start:
  1. set session=demo, load /secure/a              -> SECRET PAGE A session=demo
  2. delete the cookie in the browser
  3. click the link to /secure/b (client navigation) -> SECRET PAGE B session=none   (one request: /secure/b?_rsc=...)
  4. reload /secure/b (full page load)             -> redirected to /about?from=layout-guard

server log, in order:
  SECURE LAYOUT CHECK ran, session=demo
  SECURE PAGE a rendered, session=demo
  SECURE PAGE b rendered, session=none        <- step 3: the layout check did not run at all
  SECURE LAYOUT CHECK ran, session=none       <- step 4: the layout ran and redirected...
  SECURE PAGE b rendered, session=none        <- ...but the page code still executed in parallel
\`\`\`

This matches the Next.js docs warning to be cautious with checks in layouts, because they do not re-render on navigation. The second finding is worth repeating: on the full load the layout redirected, but the page function had already run, so any data it fetched was fetched for a user without a session.

## 6. Common Pitfalls

- **Protecting routes only in a layout.** The lab showed a page rendering after logout via client navigation.
- **Treating Proxy as authorization.** It checks cookies at the edge of routing; permissions belong next to the data.
- **Unprotected Server Actions.** An action id can be called directly; verify the session inside it.
- **Readable tokens.** Keep session cookies HttpOnly and Secure; never store tokens in localStorage.
- **Fetching sensitive data in pages that rely on a parent guard.** Pages run in parallel with layouts; guard the data call itself.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Keep a session in an encrypted HttpOnly cookie or a database, usually through an auth library.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">Use Proxy for quick cookie-based redirects, but verify the session in a data access layer wrapped in React cache.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;">Do not rely on layouts: in the lab, after logout a client navigation rendered the protected page without re-running the layout.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;">Pages run in parallel with layouts, so even a redirecting layout did not stop the page code from executing.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">Check the session in every Server Action and Route Handler, since they are public endpoints.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why use React <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">cache</code> for the session check?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Pages, layouts and components may all call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">verifySession()</code> in one request; cache makes it one lookup per request while still re-checking on every request.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you log a user out everywhere?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With database sessions: delete the session rows. Stateless JWT sessions cannot be revoked before expiry without a denylist.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where should role checks live?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In the data access layer or a DTO function that returns only the fields the user may see, so no page can accidentally return more.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does a Proxy redirect protect API routes too?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only if the matcher covers them, and it is still an optimistic check; Route Handlers should verify the session themselves.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Session** | Proof of identity across requests |
| **Data access layer** | Server module that checks auth before data access |
| **Optimistic check** | Fast cookie check for redirects only |
| **HttpOnly cookie** | Cookie not readable by JavaScript |

---
**Conclusion:** Authentication in the App Router is layered: Proxy for fast redirects, and real checks in pages, Server Actions, Route Handlers and above all a data access layer. The lab demonstrated why layouts are the wrong place to rely on: a page rendered after logout on client navigation, and a page ran in parallel even when its layout redirected.`,
    examples: [
      {
        label: "A cached session check in a data access layer",
        tech: "tsx",
        runnable: false,
        code: `// lib/dal.ts
import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { decrypt } from "@/lib/session";

export const verifySession = cache(async () => {
  const token = (await cookies()).get("session")?.value;
  const session = token ? await decrypt(token) : null;
  if (!session?.userId) redirect("/login");
  return { userId: session.userId, role: session.role };
});

export async function getInvoice(id: string) {
  const { userId, role } = await verifySession();          // checked next to the data
  const invoice = await db.invoice.findUnique({ where: { id } });
  if (!invoice || (invoice.ownerId !== userId && role !== "admin")) return null;
  return { id: invoice.id, total: invoice.total };           // only the fields the UI needs
}

// app/invoices/[id]/page.tsx
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const invoice = await getInvoice((await params).id);
  if (!invoice) return <p>Not found</p>;
  return <p>Total: {invoice.total}</p>;
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the difference between getServerSideProps/getStaticProps and App Router data fetching?",
    seoDescription: "Pages Router fetches in getServerSideProps and ships props as __NEXT_DATA__; the App Router fetches in Server Components. Compared on 16.3.4.",
    description: `**Question presented to candidate:**
"If I know getServerSideProps and getStaticProps, how does data fetching in the App Router map to them, and what actually changes for the user and the payload?"

**What a strong answer should cover:**
- Pages Router: \`getServerSideProps\` runs per request, \`getStaticProps\` at build (with \`revalidate\` for ISR), \`getStaticPaths\` lists dynamic pages; only the page file can fetch.
- Their return value is serialized into \`__NEXT_DATA__\` JSON in the HTML, including props the component never renders.
- App Router: any Server Component can \`await\` data; the rendering mode (static, ISR, dynamic) follows from what the code reads and its cache settings.
- The mapping: getServerSideProps is a dynamic route, getStaticProps is a static route with fetch caching or \`revalidate\`, getStaticPaths is \`generateStaticParams\`.
- The client receives the RSC payload (rendered output) instead of the raw props JSON.

**Clarifying questions expected:**
- "Is the app migrating incrementally?" — both routers can run side by side.
- "Which pages need per-request data?" — they become dynamic routes.

**Code / implementation expected:** Yes — the same page in both routers.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic React and App Router familiarity.
**Difficulty:** Medium

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.3.4 docs shipped with the package and, in the **Verified** section, against real output from a build or a running server.

## 1. Why This Even Matters — A Story First

The Pages Router is a restaurant where only the head chef may shop for ingredients, before cooking starts, and the shopping list is stapled to every plate that goes out. The App Router lets each cook fetch what their dish needs, and the plate carries only the finished food.

## 2. The Core Idea

📌 **Interview term: getServerSideProps** — a Pages Router function that runs on every request and returns props for the page.

📌 **Interview term: getStaticProps** — a Pages Router function that runs at build time (and on revalidation) to produce page props.

📌 **Interview term: __NEXT_DATA__** — a JSON script in Pages Router HTML that contains the page props and routing data for hydration.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 268" role="img" aria-label="The same idea, two data models. Pages Router, App Router">
  <defs>
    <marker id="nx04atve-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">The same idea, two data models</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="48" width="280" height="136" rx="10"/>
    <text class="d-text" x="164" y="78" text-anchor="middle">Pages Router</text>
    <text class="d-sub" x="164" y="106" text-anchor="middle">one data function per page</text>
    <text class="d-sub" x="164" y="128" text-anchor="middle">props JSON in __NEXT_DATA__</text>
    <text class="d-sub" x="164" y="150" text-anchor="middle">unrendered props sent too</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 307 116 L 353 116" marker-end="url(#nx04atve-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 307 116 L 353 116"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="356" y="48" width="280" height="136" rx="10"/>
    <text class="d-text d-accent" x="496" y="78" text-anchor="middle">App Router</text>
    <text class="d-sub" x="496" y="106" text-anchor="middle">any Server Component awaits data</text>
    <text class="d-sub" x="496" y="128" text-anchor="middle">RSC payload of the output</text>
    <text class="d-sub" x="496" y="150" text-anchor="middle">mode inferred from the code</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="206" width="612" height="44" rx="10"/>
    <text class="d-sub" x="330" y="233" text-anchor="middle">lab: a prop the page never rendered was still in the __NEXT_DATA__ of the legacy page</text>
  </g>
</svg>

The App Router moves data fetching from a page-level hook into the components themselves, and stops sending the raw data along with the HTML.

## 3. Mapping

| Pages Router | App Router |
| :--- | :--- |
| \`getServerSideProps\` | A route that reads request data or uses \`cache: 'no-store'\` (dynamic) |
| \`getStaticProps\` | A static route; \`export const revalidate\` or fetch \`next.revalidate\` for ISR |
| \`getStaticProps\` + \`revalidate: 60\` | \`export const revalidate = 60\`, or 'use cache' + \`cacheLife\` |
| \`getStaticPaths\` | \`generateStaticParams\` (+ \`dynamicParams\`) |
| \`fallback: 'blocking'\` | \`dynamicParams = true\` (default) |
| \`notFound: true\`, \`redirect\` | \`notFound()\`, \`redirect()\` |
| Data only in the page | Data in any Server Component, deduplicated with memoization |

## 4. What the user gets

In the Pages Router the whole props object is serialized into the HTML, and the component code ships to the browser. In the App Router only Client Components ship code and only their props are serialized. Migration steps are in [Pages to App Router migration](/interview-question/how-do-you-migrate-from-the-pages-router-to-the-app-router-in-next-js).

## 5. Verified — Both Routers in One Build (Next.js 16.3.4)

\`\`\`
GET /legacy-ssr (pages/, getServerSideProps returns { at, secretFromServer })
  __NEXT_DATA__ script: {"props":{"pageProps":{"at":"2026-09-23T06:41:57.146Z","secretFromServer":"only-needed-on-server"},"__N_SSP":true},"page":"/legacy-ssr","query":{},"buildId":"hjHQSMX0f_tcwIn_pnd7H","isFallback":false,"isExperimentalCompile":false,
  contains secretFromServer even though the component never renders it: true
GET /counter (app/, Server Component page with one client Counter)
  __NEXT_DATA__ present: false; RSC payload scripts (self.__next_f.push): 1

build table:
  Route (pages): ƒ /legacy-ssr   ● /legacy-ssg (1m revalidate)   Route (app): ○ /counter
\`\`\`

## 6. Common Pitfalls

- **Returning more props than needed in getServerSideProps.** Everything is in \`__NEXT_DATA__\`, visible in the page source, as the lab showed.
- **Porting getServerSideProps to a Client Component fetch.** Keep it on the server as an async Server Component.
- **Expecting getServerSideProps in app/.** It is not supported there; fetch in the component.
- **Assuming fetch results are cached like getStaticProps.** Since Next.js 15 you opt in; a static route still runs its fetch once at build.
- **Mixing up getStaticPaths fallback values.** Use \`dynamicParams\` for the same behaviour.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Pages Router data comes from getServerSideProps (per request), getStaticProps (build or ISR) and getStaticPaths, in the page file only.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">Their props are serialized into __NEXT_DATA__: the lab page shipped a prop it never rendered.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;">In the App Router any Server Component awaits data, and the rendering mode follows from what the code reads.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;">getServerSideProps maps to a dynamic route, getStaticProps to a static or revalidated route, getStaticPaths to generateStaticParams.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">The client receives the RSC payload of the rendered output instead of raw props.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you do getServerSideProps-style per-request data?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Read request data (cookies, headers, searchParams) or use no-store fetches in the Server Component; the route becomes dynamic automatically.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is getStaticProps with revalidate the same as ISR in the App Router?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes in effect: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">export const revalidate</code> or a fetch revalidate gives time-based regeneration; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">revalidatePath</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">revalidateTag</code> give on-demand.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can both routers live in one app?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, the lab build listed Route (app) and Route (pages) together; navigation between them is a full page load.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What replaces getInitialProps?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Nothing directly; it is legacy. Fetch in Server Components instead.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **getServerSideProps** | Per-request page props (Pages Router) |
| **getStaticProps** | Build-time page props (Pages Router) |
| **__NEXT_DATA__** | Props JSON embedded in Pages Router HTML |
| **RSC payload** | Rendered output sent by the App Router |

---
**Conclusion:** The App Router replaces page-level data hooks with data fetching inside components, and infers the rendering mode from the code. The lab showed the practical difference in the payload: the Pages Router page shipped its whole props object, including data it never rendered, while the App Router page shipped only an RSC payload.`,
    examples: [
      {
        label: "The same page in both routers",
        tech: "tsx",
        runnable: false,
        code: `// pages/products/[id].tsx  (Pages Router)
export async function getServerSideProps({ params }: { params: { id: string } }) {
  const product = await getProduct(params.id);
  return { props: { product } };            // whole object goes into __NEXT_DATA__
}
export default function Product({ product }: { product: { name: string } }) {
  return <h1>{product.name}</h1>;
}

// app/products/[id]/page.tsx  (App Router)
import { cookies } from "next/headers";
export default async function Product({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await cookies();                          // per-request, like getServerSideProps
  const product = await getProduct(id);
  return <h1>{product.name}</h1>;          // only the rendered output is sent
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you migrate from the Pages Router to the App Router in Next.js?",
    seoDescription: "Migrate route by route: pages/ and app/ run side by side, crossing between them is a full page load, and data hooks become Server Components.",
    description: `**Question presented to candidate:**
"We have a large Pages Router app. How would you plan the migration to the App Router without a big-bang rewrite?"

**What a strong answer should cover:**
- Both routers work in one app, so migrate incrementally, route by route; a path must not exist in both.
- Start with the root layout (\`app/layout.tsx\` replaces \`_app\` and \`_document\`), then move low-risk pages.
- Replace data functions with Server Component fetching, \`next/router\` with \`next/navigation\` hooks, \`next/head\` with the Metadata API, and API routes with Route Handlers when convenient.
- Navigation between the two routers is a hard navigation (full page load) and Link does not prefetch across them, so migrate related sections together.
- Use codemods for mechanical changes and upgrade Next.js first so both routers run on the same version.

**Clarifying questions expected:**
- "Which sections are most self-contained?" — they migrate first.
- "Which libraries rely on next/router or _app providers?" — they need Client Component wrappers.

**Code / implementation expected:** Yes — a root layout replacing _app and _document, and a page conversion.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic React and App Router familiarity.
**Difficulty:** Hard

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.3.4 docs shipped with the package and, in the **Verified** section, against real output from a build or a running server.

## 1. Why This Even Matters — A Story First

Migrating is like moving a library to a new building while it stays open. You move one section at a time. A reader walking from a moved section to an unmoved one has to cross the street (a full page load), so you move sections that are often read together at the same time, and you keep signs (redirects and shared layouts) consistent in both buildings.

## 2. The Core Idea

📌 **Interview term: Incremental adoption** — running pages/ and app/ in the same project and moving routes gradually.

📌 **Interview term: Hard navigation** — a full browser page load, as happens between routes of different routers.

📌 **Interview term: Codemod** — an automated code transformation used for mechanical migration steps.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 250" role="img" aria-label="Moving one route at a time. upgrade, root layout, move routes">
  <defs>
    <marker id="nx05cdf1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Moving one route at a time</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box" x="24" y="48" width="174.66666666666666" height="118" rx="10"/>
    <circle class="d-box-accent" cx="40" cy="48" r="12"/>
    <text class="d-text d-accent" x="40" y="53" text-anchor="middle">1</text>
    <text class="d-text" x="111.33333333333333" y="82" text-anchor="middle">upgrade</text>
    <text class="d-sub" x="111.33333333333333" y="108" text-anchor="middle">latest Next.js</text>
    <text class="d-sub" x="111.33333333333333" y="130" text-anchor="middle">both routers active</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 201.66666666666666 107 L 239.66666666666666 107" marker-end="url(#nx05cdf1-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 201.66666666666666 107 L 239.66666666666666 107"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="242.66666666666666" y="48" width="174.66666666666666" height="118" rx="10"/>
    <circle class="d-box-accent" cx="258.66666666666663" cy="48" r="12"/>
    <text class="d-text d-accent" x="258.66666666666663" y="53" text-anchor="middle">2</text>
    <text class="d-text d-accent" x="330" y="82" text-anchor="middle">root layout</text>
    <text class="d-sub" x="330" y="108" text-anchor="middle">app/layout.tsx</text>
    <text class="d-sub" x="330" y="130" text-anchor="middle">replaces _app, _document</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 420.3333333333333 107 L 458.3333333333333 107" marker-end="url(#nx05cdf1-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 420.3333333333333 107 L 458.3333333333333 107"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.7s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-muted" x="461.3333333333333" y="48" width="174.66666666666666" height="118" rx="10"/>
    <circle class="d-box-accent" cx="477.3333333333333" cy="48" r="12"/>
    <text class="d-text d-accent" x="477.3333333333333" y="53" text-anchor="middle">3</text>
    <text class="d-text" x="548.6666666666666" y="82" text-anchor="middle">move routes</text>
    <text class="d-sub" x="548.6666666666666" y="108" text-anchor="middle">section by section</text>
    <text class="d-sub" x="548.6666666666666" y="130" text-anchor="middle">router crossing: full load</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="2.1s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="188" width="612" height="44" rx="10"/>
    <text class="d-sub" x="330" y="215" text-anchor="middle">lab: App to App navigation kept the document; App to Pages reloaded it</text>
  </g>
</svg>

The cost of a half-migrated app is full page loads at every router boundary. Plan the order around how users move between sections.

## 3. What changes

| Pages Router | App Router |
| :--- | :--- |
| \`pages/_app.tsx\`, \`pages/_document.tsx\` | \`app/layout.tsx\` |
| \`getServerSideProps\` / \`getStaticProps\` | Async Server Components, fetch caching, \`revalidate\` |
| \`getStaticPaths\` | \`generateStaticParams\` |
| \`next/router\` (\`useRouter\`) | \`next/navigation\` (\`useRouter\`, \`usePathname\`, \`useSearchParams\`) |
| \`next/head\` | \`metadata\` / \`generateMetadata\` |
| \`pages/api/*\` | \`app/**/route.ts\` (optional; both work) |
| \`pages/404.tsx\`, \`_error.tsx\` | \`not-found.tsx\`, \`error.tsx\`, \`global-error.tsx\` |
| Providers in \`_app\` | A Client Component provider in the root layout |

## 4. Order of work

Upgrade to the latest version first, add \`app/layout.tsx\`, then move routes starting with the simplest, keeping the old page until the new one works (they must not both exist for one path). Move groups of pages that link to each other together, because each router crossing is a full load. See [getServerSideProps vs App Router data](/interview-question/what-is-the-difference-between-getserversideprops-getstaticprops-and-app-router-) and [what breaks in Next.js 16](/interview-question/what-breaks-when-you-upgrade-to-next-js-16-and-how-do-you-migrate).

## 5. Verified — Both Routers Side by Side (Next.js 16.3.4)

Build table of one project with both directories:

\`\`\`
Route (pages)                 Revalidate  Expire
┌ ƒ /api/legacy
├ ● /legacy-ssg                       1m      1y
└ ƒ /legacy-ssr
\`\`\`

Navigating across the boundary in a real browser:

\`\`\`
one app with both routers (app/ and pages/), real browser, next start; a marker variable is set on window before navigating
router.push("/nav/b")        App Router -> App Router      same document, window marker kept: true
router.push("/legacy-ssg")   App Router -> Pages Router    full document load, window marker kept: false
\`\`\`

## 6. Common Pitfalls

- **The same path in both routers.** It is a conflict; delete the pages/ file when the app/ route is ready.
- **Migrating pages that users switch between constantly one at a time.** Every crossing is a full page load.
- **Importing next/router in app/.** App components use next/navigation.
- **Moving providers into a Server Component.** Context providers must be Client Components rendered in the root layout.
- **Porting getServerSideProps to useEffect fetching.** Keep data on the server in async Server Components.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Both routers run in one app, so migrate incrementally, route by route, after upgrading Next.js.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">Start with app/layout.tsx replacing _app and _document, with providers in a Client Component.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;">Convert data functions to Server Components, next/router to next/navigation, next/head to the Metadata API.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;">Crossing between routers is a full page load: in the lab router.push to a Pages route reloaded the document.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">Move sections that link to each other together, and use codemods for mechanical changes.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do you have to migrate API routes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. pages/api routes keep working; move them to Route Handlers when you touch them or when you need App Router features.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you share layout UI between the two routers during migration?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Extract shared components used by both <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">_app</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">app/layout.tsx</code>; the layouts themselves are separate.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about libraries that use next/router?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Check for App Router support; many offer a next/navigation version. Otherwise keep those pages in pages/ until an alternative exists.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle i18n config from next.config?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The built-in i18n routing is a Pages Router feature; in the App Router use a [lang] segment with Proxy for detection.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Incremental adoption** | Migrating route by route |
| **Hard navigation** | Full page load between routers |
| **next/navigation** | App Router navigation hooks |
| **Codemod** | Automated code change |

---
**Conclusion:** Migrating to the App Router is incremental by design: both routers run together, and you move route by route. The lab confirmed the one cost to plan around: a full page load at every crossing between routers. Start with the root layout, move related sections together, and convert data fetching to Server Components rather than to client effects.`,
    examples: [
      {
        label: "A root layout replacing _app and _document",
        tech: "tsx",
        runnable: false,
        code: `// app/layout.tsx (replaces pages/_app.tsx and pages/_document.tsx)
import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = { title: { template: "%s | Shop", default: "Shop" } };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

// app/providers.tsx
"use client";
import { ThemeProvider } from "@/lib/theme";
export function Providers({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is next.config.js in Next.js and what are common configurations?",
    seoDescription: "next.config.ts configures images, redirects, headers, output, caching and experimental flags. It is validated at build time, as old keys showed.",
    description: `**Question presented to candidate:**
"What goes into next.config.js, which options do you most often touch, and how do you catch mistakes in it?"

**What a strong answer should cover:**
- \`next.config.ts\` (or \`.js\` / \`.mjs\`) exports an object or function that configures the build and the server; TypeScript config gets the \`NextConfig\` type.
- Common options: \`images\` (remotePatterns, formats, qualities), \`redirects\`, \`rewrites\`, \`headers\`, \`output\`, \`serverExternalPackages\`, \`turbopack\`, \`cacheComponents\` and \`cacheLife\`, \`reactCompiler\`, \`experimental\`.
- It is loaded by the Node.js server and build, not bundled for the browser; env values used there are read at build or start.
- Next.js validates it: unknown or moved keys print warnings with the new name.
- It can export a function that receives the phase (development, build, production server) to vary settings.

**Clarifying questions expected:**
- "Which Next.js version?" — keys move between versions (for example serverComponentsExternalPackages).
- "Is this for the build or runtime behaviour?" — some options only affect one of them.

**Code / implementation expected:** Yes — a typed config with the common options.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic React and App Router familiarity.
**Difficulty:** Medium

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.3.4 docs shipped with the package and, in the **Verified** section, against real output from a build or a running server.

## 1. Why This Even Matters — A Story First

next.config is the settings panel of a car before a trip: which wheels to use (output), which roads are allowed (images.remotePatterns), which signs to put up (redirects and headers), and a few switches marked experimental. The car checks the panel before starting and complains about switches it does not recognise.

## 2. The Core Idea

📌 **Interview term: next.config.ts** — the configuration file at the project root that controls the Next.js build and server.

📌 **Interview term: NextConfig** — the TypeScript type of the configuration object, which gives autocompletion and type checking.

📌 **Interview term: Phase** — the context in which the config is loaded (development server, production build, production server), available to function-style configs.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 392" role="img" aria-label="The options most projects touch. images, routing, output, server code, caching">
  <defs>
    <marker id="nx06lzbm-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">The options most projects touch</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.45s" fill="freeze"/>
    <rect class="d-box" x="24" y="46" width="612" height="44" rx="10"/>
    <circle class="d-box-accent" cx="46" cy="68" r="12"/>
    <text class="d-text d-accent" x="46" y="73" text-anchor="middle">1</text>
    <text class="d-text" x="70" y="73">images</text>
    <text class="d-sub" x="262" y="72">remotePatterns, formats, qualities for next/image</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.45s" fill="freeze"/>
    <rect class="d-box" x="24" y="102" width="612" height="44" rx="10"/>
    <circle class="d-box-accent" cx="46" cy="124" r="12"/>
    <text class="d-text d-accent" x="46" y="129" text-anchor="middle">2</text>
    <text class="d-text" x="70" y="129">routing</text>
    <text class="d-sub" x="262" y="128">redirects, rewrites and headers at the server</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.45s" fill="freeze"/>
    <rect class="d-box-accent" x="24" y="158" width="612" height="44" rx="10"/>
    <circle class="d-box-accent" cx="46" cy="180" r="12"/>
    <text class="d-text d-accent" x="46" y="185" text-anchor="middle">3</text>
    <text class="d-text d-accent" x="70" y="185">output</text>
    <text class="d-sub" x="262" y="184">standalone for Docker, export for static hosting</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.45s" fill="freeze"/>
    <rect class="d-box" x="24" y="214" width="612" height="44" rx="10"/>
    <circle class="d-box-accent" cx="46" cy="236" r="12"/>
    <text class="d-text d-accent" x="46" y="241" text-anchor="middle">4</text>
    <text class="d-text" x="70" y="241">server code</text>
    <text class="d-sub" x="262" y="240">serverExternalPackages, turbopack rules</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.7s" dur="0.45s" fill="freeze"/>
    <rect class="d-box-accent" x="24" y="270" width="612" height="44" rx="10"/>
    <circle class="d-box-accent" cx="46" cy="292" r="12"/>
    <text class="d-text d-accent" x="46" y="297" text-anchor="middle">5</text>
    <text class="d-text d-accent" x="70" y="297">caching</text>
    <text class="d-sub" x="262" y="296">cacheComponents, cacheLife profiles (Next.js 16)</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="2.1s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="330" width="612" height="44" rx="10"/>
    <text class="d-sub" x="330" y="357" text-anchor="middle">the build validates the file: an old key printed Unrecognized key plus its new name</text>
  </g>
</svg>

Most of next.config is about the edges of your app: what it may load, how requests are routed, and how it is packaged.

## 3. Common options

| Option | Purpose |
| :--- | :--- |
| \`images.remotePatterns\` | Allowed external image hosts |
| \`redirects()\` / \`rewrites()\` / \`headers()\` | Request-level routing rules |
| \`output\` | \`"standalone"\` or \`"export"\` |
| \`serverExternalPackages\` | Packages loaded from node_modules at runtime |
| \`turbopack\` | Loader rules, aliases, root |
| \`cacheComponents\`, \`cacheLife\` | The Next.js 16 caching model |
| \`reactCompiler\` | Enable the React Compiler |
| \`experimental.staleTimes\` | Client cache lifetimes |
| \`basePath\`, \`trailingSlash\` | URL shape |
| \`serverActions.allowedOrigins\` / \`bodySizeLimit\` | Server Action limits |

## 4. Validation and phases

Next.js checks the config at startup and prints warnings for unknown keys, often with the replacement name. A function config receives the phase constant, useful for development-only settings. Detail on routing rules: [redirects and rewrites](/interview-question/how-do-you-handle-redirects-and-rewrites-in-next-js).

## 5. Verified — Config Behaviour in Builds (Next.js 16.3.4)

An old key in \`experimental\`:

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

Routing options from the same config, on \`next start\`:

\`\`\`
next.config.ts: redirects /old-blog/:slug -> /blog/:slug (permanent), /temp -> /about (temporary), /docs/:path* with ?v=1 -> /about;
rewrites beforeFiles /about-us -> /about, afterFiles /api-proxy/:path* -> http://localhost:4200/:path*, fallback /:path* -> /about?fallback=:path*;
headers /blog/:path* -> x-lab-header
/old-blog/one            -> 308  location: /blog/one
/temp                    -> 307  location: /about
/docs/intro?v=1          -> 307  location: /about?v=1
/docs/intro              -> 200  body: about (route group, URL has no group)
/about-us                -> 200  body: about (route group, URL has no group)
/api-proxy/hello         -> 200  body: {"name":"hello","hit":1,"at":"2026-09-23T06:41:56.870Z"}
/blog/one                -> 200  x-lab-header: from-next-config  body: post one
/no-such-page-xyz        -> 200  body: about (route group, URL has no group)
\`\`\`

And a custom \`webpack\` function under the default Turbopack build:

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

## 6. Common Pitfalls

- **Ignoring warnings.** Unknown keys are reported but the build may continue; the setting may not do what you think.
- **Assuming webpack() still applies.** It is ignored under Turbopack, the Next.js 16 default.
- **Secrets in next.config.** The file is not sent to the browser, but values you pass to \`env\` are inlined into client code.
- **Copying config from older versions.** Keys like \`images.domains\` and experimental PPR flags are deprecated or removed.
- **Heavy logic in the config.** It runs at every start and build; keep it declarative.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">next.config.ts is the root configuration for the Next.js build and server, typed with NextConfig.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">Common options are images, redirects, rewrites and headers, output, serverExternalPackages, turbopack, cacheComponents and cacheLife.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;">The build validates it: an old experimental key printed an unrecognized-key warning with its new name.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;">A custom webpack function is ignored by the default Turbopack build in Next.js 16.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">Use a function config for phase-specific settings, and keep it declarative.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between the env option and .env files?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">env</code> in next.config inlines the listed values into the bundle at build time; .env files provide process.env variables, with NEXT_PUBLIC_ ones inlined for the client.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can next.config be async?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, it can export an async function, for example to load settings; keep it fast because it runs on every start and build.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where do you configure security headers?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">headers()</code> for static rules, or in Proxy when they depend on the request.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you use TypeScript for the config?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Name the file next.config.ts and type the object as NextConfig; it is supported natively.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **next.config.ts** | Project configuration file |
| **NextConfig** | TypeScript type for the config |
| **Phase** | Development, build or production server context |
| **output** | Packaging mode: standalone or export |

---
**Conclusion:** next.config is where you set the edges of a Next.js app: image sources, request routing, packaging and the caching model. The lab showed the file being validated (an old key reported with its new name) and the Next.js 16 surprise of a webpack function that the default build never calls.`,
    examples: [
      {
        label: "A typed config with common options",
        tech: "tsx",
        runnable: false,
        code: `// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: { remotePatterns: [{ protocol: "https", hostname: "cdn.example.com" }] },
  serverExternalPackages: ["@acme/native-pdf"],
  cacheComponents: true,
  async redirects() {
    return [{ source: "/old-blog/:slug", destination: "/blog/:slug", permanent: true }];
  },
  async headers() {
    return [{ source: "/(.*)", headers: [{ key: "X-Frame-Options", value: "DENY" }] }];
  },
};

export default nextConfig;`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you handle redirects and rewrites in Next.js?",
    seoDescription: "Redirects send the browser to a new URL (307 or 308); rewrites serve another path under the same URL. Rules tested with real status codes.",
    description: `**Question presented to candidate:**
"Explain the difference between a redirect and a rewrite, and all the places in Next.js where you can do each one."

**What a strong answer should cover:**
- A redirect answers with a 3xx status and a Location header, so the browser requests the new URL and the address bar changes.
- A rewrite serves the content of another path (or another server) while the URL stays the same.
- In next.config: \`redirects()\` (permanent gives 308, otherwise 307), \`rewrites()\` with beforeFiles, afterFiles and fallback phases, and \`headers()\`.
- In code: \`redirect()\` and \`permanentRedirect()\` in Server Components and Server Actions, and \`NextResponse.redirect\` or \`rewrite\` in Proxy.
- Rules can match on paths, wildcards, headers, cookies and query strings with \`has\` and \`missing\`.

**Clarifying questions expected:**
- "Is the move permanent?" — permanent redirects are cached by browsers and pass SEO signals.
- "Does the decision depend on the request (cookie, locale)?" — then Proxy or code, not static config.

**Code / implementation expected:** Yes — config rules and a redirect in code.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic React and App Router familiarity.
**Difficulty:** Medium

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.3.4 docs shipped with the package and, in the **Verified** section, against real output from a build or a running server.

## 1. Why This Even Matters — A Story First

A redirect is the note on a shop door saying "we moved to number 42": you walk to the new address and now know it. A rewrite is a shop that sends a staff member through the back door to fetch the item from the warehouse next door: you never leave the counter, and the address you know stays the same.

## 2. The Core Idea

📌 **Interview term: Redirect** — a response with a 3xx status telling the browser to request another URL; 308 is permanent and 307 temporary in Next.js config.

📌 **Interview term: Rewrite** — mapping a request path to a different destination path or URL on the server, without changing the browser URL.

📌 **Interview term: has and missing** — rule conditions that match only when a header, cookie, query parameter or host is present or absent.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 268" role="img" aria-label="Two ways to send a request elsewhere (lab). redirect, rewrite">
  <defs>
    <marker id="nx07dzdk-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Two ways to send a request elsewhere (lab)</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box" x="24" y="48" width="280" height="136" rx="10"/>
    <text class="d-text" x="164" y="78" text-anchor="middle">redirect</text>
    <text class="d-sub" x="164" y="106" text-anchor="middle">3xx status + location header</text>
    <text class="d-sub" x="164" y="128" text-anchor="middle">/old-blog/one: 308 to /blog/one</text>
    <text class="d-sub" x="164" y="150" text-anchor="middle">browser URL changes</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 307 116 L 353 116" marker-end="url(#nx07dzdk-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 307 116 L 353 116"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="356" y="48" width="280" height="136" rx="10"/>
    <text class="d-text d-accent" x="496" y="78" text-anchor="middle">rewrite</text>
    <text class="d-sub" x="496" y="106" text-anchor="middle">same URL, other content</text>
    <text class="d-sub" x="496" y="128" text-anchor="middle">/about-us served the about page</text>
    <text class="d-sub" x="496" y="150" text-anchor="middle">or proxy to another server</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="206" width="612" height="44" rx="10"/>
    <text class="d-sub" x="330" y="233" text-anchor="middle">fallback rewrites run last: an unknown path in the lab showed the about page instead of a 404</text>
  </g>
</svg>

Choose by what the user should see in the address bar. Redirects change it and teach search engines the new URL; rewrites hide the real destination.

## 3. Where to put them

| Need | Where | Example |
| :--- | :--- | :--- |
| Old URL moved for good | \`redirects()\` permanent | \`/old-blog/:slug\` to \`/blog/:slug\` (308) |
| Temporary move | \`redirects()\` permanent false | 307 |
| Pretty URL for an existing page | \`rewrites().beforeFiles\` | \`/about-us\` to \`/about\` |
| Proxy an API or another app | \`rewrites().afterFiles\` to an external URL | \`/api-proxy/:path*\` |
| Catch-all for a legacy app | \`rewrites().fallback\` | runs only when no page matched |
| Redirect after a form submit | \`redirect()\` in a Server Action | after creating a record |
| Depends on cookies or locale | Proxy | \`NextResponse.redirect\` / \`rewrite\` |

## 4. Order of evaluation

headers, then redirects, then Proxy, then beforeFiles rewrites, then filesystem routes (public, _next/static, pages), then afterFiles rewrites, then dynamic routes, then fallback rewrites. That order explains why a fallback rewrite never overrides a real page. Related: [Middleware and Proxy](/interview-question/what-is-middleware-in-next-js-and-what-can-it-do).

## 5. Verified — Rules on next start (Next.js 16.3.4)

\`\`\`
next.config.ts: redirects /old-blog/:slug -> /blog/:slug (permanent), /temp -> /about (temporary), /docs/:path* with ?v=1 -> /about;
rewrites beforeFiles /about-us -> /about, afterFiles /api-proxy/:path* -> http://localhost:4200/:path*, fallback /:path* -> /about?fallback=:path*;
headers /blog/:path* -> x-lab-header
/old-blog/one            -> 308  location: /blog/one
/temp                    -> 307  location: /about
/docs/intro?v=1          -> 307  location: /about?v=1
/docs/intro              -> 200  body: about (route group, URL has no group)
/about-us                -> 200  body: about (route group, URL has no group)
/api-proxy/hello         -> 200  body: {"name":"hello","hit":1,"at":"2026-09-23T06:41:56.870Z"}
/blog/one                -> 200  x-lab-header: from-next-config  body: post one
/no-such-page-xyz        -> 200  body: about (route group, URL has no group)
\`\`\`

The query condition only matched with \`?v=1\`, and the query was kept on the redirect. The unknown path returned the about page with status 200 because of the fallback rewrite, which is also why fallback rewrites must be used carefully.

## 6. Common Pitfalls

- **Permanent redirects for temporary moves.** Browsers cache 308s; undoing one is hard.
- **Catch-all fallback rewrites hiding 404s.** Missing pages return 200 with other content, which confuses users and search engines.
- **Redirect loops.** A rule whose destination matches its own source; test the chain.
- **Using Proxy for static rules.** Config redirects are simpler and cached; Proxy is for request-dependent decisions.
- **Expecting config rules in a static export.** They do not apply; the build warns.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">A redirect sends a 3xx and the browser goes to the new URL; a rewrite serves other content under the same URL.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">In next.config, permanent redirects give 308 and temporary ones 307, as the lab showed.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;">Rewrites run in phases: beforeFiles, afterFiles and fallback, and can proxy to external servers.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;">In code use redirect() in Server Components and Actions, and Proxy for request-dependent rules.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">Beware catch-all fallback rewrites: in the lab an unknown path returned 200 instead of a 404.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why 307 and 308 instead of 302 and 301?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">307 and 308 require the browser to keep the request method, so a POST stays a POST; 301 and 302 allowed changing it to GET.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you redirect based on a cookie in config?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">has: [{ type: "cookie", key: "beta" }]</code> to the rule; for more complex logic use Proxy.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How many redirects can you have?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Config rules are loaded into memory and matched per request; very large lists (thousands) belong in a lookup in Proxy or at the CDN.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you redirect inside a Server Component?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">redirect("/login")</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">permanentRedirect("/new")</code> from next/navigation; it throws internally, so code after it does not run.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Redirect** | 3xx response to a new URL |
| **Rewrite** | Different content under the same URL |
| **307 and 308** | Temporary and permanent, method preserved |
| **has / missing** | Conditions for rules |

---
**Conclusion:** Redirects change the URL, rewrites change the content behind it. Next.js offers both in next.config, in Proxy and in code, and the lab showed each rule type with real status codes, including the catch-all fallback rewrite that quietly turned a 404 into a 200.`,
    examples: [
      {
        label: "Config rules and a redirect in code",
        tech: "tsx",
        runnable: false,
        code: `// next.config.ts
const nextConfig = {
  async redirects() {
    return [
      { source: "/old-blog/:slug", destination: "/blog/:slug", permanent: true },           // 308
      { source: "/beta", destination: "/", permanent: false, missing: [{ type: "cookie", key: "beta" }] },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [{ source: "/about-us", destination: "/about" }],
      afterFiles: [{ source: "/api/legacy/:path*", destination: "https://legacy.example.com/:path*" }],
      fallback: [],
    };
  },
};
export default nextConfig;

// app/checkout/actions.ts
"use server";
import { redirect } from "next/navigation";
export async function placeOrder(formData: FormData) {
  const order = await createOrder(formData);
  redirect(\`/orders/\${order.id}\`); // after the mutation
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you internationalize (i18n) a Next.js App Router app?",
    seoDescription: "The App Router has no built-in i18n routing: use a [lang] segment, detect the locale in Proxy and load dictionaries on the server. Tested on Next 16.3.4.",
    description: `**Question presented to candidate:**
"We need English, German and French versions of the site with locale-prefixed URLs. How do you set up i18n in the App Router?"

**What a strong answer should cover:**
- The next.config \`i18n\` option is a Pages Router feature; in the App Router you build routing yourself with a \`[lang]\` dynamic segment.
- Detect the preferred locale in Proxy from the Accept-Language header or a cookie, and redirect \`/\` to \`/en\`, \`/de\` and so on.
- Load translation dictionaries in Server Components, so translations do not ship as client JavaScript.
- Use \`generateStaticParams\` for the locales so each language is prerendered, and \`dynamicParams = false\` to reject unknown ones.
- Next.js 16 adds \`next/root-params\` to read the root \`lang\` param anywhere in Server Components; set \`html lang\` and \`alternates.languages\` for SEO.

**Clarifying questions expected:**
- "Sub-paths or domains per locale?" — both work with Proxy.
- "Is content translated or just the UI?" — decides where translations come from.

**Code / implementation expected:** Yes — a [lang] segment, a dictionary loader and the Proxy redirect.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic React and App Router familiarity.
**Difficulty:** Hard

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.3.4 docs shipped with the package and, in the **Verified** section, against real output from a build or a running server.

## 1. Why This Even Matters — A Story First

An international airport has signs in several languages. The App Router does not come with those signs; you put up a desk at the entrance (Proxy) that looks at the passenger passport language and points them to the right terminal (/de, /fr), and each terminal has its own set of signs (dictionaries) printed in advance.

## 2. The Core Idea

📌 **Interview term: Locale** — an identifier for language and region preferences, such as en-US or de.

📌 **Interview term: [lang] segment** — a dynamic route segment at the top of app/ whose value is the locale.

📌 **Interview term: Accept-Language** — the request header in which browsers list preferred languages.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 250" role="img" aria-label="Locale routing in the App Router (lab). request /intl, redirect, app/[lang]">
  <defs>
    <marker id="nx08a2et-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Locale routing in the App Router (lab)</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="24" y="48" width="174.66666666666666" height="118" rx="10"/>
    <circle class="d-box-accent" cx="40" cy="48" r="12"/>
    <text class="d-text d-accent" x="40" y="53" text-anchor="middle">1</text>
    <text class="d-text d-accent" x="111.33333333333333" y="82" text-anchor="middle">request /intl</text>
    <text class="d-sub" x="111.33333333333333" y="108" text-anchor="middle">Proxy reads</text>
    <text class="d-sub" x="111.33333333333333" y="130" text-anchor="middle">Accept-Language</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 201.66666666666666 107 L 239.66666666666666 107" marker-end="url(#nx08a2et-arrow)"/>
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
    <text class="d-text" x="330" y="82" text-anchor="middle">redirect</text>
    <text class="d-sub" x="330" y="108" text-anchor="middle">de-DE to /intl/de</text>
    <text class="d-sub" x="330" y="130" text-anchor="middle">ja-JP to /intl/en</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 420.3333333333333 107 L 458.3333333333333 107" marker-end="url(#nx08a2et-arrow)"/>
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
    <text class="d-text" x="548.6666666666666" y="82" text-anchor="middle">app/[lang]</text>
    <text class="d-sub" x="548.6666666666666" y="108" text-anchor="middle">prerendered per locale</text>
    <text class="d-sub" x="548.6666666666666" y="130" text-anchor="middle">Hallo (de), Bonjour (fr)</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="2.1s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="188" width="612" height="44" rx="10"/>
    <text class="d-sub" x="330" y="215" text-anchor="middle">generateStaticParams built en, de and fr; dynamicParams false rejected es</text>
  </g>
</svg>

The framework provides the building blocks (dynamic segments, Proxy, static params); the locale policy is yours to write.

## 3. Building blocks

| Piece | Role |
| :--- | :--- |
| \`app/[lang]/...\` | Every route lives under the locale segment |
| \`proxy.ts\` | Detect locale (Accept-Language, cookie) and redirect |
| \`getDictionary(lang)\` | Server-only import of the JSON for that locale |
| \`generateStaticParams\` | Prerender each locale |
| \`dynamicParams = false\` | Unknown locales become 404 |
| \`next/root-params\` | Read \`lang\` in any Server Component without prop drilling |
| Metadata \`alternates.languages\` | hreflang links for SEO |

## 4. Libraries

Libraries such as next-intl add message formatting, plurals and typed keys on top of the same structure. Formatting dates and numbers can use \`Intl\` with the locale on the server. Proxy details are in [Middleware and Proxy](/interview-question/what-is-middleware-in-next-js-and-what-can-it-do).

## 5. Verified — Locale Detection and Pages (Next.js 16.3.4)

\`\`\`
app/intl/[lang]/page.tsx with generateStaticParams (en, de, fr) and dynamicParams = false; proxy.ts redirects /intl by Accept-Language
GET /intl  Accept-Language: de-DE,de;q=0.9               -> 307 location: /intl/de
GET /intl  Accept-Language: fr-FR,fr;q=0.9,en;q=0.5      -> 307 location: /intl/fr
GET /intl  Accept-Language: ja-JP                        -> 307 location: /intl/en
GET /intl  Accept-Language: (none)                       -> 307 location: /intl/en
GET /intl/de  -> 200  Hallo (de)   <html lang> of the h1: de
GET /intl/fr  -> 200  Bonjour (fr)   <html lang> of the h1: fr
GET /intl/es  -> 200  about (route group, URL has no group)   <html lang> of the h1: undefined
\`\`\`

\`/intl/es\` was rejected by \`dynamicParams = false\`; the lab has a catch-all fallback rewrite, which is why it showed another page with status 200 instead of a 404.

## 6. Common Pitfalls

- **Using the next.config i18n option in the App Router.** It is for the Pages Router; build locale routing with a segment and Proxy.
- **Shipping all dictionaries to the client.** Load them in Server Components and pass only what Client Components need.
- **Forgetting html lang.** Screen readers and search engines use it; set it from the lang param in the root layout.
- **No hreflang alternates.** Search engines may show the wrong language; add \`alternates.languages\`.
- **Detecting the locale on every page in Proxy.** Only redirect when the URL has no locale, or navigation redirects in loops.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">The App Router has no built-in i18n routing: the next.config i18n option is Pages Router only.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">Put routes under an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">app/[lang]</code> segment and detect the locale in Proxy from Accept-Language or a cookie.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;">In the lab, de-DE went to /intl/de, fr to /intl/fr, and an unknown language to the default en.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;">Load dictionaries in Server Components and prerender each locale with generateStaticParams; dynamicParams false rejects others.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">Set html lang, hreflang alternates, and use next/root-params in 16 to read the locale anywhere on the server.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do users switch language?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Link to the same path under another locale and store the choice in a cookie that Proxy reads before Accept-Language.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you read the locale in a deeply nested component?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In Next.js 16 import the getter from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next/root-params</code> (named after your segment, for example <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lang</code>) in a Server Component; otherwise pass it down as a prop.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you use domains instead of prefixes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, Proxy can read the host and rewrite to the matching <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[lang]</code> path, keeping clean URLs per domain.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where do translations for Client Components come from?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Pass the needed messages as props or through a Client Component context provider filled by the server.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Locale** | Language and region identifier |
| **[lang] segment** | Locale as the first route segment |
| **Accept-Language** | Browser language preference header |
| **hreflang** | Links to other language versions for search engines |

---
**Conclusion:** Internationalization in the App Router is assembled from general parts: a [lang] segment, locale detection in Proxy, server-side dictionaries and static params per locale. The lab showed detection by Accept-Language and prerendered locale pages. Libraries add formatting on top, but the routing structure stays the same.`,
    examples: [
      {
        label: "A locale segment, dictionaries and Proxy detection",
        tech: "tsx",
        runnable: false,
        code: `// app/[lang]/dictionaries.ts
import "server-only";
const dictionaries = {
  en: () => import("./dictionaries/en.json").then((m) => m.default),
  de: () => import("./dictionaries/de.json").then((m) => m.default),
};
export const getDictionary = (lang: "en" | "de") => dictionaries[lang]();

// app/[lang]/page.tsx
import { getDictionary } from "./dictionaries";
export function generateStaticParams() { return [{ lang: "en" }, { lang: "de" }]; }
export const dynamicParams = false;
export default async function Home({ params }: { params: Promise<{ lang: "en" | "de" }> }) {
  const dict = await getDictionary((await params).lang);
  return <h1>{dict.home.title}</h1>;
}

// proxy.ts
import { NextRequest, NextResponse } from "next/server";
const locales = ["en", "de"];
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (locales.some((l) => pathname === \`/\${l}\` || pathname.startsWith(\`/\${l}/\`))) return;
  const preferred = req.headers.get("accept-language")?.slice(0, 2);
  const lang = locales.includes(preferred ?? "") ? preferred : "en";
  return NextResponse.redirect(new URL(\`/\${lang}\${pathname}\`, req.url));
}
export const config = { matcher: ["/((?!_next|api|favicon.ico).*)"] };`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you handle instrumentation and observability in Next.js (instrumentation.ts)?",
    seoDescription: "instrumentation.ts register() runs once per server start and onRequestError reports server errors with their digest. Verified on Next 16.3.4.",
    description: `**Question presented to candidate:**
"How would you add tracing and error reporting to a Next.js app, and which hooks does Next.js give you for that?"

**What a strong answer should cover:**
- \`instrumentation.ts\` at the project root exports \`register()\`, called once when a server instance starts, before it handles requests; use it to set up OpenTelemetry or an error SDK.
- It also exports \`onRequestError(error, request, context)\`, called for errors during rendering, Route Handlers, Server Actions and Proxy, with the path and route type.
- The error digest matches the one sent to the browser, so client reports and server logs can be joined.
- \`instrumentation-client.ts\` runs in the browser before the app becomes interactive; only its synchronous top-level code is guaranteed to run before hydration.
- Next.js emits OpenTelemetry spans for rendering and fetch; \`@vercel/otel\` or the OpenTelemetry SDK exports them.

**Clarifying questions expected:**
- "Which vendor or collector?" — OpenTelemetry keeps you vendor-neutral.
- "Do you need to correlate browser errors with server logs?" — use the digest.

**Code / implementation expected:** Yes — both hooks, and client instrumentation.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic React and App Router familiarity.
**Difficulty:** Hard

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.3.4 docs shipped with the package and, in the **Verified** section, against real output from a build or a running server.

## 1. Why This Even Matters — A Story First

Observability is the flight recorder of an aircraft. register() switches the recorder on before takeoff, once. onRequestError is the incident log: every time something fails, it records what, where and when, with a reference number that matches the note the passengers were given (the digest shown in the browser).

## 2. The Core Idea

📌 **Interview term: register()** — the instrumentation.ts export Next.js calls once per server instance at startup.

📌 **Interview term: onRequestError** — the instrumentation.ts export Next.js calls with the error, request and route context whenever server code throws.

📌 **Interview term: OpenTelemetry** — an open standard for traces, metrics and logs that Next.js integrates with through spans.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 250" role="img" aria-label="The two server hooks and the client one. register(), onRequestError, instrumentation-client">
  <defs>
    <marker id="nx09ph6b-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">The two server hooks and the client one</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="24" y="48" width="174.66666666666666" height="118" rx="10"/>
    <circle class="d-box-accent" cx="40" cy="48" r="12"/>
    <text class="d-text d-accent" x="40" y="53" text-anchor="middle">1</text>
    <text class="d-text d-accent" x="111.33333333333333" y="82" text-anchor="middle">register()</text>
    <text class="d-sub" x="111.33333333333333" y="108" text-anchor="middle">once per server start</text>
    <text class="d-sub" x="111.33333333333333" y="130" text-anchor="middle">set up OTel or SDKs</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 201.66666666666666 107 L 239.66666666666666 107" marker-end="url(#nx09ph6b-arrow)"/>
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
    <text class="d-text" x="330" y="82" text-anchor="middle">onRequestError</text>
    <text class="d-sub" x="330" y="108" text-anchor="middle">every server error</text>
    <text class="d-sub" x="330" y="130" text-anchor="middle">message, digest, route</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 420.3333333333333 107 L 458.3333333333333 107" marker-end="url(#nx09ph6b-arrow)"/>
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
    <text class="d-text" x="548.6666666666666" y="82" text-anchor="middle">instrumentation-client</text>
    <text class="d-sub" x="548.6666666666666" y="108" text-anchor="middle">browser, before hydration</text>
    <text class="d-sub" x="548.6666666666666" y="130" text-anchor="middle">ran at 48 ms in the lab</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="2.1s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="188" width="612" height="44" rx="10"/>
    <text class="d-sub" x="330" y="215" text-anchor="middle">lab: register logged once for many requests; onRequestError got the error digest</text>
  </g>
</svg>

The hooks separate setup from reporting: initialize tooling once, then receive a structured record for every failure with a key to match it in the browser.

## 3. What each hook receives

| Hook | When | Useful for |
| :--- | :--- | :--- |
| \`register()\` | Once per server instance, before requests | OpenTelemetry setup, SDK init, warmups |
| \`onRequestError(err, request, context)\` | Any server error | Report with path, method, routePath, routeType, routerKind |
| \`instrumentation-client.ts\` | Browser, early | Analytics, error handlers, performance marks |
| \`useReportWebVitals\` | Browser, per metric | Core Web Vitals to analytics |

## 4. Tracing

Next.js creates spans for incoming requests, rendering and fetches. Install \`@vercel/otel\` (or the OpenTelemetry SDK) and call \`registerOTel({ serviceName })\` inside \`register()\`; the exporter sends spans to your collector. Guard Node-only SDKs with \`process.env.NEXT_RUNTIME === "nodejs"\`. Error UI for users is covered in [error.js](/interview-question/what-is-error-js-in-next-js-and-how-does-error-handling-work-in-the-app-router).

## 5. Verified — Hooks on next start (Next.js 16.3.4)

\`\`\`
instrumentation.ts exports register() and onRequestError(); the server handled many requests after starting
register() log lines: 1
  INSTRUMENTATION register() runtime=nodejs at 2026-09-23T06:41:23.974Z
onRequestError after GET /dashboard/boom:
  INSTRUMENTATION onRequestError {"message":"boom from a server component","digest":"1969163939","path":"/dashboard/boom","method":"GET","routePath":"/dashboard/boom","routeType":"render","routerKind":"App Router"}
next build output lines mentioning INSTRUMENTATION: 0
\`\`\`

Client instrumentation:

\`\`\`
instrumentation-client.ts (browser), recorded on /nav/s:
  ran at 48 ms after navigation start, before React had attached to the document (hydratedBefore: false)
\`\`\`

The digest reported by onRequestError is the same kind of value the browser receives in the error row (\`E{"digest":...}\`), which is how a support ticket with a digest can be traced to the full server error.

## 6. Common Pitfalls

- **Initializing SDKs in a layout.** They would run per render; use \`register()\`, which runs once.
- **Node-only SDKs in every runtime.** Check \`process.env.NEXT_RUNTIME\` before importing Node-specific packages.
- **Logging the error but not the digest.** The digest is the only link from a user report to the server error.
- **Async work in instrumentation-client.ts expected before hydration.** Only synchronous top-level code is guaranteed to run first.
- **Relying on the legacy experimental flag.** \`experimental.instrumentationHook\` is no longer needed; the file is picked up automatically.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">instrumentation.ts exports register(), called once per server instance before requests: the lab logged it once across many requests.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">onRequestError receives every server error with message, digest, path and route context.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;">The digest matches what the browser receives, so client reports can be joined with server logs.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;">instrumentation-client.ts runs in the browser before hydration: 48 ms after navigation start in the lab.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">For traces, set up OpenTelemetry (for example @vercel/otel) inside register().</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does register() run during next build?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The lab build printed no register() output; it ran when next start began serving. The docs describe it as running when a server instance starts.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does routeType tell you?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Whether the error came from rendering, a Route Handler, a Server Action or Proxy; the lab error was <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">render</code> in the App Router.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you send the error to a vendor?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Call the vendor SDK inside onRequestError (and initialize it in register()); most error-tracking SDKs provide a Next.js helper for both.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you correlate a browser error with a trace?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use the digest shown in error.tsx and propagate trace headers from the client; the server log and span carry the same identifiers.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **register()** | One-time server instrumentation setup |
| **onRequestError** | Hook for every server error |
| **Digest** | Error id shared by browser and server |
| **OpenTelemetry** | Standard for traces and metrics |

---
**Conclusion:** instrumentation.ts gives Next.js two clean hooks: register() to set up tracing and SDKs once per server, and onRequestError to receive every server error with context and a digest. The lab showed register running once, onRequestError capturing a render error with its route, and client instrumentation running before hydration.`,
    examples: [
      {
        label: "OpenTelemetry setup and error reporting",
        tech: "tsx",
        runnable: false,
        code: `// instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { registerOTel } = await import("@vercel/otel");
    registerOTel({ serviceName: "shop-web" });
  }
}

export async function onRequestError(
  err: unknown,
  request: { path: string; method: string },
  context: { routePath: string; routeType: string },
) {
  const e = err as Error & { digest?: string };
  await fetch("https://errors.example.com/ingest", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message: e.message, digest: e.digest, path: request.path, route: context.routePath, type: context.routeType }),
  });
}

// instrumentation-client.ts (browser)
performance.mark("app-init");
window.addEventListener("error", (event) => navigator.sendBeacon("/api/client-errors", String(event.message)));`,
      },
    ],
  },
];

export default augments;
