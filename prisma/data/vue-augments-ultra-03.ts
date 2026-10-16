/**
 * Vue ULTRA — batch 03: the reactivity core (how reactivity works, ref vs
 * reactive, computed vs watch, writable computed, watch vs watchEffect, flush
 * timing and the 3.4/3.5 watch options, reactivity caveats, nextTick, toRef and
 * toRefs, and why Reactivity Transform was removed).
 *
 * Full CLAUDE.md treatment per question, matching the Angular, React and
 * Next.js ultra banks: a plain-language story first, `📌 Interview term:`
 * callouts, Verified sections quoting output that was actually produced, a
 * theme-aware `.iq-diagram` SVG, comparison tables, topic-specific pitfalls,
 * the §7 "How to Answer in an Interview" card, a glossary and a conclusion.
 *
 * Every "Verified" block was produced on Vue 3.5.44. Component examples were
 * compiled with @vue/compiler-sfc and mounted in jsdom with
 * scripts/verify-vue-example.mjs (click and input events driven from a small
 * driver script); pure reactivity claims were run with plain `node` against
 * the same vue package. Ordering and timing claims (watcher flush modes,
 * batching, nextTick versus Promise.then and setTimeout) come from
 * console.log-instrumented runs, not from memory. Release dates and
 * deprecation history come from the vuejs/core changelogs and the Vue blog.
 * Runnable examples are byte-identical to the files that passed the verifier.
 *
 * Conventions: SVG attributes double-quoted, `<code>` tags or backticks for
 * inline code in prose, no leading H1, `description` is plain markdown (no HTML).
 */
import type { VueAugment } from "./vue-augments.types";

