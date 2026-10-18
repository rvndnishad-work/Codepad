/**
 * Next.js ULTRA — batch 13: getting started and everyday APIs — create-next-app and the project structure,
 * layouts and nested layouts, usePathname/useSearchParams/useParams, next dev/build/start, metadata files
 * (favicon, icon, opengraph-image, manifest), next/form, cookies() and headers(), and static export.
 * Verified sections quote a Next.js 16.4.2 lab (create-next-app@16.4.2, next build, next start, curl, Playwright).
 */
import type { NextAugment } from "./nextjs-augments.types";

const augments: NextAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you create a new Next.js app, and what is in the project structure?",
    seoDescription: "Create a Next.js app with create-next-app and learn what every generated file does: app/, public/, next.config.ts, tsconfig. From a real 16.4.2 run.",
    description: `**Question presented to candidate:**
"You are starting a brand-new Next.js project today. Walk me through how you create it, and then explain what each folder and file in the generated project is for."

**What a strong answer should cover:**
- \`npx create-next-app@latest\` (or the pnpm, yarn and bun equivalents), the \`--yes\` shortcut for recommended defaults, and the Node.js 20.9 minimum.
- The defaults: TypeScript, Tailwind CSS, ESLint, App Router, Turbopack, the \`@/*\` import alias and an \`AGENTS.md\` file; recent versions also turn on Cache Components in \`next.config.ts\`.
- The \`app/\` folder is the router: \`layout.tsx\` (required root layout with html and body), \`page.tsx\` (the \`/\` route), \`globals.css\`, \`favicon.ico\`.
- \`public/\` for static files served from \`/\`, \`next.config.ts\` for framework settings, \`tsconfig.json\` with the \`@/*\` alias, \`next-env.d.ts\` and \`.next/\` as generated files that are not committed.
- The scripts \`dev\`, \`build\`, \`start\`, \`lint\` and what each does at a high level.

**Clarifying questions expected:**
- "Do we want the \`src/\` folder layout, and do we need Tailwind?" — both are create-next-app choices.
- "Is this a new app or are we adding Next.js to an existing React project?" — the second case is a manual install.

**Code / implementation expected:** Yes — the create command, plus a minimal root layout and page.`,
    answer: `**Target Audience:** Beginners preparing for Next.js interviews — no prior Next.js knowledge assumed, basic React helps.
**Difficulty:** Easy

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.4.2 docs shipped with the package and, in the **Verified** section, against a real run of \`create-next-app@16.4.2\`, \`next build\` and \`next start\` in a lab.

## 1. Why This Even Matters — A Story First

Imagine moving into a new flat. You could buy every pipe, socket and shelf yourself and spend a week assembling them, or you could get a flat where the kitchen, the wiring and the shelves are already in place, labelled, and you just start living there. \`create-next-app\` is the second option. One command gives you a working website with routing, styling, type checking and a development server already connected. The interview question is really two questions: can you get started quickly, and do you know what each of the "pre-installed rooms" is for, so you know where your own code should go?

## 2. The Core Idea

📌 **Interview term: create-next-app** — the official command-line tool that creates a new Next.js project from a template and installs its dependencies.

📌 **Interview term: Scaffolding** — generating the starting files of a project automatically, so you begin from a working app instead of an empty folder.

You run it with your package manager:

\`\`\`bash
npx create-next-app@latest my-app --yes   # npm
pnpm create next-app@latest my-app --yes  # pnpm
yarn create next-app@latest my-app --yes  # yarn
bun create next-app@latest my-app --yes   # bun
\`\`\`

Without \`--yes\`, it asks a few questions (TypeScript, linter, React Compiler, Tailwind, \`src/\` folder, App Router, Cache Components, import alias, AGENTS.md). With \`--yes\` it takes the recommended defaults. The 16.4.2 docs list those defaults as TypeScript, ESLint, Tailwind CSS, App Router, Turbopack and the \`@/*\` import alias, plus an \`AGENTS.md\` file. Next.js 16.4 needs Node.js 20.9 or newer.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 260" role="img" aria-label="What create-next-app did in the 16.4.2 lab. Choose options, copy template, install packages, initialize git">
  <defs>
    <marker id="nx13q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="360" y="24" text-anchor="middle">What create-next-app did in the 16.4.2 lab</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="48" width="126" height="124" rx="10"/>
    <text class="d-text" x="87" y="78" text-anchor="middle">1. Options</text>
    <text class="d-sub" x="87" y="106" text-anchor="middle">--yes skips the</text>
    <text class="d-sub" x="87" y="128" text-anchor="middle">questions and</text>
    <text class="d-sub" x="87" y="150" text-anchor="middle">uses defaults</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 154 110 L 202 110" marker-end="url(#nx13q1-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 154 110 L 202 110"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-muted" x="206" y="48" width="126" height="124" rx="10"/>
    <text class="d-text" x="269" y="78" text-anchor="middle">2. Template</text>
    <text class="d-sub" x="269" y="106" text-anchor="middle">template app-tw</text>
    <text class="d-sub" x="269" y="128" text-anchor="middle">app/, public/,</text>
    <text class="d-sub" x="269" y="150" text-anchor="middle">config files</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 336 110 L 384 110" marker-end="url(#nx13q1-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 336 110 L 384 110"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.7s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-muted" x="388" y="48" width="126" height="124" rx="10"/>
    <text class="d-text" x="451" y="78" text-anchor="middle">3. Install</text>
    <text class="d-sub" x="451" y="106" text-anchor="middle">next, react,</text>
    <text class="d-sub" x="451" y="128" text-anchor="middle">react-dom + dev</text>
    <text class="d-sub" x="451" y="150" text-anchor="middle">deps: 364 pkgs</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="2.1s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 518 110 L 566 110" marker-end="url(#nx13q1-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 518 110 L 566 110"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="2.5s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="570" y="48" width="126" height="124" rx="10"/>
    <text class="d-text d-accent" x="633" y="78" text-anchor="middle">4. Finish</text>
    <text class="d-sub" x="633" y="106" text-anchor="middle">route types</text>
    <text class="d-sub" x="633" y="128" text-anchor="middle">generated, git</text>
    <text class="d-sub" x="633" y="150" text-anchor="middle">repo created</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="2.9s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="196" width="672" height="44" rx="10"/>
    <text class="d-sub" x="360" y="223" text-anchor="middle">then: cd my-app and npm run dev, which serves http://localhost:3000</text>
  </g>
</svg>

The whole process is four steps; the only one that takes real time is installing packages, which took 39 seconds in the lab.

📌 **Interview term: App Router** — the router that turns folders inside \`app/\` into URLs; it is the default and recommended router. For the older alternative, see [App Router vs Pages Router](/interview-question/what-is-the-difference-between-the-app-router-and-the-pages-router).

📌 **Interview term: Turbopack** — the bundler (the tool that turns your source files into what the browser and server run) used by default in Next.js 16. More in [Turbopack vs Webpack](/interview-question/what-is-turbopack-in-next-js-and-how-does-it-compare-to-webpack).

## 3. The Project Structure, File by File

This is exactly what \`create-next-app@16.4.2 my-app --yes\` produced (node_modules and .git left out):

| Path | What it is | Do you edit it? |
| :--- | :--- | :--- |
| \`app/layout.tsx\` | The **root layout**: wraps every page, holds \`<html>\` and \`<body>\`, loads fonts and \`globals.css\`, exports \`metadata\` | Yes |
| \`app/page.tsx\` | The page for the URL \`/\` | Yes |
| \`app/globals.css\` | Global styles; starts with \`@import "tailwindcss";\` | Yes |
| \`app/favicon.ico\` | The browser tab icon, picked up automatically as a [metadata file](/interview-question/how-do-metadata-files-like-favicon-ico-icon-opengraph-image-and-manifest-work-in) | Replace it |
| \`public/\` | Static files served from the site root: \`public/next.svg\` is \`/next.svg\` | Yes |
| \`next.config.ts\` | Framework settings | Sometimes |
| \`package.json\` | Dependencies and the \`dev\`, \`build\`, \`start\`, \`lint\` scripts | Sometimes |
| \`tsconfig.json\` | TypeScript settings, including the \`@/*\` path alias | Rarely |
| \`eslint.config.mjs\` | Lint rules from \`eslint-config-next\` | Rarely |
| \`next-env.d.ts\` | Generated type references; git-ignored, do not edit | No |
| \`AGENTS.md\` | Instructions for AI coding agents: read the docs inside \`node_modules/next/dist/docs/\` | Optional |
| \`.gitignore\` | Ignores \`node_modules\`, \`.next/\`, \`out/\`, \`.env*\`, \`next-env.d.ts\` | Rarely |
| \`.next/\` | Build and dev output, created by \`next dev\` and \`next build\` | Never |

📌 **Interview term: Root layout** — the top \`layout.tsx\` in \`app/\`. It is required and must render \`<html>\` and \`<body>\`. See [layouts and nested layouts](/interview-question/what-are-layouts-in-next-js-and-how-do-nested-layouts-work).

📌 **Interview term: Import alias** — a shortcut such as \`@/components/Button\` instead of \`../../components/Button\`, configured by \`paths\` in \`tsconfig.json\`.

How URLs grow from here: a folder becomes a URL segment once it contains a \`page.tsx\`. So \`app/about/page.tsx\` serves \`/about\`, and \`app/blog/[slug]/page.tsx\` serves \`/blog/anything\`. The full rules are in [file-based routing](/interview-question/how-does-file-based-routing-work-in-the-next-js-app-router), and the other special file names (loading, error, not-found) are in [the special files](/interview-question/what-are-the-special-files-in-the-next-js-app-router-page-layout-loading-error).

### What 16.4.2 put in next.config.ts

The generated config was not empty:

\`\`\`ts
const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};
\`\`\`

So a fresh 16.4.2 project starts with [Cache Components](/interview-question/what-are-cache-components-in-next-js-16-and-how-does-the-use-cache-directive-wor) switched on (which changes how dynamic data must be wrapped in \`<Suspense>\`), Partial Prefetching (introduced in 16.3.0 according to its docs page, and it requires Cache Components), and Tailwind wired through a Turbopack loader. In the lab there was no \`postcss.config.mjs\`. Older tutorials that show an empty config and a PostCSS file describe earlier versions.

### The src/ variant

\`--src-dir\` moves your code into \`src/\`. Running \`create-next-app@16.4.2 src-app --yes --src-dir --empty\` produced \`src/app/layout.tsx\`, \`src/app/page.tsx\` and \`src/app/globals.css\`, with config files still at the root. Only where the app folder lives changes; nothing else.

## 4. Manual Installation (when not using the CLI)

You can also add Next.js to an empty folder by hand: install \`next\`, \`react\` and \`react-dom\`, add the scripts \`"dev": "next dev"\`, \`"build": "next build"\`, \`"start": "next start"\`, and create \`app/layout.tsx\` and \`app/page.tsx\`. A page without a root layout fails the build (see below), so the layout is not optional. What the three scripts actually do is covered in [next dev, next build and next start](/interview-question/what-happens-when-you-run-next-dev-next-build-and-next-start).

## 5. Verified — A Real create-next-app Run (Next.js 16.4.2)

The command and the parts of its log that matter (trimmed: blank lines and npm audit text removed):

\`\`\`
$ npx create-next-app@16.4.2 my-app --yes
Creating a new Next.js app in .../my-app.
Using npm.
Initializing project with template: app-tw
Installing dependencies:
- next
- react
- react-dom
Installing devDependencies:
- @tailwindcss/turbopack
- @types/node
- @types/react
- @types/react-dom
- eslint
- eslint-config-next
- tailwindcss
- typescript
added 364 packages, and audited 365 packages in 39s
Generating route types...
✓ Types generated successfully
Initialized a git repository.
Success! Created my-app at .../my-app
\`\`\`

The generated \`package.json\` pinned \`"next": "16.4.2"\`, \`"react": "19.3.0"\` and \`"react-dom": "19.3.0"\`, and \`node_modules\` weighed 489 MB on disk. The generated root layout used the global \`LayoutProps\` type helper and \`next/font/google\`:

\`\`\`tsx
export default function RootLayout({ children }: LayoutProps<"/">) {
\`\`\`

Building the untouched project (the 0/4 to 3/4 progress lines and blank lines removed):

\`\`\`
$ npx next build
▲ Next.js 16.4.2 (Turbopack)
✓ Running next.config.ts took 30ms
- Cache Components enabled
- Partial Prefetching enabled
  Creating an optimized production build ...
✓ Compiled successfully in 4.0s
  Running TypeScript ...
  Finished TypeScript in 2.5s ...
  Collecting page data using 3 workers ...
✓ Generating static pages using 3 workers (4/4) in 232ms
  Finalizing page optimization ...

Route (app)
┌ ○ /
└ ○ /_not-found

○  (Static)  prerendered as static content
\`\`\`

And what happens if you forget the root layout (a separate lab app with only \`app/page.tsx\`):

\`\`\`
> Build error occurred
Error: Turbopack build failed with 1 error:
./next/n13/labC-nolayout/app/page.tsx
Error: page.tsx doesn't have a root layout. To fix this error, make sure every page has a root layout.
\`\`\`

## 6. Common Pitfalls

- **Copying a tutorial written for an older version.** Pages Router folders (\`pages/_app.tsx\`), an empty \`next.config.js\` or a \`postcss.config.js\` are not what 16.4.2 generates. Check the version first.
- **Not noticing Cache Components is on.** A fresh 16.4.2 project has \`cacheComponents: true\`, so calling \`cookies()\` or an uncached \`fetch\` outside \`<Suspense>\` fails the build. That is expected behaviour, not a broken setup.
- **Committing generated files.** \`.next/\`, \`next-env.d.ts\` and \`node_modules/\` are in \`.gitignore\` for a reason; they are rebuilt on every machine.
- **Putting secrets in \`public/\`.** Everything there is downloadable by anyone at its URL.
- **Thinking every file in \`app/\` is a page.** Only \`page\` and \`route\` files create URLs; components can sit next to them safely.
- **Using an old Node version.** Next.js 16 needs Node.js 20.9 or newer.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Run <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">npx create-next-app@latest my-app --yes</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">npm run dev</code>; you get a working App Router app on localhost:3000.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The defaults:</strong> <span style="color:#f0e2c8;">TypeScript, Tailwind, ESLint, App Router, Turbopack, the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@/*</code> alias and AGENTS.md; in 16.4.2 also Cache Components in next.config.ts.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The structure:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">app/</code> is the router: a required root <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">layout.tsx</code> with html and body, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">page.tsx</code> for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">globals.css</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">favicon.ico</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The rest:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">public/</code> is served from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next.config.ts</code> holds settings, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.next/</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next-env.d.ts</code> are generated and git-ignored.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">Only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">page</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">route</code> files create URLs, and a page without a root layout fails the build.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you add a new page at /about?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Create <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">app/about/page.tsx</code> that default-exports a component. The folder name becomes the URL segment.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between public/ and app/?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">public/</code> files are served as-is at the site root, with no processing. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">app/</code> contains code that Next.js compiles and routes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is next-env.d.ts in .gitignore?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is regenerated by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next dev</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next build</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next typegen</code> and points at generated route types in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.next/</code>, so committing it only causes noise.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does --src-dir change?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It moves <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">app/</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">src/app/</code>. Config files and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">public/</code> stay at the project root; routing works exactly the same.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you add Next.js to an existing folder without the CLI?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: install <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">react</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">react-dom</code>, add the dev, build and start scripts, and create <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">app/layout.tsx</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">app/page.tsx</code>.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **create-next-app** | Official CLI that scaffolds and installs a new project |
| **Scaffolding** | Generating starter files automatically |
| **App Router** | Folder-based router in \`app/\`; the default |
| **Turbopack** | Default bundler in Next.js 16 |
| **Root layout** | Required top layout with html and body |
| **Import alias** | \`@/*\` shortcut path from tsconfig |

---
**Conclusion:** \`npx create-next-app@latest my-app --yes\` gives you a working App Router project in under a minute: \`app/\` holds the routes (a required root layout plus pages), \`public/\` holds static files, and a handful of config files set up TypeScript, ESLint, Tailwind and the framework itself. The 16.4.2 lab showed that the defaults have moved on from older tutorials — Cache Components and Partial Prefetching are switched on, Tailwind runs through a Turbopack loader, and an \`AGENTS.md\` is included — so the strong answer names the files and also knows which ones are generated and must not be edited or committed.`,
    examples: [
      {
        label: "Creating and running a new app",
        tech: "bash",
        runnable: false,
        code: `# Requires Node.js 20.9 or newer
node -v

# Create a project with the recommended defaults (no prompts)
npx create-next-app@latest my-app --yes

# Or choose options explicitly
npx create-next-app@latest my-app --ts --app --src-dir --no-tailwind --eslint --import-alias "@/*"

cd my-app
npm run dev      # next dev   -> http://localhost:3000, hot reload
npm run build    # next build -> optimized production build in .next/
npm run start    # next start -> serves that build`,
      },
      {
        label: "The two files every App Router app needs",
        tech: "tsx",
        runnable: false,
        code: `// app/layout.tsx — the root layout: required, and the only place for <html> and <body>
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "My App",
  description: "Built with Next.js",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

// app/page.tsx — the page for the URL "/"
export default function Home() {
  return <h1>Hello, Next.js!</h1>;
}

// app/about/page.tsx — a folder plus a page file makes the URL "/about"
export default function About() {
  return <h1>About us</h1>;
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are layouts in Next.js and how do nested layouts work?",
    seoDescription: "Next.js layouts wrap pages with shared UI and keep state across navigation; nested layouts stack by folder. Verified in a 16.4.2 lab with a browser.",
    description: `**Question presented to candidate:**
"In the Next.js App Router, what is a layout, how do layouts nest, and what actually happens to a layout when the user clicks between two pages that share it?"

**What a strong answer should cover:**
- A layout is a \`layout.tsx\` file whose component receives \`children\` and wraps every page in that folder and below it.
- The root layout in \`app/\` is required and must render \`<html>\` and \`<body>\`; nested layouts stack by folder (root > dashboard > settings > page).
- On client navigation, shared layouts are kept: they do not re-render or remount, so their state (and Client Components inside them) survives.
- Consequences: layouts cannot read \`searchParams\` and should not depend on the pathname; use a Client Component with \`usePathname\` or the page props instead. They cannot pass props to \`children\`.
- \`template.tsx\` is the alternative that remounts on every navigation; route groups and multiple root layouts change which layout applies.

**Clarifying questions expected:**
- "Should this UI keep its state between pages (a sidebar, a player) or reset (an animation, a form)?" — that is the layout versus template choice.
- "Do different sections need entirely different shells?" — route groups or multiple root layouts.

**Code / implementation expected:** Yes — a root layout plus one nested layout with two pages.`,
    answer: `**Target Audience:** Beginners preparing for Next.js interviews — assumes basic React (components, props, state).
**Difficulty:** Easy

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.4.2 docs shipped with the package and, in the **Verified** section, against a lab app built with \`next build\`, served with \`next start\` and driven by a real Chromium browser.

## 1. Why This Even Matters — A Story First

Think of a shopping mall. The building, the corridors and the information desk stay where they are; only the shop you walk into changes. You do not rebuild the mall every time you go from the shoe shop to the bookshop. A layout in Next.js is the mall: the header, the sidebar, the music player — the parts that stay. The page is the shop. Because the layout stays put while you move between pages, whatever is inside it (an open menu, a playing video, a typed search) is not lost. That one property explains almost every interview follow-up about layouts.

## 2. The Core Idea

📌 **Interview term: Layout** — a component exported from a \`layout.tsx\` file that receives \`children\` and wraps every page in its folder and all folders below it.

📌 **Interview term: Root layout** — the layout at the top of \`app/\`. It is required, and it must render the \`<html>\` and \`<body>\` tags.

📌 **Interview term: Route segment** — one folder in the URL path. \`/dashboard/settings\` has two segments, \`dashboard\` and \`settings\`; each can have its own layout.

A layout is just a React component with a \`children\` prop:

\`\`\`tsx
// app/dashboard/layout.tsx
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <section>
      <aside>Dashboard sidebar</aside>
      <div>{children}</div>
    </section>
  );
}
\`\`\`

\`children\` is filled in by Next.js with whatever comes next down the folder tree: a nested layout if there is one, otherwise the page (or a loading or error boundary, when those files exist). You never import a layout yourself; the file name and its folder are enough. The full list of special file names is in [the special files](/interview-question/what-are-the-special-files-in-the-next-js-app-router-page-layout-loading-error).

## 3. How Nesting Works

Layouts nest in the same order as folders. For \`app/dashboard/settings/page.tsx\`, Next.js renders:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 300" role="img" aria-label="Nested layouts for the URL /dashboard/settings. Root layout wraps dashboard layout, which wraps settings layout, which wraps the page">
  <text class="d-text" x="320" y="24" text-anchor="middle">Rendering /dashboard/settings</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-muted" x="20" y="44" width="600" height="240" rx="12"/>
    <text class="d-text" x="40" y="70">app/layout.tsx</text>
    <text class="d-sub" x="380" y="70">html, body, header</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-muted" x="50" y="90" width="540" height="180" rx="12"/>
    <text class="d-text" x="70" y="116">app/dashboard/layout.tsx</text>
    <text class="d-sub" x="380" y="116">sidebar, counter</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-muted" x="80" y="136" width="480" height="120" rx="12"/>
    <text class="d-text" x="100" y="162">app/dashboard/settings/layout.tsx</text>
    <text class="d-sub" x="430" y="162">tabs</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="110" y="182" width="420" height="58" rx="10"/>
    <text class="d-text d-accent" x="320" y="208" text-anchor="middle">app/dashboard/settings/page.tsx</text>
    <text class="d-sub" x="320" y="228" text-anchor="middle">the only part unique to this URL</text>
  </g>
</svg>

Each layer only knows about its own \`children\`. Adding \`app/dashboard/layout.tsx\` affects \`/dashboard\`, \`/dashboard/settings\`, \`/dashboard/reports\` and anything else under \`dashboard/\`, but nothing outside it.

| File | Wraps |
| :--- | :--- |
| \`app/layout.tsx\` | Every route in the app |
| \`app/dashboard/layout.tsx\` | \`/dashboard\` and all its sub-routes |
| \`app/dashboard/settings/layout.tsx\` | \`/dashboard/settings\` and below |
| \`app/dashboard/settings/page.tsx\` | Only \`/dashboard/settings\` |

📌 **Interview term: Partial rendering** — on client-side navigation, only the segments that change are rendered again; shared layouts above them are kept as they are.

## 4. What Happens When You Navigate

This is the part interviewers care about. When the user clicks a \`<Link>\` from \`/dashboard/reports\` to \`/dashboard/settings\`, both URLs share the root and dashboard layouts. Next.js asks the server only for the part that differs, and the browser keeps the shared layouts mounted:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 260" role="img" aria-label="Client navigation from reports to settings. Link click, server renders only the changed segment, browser keeps shared layouts">
  <defs>
    <marker id="nx13q2nav-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="360" y="24" text-anchor="middle">Client navigation: /dashboard/reports to /dashboard/settings</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="48" width="186.7" height="124" rx="10"/>
    <text class="d-text" x="117.3" y="78" text-anchor="middle">Link clicked</text>
    <text class="d-sub" x="117.3" y="106" text-anchor="middle">same document,</text>
    <text class="d-sub" x="117.3" y="128" text-anchor="middle">no full reload</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 214.7 110 L 262.7 110" marker-end="url(#nx13q2nav-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 214.7 110 L 262.7 110"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-muted" x="266.7" y="48" width="186.7" height="124" rx="10"/>
    <text class="d-text" x="360" y="78" text-anchor="middle">Server renders</text>
    <text class="d-sub" x="360" y="106" text-anchor="middle">SettingsLayout</text>
    <text class="d-sub" x="360" y="128" text-anchor="middle">settings page</text>
    <text class="d-sub" x="360" y="150" text-anchor="middle">nothing above</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 457.3 110 L 505.3 110" marker-end="url(#nx13q2nav-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 457.3 110 L 505.3 110"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.7s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="509.3" y="48" width="186.7" height="124" rx="10"/>
    <text class="d-text d-accent" x="602.7" y="78" text-anchor="middle">Browser swaps</text>
    <text class="d-sub" x="602.7" y="106" text-anchor="middle">root, dashboard kept</text>
    <text class="d-sub" x="602.7" y="128" text-anchor="middle">counter stays at 2</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="2.1s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="196" width="672" height="44" rx="10"/>
    <text class="d-sub" x="360" y="223" text-anchor="middle">lab server log for this click: only SettingsLayout and the settings page rendered</text>
  </g>
</svg>

The browser lab below confirms both halves: the server log shows only the settings layout and page rendering, and a counter inside the dashboard layout keeps its value. How the click itself becomes a client-side navigation is covered in [client-side navigation](/interview-question/how-does-client-side-navigation-work-in-next-js-next-link-and-userouter).

Because layouts stay mounted, three rules follow:

- **Layouts do not receive \`searchParams\`.** A layout that is not re-rendered would show stale query values. Read them in the page (\`searchParams\` prop) or in a Client Component with \`useSearchParams\`. See [reading the current URL](/interview-question/how-do-you-read-the-current-url-in-a-next-js-client-component-usepathname-usesea).
- **Layouts should not depend on the pathname.** For an "active link" style, put a small Client Component that calls \`usePathname()\` inside the layout (example 2).
- **Layouts cannot pass props to \`children\`.** If the layout and the page both need the same user, fetch it in both; \`fetch\` calls are deduplicated and React \`cache\` can deduplicate other calls. See [request memoization](/interview-question/what-is-request-memoization-in-next-js).

Layouts do receive \`params\` (for dynamic segments above or at their level), as a Promise you \`await\`. In 16.4 you can type them with the global \`LayoutProps<"/dashboard">\` helper, which \`next dev\`, \`next build\` and \`next typegen\` generate.

📌 **Interview term: Template** — a \`template.tsx\` file that also wraps \`children\`, but gets a new instance on every navigation, so its state resets. Full comparison: [layout.js vs template.js](/interview-question/what-is-the-difference-between-layout-js-and-template-js-in-next-js).

## 5. Variations You Should Know

| Situation | Tool |
| :--- | :--- |
| Give a group of routes a shared layout without changing URLs | Route group folder such as \`app/(shop)/layout.tsx\` — see [route groups](/interview-question/what-are-route-groups-in-next-js-and-how-do-you-use-them) |
| Completely different shells (marketing site vs app) | Multiple root layouts, one per route group; moving between them is a full page load |
| Show two independent areas in one layout | Parallel routes (\`@slot\` folders), which arrive as extra layout props |
| Reset state or replay an animation on every page | \`template.tsx\` |
| Per-section \`<title>\` and description | \`export const metadata\` in the layout or page, not a manual \`<head>\` |

## 6. Verified — Layout Persistence in a Browser (Next.js 16.4.2)

Lab app: root layout, \`app/dashboard/layout.tsx\` with a client counter, \`app/dashboard/template.tsx\` with a second counter, a nested \`app/dashboard/settings/layout.tsx\`, and three dynamic pages (each calls \`await connection()\` and logs when it renders). Chromium clicked the layout counter twice and the template counter once, then navigated with \`<Link>\`:

\`\`\`
on /dashboard after clicks: layout clicks: 2 | template clicks: 1
on /dashboard/reports:      layout clicks: 2 | template clicks: 0 | window marker: kept
on /dashboard/settings:     layout clicks: 2 | template clicks: 0 | window marker: kept
nesting on /dashboard/settings: root > dashboard > template > settings
\`\`\`

The layout counter survived both navigations; the template counter reset to 0; the \`window\` marker shows no full page load happened. The server log during that browser session (first a full load of \`/dashboard\`, then the two client navigations):

\`\`\`
[render] RootLayout
[render] DashboardLayout
[render] /dashboard page
[render] /dashboard/reports page
[render] SettingsLayout
[render] /dashboard/settings page
\`\`\`

On the two client navigations only the reports page, then the settings layout and page rendered; the root and dashboard layouts did not run again. A direct \`curl\` of \`/dashboard/settings\` (a fresh full request) rendered every layer:

\`\`\`
[render] RootLayout
[render] DashboardLayout
[render] SettingsLayout
[render] /dashboard/settings page
\`\`\`

## 7. Common Pitfalls

- **Expecting a layout to show the current query string.** Layouts get no \`searchParams\`; use the page or a Client Component.
- **Putting \`<head>\`, \`<title>\` or \`<meta>\` tags in the root layout by hand.** Use the [Metadata API](/interview-question/how-does-the-metadata-api-work-in-next-js-static-and-generatemetadata) instead.
- **Trying to pass data from layout to page through \`children\`.** It does not work; fetch in both places and rely on deduplication.
- **Using a layout when you want a reset.** Entry animations or per-page forms belong in \`template.tsx\`.
- **Slow data in a layout blocks the whole section.** \`loading.tsx\` sits below the layout, so it cannot cover the layout itself; wrap slow parts of the layout in their own \`<Suspense>\`.
- **Forgetting the root layout.** A page without one fails \`next build\` with "page.tsx doesn't have a root layout".

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">A layout is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">layout.tsx</code> component that receives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">children</code> and wraps every page in its folder and below.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How nesting works:</strong> <span style="color:#f0e2c8;">Layouts stack by folder: root layout (required, with html and body) &gt; dashboard layout &gt; settings layout &gt; page.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The key behaviour:</strong> <span style="color:#f0e2c8;">On client navigation shared layouts are kept, not re-rendered; only changed segments render, so layout state survives.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The consequences:</strong> <span style="color:#f0e2c8;">Layouts get no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">searchParams</code>, should not depend on pathname, and cannot pass props to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">children</code>; use a Client Component with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">usePathname</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The alternative:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">template.tsx</code> wraps like a layout but remounts on every navigation, which resets state.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a layout read the current URL?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not directly on the server: it receives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">params</code> but not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">searchParams</code>. A Client Component inside it can call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">usePathname</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useSearchParams</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens when you navigate between two different root layouts?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A full page load, because the html and body element itself changes. Within one root layout navigation is client-side.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you share data between a layout and its page?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Fetch it in both. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fetch</code> is deduplicated per request, and React <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cache</code> dedupes other functions such as database calls.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does loading.tsx not show while the layout is loading?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">loading.tsx</code> wraps the page below the layout, so slow work in the layout itself needs its own <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Suspense</code> boundary.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you give /shop and /cart a shared layout without a /shop prefix in the URL?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Put them in a route group such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">app/(store)/</code> with its own <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">layout.tsx</code>; the parentheses are left out of the URL.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Layout** | Component in layout.tsx wrapping its folder |
| **Root layout** | Required top layout with html and body |
| **Route segment** | One folder of the URL path |
| **Partial rendering** | Only changed segments render on navigation |
| **Template** | Like a layout but remounts on each navigation |

---
**Conclusion:** A layout is a \`layout.tsx\` component that wraps every page in its folder, and layouts nest by folder from the required root layout down to the page. Their defining behaviour is that they persist: on client navigation Next.js renders only the segments that changed, so shared layouts keep their state — the lab showed a layout counter surviving two navigations while a template counter reset, and the server rendering only the new segment. That persistence is also why layouts get no \`searchParams\`, should not depend on the pathname, and cannot pass props to their children.`,
    examples: [
      {
        label: "Root layout, a nested dashboard layout and its pages",
        tech: "tsx",
        runnable: false,
        code: `// app/layout.tsx — root layout: required, wraps every route
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header>My Shop</header>
        {children}
      </body>
    </html>
  );
}

// app/dashboard/layout.tsx — wraps /dashboard and everything below it
import DashboardNav from "./DashboardNav";

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <section style={{ display: "flex", gap: 24 }}>
      <DashboardNav />
      <main>{children}</main>
    </section>
  );
}

// app/dashboard/page.tsx — URL /dashboard
export default function DashboardHome() {
  return <h1>Overview</h1>;
}

// app/dashboard/settings/page.tsx — URL /dashboard/settings
// Rendered as: RootLayout > DashboardLayout > SettingsPage
export default function SettingsPage() {
  return <h1>Settings</h1>;
}`,
      },
      {
        label: "Active nav link in a layout (Client Component)",
        tech: "tsx",
        runnable: false,
        code: `// app/dashboard/DashboardNav.tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/settings", label: "Settings" },
];

export default function DashboardNav() {
  // Layouts do not re-render on navigation, but this Client Component does,
  // so it always sees the current pathname.
  const pathname = usePathname();
  return (
    <nav>
      {links.map((l) => (
        <Link key={l.href} href={l.href} aria-current={pathname === l.href ? "page" : undefined}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you read the current URL in a Next.js Client Component (usePathname, useSearchParams, useParams)?",
    seoDescription: "usePathname, useSearchParams and useParams read the URL in Next.js Client Components. Return values, the Suspense rule and build errors, from a 16.4.2 lab.",
    description: `**Question presented to candidate:**
"You are building a product listing page in the App Router. Inside a Client Component you need the current path, the query string and the dynamic route values. Which hooks do you use, what does each return, and what goes wrong if you are careless with them?"

**What a strong answer should cover:**
- All three come from \`next/navigation\` and only work in Client Components (\`'use client'\`).
- \`usePathname()\` returns the path string without the query; \`useSearchParams()\` returns a read-only \`URLSearchParams\` (\`get\`, \`getAll\`, \`has\`); \`useParams()\` returns the dynamic segments, with arrays for catch-all routes and \`{}\` when there are none.
- They update on client navigation, which is why they work inside layouts where server props would go stale.
- On a prerendered route, \`useSearchParams\` cannot know the query at build time, so the component must sit inside \`<Suspense>\` or the build fails; with Cache Components the same applies to \`usePathname\` and \`useParams\` for params not covered by \`generateStaticParams\`.
- In a Server Component use the page \`params\` and \`searchParams\` props instead; to change the query, build a new \`URLSearchParams\` and call \`router.push\`/\`replace\` or render a \`Link\`.

**Clarifying questions expected:**
- "Is the page prerendered or rendered per request?" — it decides whether a Suspense boundary is required.
- "Should a filter change add a history entry?" — \`push\` versus \`replace\`.

**Code / implementation expected:** Yes — a Client Component reading the three values, and updating one query parameter.`,
    answer: `**Target Audience:** Beginners preparing for Next.js interviews — assumes basic React hooks and the idea of Server vs Client Components.
**Difficulty:** Easy

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.4.2 docs shipped with the package and, in the **Verified** section, against lab builds, \`curl\` and a real Chromium browser.

## 1. Why This Even Matters — A Story First

A URL is like a parcel label: the street address (the path), the flat number written into the address (the dynamic part, like which product), and a sticky note on the side ("leave with neighbour", the query string). A delivery driver who reads the label once at the depot and never looks again will deliver the wrong parcel after the route changes. In Next.js, server-rendered layouts are that driver: they render once and are kept during navigation. Client Components can re-read the label every time it changes. The three hooks in this question are how a Client Component reads each part of the label, and the interview traps are mostly about when that label is not yet known.

## 2. The Core Idea

📌 **Interview term: Pathname** — the path part of the URL, without the domain and without the query string: \`/shop/shoes/air-max\`.

📌 **Interview term: Search params (query string)** — the key-value pairs after \`?\`: \`color=red&size=42\`.

📌 **Interview term: Dynamic params** — the values filling square-bracket folders such as \`app/shop/[cat]/[item]\`: \`{ cat: "shoes", item: "air-max" }\`. See [dynamic routes and catch-all segments](/interview-question/what-are-dynamic-routes-and-catch-all-segments-in-next-js).

<svg class="iq-diagram" width="100%" viewBox="0 0 720 260" role="img" aria-label="One URL split into the three hooks. usePathname gives the path, useParams gives the dynamic segments, useSearchParams gives the query">
  <defs>
    <marker id="nx13q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="360" y="24" text-anchor="middle">/shop/shoes/air-max?color=red&size=42</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="48" width="186.7" height="124" rx="10"/>
    <text class="d-text" x="117.3" y="78" text-anchor="middle">usePathname()</text>
    <text class="d-sub" x="117.3" y="106" text-anchor="middle">/shop/shoes/air-max</text>
    <text class="d-sub" x="117.3" y="128" text-anchor="middle">a plain string</text>
    <text class="d-sub" x="117.3" y="150" text-anchor="middle">no query string</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-muted" x="266.7" y="48" width="186.7" height="124" rx="10"/>
    <text class="d-text" x="360" y="78" text-anchor="middle">useParams()</text>
    <text class="d-sub" x="360" y="106" text-anchor="middle">cat: shoes</text>
    <text class="d-sub" x="360" y="128" text-anchor="middle">item: air-max</text>
    <text class="d-sub" x="360" y="150" text-anchor="middle">from [cat]/[item]</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="509.3" y="48" width="186.7" height="124" rx="10"/>
    <text class="d-text d-accent" x="602.7" y="78" text-anchor="middle">useSearchParams()</text>
    <text class="d-sub" x="602.7" y="106" text-anchor="middle">get color: red</text>
    <text class="d-sub" x="602.7" y="128" text-anchor="middle">get size: 42</text>
    <text class="d-sub" x="602.7" y="150" text-anchor="middle">read-only</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="196" width="672" height="44" rx="10"/>
    <text class="d-sub" x="360" y="223" text-anchor="middle">all three live in next/navigation and re-render the component on client navigation</text>
  </g>
</svg>

Each hook reads one of those three parts, and because they are hooks they re-run whenever the URL changes through client navigation.

All three are imported from \`next/navigation\` and only work in a Client Component, a file that starts with \`'use client'\` ([when you need it](/interview-question/what-is-the-use-client-directive-and-when-do-you-need-it)):

\`\`\`tsx
"use client";
import { usePathname, useSearchParams, useParams } from "next/navigation";
\`\`\`

## 3. What Each Hook Returns

| Hook | URL \`/shop/shoes/air-max?color=red&size=42&size=43\` | Notes |
| :--- | :--- | :--- |
| \`usePathname()\` | \`"/shop/shoes/air-max"\` | A string; never includes \`?...\` |
| \`useSearchParams()\` | read-only \`URLSearchParams\` | \`.get("color")\` is \`"red"\`, \`.getAll("size")\` is \`["42","43"]\`, \`.get("x")\` is \`null\` |
| \`useParams()\` | \`{ cat: "shoes", item: "air-max" }\` | Catch-all \`[...slug]\` gives an array; no dynamic segments gives \`{}\` |

📌 **Interview term: URLSearchParams** — the standard browser object for query strings. The one Next.js returns is read-only: there is no \`set\` on it, so to change the query you copy it into \`new URLSearchParams(...)\`, change the copy, and navigate.

\`useParams\` accepts a type argument for convenience: \`useParams<{ cat: string; item: string }>()\`. In the Pages Router these hooks can return \`null\` before the router is ready; in the App Router they always have values.

## 4. Why Client Components, and the Server Alternative

Reading the URL inside a Server Component is not supported on purpose. Shared layouts are not re-rendered on navigation (see [layouts and nested layouts](/interview-question/what-are-layouts-in-next-js-and-how-do-nested-layouts-work)), so a server-read URL in a layout would go stale. A Client Component re-renders on the client with the new URL, so it is always current.

In a page, which is a Server Component, you usually do not need the hooks at all:

\`\`\`tsx
// app/shop/[cat]/page.tsx
export default async function Page({ params, searchParams }: PageProps<"/shop/[cat]">) {
  const { cat } = await params;
  const { sort } = await searchParams;
  // fetch data on the server, then pass values to Client Components as props
}
\`\`\`

Both props are Promises since Next.js 15 and synchronous access was removed in 16 ([why they are Promises](/interview-question/app-router-15-why-are-params-and-searchparams-now-promises)). A good rule: fetch data from the page props on the server, and use the hooks for interactive UI such as active links, filter buttons and breadcrumbs. A full search-and-pagination design is in [URL search params in the App Router](/interview-question/how-do-you-implement-search-filtering-and-pagination-with-url-search-params-in-t).

## 5. Changing the URL

The hooks only read. To change the query string, build a new one and navigate with \`useRouter\` or render a \`Link\`:

\`\`\`tsx
const next = new URLSearchParams(searchParams.toString());
next.set("color", "blue");
router.replace(\`\${pathname}?\${next.toString()}\`); // replace: no new history entry
\`\`\`

Use \`router.push\` when the Back button should return to the previous filter, \`replace\` when it should not. Both are client-side navigations, covered in [next/link and useRouter](/interview-question/how-does-client-side-navigation-work-in-next-js-next-link-and-userouter).

## 6. The Suspense Rule (the Real Interview Trap)

📌 **Interview term: Prerendering** — rendering a route to HTML at build time, before any visitor exists.

At build time there is no visitor, so there is no query string. If a prerendered page contains a Client Component that calls \`useSearchParams\`, Next.js cannot fill it in. The fix is to wrap that component in \`<Suspense>\`: the fallback goes into the static HTML, and the real component renders in the browser.

| Situation (16.4.2) | \`useSearchParams\` | \`usePathname\` / \`useParams\` |
| :--- | :--- | :--- |
| Prerendered route, no \`<Suspense>\` | Build error | Fine for static routes and params from \`generateStaticParams\` |
| Prerendered route, inside \`<Suspense>\` | Fallback in HTML, real value after hydration | Same |
| Dynamically rendered route | Value available in the server HTML | Same |
| Cache Components on, dynamic param not in \`generateStaticParams\` | Build error without \`<Suspense>\` | Build error without \`<Suspense>\` |

The fourth row matters because \`create-next-app@16.4.2\` enables Cache Components by default ([what Cache Components are](/interview-question/what-are-cache-components-in-next-js-16-and-how-does-the-use-cache-directive-wor)). In development routes render on demand, so the missing boundary often only shows up in \`next build\`.

## 7. Verified — Hooks in a Real Browser and Build (Next.js 16.4.2)

A lab Client Component printed all three values as JSON. It was placed inside \`<Suspense>\` in \`app/shop/layout.tsx\` (route \`app/shop/[cat]/[item]\`, with \`shoes/air-max\` from \`generateStaticParams\`) and, without Suspense, in a dynamic catch-all page \`app/docs/[...slug]\`. Chromium against \`next start\`:

\`\`\`
initial       {"pathname":"/shop/shoes/air-max","search":"color=red&size=42&size=43","color":"red","sizes":["42","43"],"params":{"cat":"shoes","item":"air-max"}}
after replace {"pathname":"/shop/shoes/air-max","search":"color=blue&size=42&size=43","color":"blue","sizes":["42","43"],"params":{"cat":"shoes","item":"air-max"}}
after <Link>  {"pathname":"/shop/boots/chelsea","search":"color=black","color":"black","sizes":[],"params":{"cat":"boots","item":"chelsea"}}
catch-all     {"pathname":"/docs/getting-started/install","search":"","color":null,"sizes":[],"params":{"slug":["getting-started","install"]}}
\`\`\`

The component lives in a layout, yet every value updated after \`router.replace\` and after a \`<Link>\` to a different product. What the server sent before JavaScript ran:

\`\`\`
$ curl "/shop/shoes/air-max?color=red"   (prerendered page, UrlInfo inside <Suspense> in the layout)
id="url-layout-fallback">loading url...

$ curl "/docs/getting-started/install?color=red"   (dynamic page, no Suspense)
id="url-docs">{"pathname":"/docs/getting-started/install","search":"color=red","color":"red","sizes":[],"params":{"slug":["getting-started","install"]}}
\`\`\`

A static page with \`useSearchParams\` and no Suspense, without Cache Components (stack trace removed):

\`\`\`
⨯ useSearchParams() should be wrapped in a suspense boundary at page "/". Read more: https://nextjs.org/docs/messages/missing-suspense-with-csr-bailout
Error occurred prerendering page "/". Read more: https://nextjs.org/docs/messages/prerender-error
Export encountered an error on /page: /, exiting the build.
\`\`\`

The same page with \`cacheComponents: true\`:

\`\`\`
Error: Route "/": Next.js encountered URL data \`useSearchParams()\` in a Client Component outside of \`<Suspense>\`.

This blocks prerendering because the value is only available at runtime.

Ways to fix this:
  - [stream] Wrap the component in \`<Suspense fallback={...}>\` so the hook value streams in after prerendering
  - [block] Set \`export const instant = false\` to allow a blocking route
\`\`\`

And \`usePathname()\` with Cache Components on a route \`app/p/[id]\` that has no \`generateStaticParams\`:

\`\`\`
Error: Route "/p/[id]": Next.js encountered URL data \`usePathname()\` in a Client Component outside of \`<Suspense>\`.
\`\`\`

## 8. Common Pitfalls

- **Calling the hooks in a Server Component.** They need \`'use client'\`; in pages use the \`params\` and \`searchParams\` props.
- **Trying \`searchParams.set(...)\`.** The returned object is read-only; copy it into \`new URLSearchParams\` first.
- **No \`<Suspense>\` around \`useSearchParams\` on a static page.** Works in \`next dev\`, fails \`next build\`.
- **Using \`get\` for repeated keys.** \`?size=42&size=43\` needs \`getAll("size")\`; \`get\` returns only the first.
- **Expecting \`usePathname\` to include the query.** It never does; combine it with \`searchParams.toString()\` when you need the full URL.
- **Rewrites and proxy.** If a prerendered page is reached through a rewrite, the docs warn \`usePathname\` can cause a hydration mismatch, because the server rendered the source path.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Three Client Component hooks from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next/navigation</code>: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">usePathname</code> for the path, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useSearchParams</code> for the query, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useParams</code> for dynamic segments.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. What they return:</strong> <span style="color:#f0e2c8;">A string; a read-only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">URLSearchParams</code> (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">getAll</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">has</code>); an object like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ cat, item }</code>, arrays for catch-all, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{}</code> if none.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why hooks:</strong> <span style="color:#f0e2c8;">Layouts are not re-rendered on navigation, so server-read URLs would go stale; the hooks re-render on every client navigation.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The server alternative:</strong> <span style="color:#f0e2c8;">In a page, read the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">params</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">searchParams</code> props (Promises) and pass values down as props.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">On a prerendered route wrap <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useSearchParams</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Suspense</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next build</code> fails; with Cache Components that also applies to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">usePathname</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useParams</code> for unknown params.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you change one query parameter?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Copy it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new URLSearchParams(searchParams.toString())</code>, call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">router.replace</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">router.push</code> with the pathname plus the new string, or render a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Link</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does it work in next dev but fail in next build?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Dev renders every route on demand with a real request. The build prerenders without a visitor, so the query is unknown and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Suspense</code> boundary is required.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is in the HTML when useSearchParams is inside Suspense on a static page?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The fallback. The lab curl showed only the loading text; the real values appeared after hydration in the browser.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you read the URL in a Server Component layout?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">You do not; layouts get <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">params</code> but no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">searchParams</code> or pathname. Put a small Client Component in the layout instead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does useParams return for app/docs/[...slug] at /docs/a/b?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ slug: ["a", "b"] }</code>: catch-all segments become arrays of strings.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Pathname** | The path without the query string |
| **Search params** | The key-value pairs after the question mark |
| **Dynamic params** | Values of square-bracket folders |
| **URLSearchParams** | Standard query-string object; read-only from the hook |
| **Prerendering** | Rendering HTML at build time, with no visitor yet |

---
**Conclusion:** In a Client Component, \`usePathname\` gives the path string, \`useSearchParams\` a read-only \`URLSearchParams\` for the query, and \`useParams\` the dynamic segments, all from \`next/navigation\`, and all re-render on client navigation — which is why they stay correct even inside persistent layouts, as the browser lab showed. In Server Component pages use the \`params\` and \`searchParams\` props instead. The detail that separates a strong answer is prerendering: the query is unknown at build time, so \`useSearchParams\` needs a \`<Suspense>\` boundary on static routes, and with Cache Components (on by default in a fresh 16.4.2 app) the same rule extends to \`usePathname\` and \`useParams\` for params that are only known at request time.`,
    examples: [
      {
        label: "Reading all three parts of the URL",
        tech: "tsx",
        runnable: false,
        code: `// app/shop/[category]/[item]/ItemInfo.tsx
"use client";
import { useParams, usePathname, useSearchParams } from "next/navigation";

export default function ItemInfo() {
  const pathname = usePathname();         // "/shop/shoes/air-max"
  const searchParams = useSearchParams(); // read-only URLSearchParams for "?color=red&size=42"
  const params = useParams<{ category: string; item: string }>(); // { category: "shoes", item: "air-max" }

  return (
    <dl>
      <dt>Path</dt><dd>{pathname}</dd>
      <dt>Colour</dt><dd>{searchParams.get("color") ?? "any"}</dd>
      <dt>Sizes</dt><dd>{searchParams.getAll("size").join(", ") || "none"}</dd>
      <dt>Item</dt><dd>{params.item} in {params.category}</dd>
    </dl>
  );
}`,
      },
      {
        label: "Updating a query parameter and wrapping the hook in Suspense",
        tech: "tsx",
        runnable: false,
        code: `// app/shop/SortButtons.tsx
"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function SortButtons() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setSort(sort: "asc" | "desc") {
    const next = new URLSearchParams(searchParams.toString()); // copy: the hook value is read-only
    next.set("sort", sort);
    router.replace(\`\${pathname}?\${next.toString()}\`);
  }

  return (
    <div>
      <button onClick={() => setSort("asc")}>Price up</button>
      <button onClick={() => setSort("desc")}>Price down</button>
    </div>
  );
}

// app/shop/layout.tsx — Server Component
import { Suspense } from "react";
import SortButtons from "./SortButtons";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <section>
      {/* Lets the rest of the route be prerendered; the buttons fill in on the client */}
      <Suspense fallback={<div>Loading filters...</div>}>
        <SortButtons />
      </Suspense>
      {children}
    </section>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What happens when you run next dev, next build and next start?",
    seoDescription: "next dev compiles on demand with hot reload, next build makes an optimized production build in .next, next start serves it. Compared in a 16.4.2 lab.",
    description: `**Question presented to candidate:**
"A new teammate asks why the app is fast after deployment but the first page load on their laptop takes seconds, and why their change does not show up on the staging server until someone rebuilds. Explain what next dev, next build and next start each do."

**What a strong answer should cover:**
- \`next dev\`: a development server that compiles routes on demand with Turbopack, hot-reloads changes, shows detailed errors, sets \`NODE_ENV=development\`, sends \`Cache-Control: no-store\` and writes to \`.next/dev\`.
- \`next build\`: compiles and minifies for production, runs TypeScript checking, prerenders static routes, and prints a route table with symbols (static, SSG, partial prerender, dynamic).
- \`next start\`: a production Node.js server that serves the existing \`.next\` build; it does not compile, so code changes need a new build, and it fails if no build exists.
- Static pages built ahead of time are served from the prerendered output (with cache headers), dynamic ones are rendered per request.
- Practical details: default port 3000, \`-p\`/\`PORT\`, \`--webpack\`, \`next build\` and \`next dev\` can run side by side because dev uses \`.next/dev\`.

**Clarifying questions expected:**
- "How is the app deployed: a Node server, a container, static hosting or a platform?" — \`next start\` only applies to a Node server.
- "Is the slow page static or dynamic in the build output?" — that tells you what production does with it.

**Code / implementation expected:** Optional — the commands and a page showing the mode.`,
    answer: `**Target Audience:** Beginners preparing for Next.js interviews — no prior Next.js knowledge assumed.
**Difficulty:** Easy

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.4.2 docs shipped with the package and, in the **Verified** section, against a real \`create-next-app@16.4.2\` project run under all three commands and probed with \`curl\`.

## 1. Why This Even Matters — A Story First

A restaurant has two modes. During recipe testing, the chef cooks each dish only when someone orders it, tastes it, changes the salt, and cooks it again — slow per plate, but every change is visible immediately. Before opening night, the kitchen preps: sauces made, desserts plated in advance, the menu fixed. Then service starts and plates go out fast, but changing a recipe means prepping again. \`next dev\` is recipe testing, \`next build\` is the prep, and \`next start\` is service. Most confusion ("why is it slow locally", "why did my change not appear") comes from mixing up these modes.

## 2. The Core Idea

📌 **Interview term: Development server** — \`next dev\`, a server tuned for fast feedback: it compiles each route the first time you visit it and recompiles when files change.

📌 **Interview term: Hot Module Replacement (HMR)** — updating the running app in the browser after you save a file, without a full reload and often without losing component state.

📌 **Interview term: Production build** — the output of \`next build\`: optimized, minified code plus prerendered pages, written to \`.next/\`.

📌 **Interview term: Production server** — \`next start\`, a Node.js server that serves the production build and never compiles anything.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 260" role="img" aria-label="next dev compiles on demand, next build produces the .next folder, next start serves that build">
  <defs>
    <marker id="nx13q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="360" y="24" text-anchor="middle">Three commands, two very different servers</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="48" width="186.7" height="124" rx="10"/>
    <text class="d-text" x="117.3" y="78" text-anchor="middle">next dev</text>
    <text class="d-sub" x="117.3" y="106" text-anchor="middle">compiles on request</text>
    <text class="d-sub" x="117.3" y="128" text-anchor="middle">hot reload, no-store</text>
    <text class="d-sub" x="117.3" y="150" text-anchor="middle">writes .next/dev</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 214.7 110 L 262.7 110" marker-end="url(#nx13q4-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 214.7 110 L 262.7 110"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="266.7" y="48" width="186.7" height="124" rx="10"/>
    <text class="d-text d-accent" x="360" y="78" text-anchor="middle">next build</text>
    <text class="d-sub" x="360" y="106" text-anchor="middle">compile + type-check</text>
    <text class="d-sub" x="360" y="128" text-anchor="middle">prerender static</text>
    <text class="d-sub" x="360" y="150" text-anchor="middle">writes .next/</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 457.3 110 L 505.3 110" marker-end="url(#nx13q4-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 457.3 110 L 505.3 110"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.7s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-muted" x="509.3" y="48" width="186.7" height="124" rx="10"/>
    <text class="d-text" x="602.7" y="78" text-anchor="middle">next start</text>
    <text class="d-sub" x="602.7" y="106" text-anchor="middle">serves .next/ only</text>
    <text class="d-sub" x="602.7" y="128" text-anchor="middle">static from cache</text>
    <text class="d-sub" x="602.7" y="150" text-anchor="middle">no recompiling</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="2.1s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="196" width="672" height="44" rx="10"/>
    <text class="d-sub" x="360" y="223" text-anchor="middle">lab: an edit showed up at once under next dev, and never under next start until a rebuild</text>
  </g>
</svg>

The arrow from build to start is the key dependency: \`next start\` can only serve what \`next build\` produced.

The package.json scripts created by \`create-next-app\` map one to one: \`"dev": "next dev"\`, \`"build": "next build"\`, \`"start": "next start"\` (see [creating a new app](/interview-question/how-do-you-create-a-new-next-js-app-and-what-is-in-the-project-structure)). Running \`next\` with no command is an alias for \`next dev\`.

## 3. next dev

- **On-demand compilation.** Nothing is compiled up front; a route compiles on its first request. That is why the first visit is slow and later visits are fast.
- **Turbopack by default** in Next.js 16; \`--webpack\` switches back ([Turbopack vs Webpack](/interview-question/what-is-turbopack-in-next-js-and-how-does-it-compare-to-webpack)).
- **Fresh renders.** Pages are rendered on every request, and responses carry \`Cache-Control: no-store\`, so you always see current code and data. Caching that will exist in production is not a reliable thing to test here.
- **Developer help.** Error overlay, readable stack traces, warnings. \`process.env.NODE_ENV\` is \`"development"\`.
- **Separate output folder.** The 16.4.2 docs say development output goes to \`.next/dev\`, so \`next dev\` and \`next build\` can run at the same time without conflict — the lab did exactly that.
- **Side effects you may notice.** It generates route types (for \`PageProps\`/\`LayoutProps\`) and, in 16.4.2, wrote an \`AGENTS.md\` file (the log said \`Set agentRules: false in next.config to disable\`).

Options: \`-p\`/\`--port\` (default 3000, or the \`PORT\` env var, which cannot be set in \`.env\`), \`-H\` for hostname, \`--experimental-https\` for a self-signed local certificate.

## 4. next build

📌 **Interview term: Prerendering** — rendering a route to HTML at build time, so requests can be answered from a file.

\`next build\` does, in order (as its own log prints): load \`next.config.ts\`, compile with Turbopack, run TypeScript type checking, collect page data, generate static pages, finalize. Then it prints the route table:

| Symbol | Meaning |
| :--- | :--- |
| \`○\` | Static: prerendered as static content |
| \`●\` | SSG: prerendered using \`generateStaticParams\` |
| \`◐\` | Partial Prerender: static shell plus streamed dynamic parts |
| \`ƒ\` | Dynamic: server-rendered on demand |

That table is the best single answer to "is this page fast in production?". The ideas behind it are in [static vs dynamic rendering](/interview-question/what-is-the-difference-between-static-and-dynamic-rendering-in-the-next-js-app-r) and [what makes a route dynamic](/interview-question/what-makes-a-route-dynamic-in-the-next-js-app-router). A build also fails on type errors and on prerender errors (for example a missing \`<Suspense>\` boundary), which is why CI usually runs \`next build\` and not just \`tsc\`. Its output can be changed with \`output: "standalone"\` ([standalone builds](/interview-question/what-is-the-output-standalone-build-in-next-js-and-when-do-you-use-it)) or \`output: "export"\` for static hosting ([static export](/interview-question/what-is-static-export-output-export-in-next-js-and-what-does-it-not-support)).

## 5. next start

- Reads \`.next/\` and serves it on port 3000 (or \`-p\`). It needs a build first; without one it exits with "Could not find a production build".
- Static routes are answered from the prerendered output; the lab saw \`x-nextjs-cache: HIT\` and \`Cache-Control: s-maxage=31536000\`. Dynamic routes run your code per request.
- \`NODE_ENV\` is \`"production"\`, code is minified, and there is no file watching: editing a source file changes nothing until you rebuild and restart.
- It is the server you use for self-hosting on a VM or in a container ([deployment options](/interview-question/how-do-you-deploy-a-next-js-app-vercel-vs-self-hosted)). Platforms such as Vercel run the build and serve it their own way, so you do not call \`next start\` there.

| | next dev | next build | next start |
| :--- | :--- | :--- | :--- |
| Purpose | Write code | Prepare a release | Serve a release |
| Compiles | Per route, on demand | Everything, once | Never |
| NODE_ENV | development | production | production |
| Reacts to file edits | Yes (HMR) | No | No |
| Output folder | \`.next/dev\` | \`.next/\` | reads \`.next/\` |
| Static pages | Rendered per request | Written to disk | Served from disk |

## 6. Verified — One App Under All Three Commands (Next.js 16.4.2)

Lab: the untouched \`create-next-app@16.4.2\` project plus \`app/env/page.tsx\`, which prints \`NODE_ENV\` and a hard-coded \`version=1\`.

\`next start\` before any build:

\`\`\`
$ next start   (no build yet)
▲ Next.js 16.4.2
- Local:         http://localhost:4144
- Network:       http://192.0.2.2:4144
✓ Ready in 151ms
✓ Running next.config.ts took 31ms
Error: Could not find a production build in the '.next' directory. Try building your app with 'next build' before starting the production server. https://nextjs.org/docs/messages/production-start-no-build-id
exit=1
\`\`\`

\`next dev\`, two requests, then editing the file to \`version=2\` (curl timings from the lab machine):

\`\`\`
GET /env #1 -> 200 in 2.863116s
id="env">NODE_ENV=development version=1
GET /env #2 -> 200 in 0.074321s
id="env">NODE_ENV=development version=1
--- response headers in dev (trimmed)
HTTP/1.1 200 OK
Cache-Control: no-store
after editing the file, GET /env -> 200
id="env">NODE_ENV=development version=2
--- .next after next dev
dev
\`\`\`

The dev server log for those requests:

\`\`\`
 GET /env 200 in 382ms (next.js: 220ms, application-code: 162ms)
 GET /env 200 in 40ms (next.js: 2ms, application-code: 38ms)
 HEAD /env 200 in 27ms (next.js: 1.2ms, application-code: 26ms)
✓ Compiled in 12ms
 GET /env 200 in 31ms (next.js: 1.6ms, application-code: 29ms)
\`\`\`

\`next build\`, run while the dev server was still up (progress lines and blank lines removed):

\`\`\`
▲ Next.js 16.4.2 (Turbopack)
✓ Running next.config.ts took 28ms
- Cache Components enabled
- Partial Prefetching enabled
  Creating an optimized production build ...
✓ Compiled successfully in 5.3s
  Running TypeScript ...
  Finished TypeScript in 2.5s ...
  Collecting page data using 3 workers ...
  Finalizing page optimization ...

Route (app)
┌ ○ /
├ ○ /_not-found
└ ○ /env

○  (Static)  prerendered as static content

dev server still answering during/after build: 200
\`\`\`

\`next start\` after the build, then editing the file again:

\`\`\`
GET /env #1 -> 200 in 0.053180s
id="env">NODE_ENV=production version=1
GET /env #2 -> 200 in 0.018877s
id="env">NODE_ENV=production version=1
--- response headers in production (trimmed)
HTTP/1.1 200 OK
x-nextjs-cache: HIT
x-nextjs-prerender: 1
x-nextjs-prerender: 1
Cache-Control: s-maxage=31536000
after editing the file, GET /env -> 200
id="env">NODE_ENV=production version=1
\`\`\`

The production server printed no per-request log lines, unlike \`next dev\`. On disk, \`.next/dev\` was 45 MB and \`.next/server\` 5.3 MB. The timings are from one lab machine and only show the order of magnitude, not a benchmark.

## 7. Common Pitfalls

- **Judging performance in \`next dev\`.** On-demand compilation and no caching make it slower by design; measure on \`next build\` plus \`next start\`.
- **Testing caching in dev.** Dev sends \`no-store\` and re-renders; ISR and static caching only behave as in production after a build.
- **Editing code on a server running \`next start\`.** Nothing changes until you rebuild and restart, as the lab showed.
- **Deploying without running the build first.** \`next start\` refuses to start without \`.next/\`.
- **Expecting \`PORT\` in \`.env\` to work.** The docs note it cannot, because the server starts before env files are loaded; use \`-p\` or a real environment variable.
- **Forgetting \`--\` with npm.** \`npm run dev -p 4000\` does not pass the flag; \`npm run dev -- -p 4000\` does.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next dev</code> is the development server, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next build</code> creates the optimized production build in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.next/</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next start</code> serves that build.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. next dev:</strong> <span style="color:#f0e2c8;">Compiles each route on its first request with Turbopack, hot-reloads edits, sends <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">no-store</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NODE_ENV=development</code>, output in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.next/dev</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. next build:</strong> <span style="color:#f0e2c8;">Compiles, type-checks and prerenders, then prints a route table: static, SSG, partial prerender or dynamic per route.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. next start:</strong> <span style="color:#f0e2c8;">A production Node.js server that serves <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.next/</code>; static pages come from the prerendered output, dynamic ones render per request.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next start</code> never recompiles: no build means it exits, and source edits need a new build.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the first page load slow in development?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Dev compiles routes on demand, on the first request; in the lab the first request took about 2.9 s and the next one 0.07 s.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can I test ISR or caching with next dev?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not reliably. Dev renders every request and sends <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Cache-Control: no-store</code>; test caching on a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next build</code> plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next start</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do I need next start on Vercel?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. The platform runs <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next build</code> and serves the output itself; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next start</code> is for self-hosting on a Node server or container.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do I change the port?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-p 4000</code> or the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PORT</code> environment variable; with npm run, write <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">npm run dev -- -p 4000</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can next dev and next build run at the same time?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Since Next.js 16 dev writes to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.next/dev</code> while the build writes to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.next/</code>, so they do not overwrite each other.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Development server** | next dev: compiles on demand, hot reloads |
| **HMR** | Updating the running app after a file save |
| **Production build** | Optimized output of next build in .next/ |
| **Production server** | next start: serves the build, never compiles |
| **Prerendering** | Producing HTML at build time |

---
**Conclusion:** \`next dev\` is a feedback loop — compile on demand, hot reload, \`no-store\`, \`NODE_ENV=development\`, output in \`.next/dev\`. \`next build\` is the release step — compile, type-check and prerender, ending with a route table that tells you which pages are static and which are dynamic. \`next start\` serves that build in production mode and nothing else, so it fails without a build and ignores source edits. The lab showed each of those behaviours on the same app, which is the cleanest way to explain why local first loads are slow and why a deployed server needs a rebuild to pick up changes.`,
    examples: [
      {
        label: "The three commands and their common options",
        tech: "bash",
        runnable: false,
        code: `# Development: compile on demand, hot reload, detailed errors. Output goes to .next/dev
next dev                 # http://localhost:3000
next dev -p 4000         # another port (or PORT=4000 next dev)
next dev --webpack       # use Webpack instead of the default Turbopack

# Production build: compile, type-check, prerender static routes, write .next/
next build
next build --debug-prerender   # readable stack traces for prerender errors (do not deploy)

# Production server: serve the existing build (fails if there is none)
next start -p 3000

# With npm scripts, pass flags after --
npm run dev -- -p 4000`,
      },
      {
        label: "A page that shows which mode it runs in",
        tech: "tsx",
        runnable: false,
        code: `// app/env/page.tsx
export default function EnvPage() {
  // "development" under next dev, "production" under next build + next start
  return <p>NODE_ENV={process.env.NODE_ENV}</p>;
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do metadata files like favicon.ico, icon, opengraph-image and manifest work in Next.js?",
    seoDescription: "Drop favicon.ico, icon.png, opengraph-image or manifest.ts into app/ and Next.js serves them and writes the head tags. Checked with curl on 16.4.2.",
    description: `**Question presented to candidate:**
"Our site needs a favicon, a home-screen icon, a preview image when links are shared on social media, and a web app manifest. How do you add these in a Next.js App Router project, and what does Next.js do with the files?"

**What a strong answer should cover:**
- Metadata files are special file names in \`app/\`: \`favicon.ico\` (root only), \`icon\` and \`apple-icon\`, \`opengraph-image\` and \`twitter-image\` (with optional \`.alt.txt\`), \`manifest.json\`/\`.webmanifest\` or \`manifest.ts\`, plus \`sitemap\` and \`robots\`.
- Each can be a static file or code (\`.tsx\`/\`.ts\`) that generates it, for example with \`ImageResponse\` from \`next/og\`.
- Next.js serves each file at a URL and writes the matching \`<head>\` tags automatically (rel icon, apple-touch-icon, og:image with type, width, height and alt, rel manifest), adding a content hash to the URL.
- Files apply to their route segment and below; a deeper \`opengraph-image\` overrides a parent one.
- Generated files are special Route Handlers, prerendered and cached by default unless they use request data; set \`metadataBase\` so image URLs are absolute.

**Clarifying questions expected:**
- "Does each page need its own share image, or is one per site enough?" — static file versus generated per segment.
- "Do we want the site installable as a PWA?" — then the manifest needs proper icons.

**Code / implementation expected:** Yes — a file layout and one generated image or manifest.`,
    answer: `**Target Audience:** Beginners preparing for Next.js interviews — basic HTML (what the head element is) helps.
**Difficulty:** Easy

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.4.2 docs shipped with the package and, in the **Verified** section, against a lab app built with \`next build\`, served with \`next start\` and inspected with \`curl\`.

## 1. Why This Even Matters — A Story First

When you post a link in a group chat, a little card appears with a picture and a title. When you bookmark a site, a tiny logo shows in the tab. When you "add to home screen" on a phone, an app-like icon appears. None of that comes from the page content; it comes from small files and tags in the page head that browsers and chat apps read. Without a framework you would create each image, copy it into a public folder, and hand-write a \`<link>\` or \`<meta>\` tag with the right type and size for each. Next.js turns this into "put a file with the right name in the right folder". The interview question checks whether you know those names, what Next.js generates from them, and the two or three details that commonly break link previews.

## 2. The Core Idea

📌 **Interview term: Metadata files** — specially named files in the \`app/\` directory (such as \`favicon.ico\`, \`icon.png\`, \`opengraph-image.tsx\`, \`manifest.ts\`) that Next.js serves at a URL and links from the page head automatically.

📌 **Interview term: Open Graph image** — the preview picture social networks and chat apps show for a shared link, announced with \`<meta property="og:image">\`.

📌 **Interview term: Web app manifest** — a JSON file describing the app (name, colours, icons, start URL) that browsers use when the site is installed, announced with \`<link rel="manifest">\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 238" role="img" aria-label="A metadata file such as icon.png is detected, served at its own URL, and linked from the head of every page in its segment">
  <defs>
    <marker id="nx13q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="360" y="24" text-anchor="middle">One file in app/, three things Next.js does</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="48" width="186.7" height="102" rx="10"/>
    <text class="d-text" x="117.3" y="78" text-anchor="middle">You add a file</text>
    <text class="d-sub" x="117.3" y="106" text-anchor="middle">app/icon.png</text>
    <text class="d-sub" x="117.3" y="128" text-anchor="middle">or app/icon.tsx</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 214.7 99 L 262.7 99" marker-end="url(#nx13q5-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 214.7 99 L 262.7 99"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-muted" x="266.7" y="48" width="186.7" height="102" rx="10"/>
    <text class="d-text" x="360" y="78" text-anchor="middle">Next.js serves it</text>
    <text class="d-sub" x="360" y="106" text-anchor="middle">/icon.png?icon.3w-rd...</text>
    <text class="d-sub" x="360" y="128" text-anchor="middle">content type set</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 457.3 99 L 505.3 99" marker-end="url(#nx13q5-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 457.3 99 L 505.3 99"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.7s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="509.3" y="48" width="186.7" height="102" rx="10"/>
    <text class="d-text d-accent" x="602.7" y="78" text-anchor="middle">Head tag written</text>
    <text class="d-sub" x="602.7" y="106" text-anchor="middle">link rel icon</text>
    <text class="d-sub" x="602.7" y="128" text-anchor="middle">sizes 32x32, image/png</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="2.1s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="174" width="672" height="44" rx="10"/>
    <text class="d-sub" x="360" y="201" text-anchor="middle">no import and no manual link tag: the file name and folder decide everything</text>
  </g>
</svg>

The same three steps apply to every metadata file; only the file name changes which head tags are written.

## 3. The File Conventions

| File | Static types | Generated with code | Where | Head output |
| :--- | :--- | :--- | :--- | :--- |
| \`favicon\` | \`.ico\` | Not possible | \`app/\` root only | \`<link rel="icon">\` |
| \`icon\` | \`.ico .jpg .jpeg .png .svg\` | \`.js .ts .tsx\` | Any segment | \`<link rel="icon" sizes type>\` |
| \`apple-icon\` | \`.jpg .jpeg .png\` | \`.js .ts .tsx\` | Any segment | \`<link rel="apple-touch-icon">\` |
| \`opengraph-image\` | \`.jpg .jpeg .png .gif\` | \`.js .ts .tsx\` | Any segment | \`og:image\` with type, width, height |
| \`twitter-image\` | \`.jpg .jpeg .png .gif\` | \`.js .ts .tsx\` | Any segment | \`twitter:image\` tags |
| \`*.alt.txt\` | \`.txt\` | — | Next to a static image | \`og:image:alt\` / \`twitter:image:alt\` |
| \`manifest\` | \`.json .webmanifest\` | \`.js .ts\` | \`app/\` root | \`<link rel="manifest">\` |
| \`sitemap\`, \`robots\` | \`.xml\`, \`.txt\` | \`.js .ts\` | \`app/\` root | Not head tags; see [sitemap.ts and robots.ts](/interview-question/how-do-sitemap-ts-and-robots-ts-work-in-next-js) |

Useful details from the 16.4.2 docs:

- Several icons: number them, \`icon1.png\`, \`icon2.png\`; they sort lexically.
- Share-image size limits: \`opengraph-image\` at most 8 MB and \`twitter-image\` at most 5 MB, otherwise the build fails.
- Generated images and icons receive \`params\` (a Promise since 16.0.0) when they sit under a dynamic segment, so \`app/blog/[slug]/opengraph-image.tsx\` can draw each post title.

📌 **Interview term: ImageResponse** — the \`next/og\` class that turns JSX and inline styles into a PNG; the usual way to generate icons and share images in code. The deep dive is in [dynamic Open Graph images](/interview-question/how-do-you-implement-dynamic-open-graph-images-in-next-js-imageresponse).

## 4. Static File or Code?

Use a **static file** when the image never changes (the logo, one site-wide preview). Use **code** when the image depends on data (one preview per blog post, an icon with a version badge). A generated file exports a default function plus optional \`alt\`, \`size\` and \`contentType\`; those exports become the \`og:image:alt\`, \`og:image:width\`/\`height\` and \`og:image:type\` tags.

📌 **Interview term: Special Route Handler** — what a generated metadata file really is: a [Route Handler](/interview-question/what-are-route-handlers-in-next-js-and-how-do-they-differ-from-pages-api-routes) with a fixed URL. It is prerendered and cached by default, unless it uses request data (cookies, headers) or uncached fetches.

## 5. Inheritance and metadataBase

Metadata files apply to their segment and everything below it. In the lab, \`/about\` had its own \`opengraph-image.png\`, so its og:image pointed at \`/about/opengraph-image.png\`, while it still inherited the root favicon and icons. This merging is the file-based half of the [Metadata API](/interview-question/how-does-the-metadata-api-work-in-next-js-static-and-generatemetadata); the other half is the \`metadata\` export and \`generateMetadata\`.

📌 **Interview term: metadataBase** — a URL set in the root \`metadata\` export that turns relative image paths into absolute ones. Social crawlers need absolute URLs. Without it, the lab build warned and baked \`http://localhost:3000\` into the static pages — a link preview that can never load. Always set \`metadataBase: new URL("https://your-domain")\`. Why previews matter for search and sharing is covered in [Next.js SEO](/interview-question/how-does-next-js-handle-seo-compared-to-a-client-rendered-spa).

## 6. Verified — Head Tags and Responses (Next.js 16.4.2)

Lab files: \`app/favicon.ico\` (copied from create-next-app), \`app/icon.png\` (32x32), \`app/apple-icon.png\` (180x180), \`app/opengraph-image.tsx\` (ImageResponse, \`alt = "Lab B home"\`), \`app/manifest.ts\`, and \`app/about/opengraph-image.png\` (1200x630) with an \`opengraph-image.alt.txt\` written by \`echo\`. The build route table listed the metadata routes (other app routes removed):

\`\`\`
├ ○ /about/opengraph-image.png
├ ○ /apple-icon.png
├ ○ /icon.png
├ ○ /manifest.webmanifest
├ ○ /opengraph-image
\`\`\`

There was no \`/favicon.ico\` row, neither in this lab nor in the fresh create-next-app build, although the file was served. The build also printed:

\`\`\`
⚠ metadataBase property in metadata export is not set for resolving social open graph or twitter images, using "http://localhost:3000". See https://nextjs.org/docs/app/api-reference/functions/generate-metadata#metadatabase
\`\`\`

Head tags on \`/\` and \`/about\` (only metadata-file tags shown; the server ran on port 4141, yet the prerendered pages say 3000):

\`\`\`
GET / (head, metadata tags only)
<link rel="manifest" href="/manifest.webmanifest"/>
<meta property="og:image" content="http://localhost:3000/opengraph-image?a676b1e237780788"/>
<meta property="og:image:type" content="image/png"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta property="og:image:alt" content="Lab B home"/>
<meta name="twitter:card" content="summary_large_image"/>
<link rel="icon" href="/favicon.ico?favicon.117ezoe8m31dk.ico" sizes="48x48" type="image/x-icon"/>
<link rel="icon" href="/icon.png?icon.3w-rdbsyxbfki.png" sizes="32x32" type="image/png"/>
<link rel="apple-touch-icon" href="/apple-icon.png?apple-icon.187csccayb78o.png" sizes="180x180" type="image/png"/>

GET /about
<meta property="og:image" content="http://localhost:3000/about/opengraph-image.png?opengraph-image.3j_r1j2l_20st.png"/>
<meta property="og:image:type" content="image/png"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta property="og:image:alt" content="A blue banner for the About page
<link rel="icon" href="/favicon.ico?favicon.117ezoe8m31dk.ico" sizes="48x48" type="image/x-icon"/>
<link rel="icon" href="/icon.png?icon.3w-rdbsyxbfki.png" sizes="32x32" type="image/png"/>
\`\`\`

Three things the lab showed. The \`.alt.txt\` content is used verbatim, so the trailing newline \`echo\` added ended up inside the attribute (the line break above is real). \`twitter:image\` tags were also emitted from the Open Graph image although there was no \`twitter-image\` file (lines omitted above). And the favicon tag said \`sizes="48x48"\`, read from the file, not the \`sizes="any"\` shown in the docs example. The files themselves:

\`\`\`
== /favicon.ico            HTTP/1.1 200 OK   content-type: image/x-icon
== /icon.png               HTTP/1.1 200 OK   content-type: image/png
== /apple-icon.png         HTTP/1.1 200 OK   content-type: image/png
== /opengraph-image        HTTP/1.1 200 OK   content-type: image/png
== /manifest.webmanifest   HTTP/1.1 200 OK   content-type: application/manifest+json
all of them: cache-control: public, max-age=0, must-revalidate
\`\`\`

(Reformatted onto one line each from \`curl -sI\`.) The \`/opengraph-image\` response was a real 1200 x 630 PNG, and the manifest body was the object returned by \`manifest.ts\`, as JSON. Note the cache header: even the hashed URLs were served with \`max-age=0, must-revalidate\` by \`next start\`, so browsers revalidate them; long-lived caching would need a CDN rule. Whether Facebook, X or Slack actually render the card could not be tested here; that needs a public URL and their preview tools.

## 7. Common Pitfalls

- **No \`metadataBase\`.** Share images point at \`localhost:3000\` in the static HTML, and previews break in production.
- **Trailing newline in \`.alt.txt\`.** The file is used verbatim; save it without a final newline.
- **A favicon outside the root.** \`favicon.ico\` only works in \`app/\`; use \`icon\` for per-section icons.
- **Generating a favicon in code.** Not supported; generate \`icon\` instead and keep a static \`favicon.ico\`.
- **Keeping an old \`<link rel="icon">\` in a custom head or \`public/favicon.ico\` as well.** Two sources of truth; pick the file convention.
- **Proxy intercepting metadata routes.** If \`proxy.ts\` matches everything, exclude these paths in its matcher (the docs call this out).

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Put specially named files in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">app/</code>, such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">favicon.ico</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">icon.png</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">opengraph-image.tsx</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">manifest.ts</code>; Next.js serves them and writes the head tags.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Static or code:</strong> <span style="color:#f0e2c8;">Each can be an image or JSON file, or code that generates it, usually <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ImageResponse</code> from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next/og</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. What gets generated:</strong> <span style="color:#f0e2c8;">rel icon and apple-touch-icon with sizes and type, og:image with type, width, height and alt, and rel manifest; URLs get a content hash.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Scope:</strong> <span style="color:#f0e2c8;">Files apply to their segment and below; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">about/opengraph-image.png</code> overrides the root one for /about. Favicon and manifest live in the root only.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">Set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">metadataBase</code>: without it the lab baked <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">http://localhost:3000</code> into og:image, which breaks link previews.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you give every blog post its own share image?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">app/blog/[slug]/opengraph-image.tsx</code>; it receives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">params</code> (a Promise) and returns an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ImageResponse</code> drawing that post.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Are generated images created on every request?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. They are special Route Handlers, prerendered and cached by default, unless they use request data or uncached fetches.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you set alt text for a static Open Graph image?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">opengraph-image.alt.txt</code> next to it; its contents become <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">og:image:alt</code>, verbatim, so avoid a trailing newline.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do you still need a twitter-image file?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only for a different image. In the lab Next.js also emitted <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">twitter:image</code> tags from the Open Graph image.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between these files and the metadata export?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">metadata</code> export and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">generateMetadata</code> set titles and descriptions in code; metadata files are the file-based part for images and the manifest. Both merge into one head.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Metadata files** | Specially named files in app/ that become head tags |
| **Open Graph image** | Preview picture for shared links |
| **Web app manifest** | JSON that describes an installable web app |
| **ImageResponse** | next/og helper turning JSX into a PNG |
| **Special Route Handler** | A generated metadata file with a fixed URL |
| **metadataBase** | Base URL that makes image links absolute |

---
**Conclusion:** Metadata files let you add icons, share images and a manifest by naming files in \`app/\`: Next.js serves each at its own URL (with a content hash), detects type and size, and writes the right \`<link>\` and \`<meta>\` tags into every page of that segment, with deeper segments overriding parents. Each file can be static or generated in code with \`ImageResponse\`, in which case it is a cached special Route Handler. The lab confirmed the generated tags and also the practical traps: without \`metadataBase\` the prerendered pages pointed at \`localhost:3000\`, and an \`.alt.txt\` file is copied verbatim, trailing newline included.`,
    examples: [
      {
        label: "Static metadata files in app/",
        tech: "bash",
        runnable: false,
        code: `app/
├── favicon.ico                  # root only   -> <link rel="icon" href="/favicon.ico?...">
├── icon.png                     # any segment -> <link rel="icon" sizes="32x32" type="image/png">
├── apple-icon.png               #             -> <link rel="apple-touch-icon" sizes="180x180">
├── opengraph-image.tsx          # generated   -> og:image + twitter:image tags for "/"
├── manifest.ts                  # root only   -> <link rel="manifest" href="/manifest.webmanifest">
├── layout.tsx                   # set metadataBase here so image URLs are absolute
└── about/
    ├── page.tsx
    ├── opengraph-image.png      # overrides the root image for /about
    └── opengraph-image.alt.txt  # -> og:image:alt (save it without a trailing newline)`,
      },
      {
        label: "Generated Open Graph image and web manifest",
        tech: "tsx",
        runnable: false,
        code: `// app/opengraph-image.tsx — generated at build time unless it uses request data
import { ImageResponse } from "next/og";

export const alt = "Acme — tools for builders";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 96,
          background: "#0b1220",
          color: "white",
        }}
      >
        Acme
      </div>
    ),
    { ...size }
  );
}

// app/manifest.ts — served as /manifest.webmanifest
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Acme",
    short_name: "Acme",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1e5ac8",
    icons: [{ src: "/icon.png", sizes: "32x32", type: "image/png" }],
  };
}

// app/layout.tsx (excerpt) — makes og:image an absolute URL on your real domain
import type { Metadata } from "next";
export const metadata: Metadata = {
  metadataBase: new URL("https://acme.example"),
  title: "Acme",
};`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the next/form Form component and when would you use it?",
    seoDescription: "next/form extends the HTML form: a string action becomes a GET to a URL with search params, prefetched and client-side. JS on and off tested on 16.4.2.",
    description: `**Question presented to candidate:**
"We have a search box on every page that sends the user to a results page with the query in the URL. Someone suggested using the Form component from next/form instead of a plain form. What does it do differently, and when would you not use it?"

**What a strong answer should cover:**
- \`<Form>\` from \`next/form\` extends the HTML \`<form>\`; it shipped with Next.js 15.
- With a string \`action\` it behaves like a GET form: input values become search params (\`/search?query=abc\`), but Next.js performs a client-side navigation instead of a full reload, keeping layouts and client state.
- It prefetches the target route's shared UI (layouts, \`loading.js\`) when the form is visible, so loading UI appears instantly on submit; props \`replace\`, \`scroll\`, \`prefetch\`.
- Progressive enhancement: without JavaScript it is a normal GET form, so search still works.
- With a function \`action\` (a Server Action) it is just a React form for mutations: no prefetch, \`replace\` and \`scroll\` ignored.
- Not for: \`method="post"\` to an external URL, \`target\`, \`encType\`, or file inputs with a string action; use a plain \`<form>\`.

**Clarifying questions expected:**
- "Is the form navigating to a URL (search, filter) or changing data (create, update)?" — string action versus Server Action.
- "Should each search create a history entry?" — the \`replace\` prop.

**Code / implementation expected:** Yes — a search form with a string action and a results page reading \`searchParams\`.`,
    answer: `**Target Audience:** Beginners preparing for Next.js interviews — assumes you know what an HTML form and a URL query string are.
**Difficulty:** Easy

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.4.2 docs shipped with the package and, in the **Verified** section, against a lab app served by \`next start\` and submitted in a real Chromium browser with JavaScript on and off.

## 1. Why This Even Matters — A Story First

A plain HTML search form is like ringing a hotel reception to ask for the restaurant menu: they hang up, and a porter brings you a whole new copy of the hotel brochure, menu included. It works every time, even with no smartphone, but it is slow and you lose your place in whatever you were reading. A client-side search is like an app that just swaps the menu page in. \`<Form>\` from \`next/form\` gives you both: the app-like swap when JavaScript is running, and the dependable old behaviour when it is not. Plus it fetches the "waiting room" of the next page in advance, so the user sees a response the moment they press Enter.

## 2. The Core Idea

📌 **Interview term: next/form** — the \`<Form>\` component from \`next/form\`, which extends the HTML \`<form>\` with prefetching, client-side navigation on submit and progressive enhancement. It was released with Next.js 15 ([Next.js 15 release post](https://nextjs.org/blog/next-15)).

📌 **Interview term: GET form** — a form whose fields are encoded into the URL as search params on submit: \`<input name="query">\` with value \`red\` becomes \`/search?query=red\`.

📌 **Interview term: Progressive enhancement** — building a feature so that it works with plain HTML first, and JavaScript only makes it better.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 260" role="img" aria-label="Form with a string action. Prefetch when visible, client navigation on submit, results page reads search params">
  <defs>
    <marker id="nx13q6-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="360" y="24" text-anchor="middle">Submitting Form action=/search with query=red</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="48" width="186.7" height="124" rx="10"/>
    <text class="d-text" x="117.3" y="78" text-anchor="middle">Form visible</text>
    <text class="d-sub" x="117.3" y="106" text-anchor="middle">prefetch /search</text>
    <text class="d-sub" x="117.3" y="128" text-anchor="middle">layout + loading</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 214.7 110 L 262.7 110" marker-end="url(#nx13q6-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 214.7 110 L 262.7 110"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-muted" x="266.7" y="48" width="186.7" height="124" rx="10"/>
    <text class="d-text" x="360" y="78" text-anchor="middle">User submits</text>
    <text class="d-sub" x="360" y="106" text-anchor="middle">URL becomes</text>
    <text class="d-sub" x="360" y="128" text-anchor="middle">/search?query=red</text>
    <text class="d-sub" x="360" y="150" text-anchor="middle">no page reload</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 457.3 110 L 505.3 110" marker-end="url(#nx13q6-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 457.3 110 L 505.3 110"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.7s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="509.3" y="48" width="186.7" height="124" rx="10"/>
    <text class="d-text d-accent" x="602.7" y="78" text-anchor="middle">Results page</text>
    <text class="d-sub" x="602.7" y="106" text-anchor="middle">reads searchParams</text>
    <text class="d-sub" x="602.7" y="128" text-anchor="middle">loading shown first</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="2.1s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="196" width="672" height="44" rx="10"/>
    <text class="d-sub" x="360" y="223" text-anchor="middle">with JavaScript off the same form does a normal GET to the same URL</text>
  </g>
</svg>

Its behaviour depends entirely on what you pass to \`action\`:

| \`action\` is | \`<Form>\` behaves like | Extra props |
| :--- | :--- | :--- |
| A string, such as \`"/search"\` | A GET form, but with prefetch and client-side navigation | \`replace\` (default \`false\`), \`scroll\` (default \`true\`), \`prefetch\` (default \`true\`) |
| A function (a Server Action) | A normal React form running that action | \`replace\` and \`scroll\` are ignored |

An empty string \`action=""\` submits to the current route with updated search params, which is handy for a filter bar on a list page.

## 3. The String Action: What It Adds Over a Plain form

A plain \`<form action="/search">\` does a full page load: the browser throws the page away and asks the server for a new HTML document. \`<Form action="/search">\`:

1. **Prefetches** the target route when the form scrolls into view: shared UI such as \`layout.js\` and \`loading.js\`.
2. **Navigates client-side** on submit, exactly like clicking a \`<Link>\`, so shared layouts and client state stay (see [client-side navigation](/interview-question/how-does-client-side-navigation-work-in-next-js-next-link-and-userouter)).
3. **Shows loading UI immediately**, because the [loading.js](/interview-question/what-is-loading-js-in-next-js-and-how-does-suspense-streaming-work) fallback was prefetched.
4. **Still works without JavaScript**: it renders a real \`<form action="/search">\` in the HTML.

📌 **Interview term: Prefetching** — downloading parts of the next route in the background before the user goes there, so the navigation feels instant. In 16.4, how much is prefetched also depends on settings like Partial Prefetching ([prefetching in Next.js 16](/interview-question/how-does-prefetching-and-navigation-caching-work-in-next-js-16)).

On the results page, read the query from the page \`searchParams\` prop on the server. For a pending indicator before the new route's loading UI is available, the docs suggest \`useFormStatus\` in a client button ([what useFormStatus is](/interview-question/what-is-useformstatus-in-react-19-and-why-does-it-exist)).

## 4. The Function Action: Mutations

When you pass a Server Action, \`<Form>\` is simply a React 19 form: submitting calls the function on the server with \`FormData\`. Because the destination is not known until the action runs (it might \`redirect\` anywhere), nothing can be prefetched. For mutations you could equally use a plain \`<form action={fn}>\`; the patterns are covered in [forms with Server Actions](/interview-question/how-do-you-handle-forms-with-server-actions-in-next-js-progressive-enhancement) and [what Server Actions are](/interview-question/what-are-server-actions-in-next-js-and-how-do-they-work).

## 5. When Not to Use It

| Need | Use instead |
| :--- | :--- |
| \`method="post"\`, \`encType\` or \`target\` | Plain \`<form>\`; those props override \`<Form>\` behaviour and are not supported |
| Submitting a file with a string action | Plain \`<form>\` or a Server Action; with a string action the browser sends only the file name |
| Posting to another site | Plain \`<form>\` |
| Rich client validation and controlled inputs | A form library, or \`<Form>\` with \`onSubmit\` (calling \`preventDefault\` cancels the navigation) |

\`formAction\` on a submit button can override \`action\`; it still navigates client-side but is not prefetched. With \`basePath\` you must include it in \`formAction\` yourself.

## 6. Verified — JavaScript On and Off (Next.js 16.4.2)

Lab: \`app/form-demo/page.tsx\` renders \`<Form action="/search">\` with an input named \`query\`; \`app/search/page.tsx\` awaits \`searchParams\`, waits 400 ms and lists matching products; \`app/search/loading.tsx\` shows "Loading results...". The server-rendered HTML of the two lab forms:

\`\`\`
<form id="search-form" action="/search">
<form action="" encType="multipart/form-data" method="POST">
<input type="hidden" name="$ACTION_ID_40ebf5bcba518112fa1f14a3d3669e09b0383e3a7f"/>
<input type="hidden" name="theme" value="dark"/>
\`\`\`

The first is the string-action form: plain HTML that any browser can submit. The second is a \`<Form action={setTheme}>\` with a Server Action: React turned it into a POST form carrying a hidden action id. Chromium then typed \`red\` and submitted the first form:

\`\`\`
--- JavaScript on
requests to /search before submit: GET /search?_rsc=zUzxgJv493Adp4xM (rsc) (prefetch) fetch ; GET /search?_rsc=DsN-nYMv7rZDXIUd (rsc) (prefetch) fetch
url after submit: /search?query=red
visible: results title true | loading fallback false
results: Results for "red" | red shoes, red hat
requests to /search on submit: GET /search?query=red&_rsc=h1ohu_dtfhDwljCJ (rsc)  fetch
document loads: 1 | window marker: kept
--- JavaScript off
requests to /search before submit: (none)
url after submit: /search?query=red
visible: results title false | loading fallback true
results: Results for "red" | red shoes, red hat
requests to /search on submit: GET /search?query=red   document
document loads: 2
\`\`\`

With JavaScript, \`/search\` was prefetched before any typing, the submit was a single RSC \`fetch\`, and the page never reloaded (one document load, the \`window\` marker survived). Without JavaScript, the same form did a classic GET document request to the same URL and the results were in the HTML — progressive enhancement works. One surprise: without JavaScript the loading fallback stayed visible and the results stayed hidden. The streamed results arrive in the HTML, but swapping them in for the \`loading.tsx\` fallback is done by an inline script, so a no-JavaScript visitor sees "Loading results..." indefinitely. If no-JS support really matters, avoid a \`loading.tsx\` or Suspense fallback on that route.

The Server Action form, clicked in the browser:

\`\`\`
before: theme cookie: (none)
after:  theme cookie: dark
POST /whoami next-action header: present
\`\`\`

## 7. Common Pitfalls

- **Expecting \`<Form>\` to POST.** A string action is always a GET; for writes pass a Server Action.
- **Adding \`method\`, \`encType\` or \`target\`.** Unsupported; use a plain \`<form>\`.
- **File inputs with a string action.** Only the file name is sent, like a browser GET.
- **Calling \`event.preventDefault()\` in \`onSubmit\` and wondering why nothing navigates.** It cancels the \`<Form>\` navigation.
- **Assuming "works without JavaScript" covers streaming.** The lab showed a \`loading.tsx\` fallback never being replaced with JavaScript off.
- **Passing a \`key\` to a string-action \`<Form>\` to force re-renders.** Not supported; use a function action instead.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Form</code> from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next/form</code> is an HTML form with prefetching, client-side navigation on submit and progressive enhancement, added in Next.js 15.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. String action:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">action="/search"</code> works like a GET form: inputs become <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">?query=...</code>, but Next.js navigates client-side and keeps layouts and state.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Prefetch:</strong> <span style="color:#f0e2c8;">When the form is visible it prefetches the target route layout and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">loading.js</code>, so loading UI shows instantly on submit.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Function action:</strong> <span style="color:#f0e2c8;">With a Server Action it is a normal React form for mutations; no prefetch, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">replace</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">scroll</code> are ignored.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">No <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">method</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">encType</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">target</code>, and file inputs only send the name with a string action; use a plain form there.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens with JavaScript disabled?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is a real form element in the HTML, so the browser does a normal GET to the same URL; the lab got the same results page, with a full document load.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is it different from Link?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Link</code> navigates to a fixed href; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Form</code> builds the URL from its inputs at submit time. Both prefetch and navigate client-side.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you avoid filling the history with every search?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Pass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">replace</code>, so the navigation replaces the current history entry instead of pushing a new one.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you show a pending state?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">loading.js</code> on the target route, which is prefetched, plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useFormStatus</code> in a client submit button for the moment before.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you use it for a login form?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only with a Server Action, as a React form. A login must POST and never put a password in the URL, which a string action would do.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **next/form** | Form component with prefetch and client navigation |
| **GET form** | Fields go into the URL as search params |
| **Progressive enhancement** | Works as HTML first, JavaScript improves it |
| **Prefetching** | Loading the next route in the background |

---
**Conclusion:** \`<Form>\` from \`next/form\` is the HTML form upgraded for the App Router. With a string \`action\` it is a GET form that writes inputs into the URL, but it prefetches the target route and navigates client-side, so layouts and state are kept and loading UI appears instantly; without JavaScript it falls back to a normal GET, as the lab confirmed. With a Server Action it is just a React form for mutations, with no prefetching. Use it for search and filter forms that lead to a URL, and keep a plain \`<form>\` for POSTs to other servers, custom \`method\`/\`encType\`/\`target\`, or file uploads with a string action.`,
    examples: [
      {
        label: "A search form that navigates to a results page",
        tech: "tsx",
        runnable: false,
        code: `// app/page.tsx — a Server Component can render <Form> directly
import Form from "next/form";
import SearchButton from "./SearchButton";

export default function Home() {
  return (
    <Form action="/search">
      {/* Submitting navigates to /search?query=... */}
      <input name="query" placeholder="Search products" />
      <SearchButton />
    </Form>
  );
}

// app/SearchButton.tsx — instant feedback while the navigation is pending
"use client";
import { useFormStatus } from "react-dom";

export default function SearchButton() {
  const { pending } = useFormStatus();
  return <button type="submit">{pending ? "Searching..." : "Search"}</button>;
}

// app/search/page.tsx — the results page reads the query from searchParams
export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const { query = "" } = await searchParams;
  const results = await searchProducts(String(query));
  return <ul>{results.map((r) => <li key={r}>{r}</li>)}</ul>;
}

async function searchProducts(q: string) {
  return ["red shoes", "blue shoes", "red hat"].filter((p) => p.includes(q.toLowerCase()));
}

// app/search/loading.tsx — shown immediately on submit (prefetched with the form)
export default function Loading() {
  return <p>Loading results...</p>;
}`,
      },
      {
        label: "Form with a Server Action for a mutation",
        tech: "tsx",
        runnable: false,
        code: `// app/posts/new/actions.ts
"use server";
import { redirect } from "next/navigation";

export async function createPost(formData: FormData) {
  const title = String(formData.get("title") ?? "");
  const id = await savePost(title);
  redirect(\`/posts/\${id}\`);
}

async function savePost(title: string) {
  return title.toLowerCase().replace(/\\s+/g, "-") || "untitled";
}

// app/posts/new/page.tsx
import Form from "next/form";
import { createPost } from "./actions";

export default function NewPost() {
  // With a function action, <Form> behaves like a React form: no URL, no prefetch
  return (
    <Form action={createPost}>
      <input name="title" />
      <button type="submit">Create post</button>
    </Form>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you read cookies and headers in Next.js (cookies(), headers())?",
    seoDescription: "cookies() and headers() from next/headers are async, read the request in Server Components and make routes dynamic; only actions and handlers set cookies.",
    description: `**Question presented to candidate:**
"A Server Component needs to know the user's theme cookie and preferred language from the request headers. Show how you read them in the App Router, then explain how you would let the user change the theme, and what reading them does to how the page is rendered."

**What a strong answer should cover:**
- \`cookies()\` and \`headers()\` are imported from \`next/headers\`, are async (\`await\` them; sync access was removed in Next.js 16) and work in Server Components, Server Actions and Route Handlers — not in Client Components.
- \`cookies()\` returns a store with \`get\` (an object with \`name\` and \`value\`), \`getAll\`, \`has\`, and \`set\`/\`delete\`; \`headers()\` returns a read-only Web \`Headers\` object.
- Cookies can only be set or deleted in a Server Action or Route Handler, because the response headers are already sent once rendering streams; \`headers()\` can never be modified.
- They are request-time APIs: using them makes the route dynamic, and with Cache Components they must sit inside \`<Suspense>\` or the build fails.
- Security: set auth cookies with \`httpOnly\`, \`secure\`, \`sameSite\`; never trust header values blindly.

**Clarifying questions expected:**
- "Does the rest of the page have to be per-user, or only this part?" — decides where the Suspense boundary goes.
- "Does client JavaScript need to read the cookie?" — if not, make it \`httpOnly\`.

**Code / implementation expected:** Yes — reading in a Server Component and setting in a Server Action.`,
    answer: `**Target Audience:** Developers preparing for Next.js interviews — assumes basic App Router knowledge (Server Components, Server Actions).
**Difficulty:** Medium

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.4.2 docs shipped with the package and, in the **Verified** section, against lab builds, \`curl\` requests to \`next start\` and a Chromium browser.

## 1. Why This Even Matters — A Story First

Every time a browser asks your server for a page, it hands over an envelope. On the envelope are labels: which browser it is, which languages the person reads, and a few small notes your site asked it to keep last time ("theme: dark", "session: abc"). The labels are **headers** and the notes are **cookies**. A Server Component can read the envelope, but it cannot rewrite it. And it can only ask the browser to keep a new note before the reply starts being sent — once the first sentence of the reply is out the door, it is too late to add a label to it. Those two facts explain the whole API.

## 2. The Core Idea

📌 **Interview term: HTTP header** — a name-value pair sent with a request or response, such as \`user-agent\` or \`accept-language\`.

📌 **Interview term: Cookie** — a small name-value pair the browser stores for a site and sends back in the \`cookie\` request header; the server creates or changes one with a \`Set-Cookie\` response header. How cookies compare with browser storage is in [localStorage, sessionStorage and cookies](/interview-question/what-is-the-difference-between-localstorage-sessionstorage-and-cookies).

📌 **Interview term: Request-time API** — a function whose result depends on the incoming request and so cannot be known at build time; \`cookies()\`, \`headers()\`, \`searchParams\` and \`connection()\` are the main ones.

Both functions come from \`next/headers\` and are **async**:

\`\`\`tsx
import { cookies, headers } from "next/headers";

export default async function Page() {
  const cookieStore = await cookies();
  const headerList = await headers();
  const theme = cookieStore.get("theme")?.value;      // "dark" | undefined
  const ua = headerList.get("user-agent");             // string | null
}
\`\`\`

They became async in Next.js 15; Next.js 16 removed the temporary synchronous access, so \`await\` (or React \`use\`) is required.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 260" role="img" aria-label="Server Components can read cookies and headers, Server Actions and Route Handlers can also set cookies, Client Components cannot import next/headers">
  <defs>
    <marker id="nx13q7-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="360" y="24" text-anchor="middle">Where cookies() and headers() work</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="48" width="186.7" height="124" rx="10"/>
    <text class="d-text" x="117.3" y="78" text-anchor="middle">Server Component</text>
    <text class="d-sub" x="117.3" y="106" text-anchor="middle">read cookies</text>
    <text class="d-sub" x="117.3" y="128" text-anchor="middle">read headers</text>
    <text class="d-sub" x="117.3" y="150" text-anchor="middle">no set, no delete</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="266.7" y="48" width="186.7" height="124" rx="10"/>
    <text class="d-text d-accent" x="360" y="78" text-anchor="middle">Action or Handler</text>
    <text class="d-sub" x="360" y="106" text-anchor="middle">read both</text>
    <text class="d-sub" x="360" y="128" text-anchor="middle">set and delete</text>
    <text class="d-sub" x="360" y="150" text-anchor="middle">cookies</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-muted" x="509.3" y="48" width="186.7" height="124" rx="10"/>
    <text class="d-text" x="602.7" y="78" text-anchor="middle">Client Component</text>
    <text class="d-sub" x="602.7" y="106" text-anchor="middle">import fails</text>
    <text class="d-sub" x="602.7" y="128" text-anchor="middle">at build time</text>
    <text class="d-sub" x="602.7" y="150" text-anchor="middle">use props instead</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="196" width="672" height="44" rx="10"/>
    <text class="d-sub" x="360" y="223" text-anchor="middle">headers() is read-only everywhere; outgoing headers go on the Response instead</text>
  </g>
</svg>

## 3. The cookies() Store

| Method | Returns | Where |
| :--- | :--- | :--- |
| \`get(name)\` | \`{ name, value }\` or \`undefined\` | Anywhere on the server |
| \`getAll()\` / \`getAll(name)\` | Array of \`{ name, value }\` | Anywhere on the server |
| \`has(name)\` | \`boolean\` | Anywhere on the server |
| \`set(name, value, options)\` | — | Server Action or Route Handler only |
| \`delete(name)\` | — | Server Action or Route Handler only |
| \`toString()\` | The cookie string | Anywhere on the server |

Options for \`set\`: \`expires\`, \`maxAge\` (seconds), \`domain\`, \`path\` (the only option with a default, \`/\`), \`secure\`, \`httpOnly\`, \`sameSite\`, \`priority\`, \`partitioned\`. Deleting can also be done by setting an empty value or \`maxAge: 0\`.

📌 **Interview term: httpOnly cookie** — a cookie that client JavaScript cannot read through \`document.cookie\`; the right choice for sessions. The lab confirmed a cookie set this way was invisible to \`document.cookie\`.

## 4. Why You Cannot Set a Cookie While Rendering

A Server Component's HTML is streamed. Status code and headers go first; once streaming starts, there is no way to add a \`Set-Cookie\` header. So Next.js only allows \`set\` and \`delete\` where it controls the response before sending it:

- **Server Actions** — and after setting a cookie in an action, Next.js returns the updated UI in the same round trip. See [what Server Actions are](/interview-question/what-are-server-actions-in-next-js-and-how-do-they-work).
- **Route Handlers** — where you build the \`Response\` yourself. See [Route Handlers](/interview-question/what-are-route-handlers-in-next-js-and-how-do-they-differ-from-pages-api-routes).
- **Proxy** (\`proxy.ts\`, formerly middleware) uses its own \`request.cookies\` / \`response.cookies\` API instead of \`next/headers\` ([proxy.ts](/interview-question/what-is-proxy-ts-in-next-js-16-and-how-do-you-migrate-from-middleware-ts)).

\`headers()\` is read-only everywhere. To send a response header, return it on a \`Response\` in a Route Handler, or configure \`headers\` in \`next.config\` or the proxy.

## 5. What Reading Them Does to Rendering

Because the values only exist per request, using either function opts the route into dynamic rendering (\`ƒ\` in the build table). With [Cache Components](/interview-question/what-are-cache-components-in-next-js-16-and-how-does-the-use-cache-directive-wor), which \`create-next-app@16.4.2\` turns on by default, the rule is stricter: the access must sit inside a \`<Suspense>\` boundary. The page then becomes a Partial Prerender (\`◐\`): a static shell is served instantly and only the cookie-dependent part is streamed in per request. Without the boundary, the build fails with an error.

| Setup | cookies() outside Suspense | cookies() inside Suspense |
| :--- | :--- | :--- |
| Cache Components off | Whole route dynamic (\`ƒ\`) | Whole route dynamic, part streams |
| Cache Components on | Build error | \`◐\` static shell plus streamed part |

Read cookies as close to where they are used as possible, so the static part of the page stays large. The broader rules are in [what makes a route dynamic](/interview-question/what-makes-a-route-dynamic-in-the-next-js-app-router). The use-cache docs say \`cookies()\` and \`headers()\` are not allowed inside a \`'use cache'\` scope; read the cookie outside and pass the value in as an argument.

## 6. Client Components

\`next/headers\` is server-only. Importing it in a \`'use client'\` file fails the build (shown below). If a Client Component needs a cookie value, read it in a Server Component and pass it as a prop, or — for non-httpOnly cookies — read \`document.cookie\` in the browser. Patterns for passing data down are in [Server to Client data](/interview-question/how-do-you-pass-data-from-server-components-to-client-components-in-next-js).

## 7. Verified — Reading, Writing and the Errors (Next.js 16.4.2)

A lab page \`/whoami\` (dynamic, Cache Components off) renders \`get("theme")\`, \`has("session")\`, \`getAll()\` names, \`user-agent\` and \`accept-language\`:

\`\`\`
$ curl -A "lab-agent/1.0" -H "Accept-Language: de-DE" -b "theme=dark; session=abc" /whoami
<p id="theme">theme cookie: dark</p>
<p id="has">has session: true</p>
<p id="all">all cookie names: theme,session</p>
<p id="ua">user-agent: lab-agent/1.0</p>
<p id="lang">accept-language: de-DE</p>

$ curl /whoami   (no cookies, default curl UA)
<p id="theme">theme cookie: (none)</p>
<p id="has">has session: false</p>
<p id="all">all cookie names: (none)</p>
<p id="ua">user-agent: curl/8.5.0</p>
<p id="lang">accept-language: (none)</p>
\`\`\`

A Route Handler reading both ways and writing on POST (\`set("theme", "dark", { httpOnly: true, path: "/" })\` and \`delete("legacy")\`):

\`\`\`
$ curl -b "theme=dark" -H "x-demo: hi" /api/theme
{"viaCookies":"dark","viaRequest":"dark","viaHeaders":"hi"}

$ curl -i -X POST /api/theme   (response headers trimmed)
HTTP/1.1 200 OK
set-cookie: theme=dark; Path=/; HttpOnly
set-cookie: legacy=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT
{"ok":true}
\`\`\`

So \`delete\` is an expired, empty \`Set-Cookie\`. Trying to write during a Server Component render (errors caught and printed by the lab pages):

\`\`\`
$ curl /bad-set   (cookies().set during Server Component render)
<p id="r">Cookies can only be modified in a Server Action or Route Handler. Read more: https://nextjs.org/docs/app/api-reference/functions/cookies#options</p>

$ curl /bad-headers   (headers().set during render)
<p id="r">Error: Headers cannot be modified. Read more: https://nextjs.org/docs/app/api-reference/functions/headers</p>
\`\`\`

A Server Action setting the cookie, clicked in Chromium:

\`\`\`
before: theme cookie: (none)
after:  theme cookie: dark
POST /whoami next-action header: present
browser cookie jar: {"name":"theme","value":"dark","httpOnly":true,"sameSite":"Lax"}
document.cookie sees it: false
\`\`\`

With \`cacheComponents: true\`, a page awaiting \`cookies()\` outside Suspense (trimmed):

\`\`\`
Error: Route "/": Next.js encountered uncached or runtime data during prerendering.

\`fetch(...)\`, \`cookies()\`, \`headers()\`, \`params\`, \`searchParams\`, or \`connection()\` accessed outside of \`<Suspense>\` prevents the route from being prerendered, blocking the page load and leading to a slower user experience.

Ways to fix this:
  - [stream] Provide a placeholder with \`<Suspense fallback={...}>\` around the data access
  - [cache] For uncached data (\`fetch\`, database calls): cache the access with \`"use cache"\` (does not apply to \`connection()\`)
  - [block] Set \`export const instant = false\` to allow a blocking route
\`\`\`

The same read moved into a child component inside \`<Suspense>\`:

\`\`\`
Route (app)
┌ ◐ /
└ ○ /_not-found

○  (Static)             prerendered as static content
◐  (Partial Prerender)  prerendered as static HTML with dynamic server-streamed content
\`\`\`

And \`import { headers } from "next/headers"\` in a \`'use client'\` file (colour codes removed):

\`\`\`
Error: You're importing a module that depends on "next/headers" into a React Client Component module. This API is only available in Server Components but one of its parents is marked with "use client", so this module is also a Client Component.
\`\`\`

## 8. Common Pitfalls

- **Forgetting \`await\`.** In Next.js 16 \`cookies().get(...)\` fails type checking; the lab build printed \`Property 'get' does not exist on type 'Promise<ReadonlyRequestCookies>'\`.
- **Setting a cookie in a page or layout.** It throws; move it to a Server Action or Route Handler.
- **Reading cookies at the top of a layout.** It makes every page under it dynamic; read it in a small component inside \`<Suspense>\`.
- **Session cookies without \`httpOnly\`, \`secure\` and \`sameSite\`.** Readable by any injected script and sent cross-site. More in [authentication](/interview-question/how-do-you-handle-authentication-in-next-js).
- **Trusting headers.** \`x-forwarded-for\`, \`host\` or a custom header can be spoofed unless your proxy or platform overwrites them.
- **Reading cookies inside \`'use cache'\`.** Not allowed; read outside and pass the value as an argument.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cookies()</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">headers()</code> from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next/headers</code> are async functions that read the incoming request on the server.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Reading:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(await cookies()).get("theme")?.value</code>, plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">getAll</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">has</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(await headers()).get("user-agent")</code> on a read-only Headers object.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Writing:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">delete</code> only work in a Server Action or Route Handler, because a streamed render has already sent its headers; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">headers()</code> is never writable.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Rendering impact:</strong> <span style="color:#f0e2c8;">They are request-time APIs, so the route becomes dynamic; with Cache Components they must sit inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Suspense</code> or the build fails.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">Do not read them at the top of a layout: everything below becomes dynamic. Read them in a small component inside Suspense.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a Client Component use cookies()?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next/headers</code> fails the build in a client file. Read the value in a Server Component and pass it as a prop, or use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">document.cookie</code> for non-httpOnly cookies.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you delete a cookie?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(await cookies()).delete("name")</code> in a Server Action or Route Handler; the lab saw it sent as an empty cookie expiring in 1970.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did cookies() become async?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Since Next.js 15 request APIs are Promises so Next.js can prerender everything that does not wait on them; Next.js 16 removed the temporary sync access.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you add a response header?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">headers()</code>. Return it on a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Response</code> in a Route Handler, or use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">headers</code> in next.config or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">proxy.ts</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens after a Server Action sets a cookie?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The browser stores it from the Set-Cookie header and Next.js re-renders the route in the same round trip; in the lab the page showed the new theme right after the click.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **HTTP header** | Name-value pair sent with a request or response |
| **Cookie** | Small value the browser stores and sends back |
| **Request-time API** | Function that depends on the incoming request |
| **httpOnly cookie** | Cookie hidden from client JavaScript |

---
**Conclusion:** \`cookies()\` and \`headers()\` from \`next/headers\` are async functions that read the incoming request in Server Components, Server Actions and Route Handlers. \`headers()\` is always read-only, and cookies can only be set or deleted in a Server Action or Route Handler, because a streamed render has already sent its headers — the lab printed exactly those two errors. Reading either makes the route dynamic; with Cache Components (the 16.4.2 default for new apps) the read must sit inside \`<Suspense>\`, which the lab turned from a build error into a partially prerendered page.`,
    examples: [
      {
        label: "Reading cookies and headers in a Server Component",
        tech: "tsx",
        runnable: false,
        code: `// app/account/page.tsx
import { Suspense } from "react";
import { cookies, headers } from "next/headers";

async function Greeting() {
  const cookieStore = await cookies();
  const headerList = await headers();

  const theme = cookieStore.get("theme")?.value ?? "light"; // { name, value } | undefined
  const loggedIn = cookieStore.has("session");
  const language = headerList.get("accept-language")?.split(",")[0] ?? "en";

  return (
    <p>
      {loggedIn ? "Welcome back" : "Hello"} ({language}, {theme} theme)
    </p>
  );
}

export default function AccountPage() {
  return (
    <main>
      <h1>Your account</h1>
      {/* Request data inside Suspense: the heading can still be prerendered (required with Cache Components) */}
      <Suspense fallback={<p>Loading...</p>}>
        <Greeting />
      </Suspense>
    </main>
  );
}`,
      },
      {
        label: "Setting and deleting cookies in a Server Action and a Route Handler",
        tech: "ts",
        runnable: false,
        code: `// app/account/actions.ts — Server Action: may set and delete cookies
"use server";
import { cookies } from "next/headers";

export async function setTheme(formData: FormData) {
  const theme = formData.get("theme") === "dark" ? "dark" : "light";
  const cookieStore = await cookies();
  cookieStore.set("theme", theme, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function logout() {
  (await cookies()).delete("session");
}

// app/api/theme/route.ts — Route Handler: read and write
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  // Two equivalent ways to read the cookie here
  const fromHelper = (await cookies()).get("theme")?.value ?? null;
  const fromRequest = request.cookies.get("theme")?.value ?? null;
  return Response.json({ fromHelper, fromRequest });
}

export async function POST() {
  (await cookies()).set("theme", "dark", { httpOnly: true, path: "/" });
  return Response.json({ ok: true });
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is static export (output: 'export') in Next.js and what does it not support?",
    seoDescription: "output: 'export' builds a Next.js app into plain HTML/CSS/JS in out/. What works, what fails the build, and what silently breaks, from a 16.4.2 lab.",
    description: `**Question presented to candidate:**
"We want to host a Next.js marketing site on plain static hosting — an S3 bucket behind a CDN, no Node server. How does static export work, what do we get in the output, and which Next.js features will we lose?"

**What a strong answer should cover:**
- \`output: "export"\` in \`next.config\` makes \`next build\` write HTML, CSS, JS and RSC payload files to \`out/\`, one HTML file per route; it replaced the \`next export\` command (removed in v14).
- Server Components still run, but only at build time; Client Components hydrate and client navigation works like an SPA. GET Route Handlers with \`force-static\` become static files.
- Dynamic routes need \`generateStaticParams\`; anything per-request is unsupported: \`cookies()\`/\`headers()\`, Server Actions, ISR, Draft Mode, rewrites/redirects/headers config, proxy, request-reading Route Handlers, intercepting routes, default image optimization.
- Some of these fail the build, but some only warn or pass silently (rewrites, proxy, \`revalidate\`, the default image loader in the lab), so test the output on a static server.
- Hosting detail: map \`/about\` to \`about.html\` (or use \`trailingSlash: true\`) and serve \`404.html\`.

**Clarifying questions expected:**
- "Does any page need per-user data or form submissions to our own backend?" — that needs a server or an external API.
- "How often does content change?" — every change needs a rebuild and redeploy, there is no ISR.

**Code / implementation expected:** Yes — the config and a dynamic route with \`generateStaticParams\`.`,
    answer: `**Target Audience:** Developers preparing for Next.js interviews — assumes the basics of App Router rendering (static vs dynamic routes).
**Difficulty:** Medium

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.4.2 docs shipped with the package and, in the **Verified** section, against lab builds with \`output: "export"\`, a plain static file server and a Chromium browser.

## 1. Why This Even Matters — A Story First

A normal Next.js app is a restaurant with a kitchen: some dishes are prepared in advance, others are cooked when you order. Static export is a vending machine. Everything is prepared before the machine is stocked, and the machine itself cannot cook. That makes it cheap, fast and able to sit anywhere — a CDN, an S3 bucket, GitHub Pages — but you cannot ask it for something it does not already contain, and it cannot read who is standing in front of it. "What does static export not support?" is really "which features need a kitchen?".

## 2. The Core Idea

📌 **Interview term: Static export** — building a Next.js app into plain HTML, CSS and JavaScript files, with no server code at runtime, by setting \`output: "export"\` in \`next.config\`.

📌 **Interview term: Static host** — any web server or CDN that only returns files (Nginx, S3, GitHub Pages, Cloudflare Pages); it runs none of your code.

\`\`\`ts
// next.config.ts
const nextConfig: NextConfig = { output: "export" };
\`\`\`

After \`next build\`, the site is in \`out/\`. The old \`next export\` command was deprecated in v13.3 and removed in v14 in favour of this option.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 260" role="img" aria-label="next build with output export renders every route to files in out, a static host serves them, and the browser hydrates and navigates client side">
  <defs>
    <marker id="nx13q8-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="360" y="24" text-anchor="middle">Static export: all rendering happens in next build</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="48" width="186.7" height="124" rx="10"/>
    <text class="d-text" x="117.3" y="78" text-anchor="middle">next build</text>
    <text class="d-sub" x="117.3" y="106" text-anchor="middle">Server Components</text>
    <text class="d-sub" x="117.3" y="128" text-anchor="middle">run once, here</text>
    <text class="d-sub" x="117.3" y="150" text-anchor="middle">params listed</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 214.7 110 L 262.7 110" marker-end="url(#nx13q8-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 214.7 110 L 262.7 110"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="266.7" y="48" width="186.7" height="124" rx="10"/>
    <text class="d-text d-accent" x="360" y="78" text-anchor="middle">out/ folder</text>
    <text class="d-sub" x="360" y="106" text-anchor="middle">about.html</text>
    <text class="d-sub" x="360" y="128" text-anchor="middle">about.txt (RSC)</text>
    <text class="d-sub" x="360" y="150" text-anchor="middle">data.json, assets</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 457.3 110 L 505.3 110" marker-end="url(#nx13q8-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 457.3 110 L 505.3 110"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.7s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-muted" x="509.3" y="48" width="186.7" height="124" rx="10"/>
    <text class="d-text" x="602.7" y="78" text-anchor="middle">Static host</text>
    <text class="d-sub" x="602.7" y="106" text-anchor="middle">no Node.js</text>
    <text class="d-sub" x="602.7" y="128" text-anchor="middle">just files</text>
    <text class="d-sub" x="602.7" y="150" text-anchor="middle">browser hydrates</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="2.1s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="196" width="672" height="44" rx="10"/>
    <text class="d-sub" x="360" y="223" text-anchor="middle">anything that needs the incoming request has nowhere to run after the build</text>
  </g>
</svg>

The browser still gets a real React app: pages hydrate, and links navigate client-side using the prerendered payload files, like a single-page app.

📌 **Interview term: RSC payload file** — the \`.txt\` files next to each HTML file. They hold the rendered Server Component output that the client router uses for navigation, so a click does not need a new HTML page. See [the RSC payload](/interview-question/what-is-the-rsc-payload-and-how-does-next-js-stream-it-to-the-browser).

## 3. What Still Works

- **Server Components**, executed during \`next build\`, like classic static site generation. A \`fetch\` in a page runs at build time.
- **Client Components**, prerendered to HTML and hydrated. Browser APIs (\`window\`, \`localStorage\`) must be used in effects or event handlers, because prerendering runs without a browser.
- **Dynamic routes with [\`generateStaticParams\`](/interview-question/what-is-generatestaticparams-in-next-js-and-how-does-it-enable-ssg-for-dynamic-r)** — one HTML file per listed param.
- **GET Route Handlers** marked \`export const dynamic = "force-static"\` — rendered once into a file such as \`out/data.json\`.
- **\`next/link\` prefetching and client navigation**, CSS and CSS Modules, \`next/font\`, metadata files.
- **\`next/image\`** with \`images: { unoptimized: true }\` or a custom loader (for example an image CDN).
- **Client-side data fetching** (SWR, React Query, \`fetch\` in effects) against an external API.

## 4. What It Does Not Support

The 16.4.2 docs list features that need a server. The lab tried each of the common ones; the table says what actually happened in the build:

| Feature | Why it needs a server | \`next build\` in the lab |
| :--- | :--- | :--- |
| Dynamic route without \`generateStaticParams\` | Unknown paths must render on request | **Fails**: missing generateStaticParams |
| \`cookies()\` / \`headers()\` ([reading them](/interview-question/how-do-you-read-cookies-and-headers-in-next-js-cookies-headers)) | Per-request data | **Fails**: dynamic = "error" message |
| Server Actions ([what they are](/interview-question/what-are-server-actions-in-next-js-and-how-do-they-work)) | Code runs on POST | **Fails**: not supported with static export |
| Route Handler reading the request, no \`force-static\` | Runs per request | **Fails**: force-static not configured |
| Default \`next/image\` loader | Image optimizer is a server endpoint | **Passes**, but images 404 on the static host |
| \`rewrites\` / \`redirects\` / \`headers\` in config | Applied by the Next.js server | Passes with a warning; not applied |
| \`proxy.ts\` ([proxy](/interview-question/what-is-proxy-ts-in-next-js-16-and-how-do-you-migrate-from-middleware-ts)) | Runs before each request | Passes with a warning; never runs |
| ISR (\`revalidate\`) ([ISR](/interview-question/what-is-isr-incremental-static-regeneration-in-next-js-and-how-do-you-implement-)) | Regeneration needs a server | Passes; the page is just static, never refreshed |
| Draft Mode, intercepting routes, \`dynamicParams: true\` | Request-time behaviour | Not tested here; listed as unsupported in the docs |

The docs say that using these features under \`next dev\` with static export produces an error; the lab saw this for the image loader (a 500 in dev) while the production build of the same code succeeded. So "the build passed" is not proof that everything works — serve \`out/\` and click around.

## 5. Hosting the out/ Folder

Without \`trailingSlash\`, the route \`/about\` becomes \`out/about.html\`. A host must map the clean URL to that file. The docs give an Nginx example (\`try_files $uri $uri.html $uri/ =404;\` plus \`error_page 404 /404.html\`). With \`trailingSlash: true\`, each route becomes \`about/index.html\`, which most static hosts serve automatically. For a sub-path deployment such as a GitHub Pages project site, set \`basePath\`.

| Choice | Static export | Standalone server |
| :--- | :--- | :--- |
| Runtime | None, files only | Node.js process |
| Per-request rendering, cookies | No | Yes |
| Server Actions, ISR, image optimization | No | Yes |
| Hosting cost and complexity | Lowest | Higher |
| Content updates | Rebuild and redeploy | Revalidation possible |

When the answer to "does any page need a request?" is yes, compare with [the standalone build](/interview-question/what-is-the-output-standalone-build-in-next-js-and-when-do-you-use-it) and [deployment options](/interview-question/how-do-you-deploy-a-next-js-app-vercel-vs-self-hosted).

## 6. Verified — Building and Serving an Export (Next.js 16.4.2)

Lab app with \`output: "export"\`: \`/\`, \`/about\`, \`/blog/[slug]\` with \`generateStaticParams\` returning \`hello\` and \`world\`, \`app/data.json/route.ts\` with \`force-static\`, a Client Component clock, and \`next/image\` with \`unoptimized\`. The build (progress lines removed):

\`\`\`
Route (app)
┌ ○ /
├ ○ /_not-found
├ ○ /about
├   /blog/[slug]
│ ├ ● /blog/hello
│ └ ● /blog/world
└ ○ /data.json

○  (Static)  prerendered as static content
●  (SSG)     prerendered as static HTML (uses generateStaticParams)
\`\`\`

Files in \`out/\` (the \`_next/\` assets and the per-segment \`__next.*.txt\` prefetch files left out):

\`\`\`
out/404.html
out/_not-found.html
out/_not-found.txt
out/about.html
out/about.txt
out/blog/hello.html
out/blog/hello.txt
out/blog/world.html
out/blog/world.txt
out/data.json
out/index.html
out/index.txt
out/logo.png
\`\`\`

\`out/data.json\` contained \`{"name":"Lee","builtAt":"build time"}\`. Serving \`out/\` with a plain file server (\`python3 -m http.server\`), which knows nothing about \`.html\` mapping:

\`\`\`
GET /                    -> 200 text/html
GET /about               -> 301
GET /about.html          -> 200 text/html
GET /blog/hello          -> 301
GET /blog/hello.html     -> 200 text/html
GET /blog/unknown.html   -> 404 text/html;charset=utf-8
GET /data.json           -> 200 application/json
\`\`\`

The 301 went to \`/about/\`, a folder that only holds prefetch files, so that server showed a directory listing — exactly why hosts need a rewrite rule or \`trailingSlash: true\`. With \`trailingSlash: true\` the build wrote \`out/about/index.html\`, \`out/blog/hello/index.html\` and so on instead. In Chromium the home page hydrated (the clock showed the browser time) and clicking the About link was a client-side navigation: the \`window\` marker survived, because the router had already prefetched files such as \`/about/__next.about.__PAGE__.txt\`. Because this particular server redirected \`/about\` to \`/about/\`, the address bar ended on \`/about/\` — the host's URL rules leak into the app.

The failing builds (one feature added at a time to the same app; stack traces, build banners and trailing "See more info" links removed):

\`\`\`
######## nogsp
Error: Page "/u/[id]" is missing "generateStaticParams()" so it cannot be used with "output: export" config.
######## cookies
Error: Route /about with \`dynamic = "error"\` couldn't be rendered statically because it used \`cookies()\`.
######## action
> Server Actions are not supported with static export.
######## reqroute
Error: export const dynamic = "force-static"/export const revalidate not configured on route "/echo" with "output: export".
\`\`\`

The ones that built (exit 0; route tables and the rest of the proxy warning trimmed):

\`\`\`
######## rewrites
⚠ Specified "rewrites" will not automatically work with "output: export". See more info here: https://nextjs.org/docs/messages/export-no-custom-routes
⚠ rewrites, redirects, and headers are not applied when exporting your application, detected (rewrites). See more info here: https://nextjs.org/docs/messages/export-no-custom-routes
######## proxy
⚠ Statically exporting a Next.js application via \`next export\` disables API routes and middleware.
ƒ Proxy (Middleware)
######## isr
└ ○ /isr                   1m      1y
\`\`\`

And the default image loader: the build passed and the HTML pointed at the optimizer, which a static host does not have, while \`next dev\` on the same code returned a 500:

\`\`\`
<img alt="logo" ... src="/_next/image?url=%2Flogo.png&amp;w=64&amp;q=75"/>
GET /_next/image?url=%2Flogo.png&w=64&q=75   -> 404   (static server)
GET /logo.png                                -> 200

next dev:
⨯ Error: Image Optimization using the default loader is not compatible with \`{ output: 'export' }\`.
 GET / 500 in 497ms (next.js: 220ms, application-code: 277ms)
\`\`\`

The proxy warning still mentions the removed \`next export\` command; that is the wording 16.4.2 printed.

## 7. Common Pitfalls

- **Trusting a green build.** The default image loader, ISR, proxy and config rewrites all built in the lab and simply did nothing (or 404ed) once deployed.
- **Forgetting \`generateStaticParams\`.** Every dynamic path must be known at build time; unknown slugs are 404s.
- **No URL mapping on the host.** \`/about\` must reach \`about.html\`; configure the host or use \`trailingSlash: true\`.
- **Using \`window\` during render.** Client Components are prerendered too; access browser APIs in effects.
- **Expecting forms to post to the app.** No Server Actions; post to an external API or a separate backend.
- **Content goes stale.** No ISR or on-demand revalidation; changes need a rebuild and redeploy.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">output: "export"</code> makes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next build</code> write plain HTML, CSS, JS and RSC payload files to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">out/</code>, hostable on any static server.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. What works:</strong> <span style="color:#f0e2c8;">Server Components (run at build time), Client Components, dynamic routes with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">generateStaticParams</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">force-static</code> GET Route Handlers, client navigation.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. What does not:</strong> <span style="color:#f0e2c8;">Anything per request: cookies and headers, Server Actions, ISR, Draft Mode, rewrites, redirects and headers config, proxy, default image optimization.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Hosting:</strong> <span style="color:#f0e2c8;">Map <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/about</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">about.html</code> or set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">trailingSlash: true</code>; serve <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">404.html</code>; use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">basePath</code> for sub-paths.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">Not everything fails the build: in the 16.4.2 lab the default image loader, ISR, proxy and rewrites built fine and silently did nothing.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do Server Components work in a static export?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, but only during <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next build</code>; their output is saved as HTML plus a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.txt</code> payload. Nothing runs on the server afterwards.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle images?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">images: { unoptimized: true }</code> or a custom loader to an image CDN; the default loader points at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/_next/image</code>, which a static host does not have.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference from output standalone?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Standalone is a minimal Node.js server bundle that keeps every feature; export is files only, with no runtime.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a static export still show user-specific data?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only fetched in the browser from an external API, in a Client Component; nothing can read cookies on the server.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What replaced next export?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">output: "export"</code> config option. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next export</code> was deprecated in v13.3 and removed in v14.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Static export** | Building the app into plain files with output export |
| **Static host** | Server or CDN that only returns files |
| **RSC payload file** | The .txt files the client router uses to navigate |

---
**Conclusion:** \`output: "export"\` turns \`next build\` into a static site generator: Server Components run once at build time, every route (including each \`generateStaticParams\` path) becomes an HTML file plus an RSC payload file in \`out/\`, and the result runs on any static host with client-side navigation intact. Everything that needs the incoming request is off the table — cookies and headers, Server Actions, ISR, rewrites and redirects, proxy, request-reading Route Handlers and default image optimization. The lab showed that only some of these fail the build; the image optimizer, ISR, proxy and rewrites passed and quietly did nothing, so a static export should always be checked by serving \`out/\` the way production will.`,
    examples: [
      {
        label: "next.config.ts for a static export",
        tech: "ts",
        runnable: false,
        code: `// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",          // next build writes plain files to out/
  trailingSlash: true,       // optional: /about -> out/about/index.html, easier on plain static hosts
  images: { unoptimized: true }, // or a custom loader; the default optimizer needs a server
  // basePath: "/my-repo",   // e.g. for GitHub Pages project sites
};

export default nextConfig;`,
      },
      {
        label: "Pages and a Route Handler that export cleanly",
        tech: "tsx",
        runnable: false,
        code: `// app/blog/[slug]/page.tsx — every dynamic path must be listed at build time
export function generateStaticParams() {
  return [{ slug: "hello" }, { slug: "world" }];
}

export default async function Post({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  return <h1>Post: {slug}</h1>;
}

// app/data.json/route.ts — a GET Route Handler becomes a static file (out/data.json)
export const dynamic = "force-static";

export function GET() {
  return Response.json({ name: "Lee" });
}

// app/ui/Clock.tsx — browser-only work happens after hydration
"use client";
import { useEffect, useState } from "react";

export default function Clock() {
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => setNow(new Date().toLocaleTimeString()), []);
  return <p>Local time: {now ?? "..."}</p>;
}`,
      },
    ],
  },
];

export default augments;
