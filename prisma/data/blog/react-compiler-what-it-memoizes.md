---
slug: react-compiler-what-it-memoizes
title: "React Compiler in Practice: What It Memoizes, What It Skips, and When You Still Need useMemo"
excerpt: We ran React Compiler 1.0 on real components and counted renders. Here is what the compiled code looks like, which components it silently skips, the one bug it can introduce, and where useMemo still earns its place.
tags: ["frontend", "react", "react-compiler", "performance", "nextjs"]
cover: /blog-images/react-compiler-what-it-memoizes/cover.png
---

For years, making a React app fast meant sprinkling `useMemo`, `useCallback` and `React.memo` by hand, and then arguing in code review about whether each one was worth it. React Compiler is meant to end that. It reached [1.0 on October 7, 2025](https://react.dev/blog/2025/10/07/react-compiler-1), and since **Next.js 16** the `reactCompiler` option is stable rather than experimental, though it is still not turned on by default (from the Next.js 16 upgrade guide that ships with the framework). Expo SDK 54 and later turns it on by default.

So the questions you will now hear in code reviews and interviews are no longer "should this be wrapped in `useMemo`?" but:

- What does the compiler actually do to my component?
- How do I know it did anything?
- When does it quietly give up?
- Can it break code that used to work?
- Do I still need `useMemo` at all?

Instead of answering from the docs alone, this post runs the compiler. Every compiled snippet below is real output from `babel-plugin-react-compiler` **1.0.0** with React **19.3.1**, and every render count was measured by mounting the component in jsdom and clicking a button.

## What the compiler is, in one paragraph

> **Short answer:** a build-time Babel plugin that rewrites your components and hooks so they cache their own intermediate values and JSX, and only recompute a piece when the inputs it depends on change.

**Memoization** means remembering the result of a calculation so that, if you are asked again with the same inputs, you hand back the remembered result instead of redoing the work. `useMemo` does this for one value you pick by hand. The compiler does it for (nearly) every value in a component, decides the inputs itself, and writes the bookkeeping code for you. It runs when you build, not in the browser, so there is no new runtime library to learn; the output only calls one tiny helper that ships with React.

It only touches **components and hooks**: functions whose names start with a capital letter or with `use`, that return JSX or call hooks. A plain helper like `formatPrice(n)` is left alone, which we will come back to.

## What the compiled code looks like

Here is a small component:

```jsx
export function TodoList({ todos, filter }) {
  const visible = todos.filter(t => t.status === filter);
  return <ul>{visible.map(t => <li key={t.id}>{t.text}</li>)}</ul>;
}
```

And here is exactly what the compiler turned it into (JSX left in place so it stays readable):

```jsx
import { c as _c } from "react/compiler-runtime";
export function TodoList(t0) {
  const $ = _c(7);
  const {
    todos,
    filter
  } = t0;
  let t1;
  if ($[0] !== filter || $[1] !== todos) {
    let t2;
    if ($[3] !== filter) {
      t2 = t => t.status === filter;
      $[3] = filter;
      $[4] = t2;
    } else {
      t2 = $[4];
    }
    const visible = todos.filter(t2);
    t1 = visible.map(_temp);
    $[0] = filter;
    $[1] = todos;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  let t2;
  if ($[5] !== t1) {
    t2 = <ul>{t1}</ul>;
    $[5] = t1;
    $[6] = t2;
  } else {
    t2 = $[6];
  }
  return t2;
}
function _temp(t_0) {
  return <li key={t_0.id}>{t_0.text}</li>;
}
```

Four things to notice:

1. **`_c(7)` creates a cache with 7 slots.** `_c` comes from `react/compiler-runtime`; in React 19 it is a thin wrapper over an internal hook called `useMemoCache`. Like any hook's state, the array belongs to *this instance* of the component and survives between renders.
2. **Each block checks its inputs with `!==`.** If `filter` and `todos` are the same values (by reference) as last time, the filtered and mapped list is read back from `$[2]` instead of being rebuilt. This is the same comparison `useMemo` does on its dependency array, written out by hand.
3. **The returned JSX is cached too.** If `t1` did not change, the very same `<ul>` element object is returned. That matters more than it looks, as the next section shows.
4. **The callback that does not depend on anything was hoisted out** as `_temp`, so it is created once for the whole module rather than once per render.

![The compiler gives each component instance a small cache array: each block stores the inputs it depends on and the result, and on the next render it compares inputs with !== and either reuses the stored result or recomputes it.](/blog-images/react-compiler-what-it-memoizes/memo-cache-slots.svg)

You can see the bookkeeping compiler logs report for this component too. Passing a `logger` to the Babel plugin prints a `CompileSuccess` event with `"memoSlots":7,"memoBlocks":3`, which is a handy way to confirm a file was actually compiled.

### The same idea without React

To make the mechanism concrete, here is a hand-written copy of the pattern with no React at all. Each `Shop` call is one "render"; the cache array lives in a closure, standing in for the hook state. Press Run:

```javascript-run
// A hand-written copy of what the compiler emits, without React.
// One cache array per component instance; each slot remembers a dependency or a result.
const EMPTY = Symbol('empty');
let filterRuns = 0;

function filterProducts(all, query) {
  filterRuns++;
  return all.filter(p => p.name.includes(query));
}

function makeShop() {
  const $ = new Array(4).fill(EMPTY); // like _c(4)
  return function Shop({ all, query, clicks }) {
    let products;
    if ($[0] !== all || $[1] !== query) {
      products = filterProducts(all, query);
      $[0] = all; $[1] = query; $[2] = products;
    } else {
      products = $[2];
    }
    return { label: 'Clicked ' + clicks, products };
  };
}

const all = [{ name: 'apple' }, { name: 'banana' }, { name: 'cherry' }];
const Shop = makeShop();

const first = Shop({ all, query: 'a', clicks: 0 });
const second = Shop({ all, query: 'a', clicks: 1 });  // only clicks changed
const third = Shop({ all, query: 'ch', clicks: 2 });  // query changed

console.log('filter runs:', filterRuns);
console.log('same products array after a click?', first.products === second.products);
console.log('new array after the query changed?', second.products !== third.products);
console.log('third:', third.label, third.products.map(p => p.name).join(','));
```

Output:

```text
filter runs: 2
same products array after a click? true
new array after the query changed? true
third: Clicked 2 cherry
```

Three renders, but the filter ran only twice: the click changed `clicks`, which the cached block does not depend on, so it was skipped. And the array stayed the *same object*, which is what lets a child component skip its own render.

## Measured: does it really stop re-renders?

> **Short answer:** yes. In our test, a child with no `React.memo` went from 6 renders to 1, the same result as careful manual memoization.

The test app is a shop page with a click counter and a product list. Clicking the counter changes state in `Shop`, which normally re-renders everything below it:

```jsx
function filterProducts(all, query) {
  track('filter');
  return all.filter(p => p.name.includes(query));
}

function ProductList({ products, onPick }) {
  track('child');
  return <ul>{products.map(p => <li key={p.id} onClick={() => onPick(p)}>{p.name}</li>)}</ul>;
}

export function Shop({ all }) {
  const [clicks, setClicks] = useState(0);
  const [query] = useState('a');
  const products = filterProducts(all, query);
  const handlePick = p => console.log('picked', p.name);
  return (
    <div>
      <button onClick={() => setClicks(c => c + 1)}>Clicked {clicks}</button>
      <ProductList products={products} onPick={handlePick} />
    </div>
  );
}
```

We mounted it with `createRoot` in jsdom, clicked the button 5 times inside `act()`, and counted. One initial render plus five clicks means 6 renders of `Shop` in every version:

| Version | `filterProducts` calls | `ProductList` renders |
|---|---|---|
| Plain code, no compiler | 6 | 6 |
| `React.memo(ProductList)` only | 6 | 6 |
| `React.memo` + `useMemo` + `useCallback` by hand | 1 | 1 |
| Plain code, **compiled** | 1 | 1 |

The second row is the classic trap: `React.memo` alone does nothing here, because `products` is a new array and `handlePick` is a new function on every render, so the shallow prop comparison always fails. You had to get all three pieces right by hand for it to work.

The compiled version needs none of them. It caches `products` (because `all` and `query` did not change), caches `handlePick` (it depends on nothing), and then caches the `<ProductList … />` element itself. When React sees the *same element object* as last time in the same place, it skips that subtree entirely, with no `React.memo` needed. That is why the child count drops to 1.

![Without the compiler, a state change in Shop re-renders ProductList on every click. With the compiler, Shop returns the same cached ProductList element, so React skips that subtree.](/blog-images/react-compiler-what-it-memoizes/render-tree.svg)

Real apps show smaller but real wins: Meta reports that on the Quest Store, initial loads and cross-page navigations improved by up to 12% and some interactions became more than 2.5 times faster, with memory use neutral ([React Compiler v1.0 announcement](https://react.dev/blog/2025/10/07/react-compiler-1)). Those are Meta's numbers for their app; measure your own.

## When the compiler quietly skips a component

> **Short answer:** if a component breaks the Rules of React in a way the compiler can see, it leaves that whole function uncompiled, and by default it does not tell you.

The compiler trusts that your code follows the [Rules of React](https://react.dev/reference/rules): components are pure during render, props and state are not mutated, hooks are called in the same order every time. When it can *prove* a function breaks one of these rules, it does not try to be clever. It skips that function and leaves your original code in the output, and your build carries on as normal.

We compiled four components with a logger attached. This is what it reported:

```jsx
// 1. Writes to a variable outside the component during render
export function Tagged({ user }) {
  user.seen = true;
  return <p>{user.name}</p>;
}

// 2. Reads and writes a ref during render
export function RenderCounter() {
  const renders = useRef(0);
  renders.current++;
  return <p>Rendered {renders.current} times</p>;
}

// 3. Calls a hook conditionally
export function MaybeName({ show }) {
  if (show) {
    const [name] = useState('Ada');
    return <p>{name}</p>;
  }
  return null;
}

// 4. Copies before sorting (fine)
export function Fine({ items }) {
  const sorted = [...items].sort((a, b) => a.price - b.price);
  return <ul>{sorted.map(i => <li key={i.id}>{i.name}</li>)}</ul>;
}
```

| Component | What the compiler did | Reason it gave |
|---|---|---|
| `Tagged` | skipped | `[Immutability] This value cannot be modified` |
| `RenderCounter` | skipped | `[Refs] Cannot access refs during render` |
| `MaybeName` | skipped | `[Hooks] Hooks must always be called in a consistent order, and may not be called conditionally` |
| `Fine` | compiled, 4 cache slots | |

A skipped component still works exactly as it did before; it just gets no automatic memoization. The risk is that you think the compiler is helping a hot component when it is not.

**How to find skipped components:** the same checks ship as lint rules. With `eslint-plugin-react-hooks` 7.1.1 and its `recommended` preset, ESLint flagged all three: `react-hooks/immutability` for `Tagged`, `react-hooks/refs` for `RenderCounter`, and `react-hooks/rules-of-hooks` for `MaybeName`. The React team recommends this preset for compiler users in the [1.0 announcement](https://react.dev/blog/2025/10/07/react-compiler-1). Fixing the lint errors is how you get those components compiled.

You can also check in the browser: components the compiler optimised show a "Memo ✨" badge in React DevTools ([installation guide](https://react.dev/learn/react-compiler/installation)).

## The bug the compiler can introduce: mutation it cannot see

> **Short answer:** code that mutates an array or object in place and then forces a re-render "worked" before, because everything re-rendered. With the compiler, the cached output is reused and the screen goes stale.

This is the most important thing to understand before turning it on in an existing codebase. Look at this component:

```jsx
function Cart({ items }) {
  return <ul>{items.map(i => <li key={i}>{i}</li>)}</ul>;
}

export function Shop() {
  const [items] = useState(() => ['apple']);
  const [, setTick] = useState(0);
  function add() {
    items.push('banana');      // mutates the array in place
    setTick(t => t + 1);       // forces a re-render
  }
  return (
    <div>
      <button onClick={add}>Add</button>
      <Cart items={items} />
    </div>
  );
}
```

It breaks the rules: state is mutated with `push` instead of being replaced. But without the compiler it *appears* to work, because `setTick` re-renders `Shop`, which re-renders `Cart`, which maps over the (mutated) array. We mounted both versions and clicked **Add** once:

```text
plain    list shows: apple, banana
compiled list shows: apple
```

The compiled `Cart` compares `items` with `!==`. It is the same array object as last time (it was mutated, not replaced), so the cached `<ul>` is reused and "banana" never appears.

Worse, nothing warned us. The compiler compiled both components without a single error event, and ESLint with the `recommended` preset reported **0 problems** for this file, because the mutation happens inside an event handler where the analysis does not follow it. The same was true for a component that called `items.sort()` directly on a prop: compiled, no lint error.

![Before the compiler, mutating the items array and forcing a re-render still showed the new item because Cart re-rendered. With the compiler, Cart sees the same array reference, reuses its cached list and shows stale data.](/blog-images/react-compiler-what-it-memoizes/stale-mutation.svg)

The fix is the one React has always asked for: replace instead of mutate.

```jsx
const [items, setItems] = useState(['apple']);
function add() {
  setItems(prev => [...prev, 'banana']);
}
```

When you enable the compiler on an existing app, search for `push(`, `splice(`, `sort(`, `reverse(` and direct property assignment on state or props, and run your tests with the compiler on before you ship.

## When you still need useMemo and useCallback

> **Short answer:** for new code, let the compiler handle memoization and reach for `useMemo` or `useCallback` only when you need a guarantee, mostly for effect dependencies. Leave existing ones in place unless you test their removal.

That is close to word for word what the [React docs](https://react.dev/learn/react-compiler/introduction) say. The cases where hand-written memoization still matters:

- **Effect dependencies.** The docs call `useMemo` and `useCallback` an escape hatch "if a memoized value is used as an effect dependency, in order to ensure that an effect does not fire repeatedly". The compiler's caching is an optimisation based on its own analysis; when correctness depends on a value staying stable (an effect that opens a connection, say), state that intent explicitly.
- **Expensive helpers shared across components.** The compiler "only memoizes React components and hooks, not every function", and its memoization "is not shared across multiple components or hooks". If five components each call `buildSearchIndex(products)`, it runs five times. Cache it once, higher up, or in a module-level cache.
- **Existing manual memoization.** The docs recommend "either leaving existing memoization in place (removing it can change compilation output) or carefully testing before removing". Do not start a big clean-up commit on day one.

What you can mostly stop doing: wrapping every callback you pass to a child in `useCallback`, and wrapping children in `React.memo` just so those callbacks matter. As the table above showed, the compiler already covers that pattern.

![A decision flow for memoization with the compiler on: write plain code first; add useMemo or useCallback when a value is an effect dependency; cache shared expensive work outside components; keep existing memoization until tested.](/blog-images/react-compiler-what-it-memoizes/when-usememo.svg)

## A few details that surprise people

**It memoizes after early returns.** Hooks cannot be called after an early `return`, so `useMemo` cannot help there. The compiler can. For this component:

```jsx
export function Report({ rows, loading }) {
  if (loading) return <p>Loading</p>;
  const total = sumRows(rows);
  return <p>Total: {total}</p>;
}
```

the output caches `sumRows(rows)` on `rows` *below* the early return, and caches the constant `<p>Loading</p>` element in a slot that is filled once and never recomputed (it checks against `Symbol.for("react.memo_cache_sentinel")`, meaning "this slot is still empty").

**Plain functions are left alone.** In the same file, `function formatPrice(n) { return '$' + n.toFixed(2); }` came out unchanged: it is not a component or a hook.

**You can opt a component out.** Put `'use no memo'` as the first statement of a component and the compiler skips it; our logger reported it as skipped because of the directive. Use it as a temporary escape hatch while you fix a component, not as a permanent setting.

**You can opt in one component at a time.** With `compilationMode: 'annotation'`, nothing is compiled unless it starts with `'use memo'`. Compiling the same file in that mode produced zero compiled functions.

## Turning it on

**Next.js 16.** Install the plugin and set the top-level option (it was `experimental.reactCompiler` before 16):

```bash
npm install -D babel-plugin-react-compiler
```

```js
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  // or, to opt in per component with 'use memo':
  // reactCompiler: { compilationMode: 'annotation' },
}

module.exports = nextConfig
```

Next.js only runs the Babel plugin on files that contain JSX or hooks, to keep builds fast, but the Next.js 16 guide still warns that compile times in development and builds will be higher with it on. There is also an experimental `experimental.turbopackRustReactCompiler` option that runs a native Rust port inside Turbopack instead of Babel.

**Vite.** With `@vitejs/plugin-react` 6.0.0 or later, the [React Compiler installation guide](https://react.dev/learn/react-compiler/installation) uses the `reactCompilerPreset` it exports, run through `@rolldown/plugin-babel`; older versions of the plugin take `babel: { plugins: ['babel-plugin-react-compiler'] }` instead. In any custom Babel setup, the compiler must run **first**, because it needs the original source to analyse.

**React 17 and 18.** The compiler works with React 17 and up. On 17 or 18, set a minimum target in the compiler config and add `react-compiler-runtime` as a dependency ([1.0 announcement](https://react.dev/blog/2025/10/07/react-compiler-1)). We checked what the option does: compiling the `TodoList` example with `{ target: '18' }` changed the first line of the output to `import { c as _c } from "react-compiler-runtime";`, since `react/compiler-runtime` only exists in React 19.

**Roll out in this order:** turn on the `eslint-plugin-react-hooks` `recommended` preset and fix what it finds; enable the compiler; run your test suite and click through the screens that mutate data; then look in React DevTools for the ✨ badge on the components you care about.

## Interview follow-ups you should be ready for

**"If the compiler memoizes everything, why not just wrap everything in `useMemo` yourself?"**
Because you cannot: hooks cannot run after an early return or inside a condition, and wrapping every expression by hand is unreadable. The compiler also caches at a finer grain than a person would, block by block, with the dependency list worked out from the code, so you cannot forget a dependency.

**"Does the compiler make `React.memo` unnecessary?"**
Mostly. Returning the same element object lets React skip the child without `React.memo`. It still helps for children rendered by parents that are *not* compiled (for example, a component from a library), because then the parent creates new props every time.

**"What happens if my code breaks the Rules of React?"**
If the compiler can detect it, it skips that function and your code runs as before, unoptimised. If it cannot detect it, such as an in-place mutation in an event handler, the compiled code can show stale data. That is why the lint rules and tests come first.

**"Is the memoization shared between two instances of the same component?"**
No. Each instance has its own cache array, just like each instance has its own `useState`. Two `<ProductList>` instances with the same props each compute their own results once.

**"Does it run in the browser?"**
No. It is a build step. The only runtime piece is the small `c` helper from `react/compiler-runtime` (or the `react-compiler-runtime` package on React 17 and 18) that allocates the cache.

## Cheat sheet

| Question | Answer |
|---|---|
| What is it? | A build-time Babel plugin that adds fine-grained memoization to components and hooks |
| Stable since | 1.0 on October 7, 2025; stable `reactCompiler` option in Next.js 16 (off by default) |
| What gets compiled | Components and hooks only; plain helpers are left alone |
| How it caches | One cache array per instance (`_c(n)`), inputs compared with `!==` |
| Why children stop re-rendering | It returns the same JSX element object, so React skips the subtree |
| Rule-breaking code it can see | Skipped silently; find it with `eslint-plugin-react-hooks` `recommended` |
| Rule-breaking code it cannot see | In-place mutation can show stale UI; replace, never mutate |
| Still use `useMemo`/`useCallback` for | Effect dependencies that must stay stable; keep existing ones until tested |
| Not covered | Expensive work shared across components, non-component functions |
| Opt out / opt in | `'use no memo'`; `compilationMode: 'annotation'` with `'use memo'` |
| React 17/18 | Set `target` and install `react-compiler-runtime` |
