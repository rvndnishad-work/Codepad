/**
 * Shapes for Angular question augments.
 *
 * Answers are markdown (may embed inline <svg class="iq-diagram"> + GFM tables).
 * Code examples are Angular/TypeScript. A runnable example (tech "angular",
 * `runnable` not false) must be a SELF-CONTAINED `app.component.ts`: selector
 * "app-root", exported class AppComponent, inline template. The playground
 * hand-off replaces that one file and boots it with
 * `bootstrapApplication(AppComponent)` and NO providers (Angular 22, see
 * ANGULAR_TEMPLATE_DEPS in src/lib/templates.ts). So the file may declare more
 * standalone components/directives/pipes and import FormsModule or
 * ReactiveFormsModule in a component's `imports`, but anything that needs an
 * app-level provider (provideHttpClient, provideRouter, ...) must be
 * `runnable: false` (static highlighted code, no Run button).
 *
 * Angular 22 defaults matter when writing runnable code: the app is zoneless
 * (NoopNgZone even though the template imports zone.js) and components are
 * OnPush by default, so state the template reads should be a signal; a plain
 * field changed in a setTimeout will not re-render.
 */
export type AngularVariant = {
  tech: string;
  code: string;
  label?: string;
  runnable?: boolean;
};

export type AngularExample = {
  label?: string;
  code?: string;
  tech?: string;
  runnable?: boolean;
  variants?: AngularVariant[];
};

export type AngularAugment = {
  title: string;
  answer?: string;
  /** Question Body (CLAUDE.md §6). Renders WITHOUT rehype-raw: plain markdown only, no HTML/SVG. */
  description?: string;
  /** One plain sentence, <=155 chars, used as the page meta description. */
  seoDescription?: string;
  examples?: AngularExample[];
};
