/**
 * Vue ULTRA — batch 07: dynamic and built-in components (<component :is>,
 * KeepAlive, Transition and TransitionGroup, how Transition, KeepAlive and
 * Suspense compose, Teleport), Suspense (twice: the basics, and what 3.5
 * really ships), async setup and top-level await, defineAsyncComponent with
 * loading, error and retry, and lazy-loading routes and components.
 *
 * Full CLAUDE.md treatment per question, matching the Angular, React and
 * Next.js ultra banks: a plain-language story first, `📌 Interview term:`
 * callouts, a Verified section quoting output that was actually produced, a
 * theme-aware `.iq-diagram` SVG, comparison tables, topic-specific pitfalls,
 * the §7 "How to Answer in an Interview" card, a glossary and a conclusion.
 *
 * Picked up by `npm run augment:vue`, which loads prisma/data/vue-augments-*.ts
 * in name order and matches on exact title.
 *
 * Every "Verified" block was produced on Vue 3.5.44 with
 * scripts/verify-vue-example.mjs (SFC compiled with @vue/compiler-sfc,
 * mounted with createApp in jsdom, or rendered with renderToString in --ssr
 * mode). Examples marked runnable are single self-contained SFCs that passed
 * it. Router claims were run against vue-router 5.4.0, tests with Vitest 5.0.5
 * and @vue/test-utils 2.5.1, build output with Vite 8.3.4 and
 * @vitejs/plugin-vue 6.0.10. Animation timing and chunk fetching were checked
 * in headless Chromium (Playwright) against a real Vite build, because jsdom
 * runs no CSS transitions and does no layout. The Suspense status was read
 * from the 3.5.44 runtime, the 3.6.0-rc.12 runtime and the vuejs/docs source.
 *
 * Conventions: SVG attributes double-quoted, `<code>` tags for inline code in
 * prose, no leading H1, `description` is plain markdown (no HTML).
 */
import type { VueAugment } from "./vue-augments.types";

