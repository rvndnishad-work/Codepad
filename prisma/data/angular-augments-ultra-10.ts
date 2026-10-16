/**
 * Angular ULTRA — batch 10: routing and lazy loading, route parameters, route
 * guards (class-based vs functional, canMatch vs canActivate with
 * loadComponent), resolvers, preloading strategies (built-in and custom),
 * RouteReuseStrategy, and HTTP interceptor fundamentals.
 *
 * Full CLAUDE.md treatment per question, matching the React and Next.js ultra
 * banks: a plain-language story first, `📌 Interview term:` callouts, a
 * Verified section quoting output that was actually produced, a theme-aware
 * `.iq-diagram` SVG, comparison tables, topic-specific pitfalls, the §7
 * "How to Answer in an Interview" card, a glossary and a conclusion.
 *
 * Picked up by `npm run augment:ng`. Sorts after angular-augments-{1,2,3} and
 * angular-augments-gold-*, so these override the older answers.
 *
 * Every "Verified" block was produced on Angular 22.2.3 with
 * scripts/verify-angular-example.mjs: AOT-compiled with ngc and
 * strictTemplates, booted in jsdom with the file's exported appConfig
 * (provideRouter / provideHttpClient), and driven with
 * Router.navigateByUrl, clicks and mouse events. All examples here need
 * app-level providers, so none is runnable in the site playground.
 * Bundle-size numbers come from `ng build` with Angular CLI 22.2.3; router
 * defaults and deprecations were read from the 22.2.3 typings and source.
 *
 * Conventions: SVG attributes double-quoted, `<code>` tags for inline code in
 * prose, no leading H1, `description` is plain markdown (no HTML).
 */
import type { AngularAugment } from "./angular-augments.types";

