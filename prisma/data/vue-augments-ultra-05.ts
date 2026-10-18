/**
 * Vue ULTRA — batch 05: component communication and component boundaries
 * (communication patterns, slots, provide/inject and typing it, fallthrough
 * attributes and useAttrs(), defineExpose and closed <script setup>
 * instances, template refs and useTemplateRef()).
 *
 * Full CLAUDE.md treatment per question, matching the Angular, React and
 * Next.js ultra banks: a plain-language story first, `📌 Interview term:`
 * callouts, a Verified section quoting output that was actually produced, a
 * theme-aware `.iq-diagram` SVG, comparison tables, topic-specific pitfalls,
 * the §7 "How to Answer in an Interview" card, a glossary and a conclusion.
 *
 * Every "Verified" block was produced on Vue 3.5.44 (the current stable):
 * single-file examples with scripts/verify-vue-example.mjs (compiled with
 * @vue/compiler-sfc, mounted in jsdom), multi-file examples with Vitest 5.0.5
 * + @vue/test-utils 2.5.1 + @vitejs/plugin-vue 6.0.10, type errors with
 * vue-tsc 3.3.13, and production-versus-dev differences with a real
 * `vite build` (Vite 8.3.4) run in jsdom. Examples marked runnable are a
 * single App.vue that imports only from "vue" and passed the verifier.
 *
 * Conventions: SVG attributes double-quoted, no apostrophes inside SVG blocks,
 * `<code>` tags or backticks for inline code in prose, no leading H1,
 * `description` is plain markdown (no HTML).
 */
import type { VueAugment } from "./vue-augments.types";

