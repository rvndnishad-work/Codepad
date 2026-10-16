/**
 * Vue ULTRA — batch 02: binding and the component contract (class and style
 * bindings, dynamic arguments and v-bind shorthand, v-model on form inputs,
 * v-model modifiers, v-model on components, defineModel, props and their
 * validation, defineProps/defineEmits, declaring and validating emits, scoped
 * styles).
 *
 * Full CLAUDE.md treatment per question, matching the Angular, React and
 * Next.js ultra banks: a plain-language story first, `📌 Interview term:`
 * callouts, Verified sections quoting output that was actually produced, a
 * theme-aware `.iq-diagram` SVG, comparison tables, topic-specific pitfalls,
 * the §7 "How to Answer in an Interview" card, a glossary and a conclusion.
 *
 * Every "Verified" block was produced on Vue 3.5.44. Single-file examples were
 * compiled with @vue/compiler-sfc and mounted in jsdom with
 * scripts/verify-vue-example.mjs (examples marked runnable passed it as-is).
 * Multi-file examples were compiled the same way and mounted together; compiler
 * output comes from @vue/compiler-dom compile() and @vue/compiler-sfc
 * compileScript()/compileStyle(); type errors come from vue-tsc 3.3.13; the
 * scoped-styles answer also quotes a real `vite build` (vite 8.3.4,
 * @vitejs/plugin-vue 6.0.10) and computed styles read in headless Chromium.
 *
 * Conventions: SVG attributes double-quoted, no apostrophes inside SVG blocks, no
 * leading H1, `description` is plain markdown (no HTML).
 */
import type { VueAugment } from "./vue-augments.types";