const augments: AngularAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How does routing and lazy loading work in Angular?",
    seoDescription:
      "How the Angular router maps URLs to components, and how loadComponent and loadChildren split code into lazy chunks loaded on first navigation.",
    description: `**Question presented to candidate:**
"Our Angular app has grown to forty screens and the first load is slow. Explain how the router decides what to show for a URL, and how lazy loading would help us here."

**What a strong answer should cover:**
- The router maps **URL paths to components** using a \`Routes\` array registered with \`provideRouter(routes)\`; \`<router-outlet>\` is where the matched component renders and \`routerLink\` navigates without a page reload.
- Matching is **first match wins, in array order**, with \`**\` as a wildcard and \`redirectTo\` for redirects.
- **Lazy loading** with \`loadComponent\` (one standalone component) or \`loadChildren\` (a whole set of child routes) wraps a dynamic \`import()\`, which the build turns into a **separate chunk** that downloads only when needed.
- The loader runs **on the first navigation** to that route and is cached afterwards; the router emits \`RouteConfigLoadStart\` / \`RouteConfigLoadEnd\` around it.
- Concrete effect on the **initial bundle**, and the follow-up options: preloading, guards that run before the download (\`canMatch\`), and \`@defer\` for parts of a page.

**Clarifying questions expected:**
- "Are the screens standalone components already, or still grouped in NgModules?"
- "Is the slow part the JavaScript download, or data fetching after the screen appears?"

**Code / implementation expected:** Yes — a routes array with one eager route, one \`loadComponent\` and one \`loadChildren\` route.`,
    answer: `**Target Audience:** Anyone preparing for an Angular interview — assumes you know what a component is, no router experience needed.
**Difficulty:** Easy to Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts with the vocabulary an interviewer expects. The navigation logs in section 5 were produced by compiling the example with <code>ngc</code> on Angular 22.2.3 and driving it with <code>Router.navigateByUrl</code>; the bundle sizes in section 6 come from running <code>ng build</code> with Angular CLI 22.2.3.

## 1. Why This Even Matters — A Story First

Picture a big department store. When you walk in, you do not want staff to wheel every product in the building to the front door. You want the entrance hall, a directory board, and lifts. When you press "Floor 4: Garden", the lift takes you there and the garden section is already set up waiting.

A single-page app has the same problem. Without a router, every screen lives on one page and you show or hide them by hand. Without lazy loading, every screen's code is shipped in the first download, so the user waits for "Garden", "Admin" and "Reports" before they can even see the entrance.

The **router** is the directory board and the lifts: it reads the address bar and puts the right screen in place. **Lazy loading** is the decision to keep most floors in the warehouse and bring each one out the first time somebody asks for it.

## 2. The Core Idea

📌 **Interview term: Route** — one entry in a <code>Routes</code> array: a <code>path</code> plus what to show for it (<code>component</code>, <code>loadComponent</code>, <code>loadChildren</code>, <code>children</code> or <code>redirectTo</code>). The array is registered once with <code>provideRouter(routes)</code> in the app config.

📌 **Interview term: Router outlet** — the <code>&lt;router-outlet /&gt;</code> placeholder in a template. The router creates the matched component and inserts it right after the outlet. Nested routes render into nested outlets.

📌 **Interview term: routerLink** — a [directive](/interview-question/what-is-a-directive-and-what-are-the-types) for links. Clicking one calls the router instead of letting the browser reload the page, and the router updates the address bar with the History API.

📌 **Interview term: Lazy loading** — writing the route target as a function that returns a dynamic <code>import()</code>. The bundler sees the <code>import()</code> and moves that code into its own file (a **lazy chunk**); the browser downloads it only when the router calls the function.

| Route shape | What it loads | Typical use |
| :--- | :--- | :--- |
| <code>component: Home</code> | Nothing, the class is in the main bundle | The landing page and tiny screens |
| <code>loadComponent: () =&gt; import("./admin/admin")</code> | One [standalone component](/interview-question/what-are-standalone-components) | A single heavy screen |
| <code>loadChildren: () =&gt; import("./shop/shop.routes").then(m =&gt; m.SHOP_ROUTES)</code> | A whole array of child routes | A feature area with many screens |
| <code>redirectTo: ""</code> | Nothing, rewrites the URL | Old URLs, defaults, the <code>**</code> fallback |

If the lazy file uses <code>export default</code>, the loader can return the <code>import()</code> directly without <code>.then(m =&gt; m.X)</code>: the router unwraps default exports. Both shapes are typed in the 22.2.3 <code>Route</code> interface (<code>loadComponent</code> accepts a <code>DefaultExport&lt;Type&gt;</code>).

## 3. What Happens on One Navigation

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="A URL is matched against the routes array, a lazy route calls its loader once, then the component renders in the router outlet">
  <defs>
    <marker id="rl-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="40" width="150" height="60" rx="10"/>
  <text class="d-text" x="95" y="66" text-anchor="middle">URL changes</text>
  <text class="d-sub" x="95" y="86" text-anchor="middle">/admin</text>
  <path class="d-edge" d="M 174 70 L 236 70" marker-end="url(#rl-arrow)"/>
  <rect class="d-box" x="240" y="40" width="200" height="60" rx="10"/>
  <text class="d-text" x="340" y="66" text-anchor="middle">Match routes</text>
  <text class="d-sub" x="340" y="86" text-anchor="middle">first match wins</text>
  <path class="d-edge" d="M 444 70 L 506 70" marker-end="url(#rl-arrow)"/>
  <rect class="d-box-accent" x="510" y="40" width="190" height="60" rx="10"/>
  <text class="d-text d-accent" x="605" y="66" text-anchor="middle">Lazy route?</text>
  <text class="d-sub" x="605" y="86" text-anchor="middle">call loader once</text>
  <path class="d-edge-accent" d="M 605 104 L 605 176" marker-end="url(#rl-arrow)"/>
  <rect class="d-box-muted" x="510" y="180" width="190" height="70" rx="10"/>
  <text class="d-text" x="605" y="208" text-anchor="middle">Download chunk</text>
  <text class="d-sub" x="605" y="230" text-anchor="middle">cached for next time</text>
  <path class="d-edge" d="M 506 215 L 444 215" marker-end="url(#rl-arrow)"/>
  <rect class="d-box" x="240" y="180" width="200" height="70" rx="10"/>
  <text class="d-text" x="340" y="208" text-anchor="middle">Render in outlet</text>
  <text class="d-sub" x="340" y="230" text-anchor="middle">NavigationEnd fires</text>
</svg>

Guards and resolvers also sit in this pipeline, between matching and rendering; they are covered in [route guards](/interview-question/what-are-route-guards-in-angular) and [route resolvers](/interview-question/what-is-a-route-resolver-and-when-is-it-useful). For an eager route the "lazy route?" step is simply skipped.

## 4. Matching Rules Worth Saying Out Loud

- **Order matters.** The router walks the array top to bottom and takes the first route whose <code>path</code> matches. Put specific paths before general ones and <code>**</code> last.
- **Paths are segments, not prefixes.** <code>path: "admin"</code> matches <code>/admin</code> but not <code>/admin/users</code> unless the route has <code>children</code> or <code>loadChildren</code> that match the rest.
- **<code>pathMatch: "full"</code>** is needed on an empty-path redirect (<code>{ path: "", redirectTo: "home", pathMatch: "full" }</code>), otherwise the empty path matches the start of every URL.
- **Parameters** such as <code>users/:id</code> capture a segment; reading them is its own topic, see [reading route parameters](/interview-question/how-do-you-read-route-parameters).

## 5. Verified: when does a loader actually run?

The example at the bottom has an eager home route, a <code>loadComponent</code> route, a <code>loadChildren</code> route and a wildcard redirect. The loaders log when they are called, and the root component logs the router events. In a real app the loaders would be <code>import()</code> calls; here they return the class directly so the file is self-contained, which does not change when the router calls them. Driven with <code>navigateByUrl</code>:

\`\`\`
  NavigationEnd        /
[app] RENDERED: Home | Admin | OrdersHome page
PAGE: Home page
navigateByUrl("/admin")
  RouteConfigLoadStart admin
  loadComponent(admin) called
  RouteConfigLoadEnd   admin
  NavigationEnd        /admin
  resolved true, PAGE: Admin page (lazy component)
navigateByUrl("/")
  NavigationEnd        /
  resolved true, PAGE: Home page
navigateByUrl("/admin")
  NavigationEnd        /admin
  resolved true, PAGE: Admin page (lazy component)
navigateByUrl("/shop/orders")
  RouteConfigLoadStart shop
  loadChildren(shop) called
  RouteConfigLoadEnd   shop
  NavigationEnd        /shop/orders
  resolved true, PAGE: Order list (lazy child routes)
navigateByUrl("/nope")
  NavigationEnd        /
  resolved true, PAGE: Home page
\`\`\`

What this proves:

- **Nothing lazy runs at start-up.** The first navigation to <code>/</code> loads nothing.
- **The loader runs during the navigation that needs it**, wrapped in <code>RouteConfigLoadStart</code> and <code>RouteConfigLoadEnd</code>, before <code>NavigationEnd</code>.
- **It runs once.** Going back to <code>/admin</code> the second time logs no loader call: the router caches the loaded component on the route.
- **<code>loadChildren</code> behaves the same way** for a whole set of child routes: the first visit to <code>/shop/orders</code> loads the <code>shop</code> children, then matches <code>orders</code> inside them.
- **The wildcard caught <code>/nope</code>** and redirected to <code>/</code>; the promise from <code>navigateByUrl</code> still resolved <code>true</code>.

## 6. Verified: what lazy loading does to the initial bundle

A fresh <code>ng new</code> app (CLI 22.2.3) with two feature areas: an admin screen that uses [reactive forms](/interview-question/what-is-the-difference-between-reactive-and-template-driven-forms) and three common [pipes](/interview-question/what-are-pipes-in-angular), and a small reports area. Built once with both features imported eagerly, and once with <code>loadComponent</code> / <code>loadChildren</code>:

| Build | Initial total (raw) | Initial (estimated transfer) | Lazy chunks |
| :--- | :--- | :--- | :--- |
| Eager routes | 292.94 kB | 78.90 kB | none |
| Lazy routes | 258.58 kB | 73.27 kB | admin 36.09 kB, reports-routes 417 bytes |

The lazy build printed a separate "Lazy chunk files" table naming <code>admin</code> and <code>reports-routes</code>, and about 34 kB of raw code (5.6 kB transferred) left the initial download. The 36.09 kB admin chunk is where the reactive-forms code and the screen itself now live, since nothing else in the app imports them. Your own numbers depend on what each feature imports: lazy loading pays off in proportion to the code that **only** that feature needs. The build itself is explained in [esbuild and Vite in the Angular CLI](/interview-question/how-has-the-angular-build-changed-with-esbuild-vite-ng-build-ng-serve).

## 7. Choosing How Much to Lazy Load

| Strategy | First load | Opening a lazy screen | Good for |
| :--- | :--- | :--- | :--- |
| Everything eager | Largest | Instant | Very small apps |
| Lazy feature areas (<code>loadChildren</code>) | Small | One chunk download, then cached | Most real apps |
| Lazy per screen (<code>loadComponent</code>) | Smallest | One small download per screen | Standalone apps with heavy individual screens |
| Lazy + preloading | Small | Usually already downloaded | Apps where users visit most areas anyway |

Preloading downloads lazy chunks in the background after the first screen is shown, see [preloading strategies](/interview-question/what-are-preloading-strategies). For a heavy widget inside one page rather than a whole screen, [@defer blocks](/interview-question/what-are-deferrable-views-defer-and-how-do-they-work-in-angular-17) are the template-level equivalent.

## 8. Common Pitfalls

- **Importing the lazy component somewhere else eagerly.** If any eagerly loaded file has a normal <code>import { AdminComponent } from "./admin/admin"</code>, the bundler keeps it in the main bundle and the lazy chunk is pointless. Check the build output for the "Lazy chunk files" table.
- **Putting <code>**</code> anywhere but last.** Routes after the wildcard can never match.
- **Forgetting <code>pathMatch: "full"</code> on an empty-path redirect**, which then redirects every URL.
- **Expecting <code>canActivate</code> to stop a <code>loadChildren</code> download.** Child routes have to be loaded to be matched, so the chunk downloads first; use <code>canMatch</code> when the download itself should be blocked (verified in [functional guards and loadComponent](/interview-question/how-do-functional-route-guards-and-lazy-loadcomponent-work-in-modern-angular)).
- **Using plain <code>href</code> for in-app links.** It reloads the whole app and throws away state; use <code>routerLink</code>.
- **Lazy loading the landing page.** The first screen is needed immediately, so making it lazy only adds a second round trip.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What the router does:</strong> <span style="color:#f0e2c8;">"It maps URL paths to components: I register a routes array with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">provideRouter</code>, the first matching route wins, and the component renders in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">router-outlet</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Navigation:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">routerLink</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Router.navigateByUrl</code> change the URL through the History API without reloading, so app state survives."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Lazy loading:</strong> <span style="color:#f0e2c8;">"Instead of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">component</code> I write <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">loadComponent</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">loadChildren</code> with a dynamic import, and the build puts that code in a separate chunk."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. When it loads:</strong> <span style="color:#f0e2c8;">"The loader runs on the first navigation to that route, between RouteConfigLoadStart and RouteConfigLoadEnd, and is cached after that."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Trade-off and tuning:</strong> <span style="color:#f0e2c8;">"Smaller first load in exchange for a download on first visit, which I hide with preloading, and I use canMatch if some users should never download it."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">loadComponent</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">loadChildren</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">loadComponent</code> lazily loads one standalone component for that route. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">loadChildren</code> lazily loads an array of child routes (or an NgModule in older apps), which is the unit for a whole feature area with its own sub-pages and providers.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you check that lazy loading is really working?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Run <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ng build</code> and look for the Lazy chunk files table, then open the Network tab and confirm the chunk is requested only when you first navigate there. If the chunk is missing, something imports that file eagerly.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does a guard stop the lazy chunk from downloading?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">canMatch</code> does, because it runs while matching and a rejected route is skipped. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">canActivate</code> runs after matching; for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">loadChildren</code> the children must be loaded to be matched, so the download has already happened.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the order of routes matter?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Matching is first match wins. A wildcard or a parameter route placed early swallows URLs meant for more specific routes below it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where do <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">@defer</code> blocks fit compared to lazy routes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Lazy routes split by screen; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@defer</code> splits inside a template, for a heavy chart or editor on a page that is otherwise light. They complement each other.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Route** | One <code>path</code> plus what to show for it |
| **provideRouter** | Registers the routes array and router features in the app config |
| **Router outlet** | Placeholder where the matched component is rendered |
| **routerLink** | Link directive that navigates without reloading the page |
| **Lazy loading** | Loading a route target with a dynamic import, the first time it is needed |
| **Lazy chunk** | The separate JavaScript file the bundler creates for a dynamic import |
| **loadComponent / loadChildren** | Lazy route for one standalone component / for a set of child routes |
| **Wildcard route** | <code>path: "**"</code>, matches anything not matched earlier |

---
**Conclusion:** The router turns a URL into a component by walking the routes array in order and rendering the first match into a <code>&lt;router-outlet&gt;</code>. Lazy loading replaces a direct component reference with a loader function around <code>import()</code>, so the build splits that code into its own chunk. As verified on Angular 22.2.3, the loader runs only on the first navigation that needs it and is cached afterwards, and in a real CLI build moving two feature areas behind <code>loadComponent</code> and <code>loadChildren</code> took about 34 kB off the initial download. Preloading and <code>canMatch</code> then let you tune when, and whether, those chunks are fetched.`,
    examples: [
      {
        label: "Eager, loadComponent and loadChildren routes with loader and router-event logs",
        tech: "angular",
        runnable: false,
        code: `import { ApplicationConfig, Component, inject, signal } from "@angular/core";
import {
  NavigationEnd, RouteConfigLoadEnd, RouteConfigLoadStart, Router, RouterLink,
  RouterOutlet, Routes, provideRouter,
} from "@angular/router";

@Component({ selector: "app-home", template: \`<p>Home page</p>\` })
export class HomeComponent {}

// In a real app each lazy piece lives in its own file and the loader is
//   () => import("./admin/admin.component").then(m => m.AdminComponent)
// The bundler turns that import() into a separate chunk. Here the classes sit
// in one file so the example is self-contained; the loaders log when called.
@Component({ selector: "app-admin", template: \`<p>Admin page (lazy component)</p>\` })
export class AdminComponent {}

@Component({ selector: "app-orders", template: \`<p>Order list (lazy child routes)</p>\` })
export class OrdersComponent {}

export const routes: Routes = [
  { path: "", component: HomeComponent },
  {
    path: "admin",
    loadComponent: () => {
      console.log("  loadComponent(admin) called");
      return Promise.resolve(AdminComponent);
    },
  },
  {
    path: "shop",
    loadChildren: () => {
      console.log("  loadChildren(shop) called");
      return Promise.resolve([{ path: "orders", component: OrdersComponent }]);
    },
  },
  { path: "**", redirectTo: "" },
];

export const appConfig: ApplicationConfig = {
  providers: [provideRouter(routes)],
};

@Component({
  selector: "app-root",
  imports: [RouterOutlet, RouterLink],
  template: \`
    <nav>
      <a routerLink="/">Home</a> | <a routerLink="/admin">Admin</a> |
      <a routerLink="/shop/orders">Orders</a>
    </nav>
    <router-outlet />
  \`,
})
export class AppComponent {
  readonly router = inject(Router);
  constructor() {
    this.router.events.subscribe((e) => {
      if (e instanceof RouteConfigLoadStart) console.log(\`  RouteConfigLoadStart \${e.route.path}\`);
      if (e instanceof RouteConfigLoadEnd) console.log(\`  RouteConfigLoadEnd   \${e.route.path}\`);
      if (e instanceof NavigationEnd) console.log(\`  NavigationEnd        \${e.urlAfterRedirects}\`);
    });
  }
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you read route parameters?",
    seoDescription:
      "Read Angular route params with ActivatedRoute snapshot, paramMap observables or component input binding, and why reused components make snapshots stale.",
    description: `**Question presented to candidate:**
"A user profile page lives at \`/users/:id\`, and it has a 'next user' button that navigates to \`/users/43\` from \`/users/42\`. After clicking it, the page still shows user 42. Explain the ways to read route parameters in Angular, and what went wrong."

**What a strong answer should cover:**
- Three sources: **path parameters** (\`:id\`), **query parameters** (\`?tab=posts\`) and **matrix parameters** (\`;mode=edit\`), plus static \`data\` and resolved data.
- \`ActivatedRoute.snapshot.paramMap\` is a **one-time read**; \`ActivatedRoute.paramMap\` / \`queryParamMap\` are **observables** that emit on every change.
- **The router reuses the component** when only parameters change, so a snapshot read in the constructor goes **stale** — the bug in the question.
- **Component input binding** (\`withComponentInputBinding()\`): route values arrive as \`input()\`s by name and update on every navigation; a missing key is set to \`undefined\`.
- Parameters are always **strings** (or null), so convert and validate them; parent parameters are inherited by child routes by default in Angular 22.

**Clarifying questions expected:**
- "Is input binding enabled in this app, or are components reading ActivatedRoute directly?"
- "Should the page reset its own state when the id changes, or keep it?"

**Code / implementation expected:** Yes — one component reading the same parameter three ways, navigated between ids.`,
    answer: `**Target Audience:** Developers who have set up basic routes and now need data from the URL — assumes you know what a route and a component are.
**Difficulty:** Easy to Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. Every log in sections 5 and 6 was produced by compiling the examples with <code>ngc</code> on Angular 22.2.3 and navigating between URLs with <code>Router.navigateByUrl</code>. Router defaults were read from the 22.2.3 package source.

## 1. Why This Even Matters — A Story First

Think of a hotel. Every room has the same furniture: bed, desk, lamp. The **room number** on the door decides whose suitcase is inside. When a guest checks out of room 42 and the next guest is assigned room 43, the hotel does not build a new room. It keeps the furniture and swaps the luggage.

An Angular route like <code>/users/:id</code> works the same way. The component is the furniture, and <code>:id</code> is the room number. When you go from <code>/users/42</code> to <code>/users/43</code>, Angular keeps the same component instance and only changes the parameter. If your component wrote down the room number once, on the day it was built, it will keep greeting guest 42 forever. That is the single most common route-parameter bug, and it is what interviewers are fishing for.

## 2. The Core Idea: Where Values in a URL Come From

Take the URL <code>/users/3;mode=edit?tab=posts#bio</code> matched by <code>{ path: "users/:id", data: { section: "people" } }</code>:

| Piece | Example | How to read it |
| :--- | :--- | :--- |
| Path parameter | <code>:id</code> is <code>3</code> | <code>paramMap.get("id")</code> |
| Matrix parameter | <code>;mode=edit</code> | Also in <code>paramMap</code>, on that segment |
| Query parameter | <code>?tab=posts</code> | <code>queryParamMap.get("tab")</code>, shared by the whole URL |
| Fragment | <code>#bio</code> | <code>route.fragment</code> |
| Static data | <code>section: "people"</code> | <code>route.data</code>, from the route config |
| Resolved data | anything a resolver returned | <code>route.data</code>, see [route resolvers](/interview-question/what-is-a-route-resolver-and-when-is-it-useful) |

📌 **Interview term: ActivatedRoute** — a [service](/interview-question/what-is-a-service-and-why-use-it) injected into a routed component that describes the route that rendered it: its parameters, query parameters, data, parent and children. Each routed component gets its own instance.

📌 **Interview term: Snapshot** — <code>route.snapshot</code> is the state of that route at one moment. Reading <code>route.snapshot.paramMap.get("id")</code> is a plain function call; it never updates by itself.

📌 **Interview term: paramMap observable** — <code>route.paramMap</code> (and <code>queryParamMap</code>, <code>data</code>) are RxJS [observables](/interview-question/what-is-the-difference-between-observables-and-promises) that emit the current value immediately and again on every navigation that changes it. Turn them into a [signal](/interview-question/what-are-angular-signals) with <code>toSignal</code> (see [toSignal and toObservable](/interview-question/how-do-tosignal-and-toobservable-bridge-signals-and-rxjs)).

📌 **Interview term: Component input binding** — enabled with <code>provideRouter(routes, withComponentInputBinding())</code>. The router sets component inputs whose names match path parameters, matrix parameters, query parameters, static data or resolved data. It works with both <code>input()</code> and <code>@Input()</code> (see [signal inputs](/interview-question/signal-inputs-input-vs-input-what-changes-in-angular-17-1)).

📌 **Interview term: Component reuse** — when a navigation keeps the same route config and only parameters change, the default [<code>RouteReuseStrategy</code>](/interview-question/how-do-you-implement-custom-routing-strategies-by-extending-routereusestrategy) keeps the existing component instance instead of destroying and recreating it. Constructors and <code>ngOnInit</code> do not run again (see [lifecycle hooks](/interview-question/what-are-angular-lifecycle-hooks)).

## 3. One Component, Three Readers

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="Navigating from user 1 to user 2 reuses the component, so the snapshot keeps 1 while the observable and the input update to 2">
  <defs>
    <marker id="rp-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="110" width="170" height="70" rx="10"/>
  <text class="d-text" x="105" y="140" text-anchor="middle">/users/1 to</text>
  <text class="d-text" x="105" y="162" text-anchor="middle">/users/2</text>
  <path class="d-edge" d="M 194 145 L 256 145" marker-end="url(#rp-arrow)"/>
  <rect class="d-box-muted" x="260" y="100" width="170" height="90" rx="10"/>
  <text class="d-text" x="345" y="134" text-anchor="middle">same instance</text>
  <text class="d-sub" x="345" y="158" text-anchor="middle">no new constructor</text>
  <path class="d-edge-dashed" d="M 434 120 L 506 60" marker-end="url(#rp-arrow)"/>
  <path class="d-edge-accent" d="M 434 145 L 506 145" marker-end="url(#rp-arrow)"/>
  <path class="d-edge-accent" d="M 434 170 L 506 230" marker-end="url(#rp-arrow)"/>
  <rect class="d-box" x="510" y="30" width="190" height="56" rx="10"/>
  <text class="d-text" x="605" y="54" text-anchor="middle">snapshot</text>
  <text class="d-sub" x="605" y="74" text-anchor="middle">still 1</text>
  <rect class="d-box-accent" x="510" y="117" width="190" height="56" rx="10"/>
  <text class="d-text d-accent" x="605" y="141" text-anchor="middle">paramMap stream</text>
  <text class="d-sub" x="605" y="161" text-anchor="middle">emits 2</text>
  <rect class="d-box-accent" x="510" y="204" width="190" height="56" rx="10"/>
  <text class="d-text d-accent" x="605" y="228" text-anchor="middle">input id</text>
  <text class="d-sub" x="605" y="248" text-anchor="middle">set to 2</text>
</svg>

The component is not rebuilt, so anything computed once from the snapshot keeps the old value. The observable and the bound input are both pushed the new value by the router on every navigation.

## 4. The Three Ways in Code

\`\`\`ts
private route = inject(ActivatedRoute);

// 1. Snapshot: fine only if this component is never reused with a new id
snapshotId = this.route.snapshot.paramMap.get("id");

// 2. Observable, as a signal
liveId = toSignal(this.route.paramMap.pipe(map((p) => p.get("id"))));

// 3. Input binding: needs provideRouter(routes, withComponentInputBinding())
id = input<string>();
\`\`\`

The full component, with a query parameter and static data bound the same way, is the example at the bottom.

## 5. Verified: snapshot versus stream versus input

The component logs every time it is constructed and prints each reader's value. Navigating through four URLs (the text of the three paragraphs, joined with <code>/</code>):

\`\`\`
[app] RENDERED: 
navigateByUrl("/users/1")
  UserComponent constructed (#1), snapshot id=1
  snapshot id: 1 / paramMap id: 1 / input id: 1 | tab: none | section: people
navigateByUrl("/users/2?tab=posts")
  snapshot id: 1 / paramMap id: 2 / input id: 2 | tab: posts | section: people
navigateByUrl("/users/2")
  snapshot id: 1 / paramMap id: 2 / input id: 2 | tab: none | section: people
navigateByUrl("/users/3;mode=edit")
  snapshot id: 1 / paramMap id: 3 / input id: 3 | tab: none | section: people
matrix: {"id":"3","mode":"edit"}
\`\`\`

Read it line by line:

- **The constructor ran once.** Four navigations, one <code>UserComponent constructed (#1)</code>: the router reused the instance every time.
- **The snapshot is frozen at 1.** This is the bug from the question, reproduced.
- **<code>paramMap</code> and the input both followed the URL** to 2 and then 3.
- **Removing <code>?tab=posts</code> reset the <code>tab</code> input to <code>undefined</code>** (printed as "none"). Input binding deliberately clears inputs whose key disappears, so stale values do not linger.
- **Static <code>data</code> bound too:** <code>section</code> came from <code>data: { section: "people" }</code> with no extra code.
- **Matrix parameters land in the same <code>params</code>** as the path parameter: <code>{"id":"3","mode":"edit"}</code>.

## 6. Verified: parent parameters in child routes (an Angular 22 change)

With <code>{ path: "users/:id", component: Shell, children: [{ path: "posts", component: Posts }] }</code>, does <code>Posts</code> see <code>id</code>? Navigating to <code>/users/7/posts</code>:

| Router config | Output |
| :--- | :--- |
| default (Angular 22.2.3) | <code>child input id=7 parent snapshot id=7</code> |
| <code>withRouterConfig({ paramsInheritanceStrategy: "emptyOnly" })</code> | <code>child input id=undefined parent snapshot id=7</code> |

In 22.2.3 the router source sets <code>DEFAULT_PARAMS_INHERITANCE_STRATEGY = 'always'</code>, and the typings say "By default ('always'), a route inherits all parameters from its parent routes". Before v22 the default was <code>emptyOnly</code>, which is why many older answers tell you to read <code>route.parent.paramMap</code>; the change is listed as a breaking change in the v22.0.0-next.9 release notes (source: <a href="https://www.gitclear.com/open_repos/angular/angular/release/v22.0.0-next.9" target="_blank" rel="noopener noreferrer">v22.0.0-next.9 changelog</a>). If an upgraded app relies on the old behaviour, set <code>emptyOnly</code> explicitly.

## 7. Which One Should You Use?

| Approach | Updates on reuse | Needs | Best for |
| :--- | :--- | :--- | :--- |
| <code>snapshot.paramMap</code> | No | Nothing | Components that are always recreated, one-off reads in guards and resolvers |
| <code>paramMap</code> observable | Yes | RxJS, often <code>toSignal</code> | Chaining into a request with <code>switchMap</code> |
| Input binding | Yes | <code>withComponentInputBinding()</code> | Most components in a modern app; easy to test, no router in the component |

A useful habit: treat the URL as **input to the component**, exactly like a parent passing <code>[id]</code>. With input binding it literally is one, so the component can be tested by setting an input instead of faking <code>ActivatedRoute</code>. To load data whenever the id changes, derive it from the input (a [<code>computed</code>](/interview-question/what-is-the-difference-between-computed-signals-and-standard-method-getter-calls), a <code>resource</code>, or <code>toObservable(this.id).pipe(switchMap(...))</code>), and see [switchMap and friends](/interview-question/what-is-the-difference-between-switchmap-mergemap-concatmap-and-exhaustmap) for why <code>switchMap</code> is the right flattening operator there.

## 8. Common Pitfalls

- **Reading the snapshot in a reusable component.** Verified above: it stays at the first value while the URL changes.
- **Forgetting that every parameter is a string.** <code>"10" &gt; "9"</code> is false. Convert with <code>Number()</code> or an input transform such as <code>input(0, { transform: numberAttribute })</code>, and handle <code>NaN</code>.
- **Using <code>params</code> instead of <code>paramMap</code>.** Both work, but <code>paramMap.get</code> returns <code>null</code> for a missing key and <code>getAll</code> handles repeated query keys; plain objects make it easy to miss both.
- **Expecting an input to keep its default when the key is absent.** Input binding sets it to <code>undefined</code>, as verified with <code>tab</code>.
- **An input name that collides with a route key.** A query parameter called <code>id</code> overrides nothing (path parameters win over query parameters), but resolved data with the same key overrides everything: the typings list the precedence as query, then path and matrix, then static data, then resolvers.
- **Assuming the old <code>emptyOnly</code> inheritance after upgrading to v22.** Children now see parent parameters by default.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The sources:</strong> <span style="color:#f0e2c8;">"A URL carries path parameters like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:id</code>, matrix parameters, query parameters and the fragment, and the route adds static data and resolved data."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The readers:</strong> <span style="color:#f0e2c8;">"I can read <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ActivatedRoute.snapshot</code> once, subscribe to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">paramMap</code>, or enable <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">withComponentInputBinding</code> and receive them as inputs."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The trap:</strong> <span style="color:#f0e2c8;">"When only the parameter changes, the router reuses the component, so a snapshot read in the constructor keeps the old id. That is the classic stale-page bug."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. What I use:</strong> <span style="color:#f0e2c8;">"In new code I use input binding: the id is an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">input()</code>, it updates on every navigation, and I derive the data request from it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Details:</strong> <span style="color:#f0e2c8;">"Parameters are strings, a missing key sets the input to undefined, and since Angular 22 child routes inherit parent parameters by default."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you load the user whenever the id changes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Derive it from the input: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toObservable(this.id).pipe(switchMap(id =&gt; api.get(id)))</code> or a resource keyed on the id. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">switchMap</code> cancels the request for the previous id if the user clicks quickly.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the router reuse the component at all?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Recreating it would throw away DOM, child components and state for a change that is often just a different record. The default strategy reuses when the route config is the same; a custom <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RouteReuseStrategy</code> can change that.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you read a query parameter that can repeat, like <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">?tag=a&amp;tag=b</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">queryParamMap.getAll("tag")</code> returns both values; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code> returns only the first.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test a component that reads route parameters?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With input binding, set the input directly in the test. With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ActivatedRoute</code>, either provide a fake with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">paramMap</code> observable or use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RouterTestingHarness</code> to navigate for real.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a guard or resolver read parameters?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, they receive an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ActivatedRouteSnapshot</code> for the route being activated, and a snapshot is correct there because it describes exactly this navigation.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Path parameter** | A <code>:name</code> segment in the route path |
| **Query parameter** | A <code>?key=value</code> pair, shared by the whole URL |
| **Matrix parameter** | A <code>;key=value</code> pair attached to one URL segment |
| **ActivatedRoute** | Injectable description of the route that rendered this component |
| **Snapshot** | The route state at one moment; does not update |
| **paramMap observable** | Stream that emits the parameters on every change |
| **Component input binding** | Router sets inputs named after route values |
| **Component reuse** | Same route config, new parameters: same component instance |
| **paramsInheritanceStrategy** | Whether children see parent parameters; <code>always</code> by default in v22 |

---
**Conclusion:** Route values come from path, matrix and query parameters, static data and resolvers, and Angular gives you three ways to read them: a snapshot, an observable, or component inputs. The deciding fact is component reuse: as verified on Angular 22.2.3, navigating from one id to another kept a single component instance, so the snapshot stayed frozen while <code>paramMap</code> and the bound input followed the URL. Prefer input binding in new code, convert the strings you receive, and remember that since v22 child routes inherit their parent parameters by default.`,
    examples: [
      {
        label: "One component reading :id via snapshot, paramMap and input binding",
        tech: "angular",
        runnable: false,
        code: `import { ApplicationConfig, Component, inject, input, signal } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { ActivatedRoute, Router, RouterOutlet, provideRouter, withComponentInputBinding } from "@angular/router";
import { map } from "rxjs";

let created = 0;

@Component({
  selector: "app-user",
  template: \`
    <p>snapshot id: {{ snapshotId }}</p>
    <p>paramMap id: {{ liveId() }}</p>
    <p>input id: {{ id() }} | tab: {{ tab() ?? "none" }} | section: {{ section() }}</p>
  \`,
})
export class UserComponent {
  private route = inject(ActivatedRoute);

  // 1. Snapshot: read once. Goes stale if the router reuses this instance.
  snapshotId = this.route.snapshot.paramMap.get("id");

  // 2. Observable: emits every time the :id segment changes.
  liveId = toSignal(this.route.paramMap.pipe(map((p) => p.get("id"))));

  // 3. Component input binding (needs withComponentInputBinding()).
  //    Path params, query params, static data and resolved data all bind by name.
  id = input<string>();
  tab = input<string>();
  section = input<string>();

  constructor() {
    created++;
    console.log(\`  UserComponent constructed (#\${created}), snapshot id=\${this.snapshotId}\`);
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      [{ path: "users/:id", component: UserComponent, data: { section: "people" } }],
      withComponentInputBinding(),
    ),
  ],
};

@Component({
  selector: "app-root",
  imports: [RouterOutlet],
  template: \`<router-outlet />\`,
})
export class AppComponent {
  readonly router = inject(Router);
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are route guards in Angular?",
    seoDescription:
      "Angular route guards (canMatch, canActivate, canActivateChild, canDeactivate): what each decides, the order they run in, and how UrlTree redirects work.",
    description: `**Question presented to candidate:**
"We need three rules in our app: only signed-in users can open \`/account\`, only admins should even be able to load the admin area, and users with unsaved edits must be warned before they leave the editor. What does Angular give you for this, and in what order do those checks run?"

**What a strong answer should cover:**
- A **route guard** is a function the router calls during navigation; it returns \`true\`, \`false\`, a **\`UrlTree\`** / **\`RedirectCommand\`** (redirect), or a Promise / Observable of one of those.
- The guard types and when to use each: **\`canMatch\`**, **\`canActivate\`**, **\`canActivateChild\`**, **\`canDeactivate\`**, plus the deprecated \`canLoad\`; resolvers run after all guards.
- The **order**: \`canMatch\` during matching, then \`canDeactivate\` on the route being left, then \`canActivateChild\` / \`canActivate\` from parent to child, then resolvers.
- Returning \`false\` **cancels** the navigation (\`NavigationCancel\`, \`navigateByUrl\` resolves \`false\`); returning a \`UrlTree\` cancels it and **starts a new navigation** to that URL.
- Guards are **UX, not security**: the server must still check every request.

**Clarifying questions expected:**
- "Should users who are not admins see a 404, a 'not allowed' page, or the login page?"
- "Where does the session state live: a service with a signal, a token in storage, a server call?"

**Code / implementation expected:** Yes — a route config using each guard type, with a log of the order they run in.`,
    answer: `**Target Audience:** Developers who have routes working and now need to control who can go where — assumes basic routing knowledge.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. The call order in section 5 is real output from compiling the example with <code>ngc</code> on Angular 22.2.3 and navigating with <code>Router.navigateByUrl</code>; it is not reconstructed from documentation.

## 1. Why This Even Matters — A Story First

An airport has several checkpoints, and each one asks a different question at a different moment:

- At the **entrance to a terminal**, signs send you to the right one. If your ticket is not for Terminal 2, you are not even let into the building; you are sent to the next terminal on the list.
- At **security**, they check you are allowed through, and send you back to the desk if not.
- At the **gate for a connecting area**, every flight in that area is checked again.
- When you try to **leave the lounge** with an unpaid bill, someone stops you on the way out.
- Only after all of that does the crew **load your luggage** onto the plane.

Angular route guards are those checkpoints. Each guard type runs at a specific point in a navigation, and the interview question is really "do you know which checkpoint to use, and in what order they happen?".

## 2. The Core Idea

📌 **Interview term: Route guard** — a function attached to a route that the router calls during navigation to decide whether it may continue. Since Angular 14.2 the recommended shape is a plain function (source: <a href="https://blog.angular.io/advancements-in-the-angular-router-5d69ec4c032" target="_blank" rel="noopener noreferrer">Advancements in the Angular Router</a>); class-based guards are compared in [functional vs class-based guards](/interview-question/what-are-functional-route-guards-and-how-do-they-differ-from-class-based-guards).

📌 **Interview term: GuardResult** — what a guard may return: <code>true</code> (continue), <code>false</code> (cancel), a <code>UrlTree</code> or <code>RedirectCommand</code> (cancel and go somewhere else), or a Promise or [Observable](/interview-question/what-is-the-difference-between-observables-and-promises) that produces one of those. The 22.2.3 typings call this <code>MaybeAsync&lt;GuardResult&gt;</code>.

📌 **Interview term: UrlTree** — Angular's parsed representation of a URL, created with <code>router.parseUrl("/login")</code> or <code>router.createUrlTree(["/login"])</code>. Returning one from a guard is the correct way to redirect; calling <code>router.navigate</code> inside a guard and returning <code>false</code> is the old, race-prone way.

| Guard | Question it answers | Runs | Typical use |
| :--- | :--- | :--- | :--- |
| <code>canMatch</code> | May this route config be used for this URL at all? | While matching URLs to routes | Feature flags, role-based alternatives, blocking a lazy download |
| <code>canActivate</code> | May this route be entered? | After matching | Sign-in check |
| <code>canActivateChild</code> | May any child of this route be entered? | After matching, for each child | One rule for a whole section |
| <code>canDeactivate</code> | May the user leave this component? | Before any activation guard | Unsaved changes warning |
| <code>canLoad</code> | (deprecated) May lazy children be loaded? | Before loading | Replaced by <code>canMatch</code>; typings say "Use <code>canMatch</code> instead" |
| <code>resolve</code> (not a guard) | What data must exist before rendering? | After all guards pass | Pre-fetching, see [route resolvers](/interview-question/what-is-a-route-resolver-and-when-is-it-useful) |

📌 **Interview term: canMatch** — the only guard that runs during matching. Returning <code>false</code> does not cancel the navigation; the router **skips that route entry and keeps looking**, so a second entry with the same path can match instead. That makes it ideal for "admins get this page, everyone else gets that one".

## 3. The Order of the Checkpoints

<svg class="iq-diagram" width="100%" viewBox="0 0 720 330" role="img" aria-label="Navigation pipeline: canMatch during matching, then canDeactivate, then canActivateChild and canActivate parent to child, then resolvers, then the component renders">
  <defs>
    <marker id="rg-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="20" y="30" width="200" height="60" rx="10"/>
  <text class="d-text d-accent" x="120" y="56" text-anchor="middle">1. canMatch</text>
  <text class="d-sub" x="120" y="76" text-anchor="middle">while matching</text>
  <path class="d-edge" d="M 224 60 L 286 60" marker-end="url(#rg-arrow)"/>
  <rect class="d-box" x="290" y="30" width="200" height="60" rx="10"/>
  <text class="d-text" x="390" y="56" text-anchor="middle">2. canDeactivate</text>
  <text class="d-sub" x="390" y="76" text-anchor="middle">route being left</text>
  <path class="d-edge" d="M 494 60 L 556 60" marker-end="url(#rg-arrow)"/>
  <rect class="d-box" x="560" y="30" width="140" height="60" rx="10"/>
  <text class="d-text" x="630" y="56" text-anchor="middle">3. canActivate</text>
  <text class="d-sub" x="630" y="76" text-anchor="middle">parent first</text>
  <path class="d-edge" d="M 630 94 L 630 156" marker-end="url(#rg-arrow)"/>
  <rect class="d-box" x="520" y="160" width="180" height="60" rx="10"/>
  <text class="d-text" x="610" y="186" text-anchor="middle">canActivateChild</text>
  <text class="d-sub" x="610" y="206" text-anchor="middle">then child canActivate</text>
  <path class="d-edge" d="M 516 190 L 444 190" marker-end="url(#rg-arrow)"/>
  <rect class="d-box-muted" x="240" y="160" width="200" height="60" rx="10"/>
  <text class="d-text" x="340" y="186" text-anchor="middle">4. resolvers</text>
  <text class="d-sub" x="340" y="206" text-anchor="middle">parent first</text>
  <path class="d-edge" d="M 236 190 L 174 190" marker-end="url(#rg-arrow)"/>
  <rect class="d-box-accent" x="20" y="160" width="150" height="60" rx="10"/>
  <text class="d-text d-accent" x="95" y="186" text-anchor="middle">5. render</text>
  <text class="d-sub" x="95" y="206" text-anchor="middle">NavigationEnd</text>
  <rect class="d-box-muted" x="240" y="260" width="460" height="50" rx="10"/>
  <text class="d-sub" x="470" y="290" text-anchor="middle">false cancels, a UrlTree cancels and redirects</text>
</svg>

Any guard in steps 2 and 3 that says no stops the pipeline right there: later guards and resolvers never run, and the old screen stays on screen. A <code>canMatch</code> that says no just removes its route from consideration.

## 4. Writing the Guards

The full example is at the bottom; the shapes are:

\`\`\`ts
const loggedIn: CanActivateFn = () =>
  inject(Session).user() ? true : inject(Router).parseUrl("/login?returnUrl=/secret");

const leaveEditor: CanDeactivateFn<EditorComponent> = (editor) =>
  !editor.dirty() || confirm("Discard your changes?");

{ path: "admin", canMatch: [isAdmin], canActivateChild: [adminChildren], children: [...] }
\`\`\`

Each guard receives what it needs as arguments: <code>canActivate</code> gets the <code>ActivatedRouteSnapshot</code> and <code>RouterStateSnapshot</code>, <code>canDeactivate</code> also gets the **component instance** being left, and <code>canMatch</code> gets the <code>Route</code> config and the URL segments. Services come from <code>inject()</code>, as explained in [inject() vs constructor injection](/interview-question/inject-vs-constructor-injection-when-should-you-use-each).

## 5. Verified: the real call order

The example puts every guard type on one tree: an editor with <code>canDeactivate</code>, an <code>admin</code> parent with <code>canMatch</code>, <code>canActivate</code>, <code>canActivateChild</code> and a resolver, and an <code>admin/users</code> child with its own <code>canActivate</code> and resolver. Two more routes redirect and refuse. Each guard logs one line; the root component logs <code>NavigationCancel</code> and <code>NavigationEnd</code>:

\`\`\`
  NavigationEnd     /
[app] RENDERED: 
navigateByUrl("/editor")
  NavigationEnd     /editor
  -> resolved true, router.url = /editor
navigateByUrl("/admin/users")
  canMatch          admin
  canDeactivate     editor (dirty=true)
  canActivate       admin
  canActivateChild  admin -> users
  canActivate       admin/users
  resolve           admin
  resolve           admin/users
  NavigationEnd     /admin/users
  -> resolved true, router.url = /admin/users
navigateByUrl("/secret")
  canActivate       secret -> not logged in, redirect
  NavigationCancel  /secret (NavigationCancelingError: Redirecting to "/login?returnUrl=%2Fsecret")
  NavigationEnd     /login?returnUrl=%2Fsecret
  -> resolved true, router.url = /login?returnUrl=%2Fsecret
navigateByUrl("/blocked")
  canActivate       blocked -> false
  NavigationCancel  /blocked (guard returned false)
  -> resolved false, router.url = /login?returnUrl=%2Fsecret
\`\`\`

Five things this proves:

1. **<code>canMatch</code> ran first**, even before the editor was asked whether it could be left, because matching happens before any other guard.
2. **<code>canDeactivate</code> came next**, and received the live <code>EditorComponent</code> (it read <code>dirty=true</code> from its signal).
3. **Activation runs parent to child**: <code>canActivate admin</code>, then <code>canActivateChild</code> for the child, then the child <code>canActivate</code>.
4. **Resolvers ran only after every guard passed**, parent then child.
5. **The two refusals behave differently.** The <code>UrlTree</code> produced a <code>NavigationCancel</code> with the reason <code>Redirecting to "/login?returnUrl=%2Fsecret"</code> followed by a new navigation, and <code>navigateByUrl</code> resolved <code>true</code> (the redirected navigation succeeded). Plain <code>false</code> produced a <code>NavigationCancel</code>, resolved <code>false</code>, and left <code>router.url</code> where it was.

## 6. Guards Are Not Security

Everything a guard protects is JavaScript already in, or downloadable to, the user's browser. Anyone can open dev tools, flip a [signal](/interview-question/what-are-angular-signals) and walk past a <code>canActivate</code>. Guards exist so that honest users get a sensible experience: the login page instead of a broken screen, a warning before they lose work. The real protection is the API checking the token on every request, which on the client side usually starts with an [HTTP interceptor](/interview-question/what-is-an-http-interceptor) attaching it.

<code>canMatch</code> is the one guard with a small security-adjacent benefit: a rejected lazy route is never downloaded, so the admin code does not reach users who fail the check during normal navigation. [Preloading](/interview-question/what-are-preloading-strategies) is the exception, covered in [functional guards and loadComponent](/interview-question/how-do-functional-route-guards-and-lazy-loadcomponent-work-in-modern-angular).

## 7. Common Pitfalls

- **Redirecting with <code>router.navigate()</code> inside the guard and returning <code>false</code>.** Two navigations now race. Return a <code>UrlTree</code> or <code>new RedirectCommand(tree)</code> instead and let the router redirect.
- **Using <code>canActivate</code> where <code>canMatch</code> was needed.** <code>canActivate</code> runs after matching, so for <code>loadChildren</code> the lazy chunk has already been downloaded.
- **A guard observable that never completes or emits.** The router waits for the first value; a guard returning <code>NEVER</code> left <code>navigateByUrl</code> still pending after 2 seconds in a test run, with no error and no event.
- **Calling <code>inject()</code> after an <code>await</code> in an async guard.** The [injection context](/interview-question/what-is-runininjectioncontext-and-when-do-you-need-to-use-it) is gone by then; the call throws <code>NG0203</code>. Inject first, then await (verified in the functional-guard question linked above).
- **Forgetting that <code>canActivate</code> does not re-run on query-parameter changes.** The default <code>runGuardsAndResolvers</code> is <code>paramsChange</code>: path and matrix parameter changes re-run guards, query changes do not.
- **Treating the guard as the authorisation layer.** It is a UX layer; the server must still refuse.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">"A route guard is a function the router calls during navigation. It returns true, false, or a UrlTree to redirect, synchronously or as a Promise or Observable."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The types:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">canMatch</code> decides if a route entry may match at all, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">canActivate</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">canActivateChild</code> whether it may be entered, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">canDeactivate</code> whether the user may leave."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The order:</strong> <span style="color:#f0e2c8;">"canMatch runs during matching, then canDeactivate on the current screen, then canActivate parent to child, then resolvers. I have checked that order in a log."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Refusing:</strong> <span style="color:#f0e2c8;">"False cancels and keeps the user where they are. A UrlTree cancels and starts a navigation to the new URL, which is the clean way to send someone to login."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Caveat:</strong> <span style="color:#f0e2c8;">"Guards are UX, not security: the code is in the browser, so the API must check every request itself."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you choose <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">canMatch</code> over <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">canActivate</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the route should not exist for this user: a rejected canMatch lets the router try the next route with the same path, and a lazy route behind it is not downloaded on navigation. canActivate is for a route that exists but needs a check before entry.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you build an unsaved-changes guard?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CanDeactivateFn&lt;EditorComponent&gt;</code> receives the component instance, so it can read <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">editor.dirty()</code> and return true, or ask the user and return their answer, possibly as a Promise from a dialog.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if two <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">canActivate</code> guards are async?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">They are started together, and the result is taken in array order: the first guard in the list that refuses wins, and the router waits for earlier guards before trusting a later one.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you pass the original URL to the login page?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Build the UrlTree with a query parameter, for example <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">router.createUrlTree(["/login"], { queryParams: { returnUrl: state.url } })</code>, and navigate there after a successful login.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do guards run again if only the query string changes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not by default. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">runGuardsAndResolvers</code> defaults to paramsChange; set it to paramsOrQueryParamsChange or always on the route if they must.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Route guard** | Function the router calls to allow, cancel or redirect a navigation |
| **canMatch** | Decides whether a route entry may match; a no means try the next entry |
| **canActivate** | Decides whether a matched route may be entered |
| **canActivateChild** | Same, for every child of a route |
| **canDeactivate** | Decides whether the current component may be left |
| **GuardResult** | true, false, a UrlTree or a RedirectCommand, possibly async |
| **UrlTree** | Parsed URL object; returning one from a guard redirects |
| **NavigationCancel** | Router event emitted when a guard refuses or redirects |

---
**Conclusion:** Route guards are functions the router calls at fixed points of every navigation. As verified on Angular 22.2.3, <code>canMatch</code> runs first while routes are matched, then <code>canDeactivate</code> on the screen being left, then <code>canActivate</code> and <code>canActivateChild</code> from parent to child, and only then resolvers. Return <code>true</code> to continue, <code>false</code> to stay put, or a <code>UrlTree</code> to redirect, pick <code>canMatch</code> when a route should not even be considered, and remember that all of this is user experience: the server still has to say no on its own.`,
    examples: [
      {
        label: "Every guard type on one route tree, logging the order they run in",
        tech: "angular",
        runnable: false,
        code: `import { ApplicationConfig, Component, inject, signal } from "@angular/core";
import {
  CanActivateChildFn, CanActivateFn, CanDeactivateFn, CanMatchFn, NavigationCancel, NavigationEnd,
  ResolveFn, Router, RouterOutlet, provideRouter,
} from "@angular/router";

// A guard is just a function the router calls before it changes the screen.
const step = (msg: string) => console.log(\`  \${msg}\`);

@Component({ selector: "app-page", template: \`<p>{{ name }}</p>\` })
export class PageComponent { name = "page"; }

@Component({ selector: "app-editor", template: \`<p>Editor (unsaved: {{ dirty() }})</p>\` })
export class EditorComponent { dirty = signal(true); }

@Component({ selector: "app-shell", imports: [RouterOutlet], template: \`<router-outlet />\` })
export class ShellComponent {}

const adminMatch: CanMatchFn = () => { step("canMatch          admin"); return true; };
const adminActivate: CanActivateFn = () => { step("canActivate       admin"); return true; };
const adminChildren: CanActivateChildFn = (child) => { step(\`canActivateChild  admin -> \${child.routeConfig?.path}\`); return true; };
const usersActivate: CanActivateFn = () => { step("canActivate       admin/users"); return true; };
const adminResolve: ResolveFn<string> = () => { step("resolve           admin"); return "admin data"; };
const usersResolve: ResolveFn<string> = () => { step("resolve           admin/users"); return "users data"; };
const leaveEditor: CanDeactivateFn<EditorComponent> = (c) => { step(\`canDeactivate     editor (dirty=\${c.dirty()})\`); return true; };

// Returning a UrlTree cancels this navigation and starts a new one.
const loggedIn: CanActivateFn = () => {
  step("canActivate       secret -> not logged in, redirect");
  return inject(Router).parseUrl("/login?returnUrl=/secret");
};
const never: CanActivateFn = () => { step("canActivate       blocked -> false"); return false; };

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter([
      { path: "editor", component: EditorComponent, canDeactivate: [leaveEditor] },
      {
        path: "admin", component: ShellComponent,
        canMatch: [adminMatch], canActivate: [adminActivate], canActivateChild: [adminChildren],
        resolve: { info: adminResolve },
        children: [
          { path: "users", component: PageComponent, canActivate: [usersActivate], resolve: { users: usersResolve } },
        ],
      },
      { path: "secret", component: PageComponent, canActivate: [loggedIn] },
      { path: "blocked", component: PageComponent, canActivate: [never] },
      { path: "login", component: PageComponent },
    ]),
  ],
};

@Component({ selector: "app-root", imports: [RouterOutlet], template: \`<router-outlet />\` })
export class AppComponent {
  readonly router = inject(Router);
  constructor() {
    this.router.events.subscribe((e) => {
      if (e instanceof NavigationCancel) step(\`NavigationCancel  \${e.url} (\${e.reason || "guard returned false"})\`);
      if (e instanceof NavigationEnd) step(\`NavigationEnd     \${e.urlAfterRedirects}\`);
    });
  }
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are functional Route Guards, and how do they differ from class-based guards?",
    seoDescription:
      "Functional route guards use inject() in a plain function; class guards are injectable classes. What is deprecated in Angular 22 and how to migrate.",
    description: `**Question presented to candidate:**
"Our codebase has thirty \`@Injectable\` guard classes implementing \`CanActivate\`. A new teammate writes guards as plain functions. Explain the difference, whether the classes are deprecated in Angular 22, and how you would migrate."

**What a strong answer should cover:**
- A **class-based guard** is an \`@Injectable\` class implementing an interface such as \`CanActivate\`; the route lists the class as a DI token.
- A **functional guard** is a \`CanActivateFn\` (or \`CanMatchFn\`, \`CanDeactivateFn\` ...) that gets dependencies with **\`inject()\`**, because the router calls it inside an **injection context**.
- In the 22.2.3 typings, **passing a class or token in the route array is deprecated** (\`DeprecatedGuard\`), while the \`CanActivate\` interface itself is not marked deprecated; \`mapToCanActivate([MyGuard])\` wraps a class as a function.
- Functions are smaller, **composable** (guard factories like \`hasRole("admin")\`), and need no provider registration.
- \`inject()\` must be called **synchronously**, before any \`await\`; afterwards it throws \`NG0203\`.
- Async guards in one array **start together**, and the result is decided in array order.

**Clarifying questions expected:**
- "Are the class guards shared with other code, or only referenced from routes?"
- "Do the guards have unit tests we need to keep passing during the migration?"

**Code / implementation expected:** Yes — the same rule written as a class, as a mapped class, as a function, and as a guard factory.`,
    answer: `**Target Audience:** Developers maintaining or modernising an existing Angular app — assumes you know what a route guard does (see [route guards](/interview-question/what-are-route-guards-in-angular)).
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. Every log and error message in sections 5 and 6 came from compiling the examples with <code>ngc</code> (strict templates) on Angular 22.2.3 and navigating with <code>Router.navigateByUrl</code>. The deprecation status is read from the <code>@angular/router</code> 22.2.3 typings.

## 1. Why This Even Matters — A Story First

A building used to hire a full-time doorman for every door. Each doorman had a uniform, a contract with the agency, a desk and a name badge, and all he ever did was check one list. Then the building switched to a small card reader on each door. Same rule, same list, but no contract, no desk, and you can install a reader that checks "staff only" on one door and "managers only" on the next by changing one setting.

The doorman is a **class-based guard**: a whole <code>@Injectable</code> class registered with [dependency injection](/interview-question/how-does-dependency-injection-work-in-angular), whose single method answers one question. The card reader is a **functional guard**: a function that answers the same question and grabs whatever it needs with [<code>inject()</code>](/interview-question/inject-vs-constructor-injection-when-should-you-use-each). The interviewer wants to know what really changed, whether the doormen must be fired today, and how you would retire them without breaking the building.

## 2. The Core Idea

📌 **Interview term: Class-based guard** — an <code>@Injectable()</code> class implementing <code>CanActivate</code>, <code>CanMatch</code>, <code>CanDeactivate&lt;T&gt;</code>, <code>CanActivateChild</code> or <code>Resolve&lt;T&gt;</code>. The route lists the class (<code>canActivate: [AdminGuard]</code>) and the router asks DI for an instance.

📌 **Interview term: Functional guard** — a function typed as <code>CanActivateFn</code>, <code>CanMatchFn</code>, <code>CanDeactivateFn&lt;T&gt;</code> or <code>CanActivateChildFn</code>. The route lists the function itself. Functional guards arrived in Angular 14.2 (source: <a href="https://blog.angular.io/advancements-in-the-angular-router-5d69ec4c032" target="_blank" rel="noopener noreferrer">Advancements in the Angular Router</a>).

📌 **Interview term: Injection context** — a moment when <code>inject()</code> is allowed: constructors, field initialisers, factory functions, and functions the framework calls in one, such as guards, resolvers and [interceptors](/interview-question/what-is-an-http-interceptor). More in [runInInjectionContext](/interview-question/what-is-runininjectioncontext-and-when-do-you-need-to-use-it).

📌 **Interview term: Guard factory** — a function that returns a guard, so one implementation can be configured per route: <code>canActivate: [hasRole("billing")]</code>. With classes you would need one class per role, or route <code>data</code> read inside the class.

📌 **Interview term: mapToCanActivate** — a helper exported by <code>@angular/router</code> that turns an array of guard classes into an array of <code>CanActivateFn</code>. Siblings exist for the other kinds (<code>mapToCanMatch</code>, <code>mapToCanActivateChild</code>, <code>mapToCanDeactivate</code>, <code>mapToResolve</code>). It is the migration bridge.

## 3. Is the Class Style Deprecated in Angular 22?

This is where many answers are imprecise, so here is exactly what the 22.2.3 typings say:

| API | Status in <code>@angular/router</code> 22.2.3 |
| :--- | :--- |
| <code>interface CanActivate</code> (and <code>CanMatch</code>, <code>CanDeactivate</code>, <code>CanActivateChild</code>, <code>Resolve</code>) | <code>@publicApi</code>, **not** marked deprecated |
| Putting a class or <code>InjectionToken</code> in <code>canActivate: [...]</code> | The array type is <code>Array&lt;CanActivateFn &#124; DeprecatedGuard&gt;</code>, and <code>DeprecatedGuard</code> is <code>@deprecated</code>: "The [<code>InjectionToken</code>](/interview-question/what-is-an-injectiontoken) and <code>@Injectable</code> classes for guards are deprecated in favor of plain JavaScript functions instead" |
| Classes or tokens in <code>resolve: {...}</code> | Same, via <code>DeprecatedResolve</code> |
| <code>mapToCanActivate</code> and the other <code>mapTo*</code> helpers | <code>@publicApi</code>, not deprecated |
| <code>CanLoad</code>, <code>CanLoadFn</code>, <code>Route.canLoad</code> | <code>@deprecated</code>, "Use <code>canMatch</code> instead" |

So the honest summary is: **referencing a guard class directly from a route is deprecated; the interfaces and the mapping helpers are not.** A class that implements <code>CanActivate</code> and is wired in with <code>mapToCanActivate([AdminGuard])</code> uses no deprecated API at all. And deprecated still means working: the verified run below shows <code>canActivate: [AdminGuard]</code> behaving exactly like the other forms.

## 4. The Same Rule, Four Ways

<svg class="iq-diagram" width="100%" viewBox="0 0 720 280" role="img" aria-label="Class guard registered as a DI token, class wrapped by mapToCanActivate, a plain function, and a guard factory all end up as a function the router calls">
  <defs>
    <marker id="fg-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="20" width="250" height="50" rx="10"/>
  <text class="d-sub" x="145" y="50" text-anchor="middle">canActivate: [AdminGuard]  (deprecated)</text>
  <rect class="d-box" x="20" y="85" width="250" height="50" rx="10"/>
  <text class="d-sub" x="145" y="115" text-anchor="middle">mapToCanActivate([AdminGuard])</text>
  <rect class="d-box" x="20" y="150" width="250" height="50" rx="10"/>
  <text class="d-sub" x="145" y="180" text-anchor="middle">canActivate: [adminGuard]</text>
  <rect class="d-box" x="20" y="215" width="250" height="50" rx="10"/>
  <text class="d-sub" x="145" y="245" text-anchor="middle">canActivate: [hasRole(&quot;billing&quot;)]</text>
  <path class="d-edge-dashed" d="M 274 45 L 436 130" marker-end="url(#fg-arrow)"/>
  <path class="d-edge" d="M 274 110 L 436 135" marker-end="url(#fg-arrow)"/>
  <path class="d-edge-accent" d="M 274 175 L 436 145" marker-end="url(#fg-arrow)"/>
  <path class="d-edge-accent" d="M 274 240 L 436 150" marker-end="url(#fg-arrow)"/>
  <rect class="d-box-accent" x="440" y="105" width="260" height="70" rx="12"/>
  <text class="d-text d-accent" x="570" y="134" text-anchor="middle">router calls a function</text>
  <text class="d-sub" x="570" y="156" text-anchor="middle">in an injection context</text>
</svg>

All four routes in the example end up the same way: the router calls a function inside the route's injector. The class forms simply add a layer that asks DI for the class instance first.

## 5. Verified: all four behave the same

The example defines an <code>AuthService</code> holding roles in a [signal](/interview-question/what-are-angular-signals), an <code>AdminGuard</code> class, an <code>adminGuard</code> function and a <code>hasRole()</code> factory, and wires them to five routes. The user starts as an <code>editor</code>, then becomes an <code>admin</code>:

\`\`\`
[app] RENDERED: 
navigateByUrl("/legacy")
  AdminGuard.canActivate (class)
  -> router.url = /denied
navigateByUrl("/mapped")
  AdminGuard.canActivate (class)
  -> router.url = /denied
navigateByUrl("/fn")
  adminGuard (function)
  -> router.url = /denied
navigateByUrl("/edit")
  hasRole("editor") for /edit
  -> router.url = /edit
navigateByUrl("/billing")
  hasRole("billing") for /billing
  -> router.url = /denied
auth.roles.set(["admin"])
navigateByUrl("/legacy")
  AdminGuard.canActivate (class)
  -> router.url = /legacy
navigateByUrl("/fn")
  adminGuard (function)
  -> router.url = /fn
\`\`\`

- The **deprecated token form** (<code>/legacy</code>) and the **mapped class** (<code>/mapped</code>) both called <code>AdminGuard.canActivate</code> and redirected to <code>/denied</code> while the user was not an admin.
- The **function** made the same decision with half the code and no <code>@Injectable</code>.
- The **factory** allowed <code>/edit</code> (the user has <code>editor</code>) and refused <code>/billing</code>, from one implementation.
- After <code>roles.set(["admin"])</code> both the class and the function let the user in: they read the signal at call time.

## 6. Verified: two behaviours that catch people out

**<code>inject()</code> after an <code>await</code>.** A guard that awaits first and injects second:

\`\`\`ts
const late: CanActivateFn = async () => {
  await wait(1);
  const router = inject(Router); // no injection context any more
  return true;
};
\`\`\`

produced a <code>NavigationError</code> and rejected the <code>navigateByUrl</code> promise with:

\`\`\`
NG0203: The \`_Router\` token injection failed. \`inject()\` function must be called from an injection context such as a constructor, a factory function, a field initializer, or a function used with \`runInInjectionContext\`. Find more at https://v22.angular.dev/errors/NG0203
\`\`\`

The fix is to call every <code>inject()</code> at the top of the function, before the first <code>await</code>, exactly as the resolver in [route resolvers](/interview-question/what-is-a-route-resolver-and-when-is-it-useful) does. A class guard never hits this, because its dependencies were injected when the instance was created; that is one of the few real differences in behaviour.

**Several async guards on one route.** <code>slow</code> resolves <code>true</code> after 50 ms and <code>fast</code> resolves <code>false</code> after 10 ms:

| Route config | Log | navigateByUrl |
| :--- | :--- | :--- |
| <code>canActivate: [slow, fast]</code> | slow start, fast start, fast end -&gt; false, slow end -&gt; true | <code>false</code> after about 60 ms |
| <code>canActivate: [fast, slow]</code> | fast start, slow start, fast end -&gt; false | <code>false</code> after about 15 ms |

Both guards **started immediately**, so they are not run one after another. But the result is decided in **array order**: with <code>slow</code> first, the router waited for it even though <code>fast</code> had already refused. Put cheap, likely-to-refuse checks first.

## 7. Side by Side

| | Class-based guard | Functional guard |
| :--- | :--- | :--- |
| Shape | <code>@Injectable</code> class with a <code>canActivate()</code> method | A <code>CanActivateFn</code> constant |
| Dependencies | Constructor or field <code>inject()</code> | <code>inject()</code> in the function body, before any <code>await</code> |
| Wiring in routes | Class token (deprecated) or <code>mapToCanActivate</code> | The function itself |
| Per-route configuration | Read <code>route.data</code> inside the class | Guard factory: <code>hasRole("x")</code> |
| Composition | Inheritance or a service | Call other guard functions, or list several |
| Testing | Instantiate with <code>TestBed.inject(AdminGuard)</code> | <code>TestBed.runInInjectionContext(() =&gt; adminGuard(route, state))</code> |
| Boilerplate | Decorator, class, interface, method | One function |

## 8. A Migration Plan That Does Not Break Anything

1. **Wrap first.** Replace <code>canActivate: [AdminGuard]</code> with <code>canActivate: mapToCanActivate([AdminGuard])</code>. Behaviour is identical (verified above) and the deprecation warning in your editor disappears.
2. **Convert leaf guards** to functions, keeping the logic in a [service](/interview-question/what-is-a-service-and-why-use-it) if other code uses it: <code>export const adminGuard: CanActivateFn = () =&gt; inject(AuthService).isAdmin() || inject(Router).parseUrl("/denied");</code>
3. **Collapse look-alikes into factories.** Five role guards become one <code>hasRole(role)</code>.
4. **Move <code>canLoad</code> to <code>canMatch</code>**, which is also what makes preloading work again (see [preloading strategies](/interview-question/what-are-preloading-strategies)).
5. **Update tests** to call the function with <code>TestBed.runInInjectionContext</code>, which is covered in [testing signal components with TestBed](/interview-question/explain-how-to-perform-unit-testing-on-components-with-signals-using-testbed).

## 9. Common Pitfalls

- **Saying "class guards were removed".** They were not; only listing a class or token directly in a route is deprecated, and it still runs.
- **Calling <code>inject()</code> after <code>await</code>.** Verified above: <code>NG0203</code>.
- **Calling <code>inject()</code> inside a <code>.subscribe</code> or <code>setTimeout</code> callback.** Same problem: the callback runs later, outside the injection context.
- **Creating the guard factory call outside the route array**, then mutating a shared variable. Factory arguments are captured once per route; keep them pure.
- **Putting a slow async guard first in the array.** Results are decided in order, so a slow first guard delays the refusal of a fast second one.
- **Converting the guard but leaving <code>providers: [AdminGuard]</code> around.** A function needs no provider; dead providers only confuse the next reader.

## 10. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The difference:</strong> <span style="color:#f0e2c8;">"A class guard is an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@Injectable</code> class implementing CanActivate that the router gets from DI. A functional guard is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CanActivateFn</code>, and it gets dependencies with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inject()</code> because the router calls it in an injection context."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Deprecation, precisely:</strong> <span style="color:#f0e2c8;">"In Angular 22 the interfaces are not deprecated. Listing a class or token directly in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">canActivate</code> is, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mapToCanActivate</code> wraps a class as a function."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why functions win:</strong> <span style="color:#f0e2c8;">"Less boilerplate, no provider, and guard factories like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hasRole(&quot;admin&quot;)</code> give per-route configuration from one implementation."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The gotcha:</strong> <span style="color:#f0e2c8;">"inject() must run before the first await. After it, the context is gone and the router reports NG0203."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Migration:</strong> <span style="color:#f0e2c8;">"Wrap with mapToCanActivate first, convert leaf guards to functions, merge look-alikes into factories, and move canLoad to canMatch."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you unit test a functional guard?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Configure TestBed with fakes for the services, then call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TestBed.runInInjectionContext(() =&gt; guard(route, state))</code> and assert on the result, which may be a boolean, a UrlTree or an observable.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a functional guard reuse an existing service?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, it is just <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inject(AuthService)</code>. Keeping the real logic in a service and the guard as a thin function is a good split, because other code can reuse the service.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you write a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">canDeactivate</code> guard functionally?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CanDeactivateFn&lt;EditorComponent&gt;</code> receives the component instance first, then the current route, current state and next state, so it can read <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">editor.dirty()</code> and return a boolean or a Promise from a dialog.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do multiple guards on one route run in sequence?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">They start together. The router then reads results in array order, so it waits for earlier guards before trusting a later refusal; I verified that a slow guard first delays the outcome.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is there a performance difference?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not one you would measure. The router calls a function either way; the class form adds one DI lookup. The benefits are size, readability and configurability.</span>
</div>

</div>

## 11. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Class-based guard** | Injectable class with a guard method, listed as a DI token |
| **Functional guard** | A plain function the router calls, using inject() for dependencies |
| **CanActivateFn** | The type of a functional canActivate guard |
| **DeprecatedGuard** | The deprecated type for classes or tokens in a route guard array |
| **mapToCanActivate** | Wraps guard classes as functional guards |
| **Guard factory** | Function returning a configured guard, such as hasRole(role) |
| **Injection context** | Where inject() may be called; lost after an await |
| **NG0203** | The error thrown when inject() runs outside an injection context |

---
**Conclusion:** A class-based guard is an injectable class whose method the router calls through DI; a functional guard is the function itself, using <code>inject()</code> for its dependencies. In Angular 22.2.3 what is deprecated is listing a class or token in the route array, not the <code>CanActivate</code> interface, and <code>mapToCanActivate</code> bridges the two without any deprecated API. Verified behaviour: all four styles made identical decisions, async guards in one array start together but resolve in array order, and an <code>inject()</code> after an <code>await</code> fails with <code>NG0203</code>. Functions win on size, configurability through factories and testability, which is why new code should use them.`,
    examples: [
      {
        label: "The same admin rule as a class, a mapped class, a function and a guard factory",
        tech: "angular",
        runnable: false,
        code: `import { ApplicationConfig, Component, Injectable, inject, signal } from "@angular/core";
import {
  ActivatedRouteSnapshot, CanActivate, CanActivateFn, GuardResult, MaybeAsync, Router,
  RouterOutlet, mapToCanActivate, provideRouter,
} from "@angular/router";

@Injectable({ providedIn: "root" })
export class AuthService {
  readonly roles = signal<string[]>(["editor"]);
}

// ── Class-based guard (the pre-v14.2 style) ────────────────────────────────
@Injectable({ providedIn: "root" })
export class AdminGuard implements CanActivate {
  private auth = inject(AuthService);
  private router = inject(Router);
  canActivate(): MaybeAsync<GuardResult> {
    console.log("  AdminGuard.canActivate (class)");
    return this.auth.roles().includes("admin") || this.router.parseUrl("/denied");
  }
}

// ── Functional guard: a plain function, inject() works inside it ───────────
export const adminGuard: CanActivateFn = () => {
  console.log("  adminGuard (function)");
  return inject(AuthService).roles().includes("admin") || inject(Router).parseUrl("/denied");
};

// ── Guard factory: configure a function guard per route ────────────────────
export const hasRole = (role: string): CanActivateFn => (route: ActivatedRouteSnapshot) => {
  console.log(\`  hasRole("\${role}") for /\${route.routeConfig?.path}\`);
  return inject(AuthService).roles().includes(role) || inject(Router).parseUrl("/denied");
};

@Component({ selector: "app-page", template: \`<p>ok</p>\` })
export class PageComponent {}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter([
      { path: "legacy", component: PageComponent, canActivate: [AdminGuard] }, // class as a DI token (deprecated form)
      { path: "mapped", component: PageComponent, canActivate: mapToCanActivate([AdminGuard]) }, // class wrapped in a function
      { path: "fn", component: PageComponent, canActivate: [adminGuard] },
      { path: "edit", component: PageComponent, canActivate: [hasRole("editor")] },
      { path: "billing", component: PageComponent, canActivate: [hasRole("billing")] },
      { path: "denied", component: PageComponent },
    ]),
  ],
};

@Component({ selector: "app-root", imports: [RouterOutlet], template: \`<router-outlet />\` })
export class AppComponent {
  readonly router = inject(Router);
  readonly auth = inject(AuthService);
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do functional route guards and lazy loadComponent work in modern Angular?",
    seoDescription:
      "How canMatch and canActivate interact with loadComponent and loadChildren: which guard prevents the lazy download, and why preloading ignores canMatch.",
    description: `**Question presented to candidate:**
"We lazy load an admin reports screen with \`loadComponent\` and protect it with a functional guard. A security review says the admin JavaScript still downloads for normal users. Walk me through how functional guards and \`loadComponent\` interact in modern Angular, and how you would fix this."

**What a strong answer should cover:**
- \`loadComponent\` points a route at a **lazily imported standalone component**; the loader runs at most once and its result is cached.
- A functional guard is a function using \`inject()\`; **which kind** of guard you attach decides **when** it runs relative to the lazy download.
- **\`canMatch\`** runs while matching: if it refuses, the route entry is skipped, the next entry with the same path can match (an "upsell" or 404 page), and the lazy component is **not downloaded**.
- **\`canActivate\`** runs after matching; for \`loadComponent\` the loader ran only after the guard passed in Angular 22.2.3, but for \`loadChildren\` the children are loaded **before** \`canActivate\`, because they are needed for matching.
- **Preloading ignores \`canMatch\`** (only the deprecated \`canLoad\` blocks it), so \`PreloadAllModules\` would still download the chunk.
- Route-level \`providers\` are visible to the guards and the lazy component: the same instance.

**Clarifying questions expected:**
- "Is preloading enabled in this app?"
- "What should a non-admin see at that URL: a 404, a login page, or an upsell?"

**Code / implementation expected:** Yes — the same check as \`canMatch\` on one lazy route and \`canActivate\` on another, with loader calls logged.`,
    answer: `**Target Audience:** Developers using standalone components and lazy routes who want to know exactly what downloads when — assumes you know [route guards](/interview-question/what-are-route-guards-in-angular) and [lazy loading](/interview-question/how-does-routing-and-lazy-loading-work-in-angular).
**Difficulty:** Medium to Hard

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. Every "loader called" line below was printed by a real loader function while the compiled example (Angular 22.2.3, <code>ngc</code> with strict templates) was driven with <code>Router.navigateByUrl</code>. The preloading behaviour was checked both by running it and by reading the 22.2.3 <code>RouterPreloader</code> source.

## 1. Why This Even Matters — A Story First

A museum keeps its rare manuscripts in a vault across town. Visitors who ask for them fill in a slip, and a courier drives over to fetch the box.

There are two ways to run the desk:

- **Check the slip before calling the courier.** If the visitor is not a member, the desk says "the manuscripts are for members, but here is our public gallery", and no courier ever leaves.
- **Call the courier first, check the slip when the box arrives.** Non-members are still turned away, but the box has already crossed town, and anyone watching the van knows what is inside.

In Angular, the vault is a lazy chunk, the courier is the loader function in <code>loadComponent</code> or <code>loadChildren</code>, and the two desks are <code>canMatch</code> and <code>canActivate</code>. Getting this right is what the question is about.

## 2. The Core Idea

📌 **Interview term: loadComponent** — a route property holding a function that returns a [standalone component](/interview-question/what-are-standalone-components) class, usually <code>() =&gt; import("./reports/reports")</code>. If the file has a default export, the router unwraps it, so no <code>.then(m =&gt; m.X)</code> is needed. The router calls it once and caches the class on the route.

📌 **Interview term: Functional guard** — a function such as <code>CanMatchFn</code> or <code>CanActivateFn</code> that the router calls in the route's [injection context](/interview-question/what-is-runininjectioncontext-and-when-do-you-need-to-use-it), so it can use [<code>inject()</code>](/interview-question/inject-vs-constructor-injection-when-should-you-use-each). The differences from class guards are covered in [functional vs class-based guards](/interview-question/what-are-functional-route-guards-and-how-do-they-differ-from-class-based-guards).

📌 **Interview term: Route-level providers** — <code>providers: [...]</code> on a route creates an environment injector for that route and its children. Guards on the route, the lazy component and its children all resolve from it (how injectors are searched is covered in [dependency injection](/interview-question/how-does-dependency-injection-work-in-angular)). Verified: a <code>ReportsApi</code> provided only on the route was the **same instance** (same random id) in the <code>canMatch</code> guard, the <code>canActivate</code> guard and the component's constructor.

The whole answer fits in one table:

| | <code>canMatch</code> on a lazy route | <code>canActivate</code> on a lazy route |
| :--- | :--- | :--- |
| When it runs | While the URL is matched against routes | After the route has matched |
| On refusal | Route entry skipped; the next entry with the same path may match | Navigation cancelled (or redirected with a UrlTree) |
| <code>loadComponent</code> download on refusal | No (verified) | No in 22.2.3 (verified), loader ran after the guard |
| <code>loadChildren</code> download on refusal | No | **Yes** (verified), children load before activation guards |
| Blocks preloading | **No** (verified) | No |

## 3. Where the Download Happens

<svg class="iq-diagram" width="100%" viewBox="0 0 720 320" role="img" aria-label="canMatch decides before the route matches so a refused lazy route is never loaded, while loadChildren is loaded during matching, before canActivate runs">
  <defs>
    <marker id="lg-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="180" y="26" text-anchor="middle">Matching phase</text>
  <text class="d-text" x="540" y="26" text-anchor="middle">Activation phase</text>
  <rect class="d-box-accent" x="20" y="50" width="160" height="60" rx="10"/>
  <text class="d-text d-accent" x="100" y="76" text-anchor="middle">canMatch</text>
  <text class="d-sub" x="100" y="96" text-anchor="middle">no: try next route</text>
  <path class="d-edge" d="M 184 80 L 216 80" marker-end="url(#lg-arrow)"/>
  <rect class="d-box-muted" x="220" y="50" width="140" height="60" rx="10"/>
  <text class="d-text" x="290" y="76" text-anchor="middle">loadChildren</text>
  <text class="d-sub" x="290" y="96" text-anchor="middle">downloads here</text>
  <path class="d-edge" d="M 364 80 L 416 80" marker-end="url(#lg-arrow)"/>
  <rect class="d-box" x="420" y="50" width="130" height="60" rx="10"/>
  <text class="d-text" x="485" y="76" text-anchor="middle">canActivate</text>
  <text class="d-sub" x="485" y="96" text-anchor="middle">no: cancel</text>
  <path class="d-edge" d="M 554 80 L 576 80" marker-end="url(#lg-arrow)"/>
  <rect class="d-box-muted" x="580" y="50" width="120" height="60" rx="10"/>
  <text class="d-text" x="640" y="76" text-anchor="middle">loadComponent</text>
  <text class="d-sub" x="640" y="96" text-anchor="middle">downloads here</text>
  <rect class="d-box-accent" x="20" y="190" width="320" height="80" rx="12"/>
  <text class="d-text d-accent" x="180" y="222" text-anchor="middle">Preloader after NavigationEnd</text>
  <text class="d-sub" x="180" y="246" text-anchor="middle">ignores canMatch, skips canLoad routes</text>
  <path class="d-edge-dashed" d="M 344 230 L 576 108" marker-end="url(#lg-arrow)"/>
  <path class="d-edge-dashed" d="M 260 186 L 284 114" marker-end="url(#lg-arrow)"/>
</svg>

The chunk behind <code>loadChildren</code> must be downloaded during matching, because the router cannot match <code>/shop/orders</code> without knowing the shop's child routes. A <code>loadComponent</code> target is only needed for rendering, so in 22.2.3 it is fetched after the activation guards pass. Only <code>canMatch</code> sits in front of both on a normal navigation, while the preloader (the dashed arrows) can fetch either one in the background without asking <code>canMatch</code>.

## 4. Verified: canMatch versus canActivate on lazy routes

The example has two lazy routes protected by the same session check, once as <code>canMatch</code> and once as <code>canActivate</code>, plus a second <code>reports</code> entry that shows an upsell. The loaders log when they are called. First as a normal user, then as an admin:

\`\`\`
[app] RENDERED: Home
isAdmin = false
navigateByUrl("/reports")
  canMatch    -> false
  PAGE: Upgrade to see reports
navigateByUrl("/billing")
  canActivate -> false
  PAGE: Home
isAdmin = true
navigateByUrl("/reports")
  canMatch    -> true
  loadComponent(reports) called
  PAGE: Admin reports (lazy)
navigateByUrl("/billing")
  canActivate -> true
  loadComponent(billing) called
  PAGE: Admin billing (lazy)
\`\`\`

- **<code>canMatch</code> refused, and the router moved on** to the next route with the same path: the user saw "Upgrade to see reports", and the reports loader was never called.
- **<code>canActivate</code> refused and redirected** to <code>/</code> (the guard returned a UrlTree); the billing loader was not called either. In 22.2.3, <code>loadComponent</code> runs after activation guards.
- **When the guards passed**, each loader ran once, after its guard.

The same test with <code>loadChildren</code> and a refusing <code>canActivate</code> tells a different story:

\`\`\`
[app] RENDERED: 
  loadChildren(shop) called
  canActivate -> false
resolved false
\`\`\`

The children were downloaded **before** the guard said no. This is the scenario from the question when the admin area is a <code>loadChildren</code> feature: the download happens even though the user is refused.

## 5. Verified: preloading does not ask canMatch

With <code>withPreloading(PreloadAllModules)</code>, a lazy route whose <code>canMatch</code> always returns <code>false</code> was still downloaded right after the first navigation (<code>loader(admin) called</code> printed after <code>NavigationEnd /</code>; full log in [preloading strategies](/interview-question/what-are-preloading-strategies)). The 22.2.3 <code>RouterPreloader</code> source confirms why: it checks <code>route.canLoad === undefined</code> before preloading <code>loadChildren</code> and checks nothing at all for <code>loadComponent</code>; <code>canMatch</code> is never consulted.

So "canMatch keeps admin code away from normal users" is true only when preloading is off, or when a custom strategy skips those routes. A strategy that reads <code>route.data</code> (for example <code>data: { preload: false }</code> on admin routes) fixes it; building one is covered in [custom preloading strategies](/interview-question/how-do-you-optimize-initial-bundle-size-using-route-preloading-with-custom-strat). And none of this is a security boundary: chunk files are public static assets, and the main bundle names them (in a CLI 22.2.3 build, <code>main-*.js</code> contained <code>import("./chunk-FLT5ADAW.js")</code> for the lazy admin screen), so the API must still check the user.

## 6. A Clean Modern Pattern

\`\`\`ts
export const routes: Routes = [
  {
    path: "admin",
    canMatch: [() => inject(Session).isAdmin()],          // refuse: admin code not fetched on navigation
    providers: [AdminApi],                                 // shared by guards and every admin screen
    loadChildren: () => import("./admin/admin.routes"),    // file uses export default
    data: { preload: false },                              // and the custom preloader leaves it alone
  },
  { path: "admin", loadComponent: () => import("./upsell/upsell") },
  {
    path: "account",
    canActivate: [() => inject(Session).user() ? true : inject(Router).parseUrl("/login")],
    loadComponent: () => import("./account/account"),
  },
];
\`\`\`

Use <code>canMatch</code> for "this route does not exist for you" and <code>canActivate</code> for "this route exists, but you must sign in first". The second one usually wants a redirect, which only <code>canActivate</code> (or a <code>canMatch</code> returning a UrlTree) can express.

## 7. Common Pitfalls

- **Relying on <code>canActivate</code> to keep a <code>loadChildren</code> chunk away.** Verified above: the children load first.
- **Assuming <code>canMatch</code> blocks preloading.** It does not; <code>PreloadAllModules</code> downloaded a route whose <code>canMatch</code> always says no.
- **Reaching for <code>canLoad</code> to block preloading.** It does block it, but it is deprecated ("Use <code>canMatch</code> instead"); a custom preloading strategy is the supported answer.
- **A refusing <code>canMatch</code> with no fallback route.** The URL then falls through to <code>**</code> or, with no wildcard, <code>navigateByUrl</code> rejects with <code>NG04002: Cannot match any routes. URL Segment: 'reports'</code> (verified). Add an explicit second entry for the same path.
- **Injecting route-level providers from a parent component.** Route <code>providers</code> are visible to that route subtree only, not to the component that hosts the outlet.
- **Using <code>.then(m =&gt; m.default)</code> by hand.** It works, but the router already unwraps default exports, so <code>() =&gt; import("./x")</code> is enough.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The pieces:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">loadComponent</code> lazily imports a standalone component, called once and cached. A functional guard is a function using <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inject()</code>, and the kind of guard decides when it runs."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. canMatch:</strong> <span style="color:#f0e2c8;">"It runs while matching. If it refuses, the router skips that route entry and can match a fallback with the same path, and the lazy code is never fetched."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. canActivate:</strong> <span style="color:#f0e2c8;">"It runs after matching. In Angular 22 a loadComponent target is fetched after it passes, but loadChildren is fetched before it, because children are needed to match."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The preloading catch:</strong> <span style="color:#f0e2c8;">"The preloader ignores canMatch, so PreloadAllModules downloads those routes anyway. I would use a custom strategy that skips them."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Framing:</strong> <span style="color:#f0e2c8;">"canMatch for routes that should not exist for a user, canActivate with a UrlTree for sign-in redirects, and the API remains the real security."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you show a different component at the same URL for admins and others?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Two route entries with the same path: the first with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">canMatch: [isAdmin]</code> and the admin component, the second with the regular one. A refusing canMatch makes the router try the next entry.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">canMatch</code> redirect?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, it may return a UrlTree or RedirectCommand like any guard. Returning false means skip this entry; returning a UrlTree cancels and navigates elsewhere.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where should services for a lazy feature be provided?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">On the route with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">providers</code>, or in the lazy routes file. They are created in a route environment injector, shared by the guards and components of that subtree, and stay out of the root bundle when the routes file is lazy.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why was <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">canLoad</code> deprecated?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It only covered loadChildren and could not express a fallback. canMatch covers both lazy and eager routes and lets matching continue, so it replaced canLoad.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does hiding a lazy chunk protect anything?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not really. Chunk files are public static assets and the main bundle names them in its <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">import()</code> calls, so treat it as bandwidth and tidiness, and enforce access on the server.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **loadComponent** | Route property that lazily loads one standalone component |
| **loadChildren** | Route property that lazily loads a set of child routes |
| **canMatch** | Guard run while matching; refusal skips the route entry |
| **canActivate** | Guard run after matching; refusal cancels or redirects |
| **Default export unwrapping** | Router accepts a module whose default export is the component or routes |
| **Route-level providers** | Services scoped to one route subtree, shared by its guards and components |
| **Preloader** | Router service that fetches lazy routes in the background after NavigationEnd |

---
**Conclusion:** Functional guards and <code>loadComponent</code> fit together naturally, but the kind of guard decides when the lazy code is fetched. On Angular 22.2.3, a refusing <code>canMatch</code> skipped the route and the loader never ran, a refusing <code>canActivate</code> also prevented a <code>loadComponent</code> download but not a <code>loadChildren</code> one, and the preloader downloaded a route whose <code>canMatch</code> always said no. Put <code>canMatch</code> in front of code some users should not fetch, keep preloading selective for those routes, use <code>canActivate</code> with a UrlTree for sign-in redirects, and leave real authorisation to the server.`,
    examples: [
      {
        label: "Same check as canMatch and canActivate on lazy routes, with loader logs",
        tech: "angular",
        runnable: false,
        code: `import { ApplicationConfig, Component, Injectable, inject, signal } from "@angular/core";
import { CanActivateFn, CanMatchFn, Router, RouterOutlet, Routes, provideRouter } from "@angular/router";

@Injectable({ providedIn: "root" })
export class Session {
  readonly isAdmin = signal(false);
}

// Two guards with the same check. Only the kind of guard differs.
const adminCanMatch: CanMatchFn = () => {
  const ok = inject(Session).isAdmin();
  console.log(\`  canMatch    -> \${ok}\`);
  return ok;
};
const adminCanActivate: CanActivateFn = () => {
  const ok = inject(Session).isAdmin();
  console.log(\`  canActivate -> \${ok}\`);
  return ok || inject(Router).parseUrl("/");
};

@Component({ selector: "app-home", template: \`<p>Home</p>\` })
export class HomeComponent {}
@Component({ selector: "app-upsell", template: \`<p>Upgrade to see reports</p>\` })
export class UpsellComponent {}
// Stand-ins for files that would really be loaded with import("./...").
@Component({ selector: "app-reports", template: \`<p>Admin reports (lazy)</p>\` })
export class ReportsComponent {}
@Component({ selector: "app-billing", template: \`<p>Admin billing (lazy)</p>\` })
export class BillingComponent {}

const lazy = (name: string, cmp: unknown) => () => {
  console.log(\`  loadComponent(\${name}) called\`);
  return Promise.resolve(cmp as typeof ReportsComponent);
};

export const routes: Routes = [
  { path: "", component: HomeComponent },
  // canMatch: if it says no, the router skips this config entry and keeps matching.
  { path: "reports", canMatch: [adminCanMatch], loadComponent: lazy("reports", ReportsComponent) },
  { path: "reports", component: UpsellComponent },
  // canActivate: the route already matched; the guard decides whether to activate it.
  { path: "billing", canActivate: [adminCanActivate], loadComponent: lazy("billing", BillingComponent) },
];

export const appConfig: ApplicationConfig = { providers: [provideRouter(routes)] };

@Component({ selector: "app-root", imports: [RouterOutlet], template: \`<router-outlet />\` })
export class AppComponent {
  readonly router = inject(Router);
  readonly session = inject(Session);
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is a route resolver and when is it useful?",
    seoDescription:
      "An Angular route resolver fetches data after guards and before the component is created. When it helps, what it costs, and how it handles errors.",
    description: `**Question presented to candidate:**
"A product page shows an empty template with spinners for half a second, then jumps when data arrives. A colleague suggests a route resolver. What is a resolver, when does it actually help, and what does it cost?"

**What a strong answer should cover:**
- A **resolver** (\`ResolveFn<T>\`) is a function listed under a route's \`resolve\` key; the router runs it **after all guards pass** and **before the component is created**, and stores the result in the route's \`data\`.
- The component receives the value through \`ActivatedRoute.data\` or, with \`withComponentInputBinding()\`, as an **input named after the key**.
- **Cost:** the navigation (and the old screen) waits for the slowest resolver, so slow APIs make the app feel frozen; show progress via router events.
- Behaviour details: Promise or Observable allowed; the router uses the **first emitted value**; an Observable that completes **without emitting cancels** the navigation; an error becomes a \`NavigationError\`; returning a \`RedirectCommand\` redirects.
- **Re-run rules:** by default resolvers re-run when path or matrix parameters change, not on query changes (\`runGuardsAndResolvers\`).
- When **not** to use one: data that can stream in, or that should not block the URL change.

**Clarifying questions expected:**
- "How slow is the API, and is a blank page or a frozen old page worse for these users?"
- "What should happen when the product does not exist: a 404 page or an inline message?"

**Code / implementation expected:** Yes — a functional resolver that fetches by route id, redirects when not found, and binds to a component input.`,
    answer: `**Target Audience:** Developers comfortable with routes and guards who need to decide how a routed screen gets its data — assumes [route guards](/interview-question/what-are-route-guards-in-angular) basics.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. The timelines and results in sections 5 and 6 come from compiling the examples with <code>ngc</code> on Angular 22.2.3 and navigating with <code>Router.navigateByUrl</code>; the API delay is a 40 ms timer, because a real network was not used.

## 1. Why This Even Matters — A Story First

A restaurant can serve you in two ways. In the first, the waiter seats you immediately, puts down empty plates and cutlery, and food arrives dish by dish. You are seated fast, but the table looks half-finished for a while. In the second, you wait at the bar until the kitchen says "table 6 is ready", and you sit down to a fully laid meal. Nothing jumps around, but if the kitchen is slow you are standing at the bar looking at the old room.

A **route resolver** is the second restaurant. The router keeps the current screen, waits for the data, and only then builds the new component with everything already filled in. Knowing when that wait is worth it, and when it is not, is the real interview question.

## 2. The Core Idea

📌 **Interview term: Resolver** — a function typed <code>ResolveFn&lt;T&gt;</code>, listed in a route's <code>resolve</code> map: <code>resolve: { product: productResolver }</code>. It receives the <code>ActivatedRouteSnapshot</code> and <code>RouterStateSnapshot</code>, can use [<code>inject()</code>](/interview-question/inject-vs-constructor-injection-when-should-you-use-each), and returns a value, a Promise or an [Observable](/interview-question/what-is-the-difference-between-observables-and-promises).

📌 **Interview term: Resolved data** — the router stores each result under its key in the route's <code>data</code>. Read it with <code>inject(ActivatedRoute).data</code>, or let [component input binding](/interview-question/how-do-you-read-route-parameters) set an input of the same name.

📌 **Interview term: RedirectCommand** — a value a resolver (or guard) can return to cancel this navigation and go elsewhere: <code>new RedirectCommand(router.parseUrl("/not-found"))</code>. It replaces calling <code>router.navigate</code> from inside the resolver.

📌 **Interview term: runGuardsAndResolvers** — a route option that decides when guards and resolvers re-run on a route that stays active. The typings say the default is <code>paramsChange</code>: re-run when path or matrix parameters change, but not for query parameters or the fragment. Other values include <code>paramsOrQueryParamsChange</code> and <code>always</code>.

## 3. Where Resolvers Sit in a Navigation

<svg class="iq-diagram" width="100%" viewBox="0 0 720 260" role="img" aria-label="Timeline: NavigationStart, guards, ResolveStart, the resolver waits for data, ResolveEnd, then the component is constructed and NavigationEnd fires">
  <defs>
    <marker id="rs-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="40" width="140" height="60" rx="10"/>
  <text class="d-text" x="90" y="66" text-anchor="middle">Start</text>
  <text class="d-sub" x="90" y="86" text-anchor="middle">old page visible</text>
  <path class="d-edge" d="M 164 70 L 196 70" marker-end="url(#rs-arrow)"/>
  <rect class="d-box" x="200" y="40" width="110" height="60" rx="10"/>
  <text class="d-text" x="255" y="66" text-anchor="middle">Guards</text>
  <text class="d-sub" x="255" y="86" text-anchor="middle">all pass</text>
  <path class="d-edge" d="M 314 70 L 346 70" marker-end="url(#rs-arrow)"/>
  <rect class="d-box-accent" x="350" y="40" width="190" height="60" rx="10"/>
  <text class="d-text d-accent" x="445" y="66" text-anchor="middle">Resolvers</text>
  <text class="d-sub" x="445" y="86" text-anchor="middle">navigation waits</text>
  <path class="d-edge" d="M 544 70 L 576 70" marker-end="url(#rs-arrow)"/>
  <rect class="d-box" x="580" y="40" width="120" height="60" rx="10"/>
  <text class="d-text" x="640" y="66" text-anchor="middle">Render</text>
  <text class="d-sub" x="640" y="86" text-anchor="middle">data ready</text>
  <rect class="d-box-muted" x="350" y="160" width="190" height="60" rx="10"/>
  <text class="d-text" x="445" y="186" text-anchor="middle">Not found?</text>
  <text class="d-sub" x="445" y="206" text-anchor="middle">RedirectCommand</text>
  <path class="d-edge-dashed" d="M 445 104 L 445 156" marker-end="url(#rs-arrow)"/>
</svg>

The URL bar and the screen keep showing the old page for the whole time the resolver runs. That is the price of a component that is born complete.

## 4. Writing a Resolver

\`\`\`ts
export const productResolver: ResolveFn<Product> = async (route) => {
  const router = inject(Router);          // inject before the first await
  const api = inject(ProductApi);
  const product = await api.get(route.paramMap.get("id")!);
  if (!product) return new RedirectCommand(router.parseUrl("/not-found"));
  return product;
};

{ path: "products/:id", component: ProductComponent, resolve: { product: productResolver } }
\`\`\`

With <code>withComponentInputBinding()</code>, the component simply declares <code>product = input.required&lt;Product&gt;()</code>. No <code>ActivatedRoute</code>, no subscription, and the input can be <code>required</code> because the resolver guarantees a value before the component exists. The <code>inject</code>-before-<code>await</code> rule is the same one that trips up async guards, verified in [functional route guards](/interview-question/what-are-functional-route-guards-and-how-do-they-differ-from-class-based-guards).

## 5. Verified: the timeline of a resolved navigation

The example logs router events with elapsed time (rounded to 10 ms), the resolver logs when it starts and finishes, and the component logs its constructor. The fake API answers after 40 ms and knows no product <code>404</code>:

\`\`\`
  10ms NavigationStart /
  20ms NavigationEnd /
[app] RENDERED: 
navigateByUrl("/products/1")  PAGE before: undefined
  50ms NavigationStart /products/1
  50ms ResolveStart
  resolver start id=1
  resolver done  id=1
  90ms ResolveEnd
  ProductComponent constructed
 100ms NavigationEnd /products/1
  PAGE: Product 1, api.calls=1
navigateByUrl("/products/1?ref=email")  PAGE before: Product 1
 130ms NavigationStart /products/1?ref=email
 130ms NavigationEnd /products/1?ref=email
  PAGE: Product 1, api.calls=1
navigateByUrl("/products/2")  PAGE before: Product 1
 160ms NavigationStart /products/2
 170ms ResolveStart
  resolver start id=2
  resolver done  id=2
 210ms ResolveEnd
 210ms NavigationEnd /products/2
  PAGE: Product 2, api.calls=2
navigateByUrl("/products/404")  PAGE before: Product 2
 240ms NavigationStart /products/404
 240ms ResolveStart
  resolver start id=404
  resolver done  id=404
 280ms NavigationStart /not-found
 280ms ResolveStart
 280ms ResolveEnd
 290ms NavigationEnd /not-found
  PAGE: Not found, api.calls=3
\`\`\`

What the timeline proves:

- **The component was constructed after <code>ResolveEnd</code>**, so it never existed without data. Before the first navigation finished, the page was still the previous one.
- **The navigation took as long as the resolver**: about 40 to 50 ms here, which in production is your API latency.
- **A query-parameter change (<code>?ref=email</code>) did not re-run the resolver**: no <code>ResolveStart</code>, <code>api.calls</code> stayed at 1. That is <code>runGuardsAndResolvers: "paramsChange"</code>, the default.
- **A path-parameter change (<code>/products/2</code>) did re-run it**, and the existing component was reused (no second "constructed" line); its input simply changed.
- **<code>RedirectCommand</code> turned a missing product into a new navigation** to <code>/not-found</code>, which started its own <code>NavigationStart</code>.

## 6. Verified: what the router does with different return values

Four more resolvers on four routes, with the page printing the resolved value:

\`\`\`
[app] RENDERED: 
/multi -> true | url /multi | page first
/hot -> true | url /hot | page emitted, never completes
/empty -> false | url /hot | page emitted, never completes
  NavigationError: Error: API down
/boom -> rejected Error: API down | url /hot | page emitted, never completes
\`\`\`

| Resolver returns | Result |
| :--- | :--- |
| Observable emitting <code>"first"</code> then <code>"second"</code> | Navigates; the value is <code>"first"</code> |
| Observable that emits once and never completes | Navigates; the router did not wait for completion |
| <code>EMPTY</code> (completes with no value) | Navigation **cancelled**, <code>navigateByUrl</code> resolves <code>false</code>, URL unchanged |
| Throws <code>Error("API down")</code> | <code>NavigationError</code>, and the <code>navigateByUrl</code> promise **rejects** |

The rejection matters: an unhandled resolver error surfaces as an unhandled promise rejection unless you catch it or install <code>withNavigationErrorHandler(...)</code> on <code>provideRouter</code>, which the 22.2.3 typings list as <code>@publicApi</code> and which may return a <code>RedirectCommand</code> to send users to an error page.

## 7. When a Resolver Helps, and When It Hurts

| Situation | Resolver? | Why |
| :--- | :--- | :--- |
| Small, fast, essential data (the record the page is about) | Yes | No empty template, no layout jump, input can be required |
| A "not found" decision that changes the URL | Yes | Redirect before rendering instead of flashing an empty page |
| Slow or optional data (recommendations, comments) | No | The user stares at the old page; load it in the component instead |
| Data that streams or updates live | No | A resolver only uses the first value |
| Many independent requests | Careful | Keys run in parallel (two 40 ms resolvers on one route both started at once and the navigation took about 50 ms), but it waits for the slowest |

The usual alternative is to navigate immediately and load in the component, for example with a [signal](/interview-question/what-are-angular-signals)-based <code>resource</code> or [<code>toSignal(http.get(...))</code>](/interview-question/how-do-tosignal-and-toobservable-bridge-signals-and-rxjs), showing a skeleton while it loads. For HTTP caching across both approaches see [shareReplay](/interview-question/explain-the-sharereplay-operator-in-rxjs-and-how-it-prevents-duplicate-http-requ). Angular 22.2 also adds a <code>resources</code> property on routes, marked <code>@developerPreview 22.2</code> in the typings; it was not exercised here, so treat it as an API to watch rather than a recommendation.

## 8. Common Pitfalls

- **No visible progress.** The old page stays put while resolvers run; without a progress bar on <code>NavigationStart</code> / <code>NavigationEnd</code> the app looks frozen.
- **Returning an Observable that never emits.** The navigation hangs: a resolver returning <code>NEVER</code> left <code>navigateByUrl</code> pending after 2 seconds in a test run. One that completes without emitting (<code>EMPTY</code>) cancels it, as verified.
- **Expecting the latest value of a stream.** Only the first emission is used.
- **Expecting a re-run when the query string changes.** It does not happen by default; set <code>runGuardsAndResolvers</code> if it must.
- **Calling <code>inject()</code> after <code>await</code>.** Same <code>NG0203</code> as in guards; inject at the top.
- **Swallowing errors with <code>catchError(() =&gt; EMPTY)</code>.** That silently cancels the navigation; return a fallback value or a <code>RedirectCommand</code> instead (see [catchError](/interview-question/how-does-catcherror-work-in-rxjs-and-how-do-you-return-a-fallback-value)).

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">"A resolver is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ResolveFn</code> under a route <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">resolve</code> key. The router runs it after the guards and before creating the component, and stores the result in the route data."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Reading it:</strong> <span style="color:#f0e2c8;">"The component reads <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ActivatedRoute.data</code>, or with input binding it just declares an input with the same name, which can be required."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The cost:</strong> <span style="color:#f0e2c8;">"The navigation waits for the slowest resolver while the old page stays visible, so I add a progress indicator and keep resolvers for small, essential data."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Behaviour:</strong> <span style="color:#f0e2c8;">"It takes the first emitted value, EMPTY cancels the navigation, an error becomes a NavigationError, and a RedirectCommand handles not-found."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Re-runs:</strong> <span style="color:#f0e2c8;">"By default it re-runs when path or matrix params change, not query params; runGuardsAndResolvers changes that."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Resolver or loading in the component?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Resolver when the page is meaningless without the data and it is fast. Component loading with a skeleton when the data is slow, optional, or updates over time.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you show a loading bar for resolvers?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Listen to router events: show it on NavigationStart and hide it on NavigationEnd, NavigationCancel and NavigationError. A signal toggled from those events works well in a zoneless app.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do several resolvers on one route run in sequence?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The keys of one route resolve together, and parent routes resolve before child routes. The navigation waits for all of them, so the slowest one sets the pace.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle a failed request in a resolver?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Return a fallback value, or a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RedirectCommand</code> to an error page. Do not return EMPTY by accident, because that silently cancels the navigation.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Are class-based resolvers still allowed?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A class implementing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Resolve&lt;T&gt;</code> still works, but listing it directly in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">resolve</code> is deprecated in 22.2.3; wrap it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mapToResolve</code> or rewrite it as a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ResolveFn</code>.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Resolver** | Function the router runs before rendering to fetch route data |
| **ResolveFn** | The type of a functional resolver |
| **Resolved data** | Results stored in the route data under each key |
| **ResolveStart / ResolveEnd** | Router events around the resolver phase |
| **RedirectCommand** | Return value that cancels this navigation and goes elsewhere |
| **runGuardsAndResolvers** | When guards and resolvers re-run; default paramsChange |
| **withNavigationErrorHandler** | Router feature to handle navigation errors in one place |

---
**Conclusion:** A resolver is a function the router runs after the guards and before the component exists, storing its result in the route data or binding it to an input. On Angular 22.2.3 the component was constructed only after <code>ResolveEnd</code>, the navigation lasted as long as the resolver, query changes did not re-run it, a <code>RedirectCommand</code> sent missing products to <code>/not-found</code>, only the first emitted value was used, <code>EMPTY</code> cancelled the navigation and a thrown error rejected it. Use resolvers for small, essential data that should exist before the page does, and load slow or optional data inside the component instead.`,
    examples: [
      {
        label: "Functional resolver with RedirectCommand, input binding and router-event timeline",
        tech: "angular",
        runnable: false,
        code: `import { ApplicationConfig, Component, Injectable, inject, input } from "@angular/core";
import {
  NavigationEnd, NavigationError, NavigationStart, RedirectCommand, ResolveEnd, ResolveFn,
  ResolveStart, Router, RouterOutlet, provideRouter, withComponentInputBinding,
} from "@angular/router";

type Product = { id: string; name: string };

@Injectable({ providedIn: "root" })
export class ProductApi {
  calls = 0;
  // Pretend network call: 40 ms, and id 404 does not exist.
  get(id: string): Promise<Product | null> {
    this.calls++;
    return new Promise((r) => setTimeout(() => r(id === "404" ? null : { id, name: \`Product \${id}\` }), 40));
  }
}

export const productResolver: ResolveFn<Product> = async (route) => {
  const router = inject(Router); // inject before the first await
  const api = inject(ProductApi);
  const id = route.paramMap.get("id")!;
  console.log(\`  resolver start id=\${id}\`);
  const product = await api.get(id);
  console.log(\`  resolver done  id=\${id}\`);
  if (!product) return new RedirectCommand(router.parseUrl("/not-found"));
  return product;
};

@Component({
  selector: "app-product",
  template: \`<p>{{ product().name }}</p>\`,
})
export class ProductComponent {
  // The resolved value arrives as an input, by its key in "resolve".
  product = input.required<Product>();
  constructor() { console.log("  ProductComponent constructed"); }
}

@Component({ selector: "app-nf", template: \`<p>Not found</p>\` })
export class NotFoundComponent {}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      [
        { path: "products/:id", component: ProductComponent, resolve: { product: productResolver } },
        { path: "not-found", component: NotFoundComponent },
      ],
      withComponentInputBinding(),
    ),
  ],
};

@Component({ selector: "app-root", imports: [RouterOutlet], template: \`<router-outlet />\` })
export class AppComponent {
  readonly router = inject(Router);
  readonly api = inject(ProductApi);
  constructor() {
    const t0 = performance.now();
    const at = () => \`\${Math.round((performance.now() - t0) / 10) * 10}\`.padStart(4) + "ms";
    this.router.events.subscribe((e) => {
      if (e instanceof NavigationStart) console.log(\`\${at()} NavigationStart \${e.url}\`);
      if (e instanceof ResolveStart) console.log(\`\${at()} ResolveStart\`);
      if (e instanceof ResolveEnd) console.log(\`\${at()} ResolveEnd\`);
      if (e instanceof NavigationEnd) console.log(\`\${at()} NavigationEnd \${e.urlAfterRedirects}\`);
      if (e instanceof NavigationError) console.log(\`\${at()} NavigationError \${e.error}\`);
    });
  }
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are preloading strategies?",
    seoDescription:
      "Angular preloading strategies download lazy routes in the background after navigation: NoPreloading, PreloadAllModules and custom strategies.",
    description: `**Question presented to candidate:**
"We moved every feature behind lazy routes and the first load got faster, but now opening each section for the first time has a noticeable pause. What are preloading strategies in Angular, and which one would you pick?"

**What a strong answer should cover:**
- **Preloading** downloads lazy route code **in the background after a navigation finishes**, so a later navigation to that route needs no download.
- The built-in strategies: **\`NoPreloading\`** (the default) and **\`PreloadAllModules\`**, enabled with \`provideRouter(routes, withPreloading(...))\`.
- A **custom strategy** is a class implementing \`PreloadingStrategy.preload(route, load)\` that decides per route: call \`load()\` or return \`EMPTY\`.
- Preloading covers both **\`loadChildren\` and \`loadComponent\`**, runs after **\`NavigationEnd\`**, and does **not** consult \`canMatch\` (routes with the deprecated \`canLoad\` are skipped).
- The trade-off: initial load stays small, but users pay bandwidth for screens they may never open; mobile and metered connections deserve care.

**Clarifying questions expected:**
- "Do most users visit most sections, or only one or two?"
- "Are there areas, like admin, that most users should never download?"

**Code / implementation expected:** Yes — \`withPreloading(PreloadAllModules)\` and a log showing when the loaders run compared with \`NoPreloading\`.`,
    answer: `**Target Audience:** Developers who already lazy load routes and want to remove the first-visit delay — assumes [lazy loading](/interview-question/how-does-routing-and-lazy-loading-work-in-angular) basics.
**Difficulty:** Easy to Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. The loader logs in section 4 were printed by real loader functions while the compiled example (Angular 22.2.3, <code>ngc</code>) was navigated with <code>Router.navigateByUrl</code>, with and without preloading. Real network timings were not measured here; jsdom has no network.

## 1. Why This Even Matters — A Story First

A good assistant at a conference sets out the coffee for the first session, and once the room is settled, quietly starts preparing lunch. Nobody waited for lunch to be cooked before the first talk, and nobody waits at noon either.

Lazy loading already solved the first part: the app shows its first screen without waiting for every feature. **Preloading** is the second part: once that first screen is up and the browser is idle, the router fetches the other features in the background, so the first click on "Settings" opens instantly instead of pausing for a download.

## 2. The Core Idea

📌 **Interview term: Preloading** — downloading the code of lazy routes **before** the user navigates to them. The router starts it after a navigation ends, so it never competes with rendering the screen the user asked for.

📌 **Interview term: PreloadingStrategy** — an abstract class with one method, <code>preload(route, load)</code>. The router calls it for each lazy route that is not loaded yet. Return <code>load()</code> to preload the route, or <code>EMPTY</code> (an [Observable](/interview-question/what-is-the-difference-between-observables-and-promises) that completes immediately) to skip it.

📌 **Interview term: NoPreloading** — the default strategy. The 22.2.3 typings describe it as a strategy "that does not preload any modules" and note "This strategy is enabled by default."

📌 **Interview term: PreloadAllModules** — the built-in strategy that preloads every lazy route "as quickly as possible", despite the old name covering [standalone](/interview-question/what-are-standalone-components) <code>loadComponent</code> routes too. Enabled with:

\`\`\`ts
provideRouter(routes, withPreloading(PreloadAllModules))
\`\`\`

📌 **Interview term: withPreloading** — the <code>provideRouter</code> feature that installs a strategy class. In [NgModule](/interview-question/what-are-components-and-modules-in-angular) apps the equivalent is <code>RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })</code>.

## 3. When Code Downloads, Strategy by Strategy

<svg class="iq-diagram" width="100%" viewBox="0 0 720 280" role="img" aria-label="Without preloading the lazy chunk downloads when the user navigates, with preloading it downloads right after the first NavigationEnd">
  <defs>
    <marker id="pl-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="20" y="34">NoPreloading</text>
  <rect class="d-box" x="20" y="50" width="170" height="50" rx="10"/>
  <text class="d-sub" x="105" y="80" text-anchor="middle">first screen shown</text>
  <path class="d-edge" d="M 194 75 L 266 75" marker-end="url(#pl-arrow)"/>
  <rect class="d-box-muted" x="270" y="50" width="170" height="50" rx="10"/>
  <text class="d-sub" x="355" y="80" text-anchor="middle">idle</text>
  <path class="d-edge" d="M 444 75 L 506 75" marker-end="url(#pl-arrow)"/>
  <rect class="d-box-accent" x="510" y="50" width="190" height="50" rx="10"/>
  <text class="d-sub" x="605" y="80" text-anchor="middle">click: download, then show</text>
  <text class="d-text" x="20" y="164">PreloadAllModules</text>
  <rect class="d-box" x="20" y="180" width="170" height="50" rx="10"/>
  <text class="d-sub" x="105" y="210" text-anchor="middle">first screen shown</text>
  <path class="d-edge" d="M 194 205 L 266 205" marker-end="url(#pl-arrow)"/>
  <rect class="d-box-accent" x="270" y="180" width="170" height="50" rx="10"/>
  <text class="d-sub" x="355" y="210" text-anchor="middle">background download</text>
  <path class="d-edge" d="M 444 205 L 506 205" marker-end="url(#pl-arrow)"/>
  <rect class="d-box" x="510" y="180" width="190" height="50" rx="10"/>
  <text class="d-sub" x="605" y="210" text-anchor="middle">click: show immediately</text>
</svg>

The two rows download the same bytes. Preloading only moves the download from "while the user waits after a click" to "while the user is reading the first screen".

## 4. Verified: what each strategy actually does

The example has an eager home page and three lazy routes: a <code>loadComponent</code> route, a <code>loadChildren</code> route, and an admin <code>loadComponent</code> route whose <code>canMatch</code> always returns <code>false</code>. Each loader logs when it is called.

**With <code>withPreloading(PreloadAllModules)</code>:**

\`\`\`
  NavigationStart /
  NavigationEnd   /
  loader(settings) called
  loader(orders) called
  loader(admin) called
[app] RENDERED: Home
navigateByUrl("/settings")
  NavigationStart /settings
  NavigationEnd   /settings
  PAGE: Settings (lazy)
\`\`\`

**Same app with plain <code>provideRouter(routes)</code> (NoPreloading):**

\`\`\`
  NavigationStart /
  NavigationEnd   /
[app] RENDERED: Home
navigateByUrl("/settings")
  NavigationStart /settings
  loader(settings) called
  NavigationEnd   /settings
  PAGE: Settings (lazy)
\`\`\`

**PreloadAllModules again, with <code>canLoad: [() =&gt; true]</code> added to the <code>orders</code> route:**

\`\`\`
  NavigationStart /
  NavigationEnd   /
  loader(settings) called
  loader(admin) called
[app] RENDERED: Home
navigateByUrl("/settings")
  NavigationStart /settings
  NavigationEnd   /settings
  PAGE: Settings (lazy)
\`\`\`

Four facts from these runs:

1. **Preloading starts right after the first <code>NavigationEnd</code>**, not at bootstrap and not during the navigation.
2. **It covers <code>loadComponent</code> and <code>loadChildren</code> alike.** With NoPreloading, the settings loader ran during the click instead.
3. **The admin route was preloaded although its <code>canMatch</code> refuses everyone.** The preloader does not run <code>canMatch</code>; the 22.2.3 <code>RouterPreloader</code> source has no check for it. If some users must not download a route, a custom strategy has to skip it.
4. **Any <code>canLoad</code> guard, even one returning <code>true</code>, stops the preloader from loading that route's children.** The source preloads <code>loadChildren</code> only when <code>route.canLoad === undefined</code>. Since <code>canLoad</code> is deprecated, do not rely on this as a feature.

## 5. Choosing a Strategy

| Strategy | Initial load | First visit to a lazy screen | Extra bandwidth | Fits |
| :--- | :--- | :--- | :--- | :--- |
| <code>NoPreloading</code> (default) | Small | Waits for download | None | Large apps where users touch few areas, or metered connections |
| <code>PreloadAllModules</code> | Small | Usually instant | Everything, once | Small to medium apps where most users visit most areas |
| Custom (flag, delay, hover, role) | Small | Instant for chosen routes | Only what you choose | Most production apps |

Custom strategies are the real-world answer: preload the two areas everyone opens, wait a few seconds before fetching others, and never fetch admin code for normal users. Building one, including the trap where a waiting strategy blocks later preloads, is the subject of [custom preloading strategies](/interview-question/how-do-you-optimize-initial-bundle-size-using-route-preloading-with-custom-strat).

A shape to recognise in an interview:

\`\`\`ts
@Injectable({ providedIn: "root" })
export class FlagPreloading implements PreloadingStrategy {
  preload(route: Route, load: () => Observable<unknown>) {
    return route.data?.["preload"] ? load() : EMPTY;
  }
}
// provideRouter(routes, withPreloading(FlagPreloading))
\`\`\`

## 6. Preloading Next to Other Loading Tools

| Tool | Granularity | Triggered by |
| :--- | :--- | :--- |
| Lazy routes | A screen or feature area | Navigation |
| Preloading strategy | Lazy routes | After NavigationEnd, per your strategy |
| [<code>@defer (prefetch on idle)</code>](/interview-question/what-are-deferrable-views-defer-and-how-do-they-work-in-angular-17) | A block inside one template | The block's prefetch trigger |
| <code>&lt;link rel="modulepreload"&gt;</code> written by [<code>ng build</code>](/interview-question/how-has-the-angular-build-changed-with-esbuild-vite-ng-build-ng-serve) | Initial shared chunks (seen in a CLI 22.2.3 <code>index.html</code>) | The HTML itself |

<code>@defer</code> has its own prefetch triggers for parts of a page; see [defer prefetch strategies](/interview-question/deferrable-views-prefetch-strategies-and-dependency-isolation-with-defer). Preloading strategies only ever deal with routes.

## 7. Common Pitfalls

- **Assuming Angular preloads by default.** It does not; <code>NoPreloading</code> is the default, verified above.
- **Using <code>PreloadAllModules</code> on a huge app.** Every chunk downloads after the first screen, which can cost mobile users a lot of data for screens they never open.
- **Thinking <code>canMatch</code> keeps preloading away.** Verified: a route whose <code>canMatch</code> always refuses was preloaded.
- **Adding <code>canLoad</code> just to stop preloading.** It works by accident and is deprecated; write a strategy that skips the route.
- **Expecting preloading to help the very first screen.** It runs after <code>NavigationEnd</code>, so it only speeds up later navigations.
- **Assuming an exact network benefit without measuring.** The gain depends on chunk size, cache headers and connection; check the Network panel in a real browser.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">"Preloading downloads lazy route code in the background after a navigation finishes, so the first visit to that route does not wait for a download."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Built-ins:</strong> <span style="color:#f0e2c8;">"The default is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NoPreloading</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PreloadAllModules</code> fetches every lazy route, and I enable it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">withPreloading</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">provideRouter</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Custom:</strong> <span style="color:#f0e2c8;">"A class implementing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PreloadingStrategy</code> gets each lazy route and a load function, and returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">load()</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EMPTY</code>, usually based on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">route.data</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Facts I have checked:</strong> <span style="color:#f0e2c8;">"It starts after the first NavigationEnd, covers loadComponent and loadChildren, ignores canMatch, and skips routes that have canLoad."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Choosing:</strong> <span style="color:#f0e2c8;">"PreloadAllModules for small apps where users visit everything, a custom strategy for large apps, and nothing for admin code or metered users."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does preloading slow down the first screen?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It should not, because it starts after NavigationEnd. It does compete for bandwidth with any data requests the first screen makes afterwards, which is one reason to add a delay in a custom strategy.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you avoid preloading admin code for normal users?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A custom strategy that returns EMPTY for routes marked, for example, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">data: { preload: false }</code>, or that checks the user role. canMatch alone does not stop the preloader.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is preloading the same as <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">@defer</code> prefetching?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same idea, different level. Preloading works on lazy routes after navigation; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@defer (prefetch on idle)</code> works on a block of one template.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you check what was preloaded?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In the browser Network panel the chunk requests appear right after the first screen loads. In code, a strategy can log each route it loads, which is how the logs in this answer were produced.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you change the strategy at runtime?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The strategy class is provided once, but it can read a service, for example a signal holding connection quality or user role, each time preload is called.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Preloading** | Downloading lazy route code in the background before it is needed |
| **PreloadingStrategy** | Class whose preload(route, load) decides per route |
| **NoPreloading** | Default strategy; lazy code downloads only on navigation |
| **PreloadAllModules** | Built-in strategy that preloads every lazy route |
| **withPreloading** | provideRouter feature that installs a strategy |
| **EMPTY** | RxJS Observable that completes at once; returned to skip a route |
| **RouterPreloader** | Router service that walks the config after NavigationEnd and asks the strategy |

---
**Conclusion:** Preloading strategies decide which lazy routes the router downloads in the background once a navigation has finished. Angular ships <code>NoPreloading</code> as the default and <code>PreloadAllModules</code> as the eager option, and a custom <code>PreloadingStrategy</code> chooses per route. On Angular 22.2.3, preloading began right after the first <code>NavigationEnd</code>, covered both <code>loadComponent</code> and <code>loadChildren</code>, ignored <code>canMatch</code> and skipped routes with a <code>canLoad</code> guard. Pick a strategy by how many areas your users really visit, and use a custom one whenever some code should be preloaded for some users only.`,
    examples: [
      {
        label: "PreloadAllModules with loader logs, including a canMatch-protected route",
        tech: "angular",
        runnable: false,
        code: `import { ApplicationConfig, Component, inject } from "@angular/core";
import {
  NavigationEnd, NavigationStart, PreloadAllModules, Router, RouterOutlet, Routes,
  provideRouter, withPreloading,
} from "@angular/router";

@Component({ selector: "app-home", template: \`<p>Home</p>\` })
export class HomeComponent {}
@Component({ selector: "app-settings", template: \`<p>Settings (lazy)</p>\` })
export class SettingsComponent {}
@Component({ selector: "app-orders", template: \`<p>Orders (lazy)</p>\` })
export class OrdersComponent {}
@Component({ selector: "app-admin", template: \`<p>Admin (lazy)</p>\` })
export class AdminComponent {}

// Stand-ins for () => import("./settings/settings") etc.
const load = <T>(name: string, value: T) => () => {
  console.log(\`  loader(\${name}) called\`);
  return Promise.resolve(value);
};

export const routes: Routes = [
  { path: "", component: HomeComponent },
  { path: "settings", loadComponent: load("settings", SettingsComponent) },
  { path: "orders", loadChildren: load("orders", [{ path: "", component: OrdersComponent }]) },
  // canMatch says no to everyone here. Preloading downloads it anyway.
  { path: "admin", canMatch: [() => false], loadComponent: load("admin", AdminComponent) },
];

export const appConfig: ApplicationConfig = {
  providers: [provideRouter(routes, withPreloading(PreloadAllModules))],
};

@Component({ selector: "app-root", imports: [RouterOutlet], template: \`<router-outlet />\` })
export class AppComponent {
  readonly router = inject(Router);
  constructor() {
    this.router.events.subscribe((e) => {
      if (e instanceof NavigationStart) console.log(\`  NavigationStart \${e.url}\`);
      if (e instanceof NavigationEnd) console.log(\`  NavigationEnd   \${e.urlAfterRedirects}\`);
    });
  }
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you optimize initial bundle size using Route Preloading with custom strategies?",
    seoDescription:
      "Shrink the Angular initial bundle with lazy routes, then preload chunks with a custom strategy: eager, idle delay, on hover or never, set in route data.",
    description: `**Question presented to candidate:**
"Our initial bundle budget is tight, so every feature is lazy. Product wants the dashboard to open instantly, reports to be ready a few seconds after start-up, and settings only if the user shows interest. Design a custom preloading strategy for that, and explain what it does and does not do to the initial bundle."

**What a strong answer should cover:**
- Lazy routes are what shrink the **initial bundle**; preloading only changes **when** lazy chunks download, never what is in the initial chunk (it adds a little router code).
- A custom strategy is an \`@Injectable\` class implementing **\`PreloadingStrategy.preload(route, load)\`**, registered with **\`withPreloading(MyStrategy)\`**, typically driven by **\`route.data\`** flags.
- Patterns: **eager** (\`return load()\`), **delayed** (\`timer(ms).pipe(mergeMap(load))\`), **on intent** (hover or viewport, via a shared service), **skip** (\`return EMPTY\`) for admin or rarely used routes.
- The router runs one preload pass per \`NavigationEnd\` **in sequence**, so a strategy that **waits indefinitely** (for a hover that never comes) blocks later passes; fire-and-forget and return \`EMPTY\` instead.
- Verify with \`ng build\`: the lazy chunk table, the initial total, and the Network panel in a real browser.

**Clarifying questions expected:**
- "What is the bundle budget, and is it measured raw or compressed?"
- "Do we need to respect data-saver or slow connections?"

**Code / implementation expected:** Yes — a strategy reading \`data.preload\` with eager, idle-delay and hover modes, plus a log of when each loader runs.`,
    answer: `**Target Audience:** Developers responsible for start-up performance in a real Angular app — assumes [lazy loading](/interview-question/how-does-routing-and-lazy-loading-work-in-angular) and the basics of [preloading strategies](/interview-question/what-are-preloading-strategies).
**Difficulty:** Hard

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. The bundle tables in section 3 were produced with <code>ng build</code> on Angular CLI 22.2.3. The strategy logs in sections 5 and 6 come from compiling the example with <code>ngc</code> on Angular 22.2.3, then driving it with <code>navigateByUrl</code> and a real <code>mouseenter</code> event; the millisecond values are from one run and shift slightly between runs. Network throughput was not measured: jsdom has no network.

## 1. Why This Even Matters — A Story First

A small bakery has one oven and a queue at opening time. It bakes bread for the first customers immediately: that is the **initial bundle**, and the smaller it is, the sooner the shop opens. Everything else waits in the fridge.

A good baker does not then bake every cake in the fridge the moment the doors open, and does not wait for each customer to order before starting either. Croissants, which everybody buys, go in right after opening. Birthday cakes go in mid-morning when it is quiet. The fancy tart only goes in when a customer lingers at the display. And the wedding cake for a private order never goes in for the general public at all.

That is a **custom preloading strategy**: same fridge (lazy chunks), but a deliberate plan for what to bake when.

## 2. The Core Idea

📌 **Interview term: Initial bundle** — the JavaScript the browser must download and run before the first screen appears. [<code>ng build</code>](/interview-question/how-has-the-angular-build-changed-with-esbuild-vite-ng-build-ng-serve) lists it under "Initial chunk files" with an "Initial total". Budgets in <code>angular.json</code> warn or fail the build when it grows.

📌 **Interview term: Lazy chunk** — a file the bundler split out because of a dynamic <code>import()</code>, listed under "Lazy chunk files". Lazy routes create them; preloading decides when they download.

📌 **Interview term: Custom preloading strategy** — an injectable class implementing <code>PreloadingStrategy</code>:

\`\`\`ts
abstract class PreloadingStrategy {
  abstract preload(route: Route, fn: () => Observable<any>): Observable<any>;
}
\`\`\`

(the 22.2.3 declaration). The router calls <code>preload</code> for every lazy route that is not loaded yet, after each <code>NavigationEnd</code>. Calling <code>fn()</code> and returning its Observable downloads the route; returning <code>EMPTY</code> (an [Observable](/interview-question/what-is-the-difference-between-observables-and-promises) that completes at once) skips it for this pass.

📌 **Interview term: Route data flag** — static <code>data</code> on a route, such as <code>data: { preload: "idle", delayMs: 3000 }</code>, read by the strategy through <code>route.data</code>. It keeps the policy next to the route it describes.

📌 **Interview term: Preload pass** — one walk of the route config by the router after a <code>NavigationEnd</code>. In the 22.2.3 source the passes are chained with <code>concatMap</code>, so a pass starts only when the previous one has completed. That detail is the heart of section 6.

## 3. Verified: what moves the initial bundle and what does not

One CLI 22.2.3 app with an admin screen ([reactive forms](/interview-question/what-is-the-difference-between-reactive-and-template-driven-forms) plus three pipes) and a small reports area, built three ways:

| Build | Initial total (raw) | Initial (transfer est.) | Lazy chunks |
| :--- | :--- | :--- | :--- |
| Features imported eagerly | 292.94 kB | 78.90 kB | none |
| Lazy routes, no preloading | 258.58 kB | 73.27 kB | admin 36.09 kB, reports-routes 417 bytes |
| Lazy routes + <code>withPreloading(PreloadAllModules)</code> | 260.46 kB | 73.59 kB | admin 36.09 kB, reports-routes 417 bytes |

- **Lazy routing is what shrank the initial bundle** (about 34 kB raw here).
- **Preloading did not put anything back**: the lazy chunk table is identical. It added about 1.9 kB raw to the initial total, which is the router preloader code itself.
- **The user still downloads the admin chunk with <code>PreloadAllModules</code>**, just later. Whether that is fine depends on who the users are, which is why a custom strategy exists.

## 4. Designing the Strategy

<svg class="iq-diagram" width="100%" viewBox="0 0 720 320" role="img" aria-label="After NavigationEnd the strategy reads route data: eager loads now, idle loads after a delay, hover loads when the link is hovered, no flag means load only on navigation">
  <defs>
    <marker id="cp-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="125" width="150" height="70" rx="10"/>
  <text class="d-text" x="95" y="155" text-anchor="middle">NavigationEnd</text>
  <text class="d-sub" x="95" y="177" text-anchor="middle">preload pass</text>
  <path class="d-edge" d="M 174 160 L 226 160" marker-end="url(#cp-arrow)"/>
  <rect class="d-box-accent" x="230" y="115" width="170" height="90" rx="12"/>
  <text class="d-text d-accent" x="315" y="152" text-anchor="middle">strategy reads</text>
  <text class="d-text d-accent" x="315" y="176" text-anchor="middle">route.data</text>
  <path class="d-edge" d="M 404 130 L 486 50" marker-end="url(#cp-arrow)"/>
  <path class="d-edge" d="M 404 145 L 486 125" marker-end="url(#cp-arrow)"/>
  <path class="d-edge" d="M 404 175 L 486 200" marker-end="url(#cp-arrow)"/>
  <path class="d-edge-dashed" d="M 404 190 L 486 275" marker-end="url(#cp-arrow)"/>
  <rect class="d-box" x="490" y="22" width="210" height="50" rx="10"/>
  <text class="d-sub" x="595" y="52" text-anchor="middle">eager: load now</text>
  <rect class="d-box" x="490" y="100" width="210" height="50" rx="10"/>
  <text class="d-sub" x="595" y="130" text-anchor="middle">idle: load after delayMs</text>
  <rect class="d-box" x="490" y="176" width="210" height="50" rx="10"/>
  <text class="d-sub" x="595" y="206" text-anchor="middle">hover: load on mouseenter</text>
  <rect class="d-box-muted" x="490" y="250" width="210" height="50" rx="10"/>
  <text class="d-sub" x="595" y="280" text-anchor="middle">no flag: only on navigation</text>
</svg>

The full strategy is the example at the bottom. Its core:

\`\`\`ts
preload(route: Route, load: () => Observable<unknown>): Observable<unknown> {
  const mode = route.data?.["preload"] as PreloadMode | undefined;
  if (mode === "eager") return load();
  if (mode === "idle") return timer(route.data?.["delayMs"] ?? 0).pipe(mergeMap(() => load()));
  if (mode === "hover") {
    this.intent.hovered.pipe(filter((p) => p === route.path), take(1), mergeMap(() => load())).subscribe();
    return EMPTY;
  }
  return EMPTY;
}
\`\`\`

A shared <code>PreloadIntent</code> [service](/interview-question/what-is-a-service-and-why-use-it) carries the hover event (an RxJS <code>Subject</code>): the link calls <code>intent.hovered.next("settings")</code> on <code>mouseenter</code>. The same service could be fed by an <code>IntersectionObserver</code> to preload when a link scrolls into view; that browser API is not available in jsdom, so that variant was not run here.

## 5. Verified: each mode fires at the right moment

Routes: <code>dashboard</code> (eager), <code>reports</code> (idle, 100 ms), <code>settings</code> (hover), <code>audit-log</code> (no flag). The driver waits 150 ms, hovers the Settings link, then navigates to the audit log:

\`\`\`
  [54ms] NavigationEnd /
  strategy asked about "dashboard" (mode: eager)
  [55ms] loader(dashboard) called
  strategy asked about "reports" (mode: idle)
  strategy asked about "settings" (mode: hover)
  strategy asked about "audit-log" (mode: none)
[app] RENDERED: Settingspage
  [155ms] loader(reports) called
mouseenter on the Settings link
  [232ms] loader(settings) called
navigateByUrl("/audit-log")
  [258ms] loader(audit-log) called
  [265ms] NavigationEnd /audit-log
\`\`\`

- **eager**: loaded within a millisecond of the first <code>NavigationEnd</code>.
- **idle**: loaded about 100 ms later, as configured; in production you would use seconds, not milliseconds.
- **hover**: loaded only when the <code>mouseenter</code> fired, typically a few hundred milliseconds before the click, which is often enough for a small chunk.
- **no flag**: never preloaded; the audit-log loader ran during its own navigation, exactly like plain lazy loading.

The <code>[app] RENDERED</code> line is the root element text (the link and the home page run together).

## 6. Verified: the trap of a strategy that waits

The tempting way to write hover mode is to return the waiting Observable directly:

\`\`\`ts
if (mode === "hover")
  return this.intent.hovered.pipe(filter((p) => p === route.path), take(1), mergeMap(() => load()));
\`\`\`

That Observable does not complete until the user hovers. Because the router chains preload passes with <code>concatMap</code>, the **whole pass** stays open, and the pass for the next navigation cannot start. Run with a second navigation before the hover:

\`\`\`
  [56ms] NavigationEnd /
  strategy asked about "dashboard" (mode: eager)
  [57ms] loader(dashboard) called
  strategy asked about "reports" (mode: idle)
  strategy asked about "settings" (mode: hover)
  strategy asked about "audit-log" (mode: none)
[app] RENDERED: Settingspage
  [159ms] loader(reports) called
navigateByUrl("/dashboard") (second NavigationEnd)
  [259ms] NavigationEnd /dashboard
mouseenter on the Settings link
  [282ms] loader(settings) called
  strategy asked about "audit-log" (mode: none)
\`\`\`

After <code>NavigationEnd /dashboard</code> the strategy was **not asked about anything**: the second pass only ran ("asked about audit-log") after the hover finally completed the first one. In a real app that means routes discovered later (for example lazy children of a feature you just opened) are not preloaded until somebody happens to hover that one link.

The fire-and-forget version from section 4 returns <code>EMPTY</code> immediately, so each pass completes at once. Same driver:

\`\`\`
  [51ms] NavigationEnd /
  strategy asked about "dashboard" (mode: eager)
  [52ms] loader(dashboard) called
  strategy asked about "reports" (mode: idle)
  strategy asked about "settings" (mode: hover)
  strategy asked about "audit-log" (mode: none)
[app] RENDERED: Settingspage
  [153ms] loader(reports) called
navigateByUrl("/dashboard") (second NavigationEnd)
  [234ms] NavigationEnd /dashboard
  strategy asked about "settings" (mode: hover)
  strategy asked about "audit-log" (mode: none)
mouseenter on the Settings link
  [258ms] loader(settings) called
\`\`\`

Now the second <code>NavigationEnd</code> triggers a new pass right away. The same rule applies to any long wait: a delay of seconds is fine (it completes), an open-ended wait is not.

## 7. Production Checklist

| Concern | What to do |
| :--- | :--- |
| Admin or role-restricted areas | Skip them (<code>return EMPTY</code>) unless the user has the role; the preloader does not run <code>canMatch</code> |
| Slow or metered connections | Read <code>navigator.connection</code> (where the browser supports it) in the strategy and skip non-eager routes; not testable in jsdom |
| Competing with first-screen data | Use the idle mode with a delay of a few seconds |
| Duplicate [subscriptions](/interview-question/how-do-you-avoid-memory-leaks-from-subscriptions) in hover mode | Each pass re-subscribes for routes not yet loaded; <code>take(1)</code> keeps each short-lived, and the router de-duplicates in-flight loads of the same route (in the fixed run in section 6 two passes had subscribed for settings, yet only one <code>loader(settings) called</code> was printed) |
| Proving it works | <code>ng build</code> for the chunk table and budgets, the browser Network panel for timing |

For the template-level equivalent of "preload on hover", see the <code>prefetch on hover</code> trigger in [defer prefetch strategies](/interview-question/deferrable-views-prefetch-strategies-and-dependency-isolation-with-defer).

## 8. Common Pitfalls

- **Expecting preloading to shrink the initial bundle.** It does not; verified, it added about 1.9 kB. Only lazy routes, [<code>@defer</code>](/interview-question/what-are-deferrable-views-defer-and-how-do-they-work-in-angular-17) and removing eager imports shrink it.
- **Returning an Observable that waits indefinitely.** Verified above: it blocks every later preload pass.
- **Subscribing to <code>load()</code> yourself and also returning it.** The router subscribes to what you return, so you start the work twice. Either return it (eager, idle) or subscribe and return <code>EMPTY</code> (hover), not both.
- **Reading <code>route.data</code> from the wrong level.** Put the flag on the route that has <code>loadComponent</code> / <code>loadChildren</code>, because that is the <code>route</code> the strategy receives.
- **Forgetting to register the class.** It needs <code>@Injectable</code> and <code>withPreloading(SelectivePreloading)</code>; listing it in <code>providers</code> alone does nothing.
- **Preloading everything for everyone.** Bandwidth is a cost to the user; preload what most users will open.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Separate the two levers:</strong> <span style="color:#f0e2c8;">"Lazy routes and @defer shrink the initial bundle. Preloading only changes when lazy chunks download; in my build it added about 2 kB of router code and moved nothing back."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The strategy:</strong> <span style="color:#f0e2c8;">"A custom strategy implements <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PreloadingStrategy.preload(route, load)</code>, is registered with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">withPreloading</code>, and decides per route from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">route.data</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The modes:</strong> <span style="color:#f0e2c8;">"Eager returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">load()</code>, idle waits with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">timer</code> then loads, hover listens to a shared service, and anything sensitive returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EMPTY</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The trap:</strong> <span style="color:#f0e2c8;">"The router runs preload passes one after another, so preload must return quickly. An Observable that waits for a hover blocks every later pass, so I fire and forget and return EMPTY."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Verification:</strong> <span style="color:#f0e2c8;">"ng build for the chunk table and budgets, a log or the Network panel to see when each chunk is fetched."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you preload based on connection quality?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Read <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">navigator.connection.saveData</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">effectiveType</code> in the strategy where the browser supports it, and return EMPTY for non-essential routes on slow or data-saver connections. Feature-detect, because not every browser has it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you preload when a link becomes visible?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A directive on the link uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">IntersectionObserver</code> and calls a service; the strategy subscribes to that service, exactly like the hover mode, and still returns EMPTY right away.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does the strategy run again after the first navigation?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, after every NavigationEnd it is asked about each lazy route that is not loaded yet, including lazy children that were just discovered, as long as the previous pass has finished.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do budgets fit in?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">angular.json</code> budgets on the initial bundle fail the build when someone accidentally imports a lazy feature eagerly. Preloading does not affect them, which is exactly why lazy loading is the lever for the budget.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you ever use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">PreloadAllModules</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, for small apps where users visit most areas and nothing is role restricted. Beyond that a data-driven custom strategy is easier to reason about.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Initial bundle** | Code needed before the first screen; listed as Initial total by ng build |
| **Lazy chunk** | Code split out by a dynamic import, downloaded later |
| **Custom preloading strategy** | Class whose preload(route, load) decides what to fetch and when |
| **Route data flag** | Static data on a route that the strategy reads |
| **Preload pass** | One walk of the routes after NavigationEnd; passes run one after another |
| **Fire and forget** | Start the load in a subscription and return EMPTY so the pass completes |
| **Bundle budget** | angular.json limit that warns or fails the build when bundles grow |

---
**Conclusion:** Lazy routes shrink the initial bundle; a custom preloading strategy decides when the resulting chunks download. In a CLI 22.2.3 build, lazy routes took about 34 kB off the initial total and adding preloading changed only about 1.9 kB of router code. The verified strategy loaded eager routes right after the first <code>NavigationEnd</code>, idle ones after their delay, hover ones on <code>mouseenter</code>, and left unflagged routes alone, while the waiting version of hover mode blocked every later preload pass because the router runs passes in sequence. Drive the policy from <code>route.data</code>, return quickly from <code>preload</code>, skip code most users should not fetch, and measure with <code>ng build</code> and the Network panel.`,
    examples: [
      {
        label: "Custom PreloadingStrategy with eager, idle and hover modes driven by route data",
        tech: "angular",
        runnable: false,
        code: `import { ApplicationConfig, Component, Injectable, inject } from "@angular/core";
import {
  NavigationEnd, PreloadingStrategy, Route, Router, RouterLink, RouterOutlet, Routes,
  provideRouter, withPreloading,
} from "@angular/router";
import { EMPTY, Observable, Subject, filter, mergeMap, take, timer } from "rxjs";

// Each lazy route says how eagerly it should be fetched:
//   data.preload = "eager" -> right after the first navigation
//   data.preload = "idle"  -> after data.delayMs
//   data.preload = "hover" -> when the user points at a link to it
//   no data                -> only when the user navigates there (normal lazy loading)
type PreloadMode = "eager" | "idle" | "hover";

@Injectable({ providedIn: "root" })
export class PreloadIntent {
  readonly hovered = new Subject<string>();
}

@Injectable({ providedIn: "root" })
export class SelectivePreloading implements PreloadingStrategy {
  private intent = inject(PreloadIntent);

  preload(route: Route, load: () => Observable<unknown>): Observable<unknown> {
    const mode = route.data?.["preload"] as PreloadMode | undefined;
    console.log(\`  strategy asked about "\${route.path}" (mode: \${mode ?? "none"})\`);
    if (mode === "eager") return load();
    if (mode === "idle") return timer(route.data?.["delayMs"] ?? 0).pipe(mergeMap(() => load()));
    if (mode === "hover") {
      // Fire and forget: return EMPTY so this route does not hold up the
      // router's preload pass while it waits for a hover that may never come.
      this.intent.hovered.pipe(filter((p) => p === route.path), take(1), mergeMap(() => load())).subscribe();
      return EMPTY;
    }
    return EMPTY; // not preloaded
  }
}

@Component({ selector: "app-page", template: \`<p>{{ title }}</p>\` })
export class PageComponent { title = "page"; }

const lazy = (name: string) => () => {
  console.log(\`  [\${Math.round(performance.now() - t0)}ms] loader(\${name}) called\`);
  return Promise.resolve(PageComponent);
};
const t0 = performance.now();

export const routes: Routes = [
  { path: "", component: PageComponent },
  { path: "dashboard", loadComponent: lazy("dashboard"), data: { preload: "eager" } },
  { path: "reports", loadComponent: lazy("reports"), data: { preload: "idle", delayMs: 100 } },
  { path: "settings", loadComponent: lazy("settings"), data: { preload: "hover" } },
  { path: "audit-log", loadComponent: lazy("audit-log") },
];

export const appConfig: ApplicationConfig = {
  providers: [provideRouter(routes, withPreloading(SelectivePreloading))],
};

@Component({
  selector: "app-root",
  imports: [RouterOutlet, RouterLink],
  template: \`
    <a routerLink="/settings" (mouseenter)="intent.hovered.next('settings')">Settings</a>
    <router-outlet />
  \`,
})
export class AppComponent {
  readonly router = inject(Router);
  readonly intent = inject(PreloadIntent);
  constructor() {
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe((e) =>
      console.log(\`  [\${Math.round(performance.now() - t0)}ms] NavigationEnd \${e.urlAfterRedirects}\`));
  }
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you implement custom routing strategies by extending RouteReuseStrategy?",
    seoDescription:
      "Extend BaseRouteReuseStrategy to keep chosen Angular route components alive across navigations: shouldDetach, store, shouldAttach, retrieve and the risks.",
    description: `**Question presented to candidate:**
"On our product list, users type a search, scroll, open a product, and press Back. The list rebuilds from scratch and their search is gone. How would you keep that list alive across navigations with a custom \`RouteReuseStrategy\`, and what are the risks?"

**What a strong answer should cover:**
- \`RouteReuseStrategy\` has five hooks: **\`shouldDetach\`** / **\`store\`** when leaving a route, **\`shouldAttach\`** / **\`retrieve\`** when entering one, and **\`shouldReuseRoute\`** for staying on the same config.
- The default (\`BaseRouteReuseStrategy\`) **reuses the live instance only when the route config is the same** (for example \`/products/7\` to \`/products/8\`) and never stores detached routes.
- A custom strategy, usually **extending \`BaseRouteReuseStrategy\`** and provided with \`{ provide: RouteReuseStrategy, useClass: ... }\`, stores a \`DetachedRouteHandle\` for chosen routes so the **same component instance**, DOM and state come back.
- A detached component is **not destroyed** and gets no lifecycle hook on return; use the outlet's **\`(attach)\` / \`(detach)\`** events.
- Risks: **memory** (stored trees live until evicted, \`destroyDetachedRouteHandle\` in 22.2), **stale data**, and **cache keys** that collide or never match.

**Clarifying questions expected:**
- "Should the list also keep data fresh when the user returns, or show exactly what they left?"
- "How many screens might be kept alive at once?"

**Code / implementation expected:** Yes — a keep-alive strategy for routes flagged in \`data\`, with constructor and destroy counts across navigations.`,
    answer: `**Target Audience:** Developers comfortable with routing who need finer control over component lifetimes — assumes you know [routing basics](/interview-question/how-does-routing-and-lazy-loading-work-in-angular) and [lifecycle hooks](/interview-question/what-are-angular-lifecycle-hooks).
**Difficulty:** Hard

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. Every constructor, destroy, store and outlet-event line in sections 5 and 6 was printed by the compiled example (Angular 22.2.3, <code>ngc</code> with strict templates) while it was driven with <code>navigateByUrl</code> and a real input event. Method signatures and the 22.2 additions were read from the <code>@angular/router</code> 22.2.3 typings.

## 1. Why This Even Matters — A Story First

In a library reading room, you are halfway through a stack of books with sticky notes everywhere when you step out to the reference desk. A strict librarian clears your table the moment you stand up and reshelves everything. When you come back, you start again.

A kind librarian puts a "reserved" card on your table instead. Your books, your notes, even the page you were on are still there when you return. The cost is that the table is not available for anyone else, and if everyone reserved tables, the room would fill up.

Angular's router, by default, is the strict librarian: when you navigate away from a component, it is destroyed. <code>RouteReuseStrategy</code> lets you be the kind librarian for chosen routes, with the same trade-off.

## 2. The Core Idea

📌 **Interview term: RouteReuseStrategy** — an abstract class the router consults on every navigation. You replace it with <code>{ provide: RouteReuseStrategy, useClass: KeepAliveStrategy }</code> in the app providers ([useClass providers](/interview-question/what-is-the-difference-between-useclass-usevalue-usefactory-and-useexisting)). (Setting <code>router.routeReuseStrategy</code> directly is <code>@deprecated</code> in 22.2.3: "Configure using <code>providers</code> instead".)

📌 **Interview term: DetachedRouteHandle** — an opaque object representing a detached component tree: the component instance, its DOM, its children. Storing it keeps the tree alive; giving it back to the router re-inserts it.

📌 **Interview term: BaseRouteReuseStrategy** — the strategy Angular uses by default. Per the typings it "only reuses routes when the matched router configs are identical" and "does not store any routes for later reuse". Extending it means you only override what you change.

The five hooks, in the order the router uses them:

| Hook | Called when | Default answer | Keep-alive answer |
| :--- | :--- | :--- | :--- |
| <code>shouldReuseRoute(future, curr)</code> | Every navigation, for each level | <code>true</code> if same route config | Usually unchanged |
| <code>shouldDetach(route)</code> | Leaving a route | <code>false</code> (destroy it) | <code>true</code> for flagged routes |
| <code>store(route, handle)</code> | Right after a detach, and with <code>null</code> after a re-attach | No-op | Save or delete the handle |
| <code>shouldAttach(route)</code> | Entering a route | <code>false</code> | <code>true</code> if a handle is stored |
| <code>retrieve(route)</code> | After <code>shouldAttach</code> said yes | <code>null</code> | The stored handle |

📌 **Interview term: Component reuse vs. detach/attach** — two different things. **Reuse** (<code>shouldReuseRoute</code>) keeps the live instance while staying on the same route config, so only its parameters change, see [reading route parameters](/interview-question/how-do-you-read-route-parameters). **Detach/attach** takes a tree off the screen, keeps it in your storage, and puts it back on a later visit.

## 3. The Lifecycle of a Kept-Alive Route

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="Leaving a flagged route: shouldDetach true, store the handle. Returning: shouldAttach true, retrieve the handle, the same instance is re-inserted">
  <defs>
    <marker id="rr-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="20" y="30">Leaving /products</text>
  <rect class="d-box" x="20" y="45" width="190" height="56" rx="10"/>
  <text class="d-sub" x="115" y="78" text-anchor="middle">shouldDetach: true</text>
  <path class="d-edge" d="M 214 73 L 266 73" marker-end="url(#rr-arrow)"/>
  <rect class="d-box" x="270" y="45" width="190" height="56" rx="10"/>
  <text class="d-sub" x="365" y="78" text-anchor="middle">store(route, handle)</text>
  <path class="d-edge-accent" d="M 464 73 L 516 73" marker-end="url(#rr-arrow)"/>
  <rect class="d-box-accent" x="520" y="45" width="180" height="56" rx="10"/>
  <text class="d-text d-accent" x="610" y="78" text-anchor="middle">kept in a Map</text>
  <text class="d-text" x="20" y="170">Returning to /products</text>
  <rect class="d-box" x="20" y="185" width="190" height="56" rx="10"/>
  <text class="d-sub" x="115" y="218" text-anchor="middle">shouldAttach: true</text>
  <path class="d-edge" d="M 214 213 L 266 213" marker-end="url(#rr-arrow)"/>
  <rect class="d-box" x="270" y="185" width="190" height="56" rx="10"/>
  <text class="d-sub" x="365" y="218" text-anchor="middle">retrieve(route)</text>
  <path class="d-edge-accent" d="M 464 213 L 516 213" marker-end="url(#rr-arrow)"/>
  <rect class="d-box-accent" x="520" y="185" width="180" height="56" rx="10"/>
  <text class="d-text d-accent" x="610" y="218" text-anchor="middle">same instance back</text>
  <path class="d-edge-dashed" d="M 610 105 L 610 181" marker-end="url(#rr-arrow)"/>
</svg>

No constructor and no <code>ngOnInit</code> run on the way back, and no <code>ngOnDestroy</code> ran on the way out. The component simply left the DOM and returned.

## 4. The Strategy

\`\`\`ts
@Injectable()
export class KeepAliveStrategy extends BaseRouteReuseStrategy {
  private stored = new Map<string, DetachedRouteHandle>();
  private key(route: ActivatedRouteSnapshot) {
    return route.pathFromRoot.map((r) => r.routeConfig?.path ?? "").join("/");
  }
  override shouldDetach(route: ActivatedRouteSnapshot) { return route.data["keepAlive"] === true; }
  override store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle | null) {
    if (handle) this.stored.set(this.key(route), handle); else this.stored.delete(this.key(route));
  }
  override shouldAttach(route: ActivatedRouteSnapshot) { return this.stored.has(this.key(route)); }
  override retrieve(route: ActivatedRouteSnapshot) { return this.stored.get(this.key(route)) ?? null; }
}
\`\`\`

Flag a route with <code>data: { keepAlive: true }</code> and provide the class. The **cache key** is the most important design decision: this one uses the route config path from the root (<code>/products</code>), so every visit to the list shares one stored tree. Keying by the actual URL instead (<code>route.url</code> plus parameters) would keep one tree per URL.

## 5. Verified: keep-alive versus the default

The list component counts constructions and destructions and holds a search [signal](/interview-question/what-are-angular-signals) bound to an input. The driver opens the list, types "lamp", opens product 7, then product 8, then goes back to the list.

**With <code>KeepAliveStrategy</code>:**

\`\`\`
[app] RENDERED: 
navigateByUrl("/products")
  ListComponent constructor (#1)
  PAGE: list #1 search=""
typed "lamp" -> PAGE: list #1 search="lamp"
navigateByUrl("/products/7")
  outlet (detach) event
  store("/products", handle)
  DetailComponent constructor (#1)
  PAGE: detail #1
navigateByUrl("/products/8")
  PAGE: detail #1
navigateByUrl("/products")
  DetailComponent destroyed (#1)
  store("/products", null)
  outlet (attach) event
  PAGE: list #1 search="lamp"
  ListComponent destroyed (#1)
\`\`\`

**Same app with the default strategy (provider removed):**

\`\`\`
[app] RENDERED: 
navigateByUrl("/products")
  ListComponent constructor (#1)
  PAGE: list #1 search=""
typed "lamp" -> PAGE: list #1 search="lamp"
navigateByUrl("/products/7")
  ListComponent destroyed (#1)
  DetailComponent constructor (#1)
  PAGE: detail #1
navigateByUrl("/products/8")
  PAGE: detail #1
navigateByUrl("/products")
  DetailComponent destroyed (#1)
  ListComponent constructor (#2)
  PAGE: list #2 search=""
  ListComponent destroyed (#2)
\`\`\`

| | Keep-alive | Default |
| :--- | :--- | :--- |
| List constructed | Once (#1) | Twice (#1, #2) |
| List destroyed on leaving | No, detached and stored | Yes |
| Search after coming back | <code>"lamp"</code> | <code>""</code> |
| Detail for /products/7 then /8 | One instance (#1) reused | One instance (#1) reused |

Details worth quoting:

- **<code>(detach)</code> fired before <code>store</code>**, and on return the router called **<code>store(..., null)</code> before <code>(attach)</code>**: the handle is handed back and the stored entry erased, matching the typings ("Storing a <code>null</code> value should erase the previously stored value").
- **The detail component was reused between ids** in both runs. That is <code>shouldReuseRoute</code> from <code>BaseRouteReuseStrategy</code>, not the keep-alive logic.
- **The final "ListComponent destroyed (#1)"** comes from the test tearing down the app.

## 6. Verified: the other two levers

**Force a fresh component per id.** Overriding <code>shouldReuseRoute</code> to also compare parameters:

\`\`\`ts
override shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot) {
  return future.routeConfig === curr.routeConfig && JSON.stringify(future.params) === JSON.stringify(curr.params);
}
\`\`\`

changed the <code>/products/7</code> to <code>/products/8</code> step to:

\`\`\`
navigateByUrl("/products/8")
  DetailComponent destroyed (#1)
  DetailComponent constructor (#2)
\`\`\`

Useful when a component is hard to make parameter-aware, at the cost of rebuilding it. The typings add a warning: recreating a component this way "does not automatically rerun guards or resolvers"; that is still governed by <code>runGuardsAndResolvers</code> (see [route resolvers](/interview-question/what-is-a-route-resolver-and-when-is-it-useful)).

**Evict a stored tree.** Angular 22.2 adds <code>destroyDetachedRouteHandle(handle)</code> (<code>@publicApi 22.2</code> in the typings) for a strategy that drops a handle. An <code>evictAll()</code> method calling it for each stored handle, invoked while the user was on the detail page:

\`\`\`
[app] RENDERED: 
  ListComponent constructor (#1)
  outlet (detach) event
  store("/products", handle)
  DetailComponent constructor (#1)
evictAll()
  ListComponent destroyed (#1)
  evicted
  DetailComponent destroyed (#1)
  ListComponent constructor (#2)
  ListComponent destroyed (#2)
\`\`\`

The detached list was destroyed immediately (<code>ngOnDestroy</code> ran), and the next visit built list #2. Without that call, dropping the handle from your <code>Map</code> just leaks the component: nothing destroys it. 22.2 also adds <code>withAutoCleanupInjectors()</code> together with optional <code>shouldDestroyInjector</code> and <code>retrieveStoredRouteHandles</code> hooks, for cleaning up route environment injectors; that feature was not exercised here.

## 7. Reacting to Being Re-attached

A re-attached component does not get <code>ngOnInit</code>. If it should refresh data on return, listen to the outlet:

\`\`\`html
<router-outlet (attach)="onAttach($event)" (detach)="onDetach($event)" />
\`\`\`

Both events emit the component instance (the 22.2.3 <code>RouterOutlet</code> source calls <code>attachEvents.emit(ref.instance)</code>), so the host can call something like <code>list.refresh()</code>. Alternatively the component can watch <code>Router.events</code> for a <code>NavigationEnd</code> to its own URL. Data freshness is a product decision: "exactly as you left it" and "same scroll, fresh prices" are both valid.

## 8. Common Pitfalls

- **Unbounded storage.** Every stored handle is a live component tree with its DOM and [subscriptions](/interview-question/how-do-you-avoid-memory-leaks-from-subscriptions). Cap the number kept (an LRU of a few entries) and evict with <code>destroyDetachedRouteHandle</code>.
- **Wrong cache key.** <code>route.routeConfig.path</code> alone collides between child routes with the same path under different parents; a URL-based key never matches if query parameters vary. Decide deliberately.
- **Flagging the wrong level.** A handle covers the whole subtree under that route, children included, so put the flag on the top route of the part you want to keep.
- **Expecting <code>ngOnInit</code> on return.** It does not run; use <code>(attach)</code>.
- **Keeping sensitive screens alive across logout.** Clear and destroy all stored handles when the user signs out.
- **Confusing reuse with keep-alive.** <code>/products/7</code> to <code>/products/8</code> reuses the instance by default; that has nothing to do with <code>shouldDetach</code>.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What it is:</strong> <span style="color:#f0e2c8;">"RouteReuseStrategy is the class the router asks on every navigation whether to reuse, keep or rebuild route components. I replace it with a provider, usually extending BaseRouteReuseStrategy."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The hooks:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shouldDetach</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">store</code> run when leaving a route, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shouldAttach</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">retrieve</code> when entering one, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shouldReuseRoute</code> decides about staying on the same config."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Keep-alive:</strong> <span style="color:#f0e2c8;">"For routes flagged in data I return true from shouldDetach and keep the DetachedRouteHandle in a Map. Coming back, the same instance returns, which I verified with a constructor count of one."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Lifecycle:</strong> <span style="color:#f0e2c8;">"A detached component is not destroyed and gets no ngOnInit on return, so I use the outlet attach event to refresh if needed."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Risks:</strong> <span style="color:#f0e2c8;">"Memory and staleness: I cap the cache, evict with destroyDetachedRouteHandle, choose the cache key carefully and clear everything on logout."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does the default strategy do?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">BaseRouteReuseStrategy reuses the live instance only when the route config is identical, for example <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/products/7</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/products/8</code>, and never stores detached routes, so leaving a route destroys it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you force a new component for each id?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Override <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shouldReuseRoute</code> to also compare params. Then a parameter change destroys and recreates the component; guards and resolvers still follow runGuardsAndResolvers.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you free memory from stored routes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Delete the entry and call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">destroyDetachedRouteHandle(handle)</code>, added in 22.2, which runs ngOnDestroy for that tree. Just deleting from the Map leaks it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you choose the cache key?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">By what should count as the same screen: the config path from the root for one shared list, or the URL including params for one tree per record. Route config path alone can collide across parents.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is there a simpler way to keep list state?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Often, yes: keep the search and scroll position in a service or the URL query params and rebuild the component. Reach for a reuse strategy when rebuilding is genuinely expensive, like a big grid or a map.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **RouteReuseStrategy** | Class the router asks whether to reuse, keep or rebuild route components |
| **BaseRouteReuseStrategy** | The default: reuse on same config, never store |
| **DetachedRouteHandle** | Opaque handle to a detached component tree |
| **shouldDetach / store** | Decide to keep a route being left, and save its handle |
| **shouldAttach / retrieve** | Decide to restore a route being entered, and return its handle |
| **shouldReuseRoute** | Keep the live instance while staying on the same config |
| **destroyDetachedRouteHandle** | 22.2 function that destroys a stored tree |
| **(attach) / (detach)** | Router outlet events for re-inserted and removed trees |

---
**Conclusion:** <code>RouteReuseStrategy</code> lets you decide, per route, whether a component tree is destroyed, reused or kept for later. Extending <code>BaseRouteReuseStrategy</code> and overriding <code>shouldDetach</code>, <code>store</code>, <code>shouldAttach</code> and <code>retrieve</code> gave, on Angular 22.2.3, one list instance across a round trip with the typed search intact, against two instances and a lost search with the default strategy. <code>shouldReuseRoute</code> is the separate lever for same-config navigations, and the new <code>destroyDetachedRouteHandle</code> is how a strategy frees what it stored. Keep the cache small and keyed deliberately, refresh on <code>(attach)</code> when data can go stale, and clear everything on logout.`,
    examples: [
      {
        label: "Keep-alive RouteReuseStrategy for routes flagged with data.keepAlive",
        tech: "angular",
        runnable: false,
        code: `import { ApplicationConfig, Component, Injectable, OnDestroy, inject, signal } from "@angular/core";
import {
  ActivatedRouteSnapshot, BaseRouteReuseStrategy, DetachedRouteHandle, Router, RouteReuseStrategy,
  RouterOutlet, provideRouter,
} from "@angular/router";

let listCreated = 0;
let detailCreated = 0;

@Component({
  selector: "app-list",
  template: \`<input [value]="search()" (input)="search.set($any($event.target).value)" /><p>list #{{ id }} search="{{ search() }}"</p>\`,
})
export class ListComponent implements OnDestroy {
  id = ++listCreated;
  search = signal("");
  constructor() { console.log(\`  ListComponent constructor (#\${this.id})\`); }
  ngOnDestroy() { console.log(\`  ListComponent destroyed (#\${this.id})\`); }
}

@Component({ selector: "app-detail", template: \`<p>detail #{{ id }}</p>\` })
export class DetailComponent implements OnDestroy {
  id = ++detailCreated;
  constructor() { console.log(\`  DetailComponent constructor (#\${this.id})\`); }
  ngOnDestroy() { console.log(\`  DetailComponent destroyed (#\${this.id})\`); }
}

// Keep-alive for routes marked data: { keepAlive: true }. Everything else
// behaves exactly like the default (BaseRouteReuseStrategy).
@Injectable()
export class KeepAliveStrategy extends BaseRouteReuseStrategy {
  private stored = new Map<string, DetachedRouteHandle>();
  private key(route: ActivatedRouteSnapshot) {
    return route.pathFromRoot.map((r) => r.routeConfig?.path ?? "").join("/");
  }

  // Leaving a route: should its component tree be kept instead of destroyed?
  override shouldDetach(route: ActivatedRouteSnapshot) {
    return route.data["keepAlive"] === true;
  }
  override store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle | null) {
    console.log(\`  store("\${this.key(route)}", \${handle ? "handle" : "null"})\`);
    if (handle) this.stored.set(this.key(route), handle);
    else this.stored.delete(this.key(route));
  }
  // Entering a route: do we have a kept tree to put back?
  override shouldAttach(route: ActivatedRouteSnapshot) {
    return this.stored.has(this.key(route));
  }
  override retrieve(route: ActivatedRouteSnapshot) {
    return this.stored.get(this.key(route)) ?? null;
  }
  // shouldReuseRoute is inherited: same route config means reuse the live instance.
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter([
      { path: "products", component: ListComponent, data: { keepAlive: true } },
      { path: "products/:id", component: DetailComponent },
    ]),
    { provide: RouteReuseStrategy, useClass: KeepAliveStrategy },
  ],
};

@Component({
  selector: "app-root",
  imports: [RouterOutlet],
  template: \`<router-outlet (attach)="log('attach')" (detach)="log('detach')" />\`,
})
export class AppComponent {
  readonly router = inject(Router);
  log(e: string) { console.log(\`  outlet (\${e}) event\`); }
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is an HTTP interceptor?",
    seoDescription:
      "An Angular HTTP interceptor is middleware for every HttpClient request and response: functional interceptors, cloning requests, and the order they run in.",
    description: `**Question presented to candidate:**
"Every request from our Angular app needs an auth header, and we want to log how long each API call takes, without touching the forty services that call \`HttpClient\`. What is an HTTP interceptor and how would you use one here?"

**What a strong answer should cover:**
- An **interceptor** is middleware in \`HttpClient\`'s pipeline: it sees every outgoing \`HttpRequest\` and every incoming \`HttpEvent\`, and can change, replace or short-circuit either.
- Modern form: an **\`HttpInterceptorFn\`** \`(req, next) => next(req)\`, registered with **\`provideHttpClient(withInterceptors([...]))\`**; it runs in an injection context, so \`inject()\` works.
- Requests are **immutable**: change them with \`req.clone({ setHeaders: ... })\`.
- **Order:** requests flow through interceptors in array order, responses come back in **reverse** order; an interceptor that does not call \`next\` ends the chain (fake backends, caches).
- Legacy class interceptors (\`HttpInterceptor\` + \`HTTP_INTERCEPTORS\`) need **\`withInterceptorsFromDi()\`**; both kinds can coexist, ordered by where the features are listed.
- Only requests made with **\`HttpClient\`** are intercepted.

**Clarifying questions expected:**
- "Should the token go to every URL, or only our own API?"
- "Is anything else already registered as an interceptor, such as a library's?"

**Code / implementation expected:** Yes — an auth interceptor, a timing interceptor and a fake backend, with a log of the order they run in.`,
    answer: `**Target Audience:** Developers who call APIs with <code>HttpClient</code> and want cross-cutting behaviour in one place — assumes you know what an Observable is (see [Observables vs Promises](/interview-question/what-is-the-difference-between-observables-and-promises)).
**Difficulty:** Easy to Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. The order logs in sections 5 and 6 were printed by the compiled examples (Angular 22.2.3, <code>ngc</code> with strict templates) after a real button click; the "backend" is an interceptor answering in memory, because no network was used. This page covers the fundamentals; registration details, errors and retries have their own pages, linked in section 8.

## 1. Why This Even Matters — A Story First

Every letter leaving a company goes through the post room. The post room stamps the company address on the envelope, logs the time it left, and when replies arrive it logs those too before handing them back to whoever sent the letter. Nobody in the building has to remember to stamp their own envelopes, and if the address ever changes, only the post room needs to know.

An **HTTP interceptor** is that post room for your Angular app. Every request made through <code>HttpClient</code> passes through it on the way out, and every response passes back through it on the way in. Authentication headers, logging, error handling, caching and test doubles all live there instead of in forty services.

## 2. The Core Idea

📌 **Interview term: HTTP interceptor** — a function that sits between <code>HttpClient</code> and the network. It receives the outgoing request and a <code>next</code> function for the rest of the chain, and returns an Observable of events. It can change the request, change or replace the response, or answer without calling <code>next</code> at all.

📌 **Interview term: HttpInterceptorFn** — the modern, functional shape:

\`\`\`ts
type HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => Observable<HttpEvent<unknown>>;
\`\`\`

The 22.2.3 typings add that these functions "are executed in an [injection context](/interview-question/what-is-runininjectioncontext-and-when-do-you-need-to-use-it)", which is why [<code>inject(TokenStore)</code>](/interview-question/inject-vs-constructor-injection-when-should-you-use-each) works inside one.

📌 **Interview term: withInterceptors** — the <code>provideHttpClient</code> feature that registers functional interceptors, in order: <code>provideHttpClient(withInterceptors([authInterceptor, timingInterceptor]))</code>. The details of this registration are covered in [provideHttpClient(withInterceptors)](/interview-question/what-is-providehttpclient-withinterceptors-and-how-does-it-replace-legacy-http-i).

📌 **Interview term: Immutable request** — <code>HttpRequest</code> and <code>HttpHeaders</code> cannot be changed in place; the typings say "Instances are immutable. Modifying methods return a cloned instance." To add a header you create a new request with <code>req.clone({ setHeaders: { Authorization: "Bearer ..." } })</code> and pass that one to <code>next</code>. (The body is the exception: the typings note "Bodies are not enforced to be immutable", so do not mutate it either.)

📌 **Interview term: Short-circuit** — returning a response without calling <code>next</code>. The rest of the chain and the real backend never run. Caches, mock backends and offline modes are built this way.

## 3. The Onion

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="Requests pass through auth then timing then the backend, responses return through timing then auth, in reverse order">
  <defs>
    <marker id="hi-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="110" width="130" height="70" rx="10"/>
  <text class="d-text" x="85" y="140" text-anchor="middle">Component</text>
  <text class="d-sub" x="85" y="162" text-anchor="middle">http.get</text>
  <rect class="d-box-accent" x="200" y="110" width="140" height="70" rx="10"/>
  <text class="d-text d-accent" x="270" y="140" text-anchor="middle">auth</text>
  <text class="d-sub" x="270" y="162" text-anchor="middle">adds header</text>
  <rect class="d-box-accent" x="390" y="110" width="140" height="70" rx="10"/>
  <text class="d-text d-accent" x="460" y="140" text-anchor="middle">timing</text>
  <text class="d-sub" x="460" y="162" text-anchor="middle">starts a clock</text>
  <rect class="d-box-muted" x="580" y="110" width="120" height="70" rx="10"/>
  <text class="d-text" x="640" y="140" text-anchor="middle">backend</text>
  <text class="d-sub" x="640" y="162" text-anchor="middle">answers</text>
  <path class="d-edge" d="M 150 100 C 170 60 180 60 200 100" marker-end="url(#hi-arrow)"/>
  <path class="d-edge" d="M 340 100 C 360 60 370 60 390 100" marker-end="url(#hi-arrow)"/>
  <path class="d-edge" d="M 530 100 C 550 60 560 60 580 100" marker-end="url(#hi-arrow)"/>
  <path class="d-edge-dashed" d="M 580 190 C 560 230 550 230 530 190" marker-end="url(#hi-arrow)"/>
  <path class="d-edge-dashed" d="M 390 190 C 370 230 360 230 340 190" marker-end="url(#hi-arrow)"/>
  <path class="d-edge-dashed" d="M 200 190 C 180 230 170 230 150 190" marker-end="url(#hi-arrow)"/>
  <text class="d-sub" x="360" y="40" text-anchor="middle">request: array order</text>
  <text class="d-sub" x="360" y="270" text-anchor="middle">response: reverse order</text>
</svg>

Each interceptor wraps everything after it. Code before <code>next(req)</code> runs on the way out; operators piped onto <code>next(req)</code> run on the way back, so the first interceptor in the array is the last to see the response.

## 4. Three Interceptors

The example at the bottom registers three functional interceptors:

\`\`\`ts
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(TokenStore).token;
  return next(req.clone({ setHeaders: { Authorization: \`Bearer \${token}\` } }));
};

export const timingInterceptor: HttpInterceptorFn = (req, next) => {
  const started = performance.now();
  return next(req).pipe(tap((ev) => ev instanceof HttpResponse && console.log(performance.now() - started)));
};

export const fakeBackend: HttpInterceptorFn = () =>
  of(new HttpResponse({ status: 200, body: [{ id: 1, name: "Ada" }] })).pipe(delay(30));

provideHttpClient(withInterceptors([authInterceptor, timingInterceptor, fakeBackend]))
\`\`\`

<code>next(req)</code> returns an Observable of **events**, not just the final response, which is why the timing interceptor checks <code>ev instanceof HttpResponse</code>: with progress reporting enabled the same stream also carries upload and download progress events.

## 5. Verified: the order of a real request

Clicking the button calls <code>http.get("/api/users")</code>. Every interceptor logs on the way out (<code>-&gt;</code>) and on the way back (<code>&lt;-</code>):

\`\`\`
[app] RENDERED: Load usersnot loaded
http.get('/api/users')
  auth    -> GET /api/users
  timing  -> sees Authorization: Bearer abc123
  backend    answering /api/users
  timing  <- 200 after ~30ms
  auth    <- 200
  component got the body
RENDERED: Load usersAda
\`\`\`

(<code>RENDERED</code> lines are the root element text, so the button label and the paragraph run together.)

- **Out in array order**: auth, then timing, then the fake backend.
- **The clone worked**: timing, which runs after auth, already saw <code>Authorization: Bearer abc123</code>. The component never set it.
- **Back in reverse order**: timing logged the response first, then auth, then the component got the body.
- **The backend short-circuited**: it never called <code>next</code>, so no real network request was attempted, yet the component received a normal typed response.

## 6. Verified: mixing in a class-based interceptor

Older code uses classes resolved through [dependency injection](/interview-question/how-does-dependency-injection-work-in-angular): <code>@Injectable() class LegacyInterceptor implements HttpInterceptor { intercept(req, next) { return next.handle(req); } }</code>, registered with <code>{ provide: HTTP_INTERCEPTORS, useClass: LegacyInterceptor, multi: true }</code> (a multi [provider](/interview-question/what-is-the-difference-between-useclass-usevalue-usefactory-and-useexisting)). With <code>provideHttpClient</code> these run only if you also add <code>withInterceptorsFromDi()</code>. Where do they run relative to functional ones?

| <code>provideHttpClient(...)</code> features | Observed order on the way out |
| :--- | :--- |
| <code>withInterceptors([auth, timing])</code>, then <code>withInterceptorsFromDi()</code> | auth, timing, legacy |
| <code>withInterceptorsFromDi()</code>, then <code>withInterceptors([auth, timing, fakeBackend])</code> | legacy, auth, timing, backend |

So the two groups run in the order their **features are listed**. The first row's log, with the class answering as the backend:

\`\`\`
[app] RENDERED: Load usersnot loaded
http.get('/api/users')
  auth    -> GET /api/users
  timing  -> sees Authorization: Bearer abc123
  legacy  -> (class, via HTTP_INTERCEPTORS)
  legacy     answering (as the backend)
  timing  <- 200 after ~0ms
  auth    <- 200
  component got the body
RENDERED: Load usersAda
\`\`\`

The <code>HttpInterceptor</code> interface is not deprecated in 22.2.3, but <code>HttpClientModule</code> is (<code>@deprecated use provideHttpClient(withInterceptorsFromDi()) as providers instead</code>), and new interceptors should be functions. One more 22.x detail from the typings: <code>withFetch()</code> is <code>@deprecated</code> because "<code>FetchBackend</code> is the default <code>HttpBackend</code>"; interceptors work the same way on top of either backend.

## 7. What Interceptors Are Good For

| Use | Typical shape | Where to read more |
| :--- | :--- | :--- |
| Auth header | <code>req.clone({ setHeaders })</code>, only for your API's origin | This page |
| Logging and timing | <code>next(req).pipe(tap(...))</code> | This page |
| Global error handling, retries | [<code>catchError</code>](/interview-question/how-does-catcherror-work-in-rxjs-and-how-do-you-return-a-fallback-value), <code>retry</code> on <code>next(req)</code> | [errors and retries in interceptors](/interview-question/how-do-you-handle-errors-and-retries-globally-with-interceptors) |
| Caching GET responses | Short-circuit with a stored response | Combine with [shareReplay](/interview-question/explain-the-sharereplay-operator-in-rxjs-and-how-it-prevents-duplicate-http-requ) ideas |
| Fake backend for demos and tests | Short-circuit always | Or <code>provideHttpClientTesting()</code> in unit tests, see [mocking services in tests](/interview-question/how-do-you-mock-services-in-angular-unit-tests-using-jasmine-jest-spies) |
| Loading indicator | Count in-flight requests with <code>finalize</code> | A small [service](/interview-question/what-is-a-service-and-why-use-it) with a [signal](/interview-question/what-are-angular-signals) |

## 8. Common Pitfalls

- **Mutating the request.** <code>HttpRequest</code> is immutable; build a new one with <code>clone</code> and pass that to <code>next</code>. Forgetting to pass the clone (calling <code>next(req)</code> with the original) silently drops your change.
- **Sending your token to every URL.** Check <code>req.url</code> against your API origin before adding credentials, or third-party requests receive them.
- **Expecting <code>fetch()</code> or third-party SDK calls to be intercepted.** Only requests made through Angular's <code>HttpClient</code> go through its interceptor chain.
- **Registering class interceptors and forgetting <code>withInterceptorsFromDi()</code>.** They are silently ignored without it: with that feature removed from the second configuration above, the class never logged and no error or warning appeared.
- **Order surprises.** Responses come back in reverse; an error handler placed first in the array sees errors last, after every other interceptor has had a chance to transform them.
- **Calling <code>inject()</code> inside <code>tap</code> or <code>subscribe</code> callbacks.** Those run later, outside the injection context; inject at the top of the function.

For the full picture of functional interceptors, including registration details and how they replaced DI-based providers, continue with [functional HTTP interceptors](/interview-question/what-are-functional-http-interceptors-in-modern-angular-and-how-do-you-register-) and [functional interceptors with provideHttpClient()](/interview-question/how-do-functional-interceptors-work-with-providehttpclient).

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">"An HTTP interceptor is middleware in HttpClient: every request passes through it on the way out and every response on the way back, so cross-cutting concerns live in one place."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Shape:</strong> <span style="color:#f0e2c8;">"Today it is an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HttpInterceptorFn</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(req, next) =&gt; next(req)</code>, registered with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">provideHttpClient(withInterceptors([...]))</code>. It runs in an injection context, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inject()</code> works."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Changing requests:</strong> <span style="color:#f0e2c8;">"Requests are immutable, so I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">req.clone({ setHeaders })</code> and pass the clone to next."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Order:</strong> <span style="color:#f0e2c8;">"Requests go through in array order and responses come back in reverse. An interceptor that does not call next short-circuits, which is how caches and fake backends work."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Legacy:</strong> <span style="color:#f0e2c8;">"Class interceptors on HTTP_INTERCEPTORS still work but need withInterceptorsFromDi, and they run where that feature is listed."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you add a token only for your own API?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">req.url</code> (or a parsed origin) inside the interceptor and call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next(req)</code> unchanged for any other host, so third-party requests never receive the credentials.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you skip an interceptor for one request?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Pass an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HttpContext</code> with a custom <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HttpContextToken</code> on that request, and have the interceptor read <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">req.context.get(TOKEN)</code> and pass the request through untouched when it is set.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">next(req)</code> return events, not just a response?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The stream can carry progress events for uploads and downloads before the final HttpResponse, so interceptors filter for HttpResponse when they only care about the result.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test code that uses HttpClient?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In unit tests, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">provideHttpClient()</code> plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">provideHttpClientTesting()</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HttpTestingController</code> to expect and flush requests. A short-circuiting interceptor is handy for demos and local development.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where should error handling go?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">An interceptor with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">catchError</code> for global concerns like a 401 redirect or a toast, and local <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">catchError</code> in the calling code for screen-specific fallbacks.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **HTTP interceptor** | Middleware that sees every HttpClient request and response |
| **HttpInterceptorFn** | The functional interceptor type: (req, next) returns an Observable of events |
| **next** | Function that passes the request to the rest of the chain |
| **withInterceptors** | provideHttpClient feature that registers functional interceptors in order |
| **withInterceptorsFromDi** | Feature that enables class interceptors from HTTP_INTERCEPTORS |
| **req.clone** | Creates a modified copy of an immutable request |
| **Short-circuit** | Answering without calling next, so the backend never runs |
| **HttpEvent** | Anything on the response stream: progress events and the final HttpResponse |

---
**Conclusion:** An HTTP interceptor is middleware inside <code>HttpClient</code>: a function that receives each request and a <code>next</code> handler, and can change the request, the response, or answer by itself. Register functional interceptors with <code>provideHttpClient(withInterceptors([...]))</code>, clone requests instead of mutating them, and remember the onion: as verified on Angular 22.2.3, requests went through auth, timing and the fake backend in array order, responses came back in reverse, and class interceptors joined the chain where <code>withInterceptorsFromDi()</code> was listed. That one mechanism carries auth headers, logging, errors, caching and test backends for the whole app.`,
    examples: [
      {
        label: "Auth, timing and fake-backend functional interceptors with an order log",
        tech: "angular",
        runnable: false,
        code: `import { ApplicationConfig, Component, Injectable, inject, signal } from "@angular/core";
import { HttpClient, HttpInterceptorFn, HttpResponse, provideHttpClient, withInterceptors } from "@angular/common/http";
import { delay, of, tap } from "rxjs";

@Injectable({ providedIn: "root" })
export class TokenStore {
  token = "abc123";
}

// 1. Adds a header. Requests are immutable, so clone() with the change.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  console.log(\`  auth    -> \${req.method} \${req.url}\`);
  const token = inject(TokenStore).token; // interceptors run in an injection context
  const authed = req.clone({ setHeaders: { Authorization: \`Bearer \${token}\` } });
  return next(authed).pipe(tap((ev) => ev instanceof HttpResponse && console.log(\`  auth    <- \${ev.status}\`)));
};

// 2. Logs how long the request took.
export const timingInterceptor: HttpInterceptorFn = (req, next) => {
  console.log(\`  timing  -> sees Authorization: \${req.headers.get("Authorization")}\`);
  const started = performance.now();
  return next(req).pipe(
    tap((ev) => ev instanceof HttpResponse &&
      console.log(\`  timing  <- \${ev.status} after ~\${Math.round((performance.now() - started) / 10) * 10}ms\`)),
  );
};

// 3. A fake backend: it never calls next(), so no real network request is made.
export const fakeBackend: HttpInterceptorFn = (req) => {
  console.log(\`  backend    answering \${req.url}\`);
  return of(new HttpResponse({ status: 200, body: [{ id: 1, name: "Ada" }] })).pipe(delay(30));
};

export const appConfig: ApplicationConfig = {
  providers: [
    // Order in this array = order requests pass through. Responses come back in reverse.
    provideHttpClient(withInterceptors([authInterceptor, timingInterceptor, fakeBackend])),
  ],
};

@Component({
  selector: "app-root",
  template: \`<button (click)="load()">Load users</button> <p>{{ users() }}</p>\`,
})
export class AppComponent {
  private http = inject(HttpClient);
  users = signal("not loaded");
  load() {
    console.log("http.get('/api/users')");
    this.http.get<{ name: string }[]>("/api/users").subscribe((list) => {
      console.log("  component got the body");
      this.users.set(list.map((u) => u.name).join(", "));
    });
  }
}`,
      },
    ],
  },
];

export default augments;