const augments: VueAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do Vue components communicate?",
    seoDescription:
      "Props down, events up, v-model, slots, provide/inject, template refs and Pinia: how Vue 3 components talk, and when to pick each channel.",
    description: `**Question presented to candidate:**
"We have a checkout page with a cart summary, a quantity stepper inside each line item, and a badge in the top toolbar that shows the item count. Walk me through the ways Vue components can share data and send messages, and which one you would use for each of those pieces."

**What a strong answer should cover:**
- **Props down, events up** is the default: the parent passes data with props, the child reports changes with \`emit\`, and the child never mutates a prop.
- **\`v-model\` on a component** is shorthand for a \`modelValue\` prop plus an \`update:modelValue\` event, and \`defineModel()\` (Vue 3.4+) writes both for you.
- **Slots** let a parent send template content into a child, and scoped slots let the child pass data back into that content.
- **\`provide\` / \`inject\`** skips the layers in between for deep trees (theme, form context, a cart), and providing a ref keeps it reactive.
- **Template refs + \`defineExpose\`** for the rare imperative call (focus, reset), and **a store such as Pinia** for state shared by distant parts of the app.
- Vue 3 removed \`$on\` / \`$off\`, so the Vue 2 "event bus" needs an external emitter, and is usually a sign a store or provide/inject fits better.

**Clarifying questions expected:**
- "Are these components parent and child, or far apart in the tree?"
- "Does the shared state need to survive route changes or be visible in devtools?"

**Code / implementation expected:** Yes — a child that takes a prop and emits an event (or uses \`defineModel\`), plus a provide/inject or store example for the distant badge.`,
    answer: `**Target Audience:** Anyone preparing for a Vue interview. Assumes basic JavaScript; no prior Vue knowledge needed.
**Difficulty:** Medium

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. Every output quoted in the "Verified" sections was produced by running the code on Vue 3.5.44, either with the repo verifier (compiled with <code>@vue/compiler-sfc</code> and mounted in jsdom) or with Vitest and Vue Test Utils.

## 1. Why This Even Matters — A Story First

Think of a restaurant. The head chef hands each cook a ticket that says what to make: "two burgers, no onions". The cook does not rewrite the ticket. When the burgers are ready, the cook rings a bell and shouts "order 12 up!". The chef hears it and decides what happens next.

That is most of Vue component communication. The ticket is a **prop**: data that flows down from parent to child, read-only for the child. The bell is an **event**: the child announces that something happened and lets the parent decide what to do about it.

But a restaurant has other channels too. A menu template lets the chef say "put whatever garnish I give you here" (a **slot**). A notice pinned in the kitchen tells every cook which allergens are on today without the chef walking up to each station (**provide / inject**). Once in a while the chef walks over and presses a cook's timer directly (a **template ref**). And the stock room, shared by everyone, is the **store**.

Interviewers ask this question because picking the wrong channel is the most common source of tangled Vue code: props drilled through five layers, children mutating parent state, or a global event bus nobody can trace. The strong answer is not a list of APIs. It is knowing **which channel fits which relationship**.

## 2. The Core Idea: Pick the Channel by Relationship

📌 **Interview term: One-way data flow** — data moves down the tree through props, and changes move up through events. The owner of a piece of state is the only component that changes it. This makes it easy to answer "who changed this value?" because there is exactly one place to look.

📌 **Interview term: Props** — the inputs a component declares (with \`defineProps\` in \`<script setup>\`). The parent binds them in the template: \`<Stepper :step="2" />\`. They are read-only inside the child. See [props and validation](/interview-question/what-are-props-in-vue-and-how-do-you-validate-them).

📌 **Interview term: Emits (custom events)** — the messages a child declares with \`defineEmits\` and sends with \`emit("limit", value)\`. The parent listens with \`@limit="handler"\`. Declaring them documents the component and keeps them out of the fallthrough attributes. See [why declare emits](/interview-question/why-declare-emits-and-can-you-validate-them).

📌 **Interview term: Component v-model** — sugar for a prop called \`modelValue\` plus an event called \`update:modelValue\`. Since Vue 3.4, \`defineModel()\` in the child declares both and gives you a ref you can assign. See [v-model on components](/interview-question/how-does-v-model-work-on-components).

The full menu of channels:

| Channel | Direction | Use it for | Example |
| :--- | :--- | :--- | :--- |
| Props | Parent to child | Configuration and data the child displays | \`:items="cart.items"\` |
| Emits | Child to parent | "Something happened" notifications | \`@remove="removeLine(id)"\` |
| \`v-model\` / \`defineModel\` | Both, for one value | A child that edits a value the parent owns | \`v-model="quantity"\` |
| [Slots](/interview-question/what-are-slots-in-vue) | Parent to child (template), child to parent (scoped slot props) | Letting the parent decide what a region looks like | A card with a custom footer |
| [\`provide\` / \`inject\`](/interview-question/what-are-provide-and-inject) | Ancestor to any descendant | Context many layers deep: theme, form, current user | A toolbar badge reading the cart |
| [Template ref](/interview-question/how-do-you-access-a-dom-element-or-child-component-instance) + [\`defineExpose\`](/interview-question/what-is-defineexpose) | Parent calls into child | Imperative actions: focus, scroll, reset | \`form.value.reset()\` |
| [Pinia store](/interview-question/what-is-pinia-and-why-use-it) | Any component to any component | App-wide state, shared across routes | Cart, auth session |
| [Fallthrough attributes](/interview-question/what-are-fallthrough-attributes-attrs) | Parent to child root element | Passing \`class\`, \`aria-*\`, native listeners through a wrapper | \`<BaseButton class="primary" />\` |

## 3. The Map

<svg class="iq-diagram" width="100%" viewBox="0 0 720 360" role="img" aria-label="Communication channels between a parent, a child, a deep descendant and a store">
  <defs>
    <marker id="vcomm-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="220" y="30" width="220" height="56" rx="12"/>
  <text class="d-text d-accent" x="330" y="56" text-anchor="middle">Checkout (parent)</text>
  <text class="d-sub" x="330" y="76" text-anchor="middle">owns quantity state</text>
  <rect class="d-box" x="40" y="220" width="220" height="56" rx="12"/>
  <text class="d-text" x="150" y="246" text-anchor="middle">Stepper (child)</text>
  <text class="d-sub" x="150" y="266" text-anchor="middle">shows and edits one value</text>
  <path class="d-edge-accent" d="M 250 90 L 130 214" marker-end="url(#vcomm-arrow)"/>
  <text class="d-sub" x="128" y="150" text-anchor="middle">props down</text>
  <path class="d-edge" d="M 190 214 L 290 92" marker-end="url(#vcomm-arrow)"/>
  <text class="d-sub" x="296" y="160" text-anchor="middle">events up</text>
  <rect class="d-box" x="440" y="220" width="240" height="56" rx="12"/>
  <text class="d-text" x="560" y="246" text-anchor="middle">Toolbar badge</text>
  <text class="d-sub" x="560" y="266" text-anchor="middle">several layers below</text>
  <path class="d-edge-dashed" d="M 420 90 L 540 214" marker-end="url(#vcomm-arrow)"/>
  <text class="d-sub" x="560" y="150" text-anchor="middle">provide and inject</text>
  <rect class="d-box-muted" x="230" y="300" width="200" height="44" rx="10"/>
  <text class="d-text" x="330" y="327" text-anchor="middle">Pinia store</text>
</svg>

The parent and the stepper talk directly through props and events. The badge is far away in the tree, so the parent provides the cart and the badge injects it, skipping every component in between. When state must outlive this page or be shared by unrelated screens, it moves out of the component tree into a store.

## 4. Verified: Props, Events, v-model and provide/inject Together

The runnable example (first example below) builds the checkout from the story. Each \`Stepper\` receives its value with \`v-model\` and a \`step\` prop, emits \`update:modelValue\` to change it, and emits \`limit\` when the user tries to leave the range 0 to 10. A \`Toolbar\` renders a \`Badge\` that injects the cart total without the toolbar knowing anything about it.

Output from the verifier, clicking "+" on apples (step 2) once, then "-" on pears twice. Each line is the page text, so adjacent elements run together:

\`\`\`
[app] RENDERED: apples - 2 +pears - 1 +toolbar | badge sees 3 items
apples + : apples - 4 +pears - 1 +toolbar | badge sees 5 items
pears - - : apples - 4 +pears - 0 +toolbar | badge sees 4 itemspears cannot be -1
\`\`\`

Three things to notice:

1. **The parent owns the numbers.** The stepper never assigns its prop; it emits and the parent's \`v-model\` writes \`apples\`.
2. **The second "-" on pears did not go below zero.** The child refused and emitted \`limit\` with the rejected value \`-1\`, and the parent turned that into the warning text.
3. **The badge updated without a single prop on \`Toolbar\`.** The provided value is a \`computed\`, so the injecting component tracks it like any other ref.

The second example is the same stepper as a real \`<script setup>\` SFC with \`defineModel\`, \`defineProps\` and \`defineEmits\`. Mounted with Vue Test Utils (starting at 9 with step 2, max 10):

\`\`\`
after -: 7 | emitted: [[7]]
after + +: 9 | limit events: [[11]]
\`\`\`

Assigning \`count.value = next\` on a \`defineModel\` ref is what emitted \`update:modelValue\` with \`7\`; the attempt to reach 11 emitted \`limit\` instead.

## 5. Verified: What Breaks When You Skip the Rules

A child that mutates its prop and emits a misspelled event, run on 3.5.44:

\`\`\`
typeof this.$on in Vue 3: undefined
[Vue warn] Set operation on key "count" failed: target is readonly. { count: 1 }
[Vue warn]: Component emitted event "chnage" but it is neither declared in the emits option nor as an "onChnage" prop.
after click: 1
\`\`\`

- **Props are read-only.** \`props.count++\` was refused with a dev warning and the value stayed \`1\`. (Through \`this.count\` in the Options API the wording is "Attempting to mutate prop", but the effect is the same.)
- **Declared emits catch typos.** Because the child declared \`emits: ["change"]\`, emitting \`"chnage"\` produced a warning instead of silently doing nothing.
- **There is no \`$on\` in Vue 3.** The instance event API (\`$on\`, \`$off\`, \`$once\`) was removed, so the Vue 2 "event bus" pattern (\`new Vue()\` used as a global emitter) has no built-in replacement. If you truly need a pub/sub channel, use a tiny emitter library, but first ask whether a store or provide/inject would be easier to trace. See [what changed from Vue 2 to Vue 3](/interview-question/what-changed-from-vue-2-to-vue-3-and-what-does-vue-2-end-of-life-mean); Vue 2 itself reached end of life on 31 December 2023 (source: <a href="https://v2.vuejs.org/eol/" target="_blank" rel="noopener noreferrer">v2.vuejs.org/eol</a>).

## 6. Choosing Between the Deeper Channels

📌 **Interview term: Prop drilling** — passing a prop through components that do not use it, only so a deeper component can. Two or three layers is fine and explicit. Beyond that, every middle component's API is polluted with someone else's data. React developers know the same problem (see [prop drilling in React](/interview-question/what-is-prop-drilling-and-how-can-it-be-avoided)).

| Situation | Good fit | Why |
| :--- | :--- | :--- |
| A reusable \`<Tabs>\` with \`<Tab>\` children | provide/inject | The context belongs to that subtree only, and two tab groups on one page must not share state |
| The signed-in user, the cart, feature flags | Pinia | Many unrelated screens read it; you want devtools, SSR support and testing helpers |
| A modal that must expose \`open()\` and \`close()\` | Template ref + \`defineExpose\` | An imperative command, not a piece of state |
| A table that lets the caller format each cell | Scoped slot | The child owns the loop, the parent owns the markup |
| A wrapper around \`<input>\` | Props, \`v-model\`, fallthrough attrs | Keeps the native API (\`placeholder\`, \`@focus\`) without redeclaring it |

📌 **Interview term: Store** — a module of reactive state and actions that lives outside the component tree. In Vue the official recommendation is [Pinia](/interview-question/what-is-pinia-and-why-use-it). For how to slice stores in a big app, see [state management for a large Vue app](/interview-question/how-would-you-structure-state-management-for-a-large-vue-app). A [composable](/interview-question/what-are-composables-in-vue) that holds module-level refs is a lightweight store, but it is shared by every request during server-side rendering, which is one reason Pinia exists.

📌 **Interview term: Template ref** — a \`ref="name"\` attribute that gives the parent the child element or the child component instance after mount. A \`<script setup>\` child is **closed by default**: the parent sees only what the child lists in \`defineExpose\`. The reasoning behind that default is covered in [why script setup components are closed](/interview-question/what-is-defineexpose-and-why-are-script-setup-components-closed-by-default).

## 7. Common Pitfalls

- **Mutating a prop "just this once".** It is refused in dev (verified above) and confusing in any mode. Copy it into a local ref if the child needs its own draft, or emit an update.
- **Mutating an object prop's inner fields.** \`props.user.name = "x"\` is *not* blocked, because the props object is only shallowly read-only. On 3.5.44 it printed no warning and the parent text changed to "changed by child". It works, but it silently breaks one-way data flow; emit an event or use \`v-model\` instead.
- **Rebuilding the Vue 2 event bus.** Global emitters make it impossible to see who listens to what. Prefer a store for shared state and events for parent-child messages.
- **Reaching for \`$parent\` or template refs to read state.** That couples components to each other's internals. Refs are for commands such as \`focus()\`, not for reading data the parent could receive through an event.
- **Providing a plain value and expecting updates.** \`provide("count", count.value)\` hands over a snapshot. Provide the ref or a computed, as the badge example does.
- **Not declaring emits.** An undeclared \`click\` emit also falls through as a native listener, so a parent's \`@click\` can run twice. The details are in [fallthrough attributes](/interview-question/what-are-fallthrough-attributes-attrs).

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Lead with the rule:</strong> <span style="color:#f0e2c8;">"Vue is one-way: props go down, events go up, and the component that owns a piece of state is the only one that changes it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Two-way, done right:</strong> <span style="color:#f0e2c8;">"For a child that edits a value, I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-model</code>, which is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">modelValue</code> prop plus an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">update:modelValue</code> event, and in Vue 3.4+ <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineModel()</code> writes both."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Content, not data:</strong> <span style="color:#f0e2c8;">"When the parent should control what part of a child looks like, I use slots, and scoped slots when the child needs to hand data back."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Distance decides:</strong> <span style="color:#f0e2c8;">"For deep trees I use provide and inject with a ref so it stays reactive, and for app-wide state shared across screens I use a Pinia store."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Escape hatch:</strong> <span style="color:#f0e2c8;">"Template refs with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineExpose</code> are for imperative calls such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">focus()</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reset()</code>, and I avoid <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$parent</code> and global event buses because nobody can trace them."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can a child not just change its prop?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because the parent would no longer be the single source of truth: the next parent render overwrites the change, and debugging who changed the value gets hard. In dev Vue refuses the write with a warning, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set operation on key "count" failed: target is readonly</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What replaced the event bus from Vue 2?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Nothing built in: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$on</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$off</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$once</code> were removed from instances in Vue 3. Use a store for shared state, provide/inject for subtree context, or an external emitter library if you genuinely need pub/sub.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you choose provide/inject over Pinia?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the state belongs to one subtree instance, such as a form and its fields or a tabs group and its tabs. Two forms on one page each get their own provider. Pinia is for state that is global to the app or must survive navigation.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">v-model</code> on a component compile?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-model="qty"</code> on a component becomes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:modelValue="qty"</code> plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@update:modelValue="v =&gt; qty = v"</code>. Named models such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-model:title</code> use the prop <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">title</code> and the event <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">update:title</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is reading a child's state through a template ref a good idea?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Usually not. It couples the parent to the child internals and only works after mount. A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;script setup&gt;</code> child exposes nothing unless it calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineExpose</code>, which nudges you to keep refs for commands and use events for data.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **One-way data flow** | Data goes down through props, changes come back up through events |
| **Props** | Read-only inputs a component declares and its parent binds |
| **Emits** | Named events a child declares and sends to its parent |
| **Component v-model** | A \`modelValue\` prop plus an \`update:modelValue\` event; \`defineModel()\` creates both |
| **Prop drilling** | Passing a prop through layers that do not use it |
| **Store** | Reactive state outside the component tree, shared by any component (Pinia) |
| **Template ref** | A handle on a child element or component instance, available after mount |

---
**Conclusion:** Vue gives you one default channel and several specialised ones. Props down and events up, with \`v-model\` and \`defineModel\` for a value the child edits, cover most parent-child work, and Vue enforces them: on 3.5.44 a prop write was refused and a misspelled declared event produced a warning. Slots hand template content across the boundary, provide/inject reaches deep descendants without drilling (the badge stayed in sync through a provided computed), template refs with \`defineExpose\` handle imperative commands, and a Pinia store holds state that belongs to the whole app. Choosing by relationship and distance, not by habit, is the answer interviewers want.`,
    examples: [
      {
        label: "Props down, events up, v-model and provide/inject in one app",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { ref, computed, provide, inject, defineComponent, h } from "vue";

// Child -> parent: props come down, events go up.
const Stepper = defineComponent({
  props: { modelValue: Number, step: { type: Number, default: 1 } },
  emits: ["update:modelValue", "limit"],
  setup(props, { emit }) {
    const bump = (dir) => {
      const next = props.modelValue + dir * props.step;
      if (next < 0 || next > 10) return emit("limit", next);
      emit("update:modelValue", next);
    };
    return () =>
      h("span", { class: "stepper" }, [
        h("button", { class: "minus", onClick: () => bump(-1) }, "-"),
        \` \${props.modelValue} \`,
        h("button", { class: "plus", onClick: () => bump(1) }, "+"),
      ]);
  },
});

// Deep descendant: reads shared state without the middle layer passing props.
const Badge = defineComponent({
  setup() {
    const cart = inject("cart");
    return () => h("strong", { class: "badge" }, \`badge sees \${cart.total.value} items\`);
  },
});
const Toolbar = defineComponent({
  setup() {
    return () => h("nav", [h("span", "toolbar | "), h(Badge)]);
  },
});

const apples = ref(2);
const pears = ref(1);
const warning = ref("");
const total = computed(() => apples.value + pears.value);
provide("cart", { total });
</script>

<template>
  <p>apples <Stepper v-model="apples" :step="2" @limit="(v) => (warning = 'apples cannot be ' + v)" /></p>
  <p>pears <Stepper v-model="pears" @limit="(v) => (warning = 'pears cannot be ' + v)" /></p>
  <Toolbar />
  <p class="warn">{{ warning }}</p>
</template>
`,
      },
      {
        label: "Stepper.vue: the same child written with defineModel, defineProps and defineEmits",
        tech: "vue",
        runnable: false,
        code: `<script setup>
// Parent to child: props. Child to parent: events. Two-way: defineModel (Vue 3.4+).
const count = defineModel({ type: Number, default: 0 });
const props = defineProps({ step: { type: Number, default: 1 }, max: { type: Number, default: 10 } });
const emit = defineEmits(["limit"]);

function bump(dir) {
  const next = count.value + dir * props.step;
  if (next < 0 || next > props.max) return emit("limit", next);
  count.value = next; // emits update:modelValue for the parent
}
</script>

<template>
  <button @click="bump(-1)">-</button>
  <output>{{ count }}</output>
  <button @click="bump(1)">+</button>
</template>
`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are slots in Vue?",
    seoDescription:
      "Vue slots let a parent pass template content into a child: default, named and scoped slots, fallback content, $slots checks and lazy rendering.",
    description: `**Question presented to candidate:**
"Our design system has a \`Card\` component, and every team wants something different in the header and footer. We also have a \`DataTable\` where each team formats cells differently. How would you use slots to support all of that without adding a prop for every variation?"

**What a strong answer should cover:**
- A **slot** is a placeholder in the child (\`<slot />\`) that the parent fills with its own template content; the content is compiled in the **parent's scope**.
- **Named slots** (\`<slot name="footer">\`, filled with \`<template #footer>\`) for multiple regions, and **fallback content** between the \`<slot>\` tags.
- **Scoped slots**: the child passes data back as slot props (\`<slot :item="item">\`), and the parent receives it with \`#item="{ item }"\`. This is how a list or table owns the loop while the parent owns the markup.
- Slots compile to **functions** the child calls when it renders, so slot content is lazy and re-renders with the child.
- \`$slots\` (or \`useSlots()\`) lets the child check whether a slot was provided, for example to skip an empty header wrapper.
- Typing slots with \`defineSlots()\` in TypeScript, and the template rule that mixing \`v-slot\` on the component with named \`<template>\` slots is a compile error.

**Clarifying questions expected:**
- "Should the card render its header wrapper when no header is passed?"
- "Does the table need to hand row data back to the caller's cell template?"

**Code / implementation expected:** Yes — a component with a default and a named slot with fallback, and a scoped slot used by the parent.`,
    answer: `**Target Audience:** Anyone preparing for a Vue interview. Assumes you know what a component and a prop are.
**Difficulty:** Medium

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. The outputs in the "Verified" sections were produced on Vue 3.5.44: the runnable example with the repo verifier (compiled and mounted in jsdom), the SFC versions with Vitest and Vue Test Utils, and the compiler output with <code>@vue/compiler-dom</code>.

## 1. Why This Even Matters — A Story First

Picture a photo frame shop. The shop builds the frame: the wood, the glass, the hook on the back, the little card slot at the bottom for a caption. What goes *inside* the frame is up to you. The shop does not ask "which photo will you use?" and build a different frame for each one. It leaves a hole of the right shape.

Now imagine the shop also sells a frame with twelve small windows, one per month, and it already knows the month names. It hands you each month's name and says "you decide what picture goes next to it". That frame still owns the layout, but it shares information with whatever you put inside.

A Vue **slot** is that hole in the frame. A **named slot** is the separate caption window. A **scoped slot** is the twelve-month frame: the child knows the data, the parent decides how each piece looks.

Without slots, a reusable \`Card\` grows props like \`headerText\`, \`headerIcon\`, \`showFooter\`, \`footerButtonLabel\`, \`footerButtonVariant\`... and still cannot handle the team that wants a chart in the header. Slots replace that prop explosion with "give me any template you like, and I will put it here".

## 2. The Core Idea

📌 **Interview term: Slot** — an outlet, written \`<slot />\`, where a child component renders template content supplied by its parent. The content you write between \`<Card>\` and \`</Card>\` goes to the **default slot**.

📌 **Interview term: Render scope** — slot content is compiled where it is written, in the **parent**. It can read the parent's data, not the child's. The child decides *where* and *whether* the content appears; the parent decides *what* it is.

📌 **Interview term: Named slot** — a slot with a \`name\`, for components with several regions: \`<slot name="footer" />\` in the child, \`<template #footer>...</template>\` in the parent. \`#footer\` is shorthand for \`v-slot:footer\`.

📌 **Interview term: Fallback content** — markup placed between the child's \`<slot>\` tags, shown only when the parent passes nothing for that slot: \`<slot name="footer">No actions</slot>\`.

📌 **Interview term: Scoped slot** — a slot that passes data from the child back into the parent's content. The child binds **slot props** (\`<slot name="item" :item="item" :index="index">\`), and the parent destructures them: \`<template #item="{ item, index }">\`. It is the Vue equivalent of a React render prop.

| Kind | Child writes | Parent writes |
| :--- | :--- | :--- |
| Default | \`<slot />\` | Anything between the component tags |
| Named | \`<slot name="footer" />\` | \`<template #footer>...</template>\` |
| Fallback | \`<slot name="footer">No actions</slot>\` | Nothing for that slot |
| Scoped | \`<slot name="item" :item="item" />\` | \`<template #item="{ item }">...</template>\` |
| Default scoped, only slot | \`<slot :item="item" />\` | \`<List v-slot="{ item }">...</List>\` |
| Dynamic name | Any of the above | \`<template #[regionName]>...</template>\` |

## 3. Slots Are Functions

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="The parent compiles slot content into functions, the child calls them with slot props at its outlets">
  <defs>
    <marker id="vslot-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="160" y="30" text-anchor="middle">Parent template</text>
  <rect class="d-box-muted" x="30" y="50" width="260" height="210" rx="12"/>
  <rect class="d-box" x="55" y="78" width="210" height="44" rx="8"/>
  <text class="d-sub" x="160" y="105" text-anchor="middle">header: () =&gt; vnodes</text>
  <rect class="d-box" x="55" y="140" width="210" height="44" rx="8"/>
  <text class="d-sub" x="160" y="167" text-anchor="middle">default: () =&gt; vnodes</text>
  <rect class="d-box-accent" x="55" y="202" width="210" height="44" rx="8"/>
  <text class="d-sub d-accent" x="160" y="229" text-anchor="middle">item: (props) =&gt; vnodes</text>
  <text class="d-text" x="560" y="30" text-anchor="middle">Child render</text>
  <rect class="d-box-muted" x="430" y="50" width="260" height="210" rx="12"/>
  <rect class="d-box" x="455" y="78" width="210" height="44" rx="8"/>
  <text class="d-sub" x="560" y="105" text-anchor="middle">header outlet</text>
  <rect class="d-box" x="455" y="140" width="210" height="44" rx="8"/>
  <text class="d-sub" x="560" y="167" text-anchor="middle">body outlet</text>
  <rect class="d-box-accent" x="455" y="202" width="210" height="44" rx="8"/>
  <text class="d-sub d-accent" x="560" y="229" text-anchor="middle">each row calls item</text>
  <path class="d-edge" d="M 270 100 L 450 100" marker-end="url(#vslot-arrow)"/>
  <path class="d-edge" d="M 270 162 L 450 162" marker-end="url(#vslot-arrow)"/>
  <path class="d-edge-accent" d="M 450 232 L 270 232" marker-end="url(#vslot-arrow)"/>
  <text class="d-sub" x="360" y="276" text-anchor="middle">row data</text>
</svg>

The parent does not hand the child finished DOM. It hands over a set of functions, one per slot, and the child calls each one at its outlet while rendering. For a scoped slot the child calls the function with arguments (the slot props), which is how row data travels back into the parent's template.

You can see this in the compiler output. This parent template:

\`\`\`html
<Card><template #header>{{ title }}</template><p>{{ body }}</p></Card>
\`\`\`

compiles (with \`@vue/compiler-dom\` 3.5.44) to:

\`\`\`js
return (_openBlock(), _createBlock(_component_Card, null, {
  header: _withCtx(() => [
    _createTextVNode(_toDisplayString(_ctx.title), 1 /* TEXT */)
  ]),
  default: _withCtx(() => [
    _createElementVNode("p", null, _toDisplayString(_ctx.body), 1 /* TEXT */)
  ]),
  _: 1 /* STABLE */
}))
\`\`\`

📌 **Interview term: Compiled slot (slot function)** — each slot becomes a function wrapped in \`withCtx\`, which remembers the parent's render context so \`_ctx.title\` still points at the parent's data when the child calls it. The \`_: 1 /* STABLE */\` flag tells the runtime the set of slots never changes, so updates can skip extra work (the compiler side of this is covered in [how the Vue compiler optimises templates](/interview-question/how-does-the-vue-compiler-optimize-templates-static-hoisting-patch-flags-block-t)).

## 4. Verified: Named, Fallback, Scoped and Lazy Slots

The runnable example has three children written as render functions (the playground has no runtime template compiler, so inline children use \`h()\`; the SFC versions are the second example). The relevant output from the verifier:

\`\`\`
card 1: <article class="card"><header>Weekly report</header><div class="body"><p>Default slot content, written in the parent.</p></div><footer><button>Share</button></footer></article>
card 2: <article class="card"><!----><div class="body"><p>A card with no header and no footer.</p></div><footer>No actions</footer></article>
list: <ul><li><span class="done">1. Write the slot docs</span></li><li><span class="">2. Review the PR</span></li></ul>
panel before: (closed)
parent slot content evaluated
panel after: panel content
\`\`\`

- **Card 1** filled all three regions. **Card 2** passed only default content, so the header wrapper was skipped entirely (the \`<!---->\` is Vue's placeholder for "nothing rendered here") and the footer showed its fallback "No actions".
- **The list** owns the \`v-for\`; the parent's \`#item="{ item, index }"\` template decided to number the rows and add a \`done\` class. Same component, completely different row markup.
- **The collapsed panel** proves slots are lazy. The parent's slot content calls \`expensive()\`, which logs. Nothing was logged while the panel was closed; the log line appeared only after the toggle, when the child finally called its default slot function.

The SFC versions (second example), mounted with Vue Test Utils:

\`\`\`
<article class="card">
  <!--v-if-->
  <div class="body">Only body</div>
  <footer>No actions</footer>
</article>
<ul>
  <li><b>0:a</b></li>
  <li><b>1:b</b></li>
</ul>
\`\`\`

\`v-if="$slots.header"\` removed the empty \`<header>\`, the fallback filled the footer, and a scoped \`item\` slot replaced the default \`{{ item.text }}\` rendering.

## 5. Checking, Typing and Forwarding Slots

📌 **Interview term: \`$slots\` / \`useSlots()\`** — the object of slot functions the parent passed. In a template, \`$slots.header\` is truthy when a header was provided; in \`<script setup>\`, \`useSlots()\` returns the same object. Use it to skip wrappers, never to read content.

📌 **Interview term: \`defineSlots()\`** — a \`<script setup>\` macro (Vue 3.3+) that declares each slot's props for TypeScript, so \`#item="{ item }"\` is type-checked in the parent. See [defineOptions and defineSlots](/interview-question/what-do-defineoptions-and-defineslots-do-in-script-setup), and for slots whose props depend on a generic type, [generic script setup components](/interview-question/how-do-generic-script-setup-components-work-generic-t).

Two template rules the compiler enforces (messages from \`@vue/compiler-dom\` 3.5.44):

\`\`\`
<List v-slot="{ item }"><template #footer>f</template></List>
ERROR: Mixed v-slot usage on both the component and nested <template>. When there are multiple named slots, all slots should use <template> syntax to avoid scope ambiguity.

<div v-slot:foo>x</div>
ERROR: v-slot can only be used on components or <template> tags.
\`\`\`

The shorthand \`<List v-slot="{ item }">\` is only for a component whose **only** slot is the default one. As soon as there is a second slot, every slot, including the default, goes in its own \`<template #name>\`.

**Forwarding slots through a wrapper.** A component that wraps another and wants to pass every slot through can loop over \`$slots\`:

\`\`\`html
<BaseTable v-bind="$attrs">
  <template v-for="(_, name) in $slots" #[name]="slotProps">
    <slot :name="name" v-bind="slotProps ?? {}" />
  </template>
</BaseTable>
\`\`\`

Verified with Vitest around the \`TodoList\` above: with no slot passed, the wrapper rendered the fallback \`<li>a</li>\`; with an \`item\` slot it rendered \`<li><i>0:a</i></li>\`, so the slot props reached the outer caller. (The attribute half of that wrapper is explained in [fallthrough attributes](/interview-question/what-are-fallthrough-attributes-attrs).)

## 6. Slots Compared

| | Vue slots | React | Angular |
| :--- | :--- | :--- | :--- |
| Default content | \`<slot />\` | \`props.children\` | \`<ng-content />\` |
| Several regions | Named slots | Several props holding JSX | \`<ng-content select="...">\` |
| Child passes data back | Scoped slots | Render props / function as child | \`ng-template\` with a context |
| Lazy by default | Yes, slot is a function | Children are already created elements | Projected content is created by the parent |

For the Angular side see [content projection with ng-content](/interview-question/what-is-content-projection-and-ng-content).

Slots versus props: a prop sends **data**; a slot sends **template**. If the parent only ever passes a string, a prop is simpler. When the parent needs control over markup, layout or components, use a slot. Slots versus [provide/inject](/interview-question/what-are-provide-and-inject): slots move content one level; provide/inject moves data many levels.

## 7. Common Pitfalls

- **Expecting slot content to see the child's data.** \`{{ count }}\` inside \`<Card>...</Card>\` reads the *parent's* \`count\`. If the child must share data, make it a scoped slot.
- **Wrapping an empty slot.** \`<header><slot name="header" /></header>\` renders an empty \`<header>\` when no header is given. Guard it with \`v-if="$slots.header"\`, as verified above.
- **Mixing \`v-slot\` on the component with named templates.** It is a compile error; move the default content into \`<template #default>\`.
- **Doing expensive work and assuming it runs once.** Slot content re-renders whenever the child re-renders, and not at all when the child does not call it (the lazy panel). Put heavy work in a \`computed\` in the parent, not inline in the slot.
- **Destructuring slot props and losing defaults.** \`#item="{ item, index = 0 }"\` works because it is plain JavaScript destructuring; just remember the child decides which props exist, so typo-ed names arrive as \`undefined\` unless you type them with \`defineSlots\`.
- **Using slots to pass data down many levels.** Re-forwarding a slot through five wrappers is the slot version of [prop drilling](/interview-question/what-is-prop-drilling-and-how-can-it-be-avoided); provide/inject is usually the better tool.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">"A slot is an outlet in a child component where the parent injects its own template content, so the child owns the frame and the parent owns what goes inside."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Kinds:</strong> <span style="color:#f0e2c8;">"There is the default slot, named slots such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">#footer</code> for multiple regions, and fallback content between the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;slot&gt;</code> tags for when the parent passes nothing."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Scoped slots:</strong> <span style="color:#f0e2c8;">"With scoped slots the child passes data back as slot props, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">#item="{ item }"</code>, so a list or table owns the loop while the caller owns the row markup."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. How it works:</strong> <span style="color:#f0e2c8;">"Slot content is compiled in the parent into functions wrapped in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">withCtx</code>, and the child calls them when it renders, so slots are lazy and re-render with the child."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Practical detail:</strong> <span style="color:#f0e2c8;">"I check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$slots.header</code> to skip empty wrappers, and in TypeScript I declare slot props with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineSlots()</code>."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What scope does slot content have access to?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The parent's. Slot content is compiled in the parent template, so it reads parent data. The only way to see child data is through slot props in a scoped slot.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is slot content rendered if the child never outputs the slot?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Slots are functions and the child decides when to call them. In the verified example, a closed panel never called its slot, so the parent expression inside it never ran until the panel opened.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you build a table where each team formats cells differently?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Make the table own the rows and loop, and expose a scoped slot per column, for example <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">#cell-price="{ row }"</code>, with fallback content that prints the raw value. Teams override only the columns they care about.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do slots compare to React children and render props?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The default slot plays the role of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">children</code>, and a scoped slot is a render prop. The difference is that Vue slots are always functions, so they are lazy and the compiler can mark stable slots to skip work on updates.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When should something be a prop instead of a slot?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the parent passes data, not markup. A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">title</code> string is a prop; a header that might contain an icon, a badge and a menu is a slot. If you notice props like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">headerIcon</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">headerBadge</code>, switch to a slot.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Slot** | An outlet in a child where the parent's template content renders |
| **Render scope** | Slot content reads the parent's data, because it is compiled there |
| **Named slot** | One of several outlets, filled with \`<template #name>\` |
| **Fallback content** | Default markup inside \`<slot>\`, used when the parent passes nothing |
| **Scoped slot** | A slot that receives data (slot props) from the child |
| **Compiled slot** | The function, wrapped in \`withCtx\`, that the child calls to render slot content |
| **\`$slots\` / \`useSlots()\`** | The object of slot functions the parent provided |
| **\`defineSlots()\`** | Macro that types slot names and slot props in TypeScript |

---
**Conclusion:** Slots let a reusable component keep its structure while the parent supplies the content: a default slot for the body, named slots for regions, fallback content for sensible defaults, and scoped slots when the child must hand data back to the caller's markup. Under the hood each slot is a function compiled in the parent and called by the child, which is why slot content reads parent data, why the verified collapsed panel never evaluated its content until opened, and why \`$slots\` checks can skip empty wrappers. Use props for data, slots for markup, and provide/inject when the distance is more than one level.`,
    examples: [
      {
        label: "A card with named slots and fallback, a scoped-slot list, and a lazily rendered slot",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { ref, defineComponent, h } from "vue";

// A card with a default slot, a named "footer" slot with fallback content,
// and a header that only renders when the parent actually passed one.
const Card = defineComponent({
  setup(_, { slots }) {
    return () =>
      h("article", { class: "card" }, [
        slots.header ? h("header", slots.header()) : null,
        h("div", { class: "body" }, slots.default?.()),
        h("footer", slots.footer ? slots.footer() : "No actions"),
      ]);
  },
});

// A list that owns the data and the loop, but lets the parent decide how each row looks.
const TodoList = defineComponent({
  props: { items: Array },
  setup(props, { slots }) {
    return () =>
      h("ul", props.items.map((item, index) =>
        h("li", { key: item.id }, slots.item ? slots.item({ item, index }) : item.text)
      ));
  },
});

// A panel that is closed: its slot function is never called.
const Collapsed = defineComponent({
  props: { open: Boolean },
  setup(props, { slots }) {
    return () => h("div", { class: "panel" }, props.open ? slots.default() : "(closed)");
  },
});

const todos = ref([
  { id: 1, text: "Write the slot docs", done: true },
  { id: 2, text: "Review the PR", done: false },
]);
const open = ref(false);
function expensive() {
  console.log("parent slot content evaluated");
  return "panel content";
}
</script>

<template>
  <Card>
    <template #header>Weekly report</template>
    <p>Default slot content, written in the parent.</p>
    <template #footer><button>Share</button></template>
  </Card>

  <Card><p>A card with no header and no footer.</p></Card>

  <TodoList :items="todos">
    <template #item="{ item, index }">
      <span :class="{ done: item.done }">{{ index + 1 }}. {{ item.text }}</span>
    </template>
  </TodoList>

  <Collapsed :open="open">{{ expensive() }}</Collapsed>
  <button class="toggle" @click="open = !open">toggle panel</button>
</template>
`,
      },
      {
        label: "Card.vue and TodoList.vue: the same slots written as SFC templates",
        tech: "vue",
        runnable: false,
        code: `<!-- Card.vue -->
<template>
  <article class="card">
    <header v-if="$slots.header"><slot name="header" /></header>
    <div class="body"><slot /></div>
    <footer><slot name="footer">No actions</slot></footer>
  </article>
</template>

<!-- TodoList.vue -->
<script setup>
defineProps({ items: Array });
</script>
<template>
  <ul>
    <li v-for="(item, index) in items" :key="item.id">
      <slot name="item" :item="item" :index="index">{{ item.text }}</slot>
    </li>
  </ul>
</template>
`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are provide and inject?",
    seoDescription:
      "provide() and inject() pass data from an ancestor to any descendant without prop drilling: reactivity, defaults, shadowing, readonly and app.provide.",
    description: `**Question presented to candidate:**
"We pass the current theme and the signed-in user through six layers of components, and most of those layers never use them. What are \`provide\` and \`inject\`, how would they fix this, and what would you watch out for?"

**What a strong answer should cover:**
- \`provide(key, value)\` in an ancestor makes a value available to **every descendant**; \`inject(key)\` reads it, however deep, without the components in between knowing.
- The **nearest provider wins**: a provider lower in the tree shadows the same key for its own subtree, which is how nested themes or forms work.
- **Reactivity is not automatic**: provide a ref, reactive object or computed to keep consumers in sync; a plain value is a one-time snapshot. Wrap with \`readonly()\` and provide an update function so only the owner mutates.
- \`inject\` takes a **default** (\`inject("locale", "en-GB")\`), or a factory with the third argument \`true\`; with no provider and no default it returns \`undefined\` and warns.
- \`inject\` only works synchronously inside \`setup()\` (or \`<script setup>\`); \`app.provide\` supplies app-wide values, and \`app.runWithContext()\` lets code outside components inject.
- When to choose it over props (deep, subtree-scoped context) and over Pinia (app-global state), and using \`Symbol\` keys to avoid collisions.

**Clarifying questions expected:**
- "Is the theme global to the app, or can a section of the page override it?"
- "Who is allowed to change the user: any component, or only the auth layer?"

**Code / implementation expected:** Yes — a provider with a reactive value and an injecting descendant, ideally with a default and a readonly guard.`,
    answer: `**Target Audience:** Anyone preparing for a Vue interview. Assumes you know props and \`ref()\`.
**Difficulty:** Medium

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. Every output in the "Verified" sections was produced on Vue 3.5.44: the runnable example with the repo verifier (compiled and mounted in jsdom), the app-level behaviour with a Node script against the same Vue build. Typing provide/inject is a separate question, linked in section 6.

## 1. Why This Even Matters — A Story First

A large office building has a single Wi-Fi network. The building manager installs it once, and every person on every floor can connect. Nobody asks their manager, who asks the floor lead, who asks the facilities team to "please pass the Wi-Fi password down to me". You just look for the network.

Now the design studio on floor 4 installs its own faster network with the *same name*. Everyone on floor 4 automatically connects to the studio's network; everyone else still gets the building's one. Closer wins.

That is **provide / inject**. An ancestor component provides a value under a key. Any descendant, at any depth, injects it by that key, and the nearest provider above it wins. The components in the middle do not have to know the value exists.

The alternative is **prop drilling**: declaring a \`theme\` prop on six components just so the seventh can read it. It works, but every middle layer's API now carries data it never uses, and renaming the prop means touching all of them.

## 2. The Core Idea

📌 **Interview term: provide** — \`provide(key, value)\`, called in an ancestor's \`setup()\` (or \`<script setup>\`), registers a value for its whole subtree. The key is a string or, better, a \`Symbol\`.

📌 **Interview term: inject** — \`inject(key, defaultValue?)\`, called in a descendant's \`setup()\`, looks the key up through its ancestors and returns the value from the **nearest** provider.

📌 **Interview term: Injection context** — the window in which \`inject\` works: synchronously during a component's \`setup()\`, in a functional component, or inside \`app.runWithContext()\`. Call it later (in a click handler, a timer, after an \`await\`) and it fails.

📌 **Interview term: App-level provide** — \`app.provide(key, value)\` on the application instance, before mounting, makes a value injectable everywhere in that app. [Plugins](/interview-question/what-is-a-vue-plugin) use this to hand services (an API client, an i18n instance) to every component.

\`\`\`js
// Ancestor
const theme = ref("light");
provide("theme", theme);

// Any descendant, any depth
const theme = inject("theme");          // a Ref: read theme.value
const locale = inject("locale", "en");  // with a default
\`\`\`

## 3. How the Lookup Works

<svg class="iq-diagram" width="100%" viewBox="0 0 720 340" role="img" aria-label="Provides objects form a prototype chain, so a leaf finds the nearest provider of a key">
  <defs>
    <marker id="vpi-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="230" y="20" width="260" height="52" rx="12"/>
  <text class="d-text" x="360" y="44" text-anchor="middle">App root</text>
  <text class="d-sub" x="360" y="62" text-anchor="middle">provides theme = light</text>
  <rect class="d-box" x="60" y="140" width="240" height="52" rx="12"/>
  <text class="d-text" x="180" y="164" text-anchor="middle">Leaf A</text>
  <text class="d-sub" x="180" y="182" text-anchor="middle">inject theme gives light</text>
  <rect class="d-box-accent" x="420" y="140" width="240" height="52" rx="12"/>
  <text class="d-text d-accent" x="540" y="164" text-anchor="middle">Section</text>
  <text class="d-sub" x="540" y="182" text-anchor="middle">provides theme = dark</text>
  <rect class="d-box" x="420" y="262" width="240" height="52" rx="12"/>
  <text class="d-text" x="540" y="286" text-anchor="middle">Leaf B</text>
  <text class="d-sub" x="540" y="304" text-anchor="middle">inject theme gives dark</text>
  <path class="d-edge" d="M 180 136 L 290 76" marker-end="url(#vpi-arrow)"/>
  <path class="d-edge-accent" d="M 540 258 L 540 196" marker-end="url(#vpi-arrow)"/>
  <path class="d-edge-dashed" d="M 540 136 L 430 76" marker-end="url(#vpi-arrow)"/>
  <text class="d-sub" x="610" y="106" text-anchor="middle">prototype link</text>
</svg>

Each component has a \`provides\` object. A component that never calls \`provide\` simply reuses its parent's object. The first time a component calls \`provide\`, Vue gives it a fresh object whose **prototype** is the parent's, then stores the key on it. \`inject\` reads the key from the parent's \`provides\`, so ordinary JavaScript prototype lookup finds the nearest provider, and a lower provider shadows a higher one.

Verified on 3.5.44 by inspecting the internal instances (\`getCurrentInstance()\`) of an App, a providing Section, a non-providing Middle and a Leaf:

\`\`\`
middle shares section provides object: true
section provides prototype is app root provides: true
own keys of section provides: [ 'theme' ] | theme via chain: dark
\`\`\`

The lookup is a property read, which is why injecting is cheap no matter how deep the tree is. (The internals are for understanding only; never rely on \`instance.provides\` in real code.)

## 4. Verified: Reactivity, Shadowing, Readonly and Defaults

The runnable example (first example below) provides a \`theme\` ref and a \`readonly(user)\` from the root, adds a \`Section\` that provides its own \`theme\`, and renders a \`Leaf\` in both places. The leaf also injects \`locale\` with a default, a \`formatter\` with a factory default, and a \`missing\` key with no default. Driver output (each \`||\` separates the two leaves; \`section:\` is what the providing Section itself injected):

\`\`\`
[Vue warn]: injection "missing" not found.
initial     : theme=light user=ada locale=en-GB 1,234.5 missing=undefined || theme=dark user=ada locale=en-GB 1,234.5 missing=undefined | section: section sees theme=light |
after toggle: theme=sepia user=ada locale=en-GB 1,234.5 missing=undefined || theme=dark user=ada locale=en-GB 1,234.5 missing=undefined | section: section sees theme=sepia |
after rename: theme=sepia user=grace locale=en-GB 1,234.5 missing=undefined || theme=dark user=grace locale=en-GB 1,234.5 missing=undefined | section: section sees theme=sepia |
[Vue warn] Set operation on key "value" failed: target is readonly.
after write : theme=sepia user=grace ...
\`\`\`

What each line proves:

1. **Nearest provider wins.** The leaf inside \`Section\` saw \`dark\`; the other saw the root's \`light\`.
2. **A provider does not see its own value.** \`Section\` provides \`dark\` but injects \`light\`, because \`inject\` starts at the *parent's* provides. Toggling the root theme to \`sepia\` changed what Section saw, while the shadowed leaf stayed \`dark\`.
3. **Provided refs stay reactive.** Renaming the root \`user\` to \`grace\` updated both leaves, with no props anywhere.
4. **\`readonly()\` protects the owner.** The leaf's attempt to write \`user.value\` was refused with a warning and the value did not change.
5. **Defaults and warnings.** \`locale\` fell back to \`en-GB\`, the factory built an \`Intl.NumberFormat\` lazily (\`1,234.5\`), and \`missing\` returned \`undefined\` with the warning \`injection "missing" not found.\`, printed once per leaf.

📌 **Interview term: Factory default** — \`inject(key, () => new Thing(), true)\`. The third argument tells Vue to call the function only when no provider exists, so an expensive default is not built when it is not needed.

## 5. Verified: App-Level Provide and the Injection Context

The second example is a Node script run against the same Vue build:

\`\`\`
runWithContext -> https://api.example.com
child shows <i>0</i> after count++
hasInjectionContext() in setTimeout: false
[Vue warn]: inject() can only be used inside setup() or functional components.
inject in setTimeout -> undefined
\`\`\`

- \`app.provide("api", ...)\` made the value injectable app-wide, and \`app.runWithContext(() => inject("api"))\` read it from outside any component. Router guards and stores use this pattern. Both \`app.runWithContext()\` and \`hasInjectionContext()\` arrived in Vue 3.3 (source: <a href="https://github.com/vuejs/core/blob/main/changelogs/CHANGELOG-3.3.md" target="_blank" rel="noopener noreferrer">Vue 3.3 changelog</a>).
- Providing a **plain number** handed over a snapshot: after \`count++\` the child still showed \`0\`.
- Inside a \`setTimeout\`, \`inject\` warned and returned \`undefined\`. Library code can test \`hasInjectionContext()\` first instead of triggering the warning.

## 6. Patterns That Make It Production-Ready

**Owner mutates, consumers read.** Provide the state as readonly and provide the actions next to it:

\`\`\`js
const user = ref(null);
provide("auth", {
  user: readonly(user),
  login: async (creds) => { user.value = await api.login(creds); },
  logout: () => { user.value = null; },
});
\`\`\`

See [readonly](/interview-question/what-does-readonly-do-in-vue-s-reactivity) for how the wrapper works.

**Symbol keys and a \`use\` helper.** String keys can collide across libraries, and a missing provider shows up far from the cause. Export a \`Symbol\` key and a \`useAuth()\` helper that throws a clear error. Typing that key with \`InjectionKey<T>\` so \`inject\` returns the right type is its own topic: see [making provide/inject type-safe](/interview-question/how-do-you-make-provide-inject-type-safe).

**Wrap the pair in a composable.** A \`provideCart()\` / \`useCart()\` pair is a [composable](/interview-question/what-are-composables-in-vue) that hides the key entirely.

| Need | Props | provide / inject | [Pinia](/interview-question/what-is-pinia-and-why-use-it) |
| :--- | :--- | :--- | :--- |
| Distance | One level | Any depth, one subtree | Anywhere in the app |
| Explicit in the child API | Yes | No, hidden dependency | No, hidden dependency |
| Several independent instances | Yes | Yes, one per provider | Needs store ids or factories |
| Devtools and SSR state transfer | n/a | No special support | Built in |
| Typical use | Data the child displays | Theme, form context, tabs group | Cart, session, cached server data |

The trade-off to say out loud: injected dependencies are **invisible in the component's signature**. A component that injects \`"theme"\` silently breaks when rendered without a provider (in a unit test, in a story, or in a modal mounted as a separate app). Defaults and throwing helpers make that failure obvious. React's equivalent is Context ([the Context API in React](/interview-question/what-is-the-context-api-in-react-and-when-would-you-use-it)); Angular solves the same problem with hierarchical [dependency injection](/interview-question/how-does-dependency-injection-work-in-angular).

## 7. Common Pitfalls

- **Providing \`ref.value\` instead of the ref.** \`provide("theme", theme.value)\` is a snapshot. Provide \`theme\` itself, or a \`computed\`.
- **Calling \`inject\` after an \`await\` or in a handler.** It must run synchronously in \`setup()\`. Inject at the top, then use the value later.
- **Letting every consumer mutate shared state.** Without \`readonly()\`, any deep child can rewrite the value and nobody can trace who did it. Provide readonly state plus functions.
- **Expecting a component to inject what it provides.** As verified, \`inject\` starts from the parent, so a provider sees the ancestor value for the same key.
- **Using provide/inject as a global store.** If many unrelated screens share it, or it must survive route changes, use Pinia; you get devtools and SSR-safe state per request.
- **String keys in a library.** \`"config"\` will collide with someone else's \`"config"\`. Use \`Symbol\` keys and export a \`use\` helper.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">provide</code> lets an ancestor register a value under a key, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inject</code> lets any descendant read it, however deep, without the components in between passing props."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Lookup rule:</strong> <span style="color:#f0e2c8;">"The nearest provider wins. Each component provides objects chain to the parent by prototype, so a lower provider shadows a higher one for its subtree."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Reactivity:</strong> <span style="color:#f0e2c8;">"It is only reactive if you provide something reactive, a ref, reactive object or computed, and I wrap it in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">readonly()</code> and provide functions so only the owner mutates."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Rules:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inject</code> must run synchronously in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setup</code>, takes a default or a factory default, and returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> with a warning when nothing provides the key; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">app.provide</code> supplies app-wide values."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. When to use:</strong> <span style="color:#f0e2c8;">"I use it for subtree context such as a theme, a form or a tabs group, props for one level, and Pinia for state that is global or must survive navigation."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is my injected value not updating?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">You probably provided a plain value, for example <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">theme.value</code>, which is a snapshot. Provide the ref or a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code>. Verified: a provided number stayed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0</code> after the source changed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a component inject the value it provides itself?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inject</code> reads from the parent chain, so the component sees the ancestor value for that key. Verified: a Section providing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dark</code> injected <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">light</code> from the root.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you inject outside a component, for example in a router guard?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">app.runWithContext(() =&gt; inject(key))</code>, added in Vue 3.3. Libraries can call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hasInjectionContext()</code> first to avoid the warning when there is no context.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the downside of provide/inject compared to props?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The dependency is hidden. Nothing in the component signature says it needs a provider, so rendering it alone in a test or story fails at runtime. Defaults and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useX()</code> helper that throws a clear error reduce the pain.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you avoid key collisions and get types?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Symbol</code> key typed as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">InjectionKey&lt;T&gt;</code>, exported next to a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useX()</code> helper. Then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inject</code> returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> instead of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unknown</code>.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **provide** | Register a value under a key for the whole subtree |
| **inject** | Read the value for a key from the nearest ancestor provider |
| **Injection context** | Where \`inject\` works: synchronous \`setup\`, functional components, \`runWithContext\` |
| **App-level provide** | \`app.provide()\`, available to every component in the app |
| **Factory default** | \`inject(key, fn, true)\`: build the default only when no provider exists |
| **Shadowing** | A lower provider hiding a higher one for the same key |
| **Prop drilling** | Passing a prop through layers that do not use it |

---
**Conclusion:** \`provide\` and \`inject\` move context from an ancestor to any descendant without drilling props through the layers in between. The lookup follows a prototype chain of \`provides\` objects, so the nearest provider wins and a provider sees its parent's value rather than its own, both verified on 3.5.44. The value is reactive only when you provide a ref, reactive object or computed, \`readonly()\` keeps mutation with the owner, defaults and factory defaults cover missing providers, and \`inject\` works only synchronously in setup or inside \`app.runWithContext()\`. Use it for subtree context, props for one level, and Pinia for app-wide state.`,
    examples: [
      {
        label: "Reactive provide, a shadowing provider, readonly refs and inject defaults",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { ref, readonly, provide, inject, defineComponent, h } from "vue";

const Leaf = defineComponent({
  setup() {
    const theme = inject("theme");                       // nearest provider wins
    const user = inject("user");                          // readonly ref from the top
    const locale = inject("locale", "en-GB");             // default when nobody provides it
    const fmt = inject("formatter", () => new Intl.NumberFormat("en-GB"), true); // factory default
    const missing = inject("missing");                    // no provider, no default
    const tryWrite = () => { user.value = "hacker"; };
    return () =>
      h("p", { class: "leaf" }, [
        \`theme=\${theme.value} user=\${user.value} locale=\${locale} \${fmt.format(1234.5)} missing=\${missing}\`,
        h("button", { class: "write", onClick: tryWrite }, "write user"),
      ]);
  },
});

const Section = defineComponent({
  setup(_, { slots }) {
    provide("theme", ref("dark"));                        // shadows the app-level theme below it
    const ownTheme = inject("theme");                     // what does the provider itself see?
    return () => h("section", [\`section sees theme=\${ownTheme.value} | \`, slots.default()]);
  },
});

const theme = ref("light");
const user = ref("ada");
provide("theme", theme);
provide("user", readonly(user));
</script>

<template>
  <Leaf />
  <Section><Leaf /></Section>
  <button class="toggle" @click="theme = theme === 'light' ? 'sepia' : 'light'">toggle theme</button>
  <button class="rename" @click="user = 'grace'">rename user</button>
</template>
`,
      },
      {
        label: "app.provide, runWithContext, and inject called outside setup (Node + jsdom script)",
        tech: "js",
        runnable: false,
        code: `// node q3-app-level.mjs  (vue 3.5.44 + jsdom; run with NODE_ENV=development for warnings)
import { JSDOM } from "jsdom";

const dom = new JSDOM('<div id="app"></div>');
Object.assign(globalThis, { window: dom.window, document: dom.window.document, Element: dom.window.Element, SVGElement: dom.window.SVGElement });
const { createApp, h, inject, provide, hasInjectionContext, defineComponent, nextTick } = await import("vue");

let count = 0; // a plain number, not a ref

const Child = defineComponent({
  setup() {
    const c = inject("count");
    return () => h("i", String(c));
  },
});

const app = createApp({
  setup() {
    provide("count", count); // hands over the value 0, not a live binding
    setTimeout(() => {
      // Timers run outside setup, so there is no injection context any more.
      console.log("hasInjectionContext() in setTimeout:", hasInjectionContext());
      console.log("inject in setTimeout ->", inject("api"));
    });
    return () => h(Child);
  },
});

// App-level provide: every component in this app can inject it.
app.provide("api", "https://api.example.com");
app.mount("#app");

// Code outside components (a router guard, a store) can borrow the app context.
console.log("runWithContext ->", app.runWithContext(() => inject("api")));

count++;
await nextTick();
console.log("child shows", document.querySelector("#app").innerHTML, "after count++");
await new Promise((r) => setTimeout(r, 10));
`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you make provide/inject type-safe?",
    seoDescription:
      "Type provide/inject in Vue 3 with InjectionKey<T> Symbol keys, defaults and a throwing use() helper, with the errors vue-tsc reports when types drift.",
    description: `**Question presented to candidate:**
"In our TypeScript Vue app, \`inject('cart')\` comes back as \`unknown\`, so people cast it with \`as Cart\` and we have had runtime crashes when the provider was missing. How do you make provide and inject type-safe end to end?"

**What a strong answer should cover:**
- Use a **\`Symbol\` key typed as \`InjectionKey<T>\`**, exported from one module, so \`provide(key, value)\` checks the value and \`inject(key)\` returns \`T | undefined\` instead of \`unknown\`.
- \`inject\` is honestly typed \`T | undefined\` because a provider may be missing; handle it with a **default** (\`inject(key, fallback)\` returns \`T\`) or a **\`useX()\` helper that throws** a clear error.
- String keys with a generic, \`inject<Cart>('cart')\`, and non-null assertions are only promises to the compiler, not checks.
- A reusable **\`createContext<T>()\` factory** that returns a typed provide/use pair and hides the key.
- Provide readonly state plus typed action functions, so the type also documents who may mutate.
- Verify with **\`vue-tsc\`**, since templates and \`<script setup>\` are only checked by it, not by plain \`tsc\`.

**Clarifying questions expected:**
- "Is there always a provider above every consumer, or are some consumers optional?"
- "Is this application code or a library other teams consume?"

**Code / implementation expected:** Yes — an \`InjectionKey<T>\`, a typed provide, and a \`useX()\` helper (or a generic factory) that throws when the provider is missing.`,
    answer: `**Target Audience:** Vue developers using TypeScript. Assumes you know what [provide and inject](/interview-question/what-are-provide-and-inject) do; this doc is only about typing them.
**Difficulty:** Medium

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. The type errors quoted here are the real output of <code>vue-tsc</code> 3.3.13 on Vue 3.5.44, and the runtime output comes from the repo verifier (compiled and mounted in jsdom).

## 1. Why This Even Matters — A Story First

A hospital pharmacy labels every drawer. The label does not just say "pills", it says the exact drug and dose. A nurse who reaches for "Drawer 7: paracetamol 500 mg" knows what she will get before opening it, and if a technician tries to stock the wrong drug, the label mismatch is caught at the shelf, not at the patient's bed.

A plain string key such as \`inject("cart")\` is a drawer labelled "stuff". TypeScript cannot know what is inside, so it says \`unknown\`, and developers paper over it with \`as Cart\`. If someone stocks the drawer with the wrong shape, or forgets to stock it at all, nobody finds out until the app crashes in front of a user.

Type-safe provide/inject is the labelled drawer: one shared **key** that carries the type of its contents, so the compiler checks both the person stocking it (\`provide\`) and the person taking from it (\`inject\`).

## 2. The Core Idea: InjectionKey

📌 **Interview term: \`InjectionKey<T>\`** — a type exported by Vue for a \`Symbol\` that carries the type \`T\` of the value stored under it. At runtime it is just a symbol; the \`T\` exists only for the compiler. In the 3.5.44 typings it is literally \`symbol & InjectionConstraint<T>\`, where \`InjectionConstraint<T>\` is an empty interface.

📌 **Interview term: Phantom type** — a type parameter that exists only at compile time to label a value. \`InjectionKey<T>\` is a phantom type on a symbol.

The relevant signatures, copied from \`@vue/runtime-core\` 3.5.44:

\`\`\`ts
export type InjectionKey<T> = symbol & InjectionConstraint<T>;
export declare function provide<T, K = InjectionKey<T> | string | number>(key: K, value: K extends InjectionKey<infer V> ? V : T): void;
export declare function inject<T>(key: InjectionKey<T> | string): T | undefined;
export declare function inject<T>(key: InjectionKey<T> | string, defaultValue: T, treatDefaultAsFactory?: false): T;
export declare function inject<T>(key: InjectionKey<T> | string, defaultValue: T | (() => T), treatDefaultAsFactory: true): T;
\`\`\`

Read them as three rules:

1. \`provide\` with an \`InjectionKey<V>\` requires a value of type \`V\`.
2. \`inject\` without a default returns \`T | undefined\`, because nothing guarantees a provider exists.
3. \`inject\` with a default (or a factory default with \`true\`) returns plain \`T\`.

## 3. The Pattern

The second example, \`keys.ts\`, is the whole recipe:

\`\`\`ts
export interface Cart {
  items: Ref<string[]>;
  add: (sku: string) => void;
}
export const CartKey: InjectionKey<Cart> = Symbol("cart");

export function provideCart(cart: Cart) {
  provide(CartKey, cart);
}
export function useCart(): Cart {
  const cart = inject(CartKey);
  if (!cart) throw new Error("useCart() needs a <CartProvider> ancestor");
  return cart;
}
\`\`\`

📌 **Interview term: Typed use-helper** — a function such as \`useCart()\` that wraps \`inject\`, removes \`undefined\` from the type by throwing, and gives a clear error that names the missing provider. Consumers never touch the key, and the error appears where the mistake is.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 260" role="img" aria-label="One typed key module is imported by both the provider and the consumer, and the compiler checks both sides">
  <defs>
    <marker id="vpit-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="240" y="24" width="240" height="64" rx="12"/>
  <text class="d-text d-accent" x="360" y="50" text-anchor="middle">keys.ts</text>
  <text class="d-sub" x="360" y="72" text-anchor="middle">CartKey as InjectionKey of Cart</text>
  <rect class="d-box" x="40" y="168" width="240" height="64" rx="12"/>
  <text class="d-text" x="160" y="194" text-anchor="middle">CartProvider</text>
  <text class="d-sub" x="160" y="216" text-anchor="middle">provide checks the value</text>
  <rect class="d-box" x="440" y="168" width="240" height="64" rx="12"/>
  <text class="d-text" x="560" y="194" text-anchor="middle">Any descendant</text>
  <text class="d-sub" x="560" y="216" text-anchor="middle">useCart returns Cart</text>
  <path class="d-edge" d="M 300 92 L 190 162" marker-end="url(#vpit-arrow)"/>
  <path class="d-edge" d="M 420 92 L 530 162" marker-end="url(#vpit-arrow)"/>
  <text class="d-sub" x="196" y="122" text-anchor="middle">import</text>
  <text class="d-sub" x="524" y="122" text-anchor="middle">import</text>
</svg>

Both sides import the same key from one module, so the type is declared once and checked twice. The provider and the consumer never agree on a string by convention.

## 4. Verified: What vue-tsc Catches

A deliberately broken \`<script setup lang="ts">\` component, checked with \`vue-tsc --noEmit\`:

\`\`\`ts
provide(CartKey, { items: ref([]), add: (n: number) => {} });   // wrong shape
provide(LocaleKey, 42);                                          // wrong type
const a = inject(CartKey);
a.add("x");                                                      // possibly undefined
const b = inject(LocaleKey, "en-GB");
const n: number = b;                                             // b is string
const c = inject("theme");
c.toUpperCase();                                                 // string key: unknown
const d = inject<string>("theme");
const e: string = d;                                             // string | undefined
const cart = useCart();
cart.add(1);                                                     // wrong argument
\`\`\`

\`\`\`
Use.vue(5,36): error TS2322: Type '(n: number) => void' is not assignable to type '(sku: string) => void'.
Use.vue(6,20): error TS2345: Argument of type 'number' is not assignable to parameter of type 'string'.
Use.vue(9,1): error TS18048: 'a' is possibly 'undefined'.
Use.vue(11,7): error TS2322: Type 'string' is not assignable to type 'number'.
Use.vue(13,1): error TS18046: 'c' is of type 'unknown'.
Use.vue(15,7): error TS2322: Type 'string | undefined' is not assignable to type 'string'.
Use.vue(17,10): error TS2345: Argument of type 'number' is not assignable to parameter of type 'string'.
\`\`\`

Every mistake was caught, on both the provide side and the inject side. Note line 9: even with a perfect key, raw \`inject(CartKey)\` is \`Cart | undefined\`. That is the type system being honest, and the reason for the \`useCart()\` helper, which made line 17 a plain \`Cart\`.

## 5. Verified: The Holes a Key Does Not Close

Typing is only as good as the key. Three edge cases checked with the same \`vue-tsc\`:

\`\`\`ts
const LocaleKey: InjectionKey<string> = Symbol("locale");
const PlainKey = Symbol("plain");                  // not annotated

const wrong: InjectionKey<number> = LocaleKey;     // 1. no error
provide(PlainKey, 123);
const p = inject(PlainKey);
p.toFixed();                                       // 2. error
const n = inject<number>("locale", 0);
n.toFixed();                                       // 3. no error
\`\`\`

\`\`\`
edge.ts(12,1): error TS18046: 'p' is of type 'unknown'.
\`\`\`

1. **Keys can be re-labelled.** Because \`InjectionConstraint<T>\` is an empty interface, an \`InjectionKey<string>\` was accepted as an \`InjectionKey<number>\` with no error. Never cast or re-annotate a key; export it once and import it everywhere.
2. **An unannotated \`Symbol()\` carries no type.** \`inject(PlainKey)\` is \`unknown\`. The annotation \`: InjectionKey<T>\` (or \`as InjectionKey<T>\`) is what does the work.
3. **A generic on a string key is a promise, not a check.** \`inject<number>("locale", 0)\` compiles whatever is actually provided under \`"locale"\`.

## 6. Going Further: A Generic createContext Factory

When a codebase has many contexts, a small factory removes the boilerplate and makes it impossible to use the key directly:

\`\`\`ts
export function createContext<T>(name: string) {
  const key: InjectionKey<T> = Symbol(name);
  const provideContext = (value: T) => {
    provide(key, value);
    return value;
  };
  const useContext = (): T => {
    const value = inject(key, null);
    if (value === null) throw new Error(\`use\${name}() was called without a \${name} provider above it\`);
    return value as T;
  };
  return [provideContext, useContext] as const;
}

const [provideTheme, useTheme] = createContext<{ mode: Ref<"light" | "dark">; toggle: () => void }>("Theme");
\`\`\`

\`vue-tsc\` on misuse of it:

\`\`\`
Ctx.vue(8,16): error TS2322: Type 'Ref<"blue", "blue">' is not assignable to type 'Ref<"light" | "dark", "light" | "dark">'.
Ctx.vue(10,1): error TS2322: Type '"sepia"' is not assignable to type '"light" | "dark"'.
\`\`\`

The runnable example (first example below) is the same factory without type annotations, so it runs in the playground. Its output from the verifier:

\`\`\`
[app] RENDERED: theme: lightorphan: useTheme() needs a Theme provider above itno provider for the string key
after toggle: theme: darkorphan: useTheme() needs a Theme provider above itno provider for the string key
\`\`\`

- The label inside the provider toggled from \`light\` to \`dark\` through the context's own \`toggle\` action.
- The \`Orphan\` component, rendered outside the provider, got a precise error message instead of \`undefined\`.
- \`inject("Theme", ...)\` with a **string** that matches the symbol's description found nothing. A \`Symbol("Theme")\` is unique; its description is a debugging label, not a lookup name.

VueUse ships a similar helper, \`createInjectionState\` (present in \`@vueuse/shared\` 15.0.0); the hand-written version above has no dependencies.

📌 **Interview term: Type-level readonly** — typing the provided state as \`Readonly<Ref<T>>\` or \`DeepReadonly<...>\` (and providing it with \`readonly()\`) so consumers cannot assign to it in TypeScript either, while typed action functions document the only allowed mutations. See [readonly](/interview-question/what-does-readonly-do-in-vue-s-reactivity).

## 7. Where Typing Is Checked

| Place | Checked by \`tsc\`? | Checked by \`vue-tsc\`? |
| :--- | :--- | :--- |
| Plain \`.ts\` modules (\`keys.ts\`) | Yes | Yes |
| \`<script setup lang="ts">\` in \`.vue\` files | No, \`tsc\` does not read \`.vue\` | Yes |
| Template expressions | No | Yes |

That is why the type errors above came from \`vue-tsc\`. Add \`vue-tsc --noEmit\` to CI; the Vue - Official editor extension is built on the same language tools, so editors show the same errors. More in [TypeScript with Vue](/interview-question/how-do-you-use-typescript-with-vue-typed-props-emits-refs-vue-tsc).

Options API components can use the same keys: \`inject: { cart: { from: CartKey } }\`. Verified at runtime, a legacy component declared that way rendered "options API sees 2 items" from a symbol-keyed provider. Angular reaches the same goal with typed \`InjectionToken<T>\` objects (see [Angular dependency injection](/interview-question/how-does-dependency-injection-work-in-angular)).

## 8. Common Pitfalls

- **\`inject(CartKey)!\` everywhere.** The non-null assertion silences the compiler and brings back the runtime crash. Use a helper that throws a descriptive error, or a real default.
- **Unannotated \`Symbol()\` keys.** Verified above: \`inject\` returns \`unknown\`. Annotate the key with \`InjectionKey<T>\`.
- **Defining the key inside a component file.** Keys belong in a small shared module (or behind a factory) so the provider and consumers import the same symbol. Two \`Symbol("cart")\` calls are two different keys.
- **Casting keys.** \`InjectionKey<string>\` was assignable to \`InjectionKey<number>\`; a cast silently lies to both sides.
- **Typing the value but not the mutation rights.** A provided \`Ref<Cart>\` lets every consumer reassign it. Provide \`readonly()\` state plus typed functions.
- **Trusting \`tsc\` alone.** It skips \`.vue\` files, so the mistakes in section 4 would pass a \`tsc\`-only CI.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The problem:</strong> <span style="color:#f0e2c8;">"A string key gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inject</code> the type <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unknown</code>, so people cast it, and a missing provider becomes a runtime crash far from the cause."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The fix:</strong> <span style="color:#f0e2c8;">"I export a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Symbol</code> typed as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">InjectionKey&lt;T&gt;</code> from one module; then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">provide</code> checks the value and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inject</code> returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T | undefined</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Handle undefined honestly:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inject</code> stays <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T | undefined</code> because a provider might be missing, so I either pass a default or wrap it in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useCart()</code> helper that throws a clear error."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Scale it:</strong> <span style="color:#f0e2c8;">"With many contexts I use a small <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">createContext&lt;T&gt;()</code> factory that returns a typed provide and use pair and hides the key completely."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Prove it:</strong> <span style="color:#f0e2c8;">"I run <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vue-tsc --noEmit</code> in CI, because plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tsc</code> never reads <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.vue</code> files or templates."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">inject</code> return <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">T | undefined</code> even with a typed key?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The type of the key says what is stored under it, not that anything was stored. Nothing at compile time proves a provider exists above the consumer, so Vue types the result honestly. A default or a throwing helper removes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is wrong with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">inject&lt;Cart&gt;('cart')</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The generic is an assertion, not a check. TypeScript cannot see what was provided under the string <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cart</code>, so a wrong provider compiles fine. A shared <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">InjectionKey&lt;Cart&gt;</code> makes the provider side checked too.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Symbol('theme')</code> match <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">inject('theme')</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Every <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Symbol</code> is unique and its description is only a label. Verified: injecting the string <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Theme</code> found nothing while the symbol-keyed provider was right there.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">InjectionKey</code> a real runtime thing?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, it is a phantom type: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">symbol &amp; InjectionConstraint&lt;T&gt;</code> with an empty interface. That also means a key annotated as one type is assignable to another key type, so you never cast or re-annotate keys.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you make the provided state read-only for consumers?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Provide <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">readonly(state)</code> with a type such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Readonly&lt;Ref&lt;User&gt;&gt;</code>, plus typed functions like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">login()</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">logout()</code>. Consumers get compile-time and runtime protection, and the type shows the only allowed mutations.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **\`InjectionKey<T>\`** | A \`Symbol\` labelled with the type of the value stored under it |
| **Phantom type** | A type parameter that exists only for the compiler |
| **Typed use-helper** | A \`useX()\` wrapper around \`inject\` that throws when the provider is missing |
| **createContext factory** | A generic function returning a typed provide/use pair with a private key |
| **Type-level readonly** | Typing provided state as readonly so consumers cannot assign to it |
| **\`vue-tsc\`** | The TypeScript checker that understands \`.vue\` files and templates |

---
**Conclusion:** Type-safe provide/inject comes down to one shared \`Symbol\` key annotated as \`InjectionKey<T>\`. With it, vue-tsc 3.3.13 caught a wrong value on the provide side, a wrong use on the inject side, and the possibly missing provider, while string keys stayed \`unknown\` and string generics checked nothing. Wrap the key in a \`useX()\` helper or a \`createContext<T>()\` factory that throws a clear error, provide readonly state with typed actions, never cast keys (an \`InjectionKey<string>\` was accepted as an \`InjectionKey<number>\`), and run \`vue-tsc\` in CI so \`.vue\` files are checked at all.`,
    examples: [
      {
        label: "A createContext() factory: private Symbol key, provide helper and a use helper that throws",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { ref, provide, inject, defineComponent, h } from "vue";

// One factory per context: a private Symbol key plus a provide helper and a use helper.
// In TypeScript the key is typed as InjectionKey<T>, so both helpers share one type.
function createContext(name) {
  const key = Symbol(name);
  const provideContext = (value) => (provide(key, value), value);
  const useContext = () => {
    const value = inject(key, null);
    if (value === null) throw new Error(\`use\${name}() needs a \${name} provider above it\`);
    return value;
  };
  return [provideContext, useContext];
}

const [provideTheme, useTheme] = createContext("Theme");

const ThemeLabel = defineComponent({
  setup() {
    const theme = useTheme();
    return () => h("button", { class: "label", onClick: theme.toggle }, \`theme: \${theme.mode.value}\`);
  },
});

// Rendered outside any provider: the helper fails loudly instead of returning undefined.
const Orphan = defineComponent({
  setup() {
    let message;
    try { useTheme(); } catch (e) { message = e.message; }
    return () => h("p", { class: "orphan" }, \`orphan: \${message}\`);
  },
});

const ThemeProvider = defineComponent({
  setup(_, { slots }) {
    const mode = ref("light");
    provideTheme({ mode, toggle: () => (mode.value = mode.value === "light" ? "dark" : "light") });
    return () => h("section", slots.default());
  },
});

// A string key that happens to match the Symbol description finds nothing.
const sameName = inject("Theme", "no provider for the string key");
</script>

<template>
  <ThemeProvider><ThemeLabel /></ThemeProvider>
  <Orphan />
  <p class="string">{{ sameName }}</p>
</template>
`,
      },
      {
        label: "keys.ts: InjectionKey<T> keys with typed provide and use helpers",
        tech: "ts",
        runnable: false,
        code: `import { inject, provide, type InjectionKey, type Ref } from "vue";

export interface Cart {
  items: Ref<string[]>;
  add: (sku: string) => void;
}
export const CartKey: InjectionKey<Cart> = Symbol("cart");
export const LocaleKey = Symbol("locale") as InjectionKey<string>;

export function provideCart(cart: Cart) {
  provide(CartKey, cart);
}
export function useCart(): Cart {
  const cart = inject(CartKey);
  if (!cart) throw new Error("useCart() needs a <CartProvider> ancestor");
  return cart;
}
`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are fallthrough attributes ($attrs)?",
    seoDescription:
      "Fallthrough attributes are the attrs and listeners a Vue component does not declare: how they reach the root, merge class/style, and inheritAttrs.",
    difficulty: "medium",
    description: `**Question presented to candidate:**
"Someone wrote \`<BaseButton class="primary" aria-label="Save" @click="save" />\`, but \`BaseButton\` only declares a \`label\` prop. Where do \`class\`, \`aria-label\` and the click listener end up, and what changes if the component has two root elements or sets \`inheritAttrs: false\`?"

**What a strong answer should cover:**
- **Fallthrough attributes** are everything the parent passes that the child does **not** declare as a prop or an emitted event: \`class\`, \`style\`, \`id\`, \`aria-*\`, \`data-*\`, and \`v-on\` listeners (as \`onClick\` and so on).
- With a **single root element**, Vue adds them to that root automatically; \`class\` and \`style\` are **merged** with the root's own, other attributes override.
- Declared props and declared emits are **removed** from \`$attrs\`; undeclared listeners become native listeners on the root, which can make a handler fire twice if the child also emits that event.
- With **multiple roots** (a fragment) Vue cannot choose, warns "Extraneous non-props attributes...", and you must bind \`v-bind="$attrs"\` on the right element.
- **\`inheritAttrs: false\`** turns off the automatic behaviour so you can place \`$attrs\` on an inner element, such as the \`<input>\` inside a label wrapper.
- If the root is another component, the attributes keep falling through to that component.

**Clarifying questions expected:**
- "Does \`BaseButton\` emit its own \`click\` event, or is it relying on the native one?"
- "Is the root element the right target, or should attributes reach an inner element?"

**Code / implementation expected:** Optional — a wrapper component with \`inheritAttrs: false\` and \`v-bind="$attrs"\` on the inner element.`,
    answer: `**Target Audience:** Anyone preparing for a Vue interview. Assumes you know props and events.
**Difficulty:** Medium

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. All rendered HTML and warning text in the "Verified" sections was produced on Vue 3.5.44, with the repo verifier (compiled and mounted in jsdom) and with Vitest and Vue Test Utils. This doc covers the rules; how to work with them from <code>&lt;script setup&gt;</code> through <code>useAttrs()</code> is its sibling question, linked in section 6.

## 1. Why This Even Matters — A Story First

You order a gift online and add a note: "gift wrap, please, and write 'Happy birthday Sam' on the card". The shop's order form only has fields for item and quantity. A sloppy shop would throw your extra instructions away. A good shop staples them to the parcel, so whoever packs it sees them.

A Vue component's declared props are the order form's fields. Everything else the parent writes on the tag, like a CSS class, an \`aria-label\`, a \`data-test\` id or a click listener, is the extra note. Vue's default is to be the good shop: it **staples those extras onto the component's root element**.

That default is why a \`<BaseButton class="primary" />\` gets styled correctly without \`BaseButton\` declaring a \`class\` prop, and why accessibility attributes and test ids "just work" on design-system components. The interesting interview part is where this breaks: two root elements, the wrong target element, and listeners that fire twice.

## 2. The Core Idea

📌 **Interview term: Fallthrough attributes** — attributes and \`v-on\` listeners passed to a component that it does **not** declare in \`props\` or \`emits\`. Vue collects them in \`$attrs\` and, by default, applies them to the component's single root element.

📌 **Interview term: \`$attrs\`** — the object holding those undeclared attributes. In a template it is \`$attrs\`; in \`<script setup>\` it is \`useAttrs()\`; in \`setup(props, { attrs })\` it is \`attrs\`. Listeners appear in it as \`onClick\`, \`onFocus\` and so on.

📌 **Interview term: Attribute inheritance** — the automatic step that copies \`$attrs\` onto the root element. \`class\` and \`style\` are **merged** with the root's own values; any other attribute from the parent replaces the root's value.

Verified on 3.5.44: a root \`div\` rendered with \`id="own"\`, \`title="own title"\`, \`class="own"\` and \`style="color: blue"\`, and given \`id\`, \`title\`, \`class\` and \`style\` by its parent came out as:

\`\`\`
<div id="from-parent" title="parent title" class="own parent" style="color: blue; margin: 1px;">box</div>
\`\`\`

What counts as "declared":

| Parent writes | Child declares | Ends up |
| :--- | :--- | :--- |
| \`label="Save"\` | \`props: { label }\` | A prop, not in \`$attrs\` |
| \`@confirm="..."\` | \`emits: ["confirm"]\` | A component event, not in \`$attrs\` |
| \`class="primary"\` | nothing | Merged into the root \`class\` |
| \`style="color: red"\` | nothing | Merged into the root \`style\` |
| \`aria-label\`, \`data-test\`, \`id\` | nothing | Set on the root element |
| \`@click="..."\` | nothing | A **native** listener on the root element |

Declaring props and emits is therefore not only documentation: it decides what falls through. See [props and validation](/interview-question/what-are-props-in-vue-and-how-do-you-validate-them) and [why declare emits](/interview-question/why-declare-emits-and-can-you-validate-them).

## 3. Where Attributes Go

<svg class="iq-diagram" width="100%" viewBox="0 0 720 330" role="img" aria-label="Declared props and emits are taken out, the remaining attributes fall through to the single root, or need an explicit target when there are several roots">
  <defs>
    <marker id="vfa-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="200" y="20" width="320" height="56" rx="12"/>
  <text class="d-text" x="360" y="44" text-anchor="middle">Everything on the component tag</text>
  <text class="d-sub" x="360" y="64" text-anchor="middle">label, class, aria-label, onClick, onConfirm</text>
  <rect class="d-box" x="30" y="140" width="200" height="56" rx="12"/>
  <text class="d-text" x="130" y="164" text-anchor="middle">props and emits</text>
  <text class="d-sub" x="130" y="184" text-anchor="middle">label, onConfirm</text>
  <rect class="d-box-accent" x="440" y="140" width="250" height="56" rx="12"/>
  <text class="d-text d-accent" x="565" y="164" text-anchor="middle">$attrs</text>
  <text class="d-sub" x="565" y="184" text-anchor="middle">class, aria-label, onClick</text>
  <rect class="d-box" x="300" y="256" width="180" height="52" rx="12"/>
  <text class="d-text" x="390" y="280" text-anchor="middle">single root</text>
  <text class="d-sub" x="390" y="298" text-anchor="middle">applied automatically</text>
  <rect class="d-box-muted" x="520" y="256" width="180" height="52" rx="12"/>
  <text class="d-text" x="610" y="280" text-anchor="middle">several roots</text>
  <text class="d-sub" x="610" y="298" text-anchor="middle">bind by hand</text>
  <path class="d-edge" d="M 290 80 L 160 134" marker-end="url(#vfa-arrow)"/>
  <path class="d-edge-accent" d="M 430 80 L 540 134" marker-end="url(#vfa-arrow)"/>
  <path class="d-edge-accent" d="M 520 200 L 410 250" marker-end="url(#vfa-arrow)"/>
  <path class="d-edge-dashed" d="M 600 200 L 610 250" marker-end="url(#vfa-arrow)"/>
</svg>

Vue first removes everything the component declared. What is left is \`$attrs\`. If the component renders exactly one root element, \`$attrs\` is applied to it. If it renders a fragment (several roots), Vue refuses to guess and warns until you bind \`$attrs\` on one of them yourself.

## 4. Verified: The Default, the Warning and the Opt-Out

The runnable example (first example below) renders three children. The output from the verifier, including the dev warning printed during mount:

\`\`\`
[Vue warn]: Extraneous non-props attributes (class, data-x) were passed to component but could not be automatically inherited because component renders fragment or text or teleport root nodes.
  at <Anonymous class="oops" data-x="1" >
button: <button class="base primary" style="color: red;" data-test="save" aria-label="Save draft">Save</button>
two roots: <label>Name</label> <input>
labeled: <label class="wrapper">Email <input class="field" type="email" placeholder="you@example.com"></label>
after click: clicks 1 confirms 1
\`\`\`

1. **Single root.** \`BaseButton\` declares only \`label\` and the \`confirm\` event. Its own \`class="base"\` was merged with the parent's \`primary\`; \`style\`, \`data-test\` and \`aria-label\` landed on the \`<button>\`; \`label\` became the text and did not appear as an attribute.
2. **The click listener fell through as a native listener.** One click ran both the parent's \`@click\` (via \`$attrs.onClick\` on the button) and the declared \`confirm\` event the child emitted: \`clicks 1 confirms 1\`.
3. **Two roots.** \`TwoRoots\` renders \`<label>\` and \`<input>\`. Vue applied nothing to either and printed the "Extraneous non-props attributes" warning. Passing only a listener triggers the sibling warning: \`Extraneous non-emits event listeners (focus) were passed to component but could not be automatically inherited because component renders fragment or text root nodes. If the listener is intended to be a component custom event listener only, declare it using the "emits" option.\`
4. **\`inheritAttrs: false\`.** \`LabeledInput\` disabled the automatic step and spread \`attrs\` onto its inner \`<input>\`. The \`class\`, \`type\` and \`placeholder\` went to the input, and the wrapper \`<label>\` kept only its own \`class="wrapper"\`.

📌 **Interview term: \`inheritAttrs: false\`** — a component option that turns off attribute inheritance. \`$attrs\` is still filled in; nothing is applied until you bind it yourself with \`v-bind="$attrs"\`. In \`<script setup>\` it is set with \`defineOptions({ inheritAttrs: false })\` (Vue 3.3+).

The second example fixes the two-root case in an SFC by binding \`$attrs\` on the input. Mounted with Vue Test Utils:

\`\`\`
<label for="city">City</label>
<input id="city" class="wide" placeholder="Paris">
input listener calls: 1 | warnings: 0
\`\`\`

Explicitly binding \`$attrs\` on one root both routes the attributes and removes the warning.

## 5. Verified: Two Subtle Rules

**Undeclared events double-fire.** A child that emits \`click\` itself, without declaring it, also passes the parent's \`@click\` down as a native listener. Clicking each child once:

\`\`\`
after clicking undeclared: U:from child, U:MouseEvent
after clicking declared:   U:from child, U:MouseEvent, D:from child
\`\`\`

The undeclared child ran the parent's handler **twice**: once for the emit (payload \`"from child"\`) and once for the native DOM click (a \`MouseEvent\`). Declaring \`emits: ["click"]\` removed \`onClick\` from \`$attrs\`, so the handler ran once, with the emitted payload only.

**Attributes keep falling through component roots.** When a component's root is another component, its \`$attrs\` become that component's input:

\`\`\`
<button class="inner outer from-app" data-size="lg" id="save-btn">inner sees attrs: class,id,onClick</button>
\`\`\`

The app passed \`label\`, \`size\`, \`class\`, \`id\`, \`@save\` and \`@click\` to \`Outer\`. \`Outer\` consumed \`label\` and \`save\`. The rest fell through to \`Inner\`, which declared \`size\` as a prop (rendered as \`data-size="lg"\`), and the remaining \`class\`, \`id\` and \`onClick\` reached the \`<button>\`, with classes merged in the order inner, outer, app.

## 6. Working With $attrs

| Goal | How |
| :--- | :--- |
| Put attributes on an inner element | \`inheritAttrs: false\` and \`v-bind="$attrs"\` on that element |
| Multi-root component | \`v-bind="$attrs"\` on the root that should receive them |
| Read attributes in a template | \`$attrs.id\`, \`$attrs['data-test']\` |
| Read attributes in \`<script setup>\` | \`useAttrs()\`, covered in [useAttrs() vs $attrs](/interview-question/useattrs-vs-attrs-how-do-you-handle-fallthrough-attributes-in-composition-api) |
| Send \`class\` to the wrapper but the rest to the input | Split \`$attrs\` into two objects (also in that sibling question) |
| Forward slots too in a wrapper | Loop over \`$slots\`, as shown in [slots](/interview-question/what-are-slots-in-vue) |

📌 **Interview term: Transparent wrapper** — a component that wraps a native element or another component and passes attributes, listeners and slots straight through, so it can be used exactly like the element it wraps. Fallthrough attributes are what make thin wrappers like \`BaseInput\` cheap to write.

Note the contrast with React, where nothing falls through automatically and wrappers spread \`{...rest}\` by hand. Vue's default is opt-out, React's is opt-in. Class binding syntax itself is covered in [binding classes and styles](/interview-question/how-do-you-bind-classes-and-styles-dynamically).

## 7. Common Pitfalls

- **Forgetting to declare an event you emit.** As verified, an undeclared \`click\` emit plus the native click runs the parent's handler twice. Declare every emitted event.
- **Adding a second root and losing styling.** Turning a single-root component into a fragment silently stops \`class\` from applying; only a dev warning tells you. Bind \`$attrs\` explicitly.
- **Using \`inheritAttrs: false\` and forgetting to bind.** The attributes then go nowhere, including \`aria-*\` and \`data-test\`. Accessibility and tests break quietly.
- **Binding \`$attrs\` on an inner element but leaving \`class\` there.** Teams usually expect \`class\` to style the outer wrapper. Split \`class\` and \`style\` from the rest when the wrapper is what gets laid out.
- **Expecting \`$attrs\` to contain props.** Declared props never appear in it, which is the point. If you need a prop forwarded, pass it explicitly or do not declare it.
- **Teleported or text roots.** A component whose root is a \`<Teleport>\` or plain text cannot inherit attributes either; the warning names "fragment or text or teleport root nodes". See [Teleport](/interview-question/what-is-teleport-in-vue-3).

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">"Fallthrough attributes are whatever the parent passes that the component does not declare as a prop or an emit, such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">class</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">style</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-*</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">data-*</code> and listeners; they are collected in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$attrs</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Default rule:</strong> <span style="color:#f0e2c8;">"With a single root element, Vue applies <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$attrs</code> to that root automatically, merging <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">class</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">style</code> and overriding other attributes."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Multi-root:</strong> <span style="color:#f0e2c8;">"With several roots Vue cannot guess, so it warns about extraneous attributes, and I bind <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-bind="$attrs"</code> on the element that should receive them."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Opt-out:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inheritAttrs: false</code>, or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineOptions({ inheritAttrs: false })</code> in script setup, turns the automatic step off so I can put the attributes on an inner element like the input inside a label."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Gotcha:</strong> <span style="color:#f0e2c8;">"Declare every emitted event, because an undeclared <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">click</code> also falls through as a native listener and the parent handler runs twice."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Are event listeners part of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">$attrs</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, undeclared ones, as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onClick</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onFocus</code> and so on. Declared emits are removed. On a single root they become native DOM listeners, which is why <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@click</code> on a button wrapper works without the wrapper declaring anything.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How are <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">class</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">style</code> treated differently?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">They merge. A root with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">class="base"</code> given <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">class="primary"</code> renders <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">class="base primary"</code>, and styles combine. Any other attribute from the parent replaces the root value.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens when the root of a component is another component?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The attributes fall through again. Verified: an outer component consumed its own props and events, and the rest reached the inner component, which turned <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size</code> into a prop and passed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">class</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">id</code> and the click listener on to its button.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did my handler run twice?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The child emitted <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">click</code> without declaring it, so the parent <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@click</code> was also attached as a native listener on the root. One click produced one emit and one DOM event. Declaring <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">emits: ["click"]</code> fixes it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you set <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">inheritAttrs: false</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the root is not the right target, typically a label or wrapper around an input, a component with several roots, or when class should go to the wrapper while the rest go to the inner element.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Fallthrough attributes** | Attributes and listeners the component does not declare |
| **\`$attrs\`** | The object holding them; \`useAttrs()\` in script setup |
| **Attribute inheritance** | Vue applying \`$attrs\` to the single root automatically |
| **Merge (class/style)** | Parent and root values are combined instead of replaced |
| **\`inheritAttrs: false\`** | Option that turns automatic inheritance off |
| **Fragment root** | A component template with more than one root node |
| **Transparent wrapper** | A component that passes attributes, listeners and slots straight through |

---
**Conclusion:** Fallthrough attributes are everything a parent passes that the component does not declare: \`class\`, \`style\`, \`aria-*\`, \`data-*\` and undeclared listeners, collected in \`$attrs\`. With one root element Vue applies them automatically, merging \`class\` and \`style\`; with several roots it warns and waits for \`v-bind="$attrs"\`; and \`inheritAttrs: false\` lets you aim them at an inner element. Verified on 3.5.44, they also cascade through component roots, and an undeclared \`click\` emit makes the parent's handler fire twice, which is why every emitted event should be declared.`,
    examples: [
      {
        label: "Single-root inheritance, the multi-root warning, and inheritAttrs: false with $attrs bound by hand",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { ref, defineComponent, h } from "vue";

// Single root: undeclared attributes land on the <button> automatically.
const BaseButton = defineComponent({
  props: { label: String },
  emits: ["confirm"],
  setup(props, { emit }) {
    return () => h("button", { class: "base", onClick: () => emit("confirm") }, props.label);
  },
});

// Two roots: Vue cannot guess where attributes go.
const TwoRoots = defineComponent({
  setup() {
    return () => [h("label", "Name"), h("input")];
  },
});

// inheritAttrs: false + bind $attrs on the inner element by hand.
const LabeledInput = defineComponent({
  inheritAttrs: false,
  props: { label: String },
  setup(props, { attrs }) {
    return () =>
      h("label", { class: "wrapper" }, [props.label + " ", h("input", { ...attrs })]);
  },
});

const clicks = ref(0);
const confirms = ref(0);
</script>

<template>
  <BaseButton
    label="Save"
    class="primary"
    style="color: red"
    data-test="save"
    aria-label="Save draft"
    @click="clicks++"
    @confirm="confirms++"
  />
  <TwoRoots class="oops" data-x="1" />
  <LabeledInput label="Email" class="field" type="email" placeholder="you@example.com" />
  <p>clicks {{ clicks }} confirms {{ confirms }}</p>
</template>
`,
      },
      {
        label: "FieldRow.vue: a two-root SFC that binds $attrs on the input",
        tech: "vue",
        runnable: false,
        code: `<script setup>
// Two root nodes, so Vue cannot pick a target for fallthrough attributes.
// Binding $attrs on one of them tells Vue where they go (and silences the warning).
defineProps({ label: String });
</script>

<template>
  <label :for="$attrs.id">{{ label }}</label>
  <input v-bind="$attrs" />
</template>
`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "useAttrs() vs $attrs — how do you handle fallthrough attributes in composition API?",
    seoDescription:
      "useAttrs() is the script-side handle on $attrs in <script setup>: defineOptions({ inheritAttrs: false }), splitting class from the rest, reactivity.",
    description: `**Question presented to candidate:**
"We are moving our \`BaseInput\` from the Options API to \`<script setup>\`. In the template it used \`$attrs\`, and it had \`inheritAttrs: false\`. How do you do the same things in the Composition API, and what is the difference between \`useAttrs()\` and \`$attrs\`?"

**What a strong answer should cover:**
- \`$attrs\` is the **template** handle on fallthrough attributes; **\`useAttrs()\`** is the **script** handle in \`<script setup>\` (and \`setup(props, { attrs })\` in a plain \`setup()\` function). They expose the same data.
- \`inheritAttrs: false\` moves into **\`defineOptions({ inheritAttrs: false })\`** (Vue 3.3+), which the compiler hoists into the component options.
- A common pattern: **split** \`class\` and \`style\` for the wrapper from the rest for the inner \`<input>\`, with \`computed\` objects bound by \`v-bind\`.
- The attrs object is **read-only** and not a \`reactive()\` object: do not destructure it at the top of setup, and the docs advise using a prop when you need to watch a value (or reading it in \`onUpdated\`).
- In TypeScript \`useAttrs()\` returns \`Record<string, unknown>\`, so declare as props anything you need typed.
- When you need neither (single root, default behaviour), you need neither API: inheritance is automatic.

**Clarifying questions expected:**
- "Should \`class\` style the wrapper or the input?"
- "Does any logic in the script depend on the attribute values, or is it only forwarding them?"

**Code / implementation expected:** Yes — a \`<script setup>\` wrapper using \`defineOptions({ inheritAttrs: false })\`, \`useAttrs()\` and \`v-bind\` on the inner element.`,
    answer: `**Target Audience:** Vue developers moving to \`<script setup>\` and the Composition API. Assumes you know what [fallthrough attributes ($attrs)](/interview-question/what-are-fallthrough-attributes-attrs) are; that sibling question covers the inheritance rules themselves.
**Difficulty:** Medium

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. Every output in the "Verified" sections was produced on Vue 3.5.44: single-file examples with the repo verifier (compiled and mounted in jsdom), the real <code>&lt;script setup&gt;</code> component with Vitest and Vue Test Utils, and compiler output with <code>@vue/compiler-sfc</code>.

## 1. Why This Even Matters — A Story First

A hotel has a front desk and a back office. Guests hand their requests ("extra pillows, late checkout, wake-up call at 7") to the front desk, which is the only place guests ever see. Staff in the back office need the same list to actually do the work, so they read it from the shared ticket system rather than walking out to the desk.

The guest requests are the **fallthrough attributes**. The front desk is the **template**, where they are called \`$attrs\`. The back office is your **\`<script setup>\` code**, where the same list is reached through **\`useAttrs()\`**. Same requests, two doors.

The interview question is really about the back office. In the Options API everything lived on \`this\`, so \`this.$attrs\` was right there. \`<script setup>\` has no \`this\`, so you need a function to reach the attributes, a macro to set \`inheritAttrs: false\`, and a clear idea of how live that object is when your code reads it.

## 2. The Core Idea

📌 **Interview term: \`useAttrs()\`** — a Composition API helper, called synchronously in \`<script setup>\`, that returns the component's fallthrough attributes object. It exists because \`<script setup>\` has no \`this\` and no setup-context argument.

📌 **Interview term: Setup context \`attrs\`** — in a plain \`setup(props, context)\` function, the same attributes are \`context.attrs\`. \`useAttrs()\` is simply the way to get them when the compiler writes \`setup\` for you.

📌 **Interview term: \`defineOptions()\`** — a \`<script setup>\` compiler macro (added in Vue 3.3, May 2023, per the <a href="https://github.com/vuejs/core/blob/main/changelogs/CHANGELOG-3.3.md" target="_blank" rel="noopener noreferrer">3.3 changelog</a>) for component options that have no macro of their own, such as \`inheritAttrs\` and \`name\`. See [defineOptions and defineSlots](/interview-question/what-do-defineoptions-and-defineslots-do-in-script-setup).

| Where you are | How to reach fallthrough attributes | How to set \`inheritAttrs: false\` |
| :--- | :--- | :--- |
| Template (any API) | \`$attrs\` | n/a |
| Options API script | \`this.$attrs\` | \`inheritAttrs: false\` option |
| \`setup(props, ctx)\` | \`ctx.attrs\` | \`inheritAttrs: false\` option |
| \`<script setup>\` | \`useAttrs()\` | \`defineOptions({ inheritAttrs: false })\` |
| Render function component | \`ctx.attrs\` from \`setup\` | \`inheritAttrs: false\` option |

Both \`useAttrs()\` and \`useSlots()\` arrived alongside \`defineExpose\` in Vue 3.1.3 (July 2021), shortly before \`<script setup>\` lost its experimental label in 3.2.0 on 9 August 2021 (source: the <a href="https://github.com/vuejs/core/blob/main/changelogs/CHANGELOG-3.1.md" target="_blank" rel="noopener noreferrer">3.1</a> and <a href="https://github.com/vuejs/core/blob/main/changelogs/CHANGELOG-3.2.md" target="_blank" rel="noopener noreferrer">3.2</a> changelogs).

**If you only forward attributes to one element, you need no script at all**: \`v-bind="$attrs"\` in the template is enough. Reach for \`useAttrs()\` when script logic must read or reshape the attributes.

## 3. The Two Doors

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="The instance attrs object is reached through useAttrs in script setup and through dollar attrs in the template, then split between wrapper and input">
  <defs>
    <marker id="vua-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="250" y="20" width="220" height="56" rx="12"/>
  <text class="d-text d-accent" x="360" y="44" text-anchor="middle">instance attrs</text>
  <text class="d-sub" x="360" y="64" text-anchor="middle">filled on every render</text>
  <rect class="d-box" x="40" y="130" width="240" height="56" rx="12"/>
  <text class="d-text" x="160" y="154" text-anchor="middle">script setup</text>
  <text class="d-sub" x="160" y="174" text-anchor="middle">const attrs = useAttrs()</text>
  <rect class="d-box" x="440" y="130" width="240" height="56" rx="12"/>
  <text class="d-text" x="560" y="154" text-anchor="middle">template</text>
  <text class="d-sub" x="560" y="174" text-anchor="middle">$attrs or v-bind</text>
  <rect class="d-box-muted" x="40" y="230" width="240" height="52" rx="12"/>
  <text class="d-text" x="160" y="261" text-anchor="middle">class and style to wrapper</text>
  <rect class="d-box-muted" x="440" y="230" width="240" height="52" rx="12"/>
  <text class="d-text" x="560" y="261" text-anchor="middle">everything else to input</text>
  <path class="d-edge" d="M 290 80 L 180 124" marker-end="url(#vua-arrow)"/>
  <path class="d-edge" d="M 430 80 L 540 124" marker-end="url(#vua-arrow)"/>
  <path class="d-edge-accent" d="M 160 190 L 160 224" marker-end="url(#vua-arrow)"/>
  <path class="d-edge-accent" d="M 250 190 L 520 226" marker-end="url(#vua-arrow)"/>
</svg>

Vue keeps one attrs object per component instance and refills it on every render of the parent. \`useAttrs()\` and \`$attrs\` are two read-only views of it. The typical job of the script side is to reshape it, for example into one object for the wrapper and one for the input.

## 4. Verified: The script setup Version

The second example is a real \`<script setup>\` SFC:

\`\`\`html
<script setup>
import { computed, useAttrs } from "vue";

defineOptions({ inheritAttrs: false });
const props = defineProps({ label: String });
const model = defineModel();
const attrs = useAttrs();

const rootAttrs = computed(() => ({ class: attrs.class, style: attrs.style }));
const inputAttrs = computed(() => {
  const { class: _c, style: _s, ...rest } = attrs;
  return rest;
});
</script>

<template>
  <label class="field" v-bind="rootAttrs">
    <span>{{ props.label }}</span>
    <input v-model="model" v-bind="inputAttrs" />
  </label>
</template>
\`\`\`

Mounted with Vue Test Utils, given \`class\`, \`style\`, \`type\`, \`placeholder\` and an \`onFocus\` listener, then typed into and given a new class:

\`\`\`
<label class="field wide" style="margin: 4px;"><span>Email</span><input type="email" placeholder="you@example.com"></label>
focus listener on input: focus | modelValue: a@b.c
after class change: field narrow
\`\`\`

- \`class\` and \`style\` reached the **wrapper**, merged with its own \`class="field"\` (template \`class\` plus \`v-bind\` merge, exactly like fallthrough).
- \`type\`, \`placeholder\` and the **focus listener** reached the **input**. Listeners are part of attrs, so they travel with the rest.
- When the parent changed the class, the \`computed\` re-ran and the wrapper updated to \`field narrow\`.

The compiler turns \`defineOptions\` into a plain options object merged into the component (\`@vue/compiler-sfc\` 3.5.44):

\`\`\`js
export default /*@__PURE__*/Object.assign({ inheritAttrs: false }, {
  __name: 'BaseInput',
  setup(__props) {
const attrs = useAttrs();
\`\`\`

The runnable example (first example below) is the same component written with \`defineComponent\` and \`useAttrs()\` inside its \`setup\`, because the playground cannot compile a second \`.vue\` file. Verifier output:

\`\`\`
html: <label class="field" style="margin: 4px;"><span>Email </span><input type="email" placeholder="you@example.com" autocomplete="email" value=""></label>
after focus + typing: email: "ada@example.com" | focus events: 1
after toggle, wrapper class: field wide
\`\`\`

## 5. Verified: How Live Is the attrs Object?

This is where answers often go wrong. Three experiments on 3.5.44:

**Destructuring freezes a value.**

\`\`\`
useAttrs() === this.$attrs: false | same title: true
[app] RENDERED: live=one destructured=one
after change: live=two destructured=one
\`\`\`

\`const { title } = attrs\` copied \`"one"\` once; reading \`attrs.title\` in the render function saw \`"two"\`. Also note \`useAttrs()\` and \`this.$attrs\` are **different proxy objects** over the same data, so compare values, never the objects.

**Writing is refused.** \`attrs.title = "hacked"\` printed \`[Vue warn]: setupContext.attrs is readonly.\` and then threw \`TypeError: 'set' on proxy: trap returned falsish for property 'title'\` (module code is strict mode), crashing setup.

**Watchers and computeds do re-run, but coarsely.**

\`\`\`
isReactive(attrs): false
watch saw title -> two
onUpdated sees attrs.title = two | computed = TWO
\`\`\`

The Vue docs state that attrs is not reactive and recommend a prop, or \`onUpdated()\`, when you need to react to a change (source: <a href="https://vuejs.org/guide/components/attrs.html#accessing-fallthrough-attributes-in-javascript" target="_blank" rel="noopener noreferrer">vuejs.org, Fallthrough Attributes</a>). On 3.5.44, \`isReactive(attrs)\` is indeed \`false\`, yet a \`watch(() => attrs.title)\` and a \`computed\` both updated. Reading the 3.5.44 runtime explains it: the attrs proxy calls \`track(target, "get", "")\` on **every** read, under one shared key, in both the dev and prod builds, and Vue triggers that key whenever attrs change. So tracking exists, but it is **all-or-nothing**. Changing an unrelated attribute twice:

\`\`\`
after changing an unrelated attr twice: ONE (computed ran 3x)
\`\`\`

The computed reading only \`attrs.title\` re-ran on every change of \`data-other\`. Treat this as an implementation detail rather than a guarantee: if script logic depends on a value, **declare it as a prop**. Props are fine-grained, typed and documented. Keep \`useAttrs()\` for forwarding and reshaping.

📌 **Interview term: Coarse-grained tracking** — dependency tracking at the level of a whole object rather than each key, so any change re-runs every reader. Compare [Vue reactivity](/interview-question/how-does-vue-s-reactivity-system-work), which tracks each property separately for \`reactive()\` objects.

## 6. TypeScript and Testing

\`useAttrs()\` is typed as \`SetupContext['attrs']\`, which is \`Record<string, unknown>\` in the 3.5.44 typings. You get no autocomplete for \`attrs.placeholder\`, and every read is \`unknown\`. That is another reason to turn anything script logic relies on into a typed prop with \`defineProps<...>()\` (see [TypeScript with Vue](/interview-question/how-do-you-use-typescript-with-vue-typed-props-emits-refs-vue-tsc)).

In tests, Vue Test Utils passes attributes with the \`attrs\` mounting option, as in the verified test above; see [testing Vue components](/interview-question/how-do-you-test-vue-components-vitest-and-vue-test-utils).

| Question | \`$attrs\` (template) | \`useAttrs()\` (script setup) |
| :--- | :--- | :--- |
| Where it is used | Templates, any API style | \`<script setup>\` code |
| Forward everything to one element | \`v-bind="$attrs"\`, simplest | Not needed |
| Reshape or split | Awkward inline | \`computed\` objects, as above |
| Read in logic | Possible but untyped | Possible but untyped |
| Typed | No | \`Record<string, unknown>\` |
| Writable | No | No, warns then throws |

## 7. Common Pitfalls

- **Destructuring at the top of setup.** \`const { class: cls } = useAttrs()\` captures the first value only, as verified. Read inside \`computed\` or the render.
- **Watching attrs as your source of truth.** It happens to fire on 3.5.44, coarsely, but the docs say not to rely on it. Make the value a prop.
- **Forgetting \`defineOptions({ inheritAttrs: false })\` when splitting.** Without it, Vue also applies everything to the root automatically, so the input attributes appear on the wrapper too.
- **Calling \`useAttrs()\` outside setup.** Like other composition helpers it needs the current instance; call it at the top of \`<script setup>\` or inside a composable called from there.
- **Comparing \`useAttrs()\` to \`$attrs\` by identity.** They are different proxies (verified \`false\`); compare the values you care about.
- **Splitting by hand and dropping listeners.** A rest spread like \`{ class, style, ...rest }\` keeps \`onFocus\` and \`onInput\` in \`rest\`, which is what you want; filtering keys by a whitelist usually drops them.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Same data, two doors:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$attrs</code> is how a template reads fallthrough attributes, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useAttrs()</code> is how <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;script setup&gt;</code> code reads the same attributes, since there is no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">this</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The option:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inheritAttrs: false</code> becomes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineOptions({ inheritAttrs: false })</code>, a Vue 3.3 macro that the compiler hoists into the component options."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Typical pattern:</strong> <span style="color:#f0e2c8;">"For a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BaseInput</code> I split attrs with two computeds, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">class</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">style</code> for the wrapper and the rest, including listeners, for the input, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-bind</code> each."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Liveness:</strong> <span style="color:#f0e2c8;">"The object always has the latest values but it is read-only and not a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reactive()</code> object, so I never destructure it at the top and I use a prop when logic depends on a value."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Keep it simple:</strong> <span style="color:#f0e2c8;">"If I only forward attributes to one element, I skip the script entirely and write <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-bind="$attrs"</code> in the template."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useAttrs()</code> reactive?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The docs say no and recommend a prop or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onUpdated</code>. On 3.5.44 it is not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reactive()</code>, but reads are tracked under one shared key, so a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watch</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> does re-run, on every attribute change. I treat that as an implementation detail and use props for logic.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">defineOptions</code> compile to?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">An <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.assign({ inheritAttrs: false }, { __name, setup })</code> around the generated component, verified with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@vue/compiler-sfc</code>. It is hoisted out of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setup()</code>, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineOptions({ inheritAttrs: flag.value })</code> with a local ref fails to compile: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineOptions() in &lt;script setup&gt; cannot reference locally declared variables because it will be hoisted outside of the setup() function.</code></span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you send <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">class</code> to the wrapper but other attributes to the input?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Turn inheritance off, then build <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rootAttrs</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">class</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">style</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inputAttrs</code> with a rest spread of everything else. Bind them with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-bind</code> on the wrapper and the input. Verified: the class merged with the wrapper class and the focus listener reached the input.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useAttrs()</code> the same object as <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">this.$attrs</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not the same object: both are read-only proxies over the instance attrs, and an identity check returned <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">false</code>, while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">attrs.title === $attrs.title</code> was <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">true</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How are attributes typed?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useAttrs()</code> returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Record&lt;string, unknown&gt;</code>, so nothing is typed. Anything the component relies on should be a declared, typed prop; attrs are for passing through what you do not need to understand.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **\`useAttrs()\`** | Script setup access to fallthrough attributes |
| **Setup context \`attrs\`** | The same object as \`ctx.attrs\` in a plain \`setup()\` |
| **\`$attrs\`** | Template access to fallthrough attributes |
| **\`defineOptions()\`** | Macro for options like \`inheritAttrs\` and \`name\` in script setup |
| **Attribute splitting** | Sending \`class\`/\`style\` to one element and the rest to another |
| **Coarse-grained tracking** | One dependency for the whole object, so any change re-runs every reader |

---
**Conclusion:** In the Composition API, \`useAttrs()\` is the script-side door to the same fallthrough attributes that templates read as \`$attrs\`, and \`defineOptions({ inheritAttrs: false })\` replaces the \`inheritAttrs\` option. The everyday pattern is splitting the attrs into a wrapper object and an input object with computeds, which on 3.5.44 merged the wrapper class, routed listeners to the input and updated when the parent changed the class. The object is read-only (writes warn and then throw), destructuring freezes values, and although reads are tracked coarsely in 3.5.44, the documented advice stands: use props for anything your logic depends on, and keep \`useAttrs()\` for forwarding.`,
    examples: [
      {
        label: "A BaseInput that sends class and style to the wrapper and every other attribute to the input",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { ref, computed, useAttrs, defineComponent, h } from "vue";

// In a .vue file this child would be <script setup> with
//   defineOptions({ inheritAttrs: false }) and const attrs = useAttrs()
const BaseInput = defineComponent({
  inheritAttrs: false,
  props: { label: String, modelValue: String },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    const attrs = useAttrs();   // the same attributes the template sees as $attrs

    // class and style decorate the wrapper; everything else belongs on the <input>.
    const rootAttrs = computed(() => ({ class: ["field", attrs.class], style: attrs.style }));
    const inputAttrs = computed(() => {
      const { class: _c, style: _s, ...rest } = attrs;
      return rest;
    });

    return () =>
      h("label", rootAttrs.value, [
        h("span", props.label + " "),
        h("input", {
          ...inputAttrs.value,
          value: props.modelValue,
          onInput: (e) => emit("update:modelValue", e.target.value),
        }),
      ]);
  },
});

const email = ref("");
const focusCount = ref(0);
const wide = ref(false);
</script>

<template>
  <BaseInput
    v-model="email"
    label="Email"
    :class="{ wide }"
    style="margin: 4px"
    type="email"
    placeholder="you@example.com"
    autocomplete="email"
    @focus="focusCount++"
  />
  <button class="toggle" @click="wide = !wide">toggle wide</button>
  <p>email: "{{ email }}" | focus events: {{ focusCount }}</p>
</template>
`,
      },
      {
        label: "BaseInput.vue: the same component as <script setup> with defineOptions and useAttrs",
        tech: "vue",
        runnable: false,
        code: `<script setup>
import { computed, useAttrs } from "vue";

defineOptions({ inheritAttrs: false });
const props = defineProps({ label: String });
const model = defineModel();
const attrs = useAttrs();

// class and style style the wrapper; everything else belongs on the <input>.
const rootAttrs = computed(() => ({ class: attrs.class, style: attrs.style }));
const inputAttrs = computed(() => {
  const { class: _c, style: _s, ...rest } = attrs;
  return rest;
});
</script>

<template>
  <label class="field" v-bind="rootAttrs">
    <span>{{ props.label }}</span>
    <input v-model="model" v-bind="inputAttrs" />
  </label>
</template>
`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is defineExpose?",
    seoDescription:
      "defineExpose() chooses what a <script setup> component shows to a parent template ref: methods like focus() or reset(), unwrapped refs, and the rules.",
    description: `**Question presented to candidate:**
"I have a \`<script setup>\` \`SearchField\` component and the parent page needs to focus it and clear it from a keyboard shortcut. I put \`ref="field"\` on it, but \`field.value.focus\` is \`undefined\`. What is \`defineExpose\`, and how would you use it here?"

**What a strong answer should cover:**
- \`defineExpose({ ... })\` is a \`<script setup>\` **compiler macro** that lists what a parent can reach through a **template ref** on this component; nothing else is visible.
- Typical exposed members are **imperative methods**: \`focus()\`, \`clear()\`, \`validate()\`, \`open()\` / \`close()\`, \`scrollToTop()\`.
- Exposed refs and computeds are **unwrapped** on the parent side (\`field.value.length\` is a number, not a ref).
- Rules: call it **once, at the top level** of \`<script setup>\`; it compiles to the \`expose()\` function from the setup context, and \`defineOptions\` cannot declare \`expose\`.
- The parent can only use it **after mount** (the ref is \`null\` before), and in TypeScript the exposed shape is inferred, so calling a non-exposed member is a type error.
- Prefer props and events for data; keep the exposed API small and command-shaped.

**Clarifying questions expected:**
- "Does the parent only need to trigger actions, or also read state from the child?"
- "Is the shortcut handled before the field is mounted, for example while it is behind a \`v-if\`?"

**Code / implementation expected:** Yes — a child using \`defineExpose\` with one or two methods and a parent calling them through a template ref.`,
    answer: `**Target Audience:** Anyone preparing for a Vue interview who has used \`<script setup>\`. Assumes you know what a template ref is.
**Difficulty:** Medium

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. The runtime output was produced on Vue 3.5.44 with the repo verifier (compiled and mounted in jsdom) and with Vitest and Vue Test Utils; compiler messages come from <code>@vue/compiler-sfc</code> 3.5.44 and type errors from <code>vue-tsc</code> 3.3.13. This doc is the practical "how do I use it" answer; the design reasoning behind closed components is its sibling question, linked in section 6.

## 1. Why This Even Matters — A Story First

A modern coffee machine has a sealed body. Inside are a pump, a boiler, pressure sensors and a dozen settings the manufacturer tuned carefully. On the front there are exactly three buttons: espresso, long coffee, descale. You can make every drink you need with those buttons, and you cannot accidentally crank the boiler to a dangerous temperature, because that knob is not on the outside.

A \`<script setup>\` component is that sealed body. Its refs, functions and computed values live inside, and by default a parent holding a template ref to it sees **none** of them. **\`defineExpose\`** is where you decide which buttons go on the front panel.

This comes up in real apps more often than people expect: focusing a field from a keyboard shortcut, resetting a form after submit, opening a dialog, scrolling a list to the top, triggering validation before navigation. Those are commands, and commands are exactly what \`defineExpose\` is for.

## 2. The Core Idea

📌 **Interview term: \`defineExpose()\`** — a compiler macro available only in \`<script setup>\` that declares the public instance API of the component: the properties a parent can reach through a template ref. It is not imported; the compiler recognises it and rewrites it.

📌 **Interview term: Public instance (exposed proxy)** — the object a parent receives in \`childRef.value\`. For a \`<script setup>\` child it contains the exposed members plus Vue built-ins such as \`$el\` and \`$props\`, and nothing else.

📌 **Interview term: Imperative API** — methods a parent calls to make a child *do* something (\`focus()\`, \`reset()\`), as opposed to the declarative data flow of props and events. React developers will recognise the same idea as \`useImperativeHandle\` (see [forwardRef with useImperativeHandle](/interview-question/when-and-why-do-you-use-forwardref-with-useimperativehandle)).

\`\`\`html
<script setup>
import { ref, computed } from "vue";

const query = ref("");
const inputEl = ref(null);
const length = computed(() => query.value.length);

function focus() { inputEl.value.focus(); }
function clear() { query.value = ""; focus(); }

defineExpose({ focus, clear, length });
</script>
\`\`\`

The parent:

\`\`\`html
<SearchField ref="field" />
<button @click="field.clear()">clear</button>
\`\`\`

## 3. Verified: The Search Field

The runnable example (first example below) is the search field from the question. The child keeps \`query\` and \`inputEl\` private and exposes \`focus\`, \`clear\` and \`length\`. The driver typed "vue", inspected the child, clicked clear and inspected again:

\`\`\`
after typing: last search event: "vue" | length=3 query=undefined focused=BODY
after clear : last search event: "vue" | length=0 query=undefined focused=INPUT | input value: ""
\`\`\`

- **\`length\` is a plain number** on the parent side (\`3\`, then \`0\`). Exposed refs and computeds are unwrapped, like refs returned to a template.
- **\`query\` is \`undefined\`** for the parent, although it exists inside the child. Not exposed means not visible.
- **\`clear()\` worked through the boundary**: it emptied the input and moved focus into it (\`focused=INPUT\`), using the child's private element ref.
- **Data still flows through events.** The parent learned the search text from the \`search\` event, not by reading the child.

The second example is the same idea as two real \`.vue\` files. Mounted with Vitest and Vue Test Utils, the parent printed what it could see on \`<Counter ref="counter" />\`:

\`\`\`
parent saw -> reset:function count:undefined step:undefined
\`\`\`

\`Counter\` has \`count\`, \`step\` and \`reset\`, but only \`reset\` was in \`defineExpose\`.

## 4. What the Compiler Does With It

\`defineExpose\` is not a runtime function. With \`@vue/compiler-sfc\` 3.5.44, a child calling \`defineExpose({ reset })\` compiles to:

\`\`\`js
setup(__props, { expose: __expose }) {
const count = ref(0)
function reset() { count.value = 0 }
__expose({ reset })
\`\`\`

📌 **Interview term: \`expose()\` (setup context)** — the function every \`setup(props, { expose })\` receives. \`defineExpose\` is sugar for calling it. In a plain \`setup()\` function or a render-function component you call \`expose({ ... })\` yourself, which is what the runnable example does for its inline child.

📌 **Interview term: \`expose\` option** — the Options API equivalent, a list of names: \`expose: ["reset"]\`. Verified: an Options API component with \`expose: ["reset"]\` gave its parent the keys \`[ 'reset' ]\`, and \`count\` was \`undefined\`.

Because it is a macro, the compiler enforces some rules (messages from 3.5.44):

\`\`\`
defineExpose({ a: 1 }); defineExpose({ b: 2 })
-> [@vue/compiler-sfc] duplicate defineExpose() call

defineOptions({ expose: ["reset"] })
-> [@vue/compiler-sfc] defineOptions() cannot be used to declare expose. Use defineExpose() instead.

onMounted(() => defineExpose({ reset }))
-> ReferenceError: defineExpose is not defined   (at runtime, in the mounted hook)
\`\`\`

The last one compiled without complaint because the macro is only recognised at the top level of \`<script setup>\`; nested inside a callback it stays a plain call to a function that does not exist.

\`defineExpose\` was introduced in Vue 3.1.3 (July 2021), just before \`<script setup>\` was declared stable in 3.2.0 on 9 August 2021, and its generic type parameter was added in 3.2.24 (source: the <a href="https://github.com/vuejs/core/blob/main/changelogs/CHANGELOG-3.1.md" target="_blank" rel="noopener noreferrer">3.1</a> and <a href="https://github.com/vuejs/core/blob/main/changelogs/CHANGELOG-3.2.md" target="_blank" rel="noopener noreferrer">3.2</a> changelogs).

## 5. Typing the Parent Side

With TypeScript, the exposed shape flows to the parent. Using [useTemplateRef](/interview-question/what-is-usetemplateref-vue-3-5-and-how-does-it-improve-on-ref) (Vue 3.5), \`vue-tsc\` infers the type from the template, and touching a non-exposed member fails:

\`\`\`
Refs.vue(13,16): error TS2339: Property 'count' does not exist on type 'CreateComponentPublicInstanceWithMixins<ToResolvedProps<{}, {}>, { reset: () => void; }, {}, {}, {}, ComponentOptionsMixin, ComponentOptionsMixin, ... 18 more ..., {}>'.
\`\`\`

Note \`{ reset: () => void; }\` inside the type: that is the exposed API. With a plain \`ref()\`, annotate it yourself: \`const counter = ref<InstanceType<typeof Counter> | null>(null)\`. The broader picture is in [TypeScript with Vue](/interview-question/how-do-you-use-typescript-with-vue-typed-props-emits-refs-vue-tsc).

<svg class="iq-diagram" width="100%" viewBox="0 0 720 270" role="img" aria-label="Inside the child are private refs and functions, defineExpose lists a few, and the parent template ref sees only those plus built ins">
  <defs>
    <marker id="vdx-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="30" width="300" height="210" rx="14"/>
  <text class="d-text" x="180" y="58" text-anchor="middle">SearchField internals</text>
  <rect class="d-box" x="60" y="80" width="240" height="38" rx="8"/>
  <text class="d-sub" x="180" y="104" text-anchor="middle">query, inputEl (private)</text>
  <rect class="d-box-accent" x="60" y="136" width="240" height="38" rx="8"/>
  <text class="d-sub d-accent" x="180" y="160" text-anchor="middle">defineExpose: focus, clear, length</text>
  <rect class="d-box" x="60" y="190" width="240" height="38" rx="8"/>
  <text class="d-sub" x="180" y="214" text-anchor="middle">emits search (data out)</text>
  <rect class="d-box" x="430" y="100" width="260" height="70" rx="14"/>
  <text class="d-text" x="560" y="128" text-anchor="middle">Parent: field.value</text>
  <text class="d-sub" x="560" y="152" text-anchor="middle">focus, clear, length, $el</text>
  <path class="d-edge-accent" d="M 304 155 L 424 140" marker-end="url(#vdx-arrow)"/>
</svg>

Only the exposed members cross the boundary to the parent's ref. Data the parent needs on an ongoing basis still leaves through events, which keeps the exposed API to a handful of commands.

## 6. When to Use It, and When Not

| The parent wants to... | Use |
| :--- | :--- |
| Focus, select, scroll, play, measure | \`defineExpose\` a method |
| Reset or validate a form on submit | \`defineExpose({ reset, validate })\` |
| Open or close a dialog it does not otherwise control | \`defineExpose({ open, close })\`, or a \`v-model:open\` prop |
| Know the current value | \`v-model\` or an event, not a ref read |
| Share state with distant components | [provide/inject](/interview-question/what-are-provide-and-inject) or a store |

📌 **Interview term: Encapsulation** — hiding internals so callers depend only on a deliberate public API, which lets you refactor the inside freely. Why Vue made encapsulation the default for \`<script setup>\` (and how that differs from the Options API, which is open by default) is the subject of [why script setup components are closed by default](/interview-question/what-is-defineexpose-and-why-are-script-setup-components-closed-by-default). How to get the ref in the first place is in [accessing a DOM element or child instance](/interview-question/how-do-you-access-a-dom-element-or-child-component-instance).

## 7. Common Pitfalls

- **Reading the ref before mount.** \`field.value\` is \`null\` during the parent's \`setup\`, and again after the child unmounts (for example behind \`v-if\`). Use it in \`onMounted\`, event handlers, or with optional chaining.
- **Exposing everything "just in case".** \`defineExpose({ ...allState })\` throws away encapsulation; every exposed name becomes a contract you cannot change.
- **Using exposed state as the data channel.** Reading \`child.value.items\` in a parent \`computed\` couples the two; emit events or use \`v-model\`.
- **Calling \`defineExpose\` in a callback or conditionally.** It is only compiled at the top level; elsewhere it is a \`ReferenceError\`, as verified.
- **Calling it twice.** "duplicate defineExpose() call" is a compile error; gather everything into one object.
- **Assuming tests see only the exposed API.** Vue Test Utils' \`wrapper.vm\` reaches internal state anyway (verified in the sibling question), so a test passing does not prove the parent can use a member.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineExpose</code> is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;script setup&gt;</code> compiler macro that declares what a parent can reach through a template ref on the component."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it is needed:</strong> <span style="color:#f0e2c8;">"A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;script setup&gt;</code> component exposes nothing by default, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ref.value.focus</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> until the child lists <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">focus</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineExpose</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. What to expose:</strong> <span style="color:#f0e2c8;">"I expose a small imperative API, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">focus()</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">clear()</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">validate()</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">open()</code>, and keep data flowing through props, events and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-model</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Mechanics:</strong> <span style="color:#f0e2c8;">"It compiles to the setup context <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">expose()</code> call, exposed refs and computeds are unwrapped for the parent, and the ref is only usable after mount."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Rules and types:</strong> <span style="color:#f0e2c8;">"It must be called once at the top level, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineOptions</code> cannot declare expose, and with TypeScript the parent ref is typed so non-exposed members are compile errors."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is my child ref method <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">undefined</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because the child is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;script setup&gt;</code> component and did not list that method in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineExpose</code>. Verified: a parent saw <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reset</code> as a function but <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">count</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">step</code> as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does the parent get a ref or a value when I expose a ref?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A value. The exposed object is wrapped so refs are unwrapped on access. Verified: an exposed computed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">length</code> read as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">3</code> and then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0</code>, a plain number each time.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you do the same without <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&lt;script setup&gt;</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setup(props, { expose })</code> call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">expose({ reset })</code> yourself. In the Options API use the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">expose: ["reset"]</code> option. Both produced the same restricted public instance in the verified examples.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you call <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">defineExpose</code> inside <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">onMounted</code> to expose something later?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. The macro is only compiled at the top level; inside a callback it becomes a call to an undefined function, and the mounted hook threw <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ReferenceError: defineExpose is not defined</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you avoid exposing methods at all?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the parent really wants state. If it needs the current value or wants to keep the child open or closed, a prop with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-model</code> is clearer and testable without refs.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **\`defineExpose()\`** | Macro listing what a parent can reach on a script setup component |
| **Public instance** | The object a parent gets through a template ref |
| **Imperative API** | Methods a parent calls to make the child act |
| **\`expose()\`** | The setup context function the macro compiles to |
| **\`expose\` option** | Options API list of public member names |
| **Encapsulation** | Hiding internals behind a deliberate public API |

---
**Conclusion:** \`defineExpose\` is how a \`<script setup>\` component puts buttons on its front panel. It compiles to the setup context's \`expose()\` call, exposes only what you list (verified: \`reset\` visible, \`count\` and \`step\` not), unwraps exposed refs and computeds for the parent, and must be called once at the top level. Use it for commands such as \`focus()\`, \`clear()\` and \`validate()\`, read the ref only after mount, let TypeScript check the exposed shape, and keep everyday data flowing through props, events and \`v-model\`.`,
    examples: [
      {
        label: "A search field that exposes focus(), clear() and a length computed to its parent",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { ref, computed, defineComponent, h } from "vue";

// The child keeps its state private and publishes a small imperative API.
// Inside a <script setup> file this would be: defineExpose({ focus, clear, length })
const SearchField = defineComponent({
  emits: ["search"],
  setup(_, { expose, emit }) {
    const query = ref("");
    const inputEl = ref(null);
    const length = computed(() => query.value.length);

    const focus = () => inputEl.value.focus();
    const clear = () => { query.value = ""; focus(); };
    expose({ focus, clear, length });

    return () =>
      h("input", {
        ref: inputEl,
        value: query.value,
        placeholder: "search",
        onInput: (e) => { query.value = e.target.value; emit("search", query.value); },
      });
  },
});

const field = ref(null);
const lastSearch = ref("");
const info = ref("");

function showInfo() {
  // Exposed refs and computeds are unwrapped: length is a plain number here.
  info.value = \`length=\${field.value.length} query=\${field.value.query} focused=\${document.activeElement?.tagName}\`;
}
</script>

<template>
  <SearchField ref="field" @search="(q) => (lastSearch = q)" />
  <button class="focus" @click="field.focus()">focus</button>
  <button class="clear" @click="field.clear()">clear</button>
  <button class="info" @click="showInfo">inspect</button>
  <p>last search event: "{{ lastSearch }}" | {{ info }}</p>
</template>
`,
      },
      {
        label: "Counter.vue with defineExpose and the Parent.vue that calls it",
        tech: "vue",
        runnable: false,
        code: `<!-- Counter.vue -->
<script setup>
import { ref } from "vue";
const count = ref(0);
const step = ref(5);
function reset() { count.value = 0; }
defineExpose({ reset });
</script>
<template><button @click="count += step">{{ count }}</button></template>

<!-- Parent.vue -->
<script setup>
import { ref, onMounted } from "vue";
import Counter from "./Counter.vue";
const counter = ref(null);
const seen = ref("");
onMounted(() => {
  seen.value = \`reset:\${typeof counter.value.reset} count:\${counter.value.count} step:\${counter.value.step}\`;
});
</script>
<template><Counter ref="counter" /><p>{{ seen }}</p></template>
`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is defineExpose() and why are <script setup> components closed by default?",
    seoDescription:
      "Why a <script setup> component hides its state from template refs and $parent, how the compiler closes it in dev and prod, and how defineExpose opens it.",
    description: `**Question presented to candidate:**
"After migrating a component from the Options API to \`<script setup>\`, a parent that used \`this.$refs.editor.content\` started reading \`undefined\`, and a child that used \`this.$parent.save()\` broke too. Explain why \`<script setup>\` components are closed by default, what \`defineExpose()\` changes, and whether you would just expose everything to fix it."

**What a strong answer should cover:**
- An **Options API** component is **open**: its public instance (through template refs or \`$parent\`) exposes data, computed and methods. A **\`<script setup>\`** component is **closed**: none of its bindings are visible, only built-ins such as \`$el\` and \`$props\`.
- How it is done: in dev the compiler returns bindings for the template but calls \`expose()\` with no arguments; in production the template is inlined and the bindings never leave the \`setup\` closure.
- \`defineExpose({ ... })\` re-opens a **chosen** part: the exposed object replaces the public instance's own properties, and refs in it are unwrapped.
- **Why closed is the better default**: encapsulation and safe refactoring, no reaching into children or parents, a public API that can be typed, and the same behaviour in dev and prod builds.
- Options API components can opt in to the same model with the \`expose: [...]\` option.
- Exposing everything is the wrong fix; move the data to props/events, \`v-model\`, provide/inject or a store, and expose only commands.

**Clarifying questions expected:**
- "What does the parent actually need from the editor: its content, or the ability to trigger something like save?"
- "Are there tests that rely on reading internal state?"

**Code / implementation expected:** Optional — show the same child open, closed and exposing a single method, or describe the compiled output.`,
    answer: `**Target Audience:** Vue developers who know template refs and are moving from the Options API to \`<script setup>\`. For the day-to-day usage of the macro itself, see the sibling question [What is defineExpose?](/interview-question/what-is-defineexpose).
**Difficulty:** Medium

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. The runtime output was produced on Vue 3.5.44 with the repo verifier (compiled and mounted in jsdom), with a second harness that compiles the way the Vite dev server does, and with Vitest and Vue Test Utils. Compiler output comes from <code>@vue/compiler-sfc</code> 3.5.44.

## 1. Why This Even Matters — A Story First

In an open-plan office, anyone can walk to your desk, open your drawers and read your notes. It feels fast at first: no meetings, just grab what you need. Then you reorganise your drawers, and three colleagues' workflows break, because they had been quietly depending on where you kept things. You never promised them anything, but they built on it anyway.

A company that switches to an "ask at the front desk" policy is not being unfriendly. It is turning hidden dependencies into explicit requests. You can rearrange your desk whenever you like, as long as the front desk still answers the same questions.

The Options API was the open-plan office: a parent with a template ref, or a child using \`$parent\`, could read and call **anything** on the other component. \`<script setup>\` components are the front-desk policy. They are **closed by default**, and \`defineExpose()\` is the list of questions the front desk will answer.

## 2. The Core Idea

📌 **Interview term: Public instance** — the object other code gets when it reaches a component from outside: \`childRef.value\` from a template ref, \`this.$parent\` from a child, \`this.$root\`. It always has built-ins such as \`$el\`, \`$props\` and \`$emit\`.

📌 **Interview term: Open component** — a component whose public instance also exposes its own state and methods. Options API components are open: \`data\`, \`computed\`, \`methods\` and returned \`setup()\` bindings are all reachable.

📌 **Interview term: Closed component** — a component whose public instance exposes only built-ins plus whatever it explicitly lists. A \`<script setup>\` component is closed by default, and \`defineExpose({ ... })\` is the explicit list.

The Vue docs state the rule directly: components using \`<script setup>\` are closed by default, so the public instance retrieved via template refs or \`$parent\` chains does not expose bindings declared inside \`<script setup>\` (source: <a href="https://vuejs.org/api/sfc-script-setup.html#defineexpose" target="_blank" rel="noopener noreferrer">vuejs.org, script setup: defineExpose</a>).

## 3. Verified: Open, Closed and Exposing, Side by Side

The runnable example (first example below) renders three children and inspects them through template refs:

1. \`OpenChild\`, an Options API component with \`data\` and \`methods\`.
2. \`ClosedChild\`, written the way \`<script setup>\` compiles in dev: it returns \`count\` and \`reset\` for its own render, then calls \`expose()\` with no arguments.
3. \`ExposingChild\`, which calls \`expose({ reset, count })\`, as \`defineExpose\` would.

Verifier output after clicking "inspect children", then "reset exposing child":

\`\`\`
inspect: open: count=1 reset=function / closed: count=undefined reset=undefined $el=SPAN / exposing: count=3 secret=undefined keys=reset,count
after reset: open 1 | closed 2 | exposing 0 ...
\`\`\`

- **Open**: the parent read \`count\` and could call \`reset\`.
- **Closed**: \`count\` and \`reset\` were \`undefined\` even though the child's own render used them (it shows \`closed 2\`). Built-ins remained: \`$el\` was the \`SPAN\`.
- **Exposing**: only \`reset\` and \`count\` were present (\`keys=reset,count\`), \`secret\` stayed hidden, \`count\` arrived as the plain number \`3\` (unwrapped), and calling \`reset()\` through the ref changed the child to \`exposing 0\`.

The same holds in the other direction. A child reading \`$parent\` of a \`<script setup>\` parent:

\`\`\`
child reads $parent.secret: undefined | $parent.helper: undefined | $parent.$el exists: true
\`\`\`

That line was identical when the parent was compiled the production way (template inlined) and the dev-server way (template separate). \`$parent\` reach-ins are blocked too, not just template refs.

## 4. How the Compiler Closes It

The interesting part for an interview is that \`<script setup>\` is closed by **two different mechanisms**, depending on how it is compiled. \`@vitejs/plugin-vue\` inlines the template only when there is no dev server and no devtools build (its \`isUseInlineTemplate\` check in 6.0.10), so both shapes ship in real projects.

**Dev mode (template compiled separately, as the Vite dev server does).** The template needs the bindings, so setup returns them, but the compiler adds an \`expose()\` call with no arguments first. With \`@vue/compiler-sfc\` 3.5.44 and no \`defineExpose\`:

\`\`\`js
setup(__props, { expose: __expose }) {
  __expose();
const count = ref(0)
function reset() { count.value = 0 }
const __returned__ = { count, reset, ref }
\`\`\`

With \`defineExpose({ reset })\` the bare \`__expose()\` is replaced by \`__expose({ reset })\`.

**Production mode (template inlined, as \`vite build\` does).** The render function is created inside \`setup\`, so the bindings are ordinary local variables captured by a closure, and nothing is returned at all:

\`\`\`js
setup(__props) {
const count = ref(0)
function reset() { count.value = 0 }
\`\`\`

There is no object to expose in the first place, so the component is closed by construction.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="In dev the bindings are returned but expose is called empty, in production the bindings stay in the setup closure, and in both cases the public instance shows only built ins and exposed members">
  <defs>
    <marker id="vdc-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="30" width="300" height="100" rx="14"/>
  <text class="d-text" x="180" y="60" text-anchor="middle">Dev compile</text>
  <text class="d-sub" x="180" y="86" text-anchor="middle">bindings returned to template</text>
  <text class="d-sub" x="180" y="108" text-anchor="middle">expose called with nothing</text>
  <rect class="d-box-muted" x="390" y="30" width="300" height="100" rx="14"/>
  <text class="d-text" x="540" y="60" text-anchor="middle">Production compile</text>
  <text class="d-sub" x="540" y="86" text-anchor="middle">render function inside setup</text>
  <text class="d-sub" x="540" y="108" text-anchor="middle">bindings stay in the closure</text>
  <rect class="d-box-accent" x="210" y="200" width="300" height="70" rx="14"/>
  <text class="d-text d-accent" x="360" y="228" text-anchor="middle">Public instance</text>
  <text class="d-sub" x="360" y="252" text-anchor="middle">built ins plus defineExpose list</text>
  <path class="d-edge" d="M 180 134 L 300 194" marker-end="url(#vdc-arrow)"/>
  <path class="d-edge" d="M 540 134 L 420 194" marker-end="url(#vdc-arrow)"/>
</svg>

Two compile paths, one observable result. That consistency is a practical benefit of the closed default: if \`<script setup>\` were open, a parent reading \`child.count\` would work against the dev server, where bindings are returned, and have nothing to read in a production build, where they are closure variables. (That dev/prod split is real: the same dev-versus-production difference is what silently broke dynamic string refs before Vue 3.5, verified in [useTemplateRef](/interview-question/what-is-usetemplateref-vue-3-5-and-how-does-it-improve-on-ref).)

📌 **Interview term: Inline template mode** — the production compile where \`<script setup>\` and its template become one \`setup()\` function returning a render function. It is smaller and faster because template expressions read local variables directly instead of going through a proxy.

## 5. Why Closed Is the Better Default

| Reason | What it means in practice |
| :--- | :--- |
| Encapsulation | Internal refs and helpers can be renamed or removed without breaking any parent |
| Explicit contracts | The exposed list is the component's imperative API, reviewable in one line |
| Type safety | The parent's ref type contains only the exposed members, so misuse is a compile error |
| Discourages reach-ins | \`$parent.save()\` and \`$refs.child.internalState\` no longer work silently |
| Same in dev and prod | Nobody can come to depend on dev-only access to bindings |

📌 **Interview term: Reach-in** — code that reads or calls another component's internals through \`$refs\`, \`$parent\` or \`$root\` instead of using props, events or an injected API. It was common in Vue 2 code and is the main thing that breaks when migrating to \`<script setup>\`.

Options API components can adopt the same model: \`expose: ["reset"]\` makes them closed except for \`reset\`. Verified on 3.5.44, such a component returned the keys \`[ 'reset' ]\` and \`count\` was \`undefined\`.

## 6. Verified: What Closed Does Not Cover

The second example is a Vitest file for two real SFCs: a \`Counter.vue\` that calls \`defineExpose({ reset })\`, and a \`Parent.vue\` that inspects it through a ref.

\`\`\`
parent saw -> reset:function count:undefined step:undefined
wrapper.vm.count -> 5 | wrapper.vm.step -> 5
\`\`\`

The parent saw only \`reset\`. But **Vue Test Utils' \`wrapper.vm\` read \`count\` and \`step\` directly**, because it deliberately reaches into the component's internal setup state for testing. So:

- "Closed" is an API boundary for application code, not a security boundary. Test utilities, as verified here, can still see internals.
- A test that passes by reading \`wrapper.vm.someRef\` does not prove a parent component can use \`someRef\`. Test through the DOM or the exposed API instead (see [testing Vue components](/interview-question/how-do-you-test-vue-components-vitest-and-vue-test-utils)).

## 7. Fixing the Migration from the Question

The parent read \`this.$refs.editor.content\` and a child called \`this.$parent.save()\`. Exposing everything would make both work again, and would also bring back every hidden dependency. Better fixes:

| Old reach-in | Replace with |
| :--- | :--- |
| Parent reads \`editor.content\` | \`v-model="content"\` on the editor ([v-model on components](/interview-question/how-does-v-model-work-on-components)) |
| Child calls \`$parent.save()\` | Child emits \`save\`, parent listens with \`@save\` |
| Deep child calls an ancestor's method | Ancestor provides \`{ save }\` with [provide/inject](/interview-question/what-are-provide-and-inject) |
| Parent must trigger \`focus()\` or \`reset()\` | \`defineExpose({ focus, reset })\` and nothing more |

## 8. Common Pitfalls

- **"Fixing" migrations with \`defineExpose({ ...everything })\`.** It recreates the open component and its coupling; expose commands, move data to props and events.
- **Expecting \`$parent\` to work across a \`<script setup>\` boundary.** It returns the closed public instance; as verified, \`$parent.secret\` and \`$parent.helper\` were \`undefined\`.
- **Relying on dev-server behaviour.** Bindings are returned to the template in dev; production does not even have that object. Only exposed members are a stable API.
- **Treating closed as security.** Vue Test Utils read internals in the verified test, and anything shipped to the browser is readable anyway; never put secrets in component state and assume they are hidden.
- **Forgetting built-ins are still public.** Verified on a closed child: \`$el\`, \`$props\`, \`$attrs\`, \`$slots\`, \`$parent\`, \`$data\` and \`$options\` were objects and \`$emit\` a function. They remain reachable, so a parent can still couple itself to the child's root element. Prefer exposing a method like \`focus()\` over letting parents query \`$el\`.
- **Mixing a normal \`<script>\` export with \`<script setup>\` and expecting it to be public.** Options declared in a normal \`<script>\` block (such as \`name\`) configure the component; they do not expose \`<script setup>\` bindings.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The rule:</strong> <span style="color:#f0e2c8;">"Options API components are open, so a template ref or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$parent</code> sees their data and methods; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;script setup&gt;</code> components are closed and expose only built-ins like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$el</code> until you call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineExpose</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Mechanism:</strong> <span style="color:#f0e2c8;">"In dev the compiler returns bindings for the template but calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">expose()</code> with no arguments, and in production the template is inlined so the bindings never leave the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setup</code> closure."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. defineExpose:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineExpose({ focus, reset })</code> publishes exactly that list, with refs unwrapped, and the parent ref is typed to it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Why:</strong> <span style="color:#f0e2c8;">"It gives encapsulation and safe refactoring, kills <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$parent</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$refs</code> reach-ins, makes the imperative API explicit and typed, and behaves the same in dev and prod."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Migration advice:</strong> <span style="color:#f0e2c8;">"When something breaks after migrating, I replace reads with props, events or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-model</code>, and only expose genuine commands rather than everything."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is still visible on a closed component?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The built-ins of the public instance, such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$el</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$props</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$attrs</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$emit</code>. Verified: on a closed child <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">count</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reset</code> were <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$el</code> was the root <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SPAN</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can an Options API component be closed too?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, with the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">expose</code> option, for example <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">expose: ["reset"]</code>. Verified on 3.5.44: the parent saw only the key <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reset</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">count</code> was <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">If the component is closed, how did my test read its state?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Vue Test Utils <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">wrapper.vm</code> intentionally reaches into setup state. Verified: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">wrapper.vm.count</code> was <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">5</code> while a real parent saw <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code>. Closed is an application API boundary, not a security one.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just make <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&lt;script setup&gt;</code> open like the Options API?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Encapsulation and consistency. Production builds inline the template, so bindings are closure variables with nothing to expose, while dev returns them. An open default would let code work in dev and have nothing to read in production.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does closing affect <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">$parent</code> as well as template refs?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. Both return the same public instance. Verified: a child reading <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$parent.secret</code> of a script setup parent got <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> in both dev-style and production-style compiles.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Public instance** | What a template ref, \`$parent\` or \`$root\` gives you |
| **Open component** | Public instance exposes its state and methods (Options API default) |
| **Closed component** | Public instance exposes only built-ins and an explicit list (script setup default) |
| **\`defineExpose()\`** | Macro that publishes a chosen list of members |
| **Inline template mode** | Production compile with the render function inside \`setup\` |
| **Reach-in** | Reading or calling another component's internals through refs or \`$parent\` |

---
**Conclusion:** A \`<script setup>\` component is closed by default because its public instance, reached through template refs or \`$parent\`, exposes only built-ins until \`defineExpose\` lists more. The compiler gets there two ways, verified with \`@vue/compiler-sfc\` 3.5.44: an empty \`expose()\` call in dev, and bindings that never leave the \`setup\` closure in the inlined production build, with the same observable result in both. The payoff is encapsulation, explicit and typed imperative APIs, no \`$parent\` reach-ins and no dev-only behaviour. Test utilities can still read internals, so treat it as an API boundary, and fix migrations with props, events and \`v-model\` rather than exposing everything.`,
    examples: [
      {
        label: "Open (Options API), closed (script setup style) and exposing children side by side",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { ref, defineComponent, h } from "vue";

// 1. Options API: open by default. The parent sees everything on "this".
const OpenChild = defineComponent({
  data: () => ({ count: 1 }),
  methods: { reset() { this.count = 0; } },
  render() { return h("span", \`open \${this.count} | \`); },
});

// 2. What <script setup> compiles to in dev mode: bindings are returned
//    for the template, then expose() is called with no arguments.
const ClosedChild = defineComponent({
  setup(_, { expose }) {
    expose();
    const count = ref(2);
    const reset = () => (count.value = 0);
    return { count, reset };
  },
  render() { return h("span", \`closed \${this.count} | \`); },
});

// 3. The same child, opting in to one method and one ref (what defineExpose does).
const ExposingChild = defineComponent({
  setup(_, { expose }) {
    const count = ref(3);
    const secret = ref("internal");
    const reset = () => (count.value = 0);
    expose({ reset, count });
    return { count, secret, reset };
  },
  render() { return h("span", \`exposing \${this.count}\`); },
});

const open = ref(null);
const closed = ref(null);
const exposing = ref(null);
const report = ref("");

function inspect() {
  report.value = [
    \`open: count=\${open.value.count} reset=\${typeof open.value.reset}\`,
    \`closed: count=\${closed.value.count} reset=\${typeof closed.value.reset} $el=\${closed.value.$el.tagName}\`,
    \`exposing: count=\${exposing.value.count} secret=\${exposing.value.secret} keys=\${Object.keys(exposing.value)}\`,
  ].join(" / ");
}
</script>

<template>
  <OpenChild ref="open" />
  <ClosedChild ref="closed" />
  <ExposingChild ref="exposing" />
  <p>
    <button class="inspect" @click="inspect">inspect children</button>
    <button class="reset" @click="exposing.reset()">reset exposing child</button>
  </p>
  <p class="report">{{ report }}</p>
</template>
`,
      },
      {
        label: "Vitest: the parent sees only the exposed API, but wrapper.vm sees everything",
        tech: "js",
        runnable: false,
        code: `import { mount } from "@vue/test-utils";
import { test, expect } from "vitest";
import Parent from "./Parent.vue";
import Counter from "./Counter.vue";

test("parent sees only the exposed API", async () => {
  const w = mount(Parent);
  await w.vm.$nextTick();
  console.log("parent saw ->", w.find("p").text());
});

test("Vue Test Utils reaches past defineExpose", async () => {
  const w = mount(Counter);
  await w.find("button").trigger("click");
  console.log("wrapper.vm.count ->", w.vm.count, "| wrapper.vm.step ->", w.vm.step);
  expect(w.vm.count).toBe(5);
});
`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you access a DOM element or child component instance?",
    seoDescription:
      "Template refs give Vue code a DOM element or a child component instance: ref timing, v-if and v-for refs, function refs, $el and useTemplateRef.",
    description: `**Question presented to candidate:**
"You need to focus an input when a page opens, measure a chart container for a third-party library, and call \`reset()\` on a child form component. How do you get hold of the DOM element and the child component in Vue 3, and when are they actually available?"

**What a strong answer should cover:**
- **Template refs**: put \`ref="name"\` on an element or component; in \`<script setup>\` read it through a matching \`ref(null)\` or, since Vue 3.5, \`useTemplateRef("name")\`; in the Options API through \`this.$refs.name\`.
- **Timing**: the ref is \`null\` during \`setup\` and the first render, filled before \`onMounted\` runs, and set back to \`null\` when the element unmounts (for example behind \`v-if\`), with the DOM change applied after \`nextTick\`.
- On a **component**, the ref holds the child's **public instance**, not a DOM node: a \`<script setup>\` child shows only what it lists in \`defineExpose\`, plus built-ins such as \`$el\`.
- **\`v-for\` refs** collect an **array** (order not guaranteed to match the source), and **function refs** (\`:ref="el => ..."\`) give full control but are called on every update.
- Prefer declarative tools first; use refs for focus, measurement, scrolling, media and third-party libraries.
- \`$el\` on a multi-root component is a placeholder text node, so expose a method or ref the real element instead.

**Clarifying questions expected:**
- "Is the element always rendered, or is it behind a \`v-if\` or a \`v-for\`?"
- "Is the child component a \`<script setup>\` component, and does it expose \`reset\`?"

**Code / implementation expected:** Yes — an element ref used in \`onMounted\`, and a component ref calling an exposed method.`,
    answer: `**Target Audience:** Anyone preparing for a Vue interview. Assumes you know \`ref()\` and lifecycle hooks at a basic level.
**Difficulty:** Medium

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. All output in the "Verified" sections was produced on Vue 3.5.44 with the repo verifier (compiled and mounted in jsdom) and with Vitest and Vue Test Utils. Real browser layout (sizes from <code>getBoundingClientRect</code>) cannot be measured in jsdom, so measurement is described, not quoted.

## 1. Why This Even Matters — A Story First

A theatre director works from a script. She never walks on stage to move an actor by the shoulders; she writes "Hamlet crosses to the window" and the actors make it happen. That is how a Vue template works: you describe what the page should look like, and Vue moves the DOM for you.

But every production has a few moments the script cannot express: "when the curtain rises, the spotlight operator points the light *at this exact actor*". For that, the operator needs a name tag on the actor so he can find the right one in the dark.

A **template ref** is the name tag. You write \`ref="search"\` on an element, and your code can find that real DOM node to call \`focus()\`, measure it, or hand it to a charting library. On a child component the same name tag gives you the component itself, so you can call a method such as \`reset()\`.

The interview traps are all about **timing** (the tag exists only while the actor is on stage) and about **what you get back** (an element, an array, or a deliberately limited component instance).

## 2. The Core Idea

📌 **Interview term: Template ref** — a \`ref\` attribute in the template that asks Vue to give your code a reference to the rendered element or component instance once it exists.

📌 **Interview term: Element ref** — a template ref on a native element; its value is the DOM node itself, for example an \`HTMLInputElement\`.

📌 **Interview term: Component ref** — a template ref on a child component; its value is the child's **public instance**. For a \`<script setup>\` child that means only what it lists in [defineExpose](/interview-question/what-is-defineexpose), plus built-ins such as \`$el\`.

Three ways to read a ref, depending on API style and version:

| Style | Template | Script |
| :--- | :--- | :--- |
| \`<script setup>\`, Vue 3.5+ | \`ref="search"\` | \`const search = useTemplateRef("search")\` |
| \`<script setup>\`, any 3.x | \`ref="search"\` | \`const search = ref(null)\` (variable name must match) |
| Options API | \`ref="search"\` | \`this.$refs.search\` |
| Any style, full control | \`:ref="(el) => (search = el)"\` | a function called with the element or \`null\` |

The 3.5 helper is the modern default and fixes real problems with name matching; the details and the trade-offs are the subject of [useTemplateRef()](/interview-question/what-is-usetemplateref-vue-3-5-and-how-does-it-improve-on-ref). This doc focuses on what every style shares: timing, arrays, components and functions.

## 3. Timing: When Is the Ref Filled?

<svg class="iq-diagram" width="100%" viewBox="0 0 720 150" role="img" aria-label="Timeline of a template ref: null in setup, set before onMounted, null again after the element unmounts">
  <defs>
    <marker id="vrf-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <path class="d-edge" d="M 40 120 L 680 120" marker-end="url(#vrf-arrow)"/>
  <rect class="d-box-muted" x="40" y="40" width="140" height="56" rx="10"/>
  <text class="d-text" x="110" y="64" text-anchor="middle">setup</text>
  <text class="d-sub" x="110" y="84" text-anchor="middle">ref is null</text>
  <rect class="d-box" x="210" y="40" width="140" height="56" rx="10"/>
  <text class="d-text" x="280" y="64" text-anchor="middle">first render</text>
  <text class="d-sub" x="280" y="84" text-anchor="middle">DOM created</text>
  <rect class="d-box-accent" x="380" y="40" width="140" height="56" rx="10"/>
  <text class="d-text d-accent" x="450" y="64" text-anchor="middle">onMounted</text>
  <text class="d-sub" x="450" y="84" text-anchor="middle">ref is the element</text>
  <rect class="d-box-muted" x="550" y="40" width="140" height="56" rx="10"/>
  <text class="d-text" x="620" y="64" text-anchor="middle">v-if false</text>
  <text class="d-sub" x="620" y="84" text-anchor="middle">null after nextTick</text>
</svg>

Vue sets template refs in a job that runs after the render is patched into the DOM and before \`mounted\` hooks, so \`onMounted\` is the first safe place to read them. When the element is removed, Vue sets the ref back to \`null\`.

## 4. Verified: Elements, Components, Lists and v-if

The runnable example (first example below) puts an element ref, a component ref, a \`v-for\` ref and a \`v-if\` ref on one page and logs at each step. Verifier output, then the driver clicked the child counter twice, clicked "reset child" and clicked "hide box":

\`\`\`
setup: input.value = null
mounted: input is INPUT
mounted: counter exposes [ 'reset' ]
mounted: itemEls a,b,c
focused: true
after 2 clicks: clicked 2
after reset: clicked 0
right after show = false, box is P
after nextTick, box is null
\`\`\`

1. **\`null\` in setup.** The element does not exist yet.
2. **Filled by \`onMounted\`.** The input ref was the \`INPUT\` and \`focus()\` worked (\`focused: true\`).
3. **A component ref is the public instance.** The child exposes only \`reset\`, so that is the only key; calling \`counter.reset()\` from the parent template reset it from 2 to 0.
4. **\`v-for\` gives an array.** \`ref="itemEls"\` inside the loop filled \`itemEls.value\` with three \`<li>\` elements. The Vue docs warn that this array is **not guaranteed** to be in the same order as the source array (source: <a href="https://vuejs.org/guide/essentials/template-refs.html#refs-inside-v-for" target="_blank" rel="noopener noreferrer">vuejs.org, Refs inside v-for</a>), so match elements by a \`data-id\` if order matters.
5. **\`v-if\` clears the ref, after the DOM update.** Right after \`show.value = false\` the ref still pointed at the old \`<p>\`; after \`await nextTick()\` it was \`null\`. See [nextTick](/interview-question/what-is-nexttick-in-vue).

The second example is the Options API version with \`this.$refs\`, mounted with Vue Test Utils:

\`\`\`
input=INPUT rows=3 focused=true
\`\`\`

Same rules: \`$refs.input\` is the element, and a \`ref\` inside \`v-for\` becomes an array (\`rows=3\`).

## 5. Verified: Function Refs and $el

📌 **Interview term: Function ref** — \`:ref="fn"\` with a function instead of a name. Vue calls it with the element (or component instance) when it is set, and with \`null\` when it is removed. It is the most flexible form: you can store refs in a \`Map\` keyed by id, or forward them somewhere.

The cost: it is called **on every update** of that element, not just once. Counting calls for a stable function and an inline arrow over a mount and three re-renders:

\`\`\`
after mount: stable=1 inline=1
after 3 re-renders: stable=4 inline=4
\`\`\`

Both forms ran on every re-render. Keep function refs cheap and idempotent (assign, do not re-initialise a chart).

📌 **Interview term: \`$el\`** — the root DOM node of a component instance, available on every public instance, even a closed one. It is reliable only for **single-root** components:

\`\`\`
multi-root $el: text node "" | single-root $el: SECTION
\`\`\`

For a component that renders two roots, \`$el\` is an empty placeholder text node. Do not reach for \`$el\` to find a child's input; have the child expose a \`focus()\` method or the element itself.

## 6. Which Tool, When

| You need to... | Use |
| :--- | :--- |
| Focus or select an input on open | Element ref + \`onMounted\`, or an \`autofocus\` [custom directive](/interview-question/how-do-you-create-a-custom-directive-in-vue) |
| Measure size or position | Element ref, read in \`onMounted\` or after \`nextTick\`; for live changes a \`ResizeObserver\` |
| Give a DOM node to a chart or map library | Element ref in \`onMounted\`, destroy in \`onUnmounted\` |
| Call \`reset()\` or \`validate()\` on a child | Component ref + \`defineExpose\` on the child |
| Read a child's current value | Not a ref: use \`v-model\` or an event |
| Refs for many items | \`v-for\` ref (array) or a function ref into a \`Map\` |

📌 **Interview term: Escape hatch** — an API that steps outside the declarative model for cases it cannot express. Template refs are Vue's main DOM escape hatch, and the [lifecycle hooks](/interview-question/what-are-vue-lifecycle-hooks) decide when they are usable. Why component refs show so little by default is covered in [why script setup components are closed](/interview-question/what-is-defineexpose-and-why-are-script-setup-components-closed-by-default).

The same idea in other frameworks: React's \`useRef\` (see [the useRef hook](/interview-question/describe-the-useref-hook-and-its-typical-use-cases)) and Angular's \`viewChild()\` queries (see [ViewChild and ContentChild](/interview-question/what-are-viewchild-and-contentchild)).

## 7. Common Pitfalls

- **Reading the ref in \`setup\` or in a template expression on first render.** It is \`null\` until mounted, as verified. Use \`onMounted\`, an event handler, or optional chaining.
- **Forgetting \`v-if\` can null it.** A ref behind \`v-if\` becomes \`null\` when hidden; check before calling methods, and wait for \`nextTick\` after showing it again.
- **Assuming \`v-for\` ref order.** The array is not guaranteed to follow the source order; key it yourself if you need to find a specific item.
- **Heavy work in function refs.** They run on every update (four calls for four renders above).
- **Expecting a \`<script setup>\` child to show its state.** A component ref shows only \`defineExpose\` members and built-ins; \`undefined\` is the closed default, not a bug.
- **Using \`$el\` on a multi-root child.** It is a placeholder text node; ask the child to expose what you need.
- **Directly mutating DOM that Vue renders.** Changing \`textContent\` or classes by hand gets overwritten on the next render. Change state instead, and keep refs for things Vue does not manage (focus, scroll, measurement, third-party widgets).

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Mechanism:</strong> <span style="color:#f0e2c8;">"I put a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ref</code> attribute on the element or component, and read it in script through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useTemplateRef()</code> in Vue 3.5, a matching <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ref(null)</code> before that, or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">this.$refs</code> in the Options API."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Timing:</strong> <span style="color:#f0e2c8;">"It is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> during setup and the first render, filled before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onMounted</code>, and back to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> when the element unmounts, applied after <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nextTick</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Components:</strong> <span style="color:#f0e2c8;">"On a component the ref is its public instance, and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;script setup&gt;</code> child is closed, so I can only call what it lists in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineExpose</code>, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reset()</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Lists and functions:</strong> <span style="color:#f0e2c8;">"Inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-for</code> the ref becomes an array whose order is not guaranteed, and a function ref gives full control but runs on every update."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Judgement:</strong> <span style="color:#f0e2c8;">"I use refs for focus, measurement, scrolling and third-party libraries, and use props, events and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-model</code> for data."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is my ref <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">null</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Either you read it before mount, such as in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setup</code> or in a template expression on first render, or the element is behind a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-if</code> that is false. Read it in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onMounted</code> or a handler, and after showing it again wait for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nextTick</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What do you get from a ref on a child component?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Its public instance, not a DOM node. For a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;script setup&gt;</code> child that is only the exposed members plus built-ins such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$el</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$props</code>. Verified: the only key on the child was <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reset</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you collect refs for items in a list?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ref="items"</code> inside the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-for</code> to get an array, or a function ref that stores each element in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> by id. The array order is not guaranteed to match the data, so the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> is safer when you need a specific item.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">$el</code> not what you expect?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For components with several root nodes. Verified: a two-root component had an empty text node as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$el</code>. Expose a method or the specific element instead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is it fine to change the DOM through a ref?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For things Vue does not control, such as focus, scroll position, media playback or a third-party widget, yes. For content and classes Vue renders, no, because the next render overwrites your change; update state instead.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Template ref** | A \`ref\` attribute that gives code the rendered element or component |
| **Element ref** | Its value is the DOM node |
| **Component ref** | Its value is the child public instance (exposed members and built-ins) |
| **\`v-for\` ref** | An array of elements or instances, order not guaranteed |
| **Function ref** | \`:ref="fn"\`, called with the element or \`null\`, on every update |
| **\`$el\`** | A component root DOM node; a placeholder for multi-root components |
| **Escape hatch** | A way to step outside declarative rendering when you must |

---
**Conclusion:** Template refs are how Vue code reaches a real DOM element or a child component: \`ref="name"\` in the template, read through \`useTemplateRef()\`, a matching \`ref(null)\` or \`this.$refs\`. On 3.5.44 the ref was \`null\` in setup, filled by \`onMounted\`, an array inside \`v-for\`, and \`null\` again after a \`v-if\` hid the element and \`nextTick\` ran. A component ref is the child's public instance, closed to its \`defineExpose\` list, function refs run on every update, and \`$el\` is only meaningful for single-root components. Use refs for focus, measurement and third-party integrations, and keep data flowing through props, events and \`v-model\`.`,
    examples: [
      {
        label: "Element, component, v-for and v-if refs with their timing logged",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { ref, onMounted, nextTick, defineComponent, h } from "vue";

// A child component that exposes one method to its parent.
const Counter = defineComponent({
  setup(_, { expose }) {
    const count = ref(0);
    expose({ reset: () => (count.value = 0) });
    return () => h("button", { class: "counter", onClick: () => count.value++ }, \`clicked \${count.value}\`);
  },
});

const input = ref(null);     // matches ref="input" in the template
const counter = ref(null);   // a component ref: the child public instance
const items = ref(["a", "b", "c"]);
const itemEls = ref([]);     // a ref inside v-for collects an array
const show = ref(true);
const box = ref(null);

console.log("setup: input.value =", input.value);

onMounted(() => {
  console.log("mounted: input is", input.value.tagName);
  console.log("mounted: counter exposes", Object.keys(counter.value));
  console.log("mounted: itemEls", itemEls.value.map((el) => el.textContent).join(","));
  input.value.focus();
  console.log("focused:", document.activeElement === input.value);
});

async function hide() {
  show.value = false;
  console.log("right after show = false, box is", box.value?.tagName);
  await nextTick();
  console.log("after nextTick, box is", box.value);
}
</script>

<template>
  <input ref="input" placeholder="focus me" />
  <Counter ref="counter" />
  <button class="reset" @click="counter.reset()">reset child</button>
  <ul>
    <li v-for="item in items" :key="item" ref="itemEls">{{ item }}</li>
  </ul>
  <p v-if="show" ref="box">box</p>
  <button class="hide" @click="hide">hide box</button>
</template>
`,
      },
      {
        label: "OptionsRefs.vue: the same with this.$refs in the Options API",
        tech: "vue",
        runnable: false,
        code: `<script>
// Options API: every ref="name" in the template lands on this.$refs.
export default {
  data: () => ({ rows: ["a", "b", "c"], log: "" }),
  mounted() {
    this.$refs.input.focus();
    this.log = \`input=\${this.$refs.input.tagName} rows=\${this.$refs.row.length} focused=\${document.activeElement === this.$refs.input}\`;
  },
};
</script>

<template>
  <input ref="input" />
  <p v-for="r in rows" :key="r" ref="row">{{ r }}</p>
  <output>{{ log }}</output>
</template>
`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is useTemplateRef() (Vue 3.5) and how does it improve on ref=\"\"?",
    seoDescription:
      "useTemplateRef() binds template refs by a runtime string key: dynamic refs that survive production builds, refs owned by composables, inferred types.",
    description: `**Question presented to candidate:**
"Vue 3.5 added \`useTemplateRef()\`. Before that we wrote \`const input = ref(null)\` and \`ref="input"\` in the template and it worked. What does \`useTemplateRef()\` actually fix, and would you migrate existing code to it?"

**What a strong answer should cover:**
- \`useTemplateRef("key")\` returns a **readonly shallow ref** that Vue fills with the element or component whose \`ref\` attribute equals \`"key"\`, matched by a **runtime string**, not by variable name.
- The old pattern depended on the **compiler matching a variable name** to the attribute, which breaks for **dynamic refs** (\`:ref="activeKey"\`): it works against the dev server but stays \`null\` in a production build.
- Because only a string is needed, a **composable** can own the template ref (\`useAutofocus("search")\`), and keys need not be valid JavaScript identifiers.
- With Vue language tools, the **type is inferred** from the template: an element ref is typed as that element, a component ref as its exposed instance.
- Behaviour details: it is \`null\` until mount, an array inside \`v-for\`, assigning to it is refused, and a second \`useTemplateRef\` with the same key warns.
- Migration: new code should use it; old static refs keep working, but dynamic string refs and refs created inside composables are worth migrating first.

**Clarifying questions expected:**
- "Are any of our refs dynamic, or created inside composables?"
- "Are we on Vue 3.5 and current Vue language tools?"

**Code / implementation expected:** Yes — \`useTemplateRef\` in a component, ideally inside a small composable, and an example of a dynamic ref key.`,
    answer: `**Target Audience:** Vue developers who already use template refs and want to know what changed in 3.5. The general rules for refs (timing, \`v-for\`, component instances) are in [accessing a DOM element or child component instance](/interview-question/how-do-you-access-a-dom-element-or-child-component-instance).
**Difficulty:** Medium

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. Every output in the "Verified" sections was produced on Vue 3.5.44: with the repo verifier (compiled and mounted in jsdom), with a harness that compiles the way the Vite dev server does, with a real <code>vite build</code> (Vite 8.3.4, @vitejs/plugin-vue 6.0.10) run in jsdom, and with <code>vue-tsc</code> 3.3.13 for types.

## 1. Why This Even Matters — A Story First

A coat check at a theatre used to work like this: you hang your coat on hook number 14, and the attendant writes "14" on a piece of paper and puts it in *your* pocket. It works as long as you are the person who hung the coat. Your friend cannot collect it for you, and if the coat moves to another hook mid-show, the paper in your pocket still says 14.

The new system hands out a **ticket with a name on it**, and the attendant keeps a book: "ticket SEARCH-BOX, current hook: 14". Anyone holding that ticket can collect the coat, the coat can move hooks and the book is updated, and the name can be anything printed on the ticket.

Before Vue 3.5, \`<script setup>\` template refs were the paper in your pocket: the compiler matched a **variable name** in your script to the \`ref\` attribute in the template, at compile time. \`useTemplateRef()\` is the ticket: a **string key** looked up at runtime, so it works for dynamic keys, from composables, and with names that are not valid identifiers.

## 2. The Core Idea

📌 **Interview term: \`useTemplateRef(key)\`** — a Composition API helper added in Vue 3.5 (September 2024; source: the <a href="https://blog.vuejs.org/posts/vue-3-5" target="_blank" rel="noopener noreferrer">Vue 3.5 announcement</a>) that returns a ref Vue fills with the element or component instance whose \`ref\` attribute equals \`key\`.

📌 **Interview term: Name-matched ref** — the pre-3.5 \`<script setup>\` pattern, \`const input = ref(null)\` plus \`ref="input"\`, where the compiler links the attribute to a variable with the **same name**.

📌 **Interview term: Readonly shallow ref** — what \`useTemplateRef\` returns. In the 3.5.44 source it is \`readonly(shallowRef(null))\`: shallow because Vue never needs to make a DOM node deeply reactive, readonly because only Vue should assign it.

\`\`\`html
<script setup>
import { useTemplateRef, onMounted } from "vue";

const input = useTemplateRef("search-box");
onMounted(() => input.value?.focus());
</script>

<template>
  <input ref="search-box" />
</template>
\`\`\`

The variable name (\`input\`) and the key (\`search-box\`) are independent. The key does not even have to be a valid JavaScript identifier.

## 3. What Was Wrong With Name Matching

The compiler can see \`ref="input"\` and a \`const input\` in the same file and wire them together. Compiled with \`@vue/compiler-sfc\` 3.5.44 in production (inline template) mode, the two approaches produce different code:

\`\`\`js
// const input = ref(null) + ref="input": the compiler passes the variable itself
_createElementVNode("input", {
  ref_key: "input",
  ref: input
// const el = useTemplateRef("input") + ref="input": just a string, looked up at runtime
const _hoisted_1 = { ref: "input" }
\`\`\`

Name matching depends on the compiler seeing **both** halves. It cannot help when:

1. **The key is dynamic.** In \`:ref="activeKey"\` the name is only known at runtime, so there is no variable for the compiler to bind.
2. **The ref lives in a composable.** A \`useAutofocus()\` function in another file has no template to be matched against.
3. **The key is not an identifier.** \`ref="search-box"\` can never match a variable.

📌 **Interview term: Inline template mode** — the production compile where the template is turned into a render function **inside** \`setup()\`. \`@vitejs/plugin-vue\` 6.0.10 uses it only when there is no dev server and no devtools build (its \`isUseInlineTemplate\` check), which is why dev and production can behave differently.

## 4. Verified: Dynamic Refs Break in Production Without useTemplateRef

The same component, with \`<input :ref="active" />\` where \`active\` switches between \`"first"\` and \`"second"\`, written two ways and clicked "check", "swap", "check":

\`\`\`
== old: const first = ref(null), second = ref(null) ==
dev-server compile   : initially : first=INPUT second=null
                       after swap: first=null second=INPUT
vite build (prod)    : initially : first=null second=null
                       after swap: first=null second=null

== new: useTemplateRef("first"), useTemplateRef("second") ==
vite build (prod)    : initially : first=INPUT second=null
                       after swap: first=null second=INPUT
\`\`\`

This is the strongest argument for \`useTemplateRef\`, and it is easy to miss. With plain \`ref()\` the dynamic ref **worked against the dev server**, because there the template is compiled separately and Vue can find \`first\` and \`second\` by name on the returned setup state. After \`vite build\`, with the template inlined and nothing returned from \`setup\`, **both refs stayed \`null\`, with no warning**. With \`useTemplateRef\`, the production build behaved exactly like dev, because the lookup is by string on the instance's own refs table, which exists in every mode.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 280" role="img" aria-label="Name matched refs depend on the compile mode, useTemplateRef registers the key on the instance refs table in every mode">
  <defs>
    <marker id="vutr-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="30" width="300" height="90" rx="14"/>
  <text class="d-text" x="180" y="60" text-anchor="middle">ref(null) matched by name</text>
  <text class="d-sub" x="180" y="84" text-anchor="middle">dev: found on setup state</text>
  <text class="d-sub" x="180" y="104" text-anchor="middle">prod: nothing to look up</text>
  <rect class="d-box-accent" x="390" y="30" width="300" height="90" rx="14"/>
  <text class="d-text d-accent" x="540" y="60" text-anchor="middle">useTemplateRef(key)</text>
  <text class="d-sub" x="540" y="84" text-anchor="middle">registers key on instance refs</text>
  <text class="d-sub" x="540" y="104" text-anchor="middle">same in dev and prod</text>
  <rect class="d-box" x="390" y="180" width="300" height="70" rx="14"/>
  <text class="d-text" x="540" y="208" text-anchor="middle">ref attribute value</text>
  <text class="d-sub" x="540" y="230" text-anchor="middle">static or dynamic string</text>
  <path class="d-edge-accent" d="M 540 176 L 540 124" marker-end="url(#vutr-arrow)"/>
</svg>

\`useTemplateRef\` defines a getter and setter for its key on the component's \`refs\` object at setup time. When Vue later sets a template ref with that string, it writes through that property into the shallow ref. Nothing depends on whether the template was inlined.

## 5. Verified: Composables, Readonly, Duplicates and Lists

**A composable can own the ref.** The runnable example (first example below) defines \`useAutofocus(key)\`, which calls \`useTemplateRef(key)\` and focuses it in \`onMounted\`, plus the dynamic swap from section 4. Verifier output:

\`\`\`
initially : focused search: true | first=INPUT second=null
after swap: focused search: true | first=null second=INPUT
\`\`\`

The composable focused \`ref="search-box"\` without the component declaring any variable for it. See [composables](/interview-question/what-are-composables-in-vue).

**Other behaviour, checked on 3.5.44:**

\`\`\`
[Vue warn]: useTemplateRef('input') already exists.
input: INPUT
rows is array: true 3
dup: null
\`\`\`

- **Same key twice warns.** A second \`useTemplateRef("input")\` in one component printed \`useTemplateRef('input') already exists.\` and stayed \`null\`; only the first one is connected.
- **Same variable name as the key is fine.** \`const input = useTemplateRef("input")\` with \`ref="input"\` resolved to the \`INPUT\`.
- **Inside \`v-for\` it is an array**, exactly like name-matched refs (\`rows is array: true 3\`).
- **Assigning is refused.** \`search.value = null\` printed \`[Vue warn] Set operation on key "value" failed: target is readonly.\` and the ref still held the input.
- **It can be watched.** A \`watch(search, ..., { flush: "post" })\` fired once with the \`INPUT\` after mount. See [watch flush timing](/interview-question/watch-vs-watcheffect-flush-timing-and-the-new-watch-options-in-3-5).

## 6. Verified: Types Are Inferred From the Template

With Vue language tools (the 3.5 announcement notes @vue/language-tools 2.1 added support), the ref type is inferred from the element or component that carries the key. \`vue-tsc\` 3.3.13 on the second example:

\`\`\`
Refs.vue(11,15): error TS2339: Property 'notAMethod' does not exist on type 'HTMLInputElement'.
Refs.vue(13,16): error TS2339: Property 'count' does not exist on type 'CreateComponentPublicInstanceWithMixins<ToResolvedProps<{}, {}>, { reset: () => void; }, {}, {}, {}, ComponentOptionsMixin, ComponentOptionsMixin, ... 18 more ..., {}>'.
\`\`\`

\`useTemplateRef("search")\` became \`HTMLInputElement\` with no annotation, and \`useTemplateRef("child")\` became the child's public instance containing only its exposed \`reset\` (see [defineExpose](/interview-question/what-is-defineexpose)). The calls marked "fine" in the example (\`select()\`, \`reset()\`) compiled. With the old pattern you had to write \`ref<HTMLInputElement | null>(null)\` or \`ref<InstanceType<typeof Child> | null>(null)\` yourself. You can still pass an explicit type, \`useTemplateRef<HTMLInputElement>("search")\`, for example when the key is dynamic and cannot be inferred. More in [TypeScript with Vue](/interview-question/how-do-you-use-typescript-with-vue-typed-props-emits-refs-vue-tsc).

## 7. Old vs New

| | \`ref(null)\` + matching name | \`useTemplateRef("key")\` |
| :--- | :--- | :--- |
| Available since | All of Vue 3 | Vue 3.5 |
| Linked by | Compiler, by variable name | Runtime, by string key |
| Dynamic \`:ref\` keys | Works in dev, \`null\` after \`vite build\` (verified) | Works in both |
| Usable inside a composable | Only by passing the ref in and out | Yes, just pass the key |
| Key must be an identifier | Yes | No (\`"search-box"\` works) |
| Type | Annotate by hand | Inferred by language tools |
| Writable by your code | Yes, by accident | No, readonly |
| Inside \`v-for\` | Array | Array |

**Should you migrate?** Static, name-matched refs keep working, and the Vue docs still document them for versions before 3.5. Migrate first where it fixes real risk: any dynamic \`:ref\` string bound to plain refs (verified above to fail silently in production), and refs that composables need. Use \`useTemplateRef\` for all new code.

## 8. Common Pitfalls

- **Testing dynamic refs only against the dev server.** The old pattern passed in dev and stayed \`null\` in the production build. If you keep name-matched refs, never combine them with a dynamic key.
- **Calling it outside setup.** Without a current instance it warns \`useTemplateRef() is called when there is no active component instance to be associated with.\` and is never filled. Call it in \`<script setup>\` or in a composable called from there.
- **Two calls for the same key.** Only the first is connected; the second warns and stays \`null\`. Share one ref instead.
- **Trying to set it.** It is readonly; to point code at a different element, change the \`ref\` attribute's key.
- **Forgetting \`null\`.** It is still \`null\` before mount and after the element unmounts; use optional chaining or \`onMounted\`.
- **Expecting it to unlock a closed child.** On a \`<script setup>\` component it returns the same closed public instance as any ref; only \`defineExpose\` members are visible (see [why script setup components are closed](/interview-question/what-is-defineexpose-and-why-are-script-setup-components-closed-by-default)).

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useTemplateRef("key")</code> is a Vue 3.5 helper that returns a readonly shallow ref filled with the element or component whose <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ref</code> attribute equals that string."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The old limitation:</strong> <span style="color:#f0e2c8;">"Before 3.5 the compiler linked <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ref="input"</code> to a variable with the same name, so dynamic keys, composables and non-identifier names did not fit."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The real bug it fixes:</strong> <span style="color:#f0e2c8;">"A dynamic <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:ref</code> bound to plain refs works against the dev server but stays <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> after <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vite build</code>, because production inlines the template; with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useTemplateRef</code> it behaves the same in both."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Bonus:</strong> <span style="color:#f0e2c8;">"It can live in a composable like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useAutofocus("search")</code>, and Vue language tools infer its type from the template, an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HTMLInputElement</code> or the child exposed instance."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Migration:</strong> <span style="color:#f0e2c8;">"I use it for all new code and migrate dynamic refs and composable refs first; static name-matched refs still work."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did dynamic refs work in dev but not in production?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In dev the template is compiled separately and reads setup state by name, so Vue can find <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">first</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">second</code>. In the production build the template is inlined into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setup</code> and nothing is returned, so there is no state to look a string up in. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useTemplateRef</code> registers its key on the instance refs table, which exists in both modes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can I assign to a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useTemplateRef</code> ref?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, it is readonly. Verified: assigning printed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set operation on key "value" failed: target is readonly.</code> and the element stayed. Change the key in the template instead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if two places call <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useTemplateRef</code> with the same key?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The second call warns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useTemplateRef('input') already exists.</code> and is never filled. Create it once and pass the ref around, or wrap it in a composable that is called once.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is it typed?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With current Vue language tools the type is inferred from the template: an element gives its DOM type and a component gives its public instance with only the exposed members. For dynamic keys you can pass a type argument, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useTemplateRef&lt;HTMLInputElement&gt;(key)</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does it behave differently inside <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">v-for</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Like name-matched refs it holds an array of the elements, verified as an array of three, and the docs note the order is not guaranteed to match the source list.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **\`useTemplateRef(key)\`** | Vue 3.5 helper that binds a template ref by runtime string key |
| **Name-matched ref** | The older pattern linking \`ref="x"\` to a variable named \`x\` at compile time |
| **Readonly shallow ref** | A ref only Vue writes, holding the node without deep reactivity |
| **Dynamic ref** | \`:ref="expr"\` whose key is computed at runtime |
| **Inline template mode** | Production compile with the render function inside \`setup\` |
| **Inferred ref type** | Type taken from the element or component carrying the key |

---
**Conclusion:** \`useTemplateRef()\` replaces compile-time name matching with a runtime string key. On 3.5.44 that mattered most for dynamic refs: plain refs bound to \`:ref="active"\` worked against the dev server and silently stayed \`null\` after a real \`vite build\`, while \`useTemplateRef\` behaved the same in both. The string key also lets composables own refs, allows non-identifier names, and gives Vue language tools what they need to infer an \`HTMLInputElement\` or a child's exposed instance. It is readonly, warns on duplicate keys, is still \`null\` before mount and is an array inside \`v-for\`. Use it for new code and migrate dynamic and composable refs first.`,
    examples: [
      {
        label: "A composable that owns a template ref, plus a dynamic :ref key that swaps targets",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { ref, useTemplateRef, onMounted } from "vue";

// A composable can own a template ref: all it needs is the key string.
function useAutofocus(key) {
  const el = useTemplateRef(key);
  onMounted(() => el.value?.focus());
  return el;
}

const search = useAutofocus("search-box");   // the key does not have to be a valid JS name

// Dynamic refs: the key can change at runtime, and each useTemplateRef follows its own key.
const active = ref("first");
const first = useTemplateRef("first");
const second = useTemplateRef("second");
const report = ref("");

function swap() {
  active.value = active.value === "first" ? "second" : "first";
}
function check() {
  report.value =
    \`focused search: \${document.activeElement === search.value} | \` +
    \`first=\${first.value?.tagName ?? null} second=\${second.value?.tagName ?? null}\`;
}
</script>

<template>
  <input ref="search-box" placeholder="search" />
  <input :ref="active" placeholder="dynamic ref" />
  <button class="swap" @click="swap">swap key</button>
  <button class="check" @click="check">check</button>
  <p>{{ report }}</p>
</template>
`,
      },
      {
        label: "Child.vue and a typed parent: vue-tsc infers each ref from the template",
        tech: "vue",
        runnable: false,
        code: `<!-- Child.vue -->
<script setup lang="ts">
import { ref } from "vue";
const count = ref(0);
function reset() { count.value = 0; }
defineExpose({ reset });
</script>
<template><button @click="count++">{{ count }}</button></template>

<!-- Refs.vue: the parent, checked with vue-tsc -->
<script setup lang="ts">
import { ref, useTemplateRef, onMounted } from "vue";
import Child from "./Child.vue";

const auto = useTemplateRef("search");        // type inferred from the template
const child = useTemplateRef("child");
const manual = ref<HTMLInputElement | null>(null);

onMounted(() => {
  auto.value?.select();                 // fine: auto is HTMLInputElement
  auto.value?.notAMethod();             // error: not on HTMLInputElement
  child.value?.reset();                 // fine: reset is exposed
  child.value?.count;                   // error: count is not exposed
});
</script>
<template>
  <input ref="search" />
  <input ref="manual" />
  <Child ref="child" />
</template>
`,
      },
    ],
  },
];

export default augments;
