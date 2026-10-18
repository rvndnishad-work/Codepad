/**
 * Next.js ULTRA — batch 15: project organization, Prisma connections, the RSC payload, security headers and nonce CSP,
 * streaming and Server-Sent Events from Route Handlers, multi-tenant subdomain routing, multi-instance self-hosting,
 * and Multi-Zones.
 * Verified sections quote real output from Next.js 16.4.2 lab apps (next build, next start, curl, Chromium via Playwright).
 * Generated from markdown parts by a build script; edit the parts, not this file, when regenerating.
 */
import type { NextAugment } from "./nextjs-augments.types";

const augments: NextAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you organize a large Next.js App Router project (colocation, private folders, route groups)?",
    seoDescription: "Organize a large App Router codebase with colocation, _private folders, (route groups) and feature folders. Rules and errors checked on Next.js 16.4.2.",
    description: `**Question presented to candidate:**
"Our Next.js app has grown to 200 routes and four teams. Files are everywhere. How would you structure the app directory so it stays navigable, and which Next.js conventions help?"

**What a strong answer should cover:**
- Only \`page\` and \`route\` files make a URL public, so components, tests and helpers can be colocated inside \`app/\` safely.
- Private folders (\`_components\`) opt a folder and everything under it out of routing; \`%5F\` creates a real URL segment that starts with an underscore.
- Route groups (\`(marketing)\`, \`(shop)\`) organize by section or team and attach different layouts without changing the URL.
- Multiple root layouts via groups cause a full page load when navigating between them; two groups resolving to the same path fail the build.
- A clear split between route code in \`app/\` and shared domain code (\`lib/\`, \`features/\`, a server-only data layer), plus an import alias like \`@/\`.

**Clarifying questions expected:**
- "Do sections need different root layouts (different html, fonts, providers)?" — that decides between one root layout and several.
- "Are teams split by feature or by layer?" — it decides whether to group folders by feature or keep shared code outside \`app/\`.

**Code / implementation expected:** Yes — a folder tree using route groups and private folders, and the layouts that go with them.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic React and App Router familiarity.
**Difficulty:** Medium

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.4.2 docs shipped with the package and, in the **Verified** section, against real output from a build, a running server or a real Chromium browser.

## 1. Why This Even Matters — A Story First

Imagine a department store where the shop floor and the stock room are the same room. Customers wander into boxes of unpacked stock, and staff cannot find anything. A good store keeps one rule: **only the shop floor has customer doors**. Behind those doors you can store whatever you like, and you can put up signs ("Menswear", "Kitchen") that help staff without changing the street address.

The Next.js App Router works the same way. The folders in \`app/\` define URLs, but a folder only gets a customer door when it contains a \`page\` or \`route\` file. Everything else in that folder is stock room: components, tests, helpers. On top of that, Next.js gives you two kinds of signs: **private folders** (\`_components\`) that say "staff only, never a door", and **route groups** (\`(shop)\`) that organize sections and attach a different look (a layout) without changing the address.

In a small app you never think about this. At 200 routes and four teams, it is the difference between "I know where that code lives" and a weekly argument about folders.

## 2. The Core Idea

Next.js is deliberately unopinionated about where your files go. The 16.4.2 project structure guide says so directly, and then lists the features it provides to help. There are four of them.

📌 **Interview term: Colocation** — keeping files that belong to a route (components, tests, styles, helpers) in that route folder inside \`app/\`. It is safe because a route is not publicly accessible until a \`page\` or \`route\` file is added, and only the content those files return is sent to the client.

📌 **Interview term: Private folder** — a folder whose name starts with an underscore, like \`_components\`. It opts the folder **and all its subfolders** out of routing, even if a file inside is called \`page.tsx\`.

📌 **Interview term: Route group** — a folder whose name is wrapped in parentheses, like \`(marketing)\`. It exists only for organization: it is left out of the URL, but it can hold its own \`layout\`, \`loading\` and \`error\` files for the routes inside it.

📌 **Interview term: Root layout** — the top layout that renders \`<html>\` and \`<body>\`. With route groups you can have several root layouts, one per group.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 330" role="img" aria-label="How folders in app map to URLs. Route groups vanish from the URL, private folders never become routes">
  <defs>
    <marker id="n15q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="26" text-anchor="middle">Folders in app/ and the URLs they produce (lab build)</text>
  <rect class="d-box-muted" x="24" y="50" width="270" height="56" rx="10"/>
  <text class="d-text" x="159" y="74" text-anchor="middle">(shop)/cart/page.tsx</text>
  <text class="d-sub" x="159" y="94" text-anchor="middle">group name is dropped</text>
  <rect class="d-box-muted" x="24" y="130" width="270" height="56" rx="10"/>
  <text class="d-text" x="159" y="154" text-anchor="middle">(shop)/_components/page.tsx</text>
  <text class="d-sub" x="159" y="174" text-anchor="middle">private folder, ignored</text>
  <rect class="d-box-muted" x="24" y="210" width="270" height="56" rx="10"/>
  <text class="d-text" x="159" y="234" text-anchor="middle">dashboard/charts/Chart.tsx</text>
  <text class="d-sub" x="159" y="254" text-anchor="middle">no page file, not a route</text>
  <path class="d-edge" d="M 298 78 L 380 78" marker-end="url(#n15q1-arrow)"/>
  <path class="d-edge d-edge-dashed" d="M 298 158 L 380 158" marker-end="url(#n15q1-arrow)"/>
  <path class="d-edge d-edge-dashed" d="M 298 238 L 380 238" marker-end="url(#n15q1-arrow)"/>
  <rect class="d-box-accent" x="388" y="50" width="248" height="56" rx="10"/>
  <text class="d-text d-accent" x="512" y="74" text-anchor="middle">/cart</text>
  <text class="d-sub" x="512" y="94" text-anchor="middle">200, shop layout applied</text>
  <rect class="d-box" x="388" y="130" width="248" height="56" rx="10"/>
  <text class="d-text" x="512" y="154" text-anchor="middle">/_components</text>
  <text class="d-sub" x="512" y="174" text-anchor="middle">404</text>
  <rect class="d-box" x="388" y="210" width="248" height="56" rx="10"/>
  <text class="d-text" x="512" y="234" text-anchor="middle">/dashboard/charts</text>
  <text class="d-sub" x="512" y="254" text-anchor="middle">404</text>
</svg>

So the URL is decided by the folders that are neither groups nor private, and a URL exists only where a \`page\` or \`route\` file sits. That one rule is what makes colocation safe.

## 3. Choosing a Structure That Scales

The docs show three common strategies. All three are valid; what matters is that the team picks one and writes it down.

| Strategy | What it looks like | Works well when |
| :--- | :--- | :--- |
| Project files **outside** \`app/\` | \`app/\` holds only routing files; code lives in \`components/\`, \`lib/\`, \`features/\` | Several routes share most code; you want \`app/\` to read like a sitemap |
| Top-level folders **inside** \`app/\` | \`app/_components\`, \`app/_lib\` next to the routes | Small to medium apps that like everything under one root |
| Split **by feature or route** | Shared code at the root, route-specific code colocated in the route folder | Large apps with clear feature ownership (the usual choice at scale) |

For a large codebase, a practical combination is:

- **\`app/\` is for routing.** Pages, layouts, \`loading\`, \`error\`, \`not-found\` and Route Handlers. The [special files](/interview-question/what-are-the-special-files-in-the-next-js-app-router-page-layout-loading-error) and [file-based routing](/interview-question/how-does-file-based-routing-work-in-the-next-js-app-router) rules live here.
- **Colocate what only one route uses** (a chart component, a route-specific query) inside that route folder, ideally under a private folder such as \`_components\` or \`_lib\` so the intent is obvious.
- **Move what several routes use** to \`features/<domain>/\` or \`components/ui/\` outside \`app/\`. A shared component inside one route folder becomes an accidental dependency for everyone else.
- **Keep server-only code behind a boundary.** Database clients and data-access functions go in files that start with \`import "server-only"\`, so a Client Component import fails at build time. See [keeping secrets out of the client bundle](/interview-question/how-do-you-keep-secrets-and-server-code-out-of-the-client-bundle-in-next-js-serv).
- **Use an import alias** (\`@/*\` mapped in \`tsconfig.json\`) so moving a folder does not mean rewriting \`../../../\` paths.
- **Optionally use \`src/\`** to separate application code from config files (\`next.config.ts\`, \`tsconfig.json\`) at the project root.

## 4. Route Groups: Organization and Layouts

[Route groups](/interview-question/what-are-route-groups-in-next-js-and-how-do-you-use-them) have two jobs. The first is purely organizational: \`(marketing)\`, \`(shop)\`, \`(admin)\` make the tree readable and map nicely to team ownership (a CODEOWNERS entry per group folder). The second is structural: a group can hold a \`layout.tsx\` that wraps only the routes inside it. That is how \`/pricing\` and \`/cart\`, both at the top URL level, get different navigation bars. See [nested layouts](/interview-question/what-are-layouts-in-next-js-and-how-do-nested-layouts-work) for how layouts compose.

Two caveats from the 16.4.2 route groups reference, both reproduced in the lab:

1. **Conflicting paths fail the build.** \`(marketing)/cart/page.tsx\` and \`(shop)/cart/page.tsx\` both resolve to \`/cart\`.
2. **Multiple root layouts mean full page loads.** If you delete \`app/layout.tsx\` and give each group its own root layout, navigating between groups reloads the document. Inside one group, navigation stays a soft navigation. The home page must then live inside one of the groups.

📌 **Interview term: Soft navigation vs hard navigation** — a soft navigation updates the page in place using the client router and keeps React state; a hard navigation is a full document load that throws state away.

## 5. Private Folders and the Underscore Edge Case

Private folders are not *required* for colocation, because non-page files are never routable anyway. The docs list why they are still useful: separating UI logic from routing logic, consistent organization across a project, sorting in code editors, and avoiding clashes with future Next.js file conventions (a file you call \`template.tsx\` today could collide with a convention tomorrow; inside \`_components\` it cannot).

The flip side: if you genuinely need a URL that starts with an underscore (\`/_health\` for a load balancer check), name the folder \`%5Fhealth\`, the URL-encoded underscore.

## 6. Verified — Lab App on Next.js 16.4.2

A lab app with \`(marketing)\` and \`(shop)\` groups, a \`(shop)/_components\` folder that even contains a \`page.tsx\`, colocated \`dashboard/_lib\` and \`dashboard/charts\` folders, an \`_internal/admin/page.tsx\`, and an \`app/%5Fhealth/route.ts\`. The \`next build\` route table lists only the real routes; the group names, private folders and colocated files are absent:

\`\`\`
Route (app)
┌ ○ /
├ ƒ /_health
├ ○ /_not-found
├ ○ /about
├ ○ /cart
├ ○ /dashboard
├ ○ /dashboard/settings
└ ○ /pricing


○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
\`\`\`

\`curl\` against \`next start\`, status code per path:

\`\`\`
/                          200
/about                     200
/cart                      200
/dashboard                 200
/_health                   200
/%5Fhealth                 404
/_components               404
/_internal/admin           404
/dashboard/_lib/format     404
/dashboard/charts          404
/shop/cart                 404
/(shop)/cart               404
\`\`\`

Each group layout wrapped only its own routes (HTML trimmed to the relevant part):

\`\`\`
/cart   -> <div data-section="shop"><nav>Shop nav</nav><main><h1>Cart</h1><p>3 ...
/about  -> <div data-section="marketing"><nav>Marketing nav</nav><h1>About</h1>
\`\`\`

Adding \`(marketing)/cart/page.tsx\` next to the existing \`(shop)/cart/page.tsx\` stopped the build (the lab directory prefix in the path is shortened):

\`\`\`
> Build error occurred
Error: Turbopack build failed with 1 error:
./app/(shop)
Error: You cannot have two parallel pages that resolve to the same path. Please check /(marketing)/cart and /(shop).
\`\`\`

Finally, a second lab app with **two root layouts** (\`(marketing)/layout.tsx\` and \`(shop)/layout.tsx\`, no \`app/layout.tsx\`) was driven in Chromium. A marker was stored on \`window\` before each click; if it survives, the navigation was soft:

\`\`\`
#to-pricing  -> /pricing  root=marketing  document requests=0 window marker=kept
#to-cart     -> /cart     root=shop       document requests=1 window marker=gone
#to-about    -> /about    root=marketing  document requests=1 window marker=gone
\`\`\`

Same root layout: no document request, state kept. Different root layout: a full document load, state lost, exactly as the docs warn.

## 7. Common Pitfalls

- **Organizing by file type at the top of \`app/\`.** A single \`app/components\` folder with 400 files recreates the mess you started with. Group by feature or route, and keep truly shared primitives in one design-system folder.
- **Shared code living inside one route folder.** If \`/checkout\` imports from \`app/cart/_components\`, the cart team can break checkout without knowing. Promote shared code to \`features/\` or \`components/\`.
- **Two groups claiming the same URL.** It is a build error, not a runtime surprise, but it often appears late when two teams add the same page name in different groups.
- **Using multiple root layouts casually.** Every cross-group navigation becomes a full reload. Use separate root layouts only when the sections truly need different \`<html>\` shells.
- **Forgetting the underscore rule.** A folder you named \`_status\` for a health check is silently never a route; use \`%5Fstatus\`.
- **No server/client boundary in the structure.** Mixing database code and client components in one folder invites accidental client imports. Mark server modules with \`import "server-only"\`.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">page</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">route</code> files create URLs, so I colocate components and tests next to the routes that use them, and use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">_folders</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(groups)</code> to make the structure explicit.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">A private folder like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">_components</code> opts itself and every subfolder out of routing; a route group like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(shop)</code> organizes routes and attaches a layout without appearing in the URL.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;">Big apps need a clear rule for where code lives: route code in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">app/</code>, shared domain code in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">features/</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lib/</code>, and server-only data access behind <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">import "server-only"</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;">Route groups are how you give sibling sections different layouts, and even several root layouts, at the same URL level.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">Two groups that resolve to the same path fail the build, and navigating between different root layouts is a full page load, which I measured as a new document request.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Are private folders required for colocation?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. A folder is only public if it has a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">page</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">route</code> file. Private folders make the intent explicit, keep editors sorted, and protect you from future special file names.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you create a URL that really starts with an underscore?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Name the folder <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">%5Fname</code>. In the lab, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">app/%5Fhealth/route.ts</code> answered at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/_health</code> with 200, while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/%5Fhealth</code> returned 404.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you use multiple root layouts?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When sections need different html, fonts or providers, for example a marketing site and an app. Each group gets its own root layout; remove the top-level one and put the home page inside a group.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you put components inside <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">app/</code> or outside it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both are supported. I colocate code used by one route, and move code used by several routes to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">features/</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">components/</code> outside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">app/</code>, so ownership is clear.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do route groups help with team ownership?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each team owns a group folder, for example <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(checkout)</code>, and a CODEOWNERS rule on that path. The URL structure stays independent of the team structure.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Colocation** | Keeping a route's components, tests and helpers in its folder |
| **Private folder** | \`_name\` folder; it and its subfolders are never routes |
| **Route group** | \`(name)\` folder; organizes routes and layouts, not in the URL |
| **Root layout** | The layout that renders html and body; groups can each have one |
| **Soft navigation** | In-place client navigation that keeps React state |
| **Hard navigation** | Full document load; happens between different root layouts |

---
**Conclusion:** A large App Router project stays manageable when \`app/\` reads like a sitemap and everything else has an obvious home. Colocation is safe because only \`page\` and \`route\` files create URLs; private folders make "not a route" explicit; route groups organize sections and attach layouts without touching the URL. The lab confirmed each rule, including the two sharp edges: duplicate paths across groups fail the build, and crossing between root layouts is a full page load. For splitting an app that has outgrown even this, see [Multi-Zones](/interview-question/what-are-multi-zones-in-next-js-and-when-would-you-split-an-app-into-zones).`,
    examples: [
      {
        label: "A feature-first layout for a large App Router project",
        tech: "bash",
        runnable: false,
        code: `src/
├── app/                          # routing only: URLs, layouts, loading and error UI
│   ├── layout.tsx                # one root layout (html, body, global providers)
│   ├── (marketing)/              # route group: not part of the URL
│   │   ├── layout.tsx            # marketing nav and footer
│   │   ├── page.tsx              # "/"
│   │   └── pricing/page.tsx      # "/pricing"
│   ├── (shop)/
│   │   ├── layout.tsx            # shop header with cart
│   │   ├── _components/          # private folder: never routable
│   │   │   └── CartSummary.tsx
│   │   ├── cart/page.tsx         # "/cart"
│   │   └── products/[id]/
│   │       ├── page.tsx          # "/products/:id"
│   │       ├── ProductGallery.tsx  # colocated, not routable (no page or route file name)
│   │       └── page.test.tsx       # colocated test
│   └── dashboard/
│       ├── _lib/queries.ts       # route-local server code
│       ├── layout.tsx
│       └── page.tsx              # "/dashboard"
├── features/                     # domain code shared by several routes
│   ├── billing/
│   │   ├── billing.server.ts     # import "server-only"
│   │   └── InvoiceTable.tsx
│   └── catalog/
├── components/ui/                # design system primitives
└── lib/                          # db client, auth helpers, env parsing

# tsconfig.json: "paths": { "@/*": ["./src/*"] }  so imports read "@/features/billing/..."`,
      },
      {
        label: "Route groups with their own layouts, plus a colocated private component",
        tech: "tsx",
        runnable: false,
        code: `// app/(shop)/layout.tsx: applies to /cart and /products/*, not to /pricing
import { CartSummary } from "./_components/CartSummary";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-section="shop">
      <header>
        Shop <CartSummary count={3} />
      </header>
      {children}
    </div>
  );
}

// app/(shop)/_components/CartSummary.tsx: private folder, so even a page.tsx here is ignored
export function CartSummary({ count }: { count: number }) {
  return <span>{count} items in cart</span>;
}

// app/(marketing)/layout.tsx: a different layout for the same URL level
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-section="marketing">
      <nav>Marketing nav</nav>
      {children}
    </div>
  );
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you use a database like Prisma in Next.js without exhausting connections?",
    seoDescription: "Use one Prisma client per process, size the pool per instance, and avoid hot-reload leaks. Measured with Prisma 7.10.1, Postgres and Next.js 16.4.2.",
    description: `**Question presented to candidate:**
"After moving our Next.js app to Prisma, Postgres started rejecting connections with 'too many connections', first on developer laptops and later in production with six containers. What is going on, and how do you set it up correctly?"

**What a strong answer should cover:**
- Every PrismaClient owns a connection pool; creating clients repeatedly multiplies pools.
- In \`next dev\`, edits re-evaluate server modules, so a module-level \`new PrismaClient()\` creates a new pool per edit; the \`globalThis\` singleton pattern fixes it.
- In production, total connections = instances (or serverless invocations) times pool size; size the pool so the sum stays under the database limit.
- Prisma 7 requires a driver adapter (for Postgres, \`@prisma/adapter-pg\`), so pool settings such as \`max\` and \`idleTimeoutMillis\` come from the \`pg\` driver.
- For serverless or many instances, put a pooler (PgBouncer, a managed pooler, Prisma Accelerate) in front of the database, and keep data access in server-only modules.

**Clarifying questions expected:**
- "How many instances run, and is it serverless?" — the connection math depends on it.
- "What is the database connection limit, and is a pooler already in place?"

**Code / implementation expected:** Yes — a \`lib/db.ts\` singleton with an explicit pool size, plus the connection budget arithmetic.`,
    answer: `**Target Audience:** Full-stack engineers preparing for Next.js interviews — assumes basic App Router and SQL familiarity.
**Difficulty:** Medium

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.4.2 docs shipped with the package, the Prisma 7 upgrade guide, and, in the **Verified** section, against real measurements: Prisma 7.10.1 with \`@prisma/adapter-pg\` against a local PostgreSQL 16 server, counting connections in \`pg_stat_activity\`.

## 1. Why This Even Matters — A Story First

A database is a restaurant with a fixed number of tables. Each table is a **connection**: opening one takes time (a handshake, authentication, memory on the server), so restaurants keep tables set and reuse them. Your app is a catering company that books a block of tables for its staff — a **connection pool**.

Now picture a catering company that, every time a manager edits the schedule, books a *fresh* block of five tables and forgets about the old ones. After a morning of edits, the restaurant is full of reserved, empty tables, and real customers are turned away. That is the classic Next.js plus Prisma bug in development.

In production the problem is arithmetic instead of forgetfulness: six catering vans, each booking ten tables, need sixty tables. During a deploy, old and new vans overlap and you briefly need 120. The restaurant has 100. Nothing is "leaking"; you simply asked for more than exists.

## 2. The Core Idea

📌 **Interview term: Connection pool** — a set of open database connections kept by your process and lent to queries one at a time. A query waits for a free connection when all are busy.

📌 **Interview term: PrismaClient** — the object you query through. Each instance owns its own pool, so two clients mean two pools.

📌 **Interview term: Driver adapter** — in Prisma 7, the client no longer talks to the database through its own engine connection handling; it requires a driver adapter that wraps a Node.js database driver. For Postgres that is \`@prisma/adapter-pg\`, which wraps \`pg\`. The [Prisma 7 upgrade guide](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7) states that adapters are now required and that pool behaviour comes from the underlying driver.

📌 **Interview term: Singleton client** — creating the client once per process and reusing it everywhere, usually by caching it on \`globalThis\` so it survives module re-evaluation in development.

📌 **Interview term: Connection pooler** — a separate service (PgBouncer, a managed pooler, Prisma Accelerate) that sits between many app processes and the database and multiplexes their connections onto a smaller number of real ones.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 300" role="img" aria-label="Connection math. Three instances with pools of five reach fifteen connections against a database limit of twelve">
  <defs>
    <marker id="n15q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="26" text-anchor="middle">Total connections = instances x pool max (lab)</text>
  <rect class="d-box-muted" x="24" y="50" width="220" height="56" rx="10"/>
  <text class="d-text" x="134" y="74" text-anchor="middle">instance A</text>
  <text class="d-sub" x="134" y="94" text-anchor="middle">one PrismaClient, max 5</text>
  <rect class="d-box-muted" x="24" y="126" width="220" height="56" rx="10"/>
  <text class="d-text" x="134" y="150" text-anchor="middle">instance B</text>
  <text class="d-sub" x="134" y="170" text-anchor="middle">one PrismaClient, max 5</text>
  <rect class="d-box-muted" x="24" y="202" width="220" height="56" rx="10"/>
  <text class="d-text" x="134" y="226" text-anchor="middle">instance C</text>
  <text class="d-sub" x="134" y="246" text-anchor="middle">one PrismaClient, max 5</text>
  <path class="d-edge" d="M 248 78 L 400 140" marker-end="url(#n15q2-arrow)"/>
  <path class="d-edge" d="M 248 154 L 400 154" marker-end="url(#n15q2-arrow)"/>
  <path class="d-edge" d="M 248 230 L 400 168" marker-end="url(#n15q2-arrow)"/>
  <rect class="d-box-accent" x="408" y="106" width="228" height="96" rx="10"/>
  <text class="d-text d-accent" x="522" y="134" text-anchor="middle">PostgreSQL</text>
  <text class="d-sub" x="522" y="158" text-anchor="middle">limit 12 for the role</text>
  <text class="d-sub" x="522" y="180" text-anchor="middle">15 wanted: error 53300</text>
</svg>

The fix is never "more clients". It is one client per process, a pool size chosen from a budget, and a pooler when the number of processes is large or unpredictable.

## 3. Problem One: Development Hot Reload

In \`next dev\`, when you edit a server file, Next.js re-evaluates the changed modules. If \`lib/db.ts\` does \`export const prisma = new PrismaClient(...)\` at module level, each re-evaluation constructs a new client with a new pool, and the old pool is not closed. The fix is the pattern in the example: look for an existing client on \`globalThis\` first, and store the new one there outside production. \`globalThis\` is the same object across module re-evaluations in one process, so the client survives.

The guard \`if (process.env.NODE_ENV !== "production")\` is there because production does not need it (modules load once per process), and leaving a global out of production avoids surprising state in tests that run in the same process.

One nuance the lab exposed: with Prisma 7 and \`adapter-pg\`, the leaked pools are \`pg\` pools, and \`pg\` closes idle connections after 10 seconds by default. So a dev leak can look like it "fixes itself" when you pause, and then reappears during a burst of edits. Set \`idleTimeoutMillis: 0\` (or have long-running queries) and the leak grows without bound, which is closer to what people saw with older Prisma versions.

## 4. Problem Two: Production Arithmetic

In production each \`next start\` process (each container, each pod) has exactly one client if you follow the singleton pattern. The total connection count is then:

| Deployment | Formula | Example |
| :--- | :--- | :--- |
| Long-running servers | instances x \`max\` | 6 x 10 = 60 |
| Rolling deploy overlap | (old + new instances) x \`max\` | 12 x 10 = 120 |
| Serverless functions | concurrent invocations x \`max\` | 200 x 5 = 1000 |

Rules of thumb that follow from the table:

- **Choose \`max\` from the budget**, not the other way round: \`max = floor((db_limit - headroom) / peak_instances)\`. Headroom covers migrations, admin sessions, cron jobs and monitoring.
- **Count the deploy overlap.** A rolling deploy or a blue/green switch runs both versions for a while. See [self-hosting across multiple instances](/interview-question/how-do-you-self-host-next-js-across-multiple-instances-cache-handlers-isr-build-).
- **Serverless needs a pooler.** Each warm function has its own pool, and the platform decides how many run. Put PgBouncer or a managed pooler in front, use \`max\` of 1 or 2 per function, and run migrations against a direct URL.
- **Waiting is better than failing.** When all pool connections are busy, extra queries queue inside the process. In the lab, one instance with \`max: 5\` served 50 concurrent requests by queuing, at the cost of latency, and never exceeded five connections.

## 5. Where the Client Lives in a Next.js App

- **Only on the server.** Use the client in Server Components, Server Actions, [Route Handlers](/interview-question/what-are-route-handlers-in-next-js-and-how-do-they-differ-from-pages-api-routes) and other server-only modules. Start \`lib/db.ts\` with \`import "server-only"\` so a Client Component import fails the build; see the [data access layer](/interview-question/how-do-you-keep-secrets-and-server-code-out-of-the-client-bundle-in-next-js-serv) pattern.
- **Node.js runtime.** \`pg\` uses Node sockets, and the 16.4.2 Edge runtime docs say native Node.js APIs are not supported. Keep database routes on the default Node.js runtime; see [Node.js vs Edge](/interview-question/what-runtimes-does-next-js-support-node-js-vs-edge-runtime).
- **Deduplicate reads within a request** with React \`cache()\` or the framework caches, so a layout and a page asking for the same user do not run two queries. See [request memoization](/interview-question/what-is-request-memoization-in-next-js).
- **Release connections promptly.** Long interactive transactions hold a connection for their whole duration; keep them short. The general Node.js pattern is in [database transactions and connection leaks](/interview-question/how-do-database-transactions-work-in-node-js-and-how-do-you-avoid-connection-lea).

## 6. Verified — Prisma 7.10.1, PostgreSQL 16, Next.js 16.4.2

Setup: a throwaway database \`n15lab\`, a Prisma 7.10.1 schema with the \`prisma-client\` generator, and \`@prisma/adapter-pg\`. Two modules: \`lib/db-naive.ts\` (module-level \`new PrismaClient\`) and \`lib/db.ts\` (the \`globalThis\` singleton). Each test page ran five queries in parallel so a pool would open all five connections. Connections were counted with \`select count(*) from pg_stat_activity where datname='n15lab'\`.

**Development, \`next dev\`, appending a comment to the db module between requests:**

\`\`\`
naive: first request -> 5 connections
naive: after edit 1 -> 10 connections
naive: after edit 2 -> 15 connections
naive: after edit 3 -> 15 connections
naive: after edit 4 -> 15 connections
naive: 12 s idle -> 0
single: first request -> 5 connections
single: after edit 1 -> 5 connections
single: after edit 2 -> 5 connections
single: after edit 3 -> 5 connections
single: after edit 4 -> 5 connections
single: 12 s idle -> 0
\`\`\`

The naive version plateaued at 15 because old pools closed their idle connections after the \`pg\` default of 10 seconds. With \`idleTimeoutMillis: 0\` on the naive pool, the leak kept growing:

\`\`\`
first request -> 5
after edit 1 -> 10 connections
after edit 2 -> 15 connections
after edit 3 -> 20 connections
after edit 4 -> 25 connections
after edit 5 -> 30 connections
after edit 6 -> 35 connections
after dev server stopped: 0
\`\`\`

**Production, \`next start\`, a Route Handler holding a connection for 200 ms (\`SELECT pg_sleep(0.2)::text\`):**

\`\`\`
1 instance, DB_POOL_MAX=5
100 requests, concurrency 50, ports 4191: ok=100 failed=0 {} in 4422 ms
peak connections (1 instance, pool max 5): 5
right after: 5
12 s later: 0
\`\`\`

100 requests x 200 ms over five connections is about 4 seconds, which is what the run took: requests queued in the pool instead of opening connections.

\`\`\`
3 instances, DB_POOL_MAX=5
150 requests, concurrency 60, ports 4191,4192,4193: ok=150 failed=0 {} in 2398 ms
peak (3 instances x max 5): 15
\`\`\`

Then the same three instances connected as a role with \`CONNECTION LIMIT 12\` (the superuser is exempt from limits, so a separate lab role was used):

\`\`\`
150 requests, concurrency 60, ports 4191,4192,4193: ok=110 failed=40 {"500":40} in 2457 ms
peak (3 x 5 against role limit 12): 12
     40 Raw query failed. Code: \`53300\`. Message: \`too many connections for role "n15lab_user"\`
     40 driverAdapterError: Error [DriverAdapterError]: TooManyConnections
\`\`\`

And with the pool sized from the budget (3 x 4 = 12):

\`\`\`
150 requests, concurrency 60, ports 4191,4192,4193: ok=150 failed=0 {} in 2997 ms
peak (3 x 4 against role limit 12): 12
\`\`\`

Slightly slower, zero failures. One unrelated Prisma 7 detail surfaced along the way: \`$queryRaw\` refused a \`void\` column (\`pg_sleep\` returns void) with \`Failed to deserialize column of type 'void'\`, so the query casts to text.

Not verified here: PgBouncer, managed poolers, Prisma Accelerate and real serverless platforms. The serverless arithmetic above is a model, not a measurement. The database and lab role were dropped after the run.

## 7. Common Pitfalls

- **\`new PrismaClient()\` in many files.** Every module that constructs a client adds a pool. Export one client from one module.
- **Forgetting the \`globalThis\` guard in development.** The symptom is "too many connections" on laptops after a while of editing, or slow queries as the database juggles idle sessions.
- **Pool size copied from a blog post.** \`max\` must come from the database limit and the number of processes, including the deploy overlap.
- **Assuming the singleton fixes serverless.** It only helps inside one warm instance; concurrency multiplies pools.
- **Prisma 6 habits on Prisma 7.** Pool settings now belong to the driver adapter; the upgrade guide notes the \`pg\` connection timeout default is 0 (no timeout), where v6 used 5 seconds, so set timeouts explicitly.
- **Database calls from client code or the Edge runtime.** Keep them in server-only modules on the Node.js runtime.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Each PrismaClient owns a connection pool, so the rule is one client per server process, created in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lib/db.ts</code> module and reused everywhere.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">In <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next dev</code>, editing a file re-evaluates server modules; a module-level <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new PrismaClient()</code> makes a new pool each time, so I cache the client on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">globalThis</code> outside production.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;">In production the real number is instances times pool size: three instances with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max: 5</code> opened 15 connections in my lab, and against a limit of 12 that produced Postgres error 53300.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;">Prisma 7 talks to Postgres through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@prisma/adapter-pg</code>, so the pool is the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pg</code> pool: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">idleTimeoutMillis</code> and timeouts are driver options, not URL parameters.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">For serverless or large fleets a singleton is not enough; put a pooler like PgBouncer in front and keep each function pool tiny.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the leak happen only in development?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Production loads each module once per process. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next dev</code> re-evaluates changed modules, so every edit to the file that calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new PrismaClient()</code> runs it again. In the lab, connections went 5, 10, 15 after three edits.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did the leak stop growing at 15 in your first run?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pg</code> pool closes idle connections after 10 seconds by default, so the oldest pools drained. With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">idleTimeoutMillis: 0</code> it grew by 5 per edit up to 35 after six edits.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does the singleton help in serverless?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only within one warm instance. Many concurrent instances each have their own pool, so you need a small <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max</code> per instance and an external pooler.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where should database calls live?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In server-only modules: Server Components, Server Actions, Route Handlers and a data access layer marked with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">import "server-only"</code>, never in Client Components.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you query Postgres from the Edge runtime with Prisma?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not with a TCP driver like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pg</code>. The 16.4.2 Edge runtime docs say native Node.js APIs are not supported, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pg</code> needs Node sockets. Use the Node.js runtime, or an HTTP-based driver or service.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Connection pool** | Reusable open connections kept by one process |
| **PrismaClient** | The query object; each instance owns a pool |
| **Driver adapter** | Prisma 7 bridge to a Node driver such as \`pg\` |
| **Singleton client** | One client per process, cached on \`globalThis\` in dev |
| **Connection pooler** | Service multiplexing many app connections onto few database ones |
| **Connection budget** | instances x pool max, kept under the database limit |

---
**Conclusion:** Prisma does not exhaust connections by itself; creating many clients, or running many processes with large pools, does. One client per process (cached on \`globalThis\` so \`next dev\` reloads reuse it), a pool size derived from the database limit and the real number of processes, and a pooler for serverless or large fleets cover almost every case. The lab showed each failure mode with real numbers: 5 then 10 then 15 connections from hot reloads, and Postgres error 53300 when three pools of five met a limit of twelve. In Prisma 7 those pool settings live on the \`pg\` adapter, so treat them as driver configuration. For where this code should live, see [Server Components data fetching](/interview-question/how-do-you-fetch-data-in-next-js-server-components).`,
    examples: [
      {
        label: "lib/db.ts: one Prisma 7 client per process with an explicit pool size",
        tech: "ts",
        runnable: false,
        code: `// lib/db.ts
import "server-only";
import { PrismaClient } from "@/generated/prisma/client"; // output of the "prisma-client" generator
import { PrismaPg } from "@prisma/adapter-pg";

function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    // Connections per server process. Budget: instances x max < database limit.
    max: Number(process.env.DB_POOL_MAX ?? 5),
    // pg default is 10 s; idle connections are closed and reopened on demand.
    idleTimeoutMillis: 10_000,
  });
  return new PrismaClient({ adapter });
}

// One client per process. In next dev the module is re-evaluated on every edit,
// but globalThis survives, so the same client (and pool) is reused.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;`,
      },
      {
        label: "Using it from a Server Component and a Route Handler",
        tech: "tsx",
        runnable: false,
        code: `// app/posts/page.tsx: a Server Component reading through the shared client
import { connection } from "next/server";
import { prisma } from "@/lib/db";

export default async function Posts() {
  await connection(); // render per request; data changes often
  const posts = await prisma.post.findMany({ take: 20, orderBy: { id: "desc" } });
  return (
    <ul>
      {posts.map((p) => (
        <li key={p.id}>{p.title}</li>
      ))}
    </ul>
  );
}

// app/api/posts/route.ts: a Route Handler using the same client
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const { title } = await request.json();
  const post = await prisma.post.create({ data: { title } });
  return Response.json(post, { status: 201 });
}`,
      },
      {
        label: "Connection budget arithmetic for a deployment",
        tech: "bash",
        runnable: false,
        code: `# Connection budget: keep the sum below the database limit, with headroom
# for migrations, admin tools and a deploy that briefly runs old + new instances.

# Postgres limit (lab server default)
psql -tc "show max_connections"        # 100

# Long-running containers: instances x pool max
#   6 containers x DB_POOL_MAX=10 = 60   (ok)
#   during a rolling deploy 12 x 10 = 120 (over!)  -> use 6, or add a pooler

# Serverless: concurrent invocations x pool max
#   200 concurrent functions x max 5 = 1000 -> needs PgBouncer / a managed pooler,
#   and max 1-2 per function

# Prisma 7 + PgBouncer (transaction mode): point DATABASE_URL at the pooler at runtime,
# and run migrations against a direct URL (in prisma.config.ts) instead.`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the RSC payload and how does Next.js stream it to the browser?",
    seoDescription: "The RSC payload is the serialized Server Component tree. See real rows, the self.__next_f HTML stream, RSC: 1 navigations and _rsc, on Next.js 16.4.2.",
    description: `**Question presented to candidate:**
"When a user clicks a link in an App Router app, the network tab shows a request returning something that is not HTML and not JSON. What is that response, what is inside it, and how does the first page load get the same data?"

**What a strong answer should cover:**
- The RSC payload is React's serialized output of the Server Component tree: rendered elements, references to Client Component modules, and the props passed to them.
- It is a line-based stream of rows (\`id:value\`) that can reference rows not yet sent, which is how Suspense content arrives later in the same response.
- On the first load it is inlined into the HTML as \`self.__next_f.push(...)\` scripts next to the streamed HTML; on client navigation it is fetched alone with the \`RSC: 1\` header and \`text/x-component\` content type.
- The \`_rsc\` query parameter and the \`Vary\` header keep caches from mixing HTML and RSC variants; Next.js 16 redirects requests with a wrong \`_rsc\` hash.
- Consequences: everything passed to Client Components is visible in the payload, data is shipped twice on first load (HTML plus payload), and buffering proxies break streaming.

**Clarifying questions expected:**
- "Is this about the first page load or client-side navigation?" — the transport is different.
- "Is there a CDN or proxy in front?" — header forwarding and buffering decide whether it works.

**Code / implementation expected:** Optional — capturing the payload with \`curl -H 'RSC: 1'\` and reading a few rows.`,
    answer: `**Target Audience:** Frontend engineers preparing for senior Next.js interviews — assumes React Server Components and Suspense basics.
**Difficulty:** Hard

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.4.2 docs shipped with the package and, in the **Verified** section, against bytes captured from a running 16.4.2 server with \`curl\`, a streaming \`fetch\` script and a real Chromium browser.

## 1. Why This Even Matters — A Story First

Think of flat-pack furniture. The factory (the server) does the heavy cutting and drilling, then ships you two things: a **photo of the finished wardrobe** so you know what it looks like straight away, and an **assembly sheet** that says "panel A goes here, the hinge from bag 3 goes there". The photo is the HTML. The assembly sheet is the RSC payload: it describes exactly what the server built, and it says which pieces need your own hands (the interactive Client Components) and with which settings.

On your first order you get both in the same box, so the wardrobe appears instantly and then becomes usable. When you later order a new drawer, the factory sends only a new assembly sheet; you already have the tools, so no photo is needed. And if one part is delayed, the factory ships the rest now and mails that part later, with a note on the sheet saying "slot 14 coming soon".

## 2. The Core Idea

📌 **Interview term: RSC payload** — the serialized output of rendering a React Server Component tree. The 16.4.2 glossary describes it as a compact representation containing the rendered result of Server Components, placeholders for Client Components, and the props passed between them.

📌 **Interview term: React Flight** — the name of React's wire format for that payload. It is a stream of **rows**, each \`id:value\`, where values can reference other rows by id. The content type Next.js sends is \`text/x-component\`.

📌 **Interview term: Client reference** — a row (\`I[...]\`) that does not contain a Client Component's code, only where to find it: a module id, the JavaScript chunks to load, and the export name.

📌 **Interview term: Lazy reference** — a value like \`"$L14"\` meaning "row 14 will arrive later". This is how a Suspense boundary's content can be sent after the rest of the page, in the same response.

The payload is used in two different ways, which is where most of the interview depth is:

<svg class="iq-diagram" width="100%" viewBox="0 0 660 336" role="img" aria-label="How the RSC payload travels. First load: HTML stream with inlined payload scripts. Client navigation: payload only, fetched with the RSC header">
  <defs>
    <marker id="n15q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="26" text-anchor="middle">One render, two transports (lab measurements)</text>
  <rect class="d-box-accent" x="230" y="48" width="200" height="56" rx="10"/>
  <text class="d-text d-accent" x="330" y="72" text-anchor="middle">Server render</text>
  <text class="d-sub" x="330" y="92" text-anchor="middle">Server Component tree</text>
  <path class="d-edge" d="M 290 108 L 170 158" marker-end="url(#n15q3-arrow)"/>
  <path class="d-edge" d="M 370 108 L 490 158" marker-end="url(#n15q3-arrow)"/>
  <rect class="d-box-muted" x="24" y="164" width="290" height="120" rx="10"/>
  <text class="d-text" x="169" y="190" text-anchor="middle">First load: text/html</text>
  <text class="d-sub" x="169" y="216" text-anchor="middle">HTML plus self.__next_f.push rows</text>
  <text class="d-sub" x="169" y="240" text-anchor="middle">chunk 1 at 123 ms, fallback shown</text>
  <text class="d-sub" x="169" y="264" text-anchor="middle">Suspense rows at 1590 ms</text>
  <rect class="d-box-muted" x="346" y="164" width="290" height="120" rx="10"/>
  <text class="d-text" x="491" y="190" text-anchor="middle">Navigation: text/x-component</text>
  <text class="d-sub" x="491" y="216" text-anchor="middle">rsc: 1 and an _rsc hash</text>
  <text class="d-sub" x="491" y="240" text-anchor="middle">chunk 1 at 113 ms, 3396 bytes</text>
  <text class="d-sub" x="491" y="264" text-anchor="middle">row 14 at 1607 ms, 120 bytes</text>
</svg>

On the first load the browser needs pixels immediately, so it gets HTML; the payload rides along inside it for hydration. On a client-side navigation the browser already has React and the app's JavaScript, so the router asks for the payload alone and patches the tree.

## 3. Reading a Real Payload

These rows come from the lab page in the examples (a Server Component page, a \`LikeButton\` Client Component with \`initial={7}\`, and a \`Reviews\` component that waits 1.5 s inside \`<Suspense>\`). Rows are trimmed; the full capture is in the Verified section.

\`\`\`
3:I[16605,["$2"],"default"]
13:I[61265,["$2","$12"],"default"]
8:["$","main",null,{"children":[["$","h1",null,{"children":"Kettle"}],["$","$L13",null,{"initial":7}],["$","$a",null,{"fallback":["$","p",null,{"children":"Loading reviews..."}],"children":"$L14"}]]}]
14:["$","ul",null,{"children":[["$","li",null,{"children":"Great kettle"}],["$","li",null,{"children":"Boils fast"}]]}]
\`\`\`

| Fragment | Meaning |
| :--- | :--- |
| \`["$","main",null,{...}]\` | A React element: type \`main\`, key \`null\`, props. Server Components are already gone; only their output remains |
| \`13:I[61265,["$2","$12"],"default"]\` | Client reference: module 61265, load the chunks listed in rows 2 and 12, use the \`default\` export (the \`LikeButton\`) |
| \`["$","$L13",null,{"initial":7}]\` | Render the client module from row 13 with props \`{initial: 7}\`; the prop is plain, readable data |
| \`"$a"\` | Points at row \`a\`, which is \`"$Sreact.suspense"\`, the Suspense symbol |
| \`"children":"$L14"\` | The Suspense content is row 14, not sent yet |
| \`14:[...]\` | Row 14, which arrived about 1.5 s after the first chunk |
| \`"$undefined"\` | A serialized \`undefined\`, which JSON cannot express |

The first row the client reads, \`0:{...}\`, also carries router metadata; in the lab it included \`"b":"ng-Ump4ctrDBgteBbaZUP"\`, the same string as \`.next/BUILD_ID\`, which lets the client notice it is talking to a different build. Exact row ids and field names are an internal format and change between versions, so in an interview describe the shape, not the ids.

## 4. The First Load: Two Streams in One Response

The 16.4.2 streaming guide describes two streams working together on the initial load: React's server renderer produces progressive HTML (layouts and Suspense fallbacks first), and the component payload is embedded in that HTML stream. In the captured HTML:

1. The first chunk contains the shell: \`<h1>Kettle</h1>\`, the server-rendered button \`Like 7\`, and the fallback \`<template id="B:0"></template><p>Loading reviews...</p>\`, plus \`<script>self.__next_f.push([1,"1:\\"$Sreact.fragment\\"\\n..."])</script>\` with the payload rows known so far.
2. When \`Reviews\` resolves, a later chunk carries \`<script>self.__next_f.push([1,"15:[...ul...]"])</script>\`, the hidden finished HTML \`<div hidden id="S:0"><ul>...</ul></div>\`, and an inline script ending in \`$RC("B:0","S:0")\` that swaps the fallback for the content.

The swap happens as soon as that chunk is parsed, before the page's JavaScript has even loaded; hydration later attaches React to the result using the payload. See [loading.js and Suspense streaming](/interview-question/what-is-loading-js-in-next-js-and-how-does-suspense-streaming-work) and [hydration](/interview-question/what-is-hydration-in-next-js-and-what-causes-a-hydration-error).

📌 **Interview term: \`self.__next_f\`** — the global array Next.js pushes payload chunks into from inline scripts during the first load; the client runtime reads it to rebuild the same stream it would have fetched.

## 5. Client Navigation: \`RSC: 1\`, \`_rsc\` and \`Vary\`

When a \`<Link>\` is clicked or prefetched, the router sends a GET to the target URL with an \`rsc: 1\` header and a few router headers (\`next-router-state-tree\` describing what the client already has, \`next-router-prefetch\` and \`next-router-segment-prefetch\` for prefetches). The response is the payload only. The router merges it into its tree and [Router Cache](/interview-question/what-is-the-router-cache-in-next-js-and-what-are-its-implications); see [client-side navigation](/interview-question/how-does-client-side-navigation-work-in-next-js-next-link-and-userouter) and [prefetching](/interview-question/how-does-prefetching-and-navigation-caching-work-in-next-js-16).

Because the same URL can now return HTML or several payload variants, caches must not mix them up:

- The response has \`Vary: rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch, Accept-Encoding\`.
- Many CDNs ignore \`Vary\`, so the URL also carries \`_rsc=<hash>\`. The 16.4.2 CDN caching guide describes it as a hash of the relevant request header values that acts as a cache key, and says that by default a request arriving without the correct \`_rsc\` value gets a **307 redirect** to the URL with the correct hash (configurable with \`experimental.validateRSCRequestHeaders\`).
- A CDN must forward the \`rsc\` header and keep \`_rsc\` in the cache key; if it strips \`rsc\`, the server returns HTML where the router expected a payload and navigation degrades to full page loads.

Static routes have their payload precomputed: \`next build\` wrote \`index.rsc\` and an \`index.segments/\` folder (with \`_tree.segment.rsc\`, \`__PAGE__.segment.rsc\`, \`_full.segment.rsc\`) next to \`index.html\`, and the server answered an RSC request for \`/\` with \`x-nextjs-cache: HIT\`.

## 6. Verified — Next.js 16.4.2 Lab

**Build:** \`/\` static, \`/product\` dynamic (\`await connection()\`).

**1. A bare \`curl -H 'RSC: 1' /product\` is redirected:**

\`\`\`
HTTP/1.1 307 Temporary Redirect
location: /product?_rsc
\`\`\`

**2. Following it returns the payload** (headers without Date and keep-alive lines; the long row \`0\` is shortened here):

\`\`\`
HTTP/1.1 200 OK
Vary: rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch, Accept-Encoding
Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate
Content-Type: text/x-component
Transfer-Encoding: chunked

1:"$Sreact.fragment"
2:"/_next/static/chunks/3llsynidnul7a.js"
3:I[16605,["$2"],"default"]
4:I[34540,["$2"],"default"]
9:I[77605,["$2"],"OutletBoundary"]
a:"$Sreact.suspense"
...
0:{"q":"","i":false,"S":false,"r":"$undefined","b":"ng-Ump4ctrDBgteBbaZUP","t":{...}}
12:"/_next/static/chunks/3et8qltlq7iuf.js"
13:I[61265,["$2","$12"],"default"]
8:["$","main",null,{"children":[["$","h1",null,{"children":"Kettle"}],["$","$L13",null,{"initial":7}],["$","$a",null,{"fallback":["$","p",null,{"children":"Loading reviews..."}],"children":"$L14"}]]}]
e:[["$","meta","0",{"charSet":"utf-8"}],["$","meta","1",{"name":"viewport","content":"width=device-width, initial-scale=1"}]]
b:null
11:[]
14:["$","ul",null,{"children":[["$","li",null,{"children":"Great kettle"}],["$","li",null,{"children":"Boils fast"}]]}]
\`\`\`

Total size 3516 bytes. \`.next/BUILD_ID\` contained \`ng-Ump4ctrDBgteBbaZUP\`, matching \`"b"\`.

**3. Chunk timing**, read with a streaming \`fetch\` (curl buffers, as the streaming guide warns):

\`\`\`
payload (rsc: 1)
status 200 at 111 ms, content-type text/x-component
chunk 1 +  113 ms   3396 bytes | 1:"$Sreact.fragment"\\n2:"/_next/static/chunks/3llsynidnul7a.js"\\n...
chunk 2 + 1607 ms    120 bytes | 14:["$","ul",null,{"children":[["$","li",null,{"children":"Great kettle"}],...
done at 1609 ms

HTML (no rsc header)
status 200 at 121 ms, content-type text/html; charset=utf-8
chunk 1 +  123 ms   5486 bytes | <!DOCTYPE html><html lang="en"><head><meta charSet="utf-8"/>...
chunk 2 + 1590 ms    186 bytes | <script>self.__next_f.push([1,"15:[\\"$\\",\\"ul\\",null,{\\"children\\":[[\\"$\\",\\"li\\",...
chunk 3 + 1592 ms    952 bytes | <div hidden id="S:0"><ul><li>Great kettle</li><li>Boils fast</li></ul></div><script>$RB=[];...
done at 1592 ms
\`\`\`

The HTML body of the first chunk (trimmed):

\`\`\`
<main><h1>Kettle</h1><button>Like <!-- -->7</button><!--$?--><template id="B:0"></template><p>Loading reviews...</p><!--/$--></main>
<script>(self.__next_f=self.__next_f||[]).push([0])</script>
<script>self.__next_f.push([1,"1:\\"$Sreact.fragment\\"\\n2:\\"/_next/static/chunks/3llsynidnul7a.js\\"\\n3:I[16605,...
\`\`\`

and the last chunk ends with \`$RC("B:0","S:0")</script></body></html>\`.

**4. What a real browser sends.** Chromium (Playwright) loaded \`/\` and clicked a \`<Link href="/product">\`:

\`\`\`
GET /product?_rsc=5CB68i4pnAekjehf
   rsc: 1
   next-router-segment-prefetch: /_tree
   next-router-prefetch: 1
   next-url: /
   <- 200 text/x-component
GET /product?_rsc=tXyZJ52UQVBCVsD3
   rsc: 1
   next-router-prefetch: 1
   next-router-state-tree: %5B%22%22%2C%7B%7D%2Cnull%2C%22metadata-only%22%5D
   next-url: /
   <- 200 text/x-component
--- click ---
GET /product?_rsc=S9y80EUYyHvD_hog
   rsc: 1
   next-router-state-tree: %5B%22%22%2C%7B%22children%22%3A%5B%22product%22%2C%7B%22children%22%3...
   next-url: /
   <- 200 text/x-component
\`\`\`

Two prefetch requests (a tree prefetch and a metadata prefetch, because the page is dynamic) on load, then one navigation request on click, each with a different \`_rsc\` hash. No document request was made.

**5. Static route payload:** \`curl -H 'RSC: 1' "/?_rsc"\` answered \`x-nextjs-cache: HIT\`, \`x-nextjs-prerender: 1\`, \`x-nextjs-stale-time: 300\`, \`Cache-Control: s-maxage=31536000\`, \`Content-Type: text/x-component\`.

Not verified here: behaviour behind a real CDN, and the exact meaning of every internal row field (for example rows \`6:X\` and \`6:C\`); those are implementation details the docs do not specify.

## 7. Common Pitfalls

- **Passing secrets or whole records to Client Components.** The lab payload contained \`{"initial":7}\` in plain text. Anything passed as a prop crosses the network; see [passing data to Client Components](/interview-question/how-do-you-pass-data-from-server-components-to-client-components-in-next-js) and [keeping secrets out of the client](/interview-question/how-do-you-keep-secrets-and-server-code-out-of-the-client-bundle-in-next-js-serv).
- **Huge props.** On the first load the data appears twice, once as HTML and once in the payload. Pass IDs and small view models, not 2 MB arrays.
- **A CDN that strips \`rsc\` or \`_rsc\`.** Navigation gets HTML instead of a payload, or a cached HTML response is served to the router. Forward the header and keep the query parameter in the cache key.
- **Buffering proxies.** nginx buffers by default; without \`X-Accel-Buffering: no\` the late Suspense rows arrive together with everything else and streaming is lost.
- **Testing streaming with plain \`curl\`.** It buffers output by default; read the body with a stream (as in the examples) or use \`curl -N\` and expect line buffering.
- **Treating the format as an API.** Row ids and fields are internal; never parse the payload in application code.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">The RSC payload is React's serialized result of rendering Server Components: plain elements, references to Client Component modules, and the props passed to them. Its content type is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">text/x-component</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">It is a stream of rows like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">8:["$","main",...]</code> that can point at rows not sent yet with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$L14</code>; when the Suspense child finishes, row 14 arrives later in the same response.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;">On first load it rides inside the HTML as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">self.__next_f.push</code> scripts next to the streamed HTML, so React can hydrate; on client navigation the router fetches only the payload with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RSC: 1</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;">Caches must keep variants apart: the response has <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Vary: rsc, next-router-state-tree, ...</code> and the URL carries an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">_rsc</code> hash; in 16.4 a wrong hash gets a 307 to the right one.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">Everything passed to a Client Component is readable in the payload, and on first load data is sent twice (HTML and payload), so pass small, non-secret props.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is the RSC payload the same as JSON?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It is React Flight: newline-separated rows with ids, typed references like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$L</code> (lazy), <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$@</code> (promise) and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">I</code> (client module import), and it can stream out of order.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the HTML contain the data twice?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The HTML is for the first paint; the inlined payload is what React needs to hydrate and to keep the tree in sync. In the lab the first HTML chunk was 5486 bytes and the payload alone was 3516.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does the <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">_rsc</code> parameter do?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is a hash of the router request headers, used as a cache key so CDNs that ignore <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Vary</code> still keep HTML and RSC variants apart. A request whose hash does not match gets a 307 to the correct one.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Are static pages also served as payloads?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next build</code> writes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.rsc</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.segments</code> files next to the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.html</code>; a navigation to a static page got <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x-nextjs-cache: HIT</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">text/x-component</code> in the lab.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What breaks streaming of the payload?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Anything that buffers: an nginx proxy without <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">X-Accel-Buffering: no</code>, some CDNs or load balancers, or compression that waits for large blocks.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **RSC payload** | Serialized Server Component output plus client references and props |
| **React Flight** | The row-based streaming format of that payload |
| **Client reference** | \`I[...]\` row naming a Client Component module and its chunks |
| **Lazy reference** | \`$L<id>\`: this part arrives later in the stream |
| **\`self.__next_f\`** | Array the inline scripts push payload chunks into on first load |
| **\`_rsc\`** | Query hash that keeps HTML and payload variants apart in caches |

---
**Conclusion:** The RSC payload is the assembly sheet of an App Router page: rendered Server Component output, references to Client Component modules, and the props they need, streamed as rows that can arrive out of order so Suspense content follows later in the same response. On the first load it travels inside the HTML through \`self.__next_f.push\` scripts; on navigation the router fetches it alone with \`RSC: 1\`, protected from cache mix-ups by \`Vary\` and the \`_rsc\` hash, which Next.js 16.4 enforces with a 307. Knowing this explains why props must be small and non-secret, why CDNs need configuration, and why buffering kills streaming. For the component model behind it, see [React Server Components](/interview-question/what-are-react-server-components-and-why-does-next-js-use-them).`,
    examples: [
      {
        label: "The lab page: a Server Component, a Client Component and a slow Suspense child",
        tech: "tsx",
        runnable: false,
        code: `// app/product/page.tsx
import { Suspense } from "react";
import { connection } from "next/server";
import LikeButton from "./LikeButton";

async function Reviews() {
  await new Promise((r) => setTimeout(r, 1500)); // a slow data source
  return (
    <ul>
      <li>Great kettle</li>
      <li>Boils fast</li>
    </ul>
  );
}

export default async function Product() {
  await connection(); // render per request so the stream is visible
  return (
    <main>
      <h1>Kettle</h1>
      {/* Client Component: the payload carries a module reference and the prop "initial":7 */}
      <LikeButton initial={7} />
      <Suspense fallback={<p>Loading reviews...</p>}>
        <Reviews />
      </Suspense>
    </main>
  );
}

// app/product/LikeButton.tsx
"use client";
import { useState } from "react";

export default function LikeButton({ initial }: { initial: number }) {
  const [n, setN] = useState(initial);
  return <button onClick={() => setN(n + 1)}>Like {n}</button>;
}`,
      },
      {
        label: "Capturing the payload and its timing yourself",
        tech: "bash",
        runnable: false,
        code: `# 1. The payload on its own, as client navigation requests it.
#    Without a matching _rsc value Next.js 16 answers 307; "?_rsc" with no value matches
#    a request that sends no router-state headers.
curl -s -D - -H 'RSC: 1' "http://localhost:3000/product?_rsc"

# 2. The same payload inlined in the HTML stream
curl -s http://localhost:3000/product | grep -o 'self.__next_f.push([^<]*' | head

# 3. When each chunk arrives (curl buffers, so read the body as a stream)
cat > observe.mjs <<'JS'
const t0 = Date.now();
const res = await fetch(process.argv[2], { headers: { rsc: "1", "accept-encoding": "identity" } });
const reader = res.body.getReader();
for (let i = 1; ; i++) {
  const { value, done } = await reader.read();
  if (done) break;
  console.log(\`chunk \${i} +\${Date.now() - t0} ms \${value.length} bytes\`);
}
JS
node observe.mjs "http://localhost:3000/product?_rsc"`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you set security headers and a nonce-based Content Security Policy in Next.js?",
    seoDescription: "Security headers via next.config headers() and a per-request nonce CSP from proxy.ts, checked in Chromium on Next.js 16.4.2, static-page trap included.",
    description: `**Question presented to candidate:**
"A security review flagged our Next.js app: no CSP, no HSTS, and it can be framed. Walk me through adding security headers, and a Content Security Policy strict enough that an injected script cannot run."

**What a strong answer should cover:**
- Static headers (HSTS, \`X-Content-Type-Options\`, \`Referrer-Policy\`, \`Permissions-Policy\`, framing protection) belong in \`headers()\` in \`next.config\`.
- A strict CSP avoids \`'unsafe-inline'\` by using a per-request nonce, generated in \`proxy.ts\` and sent on both the request (so Next.js can read it) and the response.
- Next.js reads the nonce from the request's \`Content-Security-Policy\` header during rendering and adds it to its own scripts; your \`<Script>\` tags get it via \`headers().get("x-nonce")\`.
- Nonces need dynamic rendering: a statically prerendered page has scripts without nonces, which the browser then blocks; this also rules out ISR, CDN caching of HTML and PPR shells.
- Alternatives and details: CSP without nonces in \`next.config\`, experimental SRI (hashes), \`'strict-dynamic'\`, \`'unsafe-eval'\` only in development, and a matcher that skips static assets and prefetches.

**Clarifying questions expected:**
- "Must pages stay static or cacheable at the CDN?" — that decides between nonces and a weaker or hash-based policy.
- "Which third-party scripts must run?" — they need the nonce or an allowlisted origin.

**Code / implementation expected:** Yes — \`next.config\` headers plus a \`proxy.ts\` that sets a nonce-based CSP.`,
    answer: `**Target Audience:** Full-stack engineers preparing for senior Next.js interviews — assumes App Router basics and a little HTTP.
**Difficulty:** Hard

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.4.2 docs shipped with the package (the Content Security Policy guide and the proxy reference) and, in the **Verified** section, against real \`curl\` output and a real Chromium browser that enforced the policy.

## 1. Why This Even Matters — A Story First

A concert venue has a guest list. Anyone whose name is on the list gets in; everyone else is turned away at the door. A **Content Security Policy** is a guest list for the scripts, styles and images on your page, sent by the server and enforced by the browser. If an attacker manages to sneak a \`<script>\` into a comment field (cross-site scripting, XSS), the browser checks the list, does not find it, and refuses to run it.

The hard part is inline scripts. Your own page has some (Next.js uses them to stream data), and an attacker's injected script is also inline. A list that says "allow inline scripts" lets both in. The answer is a **wristband**: for every single show the venue prints wristbands with a new random code, gives them only to the real band, and tells the door "only inline scripts wearing tonight's code". That code is a **nonce**. The attacker cannot guess it, because it changes on every request.

The other security headers are the venue's fixed rules (no cameras, always use the main entrance): they never change between shows, so they are set once in configuration.

## 2. The Core Idea

📌 **Interview term: Content Security Policy (CSP)** — a response header listing which sources of scripts, styles, images, frames and connections a page may use. Browsers block anything not allowed.

📌 **Interview term: Nonce** — a random, single-use value in the CSP (\`'nonce-abc123'\`). Only \`<script>\` and \`<style>\` tags carrying \`nonce="abc123"\` may run. It must be unpredictable and new for every response.

📌 **Interview term: \`'strict-dynamic'\`** — a CSP keyword meaning "scripts loaded by an already trusted (nonced) script are trusted too". It lets the framework load its chunks without listing every file, and makes host allowlists like \`'self'\` ignored by browsers that support it.

📌 **Interview term: Security headers** — fixed response headers that harden the browser: \`Strict-Transport-Security\` (HTTPS only), \`X-Content-Type-Options: nosniff\`, \`Referrer-Policy\`, \`Permissions-Policy\`, and framing protection (\`X-Frame-Options\` or CSP \`frame-ancestors\`).

In Next.js these two kinds of header come from two different places:

| What | Where | Why there |
| :--- | :--- | :--- |
| Fixed security headers | \`headers()\` in \`next.config.ts\` | Same value for every response, including static files; no code runs per request |
| CSP **without** a nonce | \`headers()\` in \`next.config.ts\` | Also fixed, but needs \`'unsafe-inline'\` for scripts, which weakens it |
| CSP **with** a nonce | [\`proxy.ts\`](/interview-question/what-is-proxy-ts-in-next-js-16-and-how-do-you-migrate-from-middleware-ts) | A new value is needed per request, so code must run before rendering |

## 3. How a Nonce Gets Into Every Script

<svg class="iq-diagram" width="100%" viewBox="0 0 660 320" role="img" aria-label="Nonce flow. proxy.ts creates a nonce, puts the CSP on the request and the response. Next.js reads it while rendering and stamps it on its scripts. The browser enforces it">
  <defs>
    <marker id="n15q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="26" text-anchor="middle">One request, one nonce</text>
  <rect class="d-box-accent" x="24" y="52" width="190" height="96" rx="10"/>
  <text class="d-text d-accent" x="119" y="80" text-anchor="middle">proxy.ts</text>
  <text class="d-sub" x="119" y="104" text-anchor="middle">nonce = random</text>
  <text class="d-sub" x="119" y="126" text-anchor="middle">CSP on request + response</text>
  <path class="d-edge" d="M 218 100 L 266 100" marker-end="url(#n15q4-arrow)"/>
  <rect class="d-box-muted" x="274" y="52" width="170" height="96" rx="10"/>
  <text class="d-text" x="359" y="80" text-anchor="middle">Dynamic render</text>
  <text class="d-sub" x="359" y="104" text-anchor="middle">reads nonce from CSP</text>
  <text class="d-sub" x="359" y="126" text-anchor="middle">stamps every script</text>
  <path class="d-edge" d="M 448 100 L 496 100" marker-end="url(#n15q4-arrow)"/>
  <rect class="d-box-muted" x="504" y="52" width="132" height="96" rx="10"/>
  <text class="d-text" x="570" y="80" text-anchor="middle">Browser</text>
  <text class="d-sub" x="570" y="104" text-anchor="middle">runs nonced</text>
  <text class="d-sub" x="570" y="126" text-anchor="middle">blocks the rest</text>
  <rect class="d-box" x="24" y="196" width="290" height="96" rx="10"/>
  <text class="d-text" x="169" y="224" text-anchor="middle">Dynamic page (lab)</text>
  <text class="d-sub" x="169" y="248" text-anchor="middle">12 tags with nonce</text>
  <text class="d-sub" x="169" y="270" text-anchor="middle">0 violations, hydrated</text>
  <rect class="d-box" x="346" y="196" width="290" height="96" rx="10"/>
  <text class="d-text" x="491" y="224" text-anchor="middle">Static page, same policy</text>
  <text class="d-sub" x="491" y="248" text-anchor="middle">scripts have no nonce</text>
  <text class="d-sub" x="491" y="270" text-anchor="middle">10 violations, not hydrated</text>
</svg>

The 16.4.2 guide describes the mechanism in three steps, all reproduced in the lab:

1. **The proxy generates a nonce** (\`Buffer.from(crypto.randomUUID()).toString("base64")\`), builds the policy, and sets it on the **request** headers (plus an \`x-nonce\` convenience header) and on the **response**.
2. **Next.js extracts the nonce** while rendering, by parsing the request's \`Content-Security-Policy\` header for the \`'nonce-{value}'\` pattern.
3. **The nonce is applied automatically** to framework scripts, page bundles, inline scripts Next.js generates, and \`<Script>\` components that receive the \`nonce\` prop.

Your own code reads the nonce in a Server Component with \`(await headers()).get("x-nonce")\` and passes it to third-party scripts. See [next/script](/interview-question/what-is-next-script-and-what-are-its-strategy-options-in-next-js) and [reading headers](/interview-question/how-do-you-read-cookies-and-headers-in-next-js-cookies-headers).

## 4. The Price: Dynamic Rendering

A nonce has to be different for every response, and a prerendered page was rendered once, at build time, before any request existed. So the docs are blunt: to use nonces, pages **must be dynamically rendered**. The guide lists the consequences: static optimization and ISR are disabled, pages cannot be cached by CDNs without extra configuration, and [Partial Prerendering](/interview-question/what-is-partial-prerendering-ppr-in-next-js) is incompatible because the static shell scripts cannot know the nonce.

The trap is that nothing fails at build time. A route that happens to be static builds fine, the proxy still sends a fresh CSP with a nonce, but the HTML on disk has no nonces. The browser blocks every script and the page never becomes interactive. The fix is to make such pages dynamic (reading \`headers()\` does it, or \`await connection()\`), as the lab shows. See [static vs dynamic rendering](/interview-question/what-is-the-difference-between-static-and-dynamic-rendering-in-the-next-js-app-r).

Options when you cannot afford dynamic rendering everywhere:

- **CSP without nonces** in \`next.config\` (\`script-src 'self' 'unsafe-inline'\`): keeps static pages, still restricts origins, framing, \`object-src\`, \`base-uri\` and form targets, but does not stop inline XSS.
- **Experimental SRI** (\`experimental.sri.algorithm\`): build-time hashes as \`integrity\` attributes, compatible with static pages. The docs label it experimental and App Router only. It was not tested in this lab.
- **Scope the nonce** to the routes that handle sensitive data, using the proxy \`matcher\`.

## 5. Development vs Production Details

- \`'unsafe-eval'\` is needed **only in development**, because React uses \`eval\` to reconstruct server error stacks in the browser; the guide states neither React nor Next.js uses \`eval\` in production by default.
- The recommended matcher skips \`api\`, \`_next/static\`, \`_next/image\`, \`favicon.ico\`, and requests carrying \`next-router-prefetch\` or \`purpose: prefetch\` headers.
- \`poweredByHeader: false\` removes \`X-Powered-By: Next.js\`, a small fingerprinting reduction.
- \`frame-ancestors 'none'\` in the CSP and \`X-Frame-Options: DENY\` both block [clickjacking](https://developer.mozilla.org/docs/Web/HTTP/Headers/Content-Security-Policy/frame-ancestors); sending both covers old browsers.
- A CSP protects the page. It does not protect [Server Actions](/interview-question/what-are-the-security-considerations-for-server-actions-in-next-js), which are reachable endpoints and need their own authorization checks.

## 6. Verified — Next.js 16.4.2 Lab

Lab app: the three files in the examples (\`next.config.ts\` headers, \`proxy.ts\` nonce CSP, \`/dynamic\` page reading \`x-nonce\`), plus a \`/static\` page with the same Client Component but no request APIs. \`next build\`:

\`\`\`
Route (app)
┌ ○ /
├ ○ /_not-found
├ ƒ /dynamic
└ ○ /static


ƒ Proxy (Middleware)

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
\`\`\`

**Response headers for \`/dynamic\`** (Date and keep-alive lines removed):

\`\`\`
HTTP/1.1 200 OK
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
X-Frame-Options: DENY
content-security-policy: default-src 'self'; script-src 'self' 'nonce-MDVlODNiMzQtZDFhOC00MWJhLWIzMjktNDY2OTQ3NDM5MTFk' 'strict-dynamic'; style-src 'self' 'nonce-MDVlODNiMzQtZDFhOC00MWJhLWIzMjktNDY2OTQ3NDM5MTFk'; img-src 'self' blob: data:; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;
Vary: rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch, Accept-Encoding
Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate
Content-Type: text/html; charset=utf-8
Transfer-Encoding: chunked
\`\`\`

No \`X-Powered-By\` header. The script tags in that HTML (first eight shown) all carry the same nonce, 12 nonce attributes in total:

\`\`\`
<script src="/_next/static/chunks/28yi_qn465a45.js" async="" nonce="MDVlODNiMzQtZDFhOC00MWJhLWIzMjktNDY2OTQ3NDM5MTFk">
<script src="/_next/static/chunks/381-jy8y0m5b_.js" async="" nonce="MDVlODNiMzQtZDFhOC00MWJhLWIzMjktNDY2OTQ3NDM5MTFk">
...
<script nonce="MDVlODNiMzQtZDFhOC00MWJhLWIzMjktNDY2OTQ3NDM5MTFk" id="_R_">
<script src="/_next/static/chunks/12i3bb7-e-cv-.js" nonce="MDVlODNiMzQtZDFhOC00MWJhLWIzMjktNDY2OTQ3NDM5MTFk" async="">

     12 nonce="MDVlODNiMzQtZDFhOC00MWJhLWIzMjktNDY2OTQ3NDM5MTFk"
\`\`\`

Two consecutive requests got different nonces:

\`\`\`
nonce-NzZiN2ZiZjUtMGU0ZS00ZmNlLTgyZWEtYmVkNjgxMjRjZDZi
nonce-NjFmZTU1MTYtNDlhOC00N2NlLWI2MGEtNTMwMTE2MjU0MjAx
\`\`\`

**The static page** received a CSP with a fresh nonce from the proxy, but its prerendered HTML had \`0\` nonce attributes:

\`\`\`
content-security-policy: default-src 'self'; script-src 'self' 'nonce-ODhjNjAyMmUtMDBjMy00NWNlLTg3YWMtYTk5ZTRjYzBlZDg3' 'strict-dynamic'; ...
<script src="/_next/static/chunks/28yi_qn465a45.js" async="">
<script src="/_next/static/chunks/381-jy8y0m5b_.js" async="">
\`\`\`

**Chromium enforcing the policy** (Playwright, counting console messages about Content Security Policy, then clicking the counter button):

\`\`\`
/dynamic  CSP violations=0  button after click="clicked 1"  third-party script=loaded
/static   CSP violations=10  button after click="clicked 0"  third-party script=not loaded
          first violation: Refused to load the script 'http://localhost:4183/_next/static/chunks/12i3bb7-e-cv-.js' because it violates the following Content Security Policy directive: "script-src 'self' 'nonce-MmRhMGV...
\`\`\`

The static page rendered its HTML but never hydrated: the button stayed at \`clicked 0\`. Note that \`'self'\` did not rescue the same-origin chunks, because \`'strict-dynamic'\` makes supporting browsers ignore host-based sources.

**Matcher exclusions:** a static chunk under \`_next/static\` returned \`X-Frame-Options: DENY\` (from \`headers()\`) and \`Cache-Control: public, max-age=31536000, immutable\`, but no CSP header, because the proxy matcher skipped it.

Not verified here: experimental SRI, browsers other than Chromium, and third-party tag managers.

## 7. Common Pitfalls

- **Nonce CSP on static pages.** The build passes and the page silently dies in the browser, as the lab showed with 10 violations. Make nonce-protected routes dynamic.
- **Setting the CSP only on the response.** Next.js reads the nonce from the request header; without it, framework scripts get no nonce.
- **Reusing a nonce.** A constant or cached nonce is just a password printed on every page. Generate it per request.
- **Keeping \`'unsafe-inline'\` "just in case".** Per the CSP specification, browsers that support nonces ignore \`'unsafe-inline'\` when a nonce is present, so it adds nothing for them and weakens the policy for old ones; remove it and fix the scripts.
- **Forgetting third-party scripts.** Analytics need the nonce prop and their origins in \`script-src\`, \`connect-src\` and \`img-src\`.
- **Treating CSP as the only defence.** It limits damage from XSS; it does not replace output escaping, authorization in [Server Actions](/interview-question/what-are-server-actions-in-next-js-and-how-do-they-work), or HTTPS.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Static security headers go in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">headers()</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next.config</code>; a strict CSP uses a fresh nonce per request, generated in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">proxy.ts</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">The proxy puts the CSP on the request and the response; during rendering Next.js reads <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">'nonce-...'</code> from the request header and stamps it on every framework script, and I pass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">headers().get("x-nonce")</code> to my own <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;Script&gt;</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;">With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">'strict-dynamic'</code> and no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">'unsafe-inline'</code>, an injected inline script has no nonce and the browser refuses it, which is the whole point of the policy.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;">Nonces require dynamic rendering; in my Chromium test a static page under the same policy logged 10 CSP violations and never hydrated, while the dynamic page had 0.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">That cost is real: no static HTML, no ISR, no CDN-cached pages and no PPR shell, so if pages must stay static I consider experimental SRI or a policy without nonces.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why set the CSP on the request as well as the response?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Next.js extracts the nonce from the request's <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Content-Security-Policy</code> header while rendering. The response header is what the browser enforces.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why exclude <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">_next/static</code> and prefetches in the matcher?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Static files do not need a policy of their own and prefetch responses are not documents; skipping them saves proxy work. The docs recommend that matcher.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does development need <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">'unsafe-eval'</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">React uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">eval</code> in development to rebuild server error stacks in the browser. The docs say production does not need it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where do you set HSTS and framing protection?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next.config</code> <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">headers()</code>, which also covers static files. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">frame-ancestors 'none'</code> in the CSP and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">X-Frame-Options: DENY</code> both block framing.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you allow Google Tag Manager under this policy?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Pass the nonce to it, for example <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nonce={nonce}</code> on the script component, and add its origins to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">script-src</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">connect-src</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">img-src</code> as needed.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **CSP** | Header listing allowed sources; the browser blocks the rest |
| **Nonce** | Random per-response value that marks trusted inline and script tags |
| **\`'strict-dynamic'\`** | Trust scripts loaded by a nonced script; ignore host allowlists |
| **Security headers** | Fixed hardening headers such as HSTS and nosniff |
| **\`frame-ancestors\`** | CSP directive controlling who may frame the page |
| **SRI** | Integrity hashes on scripts; the experimental static-friendly alternative |

---
**Conclusion:** Split the job in two. Fixed headers (HSTS, nosniff, referrer and permissions policies, framing protection) go in \`next.config\` \`headers()\`, where they cover every response including static files. A strict CSP needs a per-request nonce, which \`proxy.ts\` generates and places on both the request and the response; Next.js then stamps it on every script it emits, and your \`<Script>\` tags get it from \`headers()\`. The catch is that nonces require dynamic rendering: in the lab, the dynamic page ran cleanly while a static page under the same policy logged ten CSP violations and never hydrated. Decide per route whether that trade is worth it, and for the wider request pipeline see [proxy.ts](/interview-question/what-is-proxy-ts-in-next-js-16-and-how-do-you-migrate-from-middleware-ts).`,
    examples: [
      {
        label: "next.config.ts: static security headers for every route",
        tech: "ts",
        runnable: false,
        code: `// next.config.ts
import type { NextConfig } from "next";

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-Frame-Options", value: "DENY" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};
export default nextConfig;`,
      },
      {
        label: "proxy.ts: a fresh nonce and a strict CSP per request",
        tech: "ts",
        runnable: false,
        code: `// proxy.ts (project root, next to app/)
import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";
  const csp = \`
    default-src 'self';
    script-src 'self' 'nonce-\${nonce}' 'strict-dynamic'\${isDev ? " 'unsafe-eval'" : ""};
    style-src 'self' 'nonce-\${nonce}';
    img-src 'self' blob: data:;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  \`.replace(/\\s{2,}/g, " ").trim();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};`,
      },
      {
        label: "A dynamic page that passes the nonce to a third-party script",
        tech: "tsx",
        runnable: false,
        code: `// app/dynamic/page.tsx
import { headers } from "next/headers";
import Script from "next/script";
import Counter from "./Counter";

export default async function Page() {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <main>
      <h1>Dynamic page</h1>
      <Counter />
      <Script src="/analytics.js" strategy="afterInteractive" nonce={nonce} />
    </main>
  );
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you stream responses and Server-Sent Events from a Route Handler?",
    seoDescription: "Return a ReadableStream from a Route Handler for streaming text or SSE. Real chunk timings, disconnects and EventSource retry measured on Next.js 16.4.2.",
    description: `**Question presented to candidate:**
"We want a live order-status feed and a chat endpoint that shows an AI answer word by word. How would you stream from a Next.js Route Handler, and what would you check before it goes to production?"

**What a strong answer should cover:**
- Return a Web \`Response\` whose body is a \`ReadableStream\`; enqueue encoded chunks as they are produced and close the stream when done.
- Server-Sent Events use \`Content-Type: text/event-stream\` and frames like \`id:\`, \`event:\`, \`data:\` ending in a blank line; the browser \`EventSource\` parses them and reconnects automatically (honouring \`retry:\`).
- Clean up on disconnect with \`request.signal\` and the stream's \`cancel()\`; stop timers and upstream work.
- Use \`pull()\` for backpressure when wrapping a producer (an LLM, a file, a database cursor).
- Production checks: proxies and CDNs that buffer (\`X-Accel-Buffering: no\`, \`Cache-Control: no-cache, no-transform\`), the Node.js runtime and platform time limits, and sending a first byte early because headers go out with the first chunk.

**Clarifying questions expected:**
- "Is the traffic one-way server to client?" — SSE fits; two-way needs WebSockets or a separate service.
- "Where is it deployed, and what sits in front?" — serverless limits and buffering proxies decide feasibility.

**Code / implementation expected:** Yes — an SSE Route Handler with cleanup, and an \`EventSource\` client.`,
    answer: `**Target Audience:** Full-stack engineers preparing for senior Next.js interviews — assumes Route Handler basics and some familiarity with HTTP.
**Difficulty:** Hard

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.4.2 docs shipped with the package (the Route Handler reference and the streaming guide) and, in the **Verified** section, against real chunk timings from \`curl -N\`, a streaming \`fetch\` script and a real Chromium \`EventSource\`.

## 1. Why This Even Matters — A Story First

A normal HTTP response is a letter: the server writes the whole thing, seals it, and posts it. If writing takes ten seconds, you wait ten seconds and then read everything at once. A streaming response is a phone call: the server starts talking as soon as it has the first sentence, and you hear each sentence as it is spoken.

Two everyday features need the phone call. A chat assistant that generates an answer word by word should show the first words in a few hundred milliseconds, not after the whole paragraph. A live order tracker should push "packed", "shipped", "out for delivery" the moment each happens, without the browser asking every second. The first is a **streamed response**; the second is **Server-Sent Events**, a small standard that runs over the same kind of streamed response.

## 2. The Core Idea

📌 **Interview term: \`ReadableStream\`** — the Web Streams API object a Route Handler can use as a response body. You \`enqueue\` byte chunks into its controller and \`close\` it when done; Next.js writes each chunk to the socket as it arrives.

📌 **Interview term: Server-Sent Events (SSE)** — a one-way, server-to-browser protocol over a long-lived HTTP response with \`Content-Type: text/event-stream\`. Each message is a few \`field: value\` lines (\`id\`, \`event\`, \`data\`, \`retry\`) ended by a blank line; lines starting with \`:\` are comments.

📌 **Interview term: \`EventSource\`** — the browser API that opens an SSE connection, parses the frames, dispatches events by name, and **reconnects automatically** after the \`retry\` delay if the stream ends, sending \`Last-Event-ID\` so the server can resume.

📌 **Interview term: Backpressure** — slowing the producer when the consumer cannot keep up. With \`ReadableStream\`, \`pull()\` is called only when the stream wants more data, which gives you this for free.

In a [Route Handler](/interview-question/what-are-route-handlers-in-next-js-and-how-do-they-differ-from-pages-api-routes) the whole mechanism is standard Web APIs: build a stream, return \`new Response(stream, { headers })\`. There is no Next.js-specific streaming API to learn. (The lab ran on the default Node.js runtime; Edge was not tested.)

<svg class="iq-diagram" width="100%" viewBox="0 0 660 300" role="img" aria-label="Buffered vs streamed response timing from the lab. Buffered sends everything at 1598 ms, streamed sends the first chunk at 41 ms">
  <defs>
    <marker id="n15q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="26" text-anchor="middle">When the client sees bytes (lab, next start)</text>
  <rect class="d-box-muted" x="24" y="52" width="180" height="70" rx="10"/>
  <text class="d-text" x="114" y="80" text-anchor="middle">Buffered handler</text>
  <text class="d-sub" x="114" y="102" text-anchor="middle">builds a string first</text>
  <path class="d-edge" d="M 208 87 L 300 87" marker-end="url(#n15q5-arrow)"/>
  <rect class="d-box" x="308" y="52" width="328" height="70" rx="10"/>
  <text class="d-text" x="472" y="80" text-anchor="middle">one chunk at 1602 ms</text>
  <text class="d-sub" x="472" y="102" text-anchor="middle">nothing visible before that</text>
  <rect class="d-box-accent" x="24" y="166" width="180" height="70" rx="10"/>
  <text class="d-text d-accent" x="114" y="194" text-anchor="middle">SSE stream</text>
  <text class="d-sub" x="114" y="216" text-anchor="middle">enqueue as produced</text>
  <path class="d-edge d-edge-accent" d="M 208 201 L 300 201" marker-end="url(#n15q5-arrow)"/>
  <rect class="d-box" x="308" y="166" width="328" height="70" rx="10"/>
  <text class="d-text" x="472" y="194" text-anchor="middle">41 ms, then every 500 ms</text>
  <text class="d-sub" x="472" y="216" text-anchor="middle">six events, closed at 2552 ms</text>
</svg>

The total time is the same; what changes is when the user sees the first useful byte.

## 3. Writing the Endpoints

**An SSE endpoint** (full code in the first example) does four things:

1. Writes something **immediately** in \`start()\` (\`retry: 3000\` and a \`: connected\` comment). This matters more than it looks, because of a behaviour measured in the lab: \`next start\` sends the status line and headers together with the **first body chunk**. A stream whose first chunk comes after one second leaves the client with no response at all for that second.
2. Formats each message as \`id: N\`, \`event: name\`, \`data: <json>\`, then a blank line (\`\\n\\n\`). JSON on a single \`data:\` line avoids multi-line parsing rules.
3. Cleans up when the client goes away: \`request.signal\` fires \`abort\`, and the stream's \`cancel()\` runs when the consumer cancels. Both clear the timer. Without this, a closed browser tab keeps your interval (or your upstream LLM call) running.
4. Sends anti-buffering headers: \`Cache-Control: no-cache, no-transform\` (no caching, and no proxy may transform, for example compress, the body) and \`X-Accel-Buffering: no\` for nginx.

**A streamed text endpoint for AI-style output** (second example) wraps a producer with \`pull()\`. Each \`pull\` waits for one token and enqueues it. If the client reads slowly, \`pull\` is not called again until it does. This is the pattern to use around an LLM SDK stream, a file (\`FileHandle.readableWebStream()\`, from the streaming guide) or a database cursor. The Node.js side of streams is covered in [reading and writing large files with streams](/interview-question/explain-how-to-read-and-write-large-files-using-streams-in-node-js).

**The client** (third example) uses \`EventSource\` in a \`useEffect\`, listens to named events, closes on the final \`done\` event, and closes in the effect cleanup. Use \`fetch\` with a stream reader instead when you need a POST body or custom headers (such as an \`Authorization\` header), which \`EventSource\` cannot send.

## 4. The HTTP Contract and Production Checklist

The streaming guide's central rule: once streaming begins, the status code and headers have already been sent and cannot change. For a Route Handler that means: **authenticate, validate and choose the status before returning the \`Response\`**, and report later failures inside the stream (an \`event: error\` frame).

| Layer | What can go wrong | What to do |
| :--- | :--- | :--- |
| Your handler | First chunk is late, so headers are late | Enqueue a comment or \`retry:\` line immediately |
| Your handler | Client gone, work continues | \`request.signal\` abort listener and \`cancel()\` |
| Reverse proxy (nginx) | Buffers the whole response | \`X-Accel-Buffering: no\` (from the self-hosting guide) |
| CDN / load balancer | Buffers or times out idle streams | Check provider streaming support; send heartbeat comments |
| Compression | Gzip waits for enough data | \`no-transform\`; check proxy compression settings |
| Platform | Serverless duration limits | Prefer \`next start\` or a dedicated service for long streams |
| Client | \`curl\` and Safari buffer small responses | Test with \`curl -N\` or a stream reader |

Route Handlers using \`GET\` without caching are dynamic, so each request runs the handler; the lab build marked all streaming handlers \`ƒ\`. For work that should run after the response finishes rather than during it, see [after()](/interview-question/what-is-after-in-next-js-and-when-should-you-use-it). For choosing between a Route Handler and a Server Action for this, see [Server Actions vs Route Handlers](/interview-question/how-do-server-actions-differ-from-route-handlers-in-next-js).

## 5. Verified — Next.js 16.4.2 Lab

Lab app with the three example files plus two comparison handlers. \`next build\` listed them all as dynamic:

\`\`\`
Route (app)
┌ ○ /
├ ○ /_not-found
├ ƒ /api/buffered
├ ƒ /api/events
├ ƒ /api/text
└ ○ /live
\`\`\`

**SSE through \`curl -N\`**, each line timestamped by the shell as it arrived:

\`\`\`
+   41 ms | retry: 3000
+   43 ms | : connected
+   45 ms | 
+  537 ms | id: 1
+  538 ms | event: tick
+  540 ms | data: {"n":1,"at":"2026-10-16T10:06:17.964Z"}
+  542 ms | 
+ 1037 ms | id: 2
+ 1039 ms | event: tick
+ 1040 ms | data: {"n":2,"at":"2026-10-16T10:06:18.465Z"}
+ 1043 ms | 
...
+ 2539 ms | id: 5
+ 2541 ms | event: tick
+ 2543 ms | data: {"n":5,"at":"2026-10-16T10:06:19.967Z"}
+ 2545 ms | 
+ 2546 ms | id: 6
+ 2548 ms | event: done
+ 2550 ms | data: {"ok":true}
+ 2552 ms | 
HTTP/1.1 200 OK
vary: rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch
cache-control: no-cache, no-transform
connection: keep-alive
content-type: text/event-stream; charset=utf-8
x-accel-buffering: no
Transfer-Encoding: chunked
\`\`\`

(Events 3 and 4 trimmed; they arrived at 1539 and 2039 ms.)

**Client disconnect**: \`curl -N --max-time 1.3\` against the same endpoint; the server log then contained:

\`\`\`
[sse] client disconnected after 2 events
\`\`\`

**Streamed POST text** read with a stream reader:

\`\`\`
headers at +413 ms, content-encoding=null
+  414 ms "Streaming "
+  710 ms "lets "
+ 1011 ms "the "
+ 1312 ms "user "
+ 1612 ms "read "
+ 1916 ms "early."
\`\`\`

**The buffered handler** (builds the whole string, then returns it):

\`\`\`
status 200 at 1598 ms, content-type text/plain;charset=UTF-8
chunk 1 + 1602 ms     21 bytes | part 1\\npart 2\\npart 3\\n
done at 1603 ms
\`\`\`

**When headers are sent.** A handler that returns its stream immediately but enqueues the first chunk after 1000 ms (both with an async \`start()\` and with a synchronous \`start()\` that uses \`setTimeout\`):

\`\`\`
late:  first byte 1.010180s total 2.011711s
status 200 at 1081 ms, content-type text/plain
chunk 1 + 1082 ms      6 bytes | first\\n
chunk 2 + 2078 ms      7 bytes | second\\n

late2: status 200 at 1184 ms, content-type text/plain
chunk 1 + 1185 ms      6 bytes | first\\n
chunk 2 + 2181 ms      7 bytes | second\\n
\`\`\`

The response status arrived together with the first chunk in both cases, which is why the SSE endpoint writes \`retry:\` and a comment straight away. The same effect explains the POST example's \`headers at +413 ms\`: its first token takes 300 ms.

**Compression**: with \`Accept-Encoding: gzip\`, \`next start\` returned \`Content-Encoding: gzip\` for a page and for a static JS chunk, but no \`Content-Encoding\` for \`/api/events\`, \`/api/text\`, or even a 20 000-byte non-streaming Route Handler response.

**A real browser** (Chromium via Playwright) on \`/live\` with the \`EventSource\` client:

\`\`\`
after 1.3 s: 2 items rendered
after 6.3 s: 5 items rendered, /api/events requests=1
first item: {"n":1,"at":"2026-10-16T10:08:01.534Z"}
EventSource left open for 6.5 s: onopen fired 2 times
\`\`\`

The client that closes on \`done\` made one request. A raw \`EventSource\` that ignored \`done\` reconnected after the stream ended (at about 2.5 s, plus the 3 s \`retry\`), so \`onopen\` fired twice in 6.5 s.

Not verified here: nginx, CDNs, load balancers and serverless platforms, and Safari buffering; those rows of the table come from the 16.4.2 streaming and self-hosting guides.

## 6. Common Pitfalls

- **Doing the slow work before returning.** Awaiting the whole LLM answer and then streaming it is just a buffered response. Return the \`Response\` first and produce inside the stream.
- **A late first chunk.** In 16.4.2 the headers wait for the first chunk; send a comment or \`retry:\` line immediately so \`EventSource\` opens and proxies see traffic.
- **No cleanup.** Without an \`abort\` listener and \`cancel()\`, intervals and upstream calls outlive closed tabs and pile up.
- **Unintended reconnect loops.** \`EventSource\` reconnects whenever the stream ends. Send a final event and close it on the client, or set a sensible \`retry\`.
- **Buffering infrastructure.** One buffering hop (nginx, a CDN, compression) turns the stream into a single late response. Test through the real path.
- **Changing status mid-stream.** You cannot; validate and authorize first, then stream.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">A Route Handler can return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new Response(readableStream)</code>; every chunk I <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">enqueue</code> is written to the socket as it is produced, so the client sees data before the work finishes.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">For Server-Sent Events I set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Content-Type: text/event-stream</code> and write frames like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">event: tick</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">data: {...}</code> followed by a blank line; the browser <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EventSource</code> parses them and reconnects on its own.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;">I listen to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">request.signal</code> for disconnects and implement <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cancel()</code> so timers and upstream calls stop; in the lab the server logged the disconnect after two events.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;">In Next.js 16.4.2 the status and headers are only sent with the first body chunk, so I enqueue a comment like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">: connected</code> immediately; otherwise the client waits for the first real event.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">Before production I check the path end to end: nginx needs <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">X-Accel-Buffering: no</code>, caches need <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">no-transform</code>, and serverless platforms may cap duration, so long-lived streams can need a dedicated service.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">SSE or WebSockets?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">SSE is one-way, plain HTTP, auto-reconnecting and passes most proxies. A Route Handler returns a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Response</code> and offers no WebSocket upgrade API, and the 16.4.2 docs warn WebSockets fail on hosts that run handlers as functions, so two-way real time needs a separate server or service.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">pull()</code> instead of a loop in <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">start()</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pull()</code> is called only when the consumer wants more data, which gives natural backpressure: a slow client stops the producer instead of filling memory.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens when the stream ends while an EventSource is open?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The browser reconnects after the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">retry:</code> delay. In the lab, with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">retry: 3000</code> and a stream ending at 2.5 s, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onopen</code> fired twice within 6.5 s. Close the EventSource on a final event to stop it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">next start</code> gzip these responses?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not in the lab: with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Accept-Encoding: gzip</code>, pages and static chunks came back gzipped, but the streaming Route Handler responses had no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Content-Encoding</code>. A proxy in front may still compress and buffer them.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you change the status code after streaming starts?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Headers and status go out with the first chunk, so validate input and authorization before returning the Response, and report later errors as an event in the stream.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **\`ReadableStream\`** | Web stream used as a response body; you enqueue chunks |
| **SSE** | One-way server-to-browser events over \`text/event-stream\` |
| **\`EventSource\`** | Browser client for SSE with automatic reconnect |
| **\`retry:\`** | SSE field setting the reconnect delay in milliseconds |
| **Backpressure** | Pausing the producer until the consumer wants more (\`pull()\`) |
| **\`X-Accel-Buffering: no\`** | Header that tells nginx not to buffer the response |

---
**Conclusion:** Streaming from a Route Handler is plain Web platform code: return a \`Response\` whose body is a \`ReadableStream\`, enqueue chunks as they are produced, and close it when finished. SSE adds a tiny text framing and gets automatic reconnects from \`EventSource\`. The lab showed the payoff (first bytes at 41 ms instead of 1.6 s) and the details that decide whether it works in production: send a first chunk at once because headers travel with it, clean up on \`request.signal\`, close the client on a final event to avoid reconnect loops, and make sure no proxy, CDN or compression layer buffers the stream. For streaming whole pages rather than raw data, see [loading.js and Suspense streaming](/interview-question/what-is-loading-js-in-next-js-and-how-does-suspense-streaming-work).`,
    examples: [
      {
        label: "app/api/events/route.ts: a Server-Sent Events endpoint with cleanup on disconnect",
        tech: "ts",
        runnable: false,
        code: `// app/api/events/route.ts
export async function GET(request: Request) {
  const encoder = new TextEncoder();
  let timer: ReturnType<typeof setInterval> | undefined;
  let id = 0;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: string, data: unknown) => {
        id++;
        controller.enqueue(encoder.encode(\`id: \${id}\\nevent: \${event}\\ndata: \${JSON.stringify(data)}\\n\\n\`));
      };
      controller.enqueue(encoder.encode(\`retry: 3000\\n: connected\\n\\n\`));
      timer = setInterval(() => {
        send("tick", { n: id + 1, at: new Date().toISOString() });
        if (id === 5) { send("done", { ok: true }); clearInterval(timer); controller.close(); }
      }, 500);

      request.signal.addEventListener("abort", () => {
        clearInterval(timer);
        console.log(\`[sse] client disconnected after \${id} events\`);
        try { controller.close(); } catch {}
      });
    },
    cancel() {
      clearInterval(timer);
      console.log("[sse] stream cancelled");
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}`,
      },
      {
        label: "app/api/text/route.ts: streaming generated text from a POST with pull()",
        tech: "ts",
        runnable: false,
        code: `// app/api/text/route.ts
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const WORDS = ["Streaming ", "lets ", "the ", "user ", "read ", "early."];

export async function POST(request: Request) {
  const { prompt } = await request.json();
  const encoder = new TextEncoder();
  let i = 0;

  const stream = new ReadableStream<Uint8Array>({
    // pull() is called only when the consumer wants more: natural backpressure
    async pull(controller) {
      if (i === WORDS.length) return controller.close();
      await sleep(300); // stand-in for an LLM producing the next token
      controller.enqueue(encoder.encode(WORDS[i++]));
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "X-Prompt-Length": String(prompt.length) },
  });
}`,
      },
      {
        label: "A Client Component consuming the SSE stream with EventSource",
        tech: "tsx",
        runnable: false,
        code: `// app/live/Feed.tsx
"use client";
import { useEffect, useState } from "react";
export default function Feed() {
  const [lines, setLines] = useState<string[]>([]);
  useEffect(() => {
    const es = new EventSource("/api/events");
    es.addEventListener("tick", (e) => setLines((l) => [...l, (e as MessageEvent).data]));
    es.addEventListener("done", () => es.close());
    return () => es.close();
  }, []);
  return <ul id="feed">{lines.map((l, i) => <li key={i}>{l}</li>)}</ul>;
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you build a multi-tenant Next.js app with subdomain routing?",
    seoDescription: "Resolve the tenant from the Host header in proxy.ts and rewrite to an internal /s/[tenant] tree. Host-header curls, ISR and 404 caching on Next.js 16.4.2.",
    description: `**Question presented to candidate:**
"We are building a store builder: every customer gets \`name.example.com\`, and paying customers can bring their own domain. Design the Next.js side: one app, many tenants. How do requests reach the right tenant, and what can go wrong?"

**What a strong answer should cover:**
- One deployment serves every tenant; wildcard DNS and TLS for \`*.example.com\`, plus per-domain certificates for custom domains.
- \`proxy.ts\` reads the \`Host\` header, resolves the tenant (subdomain or custom-domain lookup), and rewrites the URL to an internal route such as \`/s/[tenant]/...\` while the browser URL stays unchanged.
- The tenant is part of the route path, so ISR and caches are keyed per tenant; \`generateStaticParams\` can prerender known tenants and new ones render on demand.
- Isolation is enforced in the data layer (every query scoped by tenant), and the internal \`/s/*\` paths must not be reachable directly.
- Edge cases: unknown hosts, cached 404s for tenants created later, cookies scoped per host, Server Actions \`allowedOrigins\` for custom domains, and per-tenant metadata.

**Clarifying questions expected:**
- "Custom domains, or only subdomains?" — custom domains add certificate automation and a domain table.
- "How different are tenants: theme only, or features and data residency?" — that decides one app versus several deployments.

**Code / implementation expected:** Yes — a \`proxy.ts\` that rewrites by host, and the tenant route it rewrites to.`,
    answer: `**Target Audience:** Full-stack engineers preparing for senior Next.js or system design interviews — assumes App Router routing and basic DNS knowledge.
**Difficulty:** Hard

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.4.2 docs shipped with the package and, in the **Verified** section, against a running 16.4.2 lab app hit with \`curl\` and different \`Host\` headers, plus Chromium for \`*.localhost\`. The 16.4.2 multi-tenant guide itself is one paragraph that points to Vercel's Platforms starter kit; the architecture below is the one that starter uses (proxy plus rewrite to a tenant segment), built and tested from scratch here.

## 1. Why This Even Matters — A Story First

A shopping mall has one building, one set of escalators, one security team, and two hundred shops. Each shop has its own sign and its own stock, and customers think of "the Acme shop", not "unit 14B". When you walk in through the Acme entrance, the mall quietly routes you to unit 14B.

A multi-tenant SaaS app is that mall. \`acme.example.com\` and \`globex.example.com\` look like separate websites, but one Next.js deployment serves both. The building directory at the entrance is \`proxy.ts\`: it reads which door you came through (the \`Host\` header) and sends you to the right unit (an internal route), without changing the sign over the door (the URL in the address bar). The shop's stock (data) must still be locked in each unit, which is a data-layer problem, not a routing one.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Subdomains only, or custom domains too? | Custom domains need a domain table, DNS verification and automated TLS certificates |
| How many tenants, and how fast do new ones appear? | Decides between prerendering known tenants and on-demand rendering with revalidation |
| How different are tenants (theme, features, code version)? | Same code for all suits one app; diverging code suggests separate deployments |
| Shared database or one per tenant? | Changes how the data layer resolves connections and enforces isolation |
| Any data residency or compliance limits? | May force regional or per-tenant deployments regardless of routing |
| Does auth span tenants (one login, many workspaces)? | Decides cookie domain scope and where sessions live |

## 3. The Core Idea

📌 **Interview term: Tenant** — one customer organization whose users and data must be isolated from other customers, while sharing the same application.

📌 **Interview term: Host-based routing** — choosing what to render from the request's \`Host\` header (\`acme.example.com\`) rather than only from the path.

📌 **Interview term: Rewrite** — serving the content of one internal path for a different public URL. The browser keeps showing \`acme.example.com/dashboard\`; the server renders \`/s/acme/dashboard\`. See [redirects and rewrites](/interview-question/how-do-you-handle-redirects-and-rewrites-in-next-js).

📌 **Interview term: Wildcard DNS** — a DNS record \`*.example.com\` pointing every subdomain at the same deployment, usually with a wildcard TLS certificate.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 326" role="img" aria-label="Host based routing. proxy.ts reads the Host header and rewrites to an internal tenant route">
  <defs>
    <marker id="n15q6-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="26" text-anchor="middle">Same path, different Host, different tenant (lab)</text>
  <rect class="d-box-muted" x="24" y="50" width="200" height="50" rx="10"/>
  <text class="d-text" x="124" y="80" text-anchor="middle">acme.example.com/</text>
  <rect class="d-box-muted" x="24" y="128" width="200" height="50" rx="10"/>
  <text class="d-text" x="124" y="158" text-anchor="middle">shop.acme.test/</text>
  <rect class="d-box-muted" x="24" y="206" width="200" height="50" rx="10"/>
  <text class="d-text" x="124" y="236" text-anchor="middle">example.com/</text>
  <path class="d-edge" d="M 228 75 L 270 140" marker-end="url(#n15q6-arrow)"/>
  <path class="d-edge" d="M 228 153 L 270 153" marker-end="url(#n15q6-arrow)"/>
  <path class="d-edge" d="M 228 231 L 270 166" marker-end="url(#n15q6-arrow)"/>
  <rect class="d-box-accent" x="278" y="110" width="140" height="86" rx="10"/>
  <text class="d-text d-accent" x="348" y="142" text-anchor="middle">proxy.ts</text>
  <text class="d-sub" x="348" y="166" text-anchor="middle">read Host</text>
  <path class="d-edge" d="M 422 140 L 466 85" marker-end="url(#n15q6-arrow)"/>
  <path class="d-edge d-edge-dashed" d="M 422 170 L 466 230" marker-end="url(#n15q6-arrow)"/>
  <rect class="d-box" x="474" y="50" width="162" height="70" rx="10"/>
  <text class="d-text" x="555" y="78" text-anchor="middle">/s/acme</text>
  <text class="d-sub" x="555" y="100" text-anchor="middle">rewrite, ISR cached</text>
  <rect class="d-box" x="474" y="200" width="162" height="70" rx="10"/>
  <text class="d-text" x="555" y="228" text-anchor="middle">/ (marketing)</text>
  <text class="d-sub" x="555" y="250" text-anchor="middle">no tenant, next()</text>
</svg>

The subdomain and the custom domain both end up in the same internal \`/s/acme\` tree; the root domain falls through to the marketing pages in \`app/\`.

## 4. Building It Step by Step

**1. DNS and TLS.** Point \`*.example.com\` and \`example.com\` at the deployment with a wildcard certificate. For custom domains, the tenant adds a CNAME, you verify ownership, and you issue a certificate per domain (platforms automate this; self-hosted setups use something like an ACME-capable proxy). This part happens outside Next.js and was not tested here.

**2. Resolve the tenant in \`proxy.ts\`** (first example). It lowercases the hostname, strips the port, treats \`example.com\` and \`www.example.com\` as the marketing site, takes the label before \`.example.com\` as the tenant slug, and otherwise looks the full hostname up in a custom-domain table. See [proxy.ts](/interview-question/what-is-proxy-ts-in-next-js-16-and-how-do-you-migrate-from-middleware-ts).

**3. Rewrite to an internal segment.** \`NextResponse.rewrite(url)\` with \`url.pathname = /s/\${tenant}\${pathname}\`. The query string is preserved. The internal tree is an ordinary [dynamic route](/interview-question/what-are-dynamic-routes-and-catch-all-segments-in-next-js), \`app/s/[tenant]/...\`, so every page receives the tenant from \`params\`.

**4. Block the internal path.** Without a guard, \`example.com/s/globex\` would render Globex on the marketing domain, and \`acme.example.com/s/globex\` would render Globex under Acme's domain. The proxy returns 404 for any incoming \`/s/*\` path. (A private \`_sites\` folder name would not work here: private folders are excluded from routing entirely, so there would be nothing to rewrite to.)

**5. Render per tenant.** Each page loads the tenant by slug and calls \`notFound()\` if it does not exist. Known tenants can be prerendered with [\`generateStaticParams\`](/interview-question/what-is-generatestaticparams-in-next-js-and-how-does-it-enable-ssg-for-dynamic-r), and \`export const revalidate = 60\` makes them [ISR](/interview-question/what-is-isr-incremental-static-regeneration-in-next-js-and-how-do-you-implement-) pages. Because the tenant is part of the path, cache entries are naturally separate per tenant.

**6. Isolate data.** Resolve the tenant once on the server, and pass its id into a data access layer that adds \`WHERE tenant_id = ?\` to everything. Never accept a tenant id from the client. Authorization checks belong there too; see [authentication](/interview-question/how-do-you-handle-authentication-in-next-js).

**7. Per-tenant details.** Metadata (\`generateMetadata\` reading the tenant), theming, \`sitemap.ts\` and \`robots.ts\` per host, cookies scoped to the exact host (or to \`.example.com\` only if you want a session shared across tenants), and \`serverActions.allowedOrigins\` when a proxy in front changes the host Server Actions see.

## 5. Caching and Lifecycle Edge Cases

- **New tenant, cached 404.** With \`dynamicParams\` left at its default, an unknown slug is rendered on demand. In the lab, \`nope.example.com\` returned 404 with \`x-nextjs-cache: MISS\`, and the second request returned the **cached** 404 (\`HIT\`). If that tenant signs up a minute later, visitors keep getting 404 until revalidation. Call \`revalidatePath("/s/<slug>")\` when a tenant is created; see [on-demand revalidation](/interview-question/what-is-on-demand-revalidation-in-next-js-revalidatepath-revalidatetag).
- **Tenant updates.** Changing a tenant's name or theme should revalidate that tenant's paths or tags, not the whole site.
- **Unknown hosts.** The lab proxy served the marketing site for an unrelated host (\`evil.test\`). In production, decide explicitly: 404 or redirect unknown hosts, so someone else's domain pointed at your servers does not serve your marketing page.
- **Static assets are shared.** \`/_next/static\` files are the same for every tenant, so the matcher skips them and the CDN can cache them once.

## 6. Verified — Next.js 16.4.2 Lab

Build output (the two known tenants prerendered, the dashboard dynamic because it reads \`headers()\`):

\`\`\`
Route (app)
┌ ○ /
├ ○ /_not-found
├   /s/[tenant]
│ ├ ● /s/acme
│ └ ● /s/globex
└ ƒ /s/[tenant]/dashboard


ƒ Proxy (Middleware)

○  (Static)   prerendered as static content
●  (SSG)      prerendered as static HTML (uses generateStaticParams)
ƒ  (Dynamic)  server-rendered on demand
\`\`\`

\`curl -H "Host: ..."\` against one \`next start\` process (status, the \`x-tenant\` header the proxy adds, \`x-nextjs-cache\`, and the rendered heading):

\`\`\`
example.com            /            200  x-tenant=        cache=HIT    <h1>Platform home</h1><p>Sign up for your own subdomain</p>
www.example.com        /            200  x-tenant=        cache=HIT    <h1>Platform home</h1><p>Sign up for your own subdomain</p>
acme.example.com       /            200  x-tenant=acme    cache=HIT    <h1>Acme Corp</h1>
globex.example.com     /            200  x-tenant=globex  cache=HIT    <h1>Globex</h1>
acme.example.com       /dashboard   200  x-tenant=acme    cache=       
shop.acme.test         /dashboard   200  x-tenant=acme    cache=       
nope.example.com       /            404  x-tenant=nope    cache=MISS   
example.com            /s/acme      404  x-tenant=        cache=       
acme.example.com       /s/globex    404  x-tenant=        cache=       
evil.test              /            200  x-tenant=        cache=HIT    <h1>Platform home</h1><p>Sign up for your own subdomain</p>
\`\`\`

The dashboard bodies (rendered per request, so no cache header):

\`\`\`
<main><h1>Acme Corp dashboard</h1><p>served for host acme.example.com</p></main>
<main><h1>Acme Corp dashboard</h1><p>served for host shop.acme.test</p></main>
\`\`\`

Cache headers for the prerendered tenant page, and the unknown tenant on a second request:

\`\`\`
acme.example.com /  ->  x-nextjs-cache: HIT
                        Cache-Control: s-maxage=60, stale-while-revalidate=31535940
nope.example.com /  ->  404, x-nextjs-cache: HIT
\`\`\`

The build wrote one prerendered file set per tenant under \`.next/server/app/s/\`: \`acme.html\`, \`acme.rsc\`, \`acme.meta\`, \`acme.segments\`, and the same for \`globex\`.

With \`ROOT_DOMAIN=localhost\`, Chromium resolved \`*.localhost\` to the local server:

\`\`\`
http://localhost:4185/                     Platform home
http://acme.localhost:4185/                Acme Corp
http://globex.localhost:4185/dashboard     Globex dashboard
\`\`\`

Not verified here: DNS, wildcard and per-domain TLS, platform domain APIs, and cookies across subdomains.

## 7. Common Pitfalls

- **Leaving the internal tree reachable.** \`/s/<other-tenant>\` on any host renders another tenant's pages unless the proxy blocks it.
- **Trusting a client-sent tenant id.** Derive the tenant from the host on the server and scope every query with it.
- **Cached 404s for new tenants.** Revalidate the tenant path on creation, as the lab's cached \`nope\` 404 shows.
- **Serving anything for unknown hosts.** Return 404 or redirect for hosts that are neither the root domain, a subdomain, nor a verified custom domain.
- **Redirecting instead of rewriting.** The internal path leaks into the address bar and every request costs a round trip.
- **Global caches keyed only by path.** Your own caches (Redis, \`'use cache'\` arguments) must include the tenant, or one tenant's data is served to another.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">One Next.js deployment serves all tenants: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">proxy.ts</code> reads the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Host</code> header, works out the tenant, and rewrites <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/dashboard</code> to an internal <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/s/acme/dashboard</code> route.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">A rewrite changes only what the server renders, not the browser URL; subdomains are parsed against the root domain, and custom domains are looked up in a table.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;">Because the tenant is in the internal path, ISR and caches are per tenant automatically; known tenants can be prerendered with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">generateStaticParams</code>, new ones render on demand.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;">The routing is the easy part; isolation lives in the data layer, where every query is scoped to the resolved tenant, and the proxy blocks direct requests to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/s/*</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">Watch the cache edges: in my lab an unknown tenant returned a 404 that was then cached, so creating that tenant later needs a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">revalidatePath</code> or it stays missing until revalidation.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test subdomains locally?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Send the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Host</code> header with curl, or use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">acme.localhost</code>: in the lab, Chromium opened <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">http://acme.localhost:4185/</code> and got the Acme page with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ROOT_DOMAIN=localhost</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Rewrite or redirect?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Rewrite. A redirect would expose <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/s/acme</code> in the address bar and cost a round trip; a rewrite keeps <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">acme.example.com/dashboard</code> visible.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you stop tenant A from seeing tenant B data?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Resolve the tenant once on the server, pass the id into a data access layer, and filter every query by it. Never trust a tenant id sent by the client.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about Server Actions on custom domains?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Server Actions compare the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Origin</code> with the host. If a proxy in front changes the host, list the user-facing domains in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">serverActions.allowedOrigins</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you split tenants into separate deployments?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When tenants need different code versions, data residency, or strict blast-radius isolation. Otherwise one app with host-based routing is simpler to run.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Tenant** | One customer organization isolated inside a shared app |
| **Host-based routing** | Choosing content from the Host header |
| **Rewrite** | Serve an internal path while the public URL stays the same |
| **Wildcard DNS** | \`*.example.com\` pointing all subdomains at one deployment |
| **Custom domain** | A tenant-owned domain mapped to its tenant through a lookup table |
| **Tenant isolation** | Every data access scoped to the resolved tenant on the server |

---
**Conclusion:** A multi-tenant Next.js app is one deployment plus a directory at the door: \`proxy.ts\` resolves the tenant from the \`Host\` header and rewrites to an internal \`/s/[tenant]\` route, so the browser keeps the tenant URL while ordinary dynamic routes, \`generateStaticParams\` and ISR do the rest, with cache entries separated per tenant for free. The lab confirmed subdomains and custom domains reaching the same tenant, the root domain falling through to marketing pages, direct \`/s/*\` access blocked, and one sharp edge: unknown tenants produce cached 404s that need revalidating when the tenant is created. Isolation itself belongs in the data layer. When tenants need different code entirely, compare with [Multi-Zones](/interview-question/what-are-multi-zones-in-next-js-and-when-would-you-split-an-app-into-zones).`,
    examples: [
      {
        label: "proxy.ts: map subdomains and custom domains to an internal route",
        tech: "ts",
        runnable: false,
        code: `// proxy.ts
import { NextRequest, NextResponse } from "next/server";
import { ROOT_DOMAIN, tenantFromCustomDomain } from "./lib/tenants";

function resolveTenant(host: string): string | null {
  const hostname = host.split(":")[0].toLowerCase();
  if (hostname === ROOT_DOMAIN || hostname === \`www.\${ROOT_DOMAIN}\`) return null; // marketing site
  if (hostname.endsWith(\`.\${ROOT_DOMAIN}\`)) return hostname.slice(0, -(ROOT_DOMAIN.length + 1));
  return tenantFromCustomDomain(hostname); // custom domain, or null
}

export function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const { pathname, search } = request.nextUrl;
  const tenant = resolveTenant(host);

  // Nobody may reach the internal /s/* tree directly.
  if (pathname.startsWith("/s/")) return new NextResponse("Not found", { status: 404 });

  if (!tenant) return NextResponse.next(); // root domain: the marketing pages in app/

  const url = request.nextUrl.clone();
  url.pathname = \`/s/\${tenant}\${pathname}\`;
  url.search = search;
  const res = NextResponse.rewrite(url);
  res.headers.set("x-tenant", tenant);
  return res;
}

export const config = {
  matcher: ["/((?!_next/|favicon.ico|.*\\\\..*).*)"],
};`,
      },
      {
        label: "app/s/[tenant]/page.tsx: one prerendered page per tenant",
        tech: "tsx",
        runnable: false,
        code: `// app/s/[tenant]/page.tsx
import { notFound } from "next/navigation";
import { getTenant, allTenantSlugs } from "@/lib/tenants";

export const revalidate = 60;
export function generateStaticParams() {
  return allTenantSlugs().map((tenant) => ({ tenant }));
}

export default async function TenantHome({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = await params;
  const tenant = await getTenant(slug);
  if (!tenant) notFound();
  return <main><h1>{tenant.name}</h1><p>plan: {tenant.plan}</p></main>;
}`,
      },
      {
        label: "lib/tenants.ts: the tenant lookup",
        tech: "ts",
        runnable: false,
        code: `// lib/tenants.ts
export type Tenant = { slug: string; name: string; plan: "free" | "pro"; customDomain?: string };

// In a real app this is a database or edge config lookup.
const TENANTS: Tenant[] = [
  { slug: "acme", name: "Acme Corp", plan: "pro", customDomain: "shop.acme.test" },
  { slug: "globex", name: "Globex", plan: "free" },
];

export const ROOT_DOMAIN = process.env.ROOT_DOMAIN ?? "example.com";

export async function getTenant(slug: string): Promise<Tenant | null> {
  return TENANTS.find((t) => t.slug === slug) ?? null;
}

export function tenantFromCustomDomain(host: string): string | null {
  return TENANTS.find((t) => t.customDomain === host)?.slug ?? null;
}

export function allTenantSlugs() {
  return TENANTS.map((t) => t.slug);
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you self-host Next.js across multiple instances (cache handlers, ISR, build IDs)?",
    seoDescription: "Run Next.js on many instances: one build artifact, a shared cacheHandler for ISR, deploymentId and a pinned encryption key. Measured on Next.js 16.4.2.",
    description: `**Question presented to candidate:**
"We run Next.js on Kubernetes with four replicas behind a load balancer. Editors say a published article sometimes shows the old version, depending on the refresh, and after deploys some users get 'Failed to find Server Action'. What is going on, and how should multi-instance self-hosting be set up?"

**What a strong answer should cover:**
- By default the ISR and data cache lives on each instance's disk and memory, so \`revalidatePath\` or \`revalidateTag\` on one replica leaves the others stale.
- A custom \`cacheHandler\` (and \`cacheHandlers\` for \`'use cache'\`) backed by a shared store, with \`cacheMaxMemorySize: 0\`, plus tag invalidation shared across instances.
- Build once and run the same artifact everywhere: separate builds get different build IDs, Server Action IDs and encryption keys.
- \`deploymentId\` for version skew during rolling deploys (asset \`?dpl=\`, deployment headers, hard reload on mismatch); \`generateBuildId\` when you must rebuild per environment; \`NEXT_SERVER_ACTIONS_ENCRYPTION_KEY\` pinned.
- Operational pieces: a reverse proxy with buffering disabled for streaming, graceful shutdown, and a CDN that respects \`Cache-Control\`.

**Clarifying questions expected:**
- "Does each pod run \`next build\`, or is one image deployed?" — it decides whether IDs and keys can match.
- "Is there a shared store available, like Redis?" — it is the basis for a shared cache.

**Code / implementation expected:** Yes — a \`next.config\` with \`cacheHandler\` and \`deploymentId\`, and a sketch of the shared handler.`,
    answer: `**Target Audience:** Engineers who deploy Next.js themselves (containers, Kubernetes, VMs) and are preparing for senior or platform interviews.
**Difficulty:** Hard

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.4.2 self-hosting guide and config references shipped with the package and, in the **Verified** section, against two or more real \`next start\` instances of 16.4.2 builds, with a shared-directory cache handler standing in for Redis.

## 1. Why This Even Matters — A Story First

A newspaper prints its front page in four printing plants. Each plant keeps a copy of the page on its own press. When an editor phones plant A with a correction, plant A reprints; plants B, C and D keep printing the old page. Readers get the corrected or the uncorrected paper depending on which plant their truck came from.

That is a multi-instance Next.js deployment with the default cache. Each instance keeps ISR pages and cached data locally, so \`revalidatePath\` on the instance that happened to receive the request fixes only that instance. The cure is a shared plate room every press reads from: a **shared cache handler**.

There is a second, nastier story. If each plant typesets the paper itself from the same manuscript, the pages come out with different internal reference numbers. A reader who fills in a coupon from plant A's paper and posts it to plant B gets "unknown coupon". In Next.js that is "Failed to find Server Action", and the cure is to **build once and ship the same artifact everywhere**.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Does each container run \`next build\`, or is one image promoted? | Separate builds get different build IDs, action IDs and keys |
| Which caching features are used: ISR, fetch tags, \`'use cache'\`? | Decides between \`cacheHandler\`, \`cacheHandlers\`, or both |
| Is a shared store available (Redis, Memcached, S3)? | The shared cache needs one, with eviction and serialization |
| How are deploys rolled out: rolling, blue/green, canary? | Mixed versions need \`deploymentId\` and, ideally, routing by deployment |
| What sits in front: nginx, a CDN, a cloud load balancer? | Buffering breaks streaming; the CDN must respect \`Cache-Control\` |
| How long can a pod take to shut down? | Graceful drain for in-flight requests and \`after()\` work |

## 3. The Core Idea

📌 **Interview term: Server cache (incremental cache)** — where Next.js keeps prerendered and revalidated pages, Route Handler responses and \`fetch\` cache entries. The 16.4.2 self-hosting guide says it is stored by default on the local filesystem of each instance, with an in-memory layer that defaults to 50 MB.

📌 **Interview term: \`cacheHandler\`** — a module path in \`next.config\` whose default export is a class with \`get\`, \`set\`, \`revalidateTag\` and \`resetRequestCache\`. Next.js calls it instead of the built-in filesystem cache. It is **not** used by \`'use cache'\`; that uses **\`cacheHandlers\`** (plural), stable since 16.0.

📌 **Interview term: Build ID** — the identifier \`next build\` writes to \`.next/BUILD_ID\`, identifying which build is being served.

📌 **Interview term: Version skew** — a client running code from one deployment talking to a server from another: missing chunks, unknown Server Action IDs, incompatible prefetched payloads.

📌 **Interview term: \`deploymentId\`** — a config value (or \`NEXT_DEPLOYMENT_ID\`) that Next.js appends to assets as \`?dpl=\`, sends as \`x-deployment-id\` on navigations and returns as \`x-nextjs-deployment-id\`; on mismatch the client does a hard navigation.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 330" role="img" aria-label="Default per instance cache versus a shared cache handler after a revalidation on instance A">
  <defs>
    <marker id="n15q7-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="26" text-anchor="middle">After revalidatePath on instance A (lab)</text>
  <text class="d-text" x="169" y="58" text-anchor="middle">Default cache</text>
  <rect class="d-box" x="24" y="76" width="130" height="64" rx="10"/>
  <text class="d-text" x="89" y="102" text-anchor="middle">A</text>
  <text class="d-sub" x="89" y="124" text-anchor="middle">fresh 10:13:15</text>
  <rect class="d-box-muted" x="184" y="76" width="130" height="64" rx="10"/>
  <text class="d-text" x="249" y="102" text-anchor="middle">B</text>
  <text class="d-sub" x="249" y="124" text-anchor="middle">stale 10:12:59</text>
  <rect class="d-box-muted" x="24" y="176" width="130" height="50" rx="10"/>
  <text class="d-sub" x="89" y="206" text-anchor="middle">disk + memory A</text>
  <rect class="d-box-muted" x="184" y="176" width="130" height="50" rx="10"/>
  <text class="d-sub" x="249" y="206" text-anchor="middle">disk + memory B</text>
  <path class="d-edge" d="M 89 144 L 89 172" marker-end="url(#n15q7-arrow)"/>
  <path class="d-edge" d="M 249 144 L 249 172" marker-end="url(#n15q7-arrow)"/>
  <text class="d-text" x="491" y="58" text-anchor="middle">Shared cacheHandler</text>
  <rect class="d-box" x="346" y="76" width="130" height="64" rx="10"/>
  <text class="d-text" x="411" y="102" text-anchor="middle">A</text>
  <text class="d-sub" x="411" y="124" text-anchor="middle">fresh 10:13:41</text>
  <rect class="d-box" x="506" y="76" width="130" height="64" rx="10"/>
  <text class="d-text" x="571" y="102" text-anchor="middle">B</text>
  <text class="d-sub" x="571" y="124" text-anchor="middle">fresh 10:13:41</text>
  <path class="d-edge d-edge-accent" d="M 411 144 L 470 192" marker-end="url(#n15q7-arrow)"/>
  <path class="d-edge d-edge-accent" d="M 571 144 L 512 192" marker-end="url(#n15q7-arrow)"/>
  <rect class="d-box-accent" x="396" y="198" width="190" height="56" rx="10"/>
  <text class="d-text d-accent" x="491" y="222" text-anchor="middle">shared store</text>
  <text class="d-sub" x="491" y="242" text-anchor="middle">entries + tag index</text>
</svg>

On the left each instance answers from its own copy; on the right both read one store, so a revalidation anywhere is visible everywhere.

## 4. The Checklist

**1. One artifact, many instances.** Run \`next build\` once in CI, bake the output into an image (with [\`output: "standalone"\`](/interview-question/what-is-the-output-standalone-build-in-next-js-and-when-do-you-use-it) it is a self-contained server), and run that image everywhere. The guide's Build Cache section: "The same build should be used and boot up multiple containers." If you must rebuild per environment, \`generateBuildId\` gives a consistent ID; since 16.2, setting \`deploymentId\` makes the build ID constant unless \`generateBuildId\` is configured (deploymentId reference, version history).

**2. A shared server cache.** Set \`cacheHandler\` to a module backed by Redis, Memcached, S3 or similar, and \`cacheMaxMemorySize: 0\`. The 16.4.2 guide lists what a production handler must do: store entries where every instance can reach them (a process-local \`Map\` is not shared), bound the store with TTLs or eviction, **serialize** entries properly (they contain \`Buffer\` and \`Map\` values that \`JSON.stringify\` cannot round-trip, which otherwise surfaces as \`segmentData.get is not a function\`), index entries by tag (page entries carry tags in the \`x-next-cache-tags\` header, fetch entries in \`ctx.tags\`), and handle storage errors. \`revalidatePath\` arrives at your handler as \`revalidateTag\` with an internal tag, which the lab logged as \`_N_T_/news\`. See [ISR](/interview-question/what-is-isr-incremental-static-regeneration-in-next-js-and-how-do-you-implement-) and [on-demand revalidation](/interview-question/what-is-on-demand-revalidation-in-next-js-revalidatepath-revalidatetag).

**3. \`'use cache'\` too, if you use it.** [Cache Components](/interview-question/what-are-cache-components-in-next-js-16-and-how-does-the-use-cache-directive-wor) default to an in-memory LRU per process. Configure \`cacheHandlers\` (for example a \`remote\` handler used by \`'use cache: remote'\`) and implement \`refreshTags()\` so each instance syncs tag invalidations from the shared store before requests (Multi-Instance Cache Coordination section). Not tested in this lab.

**4. Version skew protection.** Set \`deploymentId\` per release. In a rolling deploy the docs add an important caveat: Next.js does not route on \`?dpl=\`, so without deployment-aware routing at your load balancer, clients that hit the other version reload rather than navigate. That is safe, but it costs state.

**5. Server Functions encryption key.** Next.js encrypts closure variables of Server Functions with a per-build key. Pin it with \`NEXT_SERVER_ACTIONS_ENCRYPTION_KEY\` (base64, 16, 24 or 32 bytes). The lab shows why the key alone is not the whole story: fresh builds also get new action IDs.

**6. The rest of the platform.** A reverse proxy in front (the guide recommends it for malformed requests, slow-client attacks and rate limits) with buffering disabled for streaming (\`X-Accel-Buffering: no\`); graceful shutdown with \`SIGTERM\` and a 10-30 second drain so in-flight requests and [\`after()\`](/interview-question/what-is-after-in-next-js-and-when-should-you-use-it) callbacks finish; and a CDN that respects \`s-maxage\` and \`stale-while-revalidate\`. See [deploying: Vercel vs self-hosted](/interview-question/how-do-you-deploy-a-next-js-app-vercel-vs-self-hosted).

## 5. Verified — Next.js 16.4.2, Several Instances

Lab app: \`/news\` with \`export const revalidate = 3600\` printing its render time and \`process.env.INSTANCE\`, a Route Handler calling \`revalidatePath("/news")\`, and a dynamic \`/order\` page with an inline Server Action that closes over \`orderId\`. Build:

\`\`\`
Route (app)          Revalidate  Expire
┌ ○ /
├ ○ /_not-found
├ ƒ /api/revalidate
├ ○ /news                    1h      1y
└ ƒ /order
\`\`\`

**1. Default cache, one build copied to two directories, instances A and B:**

\`\`\`
A /news                            rendered 2026-10-16T10:12:59.126Z  cache=HIT
B /news                            rendered 2026-10-16T10:12:59.126Z  cache=HIT
POST A /api/revalidate -> {"revalidated":"/news","by":"A"}
A /news (1st after revalidate)     rendered 2026-10-16T10:13:15.696Z  cache=MISS
A /news (2nd)                      rendered 2026-10-16T10:13:15.696Z  cache=HIT
B /news                            rendered 2026-10-16T10:12:59.126Z  cache=HIT
B /news (again)                    rendered 2026-10-16T10:12:59.126Z  cache=HIT
\`\`\`

B kept serving the build-time page; it would until its own revalidate window (one hour) expired.

**2. Same app with the shared handler from the examples** (\`cacheHandler\` plus \`cacheMaxMemorySize: 0\`, both instances pointing at one directory):

\`\`\`
A /news                            rendered 2026-10-16T10:13:41.526Z by A  cache=MISS
B /news                            rendered 2026-10-16T10:13:41.526Z by A  cache=HIT
POST A /api/revalidate -> {"revalidated":"/news","by":"A"}
A /news (1st after revalidate)     rendered 2026-10-16T10:13:41.661Z by A  cache=MISS
A /news (2nd)                      rendered 2026-10-16T10:13:41.661Z by A  cache=HIT
B /news                            rendered 2026-10-16T10:13:41.661Z by A  cache=HIT
B /news (again)                    rendered 2026-10-16T10:13:41.661Z by A  cache=HIT
\`\`\`

What instance A's handler logged:

\`\`\`
[cache A] set /route-cache/APP_PAGE/dc2d23c79cd1c7a13f6d2ae36e37f9979b6584f87daea4d03b56e1777221de60/$/news
[cache A] revalidateTag ["_N_T_/news"]
[cache A] set /route-cache/APP_PAGE/dc2d23c79cd1c7a13f6d2ae36e37f9979b6584f87daea4d03b56e1777221de60/$/news
\`\`\`

Two details worth knowing. First, the very first request was a \`MISS\`: the build-time prerender was not handed to the custom handler, so the first visitor after a deploy renders the page. This matches the 16.4.2 \`cacheHandler\` reference, which says custom handlers receive scoped keys and are never queried with a historical pathname. Second, the key format: the 64-hex segment is SHA-256 of the source page module name, which the lab confirmed (\`printf %s "/news/page" | sha256sum\` starts with \`dc2d23c79cd1c7a13f6d\`). Treat keys as opaque, as the docs say.

**3. Build IDs and Server Action IDs across separate builds** (fresh directories, identical source):

\`\`\`
A   BUILD_ID=1g1pStc6IokIz88YmMdaq    action ids=40a4e60d593804 
B   BUILD_ID=XUwghbrqsAcK6qSecDPQy    action ids=400caea8408024 
C   BUILD_ID=abc123                   action ids=4045abe83b9467     (generateBuildId + pinned key)
D   BUILD_ID=abc123                   action ids=40b3dd35cb61ae     (generateBuildId + pinned key)
\`\`\`

The embedded encryption key (in \`.next/server/server-reference-manifest.json\`) differed between A and B and was identical for C and D. Rebuilding in the **same** directory (build cache kept) reused both the action ID and the key, with or without the variable.

Submitting the \`/order\` form fetched from one instance to another (a no-JavaScript form POST with the hidden \`$ACTION_*\` fields, where the closure value travels encrypted):

\`\`\`
== page from A, action sent to A2   (same build, copied)
form from :4188 posted to :4189 -> HTTP 200
[A2] confirm ran for order-42
== page from A, action sent to B    (separate fresh builds)
form from :4188 posted to :4189 -> HTTP 409
Error: Failed to find Server Action "40a4e60d593804875f8f8e34a968a74e89ebd389c2". This request might be from an older or newer deployment.
== page from E1-nokey, action sent to E2-nokey   (rebuilt in place, cache kept)
form from :4188 posted to :4189 -> HTTP 200
== page from E1-key, action sent to E2-key       (rebuilt in place, pinned key)
form from :4188 posted to :4189 -> HTTP 200
\`\`\`

So in this lab the failure across separately built instances came from the action IDs; a pinned key did not change that for fresh builds. One shared artifact worked every time.

**4. \`deploymentId\`** (\`DEPLOYMENT_VERSION=v42\` at build):

\`\`\`
BUILD_ID=build-TfctsWXpff2fKS
<html data-dpl-id="v42" lang="en">
src="/_next/static/chunks/0qlg0f0s6hldz.js?dpl=v42"
HTTP/1.1 200 OK
x-nextjs-deployment-id: v42
\`\`\`

A second fresh build with \`v43\` produced the same \`BUILD_ID=build-TfctsWXpff2fKS\`, confirming the constant build ID when \`deploymentId\` is set.

Not verified here: Redis or any real shared store, \`cacheHandlers\` for \`'use cache'\` with \`refreshTags()\`, Kubernetes rolling updates, CDNs, nginx and graceful-shutdown timing. The shared directory is a stand-in; it has none of the eviction or error handling a production handler needs.

## 6. Common Pitfalls

- **Running \`next build\` inside each container.** Different build IDs, action IDs and keys per pod; the lab got HTTP 409 "Failed to find Server Action" across two such builds.
- **A \`Map\` as the "shared" cache.** It lives inside one process; the docs call this out explicitly.
- **\`JSON.stringify\` on cache entries.** \`Buffer\` and \`Map\` values do not round-trip; use a real serializer (the lab used \`v8.serialize\`).
- **Leaving the in-memory cache on.** Without \`cacheMaxMemorySize: 0\`, each instance can still answer from its local copy.
- **Forgetting the first-request cost.** With a custom handler the store starts empty after a deploy; warm important pages if that latency matters.
- **Rolling deploys without \`deploymentId\`.** Clients mid-session hit missing chunks or unknown actions; with it they get a controlled hard reload.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Out of the box each <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next start</code> instance caches ISR pages and fetch data on its own disk and memory, so a revalidation on one replica leaves the others stale.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">For several instances I configure <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cacheHandler</code> with a shared store such as Redis and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cacheMaxMemorySize: 0</code>, and keep a shared tag index so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">revalidateTag</code> on one instance invalidates everywhere.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;">I build once and ship the same artifact to every instance; two fresh builds of identical code got different build IDs, action IDs and encryption keys in my lab, and a form from one was rejected by the other with HTTP 409.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;">For rolling deploys I set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">deploymentId</code>: assets get <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">?dpl=</code>, navigations carry the deployment id, and a mismatch triggers a hard reload instead of a broken navigation.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">The traps are rebuilding per container, an in-process <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> as the shared cache, and buffering proxies that break streaming; and with a custom handler, build-time prerenders are not pre-seeded, so the first request renders.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">cacheHandler</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">cacheHandlers</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cacheHandler</code> (singular) stores ISR pages, Route Handler responses, fetch cache entries and optionally images. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cacheHandlers</code> (plural) are the backends for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">'use cache'</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">'use cache: remote'</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">cacheMaxMemorySize: 0</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The default 50 MB in-memory cache is per process. With a shared store, a local copy could still serve stale data after another instance revalidates.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">NEXT_SERVER_ACTIONS_ENCRYPTION_KEY</code> matter?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It pins the key that encrypts closure variables of Server Functions. In the lab it did not make two fresh builds compatible, because their action IDs still differed; one shared artifact is the real fix, and the pinned key keeps rebuilds of a release consistent.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">generateBuildId</code> solve?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A consistent build ID when the same code is built separately per environment. In 16.2 and later, setting <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">deploymentId</code> already makes the build ID constant unless you configure <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">generateBuildId</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do other instances learn about a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">revalidateTag</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Through the shared store: the handler records the tag timestamp there and treats older entries as misses. For <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">'use cache'</code> handlers, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">refreshTags()</code> syncs tag state before each request.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Server cache** | Where ISR pages and fetch data are kept; per instance by default |
| **\`cacheHandler\`** | Custom backend for that cache (singular; not \`'use cache'\`) |
| **\`cacheHandlers\`** | Backends for \`'use cache'\` and \`'use cache: remote'\` |
| **Build ID** | Identifier of one \`next build\` output |
| **\`deploymentId\`** | Release id used for version-skew detection and asset cache busting |
| **Version skew** | Client and server from different deployments |

---
**Conclusion:** Self-hosting on many instances means removing everything that is quietly per-instance. Build once and run the same artifact everywhere, because separate builds disagree on build IDs, Server Action IDs and keys, as the lab's HTTP 409 showed. Move the server cache to a shared store with a \`cacheHandler\`, \`cacheMaxMemorySize: 0\` and a shared tag index, so one \`revalidatePath\` refreshes every instance, which the lab demonstrated against the stale default. Add \`deploymentId\` for rolling deploys, pin the encryption key, disable proxy buffering, and drain gracefully. For the caching model this builds on, see [the caching layers in Next.js](/interview-question/what-are-the-caching-layers-in-next-js-request-memoization-data-cache-full-route).`,
    examples: [
      {
        label: "next.config.ts for a multi-instance deployment",
        tech: "ts",
        runnable: false,
        code: `// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // self-contained server for the container image

  // ISR pages, Route Handler responses and fetch cache entries go to a shared store,
  // not to each instance's disk and memory.
  cacheHandler: require.resolve("./cache-handler.mjs"),
  cacheMaxMemorySize: 0, // no per-instance in-memory copy that could go stale

  // Version skew protection: ?dpl= on assets, x-deployment-id on navigations,
  // hard reload when a client meets a different deployment.
  deploymentId: process.env.DEPLOYMENT_VERSION,
};

export default nextConfig;`,
      },
      {
        label: "cache-handler.mjs: a shared-store cache handler (lab stand-in for Redis)",
        tech: "ts",
        runnable: false,
        code: `// cache-handler.mjs (referenced from next.config.ts)
// Lab stand-in for Redis: every instance reads and writes the same directory.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { serialize, deserialize } from "node:v8"; // keeps Buffer and Map values intact

const DIR = process.env.SHARED_CACHE_DIR ?? "/tmp/next-shared-cache";
mkdirSync(DIR, { recursive: true });
const file = (key) => join(DIR, createHash("sha256").update(key).digest("hex"));
const TAGS = join(DIR, "tags.json");
const readTags = () => (existsSync(TAGS) ? JSON.parse(readFileSync(TAGS, "utf8")) : {});

export default class SharedCacheHandler {
  async get(key) {
    const f = file(key);
    if (!existsSync(f)) return null;
    const entry = deserialize(readFileSync(f));
    const tags = [...(entry.tags ?? []), ...String(entry.value?.headers?.["x-next-cache-tags"] ?? "").split(",").filter(Boolean)];
    const revalidated = readTags();
    if (tags.some((t) => (revalidated[t] ?? 0) > entry.lastModified)) return null; // invalidated elsewhere
    return entry;
  }
  async set(key, data, ctx) {
    console.log(\`[cache \${process.env.INSTANCE}] set \${key}\`);
    writeFileSync(file(key), serialize({ value: data, lastModified: Date.now(), tags: ctx?.tags ?? [] }));
  }
  async revalidateTag(tags) {
    const all = readTags();
    for (const t of [tags].flat()) all[t] = Date.now();
    writeFileSync(TAGS, JSON.stringify(all));
    console.log(\`[cache \${process.env.INSTANCE}] revalidateTag \${JSON.stringify(tags)}\`);
  }
  resetRequestCache() {}
}`,
      },
      {
        label: "Build once, run many: the deployment pipeline",
        tech: "bash",
        runnable: false,
        code: `# 1. Build ONCE in CI. Pin the Server Functions key so a rebuild of the same
#    release keeps decrypting closures created by the previous one.
export NEXT_SERVER_ACTIONS_ENCRYPTION_KEY="$(vault read -field=key secret/next-actions)"  # openssl rand -base64 32, stored once
export DEPLOYMENT_VERSION="$(git rev-parse --short HEAD)"
next build
docker build -t registry.example.com/shop:"$DEPLOYMENT_VERSION" .

# 2. Run the SAME image on every instance (never \`next build\` per container).
#    All instances share the cache store and the deployment id.
docker run -e INSTANCE=a -e REDIS_URL=redis://cache:6379 -p 3000:3000 registry.example.com/shop:"$DEPLOYMENT_VERSION"
docker run -e INSTANCE=b -e REDIS_URL=redis://cache:6379 -p 3001:3000 registry.example.com/shop:"$DEPLOYMENT_VERSION"

# 3. Behind nginx: disable buffering for streaming, and drain on shutdown
#    (send SIGTERM and wait 10-30 s so in-flight requests and after() callbacks finish).`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are Multi-Zones in Next.js and when would you split an app into zones?",
    seoDescription: "Multi-Zones serve one domain from several Next.js apps via rewrites and assetPrefix. Two-app lab on Next.js 16.4.2: navigation, assets, Server Actions.",
    description: `**Question presented to candidate:**
"Our Next.js monolith takes 25 minutes to build and three teams keep blocking each other's releases. Someone proposed Multi-Zones. What are they, how do they work, and would you recommend them here?"

**What a strong answer should cover:**
- A zone is a separate Next.js app serving a set of paths on the same domain (for example \`/blog/*\`); a default zone serves everything else.
- Routing by rewrites in the default app's \`next.config\` (or any HTTP proxy, or \`proxy.ts\` for dynamic decisions), and \`assetPrefix\` on each non-default zone so \`/_next\` assets do not collide.
- Navigation inside a zone is soft; crossing zones is a hard navigation, so links across zones should be plain \`<a>\` tags and pages used together should share a zone.
- Benefits: independent builds and deploys, smaller apps, team autonomy, even different frameworks. Costs: full reloads between zones, duplicated framework JavaScript, shared layout and design system drift, cross-zone Server Action origins, coordinated releases via feature flags.
- Alternatives to consider first: route groups and code ownership in one app, monorepo build caching, or splitting only truly separate sections.

**Clarifying questions expected:**
- "How often do users move between the sections we would split?" — frequent crossings make zones feel slow.
- "Is the pain build time, deploy coupling, or team ownership?" — some of those have cheaper fixes.

**Code / implementation expected:** Yes — the rewrites in the default zone and the \`assetPrefix\` in the other zone.`,
    answer: `**Target Audience:** Senior frontend and platform engineers preparing for architecture interviews — assumes App Router routing, rewrites and deployment basics.
**Difficulty:** Hard

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.4.2 Multi-Zones guide shipped with the package and, in the **Verified** section, against two real 16.4.2 apps (a home zone and a blog zone) running side by side, tested with \`curl\` and a real Chromium browser.

## 1. Why This Even Matters — A Story First

A big museum outgrows one building. Instead of one giant hall where every renovation closes the whole museum, it opens separate wings: the modern art wing, the history wing, the main hall. Each wing has its own staff, its own opening schedule and its own renovations. Visitors still enter through one front door and see one museum name, and a corridor sign tells them where each wing is.

Walking around inside a wing is smooth. Walking from one wing to another means going through a door and showing your ticket again. Curators therefore keep exhibits that people view together in the same wing.

Multi-Zones are wings for a Next.js site. \`example.com/blog\` and \`example.com/dashboard\` can be separate Next.js applications with separate builds and deploys, behind one domain. Moving within a zone is a soft navigation; crossing zones is a full page load, the door between wings.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| What is the actual pain: build time, deploy coupling, or team ownership? | Build time and ownership often have cheaper fixes inside one app |
| How often do users move between the sections we would split? | Every crossing is a full page load |
| Do the sections share layout, auth and design system? | Shared UI must become a package and is re-downloaded per zone |
| Are teams on different release cadences or even frameworks? | That is where zones shine |
| What routes traffic today: a CDN, nginx, a platform? | Any HTTP proxy can split paths; the default zone can too |
| Do sections use Server Actions? | Cross-zone origins need \`allowedOrigins\` in some setups |

## 3. The Core Idea

📌 **Interview term: Zone** — a normal, independently built and deployed Next.js application that serves a set of URL paths on a shared domain. The 16.4.2 guide calls Multi-Zones an approach to micro-frontends.

📌 **Interview term: Default zone** — the application that serves every path not routed to a more specific zone. It needs no \`assetPrefix\`, and it can also act as the router for the whole domain.

📌 **Interview term: \`assetPrefix\`** — a config value that prefixes a zone's JavaScript and CSS URLs (\`/blog-static/_next/...\`) so they never collide with another zone's \`/_next/...\` files.

📌 **Interview term: Micro-frontend** — splitting one user-facing product into several independently delivered frontend applications.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 330" role="img" aria-label="Multi-Zones lab. Browser talks to the home zone, which rewrites blog paths and blog-static assets to the blog zone">
  <defs>
    <marker id="n15q8-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="26" text-anchor="middle">One domain, two Next.js apps (lab)</text>
  <rect class="d-box-muted" x="24" y="120" width="150" height="80" rx="10"/>
  <text class="d-text" x="99" y="152" text-anchor="middle">Browser</text>
  <text class="d-sub" x="99" y="176" text-anchor="middle">one origin</text>
  <path class="d-edge" d="M 178 160 L 236 160" marker-end="url(#n15q8-arrow)"/>
  <rect class="d-box-accent" x="244" y="96" width="180" height="128" rx="10"/>
  <text class="d-text d-accent" x="334" y="126" text-anchor="middle">Home zone</text>
  <text class="d-sub" x="334" y="152" text-anchor="middle">serves / and /products</text>
  <text class="d-sub" x="334" y="176" text-anchor="middle">rewrites /blog/*</text>
  <text class="d-sub" x="334" y="200" text-anchor="middle">and /blog-static/*</text>
  <path class="d-edge d-edge-dashed" d="M 428 160 L 486 160" marker-end="url(#n15q8-arrow)"/>
  <rect class="d-box" x="494" y="96" width="142" height="128" rx="10"/>
  <text class="d-text" x="565" y="126" text-anchor="middle">Blog zone</text>
  <text class="d-sub" x="565" y="152" text-anchor="middle">serves /blog/*</text>
  <text class="d-sub" x="565" y="176" text-anchor="middle">assetPrefix</text>
  <text class="d-sub" x="565" y="200" text-anchor="middle">/blog-static</text>
  <rect class="d-box-muted" x="244" y="256" width="392" height="50" rx="10"/>
  <text class="d-sub" x="440" y="286" text-anchor="middle">crossing zones: 1 document load, window state lost</text>
</svg>

Each zone keeps its own router and its own JavaScript, so the browser treats moving between them like visiting a different site that happens to share a domain.

## 4. How to Set It Up

**1. Define the zones.** Each zone is an ordinary Next.js app whose pages live at the paths it owns (\`app/blog/page.tsx\` for \`/blog\`). URL paths must be unique to one zone; the guide notes that two zones serving \`/blog\` is a routing conflict.

**2. Give non-default zones an \`assetPrefix\`.** With \`assetPrefix: "/blog-static"\` the blog zone's HTML references \`/blog-static/_next/static/chunks/...\`. The guide notes that before Next.js 15 you also needed a rewrite inside the zone to serve those paths; since 15 that is no longer necessary, and the lab blog zone served them with no extra rule.

**3. Route requests.** Any HTTP proxy can split paths, but the default zone can do it with [\`rewrites()\`](/interview-question/how-do-you-handle-redirects-and-rewrites-in-next-js): \`/blog\`, \`/blog/:path+\` and \`/blog-static/:path+\` to the blog zone's origin (first example). The guide recommends rewrites for lower latency, and [\`proxy.ts\`](/interview-question/what-is-proxy-ts-in-next-js-16-and-how-do-you-migrate-from-middleware-ts) when the decision is dynamic, for example a feature flag moving a path to a new zone during a migration.

**4. Link with \`<a>\` across zones.** \`<Link>\` prefetches and soft-navigates relative paths, which cannot work into a different app. The guide says to use a plain \`a\` tag for paths in another zone. Keep \`<Link>\` within a zone; see [client-side navigation](/interview-question/how-does-client-side-navigation-work-in-next-js-next-link-and-userouter).

**5. Share code deliberately.** A monorepo makes shared headers, design system and auth helpers easy to consume; separate repositories can share private npm packages. Because zones release independently, the guide suggests feature flags to switch features on in unison.

**6. Server Actions.** The guide says to list the user-facing domain in \`experimental.serverActions.allowedOrigins\`, since one domain serves several apps. The lab shows precisely when that bites: Next.js rewrites forward the original host, so actions through the home zone worked; a request reaching the zone with a different host was rejected. See [Server Action security](/interview-question/what-are-the-security-considerations-for-server-actions-in-next-js).

## 5. When to Split, and When Not To

| Signal | Zones help? | Cheaper alternative |
| :--- | :--- | :--- |
| Independent teams with different release cadences | Yes | — |
| Sections that users rarely move between (marketing vs app vs docs) | Yes | — |
| A section on a different framework or major version (migration) | Yes, incrementally | — |
| Slow builds of one large app | Sometimes | Turbopack build caching, CI caching, fewer static pages |
| Messy code ownership | Rarely | [Route groups](/interview-question/what-are-route-groups-in-next-js-and-how-do-you-use-them) and CODEOWNERS, see [organizing a large project](/interview-question/how-do-you-organize-a-large-next-js-app-router-project-colocation-private-folder) |
| Flows that cross sections constantly (cart and product pages) | No | Keep them in one zone |

The honest summary: zones trade user-facing smoothness (soft navigations, one shared bundle) for organizational independence. They are worth it when the organizational problem is real and the crossings are rare. For multi-customer setups served by one codebase, see the different pattern in [multi-tenant subdomain routing](/interview-question/how-do-you-build-a-multi-tenant-next-js-app-with-subdomain-routing).

## 6. Verified — Two Next.js 16.4.2 Apps

The home zone (port 4186, no \`assetPrefix\`, rewrites from the first example pointing at port 4187) and the blog zone (port 4187, \`assetPrefix: "/blog-static"\`, \`/blog\` and \`/blog/[slug]\` with a Server Action form). Builds:

\`\`\`
blog zone                                  home zone
Route (app)                                Route (app)
┌ ○ /                                      ┌ ○ /
├ ○ /_not-found                            ├ ○ /_not-found
├ ○ /blog                                  └ ○ /products
└   /blog/[slug]
  └ ● /blog/hello
\`\`\`

**Everything through the home zone's port** (status and heading):

\`\`\`
/              200 <h1>Home zone</h1>
/products      200 <h1>Products (home zone)</h1>
/blog          200 <h1>Blog zone</h1>
/blog/hello    200 <h1>Post hello</h1>
/blog/missing  200 <h1>Post missing</h1>
\`\`\`

(\`/blog/missing\` rendered on demand because \`dynamicParams\` defaults to true.) The blog page's scripts used the prefix, the home page's did not:

\`\`\`
/blog  -> <script src="/blog-static/_next/static/chunks/0eslxmctnydq5.js"
/      -> <script src="/_next/static/chunks/0eslxmctnydq5.js"
\`\`\`

Both apps run the same Next.js and React versions, so framework chunks had **identical file names** in both builds; that is exactly the collision \`assetPrefix\` avoids once versions differ. A chunk that exists only in the blog build:

\`\`\`
localhost:4186/blog-static/_next/static/chunks/turbopack-3_hx5-791cmba.js        200
localhost:4186/_next/static/chunks/turbopack-3_hx5-791cmba.js                    404
localhost:4187/_next/static/chunks/turbopack-3_hx5-791cmba.js                    200
localhost:4187/blog-static/_next/static/chunks/turbopack-3_hx5-791cmba.js        200
\`\`\`

**Navigation in Chromium** (a marker on \`window\` before each click reveals whether the page was reloaded):

\`\`\`
home -> /products (Link)           h1="Products (home zone)" document loads=0 window state=kept
home -> /blog (plain a tag)        h1="Blog zone" document loads=1 window state=gone rsc requests=/blog/hello?_rsc=oz-_Q2BhlE850NaL, /blog/hello?_rsc=gIAB2TkNpNZOZpkT
blog -> /blog/hello (Link)         h1="Post hello" document loads=0 window state=kept
home -> /blog (next/link)          h1="Blog zone" document loads=1 window state=gone rsc requests=/blog?_rsc=Kj5MPPJ2XCusE5Hx, /blog/hello?_rsc=gIAB2TkNpNZOZpkT, ...
\`\`\`

Within each zone, soft navigation. Across zones, a full document load either way; with \`next/link\` the router additionally fetched \`/blog?_rsc=...\` first, a wasted request, before falling back. (The \`/blog/hello\` RSC requests are the blog page prefetching its own link after it loaded.)

**Server Action origin check.** Posting the blog action with \`Origin: http://localhost:4186\`:

\`\`\`
via-home-rewrite       200
direct-to-blog         500
\`\`\`

and the blog zone's log for the direct request:

\`\`\`
\`x-forwarded-host\` header with value \`localhost:4187\` does not match \`origin\` header with value \`localhost:4186\` from a forwarded Server Actions request. Aborting the action.
⨯ Error: Invalid Server Actions request.
\`\`\`

After rebuilding the blog zone with \`allowedOrigins: ["localhost:4186"]\`:

\`\`\`
direct-to-blog with allowedOrigins: 200
[blog] like action ran
\`\`\`

Not verified here: zones on different domains or platforms, a CDN or nginx as the splitter, and zones in separate repositories.

## 7. Common Pitfalls

- **Splitting flows users cross constantly.** Every crossing is a full reload with lost client state; keep related pages in one zone.
- **\`<Link>\` across zones.** It cannot soft-navigate into another app; in the lab it cost an extra RSC request before the full load. Use \`<a>\`.
- **Forgetting \`assetPrefix\`.** Two apps both serving \`/_next/static/...\` behind one domain will collide as soon as their builds differ.
- **Overlapping paths.** Two zones claiming the same path is a routing conflict; make ownership explicit in the routing config.
- **Server Actions behind a host-rewriting proxy.** If the zone sees a different host than the browser's origin, actions are rejected until \`allowedOrigins\` lists the user-facing origin.
- **Using zones to fix a code-organization problem.** Route groups, ownership rules and build caching are much cheaper.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Multi-Zones split one domain across several Next.js apps: each zone serves its own paths, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/blog/*</code>, and a default zone serves the rest, so each can be built and deployed independently.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">The default app proxies other zones with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rewrites()</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next.config</code>, and every non-default zone sets an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">assetPrefix</code> such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/blog-static</code> so its <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/_next</code> files do not collide.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;">Inside a zone navigation stays soft; across zones it is a full page load, which I measured, so cross-zone links are plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;a&gt;</code> tags and pages users move between belong in the same zone.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;">It is a team and build-time tool: separate pipelines, smaller bundles per app, freedom to upgrade or even change frameworks per zone.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">The costs are hard navigations, duplicated framework code, shared UI drifting apart, and Server Actions needing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">allowedOrigins</code> when the host is not forwarded, so I would try route groups and build caching first.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">next/link</code> to another zone?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In the lab it first fetched <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/blog?_rsc=...</code> through the rewrite, then fell back to a full document load anyway. Plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;a&gt;</code> skips the wasted request.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do you still need the extra asset rewrite inside the zone?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not since Next.js 15, per the docs. In the lab the blog zone served its chunks under <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/blog-static/_next/...</code> with only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">assetPrefix</code> set.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do Server Actions work across zones?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The action must see a matching origin. Through Next.js rewrites the lab action succeeded; posted directly to the zone with a different host it failed with an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x-forwarded-host</code> mismatch until <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">allowedOrigins</code> listed the user-facing origin.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Rewrites or proxy.ts for routing?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Rewrites are recommended for lower latency. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">proxy.ts</code> when the decision is dynamic, for example a feature flag during a migration.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do zones share a header and footer?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Through a shared package in a monorepo or a private npm package, released in step with feature flags, because each zone renders its own copy.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Zone** | An independent Next.js app serving some paths of a shared domain |
| **Default zone** | The app serving every path not routed elsewhere |
| **\`assetPrefix\`** | Prefix on a zone's asset URLs to avoid collisions |
| **Hard navigation** | Full page load; what crossing zones costs |
| **Micro-frontend** | One product delivered as several independent frontends |
| **\`allowedOrigins\`** | Server Actions setting for origins that differ from the host |

---
**Conclusion:** Multi-Zones let several independently built and deployed Next.js apps share one domain: the default zone (or any proxy) rewrites each zone's paths and asset prefix to it, and each zone's \`assetPrefix\` keeps its files apart. The lab showed the behaviour that should drive the decision: navigation stays soft inside a zone and becomes a full page load across zones, \`next/link\` across zones only adds a wasted request, and Server Actions depend on the origin and forwarded host matching. Choose zones for genuinely separate sections and teams, not for problems that route groups, ownership rules or build caching solve inside one app. For running each zone in production, see [deploying Next.js](/interview-question/how-do-you-deploy-a-next-js-app-vercel-vs-self-hosted).`,
    examples: [
      {
        label: "Home zone next.config.ts: rewrite the blog paths to the blog zone",
        tech: "ts",
        runnable: false,
        code: `// home zone: next.config.ts
import type { NextConfig } from "next";
const BLOG_URL = process.env.BLOG_URL ?? "http://localhost:4187";
const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/blog", destination: \`\${BLOG_URL}/blog\` },
      { source: "/blog/:path+", destination: \`\${BLOG_URL}/blog/:path+\` },
      { source: "/blog-static/:path+", destination: \`\${BLOG_URL}/blog-static/:path+\` },
    ];
  },
};
export default nextConfig;`,
      },
      {
        label: "Blog zone next.config.ts: assetPrefix and allowed origins",
        tech: "ts",
        runnable: false,
        code: `// blog zone: next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Assets are served under /blog-static/_next/... so they never collide with the home zone
  assetPrefix: "/blog-static",
  experimental: {
    serverActions: {
      // the user-facing domain, needed when a proxy in front does not preserve the original host
      allowedOrigins: ["www.example.com"],
    },
  },
};

export default nextConfig;`,
      },
      {
        label: "Linking across zones: plain a tags, not next/link",
        tech: "tsx",
        runnable: false,
        code: `// home zone: app/page.tsx
import Link from "next/link";
export default function Home() {
  return (
    <main>
      <h1>Home zone</h1>
      <Link href="/products" id="same-zone">Products (same zone)</Link>
      <a href="/blog" id="other-zone">Blog (other zone, plain a tag)</a>
      {/* Avoid: <Link href="/blog"> wastes an RSC request, then does a full load anyway */}
    </main>
  );
}`,
      },
    ],
  },
];

export default augments;