const augments: VueAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do dynamic components work?",
    seoDescription:
      "Vue's <component :is> picks which component to render at runtime. How :is resolves, why shallowRef matters, and what switching does to state.",
    description: `**Question presented to candidate:**
"Our settings page has five tabs and the tab bar is driven by config from the server. Instead of a long \`v-if\` / \`v-else-if\` chain, a colleague used \`<component :is>\`. Explain how that works, what you can pass to \`:is\`, and what happens to a tab's state when the user switches away."

**What a strong answer should cover:**
- \`<component :is="x">\` is a built-in placeholder; the compiler turns it into \`resolveDynamicComponent(x)\` and renders whatever that returns.
- \`:is\` accepts a **component object** (the usual case in \`<script setup>\`), a **registered component name** string, or a **plain HTML tag** name.
- Holding a component object in state should use \`shallowRef\` or \`markRaw\`; \`ref()\` makes it deeply reactive and Vue warns about it.
- Switching \`:is\` **unmounts the old component and mounts the new one**, so local state is lost unless the switch is wrapped in \`<KeepAlive>\`.
- Props, attrs, events and slots passed to \`<component>\` go to whichever component is current, so tabs need a compatible interface.
- An unknown string name silently renders as a custom element, so typos do not throw.

**Clarifying questions expected:**
- "Should a tab keep its half-filled form when the user switches away and back?"
- "Is the list of tabs fixed at build time, or does it come from data at runtime?"

**Code / implementation expected:** Yes — a small tab switcher with \`<component :is>\` and a note on what switching does to state.`,
    answer: `**Target Audience:** Developers who know basic Vue templates and components and want to understand runtime component switching.
**Difficulty:** Medium

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. Every output block in this doc was produced by compiling and running the code on Vue 3.5.44, either with the repo's <code>verify-vue-example.mjs</code> harness (compile the SFC, mount it in jsdom) or with a small Node script.

## 1. Why This Even Matters — A Story First

Picture a theatre with one stage and a cast of five plays. The stage does not change; what changes is which play is on it tonight. A stagehand reads tonight's poster and wheels the right set onto the stage. When the next play starts, the old set is wheeled off and broken down, and the new one is built from scratch.

<code>&lt;component :is&gt;</code> is that stage. You put one placeholder in your template, and a piece of state (the poster) decides which component stands on it. It replaces long <code>v-if</code> / <code>v-else-if</code> chains for tabs, wizard steps, dashboard widgets chosen from config, and "render the right block for this CMS item" pages.

The part interviewers dig into is the stagehand breaking the old set down. By default, a component that leaves the stage is **unmounted**, and anything the user typed into it is gone.

## 2. The Core Idea

📌 **Interview term: Dynamic component** — the built-in <code>&lt;component&gt;</code> element with an <code>is</code> binding. It renders whatever component (or element) <code>is</code> evaluates to, and re-renders when that value changes.

📌 **Interview term: resolveDynamicComponent** — the runtime helper the template compiler emits for <code>&lt;component :is&gt;</code>. It takes the <code>is</code> value and turns it into something the renderer can mount.

Compiling <code>&lt;component :is="current" plan="Pro" /&gt;</code> with <code>@vue/compiler-dom</code> 3.5.44 shows exactly this:

\`\`\`js
import { resolveDynamicComponent as _resolveDynamicComponent, openBlock as _openBlock, createBlock as _createBlock } from "vue"

export function render(_ctx, _cache) {
  return (_openBlock(), _createBlock(_resolveDynamicComponent(_ctx.current), { plan: "Pro" }))
}
\`\`\`

So the placeholder is not a wrapper component that sits in your tree. It disappears at compile time, and the attributes on it (<code>plan="Pro"</code>) become props of whatever <code>current</code> resolves to.

What can <code>:is</code> be?

| <code>:is</code> value | What renders | Typical use |
| :--- | :--- | :--- |
| A component object (imported or defined) | That component | <code>&lt;script setup&gt;</code> code: <code>shallowRef(ProfileTab)</code> |
| A string naming a **registered** component | The registered component | Global registration with <code>app.component("Card", Card)</code>, or the Options API <code>components</code> option |
| A string naming an HTML tag | A native element | Switch a wrapper between <code>section</code> and <code>article</code> |
| Any other string | A custom element with that tag name, no warning | Usually a bug |

📌 **Interview term: shallowRef** — a ref that tracks only reassignment of <code>.value</code>, not changes inside it. It is the right holder for a component object, because a component definition should never be made deeply reactive. See [shallowRef and shallowReactive](/interview-question/what-are-shallowref-and-shallowreactive).

## 3. What Happens on a Switch

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="Changing the is value unmounts the old component and mounts the new one unless KeepAlive caches it">
  <defs>
    <marker id="dyn-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="250" y="20" width="220" height="50" rx="10"/>
  <text class="d-text d-accent" x="360" y="50" text-anchor="middle">current = Billing</text>
  <path class="d-edge-accent" d="M 360 74 L 360 112" marker-end="url(#dyn-arrow)"/>
  <rect class="d-box" x="230" y="118" width="260" height="50" rx="10"/>
  <text class="d-text" x="360" y="140" text-anchor="middle">resolveDynamicComponent</text>
  <text class="d-sub" x="360" y="158" text-anchor="middle">new vnode type differs from old</text>
  <path class="d-edge" d="M 300 172 L 160 222" marker-end="url(#dyn-arrow)"/>
  <path class="d-edge-dashed" d="M 420 172 L 560 222" marker-end="url(#dyn-arrow)"/>
  <rect class="d-box-muted" x="30" y="228" width="260" height="56" rx="10"/>
  <text class="d-text" x="160" y="252" text-anchor="middle">Plain component</text>
  <text class="d-sub" x="160" y="272" text-anchor="middle">old unmounted, state destroyed</text>
  <rect class="d-box-muted" x="430" y="228" width="260" height="56" rx="10"/>
  <text class="d-text" x="560" y="252" text-anchor="middle">Inside KeepAlive</text>
  <text class="d-sub" x="560" y="272" text-anchor="middle">old deactivated, state cached</text>
</svg>

When <code>current</code> changes, the renderer sees a vnode of a different type in the same slot. Different type means "not the same thing", so it does not patch the old component; it tears it down and builds the new one. The dashed branch is what [KeepAlive](/interview-question/what-is-keep-alive-in-vue) changes: the old instance is moved into a hidden cache instead of being destroyed.

## 4. Verified: a tab switcher

The runnable example below defines two tabs inline (so the file is self-contained), keeps the current one in a <code>shallowRef</code>, and also uses <code>:is</code> with a plain tag name for the wrapper. The driver typed "Hello" into the Profile tab, switched to Billing, switched back, then toggled the wrapper tag:

\`\`\`
[Profile] mounted
[app] RENDERED: ProfileBillingToggle wrapperBio:
typed       : "Hello"
[Profile] unmounted
[Billing] mounted
after Billing: ProfileBillingToggle wrapperPlan: Pro
[Billing] unmounted
[Profile] mounted
back on Profile, input value: ""
wrapper tag : SECTION
[Profile] unmounted
[Profile] mounted
wrapper tag : ARTICLE
[Profile] unmounted
\`\`\`

Three things are proven here:

1. **State is lost on a switch.** "Hello" was gone when Profile came back, because Profile was unmounted and a fresh instance was mounted.
2. **The same props reach whichever component is current.** <code>plan="Pro"</code> is used by Billing; Profile does not declare it, so it falls through as an attribute: printing the panel's HTML while Profile was shown gave <code>&lt;label plan="Pro"&gt;Bio: &lt;input value=""&gt;&lt;/label&gt;</code> (see [fallthrough attributes](/interview-question/what-are-fallthrough-attributes-attrs)).
3. **Changing the outer element remounts everything inside it.** Toggling the wrapper from <code>section</code> to <code>article</code> unmounted and remounted Profile, even though Profile itself never changed. A new parent element means a new subtree.

## 5. Verified: the two quiet traps

Two mistakes do not throw, which is why they survive code review. This file holds a component in <code>ref()</code> and asks for a string name nobody registered:

\`\`\`vue
<script setup>
import { ref, defineComponent, h } from "vue";
const Card = defineComponent({ name: "Card", setup: () => () => h("b", "card body") });
const deep = ref(Card);          // pitfall 1: ref() makes the component object reactive
const name = ref("Card");        // pitfall 2: a string name that is not registered
</script>
<template>
  <component :is="deep" />
  <component :is="name" />
</template>
\`\`\`

Output on 3.5.44:

\`\`\`
[Vue warn]: Vue received a Component that was made a reactive object. This can lead to unnecessary performance overhead and should be avoided by marking the component with \`markRaw\` or using \`shallowRef\` instead of \`ref\`.
Component that was made reactive:  { name: 'Card', setup: [Function: setup] }
  at <App>
HTML: <b>card body</b><card></card>
\`\`\`

The first one renders correctly but warns. The second one renders an empty <code>&lt;card&gt;</code> element with **no warning at all**, because a string that is not a registered component is treated as a tag name. In <code>&lt;script setup&gt;</code>, imported components are not registered by name, so pass the object, not the string. When the same component *is* registered globally with <code>app.component("Card", Card)</code>, both <code>is="Card"</code> and <code>:is="'card'"</code> resolved to it in a separate run, while <code>is="Missing"</code> still rendered <code>&lt;missing&gt;&lt;/missing&gt;</code>.

📌 **Interview term: markRaw** — marks an object so Vue never makes it reactive. <code>markRaw(Component)</code> is the alternative to <code>shallowRef</code> when the component object sits inside a reactive structure such as a tabs array. See [markRaw and toRaw](/interview-question/what-do-markraw-and-toraw-do).

## 6. Dynamic Component vs. the Alternatives

| | <code>v-if</code> / <code>v-else-if</code> chain | <code>&lt;component :is&gt;</code> | Router <code>&lt;RouterView&gt;</code> |
| :--- | :--- | :--- | :--- |
| Who decides | Conditions in the template | A value in state | The URL |
| Adding a variant | Edit the template | Add an entry to a map or config | Add a route |
| State on switch | Lost (unmounted) | Lost unless in <code>&lt;KeepAlive&gt;</code> | Lost unless in <code>&lt;KeepAlive&gt;</code> |
| Different props per variant | Easy, each branch is explicit | All variants receive the same bindings | Route params and <code>props</code> option |
| Lazy loading | Wrap each in an async component | Put async components in the map | Lazy route components |

<code>&lt;RouterView&gt;</code> is in fact a dynamic component that reads its <code>is</code> from the current route; its slot gives you the resolved component so you can render it with <code>&lt;component :is="Component"&gt;</code> yourself (see [how Transition, KeepAlive and Suspense compose](/interview-question/how-do-transition-keepalive-and-suspense-compose-in-vue-3)).

## 7. Patterns That Work Well

- **A map from key to component.** <code>const tabs = { profile: ProfileTab, billing: BillingTab }</code>, then <code>:is="tabs[activeKey]"</code>. The active key is a plain string you can put in the URL or local storage; the map stays out of reactivity.
- **Config-driven pages.** A CMS returns blocks like <code>{ type: "hero", props: {...} }</code>; render <code>&lt;component v-for="b in blocks" :key="b.id" :is="registry[b.type]" v-bind="b.props" /&gt;</code>. <code>v-bind</code> with an object spreads each block's own props, which solves the "same bindings for every variant" limit.
- **Lazy variants.** Put [defineAsyncComponent](/interview-question/how-does-defineasynccomponent-work-with-loading-error-and-retry-in-2025) wrappers in the map so rarely used tabs are only downloaded when opened. See [lazy-loading routes and components](/interview-question/how-do-you-lazy-load-routes-and-components-in-vue).
- **Keep state where it should survive.** Either wrap in <code>&lt;KeepAlive&gt;</code>, or lift the state out of the tab into a parent or a store so the tab can be destroyed freely.

📌 **Interview term: is with the vue: prefix** — when a template is written directly in an HTML page (an in-DOM template), the browser parses it before Vue does and some elements, such as <code>&lt;tr&gt;</code> inside <code>&lt;table&gt;</code>, cannot hold a custom tag. Writing <code>&lt;tr is="vue:my-row"&gt;</code> tells Vue to render a component there. In SFCs this restriction does not apply.

## 8. Common Pitfalls

- **Storing the component in <code>ref()</code>.** It works but warns and wraps the definition in a reactive proxy. Use <code>shallowRef</code> or <code>markRaw</code>.
- **Passing a string in <code>&lt;script setup&gt;</code>.** Imported components are not registered by name, so <code>:is="'ProfileTab'"</code> renders an empty <code>&lt;profiletab&gt;</code> element without a warning.
- **Expecting state to survive a switch.** It does not; each switch unmounts and mounts. Add [KeepAlive](/interview-question/what-is-keep-alive-in-vue) or lift the state.
- **Changing the wrapper element or <code>key</code> by accident.** A new parent element or a new <code>key</code> remounts the whole subtree, as the <code>section</code> to <code>article</code> toggle showed.
- **Giving every variant the same props.** Components that do not declare a prop receive it as an attribute on their root element, which can leak odd attributes into the DOM. Use <code>v-bind="propsFor[key]"</code>.
- **Listening for an event only one variant emits.** Listeners on <code>&lt;component&gt;</code> attach to whichever component is current. A variant with two root nodes that does not declare the event logged "Extraneous non-emits event listeners (saved) were passed to component but could not be automatically inherited because component renders fragment or text root nodes." See [why declare emits](/interview-question/why-declare-emits-and-can-you-validate-them).

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;component :is&gt;</code> renders whichever component a piece of state points to, and re-renders when that state changes."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Under the hood:</strong> <span style="color:#f0e2c8;">"The compiler turns it into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">resolveDynamicComponent(value)</code>, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">is</code> can be a component object, a registered name, or a plain HTML tag."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The state rule:</strong> <span style="color:#f0e2c8;">"Switching unmounts the old component and mounts the new one, so local state is lost unless I wrap it in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;KeepAlive&gt;</code> or lift the state out."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The details I watch:</strong> <span style="color:#f0e2c8;">"I hold the component in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shallowRef</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">markRaw</code> it, because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ref()</code> makes it reactive and Vue warns. In <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;script setup&gt;</code> I pass the imported object, not a string."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Where I use it:</strong> <span style="color:#f0e2c8;">"Tabs, wizard steps and config-driven pages: a map from key to component, often with async components so rare variants load on demand."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if you pass a string that is not a registered component?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is treated as an element name, so you get an empty custom element such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;card&gt;&lt;/card&gt;</code> and no warning. That is why passing the component object is safer in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;script setup&gt;</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you pass different props to each variant?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep a per-variant props object and spread it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-bind="propsFor[key]"</code>. Otherwise every variant receives the same bindings, and the ones that do not declare a prop get it as a fallthrough attribute.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does Vue warn when the component is in a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ref</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ref()</code> converts objects deeply into reactive proxies, so the whole component definition would be tracked for no benefit. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shallowRef</code> only tracks reassignment, which is all a switch needs.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&lt;RouterView&gt;</code> related?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. It is a dynamic component whose <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">is</code> comes from the matched route, and its slot exposes the resolved component so you can render it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;component :is="Component"&gt;</code> inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;Transition&gt;</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;KeepAlive&gt;</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you keep a heavy tab from slowing the first load?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Put a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineAsyncComponent(() =&gt; import("./HeavyTab.vue"))</code> in the map. The bundler splits it into its own chunk and it is only fetched the first time that tab is shown.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Dynamic component** | <code>&lt;component :is&gt;</code>: render whatever <code>is</code> points to |
| **resolveDynamicComponent** | Compiler-emitted helper that turns the <code>is</code> value into something mountable |
| **shallowRef** | A ref that tracks only <code>.value</code> reassignment; the right holder for a component |
| **markRaw** | Marks an object so Vue never makes it reactive |
| **Registered component** | One added by name with <code>app.component</code> or the <code>components</code> option |
| **is="vue:..."** | In-DOM template escape hatch to render a component on a native element |
| **KeepAlive** | Built-in that caches inactive component instances instead of destroying them |

---
**Conclusion:** <code>&lt;component :is&gt;</code> is a compile-time placeholder that becomes <code>resolveDynamicComponent(value)</code>, so the value can be a component object, a registered name or a plain tag. The verified run showed the costs that come with that flexibility: switching unmounts the old component and drops its state, changing the wrapper remounts everything inside it, and two common mistakes (a reactive component object and an unregistered string) are silent or only warn. Hold components in <code>shallowRef</code>, pass objects rather than names in <code>&lt;script setup&gt;</code>, and reach for <code>&lt;KeepAlive&gt;</code> when a switch must preserve state.`,
    examples: [
      {
        label: "Tab switcher with <component :is>, a shallowRef and a dynamic wrapper tag",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { ref, shallowRef, defineComponent, h, onMounted, onUnmounted } from "vue";

// Three tab bodies, defined inline so this file is self-contained.
const Profile = defineComponent({
  name: "Profile",
  setup() {
    const draft = ref("");
    onMounted(() => console.log("[Profile] mounted"));
    onUnmounted(() => console.log("[Profile] unmounted"));
    return () =>
      h("label", ["Bio: ", h("input", { value: draft.value, onInput: (e) => (draft.value = e.target.value) })]);
  },
});
const Billing = defineComponent({
  name: "Billing",
  props: { plan: String },
  setup(props) {
    onMounted(() => console.log("[Billing] mounted"));
    onUnmounted(() => console.log("[Billing] unmounted"));
    return () => h("p", \`Plan: \${props.plan}\`);
  },
});

const tabs = { Profile, Billing };
// shallowRef: hold the component object itself, do not make it deeply reactive.
const current = shallowRef(Profile);
// :is also accepts a plain HTML tag name.
const wrapper = ref("section");
</script>

<template>
  <nav>
    <button v-for="(comp, name) in tabs" :key="name" @click="current = comp">{{ name }}</button>
    <button @click="wrapper = wrapper === 'section' ? 'article' : 'section'">Toggle wrapper</button>
  </nav>
  <component :is="wrapper" class="panel">
    <component :is="current" plan="Pro" />
  </component>
</template>`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is keep-alive in Vue?",
    seoDescription:
      "<KeepAlive> caches inactive component instances so state survives a switch. include, exclude, max, onActivated and the traps, verified on Vue 3.5.",
    description: `**Question presented to candidate:**
"Users complain that when they go from the inbox to a draft and back, the inbox loses its scroll position and the filter they typed. Someone suggested wrapping the view in \`<KeepAlive>\`. What does that actually do, and what would you watch out for?"

**What a strong answer should cover:**
- \`<KeepAlive>\` wraps a dynamic child and **caches the component instance** when it is switched away, instead of unmounting it; its state and DOM are kept off-screen.
- Cached components get **\`onActivated\` / \`onDeactivated\`** instead of mount and unmount on each switch; \`onActivated\` also runs on the first mount.
- **\`include\` / \`exclude\`** match the component's \`name\` option (inferred from the file name for \`<script setup>\` SFCs); **\`max\`** caps the cache and evicts the least recently used instance.
- It needs **exactly one direct component child**, typically \`<component :is>\` or the slot of \`<RouterView>\`.
- Cached instances keep their watchers, timers and memory alive, so cleanup and refetching belong in the activation hooks.

**Clarifying questions expected:**
- "Should every view be cached, or only the expensive ones?"
- "When a cached view comes back, should it refresh its data or show the old snapshot?"

**Code / implementation expected:** Yes — a dynamic tab set inside \`<KeepAlive>\` with \`include\`/\`exclude\` or \`max\`, and the activation hooks.`,
    answer: `**Target Audience:** Developers who know components and [dynamic components](/interview-question/how-do-dynamic-components-work) and want to keep state across switches.
**Difficulty:** Medium

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. Every hook log and warning below was produced by compiling and mounting the code on Vue 3.5.44 in jsdom with the repo's <code>verify-vue-example.mjs</code> harness.

## 1. Why This Even Matters — A Story First

A restaurant has one table by the window and several groups who want it during the evening. The normal rule is brutal: when a group leaves the table, the waiter clears everything, and if they come back they start from an empty table.

Now the manager adds a coat check. When a group steps away, the waiter boxes up their plates, drinks and half-finished crossword, labels the box, and shelves it. When they return, the box comes off the shelf and the table looks exactly as they left it. The shelf has room for only a few boxes, so the box nobody has touched for the longest time gets thrown out first.

<code>&lt;KeepAlive&gt;</code> is that coat check. Without it, a component that is switched out is destroyed. With it, the component instance, its reactive state and its DOM are put on a shelf and brought back later.

## 2. The Core Idea

📌 **Interview term: KeepAlive** — a built-in component that wraps one dynamic child and caches inactive instances instead of unmounting them. In templates you write <code>&lt;KeepAlive&gt;</code> or <code>&lt;keep-alive&gt;</code>.

📌 **Interview term: Activated / deactivated** — the two lifecycle states of a cached component. When it leaves the screen it is *deactivated* (its DOM is moved into a detached container, nothing is destroyed). When it returns it is *activated* (the DOM is moved back). The hooks are <code>onActivated</code> and <code>onDeactivated</code> (or <code>activated</code> / <code>deactivated</code> in the Options API). See [Vue lifecycle hooks](/interview-question/what-are-vue-lifecycle-hooks).

📌 **Interview term: include / exclude** — props that decide which components get cached. They accept a comma-separated string, a RegExp or an array, and match against the component's <code>name</code> option. A <code>&lt;script setup&gt;</code> SFC infers its name from the file name (since 3.2.34, according to the Vue docs), so <code>InboxView.vue</code> matches <code>include="InboxView"</code>.

📌 **Interview term: max** — the maximum number of cached instances. When a new one would exceed it, the **least recently used** (LRU) instance is evicted and truly unmounted.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 260" role="img" aria-label="KeepAlive moves the leaving instance into a cache and moves a cached instance back on return">
  <defs>
    <marker id="ka-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="150" y="30" text-anchor="middle">On screen</text>
  <rect class="d-box-accent" x="40" y="50" width="220" height="60" rx="10"/>
  <text class="d-text d-accent" x="150" y="76" text-anchor="middle">Drafts</text>
  <text class="d-sub" x="150" y="96" text-anchor="middle">active instance</text>
  <text class="d-text" x="560" y="30" text-anchor="middle">KeepAlive cache (max 2)</text>
  <rect class="d-box-muted" x="430" y="50" width="260" height="170" rx="12"/>
  <rect class="d-box" x="460" y="74" width="200" height="50" rx="8"/>
  <text class="d-text" x="560" y="96" text-anchor="middle">Inbox</text>
  <text class="d-sub" x="560" y="114" text-anchor="middle">deactivated, count 3 kept</text>
  <rect class="d-box" x="460" y="148" width="200" height="50" rx="8"/>
  <text class="d-text" x="560" y="170" text-anchor="middle">Drafts</text>
  <text class="d-sub" x="560" y="188" text-anchor="middle">most recently used</text>
  <path class="d-edge-accent" d="M 264 70 L 452 92" marker-end="url(#ka-arrow)"/>
  <text class="d-sub" x="345" y="62" text-anchor="middle">deactivate</text>
  <path class="d-edge-dashed" d="M 452 112 L 264 96" marker-end="url(#ka-arrow)"/>
  <text class="d-sub" x="345" y="140" text-anchor="middle">activate</text>
</svg>

The cache holds instances, not snapshots. A deactivated Inbox is the same live object with the same refs, so its counter, form inputs and scroll container survive; nothing is serialised or re-created.

## 3. Verified: caching, exclude and the hook order

The runnable example has three tabs built by a small factory, each with its own counter and all four hooks logging. It is wrapped in <code>&lt;KeepAlive :max="2" exclude="Search"&gt;</code>. The driver clicked Inbox three times, then visited Drafts, Inbox, Search, Inbox, Search:

\`\`\`
  Inbox: mounted
  Inbox: activated
[app] RENDERED: InboxDraftsSearchInbox count 0
shown: Inbox count 3
-> Drafts
  Inbox: deactivated
  Drafts: mounted
  Drafts: activated
-> Inbox
  Drafts: deactivated
  Inbox: activated
shown: Inbox count 3
-> Search
  Inbox: deactivated
  Search: mounted
-> Inbox
  Search: unmounted
  Inbox: activated
-> Search
  Inbox: deactivated
  Search: mounted
shown: Search count 0
  Inbox: unmounted
  Drafts: unmounted
  Search: unmounted
\`\`\`

What this proves:

- **<code>onActivated</code> runs on the first mount too**, right after <code>onMounted</code>. Code that should run "every time this view is shown" belongs in <code>onActivated</code> alone.
- **Returning to a cached tab does not mount it again.** Inbox came back with <code>count 3</code> and only an <code>activated</code> log.
- **An excluded component behaves as if KeepAlive were not there.** Search was mounted and unmounted on every visit and never got activation hooks.
- **Unmounting the app destroys the cache**, so every cached instance finally gets <code>unmounted</code>.

## 4. Verified: max evicts the least recently used

Same tabs, <code>exclude</code> removed, <code>:max="2"</code> kept. Inbox was clicked once, then the driver went Drafts, Search, Inbox:

\`\`\`
  Inbox: mounted
  Inbox: activated
[app] RENDERED: InboxDraftsSearchInbox count 0
-> Drafts
  Inbox: deactivated
  Drafts: mounted
  Drafts: activated
-> Search
  Inbox: unmounted
  Drafts: deactivated
  Search: mounted
  Search: activated
-> Inbox
  Drafts: unmounted
  Search: deactivated
  Inbox: mounted
  Inbox: activated
shown: Inbox count 0
\`\`\`

Opening Search needed a third slot, so the least recently used instance (Inbox) was really unmounted. When Inbox came back it was mounted fresh with <code>count 0</code>, and that in turn evicted Drafts. <code>max</code> is a memory guard, not a guarantee that a given view stays cached.

## 5. Verified: two ways it silently does nothing

**An unnamed component never matches <code>include</code>.** A component defined with <code>defineComponent</code> and no <code>name</code>, wrapped in <code>&lt;KeepAlive include="Anon"&gt;</code>, was switched away and back after one click:

\`\`\`
Anon mounted
[app] RENDERED: switchanon 0
Anon mounted
shown: anon 0
\`\`\`

It was mounted twice and lost its click, with no warning. With <code>&lt;script setup&gt;</code> SFCs the name comes from the file name; for inline or render-function components, set <code>name</code> yourself (or use [defineOptions](/interview-question/what-do-defineoptions-and-defineslots-do-in-script-setup) in a <code>&lt;script setup&gt;</code> file whose name does not match).

**More than one child is a compile error.** <code>&lt;KeepAlive&gt;&lt;p&gt;one&lt;/p&gt;&lt;p&gt;two&lt;/p&gt;&lt;/KeepAlive&gt;</code> failed to compile:

\`\`\`
SFC COMPILE FAILED:
<KeepAlive> expects exactly one child component.
\`\`\`

## 6. KeepAlive vs. Other Ways to Keep State

| Approach | What survives | Memory cost | Good for |
| :--- | :--- | :--- | :--- |
| <code>v-show</code> | Everything; the component is just hidden | All variants mounted up front | Two or three cheap panels ([v-if vs v-show](/interview-question/what-is-the-difference-between-v-if-and-v-show)) |
| <code>&lt;KeepAlive&gt;</code> | Instance, refs, DOM, scroll inside the component | One instance per cached view, capped by <code>max</code> | Tabs and routes users bounce between |
| State in a store or parent | Only the data you moved | Just that data | Filters and drafts that must survive a reload or be shared ([Pinia](/interview-question/what-is-pinia-and-why-use-it)) |
| URL query params | Only what you serialise | None | Filters and pagination that should be shareable |

KeepAlive is the cheapest to adopt (one wrapper) but the hardest to reason about at scale, because cached views keep running in the background. Many teams combine it: cache the two or three heaviest views and keep durable state in a store.

## 7. With the Router

The router renders views through <code>&lt;RouterView&gt;</code>, so you cache them through its slot:

\`\`\`vue
<RouterView v-slot="{ Component }">
  <KeepAlive :include="['InboxView', 'ReportsView']" :max="5">
    <component :is="Component" />
  </KeepAlive>
</RouterView>
\`\`\`

Two routes that share one component (for example <code>/users/1</code> and <code>/users/2</code>) reuse the same cached instance unless you add a key such as <code>:key="route.fullPath"</code> on <code>&lt;component&gt;</code>; with a key, each URL gets its own cache entry. Checked with vue-router 5.4.0: after one click on <code>/users/1</code>, the unkeyed version showed <code>notes 1</code> on <code>/users/2</code> (same instance, mounted once), while the keyed version mounted a second instance showing <code>notes 0</code> on <code>/users/2</code> and still showed <code>notes 1</code> back on <code>/users/1</code>. Combining this with transitions and [Suspense](/interview-question/what-is-suspense-in-vue) has a required nesting order, covered in [how Transition, KeepAlive and Suspense compose](/interview-question/how-do-transition-keepalive-and-suspense-compose-in-vue-3).

## 8. Common Pitfalls

- **Putting refresh logic in <code>onMounted</code>.** A cached view mounts once. Refetch or re-read data in <code>onActivated</code>, which runs on the first show and every return.
- **Leaving timers and listeners running.** A deactivated view is alive: its intervals, sockets and <code>window</code> listeners keep firing. Pause them in <code>onDeactivated</code> and resume in <code>onActivated</code>.
- **<code>include</code> names that match nothing.** The match is on the component <code>name</code>. A typo or an unnamed inline component means nothing is cached, silently.
- **Unbounded caches.** Without <code>max</code>, every distinct view visited stays in memory for the session. Set a limit for route-level caching.
- **Expecting a fresh form after save.** Users return to the exact old state, including a stale success message. Reset what should reset in <code>onActivated</code>, or exclude that view.
- **Wrapping more than one child.** <code>&lt;KeepAlive&gt;</code> needs exactly one direct component child; use <code>&lt;component :is&gt;</code> or a single <code>v-if</code> / <code>v-else</code> chain.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;KeepAlive&gt;</code> caches a dynamic child's instance when it is switched away, so its state and DOM come back unchanged instead of being rebuilt."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Lifecycle:</strong> <span style="color:#f0e2c8;">"Cached components are deactivated and activated rather than unmounted and mounted, with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onActivated</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onDeactivated</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onActivated</code> also fires on the first show."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Control:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">include</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">exclude</code> match the component name, which <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;script setup&gt;</code> infers from the file name, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max</code> caps the cache with least-recently-used eviction."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Where it goes:</strong> <span style="color:#f0e2c8;">"It wraps exactly one component child, usually <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;component :is&gt;</code> or the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Component</code> from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;RouterView v-slot&gt;</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trade-off:</strong> <span style="color:#f0e2c8;">"Cached views stay alive in memory, so I pause timers in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onDeactivated</code>, refresh data in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onActivated</code>, and only cache the views users actually bounce between."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">onMounted</code> run again when a cached view comes back?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It ran once, when the instance was first created. On return only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onActivated</code> runs, which is why refresh logic belongs there.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why might <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">include</code> cache nothing?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It matches the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">name</code> option. An inline component without a name, or a file renamed without updating the list, never matches, and Vue does not warn. I verified that an unnamed component under <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">include</code> was remounted and lost its state.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens when the cache is full?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The least recently used instance is unmounted for real, with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onUnmounted</code>. If the user returns to it, it mounts fresh with default state.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is this different from <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">v-show</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-show</code> mounts every variant up front and just hides them. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;KeepAlive&gt;</code> mounts lazily on first visit and caches only what was visited, within <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you cache two URLs that use the same component separately?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Give <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;component :is="Component"&gt;</code> a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:key="route.fullPath"</code>. Without a key, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/users/1</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/users/2</code> share one cached instance.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **KeepAlive** | Built-in that caches inactive component instances instead of unmounting them |
| **Activated** | A cached instance moved back on screen; <code>onActivated</code> runs |
| **Deactivated** | An instance moved off screen into the cache; <code>onDeactivated</code> runs |
| **include / exclude** | Which components to cache, matched on the <code>name</code> option |
| **max** | Cache size limit; the least recently used instance is evicted |
| **LRU** | Least recently used: the eviction rule <code>max</code> follows |
| **Component name** | The <code>name</code> option, inferred from the file name in <code>&lt;script setup&gt;</code> SFCs |

---
**Conclusion:** <code>&lt;KeepAlive&gt;</code> turns "switch away" from destroy into deactivate: the instance, its state and its DOM sit in a cache until the user returns. The verified runs showed the details that matter in practice: <code>onActivated</code> fires on first mount and every return, excluded or unnamed components are simply not cached, <code>max</code> evicts the least recently used instance for real, and the wrapper needs exactly one component child. Use it for the few views users bounce between, cap it with <code>max</code>, and move refresh and cleanup into the activation hooks.`,
    examples: [
      {
        label: "KeepAlive with max and exclude, logging every lifecycle hook",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { ref, shallowRef, defineComponent, h, onMounted, onUnmounted, onActivated, onDeactivated } from "vue";

// A factory so each tab is its own named component with its own counter.
const makeTab = (name) =>
  defineComponent({
    name, // <KeepAlive include/exclude> matches on this name
    setup() {
      const count = ref(0);
      onMounted(() => console.log(\`  \${name}: mounted\`));
      onActivated(() => console.log(\`  \${name}: activated\`));
      onDeactivated(() => console.log(\`  \${name}: deactivated\`));
      onUnmounted(() => console.log(\`  \${name}: unmounted\`));
      return () => h("button", { class: "inc", onClick: () => count.value++ }, \`\${name} count \${count.value}\`);
    },
  });

const tabs = { Inbox: makeTab("Inbox"), Drafts: makeTab("Drafts"), Search: makeTab("Search") };
const current = shallowRef(tabs.Inbox);
</script>

<template>
  <nav>
    <button v-for="(comp, name) in tabs" :key="name" class="tab" @click="current = comp">{{ name }}</button>
  </nav>
  <!-- Cache at most 2 instances, and never cache Search -->
  <KeepAlive :max="2" exclude="Search">
    <component :is="current" />
  </KeepAlive>
</template>`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do Transition and TransitionGroup work?",
    seoDescription:
      "How Vue's <Transition> applies enter/leave classes and JS hooks, and how <TransitionGroup> animates lists with FLIP, checked in jsdom and Chromium.",
    description: `**Question presented to candidate:**
"Design wants the notification panel to fade in and out, and items in the to-do list to slide when they are added, removed or reordered. Walk me through how Vue's \`<Transition>\` and \`<TransitionGroup>\` make that happen, and what you would check if an animation does not play."

**What a strong answer should cover:**
- \`<Transition>\` animates **one element or component entering or leaving** (via \`v-if\`, \`v-show\`, a dynamic component or a changing \`key\`).
- The **six classes** \`v-enter-from / -active / -to\` and \`v-leave-from / -active / -to\`, prefixed by \`name\`, and the timing: \`-from\` is applied first and swapped for \`-to\` on the next frame.
- Vue detects the end from the element's computed **\`transitionend\` / \`animationend\`** timing, or from an explicit \`:duration\`; JavaScript hooks (\`@enter\`, \`@leave\` with a \`done\` callback) are the alternative.
- **\`mode="out-in"\`** sequences two elements so they do not overlap.
- \`<TransitionGroup>\` handles **lists**: each child needs a \`key\`, it can render a wrapper with \`tag\`, and it animates moves with the \`v-move\` class using the **FLIP** technique.
- The animation itself is CSS run by the browser; Vue only toggles classes and removes the element at the right time.

**Clarifying questions expected:**
- "Is this one element appearing and disappearing, or a list whose items reorder?"
- "Do we need to respect \`prefers-reduced-motion\`?"

**Code / implementation expected:** Yes — a \`<Transition>\` with the CSS classes, and a \`<TransitionGroup>\` list with enter, leave and move styles.`,
    answer: `**Target Audience:** Developers comfortable with Vue templates and basic CSS transitions who want to know exactly what Vue does during an animation.
**Difficulty:** Medium

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. The class sequences in section 4 were recorded on Vue 3.5.44 in jsdom with the repo's <code>verify-vue-example.mjs</code> harness. jsdom runs no CSS animations and does no layout, so the opacity values and the list-move behaviour in section 5 were recorded separately in headless Chromium against a real Vite 8.3.4 build. Section 6 spells out which claims each environment can and cannot back up.

## 1. Why This Even Matters — A Story First

Think of a stage manager calling cues. She does not act, sing or move the scenery herself. She says "lights to half" at the right moment, waits until the dimming is done, then says "curtain". Her whole job is timing: which instruction, in what order, and when the previous effect has finished.

<code>&lt;Transition&gt;</code> is that stage manager. The browser does the actual animation, through CSS you write. Vue's job is to add the right class at the right moment, wait until the CSS says it is finished, and only then remove the element from the page. Without that timing, an element removed by <code>v-if</code> disappears instantly, because there is nothing left on the page to animate.

## 2. The Core Idea

📌 **Interview term: Transition** — a built-in wrapper component for a **single** element or component. When its child is inserted or removed (by <code>v-if</code>, <code>v-show</code>, a [dynamic component](/interview-question/how-do-dynamic-components-work) or a change of <code>key</code>), Vue runs an enter or leave sequence on it.

📌 **Interview term: Transition classes** — six classes Vue adds and removes. With <code>name="fade"</code> they are:

| Phase | Added | Removed | Use it for |
| :--- | :--- | :--- | :--- |
| <code>fade-enter-from</code> | Before the element is inserted | One frame after insertion | Starting state (for example <code>opacity: 0</code>) |
| <code>fade-enter-active</code> | Before insertion | When the transition ends | The <code>transition</code> property itself |
| <code>fade-enter-to</code> | One frame after insertion | When the transition ends | End state, often left empty |
| <code>fade-leave-from</code> | When leaving starts | One frame later | Starting state of the leave |
| <code>fade-leave-active</code> | When leaving starts | When it ends (then the element is removed) | The <code>transition</code> property |
| <code>fade-leave-to</code> | One frame after leaving starts | When it ends | Final state (<code>opacity: 0</code>) |

Without a <code>name</code>, the prefix is <code>v-</code>.

📌 **Interview term: Transition end detection** — Vue reads the element's computed <code>transition-duration</code>, <code>transition-delay</code> and animation timing after the <code>-active</code> class is applied and waits for <code>transitionend</code> / <code>animationend</code>. An explicit <code>:duration="200"</code> (or <code>{ enter, leave }</code>) replaces that with a timer, which is useful when nested elements have different timings.

📌 **Interview term: JavaScript hooks** — <code>@before-enter</code>, <code>@enter</code>, <code>@after-enter</code>, <code>@enter-cancelled</code> and the leave equivalents. <code>@enter(el, done)</code> and <code>@leave(el, done)</code> receive a <code>done</code> callback for animations driven from JavaScript (Web Animations API, GSAP). Add <code>:css="false"</code> to tell Vue to skip CSS detection entirely.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 220" role="img" aria-label="Enter sequence: enter-from and enter-active, then enter-to on the next frame, then classes removed when the transition ends">
  <defs>
    <marker id="tr-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="40" width="200" height="70" rx="10"/>
  <text class="d-text" x="120" y="66" text-anchor="middle">frame 0: inserted</text>
  <text class="d-sub" x="120" y="88" text-anchor="middle">enter-from + enter-active</text>
  <path class="d-edge-accent" d="M 224 75 L 262 75" marker-end="url(#tr-arrow)"/>
  <rect class="d-box-accent" x="268" y="40" width="200" height="70" rx="10"/>
  <text class="d-text d-accent" x="368" y="66" text-anchor="middle">frame 1</text>
  <text class="d-sub" x="368" y="88" text-anchor="middle">enter-active + enter-to</text>
  <path class="d-edge-accent" d="M 472 75 L 510 75" marker-end="url(#tr-arrow)"/>
  <rect class="d-box" x="516" y="40" width="190" height="70" rx="10"/>
  <text class="d-text" x="611" y="66" text-anchor="middle">transitionend</text>
  <text class="d-sub" x="611" y="88" text-anchor="middle">classes removed</text>
  <rect class="d-box-muted" x="120" y="150" width="480" height="50" rx="10"/>
  <text class="d-sub" x="360" y="180" text-anchor="middle">CSS interpolates opacity between frame 1 and the end</text>
</svg>

The swap from <code>-from</code> to <code>-to</code> on the next frame is the whole trick: the browser only animates a property that changes after the element has been painted once with its starting value.

## 3. TransitionGroup and FLIP

📌 **Interview term: TransitionGroup** — the list version. Every child must have a unique <code>key</code>. Each item that is added or removed gets the same enter / leave classes as in <code>&lt;Transition&gt;</code>. By default it renders no wrapper; <code>tag="ul"</code> makes it render a real element. <code>mode</code> is not supported, because list items are not swapped one for one.

📌 **Interview term: FLIP (move transitions)** — First, Last, Invert, Play. When items change position, <code>&lt;TransitionGroup&gt;</code> records each item's position before the update (First), lets the DOM update (Last), applies a <code>transform</code> that puts each item back where it was (Invert), then adds the <code>v-move</code> class (for example <code>list-move</code>) and removes the transform so CSS slides it to its new place (Play). It relies on <code>getBoundingClientRect()</code>, which is real layout, so it only does anything in a browser.

A common companion rule is <code>.list-leave-active { position: absolute; }</code>, which takes the leaving item out of the flow so its neighbours can start moving immediately. Reordering by [keys](/interview-question/why-is-the-key-attribute-important-in-v-for) is what lets Vue know an item moved rather than changed.

## 4. Verified in jsdom: what Vue does with classes

The runnable example logs every JavaScript hook with the element's class at that moment, and a <code>MutationObserver</code> prints each distinct class value with the time since the click. It uses <code>:duration="200"</code>, so Vue times the transition itself:

\`\`\`
ENTER
  hook before-enter class="box"
  hook enter        class="box fade-enter-from fade-enter-active"
  +  9ms class="box fade-enter-from fade-enter-active"
  + 42ms class="box fade-enter-active fade-enter-to"
  hook after-enter  class="box"
  +243ms class="box"
LEAVE
  hook before-leave class="box"
  hook leave        class="box fade-leave-from fade-leave-active"
  +  3ms class="box fade-leave-from fade-leave-active"
  + 35ms class="box fade-leave-active fade-leave-to"
  hook after-leave  class="box"
  +237ms (removed from DOM)
\`\`\`

What this establishes about Vue itself:

- **Order of operations.** <code>before-enter</code> runs before any transition class is present; by the time <code>enter</code> runs, <code>-from</code> and <code>-active</code> are both on the element.
- **The frame swap.** <code>-from</code> is replaced by <code>-to</code> one animation frame later (jsdom simulates frames, so the exact millisecond values are not meaningful).
- **Removal waits for the end.** On leave, the element stayed in the DOM until the 200 ms duration had elapsed, and only then was removed and <code>after-leave</code> called.

Without <code>:duration</code>, the same file in jsdom finished the leave and removed the element within a few tens of milliseconds, before <code>fade-leave-to</code> was ever observed. The harness drops <code>&lt;style&gt;</code>, so jsdom reports no transition duration and Vue has nothing to wait for. That is exactly how an animation "does not play" in a real app whose CSS class names do not match the <code>name</code>.

The <code>&lt;TransitionGroup&gt;</code> list example (with <code>:duration="300"</code>) gave this in jsdom:

\`\`\`
wrapper: <ul>
after add, +60ms : Milk, Item 4[list-enter-from list-enter-active], Eggs, Bread
after add, +460ms: Milk, Item 4, Eggs, Bread
remove Milk +60ms: Milk[list-leave-active list-leave-to], Item 4, Eggs, Bread
remove Milk done : Item 4, Eggs, Bread
reverse +60ms    : Bread, Eggs, Item 4
\`\`\`

Enter and leave classes are applied per item, and the leaving item stays in the list until its transition ends. The reverse shows **no <code>list-move</code> class at all**: in jsdom every element measures as a zero-size box at the origin, so FLIP finds that nothing moved.

## 5. Verified in Chromium: the actual animation

The same two components (with timing taken from the CSS, no <code>:duration</code>) were built with Vite 8.3.4, served with <code>vite preview</code> and driven by Playwright in headless Chromium, sampling <code>getComputedStyle</code>:

\`\`\`
enter ~0ms: class="box fade-enter-from fade-enter-active" opacity=0.00 transform=none
enter ~100ms: class="box fade-enter-active fade-enter-to" opacity=0.80 transform=none
enter ~300ms: class="box" opacity=1.00 transform=none
leave ~100ms: class="box fade-leave-active fade-leave-to" opacity=0.42 transform=none
leave ~300ms: (not in DOM)
reverse first li ~20ms: class="list-move" opacity=1.00 transform=matrix(1, 0, 0, 1, 0, 36)
reverse first li ~170ms: class="list-move" opacity=1.00 transform=matrix(1, 0, 0, 1, 0, 5.3113)
reverse first li ~470ms: class="" opacity=1.00 transform=none
\`\`\`

Here the browser really interpolated opacity (0.00, 0.80, 1.00 on enter; 0.42 midway through leave), and Vue removed the element only after the CSS transition ended. On reverse, the first item got <code>list-move</code> and a <code>translateY(36px)</code> that shrank to about 5 px and then cleared: that is FLIP's "invert, then play" captured mid-flight.

## 6. What jsdom Can and Cannot Show

| Question | jsdom (component tests) | Real browser |
| :--- | :--- | :--- |
| Which classes are added, and in what order | Yes | Yes |
| Hook order and the <code>done</code> callback | Yes | Yes |
| Element kept until leave ends (with <code>:duration</code>) | Yes | Yes |
| Duration detected from CSS | No, styles are not applied by the harness and jsdom computes no transition timing | Yes |
| Interpolated opacity or transform values | No | Yes |
| <code>v-move</code> / FLIP reordering | No, there is no layout | Yes |
| Smoothness, dropped frames, <code>prefers-reduced-motion</code> | No | Yes, with browser tooling |

In unit tests (see [testing Vue components](/interview-question/how-do-you-test-vue-components-vitest-and-vue-test-utils)), Vue Test Utils replaces transitions with stubs by default (in 2.5.1 its <code>config.global.stubs</code> starts as <code>{ transition: true, "transition-group": true }</code>), so content appears and disappears immediately. Test that the right state is reached; leave animation timing to a browser-level test.

## 7. Transition vs. TransitionGroup

| | <code>&lt;Transition&gt;</code> | <code>&lt;TransitionGroup&gt;</code> |
| :--- | :--- | :--- |
| Children | Exactly one element or component | Any number, each with a unique <code>key</code> |
| Wrapper element | None | None by default, or <code>tag="ul"</code> |
| <code>mode</code> (<code>out-in</code>, <code>in-out</code>) | Yes | No |
| Move animation | No | Yes, <code>v-move</code> class via FLIP |
| Typical use | Modals, toasts, route changes, <code>v-if</code> panels | Lists, grids, sortable items |

## 8. Common Pitfalls

- **Class names that do not match <code>name</code>.** <code>name="fade"</code> needs <code>.fade-enter-active</code>, not <code>.v-enter-active</code>. With no match, Vue finds zero duration and finishes instantly.
- **Putting the <code>transition</code> property on the wrong class.** It belongs on <code>-active</code>, which is present for the whole phase; on <code>-from</code> it is removed after one frame.
- **Two children inside <code>&lt;Transition&gt;</code>.** Use <code>v-if</code> / <code>v-else</code> (only one is rendered at a time) or <code>&lt;TransitionGroup&gt;</code>. Swapping two elements without <code>mode="out-in"</code> makes them overlap: 30 ms into a 100 ms swap, jsdom had both A and B in the DOM without a mode, and only A with <code>out-in</code>.
- **Forgetting <code>done</code> in JS hooks with <code>:css="false"</code>.** Without a call to <code>done()</code>, Vue never knows the leave finished and the element is never removed.
- **Index keys in <code>&lt;TransitionGroup&gt;</code>.** With <code>:key="index"</code>, removing the first item looks to Vue like the last item left and the rest changed text. Use stable ids.
- **Expecting a component test to prove the animation.** jsdom shows the class choreography only; opacity, transforms and FLIP need a real browser, as the two runs above showed.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;Transition&gt;</code> times CSS animations for one element entering or leaving, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;TransitionGroup&gt;</code> does the same for each item of a keyed list."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The mechanism:</strong> <span style="color:#f0e2c8;">"Vue adds <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-enter-from</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-enter-active</code>, swaps <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-from</code> for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-to</code> on the next frame so the browser animates, and removes the classes when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">transitionend</code> fires or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:duration</code> elapses."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Leaving:</strong> <span style="color:#f0e2c8;">"On leave the element stays in the DOM until the transition ends, which is the only reason a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-if</code> removal can animate at all."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Lists:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;TransitionGroup&gt;</code> needs unique keys, can render a wrapper with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tag</code>, and animates reordering with the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-move</code> class using FLIP."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Testing:</strong> <span style="color:#f0e2c8;">"In jsdom I can assert class order and hooks, but not interpolation or FLIP, since there is no layout; that part I check in a real browser."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does my leave animation not play?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Usually the CSS class prefix does not match <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">name</code>, or the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">transition</code> property sits on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-from</code> instead of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-active</code>. Vue then measures zero duration and removes the element at once.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you use JavaScript hooks instead of CSS?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For animations a CSS transition cannot express, such as physics or a timeline library. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@enter(el, done)</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@leave(el, done)</code>, call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">done()</code> when finished, and set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:css="false"</code> so Vue skips CSS detection.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">mode="out-in"</code> solve?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Without it, the old and new elements are both in the DOM during a swap and overlap. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">out-in</code> waits for the old one to leave before the new one enters.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does the move animation work?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">FLIP: Vue records positions before the update, lets the DOM change, applies a transform that puts each item back, then adds <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-move</code> and removes the transform so CSS slides it. It needs real layout from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">getBoundingClientRect</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you respect reduced motion?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Wrap the transition CSS in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@media (prefers-reduced-motion: reduce)</code> override that sets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">transition: none</code>, or bind <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:css</code> from a matchMedia check. Vue still adds and removes the element correctly either way.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Transition** | Wrapper that runs enter and leave sequences on one child |
| **TransitionGroup** | List version; keyed children, optional wrapper <code>tag</code>, move animations |
| **-from / -active / -to** | Start state, whole-phase class, end state, for both enter and leave |
| **:duration** | Explicit timing that replaces CSS end detection |
| **JS hooks** | <code>@enter</code>, <code>@leave</code> and friends, with a <code>done</code> callback |
| **mode="out-in"** | Leave the old element first, then enter the new one |
| **FLIP** | First, Last, Invert, Play: how <code>v-move</code> animates position changes |

---
**Conclusion:** <code>&lt;Transition&gt;</code> and <code>&lt;TransitionGroup&gt;</code> do not animate anything themselves; they add and remove classes on a precise schedule, wait for the browser to report that the CSS transition ended (or for an explicit <code>:duration</code>), and only then remove the element. jsdom confirmed that schedule on Vue 3.5.44, and also showed its limits: without layout or computed CSS timing there is no interpolation and no FLIP. Headless Chromium filled that gap, showing opacity interpolating and <code>list-move</code> sliding items with a shrinking transform. Match the class names to <code>name</code>, put the <code>transition</code> property on <code>-active</code>, key list items by id, and test the animation itself in a browser.`,
    examples: [
      {
        label: "Transition with an explicit duration, logging every hook and class change",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { ref } from "vue";
const show = ref(false);
const log = (hook) => (el) => console.log(\`  hook \${hook.padEnd(12)} class="\${el.className}"\`);
</script>

<template>
  <button @click="show = !show">Toggle</button>
  <!-- duration given explicitly, so Vue times the transition itself -->
  <Transition name="fade" :duration="200"
    @before-enter="log('before-enter')($event)" @enter="log('enter')($event)" @after-enter="log('after-enter')($event)"
    @before-leave="log('before-leave')($event)" @leave="log('leave')($event)" @after-leave="log('after-leave')($event)">
    <p v-if="show" class="box">Hello</p>
  </Transition>
</template>

<style>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>`,
      },
      {
        label: "TransitionGroup list with enter, leave and move styles",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { ref } from "vue";
let nextId = 4;
const items = ref([{ id: 1, text: "Milk" }, { id: 2, text: "Eggs" }, { id: 3, text: "Bread" }]);
const add = () => items.value.splice(1, 0, { id: nextId++, text: \`Item \${nextId - 1}\` });
const remove = (id) => (items.value = items.value.filter((i) => i.id !== id));
const shuffle = () => (items.value = [...items.value].reverse());
</script>

<template>
  <button class="add" @click="add">Add</button>
  <button class="shuffle" @click="shuffle">Reverse</button>
  <!-- tag="ul": TransitionGroup renders a real element; every child needs a key -->
  <TransitionGroup name="list" tag="ul" :duration="300">
    <li v-for="item in items" :key="item.id" @click="remove(item.id)">{{ item.text }}</li>
  </TransitionGroup>
</template>

<style>
.list-enter-active, .list-leave-active { transition: all 0.3s ease; }
.list-enter-from, .list-leave-to { opacity: 0; transform: translateX(30px); }
.list-move { transition: transform 0.3s ease; }
.list-leave-active { position: absolute; }
</style>`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do <Transition>, <KeepAlive> and <Suspense> compose in Vue 3?",
    seoDescription:
      "The nesting order for Transition, KeepAlive and Suspense around RouterView, why it matters, and what silently breaks when it is wrong. Verified on Vue 3.5.",
    description: `**Question presented to candidate:**
"Our app animates route changes, caches the dashboard so its filters survive, and some pages load data with an async \`setup()\`. Show me how you would nest \`<Transition>\`, \`<KeepAlive>\` and \`<Suspense>\` around \`<RouterView>\`, and explain why the order matters."

**What a strong answer should cover:**
- The documented order, outside in: **\`<RouterView v-slot>\` → \`<Transition>\` → \`<KeepAlive>\` → \`<Suspense>\` → \`<component :is>\`**.
- Why: \`<Transition>\` animates whatever single child it has; \`<KeepAlive>\` must sit directly around the thing whose instances it caches; \`<Suspense>\` waits for the async component inside it.
- \`mode="out-in"\` on the transition so the old page leaves before the new one enters.
- After its first resolve, \`<Suspense>\` **keeps showing the old content** while the next page's async setup runs (unless \`timeout\` is set), so the fallback is mostly a first-load concern.
- A cached page coming back resolves immediately and runs \`onActivated\`, not a new \`setup()\`.
- A wrong order does not throw: it just quietly loses caching or animations.
- \`<Suspense>\` is still marked **experimental** in Vue 3.5.

**Clarifying questions expected:**
- "Which pages need caching, and which need to refetch on every visit?"
- "Should a slow page show a spinner, or keep the old page until the new one is ready?"

**Code / implementation expected:** Yes — the nested \`<RouterView>\` template, and a note on what each layer is responsible for.`,
    answer: `**Target Audience:** Developers who already know [Transition](/interview-question/how-do-transition-and-transitiongroup-work), [KeepAlive](/interview-question/what-is-keep-alive-in-vue) and [Suspense](/interview-question/what-is-suspense-in-vue) on their own and need them to work together.
**Difficulty:** Medium

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. The traces were produced on Vue 3.5.44, either with the repo's <code>verify-vue-example.mjs</code> harness (single SFC mounted in jsdom) or with a Node script running vue-router 5.4.0 in jsdom. Animation smoothness itself is not observable in jsdom; what these traces show is which component did what, and when.

## 1. Why This Even Matters — A Story First

Think of a museum gallery that swaps exhibits. Three people are involved. The **lighting technician** fades the room out and back in when an exhibit changes. The **storage keeper** puts the old exhibit in the back room rather than throwing it away, so it can return as it was. The **curator** will not open the room until every piece of a new exhibit has arrived from the warehouse.

The order they stand in matters. The lighting technician has to control the whole room, so she works outermost. The storage keeper has to be standing right next to the exhibit to put it away. The curator has to be right next to the crates. If the storage keeper stands outside the room's door instead, he ends up storing the lighting rig and the actual exhibits get thrown away every time.

That is the composition question in one picture: <code>&lt;Transition&gt;</code> is the lighting, <code>&lt;KeepAlive&gt;</code> the storage, <code>&lt;Suspense&gt;</code> the curator.

## 2. The Core Idea

📌 **Interview term: Built-in wrapper components** — <code>&lt;Transition&gt;</code>, <code>&lt;KeepAlive&gt;</code>, <code>&lt;Suspense&gt;</code> and <code>&lt;Teleport&gt;</code> are components shipped with Vue that wrap other components and change how they are inserted, kept or waited for. Each one looks at its **direct** child.

📌 **Interview term: RouterView slot** — <code>&lt;RouterView v-slot="{ Component, route }"&gt;</code> hands you the matched route component instead of rendering it, so you can wrap it. You then render it with a [dynamic component](/interview-question/how-do-dynamic-components-work): <code>&lt;component :is="Component" /&gt;</code>.

The order documented in the Vue guide's Suspense page, outside in:

\`\`\`vue
<RouterView v-slot="{ Component }">
  <template v-if="Component">
    <Transition mode="out-in">
      <KeepAlive>
        <Suspense>
          <!-- main content -->
          <component :is="Component"></component>

          <!-- loading state -->
          <template #fallback>
            Loading...
          </template>
        </Suspense>
      </KeepAlive>
    </Transition>
  </template>
</RouterView>
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 380" role="img" aria-label="Nesting order from outside to inside: RouterView, Transition, KeepAlive, Suspense, the page component">
  <rect class="d-box-muted" x="20" y="20" width="600" height="340" rx="14"/>
  <text class="d-text" x="44" y="48">RouterView v-slot: picks the page</text>
  <rect class="d-box" x="50" y="70" width="540" height="270" rx="12"/>
  <text class="d-text" x="74" y="98">Transition mode out-in: animates the swap</text>
  <rect class="d-box" x="80" y="120" width="480" height="200" rx="12"/>
  <text class="d-text" x="104" y="148">KeepAlive: caches page instances</text>
  <rect class="d-box" x="110" y="170" width="420" height="130" rx="12"/>
  <text class="d-text" x="134" y="198">Suspense: waits for async setup</text>
  <rect class="d-box-accent" x="160" y="222" width="320" height="56" rx="10"/>
  <text class="d-text d-accent" x="320" y="256" text-anchor="middle">component :is = the page</text>
</svg>

Read the boxes as "who wraps whom". Each layer only does its job if the layer it cares about is its direct child: KeepAlive caches what is directly inside it, and Suspense waits for the async components inside it.

## 3. What Each Layer Is Responsible For

| Layer | Its job | What it needs |
| :--- | :--- | :--- |
| <code>&lt;RouterView v-slot&gt;</code> | Decide which page component is current | The matched route |
| <code>&lt;Transition mode="out-in"&gt;</code> | Animate the old page out, then the new one in | A single child that changes |
| <code>&lt;KeepAlive&gt;</code> | Keep page instances alive between visits | Its direct child to be the switching component |
| <code>&lt;Suspense&gt;</code> | Hold the new page until its async <code>setup()</code> finishes | Async dependencies below it ([async setup](/interview-question/what-is-async-setup-and-top-level-await) or [async components](/interview-question/how-does-defineasynccomponent-work-with-loading-error-and-retry-in-2025)) |
| <code>&lt;component :is&gt;</code> | Render the page | The component from the slot |

📌 **Interview term: mode="out-in"** — makes <code>&lt;Transition&gt;</code> finish the leave animation of the old child before it starts the enter of the new one. For full-page swaps it is almost always what you want, because two pages overlapping in the layout looks broken.

## 4. Verified: the documented order, without the router

The runnable example reproduces the stack with two views (Home and Reports), each with an <code>async setup()</code> that waits 50 or 80 ms, and logs Suspense events and the views' lifecycle hooks. The driver clicked Home twice, switched to Reports, then back to Home:

\`\`\`
<Suspense> is an experimental feature and its API will likely change.
  Home: setup started
  suspense: pending
  suspense: fallback shown
[app] RENDERED: HomeReportsLoading...
  suspense: resolved
  Home: mounted
  Home: activated
screen: Home clicks 0
screen: Home clicks 2
-> Reports
  suspense: pending
  Reports: setup started
  screen at +60ms: Home clicks 2
  suspense: resolved
  Reports: mounted
  Reports: activated
  screen: Reports clicks 0
-> Home
  suspense: pending
  suspense: resolved
  Home: activated
  screen: Home clicks 2
\`\`\`

Four behaviours worth explaining in an interview:

1. **The fallback only appeared on the first load.** When switching to Reports, Suspense went <code>pending</code> but did not fire <code>fallback</code>; the old page (<code>Home clicks 2</code>) stayed on screen at +60 ms while Reports loaded. That is Suspense's default: once resolved, it keeps the previous content until the new content is ready. The <code>timeout</code> prop changes that (see [Suspense in Vue 3.5](/interview-question/how-does-suspense-work-in-vue-3-5-after-the-2024-stabilization)).
2. **KeepAlive cached the resolved page.** Returning to Home did not start a new <code>setup()</code>; Suspense resolved straight away, only <code>onActivated</code> ran, and the two clicks were still there.
3. **The info line is real.** Vue 3.5.44 prints "&lt;Suspense&gt; is an experimental feature and its API will likely change." the first time a Suspense boundary is created on the client.
4. **Hooks had to be registered before the first <code>await</code>.** An earlier draft of this file registered <code>onMounted</code> after the <code>await</code> in a hand-written <code>async setup()</code>, and Vue warned "onMounted is called when there is no active component instance to be associated with" and never ran it.

## 5. Verified: the wrong order fails silently

Moving <code>&lt;KeepAlive&gt;</code> outside <code>&lt;Transition&gt;</code> (so KeepAlive's direct child is the Transition, not the page) and running the same driver:

\`\`\`
  Home: setup started
[app] RENDERED: HomeReportsLoading...
  Home: mounted
screen: Home clicks 0
screen: Home clicks 2
-> Reports
  Reports: setup started
  screen at +60ms: Home clicks 2
  Reports: mounted
  screen: Reports clicks 0
-> Home
  Home: setup started
  Home: mounted
  screen: Home clicks 0
\`\`\`

There is no warning and no error, but Home ran <code>setup()</code> again, never got <code>onActivated</code>, and lost its two clicks. Caching silently stopped working. This is why the order is worth memorising rather than guessing.

## 6. Verified: with vue-router 5.4.0

The same stack around a real <code>&lt;RouterView&gt;</code>, with two async-setup routes, run as a Node script in jsdom (the full code is the second example below):

\`\`\`
<Suspense> is an experimental feature and its API will likely change.
first paint : Loading...
+200ms      : Home 0
2 clicks    : Home 2
/reports    : Reports 0
back to /   : Home 2
\`\`\`

First load shows the fallback, the resolved page takes over, and coming back to <code>/</code> shows the cached instance with its two clicks. Note the <code>v-if="Component"</code> guard in the template. A separate run mounted the app *before* the initial navigation finished, without the guard, and printed the slot value next to the output:

\`\`\`
sync after mount: [undefined]<!---->
after isReady   : [[object Object]]<p class="v-enter-from v-enter-active">home</p>
\`\`\`

So the slot really does hand you <code>undefined</code> at first, and without the guard the first page then plays an *enter* animation as if the user had navigated to it. The guard keeps Transition and KeepAlive from ever wrapping nothing.

## 7. Choosing Which Layers You Need

| You want | Use |
| :--- | :--- |
| Only animated route changes | <code>RouterView</code> → <code>Transition</code> → <code>component</code> |
| Only cached pages | <code>RouterView</code> → <code>KeepAlive</code> → <code>component</code> |
| Animated and cached | <code>RouterView</code> → <code>Transition</code> → <code>KeepAlive</code> → <code>component</code> |
| Pages with top-level <code>await</code> | Add <code>Suspense</code> directly around <code>component</code>, inside the others |
| Per-route choices | Read <code>route.meta</code> in the slot, for example <code>:name="route.meta.transition"</code> or <code>v-if="route.meta.keepAlive"</code> |

Pages that fetch in <code>onMounted</code> or a composable (see [fetching data in a component](/interview-question/how-do-you-fetch-data-in-a-vue-component-loading-errors-cancellation)) do not need Suspense at all; they handle their own loading state. Suspense is only required when a page's <code>setup()</code> itself is async.

## 8. Common Pitfalls

- **KeepAlive outside Transition.** As verified above, caching silently stops: pages remount and lose state with no warning.
- **Expecting the fallback on every navigation.** After the first resolve, Suspense keeps the old page until the new one is ready. Set <code>timeout</code> on Suspense if a slow page should show the fallback after a delay.
- **Two root nodes in a page.** <code>&lt;Transition&gt;</code> needs a single element to animate. A page with two top-level elements logged "Component inside &lt;Transition&gt; renders non-element root node that cannot be animated." Give each page one root element.
- **Refetching in <code>onMounted</code> on a cached page.** It runs once. Refresh in <code>onActivated</code> instead.
- **Registering hooks after <code>await</code> in a hand-written <code>async setup()</code>.** They are lost with a warning. <code>&lt;script setup&gt;</code> top-level await is compiled to restore the instance, so there it is safe.
- **No error handling around Suspense.** A rejected async setup does not show the fallback forever; it is an error. Catch it with <code>onErrorCaptured</code> in a parent (see [error handling in Vue](/interview-question/how-do-you-handle-errors-in-vue-onerrorcaptured-app-config-errorhandler)).

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"Outside in, it is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;RouterView v-slot&gt;</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;Transition&gt;</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;KeepAlive&gt;</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;Suspense&gt;</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;component :is&gt;</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why that order:</strong> <span style="color:#f0e2c8;">"Each wrapper acts on its direct child: Transition animates the swap, KeepAlive caches what is directly inside it, and Suspense waits for the async page right below it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. What it looks like at runtime:</strong> <span style="color:#f0e2c8;">"The fallback shows on first load; after that Suspense keeps the old page while the next one loads, and a cached page comes back instantly with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onActivated</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The gotcha:</strong> <span style="color:#f0e2c8;">"Get it wrong and nothing throws. I verified that putting KeepAlive outside Transition silently remounts pages and loses their state."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Status:</strong> <span style="color:#f0e2c8;">"Suspense is still marked experimental in Vue 3.5, so I only add it for pages whose <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setup()</code> is actually async."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the fallback not appear when I navigate a second time?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Once resolved, Suspense only switches to pending and keeps showing the previous content until the new tree resolves. Add a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">timeout</code> prop if you want the fallback to appear after a delay.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you cache only some routes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">route.meta</code> in the slot: either <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:include</code> with component names, or render the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;KeepAlive&gt;</code> branch only when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">route.meta.keepAlive</code> is true.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why the <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">v-if="Component"</code> guard?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Before the initial navigation resolves, the slot gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code>. Without the guard the first page then animates in as if it were a navigation; with it, Transition and KeepAlive only ever wrap a real page.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do you need Suspense for every page?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Only pages with an async <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setup()</code> or top-level <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await</code> need it. Pages that fetch in a composable manage their own loading state and work without it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where do errors from an async page go?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A rejected setup is an error, not a pending state. Catch it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onErrorCaptured</code> in a parent or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">app.config.errorHandler</code>, and render an error view.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **RouterView slot** | <code>v-slot="{ Component }"</code>: the matched page, handed to you to wrap |
| **Transition** | Animates a single child entering and leaving |
| **mode="out-in"** | Old child leaves fully before the new one enters |
| **KeepAlive** | Caches component instances; must wrap the switching component directly |
| **Suspense** | Holds new content until its async dependencies resolve; experimental in 3.5 |
| **Fallback** | The <code>#fallback</code> slot, shown while the first content is pending |
| **onActivated** | Hook that runs when a cached instance comes back |

---
**Conclusion:** The working order is RouterView, then Transition, then KeepAlive, then Suspense, then the page component, because each wrapper acts on its direct child: Transition animates the swap, KeepAlive caches the page instances, and Suspense waits for the page's async setup. Verified on Vue 3.5.44, that stack showed the fallback only on first load, kept the old page while the next one loaded, and brought a cached page back instantly with its state. Moving KeepAlive outside Transition produced no warning at all, just pages that silently lost their state, which is the strongest argument for knowing the order by heart.`,
    examples: [
      {
        label: "Transition, KeepAlive and Suspense in the documented order, with async views",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { ref, shallowRef, defineComponent, h, onMounted, onActivated } from "vue";

// Each view has an async setup(): it "loads data" before it can render.
const makeView = (name, ms) =>
  defineComponent({
    name,
    async setup() {
      // Lifecycle hooks must be registered BEFORE the first await.
      onMounted(() => console.log(\`  \${name}: mounted\`));
      onActivated(() => console.log(\`  \${name}: activated\`));
      const clicks = ref(0);
      console.log(\`  \${name}: setup started\`);
      await new Promise((r) => setTimeout(r, ms));
      return () => h("button", { class: "view", onClick: () => clicks.value++ }, \`\${name} clicks \${clicks.value}\`);
    },
  });

const views = { Home: makeView("Home", 50), Reports: makeView("Reports", 80) };
const current = shallowRef(views.Home);
</script>

<template>
  <nav>
    <button v-for="(v, name) in views" :key="name" class="nav" @click="current = v">{{ name }}</button>
  </nav>
  <!-- Order matters: Transition > KeepAlive > Suspense > the component -->
  <Transition mode="out-in" name="fade" :duration="40">
    <KeepAlive>
      <Suspense @pending="console.log('  suspense: pending')" @fallback="console.log('  suspense: fallback shown')" @resolve="console.log('  suspense: resolved')">
        <component :is="current" />
        <template #fallback>
          <p class="loading">Loading...</p>
        </template>
      </Suspense>
    </KeepAlive>
  </Transition>
</template>

<style>
.fade-enter-active, .fade-leave-active { transition: opacity 0.04s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>`,
      },
      {
        label: "The same stack around RouterView with vue-router 5, run in jsdom",
        tech: "js",
        runnable: false,
        code: `// RouterView + Transition + KeepAlive + Suspense, run in jsdom with vue-router 5.4.0.
import { JSDOM } from "jsdom";
const dom = new JSDOM('<div id="app"></div>', { pretendToBeVisual: true, url: "http://localhost/" });
for (const k of ["window", "document", "Node", "Element", "HTMLElement", "SVGElement", "Text", "Comment", "requestAnimationFrame", "getComputedStyle", "history", "location"]) globalThis[k] = dom.window[k];
const { createApp, defineComponent, h, ref } = await import("vue");
const { createRouter, createMemoryHistory } = await import("vue-router");

const page = (name, ms) => defineComponent({
  name,
  async setup() {
    const n = ref(0);
    await new Promise((r) => setTimeout(r, ms)); // pretend to fetch
    return () => h("button", { class: "page", onClick: () => n.value++ }, \`\${name} \${n.value}\`);
  },
});
const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: "/", component: page("Home", 30) }, { path: "/reports", component: page("Reports", 30) }],
});

const App = {
  template: \`
    <RouterView v-slot="{ Component }">
      <template v-if="Component">
        <Transition mode="out-in" :duration="20">
          <KeepAlive>
            <Suspense>
              <component :is="Component" />
              <template #fallback><p class="page">Loading...</p></template>
            </Suspense>
          </KeepAlive>
        </Transition>
      </template>
    </RouterView>\`,
};
const app = createApp(App).use(router);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const screen = () => document.querySelector(".page")?.textContent;
await router.push("/"); app.mount("#app");
console.log("first paint :", screen());
await wait(200); console.log("+200ms      :", screen());
document.querySelector(".page").click(); document.querySelector(".page").click(); await wait(20); console.log("2 clicks    :", screen());
await router.push("/reports"); await wait(200); console.log("/reports    :", screen());
await router.push("/"); await wait(200); console.log("back to /   :", screen());`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is Teleport in Vue 3?",
    seoDescription:
      "<Teleport> renders part of a component elsewhere in the DOM, such as body, while props, events and inject keep working. to, disabled, defer and SSR.",
    description: `**Question presented to candidate:**
"Our modal is rendered deep inside a card that has \`overflow: hidden\` and its own \`z-index\`, so the modal gets clipped. A teammate suggested \`<Teleport>\`. Explain what Teleport does, what stays the same for the component, and what can go wrong."

**What a strong answer should cover:**
- \`<Teleport to="body">\` moves the **rendered DOM** of its content to another place in the document, while the content stays in the **same component tree**.
- Props, emits, reactive state, \`provide\`/\`inject\` and event handlers keep working, because those follow the component tree, not the DOM.
- The **\`to\`** target is a CSS selector or element that must exist when the Teleport mounts; **\`disabled\`** renders the content in place instead (for example on mobile).
- **\`defer\`** (Vue 3.5+) resolves the target after the current render, so it can point at an element rendered later by the same app.
- Typical uses: modals, toasts, tooltips and dropdowns that must escape \`overflow\`, \`z-index\` stacking contexts or \`transform\`ed ancestors.
- In SSR, teleported HTML is returned separately in the render context and must be injected into the page by the server.

**Clarifying questions expected:**
- "Is the target outside the Vue app, such as a \`#modals\` div in \`index.html\`, or rendered by the app?"
- "Is this app server-rendered?"

**Code / implementation expected:** Yes — a modal teleported to \`body\`, ideally with \`disabled\` or \`defer\` shown.`,
    answer: `**Target Audience:** Developers who build modals, toasts or popovers in Vue and have hit CSS clipping or stacking problems.
**Difficulty:** Medium

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. The DOM locations and warnings were produced by mounting the code on Vue 3.5.44 in jsdom with the repo's <code>verify-vue-example.mjs</code> harness, and the SSR output with <code>renderToString</code> from <code>@vue/server-renderer</code> 3.5.44. jsdom does no layout, so the CSS clipping problem itself is described, not measured.

## 1. Why This Even Matters — A Story First

Imagine you work in a small office inside a big building, and you need to put up a notice that the whole building can see. If you pin it on your office wall, only your office sees it, and the walls cut off half of it anyway. So you walk it down to the lobby noticeboard. The notice is still yours: you wrote it, you update it, and when you leave the company it comes down. It just *hangs* somewhere else.

<code>&lt;Teleport&gt;</code> is the walk to the lobby. The component that owns a modal stays its owner. Only the modal's DOM nodes are placed elsewhere, usually directly under <code>&lt;body&gt;</code>, where no parent's <code>overflow: hidden</code>, <code>z-index</code> or <code>transform</code> can clip or trap it.

## 2. The Core Idea

📌 **Interview term: Teleport** — a built-in component that renders its slot content into a different DOM node (the *target*) than the one its parent renders into. Written <code>&lt;Teleport to="body"&gt;...&lt;/Teleport&gt;</code>.

📌 **Interview term: Logical tree vs. DOM tree** — the logical tree is the component hierarchy Vue tracks (parents, children, provide/inject, emits). The DOM tree is where elements actually sit in the page. Teleport splits them: the content stays a logical child but becomes a DOM child of the target.

📌 **Interview term: Stacking context** — a CSS concept: an element with, for example, a <code>transform</code>, <code>opacity</code> below 1 or a positioned element with a <code>z-index</code> creates a new layer, and nothing inside it can be painted above things outside it, no matter how large its own <code>z-index</code>. That, plus ancestors with <code>overflow: hidden</code>, is why modals rendered in place get clipped or buried.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="The modal stays a child of Card in the component tree but its DOM is placed under body">
  <defs>
    <marker id="tp-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="170" y="30" text-anchor="middle">Component tree</text>
  <rect class="d-box" x="90" y="50" width="160" height="44" rx="10"/>
  <text class="d-text" x="170" y="77" text-anchor="middle">App</text>
  <path class="d-edge" d="M 170 98 L 170 126" marker-end="url(#tp-arrow)"/>
  <rect class="d-box" x="90" y="132" width="160" height="44" rx="10"/>
  <text class="d-text" x="170" y="159" text-anchor="middle">Card</text>
  <path class="d-edge" d="M 170 180 L 170 208" marker-end="url(#tp-arrow)"/>
  <rect class="d-box-accent" x="90" y="214" width="160" height="44" rx="10"/>
  <text class="d-text d-accent" x="170" y="241" text-anchor="middle">Modal</text>
  <text class="d-text" x="550" y="30" text-anchor="middle">DOM tree</text>
  <rect class="d-box-muted" x="430" y="50" width="240" height="220" rx="12"/>
  <text class="d-text" x="460" y="78">body</text>
  <rect class="d-box" x="460" y="94" width="180" height="70" rx="8"/>
  <text class="d-text" x="550" y="120" text-anchor="middle">div id app</text>
  <text class="d-sub" x="550" y="142" text-anchor="middle">App and Card</text>
  <rect class="d-box-accent" x="460" y="190" width="180" height="56" rx="8"/>
  <text class="d-text d-accent" x="550" y="223" text-anchor="middle">div.modal</text>
  <path class="d-edge-dashed" d="M 254 236 L 452 220" marker-end="url(#tp-arrow)"/>
  <text class="d-sub" x="350" y="208" text-anchor="middle">Teleport to body</text>
</svg>

On the left, Modal is still Card's child: it receives Card's props, emits to Card, and can <code>inject</code> what App provides. On the right, its element is a sibling of the app root, outside every ancestor that could clip it.

## 3. Verified: where it renders, and what still works

The runnable example has a card with a button that opens a modal teleported to <code>body</code>, a checkbox bound to <code>:disabled</code>, a child that <code>inject</code>s a value the parent provides, and a second Teleport with <code>defer</code> whose target is rendered later in the same template. The driver opened the modal, ticked "render inline", then closed it:

\`\`\`
[app] RENDERED: Open dialog render inlinedeferred note
deferred note parent: late-target
open   : parent=<body> insideApp=false | text: Hello from the modal (theme: dark)
inline : parent=<div class=card> insideApp=true
closed : no modal
\`\`\`

What each line proves:

- **The DOM moved.** While open, the modal's parent was <code>&lt;body&gt;</code> and it was not inside <code>#app</code>.
- **The component tree did not.** <code>(theme: dark)</code> came from <code>inject("theme")</code> in a child of the modal: [provide and inject](/interview-question/what-are-provide-and-inject) follow the component tree, so a teleported child still finds the parent's value.
- **Events and state still work.** The Close button inside the teleported modal set the parent's <code>open</code> ref to false, and the modal was removed.
- **<code>disabled</code> moves it back live.** Toggling it re-parented the open modal into the card without remounting the parent.
- **<code>defer</code> can target an element rendered later.** The deferred note landed in <code>#late-target</code>, an <code>&lt;aside&gt;</code> that appears after the Teleport in the template.

📌 **Interview term: disabled** — a boolean prop. When true, the content renders where the Teleport is written, as if Teleport were not there. A common use is <code>:disabled="isMobile"</code>, where a dialog should be inline on small screens.

📌 **Interview term: defer** — a boolean prop added in Vue 3.5 (listed under "Teleport" in the 3.5.0 changelog, released 2024-09-03, and marked "3.5+" in the Vue docs). It waits until the rest of the current render has mounted before resolving <code>to</code>, so the target can be an element Vue itself renders later.

## 4. Verified: the target must exist

The same <code>#late-target</code> pattern **without** <code>defer</code>, plus a Teleport to a selector that matches nothing:

\`\`\`vue
<template>
  <Teleport to="#late-target"><span class="note">note</span></Teleport>
  <Teleport to="#does-not-exist"><span>lost</span></Teleport>
  <aside id="late-target"></aside>
</template>
\`\`\`

Vue 3.5.44 warned twice per Teleport and rendered nothing into either target (the "at &lt;App&gt;" line under each warning is trimmed):

\`\`\`
[Vue warn]: Failed to locate Teleport target with selector "#late-target". Note the target element must exist before the component is mounted - i.e. the target cannot be rendered by the component itself, and ideally should be outside of the entire Vue component tree.
[Vue warn]: Invalid Teleport target on mount: null (object)
[Vue warn]: Failed to locate Teleport target with selector "#does-not-exist". Note the target element must exist before the component is mounted - i.e. the target cannot be rendered by the component itself, and ideally should be outside of the entire Vue component tree.
[Vue warn]: Invalid Teleport target on mount: null (object)
HTML: <div id="app" data-v-app=""><!--teleport start--><!--teleport end--><!--teleport start--><!--teleport end--><aside id="late-target"></aside></div>
\`\`\`

The two comment pairs are the anchors Vue leaves where each Teleport was written; they mark the spot so <code>disabled</code> can move content back. The safe defaults are a target outside the app (such as <code>&lt;div id="modals"&gt;</code> in <code>index.html</code>, or <code>body</code>), or <code>defer</code> when the target is rendered by Vue.

## 5. Verified: Teleport in server-side rendering

On the server there is no DOM to move nodes into, so Vue renders teleported content into a separate string. Rendering an app with a <code>&lt;Teleport to="body"&gt;</code> using <code>renderToString(app, ctx)</code>:

\`\`\`
html     : <main><p>page</p><!--teleport start--><!--teleport end--></main>
teleports: {
  body: '<!--teleport start anchor--><div class="modal">modal</div><!--teleport anchor-->'
}
\`\`\`

The main HTML only contains the anchors. The modal's markup is in <code>ctx.teleports</code>, keyed by the <code>to</code> value, and your server code (or a framework such as [Nuxt](/interview-question/what-is-nuxt-and-how-does-it-relate-to-vue)) must insert it at the right place in the page before sending it. Forgetting this produces missing content and [hydration mismatches](/interview-question/how-do-you-diagnose-and-fix-hydration-mismatches-in-vue-ssr-nuxt-3) on the client.

## 6. Teleport Compared

| | Render in place | <code>&lt;Teleport&gt;</code> | Separate <code>createApp</code> for the modal |
| :--- | :--- | :--- | :--- |
| Escapes <code>overflow</code> / stacking contexts | No | Yes | Yes |
| Shares props, emits, provide/inject | Yes | Yes | No, it is a different app |
| Shares plugins (router, Pinia) | Yes | Yes | Only if installed again |
| Cleanup when the owner unmounts | Automatic | Automatic | Manual |
| SSR | Normal | Needs <code>ctx.teleports</code> handling | Separate render |

React's equivalent is a portal created with <code>createPortal</code>; the trade-offs are the same (see [portals in React](/interview-question/what-are-portals-in-react-and-when-would-you-use-them)).

## 7. Working With Other Features

- **Transitions.** Vue 3.5 added support for nesting a Teleport directly inside a <code>&lt;Transition&gt;</code> (3.5.0 changelog: "support directly nesting Teleport inside Transition"); the more common pattern is a Transition *inside* the Teleport around the modal element. See [Transition and TransitionGroup](/interview-question/how-do-transition-and-transitiongroup-work).
- **Several Teleports to one target.** They append in mount order, so the most recently opened modal ends up last in <code>body</code>, which is usually the one you want on top.
- **Scoped styles.** Scoped CSS still applies, because the data attribute travels with the elements. Global CSS that depends on ancestors such as <code>.card .modal</code> no longer matches once the modal has moved (see [scoped styles](/interview-question/what-are-scoped-styles-in-vue)).
- **Focus and accessibility.** Teleport only moves nodes. Focus trapping, <code>aria-modal</code>, <code>Escape</code> handling and returning focus to the trigger are still your job.

Three of these were checked in a Vitest 5.0.5 test (jsdom, <code>@vitejs/plugin-vue</code>, Vue Test Utils 2.5.1) with a <code>Card.vue</code> whose root <code>div</code> has an <code>@click</code> listener, a scoped style, a teleported modal containing a button and a child that logs when it mounts, and a second Teleport added later:

\`\`\`
  modal content mounted
modal attrs: data-v-a85db667 class
(clicked the button inside the teleported modal)
after disabled=true, parent: card
  card div got a DOM click
(clicked again, now rendered inline)
body children order: DIV, modal, second
\`\`\`

The scoped attribute travelled with the modal; a click inside the teleported modal did **not** reach the card's DOM listener, but the same click did once <code>disabled</code> put the modal back inside the card; toggling <code>disabled</code> did not remount the content (one "mounted" line); and the second Teleport was appended after the first (the leading <code>DIV</code> is the test's mount container).

## 8. Common Pitfalls

- **Targeting an element the same component renders.** Without <code>defer</code>, the target does not exist yet at mount time, as the warning above shows. Use <code>defer</code> or put the target in <code>index.html</code>.
- **Assuming CSS from the parent still applies.** Descendant selectors through the original ancestors stop matching after the move. Style the modal on its own.
- **DOM event bubbling vs. component events.** Native DOM events bubble through the *DOM* tree, so a click in a teleported modal does not bubble to the card's element listeners. Component <code>emit</code>s follow the *component* tree and still reach the parent.
- **Ignoring SSR.** Teleported markup is returned in <code>ctx.teleports</code>; if the server does not inject it, the server HTML is missing the modal.
- **Teleporting things that do not need it.** Only content that must escape clipping or stacking (modals, toasts, popovers) benefits. Moving ordinary content makes the DOM harder to reason about.
- **Treating Teleport as a modal library.** It does not trap focus, lock scrolling or add ARIA attributes.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;Teleport&gt;</code> renders a piece of a component into another DOM node, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">body</code>, while it stays in the same component tree."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why:</strong> <span style="color:#f0e2c8;">"It gets modals and toasts out of ancestors with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">overflow: hidden</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">transform</code> or their own <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">z-index</code>, which would otherwise clip or bury them."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. What still works:</strong> <span style="color:#f0e2c8;">"Props, emits, reactive state and provide/inject all follow the component tree, so the teleported modal behaves like any other child."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The props:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">to</code> must exist at mount time, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">disabled</code> renders in place, and since 3.5 <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defer</code> lets the target be rendered later by the app itself."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. SSR:</strong> <span style="color:#f0e2c8;">"On the server the teleported HTML comes back in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ctx.teleports</code>, keyed by target, and the server has to insert it into the page."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does a click inside a teleported modal bubble to the parent component?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Native DOM events bubble through the DOM, so they do not reach the parent's element listeners. Component events from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">emit</code> follow the component tree and do reach the parent.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if the target does not exist?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Vue warns "Failed to locate Teleport target with selector" and renders nothing there. Put the target in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">index.html</code>, use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">body</code>, or add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defer</code> if the app renders it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">disabled</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the same content should be inline in some cases, for example a dialog that is a full-screen overlay on desktop but an inline panel on mobile. Toggling it moves the content without remounting.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does Teleport compare to React portals?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same idea: DOM goes elsewhere, the component relationship stays. React's <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">createPortal</code> also keeps context; one difference is that React bubbles synthetic events through the React tree, whereas Vue leaves native DOM bubbling to the DOM.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does Teleport make a modal accessible?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It only moves nodes. Focus trapping, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-modal</code>, Escape to close and restoring focus are still needed.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Teleport** | Renders its content into a different DOM node than its parent |
| **to** | The target: a CSS selector or an element |
| **disabled** | Render in place instead of teleporting |
| **defer** | Vue 3.5+: resolve the target after the current render mounts |
| **Logical tree** | The component hierarchy: props, emits, provide/inject |
| **Stacking context** | A CSS layer that traps <code>z-index</code> inside an ancestor |
| **ctx.teleports** | SSR: where teleported HTML is returned, keyed by target |

---
**Conclusion:** <code>&lt;Teleport&gt;</code> separates where a piece of UI *lives* from where it is *painted*: the content stays in its owner's component tree, so state, events and inject keep working, while its DOM goes to a target such as <code>body</code>, out of reach of clipping and stacking contexts. The verified runs showed the modal under <code>body</code> with the injected theme intact, <code>disabled</code> moving it back live, <code>defer</code> reaching a target rendered later, clear warnings for a missing target, and SSR returning teleported HTML separately in <code>ctx.teleports</code>. Use it for overlays, keep the target outside the app or use <code>defer</code>, and remember it moves nodes but does not make a modal accessible.`,
    examples: [
      {
        label: "Modal teleported to body, with disabled, inject and a deferred target",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { ref, provide, inject, defineComponent, h } from "vue";

// A child that reads an injected value: provide/inject follows the component tree, not the DOM.
const ThemeLabel = defineComponent({
  setup() {
    const theme = inject("theme");
    return () => h("small", \` (theme: \${theme})\`);
  },
});

provide("theme", "dark");
const open = ref(false);
const inline = ref(false); // when true, Teleport is disabled and renders in place
</script>

<template>
  <div class="card">
    <button class="open" @click="open = true">Open dialog</button>
    <label><input type="checkbox" class="inline" v-model="inline" /> render inline</label>

    <!-- Rendered into <body>, but still part of this component -->
    <Teleport to="body" :disabled="inline">
      <div v-if="open" class="modal" role="dialog">
        <p>Hello from the modal<ThemeLabel /></p>
        <button class="close" @click="open = false">Close</button>
      </div>
    </Teleport>

    <!-- defer (3.5+): the target is resolved after this render, so it can be rendered later in the template -->
    <Teleport defer to="#late-target"><span class="note">deferred note</span></Teleport>
  </div>
  <aside id="late-target"></aside>
</template>`,
      },
      {
        label: "Teleport during SSR: teleported HTML is returned in the render context",
        tech: "js",
        runnable: false,
        code: `import { createSSRApp, h, Teleport } from "vue";
import { renderToString } from "@vue/server-renderer";
const app = createSSRApp({ render: () => h("main", [h("p", "page"), h(Teleport, { to: "body" }, h("div", { class: "modal" }, "modal"))]) });
const ctx = {};
const html = await renderToString(app, ctx);
console.log("html     :", html);
console.log("teleports:", ctx.teleports);`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is Suspense in Vue?",
    seoDescription:
      "<Suspense> waits for async setup() and async components below it, showing #fallback until all resolve. Errors, SSR and its experimental status in 3.5.",
    description: `**Question presented to candidate:**
"Our dashboard has a profile panel and a stats panel, each loading its own data, and the page flickers through two spinners. Someone suggested Vue's \`<Suspense>\`. What is it, what can it wait for, and what would you need to handle around it?"

**What a strong answer should cover:**
- \`<Suspense>\` is a built-in component that **coordinates async dependencies** in the subtree below it and renders one **\`#fallback\`** until all of them are ready, then the **\`#default\`** slot.
- The two kinds of dependency: components with an **async \`setup()\`** (including \`<script setup>\` with top-level \`await\`) and **async components** from \`defineAsyncComponent\`.
- Events: **\`pending\`**, **\`fallback\`**, **\`resolve\`**.
- Suspense does not handle **errors**: a rejected setup must be caught with \`onErrorCaptured\` or \`app.config.errorHandler\`.
- On the server, \`renderToString\` waits for the async setup and sends the resolved HTML, not the fallback.
- It is still marked **experimental**: the Vue 3.5.44 runtime prints that on first use and the docs carry an "Experimental Feature" warning.

**Clarifying questions expected:**
- "Do both panels need to appear together, or can each show as soon as it is ready?"
- "Is the app server-rendered?"

**Code / implementation expected:** Yes — a \`<Suspense>\` around two async children with a fallback, plus error handling.`,
    answer: `**Target Audience:** Developers who know components and promises and want to understand Vue's built-in way of coordinating async loading.
**Difficulty:** Hard

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. Every trace below was produced by compiling and mounting the code on Vue 3.5.44 in jsdom (or rendering it with <code>--ssr</code>) using the repo's <code>verify-vue-example.mjs</code> harness. The experimental status was read from the 3.5.44 runtime, the 3.6.0-rc.12 runtime and the source of the official guide page. For what changed across 3.x releases, and the timing props, see the sibling question on [Suspense in Vue 3.5](/interview-question/how-does-suspense-work-in-vue-3-5-after-the-2024-stabilization).

## 1. Why This Even Matters — A Story First

A family is going out for dinner. Dad is ready, one kid cannot find her shoes, the other is finishing a level of a game. Without coordination, everyone walks out of the door as soon as *they* are ready: Dad stands on the pavement, one kid trickles out, then the other, and the neighbours watch three separate departures.

A sensible parent says: "Everyone wait in the hall. The front door opens once, when all of you are ready." Meanwhile the hall has a sign that says "Leaving soon".

<code>&lt;Suspense&gt;</code> is that parent. Each component below it that needs to load something is a family member getting ready. The <code>#fallback</code> slot is the "Leaving soon" sign. And the door opens once: the whole <code>#default</code> content appears together, instead of panels popping in one by one with their own spinners.

## 2. The Core Idea

📌 **Interview term: Suspense** — a built-in component with two slots, <code>#default</code> and <code>#fallback</code>. It renders the default content off-screen, counts how many async dependencies inside it are still pending, and shows the fallback until that count reaches zero.

📌 **Interview term: Async dependency** — a component Suspense must wait for. There are two kinds:

1. A component whose <code>setup()</code> returns a promise: written as <code>async setup()</code>, or in a <code>&lt;script setup&gt;</code> that uses top-level <code>await</code> (see [async setup and top-level await](/interview-question/what-is-async-setup-and-top-level-await)).
2. An async component created with [defineAsyncComponent](/interview-question/how-does-defineasynccomponent-work-with-loading-error-and-retry-in-2025). These are "suspensible" by default: inside a Suspense, their own <code>loadingComponent</code>, <code>delay</code> and <code>timeout</code> options are ignored and Suspense controls the loading state.

📌 **Interview term: Suspense events** — <code>@pending</code> (a new default tree started resolving), <code>@fallback</code> (the fallback was shown) and <code>@resolve</code> (the default content is now displayed).

📌 **Interview term: Experimental feature** — the Vue guide page for Suspense opens with a warning block: "&lt;Suspense&gt; is an experimental feature. It is not guaranteed to reach stable status and the API may change before it does." The runtime agrees: Vue 3.5.44 and 3.6.0-rc.12 both print "&lt;Suspense&gt; is an experimental feature and its API will likely change." the first time a boundary is created in the browser.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="Suspense counts pending async dependencies and shows the fallback until the count reaches zero">
  <defs>
    <marker id="sus-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="240" y="20" width="240" height="56" rx="10"/>
  <text class="d-text d-accent" x="360" y="44" text-anchor="middle">Suspense</text>
  <text class="d-sub" x="360" y="64" text-anchor="middle">pending deps: 2</text>
  <path class="d-edge" d="M 300 80 L 170 126" marker-end="url(#sus-arrow)"/>
  <path class="d-edge" d="M 420 80 L 550 126" marker-end="url(#sus-arrow)"/>
  <rect class="d-box" x="50" y="132" width="240" height="60" rx="10"/>
  <text class="d-text" x="170" y="157" text-anchor="middle">Profile</text>
  <text class="d-sub" x="170" y="178" text-anchor="middle">async setup, 40 ms</text>
  <rect class="d-box" x="430" y="132" width="240" height="60" rx="10"/>
  <text class="d-text" x="550" y="157" text-anchor="middle">Stats</text>
  <text class="d-sub" x="550" y="178" text-anchor="middle">async component, 80 ms</text>
  <rect class="d-box-muted" x="50" y="232" width="280" height="50" rx="10"/>
  <text class="d-text" x="190" y="262" text-anchor="middle">count above 0: show fallback</text>
  <rect class="d-box-muted" x="390" y="232" width="280" height="50" rx="10"/>
  <text class="d-text" x="530" y="262" text-anchor="middle">count is 0: show default</text>
</svg>

The default content is real and fully mounted in a hidden container while it waits. When the last dependency resolves, Suspense moves it into the page in one step, which is what removes the "popcorn" effect of several spinners.

## 3. Verified: one loading state for two dependencies

The runnable example puts two dependencies inside one Suspense: <code>Profile</code> (an <code>async setup()</code> that waits 40 ms) and <code>Stats</code> (a <code>defineAsyncComponent</code> whose loader waits 80 ms). A parent <code>onErrorCaptured</code> turns a failure into an error message, and the "Load" buttons change a <code>:key</code> to start over. The driver printed the screen whenever it changed, then clicked "Load (failing)" and "Load":

\`\`\`
<Suspense> is an experimental feature and its API will likely change.
pending
fallback
[app] RENDERED: LoadLoad (failing)Loading dashboard...
  screen: Loading dashboard...
resolve
  screen: Profile: AdaStats: 42 orders
click Load (failing)
pending
fallback
  screen: Loading dashboard...
  screen: Could not load: profile API returned 500
click Load
pending
fallback
  screen: Loading dashboard...
resolve
  screen: Profile: AdaStats: 42 orders
\`\`\`

What it shows:

- **No partial render.** Profile was ready after 40 ms, but the screen went straight from the fallback to both panels. There was never a frame showing Profile alone.
- **Event order on first load** is <code>pending</code>, then <code>fallback</code>, then <code>resolve</code>.
- **Errors are not a Suspense state.** When Profile threw, Suspense did not fire <code>resolve</code>; the error went up the component tree to <code>onErrorCaptured</code>, which replaced the Suspense with an error message (see [error handling in Vue](/interview-question/how-do-you-handle-errors-in-vue-onerrorcaptured-app-config-errorhandler)).
- **A new <code>key</code> means a fresh boundary,** which is the simplest "retry": it went <code>pending</code> and showed the fallback again.

## 4. Verified: Suspense on the server

The same file rendered with <code>renderToString</code> (the harness's <code>--ssr</code> mode):

\`\`\`
[ssr] HTML: <!--[--><button class="ok">Load</button><button class="bad">Load (failing)</button><section><p>Profile: Ada</p><p>Stats: 42 orders</p></section><!--]-->
\`\`\`

The server waited for both async dependencies and sent the resolved content, not the fallback. That is the main practical reason Suspense exists in SSR apps such as [Nuxt](/interview-question/what-is-nuxt-and-how-does-it-relate-to-vue): an async <code>setup()</code> can await its data on the server and the HTML arrives complete. No "experimental" line was printed during the SSR render; it is logged when the client creates a boundary. See [server-side rendering in Vue](/interview-question/how-does-server-side-rendering-work-in-vue-rendertostring-hydration).

## 5. What Suspense Does Not Do

| Expectation | Reality |
| :--- | :--- |
| Catches errors | No. Use <code>onErrorCaptured</code> or <code>app.config.errorHandler</code> |
| Waits for data fetched in <code>onMounted</code> or a composable | No. Only an async <code>setup()</code> or an async component counts |
| Shows the fallback on every later change | No. After the first resolve it keeps the old content until the new tree resolves, unless <code>timeout</code> is set |
| Re-suspends when a deep child becomes async | No. Only replacing the root node of <code>#default</code> makes it pending again |
| Waits for lazily loaded routes | No. The guide notes that Vue Router lazy route components "will not trigger &lt;Suspense&gt;"; async components inside them can |
| Is stable API | No. It is marked experimental in 3.5.44 and 3.6.0-rc.12 |

Several of these rows are covered with traces in the [Suspense in Vue 3.5](/interview-question/how-does-suspense-work-in-vue-3-5-after-the-2024-stabilization) question; this one keeps to the basics.

## 6. Suspense vs. Loading Flags

| | Per-component loading flags | <code>&lt;Suspense&gt;</code> |
| :--- | :--- | :--- |
| Where loading UI lives | In each component | Once, in the boundary's <code>#fallback</code> |
| Panels appear | Independently, as each finishes | Together |
| Component code | <code>isLoading</code> ref, <code>v-if</code> branches | Just <code>await</code> in setup |
| Errors | Each handles its own | A parent <code>onErrorCaptured</code> |
| Refetch on prop change | A <code>watch</code> re-runs the fetch | <code>setup()</code> runs once; needs a new <code>key</code> or a watcher |
| API status | Plain Vue, stable | Experimental |

Neither is "right". Flags (often via a composable, see [fetching data in a component](/interview-question/how-do-you-fetch-data-in-a-vue-component-loading-errors-cancellation)) are better when panels are independent and should appear as soon as possible. Suspense is better when a group of components only makes sense together, and in SSR where awaiting in setup gives complete HTML. React has a component with the same name and a similar idea (see [React Suspense](/interview-question/explain-react-suspense-and-its-use-cases)), but the mechanics differ: Vue waits for promises returned from <code>setup()</code>, it does not catch thrown promises during render.

## 7. Common Pitfalls

- **Async setup without a Suspense parent.** The component renders nothing and Vue warns "setup function returned a promise, but no &lt;Suspense&gt; boundary was found in the parent component tree." This includes a root <code>App.vue</code> with top-level <code>await</code>.
- **No error boundary.** A rejected setup is an error, not a state. With no <code>onErrorCaptured</code> above it, Vue 3.5.44 warned "Unhandled error during execution of setup function" and rethrew (in the Node harness it became an uncaught exception that ended the run). No error view appears unless you render one.
- **Expecting a refetch when props change.** <code>setup()</code> runs once per instance. Key the component on the input (<code>:key="userId"</code>) or fetch in a watcher.
- **Lifecycle hooks after the first <code>await</code> in a hand-written <code>async setup()</code>.** They are not registered and Vue warns. Register them before awaiting (in <code>&lt;script setup&gt;</code> the compiler handles this).
- **Relying on it as stable API.** It has carried the experimental label since Vue 3.0 (the same console message is in the v3.0.0 source of <code>Suspense.ts</code>), including in the current 3.5 line; keep its use in a few well-understood places such as layout and route boundaries.
- **Fallback flashing on fast loads.** For first loads that usually finish quickly, consider showing nothing for a moment or using skeletons that match the final layout.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;Suspense&gt;</code> waits for the async components below it and shows one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">#fallback</code> until all of them are ready, then shows the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">#default</code> content in one step."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. What it waits for:</strong> <span style="color:#f0e2c8;">"Two things: components whose <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setup()</code> returns a promise, which includes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;script setup&gt;</code> with top-level <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await</code>, and async components from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineAsyncComponent</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. What it does not do:</strong> <span style="color:#f0e2c8;">"It does not catch errors; a rejected setup goes to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onErrorCaptured</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">app.config.errorHandler</code>. And it does not see data fetched in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onMounted</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. SSR:</strong> <span style="color:#f0e2c8;">"On the server <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">renderToString</code> waits for the async setup and sends complete HTML, which is a big reason Nuxt-style apps use it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Status:</strong> <span style="color:#f0e2c8;">"It is still experimental: the guide has an Experimental Feature warning and Vue 3.5.44 logs that on first use. I use it at a few boundaries, not everywhere."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if an async component has no Suspense above it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For an async <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setup()</code>, nothing renders and Vue warns that no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;Suspense&gt;</code> boundary was found. A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineAsyncComponent</code> wrapper is different: it works on its own and uses its own loading and error components.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle a failure inside Suspense?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Catch it in a parent with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onErrorCaptured</code>, return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">false</code> to stop propagation, and render an error view. To retry, change the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">key</code> on the Suspense or the child so a fresh boundary starts.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does Suspense show the fallback again when the user navigates?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only on the first load by default. Later it goes pending but keeps the old content until the new tree resolves, unless you set its <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">timeout</code> prop.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is it different from React Suspense?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both coordinate loading with a fallback. Vue waits for a promise returned from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setup()</code> or an async component; React suspends when a component reads a resource that is not ready during render.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you put Suspense around every component?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Independent panels that can appear on their own are better with their own loading states. Suspense fits groups that only make sense together, route-level boundaries and SSR.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Suspense** | Built-in that shows <code>#fallback</code> until every async dependency below resolves |
| **#default / #fallback** | The real content, and what to show while it is pending |
| **Async dependency** | An async <code>setup()</code> or an async component inside the boundary |
| **Suspensible** | An async component that lets a parent Suspense control its loading state (the default) |
| **pending / fallback / resolve** | The three events a Suspense boundary emits |
| **onErrorCaptured** | Parent hook that catches a rejected async setup |
| **Experimental** | Not covered by the stability promise; the API may change |

---
**Conclusion:** <code>&lt;Suspense&gt;</code> turns several independent async loads into one loading state: it mounts the default content off-screen, waits for every async <code>setup()</code> and async component inside it, and swaps the fallback for the finished tree in one step. The verified run on Vue 3.5.44 showed exactly that, with no partial frame, plus the parts it leaves to you: errors go to <code>onErrorCaptured</code>, a retry is a new key, and on the server <code>renderToString</code> simply waits and sends complete HTML. It is useful, and it is also still labelled experimental in both the 3.5.44 runtime and the docs, which is worth saying out loud in an interview.`,
    examples: [
      {
        label: "Suspense around an async setup() and an async component, with error handling and retry",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { ref, defineComponent, defineAsyncComponent, h, onErrorCaptured } from "vue";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 1) A component with an async setup(): Suspense waits for its promise.
const Profile = defineComponent({
  props: { fail: Boolean },
  async setup(props) {
    await sleep(40);
    if (props.fail) throw new Error("profile API returned 500");
    const user = { name: "Ada" };
    return () => h("p", \`Profile: \${user.name}\`);
  },
});

// 2) An async component: Suspense waits for its loader too.
const Stats = defineAsyncComponent(async () => {
  await sleep(80);
  return { render: () => h("p", "Stats: 42 orders") };
});

const error = ref(null);
const fail = ref(false);
const attempt = ref(0);
onErrorCaptured((err) => {
  error.value = err.message;
  return false; // handled here, do not propagate
});
const retry = (shouldFail) => {
  error.value = null;
  fail.value = shouldFail;
  attempt.value++; // new key = new Suspense, so it goes pending again
};
</script>

<template>
  <button class="ok" @click="retry(false)">Load</button>
  <button class="bad" @click="retry(true)">Load (failing)</button>
  <p v-if="error" class="error">Could not load: {{ error }}</p>
  <Suspense v-else :key="attempt" @pending="console.log('pending')" @resolve="console.log('resolve')" @fallback="console.log('fallback')">
    <section>
      <Profile :fail="fail" />
      <Stats />
    </section>
    <template #fallback>
      <p>Loading dashboard...</p>
    </template>
  </Suspense>
</template>`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How does <Suspense> work in Vue 3.5 after the 2024 stabilization?",
    seoDescription:
      "Suspense was not stabilized in 2024: Vue 3.5.44 still marks it experimental. How timeout, suspensible nesting and pending really behave, verified.",
    description: `**Question presented to candidate:**
"I read that \`<Suspense>\` became stable with Vue 3.5 in 2024. Is that right? Either way, explain how it behaves in 3.5 when the user switches between async views: when does the fallback appear, what does \`timeout\` do, and how do nested boundaries behave?"

**What a strong answer should cover:**
- **Correct the premise:** Vue 3.5 (released 3 September 2024) did not stabilize Suspense. The 3.5.44 runtime still logs that it is experimental and the guide still opens with an "Experimental Feature" warning; the 3.6 release candidate prints the same message.
- After the first resolve, a boundary only goes **pending again when the root node of \`#default\` is replaced**, and by default it **keeps the old content** until the new tree resolves, with no fallback.
- **\`timeout\`**: \`0\` shows the fallback immediately on a switch, \`N\` after N ms; the value is read when the boundary is created.
- **\`suspensible\`** (added in 3.3) lets a nested Suspense hand its dependencies to the parent so both levels swap in one step.
- Events \`pending\` / \`fallback\` / \`resolve\`, and that lazily loaded **router** components do not trigger Suspense at all.
- What 3.5 actually changed: many Suspense bug fixes across the 3.5.x line, plus neighbouring features (lazy hydration, deferred Teleport), not a status change.

**Clarifying questions expected:**
- "Are we talking about first load or switching between already-loaded views?"
- "Are the views lazy routes, async components, or components with an async \`setup()\`?"

**Code / implementation expected:** Optional — a Suspense with \`timeout\`, or a nested \`suspensible\` boundary, with the observed sequence of events.`,
    answer: `**Target Audience:** Developers who already know what [Suspense](/interview-question/what-is-suspense-in-vue) is and need to predict how it behaves on later updates, with timeouts and with nested boundaries.
**Difficulty:** Medium

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. Every trace was produced on Vue 3.5.44 with the repo's <code>verify-vue-example.mjs</code> harness (SFC mounted in jsdom) or with a Node script running vue-router 5.4.0 in jsdom. The status claims come from the 3.5.44 and 3.6.0-rc.12 runtimes, the vuejs/docs source for the Suspense page, and the vuejs/core changelog. Timings in the traces are rounded to 10 ms and vary slightly between runs.

## 1. First, the Premise: There Was No 2024 Stabilization

The question assumes Suspense became stable with Vue 3.5 in 2024. **That did not happen.**

- **The runtime says so.** Mounting any Suspense boundary on Vue 3.5.44 (published 2026-10-13 according to the vuejs/core changelog) prints, on first use: "&lt;Suspense&gt; is an experimental feature and its API will likely change." The 3.6.0-rc.12 runtime prints the identical line.
- **The docs say so.** The source of the guide page (<a href="https://vuejs.org/guide/built-ins/suspense" target="_blank" rel="noopener noreferrer">vuejs.org/guide/built-ins/suspense</a>, file <code>src/guide/built-ins/suspense.md</code> in vuejs/docs) opens with a warning block: "&lt;Suspense&gt; is an experimental feature. It is not guaranteed to reach stable status and the API may change before it does."
- **The 3.5.0 release notes do not mention it.** The "Aggregated Features List for 3.5" in the vuejs/core changelog (3.5.0, 2024-09-03) has sections for reactivity, SSR, custom elements, Teleport and miscellaneous APIs, and no Suspense entry.

So the honest answer in an interview is: "Suspense was not stabilized in 3.5; it is still flagged experimental today. Here is how it behaves in 3.5, which is what matters for using it." Saying that plainly is a better signal than playing along with the premise.

What *did* change around Suspense, from the changelogs:

| Version | Date | Suspense-related change |
| :--- | :--- | :--- |
| 3.0.0 | 2020-09-18 | Suspense ships, already logging the "experimental feature" message (it is in the v3.0.0 <code>Suspense.ts</code> source) |
| 3.3.0 | 2023-05-11 | "introduce suspensible option for &lt;Suspense&gt;" |
| 3.5.0 | 2024-09-03 | No Suspense feature; neighbours added: lazy hydration for async components, deferred Teleport |
| 3.5.x patches | 2024 to 2026 | A long run of fixes, for example 3.5.43 "keep the boundary pending while its branch is patched" and 3.5.44 "skip rendering async components unmounted while pending" |

## 2. The Core Idea in 3.5

📌 **Interview term: Pending branch vs. active branch** — internally a boundary has an *active branch* (what is on screen) and, while waiting, a *pending branch* rendered into a hidden container. When every dependency in the pending branch resolves, it becomes the active branch.

📌 **Interview term: Root replacement rule** — after the first resolve, a boundary only becomes pending again when the **root node of <code>#default</code> is replaced** (a different component or a new <code>key</code>). The guide states it directly: "New async dependencies nested deeper in the tree will not cause the &lt;Suspense&gt; to revert to a pending state."

📌 **Interview term: timeout** — a prop that decides what to show while a *later* update is pending. The 3.5.44 typings document it: "Switch to fallback content if it takes longer than <code>timeout</code> milliseconds to render the new default content. A <code>timeout</code> value of <code>0</code> will cause the fallback content to be displayed immediately when default content is replaced." With no <code>timeout</code>, the old content stays until the new tree resolves.

📌 **Interview term: suspensible** — a boolean prop (3.3+) for a **nested** Suspense. The typings describe it as "Allow suspense to be captured by parent suspense". With it, the inner boundary passes its dependencies to the outer one instead of acting as an independent boundary with its own fallback.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 280" role="img" aria-label="After the first resolve, replacing the default root makes Suspense pending; without timeout it keeps the old content, with timeout it shows the fallback after the delay">
  <defs>
    <marker id="s35-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="250" y="20" width="220" height="56" rx="10"/>
  <text class="d-text d-accent" x="360" y="44" text-anchor="middle">root of default replaced</text>
  <text class="d-sub" x="360" y="64" text-anchor="middle">event: pending</text>
  <path class="d-edge" d="M 300 80 L 160 136" marker-end="url(#s35-arrow)"/>
  <path class="d-edge" d="M 360 80 L 360 136" marker-end="url(#s35-arrow)"/>
  <path class="d-edge" d="M 420 80 L 560 136" marker-end="url(#s35-arrow)"/>
  <rect class="d-box" x="40" y="142" width="200" height="66" rx="10"/>
  <text class="d-text" x="140" y="168" text-anchor="middle">no timeout</text>
  <text class="d-sub" x="140" y="190" text-anchor="middle">old content stays</text>
  <rect class="d-box" x="260" y="142" width="200" height="66" rx="10"/>
  <text class="d-text" x="360" y="168" text-anchor="middle">timeout 0</text>
  <text class="d-sub" x="360" y="190" text-anchor="middle">fallback at once</text>
  <rect class="d-box" x="480" y="142" width="200" height="66" rx="10"/>
  <text class="d-text" x="580" y="168" text-anchor="middle">timeout 50</text>
  <text class="d-sub" x="580" y="190" text-anchor="middle">fallback after 50 ms</text>
  <rect class="d-box-muted" x="200" y="228" width="320" height="40" rx="10"/>
  <text class="d-sub" x="360" y="253" text-anchor="middle">new tree resolves: event resolve</text>
</svg>

All three paths end the same way: when the new tree resolves, it replaces whatever is on screen and <code>resolve</code> fires. The only difference is what the user looks at in between.

## 3. Verified: the three timeout settings

One file, three builds of the <code>&lt;Suspense&gt;</code> tag. Page A resolves in 20 ms; after the first load the driver switched to Page B, whose <code>async setup()</code> takes 150 ms, and printed each screen change with the time since the click:

\`\`\`
=== <Suspense (no timeout)>
  event: pending
  event: fallback
  event: resolve
switch A -> B (B takes 150ms)
  event: pending
  event: resolve
  +160ms screen: Page B
=== <Suspense :timeout="0">
  event: pending
  event: fallback
  event: resolve
switch A -> B (B takes 150ms)
  event: pending
  event: fallback
  + 10ms screen: Loading...
  event: resolve
  +160ms screen: Page B
=== <Suspense :timeout="50">
  event: pending
  event: fallback
  event: resolve
switch A -> B (B takes 150ms)
  event: pending
  event: fallback
  + 60ms screen: Loading...
  event: resolve
  +160ms screen: Page B
\`\`\`

The first three lines of each run are the initial load, which always shows the fallback. On the switch, the default kept Page A on screen for the whole 150 ms with no <code>fallback</code> event; <code>:timeout="0"</code> showed the fallback right away; <code>:timeout="50"</code> showed it about 50 ms in. The runnable example is the <code>:timeout="50"</code> version.

## 4. Verified: timeout is read once

A variant with buttons that change a reactive <code>timeout</code> before each switch, so the same boundary sees <code>undefined</code>, then <code>0</code>, then <code>50</code> (initial load and the last switch left out):

\`\`\`
switch with timeout=undefined
  event: pending
  event: resolve
  +150ms screen: Page B
switch with timeout=0
  event: pending
  event: resolve
  +160ms screen: Page C
switch with timeout=50
  event: pending
  event: resolve
  + 20ms screen: Page A
\`\`\`

The fallback never appeared, even with <code>timeout</code> set to <code>0</code>. The reason is in the 3.5.44 runtime: <code>createSuspenseBoundary</code> reads <code>vnode.props.timeout</code> once and stores it on the boundary, and later switches use that stored value. So changing <code>timeout</code> on a live boundary has no effect; if it must change, give the Suspense a new <code>key</code> so a new boundary is created. This is undocumented behaviour of an experimental API, so treat it as "how 3.5.44 behaves", not a promise.

## 5. Verified: nested boundaries and suspensible

An outer Suspense wraps a layout (async, 60 ms on the switch) that contains an inner Suspense around a panel (async, 120 ms). The driver swapped both at once, first with a plain inner Suspense, then with <code>suspensible</code> (the initial-load lines are left out here):

\`\`\`
=== inner <Suspense (not suspensible)>
swap layout (60ms) and panel (120ms) together
  outer: pending
  inner: pending
  inner: fallback
  outer: resolve
  screen: [Layout 2](inner loading)
  inner: resolve
  screen: [Layout 2][Panel 2]
=== inner <Suspense suspensible>
swap layout (60ms) and panel (120ms) together
  outer: pending
  inner: pending
  inner: fallback
  outer: resolve
  inner: resolve
  screen: [Layout 2][Panel 2]
\`\`\`

Without <code>suspensible</code>, the outer boundary considered itself done once the layout resolved, and the user saw the new layout with the inner boundary's own fallback for about 60 ms: two visible steps. With <code>suspensible</code>, the outer boundary waited for the panel too, and the screen changed once, straight to the final state. (The inner boundary still logged its own events in both runs; what changed is what reached the screen.) This is the case the guide's "Nested Suspense" section describes for nested and layout-based routes.

## 6. Verified: lazy routes do not trigger Suspense

The guide says Vue Router's lazy route components "are distinct from async components and currently they will not trigger &lt;Suspense&gt;". With vue-router 5.4.0, a <code>&lt;RouterView&gt;</code> wrapping <code>&lt;Suspense :timeout="0"&gt;</code>:

\`\`\`
push /lazy
  at +40ms: route=/ screen="home"
  suspense: pending
  suspense: resolve
  settled : route=/lazy screen="lazy page"
push /async-setup
  suspense: pending
  suspense: fallback
  at +40ms: route=/async-setup screen="fallback"
  suspense: resolve
  settled : route=/async-setup screen="async setup page"
\`\`\`

For the lazy route, the **router** waited for the 80 ms "chunk" before finishing the navigation: the URL and screen stayed on <code>/</code> meanwhile, and Suspense received an already-loaded component and resolved immediately, even with <code>timeout</code> 0. For the route whose <code>setup()</code> is async, the navigation finished at once and **Suspense** showed the fallback. Loading UI for lazy routes therefore belongs to the router (a progress bar driven by navigation guards; see [lazy-loading routes](/interview-question/how-do-you-lazy-load-routes-and-components-in-vue)), not to Suspense.

## 7. Behaviour Summary for 3.5

| Situation | What happens |
| :--- | :--- |
| First load | <code>pending</code>, <code>fallback</code>, then <code>resolve</code> when all dependencies are done |
| Root of <code>#default</code> replaced, no <code>timeout</code> | <code>pending</code>; old content stays; <code>resolve</code> swaps in the new tree |
| Root replaced, <code>timeout</code> 0 or N | Fallback immediately or after N ms, then <code>resolve</code> |
| New async child deeper in the tree | Boundary does not go pending again |
| Nested Suspense without <code>suspensible</code> | Independent boundary with its own fallback |
| Nested Suspense with <code>suspensible</code> | Its dependencies are awaited by the parent; one swap |
| Rejected async setup | An error, routed to <code>onErrorCaptured</code> / <code>app.config.errorHandler</code> |
| Lazy route component | Resolved by the router before navigation; Suspense not involved |
| SSR | <code>renderToString</code> awaits dependencies and sends resolved HTML |

The interplay with transitions and caching is covered in [how Transition, KeepAlive and Suspense compose](/interview-question/how-do-transition-keepalive-and-suspense-compose-in-vue-3).

## 8. Common Pitfalls

- **Quoting a stabilization that did not happen.** Vue 3.5.44 and 3.6.0-rc.12 both log the experimental message, and the docs keep the warning. Check the runtime or the docs page rather than a blog post.
- **Expecting the fallback on every navigation.** By default it only shows on the first load. Set <code>timeout</code> for slow switches.
- **Making <code>timeout</code> reactive.** It is read when the boundary is created; changing it later did nothing in 3.5.44. Re-key the boundary instead.
- **Nested boundaries that flash twice.** A plain inner Suspense produces a two-step reveal when both levels change; <code>suspensible</code> merges them.
- **Waiting on Suspense for lazy routes.** The router resolves those before the navigation commits; Suspense never sees them pending.
- **Depending on internals.** The boundary's internals (pending branch, deps counter) are not public API, and the 3.5.x changelog shows that edge-case behaviour keeps being fixed. Keep Suspense usage simple and covered by tests.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Correct the premise:</strong> <span style="color:#f0e2c8;">"Suspense was not stabilized with 3.5 in 2024. Vue 3.5.44 still logs that it is experimental, the guide still has the warning, and the 3.6 release candidate prints the same message."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. First load vs later:</strong> <span style="color:#f0e2c8;">"On first load it shows the fallback until every async dependency resolves. Later it only goes pending when the root of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">#default</code> is replaced, and by default keeps the old content until the new tree is ready."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. timeout:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">timeout</code> 0 shows the fallback immediately on a switch and N shows it after N ms. In 3.5.44 it is read once, when the boundary is created."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Nesting:</strong> <span style="color:#f0e2c8;">"A nested Suspense with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">suspensible</code>, added in 3.3, hands its dependencies to the parent, so a layout and its page swap in one step instead of two."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Router:</strong> <span style="color:#f0e2c8;">"Lazy route components are resolved by the router before navigation, so they never make Suspense pending; only async <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setup()</code> or async components do."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">So what did Vue 3.5 change for Suspense?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No status change and no new Suspense API. The 3.5 line brought many Suspense bug fixes in patch releases, and neighbouring features such as lazy hydration for async components and deferred Teleport.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did the fallback not appear when I set <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">timeout</code> to 0 at runtime?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The boundary stores the timeout when it is created. Changing the prop later had no effect in 3.5.44; give the Suspense a new <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">key</code> to create a boundary with the new value.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would a deeper async component not trigger the fallback?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">After the first resolve, a new async dependency deeper in the tree does not make the boundary pending again; only replacing the root of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">#default</code> does.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you show loading for lazy routes then?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Through the router: start a progress indicator in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">beforeEach</code> and stop it in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">afterEach</code> or on error, because the navigation itself waits for the chunk.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you use Suspense in production given its status?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, in a few contained places such as route-level boundaries and SSR pages, with tests around them, knowing the API could change in a minor release.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Experimental** | Not covered by the stability promise; still the status of Suspense in 3.5.44 |
| **Active / pending branch** | What is on screen, and the new tree being resolved off-screen |
| **Root replacement rule** | Only replacing the root of <code>#default</code> makes a resolved boundary pending again |
| **timeout** | Delay before the fallback shows on later updates; read when the boundary is created |
| **suspensible** | 3.3+ prop: a nested Suspense lets its parent await its dependencies |
| **pending / fallback / resolve** | The boundary events, in that order on first load |

---
**Conclusion:** The premise is wrong: Vue 3.5 did not stabilize <code>&lt;Suspense&gt;</code> in 2024, and the 3.5.44 runtime, the 3.6 release candidate and the official guide all still call it experimental. What 3.5 offers is a well-exercised experimental component with predictable rules, verified here: the fallback shows on first load, later switches keep the old content unless <code>timeout</code> is set, <code>timeout</code> is read once per boundary, <code>suspensible</code> merges nested boundaries into one reveal, and lazy routes are resolved by the router before Suspense ever sees them. Say the status plainly, then explain those rules.`,
    examples: [
      {
        label: "Suspense with :timeout=\"50\": the old page stays, then the fallback, then the new page",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { shallowRef, defineComponent, h } from "vue";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const view = (name, ms) =>
  defineComponent({
    name,
    async setup() {
      await sleep(ms);
      return () => h("p", name);
    },
  });
const views = { A: view("Page A", 20), B: view("Page B", 150) };
const current = shallowRef(views.A);
const log = (e) => console.log(\`  event: \${e}\`);
</script>

<template>
  <button class="goB" @click="current = views.B">B</button>
  <Suspense :timeout="50" @pending="log('pending')" @fallback="log('fallback')" @resolve="log('resolve')">
    <component :is="current" />
    <template #fallback><p>Loading...</p></template>
  </Suspense>
</template>`,
      },
      {
        label: "Nested Suspense with suspensible: layout and panel swap in one step",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { ref, shallowRef, defineComponent, h } from "vue";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const view = (name, ms) =>
  defineComponent({
    name,
    async setup() {
      await sleep(ms);
      return () => h("span", \`[\${name}]\`);
    },
  });

const layouts = { L1: view("Layout 1", 30), L2: view("Layout 2", 60) };
const layout = shallowRef(layouts.L1);
const panels = { One: view("Panel 1", 30), Two: view("Panel 2", 120) };
const panel = shallowRef(panels.One);
const log = (where, e) => console.log(\`  \${where}: \${e}\`);
</script>

<template>
  <button class="two" @click="layout = layouts.L2; panel = panels.Two">Swap both</button>
  <Suspense @pending="log('outer', 'pending')" @fallback="log('outer', 'fallback')" @resolve="log('outer', 'resolve')">
    <div :key="layout.name">
      <component :is="layout" />
      <Suspense suspensible @pending="log('inner', 'pending')" @fallback="log('inner', 'fallback')" @resolve="log('inner', 'resolve')">
        <component :is="panel" />
        <template #fallback><span>(inner loading)</span></template>
      </Suspense>
    </div>
    <template #fallback><p>(outer loading)</p></template>
  </Suspense>
</template>`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is async setup and top-level await?",
    seoDescription:
      "Top-level await in <script setup> makes setup() async: the compiler wraps it in withAsyncContext, and the component needs Suspense. Verified on Vue 3.5.",
    description: `**Question presented to candidate:**
"In one of our pages, a developer wrote \`const user = await fetchUser(props.id)\` directly in \`<script setup>\`. It works in one place and renders a blank area in another. Explain what top-level \`await\` does to a component, what the compiler generates, and the rules that come with it."

**What a strong answer should cover:**
- A top-level \`await\` in \`<script setup>\` turns the component's **\`setup()\` into an \`async\` function**; the component then needs a **\`<Suspense>\`** ancestor or it renders nothing (Vue warns).
- The compiler wraps each awaited expression in **\`withAsyncContext\`**, which **restores the current component instance** after the \`await\`, so \`onMounted\`, \`inject\` and composables still work after it.
- A **hand-written \`async setup()\`** gets no such help: hooks registered after the first \`await\` are lost with a warning.
- \`setup()\` runs **once per instance**: a prop change does not re-run the awaited fetch; use a \`key\` or a watcher.
- Errors from the awaited promise go to **\`onErrorCaptured\`** / \`app.config.errorHandler\`; on the server, \`renderToString\` awaits it and sends complete HTML.

**Clarifying questions expected:**
- "Is there a \`<Suspense>\` above the place where it renders blank?"
- "Should the data refresh when \`props.id\` changes?"

**Code / implementation expected:** Yes — a component with top-level \`await\` inside \`<Suspense>\`, ideally showing the compiled output or the hook rule.`,
    answer: `**Target Audience:** Developers using <code>&lt;script setup&gt;</code> who want to load data with <code>await</code> and need to know what that changes.
**Difficulty:** Hard

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. The compiled output came from <code>@vue/compiler-sfc</code> 3.5.44's <code>compileScript</code>. The runtime traces came from a Vitest 5.0.5 test (jsdom, <code>@vitejs/plugin-vue</code> 6.0.10, Vue Test Utils 2.5.1) and from the repo's <code>verify-vue-example.mjs</code> harness on Vue 3.5.44.

## 1. Why This Even Matters — A Story First

A tailor is fitting a suit. Normally he measures you, writes everything on a card, and the workshop starts sewing immediately. One day he says: "I need to wait for the fabric delivery before I can write the card." Two problems appear. First, the workshop must know to wait instead of starting with an empty card; someone has to hold the order until the fabric arrives. Second, while he waited he put the card down, and when the fabric comes he has to remember *which customer's* card he was writing.

A top-level <code>await</code> in <code>&lt;script setup&gt;</code> creates exactly those two problems. The component cannot render until the promise settles, so something has to wait for it: that is <code>&lt;Suspense&gt;</code>. And after the <code>await</code>, JavaScript has lost track of "which component am I setting up", so something has to restore it: that is what the compiler's <code>withAsyncContext</code> does.

## 2. The Core Idea

📌 **Interview term: setup()** — the function that runs once when a component instance is created and returns the state and render function. <code>&lt;script setup&gt;</code> is compiled into it (see [the Composition API](/interview-question/what-is-the-composition-api-and-how-does-it-differ-from-the-options-api)).

📌 **Interview term: Async setup** — a <code>setup()</code> that returns a promise. You get one either by writing <code>async setup() { ... }</code> by hand, or by using <code>await</code> at the top level of <code>&lt;script setup&gt;</code>, which the compiler turns into <code>async setup()</code>.

📌 **Interview term: Top-level await** — an <code>await</code> written directly in the <code>&lt;script setup&gt;</code> body, not inside a function. It is the only place in a component where an <code>await</code> pauses the component's creation itself.

📌 **Interview term: Current instance** — Vue keeps a global pointer to "the component whose setup is running now". APIs such as <code>onMounted</code>, <code>inject</code>, <code>getCurrentInstance</code> and most composables use it to know which component to attach to. JavaScript gives no way to keep it across an <code>await</code>: once the function pauses, Vue moves on and the pointer is cleared.

📌 **Interview term: withAsyncContext** — a helper the SFC compiler wraps around each top-level <code>await</code>. It saves the current instance before the await and returns a <code>__restore</code> function that puts it back after, so code after the await behaves as if it were synchronous setup code.

## 3. Verified: what the compiler generates

This <code>UserCard.vue</code> awaits a (simulated) fetch at the top level and registers <code>onMounted</code> *after* the await:

\`\`\`vue
<script setup>
import { ref, onMounted, getCurrentInstance } from "vue";

const props = defineProps({ id: Number });
console.log("before await, instance?", !!getCurrentInstance());

// Top-level await: this makes the component's setup() async.
const user = await new Promise((r) => setTimeout(() => r({ id: props.id, name: "Ada" }), 30));

console.log("after await,  instance?", !!getCurrentInstance());
const visits = ref(1);
// Registered AFTER the await: the compiler restores the instance, so this works.
onMounted(() => console.log("UserCard mounted with", user.name));
</script>
\`\`\`

<code>compileScript</code> from <code>@vue/compiler-sfc</code> 3.5.44 produced (render function trimmed):

\`\`\`js
import { withAsyncContext as _withAsyncContext } from 'vue'

export default {
  __name: 'UserCard',
  props: { id: Number },
  async setup(__props) {

let __temp, __restore

const props = __props;
console.log("before await, instance?", !!getCurrentInstance());

// Top-level await: this makes the component's setup() async.
const user = (
  ([__temp,__restore] = _withAsyncContext(() => new Promise((r) => setTimeout(() => r({ id: props.id, name: "Ada" }), 30)))),
  __temp = await __temp,
  __restore(),
  __temp
);
...
\`\`\`

Two facts are visible: <code>setup</code> became <code>async setup</code>, and the awaited expression is wrapped so that <code>__restore()</code> runs straight after the await resolves.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 260" role="img" aria-label="withAsyncContext saves the current instance before the await and restores it after, so hooks registered later still attach">
  <defs>
    <marker id="aw-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="40" width="200" height="70" rx="10"/>
  <text class="d-text" x="120" y="68" text-anchor="middle">setup starts</text>
  <text class="d-sub" x="120" y="90" text-anchor="middle">current instance set</text>
  <path class="d-edge-accent" d="M 224 75 L 262 75" marker-end="url(#aw-arrow)"/>
  <rect class="d-box-accent" x="268" y="40" width="190" height="70" rx="10"/>
  <text class="d-text d-accent" x="363" y="68" text-anchor="middle">await</text>
  <text class="d-sub" x="363" y="90" text-anchor="middle">instance saved, cleared</text>
  <path class="d-edge-accent" d="M 462 75 L 500 75" marker-end="url(#aw-arrow)"/>
  <rect class="d-box" x="506" y="40" width="200" height="70" rx="10"/>
  <text class="d-text" x="606" y="68" text-anchor="middle">__restore()</text>
  <text class="d-sub" x="606" y="90" text-anchor="middle">instance put back</text>
  <rect class="d-box-muted" x="40" y="160" width="300" height="70" rx="10"/>
  <text class="d-text" x="190" y="188" text-anchor="middle">script setup top-level await</text>
  <text class="d-sub" x="190" y="210" text-anchor="middle">hooks after await work</text>
  <rect class="d-box-muted" x="380" y="160" width="300" height="70" rx="10"/>
  <text class="d-text" x="530" y="188" text-anchor="middle">hand-written async setup</text>
  <text class="d-sub" x="530" y="210" text-anchor="middle">no restore, hooks lost</text>
</svg>

The top row is what the compiled code does. The bottom row is the practical consequence: the restore step exists only in compiled <code>&lt;script setup&gt;</code>, not in an <code>async setup()</code> you write yourself.

## 4. Verified: the three behaviours that matter

A Vitest test mounted three cases: <code>UserCard</code> inside a <code>Dashboard.vue</code> that wraps it in <code>&lt;Suspense&gt;</code>; <code>UserCard</code> mounted on its own; and a hand-written <code>async setup()</code> that registers <code>onMounted</code> after an await. Console output, in order, with a blank line between tests and the "at Console output, in order, with a blank line between tests:lt;ComponentConsole output, in order, with a blank line between tests:gt;" trace lines under each warning trimmed:

\`\`\`
<Suspense> is an experimental feature and its API will likely change.
before await, instance? true
first render: Loading user...
after await,  instance? true
UserCard mounted with Ada
resolved    : Ada (#7), visits 1

before await, instance? true
[Vue warn]: Component <UserCard>: setup function returned a promise, but no <Suspense> boundary was found in the parent component tree. A component with async setup() must be nested in a <Suspense> in order to be rendered.
after await,  instance? true
no Suspense html: ""

[Vue warn]: onMounted is called when there is no active component instance to be associated with. Lifecycle injection APIs can only be used during execution of setup(). If you are using async setup(), make sure to register lifecycle hooks before the first await statement.
manual: manual
\`\`\`

1. **Inside Suspense it works end to end.** The fallback rendered first, the instance was still available after the await, and the <code>onMounted</code> registered after the await ran.
2. **Without Suspense it renders nothing.** Vue warned and the component's HTML was an empty string. This is the "blank area" from the question. It happens even to the root: a playground <code>App.vue</code> with a top-level <code>await</code> produced the same warning for <code>&lt;App&gt;</code> and rendered nothing.
3. **Hand-written <code>async setup()</code> loses hooks after <code>await</code>.** The component rendered ("manual"), but the hook was never registered and Vue explained why. Register hooks, <code>watch</code>es and <code>inject</code>s before the first await.

## 5. Verified: setup runs once

The runnable example renders a <code>UserCard</code> with a hand-written <code>async setup()</code> that fetches by <code>props.id</code>, inside <code>&lt;Suspense&gt;</code>. "Next user" changes the id; a checkbox switches the child's <code>key</code> from a constant to the id:

\`\`\`
  setup runs, fetching id 1
[app] RENDERED: Next user key by idLoading user...
  UserCard mounted (id 1)
screen: Ada (prop id is now 1)
click Next (no key)
screen: Ada (prop id is now 2)
enable key, then click Next
  setup runs, fetching id 2
  UserCard mounted (id 2)
  setup runs, fetching id 3
  UserCard mounted (id 3)
screen: Linus (prop id is now 3)
\`\`\`

Without a key, the prop updated to 2 but the screen still showed Ada: <code>setup()</code> does not re-run, so the awaited data is a one-time snapshot. Turning on the key changed it from <code>'same'</code> to the current id, which created a fresh instance (fetching id 2); the next click fetched id 3. Keying on the input is the simplest way to make an awaited load follow its props; a [watcher](/interview-question/what-is-the-difference-between-watch-and-watcheffect) or a data-fetching composable is the alternative when you do not want to remount.

## 6. Top-Level Await vs. Other Ways to Load Data

| | Top-level <code>await</code> | Fetch in <code>onMounted</code> / a composable | Router guard or loader |
| :--- | :--- | :--- | :--- |
| Needs <code>&lt;Suspense&gt;</code> | Yes | No | No |
| Loading UI | The Suspense <code>#fallback</code> | Your own <code>isLoading</code> state | Router-level indicator |
| Component code | Reads like synchronous code | Refs that start empty | Data arrives as props or a store |
| Re-runs on prop change | No (re-key or watch) | Yes, with a watcher | On each navigation |
| SSR | Awaited by <code>renderToString</code> | <code>onMounted</code> does not run on the server | Depends on the framework |
| Status | Relies on Suspense, which is experimental | Stable | Stable |

On SSR specifically: <code>renderToString</code> awaited an async setup in the [Suspense question](/interview-question/what-is-suspense-in-vue)'s verified run and sent complete HTML. That is the main reason frameworks such as [Nuxt](/interview-question/what-is-nuxt-and-how-does-it-relate-to-vue) lean on awaiting in setup.

## 7. Rules of Thumb

- **Await at the top level only in <code>&lt;script setup&gt;</code>,** where <code>withAsyncContext</code> protects you. In a hand-written <code>async setup()</code>, register every hook before the first await.
- **Make sure a <code>&lt;Suspense&gt;</code> is above it.** Usually one at the layout or route level (see [how Transition, KeepAlive and Suspense compose](/interview-question/how-do-transition-keepalive-and-suspense-compose-in-vue-3)).
- **Run independent requests in parallel.** <code>const [user, orders] = await Promise.all([getUser(), getOrders()])</code> instead of two awaits in a row, which would wait for one before starting the other.
- **Catch errors above.** A rejected await is an error routed to <code>onErrorCaptured</code> in a parent or <code>app.config.errorHandler</code> (see [error handling](/interview-question/how-do-you-handle-errors-in-vue-onerrorcaptured-app-config-errorhandler)).
- **Do not use it for data that must refresh.** Prefer a composable with a watcher when the input changes while the component stays mounted.

## 8. Common Pitfalls

- **No Suspense above.** The component renders nothing and warns that no &lt;Suspense&gt; boundary was found, including when it is the root <code>App.vue</code>.
- **Hooks after <code>await</code> in a hand-written <code>async setup()</code>.** They are dropped with the "no active component instance" warning. <code>&lt;script setup&gt;</code> is safe because of <code>withAsyncContext</code>.
- **Awaiting inside a nested function and expecting the same protection.** Only top-level awaits in <code>&lt;script setup&gt;</code> are wrapped. An <code>await</code> inside a helper or a <code>.then</code> callback runs with no current instance. Verified: a <code>useLoader()</code> helper that awaited and then called <code>onMounted</code> logged <code>inside helper after its await, instance? false</code> plus the "no active component instance" warning, while the line after <code>await useLoader()</code> at the top level logged <code>instance? true</code>.
- **Expecting a refetch when props change.** <code>setup()</code> runs once; the verified run kept showing Ada for id 2 until the component was re-keyed.
- **Sequential awaits for independent data.** Each await adds its full latency; use <code>Promise.all</code>.
- **Forgetting that Suspense is experimental.** Top-level await depends on it; that dependency is a reasonable trade-off, but it should be a deliberate one.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"A top-level <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;script setup&gt;</code> makes the component's <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setup()</code> async, so the component can only render once that promise settles."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. What the compiler does:</strong> <span style="color:#f0e2c8;">"It wraps each awaited expression in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">withAsyncContext</code>, which saves the current instance and restores it after the await, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onMounted</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inject</code> and composables still work after it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The requirement:</strong> <span style="color:#f0e2c8;">"An async setup needs a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;Suspense&gt;</code> ancestor. Without one, Vue warns that no Suspense boundary was found and renders nothing, even for the root component."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The hand-written case:</strong> <span style="color:#f0e2c8;">"In a manual <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">async setup()</code> there is no restore, so hooks registered after the first <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await</code> are dropped with a warning. I register them before awaiting."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Its limits:</strong> <span style="color:#f0e2c8;">"Setup runs once, so awaited data does not follow prop changes; I re-key the component or use a watcher-based composable, and catch errors with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onErrorCaptured</code>."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">onMounted</code> after an <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">await</code> work in <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&lt;script setup&gt;</code> but not in <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">async setup()</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The SFC compiler wraps each top-level await in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">withAsyncContext</code> and calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__restore()</code> after it, which puts the current instance back. A hand-written <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">async setup()</code> has no such wrapper, so after the first await there is no current instance.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is rendered while the await is pending?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The nearest <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;Suspense&gt;</code> shows its <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">#fallback</code> on first load. Without a Suspense the component renders nothing at all.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you load two things without waiting twice?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Start both and await them together with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Promise.all</code>, so the total wait is the slower request, not the sum.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does top-level await work with SSR?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">renderToString</code> awaits the async setup and sends the resolved HTML, which is why SSR frameworks favour awaiting data in setup.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">await</code> inside a composable called from setup?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The composable can return a promise you await at the top level, and the compiler protects that await. An <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await</code> inside the composable itself is not wrapped, so the composable should register its hooks and injections before awaiting.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Async setup** | A <code>setup()</code> that returns a promise |
| **Top-level await** | <code>await</code> directly in <code>&lt;script setup&gt;</code>; makes setup async |
| **Current instance** | Vue's pointer to the component being set up; lost across an <code>await</code> |
| **withAsyncContext** | Compiler helper that saves and restores the current instance around each top-level await |
| **Suspense** | Required ancestor that waits for async setup and shows a fallback |
| **onErrorCaptured** | Parent hook that receives a rejected async setup |

---
**Conclusion:** A top-level <code>await</code> in <code>&lt;script setup&gt;</code> compiles to an <code>async setup()</code> in which every awaited expression is wrapped in <code>withAsyncContext</code>, so the component instance is restored after each await and hooks registered later still attach. The verified runs on Vue 3.5.44 showed the three rules that follow: the component needs a <code>&lt;Suspense&gt;</code> above it or it renders nothing, a hand-written <code>async setup()</code> gets no restore and loses hooks registered after its first await, and setup runs once, so awaited data does not follow prop changes unless the component is re-keyed. Use it where a whole subtree should appear only when its data is ready, especially with SSR, and keep data that must refresh in a composable.`,
    examples: [
      {
        label: "Async setup inside Suspense: hooks before await, and re-keying to refetch",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { ref, defineComponent, h, onMounted } from "vue";

// Simulated API call.
const fetchUser = (id) =>
  new Promise((r) => setTimeout(() => r({ id, name: ["Ada", "Grace", "Linus"][id - 1] }), 40));

// Equivalent to a child .vue file whose <script setup> does: const user = await fetchUser(props.id)
const UserCard = defineComponent({
  props: { id: Number },
  async setup(props) {
    // Hooks go BEFORE the first await in a hand-written async setup().
    onMounted(() => console.log(\`  UserCard mounted (id \${props.id})\`));
    console.log(\`  setup runs, fetching id \${props.id}\`);
    const user = await fetchUser(props.id);
    return () => h("p", { class: "card" }, \`\${user.name} (prop id is now \${props.id})\`);
  },
});

const id = ref(1);
const remount = ref(false); // when true, :key forces a fresh setup per id
</script>

<template>
  <button class="next" @click="id = (id % 3) + 1">Next user</button>
  <label><input type="checkbox" class="remount" v-model="remount" /> key by id</label>
  <Suspense>
    <UserCard :id="id" :key="remount ? id : 'same'" />
    <template #fallback><p>Loading user...</p></template>
  </Suspense>
</template>`,
      },
      {
        label: "UserCard.vue with top-level await, compiled with withAsyncContext",
        tech: "vue",
        runnable: false,
        code: `<script setup>
import { ref, onMounted, getCurrentInstance } from "vue";

const props = defineProps({ id: Number });
console.log("before await, instance?", !!getCurrentInstance());

// Top-level await: this makes the component's setup() async.
const user = await new Promise((r) => setTimeout(() => r({ id: props.id, name: "Ada" }), 30));

console.log("after await,  instance?", !!getCurrentInstance());
const visits = ref(1);
// Registered AFTER the await: the compiler restores the instance, so this works.
onMounted(() => console.log("UserCard mounted with", user.name));
</script>

<template>
  <p class="card">{{ user.name }} (#{{ user.id }}), visits {{ visits }}</p>
</template>`,
      },
      {
        label: "Vitest: Suspense, no Suspense, and hooks after await in a hand-written async setup",
        tech: "js",
        runnable: false,
        code: `import { test, expect } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { Suspense, defineComponent, h, onMounted } from "vue";
import Dashboard from "./Dashboard.vue";
import UserCard from "./UserCard.vue";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

test("script setup with top-level await inside Suspense", async () => {
  const w = mount(Dashboard);
  console.log("first render:", w.text());
  await sleep(50); await flushPromises();
  console.log("resolved    :", w.text());
  expect(w.text()).toContain("Ada");
});

test("async component without a Suspense boundary", async () => {
  const w = mount(UserCard, { props: { id: 1 } });
  await sleep(50); await flushPromises();
  console.log("no Suspense html:", JSON.stringify(w.html()));
});

test("hand-written async setup(): hooks after await", async () => {
  const Manual = defineComponent({
    async setup() {
      await sleep(10);
      onMounted(() => console.log("never logged"));
      return () => h("p", "manual");
    },
  });
  const w = mount({ render: () => h(Suspense, null, { default: () => h(Manual) }) });
  await sleep(30); await flushPromises();
  console.log("manual:", w.text());
});`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How does defineAsyncComponent work with loading, error and retry in 2025?",
    seoDescription:
      "defineAsyncComponent wraps a loader with loading and error components, delay, timeout and onError retry, plus 3.5 lazy hydration. Traced on Vue 3.5.44.",
    description: `**Question presented to candidate:**
"Our analytics page lazy-loads a heavy chart with \`defineAsyncComponent\`. On flaky mobile networks the chunk sometimes fails and users see nothing. Walk me through the options \`defineAsyncComponent\` gives you for loading and error states, how you would add retries, and what changed recently."

**What a strong answer should cover:**
- \`defineAsyncComponent(loader)\` returns a **wrapper component** that calls the loader the first time it renders and **caches** the resolved component for every later use.
- The options object: **\`loader\`**, **\`loadingComponent\`**, **\`errorComponent\`**, **\`delay\`** (default 200 ms before the loading component shows), **\`timeout\`** (no timeout by default), **\`suspensible\`**, **\`onError(error, retry, fail, attempts)\`** and, since 3.5, **\`hydrate\`**.
- **Retry** through \`onError\`: call \`retry()\` to run the loader again, or \`fail()\` to give up and show \`errorComponent\`.
- Inside a **\`<Suspense>\`** the component is suspensible by default and its own loading, error, delay and timeout options are ignored; \`suspensible: false\` opts out.
- **Lazy hydration (3.5)**: \`hydrateOnIdle\`, \`hydrateOnVisible\`, \`hydrateOnMediaQuery\`, \`hydrateOnInteraction\` for server-rendered pages.
- The loader must resolve to a component or an ES module whose \`default\` is one.

**Clarifying questions expected:**
- "How many retries are acceptable before showing an error, and should the user be able to retry manually?"
- "Is the page server-rendered?"

**Code / implementation expected:** Yes — a \`defineAsyncComponent\` with loading and error components, \`delay\`, \`timeout\` and an \`onError\` retry policy.`,
    answer: `**Target Audience:** Developers who split heavy components into separate chunks and need loading, error and retry behaviour they can rely on.
**Difficulty:** Hard

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. Every trace was produced on Vue 3.5.44, with the repo's <code>verify-vue-example.mjs</code> harness (SFC mounted in jsdom) or a Node script (server render plus jsdom hydration). Defaults are quoted from the 3.5.44 runtime source and typings. A real network is not involved: failures are simulated by a loader that rejects, which is what a failed <code>import()</code> does.

## 1. Why This Even Matters — A Story First

You order a piece of furniture that is not in the showroom. The shop does three sensible things. If the warehouse is quick, they just bring it out, and you never see a "please wait" sign. If it takes more than a moment, they put up a sign so you know something is happening. If the van breaks down, they try again a couple of times before telling you, politely, that it is not coming today. And once it arrives, it stays in the showroom; the next customer who wants it does not wait for another van.

<code>defineAsyncComponent</code> is that shop. The "warehouse" is a network request for a JavaScript chunk, the sign is a <code>loadingComponent</code> shown after a <code>delay</code>, the polite message is an <code>errorComponent</code>, the retries are your <code>onError</code> policy, and the showroom is the cache of the resolved component.

## 2. The Core Idea

📌 **Interview term: Async component** — a component whose definition is loaded on demand. <code>defineAsyncComponent(() =&gt; import("./Chart.vue"))</code> returns a wrapper (named <code>AsyncComponentWrapper</code> in Vue's warnings) that you use like any component. The bundler turns the dynamic <code>import()</code> into a separate chunk (see [lazy-loading routes and components](/interview-question/how-do-you-lazy-load-routes-and-components-in-vue)).

📌 **Interview term: Loader** — the function that returns a promise of the component. It is called the first time the wrapper renders, and the result is cached for every later instance.

The full options, as typed in Vue 3.5.44 (<code>AsyncComponentOptions</code>):

| Option | Meaning | Default in 3.5.44 |
| :--- | :--- | :--- |
| <code>loader</code> | <code>() =&gt; Promise&lt;Component or module&gt;</code> | required |
| <code>loadingComponent</code> | Shown while loading, after <code>delay</code> | none |
| <code>errorComponent</code> | Shown on failure or timeout; receives an <code>error</code> prop | none |
| <code>delay</code> | Milliseconds before <code>loadingComponent</code> appears | <code>200</code> |
| <code>timeout</code> | Milliseconds before giving up and showing <code>errorComponent</code> | none (never times out) |
| <code>suspensible</code> | Let a parent <code>&lt;Suspense&gt;</code> control loading | <code>true</code> |
| <code>onError</code> | <code>(error, retry, fail, attempts)</code>, your retry policy | none |
| <code>hydrate</code> | Lazy hydration strategy (3.5+) | hydrate immediately |

📌 **Interview term: delay** — exists to avoid a loading flash. On a fast connection the chunk arrives within the delay and the user never sees a spinner flicker for one frame.

📌 **Interview term: onError / retry / fail** — called when the loader rejects. <code>retry()</code> runs the loader again; <code>fail()</code> gives up and renders <code>errorComponent</code>. <code>attempts</code> starts at 1 for the first failure.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="Async component states: nothing, then loading after delay, then loaded, or error after onError calls fail or the timeout passes">
  <defs>
    <marker id="ac-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="40" width="170" height="60" rx="10"/>
  <text class="d-text" x="105" y="66" text-anchor="middle">loader called</text>
  <text class="d-sub" x="105" y="86" text-anchor="middle">nothing shown</text>
  <path class="d-edge" d="M 194 70 L 252 70" marker-end="url(#ac-arrow)"/>
  <text class="d-sub" x="223" y="58" text-anchor="middle">delay</text>
  <rect class="d-box" x="258" y="40" width="190" height="60" rx="10"/>
  <text class="d-text" x="353" y="66" text-anchor="middle">loadingComponent</text>
  <text class="d-sub" x="353" y="86" text-anchor="middle">still waiting</text>
  <path class="d-edge-accent" d="M 452 70 L 510 70" marker-end="url(#ac-arrow)"/>
  <rect class="d-box-accent" x="516" y="40" width="184" height="60" rx="10"/>
  <text class="d-text d-accent" x="608" y="66" text-anchor="middle">component</text>
  <text class="d-sub" x="608" y="86" text-anchor="middle">cached for reuse</text>
  <path class="d-edge-dashed" d="M 353 104 L 353 156" marker-end="url(#ac-arrow)"/>
  <text class="d-sub" x="430" y="134" text-anchor="middle">loader rejects</text>
  <rect class="d-box" x="248" y="162" width="210" height="60" rx="10"/>
  <text class="d-text" x="353" y="188" text-anchor="middle">onError</text>
  <text class="d-sub" x="353" y="208" text-anchor="middle">retry or fail</text>
  <path class="d-edge-dashed" d="M 248 192 L 110 192 L 110 104" marker-end="url(#ac-arrow)"/>
  <text class="d-sub" x="160" y="182" text-anchor="middle">retry</text>
  <path class="d-edge-dashed" d="M 462 192 L 600 192 L 600 236" marker-end="url(#ac-arrow)"/>
  <text class="d-sub" x="540" y="182" text-anchor="middle">fail</text>
  <rect class="d-box-muted" x="510" y="240" width="190" height="50" rx="10"/>
  <text class="d-text" x="605" y="270" text-anchor="middle">errorComponent</text>
</svg>

A timeout also leads to <code>errorComponent</code>, but it is not final. A component whose loader takes 150 ms, with <code>timeout: 60</code> and <code>delay: 0</code>, next to one whose <code>onError</code> neither retries nor fails (times are measured after the harness's initial 30 ms settle, "at" lines trimmed):

\`\`\`
  onError called, doing nothing
[app] RENDERED: [loading][loading]
[Vue warn]: Unhandled error during execution of async component loader
Error: Async component timed out after 60ms.
+40ms slow=[error: Async component timed out after 60ms.] silent=[loading]
+60ms slow=[error: Async component timed out after 60ms.] silent=[loading]
+150ms slow=[slow loaded] silent=[loading]
\`\`\`

The timed-out component showed the error component with the message "Async component timed out after 60ms.", and then **replaced it with the real component when the slow request finally succeeded**. The component whose <code>onError</code> made no decision stayed on its loading component for good.

## 3. Verified: two failures, then success

The runnable example's loader fails on its first two calls and succeeds on the third. It has <code>delay: 40</code>, <code>timeout: 1000</code> and an <code>onError</code> that retries while <code>attempts &lt;= 3</code>. The driver clicked "Show chart", waited, hid it, and showed it again, printing each screen change with the time since the last "Show" click:

\`\`\`
[app] RENDERED: Show chart
click Show
  loader call #1
  + 50ms screen: Loading chart...
  onError attempt 1: chunk request 1 failed
  loader call #2
  onError attempt 2: chunk request 2 failed
  loader call #3
  +200ms screen: Chart loaded
  +420ms screen: (nothing)
Hide, then Show again
  +  0ms screen: Chart loaded
\`\`\`

- Nothing was shown for the first 40 ms, then <code>Loading chart...</code> (the <code>delay</code> at work).
- The two failures never reached the screen: <code>onError</code> retried and the loading component stayed up.
- After "Hide, then Show again" (the <code>(nothing)</code> line is the Hide click), the chart appeared instantly with **no loader call**: the resolved component is cached for the lifetime of the page.

## 4. Verified: when every attempt fails

The same file with the loader set to always fail:

\`\`\`
click Show
  loader call #1
  + 50ms screen: Loading chart...
  onError attempt 1: chunk request 1 failed
  loader call #2
  onError attempt 2: chunk request 2 failed
  loader call #3
  onError attempt 3: chunk request 3 failed
  loader call #4
  onError attempt 4: chunk request 4 failed
[Vue warn]: Unhandled error during execution of async component loader
  at <AsyncComponentWrapper key=0 >
  at <App>
  +260ms screen: Error: chunk request 4 failed
  +410ms screen: (nothing)
Hide, then Show again
  loader call #5
  + 40ms screen: Loading chart...
  onError attempt 4: chunk request 5 failed
[Vue warn]: Unhandled error during execution of async component loader
  at <AsyncComponentWrapper key=0 >
  at <App>
  + 60ms screen: Error: chunk request 5 failed
\`\`\`

(The error's stack trace lines are trimmed.) Three details here are easy to get wrong in an interview:

1. **<code>fail()</code> shows <code>errorComponent</code> and also reports the error.** The final failure reached the screen as <code>Error: chunk request 4 failed</code> through the <code>error</code> prop, and Vue logged "Unhandled error during execution of async component loader" because nothing above caught it. An <code>onErrorCaptured</code> in a parent or <code>app.config.errorHandler</code> would receive it (see [error handling in Vue](/interview-question/how-do-you-handle-errors-in-vue-onerrorcaptured-app-config-errorhandler)).
2. **A failed load is not cached.** Mounting again called the loader a fifth time, so a manual "Try again" button can be as simple as re-rendering the component.
3. **The attempt counter is not reset.** On the remount, <code>onError</code> received <code>attempts</code> 4, not 1, so the "retry 3 times" policy failed immediately. In the 3.5.44 source, the <code>retries</code> counter lives in the closure created by <code>defineAsyncComponent</code> and is only ever incremented. If each mount should get a fresh budget, keep your own counter or create the async component per use.

## 5. Verified: inside Suspense the options are ignored

Two async components with <code>loadingComponent</code> and <code>delay: 0</code> inside one <code>&lt;Suspense&gt;</code>: <code>A</code> is suspensible (the default) and loads in 80 ms, <code>B</code> has <code>suspensible: false</code> and loads in 200 ms:

\`\`\`
[app] RENDERED: [Suspense fallback]
+60ms : [Suspense fallback]
+140ms: [loaded suspensible=true][own loading suspensible=false]
+260ms: [loaded suspensible=true][loaded suspensible=false]
\`\`\`

A's own loading component never appeared; [Suspense](/interview-question/what-is-suspense-in-vue) showed its fallback until A was ready. B did not hold the boundary up: Suspense resolved once A was done, and B showed its own loading component until it finished.

## 6. Verified: a plain object with <code>default</code> is not a module

A real <code>import()</code> resolves to a module namespace object, and Vue unwraps its <code>default</code>. An early draft of the runnable example simulated the import by returning a plain object <code>{ default: { render } }</code>:

\`\`\`
[Vue warn]: Component is missing template or render function:  { default: { render: [Function: render] } }
  at <Anonymous key=0 >
  at <AsyncComponentWrapper key=0 >
  at <App>
\`\`\`

The 3.5.44 source only unwraps when the result has <code>__esModule</code> or a <code>Symbol.toStringTag</code> of <code>"Module"</code>, so a hand-made <code>{ default }</code> object was treated as the component itself. Return the component directly from a custom loader, or return a real module.

## 7. Lazy Hydration (Vue 3.5)

📌 **Interview term: Lazy hydration** — for server-rendered pages, the <code>hydrate</code> option delays when an async component becomes interactive on the client. Vue 3.5 ships four strategies: <code>hydrateOnIdle</code>, <code>hydrateOnVisible</code>, <code>hydrateOnMediaQuery</code> and <code>hydrateOnInteraction</code> ("lazy hydration strategies for async components" in the 3.5.0 changelog, 2024-09-03). Covered in depth in [lazy hydration strategies](/interview-question/what-is-lazy-hydration-in-vue-3-5-hydrate-strategies-idle-visible-interaction).

A script server-rendered an app with a <code>hydrate: hydrateOnInteraction("click")</code> counter, then hydrated that HTML in jsdom and clicked twice:

\`\`\`
  [server] loader called
server HTML: <div><p>static header</p><button>clicked 0</button></div>
  [client] loader called
after hydrate(): loader calls = 1 | button: clicked 0
  Counter hydrated (onMounted)
after 1st click : loader calls = 1 | button: clicked 1
after 2nd click : loader calls = 1 | button: clicked 2
\`\`\`

Two findings. **Hydration** (and <code>onMounted</code>) waited for the first click, and that click was not lost: it counted as <code>clicked 1</code>. But the **loader ran as soon as the client app was mounted**, before any interaction. In 3.5.44's <code>__asyncHydrate</code>, the component is loaded first and only the hydrate call is handed to the strategy. So lazy hydration defers the work of hydrating, not the download; it is not a substitute for splitting code that should never be fetched.

## 8. Building a Good Policy

| Concern | Recommendation |
| :--- | :--- |
| Spinner flicker | Keep a <code>delay</code> (the 200 ms default is reasonable) |
| Slow networks | A <code>timeout</code> of several seconds, so users get an error instead of an endless spinner |
| Flaky networks | Retry in <code>onError</code> a small number of times with a growing pause (<code>setTimeout(retry, 500 * attempts)</code>) |
| Real errors (a syntax error in the chunk) | Do not retry forever; call <code>fail()</code> after the budget |
| User recovery | An <code>errorComponent</code> with a "Try again" action that re-renders the wrapper |
| Visibility | Report the final error from <code>app.config.errorHandler</code> |
| Inside Suspense | Rely on the Suspense fallback, or set <code>suspensible: false</code> for parts that should load on their own |

In a route table, do not wrap route components in <code>defineAsyncComponent</code>: Vue Router handles <code>() =&gt; import()</code> itself, and vue-router 5.4.0 warns if you wrap it (verified in the [lazy-loading](/interview-question/how-do-you-lazy-load-routes-and-components-in-vue) question).

## 9. Common Pitfalls

- **Expecting a fresh retry budget per mount.** <code>attempts</code> carries on from earlier failures, as the remount above showed.
- **Not calling <code>retry()</code> or <code>fail()</code>.** <code>onError</code> owns the decision; when it did neither, the verified component stayed on its loading component indefinitely.
- **Treating <code>timeout</code> as final.** After the timeout the error component shows, but a late success still swaps in the real component, so an error view with a "Try again" button can be replaced under the user.
- **Forgetting that <code>fail()</code> also reports the error.** Expect the "Unhandled error" warning unless a parent handler catches it.
- **Faking an import with <code>{ default }</code>.** Only a real module namespace is unwrapped; a plain object is treated as the component.
- **Setting loading options inside Suspense and wondering why they do nothing.** Suspensible async components defer to the boundary; use <code>suspensible: false</code> to keep them.
- **Thinking lazy hydration delays the download.** It delays hydration; the loader ran at mount in the verified run.

## 10. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineAsyncComponent</code> turns a loader such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">() =&gt; import('./Chart.vue')</code> into a component that fetches the code on first render and caches it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The states:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">loadingComponent</code> appears after <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">delay</code>, 200 ms by default, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">errorComponent</code> on failure or after <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">timeout</code>, and the real component once the loader resolves."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Retries:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onError(error, retry, fail, attempts)</code> is the retry policy: I retry a few times with a growing pause, then call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fail()</code>, and report the final error from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">app.config.errorHandler</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Suspense:</strong> <span style="color:#f0e2c8;">"Inside a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;Suspense&gt;</code> it is suspensible by default, so its own loading and error options are ignored; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">suspensible: false</code> keeps them."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. What is new:</strong> <span style="color:#f0e2c8;">"Vue 3.5 added the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hydrate</code> option with idle, visible, media-query and interaction strategies for SSR, which delays hydration, not the download."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is the loaded component fetched again on every mount?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Once the loader resolves, the component is cached in the wrapper and reused instantly. A failed load is not cached, so the next mount calls the loader again.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did my retry policy stop retrying after a remount?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">attempts</code> counter belongs to the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineAsyncComponent</code> call, not to the mounted instance, and it is never reset. In my test the remount's first failure arrived as attempt 4. Keep your own counter if each mount needs a fresh budget.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Should route components use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">defineAsyncComponent</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Vue Router already accepts <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">() =&gt; import()</code> for lazy routes, and vue-router 5.4 warns when a route component is wrapped in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineAsyncComponent</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">timeout</code> do if the request eventually succeeds?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The error component shows with "Async component timed out", and when the late request resolves Vue swaps in the real component anyway. I verified that on 3.5.44, so the error view should not assume it is the end state.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">hydrateOnVisible</code> stop the chunk from downloading?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. In my trace with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hydrateOnInteraction</code>, the loader ran when the client app mounted and only hydration waited for the click. Lazy hydration saves hydration work, not network.</span>
</div>

</div>

## 11. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **defineAsyncComponent** | Creates a wrapper that loads the real component on first render |
| **Loader** | Function returning a promise of the component; result cached once resolved |
| **delay** | Wait before showing <code>loadingComponent</code> (200 ms default) |
| **timeout** | Give up and show <code>errorComponent</code> after this long (none by default) |
| **onError** | Retry policy hook: <code>(error, retry, fail, attempts)</code> |
| **Suspensible** | Lets a parent Suspense own the loading state (default true) |
| **Lazy hydration** | 3.5+: delay hydrating a server-rendered async component until idle, visible, a media query or an interaction |

---
**Conclusion:** <code>defineAsyncComponent</code> wraps a loader in a component with a small state machine: nothing, then a loading component after <code>delay</code>, then the cached component, or an error component when <code>onError</code> calls <code>fail()</code> or the <code>timeout</code> passes. The verified runs on Vue 3.5.44 showed retries hiding transient failures, the resolved component being reused instantly, failed loads being retried on remount, and three less obvious facts: the attempt counter is never reset, a hand-made <code>{ default }</code> object is not unwrapped, and lazy hydration with <code>hydrateOnInteraction</code> delays hydration but not the download. Inside <code>&lt;Suspense&gt;</code> the boundary takes over unless you opt out with <code>suspensible: false</code>.`,
    examples: [
      {
        label: "defineAsyncComponent with delay, timeout, loading and error components and an onError retry policy",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { ref, defineAsyncComponent, h } from "vue";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let calls = 0;
const failFirst = ref(2); // how many loader calls fail before one succeeds

// Stands in for () => import("./Chart.vue"): the network fails twice, then works.
async function loadChart() {
  const n = ++calls;
  console.log(\`  loader call #\${n}\`);
  await sleep(60);
  if (n <= failFirst.value) throw new Error(\`chunk request \${n} failed\`);
  // A real import() resolves to a module namespace and Vue unwraps .default;
  // a plain object is returned as the component itself.
  return { render: () => h("p", { class: "chart" }, "Chart loaded") };
}

const Chart = defineAsyncComponent({
  loader: loadChart,
  loadingComponent: { render: () => h("p", "Loading chart...") },
  errorComponent: { props: ["error"], render() { return h("p", { class: "err" }, \`Error: \${this.error.message}\`); } },
  delay: 40,       // show loadingComponent only if loading takes longer than 40ms
  timeout: 1000,   // give up (show errorComponent) after 1s
  onError(error, retry, fail, attempts) {
    console.log(\`  onError attempt \${attempts}: \${error.message}\`);
    if (attempts <= 3) retry(); // retry up to 3 times
    else fail();
  },
});

const show = ref(false);
</script>

<template>
  <button class="toggle" @click="show = !show">{{ show ? "Hide" : "Show" }} chart</button>
  <Chart v-if="show" />
</template>`,
      },
      {
        label: "Lazy hydration with hydrateOnInteraction: server render, then hydrate in jsdom",
        tech: "js",
        runnable: false,
        code: `// Lazy hydration (3.5+): server-render, then hydrate in jsdom with hydrateOnInteraction.
import { JSDOM } from "jsdom";
const { createSSRApp, defineAsyncComponent, hydrateOnInteraction, h, ref, onMounted } = await import("vue");
const { renderToString } = await import("@vue/server-renderer");

let loads = 0;
const Counter = { setup() { const n = ref(0); onMounted(() => console.log("  Counter hydrated (onMounted)")); return () => h("button", { onClick: () => n.value++ }, \`clicked \${n.value}\`); } };
// A fresh async component per app, so the server and the "browser" each load it themselves.
const makeApp = (where) => {
  const LazyCounter = defineAsyncComponent({
    loader: async () => { loads++; console.log(\`  [\${where}] loader called\`); return Counter; },
    hydrate: hydrateOnInteraction("click"),
  });
  return createSSRApp({ render: () => h("div", [h("p", "static header"), h(LazyCounter)]) });
};

const html = await renderToString(makeApp("server"));
console.log("server HTML:", html);
loads = 0;

const dom = new JSDOM(\`<div id="app">\${html}</div>\`, { url: "http://localhost/" });
for (const k of ["window", "document", "Node", "Element", "HTMLElement", "SVGElement", "Text", "Comment", "Event", "MouseEvent"]) globalThis[k] = dom.window[k];
makeApp("client").mount("#app");
await new Promise((r) => setTimeout(r, 20));
console.log("after hydrate(): loader calls =", loads, "| button:", document.querySelector("button").textContent);
document.querySelector("button").dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
await new Promise((r) => setTimeout(r, 20));
console.log("after 1st click : loader calls =", loads, "| button:", document.querySelector("button").textContent);
document.querySelector("button").click();
await new Promise((r) => setTimeout(r, 20));
console.log("after 2nd click : loader calls =", loads, "| button:", document.querySelector("button").textContent);`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you lazy-load routes and components in Vue?",
    seoDescription:
      "Lazy-load Vue routes with () => import() and components with defineAsyncComponent: real Vite 8 chunk output, when chunks load, and grouping traps.",
    description: `**Question presented to candidate:**
"Our Vue app's main bundle has grown past what we want on a phone, and most users never open the admin area. How would you lazy-load routes and heavy components, how would you check it worked, and what can go wrong in production?"

**What a strong answer should cover:**
- **Route-level splitting:** give the route a function, \`component: () => import("./views/AboutView.vue")\`; the bundler emits a separate chunk and the router fetches it the first time the route is visited, then reuses it.
- **Component-level splitting:** \`defineAsyncComponent(() => import("./HeavyChart.vue"))\` for heavy parts of a page that are not always shown.
- Do **not** wrap route components in \`defineAsyncComponent\`; the router handles lazy routes itself (and vue-router 5 warns).
- **Verify with the build:** separate files in \`vite build\` output, and only the needed chunk requested on navigation in the browser's network panel.
- **Grouping:** related routes can share one chunk via bundler config (in Vite 8, Rolldown's \`output.codeSplitting.groups\`), but careless groups can pull shared code into the group and get it preloaded on every page.
- **Failure handling:** a chunk can fail to load (offline, or an old tab after a deploy); handle it with \`router.onError\` and Vite's \`vite:preloadError\` event.

**Clarifying questions expected:**
- "Which routes are on the critical path for most users, and which are rarely visited?"
- "How do deploys work: are old asset files kept for a while after a release?"

**Code / implementation expected:** Yes — a router table with lazy routes, a \`defineAsyncComponent\` for one heavy component, and the build output to prove the split.`,
    answer: `**Target Audience:** Developers with a working Vue Router app who want a smaller initial download and a way to prove it.
**Difficulty:** Medium

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. The build output is from a real app built with Vite 8.3.4, <code>@vitejs/plugin-vue</code> 6.0.10, Vue 3.5.44 and vue-router 5.4.0. Which chunks were fetched on each navigation was recorded in headless Chromium (Playwright) against <code>vite preview</code>. Router behaviour (navigation timing, caching, errors, warnings) was run in jsdom with vue-router 5.4.0. Real network latency and CDN behaviour were not measured.

## 1. Why This Even Matters — A Story First

A new employee's first day. One option: hand them every manual the company has ever written, in one box, before they are allowed into the building. They wait at the door while the box is assembled, then carry it around all day, and they will read two of the manuals.

The sensible option: give them the welcome pack at the door, and tell them where the library is. When they need the expense policy, they fetch that one manual, and it stays on their desk afterwards.

A single JavaScript bundle is the box of manuals: every page of the app is downloaded and parsed before the first one can show. **Lazy loading** is the library: the entry bundle holds what the first screen needs, and each other page (or heavy widget) is a separate file fetched the first time it is needed and kept after that.

## 2. The Core Idea

📌 **Interview term: Dynamic import** — <code>import("./AboutView.vue")</code> written as a function call. It returns a promise of the module. Bundlers such as Vite treat every dynamic import as a split point and emit the imported module into its own file.

📌 **Interview term: Chunk** — one of the JavaScript files a build produces. The **entry chunk** is loaded by <code>index.html</code>; **lazy chunks** are loaded on demand.

📌 **Interview term: Lazy route** — a route whose <code>component</code> is a function returning a dynamic import, instead of an imported component. Vue Router calls it during the first navigation to that route, waits for it, and caches the result.

📌 **Interview term: Async component** — a component made with [defineAsyncComponent](/interview-question/how-does-defineasynccomponent-work-with-loading-error-and-retry-in-2025), for lazy loading below the route level (a chart, an editor, a rarely opened dialog).

The router table used for all the checks below:

\`\`\`js
import { createRouter, createWebHistory } from "vue-router";
import HomeView from "./views/HomeView.vue"; // eager: part of the entry chunk

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: HomeView },
    // Lazy: a function returning a dynamic import(). Vite emits a separate chunk.
    { path: "/about", component: () => import("./views/AboutView.vue") },
    {
      path: "/admin",
      component: () => import("./views/admin/AdminLayout.vue"),
      children: [
        { path: "users", component: () => import("./views/admin/AdminUsers.vue") },
        { path: "settings", component: () => import("./views/admin/AdminSettings.vue") },
      ],
    },
  ],
});
\`\`\`

And <code>HomeView.vue</code> lazy-loads a chart component only when the user asks for it:

\`\`\`vue
<script setup>
import { ref, defineAsyncComponent } from "vue";
// Component-level lazy loading: the chart code is fetched only when shown.
const SalesChart = defineAsyncComponent(() => import("../components/SalesChart.vue"));
const showChart = ref(false);
</script>

<template>
  <h1>Home</h1>
  <button @click="showChart = true">Show chart</button>
  <SalesChart v-if="showChart" />
</template>
\`\`\`

## 3. Verified: the build output

<code>npx vite build</code> on Vite 8.3.4 (which bundles with Rolldown):

\`\`\`
vite v8.3.4 building client environment for production...
transforming...
✓ 29 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                         0.18 kB │ gzip:  0.15 kB
dist/assets/AboutView-CPq1sU26.js       0.15 kB │ gzip:  0.15 kB
dist/assets/AdminUsers-CUh4G3pW.js      0.16 kB │ gzip:  0.15 kB
dist/assets/AdminSettings-ClVCnf4k.js   0.16 kB │ gzip:  0.15 kB
dist/assets/AdminLayout-Cabi_SWY.js     0.23 kB │ gzip:  0.20 kB
dist/assets/SalesChart-DkyLsFre.js      0.26 kB │ gzip:  0.22 kB
dist/assets/index-CJYto197.js          90.89 kB │ gzip: 35.32 kB

✓ built in 562ms
\`\`\`

Every <code>import()</code> became its own file, named after the source file plus a content hash, and <code>HomeView</code> (statically imported) stayed in <code>index</code>, together with Vue and Vue Router. The views are tiny here, so the entry is still mostly framework code; in a real app the lazy chunks carry the weight of their pages and their page-only dependencies.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="The entry chunk loads first; each lazy chunk is fetched the first time its route or component is needed">
  <defs>
    <marker id="lz-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="250" y="20" width="220" height="66" rx="10"/>
  <text class="d-text d-accent" x="360" y="46" text-anchor="middle">index chunk</text>
  <text class="d-sub" x="360" y="68" text-anchor="middle">vue, router, HomeView</text>
  <path class="d-edge-dashed" d="M 290 90 L 110 150" marker-end="url(#lz-arrow)"/>
  <path class="d-edge-dashed" d="M 340 90 L 290 150" marker-end="url(#lz-arrow)"/>
  <path class="d-edge-dashed" d="M 400 90 L 470 150" marker-end="url(#lz-arrow)"/>
  <path class="d-edge-dashed" d="M 440 90 L 630 150" marker-end="url(#lz-arrow)"/>
  <rect class="d-box" x="20" y="156" width="170" height="60" rx="10"/>
  <text class="d-text" x="105" y="182" text-anchor="middle">SalesChart</text>
  <text class="d-sub" x="105" y="202" text-anchor="middle">on Show chart</text>
  <rect class="d-box" x="205" y="156" width="170" height="60" rx="10"/>
  <text class="d-text" x="290" y="182" text-anchor="middle">AboutView</text>
  <text class="d-sub" x="290" y="202" text-anchor="middle">on /about</text>
  <rect class="d-box" x="390" y="156" width="160" height="60" rx="10"/>
  <text class="d-text" x="470" y="182" text-anchor="middle">AdminLayout</text>
  <text class="d-sub" x="470" y="202" text-anchor="middle">on /admin</text>
  <rect class="d-box" x="565" y="156" width="140" height="60" rx="10"/>
  <text class="d-text" x="635" y="182" text-anchor="middle">AdminUsers</text>
  <text class="d-sub" x="635" y="202" text-anchor="middle">on /admin/users</text>
  <rect class="d-box-muted" x="200" y="246" width="320" height="40" rx="10"/>
  <text class="d-sub" x="360" y="271" text-anchor="middle">each fetched once, then reused</text>
</svg>

Dashed arrows are dynamic imports: nothing is fetched along them until the user does something that needs it.

## 4. Verified: what the browser actually fetched

The same build served with <code>vite preview</code> and driven in headless Chromium, listing every <code>.js</code> request after each step:

\`\`\`
open /                     JS fetched: index-CJYto197.js | h1: Home
click Show chart           JS fetched: SalesChart-DkyLsFre.js | h1: Home
click About                JS fetched: AboutView-CPq1sU26.js | h1: About
click Admin (/admin/users) JS fetched: AdminLayout-Cabi_SWY.js, AdminUsers-CUh4G3pW.js | h1: Admin
back to About again        JS fetched: (none) | h1: About
\`\`\`

That is the proof an interviewer wants: the first page loaded one file; each lazy route or component was requested exactly when needed; the nested route fetched its layout and child chunks together; and a second visit fetched nothing, because the module was already loaded.

## 5. Verified: how the router behaves around a lazy route

A Node script with vue-router 5.4.0 in jsdom, using a lazy route whose loader takes 30 ms, a route whose chunk fails, and a route component wrapped in <code>defineAsyncComponent</code> (excerpt from the first navigation to <code>/about</code>):

\`\`\`
  beforeEach -> /about
10ms into /about: screen="home" route=/
  afterEach  -> /about
after /about: screen="about" route=/about
  beforeEach -> /
  afterEach  -> /
  beforeEach -> /about
  afterEach  -> /about
  loader calls so far: 1
  beforeEach -> /broken
  router.onError for /broken: Failed to fetch dynamically imported module
  push rejected: Failed to fetch dynamically imported module
after /broken: screen="about" route=/about
  beforeEach -> /wrong
[VUE_ROUTER_R0029] Component "default" in record with path "/wrong" is defined using "defineAsyncComponent()".
├▶ fix: Drop the wrapper and pass "() => import('./MyPage.vue')" directly; the router handles lazy components itself.
╰▶ see: https://router.vuejs.org/guide/advanced/lazy-loading.html#Relationship-to-async-components
  afterEach  -> /wrong
after /wrong: screen="wrong" route=/wrong
\`\`\`

- **Navigation waits for the chunk.** Ten milliseconds into the navigation, the URL and the screen were still on <code>/</code>; the route only changed once the component had loaded. Show progress with a bar driven by <code>beforeEach</code> / <code>afterEach</code> (see [navigation guards](/interview-question/what-are-vue-router-navigation-guards)), because the page component cannot render a spinner before it exists. For the same reason a lazy route does not trigger [Suspense](/interview-question/what-is-suspense-in-vue).
- **The loader runs once.** Visiting <code>/about</code> a second time did not call it again.
- **A failed chunk cancels the navigation.** <code>router.onError</code> received the error, <code>router.push</code> rejected, and the app stayed on <code>/about</code>.
- **Wrapping in <code>defineAsyncComponent</code> is flagged.** vue-router 5.4.0 printed warning <code>VUE_ROUTER_R0029</code> with the fix: pass the import function directly. The page still rendered; the warning is about the pattern.

## 6. Grouping Chunks, and a Trap Verified on Vite 8

Many tiny chunks cost a request each. Related routes are often grouped into one chunk. Vite 8 bundles with Rolldown, whose <code>output.codeSplitting</code> option replaces Rollup's <code>manualChunks</code> (the Rolldown 1.2.14 typings mark <code>manualChunks</code> and <code>advancedChunks</code> as deprecated in its favour). A first attempt, with an <code>admin</code> group for <code>src/views/admin/</code> listed before a <code>vendor</code> group for <code>node_modules</code>:

\`\`\`
dist-grouped/index.html                      0.33 kB │ gzip:  0.21 kB
dist-grouped/assets/AboutView-CwIb_qcy.js    0.15 kB │ gzip:  0.15 kB
dist-grouped/assets/SalesChart-CLDcajSe.js   0.26 kB │ gzip:  0.22 kB
dist-grouped/assets/index-CpiPCjiR.js        3.60 kB │ gzip:  1.66 kB
dist-grouped/assets/vendor-CIh1eElQ.js      29.35 kB │ gzip: 11.78 kB
dist-grouped/assets/admin-DotWHcEN.js       59.13 kB │ gzip: 23.14 kB
\`\`\`

A 59 kB "admin" chunk for three one-line templates: groups capture their modules' dependencies by default, so the admin group swallowed most of Vue's runtime. Worse, <code>index.html</code> then had <code>&lt;link rel="modulepreload" href="/assets/admin-DotWHcEN.js"&gt;</code>, so every visitor downloaded the admin chunk on the home page. Giving <code>vendor</code> a higher <code>priority</code> shrank admin to 0.68 kB, but index still preloaded it, because the entry imported one helper from it: <code>@vitejs/plugin-vue</code>'s shared export helper (the <code>_export_sfc</code> function every compiled SFC uses) had been captured by the admin group. Routing that helper into <code>vendor</code> fixed it:

\`\`\`js
codeSplitting: {
  groups: [
    { name: "admin", test: /src\\/views\\/admin\\//, priority: 1 }, // every admin screen in one chunk
    // vue, vue-router and the plugin-vue export helper (shared by every SFC) go in vendor,
    // with a higher priority so the admin group cannot capture them.
    { name: "vendor", test: /node_modules|plugin-vue:export-helper/, priority: 2 },
  ],
},
\`\`\`

\`\`\`
dist-grouped/index.html                      0.25 kB │ gzip:  0.19 kB
dist-grouped/assets/AboutView-Dl5T5wHw.js    0.15 kB │ gzip:  0.15 kB
dist-grouped/assets/SalesChart-CKaHeRlB.js   0.26 kB │ gzip:  0.22 kB
dist-grouped/assets/admin-yNRjRv1k.js        0.62 kB │ gzip:  0.38 kB
dist-grouped/assets/index-CkxAaGET.js        3.66 kB │ gzip:  1.66 kB
dist-grouped/assets/vendor-CMqedyki.js      87.71 kB │ gzip: 34.04 kB
\`\`\`

Now <code>index.html</code> preloads only <code>vendor</code>, and all three admin screens share one 0.62 kB chunk. The lesson generalises beyond Vite: after changing chunking, read the generated <code>index.html</code> for unexpected <code>modulepreload</code> links, not just the file list.

## 7. Route-Level vs. Component-Level

| | Lazy route | Async component |
| :--- | :--- | :--- |
| Syntax | <code>component: () =&gt; import("./Page.vue")</code> | <code>defineAsyncComponent(() =&gt; import("./Widget.vue"))</code> |
| Fetched when | First navigation to the route | First render of the component |
| Loading UI | Router-level (progress bar in guards) | <code>loadingComponent</code> / <code>delay</code>, or a parent <code>&lt;Suspense&gt;</code> |
| Errors | <code>router.onError</code>, rejected <code>push</code> | <code>errorComponent</code>, <code>onError</code> retry |
| Good for | Pages, sections such as <code>/admin</code> | Charts, editors, maps, rarely opened dialogs |
| Do not | Wrap in <code>defineAsyncComponent</code> | Use for tiny components; the extra request costs more than it saves |

Routes are the first and cheapest win; components are the second, for heavy widgets inside pages. Both are listed under [optimizing performance in a Vue app](/interview-question/how-do-you-optimize-performance-in-a-vue-app). Next.js has the same split between route-level and component-level loading (see [next/dynamic](/interview-question/how-does-code-splitting-and-next-dynamic-work-in-next-js)), and Angular does it with <code>loadComponent</code> (see [lazy loading in Angular](/interview-question/how-does-routing-and-lazy-loading-work-in-angular)).

## 8. Production Concerns

- **Stale chunks after a deploy.** A tab opened before a release asks for <code>AboutView-CPq1sU26.js</code>, which the new release no longer has. The navigation fails as in section 5. Vite's preload helper (present in the built entry chunk) dispatches a cancelable <code>vite:preloadError</code> event on <code>window</code> with the error as <code>payload</code>, and rethrows unless <code>preventDefault()</code> is called. A common handler reloads the page once. Keeping the previous release's assets available for a while also helps; that part depends on your hosting and was not tested here.
- **Prefetching likely routes.** Calling the same import function early (for example on hover over a link, <code>() =&gt; import("./views/AboutView.vue")</code>) starts the download, and the router later reuses the loaded module, since a module is only fetched once.
- **Measure.** Check the build output and the network panel, as in sections 3 and 4, rather than assuming a split happened. A static <code>import</code> of the same file anywhere else pulls it back into the importing chunk.

## 9. Common Pitfalls

- **A static import somewhere else.** Adding <code>import AboutView from "./AboutView.vue"</code> to <code>HomeView.vue</code> made the <code>AboutView</code> chunk disappear from the build, and Vite 8.3.4 printed: <code>[INEFFECTIVE_DYNAMIC_IMPORT] src/views/AboutView.vue is dynamically imported by src/router.js but also statically imported by src/views/HomeView.vue, dynamic import will not move module into another chunk.</code> Treat that warning as an error.
- **Wrapping route components in <code>defineAsyncComponent</code>.** vue-router 5.4.0 warns with <code>VUE_ROUTER_R0029</code>; pass the import function directly.
- **Expecting a spinner from the page itself.** The navigation waits for the chunk before the page exists. Show progress from the router.
- **Chunk groups that capture shared code.** As verified on Vite 8, a group listed first can swallow framework code and shared helpers, and then get preloaded on every page. Inspect <code>index.html</code>.
- **No handling for failed chunk loads.** Offline users and stale tabs after a deploy get a rejected navigation; handle <code>router.onError</code> and <code>vite:preloadError</code>.
- **Splitting everything.** Each chunk is a request. Split by route and by genuinely heavy widgets, not every small component.

## 10. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"I lazy-load routes by giving the route <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">component: () =&gt; import('./Page.vue')</code>, and heavy widgets with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineAsyncComponent(() =&gt; import(...))</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. What happens:</strong> <span style="color:#f0e2c8;">"The bundler emits each dynamic import as its own chunk; the router fetches a route's chunk on the first navigation, waits for it, and reuses it after that."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. How I prove it:</strong> <span style="color:#f0e2c8;">"I check the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vite build</code> output for separate files and the network panel for one request per first visit. In my test, a second visit fetched nothing."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Grouping:</strong> <span style="color:#f0e2c8;">"Related routes can share a chunk; in Vite 8 that is Rolldown's <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">codeSplitting.groups</code>. I then check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">index.html</code>, because a careless group got preloaded on every page in my test."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Failure handling:</strong> <span style="color:#f0e2c8;">"Chunks can fail offline or after a deploy, so I handle <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">router.onError</code> and Vite's <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vite:preloadError</code> event, usually with a one-time reload."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">defineAsyncComponent</code> for routes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The router already supports lazy route components and needs the raw import function so it can await it during navigation. vue-router 5.4 warns with code <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">VUE_ROUTER_R0029</code> if you wrap it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you show a loading state for a lazy route?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">From the router, for example a progress bar started in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">beforeEach</code> and stopped in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">afterEach</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onError</code>. The page component does not exist until its chunk has loaded, so it cannot show its own spinner.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens to users with an old tab open after a deploy?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Their app asks for chunk file names that may no longer exist, so the navigation fails. Handle <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vite:preloadError</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">router.onError</code>, typically by reloading once, and keep old assets around for a while if the host allows it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you prefetch a route before the user clicks?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: call the same <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">import()</code> early, for example on link hover. The module is fetched once, so the later navigation reuses it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why might a lazy route not be split at all?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Something else imports the same file statically, which pulls it into that chunk. The build output shows it, because the expected separate file is missing.</span>
</div>

</div>

## 11. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Dynamic import** | <code>import()</code> as a function; a split point for the bundler |
| **Chunk** | One emitted JavaScript file; entry chunk first, lazy chunks on demand |
| **Lazy route** | <code>component: () =&gt; import(...)</code>; fetched on first navigation, then cached |
| **Async component** | <code>defineAsyncComponent</code> wrapper for lazy loading inside a page |
| **modulepreload** | A <code>&lt;link&gt;</code> that tells the browser to fetch a module early |
| **codeSplitting groups** | Rolldown (Vite 8) option for putting chosen modules into named chunks |
| **vite:preloadError** | Window event Vite fires when a lazy chunk fails to load |

---
**Conclusion:** Lazy loading in Vue is a dynamic <code>import()</code> in the right place: a function as the route's <code>component</code> for pages, and <code>defineAsyncComponent</code> for heavy widgets inside pages. The Vite 8 build split each one into its own chunk, headless Chromium fetched each chunk exactly when it was first needed and never again, and vue-router 5.4.0 held the navigation until the chunk arrived, reported failures through <code>router.onError</code>, and warned against wrapping routes in <code>defineAsyncComponent</code>. Group related routes deliberately, check the generated <code>index.html</code> for unintended preloads (the verified Vite 8 trap), and plan for chunks that fail to load after a deploy.`,
    examples: [
      {
        label: "Router table with lazy routes and nested lazy children (vue-router 5)",
        tech: "js",
        runnable: false,
        code: `import { createRouter, createWebHistory } from "vue-router";
import HomeView from "./views/HomeView.vue"; // eager: part of the entry chunk

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: HomeView },
    // Lazy: a function returning a dynamic import(). Vite emits a separate chunk.
    { path: "/about", component: () => import("./views/AboutView.vue") },
    {
      path: "/admin",
      component: () => import("./views/admin/AdminLayout.vue"),
      children: [
        { path: "users", component: () => import("./views/admin/AdminUsers.vue") },
        { path: "settings", component: () => import("./views/admin/AdminSettings.vue") },
      ],
    },
  ],
});`,
      },
      {
        label: "Vite 8 config grouping admin routes into one chunk without capturing shared code",
        tech: "js",
        runnable: false,
        code: `import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  build: {
    rolldownOptions: {
      output: {
        // Vite 8 bundles with Rolldown: codeSplitting replaces manualChunks.
        codeSplitting: {
          groups: [
            { name: "admin", test: /src\\/views\\/admin\\//, priority: 1 }, // every admin screen in one chunk
            // vue, vue-router and the plugin-vue export helper (shared by every SFC) go in vendor,
            // with a higher priority so the admin group cannot capture them.
            { name: "vendor", test: /node_modules|plugin-vue:export-helper/, priority: 2 },
          ],
        },
      },
    },
  },
});`,
      },
    ],
  },
];

export default augments;
