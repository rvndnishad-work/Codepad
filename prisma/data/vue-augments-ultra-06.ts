/**
 * Vue ULTRA — batch 06: Composition API vs Options API, composables, composables
 * vs mixins, lifecycle hooks, defineOptions/defineSlots, generic <script setup>
 * components, useId() for SSR-safe ids, global properties and app config,
 * plugins, and TypeScript with Vue.
 *
 * Full CLAUDE.md treatment per question, matching the Angular, React and
 * Next.js ultra banks: a plain-language story first, `📌 Interview term:`
 * callouts, Verified sections quoting output that was actually produced, a
 * theme-aware `.iq-diagram` SVG, comparison tables, topic-specific pitfalls,
 * the §7 "How to Answer in an Interview" card, a glossary and a conclusion.
 *
 * Picked up by the Vue augment script; sorts after the older vue-augments
 * files, so these override the short answers.
 *
 * Every "Verified" block was produced on Vue 3.5.44 (the current stable) with
 * scripts/verify-vue-example.mjs: the SFC compiled with @vue/compiler-sfc and
 * mounted with createApp in jsdom, or rendered with renderToString (--ssr).
 * Multi-file demos (plugins, app config, SSR hydration) were bundled with
 * esbuild and run in jsdom; type errors were produced by vue-tsc 3.3.13 with
 * TypeScript 5.9; bundle sizes by vite 8.3.4 with @vitejs/plugin-vue 6.0.10.
 * Examples marked runnable are byte-identical to files that passed the verifier.
 *
 * Conventions: SVG attributes double-quoted, `<code>` tags or backticks for
 * inline code in prose, no leading H1, `description` is plain markdown (no HTML).
 */
import type { VueAugment } from "./vue-augments.types";

