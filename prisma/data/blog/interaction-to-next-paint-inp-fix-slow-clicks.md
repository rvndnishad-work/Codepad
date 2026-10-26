---
slug: interaction-to-next-paint-inp-fix-slow-clicks
title: "Why Your Click Feels Slow: Measuring and Fixing Interaction to Next Paint (INP)"
excerpt: What INP actually measures, how one number is picked from a whole visit, and how to fix each of its three phases, with runnable models of the main thread and the yield pattern.
tags: ["frontend", "performance", "core-web-vitals", "inp", "javascript"]
cover: /blog-images/interaction-to-next-paint-inp-fix-slow-clicks/cover.png
---

You click "Add to cart". Nothing happens. A third of a second later the button finally changes, and you have already clicked it again. Nothing was broken: the page was just busy. **Interaction to Next Paint (INP)** is the metric that puts a number on that feeling, and since March 2024 it is one of Google's three Core Web Vitals. The [launch post on web.dev](https://web.dev/blog/inp-cwv-launch) puts it plainly: "Interaction to Next Paint is now a stable Core Web Vital metric, replacing First Input Delay."

This post explains what INP measures, how a whole visit full of clicks becomes one number, and how to fix each part of a slow interaction. Every example below was run, and the output shown is what it printed.

## What INP measures

> **Short answer:** for each click, tap or key press, INP measures the time from the input until the browser shows the next frame. The page's INP is roughly its worst interaction.