const augments: VueAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How does Vue's reactivity system work?",
    seoDescription:
      "Vue 3 reactivity explained: Proxy-based track and trigger, effects, dynamic dependencies and the batched scheduler, verified on Vue 3.5.44.",
    description: `**Question presented to candidate:**
"When I change \`cart.qty\` in a Vue 3 component, the total on screen updates without me calling anything. Explain how Vue knows what to update, and what actually happens between my assignment and the DOM changing."

**What a strong answer should cover:**
- \`reactive()\` returns a **JavaScript Proxy**; \`ref()\` wraps a value in an object whose \`.value\` getter and setter do the same job.
- Reading a property inside a running **effect** calls **track**, which records "this effect depends on this key". Writing calls **trigger**, which re-runs only the effects that depend on that key.
- The component render function, every \`computed\` and every watcher are effects; dependencies are collected **dynamically** on each run, so a branch that was not read is not a dependency.
- Writes are **batched**: the scheduler queues each affected job once and flushes the queue in a microtask, so three synchronous writes cause one render.
- Contrast with Vue 2 (\`Object.defineProperty\`, no tracking of added keys) and mention the 3.4 and 3.5 internal refactors.
- Know where the system stops: destructured values, non-proxied built-ins, and identity differences between the proxy and the raw object.

**Clarifying questions expected:**
- "Do you want the user-facing API, or the internals: track, trigger and the scheduler?"
- "Are we talking about Vue 3 only, or should I contrast it with Vue 2?"

**Code / implementation expected:** Optional — a 20-line toy track/trigger with a Proxy, or a component that logs how many renders three writes cause.`,
    answer: `**Target Audience:** Anyone preparing for a Vue interview — assumes basic JavaScript objects and functions, no Vue internals required.
**Difficulty:** Medium

> **How to read this doc:** Each idea is explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. Every output block below was produced by running the code on Vue 3.5.44: plain reactivity with <code>node</code>, components compiled with <code>@vue/compiler-sfc</code> and mounted in jsdom.

## 1. Why This Even Matters — A Story First

Think of a spreadsheet. Cell C1 holds <code>=A1*B1</code>. You never tell the spreadsheet "please recalculate C1 now"; you type a new number into A1 and C1 changes. Even better, if you type into Z99, which nothing uses, nothing recalculates.

For that to work, the spreadsheet must have *noticed* that C1 reads A1 and B1. It keeps a little map: "A1 is used by C1". When A1 changes it looks up that map and recalculates only the cells listed there.

Vue's reactivity system is exactly that map, built automatically while your code runs. Your component's render function is the formula cell; your state is the input cells. Interviewers ask this question because almost every confusing Vue bug ("why didn't my screen update?") is a case where that map was never built or the link was broken, and you cannot debug what you cannot describe.

## 2. The Core Idea: Track on Read, Trigger on Write

Vue needs to see two moments: when a value is **read**, and when it is **written**. Plain JavaScript objects do not announce either, so Vue wraps them.

📌 **Interview term: Proxy** — a built-in JavaScript object that wraps another object and lets you intercept operations on it (<code>get</code>, <code>set</code>, <code>has</code>, <code>deleteProperty</code> and so on). <code>reactive(obj)</code> returns a [Proxy](/interview-question/what-is-a-proxy-in-javascript) around <code>obj</code>. A <code>ref</code> does the same job for a single value with a plain getter and setter on <code>.value</code>.

📌 **Interview term: Effect** — a function Vue runs while recording what it reads. The render function of every component, every <code>computed</code>, and every <code>watch</code> or <code>watchEffect</code> callback are effects.

📌 **Interview term: track** — called from the Proxy <code>get</code> trap. While an effect is running, it records the pair "this object, this key, is read by this effect".

📌 **Interview term: trigger** — called from the <code>set</code> trap (and from <code>delete</code>, array <code>push</code> and so on). It looks up who read that key and schedules those effects, and nobody else.

📌 **Interview term: Dependency** — one entry in that map: an effect that read a particular key. Dependencies are **re-collected on every run**, so the map always reflects the code path that actually executed last time.

## 3. The Loop in One Picture

<svg class="iq-diagram" width="100%" viewBox="0 0 720 250" role="img" aria-label="An effect reads reactive state, which tracks the dependency. A write triggers the scheduler, which re-runs the effect once.">
  <defs>
    <marker id="q01-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="30" width="190" height="74" rx="10"/>
  <text class="d-text" x="135" y="62" text-anchor="middle">reactive state</text>
  <text class="d-sub" x="135" y="86" text-anchor="middle">a Proxy or a ref</text>
  <rect class="d-box-accent" x="490" y="30" width="190" height="74" rx="10"/>
  <text class="d-text d-accent" x="585" y="62" text-anchor="middle">running effect</text>
  <text class="d-sub" x="585" y="86" text-anchor="middle">render, computed, watch</text>
  <path class="d-edge-accent" d="M 486 67 L 236 67" marker-end="url(#q01-arrow)"/>
  <text class="d-sub" x="360" y="48" text-anchor="middle">1. read: track(target, key)</text>
  <rect class="d-box-muted" x="265" y="170" width="190" height="64" rx="10"/>
  <text class="d-text" x="360" y="196" text-anchor="middle">scheduler queue</text>
  <text class="d-sub" x="360" y="218" text-anchor="middle">dedupe, flush later</text>
  <path class="d-edge" d="M 135 108 L 135 202 L 259 202" marker-end="url(#q01-arrow)"/>
  <text class="d-sub" x="145" y="146">2. write: trigger</text>
  <path class="d-edge" d="M 461 202 L 585 202 L 585 112" marker-end="url(#q01-arrow)"/>
  <text class="d-sub" x="597" y="146">3. re-run once</text>
</svg>

Step 1 happens during every run of an effect, so the dependency list is rebuilt each time. Step 2 does not run the effect immediately; it hands the effect's job to the scheduler, which removes duplicates and runs the queue in a microtask. That is why many writes in one event handler produce one render.

## 4. A Toy Version You Can Hold in Your Head

This is not Vue's code (the real one uses version counters and linked lists, see section 7), but it is the same idea in 30 lines. It was run with <code>node</code>:

\`\`\`js
const targetMap = new WeakMap(); // target -> (key -> Set of effects)
let activeEffect = null;

function track(target, key) {
  if (!activeEffect) return;
  let deps = targetMap.get(target);
  if (!deps) targetMap.set(target, (deps = new Map()));
  let dep = deps.get(key);
  if (!dep) deps.set(key, (dep = new Set()));
  dep.add(activeEffect);
}
function trigger(target, key) {
  const dep = targetMap.get(target)?.get(key);
  if (dep) [...dep].forEach((fn) => fn());
}
function reactive(obj) {
  return new Proxy(obj, {
    get(t, k, r) { track(t, k); return Reflect.get(t, k, r); },
    set(t, k, v, r) { const ok = Reflect.set(t, k, v, r); trigger(t, k); return ok; },
  });
}
function effect(fn) {
  const run = () => { activeEffect = run; try { fn(); } finally { activeEffect = null; } };
  run();
}

const cart = reactive({ price: 12, qty: 2, note: "gift" });
effect(() => console.log(\`total = \${cart.price * cart.qty}\`));
cart.qty = 3;        // total depends on qty, so the effect re-runs
cart.note = "none";  // nothing read note, so nothing re-runs
cart.price = 10;
\`\`\`

Output:

\`\`\`
total = 24
total = 36
total = 30
\`\`\`

The write to <code>note</code> printed nothing, because no effect ever read <code>note</code>. The toy re-runs effects synchronously; real Vue only does that for <code>flush: "sync"</code> watchers.

## 5. Verified: the Real System Behaves the Same Way

The same experiment against the real <code>vue</code> 3.5.44 package, using its low-level <code>effect()</code> export (components and watchers are built on the same primitive):

\`\`\`js
import { reactive, ref, computed, effect, isProxy, toRaw, isReactive } from "vue";

const raw = { price: 12, qty: 2, showTax: false, tax: 5 };
const cart = reactive(raw);
console.log("is a Proxy:", isProxy(cart), "| same proxy twice:", reactive(raw) === cart, "| toRaw gives original:", toRaw(cart) === raw);

let runs = 0;
effect(() => {
  runs++;
  const t = cart.price * cart.qty + (cart.showTax ? cart.tax : 0);
  console.log(\`run \${runs}: total = \${t}\`);
});
cart.tax = 7;          // not read yet (showTax is false): no re-run
cart.showTax = true;   // re-run, and now tax is a dependency
cart.tax = 9;          // re-run
cart.qty = 2;          // same value: no re-run

const nested = reactive({ user: { name: "Ada" } });
console.log("nested object is reactive too:", isReactive(nested.user));

const count = ref(1);
const double = computed(() => count.value * 2);
effect(() => console.log("double is", double.value));
count.value++;
\`\`\`

\`\`\`
is a Proxy: true | same proxy twice: true | toRaw gives original: true
run 1: total = 24
run 2: total = 31
run 3: total = 33
nested object is reactive too: true
double is 2
double is 4
\`\`\`

Four facts fall out of that run:

- **Dependencies are dynamic.** Writing <code>tax</code> while <code>showTax</code> was false did nothing, because that branch was never read. After <code>showTax</code> became true, <code>tax</code> joined the list.
- **Same-value writes are ignored.** Setting <code>qty</code> to the value it already had did not trigger.
- **One object, one proxy.** Calling <code>reactive()</code> twice on the same object returns the same proxy (Vue caches it in a <code>WeakMap</code>), and <code>toRaw</code> gets the original back. See [markRaw and toRaw](/interview-question/what-do-markraw-and-toraw-do).
- **Deep by default, but lazily.** Nested objects are wrapped the first time they are read, not up front.

## 6. Verified: the Scheduler Batches Writes

In a component, the render function is an effect, but it is not re-run on every write. The example below (the runnable example on this page) bumps <code>qty</code> three times in one click and logs what happens:

\`\`\`
computing total
[app] RENDERED: 1 x 12 = 12Add three
--- click
handler done, DOM still says: 1 x 12 = 12
watch: qty 1 -> 4
computing total
DOM patched
[app] AFTER CLICK: 4 x 12 = 48
--- type a coupon
DOM patched
\`\`\`

Read it top to bottom:

1. After three writes the handler finishes and the DOM **still shows the old value**. Nothing has re-rendered yet.
2. Then, in a microtask, the queue flushes once: the watcher runs once (<code>1 -> 4</code>, not three times), the computed recomputes once, the DOM is patched once.
3. Typing a coupon re-renders the component (the template reads <code>coupon</code> through <code>v-model</code>) but **does not recompute the total**, because the computed never read <code>coupon</code>.

📌 **Interview term: Scheduler (job queue)** — the part of <code>runtime-core</code> that collects triggered jobs, removes duplicates, orders them (pre-flush watchers before the render, post-flush callbacks after it), and runs them in one microtask. [<code>nextTick()</code>](/interview-question/what-is-nexttick-in-vue) returns the promise for that flush.

📌 **Interview term: Fine-grained reactivity** — updates are scheduled per dependency, not by re-checking everything. Vue tracks at the level of "which component", then lets the [virtual DOM diff](/interview-question/how-does-vue-s-virtual-dom-diff-keyed-lists) work out which nodes inside that component changed.

## 7. How It Changed Across Versions

| Version | How reads and writes are seen | What that meant |
| :--- | :--- | :--- |
| Vue 2 | <code>Object.defineProperty</code> getter and setter per existing key | Added keys and array index writes were invisible; you needed <code>Vue.set</code>. See [Vue 2 vs Vue 3](/interview-question/what-changed-from-vue-2-to-vue-3-and-what-does-vue-2-end-of-life-mean) |
| Vue 3.0 | <code>Proxy</code> traps for get, set, has, delete, ownKeys | New keys, deletes, index writes, <code>Map</code> and <code>Set</code> all tracked |
| Vue 3.4 (Dec 2023) | Reactivity refactor (vuejs/core #5912) | A <code>computed</code> only notifies its dependents when its **value** actually changes |
| Vue 3.5 (Sep 2024) | Second refactor: version counting and doubly linked dependency lists (#10397) | The Vue 3.5 announcement reports **-56% memory usage** with no behaviour change |

The 3.4 and 3.5 entries come from the <a href="https://github.com/vuejs/core/blob/main/changelogs/CHANGELOG-3.4.md" target="_blank" rel="noopener noreferrer">vuejs/core 3.4 changelog</a>, the <a href="https://github.com/vuejs/core/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer">3.5 changelog</a> and the <a href="https://blog.vuejs.org/posts/vue-3-5" target="_blank" rel="noopener noreferrer">Announcing Vue 3.5</a> post. The 3.4 "only notify on real change" behaviour is easy to see for yourself: an effect that reads <code>computed(() => n.value % 2 === 0)</code> stays quiet while <code>n</code> goes 2, 4, 6, as shown in the [computed vs watch](/interview-question/what-is-the-difference-between-computed-and-watch) page.

## 8. The Building Blocks at a Glance

| API | What it is in this model | Typical job |
| :--- | :--- | :--- |
| <code>reactive(obj)</code> | A deep Proxy around an object | Grouped state. See [ref vs reactive](/interview-question/what-is-the-difference-between-ref-and-reactive) |
| <code>ref(value)</code> | An object with a tracked <code>.value</code> | Any single value, replaceable as a whole |
| <code>computed(fn)</code> | A lazy, cached effect that is also a dependency | Derived values |
| <code>watch</code> / <code>watchEffect</code> | Effects whose job is a side effect | Fetching, syncing, logging. See [watch vs watchEffect](/interview-question/what-is-the-difference-between-watch-and-watcheffect) |
| Component render | An effect scheduled by the runtime | Producing the virtual DOM |
| <code>shallowRef</code>, <code>markRaw</code> | Ways to turn tracking off for big or foreign objects | Performance and third-party instances |

## 9. Common Pitfalls

- **Destructuring a reactive object.** <code>const { qty } = cart</code> copies a number out of the Proxy; reads of <code>qty</code> no longer go through a trap. Use <code>toRefs(cart)</code> — see [toRef and toRefs](/interview-question/what-do-toref-and-torefs-do).
- **Expecting the DOM to change synchronously.** As section 6 showed, the DOM still has the old text when your handler returns. Measure after <code>await nextTick()</code>.
- **Assuming everything is tracked.** Only reads that happen *while an effect runs* are tracked. A value read in a <code>setTimeout</code> callback, or after an <code>await</code> inside <code>watchEffect</code>, is not a dependency.
- **Comparing the proxy with the raw object.** <code>reactive(raw) === raw</code> is false. Keep one reference style per piece of state; see [reactivity caveats](/interview-question/what-are-common-reactivity-caveats-in-vue).
- **Making huge or foreign objects deeply reactive.** A 10,000-row dataset or a map library instance does not need per-key tracking. Use <code>shallowRef</code> or <code>markRaw</code> ([when to use shallowRef](/interview-question/when-should-you-use-shallowref-shallowreactive-triggerref)).
- **Describing Vue 3 with Vue 2 limits.** "You must use <code>Vue.set</code> to add a key" has not been true since 3.0.

## 10. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"Vue wraps state in Proxies and refs, records which effects read which keys, and on a write re-runs only those effects, batched into one flush."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Track and trigger:</strong> <span style="color:#f0e2c8;">"A read inside a running effect calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">track</code>, storing target, key and effect. A write calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">trigger</code>, which looks up that key and schedules its effects."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. What the effects are:</strong> <span style="color:#f0e2c8;">"Every component render function, every <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> and every watcher is an effect, and dependencies are re-collected on each run, so an unread branch is not a dependency."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Batching:</strong> <span style="color:#f0e2c8;">"Triggered jobs go into a scheduler queue that dedupes them and flushes in a microtask. Three writes in a click give one watcher call and one render, and the DOM is stale until then."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Versions:</strong> <span style="color:#f0e2c8;">"Vue 2 used <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.defineProperty</code>, so new keys needed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Vue.set</code>. Vue 3 uses Proxy, 3.4 made computeds notify only on real changes, and 3.5 cut memory use with version counting."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did Vue 3 switch from <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">defineProperty</code> to Proxy?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A Proxy intercepts operations on the whole object, including keys that do not exist yet, deletes, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">in</code> checks and iteration, and it works for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineProperty</code> only covers keys that existed when the object was made reactive, which is why Vue 2 needed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Vue.set</code> and could not see <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">arr[i] = x</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Then why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ref</code> exist at all?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A Proxy needs an object to wrap. A number or string cannot be proxied, and a variable that is reassigned cannot be intercepted. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ref</code> puts the value behind a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.value</code> getter and setter so primitives and whole-value replacement are tracked too.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does Vue avoid re-rendering three times for three writes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">trigger</code> does not run the render effect; it queues the component update job. The queue dedupes jobs by identity and flushes once in a microtask, so all synchronous writes land in the same flush. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nextTick()</code> returns the promise for that flush.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is a component re-rendered when any reactive value changes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Only when something its render function read changes. In the verified example, typing a coupon re-rendered the component because the template reads it, but the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">total</code> computed did not recompute because it never read the coupon.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What did the 3.5 refactor change for application code?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Nothing in behaviour: the announcement describes it as a refactor to version counting and doubly linked dependency lists with about 56 percent less memory and no behaviour changes. It mostly matters for large apps and for SSR, where it also fixed stale or hanging computeds.</span>
</div>

</div>

## 11. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Proxy** | JavaScript wrapper object that intercepts reads and writes |
| **Effect** | A function Vue runs while recording what it reads |
| **track** | Record "this effect read this key" during a read |
| **trigger** | Schedule the effects that read a key after it is written |
| **Dependency** | One effect that read one key; rebuilt on every run |
| **Scheduler (job queue)** | Dedupes triggered jobs and flushes them in one microtask |
| **Fine-grained reactivity** | Update only what depends on the change, not everything |

---
**Conclusion:** Vue's reactivity is a dependency map built while your code runs. <code>reactive()</code> and <code>ref()</code> intercept reads and writes; a read inside an effect calls <code>track</code>, a write calls <code>trigger</code>, and the scheduler re-runs each affected effect once, in a microtask, in a sensible order. The verified runs show the consequences an interviewer cares about: dependencies follow the code path that actually ran, same-value writes are ignored, three writes produce one render, and the DOM is still stale until the flush. Explain those four, mention Proxy versus Vue 2's <code>defineProperty</code> and the 3.4/3.5 refactors, and you have answered both the "how" and the "why it matters".`,
    examples: [
      {
        label: "Three writes, one render: watching track, trigger and batching happen",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { reactive, computed, watch, onUpdated } from "vue";

// reactive() wraps the object in a Proxy: reads are tracked, writes trigger.
const cart = reactive({ price: 12, qty: 1, coupon: "" });

// computed() is an effect too: it re-runs only when price or qty change.
const total = computed(() => {
  console.log("computing total");
  return cart.price * cart.qty;
});

// A watcher is a third kind of effect, scheduled before the next render.
watch(() => cart.qty, (q, old) => console.log(\`watch: qty \${old} -> \${q}\`));

onUpdated(() => console.log("DOM patched"));

function addThree() {
  // Three synchronous writes: Vue queues ONE watcher run and ONE render.
  cart.qty++;
  cart.qty++;
  cart.qty++;
  console.log("handler done, DOM still says:", document.querySelector("#total").textContent);
}
</script>

<template>
  <p id="total">{{ cart.qty }} x {{ cart.price }} = {{ total }}</p>
  <button @click="addThree">Add three</button>
  <input v-model="cart.coupon" placeholder="coupon (not used by total)" />
</template>
`,
      },
      {
        label: "A 30-line toy track/trigger built on Proxy (plain Node)",
        tech: "js",
        runnable: false,
        code: `// A 30-line toy version of Vue's track/trigger, to show the idea (not Vue's real code).
const targetMap = new WeakMap(); // target -> (key -> Set of effects)
let activeEffect = null;

function track(target, key) {
  if (!activeEffect) return;
  let deps = targetMap.get(target);
  if (!deps) targetMap.set(target, (deps = new Map()));
  let dep = deps.get(key);
  if (!dep) deps.set(key, (dep = new Set()));
  dep.add(activeEffect);
}
function trigger(target, key) {
  const dep = targetMap.get(target)?.get(key);
  if (dep) [...dep].forEach((fn) => fn());
}
function reactive(obj) {
  return new Proxy(obj, {
    get(t, k, r) { track(t, k); return Reflect.get(t, k, r); },
    set(t, k, v, r) { const ok = Reflect.set(t, k, v, r); trigger(t, k); return ok; },
  });
}
function effect(fn) {
  const run = () => { activeEffect = run; try { fn(); } finally { activeEffect = null; } };
  run();
}

const cart = reactive({ price: 12, qty: 2, note: "gift" });
effect(() => console.log(\`total = \${cart.price * cart.qty}\`));
cart.qty = 3;        // total depends on qty, so the effect re-runs
cart.note = "none";  // nothing read note, so nothing re-runs
cart.price = 10;
`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the difference between ref and reactive?",
    seoDescription:
      "ref is a box with a tracked .value for any type; reactive is a deep Proxy of an object. Reassignment, destructuring and unwrapping, verified on Vue 3.5.",
    description: `**Question presented to candidate:**
"In a Vue 3 \`<script setup>\` component, when would you use \`ref\` and when \`reactive\`? Walk me through what each one actually returns and the bugs you have seen from picking the wrong one."

**What a strong answer should cover:**
- \`ref(x)\` returns a **ref object** with a tracked \`.value\`; it holds any type, and an object placed in it is made deeply reactive.
- \`reactive(obj)\` returns a **deep Proxy** of the object itself; it only accepts objects (a primitive gets a dev warning and comes back unchanged).
- A ref can be **reassigned as a whole** (\`list.value = [...]\`); a \`reactive\` variable cannot, because effects keep tracking the old proxy.
- **Destructuring** a reactive object copies values and loses reactivity; \`toRefs\` fixes that. Refs survive being passed around and returned from composables.
- **Unwrapping rules:** top-level refs unwrap in templates, refs nested in a reactive object unwrap on access, refs inside reactive arrays and Maps do not.
- The Vue docs recommend \`ref()\` as the primary API; \`reactive\` still fits a cohesive object such as a form you never replace.

**Clarifying questions expected:**
- "Is this for local component state, or for state shared through a composable or store?"
- "Is the team on TypeScript? That changes how much \`.value\` matters in practice."

**Code / implementation expected:** Yes — show reassignment and destructuring with both, and what the template displays.`,
    answer: `**Target Audience:** Developers who have written a Vue 3 component or two and want to stop guessing between <code>ref</code> and <code>reactive</code>.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts with the vocabulary interviewers expect. Every output below was produced on Vue 3.5.44: the reactivity probe with <code>node</code>, the component by compiling it with <code>@vue/compiler-sfc</code> and clicking through it in jsdom.

## 1. Why This Even Matters — A Story First

Imagine you keep your shopping list in one of two ways.

**Option A: a labelled box.** The box says "shopping list" on the outside. Whatever paper is inside, anyone who wants the list opens the box. You can throw the old paper away and drop a new one in; everybody still finds it, because they look in the box, not at the paper.

**Option B: a glass display case bolted around one sheet of paper.** Everyone can see the sheet directly and every pencil mark on it is noticed, which feels nicer. But if you print a brand-new sheet and put it in a *new* case, the people watching the old case keep staring at the old sheet.

<code>ref</code> is the labelled box: the box is permanent, the <code>.value</code> inside can be anything and can be replaced. <code>reactive</code> is the display case: no <code>.value</code>, but the case is welded to that one object. Most "my screen stopped updating" bugs with these two APIs are someone building a new display case and forgetting the audience is still watching the old one.

## 2. The Core Idea

📌 **Interview term: ref** — <code>ref(initial)</code> returns a small object whose <code>.value</code> property has a tracking getter and a triggering setter. It works for any value: numbers, strings, <code>null</code>, arrays, objects. If you put an object in it, that object is converted with <code>reactive()</code>, so nested changes are tracked too.

📌 **Interview term: reactive** — <code>reactive(obj)</code> returns a [Proxy](/interview-question/what-is-a-proxy-in-javascript) of the object. You use it like the original object, with no <code>.value</code>, and every nested object you read is wrapped on access. It only works on objects, arrays, <code>Map</code> and <code>Set</code>.

📌 **Interview term: Ref unwrapping** — places where Vue reads <code>.value</code> for you: top-level refs in a template, and refs stored as properties of a reactive object. Not inside reactive arrays or Maps.

Both feed the same engine: reads call <code>track</code>, writes call <code>trigger</code>, as explained in [how Vue reactivity works](/interview-question/how-does-vue-s-reactivity-system-work). The difference is **where the tracked boundary sits**: on the <code>.value</code> property of a box you own, or on the object itself.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 270" role="img" aria-label="A ref is a box whose value property points at the data. A reactive variable points straight at a Proxy around the data.">
  <defs>
    <marker id="q02-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="180" y="30" text-anchor="middle">const todos = ref([...])</text>
  <rect class="d-box-accent" x="70" y="56" width="220" height="64" rx="10"/>
  <text class="d-text d-accent" x="180" y="84" text-anchor="middle">ref object</text>
  <text class="d-sub" x="180" y="106" text-anchor="middle">tracked .value</text>
  <path class="d-edge-accent" d="M 180 124 L 180 166" marker-end="url(#q02-arrow)"/>
  <rect class="d-box" x="70" y="172" width="220" height="64" rx="10"/>
  <text class="d-text" x="180" y="200" text-anchor="middle">array (made reactive)</text>
  <text class="d-sub" x="180" y="222" text-anchor="middle">replace it freely</text>
  <text class="d-text" x="540" y="30" text-anchor="middle">let todos = reactive([...])</text>
  <rect class="d-box-muted" x="430" y="56" width="220" height="180" rx="12"/>
  <text class="d-text" x="540" y="84" text-anchor="middle">Proxy</text>
  <text class="d-sub" x="540" y="106" text-anchor="middle">get and set traps</text>
  <rect class="d-box" x="460" y="140" width="160" height="64" rx="10"/>
  <text class="d-text" x="540" y="168" text-anchor="middle">the array</text>
  <text class="d-sub" x="540" y="190" text-anchor="middle">welded to proxy</text>
</svg>

On the left, everything that depends on <code>todos</code> depends on the ref's <code>.value</code>, so swapping the array is a tracked write. On the right, everything depends on keys of that specific proxy; assigning a new proxy to the variable is an ordinary JavaScript assignment that Vue never sees.

## 3. Verified: Seven Behaviours Side by Side

This script was run with <code>node</code> against Vue 3.5.44:

\`\`\`js
import { ref, reactive, isReactive, isRef, watch, effect } from "vue";

const user = ref({ name: "Ada", tags: ["a"] });
console.log("1. isReactive(user.value):", isReactive(user.value));

const n = reactive(1);
console.log("2. reactive(1) returned:", n, "| isReactive:", isReactive(n));

const listRef = ref([1, 2]);
let listReactive = reactive([1, 2]);
effect(() => console.log("   ref effect sees length", listRef.value.length));
effect(() => console.log("   reactive effect sees length", listReactive.length));
listRef.value = [1, 2, 3];
listReactive = reactive([1, 2, 3]); // the effect still holds the OLD proxy
console.log("3. after reassigning both (only the ref effect re-ran)");

const state = reactive({ count: 0 });
let { count } = state;
state.count = 5;
console.log("4. destructured count:", count, "| state.count:", state.count);

const r = ref(10);
const box = reactive({ r });
const arr = reactive([r]);
console.log("5. box.r:", box.r, "| arr[0] isRef:", isRef(arr[0]), "| arr[0].value:", arr[0].value);
box.r = 11;
console.log("   writing box.r updates the ref too:", r.value);

const raw = { id: 1 };
console.log("6. proxied === raw:", reactive(raw) === raw);
\`\`\`

\`\`\`
1. isReactive(user.value): true
[Vue warn] value cannot be made reactive: 1
2. reactive(1) returned: 1 | isReactive: false
   ref effect sees length 2
   reactive effect sees length 2
   ref effect sees length 3
3. after reassigning both (only the ref effect re-ran)
4. destructured count: 0 | state.count: 5
5. box.r: 10 | arr[0] isRef: true | arr[0].value: 10
   writing box.r updates the ref too: 11
6. proxied === raw: false
\`\`\`

What each line proves:

1. An object inside a ref **is** deeply reactive. "ref is for primitives" is a myth.
2. <code>reactive(1)</code> warns <code>value cannot be made reactive: 1</code> and gives you back a plain <code>1</code>.
3. Reassigning the ref re-ran its effect; reassigning the reactive variable did not.
4. Destructuring copied <code>0</code> out; later writes to <code>state.count</code> do not reach it.
5. A ref stored in a reactive **object** unwraps (<code>box.r</code> is <code>10</code>, and writing it writes the ref). In a reactive **array** it stays a ref.
6. The proxy is a different object from the original.

The seventh behaviour is about [watchers](/interview-question/what-is-the-difference-between-watch-and-watcheffect): in the same run, <code>watch(user, cb)</code> on a ref holding an object fired only when <code>user.value</code> was **replaced**, while <code>watch(state, cb)</code> on a reactive object fired on a nested write, because watching a reactive object is deep by default. Pass <code>{ deep: true }</code> to make the ref watcher see nested writes.

## 4. Verified: the Stale-Screen Bug in a Component

The runnable example on this page has a ref list, a reactive list, and a destructured field. Clicking through it in jsdom printed:

\`\`\`
[app] RENDERED: ref: write testsreactive: write testsform: a@b.co / destructured: a@b.coReplace refReplace reactiveChange email
variable now holds: ship it
[replace reactive] ref: write tests | reactive: write tests | form: a@b.co / destructured: a@b.co
[replace ref] ref: ship it | reactive: ship it | form: a@b.co / destructured: a@b.co
variable now holds: ship it
[replace reactive again] ref: ship it | reactive: ship it | form: a@b.co / destructured: a@b.co
form.email: new@b.co | destructured email: a@b.co
[change email] ref: ship it | reactive: ship it | form: new@b.co / destructured: a@b.co
\`\`\`

Look at the first two clicks. "Replace reactive" changed the variable, but the screen still says <code>write tests</code>: nothing the render function tracked was written. Then "Replace ref" triggers a re-render for its own reasons, and the reactive line **suddenly looks correct too**, because the re-running render function now reads the new variable. That is the nasty version of this bug: it hides whenever something else happens to re-render the component, and shows up only when the reactive replacement is the sole change. The destructured <code>email</code> never updates at all.

The template side has its own unwrapping rule. Server-rendering <code>{{ count + 1 }}</code>, <code>{{ obj.id + 1 }}</code> and <code>{{ obj.id }}</code>, where <code>count</code> is a top-level ref and <code>obj</code> is a plain object holding a ref, produced:

\`\`\`
<p>top-level: 2</p><p>nested plus one: [object Object]1</p><p>nested alone: 1</p>
\`\`\`

Only top-level refs are unwrapped inside expressions. A nested ref is unwrapped only when it is the whole interpolation.

## 5. Side by Side

| | <code>ref</code> | <code>reactive</code> |
| :--- | :--- | :--- |
| Accepts | Any value | Objects, arrays, <code>Map</code>, <code>Set</code> only |
| Access in script | <code>x.value</code> | <code>x.key</code> |
| Access in template | Unwrapped at top level | Same as script |
| Replace the whole value | <code>x.value = newThing</code> (tracked) | Not possible; mutate keys or <code>Object.assign</code> |
| Destructure | Destructure the object that holds refs freely | Loses reactivity; use [toRefs](/interview-question/what-do-toref-and-torefs-do) |
| Pass to a function or composable | Pass the ref, it stays live | Pass the proxy (fine) or a property value (frozen copy) |
| <code>watch(x)</code> | Fires on <code>.value</code> replacement; add <code>deep</code> for nested | Deep by default |
| Identity | The ref is your object; <code>.value</code> is a proxy if it holds an object | Proxy is not <code>===</code> the raw object |
| Opting out of deep tracking | <code>shallowRef</code> | <code>shallowReactive</code>, see [shallowRef and shallowReactive](/interview-question/what-are-shallowref-and-shallowreactive) |

The official Vue guide is direct about the trade-off: after listing the limitations of <code>reactive()</code> (objects only, cannot be replaced, not destructure-friendly), it says "we recommend using <code>ref()</code> as the primary API for declaring reactive state" (source: the <a href="https://vuejs.org/guide/essentials/reactivity-fundamentals.html#limitations-of-reactive" target="_blank" rel="noopener noreferrer">Reactivity Fundamentals guide</a>).

## 6. A Practical Rule

- Default to **<code>ref</code>**, including for objects and arrays. It survives reassignment, destructuring of a returned object, and being handed to [composables](/interview-question/what-are-composables-in-vue).
- Use **<code>reactive</code>** for a cohesive object you will only ever mutate, never replace: a form model, a filter panel. Reset it with <code>Object.assign(form, initial)</code>, not <code>form = reactive(initial)</code>.
- If a composable keeps a reactive object inside, return <code>toRefs(state)</code> so callers can destructure.
- In Pinia, the store itself is reactive, which is why [storeToRefs](/interview-question/why-use-storetorefs-with-pinia) exists.

📌 **Interview term: Reactivity loss** — any operation that copies a value out of the tracked boundary (destructuring, spreading, passing <code>state.count</code>), after which reads no longer go through a getter or trap.

## 7. Common Pitfalls

- **<code>let state = reactive(...)</code> and later <code>state = reactive(...)</code>.** The new proxy is invisible to existing effects. Use a ref, or mutate in place.
- **Forgetting <code>.value</code> in script.** <code>if (isOpen)</code> on a ref is always truthy because the ref object itself is truthy. TypeScript and <code>vue-tsc</code> catch most of these; see [TypeScript with Vue](/interview-question/how-do-you-use-typescript-with-vue-typed-props-emits-refs-vue-tsc).
- **Expecting refs in arrays to unwrap.** <code>reactive([ref(1)])[0]</code> is still a ref, as verified above. The same goes for <code>Map</code> values.
- **Comparing against the raw object.** <code>reactive(raw) === raw</code> is false. Pick one and stick to it; more in [reactivity caveats](/interview-question/what-are-common-reactivity-caveats-in-vue).
- **Assuming the "stale reactive" bug is fixed because it worked once.** As the component run showed, an unrelated re-render can mask it.
- **Spreading a reactive object into a new one.** <code>{ ...state }</code> is a plain snapshot, not a reactive copy.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ref</code> is a box with a tracked <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.value</code> that can hold anything; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reactive</code> is a deep Proxy of one object that you use without <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.value</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The real difference:</strong> <span style="color:#f0e2c8;">"With a ref the tracked boundary is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.value</code>, so replacing the whole value is a tracked write. With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reactive</code> it is the object itself, so assigning a new proxy to the variable is invisible to existing effects."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Reactivity loss:</strong> <span style="color:#f0e2c8;">"Destructuring or spreading a reactive object copies plain values out. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toRefs</code> turns each property into a ref so it can be destructured safely."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Unwrapping:</strong> <span style="color:#f0e2c8;">"Top-level refs unwrap in templates, refs inside a reactive object unwrap on access, but refs inside reactive arrays and Maps stay refs."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. My default:</strong> <span style="color:#f0e2c8;">"I default to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ref</code>, as the Vue docs recommend, and use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reactive</code> for a cohesive object like a form that I mutate but never replace, resetting it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.assign</code>."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ref</code> only for primitives?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ref({ ... })</code> makes the object deeply reactive by passing it through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reactive()</code>, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isReactive(user.value)</code> is true. The ref adds the ability to replace the whole object. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shallowRef</code> if you do not want the deep conversion.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if you call <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">reactive(1)</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In development Vue warns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">value cannot be made reactive: 1</code> and returns the plain number, so nothing is tracked. Primitives have no properties to intercept, which is exactly the case <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ref</code> exists for.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you reset a reactive form to its initial values?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Mutate it in place: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.assign(form, initialValues)</code>. Replacing the variable with a new <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reactive()</code> leaves the template and watchers tracking the old proxy. Alternatively keep the form in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ref</code> and assign <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">form.value = { ...initialValues }</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">watch(userRef, cb)</code> not fire when I change <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">userRef.value.name</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Watching a ref tracks its <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.value</code> only, so it fires on replacement. Watching a reactive object is deep by default. Add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ deep: true }</code> or watch a getter such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">() =&gt; userRef.value.name</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which one does Pinia use, and why does that matter?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A Pinia store is a reactive object, so destructuring <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const { count } = store</code> loses reactivity just like any reactive object. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">storeToRefs(store)</code> returns refs for state and getters while leaving actions out.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **ref** | A box with a tracked <code>.value</code>; holds any value, replaceable |
| **reactive** | A deep Proxy of an object; no <code>.value</code>, not replaceable |
| **Ref unwrapping** | Vue reading <code>.value</code> for you in templates and reactive objects |
| **Reactivity loss** | Copying a value out of the tracked boundary so changes no longer flow |
| **Proxy** | JavaScript wrapper that intercepts reads and writes |

---
**Conclusion:** <code>ref</code> and <code>reactive</code> run on the same track-and-trigger engine but put the tracked boundary in different places. A ref is a permanent box, so you can replace what is inside, pass it around and destructure the object that holds it. A reactive object is a proxy welded to one object, which reads nicely but breaks on reassignment and destructuring. The verified runs show both failure modes, including the sneaky case where an unrelated re-render hides the bug. Default to <code>ref</code>, as the Vue docs recommend, and reach for <code>reactive</code> only for a cohesive object you mutate but never replace.`,
    examples: [
      {
        label: "Replacing a ref vs replacing a reactive, and destructuring (click through it)",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { ref, reactive } from "vue";

// ref: a box with .value. Works for any type, and the whole value can be replaced.
const todosRef = ref(["write tests"]);

// reactive: a Proxy around the object itself. Objects only; do not reassign the variable.
let todosReactive = reactive(["write tests"]);

function replaceRef() {
  todosRef.value = ["ship it"]; // the box is the same, its contents changed: tracked
}

function replaceReactive() {
  todosReactive = reactive(["ship it"]); // a brand-new proxy nobody is tracking yet
  console.log("variable now holds:", todosReactive.join());
}

// Destructuring a reactive object copies the current value and loses the link.
const form = reactive({ email: "a@b.co" });
let { email } = form;
function changeEmail() {
  form.email = "new@b.co";
  console.log("form.email:", form.email, "| destructured email:", email);
}
</script>

<template>
  <p id="ref">ref: {{ todosRef.join(", ") }}</p>
  <p id="reactive">reactive: {{ todosReactive.join(", ") }}</p>
  <p id="email">form: {{ form.email }} / destructured: {{ email }}</p>
  <button id="replace-ref" @click="replaceRef">Replace ref</button>
  <button id="replace-reactive" @click="replaceReactive">Replace reactive</button>
  <button id="email-btn" @click="changeEmail">Change email</button>
</template>
`,
      },
      {
        label: "Seven ref vs reactive behaviours probed in plain Node",
        tech: "js",
        runnable: false,
        code: `import { ref, reactive, isReactive, isRef, watch, effect } from "vue";

const user = ref({ name: "Ada", tags: ["a"] });
console.log("1. isReactive(user.value):", isReactive(user.value));

const n = reactive(1);
console.log("2. reactive(1) returned:", n, "| isReactive:", isReactive(n));

const listRef = ref([1, 2]);
let listReactive = reactive([1, 2]);
effect(() => console.log("   ref effect sees length", listRef.value.length));
effect(() => console.log("   reactive effect sees length", listReactive.length));
listRef.value = [1, 2, 3];
listReactive = reactive([1, 2, 3]); // the effect still holds the OLD proxy
console.log("3. after reassigning both (only the ref effect re-ran)");

const state = reactive({ count: 0 });
let { count } = state;
state.count = 5;
console.log("4. destructured count:", count, "| state.count:", state.count);

const r = ref(10);
const box = reactive({ r });
const arr = reactive([r]);
console.log("5. box.r:", box.r, "| arr[0] isRef:", isRef(arr[0]), "| arr[0].value:", arr[0].value);
box.r = 11;
console.log("   writing box.r updates the ref too:", r.value);

const raw = { id: 1 };
console.log("6. proxied === raw:", reactive(raw) === raw);
`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the difference between computed and watch?",
    seoDescription:
      "computed derives a cached, lazy value; watch runs side effects with old and new values. Why watch-and-copy is stale, verified on Vue 3.5.44.",
    description: `**Question presented to candidate:**
"Both \`computed\` and \`watch\` react to state changes in Vue. How do you decide which one to use? Give me an example where picking the wrong one causes a real bug."

**What a strong answer should cover:**
- \`computed\` **derives a value**: it returns a read-only ref, is **lazy** (runs only when read), **cached** (re-runs only when a dependency changed) and should be a pure function.
- \`watch\` **performs a side effect** when a source changes: fetching, logging, writing to storage, imperatively touching the DOM. It receives the new and old value and is lazy unless \`immediate: true\`.
- A computed only notifies its dependents when its **result** changes (since Vue 3.4).
- Anti-patterns: a \`watch\` that copies a derived value into another ref (stale until the next flush, extra state), a computed with side effects, and an \`async\` computed (its value is a Promise).
- Watch callbacks are **scheduled** (flush \`pre\` by default); a computed is evaluated synchronously on read.
- Options API equivalents are the \`computed\` and \`watch\` options; the reasoning is identical.

**Clarifying questions expected:**
- "Is the value needed in the template, or is the goal to trigger something outside Vue?"
- "Is any of the work asynchronous?"

**Code / implementation expected:** Yes — a filtered list with \`computed\` plus a \`watch\` that records each search.`,
    answer: `**Target Audience:** Vue developers who use both APIs and want a crisp rule for choosing, plus the reasons behind it.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts with the precise vocabulary. Every output below was produced on Vue 3.5.44: the probes with <code>node</code>, the component by compiling it with <code>@vue/compiler-sfc</code> and typing into it in jsdom.

## 1. Why This Even Matters — A Story First

A café has a chalkboard showing "Today's total: £84". Every time a sale rings up, someone *could* rub out the number and rewrite it. But a smarter café puts up a little screen wired to the till: it shows the total whenever anyone looks at it, and only adds things up again if a sale happened since the last look. That screen is a **computed**.

Now the café also wants the manager's phone to buzz whenever the total passes £100. Nobody is "looking at" a buzz; it is an action that happens in the outside world because something changed. That is a **watch**.

The confusion in interviews (and in code reviews) comes from using the buzzer to keep the chalkboard up to date: "when a sale happens, rewrite the total". It works, mostly, but the chalkboard is briefly wrong, there are now two copies of the truth, and one day somebody forgets to update one of them.

## 2. The Core Idea

📌 **Interview term: Computed property** — <code>computed(() => expr)</code> returns a read-only ref whose value is derived from other reactive state. It is **lazy** (the getter does not run until someone reads <code>.value</code>) and **cached** (reading again returns the stored result unless a dependency changed). Use it for anything you would otherwise compute in the template.

📌 **Interview term: Watcher** — <code>watch(source, callback)</code> runs <code>callback(newValue, oldValue)</code> after <code>source</code> changes. It returns nothing useful for rendering; its job is a **side effect**. By default it does not run at setup time (pass <code>immediate: true</code> for that), and its callback is **scheduled** rather than run synchronously.

📌 **Interview term: Side effect** — anything that reaches outside the function: a network request, <code>localStorage</code>, <code>document.title</code>, analytics, a timer, focusing an element.

📌 **Interview term: Pure function** — given the same inputs it returns the same output and changes nothing else. A computed getter should be pure, so Vue is free to run it once, many times, or not at all.

Under the hood both are effects in the same [reactivity system](/interview-question/how-does-vue-s-reactivity-system-work). The difference is what they *produce*: a computed produces a value other effects can depend on; a watcher produces an action.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 260" role="img" aria-label="Both start from reactive state. Computed produces a cached value that the template reads. Watch produces a side effect such as a request or a log.">
  <defs>
    <marker id="q03-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="98" width="170" height="64" rx="10"/>
  <text class="d-text" x="125" y="126" text-anchor="middle">reactive state</text>
  <text class="d-sub" x="125" y="148" text-anchor="middle">query, products</text>
  <rect class="d-box-accent" x="300" y="30" width="170" height="64" rx="10"/>
  <text class="d-text d-accent" x="385" y="58" text-anchor="middle">computed</text>
  <text class="d-sub" x="385" y="80" text-anchor="middle">lazy, cached, pure</text>
  <rect class="d-box-muted" x="300" y="166" width="170" height="64" rx="10"/>
  <text class="d-text" x="385" y="194" text-anchor="middle">watch</text>
  <text class="d-sub" x="385" y="216" text-anchor="middle">new and old value</text>
  <rect class="d-box" x="540" y="30" width="150" height="64" rx="10"/>
  <text class="d-text" x="615" y="58" text-anchor="middle">a value</text>
  <text class="d-sub" x="615" y="80" text-anchor="middle">read by template</text>
  <rect class="d-box" x="540" y="166" width="150" height="64" rx="10"/>
  <text class="d-text" x="615" y="194" text-anchor="middle">an action</text>
  <text class="d-sub" x="615" y="216" text-anchor="middle">fetch, log, save</text>
  <path class="d-edge-accent" d="M 214 116 L 294 70" marker-end="url(#q03-arrow)"/>
  <path class="d-edge" d="M 214 146 L 294 192" marker-end="url(#q03-arrow)"/>
  <path class="d-edge-accent" d="M 474 62 L 534 62" marker-end="url(#q03-arrow)"/>
  <path class="d-edge" d="M 474 198 L 534 198" marker-end="url(#q03-arrow)"/>
</svg>

The top lane ends in a value that can feed other computeds and the render; the bottom lane ends outside Vue. If you can draw your use case on the top lane, it is a computed.

## 3. Verified: Lazy, Cached, and Change-Aware

Run with <code>node</code> against Vue 3.5.44 (an excerpt; the full script is the second example on this page):

\`\`\`js
const items = ref([3, 4, 5]);
let calls = 0;
const sum = computed(() => { calls++; return items.value.reduce((a, b) => a + b, 0); });

console.log("1. getter calls before any read:", calls);
console.log("   read three times:", sum.value, sum.value, sum.value, "| getter calls:", calls);
items.value.push(1);
console.log("   after push, before read, calls:", calls);
console.log("   read again:", sum.value, "| calls:", calls);

const n = ref(2);
const isEven = computed(() => n.value % 2 === 0);
let effectRuns = 0;
effect(() => { isEven.value; effectRuns++; });
n.value = 4; n.value = 6; n.value = 7;
console.log("2. effect runs (1 initial + changes of isEven only):", effectRuns);
\`\`\`

\`\`\`
1. getter calls before any read: 0
   read three times: 12 12 12 | getter calls: 1
   after push, before read, calls: 1
   read again: 13 | calls: 2
2. effect runs (1 initial + changes of isEven only): 2
\`\`\`

- **Lazy:** zero getter calls until the first read, and the <code>push</code> only marked it dirty; the getter ran again on the next read.
- **Cached:** three reads, one getter call.
- **Change-aware:** <code>n</code> changed three times but <code>isEven</code> only flipped once (6 to 7), so its dependent ran once. This is the Vue 3.4 behaviour described in the <a href="https://blog.vuejs.org/posts/vue-3-4" target="_blank" rel="noopener noreferrer">Announcing Vue 3.4</a> post: before 3.4, an effect reading such a computed fired on every change of <code>n</code>.

The rest of the same run covered the watch side and two misuses:

\`\`\`
3. watch: "vue" -> "vue 3.5" (would fetch here)
4. async computed value: a Promise
[Vue warn] Write operation failed: computed value is readonly
5. sum after write attempt: 13
\`\`\`

An <code>async</code> getter makes the computed's value a Promise, which a template cannot display; that work belongs in a watcher (see [data fetching](/interview-question/how-do-you-fetch-data-in-a-vue-component-loading-errors-cancellation)). Writing to a getter-only computed warns and is ignored; if you genuinely need to write, see [writable computed](/interview-question/can-a-computed-property-be-writable).

## 4. Verified: the Classic Wrong Choice

Deriving a value with <code>watch</code> plus a second ref is the most common misuse. It is not just verbose, it is **observably stale**:

\`\`\`js
const first = ref("Ada");
const last = ref("Lovelace");

// Anti-pattern: deriving state with watch + a second ref
const fullViaWatch = ref(\`\${first.value} \${last.value}\`);
watch([first, last], ([f, l]) => { fullViaWatch.value = \`\${f} \${l}\`; });

// The right tool: computed
const fullViaComputed = computed(() => \`\${first.value} \${last.value}\`);

first.value = "Grace";
console.log("same tick  | watch-derived:", fullViaWatch.value, "| computed:", fullViaComputed.value);
await nextTick();
console.log("next tick  | watch-derived:", fullViaWatch.value, "| computed:", fullViaComputed.value);
\`\`\`

\`\`\`
same tick  | watch-derived: Ada Lovelace | computed: Grace Lovelace
next tick  | watch-derived: Grace Lovelace | computed: Grace Lovelace
\`\`\`

The watcher's callback is queued for the next flush, so any code that reads <code>fullViaWatch</code> right after the write sees the old name. A computed is evaluated on read, so it can never be out of date.

## 5. Verified: Both in One Component

The runnable example filters a product list with <code>computed</code> and records each search with <code>watch</code>. Typing two queries and then reading the computed twice printed:

\`\`\`
[app] RENDERED: Vue mugVue shirtReact mugPinia stickerRead twicehistory:
watch fired: "" -> "mug"
[typed "mug"] Vue mugReact mugRead twicehistory: (empty) -> mug
watch fired: "mug" -> "vue mug"
[typed "vue mug"] Vue mugRead twicehistory: (empty) -> mug | mug -> vue mug
count: 1 1 | filter runs so far: 3
\`\`\`

Three filter runs: one for the first render and one per query. Reading <code>visible.value.length</code> twice more added none, because nothing changed. The watcher saw both the old and the new query, which a computed never gets.

## 6. Side by Side

| | <code>computed</code> | <code>watch</code> |
| :--- | :--- | :--- |
| Purpose | Derive a value | Run a side effect |
| Returns | A read-only ref (writable with get/set) | A handle to stop, pause or resume |
| When it runs | On read, only if dirty | After the source changes, at the next flush (<code>pre</code> by default) |
| Runs at setup | Not until read | No, unless <code>immediate: true</code> |
| Old value | Not available (the getter can receive the previous value since 3.4) | <code>(newValue, oldValue)</code> |
| Async work | No: the value becomes a Promise | Yes |
| Caching | Yes | Not applicable |
| Dependencies | Auto-tracked from what the getter reads | Only the declared source |
| Options API | <code>computed: { total() { ... } }</code> | <code>watch: { query(now, before) { ... } }</code> |

For the difference between <code>watch</code> and its auto-tracking sibling, see [watch vs watchEffect](/interview-question/what-is-the-difference-between-watch-and-watcheffect). React developers will recognise the split as [useMemo](/interview-question/what-is-the-difference-between-usememo-and-usecallback) versus [useEffect](/interview-question/explain-the-purpose-of-useeffect), except that Vue tracks the dependencies for you.

## 7. Decision Rule

1. **Will a template, another computed, or a function read the result?** Use <code>computed</code>.
2. **Does something need to happen outside Vue's state (request, storage, title, analytics, imperative DOM)?** Use <code>watch</code>.
3. **Do you need the previous value to decide what to do?** Use <code>watch</code>.
4. **Is the work asynchronous?** Use <code>watch</code> and write the result into a ref, ideally with cancellation (<code>onWatcherCleanup</code>, covered in [flush timing and the 3.5 watch options](/interview-question/watch-vs-watcheffect-flush-timing-and-the-new-watch-options-in-3-5)).

## 8. Common Pitfalls

- **Watch-and-copy instead of computed.** As section 4 showed, the copy is stale until the next flush and doubles the state to keep in sync.
- **Side effects in a computed getter.** Because it is lazy and cached, the effect may run zero times or at surprising moments. Logging is fine for debugging; mutating other state is not.
- **An <code>async</code> computed.** Its value is a Promise. Fetch in a watcher.
- **Expensive work in a method called from the template.** A method re-runs on every render; a computed only when its inputs change.
- **Watching a computed only to derive another value.** Chain computeds instead; a computed can read another computed.
- **Forgetting <code>immediate: true</code>.** A watcher that loads data for the initial id will not run until the id changes for the first time.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> derives a value; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watch</code> performs a side effect when something changes."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Computed properties:</strong> <span style="color:#f0e2c8;">"A computed is lazy and cached: the getter runs on first read and again only after a dependency changed, and since 3.4 it notifies dependents only when its result really changes."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Watchers:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watch</code> takes an explicit source and calls back with the new and old value at the next flush. It is lazy unless <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">immediate: true</code>, and it is where async work like fetching belongs."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The classic mistake:</strong> <span style="color:#f0e2c8;">"Using a watcher to copy a derived value into another ref. It doubles the state and is stale until the flush; I verified it reads the old name right after the write, while the computed is already correct."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Rule of thumb:</strong> <span style="color:#f0e2c8;">"If something reads the result, use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code>. If something has to happen in the outside world, or I need the old value, use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watch</code>."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a computed be asynchronous?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not usefully. An <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">async</code> getter returns a Promise, so the computed value is a Promise and the template shows nothing meaningful. Do async work in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watch</code> (or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watchEffect</code>) and write the result into a ref, cancelling stale requests with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onWatcherCleanup</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is a computed better than a method in the template?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A method is called on every render of the component. A computed caches its result and only re-runs when one of its tracked dependencies changes, so expensive filtering or sorting does not repeat on unrelated re-renders.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a computed have side effects?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It should not. Because it is lazy and cached, Vue may run the getter zero times or at a time you did not expect. Side effects belong in watchers, where the timing is defined by the flush option.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can I watch a computed?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, a computed is a ref, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watch(total, cb)</code> works and is a good way to react to a derived value. Because of the 3.4 change, the watcher only fires when the computed result actually changes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you do this in the Options API?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The same split: a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed: { visible() { ... } }</code> option for derived values and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watch: { query(now, before) { ... } }</code> option for side effects. The Composition API functions are the same mechanism with explicit imports.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Computed property** | A cached, lazily evaluated value derived from reactive state |
| **Watcher** | A callback run after a specific source changes, for side effects |
| **Side effect** | Work that reaches outside the function: network, storage, DOM |
| **Pure function** | Same inputs, same output, changes nothing else |
| **Lazy evaluation** | Not computed until someone reads it |

---
**Conclusion:** <code>computed</code> answers "what is this value?" and <code>watch</code> answers "what should happen when this changes?". The verified runs show why the line matters: a computed is lazy, cached and, since 3.4, only notifies dependents when its result really changes, while a watch-and-copy is visibly stale until the next flush and an async computed hands the template a Promise. Use <code>computed</code> for anything you would read, <code>watch</code> for anything you would do, and you will rarely need to think harder than that.`,
    examples: [
      {
        label: "Filter with computed, record searches with watch",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { ref, computed, watch } from "vue";

const products = ref(["Vue mug", "Vue shirt", "React mug", "Pinia sticker"]);
const query = ref("");
const history = ref([]);
let filterRuns = 0;

// computed: DERIVE a value. Cached, lazy, and re-run only when query or products change.
const visible = computed(() => {
  filterRuns++;
  const q = query.value.toLowerCase();
  return products.value.filter((p) => p.toLowerCase().includes(q));
});

// watch: DO something when a source changes. Here: a side effect (record the search).
watch(query, (now, before) => {
  history.value.push(\`\${before || "(empty)"} -> \${now}\`);
  console.log(\`watch fired: "\${before}" -> "\${now}"\`);
});

function readTwice() {
  // Reading a cached computed again does not re-run the filter.
  console.log("count:", visible.value.length, visible.value.length, "| filter runs so far:", filterRuns);
}
</script>

<template>
  <input v-model="query" placeholder="search" />
  <ul>
    <li v-for="p in visible" :key="p">{{ p }}</li>
  </ul>
  <button @click="readTwice">Read twice</button>
  <p id="history">history: {{ history.join(" | ") }}</p>
</template>
`,
      },
      {
        label: "Lazy, cached, change-aware computed vs watch, probed in Node",
        tech: "js",
        runnable: false,
        code: `import { ref, computed, watch, effect, nextTick } from "vue";

const items = ref([3, 4, 5]);
let calls = 0;
const sum = computed(() => { calls++; return items.value.reduce((a, b) => a + b, 0); });

console.log("1. getter calls before any read:", calls);           // lazy
console.log("   read three times:", sum.value, sum.value, sum.value, "| getter calls:", calls); // cached
items.value.push(1);
console.log("   after push, before read, calls:", calls);          // still lazy: marked dirty only
console.log("   read again:", sum.value, "| calls:", calls);

// 2. A computed only notifies dependents when its VALUE changes
const n = ref(2);
const isEven = computed(() => n.value % 2 === 0);
let effectRuns = 0;
effect(() => { isEven.value; effectRuns++; });
n.value = 4; n.value = 6; n.value = 7;
console.log("2. effect runs (1 initial + changes of isEven only):", effectRuns);

// 3. watch: lazy by default, gives new and old values, meant for side effects
const query = ref("vue");
watch(query, (now, before) => console.log(\`3. watch: "\${before}" -> "\${now}" (would fetch here)\`));
query.value = "vue 3.5";
await nextTick();

// 4. async work inside computed gives you a Promise, not a value
const bad = computed(async () => query.value.toUpperCase());
console.log("4. async computed value:", bad.value instanceof Promise ? "a Promise" : bad.value);

// 5. writing to a getter-only computed
sum.value = 100;
console.log("5. sum after write attempt:", sum.value);
`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Can a computed property be writable?",
    seoDescription:
      "Yes: computed({ get, set }) makes a writable computed. The setter stores nothing and writes the source. v-model use cases, defineModel and 3.5 typing.",
    description: `**Question presented to candidate:**
"Computed properties are usually read-only. Can you make one writable in Vue 3? Show me the syntax, explain what actually happens on assignment, and give me a case where you would really use it."

**What a strong answer should cover:**
- Yes: pass an object with \`get\` and \`set\` to \`computed({ get, set })\`; it returns a \`WritableComputedRef\`.
- The setter **stores nothing**. It must write back to the source state; the next read re-runs the getter, so the getter always wins.
- Writing to a getter-only computed logs the dev warning \`Write operation failed: computed value is readonly\` and is ignored.
- Real uses: \`v-model\` on a prop (get from the prop, set by emitting \`update:modelValue\`), two views of one source (Celsius and Fahrenheit), parsing and clamping input, and binding \`v-model\` to store state.
- Since Vue 3.4 \`defineModel()\` covers the prop-plus-emit case in \`<script setup>\`; the getter also receives the previous value (3.4), and getter and setter types may differ (3.5).
- Keep setters synchronous and side-effect free apart from writing the source.

**Clarifying questions expected:**
- "Is this for a component's own state, or to support \`v-model\` on a child?"
- "Which Vue version? \`defineModel\` changes the answer from 3.4 on."

**Code / implementation expected:** Yes — a get/set computed bound with \`v-model\`, ideally a child component that supports \`v-model\` through one.`,
    answer: `**Target Audience:** Vue developers who know read-only <code>computed</code> and want to know when a writable one is the right tool.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts with the vocabulary an interviewer expects. All output below was produced on Vue 3.5.44: the probe with <code>node</code>, the type errors with TypeScript 5 against Vue's own typings, and the component by compiling it with <code>@vue/compiler-sfc</code> and typing into it in jsdom.

## 1. Why This Even Matters — A Story First

A hotel room thermostat stores the temperature in Celsius, because that is what the heating system understands. An American guest turns the dial and sees Fahrenheit. When they set it to 72, the thermostat does not keep "72" anywhere; it converts it to 22 °C, stores *that*, and the dial then shows whatever 22 °C is in Fahrenheit.

That dial is a **writable computed**. Reading it converts from the real source. Writing it converts back and updates the real source. The dial itself has no memory, which is the single most important fact to get right in an interview.

## 2. The Core Idea

📌 **Interview term: Writable computed** — a computed created with an options object instead of a function: <code>computed({ get, set })</code>. Reading <code>.value</code> calls <code>get</code> (lazily and cached, like any computed); assigning <code>.value = x</code> calls <code>set(x)</code>. The return type is <code>WritableComputedRef</code>.

📌 **Interview term: Source of truth** — the state the computed derives from. The setter's whole job is to update the source of truth so that the getter, on its next run, produces the value you wanted.

📌 **Interview term: Round trip** — writing a value through the setter and reading it back through the getter. A well-behaved writable computed round-trips: what you write is what you read, or a deliberately normalised version of it (clamped, rounded, trimmed).

The basic shape, from the probe below:

\`\`\`js
const fullName = computed({
  get: () => \`\${first.value} \${last.value}\`,
  set: (v) => { [first.value, last.value = ""] = v.split(" "); },
});
fullName.value = "Grace Hopper"; // calls set, which writes first and last
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 720 250" role="img" aria-label="Assigning calls the setter, which writes the source refs. The next read runs the getter from those sources.">
  <defs>
    <marker id="q04-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="40" y="40" width="190" height="64" rx="10"/>
  <text class="d-text d-accent" x="135" y="68" text-anchor="middle">fullName.value = x</text>
  <text class="d-sub" x="135" y="90" text-anchor="middle">an assignment</text>
  <rect class="d-box" x="290" y="40" width="150" height="64" rx="10"/>
  <text class="d-text" x="365" y="68" text-anchor="middle">set(x)</text>
  <text class="d-sub" x="365" y="90" text-anchor="middle">stores nothing</text>
  <rect class="d-box-muted" x="500" y="40" width="180" height="64" rx="10"/>
  <text class="d-text" x="590" y="68" text-anchor="middle">source refs</text>
  <text class="d-sub" x="590" y="90" text-anchor="middle">first, last</text>
  <rect class="d-box" x="500" y="160" width="180" height="64" rx="10"/>
  <text class="d-text" x="590" y="188" text-anchor="middle">get()</text>
  <text class="d-sub" x="590" y="210" text-anchor="middle">runs on next read</text>
  <rect class="d-box-accent" x="40" y="160" width="190" height="64" rx="10"/>
  <text class="d-text d-accent" x="135" y="188" text-anchor="middle">fullName.value</text>
  <text class="d-sub" x="135" y="210" text-anchor="middle">what you read back</text>
  <path class="d-edge-accent" d="M 234 72 L 284 72" marker-end="url(#q04-arrow)"/>
  <path class="d-edge-accent" d="M 444 72 L 494 72" marker-end="url(#q04-arrow)"/>
  <path class="d-edge" d="M 590 108 L 590 154" marker-end="url(#q04-arrow)"/>
  <path class="d-edge" d="M 496 192 L 236 192" marker-end="url(#q04-arrow)"/>
</svg>

The value travels a loop: the assignment goes into the setter, the setter writes the sources, the sources mark the computed dirty, and the next read runs the getter. There is no shortcut where the assigned value is stored and returned directly.

## 3. Verified: What Assignment Really Does

This script ran with <code>node</code> against Vue 3.5.44 (it is the second example on this page):

\`\`\`
1. Ada Lovelace
   setter called with "Grace Hopper"
   first: Grace | last: Hopper | fullName: Grace Hopper | getter runs: 2
2. wrote 250, read back: 100
   ignored 7
3. after writing 7: 42
4. previous-value getter: 2->2, 3->2, 4->4, 5->4, 7->4
[Vue warn] Write operation failed: computed value is readonly
\`\`\`

Line by line:

1. The setter received the string and split it into the two source refs; the getter then ran a second time to produce the new full name.
2. A setter that clamps to 0..100 turned a write of 250 into a read of 100. Normalising in the setter is legitimate and useful.
3. A setter that ignores its argument changes nothing: the getter still returns 42. This is the "the setter stores nothing" rule made visible.
4. Since Vue 3.4 the getter receives the **previous** value as its first argument (<code>computed((previous) => ...)</code>), here used to remember the last even number. The 3.4 changelog lists it as "expose last result for computed getter" (vuejs/core #9497).
5. Assigning to a getter-only computed prints the exact warning <code>Write operation failed: computed value is readonly</code> in development and does nothing.

## 4. Verified: Getter and Setter Types Can Differ (3.5)

Vue 3.5 changed the typings so the setter may accept a different type from the one the getter returns (changelog: "allow computed getter and setter types to be unrelated", vuejs/core #11472). The second type parameter is the setter type:

\`\`\`ts
const cents = ref(1999);
const price = computed<string, string | number>({
  get: () => (cents.value / 100).toFixed(2),
  set: (v) => { cents.value = Math.round(Number(v) * 100); },
});

price.value = 12.5;        // ok: number accepted by the setter
price.value = "7.25";      // ok: string accepted too
const shown: string = price.value; // reading always gives a string
const wrong: number = price.value; // error
price.value = true;        // error
\`\`\`

Running <code>tsc --strict</code> on that file reported exactly the two intended errors:

\`\`\`
types.ts(14,7): error TS2322: Type 'string' is not assignable to type 'number'.
types.ts(15,1): error TS2322: Type 'boolean' is not assignable to type 'string | number'.
\`\`\`

## 5. Verified: the Two Classic Uses in One Component

The runnable example has a Celsius/Fahrenheit pair (one ref, one writable computed, both bound with <code>v-model</code>) and a child <code>Toggle</code> that supports <code>v-model</code> through a writable computed over its prop. Typing and clicking in jsdom printed:

\`\`\`
[app] RENDERED: C F 20 C = 68 FOFFparent darkMode: false
setter got 212
[typed 212 F] 100 C = 212 F | OFF | parent darkMode: false
[typed -40 C] -40 C = -40 F | OFF | parent darkMode: false
[clicked toggle] -40 C = -40 F | ON | parent darkMode: true
\`\`\`

Typing 212 into the Fahrenheit box called the setter, which wrote 100 into <code>celsius</code>; the Celsius box and the label followed. Typing into the Celsius box never touched the setter: the Fahrenheit getter just re-ran.

The <code>Toggle</code> is the pattern every Vue 3 codebase before 3.4 used for [v-model on components](/interview-question/how-does-v-model-work-on-components):

\`\`\`js
const on = computed({
  get: () => props.modelValue,                // read from the parent
  set: (v) => emit("update:modelValue", v),   // ask the parent to change it
});
\`\`\`

The child never mutates its [prop](/interview-question/what-are-props-in-vue-and-how-do-you-validate-them); the setter emits, the parent updates its ref, the new prop flows down, and the getter reflects it.

## 6. Writable Computed vs the Alternatives

| Need | Best tool | Why |
| :--- | :--- | :--- |
| <code>v-model</code> on a child in <code>&lt;script setup&gt;</code>, Vue 3.4+ | <code>defineModel()</code> | Generates the prop, the emit and a writable ref for you. See [defineModel](/interview-question/what-is-definemodel-in-vue-3-4-and-how-does-it-replace-manual-prop-emit) |
| <code>v-model</code> on a child, Options API or older Vue | Writable computed over the prop | The pattern from section 5 |
| Two editable views of one value | Writable computed | One source of truth, no syncing watchers |
| <code>v-model</code> bound to store state | Writable computed whose setter calls a store action | Keeps mutations inside the store. See [Pinia](/interview-question/what-is-pinia-and-why-use-it) |
| A value the user edits that nothing derives | Plain <code>ref</code> | A computed adds indirection for nothing |
| Derived value nobody writes | Getter-only <code>computed</code> | See [computed vs watch](/interview-question/what-is-the-difference-between-computed-and-watch) |

<code>defineModel()</code> became stable in Vue 3.4 (the <a href="https://blog.vuejs.org/posts/vue-3-4" target="_blank" rel="noopener noreferrer">Announcing Vue 3.4</a> post lists its stabilization), so in modern <code>&lt;script setup&gt;</code> code you rarely hand-write the prop-plus-emit version. You still need the underlying idea, because <code>defineModel</code> returns exactly this kind of ref, and it accepts its own <code>get</code> and <code>set</code> options for transforming values.

## 7. Common Pitfalls

- **Thinking the setter stores the value.** It does not. If the setter forgets to write the source, the computed snaps back, as the "after writing 7: 42" line showed.
- **Mutating a prop inside the setter.** Props are read-only in the child. Emit an update event instead; the parent owns the data.
- **A getter and setter that do not round-trip.** Rounding in both directions can make a typed value jump (type 71 °F, see 72 °F). Decide which side normalises and keep the other exact.
- **Async work in the setter.** The getter re-runs immediately with the old source and the UI flickers. Do async work in an action or a watcher and keep the setter a plain write.
- **Using a writable computed where a ref would do.** If nothing is derived, the extra indirection only makes the code harder to follow.
- **Writing to a getter-only computed and missing the warning.** In production builds the warning is stripped, so the write just silently does nothing.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"Yes. Pass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> an object with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set</code>, and assigning <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.value</code> calls the setter."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The key insight:</strong> <span style="color:#f0e2c8;">"The setter stores nothing. It must write back to the source of truth, and the next read re-runs the getter, so a setter that clamps or ignores the value changes what you read back."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Where I use it:</strong> <span style="color:#f0e2c8;">"Two editable views of one value, like Celsius and Fahrenheit, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-model</code> on a child: get from the prop, set by emitting <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">update:modelValue</code>, so the child never mutates its prop."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Modern Vue:</strong> <span style="color:#f0e2c8;">"Since 3.4 <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineModel()</code> generates that prop, emit and writable ref for me, and the getter also receives the previous value. In 3.5 the setter type can differ from the getter type."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The guard rail:</strong> <span style="color:#f0e2c8;">"Writing a getter-only computed warns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Write operation failed: computed value is readonly</code> in dev and is ignored, and the warning is stripped in production."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where does the assigned value live?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Nowhere in the computed. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set(x)</code> runs, writes the source refs, and those writes mark the computed dirty. The next <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.value</code> read runs the getter from the sources. If the setter ignores <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code>, reading back gives the old result.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just mutate the prop in the child?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Props are read-only in the child and Vue warns on writes. The parent owns the data, so the setter emits <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">update:modelValue</code> and the parent updates its own ref, which flows back down as the new prop value.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">defineModel</code> relate to this?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is a compiler macro that declares the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">modelValue</code> prop and the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">update:modelValue</code> emit and returns a ref whose setter emits. It also accepts <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set</code> options to transform values, which is the writable computed idea packaged up.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can getter and setter types differ?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Since Vue 3.5, yes: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed&lt;string, string | number&gt;({ ... })</code> reads as a string but accepts a string or a number. Before 3.5 both sides had to use the same type parameter.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you ever put async logic in the setter?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. The getter re-runs immediately against the unchanged source, so the UI would show the old value until the async work finished. Do the async work in a store action or a watcher and keep the setter a synchronous write.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Writable computed** | <code>computed({ get, set })</code>: readable like a computed, assignable through a setter |
| **WritableComputedRef** | The type returned by the get/set form |
| **Source of truth** | The real state the setter writes and the getter reads |
| **Round trip** | Write through the setter, read back through the getter |
| **defineModel** | The 3.4+ macro that creates the prop, emit and writable ref for <code>v-model</code> |

---
**Conclusion:** Yes, a computed can be writable: give <code>computed</code> a <code>get</code> and a <code>set</code>. The key insight, verified above, is that the setter stores nothing; it writes the source of truth, and the next read runs the getter, so a setter that clamps or ignores its input changes what you read back. That makes writable computeds ideal for two editable views of one value and for <code>v-model</code> over a prop or store, with <code>defineModel()</code> now generating the prop case for you in Vue 3.4+, and 3.5 letting the setter accept a wider type than the getter returns.`,
    examples: [
      {
        label: "Celsius/Fahrenheit and a v-model Toggle built on writable computeds",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { ref, computed, defineComponent, h } from "vue";

// 1. One source of truth (celsius), two editable views of it.
const celsius = ref(20);
const fahrenheit = computed({
  get: () => Math.round((celsius.value * 9) / 5 + 32),
  set: (f) => {
    console.log("setter got", f);
    celsius.value = Math.round(((f - 32) * 5) / 9); // write back to the source
  },
});

// 2. The classic use: a child that supports v-model without mutating its prop.
const Toggle = defineComponent({
  props: { modelValue: Boolean },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    const on = computed({
      get: () => props.modelValue,            // read from the parent
      set: (v) => emit("update:modelValue", v), // ask the parent to change it
    });
    return () => h("button", { id: "toggle", onClick: () => (on.value = !on.value) }, on.value ? "ON" : "OFF");
  },
});
const darkMode = ref(false);
</script>

<template>
  <label>C <input id="c" type="number" v-model.number="celsius" /></label>
  <label>F <input id="f" type="number" v-model.number="fahrenheit" /></label>
  <p id="temp">{{ celsius }} C = {{ fahrenheit }} F</p>
  <Toggle v-model="darkMode" />
  <p id="dark">parent darkMode: {{ darkMode }}</p>
</template>
`,
      },
      {
        label: "What assignment really does: setter, clamping, previous value, readonly warning",
        tech: "js",
        runnable: false,
        code: `import { ref, computed, watch } from "vue";

// 1. Basic writable computed: the setter writes back to the SOURCE refs
const first = ref("Ada");
const last = ref("Lovelace");
let getterRuns = 0;
const fullName = computed({
  get: () => { getterRuns++; return \`\${first.value} \${last.value}\`; },
  set: (v) => {
    console.log(\`   setter called with "\${v}"\`);
    [first.value, last.value = ""] = v.split(" ");
  },
});
console.log("1.", fullName.value);
fullName.value = "Grace Hopper";
console.log("   first:", first.value, "| last:", last.value, "| fullName:", fullName.value, "| getter runs:", getterRuns);

// 2. The setter does not store anything: if it ignores the value, the getter wins
const clamped = ref(5);
const percent = computed({
  get: () => clamped.value,
  set: (v) => { clamped.value = Math.min(100, Math.max(0, v)); },
});
percent.value = 250;
console.log("2. wrote 250, read back:", percent.value);

// 3. A setter with no effect on the sources: value does not change
const fixed = computed({ get: () => 42, set: (v) => console.log("   ignored", v) });
fixed.value = 7;
console.log("3. after writing 7:", fixed.value);

// 4. Since 3.4 the getter receives the previous value
const count = ref(2);
const lastEven = computed((previous) => (count.value % 2 === 0 ? count.value : previous));
const seen = [];
for (const v of [2, 3, 4, 5, 7]) { count.value = v; seen.push(\`\${v}->\${lastEven.value}\`); }
console.log("4. previous-value getter:", seen.join(", "));

// 5. Getter-only computed is readonly
const doubled = computed(() => count.value * 2);
doubled.value = 1;
`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the difference between watch and watchEffect?",
    seoDescription:
      "watch tracks a declared source lazily with old and new values; watchEffect runs now and auto-tracks reads, but not after await. Verified on Vue 3.5.44.",
    description: `**Question presented to candidate:**
"Vue 3 gives you both \`watch\` and \`watchEffect\`. What is the actual difference between them, and how do you choose? Talk me through a case where \`watchEffect\` surprises people."

**What a strong answer should cover:**
- \`watch(source, cb)\` tracks **only the declared source** (a ref, a getter, a reactive object or an array of these) and calls \`cb(newValue, oldValue)\`.
- \`watchEffect(fn)\` has **no source list**: it runs \`fn\` **immediately** and tracks every reactive read made during that run, re-collecting dependencies on each run.
- \`watch\` is **lazy** by default (\`immediate: true\` changes that); \`watchEffect\` is always eager. Only \`watch\` gives you the **old value**.
- With \`watchEffect\`, only reads **before the first \`await\`** are tracked, and conditional branches only track what actually ran.
- Both return a handle to stop them (plus \`pause\`/\`resume\` since 3.5) and both are stopped automatically with the component.
- Choose \`watch\` when you need precise control or the old value; \`watchEffect\` when the effect reads several values and should simply re-run when any of them change.

**Clarifying questions expected:**
- "Does the side effect need the previous value, or just the current state?"
- "Is the work async? That changes what \`watchEffect\` can track."

**Code / implementation expected:** Yes — the same pair of refs observed with \`watch\` and with \`watchEffect\`, logging when each runs.`,
    answer: `**Target Audience:** Vue developers who reach for watchers and want to choose between the two on purpose rather than by habit.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts with the vocabulary interviewers listen for. Every output below was produced on Vue 3.5.44, with <code>node</code> for the reactivity probe and with <code>@vue/compiler-sfc</code> plus jsdom for the components. This page is about the *tracking model*; the scheduling details (<code>flush</code>, and the 3.4 and 3.5 options) have their own page: [flush timing and the new watch options](/interview-question/watch-vs-watcheffect-flush-timing-and-the-new-watch-options-in-3-5).

## 1. Why This Even Matters — A Story First

Two security guards are hired to protect a museum.

The first guard gets a **list**: "watch the Vermeer and the front door". She stands where she can see exactly those two things. When one of them changes, she writes down what it looked like before and what it looks like now. A broken window in the next room is not her problem; it was not on the list.

The second guard gets **no list**. Instead, he walks his route once at opening time and quietly remembers everything he glanced at. From then on, if anything he looked at changes, he walks the whole route again. He never has to be told what to watch, but he also cannot tell you what anything looked like before, and if he skips a room one morning, that room is off his radar until he walks through it again.

The first guard is <code>watch</code>. The second is <code>watchEffect</code>. Neither is better; they fail in different ways, and interviewers want to hear that you know which way each one fails.

## 2. The Core Idea

📌 **Interview term: Watch source** — what <code>watch</code> observes: a ref, a getter function such as <code>() => state.count</code>, a reactive object (watched deeply), or an array of these. Nothing outside the source is tracked, even if the callback reads it.

📌 **Interview term: Automatic dependency tracking** — <code>watchEffect(fn)</code> runs <code>fn</code> and records every reactive read made during that run, exactly like a component render or a <code>computed</code>. The dependency list is **re-collected on every run**, so it always matches the code path that executed last time. See [how Vue reactivity works](/interview-question/how-does-vue-s-reactivity-system-work).

📌 **Interview term: Lazy vs eager watcher** — a lazy watcher does nothing until its source changes (<code>watch</code> by default); an eager one runs at creation (<code>watchEffect</code> always; <code>watch</code> with <code>immediate: true</code>).

📌 **Interview term: Watch handle** — the function both APIs return. Calling it stops the watcher; since Vue 3.5 it also has <code>pause()</code> and <code>resume()</code> methods. Watchers created during a component's <code>setup</code> are stopped automatically when it unmounts.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 280" role="img" aria-label="watch observes a declared source and calls back with new and old values. watchEffect runs the function, records what it read, and re-runs when any of those change.">
  <defs>
    <marker id="q05-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="180" y="30" text-anchor="middle">watch(userId, cb)</text>
  <rect class="d-box" x="70" y="52" width="220" height="60" rx="10"/>
  <text class="d-text" x="180" y="78" text-anchor="middle">declared source</text>
  <text class="d-sub" x="180" y="98" text-anchor="middle">userId only</text>
  <path class="d-edge" d="M 180 116 L 180 158" marker-end="url(#q05-arrow)"/>
  <rect class="d-box-muted" x="70" y="164" width="220" height="60" rx="10"/>
  <text class="d-text" x="180" y="190" text-anchor="middle">cb(new, old)</text>
  <text class="d-sub" x="180" y="210" text-anchor="middle">lazy by default</text>
  <text class="d-text" x="540" y="30" text-anchor="middle">watchEffect(fn)</text>
  <rect class="d-box-accent" x="430" y="52" width="220" height="60" rx="10"/>
  <text class="d-text d-accent" x="540" y="78" text-anchor="middle">run fn now</text>
  <text class="d-sub" x="540" y="98" text-anchor="middle">record every read</text>
  <path class="d-edge-accent" d="M 540 116 L 540 158" marker-end="url(#q05-arrow)"/>
  <rect class="d-box" x="430" y="164" width="220" height="60" rx="10"/>
  <text class="d-text" x="540" y="190" text-anchor="middle">any read changes</text>
  <text class="d-sub" x="540" y="210" text-anchor="middle">run fn again</text>
  <path class="d-edge-dashed" d="M 654 194 L 690 194 L 690 82 L 656 82" marker-end="url(#q05-arrow)"/>
</svg>

On the left the dependency list is written by you and never changes. On the right it is whatever the last run read, which is why the arrow loops back: every re-run rebuilds the list.

## 3. Verified: Explicit vs Automatic Tracking

The probe below creates one <code>watch</code> on <code>userId</code> and one <code>watchEffect</code> that reads <code>userId</code>, <code>lang</code>, and <code>debugLevel</code> only when <code>showDebug</code> is true. It was run with <code>node</code> against Vue 3.5.44:

\`\`\`js
watch(userId, (id, old) => console.log(\`watch(userId): \${old} -> \${id}\`));
watchEffect(() => {
  let line = \`watchEffect: user \${userId.value}, lang \${lang.value}\`;
  if (showDebug.value) line += \`, debug \${debugLevel.value}\`;
  console.log(line);
});
\`\`\`

\`\`\`
--- setup
watchEffect: user 1, lang en
--- lang = de (only watchEffect reads lang)
watchEffect: user 1, lang de
--- debugLevel = 2 (not read yet: nothing runs)
--- showDebug = true
watchEffect: user 1, lang de, debug 2
--- debugLevel = 3 (now it is a dependency)
watchEffect: user 1, lang de, debug 3
--- userId = 2 (both)
watch(userId): 1 -> 2
watchEffect: user 2, lang de, debug 3
\`\`\`

- At setup, <code>watchEffect</code> ran immediately; <code>watch</code> stayed silent.
- <code>lang</code> changes only reach <code>watchEffect</code>, because only it read <code>lang</code>.
- <code>debugLevel = 2</code> triggered **nothing**: the branch that reads it had not run. After <code>showDebug</code> flipped, the next run read it, and from then on it was a dependency.
- Only <code>watch</code> can print <code>1 -> 2</code>; <code>watchEffect</code> has no old value.

## 4. Verified: the Async Surprise

The behaviour that surprises people most: in an <code>async</code> <code>watchEffect</code>, **only reads before the first <code>await</code> are tracked**. Tracking is tied to the synchronous run; after the <code>await</code>, the function is resumed later from a microtask, when Vue is no longer recording.

\`\`\`js
watchEffect(async () => {
  const p = page.value;                 // tracked
  await Promise.resolve();
  console.log(\`async effect: page \${p}, size \${size.value}\`); // size: NOT tracked
});
\`\`\`

\`\`\`
async effect: page 1, size 10
(size change did not re-run it)
async effect: page 2, size 50
\`\`\`

Changing <code>size</code> to 50 did nothing. Changing <code>page</code> re-ran the effect, which then happened to read the new <code>size</code>. The fix is to read everything you depend on up front, or to switch to <code>watch([page, size], ...)</code>, where the dependencies do not depend on timing at all. For request cancellation in either API, see [data fetching](/interview-question/how-do-you-fetch-data-in-a-vue-component-loading-errors-cancellation).

## 5. Verified: What Counts as a Watch Source

From the same run:

\`\`\`js
watch(() => state.count, (v) => console.log("getter source fired:", v));
watch([userId, () => state.count], ([id, c], [oldId, oldC]) => console.log(\`array source: [\${oldId},\${oldC}] -> [\${id},\${c}]\`));
watch(state.count, () => {});
\`\`\`

\`\`\`
[Vue warn]: Invalid watch source:  0 A watch source can only be a getter/effect function, a ref, a reactive object, or an array of these types.
getter source fired: 1
array source: [2,0] -> [2,1]
\`\`\`

<code>watch(state.count, ...)</code> passes the **number** <code>0</code>, not something Vue can observe, hence the warning. Wrap it in a getter. Arrays give you arrays of new and old values, which is the clean way to watch several things with precise control.

Stopping works the same for both: after calling the handle returned by a <code>watchEffect</code>, a later change to <code>userId</code> was seen by the other watchers but not by the stopped one. And in a component, unmounting stops everything created in <code>setup</code>: in a jsdom run, a write to the watched ref after <code>app.unmount()</code> logged nothing from either watcher.

## 6. Verified: Both in a Component

The runnable example observes <code>name</code> with <code>watch</code>, <code>city</code> with <code>watch</code> plus <code>immediate: true</code>, and both with <code>watchEffect</code>. Typing into the inputs in jsdom printed:

\`\`\`
watchEffect: Ada in London
watch(immediate): city undefined -> London
[app] RENDERED: watchEffect: Ada in Londonwatch(immediate): city undefined -> London
--- type Grace into #name
watch: name Ada -> Grace
watchEffect: Grace in London
--- type Paris into #city
watchEffect: Grace in Paris
watch(immediate): city London -> Paris
[app] LOG ITEMS: 6
\`\`\`

Note the <code>undefined</code> in the immediate run: on the first call there is no previous value. In TypeScript, Vue's typings reflect that by making <code>oldValue</code> possibly <code>undefined</code> when <code>immediate</code> is true. Watchers run in the order they were created, which is why <code>watch: name</code> printed before <code>watchEffect</code> on the first keystroke.

## 7. Side by Side

| | <code>watch</code> | <code>watchEffect</code> |
| :--- | :--- | :--- |
| Dependencies | Only the declared source | Everything read during the last run |
| Runs at creation | No (yes with <code>immediate: true</code>) | Yes, always |
| Old value | Yes, <code>(newValue, oldValue)</code> | No |
| Reads in the callback | Not tracked | Tracked |
| Async functions | Safe: the source is separate from the callback | Only reads before the first <code>await</code> count |
| Conditional reads | Not an issue | A branch that did not run is not a dependency |
| Deep watching | <code>deep</code> option, or automatic for a reactive object | Tracks exactly the nested properties it read |
| One-shot | <code>once: true</code> (3.4+) | Stop the handle yourself |
| Best for | Fetch on id change, react to a transition, compare before/after | Sync several values to something external, logging, quick prototypes |

Both share the same <code>flush</code> option (<code>pre</code>, <code>post</code>, <code>sync</code>), and <code>watchPostEffect</code> / <code>watchSyncEffect</code> are just <code>watchEffect</code> with that option preset; the timing is covered in [flush timing](/interview-question/watch-vs-watcheffect-flush-timing-and-the-new-watch-options-in-3-5). Neither should be used to derive a value: that is a job for <code>computed</code>, as shown in [computed vs watch](/interview-question/what-is-the-difference-between-computed-and-watch).

## 8. Choosing in Practice

- Need the **previous value**, or want the effect to fire for **one specific thing** even if the callback reads more? <code>watch</code>.
- The effect is **async**? Prefer <code>watch</code> with explicit sources, so tracking cannot depend on what happened before an <code>await</code>.
- The effect reads **many values** and should simply re-run when any of them change, and it should also run once at the start? <code>watchEffect</code> saves you listing them and adding <code>immediate</code>.
- Writing a reusable [composable](/interview-question/what-are-composables-in-vue) that accepts refs or getters? Either works with <code>toValue()</code>; <code>watchEffect</code> reads nicely when the inputs are many.

## 9. Common Pitfalls

- **<code>watch(state.count, ...)</code>.** That passes a number. Use <code>watch(() => state.count, ...)</code>; the warning above is what you get otherwise.
- **Reads after <code>await</code> in <code>watchEffect</code>.** They are not tracked, as section 4 showed.
- **A dependency hidden behind a branch.** If the branch did not run, its reads are not dependencies until it does.
- **Expecting <code>watchEffect</code> to give you the old value.** It cannot; keep a variable yourself or switch to <code>watch</code>.
- **Writing to the state you read inside <code>watchEffect</code>.** A watcher does not re-trigger itself during its own run (an effect doing <code>count.value++</code> ran exactly once in a probe), but two watchers that write each other's sources ping-pong until Vue throws "Maximum recursive updates exceeded". Derive with a computed instead.
- **Creating watchers outside <code>setup</code> (in a timeout, after an <code>await</code> in setup).** They are not bound to the component. In a jsdom run, a watcher created inside a <code>setTimeout</code> in <code>setup</code> still logged <code>watcher created in setTimeout saw 2</code> after <code>app.unmount()</code>, while the setup-time watcher had stopped. Keep the handle and stop it, or use an [effectScope](/interview-question/what-is-effectscope).

## 10. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watch</code> observes a source I declare and gives me new and old values; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watchEffect</code> runs immediately and re-runs whenever anything it read changes."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Tracking model:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watchEffect</code> re-collects dependencies on every run, like a render function, so a branch that did not run is not tracked yet. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watch</code> tracks only its source, never what the callback reads."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Timing:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watch</code> is lazy unless <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">immediate: true</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watchEffect</code> is always eager. Both are scheduled with the same flush option, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pre</code> by default."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The async trap:</strong> <span style="color:#f0e2c8;">"In an async <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watchEffect</code> only reads before the first <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await</code> are tracked. I verified that changing a value read after the await does not re-run it, so for async work I prefer <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watch</code> with explicit sources."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. How I choose:</strong> <span style="color:#f0e2c8;">"Old value, a single precise trigger or async work: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watch</code>. Many inputs that should simply keep something in sync: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watchEffect</code>. Deriving a value: neither, use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code>."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">watch(state.count, cb)</code> not work?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">state.count</code> is evaluated before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watch</code> is called, so it passes a plain number. Vue warns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Invalid watch source</code> and nothing is observed. Pass a getter, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">() =&gt; state.count</code>, or a ref from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toRef(state, 'count')</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get the old value with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">watchEffect</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">You cannot; it receives no arguments for values. Either keep the previous value in a local variable yourself or switch to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watch</code>, which calls back with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(newValue, oldValue)</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do I need to stop watchers manually?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not if they are created synchronously in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setup</code>: they are bound to the component and stopped on unmount. Watchers created later, for example in a timeout, are not bound; keep the returned handle and call it, or create them inside an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">effectScope</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">watch</code> on a reactive object do?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is deep by default: any nested write fires the callback, and the new and old values are the same proxy, so you cannot diff them. Watch a getter for a specific field, or a getter returning a snapshot, if you need a real old value.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">watchEffect</code> the same as React <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useEffect</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Similar intent, different mechanics. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watchEffect</code> tracks its dependencies automatically and runs before the next render by default, while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useEffect</code> takes a manual dependency array and runs after paint. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watch</code> with explicit sources is closer to a dependency array.</span>
</div>

</div>

## 11. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Watch source** | The ref, getter, reactive object or array that <code>watch</code> observes |
| **Automatic dependency tracking** | Recording what a function read, so it re-runs when those change |
| **Lazy / eager watcher** | Waits for the first change / runs immediately at creation |
| **Watch handle** | The returned function: call it to stop; <code>pause()</code> and <code>resume()</code> since 3.5 |
| **immediate** | <code>watch</code> option that runs the callback once at creation |

---
**Conclusion:** <code>watch</code> and <code>watchEffect</code> run on the same scheduler; the difference is who decides the dependencies. With <code>watch</code> you declare the source, the callback is lazy and you get the old value. With <code>watchEffect</code> Vue records what the function read on its last run, which is convenient and eager but, as the verified runs show, blind to reads in branches that did not run and to anything after the first <code>await</code>. Pick <code>watch</code> for precise, async or before-and-after logic, and <code>watchEffect</code> for "keep this in sync with whatever it uses".`,
    examples: [
      {
        label: "watch, watch with immediate, and watchEffect logging side by side",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { ref, watch, watchEffect } from "vue";

const name = ref("Ada");
const city = ref("London");
const log = ref([]);
const note = (line) => { log.value.push(line); console.log(line); };

// watch: explicit source, LAZY (no run at setup), gets new AND old value.
watch(name, (now, before) => note(\`watch: name \${before} -> \${now}\`));

// watchEffect: no source list, runs IMMEDIATELY, tracks every ref it reads.
watchEffect(() => note(\`watchEffect: \${name.value} in \${city.value}\`));

// watch can be made eager too, with { immediate: true }.
watch(city, (now, before) => note(\`watch(immediate): city \${before} -> \${now}\`), { immediate: true });
</script>

<template>
  <input id="name" v-model="name" />
  <input id="city" v-model="city" />
  <ol>
    <li v-for="(line, i) in log" :key="i">{{ line }}</li>
  </ol>
</template>
`,
      },
      {
        label: "Explicit vs automatic tracking, async tracking and invalid sources (Node)",
        tech: "js",
        runnable: false,
        code: `import { ref, reactive, watch, watchEffect, nextTick } from "vue";
const tick = () => nextTick();

const userId = ref(1);
const lang = ref("en");
const showDebug = ref(false);
const debugLevel = ref(1);

console.log("--- setup");
watch(userId, (id, old) => console.log(\`watch(userId): \${old} -> \${id}\`));
watchEffect(() => {
  // runs NOW, and tracks whatever it happens to read
  let line = \`watchEffect: user \${userId.value}, lang \${lang.value}\`;
  if (showDebug.value) line += \`, debug \${debugLevel.value}\`;
  console.log(line);
});
await tick();

console.log("--- lang = de (only watchEffect reads lang)");
lang.value = "de"; await tick();
console.log("--- debugLevel = 2 (not read yet: nothing runs)");
debugLevel.value = 2; await tick();
console.log("--- showDebug = true");
showDebug.value = true; await tick();
console.log("--- debugLevel = 3 (now it is a dependency)");
debugLevel.value = 3; await tick();
console.log("--- userId = 2 (both)");
userId.value = 2; await tick();

console.log("--- async: only reads before the first await are tracked");
const page = ref(1);
const size = ref(10);
watchEffect(async () => {
  const p = page.value;                 // tracked
  await Promise.resolve();
  console.log(\`async effect: page \${p}, size \${size.value}\`); // size read after await: NOT tracked
});
await tick(); await tick();
size.value = 50; await tick(); await tick();
console.log("(size change did not re-run it)");
page.value = 2; await tick(); await tick();

console.log("--- watch sources");
const state = reactive({ count: 0, nested: { a: 1 } });
watch(() => state.count, (v) => console.log("getter source fired:", v));
watch([userId, () => state.count], ([id, c], [oldId, oldC]) => console.log(\`array source: [\${oldId},\${oldC}] -> [\${id},\${c}]\`));
watch(state.count, () => {});
state.count++; await tick();

console.log("--- stop handles");
const stop = watchEffect(() => console.log("stoppable sees", userId.value));
stop();
userId.value = 3; await tick();
`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "watch vs watchEffect — flush timing and the new watch options in 3.5?",
    seoDescription:
      "When pre, post and sync watchers run relative to the render, logged on Vue 3.5.44, plus what is new in 3.5: deep depth, pause/resume, onWatcherCleanup.",
    description: `**Question presented to candidate:**
"Forget the basic difference between \`watch\` and \`watchEffect\` for a moment. When exactly does a watcher callback run relative to the component re-render, what do \`flush: 'pre'\`, \`'post'\` and \`'sync'\` change, and which watch options and APIs are new in Vue 3.5?"

**What a strong answer should cover:**
- Writes are **batched**: \`pre\` watchers (the default) run in the scheduler flush **before** the component re-renders, so they see the new state but the **old DOM**.
- \`flush: 'post'\` runs **after** the DOM patch (alongside \`onUpdated\`), so it can read the updated DOM; \`watchPostEffect\` is the shorthand.
- \`flush: 'sync'\` runs **synchronously on every write**, with no batching; \`watchSyncEffect\` is the shorthand. Use it rarely.
- New in **3.5**: \`deep\` accepts a **number** (traversal depth), the handle has **\`pause()\` / \`resume()\`**, and **\`onWatcherCleanup()\`** registers cleanup without the third callback argument. \`getCurrentWatcher()\` and a base \`watch\` in \`@vue/reactivity\` landed too.
- **\`once: true\`** is from **3.4**, not 3.5; \`immediate\` and boolean \`deep\` predate both.
- Know the edges: \`onWatcherCleanup\` must be called before the first \`await\`; resuming a paused watcher fires once if the source changed while paused.

**Clarifying questions expected:**
- "Does the callback need to read the updated DOM, or only the new state?"
- "Is the project on 3.5 already? Some of these options do not exist on 3.4."

**Code / implementation expected:** Yes — a component with \`sync\`, \`pre\` and \`post\` watchers on the same ref, logging what the DOM shows in each, plus a short script exercising the 3.5 options.`,
    answer: `**Target Audience:** Developers who already know [watch vs watchEffect](/interview-question/what-is-the-difference-between-watch-and-watcheffect) and want the precise timing model plus the 3.4 and 3.5 additions.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. This page is entirely about ordering and timing, so every ordering claim below comes from a <code>console.log</code>-instrumented run on Vue 3.5.44 (components compiled with <code>@vue/compiler-sfc</code> and clicked in jsdom, options exercised with <code>node</code>). Which options are new in which version comes from the <a href="https://github.com/vuejs/core/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer">vuejs/core 3.5 changelog</a> and the <a href="https://github.com/vuejs/core/blob/main/changelogs/CHANGELOG-3.4.md" target="_blank" rel="noopener noreferrer">3.4 changelog</a>.

## 1. Why This Even Matters — A Story First

A newspaper has three kinds of people who react to breaking news.

The **wire operator** reacts the instant each fact comes in, even if three corrections arrive in the same minute. The **editor** waits until the reporter has finished filing, reads the final version of the facts, and makes decisions *before* the page is laid out. The **proofreader** only looks once the page has actually been printed, because her job is to check what readers will see.

Vue watchers come in exactly those three flavours: <code>sync</code> (the wire operator), <code>pre</code> (the editor, and the default), and <code>post</code> (the proofreader). Picking the wrong one gives you classic bugs: a measurement that reads the old DOM, or a watcher that runs three times for one click.

## 2. The Core Idea

📌 **Interview term: Flush** — the moment Vue's scheduler runs its queued jobs. Reactive writes do not re-render immediately; they queue work, and the queue is flushed in a microtask after your synchronous code finishes. See [how reactivity works](/interview-question/how-does-vue-s-reactivity-system-work).

📌 **Interview term: <code>flush: 'pre'</code>** — the default for <code>watch</code> and <code>watchEffect</code>. The callback runs in the flush, **before** the owning component re-renders. It sees the new state and the **old DOM**, and any state it writes is included in the same render.

📌 **Interview term: <code>flush: 'post'</code>** — the callback runs in the same flush, **after** the DOM has been patched. Use it to read layout, focus an element, or call a non-Vue library on the updated DOM. <code>watchPostEffect(fn)</code> is <code>watchEffect(fn, { flush: 'post' })</code>.

📌 **Interview term: <code>flush: 'sync'</code>** — the callback runs **synchronously inside the write**, once per write, with no batching. <code>watchSyncEffect(fn)</code> is the shorthand. Rarely what you want.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 220" role="img" aria-label="Timeline: the event handler runs sync watchers inline, then one microtask flush runs pre watchers, the render and patch, then post watchers and onUpdated, then nextTick callbacks.">
  <defs>
    <marker id="q06-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="80" y="34" text-anchor="middle">same task</text>
  <text class="d-sub" x="395" y="34" text-anchor="middle">one microtask flush</text>
  <text class="d-sub" x="680" y="34" text-anchor="middle">afterwards</text>
  <rect class="d-box-muted" x="20" y="60" width="120" height="110" rx="10"/>
  <text class="d-text" x="80" y="92" text-anchor="middle">handler</text>
  <text class="d-sub" x="80" y="118" text-anchor="middle">sync watchers</text>
  <text class="d-sub" x="80" y="140" text-anchor="middle">DOM still old</text>
  <rect class="d-box" x="170" y="60" width="120" height="110" rx="10"/>
  <text class="d-text" x="230" y="92" text-anchor="middle">pre flush</text>
  <text class="d-sub" x="230" y="118" text-anchor="middle">pre watchers</text>
  <text class="d-sub" x="230" y="140" text-anchor="middle">DOM still old</text>
  <rect class="d-box-accent" x="320" y="60" width="150" height="110" rx="10"/>
  <text class="d-text d-accent" x="395" y="92" text-anchor="middle">render</text>
  <text class="d-sub" x="395" y="118" text-anchor="middle">onBeforeUpdate</text>
  <text class="d-sub" x="395" y="140" text-anchor="middle">patch the DOM</text>
  <rect class="d-box" x="500" y="60" width="120" height="110" rx="10"/>
  <text class="d-text" x="560" y="92" text-anchor="middle">post flush</text>
  <text class="d-sub" x="560" y="118" text-anchor="middle">post watchers</text>
  <text class="d-sub" x="560" y="140" text-anchor="middle">onUpdated</text>
  <rect class="d-box-muted" x="640" y="60" width="100" height="110" rx="10"/>
  <text class="d-text" x="690" y="92" text-anchor="middle">nextTick</text>
  <text class="d-sub" x="690" y="118" text-anchor="middle">callbacks</text>
  <path class="d-edge" d="M 142 115 L 164 115" marker-end="url(#q06-arrow)"/>
  <path class="d-edge" d="M 292 115 L 314 115" marker-end="url(#q06-arrow)"/>
  <path class="d-edge" d="M 472 115 L 494 115" marker-end="url(#q06-arrow)"/>
  <path class="d-edge" d="M 622 115 L 634 115" marker-end="url(#q06-arrow)"/>
</svg>

Everything from "pre flush" to "post flush" happens in one microtask, once per batch of writes. Only the <code>sync</code> watchers live inside the handler itself.

## 3. Verified: Three Flush Modes on One Ref

The runnable example on this page registers a <code>sync</code>, a <code>pre</code> and a <code>post</code> watcher on the same <code>count</code>, plus a <code>watchEffect</code> and both update hooks. Each one logs what the paragraph in the DOM says at that moment. One click does <code>count++</code> twice:

\`\`\`
watchEffect (pre): count=0
[app] RENDERED: count is 0+2
=== click
click: count++ (1st)
sync  watcher: count=1, DOM says "count is 0"
click: count++ (2nd)
sync  watcher: count=2, DOM says "count is 0"
click: handler returns
pre   watcher: count=2, DOM says "count is 0"
watchEffect (pre): count=2
onBeforeUpdate: DOM says "count is 0"
post  watcher: count=2, DOM says "count is 2"
onUpdated: DOM says "count is 2"
\`\`\`

What the log proves:

- The **sync** watcher ran **twice**, inside the handler, immediately after each write. It saw the intermediate value <code>1</code>.
- The **pre** watcher and the <code>watchEffect</code> ran **once**, after the handler returned, with the final value <code>2</code>, while the DOM still said <code>count is 0</code>.
- <code>onBeforeUpdate</code> came next, then the patch.
- The **post** watcher ran after the patch and was the first to see <code>count is 2</code>, just before <code>onUpdated</code>.

So "pre runs before the DOM update, post after it, sync on every write" is not a rule of thumb, it is the observed order.

"Every write" is more literal than people expect. A deep <code>sync</code> watcher on a reactive array, followed by <code>list.push(2)</code> and <code>list.sort()</code>, printed:

\`\`\`
sync deep watcher sees [3,1,2]
sync deep watcher sees [1,1,2]
sync deep watcher sees [1,2,2]
sync deep watcher sees [1,2,3]
\`\`\`

<code>sort()</code> writes the array index by index, and the sync watcher observed each half-finished state, including <code>[1,1,2]</code>, which never existed as far as your code is concerned. A <code>pre</code> watcher would have fired once with <code>[1,2,3]</code>. For lifecycle hooks in general, see [Vue lifecycle hooks](/interview-question/what-are-vue-lifecycle-hooks); for waiting on the flush from your own code, see [nextTick](/interview-question/what-is-nexttick-in-vue).

## 4. Which Watch Options Are New, and When

| Option or API | Since | What it does |
| :--- | :--- | :--- |
| <code>immediate: true</code> | 3.0 | Run the callback once at creation |
| <code>deep: true</code> | 3.0 | Traverse the whole source object |
| <code>flush: 'pre' / 'post' / 'sync'</code> | 3.0 | Choose when the callback runs (section 3) |
| Third callback argument for cleanup | 3.0 | Register cleanup for the previous run (early 3.x docs called it <code>onInvalidate</code>, now <code>onCleanup</code>) |
| <code>once: true</code> | **3.4** | Run the callback once, then stop (vuejs/core #9034) |
| <code>deep: &lt;number&gt;</code> | **3.5** | Traverse only that many levels (#9572) |
| <code>handle.pause()</code> / <code>handle.resume()</code> | **3.5** | Temporarily stop reacting without destroying the watcher (#9651) |
| <code>onWatcherCleanup(fn)</code> | **3.5** | Register cleanup from anywhere in the synchronous part of the callback (#9927) |
| <code>getCurrentWatcher()</code> and a base <code>watch</code> in <code>@vue/reactivity</code> | **3.5** | Lower-level building blocks for libraries (#9927) |

The issue numbers are vuejs/core pull requests as listed in the changelogs. A common interview mistake is to call <code>once</code> a 3.5 feature; the changelog places it in 3.4.0 (2023-12-29). Vue 3.5.0 itself was released on 2024-09-03.

## 5. Verified: the New Options in Action

The second example on this page runs each option with <code>node</code>. Excerpts with their output:

**<code>deep</code> as a number.** Three watchers on <code>reactive({ a: { b: { c: 1 } }, top: 1 })</code>:

\`\`\`js
watch(tree, () => console.log("  deep: true     fired"), { deep: true });
watch(tree, () => console.log("  deep: 1        fired"), { deep: 1 });
watch(tree, () => console.log("  deep: 2        fired"), { deep: 2 });
tree.top++;      // depth 1
tree.a.b.c++;    // depth 3
\`\`\`

\`\`\`
  deep: true     fired
  deep: 1        fired
  deep: 2        fired
  (changed tree.top: depth 1)
  deep: true     fired
  (changed tree.a.b.c: depth 3)
\`\`\`

Only the unlimited watcher noticed the write three levels down. Note that watching a reactive object directly is deep by default; the number lets you make it shallower on purpose, which matters for big nested data.

**<code>once</code>.**

\`\`\`
  once fired with 1
  (second change ignored)
\`\`\`

**<code>pause()</code> and <code>resume()</code>.** The watcher was paused, the source went 20 → 21 → 22, then it was resumed:

\`\`\`
  (paused: nothing logged for 21, 22)
  watcher: 20 -> 22
  watcher: 22 -> 23
\`\`\`

This detail is worth remembering: resuming did **not** silently drop the changes made while paused. It fired once with the net change (<code>20 -> 22</code>), then continued normally. A paused <code>watchEffect</code> behaved the same way: resuming re-ran it once with the value written while paused.

**<code>onWatcherCleanup</code>.** Each run starts a fake 20 ms "request" and registers its cancellation:

\`\`\`js
watch(id, (v) => {
  const timer = setTimeout(() => console.log(\`  loaded user \${v}\`), 20);
  console.log(\`  start loading user \${v}\`);
  onWatcherCleanup(() => { clearTimeout(timer); console.log(\`  cancelled user \${v}\`); });
});
\`\`\`

\`\`\`
  start loading user 2
  cancelled user 2
  start loading user 3
  loaded user 3
\`\`\`

The cleanup for run 2 fired just before run 3 started, so only the latest request completed. That is the race-condition fix for [data fetching in watchers](/interview-question/how-do-you-fetch-data-in-a-vue-component-loading-errors-cancellation). The older third-argument <code>onCleanup</code> still works and printed <code>cleanup for 2</code> in the same run.

One constraint, verified separately: <code>onWatcherCleanup</code> has to be called **before the first <code>await</code>** in an async callback. Calling it afterwards printed:

\`\`\`
[Vue warn] onWatcherCleanup() was called when there was no active watcher to associate with.
\`\`\`

## 6. Choosing a Flush Mode

| Situation | Flush | Why |
| :--- | :--- | :--- |
| Fetch, log, write storage, update other state | <code>pre</code> (default) | Runs once per batch; state written here joins the same render |
| Measure an element, scroll, focus, call a DOM library | <code>post</code> | Runs after the patch; see also [useTemplateRef](/interview-question/what-is-usetemplateref-vue-3-5-and-how-does-it-improve-on-ref) |
| Must observe every intermediate value (undo history, devtools-like logging) | <code>sync</code> | Runs inside each write, unbatched |
| Run exactly once when something first becomes true | <code>once: true</code> | Self-stopping watcher |
| Temporarily ignore changes (tab hidden, drag in progress) | <code>pause()</code> / <code>resume()</code> | Keeps the watcher and its dependencies, catches up on resume |

## 7. Common Pitfalls

- **Reading the DOM in a default watcher.** A <code>pre</code> watcher sees the old DOM, as the log in section 3 shows. Use <code>flush: 'post'</code> or <code>await nextTick()</code>.
- **Reaching for <code>sync</code> to "make it faster".** It is not faster, it is unbatched: two writes ran the sync watcher twice in section 3.
- **Calling <code>once</code> a 3.5 feature.** It shipped in 3.4. The 3.5 additions are numeric <code>deep</code>, <code>pause</code>/<code>resume</code>, and <code>onWatcherCleanup</code>.
- **Registering cleanup after <code>await</code>.** <code>onWatcherCleanup</code> warns and the cleanup is never associated with the run. Register it first, then await.
- **Assuming <code>pause()</code> discards changes.** On <code>resume()</code> the watcher fires once if its source changed in the meantime.
- **Deep-watching a huge object by reflex.** Every trigger traverses it. Watch a getter for the field you care about, or limit depth with a number.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"Writes are batched, and a watcher's <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">flush</code> decides where in the batch it runs: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sync</code> inside each write, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pre</code> before the re-render, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">post</code> after the DOM patch."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The default:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pre</code> is the default for both <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watch</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watchEffect</code>. It runs once per batch with the final state but the old DOM, so state it writes lands in the same render."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Reading the DOM:</strong> <span style="color:#f0e2c8;">"If the callback needs the updated DOM I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">flush: 'post'</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watchPostEffect</code>; in my log the post watcher was the first to see the new text, right before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onUpdated</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. What is new:</strong> <span style="color:#f0e2c8;">"3.4 added <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">once</code>. 3.5 added a numeric <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">deep</code> for depth, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pause()</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">resume()</code> on the handle, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onWatcherCleanup()</code> for cancelling the previous run."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Edge cases:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onWatcherCleanup</code> must be called before the first <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">resume()</code> fires once if the source changed while paused, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sync</code> sees every intermediate state, even half-sorted arrays."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">pre</code> the default rather than <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">post</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Most watchers update state or start requests. Running them before the render means any state they write is rendered in the same pass, avoiding a second render. Only DOM-reading work needs the patched DOM, and that is the minority case.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you genuinely use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">flush: 'sync'</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When every intermediate value matters, such as recording an undo history or debugging exactly which write happened. It is unbatched, so it runs per write and can see half-finished states, as a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sort()</code> on a reactive array shows.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">onWatcherCleanup</code> different from the third callback argument?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same purpose: register cleanup for the previous run. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onWatcherCleanup</code> is an import you can call from helper functions inside the callback without threading the argument through, and it works for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watchEffect</code> too. Both must be registered synchronously.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">pause()</code> do differently from stopping?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Stopping destroys the watcher. Pausing keeps it and its dependencies; changes made while paused are not reported individually, but <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">resume()</code> fires once with the net change, so you do not miss the final state.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">once: true</code> the same as calling the stop handle in the callback?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Effectively yes, it stops after the first callback. It shipped in 3.4 so you do not have to capture the handle yourself, and a 3.5 fix made sure such watchers are also removed from their effect scope.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Flush** | The scheduler run, in a microtask, that executes queued jobs |
| **pre / post / sync** | Before the re-render, after the DOM patch, or inside each write |
| **watchPostEffect / watchSyncEffect** | <code>watchEffect</code> with flush preset to post or sync |
| **once** | 3.4 option: fire one time, then stop |
| **deep: number** | 3.5 option: traverse only that many levels |
| **pause / resume** | 3.5 handle methods: suspend reacting, then catch up once |
| **onWatcherCleanup** | 3.5 function to register cleanup for the current run |

---
**Conclusion:** A watcher's timing is decided by its <code>flush</code> mode. The instrumented run shows the order precisely: <code>sync</code> watchers fire inside each write, <code>pre</code> watchers (the default) fire once per batch before the re-render with the old DOM, and <code>post</code> watchers fire after the patch just before <code>onUpdated</code>. On top of that, 3.4 added <code>once</code>, and 3.5 added numeric <code>deep</code>, <code>pause</code>/<code>resume</code> (which catches up once on resume) and <code>onWatcherCleanup</code> (which must be called before the first <code>await</code>). Say which flush you need and why, name the right version for each option, and you will stand out from candidates who only know "watch vs watchEffect".`,
    examples: [
      {
        label: "sync, pre and post watchers on one ref, logging what the DOM shows",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { ref, watch, watchEffect, onBeforeUpdate, onUpdated, useTemplateRef } from "vue";

const count = ref(0);
const p = useTemplateRef("p");
const dom = () => p.value?.textContent; // what the user can see right now

// Same source, three flush modes. Each callback logs what the DOM shows at that moment.
watch(count, (v) => console.log(\`sync  watcher: count=\${v}, DOM says "\${dom()}"\`), { flush: "sync" });
watch(count, (v) => console.log(\`pre   watcher: count=\${v}, DOM says "\${dom()}"\`)); // default: flush "pre"
watch(count, (v) => console.log(\`post  watcher: count=\${v}, DOM says "\${dom()}"\`), { flush: "post" });
watchEffect(() => console.log(\`watchEffect (pre): count=\${count.value}\`));

onBeforeUpdate(() => console.log(\`onBeforeUpdate: DOM says "\${dom()}"\`));
onUpdated(() => console.log(\`onUpdated: DOM says "\${dom()}"\`));

function bumpTwice() {
  console.log("click: count++ (1st)");
  count.value++;
  console.log("click: count++ (2nd)");
  count.value++;
  console.log("click: handler returns");
}
</script>

<template>
  <p ref="p">count is {{ count }}</p>
  <button @click="bumpTwice">+2</button>
</template>
`,
      },
      {
        label: "once (3.4), deep: number, pause/resume and onWatcherCleanup (3.5) in Node",
        tech: "js",
        runnable: false,
        code: `import { ref, reactive, watch, watchEffect, nextTick, onWatcherCleanup } from "vue";
const tick = () => nextTick();

console.log("--- deep: number (3.5) limits traversal depth");
const tree = reactive({ a: { b: { c: 1 } }, top: 1 });
watch(tree, () => console.log("  deep: true     fired"), { deep: true });
watch(tree, () => console.log("  deep: 1        fired"), { deep: 1 });
watch(tree, () => console.log("  deep: 2        fired"), { deep: 2 });
tree.top++;      await tick(); console.log("  (changed tree.top: depth 1)");
tree.a.b.c++;    await tick(); console.log("  (changed tree.a.b.c: depth 3)");

console.log("--- once: true (added in 3.4)");
const q = ref(0);
watch(q, (v) => console.log("  once fired with", v), { once: true });
q.value = 1; await tick();
q.value = 2; await tick();
console.log("  (second change ignored)");

console.log("--- pause() / resume() on the handle (3.5)");
const temp = ref(20);
const h = watch(temp, (v, old) => console.log(\`  watcher: \${old} -> \${v}\`));
h.pause();
temp.value = 21; await tick();
temp.value = 22; await tick();
console.log("  (paused: nothing logged for 21, 22)");
h.resume(); await tick();
temp.value = 23; await tick();

console.log("--- pause/resume on watchEffect");
const e = ref(0);
const h2 = watchEffect(() => console.log("  effect sees", e.value));
h2.pause(); e.value = 5; await tick();
console.log("  (paused)");
h2.resume(); await tick();

console.log("--- onWatcherCleanup (3.5) cancels the previous run");
const id = ref(1);
watch(id, (v) => {
  const timer = setTimeout(() => console.log(\`  loaded user \${v}\`), 20);
  console.log(\`  start loading user \${v}\`);
  onWatcherCleanup(() => { clearTimeout(timer); console.log(\`  cancelled user \${v}\`); });
});
id.value = 2; await tick();
id.value = 3; await tick();
await new Promise((r) => setTimeout(r, 40));

console.log("--- the older 3rd-argument onCleanup still works");
const id2 = ref(1);
watch(id2, (v, _old, onCleanup) => { onCleanup(() => console.log(\`  cleanup for \${v}\`)); });
id2.value = 2; await tick(); id2.value = 3; await tick();
`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are common reactivity caveats in Vue?",
    seoDescription:
      "Vue 3 reactivity caveats sorted by cause: copied values, objects never proxied, untracked reads. Real errors and fixes, verified on Vue 3.5.44.",
    description: `**Question presented to candidate:**
"Tell me about the reactivity gotchas you have actually hit in Vue 3. For each one, what is the symptom, why does it happen in terms of how reactivity works, and how do you fix it?"

**What a strong answer should cover:**
- **Values copied out of the proxy:** destructuring a reactive object, passing \`state.count\` into a composable, spreading. Fix with \`toRefs\`, \`toRef\`, getters and \`toValue\`.
- **Objects that are never proxied:** \`Date\` and other built-ins, frozen objects, \`markRaw\`, and contents of a \`shallowRef\`. Class instances with \`#private\` fields throw a \`TypeError\` through a Proxy.
- **Reads that are not tracked:** after an \`await\` in \`watchEffect\` or \`computed\`, or outside any effect.
- **Identity and unwrapping:** the proxy is not \`===\` the raw object; refs in reactive arrays and Maps are not unwrapped; \`watch\` on a reactive object gives the same object as new and old value.
- **Compile-time and runtime guard rails:** passing a destructured prop straight to \`watch()\` is a compiler error in 3.5; watchers that write each other's sources end in "Maximum recursive updates exceeded".
- The Vue 2 caveats (adding keys, \`arr[i] = x\`, \`Vue.set\`) **no longer apply** in Vue 3.

**Clarifying questions expected:**
- "Composition API with \`<script setup>\`, or Options API? Some caveats only exist in one."
- "Are there large or third-party objects in state? That changes the advice."

**Code / implementation expected:** Yes — a component where a broken and a fixed version of each caveat render side by side.`,
    answer: `**Target Audience:** Developers who have shipped Vue 3 code and want to explain, not just recognise, the reactivity bugs that show up in code review.
**Difficulty:** Hard

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. Every symptom and every warning or error message below was produced on Vue 3.5.44: reactivity probes with <code>node</code>, the compiler check with <code>@vue/compiler-sfc</code>, and the components compiled and clicked in jsdom. Nothing here is quoted from memory.

## 1. Why This Even Matters — A Story First

A building has an intercom system. Every flat's buzzer is wired to the front door panel, so when a parcel arrives, the right flat hears about it. It works perfectly, as long as three things stay true: people stay in their wired flats, the flats are actually wired, and somebody is listening when the buzzer goes.

Every Vue reactivity caveat is one of those three breaking:

1. **Somebody moved out.** You copied a value out of the reactive object, and the copy has no wire.
2. **The flat was never wired.** The object was never proxied in the first place.
3. **Nobody was listening.** The read happened when no effect was recording.

Interviewers ask this question to separate people who memorised a list of gotchas from people who understand the wiring. If you can sort each caveat into one of those three buckets, you can reason about bugs you have never seen before.

## 2. The Mental Model

Reactivity flows only through **reads of a proxy or ref that happen while an effect is running**, as described in [how Vue reactivity works](/interview-question/how-does-vue-s-reactivity-system-work).

📌 **Interview term: Reactivity loss** — a value ends up outside the tracked boundary, so reading it no longer calls <code>track</code> and writing the original no longer reaches it.

📌 **Interview term: Raw object** — the original, unproxied object behind a <code>reactive()</code> proxy. <code>toRaw(proxy)</code> returns it; writes to it bypass tracking.

📌 **Interview term: Non-proxyable target** — something <code>reactive()</code> hands back unchanged: primitives, built-ins such as <code>Date</code>, frozen or non-extensible objects, and anything marked with <code>markRaw</code>.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 250" role="img" aria-label="Three ways to lose reactivity: the value is copied out of the proxy, the object was never proxied, or the read happened while no effect was tracking.">
  <defs>
    <marker id="q07-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="260" y="24" width="200" height="60" rx="10"/>
  <text class="d-text d-accent" x="360" y="50" text-anchor="middle">tracked read</text>
  <text class="d-sub" x="360" y="70" text-anchor="middle">proxy or ref, in an effect</text>
  <rect class="d-box-muted" x="30" y="160" width="200" height="66" rx="10"/>
  <text class="d-text" x="130" y="188" text-anchor="middle">copied out</text>
  <text class="d-sub" x="130" y="210" text-anchor="middle">destructure, pass value</text>
  <rect class="d-box-muted" x="260" y="160" width="200" height="66" rx="10"/>
  <text class="d-text" x="360" y="188" text-anchor="middle">never proxied</text>
  <text class="d-sub" x="360" y="210" text-anchor="middle">Date, frozen, markRaw</text>
  <rect class="d-box-muted" x="490" y="160" width="200" height="66" rx="10"/>
  <text class="d-text" x="590" y="188" text-anchor="middle">not listening</text>
  <text class="d-sub" x="590" y="210" text-anchor="middle">after await, no effect</text>
  <path class="d-edge-dashed" d="M 300 88 L 160 154" marker-end="url(#q07-arrow)"/>
  <path class="d-edge-dashed" d="M 360 88 L 360 154" marker-end="url(#q07-arrow)"/>
  <path class="d-edge-dashed" d="M 420 88 L 560 154" marker-end="url(#q07-arrow)"/>
</svg>

Each dashed arrow is a way out of the tracked path. Sections 3 to 5 take them in turn, then section 6 covers identity and unwrapping surprises that do not lose reactivity but still cause bugs.

## 3. Bucket One: the Value Was Copied Out

**Destructuring and passing a property value.** From the probe (second example on this page):

\`\`\`js
function useDouble(n) { return computed(() => toValue(n) * 2); }
const state = reactive({ count: 1 });
const frozen = useDouble(state.count);                 // passes the number 1
const live1 = useDouble(toRef(state, "count"));        // passes a ref
const live2 = useDouble(() => state.count);            // passes a getter
state.count = 10;
console.log(\`   value: \${frozen.value} | toRef: \${live1.value} | getter: \${live2.value}\`);
\`\`\`

\`\`\`
2. Passing a property VALUE into a composable freezes it
   value: 2 | toRef: 20 | getter: 20
\`\`\`

<code>state.count</code> is evaluated before the function is called, so the composable receives the number 1, forever. A ref or a getter keeps the wire attached, and <code>toValue()</code> (Vue 3.3+) lets a [composable](/interview-question/what-are-composables-in-vue) accept all three shapes. Destructuring is the same bug in different clothes; the fix is [toRefs](/interview-question/what-do-toref-and-torefs-do). The runnable example shows both side by side (section 8).

**Destructured props in <code>&lt;script setup&gt;</code> (3.5).** Since 3.5, destructuring <code>defineProps()</code> is reactive, because the compiler rewrites every access to <code>__props.count</code>. But passing the destructured name *directly* to <code>watch</code> would pass a value, so the compiler refuses:

\`\`\`
FAIL: watch(count, (v) => console.log(v));
      [@vue/compiler-sfc] "count" is a destructured prop and should not be passed directly to watch(). Pass a getter () => count instead.
OK  : watch(() => count, (v) => console.log(v));
      compiled to: watch(() => __props.count, (v) => console.log(v));
\`\`\`

That is a compile error from <code>compileScript</code>, not a runtime warning, so it surfaces as a build failure. See [defineProps](/interview-question/how-do-defineprops-and-defineemits-work-in-script-setup).

**Replacing a reactive object.** <code>state = reactive(newData)</code> gives effects nothing to notice, because they still track the old proxy. It can even *look* fixed when an unrelated change re-renders the component; that case is reproduced step by step in [ref vs reactive](/interview-question/what-is-the-difference-between-ref-and-reactive).

## 4. Bucket Two: the Object Was Never Proxied

\`\`\`
5. Class with #private fields
   TypeError: Cannot read private member #n from an object whose class did not declare it
   with markRaw: 1, isReactive: false
6. Built-ins like Date are not made reactive
   isReactive(date): false
   effect sees year 1970
   (setUTCFullYear did not re-run the effect)
   effect sees year 2031
7. shallowRef only tracks .value replacement
   shallow effect n=1
   (nested write ignored)
   shallow effect n=3
\`\`\`

- **<code>#private</code> class fields.** <code>reactive(new Counter())</code> wraps the instance in a Proxy; calling <code>inc()</code> runs with <code>this</code> set to the proxy, and the proxy does not have the private slot, so the engine throws. This is a JavaScript rule, not a Vue bug. Mark such instances with <code>markRaw</code> (see [markRaw and toRaw](/interview-question/what-do-markraw-and-toraw-do)) and expose plain reactive state next to them.
- **<code>Date</code>, and other built-ins with internal slots.** Vue does not proxy them, so <code>setUTCFullYear()</code> mutates the date invisibly. Assigning a new <code>Date</code> to the reactive property is tracked. The runnable example shows the same thing on screen (section 8).
- **Frozen objects.** <code>reactive(Object.freeze({...}))</code> is not reactive, and neither is a frozen object stored inside reactive state (<code>isReactive(state.data)</code> printed <code>false</code>). That is a useful optimisation for big read-only data, and a trap if you forget you froze it.
- **<code>shallowRef</code> and <code>shallowReactive</code>.** They are deliberately shallow: only <code>.value</code> replacement (or top-level keys) is tracked. Nested writes need a replacement or <code>triggerRef()</code>; see [when to use shallowRef](/interview-question/when-should-you-use-shallowref-shallowreactive-triggerref).

## 5. Bucket Three: Nobody Was Listening

Tracking only happens while an effect runs synchronously. Two consequences:

- In an <code>async</code> <code>watchEffect</code> or <code>computed</code>, reads after the first <code>await</code> are not tracked. The reproduction is in [watch vs watchEffect](/interview-question/what-is-the-difference-between-watch-and-watcheffect).
- Reading state in a plain function called from a <code>setTimeout</code>, an event listener added with <code>addEventListener</code>, or a third-party callback creates no dependency. That is fine for reading current values; it just will not re-run anything.

The same bucket explains timing confusion: a write *is* seen, but the DOM is patched later, in the scheduler flush. Code that reads the DOM right after the write sees old content until [nextTick](/interview-question/what-is-nexttick-in-vue).

## 6. Identity, Unwrapping and Loops

From the same probe:

\`\`\`
3. Refs inside arrays and Maps are NOT unwrapped
   arr[0] isRef: true | map.get isRef: true | obj unwraps: 1
4. Identity: the proxy is not the original
   list[0] === raw: false | list.includes(raw): true | list.indexOf(raw): 0
   set.has(raw): true
8. watch(reactiveObject): new and old are the same object
   same object: true, before.email=b
   same object: true, before.email=c
   snapshot getter: b -> c
\`\`\`

- **Unwrapping is only for object properties.** <code>reactive({ r }).r</code> is the number; <code>reactive([r])[0]</code> and <code>reactive(new Map([["k", r]])).get("k")</code> are still refs, so templates and code need <code>.value</code> there.
- **Identity.** <code>list[0] === raw</code> is false, because reading through a reactive array returns the proxied version. Vue patches identity-sensitive methods, so <code>includes</code>, <code>indexOf</code> and <code>Set.has</code> still find the raw object. Your own <code>===</code> comparisons and <code>WeakMap</code> lookups do not get that help.
- **Same object as new and old value.** Watching a reactive object (deep) passes the same proxy twice, so <code>before.email</code> already shows the new value. Watch a getter that returns a snapshot if you need to diff.

**Infinite update loops.** Two watchers that write each other's sources ping-pong until the scheduler gives up. Clicking such a component in jsdom produced:

\`\`\`
Maximum recursive updates exceeded in component <App>. This means you have a reactive effect that is mutating its own dependencies and thus recursively triggering itself. Possible sources include component template, render function, updated hook or watcher source function.
\`\`\`

The usual cause is using watchers to keep two pieces of state in sync. Derive one from the other with <code>computed</code> instead.

## 7. Verified: the Vue 2 Caveats Are Gone

People still mention <code>Vue.set</code> in Vue 3 interviews. The probe shows why it is obsolete:

\`\`\`
1. Vue 2 caveats are gone: new keys, index writes, length all tracked
   effect: list=[1,2] keys=
   effect: list=[1,2] keys=added
   effect: list=[1,2,null,null,null,9] keys=added
   effect: list=[1] keys=added
\`\`\`

Adding a key, writing past the end of an array and shrinking <code>length</code> each re-ran the effect. Vue 2 used <code>Object.defineProperty</code>, which cannot see keys that did not exist yet; Vue 3's Proxy can. See [what changed from Vue 2 to Vue 3](/interview-question/what-changed-from-vue-2-to-vue-3-and-what-does-vue-2-end-of-life-mean).

## 8. Verified: Broken and Fixed Side by Side

The runnable example puts three caveats next to their fixes. Clicking <code>count++</code> twice, then the two date buttons, in jsdom printed:

\`\`\`
[app] RENDERED: count++state.count 1 | destructured 1 | toRefs 1useDouble(value) 2 | useDouble(toRef) 2setUTCFullYear()replace Dateyear shown: 2024
[count++] state.count 2 | destructured 1 | toRefs 2 || useDouble(value) 2 | useDouble(toRef) 4 || year shown: 2024
[count++] state.count 3 | destructured 1 | toRefs 3 || useDouble(value) 2 | useDouble(toRef) 6 || year shown: 2024
mutated date, now 2025
[mutate date] state.count 3 | destructured 1 | toRefs 3 || useDouble(value) 2 | useDouble(toRef) 6 || year shown: 2024
[replace date] state.count 3 | destructured 1 | toRefs 3 || useDouble(value) 2 | useDouble(toRef) 6 || year shown: 2026
\`\`\`

The destructured copy and the composable fed <code>state.count</code> are stuck at their first values, while the <code>toRefs</code> and <code>toRef</code> versions follow. Mutating the <code>Date</code> changed the object (the log says 2025) but not the screen; replacing it updated the screen, and because the in-place mutation had already moved the year to 2025, the replacement shows 2026.

## 9. Caveat, Symptom, Fix

| Caveat | Symptom | Fix |
| :--- | :--- | :--- |
| Destructuring reactive state | Copy never updates | <code>toRefs(state)</code>, or keep <code>state.x</code> |
| Passing <code>state.x</code> to a composable | Composable frozen at first value | Pass <code>toRef(state, "x")</code> or <code>() => state.x</code>; read with <code>toValue</code> |
| <code>watch(destructuredProp)</code> (3.5) | Compile error | <code>watch(() => prop, ...)</code> |
| Reassigning a <code>reactive</code> variable | Screen stale, sometimes masked | Use a ref, or <code>Object.assign</code> |
| <code>#private</code> fields | <code>TypeError: Cannot read private member</code> | <code>markRaw</code> the instance |
| Mutating a <code>Date</code> in place | No update | Assign a new <code>Date</code> |
| Frozen objects, <code>shallowRef</code> contents | Nested writes ignored | Replace the value, or <code>triggerRef</code> |
| Reads after <code>await</code> in an effect | Not re-run when that value changes | Read first, or use <code>watch</code> with sources |
| Refs in arrays and Maps | <code>[object Object]</code> or a ref where a value was expected | Use <code>.value</code> |
| Proxy vs raw identity | <code>===</code> fails, <code>WeakMap</code> misses | Compare consistently, or <code>toRaw</code> both sides |
| Watchers writing each other | "Maximum recursive updates exceeded" | Derive with <code>computed</code> |

## 10. Common Pitfalls

- **Treating every caveat as a separate rule.** Sort it into a bucket: copied out, never proxied, or not listening. The fix follows from the bucket.
- **Reaching for <code>toRaw</code> to "fix" identity.** Mixing raw and proxied references makes writes through the raw object untracked. Use it for read-only interop, such as passing data to a library.
- **Putting large third-party instances in deep reactive state.** Map, chart and editor instances often have private fields or huge graphs; <code>markRaw</code> them or keep them in a <code>shallowRef</code>.
- **Freezing data and forgetting.** Great for big read-only lists, confusing six months later when an edit does nothing.
- **Quoting Vue 2 limits.** <code>Vue.set</code> and "array index writes are not reactive" are Vue 2 answers.
- **Solving sync problems with more watchers.** Each extra watcher is another chance for a loop and a one-flush-stale value; prefer a computed.

## 11. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"Reactivity only flows through reads of a proxy or ref while an effect is running, so every caveat is a value copied out, an object never proxied, or a read nobody tracked."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Copied out:</strong> <span style="color:#f0e2c8;">"Destructuring reactive state or passing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">state.count</code> into a composable hands over a plain value. I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toRefs</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toRef</code> or a getter, and read inputs with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toValue</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Never proxied:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Date</code> and other built-ins, frozen objects, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">markRaw</code> and the contents of a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shallowRef</code> are not tracked deeply, and class instances with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">#private</code> fields throw a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeError</code> through a Proxy."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Not listening:</strong> <span style="color:#f0e2c8;">"Reads after the first <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await</code> in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watchEffect</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> are not dependencies, and DOM reads right after a write see the old DOM until the flush."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Guard rails and history:</strong> <span style="color:#f0e2c8;">"Vue 3.5 refuses to compile <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watch(destructuredProp)</code>, watcher loops end in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Maximum recursive updates exceeded</code>, and the Vue 2 caveats such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Vue.set</code> are gone."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does a class with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">#private</code> fields break?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Methods run with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">this</code> bound to the Proxy, and private fields are only accessible on the exact object that declared them. The engine throws <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Cannot read private member #n from an object whose class did not declare it</code>. Wrap the instance with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">markRaw</code> and keep the reactive state beside it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;"><code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">list.includes(item)</code> works but <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">list[0] === item</code> is false. Why?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Reading <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list[0]</code> returns the reactive proxy of the item, which is a different object. Vue overrides identity-sensitive array methods like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">includes</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">indexOf</code> to also search raw values, but plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">===</code> comparisons get no such help.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Vue.set</code> still needed in Vue 3?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Proxies see new keys, deletions, index writes and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">length</code> changes. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Vue.set</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Vue.delete</code> existed because Vue 2 used <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.defineProperty</code>, which only covers keys that existed when the object was made reactive.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Destructured props are reactive in 3.5, so why can I not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">watch(count)</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Destructuring is reactive because the compiler rewrites every read of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">count</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__props.count</code>. Passing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">count</code> directly would evaluate it once, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">compileScript</code> throws an error telling you to pass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">() =&gt; count</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you keep a big read-only dataset cheap?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Avoid deep proxies: store it in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shallowRef</code> and replace it as a whole, or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.freeze</code> it so Vue skips it. Writes then need a replacement or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">triggerRef</code>, which is the trade-off you accept for not tracking every row.</span>
</div>

</div>

## 12. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Reactivity loss** | A value escapes the tracked boundary and stops updating |
| **Raw object** | The original object behind a proxy; writes to it are untracked |
| **Non-proxyable target** | Something <code>reactive()</code> returns unchanged: primitives, <code>Date</code>, frozen, <code>markRaw</code> |
| **markRaw** | Flag an object so Vue never proxies it |
| **toValue** | 3.3+ helper that reads a value, a ref or a getter uniformly |
| **Reactive props destructure** | 3.5 compiler feature that rewrites destructured props to <code>__props.x</code> |

---
**Conclusion:** Vue 3 reactivity caveats are not a random list. Reactivity flows only through tracked reads of a proxy or ref during an effect, and every caveat breaks one link: the value was copied out (destructuring, passing <code>state.x</code>, reassigning a reactive), the object was never proxied (<code>Date</code>, frozen data, <code>markRaw</code>, private fields, shallow refs), or no effect was listening (after an <code>await</code>, outside an effect). The verified runs show the exact symptoms, including the 3.5 compile error for watching a destructured prop and the "Maximum recursive updates exceeded" loop guard. Name the bucket, name the fix, and point out that the Vue 2 caveats no longer apply.`,
    examples: [
      {
        label: "Caveat lab: destructuring, passing a value, and mutating a Date, broken vs fixed",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { reactive, computed, toRef, toRefs, toValue } from "vue";

const state = reactive({ count: 1, when: new Date(Date.UTC(2024, 0, 1)) });

// Caveat 1: destructuring copies the value. toRefs keeps a live link.
const { count: copied } = state;
const { count: linked } = toRefs(state);

// Caveat 2: passing state.count passes the NUMBER. Pass a ref or a getter instead.
function useDouble(n) {
  return computed(() => toValue(n) * 2); // toValue accepts a value, a ref or a getter
}
const doubleFrozen = useDouble(state.count);
const doubleLive = useDouble(toRef(state, "count"));

// Caveat 3: built-ins such as Date are never proxied, so calling a mutating
// method on one is invisible to Vue. Replace the object instead.
function mutateDate() {
  state.when.setUTCFullYear(state.when.getUTCFullYear() + 1);
  console.log("mutated date, now", state.when.getUTCFullYear());
}
function replaceDate() {
  const next = new Date(state.when);
  next.setUTCFullYear(next.getUTCFullYear() + 1);
  state.when = next;
}
</script>

<template>
  <button id="inc" @click="state.count++">count++</button>
  <p id="r1">state.count {{ state.count }} | destructured {{ copied }} | toRefs {{ linked }}</p>
  <p id="r2">useDouble(value) {{ doubleFrozen }} | useDouble(toRef) {{ doubleLive }}</p>
  <button id="mutate" @click="mutateDate">setUTCFullYear()</button>
  <button id="replace" @click="replaceDate">replace Date</button>
  <p id="r3">year shown: {{ state.when.getUTCFullYear() }}</p>
</template>
`,
      },
      {
        label: "Eight caveats probed in Node: unwrapping, identity, #private, Date, shallowRef, watch",
        tech: "js",
        runnable: false,
        code: `import { ref, reactive, computed, watch, effect, isReactive, shallowRef, toRef, toValue, nextTick, markRaw, isRef } from "vue";
const tick = () => nextTick();

console.log("1. Vue 2 caveats are gone: new keys, index writes, length all tracked");
const s = reactive({ list: [1, 2], obj: {} });
effect(() => console.log(\`   effect: list=\${JSON.stringify(s.list)} keys=\${Object.keys(s.obj)}\`));
s.obj.added = true;       // new property
s.list[5] = 9;            // index beyond length
s.list.length = 1;        // shrink

console.log("2. Passing a property VALUE into a composable freezes it");
function useDouble(n) { return computed(() => toValue(n) * 2); }
const state = reactive({ count: 1 });
const frozen = useDouble(state.count);                 // passes the number 1
const live1 = useDouble(toRef(state, "count"));        // passes a ref
const live2 = useDouble(() => state.count);            // passes a getter
state.count = 10;
console.log(\`   value: \${frozen.value} | toRef: \${live1.value} | getter: \${live2.value}\`);

console.log("3. Refs inside arrays and Maps are NOT unwrapped");
const r = ref(1);
const arr = reactive([r]);
const map = reactive(new Map([["k", r]]));
console.log(\`   arr[0] isRef: \${isRef(arr[0])} | map.get isRef: \${isRef(map.get("k"))} | obj unwraps: \${reactive({ r }).r}\`);

console.log("4. Identity: the proxy is not the original");
const raw = { id: 1 };
const list = reactive([raw]);
console.log(\`   list[0] === raw: \${list[0] === raw} | list.includes(raw): \${list.includes(raw)} | list.indexOf(raw): \${list.indexOf(raw)}\`);
const set = reactive(new Set([raw]));
console.log(\`   set.has(raw): \${set.has(raw)}\`);

console.log("5. Class with #private fields");
class Counter { #n = 0; inc() { this.#n++; } get n() { return this.#n; } }
const c = reactive(new Counter());
try { c.inc(); console.log("   worked", c.n); } catch (e) { console.log(\`   \${e.constructor.name}: \${e.message}\`); }
const c2 = reactive({ counter: markRaw(new Counter()) });
c2.counter.inc(); console.log(\`   with markRaw: \${c2.counter.n}, isReactive: \${isReactive(c2.counter)}\`);

console.log("6. Built-ins like Date are not made reactive");
const d = reactive(new Date(0));
console.log(\`   isReactive(date): \${isReactive(d)}\`);
const holder = reactive({ when: new Date(0) });
effect(() => console.log(\`   effect sees year \${holder.when.getUTCFullYear()}\`));
holder.when.setUTCFullYear(2030);
console.log("   (setUTCFullYear did not re-run the effect)");
holder.when = new Date(Date.UTC(2031, 0));

console.log("7. shallowRef only tracks .value replacement");
const sh = shallowRef({ n: 1 });
effect(() => console.log(\`   shallow effect n=\${sh.value.n}\`));
sh.value.n = 2;
console.log("   (nested write ignored)");
sh.value = { n: 3 };

console.log("8. watch(reactiveObject): new and old are the same object");
const form = reactive({ email: "a" });
watch(form, (now, before) => console.log(\`   same object: \${now === before}, before.email=\${before.email}\`));
form.email = "b"; await tick();
watch(() => ({ ...form }), (now, before) => console.log(\`   snapshot getter: \${before.email} -> \${now.email}\`), { deep: true });
form.email = "c"; await tick();
`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is nextTick in Vue?",
    difficulty: "medium",
    seoDescription:
      "nextTick returns the promise for Vue's batched DOM flush. Where it runs versus Promise.then and setTimeout, logged on Vue 3.5.44, plus testing use.",
    description: `**Question presented to candidate:**
"After I push an item to a list in a click handler, \`list.children.length\` still shows the old count. What is going on, what does \`nextTick\` do about it, and where exactly does a \`nextTick\` callback run compared with a \`Promise.then\` or a \`setTimeout\`?"

**What a strong answer should cover:**
- Vue **batches** DOM updates: a reactive write queues a job, and the scheduler flushes the queue in a **microtask** after the current synchronous code.
- \`nextTick()\` returns the **promise for that flush**; \`await nextTick()\` (or a callback) runs after the DOM has been patched.
- Typical uses: measuring, scrolling or focusing an element right after a state change, and tests (Vue Test Utils' \`trigger()\` returns \`nextTick()\`).
- Ordering detail: a \`nextTick\` registered **before** any write in that tick does not wait for a later flush, and \`Promise.then\` callbacks queued after the write can run before a later \`nextTick\` callback. \`setTimeout(fn, 0)\` runs after all of them.
- Alternatives: \`flush: 'post'\` watchers, \`watchPostEffect\` and \`onUpdated\` for reacting to every update.
- In the Options API it is \`this.$nextTick()\`, with \`this\` bound to the instance.

**Clarifying questions expected:**
- "Is the goal to read the DOM once after a specific change, or to react after every update?"
- "Is this in a component or in a test?"

**Code / implementation expected:** Yes — a handler that logs the DOM before and after \`await nextTick()\`.`,
    answer: `**Target Audience:** Vue developers who have been bitten by "the DOM has not updated yet" and want the exact timing, not just "use nextTick".
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. This topic is all about ordering, so every ordering claim below comes from a <code>console.log</code>-instrumented run on Vue 3.5.44: components compiled with <code>@vue/compiler-sfc</code> and clicked in jsdom, plus a Vitest and Vue Test Utils run. The two short source excerpts are copied from the installed <code>@vue/runtime-core</code> 3.5.44.

## 1. Why This Even Matters — A Story First

You ask a sign painter to change the shop sign from "Open" to "Closed". He nods, writes it on his job list, and says he will do all of today's changes in one trip after lunch. If you walk outside straight away, the sign still says "Open". That is not a bug: he batches work so he does not climb the ladder five times for five changes.

If you need to photograph the new sign, you do not stand outside refreshing; you ask him to call you when the trip is done. **<code>nextTick</code> is that phone call.** Vue is the sign painter, the reactive write is the job ticket, and the trip is the scheduler flush.

## 2. The Core Idea

📌 **Interview term: Asynchronous DOM update** — when you write reactive state, Vue does not touch the DOM immediately. It queues the affected component's update job and patches the DOM later, once per batch. See [how reactivity works](/interview-question/how-does-vue-s-reactivity-system-work).

📌 **Interview term: Scheduler flush** — the run of all queued jobs: pre-flush watchers, component re-renders and DOM patches, then post-flush callbacks such as <code>onUpdated</code>. It is scheduled as a **microtask**, so it runs after the current synchronous code and before the browser gets a chance to paint or run timers. For microtasks in general, see [microtasks vs macrotasks](/interview-question/what-is-the-difference-between-microtasks-and-macrotasks).

📌 **Interview term: nextTick** — <code>nextTick()</code> returns a promise that resolves after the **current** flush. <code>await nextTick()</code> (or <code>nextTick(callback)</code>) is how your code says "continue once the DOM reflects my changes".

The whole implementation is four lines. From <code>runtime-core</code> 3.5.44:

\`\`\`js
function nextTick(fn) {
  const p = currentFlushPromise || resolvedPromise;
  return fn ? p.then(this ? fn.bind(this) : fn) : p;
}
function queueFlush() {
  if (!currentFlushPromise) {
    currentFlushPromise = resolvedPromise.then(flushJobs);
  }
}
\`\`\`

The first reactive write in a tick calls <code>queueFlush</code>, which schedules <code>flushJobs</code> as a microtask and remembers that promise. <code>nextTick</code> chains onto it. If **no** flush is pending, <code>nextTick</code> chains onto an already-resolved promise instead, which matters in section 4.

## 3. Verified: the DOM Lags Until the Flush

The runnable example pushes an item and counts the real <code>&lt;li&gt;</code> elements before and after <code>await nextTick()</code>:

\`\`\`js
async function add() {
  items.value.push("item " + (items.value.length + 1));
  console.log(\`after push:      data has \${items.value.length}, DOM has \${count()}\`);

  await nextTick(); // wait for Vue to flush its update queue
  console.log(\`after nextTick:  data has \${items.value.length}, DOM has \${count()}\`);
}
\`\`\`

\`\`\`
[app] RENDERED: firstAdd
after push:      data has 2, DOM has 1
after nextTick:  data has 2, DOM has 2
\`\`\`

The data changed immediately; the DOM caught up after the flush. Anything that needs the new element (scrolling it into view, focusing an input that a <code>v-if</code> just rendered, measuring its height) belongs after the <code>await</code>. Template refs are covered in [useTemplateRef](/interview-question/what-is-usetemplateref-vue-3-5-and-how-does-it-improve-on-ref).

## 4. Verified: Where nextTick Sits Among Promises and Timers

The second runnable example registers callbacks in a deliberate order inside one click handler; a <code>pre</code> watcher, a <code>post</code> watcher and <code>onUpdated</code> also log. Each line records what the DOM says at that moment:

\`\`\`js
function run() {
  console.log("A. nextTick registered BEFORE the change");
  nextTick(() => console.log(\`  nextTick (early)   DOM="\${dom()}"\`));
  setTimeout(() => console.log(\`  setTimeout 0       DOM="\${dom()}"\`), 0);
  Promise.resolve().then(() => console.log(\`  Promise.then early DOM="\${dom()}"\`));

  n.value++;
  console.log(\`  sync after n++     DOM="\${dom()}"\`);

  nextTick(() => console.log(\`  nextTick (late)    DOM="\${dom()}"\`));
  Promise.resolve().then(() => console.log(\`  Promise.then late  DOM="\${dom()}"\`));
  const r = nextTick();
  console.log(\`  nextTick() returns a Promise: \${r instanceof Promise}\`);
}
\`\`\`

\`\`\`
[app] RENDERED: n=0go
A. nextTick registered BEFORE the change
  sync after n++     DOM="n=0"
  nextTick() returns a Promise: true
  nextTick (early)   DOM="n=0"
  Promise.then early DOM="n=0"
  pre watcher        DOM="n=0"
  post watcher       DOM="n=1"
  onUpdated          DOM="n=1"
  Promise.then late  DOM="n=1"
  nextTick (late)    DOM="n=1"
  setTimeout 0       DOM="n=1"
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 720 360" role="img" aria-label="Observed order after one click: early nextTick, early Promise then, the scheduler flush, late Promise then, late nextTick, all as microtasks, then setTimeout as a macrotask.">
  <text class="d-sub" x="110" y="30" text-anchor="middle">queue</text>
  <text class="d-sub" x="415" y="30" text-anchor="middle">what ran, in order</text>
  <text class="d-sub" x="672" y="30" text-anchor="middle">DOM seen</text>
  <rect class="d-box-muted" x="40" y="48" width="140" height="232" rx="10"/>
  <text class="d-text" x="110" y="168" text-anchor="middle">microtasks</text>
  <rect class="d-box" x="230" y="48" width="370" height="36" rx="8"/>
  <text class="d-sub" x="415" y="71" text-anchor="middle">1. nextTick registered before the write</text>
  <text class="d-sub" x="672" y="71" text-anchor="middle">n=0</text>
  <rect class="d-box" x="230" y="96" width="370" height="36" rx="8"/>
  <text class="d-sub" x="415" y="119" text-anchor="middle">2. Promise.then registered before the write</text>
  <text class="d-sub" x="672" y="119" text-anchor="middle">n=0</text>
  <rect class="d-box-accent" x="230" y="144" width="370" height="40" rx="8"/>
  <text class="d-text d-accent" x="415" y="169" text-anchor="middle">3. flush: pre, render, post</text>
  <text class="d-sub" x="672" y="169" text-anchor="middle">patched</text>
  <rect class="d-box" x="230" y="196" width="370" height="36" rx="8"/>
  <text class="d-sub" x="415" y="219" text-anchor="middle">4. Promise.then registered after the write</text>
  <text class="d-sub" x="672" y="219" text-anchor="middle">n=1</text>
  <rect class="d-box" x="230" y="244" width="370" height="36" rx="8"/>
  <text class="d-sub" x="415" y="267" text-anchor="middle">5. nextTick registered after the write</text>
  <text class="d-sub" x="672" y="267" text-anchor="middle">n=1</text>
  <rect class="d-box-muted" x="40" y="304" width="140" height="40" rx="10"/>
  <text class="d-text" x="110" y="329" text-anchor="middle">macrotask</text>
  <rect class="d-box" x="230" y="304" width="370" height="40" rx="8"/>
  <text class="d-sub" x="415" y="329" text-anchor="middle">6. setTimeout 0</text>
  <text class="d-sub" x="672" y="329" text-anchor="middle">n=1</text>
</svg>

Three conclusions, each of which surprises people:

1. **A <code>nextTick</code> registered before the write did not wait for the DOM update.** No flush was pending yet, so it chained onto an already-resolved promise and ran first, seeing <code>n=0</code>. "Call <code>nextTick</code> and you get the updated DOM" is only true if the write already happened.
2. **The flush itself is just a microtask in the queue.** A plain <code>Promise.then</code> queued before the write ran before it; the scheduler is not magic, it simply got in line when the write happened.
3. **A late <code>nextTick</code> runs after a late <code>Promise.then</code>.** The late <code>nextTick</code> callback is chained onto the flush promise, so it is queued only when the flush *finishes*; the late <code>Promise.then</code> was queued earlier. Both saw the updated DOM. <code>setTimeout</code>, a macrotask, came last.

For the JavaScript side of this ordering, see [the event loop](/interview-question/what-is-the-event-loop) and [queueMicrotask vs Promise.then vs setTimeout](/interview-question/what-does-queuemicrotask-do-and-how-does-its-callback-ordering-compare-to-a-reso).

## 5. Verified: nextTick in Tests

Vue Test Utils builds on the same promise. In <code>@vue/test-utils</code> 2.5.1, <code>trigger()</code> dispatches the event and then <code>return Vue.nextTick();</code>, so awaiting it is enough:

\`\`\`js
test("DOM updates after the flush, not synchronously", async () => {
  const w = mount(List);
  await w.get("button").trigger("click"); // trigger() returns nextTick()
  expect(w.findAll("li")).toHaveLength(2);
});

test("without awaiting, the DOM is still old", async () => {
  const w = mount(List);
  w.get("button").element.click();
  expect(w.findAll("li")).toHaveLength(1); // not flushed yet
  await nextTick();
  expect(w.findAll("li")).toHaveLength(2);
});
\`\`\`

Both tests passed under Vitest 5.0.5 with jsdom (<code>Tests 2 passed (2)</code>). The second one is the important teaching test: the assertion of length 1 right after a raw <code>click()</code> proves the DOM is stale until the flush. More in [testing Vue components](/interview-question/how-do-you-test-vue-components-vitest-and-vue-test-utils).

## 6. nextTick vs the Alternatives

| Tool | Runs | Use it when |
| :--- | :--- | :--- |
| <code>await nextTick()</code> | Once, after the current flush | One-off DOM work right after a specific change |
| <code>watch(src, cb, { flush: 'post' })</code> / <code>watchPostEffect</code> | After every flush in which the source changed | DOM work tied to a piece of state, every time |
| <code>onUpdated</code> | After every re-render of the component | Rare; it fires for any reason the component re-rendered |
| <code>setTimeout(fn, 0)</code> | A later macrotask | Not a Vue tool; works by accident and runs later than needed |
| <code>requestAnimationFrame</code> | Before the next paint | Layout-sensitive animation work after the DOM is updated |

The post-flush watcher option is covered in [flush timing](/interview-question/watch-vs-watcheffect-flush-timing-and-the-new-watch-options-in-3-5), and hooks in [lifecycle hooks](/interview-question/what-are-vue-lifecycle-hooks). In the Options API the same function is <code>this.$nextTick()</code>; the <code>fn.bind(this)</code> in the source above is what makes <code>this</code> inside the callback the component instance.

## 7. Common Pitfalls

- **Calling <code>nextTick</code> before the write.** As section 4 showed, it resolves before the flush and sees the old DOM. Write first, then await.
- **Using <code>setTimeout</code> instead.** It runs later than necessary (after every microtask, as section 4 shows), a real browser may paint in between, and it hides the intent.
- **Sprinkling <code>await nextTick()</code> to "fix" reactivity bugs.** If data is not updating, the problem is reactivity loss, not timing; see [reactivity caveats](/interview-question/what-are-common-reactivity-caveats-in-vue).
- **Expecting <code>nextTick</code> to wait for child async work.** It waits for the current flush only, not for data a child component is still fetching.
- **Forgetting it in tests.** Assertions straight after <code>element.click()</code> see the old DOM. <code>await trigger()</code> or <code>await nextTick()</code>.
- **Using it where a post-flush watcher belongs.** If the DOM work must happen every time some state changes, a <code>flush: 'post'</code> watcher states that directly.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nextTick()</code> returns a promise that resolves after Vue's next DOM update flush, so code after <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await nextTick()</code> sees the patched DOM."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it exists:</strong> <span style="color:#f0e2c8;">"Vue batches updates: a write queues the component job and the scheduler flushes in a microtask. Right after <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">items.push()</code> my log showed data has 2 items but the DOM still has 1."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. How it works:</strong> <span style="color:#f0e2c8;">"The first write in a tick creates the flush promise, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nextTick</code> chains onto it. The whole implementation is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">currentFlushPromise || resolvedPromise</code> then."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The ordering detail:</strong> <span style="color:#f0e2c8;">"A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nextTick</code> registered before any write does not wait for the update, a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Promise.then</code> queued after the write can run before a later <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nextTick</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setTimeout</code> runs after all of them."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. When I use it:</strong> <span style="color:#f0e2c8;">"For one-off DOM work after a change, like focusing an input a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-if</code> just rendered, and in tests, where <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">trigger()</code> already returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nextTick()</code>. For DOM work after every change I use a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">flush: 'post'</code> watcher."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does Vue not update the DOM synchronously?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Several writes in one handler would each cause a render. Batching them into one flush means one render and one patch per component per tick, and lets watchers that write more state join the same render.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">nextTick</code> a microtask or a macrotask?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A microtask: it is a promise chained onto the flush promise, so it runs before timers. In my ordering run, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setTimeout(fn, 0)</code> ran after both <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nextTick</code> callbacks and both <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Promise.then</code> callbacks.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if you <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">await nextTick()</code> before changing state?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">If no flush is pending, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nextTick</code> chains onto an already resolved promise, so it resolves before the write you make next is flushed. Code after it still sees the old DOM. Always write first, then await.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test a click that changes the DOM?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await wrapper.get('button').trigger('click')</code>. In Vue Test Utils 2.5.1 <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">trigger()</code> ends with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">return Vue.nextTick()</code>, so the awaited assertion sees the patched DOM. A raw <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">element.click()</code> needs an explicit <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await nextTick()</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">this.$nextTick</code> differ from the imported <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">nextTick</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is the same function bound to the component instance, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">this</code> inside the callback is the component. The source shows <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fn.bind(this)</code> when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nextTick</code> is called with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">this</code> value.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Asynchronous DOM update** | Vue patches the DOM after your code finishes, once per batch |
| **Scheduler flush** | The microtask that runs watchers, re-renders and post-flush callbacks |
| **nextTick** | A promise that resolves after the current flush |
| **Microtask** | A callback run right after the current script, before timers and paint |
| **Macrotask** | A later task such as a <code>setTimeout</code> callback |

---
**Conclusion:** Vue batches DOM updates into a scheduler flush that runs as a microtask, so right after a write the data is new but the DOM is old, as the "data has 2, DOM has 1" line proves. <code>nextTick()</code> is simply the promise for that flush. The instrumented ordering run adds the details that separate strong answers: a <code>nextTick</code> registered before any write does not wait for the update, the flush is an ordinary microtask in line with your own promises, and <code>setTimeout</code> comes after all of it. Write first, then <code>await nextTick()</code> for one-off DOM work, and use a post-flush watcher when the DOM work should follow every change.`,
    examples: [
      {
        label: "Data vs DOM before and after await nextTick()",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { ref, nextTick, useTemplateRef } from "vue";

const items = ref(["first"]);
const list = useTemplateRef("list");
const count = () => list.value.children.length; // how many <li> the DOM really has

async function add() {
  items.value.push("item " + (items.value.length + 1));
  console.log(\`after push:      data has \${items.value.length}, DOM has \${count()}\`);

  await nextTick(); // wait for Vue to flush its update queue
  console.log(\`after nextTick:  data has \${items.value.length}, DOM has \${count()}\`);

  // Now it is safe to measure or focus the new element.
  list.value.lastElementChild.scrollIntoView?.();
}
</script>

<template>
  <ul ref="list">
    <li v-for="item in items" :key="item">{{ item }}</li>
  </ul>
  <button @click="add">Add</button>
</template>
`,
      },
      {
        label: "Ordering lab: nextTick vs Promise.then vs setTimeout vs watchers",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { ref, nextTick, watch, onUpdated, useTemplateRef } from "vue";
const n = ref(0);
const p = useTemplateRef("p");
const dom = () => p.value.textContent;

watch(n, () => console.log(\`  pre watcher        DOM="\${dom()}"\`));
watch(n, () => console.log(\`  post watcher       DOM="\${dom()}"\`), { flush: "post" });
onUpdated(() => console.log(\`  onUpdated          DOM="\${dom()}"\`));

function run() {
  console.log("A. nextTick registered BEFORE the change");
  nextTick(() => console.log(\`  nextTick (early)   DOM="\${dom()}"\`));
  setTimeout(() => console.log(\`  setTimeout 0       DOM="\${dom()}"\`), 0);
  Promise.resolve().then(() => console.log(\`  Promise.then early DOM="\${dom()}"\`));

  n.value++;
  console.log(\`  sync after n++     DOM="\${dom()}"\`);

  nextTick(() => console.log(\`  nextTick (late)    DOM="\${dom()}"\`));
  Promise.resolve().then(() => console.log(\`  Promise.then late  DOM="\${dom()}"\`));
  const r = nextTick();
  console.log(\`  nextTick() returns a Promise: \${r instanceof Promise}\`);
}
</script>
<template><p ref="p">n={{ n }}</p><button @click="run">go</button></template>
`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What do toRef and toRefs do?",
    seoDescription:
      "toRef links one property of a reactive object as a two-way ref; toRefs does it for every key so destructuring stays reactive. Verified on Vue 3.5.44.",
    description: `**Question presented to candidate:**
"What do \`toRef\` and \`toRefs\` do in Vue 3, and what problem do they solve? Show me where you would use each, and what happens with a key that does not exist yet."

**What a strong answer should cover:**
- \`toRef(obj, 'key')\` creates a ref that is a **two-way link** to one property of a reactive object: reading \`.value\` reads \`obj.key\`, writing \`.value\` writes it.
- \`toRefs(obj)\` does that for **every property present at call time**, returning a plain object of refs that can be **destructured** without losing reactivity.
- Main uses: destructuring props in a plain \`setup(props)\`, returning reactive state from a composable so callers can destructure, and passing one property to a function that expects a ref.
- \`toRefs\` does not pick up keys added later; \`toRef\` works for a missing key and can take a **default value** (3.2.25+).
- Since 3.3, \`toRef(() => getter)\` makes a **readonly** ref and \`toValue()\` normalises a value, ref or getter.
- Limits: \`toRefs\` on a plain object warns; refs from props or \`readonly\` stay read-only. \`storeToRefs\` is the Pinia counterpart.

**Clarifying questions expected:**
- "Are we in \`<script setup>\`, where props destructure is compiled since 3.5, or a plain \`setup(props)\` function?"
- "Is this about props, a composable's return value, or a store?"

**Code / implementation expected:** Yes — a child that destructures props both ways, and a composable that returns \`toRefs(state)\`.`,
    answer: `**Target Audience:** Vue developers who know <code>ref</code> and <code>reactive</code> and keep seeing <code>toRefs</code> in composables without being sure what it buys them.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. Every output below was produced on Vue 3.5.44: the probe with <code>node</code>, the component compiled with <code>@vue/compiler-sfc</code> and clicked in jsdom. The source excerpt is copied from the installed <code>@vue/reactivity</code>; version history comes from the vuejs/core changelogs.

## 1. Why This Even Matters — A Story First

A shared office has one whiteboard with everyone's status: "Ada: in a meeting", "Grace: at lunch". You want the status of just Ada on your desk. You could copy it onto a sticky note, but the moment Ada walks out of her meeting, your note is wrong.

What you actually want is a little window on your desk that looks at **Ada's line on the board**. Nothing is copied; you are always seeing the board. And if you write on the window, you are writing on the board.

<code>toRef</code> is one of those windows, pointed at one line. <code>toRefs</code> builds a whole set of windows, one per line, in one go. They exist because the sticky-note approach, destructuring <code>const { name } = state</code>, is the most common way to break Vue reactivity.

## 2. The Core Idea

📌 **Interview term: toRef** — <code>toRef(obj, "key")</code> returns a ref whose <code>.value</code> getter reads <code>obj.key</code> and whose setter writes <code>obj.key</code>. It stores nothing itself; it is a live, two-way link to one property of a reactive object.

📌 **Interview term: toRefs** — <code>toRefs(obj)</code> returns a **plain object** with one such ref per property that exists at the moment you call it. Because the result is plain and every value is a ref, destructuring it is safe.

📌 **Interview term: Property ref** — the kind of ref <code>toRef(obj, key)</code> creates (internally <code>ObjectRefImpl</code>). Its getter from Vue 3.5.44, trimmed:

\`\`\`js
get value() {
  let val = this._object[this._key];   // reads THROUGH the reactive proxy
  ...
  return this._value = val === void 0 ? this._defaultValue : val;
}
\`\`\`

The read goes through the original reactive proxy, so the proxy's <code>get</code> trap does the tracking, as described in [how reactivity works](/interview-question/how-does-vue-s-reactivity-system-work). That is the whole trick: the ref is a thin forwarding object, not a copy.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 260" role="img" aria-label="toRefs turns a reactive object into a plain object of refs, each forwarding reads and writes to one property of the original.">
  <defs>
    <marker id="q09-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="160" y="30" text-anchor="middle">reactive state</text>
  <rect class="d-box-accent" x="60" y="48" width="200" height="180" rx="12"/>
  <rect class="d-box" x="90" y="78" width="140" height="44" rx="8"/>
  <text class="d-text" x="160" y="105" text-anchor="middle">name</text>
  <rect class="d-box" x="90" y="154" width="140" height="44" rx="8"/>
  <text class="d-text" x="160" y="181" text-anchor="middle">age</text>
  <text class="d-text" x="560" y="30" text-anchor="middle">toRefs(state)</text>
  <rect class="d-box-muted" x="460" y="48" width="200" height="180" rx="12"/>
  <rect class="d-box" x="490" y="78" width="140" height="44" rx="8"/>
  <text class="d-text" x="560" y="105" text-anchor="middle">name ref</text>
  <rect class="d-box" x="490" y="154" width="140" height="44" rx="8"/>
  <text class="d-text" x="560" y="181" text-anchor="middle">age ref</text>
  <path class="d-edge-dashed" d="M 486 100 L 236 100" marker-end="url(#q09-arrow)"/>
  <path class="d-edge-dashed" d="M 486 176 L 236 176" marker-end="url(#q09-arrow)"/>
  <text class="d-sub" x="360" y="88" text-anchor="middle">reads and writes</text>
  <text class="d-sub" x="360" y="164" text-anchor="middle">reads and writes</text>
</svg>

The refs on the right hold no data. Each one forwards to its property on the left, so destructuring the right-hand object hands you live links rather than copies.

## 3. Verified: Ten Behaviours

This probe ran with <code>node</code> against Vue 3.5.44 (it is the second example on this page):

\`\`\`
1. toRef is a two-way link to ONE property
   after age.value++: state.age=37
   after state.age=40: age.value=40
2. toRefs converts EVERY property, so destructuring stays live
   state.name=Grace | isRef(name)=true
3. toRefs only sees keys that exist when it is called
   keys from toRefs: name,age | email in result: false
   toRef for that key works: g@h.io
   toRef on a key that did not exist yet, then written: state.phone=555
4. toRef with a default value
   nick.value=anon (state.nick is undefined)
5. toRef(getter) (3.3+) makes a readonly ref
   label.value=Grace (40) | isRef=true | isReadonly=true
   write throws TypeError: Cannot set property value of #<GetterRefImpl> which has only a getter
6. toRef on a value or ref
   toRef(5).value=5 | toRef(r) === r: true
7. toRefs on a plain object
[Vue warn] toRefs() expects a reactive object but received a plain one.
   isRef(p.a)=true
8. toRefs on a readonly proxy keeps it readonly
[Vue warn] Set operation on key "x" failed: target is readonly. { x: 1 }
   x after write: 1
9. watching a toRef
   watch toRef: 40 -> 41
10. toValue / unref
   toValue(ref)=1 toValue(getter)=7 unref(getter) is a function: true
\`\`\`

What to take from it:

- **Two-way (1, 2).** Writing the ref writes the object and vice versa.
- **Snapshot of keys (3).** <code>toRefs</code> iterates the keys present when called; a key added later is not in the result. <code>toRef</code> does not care whether the key exists yet: writing through it created <code>state.phone</code>.
- **Defaults (4).** <code>toRef(state, "nick", "anon")</code> returns <code>"anon"</code> while the property is <code>undefined</code>. The changelog dates the default-value argument to 3.2.25.
- **Getter form (5).** Since 3.3, <code>toRef(() => ...)</code> returns a readonly ref; in an ES module (strict mode) writing it throws the <code>TypeError</code> above. 3.3's changelog entry is "improve support of getter usage in reactivity APIs" (vuejs/core #7997), which also introduced <code>toValue()</code>.
- **Normalising (6, 10).** <code>toRef(existingRef)</code> returns the same ref; <code>toRef(5)</code> behaves like <code>ref(5)</code>. <code>toValue</code> unwraps refs **and calls getters**; <code>unref</code> only unwraps refs.
- **Guard rails (7, 8).** <code>toRefs</code> on a plain object warns because the refs would not be reactive. Refs from a <code>readonly</code> source stay read-only (see [readonly](/interview-question/what-does-readonly-do-in-vue-s-reactivity)).
- **Watchable (9).** A <code>toRef</code> is a normal watch source, which is how you watch a single prop.

## 4. Verified: the Three Places You Actually Use It

The runnable example combines the three common uses. Clicking through it in jsdom printed:

\`\`\`
[app] RENDERED: copied: Ada | toRefs: Ada | computed: ADARename0 items, total 0Add 5theme ref: light | settings.theme: lightToggle via ref
[rename] copied: Ada | toRefs: Grace | computed: GRACE || 0 items, total 0 || theme ref: light | settings.theme: light
[add] copied: Ada | toRefs: Grace | computed: GRACE || 1 items, total 5 || theme ref: light | settings.theme: light
[add] copied: Ada | toRefs: Grace | computed: GRACE || 2 items, total 10 || theme ref: light | settings.theme: light
[toggle] copied: Ada | toRefs: Grace | computed: GRACE || 2 items, total 10 || theme ref: dark | settings.theme: dark
\`\`\`

**1. Destructuring props in a plain <code>setup(props)</code>.** The child <code>Greeting</code> destructures <code>name</code> twice. The plain copy stayed <code>Ada</code> after the parent renamed it; the <code>toRefs(props)</code> version and the computed built on it followed to <code>Grace</code>. In <code>&lt;script setup&gt;</code> on 3.5+, destructuring <code>defineProps()</code> is compiled into <code>props.x</code> accesses, so you need <code>toRefs</code> there far less; see [defineProps](/interview-question/how-do-defineprops-and-defineemits-work-in-script-setup). In a render-function component, an Options API <code>setup()</code> or any library code, the old rule still applies.

**2. Returning state from a composable.** <code>useCart()</code> keeps a <code>reactive</code> object inside but returns <code>{ ...toRefs(state), add }</code>, so the caller can write <code>const { items, total, add } = useCart()</code> and stay reactive. This is the standard shape for [composables](/interview-question/what-are-composables-in-vue).

**3. One property as a ref.** <code>toRef(settings, "theme")</code> gives a ref you can pass to anything that expects a ref, or bind with <code>v-model</code>; toggling it changed <code>settings.theme</code> too.

One more limit, verified separately: refs made from props are read-only. A child that ran <code>toRefs(props).name.value = "changed"</code> got <code>[Vue warn] Set operation on key "name" failed: target is readonly.</code> and kept rendering <code>Ada</code>. To change a prop, emit an event or use [defineModel](/interview-question/what-is-definemodel-in-vue-3-4-and-how-does-it-replace-manual-prop-emit).

## 5. Side by Side

| | <code>toRef(obj, key)</code> | <code>toRefs(obj)</code> | <code>ref(obj.key)</code> | <code>computed(() => obj.key)</code> |
| :--- | :--- | :--- | :--- | :--- |
| Linked to the source | Yes, both ways | Yes, both ways, per key | No: a copy | Yes, read-only |
| Writable | Yes (unless the source is readonly) | Yes (same) | Yes, but writes only the copy | No |
| Keys added later | Works | Not included | Not applicable | Works |
| Typical use | One prop or field as a ref | Destructure a whole object | Independent local state | Derived value |

Pinia's [storeToRefs](/interview-question/why-use-storetorefs-with-pinia) is the store-aware cousin: it returns refs for state and getters but skips actions, which <code>toRefs(store)</code> would not do for you.

## 6. Common Pitfalls

- **Using <code>ref(state.x)</code> instead of <code>toRef(state, "x")</code>.** <code>ref</code> copies; the two drift apart immediately.
- **Expecting <code>toRefs</code> to include keys added later.** It is a snapshot of the keys, as line 3 showed. Declare all keys up front, or use <code>toRef</code> for optional ones.
- **Calling <code>toRefs</code> on a plain object.** You get refs, but not reactive ones, plus a warning.
- **Writing through refs made from props.** They are read-only; the write is refused with a warning.
- **Reaching for <code>toRefs</code> in 3.5 <code>&lt;script setup&gt;</code> props by habit.** Destructured props are already reactive there; what still needs care is passing them to <code>watch</code> or a composable, where you wrap them in a getter.
- **Confusing <code>toValue</code> and <code>unref</code>.** Only <code>toValue</code> calls getters; <code>unref(() => 7)</code> returns the function.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toRef(obj, key)</code> makes a ref that is a live two-way link to one property of a reactive object, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toRefs(obj)</code> does that for every property so you can destructure safely."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">"The ref stores nothing: its getter reads <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">obj[key]</code> through the original proxy, so tracking still happens in the proxy, and its setter writes back."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Where I use it:</strong> <span style="color:#f0e2c8;">"Destructuring <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">props</code> in a plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setup(props)</code>, returning <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ ...toRefs(state), actions }</code> from a composable, and passing one field to something that expects a ref."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The details:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toRefs</code> snapshots the keys present when called, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toRef</code> works for missing keys and takes a default, and since 3.3 <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toRef(() =&gt; x)</code> gives a readonly ref and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toValue</code> normalises inputs."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Modern context:</strong> <span style="color:#f0e2c8;">"In 3.5 <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;script setup&gt;</code>, destructured <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineProps</code> is already reactive, so I need <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toRefs</code> less for props; Pinia has <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">storeToRefs</code> for stores."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">toRef(state, 'x')</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ref(state.x)</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ref(state.x)</code> copies the current value into an independent ref; the two drift apart immediately. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toRef(state, 'x')</code> stores nothing and forwards reads and writes to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">state.x</code>, so it is always in sync in both directions.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">toRefs</code> warn on a plain object?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The refs it creates forward to the object, but a plain object has no Proxy to track reads or trigger on writes, so nothing would ever update. Vue warns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toRefs() expects a reactive object but received a plain one.</code></span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you write to a ref created from props?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Props are a readonly proxy in the child, so the write is refused with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set operation on key "name" failed: target is readonly.</code> Emit an update event or use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineModel</code> instead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">toValue</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">unref</code> differ?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unref</code> returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.value</code> for a ref and anything else unchanged. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toValue</code>, added in 3.3, also calls a getter function, which lets a composable accept a plain value, a ref or a getter with one line.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">storeToRefs</code> instead of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">toRefs</code> on a Pinia store?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A store mixes state, getters and actions on one reactive object. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">storeToRefs</code> returns refs only for state and getters, so you can destructure them and still call actions from the store directly.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **toRef** | A ref that reads and writes one property of a reactive object |
| **toRefs** | A plain object of such refs, one per existing key, safe to destructure |
| **Property ref** | The forwarding ref type behind <code>toRef(obj, key)</code>; stores nothing |
| **toValue** | 3.3+ helper that unwraps refs and calls getters |
| **unref** | Unwraps refs only; returns other values, including functions, unchanged |
| **storeToRefs** | Pinia helper that refs a store's state and getters |

---
**Conclusion:** <code>toRef</code> and <code>toRefs</code> exist so you can take a property out of a reactive object without making a copy. <code>toRef(obj, key)</code> is a thin forwarding ref whose getter reads through the original proxy, so it stays linked both ways; <code>toRefs(obj)</code> builds one per existing key so destructuring is safe. The verified runs show the details interviewers like: <code>toRefs</code> snapshots the key list, <code>toRef</code> handles missing keys and defaults, the 3.3 getter form is readonly, and refs from props refuse writes. Use them for props in plain <code>setup()</code>, for composable return values and for passing a single field as a ref.`,
    examples: [
      {
        label: "Props destructured with and without toRefs, a composable returning toRefs, and toRef",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { ref, reactive, toRef, toRefs, computed, defineComponent, h } from "vue";

// A child written with a plain setup(props): destructuring props here is NOT compiled away.
const Greeting = defineComponent({
  props: { name: String },
  setup(props) {
    const { name: copied } = props;          // a plain string, frozen at setup time
    const { name: linked } = toRefs(props);  // a ref that follows the prop
    const shout = computed(() => linked.value.toUpperCase());
    return () => h("p", { id: "child" }, \`copied: \${copied} | toRefs: \${linked.value} | computed: \${shout.value}\`);
  },
});

// A composable that keeps reactive state inside but hands out refs,
// so callers can destructure the result safely.
function useCart() {
  const state = reactive({ items: 0, total: 0 });
  function add(price) { state.items++; state.total += price; }
  return { ...toRefs(state), add };
}
const { items, total, add } = useCart();

// toRef: one property of a reactive object, as a two-way ref.
const settings = reactive({ theme: "light" });
const theme = toRef(settings, "theme");

const who = ref("Ada");
</script>

<template>
  <Greeting :name="who" />
  <button id="rename" @click="who = who === 'Ada' ? 'Grace' : 'Ada'">Rename</button>
  <p id="cart">{{ items }} items, total {{ total }}</p>
  <button id="add" @click="add(5)">Add 5</button>
  <p id="theme">theme ref: {{ theme }} | settings.theme: {{ settings.theme }}</p>
  <button id="toggle" @click="theme = theme === 'light' ? 'dark' : 'light'">Toggle via ref</button>
</template>
`,
      },
      {
        label: "Ten toRef / toRefs / toValue behaviours probed in Node",
        tech: "js",
        runnable: false,
        code: `import { reactive, ref, toRef, toRefs, toValue, isRef, isReadonly, readonly, watch, nextTick, unref } from "vue";

const state = reactive({ name: "Ada", age: 36 });

console.log("1. toRef is a two-way link to ONE property");
const age = toRef(state, "age");
age.value++;
console.log(\`   after age.value++: state.age=\${state.age}\`);
state.age = 40;
console.log(\`   after state.age=40: age.value=\${age.value}\`);

console.log("2. toRefs converts EVERY property, so destructuring stays live");
const { name } = toRefs(state);
name.value = "Grace";
console.log(\`   state.name=\${state.name} | isRef(name)=\${isRef(name)}\`);

console.log("3. toRefs only sees keys that exist when it is called");
const all = toRefs(state);
state.email = "g@h.io";
console.log(\`   keys from toRefs: \${Object.keys(all)} | email in result: \${"email" in all}\`);
const email = toRef(state, "email");
console.log(\`   toRef for that key works: \${email.value}\`);
const missing = toRef(state, "phone");
missing.value = "555";
console.log(\`   toRef on a key that did not exist yet, then written: state.phone=\${state.phone}\`);

console.log("4. toRef with a default value");
const nick = toRef(state, "nick", "anon");
console.log(\`   nick.value=\${nick.value} (state.nick is \${state.nick})\`);

console.log("5. toRef(getter) (3.3+) makes a readonly ref");
const label = toRef(() => \`\${state.name} (\${state.age})\`);
console.log(\`   label.value=\${label.value} | isRef=\${isRef(label)} | isReadonly=\${isReadonly(label)}\`);
try { label.value = "x"; } catch (e) { console.log(\`   write throws \${e.constructor.name}: \${e.message}\`); }

console.log("6. toRef on a value or ref");
const plain = toRef(5);
const r = ref(1);
console.log(\`   toRef(5).value=\${plain.value} | toRef(r) === r: \${toRef(r) === r}\`);

console.log("7. toRefs on a plain object");
const p = toRefs({ a: 1 });
console.log(\`   isRef(p.a)=\${isRef(p.a)}\`);

console.log("8. toRefs on a readonly proxy keeps it readonly");
const ro = toRefs(readonly(reactive({ x: 1 })));
ro.x.value = 2;
console.log(\`   x after write: \${ro.x.value}\`);

console.log("9. watching a toRef");
watch(toRef(state, "age"), (v, o) => console.log(\`   watch toRef: \${o} -> \${v}\`));
state.age = 41; await nextTick();

console.log("10. toValue / unref");
console.log(\`   toValue(ref)=\${toValue(r)} toValue(getter)=\${toValue(() => 7)} unref(getter) is a function: \${typeof unref(() => 7) === "function"}\`);
`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Why was Reactivity Transform ($ref, $computed) removed in Vue 3.4?",
    seoDescription:
      "Reactivity Transform ($ref, $computed) was experimental from 3.2, deprecated in 3.3 and removed in 3.4. Why, and what old code does on Vue 3.5.44.",
    description: `**Question presented to candidate:**
"Some older Vue 3 code uses \`let count = $ref(0)\` with no \`.value\`. What was that feature, why did the Vue team remove it, and what happens if that code meets Vue 3.4 or later?"

**What a strong answer should cover:**
- **Reactivity Transform** was an experimental, opt-in **compile-time** transform: \`$ref\`, \`$computed\`, \`$shallowRef\` and friends declared "reactive variables" that the compiler rewrote to \`ref()\` plus \`.value\`; \`$()\` destructured refs and \`$$()\` escaped back to the raw ref.
- History: shipped experimentally in **3.2.0 (Aug 2021)**, dropped by the team in **Feb 2023**, **deprecated in 3.3.0 (May 2023)**, **removed in 3.4.0 (Dec 2023)**. Removal in a minor was allowed because the feature was experimental.
- Reasons: without \`.value\` it is harder to see what is reactive and what triggers effects; it behaved differently inside and outside SFCs; refs were still needed at function boundaries (\`$$()\`), adding a concept; and it risked splitting the ecosystem into two dialects.
- On 3.4+ the macros are just undeclared identifiers: the SFC still compiles, then fails at runtime with \`ReferenceError: $ref is not defined\`; type-checking reports \`Cannot find name '$ref'\`.
- Options: migrate to plain \`ref\`/\`computed\` with \`.value\`, or keep the syntax via the **Vue Macros** plugin. **Reactive props destructure** is the one piece that survived, stable since 3.5.

**Clarifying questions expected:**
- "Is this a codebase that is still on 3.3, or one that already upgraded and is broken?"
- "Do you want the migration path, or the design reasoning?"

**Code / implementation expected:** Optional — the same counter written with \`$ref\` and with \`ref\`, and what the compiler does with each.`,
    answer: `**Target Audience:** Vue developers maintaining or interviewing about code from the 3.2/3.3 era, and anyone curious why Vue still makes you type <code>.value</code>.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. Dates and the deprecation history come from the vuejs/core changelogs, the Vue blog and the original RFC discussion, linked inline. What happens to old code today was checked by compiling and running it on Vue 3.5.44 and type-checking it with vue-tsc 3.3.13; the Vue Macros output was produced with <code>@vue-macros/reactivity-transform</code> 3.1.4.

## 1. Why This Even Matters — A Story First

A city once tried an experiment: it removed the painted lines between cycle lanes and car lanes on one street, arguing that drivers and cyclists would read the road better without visual clutter. It did look cleaner. But people new to the street could no longer tell where the cycle lane was, the rules changed the moment you turned onto a normal street, and every map of the city now needed two legends. After a trial period, the city repainted the lines.

<code>.value</code> is Vue's painted line. It is a little ugly, but it tells you, at a glance, "this is reactive, and this line can trigger updates". **Reactivity Transform** was the experiment that removed it. Interviewers like this question because the answer is not "it was buggy"; it is a design argument about readability, consistency and ecosystem cost, and it explains why modern Vue looks the way it does.

## 2. What It Was

📌 **Interview term: Reactivity Transform** — an experimental, opt-in **compile-time** transform for <code>&lt;script setup&gt;</code> (and, with the Vite plugin, plain JS/TS files). You enabled it with <code>vue({ reactivityTransform: true })</code> in <code>vite.config.js</code>.

📌 **Interview term: Compile-time macro** — a function-looking call that never runs. The compiler recognises it and rewrites the code. <code>$ref</code> was one; <code>defineProps</code> is one you still use.

📌 **Interview term: Reactive variable** — what a macro declared: a variable you read and assign like a normal one, which the compiler turned into a ref with <code>.value</code> appended at every use.

The macro family, per the old docs page:

| Macro | Compiled to | Purpose |
| :--- | :--- | :--- |
| <code>$ref(x)</code> | <code>ref(x)</code> | A reactive variable without <code>.value</code> |
| <code>$computed(fn)</code> | <code>computed(fn)</code> | A derived reactive variable |
| <code>$shallowRef</code>, <code>$customRef</code>, <code>$toRef</code> | The matching API | The rest of the ref family |
| <code>$(refs)</code> | Destructured refs | Turn existing refs (for example a composable result) into reactive variables |
| <code>$$(x)</code> | The underlying ref | Escape hatch to pass the actual ref across a function boundary |

So <code>let count = $ref(0); count++</code> became <code>let count = ref(0); count.value++</code>. The template never needed <code>.value</code> anyway, because templates already [unwrap top-level refs](/interview-question/what-is-the-difference-between-ref-and-reactive).

## 3. The Timeline

<svg class="iq-diagram" width="100%" viewBox="0 0 800 200" role="img" aria-label="Timeline: experimental in 3.2.0 in August 2021, dropped in February 2023, deprecated in 3.3.0 in May 2023, removed in 3.4.0 in December 2023, props destructure stable in 3.5.0 in September 2024.">
  <defs>
    <marker id="q10-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="50" width="120" height="96" rx="10"/>
  <text class="d-text" x="80" y="80" text-anchor="middle">3.2.0</text>
  <text class="d-sub" x="80" y="104" text-anchor="middle">Aug 2021</text>
  <text class="d-sub" x="80" y="126" text-anchor="middle">experimental</text>
  <rect class="d-box-muted" x="180" y="50" width="120" height="96" rx="10"/>
  <text class="d-text" x="240" y="80" text-anchor="middle">RFC</text>
  <text class="d-sub" x="240" y="104" text-anchor="middle">Feb 2023</text>
  <text class="d-sub" x="240" y="126" text-anchor="middle">dropped</text>
  <rect class="d-box-muted" x="340" y="50" width="120" height="96" rx="10"/>
  <text class="d-text" x="400" y="80" text-anchor="middle">3.3.0</text>
  <text class="d-sub" x="400" y="104" text-anchor="middle">May 2023</text>
  <text class="d-sub" x="400" y="126" text-anchor="middle">deprecated</text>
  <rect class="d-box-accent" x="500" y="50" width="120" height="96" rx="10"/>
  <text class="d-text d-accent" x="560" y="80" text-anchor="middle">3.4.0</text>
  <text class="d-sub" x="560" y="104" text-anchor="middle">Dec 2023</text>
  <text class="d-sub" x="560" y="126" text-anchor="middle">removed</text>
  <rect class="d-box" x="660" y="50" width="120" height="96" rx="10"/>
  <text class="d-text" x="720" y="80" text-anchor="middle">3.5.0</text>
  <text class="d-sub" x="720" y="104" text-anchor="middle">Sep 2024</text>
  <text class="d-sub" x="720" y="126" text-anchor="middle">props destructure</text>
  <path class="d-edge" d="M 144 98 L 174 98" marker-end="url(#q10-arrow)"/>
  <path class="d-edge" d="M 304 98 L 334 98" marker-end="url(#q10-arrow)"/>
  <path class="d-edge" d="M 464 98 L 494 98" marker-end="url(#q10-arrow)"/>
  <path class="d-edge-dashed" d="M 624 98 L 654 98" marker-end="url(#q10-arrow)"/>
</svg>

The last box is dashed-linked because it is not part of the removal: it is the one idea from the experiment that graduated, as explained in section 7.

| Date | Event | Source |
| :--- | :--- | :--- |
| 2021-08-04 | "Ref sugar" RFC posted as vuejs/rfcs discussion #369 | <a href="https://github.com/vuejs/rfcs/discussions/369" target="_blank" rel="noopener noreferrer">RFC discussion #369</a> |
| 2021-08-09 | Vue 3.2.0 ships "(experimental) new ref sugar"; later renamed Reactivity Transform | <a href="https://github.com/vuejs/core/blob/main/changelogs/CHANGELOG-3.2.md" target="_blank" rel="noopener noreferrer">3.2 changelog</a> |
| 2023-02-21 | Evan You announces the team is "officially dropping this RFC" | <a href="https://github.com/vuejs/rfcs/discussions/369#discussioncomment-5059028" target="_blank" rel="noopener noreferrer">the dropping comment</a> |
| 2023-05-11 | Vue 3.3.0: "**sfc:** deprecate reactivity transform" (still transforms, prints a warning; see section 5) | <a href="https://github.com/vuejs/core/blob/main/changelogs/CHANGELOG-3.3.md" target="_blank" rel="noopener noreferrer">3.3 changelog</a> |
| 2023-12-29 | Vue 3.4.0: "feat!: remove reactivity transform (#9321)" | <a href="https://github.com/vuejs/core/blob/main/changelogs/CHANGELOG-3.4.md" target="_blank" rel="noopener noreferrer">3.4 changelog</a> |
| 2024-09-03 | Vue 3.5.0: reactive props destructure enabled by default | <a href="https://github.com/vuejs/core/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer">3.5 changelog</a> |

The 3.4 release notes explain why a removal could land in a minor version: "Reactivity Transform was marked deprecated in 3.3 and is now removed in 3.4. This change does not require a major due to the feature being experimental." The Vue docs add that <code>@vitejs/plugin-vue</code> 5.0 and above also dropped the option. (The Announcing Vue 3.4 blog post is dated 2023-12-28; the changelog entry for 3.4.0 is dated 2023-12-29.)

## 4. Why It Was Removed

From Evan You's February 2023 comment on the RFC (paraphrased; the full text is at the link above), the team found these problems in real-world use:

1. **Harder to tell what is reactive.** Without <code>.value</code>, you cannot see at a glance which variables are tracked and which line triggers a reactive effect. The cost grows with codebase size, especially once the syntax spreads outside SFCs.
2. **Two mental models.** Some people used it only in SFCs, so the same reactive value was written differently depending on the file, and switching context between the two styles had a real cost.
3. **The ref never went away.** Functions and composables still accept and return refs, so developers had to learn when to convert between reactive variables and refs (<code>$()</code>, <code>$$()</code>). That was one more concept, and it confused beginners more than plain <code>.value</code>.
4. **Ecosystem fragmentation.** Code written with and without the transform looks like two dialects of Vue, and people objected to having to work in both.

The conclusion in that comment is the line to quote: landing it as a stable feature "would result in more issues than benefits".

Reason 3 is easy to see for yourself. Running Vue Macros' transform (the maintained external version) on this file:

\`\`\`vue
<script setup>
import { watch } from "vue";
function trackChange(x) {
  watch(x, () => console.log("x changed!"));
}
let count = $ref(0);
trackChange(count);     // looks right, but passes a number
trackChange($$(count)); // the escape hatch passes the ref
</script>
\`\`\`

produced:

\`\`\`
let count = _ref(0);
trackChange(count.value);     // looks right, but passes a number
trackChange((count)); // the escape hatch passes the ref
\`\`\`

The innocent-looking <code>trackChange(count)</code> passes a plain number, so the watcher inside never fires. You have to remember <code>$$()</code> at every function boundary, which is exactly the kind of [reactivity loss](/interview-question/what-are-common-reactivity-caveats-in-vue) the feature was meant to make easier to avoid.

## 5. Verified: What Old Code Does on Vue 3.5.44

Take a component written for the transform:

\`\`\`vue
<script setup>
// Reactivity Transform syntax (Vue 3.2-3.3, experimental). Removed from core in 3.4.
let count = $ref(0);
const double = $computed(() => count * 2);

function increment() {
  count++;
}
</script>

<template>
  <button @click="increment">{{ count }} x 2 = {{ double }}</button>
</template>
\`\`\`

**It still compiles.** <code>compileScript</code> from <code>@vue/compiler-sfc</code> 3.5.44 leaves the macros untouched, with or without the old option:

\`\`\`
@vue/compiler-sfc 3.5.44
options {} -> compiled lines:
   let count = $ref(0);
   const double = $computed(() => count * 2);
   count++;
options {"reactivityTransform":true} -> compiled lines:
   let count = $ref(0);
   const double = $computed(() => count * 2);
   count++;
exports mentioning transform: shouldTransformRef
\`\`\`

The option is silently ignored, and the only leftover is a stub: in 3.5.44, <code>shouldTransformRef</code> is literally <code>() => false</code>, kept (per its <code>@deprecated</code> note) "to avoid breaking vite-plugin-vue &lt; 5.0 with reactivityTransform: true".

**It fails at runtime.** Mounting it in jsdom:

\`\`\`
[Vue warn]: Unhandled error during execution of setup function
  at <App>
ReferenceError: $ref is not defined
\`\`\`

**Type-checking catches it first.** With <code>lang="ts"</code>, <code>vue-tsc --noEmit</code> reported:

\`\`\`
Old.vue(3,13): error TS2304: Cannot find name '$ref'.
Old.vue(4,16): error TS2304: Cannot find name '$computed'.
\`\`\`

For contrast, the same file through <code>@vue/compiler-sfc</code> **3.3.13** with <code>reactivityTransform: true</code> still transformed, and printed the deprecation warning:

\`\`\`
[@vue/reactivity-transform] Reactivity Transform was an experimental feature and has now been deprecated. It will be removed from Vue core in 3.4. If you intend to continue using it, switch to https://vue-macros.sxzz.moe/features/reactivity-transform.html.
See reason for deprecation here: https://github.com/vuejs/rfcs/discussions/369#discussioncomment-5059028

   import { ref as _ref, computed as _computed } from 'vue'
   let count = _ref(0);
   const double = _computed(() => count.value * 2);
   count.value++;
\`\`\`

So the honest answer to "what happens on 3.4+" is: a build without type-checking succeeds, and the component crashes when it is set up. That makes type-checking in CI (see [TypeScript with Vue](/interview-question/how-do-you-use-typescript-with-vue-typed-props-emits-refs-vue-tsc)) the cheapest way to find leftovers.

## 6. Verified: the Two Ways Forward

**Option A, recommended: migrate to plain refs.** The runnable example on this page is the same counter in today's style, plus a composable that receives the ref directly with no escape hatch:

\`\`\`
[app] RENDERED: 0 x 2 = 0
count: 0 -> 1
count: 1 -> 2
[app] AFTER 2 CLICKS: 2 x 2 = 4
\`\`\`

The mechanical rewrite is: <code>$ref(x)</code> → <code>ref(x)</code>, <code>$computed</code> → <code>computed</code>, add <code>.value</code> to every script read and write, replace <code>$$(x)</code> with <code>x</code>, and replace <code>$()</code> destructuring with plain destructuring of refs (or [toRefs](/interview-question/what-do-toref-and-torefs-do)). Templates do not change. The dropping announcement mentioned a command-line tool for reverting the syntax; this doc did not run it, so check the RFC thread for the current tool before relying on it.

**Option B: keep the syntax with Vue Macros.** The external plugin does the rewrite before Vue's compiler sees the file. Its output for the old counter, from <code>@vue-macros/reactivity-transform</code> 3.1.4:

\`\`\`vue
<script setup>import { ref as _ref, computed as _computed } from 'vue';

// Reactivity Transform syntax (Vue 3.2-3.3, experimental). Removed from core in 3.4.
let count = _ref(0);
const double = _computed(() => count.value * 2);

function increment() {
  count.value++;
}
</script>
\`\`\`

That output mounted and clicked on Vue 3.5.44 rendered <code>2 x 2 = 4</code> after two clicks. It works, but you are now depending on a third-party compiler step for a syntax the core team decided against, and every new teammate has to learn the dialect.

## 7. What Survived: Reactive Props Destructure

The experiment also covered destructuring <code>defineProps()</code>. That part was split out into its own RFC (vuejs/rfcs discussion #502). On 3.3.13 it was opt-in: without the flag, <code>const { msg } = defineProps(['msg']); console.log(msg)</code> compiled to a plain <code>console.log(msg)</code>; with <code>propsDestructure: true</code> it compiled to <code>console.log(__props.msg)</code> and printed "This project is using reactive props destructure, which is an experimental feature". It was then **stabilised in 3.5**: the Announcing Vue 3.5 post says "Reactive Props Destructure has been stabilized in 3.5", and the compiler rewrites each use of a destructured prop to <code>props.x</code>. It survived because it is narrow: it only applies to props, inside one macro call, with a compiler error if you pass the variable straight into <code>watch()</code>. See [defineProps](/interview-question/how-do-defineprops-and-defineemits-work-in-script-setup).

## 8. Common Pitfalls

- **Saying it was removed because it was buggy.** The stated reasons are about readability, consistency and fragmentation, not defects.
- **Getting the version wrong.** Deprecated in 3.3, removed in 3.4. It was never a stable feature.
- **Assuming the build will fail loudly.** Without type-checking it compiles fine and crashes in <code>setup</code> with <code>ReferenceError: $ref is not defined</code>.
- **Forgetting <code>.value</code> during migration in places the transform handled for you,** such as arguments passed to composables, which now need the ref itself, and conditions like <code>if (isOpen.value)</code>.
- **Confusing it with props destructure.** The props part is official and stable since 3.5; the <code>$ref</code> family is not.
- **Treating Vue Macros as a long-term default.** It is a valid bridge, but it keeps a non-standard dialect in your codebase.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"Reactivity Transform was an experimental compile step where <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$ref</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$computed</code> declared variables without <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.value</code>, and the compiler added <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.value</code> back."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Timeline:</strong> <span style="color:#f0e2c8;">"It shipped experimentally in 3.2.0 in August 2021, the team dropped the RFC in February 2023, 3.3 deprecated it and 3.4.0 removed it in December 2023; a minor could remove it because it was experimental."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why:</strong> <span style="color:#f0e2c8;">"Without <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.value</code> you cannot see what is reactive or what triggers effects, it behaved differently inside and outside SFCs, you still needed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$()</code> at function boundaries, and it split Vue into two dialects."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. What old code does now:</strong> <span style="color:#f0e2c8;">"On 3.5 the macros are just undeclared names: the SFC compiles, then throws <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ReferenceError: $ref is not defined</code> in setup, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vue-tsc</code> reports <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Cannot find name '$ref'</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Ways forward:</strong> <span style="color:#f0e2c8;">"Migrate mechanically to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ref</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.value</code>, or keep the syntax with the Vue Macros plugin. The surviving idea is reactive props destructure, stable since 3.5."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why could Vue remove a feature in a minor release?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It was never stable: it was opt-in, flagged as experimental from the start, and deprecated a release earlier. The 3.4 release notes say the removal did not require a major for exactly that reason.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What was <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">$()</code> for, and why does it matter for the decision?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Functions and composables take refs, but a reactive variable compiled to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">count.value</code>, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">trackChange(count)</code> passed a number. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$(count)</code> passed the ref. Needing that escape hatch everywhere was one of the stated reasons for dropping it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">If I upgrade a 3.3 app that used it, will the build fail?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not necessarily. On 3.5.44 the compiler leaves <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$ref(0)</code> as an ordinary call and ignores the old option, so the build can succeed and the component throws at runtime. Type-checking with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vue-tsc</code> in CI is what catches it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is there a supported way to keep using it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Vue Macros provides it as an external plugin that rewrites the macros to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ref</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> before Vue compiles the file. It works on 3.5, but you are relying on a third-party compiler step for a dialect the core team decided against.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is reactive props destructure different?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is narrow and official: it only applies to destructuring <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineProps()</code>, the compiler rewrites uses to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">props.x</code>, and it errors if you pass the variable straight into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watch()</code>. It was opt-in in 3.3 and became stable and on by default in 3.5.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Reactivity Transform** | Experimental compile step that removed <code>.value</code> via <code>$ref</code> and friends |
| **Compile-time macro** | A call the compiler rewrites; it never runs |
| **Reactive variable** | A variable the transform compiled into a ref with <code>.value</code> |
| **<code>$$()</code>** | Escape hatch that passed the underlying ref across a function boundary |
| **Vue Macros** | Third-party compiler plugin that still offers the transform |
| **Reactive props destructure** | The surviving piece: reactive <code>defineProps</code> destructuring, stable in 3.5 |

---
**Conclusion:** Reactivity Transform let you write <code>let count = $ref(0)</code> and drop <code>.value</code>, by having the compiler add it back. It shipped as an experiment in 3.2.0 (August 2021), was dropped by the team in February 2023, deprecated in 3.3.0 and removed in 3.4.0 (December 2023), because hiding <code>.value</code> made reactive code harder to read, split Vue into two dialects and still forced you to think about refs at every function boundary. On Vue 3.5.44 such code still compiles, crashes at runtime with <code>$ref is not defined</code>, and fails type-checking; the fixes are a mechanical migration to <code>ref</code> or the Vue Macros plugin. The one idea that graduated is reactive props destructure, stable since 3.5.`,
    examples: [
      {
        label: "The modern equivalent: ref, computed and passing the ref to a composable",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { ref, computed, watch } from "vue";

// Before (Reactivity Transform, removed in 3.4):
//   let count = $ref(0)
//   const double = $computed(() => count * 2)
//   useLogger($$(count))   // $$() was needed to pass the ref itself
// After: plain refs. The .value tells the reader "this is reactive".
const count = ref(0);
const double = computed(() => count.value * 2);

// Passing the ref object into a composable needs no escape hatch: it is just \`count\`.
function useLogger(source, label) {
  watch(source, (now, before) => console.log(\`\${label}: \${before} -> \${now}\`));
}
useLogger(count, "count");

function increment() {
  count.value++; // explicit: this line triggers effects
}
</script>

<template>
  <!-- templates unwrap top-level refs, so no .value here -->
  <button @click="increment">{{ count }} x 2 = {{ double }}</button>
</template>
`,
      },
      {
        label: "Legacy Reactivity Transform syntax (compiles on 3.4+, then ReferenceError: $ref is not defined)",
        tech: "vue",
        runnable: false,
        code: `<script setup>
// Reactivity Transform syntax (Vue 3.2-3.3, experimental). Removed from core in 3.4.
let count = $ref(0);
const double = $computed(() => count * 2);

function increment() {
  count++;
}
</script>

<template>
  <button @click="increment">{{ count }} x 2 = {{ double }}</button>
</template>
`,
      },
    ],
  },
];

export default augments;
