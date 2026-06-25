/**
 * Angular Phase 1 — Batch 5 (Routing & forms). Gold-standard rewrites.
 * Conventions as in angular-augments-gold-1.ts.
 */
import type { AngularAugment } from "./angular-augments.types";

const augments: AngularAugment[] = [
  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you read route parameters?",
    answer: `**Core concept (TL;DR).** Inject <code>ActivatedRoute</code> and read parameters either **once** via the snapshot (<code>route.snapshot.paramMap.get('id')</code>) or **reactively** via the <code>paramMap</code> observable (for params that change while the component stays mounted). Query parameters come from <code>queryParamMap</code>. Modern Angular can also bind params straight to component <code>@Input</code>s.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='ActivatedRoute exposes snapshot params and a paramMap observable'>
  <rect class='d-box-accent' x='140' y='24' width='180' height='44' rx='10'/>
  <text class='d-text' x='230' y='51' text-anchor='middle'>ActivatedRoute</text>
  <defs><marker id='ah-rp' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L9,4 L0,8 Z'/></marker></defs>
  <rect class='d-box' x='30' y='100' width='180' height='40' rx='8'/>
  <text class='d-sub' x='120' y='124' text-anchor='middle'>snapshot.paramMap (once)</text>
  <rect class='d-box' x='250' y='100' width='180' height='40' rx='8'/>
  <text class='d-sub' x='340' y='124' text-anchor='middle'>paramMap$ (reactive)</text>
  <line class='d-edge' x1='200' y1='68' x2='130' y2='98' marker-end='url(#ah-rp)'/>
  <line class='d-edge' x1='260' y1='68' x2='330' y2='98' marker-end='url(#ah-rp)'/>
</svg>

**How it works.** For a route like <code>users/:id</code>, the **snapshot** gives the value at activation — fine when navigating to the param means a fresh component instance. But if you can navigate from <code>users/1</code> to <code>users/2</code> **without** leaving the component (Angular reuses it by default), the snapshot won't update — subscribe to <code>route.paramMap</code> instead so you react to each change (often piping into <code>switchMap</code> to refetch). Use <code>queryParamMap</code> for <code>?sort=asc</code>-style query params. The modern, cleanest option is <code>withComponentInputBinding()</code>, which maps route params/query params/data directly to matching component <code>@Input</code>s (or signal inputs), so you don't inject <code>ActivatedRoute</code> at all.

### Reading params
| Source | When |
| --- | --- |
| <code>snapshot.paramMap.get('id')</code> | one-time, component re-created |
| <code>paramMap</code> observable | param changes in place |
| <code>queryParamMap</code> | query string (<code>?x=</code>) |
| input binding | <code>withComponentInputBinding()</code> |

> **Interview tip:** "Snapshot for a one-time read; the <code>paramMap</code> **observable** when the param changes without re-creating the component." Mention <code>switchMap</code> to refetch and <code>withComponentInputBinding</code> for input-based params.`,
    examples: [
      {
        label: "Reactive param reading + refetch",
        tech: "angular",
        runnable: false,
        code: `import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { switchMap } from 'rxjs';

@Component({ selector: 'app-user', standalone: true, template: '{{ id }}' })
export class UserComponent {
  private route = inject(ActivatedRoute);
  id = '';

  constructor() {
    // one-time:
    this.id = this.route.snapshot.paramMap.get('id') ?? '';

    // reactive (param changes in place) — refetch on each id:
    this.route.paramMap
      .pipe(switchMap(p => fetch('/users/' + p.get('id')).then(r => r.json())))
      .subscribe(user => console.log(user));
  }
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How does routing and lazy loading work in Angular?",
    answer: `**Core concept (TL;DR).** The Router maps **URL paths to components**: you declare routes, <code>&lt;router-outlet&gt;</code> renders the matched component, and <code>routerLink</code> navigates without a full reload. **Lazy loading** defers loading a feature's code until its route is first visited — via <code>loadComponent</code> (standalone) or <code>loadChildren</code> — shrinking the initial bundle.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='URL matches a route which renders into the outlet; lazy routes load on demand'>
  <rect class='d-box' x='20' y='52' width='110' height='46' rx='10'/>
  <text class='d-text' x='75' y='73' text-anchor='middle'>URL /admin</text>
  <text class='d-sub' x='75' y='90' text-anchor='middle'>routerLink</text>
  <defs><marker id='ah-rt' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L9,4 L0,8 Z'/></marker></defs>
  <line class='d-edge' x1='130' y1='75' x2='164' y2='75' marker-end='url(#ah-rt)'/>
  <rect class='d-box-accent' x='166' y='52' width='130' height='46' rx='10'/>
  <text class='d-text' x='231' y='73' text-anchor='middle'>Routes match</text>
  <text class='d-sub' x='231' y='90' text-anchor='middle'>loadComponent (lazy)</text>
  <line class='d-edge' x1='296' y1='75' x2='330' y2='75' marker-end='url(#ah-rt)'/>
  <rect class='d-box' x='332' y='52' width='114' height='46' rx='10'/>
  <text class='d-text' x='389' y='73' text-anchor='middle'>router-outlet</text>
  <text class='d-sub' x='389' y='90' text-anchor='middle'>renders it</text>
</svg>

**How it works.** You configure an array of <code>Route</code>s (<code>provideRouter(routes)</code> or <code>RouterModule.forRoot</code>), each mapping a <code>path</code> to a <code>component</code>. The Router watches the URL, matches a route, and renders that component into the page's <code>&lt;router-outlet&gt;</code>; nested outlets enable child routes/layouts. Navigation happens client-side via <code>[routerLink]</code> or <code>Router.navigate()</code> — no page reload. For **lazy loading**, instead of a <code>component</code> you give <code>loadComponent: () =&gt; import('./admin.component').then(m =&gt; m.AdminComponent)</code> (or <code>loadChildren</code> for a set of routes); the bundler splits that into a separate chunk fetched only when the route is activated, improving initial load. Guards and resolvers run during matching/activation.

### Routing pieces
| Piece | Role |
| --- | --- |
| <code>Routes</code> | path → component map |
| <code>&lt;router-outlet&gt;</code> | renders matched component |
| <code>routerLink</code> / <code>navigate()</code> | client-side navigation |
| <code>loadComponent</code>/<code>loadChildren</code> | lazy chunks |

> **Interview tip:** "Routes map paths to components rendered in <code>&lt;router-outlet&gt;</code>; navigate with <code>routerLink</code> (no reload)." Lazy load with <code>loadComponent</code>/<code>loadChildren</code> to split bundles and cut initial load.`,
    examples: [
      {
        label: "Routes with a lazy-loaded component",
        tech: "angular",
        runnable: false,
        code: `import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'users/:id', component: UserComponent },
  {
    path: 'admin',
    // loaded only when /admin is visited → separate chunk
    loadComponent: () => import('./admin.component').then(m => m.AdminComponent),
  },
  { path: '**', redirectTo: '' },   // wildcard / not-found
];

// bootstrapApplication(App, { providers: [provideRouter(routes)] });
class HomeComponent {} class UserComponent {}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are route guards in Angular?",
    answer: `**Core concept (TL;DR).** Route guards are functions that decide whether a navigation may proceed. The main ones: <code>CanActivate</code> (allowed to **enter** a route?), <code>CanDeactivate</code> (allowed to **leave**? — e.g. unsaved-changes prompt), <code>CanMatch</code> (should this route/lazy chunk match at all?), and resolvers (pre-fetch data). They return a boolean, a <code>UrlTree</code> (redirect), or an Observable/Promise of those.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Guards allow, block, or redirect navigation'>
  <rect class='d-box' x='20' y='52' width='120' height='46' rx='10'/>
  <text class='d-text' x='80' y='79' text-anchor='middle'>navigation</text>
  <defs><marker id='ah-gd' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L9,4 L0,8 Z'/></marker></defs>
  <line class='d-edge' x1='140' y1='75' x2='174' y2='75' marker-end='url(#ah-gd)'/>
  <rect class='d-box-accent' x='176' y='52' width='110' height='46' rx='10'/>
  <text class='d-text' x='231' y='73' text-anchor='middle'>guard</text>
  <text class='d-sub' x='231' y='90' text-anchor='middle'>true / redirect</text>
  <line class='d-edge' x1='286' y1='66' x2='332' y2='58' marker-end='url(#ah-gd)'/>
  <line class='d-edge' x1='286' y1='86' x2='332' y2='96' marker-end='url(#ah-gd)'/>
  <text class='d-sub' x='392' y='62' text-anchor='middle'>allow → route</text>
  <text class='d-sub' x='392' y='100' text-anchor='middle'>block / /login</text>
</svg>

**How it works.** Guards run during routing and gate access. <code>CanActivate</code> protects a route (return <code>false</code> or a <code>UrlTree</code> to redirect to <code>/login</code> when unauthenticated). <code>CanDeactivate</code> runs when leaving — commonly to confirm discarding unsaved form changes. <code>CanMatch</code> decides whether a route definition applies at all (great for feature flags or role-based lazy loading — if it doesn't match, the chunk isn't even downloaded). Modern Angular uses **functional guards** — <code>const authGuard: CanActivateFn = () =&gt; inject(Auth).isLoggedIn() ? true : inject(Router).createUrlTree(['/login'])</code> — attached via the route's <code>canActivate: [authGuard]</code>. Returning an Observable/Promise lets guards do async checks (verify a token).

### Guard types
| Guard | Question |
| --- | --- |
| <code>CanActivate</code> | can enter this route? |
| <code>CanActivateChild</code> | can enter children? |
| <code>CanDeactivate</code> | can leave (unsaved changes)? |
| <code>CanMatch</code> | should this route match/load? |

> **Interview tip:** Name the guards and a use each (CanActivate→auth, CanDeactivate→unsaved-changes, CanMatch→feature flag/role lazy-load). Note they return <code>boolean</code>/<code>UrlTree</code>/Observable, and modern Angular uses **functional** guards.`,
    examples: [
      {
        label: "A functional auth guard",
        tech: "angular",
        runnable: false,
        code: `import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const loggedIn = !!localStorage.getItem('token');
  // allow, or redirect to /login via a UrlTree
  return loggedIn ? true : router.createUrlTree(['/login']);
};

// usage:
// { path: 'admin', component: AdminComponent, canActivate: [authGuard] }`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is a route resolver and when is it useful?",
    answer: `**Core concept (TL;DR).** A resolver **pre-fetches data before a route activates**, so the component renders with its data already available — no empty/loading flash on entry. You write a <code>ResolveFn</code> that returns the data (often an Observable), attach it to the route's <code>resolve</code>, and read it from <code>ActivatedRoute.data</code>.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Resolver fetches data before the component activates'>
  <rect class='d-box' x='20' y='52' width='120' height='46' rx='10'/>
  <text class='d-text' x='80' y='73' text-anchor='middle'>navigate</text>
  <text class='d-sub' x='80' y='90' text-anchor='middle'>to /user/1</text>
  <defs><marker id='ah-rs' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L9,4 L0,8 Z'/></marker></defs>
  <line class='d-edge' x1='140' y1='75' x2='174' y2='75' marker-end='url(#ah-rs)'/>
  <rect class='d-box-accent' x='176' y='52' width='110' height='46' rx='10'/>
  <text class='d-text' x='231' y='73' text-anchor='middle'>resolver</text>
  <text class='d-sub' x='231' y='90' text-anchor='middle'>fetch first</text>
  <line class='d-edge' x1='286' y1='75' x2='320' y2='75' marker-end='url(#ah-rs)'/>
  <rect class='d-box' x='322' y='52' width='124' height='46' rx='10'/>
  <text class='d-text' x='384' y='73' text-anchor='middle'>component</text>
  <text class='d-sub' x='384' y='90' text-anchor='middle'>data ready</text>
</svg>

**How it works.** Without a resolver, a route's component renders immediately and then fetches data in <code>ngOnInit</code>, briefly showing an empty or spinner state. A resolver moves that fetch **into the routing step**: Angular runs the <code>ResolveFn</code>, waits for it to emit (taking the first value), and only then activates the component with the data placed under <code>ActivatedRoute.snapshot.data['key']</code>. This guarantees the component has data on first render — nice for detail pages and SEO/SSR. The trade-off is that **navigation is delayed** until the data arrives, so pair resolvers with a global loading indicator and handle errors (a failed resolve cancels navigation). For most cases, in-component fetching with a skeleton is fine; reach for resolvers when a populated view on arrival matters.

### Resolver
| Aspect | Detail |
| --- | --- |
| Runs | before route activation |
| Returns | data / Observable (first value) |
| Read in component | <code>route.data['key']</code> |
| Trade-off | navigation waits for data |

> **Interview tip:** "Pre-fetches data before the route activates so the component has it on first render (no flash)." Trade-off: navigation is blocked until it resolves — add a loading indicator and handle resolve errors.`,
    examples: [
      {
        label: "A functional resolver",
        tech: "angular",
        runnable: false,
        code: `import { ResolveFn, ActivatedRouteSnapshot } from '@angular/router';

export const userResolver: ResolveFn<any> = (route: ActivatedRouteSnapshot) =>
  fetch('/users/' + route.paramMap.get('id')).then(r => r.json());

// route config:
//   { path: 'user/:id', component: UserComponent, resolve: { user: userResolver } }

// in the component:
//   const user = this.route.snapshot.data['user'];  // already loaded`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are preloading strategies?",
    answer: `**Core concept (TL;DR).** Preloading controls **when lazy-loaded routes are fetched in the background** after the app starts. The default <code>NoPreloading</code> loads a feature only on navigation; <code>PreloadAllModules</code> eagerly downloads all lazy chunks once the app is idle; a **custom** strategy preloads only selected routes. It balances a small initial bundle against fast later navigation.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='No preloading vs preload all vs custom selective preloading'>
  <rect class='d-box' x='14' y='44' width='140' height='62' rx='10'/>
  <text class='d-text' x='84' y='70' text-anchor='middle'>NoPreloading</text>
  <text class='d-sub' x='84' y='90' text-anchor='middle'>load on navigation</text>
  <rect class='d-box-accent' x='162' y='44' width='140' height='62' rx='10'/>
  <text class='d-text' x='232' y='70' text-anchor='middle'>PreloadAllModules</text>
  <text class='d-sub' x='232' y='90' text-anchor='middle'>load all when idle</text>
  <rect class='d-box' x='310' y='44' width='140' height='62' rx='10'/>
  <text class='d-text' x='380' y='70' text-anchor='middle'>Custom</text>
  <text class='d-sub' x='380' y='90' text-anchor='middle'>preload selected</text>
</svg>

**How it works.** Lazy loading keeps the **initial** bundle small, but the first visit to a lazy route then pays a download cost. Preloading hides that latency: after the app has loaded, the router can fetch lazy chunks in the background so they're cached before the user clicks. <code>PreloadAllModules</code> (provided via <code>withPreloading(PreloadAllModules)</code> / <code>preloadingStrategy</code>) grabs everything once the main bundle is done — good for small/medium apps. For large apps that's wasteful, so you implement a custom <code>PreloadingStrategy</code> that preloads only routes flagged with <code>data: { preload: true }</code> (or based on network conditions/likelihood). The result is the best of both: fast startup *and* snappy navigation for the routes users are likely to hit.

### Preloading options
| Strategy | Behaviour |
| --- | --- |
| <code>NoPreloading</code> (default) | load on demand only |
| <code>PreloadAllModules</code> | preload all when idle |
| custom strategy | preload selected routes |
| signal/data flag | mark <code>data: { preload: true }</code> |

> **Interview tip:** "Preloading fetches lazy chunks in the background after startup — <code>PreloadAllModules</code> for small apps, a **custom** strategy to preload only likely routes for big ones." It trades nothing at startup for faster subsequent navigation.`,
    examples: [
      {
        label: "Enable preloading + a custom strategy",
        tech: "angular",
        runnable: false,
        code: `import { PreloadAllModules, PreloadingStrategy, Route } from '@angular/router';
import { Observable, of } from 'rxjs';

// option A: preload everything when idle
//   provideRouter(routes, withPreloading(PreloadAllModules))

// option B: custom — only routes flagged data:{ preload: true }
export class SelectivePreload implements PreloadingStrategy {
  preload(route: Route, load: () => Observable<any>): Observable<any> {
    return route.data?.['preload'] ? load() : of(null);
  }
}
//   { path: 'admin', loadComponent: ..., data: { preload: true } }`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the difference between reactive and template-driven forms?",
    answer: `**Core concept (TL;DR).** **Template-driven** forms keep the logic in the **template** (using <code>ngModel</code> and directives) — simple and quick, but implicit and async. **Reactive** forms define the form model **in the component** (<code>FormGroup</code>/<code>FormControl</code>) — explicit, synchronous, type-safe, and far more scalable for complex, dynamic, or heavily-validated forms.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Template-driven keeps logic in the template; reactive defines the model in code'>
  <rect class='d-box' x='20' y='44' width='200' height='62' rx='10'/>
  <text class='d-text' x='120' y='70' text-anchor='middle'>Template-driven</text>
  <text class='d-sub' x='120' y='90' text-anchor='middle'>ngModel in template, simple</text>
  <rect class='d-box-accent' x='240' y='44' width='200' height='62' rx='10'/>
  <text class='d-text' x='340' y='70' text-anchor='middle'>Reactive</text>
  <text class='d-sub' x='340' y='90' text-anchor='middle'>FormGroup in code, explicit</text>
</svg>

**How it works.** Template-driven forms (from <code>FormsModule</code>) bind inputs with <code>[(ngModel)]</code> and let Angular build the form model behind the scenes from the template — minimal code, good for small/simple forms, but the model is implicit, validation lives as template directives, and value/validity updates are asynchronous (harder to test/scale). Reactive forms (from <code>ReactiveFormsModule</code>) make you declare the structure in the class — <code>new FormGroup({ email: new FormControl('', [Validators.required, Validators.email]) })</code> — and bind it with <code>[formGroup]</code>/<code>formControlName</code>. Because the model is an object you control, you get synchronous access to values/validity, easy programmatic changes, dynamic controls (<code>FormArray</code>), custom validators, and straightforward unit testing. Most non-trivial apps prefer reactive.

### Reactive vs template-driven
| | Template-driven | Reactive |
| --- | --- | --- |
| Model lives in | the template | the component |
| Module | <code>FormsModule</code> | <code>ReactiveFormsModule</code> |
| Sync access | no (async) | yes |
| Best for | simple forms | complex/dynamic, testable |

> **Interview tip:** "Template-driven = <code>ngModel</code> in the template (simple, implicit, async); reactive = explicit <code>FormGroup</code>/<code>FormControl</code> in code (synchronous, testable, scalable)." Reactive wins for complex/dynamic forms and validation.`,
    examples: [
      {
        label: "A reactive form",
        tech: "angular",
        runnable: false,
        code: `import { Component } from '@angular/core';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: \`
    <form [formGroup]="form" (ngSubmit)="submit()">
      <input formControlName="email" placeholder="email" />
      <button [disabled]="form.invalid">Save</button>
    </form>
  \`,
})
export class AppComponent {
  form = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
  });
  submit() { console.log(this.form.value); }  // synchronous value access
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you create a custom validator in reactive forms?",
    answer: `**Core concept (TL;DR).** A validator is a function (<code>ValidatorFn</code>) that takes a control and returns <code>null</code> when valid, or an **error object** (<code>{ errorKey: true }</code>) when invalid. Attach it to a <code>FormControl</code> alongside the built-ins. For server checks use an <code>AsyncValidatorFn</code> (returns an Observable/Promise); for rules spanning fields, put a validator on the <code>FormGroup</code>.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='A validator returns null when valid or an error object when invalid'>
  <rect class='d-box-accent' x='30' y='44' width='170' height='62' rx='10'/>
  <text class='d-text' x='115' y='70' text-anchor='middle'>ValidatorFn(control)</text>
  <text class='d-sub' x='115' y='90' text-anchor='middle'>inspect control.value</text>
  <defs><marker id='ah-cv' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L9,4 L0,8 Z'/></marker></defs>
  <line class='d-edge' x1='200' y1='62' x2='250' y2='56' marker-end='url(#ah-cv)'/>
  <line class='d-edge' x1='200' y1='88' x2='250' y2='96' marker-end='url(#ah-cv)'/>
  <text class='d-sub' x='330' y='60' text-anchor='middle'>valid → null</text>
  <text class='d-sub' x='340' y='100' text-anchor='middle'>invalid → { key: true }</text>
</svg>

**How it works.** Built-in validators (<code>Validators.required</code>, <code>min</code>, <code>email</code>…) are just functions; a custom one follows the same contract. Write <code>(control: AbstractControl): ValidationErrors | null =&gt; condition ? { myError: true } : null</code> and add it to the control's validators array. The returned key shows up in <code>control.errors</code>, so the template can display a matching message (<code>*ngIf="control.hasError('myError')"</code>). To parameterize, use a **factory** that returns a <code>ValidatorFn</code> (e.g. <code>forbiddenValue('admin')</code>). **Cross-field** rules (password === confirm) go on the parent <code>FormGroup</code>, where the control argument is the group. For uniqueness checks against a server, write an <code>AsyncValidatorFn</code> that returns an Observable of errors (debounce it). Async validators run after sync ones pass.

### Validator kinds
| Kind | Signature / use |
| --- | --- |
| sync | <code>(c) => errors \\| null</code> |
| factory | returns a configured <code>ValidatorFn</code> |
| cross-field | put on the <code>FormGroup</code> |
| async | returns Observable/Promise (server) |

> **Interview tip:** "A function returning <code>null</code> (valid) or an error object (invalid), added to the control." Mention factory validators for params, group-level validators for cross-field rules, and <code>AsyncValidatorFn</code> for server checks.`,
    examples: [
      {
        label: "A factory + cross-field validator",
        tech: "angular",
        runnable: false,
        code: `import { AbstractControl, ValidationErrors, ValidatorFn, FormGroup, FormControl } from '@angular/forms';

// parameterized (factory) validator
export function forbidden(word: string): ValidatorFn {
  return (c: AbstractControl): ValidationErrors | null =>
    c.value === word ? { forbidden: { word } } : null;
}

// cross-field validator on the group
export const matchPasswords: ValidatorFn = (g: AbstractControl) =>
  g.get('pw')?.value === g.get('confirm')?.value ? null : { mismatch: true };

const form = new FormGroup({
  name: new FormControl('', [forbidden('admin')]),
  pw: new FormControl(''),
  confirm: new FormControl(''),
}, { validators: matchPasswords });`,
      },
    ],
  },
];

export default augments;