An **interaction** is a click with a mouse, a tap on a touchscreen, or a press of a key. Hovering, scrolling and zooming do not count; the [INP article on web.dev](https://web.dev/articles/inp) says "these interactions are not observed for the purposes of INP."

The **main thread** is the single thread where the browser runs your JavaScript and also works out styles, layout and paint. It does one thing at a time. That is the root of every INP problem: if the thread is busy when the user clicks, the click waits.

The latency of one interaction splits into three phases:

![One interaction split into input delay, processing and presentation delay, from the click to the next paint](/blog-images/interaction-to-next-paint-inp-fix-slow-clicks/inp-phases.svg)

| Phase | Starts | Ends | Usually caused by |
| :--- | :--- | :--- | :--- |
| **Input delay** | The user interacts | Your first event handler starts | Some other task was already running on the main thread |
| **Processing duration** | First handler starts | Last handler finishes | Slow code inside your handlers |
| **Presentation delay** | Handlers finish | The next frame is on screen | Expensive style, layout and paint, often from a big DOM |

The word "paint" in the name matters. INP does not stop when your handler returns. It stops when the user can *see* that something happened. A handler that finishes in 5 ms but triggers 200 ms of layout still gives a slow interaction.

### The thresholds

From [web.dev](https://web.dev/articles/inp), measured at the **75th percentile** of real page loads (the value that 75% of visits beat), split by mobile and desktop:

| INP | Rating |
| :--- | :--- |
| 200 ms or less | Good |
| Over 200 ms, up to 500 ms | Needs improvement |
| Over 500 ms | Poor |

The `web-vitals` library uses the same two cut-offs (it ships `INPThresholds = [200, 500]` in version 6.2.3, which is the version checked for this post).

### Why it replaced First Input Delay

**First Input Delay (FID)**, the metric INP replaced, only measured the *input delay* of the *first* interaction. A page could score well on FID while every later click was slow, or while the first click had a fast start but a 400 ms handler. INP covers every interaction in the visit and all three phases. The launch post gave tools and API users until September 9, 2024 to move from FID to INP.

## How a whole visit becomes one number

> **Short answer:** take the slowest interaction, but skip one outlier for every 50 interactions.

A visit can have hundreds of interactions. Reporting the average would hide the bad ones; reporting the single worst would punish long sessions for one hiccup. web.dev describes the compromise as: "we ignore one highest interaction for every 50 interactions." Most visits have fewer than 50 interactions, so for most visits INP is simply the worst one.

The `web-vitals` library implements this by keeping a list of the slowest interactions, sorted from slowest to fastest, and picking index `min(list length - 1, floor(interaction count / 50))`. Here is the same rule, small enough to run:

```javascript-run
// Pick the INP value for one page visit, the way the web-vitals library does:
// sort interaction latencies from slowest to fastest, then skip one outlier
// for every 50 interactions on the page.
function pickINP(latencies) {
  const sorted = [...latencies].sort((a, b) => b - a);
  const index = Math.min(sorted.length - 1, Math.floor(latencies.length / 50));
  return sorted[index];
}

function rate(ms) {
  if (ms <= 200) return "good";
  if (ms <= 500) return "needs improvement";
  return "poor";
}

// A short visit: 6 clicks and key presses
const shortVisit = [48, 64, 312, 56, 40, 72];

// A long visit: 120 interactions, mostly fast, with three slow ones
const longVisit = Array.from({ length: 117 }, (_, i) => 24 + (i % 9) * 8);
longVisit.push(640, 420, 180);

for (const [name, visit] of [["short visit", shortVisit], ["long visit", longVisit]]) {
  const inp = pickINP(visit);
  console.log(`${name}: ${visit.length} interactions, INP = ${inp} ms (${rate(inp)})`);
}
```

Output:

```text
short visit: 6 interactions, INP = 312 ms (needs improvement)
long visit: 120 interactions, INP = 180 ms (good)
```

The long visit had a 640 ms and a 420 ms interaction, but with 120 interactions the rule skips two outliers, so the third slowest (180 ms) becomes the visit's INP. The short visit gets no such slack: one slow click out of six decides everything.

That has a practical consequence. You cannot fix INP by making the *typical* click faster. You have to find the *slowest* interactions on real devices and fix those.

## Measure it in the field first

Lab tools on a fast laptop rarely reproduce a slow click on a mid-range phone. Collect INP from real users with the attribution build of `web-vitals`, which also tells you *which* phase was slow and *which* element was clicked:

```javascript
import { onINP } from "web-vitals/attribution";

onINP(({ value, rating, attribution }) => {
  const body = JSON.stringify({
    inp: Math.round(value),
    rating,                                   // "good" | "needs-improvement" | "poor"
    target: attribution.interactionTarget,    // a CSS selector for the element
    type: attribution.interactionType,        // "pointer" or "keyboard"
    inputDelay: Math.round(attribution.inputDelay),
    processing: Math.round(attribution.processingDuration),
    presentation: Math.round(attribution.presentationDelay),
    loadState: attribution.loadState,         // was the page still loading?
  });
  navigator.sendBeacon("/analytics/inp", body);
});
```

This is browser code, so it was not run here; the field names were checked against the type definitions shipped in `web-vitals` 6.2.3. The attribution object also carries `longAnimationFrameEntries`, which lists the long frames that overlapped the interaction and, in browsers that support the Long Animation Frame API, the scripts that ran in them. That is often the fastest way to find the guilty code.

Group the reports by `target` and look at which phase is largest. The fix depends entirely on the phase.

## Fix 1: input delay, by breaking up long tasks

> **Short answer:** the click waited because another task was hogging the main thread. Split that task into smaller pieces so the browser can handle input between them.

A **task** is one unit of work the main thread runs from start to finish, such as running a script, a timer callback or an event handler. The browser cannot interrupt a task halfway. A **long task** is one that takes more than 50 ms. If the user clicks during a 300 ms task, the click waits for the rest of it.

The model below treats the main thread as a list of tasks and shows what happens to a click that arrives 20 ms into the work. It is a simplified model, not a browser, but the arithmetic is the same:

```javascript-run
// A tiny model of the main thread. Tasks run one at a time and are never
// interrupted. A click that arrives while a task is running has to wait.
function simulate(taskDurations, clickAt, handlerMs, renderMs) {
  let t = 0;
  for (const d of taskDurations) {
    if (t + d > clickAt) {
      // The click arrived during this task, so it waits for the task to end
      t += d;
      break;
    }
    t += d;
  }
  const inputDelay = Math.max(0, t - clickAt);
  const latency = inputDelay + handlerMs + renderMs;
  return { inputDelay, processing: handlerMs, presentation: renderMs, latency };
}

const clickAt = 20;   // the user clicks 20 ms after the work starts
const handlerMs = 30; // the click handler takes 30 ms
const renderMs = 16;  // style, layout and paint take 16 ms

const oneLongTask = [300];
const sixChunks = [50, 50, 50, 50, 50, 50];

for (const [name, tasks] of [["one 300 ms task", oneLongTask], ["six 50 ms chunks", sixChunks]]) {
  const r = simulate(tasks, clickAt, handlerMs, renderMs);
  console.log(
    `${name}: input delay ${r.inputDelay} + processing ${r.processing}` +
    ` + presentation ${r.presentation} = ${r.latency} ms`
  );
}
```

Output:

```text
one 300 ms task: input delay 280 + processing 30 + presentation 16 = 326 ms
six 50 ms chunks: input delay 30 + processing 30 + presentation 16 = 76 ms
```

The total amount of work is the same 300 ms. Only its *shape* changed, and the click went from "needs improvement" to "good".

![The same 300 ms of work as one task, where the click waits 280 ms, and as six 50 ms chunks, where it waits 30 ms](/blog-images/interaction-to-next-paint-inp-fix-slow-clicks/long-task-vs-chunks.svg)

Where long tasks come from in practice:

- Hydrating a large framework app while the user is already tapping.
- Third-party scripts (tag managers, chat widgets, A/B testing) doing work on a timer.
- Parsing or transforming a big JSON response in one go.
- Rendering a long list in one pass.

## Fix 2: yield to the main thread

> **Short answer:** `await` a yield between chunks. `scheduler.yield()` does this and puts your continuation ahead of other queued tasks; `setTimeout` is the fallback.

**Yielding** means ending the current task on purpose and scheduling the rest of the work as a new task, so the browser gets a gap to handle input and paint. [Chrome shipped `scheduler.yield()` in Chrome 129](https://developer.chrome.com/blog/use-scheduler-yield), and the Chrome team describes its advantage over `setTimeout` like this: "It prioritizes the continuation of a task over starting new tasks." With `setTimeout(fn, 0)`, the rest of your work goes to the back of the queue behind everything else, so a long job can take much longer to finish.

Browser support outside Chromium is still uneven (the Chrome article itself is not consistent on Firefox), so check current compatibility data before relying on it and always keep a fallback. The article suggests either feature detection with a `setTimeout` fallback or the `scheduler-polyfill` package.

The demo below runs in Node, which has no `scheduler`, so it uses the `setTimeout` fallback. A `setTimeout` stands in for the click that arrives while the work is going on:

```javascript
// Run with: node yield-demo.js
// Use scheduler.yield() where the browser has it, and fall back to a
// setTimeout. Node has no scheduler, so this demo uses the fallback.
function yieldToMain() {
  if (globalThis.scheduler?.yield) return globalThis.scheduler.yield();
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function busyWork(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {} // stands in for real work, such as filtering a big list
}

async function processItems(label, chunks, shouldYield) {
  const log = [];
  // A setTimeout stands in for a click that arrives while the work is going on
  setTimeout(() => log.push("click handled"), 0);
  for (let i = 1; i <= chunks; i++) {
    busyWork(20);
    log.push(`chunk ${i}`);
    if (shouldYield) await yieldToMain();
  }
  await new Promise((resolve) => setTimeout(resolve, 5)); // let the click finish if it has not yet
  console.log(`${label}: ${log.join(", ")}`);
}

async function main() {
  await processItems("without yielding", 4, false);
  await processItems("with yielding", 4, true);
}

main();
```

Output:

```text
without yielding: chunk 1, chunk 2, chunk 3, chunk 4, click handled
with yielding: chunk 1, click handled, chunk 2, chunk 3, chunk 4
```

Without yielding, the click waits for all four chunks. With one `await yieldToMain()` per chunk, it runs right after the first. In a browser the same gap also lets the browser paint.

Two rules make yielding work in real code:

1. **Yield on a time budget, not after every item.** Yielding after each of 10,000 rows adds overhead. Check the clock and yield when about 50 ms have passed since the last yield.
2. **Make the work safe to pause.** Between chunks the user can click again or the data can change. If a newer request makes the old work pointless, cancel it (for example with an `AbortController`) rather than finishing stale work.

## Fix 3: processing duration, by doing less before the paint

> **Short answer:** in the handler, do only what is needed to show feedback. Move everything else to after the next frame.

A typical slow handler updates the UI *and* sends analytics *and* saves to `localStorage` *and* recalculates something big. The user only needs to see the UI change. Give them that first, then yield and do the rest:

```javascript
button.addEventListener("click", async () => {
  // 1. The visible part: cheap, and done before anything else
  button.classList.add("is-added");
  cartCount.textContent = String(cart.length + 1);

  // 2. Let the browser paint that change before the expensive work
  await yieldToMain();

  // 3. Everything the user does not need to see right now
  cart.push(item);
  saveCart(cart);
  sendAnalytics("add_to_cart", item.id);
});
```

This is browser code and was not run here; it uses the `yieldToMain` helper from the previous section. Other things that shrink processing time:

- **Debounce work on fast inputs.** A search box that filters 5,000 items on every key press will be slow on every key press. Update the input immediately and filter after a short pause.
- **Avoid layout thrashing.** Reading a layout value such as `offsetHeight` right after changing styles forces the browser to compute layout immediately, in the middle of your handler. Do all reads first, then all writes.
- **Watch framework re-renders.** In React, one state change near the root can re-render a large tree. Keep state close to where it is used, memoise expensive children, and mark non-urgent updates as transitions with `startTransition` so React can keep the urgent update responsive.

## Fix 4: presentation delay, by making the next frame cheap

> **Short answer:** the browser needs time to recompute styles and layout and paint after your handler. Fewer elements and smaller changes make that faster.

Presentation delay is the phase people forget, because none of their own code is running. But a change that affects a page with 15,000 DOM nodes forces the browser to do a lot of style and layout work before it can show the frame. Ways to reduce it:

- **Keep the DOM small.** Virtualise long lists so only the visible rows exist.
- **Skip work for off-screen content.** The CSS property `content-visibility: auto` lets the browser skip rendering for sections that are not on screen.
- **Change less.** Toggling a class on one element is cheaper than re-rendering a whole panel.
- **Avoid heavy work in `requestAnimationFrame` callbacks** and `ResizeObserver` callbacks after an interaction. The `web-vitals` documentation counts those as part of presentation delay.

## Questions interviewers ask about INP

**Why is INP not the average of all interactions?**
Because an average hides the slow clicks people remember. INP reports close to the worst interaction, skipping one outlier per 50 interactions so long sessions are not judged on a single hiccup.

**Your INP is bad but Lighthouse looks fine. Why?**
Lighthouse runs a page load in a lab without a person clicking, so it cannot measure real interactions. INP is a field metric. Use real-user data (`web-vitals`, the Chrome UX Report) to find the slow interactions, then reproduce them in DevTools with CPU throttling.

**Does moving work to `async` functions fix long tasks?**
Not by itself. An `async` function runs on the main thread like any other code, and awaiting a promise that is already resolved only goes through the microtask queue, which is emptied before the next task can start. Swap `yieldToMain()` for `await Promise.resolve()` in the demo above and the click again waits for all the chunks. Only a real yield back to the event loop, or moving the work to a Web Worker, gives the browser a gap.

**When would you use a Web Worker instead of yielding?**
When the work is pure computation that does not touch the DOM, such as parsing, sorting or diffing large data. A worker runs on another thread, so it never blocks input at all. Yielding is the right tool when the work has to touch the DOM or the framework state.

**What is the difference between `scheduler.yield()` and `setTimeout(0)`?**
Both end the current task. `scheduler.yield()` schedules the continuation ahead of other queued tasks, so your job finishes sooner; `setTimeout` puts it at the back of the queue.

## Cheat sheet

| Symptom in attribution data | Phase | First thing to try |
| :--- | :--- | :--- |
| `inputDelay` is the largest part | Input delay | Find the long task running at the time (Long Animation Frames, DevTools) and split it, or defer third-party scripts |
| `inputDelay` is large and `loadState` is still loading | Input delay | Reduce or split hydration and start-up work |
| `processingDuration` is the largest part | Processing | Show feedback first, then `await yieldToMain()` before the rest |
| `presentationDelay` is the largest part | Presentation | Shrink the DOM, virtualise lists, use `content-visibility: auto` |
| Only one element is slow | Any | Group by `interactionTarget` and profile that one interaction |

INP is not about making JavaScript faster in general. It is about making sure the main thread is free when the user needs it, that your handler does the visible part first, and that the next frame is cheap to draw. Measure the slowest interactions in the field, look at which phase dominates, and fix that phase.
