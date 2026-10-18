/**
 * Vue ULTRA — batch 04: advanced reactivity escape hatches (shallowRef,
 * shallowReactive, triggerRef, readonly, markRaw, toRaw), effectScope and
 * composable cleanup, v-once and v-memo, :key in v-for, custom directives.
 *
 * Full CLAUDE.md treatment per question, matching the Angular, React and
 * Next.js ultra banks: a plain-language story first, `📌 Interview term:`
 * callouts, Verified sections quoting output that was actually produced, a
 * theme-aware `.iq-diagram` SVG, comparison tables, topic-specific pitfalls,
 * the §7 "How to Answer in an Interview" card, a glossary and a conclusion.
 * Sibling questions (conceptual vs "when to use") take different angles and
 * link to each other.
 *
 * Every "Verified" block was produced on Vue 3.5.44 (Node 22): SFCs with
 * scripts/verify-vue-example.mjs (compiled with @vue/compiler-sfc, mounted in
 * jsdom, dev build so warnings print), reactivity claims with small Node
 * scripts against the same vue package, compiled template output with
 * @vue/compiler-dom and @vue/compiler-ssr compile(), and SSR with
 * @vue/server-renderer. Examples marked runnable are byte-identical to the
 * SFC files that passed the verifier.
 *
 * Conventions: SVG attributes double-quoted, no apostrophes inside SVG blocks,
 * no leading H1, `description` is plain markdown (no HTML).
 */

import type { VueAugment } from "./vue-augments.types";

