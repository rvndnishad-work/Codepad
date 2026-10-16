/**
 * Vue ULTRA — batch 01: the easy fundamentals (what Vue is, creating an app
 * with create-vue, template syntax, Single File Components, directives,
 * v-if vs v-show, v-for, event handling and modifiers, v-html and XSS, and
 * what changed from Vue 2 to Vue 3 including Vue 2 end of life).
 *
 * Full CLAUDE.md treatment per question, matching the React, Next.js and
 * Angular ultra banks: a plain-language story first, `📌 Interview term:`
 * callouts, a Verified section quoting output that was actually produced, a
 * theme-aware `.iq-diagram` SVG, comparison tables, topic-specific pitfalls,
 * the §7 "How to Answer in an Interview" card, a glossary and a conclusion.
 *
 * Every "Verified" block was produced on Vue 3.5.44 with
 * scripts/verify-vue-example.mjs: compiled with @vue/compiler-sfc, bundled
 * with esbuild and mounted with createApp(App).mount("#app") in jsdom (or
 * rendered with renderToString for --ssr). Examples marked runnable are the
 * exact files that passed it. Compiler output comes from running
 * @vue/compiler-sfc / @vue/compiler-dom 3.5.44 directly; scaffolding claims
 * come from running create-vue 3.24.0, npm install, vite build (Vite 8.3.4)
 * and vue-tsc; the v-html XSS payload was also run in real Chromium 141 via
 * playwright-core; Vue 2 contrasts were run on vue 2.7.16.
 *
 * Conventions: SVG attributes double-quoted, `<code>` tags or backticks for
 * inline code in prose, no leading H1, `description` is plain markdown (no HTML).
 */
import type { VueAugment } from "./vue-augments.types";

