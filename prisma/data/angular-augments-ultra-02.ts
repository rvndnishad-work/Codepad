/**
 * Angular ULTRA — batch 02: templates and control flow (@if / @for / @switch
 * versus the structural directives, track and @empty, trackBy, ng-container
 * and ng-template, ngTemplateOutlet, content projection and multi-slot
 * projection, directive types, pipes).
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
 * strictTemplates, booted with bootstrapApplication in jsdom. Examples marked
 * runnable also passed its --playground mode (plain transpile + JIT, the way
 * the site playground runs them). Compiled-instruction claims come from
 * reading ngc output; deprecation claims from the 22.2.3 typings; the
 * migration output from running `ng generate @angular/core:control-flow`
 * with Angular CLI 22.2.3.
 *
 * Conventions: SVG attributes double-quoted, `<code>` tags for inline code in
 * prose, no leading H1, `description` is plain markdown (no HTML).
 */
import type { AngularAugment } from "./angular-augments.types";

const augments: AngularAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Explain the new Control Flow (@if, @for, @switch) and how it compares to structural directives.",
    seoDescription:
      "Angular built-in control flow (@if, @for, @switch) is compiled template syntax, not directives. How it differs from *ngIf, *ngFor and ngSwitch.",
    description: `**Question presented to candidate:**
"Angular templates now have \`@if\`, \`@for\` and \`@switch\` blocks. Explain what they are, how they differ from the older \`*ngIf\` / \`*ngFor\` / \`ngSwitch\` structural directives, and why the team added them."

**What a strong answer should cover:**
- Control flow blocks are **template syntax understood by the compiler**, not directives: nothing to import, nothing instantiated at runtime.
- Structural directives (\`*ngIf\`, \`*ngFor\`) are **classes** that receive an \`ng-template\` and create or destroy embedded views through \`ViewContainerRef\`.
- \`@if\` supports \`@else if\` / \`@else\` inline and \`as\` aliasing; \`@for\` **requires \`track\`** and has \`@empty\` plus \`$index\`, \`$first\`, \`$last\`, \`$even\`, \`$odd\`, \`$count\`; \`@switch\` uses \`@case\` / \`@default\` with strict equality.
- Better type narrowing, fewer wrapper \`ng-template\` / \`ng-container\` elements, a faster list diffing algorithm.
- Status: introduced in v17, stable in v18; \`NgIf\`, \`NgForOf\` and \`NgSwitch\` are **deprecated since v20** but still work in v22.
- Structural directives remain the mechanism for **custom** structural behaviour; only the three built-ins were replaced.

**Clarifying questions expected:**
- "Are we talking about a new codebase, or migrating templates that already use \`*ngIf\`?"
- "Do you want the template syntax, or what the compiler generates for each?"

**Code / implementation expected:** Yes — a template using all three blocks, ideally with \`@empty\` and a \`track\` expression.`,
    answer: `**Target Audience:** Developers who know basic Angular templates and want to understand what replaced <code>*ngIf</code> and <code>*ngFor</code>, and why.
**Difficulty:** Medium

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. Every rendered output, compiler message and compiled instruction quoted below was produced on Angular 22.2.3: the examples were AOT-compiled with <code>ngc</code> (strict templates) and run in jsdom, and the deprecation notes were read from the installed package typings.

## 1. Why This Even Matters — A Story First

Imagine a theatre where the script says "if the hero is alive, play scene 4, otherwise play scene 5". In the old theatre, the director could not read the word "if". So the stage crew hired a specialist, Mr NgIf, who stood in the wings holding scene 4 in a sealed envelope. Every night he checked the hero, and if alive he opened the envelope and pushed the scene on stage. For "otherwise" you had to hand him a second envelope with a name tag on it. For a loop, you hired Mr NgFor, who copied an envelope once per actor.

It worked. But every specialist had to be hired (imported), paid (instantiated), and briefed in a special shorthand. Forget to hire Mr NgIf and the envelope simply stayed sealed, and nobody told you why the scene never played.

The new theatre taught the director to read "if", "for" and "switch" directly. No specialists, no envelopes with name tags, no hiring paperwork. That is **built-in control flow**: <code>@if</code>, <code>@for</code> and <code>@switch</code> are part of the template language itself.

## 2. The Core Idea

📌 **Interview term: Structural directive** — a directive that changes the *shape* of the DOM by adding or removing elements. The asterisk in <code>*ngIf</code> is sugar: Angular wraps the element in an <code>&lt;ng-template&gt;</code> and hands that template to the directive class, which decides when to stamp it out using a <code>ViewContainerRef</code>. (Deep dive: [ng-container and ng-template](/interview-question/what-are-ng-container-and-ng-template), and [TemplateRef and ViewContainerRef](/interview-question/what-is-the-difference-between-elementref-templateref-and-viewcontainerref).)

📌 **Interview term: Built-in control flow** — the <code>@if</code>, <code>@for</code> and <code>@switch</code> **blocks**. They are not classes; the template compiler recognises them and generates the create and update code directly. Nothing is imported, nothing is instantiated.

📌 **Interview term: Embedded view** — the small chunk of DOM plus bindings produced each time a template is stamped out. Both approaches create embedded views; the difference is *who* decides when, a directive at runtime or code the compiler wrote.

The three blocks in one glance:

\`\`\`html
@if (user(); as u) {
  <p>Hi {{ u.name }}</p>
} @else if (loading()) {
  <p>Loading...</p>
} @else {
  <p>Please sign in</p>
}

@for (item of items(); track item.id; let i = $index) {
  <li>{{ i }}: {{ item.name }}</li>
} @empty {
  <li>Nothing here</li>
}

@switch (status()) {
  @case ("ok") { <b>Fine</b> }
  @case ("down") { <b>Outage</b> }
  @default { <b>Unknown</b> }
}
\`\`\`

## 3. Two Paths From Template to DOM

<svg class="iq-diagram" width="100%" viewBox="0 0 720 370" role="img" aria-label="A structural directive is a runtime class that receives a template, a control flow block is compiled into conditional instructions">
  <defs>
    <marker id="cf1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="180" y="28" text-anchor="middle">Structural directive</text>
  <rect class="d-box-muted" x="50" y="48" width="260" height="46" rx="10"/>
  <text class="d-text" x="180" y="76" text-anchor="middle">p *ngIf="user"</text>
  <path class="d-edge" d="M 180 98 L 180 128" marker-end="url(#cf1-arrow)"/>
  <rect class="d-box" x="50" y="134" width="260" height="46" rx="10"/>
  <text class="d-sub" x="180" y="162" text-anchor="middle">wrapped in ng-template</text>
  <path class="d-edge" d="M 180 184 L 180 214" marker-end="url(#cf1-arrow)"/>
  <rect class="d-box" x="50" y="220" width="260" height="46" rx="10"/>
  <text class="d-sub" x="180" y="248" text-anchor="middle">NgIf instance (imported class)</text>
  <path class="d-edge-dashed" d="M 180 270 L 180 300" marker-end="url(#cf1-arrow)"/>
  <rect class="d-box-muted" x="50" y="306" width="260" height="46" rx="10"/>
  <text class="d-sub" x="180" y="334" text-anchor="middle">createEmbeddedView at runtime</text>
  <text class="d-text" x="540" y="28" text-anchor="middle">Control flow block</text>
  <rect class="d-box-muted" x="410" y="48" width="260" height="46" rx="10"/>
  <text class="d-text" x="540" y="76" text-anchor="middle">@if (user())</text>
  <path class="d-edge-accent" d="M 540 98 L 540 128" marker-end="url(#cf1-arrow)"/>
  <rect class="d-box-accent" x="410" y="134" width="260" height="46" rx="10"/>
  <text class="d-text d-accent" x="540" y="162" text-anchor="middle">template compiler</text>
  <path class="d-edge-accent" d="M 540 184 L 540 214" marker-end="url(#cf1-arrow)"/>
  <rect class="d-box" x="410" y="220" width="260" height="46" rx="10"/>
  <text class="d-sub" x="540" y="248" text-anchor="middle">conditional instruction, no class</text>
  <path class="d-edge-dashed" d="M 540 270 L 540 300" marker-end="url(#cf1-arrow)"/>
  <rect class="d-box-muted" x="410" y="306" width="260" height="46" rx="10"/>
  <text class="d-sub" x="540" y="334" text-anchor="middle">same embedded view, fewer steps</text>
</svg>

Both paths end in the same place, an embedded view inserted into the DOM. The left path needs a directive class that you import and Angular instantiates; the right path is decided entirely at compile time.

## 4. Verified: what the compiler actually emits

The clearest way to see the difference is to compile the same template both ways and read the output of <code>ngc</code>. Two components, one with blocks and one with directives, compiled on 22.2.3. The relevant lines of the generated <code>ɵcmp</code> definitions:

\`\`\`js
// @if / @for / @switch component
i0.ɵɵconditionalCreate(0, Blocks_Conditional_0_Template, 2, 1, "p")(1, Blocks_Conditional_1_Template, 2, 0, "p");
i0.ɵɵrepeaterCreate(2, Blocks_For_3_Template, 2, 2, "li", null, _forTrack0, false, Blocks_ForEmpty_4_Template, 2, 0, "li");
...
i0.ɵɵconditional((tmp_0_0 = ctx.user()) ? 0 : 1, tmp_0_0);
i0.ɵɵrepeater(ctx.items());
i0.ɵɵconditional((tmp_2_0 = ctx.mode()) === "a" ? 5 : 6);
// no \`dependencies\` array at all

// *ngIf / *ngFor component
i0.ɵɵtemplate(0, Legacy_p_0_Template, 2, 1, "p", 1)(1, Legacy_ng_template_1_Template, 2, 0, "ng-template", null, 0, i0.ɵɵtemplateRefExtractor)(3, Legacy_li_3_Template, 2, 2, "li", 2);
...
i0.ɵɵproperty("ngIf", ctx.user)("ngIfElse", out_r4);
i0.ɵɵproperty("ngForOf", ctx.items);
// ... dependencies: [NgIf, NgFor]
\`\`\`

What this tells you, in plain words:

- **<code>@if</code> and <code>@switch</code> both become <code>ɵɵconditional</code>.** The compiler turns the condition into an ordinary JavaScript ternary that picks which branch template (slot 0 or 1, 5 or 6) should be showing. <code>@switch</code> literally compiles to <code>=== "a" ? 5 : 6</code>, which is why its matching is strict.
- **<code>@for</code> becomes <code>ɵɵrepeater</code>**, and the <code>track</code> expression is hoisted into a plain function: <code>const _forTrack0 = ($index, $item) =&gt; $item.id;</code>. The <code>@empty</code> template is passed to the same instruction.
- **The directive version sets inputs on directive instances** (<code>ɵɵproperty("ngIf", ...)</code>) and lists <code>NgIf</code> and <code>NgFor</code> in <code>dependencies</code>, so those classes ship in your bundle and run their own change logic.
- A side effect worth noticing: the block component uses <code>ɵɵdomElementStart</code> (a DOM-only fast path, since no directive can match) where the directive version uses <code>ɵɵelementStart</code>.

## 5. Side by Side

| | Structural directives | Built-in control flow |
| :--- | :--- | :--- |
| What it is | A class (<code>NgIf</code>, <code>NgForOf</code>, <code>NgSwitch</code>) | Template syntax handled by the compiler |
| Import needed | Yes, or the element silently never renders | No |
| Else / else-if | <code>else</code> needs a named <code>ng-template</code>; no else-if | <code>@else if</code> and <code>@else</code> inline |
| Loop identity | [<code>trackBy</code>](/interview-question/what-is-trackby-in-ngfor-and-why-use-it) optional, a function on the class | <code>track</code> **required**, any expression |
| Empty list | Separate <code>*ngIf</code> | <code>@empty</code> block |
| Loop variables | <code>index</code>, <code>first</code>, <code>last</code>, <code>even</code>, <code>odd</code>, <code>count</code> | <code>$index</code>, <code>$first</code>, <code>$last</code>, <code>$even</code>, <code>$odd</code>, <code>$count</code> |
| Switch matching | Strict (<code>===</code>) | Strict (<code>===</code>), compiled to a ternary |
| Multiple per element | No, one <code>*</code> per element | Blocks nest freely, no host element needed |
| Status in v22 | Deprecated since 20.0, still works | Stable since v18 |

**Release facts, checked:** control flow arrived in developer preview in v17 (November 2023) and was declared stable in v18 (<a href="https://blog.angular.dev/angular-v18-is-now-available-e79d5ac0affe" target="_blank" rel="noopener noreferrer">Angular v18 announcement</a>). The deprecation comes straight from the 22.2.3 typings: <code>NgIf</code>, <code>NgForOf</code> and <code>NgSwitch</code> each carry <code>@deprecated 20.0</code> followed by "Use the <code>@if</code> block instead. Intent to remove in a future major release" (and the <code>@for</code> / <code>@switch</code> equivalents).

## 6. Verified: the forgotten-import trap is gone

With directives, the most common real bug was forgetting to import <code>NgIf</code> into a [standalone component](/interview-question/what-are-standalone-components). Compiling <code>&lt;p *ngIf="show"&gt;hi&lt;/p&gt;</code> with no imports on 22.2.3 does **not** fail the build. <code>ngc</code> prints a warning and exits with code 0:

\`\`\`
warning NG8103: The \`*ngIf\` directive was used in the template, but neither the \`NgIf\` directive
nor the \`CommonModule\` was imported. Use Angular's built-in control flow @if or make sure that
either the \`NgIf\` directive or the \`CommonModule\` is included in the \`@Component.imports\` array ...
\`\`\`

At runtime the browser console shows <code>NG0303: Can't bind to 'ngIf' since it isn't a known property of 'p'</code>, and the page renders <code>beforeafter</code>: the guarded paragraph is simply missing. With <code>@if</code> there is nothing to import, so this whole class of bug disappears.

## 7. Verified: the example running

The runnable example below uses <code>@if</code> / <code>@else if</code> / <code>@else</code>, <code>@for</code> with <code>track</code>, <code>$index</code>, <code>$last</code> and <code>@empty</code>, and a <code>@switch</code> nested inside the loop. State lives in [signals](/interview-question/what-are-angular-signals), because Angular 22 components are OnPush and [zoneless](/interview-question/what-is-zoneless-angular-and-how-does-it-improve-performance-in-angular-18) by default. Compiled with strict templates, then clicked. Each line is the root text content, so adjacent elements run together:

\`\`\`
RENDERED      : Loading orders... 1. Keyboard - on its way 2. Mouse - paid (latest) Finish loadingAdd orderClear
finish loading: 2 orders 1. Keyboard - on its way 2. Mouse - paid (latest) Finish loadingAdd orderClear
add x2        : Busy day: 4 orders 1. Keyboard - on its way 2. Mouse - paid 3. Cable 3 - refunded 4. Cable 4 - refunded (latest) Finish loadingAdd orderClear
clear         : 0 ordersNo orders yetFinish loadingAdd orderClear
\`\`\`

Notice <code>(latest)</code> moving from Mouse to Cable 4: <code>$last</code> is recalculated for existing rows when the list grows. And after "Clear", the <code>@empty</code> branch replaces the list with no extra <code>@if</code>. The example produced identical output in the playground mode.

## 8. Things Control Flow Does Not Replace

Only the three built-ins were replaced. You still write structural directives when you need **custom** template logic, for example <code>*appHasRole="'admin'"</code> or a virtual-scroll directive. Those are classes that inject <code>TemplateRef</code> and <code>ViewContainerRef</code>, exactly as before; see [directive types](/interview-question/what-is-a-directive-and-what-are-the-types). Two other blocks share the same <code>@</code> syntax but solve different problems: <code>@defer</code> for lazy-loading parts of a template ([deferrable views](/interview-question/what-are-deferrable-views-defer-and-how-do-they-work-in-angular-17)) and <code>@let</code> for declaring a local template variable.

For the step-by-step migration from <code>*ngIf</code> / <code>*ngFor</code>, including what the official schematic rewrites, see the sibling question [how the new control flow replaces *ngIf and *ngFor](/interview-question/how-does-the-new-control-flow-if-for-switch-replace-ngif-and-ngfor). For why <code>track</code> is mandatory, see [why @for requires track](/interview-question/why-does-for-require-track-and-how-does-empty-improve-ux).

## 9. Common Pitfalls

- **Calling blocks "new directives".** They are not directives; there is no class, no selector and no import. Saying so in an interview signals you know how they compile.
- **Leaving out <code>track</code>.** It is a compile error: <code>NG5002: @for loop must have a "track" expression</code>. Picking <code>track $index</code> just to silence it brings back the bugs <code>trackBy</code> existed to prevent.
- **Forgetting the parentheses or the semicolon in aliases.** It is <code>@if (user(); as u)</code>, with a semicolon before <code>as</code>; <code>*ngIf</code> used <code>user as u</code> with no separator.
- **Expecting <code>@switch</code> to fall through or coerce.** One case renders, matching is <code>===</code>; a string <code>"1"</code> never matches the number <code>1</code>.
- **Mixing styles in one template during a migration and assuming identical semantics.** The behaviour is the same for <code>@if</code>, but <code>@for</code> diffs lists with its own algorithm and needs a good key, so [test](/interview-question/how-do-you-test-signal-components-defer-blocks-and-new-control-flow-in-2025) lists after converting.
- **Assuming deprecation means removal.** In 22.2.3 the old directives still compile and run; deprecation is a signal to migrate, not a broken build.

## 10. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@if</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@for</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@switch</code> are control flow built into Angular's template compiler, replacing the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">*ngIf</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">*ngFor</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngSwitch</code> directives."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How they differ:</strong> <span style="color:#f0e2c8;">"A structural directive is a class that gets an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ng-template</code> and stamps it out at runtime. A block is compiled straight into instructions, so there is nothing to import and no directive instance."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. What you gain:</strong> <span style="color:#f0e2c8;">"Inline <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@else if</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@else</code>, a mandatory <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">track</code> plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@empty</code> on loops, strict <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@switch</code> matching, and better type narrowing."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Status:</strong> <span style="color:#f0e2c8;">"Introduced in v17, stable in v18, and the old directives have been deprecated since v20. They still work in v22, and there is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">control-flow</code> migration schematic."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. What did not change:</strong> <span style="color:#f0e2c8;">"Structural directives as a concept still exist. If I write my own, like a permission check, it is still a directive with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TemplateRef</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ViewContainerRef</code>."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did Angular build this into the compiler instead of improving <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">NgIf</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A directive cannot change the template grammar, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">else</code> needed a separate <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ng-template</code> reference and loops needed microsyntax. In the compiler the team could add real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@else if</code> chains, make <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">track</code> mandatory, narrow types properly, and emit dedicated <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ɵɵconditional</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ɵɵrepeater</code> instructions.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">*ngIf</code> removed in Angular 22?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. The 22.2.3 typings mark <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NgIf</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NgForOf</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NgSwitch</code> as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@deprecated 20.0</code> with intent to remove in a future major. Today they still compile and run.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do I need to import anything to use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">@if</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Forgetting to import <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NgIf</code> was a classic bug: the compiler only warns (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NG8103</code>) and at runtime the element silently never renders. Blocks cannot be forgotten because there is nothing to import.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">track</code> required on <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">@for</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">So Angular can match old and new items and keep their DOM. Without a key, replacing an array of fresh objects recreates every row. Making it mandatory means nobody forgets it, which was common with the optional <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">trackBy</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">@switch</code> fall through like JavaScript?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Exactly one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@case</code> renders, there is no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">break</code>, and matching is strict equality, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@case ("1")</code> does not match the number 1.</span>
</div>

</div>

## 11. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Structural directive** | A directive class that adds or removes DOM by stamping out an <code>ng-template</code> |
| **Built-in control flow** | <code>@if</code>, <code>@for</code>, <code>@switch</code> blocks compiled directly by Angular |
| **Embedded view** | One stamped-out copy of a template, with its own bindings |
| **<code>ɵɵconditional</code>** | The compiled instruction behind <code>@if</code> and <code>@switch</code> |
| **<code>ɵɵrepeater</code>** | The compiled instruction behind <code>@for</code> |
| **<code>track</code>** | The expression that gives each loop item a stable identity |
| **<code>@empty</code>** | The branch a <code>@for</code> shows when the collection is empty |
| **NG8103** | Compiler warning: a <code>*ngIf</code>-style directive is used but not imported |

---
**Conclusion:** Structural directives taught Angular templates to branch and loop by handing an <code>ng-template</code> to a runtime class; built-in control flow moves that job into the compiler. On 22.2.3 the difference is visible in the output: <code>@if</code> and <code>@switch</code> become <code>ɵɵconditional</code> with a plain ternary, <code>@for</code> becomes <code>ɵɵrepeater</code> with a hoisted track function, and no directive appears in <code>dependencies</code>. You get inline <code>@else if</code>, a required <code>track</code>, an <code>@empty</code> branch and nothing to forget to import, while the old directives remain deprecated but working. Custom structural directives are still the right tool for your own template logic.`,
    examples: [
      {
        label: "@if / @else if, @for with track and @empty, and @switch in one component",
        tech: "angular",
        runnable: true,
        code: `import { Component, computed, signal } from "@angular/core";

type Order = { id: number; item: string; status: "paid" | "shipped" | "refunded" };

// Built-in control flow: no NgIf / NgFor / NgSwitch import needed.
@Component({
  selector: "app-root",
  template: \`
    @if (loading()) {
      <p>Loading orders...</p>
    } @else if (orders().length > 3) {
      <p>Busy day: {{ orders().length }} orders</p>
    } @else {
      <p>{{ orders().length }} orders</p>
    }

    <ul>
      @for (o of orders(); track o.id; let i = $index, last = $last) {
        <li>
          {{ i + 1 }}. {{ o.item }} -
          @switch (o.status) {
            @case ("paid") { <b>paid</b> }
            @case ("shipped") { <b>on its way</b> }
            @default { <b>refunded</b> }
          }
          @if (last) { (latest) }
        </li>
      } @empty {
        <li>No orders yet</li>
      }
    </ul>

    <button (click)="loading.set(false)">Finish loading</button>
    <button (click)="add()">Add order</button>
    <button (click)="orders.set([])">Clear</button>
  \`,
})
export class AppComponent {
  loading = signal(true);
  orders = signal<Order[]>([
    { id: 1, item: "Keyboard", status: "shipped" },
    { id: 2, item: "Mouse", status: "paid" },
  ]);
  nextId = computed(() => Math.max(0, ...this.orders().map((o) => o.id)) + 1);

  add() {
    const id = this.nextId();
    this.orders.update((list) => [...list, { id, item: "Cable " + id, status: "refunded" }]);
  }
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How does the new control flow @if / @for / @switch replace *ngIf and *ngFor?",
    seoDescription:
      "Mapping *ngIf, *ngFor and ngSwitch to @if, @for and @switch: syntax changes, the control-flow migration schematic, and the traps when converting.",
    description: `**Question presented to candidate:**
"We have a few hundred templates full of \`*ngIf\`, \`*ngFor\` and \`ngSwitch\`. Walk me through how each one maps to the new \`@if\`, \`@for\` and \`@switch\` blocks, and how you would migrate the codebase safely."

**What a strong answer should cover:**
- The mapping: \`*ngIf="x as y; else tpl"\` becomes \`@if (x; as y) { } @else { }\`; \`*ngFor="let t of list; trackBy: fn; let i = index"\` becomes \`@for (t of list; track t.id; let i = $index) { }\`; \`[ngSwitch]\` / \`*ngSwitchCase\` / \`*ngSwitchDefault\` become \`@switch\` / \`@case\` / \`@default\`.
- Loop context variables gain a \`$\` prefix (\`$index\`, \`$first\`, \`$last\`, \`$even\`, \`$odd\`, \`$count\`).
- \`track\` is mandatory, and an existing \`trackBy\` function can be called from it.
- The official schematic: \`ng generate @angular/core:control-flow\`, what it rewrites and what it leaves (it also removes the now-unused directive imports).
- The old directives are deprecated since v20 but still work, so the migration can be gradual.
- Verify after migrating: compile with strict templates and test lists, because \`@for\` uses a different diffing algorithm.

**Clarifying questions expected:**
- "Is there a test suite I can rely on to catch behaviour changes after the schematic runs?"
- "Do any templates use custom structural directives? Those are not touched by the migration."

**Code / implementation expected:** Yes — a before and after of the same component.`,
    answer: `**Target Audience:** Developers maintaining an Angular codebase that still uses <code>*ngIf</code>, <code>*ngFor</code> and <code>ngSwitch</code>, and anyone asked "how would you migrate this?" in an interview.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts with the vocabulary an interviewer expects. Everything quoted below was produced on Angular 22.2.3: both examples were AOT-compiled with strict templates and run in jsdom, and the schematic output comes from running <code>ng generate @angular/core:control-flow</code> with Angular CLI 22.2.3 on a freshly generated app.

## 1. Why This Even Matters — A Story First

A city renames its streets. "Old Mill Lane" becomes "Mill Street", "Station Road" becomes "Station Avenue". The buildings do not move, the post still arrives, and for a few years both names appear on the signs. But every map, every delivery app and every business card eventually has to change, and somebody has to do the renaming carefully, street by street, without sending a fire engine to the wrong address.

That is exactly the situation with <code>*ngIf</code> and <code>*ngFor</code>. The behaviour your users see does not change. The **names and the grammar** do. Both versions work side by side in Angular 22, the old names are officially deprecated, and an interviewer asking this question wants to know whether you can do the renaming safely, which parts are mechanical, and where a mechanical rename can quietly change behaviour.

For the conceptual side (what blocks are and how they compile), see the sibling question [Explain the new Control Flow](/interview-question/explain-the-new-control-flow-if-for-switch-and-how-it-compares-to-structural-dir). This page is about the replacement itself.

## 2. The Mapping, One Directive at a Time

📌 **Interview term: Microsyntax** — the mini-language inside a <code>*</code> attribute, such as <code>let t of items; trackBy: byId; let i = index</code>. Angular desugars it into inputs on the directive (<code>ngForOf</code>, <code>ngForTrackBy</code>) and <code>let-</code> variables on an <code>ng-template</code>. Blocks replace microsyntax with a JavaScript-like header in parentheses.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="Each structural directive maps to one control flow block">
  <defs>
    <marker id="cf2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="160" y="28" text-anchor="middle">Deprecated since v20</text>
  <text class="d-text" x="560" y="28" text-anchor="middle">Built in, stable since v18</text>
  <rect class="d-box-muted" x="30" y="50" width="260" height="50" rx="10"/>
  <text class="d-text" x="160" y="80" text-anchor="middle">*ngIf, else template</text>
  <path class="d-edge-accent" d="M 296 75 L 424 75" marker-end="url(#cf2-arrow)"/>
  <rect class="d-box-accent" x="430" y="50" width="260" height="50" rx="10"/>
  <text class="d-text d-accent" x="560" y="80" text-anchor="middle">@if, @else if, @else</text>
  <rect class="d-box-muted" x="30" y="130" width="260" height="50" rx="10"/>
  <text class="d-text" x="160" y="160" text-anchor="middle">*ngFor, optional trackBy</text>
  <path class="d-edge-accent" d="M 296 155 L 424 155" marker-end="url(#cf2-arrow)"/>
  <rect class="d-box-accent" x="430" y="130" width="260" height="50" rx="10"/>
  <text class="d-text d-accent" x="560" y="160" text-anchor="middle">@for, required track, @empty</text>
  <rect class="d-box-muted" x="30" y="210" width="260" height="50" rx="10"/>
  <text class="d-text" x="160" y="240" text-anchor="middle">ngSwitch, ngSwitchCase</text>
  <path class="d-edge-accent" d="M 296 235 L 424 235" marker-end="url(#cf2-arrow)"/>
  <rect class="d-box-accent" x="430" y="210" width="260" height="50" rx="10"/>
  <text class="d-text d-accent" x="560" y="240" text-anchor="middle">@switch, @case, @default</text>
</svg>

The left column is three directive classes you import from <code>@angular/common</code>; the right column is three blocks the template compiler understands with no import.

### <code>*ngIf</code> to <code>@if</code>

\`\`\`html
<!-- before -->
<p *ngIf="user() as u; else signedOut">Signed in as {{ u }}</p>
<ng-template #signedOut><p>Please sign in</p></ng-template>

<!-- after -->
@if (user(); as u) {
  <p>Signed in as {{ u }}</p>
} @else {
  <p>Please sign in</p>
}
\`\`\`

The condition moves into parentheses, the alias needs a **semicolon** before <code>as</code>, and the else branch is inline instead of a named [<code>ng-template</code>](/interview-question/what-are-ng-container-and-ng-template). A chain that used nested <code>*ngIf</code>s can become <code>@else if (...)</code>, which had no equivalent before.

### <code>*ngFor</code> to <code>@for</code>

\`\`\`html
<!-- before -->
<li *ngFor="let t of tickets(); trackBy: byId; let i = index; let odd = odd">...</li>

<!-- after -->
@for (t of tickets(); track t.id; let i = $index, odd = $odd) {
  <li>...</li>
}
\`\`\`

📌 **Interview term: Implicit loop variables** — values Angular provides for each row. In <code>@for</code> they are <code>$index</code>, <code>$first</code>, <code>$last</code>, <code>$even</code>, <code>$odd</code> and <code>$count</code>, usable directly or renamed with <code>let</code>. The <code>*ngFor</code> names had no dollar sign (<code>index</code>, <code>odd</code>, ...).

<code>track</code> is mandatory; omitting it fails compilation with <code>NG5002: @for loop must have a "track" expression</code>. The [trackBy question](/interview-question/what-is-trackby-in-ngfor-and-why-use-it) explains what the key is for, and [why @for requires track](/interview-question/why-does-for-require-track-and-how-does-empty-improve-ux) shows what goes wrong with a bad one.

### <code>ngSwitch</code> to <code>@switch</code>

\`\`\`html
<!-- before -->
<ng-container [ngSwitch]="t.priority">
  <b *ngSwitchCase="'high'">[urgent]</b>
  <i *ngSwitchDefault>[later]</i>
</ng-container>

<!-- after -->
@switch (t.priority) {
  @case ("high") { <b>[urgent]</b> }
  @default { <i>[later]</i> }
}
\`\`\`

The host element that carried <code>[ngSwitch]</code> is no longer needed for the switch itself.

## 3. Verified: before and after render the same thing

The two examples on this page are the same component written both ways. Both were compiled with strict templates and driven by the same script (sign out, then close all tickets). The output was **byte-identical** for both files, in AOT and in playground mode. Lines are the root text content, so adjacent elements run together:

\`\`\`
RENDERED  : Signed in as ada@example.com 0: Login broken [urgent] 1 (odd): Typo in footer [later]Sign outClose all
sign out  : Please sign in 0: Login broken [urgent] 1 (odd): Typo in footer [later]Sign outClose all
close all : Please sign inInbox zeroSign outClose all
\`\`\`

The "after" file has no import from <code>@angular/common</code> at all.

## 4. Verified: what the official schematic rewrites

📌 **Interview term: Schematic** — a code transformation shipped with an Angular package and run through the CLI. The control flow migration lives in <code>@angular/core</code> as <code>control-flow-migration</code> (alias <code>control-flow</code>), described in its <code>collection.json</code> as "Converts the entire application to block control flow syntax".

Run on CLI 22.2.3 against a component using all three [directives](/interview-question/what-is-a-directive-and-what-are-the-types):

\`\`\`
$ ng generate @angular/core:control-flow --path src/app
UPDATE src/app/legacy.ts (701 bytes)
\`\`\`

The template it produced, unedited:

\`\`\`html
@if (user; as u) {
  <p>Hi {{ u.name }}</p>
} @else {
  <p>Please sign in</p>
}
@for (t of todos; track byId(i, t); let i = $index; let last = $last) {
  <li>{{ i }}: {{ t.title }}</li>
}
<div>
  @switch (status) {
    @case ('ok') {
      <span>All good</span>
    }
    @default {
      <span>Unknown</span>
    }
  }
</div>
\`\`\`

Observations worth repeating in an interview:

- **Imports were cleaned up.** <code>imports: [NgIf, NgFor, NgSwitch, NgSwitchCase, NgSwitchDefault]</code> became <code>imports: []</code>.
- **<code>trackBy</code> became a call inside <code>track</code>:** <code>track byId(i, t)</code>. It keeps the old identity function working; replacing it with <code>track t.id</code> is a sensible manual follow-up.
- **The <code>[ngSwitch]</code> host element stayed** as a plain <code>&lt;div&gt;</code>, so the DOM structure and CSS do not change.
- **An else template used elsewhere is duplicated, not moved.** In a second run, <code>#spinner</code> was both the else of an <code>*ngIf</code> and the input of an [<code>*ngTemplateOutlet</code>](/interview-question/what-is-ngtemplateoutlet). The schematic copied its content into <code>@else</code> and kept the original <code>ng-template</code>, so the same markup now lives in two places. Worth tidying by hand.

## 5. Side by Side: the details people get wrong

| Topic | Directive version | Block version |
| :--- | :--- | :--- |
| Alias | <code>*ngIf="user as u"</code> | <code>@if (user; as u)</code> |
| Else | <code>; else tpl</code> + <code>&lt;ng-template #tpl&gt;</code> | <code>} @else {</code> |
| Else-if | Nested <code>*ngIf</code> | <code>} @else if (cond) {</code> |
| Loop key | <code>trackBy: fn</code>, optional | <code>track expr</code>, required |
| Empty list | Extra <code>*ngIf="!list.length"</code> | <code>@empty { }</code> |
| <code>null</code> list | Renders nothing | Renders <code>@empty</code> |
| Index | <code>let i = index</code> | <code>let i = $index</code> or <code>$index</code> directly |
| Switch value | String literal needs inner quotes: <code>"'high'"</code> | Normal expression: <code>("high")</code> |
| Import | <code>NgIf</code>, <code>NgFor</code>, ... or <code>CommonModule</code> | None |

The <code>null</code> row was checked directly: an <code>*ngFor</code> over a <code>null</code> signal rendered nothing, and an <code>@for</code> over <code>[]</code>, <code>null</code> and <code>undefined</code> rendered its <code>@empty</code> branch each time.

## 6. A Safe Migration Plan

1. **Run the schematic per folder** with <code>--path</code>, so each pull request is reviewable.
2. **Rebuild with strict templates.** One trap to expect: <code>@if (user()) { {{ user().name }} }</code> fails with <code>TS2531: Object is possibly 'null'</code>, because a [signal](/interview-question/what-are-angular-signals) call is not narrowed between two reads. Use the alias, <code>@if (user(); as u)</code>, and read <code>u</code>.
3. **Review every <code>track</code>.** Replace <code>track $index</code> and <code>track byId(i, t)</code> with a stable key where the list is reordered, filtered or refetched.
4. **Look for duplicated templates** where an else template was also used elsewhere.
5. **Run tests for list-heavy screens.** See [testing the new control flow](/interview-question/how-do-you-test-signal-components-defer-blocks-and-new-control-flow-in-2025).
6. **Leave custom structural directives alone.** The schematic only knows the built-in three.

The old directives are <code>@deprecated 20.0</code> in the 22.2.3 typings with "Intent to remove in a future major release", so there is no emergency, but new code should use blocks.

## 7. Common Pitfalls

- **Writing <code>@if (user as u)</code>.** The semicolon is required: <code>@if (user; as u)</code>. The <code>*ngIf</code> habit is the single most common typo.
- **Keeping <code>index</code> without the dollar sign.** Inside <code>@for</code> the variable is <code>$index</code>; a bare <code>index</code> is looked up on the component instead (verified: <code>TS2339: Property 'index' does not exist on type 'X'</code>).
- **Accepting <code>track $index</code> as "done".** It compiles, but it ties row DOM and state to position rather than identity. See [why @for requires track](/interview-question/why-does-for-require-track-and-how-does-empty-improve-ux).
- **Expecting the schematic to touch custom directives** like <code>*appHasRole</code>. It does not, and it should not; those remain [structural directives](/interview-question/what-is-a-directive-and-what-are-the-types).
- **Removing <code>CommonModule</code> blindly afterwards.** Templates may still use <code>NgClass</code>, <code>NgTemplateOutlet</code> or [pipes](/interview-question/what-are-pipes-in-angular) such as <code>date</code>. The schematic removed only the control flow directives.
- **Assuming switch semantics changed.** In v22 both <code>ngSwitch</code> and <code>@switch</code> match with <code>===</code>; verified, a <code>"1"</code> case fell through to the default for the number 1 in both.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The mapping:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">*ngIf</code> becomes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@if</code> with inline <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@else</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">*ngFor</code> becomes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@for</code> with a required <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">track</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngSwitch</code> becomes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@switch</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@case</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@default</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Syntax details:</strong> <span style="color:#f0e2c8;">"Conditions go in parentheses, the alias is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@if (x; as y)</code>, and loop variables gain a dollar sign, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$index</code> instead of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">index</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The tool:</strong> <span style="color:#f0e2c8;">"I run <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ng generate @angular/core:control-flow</code>, path by path. It rewrites the templates, turns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">trackBy: byId</code> into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">track byId($index, item)</code>, and removes the unused <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NgIf</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NgFor</code> imports."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Safety:</strong> <span style="color:#f0e2c8;">"The old directives are deprecated since v20 but still work in v22, so I can migrate one feature at a time, rebuild with strict templates, and run the tests for list-heavy screens."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The follow-up:</strong> <span style="color:#f0e2c8;">"After the schematic, I replace <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">track $index</code> or trackBy calls with a real key like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">track item.id</code>, because that is what preserves DOM and state."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens to <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&lt;ng-template #elseBlock&gt;</code> after migration?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It copies the template content into the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@else</code> branch. Verified on CLI 22.2.3: when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">#signedOut</code> was used only as the else, the named template disappeared; when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">#spinner</code> was also used by an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">*ngTemplateOutlet</code>, its content was copied into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@else</code> and the original <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ng-template</code> was kept, so the markup now lives in two places.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does the schematic do with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">trackBy</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Verified on CLI 22.2.3: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">trackBy: byId; let i = index</code> became <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">track byId(i, t); let i = $index</code>. It keeps your function working; a direct <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">track t.id</code> is simpler afterwards.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">@switch</code> matching different from <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ngSwitch</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In v22 both are strict equality. A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@case ("1")</code> and an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">*ngSwitchCase="'1'"</code> each fell through to the default when the value was the number 1.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can I mix <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">*ngIf</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">@if</code> in one template?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, they coexist, which is what makes a gradual migration possible. The only requirement is that the old directives are still imported where they are used.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">@for</code> do with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">null</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It treats <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> like an empty list and shows <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@empty</code>, verified with strict templates on a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string[] | null | undefined</code> signal. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">*ngFor</code> with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> list rendered nothing, and had no empty branch to show instead.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Microsyntax** | The mini-language inside a <code>*</code> attribute, such as <code>let t of items; trackBy: fn</code> |
| **Implicit loop variables** | <code>$index</code>, <code>$first</code>, <code>$last</code>, <code>$even</code>, <code>$odd</code>, <code>$count</code> in <code>@for</code> |
| **Schematic** | A CLI-run code transformation; <code>@angular/core:control-flow</code> does this migration |
| **<code>track</code>** | Required <code>@for</code> expression giving each item its identity |
| **<code>@empty</code>** | Branch shown when the <code>@for</code> collection is empty, <code>null</code> or <code>undefined</code> |
| **Deprecated** | Still works, scheduled for removal in a future major |

---
**Conclusion:** Replacing <code>*ngIf</code>, <code>*ngFor</code> and <code>ngSwitch</code> is mostly a rename with a new grammar: conditions in parentheses, <code>; as</code> for aliases, inline <code>@else</code>, dollar-prefixed loop variables and a mandatory <code>track</code>. On 22.2.3 the official <code>control-flow</code> schematic does the mechanical part, including removing the unused imports and wrapping an old <code>trackBy</code> in a <code>track</code> call, and the before and after components rendered identical output. The judgement calls are yours: choose real <code>track</code> keys, tidy duplicated templates, and test list screens, knowing the deprecated directives still work while you finish.`,
    examples: [
      {
        label: "Before: *ngIf with else, *ngFor with trackBy, and ngSwitch",
        tech: "angular",
        runnable: true,
        code: `import { Component, signal } from "@angular/core";
import { NgFor, NgIf, NgSwitch, NgSwitchCase, NgSwitchDefault } from "@angular/common";

type Ticket = { id: number; title: string; priority: "high" | "low" };

// BEFORE: structural directives (deprecated since v20, still working in v22).
@Component({
  selector: "app-root",
  imports: [NgIf, NgFor, NgSwitch, NgSwitchCase, NgSwitchDefault],
  template: \`
    <p *ngIf="user() as u; else signedOut">Signed in as {{ u }}</p>
    <ng-template #signedOut><p>Please sign in</p></ng-template>

    <ul>
      <li *ngFor="let t of tickets(); trackBy: byId; let i = index; let odd = odd">
        {{ i }}{{ odd ? " (odd)" : "" }}: {{ t.title }}
        <ng-container [ngSwitch]="t.priority">
          <b *ngSwitchCase="'high'">[urgent]</b>
          <i *ngSwitchDefault>[later]</i>
        </ng-container>
      </li>
    </ul>
    <p *ngIf="tickets().length === 0">Inbox zero</p>

    <button (click)="user.set(null)">Sign out</button>
    <button (click)="tickets.set([])">Close all</button>
  \`,
})
export class AppComponent {
  user = signal<string | null>("ada@example.com");
  tickets = signal<Ticket[]>([
    { id: 7, title: "Login broken", priority: "high" },
    { id: 9, title: "Typo in footer", priority: "low" },
  ]);
  byId = (_: number, t: Ticket) => t.id;
}`,
      },
      {
        label: "After: the same component with @if, @for and @switch (identical output)",
        tech: "angular",
        runnable: true,
        code: `import { Component, signal } from "@angular/core";

type Ticket = { id: number; title: string; priority: "high" | "low" };

// AFTER: built-in control flow. Same output, no directive imports.
@Component({
  selector: "app-root",
  template: \`
    @if (user(); as u) {
      <p>Signed in as {{ u }}</p>
    } @else {
      <p>Please sign in</p>
    }

    <ul>
      @for (t of tickets(); track t.id; let i = $index, odd = $odd) {
        <li>
          {{ i }}{{ odd ? " (odd)" : "" }}: {{ t.title }}
          @switch (t.priority) {
            @case ("high") { <b>[urgent]</b> }
            @default { <i>[later]</i> }
          }
        </li>
      }
    </ul>
    @if (tickets().length === 0) {
      <p>Inbox zero</p>
    }

    <button (click)="user.set(null)">Sign out</button>
    <button (click)="tickets.set([])">Close all</button>
  \`,
})
export class AppComponent {
  user = signal<string | null>("ada@example.com");
  tickets = signal<Ticket[]>([
    { id: 7, title: "Login broken", priority: "high" },
    { id: 9, title: "Typo in footer", priority: "low" },
  ]);
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Why does @for require track and how does @empty improve UX?",
    seoDescription:
      "Why Angular makes track mandatory in @for: DOM reuse, row state, NG0955 and NG0956 warnings, choosing a key, and how @empty replaces an empty check.",
    description: `**Question presented to candidate:**
"In Angular's \`@for\` block, \`track\` is mandatory, unlike the old \`trackBy\`. Why did the team make it required, what should you track by, and what does the \`@empty\` block give you?"

**What a strong answer should cover:**
- \`track\` gives each item an **identity**, so Angular can match old rows to new rows and **move or keep** their DOM instead of destroying and recreating it.
- Without a good key, a refetch that returns new objects recreates every row, losing focus, input text, scroll position, animations and child component state.
- Good keys: a stable unique id (\`track item.id\`). \`track $index\` is only right for static lists; \`track item\` (identity) fails when objects are recreated.
- Dev-mode diagnostics: **NG0955** (duplicate keys) and **NG0956** (the whole collection was recreated).
- Making \`track\` mandatory fixes the most common performance mistake of \`*ngFor\`, where \`trackBy\` was optional and usually forgotten.
- \`@empty\` renders when the collection is empty, \`null\` or \`undefined\`, so an empty state needs no separate \`@if\` and cannot drift out of sync with the loop.

**Clarifying questions expected:**
- "Does the data come from an API that returns fresh objects on every call?"
- "Can the list be reordered, filtered or edited in place?"

**Code / implementation expected:** Yes — a list showing the difference between a real key and \`$index\`, with an \`@empty\` state.`,
    answer: `**Target Audience:** Developers using <code>@for</code> who want to understand what <code>track</code> really does, and how to choose it, beyond "the compiler makes me".
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. Every DOM-reuse count, warning message and rendered output below was produced on Angular 22.2.3 by compiling the code with <code>ngc</code> (strict templates), running it in jsdom, and tagging DOM nodes so reused and recreated nodes could be counted.

## 1. Why This Even Matters — A Story First

A primary school teacher has 30 coats on 30 numbered hooks. Every afternoon the class lines up in a different order. Teacher A hands out coats **by hook number**: the first child in line gets the coat from hook 1, the second child gets hook 2. Quick, but most children go home in someone else's coat. Teacher B hands out coats **by name tag**: whoever is "Priya" gets Priya's coat, wherever she stands in line.

Teacher C cannot read the name tags at all. So every afternoon she throws all the coats in a bin and buys 30 new ones. Everyone gets a coat that fits, but it is wildly expensive and every child loses whatever was in their pockets.

<code>@for</code> faces this problem every time a list changes. **<code>track</code> is the name tag.** <code>track item.id</code> is Teacher B. <code>track $index</code> is Teacher A. A key that cannot recognise items, like object identity when your API returns fresh objects, is Teacher C. Angular makes you choose a teacher explicitly, because the default with <code>*ngFor</code> (no [<code>trackBy</code>](/interview-question/what-is-trackby-in-ngfor-and-why-use-it)) quietly hired Teacher C.

## 2. The Core Idea

📌 **Interview term: Tracking expression** — the expression after <code>track</code>. Angular evaluates it for every item and uses the result as that item's **key**. On the next change, rows whose keys still exist are **kept** (and moved if needed), rows whose keys vanished are **destroyed**, and rows with new keys are **created**.

📌 **Interview term: List reconciliation** — the process of comparing the previous list with the new one and working out the minimum set of DOM moves, inserts and removals. In compiled code the <code>@for</code> block becomes a <code>ɵɵrepeater</code> instruction, and the tracking expression is hoisted into a plain function such as <code>const _forTrack0 = ($index, $item) =&gt; $item.id;</code> (read from <code>ngc</code> output).

<svg class="iq-diagram" width="100%" viewBox="0 0 720 280" role="img" aria-label="Rows are matched by key, kept rows move, a missing key is destroyed and a new key is created">
  <defs>
    <marker id="trk-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="150" y="28" text-anchor="middle">Old list (keys)</text>
  <text class="d-text" x="570" y="28" text-anchor="middle">New list (keys)</text>
  <rect class="d-box-muted" x="70" y="50" width="160" height="44" rx="10"/>
  <text class="d-text" x="150" y="77" text-anchor="middle">id 1</text>
  <rect class="d-box" x="70" y="130" width="160" height="44" rx="10"/>
  <text class="d-text" x="150" y="157" text-anchor="middle">id 2</text>
  <rect class="d-box" x="70" y="210" width="160" height="44" rx="10"/>
  <text class="d-text" x="150" y="237" text-anchor="middle">id 3</text>
  <rect class="d-box" x="490" y="50" width="160" height="44" rx="10"/>
  <text class="d-text" x="570" y="77" text-anchor="middle">id 2</text>
  <rect class="d-box" x="490" y="130" width="160" height="44" rx="10"/>
  <text class="d-text" x="570" y="157" text-anchor="middle">id 3</text>
  <rect class="d-box-accent" x="490" y="210" width="160" height="44" rx="10"/>
  <text class="d-text d-accent" x="570" y="237" text-anchor="middle">id 4 (created)</text>
  <path class="d-edge-accent" d="M 236 152 L 484 74" marker-end="url(#trk-arrow)"/>
  <path class="d-edge-accent" d="M 236 232 L 484 154" marker-end="url(#trk-arrow)"/>
  <text class="d-sub" x="360" y="157" text-anchor="middle">kept, moved up</text>
  <path class="d-edge-dashed" d="M 236 66 L 290 66"/>
  <text class="d-sub" x="300" y="70">destroyed</text>
</svg>

Removing the first item with a real key means two rows keep their DOM and simply move, one row is destroyed and one is created. With <code>track $index</code>, Angular would instead keep positions 0 and 1, rewrite their text, and destroy position 2.

## 3. Verified: how many rows survive a refetch

The most common real-world change is a **refetch**: the server returns the same three users, but as brand-new JavaScript objects. Five lists rendered the same [signal](/interview-question/what-are-angular-signals). Every <code>&lt;li&gt;</code> was tagged with a number after the first render, then the data was replaced. <code>#new</code> means Angular threw the old element away and created a new one:

\`\`\`
initial (node ids)
  byId       Ada#1 Grace#2 Linus#3     reused 3/3
  byIndex    Ada#4 Grace#5 Linus#6     reused 3/3
  byRef      Ada#7 Grace#8 Linus#9     reused 3/3
  ngForNone  Ada#10 Grace#11 Linus#12  reused 3/3
  ngForTb    Ada#13 Grace#14 Linus#15  reused 3/3
NG0956: The configured tracking expression (track by identity) caused re-creation of the entire
collection of size 3. This is an expensive operation requiring destruction and subsequent creation
of DOM nodes, directives, components etc. Please review the "track expression" and make sure that
it uniquely identifies items in a collection.
after refetch (same data, new objects)
  byId       Ada#1 Grace#2 Linus#3     reused 3/3
  byIndex    Ada#4 Grace#5 Linus#6     reused 3/3
  byRef      Ada#new Grace#new Linus#new  reused 0/3
  ngForNone  Ada#new Grace#new Linus#new  reused 0/3
  ngForTb    Ada#13 Grace#14 Linus#15  reused 3/3
\`\`\`

Here <code>byId</code> is <code>track u.id</code>, <code>byIndex</code> is <code>track $index</code>, <code>byRef</code> is <code>track u</code>, and the last two are <code>*ngFor</code> without and with a <code>trackBy</code>. Two lessons: identity tracking rebuilds everything on a refetch (and Angular says so in dev mode with **NG0956**), and an <code>*ngFor</code> with no <code>trackBy</code> did exactly the same, silently. That silent default is the reason <code>track</code> is now required.

Then the list was reversed:

\`\`\`
after reverse
  byId       Linus#3 Grace#2 Ada#1     reused 3/3
  byIndex    Linus#4 Grace#5 Ada#6     reused 3/3
\`\`\`

With <code>track u.id</code> the Linus element *is* the old Linus element, just moved. With <code>track $index</code> element #4, which used to show Ada, now shows Linus.

## 4. Verified: why "the text was rewritten" matters

Rewriting text sounds harmless. It stops being harmless when a row holds **state that is not in your data**: what someone typed into an input, focus, a checkbox, an open dropdown, a child component's signals, a running animation. The runnable example on this page renders the same task list twice, once with <code>track t.id</code> and once with <code>track $index</code>. A note was typed into the first row of each, then "Done with first" removed that task:

\`\`\`
typed a note on Write tests:
  track t.id   : Write tests=[needs review]  Fix bug=[]  Ship it=[]
  track $index : Write tests=[needs review]  Fix bug=[]  Ship it=[]
after Done with first:
  track t.id   : Fix bug=[]  Ship it=[]
  track $index : Fix bug=[needs review]  Ship it=[]
after the other two:
  track t.id   : All done. Nice work!
  track $index : All done. Nice work!
\`\`\`

With <code>track $index</code>, the note "needs review" now sits next to "Fix bug", a task nobody reviewed. No error, no warning, just wrong UI. That is the worst kind of bug in an interview story, and the best argument for a real key.

## 5. Choosing a Key

| Track by | Keeps DOM on refetch | Correct on reorder / remove | Use when |
| :--- | :--- | :--- | :--- |
| <code>item.id</code> (stable unique id) | Yes | Yes | Almost always |
| <code>$index</code> | Yes | No, state stays at the position | Static lists that never reorder or delete, with no row state |
| <code>item</code> (object identity) | No, rebuilds all (NG0956) | Yes | Same object instances kept between updates |
| A function, <code>keyOf(item)</code> | Depends on what it returns | Depends | Composite keys, or a migrated <code>trackBy</code> |

📌 **Interview term: NG0955** — the dev-mode warning for **duplicate keys**. Verified with two items sharing <code>id: 7</code>:

\`\`\`
NG0955: The provided track expression resulted in duplicated keys for a given collection.
Adjust the tracking expression such that it uniquely identifies all the items in the collection.
Duplicated keys were:
key "7" at index "0" and "1".
\`\`\`

Both rows still rendered; the warning is about reconciliation being unreliable, not a crash. In the 22.2.3 runtime source both checks sit behind an <code>ngDevMode</code> guard, so production builds never print them, and NG0956 is only checked when the track expression is the item itself (identity tracking). A bad <code>track item.name</code> that rebuilds rows will not be flagged for you.

## 6. How <code>@empty</code> Improves the Experience

📌 **Interview term: Empty state** — what a list shows when there is nothing to list: "No results", "Your basket is empty", a call to action. Good UX treats it as a real screen, not a blank space.

With <code>*ngFor</code>, an empty state needed a second, separate condition:

\`\`\`html
<li *ngFor="let r of results">{{ r }}</li>
<li *ngIf="!results?.length">No results</li>
\`\`\`

Two expressions over the same data can drift apart (someone changes one and not the other), and a <code>null</code> list needs optional chaining. <code>@empty</code> is part of the loop itself:

\`\`\`html
@for (r of results(); track r) {
  <li>{{ r }}</li>
} @empty {
  <li class="empty">No results</li>
}
\`\`\`

Verified with a <code>string[] | null | undefined</code> signal under strict templates, setting it to each value in turn and printing the list markup:

\`\`\`
[]         <li class="empty">No results</li>
null       <li class="empty">No results</li>
undefined  <li class="empty">No results</li>
\`\`\`

So <code>@empty</code> covers "no data yet" and "no matching data" in one place. It does **not** distinguish loading from empty; if you need a spinner, wrap the loop in an <code>@if</code> on a loading flag (the [control flow overview](/interview-question/explain-the-new-control-flow-if-for-switch-and-how-it-compares-to-structural-dir) shows that pattern), or use <code>@defer</code> with <code>@loading</code> ([deferrable views](/interview-question/what-are-deferrable-views-defer-and-how-do-they-work-in-angular-17)).

## 7. Common Pitfalls

- **<code>track $index</code> to make the compiler stop complaining.** It compiles, it looks fine in a demo, and it attaches typed text, focus and child state to the wrong item once the list changes, as shown in section 4.
- **<code>track item</code> with API data.** Every refetch returns new objects, so every row is rebuilt. Watch the console for <code>NG0956</code>.
- **Keys that are not unique.** Names, titles or <code>Math.random()</code>. Duplicates trigger <code>NG0955</code>; a random key is different on every evaluation, so no row can ever be matched.
- **Using a key that can change.** Tracking by <code>item.name</code> when the user can rename the item turns a rename into destroy plus create.
- **A separate empty <code>@if</code> next to <code>@for</code>.** Prefer <code>@empty</code>; it handles <code>null</code> and cannot disagree with the loop.
- **Treating <code>@empty</code> as a loading indicator.** Empty and loading are different states; show "No results" only once loading has finished.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Why track exists:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">track</code> tells Angular which old row and which new row are the same item, so it can keep or move existing DOM instead of rebuilding it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why mandatory:</strong> <span style="color:#f0e2c8;">"With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">*ngFor</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">trackBy</code> was optional and usually forgotten, so every refetch recreated every row. Making <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">track</code> required removes that default."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. What to track:</strong> <span style="color:#f0e2c8;">"A stable unique id, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">track item.id</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$index</code> only for lists that never reorder, and identity only if the objects themselves never change."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The symptoms:</strong> <span style="color:#f0e2c8;">"A bad key either rebuilds everything, which Angular warns about as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NG0956</code>, or keeps state at the wrong position, like a typed note jumping to the next row."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. @empty:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@empty</code> shows a proper empty state when the list is empty, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code>, with no separate <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@if</code> that could disagree with the loop."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What exactly breaks with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">track $index</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Row state stays at the position, not with the item. Verified: after typing in the first row and removing the first item, the note appeared next to the item that moved up. The DOM was reused, just for the wrong data.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens with duplicate keys?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Angular logs <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NG0955: The provided track expression resulted in duplicated keys</code> in dev mode, naming the key and the indexes. It still renders, but row matching is unreliable, so fix the key.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">track item</code> ever correct?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, when the same object instances are kept and only the array changes, for example reordering an immutable list of the same objects. With API data that returns new objects, it recreates every row and triggers <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NG0956</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">track</code> call a function?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">track</code> takes any expression, such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">track keyOf(item)</code>. The migration schematic uses that to wrap old <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">trackBy</code> functions, but a direct property is easier to read.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">@empty</code> better than <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">@if (!list.length)</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is tied to the same collection the loop reads, so the two cannot disagree. It also handles <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code>, where <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list.length</code> would throw or need optional chaining.</span>
</div>

</div>

For the <code>*ngFor</code> side of this story, see [trackBy in ngFor](/interview-question/what-is-trackby-in-ngfor-and-why-use-it); for the migration from <code>*ngFor</code> to <code>@for</code>, see [how the new control flow replaces *ngIf and *ngFor](/interview-question/how-does-the-new-control-flow-if-for-switch-replace-ngif-and-ngfor).

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Tracking expression** | The <code>track</code> expression; its value is each item's key |
| **List reconciliation** | Matching old rows to new rows and applying the minimum DOM changes |
| **<code>$index</code>** | The item's position; a poor key when the list reorders or shrinks |
| **NG0955** | Dev-mode warning: the track expression produced duplicate keys |
| **NG0956** | Dev-mode warning: the whole collection was destroyed and recreated |
| **Empty state** | The UI shown when a list has no items |
| **<code>@empty</code>** | The <code>@for</code> branch for an empty, <code>null</code> or <code>undefined</code> collection |

---
**Conclusion:** <code>track</code> is the name tag that lets Angular recognise an item across changes. On 22.2.3, <code>track u.id</code> kept all three rows through a refetch and simply moved them on a reverse, while identity tracking and a bare <code>*ngFor</code> rebuilt every row, and <code>track $index</code> kept the DOM but left a typed note next to the wrong task. Making <code>track</code> mandatory turns the old silent default into a deliberate choice, and <code>@empty</code> puts the empty state inside the loop, covering empty, <code>null</code> and <code>undefined</code> collections without a second condition that can drift.`,
    examples: [
      {
        label: "track t.id vs track $index with per-row input state, plus @empty",
        tech: "angular",
        runnable: true,
        code: `import { Component, signal } from "@angular/core";

type Task = { id: number; title: string };

// Type a note next to "Write tests", then click "Done with first".
// The left list keeps the note with its task; the right list leaves it behind.
@Component({
  selector: "app-root",
  template: \`
    <div style="display: flex; gap: 32px">
      <section id="good">
        <h4>track t.id</h4>
        @for (t of tasks(); track t.id) {
          <p>{{ t.title }} <input placeholder="note" /></p>
        } @empty {
          <p class="empty">All done. Nice work!</p>
        }
      </section>
      <section id="bad">
        <h4>track $index</h4>
        @for (t of tasks(); track $index) {
          <p>{{ t.title }} <input placeholder="note" /></p>
        } @empty {
          <p class="empty">All done. Nice work!</p>
        }
      </section>
    </div>
    <button (click)="tasks.update(list => list.slice(1))">Done with first</button>
  \`,
})
export class AppComponent {
  tasks = signal<Task[]>([
    { id: 1, title: "Write tests" },
    { id: 2, title: "Fix bug" },
    { id: 3, title: "Ship it" },
  ]);
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is trackBy in ngFor and why use it?",
    seoDescription:
      "trackBy gives *ngFor a key per item so refetched data reuses DOM instead of rebuilding it. Measured row counts, the this trap, and @for track.",
    description: `**Question presented to candidate:**
"Our product table uses \`*ngFor\` and polls the API every few seconds. Users complain the table flickers and loses their selection. What is \`trackBy\`, how would it help, and what is its equivalent in modern Angular?"

**What a strong answer should cover:**
- By default \`*ngFor\` tracks items by **object identity**, so an API response full of new objects looks like a completely new list: every row is destroyed and recreated.
- \`trackBy\` is a function \`(index, item) => key\` that tells the differ which items are "the same", so existing rows are kept and only their bindings update.
- Benefits: fewer DOM operations, preserved focus/selection/input state, child components keep their state, CSS transitions do not restart.
- The key must be **stable and unique** (an id), not the index for lists that reorder.
- Gotcha: the function is called with \`this\` bound to the differ, not the component, so use an arrow function or avoid \`this\`.
- Modern Angular: \`*ngFor\` is deprecated since v20; \`@for\` makes the same idea mandatory with \`track item.id\`.

**Clarifying questions expected:**
- "Do the items have a unique id from the backend?"
- "Is the app still on \`*ngFor\`, or can we move this table to \`@for\`?"

**Code / implementation expected:** Yes — a \`trackBy\` function on the component and its use in the template.`,
    answer: `**Target Audience:** Developers working with <code>*ngFor</code> lists, especially lists refreshed from an API, and anyone preparing for the classic Angular performance question.
**Difficulty:** Easy to Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. The row-creation counts, the <code>this</code> behaviour and the deprecation notes below were produced on Angular 22.2.3: the example was AOT-compiled with <code>ngc</code> (strict templates) and run in jsdom, and the API notes were read from the installed typings.

## 1. Why This Even Matters — A Story First

A hotel receptionist checks guests in every evening. The hotel system sends her a fresh printout of tonight's guest list every five minutes. Most of the names are the same as five minutes ago; one guest changed rooms.

A careless receptionist sees a new sheet of paper and assumes everyone on it is new. She cancels every room key, tears up every welcome note, and issues new ones. Guests who were halfway through unpacking find their key no longer works. A sensible receptionist looks at the **booking number** on each line, sees that 41 of the 42 bookings are unchanged, and only updates the one room that moved.

<code>*ngFor</code> is the receptionist, and by default it is the careless one: it compares list items by **object identity**, and a fresh API response is a fresh sheet of paper. <code>trackBy</code> is the instruction "look at the booking number".

## 2. The Core Idea

📌 **Interview term: <code>trackBy</code>** — an input of the <code>NgForOf</code> [directive](/interview-question/what-is-a-directive-and-what-are-the-types) (written <code>trackBy:</code> in the <code>*ngFor</code> microsyntax) that takes a function <code>(index: number, item: T) =&gt; unknown</code>. Its return value is used as the item's identity instead of the object reference.

📌 **Interview term: <code>IterableDiffer</code>** — the helper <code>*ngFor</code> uses on every change detection pass to compare the previous list with the current one and produce a list of operations: add, remove, move, or identity change. <code>trackBy</code> changes what "the same item" means to the differ.

The 22.2.3 typings describe the problem in the directive's own documentation: a custom <code>TrackByFunction</code> "is useful to provide good user experience in cases when items in an iterable rendered using <code>NgForOf</code> have a natural identifier (for example, custom ID or a primary key), and this iterable could be updated with new object instances that still represent the same underlying entity (for example, when data is re-fetched from the server ...)".

\`\`\`ts
// component
bySku(index: number, p: Product): string {
  return p.sku;
}
\`\`\`

\`\`\`html
<!-- template -->
<li *ngFor="let p of products(); trackBy: bySku">{{ p.name }} {{ p.price }}</li>
\`\`\`

## 3. What Happens on a Refresh

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="Without trackBy new objects mean new rows, with trackBy matching keys keep their rows">
  <defs>
    <marker id="tb-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="250" y="20" width="220" height="50" rx="10"/>
  <text class="d-text" x="360" y="50" text-anchor="middle">API returns new objects</text>
  <path class="d-edge" d="M 300 74 L 180 120" marker-end="url(#tb-arrow)"/>
  <path class="d-edge-accent" d="M 420 74 L 540 120" marker-end="url(#tb-arrow)"/>
  <text class="d-text" x="180" y="146" text-anchor="middle">No trackBy</text>
  <rect class="d-box" x="60" y="166" width="240" height="44" rx="10"/>
  <text class="d-sub" x="180" y="193" text-anchor="middle">identity differs for every item</text>
  <path class="d-edge" d="M 180 214 L 180 236" marker-end="url(#tb-arrow)"/>
  <rect class="d-box-muted" x="60" y="242" width="240" height="44" rx="10"/>
  <text class="d-sub" x="180" y="269" text-anchor="middle">destroy all rows, create all rows</text>
  <text class="d-text" x="540" y="146" text-anchor="middle">trackBy: bySku</text>
  <rect class="d-box" x="420" y="166" width="240" height="44" rx="10"/>
  <text class="d-sub" x="540" y="193" text-anchor="middle">same sku means same item</text>
  <path class="d-edge-accent" d="M 540 214 L 540 236" marker-end="url(#tb-arrow)"/>
  <rect class="d-box-accent" x="420" y="242" width="240" height="44" rx="10"/>
  <text class="d-sub d-accent" x="540" y="269" text-anchor="middle">keep rows, update bindings</text>
</svg>

Both paths end with the correct prices on screen. The difference is the work done to get there and what is lost along the way: focus, selection, scroll position inside a row, a child component's state, and any running CSS transition.

## 4. Verified: counting the rows Angular creates

The runnable example renders the same product list twice, once plainly and once with <code>trackBy: bySku</code>. A tiny directive on each <code>&lt;li&gt;</code> counts how many times Angular creates a row element. "Refresh prices" simulates a poll: it returns the **same three products as brand-new objects** with prices bumped by one. Driven in jsdom:

\`\`\`
after first render : *ngFor without trackBy: 3 rows created | *ngFor with trackBy: 3 rows created
after 1 refresh    : *ngFor without trackBy: 6 rows created | *ngFor with trackBy: 3 rows created
after 3 refreshes  : *ngFor without trackBy: 12 rows created | *ngFor with trackBy: 3 rows created
prices shown       : Desk 203Chair 93Lamp 33 | Desk 203Chair 93Lamp 33
\`\`\`

Without <code>trackBy</code>, each refresh threw away all three rows and built three new ones: 3, 6, 12. With <code>trackBy</code>, the original three row elements survived all three refreshes and only their text bindings changed. Both lists ended up showing identical prices, which is the point: <code>trackBy</code> does not change *what* you see, it changes *how much is rebuilt* to show it.

In a real table each row might hold a checkbox, a dropdown or a child component. Rebuilding the row resets all of that. That is the "flicker and lost selection" in the interview question.

## 5. Verified: the <code>this</code> trap

📌 **Interview term: Unbound method** — a class method passed around as a value loses its <code>this</code>. Angular stores your <code>trackBy</code> function and calls it from inside its differ.

A method that reads a component field was passed as <code>trackBy</code> and logged its own <code>this</code>:

\`\`\`
this is DefaultIterableDiffer
this is DefaultIterableDiffer
\`\`\`

So <code>this.field</code> inside that method read a property of Angular's differ, not your component. It returned <code>undefined</code> for every item, with no error. The fix is to avoid <code>this</code> in the function, or define it as an arrow function property, which captures the component:

\`\`\`ts
byKey = (index: number, p: Product) => p[this.keyField];
\`\`\`

## 6. Choosing What to Return

| Return | Effect when the API returns new objects | Effect when the list reorders or deletes |
| :--- | :--- | :--- |
| Nothing (no <code>trackBy</code>) | Every row recreated | Rows move correctly, but recreated on refetch |
| <code>item.id</code> / <code>item.sku</code> | Rows kept | Rows move with their item |
| <code>index</code> | Rows kept | Rows stay at the position; state attaches to the wrong item |
| Something mutable, like <code>item.name</code> | Rows kept until renamed | Renaming destroys and recreates the row |

The index row is where most "my checkbox jumped to another row" bugs come from; the sibling question [why @for requires track](/interview-question/why-does-for-require-track-and-how-does-empty-improve-ux) reproduces exactly that with typed input text.

## 7. The Modern Equivalent

The <code>NgForOf</code> directive is <code>@deprecated 20.0</code> in the 22.2.3 typings ("Use the <code>@for</code> block instead. Intent to remove in a future major release"), and so is its <code>ngForTrackBy</code> input. Its replacement, [built-in control flow](/interview-question/explain-the-new-control-flow-if-for-switch-and-how-it-compares-to-structural-dir), makes tracking mandatory:

\`\`\`html
@for (p of products(); track p.sku) {
  <li>{{ p.name }} {{ p.price }}</li>
}
\`\`\`

No function on the class, no <code>this</code> trap, and it cannot be forgotten: leaving <code>track</code> out is the compile error <code>NG5002: @for loop must have a "track" expression</code>. Running the official migration keeps an existing <code>trackBy</code> function working by calling it from <code>track</code>; the details are in [how the new control flow replaces *ngIf and *ngFor](/interview-question/how-does-the-new-control-flow-if-for-switch-replace-ngif-and-ngfor).

Because Angular 22 components are OnPush and [zoneless](/interview-question/what-is-zoneless-angular-and-how-does-it-improve-performance-in-angular-18) by default, the example keeps its list in a [signal](/interview-question/what-are-angular-signals) and replaces it with <code>set()</code>; that is also what makes the change visible to [change detection](/interview-question/how-does-change-detection-work-in-angular) in the first place.

## 8. Common Pitfalls

- **No <code>trackBy</code> on a polled or refetched list.** The most common case where it matters, as the 3 / 6 / 12 count shows.
- **Returning the index.** Fine for a static list, wrong for anything that reorders, filters or deletes.
- **Using <code>this</code> inside a <code>trackBy</code> method.** <code>this</code> is the differ, verified above; use an arrow property.
- **Expecting <code>trackBy</code> to skip updates.** Tracked rows are still checked and re-bound; it saves DOM creation, not change detection.
- **Returning a non-unique value.** Two items with the same key confuse the differ; use a real primary key.
- **Writing new code with <code>*ngFor</code>.** In v22 it is deprecated; new templates should use <code>@for</code> with <code>track</code>.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">trackBy</code> is a function you give <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">*ngFor</code> that returns a key for each item, so Angular can tell which items are the same between two versions of the list."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The problem it solves:</strong> <span style="color:#f0e2c8;">"Without it, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">*ngFor</code> compares by object identity. A refetch returns new objects, so every row is destroyed and recreated even when nothing visible changed."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. What you gain:</strong> <span style="color:#f0e2c8;">"Rows are kept and only their bindings update: less DOM work, no flicker, and focus, selection and child component state survive."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. How to write it:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">trackBy: byId</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">byId = (index, item) =&gt; item.id</code>. A stable unique id, not the index, and no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">this</code> inside a method."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Modern Angular:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">*ngFor</code> is deprecated since v20. In <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@for</code> the same idea is built in and required: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">track item.id</code>."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How did you prove <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">trackBy</code> makes a difference?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">I counted row creations with a tiny directive. After three refreshes returning new objects, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">*ngFor</code> without <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">trackBy</code> had created 12 row elements and the tracked one still 3, while both showed the same prices.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just return the index?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The index is stable only if the list never reorders, filters or deletes. Otherwise rows keep their DOM but now show a different item, so typed text or selection ends up on the wrong row.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">this</code> inside a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">trackBy</code> method?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Angular stores the function and calls it from its differ. Verified on 22.2.3: inside a method passed as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">trackBy</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">this</code> was the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DefaultIterableDiffer</code>. Use an arrow function property if you need component fields.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">trackBy</code> stop change detection for rows?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Kept rows are still checked and their bindings update, which is exactly how the prices changed while the rows stayed. It only avoids destroying and recreating views.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does this map to <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">@for</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">trackBy: bySku</code> becomes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">track p.sku</code>. The official migration keeps your function by calling it inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">track</code>; on CLI 22.2.3 a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">trackBy: byId; let i = index</code> became <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">track byId(i, t)</code>, which you can then simplify.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **<code>trackBy</code>** | Function returning a key per item so <code>*ngFor</code> can recognise items |
| **Object identity** | Two references are equal only if they point to the same object |
| **<code>IterableDiffer</code>** | The helper that compares old and new lists for <code>*ngFor</code> |
| **Unbound method** | A method passed as a value, which loses its <code>this</code> |
| **<code>track</code>** | The required <code>@for</code> equivalent of <code>trackBy</code> |

---
**Conclusion:** <code>trackBy</code> tells <code>*ngFor</code> what makes two items the same, so a refetch of identical data does not look like a brand-new list. Measured on 22.2.3, three refreshes of the same three products created 12 row elements without it and kept the original 3 with it, while both lists showed the same prices. Return a stable id, never rely on <code>this</code> inside the function (it is the differ), and in new code use <code>@for</code>, where the same idea is spelled <code>track p.sku</code> and is no longer optional.`,
    examples: [
      {
        label: "*ngFor with and without trackBy: counting the row elements Angular creates on refresh",
        tech: "angular",
        runnable: true,
        code: `import { Directive, Component, Input, signal } from "@angular/core";
import { NgFor } from "@angular/common";

type Product = { sku: string; name: string; price: number };

// Pretend API: every call returns brand-new objects, like JSON from a server.
const fetchProducts = (bump: number): Product[] => [
  { sku: "A1", name: "Desk", price: 200 + bump },
  { sku: "B2", name: "Chair", price: 90 + bump },
  { sku: "C3", name: "Lamp", price: 30 + bump },
];

// Counts how many row DOM elements Angular has created for each list.
export const created = { plain: signal(0), tracked: signal(0) };
@Directive({ selector: "[countRow]" })
export class CountRow {
  // queueMicrotask: never write state in the middle of a render pass.
  @Input() set countRow(list: "plain" | "tracked") {
    queueMicrotask(() => created[list].update((n) => n + 1));
  }
}

@Component({
  selector: "app-root",
  imports: [NgFor, CountRow],
  template: \`
    <h4>*ngFor without trackBy: {{ created.plain() }} rows created</h4>
    <ul><li *ngFor="let p of products()" countRow="plain">{{ p.name }} {{ p.price }}</li></ul>

    <h4>*ngFor with trackBy: {{ created.tracked() }} rows created</h4>
    <ul><li *ngFor="let p of products(); trackBy: bySku" countRow="tracked">{{ p.name }} {{ p.price }}</li></ul>

    <button (click)="refresh()">Refresh prices</button>
  \`,
})
export class AppComponent {
  created = created;
  private bump = 0;
  products = signal(fetchProducts(0));

  // Same items, new object references: only the price changed.
  refresh() {
    this.products.set(fetchProducts(++this.bump));
  }

  // trackBy: tell Angular what makes two items "the same item".
  // Angular calls it with \`this\` set to its differ, not the component: do not use \`this\` here.
  bySku(index: number, p: Product): string {
    return p.sku;
  }
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are ng-container and ng-template?",
    seoDescription:
      "ng-container groups elements without adding a DOM node; ng-template is a blueprint that renders only when stamped out. Verified DOM output and use cases.",
    description: `**Question presented to candidate:**
"You will see \`<ng-container>\` and \`<ng-template>\` all over Angular codebases. What is each one, what ends up in the DOM, and when would you reach for them?"

**What a strong answer should cover:**
- \`ng-container\` is a **logical grouping element**: its children render, but no element is created for it (Angular leaves only a comment anchor).
- \`ng-template\` is a **template definition**: its content does **not** render by itself; it is a \`TemplateRef\` that something must instantiate (\`ngTemplateOutlet\`, a structural directive, \`ViewContainerRef.createEmbeddedView\`).
- Typical \`ng-container\` uses: hosting a directive without an extra element (for example \`*ngTemplateOutlet\`), grouping siblings where a wrapper would break HTML or CSS (inside \`<tbody>\`, \`<select>\`, flex/grid).
- Typical \`ng-template\` uses: reusable fragments, templates passed to child components, the else branch of the old \`*ngIf\`, custom structural directives.
- The \`*\` prefix is sugar for wrapping an element in an \`ng-template\`; only one \`*\` is allowed per element, which is why \`ng-container\` was used to stack them.
- With built-in control flow (\`@if\`, \`@for\`), many old \`ng-container\` / \`ng-template\` wrappers are no longer needed.

**Clarifying questions expected:**
- "Are we on built-in control flow, or still on structural directives?"

**Code / implementation expected:** Yes — a template using both, ideally with \`ngTemplateOutlet\`.`,
    answer: `**Target Audience:** Developers who have seen <code>ng-container</code> and <code>ng-template</code> in templates and want a precise picture of what each does and what ends up in the DOM.
**Difficulty:** Easy to Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. The DOM markup quoted below is the real <code>innerHTML</code> printed after compiling the templates with <code>ngc</code> (strict templates) on Angular 22.2.3 and running them in jsdom; the compiler error was printed by <code>ngc</code> itself.

## 1. Why This Even Matters — A Story First

Think about a removal company. Some boxes are real cardboard boxes: they take up space in the van and the customer has to unpack them. That is a <code>&lt;div&gt;</code>. Sometimes, though, you just want to tape a label around a bundle of chair legs so they travel together; when the bundle arrives, there is no box to throw away, the legs are simply there. That label is **<code>ng-container</code>**: it groups things without adding a box.

Now imagine the company also keeps **flat-pack instructions** for a bookshelf in a drawer. The instructions are not a bookshelf. Nothing appears in anyone's living room until a fitter takes the instructions out and builds one, and the same instructions can build three bookshelves in three rooms. Those instructions are **<code>ng-template</code>**.

Interviewers love this pair because the names look alike and the behaviour is opposite: one always renders its children but no element of its own, the other never renders anything until asked.

## 2. The Core Idea

📌 **Interview term: <code>ng-container</code>** — a grouping element that the Angular compiler understands and the browser never sees. Its children render in place; no element is created for it. Its main jobs are to host a [directive](/interview-question/what-is-a-directive-and-what-are-the-types) or block without an extra wrapper, and to group siblings where a wrapper would break HTML or CSS.

📌 **Interview term: <code>ng-template</code>** — a template definition. Its content is compiled but **not rendered**. Angular turns it into a <code>TemplateRef</code>, a blueprint that code can instantiate any number of times as embedded views. See [ElementRef, TemplateRef and ViewContainerRef](/interview-question/what-is-the-difference-between-elementref-templateref-and-viewcontainerref) for the classes involved.

📌 **Interview term: Comment anchor** — a DOM comment node such as <code>&lt;!--container--&gt;</code> that Angular inserts to remember *where* dynamic content belongs. Comments do not affect layout, CSS selectors like <code>&gt;</code>, or HTML validity.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 280" role="img" aria-label="ng-container renders its children with no wrapper element, ng-template renders nothing until a TemplateRef is instantiated">
  <defs>
    <marker id="ngc-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="180" y="28" text-anchor="middle">ng-container</text>
  <rect class="d-box-muted" x="50" y="48" width="260" height="46" rx="10"/>
  <text class="d-sub" x="180" y="76" text-anchor="middle">ng-container holding two rows</text>
  <path class="d-edge-accent" d="M 180 98 L 180 140" marker-end="url(#ngc-arrow)"/>
  <rect class="d-box-accent" x="50" y="146" width="260" height="46" rx="10"/>
  <text class="d-sub d-accent" x="180" y="174" text-anchor="middle">tr, tr, then a comment</text>
  <text class="d-text" x="540" y="28" text-anchor="middle">ng-template</text>
  <rect class="d-box-muted" x="410" y="48" width="260" height="46" rx="10"/>
  <text class="d-sub" x="540" y="76" text-anchor="middle">ng-template #badge</text>
  <path class="d-edge-dashed" d="M 540 98 L 540 140" marker-end="url(#ngc-arrow)"/>
  <rect class="d-box" x="410" y="146" width="260" height="46" rx="10"/>
  <text class="d-sub" x="540" y="174" text-anchor="middle">only a comment, no content</text>
  <path class="d-edge-accent" d="M 540 196 L 540 220" marker-end="url(#ngc-arrow)"/>
  <rect class="d-box-accent" x="410" y="226" width="260" height="46" rx="10"/>
  <text class="d-sub d-accent" x="540" y="254" text-anchor="middle">rendered when an outlet uses it</text>
</svg>

The left side always shows its children; the right side shows nothing until a <code>TemplateRef</code> is handed to an outlet or a directive, and then it can appear any number of times.

## 3. Verified: what actually lands in the DOM

Four small sections were compiled and rendered, then each section's <code>innerHTML</code> was printed exactly:

\`\`\`html
<section id="a"><ng-container>grouped <b>text</b></ng-container></section>
<section id="b"><ng-template><i>never shown on its own</i></ng-template></section>
<section id="c"><ng-template #tpl><i>stamped</i></ng-template>
  <ng-container *ngTemplateOutlet="tpl" /><ng-container *ngTemplateOutlet="tpl" /></section>
<tbody id="d">@for (r of rows(); track r) {
  <ng-container><tr><td>{{ r }}</td></tr><tr><td>detail {{ r }}</td></tr></ng-container> }</tbody>
\`\`\`

\`\`\`
a => grouped <b>text</b><!--ng-container-->
b => <!--container-->
c => <!--container--><i>stamped</i><!--container--><i>stamped</i><!--container-->
d => <tr><td>x</td></tr><tr><td>detail x</td></tr><!--ng-container--><!--container-->
\`\`\`

Reading those lines:

- **a:** the children rendered and no <code>&lt;ng-container&gt;</code> element exists, only a comment anchor.
- **b:** an <code>ng-template</code> that nobody uses renders **nothing** but its anchor. The <code>&lt;i&gt;</code> was never created.
- **c:** one template, two outlets, **two copies**. A template is a blueprint, not an instance.
- **d:** two <code>&lt;tr&gt;</code> elements sit directly inside <code>&lt;tbody&gt;</code>. A <code>&lt;div&gt;</code> wrapper there would be invalid HTML inside a table body.

## 4. The Asterisk Is an <code>ng-template</code> in Disguise

📌 **Interview term: Structural directive shorthand** — writing <code>*dir="..."</code> on an element is sugar. Angular rewrites <code>&lt;p *ngIf="x"&gt;..&lt;/p&gt;</code> into <code>&lt;ng-template [ngIf]="x"&gt;&lt;p&gt;..&lt;/p&gt;&lt;/ng-template&gt;</code> and the directive decides when to stamp it out.

That rewrite explains a classic error. One element can only be wrapped in one template, so this fails to compile on 22.2.3:

\`\`\`
<li *ngFor="let t of items" *ngIf="t">{{ t }}</li>

error NG5002: Can't have multiple template bindings on one element. Use only one attribute prefixed with *
\`\`\`

The traditional fix was to move one of the directives onto an <code>ng-container</code>. With built-in control flow you simply nest blocks, and no wrapper is needed at all:

\`\`\`html
@for (t of items; track t.id) {
  @if (t.visible) { <li>{{ t.name }}</li> }
}
\`\`\`

Blocks can also hold several root elements, so the <code>tbody</code> case above works with or without the <code>ng-container</code>. Keeping it is still a readable way to say "these rows belong together". More on this in [the new control flow](/interview-question/explain-the-new-control-flow-if-for-switch-and-how-it-compares-to-structural-dir).

## 5. Verified: the runnable example

The example on this page uses both elements together. An <code>ng-template #badge</code> defines a reusable badge that takes a label through its context (<code>let-label</code> reads <code>$implicit</code>), and an <code>ng-container *ngTemplateOutlet</code> stamps it into each invoice row without adding a wrapper. Each invoice's two rows are grouped with an <code>ng-container</code> inside <code>&lt;tbody&gt;</code>. Printing the direct children of <code>&lt;tbody&gt;</code>, then expanding:

\`\`\`
tbody children : tr:#101 AcmeOVERDUE | tr:#102 Globexpaid
expanded       : tr:#101 AcmeOVERDUE | tr:Hosting, Support | tr:#102 Globexpaid | tr:Licence
ng-container or ng-template elements in DOM: 0
\`\`\`

Every direct child of <code>&lt;tbody&gt;</code> is a <code>&lt;tr&gt;</code>, and a <code>querySelectorAll("ng-container, ng-template")</code> finds **zero** elements: both exist only in the template. Passing data into templates in more depth is covered in [ngTemplateOutlet](/interview-question/what-is-ngtemplateoutlet).

## 6. When to Use Which

| Need | Use | Why |
| :--- | :--- | :--- |
| Group siblings without a wrapper element | <code>ng-container</code> | No element, valid HTML in tables, lists and selects |
| Put a directive somewhere with no element | <code>ng-container</code> | Hosts <code>*ngTemplateOutlet</code>, <code>*ngComponentOutlet</code> and similar |
| A reusable fragment rendered in several places | <code>ng-template</code> + <code>ngTemplateOutlet</code> | One definition, many copies |
| Let a parent customise part of a child component | <code>ng-template</code> passed as an input | The child decides where, the parent decides what |
| Write a custom structural directive | <code>ng-template</code> (via <code>*</code>) | The directive receives it as a <code>TemplateRef</code> |
| Project content from a parent | Neither; use <code>ng-content</code> | See [content projection](/interview-question/what-is-content-projection-and-ng-content) |

## 7. Common Pitfalls

- **Expecting <code>ng-template</code> content to show up.** It never renders by itself; verified, an unused template produced only <code>&lt;!--container--&gt;</code>.
- **Styling <code>ng-container</code>.** Classes, styles and attributes on it go nowhere, because there is no element to receive them. Verified: <code>class</code>, <code>style</code> and <code>title</code> on an <code>ng-container</code> compiled without any warning and rendered as just <code>hi&lt;!--ng-container--&gt;</code>.
- **Two <code>*</code> directives on one element.** <code>NG5002</code>. Use nested blocks, or an <code>ng-container</code> for directive-based code.
- **Using a <code>&lt;div&gt;</code> wrapper inside <code>&lt;tbody&gt;</code>, <code>&lt;ul&gt;</code> or a flex row.** It breaks HTML validity or the layout; <code>ng-container</code> groups without either problem.
- **Confusing <code>ng-template</code> with <code>ng-content</code>.** <code>ng-template</code> is defined by the component that renders it; <code>ng-content</code> marks where a *parent's* content goes.
- **Assuming a template is a single instance.** Each outlet or <code>createEmbeddedView</code> call produces a separate copy with its own bindings.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-liner:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ng-container</code> groups things without adding an element; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ng-template</code> defines a piece of template that renders only when someone stamps it out."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. What reaches the DOM:</strong> <span style="color:#f0e2c8;">"For <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ng-container</code> the children render and Angular leaves a comment anchor. For an unused <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ng-template</code> nothing renders at all, just a comment."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. ng-container uses:</strong> <span style="color:#f0e2c8;">"Hosting a directive like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">*ngTemplateOutlet</code> without a wrapper, or grouping rows inside a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tbody</code> where a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">div</code> would be invalid HTML."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. ng-template uses:</strong> <span style="color:#f0e2c8;">"Reusable fragments, templates passed into child components, and custom structural directives, which receive it as a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TemplateRef</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Modern context:</strong> <span style="color:#f0e2c8;">"The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">*</code> prefix is sugar for an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ng-template</code>. With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@if</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@for</code>, most wrappers that existed only to stack two <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">*</code> directives are gone."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can I not put <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">*ngFor</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">*ngIf</code> on one element?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">*</code> wraps the element in its own <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ng-template</code>, and one element cannot be wrapped twice. The compiler says <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NG5002: Can't have multiple template bindings on one element</code>. The old fix was an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ng-container</code>; now you nest <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@if</code> inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@for</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ng-container</code> really add nothing to the DOM?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No element, but Angular inserts comment nodes as anchors. Verified: an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ng-container</code> holding text and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">b</code> rendered as the children followed by an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;!--ng-container--&gt;</code> comment. CSS and HTML validity are unaffected.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do I render an <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ng-template</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Get a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TemplateRef</code> to it, by a template reference variable or a query, and give it to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngTemplateOutlet</code> or call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ViewContainerRef.createEmbeddedView</code>. Each call creates a separate copy.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do I pass data into an <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ng-template</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Through a context object: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">let-label</code> reads <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$implicit</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">let-x="key"</code> reads a named key. The caller supplies the object, for example <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">context: { $implicit: 'paid' }</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can an <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ng-template</code> be rendered more than once?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. Verified: one template used by two <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">*ngTemplateOutlet</code> containers produced two copies. A template is a blueprint, not an instance.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **<code>ng-container</code>** | Grouping element that renders its children but no element of its own |
| **<code>ng-template</code>** | A blueprint of template that renders only when instantiated |
| **<code>TemplateRef</code>** | The object Angular creates for an <code>ng-template</code> |
| **Embedded view** | One rendered copy of a template |
| **Comment anchor** | A DOM comment Angular uses to mark where dynamic content goes |
| **Structural directive shorthand** | <code>*dir</code>, sugar for wrapping the element in an <code>ng-template</code> |

---
**Conclusion:** <code>ng-container</code> and <code>ng-template</code> are both template-only elements, with opposite behaviour. On 22.2.3 an <code>ng-container</code> rendered its children with nothing but a comment anchor left behind, so two <code>&lt;tr&gt;</code> rows sat validly inside a <code>&lt;tbody&gt;</code>; an <code>ng-template</code> rendered nothing until an outlet used it, and then once per outlet. Use the first to group or host directives without a wrapper, the second for reusable or parent-supplied fragments and custom structural directives, and expect built-in control flow to remove most of the wrappers older templates needed.`,
    examples: [
      {
        label: "ng-container grouping table rows and ng-template as a reusable badge",
        tech: "angular",
        runnable: true,
        code: `import { Component, signal } from "@angular/core";
import { NgTemplateOutlet } from "@angular/common";

type Invoice = { id: number; customer: string; lines: string[]; overdue: boolean };

@Component({
  selector: "app-root",
  imports: [NgTemplateOutlet],
  template: \`
    <!-- ng-template: a blueprint. Nothing renders until someone stamps it out. -->
    <ng-template #badge let-label>
      <span class="badge">{{ label }}</span>
    </ng-template>

    <table>
      <tbody>
        @for (inv of invoices(); track inv.id) {
          <!-- ng-container: groups the rows of one invoice but renders no element, so tbody stays valid -->
          <ng-container>
            <tr>
              <td>#{{ inv.id }} {{ inv.customer }}</td>
              <td>
                <ng-container *ngTemplateOutlet="badge; context: { $implicit: inv.overdue ? 'OVERDUE' : 'paid' }" />
              </td>
            </tr>
            @if (expanded()) {
              <tr><td colspan="2">{{ inv.lines.join(", ") }}</td></tr>
            }
          </ng-container>
        }
      </tbody>
    </table>
    <button (click)="expanded.set(!expanded())">{{ expanded() ? "Hide" : "Show" }} lines</button>
  \`,
})
export class AppComponent {
  expanded = signal(false);
  invoices = signal<Invoice[]>([
    { id: 101, customer: "Acme", lines: ["Hosting", "Support"], overdue: true },
    { id: 102, customer: "Globex", lines: ["Licence"], overdue: false },
  ]);
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is ngTemplateOutlet?",
    seoDescription:
      "ngTemplateOutlet renders a TemplateRef where you place it, with a context object for data. Verified view reuse, $implicit, let- variables and typing gaps.",
    description: `**Question presented to candidate:**
"We are building a reusable list component, and each team wants rows to look different. How would you use \`ngTemplateOutlet\` to let the parent decide what a row looks like, and how does data get into that template?"

**What a strong answer should cover:**
- \`NgTemplateOutlet\` is a directive from \`@angular/common\` that **renders a \`TemplateRef\` at its location** as an embedded view.
- Data goes in through a **context object**: \`$implicit\` maps to \`let-x\`, named keys map to \`let-x="key"\`.
- Two syntaxes: \`*ngTemplateOutlet="tpl; context: ctx"\` or \`[ngTemplateOutlet]="tpl" [ngTemplateOutletContext]="ctx"\`, usually on an \`ng-container\`.
- Pattern: a child accepts a \`TemplateRef\` input (or queries one), and falls back to a default template.
- Behaviour: changing the context updates the existing view; changing the template destroys and recreates it.
- Limits: \`let-\` variables are untyped (\`any\`) under strict templates unless you add a typed directive; \`ngTemplateOutletInjector\` controls which injector the view uses.

**Clarifying questions expected:**
- "Should the parent pass a template as an input, or project it as content?"
- "Does the row template need access to services from the child or from the parent?"

**Code / implementation expected:** Yes — a child component rendering a parent-supplied template with a context.`,
    answer: `**Target Audience:** Developers who know what an <code>ng-template</code> is and want to render one on demand, pass it data, or hand it to a reusable component.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. View-creation logs, rendered output and type-checking behaviour below were produced on Angular 22.2.3 by compiling with <code>ngc</code> (strict templates) and running in jsdom; the API descriptions were read from the installed <code>@angular/common</code> typings.

## 1. Why This Even Matters — A Story First

A print shop owns the presses, the paper and the guillotine. Customers bring their own **stencil**. The shop decides *where* on the sheet the stencil goes and *how many* sheets to print; the customer decides *what* the stencil looks like. Each sheet can be printed with different ink, say the customer's name in a different colour per sheet.

In Angular terms the stencil is an <code>ng-template</code>, the ink is the **context** (the data for one copy), and the press that stamps the stencil at a given spot is **<code>ngTemplateOutlet</code>**. It is the tool that turns a template from "instructions in a drawer" (see [ng-container and ng-template](/interview-question/what-are-ng-container-and-ng-template)) into something on the page, with data.

## 2. The Core Idea

📌 **Interview term: <code>NgTemplateOutlet</code>** — a [standalone](/interview-question/what-are-standalone-components) directive in <code>@angular/common</code>, selector <code>[ngTemplateOutlet]</code>. Its 22.2.3 description: "Inserts an embedded view from a prepared <code>TemplateRef</code>." It is **not** deprecated, unlike <code>NgIf</code> and <code>NgFor</code>; import it directly.

📌 **Interview term: Template context** — the object whose keys become the template's <code>let-</code> variables. The special key <code>$implicit</code> is what a bare <code>let-x</code> receives; <code>let-x="role"</code> reads the <code>role</code> key.

It has three inputs, all read from the typings: <code>ngTemplateOutlet</code> (the [<code>TemplateRef</code>](/interview-question/what-is-the-difference-between-elementref-templateref-and-viewcontainerref)), <code>ngTemplateOutletContext</code> (the context object) and <code>ngTemplateOutletInjector</code> (which injector the view uses).

Both syntaxes do the same thing:

\`\`\`html
<ng-template #card let-user let-role="role">
  <p>{{ user }} ({{ role }})</p>
</ng-template>

<!-- shorthand (microsyntax) -->
<ng-container *ngTemplateOutlet="card; context: { $implicit: name(), role: role() }" />

<!-- explicit inputs -->
<ng-container [ngTemplateOutlet]="card" [ngTemplateOutletContext]="{ $implicit: name(), role: role() }" />
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 720 260" role="img" aria-label="A TemplateRef and a context object go into ngTemplateOutlet, which creates an embedded view at its location">
  <defs>
    <marker id="nto-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="40" width="220" height="56" rx="10"/>
  <text class="d-text" x="140" y="64" text-anchor="middle">TemplateRef</text>
  <text class="d-sub" x="140" y="84" text-anchor="middle">ng-template #card</text>
  <rect class="d-box" x="30" y="150" width="220" height="56" rx="10"/>
  <text class="d-text" x="140" y="174" text-anchor="middle">context object</text>
  <text class="d-sub" x="140" y="194" text-anchor="middle">$implicit and role</text>
  <path class="d-edge" d="M 254 68 L 316 110" marker-end="url(#nto-arrow)"/>
  <path class="d-edge" d="M 254 178 L 316 138" marker-end="url(#nto-arrow)"/>
  <rect class="d-box-accent" x="322" y="96" width="180" height="56" rx="10"/>
  <text class="d-text d-accent" x="412" y="129" text-anchor="middle">ngTemplateOutlet</text>
  <path class="d-edge-accent" d="M 506 124 L 556 124" marker-end="url(#nto-arrow)"/>
  <rect class="d-box-muted" x="562" y="96" width="140" height="56" rx="10"/>
  <text class="d-text" x="632" y="120" text-anchor="middle">embedded</text>
  <text class="d-sub" x="632" y="140" text-anchor="middle">view</text>
</svg>

The outlet combines the two inputs and inserts the resulting view exactly where the outlet element sits; the <code>ng-container</code> host itself leaves no element behind.

## 3. Verified: what changing the context or the template does

A small directive inside each template logged when its view was created and destroyed. The outlet chose between two templates, <code>card</code> and <code>compact</code>, and passed a context built from two [signals](/interview-question/what-are-angular-signals). Clicking "change context" set new values; clicking "swap template" switched templates:

\`\`\`
view created #1
initial      : Ada (admin)
new context  : Grace (owner)
view destroyed #1
view created #2
new template : Grace
\`\`\`

📌 **Interview term: Context forward proxy** — the mechanism behind the second line. The 22.2.3 source comment on <code>NgTemplateOutlet</code> says: "For a given outlet instance, we create a proxy object that delegates to the user-specified context. This allows changing, or swapping out the context object completely without having to destroy/re-create the view."

So:

- **New context values, even a brand-new context object literal**, update the existing view. No creation, no destruction.
- **A different <code>TemplateRef</code>** destroys the old view and creates a new one. The typings list "the outlet changed" and "the injector changed" as the two reasons to re-create.

That matters for performance and for state: anything inside the template (an input's typed text, a child component's state) survives a context change but not a template swap.

## 4. The Pattern Interviewers Want: a parent-customised child

The runnable example builds a generic <code>app-list</code>. The list owns the looping and the markup around each row; it accepts an optional <code>rowTemplate</code> input of type <code>TemplateRef&lt;RowContext&gt;</code> and falls back to its own <code>#defaultRow</code>:

\`\`\`html
<ng-container
  [ngTemplateOutlet]="rowTemplate ?? defaultRow"
  [ngTemplateOutletContext]="{ $implicit: item, index: i }" />
\`\`\`

The parent renders the list twice, once with the default row and once with its own <code>#fancy</code> template, then promotes a team member. Root text content, so adjacent elements run together:

\`\`\`
lists        : AdaGrace | 1. Ada(lead)2. Grace(dev)
after promote: AdaGrace | 1. Ada(lead)2. Grace(architect)
\`\`\`

The child never knew what a "fancy" row looks like, and the parent never wrote a loop. This is the same idea as "render props" in React, and it is how libraries let you customise cells, options and empty states. For the input itself the example uses a decorator <code>@Input()</code> so it runs in the site playground; in an app you would usually write a [signal input](/interview-question/what-are-signal-inputs-and-model-in-modern-angular), <code>rowTemplate = input&lt;TemplateRef&lt;RowContext&gt;&gt;()</code>.

## 5. Verified: where services come from

📌 **Interview term: Declaration injector** — by default an embedded view resolves dependencies from the place the <code>ng-template</code> was **declared**, not where it is rendered.

A child component provided a token <code>WHO = "child"</code> and rendered a parent-declared template twice, once plainly and once with <code>ngTemplateOutletInjector="outlet"</code>. A directive inside the template injected <code>WHO</code> optionally:

\`\`\`
template sees WHO = null
template sees WHO = child
\`\`\`

With the default, the template could not see the child's provider at all. With <code>"outlet"</code> it resolved from the outlet's location inside the child. This is useful when a reusable component wants its row templates to read a context service it provides. [Dependency injection](/interview-question/how-does-dependency-injection-work-in-angular) explains the injector tree behind this.

## 6. Verified: the typing gap

Under strict templates, <code>let-</code> variables on an <code>ng-template</code> fed by <code>ngTemplateOutlet</code> are not type-checked. This compiled on 22.2.3 with exit code 0, even though <code>u</code> is the number 5:

\`\`\`html
<ng-template #t let-u><p>{{ u.doesNotExist.deeper }}</p></ng-template>
<ng-container *ngTemplateOutlet="t; context: { $implicit: 5 }" />
\`\`\`

The outlet cannot know which template will be passed at runtime, so it cannot type the template's variables. If you need types, put a small directive on the <code>ng-template</code> with a static <code>ngTemplateContextGuard</code>, the same hook <code>NgForOf</code> uses (its typings declare <code>static ngTemplateContextGuard&lt;T, U&gt;(dir, ctx: any): ctx is NgForOfContext&lt;T, U&gt;</code>).

## 7. Comparison

| | <code>ngTemplateOutlet</code> | <code>ng-content</code> | <code>ViewContainerRef.createEmbeddedView</code> |
| :--- | :--- | :--- | :--- |
| Declared in | Template | Child template | Component or directive class |
| Content comes from | Any <code>TemplateRef</code> | The parent's markup | Any <code>TemplateRef</code> |
| Copies | One per outlet, can be many | Projected once | As many as you create |
| Per-copy data | Context object | None | Context object |
| Typical use | Customisable rows, cells, empty states | Wrappers, cards, layouts | Custom [structural directives](/interview-question/what-is-a-directive-and-what-are-the-types) |

[Content projection](/interview-question/what-is-content-projection-and-ng-content) is the better tool when a parent just wants to put markup inside a wrapper once; a template is better when the child must render it repeatedly or with data.

## 8. Common Pitfalls

- **Forgetting to import <code>NgTemplateOutlet</code>.** It is a directive, not built-in syntax. Verified on 22.2.3 without the import: the <code>[ngTemplateOutlet]</code> form fails the build with <code>NG8002: Can't bind to 'ngTemplateOutlet' since it isn't a known property of 'ng-container'</code>, but the <code>*ngTemplateOutlet</code> form only produces warning <code>NG8116</code>, and the build succeeds with an outlet that renders nothing.
- **Putting the outlet on a real element.** Use <code>ng-container</code> so the rendered template is not wrapped in an extra <code>div</code>.
- **Confusing <code>let-x</code> and <code>let-x="key"</code>.** The bare form reads <code>$implicit</code>; a named key needs the <code>="key"</code> part.
- **Trusting strict templates inside the template.** <code>let-</code> variables are untyped here, verified above.
- **Expecting the child's providers to be visible.** By default they are not; use <code>ngTemplateOutletInjector="outlet"</code>.
- **Swapping templates to change styling.** That recreates the view and loses its state; prefer changing context values or classes when you can.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngTemplateOutlet</code> is a directive that takes a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TemplateRef</code> and renders it right where the outlet sits, as an embedded view."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Passing data:</strong> <span style="color:#f0e2c8;">"It takes a context object. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$implicit</code> becomes the default <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">let-</code> variable, other keys are read with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">let-name="key"</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The main pattern:</strong> <span style="color:#f0e2c8;">"A reusable child, like a list or table, owns the looping and layout, and accepts a row template as an input. The parent decides how each row looks."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Behaviour:</strong> <span style="color:#f0e2c8;">"Changing context values updates the same view; swapping to a different template destroys and recreates the view. I verified both by logging view creation."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Caveats:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">let-</code> variables are <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">any</code>, so strict templates do not catch typos there, and the view uses the injector of where the template was declared unless you set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngTemplateOutletInjector</code>."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is this different from <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ng-content</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ng-content</code> places a parent's content once, and the parent creates it. A template passed to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngTemplateOutlet</code> can be stamped out many times by the child, with different data each time, which is why lists use templates.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does a new context object recreate the view?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. The template literal <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ $implicit: name(), role: role() }</code> is a new object each time, yet the view was created once and only its text changed. The 22.2.3 typings describe a context proxy that allows swapping the context without recreating the view.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do I type the context?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngTemplateOutlet</code> itself does not type <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">let-</code> variables: a template reading <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">u.doesNotExist.deeper</code> compiled with strict templates. Teams add a small directive with a static <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngTemplateContextGuard</code> on the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ng-template</code> to get real types.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can the parent give a template to a child without an input?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, by putting the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ng-template</code> inside the child tag and having the child query it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">contentChild(TemplateRef)</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@ContentChild</code>. That is projection plus a query instead of an input.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ngTemplateOutletInjector</code> for?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">By default the embedded view resolves services from where the template was declared. Setting it to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">'outlet'</code> or to a custom <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Injector</code> makes the template resolve from the outlet side, for example to read a service the child provides.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **<code>NgTemplateOutlet</code>** | Directive that renders a <code>TemplateRef</code> at its location |
| **Template context** | Object whose keys become the template's <code>let-</code> variables |
| **<code>$implicit</code>** | The context key a bare <code>let-x</code> reads |
| **Context forward proxy** | Lets the outlet change context without recreating the view |
| **Declaration injector** | Default: services resolve from where the template was declared |
| **<code>ngTemplateContextGuard</code>** | Static hook that gives a template's context real types |

---
**Conclusion:** <code>ngTemplateOutlet</code> is the press that stamps a <code>TemplateRef</code> onto the page with a context for its data. On 22.2.3 a new context, even a new object literal, updated the existing view, while a different template destroyed and recreated it; services resolved from where the template was declared unless <code>ngTemplateOutletInjector="outlet"</code> was set; and <code>let-</code> variables were not type-checked. Its best use is the pattern in the example: a reusable child that owns layout and looping, rendering whatever row template its parent supplies.`,
    examples: [
      {
        label: "A generic list that renders a row template supplied by its parent",
        tech: "angular",
        runnable: true,
        code: `import { Component, Input, TemplateRef, signal } from "@angular/core";
import { NgTemplateOutlet } from "@angular/common";

type Person = { name: string; role: string };
type RowContext = { $implicit: Person; index: number };

// A generic list. It owns the looping; the PARENT decides how each row looks.
@Component({
  selector: "app-list",
  imports: [NgTemplateOutlet],
  template: \`
    <ul>
      @for (item of items; track item.name; let i = $index) {
        <li>
          <ng-container
            [ngTemplateOutlet]="rowTemplate ?? defaultRow"
            [ngTemplateOutletContext]="{ $implicit: item, index: i }" />
        </li>
      }
    </ul>
    <ng-template #defaultRow let-p>{{ p.name }}</ng-template>
  \`,
})
export class ListComponent {
  @Input() items: Person[] = [];
  @Input() rowTemplate?: TemplateRef<RowContext>;
}

@Component({
  selector: "app-root",
  imports: [ListComponent],
  template: \`
    <ng-template #fancy let-person let-i="index">
      <b>{{ i + 1 }}. {{ person.name }}</b> <small>({{ person.role }})</small>
    </ng-template>

    <h4>Default row</h4>
    <app-list [items]="team()" />

    <h4>Custom row from the parent</h4>
    <app-list [items]="team()" [rowTemplate]="fancy" />

    <button (click)="promote()">Promote Grace</button>
  \`,
})
export class AppComponent {
  team = signal<Person[]>([
    { name: "Ada", role: "lead" },
    { name: "Grace", role: "dev" },
  ]);
  promote() {
    this.team.update((t) => t.map((p) => (p.name === "Grace" ? { ...p, role: "architect" } : p)));
  }
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is content projection and ng-content?",
    seoDescription:
      "Content projection passes markup into a child, placed by ng-content. Fallback content, who owns projected content, and the hidden-but-created trap.",
    description: `**Question presented to candidate:**
"We want a reusable \`<app-callout>\` that draws a styled frame, while each page decides what goes inside. How does content projection with \`ng-content\` work, and what are the gotchas?"

**What a strong answer should cover:**
- **Content projection** passes markup written between a component's tags (its *content*) into a spot in that component's template marked by \`<ng-content>\`.
- The projected content is **created and owned by the parent**: its bindings use the parent's state and update with the parent's change detection.
- \`<ng-content>\` is a placeholder, not a real element or a directive; it cannot be bound, styled or repeated.
- **Fallback content** (v18+): markup inside \`<ng-content>...</ng-content>\` shows when nothing is projected.
- Gotcha: wrapping \`<ng-content>\` in \`@if\` hides content but does **not** prevent it from being created; use \`ng-template\` + \`ngTemplateOutlet\` or \`@defer\` for truly lazy content.
- Projected content lands once: two \`<ng-content>\` for the same content means only the last receives it.

**Clarifying questions expected:**
- "Does the wrapper need several distinct areas (header, body, footer)? That would be multi-slot projection."
- "Should hidden content be created lazily, or is hiding enough?"

**Code / implementation expected:** Yes — a wrapper component using \`ng-content\`, ideally with fallback content.`,
    answer: `**Target Audience:** Developers building reusable wrapper components (cards, callouts, dialogs, layouts) who want to understand how <code>ng-content</code> really works.
**Difficulty:** Easy to Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. Every console log, rendered output and CSS selector quoted below was produced on Angular 22.2.3 by compiling the components with <code>ngc</code> (strict templates) and running them in jsdom.

## 1. Why This Even Matters — A Story First

A picture-framing shop sells frames: wood, glass, a mount, a hook on the back. You bring the picture. The shop does not paint your picture and does not care what it shows; it only decides *where* the picture sits inside the frame. If you bring nothing, the shop puts its sample photo of a beach in the frame so it does not look broken.

That frame is a component with **content projection**. The picture you bring is the **content** written between the component's tags, the spot behind the glass is **<code>&lt;ng-content&gt;</code>**, and the sample beach photo is **fallback content**.

There is one subtlety that trips up experienced developers. You painted the picture at home, before you walked into the shop. Even if the shop puts the framed picture in a back room and never hangs it, the picture already exists. Projected content works exactly like that.

## 2. The Core Idea

📌 **Interview term: Content projection** — passing markup from a parent into a child component by writing it between the child's tags, and letting the child decide where it appears. Angular's version of the web platform's slots, or React's <code>children</code>.

📌 **Interview term: <code>&lt;ng-content&gt;</code>** — the placeholder in the child's template that marks where projected content goes. It is not an element in the DOM and not a [directive](/interview-question/what-is-a-directive-and-what-are-the-types): you cannot bind to it, style it, or put a structural directive on it.

📌 **Interview term: Content vs. view** — a component's **view** is what its own template creates; its **content** is what the parent wrote between its tags. Content queries ([<code>contentChild()</code>](/interview-question/viewchild-signal-queries-vs-viewchild-decorator-what-changed), <code>@ContentChild</code>) and the <code>ngAfterContentInit</code> hook are about the second ([lifecycle hooks](/interview-question/what-are-angular-lifecycle-hooks)).

\`\`\`ts
@Component({
  selector: "app-callout",
  template: \`
    <div class="callout">
      <ng-content>Nothing to report.</ng-content>
    </div>
  \`,
})
export class CalloutComponent {}
\`\`\`

\`\`\`html
<app-callout>Deploy finished in <b>{{ seconds() }}s</b>.</app-callout>
<app-callout />
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 720 270" role="img" aria-label="The parent creates the content and its bindings, the child template decides where ng-content places it">
  <defs>
    <marker id="prj-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="170" y="28" text-anchor="middle">Parent template</text>
  <rect class="d-box-muted" x="30" y="44" width="280" height="190" rx="12"/>
  <rect class="d-box" x="60" y="74" width="220" height="44" rx="8"/>
  <text class="d-sub" x="170" y="101" text-anchor="middle">app-callout tag</text>
  <rect class="d-box-accent" x="60" y="150" width="220" height="56" rx="8"/>
  <text class="d-text d-accent" x="170" y="174" text-anchor="middle">content</text>
  <text class="d-sub" x="170" y="194" text-anchor="middle">bindings read parent state</text>
  <text class="d-text" x="550" y="28" text-anchor="middle">Child template</text>
  <rect class="d-box-muted" x="410" y="44" width="280" height="190" rx="12"/>
  <rect class="d-box" x="440" y="74" width="220" height="44" rx="8"/>
  <text class="d-sub" x="550" y="101" text-anchor="middle">div class callout</text>
  <rect class="d-box-accent" x="440" y="150" width="220" height="56" rx="8"/>
  <text class="d-text d-accent" x="550" y="183" text-anchor="middle">ng-content slot</text>
  <path class="d-edge-accent" d="M 284 178 L 434 178" marker-end="url(#prj-arrow)"/>
</svg>

The parent creates the content and keeps its bindings; the child only provides the slot where those nodes are attached.

## 3. Verified: projection and fallback content

The runnable example has a callout used twice, once with content and once empty, and a button that changes the parent's <code>seconds</code> [signal](/interview-question/what-are-angular-signals):

\`\`\`
callouts       : Deploy finished in 42s. | Nothing to report.
after +1s      : Deploy finished in 43s. | Nothing to report.
\`\`\`

Two things to notice. The <code>{{ seconds() }}</code> binding inside the projected content updated even though <code>CalloutComponent</code> knows nothing about <code>seconds</code>: the binding belongs to the **parent's** view. And the empty <code>&lt;app-callout /&gt;</code> showed "Nothing to report.", the markup written inside <code>&lt;ng-content&gt;</code>.

📌 **Interview term: Fallback content** — markup between <code>&lt;ng-content&gt;</code> and <code>&lt;/ng-content&gt;</code>, rendered only when nothing is projected into that slot. It arrived in Angular 18 (see for example <a href="https://timdeschryver.dev/bits/an-improved-content-projection-experience-with-fallback-content" target="_blank" rel="noopener noreferrer">Tim Deschryver's write-up</a>); before that teams used a content query to detect an empty slot.

## 4. Verified: hidden is not the same as not created

The most important gotcha. <code>CollapsibleComponent</code> wraps its <code>&lt;ng-content /&gt;</code> in <code>@if (open())</code>, and the parent projects an <code>&lt;app-chart /&gt;</code> that logs from its constructor. Before anyone clicks anything:

\`\`\`
ChartComponent created
Angular is running in development mode.
[app] RENDERED: Deploy finished in 42s.Nothing to report.ExpandSlower deploy
collapsible    : "Expand"
expanded       : "Collapse[chart]"
\`\`\`

<code>ChartComponent created</code> is printed **before the first render finishes**, while the panel is closed and the chart is not in the DOM. A second experiment toggled a similar panel open and closed and logged destruction: the projected component was attached and detached, but only destroyed when the whole app was destroyed.

The reason is ownership. The parent's template creates its content as part of creating the child's host element; <code>&lt;ng-content&gt;</code> only decides where those already-created nodes are attached. So an expensive chart, a component that starts polling, or one that fires an analytics event in its constructor will do all of that even when "hidden".

If content must be **lazy**, the parent should pass an [<code>ng-template</code>](/interview-question/what-are-ng-container-and-ng-template) and the child should render it with [ngTemplateOutlet](/interview-question/what-is-ngtemplateoutlet) only when open, or the parent can wrap the expensive part in <code>@defer</code> ([deferrable views](/interview-question/what-are-deferrable-views-defer-and-how-do-they-work-in-angular-17)).

## 5. Verified: content is projected once

What if a child has two <code>&lt;ng-content /&gt;</code> placeholders for the same content, hoping to show it twice?

\`\`\`html
<!-- child -->
<p id="first"><ng-content /></p><p id="second"><ng-content /></p>
<!-- parent -->
<app-twice><b>once</b></app-twice>
\`\`\`

\`\`\`
twice        : first=  second= <b>once</b>
\`\`\`

The first slot stayed empty and only the last one received the content. A DOM node can only be in one place, and Angular does not clone projected content. Repeating something means a template, not projection.

## 6. Verified: styles do not reach projected content

📌 **Interview term: Emulated encapsulation** — the default [ViewEncapsulation](/interview-question/what-is-viewencapsulation-in-angular): Angular rewrites a component's CSS selectors to include an attribute that only its own template's elements carry.

A child with <code>styles: p { color: red; }</code> rendered one paragraph of its own and one projected from the parent:

\`\`\`
css : p[_ngcontent-ng-c3514973655] { color: red; }
own         _ngcontent-ng-c3514973655 | computed color: rgb(255, 0, 0)
projected   | computed color: rgb(0, 0, 0)
\`\`\`

The projected paragraph was created by the parent, so it does not carry the child's attribute and the child's rule does not match it. Style projected content from the parent, style the child's wrapper element around the slot, or reach in with <code>:host ::ng-deep</code> when there is no alternative.

## 7. Single slot vs. several slots

Everything above uses one unnamed <code>&lt;ng-content /&gt;</code>, the **default slot**, which receives all content. Components such as cards and dialogs usually need separate areas (title, body, actions). That is **multi-slot projection** with <code>&lt;ng-content select="..."&gt;</code>, covered in depth in [standard vs multi-slot content projection](/interview-question/what-is-standard-content-projection-vs-multi-slot-content-projection).

| Tool | Created by | Can be lazy | Can repeat | Can receive data |
| :--- | :--- | :--- | :--- | :--- |
| <code>ng-content</code> | Parent, eagerly | No | No | No (parent bindings only) |
| <code>ng-template</code> + <code>ngTemplateOutlet</code> | Child, when it renders it | Yes | Yes | Yes, via context |
| Inputs | Parent passes values | n/a | n/a | Yes, typed |

## 8. Common Pitfalls

- **Hiding <code>&lt;ng-content&gt;</code> with <code>@if</code> to save work.** The content is still created, verified in section 4.
- **Two placeholders for the same content.** Only the last one receives it.
- **Styling projected elements from the child's stylesheet.** Encapsulation stops plain selectors, verified in section 6.
- **Putting attributes or bindings on <code>&lt;ng-content&gt;</code>.** It is not a real element; wrap it in a <code>div</code> or <code>span</code> if you need a styled box.
- **Reading projected content in <code>ngOnInit</code> with decorator queries.** Content queries are resolved for <code>ngAfterContentInit</code> (verified: a <code>@ContentChild("title")</code> was <code>undefined</code> in <code>ngOnInit</code> and <code>Hello</code> in <code>ngAfterContentInit</code>); signal queries (<code>contentChild()</code>) avoid the timing question.
- **Using projection when the child needs to pass data back into the content.** Projected content only sees the parent's state; use a template with a context.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">"Content projection lets a parent put markup between a component's tags, and the component decides where that markup appears using <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;ng-content&gt;</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Ownership:</strong> <span style="color:#f0e2c8;">"The projected content belongs to the parent. Its bindings read the parent's state and update with the parent; the child only provides the location."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Fallback:</strong> <span style="color:#f0e2c8;">"Since v18, anything inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;ng-content&gt;</code> is fallback content, shown when nothing was projected, like a default button label."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The big gotcha:</strong> <span style="color:#f0e2c8;">"Hiding <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;ng-content&gt;</code> inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@if</code> does not stop the content being created. I verified a projected component's constructor ran while its panel was still collapsed."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. When to use something else:</strong> <span style="color:#f0e2c8;">"If the child must render content lazily, repeatedly or with data, the parent should pass an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ng-template</code> instead, rendered with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngTemplateOutlet</code>."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the projected component created even if it is never shown?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The parent's template creates its content as part of creating the child's host element; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ng-content</code> only decides where those nodes are attached. So the content's lifecycle follows the parent, not the slot.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can I put <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&lt;ng-content&gt;</code> in a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">@for</code> to repeat content?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Content is projected once. Verified: with two <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;ng-content&gt;</code> elements for the same content, the first was empty and only the second received it. Repeating needs a template.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can I style projected content from the child?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not with plain selectors under the default emulated encapsulation. Verified: the child rule compiled to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">p[_ngcontent-ng-c3514973655]</code>, the child's own paragraph carried that attribute and turned red, and the projected paragraph did not. Style it from the parent, or use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:host ::ng-deep</code> sparingly.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does the child read projected content in code?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With a content query: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">contentChild()</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">contentChildren()</code> signal queries, or the older <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@ContentChild</code> decorators. They are resolved before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngAfterContentInit</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between this and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ng-template</code> plus outlet?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ng-content</code> is simple and good for wrappers, but eager and single-use. A template is created only when the child renders it, can be rendered many times and can receive a context.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Content projection** | Passing markup into a child between its tags |
| **<code>ng-content</code>** | The placeholder that marks where projected content goes |
| **Content vs. view** | What the parent wrote between the tags vs. what the child's own template creates |
| **Fallback content** | Markup inside <code>ng-content</code> shown when nothing is projected (v18+) |
| **Default slot** | An <code>ng-content</code> without <code>select</code>, receiving all unmatched content |
| **Emulated encapsulation** | Default CSS scoping by attribute, which projected content does not carry |

---
**Conclusion:** Content projection lets a wrapper component own the frame while the parent supplies the picture, with <code>&lt;ng-content&gt;</code> marking where it goes and, since v18, fallback content filling an empty slot. On 22.2.3 the projected content behaved as the parent's: its bindings updated with the parent's signals, the child's emulated styles did not match it, and a projected component was constructed even while its slot was hidden by <code>@if</code>. Projection is eager and single-use, so reach for an <code>ng-template</code> with <code>ngTemplateOutlet</code> when content must be lazy, repeated or fed with data.`,
    examples: [
      {
        label: "A wrapper with ng-content and fallback content, and the projected-child lifecycle trap",
        tech: "angular",
        runnable: true,
        code: `import { Component, signal } from "@angular/core";

// A reusable wrapper: it draws the frame, the parent supplies the inside.
@Component({
  selector: "app-callout",
  template: \`
    <div class="callout" style="border: 2px solid teal; padding: 8px; margin: 6px 0">
      <ng-content>Nothing to report.</ng-content>
    </div>
  \`,
})
export class CalloutComponent {}

// A projected child that announces when it is created.
@Component({ selector: "app-chart", template: \`<i>[chart]</i>\` })
export class ChartComponent {
  constructor() {
    console.log("ChartComponent created");
  }
}

// Hides its projected content, but does NOT stop it being created.
@Component({
  selector: "app-collapsible",
  template: \`
    <button (click)="open.set(!open())">{{ open() ? "Collapse" : "Expand" }}</button>
    @if (open()) {
      <ng-content />
    }
  \`,
})
export class CollapsibleComponent {
  open = signal(false);
}

@Component({
  selector: "app-root",
  imports: [CalloutComponent, ChartComponent, CollapsibleComponent],
  template: \`
    <app-callout>Deploy finished in <b>{{ seconds() }}s</b>.</app-callout>
    <app-callout />
    <app-collapsible><app-chart /></app-collapsible>
    <button (click)="seconds.set(seconds() + 1)">Slower deploy</button>
  \`,
})
export class AppComponent {
  seconds = signal(42);
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is standard content projection vs. Multi-Slot Content Projection?",
    seoDescription:
      "Single-slot projection puts all content in one ng-content; multi-slot routes content with select. Matching rules, ngProjectAs, dropped content.",
    description: `**Question presented to candidate:**
"Design the template of a reusable \`<app-dialog>\` with a title area, a body and a footer for buttons. Explain the difference between standard (single-slot) and multi-slot content projection, and how Angular decides which content goes where."

**What a strong answer should cover:**
- **Single-slot**: one \`<ng-content />\` receives everything between the component's tags.
- **Multi-slot**: several \`<ng-content select="...">\`, each with a CSS-like selector (element, \`[attribute]\`, \`.class\`, or a comma-separated list).
- Content is placed in **slot order, not source order**; each node goes to the first matching slot, and the \`select\`-less slot is the catch-all default.
- Content that matches no slot **when there is no default slot is silently dropped**.
- Only **top-level** nodes are matched; \`ngProjectAs\` lets an \`ng-container\` (or a wrapper) pretend to match a selector. A control flow block with a single root element projects into that element's slot.
- Each slot can have its own **fallback content** (v18+).

**Clarifying questions expected:**
- "Should the title be required, or should the dialog show a default?"
- "Are footer actions always buttons, or could teams pass custom components?"

**Code / implementation expected:** Yes — a dialog or card with at least three slots.`,
    answer: `**Target Audience:** Developers who already use <code>&lt;ng-content&gt;</code> and need to build components with several distinct content areas, such as cards, dialogs and page layouts.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. Every slot assignment quoted below was produced on Angular 22.2.3 by compiling the components with <code>ngc</code> (strict templates), rendering them in jsdom, and printing what landed in each slot.

## 1. Why This Even Matters — A Story First

A post office has one big sack by the door. Everything goes in: letters, parcels, postcards. That is fine when one person reads all the mail. That sack is **standard (single-slot) projection**: one <code>&lt;ng-content /&gt;</code>, and everything the parent writes ends up in that one place.

A larger office installs a sorting rack. Pigeonhole one takes anything marked "Urgent", pigeonhole two takes parcels, and the big sack still catches everything else. The sorter does not care in which order the mail arrived; it looks at each item's label and drops it in the first pigeonhole that accepts it. And if the office has removed the big sack, unlabelled mail is simply... gone. That rack is **multi-slot projection**, and that last detail is the bug interviewers like to ask about.

For the basics of projection itself (ownership, fallback content, the eager-creation gotcha), see [content projection and ng-content](/interview-question/what-is-content-projection-and-ng-content). This page is about routing content to several slots.

## 2. The Core Idea

📌 **Interview term: Single-slot (standard) projection** — the child has exactly one <code>&lt;ng-content /&gt;</code> without a <code>select</code>. All content goes there.

📌 **Interview term: Multi-slot projection** — the child has several <code>&lt;ng-content select="..."&gt;</code> placeholders. Each <code>select</code> is a CSS-like selector, and each top-level piece of content goes to the first slot whose selector matches it.

📌 **Interview term: Default slot** — the <code>&lt;ng-content&gt;</code> without <code>select</code>. In a multi-slot component it is the catch-all for anything no other slot matched.

Supported selectors are the simple CSS kinds: an element name (<code>h3</code>, <code>app-actions</code>), an attribute (<code>[dialog-title]</code>), a class (<code>.actions</code>), and comma-separated lists of those (<code>button, .actions</code>).

\`\`\`ts
@Component({
  selector: "app-dialog",
  template: \`
    <section>
      <header><ng-content select="[dialog-title]">Untitled</ng-content></header>
      <main><ng-content /></main>
      <footer><ng-content select="button, .actions" /></footer>
    </section>
  \`,
})
export class DialogComponent {}
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="Top level content is routed to the first matching slot, unmatched content goes to the default slot">
  <defs>
    <marker id="ms-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="150" y="28" text-anchor="middle">Parent content</text>
  <rect class="d-box" x="40" y="46" width="220" height="44" rx="10"/>
  <text class="d-sub" x="150" y="73" text-anchor="middle">button Save</text>
  <rect class="d-box" x="40" y="126" width="220" height="44" rx="10"/>
  <text class="d-sub" x="150" y="153" text-anchor="middle">h3 dialog-title</text>
  <rect class="d-box" x="40" y="206" width="220" height="44" rx="10"/>
  <text class="d-sub" x="150" y="233" text-anchor="middle">p body text</text>
  <text class="d-text" x="570" y="28" text-anchor="middle">Slots in child order</text>
  <rect class="d-box-accent" x="460" y="46" width="220" height="44" rx="10"/>
  <text class="d-sub d-accent" x="570" y="73" text-anchor="middle">header: dialog-title</text>
  <rect class="d-box-muted" x="460" y="126" width="220" height="44" rx="10"/>
  <text class="d-sub" x="570" y="153" text-anchor="middle">main: default slot</text>
  <rect class="d-box-accent" x="460" y="206" width="220" height="44" rx="10"/>
  <text class="d-sub d-accent" x="570" y="233" text-anchor="middle">footer: button or .actions</text>
  <path class="d-edge-accent" d="M 264 68 L 454 222" marker-end="url(#ms-arrow)"/>
  <path class="d-edge-accent" d="M 264 148 L 454 74" marker-end="url(#ms-arrow)"/>
  <path class="d-edge-dashed" d="M 264 228 L 454 154" marker-end="url(#ms-arrow)"/>
</svg>

The button written first by the parent ends up last, in the footer, because placement follows the child's slots, not the parent's source order.

## 3. Verified: the dialog in the example

The runnable example projects a Save button, an <code>h3 dialog-title</code>, a paragraph, a conditional "Saved!" paragraph and an <code>ng-container ngProjectAs="[dialog-title]"</code> into one dialog, and only a paragraph into a second. What each slot contained:

\`\`\`
full : header=[Edit profile (draft)] main=[Change your display name.] footer=[Save]
bare : header=[Untitled] main=[No title and no buttons were provided.] footer=[]
saved: header=[Edit profile (draft)] main=[Change your display name.Saved!] footer=[Save]
\`\`\`

- The **button** went to the footer even though it was written first: slot order wins.
- The <code>ng-container</code> carrying <code>&lt;small&gt; (draft)&lt;/small&gt;</code> reached the **title** slot because of <code>ngProjectAs</code>.
- The bare dialog shows the title slot's **fallback** "Untitled" and an empty footer, which has no fallback.
- After clicking Save, the <code>@if</code>-wrapped paragraph appeared in the **default** slot, still owned and updated by the parent.

## 4. Verified: the matching rules, one by one

A second test component checked the edge cases directly. Each line is the slot's inner HTML, comments removed:

\`\`\`
card header   : <h3 card-title="">Title</h3><em>sub</em><h3 card-title="">conditional title</h3>
card main     : body text
card footer   : <div class="actions">OK</div>
strict        : <h4><h4>kept</h4></h4>
\`\`\`

📌 **Interview term: <code>ngProjectAs</code>** — an attribute that tells the projection matcher to treat a node as if it matched a different selector. It exists because only **top-level** nodes are matched, and an [<code>ng-container</code>](/interview-question/what-are-ng-container-and-ng-template) has no tag name or attributes of its own. In the test, <code>&lt;ng-container ngProjectAs="[card-title]"&gt;&lt;em&gt;sub&lt;/em&gt;&lt;/ng-container&gt;</code> landed in the header.

What the four lines prove:

- **Attribute selector:** <code>&lt;h3 card-title&gt;</code> matched <code>select="[card-title]"</code>.
- **Class selector in a list:** <code>&lt;div class="actions"&gt;</code> matched <code>select="app-actions, .actions"</code>.
- **[Control flow](/interview-question/explain-the-new-control-flow-if-for-switch-and-how-it-compares-to-structural-dir) with one root:** <code>@if (show) { &lt;h3 card-title&gt;conditional title&lt;/h3&gt; }</code> was projected into the title slot like a plain element. A follow-up test put **two** <code>h3 card-title</code> roots inside one <code>@if</code>: both went to the default slot instead (<code>header=[] main=[AB]</code>).
- **No default slot means content is dropped:** <code>app-strict</code> has only <code>select="h4"</code>. Given an <code>h4</code> and a <code>p</code>, it rendered the <code>h4</code> and the <code>p</code> vanished, with no error or warning.

## 5. Verified: <code>select</code> must be static

It is tempting to make the selector dynamic with <code>[select]="sel"</code>. On 22.2.3 that **compiled without any error or warning**, but the binding was ignored. With <code>&lt;header&gt;&lt;ng-content [select]="sel" /&gt;&lt;/header&gt;&lt;main&gt;&lt;ng-content /&gt;&lt;/main&gt;</code> and <code>sel = "h1"</code>:

\`\`\`
header=[] main=[Tbody]
\`\`\`

The bound placeholder acted like a second default slot, and, as with any duplicated slot, only the last one received the content. Slots are decided by the compiler; if what goes where depends on data, pass templates as inputs and render them with [ngTemplateOutlet](/interview-question/what-is-ngtemplateoutlet).

## 6. Single-slot vs. Multi-slot

| | Single-slot | Multi-slot |
| :--- | :--- | :--- |
| Placeholders | One <code>&lt;ng-content /&gt;</code> | Several, with <code>select</code> |
| Where content goes | All in one place | First matching slot, in the child's slot order |
| Unmatched content | n/a | Default slot, or dropped if there is none |
| Fallback content | One fallback | One per slot |
| API for the parent | "Put anything here" | A small contract: <code>[dialog-title]</code>, <code>button</code>, ... |
| Good for | Callouts, simple wrappers, buttons | Cards, dialogs, page layouts, list items |

Design advice: attribute selectors such as <code>[dialog-title]</code> make the best contract. They read clearly in the parent, work on any element, and do not depend on the parent choosing a particular tag. Keep a default slot unless dropping unknown content is deliberate.

## 7. Common Pitfalls

- **No default slot.** Anything not matching a selector disappears silently; verified with <code>app-strict</code>.
- **Wrapping content in an <code>ng-container</code> or <code>div</code> and expecting the inner element to match.** Only the top-level node is matched; add <code>ngProjectAs</code> or put the attribute on the wrapper.
- **Several roots inside one <code>@if</code> or <code>@for</code>.** The block no longer matches a named slot and goes to the default one.
- **Assuming source order.** Placement follows the child's slots, so the parent cannot reorder areas.
- **Binding <code>[select]</code>.** It compiles and is ignored; the selector must be a static attribute.
- **Selectors that are too clever.** Matching only ever looks at the top-level node itself, so stick to the forms shown working above: element, attribute, class, and comma-separated lists of them.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Single slot:</strong> <span style="color:#f0e2c8;">"Standard projection is one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;ng-content /&gt;</code>: everything between the component's tags goes there."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Multi slot:</strong> <span style="color:#f0e2c8;">"Multi-slot uses several <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;ng-content select&gt;</code> elements, each with a CSS-like selector, so a dialog can route a title, body and buttons to different places."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Matching rules:</strong> <span style="color:#f0e2c8;">"Only top-level nodes are matched, by element, attribute or class. Placement follows the order of the slots in the child, not the order the parent wrote them."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Edge cases:</strong> <span style="color:#f0e2c8;">"The slot without <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">select</code> catches everything else. If there is no such slot, unmatched content is dropped silently. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngProjectAs</code> lets a wrapper match a selector."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Polish:</strong> <span style="color:#f0e2c8;">"Each slot can have fallback content since v18, for example a default <em style="color:#f0e2c8;">Untitled</em> title when the parent supplies none."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens to content that matches no slot?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With a default slot, it goes there. Without one, it disappears with no error. Verified: a child with only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">select="h4"</code> received an h4 and a p, and the p was simply not rendered.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does the order I write content in matter?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, the child's slot order wins. Verified: the parent wrote the Save button first, but it rendered in the footer, after the title and body.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did my content inside an <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ng-container</code> land in the wrong slot?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Matching uses the top-level node, and an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ng-container</code> has no tag or attributes to match. Add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngProjectAs="[dialog-title]"</code> to it, which is how the draft label reached the title slot.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does conditional content still find its slot?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, when the block has a single root element. Verified: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@if (show) { &lt;h3 card-title&gt; }</code> was projected into the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[card-title]</code> slot. With two root elements in the block, both went to the default slot instead, even though each had the attribute.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can the selector be dynamic?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">select</code> is a static attribute read by the compiler. Verified: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[select]="sel"</code> compiled without an error on 22.2.3, but was ignored, the slot behaved like a second default slot, and the content went elsewhere. If slots depend on data, pass templates as inputs and render them with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngTemplateOutlet</code>.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Single-slot projection** | One <code>ng-content</code>, all content goes there |
| **Multi-slot projection** | Several <code>ng-content select</code> placeholders routing content by selector |
| **Default slot** | The <code>ng-content</code> without <code>select</code>; catches unmatched content |
| **<code>select</code>** | Static CSS-like selector: element, attribute, class, or a list |
| **<code>ngProjectAs</code>** | Makes a node match a selector it would not match by itself |
| **Fallback content** | Per-slot default markup shown when the slot receives nothing |

---
**Conclusion:** Standard projection has one <code>&lt;ng-content /&gt;</code> that receives everything; multi-slot projection adds <code>select</code> placeholders that route each top-level node to the first matching slot, with the select-less slot as the catch-all. On 22.2.3 a button written first still landed in the footer, an <code>ng-container</code> reached the title slot only through <code>ngProjectAs</code>, a single-root <code>@if</code> found its named slot while a two-root one fell to the default, content with no matching slot and no default slot vanished silently, and a bound <code>[select]</code> compiled but was ignored. Give components a default slot, use attribute selectors as the contract, and per-slot fallback content for sensible defaults.`,
    examples: [
      {
        label: "A dialog with title, body and footer slots, fallback title and ngProjectAs",
        tech: "angular",
        runnable: true,
        code: `import { Component, signal } from "@angular/core";

// Multi-slot projection: each <ng-content select> is a named "slot".
@Component({
  selector: "app-dialog",
  template: \`
    <section style="border: 1px solid #888; padding: 8px; margin: 8px 0">
      <header><ng-content select="[dialog-title]">Untitled</ng-content></header>
      <main><ng-content /></main>
      <footer><ng-content select="button, .actions" /></footer>
    </section>
  \`,
})
export class DialogComponent {}

@Component({
  selector: "app-root",
  imports: [DialogComponent],
  template: \`
    <app-dialog id="full">
      <button (click)="saved.set(true)">Save</button>
      <h3 dialog-title>Edit profile</h3>
      <p>Change your display name.</p>
      @if (saved()) {
        <p>Saved!</p>
      }
      <ng-container ngProjectAs="[dialog-title]"><small> (draft)</small></ng-container>
    </app-dialog>

    <app-dialog id="bare">
      <p>No title and no buttons were provided.</p>
    </app-dialog>
  \`,
})
export class AppComponent {
  saved = signal(false);
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is a directive and what are the types?",
    seoDescription:
      "A directive is a class that adds behaviour to elements. Components, attribute and structural directives, plus host directives, with verified examples.",
    description: `**Question presented to candidate:**
"What is a directive in Angular? Walk me through the different types, give an example of each, and tell me when you would write your own."

**What a strong answer should cover:**
- A **directive** is a class with \`@Directive\` metadata that Angular attaches to elements matching its **selector**, to add behaviour or change appearance.
- **Components** are directives with a template (\`@Component\` extends \`@Directive\`).
- **Attribute directives** change the look or behaviour of their host element (\`NgClass\`, \`NgStyle\`, \`NgModel\`, a custom \`appHighlight\`), typically through \`host\` bindings and listeners.
- **Structural directives** add or remove DOM by stamping out an \`ng-template\` via \`TemplateRef\` and \`ViewContainerRef\` (\`*ngIf\`, \`*ngFor\`, custom \`*appHasRole\`); the built-in three are now replaced by \`@if\` / \`@for\` / \`@switch\`.
- **Host directives** (directive composition API, v15+) let a component or directive apply other directives to its own host without inheritance.
- Directives are standalone by default and must be imported where used.

**Clarifying questions expected:**
- "Do you want the conceptual categories, or how to build one?"

**Code / implementation expected:** Yes — a custom attribute directive, ideally also a structural one.`,
    answer: `**Target Audience:** Developers who use components daily and want a clear map of Angular's directive types, and how to write their own.
**Difficulty:** Easy to Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. The rendered output and event behaviour below were produced on Angular 22.2.3 by compiling the example with <code>ngc</code> (strict templates) and driving it in jsdom; the compiled definitions were read from <code>ngc</code> output and the API notes from the installed typings.

## 1. Why This Even Matters — A Story First

Think of stickers you can put on things in an office. A **"Fragile" sticker** does not change what the box is; it changes how people treat it. Stick it on any box and that box gets handled carefully. A **"Make 3 copies" sticker** on a document tells the clerk to produce copies, or none at all if the sticker says zero; it changes *how many* of the thing exist. And a **pre-printed form** is a sticker so big it comes with its own content: a whole layout of fields.

Those are Angular's three kinds of directives. The "Fragile" sticker is an **attribute directive**, the "Make 3 copies" sticker is a **structural directive**, and the pre-printed form is a **component**. All three are stuck onto elements by a selector, which is why they share one name.

## 2. The Core Idea

📌 **Interview term: Directive** — a class decorated with <code>@Directive</code> that Angular instantiates for every element matching its **selector**. It can bind to its host element's properties, attributes, classes and styles, listen to its events, receive inputs, and inject services ([dependency injection](/interview-question/how-does-dependency-injection-work-in-angular)). Since v19 directives are standalone by default and must be listed in the <code>imports</code> of any component that uses them ([standalone components](/interview-question/what-are-standalone-components)).

📌 **Interview term: Host element** — the element a directive is attached to. Bindings declared in the directive's <code>host</code> metadata apply to that element.

📌 **Interview term: Selector** — the CSS-like pattern that decides where a directive applies: <code>[appHighlight]</code> for an attribute, <code>app-badge</code> for an element, and so on. Angular matches selectors at compile time.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 250" role="img" aria-label="Three directive types: components own a template, attribute directives change their host, structural directives add or remove DOM">
  <rect class="d-box-muted" x="260" y="20" width="200" height="50" rx="10"/>
  <text class="d-text" x="360" y="50" text-anchor="middle">Directive</text>
  <path class="d-edge" d="M 300 74 L 130 120"/>
  <path class="d-edge" d="M 360 74 L 360 120"/>
  <path class="d-edge" d="M 420 74 L 590 120"/>
  <rect class="d-box-accent" x="30" y="124" width="200" height="90" rx="10"/>
  <text class="d-text d-accent" x="130" y="154" text-anchor="middle">Component</text>
  <text class="d-sub" x="130" y="178" text-anchor="middle">has its own template</text>
  <text class="d-sub" x="130" y="198" text-anchor="middle">app-badge</text>
  <rect class="d-box" x="260" y="124" width="200" height="90" rx="10"/>
  <text class="d-text" x="360" y="154" text-anchor="middle">Attribute</text>
  <text class="d-sub" x="360" y="178" text-anchor="middle">changes its host element</text>
  <text class="d-sub" x="360" y="198" text-anchor="middle">appHighlight</text>
  <rect class="d-box" x="490" y="124" width="200" height="90" rx="10"/>
  <text class="d-text" x="590" y="154" text-anchor="middle">Structural</text>
  <text class="d-sub" x="590" y="178" text-anchor="middle">adds or removes DOM</text>
  <text class="d-sub" x="590" y="198" text-anchor="middle">*appRepeat</text>
</svg>

All three share the same machinery: a selector, inputs, host bindings and dependency injection. They differ in what they do to the page.

## 3. Type 1: Components

📌 **Interview term: Component** — a directive with a template. <code>@Component</code> metadata extends <code>@Directive</code> metadata with <code>template</code>, <code>styles</code>, <code>imports</code> and friends. The compiler shows the relationship plainly; from the example's <code>ngc</code> output:

\`\`\`js
static ɵdir = i0.ɵɵdefineDirective({ type: Highlight, selectors: [["", "appHighlight", ""]] ...
static ɵdir = i0.ɵɵdefineDirective({ type: Repeat, selectors: [["", "appRepeat", ""]] ...
static ɵcmp = i0.ɵɵdefineComponent({ type: Badge, selectors: [["app-badge"]] ...
\`\`\`

Same shape, same selector format, different definition function. An element can host **at most one** component, because only one thing can own its template. See [components and modules](/interview-question/what-are-components-and-modules-in-angular) for the component side in depth.

## 4. Type 2: Attribute directives

📌 **Interview term: Attribute directive** — changes the appearance or behaviour of its host element without changing the DOM structure. Built-in examples: <code>NgClass</code>, <code>NgStyle</code>, [<code>NgModel</code>](/interview-question/what-is-the-difference-between-reactive-and-template-driven-forms), [<code>RouterLink</code>](/interview-question/how-does-routing-and-lazy-loading-work-in-angular).

\`\`\`ts
@Directive({
  selector: "[appHighlight]",
  host: {
    "[style.background]": "active ? color : null",
    "(mouseenter)": "active = true",
    "(mouseleave)": "active = false",
  },
})
export class Highlight {
  @Input("appHighlight") color = "gold";
  active = false;
}
\`\`\`

Driven in jsdom by dispatching the mouse events on <code>&lt;p appHighlight="lightblue"&gt;</code>:

\`\`\`
mouseenter    : p.style.background = "lightblue"
mouseleave    : p.style.background = ""
\`\`\`

Note that <code>active</code> is a plain field rather than a [signal](/interview-question/what-are-angular-signals), and the component is OnPush by default in v22, yet the style updated: a host listener, like a template event handler, marks the view for check ([change detection](/interview-question/how-does-change-detection-work-in-angular)). The <code>host</code> object is the recommended style: the 22.2.3 typings say to "**Always** prefer using the <code>host</code> property over <code>@HostBinding</code>" (and the same for <code>@HostListener</code>), because those decorators "exist exclusively for backwards compatibility".

## 5. Type 3: Structural directives

📌 **Interview term: Structural directive** — adds or removes DOM. Written with a <code>*</code>, which wraps the host element in an <code>ng-template</code> ([ng-container and ng-template](/interview-question/what-are-ng-container-and-ng-template)). The directive injects that template as a <code>TemplateRef</code> and the location as a <code>ViewContainerRef</code> ([the three refs explained](/interview-question/what-is-the-difference-between-elementref-templateref-and-viewcontainerref)):

\`\`\`ts
@Directive({ selector: "[appRepeat]" })
export class Repeat {
  private tpl = inject(TemplateRef<{ $implicit: number }>);
  private vcr = inject(ViewContainerRef);
  @Input() set appRepeat(times: number) {
    this.vcr.clear();
    for (let i = 0; i < times; i++) this.vcr.createEmbeddedView(this.tpl, { $implicit: i + 1 });
  }
}
\`\`\`

Used as <code>&lt;li *appRepeat="count(); let n"&gt;Row {{ n }}&lt;/li&gt;</code>, then clicking "more rows":

\`\`\`
rows          : Row 1, Row 2
after click   : Row 1, Row 2, Row 3
\`\`\`

The built-in structural directives <code>NgIf</code>, <code>NgForOf</code> and <code>NgSwitch</code> are <code>@deprecated 20.0</code> in the 22.2.3 typings in favour of built-in control flow, which is compiler syntax rather than directives ([control flow vs structural directives](/interview-question/explain-the-new-control-flow-if-for-switch-and-how-it-compares-to-structural-dir)). Custom structural directives such as a permission check or a virtual-scroll repeater are unaffected.

## 6. Composition: host directives

📌 **Interview term: Directive composition API (<code>hostDirectives</code>)** — introduced in v15 (<a href="https://blog.angular.dev/angular-v15-is-now-available-df7be7f2f4c8" target="_blank" rel="noopener noreferrer">Angular v15 announcement</a>). A component or directive lists other standalone directives to apply to its own host element, choosing which of their inputs and outputs to expose.

\`\`\`ts
@Component({
  selector: "app-badge",
  hostDirectives: [{ directive: Tooltip, inputs: ["tip"] }],
  template: \`<span class="badge"><ng-content /></span>\`,
})
export class Badge {}
\`\`\`

Using <code>&lt;app-badge tip="Composed with hostDirectives"&gt;new&lt;/app-badge&gt;</code>:

\`\`\`
badge title   : Composed with hostDirectives
\`\`\`

The <code>Tooltip</code> directive set the <code>title</code> attribute on <code>app-badge</code>, although the parent template never mentioned <code>appTooltip</code>. In compiled output this appears as <code>ɵɵHostDirectivesFeature([{ directive: Tooltip, inputs: ["tip", "tip"] }])</code>. It is the Angular answer to "reuse behaviour without inheritance".

## 7. Summary Table

| | Component | Attribute directive | Structural directive |
| :--- | :--- | :--- | :--- |
| Decorator | <code>@Component</code> | <code>@Directive</code> | <code>@Directive</code> |
| Has a template | Yes | No | No (receives one) |
| Changes DOM structure | Renders its own view | No | Yes, adds or removes views |
| Per element | At most one | Any number | One <code>*</code> per element |
| Key APIs | <code>template</code>, <code>imports</code>, inputs, outputs | <code>host</code> bindings and listeners | <code>TemplateRef</code>, <code>ViewContainerRef</code> |
| Built-in examples | Every component you write | <code>NgClass</code>, <code>NgStyle</code>, <code>NgModel</code> | <code>NgIf</code>, <code>NgForOf</code> (deprecated) |
| Typical custom ones | Cards, forms, pages | Highlight, autofocus, click-outside | Role checks, repeaters |

The example uses decorator <code>@Input()</code> so it runs in the site playground; in an application you would normally use [signal inputs](/interview-question/what-are-signal-inputs-and-model-in-modern-angular) (<code>input()</code>), which directives support just like components.

## 8. Common Pitfalls

- **Forgetting to import a directive.** A standalone component must list it in <code>imports</code>; otherwise a static <code>appHighlight="lightblue"</code> is just an HTML attribute and nothing happens, with no error (a bound <code>[appHighlight]</code> at least fails with <code>NG8002</code>).
- **Manipulating the DOM through <code>ElementRef.nativeElement</code>.** Prefer <code>host</code> bindings: they are declarative, checked by the compiler, and applied by Angular during change detection, instead of imperative code reaching into the DOM.
- **Using <code>@HostBinding</code> / <code>@HostListener</code> in new code.** Still supported, but the typings call them backwards-compatibility APIs.
- **Building a component where a directive would do.** If the behaviour has no markup of its own, a directive is smaller and composes with any element.
- **Two <code>*</code> directives on one element.** Not allowed; nest them or use <code>ng-container</code>.
- **Inheriting from a directive to reuse behaviour.** <code>hostDirectives</code> composes without coupling class hierarchies.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">"A directive is a class Angular attaches to every element matching its selector, to add behaviour or change how that element looks."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Components:</strong> <span style="color:#f0e2c8;">"A component is a directive with a template. In compiled code it is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ɵɵdefineComponent</code> instead of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ɵɵdefineDirective</code>, and it owns a view."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Attribute directives:</strong> <span style="color:#f0e2c8;">"They change their host element without changing the DOM structure, through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">host</code> bindings and listeners, like a highlight on hover or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NgModel</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Structural directives:</strong> <span style="color:#f0e2c8;">"They add or remove DOM by stamping out an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ng-template</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ViewContainerRef</code>. The built-in ones are replaced by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@if</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@for</code>, but custom ones like a role check are still directives."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Composition:</strong> <span style="color:#f0e2c8;">"With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hostDirectives</code> a component can reuse small directives, like a tooltip, on its own host, without inheritance or extra markup."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does a structural directive actually work?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It injects <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TemplateRef</code> for the template the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">*</code> created and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ViewContainerRef</code> for the location, then calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">createEmbeddedView</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">clear()</code>. My <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">*appRepeat</code> did exactly that, and went from 2 to 3 rows when its input changed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">host</code> instead of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">@HostBinding</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">@HostListener</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The 22.2.3 typings answer it: "<strong style="color:#ffffff;">Always</strong> prefer using the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">host</code> property over <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@HostBinding</code>", and the decorators "exist exclusively for backwards compatibility". Host listeners also mark an OnPush view for check, which is why the highlight updated on mouseenter.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What are the limits of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">hostDirectives</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The composed directives must be standalone, their inputs and outputs are hidden unless you list them, and they are applied statically, not conditionally. In my example only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tip</code> was exposed, through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inputs: ["tip"]</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can two directives match the same element?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, any number of attribute directives can share a host, and Angular instantiates each. But only one component per element, and only one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">*</code> structural directive per element.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you write a custom directive instead of a component?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the behaviour belongs on existing elements and needs no template of its own: autofocus, click-outside, permission-based disabling, tooltips. If it needs its own markup, it is a component.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Directive** | A class attached to matching elements to add behaviour |
| **Selector** | The pattern that decides where a directive applies |
| **Host element** | The element a directive is attached to |
| **Component** | A directive with its own template |
| **Attribute directive** | Changes its host element without changing DOM structure |
| **Structural directive** | Adds or removes DOM via <code>TemplateRef</code> and <code>ViewContainerRef</code> |
| **<code>hostDirectives</code>** | Applies other directives to a host without inheritance (v15+) |

---
**Conclusion:** A directive is a class Angular attaches to elements by selector. Components are directives with a template, attribute directives change their host through <code>host</code> bindings and listeners, and structural directives stamp templates in and out through <code>ViewContainerRef</code>. On 22.2.3 the example's highlight followed the mouse even under OnPush, the custom <code>*appRepeat</code> grew from two rows to three, and <code>hostDirectives</code> put a tooltip on a component with no extra markup. The built-in structural directives are deprecated in favour of control flow, but the directive types themselves, and writing your own, are as relevant as ever.`,
    examples: [
      {
        label: "An attribute directive, a structural directive, and a component composed with hostDirectives",
        tech: "angular",
        runnable: true,
        code: `import { Component, Directive, Input, TemplateRef, ViewContainerRef, inject, signal } from "@angular/core";

// Attribute directive: changes the look or behaviour of the element it sits on.
@Directive({
  selector: "[appHighlight]",
  host: {
    "[style.background]": "active ? color : null",
    "(mouseenter)": "active = true",
    "(mouseleave)": "active = false",
  },
})
export class Highlight {
  @Input("appHighlight") color = "gold";
  active = false;
}

// A tiny reusable behaviour, composed into a component with hostDirectives.
@Directive({ selector: "[appTooltip]", host: { "[attr.title]": "tip" } })
export class Tooltip {
  @Input() tip = "";
}

// Structural directive: adds or removes DOM by stamping out its <ng-template>.
@Directive({ selector: "[appRepeat]" })
export class Repeat {
  private tpl = inject(TemplateRef<{ $implicit: number }>);
  private vcr = inject(ViewContainerRef);
  @Input() set appRepeat(times: number) {
    this.vcr.clear();
    for (let i = 0; i < times; i++) this.vcr.createEmbeddedView(this.tpl, { $implicit: i + 1 });
  }
}

// Component: a directive with its own template.
@Component({
  selector: "app-badge",
  hostDirectives: [{ directive: Tooltip, inputs: ["tip"] }],
  template: \`<span class="badge"><ng-content /></span>\`,
})
export class Badge {}

@Component({
  selector: "app-root",
  imports: [Highlight, Repeat, Badge],
  template: \`
    <p appHighlight="lightblue">Hover me</p>
    <ul><li *appRepeat="count(); let n">Row {{ n }}</li></ul>
    <app-badge tip="Composed with hostDirectives">new</app-badge>
    <button (click)="count.set(count() + 1)">more rows</button>
  \`,
})
export class AppComponent {
  count = signal(2);
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are pipes in Angular?",
    seoDescription:
      "Pipes transform values for display in templates. Built-in pipes, arguments and chaining, custom pipes, and measured pure vs impure call counts.",
    description: `**Question presented to candidate:**
"What are pipes in Angular? Show me how you would use a built-in one, write a custom one, and explain what \`pure: false\` changes."

**What a strong answer should cover:**
- A **pipe** is a class with \`@Pipe({ name })\` and a \`transform(value, ...args)\` method, used in templates as \`{{ value | name: arg }}\` to format or derive a value for display.
- Built-ins from \`@angular/common\`: \`date\`, \`currency\`, \`decimal\`, \`percent\`, \`uppercase\`, \`lowercase\`, \`titlecase\`, \`json\`, \`slice\`, \`keyvalue\`, \`async\`, and the i18n pipes; pipes chain left to right.
- Pipes are standalone and must be imported into the component that uses them.
- **Pure pipes** (the default) re-run only when an input changes by reference or primitive value, so they are cheap; **mutating** an array or object does not re-run them.
- **Impure pipes** (\`pure: false\`) run on every change detection pass of the view, so they see mutations but cost more; \`async\` is the famous impure built-in.
- Compared to calling a method in the template, a pure pipe memoises on its inputs; \`computed()\` is the signal-era alternative for component-level derived state.

**Clarifying questions expected:**
- "Is the data immutable, or do we mutate arrays in place?"

**Code / implementation expected:** Yes — a custom pipe with an argument, used in a template.`,
    answer: `**Target Audience:** Developers new to Angular templates, and anyone who wants to explain pure vs impure pipes with real numbers rather than slogans.
**Difficulty:** Easy

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. The rendered values and every <code>transform()</code> call count below were produced on Angular 22.2.3 by compiling the example with <code>ngc</code> (strict templates) and clicking through it in jsdom; which built-in pipes are impure was read from the installed <code>@angular/common</code> package.

## 1. Why This Even Matters — A Story First

A bakery's kitchen keeps its prices in plain numbers: 25, 15, 1234.5. The shop window, though, needs "€1,234.50", "16 Oct 2026" and "ORDER SUMMARY" in capital letters. Nobody wants the kitchen to store prices as formatted strings, because then nobody could add them up. So there is a sign-writer at the window who takes the raw number and paints it nicely, every time it is put on display.

A **pipe** is that sign-writer. Your component keeps raw data; the template pipes it through a formatter on the way to the screen: <code>{{ price | currency: "EUR" }}</code>.

The interesting interview question is *how often* the sign-writer repaints. A careful one only repaints when the number actually changed. An anxious one repaints the whole sign every time someone walks past the window, just in case. Those are **pure** and **impure** pipes.

## 2. The Core Idea

📌 **Interview term: Pipe** — a class decorated with <code>@Pipe({ name })</code> that implements <code>PipeTransform</code> (unlike a [directive](/interview-question/what-is-a-directive-and-what-are-the-types), it has no host element), a single <code>transform(value, ...args)</code> method. In a template, <code>value | name: arg1 : arg2</code> calls <code>transform(value, arg1, arg2)</code> and displays the result. Pipes are [standalone](/interview-question/what-are-standalone-components) by default and are imported like components and directives.

📌 **Interview term: Pipe arguments and chaining** — arguments follow colons; pipes chain left to right, each receiving the previous result: <code>{{ cart | total: 0.2 | currency: "EUR" }}</code> first totals with 20% tax, then formats as euros.

The built-in pipes exported by <code>@angular/common</code> in 22.2.3:

| Pipe | Example | Output |
| :--- | :--- | :--- |
| <code>date</code> | <code>{{ when \\| date: "d MMM y" }}</code> | 16 Oct 2026 |
| <code>currency</code> | <code>{{ 1234.5 \\| currency: "EUR" }}</code> | €1,234.50 |
| <code>decimal</code> (<code>number</code>), <code>percent</code> | <code>{{ 0.256 \\| percent }}</code> | Locale-aware number formatting |
| <code>uppercase</code>, <code>lowercase</code>, <code>titlecase</code> | <code>{{ "angular" \\| uppercase }}</code> | ANGULAR |
| <code>json</code>, <code>slice</code>, <code>keyvalue</code> | <code>{{ obj \\| json }}</code> | Debugging and collection helpers |
| <code>async</code> | <code>{{ user$ \\| async }}</code> | Latest value of an Observable or Promise |
| <code>i18nPlural</code>, <code>i18nSelect</code> | <code>{{ n \\| i18nPlural: map }}</code> | Text chosen by count or key |

The three outputs marked here (date, currency, uppercase) were printed by the example: <code>€1,234.50 | 16 Oct 2026 | ANGULAR</code>, in the default <code>en-US</code> locale ([internationalization](/interview-question/how-do-you-handle-internationalization-i18n-in-angular) covers other locales). The <code>async</code> pipe has its own page: [the async pipe](/interview-question/what-is-the-async-pipe-and-why-is-it-useful).

## 3. Writing a Custom Pipe

\`\`\`ts
@Pipe({ name: "total" })
export class TotalPipe implements PipeTransform {
  transform(prices: number[], taxRate = 0): number {
    return prices.reduce((sum, p) => sum + p, 0) * (1 + taxRate);
  }
}
\`\`\`

\`\`\`ts
@Component({
  imports: [TotalPipe, CurrencyPipe],
  template: \`<p>Pure: {{ cart | total: 0.2 | currency: "EUR" }}</p>\`,
})
\`\`\`

With <code>cart = [25, 15]</code> this rendered <code>Pure: €48.00</code>: 40 plus 20% is 48, then the currency pipe formats it.

## 4. Pure vs. Impure

📌 **Interview term: Pure pipe** — the default (<code>pure: true</code>). Angular calls <code>transform</code> again only when an input changes: a different primitive value, or a different object reference. Otherwise it reuses the previous result. This is memoisation keyed on the arguments.

📌 **Interview term: Impure pipe** — <code>@Pipe({ name, pure: false })</code>. Angular calls <code>transform</code> on **every** change detection pass of the view that uses it, whether or not the inputs changed.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 280" role="img" aria-label="On each check a pure pipe compares its inputs and reuses the last result if unchanged, an impure pipe always calls transform">
  <defs>
    <marker id="pp-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="260" y="20" width="200" height="48" rx="10"/>
  <text class="d-text" x="360" y="49" text-anchor="middle">view is checked</text>
  <path class="d-edge-accent" d="M 310 72 L 170 112" marker-end="url(#pp-arrow)"/>
  <path class="d-edge" d="M 410 72 L 550 112" marker-end="url(#pp-arrow)"/>
  <rect class="d-box-accent" x="50" y="118" width="240" height="56" rx="10"/>
  <text class="d-text d-accent" x="170" y="142" text-anchor="middle">pure pipe</text>
  <text class="d-sub" x="170" y="162" text-anchor="middle">same inputs as last time?</text>
  <rect class="d-box" x="430" y="118" width="240" height="56" rx="10"/>
  <text class="d-text" x="550" y="142" text-anchor="middle">impure pipe</text>
  <text class="d-sub" x="550" y="162" text-anchor="middle">no comparison</text>
  <path class="d-edge-accent" d="M 120 178 L 120 212" marker-end="url(#pp-arrow)"/>
  <path class="d-edge" d="M 220 178 L 220 212" marker-end="url(#pp-arrow)"/>
  <rect class="d-box-muted" x="40" y="218" width="130" height="44" rx="8"/>
  <text class="d-sub" x="105" y="245" text-anchor="middle">yes: reuse</text>
  <rect class="d-box" x="180" y="218" width="130" height="44" rx="8"/>
  <text class="d-sub" x="245" y="245" text-anchor="middle">no: transform</text>
  <path class="d-edge" d="M 550 178 L 550 212" marker-end="url(#pp-arrow)"/>
  <rect class="d-box" x="470" y="218" width="160" height="44" rx="8"/>
  <text class="d-sub" x="550" y="245" text-anchor="middle">always transform</text>
</svg>

"Same inputs" means <code>===</code> on each argument. That is exactly why the mutation trap below exists.

## 5. Verified: counting <code>transform()</code> calls

The runnable example shows the same total three ways: through the pure <code>total</code> pipe, through an identical impure <code>totalImpure</code> pipe, and (in a companion test) through a plain method <code>sum(prices)</code> called in the template. Each logs when it runs. Three buttons: an unrelated signal change, <code>cart.push(10)</code> (mutation), and <code>cart = [...cart, 10]</code> (a new array):

\`\`\`
pure   total(2 items)
impure total(2 items)
  shown: Pure: €48.00 | Impure: €48.00
click Unrelated change:
impure total(2 items)
  shown: Pure: €48.00 | Impure: €48.00
click Add item (mutate):
impure total(3 items)
  shown: Pure: €48.00 | Impure: €60.00
click Add item (new array):
pure   total(4 items)
impure total(4 items)
  shown: Pure: €72.00 | Impure: €72.00
\`\`\`

Reading it line by line:

- **Unrelated change:** the view was re-checked. The impure pipe ran again for nothing; the pure pipe did not. The companion test with a template method showed <code>method sum()</code> re-running here too, just like the impure pipe.
- **Mutation:** <code>push</code> kept the same array reference, so the pure pipe kept showing **€48.00, a stale value**, while the impure pipe noticed the third item (€60.00).
- **New array:** a new reference, so the pure pipe ran and both agree at €72.00.

The fix for the stale value is almost never <code>pure: false</code>; it is to update data immutably, which is what [signals](/interview-question/what-are-angular-signals) with <code>update(list =&gt; [...list, item])</code> encourage anyway.

## 6. Verified: which built-in pipes are impure

Reading the 22.2.3 <code>@angular/common</code> bundle, exactly four built-in pipes are declared with <code>pure: false</code>: <code>async</code>, <code>json</code>, <code>keyvalue</code> and <code>slice</code>. <code>async</code> must be impure because its input reference (the [Observable](/interview-question/what-is-the-difference-between-observables-and-promises)) stays the same while the values it emits change. The other three are impure so they reflect in-place changes to the objects and arrays they display. Everything else, including <code>date</code> and <code>currency</code>, is pure.

## 7. Pipes, Methods and <code>computed()</code>

| | Pure pipe | Impure pipe | Template method call | <code>computed()</code> signal |
| :--- | :--- | :--- | :--- | :--- |
| Runs when | An argument changes (<code>===</code>) | Every check of the view | Every check of the view | A signal it read changes |
| Sees mutations | No | Yes | Yes | No (needs a new value set) |
| Reusable across components | Yes | Yes | No | No, per component |
| Best for | Formatting, small pure derivations | Rare: values that change without a new reference | Avoid for anything costly | Component-level derived state |

The template method row matches the measurements above. For a deeper comparison of methods, getters and <code>computed()</code>, see [computed signals vs method calls in templates](/interview-question/what-is-the-difference-between-computed-signals-and-standard-method-getter-calls). How often a view is checked in the first place is covered in [change detection](/interview-question/how-does-change-detection-work-in-angular).

## 8. Common Pitfalls

- **Mutating an array and wondering why the pure pipe is stale.** Verified: after <code>push</code> the pure pipe still showed €48.00. Replace the array instead.
- **Reaching for <code>pure: false</code> to fix that.** It works, but the pipe then runs on every check of the view, as the unrelated-change click showed.
- **Forgetting to import a pipe.** Standalone components must list <code>DatePipe</code>, <code>CurrencyPipe</code> or your own pipe in <code>imports</code>; a missing pipe is a compile error in AOT (verified: <code>NG8004: No pipe found with name 'currency'</code>).
- **Putting side effects in <code>transform</code>.** Pipes may be called often and in any order; keep them pure functions of their arguments, which also makes them trivial to [test](/interview-question/how-do-you-test-signal-components-defer-blocks-and-new-control-flow-in-2025) (the logging in the example is only there to count calls).
- **Heavy work in a method called from the template.** It re-runs on every check; use a pure pipe or <code>computed()</code>.
- **Expecting <code>json</code>, <code>slice</code> or <code>keyvalue</code> to be cheap in big lists.** They are impure and re-run every pass.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">"A pipe is a small class with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">transform</code> method that formats or derives a value in a template, written <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{{ value | name: arg }}</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Built-ins:</strong> <span style="color:#f0e2c8;">"Angular ships <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">date</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">currency</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">decimal</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">percent</code>, case pipes, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">json</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slice</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">keyvalue</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">async</code>. They are standalone, so I import the ones a component uses."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Custom pipes:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@Pipe({ name: 'total' })</code> plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">transform(prices, taxRate)</code>. Arguments follow colons and pipes chain, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cart | total: 0.2 | currency: 'EUR'</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Pure vs impure:</strong> <span style="color:#f0e2c8;">"A pure pipe, the default, re-runs only when its inputs change by reference. I measured it: an unrelated click re-ran the impure pipe and a template method, but not the pure pipe."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trade-off:</strong> <span style="color:#f0e2c8;">"Because of that, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push()</code> into an array is invisible to a pure pipe. Prefer immutable updates over <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pure: false</code>, since impure pipes run on every check."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">async</code> impure?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It has to notice when the subscribed Observable or Promise emits a new value, even though the reference it was given is the same. So it is checked every pass and manages its own subscription.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Pipe or <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">computed()</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A pipe is reusable formatting across many templates; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed()</code> is derived state for one component, cached on its signal dependencies. Many teams use pipes for formatting and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> for business logic.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just call a method in the template?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A method is re-run on every check of the view. Measured: an unrelated click re-ran <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sum()</code> but not the pure pipe. With signals, a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed()</code> gives the same caching.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a pipe inject services?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. The built-in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">date</code> pipe receives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LOCALE_ID</code> through its constructor, and a custom pipe can use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inject()</code>. Keep such pipes pure where possible so they do not run on every change detection pass.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do I unit test a pipe?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A pure pipe is a plain class: create it and call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">transform</code> with inputs. Only pipes that inject services need <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TestBed</code>, inside an injection context.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Pipe** | A class with <code>transform()</code> used as <code>value \\| name</code> in templates |
| **<code>PipeTransform</code>** | The interface a pipe implements: one <code>transform</code> method |
| **Pure pipe** | Re-runs only when an argument changes by value or reference (default) |
| **Impure pipe** | <code>pure: false</code>; re-runs on every change detection pass |
| **Chaining** | Feeding one pipe's output into the next, left to right |
| **Memoisation** | Reusing a previous result when the inputs are the same |

---
**Conclusion:** Pipes keep raw data in the component and formatting in the template: <code>{{ cart | total: 0.2 | currency: "EUR" }}</code> rendered <code>€48.00</code> from <code>[25, 15]</code>. Pure pipes, the default, memoise on their arguments, so on 22.2.3 an unrelated change re-ran the impure pipe and a template method but not the pure pipe, and a <code>push</code> left the pure pipe showing a stale total until the array was replaced. Use pure pipes with immutable data for formatting, <code>computed()</code> for component-level derived state, and keep impure pipes, like the built-in <code>async</code>, <code>json</code>, <code>keyvalue</code> and <code>slice</code>, for the rare values that change without a new reference.`,
    examples: [
      {
        label: "Built-in pipes, a custom pure pipe with an argument, and an impure twin that logs every call",
        tech: "angular",
        runnable: true,
        code: `import { Component, Pipe, PipeTransform, signal } from "@angular/core";
import { CurrencyPipe, DatePipe, UpperCasePipe } from "@angular/common";

// A custom pure pipe with an argument: {{ cart | total: 0.2 }}
@Pipe({ name: "total" })
export class TotalPipe implements PipeTransform {
  transform(prices: number[], taxRate = 0): number {
    console.log("pure   total(" + prices.length + " items)");
    return prices.reduce((sum, p) => sum + p, 0) * (1 + taxRate);
  }
}

// Same logic, but impure: re-runs on every change detection pass of this view.
@Pipe({ name: "totalImpure", pure: false })
export class TotalImpurePipe implements PipeTransform {
  transform(prices: number[], taxRate = 0): number {
    console.log("impure total(" + prices.length + " items)");
    return prices.reduce((sum, p) => sum + p, 0) * (1 + taxRate);
  }
}

@Component({
  selector: "app-root",
  imports: [TotalPipe, TotalImpurePipe, CurrencyPipe, DatePipe, UpperCasePipe],
  template: \`
    <p>{{ "order summary" | uppercase }} for {{ placed | date: "d MMM y" }}</p>
    <p id="pure">Pure: {{ cart | total: 0.2 | currency: "EUR" }}</p>
    <p id="impure">Impure: {{ cart | totalImpure: 0.2 | currency: "EUR" }}</p>
    <p>Clicks: {{ clicks() }}</p>

    <button (click)="clicks.set(clicks() + 1)">Unrelated change</button>
    <button (click)="cart.push(10)">Add item (mutate)</button>
    <button (click)="cart = [...cart, 10]">Add item (new array)</button>
  \`,
})
export class AppComponent {
  cart = [25, 15];
  clicks = signal(0);
  placed = new Date(2026, 9, 16);
}`,
      },
    ],
  },
];

export default augments;