const augments: VueAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you bind classes and styles dynamically?",
    seoDescription:
      "Vue :class and :style take strings, objects and arrays, merge with static values and fall through to a child root. Verified output on Vue 3.5.",
    description: `**Question presented to candidate:**
"A status badge needs a red background when there is an error, a bold font when it is active, and a font size that comes from a slider. Show me how you would bind the classes and styles in Vue, and tell me what happens when the badge is a child component and the parent also passes a class."

**What a strong answer should cover:**
- \`:class\` accepts a **string, an object** (\`{ active: isActive }\`, key = class name, value = on or off) **or an array** that can mix both.
- A static \`class\` attribute and a bound \`:class\` on the same element are **merged**, not overwritten.
- \`:style\` accepts an **object** (camelCase or quoted kebab-case keys) or an **array of objects** that are merged left to right; units are your job.
- Put non-trivial logic in a **computed** object rather than a long inline expression.
- On a component, \`class\` and \`style\` from the parent **fall through to the single root element** and merge with its own; a multi-root component needs \`$attrs.class\` bound explicitly, otherwise Vue warns.
- Under the hood the compiler wraps the bindings in \`normalizeClass\` / \`normalizeStyle\` and marks the element with the CLASS / STYLE patch flags.

**Clarifying questions expected:**
- "Is the badge a native element or a child component, and does that component have one root element?"
- "Are the colours design tokens (classes) or truly dynamic values (inline styles or CSS variables)?"

**Code / implementation expected:** Yes. A template using object and array syntax for both bindings, ideally driven by a computed property.`,
    answer: `**Target Audience:** Anyone preparing for a Vue interview. Assumes basic HTML and CSS and a first look at Vue templates.
**Difficulty:** Easy

> **How to read this doc:** Plain language first, then \`📌 Interview term:\` callouts that give you the exact vocabulary. Every rendered class string, style attribute, warning and compiler line quoted below came from running the code on Vue 3.5.44 (compiled with \`@vue/compiler-sfc\`, mounted in jsdom).

## 1. Why This Even Matters — A Story First

Imagine a coffee shop loyalty card. The card itself never changes, but the barista adds stamps: a gold star when you are a member, a red sticker when your card has expired, a bigger font for your name once you reach VIP. Nobody prints a new card each time; they just stick things on or peel them off.

That is exactly the job of class and style bindings. The element (the card) stays put, and Vue keeps adding or removing classes (stickers) and inline styles (the font size) as your state changes. You describe **which** stickers should be on the card right now, and Vue works out what to add and remove.

Doing this by hand means string concatenation like \`"btn " + (active ? "active " : "") + (error ? "danger" : "")\`, which is ugly and easy to get wrong. Vue gives \`class\` and \`style\` special treatment so you can describe them as data instead.

## 2. The Core Idea: Describe the Classes, Vue Builds the String

\`class\` and \`style\` are ordinary HTML attributes, so you can bind them with \`v-bind\` like any other attribute (\`:class\` is the shorthand; see [dynamic arguments and v-bind shorthand](/interview-question/what-are-dynamic-arguments-and-v-bind-shorthand)). What makes them special is that Vue accepts **objects and arrays** for them, not just strings.

📌 **Interview term: Object syntax** — \`:class="{ active: isActive, 'text-danger': hasError }"\`. Each key is a class name; the class is present when its value is truthy. Class names with dashes need quotes.

📌 **Interview term: Array syntax** — \`:class="[isActive ? 'active' : '', { error: hasError }, 'base']"\`. Each entry is added in order; entries may themselves be strings, objects or nested arrays. Falsy entries (empty string, \`null\`, \`false\`) are skipped.

📌 **Interview term: Class merging** — a static \`class="static"\` and a bound \`:class\` on the same element are combined. The bound value never replaces the static one.

For styles the same idea applies:

📌 **Interview term: Style binding** — \`:style="{ fontSize: size + 'px', color: c }"\`. Keys can be camelCase (\`fontSize\`) or quoted kebab-case (\`'font-size'\`). An **array** of style objects is merged left to right, so later objects win on conflicts. Vue does not add units for you: \`size + 'px'\`, not \`size\`.

## 3. How a Binding Becomes a Class String

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="A static class and a bound class object or array both go into normalizeClass, which produces the final class attribute on the element">
  <defs>
    <marker id="cls-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="30" width="200" height="70" rx="10"/>
  <text class="d-text" x="120" y="60" text-anchor="middle">class="static"</text>
  <text class="d-sub" x="120" y="82" text-anchor="middle">written in markup</text>
  <rect class="d-box-muted" x="20" y="190" width="200" height="70" rx="10"/>
  <text class="d-text" x="120" y="220" text-anchor="middle">:class object or array</text>
  <text class="d-sub" x="120" y="242" text-anchor="middle">reactive state</text>
  <rect class="d-box-accent" x="290" y="110" width="170" height="80" rx="12"/>
  <text class="d-text d-accent" x="375" y="145" text-anchor="middle">normalizeClass</text>
  <text class="d-sub" x="375" y="167" text-anchor="middle">flattens and filters</text>
  <rect class="d-box" x="530" y="110" width="170" height="80" rx="12"/>
  <text class="d-text" x="615" y="145" text-anchor="middle">class attribute</text>
  <text class="d-sub" x="615" y="167" text-anchor="middle">static active</text>
  <path class="d-edge" d="M 222 70 L 288 135" marker-end="url(#cls-arrow)"/>
  <path class="d-edge" d="M 222 222 L 288 168" marker-end="url(#cls-arrow)"/>
  <path class="d-edge-accent" d="M 462 150 L 526 150" marker-end="url(#cls-arrow)"/>
</svg>

The compiler does not concatenate strings itself. It hands everything to a small runtime helper that flattens the nested structure, drops falsy entries and joins the rest with spaces.

## 4. Verified: Object and Array Syntax, Live

The runnable example at the bottom binds a static class plus an object, an array mixing strings and objects, a style array, and passes class and style to a child component. The driver printed the DOM, then toggled state:

\`\`\`
initial
  #obj   class="static active"
  #arr   class="active base"
  #sty   style="font-size: 16px; color: green; font-weight: bold;"
  badge  class="badge from-parent" style="padding: 2px; margin: 4px;"
after toggle error
  #obj   class="static active text-danger"
  #arr   class="active error base"
  #sty   style="font-size: 16px; color: red; font-weight: bold;"
after toggle active + bigger
  #obj   class="static text-danger"
  #arr   class="error base"
  #sty   style="font-size: 20px; color: red; font-weight: bold;"
\`\`\`

Three things to notice:

- \`static\` never disappears. The static class and the bound object are merged.
- In the array, \`isActive ? 'active' : ''\` produced an empty string when false, and that empty entry was silently skipped rather than leaving a double space.
- The style array merged two objects into one attribute: \`styleObject\` supplied \`font-size\` and \`color\`, the inline object added \`font-weight\`.

The logic lives in **computed** properties (\`classObject\`, \`styleObject\`) rather than in the template. That keeps the template readable and lets Vue cache the result until a dependency changes. See [computed versus watch](/interview-question/what-is-the-difference-between-computed-and-watch) for why computed is the right tool for derived values.

## 5. Verified: What the Compiler Generates

Compiling \`<p class="static" :class="{ active: isActive }" :style="{ color: c }">x</p>\` with \`@vue/compiler-dom\`:

\`\`\`js
return (_openBlock(), _createElementBlock("p", {
  class: _normalizeClass(["static", { active: _ctx.isActive }]),
  style: _normalizeStyle({ color: _ctx.c })
}, "x", 6 /* CLASS, STYLE */))
\`\`\`

📌 **Interview term: normalizeClass / normalizeStyle** — the runtime helpers that turn any accepted shape into a final value. The static class is folded into the same array, which is why merging "just works".

📌 **Interview term: Patch flag** — the \`6 /* CLASS, STYLE */\` hint tells the renderer that only \`class\` and \`style\` can change on this element, so on update it compares just those two instead of every attribute. More in [how the Vue compiler optimises templates](/interview-question/how-does-the-vue-compiler-optimize-templates-static-hoisting-patch-flags-block-t).

Calling the helpers directly shows the flattening rules:

\`\`\`
normalizeClass(["a", { b: true, c: false }, ["d", { e: 1 }], null, ""])  ->  "a b d e"
normalizeStyle([{ color: "red" }, "font-size: 12px; color: blue"])       ->  {"color":"blue","font-size":"12px"}
\`\`\`

Nested arrays are flattened, \`null\` and \`""\` vanish, and in the style case a later entry (even a plain CSS string) overrides an earlier \`color\`.

## 6. Verified: Classes on Components

When you put \`class\` or \`style\` on a **component** rather than an element, they are [fallthrough attributes](/interview-question/what-are-fallthrough-attributes-attrs): Vue applies them to the component's root element and merges them with whatever the component already sets. In the example, the child renders \`<span class="badge" style="padding: 2px">\` and the parent writes \`class="from-parent"\` and \`:style="{ margin: '4px' }"\`; the result was \`class="badge from-parent" style="padding: 2px; margin: 4px;"\`.

That only works when there is **one** root. With two root elements Vue cannot guess which one should get the class. Verified with a component rendering \`<header>\` and \`<main>\`:

\`\`\`
[Vue warn]: Extraneous non-props attributes (class) were passed to component but could not be automatically inherited because component renders fragment or text or teleport root nodes.
<header>head</header><main>body</main>
\`\`\`

The fix is to pick the element yourself with \`$attrs.class\` (or \`useAttrs()\` in \`<script setup>\`), plus \`inheritAttrs: false\` if you want to be explicit. The fixed version rendered \`<main class="highlight">body</main>\`. Fallthrough is covered in depth in [useAttrs() vs $attrs](/interview-question/useattrs-vs-attrs-how-do-you-handle-fallthrough-attributes-in-composition-api).

## 7. Classes or Inline Styles?

| Situation | Prefer | Why |
| :--- | :--- | :--- |
| Fixed visual states (active, error, disabled) | \`:class\` with an object | Styling stays in CSS, easy to theme, works with [scoped styles](/interview-question/what-are-scoped-styles-in-vue) |
| A value that is truly continuous (slider width, drag position) | \`:style\` | You cannot pre-write a class for every pixel value |
| A dynamic value used inside a stylesheet rule | CSS \`v-bind()\` in \`<style>\` | Vue sets a CSS custom property for you; the rule stays in CSS |
| Several independent state flags | computed class object | One readable place for the logic, cached |
| Utility-class frameworks (Tailwind) | array syntax with conditionals | Keeps long lists of utilities readable |

Inline styles win over class rules in the CSS cascade (unless the class rule uses \`!important\`), so mixing both for the same property is a common source of "why is my class not applying?" confusion.

## 8. Common Pitfalls

- **Forgetting units.** Verified: \`:style="{ 'font-size': '12px', width: 40 }"\` rendered \`style="font-size: 12px;"\`. The unitless \`40\` was simply dropped, with no warning. Write \`w + 'px'\`.
- **Unquoted dashed class names.** \`{ text-danger: hasError }\` is a JavaScript syntax error; write \`{ 'text-danger': hasError }\`.
- **Putting logic inline.** A long ternary chain inside \`:class\` is hard to test and re-evaluated on every render; move it into a computed property.
- **Expecting class to reach a multi-root component.** It does not; Vue warns and drops it until you bind \`$attrs.class\` on the element you choose.
- **Building strings by hand.** \`:class="'btn ' + type"\` works, but you lose the falsy-skipping and can end up with \`"btn undefined"\`. Use an array: \`['btn', type]\`.
- **Fighting the cascade.** Setting \`color\` both in a class and in \`:style\` means the inline style always wins; decide which one owns the property.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Say what is special:</strong> <span style="color:#f0e2c8;">"Class and style are normal attributes, but Vue lets you bind them to objects and arrays, not just strings."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Object syntax:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ active: isActive }</code>: the key is the class name and the value decides whether it is on. I keep that object in a computed property."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Array syntax and merging:</strong> <span style="color:#f0e2c8;">"An array can mix strings and objects, falsy entries are skipped, and a static class on the same element is merged in, never replaced."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Styles:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:style</code> takes an object with camelCase keys or an array of objects merged left to right. Vue does not add units, so I write <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size + 'px'</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Components:</strong> <span style="color:#f0e2c8;">"On a component, class and style fall through to the single root element and merge with its own. With several roots I bind <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$attrs.class</code> myself, otherwise Vue warns."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">:class</code> compile to?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A call to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">normalizeClass</code> with the static class folded into an array, plus a CLASS patch flag so the renderer only diffs the class on update. Style works the same way with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">normalizeStyle</code> and the STYLE flag.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you use inline styles instead of classes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For truly continuous values such as a slider width or a drag position. For fixed states I use classes so the styling stays in CSS. For a dynamic value inside a stylesheet rule, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-bind()</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;style&gt;</code> sets a CSS variable.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did my class not reach the child component?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Either the child has more than one root element, so Vue cannot choose one and warns, or it sets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inheritAttrs: false</code>. The fix is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:class="$attrs.class"</code> on the right element.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does the order of objects in a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">:style</code> array matter?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. They are merged left to right, so a later object overrides an earlier one for the same property.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">{ 'text-danger': hasError }</code> different from <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">{ textDanger: hasError }</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. Object keys are used as class names literally, so the second one adds a class called <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">textDanger</code>. Only style keys are converted from camelCase.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **\`:class\`** | \`v-bind:class\`, binds the class attribute to a string, object or array |
| **Object syntax** | \`{ name: condition }\`, each class is on when its value is truthy |
| **Array syntax** | \`[a, b, { c: cond }]\`, a list of classes or objects, falsy entries skipped |
| **Class merging** | Static \`class\` and bound \`:class\` are combined on the same element |
| **\`:style\`** | Binds inline styles from an object or array of objects |
| **normalizeClass / normalizeStyle** | Runtime helpers that flatten bindings into the final value |
| **Patch flag** | Compiler hint (CLASS = 2, STYLE = 4) telling the renderer what can change |
| **Fallthrough attributes** | Attributes like class and style that a component passes to its root |

---
**Conclusion:** Vue lets you describe classes and styles as data. \`:class\` takes a string, an object of \`name: condition\` pairs, or an array mixing both, and it merges with any static class; \`:style\` takes an object or an array of objects merged left to right. Verified on Vue 3.5.44, the compiler wraps both in \`normalizeClass\`/\`normalizeStyle\` and marks the element with CLASS and STYLE patch flags, so only those attributes are diffed. On a component, class and style fall through to a single root and merge there; a multi-root component triggers a warning until you bind \`$attrs.class\` yourself.`,
    examples: [
      {
        label: "Object, array and component class/style bindings",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { ref, computed, defineComponent, h } from "vue";

const isActive = ref(true);
const hasError = ref(false);
const size = ref(16);

// Object syntax: each key is a class, each value decides whether it is on
const classObject = computed(() => ({
  active: isActive.value,
  "text-danger": hasError.value,
}));

// Style object: camelCase keys, numbers need units you add yourself
const styleObject = computed(() => ({
  fontSize: size.value + "px",
  color: hasError.value ? "red" : "green",
}));

// A child with one root element: class and style from the parent merge into it
const Badge = defineComponent({
  setup(_, { slots }) {
    return () => h("span", { class: "badge", style: { padding: "2px" } }, slots.default?.());
  },
});
</script>

<template>
  <p id="obj" class="static" :class="classObject">object syntax</p>
  <p id="arr" :class="[isActive ? 'active' : '', { error: hasError }, 'base']">array syntax</p>
  <p id="sty" :style="[styleObject, { fontWeight: 'bold' }]">style binding</p>
  <Badge id="badge" class="from-parent" :style="{ margin: '4px' }">badge</Badge>
  <button @click="isActive = !isActive">toggle active</button>
  <button @click="hasError = !hasError">toggle error</button>
  <button @click="size += 4">bigger</button>
</template>
`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are dynamic arguments and v-bind shorthand?",
    seoDescription:
      "Vue dynamic arguments like :[name] and @[event], the : and @ shorthands, same-name :id shorthand (3.4+), v-bind objects and .prop/.camel/.attr.",
    description: `**Question presented to candidate:**
"In a Vue template I see \`:id\`, \`:[attrName]="value"\`, \`@[eventName]="handler"\` and \`v-bind="attrs"\`. Walk me through what each of these does and where the limits of dynamic arguments are."

**What a strong answer should cover:**
- \`:\` is shorthand for \`v-bind:\` and \`@\` for \`v-on:\`; the part after the colon is the directive **argument**.
- A **dynamic argument** in square brackets (\`:[key]\`, \`@[event]\`) computes the attribute or event **name** from state; \`null\` removes the binding.
- Constraints: the expression must evaluate to a string (or null), cannot contain spaces or quotes, and in in-DOM templates the browser lowercases it.
- **Same-name shorthand** (Vue 3.4+): \`:id\` means \`:id="id"\`.
- \`v-bind="obj"\` with no argument spreads an object of attributes, and in Vue 3 the **order** relative to other attributes decides who wins.
- Modifiers: \`.prop\` (shorthand \`.name\`), \`.attr\`, \`.camel\`.

**Clarifying questions expected:**
- "Are these templates compiled by the build (SFCs) or written directly in the HTML page (in-DOM templates)?"

**Code / implementation expected:** Optional. A short template showing a dynamic attribute and event name is enough; reading the compiled output is a bonus.`,
    answer: `**Target Audience:** Vue beginners who know what \`v-bind\` and \`v-on\` do and want the full picture of their syntax.
**Difficulty:** Easy

> **How to read this doc:** Plain language first, then \`📌 Interview term:\` callouts. The compiled code, compiler errors, runtime errors and DOM output below came from running Vue 3.5.44 (\`@vue/compiler-dom\` for compiler output, jsdom for the runtime).

## 1. Why This Even Matters — A Story First

Think of a label maker at a warehouse. Normally the operator types what goes **on** a label: "Fragile". That is a normal binding: the attribute name is fixed (\`title\`), only its value changes.

Now imagine the operator also gets to choose **which sticker sheet** to print on: sometimes the red "hazard" sheet, sometimes the blue "returns" sheet. The kind of label is decided at runtime too. That is a dynamic argument: the attribute **name** itself (\`title\` or \`aria-describedby\`, \`click\` or \`dblclick\`) comes from your state.

And shorthands are just the operator saving keystrokes: \`:\` instead of typing \`v-bind:\` every time, and in Vue 3.4+ even dropping the value when it would repeat the name.

## 2. Directives, Arguments and Shorthands

A directive like \`v-bind:href="url"\` has three parts: the **name** (\`v-bind\`), the **argument** after the colon (\`href\`), and the **value** expression (\`url\`). This anatomy is covered in [Vue template syntax](/interview-question/what-is-vue-template-syntax-interpolation-directives-expressions).

📌 **Interview term: v-bind shorthand** — \`:href="url"\` is exactly \`v-bind:href="url"\`. The \`@\` symbol does the same for \`v-on\`: \`@click\` is \`v-on:click\`, covered in [handling events with v-on](/interview-question/how-do-you-handle-events-in-vue-v-on-and-event-modifiers).

📌 **Interview term: Same-name shorthand** — since Vue 3.4, \`:id\` with no value means \`:id="id"\`. Vue 3.4 "Slam Dunk" shipped on 28 December 2023 and its announcement lists this alongside the stabilised \`defineModel\` ([Vue blog: Announcing Vue 3.4](https://blog.vuejs.org/posts/vue-3-4)). The attribute name is converted to camelCase to find the variable, so \`:aria-label\` would look for \`ariaLabel\`.

📌 **Interview term: Dynamic argument** — square brackets around the argument make it an expression: \`:[attrName]="value"\` binds whatever attribute \`attrName\` currently names, and \`@[eventName]="handler"\` listens to whatever event it names.

📌 **Interview term: Object binding (v-bind without an argument)** — \`v-bind="{ id: 'a', 'data-role': 'x' }"\` spreads every key as an attribute, the template version of JavaScript object spread.

## 3. Anatomy of a Directive

<svg class="iq-diagram" width="100%" viewBox="0 0 720 260" role="img" aria-label="A directive split into its name v-bind or the colon shorthand, a static or dynamic argument in square brackets, and the value expression">
  <defs>
    <marker id="dyn-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="40" width="170" height="70" rx="10"/>
  <text class="d-text" x="115" y="70" text-anchor="middle">v-bind or :</text>
  <text class="d-sub" x="115" y="92" text-anchor="middle">directive name</text>
  <rect class="d-box-accent" x="275" y="40" width="170" height="70" rx="10"/>
  <text class="d-text d-accent" x="360" y="70" text-anchor="middle">[attrName]</text>
  <text class="d-sub" x="360" y="92" text-anchor="middle">argument</text>
  <rect class="d-box-muted" x="520" y="40" width="170" height="70" rx="10"/>
  <text class="d-text" x="605" y="70" text-anchor="middle">"value"</text>
  <text class="d-sub" x="605" y="92" text-anchor="middle">expression</text>
  <rect class="d-box" x="130" y="170" width="200" height="60" rx="10"/>
  <text class="d-text" x="230" y="197" text-anchor="middle">static: href</text>
  <text class="d-sub" x="230" y="217" text-anchor="middle">name fixed at compile</text>
  <rect class="d-box" x="390" y="170" width="200" height="60" rx="10"/>
  <text class="d-text" x="490" y="197" text-anchor="middle">dynamic: [expr]</text>
  <text class="d-sub" x="490" y="217" text-anchor="middle">name read from state</text>
  <path class="d-edge" d="M 340 114 L 255 166" marker-end="url(#dyn-arrow)"/>
  <path class="d-edge-accent" d="M 380 114 L 465 166" marker-end="url(#dyn-arrow)"/>
</svg>

Only the middle part changes between a static and a dynamic binding. The name and the value expression work the same either way.

## 4. Verified: Dynamic Names Swapped at Runtime

The runnable example binds \`:[attrName]="'hint'"\` and \`@[eventName]="onEvent"\`, then a button flips \`attrName\` from \`title\` to \`aria-describedby\` and \`eventName\` from \`click\` to \`dblclick\`. The driver clicked and double-clicked before and after the swap:

\`\`\`
before swap: id="save-btn" title="hint" data-role="primary" aria-label="Save the form"
click + dblclick -> events seen: click
after swap:  id="save-btn" data-role="primary" aria-label="Save the form" aria-describedby="hint"
click + dblclick -> events seen: click, dblclick
\`\`\`

When the name changed, Vue **removed** the old \`title\` attribute and added \`aria-describedby\`; it also detached the click listener and attached a dblclick one (the second double-click was the only new event recorded). Also visible: \`:id\` (same-name shorthand) rendered \`id="save-btn"\`, \`v-bind="extra"\` spread \`data-role\` and \`aria-label\`, and \`:disabled="false"\` left no \`disabled\` attribute at all.

## 5. Verified: What the Compiler Generates

\`\`\`js
// <a :[attrName]="url" @[eventName]="go">x</a>
_createElementBlock("a", _mergeProps({ [_ctx.attrName || ""]: _ctx.url },
  { [_toHandlerKey(_ctx.eventName)]: _ctx.go }), "x", 16 /* FULL_PROPS */)

// <a :id>x</a>   and   <a :id="id">x</a>   compile identically:
_createElementBlock("a", { id: _ctx.id }, "x", 8 /* PROPS */, ["id"])
\`\`\`

📌 **Interview term: FULL_PROPS patch flag** — with a static name the compiler knows exactly which prop can change (\`8 /* PROPS */, ["id"]\`). With a dynamic name it cannot, so it emits \`16 /* FULL_PROPS */\` and the renderer diffs all props on that element. Dynamic arguments are a little more work for the [patch-flag optimiser](/interview-question/how-does-the-vue-compiler-optimize-templates-static-hoisting-patch-flags-block-t), which is a reason to use them only when the name genuinely varies.

\`_toHandlerKey("click")\` produces \`onClick\`, the same key a static \`@click\` would use. The same-name shorthand is pure syntax sugar: the output is byte-for-byte the same as writing the value out.

## 6. Verified: The Limits of Dynamic Arguments

**No spaces or quotes.** The argument lives inside an HTML attribute **name**, where spaces and quotes are not allowed. Both \`:['foo' + bar]="x"\` and \`:[foo bar]="x"\` fail to compile:

\`\`\`
End bracket for dynamic directive argument was not found. Note that dynamic directive argument cannot contain spaces.
\`\`\`

Move any complex logic into a computed property and bind \`:[computedName]\`.

**\`null\` removes the binding.** Setting the name to \`null\` removed the attribute entirely:

\`\`\`
initial:     <span id="dyn" title="hello">dyn</span>
name = null: <span id="dyn">dyn</span>
\`\`\`

**Only strings (or null).** Anything else is a bug. In this run, setting the name to the number \`42\` did not produce a friendly Vue warning first; the DOM refused the attribute name and the update crashed:

\`\`\`
[Vue warn]: Unhandled error during execution of component update
[DOMException [InvalidCharacterError]: "42" did not match the Name production]
\`\`\`

**In-DOM templates are lowercased.** If you write the template directly in an HTML page, the browser parses it before Vue sees it, and HTML attribute names are case-insensitive. Parsing \`<a :[someAttr]="url" @[eventName]="go">\` with an HTML parser (jsdom) gave back \`<a :[someattr]="url" @[eventname]="go">\`, so Vue would look for a variable called \`someattr\`. Single File Components are compiled by Vue directly and do not have this problem.

## 7. Verified: v-bind Objects and Modifiers

**Order matters in Vue 3.** \`v-bind="obj"\` behaves like object spread at its position:

\`\`\`js
// <div id="a" v-bind="obj">   ->  _mergeProps({ id: "a" }, _ctx.obj)   obj.id wins
// <div v-bind="obj" id="a">   ->  _mergeProps(_ctx.obj, { id: "a" })   "a" wins
\`\`\`

At runtime, with \`obj = { id: "from-object" }\`, the first form rendered \`id="from-object"\` and the second \`id="last"\`. This is a Vue 2 to 3 change; the \`@vue/compat\` build's warning for it reads: "v-bind="obj" usage is now order sensitive and behaves like JavaScript object spread". \`class\` and \`style\` are the exception: they are merged rather than overwritten (see [class and style bindings](/interview-question/how-do-you-bind-classes-and-styles-dynamically)).

**Modifiers** change how the value is applied:

| Written | Compiled key | Effect |
| :--- | :--- | :--- |
| \`:text-content.prop="msg"\` | \`".text-content"\` | Force a DOM **property** instead of an attribute |
| \`.inner-text="t"\` | \`".inner-text"\` | Shorthand for \`.prop\` (leading dot) |
| \`:width.attr="w"\` | \`"^width"\` | Force an HTML **attribute** (no template shorthand; \`^\` is internal) |
| \`:view-box.camel="vb"\` | \`viewBox\` | Camelise the name, for in-DOM SVG attributes |

## 8. Common Pitfalls

- **Expressions with spaces in the brackets.** \`:['data-' + key]\` will not compile; compute the full name first.
- **Camel-case names in in-DOM templates.** \`:[someAttr]\` becomes \`:[someattr]\` before Vue sees it. Use lowercase variable names or an SFC.
- **Binding a number or object as the name.** Only strings and \`null\` are valid; a number crashed the update in our run.
- **Expecting \`v-bind="obj"\` to lose to an explicit attribute.** In Vue 3 the later one wins, whichever it is. Put the object first if explicit attributes should override it.
- **Thinking same-name shorthand works everywhere.** It needs Vue 3.4+, a static argument (\`:[x]\` with no value is a compile error: "v-bind with same-name shorthand only allows static argument."), and a variable whose camelCase name matches.
- **Using dynamic names where a static one would do.** They force \`FULL_PROPS\` diffing on the element.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Shorthands first:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-bind:</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-on:</code>. Since 3.4, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:id</code> with no value means <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:id="id"</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Dynamic arguments:</strong> <span style="color:#f0e2c8;">"Square brackets make the argument an expression, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:[attrName]</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@[eventName]</code> takes the attribute or event name from state."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. What happens on change:</strong> <span style="color:#f0e2c8;">"When the name changes, Vue removes the old attribute or listener and adds the new one. Setting it to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> removes the binding."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The limits:</strong> <span style="color:#f0e2c8;">"The expression must give a string, cannot contain spaces or quotes because it lives in an attribute name, and is lowercased in in-DOM templates. Complex names go in a computed."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Object form and modifiers:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-bind="obj"</code> spreads attributes and, in Vue 3, order decides who wins. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.prop</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.attr</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.camel</code> control how the value is applied."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is there a performance cost to dynamic arguments?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A small one. With a static name the compiler tells the renderer exactly which prop can change. With a dynamic name it uses the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FULL_PROPS</code> flag, so every prop on that element is compared on update.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">:[someAttr]</code> break in a CDN page but not in my SFC?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In an in-DOM template the browser parses the HTML first and lowercases attribute names, so Vue looks up <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">someattr</code>. SFCs are compiled by Vue, which keeps the case.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you bind an attribute name that needs string concatenation?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not inline, because quotes and spaces are not allowed. Compute it, for example <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const attrName = computed(() =&gt; 'data-' + key.value)</code>, then bind <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:[attrName]</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changed about <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">v-bind="obj"</code> from Vue 2?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In Vue 2 an explicit attribute always beat the object. In Vue 3 it behaves like object spread: whichever comes later in the tag wins, except class and style, which merge.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">.prop</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When you need to set a DOM property that has no matching attribute, or a value that is not a string, such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:text-content.prop</code> or passing an object to a custom element.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Argument** | The part after the colon in a directive: \`href\` in \`v-bind:href\` |
| **\`:\` / \`@\`** | Shorthands for \`v-bind:\` and \`v-on:\` |
| **Dynamic argument** | \`[expr]\` as the argument, so the attribute or event name comes from state |
| **Same-name shorthand** | \`:id\` means \`:id="id"\`, Vue 3.4+ |
| **Object binding** | \`v-bind="obj"\`, spreads an object of attributes; order sensitive in Vue 3 |
| **\`.prop\` / \`.attr\` / \`.camel\`** | Modifiers that force property, force attribute, or camelise the name |
| **FULL_PROPS** | Patch flag meaning "diff every prop", used when names are dynamic |
| **In-DOM template** | A template written in the HTML page, parsed by the browser first |

---
**Conclusion:** \`:\` and \`@\` are shorthands for \`v-bind:\` and \`v-on:\`, and since Vue 3.4 \`:id\` alone means \`:id="id"\`. Wrapping the argument in square brackets makes the attribute or event **name** dynamic: verified on Vue 3.5.44, changing it removes the old attribute or listener and adds the new one, \`null\` removes the binding, and the compiler falls back to the \`FULL_PROPS\` patch flag. Dynamic arguments cannot contain spaces or quotes, must be strings, and are lowercased in in-DOM templates. \`v-bind="obj"\` spreads attributes and, unlike Vue 2, follows object-spread order.`,
    examples: [
      {
        label: "Dynamic attribute and event names, same-name shorthand, v-bind object",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { ref } from "vue";

const attrName = ref("title");
const eventName = ref("click");
const log = ref([]);
const id = "save-btn";
const disabled = ref(false);
const extra = { "data-role": "primary", "aria-label": "Save the form" };

function onEvent(e) {
  log.value.push(e.type);
}
function swap() {
  attrName.value = attrName.value === "title" ? "aria-describedby" : "title";
  eventName.value = eventName.value === "click" ? "dblclick" : "click";
}
</script>

<template>
  <!-- :[attrName] is a dynamic argument: the attribute NAME comes from state -->
  <!-- :id is same-name shorthand for :id="id" (Vue 3.4+) -->
  <!-- v-bind="extra" spreads an object of attributes -->
  <button
    :id
    :[attrName]="'hint'"
    @[eventName]="onEvent"
    :disabled="disabled"
    v-bind="extra"
  >Save</button>
  <button class="swap" @click="swap">swap</button>
  <p>events seen: {{ log.join(", ") || "none" }}</p>
</template>
`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How does v-model work on form inputs?",
    seoDescription:
      "How Vue v-model binds text inputs, textareas, checkboxes, radios and selects: the events it listens to, IME handling and what it compiles to in Vue 3.5.",
    description: `**Question presented to candidate:**
"We have a sign-up form with a name field, a bio textarea, a terms checkbox, topping checkboxes, a size radio group and a country dropdown. Explain how \`v-model\` keeps each of these in sync with component state, and what it actually does under the hood."

**What a strong answer should cover:**
- \`v-model\` is **two-way binding sugar**: it writes state into the element and listens for the element's event to write back.
- The **property and event differ by element**: text and textarea use \`value\` + \`input\`; checkbox and radio use \`checked\` + \`change\`; select uses \`value\` + \`change\`.
- A single checkbox binds a **boolean** (or \`true-value\`/\`false-value\`); several checkboxes bound to one **array** collect their \`value\`s; a multiple select binds an array.
- \`v-model\` **ignores** the initial \`value\`, \`checked\` or \`selected\` attributes: state is the single source of truth.
- Text inputs **wait for IME composition** to finish before updating.
- It compiles to a runtime directive (\`vModelText\`, \`vModelCheckbox\`, ...) plus an \`onUpdate:modelValue\` handler; the expression must be assignable.

**Clarifying questions expected:**
- "Should the field update on every keystroke or only on blur?" (leads into modifiers)
- "Is any of these a custom component rather than a native element?"

**Code / implementation expected:** Yes. A form with at least a text input, a checkbox group and a select, showing the bound state.`,
    answer: `**Target Audience:** Vue beginners building their first forms. Assumes HTML form elements and a little JavaScript.
**Difficulty:** Easy

> **How to read this doc:** Plain language first, then \`📌 Interview term:\` callouts. Every state dump, compiler snippet and compiler error below came from running Vue 3.5.44: templates compiled with \`@vue/compiler-sfc\` / \`@vue/compiler-dom\`, mounted in jsdom, with a driver typing, clicking and selecting.

## 1. Why This Even Matters — A Story First

Picture a whiteboard in a shared office and a notebook on your desk that must always say the same thing. Without help, you would copy every change by hand: someone writes on the whiteboard, you update the notebook; you change the notebook, you walk over and rewrite the whiteboard. Forget once and they drift apart.

A form field is the whiteboard (the user writes on it) and your component state is the notebook (your code writes on it). \`v-model\` is the assistant who copies in both directions, instantly, every time. You never write the copying code yourself.

The interesting part of the question is that each kind of whiteboard is different. A text box reports changes differently from a checkbox, and a group of checkboxes needs an array, not a boolean. \`v-model\` knows these differences so you do not have to.

## 2. The Core Idea: One Value, Two Directions

📌 **Interview term: Two-way binding** — the state drives the element, and user input drives the state. In Vue it is written \`v-model="name"\` and is shorthand for a one-way binding **plus** an event listener.

For a plain text input, \`v-model="name"\` behaves like:

\`\`\`vue
<input :value="name" @input="name = $event.target.value" />
\`\`\`

That is close enough to explain the idea, but section 5 shows the compiler actually uses a small runtime directive, which is why \`v-model\` can handle IME composition and other details that the hand-written version misses.

📌 **Interview term: Single source of truth** — \`v-model\` ignores the \`value\`, \`checked\` and \`selected\` attributes written in markup. The state is what counts. Verified: \`<input value="from-attribute" v-model="text" />\` with \`text = "from-state"\` rendered with \`input.value = from-state\`.

Each element type pairs a different DOM property with a different event:

| Element | DOM property written | Event listened to | Bound state type |
| :--- | :--- | :--- | :--- |
| \`<input type="text">\`, \`<textarea>\` | \`value\` | \`input\` | string |
| \`<input type="checkbox">\` (one) | \`checked\` | \`change\` | boolean, or \`true-value\`/\`false-value\` |
| \`<input type="checkbox">\` (many, same array) | \`checked\` | \`change\` | array of their \`value\`s |
| \`<input type="radio">\` | \`checked\` | \`change\` | the selected \`value\` |
| \`<select>\` | selected option | \`change\` | the option \`value\` |
| \`<select multiple>\` | selected options | \`change\` | array |

## 3. The Round Trip

<svg class="iq-diagram" width="100%" viewBox="0 0 720 280" role="img" aria-label="State writes the value or checked property into the input element, and the input or change event writes the new value back into state">
  <defs>
    <marker id="vmi-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="30" y="80" width="200" height="110" rx="12"/>
  <text class="d-text d-accent" x="130" y="128" text-anchor="middle">Component state</text>
  <text class="d-sub" x="130" y="152" text-anchor="middle">ref or reactive</text>
  <rect class="d-box-muted" x="490" y="80" width="200" height="110" rx="12"/>
  <text class="d-text" x="590" y="128" text-anchor="middle">Form element</text>
  <text class="d-sub" x="590" y="152" text-anchor="middle">input, select, textarea</text>
  <path class="d-edge-accent" d="M 236 105 L 484 105" marker-end="url(#vmi-arrow)"/>
  <text class="d-sub" x="360" y="90" text-anchor="middle">writes value or checked</text>
  <path class="d-edge" d="M 484 170 L 236 170" marker-end="url(#vmi-arrow)"/>
  <text class="d-sub" x="360" y="200" text-anchor="middle">input or change event</text>
  <text class="d-sub" x="360" y="222" text-anchor="middle">onUpdate:modelValue</text>
</svg>

The top arrow runs whenever the state changes; the bottom arrow runs whenever the user acts. Both are generated from the one \`v-model\` you wrote.

## 4. Verified: Every Control in One Form

The runnable example at the bottom binds all six kinds of control. The driver typed, clicked and selected, then read the state:

\`\`\`
initial : {"name":"Ada","bio":"","agreed":false,"plan":"monthly","toppings":["cheese"],"size":"M","country":"","tags":[]}
DOM     : name.value=Ada t1.checked=true m.checked=true
after   : {"name":"Grace","bio":"line1","agreed":true,"plan":"yearly","toppings":["cheese","olives"],"size":"S","country":"Japan","tags":["vue","css"]}
\`\`\`

Reading it line by line:

- **Initial render went state to DOM.** \`toppings\` started as \`["cheese"]\`, so the cheese checkbox rendered checked; \`size\` was \`"M"\`, so the M radio was checked.
- **Text and textarea** became plain strings.
- **Single checkbox** \`agreed\` flipped to \`true\`. The \`plan\` checkbox used \`true-value="yearly" false-value="monthly"\`, so it stored those strings instead of a boolean.
- **Checkbox group** pushed \`"olives"\` into the existing array.
- **Radio** stored the clicked radio's \`value\`.
- **Select** stored the option text (\`"Japan"\`), because an \`<option>\` without a \`value\` attribute uses its text. The \`multiple\` select produced an array.

📌 **Interview term: true-value / false-value** — Vue-specific attributes on a checkbox that replace \`true\`/\`false\` with values of your choice. They do not change what the browser submits in a native form post, because an unchecked box is not submitted at all.

## 5. Verified: What the Compiler Generates

Compiling \`<input v-model="name" />\`:

\`\`\`js
return _withDirectives((_openBlock(), _createElementBlock("input", {
  "onUpdate:modelValue": $event => ((_ctx.name) = $event)
}, null, 8 /* PROPS */, ["onUpdate:modelValue"])), [
  [_vModelText, _ctx.name]
])
\`\`\`

📌 **Interview term: vModelText / vModelCheckbox / vModelRadio / vModelSelect / vModelDynamic** — the built-in runtime directives that do the real work. The compiler picks one by element and \`type\`; a checkbox compiled to \`_vModelCheckbox\`, a radio to \`_vModelRadio\`, a select to \`_vModelSelect\`, and \`<input :type="t" v-model="v">\` to \`_vModelDynamic\`, which decides at runtime because the type is not known in advance.

The directive listens for the right event, converts the value, and calls the generated \`onUpdate:modelValue\` function to assign it. That assignment is why the expression must be writable.

The name \`onUpdate:modelValue\` is not an accident: it is the same protocol a **component** uses for \`v-model\`, explained in [how v-model works on components](/interview-question/how-does-v-model-work-on-components).

## 6. Verified: IME Composition

📌 **Interview term: IME composition** — typing Chinese, Japanese or Korean goes through an Input Method Editor: you type several keystrokes ("nih") that the IME turns into the final characters ("你好"). The browser fires \`input\` events during that process.

\`vModelText\` listens for \`compositionstart\` and \`compositionend\` and ignores \`input\` events in between. Verified by dispatching the events in order:

\`\`\`
initial: input.value=from-state | state=from-state
mid-composition input event: state=from-state
after compositionend: state=你好
state changed in code: input.value=set-in-code
\`\`\`

The half-typed \`nih\` never reached the state. The hand-written \`:value\` + \`@input\` version from section 2 would have stored it. (This was checked by dispatching synthetic composition events in jsdom; a real IME in a real browser was not exercised here.) The last line shows the other direction: assigning the state in code updated the field.

## 7. Verified: Compiler Errors You Will Meet

| Template | Error from \`@vue/compiler-dom\` |
| :--- | :--- |
| \`<input v-model="a + b" />\` | v-model value must be a valid JavaScript member expression. |
| \`<div v-model="x"></div>\` | v-model can only be used on \`<input>\`, \`<textarea>\` and \`<select>\` elements. |
| \`<input v-model="name" :value="other" />\` | Unnecessary value binding used alongside v-model. It will interfere with v-model's behavior. |
| \`const name = "Ada"\` in \`<script setup>\`, then \`v-model="name"\` | v-model cannot be used on a const binding because it is not writable. |

The last one is the classic beginner mistake: the variable must be a \`ref\` (or a property of a \`reactive\` object), both so that it is writable and so that the template re-renders. See [ref versus reactive](/interview-question/what-is-the-difference-between-ref-and-reactive).

One more: \`<textarea>{{ text }}</textarea>\` compiles without an error, but it is one-way text content, not a binding. Use \`<textarea v-model="text">\`.

## 8. Common Pitfalls

- **Setting an initial value in markup.** \`value="..."\`, \`checked\` and \`selected\` are ignored under \`v-model\`; initialise the ref instead.
- **Binding a checkbox group to a boolean.** Several checkboxes need an **array** ref, or they all toggle together.
- **No placeholder option.** If the initial value matches no option, the select renders with nothing selected (verified: state \`"Peru"\` with options India and Japan gave \`selectedIndex=-1\`). A \`<option disabled value="">Pick one</option>\` gives a sensible empty state, as in the example.
- **Expecting numbers from text inputs.** The value is always a string unless you use \`.number\` or \`type="number"\`; see [v-model modifiers](/interview-question/what-are-v-model-modifiers).
- **Rebuilding v-model by hand.** \`:value\` + \`@input\` loses IME handling and checkbox-array logic. Use \`v-model\` and reach for modifiers when you need different timing.
- **Assuming \`v-model\` validates.** It only syncs. Validation is a separate concern: see [forms and validation in Vue](/interview-question/how-do-you-handle-forms-and-validation-in-vue).

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Define it:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-model</code> is two-way binding sugar: it writes state into the element and listens for the element event to write the new value back."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Per element:</strong> <span style="color:#f0e2c8;">"Text and textarea use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">value</code> and the input event; checkboxes, radios and selects use checked or selected and the change event."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Shapes of state:</strong> <span style="color:#f0e2c8;">"One checkbox is a boolean, or custom <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">true-value</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">false-value</code>. A checkbox group or a multiple select binds an array. A radio stores the selected value."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Under the hood:</strong> <span style="color:#f0e2c8;">"The compiler emits a runtime directive like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vModelText</code> plus an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onUpdate:modelValue</code> handler that assigns back, so the expression must be writable, a ref or a reactive property."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Details it handles:</strong> <span style="color:#f0e2c8;">"It ignores initial value attributes in markup, waits for IME composition to finish, and supports <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.lazy</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.number</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.trim</code> when I need different behaviour."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just write <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">:value</code> plus <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">@input</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For a basic text box that works, but you lose what the directive adds: IME composition handling, checkbox arrays and true-value support, and the modifiers. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-model</code> is shorter and more correct.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you bind a checkbox group?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Give every checkbox a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">value</code> and bind them all with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-model</code> to the same array ref. Checking one pushes its value, unchecking removes it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if I want the field to update only on blur?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-model.lazy</code>, which listens to change instead of input.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">v-model</code> on a const not work?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The compiler rejects it because it must assign the new value back. Also a plain const would not be reactive. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ref</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is this related to v-model on a component?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same protocol. The generated handler is called <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onUpdate:modelValue</code>, which is exactly what a component listens to when you put <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-model</code> on it, together with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">modelValue</code> prop.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **v-model** | Two-way binding between a form element and state |
| **Two-way binding** | State updates the element, user input updates the state |
| **vModelText and friends** | Runtime directives that implement v-model per element type |
| **onUpdate:modelValue** | Generated handler that assigns the new value back to your variable |
| **true-value / false-value** | Custom values for a checked and unchecked checkbox |
| **IME composition** | Multi-keystroke input for languages such as Chinese; v-model waits for it to finish |
| **Single source of truth** | State wins: v-model ignores the initial value attributes in markup |

---
**Conclusion:** \`v-model\` on a native form element is two-way binding sugar: it writes state into the element and listens for the element's event to write back, choosing \`value\` + \`input\` for text and textarea and \`checked\`/selected + \`change\` for checkboxes, radios and selects. Verified on Vue 3.5.44, it compiles to a runtime directive such as \`vModelText\` plus an \`onUpdate:modelValue\` assignment, so the expression must be a writable ref or property; it collects checkbox groups and multiple selects into arrays, ignores initial \`value\` attributes, and holds back updates until IME composition ends.`,
    examples: [
      {
        label: "v-model on every native form control",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { ref } from "vue";

const name = ref("Ada");
const bio = ref("");
const agreed = ref(false);
const toppings = ref(["cheese"]);
const size = ref("M");
const country = ref("");
const tags = ref([]);
const plan = ref("monthly");
</script>

<template>
  <input class="name" v-model="name" />
  <textarea class="bio" v-model="bio"></textarea>

  <!-- single checkbox: boolean (or true-value / false-value) -->
  <input class="agree" type="checkbox" v-model="agreed" />
  <input class="plan" type="checkbox" v-model="plan" true-value="yearly" false-value="monthly" />

  <!-- several checkboxes bound to one array -->
  <input class="t1" type="checkbox" value="cheese" v-model="toppings" />
  <input class="t2" type="checkbox" value="olives" v-model="toppings" />

  <!-- radios: the selected value -->
  <input class="s" type="radio" value="S" v-model="size" />
  <input class="m" type="radio" value="M" v-model="size" />

  <select class="country" v-model="country">
    <option disabled value="">Pick one</option>
    <option>India</option>
    <option>Japan</option>
  </select>

  <select class="tags" v-model="tags" multiple>
    <option>vue</option>
    <option>ts</option>
    <option>css</option>
  </select>

  <pre>{{ { name, bio, agreed, plan, toppings, size, country, tags } }}</pre>
</template>
`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are v-model modifiers?",
    seoDescription:
      "Vue v-model modifiers .lazy, .number and .trim: what each changes, verified edge cases like '12abc', and custom modifiers on components with defineModel.",
    description: `**Question presented to candidate:**
"Our age field stores \`"42"\` as a string, the username keeps stray spaces, and a search box fires an API call on every keystroke. Which \`v-model\` modifiers would you reach for, what exactly does each one do, and can a component define its own?"

**What a strong answer should cover:**
- \`.lazy\` syncs on the **\`change\`** event (blur or Enter) instead of every \`input\` event.
- \`.number\` converts with **\`parseFloat\`**, and keeps the original string when it cannot parse (\`"abc"\` stays \`"abc"\`); \`type="number"\` inputs get this automatically.
- \`.trim\` strips leading and trailing whitespace from the stored value.
- Modifiers **chain**: \`v-model.lazy.number\`.
- On components, modifiers arrive as a **\`modelModifiers\`** prop (or \`<name>Modifiers\` for named models); custom ones are implemented with \`defineModel\`'s \`set\` transformer. Built-in \`.trim\` and \`.number\` are applied for you.
- Modifiers are a convenience for timing and type coercion, not validation.

**Clarifying questions expected:**
- "Should an empty or invalid number be stored as a string, \`null\`, or rejected?"

**Code / implementation expected:** Yes. A form showing the three built-in modifiers; bonus for a custom modifier on a component.`,
    answer: `**Target Audience:** Vue developers who already use \`v-model\` on inputs and want to control when and how values are stored.
**Difficulty:** Easy

> **How to read this doc:** Plain language first, then \`📌 Interview term:\` callouts. Every value shown below was read from component state after a driver focused, typed into and blurred real inputs, on Vue 3.5.44 compiled with \`@vue/compiler-sfc\` and mounted in jsdom.

## 1. Why This Even Matters — A Story First

Think of a receptionist taking phone messages. By default they write down every word the instant you say it. Sometimes that is too eager: you want them to wait until you finish the sentence (**lazy**). Sometimes they write "forty two" when you need the number 42 in a spreadsheet (**number**). And sometimes they faithfully copy your accidental "um, " at the start (**trim**).

Modifiers are instructions to that receptionist. The [basic v-model behaviour](/interview-question/how-does-v-model-work-on-form-inputs) stays the same; you just tell it to wait, convert or tidy up before writing to your state.

## 2. The Three Built-in Modifiers

📌 **Interview term: Modifier** — a suffix after a dot on a directive, such as \`v-model.trim\`. It tweaks the directive's behaviour without changing its meaning. Event modifiers like \`@click.prevent\` work the same way (see [event modifiers](/interview-question/how-do-you-handle-events-in-vue-v-on-and-event-modifiers)).

📌 **Interview term: .lazy** — sync on the \`change\` event instead of \`input\`. For a text field, the browser fires \`change\` when the user commits the value: on blur, or on Enter in a single-line input. (That is standard browser behaviour; the jsdom driver below dispatched \`change\` itself.)

📌 **Interview term: .number** — run the value through \`parseFloat\`. If the result is \`NaN\`, keep the original string. It is applied **automatically** to \`<input type="number">\`.

📌 **Interview term: .trim** — strip leading and trailing whitespace before storing.

Modifiers chain in any order: \`v-model.lazy.number\`, \`v-model.trim.lazy\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 250" role="img" aria-label="The raw input string passes through the lazy, number and trim modifiers before it is stored in state">
  <defs>
    <marker id="mod-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="90" width="140" height="70" rx="10"/>
  <text class="d-text" x="90" y="120" text-anchor="middle">DOM value</text>
  <text class="d-sub" x="90" y="142" text-anchor="middle">always a string</text>
  <rect class="d-box" x="215" y="30" width="140" height="70" rx="10"/>
  <text class="d-text" x="285" y="60" text-anchor="middle">.lazy</text>
  <text class="d-sub" x="285" y="82" text-anchor="middle">which event</text>
  <rect class="d-box" x="215" y="150" width="140" height="70" rx="10"/>
  <text class="d-text" x="285" y="180" text-anchor="middle">.trim .number</text>
  <text class="d-sub" x="285" y="202" text-anchor="middle">transform value</text>
  <rect class="d-box-accent" x="560" y="90" width="140" height="70" rx="10"/>
  <text class="d-text d-accent" x="630" y="120" text-anchor="middle">state</text>
  <text class="d-sub" x="630" y="142" text-anchor="middle">ref value</text>
  <path class="d-edge" d="M 162 112 L 211 72" marker-end="url(#mod-arrow)"/>
  <path class="d-edge" d="M 285 104 L 285 146" marker-end="url(#mod-arrow)"/>
  <path class="d-edge-accent" d="M 359 185 L 556 132" marker-end="url(#mod-arrow)"/>
</svg>

\`.lazy\` decides **when** the value is read; \`.trim\` and \`.number\` decide **what** gets stored.

## 3. Verified: Each Modifier, Step by Step

The runnable example has one input per modifier. The driver behaved like a user: focus, type, and for \`.lazy\` fire \`change\` and blur. The state after each step:

\`\`\`
plain   typed "42"     -> "42"
lazy    typed "draft"  -> ""   (no change event yet)
lazy    after change   -> "draft"
number  typed "42"     -> 42
number  typed "12abc"  -> 12
number  typed "abc"    -> "abc"
number  typed ""       -> ""
type=number typed "7"  -> 7
trim    typed "  ada  " -> "ada"   box still shows "  ada  "
trim    after blur     -> box shows "ada"
lazy.number typed "3.5" -> 0
lazy.number after change -> 3.5
\`\`\`

What each line proves:

- **Without a modifier, input values are strings.** \`"42"\`, with quotes.
- **\`.lazy\` waits.** Typing left the state empty; only the \`change\` event wrote \`"draft"\`.
- **\`.number\` is \`parseFloat\`, not \`Number\`.** \`"12abc"\` became \`12\` (parseFloat reads the leading digits), but \`"abc"\` stayed the **string** \`"abc"\`, and the empty field stored an empty **string**, not \`0\` or \`null\`. Your state can therefore be \`number | string\`, which matters for TypeScript and for validation.
- **\`type="number"\` behaves like \`.number\`.** \`"7"\` arrived as \`7\` with no modifier written.
- **\`.trim\` stores the trimmed value immediately, but leaves the box alone while you type.** The box showed \`"  ada  "\` until blur, then \`.trim\` rewrote it to \`"ada"\`. Rewriting the text under the user's cursor mid-typing would be jarring, so Vue only tidies the display once the field loses focus.
- **Chained modifiers combine.** \`.lazy.number\` stored nothing while typing and the number \`3.5\` on change.

## 4. Verified: What the Compiler Generates

\`\`\`js
// <input v-model.lazy.number="age" />
_withDirectives(_createElementBlock("input", {
  "onUpdate:modelValue": $event => ((age) = $event)
}), [
  [_vModelText, age, void 0, { lazy: true, number: true }]
])
\`\`\`

The modifiers become a plain object passed to the \`vModelText\` runtime directive, which uses \`lazy\` to pick the event and \`number\`/\`trim\` to transform the value before calling the assignment. An unknown modifier such as \`v-model.capitalize\` on a native \`<input>\` compiled with **no error** and is simply ignored, so a typo fails silently.

## 5. Modifiers on Components

When \`v-model\` is on a **component**, there is no DOM event for Vue to intercept. Instead the modifiers are passed down as a prop:

\`\`\`js
// <MyInput v-model.trim="q" />
_createBlock(_component_MyInput, {
  modelValue: q,
  "onUpdate:modelValue": $event => ((q) = $event),
  modelModifiers: { trim: true }
})
\`\`\`

📌 **Interview term: modelModifiers** — the prop holding the modifiers of the default \`v-model\`. A named model \`v-model:title.capitalize\` passes \`titleModifiers: { capitalize: true }\`. The full protocol is in [how v-model works on components](/interview-question/how-does-v-model-work-on-components).

**Built-in \`.trim\` and \`.number\` are applied for you.** Verified with a child that knows nothing about modifiers and just emits the raw string:

\`\`\`
child emitted raw '  ada  ' and '42'; parent state: {"name":"ada","n":42}
\`\`\`

Vue's \`emit\` checks \`modelModifiers\` on \`update:\` events and trims or converts the arguments before the parent's handler runs. \`.lazy\` has no built-in meaning on a component: when to emit is the component's decision.

**Custom modifiers** are yours to implement. With [defineModel](/interview-question/what-is-definemodel-in-vue-3-4-and-how-does-it-replace-manual-prop-emit), destructure the modifiers and use a \`set\` transformer (the second example below). Verified: with \`<TitleInput v-model:title.capitalize="heading" />\`, typing \`hello\` stored \`"Hello"\` in the parent.

## 6. Which Modifier for Which Problem?

| Problem | Modifier | Notes |
| :--- | :--- | :--- |
| Value needed as a number | \`.number\` or \`type="number"\` | Invalid input stays a string; validate separately |
| Stray whitespace in usernames, emails | \`.trim\` | Display is tidied on blur |
| Expensive work on every keystroke | \`.lazy\` | Fires on blur or Enter; for search-as-you-type, a debounced [watcher](/interview-question/what-is-the-difference-between-watch-and-watcheffect) is usually better |
| Domain-specific formatting (capitalise, uppercase codes) | custom modifier | Implement with \`defineModel\` \`set\` |
| Parsing that must reject bad input | none | Use validation, not a modifier |

## 7. Common Pitfalls

- **Trusting \`.number\` to always give a number.** \`"abc"\` and \`""\` stay strings. Type the state as \`number | string\` or validate.
- **Using \`.lazy\` for debouncing.** It waits for blur, not for a pause in typing. A search box with \`.lazy\` does nothing until the user leaves the field.
- **Typos in modifiers.** \`v-model.trimm\` is silently ignored on native inputs.
- **Re-implementing \`.trim\` inside a component.** Vue already trims the emitted value when the parent uses \`.trim\`; doing it again is harmless but redundant.
- **Testing without focus.** In our first driver run the inputs were never focused, and re-renders reset the unfocused \`.lazy\` field, which made \`.lazy\` look broken. Real users always have the field focused while typing, so simulate that in tests.
- **Expecting modifiers to validate.** They coerce, they do not reject. Combine with real [form validation](/interview-question/how-do-you-handle-forms-and-validation-in-vue).

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Name the three:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-model</code> has three built-in modifiers: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.lazy</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.number</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.trim</code>, and they chain."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Timing:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.lazy</code> syncs on the change event, so on blur or Enter, instead of every keystroke."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Conversion:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.number</code> uses parseFloat, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">12abc</code> becomes 12, but if it cannot parse it keeps the string. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type="number"</code> inputs get it automatically. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.trim</code> strips whitespace."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Components:</strong> <span style="color:#f0e2c8;">"On a component the modifiers arrive as a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">modelModifiers</code> prop. Vue still applies trim and number to the emitted value for you."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Custom ones:</strong> <span style="color:#f0e2c8;">"For my own modifier, like capitalize, I destructure the modifiers from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineModel</code> and transform the value in its <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set</code> option."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">.number</code> guarantee a number?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. If parseFloat returns NaN the original string is kept, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">abc</code> and an empty field stay strings. Treat the value as number or string and validate it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">.lazy</code> a debounce?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It waits for the change event, which for a text field means blur or Enter. For search-as-you-type you want a debounced watcher instead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the box still show the spaces with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">.trim</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The stored value is trimmed on every input, but Vue only rewrites the visible text on change, so it does not jump under the user cursor while typing.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you read modifiers inside a component?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineModel</code>: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const [model, modifiers] = defineModel()</code>. Without it, declare a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">modelModifiers</code> prop, or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">titleModifiers</code> for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-model:title</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens with a misspelled modifier?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">On a native input nothing: it compiles and is ignored. On a component it just appears as an extra key in the modifiers object.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Modifier** | A dot suffix that tweaks a directive, such as \`v-model.trim\` |
| **.lazy** | Sync on \`change\` (blur or Enter) instead of every \`input\` |
| **.number** | \`parseFloat\` the value; keep the string if it is not a number |
| **.trim** | Strip leading and trailing whitespace |
| **modelModifiers** | Prop carrying a component v-model's modifiers, such as \`{ trim: true }\` |
| **\`<name>Modifiers\`** | Same, for a named model like \`v-model:title\` |
| **set transformer** | \`defineModel\` option that rewrites a value before it is emitted |

---
**Conclusion:** \`v-model\` has three built-in modifiers. \`.lazy\` switches the sync from \`input\` to \`change\`; \`.number\` runs \`parseFloat\` and, as verified on Vue 3.5.44, keeps the original string when parsing fails (so \`"abc"\` and \`""\` stay strings) and is automatic on \`type="number"\`; \`.trim\` stores the trimmed value immediately and tidies the box on blur. They chain, and on components they travel as a \`modelModifiers\` prop, where Vue still applies \`.trim\` and \`.number\` to emitted values and you implement custom modifiers with \`defineModel\`'s \`set\` transformer.`,
    examples: [
      {
        label: ".lazy, .number and .trim side by side",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { ref } from "vue";

const plain = ref("");
const lazy = ref("");
const age = ref(0);
const qty = ref(0);
const username = ref("");
const both = ref(0);
</script>

<template>
  <!-- no modifier: syncs on every input event, always a string -->
  <input class="plain" v-model="plain" />

  <!-- .lazy: syncs on change (blur or Enter) instead of input -->
  <input class="lazy" v-model.lazy="lazy" />

  <!-- .number: parseFloat when it can, otherwise keeps the raw string -->
  <input class="age" v-model.number="age" />

  <!-- type="number" gets the .number behaviour automatically -->
  <input class="qty" type="number" v-model="qty" />

  <!-- .trim: strips leading and trailing whitespace -->
  <input class="user" v-model.trim="username" />

  <!-- modifiers chain -->
  <input class="both" v-model.lazy.number="both" />

  <pre>{{ { plain, lazy, age, qty, username, both } }}</pre>
</template>
`,
      },
      {
        label: "A custom .capitalize modifier with defineModel",
        tech: "vue",
        runnable: false,
        code: `<!-- TitleInput.vue -->
<script setup>
const [title, modifiers] = defineModel("title", {
  set(value) {
    return modifiers.capitalize ? value.charAt(0).toUpperCase() + value.slice(1) : value;
  },
});
</script>
<template><input class="title" :value="title" @input="title = $event.target.value" /></template>

<!-- Parent: <TitleInput v-model:title.capitalize="heading" /> -->
<!-- Typing "hello" stored "Hello" in heading -->
`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How does v-model work on components?",
    seoDescription:
      "Component v-model in Vue 3 is a modelValue prop plus an update:modelValue event. Named and multiple models, Vue 2 changes, and the readonly-prop trap.",
    description: `**Question presented to candidate:**
"We are building a design-system \`SearchBox\` and a \`NameFields\` component that edits a first and last name. Parents should be able to write \`v-model\` on them like on a native input. What contract does the component have to implement, and how do you support two models on one component?"

**What a strong answer should cover:**
- On a component, \`v-model="x"\` expands to **\`:modelValue="x"\` plus \`@update:modelValue="v => x = v"\`**: a prop down, an event up.
- **Named models**: \`v-model:title="t"\` uses a \`title\` prop and an \`update:title\` event, which is how one component supports **several** models.
- The child must **never mutate the prop**; it emits the new value and the parent assigns it (one-way data flow).
- Forwarding to an inner \`<input>\`: a **writable computed** (get reads the prop, set emits) or, since 3.4, \`defineModel()\`.
- **Vue 2 differences**: the default was \`value\` + \`input\`, and \`.sync\` is replaced by \`v-model:arg\`.
- Modifiers travel as a \`modelModifiers\` prop.

**Clarifying questions expected:**
- "Which Vue version is the design system on? From 3.4 I would use \`defineModel\`."
- "Does the parent always bind the value, or should the component also work uncontrolled?"

**Code / implementation expected:** Yes. A component implementing the prop + emit contract, ideally with a named second model.`,
    answer: `**Target Audience:** Vue developers who use \`v-model\` on inputs and now need their own components to support it.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then \`📌 Interview term:\` callouts. The compiled output, warnings, compiler errors and the state after typing that are quoted below all came from Vue 3.5.44, compiled with \`@vue/compiler-dom\` and \`@vue/compiler-sfc\` and mounted in jsdom.

## 1. Why This Even Matters — A Story First

A hotel guest wants a different room temperature. The guest does not climb into the ceiling and rewire the air conditioning; they turn the thermostat on the wall. The thermostat **displays** the current setting (it receives a value) and **reports** the new setting to the building system when the guest turns the dial (it sends an event). The building system decides, updates the real temperature, and the display follows.

A component with \`v-model\` is that thermostat. The parent owns the value (the building system). The component shows what it is given and announces "the user wants this new value". It never reaches into the parent and changes the value itself.

\`v-model\` on a component is simply a naming agreement for that display-and-report pair, so the parent can write one short attribute instead of two.

## 2. The Contract

📌 **Interview term: modelValue / update:modelValue** — the default prop and event behind a component \`v-model\`. Writing \`<SearchBox v-model="query" />\` is the same as writing:

\`\`\`vue
<SearchBox :modelValue="query" @update:modelValue="(v) => (query = v)" />
\`\`\`

The compiler output confirms it is literally that pair:

\`\`\`js
// <SearchBox v-model="query" />
_createBlock(_component_SearchBox, {
  modelValue: _ctx.query,
  "onUpdate:modelValue": $event => ((_ctx.query) = $event)
}, null, 8 /* PROPS */, ["modelValue", "onUpdate:modelValue"])
\`\`\`

It is the same handler name that [v-model on a native input](/interview-question/how-does-v-model-work-on-form-inputs) generates, which is no coincidence: native and component \`v-model\` share one protocol.

The component side therefore has two jobs:

1. Declare a **prop** called \`modelValue\` and display it ([props](/interview-question/what-are-props-in-vue-and-how-do-you-validate-them)).
2. **Emit** \`update:modelValue\` with the new value when the user changes it ([declaring emits](/interview-question/why-declare-emits-and-can-you-validate-them)).

📌 **Interview term: One-way data flow** — props flow down and are read-only for the child; changes flow up as events. \`v-model\` does not break this rule, it just names the pair.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 270" role="img" aria-label="The parent passes the modelValue prop down to the child, the child emits update modelValue up, and the parent assigns the new value">
  <defs>
    <marker id="vmc-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="30" y="70" width="200" height="120" rx="12"/>
  <text class="d-text d-accent" x="130" y="118" text-anchor="middle">Parent</text>
  <text class="d-sub" x="130" y="142" text-anchor="middle">owns query ref</text>
  <rect class="d-box-muted" x="490" y="70" width="200" height="120" rx="12"/>
  <text class="d-text" x="590" y="118" text-anchor="middle">SearchBox</text>
  <text class="d-sub" x="590" y="142" text-anchor="middle">displays, never assigns</text>
  <path class="d-edge-accent" d="M 236 100 L 484 100" marker-end="url(#vmc-arrow)"/>
  <text class="d-sub" x="360" y="86" text-anchor="middle">prop modelValue</text>
  <path class="d-edge" d="M 484 162 L 236 162" marker-end="url(#vmc-arrow)"/>
  <text class="d-sub" x="360" y="190" text-anchor="middle">emit update:modelValue</text>
  <text class="d-sub" x="360" y="212" text-anchor="middle">parent assigns query</text>
</svg>

The value only changes in one place, the parent. The child's emitted event is a request, and the parent's generated handler fulfils it.

## 3. Verified: The Contract Implemented by Hand

The runnable example implements \`SearchBox\` and a two-model \`NameFields\` with plain props and emits (no \`defineModel\`), and also uses \`SearchBox\` once in long form. The driver typed into each box:

\`\`\`
initial      : query=vue | name=Ada Lovelace | long-form events=
typed child 1: query=pinia | name=Ada Lovelace | long-form events= | second box shows "pinia"
typed names  : query=pinia | name=Grace Hopper | long-form events=
typed long   : query=router | name=Grace Hopper | long-form events=router | first box shows "router"
\`\`\`

- Typing in the first \`SearchBox\` emitted \`update:modelValue\`; the parent assigned \`query\`, and the **second** \`SearchBox\`, bound to the same ref, updated too. The state lives in the parent, not in either child.
- The long-form usage behaved identically, and its handler ran (it logged \`router\`), proving \`v-model\` is nothing more than that prop + listener pair.

## 4. Named and Multiple Models

📌 **Interview term: v-model argument** — \`v-model:title="t"\` changes the names to a \`title\` prop and an \`update:title\` event. Because each argument gets its own pair, one component can expose several models.

\`\`\`js
// <UserForm v-model:first-name="first" v-model:last.trim="last" />
_createBlock(_component_UserForm, {
  "first-name": _ctx.first,
  "onUpdate:firstName": $event => ((_ctx.first) = $event),
  last: _ctx.last,
  "onUpdate:last": $event => ((_ctx.last) = $event),
  lastModifiers: { trim: true }
})
\`\`\`

Two details in that output: the kebab-case argument still becomes the event \`update:firstName\` (props and events are camelised), and modifiers travel as a \`<arg>Modifiers\` prop; the default model uses \`modelModifiers\`. Modifiers are covered in [v-model modifiers](/interview-question/what-are-v-model-modifiers).

In the example, \`<NameFields v-model:first="first" v-model:last="last" />\` updated \`first\` and \`last\` independently (\`name=Grace Hopper\`).

## 5. Forwarding to an Inner Input

Most real components wrap a native \`<input>\`. The tempting shortcut fails:

\`\`\`
<input v-model="modelValue" />   (modelValue is a prop)
-> compile error: v-model cannot be used on a prop, because local prop bindings are not writable.
\`\`\`

Writing \`v-model="props.modelValue"\` sneaks past the compiler, but at runtime the props object is readonly:

\`\`\`
[Vue warn] Set operation on key "modelValue" failed: target is readonly. { modelValue: 'vue' }
typed  : box="pinia" | query = vue
\`\`\`

The box shows the typed text, but the parent never hears about it. The child and parent have silently drifted apart.

📌 **Interview term: Writable computed** — a \`computed\` with \`get\` and \`set\`. Reading returns the prop; writing emits the event. The inner \`<input v-model="value">\` then works naturally. This is the second example below, and it was verified in a two-file app: typing \`pinia\` gave \`box="pinia" | query = pinia\`. More on the pattern in [writable computed properties](/interview-question/can-a-computed-property-be-writable).

Since Vue 3.4 the macro \`defineModel()\` generates the prop, the emit and that ref for you. It has its own behaviours (a local fallback value, a stale read right after assignment), covered in [what defineModel is](/interview-question/what-is-definemodel-in-vue-3-4-and-how-does-it-replace-manual-prop-emit).

## 6. What Changed From Vue 2

| | Vue 2 | Vue 3 |
| :--- | :--- | :--- |
| Default prop | \`value\` | \`modelValue\` |
| Default event | \`input\` | \`update:modelValue\` |
| Renaming the pair | \`model: { prop, event }\` option | \`v-model:argument\` |
| Second binding | \`:title.sync\` | \`v-model:title\` |
| Several models | one \`v-model\` plus \`.sync\` | as many \`v-model:x\` as you need |

The migration build \`@vue/compat\` (3.5.44) states this directly. Its \`COMPONENT_V_MODEL\` warning reads: "Component that expects to work with v-model should now use the "modelValue" prop and emit the "update:modelValue" event", and its \`.sync\` warning reads: ".sync modifier for v-bind has been removed. Use v-model with argument instead." See [what changed from Vue 2 to Vue 3](/interview-question/what-changed-from-vue-2-to-vue-3-and-what-does-vue-2-end-of-life-mean).

## 7. Common Pitfalls

- **Mutating the prop.** \`v-model="modelValue"\` on an inner input is a compile error, and \`props.modelValue = x\` only logs a readonly warning in development while the parent stays stale.
- **Forgetting to declare the event.** It still works, but the listener also lands in \`$attrs\` and can fall through to the root element. Declare \`emits: ['update:modelValue']\`.
- **Wrong case on named models.** The event for \`v-model:first-name\` is \`update:firstName\`. Verified with \`emits: ['update:firstName']\` but \`emit('update:first-name')\`: the parent still received the value (Vue retries the handler lookup in camelCase), yet Vue warned \`Component emitted event "update:first-name" but it is neither declared in the emits option nor as an "onUpdate:firstName" prop.\` Declare and emit the camelCase name.
- **Copying the prop into local state once.** \`const local = ref(props.modelValue)\` stops following the parent after the first render. Use a computed or \`defineModel\`.
- **Using Vue 2 names.** A component that still emits \`input\` with a \`value\` prop does nothing under Vue 3 \`v-model\`.
- **Two-way binding everything.** A component with five \`v-model\`s is often better served by one object prop and a typed event, or by a [store](/interview-question/what-is-pinia-and-why-use-it).

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The contract:</strong> <span style="color:#f0e2c8;">"On a component, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-model="x"</code> is shorthand for a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">modelValue</code> prop plus an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">update:modelValue</code> event whose handler assigns x."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Who owns the value:</strong> <span style="color:#f0e2c8;">"The parent does. The child displays the prop and emits the new value; it never mutates the prop, because props are read-only."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Several models:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-model:title</code> switches to a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">title</code> prop and an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">update:title</code> event, so a component can have as many models as it needs. Modifiers arrive as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">modelModifiers</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">titleModifiers</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Wrapping an input:</strong> <span style="color:#f0e2c8;">"To forward to an inner input I use a writable computed, get returns the prop and set emits, or in 3.4+ <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineModel()</code>, which generates all of that."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Vue 2 contrast:</strong> <span style="color:#f0e2c8;">"Vue 2 used <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">value</code> and the input event, plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.sync</code> for extra bindings. Vue 3 unified that into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-model</code> with arguments."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if the child writes to <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">props.modelValue</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In development you get a readonly warning and the write is rejected, so the parent never updates. Writing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-model</code> on the prop directly in a template is even a compile error.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do I have to declare <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">update:modelValue</code> in emits?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It works without it, but declaring it documents the API, gives typing, and keeps the listener out of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$attrs</code>, so it does not fall through to the root element.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you support v-model and also let the component work without it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With manual props it would need local state plus a watcher. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineModel()</code> does it for you: if the parent passes no value, it keeps a local ref.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you migrate a Vue 2 component that uses <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">value</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">input</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Rename the prop to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">modelValue</code> and the event to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">update:modelValue</code>, and turn each <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.sync</code> prop into a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-model:name</code>. Or keep the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">value</code> prop, emit <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">update:value</code>, and have parents write <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-model:value</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">v-model</code> with an object prop?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">You can, but emit a new object, not a mutated one. Mutating a nested field of the prop bypasses the event, so the parent is changed behind its back.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **modelValue** | Default prop name a component receives for \`v-model\` |
| **update:modelValue** | Event the component emits with the new value |
| **v-model argument** | \`v-model:title\`, renames the pair to \`title\` and \`update:title\` |
| **modelModifiers** | Prop carrying the default model's modifiers; \`titleModifiers\` for named ones |
| **One-way data flow** | Props are read-only in the child; changes go up as events |
| **Writable computed** | \`computed({ get, set })\`, used to forward v-model to an inner input |
| **\`.sync\`** | Vue 2 modifier for a second two-way prop; replaced by \`v-model:arg\` |

---
**Conclusion:** On a component, \`v-model\` is a naming agreement: a \`modelValue\` prop goes down and an \`update:modelValue\` event comes up, and the parent's generated handler does the assignment. Verified on Vue 3.5.44, \`v-model:title\` swaps in a \`title\` prop and \`update:title\` event, which is how one component exposes several models, and modifiers travel as \`modelModifiers\` or \`titleModifiers\`. The child must never write the prop (it is a compile error or a readonly warning, and the parent goes stale); forward to an inner input with a writable computed, or with \`defineModel()\` from Vue 3.4 on. Vue 2's \`value\`/\`input\` and \`.sync\` are gone.`,
    examples: [
      {
        label: "The v-model contract by hand: default and named models",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { ref, defineComponent, h } from "vue";

// The v-model contract, written by hand:
//   accept a prop called modelValue, emit "update:modelValue" with the new value
const SearchBox = defineComponent({
  props: { modelValue: { type: String, default: "" } },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    return () =>
      h("input", {
        class: "search",
        value: props.modelValue,
        onInput: (e) => emit("update:modelValue", e.target.value),
      });
  },
});

// Named models: v-model:first and v-model:last -> props first/last, events update:first/update:last
const NameFields = defineComponent({
  props: { first: String, last: String },
  emits: ["update:first", "update:last"],
  setup(props, { emit }) {
    return () => [
      h("input", { class: "first", value: props.first, onInput: (e) => emit("update:first", e.target.value) }),
      h("input", { class: "last", value: props.last, onInput: (e) => emit("update:last", e.target.value) }),
    ];
  },
});

const query = ref("vue");
const first = ref("Ada");
const last = ref("Lovelace");
const events = ref([]);
</script>

<template>
  <!-- sugar for :modelValue="query" @update:modelValue="v => query = v" -->
  <SearchBox v-model="query" />

  <!-- two independent models on one component -->
  <NameFields v-model:first="first" v-model:last="last" />

  <!-- the long form still works, and lets you watch the event go by -->
  <SearchBox
    class="long"
    :modelValue="query"
    @update:modelValue="(v) => { events.push(v); query = v }"
  />

  <p class="out">query={{ query }} | name={{ first }} {{ last }} | long-form events={{ events.join(", ") }}</p>
</template>
`,
      },
      {
        label: "SearchBox.vue: forwarding v-model to an inner input with a writable computed",
        tech: "vue",
        runnable: false,
        code: `<script setup>
import { computed } from "vue";

const props = defineProps({ modelValue: { type: String, default: "" } });
const emit = defineEmits(["update:modelValue"]);

// A writable computed: reads the prop, writes by emitting.
// Now an inner native v-model can use it directly.
const value = computed({
  get: () => props.modelValue,
  set: (v) => emit("update:modelValue", v),
});
</script>

<template>
  <input class="search" v-model="value" placeholder="Search" />
</template>
`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is defineModel() in Vue 3.4+ and how does it replace manual prop + emit?",
    seoDescription:
      "defineModel() is a Vue 3.4+ macro that compiles to a prop, an update event and useModel(). Local mode, the stale read, default desync and custom modifiers.",
    description: `**Question presented to candidate:**
"Our codebase has dozens of components with a \`modelValue\` prop, an \`update:modelValue\` emit and a writable computed in between. A colleague wants to replace them all with \`defineModel()\`. What does \`defineModel\` actually generate, what behaves differently from the manual version, and is there anything that could bite us during the migration?"

**What a strong answer should cover:**
- \`defineModel()\` is a **compiler macro** (stable since Vue 3.4, experimental in 3.3) that declares the \`modelValue\` prop, a \`modelModifiers\` prop and the \`update:modelValue\` emit, and returns a **ref** built with \`useModel()\`.
- Reading the ref gives the prop; **assigning it emits** the update event. Named models: \`defineModel('title')\`.
- If the parent passes **no** \`v-model\`, the ref works as **local state** (the manual version cannot do that without extra code).
- When the parent **does** bind it, the ref only changes after the parent re-renders, so a read right after assignment returns the **old** value.
- A \`default\` that the parent does not have leaves parent and child **out of sync** until the first emit.
- Options (\`type\`, \`required\`, \`default\`) go to the prop; \`get\`/\`set\` transform values, which is how **custom modifiers** are implemented.

**Clarifying questions expected:**
- "Do any of these components rely on reading the new value immediately after setting it?"
- "Are they TypeScript components? Then \`defineModel<string>()\` gives the prop type."

**Code / implementation expected:** Yes. A component using \`defineModel\`, and ideally the compiled output or the \`useModel\` equivalent.`,
    answer: `**Target Audience:** Vue 3 developers who know the [component v-model contract](/interview-question/how-does-v-model-work-on-components) and want to know what \`defineModel()\` really does.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then \`📌 Interview term:\` callouts. The compiled output is from \`@vue/compiler-sfc\` 3.5.44 \`compileScript()\`, and every value read after a click or keystroke came from mounting the components in jsdom on Vue 3.5.44. Version history comes from the Vue release announcements, cited inline.

## 1. Why This Even Matters — A Story First

Remember filling in a paper form at the bank: your name in a box, then a carbon copy that goes to the clerk. Before carbon paper you wrote everything twice, and copies drifted apart whenever you forgot one.

Before Vue 3.4, every component that supported \`v-model\` was written twice in the same way: declare a prop, declare an event, and write a computed with a getter that reads the prop and a setter that emits. Three pieces of boilerplate that had to agree on one name.

\`defineModel()\` is the carbon paper. You write one line and the compiler produces all three pieces. But like carbon paper, the copy is not instant in every case, and knowing exactly when it updates is what separates a good answer from a great one.

## 2. The Core Idea: One Macro, Three Declarations

\`\`\`vue
<script setup>
const model = defineModel();          // default model: prop modelValue
const title = defineModel("title");   // named model: prop title
</script>

<template>
  <input v-model="model" />
</template>
\`\`\`

📌 **Interview term: defineModel()** — a \`<script setup>\` [compiler macro](/interview-question/how-do-defineprops-and-defineemits-work-in-script-setup) that declares a model prop, its modifiers prop and its update event, and returns a ref. Reading \`model.value\` reads the prop; assigning \`model.value = x\` emits \`update:modelValue\` with \`x\`.

The history matters in interviews about versions. Vue 3.3 "Rurouni Kenshin" (May 2023) introduced \`defineModel\` as an experimental, opt-in feature; Vue 3.4 "Slam Dunk", announced on 28 December 2023, stabilised it ([Vue blog: Announcing Vue 3.4](https://blog.vuejs.org/posts/vue-3-4), [Announcing Vue 3.3](https://blog.vuejs.org/posts/vue-3-3)).

## 3. Verified: What It Compiles To

\`compileScript()\` on two \`defineModel\` calls:

\`\`\`js
// const model = defineModel()
// const title = defineModel("title", { required: true })
import { useModel as _useModel } from 'vue'

export default {
  props: {
    "modelValue": {},
    "modelModifiers": {},
    "title": { required: true },
    "titleModifiers": {},
  },
  emits: ["update:modelValue", "update:title"],
  setup(__props) {
    const model = _useModel(__props, "modelValue")
    const title = _useModel(__props, "title")
  }
}
\`\`\`

📌 **Interview term: useModel()** — the runtime helper exported from \`vue\` that does the real work. It returns a custom ref that reads the prop, emits on write, and falls back to local state when the parent passes nothing. \`defineModel\` is just the compiler writing the prop, emit and \`useModel\` call for you.

With TypeScript, \`defineModel<string>({ required: true })\` compiled to \`"modelValue": { type: String, ...{ required: true } }\`, so the generic becomes the runtime \`type\` as well. Prop options (\`type\`, \`required\`, \`default\`) go into the \`props\` block; \`get\` and \`set\` stay in the \`useModel\` call.

Because \`useModel\` is a normal export, the runnable example at the bottom uses it directly inside a \`defineComponent\` child. That makes it a single-file demo of exactly what the macro generates.

## 4. How the Ref Behaves

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="Assigning the model ref emits update modelValue to the parent, the parent re-renders and passes the new prop down, and only then does reading the ref return the new value; without a parent binding the ref stores the value locally">
  <defs>
    <marker id="dm-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="270" y="30" width="180" height="70" rx="12"/>
  <text class="d-text d-accent" x="360" y="60" text-anchor="middle">model.value = 6</text>
  <text class="d-sub" x="360" y="82" text-anchor="middle">inside the child</text>
  <rect class="d-box" x="30" y="190" width="220" height="80" rx="12"/>
  <text class="d-text" x="140" y="222" text-anchor="middle">Parent bound</text>
  <text class="d-sub" x="140" y="246" text-anchor="middle">emit, wait for new prop</text>
  <rect class="d-box-muted" x="470" y="190" width="220" height="80" rx="12"/>
  <text class="d-text" x="580" y="222" text-anchor="middle">No v-model</text>
  <text class="d-sub" x="580" y="246" text-anchor="middle">store locally at once</text>
  <path class="d-edge-accent" d="M 320 104 L 180 186" marker-end="url(#dm-arrow)"/>
  <path class="d-edge-dashed" d="M 400 104 L 540 186" marker-end="url(#dm-arrow)"/>
</svg>

The left path is the normal case: the value goes up to the parent and comes back down as a prop on the next render. The right path is the fallback that the manual prop + emit version does not have.

## 5. Verified: Bound, Local and Stale

The second example has a \`Counter\` with \`defineModel({ type: Number, default: 1 })\` used three ways, and logs \`count.value\` immediately after \`count.value++\`:

\`\`\`
initial: a=10 b=1 c=1 | bound=10 unset=undefined heading=""
click a (parent bound):
  [child] right after count.value++ -> count.value = 10
  a=11 | bound=11
click b (no v-model, local mode):
  [child] right after count.value++ -> count.value = 2
  b=2
click c (v-model bound to undefined, child default is 1):
  [child] right after count.value++ -> count.value = 1
  c=2 | unset=2
\`\`\`

Three behaviours to remember:

📌 **Interview term: Local mode** — counter \`b\` has no \`v-model\`, so \`useModel\` keeps the value in a local ref. It incremented and read back \`2\` immediately. This is the "works controlled or uncontrolled" behaviour that took extra code before.

📌 **Interview term: Stale read after assignment** — counter \`a\` is bound. Right after \`count.value++\` it still read \`10\`, the old value. The assignment only **emitted**; the ref changes when the parent re-renders and passes the new prop. The runnable example shows the consequence: two synchronous clicks on the bound counter moved the parent from 5 to **6**, not 7, because both increments read the stale 5:

\`\`\`
initial  : bound="count: 5" parent total = 5 local="count: 0"
clicked  : bound="count: 6" parent total = 6 local="count: 1"
\`\`\`

(In a real browser two clicks are separate tasks with a render between them, so users will not hit this; code that assigns twice in one tick, or reads right after writing, will.)

📌 **Interview term: Default desync** — counter \`c\` is bound to a parent ref that is \`undefined\`. The child showed its default \`1\` while the parent still held \`undefined\`, so they disagreed until the first emit set the parent to \`2\`. Fix it by initialising the parent ref, or by not relying on a child-side \`default\` for bound models.

## 6. Verified: Modifiers With get and set

📌 **Interview term: Model modifiers** — \`const [model, modifiers] = defineModel()\` destructures the modifiers object (from the \`modelModifiers\` or \`titleModifiers\` prop). A \`set\` option transforms the value before it is emitted; \`get\` transforms it on read.

The \`TitleInput\` in the second example implements \`.capitalize\`:

\`\`\`
typed "hello" into TitleInput with .capitalize: heading="Hello"
\`\`\`

The parent wrote \`v-model:title.capitalize="heading"\`, and the child's \`set\` capitalised the value before emitting. The built-in \`.trim\` and \`.number\` need no code at all; see [v-model modifiers](/interview-question/what-are-v-model-modifiers).

## 7. Manual Versus defineModel

| | Manual prop + emit + computed | \`defineModel()\` |
| :--- | :--- | :--- |
| Lines of code | prop, emit, computed get/set | one line |
| Works without a parent v-model | no, needs extra local state | yes, local mode |
| Read right after write | old value (computed reads the prop) | old value when bound, new value in local mode |
| Prop type and default | in \`defineProps\` | in the \`defineModel\` options |
| Custom modifiers | read \`modelModifiers\` prop | destructure \`[model, modifiers]\` + \`set\` |
| Version | any Vue 3 | 3.4+ (3.3 behind a flag) |
| Usable outside \`<script setup>\` | yes | no; use \`useModel()\` with your own props and emits |

The migration in the interview question is therefore safe for most components. Watch for components that read the value right after writing it, and for bound models whose parent starts as \`undefined\` while the child declares a \`default\`.

## 8. Common Pitfalls

- **Reading back immediately.** \`model.value = x; doSomething(model.value)\` uses the old value when bound. Use \`x\` directly, or wait with [nextTick](/interview-question/what-is-nexttick-in-vue).
- **Child defaults without parent initialisation.** Parent \`undefined\`, child shows the default: they disagree until the first change.
- **Mutating an object model in place.** Verified: \`user.name = 'Grace'\` on a \`defineModel()\` object changed the parent's object and emitted **zero** update events, because props are only shallowly read-only. Assign a new object: \`model.value = { ...model.value, name: 'x' }\`.
- **Declaring the prop twice.** \`defineModel()\` plus \`defineProps(['modelValue'])\` does compile (the compiler merges them with a \`mergeModels\` helper), but it is redundant and easy to let drift. Put the prop options in \`defineModel\` itself.
- **Using it outside \`<script setup>\`.** It is a macro. In an Options API or \`defineComponent\` component, call \`useModel(props, 'modelValue')\` with the prop and emit declared yourself, as in the runnable example.
- **Assuming the parent changes.** Emitting is a request. If the parent binds a non-writable value or ignores the event, the child's ref stays put.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What it is:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineModel()</code> is a script setup macro, stable since 3.4, that declares the model prop, its modifiers prop and the update event, and gives me back a ref."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How the ref works:</strong> <span style="color:#f0e2c8;">"Reading it reads the prop; assigning it emits <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">update:modelValue</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineModel('title')</code> does the same for a named model."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. What it compiles to:</strong> <span style="color:#f0e2c8;">"The compiler writes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">props</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">emits</code> and a call to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useModel()</code>, which is a public export, so I can use it outside script setup too."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. What is new:</strong> <span style="color:#f0e2c8;">"If the parent does not bind v-model, the ref keeps a local value, so one component works controlled or uncontrolled."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The gotchas:</strong> <span style="color:#f0e2c8;">"When bound, a read right after a write returns the old value until the parent re-renders, and a child default can disagree with an undefined parent. Custom modifiers go in the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set</code> option."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">defineModel</code> break one-way data flow?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Assigning the ref only emits an event. The parent still owns the value and passes it back down as a prop. The ref just hides the boilerplate.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">model.value</code> still show the old value right after I set it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because when the parent binds it, the ref mirrors the prop, and the prop changes only after the parent handles the event and re-renders. Use the value you just assigned, or await <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nextTick</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you type it in TypeScript?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineModel&lt;string&gt;()</code>, plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ required: true }</code> if it must be passed, which removes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> from the type. The generic also becomes the runtime prop type.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you implement a custom modifier?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const [model, modifiers] = defineModel({ set(v) { return modifiers.capitalize ? capitalize(v) : v } })</code>. The parent writes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-model.capitalize</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you use it in an Options API component?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not the macro. Declare the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">modelValue</code> prop and the emit yourself and call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useModel(props, 'modelValue')</code> in setup, which is exactly what the macro generates.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **defineModel()** | Macro that declares a model prop, modifiers prop and update event, returning a ref |
| **useModel()** | Runtime helper behind the macro, exported from \`vue\` |
| **Local mode** | No parent \`v-model\`: the ref keeps its own value |
| **Stale read** | When bound, the ref updates only after the parent re-renders |
| **Default desync** | Child default shown while the parent still holds \`undefined\` |
| **\`[model, modifiers]\`** | Destructured form giving access to the modifiers object |
| **get / set options** | Transform the value on read or before it is emitted |

---
**Conclusion:** \`defineModel()\` replaces the prop + emit + writable-computed boilerplate with one line. Verified on Vue 3.5.44, it compiles to a \`modelValue\` (or named) prop, a \`<name>Modifiers\` prop, an \`update:\` emit and a \`useModel()\` call, and \`useModel\` is a public export you can use outside \`<script setup>\`. The returned ref reads the prop and emits on write; with no parent \`v-model\` it falls back to local state; when bound, a read right after a write still sees the old value until the parent re-renders; and a child \`default\` can disagree with an \`undefined\` parent until the first emit. \`get\`/\`set\` plus the destructured modifiers implement custom modifiers.`,
    examples: [
      {
        label: "What defineModel compiles to: useModel() with a prop and emit, bound and unbound",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { ref, defineComponent, h, useModel } from "vue";

// In a .vue file you would write: const count = defineModel({ type: Number, default: 0 })
// The compiler turns that into exactly this: a prop, its emit, and useModel()
const Counter = defineComponent({
  props: { modelValue: { type: Number, default: 0 }, modelModifiers: {} },
  emits: ["update:modelValue"],
  setup(props) {
    const count = useModel(props, "modelValue");
    return () =>
      h("button", { onClick: () => count.value++ }, \`count: \${count.value}\`);
  },
});

const total = ref(5);
</script>

<template>
  <!-- bound: the parent owns the value -->
  <Counter class="bound" v-model="total" />
  <p>parent total = {{ total }}</p>

  <!-- not bound: the child keeps a local value instead -->
  <Counter class="local" />
</template>
`,
      },
      {
        label: "defineModel in real SFCs: default value, local mode and a custom modifier",
        tech: "vue",
        runnable: false,
        code: `<!-- Counter.vue -->
<script setup>
const count = defineModel({ type: Number, default: 1 });
function inc() {
  count.value++;
  console.log(\`  [child] right after count.value++ -> count.value = \${count.value}\`);
}
</script>
<template><button @click="inc">{{ count }}</button></template>

<!-- TitleInput.vue -->
<script setup>
const [title, modifiers] = defineModel("title", {
  set(value) {
    return modifiers.capitalize ? value.charAt(0).toUpperCase() + value.slice(1) : value;
  },
});
</script>
<template><input class="title" :value="title" @input="title = $event.target.value" /></template>

<!-- App.vue -->
<script setup>
import { ref } from "vue";
import Counter from "./Counter.vue";
import TitleInput from "./TitleInput.vue";
const bound = ref(10);
const unset = ref();
const heading = ref("");
</script>
<template>
  <Counter id="a" v-model="bound" />
  <Counter id="b" />
  <Counter id="c" v-model="unset" />
  <TitleInput v-model:title.capitalize="heading" />
  <p>bound={{ bound }} unset={{ String(unset) }} heading={{ JSON.stringify(heading) }}</p>
</template>
`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are props in Vue and how do you validate them?",
    seoDescription:
      "Vue props pass data from parent to child. Declare and validate them with type, required, default and validator; Boolean casting and dev-only warnings.",
    description: `**Question presented to candidate:**
"You are writing a reusable \`PriceTag\` component for our shop. It needs a label, an amount, a currency from a fixed list, optional tags and an on-sale flag. How do you declare those props, how would you validate them, and what actually happens when a parent passes something invalid?"

**What a strong answer should cover:**
- **Props** are the inputs of a component: data passed **down** from the parent, **read-only** inside the child (one-way data flow).
- Declaration forms: an **array** of names, an **object** with options, or (in \`<script setup>\` with TypeScript) a **type**.
- Validation options: \`type\` (constructor or array of constructors), \`required\`, \`default\` (a **factory function** for objects and arrays) and a custom \`validator\` (which also receives all props since Vue 3.4).
- **Boolean casting**: a boolean prop that is present with no value is \`true\`, absent is \`false\`.
- Failed validation only logs a **development warning**; the component still renders, and production builds skip the checks entirely.
- camelCase in JavaScript, kebab-case in templates.

**Clarifying questions expected:**
- "Is the project in TypeScript? Then most of this moves to compile-time types."
- "Should an invalid currency fall back to a default, or is a dev warning enough?"

**Code / implementation expected:** Yes. A props declaration with at least a required prop, a default and a custom validator.`,
    answer: `**Target Audience:** Vue beginners who have built a component or two and now need them to accept configuration from a parent.
**Difficulty:** Easy

> **How to read this doc:** Plain language first, then \`📌 Interview term:\` callouts. Every warning message, rendered value and production-build result quoted below came from running the code on Vue 3.5.44, compiled with \`@vue/compiler-sfc\` and mounted in jsdom, in development and production mode.

## 1. Why This Even Matters — A Story First

A coffee machine at the office has buttons on the front: size, strength, milk or no milk. You do not open the machine to change how it works; you press buttons, and the machine does the rest. The buttons are its public interface.

Props are a component's buttons. The parent presses them (\`<PriceTag label="Book" :amount="25" />\`), and the component does its job with whatever it was given. Two rules follow naturally:

- The machine should complain if you press something that does not exist, like "size: enormous". That is **validation**.
- The machine must not secretly change your selection on the front panel. That is **one-way data flow**: the child reads props, it never rewrites them.

## 2. The Core Idea

📌 **Interview term: Prop** — a named input of a component, passed by the parent as an attribute: \`label="Book"\` passes a string; \`:amount="25"\` (with \`v-bind\`) passes a JavaScript value, here a number.

📌 **Interview term: One-way data flow** — props flow from parent to child. When the parent's value changes, the child receives the new value; the child cannot assign to a prop. To change something, the child [emits an event](/interview-question/why-declare-emits-and-can-you-validate-them) and lets the parent decide. This is the same idea as [state versus props in React](/interview-question/what-is-the-difference-between-state-and-props).

You can declare props in three ways:

\`\`\`js
// 1. Array of names: no validation at all
props: ["label", "amount"]

// 2. Object with options: runtime validation in development
props: {
  label: { type: String, required: true },
  amount: { type: Number, default: 0 },
}

// 3. TypeScript type in <script setup>: checked at compile time
defineProps<{ label: string; amount?: number }>()
\`\`\`

In \`<script setup>\` the first two are written as \`defineProps([...])\` or \`defineProps({...})\`. How that macro works, and how the TypeScript form becomes runtime options, is covered in [defineProps and defineEmits](/interview-question/how-do-defineprops-and-defineemits-work-in-script-setup). This answer focuses on what the options mean.

## 3. The Validation Options

| Option | Example | What it checks |
| :--- | :--- | :--- |
| \`type\` | \`String\`, \`Number\`, \`Boolean\`, \`Array\`, \`Object\`, \`Date\`, \`Function\`, \`Symbol\`, a class, or an array of these | The value's type (\`instanceof\` for classes) |
| \`required\` | \`true\` | Warn if the parent does not pass it |
| \`default\` | \`0\`, or \`() => []\` | Used when the prop is missing or \`undefined\` |
| \`validator\` | \`(value, props) => boolean\` | Your own rule; return \`false\` to warn |

📌 **Interview term: Default factory** — for object and array props, write \`default: () => []\`, not \`default: []\`. A plain value is used as-is for **every** instance.

📌 **Interview term: Custom validator** — a function that returns \`true\` or \`false\`. Since Vue 3.4 it receives a second argument with all the props, so one prop can be checked against another ([Ninja Squad: What is new in Vue 3.4](https://blog2.ninja-squad.com/2023/12/29/what-is-new-vue-3.4); the Vue 3.5.44 typings declare \`validator?(value: unknown, props: Data): boolean\`).

## 4. Verified: Valid and Invalid Usage

The runnable example declares a \`PriceTag\` with every option, then renders it three times: once valid, once with only the label, and once deliberately wrong (\`:amount="'12'"\`, \`currency="GBP"\`, \`:discount="99"\`, no label). The dev-mode console:

\`\`\`
[Vue warn]: Missing required prop: "label"
  at <Anonymous amount="12" currency="GBP" discount=99 >
[Vue warn]: Invalid prop: type check failed for prop "amount". Expected Number with value 12, got String with value "12".
[Vue warn]: Invalid prop: custom validator check failed for prop "currency".
[Vue warn]: Invalid prop: custom validator check failed for prop "discount".
\`\`\`

And what rendered:

\`\`\`
Book: 25 USD | onSale=true | tags=["paper"]
Pen: 0 USD | onSale=false | tags=[]
undefined: -87 GBP | onSale=false | tags=[]
\`\`\`

📌 **Interview term: Validation is a warning, not a guard** — every rule fired, yet the third tag still rendered with the bad values. \`"12" - 99\` became \`-87\` through JavaScript string coercion, the missing label printed \`undefined\`, and the invalid \`GBP\` was shown. Prop validation tells **developers** about a mistake; it does not protect the user.

Other things this run confirms:

- \`default: 0\`, \`"USD"\` and \`() => []\` filled in for \`Pen\`.
- The \`discount\` validator used its second argument: \`99 <= props.amount\` was false for an amount of \`"12"\`.
- \`on-sale\` in the template (kebab-case) reached the \`onSale\` prop (camelCase). Vue converts between them.

## 5. Verified: Production Builds Skip It All

The same component compiled with \`NODE_ENV=production\`:

\`\`\`
rendered: Book: 25 USD | onSale=true | tags=["paper"]
rendered: Pen: 0 USD | onSale=false | tags=[]
rendered: undefined: -87 GBP | onSale=false | tags=[]
\`\`\`

Identical output, **zero** warnings. Type checks, \`required\` and validators are development-only (they also cost nothing in production). If invalid input must be handled at runtime, for example data from an API, handle it in your code with a computed fallback, not with a prop validator.

## 6. Boolean Casting

<svg class="iq-diagram" width="100%" viewBox="0 0 720 260" role="img" aria-label="Boolean casting: an absent attribute becomes false, a bare attribute becomes true, and an explicit bound value is passed through">
  <defs>
    <marker id="pv-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="20" width="230" height="56" rx="10"/>
  <text class="d-text" x="135" y="54" text-anchor="middle">attribute absent</text>
  <rect class="d-box-muted" x="20" y="100" width="230" height="56" rx="10"/>
  <text class="d-text" x="135" y="134" text-anchor="middle">on-sale with no value</text>
  <rect class="d-box-muted" x="20" y="180" width="230" height="56" rx="10"/>
  <text class="d-text" x="135" y="214" text-anchor="middle">:on-sale="false"</text>
  <rect class="d-box-accent" x="470" y="20" width="230" height="56" rx="10"/>
  <text class="d-text d-accent" x="585" y="54" text-anchor="middle">false</text>
  <rect class="d-box-accent" x="470" y="100" width="230" height="56" rx="10"/>
  <text class="d-text d-accent" x="585" y="134" text-anchor="middle">true</text>
  <rect class="d-box-accent" x="470" y="180" width="230" height="56" rx="10"/>
  <text class="d-text d-accent" x="585" y="214" text-anchor="middle">false</text>
  <path class="d-edge" d="M 256 48 L 464 48" marker-end="url(#pv-arrow)"/>
  <path class="d-edge" d="M 256 128 L 464 128" marker-end="url(#pv-arrow)"/>
  <path class="d-edge" d="M 256 208 L 464 208" marker-end="url(#pv-arrow)"/>
</svg>

📌 **Interview term: Boolean casting** — a prop whose \`type\` includes \`Boolean\` is treated like an HTML boolean attribute. Absent means \`false\` (not \`undefined\`), present with no value means \`true\`. In the example, \`Book\` had \`on-sale\` written bare and got \`true\`; \`Pen\` omitted it and got \`false\`.

When the type is an array that includes both \`Boolean\` and \`String\`, the **order** decides what an empty attribute means. The second example declares \`flag: [Boolean, String]\` and \`label: [String, Boolean]\`, and the parent writes both bare:

\`\`\`
rendered: 1 flag=true label=""
\`\`\`

\`Boolean\` first gave \`true\`; \`String\` first gave the empty string \`""\`.

## 7. Verified: Props Are Read-Only (in Development)

The second example's child does \`props.count++\` on click. In development:

\`\`\`
[Vue warn] Set operation on key "count" failed: target is readonly. { count: 1, flag: true, label: '', items: [] }
after click: 1 flag=true label=""
\`\`\`

The write was rejected and the count stayed \`1\`. The surprise is the **production** build:

\`\`\`
after click: 2 flag=true label=""
\`\`\`

In production the props object is not wrapped in a read-only proxy, so the write **succeeded locally** with no warning, and the child now disagrees with its parent until the parent re-renders and overwrites it. The rule "never mutate props" is enforced only while you develop; code that breaks it can pass every manual test in dev (with a warning you might miss) and misbehave in production.

The fix is always the same: emit an event and let the parent update, use [v-model on the component](/interview-question/how-does-v-model-work-on-components), or copy the prop into local state with a \`ref\` if the child genuinely needs its own editable copy.

## 8. Common Pitfalls

- **Treating validation as protection.** It warns in development and does nothing in production; the component renders either way.
- **\`default: []\` for arrays.** Verified: Vue 3.5 gave **no warning** for it, and two instances got the very same array object, so a push in one appeared in the other. With \`() => []\` each instance had its own.
- **Passing numbers without \`v-bind\`.** \`amount="12"\` is the string \`"12"\`; write \`:amount="12"\`.
- **Mutating a prop.** Read-only warning in dev, silent local change in production. Emit instead.
- **Mutating a prop's nested object.** Props are only shallowly read-only, so \`props.user.name = 'x'\` is not even warned about; it edits the parent's object behind its back.
- **Forgetting Boolean casting order.** \`[String, Boolean]\` turns a bare attribute into \`""\`, which is falsy.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Define props:</strong> <span style="color:#f0e2c8;">"Props are a component's inputs. The parent passes them down, and inside the child they are read-only: one-way data flow."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Declaring them:</strong> <span style="color:#f0e2c8;">"An array of names gives no checks; an object lets me set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">required</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">default</code> and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">validator</code>; in TypeScript I declare a type with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineProps</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Defaults and validators:</strong> <span style="color:#f0e2c8;">"Object and array defaults must be factories, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">() =&gt; []</code>, or every instance shares one object. A validator returns a boolean and since 3.4 also receives all the props."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. What validation really does:</strong> <span style="color:#f0e2c8;">"It only logs a dev warning. The component still renders with the bad value, and production builds skip validation completely."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Boolean casting:</strong> <span style="color:#f0e2c8;">"A Boolean prop written with no value is true and absent is false. To change something, the child emits an event rather than mutating the prop."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens in production if a prop fails validation?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Nothing at all. Type checks, required and validators run only in development builds. Handle untrusted data with code, such as a computed fallback.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why must an array default be a function?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because a plain array is one object reused for every instance. I verified that two instances pushed into the same array. A factory returns a fresh array per instance.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can the child change a prop?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It should not. In development the write is rejected with a readonly warning. In a production build the write actually goes through locally and the child drifts from the parent, which is worse. Emit an event or use v-model.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you validate one prop against another?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use the second validator argument, available since Vue 3.4: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">validator: (value, props) =&gt; value &lt;= props.amount</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Should I still use runtime validation with TypeScript?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Type-based props already catch wrong types at compile time with vue-tsc, and the compiler still generates runtime type checks. A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">validator</code> is useful for rules a type cannot express, like a range.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Prop** | A named input passed from parent to child |
| **One-way data flow** | Props go down and are read-only in the child; changes go up as events |
| **\`type\`** | Expected constructor(s); checked in development |
| **\`required\`** | Warn when the prop is missing |
| **Default factory** | \`default: () => []\`, a fresh object or array per instance |
| **Custom validator** | \`(value, props) => boolean\`, your own rule |
| **Boolean casting** | Absent means false, bare attribute means true |

---
**Conclusion:** Props are a component's inputs: the parent passes them down and the child reads them but never assigns them. Declare them as an array (no checks), an object with \`type\`, \`required\`, \`default\` and \`validator\`, or a TypeScript type in \`<script setup>\`. Verified on Vue 3.5.44, every failed rule logs a clear development warning but the component still renders with the bad value, and a production build skips the checks entirely. Boolean props are cast (bare attribute true, absent false), object and array defaults need a factory or every instance shares one object, and the read-only protection on props exists only in development.`,
    examples: [
      {
        label: "Prop validation: type, required, default factory, validator and Boolean casting",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { ref, defineComponent, h } from "vue";

// Options-object props with validation. Every rule below only runs in development builds.
const PriceTag = defineComponent({
  props: {
    label: { type: String, required: true },
    amount: { type: Number, default: 0 },
    currency: {
      type: String,
      default: "USD",
      validator: (value) => ["USD", "EUR", "INR"].includes(value),
    },
    // Objects and arrays need a factory, so every instance gets its own copy
    tags: { type: Array, default: () => [] },
    // Boolean props are cast: present with no value means true, absent means false
    onSale: Boolean,
    // The validator also receives the other props (Vue 3.4+)
    discount: {
      type: Number,
      default: 0,
      validator: (value, props) => value <= props.amount,
    },
  },
  setup(props) {
    return () =>
      h("li", \`\${props.label}: \${props.amount - props.discount} \${props.currency}\` +
        \` | onSale=\${props.onSale} | tags=\${JSON.stringify(props.tags)}\`);
  },
});

const price = ref(25);
</script>

<template>
  <ul>
    <PriceTag label="Book" :amount="price" on-sale :tags="['paper']" />
    <PriceTag label="Pen" />
    <PriceTag :amount="'12'" currency="GBP" :discount="99" />
  </ul>
</template>
`,
      },
      {
        label: "Child.vue: Boolean casting order and read-only props",
        tech: "vue",
        runnable: false,
        code: `<script setup>
const props = defineProps({
  count: { type: Number, required: true },
  flag: [Boolean, String],
  label: [String, Boolean],
  items: { type: Array, default: () => [] },
});
function bump() {
  props.count++; // not allowed: props are readonly
}
</script>
<template><button @click="bump">{{ count }} flag={{ JSON.stringify(flag) }} label={{ JSON.stringify(label) }}</button></template>
`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do defineProps and defineEmits work in <script setup>?",
    seoDescription:
      "defineProps and defineEmits are compile-time macros in script setup: what they compile to, type-based declarations, defaults, destructuring and limits.",
    description: `**Question presented to candidate:**
"In our \`<script setup>\` components I see \`defineProps\` and \`defineEmits\` used without any import. Where do they come from, what do they turn into, and what are the rules and limits when you use them with TypeScript?"

**What a strong answer should cover:**
- They are **compiler macros**: the SFC compiler removes the calls and writes \`props\` and \`emits\` options into the component; there is nothing to import (importing triggers a warning).
- \`defineProps\` returns the props object; \`defineEmits\` returns a typed \`emit\` function.
- Two forms: **runtime** (\`defineProps({ title: String })\`) and **type-based** (\`defineProps<{ title: string }>()\`), which the compiler converts into runtime options. You cannot use both in one call.
- Defaults for type-based props: \`withDefaults()\`, or since Vue 3.5 **reactive props destructure** (\`const { likes = 0 } = defineProps<...>()\`), with the getter rule for \`watch\`.
- The arguments are **hoisted** out of \`setup()\`, so they cannot reference local variables.
- \`vue-tsc\` checks the parent's usage against these types.

**Clarifying questions expected:**
- "Is the project on Vue 3.5 or later? That decides between \`withDefaults\` and destructured defaults."

**Code / implementation expected:** Yes. A typed component using both macros, ideally with the compiled output.`,
    answer: `**Target Audience:** Vue 3 developers using \`<script setup>\` who want to understand the two macros they write in almost every component.
**Difficulty:** Easy

> **How to read this doc:** Plain language first, then \`📌 Interview term:\` callouts. All compiled output and compiler errors come from \`@vue/compiler-sfc\` 3.5.44 \`compileScript()\`; runtime logs from a two-component app compiled the same way and mounted in jsdom; type errors from \`vue-tsc\` 3.3.13.

## 1. Why This Even Matters — A Story First

When you fill in a passport application, there is a box marked "for official use only". You do not write in it as a normal answer; it is an instruction to the clerk who processes the form. By the time the passport is printed, that box is gone.

\`defineProps\` and \`defineEmits\` are those boxes. They look like function calls in your \`<script setup>\`, but they are instructions to the **compiler**. When the component is built, the compiler reads them, writes the real \`props\` and \`emits\` options into the component, and removes the calls. At runtime there is no \`defineProps\` function at all.

Knowing that one fact explains every rule about them: why there is no import, why they cannot use your local variables, and how a TypeScript type can turn into runtime validation.

## 2. The Core Idea

📌 **Interview term: Compiler macro** — a function-like call that exists only at compile time. The SFC compiler recognises it and rewrites it; it is never executed. Vue's \`<script setup>\` macros include \`defineProps\`, \`defineEmits\`, \`defineModel\`, \`defineExpose\`, \`defineOptions\` and \`defineSlots\` (see [defineOptions and defineSlots](/interview-question/what-do-defineoptions-and-defineslots-do-in-script-setup) and [defineExpose](/interview-question/what-is-defineexpose-and-why-are-script-setup-components-closed-by-default)).

📌 **Interview term: defineProps()** — declares the component's [props](/interview-question/what-are-props-in-vue-and-how-do-you-validate-them) and returns the reactive, read-only props object.

📌 **Interview term: defineEmits()** — declares the events the component may emit and returns an \`emit\` function. Why declaring events matters is its own topic: [why declare emits](/interview-question/why-declare-emits-and-can-you-validate-them).

<svg class="iq-diagram" width="100%" viewBox="0 0 720 270" role="img" aria-label="The SFC compiler turns defineProps and defineEmits calls inside script setup into props and emits options on the component, and the calls themselves disappear">
  <defs>
    <marker id="dp-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="60" width="210" height="150" rx="12"/>
  <text class="d-text" x="125" y="100" text-anchor="middle">script setup</text>
  <text class="d-sub" x="125" y="130" text-anchor="middle">defineProps of T</text>
  <text class="d-sub" x="125" y="156" text-anchor="middle">defineEmits of E</text>
  <rect class="d-box-accent" x="275" y="95" width="170" height="80" rx="12"/>
  <text class="d-text d-accent" x="360" y="130" text-anchor="middle">compiler-sfc</text>
  <text class="d-sub" x="360" y="152" text-anchor="middle">build time</text>
  <rect class="d-box" x="490" y="60" width="210" height="150" rx="12"/>
  <text class="d-text" x="595" y="100" text-anchor="middle">component object</text>
  <text class="d-sub" x="595" y="130" text-anchor="middle">props option</text>
  <text class="d-sub" x="595" y="156" text-anchor="middle">emits option</text>
  <path class="d-edge" d="M 234 135 L 271 135" marker-end="url(#dp-arrow)"/>
  <path class="d-edge-accent" d="M 449 135 L 486 135" marker-end="url(#dp-arrow)"/>
</svg>

The left box is what you write, the right box is what ships. The macro calls never reach the browser.

## 3. Verified: What They Compile To

**Runtime declaration.** The argument is copied verbatim into the options:

\`\`\`js
// const props = defineProps({ title: String, likes: { type: Number, default: 0 } })
// const emit = defineEmits(["like", "close"])
export default {
  props: { title: String, likes: { type: Number, default: 0 } },
  emits: ["like", "close"],
  setup(__props, { expose: __expose, emit: __emit }) {
    const props = __props
    const emit = __emit
    function like() { emit("like", props.likes + 1) }
  }
}
\`\`\`

\`props\` is just the \`__props\` setup argument and \`emit\` is the context's \`emit\`. That is all the macros return.

📌 **Interview term: Type-based declaration** — \`defineProps<{ title: string; likes?: number }>()\`. The compiler reads the TypeScript type and **generates** runtime options from it. The second example at the bottom is the real output for a \`withDefaults\` call:

\`\`\`js
props: {
  title: { type: String, required: true },
  likes: { type: Number, required: false, default: 0 },
  tags: { type: Array, required: false, default: () => [] }
},
emits: ["like", "close"],
\`\`\`

\`string\` became \`type: String\`, a non-optional key became \`required: true\`, \`?\` became \`required: false\`. In a separate run, richer types mapped as you would hope: \`string | number\` became \`type: [String, Number]\`, an interface became \`type: Object\`, \`() => void\` became \`type: Function\`, \`Map<string, number>\` became \`type: Map\`, and \`unknown\` became \`type: null\` (accept anything). So the type gives you compile-time checking **and** runtime dev warnings. The \`emits\` list comes from the keys of the emits type.

📌 **Interview term: Named tuple emits syntax** — \`defineEmits<{ like: [count: number]; reset: [] }>()\`, added in Vue 3.3 as a shorter alternative to call signatures like \`(e: 'like', count: number): void\` ([Vue blog: Announcing Vue 3.3](https://blog.vuejs.org/posts/vue-3-3)).

## 4. Defaults: withDefaults or Destructuring

A TypeScript type cannot carry default values, so type-based props need another way:

📌 **Interview term: withDefaults()** — \`withDefaults(defineProps<T>(), { likes: 0, tags: () => [] })\`. Also a macro; its values become the \`default\` options shown above.

📌 **Interview term: Reactive props destructure** — since Vue 3.5 (stabilised in that release, per the [Vue 3.5 announcement](https://blog.vuejs.org/posts/vue-3-5)) you can write \`const { title, likes = 0 } = defineProps<...>()\`. The compiler rewrites every use of \`likes\` into \`__props.likes\`, so it stays reactive:

\`\`\`js
// const { title, likes = 0 } = defineProps<{ title: string; likes?: number }>()
// console.log(title, likes)
props: {
  title: { type: String, required: true },
  likes: { type: Number, required: false, default: 0 }
},
setup(__props) {
  console.log(__props.title, __props.likes)
}
\`\`\`

The one catch: a destructured prop looks like a plain variable but is not a ref, so passing it straight to \`watch\` would hand over a snapshot. The compiler catches this:

\`\`\`
[@vue/compiler-sfc] "likes" is a destructured prop and should not be passed directly to watch(). Pass a getter () => likes instead.
\`\`\`

The same advice applies to composables: pass \`() => likes\`. Destructuring in plain JavaScript loses reactivity, which is why this needed compiler support; see [toRef and toRefs](/interview-question/what-do-toref-and-torefs-do) for the non-macro way.

## 5. Verified: The Two-File App

The first example is a \`LikeButton\` with typed props, destructured default, typed emits and a getter-based watcher, used by an \`App\` twice:

\`\`\`
initial: Vue: 0 | Defaults only: 0
  [child] likes prop changed 0 -> 1
  [child] likes prop changed 1 -> 2
after two likes: Vue: 2 | Defaults only: 0
  [child] likes prop changed 2 -> 0
after reset: Vue: 0 | Defaults only: 0
\`\`\`

The destructured \`likes\` updated in the template **and** triggered the \`watch(() => likes)\` getter each time, and the second instance used the default \`0\`.

Then \`vue-tsc\` checked a parent that misuses it:

\`\`\`vue
<LikeButton :likes="3" />
<LikeButton title="ok" @like="(n: string) => n.toUpperCase()" />
\`\`\`

\`\`\`
App.vue(6,4): error TS2345: ... Property 'title' is missing in type '{ likes: number; }' but required in type ...
App.vue(7,27): error TS2322: Type '(n: string) => string' is not assignable to type '(count: number) => any'.
\`\`\`

Both the missing required prop and the wrong event payload type were caught before running anything. More in [TypeScript with Vue](/interview-question/how-do-you-use-typescript-with-vue-typed-props-emits-refs-vue-tsc).

## 6. Verified: The Rules and Their Error Messages

| You write | Result from compileScript() |
| :--- | :--- |
| \`import { defineProps } from "vue"\` | Warning: \`defineProps\` is a compiler macro and no longer needs to be imported. |
| \`defineProps<{ a: string }>({ a: String })\` | Error: defineProps() cannot accept both type and non-type arguments at the same time. Use one or the other. |
| \`defineProps\` called twice | Error: duplicate defineProps() call |
| validator using \`const max = ref(10)\` | Error: \`defineProps()\` in \`<script setup>\` cannot reference locally declared variables because it will be hoisted outside of the setup() function. |
| validator using \`const max = 10\` | Compiles: a literal constant is hoisted along with it |
| validator using an imported \`MAX\` | Compiles: imports live at module scope anyway |
| \`export const x = 1\` in \`<script setup>\` | Error: \`<script setup>\` cannot contain ES module exports. |

📌 **Interview term: Hoisting** — the props and emits options live on the component object, **outside** \`setup()\`, which runs once per instance. So their arguments are moved out of \`setup()\`, and anything they reference must exist at module scope: imports, literal constants, or a separate plain \`<script>\` block.

## 7. Common Pitfalls

- **Importing the macros.** Harmless but warned; remove the import.
- **Referencing setup state in a validator or default.** It is hoisted out of \`setup()\`; use a module-level constant or an import.
- **Passing a destructured prop to \`watch\` or a composable.** Use a getter, \`() => likes\`; the compiler blocks the direct \`watch\` call.
- **Mixing a type and a runtime object in one call.** Pick one form per component.
- **Calling the macros inside a helper function.** The compiler only rewrites top-level calls. Verified: \`function readProps() { return defineProps(['title']) }\` compiled with **no error**, left the call untouched, and crashed at mount with \`ReferenceError: defineProps is not defined\`. Call each macro once, at the top level of \`<script setup>\`.
- **Assuming types are the only check.** Type-based props still produce runtime \`type\` and \`required\` options, so dev warnings also fire for untyped JavaScript parents.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. They are macros:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineProps</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineEmits</code> are compiler macros. The SFC compiler turns them into the component's <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">props</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">emits</code> options, so there is nothing to import."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. What they return:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineProps</code> returns the read-only props object and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineEmits</code> returns the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">emit</code> function."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Two forms:</strong> <span style="color:#f0e2c8;">"Either a runtime object like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ title: String }</code>, or a TypeScript type, which the compiler converts to runtime options: non-optional becomes required."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Defaults:</strong> <span style="color:#f0e2c8;">"With types I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">withDefaults</code>, or in 3.5 destructure with defaults, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const { likes = 0 } = defineProps()</code>. It stays reactive, but I pass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">() =&gt; likes</code> to watch."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The limits:</strong> <span style="color:#f0e2c8;">"The arguments are hoisted out of setup, so they cannot reference local state, and each macro is called once at the top level. vue-tsc then checks parents against the types."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can a validator not use a ref declared in the same <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&lt;script setup&gt;</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The props option lives on the component object, outside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setup()</code>, so the compiler hoists the argument to module scope where that ref does not exist. Literal constants and imports are fine.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Are type-based props checked at runtime?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, partly. The compiler generates <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">required</code> from the type, so you get dev warnings too. An interface becomes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type: Object</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unknown</code> becomes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type: null</code>, so the runtime check is looser than the type, and vue-tsc covers the rest at compile time.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">withDefaults</code> and destructured defaults?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same result in the compiled props. Destructuring is the 3.5 syntax and reads more naturally; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">withDefaults</code> works on older 3.x versions and keeps a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">props</code> object.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">watch(likes, ...)</code> fail with a destructured prop?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The compiler rewrites <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">likes</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__props.likes</code>, so passing it would pass a plain value, not a reactive source. It reports an error and asks for a getter.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you use these macros in a normal <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&lt;script&gt;</code> block?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. They only exist inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;script setup&gt;</code>. In a normal block you use the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">props</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">emits</code> options directly.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Compiler macro** | A call the SFC compiler rewrites at build time; never runs |
| **defineProps()** | Declares props, returns the props object |
| **defineEmits()** | Declares events, returns the \`emit\` function |
| **Type-based declaration** | Generic type argument that the compiler turns into runtime options |
| **withDefaults()** | Macro that adds defaults to type-based props |
| **Reactive props destructure** | Vue 3.5+: destructured props stay reactive, defaults via \`=\` |
| **Hoisting** | Moving macro arguments out of \`setup()\` to module scope |
| **vue-tsc** | Type checker that understands \`.vue\` files |

---
**Conclusion:** \`defineProps\` and \`defineEmits\` are compile-time macros: the SFC compiler reads them, writes the component's \`props\` and \`emits\` options, and returns nothing more than the setup \`props\` and \`emit\`. Verified on Vue 3.5.44, a type argument is translated into runtime options (\`string\` to \`type: String\`, non-optional to \`required: true\`), defaults come from \`withDefaults\` or, since 3.5, destructuring with \`=\`, and destructured props stay reactive except when passed raw to \`watch\`, which the compiler rejects. Their arguments are hoisted out of \`setup()\`, so they cannot use local state, and \`vue-tsc\` checks every parent against the declared types.`,
    examples: [
      {
        label: "Typed defineProps with destructured defaults and typed defineEmits (two files)",
        tech: "vue",
        runnable: false,
        code: `<!-- LikeButton.vue -->
<script setup lang="ts">
import { watch } from "vue";

// Type-based declarations: the compiler turns these types into runtime options
const { title, likes = 0 } = defineProps<{
  title: string;
  likes?: number;
}>();

const emit = defineEmits<{
  like: [count: number];
  reset: [];
}>();

// Destructured props stay reactive in Vue 3.5+, but watch needs a getter
watch(() => likes, (now, before) => console.log(\`  [child] likes prop changed \${before} -> \${now}\`));
</script>

<template>
  <button class="like" @click="emit('like', likes + 1)">{{ title }}: {{ likes }}</button>
  <button class="reset" @click="emit('reset')">reset</button>
</template>

<!-- App.vue -->
<script setup lang="ts">
import { ref } from "vue";
import LikeButton from "./LikeButton.vue";
const count = ref(0);
</script>

<template>
  <LikeButton title="Vue" :likes="count" @like="(n) => (count = n)" @reset="count = 0" />
  <LikeButton title="Defaults only" />
</template>
`,
      },
      {
        label: "Real compileScript() output for withDefaults + type-based defineEmits",
        tech: "ts",
        runnable: false,
        code: `// What @vue/compiler-sfc compileScript() produced for
//   const props = withDefaults(defineProps<{ title: string; likes?: number; tags?: string[] }>(), {
//     likes: 0,
//     tags: () => [],
//   })
//   const emit = defineEmits<{ like: [count: number]; close: [] }>()
import { defineComponent as _defineComponent } from 'vue'
export default /*@__PURE__*/_defineComponent({
  props: {
    title: { type: String, required: true },
    likes: { type: Number, required: false, default: 0 },
    tags: { type: Array, required: false, default: () => [] }
  },
  emits: ["like", "close"],
  setup(__props: any, { expose: __expose, emit: __emit }) {
  __expose();
const props = __props
const emit = __emit
const __returned__ = { props, emit }
Object.defineProperty(__returned__, '__isScriptSetup', { enumerable: false, value: true })
return __returned__
}
})
`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Why declare emits and can you validate them?",
    seoDescription:
      "Declaring emits documents a Vue component, types emit and keeps listeners out of $attrs, avoiding double-fired native events. Validators warn in dev only.",
    description: `**Question presented to candidate:**
"A teammate's \`BaseButton\` emits \`click\` and the parent's handler runs twice per click. Another component emits \`submit\` with a payload that sometimes has no email. Explain why declaring emits fixes the first bug, how you would validate the second, and what validation can and cannot do."

**What a strong answer should cover:**
- \`emit()\` works without declaring, but **declaring** (\`emits\` option or \`defineEmits\`) documents the component's API and enables **typing**.
- Declared events are **removed from \`$attrs\`**. An undeclared \`click\` listener falls through to the root element as a **native** listener, so it fires twice: once from \`emit\`, once from the DOM.
- When \`emits\` is declared, emitting an **undeclared** event logs a dev warning, which catches typos.
- **Object syntax** adds a validator per event: return \`false\` and Vue warns. The event is **still delivered**, and production builds skip the check.
- Component events **do not bubble**; only the direct parent's listener runs.

**Clarifying questions expected:**
- "Is this \`<script setup>\`? Then I would use \`defineEmits\`, and a type-based declaration in TypeScript."

**Code / implementation expected:** Yes. A component showing the double-fire problem and an \`emits\` object with a validator.`,
    answer: `**Target Audience:** Vue developers who emit events from components and want to know what declaring them actually changes.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then \`📌 Interview term:\` callouts. Every log line and warning below came from running the code on Vue 3.5.44, compiled with \`@vue/compiler-sfc\` and mounted in jsdom, in development and in production mode.

## 1. Why This Even Matters — A Story First

A restaurant kitchen has a list of bells on the wall: "order ready", "need more plates", "fire". Staff know exactly which bells exist and what each means. If a new cook rings a bell that is not on the list, someone notices. If the "order ready" bell is accidentally wired to the front door too, waiters come running twice.

A component's events are its bells. Declaring them is putting the list on the wall:

- The team (and your editor, and TypeScript) can see which events exist.
- Vue knows which listeners are "bells" for this component and which are ordinary attributes to pass to the HTML element. Without the list, a listener for \`click\` is wired both to your bell **and** to the real DOM click, and the handler runs twice.
- You can add a quality check on what each bell carries, the payload.

## 2. The Core Idea

📌 **Interview term: emits option** — the list of custom events a component may emit: \`emits: ['submit', 'cancel']\` in the Options API, or \`defineEmits(['submit', 'cancel'])\` in \`<script setup>\` (see [defineProps and defineEmits](/interview-question/how-do-defineprops-and-defineemits-work-in-script-setup)).

📌 **Interview term: Fallthrough attributes** — anything a parent passes that is not a declared prop or event lands in \`$attrs\` and is applied to the component's root element. Listeners included: \`@click\` becomes \`onClick\` in \`$attrs\`, which becomes a native DOM listener on the root. See [fallthrough attributes](/interview-question/what-are-fallthrough-attributes-attrs).

Put those two together and you get the main practical reason to declare events: **declaring an event takes its listener out of \`$attrs\`**.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="An undeclared click listener goes into attrs and becomes a native listener on the root button, so the handler runs for the emit and for the DOM click; a declared click listener only receives the emit">
  <defs>
    <marker id="em-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="260" y="20" width="200" height="60" rx="12"/>
  <text class="d-text d-accent" x="360" y="56" text-anchor="middle">parent @click</text>
  <rect class="d-box-muted" x="30" y="140" width="250" height="60" rx="10"/>
  <text class="d-text" x="155" y="168" text-anchor="middle">undeclared</text>
  <text class="d-sub" x="155" y="188" text-anchor="middle">in attrs and in emit</text>
  <rect class="d-box" x="440" y="140" width="250" height="60" rx="10"/>
  <text class="d-text" x="565" y="168" text-anchor="middle">declared in emits</text>
  <text class="d-sub" x="565" y="188" text-anchor="middle">emit only</text>
  <rect class="d-box-muted" x="30" y="240" width="250" height="50" rx="10"/>
  <text class="d-text" x="155" y="270" text-anchor="middle">handler runs twice</text>
  <rect class="d-box" x="440" y="240" width="250" height="50" rx="10"/>
  <text class="d-text" x="565" y="270" text-anchor="middle">handler runs once</text>
  <path class="d-edge" d="M 300 84 L 190 136" marker-end="url(#em-arrow)"/>
  <path class="d-edge-accent" d="M 420 84 L 530 136" marker-end="url(#em-arrow)"/>
  <path class="d-edge" d="M 155 204 L 155 236" marker-end="url(#em-arrow)"/>
  <path class="d-edge-accent" d="M 565 204 L 565 236" marker-end="url(#em-arrow)"/>
</svg>

The left path is the bug from the interview question. The right path is the fix, and it is one line.

## 3. Verified: The Double-Fire Bug

The runnable example has two identical buttons that \`emit('click', 'from emit')\`. One declares \`emits: ['click']\`, the other does not. Each prints its own \`$attrs\` keys:

\`\`\`
labels: attrs: onClick | attrs: none
click undeclared:
   undeclared got from emit
   undeclared got a native event
click declared:
   declared got from emit
\`\`\`

- The undeclared button's \`$attrs\` contained \`onClick\`, which fell through to the \`<button>\` as a native listener. One click ran the parent handler **twice**: once with the emitted string, once with a \`MouseEvent\`.
- The declared button had empty \`$attrs\` and ran the handler **once**.

This is most likely when a custom event shares its name with a native one (\`click\`, \`input\`, \`change\`, \`submit\`, \`focus\`). It is also why [component v-model](/interview-question/how-does-v-model-work-on-components) components should declare \`update:modelValue\`.

## 4. Verified: Catching Typos

📌 **Interview term: Undeclared emit warning** — once a component declares \`emits\`, emitting a name that is not in the list (and not passed as an \`onX\` prop) logs a dev warning. The example's form emits \`cancle\` by mistake:

\`\`\`
[Vue warn]: Component emitted event "cancle" but it is neither declared in the emits option nor as an "onCancle" prop.
\`\`\`

A component with **no** \`emits\` option at all gets no such warning (the undeclared button above emitted \`click\` silently), so declaring is what turns this safety net on.

## 5. Validating Payloads

📌 **Interview term: Emit validator** — with the **object syntax**, each event maps to \`null\` (no check) or a function that receives the emitted arguments and returns \`true\` or \`false\`:

\`\`\`js
emits: {
  submit: (payload) => typeof payload?.email === "string" && payload.email.includes("@"),
  cancel: null,
}
\`\`\`

In the example, the "valid" button emits \`{ email: "ada@example.com" }\`, the "invalid" one \`{ email: "nope" }\`:

\`\`\`
[Vue warn]: Invalid event arguments: event validation failed for event "submit".
after valid, invalid and typo:
   submit ada@example.com
   submit nope
\`\`\`

📌 **Interview term: Validation is advisory** — the validator ran and warned, but the **invalid event was still delivered** (\`submit nope\`). Like [prop validation](/interview-question/what-are-props-in-vue-and-how-do-you-validate-them), it reports a developer mistake; it does not block anything.

## 6. Verified: Production Skips Validators

The second example is the same validator in \`<script setup>\` with \`defineEmits\`, plus a log inside the validator. Development:

\`\`\`
  [validator ran]
[Vue warn]: Invalid event arguments: event validation failed for event "submit".
  parent received nope
\`\`\`

Production build (\`NODE_ENV=production\`):

\`\`\`
  parent received nope
\`\`\`

The validator function **did not even run** in production. Do not put side effects or real business rules in it. If a payload must be rejected, check it before calling \`emit\`.

With TypeScript, \`defineEmits<{ submit: [payload: { email: string }] }>()\` checks payload **types** at compile time with \`vue-tsc\`, but type-based emits generate only the event names at runtime (no validator functions). Use the object form when you want a runtime rule a type cannot express, such as "contains @".

## 7. Verified: Events Do Not Bubble

📌 **Interview term: Non-bubbling component events** — a component event reaches only the listener its **direct parent** attached. Tested with \`Inner\` emitting \`ping\`, wrapped by \`Middle\`, with the listener on \`Middle\` in the top-level component:

\`\`\`
grandparent saw: nothing
\`\`\`

\`Middle\` must re-emit (or forward the listener) to pass it up. For deeply nested communication use [provide and inject](/interview-question/what-are-provide-and-inject) or a [store](/interview-question/what-is-pinia-and-why-use-it). This differs from DOM events, which bubble; see [how Vue components communicate](/interview-question/how-do-vue-components-communicate).

## 8. Declared or Not: Summary

| | No \`emits\` option | \`emits\` declared |
| :--- | :--- | :--- |
| \`emit()\` works | Yes | Yes |
| Listener also in \`$attrs\` | Yes, falls through to root | No |
| Same-named native event | Fires the handler twice | Once |
| Typo warning | No | Yes, in dev |
| Payload validator | Not possible | Object syntax, dev only |
| TypeScript payload types | No | With \`defineEmits<...>()\` |
| Self-documenting API | No | Yes |

## 9. Common Pitfalls

- **Emitting \`click\` without declaring it.** The handler runs twice. Declare it, or name the event something non-native.
- **Expecting validators to block.** Invalid events are still delivered, and production never runs the validator.
- **Side effects in validators.** They vanish in production builds.
- **Expecting bubbling.** Only the direct parent hears an event; re-emit or use provide/inject.
- **Kebab-case drift.** Declaring \`update:firstName\` and emitting \`update:first-name\` still reaches the parent but logs the undeclared-event warning. Use one spelling.
- **Declaring nothing because "it works".** You lose typo warnings, typing and the \`$attrs\` cleanup at once.

## 10. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. It is optional, but:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">emit</code> works without declaring, but declaring with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">emits</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineEmits</code> makes events part of the component contract: documented and typed."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The real bug it fixes:</strong> <span style="color:#f0e2c8;">"Declared events are removed from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$attrs</code>. If <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">click</code> is not declared, the parent listener also falls through to the root as a native listener, so it fires twice."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Typos:</strong> <span style="color:#f0e2c8;">"Once emits are declared, emitting an unknown name logs a dev warning, which catches mistakes like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cancle</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Validation:</strong> <span style="color:#f0e2c8;">"The object syntax maps each event to a validator that returns true or false. A false result only warns: the event is still delivered, and production skips it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Scope of events:</strong> <span style="color:#f0e2c8;">"Component events go to the direct parent only; they do not bubble. For deeper communication I use provide and inject or a store."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did my click handler run twice?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The child emitted <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">click</code> without declaring it, so the parent listener was also in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$attrs</code> and became a native click listener on the root element. Declaring <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">emits: ['click']</code> removes it from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$attrs</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does a failing emit validator stop the event?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Vue logs "Invalid event arguments" and still calls the parent handler. In production the validator is not even called.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you type emits in TypeScript?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineEmits&lt;{ submit: [payload: Form]; cancel: [] }&gt;()</code>. vue-tsc then checks both the emit calls and the parent handlers. At runtime only the event names are kept.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a grandparent listen to a grandchild event?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not directly. Events do not bubble, so the middle component must re-emit or forward the listener, or you use provide and inject or a store.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does declaring emits relate to <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">inheritAttrs: false</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inheritAttrs: false</code> stops all of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$attrs</code> from falling through. Declaring an event removes only that listener from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$attrs</code>, which is usually what you want.</span>
</div>

</div>

## 11. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **emits option / defineEmits** | Declares which custom events a component emits |
| **$attrs** | Undeclared attributes and listeners, applied to the root element |
| **Double fire** | Undeclared same-named event runs the handler for emit and native DOM event |
| **Undeclared emit warning** | Dev warning for emitting a name not in \`emits\` |
| **Emit validator** | Object-syntax function returning true or false for a payload |
| **Advisory validation** | Warns in dev, never blocks, skipped in production |
| **Non-bubbling** | Component events reach only the direct parent |

---
**Conclusion:** You can \`emit()\` without declaring anything, but declaring events is what makes them part of the component's contract. Verified on Vue 3.5.44, a declared event is removed from \`$attrs\`, which fixes the classic double-fired \`click\`; declaring also switches on the warning for undeclared (often misspelled) events and enables TypeScript payload types. The object syntax adds a validator per event, but it only warns, the event is still delivered, and production builds do not run it at all. Component events reach only the direct parent; they do not bubble.`,
    examples: [
      {
        label: "Undeclared vs declared click, event validation and a typo warning",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { ref, defineComponent, h } from "vue";

// Emits "click" but does NOT declare it
const UndeclaredButton = defineComponent({
  setup(_, { emit, attrs }) {
    return () =>
      h("button", { class: "undeclared", onClick: () => emit("click", "from emit") },
        "attrs: " + Object.keys(attrs).join(", "));
  },
});

// Same component, but "click" is declared
const DeclaredButton = defineComponent({
  emits: ["click"],
  setup(_, { emit, attrs }) {
    return () =>
      h("button", { class: "declared", onClick: () => emit("click", "from emit") },
        "attrs: " + (Object.keys(attrs).join(", ") || "none"));
  },
});

// Object syntax: a validator per event. Return false to get a dev warning.
const SignupForm = defineComponent({
  emits: {
    submit: (payload) => typeof payload?.email === "string" && payload.email.includes("@"),
    cancel: null, // declared, no validation
  },
  setup(_, { emit }) {
    return () => [
      h("button", { class: "good", onClick: () => emit("submit", { email: "ada@example.com" }) }, "valid"),
      h("button", { class: "bad", onClick: () => emit("submit", { email: "nope" }) }, "invalid"),
      h("button", { class: "typo", onClick: () => emit("cancle") }, "typo"),
    ];
  },
});

const log = ref([]);
</script>

<template>
  <UndeclaredButton @click="(arg) => log.push('undeclared got ' + (typeof arg === 'string' ? arg : 'a native event'))" />
  <DeclaredButton @click="(arg) => log.push('declared got ' + (typeof arg === 'string' ? arg : 'a native event'))" />
  <SignupForm @submit="(p) => log.push('submit ' + p.email)" />
  <ol><li v-for="(line, i) in log" :key="i">{{ line }}</li></ol>
</template>
`,
      },
      {
        label: "defineEmits with a validator: dev warning, production silence",
        tech: "vue",
        runnable: false,
        code: `<!-- Form.vue -->
<script setup>
const emit = defineEmits({
  submit: (payload) => {
    console.log("  [validator ran]");
    return typeof payload?.email === "string" && payload.email.includes("@");
  },
});
</script>
<template><button @click="emit('submit', { email: 'nope' })">send</button></template>

<!-- App.vue -->
<script setup>
import Form from "./Form.vue";
</script>
<template><Form @submit="(p) => console.log('  parent received', p.email)" /></template>
`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are scoped styles in Vue?",
    seoDescription:
      "Vue scoped styles add a data-v attribute to elements and selectors. Real compileStyle output for :deep, :slotted, :global, v-bind() and where it leaks.",
    description: `**Question presented to candidate:**
"We use \`<style scoped>\` everywhere, yet a \`.title\` rule in a parent still changed a child component's root, and our attempt to restyle a third-party component's inner element did nothing. Explain how scoped styles actually work, and how you would fix both situations."

**What a strong answer should cover:**
- \`<style scoped>\` is a **compile-time** transform: every element the component renders gets a \`data-v-<hash>\` attribute, and every selector gets \`[data-v-<hash>]\` added to its **last** compound selector.
- A child component's **root element** carries both the parent's and the child's attribute, so parent rules can reach it (by design, for layout).
- To reach **inside** a child, use **\`:deep(.x)\`**; to style slot content from the component that renders the slot, **\`:slotted()\`**; to escape scoping for one rule, **\`:global()\`**.
- Content from **\`v-html\`** and multi-root children do not get the parent's attribute.
- \`v-bind()\` in \`<style>\` turns a reactive value into a **CSS custom property**.
- Alternatives: CSS Modules (\`<style module>\`), utility classes; scoping is not Shadow DOM.

**Clarifying questions expected:**
- "Is the third-party component's markup rendered by a Vue component (so \`:deep\` works) or injected HTML?"

**Code / implementation expected:** Optional. Reading the compiled selectors, or a small component showing \`:deep()\`, is a strong bonus.`,
    answer: `**Target Audience:** Vue developers who write \`<style scoped>\` and want to know precisely what it does and where its edges are.
**Difficulty:** Easy

> **How to read this doc:** Plain language first, then \`📌 Interview term:\` callouts. The compiled CSS is real output from \`@vue/compiler-sfc\` 3.5.44 \`compileStyle()\` and from a \`vite build\` (vite 8.3.4, \`@vitejs/plugin-vue\` 6.0.10). The DOM attributes come from mounting the components in jsdom, and the computed colours were read from the built app in headless Chromium.

## 1. Why This Even Matters — A Story First

In a big office, everybody's coffee mug looks the same. Someone writes a rule on the kitchen whiteboard: "white mugs go in the top cupboard". Suddenly every white mug in the building moves, including yours. Global CSS works like that: \`.title { color: red }\` in one component restyles every \`.title\` in the app.

The fix offices use is a name sticker. Each team puts its own sticker on its mugs and writes rules like "white mugs **with the blue sticker** go in the top cupboard". Now a rule only touches that team's mugs.

Scoped styles are exactly that sticker. Vue puts a unique attribute (\`data-v-997e5958\`) on every element a component renders, and rewrites every selector in its \`<style scoped>\` block to require that attribute. Same class names, no collisions.

## 2. The Core Idea

📌 **Interview term: Scoped styles** — \`<style scoped>\` in a [Single File Component](/interview-question/what-is-a-single-file-component-sfc). At build time Vue gives the component a **scope id**, adds it as an attribute to every element in the component's template, and appends an attribute selector to every CSS rule in that block.

📌 **Interview term: Scope id** — the \`data-v-<hash>\` attribute. With \`@vitejs/plugin-vue\`, the hash is computed from the file path in development and from the file path plus the source in production (read from the plugin source: \`getHash(normalizedPath + (isProduction ? source : ""))\`).

It is **not** the Shadow DOM: the CSS is still global, it is just made more specific. That is why it works everywhere and has no runtime cost, and also why it has a few deliberate gaps.

## 3. Verified: The Compiled Selectors

\`compileStyle()\` with \`scoped: true\` and id \`data-v-7ba5bd90\`, on this input:

\`\`\`css
.card { padding: 16px; }
.card h2 { color: teal; }
.card :deep(.title) { font-weight: bold; }
:slotted(p) { margin: 0; }
:global(body) { margin: 0; }
.card > .badge:hover { opacity: 0.8; }
@media (max-width: 600px) { .card { padding: 8px; } }
.btn { color: v-bind(color); }
\`\`\`

produced:

\`\`\`css
.card[data-v-7ba5bd90] { padding: 16px; }
.card h2[data-v-7ba5bd90] { color: teal; }
.card[data-v-7ba5bd90] .title { font-weight: bold; }
p[data-v-7ba5bd90-s] { margin: 0; }
body { margin: 0; }
.card > .badge[data-v-7ba5bd90]:hover { opacity: 0.8; }
@media (max-width: 600px) {
.card[data-v-7ba5bd90] { padding: 8px; }
}
.btn[data-v-7ba5bd90] { color: var(--7ba5bd90-color); }
\`\`\`

Read it carefully, because each line answers a common follow-up:

- **Only the last compound selector gets the attribute.** \`.card h2\` became \`.card h2[data-v-...]\`, not \`.card[data-v-...] h2[data-v-...]\`. The \`h2\` must belong to this component; the \`.card\` ancestor is matched normally.
- **Pseudo-classes stay after the attribute.** \`.badge[data-v-...]:hover\`.
- **At-rules are walked into.** The rule inside \`@media\` was scoped too.
- **\`:deep()\` moves the attribute to the left.** \`.card[data-v-...] .title\`: the \`.card\` must be ours, \`.title\` can be anything inside it, including a child component's elements.
- **\`:slotted()\` uses a \`-s\` suffix**, matching slot content (section 6).
- **\`:global()\` removes scoping** for that rule.
- **\`v-bind(color)\` became a CSS variable** (section 7).

📌 **Interview term: :deep()** — the deep selector. Vue 2's \`>>>\`, \`/deep/\` and \`::v-deep\` combinators still compile, but warn:

\`\`\`
[@vue/compiler-sfc] the >>> and /deep/ combinators have been deprecated. Use :deep() instead.
[@vue/compiler-sfc] ::v-deep usage as a combinator has been deprecated. Use :deep(<inner-selector>) instead of ::v-deep <inner-selector>.
\`\`\`

## 4. Where the Attribute Lands

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="Parent elements get the parent scope attribute, the child root element gets both parent and child attributes, and elements inside the child get only the child attribute">
  <rect class="d-box-accent" x="20" y="20" width="680" height="260" rx="14"/>
  <text class="d-text d-accent" x="40" y="50">Parent template: data-v-P on its own elements</text>
  <rect class="d-box-muted" x="50" y="80" width="230" height="60" rx="10"/>
  <text class="d-text" x="165" y="108" text-anchor="middle">p.note</text>
  <text class="d-sub" x="165" y="128" text-anchor="middle">data-v-P</text>
  <rect class="d-box" x="330" y="80" width="340" height="180" rx="12"/>
  <text class="d-text" x="500" y="108" text-anchor="middle">child root div.box</text>
  <text class="d-sub" x="500" y="128" text-anchor="middle">data-v-P and data-v-C</text>
  <rect class="d-box-muted" x="380" y="170" width="240" height="60" rx="10"/>
  <text class="d-text" x="500" y="198" text-anchor="middle">p.note inside child</text>
  <text class="d-sub" x="500" y="218" text-anchor="middle">data-v-C only</text>
</svg>

📌 **Interview term: Child root inheritance** — a child component's **root** element is rendered from the parent's template too, so it receives the parent's scope id as well as its own. Parent rules therefore reach the child root (useful for layout such as margins), but not the elements inside it.

## 5. Verified: In a Real Build and a Real Browser

The runnable example has a parent with \`.note\`, \`.box\` and \`.box :deep(.note)\` rules, and an inline child that renders a \`div.box\` root with a \`p.note\` inside it. Running \`vite build\` on it produced this CSS (comments from the source kept):

\`\`\`css
.note[data-v-997e5958] {
  color: var(--v05923c16);
  font-weight: bold;
}
.box[data-v-997e5958] {
  border: 2px dashed gray;
  padding: 8px;
}
.box[data-v-997e5958] .note {
  font-style: italic;
}
\`\`\`

Serving the build and reading the DOM and computed styles in headless Chromium:

\`\`\`
<p data-v-997e5958="" class="note" style="--v05923c16: crimson;">in the parent</p>
<div data-v-997e5958="" class="box" style="--v05923c16: crimson;"><p class="note">inside the child</p></div>
parentP: color=rgb(220, 20, 60) weight=700 style=normal
childP:  color=rgb(0, 0, 0)     weight=400 style=italic
box:     border=2px dashed
after swap parent: color=rgb(0, 128, 128) weight=700 style=normal
\`\`\`

- The parent's \`<p class="note">\` matched \`.note[data-v-...]\`: crimson and bold.
- The child's \`<p class="note">\` has the **same class** but no \`data-v-997e5958\`, so it stayed black and normal weight. Scoping worked.
- The child's root \`div.box\` **did** carry the parent's attribute, so the parent's \`.box\` rule gave it the dashed border. That is the "leak" in the interview question, and it is by design.
- \`:deep(.note)\` reached inside the child: italic.
- Clicking the button changed \`accent\` to teal and the colour followed, through the CSS variable.

## 6. Verified: Slots, Multi-Root Children and v-html

A second app checked the edge cases (scope ids shortened to \`data-v-app\` and \`data-v-panel\` by the test harness):

\`\`\`
<section data-v-panel="" data-v-app="" class="panel">
  <h3 data-v-panel="" class="title">Panel</h3>
  <p data-v-app="" data-v-panel-s="" class="hint">slot content written by App</p>
</section>
<span class="a">a</span>
<span class="b">b</span>
<div data-v-app="" class="raw"><em class="inner">from v-html</em></div>
\`\`\`

📌 **Interview term: Slot content scoping** — content passed into a [slot](/interview-question/what-are-slots-in-vue) belongs to the component that **wrote** it. The \`<p class="hint">\` carries \`data-v-app\` (App wrote it), so App's \`.hint\` rule applies. It also carries \`data-v-panel-s\`, which is what Panel's \`:slotted(.hint)\` rule (\`.hint[data-v-panel-s]\`) targets. Without \`:slotted()\`, Panel's normal scoped rules cannot style slot content.

- **Multi-root children get nothing.** The two-root component's \`<span>\`s carry no parent attribute, the same reason [fallthrough attributes](/interview-question/what-are-fallthrough-attributes-attrs) need a single root.
- **\`v-html\` content is not scoped.** The \`<em class="inner">\` injected by [v-html](/interview-question/what-is-v-html-and-what-is-the-risk-of-using-it) has no attribute, so App's \`.inner\` rule (compiled to \`.inner[data-v-app]\`) does not match it. Use \`.raw :deep(.inner)\`.

## 7. v-bind() in CSS

📌 **Interview term: CSS v-bind()** — \`color: v-bind(accent)\` inside \`<style>\` links a CSS property to reactive state. The compiler replaces it with \`var(--<id>-accent)\` (hashed in production, \`--v05923c16\` above), and the component calls \`useCssVars()\` at runtime to set that custom property as an inline style on its elements. Verified above: the \`style="--v05923c16: crimson;"\` attributes and the colour change after the click. It also works in a non-scoped block: \`compileStyle()\` without \`scoped\` turned \`.y { color: v-bind(c) }\` into \`.y { color: var(--1-c) }\`.

## 8. Scoped Styles Compared

| Approach | How it isolates | Reach into children | Notes |
| :--- | :--- | :--- | :--- |
| \`<style scoped>\` | \`data-v\` attribute selectors | \`:deep()\` | Child root still matched by parent rules |
| \`<style module>\` | Renamed class names via \`$style\` | Pass classes down explicitly | No attribute selectors |
| Global \`<style>\` | None | Everything | Fine for resets and design tokens |
| Utility classes (Tailwind) | No custom CSS to collide | Pass classes as props | Pairs well with [class bindings](/interview-question/how-do-you-bind-classes-and-styles-dynamically) |
| Shadow DOM (custom elements) | Real browser encapsulation | \`::part()\` | Not what scoped styles do |

Frameworks solve the same problem differently; compare [CSS options in Next.js](/interview-question/how-does-next-js-handle-css-css-modules-global-tailwind-css-in-js).

## 9. Common Pitfalls

- **Expecting a parent rule to style a child's inner elements.** It cannot; use \`:deep()\` on a scoped ancestor.
- **Being surprised that a parent rule hits the child root.** The root carries both scope ids. Use more specific class names, or style layout only.
- **Styling \`v-html\` output with plain scoped rules.** No attribute, no match; wrap it and use \`:deep()\`.
- **Styling slot content from the slot owner.** Use \`:slotted()\`; ordinary scoped rules do not match it.
- **\`:deep()\` on its own at the top.** \`:deep(.x)\` with no scoped ancestor compiles to \`[data-v-...] .x\`, which is broader than intended; put a component class in front.
- **Element selectors in scoped blocks.** The Vue style guide warns that element-attribute selectors like \`button[data-v-...]\` are considerably slower than class-attribute selectors and recommends classes ([Vue style guide: rules to use with caution](https://vuejs.org/style-guide/rules-use-with-caution)). Not benchmarked here.
- **Old deep combinators.** \`>>>\`, \`/deep/\` and \`::v-deep\` still work but warn; migrate to \`:deep()\`.

## 10. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What it is:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;style scoped&gt;</code> is a compile-time transform. Vue adds a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">data-v</code> hash attribute to every element the component renders and to every selector in that block."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How selectors change:</strong> <span style="color:#f0e2c8;">"Only the last compound selector gets the attribute, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.card h2</code> becomes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.card h2[data-v-x]</code>. It is still global CSS, just more specific, not Shadow DOM."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The deliberate leak:</strong> <span style="color:#f0e2c8;">"A child component root element carries both the parent and child ids, so parent rules can style the child root, but not its inner elements."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The escape hatches:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:deep()</code> reaches into children, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:slotted()</code> styles slot content from the slot owner, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:global()</code> opts a rule out. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-html</code> content is never scoped."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Dynamic values:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-bind()</code> in CSS turns a reactive value into a CSS custom property that Vue updates at runtime."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did my parent <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">.title</code> rule change the child?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The element was the child root, which carries the parent scope id too. That is by design for layout. Use a more specific class or wrap the child.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you style an inner element of a third-party component?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">From a scoped ancestor with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:deep()</code>: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.wrapper :deep(.vendor-title)</code>. It compiles to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.wrapper[data-v-x] .vendor-title</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Are scoped styles slower?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">There is no runtime style processing: the attribute is already in the render output. The Vue style guide does warn that element selectors such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">button[data-v-x]</code> are considerably slower than class selectors once scoped, so it recommends classes in scoped styles. I have not benchmarked it myself.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is this different from CSS Modules?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">CSS Modules rename class names and you apply them through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$style</code>, so there are no attribute selectors and no child-root leak. Scoped styles keep your class names and add attributes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do scoped styles work with v-html?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not directly. The injected HTML does not get the scope attribute. Wrap it in a scoped element and target it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:deep()</code>.</span>
</div>

</div>

## 11. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Scoped styles** | \`<style scoped>\`, CSS limited to this component via an attribute |
| **Scope id** | The \`data-v-<hash>\` attribute added to elements and selectors |
| **Child root inheritance** | A child root element carries the parent scope id too |
| **\`:deep()\`** | Lets a scoped rule match descendants rendered by children |
| **\`:slotted()\`** | Targets slot content from the component that renders the slot |
| **\`:global()\`** | Opts a single rule out of scoping |
| **CSS \`v-bind()\`** | Reactive value exposed as a CSS custom property |

---
**Conclusion:** Scoped styles are a compile-time trick, not encapsulation: Vue stamps a \`data-v-<hash>\` attribute on every element a component renders and adds \`[data-v-<hash>]\` to the last compound selector of every rule in \`<style scoped>\`. Verified on Vue 3.5.44 with \`compileStyle()\`, a real \`vite build\` and Chromium, the child's root element carries the parent's id (so parent rules reach it), inner child elements and \`v-html\` content do not, \`:deep()\` moves the attribute left to reach inside, \`:slotted()\` targets slot content through a \`-s\` attribute, \`:global()\` opts out, and \`v-bind()\` becomes a CSS custom property updated at runtime.`,
    examples: [
      {
        label: "Scoped styles, child root leakage, :deep() and v-bind() in CSS",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { ref, defineComponent, h } from "vue";

// A child component with no styles of its own: a root div with a <p> inside
const Child = defineComponent({
  setup() {
    return () => h("div", { class: "box" }, [h("p", { class: "note" }, "inside the child")]);
  },
});

const accent = ref("crimson");
</script>

<template>
  <p class="note">in the parent</p>
  <Child />
  <button @click="accent = accent === 'crimson' ? 'teal' : 'crimson'">swap colour</button>
</template>

<style scoped>
/* Compiled to .note[data-v-xxxx]: only elements rendered by THIS component match */
.note {
  color: v-bind(accent);
  font-weight: bold;
}
/* The child ROOT element also carries this component scope attribute, so this matches it */
.box {
  border: 2px dashed gray;
  padding: 8px;
}
/* :deep() reaches inside the child */
.box :deep(.note) {
  font-style: italic;
}
</style>
`,
      },
      {
        label: "Compiling scoped CSS with @vue/compiler-sfc compileStyle()",
        tech: "js",
        runnable: false,
        code: `import { compileStyle, parse, compileScript } from "@vue/compiler-sfc";
const id = "data-v-7ba5bd90";
const css = \`.card { padding: 16px; }
.card h2 { color: teal; }
.card :deep(.title) { font-weight: bold; }
:slotted(p) { margin: 0; }
:global(body) { margin: 0; }
.card > .badge:hover { opacity: 0.8; }
@media (max-width: 600px) { .card { padding: 8px; } }
.btn { color: v-bind(color); }\`;
const r = compileStyle({ source: css, filename: "Card.vue", id, scoped: true });
console.log(r.code);
console.log("errors:", r.errors.map(String));
const warn = console.warn; console.warn = (...a) => console.log("WARN:", ...a.map(String));
const old = compileStyle({ source: \`.a >>> .b { color: red } .a /deep/ .c { color: blue } .a ::v-deep .d { x: y }\`, filename: "Old.vue", id, scoped: true });
console.warn = warn;
console.log(old.code);
`,
      },
    ],
  },
];

export default augments;