const augments: VueAugment[] = [

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the Composition API and how does it differ from the Options API?",
    seoDescription:
      "Vue's Options API groups code by option type; the Composition API groups it by feature with ref, computed and composables. Same reactivity, verified.",
    description: `**Question presented to candidate:**
"Our codebase has older Vue components written with \`data\`, \`methods\` and \`computed\`, and newer ones using \`<script setup>\`. Explain what the Composition API is, how it differs from the Options API, and which one you would pick for new code."

**What a strong answer should cover:**
- The **Options API** organises a component by option type (\`data\`, \`computed\`, \`watch\`, \`methods\`, lifecycle options) and reaches state through \`this\`.
- The **Composition API** organises it by feature: \`ref\`, \`reactive\`, \`computed\`, \`watch\` and \`onMounted\` are imported functions called inside \`setup()\` or \`<script setup>\`.
- Both sit on the **same reactivity system**; the Options API is implemented on top of it, so they are equally capable and can be mixed in one component.
- The real wins are **logic reuse through composables**, better **TypeScript inference** (no \`this\`), and code that groups by concern in large components.
- Trade-offs: the Options API is more guided for beginners; the Composition API needs discipline (\`.value\`, organising code yourself).
- A build can drop the Options API code with the \`__VUE_OPTIONS_API__\` flag when no component uses it.

**Clarifying questions expected:**
- "Is this for new components only, or are we considering migrating existing ones?"
- "Do we use TypeScript? That changes how strong the case is."

**Code / implementation expected:** Optional — the same small feature in both styles, ideally showing \`this\` versus \`ref\` and \`.value\`.`,
    answer: `**Target Audience:** Anyone preparing for a Vue interview — assumes basic JavaScript, no Vue experience required.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then \`📌 Interview term:\` callouts with the words an interviewer listens for. Every output quoted in a "Verified" section was produced by compiling the example with \`@vue/compiler-sfc\` and mounting it in jsdom on Vue 3.5.44, the current stable release; bundle sizes come from a real \`vite build\`.

## 1. Why This Even Matters — A Story First

Imagine two ways of organising a kitchen.

In the first kitchen, everything is sorted **by type of thing**: one drawer holds every knife, one shelf every pan, one cupboard every spice. To cook a curry you walk to the knife drawer, then the pan shelf, then the spice cupboard, then back to the knives. It is tidy, and a new cook always knows where to look, but one recipe is spread over the whole room.

In the second kitchen, everything is sorted **by recipe**: a curry box holds its own knife, its own pan and its own spices. To cook a curry you open one box. You can even hand the box to another kitchen and it just works.

The first kitchen is Vue's **Options API**. The second is the **Composition API**. Same ingredients, same stove (Vue's reactivity system), different way of arranging them. Interviewers ask this because a good answer shows you understand that the difference is *organisation and reuse*, not capability.

## 2. The Core Idea

📌 **Interview term: Options API** — you describe a component as an object of named options: \`data()\` returns state, \`computed\` holds derived values, \`watch\` reacts to changes, \`methods\` holds functions, and lifecycle options such as \`mounted()\` run at set moments. Everything is reached through \`this\`.

📌 **Interview term: Composition API** — a set of functions imported from \`vue\` (\`ref\`, \`reactive\`, \`computed\`, \`watch\`, \`onMounted\` and so on) that you call inside \`setup()\`, or more commonly inside \`<script setup>\`. State is held in plain variables, and related code sits together. See [ref versus reactive](/interview-question/what-is-the-difference-between-ref-and-reactive).

📌 **Interview term: \`<script setup>\`** — compile-time syntax sugar for the Composition API inside a [Single File Component](/interview-question/what-is-a-single-file-component-sfc). Top-level variables and imports are automatically available to the template, so there is no \`return\` object and no \`export default\`.

📌 **Interview term: Logical concern** — one feature of a component, such as "search", "pagination" or "unsaved-changes warning". The whole argument for the Composition API is that a logical concern should live in one place.

Both APIs are built on the same engine. The Options API is implemented *on top of* the reactivity functions the Composition API exposes, so neither can do something the other cannot. You can also mix them: a component with \`setup()\` can still have \`methods\` and \`mounted()\`, and those can read what \`setup()\` returned.

## 3. Organised by Option versus Organised by Feature

<svg class="iq-diagram" width="100%" viewBox="0 0 700 330" role="img" aria-label="Options API spreads two features across five option blocks, Composition API keeps each feature in one block">
  <text class="d-text" x="170" y="28" text-anchor="middle">Options API</text>
  <rect class="d-box" x="40" y="48" width="260" height="40" rx="8"/>
  <text class="d-sub" x="170" y="73" text-anchor="middle">data: query, page</text>
  <rect class="d-box" x="40" y="104" width="260" height="40" rx="8"/>
  <text class="d-sub" x="170" y="129" text-anchor="middle">computed: results, pageCount</text>
  <rect class="d-box" x="40" y="160" width="260" height="40" rx="8"/>
  <text class="d-sub" x="170" y="185" text-anchor="middle">watch: query</text>
  <rect class="d-box" x="40" y="216" width="260" height="40" rx="8"/>
  <text class="d-sub" x="170" y="241" text-anchor="middle">methods: search, nextPage</text>
  <rect class="d-box" x="40" y="272" width="260" height="40" rx="8"/>
  <text class="d-sub" x="170" y="297" text-anchor="middle">mounted: search</text>
  <text class="d-text" x="530" y="28" text-anchor="middle">Composition API</text>
  <rect class="d-box-accent" x="400" y="48" width="260" height="124" rx="12"/>
  <text class="d-text d-accent" x="530" y="78" text-anchor="middle">search feature</text>
  <text class="d-sub" x="530" y="106" text-anchor="middle">query ref, results computed</text>
  <text class="d-sub" x="530" y="132" text-anchor="middle">watch query, onMounted</text>
  <text class="d-sub" x="530" y="156" text-anchor="middle">useSearch()</text>
  <rect class="d-box-muted" x="400" y="196" width="260" height="116" rx="12"/>
  <text class="d-text" x="530" y="226" text-anchor="middle">pagination feature</text>
  <text class="d-sub" x="530" y="254" text-anchor="middle">page ref, pageCount computed</text>
  <text class="d-sub" x="530" y="280" text-anchor="middle">nextPage function</text>
  <text class="d-sub" x="530" y="302" text-anchor="middle">usePagination()</text>
</svg>

On the left, the search feature and the pagination feature are interleaved across five option blocks; to read one feature you scroll through all of them. On the right, each feature is one contiguous block, and because it is just functions it can be cut out into a [composable](/interview-question/what-are-composables-in-vue) and reused.

## 4. Side by Side

| | Options API | Composition API |
| :--- | :--- | :--- |
| Shape | An object of options | Functions called in \`setup()\` / \`<script setup>\` |
| State | \`data()\` return object | \`ref()\` / \`reactive()\` variables |
| Accessing state | \`this.count\` | \`count.value\` in script, \`count\` in the template |
| Derived values | \`computed: { double() {} }\` | \`const double = computed(() => ...)\` |
| Side effects | \`watch: {}\`, \`mounted()\` | \`watch()\`, \`watchEffect()\`, \`onMounted()\` |
| Code grouped by | Option type | Feature (logical concern) |
| Logic reuse | [Mixins](/interview-question/why-are-composables-preferred-over-mixins) (name clashes, unclear sources) | Composables (explicit inputs and outputs) |
| TypeScript | Works, but \`this\` typing needs \`defineComponent\` and is weaker | Plain variables and functions, so inference just works |
| Learning curve | Gentler, more guided | Needs \`.value\` and self-organisation |
| Bundle | Needs the Options API runtime | Options API runtime can be dropped by a build flag |

## 5. Verified: the same feature written both ways

The first example at the bottom implements one feature twice in one file: a counter with a doubled value, a watcher that keeps a change log, and a mounted log line. \`OptionsCounter\` uses \`data\`, \`computed\`, \`watch\`, \`methods\` and \`mounted\`; the second half uses \`ref\`, \`computed\`, \`watch\` and \`onMounted\`. After clicking each button twice, the two halves print identical state:

\`\`\`
[options] mounted, this.count = 0
[composition] mounted, count.value = 0
[app] RENDERED: Options +1count 0, double 0, log []Composition +1count 0, double 0, log []
after 2 clicks each: count 2, double 4, log [0->1, 1->2]
after 2 clicks each: count 2, double 4, log [0->1, 1->2]
\`\`\`

Same reactivity, same watcher semantics, same result. The only differences are where the code lives and whether you write \`this.count\` or \`count.value\`.

## 6. Verified: \`this\` and mixing both styles

The second example uses a classic \`setup()\` option next to \`data()\` and \`mounted()\`. Two facts come out of running it:

\`\`\`
inside setup(), this is undefined
mounted() sees hello world
[app] RENDERED: hello world
\`\`\`

- \`setup()\` runs **before** the component instance is exposed through \`this\`, so \`this\` is \`undefined\` there. Composition API code never uses \`this\`.
- Whatever \`setup()\` returns is merged into the instance, so Options API code (\`mounted\`, \`methods\`, the template) can read it. That is what makes a gradual migration possible: convert one feature at a time.

📌 **Interview term: \`setup()\`** — the Composition API entry point. It runs once per component instance, before \`beforeCreate\`, receives \`props\` and a context object (\`attrs\`, \`slots\`, \`emit\`, \`expose\`), and returns the bindings the template can use. See [lifecycle hooks](/interview-question/what-are-vue-lifecycle-hooks) for exactly where it sits in the order.

## 7. Verified: dropping the Options API from the bundle

📌 **Interview term: \`__VUE_OPTIONS_API__\`** — a compile-time feature flag. When it is \`false\`, the bundler tree-shakes the code that implements \`data\`, \`computed\`, \`methods\`, mixins and the other options.

The same one-component \`<script setup>\` app was built with \`vite build\` (vite 8.3.4, \`@vitejs/plugin-vue\` 6.0.10) twice:

| \`__VUE_OPTIONS_API__\` | JS bundle | gzipped |
| :--- | :--- | :--- |
| \`true\` (the default) | 62,473 bytes | 24,238 bytes |
| \`false\` | 55,027 bytes | 21,360 bytes |

About 7.4 KB minified (2.9 KB gzipped) saved. That only works if **no** component in the app, including third-party ones, uses the Options API, so it is a nice-to-have, not a reason to choose an API.

## 8. Why the Composition API Exists

The Composition API shipped with Vue 3.0 (September 2020) and was backported to Vue 2.7 (July 2022), according to the npm publish dates of those versions. It answered three pains of large Options API components:

1. **Feature code was scattered.** A 600-line component with five features had each feature spread across five options.
2. **Reuse meant mixins.** Mixins merge silently into \`this\`, which causes name collisions and makes it unclear where a property came from.
3. **TypeScript struggled with \`this\`.** Inferring the type of \`this\` across options needs heavy type machinery; plain variables need none. See [TypeScript with Vue](/interview-question/how-do-you-use-typescript-with-vue-typed-props-emits-refs-vue-tsc).

The Options API is **not deprecated**. It is still documented, still supported in 3.5, and perfectly reasonable for small components and teams new to Vue.

## 9. Which One Should You Pick?

- **New code in a TypeScript project, or anything with reusable logic:** Composition API with \`<script setup>\`. This is what the official tooling and most of the ecosystem (Pinia setup stores, VueUse) assume.
- **Small, simple components, or a team learning Vue:** the Options API is fine and more guided.
- **An existing Options API codebase:** do not rewrite for its own sake. Use the Composition API for new components and extract reusable logic into composables when you next touch a feature.

## 10. Common Pitfalls

- **Forgetting \`.value\` in script.** \`count++\` on a ref does nothing useful; it must be \`count.value++\`. Templates unwrap refs automatically, which is why the bug only appears in script.
- **Destructuring a \`reactive()\` object.** \`const { count } = reactive({ count: 0 })\` copies a plain number and loses reactivity. Use \`toRefs()\` or keep it as a ref. See [reactivity caveats](/interview-question/what-are-common-reactivity-caveats-in-vue).
- **Reaching for \`this\` in \`setup()\`.** It is \`undefined\` there (verified above). Use the \`props\` argument and the context object instead.
- **Writing one giant \`<script setup>\`.** The Composition API does not organise code for you. Without grouping by feature or extracting composables, you get spaghetti in a different shape.
- **Thinking the Options API is deprecated or slower.** It runs on the same reactivity system. The measurable difference is the optional 2.9 KB gzip of runtime you can drop when nothing uses it.
- **Calling lifecycle functions conditionally or after a timer.** \`onMounted\` must be called synchronously during \`setup()\`; called later it does nothing and logs a warning.

## 11. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"Both are ways to write the same Vue component: the Options API groups code by option type through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">this</code>, the Composition API groups it by feature with imported functions like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ref</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Same engine:</strong> <span style="color:#f0e2c8;">"They share one reactivity system, the Options API is built on top of it, and you can mix the two in one component because whatever <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setup()</code> returns is visible to the options."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it exists:</strong> <span style="color:#f0e2c8;">"It solves three large-app problems: scattered feature code, mixin-based reuse with name clashes, and weak TypeScript inference around <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">this</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The reuse story:</strong> <span style="color:#f0e2c8;">"Because logic is just functions, I can extract a feature into a composable such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">usePagination()</code> and share it with explicit inputs and outputs."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. My choice:</strong> <span style="color:#f0e2c8;">"New code gets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;script setup&gt;</code> with TypeScript; I leave working Options API components alone and migrate feature by feature when I touch them."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is the Options API deprecated?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It is fully supported in Vue 3.5 and documented as a first-class style. Only mixins are discouraged for new code; the options themselves are fine.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is the Composition API faster at runtime?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not meaningfully, they use the same reactivity. The measurable difference is bundle size: with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__VUE_OPTIONS_API__</code> set to false a small app dropped from 24,238 to 21,360 bytes gzipped in a real vite build, but only if no component uses options.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">setup()</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&lt;script setup&gt;</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;script setup&gt;</code> is compile-time sugar for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setup()</code>. Top-level bindings are exposed to the template automatically, macros like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineProps</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineEmits</code> are available, and the component is closed by default unless you call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineExpose</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">this</code> not work inside <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">setup()</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setup()</code> runs before the public instance proxy is handed to user code, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">this</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code>. You get <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">props</code> as the first argument and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">attrs</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slots</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">emit</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">expose</code> from the second.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you migrate a large Options API component?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">One feature at a time: add a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setup()</code> that returns the converted feature, delete the matching options, and keep the rest working because options can read what <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setup()</code> returns. Extract anything reused into a composable, and add tests before you start.</span>
</div>

</div>

## 12. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Options API** | Component described as \`data\`, \`computed\`, \`watch\`, \`methods\` and lifecycle options, accessed through \`this\` |
| **Composition API** | Imported functions (\`ref\`, \`computed\`, \`watch\`, \`onMounted\`) called inside \`setup()\` |
| **\`<script setup>\`** | Compile-time sugar for \`setup()\` in an SFC; top-level bindings reach the template |
| **\`setup()\`** | Runs once per instance before \`beforeCreate\`; \`this\` is \`undefined\` there |
| **Logical concern** | One feature of a component, which the Composition API keeps in one place |
| **\`__VUE_OPTIONS_API__\`** | Build flag that tree-shakes Options API support when false |

---
**Conclusion:** The Options API and the Composition API are two arrangements of the same Vue reactivity. The Options API sorts code by what kind of thing it is and reaches it through \`this\`; the Composition API sorts it by feature with plain functions and variables, which makes reuse through composables and TypeScript inference natural. As verified on Vue 3.5.44, both produce identical behaviour, they can be mixed in one component, and the only hard number between them is a few kilobytes of optional runtime. A strong answer picks the Composition API for new, typed, reusable code without calling the Options API wrong.`,
    examples: [
      {
        label: "The same counter written with the Options API and the Composition API",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { ref, computed, watch, onMounted, h, defineComponent } from "vue";

// ── Options API: the same feature split across data / computed / watch / methods / mounted
const OptionsCounter = defineComponent({
  name: "OptionsCounter",
  data() {
    return { count: 0, log: [] };
  },
  computed: {
    double() { return this.count * 2; },
  },
  watch: {
    count(now, before) { this.log.push(\`\${before}->\${now}\`); },
  },
  methods: {
    inc() { this.count++; },
  },
  mounted() { console.log("[options] mounted, this.count =", this.count); },
  render() {
    return h("div", { class: "box" }, [
      h("button", { id: "opt", onClick: this.inc }, "Options +1"),
      h("p", \`count \${this.count}, double \${this.double}, log [\${this.log.join(", ")}]\`),
    ]);
  },
});

// ── Composition API: the same feature as one block of plain functions
const count = ref(0);
const log = ref([]);
const double = computed(() => count.value * 2);
watch(count, (now, before) => log.value.push(\`\${before}->\${now}\`));
const inc = () => count.value++;
onMounted(() => console.log("[composition] mounted, count.value =", count.value));
</script>

<template>
  <OptionsCounter />
  <div class="box">
    <button id="comp" @click="inc">Composition +1</button>
    <p>count {{ count }}, double {{ double }}, log [{{ log.join(", ") }}]</p>
  </div>
</template>
`,
      },
      {
        label: "Mixing both styles: setup() return values are visible to Options API code",
        tech: "vue",
        runnable: true,
        code: `<script>
import { ref } from "vue";
export default {
  setup() {
    console.log("inside setup(), this is", this);
    const fromSetup = ref("hello");
    return { fromSetup };
  },
  data() { return { fromData: "world" }; },
  mounted() { console.log("mounted() sees", this.fromSetup, this.fromData); },
};
</script>
<template><p>{{ fromSetup }} {{ fromData }}</p></template>
`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are composables in Vue?",
    seoDescription:
      "A composable is a use-prefixed function that packages reactive state and side effects for reuse. Per-call state, cleanup and toValue, verified.",
    description: `**Question presented to candidate:**
"Several of our components each re-implement 'listen to window resize and clean up on unmount' and 'fetch with a loading flag'. What is a composable, how would you write one for this, and what rules does it have to follow?"

**What a strong answer should cover:**
- A composable is a **function, named \`useX\` by convention**, that uses Composition API primitives (\`ref\`, \`computed\`, \`watch\`, lifecycle hooks) to encapsulate **stateful logic** and returns refs and functions.
- **State created inside the function is per call**, so each component gets its own copy; state hoisted to module scope is **shared**.
- Lifecycle hooks inside a composable attach to the **calling component**, so cleanup (\`onUnmounted\`, \`onScopeDispose\`) happens automatically.
- Composables must be called **synchronously in \`setup()\` / \`<script setup>\`** (or inside another composable or an \`effectScope\`).
- Inputs should accept a value, a ref or a getter and normalise with **\`toValue()\`**; return a plain object of refs so callers can destructure.
- Contrast with mixins (implicit, collision-prone) and with plain utility functions (stateless).

**Clarifying questions expected:**
- "Should the state be per component or shared across the app? That decides where the ref lives."
- "Does this need to run during SSR? Browser-only side effects belong in \`onMounted\`."

**Code / implementation expected:** Yes — a small composable with cleanup, used by two components to show independent state.`,
    answer: `**Target Audience:** Vue developers who know \`ref\` and \`computed\` and want to reuse logic properly.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then \`📌 Interview term:\` callouts. Every output in the "Verified" sections was produced by running the examples on Vue 3.5.44: the SFC was compiled and mounted in jsdom with the repo verifier, the plain-JavaScript example ran under Node.

## 1. Why This Even Matters — A Story First

Think of a power tool battery. You do not wire a new battery into every drill, sander and torch you own. You build one battery pack with a standard plug, and any tool that clicks it in gets power. When the tool is put away, the battery is unplugged with it.

A **composable** is that battery pack for Vue components. "Track the mouse position", "debounce this input", "fetch this URL with a loading flag", "listen to a window event and stop listening when I go away": each is a small pack of state plus behaviour. Any component that calls the function gets its own fresh pack, and when the component is unmounted the pack's cleanup runs automatically.

Interviewers ask about composables because they are *the* reuse mechanism of modern Vue. A good answer shows you know what makes them safe: explicit inputs and outputs, per-call state, and cleanup tied to the caller.

## 2. The Core Idea

📌 **Interview term: Composable** — a function that uses Vue Composition API primitives to encapsulate and reuse **stateful** logic. By convention its name starts with \`use\` (\`useMouse\`, \`useFetch\`, \`useCart\`) and it returns an object of refs and functions.

📌 **Interview term: Stateful logic** — logic that owns changing data over time (a position, a loading flag, a timer). A stateless helper like \`formatDate()\` is just a utility function, not a composable.

📌 **Interview term: \`toValue()\`** — added in Vue 3.3; turns a plain value, a ref or a getter function into its current value. It lets a composable accept any of the three as input, so callers can pass \`name\`, \`nameRef\` or \`() => props.name\`.

A composable has no special API. It is literally a function that calls \`ref\`, \`computed\`, \`watch\`, \`onMounted\` and friends. What makes it work is *where* it is called: inside a component's \`setup()\` or \`<script setup>\`, Vue knows which component instance is active, so any hook or watcher the composable creates is attached to that component.

## 3. How a Composable Plugs Into a Component

<svg class="iq-diagram" width="100%" viewBox="0 0 700 300" role="img" aria-label="Two components each call useCounter and get separate state, while lifecycle hooks inside the composable attach to the caller">
  <defs>
    <marker id="cmp-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="250" y="30" width="200" height="70" rx="12"/>
  <text class="d-text d-accent" x="350" y="60" text-anchor="middle">useCounter(start)</text>
  <text class="d-sub" x="350" y="84" text-anchor="middle">ref, inc, onUnmounted</text>
  <path class="d-edge-accent" d="M 300 104 L 170 160" marker-end="url(#cmp-arrow)"/>
  <path class="d-edge-accent" d="M 400 104 L 530 160" marker-end="url(#cmp-arrow)"/>
  <rect class="d-box" x="60" y="166" width="220" height="100" rx="12"/>
  <text class="d-text" x="170" y="196" text-anchor="middle">Widget first</text>
  <text class="d-sub" x="170" y="222" text-anchor="middle">own count: 13</text>
  <text class="d-sub" x="170" y="246" text-anchor="middle">own listener</text>
  <rect class="d-box-muted" x="420" y="166" width="220" height="100" rx="12"/>
  <text class="d-text" x="530" y="196" text-anchor="middle">Widget second</text>
  <text class="d-sub" x="530" y="222" text-anchor="middle">own count: 11</text>
  <text class="d-sub" x="530" y="246" text-anchor="middle">removed on unmount</text>
</svg>

Each call runs the function body again, so each component receives new refs. The \`onMounted\` and \`onUnmounted\` calls inside the composable register on whichever component is running \`setup()\` at that moment, which is why the second widget's listener disappears when that widget is removed and the first widget's listener is untouched.

## 4. Verified: per-call state, automatic cleanup, flexible input

The runnable example at the bottom defines three composables in one file and mounts two \`Widget\` components that both call \`useCounter(10)\` and \`useEventListener(window, "keydown", ...)\`. The driver clicks, presses \`+\`, removes the second widget, presses \`+\` again and types a new name:

\`\`\`
[watchEffect] pretty = Ada Lovelace
[app] RENDERED: first: 10second: 10remove secondAda Lovelace | Grace Hopper | Ada Lovelace Jr
click first   : first: 11second: 10remove secondAda Lovelace | Grace Hopper | Ada Lovelace Jr
press + key   : first: 12second: 11remove secondAda Lovelace | Grace Hopper | Ada Lovelace Jr
[useEventListener] removed "keydown" listener
after removal : first: 13remove secondAda Lovelace | Grace Hopper | Ada Lovelace Jr
[watchEffect] pretty = Katherine Johnson
typed         : first: 13remove secondKatherine Johnson | Grace Hopper | Katherine Johnson Jr
[useEventListener] removed "keydown" listener
\`\`\`

Reading it line by line:

- **Independent state.** Clicking the first widget moved it to 11 while the second stayed at 10.
- **Shared behaviour, separate listeners.** One key press reached both widgets (12 and 11), because each registered its own listener.
- **Cleanup belongs to the caller.** Removing the second widget ran its \`onUnmounted\`, so the next key press moved only the first widget to 13. The final "removed" line is the first widget cleaning up when the whole app unmounts.
- **\`toValue()\` input.** \`useTitleCase\` was called with a ref, a plain string and a getter. The ref and getter versions updated when the input changed; the plain string stayed fixed.

## 5. Verified: what happens outside a component

The second example runs composables as plain JavaScript under Node:

\`\`\`
outside a component, count = 7
shared between callers: 1 1 true
[Vue warn]: onUnmounted is called when there is no active component instance to be associated with. Lifecycle injection APIs can only be used during execution of setup(). If you are using async setup(), make sure to register lifecycle hooks before the first await statement.
scope watcher saw 2
after scope.stop(), no more watcher output
\`\`\`

Three lessons:

1. **A composable that only uses \`ref\` and \`computed\` works anywhere**, which makes it trivial to unit test.
2. **Where the ref lives decides sharing.** A ref created *inside* the function is per call; a ref created *outside* it at module level is one value shared by every caller (\`a.shared === b.shared\` is \`true\`). That is a lightweight global store, and on the server it would be shared across requests, which is why SSR apps use Pinia or \`provide\` instead.
3. **Lifecycle hooks need a host.** Without an active component the hook is dropped with the warning above. An [\`effectScope\`](/interview-question/what-is-effectscope-and-why-do-composables-use-it-for-cleanup) can host watchers instead: stopping the scope stopped the watcher.

📌 **Interview term: \`onScopeDispose()\`** — registers cleanup on the current effect scope. Inside a component it runs on unmount, just like \`onUnmounted\`, but it also works when the composable is run inside a bare \`effectScope\`, so library composables often prefer it.

## 6. Anatomy of a Good Composable

| Convention | Why |
| :--- | :--- |
| Name starts with \`use\` | Signals "call me in setup", and tooling and linters recognise it |
| Accepts refs, getters or values, normalised with \`toValue()\` | Callers choose whether the input is reactive |
| Reads inputs inside \`computed\` / \`watch\` / \`watchEffect\` | So it reacts when a ref or getter input changes |
| Returns a plain object of refs | Callers can destructure and rename without losing reactivity |
| Registers cleanup (\`onUnmounted\` / \`onScopeDispose\`) | No leaked listeners, timers or subscriptions |
| Touches the DOM only in \`onMounted\` | Keeps it SSR-safe; the server never runs \`onMounted\` |
| Called synchronously at the top of \`setup()\` | Vue needs the active instance to attach hooks |

## 7. Composables Compared

| | Composable | Utility function | [Mixin](/interview-question/why-are-composables-preferred-over-mixins) | Renderless component |
| :--- | :--- | :--- | :--- | :--- |
| Holds reactive state | Yes | No | Yes | Yes |
| Where outputs appear | Variables you name | Return value | Merged into \`this\` | Slot props |
| Name collisions | Avoided by renaming on destructure | None | Silent | None |
| Extra component instance | No | No | No | Yes |
| Typical use | Shared stateful logic | Pure helpers | Legacy Options API code | Logic plus layout control in the template |

Composables are also Vue's equivalent of [React custom hooks](/interview-question/what-are-react-custom-hooks-and-when-should-you-use-them), with one important difference: \`setup()\` runs **once** per component, so a composable runs once too. There is no stale-closure problem and no rule against calling a composable inside a condition that is evaluated once, although calling it conditionally is still usually a design smell.

## 8. Real-World Composables

- **VueUse** is a large open-source library of ready-made composables (\`useMouse\`, \`useLocalStorage\`, \`useIntersectionObserver\`). Reading its source is the best way to learn the conventions above.
- **Data fetching** composables wrap loading, error and cancellation; see [fetching data in a component](/interview-question/how-do-you-fetch-data-in-a-vue-component-loading-errors-cancellation).
- **Pinia setup stores** are written exactly like a composable, but the state is shared and devtools-aware; see [what Pinia is](/interview-question/what-is-pinia-and-why-use-it).

## 9. Common Pitfalls

- **Calling a composable after \`await\` in a plain \`setup()\` function, or inside a callback.** Hooks registered then have no active instance and are dropped with the warning quoted in section 5. Call composables at the top of setup.
- **Returning a \`reactive()\` object and destructuring it.** The caller gets plain values. Return an object of refs, or wrap with \`toRefs()\`; see [toRef and toRefs](/interview-question/what-do-toref-and-torefs-do).
- **Reading \`toValue(input)\` once at the top.** That captures one value. Read it inside a \`computed\` or \`watch\` so changes are tracked.
- **Accidental shared state.** A ref declared outside the function is shared by every caller, and in SSR by every request. Decide deliberately.
- **Forgetting cleanup.** A listener or interval without \`onUnmounted\` / \`onScopeDispose\` keeps running after the component is gone, as the verified run shows when cleanup does exist.
- **Accessing \`window\` or \`document\` at call time.** That crashes on the server. Put DOM work in \`onMounted\`.

## 10. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"A composable is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">use</code>-prefixed function that packages stateful logic with Composition API primitives and returns refs and functions."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">"It has no special API; because it is called during <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setup()</code>, any <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ref</code>, watcher or lifecycle hook it creates belongs to the calling component."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. State:</strong> <span style="color:#f0e2c8;">"State created inside the function is per call, so two components get independent copies; a ref hoisted to module scope is shared by everyone."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Conventions:</strong> <span style="color:#f0e2c8;">"Accept values, refs or getters and normalise with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toValue()</code>, return a plain object of refs, register cleanup with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onUnmounted</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onScopeDispose</code>, and keep DOM work in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onMounted</code> for SSR."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Why it matters:</strong> <span style="color:#f0e2c8;">"It replaced mixins as Vue reuse: inputs and outputs are explicit, names are chosen at the call site, and types flow naturally."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test a composable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">If it only uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ref</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watch</code>, call it directly in a test. If it uses lifecycle hooks or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inject</code>, mount a tiny host component with Vue Test Utils, or run it inside an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">effectScope</code> and stop the scope to trigger <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onScopeDispose</code> cleanup.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you share state between components with a composable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Declare the ref outside the function so every caller gets the same one. It works for client-only apps, but in SSR that module state leaks between requests, so prefer Pinia or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">provide</code> there.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a composable call another composable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, that is the point of composition: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useCheckout()</code> can call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useCart()</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useFetch()</code>. Every hook still attaches to the component that called the outermost one.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between a composable and a React custom hook?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The idea is the same, but <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setup()</code> runs once, so a composable runs once per component instance. There is no re-run on every render, no dependency array and no stale closure; reactivity tracks dependencies instead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">toValue()</code> matter?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It lets the caller pass a plain value, a ref or a getter like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">() =&gt; props.id</code>. Inside a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watch</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toValue()</code> reads the current value and tracks it, so the composable reacts to prop changes without the caller wrapping anything.</span>
</div>

</div>

## 11. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Composable** | A \`useX\` function that bundles reactive state and behaviour for reuse |
| **Stateful logic** | Logic that owns data changing over time, as opposed to a pure helper |
| **\`toValue()\`** | Reads a value, ref or getter uniformly (Vue 3.3+) |
| **\`onScopeDispose()\`** | Cleanup tied to the current effect scope; runs on unmount inside components |
| **Shared state** | A ref declared outside the composable, so every caller sees one value |
| **VueUse** | Popular library of ready-made composables |

---
**Conclusion:** A composable is an ordinary function that uses Vue reactivity to package one piece of stateful behaviour. Because it runs during \`setup()\`, the refs it creates belong to the caller and the hooks it registers clean up with the caller, which the verified run shows directly: two widgets kept independent counts, and removing one removed only its listener. Add the conventions (a \`use\` name, \`toValue()\` inputs, refs out, cleanup always, DOM work in \`onMounted\`) and you have the reuse mechanism that replaced mixins in modern Vue.`,
    examples: [
      {
        label: "Three composables: per-instance state, a listener that cleans up, and a ref-or-getter input",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { ref, computed, watchEffect, toValue, onMounted, onUnmounted, h, defineComponent } from "vue";

// 1. A composable: a plain function that uses Vue reactivity and returns refs.
function useCounter(start = 0) {
  const count = ref(start);
  const inc = () => count.value++;
  return { count, inc };
}

// 2. A composable that owns a side effect and cleans it up with the component.
function useEventListener(target, event, handler) {
  onMounted(() => target.addEventListener(event, handler));
  onUnmounted(() => {
    target.removeEventListener(event, handler);
    console.log(\`[useEventListener] removed "\${event}" listener\`);
  });
}

// 3. A composable that accepts a plain value, a ref or a getter (toValue unwraps all three).
function useTitleCase(input) {
  return computed(() =>
    toValue(input).replace(/\\b\\w/g, (c) => c.toUpperCase()),
  );
}

// Each component that calls useCounter gets its own state.
const Widget = defineComponent({
  props: { label: String },
  setup(props) {
    const { count, inc } = useCounter(10);
    useEventListener(window, "keydown", (e) => {
      if (e.key === "+") inc();
    });
    return () => h("button", { class: "w", onClick: inc }, \`\${props.label}: \${count.value}\`);
  },
});

const showSecond = ref(true);
const name = ref("ada lovelace");
const pretty = useTitleCase(name);          // a ref
const fixed = useTitleCase("grace hopper"); // a plain string
const live = useTitleCase(() => name.value + " jr"); // a getter
watchEffect(() => console.log("[watchEffect] pretty =", pretty.value));
</script>

<template>
  <Widget label="first" />
  <Widget v-if="showSecond" label="second" />
  <button id="drop" @click="showSecond = false">remove second</button>
  <input id="name" v-model="name" />
  <p>{{ pretty }} | {{ fixed }} | {{ live }}</p>
</template>
`,
      },
      {
        label: "Composables outside a component: plain state works, lifecycle hooks warn, effectScope hosts watchers",
        tech: "js",
        runnable: false,
        code: `import { ref, onUnmounted, effectScope, watch, nextTick } from "vue";
function useCounter(start = 0) { const count = ref(start); return { count, inc: () => count.value++ }; }
const { count, inc } = useCounter(5); inc(); inc();
console.log("outside a component, count =", count.value);
// shared state: the ref lives outside the function
const shared = ref(0);
function useShared() { return { shared, bump: () => shared.value++ }; }
const a = useShared(), b = useShared(); a.bump();
console.log("shared between callers:", a.shared.value, b.shared.value, a.shared === b.shared);
// lifecycle composable outside setup
function useTicker() { const t = setInterval(() => {}, 1000); onUnmounted(() => clearInterval(t)); return t; }
clearInterval(useTicker());
// effectScope as a host
const scope = effectScope();
scope.run(() => { const src = ref(1); watch(src, v => console.log("scope watcher saw", v)); src.value = 2; globalThis.src = src; });
await nextTick(); scope.stop(); globalThis.src.value = 3; await nextTick();
console.log("after scope.stop(), no more watcher output");
`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Why are composables preferred over mixins?",
    difficulty: "medium",
    seoDescription:
      "Mixins merge silently into this: name clashes, hidden dependencies and unclear sources. Composables make inputs and outputs explicit. Collisions verified.",
    description: `**Question presented to candidate:**
"We have a legacy component that pulls in four mixins, and nobody is sure where \`count\` or \`reset()\` comes from. Why does the Vue team recommend composables over mixins, and how would you refactor this?"

**What a strong answer should cover:**
- Mixins **merge options into the component**, so their data and methods appear on \`this\` with no trace of where they came from.
- **Name collisions are silent**: for \`data\` and \`methods\`, a later mixin overwrites an earlier one and the component overrides both, with no warning.
- **Implicit dependencies**: a mixin can read \`this.something\` that it expects the component (or another mixin) to define.
- The \`data\` merge is **shallow** in Vue 3, and lifecycle hooks from all mixins run (mixins first).
- Composables fix each problem: **explicit imports**, **renaming on destructure**, **dependencies passed as arguments**, and **types that infer**.
- Mixins still work in Vue 3, and global mixins (\`app.mixin\`) are worse because they touch every component, including third-party ones.

**Clarifying questions expected:**
- "Are any of these mixins global, or only local to this component?"
- "Do other components depend on the same mixins? That decides whether to extract shared composables first."

**Code / implementation expected:** Yes — a reproduction of a mixin name collision and the composable rewrite that removes it.`,
    answer: `**Target Audience:** Vue developers maintaining Options API code or moving a codebase to the Composition API.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then \`📌 Interview term:\` callouts. Every behaviour claimed here, including the absence of warnings, was observed by compiling and mounting the two examples on Vue 3.5.44 with the repo verifier.

## 1. Why This Even Matters — A Story First

Picture a shared office whiteboard. Team A writes "count: 3" on it, meaning items in a shopping cart. Team B, on another floor, writes "count: 7", meaning unread notifications. Both teams are allowed to write on the board, and the rule is simply "the last one to write wins". Nobody gets an alert. On Monday the cart shows 7 items.

That is a **mixin**: several bundles of options all writing into the same \`this\`. The merging is automatic and quiet, which is convenient when there is one mixin and a nightmare when there are four.

A **composable** is like each team handing you a labelled envelope instead. You open the cart envelope and file its count under "cartCount", and the notifications envelope under "unread". Nothing is written anywhere you did not choose.

This question is a favourite because it tests whether you understand *why* Vue moved to the Composition API, not just that it did. The interviewer wants the specific failure modes, not "composables are more modern".

## 2. The Core Idea

📌 **Interview term: Mixin** — an object of component options (\`data\`, \`computed\`, \`methods\`, lifecycle hooks and so on) that is merged into any component listing it in \`mixins: [...]\`. It was the main reuse mechanism of Vue 2's Options API.

📌 **Interview term: Option merge strategy** — the rule Vue uses to combine a mixin with the component. For \`data\`, \`methods\`, \`computed\` and similar keyed options, properties are combined and **the component wins, then the later mixin wins**. Lifecycle hooks are **concatenated**, so every version runs, mixins first.

📌 **Interview term: [Composable](/interview-question/what-are-composables-in-vue)** — a \`useX()\` function that creates reactive state and returns it. The calling component decides what to name each returned value.

The composables chapter of the Vue 3 guide names three drawbacks of mixins: an unclear source of properties, namespace collisions, and implicit cross-mixin communication. All three are reproduced below.

## 3. Where Each Property Comes From

<svg class="iq-diagram" width="100%" viewBox="0 0 700 300" role="img" aria-label="Two mixins merge into one this so count collides, while composables return values the component renames">
  <defs>
    <marker id="mx-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="170" y="26" text-anchor="middle">Mixins</text>
  <rect class="d-box" x="30" y="44" width="130" height="56" rx="8"/>
  <text class="d-sub" x="95" y="77" text-anchor="middle">cart: count 3</text>
  <rect class="d-box" x="180" y="44" width="130" height="56" rx="8"/>
  <text class="d-sub" x="245" y="77" text-anchor="middle">notify: count 7</text>
  <path class="d-edge" d="M 95 104 L 150 180" marker-end="url(#mx-arrow)"/>
  <path class="d-edge" d="M 245 104 L 190 180" marker-end="url(#mx-arrow)"/>
  <rect class="d-box-muted" x="70" y="186" width="200" height="70" rx="12"/>
  <text class="d-text" x="170" y="214" text-anchor="middle">this.count = 7</text>
  <text class="d-sub" x="170" y="238" text-anchor="middle">last mixin wins, no warning</text>
  <text class="d-text" x="530" y="26" text-anchor="middle">Composables</text>
  <rect class="d-box" x="390" y="44" width="130" height="56" rx="8"/>
  <text class="d-sub" x="455" y="77" text-anchor="middle">useCart()</text>
  <rect class="d-box" x="540" y="44" width="130" height="56" rx="8"/>
  <text class="d-sub" x="605" y="77" text-anchor="middle">useNotifications()</text>
  <path class="d-edge-accent" d="M 455 104 L 490 180" marker-end="url(#mx-arrow)"/>
  <path class="d-edge-accent" d="M 605 104 L 570 180" marker-end="url(#mx-arrow)"/>
  <rect class="d-box-accent" x="420" y="186" width="220" height="70" rx="12"/>
  <text class="d-text d-accent" x="530" y="214" text-anchor="middle">cartCount = 3</text>
  <text class="d-sub" x="530" y="238" text-anchor="middle">unread = 7</text>
</svg>

On the left, both mixins write \`count\` into the same instance and one value silently disappears. On the right, each composable returns its own \`count\`, and the component renames them at the call site, so both survive.

## 4. Verified: a silent name collision

The first runnable example has two mixins, \`cartMixin\` (count 3) and \`notificationsMixin\` (count 7), each with its own \`reset()\` method and \`mounted()\` hook. Mounted and clicked:

\`\`\`
[cartMixin] mounted, count = 7
[notificationsMixin] mounted, count = 7
[component] mounted, count = 7
[app] RENDERED: mixins: count = 7 (cart or notifications?)resetcomposables: cart = 3, unread = 7clear cartmark all read
[notificationsMixin] reset
after mixin reset : mixins: count = 0 (cart or notifications?) | composables: cart = 3, unread = 7
after clear cart  : mixins: count = 0 (cart or notifications?) | composables: cart = 0, unread = 7
\`\`\`

What this proves:

- **The cart count is gone.** \`cartMixin\`'s own \`mounted()\` sees 7, because the later mixin's \`data\` overwrote it before any hook ran.
- **The wrong method runs.** Clicking "reset" called \`notificationsMixin.reset()\`; \`cartMixin.reset()\` was overwritten.
- **All the hooks still run.** Three \`mounted\` lines appear, in mixin order and then the component, because hooks are concatenated rather than overwritten.
- **No warning.** Vue 3.5.44 printed nothing about either collision in development mode.
- **The composable version keeps both features.** Clearing the cart left \`unread\` at 7.

## 5. Verified: merge rules and hidden dependencies

The second example has one mixin with \`user: { id: 1, name: "mixin" }\`, \`theme: "dark"\`, and a computed \`greeting\` that reads \`this.userName\`, which nothing defines. The component declares \`user: { id: 2 }\`:

\`\`\`
user = {"id":2} | theme = dark | greeting = Hi undefined
[app] RENDERED: 2
\`\`\`

- **The component wins, and the merge is shallow.** The mixin's \`user.name\` did not survive; the component's \`user\` object replaced it entirely. (Vue 2 merged \`data\` deeply; the shallow merge is a listed Vue 3 breaking change, source: the <a href="https://v3-migration.vuejs.org/breaking-changes/data-option" target="_blank" rel="noopener noreferrer">Vue 3 migration guide, data option</a>. Old mixins can therefore behave differently after an upgrade.)
- **Non-conflicting keys pass through.** \`theme\` came from the mixin untouched.
- **Hidden dependencies fail quietly.** \`greeting\` expected the component to provide \`userName\`. Read from \`mounted()\`, it produced "Hi undefined" with no error. A composable would have to receive the user name as an argument, so the dependency would be visible in the call.

## 6. The Five Problems, and How Composables Remove Each

| Problem with mixins | What you saw | Composable equivalent |
| :--- | :--- | :--- |
| **Unclear source** | \`this.count\` could come from either mixin or the component | \`const { count } = useCart()\` — the import says where it came from |
| **Name collisions** | Later mixin silently overwrote \`count\` and \`reset\` | Rename on destructure: \`{ count: cartCount }\` |
| **Implicit dependencies** | \`greeting\` read an undefined \`this.userName\` | Pass inputs explicitly: \`useGreeting(userName)\` |
| **No per-use configuration** | A mixin has one shape for everyone | \`useCart({ currency: "EUR" })\` takes arguments |
| **Weak typing** | \`this\` is a merge of every mixin, hard to infer | Return types infer from plain functions |

📌 **Interview term: Global mixin** — \`app.mixin({...})\` merges options into **every** component in the app, including components from libraries. Its collisions and hidden costs apply everywhere, which is why it is the least recommended reuse tool of all. Prefer a [plugin](/interview-question/what-is-a-vue-plugin) with \`provide\` or [global properties](/interview-question/how-do-you-add-global-properties-or-config) for app-wide concerns.

## 7. Mixins versus Composables at a Glance

| | Mixin | Composable |
| :--- | :--- | :--- |
| Mechanism | Option merge into \`this\` | Function call that returns values |
| Works with | Options API (also alongside \`setup()\`) | Composition API, \`setup()\`, \`<script setup>\` |
| Name control | None, merge rules decide | Caller names every value |
| Collision behaviour | Silent override | Impossible, names are local variables |
| Inputs | Must read \`this.something\` | Function arguments, refs or getters |
| Multiple instances of the same logic | Not possible in one component | Call it twice: \`useCounter()\`, \`useCounter()\` |
| TypeScript | Poor inference of merged \`this\` | Natural inference |
| Status in Vue 3.5 | Supported, not recommended for new code | Recommended |

The "multiple instances" row is easy to forget: one component cannot use the same mixin twice with different settings, but it can call \`usePagination()\` twice for two independent lists.

## 8. Refactoring a Mixin into a Composable

1. **List what the mixin adds to \`this\`**: data keys, computed, methods, hooks, and every \`this.x\` it *reads* but does not define. Those reads are its hidden inputs.
2. **Write \`useX(inputs)\`**: data becomes \`ref\`, computed becomes \`computed()\`, methods become functions, \`mounted\` becomes \`onMounted\`, and each hidden input becomes a parameter accepted with \`toValue()\`.
3. **Return an object of refs and functions.**
4. **In the component**, call it from \`setup()\` and return the values. Options API code in the same component can keep reading them through \`this\`, so the template does not need to change at first; see [Composition versus Options API](/interview-question/what-is-the-composition-api-and-how-does-it-differ-from-the-options-api).
5. **Delete the mixin** once no component lists it, and add a unit test for the composable, which is now an ordinary function.

## 9. Common Pitfalls

- **Expecting Vue to warn about collisions.** It did not, for \`data\` or \`methods\`, in development mode on 3.5.44. Only a code review or a rename catches them.
- **Assuming deep \`data\` merging.** Vue 3 merges \`data\` shallowly. A mixin that relied on Vue 2's deep merge loses nested keys after the upgrade.
- **Converting a mixin one to one but still reading \`this\`.** A composable that expects the caller to have defined something is the same hidden dependency in a new shape. Pass it in.
- **Turning a mixin into a composable with module-level state.** If the ref is declared outside the function it becomes shared by every component, which a per-component mixin never was.
- **Keeping a global mixin "just for one helper".** It runs its hooks in every component, including third-party ones. Use \`app.config.globalProperties\` or \`provide\` instead.
- **Calling the composable after an \`await\` in a plain \`setup()\`.** Hooks inside it then attach to nothing; call composables synchronously at the top.

## 10. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"Mixins merge options silently into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">this</code>; composables are functions whose inputs and outputs are explicit, so they avoid the three classic mixin problems."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Problem one, unclear source:</strong> <span style="color:#f0e2c8;">"With several mixins, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">this.count</code> could come from any of them or from the component, and nothing in the file tells you which."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Problem two, collisions:</strong> <span style="color:#f0e2c8;">"Keyed options like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">data</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">methods</code> merge with the component winning and then the later mixin, and I verified that Vue 3.5 gives no warning when that happens."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Problem three, hidden coupling:</strong> <span style="color:#f0e2c8;">"A mixin can read <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">this.userName</code> that it never defines, so it depends on the host by convention; a composable has to take that as an argument."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The fix:</strong> <span style="color:#f0e2c8;">"With composables I rename on destructure, pass inputs explicitly, can call the same composable twice, and TypeScript infers the result, which is why mixins are kept only for legacy Options API code."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Are mixins removed in Vue 3?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. They still work in 3.5, alongside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setup()</code>. They are just not recommended for new code, and the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">data</code> merge became shallow compared with Vue 2.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What order do mixin lifecycle hooks run in?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">All of them run: mixin hooks first, in the order of the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mixins</code> array, then the component's own hook. In the verified run that printed cart, notifications, then component for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mounted</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is a composable just a mixin with a different syntax?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. A mixin is merged into the instance by Vue's rules; a composable is a function call whose result you assign. That difference is what removes collisions and implicit dependencies.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When might you still keep a mixin?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In a large Options API codebase where the mixin is local, small and collision-free, rewriting may not be worth it today. New shared logic should still be a composable.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">app.mixin</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A global mixin is merged into every component, third-party ones included, so its hooks run everywhere and its keys can collide with anything. Use a plugin with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">provide</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">app.config.globalProperties</code> instead.</span>
</div>

</div>

## 11. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Mixin** | Options object merged into a component through \`mixins: [...]\` |
| **Option merge strategy** | Rules for combining mixin and component options; keyed options override, hooks concatenate |
| **Composable** | A \`useX()\` function returning reactive state and functions |
| **Global mixin** | \`app.mixin()\`, merged into every component in the app |
| **Implicit dependency** | A mixin reading a property it never defines, relying on the host |
| **Shallow merge** | Only top-level \`data\` keys are combined; nested objects are replaced |

---
**Conclusion:** Composables are preferred over mixins because a mixin writes into a shared \`this\` by merge rules nobody sees, while a composable hands back values you name yourself. The verified runs on Vue 3.5.44 show the cost concretely: one mixin's \`count\` and \`reset()\` vanished without a warning, the \`data\` merge dropped a nested key, and a hidden dependency rendered "Hi undefined". The composable version of the same features kept both counts, took its inputs as arguments, and would type-check, which is the whole argument in one example.`,
    examples: [
      {
        label: "Two mixins that both define count and reset, next to the same features as composables",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { ref, h, defineComponent } from "vue";

// ── Two mixins written by two different people. Both happen to use "count" and "reset".
const cartMixin = {
  data() { return { count: 3 }; },              // items in the cart
  methods: { reset() { this.count = 0; console.log("[cartMixin] reset"); } },
  mounted() { console.log("[cartMixin] mounted, count =", this.count); },
};
const notificationsMixin = {
  data() { return { count: 7 }; },              // unread notifications
  methods: { reset() { this.count = 0; console.log("[notificationsMixin] reset"); } },
  mounted() { console.log("[notificationsMixin] mounted, count =", this.count); },
};

const WithMixins = defineComponent({
  mixins: [cartMixin, notificationsMixin],
  mounted() { console.log("[component] mounted, count =", this.count); },
  render() {
    return h("div", [
      h("p", \`mixins: count = \${this.count} (cart or notifications?)\`),
      h("button", { id: "mreset", onClick: this.reset }, "reset"),
    ]);
  },
});

// ── The same two features as composables. Names are chosen at the call site.
function useCart() {
  const count = ref(3);
  return { count, reset: () => (count.value = 0) };
}
function useNotifications() {
  const count = ref(7);
  return { count, reset: () => (count.value = 0) };
}

const { count: cartCount, reset: clearCart } = useCart();
const { count: unread, reset: markAllRead } = useNotifications();
</script>

<template>
  <WithMixins />
  <p>composables: cart = {{ cartCount }}, unread = {{ unread }}</p>
  <button id="cclear" @click="clearCart">clear cart</button>
  <button id="cread" @click="markAllRead">mark all read</button>
</template>
`,
      },
      {
        label: "Mixin merge rules: the component wins, the merge is shallow, and hidden dependencies fail quietly",
        tech: "vue",
        runnable: true,
        code: `<script>
const userMixin = {
  data() { return { user: { id: 1, name: "mixin" }, theme: "dark" }; },
  computed: { greeting() { return "Hi " + this.userName; } }, // depends on something it never declares
};
export default {
  mixins: [userMixin],
  data() { return { user: { id: 2 } }; },   // component wins, and the merge is shallow
  mounted() { console.log("user =", JSON.stringify(this.user), "| theme =", this.theme, "| greeting =", this.greeting); },
};
</script>
<template><p>{{ user.id }}</p></template>
`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are Vue lifecycle hooks?",
    seoDescription:
      "Vue lifecycle hooks run code at set points: setup, mount, update and unmount. Parent and child order, KeepAlive hooks and SSR behaviour, all verified.",
    description: `**Question presented to candidate:**
"Walk me through the lifecycle of a Vue 3 component. When does each hook run, in what order do a parent and its child fire, and where would you put a data fetch, a DOM measurement and a cleanup?"

**What a strong answer should cover:**
- The phases: **setup** (or \`beforeCreate\`/\`created\`), **mount** (\`onBeforeMount\`, \`onMounted\`), **update** (\`onBeforeUpdate\`, \`onUpdated\`) and **unmount** (\`onBeforeUnmount\`, \`onUnmounted\`).
- **Order between parent and child**: parent setup and beforeMount, then the child completes its mount, then the parent's \`onMounted\`; unmount runs the parent's \`onBeforeUnmount\` first and its \`onUnmounted\` last.
- In the Composition API, **\`setup()\` replaces \`beforeCreate\` and \`created\`** and runs before both.
- Hooks must be **registered synchronously during setup**; a late registration logs a warning and never runs.
- **SSR** runs only setup (and \`onServerPrefetch\`); mount, update and unmount hooks never run on the server.
- The extra hooks: \`onActivated\`/\`onDeactivated\` (KeepAlive), \`onErrorCaptured\`, and the dev-only \`onRenderTracked\`/\`onRenderTriggered\`.

**Clarifying questions expected:**
- "Composition API or Options API names? They map one to one, but the vocabulary differs."
- "Does the app use SSR or KeepAlive? Both change which hooks run."

**Code / implementation expected:** Optional — a parent and child that log each hook, to prove the order rather than recite it.`,
    answer: `**Target Audience:** Vue developers who can write a component and want to know exactly when their code runs.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then \`📌 Interview term:\` callouts. Every ordering in this doc was printed by \`console.log\` calls in real components, compiled and mounted in jsdom (or rendered with \`renderToString\`) on Vue 3.5.44. Nothing about order is quoted from memory.

## 1. Why This Even Matters — A Story First

Think about opening a shop for the day. First the manager **plans**: who works where, what is on sale. Then the shelves are **stocked**, and only once every shelf is full does the manager **unlock the front door**. During the day, stock is **restocked** whenever something sells. At closing time the manager **announces closing**, the staff tidy their own sections, and finally the manager **locks up**.

The important detail is the nesting. The manager plans before the shelf staff start, but the front door opens only after *every* shelf is ready. And at closing, the manager announces first, but locks up last, after every section is done.

A Vue component lives the same way, and its children are the shelves. **Lifecycle hooks** are the moments you can step in: "do this once the door is open" (\`onMounted\`), "do this before we lock up" (\`onBeforeUnmount\`). Interviewers ask because knowing *when* code runs is the difference between a working DOM measurement and one that reads \`null\`.

## 2. The Core Idea

📌 **Interview term: Lifecycle hook** — a function you register so Vue calls it at a specific moment in a component's life. In the Composition API they are imported functions such as \`onMounted(fn)\`; in the Options API they are methods such as \`mounted()\`.

📌 **Interview term: Mount** — Vue has created the component's DOM elements and inserted them into the page. Before mount there is no DOM to touch.

📌 **Interview term: Update (re-render)** — reactive state the template reads has changed, so Vue re-runs the render function and patches the DOM. \`onBeforeUpdate\` sees the old DOM, \`onUpdated\` the new one.

📌 **Interview term: Unmount** — the component is being removed: its DOM is taken out and its watchers and effects are stopped. This is where you release anything you started yourself (listeners, timers, sockets).

| Composition API | Options API | When it runs | Typical use |
| :--- | :--- | :--- | :--- |
| \`setup()\` / \`<script setup>\` | \`beforeCreate\`, \`created\` | Once, before anything renders | Create state, start a fetch, call [composables](/interview-question/what-are-composables-in-vue) |
| \`onBeforeMount\` | \`beforeMount\` | Before the first render is inserted | Rarely needed |
| \`onMounted\` | \`mounted\` | After this component and all its children are in the DOM | Measure DOM, focus, start browser-only libraries |
| \`onBeforeUpdate\` | \`beforeUpdate\` | State changed, before the DOM patch | Read the old DOM (scroll position) |
| \`onUpdated\` | \`updated\` | After the DOM patch | Act on the new DOM; never change state here |
| \`onBeforeUnmount\` | \`beforeUnmount\` | Before removal, still fully working | Stop timers, remove listeners |
| \`onUnmounted\` | \`unmounted\` | After removal, children already gone | Final cleanup, logging |
| \`onActivated\` / \`onDeactivated\` | \`activated\` / \`deactivated\` | Shown or hidden inside [KeepAlive](/interview-question/what-is-keep-alive-in-vue) | Pause and resume work |
| \`onErrorCaptured\` | \`errorCaptured\` | A descendant threw | [Error boundaries](/interview-question/how-do-you-handle-errors-in-vue-onerrorcaptured-app-config-errorhandler) |
| \`onServerPrefetch\` | \`serverPrefetch\` | SSR only, before rendering to a string | Await data on the server |
| \`onRenderTracked\` / \`onRenderTriggered\` | same names | Development only | Debug what caused a re-render |

The Vue 2 names \`beforeDestroy\` and \`destroyed\` became \`beforeUnmount\` and \`unmounted\` in Vue 3; see [Vue 2 to Vue 3](/interview-question/what-changed-from-vue-2-to-vue-3-and-what-does-vue-2-end-of-life-mean).

## 3. The Order, Drawn

<svg class="iq-diagram" width="100%" viewBox="0 0 700 330" role="img" aria-label="Mount order: parent setup and beforeMount, then child setup, beforeMount and mounted, then parent mounted">
  <defs>
    <marker id="lc-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="150" y="28" text-anchor="middle">Parent</text>
  <text class="d-text" x="550" y="28" text-anchor="middle">Child</text>
  <rect class="d-box" x="50" y="48" width="200" height="40" rx="8"/>
  <text class="d-sub" x="150" y="73" text-anchor="middle">1. setup</text>
  <rect class="d-box" x="50" y="108" width="200" height="40" rx="8"/>
  <text class="d-sub" x="150" y="133" text-anchor="middle">2. onBeforeMount</text>
  <rect class="d-box" x="450" y="138" width="200" height="40" rx="8"/>
  <text class="d-sub" x="550" y="163" text-anchor="middle">3. setup</text>
  <rect class="d-box" x="450" y="198" width="200" height="40" rx="8"/>
  <text class="d-sub" x="550" y="223" text-anchor="middle">4. onBeforeMount</text>
  <rect class="d-box-accent" x="450" y="258" width="200" height="40" rx="8"/>
  <text class="d-sub d-accent" x="550" y="283" text-anchor="middle">5. onMounted</text>
  <rect class="d-box-accent" x="50" y="258" width="200" height="40" rx="8"/>
  <text class="d-sub d-accent" x="150" y="283" text-anchor="middle">6. onMounted</text>
  <path class="d-edge" d="M 254 130 L 446 156" marker-end="url(#lc-arrow)"/>
  <path class="d-edge-accent" d="M 446 278 L 256 278" marker-end="url(#lc-arrow)"/>
</svg>

The parent starts first and finishes last. Rendering the parent creates the child, the child goes all the way to mounted, and only then is the parent's whole subtree in the DOM, so the parent's \`onMounted\` can safely query its children's elements. Unmount mirrors it: the parent's \`onBeforeUnmount\` runs first and its \`onUnmounted\` runs last.

## 4. Verified: parent and child through a full life

The first runnable example has a parent and an inline child, both logging every hook. The driver clicks \`n++\` (an update that changes a prop the child renders), then toggles the child off with \`v-if\`, then unmounts the app:

\`\`\`
parent setup
parent onBeforeMount
child  setup
child  onBeforeMount
child  onMounted
parent onMounted
[app] RENDERED: n++toggle childchild sees n = 1
--- click n++ ---
parent onBeforeUpdate
child  onBeforeUpdate
child  onUpdated
parent onUpdated
--- click toggle ---
parent onBeforeUpdate
child  onBeforeUnmount
child  onUnmounted
parent onUpdated
--- app.unmount() ---
parent onBeforeUnmount
parent onUnmounted
\`\`\`

And the same app unmounted while the child is still showing:

\`\`\`
--- app.unmount() ---
parent onBeforeUnmount
child  onBeforeUnmount
child  onUnmounted
parent onUnmounted
\`\`\`

Things worth saying out loud in an interview:

- **Updates nest the same way as mounts.** The parent's \`onBeforeUpdate\` runs first and its \`onUpdated\` last. The child updated only because its prop \`n\` changed.
- **Removing a child is a parent update.** The \`v-if\` toggle runs the parent's update hooks around the child's unmount hooks.
- **Siblings mount together.** With two children, a separate run printed \`first setup\`, \`first onBeforeMount\`, \`second setup\`, \`second onBeforeMount\`, then \`first onMounted\`, \`second onMounted\`, then \`parent onMounted\`. All the children are created before any of them reports mounted, because the mounted hooks are flushed together after the parent's patch completes.

## 5. Verified: \`setup()\` versus \`beforeCreate\` and \`created\`, plus KeepAlive

The second runnable example is an Options API component that also has a \`setup()\`, and a \`<KeepAlive>\` that switches between two children:

\`\`\`
root setup()
root beforeCreate
root created, this.which = A
root beforeMount
A setup
A onMounted
A onActivated
root onMounted (from setup)
root mounted (option)
[app] RENDERED: switchA
--- switch to B ---
B setup
A onDeactivated
B onMounted
B onActivated
--- switch to A ---
B onDeactivated
A onActivated
A onDeactivated
\`\`\`

- **\`setup()\` runs before \`beforeCreate\`.** So in the Composition API there is nothing left for \`beforeCreate\` or \`created\` to do; code at the top of \`<script setup>\` *is* that moment. By \`created\`, values returned from \`setup()\` are already on \`this\`.
- **A Composition API hook runs before the Options API hook of the same kind**, as the two root mounted lines show.
- **KeepAlive swaps unmount for deactivate.** Switching back to \`A\` did not run \`A setup\` or \`onMounted\` again; the cached instance was re-activated. The final \`A onDeactivated\` is the cached child being deactivated when the verifier unmounted the app after the driver finished.

## 6. Verified: hooks must be registered during setup

📌 **Interview term: Active instance** — while \`setup()\` runs, Vue keeps a pointer to the component being set up. \`onMounted(fn)\` simply attaches \`fn\` to that instance. Outside setup the pointer is empty.

Calling \`onMounted\` from a \`setTimeout\` inside setup printed this, and the callback never ran:

\`\`\`
[Vue warn]: onMounted is called when there is no active component instance to be associated with. Lifecycle injection APIs can only be used during execution of setup(). If you are using async setup(), make sure to register lifecycle hooks before the first await statement.
\`\`\`

The \`await\` part has a twist that was also checked:

- In a **hand-written \`async setup()\`**, an \`onMounted\` placed after \`await\` printed the same warning.
- In **\`<script setup>\`** with a top-level \`await\`, an \`onMounted\` placed after it **did run**. The compiler wraps each \`await\` in \`withAsyncContext()\`, which restores the active instance afterwards. Both cases need a [Suspense](/interview-question/what-is-suspense-in-vue) boundary to render at all. See [async setup and top-level await](/interview-question/what-is-async-setup-and-top-level-await).

## 7. Verified: what runs during server-side rendering

The first example rendered with \`renderToString\` printed only:

\`\`\`
parent setup
child  setup
[ssr] HTML: <!--[--><button id="inc">n++</button><button id="toggle">toggle child</button><p>child sees n = 1</p><!--]-->
\`\`\`

No mount, update or unmount hook ran, because nothing is mounted on the server. That is exactly why browser-only code (\`window\`, \`document\`, measuring elements, starting a chart library) belongs in \`onMounted\`: it is skipped on the server and runs after [hydration](/interview-question/how-does-server-side-rendering-work-in-vue-rendertostring-hydration) in the browser.

## 8. Where Things Go

| Task | Put it in | Why |
| :--- | :--- | :--- |
| Create state, call composables | \`setup()\` top level | Runs once, on server and client |
| Start a data fetch | \`setup()\` (or \`onServerPrefetch\` for SSR data) | Starts as early as possible; no need to wait for the DOM |
| Read or measure the DOM | \`onMounted\` | The element exists only after mount; use a [template ref](/interview-question/what-is-usetemplateref-vue-3-5-and-how-does-it-improve-on-ref) |
| Add a window or document listener | \`onMounted\` + remove in \`onBeforeUnmount\` | Browser only, and must not leak |
| React to a specific state change | \`watch\`, not \`onUpdated\` | \`onUpdated\` fires for any re-render, not one value |
| Wait for the DOM after a state change | [\`nextTick()\`](/interview-question/what-is-nexttick-in-vue) | Targeted, unlike \`onUpdated\` |
| Pause a video when a cached tab is hidden | \`onDeactivated\` | \`onUnmounted\` never runs for a KeepAlive child |

## 9. Common Pitfalls

- **Touching the DOM in \`setup()\`.** Template refs are \`null\` until mount. Move the code to \`onMounted\`.
- **Changing state in \`onUpdated\`.** It triggers another update, which can loop. Use a \`computed\` or a \`watch\` instead.
- **Expecting \`onUnmounted\` under KeepAlive.** Cached components are deactivated, not unmounted; use \`onDeactivated\`.
- **Registering hooks late.** After a \`setTimeout\`, in a callback, or after \`await\` in a hand-written \`async setup()\`, the hook is dropped with the warning in section 6.
- **Assuming the parent mounts first.** The parent's \`onMounted\` runs after all its children's; a child that needs something from the parent's DOM should not read it in its own \`onMounted\`.
- **Running browser APIs in setup on an SSR app.** The server has no \`window\`; only setup runs there, as verified.

## 10. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"Lifecycle hooks let me run code at set points of a component's life: setup, mount, update and unmount, plus KeepAlive, error and SSR hooks."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The order:</strong> <span style="color:#f0e2c8;">"The parent sets up and runs <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onBeforeMount</code>, the children fully mount, then the parent's <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onMounted</code> runs; unmount mirrors that, with the parent's <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onBeforeUnmount</code> first and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onUnmounted</code> last."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Composition API mapping:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setup()</code> replaces <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">beforeCreate</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">created</code> and actually runs before both; the rest map to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onMounted</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onUpdated</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onUnmounted</code> and so on."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The rule:</strong> <span style="color:#f0e2c8;">"Hooks attach to the active instance, so I register them synchronously during setup; late registration warns and never runs."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Practical placement:</strong> <span style="color:#f0e2c8;">"State and fetches in setup, DOM work and listeners in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onMounted</code> with cleanup in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onBeforeUnmount</code>, and nothing browser-only outside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onMounted</code> because SSR runs only setup."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does the parent or the child run <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">onMounted</code> first?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The child. The parent's render creates the child, the child mounts completely, and the parent's <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onMounted</code> runs last, once its whole subtree is in the DOM. I verified it with logged hooks rather than relying on memory.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where do <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">beforeCreate</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">created</code> go in the Composition API?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Nowhere, because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setup()</code> runs before both. Code at the top level of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;script setup&gt;</code> is that moment.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why might <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">onMounted</code> not run at all?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Either it was registered outside synchronous setup, which logs a warning, or the code is running on the server, where mount hooks never run. Inside KeepAlive it runs once; later visits trigger <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onActivated</code> instead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Should you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">onUpdated</code> to react to a prop change?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onUpdated</code> fires after any re-render of the component, for any reason. A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watch</code> on that prop is targeted, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nextTick</code> covers waiting for the DOM.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about hooks after <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">await</code> in <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&lt;script setup&gt;</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">They work, because the compiler wraps each top-level <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">withAsyncContext()</code> and restores the instance. In a hand-written <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">async setup()</code> they do not, so register hooks before the first <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await</code> there.</span>
</div>

</div>

## 11. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Lifecycle hook** | A callback Vue runs at a specific moment of a component's life |
| **Mount** | DOM created and inserted; \`onMounted\` is the first safe moment for DOM work |
| **Update** | Re-render after reactive state the template reads changes |
| **Unmount** | Component removed; effects stopped; time to release resources |
| **Active instance** | The component currently running \`setup()\`, which hooks attach to |
| **\`onActivated\` / \`onDeactivated\`** | KeepAlive equivalents of mount and unmount for cached components |
| **\`onServerPrefetch\`** | SSR-only hook for awaiting data before rendering to a string |

---
**Conclusion:** Vue lifecycle hooks are callbacks attached to the component being set up, run at fixed points from setup to unmount. The verified logs on Vue 3.5.44 show the rules that matter: the parent starts first and finishes last in every phase, \`setup()\` runs before \`beforeCreate\`, KeepAlive replaces unmount with deactivate, late hook registration is dropped with a warning, and SSR runs nothing beyond setup. Put state in setup, DOM work in \`onMounted\`, cleanup in \`onBeforeUnmount\`, and you can explain not only what each hook does but why the order is what it is.`,
    examples: [
      {
        label: "Parent and child hooks logged through mount, update and unmount",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import {
  ref, h, defineComponent, onBeforeMount, onMounted, onBeforeUpdate,
  onUpdated, onBeforeUnmount, onUnmounted,
} from "vue";

// A child defined inline, so the whole demo is one file.
const Child = defineComponent({
  props: { n: Number },
  setup(props) {
    console.log("child  setup");
    onBeforeMount(() => console.log("child  onBeforeMount"));
    onMounted(() => console.log("child  onMounted"));
    onBeforeUpdate(() => console.log("child  onBeforeUpdate"));
    onUpdated(() => console.log("child  onUpdated"));
    onBeforeUnmount(() => console.log("child  onBeforeUnmount"));
    onUnmounted(() => console.log("child  onUnmounted"));
    return () => h("p", \`child sees n = \${props.n}\`);
  },
});

const n = ref(1);
const show = ref(true);
console.log("parent setup");
onBeforeMount(() => console.log("parent onBeforeMount"));
onMounted(() => console.log("parent onMounted"));
onBeforeUpdate(() => console.log("parent onBeforeUpdate"));
onUpdated(() => console.log("parent onUpdated"));
onBeforeUnmount(() => console.log("parent onBeforeUnmount"));
onUnmounted(() => console.log("parent onUnmounted"));
</script>

<template>
  <button id="inc" @click="n++">n++</button>
  <button id="toggle" @click="show = !show">toggle child</button>
  <Child v-if="show" :n="n" />
</template>
`,
      },
      {
        label: "setup() versus beforeCreate/created, and onActivated/onDeactivated under KeepAlive",
        tech: "vue",
        runnable: true,
        code: `<script>
import { h, defineComponent, onMounted, KeepAlive, onActivated, onDeactivated, ref } from "vue";
const Kid = (name) => defineComponent({
  name,
  setup() {
    console.log(name, "setup");
    onMounted(() => console.log(name, "onMounted"));
    onActivated(() => console.log(name, "onActivated"));
    onDeactivated(() => console.log(name, "onDeactivated"));
    return () => h("span", name);
  },
});
const A = Kid("A"), B = Kid("B");
export default {
  components: { KeepAlive },
  setup() {
    console.log("root setup()");
    onMounted(() => console.log("root onMounted (from setup)"));
    const which = ref("A");
    return { which, A, B };
  },
  beforeCreate() { console.log("root beforeCreate"); },
  created() { console.log("root created, this.which =", this.which); },
  beforeMount() { console.log("root beforeMount"); },
  mounted() { console.log("root mounted (option)"); },
};
</script>
<template>
  <button id="sw" @click="which = which === 'A' ? 'B' : 'A'">switch</button>
  <KeepAlive><component :is="which === 'A' ? A : B" /></KeepAlive>
</template>
`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What do defineOptions() and defineSlots() do in <script setup>?",
    seoDescription:
      "defineOptions() sets name and inheritAttrs inside script setup; defineSlots() types slots and their props. Compiler output and errors verified.",
    description: `**Question presented to candidate:**
"In a \`<script setup>\` component I need to set \`inheritAttrs: false\`, give the component a name, and document which slots it accepts and what each slot receives. How do \`defineOptions()\` and \`defineSlots()\` help, and what are their limits?"

**What a strong answer should cover:**
- Both are **compiler macros** (Vue 3.3+): no import, compiled away, usable only in \`<script setup>\`.
- \`defineOptions({...})\` declares component options that have no macro of their own, mainly **\`name\`** and **\`inheritAttrs\`**; it is hoisted out of \`setup()\`.
- It **rejects** \`props\`, \`emits\`, \`expose\` and \`slots\` (use the dedicated macros), rejects type arguments, and cannot reference local variables other than literal constants.
- \`defineSlots<{...}>()\` is **type-only**: it describes each slot and its props for the IDE and \`vue-tsc\`, and returns the same object as \`useSlots()\`.
- \`defineSlots\` checks both sides: the props the component passes to \`<slot>\` and the destructured slot props in the parent.
- Before 3.3 the same needed a second plain \`<script>\` block for options, or no slot typing at all.

**Clarifying questions expected:**
- "Which Vue version is the project on? Both macros need 3.3 or later."
- "Is the goal type safety in the editor, or runtime behaviour? \`defineSlots\` only affects types."

**Code / implementation expected:** Optional — a component using both macros, ideally with a slot prop type error shown by \`vue-tsc\`.`,
    answer: `**Target Audience:** Vue developers using \`<script setup>\` who want the remaining component options and typed slots.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then \`📌 Interview term:\` callouts. The compiler output and every error message below come from running \`@vue/compiler-sfc\` 3.5.44; the runnable example was mounted in jsdom; the type errors come from \`vue-tsc\` 3.3.13. The version claims were checked against the published \`@vue/runtime-core\` type definitions of 3.2.47 and 3.3.0.

## 1. Why This Even Matters — A Story First

Imagine a form at a government office that has a box for every common thing: your name, your address, your signature. Then one day you need to add "please do not forward my mail" and there is no box for it. The old workaround was to staple a second sheet to the form.

\`<script setup>\` is that form. It has a dedicated box for props (\`defineProps\`), for events (\`defineEmits\`), for the public API (\`defineExpose\`) and for \`v-model\` (\`defineModel\`). But a few settings had no box: the component's **name** and whether it **inherits attributes**. Until Vue 3.3, the workaround was a second, ordinary \`<script>\` block stapled to the file.

\`defineOptions()\` is the "anything else" box on the form. \`defineSlots()\` is a different kind of improvement: it adds a box describing which **slots** the component accepts and what each slot is handed, so the editor can check the person filling them in.

## 2. The Core Idea

📌 **Interview term: Compiler macro** — a function-looking call that only the SFC compiler understands. You do not import it; the compiler reads it and replaces it with real code. \`defineProps\`, \`defineEmits\`, \`defineExpose\`, \`defineModel\`, \`defineOptions\` and \`defineSlots\` are all macros, so they only work at the top level of \`<script setup>\`. See [defineProps and defineEmits](/interview-question/how-do-defineprops-and-defineemits-work-in-script-setup).

📌 **Interview term: \`defineOptions()\`** — declares ordinary component options from inside \`<script setup>\`. In practice it is used for \`name\` and \`inheritAttrs\`, occasionally for things like a custom option a plugin reads.

📌 **Interview term: \`defineSlots()\`** — a **type-only** declaration of the component's [slots](/interview-question/what-are-slots-in-vue): their names, whether they are optional, and the props each slot receives. It takes no runtime arguments and returns the same \`slots\` object \`useSlots()\` would.

📌 **Interview term: \`inheritAttrs\`** — by default, attributes a parent passes that are not declared props (such as \`class\`, \`id\`, \`data-*\` or listeners) land on the component's root element. Setting \`inheritAttrs: false\` turns that off, so you can bind them where you want with \`v-bind="attrs"\`. See [fallthrough attributes](/interview-question/what-are-fallthrough-attributes-attrs).

Both macros arrived in **Vue 3.3** (May 2023): the \`@vue/runtime-core\` 3.2.47 type definitions have neither, and 3.3.0 declares both. The 3.3 announcement covers them alongside generic components (source: <a href="https://blog.vuejs.org/posts/vue-3-3" target="_blank" rel="noopener noreferrer">Vue 3.3 announcement</a>).

## 3. Where Each Macro Ends Up

<svg class="iq-diagram" width="100%" viewBox="0 0 700 290" role="img" aria-label="defineOptions is spread into the component object outside setup, defineSlots becomes a useSlots call inside setup">
  <defs>
    <marker id="dos-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="160" y="28" text-anchor="middle">script setup source</text>
  <rect class="d-box-accent" x="40" y="48" width="240" height="56" rx="10"/>
  <text class="d-sub d-accent" x="160" y="81" text-anchor="middle">defineOptions({ name })</text>
  <rect class="d-box" x="40" y="160" width="240" height="56" rx="10"/>
  <text class="d-sub" x="160" y="193" text-anchor="middle">defineSlots of type</text>
  <text class="d-text" x="530" y="28" text-anchor="middle">compiled component</text>
  <rect class="d-box-muted" x="380" y="48" width="300" height="200" rx="12"/>
  <rect class="d-box-accent" x="410" y="72" width="240" height="44" rx="8"/>
  <text class="d-sub d-accent" x="530" y="99" text-anchor="middle">spread into the options object</text>
  <rect class="d-box" x="410" y="168" width="240" height="56" rx="8"/>
  <text class="d-sub" x="530" y="192" text-anchor="middle">inside setup:</text>
  <text class="d-sub" x="530" y="212" text-anchor="middle">slots = useSlots()</text>
  <path class="d-edge-accent" d="M 284 76 L 406 92" marker-end="url(#dos-arrow)"/>
  <path class="d-edge" d="M 284 188 L 406 194" marker-end="url(#dos-arrow)"/>
</svg>

\`defineOptions\` is lifted out of \`setup()\` and merged into the component definition, which is why it cannot see variables that only exist inside setup. \`defineSlots\` leaves its type for the type checker and turns into a plain \`useSlots()\` call at runtime.

## 4. Verified: what the compiler produces

Compiling \`defineOptions({ name: "TreeNode", inheritAttrs: false })\` plus \`const slots = defineSlots<{...}>()\` with \`@vue/compiler-sfc\` 3.5.44 gives (relevant lines):

\`\`\`js
import { useSlots as _useSlots, defineComponent as _defineComponent } from 'vue'
export default /*@__PURE__*/_defineComponent({
  ...{ name: "TreeNode", inheritAttrs: false },
  __name: 'X',
  setup(__props, { expose: __expose }) {
const slots = _useSlots()
\`\`\`

Two facts fall out of that:

- The options object is **spread into the component definition**, next to the compiler-generated \`__name\` (taken from the file name). An explicit \`name\` from \`defineOptions\` is what devtools, warnings, \`<KeepAlive include>\` and self-reference use.
- \`defineSlots\` has **no runtime cost**: the type is erased and the call becomes \`useSlots()\`.

## 5. Verified: what \`defineOptions\` refuses

Each of these was compiled; the compiler threw exactly this message:

| You wrote | Compiler error |
| :--- | :--- |
| \`defineOptions({ props: { a: String } })\` | \`defineOptions() cannot be used to declare props. Use defineProps() instead.\` |
| \`defineOptions({ emits: ["x"] })\` | \`defineOptions() cannot be used to declare emits. Use defineEmits() instead.\` |
| \`defineOptions({ expose: ["x"] })\` | \`defineOptions() cannot be used to declare expose. Use defineExpose() instead.\` |
| \`defineOptions({ slots: Object })\` | \`defineOptions() cannot be used to declare slots. Use defineSlots() instead.\` |
| \`defineOptions<{ name: string }>({...})\` | \`defineOptions() cannot accept type arguments\` |
| Two \`defineOptions()\` calls | \`duplicate defineOptions() call\` |
| \`const n = String(Date.now()); defineOptions({ name: n })\` | \`\` \`defineOptions()\` in <script setup> cannot reference locally declared variables because it will be hoisted outside of the setup() function. ... \`\` |
| \`defineSlots({ label: Function })\` | \`defineSlots() cannot accept arguments\` |

One nuance that surprised me: \`const n = "A"; defineOptions({ name: n })\` **compiled fine**. A \`const\` initialised with a literal is hoisted to module scope by the compiler, so it is still visible after \`defineOptions\` is lifted out of setup. Anything computed, including a ref, is rejected.

## 6. Verified: a recursive component named by \`defineOptions\`

The runnable example is a file tree that renders itself. \`defineOptions({ name: "TreeNode", inheritAttrs: false })\` lets the template use \`<TreeNode>\` for its own children, and passes each child a \`data-kind="child"\` attribute that the component binds onto an inner \`<span>\` instead of the root \`<li>\`:

\`\`\`
has a label slot? false
[app] RENDERED: srccomponentsTreeNode.vuemain.ts
first data-kind=child element: SPAN | on any <li>? false
rows: 4
\`\`\`

- **Self-reference by name works**: four rows rendered from a three-level tree.
- **\`inheritAttrs: false\` took effect**: the attribute is on the \`<span>\`, and no \`<li>\` received it.
- **\`defineSlots\` returns the slots object**: the root reported that no \`label\` slot was passed, so the fallback \`{{ node.label }}\` rendered.

In a real project the file would be \`TreeNode.vue\` and could already refer to itself by file name; \`defineOptions({ name })\` makes the name explicit and independent of the file, which matters when files are renamed or the name is used by \`<KeepAlive include="TreeNode">\`.

## 7. Verified: \`defineSlots\` checks both sides with \`vue-tsc\`

The second example declares:

\`\`\`ts
defineSlots<{
  default?(props: { file: FileEntry; index: number }): any;
  empty?(): any;
}>();
\`\`\`

\`vue-tsc --noEmit\` on the project reported two real errors:

\`\`\`
q5/BadSlot.vue(4,18): error TS2322: Type 'string' is not assignable to type 'number'.
q5/Parent.vue(8,45): error TS2551: Property 'sizeKb' does not exist on type 'FileEntry'. Did you mean 'size'?
\`\`\`

- **Inside the component**, a \`<slot :count="'three'" />\` that does not match the declared \`count: number\` is an error.
- **In the parent**, the destructured slot prop \`file\` is typed as \`FileEntry\`, so a typo is caught.
- **Not caught:** the parent also passed a \`#footer\` slot that the component never declares. \`vue-tsc\` reported nothing for it, even with \`strictTemplates: true\`. \`defineSlots\` types the slots that exist; it does not forbid extra ones.

## 8. Before and After 3.3

| Need | Before Vue 3.3 | With the macros |
| :--- | :--- | :--- |
| Set \`name\` or \`inheritAttrs\` | A second \`<script>\` with \`export default { inheritAttrs: false }\` | \`defineOptions({ inheritAttrs: false })\` |
| Type slot props | Not possible in \`<script setup>\`; IDE guessed from usage | \`defineSlots<{ row(props: { item: T }): any }>()\` |
| Read slots at runtime | \`useSlots()\` | \`defineSlots()\` returns the same object |
| Type a slot whose props depend on a type parameter | Not possible | \`defineSlots\` together with [generic components](/interview-question/how-do-generic-script-setup-components-work-generic-t) |

## 9. Common Pitfalls

- **Putting props or emits in \`defineOptions\`.** The compiler rejects it; use \`defineProps\` / \`defineEmits\` so types and runtime declarations are generated.
- **Referencing setup variables in \`defineOptions\`.** It runs outside setup. Only literals and module-level imports are allowed.
- **Expecting \`defineSlots\` to validate at runtime.** It is type-only. A wrong slot in plain JavaScript or an unchecked build produces no warning.
- **Expecting unknown slots to be errors.** As verified, passing an undeclared slot is not reported by \`vue-tsc\`.
- **Turning off \`inheritAttrs\` and forgetting to bind.** With \`inheritAttrs: false\`, \`class\` and listeners vanish unless you bind \`useAttrs()\` or \`$attrs\` somewhere; see [useAttrs versus $attrs](/interview-question/useattrs-vs-attrs-how-do-you-handle-fallthrough-attributes-in-composition-api).
- **Using either macro on Vue 3.2.** The 3.2.47 compiler does not know them: compiled with it, both calls were left untouched inside \`setup()\`, where they are undefined functions at runtime. Check the project is on 3.3 or later.

## 10. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"Both are <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;script setup&gt;</code> compiler macros from Vue 3.3: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineOptions</code> sets component options that have no macro of their own, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineSlots</code> declares typed slots."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. defineOptions:</strong> <span style="color:#f0e2c8;">"I use it for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">name</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inheritAttrs: false</code>; the compiler spreads the object into the component definition outside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setup()</code>, which replaces the old second <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;script&gt;</code> block."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Its limits:</strong> <span style="color:#f0e2c8;">"It refuses props, emits, expose and slots with a message pointing at the right macro, and it cannot reference local variables other than literal constants because it is hoisted."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. defineSlots:</strong> <span style="color:#f0e2c8;">"It is type-only: each slot is a function signature whose argument is the slot props, and at runtime it is just <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useSlots()</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Why it matters:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vue-tsc</code> then checks both sides, the props I pass to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;slot&gt;</code> and the destructured slot props in the parent, which is especially useful with generic components."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just use a second plain <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&lt;script&gt;</code> block for <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">inheritAttrs</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">That still works and is what we did before 3.3. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineOptions</code> keeps everything in one block and gets a clear compiler error if you try to put props or emits there.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">defineSlots</code> throw if a parent passes the wrong slot?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It has no runtime behaviour beyond returning <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useSlots()</code>. Errors appear only in the editor or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vue-tsc</code>, and an undeclared extra slot is not reported at all.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">__name</code> in the compiled output?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The compiler infers a name from the file name and stores it as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__name</code>. An explicit <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">name</code> from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineOptions</code> takes priority for devtools, warnings, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">KeepAlive include</code> and recursive self-reference.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">defineOptions</code> use an imported constant?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, imports are module scope. A local <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const</code> with a literal value also works because the compiler hoists it, but anything computed in setup is rejected.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you type a slot whose props depend on the component data type?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Combine <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineSlots</code> with a generic component: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">generic="T"</code> on the script tag, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineSlots&lt;{ row(props: { item: T }): any }&gt;()</code>, and the parent sees the concrete type.</span>
</div>

</div>

## 11. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Compiler macro** | A call the SFC compiler replaces; no import, top level of \`<script setup>\` only |
| **\`defineOptions()\`** | Declares options such as \`name\` and \`inheritAttrs\` from \`<script setup>\` (3.3+) |
| **\`defineSlots()\`** | Type-only slot declaration; returns \`useSlots()\` at runtime (3.3+) |
| **\`inheritAttrs\`** | Whether undeclared attributes fall through to the root element |
| **\`__name\`** | Component name the compiler infers from the file name |
| **Slot props** | The values a component hands to a slot, received by the parent's template |

---
**Conclusion:** \`defineOptions()\` and \`defineSlots()\` fill the last two gaps in \`<script setup>\`. The first is spread into the component definition, so it handles \`name\` and \`inheritAttrs\` but refuses anything with its own macro or anything that lives inside setup, with the precise compiler messages shown above. The second is purely a type declaration that becomes \`useSlots()\` at runtime, yet lets \`vue-tsc\` check slot props on both sides, as the real \`Did you mean 'size'?\` error shows. Together they remove the need for a second script block and make slots part of a component's typed contract.`,
    examples: [
      {
        label: "defineOptions names a recursive tree and turns off attribute fallthrough; defineSlots types the label slot",
        tech: "vue",
        runnable: true,
        code: `<script setup lang="ts">
import { useAttrs } from "vue";

type Node = { label: string; children?: Node[] };

// defineOptions: component options that have no macro of their own.
defineOptions({
  name: "TreeNode",     // lets the template refer to itself as <TreeNode>
  inheritAttrs: false,  // attrs go where we bind them, not on the root element
});

// defineSlots: type-only declaration of the slots and the props each slot receives.
const slots = defineSlots<{
  label?(props: { node: Node; depth: number }): any;
}>();

const props = withDefaults(defineProps<{ node?: Node; depth?: number }>(), {
  node: () => ({
    label: "src",
    children: [
      { label: "components", children: [{ label: "TreeNode.vue" }] },
      { label: "main.ts" },
    ],
  }),
  depth: 0,
});

const attrs = useAttrs();
if (props.depth === 0) console.log("has a label slot?", !!slots.label);
</script>

<template>
  <li class="row">
    <span v-bind="attrs" :style="{ paddingLeft: depth * 16 + 'px' }">
      <slot name="label" :node="node" :depth="depth">{{ node.label }}</slot>
    </span>
    <ul v-if="node.children">
      <TreeNode
        v-for="child in node.children"
        :key="child.label"
        :node="child"
        :depth="depth + 1"
        data-kind="child"
      />
    </ul>
  </li>
</template>
`,
      },
      {
        label: "defineSlots catches a wrong slot prop in the parent at type-check time (vue-tsc)",
        tech: "vue",
        runnable: false,
        code: `<!-- FileList.vue: declares its slots and their props with defineSlots -->
<script setup lang="ts">
export type FileEntry = { name: string; size: number };
defineProps<{ files: FileEntry[] }>();
defineSlots<{
  default?(props: { file: FileEntry; index: number }): any;
  empty?(): any;
}>();
</script>
<template>
  <ul v-if="files.length">
    <li v-for="(file, index) in files" :key="file.name"><slot :file="file" :index="index">{{ file.name }}</slot></li>
  </ul>
  <slot v-else name="empty" />
</template>

<!-- Parent.vue: vue-tsc reports error TS2551 on file.sizeKb (Did you mean 'size'?) -->
<script setup lang="ts">
import FileList from "./FileList.vue";
const files = [{ name: "a.ts", size: 120 }];
</script>
<template>
  <FileList :files="files">
    <template #default="{ file, index }">
      {{ index }}: {{ file.name }} ({{ file.sizeKb }} KB)
    </template>
    <template #footer>never declared</template>
  </FileList>
</template>
`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do generic <script setup> components work (generic=\"T\")?",
    seoDescription:
      "generic=\"T\" gives a script setup component one inferred type for props, emits, slots and v-model. Real vue-tsc errors and compiled output shown.",
    description: `**Question presented to candidate:**
"We have a \`DataTable\` component used for users, orders and products. Today its \`rows\` prop is \`any[]\`, so the row slot and the \`select\` event lose all typing. How would you make it generic in \`<script setup>\`, and what does that actually change at runtime?"

**What a strong answer should cover:**
- \`<script setup lang="ts" generic="T">\` declares a **type parameter** for the whole component, with constraints and multiple parameters allowed (\`generic="T extends { id: string }, K extends keyof T"\`).
- \`T\` can be used in \`defineProps\`, \`defineEmits\`, \`defineModel\`, \`defineSlots\` and local code, and is **inferred from the props the parent passes**.
- The parent then gets **typed slot props, event payloads and \`v-model\`** with no annotations.
- It is **type-only**: the compiled component has runtime props such as \`{ type: Array }\` and no knowledge of \`T\`, so checking happens in the IDE and \`vue-tsc\`, not in the browser.
- Constraint violations and wrong usage surface as **real \`vue-tsc\` errors**; plain \`tsc\` and \`vite build\` do not check templates.
- Introduced in **Vue 3.3**; the non-SFC equivalent is a generic \`defineComponent\` setup function.

**Clarifying questions expected:**
- "Do rows always share a key field? That becomes the generic constraint."
- "Is \`vue-tsc\` part of CI? Without it the generic only helps in the editor."

**Code / implementation expected:** Yes — a generic list with a typed slot and event, and a parent that triggers at least one type error.`,
    answer: `**Target Audience:** Vue and TypeScript developers who build reusable components such as lists, tables and selects.
**Difficulty:** Hard

> **How to read this doc:** Plain language first, then \`📌 Interview term:\` callouts. All type errors below are real output from \`vue-tsc\` 3.3.13 (TypeScript 5.9, \`strict: true\`) run on the example files; the compiled output comes from \`@vue/compiler-sfc\` 3.5.44; the runnable example was mounted in jsdom on Vue 3.5.44.

## 1. Why This Even Matters — A Story First

Think of a label maker with a "contents" field. A plain label maker prints "contents: stuff" on every box, so when you open a box you still have to check what is inside. A smart one asks once, "what goes in this box?", and every label on that box (the inventory sheet, the barcode, the "fragile" sticker) is printed for exactly that content.

A component like a list or table is a box. Without generics, its \`items\` prop is \`any[]\` or \`unknown[]\`, and everything that comes out of it (the row slot, the \`select\` event, the \`v-model\` value) is "stuff". With \`generic="T"\`, the component asks once: "what are the items?". The parent answers simply by passing \`users\`, and every slot prop, event payload and model value is now typed as a \`User\`.

Interviewers ask this because it separates people who have *used* TypeScript with Vue from people who have built reusable typed components with it.

## 2. The Core Idea

📌 **Interview term: Type parameter (generic)** — a placeholder type, conventionally \`T\`, that is filled in when the code is used. A TypeScript function \`first<T>(xs: T[]): T\` returns a \`User\` when given \`User[]\`. See [generic constraints](/interview-question/what-are-generic-constraints).

📌 **Interview term: Generic component** — a \`<script setup lang="ts">\` block with a \`generic\` attribute, for example \`generic="T extends { id: string | number }"\`. The attribute's value is written exactly like the part between \`<\` and \`>\` in a TypeScript generic declaration, so constraints, defaults and multiple parameters are allowed.

📌 **Interview term: Type inference at the call site** — the parent never writes \`<GenericList<User>>\`. TypeScript works out \`T\` from the props passed, usually the array prop, and propagates it to slots, events and \`v-model\`.

Generic components arrived in **Vue 3.3** (May 2023) together with \`defineSlots\` (source: <a href="https://blog.vuejs.org/posts/vue-3-3" target="_blank" rel="noopener noreferrer">Vue 3.3 announcement</a>). The checking itself is done by Vue's language tools, which power the editor extension and \`vue-tsc\`.

## 3. How \`T\` Flows Through a Component

<svg class="iq-diagram" width="100%" viewBox="0 0 700 320" role="img" aria-label="The items prop fixes T as User, and T then types the row slot, the pick event and v-model">
  <defs>
    <marker id="gen-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="40" width="220" height="60" rx="10"/>
  <text class="d-text" x="150" y="66" text-anchor="middle">parent passes</text>
  <text class="d-sub" x="150" y="88" text-anchor="middle">:items of type User[]</text>
  <path class="d-edge-accent" d="M 264 70 L 386 70" marker-end="url(#gen-arrow)"/>
  <rect class="d-box-accent" x="392" y="40" width="268" height="60" rx="10"/>
  <text class="d-text d-accent" x="526" y="66" text-anchor="middle">T is inferred as User</text>
  <text class="d-sub" x="526" y="88" text-anchor="middle">checked against the constraint</text>
  <path class="d-edge" d="M 450 104 L 150 186" marker-end="url(#gen-arrow)"/>
  <path class="d-edge" d="M 526 104 L 360 186" marker-end="url(#gen-arrow)"/>
  <path class="d-edge" d="M 600 104 L 570 186" marker-end="url(#gen-arrow)"/>
  <rect class="d-box" x="50" y="192" width="200" height="70" rx="10"/>
  <text class="d-text" x="150" y="220" text-anchor="middle">row slot</text>
  <text class="d-sub" x="150" y="244" text-anchor="middle">item: User</text>
  <rect class="d-box" x="260" y="192" width="200" height="70" rx="10"/>
  <text class="d-text" x="360" y="220" text-anchor="middle">pick event</text>
  <text class="d-sub" x="360" y="244" text-anchor="middle">payload: User</text>
  <rect class="d-box" x="470" y="192" width="200" height="70" rx="10"/>
  <text class="d-text" x="570" y="220" text-anchor="middle">v-model</text>
  <text class="d-sub" x="570" y="244" text-anchor="middle">number, the id type</text>
</svg>

One prop pins down \`T\`, and every other part of the component contract that mentions \`T\` follows. In the example, \`defineModel<T["id"] | null>()\` makes the model type depend on the item type too, so a \`User\` list (numeric ids) requires a \`number\` model.

## 4. The Component

The static example at the bottom contains this component (trimmed):

\`\`\`vue
<script setup lang="ts" generic="T extends { id: string | number }">
const props = defineProps<{ items: T[]; label: (item: T) => string }>();
const selected = defineModel<T["id"] | null>({ default: null });
const emit = defineEmits<{ pick: [item: T] }>();
defineSlots<{ row?(props: { item: T; active: boolean }): any }>();
</script>
\`\`\`

- **The constraint** \`T extends { id: string | number }\` lets the component use \`item.id\` as a \`:key\` and as the model value, while knowing nothing else about \`T\`.
- **\`defineSlots\`** declares that the \`row\` slot receives \`item: T\`; see [defineOptions and defineSlots](/interview-question/what-do-defineoptions-and-defineslots-do-in-script-setup).
- **\`defineModel\`** ties the [\`v-model\`](/interview-question/what-is-definemodel-in-vue-3-4-and-how-does-it-replace-manual-prop-emit) type to \`T["id"]\`.

## 5. Verified: the errors \`vue-tsc\` reports

The parent \`Users.vue\` uses the component once correctly and three times wrongly. \`vue-tsc --noEmit\` printed:

\`\`\`
q6/Users.vue(23,39): error TS2339: Property 'phone' does not exist on type 'User'.
q6/Users.vue(27,54): error TS2322: Type 'string' is not assignable to type 'number'.
q6/Users.vue(30,27): error TS2353: Object literal may only specify known properties, and 'name' does not exist in type '{ id: string | number; }'.
q6/Users.vue(30,62): error TS2339: Property 'name' does not exist on type '{ id: string | number; }'.
\`\`\`

| Line | Mistake | Why it is caught |
| :--- | :--- | :--- |
| 23 | \`{{ item.phone }}\` inside \`#row\` | \`T\` was inferred as \`User\`, so the slot prop is a \`User\` |
| 27 | \`v-model\` bound to a \`Ref<string>\` | The model type is \`T["id"]\`, which is \`number\` for \`User\` |
| 30 | \`:items="[{ name: 'no id' }]"\` | The objects do not satisfy the constraint, so \`T\` falls back to the constraint type and both the literal and the \`label\` callback fail |

The correct usage on line 17, with \`@pick="onPick"\` where \`onPick(u: User)\`, \`:label="(u) => u.name"\` and \`{{ item.email }}\` in the slot, produced **no errors and needed no annotations**: the arrow function parameter \`u\` and the slot prop \`item\` were both inferred as \`User\`.

## 6. Verified: what the browser actually gets

The same component compiled with \`@vue/compiler-sfc\` 3.5.44 (relevant lines):

\`\`\`js
export default /*@__PURE__*/_defineComponent({
  __name: 'GenericList',
  props: /*@__PURE__*/_mergeModels({
    items: { type: Array, required: true },
    label: { type: Function, required: true }
  }, {
    "modelValue": { type: null, ...{ default: null } },
    "modelModifiers": {},
  }),
  emits: /*@__PURE__*/_mergeModels(["pick"], ["update:modelValue"]),
\`\`\`

📌 **Interview term: Type erasure** — TypeScript types vanish when code is compiled to JavaScript. For a generic component, the runtime only knows that \`items\` is *some* array and \`label\` is *some* function; the model has \`type: null\`, meaning "any value". Nothing about \`User\` survives.

So a generic component gives **compile-time** guarantees only. A wrong shape coming from an untyped API response or plain JavaScript reaches the component unchecked. Validate data at the boundary if that matters.

The compiler did not need to understand the \`generic\` attribute at all: searching \`@vue/compiler-sfc\` 3.5.44 for it finds nothing, and the type annotations that mention \`T\` are simply stripped by the TypeScript transform. The attribute exists for the language tools.

## 7. Verified: the non-SFC equivalent

Since Vue 3.3, \`defineComponent\` also accepts a **generic setup function**, which is what the runnable example uses so it fits in one file:

\`\`\`ts
const PickList = defineComponent(
  <T extends { id: string | number }>(
    props: { items: T[]; label: (item: T) => string },
    { emit, slots }: { emit: (e: "pick", item: T) => void; slots: { row?: (p: { item: T }) => VNodeChild } },
  ) => () => /* render with h() */,
  { props: ["items", "label"], emits: ["pick"] },
);
\`\`\`

Notice the second argument: because types are erased, the **runtime** prop and emit names must still be listed by hand. In an SFC the compiler generates them from \`defineProps\` and \`defineEmits\`.

Mounted with a \`Book[]\` list and a \`City[]\` list and clicked:

\`\`\`
[app] RENDERED: DuneNeuromancerLagos (15,400,000)picked: nothing yet
click Neuromancer -> picked: book Neuromancer (1984)
click Lagos       -> picked: city Lagos, pop 15400000
\`\`\`

The file also passes \`vue-tsc\` with no errors, with \`item\` in the \`#row\` slot inferred as \`City\` and the \`label\` callbacks inferred per list.

## 8. Patterns Worth Knowing

| Pattern | \`generic\` value | Use |
| :--- | :--- | :--- |
| Unconstrained | \`T\` | A wrapper that never reads fields of \`T\` |
| Required key | \`T extends { id: string \\| number }\` | Lists and tables keyed by \`id\` |
| Key of the item | \`T, K extends keyof T\` | A table where a \`sortBy: K\` prop must be a real column |
| Imported constraint | \`T extends Row\` with \`import type { Row } from "./types"\` in the same block | Shared domain types |
| Multiple values | \`T, U\` | A mapper from \`T\` items to \`U\` options |

The \`generic\` attribute can reference types imported in the same \`<script setup>\` block. That and the \`keyof\` pattern were checked together with a \`SortTable.vue\` declared as \`generic="T extends Row, K extends keyof T"\` (with \`Row\` imported from \`./types\`) and \`defineProps<{ rows: T[]; sortBy: K }>()\`. Inside it, the code also read \`first?.name\`. \`vue-tsc\` printed:

\`\`\`
q6b/SortTable.vue(5,20): error TS2339: Property 'name' does not exist on type 'T'.
q6b/UseTable.vue(7,27): error TS2820: Type '"totl"' is not assignable to type '"total" | "id"'. Did you mean '"total"'?
\`\`\`

The first error shows that, inside the component, \`T\` is only known to satisfy its constraint. The second shows \`K\` being narrowed to the real keys of the rows the parent passed, \`{ id: 1, total: 9.5 }\`, so a typo in \`sort-by\` is caught with a suggestion.

## 9. Common Pitfalls

- **Expecting runtime checks.** The compiled props are \`type: Array\` and \`type: null\`. Generics never warn in the browser.
- **Relying on \`vite build\`.** It strips types with esbuild and does not type-check templates. Run \`vue-tsc --noEmit\` in CI; see [TypeScript with Vue](/interview-question/how-do-you-use-typescript-with-vue-typed-props-emits-refs-vue-tsc).
- **Forgetting the constraint.** With bare \`T\`, the component cannot touch \`item.id\`, and the parent gets no hint that items need one. Constrain to exactly what the component uses.
- **Annotating the parent by hand.** \`:label="(u: User) => ..."\` is unnecessary; let inference work, and add explicit types only where inference fails.
- **Expecting an undeclared slot or prop to be rejected.** Unknown slots are not reported, as the [defineSlots page](/interview-question/what-do-defineoptions-and-defineslots-do-in-script-setup) shows.
- **Using \`any[]\` "to make the error go away".** It turns off inference for the slot, event and model all at once, which is the problem generics exist to solve.

## 10. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">generic="T"</code> on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;script setup lang="ts"&gt;</code> gives the whole component a type parameter, so props, emits, slots and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-model</code> share one type that the parent never has to write."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How inference works:</strong> <span style="color:#f0e2c8;">"TypeScript infers <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code> from what the parent passes, usually the array prop, and then types the slot props, event payloads and model value from it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Constraints:</strong> <span style="color:#f0e2c8;">"I constrain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code> to exactly what the component uses, for example <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T extends { id: string | number }</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vue-tsc</code> reports items that do not satisfy it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Runtime reality:</strong> <span style="color:#f0e2c8;">"It is type-only: the compiled component just has <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">items: { type: Array }</code>, so the guarantees exist in the editor and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vue-tsc</code>, not in the browser."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Tooling:</strong> <span style="color:#f0e2c8;">"It needs Vue 3.3 or later and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vue-tsc</code> in CI, because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vite build</code> and plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tsc</code> do not check templates."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does the parent specify <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">T</code> explicitly?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Usually it does not need to; inference from the props is the design. If inference is ambiguous, type the data you pass, for example <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const rows: User[] = ...</code>, and the rest follows.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you use more than one type parameter?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, the attribute takes a full TypeScript parameter list, such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">generic="T, K extends keyof T"</code>, so a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sortBy</code> prop can be limited to real keys of the row type.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does a generic component validate props at runtime?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only as far as the generated runtime declaration goes: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Array</code> for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T[]</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Function</code> for callbacks, and nothing for a bare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code>. The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">User</code> shape is erased.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you write this without an SFC?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Pass a generic setup function to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineComponent</code>, for example <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineComponent(&lt;T&gt;(props: { items: T[] }) =&gt; () =&gt; ...)</code>, and list the runtime <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">props</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">emits</code> names in the second argument.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens to <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">T</code> inside the component?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Inside, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code> is only known to satisfy its constraint, so you can read <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">item.id</code> but not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">item.name</code>. That keeps the component honest about what it depends on.</span>
</div>

</div>

## 11. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Type parameter** | A placeholder type filled in at the point of use |
| **Generic component** | A \`<script setup>\` component with a \`generic\` attribute (Vue 3.3+) |
| **Constraint** | \`T extends X\`: the minimum shape \`T\` must have |
| **Inference** | TypeScript working out \`T\` from the passed props |
| **Type erasure** | Types disappear after compilation; the runtime sees plain props |
| **\`vue-tsc\`** | Type checker that understands \`.vue\` files and templates |

---
**Conclusion:** A generic \`<script setup>\` component declares one type parameter that every part of its public contract can use, and lets TypeScript infer it from the parent's props. The verified \`vue-tsc\` run shows the payoff: a wrong slot field, a wrong \`v-model\` type and items missing the required \`id\` were all caught, while correct usage needed no annotations. The compiled output shows the limit just as clearly: at runtime it is a plain component with \`type: Array\` props, so the value comes from running \`vue-tsc\` in CI, not from the browser.`,
    examples: [
      {
        label: "A generic list component and a parent with three type errors vue-tsc catches",
        tech: "vue",
        runnable: false,
        code: `<!-- GenericList.vue -->
<script setup lang="ts" generic="T extends { id: string | number }">
// T is inferred from whatever array the parent passes in :items.
const props = defineProps<{ items: T[]; label: (item: T) => string }>();
const selected = defineModel<T["id"] | null>({ default: null });
const emit = defineEmits<{ pick: [item: T] }>();
defineSlots<{ row?(props: { item: T; active: boolean }): any }>();

function choose(item: T) {
  selected.value = item.id;
  emit("pick", item);
}
</script>

<template>
  <ul>
    <li v-for="item in props.items" :key="item.id" @click="choose(item)">
      <slot name="row" :item="item" :active="item.id === selected">{{ label(item) }}</slot>
    </li>
  </ul>
</template>

<!-- Users.vue: vue-tsc reports the three marked errors -->
<script setup lang="ts">
import { ref } from "vue";
import GenericList from "./GenericList.vue";

type User = { id: number; name: string; email: string };
const users: User[] = [{ id: 1, name: "Ada", email: "ada@example.com" }];
const selectedId = ref<number | null>(null);
const wrongModel = ref("1");

function onPick(u: User) {
  console.log(u.email);
}
</script>

<template>
  <!-- OK: T is inferred as User everywhere below -->
  <GenericList :items="users" :label="(u) => u.name" v-model="selectedId" @pick="onPick">
    <template #row="{ item, active }">{{ active ? ">" : "" }} {{ item.email }}</template>
  </GenericList>

  <!-- Error 1: the slot prop is a User, and User has no phone -->
  <GenericList :items="users" :label="(u) => u.name">
    <template #row="{ item }">{{ item.phone }}</template>
  </GenericList>

  <!-- Error 2: v-model must be T["id"], which is number for User -->
  <GenericList :items="users" :label="(u) => u.name" v-model="wrongModel" />

  <!-- Error 3: the items do not satisfy the constraint (no id) -->
  <GenericList :items="[{ name: 'no id' }]" :label="(x) => x.name" />
</template>
`,
      },
      {
        label: "The same idea without a second file: a generic defineComponent setup function",
        tech: "vue",
        runnable: true,
        code: `<script setup lang="ts">
import { defineComponent, h, ref, type VNodeChild } from "vue";

// The non-SFC twin of <script setup generic="T">: defineComponent with a
// generic setup function. Runtime props still have to be listed (types are erased).
const PickList = defineComponent(
  <T extends { id: string | number }>(
    props: { items: T[]; label: (item: T) => string },
    { emit, slots }: {
      emit: (e: "pick", item: T) => void;
      slots: { row?: (p: { item: T }) => VNodeChild };
    },
  ) => {
    return () =>
      h("ul", props.items.map((item) =>
        h("li", { key: item.id, onClick: () => emit("pick", item) },
          slots.row ? [slots.row({ item })] : props.label(item)),
      ));
  },
  { props: ["items", "label"], emits: ["pick"] },
);

type Book = { id: string; title: string; year: number };
type City = { id: number; name: string; population: number };

const books: Book[] = [
  { id: "b1", title: "Dune", year: 1965 },
  { id: "b2", title: "Neuromancer", year: 1984 },
];
const cities: City[] = [{ id: 7, name: "Lagos", population: 15_400_000 }];
const last = ref("nothing yet");

// Inside each handler the argument is already typed: Book here, City below.
const onBook = (b: Book) => (last.value = \`book \${b.title} (\${b.year})\`);
const onCity = (c: City) => (last.value = \`city \${c.name}, pop \${c.population}\`);
</script>

<template>
  <PickList :items="books" :label="(b) => b.title" @pick="onBook" />
  <PickList :items="cities" :label="(c) => c.name" @pick="onCity">
    <template #row="{ item }"><b>{{ item.name }}</b> ({{ item.population.toLocaleString("en") }})</template>
  </PickList>
  <p>picked: {{ last }}</p>
</template>
`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "useId() vs getCurrentInstance() — how do you generate SSR-safe IDs in Vue 3.5?",
    seoDescription:
      "useId() in Vue 3.5 derives ids from tree position, so server and client agree; getCurrentInstance().uid is a global counter that drifts. SSR verified.",
    description: `**Question presented to candidate:**
"Our form inputs need unique \`id\`s so \`<label for>\` and \`aria-describedby\` work. Someone built them from \`getCurrentInstance().uid\`, and since we added SSR we get hydration warnings. What does \`useId()\` in Vue 3.5 do differently, and how would you fix this?"

**What a strong answer should cover:**
- \`useId()\` (Vue 3.5) returns an id that is **unique per app** and **identical on server and client**, because it is derived from the component's **position in the tree**, not from a global counter.
- \`getCurrentInstance().uid\` is a **module-level counter of every instance ever created**; on a server it keeps growing across requests, so the server and the fresh client disagree, causing **hydration mismatches**.
- \`getCurrentInstance()\` is an **internal-leaning API** that the docs discourage in application code.
- \`app.config.idPrefix\` changes the \`v\` prefix, useful when **several Vue apps share a page**.
- \`useId()\` must be called in **setup**; each call in the same component gives the next id; async boundaries get their own segment so ids stay stable.
- Derive sub-ids from one call (\`\${id}-hint\`) rather than calling it many times; never use \`Math.random()\` or \`Date.now()\` for ids in SSR.

**Clarifying questions expected:**
- "Is there more than one Vue app mounted on the page, for example micro-frontends?"
- "Are we on Vue 3.5 or later? Before that, Nuxt's \`useId\` or a provide-based counter was the workaround."

**Code / implementation expected:** Yes — a field component using \`useId()\`, ideally shown through SSR and hydration.`,
    answer: `**Target Audience:** Vue developers building accessible forms or component libraries, especially with SSR or Nuxt.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then \`📌 Interview term:\` callouts. Every id and every warning below was produced on Vue 3.5.44: the component was mounted in jsdom and rendered with \`renderToString\`, three SSR requests were simulated in one Node process, and the HTML from one of them was hydrated in a fresh jsdom client. The \`useId\` source quoted in section 6 is from the installed \`@vue/runtime-core\` 3.5.44.

## 1. Why This Even Matters — A Story First

Imagine a cinema where seats are numbered by **the order people walked in**: the first person through the door gets seat 1, the next seat 2, and so on, all day long. You buy a ticket at the 2 p.m. show and it says seat 7. Your friend buys the same seat at the 8 p.m. show and his ticket says seat 104, because 97 people came in between. The two tickets point at the same chair, but nothing on them matches.

Now imagine seats numbered by **row and position**: row C, seat 4. That never changes, no matter how many people came before you or which show it is.

In server-side rendering, the server prints the page (the 2 p.m. ticket) and then the browser re-creates the same components (the 8 p.m. ticket) and has to match them up. \`getCurrentInstance().uid\` numbers components by **arrival order**, across every request the server has ever handled. \`useId()\` numbers them by **position in the component tree**. Only the second kind of number is the same on both sides.

## 2. The Core Idea

📌 **Interview term: \`useId()\`** — a Vue 3.5 Composition API function that returns a string id such as \`v-0\`, unique within the app and **stable between server and client renders**. Use it for \`id\`, \`for\`, \`aria-labelledby\`, \`aria-describedby\` and similar attributes.

📌 **Interview term: \`getCurrentInstance()\`** — returns Vue's internal object for the component currently running \`setup()\`. Its \`uid\` is a number taken from a counter shared by **all** apps in the JavaScript process. The Vue team treats \`getCurrentInstance\` as an escape hatch for official and third-party libraries, not as an API for application code.

📌 **Interview term: [Hydration](/interview-question/how-does-server-side-rendering-work-in-vue-rendertostring-hydration)** — the browser takes server-rendered HTML and attaches Vue to it instead of re-creating the DOM. For that, the client's first render must produce the same markup as the server's. Any attribute that differs is a **hydration mismatch**.

📌 **Interview term: \`app.config.idPrefix\`** — a Vue 3.5 app setting that replaces the default \`v\` prefix of every \`useId()\` result in that app.

\`useId()\`, \`app.config.idPrefix\`, \`useTemplateRef\` and \`app.onUnmount\` all first appear in the \`@vue/runtime-core\` **3.5.0** type definitions (none of them is in 3.4.0). Vue 3.5 was published to npm on 3 September 2024 and announced as part of a set of SSR improvements (source: <a href="https://blog.vuejs.org/posts/vue-3-5" target="_blank" rel="noopener noreferrer">Vue 3.5 announcement</a>).

## 3. Arrival Order versus Tree Position

<svg class="iq-diagram" width="100%" viewBox="0 0 700 300" role="img" aria-label="uid ids differ between server request 2 and the client, useId ids match because they follow tree position">
  <text class="d-text" x="170" y="28" text-anchor="middle">uid based ids</text>
  <rect class="d-box-muted" x="40" y="48" width="260" height="70" rx="10"/>
  <text class="d-text" x="170" y="76" text-anchor="middle">server, request 2</text>
  <text class="d-sub" x="170" y="100" text-anchor="middle">field-7</text>
  <rect class="d-box-muted" x="40" y="160" width="260" height="70" rx="10"/>
  <text class="d-text" x="170" y="188" text-anchor="middle">fresh browser</text>
  <text class="d-sub" x="170" y="212" text-anchor="middle">field-3, mismatch</text>
  <text class="d-text" x="530" y="28" text-anchor="middle">useId</text>
  <rect class="d-box-accent" x="400" y="48" width="260" height="70" rx="10"/>
  <text class="d-text d-accent" x="530" y="76" text-anchor="middle">server, any request</text>
  <text class="d-sub" x="530" y="100" text-anchor="middle">v-0, v-1</text>
  <rect class="d-box-accent" x="400" y="160" width="260" height="70" rx="10"/>
  <text class="d-text d-accent" x="530" y="188" text-anchor="middle">fresh browser</text>
  <text class="d-sub" x="530" y="212" text-anchor="middle">v-0, v-1, match</text>
</svg>

The left column depends on how many component instances the process created before this one. The right column depends only on where the component sits in this app's tree, which is the same on the server and in the browser.

## 4. Verified: what each approach renders

The runnable example renders two \`Field\` components that call \`useId()\`, one \`UidField\` that builds \`field-\${getCurrentInstance().uid}\`, and an optional third field behind a \`v-if\`. Mounted in the browser (jsdom):

\`\`\`
[app] RENDERED: Email (v-0)Password (v-1)Nickname (field-3)toggle extra field
\`\`\`

Rendered on the server with \`renderToString\` (\`--ssr\`):

\`\`\`
[ssr] HTML: <!--[--><div class="field"><label for="v-0">Email</label><input id="v-0" aria-describedby="v-0-hint"><small id="v-0-hint"> (v-0)</small></div><div class="field"><label for="v-1">Password</label><input id="v-1" aria-describedby="v-1-hint"><small id="v-1-hint"> (v-1)</small></div><div class="field"><label for="field-3">Nickname</label><input id="field-3"><small> (field-3)</small></div><button>toggle extra field</button><!--v-if--><!--]-->
\`\`\`

On a single first render both look fine, which is exactly why the uid approach passes local testing. The problem appears on the second request.

## 5. Verified: three requests and a hydration

The second example creates a fresh app per request, as SSR requires, and renders it three times in one Node process; request 3 sets \`app.config.idPrefix = "checkout"\`:

\`\`\`
request 1: input ids = v-0, v-1, field-3
request 2: input ids = v-0, v-1, field-7
request 3 (idPrefix=checkout): input ids = checkout-0, checkout-1, field-11
\`\`\`

\`useId()\` gave the same ids every time; the uid-based id grew by 4 per request (four component instances per render: the root and three fields), because the counter is shared by every app the process ever created.

The HTML from request 2 was then hydrated in a fresh jsdom client with \`createSSRApp(App).mount(el)\`:

\`\`\`
[Vue warn]: Hydration attribute mismatch on HTMLLabelElement {}
  - rendered on server: for="field-7"
  - expected on client: for="field-3"
  Note: this mismatch is check-only. The DOM will not be rectified in production due to performance overhead.
  You should fix the source of the mismatch.
  at <Anonymous label="Nickname" >
  at <App>
Hydration completed but contains mismatches.
[Vue warn]: Hydration attribute mismatch on HTMLInputElement {}
  - rendered on server: id="field-7"
  - expected on client: id="field-3"
  ...
[Vue warn]: Hydration text content mismatch on HTMLElement {}
  - rendered on server:  (field-7)
  - expected on client:  (field-3)
  ...
client ids after hydration: v-0, v-1, field-7
toggled extra field, its id: v-2
\`\`\`

- **The \`useId()\` fields hydrated silently.** No warning mentions \`v-0\` or \`v-1\`.
- **The uid field mismatched three times**: on \`for\`, on \`id\` and in the visible text.
- **Attribute mismatches are not repaired.** The note says so, and the DOM really kept \`id="field-7"\` while the client's virtual DOM believes it is \`field-3\`. A later patch to that attribute would leave the label and input out of sync. Fixing it means fixing the source of the id. See [diagnosing hydration mismatches](/interview-question/how-do-you-diagnose-and-fix-hydration-mismatches-in-vue-ssr-nuxt-3).
- **Ids created after hydration continue the sequence.** The field added later by the \`v-if\` got \`v-2\`.

## 6. Verified: how \`useId()\` builds the id

The implementation in \`@vue/runtime-core\` 3.5.44 is short:

\`\`\`js
function useId() {
  const i = getCurrentInstance();
  if (i) {
    return (i.appContext.config.idPrefix || "v") + "-" + i.ids[0] + i.ids[1]++;
  } else {
    warn$1(
      \`useId() is called when there is no active component instance to be associated with.\`
    );
  }
  return "";
}
\`\`\`

- **Per render tree, not per process.** In the same file, each new instance is created with \`ids: parent ? parent.ids : ["", 0, 0]\`, so the counter starts fresh at every root and is shared down that tree, and the prefix comes from that app's config. The \`uid\`, by contrast, comes from a module-level \`let uid = 0\` that every instance increments.
- **Async boundaries get their own segment.** \`markAsyncBoundary\` gives a component with async setup a fresh prefix segment. Rendered on the server, a sync field, an async component containing two fields, and another sync field produced \`v-0\`, \`v-0-0\`, \`v-0-1\` and \`v-1\`. The async component's children are numbered inside its segment, so however long it takes to resolve, the ids around it do not shift.
- **Outside setup it returns an empty string.** Called at module level it printed \`[Vue warn]: useId() is called when there is no active component instance to be associated with.\` and returned \`""\`.

## 7. Comparison

| | \`useId()\` | \`getCurrentInstance().uid\` | \`Math.random()\` / \`Date.now()\` | Hand-written counter |
| :--- | :--- | :--- | :--- | :--- |
| Unique within the page | Yes | Yes | Probably | Yes |
| Same on server and client | Yes | No (verified drift: 3, 7, 11) | No | Only if reset per request and render order matches |
| Public, documented API | Yes (3.5+) | Internal-leaning | Yes | Yes |
| Multiple apps on a page | Distinguish them with \`idPrefix\` | Unique but unstable | Unstable | Must design it |
| Works inside async components | Yes, per-boundary segment | Yes, but unstable | Unstable | Order-dependent |

## 8. Using It Well

- **Call it once per component and derive sub-ids.** \`const id = useId()\` then \`\${id}-hint\`, \`\${id}-error\`, as the example does, keeps related ids visibly linked.
- **Give each app a prefix when several share a page.** Two apps would both start at \`v-0\`; \`app.config.idPrefix = "checkout"\` produced \`checkout-0\`, \`checkout-1\`.
- **Call it during setup, never in a handler or computed.** Each call increments the component's counter, so calling it conditionally or repeatedly breaks the server and client match.
- **Use it for DOM ids, not for data keys.** It is for accessibility attributes and DOM linking, not for \`:key\` in [v-for](/interview-question/why-is-the-key-attribute-important-in-v-for) or database ids.
- **On Nuxt**, a framework \`useId\` existed first: it shipped in Nuxt 3.10, and Nuxt 3.13.1 switched it to Vue's native \`useId\` when it upgraded to Vue 3.5 (sources: the <a href="https://nuxt.com/docs/api/composables/use-id" target="_blank" rel="noopener noreferrer">Nuxt useId docs</a> and the <a href="https://newreleases.io/project/npm/nuxt/release/3.13.1" target="_blank" rel="noopener noreferrer">Nuxt 3.13.1 release notes</a>). See [Nuxt](/interview-question/what-is-nuxt-and-how-does-it-relate-to-vue).

## 9. Common Pitfalls

- **Building ids from \`uid\`.** It works in a client-only app and in a single SSR request, which is why it slips through review, then drifts from the second request on.
- **Expecting Vue to fix the mismatch.** The warning itself says attribute mismatches are check-only and are not rectified in production.
- **Calling \`useId()\` outside setup.** It warns and returns an empty string, giving every element \`id=""\`.
- **Calling it in a loop or a condition.** The sequence then depends on data, and server and client can disagree. Call it once, derive the rest.
- **Two apps without \`idPrefix\`.** Both produce \`v-0\`, and duplicate ids break \`label for\` and ARIA references.
- **Using random values for SSR ids.** Anything nondeterministic differs between server and client by definition.

## 10. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useId()</code> in Vue 3.5 returns an app-unique id derived from the component's position in the tree, so the server and the browser generate the same value."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why uid fails:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">getCurrentInstance().uid</code> is a counter of every instance the process created; on a server it keeps growing across requests, and I reproduced it going 3, 7, 11 while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useId()</code> stayed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-0</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The consequence:</strong> <span style="color:#f0e2c8;">"The client starts at its own count, so hydration reports attribute mismatches on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">id</code>, and those attributes are not repaired in production."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Using it:</strong> <span style="color:#f0e2c8;">"Call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useId()</code> once in setup and derive sub-ids like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">\${id}-hint</code>; set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">app.config.idPrefix</code> when several Vue apps share a page."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The details:</strong> <span style="color:#f0e2c8;">"Async components get their own id segment so the ids around them stay stable, and calling it outside setup warns and returns an empty string."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">getCurrentInstance()</code> discouraged in application code?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It exposes internal component state that is not part of the stable public API, and code built on it, like uid-based ids, tends to break in SSR. Public APIs such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useId</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useAttrs</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useSlots</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inject</code> cover the real needs.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens with two Vue apps on one page?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each app numbers from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-0</code>, so the ids collide. Give each app its own <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">app.config.idPrefix</code>, which changes the prefix of every <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useId()</code> result in that app.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How did people solve this before Vue 3.5?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With a counter provided per app and reset per request, or with a framework helper: Nuxt shipped its own <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useId</code> in 3.10 and moved to Vue's native one in 3.13.1. Both had to do what <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useId()</code> now does: stay deterministic per render, not per process.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useId()</code> safe inside <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">v-for</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Calling it inside a child component rendered by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-for</code> is fine, each instance gets its own id. What you should avoid is calling it a variable number of times in one component, because the sequence then depends on the data.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can I use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useId()</code> as a list key?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It is for DOM ids. A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:key</code> must identify the data item, so it should come from the data, such as a database id.</span>
</div>

</div>

## 11. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **\`useId()\`** | Vue 3.5 function returning an app-unique id that matches between server and client |
| **\`getCurrentInstance()\`** | Internal-leaning access to the component being set up |
| **\`uid\`** | A per-process instance counter; unstable across SSR requests |
| **Hydration mismatch** | Server HTML and client render disagree; attributes are not repaired |
| **\`app.config.idPrefix\`** | Replaces the default \`v\` prefix for one app's ids |
| **Async boundary** | A component with async setup; gets its own id segment |

---
**Conclusion:** The difference between \`useId()\` and \`getCurrentInstance().uid\` is the difference between a seat number and a queue number. On Vue 3.5.44, \`useId()\` produced \`v-0\` and \`v-1\` on every SSR request and hydrated without a single warning, while the uid-based id drifted from 3 to 7 to 11 across requests and produced three hydration mismatches that Vue does not repair. Call \`useId()\` once per component in setup, derive related ids from it, set \`idPrefix\` when apps share a page, and keep \`getCurrentInstance()\` out of application code.`,
    examples: [
      {
        label: "Form fields with useId() next to a uid-based id (render it on the client and with SSR)",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { defineComponent, h, useId, getCurrentInstance, ref } from "vue";

// SSR-safe: useId() derives the id from the component position in the tree.
const Field = defineComponent({
  props: { label: String },
  setup(props) {
    const id = useId();
    return () => h("div", { class: "field" }, [
      h("label", { for: id }, props.label),
      h("input", { id, "aria-describedby": \`\${id}-hint\` }),
      h("small", { id: \`\${id}-hint\` }, \` (\${id})\`),
    ]);
  },
});

// Not SSR-safe: uid is a global counter of every instance ever created.
const UidField = defineComponent({
  props: { label: String },
  setup(props) {
    const id = \`field-\${getCurrentInstance().uid}\`;
    return () => h("div", { class: "field" }, [
      h("label", { for: id }, props.label),
      h("input", { id }),
      h("small", \` (\${id})\`),
    ]);
  },
});

const extra = ref(false);
</script>

<template>
  <Field label="Email" />
  <Field label="Password" />
  <UidField label="Nickname" />
  <button @click="extra = !extra">toggle extra field</button>
  <Field v-if="extra" label="Extra" />
</template>
`,
      },
      {
        label: "Three SSR requests and a hydration: useId stays stable, uid-based ids drift and mismatch",
        tech: "js",
        runnable: false,
        code: `// ssr.mjs: render the same App three times, as three requests would
import { createSSRApp } from "vue";
import { renderToString } from "@vue/server-renderer";
import { writeFileSync } from "fs";
import App from "./App.vue";
const ids = (html) => [...html.matchAll(/<input id="([^"]+)"/g)].map((m) => m[1]).join(", ");
for (const req of [1, 2, 3]) {
  const app = createSSRApp(App);              // a fresh app per request, as SSR requires
  if (req === 3) app.config.idPrefix = "checkout";
  const html = await renderToString(app);
  console.log(\`request \${req}\${req === 3 ? " (idPrefix=checkout)" : ""}: input ids = \${ids(html)}\`);
  if (req === 2) writeFileSync("server.html", html);
}

// hydrate.mjs: hydrate the HTML that request 2 produced, in a fresh client
import { createSSRApp, nextTick } from "vue";
import { readFileSync } from "fs";
import App from "./App.vue";
const el = document.querySelector("#app");
el.innerHTML = readFileSync("server.html", "utf8");    // the HTML that request 2 sent
const app = createSSRApp(App);
app.mount(el);                                          // hydrate, not re-render
await nextTick();
console.log("client ids after hydration:", [...el.querySelectorAll("input")].map((i) => i.id).join(", "));
el.querySelector("button").click(); await nextTick();
console.log("toggled extra field, its id:", el.querySelectorAll("input")[3].id);
`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you add global properties or config?",
    seoDescription:
      "app.config.globalProperties adds this.$x everywhere, app.provide serves script setup, and app.config sets error and warning hooks. All verified.",
    description: `**Question presented to candidate:**
"We want a \`$formatPrice\` helper usable in every template, the API base URL available to every component, and one place that logs all uncaught component errors. How do you set up global properties and app-wide config in Vue 3, and how does that work with \`<script setup>\` and TypeScript?"

**What a strong answer should cover:**
- \`app.config.globalProperties.$x = ...\` makes \`$x\` available as \`this.$x\` and in **every template**; it replaces Vue 2's \`Vue.prototype.$x\`.
- In \`<script setup>\` there is no \`this\`, so script code should get shared values from **\`app.provide()\` + \`inject()\`**; reaching through \`getCurrentInstance()\` works but is discouraged.
- A component's own data, props or methods **shadow** a global property of the same name.
- Global properties need a **TypeScript augmentation** of \`ComponentCustomProperties\` in a module file (with \`export {}\`).
- \`app.config\` also holds **\`errorHandler\`**, **\`warnHandler\`** (dev only), \`performance\`, \`idPrefix\`, \`throwUnhandledErrorInProduction\` and \`compilerOptions\` (runtime compiler builds only).
- Everything is **per app instance**, set before \`mount()\`; in SSR it must be set per request.

**Clarifying questions expected:**
- "Is the codebase Options API, \`<script setup>\`, or both? That decides between globalProperties and provide."
- "Is there SSR? App config then has to be created per request."

**Code / implementation expected:** Yes — a \`main.ts\` that sets a global property, an app-level provide and an error handler, and a typed augmentation.`,
    answer: `**Target Audience:** Vue developers setting up an app's entry file, or migrating \`Vue.prototype\` code from Vue 2.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then \`📌 Interview term:\` callouts. The runtime output below came from bundling the example (\`main.js\` plus three SFCs) with esbuild and running it in jsdom on Vue 3.5.44; the TypeScript errors came from \`vue-tsc\` 3.3.13 with \`strict: true\`.

## 1. Why This Even Matters — A Story First

Think of an office building. Some things belong to everyone: the building address on the letterhead, the fire alarm, the front desk that takes every lost-property report. You do not want each team to print its own letterhead or run its own alarm.

A Vue app has the same needs. A price formatter every template uses, the API base URL every request needs, and one place that hears about every crash. Vue 3 gives each app instance a small "building services" panel for this: \`app.config\`, \`app.config.globalProperties\` and \`app.provide()\`.

The interview catch is that there are two ways to share something, and they suit different code. Global properties reach \`this\` and templates, which is perfect for the Options API. \`<script setup>\` has no \`this\`, so script code there needs \`provide\` and \`inject\`. A good answer knows which to use and how to type both.

## 2. The Core Idea

📌 **Interview term: Application instance** — the object returned by \`createApp(App)\`. Since Vue 3, global configuration lives on this instance rather than on a global \`Vue\` object, so two apps on one page can be configured independently. See [creating a Vue 3 app](/interview-question/how-do-you-create-a-new-vue-3-app-and-what-is-in-the-project-structure).

📌 **Interview term: \`app.config.globalProperties\`** — an object whose properties are added to every component instance in the app. Anything put there is readable as \`this.$name\` in the Options API and as \`$name\` in any template. It is the Vue 3 replacement for Vue 2's \`Vue.prototype.$name\`.

📌 **Interview term: \`app.provide(key, value)\`** — makes a value available to every component in the app through \`inject(key)\`. Unlike global properties it works naturally in \`<script setup>\` and composables. See [provide and inject](/interview-question/what-are-provide-and-inject).

📌 **Interview term: \`app.config.errorHandler\`** — a function called with \`(err, instance, info)\` for errors thrown in component render functions, lifecycle hooks, watchers and event handlers that no \`onErrorCaptured\` handled. See [error handling](/interview-question/how-do-you-handle-errors-in-vue-onerrorcaptured-app-config-errorhandler).

## 3. Two Routes to Every Component

<svg class="iq-diagram" width="100%" viewBox="0 0 700 300" role="img" aria-label="globalProperties reach this and templates, app provide reaches inject in script setup and composables">
  <defs>
    <marker id="gp-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="250" y="30" width="200" height="60" rx="12"/>
  <text class="d-text d-accent" x="350" y="57" text-anchor="middle">app instance</text>
  <text class="d-sub" x="350" y="78" text-anchor="middle">createApp(App)</text>
  <path class="d-edge" d="M 300 94 L 175 146" marker-end="url(#gp-arrow)"/>
  <path class="d-edge-accent" d="M 400 94 L 525 146" marker-end="url(#gp-arrow)"/>
  <rect class="d-box" x="50" y="152" width="250" height="56" rx="10"/>
  <text class="d-sub" x="175" y="185" text-anchor="middle">config.globalProperties</text>
  <rect class="d-box" x="400" y="152" width="250" height="56" rx="10"/>
  <text class="d-sub" x="525" y="185" text-anchor="middle">app.provide(key, value)</text>
  <path class="d-edge" d="M 175 212 L 175 236" marker-end="url(#gp-arrow)"/>
  <path class="d-edge-accent" d="M 525 212 L 525 236" marker-end="url(#gp-arrow)"/>
  <rect class="d-box-muted" x="50" y="242" width="250" height="44" rx="10"/>
  <text class="d-sub" x="175" y="269" text-anchor="middle">this.$x and any template</text>
  <rect class="d-box-muted" x="400" y="242" width="250" height="44" rx="10"/>
  <text class="d-sub" x="525" y="269" text-anchor="middle">inject(key) in script setup</text>
</svg>

Both routes start at the same application instance and reach every component in it. The left route attaches to the component proxy, so it suits templates and Options API code. The right route goes through dependency injection, so it suits Composition API code, composables and anything that needs a typed, overridable value.

## 4. Verified: setting it all up

The first example's \`main.js\` configures one app and mounts three SFCs: an Options API \`OptionsCard\`, a \`<script setup>\` \`SetupCard\`, and a \`Boom\` component whose click handler throws:

\`\`\`js
app.config.globalProperties.$formatPrice = (cents) => \`$\${(cents / 100).toFixed(2)}\`;
app.config.globalProperties.$appName = "Shop";
app.config.globalProperties.title = "global title"; // shadowed by the component data below
app.provide("currency", "USD");
app.config.errorHandler = (err, instance, info) => { /* log it */ };
app.config.warnHandler = (msg) => { /* route dev warnings */ };
\`\`\`

Running it, then clicking the button:

\`\`\`
[warnHandler] injection "featureFlags" not found.
[SetupCard] inject('currency') = USD | via instance: $5.00
[OptionsCard] this.$formatPrice(1999) = $19.99
[OptionsCard] this.$appName = Shop | this.title = local title
DOM: options: $12.50 in Shopsetup: $0.99 (USD)pay
[errorHandler] checkout failed | info: native event handler | component: Boom.vue
\`\`\`

What each line proves:

- **Templates see global properties in both styles.** \`{{ $formatPrice(cents) }}\` rendered \`$12.50\` in the Options API card and \`$0.99\` in the \`<script setup>\` card.
- **\`this\` sees them in the Options API.** \`this.$formatPrice(1999)\` returned \`$19.99\`.
- **The component wins a name clash.** \`OptionsCard\` declares \`data() { return { title: "local title" } }\`, and \`this.title\` returned that, not the global \`"global title"\`. Prefixing globals with \`$\` avoids the clash.
- **Script setup uses \`inject\`.** \`inject("currency")\` returned the app-level value. Reaching through \`getCurrentInstance().appContext.config.globalProperties\` also worked (\`$5.00\`), but it ties the code to an internal-leaning API and is not typed for you.
- **\`warnHandler\` intercepts dev warnings.** The missing \`featureFlags\` injection went to the handler instead of the console.
- **\`errorHandler\` catches event handler errors**, with the \`info\` string \`native event handler\` and the instance that threw.

A second small app threw from \`onMounted\`, from a \`watch\` callback (twice, on two changes) and from the render function. The same handler received all of them, each with its own \`info\`:

\`\`\`
[errorHandler] in onMounted | info: mounted hook
[errorHandler] in watcher | info: watcher callback
[errorHandler] in watcher | info: watcher callback
[errorHandler] in render | info: render function
\`\`\`

## 5. The \`app.config\` Options

| Option | What it does | Notes |
| :--- | :--- | :--- |
| \`globalProperties\` | Adds properties to every component instance | Component's own properties take priority, as verified |
| \`errorHandler\` | Receives uncaught errors from components | Verified above for event handlers, hooks, watchers and render |
| \`warnHandler\` | Receives runtime warnings | Development builds only; verified above |
| \`performance\` | Enables component performance marks for devtools | Default \`false\` (read from a fresh app) |
| \`idPrefix\` | Prefix for [\`useId()\`](/interview-question/useid-vs-getcurrentinstance-how-do-you-generate-ssr-safe-ids-in-vue-3-5) results | Vue 3.5+; default prefix is \`v\` |
| \`throwUnhandledErrorInProduction\` | Rethrow unhandled errors in production instead of only logging | Vue 3.5+, declared in the 3.5.0 typings |
| \`compilerOptions\` | Options for the runtime template compiler | Only in the full build, see below |
| \`optionMergeStrategies\` | Custom merge rules for custom options | Rarely needed outside plugins |

The \`compilerOptions\` row was checked: with the runtime-only build (\`vue\` resolves to \`dist/vue.runtime.esm-bundler.js\` through its \`module\` field, which is what bundlers such as Vite pick up), reading \`app.config.compilerOptions\` printed this warning:

\`\`\`
[Vue warn]: The \`compilerOptions\` config option is only respected when using a build of Vue.js that includes the runtime compiler (aka "full build"). Since you are using the runtime-only build, \`compilerOptions\` must be passed to \`@vue/compiler-dom\` in the build setup instead.
\`\`\`

So, for example, telling Vue that \`<my-widget>\` is a custom element is done in \`@vitejs/plugin-vue\`'s options, not in \`app.config\`, in a normal Vite project.

Outside \`app.config\`, the same instance has \`app.provide()\`, \`app.component()\` and \`app.directive()\` for global registration, \`app.use()\` for [plugins](/interview-question/what-is-a-vue-plugin), and \`app.runWithContext(fn)\`, which lets code outside components use \`inject\`: \`app.runWithContext(() => inject("apiBase"))\` returned \`/api/v2\` after \`app.provide("apiBase", "/api/v2")\`.

## 6. Verified: typing a global property

A template using \`$formatPrice\` in a \`<script setup lang="ts">\` component, checked with \`vue-tsc\` **without** any declaration:

\`\`\`
q8/Price.vue(4,17): error TS2339: Property '$formatPrice' does not exist on type '{ cents: number; $props: ...
\`\`\`

With the augmentation from the second example (an \`export {}\` plus \`declare module "vue" { interface ComponentCustomProperties { $formatPrice: (cents: number) => string } }\`), the unknown-property error disappeared, and the deliberate mistake \`$formatPrice("12")\` became a real type error:

\`\`\`
q8/Price.vue(4,56): error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.
\`\`\`

📌 **Interview term: Module augmentation** — adding members to an interface declared inside a library's types. It only works if the file is itself a module, which is what the \`export {}\` line does.

That line matters more than it looks. With \`export {}\` removed, the same file **replaced** Vue's types instead of extending them, and an unrelated \`import { ref } from "vue"\` broke:

\`\`\`
q8/Probe.vue(2,10): error TS2305: Module '"vue"' has no exported member 'ref'.
\`\`\`

For values reached through \`inject\`, the typed equivalent is an \`InjectionKey\`; see [type-safe provide/inject](/interview-question/how-do-you-make-provide-inject-type-safe).

## 7. Vue 2 to Vue 3 Mapping

| Vue 2 (global \`Vue\`) | Vue 3 (per app) |
| :--- | :--- |
| \`Vue.prototype.$http = ...\` | \`app.config.globalProperties.$http = ...\` |
| \`Vue.config.errorHandler\` | \`app.config.errorHandler\` |
| \`Vue.component("X", ...)\` | \`app.component("X", ...)\` |
| \`Vue.directive("focus", ...)\` | \`app.directive("focus", ...)\` |
| \`Vue.use(Plugin)\` | \`app.use(Plugin)\` |
| \`Vue.mixin({...})\` | \`app.mixin({...})\`, discouraged; see [composables over mixins](/interview-question/why-are-composables-preferred-over-mixins) |
| \`Vue.config.ignoredElements\` | \`isCustomElement\` in the compiler options |

The move to per-app config is why Vue 3 can safely run two apps on one page, and why SSR can create a clean app per request.

## 8. Common Pitfalls

- **Expecting \`this.$x\` in \`<script setup>\`.** There is no \`this\`. Use \`inject\`, or a module import, for script code; keep globals for templates.
- **Naming a global without a \`$\` prefix.** A component property of the same name silently wins, as the \`title\` check shows.
- **Configuring after mount.** Set config and global properties before \`app.mount()\`, so the first render and every hook see them.
- **A \`.d.ts\` without \`export {}\`.** It replaces the \`vue\` module's types; the verified run lost \`ref\` entirely.
- **Putting mutable shared state on \`globalProperties\`.** A plain object there is not reactive and, in SSR, shared state must be per request. Use Pinia or \`provide\` a reactive value.
- **Setting \`compilerOptions\` in \`app.config\` with Vite.** It is ignored in the runtime-only build and warns; configure the compiler in the Vite plugin.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"Global setup in Vue 3 lives on the app instance: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">app.config.globalProperties</code> for things templates and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">this</code> should see, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">app.provide</code> for things script code should inject, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">app.config</code> for hooks like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">errorHandler</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Global properties:</strong> <span style="color:#f0e2c8;">"Setting <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">app.config.globalProperties.$formatPrice</code> makes it available as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">this.$formatPrice</code> and in every template, which replaces <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Vue.prototype</code> from Vue 2."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Script setup:</strong> <span style="color:#f0e2c8;">"There is no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">this</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;script setup&gt;</code>, so for script code I <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">app.provide</code> a value with an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">InjectionKey</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inject</code> it, which is typed and easy to override in tests."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Types:</strong> <span style="color:#f0e2c8;">"For templates I augment <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ComponentCustomProperties</code> in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.d.ts</code> that has <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">export {}</code>; without that line the file replaces Vue's types instead of extending them."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Config hooks:</strong> <span style="color:#f0e2c8;">"I set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">errorHandler</code> for production logging, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">warnHandler</code> in development, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">idPrefix</code> when several apps share a page, and keep compiler options in the Vite plugin."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if a component defines the same name as a global property?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The component's own data, prop or method wins. I verified a data property <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">title</code> shadowing a global <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">title</code>, which is why globals conventionally start with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did Vue 3 move config from <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Vue</code> to the app instance?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A global <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Vue</code> object meant every app on the page, and every SSR request, shared one configuration. Per-app config isolates them, so two apps can have different plugins and SSR can build a clean app per request.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you use a global property in a composable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Better not to. A composable has no template and no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">this</code>, so provide the value at app level and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inject</code> it, or import a module. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">getCurrentInstance()</code> would work but couples the composable to an internal-leaning API.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">errorHandler</code> catch everything?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It receives errors from component render, setup, lifecycle hooks, watchers and event handlers that no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onErrorCaptured</code> stopped. Errors in your own unawaited promises or timers outside Vue code still need <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">window</code> level handlers.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">app.runWithContext</code> for?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It runs a function with the app as the injection context, so code outside components, such as a router guard or a store setup, can call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inject()</code> and get app-level provided values.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Application instance** | The object from \`createApp()\`, which holds all app-wide config |
| **\`globalProperties\`** | Properties added to every component, read as \`this.$x\` and in templates |
| **\`app.provide\`** | App-wide value for \`inject()\`, the Composition API friendly route |
| **\`errorHandler\`** | App-level receiver for uncaught component errors |
| **\`warnHandler\`** | Development-only receiver for Vue warnings |
| **Module augmentation** | Extending \`ComponentCustomProperties\` so templates type-check globals |
| **\`runWithContext\`** | Lets non-component code \`inject\` app-level values |

---
**Conclusion:** Vue 3 puts everything global on the application instance. \`globalProperties\` reaches every template and every \`this\`, \`app.provide\` reaches \`<script setup>\` and composables through \`inject\`, and \`app.config\` carries the error, warning and id settings. The verified run on Vue 3.5.44 shows each piece working, including the two details interviewers like to probe: a component's own property silently shadows a global one, and a type augmentation without \`export {}\` replaces Vue's types instead of extending them.`,
    examples: [
      {
        label: "App-wide setup: globalProperties, app.provide, errorHandler and warnHandler",
        tech: "js",
        runnable: false,
        code: `import { createApp, h, nextTick } from "vue";
import OptionsCard from "./OptionsCard.vue";
import SetupCard from "./SetupCard.vue";
import Boom from "./Boom.vue";

const app = createApp({ render: () => [h(OptionsCard, { cents: 1250 }), h(SetupCard, { cents: 99 }), h(Boom)] });

// 1. Global properties: reachable as this.x and in every template.
app.config.globalProperties.$formatPrice = (cents) => \`$\${(cents / 100).toFixed(2)}\`;
app.config.globalProperties.$appName = "Shop";
app.config.globalProperties.title = "global title"; // shadowed by the component data below

// 2. App-level provide: the Composition API friendly way to share config.
app.provide("currency", "USD");

// 3. Central error and warning hooks.
app.config.errorHandler = (err, instance, info) => {
  console.log(\`[errorHandler] \${err.message} | info: \${info} | component: \${instance?.$options.__file}\`);
};
app.config.warnHandler = (msg) => console.log(\`[warnHandler] \${msg}\`);

app.mount("#app");
await nextTick();
console.log("DOM:", document.querySelector("#app").textContent);
document.getElementById("boom").click();
await nextTick();
`,
      },
      {
        label: "Typing a global property for templates and this (vue-tsc checked)",
        tech: "ts",
        runnable: false,
        code: `// global-properties.d.ts: the export {} makes this an augmentation, not a replacement of 'vue'
export {};

declare module "vue" {
  interface ComponentCustomProperties {
    $formatPrice: (cents: number) => string;
  }
}
`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is a Vue plugin?",
    seoDescription:
      "A Vue plugin is an object with install(app, options), or a function, run by app.use() to add app-wide features. Dedupe, warnings and cleanup verified.",
    description: `**Question presented to candidate:**
"We want to ship our design system's toast notifications so that any app can turn them on with one line in \`main.ts\`. What is a Vue plugin, what can its \`install\` function do, and how would you make it work well with \`<script setup>\`?"

**What a strong answer should cover:**
- A plugin is **an object with \`install(app, ...options)\`, or a plain function** with the same signature; \`app.use(plugin, options)\` calls it once.
- \`install\` can do anything the app instance allows: **\`app.provide\`**, **\`app.config.globalProperties\`**, **\`app.component\`**, **\`app.directive\`**, **\`app.mixin\`** (discouraged), and nested \`app.use\`.
- Pair it with a **composable** (\`useToast()\` that calls \`inject\`) so \`<script setup>\` code gets a typed API; the global property serves templates and Options API code.
- \`app.use\` is **chainable** and **deduplicated**: a second install of the same plugin is skipped with a dev warning, and options from the second call are ignored.
- Vue 3.5 adds **\`app.onUnmount()\`** so a plugin can release timers or connections when the app unmounts.
- Real examples: Vue Router, Pinia, i18n libraries; for SSR, install on each per-request app.

**Clarifying questions expected:**
- "Will consumers use \`<script setup>\`, the Options API, or both?"
- "Does the plugin hold state? Then it must be created per app, not at module level, for SSR."

**Code / implementation expected:** Yes — a small plugin with \`install\`, a composable to consume it, and \`app.use\` in \`main.ts\`.`,
    answer: `**Target Audience:** Vue developers who install libraries with \`app.use()\` and want to write their own.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then \`📌 Interview term:\` callouts. The plugin, the component that uses it and \`main.js\` were bundled with esbuild and run in jsdom on Vue 3.5.44; every log line and warning below is that run's real output. API availability was checked against the published \`@vue/runtime-core\` type definitions.

## 1. Why This Even Matters — A Story First

Think of a games console. Out of the box it does the basics. Then you slot in a cartridge, and suddenly the console has new characters, new menus, maybe a new controller layout. The cartridge did not rewrite the console. It used a slot the console designers left open, and the console ran the cartridge's start-up routine.

A **Vue plugin** is the cartridge, \`app.use()\` is the slot, and the plugin's \`install\` function is its start-up routine. Vue Router and Pinia are cartridges you have almost certainly used: one line in \`main.ts\`, and every component can now navigate or reach a store.

Interviewers ask because writing a plugin shows you understand the **application instance** and the difference between app-wide registration and per-component code.

## 2. The Core Idea

📌 **Interview term: Plugin** — something passed to \`app.use()\`: either an object with an \`install(app, ...options)\` method, or a function that is itself \`install\`. Vue calls it once with the app instance and any options you passed.

📌 **Interview term: \`app.use(plugin, options)\`** — installs a plugin on one app. It returns the app, so calls chain, and it remembers what it installed so the same plugin is not installed twice.

📌 **Interview term: Global registration** — making a component or directive available in every template of the app without importing it, through \`app.component(name, def)\` and \`app.directive(name, def)\`. See [custom directives](/interview-question/how-do-you-create-a-custom-directive-in-vue).

📌 **Interview term: \`app.onUnmount(cb)\`** — Vue 3.5 API that runs \`cb\` when \`app.unmount()\` is called. It is absent from the 3.4.0 \`@vue/runtime-core\` typings and present from 3.5.0. Plugins use it to stop timers, close sockets or remove global listeners.

A plugin has no special powers. Everything it does, you could do by hand in \`main.ts\`. It is a packaging convention: "here is everything my feature needs, applied to your app in one call, with options".

## 3. What \`install\` Can Touch

<svg class="iq-diagram" width="100%" viewBox="0 0 700 300" role="img" aria-label="app use calls install, which can provide values, add global properties, register components and directives, and register cleanup">
  <defs>
    <marker id="plg-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="40" width="200" height="56" rx="10"/>
  <text class="d-sub" x="140" y="73" text-anchor="middle">app.use(Toast, options)</text>
  <path class="d-edge-accent" d="M 244 68 L 286 68" marker-end="url(#plg-arrow)"/>
  <rect class="d-box-accent" x="292" y="40" width="200" height="56" rx="10"/>
  <text class="d-sub d-accent" x="392" y="73" text-anchor="middle">install(app, options)</text>
  <path class="d-edge" d="M 340 100 L 120 166" marker-end="url(#plg-arrow)"/>
  <path class="d-edge" d="M 370 100 L 280 166" marker-end="url(#plg-arrow)"/>
  <path class="d-edge" d="M 410 100 L 440 166" marker-end="url(#plg-arrow)"/>
  <path class="d-edge" d="M 450 100 L 600 166" marker-end="url(#plg-arrow)"/>
  <rect class="d-box" x="30" y="172" width="150" height="80" rx="10"/>
  <text class="d-text" x="105" y="204" text-anchor="middle">provide</text>
  <text class="d-sub" x="105" y="228" text-anchor="middle">for inject</text>
  <rect class="d-box" x="200" y="172" width="150" height="80" rx="10"/>
  <text class="d-text" x="275" y="204" text-anchor="middle">globals</text>
  <text class="d-sub" x="275" y="228" text-anchor="middle">this.$toast</text>
  <rect class="d-box" x="370" y="172" width="150" height="80" rx="10"/>
  <text class="d-text" x="445" y="204" text-anchor="middle">register</text>
  <text class="d-sub" x="445" y="228" text-anchor="middle">component, directive</text>
  <rect class="d-box-muted" x="540" y="172" width="150" height="80" rx="10"/>
  <text class="d-text" x="615" y="204" text-anchor="middle">cleanup</text>
  <text class="d-sub" x="615" y="228" text-anchor="middle">app.onUnmount</text>
</svg>

\`install\` receives the same app instance you hold in \`main.ts\`, so it can use every app-level API. A well-designed plugin uses \`provide\` as its primary channel (for \`<script setup>\` and composables) and adds a global property only as a convenience for templates and Options API code.

## 4. The Plugin

The first example is a complete toast plugin. Its \`install\`:

- creates **per-app reactive state** (\`reactive({ items: [] })\`) inside \`install\`, so two apps never share toasts;
- calls \`app.provide(ToastKey, toast)\` with a \`Symbol\` key, and exports a \`useToast()\` composable that \`inject\`s it and throws a clear error if the plugin is missing;
- sets \`app.config.globalProperties.$toast\` for templates and \`this\`;
- registers a global \`ToastList\` component and a \`v-autofocus\` directive;
- reads a \`max\` option, and registers \`app.onUnmount()\` cleanup.

It also exports \`versionPlugin\`, a **function plugin**: the function itself is the \`install\`.

The consuming component never imports \`ToastList\` or the directive; they are global:

\`\`\`vue
<script setup>
import { useToast } from "./toast-plugin.js";
const toast = useToast();
</script>
<template>
  <input v-autofocus id="coupon" />
  <button id="pay" @click="toast.show('Paid')">pay</button>
  <button id="save" @click="$toast.show('Saved')">save</button>
  <span>v{{ $appVersion }}</span>
  <ToastList />
</template>
\`\`\`

## 5. Verified: installing it, and the two mistakes Vue catches

The second example's \`main.js\` chains two plugins, then deliberately installs the toast plugin a second time with different options and passes an object that is not a plugin. After mounting it clicks pay, save, pay and unmounts:

\`\`\`
[ToastPlugin] installed with max=2
[Vue warn]: Plugin has already been applied to target app.
[Vue warn]: A plugin must either be a function or an object with an "install" function.
focused element: coupon
DOM: paysavev2.4.0SavedPaid
[ToastPlugin] cleaned up on app.unmount()
\`\`\`

- **\`install\` ran once.** The second \`app.use(ToastPlugin, { max: 99 })\` was skipped with a warning, and its options were ignored: the list still kept only two toasts, so three clicks left \`Saved\` and \`Paid\`.
- **A non-plugin is rejected** with a clear warning rather than an exception.
- **Chaining works.** \`createApp(Checkout).use(ToastPlugin, { max: 2 }).use(versionPlugin)\` installed both, and \`$appVersion\` rendered \`2.4.0\`.
- **Global registrations worked.** The \`v-autofocus\` directive focused the input, and \`<ToastList />\` rendered without an import.
- **Both access routes reach the same state.** The \`pay\` button used the injected \`toast\`; the \`save\` button used the global \`$toast\`; both toasts appear in one list.
- **Cleanup ran.** \`app.unmount()\` triggered the \`app.onUnmount\` callback.

## 6. Plugin, Composable or Component?

| You need | Use | Why |
| :--- | :--- | :--- |
| App-wide setup done once (register, provide, configure) | Plugin | Runs once per app with options |
| Reusable stateful logic inside components | [Composable](/interview-question/what-are-composables-in-vue) | Runs per component, cleans up with it |
| Reusable UI | Component | Has a template |
| Both: app-wide service plus easy access in components | Plugin + composable | \`install\` provides, \`useX()\` injects |

Most real libraries are the last row. Vue Router's plugin registers \`RouterLink\` and \`RouterView\` and provides the router; \`useRouter()\` and \`useRoute()\` inject it. Pinia's plugin provides the active store registry; each \`useXStore()\` injects it. See [Vue Router setup](/interview-question/how-do-you-set-up-vue-router-routes-routerlink-routerview-history-modes) and [Pinia](/interview-question/what-is-pinia-and-why-use-it).

## 7. Designing a Good Plugin

- **Make \`provide\` the primary API, with a \`Symbol\` or \`InjectionKey\`.** It is typed, works in \`<script setup>\`, and can be overridden for one subtree. See [type-safe provide/inject](/interview-question/how-do-you-make-provide-inject-type-safe).
- **Ship a composable that injects and fails loudly.** \`useToast()\` throwing "needs app.use(ToastPlugin)" is far easier to debug than \`undefined.show\`.
- **Create state inside \`install\`, not at module level.** Module-level state is shared by every app in the process, which on an SSR server means every request.
- **Accept options with defaults**, and document them.
- **Type the global property** with a \`ComponentCustomProperties\` augmentation if you add one; see [global properties](/interview-question/how-do-you-add-global-properties-or-config).
- **Clean up with \`app.onUnmount\`** if \`install\` starts anything long-lived.
- **Avoid \`app.mixin\`.** A global mixin runs in every component of the app, including third-party ones.

## 8. Typing a Plugin

In TypeScript, \`Plugin\` is exported from \`vue\`. The 3.5.44 type of \`app.use\` is:

\`\`\`ts
use<Options extends unknown[]>(plugin: Plugin<Options>, ...options: NoInfer<Options>): this;
use<Options>(plugin: Plugin<Options>, options: NoInfer<Options>): this;
\`\`\`

So declaring \`const ToastPlugin: Plugin<[ToastOptions?]> = { install(app, options) { ... } }\` with \`type ToastOptions = { max?: number }\` lets the compiler check what callers pass to \`app.use\`, and the \`this\` return type is what makes chaining type-safe. Checked with \`vue-tsc\`: \`app.use(ToastPlugin, { max: 2 }).use(ToastPlugin)\` passed, and \`app.use(ToastPlugin, { max: "two" })\` failed with:

\`\`\`
error TS2769: No overload matches this call.
  Argument of type '[{ max: string; }]' is not assignable to parameter of type '[(ToastOptions | undefined)?]'.
    Type '{ max: string; }' is not assignable to type 'ToastOptions'.
      Types of property 'max' are incompatible.
        Type 'string' is not assignable to type 'number'.
\`\`\`

## 9. Common Pitfalls

- **Module-level state in a plugin.** Shared across every app and every SSR request. Create it inside \`install\`.
- **Only exposing a global property.** \`<script setup>\` code has no \`this\`, so consumers end up reaching for \`getCurrentInstance()\`. Provide a value and a composable.
- **Expecting a second \`app.use\` to apply new options.** It is skipped with "Plugin has already been applied to target app."; the first options stay.
- **Installing after \`app.mount()\`.** The first render has already happened. In a check, a plugin registering a global \`Badge\` component was installed right after mount: the render had warned \`Failed to resolve component: Badge\` and left a raw \`<badge></badge>\` element in the DOM. Install everything before mount.
- **Passing the wrong shape.** An object without \`install\` is rejected with a warning, not an error, so check the console.
- **Forgetting cleanup.** Timers and sockets started in \`install\` outlive the app unless released with \`app.onUnmount\` (Vue 3.5+).

## 10. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"A Vue plugin is an object with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">install(app, options)</code>, or just a function, that <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">app.use()</code> calls once to add app-wide features."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. What install does:</strong> <span style="color:#f0e2c8;">"It can do anything the app instance allows: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">app.provide</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">app.config.globalProperties</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">app.component</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">app.directive</code>, even other <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">app.use</code> calls."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Good design:</strong> <span style="color:#f0e2c8;">"I make <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">provide</code> with a Symbol key the main channel and ship a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useX()</code> composable that injects it, adding a global property only as a template convenience."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Behaviour:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">app.use</code> returns the app so it chains, and it deduplicates: a second install is skipped with a warning and its options are ignored, which I verified on 3.5."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Lifecycle and SSR:</strong> <span style="color:#f0e2c8;">"State is created inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">install</code> so each app, and each SSR request, gets its own; since 3.5 <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">app.onUnmount</code> lets the plugin clean up."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between an object plugin and a function plugin?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">None in behaviour. A function plugin is the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">install</code> function itself; an object plugin has an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">install</code> method and can carry other properties, such as a version or exported helpers.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do Vue Router and Pinia use the plugin API?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both install with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">app.use()</code>. The router registers <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RouterLink</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RouterView</code> and provides itself so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useRouter()</code> can inject it; Pinia provides its store registry so each <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useXStore()</code> finds the active instance.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you install a plugin twice with different options?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">app.use</code> remembers installed plugins and skips the second call with "Plugin has already been applied to target app.", so the first options win. For different settings, design the plugin to accept them per use through the composable.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just export a module-level singleton instead of a plugin?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A singleton is shared by every app in the process, which breaks SSR isolation and makes testing harder. A plugin creates its state per app, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">provide</code> lets tests or subtrees override it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test a plugin?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Mount a component with Vue Test Utils and pass the plugin in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">global.plugins</code>, then assert on what it rendered or provided. For the pure parts, call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">install</code> with a real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">createApp()</code> instance and inspect <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">app.config</code> or the provided values.</span>
</div>

</div>

## 11. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Plugin** | An \`install(app, options)\` object or function applied with \`app.use()\` |
| **\`app.use\`** | Installs a plugin once per app; chainable |
| **Global registration** | \`app.component\` / \`app.directive\`, usable in every template without imports |
| **Injection key** | A \`Symbol\` (typed as \`InjectionKey<T>\`) identifying a provided value |
| **\`app.onUnmount\`** | Vue 3.5+ cleanup hook that runs on \`app.unmount()\` |
| **Function plugin** | A plain function used directly as \`install\` |

---
**Conclusion:** A Vue plugin is a packaging convention: one \`install(app, options)\` function that applies a feature to an app through the same APIs you could call in \`main.ts\`. The verified run on Vue 3.5.44 shows the behaviour worth knowing: \`app.use\` chains, refuses a second install and a malformed plugin with clear warnings, global components and directives work without imports, and \`app.onUnmount\` gives plugins a cleanup point. Design it with per-app state, \`provide\` plus a composable as the main API, and a global property only for template convenience.`,
    examples: [
      {
        label: "A toast plugin: provide, a global property, a global component, a directive and app.onUnmount cleanup",
        tech: "js",
        runnable: false,
        code: `import { reactive, h, inject } from "vue";

const ToastKey = Symbol("toast");

// A plugin is an object with install(app, options), or just a function.
export const ToastPlugin = {
  install(app, options = {}) {
    const state = reactive({ items: [] });
    const toast = {
      show(text) {
        state.items.push(text);
        if (state.items.length > (options.max ?? 3)) state.items.shift();
      },
    };

    app.provide(ToastKey, toast);                    // for <script setup> via useToast()
    app.config.globalProperties.$toast = toast;      // for Options API and templates
    app.component("ToastList", {                     // a global component
      render: () => h("ul", { class: "toasts" }, state.items.map((t) => h("li", t))),
    });
    app.directive("autofocus", { mounted: (el) => el.focus() }); // a global directive

    const timer = setInterval(() => {}, 60_000);     // a resource to release
    app.onUnmount(() => {                            // Vue 3.5+: cleanup hook for plugins
      clearInterval(timer);
      console.log("[ToastPlugin] cleaned up on app.unmount()");
    });
    console.log(\`[ToastPlugin] installed with max=\${options.max ?? 3}\`);
  },
};

export function useToast() {
  const toast = inject(ToastKey);
  if (!toast) throw new Error("useToast() needs app.use(ToastPlugin)");
  return toast;
}

// A function plugin: the function itself is install.
export function versionPlugin(app) {
  app.config.globalProperties.$appVersion = "2.4.0";
}
`,
      },
      {
        label: "Installing it with app.use(), including the two mistakes Vue warns about",
        tech: "js",
        runnable: false,
        code: `import { createApp, nextTick } from "vue";
import Checkout from "./Checkout.vue";
import { ToastPlugin, versionPlugin } from "./toast-plugin.js";

const app = createApp(Checkout)
  .use(ToastPlugin, { max: 2 })   // app.use returns the app, so calls chain
  .use(versionPlugin);
app.use(ToastPlugin, { max: 99 }); // installed twice by mistake
app.use({ notAPlugin: true });     // no install function

app.mount("#app");
const $ = (id) => document.getElementById(id);
console.log("focused element:", document.activeElement.id);
for (const id of ["pay", "save", "pay"]) { $(id).click(); await nextTick(); }
console.log("DOM:", document.querySelector("#app").textContent.replace(/\\s+/g, " ").trim());
app.unmount();
`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you use TypeScript with Vue (typed props, emits, refs, vue-tsc)?",
    seoDescription:
      "Type Vue components with defineProps<T>(), tuple emits, ref<T>, useTemplateRef and InjectionKey, then check templates with vue-tsc. Real errors.",
    description: `**Question presented to candidate:**
"We are moving a Vue 3 app to TypeScript. Show me how you would type a component's props and emits, refs and template refs, and provide/inject, and tell me how type errors in templates get caught before they reach production."

**What a strong answer should cover:**
- \`<script setup lang="ts">\` with **type-based \`defineProps<{...}>()\`**; the compiler generates the runtime props declaration from the type. Defaults via **reactive props destructure** (Vue 3.5) or \`withDefaults\`.
- **Type-based \`defineEmits\`** with the named-tuple syntax (\`change: [id: number]\`, Vue 3.3+), so \`emit\` calls and parent handlers are checked.
- \`ref<T>()\` for unions or nullable values, inferred otherwise; **\`useTemplateRef\`** (Vue 3.5) for DOM and component refs, typed from the template or explicitly.
- **\`InjectionKey<T>\`** for typed \`provide\`/\`inject\`, remembering \`inject()\` may return \`undefined\`.
- **\`vue-tsc\`** type-checks \`.vue\` files including templates; plain \`tsc\` cannot import \`.vue\`, and \`vite build\` strips types without checking, so CI must run \`vue-tsc --noEmit\` (create-vue wires it as \`type-check\`).
- Types are compile-time only: Vue still validates props at runtime in development from the generated declaration.

**Clarifying questions expected:**
- "Which Vue version are we on? Props destructure, \`useTemplateRef\` and the tuple emits syntax depend on it."
- "Is the build already running \`vue-tsc\`, or only Vite?"

**Code / implementation expected:** Yes — a typed child with props and emits, a parent using it, and at least one real \`vue-tsc\` error.`,
    answer: `**Target Audience:** Vue developers adopting TypeScript, or TypeScript developers new to Vue's single file components.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then \`📌 Interview term:\` callouts. Every type error below is real output from \`vue-tsc\` 3.3.13 with TypeScript 5.9 and \`strict: true\`; compiled output comes from \`@vue/compiler-sfc\` 3.5.44; runtime behaviour and warnings come from mounting the components in jsdom on Vue 3.5.44; the \`vite build\` result is from vite 8.3.4. Version claims were checked against the published \`@vue/runtime-core\` type definitions.

## 1. Why This Even Matters — A Story First

Picture an electrician's wiring diagram. Each socket is labelled: "230 V, 16 A", "USB only", "oven, dedicated circuit". The labels do not carry any current, they are just ink on paper. But an inspector reads them *before* the walls are closed, and spots the kettle plugged into the USB socket while it is still cheap to fix.

TypeScript in a Vue app is that diagram. \`defineProps<{ qty: number }>()\` is a label on a socket. The inspector is \`vue-tsc\`, which reads every component *and every template* before the app ships, and points at the parent that passes \`"3"\` into a \`number\` socket.

The interview catch is the inspector. Plenty of teams write the labels and never call the inspector: their editor shows red squiggles, but the build tool happily ships the mistake. A strong answer covers both the typing APIs and where checking actually happens.

## 2. The Core Idea

📌 **Interview term: Type-based declaration** — passing a TypeScript type to a compiler macro, as in \`defineProps<{ sku: string; qty: number }>()\`, instead of a runtime object. The SFC compiler reads the type and generates the runtime declaration for you. See [defineProps and defineEmits](/interview-question/how-do-defineprops-and-defineemits-work-in-script-setup).

📌 **Interview term: Reactive props destructure** — \`const { qty, max = 10 } = defineProps<...>()\`. Stable since Vue 3.5: the compiler rewrites each use of \`qty\` to \`__props.qty\`, so it stays reactive, and \`= 10\` becomes the runtime default. It replaces \`withDefaults\` for most cases.

📌 **Interview term: \`InjectionKey<T>\`** — a \`Symbol\` typed with the value it carries. \`provide(ThemeKey, value)\` then checks the value, and \`inject(ThemeKey)\` returns \`T | undefined\`.

📌 **Interview term: \`useTemplateRef()\`** — a Vue 3.5 function that returns a ref bound to the element or component with the matching \`ref="..."\` attribute. With \`vue-tsc\` its type can be inferred from the template. See [useTemplateRef](/interview-question/what-is-usetemplateref-vue-3-5-and-how-does-it-improve-on-ref).

📌 **Interview term: \`vue-tsc\`** — the command-line type checker built on Vue's language tools. It understands \`.vue\` files, including templates, and is the Vue equivalent of running \`tsc --noEmit\`.

| API | Typing pattern | Since |
| :--- | :--- | :--- |
| Props | \`defineProps<{ qty: number; max?: number }>()\` | Vue 3.0; imported and complex types 3.3 |
| Prop defaults | \`const { max = 10 } = defineProps<...>()\` | Destructure stable 3.5; \`withDefaults\` before |
| Emits | \`defineEmits<{ change: [sku: string, qty: number] }>()\` | Tuple syntax 3.3 |
| \`v-model\` | \`defineModel<string>()\` | Stable 3.4; see [defineModel](/interview-question/what-is-definemodel-in-vue-3-4-and-how-does-it-replace-manual-prop-emit) |
| State | \`ref<Theme>("dark")\`, inferred when obvious | 3.0 |
| Template refs | \`useTemplateRef<HTMLInputElement>("search")\` | 3.5 |
| Provide/inject | \`InjectionKey<Ref<Theme>>\` | 3.0 |
| Slots | \`defineSlots<{...}>()\` | 3.3; see [defineSlots](/interview-question/what-do-defineoptions-and-defineslots-do-in-script-setup) |
| Generic components | \`<script setup lang="ts" generic="T">\` | 3.3; see [generic components](/interview-question/how-do-generic-script-setup-components-work-generic-t) |

The 3.3 and 3.5 entries were checked against the published packages: the 3.2.47 compiler rejects an imported props type (\`type argument passed to defineProps() must be a literal type, or a reference to an interface or literal type.\`) and silently generates no emits from the tuple syntax, while 3.5.44 produces \`props: { a: { type: String, required: true } }\` and \`emits: ["change"]\` for the same code. Reactive props destructure being stable in 3.5 is from the <a href="https://blog.vuejs.org/posts/vue-3-5" target="_blank" rel="noopener noreferrer">Vue 3.5 announcement</a>.

## 3. Where Each Type Is Checked

<svg class="iq-diagram" width="100%" viewBox="0 0 700 290" role="img" aria-label="vue-tsc checks script and template types, vite build only strips types, and the browser only runs the generated runtime prop checks">
  <defs>
    <marker id="ts-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="250" y="30" width="200" height="56" rx="10"/>
  <text class="d-sub" x="350" y="63" text-anchor="middle">Cart.vue and its types</text>
  <path class="d-edge-accent" d="M 300 90 L 140 150" marker-end="url(#ts-arrow)"/>
  <path class="d-edge" d="M 350 90 L 350 150" marker-end="url(#ts-arrow)"/>
  <path class="d-edge" d="M 400 90 L 560 150" marker-end="url(#ts-arrow)"/>
  <rect class="d-box-accent" x="30" y="156" width="220" height="90" rx="12"/>
  <text class="d-text d-accent" x="140" y="186" text-anchor="middle">vue-tsc</text>
  <text class="d-sub" x="140" y="210" text-anchor="middle">script and template</text>
  <text class="d-sub" x="140" y="230" text-anchor="middle">fails CI on errors</text>
  <rect class="d-box-muted" x="260" y="156" width="180" height="90" rx="12"/>
  <text class="d-text" x="350" y="186" text-anchor="middle">vite build</text>
  <text class="d-sub" x="350" y="210" text-anchor="middle">strips types</text>
  <text class="d-sub" x="350" y="230" text-anchor="middle">no checking</text>
  <rect class="d-box" x="450" y="156" width="220" height="90" rx="12"/>
  <text class="d-text" x="560" y="186" text-anchor="middle">browser, dev mode</text>
  <text class="d-sub" x="560" y="210" text-anchor="middle">runtime prop checks</text>
  <text class="d-sub" x="560" y="230" text-anchor="middle">from generated types</text>
</svg>

The same source goes to three places. Only \`vue-tsc\` understands the TypeScript types in both the script and the template. The bundler throws the types away. The browser never sees TypeScript at all, but in development it runs the runtime prop checks the compiler generated from your types, which catches a different class of bug: bad data from JavaScript callers or API responses.

## 4. The Typed Component

The static example's \`QtyStepper.vue\` uses each pattern once:

\`\`\`vue
<script setup lang="ts">
import { computed, inject } from "vue";
import { ThemeKey } from "./keys";

const { sku, qty, max = 10 } = defineProps<{ sku: string; qty: number; max?: number }>();
const emit = defineEmits<{ change: [sku: string, qty: number]; limit: [] }>();
const theme = inject(ThemeKey);           // Ref<Theme> | undefined
const atMax = computed(() => qty >= max); // ComputedRef<boolean>

function inc() {
  if (atMax.value) return emit("limit");
  emit("change", sku, qty + 1);
}
defineExpose({ inc });
</script>
\`\`\`

and \`keys.ts\` holds \`export const ThemeKey: InjectionKey<Ref<Theme>> = Symbol("theme")\` with \`type Theme = "light" | "dark"\`.

## 5. Verified: what the compiler generates from the types

\`\`\`js
  props: {
    sku: { type: String, required: true },
    qty: { type: Number, required: true },
    max: { type: Number, required: false, default: 10 }
  },
  emits: ["change", "limit"],
\`\`\`

and the destructured props in the body were rewritten:

\`\`\`js
const atMax = computed(() => __props.qty >= __props.max); // ComputedRef<boolean>
  emit("change", __props.sku, __props.qty + 1);
\`\`\`

So one type gave you three things: **editor and \`vue-tsc\` checking**, a **runtime declaration** with \`required\` and the default, and **reactive** destructured names. Mounted with \`qty: 9, max: 10\` and clicked twice, the component emitted \`change A-1 10\` and then \`limit\`, proving that \`atMax\` tracked the destructured \`qty\` as the parent updated it.

## 6. Verified: seven mistakes \`vue-tsc\` catches

\`Mistakes.vue\` contains one mistake per numbered comment. \`vue-tsc --noEmit\` printed (long type names shortened with \`...\`):

\`\`\`
q10/Mistakes.vue(7,1): error TS2322: Type 'string' is not assignable to type 'number'.
q10/Mistakes.vue(8,19): error TS2345: Argument of type 'Ref<"blue", "blue">' is not assignable to parameter of type 'Ref<Theme, Theme>'.
  Type '"blue"' is not assignable to type 'Theme'.
q10/Mistakes.vue(10,1): error TS18048: 'theme' is possibly 'undefined'.
q10/Mistakes.vue(12,16): error TS2339: Property 'reset' does not exist on type 'CreateComponentPublicInstanceWithMixins<...{ inc: () => void; }...
q10/Mistakes.vue(17,38): error TS2322: Type 'string' is not assignable to type 'number'.
q10/Mistakes.vue(19,4): error TS2345: Argument of type '{ qty: number; }' is not assignable to parameter of type '{ readonly sku: string; readonly qty: number; ...
  Property 'sku' is missing in type '{ qty: number; }' but required in type '{ readonly sku: string; readonly qty: number; ...
q10/Mistakes.vue(21,33): error TS2322: Type '(sku: number) => number' is not assignable to type '(sku: string, qty: number) => any'.
  Types of parameters 'sku' and 'sku' are incompatible.
    Type 'string' is not assignable to type 'number'.
\`\`\`

| # | Mistake | Caught because |
| :--- | :--- | :--- |
| 1 | \`qty.value = "2"\` | \`ref(1)\` inferred \`Ref<number>\` |
| 2 | \`provide(ThemeKey, ref("blue"))\` | The \`InjectionKey\` fixes the value type to \`Ref<Theme>\` |
| 3 | \`theme.value = "light"\` after \`inject\` | \`inject()\` returns \`T \\| undefined\` without a default |
| 4 | \`stepper.value?.reset()\` | \`useTemplateRef("stepper")\` was typed from the template, and only \`inc\` is exposed |
| 5 | \`:qty="'3'"\` in the template | Template bindings are checked against the props type |
| 6 | \`<QtyStepper :qty="3" />\` | \`sku\` is required |
| 7 | \`@change="(sku: number) => sku"\` | The handler must match \`[sku: string, qty: number]\` |

Mistakes 4 to 7 live in the template or depend on it. Those are exactly the ones a plain TypeScript setup cannot see.

## 7. Verified: why \`vue-tsc\` and not \`tsc\` or the build

Three runs on the same project:

- **Plain \`tsc --noEmit\`** stopped at the first import of a component: \`q10/main.ts(2,18): error TS2307: Cannot find module './Cart.vue' or its corresponding type declarations.\` It does not understand \`.vue\` files.
- **\`vue-tsc --noEmit\`** on the correct files (\`main.ts\`, \`Cart.vue\`, \`QtyStepper.vue\`, \`keys.ts\`) exited with code 0, and on \`Mistakes.vue\` reported the seven errors above.
- **\`vite build\`** with \`Mistakes.vue\` as the root component printed \`✓ built in 492ms\` and exited 0. The bundler strips types with esbuild and checks nothing.

That is why the official scaffolding separates them. The TypeScript template in \`create-vue\` 3.24.0 (the current version on npm) has \`"type-check": "vue-tsc --build"\` and \`"build-only": "vite build"\`, with \`"build"\` running both in parallel. If your project only runs \`vite build\` in CI, it has no type checking at all. See [creating a Vue 3 app](/interview-question/how-do-you-create-a-new-vue-3-app-and-what-is-in-the-project-structure).

## 8. Verified: the runtime safety net

Types vanish at runtime, but the generated declaration does not. Mounting \`QtyStepper\` from plain JavaScript with \`{ qty: "3" }\` and no provider printed, in development mode:

\`\`\`
[Vue warn]: Missing required prop: "sku"
[Vue warn]: Invalid prop: type check failed for prop "qty". Expected Number with value 3, got String with value "3".
[Vue warn]: injection "Symbol(theme)" not found.
\`\`\`

This is a development-only net for data TypeScript cannot see, such as a JSON response. It complements \`vue-tsc\`; it does not replace it. See [prop validation](/interview-question/what-are-props-in-vue-and-how-do-you-validate-them).

## 9. Verified: the runnable example

The runnable example keeps everything in one file: a \`Task\` interface, \`ref<Task[]>\`, an inferred \`reactive\` draft, a \`computed\` count, \`useTemplateRef<HTMLInputElement>\`, and an inline \`TaskRow\` child typed with \`PropType<Task>\` and an emits validator. It passes \`vue-tsc\` with no errors, and mounted and driven it printed:

\`\`\`
focused input placeholder: New task
[app] RENDERED: [ ] Write tests[x] Run vue-tsc1 of 2 left
toggle first : [x] Write tests[x] Run vue-tsc0 of 2 left
add a task   : [x] Write tests[x] Run vue-tsc[ ] Ship it1 of 3 left | input now: "" | focused: true
\`\`\`

\`PropType<Task>\` is the runtime-declaration way of typing an object prop; it is what you use with \`defineComponent\` or the Options API, where there is no type-based \`defineProps\`.

## 10. Common Pitfalls

- **No \`vue-tsc\` in CI.** Editors show errors, \`vite build\` ships them. Add \`vue-tsc --noEmit\` (or \`--build\`) as a required step.
- **Destructuring props and passing the variable to \`watch\`.** \`watch(qty, ...)\` would hand over a number, not a source. The 3.5.44 compiler refuses it: \`"qty" is a destructured prop and should not be passed directly to watch(). Pass a getter () => qty instead.\` Write \`watch(() => qty, ...)\`.
- **Assuming \`inject()\` is defined.** It returns \`T | undefined\`; pass a default, or throw in a small \`useTheme()\` composable if the provider is required.
- **Typing props as \`Object\` without \`PropType\`.** In runtime declarations, \`type: Object\` gives \`Record<string, any>\`; use \`Object as PropType<Task>\`.
- **Annotating everything.** \`ref(1)\` is already \`Ref<number>\`. Annotate unions (\`ref<Theme>("dark")\`), nullable values (\`ref<string | null>(null)\`) and empty arrays (\`ref<Task[]>([])\`).
- **Expecting runtime checks for complex types.** Compiled, \`defineProps<{ theme: "light" | "dark" }>()\` became \`theme: { type: String, required: true }\`; any string passes at runtime, so TypeScript is the only guard for the literal values.

## 11. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"I write components as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;script setup lang="ts"&gt;</code> and declare props, emits and slots with types, so the compiler generates the runtime declarations and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vue-tsc</code> checks both script and templates."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Props and emits:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineProps&lt;{ qty: number }&gt;()</code> with destructured defaults since 3.5, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineEmits&lt;{ change: [sku: string, qty: number] }&gt;()</code> with the 3.3 tuple syntax, so parent handlers are checked."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Refs and injection:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ref</code> infers simple types and I annotate unions or nullables; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useTemplateRef</code> types DOM and component refs; an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">InjectionKey&lt;T&gt;</code> types provide and inject, and inject may be undefined."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Checking:</strong> <span style="color:#f0e2c8;">"Plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tsc</code> cannot import <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.vue</code> files and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vite build</code> only strips types, so CI runs <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vue-tsc --noEmit</code>, which is what <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">create-vue</code> wires up as its type-check script."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Runtime:</strong> <span style="color:#f0e2c8;">"Types are erased, but the generated prop declaration still warns in development about missing or wrongly typed props from untyped callers."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;"><code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">withDefaults</code> or destructured defaults?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">On Vue 3.5 and later, destructured defaults: they are shorter and the compiler keeps the names reactive by rewriting them to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__props.x</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">withDefaults</code> still works and is what you see in pre-3.5 code.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you type a child component ref?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useTemplateRef("name")</code> <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vue-tsc</code> infers it from the template, including only what the child exposes with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineExpose</code>. Outside that, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">InstanceType&lt;typeof Child&gt;</code> gives the instance type for a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ref</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">vite build</code> succeed with type errors?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Vite transpiles TypeScript with esbuild, which removes types without checking them, and it does not type-check templates. Checking is a separate <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vue-tsc</code> step by design, so builds stay fast.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you type global properties like <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">$t</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Augment <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ComponentCustomProperties</code> in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.d.ts</code> file with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">export {}</code>, so the declaration extends the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vue</code> module instead of replacing it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does TypeScript make runtime prop validation pointless?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Types only cover code the compiler can see. Data from APIs, plain JavaScript callers or third-party wrappers is caught only by the runtime declaration in development, or by validating at the boundary.</span>
</div>

</div>

## 12. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Type-based declaration** | \`defineProps<T>()\` / \`defineEmits<T>()\`; the compiler generates runtime options from \`T\` |
| **Reactive props destructure** | Destructured props stay reactive and take defaults (stable in 3.5) |
| **\`InjectionKey<T>\`** | A typed Symbol for \`provide\` / \`inject\` |
| **\`useTemplateRef()\`** | Vue 3.5 typed template ref by name |
| **\`PropType<T>\`** | Casts a runtime prop type to a precise TypeScript type |
| **\`vue-tsc\`** | Type checker for \`.vue\` files, including templates |

---
**Conclusion:** TypeScript with Vue is two jobs. Writing the types is the easy part: \`defineProps\` and \`defineEmits\` with type arguments, inferred or annotated refs, \`useTemplateRef\`, and \`InjectionKey\`, from which the compiler also generates the runtime declarations. Checking them is the part teams skip: as verified, plain \`tsc\` cannot read \`.vue\` files and \`vite build\` shipped a component with seven type errors, while \`vue-tsc\` caught all seven, four of them in the template. Run \`vue-tsc\` in CI and keep the runtime prop warnings as the safety net for data TypeScript never sees.`,
    examples: [
      {
        label: "Typed refs, computed, a template ref and a typed child component in one file",
        tech: "vue",
        runnable: true,
        code: `<script setup lang="ts">
import {
  ref, computed, reactive, useTemplateRef, onMounted, defineComponent, h,
  type PropType,
} from "vue";

type Status = "todo" | "done";
interface Task { id: number; title: string; status: Status }

// A typed child without a second file: runtime props + PropType, typed emits.
const TaskRow = defineComponent({
  props: {
    task: { type: Object as PropType<Task>, required: true },
  },
  emits: {
    toggle: (id: number) => Number.isInteger(id), // validator doubles as the type
  },
  setup(props, { emit }) {
    return () =>
      h("li", { onClick: () => emit("toggle", props.task.id) },
        \`\${props.task.status === "done" ? "[x]" : "[ ]"} \${props.task.title}\`);
  },
});

const tasks = ref<Task[]>([
  { id: 1, title: "Write tests", status: "todo" },
  { id: 2, title: "Run vue-tsc", status: "done" },
]);
const draft = reactive({ title: "" });                       // inferred { title: string }
const remaining = computed(() =>                             // ComputedRef<number>
  tasks.value.filter((t) => t.status === "todo").length);
const input = useTemplateRef<HTMLInputElement>("newTask");  // HTMLInputElement | null

function toggle(id: number) {
  const t = tasks.value.find((t) => t.id === id);
  if (t) t.status = t.status === "done" ? "todo" : "done";
}
function add() {
  if (!draft.title.trim()) return;
  tasks.value.push({ id: Date.now(), title: draft.title.trim(), status: "todo" });
  draft.title = "";
  input.value?.focus();
}

onMounted(() => {
  input.value?.focus();
  console.log("focused input placeholder:", input.value?.placeholder);
});
</script>

<template>
  <input ref="newTask" v-model="draft.title" placeholder="New task" @keyup.enter="add" />
  <ul>
    <TaskRow v-for="t in tasks" :key="t.id" :task="t" @toggle="toggle" />
  </ul>
  <p>{{ remaining }} of {{ tasks.length }} left</p>
</template>
`,
      },
      {
        label: "Typed props, emits and inject, plus seven mistakes vue-tsc reports",
        tech: "vue",
        runnable: false,
        code: `<!-- keys.ts
import type { InjectionKey, Ref } from "vue";

export type Theme = "light" | "dark";
export const ThemeKey: InjectionKey<Ref<Theme>> = Symbol("theme");
-->

<!-- QtyStepper.vue: typed props (destructured with a default), typed emits, typed inject -->
<script setup lang="ts">
import { computed, inject } from "vue";
import { ThemeKey } from "./keys";

// Type-based props. Destructuring keeps reactivity (Vue 3.5) and gives defaults.
const { sku, qty, max = 10 } = defineProps<{
  sku: string;
  qty: number;
  max?: number;
}>();

// Type-based emits, named-tuple syntax (Vue 3.3+).
const emit = defineEmits<{
  change: [sku: string, qty: number];
  limit: [];
}>();

const theme = inject(ThemeKey);           // Ref<Theme> | undefined
const atMax = computed(() => qty >= max); // ComputedRef<boolean>

function inc() {
  if (atMax.value) return emit("limit");
  emit("change", sku, qty + 1);
}
defineExpose({ inc });
</script>

<template>
  <button :class="theme" @click="inc">{{ sku }}: {{ qty }} / {{ max }}</button>
</template>

<!-- Mistakes.vue: vue-tsc reports one error for each numbered comment -->
<script setup lang="ts">
import { ref, provide, inject, useTemplateRef } from "vue";
import QtyStepper from "./QtyStepper.vue";
import { ThemeKey } from "./keys";

const qty = ref(1);
qty.value = "2";                                   // 1: wrong type into a Ref<number>
provide(ThemeKey, ref("blue"));                    // 2: "blue" is not a Theme
const theme = inject(ThemeKey);
theme.value = "light";                             // 3: inject() may return undefined
const stepper = useTemplateRef("stepper");
stepper.value?.reset();                            // 4: only inc() is exposed
</script>

<template>
  <!-- 5: qty must be a number -->
  <QtyStepper ref="stepper" sku="A" :qty="'3'" />
  <!-- 6: sku is required -->
  <QtyStepper :qty="3" />
  <!-- 7: the change handler receives (sku: string, qty: number) -->
  <QtyStepper sku="B" :qty="1" @change="(sku: number) => sku" />
</template>
`,
      },
    ],
  },
];

export default augments;