const augments: VueAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are shallowRef and shallowReactive?",
    seoDescription:
      "shallowRef tracks only .value replacement; shallowReactive tracks only top-level keys. How each works, what stays raw, and verified Vue 3.5 output.",
    description: `**Question presented to candidate:**
"You see \`shallowRef\` and \`shallowReactive\` in a code review. Explain what they do differently from \`ref\` and \`reactive\`, and what happens when someone mutates a nested property on them."

**What a strong answer should cover:**
- \`ref\` and \`reactive\` are **deep**: nested objects are wrapped in proxies on access, so a write at any depth triggers updates.
- \`shallowRef\` tracks only **\`.value\` assignment**; the value itself is stored as-is (not proxied), so nested mutations are invisible.
- \`shallowReactive\` tracks only **its own top-level properties**; nested objects stay raw and **refs are not unwrapped**.
- Assigning the **same object** back to a \`shallowRef\` does not trigger, because Vue compares with \`Object.is\`.
- \`triggerRef()\` forces a \`shallowRef\` update after an in-place mutation; it does nothing for a \`shallowReactive\`.
- Typical uses: large data you replace wholesale, external or immutable state, and holding values that must stay unproxied.

**Clarifying questions expected:**
- "Is the data replaced as a whole, or edited in place?"
- "Is this about rendering performance, or about keeping an external object unproxied?"

**Code / implementation expected:** Yes — a short demo showing a nested mutation that does not re-render and a top-level replacement that does.`,
    answer: `**Target Audience:** Vue developers who know \`ref\` and \`reactive\` and want to understand the shallow variants exactly.
**Difficulty:** Hard

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts with the vocabulary an interviewer listens for. Every console line and render count quoted below was produced by running the code on Vue 3.5.44, either as a Node script against the \`vue\` package or as an SFC mounted in jsdom with the repo verifier. This page explains **what** the shallow APIs do; the sibling question [When should you use shallowRef / shallowReactive / triggerRef?](/interview-question/when-should-you-use-shallowref-shallowreactive-triggerref) covers **when** to reach for them, with a benchmark.

## 1. Why This Even Matters — A Story First

Picture a hotel with a very attentive receptionist. In a normal hotel (that is <code>ref</code> and <code>reactive</code>), the receptionist puts a motion sensor in every room, every drawer and every suitcase. The moment anyone moves a sock, the front desk knows. Wonderful service, but installing ten thousand sensors takes time and wiring.

A **shallow** hotel only puts a sensor on the **front door of each room**. If a guest checks out and a new guest checks in, the desk knows instantly. If the guest rearranges the furniture inside, the desk has no idea, because there is no sensor there.

That is the whole idea. <code>shallowRef</code> and <code>shallowReactive</code> watch the door, not the furniture. The interesting interview questions are all about the consequences: what goes unnoticed, what still works, and how you tell Vue "something inside changed" when you really must.

## 2. Deep Reactivity, the Default

📌 **Interview term: Deep reactivity** — the default behaviour of <code>ref()</code> and <code>reactive()</code>: when you read a nested object through a reactive value, Vue wraps that nested object in its own Proxy on the fly, so reads at any depth are tracked and writes at any depth trigger updates. See [How does Vue's reactivity system work?](/interview-question/how-does-vue-s-reactivity-system-work) for the Proxy mechanics.

📌 **Interview term: Tracking and triggering** — when an effect (a component render, a <code>computed</code>, a <code>watch</code>) reads a reactive property, Vue records "this effect depends on this key". That is **tracking**. When the key is written, Vue re-runs those effects. That is **triggering**.

With deep reactivity you pay for tracking everywhere: every nested object you touch gets a Proxy, and every property you read inside an effect becomes a dependency.

## 3. The Two Shallow APIs

📌 **Interview term: shallowRef** — a ref whose <code>.value</code> is tracked, but whose value is stored **as is**. Vue does not convert it with <code>reactive()</code>. Reading <code>.value</code> is tracked; replacing <code>.value</code> triggers; mutating something inside the value is a plain JavaScript write that nobody hears.

📌 **Interview term: shallowReactive** — a reactive Proxy that tracks only **its own top-level keys**. Nested objects are returned raw, and refs stored in it are **not unwrapped** (unlike <code>reactive()</code>, which unwraps a nested ref so <code>state.r</code> gives you the number).

📌 **Interview term: triggerRef** — <code>triggerRef(shallow)</code> forces every effect that depends on a <code>shallowRef</code> to run, as if <code>.value</code> had been replaced. It is the escape hatch for "I mutated in place on purpose".

<svg class="iq-diagram" width="100%" viewBox="0 0 720 330" role="img" aria-label="ref wraps every nested level in a proxy, shallowRef tracks only the value slot and stores the object raw">
  <defs>
    <marker id="q1sh-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="180" y="30" text-anchor="middle">ref(data): deep</text>
  <rect class="d-box-accent" x="70" y="55" width="220" height="48" rx="10"/>
  <text class="d-text d-accent" x="180" y="84" text-anchor="middle">.value tracked</text>
  <path class="d-edge-accent" d="M 180 107 L 180 143" marker-end="url(#q1sh-arrow)"/>
  <rect class="d-box-accent" x="70" y="150" width="220" height="48" rx="10"/>
  <text class="d-text d-accent" x="180" y="179" text-anchor="middle">Proxy of data</text>
  <path class="d-edge-accent" d="M 180 202 L 180 238" marker-end="url(#q1sh-arrow)"/>
  <rect class="d-box-accent" x="70" y="245" width="220" height="48" rx="10"/>
  <text class="d-text d-accent" x="180" y="274" text-anchor="middle">Proxy of data.user</text>
  <text class="d-text" x="540" y="30" text-anchor="middle">shallowRef(data): shallow</text>
  <rect class="d-box-accent" x="430" y="55" width="220" height="48" rx="10"/>
  <text class="d-text d-accent" x="540" y="84" text-anchor="middle">.value tracked</text>
  <path class="d-edge-dashed" d="M 540 107 L 540 143" marker-end="url(#q1sh-arrow)"/>
  <rect class="d-box-muted" x="430" y="150" width="220" height="48" rx="10"/>
  <text class="d-sub" x="540" y="179" text-anchor="middle">raw data object</text>
  <path class="d-edge-dashed" d="M 540 202 L 540 238" marker-end="url(#q1sh-arrow)"/>
  <rect class="d-box-muted" x="430" y="245" width="220" height="48" rx="10"/>
  <text class="d-sub" x="540" y="274" text-anchor="middle">raw data.user</text>
</svg>

On the left, every level you read through is a Proxy that records reads and reports writes. On the right, only the <code>.value</code> slot is watched; everything below it is the exact object you passed in. <code>shallowReactive</code> looks like the right column one level down: the top-level keys are watched, and their values are raw.

## 4. Side by Side

| | <code>ref</code> | <code>shallowRef</code> | <code>reactive</code> | <code>shallowReactive</code> |
| :--- | :--- | :--- | :--- | :--- |
| What is tracked | <code>.value</code> and every nested key | <code>.value</code> only | Every key at every depth | Top-level keys only |
| Nested objects | Converted with <code>reactive()</code> | Stored raw | Proxied lazily on access | Returned raw |
| <code>isReactive(x.value)</code> / <code>isReactive(x.nested)</code> | <code>true</code> | <code>false</code> | <code>true</code> | <code>false</code> |
| Nested refs | Unwrapped | Not touched | Unwrapped | **Not unwrapped** |
| <code>x.value === original</code> | No (it is a Proxy) | **Yes** | n/a | n/a |
| How to force an update after in-place edits | Not needed | <code>triggerRef(x)</code> | Not needed | Reassign the top-level key |
| Template auto-unwrap | Yes | Yes | n/a | n/a |

## 5. Verified: what each one notices

A Node script ran the same operations against <code>ref</code>, <code>shallowRef</code> and <code>shallowReactive</code>, with a <code>watchEffect</code> logging what it saw after each <code>nextTick</code>:

\`\`\`
isReactive(deep.value): true  isReactive(deep.value.user): true
isReactive(shallow.value): false
after nested mutation: ["deep effect sees Grace tags=2"]
after replacing shallow.value: ["shallow effect sees Grace tags=2"]
after mutate + triggerRef: ["shallow effect sees Linus tags=2"]
isReactive(state): true  isReactive(state.nested): false
state.r is a ref (not unwrapped): true
reactive() unwraps: deepState.r = 5
after state.nested.n++: []
after state.count++: ["count=1 n=1"]
after replacing state.nested: ["count=1 n=42"]
watch(shallowRef,{deep:true}) after nested mutation fired: 0
after .value replace fired: 1
triggerRef(shallowReactive) did not throw
shallowRef(raw).value === raw: true  ref(raw).value === raw: false
isReactive(shallowRef(reactive obj).value): true
\`\`\`

Four details are worth saying out loud in an interview:

1. **The nested write still happened.** After <code>state.nested.n++</code> nothing re-ran, but the next effect run (triggered by <code>count</code>) printed <code>n=1</code>. Shallow does not block writes; it just does not announce them.
2. **<code>{ deep: true }</code> cannot see into a shallowRef.** The watcher fired 0 times for a nested mutation and once for a <code>.value</code> replacement. There is no proxy below <code>.value</code>, so a deep watcher has nothing to subscribe to.
3. **Shallow is about how Vue stores the value, not about the value.** If you put an object that is *already* reactive into a <code>shallowRef</code>, it stays reactive (<code>isReactive(...) = true</code>).
4. **<code>triggerRef</code> on a <code>shallowReactive</code> is silently a no-op.** It did not throw, and a follow-up test showed it re-ran nothing. Use it only on refs.

## 6. Verified in a component: which writes re-render

The runnable example renders three independent cards, each with its own state and a plain render counter. Each card gets one "mutate nested" click, then one "replace top level" click. Output from the verifier:

\`\`\`
mounted:
   ref (deep)      name: Ada | renders: 1
   shallowRef      name: Ada | renders: 1
   shallowReactive name: Ada | renders: 1
after mutate nested (each card once):
   ref (deep)      name: Ada! | renders: 2
   shallowRef      name: Ada | renders: 1
   shallowReactive name: Ada | renders: 1
after replace top level:
   ref (deep)      name: Ada! | renders: 3
   shallowRef      name: Ada! | renders: 2
   shallowReactive name: Ada! | renders: 2
\`\`\`

The shallow cards did not re-render on the nested write and kept showing <code>Ada</code>, but the data underneath was already <code>Ada!</code>. As soon as the top-level replacement caused a render, the hidden change appeared. This is why the cards are separate components: in one shared component, *any* unrelated re-render would also reveal the hidden change, making the shallow state look as if it "sometimes works".

## 7. How They Work Under the Hood

📌 **Interview term: RefImpl** — the class behind <code>ref()</code> and <code>shallowRef()</code>. It holds the raw value plus a converted value. For a deep ref the converted value is <code>reactive(raw)</code>; for a shallow ref (<code>__v_isShallow: true</code>) it is the raw value itself. Setting <code>.value</code> compares old and new with <code>Object.is</code> semantics (Vue calls it <code>hasChanged</code>) and triggers only if they differ.

That comparison explains a classic bug, verified in the sibling question: <code>list.value.push(4); list.value = list.value</code> triggers **nothing**, because the "new" value is the same array. You either assign a new array or call <code>triggerRef</code>.

📌 **Interview term: shallowReactiveHandlers** — <code>shallowReactive</code> uses the same Proxy machinery as <code>reactive</code>, but its <code>get</code> trap returns the nested value without wrapping it and without ref unwrapping. Its <code>set</code> trap still triggers for top-level keys.

Related shallow siblings follow the same rule: <code>shallowReadonly</code> blocks only top-level writes (see [What does readonly do in Vue's reactivity?](/interview-question/what-does-readonly-do-in-vue-s-reactivity)), and component props are themselves a shallow readonly object.

## 8. Common Pitfalls

- **Mutating in place and expecting a re-render.** <code>rows.value[0].price = 10</code> on a <code>shallowRef</code> changes the data but notifies nobody. Replace the array or call <code>triggerRef(rows)</code>.
- **"Fixing" it by assigning the same object back.** <code>x.value = x.value</code> is ignored because the value did not change by identity.
- **Assuming a deep watcher helps.** <code>watch(shallow, cb, { deep: true })</code> did not fire on a nested mutation in the verified run.
- **Forgetting that <code>shallowReactive</code> does not unwrap refs.** <code>state.r</code> is the ref object, so templates and code must use <code>state.r.value</code> where a <code>reactive</code> would have given the number.
- **Calling <code>triggerRef</code> on a <code>shallowReactive</code>.** It silently does nothing; reassign the top-level key instead.
- **Debugging by watching the screen.** A hidden change shows up the moment something else re-renders the same component, which makes shallow bugs look intermittent. Log the effect runs instead.
- **Making a shallowRef "deep" by putting reactive data in it.** That works, but then you pay deep costs again and lose the point. Decide which layer owns reactivity. See [What are common reactivity caveats in Vue?](/interview-question/what-are-common-reactivity-caveats-in-vue).

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shallowRef</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shallowReactive</code> are the shallow versions of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ref</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reactive</code>: Vue tracks only the top level and leaves everything below it as plain objects."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. shallowRef:</strong> <span style="color:#f0e2c8;">"A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shallowRef</code> tracks reads and writes of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.value</code> only. The value is stored as is, not proxied, so mutating something inside it does not trigger anything."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. shallowReactive:</strong> <span style="color:#f0e2c8;">"A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shallowReactive</code> tracks its own top-level keys. Nested objects come back raw, and unlike <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reactive</code> it does not unwrap refs."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Forcing updates:</strong> <span style="color:#f0e2c8;">"To update after an in-place change you replace the top level with a new object, or for a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shallowRef</code> call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">triggerRef</code>. Assigning the same object back does nothing, because Vue compares by identity."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Why they exist:</strong> <span style="color:#f0e2c8;">"They cut the cost of proxies on large data you replace wholesale, and they keep external objects unproxied. The price is that you must treat nested data as immutable."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does a deep watcher see nested changes in a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">shallowRef</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. I verified that <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watch(shallow, cb, { deep: true })</code> fired zero times for a nested mutation and once for a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.value</code> replacement. There are no proxies below <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.value</code>, so there is nothing to subscribe to.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">If the nested write is not tracked, is it lost?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, the write happens on the plain object. It just is not announced. The next render triggered by anything else shows the new value, which is why shallow bugs often look intermittent.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">triggerRef</code> and replacing <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">.value</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Replacing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.value</code> with a new object triggers because the identity changed. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">triggerRef</code> triggers without any change, after you mutated in place. It only works on refs, and on a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shallowReactive</code> it is a silent no-op.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if you put a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">reactive</code> object into a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">shallowRef</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It stays reactive. Shallow only means the ref does not convert the value; it does not strip reactivity that is already there. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isReactive(shallowRef(state).value)</code> is true.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where does Vue itself use shallow reactivity?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Component props are a shallow readonly object: you cannot reassign a prop, but you can mutate inside an object prop. Vue also recommends <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shallowRef</code> for holding components in state, to avoid proxying the component definition.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Deep reactivity** | Default: nested objects become proxies, so writes at any depth trigger |
| **Tracking / triggering** | Recording which effect read a key / re-running those effects on write |
| **shallowRef** | Ref that tracks only <code>.value</code> replacement and stores the value raw |
| **shallowReactive** | Proxy that tracks only top-level keys; nested values raw, refs not unwrapped |
| **triggerRef** | Force effects that depend on a <code>shallowRef</code> to run after an in-place change |
| **RefImpl** | The class behind refs; compares old and new value with <code>hasChanged</code> |
| **shallowReactiveHandlers** | The Proxy handlers that skip nested wrapping and ref unwrapping |

---
**Conclusion:** <code>shallowRef</code> and <code>shallowReactive</code> move the reactivity boundary up to the first level: a <code>shallowRef</code> watches only its <code>.value</code> slot and stores the value untouched, and a <code>shallowReactive</code> watches only its own keys and returns nested objects raw, without unwrapping refs. As verified on Vue 3.5.44, nested writes still happen but nothing re-renders until the top level is replaced or <code>triggerRef</code> is called, and even a deep watcher cannot see below a <code>shallowRef</code>. Knowing exactly where the boundary sits is what lets you use these APIs on purpose, which is the subject of the sibling [when to use](/interview-question/when-should-you-use-shallowref-shallowreactive-triggerref) question.`,
    examples: [
      {
        label: "ref vs shallowRef vs shallowReactive: which writes re-render",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { defineComponent, h, ref, shallowRef, shallowReactive } from "vue";

// Each card is its own component, so a re-render of one card
// cannot "accidentally" refresh another card.
function makeCard(title, create, replace) {
  return defineComponent({
    setup() {
      const state = create();
      let renders = 0;
      const user = () => ("value" in state ? state.value.user : state.user);
      return () => {
        renders++;
        return h("section", { class: "card" }, [
          h("h4", title),
          h("p", { class: "out" }, \`name: \${user().name} | renders: \${renders}\`),
          h("button", { class: "nested", onClick: () => (user().name += "!") }, "mutate nested"),
          h("button", { class: "replace", onClick: () => replace(state) }, "replace top level"),
        ]);
      };
    },
  });
}

const DeepRef = makeCard(
  "ref (deep)",
  () => ref({ user: { name: "Ada" } }),
  (s) => (s.value = { user: { name: s.value.user.name } })
);
const ShallowRefCard = makeCard(
  "shallowRef",
  () => shallowRef({ user: { name: "Ada" } }),
  (s) => (s.value = { user: { name: s.value.user.name } })
);
const ShallowReactiveCard = makeCard(
  "shallowReactive",
  () => shallowReactive({ user: { name: "Ada" } }),
  (s) => (s.user = { name: s.user.name })
);
</script>

<template>
  <p>Click "mutate nested" on each card, then "replace top level".</p>
  <DeepRef />
  <ShallowRefCard />
  <ShallowReactiveCard />
</template>
`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "When should you use shallowRef / shallowReactive / triggerRef?",
    seoDescription:
      "Use shallowRef for big data you replace whole, shallowReactive for flat state, triggerRef after deliberate in-place edits. Verified Vue 3.5 numbers.",
    description: `**Question presented to candidate:**
"Our dashboard loads a 20,000-row report into a \`ref\` and the page stutters. A colleague suggests \`shallowRef\`. When is that the right call, when is it a trap, and where does \`triggerRef\` fit in?"

**What a strong answer should cover:**
- Deep \`ref\`/\`reactive\` creates a Proxy for every nested object you touch and a dependency for every property you read; on large data that cost is real and measurable.
- **\`shallowRef\`** fits data that is **replaced as a whole**: API responses, immutable snapshots, external store state, big read-only lists.
- **\`shallowReactive\`** fits flat state objects whose **top-level keys** change but whose nested values are treated as immutable.
- **\`triggerRef\`** is for deliberate **in-place mutation** of a \`shallowRef\` (for example many edits batched, then one trigger).
- The trap: nested edits silently do not update the UI, and \`computed\` values derived from the data go stale until a trigger.
- Do not use shallow state for deeply edited data such as forms; measure before optimising.

**Clarifying questions expected:**
- "Is the data edited in place by the UI, or replaced from the server?"
- "Have we measured where the time goes: reactivity, rendering, or DOM size?"

**Code / implementation expected:** Yes — load a large list both ways, then show mutate-only vs \`triggerRef\` vs an immutable replacement.`,
    answer: `**Target Audience:** Vue developers making performance or architecture decisions about reactive state.
**Difficulty:** Hard

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. Timings and outputs below come from running the code on Vue 3.5.44 (Node 22, and jsdom for the component). Timings are from one sandbox machine and will differ on yours; the ratios are the point. For the mechanics of the shallow APIs themselves (what is tracked, ref unwrapping, <code>isReactive</code> results) see the sibling [What are shallowRef and shallowReactive?](/interview-question/what-are-shallowref-and-shallowreactive).

## 1. Why This Even Matters — A Story First

A museum receives a shipment of 20,000 postcards. One curator insists on fitting each postcard with its own alarm tag before it goes on the wall, because "what if someone edits a postcard?". Nobody ever edits a postcard. When the collection changes, the museum swaps the entire display case.

The tags are not free: fitting them takes hours, and the tags weigh more than the postcards. A second curator puts one alarm on the display case and says: "when we swap the case, the alarm rings. If we ever need to fix a postcard in place, we ring the alarm by hand."

The first curator is a deep <code>ref</code>. The second is a <code>shallowRef</code>, and "ring the alarm by hand" is <code>triggerRef</code>. Choosing between them is a question about **how your data changes**, not about how big it is.

## 2. The Decision in One Question

📌 **Interview term: Replace vs mutate** — data is **replaced** when every change produces a new object (a fresh API response, an immutable store snapshot). Data is **mutated** when code edits properties in place (<code>form.address.city = "Oslo"</code>). Shallow APIs fit replaced data; deep reactivity fits mutated data.

📌 **Interview term: Immutable update** — creating a new object or array that shares unchanged parts with the old one (<code>[...rows, newRow]</code>, <code>{ ...user, name }</code>) instead of editing the old one. With a <code>shallowRef</code>, an immutable update is exactly one trigger.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 380" role="img" aria-label="Decision flow: data replaced as a whole leads to shallowRef, flat state with top-level changes leads to shallowReactive, in-place edits lead to ref or reactive, deliberate batched edits lead to shallowRef plus triggerRef">
  <defs>
    <marker id="q2sh-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="210" y="20" width="300" height="50" rx="10"/>
  <text class="d-text d-accent" x="360" y="50" text-anchor="middle">How does this data change?</text>
  <path class="d-edge" d="M 260 74 L 120 150" marker-end="url(#q2sh-arrow)"/>
  <path class="d-edge" d="M 360 74 L 360 150" marker-end="url(#q2sh-arrow)"/>
  <path class="d-edge" d="M 460 74 L 600 150" marker-end="url(#q2sh-arrow)"/>
  <rect class="d-box" x="20" y="155" width="200" height="60" rx="10"/>
  <text class="d-text" x="120" y="180" text-anchor="middle">replaced as a whole</text>
  <text class="d-sub" x="120" y="202" text-anchor="middle">API response, snapshot</text>
  <rect class="d-box" x="260" y="155" width="200" height="60" rx="10"/>
  <text class="d-text" x="360" y="180" text-anchor="middle">top-level keys change</text>
  <text class="d-sub" x="360" y="202" text-anchor="middle">nested values immutable</text>
  <rect class="d-box" x="500" y="155" width="200" height="60" rx="10"/>
  <text class="d-text" x="600" y="180" text-anchor="middle">edited in place</text>
  <text class="d-sub" x="600" y="202" text-anchor="middle">forms, nested editing</text>
  <path class="d-edge-accent" d="M 120 219 L 120 285" marker-end="url(#q2sh-arrow)"/>
  <path class="d-edge-accent" d="M 360 219 L 360 285" marker-end="url(#q2sh-arrow)"/>
  <path class="d-edge-accent" d="M 600 219 L 600 285" marker-end="url(#q2sh-arrow)"/>
  <rect class="d-box-accent" x="20" y="290" width="200" height="60" rx="10"/>
  <text class="d-text d-accent" x="120" y="315" text-anchor="middle">shallowRef</text>
  <text class="d-sub" x="120" y="337" text-anchor="middle">plus triggerRef if batched</text>
  <rect class="d-box-accent" x="260" y="290" width="200" height="60" rx="10"/>
  <text class="d-text d-accent" x="360" y="320" text-anchor="middle">shallowReactive</text>
  <rect class="d-box-accent" x="500" y="290" width="200" height="60" rx="10"/>
  <text class="d-text d-accent" x="600" y="320" text-anchor="middle">ref or reactive</text>
</svg>

Size alone does not decide it. A small object that is replaced on every server push is a fine <code>shallowRef</code>; a large form that users edit field by field should stay deep.

## 3. Verified: what deep reactivity costs

A Node script built 100,000 rows of <code>{ id, meta: { score, tags } }</code>, wrapped them three ways, and summed <code>row.meta.score</code> across all of them on first access (median of 7 runs):

\`\`\`
ref        median first full read of 100k rows: 127.5 ms
shallowRef median first full read of 100k rows: 4.2 ms
plain      median first full read of 100k rows: 4.6 ms
heap retained after full deep read: ref 20.6 MB, shallowRef 11.4 MB
\`\`\`

The <code>shallowRef</code> is as cheap as a plain object, because reading through it creates nothing. The deep <code>ref</code> creates a Proxy for every row and every <code>meta</code> object it passes through, which cost roughly 30 times the time and about 9 MB of extra heap here.

The runnable example does the same in a component with 20,000 rows, inside jsdom (three runs):

\`\`\`
load: ref: 115.0 ms, shallowRef: 4.5 ms || deep total: 550000 | shallow total: 550000
load: ref: 139.8 ms, shallowRef: 24.3 ms || deep total: 550000 | shallow total: 550000
load: ref: 128.6 ms, shallowRef: 5.6 ms || deep total: 550000 | shallow total: 550000
\`\`\`

Context for interviews: Vue 3.5 rewrote the reactivity core (version counting and a doubly linked list of dependencies). The Vue team reported 56% lower memory use and up to 10x faster tracking for large, deeply reactive arrays in some cases (source: the <a href="https://blog.vuejs.org/posts/vue-3-5" target="_blank" rel="noopener noreferrer">Vue 3.5 announcement</a>). So deep reactivity is cheaper than it was in 3.4, and the numbers above are already on 3.5. The gap is still large because a Proxy per object is a fixed cost.

## 4. Verified: the three ways to update a shallowRef

The second half of the runnable example holds the rows in a <code>shallowRef</code> with a <code>computed</code> total, and offers three buttons that each add 1000 to the first price:

\`\`\`
mutate only        -> deep total: 550000 | shallow total: 550000
mutate + triggerRef -> deep total: 550000 | shallow total: 552000
replace immutably  -> deep total: 550000 | shallow total: 553000
\`\`\`

Read it carefully. "Mutate only" changed the data but the computed did not recompute, so the screen kept showing 550000. "Mutate + triggerRef" then showed **552000**, not 551000: the trigger also surfaced the first, invisible edit. The immutable replacement triggered on its own.

📌 **Interview term: Stale computed** — a <code>computed</code> derived from shallow data keeps returning its cached value after an in-place mutation, because none of its dependencies were triggered. A Node check showed exactly that: <code>total</code> stayed 5 after <code>rows.value[0].price = 100</code>, and became 103 only after <code>triggerRef(rows)</code>.

One more verified rule: assigning the same object back does not count. <code>list.value.push(4); list.value = list.value</code> ran the effect **0** times, because refs compare old and new values with <code>Object.is</code>.

## 5. When Each One Is the Right Tool

| Situation | Use | Why |
| :--- | :--- | :--- |
| Large API response shown in a table, refetched as a whole | <code>shallowRef</code> | Each fetch is one replacement; no per-row proxies |
| State mirrored from Redux, Zustand, XState or Immer | <code>shallowRef</code> | Those libraries already produce new snapshots |
| Holding a component, a class instance or a DOM-ish object | <code>shallowRef</code> (or <code>markRaw</code>) | Must not be proxied; see [What do markRaw and toRaw do?](/interview-question/what-do-markraw-and-toraw-do) |
| Many in-place edits in a tight loop, then one UI update | <code>shallowRef</code> + <code>triggerRef</code> | Mutate freely, trigger once at the end |
| A flat state bag (<code>{ status, error, data }</code>) where <code>data</code> is replaced | <code>shallowReactive</code> | Top-level keys tracked, <code>data</code> left raw |
| A form edited field by field | <code>ref</code> / <code>reactive</code> | Deep edits must update the UI; shallow would hide them |
| Data rendered by a virtual list | <code>shallowRef</code> | Pairs well with [virtual scrolling](/interview-question/how-do-you-render-very-large-lists-efficiently-in-vue-virtual-scrolling) |

The external-store example (second code example) shows the cleanest pattern: the store creates a new snapshot per change, the composable puts it in a <code>shallowRef</code>, and <code>onScopeDispose</code> unsubscribes. Verified in Node:

\`\`\`
open todos: 1 | proxied: false
open todos: 2 | proxied: false
listeners before stop: 1
listeners after stop: 0
\`\`\`

## 6. When It Is a Trap

- **The UI edits the data.** If any component does <code>row.qty++</code>, a shallow container hides that edit until something else re-renders. You trade a performance problem for a correctness problem.
- **Derived state.** Every <code>computed</code> and <code>watch</code> downstream goes stale on in-place edits, not just the template.
- **Child components receiving rows as props.** A child re-renders only when a prop changes identity, so in-place edits do not reach children either. Immutable updates fix this naturally because a changed row is a new object.
- **Premature optimisation.** 20,000 rows is where the difference becomes visible. Scaling the measurement above linearly, 500 rows would cost roughly 0.6 ms through a deep <code>ref</code>, far below a 16 ms frame; measure with the browser profiler before changing the data model. See [How do you optimize performance in a Vue app?](/interview-question/how-do-you-optimize-performance-in-a-vue-app).

📌 **Interview term: triggerRef batching** — mutating a <code>shallowRef</code> many times and calling <code>triggerRef</code> once. Effects are already batched until the next tick, so the gain is not fewer renders: it is skipping the proxy and dependency work on every individual write.

## 7. Common Pitfalls

- **Swapping <code>ref</code> for <code>shallowRef</code> without changing the update code.** Every <code>.push</code>, <code>.splice</code> and nested assignment now needs a replacement or a <code>triggerRef</code>.
- **Using <code>triggerRef</code> as a habit.** If you call it after every write, you have rebuilt deep reactivity by hand with more bugs. Prefer immutable replacements.
- **Calling <code>triggerRef</code> on a <code>shallowReactive</code>.** It is silently ignored; reassign the top-level key.
- **Expecting <code>{ deep: true }</code> to rescue a watcher.** There are no proxies below <code>.value</code>, so a deep watch on a <code>shallowRef</code> still misses nested edits.
- **Forgetting that the "invisible" edit is still there.** As verified, the next trigger surfaces all earlier in-place edits at once, which can look like a double update.
- **Mixing shallow containers with [<code>toRefs</code>](/interview-question/what-do-toref-and-torefs-do) on nested data.** <code>toRef(shallowState.nested, "x")</code> creates a ref on a raw object, which cannot trigger.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Frame it:</strong> <span style="color:#f0e2c8;">"Shallow reactivity is a trade: Vue stops proxying nested data, and in return I promise to change that data only by replacing it, or to tell Vue with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">triggerRef</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. shallowRef:</strong> <span style="color:#f0e2c8;">"I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shallowRef</code> for data replaced as a whole: API responses, immutable store snapshots, and anything that must not be proxied, like a component or a class instance."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. shallowReactive and triggerRef:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shallowReactive</code> fits a flat state bag whose top-level keys change. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">triggerRef</code> is for when I deliberately mutate a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shallowRef</code> in place, for example many edits and then one trigger."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Evidence:</strong> <span style="color:#f0e2c8;">"On Vue 3.5 I measured a first read of 100,000 rows at about 128 ms through a deep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ref</code> and about 4 ms through a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shallowRef</code>, the same as a plain object."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap:</strong> <span style="color:#f0e2c8;">"If the UI edits rows in place, shallow state hides those edits from the template, from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> values and from child props. So forms and deeply edited data stay deep, and I profile before switching."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just call <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">triggerRef</code> after every write?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Then I am rebuilding deep reactivity by hand and will eventually forget one. Immutable replacement is safer: one new object, one trigger, and child components see a new prop identity too.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">triggerRef</code> reduce the number of renders?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not really, because Vue already batches effect runs until the next tick. What it saves is the proxy creation and dependency bookkeeping on every individual write.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">A <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">computed</code> built on a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">shallowRef</code> shows an old value. Why?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It cached its result and none of its dependencies were triggered, because the edit happened below <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.value</code>. After <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">triggerRef</code> it recomputes; I verified a total going from a stale 5 to 103.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Did Vue 3.5 make this advice obsolete?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It narrowed the gap. 3.5 rewrote the reactivity core and the team reported 56% less memory and much faster tracking of large arrays. But a Proxy per nested object is still a fixed cost, and my measurement was on 3.5.44.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you pick <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">shallowReactive</code> over <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">shallowRef</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the state is an object of several independent fields, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ status, error, data }</code>. Each field is tracked and can be assigned on its own, while the large <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">data</code> value stays raw.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Replace vs mutate** | New object per change, or edits to the existing one |
| **Immutable update** | Build a new object or array instead of editing the old one |
| **Stale computed** | A cached derived value that missed an untracked in-place change |
| **triggerRef** | Manually notify everything that depends on a <code>shallowRef</code> |
| **triggerRef batching** | Many raw writes, one manual trigger at the end |
| **shallowReactive** | Top-level keys tracked, nested values raw |

---
**Conclusion:** Pick shallow APIs by how data changes, not by how big it is. <code>shallowRef</code> is right for data replaced as a whole (API responses, store snapshots, components and instances), and on 3.5.44 it read 100,000 rows about 30 times faster than a deep <code>ref</code> with roughly half the heap. <code>shallowReactive</code> suits flat state whose nested values are immutable, and <code>triggerRef</code> is the deliberate escape hatch after in-place edits. The cost is that nested edits, and every <code>computed</code> built on them, stay invisible until a replacement or trigger, so data the UI edits field by field should stay deep.`,
    examples: [
      {
        label: "20,000 rows: ref vs shallowRef, and three ways to update a shallowRef",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { computed, ref, shallowRef, triggerRef } from "vue";

const makeRows = (n) =>
  Array.from({ length: n }, (_, i) => ({ id: i, price: (i % 50) + 1, meta: { tags: ["a", "b"] } }));

// The same 20,000-row "API response" held two ways.
const deepRows = ref([]);
const flatRows = shallowRef([]);

const deepTotal = computed(() => deepRows.value.reduce((s, r) => s + r.price + r.meta.tags.length, 0));
const flatTotal = computed(() => flatRows.value.reduce((s, r) => s + r.price + r.meta.tags.length, 0));

const timings = ref("");
function load() {
  const t0 = performance.now();
  deepRows.value = makeRows(20000);
  deepTotal.value; // force the computed to read every row through proxies
  const t1 = performance.now();
  flatRows.value = makeRows(20000);
  flatTotal.value; // plain objects: no proxies created
  const t2 = performance.now();
  timings.value = \`ref: \${(t1 - t0).toFixed(1)} ms, shallowRef: \${(t2 - t1).toFixed(1)} ms\`;
}

// Three ways to change one price inside the shallowRef:
function mutateOnly() {
  flatRows.value[0].price += 1000; // invisible: no trigger
}
function mutateAndTrigger() {
  flatRows.value[0].price += 1000;
  triggerRef(flatRows); // "I mutated in place, re-run whoever depends on this"
}
function replaceImmutably() {
  const [first, ...rest] = flatRows.value;
  flatRows.value = [{ ...first, price: first.price + 1000 }, ...rest]; // new array = trigger
}
</script>

<template>
  <button id="load" @click="load">load 20,000 rows</button>
  <p id="timings">{{ timings }}</p>
  <p id="totals">deep total: {{ deepTotal }} | shallow total: {{ flatTotal }}</p>
  <button id="mutate" @click="mutateOnly">mutate only</button>
  <button id="trigger" @click="mutateAndTrigger">mutate + triggerRef</button>
  <button id="replace" @click="replaceImmutably">replace immutably</button>
</template>
`,
      },
      {
        label: "Mirroring an immutable external store with shallowRef",
        tech: "js",
        runnable: false,
        code: `// useExternalStore.js: mirror an immutable external store into Vue.
import { onScopeDispose, shallowRef } from "vue";

export function useExternalStore(store) {
  // The store already produces a NEW snapshot object on every change,
  // so deep proxies would be pure overhead: a shallowRef is enough.
  const snapshot = shallowRef(store.getState());
  const unsubscribe = store.subscribe(() => {
    snapshot.value = store.getState(); // new identity => one trigger
  });
  onScopeDispose(unsubscribe); // stop listening with the component or scope
  return snapshot;
}

// A minimal immutable store (stand-in for Redux, Zustand vanilla, XState...).
export function createStore(initial) {
  let state = initial;
  const listeners = new Set();
  return {
    getState: () => state,
    setState: (fn) => { state = fn(state); listeners.forEach((l) => l()); },
    subscribe: (l) => (listeners.add(l), () => listeners.delete(l)),
    listenerCount: () => listeners.size,
  };
}
`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What does readonly do in Vue's reactivity?",
    seoDescription:
      "readonly() wraps state in a deep proxy that blocks writes but still tracks the source. Exact Vue 3.5 warnings, prod behaviour, shallowReadonly and props.",
    description: `**Question presented to candidate:**
"A store exposes \`readonly(state)\` to components. Explain what \`readonly\` actually does: what happens when a component writes to it, does it still update when the store changes, and how is it different from \`Object.freeze\`?"

**What a strong answer should cover:**
- \`readonly()\` returns a **Proxy over the same data** that rejects \`set\` and \`delete\`; it is **deep**, so nested objects and arrays are read-only too.
- It is still **reactive for reads**: effects reading the view re-run when the owner mutates the original.
- In development a blocked write prints \`Set operation on key "x" failed: target is readonly.\`; in production the write is **silently ignored** and does not throw, even in strict mode.
- \`shallowReadonly\` blocks only top-level writes; **component props** are shallow read-only.
- \`readonly\` is not \`Object.freeze\`: freeze changes the object itself and stops everyone, readonly is a view that only stops the holder of the view.
- Related checks: \`isReadonly\`, \`isReactive\`, \`isProxy\`, \`toRaw\`.

**Clarifying questions expected:**
- "Is the goal to protect state from components, or to make data truly immutable?"
- "Do you care about development warnings only, or runtime guarantees in production?"

**Code / implementation expected:** Optional — provide a readonly view to a child and show a blocked write plus an update through the owner.`,
    answer: `**Target Audience:** Vue developers who share state between components, stores or composables.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. Every warning message and value below was printed by running the code on Vue 3.5.44, both as Node scripts against the <code>vue</code> package and as an SFC mounted in jsdom. This page explains **what** <code>readonly</code> does. For **when** to use it next to <code>markRaw</code> and <code>toRaw</code>, see the sibling [When should you use readonly, markRaw, and toRaw in Vue reactivity?](/interview-question/when-should-you-use-readonly-markraw-and-toraw-in-vue-reactivity).

## 1. Why This Even Matters — A Story First

A bank shows you your balance through a window. You can look through the glass as often as you like, and whenever the bank updates your balance, the number behind the glass changes immediately. What you cannot do is reach through the glass and change the number. Only the teller, who sits on the other side with the real ledger, can do that.

<code>readonly()</code> is that window. The ledger is your reactive state. The window lets components **see** the state and **react** to changes, while the only code that can change it is the code holding the original.

The interview point is subtle: the window does not freeze the ledger. The teller can still write. That is the difference from <code>Object.freeze</code>, and it is why <code>readonly</code> is the standard way to expose state from a composable or store.

## 2. The Core Idea

📌 **Interview term: readonly()** — takes an object, a <code>reactive</code> proxy or a ref, and returns a **read-only proxy** to the same underlying data. Reads go through and are tracked; <code>set</code> and <code>delete</code> are rejected.

📌 **Interview term: Deep readonly** — like <code>reactive</code>, the protection applies at every level. Reading <code>view.user</code> returns another read-only proxy, and array mutators such as <code>push</code> fail because they try to set an index and <code>length</code>.

📌 **Interview term: Reactive view** — when the source is reactive, the read-only proxy is still part of the reactivity graph: an effect that reads <code>view.count</code> re-runs when someone writes <code>source.count</code>. Writes flow one way, from owner to view.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="The owner writes the reactive source, the readonly view reads the same data and updates its readers, writes through the view are rejected">
  <defs>
    <marker id="q3ro-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="40" width="180" height="56" rx="10"/>
  <text class="d-text" x="120" y="66" text-anchor="middle">owner code</text>
  <text class="d-sub" x="120" y="86" text-anchor="middle">store or composable</text>
  <path class="d-edge-accent" d="M 214 68 L 286 68" marker-end="url(#q3ro-arrow)"/>
  <rect class="d-box-accent" x="292" y="40" width="160" height="56" rx="10"/>
  <text class="d-text d-accent" x="372" y="66" text-anchor="middle">reactive source</text>
  <text class="d-sub" x="372" y="86" text-anchor="middle">writable</text>
  <path class="d-edge-accent" d="M 372 100 L 372 156" marker-end="url(#q3ro-arrow)"/>
  <rect class="d-box-accent" x="292" y="162" width="160" height="56" rx="10"/>
  <text class="d-text d-accent" x="372" y="188" text-anchor="middle">readonly view</text>
  <text class="d-sub" x="372" y="208" text-anchor="middle">same data</text>
  <path class="d-edge-accent" d="M 456 190 L 528 190" marker-end="url(#q3ro-arrow)"/>
  <rect class="d-box" x="534" y="162" width="160" height="56" rx="10"/>
  <text class="d-text" x="614" y="188" text-anchor="middle">components</text>
  <text class="d-sub" x="614" y="208" text-anchor="middle">read and re-render</text>
  <path class="d-edge-dashed" d="M 560 222 C 520 270, 440 270, 420 224" marker-end="url(#q3ro-arrow)"/>
  <text class="d-sub" x="490" y="285" text-anchor="middle">write attempt: rejected</text>
</svg>

Updates travel down the solid arrows: owner to source to view to readers. A write coming back up from a component hits the view and stops there.

## 3. Verified: what readonly does, line by line

A Node script against Vue 3.5.44 (development build, so warnings print):

\`\`\`
view === source: false  isReadonly(view): true  isReactive(view): true  isProxy(view): true
[Vue warn] Set operation on key "count" failed: target is readonly. { count: 0, user: { name: 'Ada' }, list: [ 1 ] }
view.count after write attempt: 0
[Vue warn] Set operation on key "name" failed: target is readonly. { name: 'Ada' }
nested write blocked, name: Ada  isReadonly(view.user): true
[Vue warn] Delete operation on key "count" failed: target is readonly. { count: 0, user: { name: 'Ada' }, list: [ 1 ] }
[Vue warn] Set operation on key "1" failed: target is readonly. [ 1 ]
[Vue warn] Set operation on key "length" failed: target is readonly. [ 1 ]
list after push attempt: [1]
readonly view tracks the source, effect saw: [0,1]
readonly(view) === view: true  readonly(source) === view (cached): true
toRaw(view) === toRaw(source): true
readonly(plain): isReactive false  isReadonly true
\`\`\`

What each line proves:

- **A new proxy, same data.** <code>view !== source</code>, but <code>toRaw</code> of both is the same object.
- **<code>isReactive(view)</code> is true** when the source was reactive, because the view wraps a reactive proxy. A <code>readonly</code> over a **plain** object is read-only but not reactive (last line): nothing would ever trigger it.
- **Deep.** The nested <code>user.name</code> write and the array <code>push</code> were blocked; <code>push</code> fails twice, once for the new index and once for <code>length</code>.
- **Still reactive for readers.** The effect reading <code>view.count</code> saw <code>[0,1]</code> after the owner did <code>source.count++</code>.
- **Cached.** Calling <code>readonly(source)</code> again returns the same view, and <code>readonly(view)</code> returns the view itself.

## 4. Production and strict mode: no error, just ignored

📌 **Interview term: Soft failure** — a blocked readonly write does not throw. The Proxy <code>set</code> trap reports success to JavaScript and simply does not write. Verified in an ES module (which is always strict mode):

\`\`\`
[Vue warn] Set operation on key "count" failed: target is readonly. { count: 0 }
development strict-mode write: no throw, count = 0
production strict-mode write: no throw, count = 0
\`\`\`

In the production build the warning disappears and the write is still ignored. So <code>readonly</code> is a **guard rail plus a development-time alarm**, not an exception you can catch. If a component must know that a write failed, give it an action function that returns a result.

## 5. The readonly Family

| API | Blocks writes at | Reactive for readers | Typical use |
| :--- | :--- | :--- | :--- |
| <code>readonly(reactiveObj)</code> | Every level | Yes | Expose store or composable state |
| <code>readonly(plainObj)</code> | Every level | No (nothing triggers it) | Constant config you want to protect |
| <code>readonly(ref)</code> | <code>.value</code> | Yes | Expose a single ref read-only |
| <code>shallowReadonly(obj)</code> | Top level only | Top level | Props, large nested data you do not own |
| <code>computed(getter)</code> | <code>.value</code> | Yes | Derived values; writing warns <code>Write operation failed: computed value is readonly</code> (see [writable computed](/interview-question/can-a-computed-property-be-writable)) |
| <code>Object.freeze(obj)</code> | Every caller, on the object itself | No; <code>reactive(frozen)</code> returns the frozen object unproxied | Truly immutable constants |

Two of these were checked directly: <code>shallowReadonly</code> blocked <code>sro.top = 2</code> with the usual warning but allowed <code>sro.nested.n = 99</code>; and <code>reactive(Object.freeze({ x: 1 }))</code> returned the frozen object itself, because Vue does not proxy non-extensible objects.

📌 **Interview term: Props are shallow readonly** — inside a component, <code>props</code> is a shallow read-only reactive object. Verified: <code>isReadonly(props)</code> was <code>true</code>, <code>props.label = "changed"</code> printed <code>Set operation on key "label" failed: target is readonly.</code>, but <code>props.user.name = "Grace"</code> went through and changed the parent's data. That is why mutating inside an object prop "works" and is still discouraged: use [emits](/interview-question/why-declare-emits-and-can-you-validate-them) or <code>v-model</code> instead.

## 6. Verified in a component: provide a readonly view

The runnable example provides <code>{ state: readonly(cart), addPen }</code>. The child first tries to write directly, then calls the action:

\`\`\`
-- child tries to write:
[Vue warn] Set operation on key "qty" failed: target is readonly. { name: 'Pen', qty: 1 }
[Vue warn] Set operation on key "1" failed: target is readonly. [ { name: 'Pen', qty: 1 } ]
[Vue warn] Set operation on key "length" failed: target is readonly. [ { name: 'Pen', qty: 1 } ]
   owner sees: Pen x1 | child sees: Pen x1
-- child calls addPen():
   owner sees: Pen x2 | child sees: Pen x2
\`\`\`

This is the shape Vue's docs recommend for [provide and inject](/interview-question/what-are-provide-and-inject): provide read-only state plus explicit mutation functions, so every change goes through code the owner controls.

## 7. Reading the Interaction Rules

- <code>reactive(readonlyProxy)</code> returns the read-only proxy unchanged (verified: <code>reactive(view) === view</code>), so you cannot "unlock" a view by wrapping it.
- <code>toRaw(view)</code> **does** give you the original, writable object. Readonly protects against accidents, not against a determined developer. See [What do markRaw and toRaw do?](/interview-question/what-do-markraw-and-toraw-do).
- In TypeScript, <code>readonly()</code> returns <code>DeepReadonly&lt;UnwrapNestedRefs&lt;T&gt;&gt;</code>, so most write attempts are caught by the type checker before they ever reach the runtime warning.

## 8. Common Pitfalls

- **Expecting an exception.** Blocked writes never throw, in development or production. A <code>try/catch</code> around them catches nothing.
- **Thinking readonly makes data immutable.** The owner, and anyone with <code>toRaw</code>, can still write. For real immutability use <code>Object.freeze</code> or immutable data structures.
- **Wrapping a plain object and expecting reactivity.** <code>readonly({ ... })</code> over a non-reactive object is read-only but will never trigger an update.
- **Assuming props are deeply protected.** They are shallow read-only: nested writes to an object prop go straight through to the parent.
- **Exposing both the original and the view.** If a composable returns <code>state</code> and <code>readonly(state)</code>, someone will use the writable one. Return only the view plus actions.
- **Using readonly in hot paths for no reason.** A readonly view is another proxy layer on every read. Use it at module boundaries, not on every local variable.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">readonly()</code> returns a proxy over the same data that lets you read and react to it, but rejects writes and deletes."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. It is deep and still reactive:</strong> <span style="color:#f0e2c8;">"Nested objects and arrays are read-only too, and when the owner mutates the original reactive object, everyone reading the view updates."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. What a blocked write does:</strong> <span style="color:#f0e2c8;">"In development Vue warns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set operation on key "x" failed: target is readonly.</code> In production the write is silently ignored. It never throws, even in strict mode."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The family:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shallowReadonly</code> protects only the top level, and component props are shallow read-only, which is why nested writes to an object prop still go through."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Why it matters:</strong> <span style="color:#f0e2c8;">"It is how a store or composable exposes state: provide <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">readonly(state)</code> plus action functions, so every change goes through code the owner controls. It is a guard rail, not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.freeze</code>."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">readonly</code> different from <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Object.freeze</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Freeze changes the object itself, so nobody can write, including the owner, and Vue will not even proxy a frozen object. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">readonly</code> is a view: only code holding the view is blocked, and the owner keeps writing and triggering updates.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a component get around a readonly view?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toRaw(view)</code>, which returns the writable original. Readonly protects against accidents and documents intent; it is not a security boundary.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is a readonly view reactive?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">If it wraps a reactive object, yes: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isReactive(view)</code> is true and effects re-run on source changes. If it wraps a plain object, it is read-only but nothing ever triggers it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if you call <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">reactive()</code> on a readonly proxy?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">You get the same readonly proxy back. Vue checks for it, so wrapping cannot unlock the view.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why are props only shallow readonly?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Making them deeply read-only would mean wrapping every object a parent passes down in another proxy layer. Vue blocks reassigning the prop itself and relies on conventions, emits and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-model</code> for nested data.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **readonly()** | A proxy over the same data that rejects writes and deletes |
| **Deep readonly** | Nested objects and arrays are read-only too |
| **Reactive view** | Readers still update when the owner writes the source |
| **Soft failure** | A blocked write is ignored with a dev warning, never thrown |
| **shallowReadonly** | Only top-level keys are protected |
| **Props are shallow readonly** | You cannot reassign a prop, but nested writes go through |
| **isReadonly** | Checks whether a value is a read-only proxy |

---
**Conclusion:** <code>readonly()</code> is a window, not a freezer: it returns a deep proxy over the same data that rejects writes and deletes, while still updating everyone who reads it when the owner changes the source. As verified on Vue 3.5.44, a blocked write prints <code>Set operation on key "x" failed: target is readonly.</code> in development and is silently ignored in production, never thrown. Combined with action functions, it gives a store or composable one place where state changes, which is exactly what interviewers want to hear.`,
    examples: [
      {
        label: "Provide a readonly view: the child can read, not write",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { defineComponent, h, inject, isReadonly, provide, reactive, readonly } from "vue";

// The owner keeps the writable original...
const cart = reactive({ items: [{ name: "Pen", qty: 1 }] });
const addPen = () => cart.items[0].qty++;

// ...and hands out a read-only VIEW of the same data, plus the one sanctioned action.
provide("cart", { state: readonly(cart), addPen });

const CartBadge = defineComponent({
  setup() {
    const { state, addPen } = inject("cart");
    const hack = () => {
      state.items[0].qty = 99; // blocked: warns in dev, silently ignored in prod
      state.items.push({ name: "Free laptop", qty: 1 }); // blocked too: readonly is deep
    };
    return () =>
      h("div", [
        h("p", { id: "badge" }, \`child sees: \${state.items.map((i) => i.name + " x" + i.qty).join(", ")}\`),
        h("p", \`isReadonly(state.items[0]): \${isReadonly(state.items[0])}\`),
        h("button", { id: "hack", onClick: hack }, "child tries to write"),
        h("button", { id: "action", onClick: addPen }, "child calls addPen()"),
      ]);
  },
});
</script>

<template>
  <p id="owner">owner sees: {{ cart.items.map((i) => i.name + " x" + i.qty).join(", ") }}</p>
  <CartBadge />
</template>
`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What do markRaw and toRaw do?",
    seoDescription:
      "markRaw flags an object so Vue never proxies it; toRaw returns the original object behind a proxy. How both work, with verified Vue 3.5 edge cases.",
    description: `**Question presented to candidate:**
"Explain what \`markRaw\` and \`toRaw\` do in Vue 3. How does each one work internally, and what can go wrong with object identity when proxies and raw objects mix?"

**What a strong answer should cover:**
- Vue's \`reactive()\` returns a **Proxy**, a different object from the original; every nested object read through it is proxied too.
- \`markRaw(obj)\` sets a hidden, non-enumerable \`__v_skip\` flag, so \`reactive()\`, \`ref()\` and nested access return the object **unproxied**, forever.
- \`markRaw\` is **shallow**: objects nested inside a marked object can still become reactive if reached another way.
- \`toRaw(proxy)\` returns the **original object** behind a reactive, readonly or shallow proxy (recursively); writes to it are **not tracked**.
- Identity hazards: \`proxy !== raw\`, so \`Map\`/\`WeakMap\` lookups and \`===\` checks can fail; \`structuredClone(proxy)\` throws \`DataCloneError\`; classes with \`#private\` fields break behind a proxy.
- Both are escape hatches: use them at boundaries with non-Vue code, not as everyday tools.

**Clarifying questions expected:**
- "Is the object coming from a third-party library, or is it our own state?"
- "Do we need the raw object for reading, or are we going to write to it?"

**Code / implementation expected:** Optional — a class instance that breaks when proxied and works with \`markRaw\`, plus \`toRaw\` used for a snapshot.`,
    answer: `**Target Audience:** Vue developers integrating third-party objects or debugging identity bugs in reactive state.
**Difficulty:** Hard

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. Every value and error message below was printed by running the code on Vue 3.5.44 in Node 22, or by mounting the SFC in jsdom with the repo verifier. This page explains **how** <code>markRaw</code> and <code>toRaw</code> work. For **when** to choose them, alongside <code>readonly</code>, see [When should you use readonly, markRaw, and toRaw in Vue reactivity?](/interview-question/when-should-you-use-readonly-markraw-and-toraw-in-vue-reactivity).

## 1. Why This Even Matters — A Story First

A celebrity hires a body double. The double goes everywhere in public: signs autographs, waves at cameras, and reports back every single thing that happened. Fans never meet the real person, only the double. Most of the time that is perfect.

But some places only accept the real person. The passport office checks fingerprints. The bank vault knows the real face. Send the double, and the door stays shut.

In Vue, the **double** is the reactive Proxy that <code>reactive()</code> creates. It reports every read and write, which is how the screen stays in sync. **<code>toRaw</code>** fetches the real person when you need to go somewhere the double cannot. **<code>markRaw</code>** is a note on the real person saying "never send a double for this one", for celebrities who must always appear in person.

## 2. First, What a Proxy Changes

📌 **Interview term: Reactive proxy** — <code>reactive(obj)</code> returns <code>new Proxy(obj, handlers)</code>. It is a **different object** from <code>obj</code>: the handlers record reads (tracking) and announce writes (triggering). Nested objects get their own proxies lazily, the first time you read them through the parent. See [How does Vue's reactivity system work?](/interview-question/how-does-vue-s-reactivity-system-work).

📌 **Interview term: Raw object** — the original, un-proxied object. Vue keeps a <code>WeakMap</code> from each raw object to its proxy, so calling <code>reactive(obj)</code> twice returns the same proxy.

Verified identity facts on 3.5.44:

\`\`\`
proxy.nested === original.nested: false  toRaw(proxy.nested) === original.nested: true
list[0] === item: false  list.includes(item): true  list.indexOf(item): 0
reactive Set has(raw): true
Map keyed by proxy, get(raw): undefined
\`\`\`

Vue patches <code>includes</code>, <code>indexOf</code> and reactive <code>Set</code>/<code>Map</code> methods so that raw and proxied values match. A plain <code>Map</code> or <code>WeakMap</code> you own gets no such help: a key stored through the proxy is a different key from the raw object.

## 3. markRaw: never proxy this object

📌 **Interview term: markRaw()** — <code>markRaw(obj)</code> defines a hidden property <code>__v_skip: true</code> on the object and returns the **same object**. From then on, <code>reactive()</code>, <code>ref()</code>, <code>readonly()</code> and nested access all hand it back unproxied.

\`\`\`
markRaw returns same object: true  own keys incl hidden flag: [ 'type', 'series', '__v_skip' ]  enumerable keys: [ 'type', 'series' ]
__v_skip descriptor: {"value":true,"writable":false,"enumerable":false,"configurable":true}
reactive(chart) === chart: true
isReactive(state.chart): false  isReactive(state.other): true
isReactive(ref(markRaw obj).value): false
\`\`\`

The flag is non-enumerable, so <code>Object.keys</code>, <code>JSON.stringify</code> and spreading ignore it. Inside <code>reactive({ chart, other })</code>, only <code>other</code> became a proxy.

📌 **Interview term: Shallow opt-out** — <code>markRaw</code> marks **one object**, not its children. Verified: with <code>cfg = markRaw({ inner: { n: 1 } })</code>, putting <code>cfg.inner</code> into another reactive object made it reactive (<code>isReactive(...) = true</code>). It is protected only while it is reached through the marked parent.

Two more edge cases, both verified:

\`\`\`
markRaw(frozen) did not throw; has flag: false
after markRaw, reactive(obj) === obj: true  old proxy still reactive and works: 2
\`\`\`

- **Frozen objects** cannot receive the flag, so <code>markRaw</code> quietly skips them. That is fine, because Vue never proxies non-extensible objects anyway.
- **Marking too late** splits identity. If <code>reactive(obj)</code> already ran, the old proxy keeps working, but every new <code>reactive(obj)</code> now returns the raw object. Two parts of the app end up holding different things for the same data. Mark objects **when you create them**.

## 4. toRaw: get the original back

📌 **Interview term: toRaw()** — returns the raw object behind any Vue proxy: <code>reactive</code>, <code>readonly</code>, <code>shallowReactive</code> or <code>shallowReadonly</code>. It unwraps **recursively**, so <code>toRaw(readonly(reactive(x)))</code> is <code>x</code>. Given a non-proxy, it returns the argument unchanged.

\`\`\`
toRaw(proxy) === original: true
toRaw(readonly(proxy)) === original: true
toRaw(plain) === plain: true
after toRaw write, effect saw: [0]  but value is 10
after proxy write, effect saw: [0,11]
\`\`\`

The last two lines are the important ones. Writing through <code>toRaw(proxy).count = 10</code> changed the data, but the effect did not run, because the raw object has no handlers. Writing through the proxy triggered as usual. So <code>toRaw</code> is for **reading without tracking** or handing data to non-Vue code, not for writing state the UI shows.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="reactive creates a proxy for a raw object, toRaw goes from the proxy back to the raw object, markRaw sets a skip flag so reactive returns the raw object itself">
  <defs>
    <marker id="q4raw-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="60" width="200" height="60" rx="10"/>
  <text class="d-text" x="140" y="86" text-anchor="middle">raw object</text>
  <text class="d-sub" x="140" y="106" text-anchor="middle">no handlers</text>
  <rect class="d-box-accent" x="480" y="60" width="200" height="60" rx="10"/>
  <text class="d-text d-accent" x="580" y="86" text-anchor="middle">reactive proxy</text>
  <text class="d-sub" x="580" y="106" text-anchor="middle">tracks and triggers</text>
  <path class="d-edge-accent" d="M 244 78 L 474 78" marker-end="url(#q4raw-arrow)"/>
  <text class="d-sub" x="360" y="62" text-anchor="middle">reactive(obj)</text>
  <path class="d-edge-dashed" d="M 476 104 L 246 104" marker-end="url(#q4raw-arrow)"/>
  <text class="d-sub" x="360" y="134" text-anchor="middle">toRaw(proxy)</text>
  <rect class="d-box-muted" x="40" y="200" width="200" height="60" rx="10"/>
  <text class="d-text" x="140" y="226" text-anchor="middle">markRaw(obj)</text>
  <text class="d-sub" x="140" y="246" text-anchor="middle">hidden skip flag</text>
  <rect class="d-box-muted" x="480" y="200" width="200" height="60" rx="10"/>
  <text class="d-text" x="580" y="226" text-anchor="middle">reactive(obj)</text>
  <text class="d-sub" x="580" y="246" text-anchor="middle">returns obj itself</text>
  <path class="d-edge" d="M 244 230 L 474 230" marker-end="url(#q4raw-arrow)"/>
</svg>

The top row is the normal round trip: <code>reactive</code> goes out to the proxy, <code>toRaw</code> comes back. The bottom row is the opt-out: once the skip flag is set, <code>reactive</code> has nothing to do and hands the object straight back.

## 5. Places Where Only the Real Object Works

| Situation | With a proxy (verified) | Fix |
| :--- | :--- | :--- |
| Class with <code>#private</code> fields | <code>TypeError: Cannot read private member #n from an object whose class did not declare it</code> | <code>markRaw(new Counter())</code> |
| <code>structuredClone(state)</code> | <code>DataCloneError: #&lt;Object&gt; could not be cloned.</code> | <code>structuredClone(toRaw(state))</code> |
| Your own <code>Map</code> or <code>WeakMap</code> keyed by objects | Key stored via proxy, looked up via raw: <code>undefined</code> | Normalise keys with <code>toRaw</code> |
| Component definitions in state | Vue warns and suggests <code>markRaw</code> or <code>shallowRef</code> | <code>markRaw(Component)</code> |

The private-field case matters because many modern libraries use <code>#private</code> fields: a method called through the proxy runs with <code>this</code> set to the proxy, and the proxy does not have the private slot. Private fields are a JavaScript language rule, not a Vue rule; see [How does the this keyword work?](/interview-question/how-does-the-this-keyword-work) for how <code>this</code> is bound on method calls.

The <code>DataCloneError</code> was observed in Node 22, whose <code>structuredClone</code> follows the same HTML structured clone algorithm browsers implement; this page did not run it in a browser.

## 6. Verified in a component

The runnable example puts two instances of an <code>Engine</code> class (with a <code>#rpm</code> private field) into reactive state, one plain and one wrapped in <code>markRaw</code>, and snapshots a form with <code>structuredClone</code>:

\`\`\`
rev: plain: TypeError: Cannot read private member #rpm from an object whose class did not declare it | raw: rpm 1000 (isReactive false)
save: proxy: DataCloneError. toRaw copy: {"title":"Draft","tags":["vue"]}
\`\`\`

## 7. TypeScript Notes

- <code>markRaw&lt;T&gt;(value: T): Raw&lt;T&gt;</code> brands the type, so Vue's <code>UnwrapRef</code> types leave it alone when it sits inside a <code>ref</code> or <code>reactive</code>.
- <code>toRaw&lt;T&gt;(observed: T): T</code> returns the same static type. TypeScript cannot tell a proxy from a raw object, so <code>toRaw</code> is invisible to the type checker; identity bugs are runtime bugs.

## 8. Common Pitfalls

- **Writing state through <code>toRaw</code>.** The data changes but nothing re-renders, as verified. Write through the proxy, and use <code>toRaw</code> only for reads or for non-Vue consumers.
- **Calling <code>markRaw</code> after the object is already reactive.** You get two identities for one object: old proxy and new raw.
- **Assuming <code>markRaw</code> is deep.** Nested objects are only safe while reached through the marked parent.
- **Using a raw object as a key in your own Map while the code elsewhere uses the proxy.** Normalise with <code>toRaw</code> at the boundary.
- **Expecting <code>toRaw</code> to deep-clone.** It returns the same object, not a copy. Mutating it later mutates your state.
- **Putting reactive state straight into <code>postMessage</code>, IndexedDB or <code>structuredClone</code>.** They need plain data: use <code>toRaw</code> (and note that nested values inside a raw object are already raw, because Vue proxies lazily and stores raw values).

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The setup:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reactive()</code> returns a Proxy, a different object from the original, and that proxy is what tracks reads and triggers updates."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. markRaw:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">markRaw(obj)</code> sets a hidden non-enumerable <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__v_skip</code> flag, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reactive</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ref</code> and nested access always return the real object. It is for third-party instances, class instances and components."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. toRaw:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toRaw(proxy)</code> returns the original object behind any Vue proxy, recursively. Reading through it is untracked, and writing through it changes data without re-rendering."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Why you need them:</strong> <span style="color:#f0e2c8;">"Some things only work on the real object: classes with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">#private</code> fields throw a TypeError through a proxy, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">structuredClone</code> throws a DataCloneError."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Caveats:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">markRaw</code> is shallow and should be applied when the object is created; marked later, old code keeps the proxy and new code gets the raw object. Both are escape hatches for boundaries."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does a class with private fields break inside <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">reactive</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Methods called through the proxy run with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">this</code> set to the proxy, and the proxy has no private slot, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">this.#n</code> throws <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Cannot read private member #n from an object whose class did not declare it</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">markRaw</code> keeps the real instance.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">If I write through <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">toRaw</code>, is the change lost?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, the data changes, but effects do not run. I verified an effect staying at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[0]</code> after a raw write, then seeing 11 after the next write through the proxy. So it is a deferred and confusing update, not a lost one.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">markRaw</code> deep?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It flags only that object. A nested object reached another way, for example assigned into a different reactive object, still becomes reactive.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">list.includes(item)</code> work when <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">list[0] !== item</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Vue instruments array search methods to compare raw values, and reactive Set and Map methods do the same. Your own plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WeakMap</code> gets no such help, so lookups mixing proxy and raw keys fail.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">toRaw</code> know the original?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each Vue proxy answers a special internal <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__v_raw</code> key with its target, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toRaw</code> follows that until it reaches an object that is not a proxy. That is why it unwraps <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">readonly(reactive(x))</code> back to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code>.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Reactive proxy** | The tracking wrapper <code>reactive()</code> returns; a different object from the original |
| **Raw object** | The original object behind a proxy |
| **markRaw()** | Sets a hidden <code>__v_skip</code> flag so Vue never proxies that object |
| **Shallow opt-out** | <code>markRaw</code> protects one object, not the objects inside it |
| **toRaw()** | Returns the original object behind any Vue proxy, recursively |
| **Identity split** | Some code holds the proxy and some the raw object for the same data |
| **DataCloneError** | What <code>structuredClone</code> throws for a Proxy |

---
**Conclusion:** <code>markRaw</code> and <code>toRaw</code> are the two directions across the proxy boundary. <code>markRaw</code> stamps an object with a hidden <code>__v_skip</code> flag so Vue always hands back the real object, which keeps class instances with private fields and component definitions working; <code>toRaw</code> walks from any proxy back to the original, which <code>structuredClone</code>, your own maps and non-Vue libraries need. As verified on Vue 3.5.44, writes through <code>toRaw</code> are invisible to effects and <code>markRaw</code> applied late splits identity, so both belong at the edges of your code, set up once, not sprinkled through it.`,
    examples: [
      {
        label: "markRaw for a class with #private fields, toRaw for structuredClone",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { isReactive, markRaw, reactive, ref, toRaw } from "vue";

// Stand-in for a third-party class (a map, a chart, an SDK client).
// Real libraries often use #private fields, which a Proxy cannot reach.
class Engine {
  #rpm = 0;
  rev() {
    this.#rpm += 1000;
    return this.#rpm;
  }
}

const state = reactive({
  plain: new Engine(),          // becomes a Proxy: breaks #private access
  raw: markRaw(new Engine()),   // opted out: stays the real instance
  form: { title: "Draft", tags: ["vue"] },
});

const result = ref("");
function revBoth() {
  const lines = [];
  for (const key of ["plain", "raw"]) {
    try {
      lines.push(\`\${key}: rpm \${state[key].rev()} (isReactive \${isReactive(state[key])})\`);
    } catch (e) {
      lines.push(\`\${key}: \${e.constructor.name}: \${e.message}\`);
    }
  }
  result.value = lines.join(" | ");
}

const snapshot = ref("");
function save() {
  try {
    structuredClone(state.form); // a Proxy cannot be structured-cloned
  } catch (e) {
    snapshot.value = \`proxy: \${e.name}. \`;
  }
  // toRaw gives the original object behind the proxy, which clones fine.
  const copy = structuredClone(toRaw(state.form));
  snapshot.value += \`toRaw copy: \${JSON.stringify(copy)}\`;
}
</script>

<template>
  <button id="rev" @click="revBoth">rev both engines</button>
  <p id="result">{{ result }}</p>
  <button id="save" @click="save">snapshot the form</button>
  <p id="snapshot">{{ snapshot }}</p>
</template>
`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "When should you use readonly, markRaw, and toRaw in Vue reactivity?",
    seoDescription:
      "readonly guards state at module boundaries, markRaw keeps library objects and components unproxied, toRaw hands plain data to non-Vue code. Verified cases.",
    description: `**Question presented to candidate:**
"You are reviewing a Vue 3 codebase that uses \`readonly\`, \`markRaw\` and \`toRaw\` in various places. For each one, tell me a situation where it is the right tool, and a situation where using it would be a mistake."

**What a strong answer should cover:**
- **\`readonly\`**: expose state from a composable, store or \`provide\` so consumers can read and react but must call actions to change it. Not for immutability, not in hot paths.
- **\`markRaw\`**: third-party instances (map, chart, editor, SDK clients), classes with \`#private\` fields, component definitions held in state, large static config. Apply it **at creation**.
- **\`toRaw\`**: hand plain data to code outside Vue (\`structuredClone\`, \`postMessage\`, IndexedDB, libraries doing identity checks), or read large data without proxy overhead in an event handler.
- Mistakes: writing through \`toRaw\` (no re-render), \`markRaw\` on data the UI edits, treating \`readonly\` as a security boundary.
- Related tools: \`shallowRef\` as an alternative to \`markRaw\` for a slot that is replaced as a whole.
- Knowing the dev warning Vue prints when a component is made reactive.

**Clarifying questions expected:**
- "Who owns this state, and who is allowed to change it?"
- "Does this object come from a library that does its own change tracking?"

**Code / implementation expected:** Optional — a small screen using all three, or a review of where each belongs.`,
    answer: `**Target Audience:** Vue developers designing composables and stores, or integrating non-Vue libraries.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. Warnings, outputs and timings below come from running code on Vue 3.5.44 (Node 22, and jsdom for the component); timings are from one sandbox machine. This page is the **decision guide**. The mechanics are covered by two sibling questions: [What does readonly do in Vue's reactivity?](/interview-question/what-does-readonly-do-in-vue-s-reactivity) and [What do markRaw and toRaw do?](/interview-question/what-do-markraw-and-toraw-do).

## 1. Why This Even Matters — A Story First

Think of Vue's reactivity as customs at an airport. Everything entering the country of "reactive state" gets a tracking sticker so officials can follow it. That works well for ordinary luggage.

Three special lanes exist:

- **The display case (<code>readonly</code>)**: visitors may look at the exhibits, and the exhibits change when the museum rearranges them, but visitors cannot touch.
- **The diplomatic pouch (<code>markRaw</code>)**: sealed, never stickered, never opened. Some cargo, like a foreign government's equipment, simply must not be tampered with.
- **The exit gate (<code>toRaw</code>)**: when something leaves for a country that does not accept stickers, you peel the sticker off and hand over the bare item.

An interviewer asking "when would you use these?" wants to hear you place each lane at a **boundary**: between owner and consumer, between Vue and a library, between Vue and the outside world.

## 2. The Three Boundaries

📌 **Interview term: Ownership boundary** — the line between the code that owns state (a store, a composable, a provider) and the code that consumes it. <code>readonly</code> lives here.

📌 **Interview term: Library boundary** — the line between Vue state and objects that manage themselves: map engines, chart instances, editors, WebSocket clients, class instances with private fields, component definitions. <code>markRaw</code> lives here.

📌 **Interview term: Serialisation boundary** — the line where data leaves Vue: <code>structuredClone</code>, <code>postMessage</code> to a worker, IndexedDB, a third-party function that compares objects by identity. <code>toRaw</code> lives here.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 320" role="img" aria-label="Reactive state in the middle, readonly toward consumers, markRaw toward libraries, toRaw toward serialisation and the outside world">
  <defs>
    <marker id="q5wb-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="260" y="120" width="200" height="70" rx="12"/>
  <text class="d-text d-accent" x="360" y="150" text-anchor="middle">reactive state</text>
  <text class="d-sub" x="360" y="172" text-anchor="middle">owned by a store</text>
  <path class="d-edge-accent" d="M 360 116 L 360 76" marker-end="url(#q5wb-arrow)"/>
  <rect class="d-box" x="250" y="20" width="220" height="50" rx="10"/>
  <text class="d-text" x="360" y="42" text-anchor="middle">components</text>
  <text class="d-sub" x="360" y="60" text-anchor="middle">get readonly views</text>
  <path class="d-edge" d="M 256 155 L 196 155" marker-end="url(#q5wb-arrow)"/>
  <rect class="d-box-muted" x="20" y="125" width="170" height="60" rx="10"/>
  <text class="d-text" x="105" y="150" text-anchor="middle">library objects</text>
  <text class="d-sub" x="105" y="170" text-anchor="middle">held with markRaw</text>
  <path class="d-edge-dashed" d="M 464 155 L 524 155" marker-end="url(#q5wb-arrow)"/>
  <rect class="d-box-muted" x="530" y="125" width="170" height="60" rx="10"/>
  <text class="d-text" x="615" y="150" text-anchor="middle">outside world</text>
  <text class="d-sub" x="615" y="170" text-anchor="middle">receives toRaw data</text>
  <path class="d-edge-accent" d="M 360 252 L 360 194" marker-end="url(#q5wb-arrow)"/>
  <rect class="d-box" x="250" y="256" width="220" height="50" rx="10"/>
  <text class="d-text" x="360" y="278" text-anchor="middle">store actions</text>
  <text class="d-sub" x="360" y="296" text-anchor="middle">the only writers</text>
</svg>

Writes enter from the bottom through actions; reads leave through the top as read-only views; library objects sit beside the state without being proxied; data leaving for non-Vue code exits on the right as raw objects.

## 3. readonly: when and when not

**Use it when** a module hands state to code it does not control:

- a composable that returns state plus functions (<code>return { state: readonly(state), setQuery }</code>);
- a value passed through [provide and inject](/interview-question/what-are-provide-and-inject), which Vue's docs explicitly suggest wrapping in <code>readonly()</code> so injectors cannot mutate it;
- a hand-rolled store, where actions validate input before writing.

**Do not use it** as immutability (the owner and anyone with <code>toRaw</code> can still write), as an error mechanism (blocked writes are silently ignored in production, never thrown), or inside hot loops (it adds a proxy layer on every read).

A note on Pinia: Pinia already gives you actions and devtools tracking, and its state is writable from components by design (it can be restricted by convention or lint rules). Whether to wrap Pinia state in <code>readonly</code> is a team convention, not a Pinia feature. See [What is Pinia and why use it?](/interview-question/what-is-pinia-and-why-use-it).

## 4. markRaw: when and when not

**Use it when** the object has its own life cycle and change tracking, or breaks behind a proxy:

| Object | Why it must stay raw |
| :--- | :--- |
| Map, chart, editor or 3D engine instances | Large internal graphs; proxying them is pure overhead and some use identity checks internally |
| Classes with <code>#private</code> fields | Methods called through a proxy throw <code>TypeError: Cannot read private member</code> |
| Component definitions held in state | Vue warns, verified below |
| Big static lookup tables | Never edited, so tracking buys nothing |

The component case, verified by removing <code>markRaw</code> from the runnable example:

\`\`\`
[Vue warn]: Vue received a Component that was made a reactive object. This can lead to unnecessary performance overhead and should be avoided by marking the component with \`markRaw\` or using \`shallowRef\` instead of \`ref\`.
Component that was made reactive:  { props: { title: [Function: String] }, setup: [Function: setup] }
  at <App>
\`\`\`

📌 **Interview term: markRaw vs shallowRef** — <code>markRaw</code> marks **the object**, everywhere it goes. <code>shallowRef</code> marks **the slot**: whatever you put in it is stored unproxied, but the same object put elsewhere may be proxied. Use <code>shallowRef</code> for "the current map instance" or "the current [dynamic component](/interview-question/how-do-dynamic-components-work)", <code>markRaw</code> when the object travels through deep reactive structures, like the widget list below. The shallow APIs have their own pages: [When should you use shallowRef / shallowReactive / triggerRef?](/interview-question/when-should-you-use-shallowref-shallowreactive-triggerref).

**Do not use it** on data the UI edits (edits stop updating the screen), and do not apply it late: marking an object that already has a proxy leaves old code holding the proxy and new code getting the raw object.

## 5. toRaw: when and when not

**Use it when** data crosses the serialisation boundary or you need speed without tracking:

- <code>structuredClone(toRaw(state))</code>, since a proxy throws <code>DataCloneError</code>;
- <code>worker.postMessage(toRaw(state))</code> and IndexedDB writes, which use the same structured clone algorithm;
- passing data to a library that does <code>===</code> checks or stores objects in its own <code>WeakMap</code>;
- reading a large structure in an event handler where tracking is not needed.

That last point has a real cost behind it. Summing a nested field over 100,000 reactive rows, outside any effect and with proxies already created (median of 9 runs, Node 22):

\`\`\`
event-handler style sum of 100k rows, proxies already created: via proxy 84.0 ms | via toRaw 3.5 ms
\`\`\`

Even with no effect to track into, every read still goes through the Proxy <code>get</code> trap. <code>toRaw</code> skips that entirely.

**Do not use it** to write state (verified in the sibling page: the effect did not re-run after a raw write), inside a <code>computed</code> or template (you lose the dependencies you wanted), or as a copy (it returns the same object; mutate it and you mutate state).

## 6. Verified: one screen, all three

The runnable example holds widgets as <code>{ id, title, view: markRaw(Chart) }</code> in a deep <code>ref</code>, exposes filters through <code>readonly</code> with two actions, and saves them with <code>structuredClone(toRaw(state))</code>. Typing <code>"  SAL "</code> into the filter, toggling "only open" and saving printed:

\`\`\`
after typing '  SAL ': chart: Sales
saved: {"query":"sal","onlyOpen":true}
\`\`\`

The action trimmed and lower-cased the query before writing, which is the point of routing writes through the owner. No warnings were printed with <code>markRaw</code> in place; without it, the warning above appeared once per widget.

## 7. Decision Table

| You want to... | Use | Not |
| :--- | :--- | :--- |
| Let components read store state but not write it | <code>readonly</code> + actions | <code>Object.freeze</code> (the store could not write either) |
| Hold a Leaflet map or Chart.js instance | <code>markRaw</code> or <code>shallowRef</code> | <code>ref</code> |
| Keep a list of widgets, each with a component | <code>markRaw(Component)</code> | A deep <code>ref</code> with bare components |
| Send state to a Web Worker | <code>toRaw</code> (plus a deep copy if needed) | The proxy |
| Compare current form data to the saved version | <code>toRaw</code> or a JSON comparison | <code>===</code> between proxy and raw |
| Make a constant config impossible to change | <code>Object.freeze</code> | <code>readonly</code> |

## 8. Common Pitfalls

- **Writing through <code>toRaw</code> "for speed".** The UI does not update until something else triggers, then everything appears at once.
- **<code>toRaw</code> is shallow on nested proxies you created yourself.** It unwraps what you pass; nested values stored by Vue are raw already, but a proxy you placed into a <code>markRaw</code> or plain object stays a proxy.
- **<code>markRaw</code> on an object the UI edits.** You will spend a day wondering why the screen does not update.
- **Marking too late.** Apply <code>markRaw</code> when the instance is created, before it enters any reactive structure.
- **Treating <code>readonly</code> as protection.** <code>toRaw</code> undoes it; it documents intent and catches accidents.
- **Wrapping everything "to be safe".** Each of the three is an escape hatch. Default reactive state is correct for most app data; see [What are common reactivity caveats in Vue?](/interview-question/what-are-common-reactivity-caveats-in-vue).

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Frame it:</strong> <span style="color:#f0e2c8;">"All three are escape hatches, and I use each one at a boundary: between an owner and its consumers, between Vue and a library, and between Vue and the outside world."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. readonly:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">readonly</code> is for exposing state from a composable, store or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">provide</code>, with action functions as the only writers. It is a guard rail, not immutability, and writes are silently ignored in production."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. markRaw:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">markRaw</code> is for objects that manage themselves or break behind a proxy: map and chart instances, classes with private fields, and components held in state, where Vue even warns if I forget."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. toRaw:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toRaw</code> is for handing plain data to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">structuredClone</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">postMessage</code>, IndexedDB or identity-checking libraries, and for fast untracked reads in event handlers."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. What I avoid:</strong> <span style="color:#f0e2c8;">"I never write state through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toRaw</code>, never <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">markRaw</code> data the UI edits, and I apply <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">markRaw</code> at creation so the same object does not end up both proxied and raw."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;"><code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">markRaw</code> or <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">shallowRef</code> for a map instance?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">If it lives in one slot that I replace, a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shallowRef</code> is enough and simpler. If the instance travels through deep reactive structures, like an array of widgets, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">markRaw</code> protects it wherever it goes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Should Pinia state be wrapped in <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">readonly</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Pinia does not do it for you, because its state is meant to be writable and tracked by devtools. Some teams enforce actions by convention or lint rules; wrapping in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">readonly</code> is a team decision, not a Pinia feature.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">toRaw</code> before <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">postMessage</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Workers receive data through the structured clone algorithm, which cannot clone a Proxy. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">structuredClone(proxy)</code> throws a DataCloneError, while the raw object clones fine.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is reading through <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">toRaw</code> actually faster?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, when the data is large. I measured summing 100,000 nested values at about 84 ms through proxies and 3.5 ms through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toRaw</code>, even with no effect running, because every proxied read still goes through the get trap.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What goes wrong if you <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">markRaw</code> a form model?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The form still accepts typing because the inputs hold the DOM value, but the state edits are untracked, so computed values, validation messages and anything else derived from the model stop updating. I checked it: the input showed Ada while a computed length stayed at 0.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Ownership boundary** | Where state moves from its owner to consumers; use <code>readonly</code> |
| **Library boundary** | Where Vue state meets self-managing objects; use <code>markRaw</code> |
| **Serialisation boundary** | Where data leaves Vue for clone, worker or storage APIs; use <code>toRaw</code> |
| **markRaw vs shallowRef** | Mark the object everywhere, or just leave one slot unproxied |
| **Structured clone** | The copy algorithm behind <code>structuredClone</code>, <code>postMessage</code> and IndexedDB |
| **Action** | A function owned by the store that performs and validates writes |

---
**Conclusion:** Use each escape hatch at a boundary. <code>readonly</code> sits between an owner and its consumers so every change goes through actions; <code>markRaw</code> keeps library instances, private-field classes and component definitions out of the proxy system, which on Vue 3.5.44 also silences the "Component that was made a reactive object" warning; <code>toRaw</code> hands plain data to clone, worker and storage APIs, and made a 100,000-row read about 24 times faster in an event handler. Used inside ordinary app logic instead, all three create bugs: hidden writes, frozen screens and split identities.`,
    examples: [
      {
        label: "One screen, three escape hatches: markRaw widgets, readonly store, toRaw snapshot",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { computed, defineComponent, h, markRaw, reactive, readonly, ref, shallowRef, toRaw } from "vue";

// --- 1. markRaw: things Vue should hold but never track ---------------------
const Chart = defineComponent({ props: { title: String }, setup: (p) => () => h("em", "chart: " + p.title) });
const Table = defineComponent({ props: { title: String }, setup: (p) => () => h("em", "table: " + p.title) });

// Widgets carry a component AND data. The component must not become a proxy.
const widgets = ref([
  { id: 1, title: "Sales", view: markRaw(Chart) },
  { id: 2, title: "Orders", view: markRaw(Table) },
]);

// --- 2. readonly: a store that owns its writes ------------------------------
function createFilters() {
  const state = reactive({ query: "", onlyOpen: false });
  return {
    state: readonly(state), // consumers can read and watch, not write
    setQuery: (q) => (state.query = q.trim().toLowerCase()), // one place that validates
    toggleOpen: () => (state.onlyOpen = !state.onlyOpen),
    // --- 3. toRaw: hand a plain copy to code outside Vue ----------------------
    serialize: () => structuredClone(toRaw(state)),
  };
}
const filters = createFilters();
const visible = computed(() =>
  widgets.value.filter((w) => w.title.toLowerCase().includes(filters.state.query))
);
const saved = ref("");
</script>

<template>
  <input id="q" placeholder="filter widgets" @input="filters.setQuery($event.target.value)" />
  <button id="open" @click="filters.toggleOpen">only open: {{ filters.state.onlyOpen }}</button>
  <button id="save" @click="saved = JSON.stringify(filters.serialize())">save filters</button>
  <p id="saved">{{ saved }}</p>
  <ul>
    <li v-for="w in visible" :key="w.id"><component :is="w.view" :title="w.title" /></li>
  </ul>
</template>
`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is effectScope?",
    seoDescription:
      "effectScope() collects the watchers and effects created inside run() so one stop() disposes them all. API, nesting, detached scopes and 3.5 pause/resume.",
    description: `**Question presented to candidate:**
"Vue exports something called \`effectScope\`. What is it, what does it collect, and what exactly happens when you call \`stop()\` on it?"

**What a strong answer should cover:**
- An **effect scope** is a container: effects created **synchronously** inside \`scope.run(fn)\` (\`watch\`, \`watchEffect\`, nested scopes) are recorded in it.
- \`scope.stop()\` stops every collected effect, runs every \`onScopeDispose\` callback and stops child scopes; \`scope.active\` becomes \`false\`.
- Scopes **nest**: a scope created inside another is stopped with its parent, unless created with \`effectScope(true)\` (**detached**).
- Every component instance has its own scope; that is how Vue stops a component's watchers on unmount.
- \`getCurrentScope()\` and \`onScopeDispose()\` let library code find and hook into the active scope; Vue 3.5 added \`pause()\` and \`resume()\`.
- \`run()\` on a stopped scope warns and returns \`undefined\`; the API arrived in Vue 3.2.

**Clarifying questions expected:**
- "Are we talking about the API itself, or how composables use it for cleanup?"

**Code / implementation expected:** Optional — create a scope with a watcher and a dispose callback, stop it, and show nothing fires afterwards.`,
    answer: `**Target Audience:** Vue developers writing composables or libraries, or curious how components clean up their watchers.
**Difficulty:** Hard

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. Every log line below was printed by running the code on Vue 3.5.44, as Node scripts against the <code>vue</code> package and as an SFC mounted in jsdom. This page is about **the API itself**. How composables use it to clean up (shared composables, async leaks, <code>onScopeDispose</code> vs <code>onUnmounted</code>) is the sibling question [What is effectScope() and why do composables use it for cleanup?](/interview-question/what-is-effectscope-and-why-do-composables-use-it-for-cleanup).

## 1. Why This Even Matters — A Story First

You throw a party and hire a caterer, a DJ and a photographer. At midnight you could find each one and tell them separately to stop, and you will probably forget the photographer, who keeps taking pictures of an empty room until 3 a.m.

Or you hire an **event manager**. Everyone you book while the manager is on the phone gets added to the manager's list. At midnight you say one sentence, "we are done", and the manager sends everyone home, then runs the cleanup checklist.

<code>effectScope()</code> is the event manager. Watchers and effects are the staff. <code>scope.stop()</code> is "we are done". Vue itself uses one of these per component, which is why your watchers stop when a component unmounts.

## 2. The Core Idea

📌 **Interview term: Reactive effect** — a function Vue re-runs when its reactive dependencies change: a component render, a <code>watch</code> callback, a <code>watchEffect</code>. Each effect holds subscriptions to the refs and proxies it read. If nobody stops it, it keeps those subscriptions, and keeps running, for as long as its sources live.

📌 **Interview term: effectScope()** — creates an <code>EffectScope</code>. While <code>scope.run(fn)</code> is executing <code>fn</code>, the scope is the **active scope**, and every effect created during that **synchronous** run registers itself in it. <code>run</code> returns whatever <code>fn</code> returns.

📌 **Interview term: scope.stop()** — stops every collected effect, runs every cleanup registered with <code>onScopeDispose</code>, and stops child scopes. Afterwards <code>scope.active</code> is <code>false</code>.

📌 **Interview term: onScopeDispose()** — registers a callback on the **currently active** scope, to run when that scope stops. It is the scope-level equivalent of <code>onUnmounted</code>, and it works with or without a component.

## 3. Verified: the basic life cycle

\`\`\`
  watchEffect saw 0 doubled 0
  getCurrentScope() === scope: true
run() returned: [ 'doubled' ] doubled = 0
  watch saw 1
  watchEffect saw 1 doubled 2
scope.active before stop: true
  onScopeDispose callback ran
scope.active after stop: false
after stop and count=2: (no watch/effect output above), doubled.value = 4
[Vue warn] cannot run an inactive effect scope.
run on stopped scope returns: undefined
\`\`\`

Inside the scope a <code>computed</code>, a <code>watch</code>, a <code>watchEffect</code> and an <code>onScopeDispose</code> callback were created. After <code>stop()</code>, changing <code>count</code> produced no watcher output at all.

The <code>doubled.value = 4</code> line is a Vue 3.5 detail worth knowing. Since the 3.5 reactivity rewrite, a <code>computed</code> is **not** registered in the scope: it is a lazy value that subscribes to its sources only while something subscribes to it. When the scope stopped the <code>watchEffect</code> that read it, the computed lost its last subscriber and unlinked itself; a check of the source ref's subscriber list showed it empty after <code>stop()</code>. Reading it later simply recomputes on demand, like a getter. So in 3.5, "the scope disposes computeds" is true in effect, though not literally.

## 4. Nesting and Detached Scopes

📌 **Interview term: Child scope** — a scope created while another scope is active becomes its child and is stopped with it.

📌 **Interview term: Detached scope** — <code>effectScope(true)</code> creates a scope with **no parent**. It survives its creator and must be stopped explicitly. This is what shared, app-wide composables use.

\`\`\`
stopping parent:
  parent disposed
  child disposed
child.active: false  detached.active: true
  detached disposed
\`\`\`

The order is visible here: the parent stops its own effects and runs its own cleanups first, then stops its children. The detached scope stayed active until it was stopped by hand.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 320" role="img" aria-label="A parent scope collects effects, cleanups and a child scope, stop cascades to all of them, a detached scope is not collected">
  <defs>
    <marker id="q6es-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="220" y="20" width="280" height="56" rx="12"/>
  <text class="d-text d-accent" x="360" y="44" text-anchor="middle">parent scope</text>
  <text class="d-sub" x="360" y="64" text-anchor="middle">scope.stop() cascades down</text>
  <path class="d-edge-accent" d="M 280 80 L 130 150" marker-end="url(#q6es-arrow)"/>
  <path class="d-edge-accent" d="M 360 80 L 360 150" marker-end="url(#q6es-arrow)"/>
  <path class="d-edge-accent" d="M 440 80 L 590 150" marker-end="url(#q6es-arrow)"/>
  <rect class="d-box" x="40" y="155" width="180" height="56" rx="10"/>
  <text class="d-text" x="130" y="180" text-anchor="middle">effects</text>
  <text class="d-sub" x="130" y="200" text-anchor="middle">watch, watchEffect</text>
  <rect class="d-box" x="270" y="155" width="180" height="56" rx="10"/>
  <text class="d-text" x="360" y="180" text-anchor="middle">cleanups</text>
  <text class="d-sub" x="360" y="200" text-anchor="middle">onScopeDispose</text>
  <rect class="d-box" x="500" y="155" width="180" height="56" rx="10"/>
  <text class="d-text" x="590" y="180" text-anchor="middle">child scopes</text>
  <text class="d-sub" x="590" y="200" text-anchor="middle">stopped last</text>
  <rect class="d-box-muted" x="500" y="250" width="180" height="56" rx="10"/>
  <text class="d-text" x="590" y="275" text-anchor="middle">detached scope</text>
  <text class="d-sub" x="590" y="295" text-anchor="middle">effectScope(true)</text>
  <path class="d-edge-dashed" d="M 440 278 L 494 278"/>
  <text class="d-sub" x="360" y="282" text-anchor="middle">not collected</text>
</svg>

Stopping the parent reaches everything connected by the solid arrows, in the order effects, cleanups, children. The detached scope is created inside the parent but never attached to it.

## 5. Pause and Resume (Vue 3.5)

Vue 3.5.0 (September 2024) added <code>pause()</code> and <code>resume()</code> to <code>EffectScope</code>, <code>ReactiveEffect</code> and the handle returned by <code>watch</code> (changelog entry "add pause/resume for ReactiveEffect, EffectScope, and WatchHandle", PR #9651). The runnable example drives them from buttons:

\`\`\`
start   scope: active | count: 0                   ["watchEffect: doubled is 0"]
inc     scope: active | count: 1                   ["watch: count is 1","watchEffect: doubled is 2"]
pause   scope: paused | count: 1                   []
inc     scope: paused | count: 2                   []
inc     scope: paused | count: 3                   []
resume  scope: active | count: 3                   ["watch: count is 3","watchEffect: doubled is 6"]
inc     scope: active | count: 4                   ["watch: count is 4","watchEffect: doubled is 8"]
stop    scope: stopped (active = false) | count: 4 ["onScopeDispose: cleanup ran"]
inc     scope: stopped (active = false) | count: 5 []
\`\`\`

While paused, two changes produced nothing. On <code>resume()</code> each effect ran **once**, with the latest value 3; the intermediate value 2 was never seen. Pausing defers and coalesces, it does not queue a replay. <code>stop()</code> then disposed everything for good.

## 6. Where Vue Itself Uses Scopes

| Owner | What it does with a scope |
| :--- | :--- |
| Every component instance | Runs <code>setup()</code> inside the instance scope (created detached, as <code>new EffectScope(true)</code> in the 3.5.44 runtime); unmount stops it, which stops the render effect and every watcher created during setup |
| Pinia | The Pinia instance owns a detached scope, and each store's setup runs in its own scope created inside it, so <code>store.$dispose()</code> can stop that store's watchers (read from the pinia 4.1.0 source) |
| VueUse helpers | Use <code>tryOnScopeDispose</code> (a safe <code>onScopeDispose</code>) so the same composable cleans up inside components and inside plain scopes |
| Your composables | Group effects you need to stop together, or share one set of effects across consumers |

The component row is why [watchers](/interview-question/what-is-the-difference-between-watch-and-watcheffect) created synchronously in <code>setup</code> need no manual cleanup, and why one created later, after an <code>await</code> or in a timer, does: by then no scope is active. The sibling page demonstrates that leak.

## 7. API at a Glance

| API | Purpose |
| :--- | :--- |
| <code>effectScope(detached?)</code> | Create a scope, attached to the active one unless <code>detached</code> is true |
| <code>scope.run(fn)</code> | Run <code>fn</code> with this scope active, return its result; warns and returns <code>undefined</code> if stopped |
| <code>scope.stop()</code> | Stop effects, run cleanups, stop children |
| <code>scope.pause()</code> / <code>resume()</code> | Suspend and resume all effects (3.5+) |
| <code>scope.active</code> | <code>false</code> after <code>stop()</code> |
| <code>getCurrentScope()</code> | The active scope, or <code>undefined</code> |
| <code>onScopeDispose(fn)</code> | Register cleanup on the active scope; warns <code>onScopeDispose() is called when there is no active effect scope to be associated with.</code> if there is none |

The API itself arrived in Vue 3.2, released in August 2021, from the "reactivity effect scope" RFC 0041 (sources: the <a href="https://blog.vuejs.org/posts/vue-3-2" target="_blank" rel="noopener noreferrer">Vue 3.2 announcement</a> and the RFC link in Vue's own typings for <code>effectScope</code>).

## 8. Common Pitfalls

- **Creating effects asynchronously inside <code>run</code>.** Only the synchronous part of <code>fn</code> is collected. A <code>watch</code> created after an <code>await</code> inside <code>run</code> escapes the scope: in a verified run the scope held 1 effect instead of 2, and after <code>stop()</code> the escaped watcher still printed <code>after-await watcher saw 1</code>. Call <code>scope.run</code> again from the async code instead.
- **Forgetting to stop a detached scope.** It has no parent by design, so nothing will stop it for you.
- **Calling <code>run</code> after <code>stop</code>.** It warns <code>cannot run an inactive effect scope.</code> and returns <code>undefined</code>; destructuring that result throws.
- **Expecting <code>pause</code> to replay changes.** As verified, effects run once with the latest value on resume.
- **Calling <code>onScopeDispose</code> outside any scope.** It warns and the cleanup is never registered.
- **Assuming the scope holds computeds in 3.5.** It does not; they are cleaned up by losing their subscribers. Code that inspects <code>scope.effects</code> will not find them.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">effectScope()</code> creates a container that collects the reactive effects created inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">scope.run()</code>, so one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">scope.stop()</code> disposes all of them."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. What it collects:</strong> <span style="color:#f0e2c8;">"Watchers and watchEffects created synchronously during <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">run</code>, child scopes, and cleanups registered with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onScopeDispose</code>. Since Vue 3.5 computeds are not registered, they unlink when their subscribers stop."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. What stop does:</strong> <span style="color:#f0e2c8;">"It stops the effects, runs the dispose callbacks, then stops child scopes, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">active</code> becomes false. Running a stopped scope warns and returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Nesting:</strong> <span style="color:#f0e2c8;">"Scopes nest, so stopping a parent stops its children. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">effectScope(true)</code> creates a detached scope that survives its creator and must be stopped by hand."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Where it shows up:</strong> <span style="color:#f0e2c8;">"Every component has one, which is why setup watchers stop on unmount. Pinia stores and composables use it too, and 3.5 added <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pause</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">resume</code>."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">onScopeDispose</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">onUnmounted</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onUnmounted</code> needs a component instance and warns without one. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onScopeDispose</code> needs only an active scope, and inside a component the active scope is the component scope, so it runs on unmount too.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Are effects created after an <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">await</code> inside <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">run</code> collected?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. The scope is active only during the synchronous part of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">run</code>. After the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await</code>, nothing is active, so the effect escapes. Wrap the later code in another <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">scope.run</code> call.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">pause</code> do to changes that happen while paused?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">They are not replayed. In my test, two increments while paused produced nothing, and on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">resume</code> each effect ran once with the latest value.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why would you create a detached scope?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For state that outlives the component that created it, such as a shared composable used by several components. A detached scope is not stopped with its creator, so the last consumer stops it instead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When did <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">effectScope</code> arrive, and why?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In Vue 3.2, released in August 2021, from RFC 0041. Before it, only components collected their effects, so code running outside a component had to track and stop every watcher by hand.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Reactive effect** | A function Vue re-runs when its dependencies change |
| **effectScope()** | A container that records effects created during its <code>run()</code> |
| **Active scope** | The scope effects register into right now |
| **scope.stop()** | Stop effects, run cleanups, stop child scopes |
| **onScopeDispose()** | Cleanup callback for the active scope |
| **Child scope** | Scope created inside another; stopped with its parent |
| **Detached scope** | <code>effectScope(true)</code>; no parent, stop it yourself |

---
**Conclusion:** An effect scope is the event manager for reactive effects: everything created synchronously inside <code>scope.run()</code> is recorded, and one <code>stop()</code> stops the watchers, runs the <code>onScopeDispose</code> cleanups and then stops child scopes, exactly in that order on Vue 3.5.44. Components get one automatically, detached scopes live until you stop them, and 3.5 added <code>pause()</code>/<code>resume()</code>, which coalesce changes rather than replay them. That machinery is what makes reliable composable cleanup possible, the subject of the [sibling question](/interview-question/what-is-effectscope-and-why-do-composables-use-it-for-cleanup).`,
    examples: [
      {
        label: "effectScope playground: run, pause, resume, stop",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { computed, effectScope, onScopeDispose, ref, watch, watchEffect } from "vue";

const count = ref(0);
const log = ref([]);
const say = (msg) => log.value.push(msg);

let scope = null;
const status = ref("no scope");

function start() {
  if (scope) scope.stop(); // never leak a previous scope
  scope = effectScope(true); // detached, so it is not tied to this component
  scope.run(() => {
    const doubled = computed(() => count.value * 2);
    watch(count, (n) => say(\`watch: count is \${n}\`));
    watchEffect(() => say(\`watchEffect: doubled is \${doubled.value}\`));
    onScopeDispose(() => say("onScopeDispose: cleanup ran"));
  });
  status.value = "active";
}
function pause() { scope.pause(); status.value = "paused"; }
function resume() { scope.resume(); status.value = "active"; }
function stop() { scope.stop(); status.value = "stopped (active = " + scope.active + ")"; }
</script>

<template>
  <p id="status">scope: {{ status }} | count: {{ count }}</p>
  <button id="start" @click="start">start scope</button>
  <button id="inc" @click="count++">count++</button>
  <button id="pause" @click="pause">pause</button>
  <button id="resume" @click="resume">resume</button>
  <button id="stop" @click="stop">stop</button>
  <ol>
    <li v-for="(line, i) in log" :key="i">{{ line }}</li>
  </ol>
</template>
`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is effectScope() and why do composables use it for cleanup?",
    seoDescription:
      "Composables use effectScope and onScopeDispose to clean up in components, stores and tests, share one set of effects, and avoid leaks from async watchers.",
    description: `**Question presented to candidate:**
"You are writing a composable library. Why would you clean up with \`onScopeDispose\` and \`effectScope\` instead of \`onUnmounted\`, and how would you build a composable that several components share without duplicating its watchers?"

**What a strong answer should cover:**
- Composables are called from components, Pinia stores, other composables and tests; \`onUnmounted\` works only in the first and warns elsewhere.
- \`onScopeDispose\` attaches cleanup to **whatever scope is active**, which inside a component is the component scope, so it covers every case.
- Effects created **after an \`await\` or in a callback** are not owned by any scope and leak; capture a scope synchronously and \`scope.run()\` later.
- **Shared composables**: run the composable once in a **detached** \`effectScope(true)\`, count consumers, and \`stop()\` when the last one disposes (the pattern behind VueUse \`createSharedComposable\`).
- Testing: run a composable inside \`effectScope()\` and call \`stop()\` to assert cleanup, no component mount needed.
- Use \`getCurrentScope()\` to make cleanup optional when the composable may run outside any scope.

**Clarifying questions expected:**
- "Will this composable be used inside Pinia stores or only in components?"
- "Should several components share one instance of the state, or get their own?"

**Code / implementation expected:** Yes — a shared composable with reference counting, or a demonstration of an async watcher leak and its fix.`,
    answer: `**Target Audience:** Vue developers writing reusable composables or composable libraries.
**Difficulty:** Hard

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. Every log and warning below comes from running code on Vue 3.5.44: the two runnable examples were mounted in jsdom with the repo verifier, the rest are Node scripts. The API itself (what <code>run</code>, <code>stop</code>, nesting and <code>pause</code> do) is covered in the sibling [What is effectScope?](/interview-question/what-is-effectscope); this page is about **using** it in [composables](/interview-question/what-are-composables-in-vue).

## 1. Why This Even Matters — A Story First

A library lends out tools. Each tool comes with a return slip that says when it must come back. A normal borrower, a component, has a fixed end date: the day it unmounts. Vue takes everything back on that day automatically.

But your composable is a tool that gets borrowed by all kinds of people. Sometimes a component borrows it. Sometimes a Pinia store does, and stores never "unmount". Sometimes a test does, with no component at all. And sometimes five components want to share **one** copy of the tool instead of five.

If your return slip says "return when the component unmounts" (<code>onUnmounted</code>), it is useless for the store and the test, and it makes five copies for the five components. A return slip that says "return when **whoever borrowed this** is done" (<code>onScopeDispose</code>), plus a shared shelf with a borrower count (a detached <code>effectScope</code>), covers every case. That is why well-written composables reach for scopes.

## 2. The Problem: Who Owns a Composable's Effects?

📌 **Interview term: Owner scope** — the effect scope that is active when an effect is created. The effect is stopped when its owner scope stops. During a component's <code>setup()</code>, the owner is the component's own scope, which stops on unmount.

📌 **Interview term: Orphaned effect** — an effect created when **no scope is active**: after an <code>await</code>, inside a <code>setTimeout</code>, inside a promise callback or an event handler. Nothing will stop it, so it keeps running and keeps its sources and closures alive.

The second runnable example creates one watcher in a timer callback (orphaned) and one through a scope captured during setup:

\`\`\`
tick while mounted:
  [leaky] watcher still alive, saw 1
  [fixed] watcher saw 1
unmount both:
  [fixed] scope disposed with the component
tick after unmount:
  [leaky] watcher still alive, saw 2
\`\`\`

The component was gone, yet the leaky watcher kept firing. The fix was three lines: create <code>effectScope()</code> **synchronously** in setup (so it becomes a child of the component scope), and later call <code>scope.run(() => watch(...))</code> from the timer.

## 3. onScopeDispose instead of onUnmounted

📌 **Interview term: onScopeDispose()** — registers cleanup on the active scope. In a component, that is the component scope, so it runs on unmount, just like <code>onUnmounted</code>. In a Pinia store it runs on <code>store.$dispose()</code>; in a test it runs on <code>scope.stop()</code>.

Calling <code>onUnmounted</code> outside a component, verified in Node:

\`\`\`
[Vue warn]: onUnmounted is called when there is no active component instance to be associated with. Lifecycle injection APIs can only be used during execution of setup(). If you are using async setup(), make sure to register lifecycle hooks before the first await statement.
onScopeDispose ran on scope.stop()
\`\`\`

The <code>onUnmounted</code> callback was never registered; the <code>onScopeDispose</code> one ran. So library composables should register cleanup with <code>onScopeDispose</code>, and keep <code>onMounted</code> only for work that genuinely needs the DOM. See [What are Vue lifecycle hooks?](/interview-question/what-are-vue-lifecycle-hooks) for the component side.

📌 **Interview term: Optional cleanup guard** — <code>if (getCurrentScope()) onScopeDispose(cleanup)</code>. It avoids the "no active effect scope" warning when a composable is deliberately called outside any scope. VueUse ships this as <code>tryOnScopeDispose</code>.

## 4. Testing a Composable Without Mounting

A scope is all a composable needs to be tested in isolation. A small <code>useEventCount(target, type)</code> that adds a listener and removes it in <code>onScopeDispose</code>, run in Node:

\`\`\`
inside scope, count: 1
after scope.stop(), count: 1
called with no scope, count: 1
\`\`\`

Inside the scope the event counted; after <code>scope.stop()</code> the listener was gone, so the count stayed at 1. Called with no scope at all, the guard skipped cleanup silently. In Vitest the same three lines (<code>effectScope()</code>, <code>run</code>, <code>stop</code>) replace mounting a dummy component. See [How do you test Vue components (Vitest and Vue Test Utils)?](/interview-question/how-do-you-test-vue-components-vitest-and-vue-test-utils).

## 5. Shared Composables: one set of effects, many consumers

If five components each call <code>useMouse()</code>, you get five listeners and five copies of the state. A **shared composable** runs the real composable once and hands every caller the same state.

📌 **Interview term: Shared composable** — a wrapper that runs a composable inside a **detached** scope on first use, counts callers, and stops the scope when the last caller's own scope disposes. Detached is essential: if the scope were a child of the first caller, unmounting that one component would kill the shared state for everybody.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 330" role="img" aria-label="Two components call a shared composable, the first call starts a detached scope, each consumer registers a dispose callback that decrements a counter, the last one stops the scope">
  <defs>
    <marker id="q7sc-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="30" width="180" height="56" rx="10"/>
  <text class="d-text" x="130" y="56" text-anchor="middle">component A</text>
  <text class="d-sub" x="130" y="76" text-anchor="middle">users = 1</text>
  <rect class="d-box" x="40" y="130" width="180" height="56" rx="10"/>
  <text class="d-text" x="130" y="156" text-anchor="middle">component B</text>
  <text class="d-sub" x="130" y="176" text-anchor="middle">users = 2</text>
  <path class="d-edge-accent" d="M 224 58 L 404 112" marker-end="url(#q7sc-arrow)"/>
  <path class="d-edge-accent" d="M 224 158 L 404 132" marker-end="url(#q7sc-arrow)"/>
  <rect class="d-box-accent" x="410" y="80" width="270" height="80" rx="12"/>
  <text class="d-text d-accent" x="545" y="110" text-anchor="middle">detached effectScope</text>
  <text class="d-sub" x="545" y="134" text-anchor="middle">one watcher, one listener</text>
  <rect class="d-box-muted" x="40" y="250" width="320" height="56" rx="10"/>
  <text class="d-text" x="200" y="276" text-anchor="middle">onScopeDispose in each consumer</text>
  <text class="d-sub" x="200" y="296" text-anchor="middle">users minus 1</text>
  <path class="d-edge-dashed" d="M 364 278 L 540 278 L 540 166" marker-end="url(#q7sc-arrow)"/>
  <text class="d-sub" x="600" y="230" text-anchor="middle">at 0: scope.stop()</text>
</svg>

Each consumer registers its own dispose callback in its own component scope. The callbacks only decrement the counter; the one that brings it to zero stops the shared scope.

The first runnable example implements exactly this with a <code>createShared()</code> helper of about 20 lines:

\`\`\`
mounted                    badges: A:0 B:0    new log: ["shared scope: started"]
tick                       badges: A:1 B:1    new log: ["shared watcher saw 1"]
hide A                     badges: B:1        new log: []
tick                       badges: B:2        new log: ["shared watcher saw 2"]
hide B (last consumer)     badges: (none)     new log: ["shared scope: stopped"]
tick with no consumers     badges: (none)     new log: []
show A again               badges: A:0        new log: ["shared scope: started"]
tick                       badges: A:4        new log: ["shared watcher saw 4"]
\`\`\`

Two consumers, but one "started" and one watcher line per tick. Hiding A (the component that created the scope) did not stop it. Hiding B, the last consumer, did. When A came back, a fresh scope started and its state began from 0. That last detail is a design choice. VueUse's <code>createSharedComposable</code> works the same way (detached scope, subscriber count, <code>tryOnScopeDispose</code>, state cleared at zero), and on the server it returns the original composable unshared, so one request cannot leak state into another (read from its source on GitHub). If the state should survive with no consumers, keep it outside the scope and put only the effects inside.

## 6. Other Patterns That Need a Scope

| Pattern | Why a scope helps |
| :--- | :--- |
| Feature that can be switched on and off (live tracking, polling) | Start a child scope on enable, <code>stop()</code> it on disable; all its watchers go at once |
| Effects created after an <code>await</code> in setup | Capture <code>effectScope()</code> before the <code>await</code>, then <code>scope.run</code> after it |
| Composable used inside a Pinia setup store | <code>onScopeDispose</code> runs on <code>store.$dispose()</code> (verified with pinia 4.1.0); <code>onUnmounted</code> would warn |
| App-wide singletons created lazily | Detached scope, so no single component owns them |
| A list of dynamic subscriptions (one per item) | One child scope per item, stopped when the item is removed |

For the <code>await</code> case, the component rule is stated in the warning above: lifecycle hooks must be registered before the first <code>await</code>. The same is true for watchers, which is why [async setup](/interview-question/what-is-async-setup-and-top-level-await) is a common source of leaks.

## 7. Common Pitfalls

- **Using <code>onUnmounted</code> in a library composable.** It warns in stores and tests and never runs there. Use <code>onScopeDispose</code>.
- **Creating the scope inside the async callback.** <code>effectScope()</code> called in a timer is itself orphaned. Create it synchronously in setup so the component owns it.
- **Making a shared scope non-detached.** It becomes a child of the first consumer and dies when that consumer unmounts, while others still use the state.
- **Forgetting the counter.** Stopping the shared scope in every consumer's dispose callback breaks the remaining consumers.
- **Stopping and reusing the same scope.** A stopped scope cannot run again (it warns <code>cannot run an inactive effect scope.</code>); create a new one, as the example does on "show A again".
- **Leaking non-reactive resources.** A scope stops Vue effects only. Event listeners, intervals, sockets and observers need an explicit <code>onScopeDispose</code> each.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The problem:</strong> <span style="color:#f0e2c8;">"A composable runs inside components, Pinia stores, other composables and tests, and only the first has an unmount. Its watchers and listeners still need a clear owner that stops them."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. onScopeDispose:</strong> <span style="color:#f0e2c8;">"So I register cleanup with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onScopeDispose</code>, which attaches to whatever scope is active. In a component that is the component scope, in a store it runs on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$dispose</code>, and in a test on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">scope.stop()</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onUnmounted</code> would just warn there."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Async leaks:</strong> <span style="color:#f0e2c8;">"Effects created after an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await</code> or in a callback have no owner and keep running after unmount. I capture an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">effectScope()</code> synchronously in setup and call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">scope.run</code> later."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Shared composables:</strong> <span style="color:#f0e2c8;">"To share one instance across components, I run the composable once in a detached <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">effectScope(true)</code>, count consumers, and stop the scope when the last consumer disposes. That is the idea behind VueUse <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">createSharedComposable</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Testing:</strong> <span style="color:#f0e2c8;">"Tests get the same benefit: run the composable inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">effectScope()</code>, assert, call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">stop()</code>, and check that listeners were removed, without mounting anything."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why must the shared scope be detached?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A non-detached scope becomes a child of whichever component called first, so unmounting that one component would stop the shared watchers for everyone. In my demo, hiding the component that created the scope left it running for the other consumer.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does stopping a scope remove <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">addEventListener</code> listeners?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. A scope stops Vue effects only. Listeners, intervals, sockets and observers need their own <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onScopeDispose</code> callback, which the scope runs when it stops.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you handle a watcher you need after an <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">await</code> in setup?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Create <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const scope = effectScope()</code> before the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await</code>, which makes it a child of the component scope, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">scope.run(() =&gt; watch(...))</code> afterwards. It then stops with the component.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if a composable calls <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">onScopeDispose</code> with no active scope?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Vue warns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onScopeDispose() is called when there is no active effect scope to be associated with.</code> and the callback is dropped. A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">getCurrentScope()</code> guard makes cleanup optional instead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When the last consumer leaves, should shared state reset?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is a design choice. With the scope stopped and recreated, state starts fresh, as in my demo. If it must persist, keep the state outside the scope and only put the effects inside.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Owner scope** | The scope active when an effect is created; it stops the effect |
| **Orphaned effect** | Effect created with no active scope; nothing stops it |
| **onScopeDispose()** | Cleanup on the active scope: component, store, test or custom |
| **Optional cleanup guard** | <code>getCurrentScope()</code> check before <code>onScopeDispose</code> |
| **Shared composable** | Runs once in a detached scope, counted consumers, stopped by the last |
| **Detached scope** | <code>effectScope(true)</code>; no parent, so no single consumer owns it |

---
**Conclusion:** Composables use effect scopes because they run in more places than components. <code>onScopeDispose</code> ties cleanup to whatever scope is active, so the same composable cleans up on component unmount, on <code>store.$dispose()</code> and on <code>scope.stop()</code> in a test, where <code>onUnmounted</code> only warns. A scope captured synchronously rescues effects created later, which the verified leak demo showed firing after unmount without it, and a detached scope with a consumer counter lets many components share one set of watchers that stops exactly when the last one leaves.`,
    examples: [
      {
        label: "Shared composable: one detached scope, reference-counted consumers",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { defineComponent, effectScope, h, onScopeDispose, ref, watch } from "vue";

// A global "store" every consumer reads from.
const ticks = ref(0);
const log = ref([]);
const say = (msg) => log.value.push(msg);

// createShared: run the composable ONCE in a detached scope, count consumers,
// and stop the scope when the last consumer goes away.
function createShared(composable) {
  let users = 0;
  let state;
  let scope;
  return () => {
    users++;
    if (!scope) {
      scope = effectScope(true); // detached: not owned by whichever component came first
      state = scope.run(composable);
    }
    onScopeDispose(() => {      // runs when the calling component unmounts
      users--;
      if (users === 0) {
        scope.stop();
        scope = state = undefined;
      }
    });
    return state;
  };
}

// The expensive composable: one watcher, one cleanup, however many consumers.
const useTickWatcher = createShared(() => {
  say("shared scope: started");
  const seen = ref(0);
  watch(ticks, (n) => { seen.value = n; say("shared watcher saw " + n); });
  onScopeDispose(() => say("shared scope: stopped"));
  return { seen };
});

const Badge = defineComponent({
  props: { name: String },
  setup(props) {
    const { seen } = useTickWatcher();
    return () => h("span", { class: "badge" }, props.name + ":" + seen.value + " ");
  },
});

const showA = ref(true);
const showB = ref(true);
</script>

<template>
  <button id="tick" @click="ticks++">tick ({{ ticks }})</button>
  <button id="a" @click="showA = !showA">toggle A</button>
  <button id="b" @click="showB = !showB">toggle B</button>
  <p>
    <Badge v-if="showA" name="A" />
    <Badge v-if="showB" name="B" />
  </p>
  <ol>
    <li v-for="(line, i) in log" :key="i">{{ line }}</li>
  </ol>
</template>
`,
      },
      {
        label: "Leak: a watcher created in a timer survives unmount, a scoped one does not",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { defineComponent, effectScope, h, onScopeDispose, ref, watch } from "vue";
const ticks = ref(0);
const show = ref(true);

const Leaky = defineComponent({
  setup() {
    // Created later, outside setup's synchronous run: no owner scope.
    setTimeout(() => watch(ticks, (n) => console.log("  [leaky] watcher still alive, saw", n)));
    return () => h("span", "leaky ");
  },
});

const Fixed = defineComponent({
  setup() {
    const scope = effectScope();          // created synchronously, so the component owns it
    setTimeout(() => scope.run(() => watch(ticks, (n) => console.log("  [fixed] watcher saw", n))));
    onScopeDispose(() => console.log("  [fixed] scope disposed with the component"));
    return () => h("span", "fixed ");
  },
});

</script>

<template>
  <button @click="ticks++">tick</button>
  <button @click="show = !show">toggle</button>
  <p v-if="show"><Leaky /><Fixed /></p>
</template>
`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are v-once and v-memo?",
    seoDescription:
      "v-once renders a subtree once and caches it; v-memo re-renders only when its dependency array changes. Compiled output, render counts, pitfalls.",
    description: `**Question presented to candidate:**
"What do \`v-once\` and \`v-memo\` do? Walk me through how the compiled render function differs for each, and tell me when \`v-memo\` is worth using and how it can bite you."

**What a strong answer should cover:**
- \`v-once\` renders an element or component **once**; later renders reuse the cached VNode, so it never updates even if its data changes.
- \`v-memo="[a, b]"\` caches a subtree and **reuses it while every value in the array is unchanged**; \`v-memo="[]"\` behaves like \`v-once\`.
- Compiled output: \`v-once\` becomes a \`_cache[i] || (...)\` expression with \`setBlockTracking(-1)\`; \`v-memo\` becomes \`_withMemo(deps, render, _cache, i)\`; on a \`v-for\` it becomes an inline \`_isMemoSame\` check per item, also comparing the \`key\`.
- A cache hit skips **creating the VNodes and diffing them**, not just DOM updates.
- Main use: large \`v-for\` lists where only a few rows change (such as the selected row); the dependency array must include everything that should cause an update.
- Pitfalls: stale UI from missing dependencies, \`v-memo\` placed **inside** a \`v-for\` instead of on it, and both directives being ignored during SSR.

**Clarifying questions expected:**
- "How large is the list, and what changes between renders?"
- "Has profiling shown the render function itself as the bottleneck?"

**Code / implementation expected:** Yes — compiled output for each directive, or a list with \`v-memo\` keyed on selection.`,
    answer: `**Target Audience:** Vue developers optimising rendering, and anyone asked how Vue templates compile.
**Difficulty:** Hard

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. The compiled render functions below were printed by <code>compile()</code> from <code>@vue/compiler-dom</code> and <code>@vue/compiler-ssr</code> 3.5.44 (the import lines are trimmed); render counts and behaviour come from mounting the SFCs in jsdom with the repo verifier. For the compiler's automatic optimisations (static hoisting, patch flags, blocks) see [How does the Vue compiler optimize templates?](/interview-question/how-does-the-vue-compiler-optimize-templates-static-hoisting-patch-flags-block-t).

## 1. Why This Even Matters — A Story First

A newspaper prints a fresh edition every hour. Most pages are identical from hour to hour: the masthead never changes, and the weather page changes only when the forecast changes.

A sensible print shop does two things. The masthead is cast in metal **once** and reused forever. The weather page is kept on the shelf with a sticky note listing what it depends on: "today's forecast, the city". Every hour, the shop checks the note. Same forecast, same city? Reuse the plate. Anything different? Make a new one.

The metal masthead is <code>v-once</code>. The sticky note is <code>v-memo</code>. Both let Vue skip work that is not just "updating the page", but **building the page in the first place**.

## 2. The Core Idea

📌 **Interview term: Render function and VNodes** — Vue compiles each template into a function that returns a tree of **virtual nodes** (VNodes), plain objects describing elements. On every update the component calls this function again and diffs the new tree against the old one. See [How does Vue's virtual DOM diff keyed lists?](/interview-question/how-does-vue-s-virtual-dom-diff-keyed-lists).

📌 **Interview term: v-once** — render this element or component the first time, store the resulting VNode, and return the stored VNode on every later render. The subtree is treated as static from then on, even if the data it read changes.

📌 **Interview term: v-memo** — <code>v-memo="[a, b]"</code> stores the VNode **together with the array of values**. On the next render Vue evaluates the array again; if every entry is the same as last time, it returns the stored VNode, otherwise it renders fresh and stores the new pair. <code>v-memo="[]"</code> never changes, so it behaves like <code>v-once</code> (the Vue docs state this equivalence).

📌 **Interview term: Memo hit** — the case where the stored VNode is reused. The Vue docs put it precisely: on a hit, Vue skips creating the new VNodes **and** diffing them. That is more than avoiding DOM writes; the template expressions inside are not even evaluated.

## 3. The Compiled Output, Side by Side

Plain interpolation:

\`\`\`js
export function render(_ctx, _cache) {
  return (_openBlock(), _createElementBlock("p", null, _toDisplayString(_ctx.msg), 1 /* TEXT */))
}
\`\`\`

With <code>v-once</code>:

\`\`\`js
export function render(_ctx, _cache) {
  return _cache[0] || (
    _setBlockTracking(-1, true),
    (_cache[0] = _createElementVNode("p", null, [
      _createTextVNode(_toDisplayString(_ctx.msg), 1 /* TEXT */)
    ])).cacheIndex = 0,
    _setBlockTracking(1),
    _cache[0]
  )
}
\`\`\`

With <code>v-memo="[msg]"</code>:

\`\`\`js
export function render(_ctx, _cache) {
  return _withMemo([_ctx.msg], () => (_openBlock(), _createElementBlock("p", null, [
    _createTextVNode(_toDisplayString(_ctx.msg) + " " + _toDisplayString(_ctx.other), 1 /* TEXT */)
  ])), _cache, 0)
}
\`\`\`

With <code>v-memo</code> on the same element as <code>v-for</code>:

\`\`\`js
export function render(_ctx, _cache) {
  return (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(_ctx.list, (item, __, ___, _cached) => {
    const _memo = ([item.id === _ctx.selected])
    if (_cached && _cached.el && _cached.key === (item.id) && _isMemoSame(_cached, _memo)) return _cached
    const _item = (_openBlock(), _createElementBlock("div", {
      key: item.id
    }, [
      _createTextVNode(_toDisplayString(item.label), 1 /* TEXT */)
    ]))
    _item.memo = _memo
    return _item
  }, _cache, 0), 128 /* KEYED_FRAGMENT */))
}
\`\`\`

How to read the differences:

| Piece | What it does |
| :--- | :--- |
| <code>_cache</code> | A per-component-instance array the compiler uses for cached values; each <code>v-once</code> or <code>v-memo</code> gets a slot index |
| <code>_cache[0] \\|\\| (...)</code> | <code>v-once</code>: build once, then the short-circuit returns the stored VNode forever |
| <code>_setBlockTracking(-1, true)</code> | Stop the current block from collecting the cached VNode as a dynamic child, so the diff never revisits it |
| <code>_withMemo(deps, render, _cache, 0)</code> | <code>v-memo</code>: compare <code>deps</code> to the stored array; reuse on a hit, else call <code>render</code> and store |
| <code>_isMemoSame(_cached, _memo)</code> | Per-row check inside <code>v-for</code>; note it also requires <code>_cached.key === item.id</code>, so a row is only reused for the same key |
| <code>_item.memo = _memo</code> | The dependency array is stored on the VNode itself for the next comparison |

The <code>v-for</code> form explains a detail in the docs: you do not need to add <code>item.id</code> to the dependency array, because the compiled check already compares the key.

📌 **Interview term: Block tracking** — Vue's optimised diff collects the **dynamic** nodes of a template into a flat list per block, so updates visit only those. Turning tracking off around a <code>v-once</code> node is what makes it truly static for the diff.

## 4. Verified: counting renders

The runnable example renders the same 5-row list twice, once plain and once with <code>v-memo="[row.id === selected]"</code>. A plain counter increments every time a row body is evaluated. A <code>v-once</code> heading shows the initially selected row:

\`\`\`
mounted                row bodies rendered so far: plain 5, v-memo 5 || selected rows: Row 1 * | Row 1 * || Started with row 1 selected (v-once: never updates) / Now selected: row 1
select next            row bodies rendered so far: plain 10, v-memo 7 || selected rows: Row 2 * | Row 2 * || Started with row 1 selected (v-once: never updates) / Now selected: row 2
unrelated update       row bodies rendered so far: plain 15, v-memo 7 || selected rows: Row 2 * | Row 2 * || Started with row 1 selected (v-once: never updates) / Now selected: row 2
select next            row bodies rendered so far: plain 20, v-memo 9 || selected rows: Row 3 * | Row 3 * || Started with row 1 selected (v-once: never updates) / Now selected: row 3
\`\`\`

- **Changing the selection** re-rendered all 5 plain rows but only **2** memo rows: the one that lost the selection and the one that gained it.
- **An unrelated update** (a click counter elsewhere) re-rendered all 5 plain rows and **0** memo rows.
- **The v-once heading** still says "row 1" after the selection moved to row 3, while the normal heading below it updated.

With 5 rows the savings are trivial. The Vue docs suggest <code>v-memo</code> for <code>v-for</code> lists with more than about 1000 items, where re-evaluating every row on each update becomes measurable.

## 5. v-once vs v-memo vs What the Compiler Does for Free

| | Static hoisting (automatic) | <code>v-once</code> | <code>v-memo</code> | <code>computed</code> |
| :--- | :--- | :--- | :--- | :--- |
| Applies to | Template parts with no bindings | Any element or component | Any element, or a <code>v-for</code> element | A value, not a subtree |
| Updates when | Never (nothing to update) | Never | Any dependency changes | Any reactive dependency changes |
| Who decides | The compiler | You | You, via the array | Vue's dependency tracking |
| Risk | None | Stale data if it does change | Stale data if a dependency is missing | None |
| Use for | Nothing to do | Content dynamic only on first render, such as a timestamp of when the page opened | Large lists, expensive subtrees with a known change trigger | Derived data |

Static hoisting already handles content with **no** bindings, so adding <code>v-once</code> to plain static markup buys nothing. <code>v-once</code> is for content that has bindings but should freeze after the first render.

## 6. SSR: both are ignored

Compiled with <code>@vue/compiler-ssr</code>, a template using both directives produces ordinary string output:

\`\`\`js
return function ssrRender(_ctx, _push, _parent, _attrs) {
  _push(\`<div\${
    _ssrRenderAttrs(_attrs)
  }><p>\${
    _ssrInterpolate(_ctx.a)
  }</p><p>\${
    _ssrInterpolate(_ctx.b)
  }</p></div>\`)
}
\`\`\`

There is no cache on the server because each request renders once anyway. The directives take effect on the client after [hydration](/interview-question/how-does-server-side-rendering-work-in-vue-rendertostring-hydration).

## 7. Verified: how v-memo goes wrong

A second SFC renamed the first row's label, which is **not** in the dependency array:

\`\`\`
after rename: v-memo on v-for: ab | v-memo nested inside v-for: RENAMEDb | v-once on v-for: ab
\`\`\`

- **Missing dependency, stale UI.** The <code>v-memo</code> list still showed <code>a</code>. The data changed; the screen did not. Same for <code>v-once</code>.
- **<code>v-memo</code> nested inside a <code>v-for</code> silently does not memoise.** The Vue docs warn that <code>v-memo</code> does not work inside <code>v-for</code>; it must be on the same element. Vue 3.5.44 compiles the nested form with **no error or warning**, and its output shows why it breaks: every row calls <code>_withMemo([r.ok], ..., _cache, 0)</code> with the **same** cache slot <code>0</code>, so rows overwrite each other's stored dependencies. In this run the row re-rendered and showed <code>RENAMED</code>, which looks correct but means nothing was being cached.

## 8. Common Pitfalls

- **Leaving a dependency out of the array.** Anything the subtree displays that can change, and is not in the array, freezes. Prefer a single derived boolean like <code>row.id === selected</code> and keep the subtree small.
- **Putting <code>v-memo</code> on a child of the <code>v-for</code> element.** It compiles silently and shares one cache slot across all rows. Put it on the <code>v-for</code> element itself.
- **Using <code>v-once</code> on content with live data.** A component with <code>v-once</code> keeps its first props forever; verified output above shows the heading stuck on row 1.
- **Reaching for <code>v-memo</code> before profiling.** It adds a comparison per row on every render; on small lists that can cost more than it saves.
- **Expecting <code>v-memo</code> to fix slow child components.** Children already skip re-rendering when their props are unchanged; <code>v-memo</code> helps when the **parent's** render function is the hot spot. See [How do you optimize performance in a Vue app?](/interview-question/how-do-you-optimize-performance-in-a-vue-app).
- **Testing memoisation through SSR output.** Both directives are ignored on the server, as the compiled SSR code shows.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"Both are manual render caches: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-once</code> renders a subtree once and reuses it forever, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-memo</code> reuses it while every value in a dependency array is unchanged."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Compiled output:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-once</code> compiles to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">_cache[0] || (...)</code> with block tracking turned off, so the diff never revisits it. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-memo</code> compiles to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">_withMemo(deps, render, _cache, 0)</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. On a v-for:</strong> <span style="color:#f0e2c8;">"With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-for</code> the compiler inlines an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">_isMemoSame</code> check per row that also compares the key, and returns the cached row VNode on a hit, so Vue skips creating and diffing it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. When to use it:</strong> <span style="color:#f0e2c8;">"Large lists where few rows change, like a selected row: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-memo="[row.id === selected]"</code>. In my test a selection change re-rendered 2 rows out of 5 and an unrelated update re-rendered none."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The risks:</strong> <span style="color:#f0e2c8;">"A missing dependency freezes the UI, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-memo</code> must be on the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-for</code> element itself, not a child, and both directives are ignored in SSR. I profile before using them."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">v-once</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">v-memo="[]"</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Functionally none: an empty array never changes, so the memo always hits. The compiled code differs: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-once</code> uses a cached expression with block tracking off, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-memo</code> goes through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">_withMemo</code> and compares an empty array each render.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why do the docs say you do not need the item id in the <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">v-memo</code> array on a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">v-for</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because the compiled row check already includes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">_cached.key === item.id</code>. A cached VNode is only reused for the same key.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if you put <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">v-memo</code> on a child inside a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">v-for</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In 3.5.44 it compiles without any error, but every row uses the same cache slot, so the rows overwrite each other's stored dependencies and memoisation does not work. The docs say to put it on the same element as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-for</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">v-once</code> useful on static markup?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. The compiler already hoists content with no bindings. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-once</code> is for content that has bindings but should freeze after the first render.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">v-memo</code> different from a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">computed</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> caches a value and tracks its dependencies automatically. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-memo</code> caches part of the render output and trusts the array you write, so it can be wrong in ways a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> cannot.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Render function and VNodes** | Compiled template that returns a tree of plain objects Vue diffs |
| **v-once** | Render once, then reuse the stored VNode forever |
| **v-memo** | Reuse the stored VNode while every value in the dependency array is unchanged |
| **Memo hit** | Reuse case: no VNode creation, no diff for that subtree |
| **_cache** | Per-instance array of compiler cache slots |
| **Block tracking** | Collecting dynamic nodes for a fast diff; switched off around <code>v-once</code> |
| **_isMemoSame** | Per-row dependency and key check for <code>v-memo</code> on <code>v-for</code> |

---
**Conclusion:** <code>v-once</code> and <code>v-memo</code> are manual render caches. <code>v-once</code> compiles to a <code>_cache[i] ||</code> expression that builds a subtree once and hides it from block tracking; <code>v-memo</code> compiles to <code>_withMemo</code>, or on a <code>v-for</code> to an inline <code>_isMemoSame</code> check that also compares the key, and reuses the subtree while its dependency array is unchanged. Verified on Vue 3.5.44, a selection change re-rendered 2 memoised rows instead of 5 and an unrelated update re-rendered none, but a missing dependency froze the UI and a <code>v-memo</code> nested inside the loop compiled silently into a shared cache slot. Use them after profiling, on large lists, with a dependency array that names everything that should cause an update.`,
    examples: [
      {
        label: "v-once header and a v-memo list, with render counters",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { ref } from "vue";

const rows = ref(
  Array.from({ length: 5 }, (_, i) => ({ id: i + 1, label: "Row " + (i + 1) }))
);
const selected = ref(1);
const clicks = ref(0);

// Plain (non-reactive) counters: how many times each row body was re-rendered.
const renders = { plain: 0, memo: 0 };
const body = (kind, row) => {
  renders[kind]++;
  return row.label;
};
</script>

<template>
  <h4 v-once>Started with row {{ selected }} selected (v-once: never updates)</h4>
  <h4>Now selected: row {{ selected }}</h4>

  <button id="next" @click="selected = (selected % rows.length) + 1">select next</button>
  <button id="noise" @click="clicks++">unrelated update ({{ clicks }})</button>

  <div class="cols">
    <ul>
      <li v-for="row in rows" :key="row.id" :class="{ on: row.id === selected }">
        {{ body("plain", row) }}{{ row.id === selected ? " *" : "" }}
      </li>
    </ul>
    <ul>
      <li
        v-for="row in rows"
        :key="row.id"
        v-memo="[row.id === selected]"
        :class="{ on: row.id === selected }"
      >
        {{ body("memo", row) }}{{ row.id === selected ? " *" : "" }}
      </li>
    </ul>
  </div>

  <p id="stats">row bodies rendered so far: plain {{ renders.plain }}, v-memo {{ renders.memo }}</p>
</template>
`,
      },
      {
        label: "Print the compiled render functions with @vue/compiler-dom",
        tech: "js",
        runnable: false,
        code: `const { compile } = require("@vue/compiler-dom");
const show = (label, tpl, opts = {}) => {
  const { code } = compile(tpl, { mode: "module", hoistStatic: true, ...opts });
  console.log("=== " + label + "\\n" + code.replace(/^import .*\\n/gm, "").trim() + "\\n");
};
show("plain", \`<p>{{ msg }}</p>\`);
show("v-once", \`<p v-once>{{ msg }}</p>\`);
show("v-memo", \`<p v-memo="[msg]">{{ msg }} {{ other }}</p>\`);
show("v-memo on v-for", \`<div v-for="item in list" :key="item.id" v-memo="[item.id === selected]">{{ item.label }}</div>\`);
`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Why is the :key attribute important in v-for?",
    difficulty: "medium",
    seoDescription:
      "A :key gives each v-for item a stable identity so Vue moves the right DOM nodes and component state. Index-key bugs, warnings and compiled flags, verified.",
    description: `**Question presented to candidate:**
"Why does Vue want a \`:key\` on every \`v-for\`? What actually goes wrong if you leave it out or use the array index, and when is the index fine?"

**What a strong answer should cover:**
- Without a key, Vue patches list children **in place by position** (an "unkeyed" diff); with keys it matches old and new children **by identity** and moves, creates or removes them.
- Position matching is fine for plain text, but **local state** (component \`ref\`s, input values, focus, transitions) stays with the position, not the item, when the list is reordered or an item is removed.
- \`:key="index"\` is effectively the same as no key for reorders and removals.
- Keys must be **unique among siblings and stable** across renders: database ids, not \`Math.random()\` or new objects.
- In Vue 3 the key on \`<template v-for>\` goes on the \`<template>\` tag; duplicate keys produce a dev warning.
- Changing a key on purpose forces a remount, a common reset technique.

**Clarifying questions expected:**
- "Do the list items have local state, such as inputs or child components?"
- "Can the list be reordered, filtered or have items removed from the middle?"

**Code / implementation expected:** Yes — a list of stateful rows rendered with index keys and id keys, showing state attached to the wrong item after a removal.`,
    answer: `**Target Audience:** Anyone rendering lists in Vue, from first project to code review.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. Every output below was produced on Vue 3.5.44: the list behaviour by mounting SFCs in jsdom with the repo verifier (dev build, so warnings print), and the compiled flags with <code>compile()</code> from <code>@vue/compiler-dom</code>. The diff algorithm itself (the longest increasing subsequence and the five steps) has its own page, [How does Vue's virtual DOM diff keyed lists?](/interview-question/how-does-vue-s-virtual-dom-diff-keyed-lists); this one is about **why you need the key** and what breaks without it.

## 1. Why This Even Matters — A Story First

A teacher has three students sitting in a row, each with a sticky note on their desk saying how far they got in the reading. The first student, Milk, leaves the class. Two ways to handle it:

- **By seat:** the teacher says "everyone stays put, I will just change the name cards". Seat 1 now gets the name card "Dog", seat 2 gets "Rent", seat 3 is removed. But the sticky notes did not move. Dog is now sitting behind Milk's sticky note.
- **By name:** the teacher knows each student by name. Milk leaves with Milk's sticky note, everyone else keeps their own.

Without a key, Vue does the first. With a key, it does the second. The name cards are the props you pass in, which always look right. The sticky notes are **local state**: a checkbox ticked inside a row component, text typed in an input, focus, a running animation. That is what ends up on the wrong item.

## 2. The Core Idea

📌 **Interview term: key** — a special attribute that gives a VNode an identity. When Vue compares the old and new children of an element, it treats two VNodes with the same <code>type</code> and the same <code>key</code> as **the same thing**, to be patched and moved. Anything else is a different thing, to be created or removed.

📌 **Interview term: Unkeyed diff (in-place patch)** — the Vue docs call it the "in-place patch" strategy. With no keys, Vue patches child 1 with new child 1, child 2 with new child 2, and so on, then mounts or unmounts the difference at the end. The runtime function is literally called <code>patchUnkeyedChildren</code>. Fast and correct when rows have no state of their own.

📌 **Interview term: Keyed diff** — with keys, Vue's <code>patchKeyedChildren</code> matches children by key, reuses their DOM nodes and component instances, moves the ones that changed position, and creates or removes only what was added or deleted.

The compiler records which diff to use as a **patch flag** on the list fragment:

\`\`\`js
// <li v-for="it in items">{{ it.t }}</li>
return (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(_ctx.items, (it) => {
  return (_openBlock(), _createElementBlock("li", null, _toDisplayString(it.t), 1 /* TEXT */))
}), 256 /* UNKEYED_FRAGMENT */))
\`\`\`

Add <code>:key="it.id"</code> and the flag becomes <code>128 /* KEYED_FRAGMENT */</code>, as the compiled <code>v-memo</code> examples on the [v-once and v-memo page](/interview-question/what-are-v-once-and-v-memo) also show.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 330" role="img" aria-label="Removing the first item: with index keys the first DOM node and its state are reused for Walk dog, with id keys the node for Buy milk is removed and the others keep their state">
  <defs>
    <marker id="q9key-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="180" y="28" text-anchor="middle">key = index</text>
  <rect class="d-box-accent" x="40" y="50" width="120" height="44" rx="8"/>
  <text class="d-sub" x="100" y="77" text-anchor="middle">0: milk [x]</text>
  <rect class="d-box" x="40" y="120" width="120" height="44" rx="8"/>
  <text class="d-sub" x="100" y="147" text-anchor="middle">1: dog</text>
  <rect class="d-box" x="40" y="190" width="120" height="44" rx="8"/>
  <text class="d-sub" x="100" y="217" text-anchor="middle">2: rent</text>
  <rect class="d-box-accent" x="220" y="50" width="120" height="44" rx="8"/>
  <text class="d-sub" x="280" y="77" text-anchor="middle">0: dog [x]</text>
  <rect class="d-box" x="220" y="120" width="120" height="44" rx="8"/>
  <text class="d-sub" x="280" y="147" text-anchor="middle">1: rent</text>
  <path class="d-edge-accent" d="M 164 72 L 214 72" marker-end="url(#q9key-arrow)"/>
  <path class="d-edge" d="M 164 142 L 214 142" marker-end="url(#q9key-arrow)"/>
  <text class="d-sub" x="100" y="270" text-anchor="middle">node 2 removed</text>
  <text class="d-text" x="540" y="28" text-anchor="middle">key = todo.id</text>
  <rect class="d-box-accent" x="400" y="50" width="120" height="44" rx="8"/>
  <text class="d-sub" x="460" y="77" text-anchor="middle">1: milk [x]</text>
  <rect class="d-box" x="400" y="120" width="120" height="44" rx="8"/>
  <text class="d-sub" x="460" y="147" text-anchor="middle">2: dog</text>
  <rect class="d-box" x="400" y="190" width="120" height="44" rx="8"/>
  <text class="d-sub" x="460" y="217" text-anchor="middle">3: rent</text>
  <rect class="d-box" x="580" y="120" width="120" height="44" rx="8"/>
  <text class="d-sub" x="640" y="147" text-anchor="middle">2: dog</text>
  <rect class="d-box" x="580" y="190" width="120" height="44" rx="8"/>
  <text class="d-sub" x="640" y="217" text-anchor="middle">3: rent</text>
  <path class="d-edge" d="M 524 142 L 574 142" marker-end="url(#q9key-arrow)"/>
  <path class="d-edge" d="M 524 212 L 574 212" marker-end="url(#q9key-arrow)"/>
  <text class="d-sub" x="460" y="270" text-anchor="middle">node 1 removed</text>
</svg>

On the left, key 0 still exists after the removal, so Vue keeps the first node, with its ticked state, and just gives it the props of "dog". The last node is the one removed. On the right, key 1 is gone, so the node for "milk" is removed and the other two keep their own nodes and state.

## 3. Verified: the classic index-key bug

The runnable example renders the same three todos twice. Each row is a small component with a **local** <code>done</code> ref that the parent does not know about. The first list uses <code>:key="index"</code>, the second <code>:key="todo.id"</code>. The verifier ticked the first row in both lists, removed the first todo, and then, after a reset, ticked and reversed:

\`\`\`
ticked first item in both lists
  index key: [x] Buy milk, [ ] Walk dog, [ ] Pay rent
  id key   : [x] Buy milk, [ ] Walk dog, [ ] Pay rent
remove first
  index key: [x] Walk dog, [ ] Pay rent
  id key   : [ ] Walk dog, [ ] Pay rent
  DOM nodes kept (original positions): index key 0,1 | id key 1,2
reset, tick first, reverse
  index key: [x] Pay rent, [ ] Walk dog, [ ] Buy milk
  id key   : [ ] Pay rent, [ ] Walk dog, [x] Buy milk
\`\`\`

- After **removing** "Buy milk", the index-keyed list shows **"Walk dog" ticked**, which nobody ticked. The DOM marker proves why: it kept the nodes born at positions 0 and 1 and dropped the last one. The id-keyed list kept nodes 1 and 2, the right ones.
- After **reversing**, the tick stayed at the top of the index-keyed list ("Pay rent") instead of travelling with "Buy milk" to the bottom.

A list rendered **without any key** behaves the same way: a verified run with component rows and no key printed no warning at all and simply patched by position. In Vue 3 a missing key is legal; the ESLint rule <code>vue/require-v-for-key</code> is what usually catches it.

## 4. What Counts as a Good Key

| Key | Verdict | Why |
| :--- | :--- | :--- |
| <code>todo.id</code> from the database | Good | Unique, stable across renders and refetches |
| A composite like <code>row.type + "-" + row.id</code> | Good | When ids repeat across types |
| <code>index</code> | Only for static lists with stateless rows | Breaks on remove, insert, reorder, filter |
| <code>Math.random()</code> or <code>crypto.randomUUID()</code> in the template | Bad | New key every render: every row remounts every time |
| The item object itself, <code>:key="it"</code> | Bad | Vue's docs say keys expect primitive values (strings and numbers) and not objects; a refetch with new objects remounts every row (verified below) |

The object-key case, verified: after replacing the list with fresh copies of the same rows (same ids, new objects), the DOM nodes reused were <code>false,false</code> with <code>:key="it"</code> and <code>true,true</code> with <code>:key="it.id"</code>. Vue 3.5.44 printed no warning for the object key; it simply never matched.

## 5. Verified: Vue's warnings about keys

**Key on the wrong element of a <code>template v-for</code>.** In Vue 3, the key belongs on the <code>&lt;template&gt;</code> tag. Compiling it on the child gives a compiler error:

\`\`\`
<template v-for> key should be placed on the <template> tag.
\`\`\`

**Duplicate keys.** Two items with id 1 in one list printed, in the dev build:

\`\`\`
[Vue warn]: Duplicate keys found during update: 1 Make sure keys are unique.
  at <App>
\`\`\`

A surprise worth knowing: the warning is **not guaranteed**. It comes from the step of the keyed diff that builds a key-to-index map, and that step runs only when the start and end of the old and new lists do not line up. In a first test, changing <code>[1, 2]</code> to <code>[1, 1, 2]</code> was handled entirely by the "same start" and "same end" shortcuts and printed **nothing**; the warning appeared only for <code>[1, 2, 3]</code> to <code>[3, 1, 1]</code>. It is also not checked on the initial mount. So "no warning" does not mean "keys are unique".

## 6. Keys Outside v-for: forcing a remount

📌 **Interview term: Key-based reset** — because a different key means "a different thing", changing the key of a single element or component on purpose makes Vue unmount the old one and mount a fresh one, with fresh local state. Common uses: resetting a form component, restarting a [transition](/interview-question/how-do-transition-and-transitiongroup-work) on content change, or re-running a child's <code>setup</code> when a route param changes.

The runnable example's "reset" button uses this: both <code>&lt;ul&gt;</code> elements have <code>:key="'index-' + generation"</code>, and incrementing <code>generation</code> throws away every row component, which is why the ticks were cleared before the reverse test above. React uses the same trick; compare [How can the key prop be used to deliberately reset component state?](/interview-question/how-can-the-key-prop-be-used-to-deliberately-reset-component-state).

## 7. When the Index Is Actually Fine

The index is a legitimate key, or no key at all is fine, when **all** of these hold:

- the list is never reordered, filtered or spliced in the middle (only appended, or fully replaced);
- rows contain no component state, no uncontrolled inputs, no focus to preserve and no transitions;
- you are not using <code>&lt;TransitionGroup&gt;</code>, which needs real keys to animate moves.

Even then, an id costs nothing and survives future changes, which is why most teams lint for it. More list patterns are on [How do you render lists with v-for?](/interview-question/how-do-you-render-lists-with-v-for).

## 8. Common Pitfalls

- **<code>:key="index"</code> on rows with inputs or child components.** State follows the position, as verified above.
- **Generating keys in the template.** <code>Math.random()</code> or a new UUID per render remounts every row on every update.
- **Using objects as keys.** A refetch produces new objects, so nothing matches and everything remounts.
- **Putting the key on the child of <code>&lt;template v-for&gt;</code>.** That was the Vue 2 rule; Vue 3 reports a compile error.
- **Trusting the absence of the duplicate-key warning.** It fires only on some update paths, never on mount.
- **Keys that are unique only per page, not per list.** Uniqueness matters **among siblings**; two lists can reuse the same ids, one list cannot.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"The key gives each <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-for</code> item an identity, so when the list changes Vue matches old and new rows by identity instead of by position."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Without it:</strong> <span style="color:#f0e2c8;">"Vue patches in place: row 1 gets the new row 1 props, and so on. The text looks right, but local state, like a component ref, an input value or focus, stays with the position."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The classic bug:</strong> <span style="color:#f0e2c8;">"With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:key="index"</code> that is the same problem. In my demo, removing the first ticked todo left the next todo showing as ticked, because Vue kept the first DOM node and component."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Good keys:</strong> <span style="color:#f0e2c8;">"Keys must be unique among siblings and stable across renders, so database ids, never <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.random()</code> or objects. In Vue 3 the key goes on the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">template</code> tag of a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">template v-for</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Bonus:</strong> <span style="color:#f0e2c8;">"Changing a key on purpose remounts a component with fresh state, which is a clean way to reset a form or restart a transition."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is the index acceptable as a key?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the list is only appended to or fully replaced, rows hold no state, inputs or focus, and there is no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TransitionGroup</code>. Even then an id costs nothing and survives future changes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does Vue warn about a missing key?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not at runtime in Vue 3; I mounted component rows without keys and got no warning. The ESLint rule <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vue/require-v-for-key</code> is what catches it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does Vue always warn on duplicate keys?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. The warning comes from the part of the keyed diff that builds a key map, which only runs when the list ends do not match. I saw it for one update and not for another with the same duplicate.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not use the item object as the key?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keys are compared by identity, so a refetch that returns new objects for the same rows matches nothing and remounts every row. I verified zero DOM nodes reused with an object key and all reused with the id.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does the compiler treat keyed and unkeyed lists differently?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It tags the list fragment with a patch flag, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">256 UNKEYED_FRAGMENT</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">128 KEYED_FRAGMENT</code>, and the runtime calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">patchUnkeyedChildren</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">patchKeyedChildren</code> accordingly.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **key** | Identity of a VNode among its siblings |
| **Unkeyed diff** | Patch children by position (<code>patchUnkeyedChildren</code>) |
| **Keyed diff** | Match children by key, move, create or remove (<code>patchKeyedChildren</code>) |
| **UNKEYED_FRAGMENT / KEYED_FRAGMENT** | Patch flags 256 and 128 the compiler puts on a <code>v-for</code> fragment |
| **Local state** | State inside a row (component refs, input value, focus) that props do not carry |
| **Key-based reset** | Change a key on purpose to remount a component with fresh state |

---
**Conclusion:** A key tells Vue which old child and which new child are the same item. Without one, or with the index, Vue patches by position: the props look right, but local state, input values and focus stay where they were, which in the verified demo left "Walk dog" ticked after "Buy milk" was removed. With stable, unique ids, Vue reuses the right DOM nodes and component instances and moves them. Keep keys primitive and generated by your data, put them on <code>&lt;template v-for&gt;</code> itself, do not rely on the duplicate-key warning, and change a key on purpose when you want a fresh component.`,
    examples: [
      {
        label: "Index key vs id key: local row state follows the wrong item",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { defineComponent, h, ref } from "vue";

// A row with LOCAL state the parent does not know about: a "done" toggle.
const TodoRow = defineComponent({
  props: { text: String },
  setup(props) {
    const done = ref(false);
    return () =>
      h("li", { class: done.value ? "done" : "" }, [
        h("button", { onClick: () => (done.value = !done.value) }, done.value ? "[x]" : "[ ]"),
        " " + props.text,
      ]);
  },
});

const todos = ref([
  { id: 1, text: "Buy milk" },
  { id: 2, text: "Walk dog" },
  { id: 3, text: "Pay rent" },
]);

const removeFirst = () => todos.value.shift();
const reverse = () => todos.value.reverse();
// Changing a key on purpose throws the old subtree away: a full reset.
const generation = ref(0);
const reset = () => {
  generation.value++;
  todos.value = [
    { id: 1, text: "Buy milk" },
    { id: 2, text: "Walk dog" },
    { id: 3, text: "Pay rent" },
  ];
};
</script>

<template>
  <p>Tick the first item in both lists, then remove it or reverse.</p>
  <button id="remove" @click="removeFirst">remove first</button>
  <button id="reverse" @click="reverse">reverse</button>
  <button id="reset" @click="reset">reset</button>

  <h4>:key="index" (wrong)</h4>
  <ul id="by-index" :key="'index-' + generation">
    <TodoRow v-for="(todo, index) in todos" :key="index" :text="todo.text" />
  </ul>

  <h4>:key="todo.id" (right)</h4>
  <ul id="by-id" :key="'id-' + generation">
    <TodoRow v-for="todo in todos" :key="todo.id" :text="todo.text" />
  </ul>
</template>
`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you create a custom directive in Vue?",
    seoDescription:
      "A custom directive is an object of lifecycle hooks, or one function, given the element and a binding. Registration, args, SSR, pitfalls.",
    description: `**Question presented to candidate:**
"Build me a custom directive, say \`v-click-outside\` or \`v-focus\`. Show how you define and register it, what arguments the hooks receive, and when you would choose a directive over a component or a composable."

**What a strong answer should cover:**
- A directive is an **object of lifecycle hooks** (\`created\`, \`beforeMount\`, \`mounted\`, \`beforeUpdate\`, \`updated\`, \`beforeUnmount\`, \`unmounted\`) or a **function shorthand** that runs on \`mounted\` and \`updated\`.
- Hooks receive \`(el, binding, vnode, prevVnode)\`; \`binding\` has \`value\`, \`oldValue\`, \`arg\`, \`modifiers\`, \`instance\` and \`dir\`.
- Registration: in \`<script setup>\` any camelCase variable starting with \`v\` (\`vFocus\` becomes \`v-focus\`); \`directives: {}\` in the Options API; \`app.directive('name', def)\` globally.
- **Cleanup**: anything added in \`mounted\` (listeners, observers, timers) must be removed in \`unmounted\`.
- Directives are for **direct DOM access** only; reusable logic belongs in composables and reusable UI in components. Using them on components is discouraged (multi-root components warn).
- SSR: hooks do not run on the server; \`getSSRProps\` can return attributes for the HTML.

**Clarifying questions expected:**
- "Does this need direct DOM access, or could a component or composable do it?"
- "Will the app be server-rendered?"

**Code / implementation expected:** Yes — a working directive with an argument or modifier and proper cleanup.`,
    answer: `**Target Audience:** Vue developers who need low-level DOM behaviour they can reuse across templates.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. Every log line and warning below was printed on Vue 3.5.44 by mounting the SFCs in jsdom with the repo verifier (dev build), and the SSR output by <code>renderToString</code> from <code>@vue/server-renderer</code>. The typed example was checked with TypeScript 5 in strict mode. For the built-in directives first, see [What are Vue directives? Give common examples.](/interview-question/what-are-vue-directives-give-common-examples)

## 1. Why This Even Matters — A Story First

A theatre company has actors (components) and a script (the template). Most of the show is about what the actors say and do. But every theatre also has a stagehand who works directly on the set: moves a spotlight onto an actor at the exact moment they enter, fixes a prop to the floor, and, when the scene ends, unplugs the spotlight so it does not burn all night.

The stagehand never speaks a line. They just touch the physical stage at precise moments. That is a **custom directive**: a small piece of code Vue calls at specific points in an element's life, with direct access to the real DOM element. <code>v-focus</code> moves the spotlight. <code>v-click-outside</code> plugs in a listener and, importantly, unplugs it at the end.

## 2. The Core Idea

📌 **Interview term: Custom directive** — an object whose methods are **directive hooks**, called by Vue as the element it is attached to is created, inserted, updated and removed. You use it in a template as <code>v-name</code>, optionally with an argument, modifiers and a value: <code>v-name:arg.mod="value"</code>.

📌 **Interview term: Directive hooks** — <code>created</code>, <code>beforeMount</code>, <code>mounted</code>, <code>beforeUpdate</code>, <code>updated</code>, <code>beforeUnmount</code>, <code>unmounted</code>. They mirror [component lifecycle hooks](/interview-question/what-are-vue-lifecycle-hooks), but for one element. Each receives <code>(el, binding, vnode, prevVnode)</code>.

📌 **Interview term: Binding object** — the second argument: <code>value</code> (the evaluated expression), <code>oldValue</code> (previous value, in update hooks), <code>arg</code> (the part after the colon), <code>modifiers</code> (an object like <code>{ bold: true }</code>), <code>instance</code> (the component that uses the directive) and <code>dir</code> (the directive definition itself).

📌 **Interview term: Function shorthand** — if you pass a function instead of an object, Vue uses it for both <code>mounted</code> and <code>updated</code>. Ideal for "keep this DOM property in sync with the value".

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="Directive hook order: created, beforeMount, mounted, then beforeUpdate and updated on each component update, then beforeUnmount and unmounted when the element is removed">
  <defs>
    <marker id="q10dir-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="40" width="130" height="50" rx="10"/>
  <text class="d-text" x="85" y="70" text-anchor="middle">created</text>
  <path class="d-edge" d="M 154 65 L 196 65" marker-end="url(#q10dir-arrow)"/>
  <rect class="d-box" x="200" y="40" width="140" height="50" rx="10"/>
  <text class="d-text" x="270" y="70" text-anchor="middle">beforeMount</text>
  <path class="d-edge" d="M 344 65 L 386 65" marker-end="url(#q10dir-arrow)"/>
  <rect class="d-box-accent" x="390" y="40" width="140" height="50" rx="10"/>
  <text class="d-text d-accent" x="460" y="70" text-anchor="middle">mounted</text>
  <path class="d-edge-accent" d="M 460 94 L 460 136" marker-end="url(#q10dir-arrow)"/>
  <rect class="d-box" x="390" y="140" width="140" height="50" rx="10"/>
  <text class="d-text" x="460" y="170" text-anchor="middle">beforeUpdate</text>
  <path class="d-edge" d="M 534 165 L 576 165" marker-end="url(#q10dir-arrow)"/>
  <rect class="d-box-accent" x="580" y="140" width="120" height="50" rx="10"/>
  <text class="d-text d-accent" x="640" y="170" text-anchor="middle">updated</text>
  <path class="d-edge-dashed" d="M 640 136 C 640 110, 560 110, 536 140" marker-end="url(#q10dir-arrow)"/>
  <path class="d-edge" d="M 386 165 L 334 165 L 334 236" marker-end="url(#q10dir-arrow)"/>
  <rect class="d-box" x="200" y="240" width="160" height="50" rx="10"/>
  <text class="d-text" x="280" y="270" text-anchor="middle">beforeUnmount</text>
  <path class="d-edge" d="M 364 265 L 406 265" marker-end="url(#q10dir-arrow)"/>
  <rect class="d-box-accent" x="410" y="240" width="140" height="50" rx="10"/>
  <text class="d-text d-accent" x="480" y="270" text-anchor="middle">unmounted</text>
</svg>

The top row runs once when the element is created and inserted. The middle pair repeats on every update of the owning component. The bottom row runs once when the element is removed. The three highlighted hooks are the ones most directives actually need.

## 3. Verified: the hook order

A tracing directive with all seven hooks was placed on a <code>&lt;p v-if&gt;</code>, next to component <code>onMounted</code>/<code>onUpdated</code> hooks. Bumping a counter, then removing the element, printed the following (the same test also put a directive on a multi-root component; its warnings are omitted here and quoted in section 7):

\`\`\`
  directive created  value=0 instanceIsApp=true
  directive beforeMount  value=0 instanceIsApp=true
  directive mounted  value=0 instanceIsApp=true
  component onMounted
-- bump:
  directive beforeUpdate  value=1 instanceIsApp=true
  directive updated  value=1 instanceIsApp=true
  component onUpdated
-- remove element:
  directive beforeUnmount  value=1 instanceIsApp=true
  directive unmounted  value=1 instanceIsApp=true
  component onUpdated
\`\`\`

The element's <code>mounted</code> runs **before** the component's <code>onMounted</code>, and <code>updated</code> before <code>onUpdated</code>: Vue finishes the children before the parent. Removing the element is itself a component update, which is why <code>onUpdated</code> follows the unmount hooks.

## 4. Writing One: three common shapes

The runnable example contains three directives that cover most real cases.

**Object form, one hook (<code>v-focus</code>).** Focus needs the element to be in the document, so it lives in <code>mounted</code>.

**Function shorthand with arg and modifier (<code>v-highlight:color.bold="color"</code>).** <code>binding.arg</code> picks the CSS property, <code>binding.modifiers.bold</code> toggles bold, <code>binding.value</code> is the colour.

**Resource owner (<code>v-click-outside</code>).** Adds a <code>document</code> listener in <code>mounted</code>, refreshes the handler in <code>updated</code>, removes the listener in <code>unmounted</code>.

Verified output:

\`\`\`
v-focus mounted: focused <input>
v-highlight:color value=crimson old=undefined bold=true
v-highlight:bg value=lightyellow old=undefined bold=false
v-click-outside: listener added
-- after mount: activeElement INPUT | p styles: color: crimson; font-weight: bold; / background-color: lightyellow;
-- choose teal:
v-highlight:color value=teal old=crimson bold=true
v-highlight:bg value=lightyellow old=lightyellow bold=false
-- click outside, then inside the panel:
v-highlight:color value=teal old=teal bold=true
v-highlight:bg value=lightyellow old=lightyellow bold=false
   panel text: Panel. Clicks outside it: 1
-- close the panel:
v-highlight:color value=teal old=teal bold=true
v-highlight:bg value=lightyellow old=lightyellow bold=false
v-click-outside: listener removed
\`\`\`

Two lessons hide in this output. First, the function shorthand ran for **both** paragraphs on **every** update, even when its own value did not change (<code>old=lightyellow</code>, value <code>lightyellow</code>). Directive hooks run whenever the owning component re-renders; compare <code>binding.value</code> with <code>binding.oldValue</code> if the work is expensive. Second, one click outside and one inside the panel counted exactly 1, and closing the panel removed the listener.

## 5. Registering a Directive

| Where | How | Name in template |
| :--- | :--- | :--- |
| <code>&lt;script setup&gt;</code> | <code>const vFocus = { mounted: (el) => el.focus() }</code> | <code>v-focus</code> |
| Options API component | <code>directives: { focus: vFocus }</code> | <code>v-focus</code> |
| Whole app | <code>app.directive("focus", vFocus)</code> | <code>v-focus</code> |
| Plugin | <code>install(app) { app.directive(...) }</code> | as registered |

The <code>&lt;script setup&gt;</code> rule, from the Vue docs: any camelCase variable that starts with the <code>v</code> prefix can be used as a custom directive. Global registration is checked in Node: after <code>app.directive("tip", vTip)</code>, <code>app.directive("tip") === vTip</code> was <code>true</code>, since the one-argument form returns the registered definition. Packaging several directives as a [plugin](/interview-question/what-is-a-vue-plugin) is the usual way to share them.

The second example adds TypeScript: <code>Directive&lt;HostElement, Value, Modifiers, Arg&gt;</code> types <code>el</code>, <code>binding.value</code>, the allowed modifiers and the arg (the 3.5.44 typings declare those four type parameters), and augmenting <code>GlobalDirectives</code> lets <code>vue-tsc</code> type-check <code>v-tooltip</code> in every template. It passed <code>tsc --noEmit</code> in strict mode. More on typing: [How do you use TypeScript with Vue?](/interview-question/how-do-you-use-typescript-with-vue-typed-props-emits-refs-vue-tsc)

## 6. SSR: hooks do not run on the server

There is no DOM during [server-side rendering](/interview-question/how-does-server-side-rendering-work-in-vue-rendertostring-hydration), so <code>mounted</code> and friends never run there. A directive can contribute attributes to the HTML with <code>getSSRProps(binding)</code>. Verified with <code>renderToString</code>:

\`\`\`
<div><button title="Save the draft" data-tip="ssr">save</button><input></div>
\`\`\`

The tooltip directive added <code>title</code> and <code>data-tip</code> through <code>getSSRProps</code>; the <code>v-focus</code> input rendered as a bare <code>&lt;input&gt;</code>, and will be focused on the client after hydration.

## 7. Directive, Component or Composable?

The Vue docs are direct: custom directives should only be used when the desired functionality can only be achieved via direct DOM manipulation.

| Need | Best tool |
| :--- | :--- |
| Focus, select text, measure, scroll into view | Directive |
| Attach a third-party DOM library to one element | Directive (or a template ref plus a composable) |
| Reusable stateful logic (fetching, timers, stores) | [Composable](/interview-question/what-are-composables-in-vue) |
| Reusable markup and behaviour | Component |
| Setting attributes, classes, styles | Built-in <code>v-bind</code>, which also works in SSR |

📌 **Interview term: Directive on a component** — applying a directive to a component targets its **root element**. Vue's docs recommend against it. On a component with several root nodes, the verified warning is:

\`\`\`
[Vue warn]: Runtime directive used on component with non-element root node. The directives will not function as intended.
\`\`\`

It repeated on every update of the parent, once per hook that tried to run.

## 8. Common Pitfalls

- **Writing component state from <code>updated</code>.** The first version of the runnable example pushed log lines into a reactive array from the function shorthand; Vue aborted with <code>Maximum recursive updates exceeded in component &lt;App&gt;</code>, because each write re-rendered the component, which called <code>updated</code> again.
- **Capturing <code>binding.value</code> in <code>mounted</code>.** The binding is a snapshot. Verified: a listener that read the <code>mounted</code> binding still saw <code>A</code> after the value became <code>B</code>; refreshing it in <code>updated</code> saw <code>B</code>. Store the latest value on the element.
- **No cleanup.** Listeners, <code>ResizeObserver</code>, <code>IntersectionObserver</code> and timers added in <code>mounted</code> leak unless removed in <code>unmounted</code>.
- **Doing expensive work in the function shorthand.** It runs on every component update; compare <code>value</code> and <code>oldValue</code> first.
- **Using directives on multi-root components.** They do not work and warn; put the directive on an element inside the component.
- **Expecting directive hooks during SSR.** Use <code>getSSRProps</code> for attributes that must be in the server HTML.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What it is:</strong> <span style="color:#f0e2c8;">"A custom directive is an object of lifecycle hooks, from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">created</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unmounted</code>, that Vue calls for one element, giving me the real DOM node and a binding object."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The binding:</strong> <span style="color:#f0e2c8;">"The binding carries <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">value</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">oldValue</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">arg</code> for the part after the colon, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">modifiers</code> for the dot flags, plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">instance</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dir</code>. If I pass a function instead of an object, it runs on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mounted</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">updated</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Registering:</strong> <span style="color:#f0e2c8;">"In <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">script setup</code> any camelCase variable starting with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v</code>, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vFocus</code>, becomes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-focus</code>. Otherwise I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">directives</code> in the component or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">app.directive</code> globally, often from a plugin."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Doing it right:</strong> <span style="color:#f0e2c8;">"Whatever I add in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mounted</code>, listeners, observers, timers, I remove in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unmounted</code>. I keep the latest <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">binding.value</code> on the element, because the mounted binding is a snapshot."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. When to use one:</strong> <span style="color:#f0e2c8;">"Only for direct DOM work like focus, measuring or wrapping a DOM library. Logic goes in composables, UI in components, and for SSR I add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">getSSRProps</code> since hooks do not run on the server."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you implement <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">v-click-outside</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mounted</code>, store the handler on the element and add a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">document</code> click listener that calls it when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">el.contains(event.target)</code> is false. In <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">updated</code>, refresh the stored handler. In <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unmounted</code>, remove the listener.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the function shorthand run when its value did not change?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Directive hooks run whenever the owning component re-renders, not when the directive value changes. In my test the shorthand ran with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">old=lightyellow</code> and the same new value. Compare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">value</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">oldValue</code> before expensive work.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you use a directive on a component?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It applies to the component root element, and the docs advise against it. On a component with several roots Vue warns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Runtime directive used on component with non-element root node.</code> and the directive does not work.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens to directives during SSR?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Their hooks never run, because there is no DOM. A directive can implement <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">getSSRProps(binding)</code> to return attributes; I verified a tooltip directive adding <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">title</code> to the server HTML.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you type a directive?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Directive&lt;HTMLElement, string&gt;</code> and so on; the 3.5 typings take element, value, modifiers and arg types. For a global directive, augment <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GlobalDirectives</code> in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">declare module "vue"</code> block so vue-tsc checks templates.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Custom directive** | An object of hooks Vue calls during one element's lifetime |
| **Directive hooks** | <code>created</code> through <code>unmounted</code>, mirroring component lifecycle |
| **Binding object** | <code>value</code>, <code>oldValue</code>, <code>arg</code>, <code>modifiers</code>, <code>instance</code>, <code>dir</code> |
| **Function shorthand** | One function used as both <code>mounted</code> and <code>updated</code> |
| **getSSRProps** | Hook that returns attributes for server-rendered HTML |
| **Directive on a component** | Applies to the root element; warns on multi-root components |

---
**Conclusion:** A custom directive is a small object of lifecycle hooks, or a single function for <code>mounted</code> plus <code>updated</code>, that Vue calls with the real element and a binding carrying <code>value</code>, <code>oldValue</code>, <code>arg</code> and <code>modifiers</code>. Register it as a <code>vName</code> variable in <code>&lt;script setup&gt;</code>, locally, or with <code>app.directive</code>; add resources in <code>mounted</code> and remove them in <code>unmounted</code>; and add <code>getSSRProps</code> if the server HTML needs attributes. As verified on Vue 3.5.44, hooks run on every owner update, a <code>mounted</code> binding goes stale, and writing state from <code>updated</code> loops forever, so keep directives small and reserved for genuine DOM work.`,
    examples: [
      {
        label: "v-focus, v-highlight with arg and modifier, v-click-outside with cleanup",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { ref } from "vue";

// Log with console.log, NOT into reactive state the template renders: writing it
// from a directive's updated hook re-renders the component, which calls updated
// again, forever ("Maximum recursive updates exceeded").
const say = (msg) => console.log(msg);

// 1. Object form: pick the lifecycle hooks you need.
//    In <script setup>, any camelCase variable named vSomething is usable as v-something.
const vFocus = {
  mounted(el) {
    el.focus();
    say("v-focus mounted: focused <" + el.tagName.toLowerCase() + ">");
  },
};

// 2. Function shorthand = the same function for mounted AND updated.
//    binding.arg is the part after ":", binding.modifiers the ".flags".
const vHighlight = (el, binding) => {
  const prop = binding.arg === "bg" ? "backgroundColor" : "color";
  el.style[prop] = binding.value;
  el.style.fontWeight = binding.modifiers.bold ? "bold" : "";
  say(\`v-highlight:\${binding.arg} value=\${binding.value} old=\${binding.oldValue} bold=\${!!binding.modifiers.bold}\`);
};

// 3. A directive that owns a resource: add in mounted, remove in unmounted.
//    Keep the latest handler on the element: binding in mounted is a snapshot.
const vClickOutside = {
  mounted(el, binding) {
    el._handler = binding.value;
    el._onDocClick = (event) => {
      if (!el.contains(event.target)) el._handler(event);
    };
    document.addEventListener("click", el._onDocClick);
    say("v-click-outside: listener added");
  },
  updated(el, binding) {
    el._handler = binding.value;
  },
  unmounted(el) {
    document.removeEventListener("click", el._onDocClick);
    say("v-click-outside: listener removed");
  },
};

const color = ref("crimson");
const open = ref(true);
const outsideClicks = ref(0);
</script>

<template>
  <input v-focus placeholder="I get focus on mount" />

  <p v-highlight:color.bold="color">Text colour follows the select</p>
  <p v-highlight:bg="'lightyellow'">Static background</p>
  <select v-model="color">
    <option>crimson</option>
    <option>teal</option>
  </select>

  <button id="toggle" @click="open = !open">{{ open ? "close" : "open" }} panel</button>
  <div v-if="open" id="panel" v-click-outside="() => outsideClicks++">
    Panel. Clicks outside it: {{ outsideClicks }}
  </div>
</template>
`,
      },
      {
        label: "Typed, globally registered directive with SSR support",
        tech: "ts",
        runnable: false,
        code: `// directives/tooltip.ts
import type { App, Directive, DirectiveBinding } from "vue";

type TooltipEl = HTMLElement & { _tip?: HTMLSpanElement };
type Placement = "top" | "bottom";

// Directive<Element, Value, Modifiers, Arg> types el, binding.value, modifiers and arg.
export const vTooltip: Directive<TooltipEl, string, "fast", Placement> = {
  mounted(el, binding) {
    const tip = document.createElement("span");
    tip.className = \`tip tip-\${binding.arg ?? "top"}\`;
    tip.textContent = binding.value;
    el._tip = tip;
    el.append(tip);
  },
  updated(el, binding: DirectiveBinding<string, "fast", Placement>) {
    if (binding.value !== binding.oldValue && el._tip) el._tip.textContent = binding.value;
  },
  beforeUnmount(el) {
    el._tip?.remove();
    delete el._tip;
  },
  // Only used by server rendering: attributes to put in the HTML string.
  getSSRProps(binding) {
    return { "aria-label": binding.value };
  },
};

// Global registration, usually in main.ts: app.use(directives)
export default {
  install(app: App) {
    app.directive("tooltip", vTooltip);
  },
};

// Let templates type-check v-tooltip everywhere (vue-tsc reads this).
declare module "vue" {
  interface GlobalDirectives {
    vTooltip: typeof vTooltip;
  }
}
`,
      },
    ],
  },
];

export default augments;