const augments: VueAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is Vue.js and what are its core features?",
    seoDescription:
      "Vue.js is a progressive JavaScript framework for building UIs. Its core features: declarative templates, reactivity, components and SFCs, verified on 3.5.",
    description: `**Question presented to candidate:**
"You have never worked with our frontend stack before. In plain words, what is Vue.js, and which features make it useful for building a user interface?"

**What a strong answer should cover:**
- Vue is a **progressive JavaScript framework** for building user interfaces: you can add it to one widget through a script tag or build a whole single-page app with it.
- **Declarative rendering**: an HTML-based template describes what the screen should look like for the current state; Vue keeps the DOM in sync.
- **Reactivity**: state created with \`ref()\` / \`reactive()\` is tracked, so changing it updates exactly the parts of the page that read it; \`computed()\` gives cached derived values.
- **Components** and **Single File Components** (\`.vue\` files with template, script and style) as the unit of reuse.
- Built-in **directives** (\`v-if\`, \`v-for\`, \`v-bind\`, \`v-on\`, \`v-model\`) and an official ecosystem: Vite tooling, Vue Router, Pinia, Vue Test Utils, Nuxt.
- Under the hood, templates are **compiled** to render functions with a virtual DOM; current stable is Vue 3 (3.5.x), and Vue 2 is end of life.

**Clarifying questions expected:**
- "Are we adding Vue to an existing server-rendered page, or starting a new single-page app?"
- "Do you want the feature list, or how it compares with React or Angular?"

**Code / implementation expected:** Optional. A small component with reactive state, a computed value and a list is a good way to show the core features.`,
    answer: `**Target Audience:** Complete beginners preparing for a first Vue interview. Assumes you know a little HTML and JavaScript, nothing about Vue or any other framework.
**Difficulty:** Easy

> **How to read this doc:** Every idea is explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the exact words an interviewer listens for. The outputs in sections 5 and 6 were produced by actually compiling and running the code on Vue 3.5.44, the current stable release.

## 1. Why This Even Matters — A Story First

Imagine you run a small café and keep the menu on a whiteboard. Every time a dish sells out, someone has to walk over, find the right line, rub it out and rewrite the price list. On a quiet day that is fine. On a busy day the board is always a little bit wrong, because people forget which lines depend on which.

Now imagine a magic whiteboard. You keep a simple list in a notebook ("soup: 3 left, cake: sold out") and the board redraws itself to match the notebook, automatically and instantly, but only the lines that actually changed. You never touch the board again; you only update the notebook.

That is what **Vue.js** does for a web page. Your JavaScript holds the notebook (the **state**). Your template describes how the board should look for any state. Vue does the rubbing out and rewriting, so the page always matches the data.

Without a tool like Vue you write code such as <code>document.querySelector("#count").textContent = count</code> after every change, and in a big app you eventually forget one. Vue removes that whole class of bugs.

## 2. The Core Idea

📌 **Interview term: Vue.js** — an open-source (MIT licensed) JavaScript framework for building user interfaces, created by Evan You. The npm registry shows the package first published in December 2013, 1.0 in October 2015, 2.0 in September 2016 and 3.0 on 18 September 2020. The current stable line is 3.5 (3.5.44 at the time of writing), with 3.6 available as a release candidate.

📌 **Interview term: Progressive framework** — you can adopt Vue a little at a time. Drop one script tag into an existing page to make a single widget interactive, or use the full toolchain (Vite, Single File Components, routing, state management, server rendering) for a large app. Vue does not force the whole stack on you on day one.

📌 **Interview term: Declarative rendering** — you describe *what* the UI should look like for the current data, using an HTML-based template with <code>{{ }}</code> placeholders, and Vue works out *how* to update the DOM. The opposite, **imperative** code, is you calling DOM APIs step by step. The syntax is covered in [Vue template syntax](/interview-question/what-is-vue-template-syntax-interpolation-directives-expressions).

📌 **Interview term: Reactivity** — Vue tracks which pieces of state each part of the page reads. When that state changes, only the dependent parts re-render. You create reactive state with <code>ref()</code> or <code>reactive()</code> (see [ref vs reactive](/interview-question/what-is-the-difference-between-ref-and-reactive)), and the deep dive is [how Vue reactivity works](/interview-question/how-does-vue-s-reactivity-system-work).

📌 **Interview term: Component** — a reusable, self-contained piece of UI with its own template, logic and style, such as a button, a card or a whole page. An app is a tree of components that pass data down as [props](/interview-question/what-are-props-in-vue-and-how-do-you-validate-them) and send events up.

📌 **Interview term: Single File Component (SFC)** — a <code>.vue</code> file that holds one component's <code>&lt;template&gt;</code>, <code>&lt;script&gt;</code> and <code>&lt;style&gt;</code> together. See [What is a Single File Component](/interview-question/what-is-a-single-file-component-sfc).

## 3. The Progressive Ladder

<svg class="iq-diagram" width="100%" viewBox="0 0 680 330" role="img" aria-label="Four levels of adopting Vue, from a script tag on an existing page up to a full server rendered app">
  <defs>
    <marker id="vq1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="40" y="250" width="270" height="56" rx="10"/>
  <text class="d-text" x="175" y="274" text-anchor="middle">1. Script tag on a page</text>
  <text class="d-sub" x="175" y="294" text-anchor="middle">one widget, no build step</text>
  <rect class="d-box" x="130" y="170" width="270" height="56" rx="10"/>
  <text class="d-text" x="265" y="194" text-anchor="middle">2. SFCs with Vite</text>
  <text class="d-sub" x="265" y="214" text-anchor="middle">components in .vue files</text>
  <rect class="d-box" x="220" y="90" width="270" height="56" rx="10"/>
  <text class="d-text" x="355" y="114" text-anchor="middle">3. Single-page app</text>
  <text class="d-sub" x="355" y="134" text-anchor="middle">Vue Router and Pinia</text>
  <rect class="d-box-accent" x="310" y="10" width="330" height="56" rx="10"/>
  <text class="d-text d-accent" x="475" y="34" text-anchor="middle">4. Full-stack framework</text>
  <text class="d-sub" x="475" y="54" text-anchor="middle">Nuxt: SSR, file routing, server code</text>
  <path class="d-edge-accent" d="M 320 278 L 440 278 L 440 232" marker-end="url(#vq1-arrow)"/>
  <path class="d-edge-accent" d="M 410 198 L 530 198 L 530 152" marker-end="url(#vq1-arrow)"/>
  <path class="d-edge-accent" d="M 500 118 L 600 118 L 600 72" marker-end="url(#vq1-arrow)"/>
</svg>

Each step up adds tooling, but the core (templates, reactivity, components) is identical on every step. A widget written on step 1 uses the same <code>createApp</code>, the same template syntax and the same reactivity as a [Nuxt](/interview-question/what-is-nuxt-and-how-does-it-relate-to-vue) app on step 4.

## 4. The Core Features at a Glance

| Feature | What it gives you | Where to read more |
| :--- | :--- | :--- |
| Declarative templates | HTML plus <code>{{ }}</code> interpolation and directives | [Template syntax](/interview-question/what-is-vue-template-syntax-interpolation-directives-expressions) |
| Reactivity | <code>ref</code>, <code>reactive</code>, <code>computed</code>, <code>watch</code>; the page follows the data | [Reactivity system](/interview-question/how-does-vue-s-reactivity-system-work) |
| Directives | <code>v-if</code>, <code>v-for</code>, <code>v-bind</code>, <code>v-on</code>, <code>v-model</code> and more | [Directives](/interview-question/what-are-vue-directives-give-common-examples) |
| Components and SFCs | Reusable pieces in <code>.vue</code> files with scoped CSS | [SFC](/interview-question/what-is-a-single-file-component-sfc) |
| Two-way form binding | <code>v-model</code> keeps an input and a variable in sync | [v-model on inputs](/interview-question/how-does-v-model-work-on-form-inputs) |
| Two API styles | Composition API (<code>&lt;script setup&gt;</code>) and the older Options API | [Composition vs Options](/interview-question/what-is-the-composition-api-and-how-does-it-differ-from-the-options-api) |
| Compiler-optimised virtual DOM | Templates compile to render functions with patch flags, so updates skip static parts | [Compiler optimisations](/interview-question/how-does-the-vue-compiler-optimize-templates-static-hoisting-patch-flags-block-t) |
| Official ecosystem | create-vue + Vite, Vue Router, Pinia, Vue Test Utils, Vue DevTools, Nuxt | [Pinia](/interview-question/what-is-pinia-and-why-use-it) |

📌 **Interview term: Virtual DOM** — a lightweight JavaScript description of what the DOM should be. On a change, Vue re-runs the component render function, compares the new description with the old one and applies only the differences to the real DOM. Vue's compiler marks which parts of a template can ever change, so the comparison skips static content.

📌 **Interview term: Composition API** — the function-based way of writing component logic (<code>ref</code>, <code>computed</code>, <code>onMounted</code>) inside <code>&lt;script setup&gt;</code>. The **Options API** organises the same logic into an object with <code>data</code>, <code>methods</code> and <code>computed</code> keys. Both are fully supported in Vue 3.

## 5. Verified: The Core Features in One Component

The runnable example below is a tiny to-do list that uses almost every core feature: reactive state (<code>ref</code>), a derived value (<code>computed</code>), two-way binding (<code>v-model</code>), list rendering (<code>v-for</code> with <code>:key</code>), conditional rendering (<code>v-if</code> / <code>v-else</code>), an event with a modifier (<code>@submit.prevent</code>) and a dynamic class.

It was compiled with <code>@vue/compiler-sfc</code> and mounted in jsdom with <code>createApp(App).mount("#app")</code>. A driver then typed "Ship it", submitted the form and ticked every checkbox. Each line is the text content of the app, so neighbouring elements run together:

\`\`\`
RENDERED    : Vue 3.5.44 todo listAddLearn templatesLearn reactivity1 left
after add   : Vue 3.5.44 todo listAddLearn templatesLearn reactivityShip it2 left
input now   : ""
after ticks : Vue 3.5.44 todo listAddLearn templatesLearn reactivityShip itAll done!
span classes: done, done, done
\`\`\`

Read what happened: pushing into <code>todos</code> added a row and changed "1 left" to "2 left" without any DOM code; clearing <code>newTodo</code> emptied the input because of <code>v-model</code>; ticking the boxes flipped the <code>v-if</code> branch to "All done!" and added the <code>done</code> class to each label. The code never touches the DOM directly.

## 6. Verified: "Progressive" Is Literal

The second example is a plain HTML page that loads Vue's global build from a CDN and mounts an app on an existing element, with no npm, no bundler and no <code>.vue</code> files. Vue compiles the in-page template in the browser.

It was run in jsdom with the CDN script swapped for the byte-identical <code>vue/dist/vue.global.prod.js</code> from the installed 3.5.44 package (this sandbox has no network):

\`\`\`
before click: Clicked 0 times
after click : Clicked 1 times
Vue.version : 3.5.44
\`\`\`

Measured sizes of the two browser builds shipped in vue 3.5.44:

| File | Raw | Gzipped | Contains |
| :--- | :--- | :--- | :--- |
| <code>vue.global.prod.js</code> | 170,605 bytes | 62,098 bytes | Runtime **and** template compiler |
| <code>vue.runtime.global.prod.js</code> | 111,232 bytes | 41,836 bytes | Runtime only; templates must be pre-compiled |

That difference is why build tools pre-compile templates: with SFCs and Vite, the compiler runs at build time and the browser only downloads the runtime. The real app built in [creating a Vue 3 app](/interview-question/how-do-you-create-a-new-vue-3-app-and-what-is-in-the-project-structure) is a 73 KB (28 KB gzipped) JavaScript bundle including the starter page.

## 7. Vue Next to React and Angular

| | Vue | React | Angular |
| :--- | :--- | :--- | :--- |
| What it is | Progressive framework | UI library | Full framework |
| Templates | HTML-based templates (JSX optional) | [JSX](/interview-question/what-is-jsx) | HTML templates with Angular syntax |
| Reactivity | Automatic dependency tracking | Re-render on <code>setState</code>, then diff | Signals plus compiled views |
| Official router and store | Yes (Vue Router, Pinia) | No, community choice | Yes (built in) |
| Learning curve | Gentle; HTML, CSS and JS skills transfer | Moderate | Steeper; many concepts up front |

Interviewers rarely want "Vue is better". They want to hear the trade-off: Vue gives you official answers for routing and state while staying light enough to drop into a single page.

## 8. Common Pitfalls

- **Describing Vue as "just a view library".** It started as one, but Vue 3 ships an official router, store, test utils, DevTools and scaffolding; "progressive framework" is the official phrase.
- **Quoting Vue 2 facts as current.** Vue 2 reached end of life on 31 December 2023. Things like <code>new Vue()</code>, filters and <code>Vue.set</code> are gone in Vue 3; see [Vue 2 vs Vue 3](/interview-question/what-changed-from-vue-2-to-vue-3-and-what-does-vue-2-end-of-life-mean).
- **Mutating the DOM by hand inside a Vue app.** <code>document.querySelector(...).textContent = x</code> is overwritten on the next render. Change the state instead, or use a [template ref](/interview-question/how-do-you-access-a-dom-element-or-child-component-instance) when you genuinely need the element.
- **Forgetting that reactivity only tracks reactive state.** A plain <code>let count = 0</code> in <code>&lt;script setup&gt;</code> renders once and never updates. Use <code>ref(0)</code>. More in [reactivity caveats](/interview-question/what-are-common-reactivity-caveats-in-vue).
- **Shipping the full build when you use SFCs.** The compiler-included build is about 20 KB larger gzipped (62,098 vs 41,836 bytes above); with Vite and SFCs you get the runtime-only build automatically.
- **Thinking you must pick the Composition API or Options API forever.** Both work in Vue 3, can coexist in one app, and compile to the same runtime.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"Vue is a progressive JavaScript framework for building user interfaces: you describe the UI with templates and Vue keeps the DOM in sync with your data."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Progressive:</strong> <span style="color:#f0e2c8;">"You can add it to one widget with a script tag, or scale up to SFCs with Vite, Vue Router, Pinia and Nuxt; the core is the same at every step."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Reactivity:</strong> <span style="color:#f0e2c8;">"State made with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ref</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reactive</code> is tracked, so a change re-renders only the parts that read it, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> gives cached derived values."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Components:</strong> <span style="color:#f0e2c8;">"UI is a tree of components, usually Single File Components with template, script and scoped style in one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.vue</code> file."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Show you are current:</strong> <span style="color:#f0e2c8;">"Vue 3 is the current major, 3.5 is stable, templates compile to optimised render functions, and Vue 2 reached end of life at the end of 2023."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does progressive actually mean?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">That Vue does not demand the whole stack up front. The same <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">createApp</code> and template syntax run from a CDN script tag on a server-rendered page, and in a Vite project with routing and SSR. Teams can migrate one widget at a time.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is Vue different from React?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Vue uses HTML-based templates that are compiled and optimised, and tracks dependencies automatically, so you rarely think about re-renders. React uses JSX and re-runs components on state changes. Vue also ships an official router and store, while React leaves those choices to the community.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does Vue use a virtual DOM?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. Templates compile to render functions that produce virtual nodes, and Vue patches only what changed. The compiler adds patch flags so static parts are skipped. Vapor mode, in the 3.6 release candidate, is an opt-in compile strategy that skips the virtual DOM.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Options API or Composition API?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both are supported. The Composition API with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;script setup&gt;</code> is the recommended default for new code because logic can be grouped by feature and reused through composables; the Options API is still fine for simple components.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you not pick Vue?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the team already has deep expertise and tooling in another framework, or when a project needs a library only available for another ecosystem. Vue itself scales well; the deciding factors are usually people and ecosystem, not performance.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Vue.js** | Open-source JavaScript framework for building user interfaces |
| **Progressive framework** | Adopt as little or as much as you need, from one widget to a full app |
| **Declarative rendering** | Describe the UI for the current state; Vue updates the DOM |
| **Reactivity** | Vue tracks what state each part of the page reads and updates it on change |
| **Component** | Reusable, self-contained piece of UI |
| **Single File Component** | A <code>.vue</code> file with template, script and style for one component |
| **Virtual DOM** | A JavaScript description of the DOM that Vue diffs to find minimal updates |
| **Composition API** | Function-based component logic (<code>ref</code>, <code>computed</code>) in <code>&lt;script setup&gt;</code> |

---
**Conclusion:** Vue.js is a progressive framework: the same core of declarative templates, automatic reactivity and components works whether you drop a script tag into one page or build a full Nuxt app. As verified on Vue 3.5.44, a component can add rows, flip conditional branches and keep inputs in sync without a single line of DOM code, and the same app runs from a CDN with no build step. A strong interview answer names those core features, shows you know Vue 3 is current and Vue 2 is end of life, and explains the trade-off that makes Vue attractive: official answers for routing and state, with a gentle on-ramp.`,
    examples: [
      {
        label: "Core features in one component: reactive state, computed, v-model, v-for, v-if and events",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { ref, computed, version } from "vue";

// Reactive state: when these change, Vue re-renders only what reads them.
const newTodo = ref("");
const todos = ref([
  { id: 1, text: "Learn templates", done: true },
  { id: 2, text: "Learn reactivity", done: false },
]);

// Derived state: cached, recomputed only when todos changes.
const remaining = computed(() => todos.value.filter((t) => !t.done).length);

let nextId = 3;
function addTodo() {
  if (!newTodo.value.trim()) return;
  todos.value.push({ id: nextId++, text: newTodo.value.trim(), done: false });
  newTodo.value = "";
}
</script>

<template>
  <h3>Vue {{ version }} todo list</h3>
  <form @submit.prevent="addTodo">
    <input v-model="newTodo" placeholder="What next?" />
    <button>Add</button>
  </form>
  <ul>
    <li v-for="todo in todos" :key="todo.id">
      <label>
        <input type="checkbox" v-model="todo.done" />
        <span :class="{ done: todo.done }">{{ todo.text }}</span>
      </label>
    </li>
  </ul>
  <p v-if="remaining === 0">All done!</p>
  <p v-else>{{ remaining }} left</p>
</template>

<style scoped>
.done { text-decoration: line-through; color: gray; }
</style>
`,
      },
      {
        label: "Progressive adoption: Vue from a script tag, no build step",
        tech: "html",
        runnable: false,
        code: `<!doctype html>
<html>
  <body>
    <div id="app">
      <button @click="count++">Clicked {{ count }} times</button>
    </div>
    <script src="https://unpkg.com/vue@3.5.44/dist/vue.global.prod.js"></script>
    <script>
      Vue.createApp({ data: () => ({ count: 0 }) }).mount("#app");
    </script>
  </body>
</html>
`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you create a new Vue 3 app, and what is in the project structure?",
    seoDescription:
      "Create a Vue 3 app with npm create vue@latest (create-vue + Vite). What each generated file does, verified by scaffolding, building and running it.",
    description: `**Question presented to candidate:**
"You are starting a brand-new Vue 3 project today. How do you create it, and can you walk me through the files and folders it generates and what each one is for?"

**What a strong answer should cover:**
- The official scaffolder is **create-vue**, run with \`npm create vue@latest\`; it creates a **Vite**-based project. Vue CLI (webpack) is in maintenance mode and not used for new projects.
- Optional features chosen at creation: TypeScript, JSX, Vue Router, Pinia, Vitest, Cypress or Playwright, ESLint and Prettier.
- The flow from \`index.html\` (the real entry, with \`<div id="app">\` and a module script) to \`src/main.ts\` (\`createApp(App).mount('#app')\`) to \`src/App.vue\` and the component tree.
- The roles of \`src/components\`, \`src/assets\`, \`public/\`, \`vite.config.ts\` (the Vue plugin and the \`@\` alias), \`package.json\` scripts, the tsconfig files and \`env.d.ts\`.
- The commands: \`npm install\`, \`npm run dev\` (dev server with hot module replacement), \`npm run build\` (type-check plus production build into \`dist/\`) and \`npm run preview\`.
- Where router and store files land when those features are selected (\`src/router/index.ts\`, \`src/stores/\`, \`src/views/\`).

**Clarifying questions expected:**
- "Do we need routing, a store or tests from day one, or start minimal?"
- "TypeScript or plain JavaScript, and is server-side rendering (Nuxt) a requirement?"

**Code / implementation expected:** Yes. The scaffolding command, the generated \`main.ts\`, and a first \`App.vue\`.`,
    answer: `**Target Audience:** Beginners who have never set up a frontend project. Assumes Node.js is installed and you can type commands in a terminal; no Vue, Vite or build-tool knowledge needed.
**Difficulty:** Easy

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts with the vocabulary an interviewer expects. Nothing below is from memory: the project was generated by running create-vue 3.24.0 non-interactively in a sandbox, then installed, type-checked, built with Vite 8.3.4 and started on a dev server. The file listings and terminal output are copied from those runs.

## 1. Why This Even Matters — A Story First

Building a web app from nothing is like moving into an empty flat. Before you can cook a single meal you need the electricity connected, a fridge, a cooker, cupboards, and some idea of where the cutlery goes. None of that is the meal, but without it you cannot cook.

A Vue app needs the same groundwork: a server that shows your page while you work, a tool that turns <code>.vue</code> files into JavaScript a browser understands, TypeScript settings, a place for images, and a way to produce small, fast files for production.

**create-vue** is the moving company that sets all of that up in about a second. You answer a few questions (do you want a router? tests?), and you get a furnished flat with everything plugged in. Interviewers ask this question to check that you know what each piece of furniture is for, so that when something breaks you know which cupboard to open.

## 2. The Core Idea

📌 **Interview term: create-vue** — the official project scaffolding tool for Vue. You run it with <code>npm create vue@latest</code> (npm turns <code>create vue</code> into the package <code>create-vue</code>). It generates a project built on Vite. Version 3.24.0 was used here.

📌 **Interview term: Scaffolding** — generating the starting files and folders of a project from a template, so you do not write configuration by hand.

📌 **Interview term: Vite** — the build tool and development server create-vue uses (version 8.3.4 here). In development it serves your source files as native ES modules and updates the page instantly when you save; for production it bundles and minifies everything into <code>dist/</code>.

📌 **Interview term: Hot Module Replacement (HMR)** — when you save a file during development, only that module is swapped in the running page, usually keeping component state, instead of reloading the whole page.

📌 **Interview term: Vue CLI** — the older, webpack-based scaffolder (<code>@vue/cli</code>, last version 5.0.9). Its own documentation says it is in maintenance mode and recommends create-vue for new projects (source: <a href="https://github.com/vuejs/vue-cli" target="_blank" rel="noopener noreferrer">vuejs/vue-cli README</a>). Mentioning <code>vue create</code> as the way to start in 2026 is a red flag.

## 3. Creating the Project

The interactive form, <code>npm create vue@latest</code>, asks for a project name and then a checklist of features. Every prompt also has a command-line flag, which is how the projects for this doc were generated without a keyboard. Running <code>npm create vue@latest -- --help</code> on 3.24.0 lists them: <code>--default</code>, <code>--ts</code>, <code>--jsx</code>, <code>--router</code>, <code>--pinia</code>, <code>--vitest</code>, <code>--cypress</code>, <code>--playwright</code>, <code>--eslint</code>, <code>--prettier</code>, <code>--oxfmt</code>, <code>--vue-rc</code> (use the 3.6 release candidate), <code>--tsgo</code>, and the options <code>--bare</code> and <code>--force</code>.

The real output of the non-interactive run:

\`\`\`
T  Vue.js - The Progressive JavaScript Framework

Scaffolding project in .../scaffold/my-vue-app...
|
—  Done. Now run:

   cd my-vue-app
   npm install
   npm run dev
\`\`\`

One surprise worth knowing: on create-vue 3.24.0, <code>--default</code> **includes TypeScript**. The generated project had <code>src/main.ts</code> and <code>vite.config.ts</code>, and the tool source confirms it: <code>return Boolean(argv.default || argv.ts || argv.typescript || argv.tsgo || promptedNeedsTypeScript)</code>. Passing other flags without <code>--ts</code> (for example only <code>--eslint</code>, or <code>--bare --router</code>) produced a JavaScript project with <code>main.js</code> and <code>jsconfig.json</code>.

## 4. How the App Boots

<svg class="iq-diagram" width="100%" viewBox="0 0 700 250" role="img" aria-label="Boot order of a create-vue project: index.html loads src/main.ts, which creates the app from App.vue and mounts it into the div with id app">
  <defs>
    <marker id="vq2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="40" width="190" height="70" rx="10"/>
  <text class="d-text" x="115" y="68" text-anchor="middle">index.html</text>
  <text class="d-sub" x="115" y="90" text-anchor="middle">div id app + module script</text>
  <rect class="d-box-accent" x="255" y="40" width="190" height="70" rx="10"/>
  <text class="d-text d-accent" x="350" y="68" text-anchor="middle">src/main.ts</text>
  <text class="d-sub" x="350" y="90" text-anchor="middle">createApp(App).mount</text>
  <rect class="d-box" x="490" y="40" width="190" height="70" rx="10"/>
  <text class="d-text" x="585" y="68" text-anchor="middle">src/App.vue</text>
  <text class="d-sub" x="585" y="90" text-anchor="middle">root component</text>
  <rect class="d-box-muted" x="490" y="165" width="190" height="60" rx="10"/>
  <text class="d-text" x="585" y="200" text-anchor="middle">src/components</text>
  <rect class="d-box-muted" x="255" y="165" width="190" height="60" rx="10"/>
  <text class="d-text" x="350" y="190" text-anchor="middle">src/assets</text>
  <text class="d-sub" x="350" y="210" text-anchor="middle">main.css, logo.svg</text>
  <path class="d-edge-accent" d="M 214 75 L 250 75" marker-end="url(#vq2-arrow)"/>
  <path class="d-edge-accent" d="M 449 75 L 485 75" marker-end="url(#vq2-arrow)"/>
  <path class="d-edge" d="M 585 114 L 585 160" marker-end="url(#vq2-arrow)"/>
  <path class="d-edge-dashed" d="M 350 114 L 350 160" marker-end="url(#vq2-arrow)"/>
</svg>

The browser loads <code>index.html</code> first; it is the real entry point, not a template hidden in a folder. Its <code>&lt;script type="module" src="/src/main.ts"&gt;</code> tag loads <code>main.ts</code>, which imports the global CSS, creates the app from the root component and mounts it into <code>&lt;div id="app"&gt;</code>. From there, <code>App.vue</code> renders child components.

## 5. Every Generated File, Explained

This is the full file list of <code>--default</code> (before <code>npm install</code>), with what each file does:

| Path | What it is for |
| :--- | :--- |
| <code>index.html</code> | The page Vite serves. Holds <code>&lt;div id="app"&gt;</code> and the module script tag for <code>/src/main.ts</code> |
| <code>src/main.ts</code> | Entry module: <code>createApp(App).mount('#app')</code>; register plugins here with <code>app.use()</code> |
| <code>src/App.vue</code> | Root [Single File Component](/interview-question/what-is-a-single-file-component-sfc) |
| <code>src/components/</code> | <code>HelloWorld.vue</code>, <code>TheWelcome.vue</code>, <code>WelcomeItem.vue</code> and <code>icons/</code> with five icon components: the starter page you will delete |
| <code>src/assets/</code> | <code>base.css</code>, <code>main.css</code>, <code>logo.svg</code>; files imported from code, processed and hashed by Vite |
| <code>public/favicon.ico</code> | Files copied to <code>dist/</code> untouched and served from the site root |
| <code>vite.config.ts</code> | Vite config: <code>@vitejs/plugin-vue</code> (compiles <code>.vue</code> files), <code>vite-plugin-vue-devtools</code>, and the <code>@</code> alias for <code>./src</code> |
| <code>package.json</code> | Dependencies and the <code>dev</code>, <code>build</code>, <code>preview</code>, <code>build-only</code>, <code>type-check</code> scripts |
| <code>tsconfig.json</code> | Only references the two configs below |
| <code>tsconfig.app.json</code> | TypeScript settings for browser code in <code>src/</code>, extending <code>@vue/tsconfig</code>, with the <code>@/*</code> path |
| <code>tsconfig.node.json</code> | TypeScript settings for config files that run in Node (<code>vite.config.*</code>, <code>vitest.config.*</code> and so on) |
| <code>env.d.ts</code> | One line: <code>/// &lt;reference types="vite/client" /&gt;</code>, so TypeScript understands <code>import.meta.env</code> and asset imports |
| <code>.vscode/</code> | Recommends the <code>Vue.volar</code> extension (Vue - Official) |
| <code>.gitignore</code>, <code>README.md</code> | Ignores <code>node_modules</code>, <code>dist</code> and logs; setup notes |

📌 **Interview term: Root component** — the component passed to <code>createApp()</code>. Every other component is rendered somewhere inside it.

📌 **Interview term: Path alias** — the <code>@</code> in <code>import Foo from '@/components/Foo.vue'</code>. It is defined twice on purpose: in <code>vite.config.ts</code> so the bundler resolves it, and in <code>tsconfig.app.json</code> so the type checker does.

**What extra features add.** Generating with <code>--ts --router --pinia --vitest --eslint</code> added exactly these on top: <code>src/router/index.ts</code>, <code>src/views/HomeView.vue</code> and <code>AboutView.vue</code>, <code>src/stores/counter.ts</code>, <code>src/components/__tests__/HelloWorld.spec.ts</code>, <code>vitest.config.ts</code>, <code>tsconfig.vitest.json</code>, <code>eslint.config.ts</code>, <code>.oxlintrc.json</code>, <code>.editorconfig</code> and <code>.gitattributes</code>. Its <code>main.ts</code> adds <code>app.use(createPinia())</code> and <code>app.use(router)</code>, and the about route is already lazy-loaded with <code>component: () =&gt; import('../views/AboutView.vue')</code>. See [setting up Vue Router](/interview-question/how-do-you-set-up-vue-router-routes-routerlink-routerview-history-modes), [Pinia](/interview-question/what-is-pinia-and-why-use-it) and [testing with Vitest](/interview-question/how-do-you-test-vue-components-vitest-and-vue-test-utils).

## 6. Verified: Install, Build, Run

The generated <code>package.json</code> pins ranges such as <code>"vue": "^3.5.42"</code>, <code>"vite": "^8.2.2"</code> and <code>"vue-tsc": "^3.3.11"</code>, and declares <code>"engines": { "node": "^22.18.0 || &gt;=24.12.0" }</code>. <code>npm install</code> resolved them to vue 3.5.44, vite 8.3.4 and @vitejs/plugin-vue 6.0.10. Then <code>npm run build</code>:

\`\`\`
> my-vue-app@0.0.0 build
> run-p type-check "build-only {@}" --

> my-vue-app@0.0.0 type-check
> vue-tsc --build

vite v8.3.4 building client environment for production...
✓ 27 modules transformed.
dist/index.html                  0.42 kB │ gzip:  0.28 kB
dist/assets/index-CyVfN59t.css   3.56 kB │ gzip:  1.16 kB
dist/assets/index-BjrqleB5.js   73.19 kB │ gzip: 28.33 kB
✓ built in 489ms
\`\`\`

📌 **Interview term: Type-check step** — <code>vite build</code> on its own only strips types; it never reports a type error. That is why the <code>build</code> script runs <code>vue-tsc --build</code> in parallel (<code>run-p</code>). To prove it, the starter <code>&lt;HelloWorld msg="You did it!" /&gt;</code> was changed to pass a number, and <code>vue-tsc</code> failed with:

\`\`\`
src/App.vue(11,20): error TS2322: Type 'number' is not assignable to type 'string'.
\`\`\`

Starting <code>npx vite --port 5100</code> printed:

\`\`\`
  VITE v8.3.4  ready in 747 ms

  ➜  Local:   http://localhost:5100/
  ➜  Network: use --host to expose
  ➜  Vue DevTools: Open http://localhost:5100/__devtools__/ as a separate window
\`\`\`

Fetching <code>/src/App.vue</code> from that dev server returned JavaScript, not the <code>.vue</code> source: Vite compiles each SFC on request and injects an HMR client (<code>import.meta.hot = __vite__createHotContext("/src/App.vue")</code>). The runnable example is a first replacement for the starter <code>App.vue</code>; it was mounted with the verifier and also dropped into the generated project, where <code>vite build</code> succeeded (65.63 kB JS, 25.87 kB gzipped). The verifier run, after typing a step and submitting:

\`\`\`
[app] RENDERED: My first Vue 3.5.44 appAddRun npm installRun npm run dev
after add: My first Vue 3.5.44 appAddRun npm installRun npm run devRun npm run build
\`\`\`

## 7. create-vue vs Vue CLI vs Nuxt

| | create-vue | Vue CLI | Nuxt |
| :--- | :--- | :--- | :--- |
| Command | <code>npm create vue@latest</code> | <code>vue create</code> | <code>npm create nuxt@latest</code> |
| Build tool | Vite | webpack | Vite (via Nuxt) |
| Status | Official, recommended | Maintenance mode | Separate meta-framework |
| Output | Client-side SPA | Client-side SPA | SSR, static or hybrid app with file-based routing |
| Pick it when | Most new Vue apps | Never for new projects | You need SSR, SEO or server routes; see [Nuxt](/interview-question/what-is-nuxt-and-how-does-it-relate-to-vue) |

The Nuxt command and its features were not run for this doc; check the Nuxt docs before quoting them.

## 8. Common Pitfalls

- **Opening <code>dist/index.html</code> by double-clicking it.** The built page loads <code>/assets/index-....js</code> as a module script with an absolute path. Opened from <code>file://</code> in Chromium 141 here, <code>#app</code> stayed empty and the console said the script "has been blocked by CORS policy". Use <code>npm run preview</code> or a real server.
- **Assuming <code>vite build</code> catches type errors.** It does not; only <code>vue-tsc</code> does, which is why <code>npm run build</code> runs both. A CI step that calls <code>build-only</code> ships type errors.
- **Putting imported images in <code>public/</code>.** Files in <code>public/</code> are copied as-is with no hash, so browsers may cache stale versions. Import assets from <code>src/assets</code> so Vite fingerprints them.
- **Configuring the <code>@</code> alias in only one place.** Tried here: with <code>paths</code> removed from <code>tsconfig.app.json</code>, <code>vite build</code> still succeeded, but <code>vue-tsc</code> failed with <code>error TS2307: Cannot find module '@/components/HelloWorld.vue' or its corresponding type declarations.</code>
- **Using an unsupported Node version.** The generated <code>engines</code> field asks for Node <code>^22.18.0 || &gt;=24.12.0</code>; older versions can fail in confusing ways.
- **Keeping the starter components.** <code>HelloWorld</code>, <code>TheWelcome</code> and the icon components are demo code; delete them early so they do not end up in production.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The command:</strong> <span style="color:#f0e2c8;">"I run <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">npm create vue@latest</code>, the official create-vue scaffolder. It generates a Vite project and asks whether I want TypeScript, Vue Router, Pinia, Vitest, an end-to-end tool and ESLint."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The entry chain:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">index.html</code> is the real entry; its module script loads <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">src/main.ts</code>, which calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">createApp(App).mount('#app')</code> and is where plugins are registered with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">app.use</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The folders:</strong> <span style="color:#f0e2c8;">"Components live in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">src/components</code>, imported assets in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">src/assets</code> so Vite hashes them, untouched static files in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">public</code>, and router and store files in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">src/router</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">src/stores</code> if selected."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The config:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vite.config.ts</code> adds the Vue plugin and the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@</code> alias; the tsconfig files split browser code from Node config files, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">env.d.ts</code> adds Vite types."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The scripts:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">npm run dev</code> starts Vite with hot module replacement, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">npm run build</code> runs <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vue-tsc</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vite build</code> into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dist</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">npm run preview</code> serves that build. Vue CLI is in maintenance mode, so I would not use it."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">index.html</code> in the project root and not in <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">public</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because Vite treats it as the entry point of the module graph. It parses the HTML, follows the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;script type="module"&gt;</code> tag into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">main.ts</code>, and rewrites the tags with hashed asset names at build time.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">src/assets</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">public</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Files in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">src/assets</code> are imported from code, so Vite processes them, fingerprints the file name and can inline small ones. Files in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">public</code> are copied as-is and referenced by absolute path, for things like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">favicon.ico</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">robots.txt</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the build run <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">vue-tsc</code> separately?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Vite and esbuild only remove types for speed; they never type-check. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vue-tsc</code> understands <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.vue</code> files and is the only step that fails on a type error, so the build script runs it in parallel with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vite build</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where would you register Pinia and the router?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">src/main.ts</code>, between <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">createApp(App)</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mount</code>: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">app.use(createPinia())</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">app.use(router)</code>. That is exactly what create-vue generates when both features are selected.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you choose Nuxt instead of create-vue?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the app needs server-side rendering or static generation for SEO and fast first paint, file-based routing, or server API routes. For a client-side app behind a login, create-vue is simpler.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **create-vue** | Official scaffolder, run with <code>npm create vue@latest</code> |
| **Scaffolding** | Generating a project skeleton from a template |
| **Vite** | Dev server and production bundler used by create-vue |
| **HMR** | Swapping a changed module into the running page without a full reload |
| **Vue CLI** | Older webpack-based scaffolder, in maintenance mode |
| **Root component** | The component passed to <code>createApp()</code>, usually <code>App.vue</code> |
| **Path alias** | <code>@</code> as a shortcut for <code>src/</code>, set in Vite and tsconfig |
| **Type-check step** | <code>vue-tsc</code>, the only part of the build that reports type errors |

---
**Conclusion:** A new Vue 3 app starts with <code>npm create vue@latest</code>, which runs create-vue and produces a Vite project; Vue CLI is in maintenance mode. As verified on create-vue 3.24.0, the result boots from <code>index.html</code> through <code>src/main.ts</code> (<code>createApp(App).mount('#app')</code>) into <code>App.vue</code>, keeps components in <code>src/components</code>, static files in <code>public</code>, and splits TypeScript config between browser and Node code, with <code>vue-tsc</code> as the only step that catches type errors. Knowing what each file does, and that router, store and test files appear only when you select them, is exactly what an interviewer is checking.`,
    examples: [
      {
        label: "Scaffold, run and build a Vue 3 project with create-vue",
        tech: "bash",
        runnable: false,
        code: `# Interactive: prompts for the project name and each optional feature
npm create vue@latest

# Non-interactive: flags skip the prompts (create-vue 3.24.0)
npm create vue@latest -- --default my-vue-app            # TypeScript, no extras
npm create vue@latest -- --ts --router --pinia --vitest --eslint my-vue-ts
npm create vue@latest -- --bare --router my-bare          # no starter components

cd my-vue-app
npm install        # install dependencies into node_modules
npm run dev        # Vite dev server with hot module replacement
npm run build      # vue-tsc type-check + vite build into dist/
npm run preview    # serve dist/ locally to check the production build
`,
      },
      {
        label: "src/main.ts and vite.config.ts as create-vue 3.24.0 generates them (file-name comments added)",
        tech: "ts",
        runnable: false,
        code: `// ── src/main.ts ──────────────────────────────────────────
import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')

// ── vite.config.ts ───────────────────────────────────────
import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
`,
      },
      {
        label: "A first replacement for the starter src/App.vue",
        tech: "vue",
        runnable: true,
        code: `<!-- src/App.vue: a first replacement for the scaffolded starter page. -->
<!-- main.ts mounts this component with createApp(App).mount("#app"). -->
<script setup>
import { ref, version } from "vue";

const tasks = ref(["Run npm install", "Run npm run dev"]);
const draft = ref("");

function add() {
  if (draft.value.trim()) tasks.value.push(draft.value.trim());
  draft.value = "";
}
</script>

<template>
  <header>
    <h1>My first Vue {{ version }} app</h1>
  </header>
  <main>
    <form @submit.prevent="add">
      <input v-model="draft" placeholder="Next step" />
      <button>Add</button>
    </form>
    <ul>
      <li v-for="task in tasks" :key="task">{{ task }}</li>
    </ul>
  </main>
</template>

<style scoped>
header { border-bottom: 1px solid #ddd; }
</style>
`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is Vue template syntax (interpolation, directives, expressions)?",
    seoDescription:
      "Vue template syntax: {{ }} interpolation that escapes HTML, directives like v-bind and v-on, and single JavaScript expressions, with real compiler errors.",
    description: `**Question presented to candidate:**
"Look at a Vue template for the first time: double curly braces, attributes starting with \`v-\`, colons and at-signs. Explain what Vue template syntax is and what you are allowed to write inside it."

**What a strong answer should cover:**
- Templates are **valid HTML extended with Vue syntax**, and are **compiled** into JavaScript render functions, not interpreted at runtime as strings.
- **Text interpolation** \`{{ expr }}\` puts a value into text and **always escapes HTML**; raw HTML needs \`v-html\`.
- **Directives** are \`v-\` attributes with the anatomy \`v-name:argument.modifier="value"\`; shorthands \`:\` for \`v-bind\`, \`@\` for \`v-on\`, \`#\` for \`v-slot\`; dynamic arguments \`:[name]\`; the Vue 3.4 same-name shorthand \`:id\`.
- Bindings accept **one JavaScript expression**: arithmetic, ternaries, method calls, template literals. Statements like \`let\`, \`if\` or \`for\` are compile errors.
- Expressions see the component's state plus a **restricted allowlist of globals** (such as \`Math\` and \`Date\`), not \`window\`.
- Mustaches do not work inside HTML attributes; use \`v-bind\` instead.

**Clarifying questions expected:**
- "Should I cover only the template side, or also how it compiles to a render function?"

**Code / implementation expected:** Optional. A short template showing interpolation, a bound attribute and an event, and ideally one compile error.`,
    answer: `**Target Audience:** Beginners who know basic HTML and JavaScript and are reading Vue templates for the first time.
**Difficulty:** Easy

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts with the precise vocabulary. Every rendered output, compiled render function, warning and error message below was produced by running the code on Vue 3.5.44 (<code>@vue/compiler-dom</code> for compiler output, the repo verifier for mounted components).

## 1. Why This Even Matters — A Story First

Think of a printed wedding invitation template from a stationery shop: "Dear ________, you are invited to ________ on ________." The shop prints the fixed words once. The blanks are filled in per guest. Some invitations have extra instructions in the margin: "only print the dinner section if the guest is staying for dinner", "print one line per child".

A Vue template is that invitation. The fixed HTML is the printed text. The <code>{{ }}</code> blanks are filled from your data. The margin instructions are **directives**: attributes starting with <code>v-</code> that say "show this only if", "repeat this for each", "when clicked, do that".

The difference from paper is that Vue keeps the invitation live. Change the guest name in your data and the printed name changes on screen, instantly. Interviewers ask about template syntax because it is the first thing you write in every component, and the rules about what you may put in the blanks trip up a lot of beginners.

## 2. The Core Idea

📌 **Interview term: Template** — the HTML part of a component, written in a <code>&lt;template&gt;</code> block of a [Single File Component](/interview-question/what-is-a-single-file-component-sfc) or in a <code>template</code> option. It is valid HTML plus Vue-specific syntax.

📌 **Interview term: Text interpolation** — the "mustache" syntax <code>{{ expression }}</code>. Vue evaluates the expression and inserts the result as **text**. HTML inside the value is escaped, so <code>&lt;b&gt;</code> shows up literally and never becomes a tag.

📌 **Interview term: Directive** — a special attribute with the <code>v-</code> prefix that applies reactive behaviour to an element, such as <code>v-if</code>, <code>v-for</code>, <code>v-bind</code>, <code>v-on</code> and <code>v-model</code>. The full catalogue is in [Vue directives](/interview-question/what-are-vue-directives-give-common-examples).

📌 **Interview term: Template expression** — the JavaScript you put inside <code>{{ }}</code> or a directive value. It must be **one expression**: something that produces a value, such as <code>count * 2</code>, <code>ok ? "yes" : "no"</code> or <code>format(date)</code>.

📌 **Interview term: Render function** — the JavaScript function a template compiles into. Vue never interprets your template string at runtime in a built app; the compiler turns it into code that creates [virtual DOM](/interview-question/how-does-vue-s-virtual-dom-diff-keyed-lists) nodes.

## 3. The Anatomy of a Directive

<svg class="iq-diagram" width="100%" viewBox="0 0 700 220" role="img" aria-label="The parts of v-on:submit.prevent equals onSubmit: directive name, argument, modifier and value">
  <rect class="d-box-accent" x="30" y="30" width="140" height="56" rx="10"/>
  <text class="d-text d-accent" x="100" y="64" text-anchor="middle">v-on</text>
  <rect class="d-box" x="200" y="30" width="140" height="56" rx="10"/>
  <text class="d-text" x="270" y="64" text-anchor="middle">:submit</text>
  <rect class="d-box" x="370" y="30" width="140" height="56" rx="10"/>
  <text class="d-text" x="440" y="64" text-anchor="middle">.prevent</text>
  <rect class="d-box-muted" x="540" y="30" width="140" height="56" rx="10"/>
  <text class="d-text" x="610" y="64" text-anchor="middle">="onSubmit"</text>
  <text class="d-text" x="100" y="128" text-anchor="middle">name</text>
  <text class="d-sub" x="100" y="152" text-anchor="middle">which directive</text>
  <text class="d-text" x="270" y="128" text-anchor="middle">argument</text>
  <text class="d-sub" x="270" y="152" text-anchor="middle">which event or attr</text>
  <text class="d-text" x="440" y="128" text-anchor="middle">modifier</text>
  <text class="d-sub" x="440" y="152" text-anchor="middle">special behaviour</text>
  <text class="d-text" x="610" y="128" text-anchor="middle">value</text>
  <text class="d-sub" x="610" y="152" text-anchor="middle">a JS expression</text>
  <path class="d-edge-dashed" d="M 100 90 L 100 108"/>
  <path class="d-edge-dashed" d="M 270 90 L 270 108"/>
  <path class="d-edge-dashed" d="M 440 90 L 440 108"/>
  <path class="d-edge-dashed" d="M 610 90 L 610 108"/>
</svg>

Not every directive uses every part: <code>v-if="ok"</code> has only a name and a value, <code>v-else</code> has only a name. The same attribute can be written with shorthands, so <code>v-on:submit.prevent="onSubmit"</code> and <code>@submit.prevent="onSubmit"</code> are identical.

| Long form | Shorthand | Meaning |
| :--- | :--- | :--- |
| <code>v-bind:href="url"</code> | <code>:href="url"</code> | Bind an attribute or prop to an expression |
| <code>v-bind:id="id"</code> | <code>:id</code> (Vue 3.4+) | Same-name shorthand: bind to the variable of the same name |
| <code>v-bind:[attr]="value"</code> | <code>:[attr]="value"</code> | Dynamic argument: the attribute name itself comes from data |
| <code>v-on:click="go"</code> | <code>@click="go"</code> | Listen to an event; see [event handling](/interview-question/how-do-you-handle-events-in-vue-v-on-and-event-modifiers) |
| <code>v-slot:header</code> | <code>#header</code> | Provide a named slot; see [slots](/interview-question/what-are-slots-in-vue) |

📌 **Interview term: Dynamic argument** — square brackets around the argument, <code>:[attrName]</code> or <code>@[eventName]</code>, make the attribute or event name itself reactive. Details in [dynamic arguments and v-bind shorthand](/interview-question/what-are-dynamic-arguments-and-v-bind-shorthand).

## 4. Verified: Interpolation, Expressions and Bindings

The runnable example uses every piece above. Mounted with <code>createApp(App).mount("#app")</code> in jsdom, a driver printed each element's HTML, clicked the button once and printed it again:

\`\`\`
t1 html : Hello, Ada. Bio: &lt;b&gt;bold?&lt;/b&gt;
t2 text : 6 | many | ADA! | 10
t3 attrs: <a class="t3" href="https://vuejs.org" title="Go to https://vuejs.org">docs</a>
t4      : <button class="t4">Add (3)</button>
t4 after: <button class="t4">Add (4)</button>
t5      : <section class="t5" id="profile">section</section>
t6      : <span class="t6" title="{{ name }}">literal</span>
\`\`\`

What each line proves:

- **t1**: <code>{{ bio }}</code> holding <code>&lt;b&gt;bold?&lt;/b&gt;</code> was escaped to <code>&amp;lt;b&amp;gt;</code>. Interpolation is always text. Rendering real HTML needs <code>v-html</code>, which has [serious XSS risks](/interview-question/what-is-v-html-and-what-is-the-risk-of-using-it).
- **t2**: arithmetic, a ternary, a method call and <code>Math.max</code> all work inside <code>{{ }}</code>.
- **t3**: <code>:href</code> bound the URL and the dynamic argument <code>:[attrName]</code> with <code>attrName = "title"</code> produced a <code>title</code> attribute.
- **t4**: <code>:disabled="isBusy"</code> with <code>false</code> removed the attribute completely; <code>@click="count++"</code> updated the label.
- **t5**: the same-name shorthand <code>:id</code> became <code>id="profile"</code>.
- **t6**: <code>title="{{ name }}"</code> stayed literal. Mustaches only work in text, never inside attributes.

## 5. Verified: How v-bind Treats Special Values

A second component bound <code>false</code>, <code>null</code>, <code>undefined</code>, an empty string and <code>0</code> to different attributes:

\`\`\`
<button class="a">a</button>                                  :disabled="false"  :title="null"
<button class="b" disabled="">b</button>                      :disabled="''"     :title="undefined"
<button class="c" disabled="" title="0">c</button>            :disabled="true"   :title="0"
<p class="d" data-x="false" aria-hidden="false">d</p>         :data-x="false"    :aria-hidden="false"
\`\`\`

(The bindings on the right were added for readability; the left side is the real output.) The rules: <code>null</code> and <code>undefined</code> remove any attribute; for a **boolean attribute** such as <code>disabled</code>, <code>false</code> removes it and an empty string keeps it; for ordinary attributes such as <code>data-*</code> and <code>aria-*</code>, <code>false</code> is written as the string <code>"false"</code>. That last one surprises people who expect <code>:aria-hidden="false"</code> to drop the attribute.

## 6. Verified: What You Cannot Write in an Expression

Each template below was passed to <code>compile()</code> from <code>@vue/compiler-dom</code> with errors turned into exceptions:

\`\`\`
<p>{{ let x = 1 }}</p>                 -> Error parsing JavaScript expression: Unexpected token, expected "," (1:5)
<p>{{ if (ok) { return 1 } }}</p>      -> Error parsing JavaScript expression: Unexpected token (1:1)
<p>{{ name </p>                        -> Interpolation end sign was not found.
\`\`\`

So: expressions yes, statements no. Put multi-step logic in a function or a [computed property](/interview-question/what-is-the-difference-between-computed-and-watch) and call it from the template.

📌 **Interview term: Globals allowlist** — template expressions run against the component instance, not the global scope. Compiling <code>{{ count * 2 }} {{ Math.max(a, 1) }} {{ window }}</code> produced:

\`\`\`js
_toDisplayString(_ctx.count * 2) + " " + _toDisplayString(Math.max(_ctx.a, 1)) + " " + _toDisplayString(_ctx.window)
\`\`\`

<code>Math</code> is left alone because it is on Vue's allowlist of safe globals, but <code>window</code> was rewritten to <code>_ctx.window</code>, a property of the component. Mounting <code>{{ typeof window }}</code> printed <code>undefined</code> and logged:

\`\`\`
[Vue warn]: Property "window" was accessed during render but is not defined on instance.
\`\`\`

To use something like <code>window.innerWidth</code>, read it in <code>&lt;script setup&gt;</code> and expose a variable, or register it with [global properties](/interview-question/how-do-you-add-global-properties-or-config).

## 7. How a Template Becomes JavaScript

The compiler output above also shows the bigger picture. Your template is turned into a render function once, at build time with Vite, or in the browser when you use the full build from a CDN. Static text is joined into strings, and every expression becomes a plain JavaScript expression with component state prefixed by <code>_ctx.</code> (or read directly from <code>&lt;script setup&gt;</code> bindings). The compiler can also see which parts can never change and mark them, which is what [Vue compiler optimisations](/interview-question/how-does-the-vue-compiler-optimize-templates-static-hoisting-patch-flags-block-t) are about. If you prefer to write that function by hand, Vue supports render functions and JSX, but templates are the default.

| | Template | Render function / JSX |
| :--- | :--- | :--- |
| Looks like | HTML | JavaScript |
| Compiler optimisations | Yes, automatic | Mostly not |
| Logic | Expressions only | Any JavaScript |
| Good for | Almost all components | Highly dynamic, programmatic output |

## 8. Common Pitfalls

- **Writing mustaches in attributes.** <code>title="{{ name }}"</code> renders literally, as verified above. Use <code>:title="name"</code>.
- **Putting statements in a template.** <code>{{ let x = 1 }}</code> or an <code>if</code> block is a compile error. Use a ternary, or move the logic into a function or computed.
- **Expecting <code>:aria-hidden="false"</code> to remove the attribute.** Only boolean attributes drop on <code>false</code>; others become the string <code>"false"</code>. Bind <code>null</code> to remove one.
- **Reaching for globals.** <code>window</code>, <code>document</code> and your own globals are not visible in templates; you get <code>undefined</code> and a warning.
- **Calling expensive functions in interpolation.** <code>{{ sortedList() }}</code> runs on every re-render of the component. Use <code>computed</code>, which caches until its inputs change.
- **Upper-case dynamic arguments in in-DOM templates.** Browsers lower-case attribute names in HTML written directly in the page, so <code>:[someAttr]</code> becomes <code>:[someattr]</code>. Reproduced in jsdom with the CDN build and an in-page template <code>&lt;a :[someAttr]="url"&gt;</code>: the HTML parser stored it as <code>:[someattr]</code>, Vue looked up a <code>someattr</code> property that does not exist, and the link rendered as <code>&lt;a&gt;link&lt;/a&gt;</code> with no <code>href</code>. SFC templates are not affected.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What it is:</strong> <span style="color:#f0e2c8;">"A Vue template is valid HTML extended with Vue syntax, and it is compiled into a JavaScript render function rather than interpreted as a string."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Interpolation:</strong> <span style="color:#f0e2c8;">"Double curly braces insert the value of an expression as text, and the value is always HTML-escaped; raw HTML needs <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-html</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Directives:</strong> <span style="color:#f0e2c8;">"Attributes prefixed with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-</code> add behaviour, with the shape name, argument, modifiers and value, as in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-on:submit.prevent</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@</code> are the shorthands for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-bind</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-on</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Expressions:</strong> <span style="color:#f0e2c8;">"Any binding takes a single JavaScript expression, such as a ternary or a method call, but not statements like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">if</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">let</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Scope:</strong> <span style="color:#f0e2c8;">"Expressions see the component state and a small allowlist of globals like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math</code>, not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">window</code>, and mustaches do not work inside attributes, so you bind with a colon."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can you not use an <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">if</code> statement inside the braces?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each binding is compiled into a JavaScript expression inside the render function, so a statement is a syntax error at compile time. Use a ternary, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-if</code>, or move the logic into a computed property.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">title="{{ name }}"</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Nothing reactive: the attribute is rendered literally as the text with braces. Interpolation only works in text content; for attributes use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:title="name"</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is a dynamic argument?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Square brackets make the argument itself an expression, such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:[attrName]="value"</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@[eventName]="handler"</code>. The value should be a string, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> removes the binding.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is it safe to call a method in a template?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is allowed, but the method runs on every re-render of the component. For derived data use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code>, which caches the result until its reactive inputs change.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is this different from JSX?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Templates are HTML-based and limited to expressions, which lets Vue analyse them and add optimisations such as static hoisting and patch flags. JSX is plain JavaScript with full flexibility but fewer compile-time optimisations; Vue supports both.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Template** | HTML plus Vue syntax describing a component UI |
| **Text interpolation** | <code>{{ expr }}</code>: insert a value as escaped text |
| **Directive** | A <code>v-</code> attribute that adds reactive behaviour |
| **Argument** | The part after the colon, such as <code>click</code> in <code>v-on:click</code> |
| **Modifier** | A dot suffix such as <code>.prevent</code> that changes behaviour |
| **Dynamic argument** | <code>:[name]</code>: the attribute or event name comes from data |
| **Template expression** | One JavaScript expression inside a binding |
| **Globals allowlist** | The few globals (like <code>Math</code>, <code>Date</code>) templates may use |
| **Render function** | The JavaScript a template compiles into |

---
**Conclusion:** Vue template syntax is HTML plus three ideas: <code>{{ }}</code> interpolation that always inserts escaped text, <code>v-</code> directives with a name, argument, modifiers and value (shorthands <code>:</code>, <code>@</code> and <code>#</code>), and single JavaScript expressions evaluated against the component rather than the global scope. Running it on Vue 3.5.44 showed each rule in action: HTML escaped, <code>false</code> removing boolean attributes, mustaches ignored in attributes, statements rejected by the compiler and <code>window</code> rewritten to an undefined component property. Templates are compiled into render functions, which is what lets Vue optimise them.`,
    examples: [
      {
        label: "Interpolation, expressions, v-bind, v-on, dynamic arguments and same-name shorthand",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { ref } from "vue";

const name = ref("Ada");
const bio = ref("<b>bold?</b>");
const count = ref(3);
const isBusy = ref(false);
const linkUrl = ref("https://vuejs.org");
const attrName = ref("title");
const id = ref("profile");

function shout(text) {
  return text.toUpperCase() + "!";
}
</script>

<template>
  <!-- 1. Interpolation: text, always HTML-escaped -->
  <p class="t1">Hello, {{ name }}. Bio: {{ bio }}</p>

  <!-- 2. Any single JavaScript expression works inside {{ }} -->
  <p class="t2">{{ count * 2 }} | {{ count > 2 ? "many" : "few" }} | {{ shout(name) }} | {{ Math.max(count, 10) }}</p>

  <!-- 3. Directives: v-bind (:) for attributes, v-on (@) for events -->
  <a class="t3" :href="linkUrl" :[attrName]="'Go to ' + linkUrl">docs</a>
  <button class="t4" :disabled="isBusy" @click="count++">Add ({{ count }})</button>

  <!-- 4. Same-name shorthand (Vue 3.4+): :id means :id="id" -->
  <section class="t5" :id>section</section>

  <!-- 5. Mustaches do NOT work inside attributes -->
  <span class="t6" title="{{ name }}">literal</span>
</template>
`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is a Single File Component (SFC)?",
    seoDescription:
      "A Vue Single File Component is a .vue file with template, script and style blocks. See the real JS and scoped CSS @vue/compiler-sfc produces from one.",
    description: `**Question presented to candidate:**
"Most Vue projects are full of \`.vue\` files. What is a Single File Component, what goes in it, and what actually happens to that file before it reaches the browser?"

**What a strong answer should cover:**
- An SFC is a **\`.vue\` file containing one component**: a \`<template>\` block, a \`<script>\` and/or \`<script setup>\` block, and zero or more \`<style>\` blocks; custom blocks are allowed too.
- It **colocates** markup, logic and styles by component (separation of concerns by feature, not by file type).
- Browsers cannot run \`.vue\` files: a build plugin (\`@vitejs/plugin-vue\`, using \`@vue/compiler-sfc\`) **compiles** it into a JavaScript module whose template is a render function, and CSS.
- \`<script setup>\` is compile-time sugar: top-level bindings are exposed to the template, and \`defineProps\` / \`defineEmits\` are compiler macros.
- \`<style scoped>\` works by adding a \`data-v-xxxx\` attribute to elements and rewriting selectors; \`<style module>\` gives CSS modules; \`lang="ts"\` and \`lang="scss"\` select preprocessors.
- Benefits: syntax highlighting and type checking in the editor, hot module replacement, scoped CSS, and compile-time template optimisations.

**Clarifying questions expected:**
- "Do you want the file format, or what the compiler turns it into?"

**Code / implementation expected:** Yes. A small SFC, ideally with what it compiles into.`,
    answer: `**Target Audience:** Beginners who have seen <code>.vue</code> files but do not know what is inside one or what happens to it. Basic HTML, CSS and JavaScript assumed.
**Difficulty:** Easy

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. The compiled JavaScript and CSS in sections 5 and 6 are the real, unedited output of <code>@vue/compiler-sfc</code> 3.5.44, the same compiler <code>@vitejs/plugin-vue</code> calls during a Vite build. The runnable example was mounted with the repo verifier.

## 1. Why This Even Matters — A Story First

Picture a cookbook where each recipe is split across three different books. The ingredient list is in the blue book, the method is in the red book, and the photo of the finished dish is in the green book. To make one cake you open all three, find the right page in each, and hope nobody renumbered a page in one book without updating the others.

That is how many websites used to be organised: all the HTML in one place, all the JavaScript in another, all the CSS in a third. Changing one button meant editing three files and hoping no other button shared the same CSS class.

A **Single File Component** is a recipe card. Ingredients, method and photo are on the same card, for one dish. Delete the card and the whole recipe is gone, with nothing left behind in the other books. In Vue, that card is a <code>.vue</code> file.

## 2. The Core Idea

📌 **Interview term: Single File Component (SFC)** — a file with the <code>.vue</code> extension that holds one Vue component, written as HTML-like blocks: <code>&lt;template&gt;</code> for markup, <code>&lt;script&gt;</code> or <code>&lt;script setup&gt;</code> for logic, and <code>&lt;style&gt;</code> for CSS.

📌 **Interview term: Colocation** — keeping the pieces that change together in one place. SFCs split code by **feature** (this button, this card) instead of by **file type** (all HTML, all CSS). That is still separation of concerns, just along a more useful line.

📌 **Interview term: <code>&lt;script setup&gt;</code>** — compile-time syntax for the Composition API. Every top-level variable, function and import is usable in the template, and <code>defineProps</code> / <code>defineEmits</code> are **compiler macros** that need no import. See [defineProps and defineEmits](/interview-question/how-do-defineprops-and-defineemits-work-in-script-setup).

📌 **Interview term: <code>@vue/compiler-sfc</code>** — the package that parses a <code>.vue</code> file into blocks and compiles each one. Build plugins such as <code>@vitejs/plugin-vue</code> call it; you never ship it to the browser.

## 3. What Is Inside a .vue File

| Block | How many | Purpose | Useful attributes |
| :--- | :--- | :--- | :--- |
| <code>&lt;template&gt;</code> | At most one | The markup, in [Vue template syntax](/interview-question/what-is-vue-template-syntax-interpolation-directives-expressions) | <code>lang="pug"</code> (rare) |
| <code>&lt;script setup&gt;</code> | At most one | Composition API logic, compiled into <code>setup()</code> | <code>lang="ts"</code>, <code>generic="T"</code> |
| <code>&lt;script&gt;</code> | At most one | Classic export, or options that <code>&lt;script setup&gt;</code> cannot express | <code>lang="ts"</code> |
| <code>&lt;style&gt;</code> | Any number | CSS for the component | <code>scoped</code>, <code>module</code>, <code>lang="scss"</code> |
| Custom blocks | Any number | Tool-specific data, such as <code>&lt;i18n&gt;</code> | Handled by plugins, ignored otherwise |

All of that was checked by parsing a file with one of each. <code>parse()</code> reported:

\`\`\`
errors: 0
script: ts | scriptSetup: ts | template: true
styles: scss scoped, css module
customBlocks: <i18n lang=json>
two templates -> Single file component can contain only one <template> element
\`\`\`

The last line came from a second file with two <code>&lt;template&gt;</code> blocks, which is a parse error.

## 4. From .vue File to Browser

<svg class="iq-diagram" width="100%" viewBox="0 0 700 270" role="img" aria-label="A dot vue file is parsed into blocks, the script and template become one JavaScript module and the style becomes scoped CSS">
  <defs>
    <marker id="vq4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="20" y="95" width="150" height="70" rx="10"/>
  <text class="d-text d-accent" x="95" y="125" text-anchor="middle">Greeting.vue</text>
  <text class="d-sub" x="95" y="147" text-anchor="middle">one component</text>
  <rect class="d-box" x="230" y="95" width="160" height="70" rx="10"/>
  <text class="d-text" x="310" y="125" text-anchor="middle">compiler-sfc</text>
  <text class="d-sub" x="310" y="147" text-anchor="middle">parse into blocks</text>
  <rect class="d-box" x="460" y="20" width="220" height="70" rx="10"/>
  <text class="d-text" x="570" y="50" text-anchor="middle">JS module</text>
  <text class="d-sub" x="570" y="72" text-anchor="middle">setup + render function</text>
  <rect class="d-box" x="460" y="175" width="220" height="70" rx="10"/>
  <text class="d-text" x="570" y="205" text-anchor="middle">CSS</text>
  <text class="d-sub" x="570" y="227" text-anchor="middle">selectors get data-v-id</text>
  <path class="d-edge-accent" d="M 174 130 L 225 130" marker-end="url(#vq4-arrow)"/>
  <path class="d-edge-accent" d="M 394 120 L 455 60" marker-end="url(#vq4-arrow)"/>
  <path class="d-edge-accent" d="M 394 140 L 455 205" marker-end="url(#vq4-arrow)"/>
</svg>

A browser has no idea what a <code>.vue</code> file is. The build plugin parses it, compiles <code>&lt;script setup&gt;</code> and <code>&lt;template&gt;</code> together into one ordinary JavaScript module, and turns each <code>&lt;style&gt;</code> block into CSS that Vite bundles. In development, the Vite dev server does the same per request: fetching <code>/src/App.vue</code> from a running dev server returns JavaScript, not the original file.

## 5. Verified: The Real Compiled Output

This is the input, <code>Greeting.vue</code>:

\`\`\`vue
<script setup>
import { ref } from "vue";
const props = defineProps({ name: String });
const count = ref(0);
</script>

<template>
  <h2 class="title">Hello, {{ props.name }}</h2>
  <button @click="count++">Clicked {{ count }} times</button>
</template>

<style scoped>
.title { color: seagreen; }
</style>
\`\`\`

Compiled with <code>compileScript(descriptor, { id, inlineTemplate: true, isProd: true })</code>, the production mode Vite uses for <code>vite build</code>:

\`\`\`js
import { toDisplayString as _toDisplayString, createElementVNode as _createElementVNode, Fragment as _Fragment, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

const _hoisted_1 = { class: "title" }

import { ref } from "vue";

export default {
  __name: 'Greeting',
  props: { name: String },
  setup(__props) {

const props = __props;
const count = ref(0);

return (_ctx, _cache) => {
  return (_openBlock(), _createElementBlock(_Fragment, null, [
    _createElementVNode("h2", _hoisted_1, "Hello, " + _toDisplayString(props.name), 1 /* TEXT */),
    _createElementVNode("button", {
      onClick: _cache[0] || (_cache[0] = $event => (count.value++))
    }, "Clicked " + _toDisplayString(count.value) + " times", 1 /* TEXT */)
  ], 64 /* STABLE_FRAGMENT */))
}
}

}
\`\`\`

What to notice, because interviewers love it:

- **<code>defineProps</code> disappeared.** It became the <code>props: { name: String }</code> option. It is a compiler macro, not a runtime function.
- **The template became a render function** returned from <code>setup()</code>, so it reads <code>count.value</code> directly; that is why you do not write <code>.value</code> in templates.
- **The file name became <code>__name: 'Greeting'</code>**, which DevTools and warnings use.
- **Optimisation hints** are already there: the static <code>{ class: "title" }</code> object is hoisted out of the render function, the click handler is cached in <code>_cache[0]</code>, and <code>1 /* TEXT */</code> tells the runtime only the text can change. These are the [patch flags and hoisting](/interview-question/how-does-the-vue-compiler-optimize-templates-static-hoisting-patch-flags-block-t) that make SFCs faster than runtime-compiled templates.
- **Two root elements are fine.** The template compiled into a <code>Fragment</code>; Vue 2 required exactly one root.

## 6. Verified: How Scoped CSS Works

📌 **Interview term: Scoped styles** — <code>&lt;style scoped&gt;</code> CSS applies only to elements of this component. Compiling the style block with <code>compileStyle({ ..., id: "data-v-7a7a37b1", scoped: true })</code> produced:

\`\`\`css
.title[data-v-7a7a37b1] { color: seagreen;
}
\`\`\`

The selector now also requires an attribute. At runtime every element this component renders carries that attribute, so a <code>.title</code> in another component does not match. In a real <code>vite build</code> of the create-vue starter, the minified bundle attaches a <code>__scopeId</code> such as <code>data-v-244e519f</code> to each scoped component, and the CSS file contains rules such as <code>.logo[data-v-440c393a]</code>.

Where does the attribute land? A server render of a parent with <code>__scopeId: "data-v-parent"</code> that renders its own <code>&lt;p&gt;</code> and a child component produced:

\`\`\`html
<div data-v-parent><p data-v-parent>own</p><section data-v-parent><span>inner</span></section></div>
\`\`\`

The parent elements and the **root** element of the child (<code>section</code>) get the attribute; the child inner <code>span</code> does not. Deeper rules, such as styling a child component or <code>v-html</code> content with <code>:deep()</code>, are covered in [scoped styles](/interview-question/what-are-scoped-styles-in-vue).

📌 **Interview term: CSS modules** — <code>&lt;style module&gt;</code> generates unique class names and exposes them as <code>$style</code> in the template, an alternative to the attribute approach.

## 7. Verified: The Runnable Example

The runnable example is a complete SFC with all three blocks. Mounted in jsdom, then a driver typed "Grace" into the input and clicked once:

\`\`\`
[app] RENDERED: Hello, AdaClicked 0 times
after typing + 1 click: Hello, GraceClicked 1 time
\`\`\`

The verifier drops styles, so the scoped colour was checked separately through the compiler output above, not in a browser.

## 8. SFC vs the Alternatives

| | SFC (<code>.vue</code>) | Object with <code>template</code> string | Render function / JSX |
| :--- | :--- | :--- | :--- |
| Needs a build step | Yes | No (needs the full build with compiler) | JSX yes, plain <code>h()</code> no |
| Template compiled | At build time | In the browser at runtime | Not applicable |
| Scoped CSS | Built in | No | No |
| Editor support and type checking | Excellent (Vue - Official extension, <code>vue-tsc</code>) | Weak, it is a string | Good |
| Typical use | Almost every app | Prototypes, CDN pages | Libraries, highly dynamic UI |

## 9. Common Pitfalls

- **Thinking the browser runs <code>.vue</code> files.** It never does. Running <code>vite build</code> on a project whose config omits <code>@vitejs/plugin-vue</code> failed with <code>[PARSE_ERROR] Unexpected JSX expression</code>: without the plugin, Vite tries to read the <code>.vue</code> file as JavaScript.
- **Importing <code>defineProps</code> from "vue".** It is a compiler macro available only inside <code>&lt;script setup&gt;</code>; the compiler removes it.
- **Expecting <code>&lt;style scoped&gt;</code> to reach child components or <code>v-html</code> content.** The attribute is only on elements this component renders. Use <code>:deep()</code>.
- **Mixing up the two script blocks.** <code>&lt;script setup&gt;</code> runs once per component instance; a normal <code>&lt;script&gt;</code> runs once when the module is imported. Rendering three copies of one component printed <code>normal &lt;script&gt; ran, modules = 1</code> once and <code>&lt;script setup&gt; ran for one instance</code> three times, so module-level state in the normal block is shared by every instance. Component options can usually go in [defineOptions()](/interview-question/what-do-defineoptions-and-defineslots-do-in-script-setup) instead.
- **Using two <code>&lt;template&gt;</code> blocks.** That is a parse error, as shown above. Split it into components instead.
- **Huge SFCs.** Colocation is a benefit until a file passes several hundred lines; extract child components and [composables](/interview-question/what-are-composables-in-vue).

## 10. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">"A Single File Component is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.vue</code> file that holds one component: a template block, a script or script setup block, and any number of style blocks."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why:</strong> <span style="color:#f0e2c8;">"It colocates the markup, logic and styles that change together, so a component is self-contained and can be deleted or moved as a unit."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Build step:</strong> <span style="color:#f0e2c8;">"Browsers cannot run <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.vue</code> files; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@vitejs/plugin-vue</code> uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@vue/compiler-sfc</code> to compile the script and template into one JavaScript module and the styles into CSS."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Script setup:</strong> <span style="color:#f0e2c8;">"With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;script setup&gt;</code> the top-level bindings are exposed to the template and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineProps</code> is a compiler macro; in the output it simply becomes the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">props</code> option."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Scoped CSS:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;style scoped&gt;</code> rewrites selectors like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.title</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.title[data-v-xxxx]</code> and stamps that attribute on the component elements, so styles do not leak."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does the template compile into?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A render function returned from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setup()</code>. It creates virtual nodes with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">createElementVNode</code>, hoists static props out of the function, caches event handlers and adds patch flags such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1 /* TEXT */</code> so the runtime knows what can change.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a component use both <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&lt;script&gt;</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&lt;script setup&gt;</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. The normal block runs once when the module is first imported and is used for named exports or module-level setup; the script setup block runs once per component instance. Options such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">name</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inheritAttrs</code> can usually be set with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineOptions</code> instead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do scoped styles reach a child component?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only partly: the child root element gets the parent attribute, but nothing inside the child does. To style deeper elements you wrap the selector in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:deep()</code>, which moves the attribute selector to the parent part of the rule.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is an SFC required to use Vue?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. You can use an object with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">template</code> string and the full build from a CDN, or write render functions. SFCs are the recommended default because of tooling, scoped CSS and build-time template compilation.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is a custom block?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Any extra top-level block, such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;i18n&gt;</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;docs&gt;</code>. The parser exposes it in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">descriptor.customBlocks</code>, and a plugin decides what to do with it; without a plugin it is ignored.</span>
</div>

</div>

## 11. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **SFC** | A <code>.vue</code> file holding one component |
| **Colocation** | Keeping markup, logic and styles for one feature together |
| **<code>&lt;script setup&gt;</code>** | Compile-time Composition API syntax; top-level bindings reach the template |
| **Compiler macro** | A function like <code>defineProps</code> that the compiler replaces, never called at runtime |
| **@vue/compiler-sfc** | The package that parses and compiles <code>.vue</code> files |
| **Scoped styles** | CSS limited to this component via a <code>data-v-xxxx</code> attribute |
| **CSS modules** | <code>&lt;style module&gt;</code>: unique class names exposed as <code>$style</code> |
| **Custom block** | A non-standard block such as <code>&lt;i18n&gt;</code>, handled by a plugin |

---
**Conclusion:** A Single File Component is a <code>.vue</code> file that colocates one component's template, script and styles. It is not something a browser understands: <code>@vue/compiler-sfc</code>, called by the Vite plugin, turns it into a plain JavaScript module plus CSS. Running that compiler on Vue 3.5.44 showed exactly what happens: <code>defineProps</code> becomes a <code>props</code> option, the template becomes a render function with hoisted static parts and patch flags, and scoped CSS selectors gain a <code>data-v-</code> attribute. That build step is what buys SFCs their editor support, scoped styles and compile-time optimisations.`,
    examples: [
      {
        label: "A complete SFC: script setup, template and scoped style",
        tech: "vue",
        runnable: true,
        code: `<!-- One file, three blocks: logic, markup and styles for one component. -->
<script setup>
import { ref, computed } from "vue";

// Top-level bindings in <script setup> are usable directly in the template.
const name = ref("Ada");
const count = ref(0);
const label = computed(() => (count.value === 1 ? "time" : "times"));
</script>

<template>
  <h2 class="title">Hello, {{ name }}</h2>
  <input v-model="name" />
  <button @click="count++">Clicked {{ count }} {{ label }}</button>
</template>

<style scoped>
/* scoped: compiled to .title[data-v-xxxx], so it cannot leak to other components */
.title {
  color: seagreen;
}
</style>
`,
      },
      {
        label: "Compile an SFC yourself with @vue/compiler-sfc (what @vitejs/plugin-vue does)",
        tech: "js",
        runnable: false,
        code: `import { readFileSync } from "fs";
import { parse, compileScript, compileStyle } from "@vue/compiler-sfc";
const src = readFileSync("Greeting.vue", "utf8");
const { descriptor } = parse(src, { filename: "Greeting.vue" });
console.log("BLOCKS:", Object.entries({ template: descriptor.template, scriptSetup: descriptor.scriptSetup, script: descriptor.script }).map(([k, v]) => \`\${k}=\${v ? "yes" : "no"}\`).join(" "), "styles=" + descriptor.styles.length, "scoped=" + descriptor.styles[0].scoped);
const id = "7a7a37b1";
const script = compileScript(descriptor, { id, inlineTemplate: true, isProd: true });
console.log("----- SCRIPT (production, template inlined) -----\\n" + script.content);
const style = compileStyle({ source: descriptor.styles[0].content, filename: "Greeting.vue", id: "data-v-" + id, scoped: true });
console.log("----- STYLE -----\\n" + style.code.trim());
`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are Vue directives? Give common examples.",
    seoDescription:
      "Vue directives are v- attributes such as v-if, v-for, v-bind, v-on, v-model and v-show. Common examples, a custom directive, and what each compiles to.",
    description: `**Question presented to candidate:**
"Vue templates are full of attributes that start with \`v-\`. What is a directive, which ones do you use every day, and can you write your own?"

**What a strong answer should cover:**
- A **directive** is a special \`v-\` attribute that applies reactive behaviour to the DOM when its value changes; anatomy \`v-name:arg.modifiers="expression"\`.
- The everyday built-ins: \`v-if\` / \`v-else-if\` / \`v-else\`, \`v-show\`, \`v-for\` (with \`:key\`), \`v-bind\` (\`:\`), \`v-on\` (\`@\`), \`v-model\`, plus \`v-slot\` (\`#\`), \`v-text\`, \`v-html\`, \`v-pre\`, \`v-once\`, \`v-memo\` and \`v-cloak\`.
- Most built-ins are **compiled away** into plain JavaScript (\`v-if\` becomes a ternary, \`v-for\` a \`renderList\` call, \`v-on\` an \`onClick\` prop); \`v-model\`, \`v-show\` and custom directives stay as **runtime directives** applied with \`withDirectives\`.
- **Custom directives** are objects with lifecycle hooks (\`created\`, \`mounted\`, \`updated\`, \`beforeUnmount\`, \`unmounted\` and so on) that receive the element and a \`binding\` (\`value\`, \`arg\`, \`modifiers\`); in \`<script setup>\` any \`vXxx\` variable becomes \`v-xxx\`.
- Use a custom directive for low-level DOM access (focus, tooltips, intersection observers); prefer components or composables for anything else.

**Clarifying questions expected:**
- "Should I focus on the built-ins, or on writing a custom one?"

**Code / implementation expected:** Optional. A template using the common directives; a custom directive is a plus.`,
    answer: `**Target Audience:** Beginners who can read a basic Vue template and want to understand every <code>v-</code> attribute they see. Basic HTML and JavaScript assumed.
**Difficulty:** Easy

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. The rendered output, the compiled render function and the warnings below come from compiling and mounting the example on Vue 3.5.44, not from memory.

## 1. Why This Even Matters — A Story First

Imagine a theatre script. Most of it is dialogue, but in the margins the director has written stage directions: "lights up only if the king is on stage", "repeat this chorus for each verse", "when the bell rings, everyone exits", "keep the curtain half open". The actors do not read those notes aloud. The notes tell the crew how to behave as the play goes on.

In a Vue template, the HTML is the dialogue and the **directives** are the stage directions. <code>v-if</code> says "only show this when...", <code>v-for</code> says "repeat this for each...", <code>@click</code> says "when this is clicked, do...". They are written as attributes, but they never reach the browser as attributes; Vue reads them and acts on them, and keeps acting every time the data changes.

Interviewers ask this because directives are the vocabulary of every Vue template. Knowing the common ones, what they cost, and when to write your own is a fast signal of real experience.

## 2. The Core Idea

📌 **Interview term: Directive** — a special attribute prefixed with <code>v-</code> whose job is to apply reactive behaviour to the DOM when the value of its expression changes. Shape: <code>v-name:argument.modifier="expression"</code>. Each part is explained in [template syntax](/interview-question/what-is-vue-template-syntax-interpolation-directives-expressions).

📌 **Interview term: Shorthand** — <code>:</code> for <code>v-bind</code>, <code>@</code> for <code>v-on</code>, <code>#</code> for <code>v-slot</code>. <code>:href="url"</code> is exactly <code>v-bind:href="url"</code>.

📌 **Interview term: Custom directive** — your own <code>v-something</code>, defined as an object of lifecycle hooks that receive the real DOM element. It is for **low-level DOM work** only. See [creating a custom directive](/interview-question/how-do-you-create-a-custom-directive-in-vue).

## 3. The Built-in Directives

| Directive | What it does | Example | Deep dive |
| :--- | :--- | :--- | :--- |
| <code>v-if</code> / <code>v-else-if</code> / <code>v-else</code> | Adds or removes the element | <code>v-if="loggedIn"</code> | [v-if vs v-show](/interview-question/what-is-the-difference-between-v-if-and-v-show) |
| <code>v-show</code> | Toggles CSS <code>display: none</code>; element stays | <code>v-show="open"</code> | same |
| <code>v-for</code> | Repeats an element for each item | <code>v-for="item in items" :key="item.id"</code> | [v-for](/interview-question/how-do-you-render-lists-with-v-for) |
| <code>v-bind</code> (<code>:</code>) | Binds an attribute, class, style or prop | <code>:class="{ active: isActive }"</code> | [class and style](/interview-question/how-do-you-bind-classes-and-styles-dynamically) |
| <code>v-on</code> (<code>@</code>) | Listens to events, with modifiers | <code>@submit.prevent="save"</code> | [events](/interview-question/how-do-you-handle-events-in-vue-v-on-and-event-modifiers) |
| <code>v-model</code> | Two-way binding for inputs and components | <code>v-model="email"</code> | [v-model on inputs](/interview-question/how-does-v-model-work-on-form-inputs) |
| <code>v-slot</code> (<code>#</code>) | Provides content for a named or scoped slot | <code>#header</code> | [slots](/interview-question/what-are-slots-in-vue) |
| <code>v-text</code> | Sets <code>textContent</code> | <code>v-text="msg"</code> | |
| <code>v-html</code> | Sets <code>innerHTML</code> (XSS risk) | <code>v-html="trusted"</code> | [v-html risk](/interview-question/what-is-v-html-and-what-is-the-risk-of-using-it) |
| <code>v-pre</code> | Skips compilation of the element and its children | <code>v-pre</code> | |
| <code>v-once</code> / <code>v-memo</code> | Render once / re-render only when listed values change | <code>v-memo="[id, selected]"</code> | [v-once and v-memo](/interview-question/what-are-v-once-and-v-memo) |
| <code>v-cloak</code> | Attribute removed on mount; hide raw <code>{{ }}</code> with CSS until then | <code>[v-cloak] { display: none }</code> | |

## 4. Verified: The Common Directives in One Template

The runnable example uses most of the table plus a custom <code>v-highlight</code> directive. Mounted in jsdom; then a driver typed "kiwi", clicked Finish and Help:

\`\`\`
v-highlight mounted: {"arg":"background","value":"yellow","modifiers":{"bold":true}}
[app] RENDERED: Loading...1. apples2. pearsYou typed: FinishHelpHelp text{{ this stays literal }}highlighted
help style    : "display: none;"
after actions : Loaded1. apples2. pearsYou typed: kiwiFinishHelpHelp text{{ this stays literal }}highlighted
help style    : "" aria-expanded = true
hl style      : background: yellow; font-weight: bold;
\`\`\`

Reading it line by line: the custom directive received its argument, value and modifiers in <code>binding</code> before the first render finished; <code>v-if</code> showed "Loading..." and switched to "Loaded" after the click; <code>v-for</code> numbered the fruit; <code>v-model</code> plus <code>v-text</code> echoed "kiwi"; <code>v-show</code> kept the help paragraph in the DOM but with <code>display: none</code> until clicked; <code>v-pre</code> left <code>{{ this stays literal }}</code> untouched; and <code>:aria-expanded</code> followed the state.

Two smaller checks on the same version: a paragraph with <code>v-once</code> still said "first value: 1" after two clicks while its neighbour said "live value: 3"; and <code>&lt;p v-text="a"&gt;child&lt;/p&gt;</code> is a compile error: <code>v-text will override element children.</code>

## 5. Most Directives Disappear at Compile Time

<svg class="iq-diagram" width="100%" viewBox="0 0 700 260" role="img" aria-label="Structural directives compile into plain JavaScript while v-model, v-show and custom directives stay as runtime directives">
  <rect class="d-box-muted" x="20" y="20" width="310" height="220" rx="12"/>
  <text class="d-text" x="175" y="50" text-anchor="middle">Compiled away</text>
  <rect class="d-box" x="45" y="70" width="260" height="34" rx="8"/>
  <text class="d-sub" x="175" y="92" text-anchor="middle">v-if becomes a ternary</text>
  <rect class="d-box" x="45" y="118" width="260" height="34" rx="8"/>
  <text class="d-sub" x="175" y="140" text-anchor="middle">v-for becomes renderList</text>
  <rect class="d-box" x="45" y="166" width="260" height="34" rx="8"/>
  <text class="d-sub" x="175" y="188" text-anchor="middle">v-on and v-bind become props</text>
  <rect class="d-box-muted" x="370" y="20" width="310" height="220" rx="12"/>
  <text class="d-text" x="525" y="50" text-anchor="middle">Runtime directives</text>
  <rect class="d-box-accent" x="395" y="70" width="260" height="34" rx="8"/>
  <text class="d-sub" x="525" y="92" text-anchor="middle">v-model: vModelText</text>
  <rect class="d-box-accent" x="395" y="118" width="260" height="34" rx="8"/>
  <text class="d-sub" x="525" y="140" text-anchor="middle">v-show: vShow</text>
  <rect class="d-box-accent" x="395" y="166" width="260" height="34" rx="8"/>
  <text class="d-sub" x="525" y="188" text-anchor="middle">custom: your hooks object</text>
</svg>

This is visible in the real compiled render function of the example (excerpt, comments removed from the template first):

\`\`\`js
(status.value === 'loading')
  ? (_openBlock(), _createElementBlock("p", _hoisted_1, "Loading..."))
  : (status.value === 'error')
    ? (_openBlock(), _createElementBlock("p", _hoisted_2, "Something broke"))
    : (_openBlock(), _createElementBlock("p", _hoisted_3, "Loaded")),
...
_renderList(items.value, (item, i) => { ... }), 128 /* KEYED_FRAGMENT */))
...
_withDirectives(_createElementVNode("input", {
  "onUpdate:modelValue": _cache[0] || (_cache[0] = $event => ((query).value = $event)),
  placeholder: "Search"
}, null, 512 /* NEED_PATCH */), [
  [_vModelText, query.value]
]),
...
_createElementVNode("button", {
  onClick: _cache[2] || (_cache[2] = $event => (showHelp.value = !showHelp.value)),
  "aria-expanded": showHelp.value
}, "Help", 8 /* PROPS */, _hoisted_5),
_withDirectives(_createElementVNode("p", _hoisted_6, "Help text", 512 /* NEED_PATCH */), [
  [_vShow, showHelp.value]
]),
_cache[4] || (_cache[4] = _createElementVNode("code", null, "{{ this stays literal }}", -1 /* CACHED */)),
_withDirectives(..., [
  [ vHighlight, 'yellow', "background", { bold: true } ]
])
\`\`\`

📌 **Interview term: Runtime directive** — a directive that survives compilation as an object with hooks, attached to a vnode with <code>withDirectives(vnode, [[directive, value, arg, modifiers]])</code>. <code>v-model</code> on a text input becomes <code>vModelText</code>, <code>v-show</code> becomes <code>vShow</code>, and a custom directive is passed through as your own object with its value, argument and modifiers, exactly as the last entry shows.

The practical consequence: <code>v-if</code>, <code>v-for</code>, <code>v-on</code> and <code>v-bind</code> are not "things that run"; they are syntax for JavaScript you would otherwise write by hand in a render function. Runtime directives exist for behaviour that needs the actual DOM element, such as reading an input value or setting <code>style.display</code>.

## 6. Writing a Custom Directive

📌 **Interview term: Directive hooks** — the functions a directive object can define: <code>created</code>, <code>beforeMount</code>, <code>mounted</code>, <code>beforeUpdate</code>, <code>updated</code>, <code>beforeUnmount</code> and <code>unmounted</code>. Each receives <code>(el, binding, vnode, prevVnode)</code>, where <code>binding</code> holds <code>value</code>, <code>oldValue</code>, <code>arg</code>, <code>modifiers</code> and <code>instance</code>.

In <code>&lt;script setup&gt;</code>, any variable whose name starts with <code>v</code> followed by a capital letter is usable as a directive: <code>const vHighlight = { mounted(el, binding) { ... } }</code> becomes <code>v-highlight</code>. For app-wide use, register it with <code>app.directive("highlight", vHighlight)</code> in <code>main.ts</code>.

Forgetting to define or register it is not a compile error. A template with <code>v-focus</code> and no definition rendered fine and only warned:

\`\`\`
[Vue warn]: Failed to resolve directive: focus
\`\`\`

Good custom directives: autofocus, click-outside, lazy-loading images with <code>IntersectionObserver</code>, tooltips. Bad custom directives: anything that fetches data or holds state; that is a [composable](/interview-question/what-are-composables-in-vue) or a component.

## 7. Common Pitfalls

- **Putting <code>v-if</code> and <code>v-for</code> on the same element.** In Vue 3 <code>v-if</code> is evaluated first, so it cannot see the loop variable; filter with a computed instead. Demonstrated in [rendering lists with v-for](/interview-question/how-do-you-render-lists-with-v-for).
- **Using <code>v-show</code> on <code>&lt;template&gt;</code>.** It needs a real element to set <code>display</code> on; on a <code>&lt;template&gt;</code> it silently does nothing.
- **Using <code>v-html</code> with user input.** It inserts raw HTML and enables XSS. Interpolation is safe by default.
- **Writing a custom directive for what a component should do.** Directives cannot render content and are hard to test; reach for one only when you need the raw element.
- **Expecting a typo in a directive name to fail the build.** <code>v-fcous</code> compiles and only warns "Failed to resolve directive" at runtime.
- **Giving <code>v-text</code> or <code>v-html</code> children.** Both are compile errors, because the directive overwrites the children.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">"A directive is a special attribute prefixed with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-</code> that applies reactive behaviour to the DOM whenever the value of its expression changes."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Anatomy:</strong> <span style="color:#f0e2c8;">"It can have a name, an argument after a colon, modifiers after dots and an expression value, as in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-on:submit.prevent="save"</code>, with shorthands <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:</code> for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-bind</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@</code> for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-on</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">#</code> for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-slot</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Common examples:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-if</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-show</code> for conditions, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-for</code> with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:key</code> for lists, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-bind</code> for attributes, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-on</code> for events, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-model</code> for two-way form binding."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Under the hood:</strong> <span style="color:#f0e2c8;">"Most of them are compiled away: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-if</code> becomes a ternary and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-for</code> a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">renderList</code> call, while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-model</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-show</code> and custom directives stay as runtime directives applied with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">withDirectives</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Custom directives:</strong> <span style="color:#f0e2c8;">"I write one only for low-level DOM work like autofocus or click-outside: an object with hooks such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mounted</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">updated</code> that get the element and a binding with value, arg and modifiers."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">v-if</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">v-show</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-if</code> adds and removes the element, running component mount and unmount each time; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-show</code> renders it once and toggles <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">display: none</code>. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-show</code> for frequent toggles and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-if</code> when the content is often not needed at all.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">v-if</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">v-for</code> on the same element?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In Vue 3 <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-if</code> has higher priority, so it runs before the loop variable exists and throws on something like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">todo.done</code>. Filter the list in a computed property, or move <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-for</code> to a wrapping <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;template&gt;</code> and keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-if</code> on the inner element.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you register a custom directive globally?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">app.directive("focus", { mounted: (el) =&gt; el.focus() })</code> before mounting. Locally, in script setup, any variable named like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vFocus</code> is available as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-focus</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which hooks does a custom directive have?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">created</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">beforeMount</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mounted</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">beforeUpdate</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">updated</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">beforeUnmount</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unmounted</code>. Each receives the element, the binding, and the current and previous vnode.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you choose a component or composable instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Whenever there is state, rendering or logic beyond touching one element. Directives cannot render content, are harder to test and do not compose well; a composable or wrapper component usually reads better.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Directive** | A <code>v-</code> attribute that applies reactive behaviour to an element |
| **Shorthand** | <code>:</code>, <code>@</code> and <code>#</code> for <code>v-bind</code>, <code>v-on</code> and <code>v-slot</code> |
| **Argument** | The part after the colon, such as <code>click</code> in <code>@click</code> |
| **Modifier** | A dot suffix such as <code>.prevent</code> or <code>.trim</code> |
| **Runtime directive** | A directive applied with <code>withDirectives</code>, such as <code>vModelText</code>, <code>vShow</code> or a custom one |
| **Custom directive** | Your own directive object with lifecycle hooks for direct DOM access |
| **Directive hooks** | <code>created</code>, <code>mounted</code>, <code>updated</code>, <code>unmounted</code> and the rest |
| **binding** | The object with <code>value</code>, <code>oldValue</code>, <code>arg</code> and <code>modifiers</code> |

---
**Conclusion:** Directives are the <code>v-</code> attributes that make a Vue template reactive: <code>v-if</code> and <code>v-show</code> for conditions, <code>v-for</code> for lists, <code>v-bind</code> and <code>v-on</code> for attributes and events, <code>v-model</code> for forms, plus <code>v-slot</code>, <code>v-text</code>, <code>v-html</code>, <code>v-pre</code>, <code>v-once</code>, <code>v-memo</code> and <code>v-cloak</code>. Compiling the example on Vue 3.5.44 showed the key insight: most built-ins vanish into plain JavaScript, while <code>v-model</code>, <code>v-show</code> and custom directives remain as runtime objects with hooks that touch the real element. Write your own only when you genuinely need that element.`,
    examples: [
      {
        label: "Built-in directives side by side, plus a custom v-highlight directive",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { ref } from "vue";

const status = ref("loading");
const items = ref(["apples", "pears"]);
const query = ref("");
const showHelp = ref(false);

// A custom directive: any camelCase variable named vXxx becomes v-xxx in the template.
// Anatomy used below: v-highlight:background.bold="color"
//   name = highlight, argument = background, modifier = bold, value = color
const vHighlight = {
  mounted(el, binding) {
    el.style[binding.arg || "color"] = binding.value;
    if (binding.modifiers.bold) el.style.fontWeight = "bold";
    console.log("v-highlight mounted:", JSON.stringify({ arg: binding.arg, value: binding.value, modifiers: binding.modifiers }));
  },
};
</script>

<template>
  <!-- conditional rendering -->
  <p v-if="status === 'loading'" class="st">Loading...</p>
  <p v-else-if="status === 'error'" class="st">Something broke</p>
  <p v-else class="st">Loaded</p>

  <!-- list rendering -->
  <ul>
    <li v-for="(item, i) in items" :key="item">{{ i + 1 }}. {{ item }}</li>
  </ul>

  <!-- two-way binding + text -->
  <input v-model="query" placeholder="Search" />
  <p class="echo" v-text="'You typed: ' + query"></p>

  <!-- events and attribute binding -->
  <button @click="status = 'done'">Finish</button>
  <button @click="showHelp = !showHelp" :aria-expanded="showHelp">Help</button>
  <p v-show="showHelp" class="help">Help text</p>

  <!-- skip compilation entirely -->
  <code v-pre>{{ this stays literal }}</code>

  <!-- custom directive -->
  <span v-highlight:background.bold="'yellow'" class="hl">highlighted</span>
</template>
`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the difference between v-if and v-show?",
    seoDescription:
      "v-if adds and removes elements and components (mount, unmount, state reset); v-show only toggles display: none. Lifecycle and toggle cost verified on 3.5.",
    description: `**Question presented to candidate:**
"Both \`v-if\` and \`v-show\` hide things in a Vue template. What is actually different between them, and how do you decide which one to use?"

**What a strong answer should cover:**
- \`v-if\` is **real conditional rendering**: when false the element is not in the DOM (Vue leaves a \`<!--v-if-->\` comment placeholder), and a component inside is **unmounted**, losing its local state; when true it is created and mounted again.
- \`v-show\` always renders the element once and only toggles the inline style **\`display: none\`**; components stay mounted and keep their state.
- Cost trade-off: \`v-if\` has a **higher toggle cost** but no initial cost when false (lazy); \`v-show\` has a **higher initial cost** but cheap toggles.
- Rule of thumb: \`v-show\` for things toggled often (tabs, dropdowns, accordions); \`v-if\` for things rarely shown, or when content should not exist at all (permissions, unmet data).
- Only \`v-if\` supports \`v-else-if\` / \`v-else\` and works on \`<template>\`; \`v-show\` does neither.
- Neither is a security boundary on its own: \`v-show\` content is still in the DOM, so never use it to hide data the user must not see.

**Clarifying questions expected:**
- "How often does this toggle, and is the hidden part expensive to render?"
- "Does the hidden part hold state, such as a half-filled form, that must survive?"

**Code / implementation expected:** Optional. A small demo of the DOM and lifecycle difference is a strong answer.`,
    answer: `**Target Audience:** Beginners who have used <code>v-if</code> or <code>v-show</code> and want to know which to pick. Basic HTML and CSS assumed.
**Difficulty:** Easy

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. Every DOM snapshot, lifecycle log and timing below was produced by mounting the code on Vue 3.5.44 in jsdom. The timings are jsdom numbers, useful for comparing the two directives with each other, not as real-browser figures.

## 1. Why This Even Matters — A Story First

Imagine a shop with a seasonal display of umbrellas. There are two ways to deal with it when the sun comes out.

**Option one:** pack the whole display into boxes and carry it to the storeroom. The shop floor is empty and tidy. When it rains again, you carry the boxes out and build the display from scratch. Anything a customer had put aside on the display is gone.

**Option two:** throw a sheet over the display. It is still standing there, taking up the space, but nobody sees it. When it rains, you whip the sheet off in a second, and everything is exactly where it was.

<code>v-if</code> is option one: the element is genuinely removed and rebuilt. <code>v-show</code> is option two: the element stays and is just hidden with CSS. Neither is "better". Packing is expensive if the weather changes every five minutes; the sheet is wasteful if the umbrellas are needed twice a year.

## 2. The Core Idea

📌 **Interview term: Conditional rendering** — deciding whether part of the template exists at all. <code>v-if</code> (with optional <code>v-else-if</code> and <code>v-else</code>) does real conditional rendering: when the expression is falsy, Vue creates nothing for that branch.

📌 **Interview term: Conditional display** — the element is always rendered, and only its visibility changes. <code>v-show</code> sets the inline style <code>display: none</code> when falsy and removes it when truthy.

📌 **Interview term: Mount and unmount** — a component instance being created and inserted into the page (mount) or destroyed and removed (unmount), with the matching [lifecycle hooks](/interview-question/what-are-vue-lifecycle-hooks) <code>onMounted</code> and <code>onUnmounted</code>. <code>v-if</code> mounts and unmounts on every toggle; <code>v-show</code> mounts once.

📌 **Interview term: Lazy rendering** — doing no work until something is needed. <code>v-if</code> is lazy: if the condition starts false, the branch is never created. <code>v-show</code> is eager: it always renders.

## 3. What the DOM Looks Like When the Condition Is False

<svg class="iq-diagram" width="100%" viewBox="0 0 700 250" role="img" aria-label="With v-if false only a comment placeholder remains in the DOM, with v-show false the element stays with display none">
  <rect class="d-box-muted" x="20" y="20" width="310" height="210" rx="12"/>
  <text class="d-text" x="175" y="50" text-anchor="middle">v-if is false</text>
  <rect class="d-box" x="50" y="75" width="250" height="44" rx="8"/>
  <text class="d-sub" x="175" y="102" text-anchor="middle">comment placeholder only</text>
  <rect class="d-box-muted" x="50" y="145" width="250" height="56" rx="8"/>
  <text class="d-sub" x="175" y="169" text-anchor="middle">component unmounted</text>
  <text class="d-sub" x="175" y="189" text-anchor="middle">local state discarded</text>
  <rect class="d-box-muted" x="370" y="20" width="310" height="210" rx="12"/>
  <text class="d-text" x="525" y="50" text-anchor="middle">v-show is false</text>
  <rect class="d-box-accent" x="400" y="75" width="250" height="44" rx="8"/>
  <text class="d-sub" x="525" y="102" text-anchor="middle">element with display none</text>
  <rect class="d-box-accent" x="400" y="145" width="250" height="56" rx="8"/>
  <text class="d-sub" x="525" y="169" text-anchor="middle">component still mounted</text>
  <text class="d-sub" x="525" y="189" text-anchor="middle">local state kept</text>
</svg>

The left side is cheaper while hidden and more expensive to toggle. The right side costs memory and initial render time all the time, but toggling is a single style change.

## 4. Verified: Lifecycle and State

The runnable example renders the same child component twice, once under <code>v-if</code> and once under <code>v-show</code>, both bound to <code>open</code>. The child logs its own mount and unmount and counts its own clicks. A driver toggled, clicked both, and toggled twice more. The DOM column is <code>#app.innerHTML</code> without the toggle button:

\`\`\`
[with-v-show] mounted
start (open=false)    | DOM: <!--v-if--><button class="with-v-show" style="display: none;">with-v-show: 0 clicks</button>
[with-v-if] mounted
toggle -> open=true   | DOM: <button class="with-v-if">with-v-if: 0 clicks</button><button class="with-v-show" style="">with-v-show: 0 clicks</button>
click both panels     | DOM: <button class="with-v-if">with-v-if: 1 clicks</button><button class="with-v-show" style="">with-v-show: 1 clicks</button>
[with-v-if] unmounted
toggle -> open=false  | DOM: <!--v-if--><button class="with-v-show" style="display: none;">with-v-show: 1 clicks</button>
[with-v-if] mounted
toggle -> open=true   | DOM: <button class="with-v-if">with-v-if: 0 clicks</button><button class="with-v-show" style="">with-v-show: 1 clicks</button>
\`\`\`

Four facts, all visible above:

1. **At start, only the <code>v-show</code> child mounted.** <code>v-if</code> with a false condition is lazy and left only a <code>&lt;!--v-if--&gt;</code> comment as a placeholder.
2. **<code>v-show</code> hid the element with <code>style="display: none;"</code>**, and showing it again cleared the style.
3. **Every <code>v-if</code> toggle unmounted and remounted the child.** The log shows <code>unmounted</code> then <code>mounted</code> again.
4. **The <code>v-if</code> child lost its state** (back to "0 clicks") while the <code>v-show</code> child kept "1 clicks".

If you need <code>v-if</code> semantics but want to keep the state, wrap it in <code>&lt;KeepAlive&gt;</code>. Running the same driver with <code>&lt;KeepAlive&gt;&lt;Panel v-if="open" /&gt;&lt;/KeepAlive&gt;</code> printed no <code>unmounted</code> between toggles, and the button came back as "1 clicks". See [keep-alive](/interview-question/what-is-keep-alive-in-vue).

## 5. Verified: The Cost of Toggling

A component with two 300-row lists, one under <code>v-if</code> and one under <code>v-show</code>, both initially false. After 20 warm-up toggles, each list was toggled 400 times with <code>await nextTick()</code> after each change. Three runs in jsdom:

\`\`\`
initially false -> <li> in DOM: 300 (all from v-show)
v-if  : 400 toggles took 1178 ms        v-if  : 1011 ms        v-if  : 1211 ms
v-show: 400 toggles took 56 ms          v-show: 75 ms          v-show: 91 ms
\`\`\`

(The three runs were printed separately and are shown side by side here.) <code>v-show</code> toggled roughly 13 to 20 times faster, because it changes one style property instead of creating and destroying 300 elements. But the first line is the other half of the trade-off: while both were "hidden", the <code>v-show</code> list had already rendered all 300 <code>&lt;li&gt;</code> elements, and the <code>v-if</code> list had rendered none. Real browsers will give different absolute numbers; the direction of the difference is the point.

## 6. Side by Side

| | <code>v-if</code> | <code>v-show</code> |
| :--- | :--- | :--- |
| When false | Not in the DOM (comment placeholder) | In the DOM with <code>display: none</code> |
| Components inside | Unmounted; state lost | Stay mounted; state kept |
| Initial render when false | Free (lazy) | Full cost (eager) |
| Toggle cost | High: create and destroy | Low: one style change |
| <code>v-else-if</code> / <code>v-else</code> | Yes | No |
| Works on <code>&lt;template&gt;</code> | Yes | No (silently ignored) |
| Lifecycle hooks on toggle | <code>onMounted</code> / <code>onUnmounted</code> run | None |
| Best for | Rarely shown or permission-gated content | Tabs, dropdowns, accordions, frequent toggles |

📌 **Interview term: Toggle cost vs initial render cost** — the standard way to phrase the trade-off: <code>v-if</code> has higher toggle costs, <code>v-show</code> has higher initial render costs.

## 7. Edge Cases Worth Knowing

- **<code>v-show</code> restores your own display value.** An element with <code>style="display: flex"</code> and <code>v-show</code> rendered <code>display: none;</code> when false and <code>display: flex;</code> again when true.
- **<code>v-show</code> on <code>&lt;template&gt;</code> does nothing.** <code>&lt;template v-show="ok"&gt;&lt;span&gt;...&lt;/span&gt;&lt;/template&gt;</code> compiled without an error, yet the span was visible with no style while <code>ok</code> was false. A <code>&lt;template&gt;</code> renders no element to hide.
- **<code>v-else</code> cannot follow <code>v-show</code>.** <code>&lt;p v-show="a"&gt;x&lt;/p&gt;&lt;p v-else&gt;y&lt;/p&gt;</code> is a compile error: <code>v-else/v-else-if has no adjacent v-if or v-else-if.</code>
- **<code>v-show</code> on a multi-root component does not work.** With a component that renders two root paragraphs, <code>v-show="false"</code> left both visible (no <code>style</code> attribute) and Vue warned: <code>Runtime directive used on component with non-element root node. The directives will not function as intended.</code>
- **A CSS rule can fight <code>v-show</code>.** The directive sets an inline <code>display: none</code>, so a stylesheet rule with <code>display: block !important</code> on that element would win and keep it visible. This follows from CSS precedence and was not run here.

## 8. Common Pitfalls

- **Using <code>v-show</code> to hide sensitive data.** The content is still in the DOM and visible in DevTools or "view source" after render. Use <code>v-if</code>, and enforce permissions on the server.
- **Using <code>v-if</code> on a frequently toggled heavy panel.** Each toggle rebuilds it, as the 13 to 20 times slower toggles above show. Switch to <code>v-show</code> or <code>&lt;KeepAlive&gt;</code>.
- **Expecting state to survive a <code>v-if</code> toggle.** A half-filled form inside a <code>v-if</code> is reset when hidden. That surprises users.
- **Fetching data in <code>onMounted</code> of a <code>v-if</code> child that toggles often.** It refetches on every show. Either cache it, lift it to the parent, or use <code>v-show</code>.
- **Hiding with <code>v-show</code> something that cannot render yet.** <code>v-show</code> still renders its content, so <code>&lt;p v-show="user"&gt;{{ user.name }}&lt;/p&gt;</code> with <code>user</code> null threw <code>TypeError: Cannot read properties of null (reading 'name')</code>. Guard it with <code>v-if</code> until the data exists.
- **Putting <code>v-show</code> on a <code>&lt;template&gt;</code>.** It is silently ignored; use a real wrapper element or <code>v-if</code>.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The core difference:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-if</code> really adds and removes the element from the DOM, while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-show</code> always renders it and only toggles <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">display: none</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Components:</strong> <span style="color:#f0e2c8;">"Under <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-if</code> a component is unmounted when the condition turns false and remounted with fresh state when it turns true; under <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-show</code> it stays mounted and keeps its state."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The trade-off:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-if</code> has a higher toggle cost but is lazy, so it costs nothing if it starts false; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-show</code> has a higher initial cost but toggling is cheap."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. When to use which:</strong> <span style="color:#f0e2c8;">"I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-show</code> for things that toggle often, like tabs and dropdowns, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-if</code> for content that is rarely shown or must not exist, like admin-only sections."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Details:</strong> <span style="color:#f0e2c8;">"Only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-if</code> supports <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-else</code> and works on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;template&gt;</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-show</code> is never a security measure because the content is still in the DOM."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does Vue leave in the DOM when a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">v-if</code> is false?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A comment node, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;!--v-if--&gt;</code>, as an anchor. It marks where the branch goes, so Vue can insert the element in the right place when the condition becomes true.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you keep component state with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">v-if</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Wrap it in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;KeepAlive&gt;</code>. The instance is deactivated and cached instead of unmounted, so its state is back when it is shown again; it gets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onActivated</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onDeactivated</code> hooks instead of mount and unmount.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">v-if</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">v-show</code> together?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">You can, but it is rarely useful: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-if</code> decides whether the element exists, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-show</code> decides whether it is visible. Usually one of them is enough.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which one is better for performance?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It depends on the toggle frequency. In a jsdom benchmark of a 300-row list, 400 <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-show</code> toggles took about 56 to 91 ms against about 1 to 1.2 s for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-if</code>, but <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-show</code> had already rendered all rows while hidden.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">v-show</code> work on components?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, it sets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">display: none</code> on the component root element. On a multi-root component there is no single root, so nothing is hidden and Vue warns that the runtime directive will not function as intended; wrap it in an element or use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-if</code>.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Conditional rendering** | <code>v-if</code>: the element exists only when the condition is truthy |
| **Conditional display** | <code>v-show</code>: always rendered, hidden with <code>display: none</code> |
| **Comment placeholder** | <code>&lt;!--v-if--&gt;</code>, the marker Vue leaves where a false <code>v-if</code> branch would be |
| **Mount / unmount** | Creating and inserting, or destroying and removing, a component instance |
| **Lazy rendering** | Doing no work for content until it is needed |
| **Toggle cost** | The work done each time the condition flips |
| **KeepAlive** | Built-in component that caches instances instead of unmounting them |

---
**Conclusion:** <code>v-if</code> really adds and removes content: when false it leaves only a comment, unmounts components inside and discards their state, and does no work at all if the condition starts false. <code>v-show</code> renders once and toggles <code>display: none</code>, keeping components mounted and their state intact. Measured on Vue 3.5.44 in jsdom, <code>v-show</code> toggled a 300-row list 13 to 20 times faster, while <code>v-if</code> rendered nothing until needed. So: <code>v-show</code> for frequent toggles, <code>v-if</code> for rarely shown or must-not-exist content, and <code>&lt;KeepAlive&gt;</code> when you want <code>v-if</code> without losing state.`,
    examples: [
      {
        label: "Same child under v-if and v-show: lifecycle logs and whether local state survives",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { ref, defineComponent, h, onMounted, onUnmounted } from "vue";

// A child that reports its own lifecycle and keeps a little local state.
const Panel = defineComponent({
  props: { label: String },
  setup(props) {
    const clicks = ref(0);
    onMounted(() => console.log(\`[\${props.label}] mounted\`));
    onUnmounted(() => console.log(\`[\${props.label}] unmounted\`));
    return () =>
      h("button", { class: props.label, onClick: () => clicks.value++ }, \`\${props.label}: \${clicks.value} clicks\`);
  },
});

const open = ref(false);
</script>

<template>
  <button class="toggle" @click="open = !open">Toggle (open = {{ open }})</button>
  <Panel v-if="open" label="with-v-if" />
  <Panel v-show="open" label="with-v-show" />
</template>
`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you render lists with v-for?",
    seoDescription:
      "Render lists in Vue with v-for: arrays with index, objects, ranges, Maps, template v-for, :key, filtering with computed, and why v-if beside v-for throws.",
    description: `**Question presented to candidate:**
"We get an array of orders from an API and need to show them as a list, with only the open ones in a second list. How do you render lists in Vue with \`v-for\`, and what are the rules to get it right?"

**What a strong answer should cover:**
- Syntax: \`v-for="item in items"\`, with the index as \`(item, index) in items\`; \`of\` works as well as \`in\`; destructuring is allowed.
- \`v-for\` also iterates **objects** (\`(value, key, index)\`), **integer ranges** (\`n in 10\` starts at **1**) and any **iterable** such as a \`Map\` or \`Set\`.
- Always give each item a stable, unique **\`:key\`** (an id, not the index) so Vue can reuse and move the right DOM nodes and component state.
- \`<template v-for>\` repeats a group of elements without a wrapper; in Vue 3 its \`:key\` goes on the \`<template>\`.
- **Do not put \`v-if\` and \`v-for\` on the same element**: in Vue 3 \`v-if\` runs first and cannot see the loop variable. Filter with a **computed** property instead.
- Array changes through mutation methods (\`push\`, \`splice\`, \`sort\`, \`reverse\`) and replacement (\`filter\`, \`map\`) are all reactive.

**Clarifying questions expected:**
- "Do items have a stable unique id I can use as the key?"
- "Roughly how many items? Thousands might need virtual scrolling."

**Code / implementation expected:** Yes. A keyed list plus a computed filtered list.`,
    answer: `**Target Audience:** Beginners who need to show a list of things (products, messages, todos) in a Vue component. Basic JavaScript arrays and objects assumed.
**Difficulty:** Easy

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. Every rendered list, DOM-identity check and error message below came from mounting the code on Vue 3.5.44 in jsdom and clicking through it.

## 1. Why This Even Matters — A Story First

Imagine you are writing place cards for a dinner party. You have a guest list on paper. You could write each card by hand, but if three more guests confirm, or two cancel, you have to remember to add and throw away cards, and to keep them in the right order on the table.

Now imagine a card printer connected to the guest list. You say "one card per guest, with their name in this spot". Add a guest to the list and a card appears. Cross one off and the card disappears. Sort the list alphabetically and the cards rearrange themselves on the table, and the printer moves the existing cards rather than reprinting them, so the little doodle someone drew on their card stays with them.

That printer is <code>v-for</code>. The guest list is your array. The card design is the element you put <code>v-for</code> on. And "move the existing card, do not reprint" is what the <code>:key</code> attribute makes possible.

## 2. The Core Idea

📌 **Interview term: List rendering** — producing one copy of a template fragment per item of a collection. In Vue it is done with the <code>v-for</code> [directive](/interview-question/what-are-vue-directives-give-common-examples): <code>&lt;li v-for="todo in todos"&gt;{{ todo.text }}&lt;/li&gt;</code>.

📌 **Interview term: Alias** — the name before <code>in</code> (<code>todo</code> above). It refers to the current item and is only available inside the element that has <code>v-for</code> and its children. You can also take the index, <code>(todo, index) in todos</code>, or destructure, <code>{ id, text } in todos</code>. <code>of</code> works the same as <code>in</code>.

📌 **Interview term: Key** — a unique, stable identifier per item, bound with <code>:key="todo.id"</code>. Vue uses it to match old and new items when the list changes, so it can move existing DOM nodes and component instances instead of rewriting them in place. The deep dive is [why :key is important](/interview-question/why-is-the-key-attribute-important-in-v-for), and the algorithm is in [how Vue diffs keyed lists](/interview-question/how-does-vue-s-virtual-dom-diff-keyed-lists).

## 3. What v-for Can Iterate

| Source | Syntax | Values you get |
| :--- | :--- | :--- |
| Array | <code>(item, index) in items</code> | Each element and its 0-based index |
| Object | <code>(value, key, index) in obj</code> | Each property value, its name and position (order of <code>Object.values</code>) |
| Integer range | <code>n in 5</code> | 1, 2, 3, 4, 5: **starts at 1** |
| Any iterable (Map, Set, generator) | <code>[k, v] of map</code> | Whatever the iterator yields; a Map gives <code>[key, value]</code> pairs |
| Group of elements | <code>&lt;template v-for="..." :key="..."&gt;</code> | Repeats several siblings without a wrapper element |

## 4. Verified: Every Form in One Component

The runnable example renders all of the forms above. The driver first printed each one:

\`\`\`
object      : [0 name=Ada][1 role=admin]
range 5     : 1;2;3;4;5;
map         : vuex3;cssx1;
template    : <dt>Write docs</dt><dd>open</dd><dt>Fix bug</dt><dd>done</dd><dt>Review PR</dt><dd>open</dd>
\`\`\`

The object gave value, key and index in property order; <code>n in 5</code> produced 1 to 5, not 0 to 4; the <code>Map</code> was destructured into <code>[tag, count]</code>; and <code>&lt;template v-for&gt;</code> produced <code>dt</code>/<code>dd</code> pairs directly inside the <code>&lt;dl&gt;</code>, with no wrapper element.

Then it pushed, reversed and spliced the array. The "open" list is a <code>computed</code> filter of the same array:

\`\`\`
start         all: 0:Write docs | 1:Fix bug | 2:Review PR   open: Write docs | Review PR
push          all: 0:Write docs | 1:Fix bug | 2:Review PR | 3:New task   open: Write docs | Review PR | New task
reverse       all: 0:New task | 1:Review PR | 2:Fix bug | 3:Write docs   open: New task | Review PR | Write docs
same <li> node for 'Write docs' after reverse? true
splice(0,1)   all: 0:Review PR | 1:Fix bug | 2:Write docs   open: Review PR | Write docs
\`\`\`

📌 **Interview term: Array mutation methods** — <code>push</code>, <code>pop</code>, <code>shift</code>, <code>unshift</code>, <code>splice</code>, <code>sort</code> and <code>reverse</code> change the array in place. Vue 3 tracks them (and direct index writes) through its [Proxy-based reactivity](/interview-question/how-does-vue-s-reactivity-system-work). Non-mutating methods like <code>filter</code> and <code>map</code> return a new array; assign it back (<code>todos.value = todos.value.filter(...)</code>) or use them inside a <code>computed</code>.

Notice that the computed "open" list updated on every change without any extra code: it depends on <code>todos</code>, so it re-ran whenever <code>todos</code> changed.

## 5. Verified: What the Key Actually Does

<svg class="iq-diagram" width="100%" viewBox="0 0 700 260" role="img" aria-label="With id keys a reversed list moves the same DOM nodes, with index keys the nodes stay in place and their text is rewritten">
  <defs>
    <marker id="vq7-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="175" y="28" text-anchor="middle">key = todo.id</text>
  <rect class="d-box-accent" x="40" y="50" width="110" height="40" rx="8"/>
  <text class="d-sub" x="95" y="75" text-anchor="middle">node A: Write</text>
  <rect class="d-box" x="40" y="150" width="110" height="40" rx="8"/>
  <text class="d-sub" x="95" y="175" text-anchor="middle">node C: Review</text>
  <rect class="d-box" x="210" y="50" width="110" height="40" rx="8"/>
  <text class="d-sub" x="265" y="75" text-anchor="middle">node C: Review</text>
  <rect class="d-box-accent" x="210" y="150" width="110" height="40" rx="8"/>
  <text class="d-sub" x="265" y="175" text-anchor="middle">node A: Write</text>
  <path class="d-edge-accent" d="M 154 74 L 205 160" marker-end="url(#vq7-arrow)"/>
  <path class="d-edge" d="M 154 166 L 205 80" marker-end="url(#vq7-arrow)"/>
  <text class="d-sub" x="175" y="230" text-anchor="middle">nodes move</text>
  <text class="d-text" x="525" y="28" text-anchor="middle">key = index</text>
  <rect class="d-box-accent" x="390" y="50" width="110" height="40" rx="8"/>
  <text class="d-sub" x="445" y="75" text-anchor="middle">node A: Write</text>
  <rect class="d-box" x="390" y="150" width="110" height="40" rx="8"/>
  <text class="d-sub" x="445" y="175" text-anchor="middle">node C: Review</text>
  <rect class="d-box-accent" x="560" y="50" width="110" height="40" rx="8"/>
  <text class="d-sub" x="615" y="75" text-anchor="middle">node A: Review</text>
  <rect class="d-box" x="560" y="150" width="110" height="40" rx="8"/>
  <text class="d-sub" x="615" y="175" text-anchor="middle">node C: Write</text>
  <path class="d-edge-dashed" d="M 504 70 L 555 70" marker-end="url(#vq7-arrow)"/>
  <path class="d-edge-dashed" d="M 504 170 L 555 170" marker-end="url(#vq7-arrow)"/>
  <text class="d-sub" x="525" y="230" text-anchor="middle">text rewritten in place</text>
</svg>

The diagram shows two items for clarity; the real test used the three-item starting list. The driver saved a reference to the first <code>&lt;li&gt;</code> ("Write docs"), reversed the array, and checked where that exact DOM node ended up:

\`\`\`
id keys: original first <li> now at position 2 showing "2:Write docs"
index keys: original first <li> now at position 0 showing "0:Review PR"
\`\`\`

With <code>:key="todo.id"</code>, Vue **moved** the "Write docs" node to its new position, so anything attached to it (focus, an input value, a child component state, a CSS transition) moves with the data. With <code>:key="index"</code>, the node stayed in place and its text was **rewritten** to "Review PR". For plain text that looks the same; for a row containing an <code>&lt;input&gt;</code> or a child component, the typed value or local state now belongs to the wrong item. Compare React's [key prop](/interview-question/what-is-the-purpose-of-the-key-prop-when-rendering-lists-in-react), which follows the same idea.

## 6. Verified: v-if and v-for on the Same Element

A very common beginner mistake is filtering in the template:

\`\`\`vue
<li v-for="todo in todos" v-if="!todo.done" :key="todo.id">{{ todo.text }}</li>
\`\`\`

On Vue 3.5.44 that does not filter; it crashes:

\`\`\`
[Vue warn]: Property "todo" was accessed during render but is not defined on instance.
[Vue warn]: Unhandled error during execution of render function
TypeError: Cannot read properties of undefined (reading 'done')
\`\`\`

In Vue 3, <code>v-if</code> has **higher priority** than <code>v-for</code> on the same element, so it is evaluated before <code>todo</code> exists. (Vue 2 did the opposite, which is one of the [Vue 2 to Vue 3 changes](/interview-question/what-changed-from-vue-2-to-vue-3-and-what-does-vue-2-end-of-life-mean).) Two correct fixes, both verified:

- **A computed filter**, as in the runnable example: <code>const open = computed(() =&gt; todos.value.filter(t =&gt; !t.done))</code>, then <code>v-for="todo in open"</code>. Best for performance, because the filter runs only when <code>todos</code> changes. See [computed vs watch](/interview-question/what-is-the-difference-between-computed-and-watch).
- **Move <code>v-for</code> to a wrapping <code>&lt;template&gt;</code>** and keep <code>v-if</code> on the inner <code>&lt;li&gt;</code>. Rendered "a" and "c" from a list of a, b (done), c.

A related compiler rule: in Vue 3, the key of a <code>&lt;template v-for&gt;</code> belongs on the <code>&lt;template&gt;</code> itself. Putting it on the child is a compile error: <code>&lt;template v-for&gt; key should be placed on the &lt;template&gt; tag.</code>

## 7. Rendering Components in a Loop

<code>v-for</code> works on components exactly as on elements: <code>&lt;TodoItem v-for="todo in todos" :key="todo.id" :todo="todo" @remove="remove(todo.id)" /&gt;</code>. The loop variable is not passed automatically; you pass what the child needs as [props](/interview-question/what-are-props-in-vue-and-how-do-you-validate-them), and the child reports back with events, keeping the data flow explicit.

📌 **Interview term: Virtual scrolling** — rendering only the rows currently visible in a scrolled container. <code>v-for</code> renders every item, so lists of many thousands of rows are slow to mount; see [rendering very large lists efficiently](/interview-question/how-do-you-render-very-large-lists-efficiently-in-vue-virtual-scrolling).

## 8. Common Pitfalls

- **Using the index as the key for a list that can reorder, insert or delete.** As verified above, the DOM node stays put and its content is rewritten, so inputs and child state end up on the wrong item. Use a stable id.
- **Putting <code>v-if</code> beside <code>v-for</code>.** It throws in Vue 3. Filter in a computed, or nest with <code>&lt;template v-for&gt;</code>.
- **Expecting <code>n in 10</code> to start at 0.** It starts at 1.
- **Calling a method that returns a new array in the loop expression.** <code>v-for="x in sorted()"</code> sorts on every re-render; and <code>items.sort()</code> inside a template mutates the source array while rendering. Use a computed that sorts a copy: <code>[...items.value].sort(...)</code>.
- **Duplicate keys.** They are not caught on the first render: <code>["a", "a", "b"]</code> keyed by value rendered silently. Reversing it then warned <code>Duplicate keys found during update: "a" Make sure keys are unique.</code> and left **four** <code>&lt;li&gt;</code> elements (<code>a,b,a,a</code>) for three items (<code>b,a,a</code>). Keys must be unique among siblings.
- **Rendering thousands of rows at once.** Paginate, or use virtual scrolling.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The syntax:</strong> <span style="color:#f0e2c8;">"I put <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-for</code> on the element to repeat, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-for="(todo, index) in todos"</code>, and bind a unique <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:key</code>, usually the item id."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. What it iterates:</strong> <span style="color:#f0e2c8;">"Arrays, objects with value, key and index, integer ranges that start at 1, and any iterable like a Map; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;template v-for&gt;</code> repeats a group without a wrapper."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why the key:</strong> <span style="color:#f0e2c8;">"The key lets Vue match items between renders, so when the list is reordered it moves the existing DOM nodes and component state instead of rewriting them in place; an index key breaks that."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Filtering:</strong> <span style="color:#f0e2c8;">"I never put <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-if</code> on the same element, because in Vue 3 <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-if</code> runs first and cannot see the loop variable; I filter or sort in a computed property instead."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Reactivity:</strong> <span style="color:#f0e2c8;">"Mutations like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">splice</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sort</code> are tracked, and for non-mutating methods like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">filter</code> I assign the new array back or derive it in a computed; very long lists get virtual scrolling."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is using the index as the key a problem?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The index describes a position, not an item. After a reorder or deletion the same index points at a different item, so Vue patches the existing node with new text and any input value or child state stays at the old position. In a test, a reversed list kept its first DOM node at position 0 with the text rewritten.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where does the key go with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&lt;template v-for&gt;</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">On the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;template&gt;</code> tag itself in Vue 3. Putting it on a child is a compile error saying the key should be placed on the template tag.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if you combine <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">v-if</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">v-for</code> on one element?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Vue 3 evaluates <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-if</code> first, so the loop variable is undefined and you get a render error such as reading <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">done</code> of undefined. Vue 2 had the opposite priority, which is why old code sometimes does this.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you render a list of components?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The same way, with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-for</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:key</code> on the component tag, passing each item as a prop and listening for events. The loop variable is not passed implicitly.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you show 50,000 rows?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not with a plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-for</code>, because it creates every node. I would paginate or use virtual scrolling so only the visible rows plus a small buffer are rendered, and keep the data in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shallowRef</code> to avoid deep reactivity on every row.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **List rendering** | One copy of a template fragment per item, with <code>v-for</code> |
| **Alias** | The loop variable name, such as <code>todo</code> in <code>todo in todos</code> |
| **Key** | A unique, stable id per item that lets Vue move rather than rewrite nodes |
| **Range** | <code>n in 5</code>: iterate 1 to 5 |
| **<code>&lt;template v-for&gt;</code>** | Repeat a group of siblings without a wrapper element |
| **Array mutation methods** | <code>push</code>, <code>splice</code>, <code>sort</code> and friends; all reactive in Vue 3 |
| **Computed filter** | A <code>computed</code> that returns the filtered or sorted list for <code>v-for</code> |
| **Virtual scrolling** | Rendering only the visible rows of a long list |

---
**Conclusion:** <code>v-for</code> renders one copy of an element per item and works over arrays (with index), objects (value, key, index), integer ranges starting at 1, any iterable such as a Map, and groups via <code>&lt;template v-for&gt;</code>. Verified on Vue 3.5.44: mutations like <code>push</code>, <code>reverse</code> and <code>splice</code> update the list automatically, an id key makes Vue move the very same DOM node while an index key rewrites nodes in place, and <code>v-if</code> on the same element as <code>v-for</code> throws because it runs first. Give every item a stable key, filter and sort in computed properties, and reach for virtual scrolling when lists get very long.`,
    examples: [
      {
        label: "v-for over arrays, objects, a range, a Map and a template group, with push, reverse and splice",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { ref, computed } from "vue";

const todos = ref([
  { id: 1, text: "Write docs", done: false },
  { id: 2, text: "Fix bug", done: true },
  { id: 3, text: "Review PR", done: false },
]);
const user = ref({ name: "Ada", role: "admin" });
const tags = new Map([["vue", 3], ["css", 1]]);

// Filter with a computed, never with v-if on the same element as v-for.
const open = computed(() => todos.value.filter((t) => !t.done));

let nextId = 4;
const add = () => todos.value.push({ id: nextId++, text: "New task", done: false });
const removeFirst = () => todos.value.splice(0, 1);
const reverse = () => todos.value.reverse();
</script>

<template>
  <!-- 1. Array with index; :key gives each row a stable identity -->
  <ol class="all">
    <li v-for="(todo, index) in todos" :key="todo.id">{{ index }}:{{ todo.text }}</li>
  </ol>

  <!-- 2. Filtered list via computed -->
  <ul class="open">
    <li v-for="todo in open" :key="todo.id">{{ todo.text }}</li>
  </ul>

  <!-- 3. Object: value, key, index -->
  <p class="obj"><span v-for="(value, key, i) in user" :key="key">[{{ i }} {{ key }}={{ value }}]</span></p>

  <!-- 4. A range starts at 1, not 0 -->
  <p class="range"><span v-for="n in 5" :key="n">{{ n }};</span></p>

  <!-- 5. Any iterable works: a Map gives [key, value] pairs -->
  <p class="map"><span v-for="[tag, count] of tags" :key="tag">{{ tag }}x{{ count }};</span></p>

  <!-- 6. template v-for repeats a group without a wrapper element -->
  <dl class="dl">
    <template v-for="todo in todos" :key="todo.id">
      <dt>{{ todo.text }}</dt>
      <dd>{{ todo.done ? "done" : "open" }}</dd>
    </template>
  </dl>

  <button class="add" @click="add">add</button>
  <button class="rm" @click="removeFirst">remove first</button>
  <button class="rev" @click="reverse">reverse</button>
</template>
`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you handle events in Vue (v-on and event modifiers)?",
    seoDescription:
      "Handle events in Vue with v-on (@): method vs inline handlers, $event, and modifiers like .stop, .prevent, .self, .once, key and .exact, verified on 3.5.",
    description: `**Question presented to candidate:**
"A form needs a submit button that must not reload the page, a search box that reacts to Enter, and a card whose inner buttons must not trigger the card click. How do you handle these events in Vue?"

**What a strong answer should cover:**
- \`v-on:event\` or the shorthand \`@event\` attaches a listener; the value is a **method handler** (\`@click="save"\`, receives the native event) or an **inline handler** (\`@click="save(item.id)"\`, use \`$event\` to get the event).
- **Event modifiers** replace boilerplate: \`.prevent\` (\`preventDefault\`), \`.stop\` (\`stopPropagation\`), \`.self\`, \`.once\`, \`.capture\`, \`.passive\`.
- **Key modifiers** (\`@keyup.enter\`, \`.esc\`, \`.tab\`, \`.delete\`, arrow keys, or any kebab-case \`KeyboardEvent.key\`), **system modifiers** (\`.ctrl\`, \`.alt\`, \`.shift\`, \`.meta\`), **\`.exact\`** and mouse buttons (\`.left\`, \`.right\`, \`.middle\`).
- Modifiers can be **chained and order matters** (\`.prevent.self\` differs from \`.self.prevent\`).
- On components, \`@event\` listens to events the child **emits** (declared with \`defineEmits\`); Vue 2 \`.native\` no longer exists.
- Template listeners are attached directly to each element (no global delegation) and go away with the element when it is removed; listeners you add yourself to \`window\` or \`document\` must be removed in \`onUnmounted\`.

**Clarifying questions expected:**
- "Is this a native DOM element or a custom component emitting events?"

**Code / implementation expected:** Yes. A template showing \`@submit.prevent\`, \`@keyup.enter\` and \`@click.stop\`.`,
    answer: `**Target Audience:** Beginners wiring up buttons, forms and keyboard shortcuts in Vue. Basic DOM events (<code>click</code>, <code>submit</code>, <code>keyup</code>) assumed; no Vue experience needed.
**Difficulty:** Easy

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. Every "what got logged" table, compiled handler and ordering claim below was produced by dispatching real DOM events at components mounted on Vue 3.5.44 in jsdom.

## 1. Why This Even Matters — A Story First

Think of an office building with a receptionist on every floor. When a visitor rings a bell on the third floor, the third-floor receptionist answers. But the sound also travels down the stairwell, so the second-floor and first-floor receptionists hear it too, and each might react. Sometimes that is what you want. Sometimes the third floor should say "I have got this, nobody else move". And sometimes a ringing bell has a default consequence, such as the doors unlocking, that you need to cancel.

DOM events behave the same way. A click on a button also "travels up" through every parent element (**bubbling**), and some events have **default actions**, such as a form submit reloading the page. In plain JavaScript you handle all that with <code>addEventListener</code>, <code>event.stopPropagation()</code> and <code>event.preventDefault()</code> sprinkled through your code.

Vue gives you a declarative way to say all of it in the template: <code>@submit.prevent="save"</code> reads as "on submit, prevent the default, call save". That is what this question is about.

## 2. The Core Idea

📌 **Interview term: v-on** — the directive that attaches an event listener: <code>v-on:click="handler"</code>, almost always written with the shorthand <code>@click="handler"</code>. The argument is the event name, and the value is what to run.

📌 **Interview term: Method handler** — the value is the name of a function, <code>@click="onSave"</code>. Vue calls it with the native event object as the first argument.

📌 **Interview term: Inline handler** — the value is a JavaScript statement, <code>@click="count++"</code> or <code>@click="remove(item.id)"</code>. It runs as written; if you also need the event, Vue provides it as the special variable <code>$event</code>.

📌 **Interview term: Event modifier** — a dot suffix on the event name that adds common behaviour: <code>.stop</code>, <code>.prevent</code>, <code>.self</code>, <code>.once</code>, <code>.capture</code>, <code>.passive</code>. Modifiers keep handler functions about data logic instead of DOM details.

📌 **Interview term: Event bubbling** — after an event fires on an element, it travels up through each ancestor. <code>.stop</code> calls <code>stopPropagation()</code> to end that journey. Background in [event bubbling and capturing](/interview-question/what-is-event-bubbling-and-capturing) and [preventDefault vs stopPropagation](/interview-question/what-is-the-difference-between-preventdefault-and-stoppropagation).

## 3. The Modifier Catalogue

| Modifier | Effect | Plain JavaScript equivalent |
| :--- | :--- | :--- |
| <code>.prevent</code> | Cancel the default action (form submit reload, link navigation) | <code>event.preventDefault()</code> |
| <code>.stop</code> | Stop the event bubbling to ancestors | <code>event.stopPropagation()</code> |
| <code>.self</code> | Only run if the event started on this element itself, not a child | <code>if (event.target !== event.currentTarget) return</code> |
| <code>.once</code> | Run at most once | <code>{ once: true }</code> |
| <code>.capture</code> | Listen in the capture phase, before children | <code>{ capture: true }</code> |
| <code>.passive</code> | Promise not to call <code>preventDefault</code> (smooth scrolling) | <code>{ passive: true }</code>, see [passive listeners](/interview-question/why-would-you-add-passive-true-to-a-scroll-or-touchstart-listener-and-what-probl) |
| <code>.enter</code>, <code>.esc</code>, <code>.tab</code>, <code>.space</code>, <code>.delete</code>, <code>.up</code> ... | Key filter on keyboard events; any <code>KeyboardEvent.key</code> in kebab-case works (<code>.page-down</code>) | <code>if (event.key !== "Enter") return</code> |
| <code>.ctrl</code>, <code>.alt</code>, <code>.shift</code>, <code>.meta</code> | Require that system key to be held | <code>if (!event.ctrlKey) return</code> |
| <code>.exact</code> | Require exactly the listed system keys, no others | Check all four flags |
| <code>.left</code>, <code>.right</code>, <code>.middle</code> | Filter by mouse button | <code>event.button</code> check |

## 4. Verified: Every Common Modifier

The first runnable example has one element per modifier and an on-screen log. The driver dispatched real <code>MouseEvent</code>, <code>KeyboardEvent</code> and <code>submit</code> events and printed what each step added to the log:

\`\`\`
click Save               -> save (click on BUTTON)
click Inline             -> inline click
click bubbles            -> outer div
click stop               -> stopped
click child of .self     -> (nothing logged)
click .self itself       -> self div
   defaultPrevented = true
submit form              -> submitted without reload
click Once x3            -> once
keyup a, Enter, Escape   -> enter pressed, esc pressed
ctrl+shift+click         -> (nothing logged)
ctrl+click               -> ctrl only
\`\`\`

Line by line: the method handler received the native event (<code>event.type</code> and <code>event.target.tagName</code>); the inline handler read <code>$event.type</code>; a plain button bubbled to the outer <code>div</code>, but the <code>.stop</code> button did not; <code>.self</code> ignored a click that started on its child; <code>.prevent</code> set <code>defaultPrevented = true</code>; <code>.once</code> ran once for three clicks; key modifiers ignored "a"; and <code>.ctrl.exact</code> rejected Ctrl+Shift but accepted Ctrl alone.

A smaller component checked <code>.capture</code>: an outer <code>div</code> with both <code>@click</code> and <code>@click.capture</code>, and an inner button. One click logged <code>outer (capture) -&gt; button -&gt; outer (bubble)</code>.

## 5. Verified: Modifier Order Matters

<svg class="iq-diagram" width="100%" viewBox="0 0 700 240" role="img" aria-label="With prevent then self every click is prevented, with self then prevent only clicks on the element itself are prevented">
  <rect class="d-box-muted" x="20" y="20" width="310" height="200" rx="12"/>
  <text class="d-text" x="175" y="50" text-anchor="middle">@click.prevent.self</text>
  <rect class="d-box-accent" x="45" y="75" width="260" height="40" rx="8"/>
  <text class="d-sub" x="175" y="100" text-anchor="middle">1. preventDefault on any click</text>
  <rect class="d-box" x="45" y="145" width="260" height="40" rx="8"/>
  <text class="d-sub" x="175" y="170" text-anchor="middle">2. run handler only if self</text>
  <rect class="d-box-muted" x="370" y="20" width="310" height="200" rx="12"/>
  <text class="d-text" x="525" y="50" text-anchor="middle">@click.self.prevent</text>
  <rect class="d-box" x="395" y="75" width="260" height="40" rx="8"/>
  <text class="d-sub" x="525" y="100" text-anchor="middle">1. stop here unless self</text>
  <rect class="d-box-accent" x="395" y="145" width="260" height="40" rx="8"/>
  <text class="d-sub" x="525" y="170" text-anchor="middle">2. then preventDefault</text>
</svg>

Modifiers run left to right as guards. The second runnable example puts each version on a link with a child <code>&lt;span&gt;</code> and clicks the span:

\`\`\`
click on child of .prevent.self: defaultPrevented=true, log=""
click on child of .self.prevent: defaultPrevented=false, log=""
\`\`\`

Neither handler ran (the click did not start on the link itself), but <code>.prevent.self</code> still cancelled the navigation for a child click, while <code>.self.prevent</code> let it through. If your link "does nothing" when users click the icon inside it, check the order.

## 6. What the Compiler Generates

Compiling a few handlers with <code>@vue/compiler-dom</code> shows how thin the abstraction is:

\`\`\`js
_createElementVNode("button", { onClick: _ctx.onSave }, "a", 8 /* PROPS */, ["onClick"]),     // @click="onSave"
onClick: $event => (_ctx.onSave())                                                          // @click="onSave()"
onClick: _withModifiers(_ctx.go, ["stop","prevent"])                                        // @click.stop.prevent="go"
onKeyup: _withKeys(_ctx.search, ["enter"])                                                  // @keyup.enter="search"
_createElementVNode("div", { onScrollPassive: _ctx.onScroll }, ...)                         // @scroll.passive="onScroll"
_createElementVNode("div", { onClickCapture: _ctx.log }, ...)                               // @click.capture="log"
\`\`\`

(The trailing comments were added to show which template produced each line.) Three takeaways:

- **<code>onSave</code> vs <code>onSave()</code> is a real difference.** The first passes the function itself, so it receives the event. The second is wrapped in an arrow function that calls <code>onSave()</code> with no arguments, so the event is lost unless you write <code>onSave($event)</code>.
- **Modifiers become wrappers.** <code>withModifiers</code> runs the guards before your function, <code>withKeys</code> filters by key.
- **<code>.passive</code>, <code>.capture</code> and <code>.once</code> become listener options**, encoded in the prop name (<code>onScrollPassive</code>, <code>onClickCapture</code>, and <code>onClickOnce</code> for <code>@click.once</code>) and passed to <code>addEventListener</code>.

📌 **Interview term: Listener invoker** — Vue does not re-add a listener when your handler changes. It attaches one small "invoker" function per event and stores it on the element (a <code>Symbol(_vei)</code> property, inspected here holding <code>onClick</code>), then swaps the function inside it on updates.

## 7. Events on Components

On a component tag, <code>@something</code> listens for events the child **emits** with <code>emit("something", payload)</code>. A child that declared <code>emits: ["remove"]</code> and called <code>emit("remove", 7)</code> logged <code>remove 7</code> in the parent. Declaring events, and validating them, is covered in [defineProps and defineEmits](/interview-question/how-do-defineprops-and-defineemits-work-in-script-setup) and [why declare emits](/interview-question/why-declare-emits-and-can-you-validate-them).

If the child does **not** declare an event, a parent listener such as <code>@click</code> falls through to the child root element as a native listener: clicking the root <code>div</code> of an undeclared <code>Card</code> logged <code>native click on Card root</code>. That replaced Vue 2 <code>.native</code> modifier; see [fallthrough attributes](/interview-question/what-are-fallthrough-attributes-attrs).

## 8. Common Pitfalls

- **Writing <code>@click="save()"</code> and expecting the event.** The inline form calls <code>save</code> with no arguments; pass <code>$event</code> explicitly or use the method form.
- **Forgetting <code>.prevent</code> on a form.** Without it the browser submits and reloads the page.
- **Wrong modifier order.** <code>.prevent.self</code> cancels clicks on children too; <code>.self.prevent</code> does not, as verified above.
- **Using <code>.passive</code> with <code>.prevent</code>.** Vue 3.5.44 compiles <code>@touchstart.passive.prevent</code> without any warning (to <code>onTouchstartPassive: _withModifiers(..., ["prevent"])</code>), but the browser ignores it. In Chromium 141 a passive listener that called <code>preventDefault()</code> left <code>defaultPrevented = false</code> and logged <code>Unable to preventDefault inside passive event listener invocation.</code>
- **Adding <code>window</code> or <code>document</code> listeners without cleanup.** Template listeners belong to their element. Here, a detached button still ran its handler when clicked from code after <code>app.unmount()</code>, because Vue removes the element rather than calling <code>removeEventListener</code>. Listeners you add manually to long-lived objects must be removed in <code>onUnmounted</code>, with the same function reference ([why the same reference](/interview-question/why-must-you-pass-the-same-function-reference-to-removeeventlistener)).
- **Expecting <code>.native</code> to work in Vue 3.** It was removed; undeclared component events fall through to the root instead.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The directive:</strong> <span style="color:#f0e2c8;">"I attach listeners with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-on</code>, written as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@click</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@submit</code>, using either a method handler that receives the native event or an inline handler where the event is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$event</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Event modifiers:</strong> <span style="color:#f0e2c8;">"Modifiers replace DOM boilerplate: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.prevent</code> calls preventDefault, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.stop</code> stops bubbling, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.self</code> ignores clicks from children, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.once</code> runs once, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.capture</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.passive</code> set listener options."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Keys and system keys:</strong> <span style="color:#f0e2c8;">"Key modifiers like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@keyup.enter</code> filter keyboard events, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.ctrl</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.shift</code> require a held key, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.exact</code> requires exactly those keys."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Order:</strong> <span style="color:#f0e2c8;">"Modifiers run left to right, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.prevent.self</code> prevents every click including on children while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.self.prevent</code> only prevents clicks on the element itself."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Components:</strong> <span style="color:#f0e2c8;">"On a component, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@remove</code> listens to an event the child emits, ideally declared with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineEmits</code>; undeclared listeners fall through to the root element, which is why <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.native</code> is gone in Vue 3."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">@click="save"</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">@click="save()"</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The first passes the function, so Vue calls it with the native event. The second compiles to an arrow function that calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">save()</code> with no arguments, so if you need the event you write <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">save($event)</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you stop a form from reloading the page?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;form @submit.prevent="onSubmit"&gt;</code>. The modifier calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">preventDefault</code> before the handler, so the handler only contains the submit logic.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does Vue use event delegation?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Each template listener is attached directly to its element through one invoker function stored on the element, and Vue swaps the handler inside the invoker on updates instead of re-adding listeners.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">.passive</code> matter?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A passive listener tells the browser it will not call preventDefault, so scrolling and touch handling can start without waiting for JavaScript. It is useful for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">scroll</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">touchstart</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">wheel</code>, and must not be combined with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.prevent</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you listen to <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">window</code> events like resize?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not with a template directive. I add the listener in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onMounted</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">addEventListener</code> and remove it in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onUnmounted</code> with the same function reference, or wrap that pattern in a composable.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **v-on / @** | The directive that attaches an event listener |
| **Method handler** | <code>@click="fn"</code>: Vue calls <code>fn(event)</code> |
| **Inline handler** | <code>@click="fn(x)"</code>: runs the statement; the event is <code>$event</code> |
| **$event** | The native event (or emitted payload) inside an inline handler |
| **Event modifier** | <code>.stop</code>, <code>.prevent</code>, <code>.self</code>, <code>.once</code>, <code>.capture</code>, <code>.passive</code> |
| **Key modifier** | <code>.enter</code>, <code>.esc</code> and so on, filtering keyboard events |
| **<code>.exact</code>** | Only the listed system keys may be held |
| **Event bubbling** | An event travelling up from the target through its ancestors |
| **Listener invoker** | The one stable function Vue attaches per event, swapping your handler inside |

---
**Conclusion:** In Vue you attach listeners with <code>v-on</code>, almost always written <code>@event</code>, using either a method handler that receives the native event or an inline handler that gets it as <code>$event</code>. Modifiers express the DOM boilerplate declaratively: <code>.prevent</code>, <code>.stop</code>, <code>.self</code>, <code>.once</code>, <code>.capture</code>, <code>.passive</code>, key and system keys and <code>.exact</code>. Dispatching real events on Vue 3.5.44 confirmed each one, showed that <code>.prevent.self</code> and <code>.self.prevent</code> behave differently, and showed the compiler turning modifiers into small wrappers and listener options. On components, <code>@event</code> listens to emitted events, and undeclared ones fall through to the root element.`,
    examples: [
      {
        label: "Method and inline handlers, $event, and the common event, key and system modifiers",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { ref } from "vue";

const log = ref([]);
const note = (msg) => log.value.push(msg);

// Method handler: Vue passes the native event as the first argument.
function onSave(event) {
  note(\`save (\${event.type} on \${event.target.tagName})\`);
}
</script>

<template>
  <!-- method handler vs inline handler with $event -->
  <button class="save" @click="onSave">Save</button>
  <button class="inline" @click="note('inline ' + $event.type)">Inline</button>

  <!-- .stop: the click does not bubble up to the outer div -->
  <div class="outer" @click="note('outer div')">
    <button class="plain">bubbles</button>
    <button class="stop" @click.stop="note('stopped')">stop</button>
  </div>

  <!-- .self: only when the click starts on this element, not a child -->
  <div class="self" @click.self="note('self div')"><span class="child">child</span></div>

  <!-- .prevent: no page reload on submit -->
  <form class="form" @submit.prevent="note('submitted without reload')"><button>Send</button></form>

  <!-- .once: the handler is removed after the first call -->
  <button class="once" @click.once="note('once')">Once</button>

  <!-- key modifiers -->
  <input class="search" @keyup.enter="note('enter pressed')" @keyup.esc="note('esc pressed')" />

  <!-- .exact: Ctrl+click only, with no other system key -->
  <button class="exact" @click.ctrl.exact="note('ctrl only')">Ctrl-click</button>

  <ol class="log"><li v-for="(m, i) in log" :key="i">{{ m }}</li></ol>
</template>
`,
      },
      {
        label: "Modifier order matters: .prevent.self vs .self.prevent",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { ref } from "vue";
const log = ref([]);
</script>

<template>
  <a class="a" href="#one" @click.prevent.self="log.push('a')"><span class="sa">child A</span></a>
  <a class="b" href="#two" @click.self.prevent="log.push('b')"><span class="sb">child B</span></a>
  <p class="out">{{ log.join(",") }}</p>
</template>
`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is v-html and what is the risk of using it?",
    seoDescription:
      "v-html sets innerHTML, so untrusted strings become XSS. See a payload run in real Chromium, why interpolation is safe, and how to sanitize with DOMPurify.",
    description: `**Question presented to candidate:**
"Product wants user comments to support bold and links, and someone suggests rendering them with \`v-html\`. What does \`v-html\` do, what is the danger, and what would you do instead?"

**What a strong answer should cover:**
- \`v-html="value"\` sets the element's **\`innerHTML\`**, so the string is parsed as real HTML. Interpolation \`{{ value }}\` sets text and **escapes** HTML.
- With untrusted input it enables **cross-site scripting (XSS)**: event-handler attributes like \`onerror\`, \`javascript:\` URLs and similar vectors run attacker JavaScript in your origin. (\`<script>\` tags inserted through \`innerHTML\` do not run, which gives false confidence.)
- Use it only with **trusted** content, or **sanitize** with a maintained allowlist library such as **DOMPurify** right before rendering; prefer Markdown rendered to safe output, or render structured data with normal templates.
- Content inserted by \`v-html\` is **not compiled** by Vue (no directives, no components), and **scoped styles do not apply** to it without \`:deep()\`.
- It replaces the element's children (\`v-html\` with children is a compile error), and it also renders raw during SSR.
- Defence in depth: a **Content Security Policy** and server-side sanitization; the eslint-plugin-vue rule \`vue/no-v-html\` flags every use.

**Clarifying questions expected:**
- "Where does the HTML come from: our own CMS, a Markdown editor, or arbitrary users?"
- "Which tags actually need to be supported?"

**Code / implementation expected:** Yes. Show the unsafe pattern, and a sanitized or alternative version.`,
    answer: `**Target Audience:** Beginners who have seen <code>v-html</code> in a codebase, or are tempted to use it. Basic HTML assumed; no security background needed.
**Difficulty:** Easy

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. The rendered HTML was produced by mounting the example on Vue 3.5.44 in jsdom and with <code>renderToString</code>. Because jsdom does not load images (so an <code>onerror</code> payload can never fire there), the attack itself was run in **real Chromium 141** through playwright-core, and the DOMPurify example was run with dompurify 3.4.17. The payloads used are harmless: they only change some text or the page title.

## 1. Why This Even Matters — A Story First

Imagine a noticeboard in a shared office where anyone can pin a note. Most notes say "Lunch at 1pm". The office manager reads each note aloud at the morning meeting.

There are two ways to read a note aloud. **Option one:** read exactly the words on the paper, as words. If someone writes "Everybody: hand your door keys to Bob", the manager reads that sentence, everyone laughs, nothing happens. **Option two:** treat each note as instructions to be carried out. Now the same note gets Bob a pile of keys.

<code>{{ comment }}</code> is option one: Vue shows the text, whatever it contains. <code>v-html="comment"</code> is option two: the browser treats the text as HTML and does what it says, including running code hidden in it. If the note came from a stranger, that is exactly how attackers steal sessions. That attack is called **cross-site scripting**, and <code>v-html</code> is the easiest way to invite it into a Vue app.

## 2. The Core Idea

📌 **Interview term: v-html** — a built-in [directive](/interview-question/what-are-vue-directives-give-common-examples) that sets an element's <code>innerHTML</code> to the expression's value. The string is parsed by the browser as real HTML.

📌 **Interview term: Text interpolation (escaping)** — <code>{{ value }}</code> inserts the value as text. Characters such as <code>&lt;</code> are escaped, so markup is shown, never executed. This is why Vue templates are safe by default. See [template syntax](/interview-question/what-is-vue-template-syntax-interpolation-directives-expressions).

📌 **Interview term: Cross-site scripting (XSS)** — an attack where someone gets their JavaScript to run on your site, in your users' browsers, with your users' session. It can read data on the page, act as the user, or send data elsewhere. The usual entry point is untrusted text treated as HTML.

📌 **Interview term: Sanitization** — removing everything dangerous from an HTML string while keeping the harmless parts, using an **allowlist** of permitted tags and attributes. It must be done with a maintained library such as DOMPurify, not with a home-made regular expression.

## 3. Verified: Same String, Two Directives

The runnable example renders one untrusted "comment" twice, once with interpolation and once with <code>v-html</code>, plus a third paragraph with markup the app wrote itself. The payload is an image that fails to load, with an <code>onerror</code> attribute that writes "Injected script ran!" into an alarm paragraph.

In jsdom, the driver printed:

\`\`\`
safe   innerHTML: Nice post! &lt;img src="does-not-exist.png" onerror="document.querySelector('.alarm').textContent = 'Injected script ran!'"&gt;
unsafe innerHTML: Nice post! <img src="does-not-exist.png" onerror="document.querySelector('.alarm').textContent = 'Injected script ran!'">
trusted innerHTML: <strong>Bold</strong> and <em>italic</em>
alarm text (jsdom does not load images): No script has run.
\`\`\`

Interpolation escaped the tag; <code>v-html</code> inserted a real <code>&lt;img&gt;</code> element with the handler attached. jsdom never loads images, so the alarm text there says nothing about safety. The same <code>App.vue</code> was therefore built with Vite and opened in Chromium 141:

\`\`\`
Chromium 141.0.7390.37
alarm text: Injected script ran!
\`\`\`

The image failed to load, the browser fired <code>onerror</code>, and the attacker's code ran. A real attacker would read <code>document.cookie</code> or call your API instead of changing a paragraph.

The server render with <code>renderToString</code> shows the same split: the interpolated paragraph came out as <code>&amp;lt;img src=&amp;quot;does-not-exist.png&amp;quot; ...</code>, while the <code>v-html</code> paragraph contained the raw <code>&lt;img ... onerror="..."&gt;</code>. On a server-rendered site the payload is in the HTML before any JavaScript loads.

## 4. How the Attack Flows

<svg class="iq-diagram" width="100%" viewBox="0 0 700 270" role="img" aria-label="An untrusted string through interpolation becomes harmless text, through v-html it becomes elements whose event handlers run">
  <defs>
    <marker id="vq9-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="100" width="170" height="70" rx="10"/>
  <text class="d-text" x="105" y="130" text-anchor="middle">Untrusted string</text>
  <text class="d-sub" x="105" y="152" text-anchor="middle">comment, API, CMS</text>
  <rect class="d-box" x="260" y="20" width="180" height="60" rx="10"/>
  <text class="d-text" x="350" y="47" text-anchor="middle">interpolation</text>
  <text class="d-sub" x="350" y="67" text-anchor="middle">sets text, escaped</text>
  <rect class="d-box-accent" x="260" y="190" width="180" height="60" rx="10"/>
  <text class="d-text d-accent" x="350" y="217" text-anchor="middle">v-html</text>
  <text class="d-sub" x="350" y="237" text-anchor="middle">sets innerHTML</text>
  <rect class="d-box" x="500" y="20" width="180" height="60" rx="10"/>
  <text class="d-text" x="590" y="47" text-anchor="middle">shown as text</text>
  <text class="d-sub" x="590" y="67" text-anchor="middle">nothing runs</text>
  <rect class="d-box-accent" x="500" y="190" width="180" height="60" rx="10"/>
  <text class="d-text d-accent" x="590" y="217" text-anchor="middle">real elements</text>
  <text class="d-sub" x="590" y="237" text-anchor="middle">onerror code runs</text>
  <path class="d-edge" d="M 194 120 L 255 55" marker-end="url(#vq9-arrow)"/>
  <path class="d-edge-accent" d="M 194 150 L 255 215" marker-end="url(#vq9-arrow)"/>
  <path class="d-edge" d="M 444 50 L 495 50" marker-end="url(#vq9-arrow)"/>
  <path class="d-edge-accent" d="M 444 220 L 495 220" marker-end="url(#vq9-arrow)"/>
</svg>

The danger is not the <code>&lt;script&gt;</code> tag most people picture. In the same Chromium run, a <code>&lt;script&gt;window.__ran = true&lt;/script&gt;</code> inserted through <code>innerHTML</code> did **not** execute (<code>&lt;script&gt; via innerHTML executed: false</code>). That is exactly why naive "strip script tags" filters fail: event-handler attributes like <code>onerror</code> and <code>onload</code>, and <code>javascript:</code> URLs, do the job instead. A link inserted as <code>&lt;a href="javascript:window.__js = 1"&gt;</code> ran its code when clicked in Chromium (<code>true</code>).

## 5. Verified: Sanitizing With DOMPurify

The second example passes the string through DOMPurify with a small allowlist before it reaches <code>v-html</code>. The input contained an <code>onerror</code> image, a <code>javascript:</code> link, a <code>&lt;script&gt;</code> and a harmless <code>&lt;b&gt;</code>:

\`\`\`
sanitized innerHTML: Nice post! <img src="x.png"><a>link</a><b>kept</b>
\`\`\`

The <code>onerror</code> attribute, the <code>javascript:</code> URL and the whole <code>&lt;script&gt;</code> element were removed; the allowed tags survived. Sanitize in a <code>computed</code> right before rendering, so every path to <code>v-html</code> goes through it. This example needs the <code>dompurify</code> package, so it is not runnable in the site playground.

## 6. Other Things v-html Does

| Behaviour | Verified result |
| :--- | :--- |
| Vue syntax inside the HTML is **not compiled** | <code>&lt;p&gt;{{ 1 + 1 }}&lt;/p&gt;&lt;button v-on:click="x"&gt;</code> rendered literally, braces and all |
| Children of the element are replaced | <code>&lt;div v-html="x"&gt;fallback&lt;/div&gt;</code> is a compile error: <code>v-html will override element children.</code> |
| An empty directive is an error | <code>&lt;div v-html&gt;&lt;/div&gt;</code>: <code>v-html is missing expression.</code> |
| Scoped CSS does not reach the content | <code>.post strong</code> compiled to <code>.post strong[data-v-abc]</code>, which the inserted <code>&lt;strong&gt;</code> lacks; <code>.post :deep(strong)</code> compiled to <code>.post[data-v-abc] strong</code>, which matches. See [scoped styles](/interview-question/what-are-scoped-styles-in-vue) |
| Rendered raw during SSR | <code>renderToString</code> output contained the unescaped <code>&lt;img onerror&gt;</code> |

Because it is not compiled, <code>v-html</code> is also not a way to render Vue components from a string. For that, use [dynamic components](/interview-question/how-do-dynamic-components-work).

## 7. Safer Alternatives, Best First

1. **Do not store HTML at all.** Keep structured data (text, a list of links) and render it with normal template syntax. Nothing to sanitize.
2. **Markdown with a safe renderer.** Let users write Markdown, render it with a library configured to disallow raw HTML, and still sanitize the output.
3. **Sanitize, then <code>v-html</code>.** DOMPurify with an explicit allowlist, as above, in one place in the code.
4. **Trusted sources only.** HTML your own build or a locked-down CMS produced. "It comes from our API" is not the same as trusted: ask where the API got it.

📌 **Interview term: Content Security Policy (CSP)** — an HTTP header (or meta tag) that tells the browser which scripts may run. It is defence in depth, not a replacement for sanitizing. In Chromium, the same <code>onerror</code> payload changed the page title to "pwned" with no policy, and was blocked with <code>script-src 'self'</code>: <code>Refused to execute inline event handler because it violates the following Content Security Policy directive: "script-src ...</code>.

Teams often also enable the <code>vue/no-v-html</code> rule (present in eslint-plugin-vue 10.11.1 as <code>dist/rules/no-v-html.js</code>), so each use needs a deliberate, reviewed exception. React has the same trade-off under a deliberately scary name; see [how React handles XSS](/interview-question/how-does-react-handle-security-concerns-like-xss), and for Angular, [DomSanitizer](/interview-question/what-are-security-vulnerabilities-in-angular-apps-and-how-does-domsanitizer-prev).

## 8. Common Pitfalls

- **Rendering user-generated content with <code>v-html</code>.** That is a direct XSS hole, as the Chromium run showed.
- **Believing "no script tags" means safe.** <code>&lt;script&gt;</code> inserted via <code>innerHTML</code> never runs; <code>onerror</code>, <code>onload</code> and <code>javascript:</code> URLs do.
- **Writing your own sanitizer with a regex.** Browsers parse HTML in surprising ways; use DOMPurify or an equivalent maintained library.
- **Sanitizing once on input and trusting the database forever.** Sanitize at output time too, because old rows, imports and other writers bypass the input path.
- **Expecting scoped styles or components inside the HTML.** Neither applies: use <code>:deep()</code> for styles and real components for interactivity.
- **Forgetting SSR.** On a server-rendered page the payload is in the initial HTML, so it runs even before your JavaScript loads.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What it does:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-html</code> sets the element innerHTML, so the string is parsed as real HTML, whereas double-brace interpolation sets text and always escapes it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The risk:</strong> <span style="color:#f0e2c8;">"With untrusted input it is a cross-site scripting hole: attributes like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onerror</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">javascript:</code> links run attacker code with the user session."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. A subtle point:</strong> <span style="color:#f0e2c8;">"A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;script&gt;</code> tag inserted through innerHTML does not run, so filters that only strip script tags give false confidence; event-handler attributes are the real vector."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. What I do instead:</strong> <span style="color:#f0e2c8;">"Prefer structured data or Markdown rendered safely; if HTML is unavoidable, sanitize it with DOMPurify and a small allowlist in a computed right before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-html</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Extra facts:</strong> <span style="color:#f0e2c8;">"Content from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-html</code> is not compiled by Vue and scoped styles need <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:deep()</code> to reach it; I add a Content Security Policy and the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vue/no-v-html</code> lint rule as defence in depth."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is interpolation safe?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because it writes the value as text. Vue escapes characters like the less-than sign, so the browser displays markup instead of parsing it. Only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-html</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">innerHTML</code> and similar APIs parse strings as HTML.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is HTML from our own API safe?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only if you know where the API got it. If any user, partner or import can influence that field, treat it as untrusted and sanitize at render time, not just when it was saved.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you render Vue components with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">v-html</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. The string is inserted as plain DOM and never compiled, so directives and component tags are just inert HTML. Use dynamic components or render functions instead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why do scoped styles not apply?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Scoped CSS adds a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">data-v</code> attribute selector, and that attribute is only stamped on elements Vue renders from the template. Elements created by innerHTML lack it, so you need <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:deep()</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does a Content Security Policy make <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">v-html</code> safe?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It reduces the damage, for example blocking inline event handlers when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">script-src</code> has no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unsafe-inline</code>, but it is defence in depth. Sanitizing untrusted HTML is still required.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **v-html** | Directive that sets an element <code>innerHTML</code> |
| **Escaping** | Turning <code>&lt;</code> into <code>&amp;lt;</code> so markup is shown, not run |
| **XSS** | Attacker JavaScript running on your site in a user browser |
| **Event-handler attribute** | <code>onerror</code>, <code>onload</code>, <code>onclick</code>: inline code the browser runs |
| **<code>javascript:</code> URL** | A link whose target is code, executed on click |
| **Sanitization** | Removing dangerous parts of HTML with an allowlist |
| **DOMPurify** | Widely used, maintained HTML sanitizer library |
| **CSP** | Browser policy that restricts which scripts may run |

---
**Conclusion:** <code>v-html</code> sets <code>innerHTML</code>, so unlike <code>{{ }}</code>, which always escapes, it turns a string into live HTML. Run in real Chromium, an untrusted comment rendered through <code>v-html</code> executed its <code>onerror</code> payload, while the identical string in interpolation was harmless text; a <code>&lt;script&gt;</code> tag did not run, which is precisely why "strip script tags" is not protection. The content is not compiled by Vue, scoped CSS does not reach it, and it is raw in SSR output. Use <code>v-html</code> only for trusted HTML, or sanitize with DOMPurify immediately before rendering, and add a Content Security Policy as a second line of defence.`,
    examples: [
      {
        label: "Interpolation vs v-html with the same untrusted string (harmless payload)",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { ref } from "vue";

// Pretend this came from a user profile, a CMS or an API response.
// The payload is harmless here: it only writes a message into the page.
const comment = ref(
  \`Nice post! <img src="does-not-exist.png" onerror="document.querySelector('.alarm').textContent = 'Injected script ran!'">\`
);
// Markup you produced yourself, from a trusted source.
const trustedHtml = ref("<strong>Bold</strong> and <em>italic</em>");
</script>

<template>
  <h4>1. Interpolation escapes HTML: safe</h4>
  <p class="safe">{{ comment }}</p>

  <h4>2. v-html inserts it as real HTML: dangerous</h4>
  <p class="unsafe" v-html="comment"></p>

  <h4>3. v-html with trusted markup only</h4>
  <p class="trusted" v-html="trustedHtml"></p>

  <p class="alarm">No script has run.</p>
</template>
`,
      },
      {
        label: "Sanitizing with DOMPurify before v-html (needs the dompurify package)",
        tech: "vue",
        runnable: false,
        code: `<script setup>
import { ref, computed } from "vue";
import DOMPurify from "dompurify";

const comment = ref(
  \`Nice post! <img src="x.png" onerror="alert(1)"><a href="javascript:alert(2)">link</a><script>alert(3)<\\/script><b>kept</b>\`
);

// Sanitize at the last moment, right before it reaches v-html.
// Only a small allowlist of formatting tags survives.
const safeComment = computed(() =>
  DOMPurify.sanitize(comment.value, { ALLOWED_TAGS: ["b", "i", "em", "strong", "a", "img"], ALLOWED_ATTR: ["href", "src"] })
);
</script>

<template>
  <p class="out" v-html="safeComment"></p>
</template>
`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What changed from Vue 2 to Vue 3, and what does Vue 2 end of life mean?",
    seoDescription:
      "Vue 2 vs Vue 3: createApp, Proxy reactivity, Composition API, fragments, removed filters and $on, run side by side. Vue 2 hit end of life on 31 Dec 2023.",
    description: `**Question presented to candidate:**
"We still have an internal dashboard on Vue 2. Explain what actually changed in Vue 3, and what it means for us that Vue 2 is end of life."

**What a strong answer should cover:**
- **App creation**: \`new Vue({...})\` and global \`Vue.component\` / \`Vue.use\` became \`createApp(App)\` with **app-scoped** \`app.component\` / \`app.use\`, so several apps on a page no longer share global config.
- **Reactivity rewritten on ES Proxies**: adding new properties and writing array indexes are tracked, \`Map\` / \`Set\` are reactive, and \`Vue.set\` / \`this.$set\` are gone.
- **Composition API** and \`<script setup>\` (backported to Vue 2.7), plus **fragments** (multiple root nodes), **Teleport**, **Suspense**, and a faster, compiler-optimised virtual DOM with better TypeScript support.
- **Removals and breaking changes**: filters, \`$on\` / \`$off\` event bus, \`.native\`, \`.sync\` (now \`v-model:prop\`), component \`v-model\` uses \`modelValue\` / \`update:modelValue\`, \`v-if\` now beats \`v-for\`, keyCode modifiers, transition class renames (\`v-enter\` to \`v-enter-from\`), no IE11.
- **End of life**: Vue 2 reached EOL on **31 December 2023** (last release 2.7.16). No more fixes, including security fixes, from the Vue team; packages stay installable but are deprecated on npm. Options: migrate (with the \`@vue/compat\` migration build), or pay for third-party extended support.
- A migration plan: upgrade to 2.7 first, replace removed APIs, swap ecosystem libraries (Vue Router 4+, Pinia instead of Vuex), then use the compat build to flush out warnings.

**Clarifying questions expected:**
- "How big is the app, and which Vue 2 libraries does it depend on?"
- "Are there compliance requirements around running unsupported software?"

**Code / implementation expected:** Optional. A before and after of \`new Vue\` vs \`createApp\`, or of a reactivity caveat.`,
    answer: `**Target Audience:** Developers who meet Vue 2 code at work, or see Vue 2 tutorials online, and need to explain what is different in Vue 3. Basic Vue knowledge helps but every term is defined.
**Difficulty:** Easy

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. The comparisons in sections 4 and 5 were not taken from the migration guide: the same code was run on **vue 2.7.16** and **vue 3.5.44** side by side in Node with jsdom, and the outputs are quoted. Release dates come from the npm registry; the end-of-life facts are cited from the Vue team.

## 1. Why This Even Matters — A Story First

Imagine a block of flats built in 2016. It is solid, people love living there, and it still stands. But the wiring was designed before anyone had an induction hob, the lift needs a key from the caretaker for some floors, and in 2020 the builders put up a new block next door with modern wiring, flexible room layouts and a lift that just works.

For a few years the builders looked after both blocks. Then, at the end of 2023, they announced: "We now only maintain the new block. The old one still stands, the doors still open, but if a pipe bursts, we will not come." Nothing breaks on the day the announcement is made. The risk is the next problem nobody will fix, especially a security one.

That is Vue 2 and Vue 3. Vue 2 apps still run. But Vue 2 reached **end of life**, and an interviewer asking this question wants to know two things: that you understand what was rebuilt in Vue 3 and why, and that you can explain the practical risk of staying on Vue 2.

## 2. The Core Idea

📌 **Interview term: Vue 3** — the current major version, released as 3.0 on 18 September 2020 (npm publish time <code>2020-09-18T15:28:56Z</code>). Current stable is 3.5.44, with 3.6 in release candidate. It was a rewrite of the internals in TypeScript with a new reactivity system, a new compiler and a new virtual DOM, while keeping the template syntax and the Options API familiar.

📌 **Interview term: Vue 2.7 "Naruto"** — the final minor of Vue 2, published 1 July 2022, which backported the Composition API and <code>&lt;script setup&gt;</code> so Vue 2 apps could start writing Vue 3 style code before migrating. The last release is <code>2.7.16</code> (published 24 December 2023); npm still tags it <code>legacy</code> and <code>v2-latest</code>.

📌 **Interview term: End of life (EOL)** — the date after which the maintainers stop all work on a version: no features, no bug fixes, **no security patches**. Vue 2 reached EOL on **31 December 2023**: "It no longer receives new features, updates, or fixes" (source: <a href="https://v2.vuejs.org/eol/" target="_blank" rel="noopener noreferrer">Vue 2 EOL page</a>; reasoning in the <a href="https://blog.vuejs.org/posts/vue-2-eol" target="_blank" rel="noopener noreferrer">Vue blog</a>). The npm registry shows it today: <code>npm view vue@2.7.16 deprecated</code> prints "Vue 2 has reached EOL and is no longer actively maintained. See https://v2.vuejs.org/eol/ for more details."

📌 **Interview term: Migration build (<code>@vue/compat</code>)** — a build of Vue 3 that can run most Vue 2 code and logs a warning for every Vue 2 behaviour it emulates, so a team can fix them one at a time. It is still published alongside Vue: <code>@vue/compat</code> is at 3.5.44 too.

## 3. A Short Timeline

<svg class="iq-diagram" width="100%" viewBox="0 0 700 220" role="img" aria-label="Timeline: Vue 2.0 in September 2016, Vue 3.0 in September 2020, Vue 2.7 in July 2022, Vue 2 end of life on 31 December 2023, Vue 3.5 current">
  <path class="d-edge" d="M 40 110 L 660 110"/>
  <rect class="d-box" x="20" y="30" width="110" height="50" rx="8"/>
  <text class="d-text" x="75" y="52" text-anchor="middle">Vue 2.0</text>
  <text class="d-sub" x="75" y="70" text-anchor="middle">Sep 2016</text>
  <rect class="d-box-accent" x="170" y="140" width="110" height="50" rx="8"/>
  <text class="d-text d-accent" x="225" y="162" text-anchor="middle">Vue 3.0</text>
  <text class="d-sub" x="225" y="180" text-anchor="middle">Sep 2020</text>
  <rect class="d-box" x="320" y="30" width="110" height="50" rx="8"/>
  <text class="d-text" x="375" y="52" text-anchor="middle">Vue 2.7</text>
  <text class="d-sub" x="375" y="70" text-anchor="middle">Jul 2022</text>
  <rect class="d-box-muted" x="430" y="140" width="130" height="50" rx="8"/>
  <text class="d-text" x="495" y="162" text-anchor="middle">Vue 2 EOL</text>
  <text class="d-sub" x="495" y="180" text-anchor="middle">31 Dec 2023</text>
  <rect class="d-box-accent" x="570" y="30" width="110" height="50" rx="8"/>
  <text class="d-text d-accent" x="625" y="52" text-anchor="middle">Vue 3.5</text>
  <text class="d-sub" x="625" y="70" text-anchor="middle">current</text>
  <path class="d-edge-dashed" d="M 75 84 L 75 106"/>
  <path class="d-edge-dashed" d="M 225 114 L 225 136"/>
  <path class="d-edge-dashed" d="M 375 84 L 375 106"/>
  <path class="d-edge-dashed" d="M 495 114 L 495 136"/>
  <path class="d-edge-dashed" d="M 625 84 L 625 106"/>
</svg>

Dates are npm publish times (2.0.0 on 30 September 2016, 3.0.0 on 18 September 2020, 2.7.0 on 1 July 2022, 3.5.0 on 3 September 2024) plus the announced EOL date. Vue 3 became the default npm <code>latest</code> tag in early 2022; the exact date (7 February 2022) comes from a secondary source and was not checked against an official announcement here.

## 4. Verified: Vue 2.7.16 and Vue 3.5.44 Side by Side

The second example runs the same scenarios on both versions in one Node process (full builds, jsdom). Its real output:

\`\`\`
versions: 2.7.16 / 3.5.44
Vue 2 has new Vue(): true | Vue 3 default export: undefined | Vue 3 createApp: function
new prop + index write -> Vue 2: "Ada  | a,b" | Vue 3: "Ada 36 | z,b"
Vue 2 after this.$set           : "Ada 36 | z,b"
filter {{ msg | upper }} -> Vue 2: "HI" | Vue 3 (upper=2): "2" (| is bitwise OR)
event bus -> Vue 2 $on works: true | Vue 3 typeof this.$on: undefined
two root elements -> Vue 2 warns: "[Vue warn]: Error compiling template:" | Vue 3 renders: <h1>a</h1><h2>b</h2>
\`\`\`

What each line shows:

- **Creating apps.** Vue 3 has no default export to call <code>new</code> on; you call <code>createApp()</code>. Plugins, components and config hang off that app instead of a global <code>Vue</code>.
- **Reactivity.** Vue 2 used <code>Object.defineProperty</code> getters and setters, which cannot see a property that did not exist yet or a write to an array index. Setting <code>user.age</code> and <code>list[0]</code> changed nothing on screen until <code>this.$set</code> was used. Vue 3 uses an ES <code>Proxy</code> and tracked both immediately. More in [how reactivity works](/interview-question/how-does-vue-s-reactivity-system-work) and [reactivity caveats](/interview-question/what-are-common-reactivity-caveats-in-vue).
- **Filters are gone, and not loudly.** <code>{{ msg | upper }}</code> is now parsed as JavaScript, so <code>|</code> is bitwise OR: with <code>upper = 2</code> it printed <code>2</code> instead of <code>HI</code>. Replace filters with methods or computed properties.
- **No event bus on instances.** <code>$on</code>, <code>$off</code> and <code>$once</code> were removed; use [component events](/interview-question/how-do-vue-components-communicate), [provide and inject](/interview-question/what-are-provide-and-inject), a store, or a tiny emitter library.
- **Fragments.** Vue 2 refused two root elements with "Component template should contain exactly one root element"; Vue 3 rendered both.

## 5. Verified: More Removals and Renames

These were checked on Vue 3.5.44 by compiling or running code:

| Vue 2 | Vue 3 | Evidence |
| :--- | :--- | :--- |
| <code>Vue.set</code>, <code>Vue.delete</code>, <code>Vue.filter</code> | Not exported | <code>typeof</code> each is <code>undefined</code> |
| <code>this.$listeners</code>, <code>this.$children</code> | Removed | Both <code>undefined</code> on a mounted instance |
| <code>@click.native</code> on a component | Removed; undeclared listeners fall through to the root | <code>.native</code> silently dropped: compiled to a plain <code>onClick</code> |
| <code>:title.sync="t"</code> | <code>v-model:title="t"</code> | <code>.sync</code> compiled to just <code>title: _ctx.t</code>, no update listener; <code>v-model:title</code> compiled to <code>title</code> plus <code>"onUpdate:title"</code> |
| Component <code>v-model</code> as <code>value</code> + <code>input</code> | <code>modelValue</code> + <code>update:modelValue</code> | Compiled output; see [v-model on components](/interview-question/how-does-v-model-work-on-components) |
| <code>v-for</code> beats <code>v-if</code> | <code>v-if</code> beats <code>v-for</code> | Same element throws in Vue 3; see [v-for](/interview-question/how-do-you-render-lists-with-v-for) |
| <code>@keyup.13</code> (keyCode) | Only key names, <code>@keyup.enter</code> | One Enter press: only the <code>.enter</code> handler ran |
| Transition <code>v-enter</code>, <code>v-leave</code> | <code>v-enter-from</code>, <code>v-leave-from</code> | Class names in the 2.7.16 and 3.5.44 runtime source; see [Transition](/interview-question/how-do-transition-and-transitiongroup-work) |
| IE11 supported | Not supported | <code>@vue/compat</code> 3.5.44 README: "If you still need to support IE11 or below, you will have to stay on Vue 2." |

Two of those are silent: <code>.native</code> and <code>.sync</code> compile without any error in Vue 3 and simply stop doing what they did. A migration that relies on "it builds, so it works" will miss them, which is the strongest argument for the migration build and its warnings.

## 6. What Vue 3 Added

| Feature | What it gives you |
| :--- | :--- |
| [Composition API](/interview-question/what-is-the-composition-api-and-how-does-it-differ-from-the-options-api) and <code>&lt;script setup&gt;</code> | Logic grouped by feature and reused through [composables](/interview-question/what-are-composables-in-vue) instead of mixins |
| Proxy reactivity | New keys, index writes, <code>Map</code> and <code>Set</code> all tracked; <code>ref</code> / <code>reactive</code> usable outside components |
| Fragments | Multiple root nodes per component |
| [Teleport](/interview-question/what-is-teleport-in-vue-3) | Render a modal or tooltip into <code>body</code> while keeping it in the component |
| Suspense | Coordinated loading states for async components |
| <code>emits</code> option | Declared component events |
| Compiler-informed virtual DOM | Patch flags and hoisting skip static content |
| TypeScript-first codebase | Much better types for props, emits and templates with <code>vue-tsc</code> |
| Ecosystem | Vite, Vue Router 4 and later, Pinia as the recommended store |

The runnable example uses several of these at once. Mounted in jsdom and clicked:

\`\`\`
#app children: h3, p, button, button, button
after clicks : Ada 36 | 99,20 | vue,vite | 1 x 2 = 2
modal parent : BODY | inside #app? false
\`\`\`

Five root-level elements in one component, a brand-new <code>age</code> key, an index write and a <code>Map.set</code> all reactive, a computed value, and a Teleported modal living under <code>body</code>, outside <code>#app</code>.

## 7. What End of Life Means in Practice

- **The code keeps running.** Packages are still installable from npm and CDNs; nothing switches off.
- **No more fixes from the Vue team**, including security vulnerabilities found from 2024 on, and browser or tooling changes that break Vue 2 will not be patched.
- **The ecosystem moves on.** New library versions target Vue 3; Vue 2 compatible versions stop getting updates.
- **Compliance.** Many security standards and customers require supported software, so EOL frameworks show up in audits.
- **Options.** Migrate to Vue 3 (the recommended path), or buy extended support from a third party; the official EOL page lists HeroDevs as one provider of such paid security patches. Staying unpatched is a risk decision, not a technical one.

A typical migration path: upgrade to 2.7 and start using the Composition API, remove filters and event-bus usage, replace Vuex with [Pinia](/interview-question/what-is-pinia-and-why-use-it) and move to Vue Router 4 or later, switch the build to Vite, then run on <code>@vue/compat</code> and work through its warnings until the compat build can be removed.

## 8. Common Pitfalls

- **Quoting Vue 2 patterns as current.** <code>new Vue()</code>, <code>Vue.set</code>, filters and <code>this.$on</code> mark an answer as out of date.
- **Assuming silent compilation means success.** <code>.native</code> and <code>.sync</code> compile in Vue 3 and quietly stop working; filters turn into bitwise OR.
- **Thinking EOL means "it stops working".** It means "nobody fixes it". The risk is accumulating, mostly security and compatibility.
- **Migrating the framework but not the ecosystem.** Vue Router, the store, UI libraries and test utils all need Vue 3 versions; check each dependency first.
- **Rewriting everything to the Composition API during the migration.** The Options API is fully supported in Vue 3. Migrate first, refactor later.
- **Forgetting global config.** Vue 2 plugins registered on the global <code>Vue</code>; in Vue 3 each <code>createApp()</code> has its own <code>app.use</code>, <code>app.component</code> and <code>app.config</code>; see [global properties and config](/interview-question/how-do-you-add-global-properties-or-config).

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Big picture:</strong> <span style="color:#f0e2c8;">"Vue 3 kept the template syntax and the Options API but rewrote the internals in TypeScript with a new reactivity system, compiler and virtual DOM."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Key changes:</strong> <span style="color:#f0e2c8;">"Apps are created with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">createApp</code> instead of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new Vue</code>, reactivity uses ES Proxies so new properties and array index writes are tracked without <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Vue.set</code>, and the Composition API and script setup are built in."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. New features:</strong> <span style="color:#f0e2c8;">"Components can have multiple root nodes, and there is Teleport, Suspense, the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">emits</code> option, better TypeScript support and a faster, compiler-optimised virtual DOM."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Removals:</strong> <span style="color:#f0e2c8;">"Filters, the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$on</code> event bus, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.native</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.sync</code> are gone, component <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-model</code> uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">modelValue</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-if</code> now has priority over <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-for</code>, and IE11 is not supported."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. End of life:</strong> <span style="color:#f0e2c8;">"Vue 2 reached end of life on 31 December 2023, so it still runs but gets no fixes, including security fixes; the plan is to migrate via Vue 2.7 and the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@vue/compat</code> build, or buy extended support meanwhile."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did Vue 3 switch to Proxies?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.defineProperty</code> can only intercept properties that already exist, so Vue 2 could not detect new keys or array index writes and needed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Vue.set</code>. A Proxy intercepts every get, set, delete and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">has</code> on the object, including Map and Set operations, so those caveats disappear.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you migrate a large Vue 2 app?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Upgrade to 2.7 first, remove filters and event buses, move to Vue 3 compatible versions of the router, store and UI libraries, switch to Vite, then run on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@vue/compat</code> and fix its warnings feature by feature until the compat build can be removed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What replaced the global event bus?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Component events for parent and child, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">provide</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inject</code> for a subtree, a Pinia store for shared state, or a tiny external emitter such as mitt when a real pub-sub is needed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is the Options API deprecated in Vue 3?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It is fully supported and the right choice for many simple components. The Composition API is recommended for logic reuse and TypeScript, but you can mix both in one app.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does end of life mean for a company?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The code keeps working, but new vulnerabilities and browser incompatibilities will not be patched, libraries stop supporting it, and audits flag it. That makes it a risk and compliance question, which is why paid extended support exists as a bridge.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Vue 3** | Current major, released September 2020; 3.5 is the stable line |
| **Vue 2.7** | Final Vue 2 minor, with the Composition API backported |
| **End of life** | No more features, fixes or security patches from the maintainers |
| **createApp** | Vue 3 way to create an app instance with its own config and plugins |
| **Proxy reactivity** | Vue 3 tracking via ES Proxy: new keys and index writes are seen |
| **Fragment** | A component with more than one root node |
| **Migration build** | <code>@vue/compat</code>: Vue 3 with Vue 2 behaviours and warnings |
| **Extended support** | Paid third-party security patches for an EOL version |

---
**Conclusion:** Vue 3 kept the template syntax but rebuilt the internals: <code>createApp</code> instead of <code>new Vue</code>, Proxy-based reactivity that tracks new keys and index writes, the Composition API, fragments, Teleport and Suspense, and a compiler-optimised virtual DOM. Running the same code on 2.7.16 and 3.5.44 showed the changes concretely, including the silent ones: filters becoming bitwise OR, <code>.native</code> and <code>.sync</code> quietly ignored. Vue 2 reached end of life on 31 December 2023, so it still runs but gets no fixes, including security fixes; the responsible answer is a planned migration through Vue 2.7 and the <code>@vue/compat</code> build, or paid extended support while that happens.`,
    examples: [
      {
        label: "Things Vue 3 does that Vue 2 could not: new-key reactivity, Map, fragments, Teleport",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { reactive, ref, computed, version } from "vue";

// 1. Proxy-based reactivity: new keys, index writes and Map changes are tracked.
//    In Vue 2 the first two needed Vue.set / this.$set, and Map was not reactive.
const user = reactive({ name: "Ada" });
const scores = reactive([10, 20]);
const tags = reactive(new Map([["vue", 1]]));

function update() {
  user.age = 36;            // brand-new property
  scores[0] = 99;           // write by index
  tags.set("vite", 2);      // Map method
}

// 2. Composition API is built in (Vue 2.7 backported it; 2.6 needed a plugin).
const count = ref(0);
const double = computed(() => count.value * 2);

// 3. A component can be a function of state with no "this" anywhere.
const showModal = ref(false);
</script>

<template>
  <!-- 4. Multiple root nodes (fragments): Vue 2 required exactly one root element. -->
  <h3>Vue {{ version }}</h3>
  <p class="state">{{ user.name }} {{ user.age ?? "(no age)" }} | {{ scores.join(",") }} | {{ [...tags.keys()].join(",") }}</p>
  <button class="update" @click="update">Update</button>
  <button class="count" @click="count++">{{ count }} x 2 = {{ double }}</button>

  <!-- 5. Teleport (new in Vue 3) renders this into body, outside the component. -->
  <button class="open" @click="showModal = true">Open modal</button>
  <Teleport to="body">
    <div v-if="showModal" class="modal">I live directly under body</div>
  </Teleport>
</template>
`,
      },
      {
        label: "The same scenarios run on Vue 2.7.16 and Vue 3.5.44 side by side (Node + jsdom)",
        tech: "js",
        runnable: false,
        code: `// Runs the same scenarios on Vue 2.7.16 and Vue 3.5.44 (both full builds, in jsdom).
const path = require("path");
const { JSDOM } = require(path.resolve(__dirname, "../pkgs/vue2/node_modules/jsdom"));
const dom = new JSDOM('<!doctype html><div id="v2"></div><div id="v3"></div>');
Object.assign(global, { window: dom.window, document: dom.window.document, Element: dom.window.Element, SVGElement: dom.window.SVGElement, Node: dom.window.Node });
const Vue2 = require(path.resolve(__dirname, "../pkgs/vue2/node_modules/vue/dist/vue.common.dev.js"));
const Vue3 = require(path.resolve(__dirname, "../../../vlab/node_modules/vue/dist/vue.cjs.js"));
Vue2.config.productionTip = false; Vue2.config.devtools = false;
const tick = () => new Promise((r) => setTimeout(r, 10));
const origWarn = console.error, origW = console.warn;
const capture = (fn) => { const msgs = []; console.error = console.warn = (...a) => msgs.push(String(a[0]).split("\\n")[0]); try { fn(); } finally { console.error = origWarn; console.warn = origW; } return msgs; };

(async () => {
  console.log("versions:", Vue2.version, "/", Vue3.version);
  console.log("Vue 2 has new Vue():", typeof Vue2 === "function", "| Vue 3 default export:", Vue3.default, "| Vue 3 createApp:", typeof Vue3.createApp);

  // 1. Adding a brand-new property to reactive state
  const tpl = \`<p>{{ user.name }} {{ user.age }} | {{ list.join(",") }}</p>\`;
  const vm2 = new Vue2({ data: () => ({ user: { name: "Ada" }, list: ["a", "b"] }), template: tpl }).$mount("#v2");
  const app3 = Vue3.createApp({ data: () => ({ user: { name: "Ada" }, list: ["a", "b"] }), template: tpl });
  const vm3 = app3.mount("#v3");
  vm2.user.age = 36; vm2.list[0] = "z";
  vm3.user.age = 36; vm3.list[0] = "z";
  await tick();
  console.log("new prop + index write -> Vue 2:", JSON.stringify(vm2.$el.textContent), "| Vue 3:", JSON.stringify(document.querySelector("#v3").textContent));
  vm2.$set(vm2.user, "age", 36); vm2.$set(vm2.list, 0, "z"); await tick();
  console.log("Vue 2 after this.$set           :", JSON.stringify(vm2.$el.textContent));
  app3.unmount();

  // 2. Filters
  const filt = \`<p>{{ msg | upper }}</p>\`;
  const f2 = new Vue2({ data: () => ({ msg: "hi" }), filters: { upper: (s) => s.toUpperCase() }, template: filt }).$mount(document.body.appendChild(document.createElement("div")));
  const host = document.body.appendChild(document.createElement("div"));
  const w = capture(() => { Vue3.createApp({ data: () => ({ msg: "hi", upper: 2 }), template: filt }).mount(host); });
  console.log("filter {{ msg | upper }} -> Vue 2:", JSON.stringify(f2.$el.textContent), "| Vue 3 (upper=2):", JSON.stringify(host.textContent), "(| is bitwise OR)");

  // 3. Event bus API
  const bus2 = new Vue2();
  let got = null; bus2.$on("ping", (x) => (got = x)); bus2.$emit("ping", 42);
  const inst3 = Vue3.createApp({ template: "<i/>" }).mount(document.body.appendChild(document.createElement("div")));
  console.log("event bus -> Vue 2 $on works:", got === 42, "| Vue 3 typeof this.$on:", typeof inst3.$on);

  // 4. Multiple root nodes
  const multi = \`<h1>a</h1><h2>b</h2>\`;
  const w2 = capture(() => { try { new Vue2({ template: multi }).$mount(document.body.appendChild(document.createElement("div"))); } catch (e) { console.error(e.message); } });
  const h3 = document.body.appendChild(document.createElement("div"));
  Vue3.createApp({ template: multi }).mount(h3);
  console.log("two root elements -> Vue 2 warns:", JSON.stringify(w2[0]), "| Vue 3 renders:", h3.innerHTML);
})();
`,
      },
    ],
  },
];

export default augments;
