/**
 * Shapes for Angular question augments.
 *
 * Answers are markdown (may embed inline <svg class='iq-diagram'> + GFM tables).
 * Code examples are Angular/TypeScript. A `runnable` example (tech 'angular')
 * must be a SELF-CONTAINED `app.component.ts` — selector 'app-root', class
 * AppComponent, inline template, using only @angular/core + CommonModule
 * directives (*ngFor, *ngIf, async pipe, built-in pipes) — because the
 * playground hand-off replaces that single file and the template's AppModule
 * imports only BrowserModule/CommonModule. Anything needing FormsModule,
 * ReactiveFormsModule, HttpClientModule, RouterModule, or multiple components
 * must be `runnable: false` (renders as static highlighted code, no Run button).
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
  examples?: AngularExample[];
};
