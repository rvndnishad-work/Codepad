---
slug: react-interview-follow-up-questions
title: "React Interview Follow-Up Questions, With Every Answer Run in React 19"
excerpt: Nine follow-ups interviewers ask after "have you used React?", from why setState looks stale and why effects run twice to index keys, stale closures, memo and ref as a prop. Each answer comes with code run in React 19.2.8 and the output it printed.
tags: ["interview", "react", "javascript", "frontend", "hooks"]
cover: /blog-images/react-interview-follow-up-questions/cover.png
---

"Have you used React?" is the easy part of the interview. The follow-ups decide it: *why does `count` still show the old value after `setCount`?*, *why does my effect run twice?*, *what goes wrong with `key={index}`?* These questions check whether you know what React does when your component runs, not just which hooks exist.

This post covers the nine follow-ups that come up most often. Each one has a short answer you can say out loud, an explanation, the code, and the output it produced.

**How the code was run.** Every example was compiled with esbuild and run with **React 19.2.8** and `react-dom/client` in Node.js 22, with [jsdom](https://github.com/jsdom/jsdom) standing in for the browser. Components were mounted with `createRoot`, and every render and click was wrapped in React's `act()` so all updates and effects finish before the next line runs. Unless a section says otherwise, the code used the development build, which is what you run locally. The output blocks are exactly what was printed. The mounting and clicking lines are left out of the snippets to keep them short.

A few terms first. A **render** is React calling your component function to get its JSX. A **commit** is React applying the result to the DOM. **State** is a value React stores for a component between renders, read with `useState`. An **Effect** is code in `useEffect` that React runs after a commit, to sync with something outside React such as a network connection.

## 1. Why does count still show the old value right after setCount?

> **Short answer:** `setCount` does not change the variable. It asks React for a new render. Inside the current render, `count` keeps the value it had when the render started.

```jsx
let renders = 0;
function Counter() {
  const [count, setCount] = useState(0);
  renders++;
  return (
    <>
      <button id="plus3" onClick={() => { setCount(count + 1); setCount(count + 1); setCount(count + 1); }}>+3?</button>
      <button id="updater" onClick={() => { setCount(c => c + 1); setCount(c => c + 1); setCount(c => c + 1); }}>+3</button>
      <button id="log" onClick={() => { setCount(count + 1); console.log("right after setCount:", count); }}>log</button>
      <span id="out">{count}</span>
    </>
  );
}
```

I clicked each button once and printed the screen and a render counter after each click.

Output:

```text
mounted: count 0, renders so far 1
setCount(count + 1) three times: count 1, renders so far 2
setCount(c => c + 1) three times: count 4, renders so far 3
right after setCount: 4
after the log click: count 5, renders so far 4
```

Three things to notice:

- `setCount(count + 1)` three times adds **1**, not 3. In that click `count` is 0 every time, so each call says "set it to 1".
- `setCount(c => c + 1)` three times adds **3**. An **updater function** receives the latest queued value, so the calls chain: 1 + 1 = 2, 2 + 1 = 3, 3 + 1 = 4.
- Both clicks caused **one** render each. React queues the updates from one event and renders once at the end. This is called **batching**.

![Three setCount(count + 1) calls all queue "set to 1" and give one render with count 1. Three updater calls chain 0 to 1 to 2 to 3 and give one render with count 3.](/blog-images/react-interview-follow-up-questions/batching.svg)

**Follow-up you may get:** "so how do I read the new value right away?" Compute it into a variable first (`const next = count + 1; setCount(next); doSomething(next);`). Do not try to read it back from state in the same handler.

## 2. Are updates inside setTimeout or after await batched too?

> **Short answer:** yes, since React 18. Updates are batched wherever they happen. `flushSync` is the way to opt out.

Before React 18, only updates inside React event handlers were batched. The [React 18 release post](https://react.dev/blog/2022/03/29/react-v18) says: "Updates inside of promises, setTimeout, native event handlers, or any other event were not batched in React by default. With automatic batching, these updates will be batched automatically."

```jsx
import { flushSync } from "react-dom";

function App() {
  const [a, setA] = useState(0);
  const [b, setB] = useState(0);
  console.log(`  render a=${a} b=${b}`);
  return (
    <>
      <button id="handler" onClick={() => { setA(x => x + 1); setB(x => x + 1); }} />
      <button id="timeout" onClick={() => setTimeout(() => { setA(x => x + 1); setB(x => x + 1); }, 0)} />
      <button id="await" onClick={async () => { await Promise.resolve(); setA(x => x + 1); setB(x => x + 1); }} />
      <button id="flush" onClick={() => { flushSync(() => setA(x => x + 1)); setB(x => x + 1); }} />
    </>
  );
}
```

Output:

```text
  render a=0 b=0
click "handler":
  render a=1 b=1
click "timeout":
  render a=2 b=2
click "await":
  render a=3 b=3
click "flush":
  render a=4 b=3
  render a=4 b=4
```

Two state updates in an event handler, in a `setTimeout`, or after an `await` each produced **one** render. Only `flushSync` split them. Per the [docs](https://react.dev/reference/react-dom/flushSync), it "lets you force React to flush any updates inside the provided callback synchronously." You rarely need it. The usual case is when the DOM must be updated before the next line runs, for example to scroll to an item you just added.

## 3. Why does my useEffect run twice?

> **Short answer:** in development, inside `<StrictMode>`, React mounts each component, unmounts it, and mounts it again to check that your Effect cleans up after itself. Production runs it once.

```jsx
function Chat({ room }) {
  useEffect(() => {
    console.log(`  connect to ${room}`);
    return () => console.log(`  disconnect from ${room}`);
  }, [room]);
  return <p>{room}</p>;
}
```

I mounted `<StrictMode><Chat room="general" /></StrictMode>`, changed the room, then unmounted. Development build:

```text
mount <Chat room="general"> inside <StrictMode>:
  connect to general
  disconnect from general
  connect to general
change room to "random":
  disconnect from general
  connect to random
unmount:
  disconnect from random
```

The same code with the production build of React:

```text
mount <Chat room="general"> inside <StrictMode>:
  connect to general
change room to "random":
  disconnect from general
  connect to random
unmount:
  disconnect from random
```

![In development with StrictMode, mounting runs connect, disconnect, connect. In a production build it runs connect once.](/blog-images/react-interview-follow-up-questions/strict-mode.svg)

The [StrictMode reference](https://react.dev/reference/react/StrictMode) describes it: "React will also run one extra setup+cleanup cycle in development for every Effect", and "All of these checks are development-only and do not impact the production build."

The wrong fix is a `useRef` flag that skips the second run. The right answer in an interview: the double run exposes Effects without a cleanup. If connect, disconnect, connect leaves you with one open connection, the Effect is correct. If it leaves you with two, you have a leak that real users would also hit, for example when the `room` prop changes.

## 4. In what order do effects and cleanups run?

> **Short answer:** render runs parent first. Effects run child first. On an update, all of the old cleanups run before any new effect, and every layout effect runs before every regular effect.

```jsx
function Child({ v }) {
  console.log(`  render Child v=${v}`);
  useLayoutEffect(() => { console.log(`  Child layout effect v=${v}`); return () => console.log(`  Child layout cleanup v=${v}`); }, [v]);
  useEffect(() => { console.log(`  Child effect v=${v}`); return () => console.log(`  Child effect cleanup v=${v}`); }, [v]);
  return <span>{v}</span>;
}
function Parent({ v }) {
  console.log(`  render Parent v=${v}`);
  useLayoutEffect(() => { console.log(`  Parent layout effect v=${v}`); return () => console.log(`  Parent layout cleanup v=${v}`); }, [v]);
  useEffect(() => { console.log(`  Parent effect v=${v}`); return () => console.log(`  Parent effect cleanup v=${v}`); }, [v]);
  return <Child v={v} />;
}
```

Output (mount with `v=1`, then re-render with `v=2`, no StrictMode):

```text
mount v=1:
  render Parent v=1
  render Child v=1
  Child layout effect v=1
  Parent layout effect v=1
  Child effect v=1
  Parent effect v=1
update to v=2:
  render Parent v=2
  render Child v=2
  Child layout cleanup v=1
  Parent layout cleanup v=1
  Child layout effect v=2
  Parent layout effect v=2
  Child effect cleanup v=1
  Parent effect cleanup v=1
  Child effect v=2
  Parent effect v=2
```

![One update runs in this order: render Parent then Child, commit to the DOM, layout effects Child then Parent, paint, then effects Child then Parent. Each group of effects runs its cleanups with the old values first.](/blog-images/react-interview-follow-up-questions/effects-order.svg)

Effects run child first because a parent's Effect may depend on its children already being in place, for example measuring them. Cleanups see the **old** values (`v=1`), because each cleanup closes over the render that created it.

The difference between the two hooks is timing. `useLayoutEffect` runs right after React updates the DOM, before the browser paints. Use it to measure layout and fix it up without a visible flicker. `useEffect` runs after the paint, so it does not delay what the user sees. jsdom does not paint, so my run confirms the order of the hooks but not the paint itself. The paint timing comes from React's documentation.

## 5. What goes wrong with key={index}?

> **Short answer:** the key tells React which item is which between renders. With the index as the key, inserting at the top makes every item take over the state of the item that used to be at its position.

```jsx
function List({ useIndex }) {
  const [items, setItems] = useState([{ id: "b", name: "Bob" }, { id: "c", name: "Cara" }]);
  return (
    <>
      <button onClick={() => setItems([{ id: "a", name: "Ann" }, ...items])} />
      <ul>
        {items.map((item, i) => (
          <li key={useIndex ? i : item.id}>
            {item.name} <input defaultValue="" />
          </li>
        ))}
      </ul>
    </>
  );
}
```

I typed "note for Bob" into Bob's input, added Ann at the top, and read every row:

```text
key=index   -> Ann: "note for Bob", Bob: "", Cara: ""
key=item.id -> Ann: "", Bob: "note for Bob", Cara: ""
```

![Before, Bob has key 0 and a typed note. After Ann is added with index keys, Ann gets key 0 and inherits the note. With id keys, the note stays with Bob.](/blog-images/react-interview-follow-up-questions/keys.svg)

With index keys, Ann is now key 0. React sees "key 0 still exists, its text changed from Bob to Ann" and keeps the existing `<li>` and its `<input>`, including what was typed. The note jumps to the wrong person. The same thing happens to any state inside list items: a checkbox, an open dropdown, a `useState` in a child component.

The index is fine as a key only when the list never reorders, never has items inserted or removed in the middle, and its items hold no state. Otherwise use a stable ID from the data.

**Follow-up you may get:** "how do you reset a component's state on purpose?" Change its key: `<Profile key={userId} />` gives each user a fresh `Profile`.

## 6. Why does this interval counter get stuck at 1?

> **Short answer:** the Effect ran once, so its interval callback captured `count` from the first render, where it is 0. Every tick sets 0 + 1. Use the updater form, or list the value as a dependency.

```jsx
function Stale() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setCount(count + 1), 100);
    return () => clearInterval(id);
  }, []);
  return <span id="stale">{count}</span>;
}
function Fixed() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setCount(c => c + 1), 100);
    return () => clearInterval(id);
  }, []);
  return <span id="fixed">{count}</span>;
}
```

Output, after letting both run for about 550 ms:

```text
after ~550 ms: stale counter 1, fixed counter 5
```

This is called a **stale closure**: a function that keeps reading variables from the render that created it. Each render has its own `count`. The interval callback was created in the first render and never replaced, because the dependency array is empty.

There are two fixes. `setCount(c => c + 1)` does not read `count` at all, so the callback does not go stale. Alternatively, put `count` in the dependency array, which clears and re-creates the interval on every change. The first fix is simpler here. The `react-hooks/exhaustive-deps` lint rule warns about the stale version.

## 7. Does a child re-render when its parent re-renders?

> **Short answer:** yes, by default every child re-renders, whether or not its props changed. `memo` skips the re-render when every prop is equal by `Object.is`, which a new object or function created on each render never is.

```jsx
function Plain() { renders.Plain++; return null; }
const MemoPrimitive = memo(function MemoPrimitive({ color }) { renders.MemoPrimitive++; return null; });
const MemoInlineObject = memo(function MemoInlineObject({ style }) { renders.MemoInlineObject++; return null; });
const MemoStableObject = memo(function MemoStableObject({ style }) { renders.MemoStableObject++; return null; });

function Parent() {
  const [n, setN] = useState(0);
  const stable = useMemo(() => ({ color: "red" }), []);
  return (
    <>
      <button onClick={() => setN(n + 1)}>{n}</button>
      <Plain />
      <MemoPrimitive color="red" />
      <MemoInlineObject style={{ color: "red" }} />
      <MemoStableObject style={stable} />
    </>
  );
}
```

Output, after mounting and clicking three times:

```text
renders after mount + 3 parent updates:
  Plain: 4
  MemoPrimitive: 1
  MemoInlineObject: 4
  MemoStableObject: 1
```

`Plain` takes no props and still re-rendered with every parent update. `memo` with a string prop rendered once. `memo` with `style={{ color: "red" }}` re-rendered every time, because the object literal creates a new object on each render and `{} !== {}`. Memoizing the object with `useMemo` fixed it.

Two points make this a strong answer. A re-render is not a DOM update: React compares the result and only touches the DOM where something changed, so re-renders are often cheap. And the [React Compiler](/blog/react-compiler-what-it-memoizes) now adds this memoization automatically, which is covered in its own post.

## 8. useRef or useState? And why doesn't mutating state work?

> **Short answer:** changing a ref never causes a render. Setting state to the same object (same reference) is skipped. To update an object in state, create a new object.

```jsx
function App() {
  const clicksRef = useRef(0);
  const [user, setUser] = useState({ name: "Ann", visits: 0 });
  renders++;
  return (
    <>
      <button id="ref" onClick={() => { clicksRef.current++; }} />
      <button id="mutate" onClick={() => { user.visits++; setUser(user); }} />
      <button id="copy" onClick={() => setUser({ ...user, visits: user.visits + 1 })} />
      <span id="out">ref {clicksRef.current}, visits {user.visits}</span>
    </>
  );
}
```

Output:

```text
mounted                            screen: "ref 0, visits 0", renders 1
3 clicks that bump the ref         screen: "ref 0, visits 0", renders 1
mutate the object, set same object screen: "ref 0, visits 0", renders 1
set a new object                   screen: "ref 3, visits 2", renders 2
```

The last line is the interesting one. The ref was at 3 and `visits` had been mutated to 1 the whole time, but nothing showed it until an unrelated render happened. The new object then made `visits` 2, and both stale values appeared at once. That is why mutation bugs look random: the screen updates whenever something else re-renders.

Use a ref for values that do not affect what is on screen: timer IDs, DOM nodes, the previous value of a prop. Use state for anything the user should see.

## 9. What changed in React 19 that you should mention?

> **Short answer:** function components get `ref` as a normal prop, so new code does not need `forwardRef`. Actions, `useActionState`, `useOptimistic` and the `use` API are the other headline features.

React 19 was [released on December 5, 2024](https://react.dev/blog/2024/12/05/react-19). The release post says: "Starting in React 19, you can now access `ref` as a prop for function components" and "New function components will no longer need `forwardRef`." It also plans to "deprecate and remove `forwardRef`" in future versions.

```jsx
// React 19: ref is a normal prop for function components, no forwardRef needed
function TextInput({ ref, label }) {
  return <label>{label} <input ref={ref} /></label>;
}
function Form() {
  const inputRef = useRef(null);
  useEffect(() => { console.log(`inputRef.current is <${inputRef.current.tagName.toLowerCase()}>`); }, []);
  return <TextInput ref={inputRef} label="Name" />;
}
```

Output:

```text
React 19.2.8
inputRef.current is <input>
```

The run above used 19.2.8, from the 19.2 line [released on October 1, 2025](https://react.dev/blog/2025/10/01/react-19-2). If an interviewer asks what you have used from React 19, be specific: say which feature, and what it replaced in your code.

## How to answer these in the interview

Each question has the same structure, and the answers that land use it:

1. Say the one-line rule ("state is a snapshot per render").
2. Show the smallest example that breaks ("three `setCount(count + 1)` calls add 1").
3. Give the fix and why it works ("the updater gets the queued value").
4. Name the trade-off or the exception ("`flushSync` if the DOM must update before the next line").

Showing that you have actually seen the output, the doubled connect in development or the note jumping to Ann, is what separates someone who has used React from someone who has read about it.

## Cheat sheet

| Question | One-line answer | What the run showed |
|---|---|---|
| Old value after `setCount`? | state is a snapshot for the render | three `count + 1` calls gave 1, updaters gave 3 |
| Batching outside handlers? | automatic since React 18 | `setTimeout` and `await` both gave 1 render |
| Effect runs twice? | StrictMode, development only | connect, disconnect, connect in dev; once in prod |
| Effect order? | children first, all cleanups before new effects | layout effects before regular effects |
| `key={index}`? | state sticks to positions, not items | the note moved from Bob to Ann |
| Interval stuck at 1? | stale closure from the first render | 1 vs 5 after 550 ms |
| Child re-renders? | always, unless `memo` and equal props | inline object prop broke `memo` |
| Ref vs state? | ref changes never render; same object is skipped | mutated value appeared only on the next render |
| React 19? | `ref` is a prop, `forwardRef` on its way out | `inputRef.current` was the `<input>` |

For the language underneath all of this (closures, the event loop, microtasks), see the [JavaScript follow-up questions](/blog/javascript-senior-interview-follow-up-questions). For the typing side, see the [TypeScript follow-up questions](/blog/typescript-interview-follow-up-questions).
